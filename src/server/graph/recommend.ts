// Algoritmo de recomendação por vizinhança no grafo bipartido (docs/02-algoritmo.md).
// Tudo explícito: três saltos a partir do usuário, similaridade cosseno e média
// ponderada. Nenhuma biblioteca de machine learning.

import { Graph } from "./Graph";
import { topMoviesByDegree } from "./metrics";
import type {
  MovieId,
  Recommendation,
  RecommendationRequest,
  RecommendationResult,
  Supporter,
  UserId,
} from "./types";

const VIA_LIMIT = 10;
/** λ da suavização do score (0 = média ponderada pura, como no exemplo do doc 02). */
export const DEFAULT_SHRINKAGE = 2;

// ‖w_u‖ de cada usuário, calculada uma vez por grafo (O(|E|)).
const normCache = new WeakMap<Graph, Map<UserId, number>>();

function norm(graph: Graph, userId: UserId): number {
  let norms = normCache.get(graph);
  if (!norms) {
    norms = new Map();
    normCache.set(graph, norms);
  }
  let n = norms.get(userId);
  if (n === undefined) {
    let sum = 0;
    for (const w of graph.moviesOf(userId).values()) sum += w * w;
    n = Math.sqrt(sum);
    norms.set(userId, n);
  }
  return n;
}

export interface Neighbor {
  userId: UserId;
  similarity: number;
  /** Filmes avaliados pelos dois usuários. */
  via: MovieId[];
}

/**
 * Saltos 1 e 2: u → filmes de u → outros usuários, acumulando o produto escalar,
 * e depois similaridade cosseno + top-K. Também usado pela interface ("pessoas
 * com gosto parecido").
 */
export function findNeighbors(
  graph: Graph,
  userId: UserId,
  { neighbors = 30, minCommon = 3 }: { neighbors?: number; minCommon?: number } = {},
): { neighbors: Neighbor[]; reached: number } {
  const dot = new Map<UserId, number>();
  const via = new Map<UserId, MovieId[]>();
  for (const [movieId, wu] of graph.moviesOf(userId)) {
    for (const [other, wv] of graph.usersOf(movieId)) {
      if (other === userId) continue;
      dot.set(other, (dot.get(other) ?? 0) + wu * wv);
      const common = via.get(other);
      if (common) common.push(movieId);
      else via.set(other, [movieId]);
    }
  }

  const nu = norm(graph, userId);
  const top = [...dot.entries()]
    .filter(([v]) => via.get(v)!.length >= minCommon)
    .map(([v, d]) => ({ userId: v, similarity: d / (nu * norm(graph, v)), via: via.get(v)! }))
    .sort((a, b) => b.similarity - a.similarity || a.userId - b.userId)
    .slice(0, neighbors);
  return { neighbors: top, reached: dot.size };
}

