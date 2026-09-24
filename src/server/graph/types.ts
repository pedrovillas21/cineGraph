// Tipos do domínio do CineGraph.
// O grafo é bipartido: vértices de dois tipos (usuário e filme) e toda aresta
// liga um usuário a um filme, com peso = nota da avaliação.

export type UserId = number;
export type MovieId = number;

/** Chave única de vértice: "u:<id>" para usuário, "m:<id>" para filme. */
export type NodeKey = `u:${number}` | `m:${number}`;

export interface MovieInfo {
  id: MovieId;
  /** Título original do MovieLens. */
  title: string;
  year: number | null;
  genres: string[];
  // Metadados do TMDB (opcionais; só descrevem o filme, não entram no algoritmo)
  tmdbId?: number | null;
  titlePt?: string | null;
  overview?: string | null;
  posterPath?: string | null;
  voteAverage?: number | null;
}

/** Uma aresta do grafo: (usuário) --nota--> (filme). */
export interface RatingEdge {
  userId: UserId;
  movieId: MovieId;
  rating: number;
}

export interface GraphStats {
  users: number;
  movies: number;
  edges: number;
  avgUserDegree: number;
  avgMovieDegree: number;
}

// ---------------------------------------------------------------------------
// Contrato entre as frentes (algoritmo ↔ API ↔ interface).
// Definido em docs/02-algoritmo.md; implementado em recommend.ts.
// ---------------------------------------------------------------------------

export interface RecommendationRequest {
  userId: UserId;
  /** Quantidade de filmes recomendados (padrão 10). */
  k?: number;
  /** Quantidade de vizinhos mais similares considerados (padrão 30). */
  neighbors?: number;
  /** Mínimo de vizinhos que precisam ter avaliado o filme (padrão 2). */
  minSupport?: number;
  /** Mínimo de filmes em comum para considerar dois usuários vizinhos (padrão 3). */
  minCommon?: number;
  /** λ: suaviza o score em direção à média do usuário quando há poucos vizinhos (padrão 2; 0 desliga). */
  shrinkage?: number;
}

/** Vizinho que "sustenta" uma recomendação — torna o resultado explicável. */
export interface Supporter {
  userId: UserId;
  similarity: number;
  /** Filmes em comum com o usuário de origem (o caminho u → m → v), até 10, os de maior nota de u. */
  via: MovieId[];
  /** Total de filmes em comum (via pode vir truncado). */
  common: number;
  /** Nota que esse vizinho deu ao filme recomendado. */
  rating: number;
}

export interface Recommendation {
  movieId: MovieId;
  title: string;
  score: number;
  supporters: Supporter[];
}

export interface RecommendationResult {
  userId: UserId;
  /** "neighborhood" = algoritmo por vizinhança; "popularity" = fallback por grau (sem vizinhos). */
  strategy: "neighborhood" | "popularity";
  recommendations: Recommendation[];
  stats: {
    /** Vértices visitados na travessia. */
    visitedNodes: number;
    /** Tempo de execução do algoritmo em milissegundos. */
    ms: number;
  };
}
