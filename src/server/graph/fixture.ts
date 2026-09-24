import { Graph } from "./Graph";
import type { MovieInfo, RatingEdge } from "./types";

// Grafo pequeno usado nos testes, no CLI "hello graph" e como modo demo da
// interface quando o banco não está configurado. O mesmo exemplo aparece em
// docs/01-modelo-conceitual.md.
//
// Usuários: 1 Ana · 2 Bruno · 3 Carla · 4 Davi · 5 Eva

export const fixtureUserNames: Record<number, string> = {
  1: "Ana",
  2: "Bruno",
  3: "Carla",
  4: "Davi",
  5: "Eva",
};

export const fixtureMovies: MovieInfo[] = [
  { id: 10, title: "Matrix", year: 1999, genres: ["Action", "Sci-Fi"] },
  { id: 20, title: "Interestelar", year: 2014, genres: ["Sci-Fi", "Drama"] },
  { id: 30, title: "Toy Story", year: 1995, genres: ["Animation", "Children"] },
  { id: 40, title: "O Poderoso Chefão", year: 1972, genres: ["Crime", "Drama"] },
  { id: 50, title: "Procurando Nemo", year: 2003, genres: ["Animation", "Children"] },
  { id: 60, title: "A Origem", year: 2010, genres: ["Action", "Sci-Fi"] },
];

export const fixtureRatings: RatingEdge[] = [
  { userId: 1, movieId: 10, rating: 5 },
  { userId: 1, movieId: 20, rating: 4 },
  { userId: 1, movieId: 30, rating: 2 },
  { userId: 2, movieId: 10, rating: 5 },
  { userId: 2, movieId: 20, rating: 5 },
  { userId: 2, movieId: 60, rating: 5 },
  { userId: 3, movieId: 30, rating: 5 },
  { userId: 3, movieId: 50, rating: 5 },
  { userId: 3, movieId: 10, rating: 1 },
  { userId: 4, movieId: 40, rating: 4 },
  { userId: 4, movieId: 60, rating: 4 },
  { userId: 5, movieId: 50, rating: 4 },
  { userId: 5, movieId: 30, rating: 4 },
];

export function buildFixtureGraph(): Graph {
  return Graph.fromEdges(fixtureRatings, fixtureMovies);
}
