# 06 · Relatório de testes de carga

> Marco do TAP: **23/10 — Checkpoint 4: aplicação satisfatoriamente operável, com testes de carga.**
> Item do escopo: **E8** (doc 05) · EAP 5.1, 5.2 e 5.3 · Responsável: Rogeres · Medido em 11/11/2026

## 1. Objetivo

Medir o tempo de **carga** e de **consulta** do grafo com 100, 300 e 602 usuários e comparar três estratégias (doc 02, seção 6.1):

- **memória:** travessia em TypeScript puro, `src/server/graph`;
- **Cypher:** a mesma travessia feita pelo Neo4j, `src/server/db/graphQueries.ts`;
- **híbrida:** salto 2 no Neo4j, já com o produto escalar; similaridade e top-K em memória.

Também conferir que as estratégias dão o mesmo resultado e medir o **alcance** da vizinhança de 2 saltos, como o doc 02 havia previsto.

## 2. Método

Um único script faz tudo, para qualquer integrante repetir. A lógica de medição fica em `src/server/services/benchService.ts`, compartilhada pelo terminal e pela Vercel.

```bash
npm run loadtest                                   # só memória (lê os CSVs, sem banco)
npm run loadtest -- --db                           # memória × Cypher × híbrida no Neo4j AuraDB
npm run loadtest:remote -- --url=https://….vercel.app   # mesmas medições rodando dentro da Vercel
```

| Aspecto | Como foi feito |
|---|---|
| Subgrafos | os mesmos filtros do ETL (filme ≥ 5 avaliações, usuário ≥ 20), mantendo os **N primeiros usuários** por id (`--max-users=N`) |
| Carga no banco | para cada N, `etl --reset --max-users=N` apaga e recarrega o Neo4j; no fim, o grafo completo é restaurado (também em caso de erro) |
| Amostra | 30 usuários espalhados de forma uniforme pelo subgrafo; para o caminho mínimo, 30 pares desses usuários |
| Consultas | **2 saltos** (u → m → v, top-20 por filmes em comum), **híbrida** (top-30 vizinhos por cosseno), **caminho mínimo** entre dois usuários e **recomendação completa** (`recommend()`, 3 saltos) |
| Rede | 30 consultas `RETURN 1`, que não tocam no grafo: a ida e volta mínima até o AuraDB |
| Tempo no banco | `resultAvailableAfter + resultConsumedAfter` do resumo do driver: o tempo que o próprio Neo4j informa, sem a rede (resolução de 1 ms) |
| Aquecimento | uma chamada descartada antes de medir (JIT do Node e conexão com o banco) |
| Estatística | mediana e p95 em ms; a carga do Neo4j pela aplicação foi repetida 3 vezes |
| Conferência | para cada usuário e par, compara com a memória: o top-20 de 2 saltos, a lista dos 30 vizinhos da híbrida e o comprimento do caminho mínimo |

Ambiente: Node 22.23 no Windows 10, notebook da equipe → Neo4j **AuraDB Free** pela internet.

## 3. Resultados

### 3.1 Carga

| Usuários | Filmes | Arestas | Montar grafo em memória (CSV) | ETL no Neo4j | Carga do Neo4j pela aplicação (mediana / p95) |
|---:|---:|---:|---:|---:|---:|
| 100 | 2.987 | 14.181 | 7 ms | 13,7 s | 1,3 s / 3,3 s |
| 300 | 3.608 | 41.959 | 14 ms | 13,9 s | 1,6 s / 2,0 s |
| 602 | 3.650 | 90.137 | 61 ms | 23,4 s | 2,5 s / 3,1 s |

A carga pela aplicação variou entre as rodadas do mesmo dia. Com 602 usuários, as medianas foram 2,8 s, 5,9 s e 2,5 s, porque a AuraDB Free é compartilhada e oscila.

### 3.2 Consultas: tempo total visto pela aplicação (mediana / p95, ms)

| Usuários | 2 saltos · memória | 2 saltos · Cypher | Híbrida | Caminho mínimo · memória¹ | Caminho mínimo · Cypher | Só rede (`RETURN 1`) | Recomendação completa · memória |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 | 0,2 / 0,9 | 475 / 512 | 475 / 630 | 3,0 / 5,2 | 473 / 631 | 476 / 643 | 3,0 / 8,0 |
| 300 | 0,3 / 1,7 | 476 / 485 | 481 / 640 | 8,0 / 8,8 | 475 / 634 | 471 / 478 | 2,8 / 7,0 |
| 602 | 0,7 / 4,6 | 478 / 525 | 485 / 635 | 16,9 / 19,7 | 472 / 497 | 473 / 631 | 2,7 / 15,1 |

¹ Antes da otimização da seção 5. Depois dela: 0,1 / 0,3 ms (100), 0,1 / 0,2 ms (300) e 0,1 / 10,0 ms (602).

### 3.3 Dentro do Neo4j, alcance e conferência

