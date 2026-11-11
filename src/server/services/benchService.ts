// Medição das consultas do grafo, memória × Cypher (docs/06-testes-de-carga.md).
// Usada pelo script de testes de carga (terminal) e pela rota /api/bench (Vercel),
// para as duas medições serem exatamente as mesmas.

import { cypher, cypherTimed, neo4j } from "../db/neo4j";
import { SHORTEST_PATH_QUERY, TWO_HOP_DOT_QUERY, TWO_HOP_QUERY } from "../db/graphQueries";
import {
  findNeighbors,
  recommend,
  shortestPath,
  twoHopNeighbors,
  userKey,
  userNorm,
  type Graph,
  type UserId,
} from "../graph";

const TOP = 20;
const NEIGHBORS = 30;
const MIN_COMMON = 3;

/** Percentil por posição (nearest-rank). */
export function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

/** n usuários espalhados de forma uniforme pela lista (determinístico). */
export function sampleUsers(ids: UserId[], n: number): UserId[] {
  const k = Math.min(n, ids.length);
  return Array.from({ length: k }, (_, i) => ids[Math.floor((i * ids.length) / k)]);
}

async function time<T>(fn: () => T | Promise<T>): Promise<{ ms: number; value: T }> {
  const start = performance.now();
  const value = await fn();
  return { ms: performance.now() - start, value };
}

/** Top-20 da vizinhança de 2 saltos em memória, na mesma ordem do Cypher. */
function topTwoHop(g: Graph, u: UserId): string {
  return [...twoHopNeighbors(g, u)]
    .map(([v, via]) => ({ v, common: via.length }))
    .sort((a, b) => b.common - a.common || a.v - b.v)
    .slice(0, TOP)
    .map((x) => `${x.v}:${x.common}`)
    .join(",");
}

export interface BenchResult {
  /** Tempo de parede de cada consulta (ms), por tipo de consulta. */
  ms: Record<string, number[]>;
  /** Tempo dentro do Neo4j segundo o próprio banco (ms), sem a rede. */
  serverMs: Record<string, number[]>;
  /** Consultas em que memória e Cypher deram resultados diferentes. */
  mismatches: Record<string, number>;
  /** % dos outros usuários alcançados pela vizinhança de 2 saltos. */
  reachPct: number[];
}

/**
 * Mede, para cada usuário da amostra: 2 saltos, recomendação completa e caminho
 * mínimo em memória; com `db`, as mesmas travessias no Neo4j, a estratégia
 * híbrida (salto 2 no banco) e a ida e volta mínima (`RETURN 1`).
 */
