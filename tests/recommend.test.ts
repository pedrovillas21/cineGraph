import { describe, expect, it } from "vitest";
import { buildFixtureGraph, recommend, relatedMovies } from "../src/server/graph";

const g = buildFixtureGraph();

describe("recommend() — exemplo resolvido do docs/02-algoritmo.md", () => {
  // O exemplo do doc usa a média ponderada pura (sem suavização)
  const result = recommend(g, { userId: 1, minCommon: 1, minSupport: 1, shrinkage: 0 });

  it("usa a estratégia por vizinhança", () => {
    expect(result.strategy).toBe("neighborhood");
  });

  it("recomenda A Origem (5,00) antes de Procurando Nemo (≈4,60)", () => {
    expect(result.recommendations.map((r) => r.movieId)).toEqual([60, 50]);
    expect(result.recommendations[0].score).toBeCloseTo(5, 5);
    expect(result.recommendations[1].score).toBeCloseTo(4.598, 2);
  });

  it("não recomenda filmes fora do alcance de 3 saltos nem já vistos", () => {
    const ids = result.recommendations.map((r) => r.movieId);
    expect(ids).not.toContain(40); // O Poderoso Chefão: só Davi (4 saltos) avaliou
    expect(ids).not.toContain(10); // Matrix: Ana já avaliou
  });

  it("explica cada recomendação com o vizinho, a similaridade e o caminho", () => {
    const [origem] = result.recommendations;
    expect(origem.supporters).toHaveLength(1);
    expect(origem.supporters[0]).toMatchObject({ userId: 2, rating: 5, common: 2 });
    expect(origem.supporters[0].similarity).toBeCloseTo(0.775, 3);
    expect(origem.supporters[0].via).toEqual([10, 20]); // Matrix (5) antes de Interestelar (4)

    const nemo = result.recommendations[1];
    expect(nemo.supporters.map((s) => s.userId)).toEqual([3, 5]); // Carla (0,313) antes de Eva (0,211)
  });

  it("minSupport descarta filmes sustentados por poucos vizinhos", () => {
    const strict = recommend(g, { userId: 1, minCommon: 1, minSupport: 2, shrinkage: 0 });
    expect(strict.recommendations.map((r) => r.movieId)).toEqual([50]);
  });

  it("a suavização puxa o score para a média do usuário quando há pouca evidência", () => {
    // média de Ana = (5 + 4 + 2) / 3 = 3,667; λ = 2
    const smooth = recommend(g, { userId: 1, minCommon: 1, minSupport: 1, shrinkage: 2 });
    const origem = smooth.recommendations.find((r) => r.movieId === 60)!;
    // (0,7746·5 + 2·3,667) / (0,7746 + 2) = 4,039
    expect(origem.score).toBeCloseTo(4.039, 2);
    // (0,3131·5 + 0,2108·4 + 2·3,667) / (0,5239 + 2) = 3,860
    const nemo = smooth.recommendations.find((r) => r.movieId === 50)!;
    expect(nemo.score).toBeCloseTo(3.86, 2);
  });

  it("relatedMovies: quem amou Matrix também amou…", () => {
    // Fãs de Matrix (nota ≥ 4): Ana e Bruno. Ambos amaram Interestelar; só Bruno, A Origem.
    const related = relatedMovies(g, 10, 5, 4, 1);
    expect(related.map((r) => r.movieId)).toEqual([20, 60]);
    expect(related[0]).toMatchObject({ sharedFans: 2, similarity: 1 }); // 2 / √(2·2)
    expect(related[1].similarity).toBeCloseTo(0.5, 5); // 1 / √(2·2): Bruno e Davi são fãs de A Origem
  });

  it("sem vizinhos válidos cai para popularidade (cold start)", () => {
    const cold = recommend(g, { userId: 1 }); // minCommon padrão = 3: ninguém tem 3 filmes em comum com Ana
    expect(cold.strategy).toBe("popularity");
    expect(cold.recommendations.every((r) => !g.moviesOf(1).has(r.movieId))).toBe(true);
  });
});
