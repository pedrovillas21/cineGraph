import { NextResponse, type NextRequest } from "next/server";
import { hasDatabase } from "@/server/db/neo4j";
import { shortestPathCypher } from "@/server/db/graphQueries";
import { pathSteps, shortestPath, userKey, type NodeKey } from "@/server/graph";
import { loadGraph } from "@/server/services/graphService";

export const dynamic = "force-dynamic";

/**
 * GET /api/graph/path?from=1&to=2&engine=memory|cypher
 * Caminho mínimo (BFS) entre dois usuários: a "afinidade" estrutural.
 * O comprimento é sempre par (usuário → filme → usuário …).
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const from = Number(p.get("from"));
  const to = Number(p.get("to"));
  const engine = p.get("engine") === "cypher" ? "cypher" : "memory";
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return NextResponse.json({ error: "from e to devem ser ids de usuário" }, { status: 400 });
  }
  if (engine === "cypher" && !hasDatabase()) {
    return NextResponse.json({ error: "engine=cypher exige o Neo4j configurado" }, { status: 400 });
  }

  try {
    const { graph } = await loadGraph();
    if (!graph.hasUser(from) || !graph.hasUser(to)) {
      return NextResponse.json({ error: "usuário inexistente" }, { status: 404 });
    }
    const start = performance.now();
    const path =
      engine === "cypher"
        ? ((await shortestPathCypher(from, to)) as NodeKey[] | null)
        : shortestPath(graph, userKey(from), userKey(to));
    const ms = performance.now() - start;
    if (!path) return NextResponse.json({ engine, from, to, length: null, path: [], stats: { ms } });

    return NextResponse.json({
      engine,
      from,
      to,
      length: path.length - 1,
      path: pathSteps(graph, path).map((s) => ({
        ...s,
        label: s.kind === "user" ? `Usuário ${s.id}` : graph.title(s.id),
      })),
      stats: { ms: Number(ms.toFixed(3)) },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
