import { describe, expect, it } from "vitest";
import { buildFixtureGraph, parseKey, recommend, recommendationSubgraph } from "../src/server/graph";

const g = buildFixtureGraph();
const result = recommend(g, { userId: 1, minCommon: 1, minSupport: 1, shrinkage: 0 });
const sub = recommendationSubgraph(g, result);

describe("recommendationSubgraph() — recorte para a visualização", () => {
  it("monta as quatro camadas u → pontes → vizinhos → recomendações", () => {
    const byRole = (role: string) => sub.nodes.filter((n) => n.role === role).map((n) => n.key);
    expect(byRole("origin")).toEqual(["u:1"]);
    expect(byRole("neighbor")).toEqual(["u:2", "u:3", "u:5"]); // Bruno, Carla, Eva por similaridade
    expect(byRole("bridge")).toEqual(["m:10", "m:30", "m:20"]); // Matrix e Toy Story ligam 2 vizinhos
    expect(byRole("recommendation")).toEqual(["m:60", "m:50"]); // A Origem, Procurando Nemo
  });

  it("só desenha arestas que existem no grafo, com a nota como peso", () => {
    expect(sub.edges).toHaveLength(11);
    for (const e of sub.edges) {
      expect(g.rating(parseKey(e.user).id, parseKey(e.movie).id)).toBe(e.rating);
    }
  });

  it("não deixa vértice solto: todo vértice desenhado tem ao menos uma aresta", () => {
    for (const n of sub.nodes) {
      expect(sub.edges.some((e) => e.user === n.key || e.movie === n.key)).toBe(true);
    }
  });

  it("é bipartido: toda aresta liga um usuário a um filme", () => {
    for (const e of sub.edges) {
      expect(parseKey(e.user).kind).toBe("user");
      expect(parseKey(e.movie).kind).toBe("movie");
    }
  });
});
