// Dados das telas do usuário final (início, perfil e filme), já em linguagem
// de usuário: nada de "vértice", "aresta" ou "Cypher" aqui. Os detalhes técnicos
// ficam em dashboardService (página "Como funciona").

import { movieExtra } from "../db/graphQueries";
import {
  findNeighbors,
  fixtureUserNames,
  recommend,
  relatedMovies,
  topMoviesByDegree,
  type Graph,
  type MovieId,
  type UserId,
} from "../graph";
import { loadGraph, type GraphSource } from "./graphService";
import { avatarHue, genrePt, initials, joinPt } from "./labels";

const IMG = "https://image.tmdb.org/t/p";
const LOVED = 4; // nota a partir da qual consideramos que a pessoa "amou" o filme

export interface MovieCard {
  movieId: MovieId;
  title: string;
  year: number | null;
  genres: string[];
  posterUrl: string | null;
}

export interface ProfileSummary {
  id: UserId;
  name: string;
  initials: string;
  hue: number;
  /** Ex.: "Drama e Suspense" */
  taste: string;
  ratedCount: number;
  posters: string[];
}

export interface RecommendationCard extends MovieCard {
  /** 0–100, a partir da nota prevista (0,5–5). */
  match: number;
  predicted: number;
  /** Quantas pessoas com gosto parecido sustentam a recomendação. */
  people: number;
  /** Filmes que você e essas pessoas amaram (a "ponte" da recomendação). */
  because: string[];
}

export interface SimilarProfile extends ProfileSummary {
  inCommon: number;
}

interface SourceInfo {
  source: GraphSource;
  dbError?: string;
  hasTmdb: boolean;
}

// ---------------------------------------------------------------------------

function profileName(source: GraphSource, id: UserId): string {
  return source === "fixture" ? (fixtureUserNames[id] ?? `Perfil ${id}`) : `Perfil ${id}`;
}

function movieCard(graph: Graph, id: MovieId, size = "w342"): MovieCard {
  const info = graph.movie(id);
  return {
    movieId: id,
    title: graph.title(id),
    year: info?.year ?? null,
    genres: (info?.genres ?? []).slice(0, 2).map(genrePt),
    posterUrl: info?.posterPath ? `${IMG}/${size}${info.posterPath}` : null,
  };
}

/** Filmes que o usuário mais gostou (maior nota, desempate pela popularidade). */
function favoritesOf(graph: Graph, userId: UserId): MovieId[] {
  return [...graph.moviesOf(userId).entries()]
    .sort((a, b) => b[1] - a[1] || graph.usersOf(b[0]).size - graph.usersOf(a[0]).size)
    .map(([id]) => id);
}

/** Gêneros mais frequentes entre os filmes que a pessoa amou. */
function tasteOf(graph: Graph, userId: UserId): { label: string; top: string | null } {
  const count = new Map<string, number>();
  for (const [movieId, rating] of graph.moviesOf(userId)) {
    if (rating < LOVED) continue;
    for (const g of graph.movie(movieId)?.genres ?? []) {
      if (g === "IMAX") continue;
      count.set(g, (count.get(g) ?? 0) + 1);
    }
  }
  const top = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g]) => g);
  return { label: top.length ? joinPt(top.map(genrePt)) : "Gosto variado", top: top[0] ?? null };
}

function profileSummary(graph: Graph, source: GraphSource, id: UserId): ProfileSummary {
  const name = profileName(source, id);
  return {
    id,
    name,
    initials: initials(name),
    hue: avatarHue(id),
    taste: tasteOf(graph, id).label,
    ratedCount: graph.moviesOf(id).size,
    posters: favoritesOf(graph, id)
      .map((m) => graph.movie(m)?.posterPath)
      .filter((p): p is string => Boolean(p))
      .slice(0, 3)
      .map((p) => `${IMG}/w154${p}`),
  };
}

function sourceInfo(graph: Graph, source: GraphSource, dbError?: string): SourceInfo {
  const first = topMoviesByDegree(graph, 1)[0];
  return { source, dbError, hasTmdb: Boolean(first && graph.movie(first.movieId)?.posterPath) };
}

// ---------------------------------------------------------------------------

export async function getHome() {
  const { graph, source, error } = await loadGraph();

  // Perfis em destaque: um por gênero favorito, para mostrar gostos variados
  const featured: ProfileSummary[] = [];
  const seenGenres = new Set<string>();
  const candidates = [...graph.userIds()]
    .filter((id) => {
      const n = graph.moviesOf(id).size;
      return source === "fixture" || (n >= 40 && n <= 400);
    })
    .sort((a, b) => a - b);
  for (const id of candidates) {
    const { top } = tasteOf(graph, id);
    if (source !== "fixture" && (!top || seenGenres.has(top))) continue;
    if (top) seenGenres.add(top);
    featured.push(profileSummary(graph, source, id));
    if (featured.length === 8) break;
  }

  const userIds = [...graph.userIds()];
  return {
    ...sourceInfo(graph, source, error),
    featured,
    profileRange: { min: Math.min(...userIds), max: Math.max(...userIds) },
    popular: topMoviesByDegree(graph, 12).map((m) => movieCard(graph, m.movieId)),
  };
}

