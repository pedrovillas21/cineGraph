import Image from "next/image";
import { DemoNotice } from "@/components/DemoNotice";
import { MovieCard, MovieGrid } from "@/components/MovieCard";
import { ProfileCard } from "@/components/ProfileCard";
import { Rail } from "@/components/Rail";
import { Section } from "@/components/Section";
import { SiteFooter } from "@/components/SiteFooter";
import { getHome } from "@/server/services/catalogService";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getHome();
  const collage = data.popular.filter((m) => m.posterUrl).slice(0, 12);

  return (
    <main>
      <DemoNotice dbError={data.dbError} />

      {/* Destaque com colagem de pôsteres ao fundo */}
      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        <div aria-hidden className="absolute inset-0 -z-10 grid grid-cols-4 gap-2 opacity-35 sm:grid-cols-6">
          {collage.map((m) => (
            <Image
              key={m.movieId}
              src={m.posterUrl!}
              alt=""
              width={342}
              height={513}
              priority
              className="aspect-[2/3] h-auto w-full object-cover"
            />
          ))}
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-neutral-950/40" />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-28">
          <p className="text-sm font-medium uppercase tracking-widest text-orange-300">CineGraph</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Descubra o próximo filme que você vai amar.
          </h1>
          <p className="mt-3 max-w-xl text-neutral-300 sm:mt-4 sm:text-lg">
            Indicamos filmes a partir do gosto de pessoas parecidas com você, e mostramos o porquê de cada indicação.
          </p>
          <a
            href="#perfis"
            className="mt-6 inline-flex sm:mt-8 items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-white shadow-lg transition hover:brightness-110"
          >
            Escolher um perfil <span aria-hidden>↓</span>
          </a>
        </div>
      </section>

      <Section
        id="perfis"
        title="Quem está assistindo?"
        subtitle="Cada perfil é uma pessoa real que avaliou filmes. Escolha um para ver as indicações dele."
      >
        <Rail size="card" grid="sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {data.featured.map((p) => (
            <ProfileCard key={p.id} profile={p} />
          ))}
        </Rail>

        <form action="/perfil" className="mt-4 flex sm:mt-6 flex-wrap items-center gap-3 text-sm">
          <label htmlFor="perfil-id" className="text-muted">
            Ou abra qualquer perfil pelo número:
          </label>
          <input
            id="perfil-id"
            name="id"
            type="number"
            min={data.profileRange.min}
            max={data.profileRange.max}
            placeholder={`${data.profileRange.min} a ${data.profileRange.max}`}
            required
            className="w-36 rounded-full border border-border bg-surface px-4 py-2"
          />
          <button className="rounded-full border border-border bg-surface px-4 py-2 font-medium hover:border-accent hover:text-accent">
            Abrir perfil
          </button>
        </form>
      </Section>

      <Section title="Os favoritos do público" subtitle="Os filmes mais avaliados por todos os perfis.">
        <MovieGrid>
          {data.popular.map((m) => (
            <MovieCard key={m.movieId} movie={m} />
          ))}
        </MovieGrid>
      </Section>

      <SiteFooter hasTmdb={data.hasTmdb} />
    </main>
  );
}
