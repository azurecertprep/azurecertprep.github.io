---
sidebar_position: 13
title: "Challenge 46: Design Database Migration"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 46: Design Database Migration

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 30-35%**

:::

## Introducao

A GlobalRetail Corp opera um estate de dados empresarial de 30 bancos de dados suportando sua plataforma de e-commerce, gerenciamento de cadeia de suprimentos e sistemas de relatorios financeiros. O inventario de bancos de dados inclui: 15 instancias SQL Server (versoes 2012 a 2022, variando de 50GB a 2TB), 8 bancos de dados PostgreSQL (versoes 11-15, suportando seu catalogo de produtos e servicos de busca), 5 bancos de dados MySQL (suportando CMS legado e plataformas de marketing) e 2 bancos de dados Oracle (suportando seus sistemas ERP e de gerenciamento de armazem).

Os requisitos de migracao variam significativamente entre bancos de dados: o banco de dados de e-commerce (SQL Server 2022, 2TB) serve 50.000 transacoes por hora e nao pode tolerar mais de 5 minutos de inatividade. O banco de dados de relatorios financeiros requer um periodo completo de execucao paralela para conformidade de auditoria. Os bancos de dados CMS legados em MySQL sao candidatos para modernizacao. O banco de dados Oracle ERP tem stored procedures complexas com sintaxe especifica de Oracle que complica a migracao.

A equipe de DBAs precisa de uma estrategia de migracao abrangente que enderece avaliacao de compatibilidade, selecao de servico alvo (Azure SQL Database vs. Managed Instance vs. SQL em VM, e decisoes equivalentes para PostgreSQL e MySQL), metodo de migracao (online vs. offline) e validacao pos-migracao para cada banco de dados.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para migrar bancos de dados

## Tarefas de Design

### Parte 1: Avaliacao de Compatibilidade

1. Projete a abordagem de avaliacao para cada engine de banco de dados:
   - SQL Server: Use avaliacao de migracao Azure SQL (Data Migration Assistant ou Azure Migrate) para identificar problemas de compatibilidade, recursos bloqueadores e alvo recomendado (Azure SQL DB, SQL MI ou SQL em VM)
   - PostgreSQL: Avalie compatibilidade com Azure Database for PostgreSQL Flexible Server, identifique extensoes ou recursos nao suportados
   - MySQL: Avalie compatibilidade com Azure Database for MySQL Flexible Server
   - Oracle: Avalie caminhos de migracao (Oracle para Azure SQL MI via SSMA, Oracle para PostgreSQL via Ora2Pg, ou Oracle em Azure VM)
2. Para os bancos de dados SQL Server, documente quais recursos forcam alvos especificos:
   - Consultas cross-database (requer SQL MI ou SQL em VM)
   - SQL Server Agent jobs (requer SQL MI ou SQL em VM)
   - CLR assemblies (suporte limitado no Azure SQL DB)
   - Linked servers (requer SQL MI ou SQL em VM)
   - Tamanho de banco de dados > 100GB (Azure SQL DB Hyperscale ou SQL MI)
3. Crie uma matriz de decisao mapeando cada banco de dados para seu alvo Azure recomendado com justificativa.

### Parte 2: Estrategia de Migracao Online vs. Offline

4. Categorize cada banco de dados para migracao online (replicacao continua) vs. offline (copia unica):
   - Online: bancos de dados que requerem < 5 minutos de inatividade (e-commerce, servicos em tempo real)
   - Offline: bancos de dados que podem tolerar janelas de manutencao (relatorios, processamento em lote)
5. Projete a arquitetura de migracao online usando Azure Database Migration Service:
   - SQL Server para Azure SQL MI: sincronizacao de dados continua com cutover
   - PostgreSQL para Azure Database for PostgreSQL: servico de migracao com replicacao online
   - MySQL para Azure Database for MySQL: migracao online com DMS
6. Calcule a timeline de migracao para cada banco de dados baseado em:
   - Tamanho do banco de dados e largura de banda de rede disponivel
   - Tempo de backup/restore completo inicial
   - Lag de replicacao de change data capture (CDC) continuo
   - Coordenacao da janela de cutover

### Parte 3: Cenarios de Migracao Complexos

7. Projete a estrategia de migracao para o banco de dados SQL Server de e-commerce de 2TB com requisito de 5 minutos de inatividade:
   - Pre-stage: configure Azure SQL MI com service tier e dimensionamento apropriados
   - Replicar: sincronizacao de dados continua do SQL Server on-premises para MI
   - Validar: comparar contagens de registros, checksums e conectividade da aplicacao
   - Cutover: parar escritas, permitir replicacao alcançar, redirecionar aplicacoes
8. Projete a abordagem de migracao do Oracle ERP:
   - Opcao A: Migrar para Azure SQL MI usando SQL Server Migration Assistant (SSMA) para conversao de schema/dados
   - Opcao B: Migrar para PostgreSQL usando Ora2Pg para conversao de schema
   - Opcao C: Rehost Oracle em Azure VM (manter licenciamento Oracle no Azure)
   - Documente trade-offs de cada opcao incluindo custos de licenciamento, esforco de refatoracao de codigo e timeline
