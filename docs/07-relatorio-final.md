# 07 · Relatório final do projeto

> Marcos do TAP: **30/10 — Checkpoint 5: aplicação completa** · seminários **03/11, 13/11 e 20/11** · P2 27/11 · P3 11/12
> Equipe: Pedro (GP · front-end e interface) · Arthur (back-end e algoritmo) · Rogeres (dados, persistência e testes de carga)
> Revisão: 11/11/2026

## 1. Resumo

O CineGraph recomenda filmes percorrendo um **grafo bipartido usuário–filme** montado com o MovieLens (602 usuários, 3.650 filmes e 90.137 avaliações). O grafo fica no banco orientado a grafos **Neo4j AuraDB**. O algoritmo de vizinhança foi escrito pela equipe, sem nenhuma biblioteca de machine learning ou de algoritmos de grafo prontos:

- **BFS** de 2 e 3 saltos;
- **similaridade cosseno** entre os vetores de notas;
- **média ponderada suavizada**;
- **grau** dos filmes;
- **caminho mínimo** entre usuários.

Cada recomendação mostra o caminho que a justifica (u → filme em comum → vizinho → filme recomendado), na tela e num desenho do subgrafo. As travessias foram implementadas duas vezes, em memória (TypeScript) e em Cypher. As duas dão os mesmos resultados, e os testes de carga comparam o desempenho delas.

## 2. Objetivos do TAP × resultado

| Objetivo do TAP | Como foi atendido | Evidência |
|---|---|---|
| Modelar usuários e filmes como grafo bipartido de avaliações | `(:User)-[:RATED {rating}]->(:Movie)`; o peso da aresta é a nota | doc 01 · `db/migrations/V1__grafo_inicial.cypher` |
| Algoritmo de recomendação por vizinhança explícito e auditável | 3 saltos, cosseno e top-K, com o caminho de cada recomendação | doc 02 · `src/server/graph/recommend.ts` · `tests/recommend.test.ts` |
| Sem ML nem IA de caixa-preta | nenhuma dependência de ML ou de algoritmos de grafo (`package.json`); o TMDB fornece só metadados | doc 05 (fora do escopo) · MC-02 |
| Aplicar Teoria de Grafos (vértices, arestas, percursos, métricas) | BFS, vizinhança de 2 e 3 saltos, grau, caminho mínimo, distribuição de distâncias | seção 4 deste relatório |

## 3. Entregáveis do TAP

| Entregável (TAP) | Status | Onde está |
|---|---|---|
| TAP e modelo conceitual do grafo | ✅ | TAP v1.2 · `docs/01-modelo-conceitual.md` |
| Script de carga (ETL) do MovieLens | ✅ | `scripts/etl-movielens.ts` (`npm run etl`) |
| Algoritmo testável isoladamente no terminal (PoC) | ✅ | `npm run recommend -- --user=1` |
| Interface de consulta | ✅ | site Next.js: início, perfil, filme, "Como funciona" |
| Camada de persistência do grafo | ✅ | Neo4j AuraDB + migrações versionadas (`npm run db:migrate`) |
| Relatório de testes de carga | ✅ | `docs/06-testes-de-carga.md` |
| Visualização gráfica da rede de recomendações | ✅ | seção "Por dentro das suas recomendações" em `/perfil/[id]` |
| Documentação final (README) e apresentação ao vivo | ✅ docs · 🔄 slides | `README.md`, docs 01–07 · roteiro na seção 8 |

## 4. Conceitos de grafos aplicados

| Conceito | No CineGraph | Código |
|---|---|---|
| Grafo bipartido ponderado | U = usuários, M = filmes, w(u,m) = nota | `Graph.ts` (listas de adjacência com `Map`) |
| Vizinhança N(v) | filmes de um usuário / usuários de um filme | `moviesOf`, `usersOf` |
| Grau | popularidade do filme; base do fallback de cold start | `metrics.ts` · card "Top filmes por grau" |
| BFS (profundidade 2) | vizinhança de 2 saltos u → m → v | `traversal.ts`, `findNeighbors` |
| BFS (profundidade 3) | candidatos u → m → v → m' | `recommend.ts` |
| Caminho mínimo | afinidade estrutural entre dois usuários (comprimento sempre par) | `shortestPath` · `/api/graph/path` · card em "Como funciona" |
| Distribuição de distâncias | quantos usuários estão a 2, 4, 6… arestas | `userDistances` |
| Subgrafo induzido / amostragem | recorte legível para o desenho (mitigação de risco do TAP) | `subgraph.ts` · `SubgraphView.tsx` |
| Travessia por padrão no banco | `(u)-[:RATED]->(m)<-[:RATED]-(v)` e `shortestPath` em Cypher | `graphQueries.ts` |

