import { NextResponse, type NextRequest } from "next/server";
import { searchMovies } from "@/server/services/catalogService";

export const dynamic = "force-dynamic";

/** GET /api/movies/search?q=matr → até 8 filmes cujo título combina com o texto (autocomplete). */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    return NextResponse.json({ results: await searchMovies(q.slice(0, 80)) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