export function recommend(graph: Graph, request: RecommendationRequest): RecommendationResult {
  const start = performance.now();
  const { userId, k = 10, neighbors = 30, minCommon = 3, minSupport = 2, shrinkage = DEFAULT_SHRINKAGE } = request;
  const mine = graph.moviesOf(userId);
  let ratingSum = 0;
  for (const w of mine.values()) ratingSum += w;
  const userMean = mine.size ? ratingSum / mine.size : 0;

  // Saltos 1 e 2
  const { neighbors: topNeighbors, reached } = findNeighbors(graph, userId, { neighbors, minCommon });
  if (!topNeighbors.length) return popularityFallback(graph, userId, k, start, 1 + mine.size + reached);

  // Salto 3: filmes dos vizinhos que u ainda não avaliou
  const num = new Map<MovieId, number>();
  const den = new Map<MovieId, number>();
  const support = new Map<MovieId, Supporter[]>();
  for (const n of topNeighbors) {
    const common = n.via;
    // "via" mostra primeiro os filmes que u avaliou melhor (explicação mais convincente)
    const bestCommon = [...common].sort((a, b) => mine.get(b)! - mine.get(a)!).slice(0, VIA_LIMIT);
    for (const [movieId, wv] of graph.moviesOf(n.userId)) {
      if (mine.has(movieId)) continue;
      num.set(movieId, (num.get(movieId) ?? 0) + n.similarity * wv);
      den.set(movieId, (den.get(movieId) ?? 0) + n.similarity);
      const list = support.get(movieId) ?? [];
      list.push({ userId: n.userId, similarity: n.similarity, via: bestCommon, common: common.length, rating: wv });
      support.set(movieId, list);
    }
  }

  const recommendations: Recommendation[] = [...support.entries()]
    .filter(([, s]) => s.length >= minSupport)
    .map(([movieId, supporters]) => ({
      movieId,
      title: graph.title(movieId),
      // Média ponderada pela similaridade, suavizada em direção à média do próprio
      // usuário: com poucos vizinhos (pouca evidência) a nota fica perto de μ_u.
      score: (num.get(movieId)! + shrinkage * userMean) / (den.get(movieId)! + shrinkage),
      supporters: supporters.sort((a, b) => b.similarity - a.similarity),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.supporters.length - a.supporters.length ||
        graph.usersOf(b.movieId).size - graph.usersOf(a.movieId).size,
    )
    .slice(0, k);

  return {
    userId,
    strategy: "neighborhood",
    recommendations,
    stats: {
      visitedNodes: 1 + mine.size + reached + support.size,
      ms: performance.now() - start,
    },
  };
}

export interface RelatedMovie {
  movieId: MovieId;
  title: string;
  /** Fãs em comum: quantos fãs do filme de origem também amaram este. */
  sharedFans: number;
  /** Similaridade cosseno entre os conjuntos de fãs (0 a 1). */
  similarity: number;
}

/**
 * "Quem amou este filme também amou": travessia de 2 saltos a partir de um FILME.
 * m → usuários que deram nota ≥ minRating → outros filmes que eles amaram.
 * Normaliza pelo nº de fãs de cada filme (cosseno entre conjuntos), senão os
 * filmes mais populares apareceriam em todas as listas.
 */
export function relatedMovies(graph: Graph, movieId: MovieId, k = 10, minRating = 4, minShared = 3): RelatedMovie[] {
  const fansOf = (m: MovieId) => {
    let n = 0;
    for (const r of graph.usersOf(m).values()) if (r >= minRating) n++;
    return n;
  };

  const shared = new Map<MovieId, number>();
  let fans = 0;
  for (const [userId, rating] of graph.usersOf(movieId)) {
    if (rating < minRating) continue;
    fans++;
    for (const [other, r] of graph.moviesOf(userId)) {
      if (other !== movieId && r >= minRating) shared.set(other, (shared.get(other) ?? 0) + 1);
    }
  }

  return [...shared.entries()]
    .filter(([, count]) => count >= minShared)
    .map(([id, count]) => ({
      movieId: id,
      title: graph.title(id),
      sharedFans: count,
      similarity: count / Math.sqrt(fans * fansOf(id)),
    }))
    .sort((a, b) => b.similarity - a.similarity || b.sharedFans - a.sharedFans)
    .slice(0, k);
}

/** Sem vizinhos válidos (cold start): filmes de maior grau que o usuário ainda não viu. */
function popularityFallback(
  graph: Graph,
  userId: UserId,
  k: number,
  start: number,
  visitedNodes: number,
): RecommendationResult {
  const mine = graph.moviesOf(userId);
  const recommendations = topMoviesByDegree(graph, k + mine.size)
    .filter((m) => !mine.has(m.movieId))
    .slice(0, k)
    .map((m) => ({ movieId: m.movieId, title: m.title, score: m.avgRating, supporters: [] }));
  return {
    userId,
    strategy: "popularity",
    recommendations,
    stats: { visitedNodes: visitedNodes + graph.movieCount, ms: performance.now() - start },
  };
}
