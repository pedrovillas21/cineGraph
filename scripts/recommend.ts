// PoC do checkpoint 1: recomendação por vizinhança no terminal.
//
//   npm run recommend -- --user=1            grafo MovieLens lido dos CSVs (sem banco)
//   npm run recommend -- --user=1 --db       grafo carregado do Neo4j
//   --k=10 --neighbors=30 --min-common=3 --min-support=2 --shrinkage=2

import "./env";
import { closeDriver } from "../src/server/db/neo4j";
import { recommend } from "../src/server/graph";
import { loadGraphFromDb } from "../src/server/services/graphService";
import { ensureDataset, toGraph, transform } from "./movielens";

function arg(argv: string[], name: string): number | undefined {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? Number(a.split("=")[1]) : undefined;
}

async function main() {
  const argv = process.argv.slice(2);
  const userId = arg(argv, "user") ?? 1;
  const g = argv.includes("--db") ? await loadGraphFromDb() : toGraph(transform(await ensureDataset()));
  if (!g.hasUser(userId)) throw new Error(`Usuário ${userId} não existe no grafo.`);

  const result = recommend(g, {
    userId,
    k: arg(argv, "k"),
    neighbors: arg(argv, "neighbors"),
    minCommon: arg(argv, "min-common"),
    minSupport: arg(argv, "min-support"),
    shrinkage: arg(argv, "shrinkage"),
  });

  console.log(`\nRecomendações para o usuário ${userId} (${g.moviesOf(userId).size} filmes avaliados)`);
  console.log(`estratégia: ${result.strategy} · ${result.stats.visitedNodes} vértices visitados · ${result.stats.ms.toFixed(1)} ms\n`);
  result.recommendations.forEach((r, i) => {
    const best = r.supporters[0];
    console.log(`${String(i + 1).padStart(2)}. ${r.title} — score ${r.score.toFixed(2)} · ${r.supporters.length} vizinho(s)`);
    if (best) {
      const via = best.via.slice(0, 3).map((m) => g.title(m)).join(", ");
      console.log(`    ↳ usuário ${best.userId} (sim ${best.similarity.toFixed(2)}) deu ${best.rating}★; em comum: ${via}…`);
    }
  });
  console.log();
}

main()
  .catch((err) => {
    console.error("Erro:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDriver());
