import { Graph, userKey } from "./Graph";
import type { MovieId, NodeKey, UserId } from "./types";

export interface BfsResult {
  /** Distância (em arestas) de cada vértice alcançado até a origem. */
  depth: Map<NodeKey, number>;
  /** Predecessor de cada vértice na árvore de busca (para reconstruir caminhos). */
  parent: Map<NodeKey, NodeKey>;
}

/**
 * Busca em largura clássica a partir de `start`, opcionalmente limitada a
 * `maxDepth` saltos. Complexidade O(V + E) no pior caso.
 */
export function bfs(graph: Graph, start: NodeKey, maxDepth = Infinity): BfsResult {
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
  const { depth, parent } = bfs(graph, from);
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
