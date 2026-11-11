import { Graph, parseKey, userKey } from "./Graph";
import type { MovieId, NodeKey, UserId } from "./types";

export interface BfsResult {
  /** Distância (em arestas) de cada vértice alcançado até a origem. */
  depth: Map<NodeKey, number>;
  /** Predecessor de cada vértice na árvore de busca (para reconstruir caminhos). */
  parent: Map<NodeKey, NodeKey>;
}

/**
 * Busca em largura clássica a partir de `start`, opcionalmente limitada a
 * `maxDepth` saltos. Com `stopAt`, para assim que esse vértice é descoberto.
 * Complexidade O(V + E) no pior caso.
 */
export function bfs(graph: Graph, start: NodeKey, maxDepth = Infinity, stopAt?: NodeKey): BfsResult {
  const depth = new Map<NodeKey, number>([[start, 0]]);
  const parent = new Map<NodeKey, NodeKey>();
  const queue: NodeKey[] = [start];

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    const d = depth.get(current)!;
    if (d >= maxDepth) continue;
    for (const next of graph.neighbors(current)) {
      if (depth.has(next)) continue;
      depth.set(next, d + 1);
      parent.set(next, current);
      if (next === stopAt) return { depth, parent };
      queue.push(next);
    }
  }
  return { depth, parent };
}

/**
 * Caminho mínimo (em número de arestas) entre dois vértices, via BFS.
 * Entre dois usuários, o comprimento é sempre par (u → m → v → m' → w ...):
 * quanto menor, maior a "afinidade" estrutural entre eles.
 */
export function shortestPath(graph: Graph, from: NodeKey, to: NodeKey): NodeKey[] | null {
  // Para ao descobrir o destino: na BFS, a primeira descoberta já é pelo caminho mínimo
  // (otimização do relatório de carga: de ~17 ms para frações de ms no grafo real).
  const { depth, parent } = bfs(graph, from, Infinity, to);
  if (!depth.has(to)) return null;
  const path: NodeKey[] = [to];
  let cur = to;
  while (cur !== from) {
    cur = parent.get(cur)!;
    path.push(cur);
  }
  return path.reverse();
}

/**
 * Vizinhança de dois saltos de um usuário: u → filme → outro usuário.
 * Retorna, para cada usuário alcançado, os filmes em comum com `userId`.
 * Complexidade: O(Σ grau(m)) para m ∈ N(u).
 */
export function twoHopNeighbors(graph: Graph, userId: UserId): Map<UserId, MovieId[]> {
  const result = new Map<UserId, MovieId[]>();
  for (const movieId of graph.moviesOf(userId).keys()) {
    for (const other of graph.usersOf(movieId).keys()) {
      if (other === userId) continue;
      const common = result.get(other);
      if (common) common.push(movieId);
      else result.set(other, [movieId]);
    }
  }
  return result;
}

/** Atalho: BFS a partir de um usuário. */
export function bfsFromUser(graph: Graph, userId: UserId, maxDepth = Infinity): BfsResult {
  return bfs(graph, userKey(userId), maxDepth);
}

export interface UserDistances {
  /** Quantos usuários estão a cada distância (2, 4, 6…) do usuário de origem. */
  byDistance: Map<number, number>;
  /** Usuário alcançável mais distante (desempate pelo menor id); null se ninguém é alcançado. */
  farthest: UserId | null;
  /** Usuários sem nenhum caminho até a origem (outra componente conexa). */
  unreachable: number;
}

/** Distribuição das distâncias de um usuário até os demais, numa única BFS (O(V + E)). */
export function userDistances(graph: Graph, userId: UserId): UserDistances {
  const { depth } = bfs(graph, userKey(userId));
  const byDistance = new Map<number, number>();
  let farthest: UserId | null = null;
  let max = 0;
  let unreachable = 0;
  for (const v of graph.userIds()) {
    if (v === userId) continue;
    const d = depth.get(userKey(v));
    if (d === undefined) {
      unreachable++;
      continue;
    }
    byDistance.set(d, (byDistance.get(d) ?? 0) + 1);
    if (d > max || (d === max && farthest !== null && v < farthest)) {
      max = d;
      farthest = v;
    }
  }
  return { byDistance, farthest, unreachable };
}

export interface PathStep {
  kind: "user" | "movie";
  id: number;
  /** Peso da aresta que chega a este vértice (a nota); ausente no primeiro. */
  rating?: number;
}

/** Caminho como lista de vértices com o peso de cada aresta percorrida. */
export function pathSteps(graph: Graph, path: NodeKey[]): PathStep[] {
  return path.map((key, i) => {
    const { kind, id } = parseKey(key);
    if (i === 0) return { kind, id };
    const prev = parseKey(path[i - 1]).id;
    return { kind, id, rating: kind === "user" ? graph.rating(id, prev) : graph.rating(prev, id) };
  });
}
