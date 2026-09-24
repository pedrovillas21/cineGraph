import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { DemoNotice } from "@/components/DemoNotice";
import { MovieCard, MovieGrid } from "@/components/MovieCard";
import { Poster } from "@/components/Poster";
import { Section } from "@/components/Section";
import { SiteFooter } from "@/components/SiteFooter";
import { getMovie } from "@/server/services/catalogService";

export const dynamic = "force-dynamic";

const nf = (n: number, digits = 1) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function duration(min: number | null) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  return h ? `${h}h ${String(min % 60).padStart(2, "0")}min` : `${min}min`;
}

export default async function MoviePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ perfil?: string }>;
}) {
  const [{ id }, { perfil }] = await Promise.all([params, searchParams]);
  const profileId = perfil !== undefined && Number.isInteger(Number(perfil)) ? Number(perfil) : undefined;
  const data = await getMovie(Number(id), profileId);
  if (!data) notFound();
  const { movie, viewer } = data;

  return (
    <main>
      <DemoNotice dbError={data.dbError} />

      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        {movie.backdropUrl && (
          <Image
            src={movie.backdropUrl}
            alt=""
            fill
            priority
            className="-z-10 object-cover opacity-40"
            sizes="100vw"
          />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-neutral-950 via-neutral-950/85 to-neutral-950/30" />

        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:px-6 sm:py-14">
          <div className="w-40 shrink-0 sm:w-56">
            <Poster url={movie.posterUrl} title={movie.title} className="shadow-2xl" priority />
          </div>

          <div className="min-w-0 flex-1">
            {viewer && (
              <Link href={`/perfil/${viewer.profile.id}`} className="text-sm text-neutral-300 hover:text-white">
                ← Voltar para {viewer.profile.name}
              </Link>
            )}
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{movie.title}</h1>
            {movie.originalTitle && <p className="text-neutral-400">{movie.originalTitle}</p>}

            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-neutral-300">
              {movie.year && <span>{movie.year}</span>}
              {duration(movie.runtime) && <span>{duration(movie.runtime)}</span>}
              {movie.allGenres.map((g) => (
                <span key={g} className="rounded-full border border-white/20 px-2.5 py-0.5">
                  {g}
                </span>
              ))}
            </p>

            <div className="mt-5 flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-semibold text-amber-300">★ {nf(movie.audienceScore)}</p>
                <p className="text-xs text-neutral-400">média de {movie.audienceCount} avaliações</p>
              </div>
              {movie.tmdbScore !== null && movie.tmdbScore > 0 && (
                <div>
                  <p className="text-2xl font-semibold">{nf(movie.tmdbScore)}</p>
                  <p className="text-xs text-neutral-400">nota no TMDB (0 a 10)</p>
                </div>
              )}
              {viewer?.rating != null && (
                <div>
                  <p className="text-2xl font-semibold text-emerald-300">★ {nf(viewer.rating)}</p>
                  <p className="text-xs text-neutral-400">sua nota</p>
                </div>
              )}
              {viewer?.why && (
                <div>
                  <p className="text-2xl font-semibold text-emerald-300">{viewer.why.match}%</p>
                  <p className="text-xs text-neutral-400">combina com você</p>
                </div>
              )}
            </div>

            {movie.overview && <p className="mt-6 max-w-2xl leading-relaxed text-neutral-200">{movie.overview}</p>}
          </div>
        </div>
      </section>

      {viewer?.why && viewer.why.people.length > 0 && (
        <Section
          title={`Por que indicamos para ${viewer.profile.name}`}
          subtitle="Pessoas com gosto parecido com o seu viram este filme e gostaram."
        >
          <ul className="grid gap-4 md:grid-cols-3">
            {viewer.why.people.map(({ profile, rating, bothLoved }) => (
              <li key={profile.id} className="rounded-xl border border-border bg-surface p-4">
                <Link href={`/perfil/${profile.id}`} className="flex items-center gap-3 hover:text-accent">
                  <Avatar initials={profile.initials} hue={profile.hue} size={40} />
                  <div>
                    <p className="font-semibold">{profile.name}</p>
                    <p className="text-sm text-amber-500">deu ★ {nf(rating)} para este filme</p>
                  </div>
                </Link>
                {bothLoved.length > 0 && (
                  <p className="mt-3 text-sm text-muted">
                    Vocês dois amaram <span className="text-foreground">{bothLoved.join(", ")}</span>.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.related.length > 0 && (
        <Section title="Quem amou este filme também amou">
          <MovieGrid>
            {data.related.map((m) => (
              <MovieCard key={m.movieId} movie={m} profileId={viewer?.profile.id} />
            ))}
          </MovieGrid>
        </Section>
      )}

      <SiteFooter hasTmdb={data.hasTmdb} />
    </main>
  );
}