Por que o grafo resolve melhor do que o modelo relacional: a pergunta "o que pessoas parecidas com u assistiram?" exige três cópias encadeadas da tabela de avaliações num banco relacional. No grafo, ela é o próprio desenho do caminho, e cada salto segue as listas de adjacência (doc 01, seção 7).

## 5. Escopo do MVP (doc 05) × entregue

| # | Item | Status | Evidência / como verificar |
|---|---|---|---|
| E1 | Grafo bipartido no Neo4j | ✅ | `npm run etl` → `{ users: 602, movies: 3650, edges: 90137 }` · `/api/health` |
| E2 | Algoritmo por vizinhança + PoC | ✅ | `npm run recommend -- --user=1` · exemplo do doc 02 em `tests/recommend.test.ts` |
| E3 | API REST | ✅ | `/api/recommendations?userId=1` · 404 para `userId=999999` |
| E4 | Tela de consulta | ✅ | `/` → escolher perfil ou buscar → `/perfil/1` |
| E5 | Explicação da recomendação | ✅ | perfil ("Para quem amou…") e filme ("Por que indicamos para você") |
| E6 | Métricas de grafo na interface | ✅ | `/como-funciona`: top filmes por grau e caminho mínimo entre dois usuários (memória × Cypher) |
| E7 | Deploy público | ✅ | <https://cinegraph-six.vercel.app> · deploy a cada push, migrações automáticas e cron diário de keep-alive (Vercel → Schedules → Cron Jobs) |
| E8 | Testes de carga | ✅ | `docs/06-testes-de-carga.md` · `npm run loadtest -- --db` |
| E9 | Visualização do grafo | ✅ | `/perfil/1#grafo`: 4 camadas, vértices por tipo, espessura da aresta = nota, notas ao passar o mouse |
| E10 | Documentação | ✅ | README + docs 01–07 |

Verificação automática: `npm test` roda 33 testes (grafo, algoritmo, recorte da visualização e migrações). Além disso, o recorte foi conferido para os 602 usuários reais: nenhum vértice desenhado fica sem aresta. A interface é verificada pelo roteiro da seção 8.

## 6. Cronograma planejado × realizado

| Marco | Planejado | Realizado | Observação |
|---|---|---|---|
| Modelo conceitual | 28/08 | entregue (consolidado em 25/09) | doc 01 |
| Algoritmo definido | 04/09 | entregue (consolidado em 25/09) | doc 02 |
| Stack + hello graph | 11/09 | entregue (consolidado em 25/09) | doc 03; persistência trocada para Neo4j em 25/09 (MC-01) |
| EAP + dataset carregado | 18/09 | entregue · carga no Aura em 24/09 | doc 04 |
| P1 + escopo congelado | 25/09 | 25/09 | doc 05 · entrega consolidada em `CineGraph-Entregas-25-09.docx` |
| CP1 · PoC no terminal | 02/10 | **antecipado (até 25/09)** | `npm run recommend` |
| CP2 · API | 09/10 | **antecipado (até 25/09)** | `/api/recommendations` |
| CP3 · ponta a ponta | 16/10 | **antecipado (até 25/09)**, exceto o caminho mínimo na tela | telas de perfil, filme e "Como funciona" |
| CP4 · testes de carga | 23/10 | **11/11** | doc 06 |
| CP5 · visualização + aplicação completa | 30/10 | **11/11** | subgrafo no perfil, caminho mínimo na interface, doc 07 |
| Seminários | 03/11 · 13/11 · 20/11 | _a preencher pela equipe_ | roteiro na seção 8 |

Os checkpoints 1 a 3 foram entregues antes do prazo porque a equipe priorizou o algoritmo-core, como o TAP prevê na mitigação do risco de desalinhamento. Os checkpoints 4 e 5 foram concluídos depois das datas previstas. _Motivo do atraso e impacto: a preencher pelo GP._

### Registro dos checkpoints de sincronização (EAP 1.4)

A definição de pronto (doc 05, seção 5) exige revisão por outro integrante. **A equipe preenche esta tabela**; ela não deve ser preenchida sem a revisão ter acontecido.

| Checkpoint | Data | Itens revisados | Revisor(es) | Resultado |
|---|---|---|---|---|
| CP1–CP3 | | E2, E3, E4, E5 | | |
| CP4 | | E8 (doc 06) | | |
| CP5 | | E6, E9, E10 | | |

## 7. Riscos do TAP × o que aconteceu

