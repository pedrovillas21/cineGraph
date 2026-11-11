// Recorte do grafo para a visualização (checkpoint 5): o caminho completo de uma
// recomendação, u → filmes em comum → vizinhos → filmes recomendados.
// É uma amostra (top vizinhos, top recomendações, poucas pontes): o grafo inteiro
// tem 90 mil arestas e não caberia legível na tela (risco do TAP).

import { Graph, movieKey, userKey } from "./Graph";
import type { NodeKey, RecommendationResult } from "./types";

export type SubgraphRole = "origin" | "bridge" | "neighbor" | "recommendation";

export interface SubgraphNode {
  key: NodeKey;
  role: SubgraphRole;
  label: string;
  /** Similaridade (vizinho) ou score previsto (recomendação). */
  value?: number;
}

/** Aresta usuário–filme com o peso do grafo (a nota). */
export interface SubgraphEdge {
  user: NodeKey;
  movie: NodeKey;
  rating: number;
}

export interface Subgraph {
  nodes: SubgraphNode[];
  edges: SubgraphEdge[];
}

export function recommendationSubgraph(
  graph: Graph,
  result: RecommendationResult,
  { neighbors = 5, recommendations = 6, bridges = 6 } = {},
): Subgraph {
  const u = result.userId;
  const recs = result.recommendations.slice(0, recommendations);

  // Vizinhos: o principal de cada recomendação exibida (para nenhuma ficar solta) e,
  // se sobrar espaço, os de maior similaridade
  const sim = new Map<number, number>();
  const via = new Map<number, number[]>();
  for (const r of recs) {
    for (const s of r.supporters) {
      sim.set(s.userId, s.similarity);
      via.set(s.userId, s.via);
    }
  }
  const bySim = (a: number, b: number) => sim.get(b)! - sim.get(a)! || a - b;
  const chosen = new Set(recs.map((r) => r.supporters[0].userId));
  for (const v of [...sim.keys()].sort(bySim)) if (chosen.size < neighbors) chosen.add(v);
  const topNeighbors = [...chosen].sort(bySim);

  // Pontes: o filme em comum preferido de cada vizinho e, depois, os mais compartilhados
  const shared = new Map<number, number>();
  for (const v of topNeighbors) for (const m of via.get(v)!.slice(0, 3)) shared.set(m, (shared.get(m) ?? 0) + 1);
  const byShared = (a: number, b: number) =>
    shared.get(b)! - shared.get(a)! || graph.rating(u, b)! - graph.rating(u, a)! || a - b;
  const picked = new Set(topNeighbors.map((v) => via.get(v)![0]));
  for (const m of [...shared.keys()].sort(byShared)) if (picked.size < bridges) picked.add(m);
  const bridgeIds = [...picked].sort(byShared);

  const nodes: SubgraphNode[] = [
    { key: userKey(u), role: "origin", label: `Usuário ${u}` },
    ...bridgeIds.map((m) => ({ key: movieKey(m), role: "bridge" as const, label: graph.title(m) })),
    ...topNeighbors.map((v) => ({ key: userKey(v), role: "neighbor" as const, label: `Usuário ${v}`, value: sim.get(v) })),
    ...recs.map((r) => ({ key: movieKey(r.movieId), role: "recommendation" as const, label: r.title, value: r.score })),
  ];

  const edges: SubgraphEdge[] = [];
  for (const m of bridgeIds) {
    edges.push({ user: userKey(u), movie: movieKey(m), rating: graph.rating(u, m)! });
    for (const v of topNeighbors) {
      const w = graph.rating(v, m);
      if (w !== undefined) edges.push({ user: userKey(v), movie: movieKey(m), rating: w });
    }
  }
  for (const r of recs) {
    for (const v of topNeighbors) {
      const w = graph.rating(v, r.movieId);
      if (w !== undefined) edges.push({ user: userKey(v), movie: movieKey(r.movieId), rating: w });
    }
  }
  return { nodes, edges };
}
