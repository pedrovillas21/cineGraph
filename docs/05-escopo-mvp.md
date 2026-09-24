# 05 · Escopo do MVP (congelado)

> Marco do TAP: **25/09 — P1 e escopo do MVP congelado.**
> Aprovação: Pedro (GP) · Validação: prof. Roger Rocha Ferreira (PI3B)

A partir de 25/09, **qualquer item fora desta lista só entra com aprovação do GP**, e apenas se não comprometer um checkpoint.

## 1. Objetivo do MVP

Dado um usuário do MovieLens, a aplicação web recomenda filmes percorrendo o grafo bipartido usuário–filme e **mostra o caminho que justifica cada recomendação**, com o algoritmo implementado pela equipe.

## 2. Dentro do escopo

| # | Funcionalidade | Critério de aceite | Checkpoint |
|---|---|---|---|
| E1 | Grafo bipartido num banco orientado a grafos | 602 `:User`, 3.650 `:Movie` e 90.137 `:RATED` no Neo4j AuraDB; schema versionado por migrações | 25/09 |
| E2 | Algoritmo de recomendação por vizinhança (doc 02) | `npm run recommend -- --user=1` imprime top-10 com score e vizinhos; exemplo do doc 02 vira teste automatizado | CP1 · 02/10 |
| E3 | API REST | `GET /api/recommendations?userId=&k=` devolve JSON no contrato de `types.ts`; 404 para usuário inexistente | CP2 · 09/10 |
| E4 | Tela de consulta | escolher/buscar usuário e ver as recomendações | CP3 · 16/10 |
| E5 | Explicação da recomendação | cada filme mostra os vizinhos que o sustentam e os filmes em comum (u → m → v → m') | CP3 · 16/10 |
| E6 | Métricas de grafo na interface | top filmes por grau; caminho mínimo entre dois usuários | CP3 · 16/10 |
| E7 | Deploy público | URL na Vercel acessível de qualquer navegador | CP3 · 16/10 |
| E8 | Testes de carga | tempo de carga e de consulta com 100, 300 e 602 usuários, comparando travessia em memória × Cypher, em relatório | CP4 · 23/10 |
| E9 | Visualização do grafo | desenho do subgrafo u → vizinhos → recomendações (nós coloridos por tipo, arestas com peso) | CP5 · 30/10 |
| E10 | Documentação | README + docs 01–05 atualizados | CP5 · 30/10 |

## 3. Fora do escopo

| Item | Motivo |
|---|---|
| Cadastro, login e autenticação | usuários são os perfis anonimizados do MovieLens |
| Usuário criar ou alterar avaliações pela interface | o grafo é somente leitura no MVP |
| Qualquer biblioteca de machine learning, embeddings ou IA | restrição metodológica do TAP |
| Bibliotecas prontas de algoritmos de grafo (incl. Neo4j Graph Data Science) | a equipe implementa BFS, grau e similaridade; o Cypher é usado só para travessias por padrão |
| Dataset MovieLens maior (25M/32M) | o `ml-latest-small` basta para o objetivo; risco de desempenho e de limite do plano grátis |
| Endpoints de recomendação de APIs externas (ex.: `/recommendations` e `/similar` do TMDB) | seriam recomendação pronta ("caixa-preta"); o TMDB é usado **só** para metadados (ver MC-02) |
| Aplicativo mobile nativo | a interface web responsiva basta |
| Infraestrutura paga | restrição de recursos do TAP |

## 4. Premissas do MVP

- Dataset: MovieLens `ml-latest-small`, filtrado com filme ≥ 5 avaliações e usuário ≥ 20.
- Parâmetros padrão do algoritmo: `k = 10`, `neighbors = 30`, `minCommon = 3`, `minSupport = 2`. Ajustes finos são permitidos sem mudar o escopo.
- Banco de dados orientado a grafos: **Neo4j AuraDB Free** (exigência da disciplina), mantido ativo por um cron diário.
- A aplicação continua funcional em **modo demo** (grafo de exemplo) se o banco estiver indisponível.
- Runtime único: Node.js 22 LTS.

## 5. Definição de pronto

Um item só está pronto quando:

1. roda na URL pública da Vercel;
2. tem teste (algoritmo) ou roteiro de verificação manual (interface);
3. está documentado no README ou em `docs/`;
4. foi revisado por outro integrante no checkpoint.

## 6. Controle de mudanças

Pedidos de mudança são registrados como *issue* no repositório com o rótulo `mudança-de-escopo`. O GP avalia o impacto nos checkpoints e decide. Mudanças que afetem as avaliações passam pelo professor.

### Registro de mudanças

| Id | Data | Mudança | Motivo | Impacto | Aprovação |
|---|---|---|---|---|---|
| MC-01 | 25/09 | Persistência trocada de PostgreSQL (Supabase) para **Neo4j AuraDB** | exigência do professor de usar banco orientado a grafos | ETL e camada de acesso reescritos; migrações passam a ser Cypher; nenhum checkpoint adiado | Prof. Roger (exigência) · GP |
| MC-02 | 25/09 | Inclusão de **metadados do TMDB** (pôster, sinopse, título pt-BR), antes fora do escopo | dados reais de filmes deixam a demo mais clara | só no ETL e na interface; grafo e algoritmo inalterados; endpoints de recomendação do TMDB proibidos; atribuição exigida pelos termos do TMDB no rodapé | GP (Pedro) |
