---
sidebar_position: 13
title: "Desafio 46: Projetar Migração de Banco de Dados"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 46: projetar migração de banco de dados

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 30-35%**

:::

## Introdução

A GlobalRetail Corp opera um estate de dados empresarial de 30 bancos de dados suportando sua plataforma de e-commerce, gerenciamento de cadeia de suprimentos e sistemas de relatórios financeiros. O inventário de bancos de dados inclui: 15 instâncias SQL Server (versoes 2012 a 2022, variando de 50GB a 2TB), 8 bancos de dados PostgreSQL (versoes 11-15, suportando seu catálogo de produtos e serviços de busca), 5 bancos de dados MySQL (suportando CMS legado e plataformas de marketing) e 2 bancos de dados Oracle (suportando seus sistemas ERP e de gerenciamento de armazem).

Os requisitos de migração variam significativamente entre bancos de dados: o banco de dados de e-commerce (SQL Server 2022, 2TB) serve 50.000 transações por hora e não pode tolerar mais de 5 minutos de inatividade. O banco de dados de relatórios financeiros requer um período completo de execução paralela para conformidade de auditoria. Os bancos de dados CMS legados em MySQL são candidatos para modernizacao. O banco de dados Oracle ERP tem stored procedures complexas com sintaxe específica de Oracle que complica a migração.

A equipe de DBAs precisa de uma estratégia de migração abrangente que enderece avaliação de compatibilidade, seleção de serviço alvo (Azure SQL Database vs. Managed Instance vs. SQL em VM, e decisoes equivalentes para PostgreSQL e MySQL), método de migração (online vs. offline) e validação pós-migração para cada banco de dados.

## Habilidades do exame cobertas

- Recomendar uma solução para migrar bancos de dados

## Tarefas de design

### Parte 1: avaliação de compatibilidade

1. Projete a abordagem de avaliação para cada engine de banco de dados:
   - SQL Server: Use avaliação de migração Azure SQL (Data Migration Assistant ou Azure Migrate) para identificar problemas de compatibilidade, recursos bloqueadores e alvo recomendado (Azure SQL DB, SQL MI ou SQL em VM)
   - PostgreSQL: Avalie compatibilidade com Azure Database for PostgreSQL Flexible Server, identifique extensões ou recursos não suportados
   - MySQL: Avalie compatibilidade com Azure Database for MySQL Flexible Server
   - Oracle: Avalie caminhos de migração (Oracle para Azure SQL MI via SSMA, Oracle para PostgreSQL via Ora2Pg, ou Oracle em Azure VM)
2. Para os bancos de dados SQL Server, documente quais recursos forcam alvos específicos:
   - Consultas cross-database (requer SQL MI ou SQL em VM)
   - SQL Server Agent jobs (requer SQL MI ou SQL em VM)
   - CLR assemblies (suporte limitado no Azure SQL DB)
   - Linked servers (requer SQL MI ou SQL em VM)
   - Tamanho de banco de dados > 100GB (Azure SQL DB Hyperscale ou SQL MI)
3. Crie uma matriz de decisão mapeando cada banco de dados para seu alvo Azure recomendado com justificativa.

### Parte 2: estratégia de migração online vs. offline

4. Categorize cada banco de dados para migração online (replicação continua) vs. offline (copia única):
   - Online: bancos de dados que requerem < 5 minutos de inatividade (e-commerce, serviços em tempo real)
   - Offline: bancos de dados que podem tolerar janelas de manutenção (relatórios, processamento em lote)
5. Projete a arquitetura de migração online usando Azure Database Migration Service:
   - SQL Server para Azure SQL MI: sincronizacao de dados continua com cutover
   - PostgreSQL para Azure Database for PostgreSQL: serviço de migração com replicação online
   - MySQL para Azure Database for MySQL: migração online com DMS
6. Calcule a timeline de migração para cada banco de dados baseado em:
   - Tamanho do banco de dados e largura de banda de rede disponível
   - Tempo de backup/restore completo inicial
   - Lag de replicação de change data capture (CDC) continuo
   - Coordenacao da janela de cutover

### Parte 3: cenários de migração complexos

7. Projete a estratégia de migração para o banco de dados SQL Server de e-commerce de 2TB com requisito de 5 minutos de inatividade:
   - Pre-stage: configure Azure SQL MI com service tier e dimensionamento aprópriados
   - Replicar: sincronizacao de dados continua do SQL Server on-premises para MI
   - Validar: comparar contagens de registros, checksums e conectividade da aplicação
   - Cutover: parar escritas, permitir replicação alcançar, redirecionar aplicações
