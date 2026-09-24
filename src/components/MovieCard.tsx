import Link from "next/link";
import type { MovieCard as MovieCardData, RecommendationCard } from "@/server/services/catalogService";
import { Poster } from "./Poster";
import { Rail } from "./Rail";

type Props = {
  movie: MovieCardData & Partial<Pick<RecommendationCard, "match" | "people" | "because">> & { rating?: number };
  profileId?: number;
};

export function MovieCard({ movie, profileId }: Props) {
  const href = `/filme/${movie.movieId}${profileId !== undefined ? `?perfil=${profileId}` : ""}`;
  return (
    <Link href={href} className="group block min-w-0">
      <div className="relative overflow-hidden rounded-lg shadow-sm ring-1 ring-border transition group-hover:-translate-y-1 group-hover:shadow-lg">
        <Poster url={movie.posterUrl} title={movie.title} />
        {movie.match !== undefined && (
          <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-semibold text-emerald-300 backdrop-blur">
            {movie.match}% pra você
          </span>
        )}
        {movie.rating !== undefined && (
          <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-semibold text-amber-300 backdrop-blur">
            ★ {movie.rating.toLocaleString("pt-BR")}
          </span>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:text-accent">{movie.title}</h3>
      <p className="text-xs text-muted">
        {[movie.year, ...movie.genres].filter(Boolean).join(" · ")}
      </p>
      {movie.because && movie.because.length > 0 ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted">
          Para quem amou <span className="text-foreground">{movie.because.join(" e ")}</span>
        </p>
      ) : movie.people ? (
        <p className="mt-1 text-xs text-muted">
          {movie.people} {movie.people === 1 ? "pessoa parecida com você amou" : "pessoas parecidas com você amaram"}
        </p>
      ) : null}
    </Link>
  );
}

export function MovieGrid({ children }: { children: React.ReactNode }) {
  return <Rail grid="sm:grid-cols-4 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-6">{children}</Rail>;
}
