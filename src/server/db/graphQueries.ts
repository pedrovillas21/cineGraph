// Travessias executadas dentro do banco de grafos (Cypher).
// São a contrapartida das funções em memória de src/server/graph/traversal.ts;
// as duas versões devem dar o mesmo resultado e são comparadas nos testes de carga.

import type { MovieId, UserId } from "../graph";
import { cypher, neo4j } from "./neo4j";

export interface CypherNeighbor {
  userId: UserId;
  common: number;
  via: MovieId[];
}

/** Sinopses (TMDB) de alguns filmes; não ficam no grafo em memória por serem textos longos. */
export async function movieOverviews(ids: MovieId[]): Promise<Map<MovieId, string>> {
  if (!ids.length) return new Map();
  const rows = await cypher<{ id: number; overview: string | null }>(
    "MATCH (m:Movie) WHERE m.id IN $ids AND m.overview IS NOT NULL RETURN m.id AS id, m.overview AS overview",
    { ids: ids.map((id) => neo4j.int(id)) },
  );
  return new Map(rows.map((r) => [r.id, r.overview ?? ""]));
}

export interface MovieExtra {
  overview: string | null;
  backdropPath: string | null;
  runtime: number | null;
}

/** Campos do TMDB que só a página de detalhes usa (não ficam no grafo em memória). */
export async function movieExtra(id: MovieId): Promise<MovieExtra | null> {
  const [row] = await cypher<MovieExtra>(
    "MATCH (m:Movie {id: $id}) RETURN m.overview AS overview, m.backdropPath AS backdropPath, m.runtime AS runtime",
    { id: neo4j.int(id) },
  );
  return row ?? null;
}

/** Vizinhança de 2 saltos: (u)-[:RATED]->(m)<-[:RATED]-(v). */
export async function twoHopNeighborsCypher(userId: UserId, limit = 20): Promise<CypherNeighbor[]> {
  return cypher<CypherNeighbor>(
    `MATCH (u:User {id: $userId})-[:RATED]->(m:Movie)<-[:RATED]-(v:User)
     WHERE v <> u
     WITH v, collect(m.id) AS via
     RETURN v.id AS userId, size(via) AS common, via[0..10] AS via
     ORDER BY common DESC, userId ASC
     LIMIT $limit`,
    { userId: neo4j.int(userId), limit: neo4j.int(limit) },
  );
}

/** Quantos usuários distintos a vizinhança de 2 saltos alcança. */
export async function twoHopCountCypher(userId: UserId): Promise<number> {
  const [row] = await cypher<{ reached: number }>(
    `MATCH (u:User {id: $userId})-[:RATED]->(:Movie)<-[:RATED]-(v:User)
     WHERE v <> u
     RETURN count(DISTINCT v) AS reached`,
    { userId: neo4j.int(userId) },
  );
  return row?.reached ?? 0;
}

/** Caminho mínimo entre dois usuários (afinidade), feito pelo próprio banco. */
export async function shortestPathCypher(from: UserId, to: UserId): Promise<string[] | null> {
  const [row] = await cypher<{ path: string[] }>(
    `MATCH p = shortestPath((a:User {id: $from})-[:RATED*..10]-(b:User {id: $to}))
     RETURN [n IN nodes(p) | CASE WHEN n:User THEN 'u:' + toString(n.id) ELSE 'm:' + toString(n.id) END] AS path`,
    { from: neo4j.int(from), to: neo4j.int(to) },
  );
  return row?.path ?? null;
}
