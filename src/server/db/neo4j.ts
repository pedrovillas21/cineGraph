import neo4j, { type Driver } from "neo4j-driver";

// Um driver por processo, em globalThis: o Next empacota instrumentation.ts
// separado das páginas, e abrir uma segunda conexão com a AuraDB custa ~2 s.
const store = globalThis as typeof globalThis & { __cinegraphDriver?: Driver | null };

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
  store.__cinegraphDriver ??= neo4j.driver(uri, neo4j.auth.basic(process.env.NEO4J_USERNAME || "neo4j", password), {
    disableLosslessIntegers: true,
    maxConnectionPoolSize: 10,
  });
  return store.__cinegraphDriver;
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
  if (store.__cinegraphDriver) await store.__cinegraphDriver.close();
  store.__cinegraphDriver = null;
}

export { neo4j };