| Usuários | 2 saltos · Neo4j | Híbrida · Neo4j | Caminho mínimo · Neo4j | `RETURN 1` · Neo4j | Alcance dos 2 saltos (média) | Divergências (2 saltos / híbrida / caminho) |
|---:|---:|---:|---:|---:|---:|---:|
| 100 | 2 / 11 | 3 / 11 | 1 / 8 | 1 / 1 | 92,7% | 0 / 0 / 0 |
| 300 | 2 / 7 | 3 / 13 | 1 / 8 | 1 / 1 | 92,5% | 0 / 0 / 0 |
| 602 | 4 / 17 | 5 / 44 | 1 / 10 | 1 / 1 | 91,7% | 0 / 0 / 0 |

### 3.4 A partir da Vercel

_A preencher após o deploy:_ copie para o `.env.local` o mesmo `CRON_SECRET` configurado na Vercel (hoje ele está vazio no `.env.local`) e rode `npm run loadtest:remote -- --url=<URL do site>`. A rota `/api/bench` só lê (não recarrega o banco), exige o `CRON_SECRET` e mede o grafo completo. Ela mostra a latência real entre o servidor da Vercel e o AuraDB, que é a que o usuário do site sente.

## 4. Análise

1. **As três estratégias dão o mesmo resultado.** Em 270 comparações (90 por tamanho), as listas de vizinhos e os comprimentos de caminho coincidiram. O Neo4j é usado só para percorrer padrões; a similaridade, o top-K e o score continuam no código da equipe.
2. **A rede domina o Cypher.** Toda consulta Cypher leva ~475 ms vistos pela aplicação, o mesmo que um `RETURN 1`. O próprio Neo4j informa que gasta só 1 a 5 ms por travessia. Ou seja, mais de 99% do tempo é ida e volta pela internet até o AuraDB, e não o algoritmo.
3. **Dentro do banco, o custo cresce com o grafo, como a teoria prevê.** Os 2 saltos levam de 2 a 4 ms (O(Σ grau(m)) para m ∈ N(u)), e o p95 da híbrida sobe de 11 para 44 ms com 602 usuários, porque a soma do produto escalar percorre mais arestas.
4. **Em memória, cada consulta segue a complexidade do doc 02:**
   - **2 saltos** fica abaixo de 1 ms.
   - **Recomendação completa** fica entre 2,7 e 3 ms em qualquer tamanho, porque o salto 3 só percorre os 30 melhores vizinhos (corte top-K). O custo depende de K, não do total de usuários.
   - **Caminho mínimo** crescia na mesma proporção das arestas (3,0 → 8,0 → 16,9 ms para 14 mil → 42 mil → 90 mil arestas). Era uma BFS que visitava o grafo inteiro, O(|V| + |E|). Ver seção 5.
5. **Alcance (mundo pequeno):** os 2 saltos alcançam em média **92%** dos outros usuários, em qualquer tamanho, porque os filmes populares ligam quase todo mundo. Isso confirma, com medição, a observação do doc 02: sem a similaridade cosseno e o corte top-K, "vizinho" não discriminaria nada.
6. **O caro é a carga, e ela acontece uma vez.**
   - O ETL leva de 14 a 23 s, contando apagar o grafo anterior e gravar em lotes de 5.000 pela rede. Só roda quando o dataset muda.
   - A aplicação lê o grafo do Neo4j uma vez por instância do servidor (1,3 a 2,5 s, com picos de ~12 s), com cache em `globalThis` e pré-carga em `instrumentation.ts`.

## 5. Otimizações (EAP 5.3)

| Gargalo encontrado | Otimização | Resultado |
|---|---|---|
| Carga do grafo trazendo 1 registro por aresta (90.137 registros) | arestas agrupadas por usuário com `collect` (602 registros) | 22,7 s → 3,7 s (feita em 24/09, EAP 3.4) |
| Caminho mínimo em memória visitava o grafo inteiro antes de montar o caminho; o `shortestPath` do Neo4j levava ~1 ms | a BFS para assim que descobre o destino (`bfs(…, stopAt)`); na BFS, a primeira descoberta já é pelo caminho mínimo | mediana de 16,9 ms → **0,1 ms** com 602 usuários; testes e comprimentos inalterados |

As outras consultas não têm gargalo: a recomendação completa leva poucos ms e não depende do tamanho do grafo.

**Arquitetura confirmada:** o Neo4j fica como persistência e como prova de que a travessia também roda no banco. As telas usam o grafo em memória, que responde em milissegundos. A estratégia híbrida não compensa com o banco na nuvem: ela paga a mesma ida e volta (~475 ms) do Cypher puro.

**Para a demo:** a primeira requisição de uma instância nova da Vercel paga a carga. Antes de apresentar, abra `/api/health` e uma página de perfil.

## 6. Limitações

- As tabelas 3.1 a 3.3 foram medidas do notebook da equipe. A seção 3.4 mede a partir da Vercel.
- O tempo interno do Neo4j tem resolução de 1 ms e não inclui a serialização no driver.
- Os subgrafos usam os N primeiros usuários por id, não uma amostra aleatória, para seguir o mesmo critério do `--max-users` do ETL.
- A AuraDB Free é compartilhada: a carga variou até 2× entre rodadas seguidas.
- `npm run loadtest -- --db` recarrega o banco que o site usa. Durante a medição (~4 min), o site pode ler um grafo parcial. Depois de rodar, faça um redeploy, ou espere a instância da Vercel ser reciclada.