9. Enderece o requisito de execucao paralela do banco de dados financeiro:
   - Projete uma arquitetura de dual-write ou estrategia de read-replica
   - Defina criterios de validacao para declarar o alvo Azure como autoritativo
   - Documente o processo de sign-off de conformidade

### Parte 4: Validacao e Otimizacao Pos-Migracao

10. Projete procedimentos de validacao pos-migracao:
    - Integridade de dados: comparacao de contagem de linhas, validacao de checksum em tabelas-chave
    - Performance: comparacao de tempo de execucao de queries (baseline vs. Azure)
    - Teste de aplicacao: suites de teste funcional contra bancos de dados Azure
    - Teste de failover: verificar capacidades de HA/DR no alvo Azure
11. Projete passos de otimizacao de performance para pos-migracao:
    - Azure SQL MI: avaliar e ajustar service tier (General Purpose vs. Business Critical)
    - Recomendacoes de indice usando Azure SQL Database Advisor
    - Query performance insights para identificar queries com regressao
12. Documente a estrategia de rollback para cada migracao de banco de dados: o que dispara um rollback, por quanto tempo voce pode manter capacidade de rollback, e qual reconciliacao de dados e necessaria se Azure foi primario por algum periodo.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-46"
  items={[
    "Compatibility assessment identifies blocking features for each SQL Server database with recommended Azure target",
    "Decision matrix maps all 30 databases to Azure targets (SQL DB, SQL MI, SQL VM, PostgreSQL Flex, MySQL Flex) with justification",
    "Online migration architecture designed for databases requiring less than 5 minutes downtime",
    "Oracle migration strategy evaluates at least 3 options (SQL MI, PostgreSQL, Oracle on VM) with trade-off analysis",
    "Post-migration validation covers data integrity, performance comparison, and application testing procedures",
    "Rollback strategy documented with triggers, timeline, and data reconciliation procedures"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Selecao de Alvo Azure SQL</summary>

Escolha **Azure SQL Database** para: aplicacoes cloud-born, workloads de banco de dados unico, cenarios serverless/sensíveis a custo e aplicacoes que nao usam consultas cross-database ou SQL Agent. Escolha **Azure SQL Managed Instance** para: lift-and-shift de workloads SQL Server, aplicacoes usando consultas cross-database, linked servers, CLR ou SQL Agent. Escolha **SQL Server em Azure VM** para: aplicacoes que requerem acesso completo em nivel de SO, versoes especificas de SQL Server ou recursos nao disponiveis em MI (como FILESTREAM, software de terceiros instalado junto com SQL Server).

</details>

<details>
<summary>Dica 2: Migracao Online com DMS</summary>

Azure Database Migration Service (DMS) para migracao online para SQL MI usa log shipping e replicacao transacional para sincronizar dados continuamente do SQL Server de origem. O backup completo inicial e restaurado no MI, entao backups de transaction log sao aplicados continuamente. Durante o cutover, a aplicacao para de escrever na origem, o backup de log final e aplicado ao MI, e a aplicacao reconecta ao MI. Tempo total de inatividade no cutover e tipicamente de segundos a minutos dependendo do tamanho do transaction log final.

</details>

<details>
<summary>Dica 3: Complexidade da Migracao Oracle</summary>

Migracoes de Oracle para Azure sao complexas devido a: stored procedures PL/SQL (sem equivalente direto em T-SQL ou PL/pgSQL), tipos de dados especificos de Oracle (NUMBER, VARCHAR2), sequences, synonyms e package bodies. SSMA pode converter aproximadamente 70-80% do codigo Oracle para T-SQL automaticamente, mas PL/SQL complexo requer refatoracao manual. Ora2Pg fornece conversao similar para PostgreSQL. Sempre execute uma conversao somente de schema primeiro para avaliar o esforco de refatoracao manual antes de se comprometer com um caminho de migracao.

</details>

<details>
<summary>Dica 4: Servico de Migracao PostgreSQL</summary>

Azure Database for PostgreSQL tem um servico de migracao integrado (separado do DMS) que suporta migracao online e offline de PostgreSQL on-premises, AWS RDS e outras fontes cloud. Para migracao online, ele usa replicacao logica (requer PostgreSQL 10+ com logical decoding habilitado). Consideracoes-chave: todas as tabelas devem ter chaves primarias para migracao online, large objects (LOBs) requerem tratamento especial, e algumas extensoes podem nao estar disponiveis no Azure Database for PostgreSQL Flexible Server.

</details>

<details>
<summary>Dica 5: Tamanho de Banco de Dados e Tempo de Migracao</summary>

Para um banco de dados de 2TB sobre uma conexao ExpressRoute de 1Gbps: tempo teorico de transferencia e aproximadamente 4,5 horas (2TB / 1Gbps). Na pratica, considere overhead: backup/restore inicial pode levar 6-8 horas, mais transaction log shipping continuo. A janela de cutover so precisa cobrir o delta final (transacoes desde o ultimo backup de log), que para um banco de dados de 50.000 tx/hora pode ser minutos de tempo de replay. Inicie a replicacao 1-2 semanas antes do cutover para garantir que a replica esteja totalmente atualizada.

</details>

## Recursos de Aprendizagem

- [Azure Database Migration Service overview](https://learn.microsoft.com/en-us/azure/dms/dms-overview)
- [Azure SQL migration assessment](https://learn.microsoft.com/en-us/azure/azure-sql/migration-guides/managed-instance/sql-server-to-managed-instance-overview)
- [Migration service in Azure Database for PostgreSQL](https://learn.microsoft.com/en-us/azure/postgresql/migrate/migration-service/overview-migration-service-postgresql)
- [Migrate Oracle to Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/migration-guides/managed-instance/oracle-to-managed-instance-guide)
- [DMS supported migration scenarios](https://learn.microsoft.com/en-us/azure/dms/resource-scenario-status)
- [Azure SQL Managed Instance features](https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/sql-managed-instance-paas-overview)

## Verificacao de Conhecimento

<details>
<summary>1. Um banco de dados SQL Server 2012 usa consultas cross-database, SQL Agent jobs e tem tamanho de 500GB. Qual alvo Azure e apropriado e por que?</summary>

**Azure SQL Managed Instance.** Todos os tres requisitos apontam para SQL MI: (1) Consultas cross-database sao suportadas dentro da mesma instancia MI mas nao no Azure SQL Database, (2) SQL Agent e integrado ao MI com suporte completo de agendamento de jobs mas nao disponivel no Azure SQL Database, (3) 500GB esta bem dentro dos limites do MI (ate 16TB) mas excede limites do tier padrao do Azure SQL Database (requer Hyperscale). Adicionalmente, o nivel de compatibilidade do SQL Server 2012 e suportado pelo MI, permitindo lift-and-shift sem mudancas na aplicacao.

</details>

<details>
<summary>2. Um banco de dados de e-commerce lida com 50.000 transacoes por hora e requer menos de 5 minutos de inatividade durante a migracao. Qual metodo de migracao e estrategia de cutover voce deve usar?</summary>

**Migracao online com sincronizacao continua do DMS e cutover coordenado.** Passos: (1) Configure DMS com modo de migracao online para replicar continuamente do SQL Server de origem para o SQL MI alvo, (2) Permita sincronizacao completa inicial e log shipping continuo por 1-2 semanas ate o lag de replicacao ser minimo (segundos), (3) Durante um periodo de baixo trafego, habilite modo de manutencao da aplicacao (para novas transacoes), (4) Espere a replicacao final completar (segundos a minutos), (5) Redirecione connection strings da aplicacao para MI, (6) Desabilite modo de manutencao. Tempo total de inatividade: o tempo desde parar escritas ate completar a mudanca de DNS/connection string, tipicamente 2-5 minutos.

</details>

<details>
<summary>3. Um banco de dados Oracle tem 500 stored procedures com PL/SQL. A equipe quer migrar para Azure SQL Managed Instance. Qual e o risco primario e como voce o avalia?</summary>

**Completude da conversao de codigo e equivalencia funcional.** Conversao de PL/SQL para T-SQL nao e 1:1. Execute SSMA contra o schema Oracle para gerar um relatorio de avaliacao mostrando: porcentagem de codigo que converte automaticamente, procedures que requerem refatoracao manual, construtos nao suportados (transacoes autonomas, nested tables, pacotes built-in especificos de Oracle). O risco e que os 20-30% que requerem conversao manual contem logica de negocio critica. Mitigacao: orce 3-6 meses de esforco de DBA/desenvolvedor para refatoracao, cobertura abrangente de testes de todas as stored procedures, e considere manter Oracle em Azure VM como fallback se o esforco de refatoracao exceder o orcamento.

</details>

<details>
<summary>4. Apos migrar um banco de dados PostgreSQL para Azure Database for PostgreSQL Flexible Server, a performance de queries degrada 40%. O tamanho do banco de dados e tier da VM correspondem a configuracao on-premises. O que voce deve investigar?</summary>

**Parametros do servidor, connection pooling e latencia de rede.** Causas comuns: (1) Parametros do PostgreSQL nao ajustados para Azure (shared_buffers, work_mem, effective_cache_size usam valores conservadores por padrao), (2) Sem connection pooling (PgBouncer e integrado ao Flexible Server mas pode nao estar habilitado), (3) Latencia aplicacao-banco de dados aumentou se a aplicacao ainda nao migrou para Azure, (4) Extensoes ausentes ou configuracoes customizadas do servidor de origem, (5) Estatisticas nao atualizadas apos migracao (execute ANALYZE em todas as tabelas). Comece comparando output de `pg_stat_statements` entre origem e alvo para identificar queries especificas com regressao.

</details>

## Limpeza

```bash
# Delete todos os recursos criados neste challenge
az group delete --name rg-az305-challenge46 --yes --no-wait
```

---

**Proximo**: [Challenge 47: Design Unstructured Data Migration](/docs/az-305/infrastructure/challenge-47)
