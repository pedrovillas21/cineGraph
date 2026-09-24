# Back-end (`src/server`)

Tudo nesta pasta roda **só no servidor** (Node 22): localmente no `npm run dev` e, na Vercel, dentro das funções serverless. O navegador nunca recebe este código nem as credenciais do banco.

```
src/server/
  graph/       algoritmo do grafo em TypeScript puro (Graph, BFS, grau, tipos/contrato)
  db/          acesso ao Neo4j: driver (neo4j.ts) e consultas Cypher (graphQueries.ts)
  services/    regras da aplicação: carga do grafo em memória, dados das telas
```

## Camadas

```
Front-end (navegador)                 Back-end (servidor)
─────────────────────                 ───────────────────────────────────────────────
src/components/  ◀── dados prontos ── src/app/page.tsx ──▶ services/ ──▶ graph/
                                      src/app/api/*    ──▶ services/ ──▶ db/ ──▶ Neo4j
```

- **`src/app/api/*`** são os endpoints REST (controllers): validam a requisição, chamam um serviço e devolvem JSON.
- **`src/app/page.tsx`** é renderizada no servidor. Ela chama `services/dashboardService` e entrega só dados prontos aos componentes.
- **`src/components/*`** é o front-end: só apresentação, sem acesso ao banco nem ao algoritmo.
- **`scripts/*`** (ETL, migrações, hello-graph) reusam este mesmo código pelo terminal.

Front e back ficam no mesmo projeto para ter **um único deploy na Vercel**, sem hospedar uma API separada.
