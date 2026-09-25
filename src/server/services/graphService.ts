import { cypher, hasDatabase } from "../db/neo4j";
import { Graph, buildFixtureGraph, type MovieInfo } from "../graph";

export type GraphSource = "neo4j" | "fixture";

export interface LoadedGraph {
  graph: Graph;
  source: GraphSource;
  loadMs: number;
  /** Preenchido quando o Neo4j falhou e a aplicação caiu para o modo demo. */
  error?: string;
}

/**
 * Lê vértices e arestas do Neo4j e monta as listas de adjacência em memória.
 *
 * Desempenho (medido no AuraDB Free): o custo é dominado pelo número de
 * registros trafegados, não pelo volume. Por isso as arestas vêm agrupadas por
 * usuário (602 registros em ~2 s, contra 90.137 registros em ~15 s) e a sinopse,
 * texto longo, fica de fora (buscada sob demanda em movieOverviews).
 */
export async function loadGraphFromDb(): Promise<Graph> {
  const [movies, users] = await Promise.all([
    cypher<Omit<MovieInfo, "genres" | "overview"> & { genres: string[] | null }>(
      `MATCH (m:Movie)
       RETURN m.id AS id, m.title AS title, m.year AS year, m.genres AS genres,
              m.tmdbId AS tmdbId, m.titlePt AS titlePt,
              m.posterPath AS posterPath, m.voteAverage AS voteAverage`,
    ),
    cypher<{ userId: number; movies: number[]; ratings: number[] }>(
      `MATCH (u:User)-[r:RATED]->(m:Movie)
       RETURN u.id AS userId, collect(m.id) AS movies, collect(r.rating) AS ratings`,
    ),
  ]);

  const g = new Graph();
  for (const m of movies) g.addMovie({ ...m, genres: m.genres ?? [] });
  for (const u of users) {
    for (let i = 0; i < u.movies.length; i++) g.addRating(u.userId, u.movies[i], u.ratings[i]);
  }
  return g;
}

// Guardado em globalThis (e não numa variável do módulo) porque o Next empacota
// instrumentation.ts separado das páginas: assim o pré-carregamento feito ao
// ligar o servidor é o mesmo grafo que as páginas usam.
const store = globalThis as typeof globalThis & { __cinegraphGraph?: Promise<LoadedGraph> | null };

/**
 * Grafo em memória compartilhado pela aplicação. Com o Neo4j configurado,
 * carrega uma vez por instância do servidor; sem ele, usa o grafo de exemplo
 * (modo demo). Se o Neo4j falhar (ex.: AuraDB Free pausada), responde com o
 * grafo de exemplo e tenta o banco de novo na próxima requisição.
 */
export async function loadGraph(): Promise<LoadedGraph> {
  const start = performance.now();
  if (!hasDatabase()) {
    store.__cinegraphGraph ??= Promise.resolve({ graph: buildFixtureGraph(), source: "fixture", loadMs: 0 });
    return store.__cinegraphGraph;
  }
  store.__cinegraphGraph ??= loadGraphFromDb().then((graph) => ({
    graph,
    source: "neo4j" as const,
    loadMs: performance.now() - start,
  }));
  try {
    return await store.__cinegraphGraph;
  } catch (err) {
    store.__cinegraphGraph = null;
    return { graph: buildFixtureGraph(), source: "fixture", loadMs: 0, error: (err as Error).message };
  }
}
