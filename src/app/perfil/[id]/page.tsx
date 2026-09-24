import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { DemoNotice } from "@/components/DemoNotice";
import { MovieCard, MovieGrid } from "@/components/MovieCard";
import { ProfileCard } from "@/components/ProfileCard";
import { Section } from "@/components/Section";
import { SiteFooter } from "@/components/SiteFooter";
import { getProfile } from "@/server/services/catalogService";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProfile(Number(id));
  if (!data) notFound();
  const { profile } = data;

  return (
    <main>
      <DemoNotice dbError={data.dbError} />

      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-5 px-4 py-8 sm:px-6">
          <Avatar initials={profile.initials} hue={profile.hue} size={72} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Olá,</p>
            <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
            <p className="mt-1 text-muted">
              Curte {profile.taste} · {profile.ratedCount} filmes avaliados
            </p>
          </div>
          <Link
            href="/#perfis"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
          >
            Trocar perfil
          </Link>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.similar.map((p) => (
              <ProfileCard key={p.id} profile={p} note={`${p.inCommon} filmes que vocês dois viram`} />
            ))}
          </div>
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
