import type { MovieId, MovieInfo, NodeKey, RatingEdge, UserId } from "./types";

export const userKey = (id: UserId): NodeKey => `u:${id}`;
export const movieKey = (id: MovieId): NodeKey => `m:${id}`;

export function parseKey(key: NodeKey): { kind: "user" | "movie"; id: number } {
  return { kind: key[0] === "u" ? "user" : "movie", id: Number(key.slice(2)) };
}

/**
 * Grafo bipartido não direcionado e ponderado, representado por listas de
 * adjacência (Map). Cada avaliação é guardada nos dois sentidos:
 *   userAdj[u][m] = nota   e   movieAdj[m][u] = nota
 * Assim, "filmes de um usuário" e "usuários de um filme" custam O(grau).
 */
export class Graph {
  private readonly userAdj = new Map<UserId, Map<MovieId, number>>();
  private readonly movieAdj = new Map<MovieId, Map<UserId, number>>();
  private readonly movieInfo = new Map<MovieId, MovieInfo>();
  private edges = 0;

  static fromEdges(edges: Iterable<RatingEdge>, movies: Iterable<MovieInfo> = []): Graph {
    const g = new Graph();
    for (const m of movies) g.addMovie(m);
    for (const e of edges) g.addRating(e.userId, e.movieId, e.rating);
    return g;
  }

  addUser(id: UserId): void {
    if (!this.userAdj.has(id)) this.userAdj.set(id, new Map());
  }

  addMovie(info: MovieInfo): void {
    this.movieInfo.set(info.id, info);
    if (!this.movieAdj.has(info.id)) this.movieAdj.set(info.id, new Map());
  }

  /** Adiciona (ou atualiza) a aresta usuário—filme com peso = nota. */
  addRating(userId: UserId, movieId: MovieId, rating: number): void {
    this.addUser(userId);
    if (!this.movieAdj.has(movieId)) this.movieAdj.set(movieId, new Map());
    const movies = this.userAdj.get(userId)!;
    if (!movies.has(movieId)) this.edges++;
    movies.set(movieId, rating);
    this.movieAdj.get(movieId)!.set(userId, rating);
  }

  hasUser(id: UserId): boolean {
    return this.userAdj.has(id);
  }

  hasMovie(id: MovieId): boolean {
    return this.movieAdj.has(id);
  }

  /** N(u): filmes avaliados pelo usuário, com a nota de cada um. */
  moviesOf(userId: UserId): ReadonlyMap<MovieId, number> {
    return this.userAdj.get(userId) ?? new Map();
  }

  /** N(m): usuários que avaliaram o filme, com a nota de cada um. */
  usersOf(movieId: MovieId): ReadonlyMap<UserId, number> {
    return this.movieAdj.get(movieId) ?? new Map();
  }

  rating(userId: UserId, movieId: MovieId): number | undefined {
    return this.userAdj.get(userId)?.get(movieId);
  }

  movie(id: MovieId): MovieInfo | undefined {
    return this.movieInfo.get(id);
  }

  /** Título para exibição: em português (TMDB) quando houver, senão o do MovieLens. */
  title(id: MovieId): string {
    const info = this.movieInfo.get(id);
    return info?.titlePt || info?.title || `Filme #${id}`;
  }

  /** Vizinhos de um vértice qualquer (usado pela BFS genérica). */
  neighbors(key: NodeKey): NodeKey[] {
    if (key[0] === "u") {
      return [...this.moviesOf(Number(key.slice(2))).keys()].map(movieKey);
    }
    return [...this.usersOf(Number(key.slice(2))).keys()].map(userKey);
  }

  userIds(): IterableIterator<UserId> {
    return this.userAdj.keys();
  }

  movieIds(): IterableIterator<MovieId> {
    return this.movieAdj.keys();
  }

  get userCount(): number {
    return this.userAdj.size;
  }

  get movieCount(): number {
    return this.movieAdj.size;
  }

  get edgeCount(): number {
    return this.edges;
  }
}
