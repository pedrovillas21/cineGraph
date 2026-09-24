# CineGraph

Sistema de recomendação de filmes por **vizinhança em grafo bipartido** (usuários × filmes, arestas = avaliações do MovieLens).
Projeto da disciplina **PI3B — Centro Universitário IESB**. O algoritmo é implementado pela equipe, sem bibliotecas de machine learning.

| Integrante | Frente |
|---|---|
| Pedro Henrique Villas Boas Portella | Gerente do projeto · front-end e interface |
| Arthur Savio Gonçalves Soares | Back-end e algoritmo do grafo |
| Rogeres Gabriel Paiva Matos | Dados, persistência e testes de carga |

## Documentação

| Doc | Marco |
|---|---|
| [01 · Modelo conceitual](docs/01-modelo-conceitual.md) | 28/08 |
| [02 · Algoritmo](docs/02-algoritmo.md) | 04/09 |
| [03 · Stack e ambiente](docs/03-stack.md) | 11/09 |
| [04 · EAP](docs/04-eap.md) | 18/09 |
| [05 · Escopo do MVP](docs/05-escopo-mvp.md) | 25/09 |

## Stack

Node.js **22 LTS** · Next.js 15 + TypeScript · **Neo4j AuraDB** (banco de grafos) · Vercel · Vitest · tsx

## Rodando localmente

Pré-requisito: Node.js 22 (`node -v`). Sem Node instalado e sem admin, baixe o **zip portátil do Node 22** em nodejs.org, extraia e rode `set PATH=<pasta-extraída>;%PATH%`.

```bash
npm ci
npm run dev          # http://localhost:3000
```

Sem `.env.local`, a aplicação abre em **modo demo** com o grafo de exemplo (5 usuários, 6 filmes).

### Telas

| Rota | Para quem | O que mostra |
|---|---|---|
| `/` | usuário final | escolha de perfil ("Quem está assistindo?") e favoritos do público |
| `/perfil/[id]` | usuário final | recomendações com o motivo ("Para quem amou…"), pessoas com gosto parecido e melhores notas |
| `/filme/[id]?perfil=` | usuário final | sinopse, notas, "Por que indicamos para você" e "Quem amou este filme também amou" |
| `/como-funciona` | apresentação/professor | explicação simples + números do grafo, vizinhança de 2 saltos e comparação memória × Cypher |

> Se você usa `npm run dev` e quer testar um build ao mesmo tempo, compile em outra pasta para não misturar arquivos: `NEXT_DIST_DIR=.next-verify npm run build`.

### Scripts

| Comando | O que faz |
|---|---|
| `npm test` | testes do grafo, do algoritmo de recomendação e das migrações |
| `npm run recommend -- --user=1` | PoC do algoritmo no terminal (`--db` usa o Neo4j; `--shrinkage=0` desliga a suavização) |
| `npm run graph:hello` | "hello graph" no terminal com o grafo de exemplo |
| `npm run graph:hello -- --csv` | mesmo, com o MovieLens real lido dos CSVs (sem banco) |
| `npm run graph:hello -- --db` | mesmo, com o grafo lido do Neo4j + comparação memória × Cypher |
| `npm run etl -- --dry-run` | baixa o MovieLens, filtra e mostra as contagens |
| `npm run etl` | aplica migrações pendentes e carrega o grafo no Neo4j |
| `npm run etl -- --reset --max-users=100` | recarrega só um subgrafo (testes de carga) |
| `npm run db:migrate` / `db:info` / `db:validate` | migrações do banco (estilo Flyway) |
| `npm run db:new -- "descrição"` | cria a próxima migração `V<n>__descricao.cypher` |

## Banco de dados (Neo4j AuraDB Free)

