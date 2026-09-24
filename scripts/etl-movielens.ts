// ETL do MovieLens (ml-latest-small) → grafo bipartido no Neo4j AuraDB.
//
// Uso:
//   npm run etl -- --dry-run            baixa, filtra e mostra as contagens (sem banco)
//   npm run etl                         aplica migrações pendentes e carrega o grafo
//   npm run etl -- --reset              apaga usuários, filmes e avaliações antes de carregar
//   npm run etl -- --max-users=100      carrega um subgrafo (útil p/ testes de carga)
//   npm run etl -- --no-tmdb            não busca pôster/sinopse no TMDB
//   --min-movie-ratings=5 --min-user-ratings=20   limiares contra "cold start"

import "./env";
import { closeDriver, cypher, databaseName, getDriver } from "../src/server/db/neo4j";
import { migrate } from "./db/runner";
import { defaultFilters, ensureDataset, transform, type FilterOptions } from "./movielens";
import { fetchTmdbMovies, hasTmdbToken, type TmdbMovie } from "./tmdb";

const BATCH = 5000;

interface Options extends FilterOptions {
  dryRun: boolean;
  reset: boolean;
  tmdb: boolean;
}

function parseArgs(argv: string[]): Options {
  const num = (name: string, fallback: number) => {
    const arg = argv.find((a) => a.startsWith(`--${name}=`));
    return arg ? Number(arg.split("=")[1]) : fallback;
  };
  const maxUsers = num("max-users", 0);
  return {
    dryRun: argv.includes("--dry-run"),
    reset: argv.includes("--reset"),
    tmdb: !argv.includes("--no-tmdb"),
    minMovieRatings: num("min-movie-ratings", defaultFilters.minMovieRatings),
    minUserRatings: num("min-user-ratings", defaultFilters.minUserRatings),
    maxUsers: maxUsers > 0 ? maxUsers : null,
  };
}

// Os números do JS chegam ao Neo4j como Float; toInteger() mantém os ids inteiros.
const UPSERT_USERS = `
  UNWIND $rows AS row
  MERGE (:User {id: toInteger(row.id)})`;

const UPSERT_MOVIES = `
  UNWIND $rows AS row
  MERGE (m:Movie {id: toInteger(row.id)})
  SET m.title = row.title, m.year = toInteger(row.year), m.genres = row.genres,
      m.tmdbId = toInteger(row.tmdbId), m.imdbId = row.imdbId`;

// Metadados do TMDB (só descrevem o filme; não entram no algoritmo).
const SET_TMDB = `
  UNWIND $rows AS row
  MATCH (m:Movie {id: toInteger(row.id)})
  SET m.titlePt = row.titlePt, m.overview = row.overview, m.posterPath = row.posterPath,
      m.backdropPath = row.backdropPath, m.voteAverage = toFloat(row.voteAverage),
      m.runtime = toInteger(row.runtime)`;

const UPSERT_RATINGS = `
  UNWIND $rows AS row
  MATCH (u:User  {id: toInteger(row.userId)})
  MATCH (m:Movie {id: toInteger(row.movieId)})
  MERGE (u)-[r:RATED]->(m)
  SET r.rating = toFloat(row.rating), r.ratedAt = datetime(row.ratedAt)`;

async function writeBatches(label: string, query: string, rows: Record<string, unknown>[]): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    await cypher(query, { rows: rows.slice(i, i + BATCH) }, "write");
    process.stdout.write(`\r  ${label}: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");
}

async function resetGraph(): Promise<void> {
  // CALL {} IN TRANSACTIONS exige transação implícita (session.run)
  const session = getDriver().session({ database: databaseName() });
  try {
    await session.run(`
      MATCH (n) WHERE n:User OR n:Movie
      CALL (n) { DETACH DELETE n } IN TRANSACTIONS OF 2000 ROWS`);
  } finally {
    await session.close();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const start = performance.now();

  const data = transform(await ensureDataset(), opts);

  console.log("\nMovieLens original :", data.raw);
  console.log("Grafo após filtros :", {
    users: data.users.length,
    movies: data.movies.length,
    edges: data.ratings.length,
  });
  console.log("Filtros aplicados  :", {
    minMovieRatings: opts.minMovieRatings,
    minUserRatings: opts.minUserRatings,
    maxUsers: opts.maxUsers ?? "todos",
  });

  if (opts.dryRun) {
    console.log("\n--dry-run: nada foi gravado no banco.");
    return;
  }

  // Busca no TMDB antes de mexer no banco: se o token estiver errado, falha cedo.
  let tmdb = new Map<number, TmdbMovie>();
  if (opts.tmdb && hasTmdbToken()) {
    console.log("\nTMDB (pôster, sinopse e título em pt-BR):");
    const ids = data.movies.flatMap((m) => (m.tmdbId ? [m.tmdbId] : []));
    tmdb = await fetchTmdbMovies(ids, (done, total) => {
      // No terminal atualiza a linha; em log (CI, arquivo) imprime só a cada 500
      if (process.stdout.isTTY) process.stdout.write(`\r  filmes: ${done}/${total}`);
      else if (done % 500 === 0 || done === total) console.log(`  filmes: ${done}/${total}`);
    });
    process.stdout.write("\n");
    console.log(`  ${tmdb.size} de ${ids.length} filmes encontrados no TMDB`);
  } else {
    console.log(`\nTMDB: pulado (${opts.tmdb ? "TMDB_API_TOKEN ausente" : "--no-tmdb"}).`);
  }

  console.log("\nMigrações:");
  await migrate((msg) => console.log(`  ${msg}`));

  if (opts.reset) {
    console.log("Apagando o grafo atual ...");
    await resetGraph();
  }

  console.log("\nCarregando no Neo4j:");
  await writeBatches("usuários ", UPSERT_USERS, data.users);
  await writeBatches(
    "filmes   ",
    UPSERT_MOVIES,
    data.movies.map((m) => ({
      id: m.id,
      title: m.title,
      year: m.year,
      genres: m.genres ? m.genres.split("|") : [],
      tmdbId: m.tmdbId,
      imdbId: m.imdbId,
    })),
  );
  if (tmdb.size) {
    await writeBatches(
      "TMDB     ",
      SET_TMDB,
      data.movies.flatMap((m) => {
        const t = m.tmdbId ? tmdb.get(m.tmdbId) : undefined;
        return t ? [{ id: m.id, ...t }] : [];
      }),
    );
  }
  await writeBatches(
    "avaliações",
    UPSERT_RATINGS,
    data.ratings.map((r) => ({
      userId: r.user_id,
      movieId: r.movie_id,
      rating: r.rating,
      ratedAt: r.rated_at.toISOString(),
    })),
  );

  const [counts] = await cypher<{ users: number; movies: number; edges: number }>(`
    MATCH (u:User) WITH count(u) AS users
    MATCH (m:Movie) WITH users, count(m) AS movies
    MATCH (:User)-[r:RATED]->(:Movie)
    RETURN users, movies, count(r) AS edges`);
  console.log("\nNo banco agora    :", counts);
  console.log(`Concluído em ${((performance.now() - start) / 1000).toFixed(1)}s`);
}

main()
  .catch((err) => {
    console.error("\nErro no ETL:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDriver());
