import { describe, expect, it } from "vitest";
import {
  bfsFromUser,
  buildFixtureGraph,
  graphStats,
  movieDegree,
  movieKey,
  shortestPath,
  topMoviesByDegree,
  twoHopNeighbors,
  userDegree,
  userKey,
} from "../src/server/graph";

const g = buildFixtureGraph();

describe("estrutura do grafo bipartido", () => {
  it("conta vértices e arestas", () => {
    expect(graphStats(g)).toMatchObject({ users: 5, movies: 6, edges: 13 });
  });

  it("guarda a aresta nos dois sentidos com o mesmo peso", () => {
    expect(g.moviesOf(1).get(10)).toBe(5);
    expect(g.usersOf(10).get(1)).toBe(5);
  });

  it("não duplica aresta ao reavaliar um filme", () => {
    const g2 = buildFixtureGraph();
    g2.addRating(1, 10, 3);
    expect(g2.edgeCount).toBe(13);
    expect(g2.rating(1, 10)).toBe(3);
  });
});

describe("métricas de grau", () => {
  it("grau do usuário = filmes avaliados", () => {
    expect(userDegree(g, 1)).toBe(3);
  });

  it("grau do filme = popularidade", () => {
    expect(movieDegree(g, 10)).toBe(3); // Matrix: Ana, Bruno, Carla
    const top = topMoviesByDegree(g, 3);
    expect(top.slice(0, 2).map((m) => m.degree)).toEqual([3, 3]); // Matrix e Toy Story
    expect(top[2].degree).toBe(2);
  });
});

describe("travessias", () => {
  it("vizinhança de 2 saltos lista os filmes em comum", () => {
    const n = twoHopNeighbors(g, 1);
    expect([...n.keys()].sort()).toEqual([2, 3, 5]);
    expect(n.get(2)).toEqual([10, 20]);
    expect(n.get(3)).toEqual([10, 30]);
    expect(n.get(5)).toEqual([30]);
    expect(n.has(1)).toBe(false);
  });

  it("BFS alcança todo o componente com as profundidades corretas", () => {
    const { depth } = bfsFromUser(g, 1);
    expect(depth.get(movieKey(10))).toBe(1);
    expect(depth.get(userKey(2))).toBe(2);
    expect(depth.get(movieKey(60))).toBe(3);
    expect(depth.get(userKey(4))).toBe(4);
    expect(depth.size).toBe(11);
  });

  it("BFS respeita o limite de profundidade", () => {
    const { depth } = bfsFromUser(g, 1, 2);
    expect(depth.has(userKey(2))).toBe(true);
    expect(depth.has(movieKey(60))).toBe(false);
  });

  it("caminho mínimo entre usuários (afinidade)", () => {
    // Ana → Matrix → Bruno → A Origem → Davi
    expect(shortestPath(g, userKey(1), userKey(4))).toEqual(["u:1", "m:10", "u:2", "m:60", "u:4"]);
    expect(shortestPath(g, userKey(1), userKey(1))).toEqual(["u:1"]);
  });
});
