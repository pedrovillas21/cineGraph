import Image from "next/image";
import Link from "next/link";
import { DemoNotice } from "@/components/DemoNotice";
import { MovieCard, MovieGrid } from "@/components/MovieCard";
import { ProfileCard } from "@/components/ProfileCard";
import { Rail } from "@/components/Rail";
import { GraphDemo, Reveal, WordReveal } from "@/components/motion";
import { Section } from "@/components/Section";
import { SiteFooter } from "@/components/SiteFooter";
import { getHomePage } from "@/server/services/pageData";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getHomePage();
  // A colagem fica a 35% de opacidade ao fundo: a versão pequena do pôster (w185) basta.
  const collage = data.popular
    .flatMap((m) => (m.posterUrl ? [m.posterUrl.replace("/w342/", "/w185/")] : []))
    .slice(0, 12);
  // Colunas de pôsteres que deslizam devagar (cada uma repetida para o loop não ter emenda).
  const columns = collage.length
    ? Array.from({ length: 6 }, (_, c) => {
        const four = Array.from({ length: 4 }, (_, k) => collage[(c * 5 + k * 3) % collage.length]);
        return [...four, ...four];
      })
    : [];
  const titles = data.popular.map((m) => m.title);

  return (
    <main>
      <DemoNotice dbError={data.dbError} />

      {/* Destaque: colagem de pôsteres deslizando ao fundo e o grafo se desenhando ao lado */}
      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        {columns.length > 0 && (
          <div
            aria-hidden
            className="absolute -inset-x-10 -inset-y-20 -z-10 grid rotate-[-6deg] grid-cols-4 gap-2 opacity-35 sm:grid-cols-6 sm:gap-3"
          >
            {columns.map((col, c) => (
              <div
                key={c}
                className={`flex flex-col gap-2 will-change-transform sm:gap-3 ${c % 2 ? "animate-drift-down" : "animate-drift-up"} ${c >= 4 ? "hidden sm:flex" : ""}`}
                style={{ animationDuration: `${80 + c * 9}s` }}
              >
                {col.map((url, i) => (
                  <Image
                    key={i}
                    src={url}
                    alt=""
                    width={185}
                    height={278}
                    // Decorativa: carrega sem disputar banda com os pôsteres de verdade.
                    fetchPriority="low"
                    decoding="async"
                    loading={i < 3 ? "eager" : "lazy"}
                    className="aspect-[2/3] h-auto w-full rounded-lg bg-neutral-800 object-cover"
                  />
                ))}
              </div>
            ))}
          </div>
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-neutral-950/40 lg:bg-gradient-to-r lg:via-neutral-950/90" />

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div>
            <Reveal onMount>
              <p className="flex items-center gap-3 text-sm font-medium uppercase tracking-widest text-orange-300">
                <span aria-hidden className="h-px w-7 bg-orange-300" />
                CineGraph
              </p>
            </Reveal>
            <WordReveal
              text="Descubra o próximo filme que você"
              accent="vai amar."
              accentClassName="text-orange-300"
              className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-6xl sm:leading-[1.05]"
            />
            <Reveal onMount delay={0.55}>
              <p className="mt-3 max-w-xl text-neutral-300 sm:mt-5 sm:text-lg">
                Indicamos filmes a partir do gosto de pessoas parecidas com você, e mostramos o porquê de cada indicação.
              </p>
            </Reveal>
            <Reveal onMount delay={0.7} className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
              <a
                href="#perfis"
                className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-white shadow-lg transition-[transform,box-shadow] duration-500 ease-spring hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_16px_36px_-12px_rgb(194_65_45/0.75)] active:scale-[0.97]"
              >
                Escolher um perfil <span aria-hidden className="inline-block animate-nudge">↓</span>
              </a>
              <Link
                href="/como-funciona"
                className="inline-flex items-center rounded-full border border-white/25 px-5 py-3 font-medium text-neutral-100 transition-colors duration-300 hover:border-orange-300 hover:text-orange-300"
              >
                Como funciona
              </Link>
            </Reveal>
          </div>

          <Reveal onMount delay={0.4} className="hidden lg:block">
            <div className="rounded-2xl border border-white/10 bg-neutral-900/90 p-5">
              <GraphDemo
                common={[titles[0] ?? "Filme em comum", titles[1] ?? "Outro filme"]}
                pick={titles[2] ?? "Sua indicação"}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                <span className="flex gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#6fa8d6]" /> pessoas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-[#ec6b4f]" /> filmes
                  </span>
                </span>
                <span>gostos em comum viram indicação</span>
              </div>
            </div>
          </Reveal>
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
            className="w-36 rounded-full border border-border bg-surface px-4 py-2 outline-none transition-[border-color,box-shadow] duration-300 ease-out-soft focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          <button className="rounded-full border border-border bg-surface px-4 py-2 font-medium transition-[color,border-color,transform] duration-300 ease-spring hover:border-accent hover:text-accent active:scale-95">
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