export async function getProfile(userId: UserId) {
  const { graph, source, error } = await loadGraph();
  if (!graph.hasUser(userId)) return null;

  const result = recommend(graph, { userId, k: 12 });
  const recommendations: RecommendationCard[] = result.recommendations.map((r) => {
    // A "ponte": filmes que você amou e que as pessoas parecidas também viram.
    // Preferimos pontes do mesmo gênero do filme indicado e menos populares,
    // para a explicação ser específica (e não sempre os mesmos blockbusters).
    const recGenres = new Set(graph.movie(r.movieId)?.genres ?? []);
    const bridge = new Map<MovieId, number>();
    for (const s of r.supporters) for (const m of s.via) bridge.set(m, (bridge.get(m) ?? 0) + 1);
    const relevance = (m: MovieId, count: number) => {
      const shared = (graph.movie(m)?.genres ?? []).filter((g) => recGenres.has(g)).length;
      return (count * (1 + shared)) / Math.log2(2 + graph.usersOf(m).size);
    };
    const because = [...bridge.entries()]
      .filter(([m]) => (graph.rating(userId, m) ?? 0) >= LOVED)
      .sort((a, b) => relevance(b[0], b[1]) - relevance(a[0], a[1]))
      .slice(0, 2)
      .map(([m]) => graph.title(m));
    return {
      ...movieCard(graph, r.movieId),
      predicted: r.score,
      match: Math.round((r.score / 5) * 100),
      people: r.supporters.length,
      because,
    };
  });

  const similar: SimilarProfile[] = findNeighbors(graph, userId, { neighbors: 4 }).neighbors.map((n) => ({
    ...profileSummary(graph, source, n.userId),
    inCommon: n.via.length,
  }));

  return {
    ...sourceInfo(graph, source, error),
    profile: profileSummary(graph, source, userId),
    personalized: result.strategy === "neighborhood",
    recommendations,
    favorites: favoritesOf(graph, userId)
      .slice(0, 12)
      .map((m) => ({ ...movieCard(graph, m), rating: graph.rating(userId, m)! })),
    similar,
  };
}

export interface WhyRecommended {
  predicted: number;
  match: number;
  people: { profile: ProfileSummary; rating: number; bothLoved: string[] }[];
}

export async function getMovie(movieId: MovieId, profileId?: UserId) {
  const { graph, source, error } = await loadGraph();
  const info = graph.movie(movieId);
  if (!info || !graph.hasMovie(movieId)) return null;

  const extra = source === "neo4j" ? await movieExtra(movieId).catch(() => null) : null;
  const ratings = [...graph.usersOf(movieId).values()];
  const avg = ratings.reduce((a, b) => a + b, 0) / (ratings.length || 1);

  // Se veio de um perfil: a nota da pessoa ou o porquê da recomendação
  let viewer: { profile: ProfileSummary; rating: number | null; why: WhyRecommended | null } | null = null;
  if (profileId !== undefined && graph.hasUser(profileId)) {
    const own = graph.rating(profileId, movieId) ?? null;
    let why: WhyRecommended | null = null;
    if (own === null) {
      const rec = recommend(graph, { userId: profileId, k: 500 }).recommendations.find((r) => r.movieId === movieId);
      if (rec) {
        why = {
          predicted: rec.score,
          match: Math.round((rec.score / 5) * 100),
          people: rec.supporters.slice(0, 3).map((s) => ({
            profile: profileSummary(graph, source, s.userId),
            rating: s.rating,
            bothLoved: s.via
              .filter((m) => (graph.rating(profileId, m) ?? 0) >= LOVED && (graph.rating(s.userId, m) ?? 0) >= LOVED)
              .slice(0, 3)
              .map((m) => graph.title(m)),
          })),
        };
      }
    }
    viewer = { profile: profileSummary(graph, source, profileId), rating: own, why };
  }

  return {
    ...sourceInfo(graph, source, error),
    movie: {
      ...movieCard(graph, movieId, "w500"),
      originalTitle: info.titlePt && info.titlePt !== info.title ? info.title : null,
      allGenres: info.genres.filter((g) => g !== "IMAX").map(genrePt),
      overview: extra?.overview ?? info.overview ?? null,
      // w780 basta: o fundo fica a 40% de opacidade atrás de um degradê.
      backdropUrl: extra?.backdropPath ? `${IMG}/w780${extra.backdropPath}` : null,
      runtime: extra?.runtime ?? null,
      tmdbScore: info.voteAverage ?? null,
      audienceScore: avg,
      audienceCount: ratings.length,
    },
    viewer,
    related: relatedMovies(graph, movieId, 8).map((r) => movieCard(graph, r.movieId)),
  };
}
