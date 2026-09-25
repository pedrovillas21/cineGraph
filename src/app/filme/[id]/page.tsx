import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { DemoNotice } from "@/components/DemoNotice";
import { MovieCard, MovieGrid } from "@/components/MovieCard";
import { Poster } from "@/components/Poster";
import { Rail } from "@/components/Rail";
import { CountUp, GrowBar, Pop, Reveal, WordReveal } from "@/components/motion";
import { Section } from "@/components/Section";
import { SiteFooter } from "@/components/SiteFooter";
import { getMoviePage } from "@/server/services/pageData";

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
  const data = await getMoviePage(Number(id), profileId);
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
            className="-z-10 animate-settle object-cover opacity-40"
            sizes="100vw"
          />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-neutral-950 via-neutral-950/85 to-neutral-950/30" />

        {/* No celular o pôster fica ao lado do título e notas/sinopse ocupam a largura toda. */}
        <div className="mx-auto grid max-w-6xl grid-cols-[7rem_minmax(0,1fr)] items-start gap-x-4 gap-y-5 px-4 py-6 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-x-8 sm:px-6 sm:py-14">
          <Reveal onMount delay={0.1} className="sm:row-span-2">
            <Poster url={movie.posterUrl} title={movie.title} className="shadow-2xl" priority />
          </Reveal>

          <div className="min-w-0">
            {viewer && (
              <Link
                href={`/perfil/${viewer.profile.id}`}
                className="group inline-flex items-center gap-1.5 text-sm text-neutral-300 transition-colors hover:text-white"
              >
                <span aria-hidden className="transition-transform duration-500 ease-spring group-hover:-translate-x-1">
                  ←
                </span>
                Voltar para {viewer.profile.name}
              </Link>
            )}
            <WordReveal text={movie.title} className="mt-2 text-2xl font-bold tracking-tight sm:text-5xl" />
            {movie.originalTitle && (
              <Reveal onMount delay={0.3}>
                <p className="text-sm text-neutral-400 sm:text-base">{movie.originalTitle}</p>
              </Reveal>
            )}

            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-neutral-300">
              {movie.year && <span>{movie.year}</span>}
              {duration(movie.runtime) && <span>{duration(movie.runtime)}</span>}
              {movie.allGenres.map((g, i) => (
                <Pop key={g} delay={0.35 + i * 0.06} className="rounded-full border border-white/20 px-2.5 py-0.5">
                  {g}
                </Pop>
              ))}
            </p>
          </div>

          <Reveal onMount delay={0.45} className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2">
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <div>
                <p className="text-2xl font-semibold text-amber-300">
                  ★ <CountUp value={movie.audienceScore} decimals={1} />
                </p>
                <p className="text-xs text-neutral-400">média de {movie.audienceCount} avaliações</p>
              </div>
              {movie.tmdbScore !== null && movie.tmdbScore > 0 && (
                <div>
                  <p className="text-2xl font-semibold">
                    <CountUp value={movie.tmdbScore} decimals={1} />
                  </p>
                  <p className="text-xs text-neutral-400">nota no TMDB (0 a 10)</p>
                </div>
              )}
              {viewer?.rating != null && (
                <div>
                  <p className="text-2xl font-semibold text-emerald-300">
                    ★ <CountUp value={viewer.rating} decimals={1} />
                  </p>
                  <p className="text-xs text-neutral-400">sua nota</p>
                </div>
              )}
              {viewer?.why && (
                <div>
                  <p className="text-2xl font-semibold text-emerald-300">
                    <CountUp value={viewer.why.match} suffix="%" />
                  </p>
                  <p className="text-xs text-neutral-400">combina com você</p>
                  <div className="mt-1.5 h-1 w-28 overflow-hidden rounded-full bg-white/15">
                    <GrowBar percent={viewer.why.match} delay={0.5} className="h-full rounded-full bg-emerald-300" />
                  </div>
                </div>
              )}
            </div>

            {movie.overview && (
              <p className="mt-5 max-w-2xl leading-relaxed text-neutral-200 sm:mt-6">{movie.overview}</p>
            )}
          </Reveal>
        </div>
      </section>

      {viewer?.why && viewer.why.people.length > 0 && (
        <Section
          title={`Por que indicamos para ${viewer.profile.name}`}
          subtitle="Pessoas com gosto parecido com o seu viram este filme e gostaram."
        >
          <Rail as="ul" size="card" grid="sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
            {viewer.why.people.map(({ profile, rating, bothLoved }) => (
              <div
                key={profile.id}
                className="group h-full rounded-2xl border border-border bg-surface p-4 transition-[transform,box-shadow,border-color] duration-500 ease-spring hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.35)]"
              >
                <Link href={`/perfil/${profile.id}`} className="flex items-center gap-3 transition-colors group-hover:text-accent">
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
              </div>
            ))}
          </Rail>
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
