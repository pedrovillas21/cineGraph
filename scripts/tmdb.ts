// Enriquecimento dos filmes com metadados do TMDB (pôster, sinopse e título em pt-BR).
//
// - Usa só o endpoint de DETALHES do filme (/movie/{id}). Os endpoints
//   /recommendations e /similar do TMDB NÃO são usados: seriam recomendação
//   pronta ("caixa-preta"), o que o TAP proíbe. O grafo continua só MovieLens.
// - As respostas ficam em cache em data/raw/tmdb-cache.json (fora do git), para
//   que rodar o ETL de novo não refaça milhares de chamadas.
// - O token (TMDB_API_TOKEN) só existe no terminal/servidor, nunca no navegador.
//
// This product uses the TMDB API but is not endorsed or certified by TMDB.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const API = "https://api.themoviedb.org/3";
const CACHE_PATH = path.join(process.cwd(), "data", "raw", "tmdb-cache.json");
const CONCURRENCY = 8;

export interface TmdbMovie {
  tmdbId: number;
  titlePt: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number | null;
  runtime: number | null;
}

/** null = o TMDB respondeu 404 (filme removido); fica em cache para não repetir. */
type Cache = Record<string, TmdbMovie | null>;

export function hasTmdbToken(): boolean {
  return Boolean(process.env.TMDB_API_TOKEN);
}

function loadCache(): Cache {
  try {
    return existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, "utf8")) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Cache): void {
  mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface TmdbDetails {
  title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  runtime?: number | null;
}

async function request(tmdbId: number, language: string, attempt = 1): Promise<TmdbDetails | null> {
  const res = await fetch(`${API}/movie/${tmdbId}?language=${language}`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_API_TOKEN}`, accept: "application/json" },
  });
  if (res.status === 404) return null;
  if ((res.status === 429 || res.status >= 500) && attempt <= 5) {
    const retryAfter = Number(res.headers.get("retry-after")) || attempt;
    await sleep(retryAfter * 1000);
    return request(tmdbId, language, attempt + 1);
  }
  if (res.status === 401) throw new Error("TMDB recusou o token (401). Confira TMDB_API_TOKEN no .env.local.");
  if (!res.ok) throw new Error(`TMDB respondeu HTTP ${res.status} para o filme ${tmdbId}`);
  return (await res.json()) as TmdbDetails;
}

async function fetchMovie(tmdbId: number): Promise<TmdbMovie | null> {
  const pt = await request(tmdbId, "pt-BR");
  if (!pt) return null;
  // Sinopse vazia em português → usa a versão em inglês
  const overview = pt.overview?.trim() || (await request(tmdbId, "en-US"))?.overview?.trim() || null;
  return {
    tmdbId,
    titlePt: pt.title?.trim() || null,
    overview,
    posterPath: pt.poster_path ?? null,
    backdropPath: pt.backdrop_path ?? null,
    voteAverage: typeof pt.vote_average === "number" ? pt.vote_average : null,
    runtime: pt.runtime ?? null,
  };
}

/** Busca os detalhes de vários filmes (com cache e paralelismo limitado). */
export async function fetchTmdbMovies(
  tmdbIds: number[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<number, TmdbMovie>> {
  const cache = loadCache();
  const missing = [...new Set(tmdbIds)].filter((id) => !(id in cache));
  let done = tmdbIds.length - missing.length;
  onProgress?.(done, tmdbIds.length);

  let next = 0;
  let sinceSave = 0;
  const worker = async () => {
    while (next < missing.length) {
      const id = missing[next++];
      cache[id] = await fetchMovie(id);
      onProgress?.(++done, tmdbIds.length);
      if (++sinceSave >= 200) {
        saveCache(cache);
        sinceSave = 0;
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } finally {
    saveCache(cache); // guarda o progresso mesmo se der erro no meio
  }

  const result = new Map<number, TmdbMovie>();
  for (const id of tmdbIds) {
    const movie = cache[id];
    if (movie) result.set(id, movie);
  }
  return result;
}