8. Projete a abordagem de migração do Oracle ERP:
   - Opcao A: Migrar para Azure SQL MI usando SQL Server Migration Assistant (SSMA) para conversao de schema/dados
   - Opcao B: Migrar para PostgreSQL usando Ora2Pg para conversao de schema
   - Opcao C: Rehost Oracle em Azure VM (manter licenciamento Oracle no Azure)
   - Documente trade-offs de cada opcao incluindo custos de licenciamento, esforco de refatoracao de código e timeline
9. Enderece o requisito de execução paralela do banco de dados financeiro:
   - Projete uma arquitetura de dual-write ou estratégia de read-replica
   - Defina critérios de validação para declarar o alvo Azure como autoritativo
   - Documente o processo de sign-off de conformidade

### Parte 4: validação e otimização Pos-Migração

10. Projete procedimentos de validação pós-migração:
    - Integridade de dados: comparacao de contagem de linhas, validação de checksum em tabelas-chave
    - Performance: comparacao de tempo de execução de queries (baseline vs. Azure)
    - Teste de aplicação: suites de teste funcional contra bancos de dados Azure
    - Teste de failover: verificar capacidades de HA/DR no alvo Azure
11. Projete passos de otimização de performance para pós-migração:
    - Azure SQL MI: avaliar e ajustar service tier (General Purpose vs. Business Critical)
    - Recomendacoes de índice usando Azure SQL Database Advisor
    - Query performance insights para identificar queries com regressao
12. Documente a estratégia de rollback para cada migração de banco de dados: o que dispara um rollback, por quanto tempo você pode manter capacidade de rollback, e qual reconciliacao de dados é necessária se Azure foi primário por algum período.

## Criterios de sucesso

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
<summary>Dica 1: Seleção de Alvo Azure SQL</summary>

Escolha **Azure SQL Database** para: aplicações cloud-born, workloads de banco de dados único, cenários serverless/sensíveis a custo e aplicações que não usam consultas cross-database ou SQL Agent. Escolha **Azure SQL Managed Instance** para: lift-and-shift de workloads SQL Server, aplicações usando consultas cross-database, linked servers, CLR ou SQL Agent. Escolha **SQL Server em Azure VM** para: aplicações que requerem acesso completo em nível de SO, versoes específicas de SQL Server ou recursos não disponíveis em MI (como FILESTREAM, software de terceiros instalado junto com SQL Server).

</details>

<details>
<summary>Dica 2: Migração Online com DMS</summary>

Azure Database Migration Service (DMS) para migração online para SQL MI usa log shipping e replicação transacional para sincronizar dados continuamente do SQL Server de origem. O backup completo inicial e restaurado no MI, entao backups de transaction log são aplicados continuamente. Durante o cutover, a aplicação para de escrever na origem, o backup de log final é aplicado ao MI, e a aplicação reconecta ao MI. Tempo total de inatividade no cutover e tipicamente de segundos a minutos dependendo do tamanho do transaction log final.

</details>

<details>
<summary>Dica 3: Complexidade da Migração Oracle</summary>

Migracoes de Oracle para Azure são complexas devido a: stored procedures PL/SQL (sem equivalente direto em T-SQL ou PL/pgSQL), tipos de dados específicos de Oracle (NUMBER, VARCHAR2), sequences, synonyms e package bodies. SSMA pode converter aproximadamente 70-80% do código Oracle para T-SQL automaticamente, mas PL/SQL complexo requer refatoracao manual. Ora2Pg fornece conversao similar para PostgreSQL. Sempre execute uma conversao somente de schema primeiro para avaliar o esforco de refatoracao manual antes de se comprometer com um caminho de migração.

</details>

<details>
<summary>Dica 4: Serviço de Migração PostgreSQL</summary>

Azure Database for PostgreSQL tem um serviço de migração integrado (separado do DMS) que suporta migração online e offline de PostgreSQL on-premises, AWS RDS e outras fontes cloud. Para migração online, ele usa replicação lógica (requer PostgreSQL 10+ com logical decoding habilitado). Consideracoes-chave: todas as tabelas devem ter chaves primarias para migração online, large objects (LOBs) requerem tratamento especial, e algumas extensões podem não estar disponíveis no Azure Database for PostgreSQL Flexible Server.

</details>

<details>
<summary>Dica 5: Tamanho de Banco de Dados e Tempo de Migração</summary>

Para um banco de dados de 2TB sobre uma conexão ExpressRoute de 1Gbps: tempo teorico de transferencia e aproximadamente 4,5 horas (2TB / 1Gbps). Na prática, considere overhead: backup/restore inicial pode levar 6-8 horas, mais transaction log shipping continuo. A janela de cutover só precisa cobrir o delta final (transações desde o último backup de log), que para um banco de dados de 50.000 tx/hora pode ser minutos de tempo de replay. Inicie a replicação 1-2 semanas antes do cutover para garantir que a replica esteja totalmente atualizada.

