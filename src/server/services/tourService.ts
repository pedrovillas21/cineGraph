import { buildFixtureGraph, fixtureMovies, fixtureRatings, fixtureUserNames } from "@/server/graph/fixture";
import { findNeighbors, recommend } from "@/server/graph/recommend";
import type { MovieId, UserId } from "@/server/graph/types";

// Dados do tour interativo da página "Como funciona": os 3 saltos rodados pelo
// algoritmo de verdade (recommend.ts) sobre o grafo de exemplo, para cada pessoa.
// Mesmos parâmetros do exemplo resolvido do doc 02 (minCommon = 1, minSupport = 1, λ = 0).

export interface TourNeighbor {
  userId: UserId;
  similarity: number;
  /** Σ w(u,m)·w(v,m) nos filmes em comum: o numerador da similaridade. */
  dot: number;
  via: MovieId[];
}

export interface TourRecommendation {
  movieId: MovieId;
  score: number;
  supporters: { userId: UserId; similarity: number; rating: number; via: MovieId[] }[];
}

export interface TourRun {
  norm: number;
  neighbors: TourNeighbor[];
  /** Pessoas sem nenhum filme em comum: o salto 2 não chega nelas. */
  unreachable: UserId[];
  recommendations: TourRecommendation[];
}

export interface TourData {
  users: { id: UserId; name: string }[];
  movies: { id: MovieId; title: string }[];
  ratings: { userId: UserId; movieId: MovieId; rating: number }[];
  runs: Record<UserId, TourRun>;
}

const PARAMS = { minCommon: 1, minSupport: 1, shrinkage: 0, neighbors: 30, k: 10 };

export function getTour(): TourData {
  const graph = buildFixtureGraph();
  const users = Object.entries(fixtureUserNames).map(([id, name]) => ({ id: Number(id), name }));

  const norm = (userId: UserId) => {
    let sum = 0;
    for (const w of graph.moviesOf(userId).values()) sum += w * w;
    return Math.sqrt(sum);
  };

  const runs: Record<UserId, TourRun> = {};
  for (const { id } of users) {
    const nu = norm(id);
    const { neighbors } = findNeighbors(graph, id, PARAMS);
    const reached = new Set(neighbors.map((n) => n.userId));
    const result = recommend(graph, { userId: id, ...PARAMS });
    runs[id] = {
      norm: nu,
      neighbors: neighbors.map((n) => ({
        userId: n.userId,
        similarity: n.similarity,
        dot: Math.round(n.similarity * nu * norm(n.userId)),
        via: n.via,
      })),
      unreachable: users.filter((u) => u.id !== id && !reached.has(u.id)).map((u) => u.id),
      recommendations: result.recommendations.map((r) => ({
        movieId: r.movieId,
        score: r.score,
        supporters: r.supporters.map((s) => ({
          userId: s.userId,
          similarity: s.similarity,
          rating: s.rating,
          via: s.via,
        })),
      })),
    };
  }

  return {
    users,
    movies: fixtureMovies.map((m) => ({ id: m.id, title: m.title })),
    ratings: fixtureRatings.map((r) => ({ ...r })),
    runs,
  };
}
