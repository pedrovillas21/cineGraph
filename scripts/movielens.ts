// Leitura e filtragem do MovieLens (ml-latest-small), compartilhada pelo ETL e
// pelo hello-graph. O dataset é baixado do site oficial do GroupLens em
// data/raw/ (fora do git): a licença do MovieLens não permite redistribuí-lo.

import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Graph } from "../src/server/graph";

const DATASET_URL = "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip";
const RAW_DIR = path.join(process.cwd(), "data", "raw");
const ZIP_PATH = path.join(RAW_DIR, "ml-latest-small.zip");

export interface FilterOptions {
  minMovieRatings: number;
  minUserRatings: number;
  maxUsers: number | null;
}

export const defaultFilters: FilterOptions = { minMovieRatings: 5, minUserRatings: 20, maxUsers: null };

export interface MovieRow {
  id: number;
  title: string;
  year: number | null;
  genres: string;
  /** Ligação com o TMDB e o IMDb (links.csv do MovieLens). */
  tmdbId: number | null;
  imdbId: string | null;
}

export interface RatingRow {
  user_id: number;
  movie_id: number;
  rating: number;
  rated_at: Date;
}

export interface MovieLensData {
  raw: { users: number; movies: number; edges: number };
  users: { id: number }[];
  movies: MovieRow[];
  ratings: RatingRow[];
}

export async function ensureDataset(): Promise<AdmZip> {
  if (!existsSync(ZIP_PATH)) {
    console.log(`Baixando ${DATASET_URL} ...`);
    const res = await fetch(DATASET_URL);
    if (!res.ok) throw new Error(`Falha no download: HTTP ${res.status}`);
    mkdirSync(RAW_DIR, { recursive: true });
    writeFileSync(ZIP_PATH, Buffer.from(await res.arrayBuffer()));
  } else {
    console.log(`Usando dataset em cache: ${path.relative(process.cwd(), ZIP_PATH)}`);
  }
  return new AdmZip(readFileSync(ZIP_PATH));
}

function readCsv(zip: AdmZip, name: string): Record<string, string>[] {
  const entry = zip.getEntries().find((e) => e.entryName.endsWith(`/${name}`));
  if (!entry) throw new Error(`${name} não encontrado no zip`);
  return parse(entry.getData().toString("utf8"), { columns: true, skip_empty_lines: true });
}

/** "Matrix, The (1999)" → { title: "Matrix, The", year: 1999 } */
function splitTitle(raw: string): { title: string; year: number | null } {
  const match = raw.trim().match(/^(.*)\s+\((\d{4})\)$/);
  return match ? { title: match[1], year: Number(match[2]) } : { title: raw.trim(), year: null };
}

function countBy<T>(items: T[], key: (item: T) => number): Map<number, number> {
  const counts = new Map<number, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}

export function transform(zip: AdmZip, opts: FilterOptions = defaultFilters): MovieLensData {
  const links = new Map(readCsv(zip, "links.csv").map((r) => [Number(r.movieId), r]));
  const allMovies: MovieRow[] = readCsv(zip, "movies.csv").map((r) => {
    const { title, year } = splitTitle(r.title);
    const genres = r.genres === "(no genres listed)" ? "" : r.genres;
    const link = links.get(Number(r.movieId));
    return {
      id: Number(r.movieId),
      title,
      year,
      genres,
      tmdbId: link?.tmdbId ? Number(link.tmdbId) : null,
      imdbId: link?.imdbId ? `tt${link.imdbId}` : null,
    };
  });
  const allRatings: RatingRow[] = readCsv(zip, "ratings.csv").map((r) => ({
    user_id: Number(r.userId),
    movie_id: Number(r.movieId),
    rating: Number(r.rating),
    rated_at: new Date(Number(r.timestamp) * 1000),
  }));

  // 1) filmes com poucas avaliações geram recomendações pouco confiáveis
  const perMovie = countBy(allRatings, (r) => r.movie_id);
  let ratings = allRatings.filter((r) => perMovie.get(r.movie_id)! >= opts.minMovieRatings);

  // 2) usuários com poucas avaliações têm vizinhança pobre (cold start)
  const perUser = countBy(ratings, (r) => r.user_id);
  let userIds = [...perUser.keys()].filter((u) => perUser.get(u)! >= opts.minUserRatings);
  userIds.sort((a, b) => a - b);

  // 3) subgrafo opcional com os N primeiros usuários (testes de carga)
  if (opts.maxUsers) userIds = userIds.slice(0, opts.maxUsers);
  const keepUsers = new Set(userIds);
  ratings = ratings.filter((r) => keepUsers.has(r.user_id));

  const keepMovies = new Set(ratings.map((r) => r.movie_id));
  const movies = allMovies.filter((m) => keepMovies.has(m.id));

  return {
    raw: { users: new Set(allRatings.map((r) => r.user_id)).size, movies: allMovies.length, edges: allRatings.length },
    users: userIds.map((id) => ({ id })),
    movies,
    ratings,
  };
}

/** Monta o grafo em memória direto dos CSVs (sem banco). */
export function toGraph(data: MovieLensData): Graph {
  const g = new Graph();
  for (const m of data.movies) {
    g.addMovie({ id: m.id, title: m.title, year: m.year, genres: m.genres ? m.genres.split("|") : [] });
  }
  for (const r of data.ratings) g.addRating(r.user_id, r.movie_id, r.rating);
  return g;
}
