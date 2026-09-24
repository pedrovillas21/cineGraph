// "Hello graph": prova de que o ambiente e o núcleo do grafo funcionam.
//
//   npm run graph:hello              grafo de exemplo em memória (não precisa de banco)
//   npm run graph:hello -- --csv     MovieLens lido direto de data/raw (sem banco)
//   npm run graph:hello -- --db      grafo do Neo4j + comparação memória × Cypher
//   npm run graph:hello -- --user=1  escolhe o usuário de origem

import "./env";
import { closeDriver } from "../src/server/db/neo4j";
import { twoHopCountCypher, twoHopNeighborsCypher } from "../src/server/db/graphQueries";
import { loadGraphFromDb } from "../src/server/services/graphService";
import { ensureDataset, toGraph, transform } from "./movielens";
import {
  buildFixtureGraph,
  fixtureUserNames,
  graphStats,
  parseKey,
  shortestPath,
  topMoviesByDegree,
  twoHopNeighbors,
  userKey,
  type Graph,
  type NodeKey,
} from "../src/server/graph";

function label(g: Graph, key: NodeKey, real: boolean): string {
  const { kind, id } = parseKey(key);
  if (kind === "movie") return `🎬 ${g.title(id)}`;
  return `👤 ${real ? `usuário ${id}` : (fixtureUserNames[id] ?? id)}`;
}

async function main() {
  const argv = process.argv.slice(2);
  const source = argv.includes("--db") ? "Neo4j" : argv.includes("--csv") ? "MovieLens CSV" : "grafo de exemplo";
  const real = source !== "grafo de exemplo"; // dados reais → usuários sem nome
  const userArg = argv.find((a) => a.startsWith("--user="));

  const t0 = performance.now();
  const g =
    source === "Neo4j"
      ? await loadGraphFromDb()
      : source === "MovieLens CSV"
        ? toGraph(transform(await ensureDataset()))
        : buildFixtureGraph();
  const loadMs = performance.now() - t0;

  console.log(`\n=== CineGraph · hello graph (${source}) ===`);
  console.log(`Node ${process.version} · carregado em ${loadMs.toFixed(0)} ms\n`);

  const s = graphStats(g);
  console.log(`Vértices: ${s.users} usuários + ${s.movies} filmes = ${s.users + s.movies}`);
  console.log(`Arestas (avaliações): ${s.edges}`);
  console.log(`Grau médio: usuário ${s.avgUserDegree.toFixed(1)} · filme ${s.avgMovieDegree.toFixed(1)}\n`);

  console.log("Filmes mais populares (maior grau):");
  for (const m of topMoviesByDegree(g, 5)) {
    console.log(`  ${String(m.degree).padStart(4)} avaliações · média ${m.avgRating.toFixed(2)} · ${m.title}`);
  }

  const userId = userArg ? Number(userArg.split("=")[1]) : [...g.userIds()][0];
  if (!g.hasUser(userId)) throw new Error(`Usuário ${userId} não existe no grafo.`);

  const t1 = performance.now();
  const neighbors = twoHopNeighbors(g, userId);
  const hopMs = performance.now() - t1;
  const ranked = [...neighbors.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 5);

  console.log(`\nVizinhança de 2 saltos de ${label(g, userKey(userId), real)} (u → filme → v):`);
  console.log(`  memória: ${neighbors.size} usuários alcançados em ${hopMs.toFixed(2)} ms`);

  if (source === "Neo4j") {
    const t2 = performance.now();
    const [reached, top] = await Promise.all([twoHopCountCypher(userId), twoHopNeighborsCypher(userId, 5)]);
    const cypherMs = performance.now() - t2;
    console.log(`  Cypher : ${reached} usuários alcançados em ${cypherMs.toFixed(2)} ms (inclui ida e volta na rede)`);
    if (reached !== neighbors.size) console.warn("  ⚠ memória e Cypher divergem!");
    console.log(`  top Cypher: ${top.map((n) => `${n.userId} (${n.common})`).join(", ")}`);
  }

  for (const [other, common] of ranked) {
    console.log(`  ${label(g, userKey(other), real)} · ${common.length} filme(s) em comum`);
  }

  const far = [...g.userIds()].find((u) => u !== userId && !neighbors.has(u));
  if (far !== undefined) {
    const path = shortestPath(g, userKey(userId), userKey(far));
    console.log(`\nCaminho mínimo até ${label(g, userKey(far), real)} (BFS):`);
    console.log(`  ${path ? path.map((k) => label(g, k, real)).join(" → ") : "sem caminho"}`);
  }
  console.log();
}

main()
  .catch((err) => {
    console.error("Erro:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDriver());
