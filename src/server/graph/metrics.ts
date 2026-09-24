import { Graph } from "./Graph";
import type { GraphStats, MovieId, UserId } from "./types";

export function userDegree(graph: Graph, userId: UserId): number {
  return graph.moviesOf(userId).size;
}

/** Grau de um filme = quantas avaliações recebeu = popularidade. */
export function movieDegree(graph: Graph, movieId: MovieId): number {
  return graph.usersOf(movieId).size;
}

export interface MovieDegree {
  movieId: MovieId;
  title: string;
  degree: number;
  avgRating: number;
}

/** Filmes mais populares (maior grau). */
export function topMoviesByDegree(graph: Graph, n = 10): MovieDegree[] {
  const all: MovieDegree[] = [];
  for (const movieId of graph.movieIds()) {
    const users = graph.usersOf(movieId);
    if (users.size === 0) continue;
    let sum = 0;
    for (const r of users.values()) sum += r;
    all.push({
      movieId,
      title: graph.title(movieId),
      degree: users.size,
      avgRating: sum / users.size,
    });
  }
  all.sort((a, b) => b.degree - a.degree || b.avgRating - a.avgRating);
  return all.slice(0, n);
}

export function graphStats(graph: Graph): GraphStats {
  return {
    users: graph.userCount,
    movies: graph.movieCount,
    edges: graph.edgeCount,
    avgUserDegree: graph.userCount ? graph.edgeCount / graph.userCount : 0,
    avgMovieDegree: graph.movieCount ? graph.edgeCount / graph.movieCount : 0,
  };
}
