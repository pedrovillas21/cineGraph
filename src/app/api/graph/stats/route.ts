import { NextResponse } from "next/server";
import { loadGraph } from "@/server/services/graphService";
import { graphStats, topMoviesByDegree } from "@/server/graph";

export const dynamic = "force-dynamic";

/** GET /api/graph/stats — tamanho do grafo e filmes de maior grau. */
export async function GET() {
  try {
    const { graph, source, loadMs, error } = await loadGraph();
    return NextResponse.json({
      source,
      ...(error && { databaseError: error }),
      loadMs: Math.round(loadMs),
      stats: graphStats(graph),
      topMovies: topMoviesByDegree(graph, 10),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
