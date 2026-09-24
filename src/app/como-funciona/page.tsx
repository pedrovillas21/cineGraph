import { NeighborhoodCard } from "@/components/NeighborhoodCard";
import { Section } from "@/components/Section";
import { SiteFooter } from "@/components/SiteFooter";
import { StatCard } from "@/components/StatCard";
import { TopMoviesCard } from "@/components/TopMoviesCard";
import { fmt } from "@/components/format";
import { getDashboard } from "@/server/services/dashboardService";

export const dynamic = "force-dynamic";

const steps = [
  {
    n: "1",
    title: "Olhamos o que você amou",
    text: "Partimos dos filmes que você avaliou e das notas que deu a cada um.",
  },
  {
    n: "2",
    title: "Encontramos pessoas parecidas",
    text: "Procuramos quem viu os mesmos filmes e deu notas parecidas com as suas.",
  },
  {
    n: "3",
    title: "Indicamos o que elas adoraram",
    text: "Os filmes que essas pessoas amaram, e que você ainda não viu, viram suas recomendações, sempre com o motivo.",
  },
];

export default async function HowItWorks({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const { user } = await searchParams;
  const data = await getDashboard(user);

  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">Como funciona</p>
        <h1 className="mt-2 max-w-3xl text-2xl font-bold tracking-tight sm:text-4xl">
          Recomendações que você consegue entender.
        </h1>
        <p className="mt-3 max-w-2xl text-muted sm:text-lg">
          O CineGraph não usa inteligência artificial de “caixa-preta”. Ele liga pessoas e filmes numa grande rede e
          segue essas ligações para encontrar o que você deve gostar.
        </p>

        {/* No celular o número fica ao lado do texto, o que encurta cada passo. */}
        <ol className="mt-6 grid gap-3 sm:mt-10 md:grid-cols-3 md:gap-4">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-4 rounded-xl border border-border bg-surface p-4 sm:p-6 md:flex-col md:gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent font-semibold text-white">
                {s.n}
              </span>
              <div>
                <h2 className="font-semibold">{s.title}</h2>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-3 rounded-xl border border-border bg-surface p-4 text-sm text-muted sm:mt-6 sm:p-6">
          <p>
            <strong className="text-foreground">De onde vêm os dados?</strong> As avaliações são do{" "}
            <em>MovieLens</em>, um conjunto público e anônimo com {fmt.format(data.stats.edges)} notas dadas por{" "}
            {fmt.format(data.stats.users)} pessoas a {fmt.format(data.stats.movies)} filmes. Pôsteres, sinopses e títulos
            em português vêm do TMDB.
          </p>
        </div>
      </section>

      <Section
        title="Para os curiosos: o grafo por dentro"
        subtitle="Pessoas e filmes são vértices de um grafo bipartido; cada avaliação é uma aresta com peso igual à nota. Dados guardados no Neo4j, um banco de dados orientado a grafos."
      >
        <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-4">
          <StatCard label="Usuários (vértices)" value={fmt.format(data.stats.users)} dot="bg-user" />
          <StatCard label="Filmes (vértices)" value={fmt.format(data.stats.movies)} dot="bg-movie" />
          <StatCard label="Avaliações (arestas)" value={fmt.format(data.stats.edges)} />
          <StatCard label="Grau médio do usuário" value={data.stats.avgUserDegree.toFixed(1)} />
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <TopMoviesCard movies={data.topMovies} />
          <NeighborhoodCard
            user={data.user}
            missingUser={data.missingUser}
            neighborhood={data.neighborhood}
            cypher={data.cypher}
          />
        </div>

        <p className="mt-6 break-words text-xs text-muted">
          Fonte: {data.source === "neo4j" ? "Neo4j AuraDB" : "grafo de exemplo (modo demo)"} · grafo carregado em{" "}
          {Math.round(data.loadMs)} ms · API: <code>/api/recommendations?userId={data.user.id}</code> ·{" "}
          <code>/api/graph/neighbors?userId={data.user.id}&amp;engine=cypher</code> · <code>/api/health</code>
        </p>
      </Section>

      <SiteFooter hasTmdb={data.hasTmdb} />
    </main>
  );
}
