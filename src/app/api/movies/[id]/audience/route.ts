import { NextResponse, type NextRequest } from "next/server";
import { getMovieAudience } from "@/server/services/catalogService";

export const dynamic = "force-dynamic";

/** GET /api/movies/2571/audience → as pessoas que mais combinam com o filme. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const movieId = Number((await params).id);
  if (!Number.isInteger(movieId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  try {
    const audience = await getMovieAudience(movieId);
    if (!audience) return NextResponse.json({ error: "filme inexistente" }, { status: 404 });
    return NextResponse.json(audience);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
