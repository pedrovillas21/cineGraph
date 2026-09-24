import { NextResponse, type NextRequest } from "next/server";
import { hasDatabase } from "@/server/db/neo4j";
import { twoHopCountCypher, twoHopNeighborsCypher } from "@/server/db/graphQueries";
import { loadGraph } from "@/server/services/graphService";
import { twoHopNeighbors } from "@/server/graph";

export const dynamic = "force-dynamic";

/**
 * GET /api/graph/neighbors?userId=1&limit=20&engine=memory|cypher
 * Vizinhança de 2 saltos (u → filme → v), calculada em memória (padrão)
 * ou pelo próprio Neo4j via Cypher.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const userId = Number(params.get("userId"));
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 20), 1), 200);
  const engine = params.get("engine") === "cypher" ? "cypher" : "memory";

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "userId inválido" }, { status: 400 });
  }

  try {
    if (engine === "cypher") {
      if (!hasDatabase()) {
        return NextResponse.json({ error: "engine=cypher exige o Neo4j configurado" }, { status: 400 });
      }
      const start = performance.now();
      const [reached, neighbors] = await Promise.all([
        twoHopCountCypher(userId),
        twoHopNeighborsCypher(userId, limit),
      ]);
      const ms = performance.now() - start;
      if (!reached && !neighbors.length) {
        return NextResponse.json({ error: "userId inexistente ou sem vizinhos" }, { status: 404 });
      }
      return NextResponse.json({
        engine,
        userId,
        reached,
        neighbors: neighbors.map((n) => ({ userId: n.userId, commonMovies: n.common, via: n.via })),
        stats: { ms: Number(ms.toFixed(3)) },
      });
    }

    const { graph } = await loadGraph();
    if (!graph.hasUser(userId)) {
      return NextResponse.json({ error: "userId inexistente" }, { status: 404 });
    }
    const start = performance.now();
    const neighbors = twoHopNeighbors(graph, userId);
    const ms = performance.now() - start;

    const ranked = [...neighbors.entries()]
      .map(([id, common]) => ({ userId: id, commonMovies: common.length, via: common.slice(0, 10) }))
      .sort((a, b) => b.commonMovies - a.commonMovies || a.userId - b.userId)
      .slice(0, limit);

    return NextResponse.json({
      engine,
      userId,
      degree: graph.moviesOf(userId).size,
      reached: neighbors.size,
      neighbors: ranked,
      stats: { ms: Number(ms.toFixed(3)) },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
