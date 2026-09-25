/**
 * Roda uma vez quando o servidor liga (inclusive a cada "cold start" na Vercel).
 * Começa a carregar o grafo do Neo4j em segundo plano (~3,5 s), para que a
 * primeira página fora do cache não precise esperar por isso.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { loadGraph } = await import("./server/services/graphService");
  void loadGraph();
}
