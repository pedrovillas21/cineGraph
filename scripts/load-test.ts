// Testes de carga (checkpoint 4): tempo de carga e de consulta com subgrafos de
// 100, 300 e 602 usuários, comparando a travessia em memória (TS puro) com a
// mesma travessia feita pelo Neo4j (Cypher). Relatório em docs/06-testes-de-carga.md.
//
//   npm run loadtest                      só em memória (grafo lido dos CSVs, sem banco)
//   npm run loadtest -- --db              também no Neo4j: recarrega o banco com cada
//                                         subgrafo (ETL --reset --max-users=N) e, no fim,
//                                         restaura o grafo completo
//   --sizes=100,300,602 --samples=30 --runs=3

import "./env";
import { spawnSync } from "node:child_process";
import { closeDriver } from "../src/server/db/neo4j";
import { graphStats } from "../src/server/graph";
import { benchQueries, queryTables, sampleUsers, stat, type BenchResult } from "../src/server/services/benchService";
import { loadGraphFromDb } from "../src/server/services/graphService";
import { ensureDataset, toGraph, transform } from "./movielens";

function arg(argv: string[], name: string, fallback: string): string {
  return argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
}

/** Roda o ETL num processo separado e devolve o tempo que ele mesmo mede. */
function runEtl(extra: string[]): number {
  const res = spawnSync(process.execPath, ["--import", "tsx", "scripts/etl-movielens.ts", "--reset", ...extra], {
    encoding: "utf8",
  });
  const secs = res.stdout.match(/Concluído em ([\d.]+)s/)?.[1];
  if (res.status !== 0 || !secs) throw new Error(`ETL falhou (${extra.join(" ")}):\n${res.stdout}\n${res.stderr}`);
  return Number(secs) * 1000;
}

interface Row {
  users: number;
  movies: number;
  edges: number;
  buildMs: number;
  etlMs?: number;
  loadDbMs?: number[];
  bench: BenchResult;
}

const fmt = (ms: number) => (ms >= 100 ? ms.toFixed(0) : ms.toFixed(1));

async function measure(size: number, opts: { db: boolean; samples: number; runs: number }): Promise<Row> {
  const data = transform(await ensureDataset(), { minMovieRatings: 5, minUserRatings: 20, maxUsers: size });
  const start = performance.now();
  const g = toGraph(data);
  const buildMs = performance.now() - start;
  const { users, movies, edges } = graphStats(g);

  let etlMs: number | undefined;
  let loadDbMs: number[] | undefined;
  if (opts.db) {
    console.log(`  ETL no Neo4j (--reset --max-users=${size}) ...`);
    etlMs = runEtl([`--max-users=${size}`]);
    loadDbMs = [];
    for (let i = 0; i < opts.runs; i++) {
      const t = performance.now();
      const loaded = await loadGraphFromDb();
      loadDbMs.push(performance.now() - t);
      if (graphStats(loaded).edges !== edges) throw new Error("Grafo lido do Neo4j difere do subgrafo esperado.");
    }
  }
  const picked = sampleUsers(data.users.map((u) => u.id), opts.samples);
  const bench = await benchQueries(g, picked, { db: opts.db });
  return { users, movies, edges, buildMs, etlMs, loadDbMs, bench };
}

function report(rows: Row[], samples: number): string {
  return [
    `Medido em ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · Node ${process.version} · ${samples} usuários por tamanho · mediana / p95 em ms`,
    "",
    "| Usuários | Filmes | Arestas | Montar grafo (CSV) | ETL no Neo4j | Carga do Neo4j (app) |",
    "|---:|---:|---:|---:|---:|---:|",
    ...rows.map(
      (r) =>
        `| ${r.users} | ${r.movies} | ${r.edges} | ${fmt(r.buildMs)} | ${r.etlMs ? fmt(r.etlMs) : "—"} | ${stat(r.loadDbMs)} |`,
    ),
    "",
    queryTables(rows.map((r) => ({ label: `${r.users} usuários`, bench: r.bench }))),
  ].join("\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = {
    db: argv.includes("--db"),
    samples: Number(arg(argv, "samples", "30")),
    runs: Number(arg(argv, "runs", "3")),
  };
  const sizes = arg(argv, "sizes", "100,300,602").split(",").map(Number).sort((a, b) => a - b);

  const rows: Row[] = [];
  try {
    for (const size of sizes) {
      console.log(`\nSubgrafo com ${size} usuários`);
      rows.push(await measure(size, opts));
    }
  } finally {
    // O site lê este mesmo banco: volta sempre para o grafo completo
    if (opts.db) {
      console.log("\nRestaurando o grafo completo no Neo4j ...");
      runEtl([]);
    }
  }
  console.log(`\n${report(rows, opts.samples)}\n`);
}

main()
  .catch((err) => {
    console.error("\nErro no teste de carga:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDriver());
