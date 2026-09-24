// Monta os dados da tela inicial ("hello graph"). A interface recebe só dados
// prontos e não conhece o banco nem o algoritmo.

import { movieOverviews, twoHopCountCypher } from "../db/graphQueries";
import {
  fixtureUserNames,
  graphStats,
  topMoviesByDegree,
  twoHopNeighbors,
  type Graph,
  type GraphStats,
  type MovieId,
} from "../graph";
import { loadGraph, type GraphSource } from "./graphService";

const TMDB_IMAGE = "https://image.tmdb.org/t/p/w185";

/** Filme pronto para exibição (dados do grafo + metadados do TMDB). */
export interface MovieView {
  movieId: MovieId;
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
}

export interface RankedMovieView extends MovieView {
  degree: number;
  avgRating: number;
}

export interface RatedMovieView extends MovieView {
  rating: number;
}

export interface NeighborView {
  userId: number;
  name: string;
  common: number;
  viaTitles: string[];
}

export interface DashboardData {
  source: GraphSource;
  loadMs: number;
  dbError?: string;
  /** Há metadados do TMDB carregados (exibe a atribuição obrigatória). */
  hasTmdb: boolean;
  stats: GraphStats;
  topMovies: RankedMovieView[];
  user: { id: number; name: string; degree: number; favorites: RatedMovieView[] };
  /** Id pedido na URL que não existe no grafo (a tela mostra o primeiro usuário). */
  missingUser?: string;
  neighborhood: { reached: number; ms: number; top: NeighborView[] };
  /** Mesma travessia feita pelo Neo4j (só quando o banco está ativo). */
  cypher: { reached: number; ms: number } | { error: string } | null;
}

function movieView(graph: Graph, id: MovieId): MovieView {
  const info = graph.movie(id);
  return {
    movieId: id,
    title: graph.title(id),
    year: info?.year ?? null,
    posterUrl: info?.posterPath ? `${TMDB_IMAGE}${info.posterPath}` : null,
    overview: info?.overview ?? null,
  };
}

export async function getDashboard(requestedUser?: string): Promise<DashboardData> {
  const { graph, source, loadMs, error } = await loadGraph();
  const name = (id: number) =>
    source === "fixture" ? (fixtureUserNames[id] ?? `Usuário ${id}`) : `Usuário ${id}`;

  const requested = Number(requestedUser);
  const userId =
    Number.isInteger(requested) && graph.hasUser(requested) ? requested : (graph.userIds().next().value ?? 0);

  const t0 = performance.now();
  const neighbors = twoHopNeighbors(graph, userId);
  const hopMs = performance.now() - t0;

  const top = topMoviesByDegree(graph, 10);
  // Perfil do usuário: as notas mais altas que ele deu (arestas de maior peso)
  const rated = [...graph.moviesOf(userId).entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 6);

  // No Neo4j: mesma travessia em Cypher (comparação) + sinopses só dos filmes exibidos
  let cypher: DashboardData["cypher"] = null;
  let overviews = new Map<MovieId, string>();
  if (source === "neo4j") {
    const t1 = performance.now();
    const [count, texts] = await Promise.allSettled([
      twoHopCountCypher(userId),
      movieOverviews([...top.map((m) => m.movieId), ...rated.map(([id]) => id)]),
    ]);
    cypher =
      count.status === "fulfilled"
        ? { reached: count.value, ms: performance.now() - t1 }
        : { error: (count.reason as Error).message };
    if (texts.status === "fulfilled") overviews = texts.value;
  }

  const view = (id: MovieId) => {
    const v = movieView(graph, id);
    return { ...v, overview: v.overview ?? overviews.get(id) ?? null };
  };
  const topMovies = top.map((m) => ({ ...view(m.movieId), degree: m.degree, avgRating: m.avgRating }));
  const favorites = rated.map(([id, rating]) => ({ ...view(id), rating }));

  return {
    source,
    loadMs,
    dbError: error,
    hasTmdb: topMovies.some((m) => m.posterUrl),
    stats: graphStats(graph),
    topMovies,
    user: { id: userId, name: name(userId), degree: graph.moviesOf(userId).size, favorites },
    missingUser: requestedUser !== undefined && userId !== requested ? requestedUser : undefined,
    neighborhood: {
      reached: neighbors.size,
      ms: hopMs,
      top: [...neighbors.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 8)
        .map(([id, common]) => ({
          userId: id,
          name: name(id),
          common: common.length,
          viaTitles: common.slice(0, 3).map((m) => graph.title(m)),
        })),
    },
    cypher,
  };
}
