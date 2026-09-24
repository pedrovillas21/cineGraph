// Execução das migrações contra o Neo4j (a parte que toca no banco).

import { cypher, databaseName, getDriver, neo4j } from "../../src/server/db/neo4j";
import { planMigrations, readMigrations, type AppliedMigration, type Migration } from "./migrator";

async function ensureHistory(): Promise<void> {
  await cypher(
    "CREATE CONSTRAINT migration_version IF NOT EXISTS FOR (m:__Migration) REQUIRE m.version IS UNIQUE",
    {},
    "write",
  );
}

export async function appliedMigrations(): Promise<AppliedMigration[]> {
  await ensureHistory();
  return cypher<AppliedMigration>(
    `MATCH (m:__Migration)
     RETURN m.version AS version, m.description AS description, m.script AS script,
            m.checksum AS checksum, toString(m.appliedAt) AS appliedAt, m.executionMs AS executionMs
     ORDER BY m.version`,
  );
}

async function apply(migration: Migration): Promise<number> {
  const start = performance.now();
  const session = getDriver().session({ database: databaseName() });
  try {
    for (const statement of migration.statements) {
      // session.run = transação implícita: aceita schema e CALL {} IN TRANSACTIONS
      await session.run(statement);
    }
  } finally {
    await session.close();
  }
  const executionMs = Math.round(performance.now() - start);
  await cypher(
    `CREATE (:__Migration {
       version: $version, description: $description, script: $script,
       checksum: $checksum, executionMs: $executionMs, appliedAt: datetime()
     })`,
    {
      version: neo4j.int(migration.version),
      description: migration.description,
      script: migration.script,
      checksum: migration.checksum,
      executionMs: neo4j.int(executionMs),
    },
    "write",
  );
  return executionMs;
}

/** Valida e aplica as migrações pendentes, em ordem de versão. */
export async function migrate(log: (msg: string) => void = console.log): Promise<Migration[]> {
  const local = readMigrations();
  const { pending, errors } = planMigrations(local, await appliedMigrations());
  if (errors.length) {
    throw new Error(`Validação das migrações falhou:\n  - ${errors.join("\n  - ")}`);
  }
  if (!pending.length) {
    log(`Banco atualizado: nenhuma migração pendente (${local.length} aplicada(s)).`);
    return [];
  }
  for (const m of pending) {
    log(`Aplicando V${m.version} — ${m.description} (${m.statements.length} comando(s)) ...`);
    const ms = await apply(m);
    log(`  ok em ${ms} ms`);
  }
  log(`${pending.length} migração(ões) aplicada(s).`);
  return pending;
}

export interface MigrationInfoRow {
  version: number;
  description: string;
  state: "aplicada" | "pendente" | "alterada" | "ausente";
  appliedAt: string;
}

/** Situação de cada migração (equivalente ao "info" do Flyway). */
export async function info(): Promise<MigrationInfoRow[]> {
  const local = readMigrations();
  const applied = await appliedMigrations();
  const appliedByVersion = new Map(applied.map((a) => [a.version, a]));
  const versions = [...new Set([...local.map((m) => m.version), ...applied.map((a) => a.version)])].sort(
    (a, b) => a - b,
  );
  return versions.map((version) => {
    const file = local.find((m) => m.version === version);
    const row = appliedByVersion.get(version);
    const state = !row ? "pendente" : !file ? "ausente" : file.checksum !== row.checksum ? "alterada" : "aplicada";
    return {
      version,
      description: file?.description ?? row?.description ?? "",
      state,
      appliedAt: row?.appliedAt ?? "",
    };
  });
}