| Risco (TAP) | Mitigação prevista | O que foi feito |
|---|---|---|
| Atraso na definição do escopo | fechar o tema cedo | escopo congelado em 25/09, com controle de mudanças (MC-01, MC-02) |
| Dataset esparso / cold start | filtrar por mínimo de avaliações | filtros filme ≥ 5 e usuário ≥ 20; suavização λ = 2 no score; fallback por popularidade (grau) |
| Desempenho ruim em grafos grandes | medir no CP4 e otimizar | doc 06: o algoritmo leva poucos ms em memória e cresce como a teoria prevê. Duas otimizações saíram das medições: a carga (22,7 s → 3,7 s, arestas agrupadas por usuário) e o caminho mínimo (16,9 → 0,1 ms, BFS que para ao achar o destino) |
| Grafo grande ilegível | amostragem ou agrupamento | desenho de um recorte de até 19 vértices (top vizinhos, top recomendações, pontes mais compartilhadas), em colunas por salto |
| Desalinhamento entre as frentes | contrato de interface cedo | `types.ts` (RecommendationResult) fixado no doc 02 antes da API e da interface |
| Ser visto como "caixa-preta" | expor a lógica do grafo | cada recomendação mostra vizinhos e filmes em comum; tour animado dos saltos; desenho do subgrafo; mesmas travessias em Cypher |

Riscos novos, com mitigação:

| Risco | Mitigação |
|---|---|
| AuraDB Free pausa após 3 dias sem uso | cron diário `/api/cron/keepalive` + conferir `/api/health` antes de apresentar |
| Banco fora do ar na hora da demo | modo demo automático com o grafo de exemplo + plano B local (doc 03, seção 3.7) |
| Primeira requisição lenta numa instância nova da Vercel (carga do grafo, até ~12 s) | pré-carga em `instrumentation.ts`, cache das telas (`pageData.ts`) e aquecer o site antes da aula |

## 8. Roteiro da demonstração (EAP 6.2)

Antes da aula: abrir `/api/health` (deve responder `"ok": true`) e `/perfil/1` uma vez, para aquecer a instância.

| # | Tela | O que mostrar | O que falar |
|---|---|---|---|
| 1 | `/` | escolher o Perfil 1 ou buscar um filme | os perfis são usuários anônimos do MovieLens |
| 2 | `/perfil/1` | recomendações com "Para quem amou…" | cada recomendação vem de pessoas com gosto parecido |
| 3 | `/perfil/1#grafo` | o desenho do subgrafo; passar o mouse num vizinho | as 4 colunas são os saltos u → m → v → m'; a espessura é a nota; a similaridade aparece sob cada vizinho; as pessoas do desenho são as mesmas de "Pessoas com gosto parecido": as que sustentam as recomendações exibidas |
| 4 | `/filme/<id>?perfil=1` | "Por que indicamos para você" | o caminho no grafo vira explicação em linguagem simples |
| 5 | `/como-funciona` | tour animado no grafo de exemplo | os mesmos números do exemplo resolvido do doc 02 (A Origem 5,00; Procurando Nemo ≈ 4,60) |
| 6 | `/como-funciona` | top filmes por grau; vizinhança de 2 saltos (memória × Cypher) | grau = popularidade; 2 saltos alcançam > 90% dos usuários, por isso o top-K por similaridade |
| 7 | `/como-funciona?user=1` | caminho mínimo até o usuário mais distante | BFS; comprimento sempre par; quase todos estão a 2 arestas (mundo pequeno) |
| 8 | terminal | `npm run recommend -- --user=1` | o algoritmo roda isolado, sem interface (PoC do CP1) |
| 9 | Neo4j Browser | `MATCH p=(:User {id:1})-[:RATED]->(:Movie)<-[:RATED]-(:User) RETURN p LIMIT 50` | o grafo está de fato num banco orientado a grafos |
| 10 | doc 06 | tabelas de carga | memória em ms × Cypher dominado pela rede; mesmos resultados |

Plano B: sem internet ou com o banco fora, o site entra em modo demo (grafo de exemplo) e o roteiro 5 a 8 continua funcionando; ou roda local (`npm ci && npm run dev`).

## 9. Limitações e trabalhos futuros

- Dataset pequeno (`ml-latest-small`) por restrição do plano gratuito. O algoritmo é O(|E| + C log C) por consulta, então escala para os MovieLens maiores com mais memória.
- Sem avaliação offline de qualidade (ex.: separar notas para teste e medir precisão). É o próximo passo natural para comparar λ, K e minCommon.
- O grafo é somente leitura (fora do escopo). Novas avaliações exigiriam atualizar a lista de adjacência e as normas incrementalmente.
- As limitações das medições estão no doc 06, seção 6.

## 10. Pendências da equipe

| Pendência | Responsável |
|---|---|
| Preencher o registro de checkpoints (seção 6) e o motivo do atraso de CP4/CP5 | Pedro + equipe |
| Slides da apresentação (EAP 6.2) | Todos |
