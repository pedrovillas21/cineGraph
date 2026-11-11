// Testes de carga a partir da Vercel: chama /api/bench no site publicado e
// imprime as mesmas tabelas do `npm run loadtest -- --db`. Só leitura: não
// recarrega o banco, mede o grafo completo que está no ar.
//
//   npm run loadtest:remote -- --url=https://seu-projeto.vercel.app
//   --samples=10 (máx. 20 por chamada) --calls=3
//
// Usa o CRON_SECRET do .env.local, que precisa ser o mesmo configurado na Vercel.

import "./env";
import { queryTables, type BenchResult } from "../src/server/services/benchService";

function arg(argv: string[], name: string, fallback?: string): string | undefined {
  return argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
}

interface BenchResponse {
  region: string;
  node: string;
  stats: { users: number; edges: number };
  graphLoadMs: number;
  bench: BenchResult;
  error?: string;
}

async function main() {
  const argv = process.argv.slice(2);
  const url = arg(argv, "url")?.replace(/\/$/, "");
  const samples = Number(arg(argv, "samples", "10"));
  const calls = Number(arg(argv, "calls", "3"));
  const secret = process.env.CRON_SECRET;
  if (!url) throw new Error("Informe --url=https://seu-projeto.vercel.app");
  if (!secret) throw new Error("CRON_SECRET ausente no .env.local (precisa ser o mesmo da Vercel).");

  // Várias chamadas pequenas em vez de uma grande: cada função da Vercel tem limite de tempo
  const merged: BenchResult = { ms: {}, serverMs: {}, mismatches: {}, reachPct: [] };
  let last: BenchResponse | undefined;
  for (let i = 0; i < calls; i++) {
    const res = await fetch(`${url}/api/bench?samples=${samples}`, { headers: { authorization: `Bearer ${secret}` } });
    if (!res.headers.get("content-type")?.includes("json")) {
      throw new Error(`HTTP ${res.status} sem JSON: o deploy em ${url} tem a rota /api/bench? (ela só existe após o push desta versão)`);
    }
    const body = (await res.json()) as BenchResponse;
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.error}`);
    console.log(`  chamada ${i + 1}/${calls}: região ${body.region}, grafo carregado em ${Math.round(body.graphLoadMs)} ms`);
    for (const bag of ["ms", "serverMs"] as const) {
      for (const [k, v] of Object.entries(body.bench[bag])) (merged[bag][k] ??= []).push(...v);
    }
    for (const [k, v] of Object.entries(body.bench.mismatches)) merged.mismatches[k] = (merged.mismatches[k] ?? 0) + v;
    merged.reachPct.push(...body.bench.reachPct);
    last = body;
  }

  console.log(
    `\nMedido em ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · Vercel região ${last!.region} · Node ${last!.node} · ` +
      `${last!.stats.users} usuários, ${last!.stats.edges} arestas · ${calls} × ${samples} usuários · mediana / p95 em ms\n`,
  );
  console.log(queryTables([{ label: `Vercel (${last!.region})`, bench: merged }]));
  console.log();
}

main().catch((err) => {
  console.error("\nErro:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
