import { NextResponse } from "next/server";
import { databaseName, getDriver, hasDatabase } from "@/server/db/neo4j";

export const dynamic = "force-dynamic";

/** GET /api/health — útil para conferir o Neo4j antes da apresentação. */
export async function GET() {
  const base = { node: process.version };
  if (!hasDatabase()) {
    return NextResponse.json({ ok: true, ...base, database: "não configurado (modo demo)" });
  }
  try {
    const info = await getDriver().getServerInfo({ database: databaseName() });
    return NextResponse.json({ ok: true, ...base, database: "neo4j", server: info.agent, address: info.address });
  } catch (err) {
    // AuraDB Free pausada ou credenciais erradas caem aqui
    return NextResponse.json({ ok: false, ...base, database: "neo4j", error: (err as Error).message }, { status: 503 });
  }
}
