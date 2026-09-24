import { NextResponse, type NextRequest } from "next/server";
import { cypher, hasDatabase } from "@/server/db/neo4j";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/keepalive — chamado 1x por dia pelo Vercel Cron (vercel.json).
 * O AuraDB Free pausa após 3 dias sem uso; uma escrita mínima mantém a
 * instância ativa até as apresentações.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ ok: true, skipped: "Neo4j não configurado" });
  }
  try {
    const [row] = await cypher<{ at: string }>(
      "MERGE (h:__Heartbeat {id: 1}) SET h.at = datetime() RETURN toString(h.at) AS at",
      {},
      "write",
    );
    return NextResponse.json({ ok: true, at: row?.at });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 503 });
  }
}
