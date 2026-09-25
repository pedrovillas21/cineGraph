import Link from "next/link";
import type { MovieCard as MovieCardData, RecommendationCard } from "@/server/services/catalogService";
import { GrowBar, Pop } from "./motion";
import { Poster } from "./Poster";
import { Rail } from "./Rail";

type Props = {
  movie: MovieCardData & Partial<Pick<RecommendationCard, "match" | "people" | "because">> & { rating?: number };
  profileId?: number;
};

export function MovieCard({ movie, profileId }: Props) {
  const href = `/filme/${movie.movieId}${profileId !== undefined ? `?perfil=${profileId}` : ""}`;
  return (
    <Link
      href={href}
      className="group block min-w-0 rounded-lg outline-none transition-transform duration-500 ease-spring hover:-translate-y-1.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background active:scale-[0.98]"
    >
      <div className="relative overflow-hidden rounded-lg shadow-sm ring-1 ring-border transition-shadow duration-300 ease-out-soft group-hover:shadow-[0_22px_44px_-20px_rgb(0_0_0/0.55)]">
        <Poster
          url={movie.posterUrl}
          title={movie.title}
          className="transition-transform duration-700 ease-out-soft group-hover:scale-[1.06]"
        />
        {movie.match !== undefined && (
          <Pop delay={0.35} className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-semibold text-emerald-300">
            {movie.match}% pra você
          </Pop>
        )}
        {movie.rating !== undefined && (
          <Pop delay={0.35} className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-semibold text-amber-300">
            ★ {movie.rating.toLocaleString("pt-BR")}
          </Pop>
        )}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between bg-neutral-950/90 px-3 py-2.5 text-xs font-medium text-neutral-100 transition-transform duration-400 ease-out-soft group-hover:translate-y-0 group-focus-visible:translate-y-0"
        >
          {movie.match !== undefined ? "Por que este?" : "Ver detalhes"}
          <span className="transition-transform duration-500 ease-spring group-hover:translate-x-0.5">→</span>
        </span>
      </div>
      <h3 className="mt-2.5 line-clamp-2 text-sm font-medium leading-snug transition-colors duration-200 group-hover:text-accent">{movie.title}</h3>
      <p className="text-xs text-muted">
        {[movie.year, ...movie.genres].filter(Boolean).join(" · ")}
      </p>
      {movie.match !== undefined && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
          <GrowBar percent={movie.match} className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400" />
        </div>
      )}
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
