import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { DemoNotice } from "@/components/DemoNotice";
import { MovieCard, MovieGrid } from "@/components/MovieCard";
import { ProfileCard } from "@/components/ProfileCard";
import { Rail } from "@/components/Rail";
import { Pop, Reveal, WordReveal } from "@/components/motion";
import { Section } from "@/components/Section";
import { SiteFooter } from "@/components/SiteFooter";
import { getProfilePage } from "@/server/services/pageData";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProfilePage(Number(id));
  if (!data) notFound();
  const { profile } = data;

  return (
    <main>
      <DemoNotice dbError={data.dbError} />

      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8">
          <Pop className="inline-flex rounded-full ring-[6px] ring-user/15">
            <Avatar initials={profile.initials} hue={profile.hue} size={72} />
          </Pop>
          <div className="min-w-0 flex-1">
            <Reveal onMount>
              <p className="text-sm text-muted">Olá,</p>
            </Reveal>
            <WordReveal text={profile.name} className="text-2xl font-bold tracking-tight sm:text-4xl" delay={0.1} />
            <Reveal onMount delay={0.25}>
              <p className="mt-1 text-sm text-muted sm:text-base">
                Curte {profile.taste} · {profile.ratedCount} filmes avaliados
              </p>
            </Reveal>
          </div>
          <Reveal onMount delay={0.3}>
            <Link
              href="/#perfis"
              className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium transition-[color,border-color,transform] duration-300 ease-spring hover:border-accent hover:text-accent active:scale-95"
            >
              Trocar perfil
            </Link>
          </Reveal>
        </div>
      </section>

      <Section
        title={data.personalized ? "Recomendados para você" : "Para começar"}
        subtitle={
          data.personalized
            ? "Filmes que pessoas com gosto parecido com o seu adoraram e que você ainda não viu."
            : "Ainda não encontramos pessoas com gosto parecido o suficiente, então separamos os favoritos do público."
        }
      >
        <MovieGrid>
          {data.recommendations.map((m) => (
            <MovieCard key={m.movieId} movie={m} profileId={profile.id} />
          ))}
        </MovieGrid>
      </Section>

      {data.similar.length > 0 && (
        <Section
          title="Pessoas com gosto parecido"
          subtitle="São elas que inspiram as suas recomendações. Toque para ver o que cada uma indica."
        >
          <Rail size="card" grid="sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {data.similar.map((p) => (
              <ProfileCard key={p.id} profile={p} note={`${p.inCommon} filmes que vocês dois viram`} />
            ))}
          </Rail>
        </Section>
      )}

      <Section title="Os filmes que você mais gostou" subtitle="Suas melhores notas, que ajudam a entender o seu gosto.">
        <MovieGrid>
          {data.favorites.map((m) => (
            <MovieCard key={m.movieId} movie={m} profileId={profile.id} />
          ))}
        </MovieGrid>
      </Section>

      <SiteFooter hasTmdb={data.hasTmdb} />
    </main>
  );
}
