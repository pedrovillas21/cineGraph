# Migrações do Neo4j (estilo Flyway)

| Comando | O que faz |
|---|---|
| `npm run db:new -- "descrição"` | cria o próximo arquivo `V<n>__descricao.cypher` |
| `npm run db:migrate` | valida e aplica as pendentes, em ordem de versão |
| `npm run db:info` | lista cada versão: aplicada, pendente, alterada ou ausente |
| `npm run db:validate` | só valida, sem aplicar |

Elas também rodam **sozinhas**:
- no deploy de **produção** da Vercel (script `vercel-build`). Previews não migram;
- no início do ETL (`npm run etl`).

## Regras

1. **Nunca edite uma migração já aplicada.** O checksum SHA-256 fica gravado no nó `(:__Migration)` e o `migrate` para com erro se o arquivo mudar. Para corrigir algo, crie uma nova versão.
2. Escreva **um comando Cypher por `;` no fim da linha**. Linhas começando com `//` são comentários.
3. No Neo4j, comandos de schema (constraints e índices) não dividem transação com escrita de dados, então cada comando roda na própria transação. Escreva comandos **idempotentes** (`IF NOT EXISTS`, `MERGE`): se algo falhar no meio, basta rodar de novo.
4. Não use versões menores que a última aplicada.

O histórico pode ser consultado no Neo4j Browser:

```cypher
MATCH (m:__Migration) RETURN m ORDER BY m.version
```
