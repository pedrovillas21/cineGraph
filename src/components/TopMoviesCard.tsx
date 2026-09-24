import type { RankedMovieView } from "@/server/services/dashboardService";
import { fmt } from "./format";
import { Poster } from "./Poster";

export function TopMoviesCard({ movies }: { movies: RankedMovieView[] }) {
  const maxDegree = movies[0]?.degree ?? 1;
  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold">Filmes mais populares</h2>
      <p className="mb-4 text-sm text-muted">Grau do vértice-filme = nº de avaliações.</p>
      <ol className="space-y-3">
        {movies.map((m) => (
          <li key={m.movieId} className="flex items-center gap-3" title={m.overview ?? undefined}>
            <Poster url={m.posterUrl} title={m.title} width={32} />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate">
                  {m.title}
                  {m.year && <span className="text-muted"> ({m.year})</span>}
                </span>
                <span className="shrink-0 tabular-nums text-muted">{fmt.format(m.degree)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded bg-border">
                <div className="h-1.5 rounded bg-movie" style={{ width: `${(m.degree / maxDegree) * 100}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
