// Migrações versionadas do banco de grafos, no estilo Flyway.
//
// - Arquivos em db/migrations com o nome V<versão>__<descrição>.cypher
// - Cada migração aplicada vira um nó (:__Migration) com versão, checksum e data
// - Antes de aplicar, valida: checksum de migrações já aplicadas não pode mudar,
//   arquivo aplicado não pode sumir e versão nova não pode ficar "no meio"
//
// Regra de escrita: um comando Cypher por ";" no fim da linha. No Neo4j, comandos
// de schema não compartilham transação com escritas de dados, então cada comando
// roda na própria transação — escreva-os idempotentes (IF NOT EXISTS, MERGE).

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");
const FILE_RE = /^V(\d+)__([A-Za-z0-9_-]+)\.cypher$/;

export interface Migration {
  version: number;
  description: string;
  script: string;
  checksum: string;
  statements: string[];
}

export interface AppliedMigration {
  version: number;
  description: string;
  script: string;
  checksum: string;
  appliedAt: string;
  executionMs: number;
}

/** "V2__indices_extra.cypher" → { version: 2, description: "indices extra" } */
export function parseFileName(file: string): { version: number; description: string } | null {
  const match = FILE_RE.exec(file);
  if (!match) return null;
  return { version: Number(match[1]), description: match[2].replace(/_/g, " ") };
}

/** SHA-256 do conteúdo com quebras de linha normalizadas (CRLF do Windows = LF). */
export function checksum(content: string): string {
  return createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
}

/** Separa o script em comandos: remove linhas de comentário (//) e corta em ";" no fim da linha. */
export function splitStatements(content: string): string[] {
  const body = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
  return body
    .split(/;[ \t]*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function readMigrations(dir = MIGRATIONS_DIR): Migration[] {
  const files = readdirSync(dir).filter((f) => !f.startsWith(".") && f !== "README.md");
  const migrations: Migration[] = [];
  const seen = new Map<number, string>();

  for (const file of files) {
    const parsed = parseFileName(file);
    if (!parsed) {
      throw new Error(`Nome de migração inválido: ${file} (use V<n>__descricao.cypher)`);
    }
    if (seen.has(parsed.version)) {
      throw new Error(`Versão ${parsed.version} duplicada: ${seen.get(parsed.version)} e ${file}`);
    }
    seen.set(parsed.version, file);
    const content = readFileSync(path.join(dir, file), "utf8");
    migrations.push({
      ...parsed,
      script: file,
      checksum: checksum(content),
      statements: splitStatements(content),
    });
  }
  return migrations.sort((a, b) => a.version - b.version);
}

export interface MigrationPlan {
  pending: Migration[];
  errors: string[];
}

/** Compara o que está no disco com o histórico do banco (equivalente ao "validate" do Flyway). */
export function planMigrations(local: Migration[], applied: AppliedMigration[]): MigrationPlan {
  const errors: string[] = [];
  const localByVersion = new Map(local.map((m) => [m.version, m]));
  const appliedVersions = new Set(applied.map((a) => a.version));
  const maxApplied = applied.reduce((max, a) => Math.max(max, a.version), 0);

  for (const a of applied) {
    const file = localByVersion.get(a.version);
    if (!file) {
      errors.push(`V${a.version} (${a.script}) está aplicada no banco, mas o arquivo não existe mais.`);
    } else if (file.checksum !== a.checksum) {
      errors.push(
        `V${a.version} (${a.script}) foi alterada depois de aplicada. ` +
          "Não edite migrações antigas: crie uma nova versão.",
      );
    }
  }

  const pending = local.filter((m) => !appliedVersions.has(m.version));
  for (const m of pending) {
    if (m.version < maxApplied) {
      errors.push(`V${m.version} (${m.script}) é anterior à última aplicada (V${maxApplied}). Use uma versão maior.`);
    }
  }
  return { pending, errors };
}

export function nextFileName(local: Migration[], description: string): string {
  const version = local.reduce((max, m) => Math.max(max, m.version), 0) + 1;
  const slug = description
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `V${version}__${slug || "migracao"}.cypher`;
}
