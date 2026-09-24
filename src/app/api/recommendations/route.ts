import { NextResponse, type NextRequest } from "next/server";
import { recommend } from "@/server/graph";
import { loadGraph } from "@/server/services/graphService";

export const dynamic = "force-dynamic";

/**
 * GET /api/recommendations?userId=1&k=10&neighbors=30&minCommon=3&minSupport=2&shrinkage=2
 * Contrato RecommendationResult (docs/02-algoritmo.md).
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const num = (name: string) => (p.has(name) ? Number(p.get(name)) : undefined);
  const userId = Number(p.get("userId"));
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "userId inválido" }, { status: 400 });
  }

  try {
    const { graph } = await loadGraph();
    if (!graph.hasUser(userId)) {
      return NextResponse.json({ error: "userId inexistente" }, { status: 404 });
    }
    const result = recommend(graph, {
      userId,
      k: Math.min(num("k") ?? 10, 100),
      neighbors: num("neighbors"),
      minCommon: num("minCommon"),
      minSupport: num("minSupport"),
      shrinkage: num("shrinkage"),
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
