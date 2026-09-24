import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  checksum,
  MIGRATIONS_DIR,
  nextFileName,
  parseFileName,
  planMigrations,
  readMigrations,
  splitStatements,
  type AppliedMigration,
  type Migration,
} from "../scripts/db/migrator";

const mig = (version: number, content = `RETURN ${version};`): Migration => ({
  version,
  description: `m${version}`,
  script: `V${version}__m${version}.cypher`,
  checksum: checksum(content),
  statements: splitStatements(content),
});

const applied = (m: Migration, overrides: Partial<AppliedMigration> = {}): AppliedMigration => ({
  version: m.version,
  description: m.description,
  script: m.script,
  checksum: m.checksum,
  appliedAt: "2026-09-24T12:00:00Z",
  executionMs: 10,
  ...overrides,
});

describe("nome e conteúdo das migrações", () => {
  it("lê versão e descrição no padrão V<n>__descricao.cypher", () => {
    expect(parseFileName("V12__indice_filmes.cypher")).toEqual({ version: 12, description: "indice filmes" });
    expect(parseFileName("V1_sem_dois_underscores.cypher")).toBeNull();
    expect(parseFileName("V1__grafo.sql")).toBeNull();
  });

  it("checksum ignora diferença de quebra de linha Windows/Linux", () => {
    expect(checksum("A;\r\nB;\r\n")).toBe(checksum("A;\nB;\n"));
    expect(checksum("A;")).not.toBe(checksum("B;"));
  });

  it("separa comandos por ';' no fim da linha e ignora comentários", () => {
    const script = "// cabeçalho\nCREATE CONSTRAINT a IF NOT EXISTS\nFOR (u:User) REQUIRE u.id IS UNIQUE;\n\n  // outro\nMATCH (n) RETURN 'a;b' AS x;\n";
    expect(splitStatements(script)).toEqual([
      "CREATE CONSTRAINT a IF NOT EXISTS\nFOR (u:User) REQUIRE u.id IS UNIQUE",
      "MATCH (n) RETURN 'a;b' AS x",
    ]);
  });

  it("gera o próximo nome de arquivo", () => {
    expect(nextFileName([mig(1), mig(2)], "Índice de gêneros")).toBe("V3__indice_de_generos.cypher");
    expect(nextFileName([], "")).toBe("V1__migracao.cypher");
  });

  it("as migrações do repositório são válidas", () => {
    const local = readMigrations(MIGRATIONS_DIR);
    expect(local[0].version).toBe(1);
    expect(local.every((m) => m.statements.length > 0)).toBe(true);
  });

  it("recusa versões duplicadas e nomes fora do padrão", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "mig-"));
    writeFileSync(path.join(dir, "V1__a.cypher"), "RETURN 1;");
    writeFileSync(path.join(dir, "V1__b.cypher"), "RETURN 1;");
    expect(() => readMigrations(dir)).toThrow(/duplicada/);

    const dir2 = mkdtempSync(path.join(tmpdir(), "mig-"));
    writeFileSync(path.join(dir2, "grafo.cypher"), "RETURN 1;");
    expect(() => readMigrations(dir2)).toThrow(/inválido/);
  });
});

describe("validação (planMigrations)", () => {
  const [m1, m2, m3] = [mig(1), mig(2), mig(3)];

  it("banco vazio: tudo pendente", () => {
    expect(planMigrations([m1, m2], [])).toEqual({ pending: [m1, m2], errors: [] });
  });

  it("aplica só o que falta", () => {
    expect(planMigrations([m1, m2, m3], [applied(m1)]).pending.map((m) => m.version)).toEqual([2, 3]);
  });

  it("detecta migração alterada depois de aplicada", () => {
    const { errors } = planMigrations([m1], [applied(m1, { checksum: "outro" })]);
    expect(errors[0]).toMatch(/alterada depois de aplicada/);
  });

  it("detecta arquivo aplicado que sumiu", () => {
    const { errors } = planMigrations([m2], [applied(m1), applied(m2)]);
    expect(errors[0]).toMatch(/não existe mais/);
  });

  it("recusa versão nova menor que a última aplicada", () => {
    const { errors } = planMigrations([m1, m2, m3], [applied(m1), applied(m3)]);
    expect(errors[0]).toMatch(/anterior à última aplicada/);
  });
});