1. Em [console.neo4j.io](https://console.neo4j.io), crie uma instância **AuraDB Free** e baixe o arquivo de credenciais (a senha só aparece uma vez).
2. `cp .env.example .env.local` e preencha `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `NEO4J_DATABASE` e, opcionalmente, `TMDB_API_TOKEN`.
3. `npm run etl`. Ele aplica as migrações e carrega o grafo. Resultado esperado: `{ users: 602, movies: 3650, edges: 90137 }`.
4. Confira no Neo4j Browser: `MATCH p=(:User {id:1})-[:RATED]->(:Movie)<-[:RATED]-(:User) RETURN p LIMIT 50`

O dataset é baixado do GroupLens para `data/raw/` e **não** vai para o git, porque a licença do MovieLens não permite redistribuição.

### Metadados do TMDB (pôster, sinopse, título em português)

Com `TMDB_API_TOKEN` no `.env.local` (themoviedb.org → Settings → API → *API Read Access Token*), o ETL busca os detalhes de cada filme pelo `tmdbId` do `links.csv` e grava no nó `:Movie`.
- As respostas ficam em cache em `data/raw/tmdb-cache.json`, então a segunda execução é instantânea.
- Sem o token, ou com `--no-tmdb`, o grafo é carregado normalmente, só sem os metadados.
- O token só é usado no terminal. A aplicação na Vercel não precisa dele: lê os dados do Neo4j e carrega as imagens do CDN do TMDB.
- Só o endpoint de detalhes é usado. Os endpoints de recomendação do TMDB **não** são usados (restrição do TAP).

> This product uses the TMDB API but is not endorsed or certified by TMDB.

### Migrações (estilo Flyway)

Os arquivos ficam em `db/migrations/V<n>__descricao.cypher`. O histórico, com checksum, é gravado em nós `(:__Migration)`. Elas rodam **automaticamente** no deploy de produção da Vercel (script `vercel-build`) e no início do ETL. As regras estão em [db/migrations/README.md](db/migrations/README.md).

> A instância Free **pausa após 3 dias sem uso**. Um cron diário da Vercel (`vercel.json` → `/api/cron/keepalive`) mantém ela ativa. Antes de apresentar, confira `/api/health`.

## Deploy (Vercel)

1. Suba o repositório para o GitHub.
2. Em vercel.com, **Add New → Project** e importe o repositório (framework detectado: Next.js).
3. Em **Settings → Environment Variables**, adicione `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` e um `CRON_SECRET` qualquer.
4. Node.js 22.x já vem do `engines` do `package.json`. Cada `git push` na `main` migra o banco e publica um novo deploy.

## API

| Rota | Retorno |
|---|---|
| `GET /api/health` | status, versão do Node e conexão com o Neo4j |
| `GET /api/graph/stats` | tamanho do grafo e top 10 filmes por grau |
| `GET /api/graph/neighbors?userId=1&limit=20` | vizinhança de 2 saltos em memória |
| `GET /api/graph/neighbors?userId=1&engine=cypher` | mesma travessia feita pelo Neo4j |
| `GET /api/cron/keepalive` | escrita mínima diária para o Aura não pausar |
| `GET /api/recommendations?userId=1&k=10` | recomendações no contrato `RecommendationResult` (doc 02) |

## Estrutura

```
src/
  app/             rotas do Next.js: páginas (page.tsx) e endpoints REST (api/*/route.ts)
  components/      FRONT-END: componentes de interface, só apresentação
  server/          BACK-END (roda só no servidor): ver src/server/README.md
    graph/         algoritmo do grafo em TS puro (Graph, BFS, métricas, tipos/contrato)
    db/            driver do Neo4j e consultas Cypher
    services/      carga do grafo em memória e dados das telas
scripts/           ETL do MovieLens, migrações e hello-graph (terminal)
db/migrations/     migrações versionadas do Neo4j (V<n>__descricao.cypher)
tests/             testes (Vitest)
docs/              entregas acadêmicas
```

## Dataset

F. Maxwell Harper and Joseph A. Konstan. 2015. *The MovieLens Datasets: History and Context.* ACM TiiS 5, 4. <https://doi.org/10.1145/2827872>