</details>

## Recursos de aprendizagem

- [Azure Database Migration Service overview](https://learn.microsoft.com/en-us/azure/dms/dms-overview)
- [Azure SQL migration assessment](https://learn.microsoft.com/en-us/azure/azure-sql/migration-guides/managed-instance/sql-server-to-managed-instance-overview)
- [Migration service in Azure Database for PostgreSQL](https://learn.microsoft.com/en-us/azure/postgresql/migrate/migration-service/overview-migration-service-postgresql)
- [Migrate Oracle to Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/migration-guides/managed-instance/oracle-to-managed-instance-guide)
- [DMS supported migration scenários](https://learn.microsoft.com/en-us/azure/dms/resource-scenário-status)
- [Azure SQL Managed Instance features](https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/sql-managed-instance-paas-overview)

## Verificação de conhecimento

<details>
<summary>1. Um banco de dados SQL Server 2012 usa consultas cross-database, SQL Agent jobs e tem tamanho de 500GB. Qual alvo Azure e aprópriado e por que?</summary>

**Azure SQL Managed Instance.** Todos os três requisitos apontam para SQL MI: (1) Consultas cross-database são suportadas dentro da mesma instância MI mas não no Azure SQL Database, (2) SQL Agent e integrado ao MI com suporte completo de agendamento de jobs mas não disponível no Azure SQL Database, (3) 500GB esta bem dentro dos limites do MI (até 16TB) mas excede limites do tier padrão do Azure SQL Database (requer Hyperscale). Adicionalmente, o nível de compatibilidade do SQL Server 2012 é suportado pelo MI, permitindo lift-and-shift sem mudanças na aplicação.

</details>

<details>
<summary>2. Um banco de dados de e-commerce lida com 50.000 transações por hora e requer menos de 5 minutos de inatividade durante a migração. Qual método de migração e estratégia de cutover você deve usar?</summary>

**Migração online com sincronizacao continua do DMS e cutover coordenado.** Passos: (1) Configure DMS com modo de migração online para replicar continuamente do SQL Server de origem para o SQL MI alvo, (2) Permita sincronizacao completa inicial e log shipping continuo por 1-2 semanas até o lag de replicação ser mínimo (segundos), (3) Durante um período de baixo trafego, habilite modo de manutenção da aplicação (para novas transações), (4) Espere a replicação final completar (segundos a minutos), (5) Redirecione connection strings da aplicação para MI, (6) Desabilite modo de manutenção. Tempo total de inatividade: o tempo desde parar escritas até completar a mudança de DNS/connection string, tipicamente 2-5 minutos.

</details>

<details>
<summary>3. Um banco de dados Oracle tem 500 stored procedures com PL/SQL. A equipe quer migrar para Azure SQL Managed Instance. Qual é o risco primário e como você o avalia?</summary>

**Completude da conversao de código e equivalencia funcional.** Conversao de PL/SQL para T-SQL não é 1:1. Execute SSMA contra o schema Oracle para gerar um relatório de avaliação mostrando: porcentagem de código que converte automaticamente, procedures que requerem refatoracao manual, construtos não suportados (transações autonomas, nested tables, pacotes built-in específicos de Oracle). O risco e que os 20-30% que requerem conversao manual contem lógica de negócio crítica. Mitigacao: orce 3-6 meses de esforco de DBA/desenvolvedor para refatoracao, cobertura abrangente de testes de todas as stored procedures, e considere manter Oracle em Azure VM como fallback se o esforco de refatoracao exceder o orcamento.

</details>

<details>
<summary>4. Apos migrar um banco de dados PostgreSQL para Azure Database for PostgreSQL Flexible Server, a performance de queries degrada 40%. O tamanho do banco de dados e tier da VM correspondem a configuração on-premises. O que você deve investigar?</summary>

**Parametros do servidor, connection pooling e latência de rede.** Causas comuns: (1) Parametros do PostgreSQL não ajustados para Azure (shared_buffers, work_mem, effective_cache_size usam valores conservadores por padrão), (2) Sem connection pooling (PgBouncer e integrado ao Flexible Server mas pode não estar habilitado), (3) Latência aplicação-banco de dados aumentou se a aplicação ainda não migrou para Azure, (4) Extensoes ausentes ou configurações customizadas do servidor de origem, (5) Estatisticas não atualizadas apos migração (execute ANALYZE em todas as tabelas). Comece comparando output de `pg_stat_statements` entre origem e alvo para identificar queries específicas com regressao.

</details>

## Limpeza

```bash
# Delete todos os recursos criados neste challenge
az group delete --name rg-az305-challenge46 --yes --no-wait
```

---

**Próximo**: [Challenge 47: Design Unstructured Data Migration](/docs/az-305/infrastructure/challenge-47)
