import { NextResponse, type NextRequest } from "next/server";
import { hasDatabase } from "@/server/db/neo4j";
import { graphStats } from "@/server/graph";
import { benchQueries, sampleUsers } from "@/server/services/benchService";
import { loadGraph } from "@/server/services/graphService";

export const dynamic = "force-dynamic";
// ~0,5 s por consulta Cypher: 10 usuários × 4 consultas cabem com folga em 60 s
export const maxDuration = 60;

/**
 * GET /api/bench?samples=10 — as mesmas medições do `npm run loadtest -- --db`,
 * mas rodando dentro da Vercel (latência real entre o servidor e o AuraDB).
 * Só leitura. Protegida pelo CRON_SECRET para não ser chamada por qualquer um;
 * sem o segredo configurado, a rota não existe. Use `npm run loadtest:remote`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!hasDatabase()) return NextResponse.json({ error: "Neo4j não configurado" }, { status: 400 });

  const samples = Math.min(Math.max(Number(req.nextUrl.searchParams.get("samples") ?? 10), 2), 20);
  try {
    const { graph, source, loadMs, error } = await loadGraph();
    if (source !== "neo4j") return NextResponse.json({ error: `grafo de exemplo em uso: ${error}` }, { status: 503 });
    const users = sampleUsers([...graph.userIds()].sort((a, b) => a - b), samples);
    const bench = await benchQueries(graph, users, { db: true });
    return NextResponse.json({
      region: process.env.VERCEL_REGION ?? "local",
      node: process.version,
      stats: graphStats(graph),
      graphLoadMs: loadMs,
      samples,
      bench,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