export async function benchQueries(graph: Graph, users: UserId[], { db }: { db: boolean }): Promise<BenchResult> {
  const r: BenchResult = { ms: {}, serverMs: {}, mismatches: {}, reachPct: [] };
  const push = (bag: Record<string, number[]>, key: string, v: number) => (bag[key] ??= []).push(v);
  const miss = (key: string, differs: boolean) => (r.mismatches[key] = (r.mismatches[key] ?? 0) + (differs ? 1 : 0));
  const pairs = users.map((u, i) => [u, users[(i + Math.floor(users.length / 2)) % users.length]] as const);
  const others = [...graph.userIds()].length - 1;

  // Aquecimento do JIT: a primeira chamada de cada função é bem mais lenta
  findNeighbors(graph, users[0]);
  recommend(graph, { userId: users[0] });
  shortestPath(graph, userKey(pairs[0][0]), userKey(pairs[0][1]));

  for (const u of users) {
    const hop = await time(() => findNeighbors(graph, u, { neighbors: NEIGHBORS, minCommon: MIN_COMMON }));
    push(r.ms, "mem2hop", hop.ms);
    r.reachPct.push((hop.value.reached / others) * 100);
    push(r.ms, "memRec", (await time(() => recommend(graph, { userId: u }))).ms);
  }
  for (const [a, b] of pairs) push(r.ms, "memPath", (await time(() => shortestPath(graph, userKey(a), userKey(b)))).ms);
  if (!db) return r;

  await cypher("RETURN 1"); // aquece a conexão
  for (let i = 0; i < users.length; i++) {
    const t = await time(() => cypherTimed("RETURN 1"));
    push(r.ms, "rtt", t.ms);
    push(r.serverMs, "rtt", t.value.serverMs);
  }
  for (const u of users) {
    const t = await time(() => cypherTimed<{ userId: number; common: number }>(TWO_HOP_QUERY, { userId: neo4j.int(u), limit: neo4j.int(TOP) }));
    push(r.ms, "cy2hop", t.ms);
    push(r.serverMs, "cy2hop", t.value.serverMs);
    miss("2hop", t.value.rows.map((x) => `${x.userId}:${x.common}`).join(",") !== topTwoHop(graph, u));

    // Híbrida: salto 2 com produto escalar no banco, similaridade e top-K aqui
    const h = await time(async () => {
      const { rows, serverMs } = await cypherTimed<{ userId: number; dot: number }>(TWO_HOP_DOT_QUERY, {
        userId: neo4j.int(u),
        minCommon: neo4j.int(MIN_COMMON),
      });
      const nu = userNorm(graph, u);
      const top = rows
        .map((x) => ({ userId: x.userId, similarity: x.dot / (nu * userNorm(graph, x.userId)) }))
        .sort((a, b) => b.similarity - a.similarity || a.userId - b.userId)
        .slice(0, NEIGHBORS);
      return { top, serverMs };
    });
    push(r.ms, "hybrid", h.ms);
    push(r.serverMs, "hybrid", h.value.serverMs);
    const mem = findNeighbors(graph, u, { neighbors: NEIGHBORS, minCommon: MIN_COMMON }).neighbors;
    miss("hybrid", h.value.top.map((x) => x.userId).join(",") !== mem.map((x) => x.userId).join(","));
  }
  for (const [a, b] of pairs) {
    const t = await time(() => cypherTimed<{ path: string[] }>(SHORTEST_PATH_QUERY, { from: neo4j.int(a), to: neo4j.int(b) }));
    push(r.ms, "cyPath", t.ms);
    push(r.serverMs, "cyPath", t.value.serverMs);
    const memLen = shortestPath(graph, userKey(a), userKey(b))?.length ?? -1;
    miss("path", (t.value.rows[0]?.path.length ?? -1) !== memLen);
  }
  return r;
}

const fmtMs = (ms: number) => (ms >= 100 ? ms.toFixed(0) : ms.toFixed(1));
/** "mediana / p95" ou "—" quando não medido. */
export const stat = (v: number[] | undefined) =>
  v?.length ? `${fmtMs(percentile(v, 50))} / ${fmtMs(percentile(v, 95))}` : "—";

/** Tabelas em Markdown com os tempos de consulta (uma linha por subgrafo ou ambiente). */
export function queryTables(rows: { label: string; bench: BenchResult }[]): string {
  const avg = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  const miss = (b: BenchResult) =>
    "2hop" in b.mismatches ? `${b.mismatches["2hop"]} / ${b.mismatches.hybrid} / ${b.mismatches.path}` : "—";
  return [
    "Tempo total de cada consulta, visto pela aplicação (mediana / p95, ms):",
    "",
    "| | 2 saltos · memória | 2 saltos · Cypher | Híbrida (salto 2 no Cypher) | Caminho mínimo · memória | Caminho mínimo · Cypher | Só rede (`RETURN 1`) | Recomendação completa · memória |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
    ...rows.map(
      ({ label, bench: b }) =>
        `| ${label} | ${stat(b.ms.mem2hop)} | ${stat(b.ms.cy2hop)} | ${stat(b.ms.hybrid)} | ${stat(b.ms.memPath)} | ${stat(b.ms.cyPath)} | ${stat(b.ms.rtt)} | ${stat(b.ms.memRec)} |`,
    ),
    "",
    "Tempo dentro do Neo4j, informado pelo banco (sem rede), alcance e conferência:",
    "",
    "| | 2 saltos · Neo4j | Híbrida · Neo4j | Caminho mínimo · Neo4j | `RETURN 1` · Neo4j | Alcance dos 2 saltos (média) | Divergências (2 saltos / híbrida / caminho) |",
    "|---|---:|---:|---:|---:|---:|---:|",
    ...rows.map(
      ({ label, bench: b }) =>
        `| ${label} | ${stat(b.serverMs.cy2hop)} | ${stat(b.serverMs.hybrid)} | ${stat(b.serverMs.cyPath)} | ${stat(b.serverMs.rtt)} | ${avg(b.reachPct).toFixed(1)}% | ${miss(b)} |`,
    ),
  ].join("\n");
}
