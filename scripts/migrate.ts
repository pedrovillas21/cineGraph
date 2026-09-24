// CLI das migrações do banco de grafos (estilo Flyway).
//
//   npm run db:migrate            valida e aplica as migrações pendentes
//   npm run db:info               mostra a situação de cada migração
//   npm run db:validate           só valida (não aplica nada)
//   npm run db:new -- "descrição" cria o próximo arquivo V<n>__descricao.cypher
//
// No deploy da Vercel (script "vercel-build") roda com --deploy: só migra em
// produção e não quebra o build quando o banco não está configurado.

import "./env";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { closeDriver, hasDatabase } from "../src/server/db/neo4j";
import { MIGRATIONS_DIR, nextFileName, planMigrations, readMigrations } from "./db/migrator";
import { appliedMigrations, info, migrate } from "./db/runner";

async function main() {
  const argv = process.argv.slice(2);
  const command = argv.find((a) => !a.startsWith("--")) ?? "migrate";

  if (command === "new") {
    const description = argv.filter((a) => !a.startsWith("--")).slice(1).join(" ");
    const file = nextFileName(readMigrations(), description);
    const target = path.join(MIGRATIONS_DIR, file);
    if (existsSync(target)) throw new Error(`${file} já existe`);
    writeFileSync(target, `// ${description || "nova migração"}\n// Um comando por ";" no fim da linha; prefira comandos idempotentes.\n\n`);
    console.log(`Criada: db/migrations/${file}`);
    return;
  }

  if (argv.includes("--deploy")) {
    const env = process.env.VERCEL_ENV;
    if (env && env !== "production") {
      console.log(`[migrate] ambiente ${env}: migrações só rodam em produção. Pulando.`);
      return;
    }
    if (!hasDatabase()) {
      console.log("[migrate] NEO4J_URI/NEO4J_PASSWORD ausentes: build segue em modo demo, sem migrar.");
      return;
    }
  }

  if (command === "info") {
    console.table(await info());
  } else if (command === "validate") {
    const { pending, errors } = planMigrations(readMigrations(), await appliedMigrations());
    if (errors.length) throw new Error(`Validação falhou:\n  - ${errors.join("\n  - ")}`);
    console.log(`Migrações válidas. Pendentes: ${pending.map((m) => `V${m.version}`).join(", ") || "nenhuma"}.`);
  } else if (command === "migrate") {
    await migrate();
  } else {
    throw new Error(`Comando desconhecido: ${command} (use migrate, info, validate ou new)`);
  }
}

main()
  .catch((err) => {
    console.error("[migrate] Erro:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDriver());
