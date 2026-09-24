import neo4j, { type Driver } from "neo4j-driver";

let driver: Driver | null = null;

export function hasDatabase(): boolean {
  return Boolean(process.env.NEO4J_URI && process.env.NEO4J_PASSWORD);
}

export function databaseName(): string {
  return process.env.NEO4J_DATABASE || "neo4j";
}

/**
 * Driver único por processo para o Neo4j AuraDB. Os inteiros voltam como
 * `number` do JS (os ids do MovieLens cabem com folga em 2^53).
 */
export function getDriver(): Driver {
  const uri = process.env.NEO4J_URI;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !password) throw new Error("NEO4J_URI/NEO4J_PASSWORD não configuradas (veja .env.example).");
  driver ??= neo4j.driver(uri, neo4j.auth.basic(process.env.NEO4J_USERNAME || "neo4j", password), {
    disableLosslessIntegers: true,
    maxConnectionPoolSize: 10,
  });
  return driver;
}

/** Executa uma consulta Cypher e devolve os registros como objetos simples. */
export async function cypher<T = Record<string, unknown>>(
  query: string,
  params: Record<string, unknown> = {},
  mode: "read" | "write" = "read",
): Promise<T[]> {
  const { records } = await getDriver().executeQuery(query, params, {
    database: databaseName(),
    routing: mode === "read" ? neo4j.routing.READ : neo4j.routing.WRITE,
  });
  return records.map((r) => r.toObject() as T);
}

export async function closeDriver(): Promise<void> {
  if (driver) await driver.close();
  driver = null;
}

export { neo4j };
