---
sidebar_position: 3
title: "Challenge 27: Design Backup & Recovery for Databases"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 27: Design Backup & Recovery for Databases

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $10-25 | **Peso no Exame: 15-20%**

:::

## Introducao

A Apex Trading International opera uma plataforma de trading de alta frequencia no Azure que processa 50.000 transacoes por segundo durante o horario de mercado. Seu banco de dados principal e um Azure SQL Database (tier Business Critical, 80 vCores) que registra cada operacao com timestamps de microssegundos. Conformidade regulatoria (SEC Rule 17a-4 e MiFID II) exige que cada transacao individual seja recuperavel ate o segundo exato em que ocorreu, com um periodo obrigatorio de retencao de 10 anos para todos os dados de trading. O banco de dados de trading tem um RPO de efetivamente zero - mesmo 5 segundos de operacoes perdidas durante o horario de mercado pode significar milhoes em posicoes nao reconciliadas.

Alem do banco de dados de trading, a Apex opera um data warehouse de analytics (Azure SQL Database, tier General Purpose, 32 vCores) que agrega dados de trading para analise de risco e relatorios regulatorios. Este banco de dados pode tolerar ate 1 hora de perda de dados ja que e reconstruido a partir do banco de dados de trading toda noite. No entanto, deve ser restauravel em 4 horas para prazos de relatorios de conformidade.

A Apex tambem opera uma instancia Cosmos DB para feeds de dados de mercado em tempo real e um PostgreSQL Flexible Server para suas operacoes de back-office. Cada um tem diferentes requisitos de backup e recuperacao que devem ser abordados na estrategia geral de continuidade de banco de dados.

## Habilidades do Exame Cobertas

- Recomendar uma solucao de backup e recuperacao para bancos de dados

## Tarefas de Design

### Parte 1: Estrategia de Backup do Azure SQL Database

1. Projete a configuracao de backup para o banco de dados de trading (RPO quase zero):
   - Qual e a frequencia padrao de backup para Azure SQL Database? (Full, differential, transaction log)
   - Voce pode customizar a frequencia de backup do transaction log? Qual e o intervalo minimo?
   - Como a arquitetura do tier Business Critical (replicas Always On) contribui para o RPO?

2. Configure point-in-time restore (PITR) para ambos os bancos de dados:
   - Trading DB: Qual periodo de retencao garante recuperacao rapida para problemas operacionais?
   - Analytics DB: Qual e a retencao minima de PITR que atende ao requisito de RPO de 1 hora?
   - Qual e a retencao maxima de PITR disponivel?

3. Projete long-term retention (LTR) para atender ao requisito de conformidade de 10 anos:
   - Configure retencao de backup semanal, mensal e anual
   - Calcule o custo de armazenamento para 10 anos de backups semanais para um banco de dados de 80 vCores
   - Determine se backups LTR sao armazenados na mesma regiao ou podem ser geo-redundantes

```bash
# Configure LTR policy for trading database
az sql db ltr-policy set \
  --resource-group rg-trading \
  --server sql-apex-trading \
  --database TradingDB \
  --weekly-retention P4W \
  --monthly-retention P12M \
  --yearly-retention P10Y \
  --week-of-year 1
```

### Parte 2: Geo-Restore e Recuperacao Cross-Region

4. Avalie as tres opcoes de recuperacao para Azure SQL Database e mapeie para cada carga de trabalho:

| Opcao de Recuperacao | RPO | RTO | Trading DB | Analytics DB |
|-----------------|-----|-----|------------|--------------|
| Point-in-time restore | ~5-10 min | Minutos-horas | ? | ? |
| Geo-restore | ~1 hora | Ate 12 horas | ? | ? |
| Failover groups | ~5 segundos | ~30 segundos | ? | ? |

5. Para o banco de dados de trading, justifique por que failover groups sao a unica opcao que atende ao requisito de RPO quase zero. Configure um auto-failover group:

```bash
az sql failover-group create \
  --resource-group rg-trading \
  --server sql-apex-trading \
  --partner-server sql-apex-trading-dr \
  --name fg-apex-trading \
  --failover-policy Automatic \
  --grace-period 1
```

6. Para o banco de dados de analytics, determine se geo-restore ou um failover group e mais custo-efetivo dados os requisitos de RPO de 1 hora e RTO de 4 horas.

### Parte 3: Cosmos DB Continuous Backup

7. Projete a estrategia de backup para a instancia Cosmos DB de dados de mercado:
   - Compare modo de backup periodico vs. modo de backup continuo
   - Para backup continuo, quais sao os dois tiers de retencao (7 dias vs. 30 dias)?
   - Voce pode restaurar para um timestamp especifico? Qual e a granularidade?

8. Determine a configuracao apropriada de backup do Cosmos DB:
   - Dados de mercado requerem point-in-time restore para dentro de 1 segundo (operacoes referenciam precos de mercado por timestamp)
   - Dados com mais de 30 dias podem ser arquivados e nao precisam de recuperacao instantanea
   - Quais impactos de consistency level existem ao restaurar?

9. Documente o processo de self-service restore para backup continuo do Cosmos DB:
   - Qual e o destino da restauracao? (Nova conta, mesma conta, regiao diferente)
   - Voce pode restaurar um unico container ou deve restaurar a conta inteira?
   - Qual e o tempo aproximado de restauracao para um banco de dados de 100 GB?

### Parte 4: PostgreSQL e Orquestracao de Recuperacao Cross-Database

10. Projete a abordagem de backup para o PostgreSQL Flexible Server:
    - Configure backups automatizados com armazenamento geo-redundante
    - Defina retencao apropriada (7-35 dias para PITR)
    - Documente capacidades e limitacoes de geo-restore

11. Crie um runbook de recuperacao unificado que sequencie a recuperacao de banco de dados em todos os quatro sistemas em ordem de prioridade:
    - Qual banco de dados deve recuperar primeiro? (Dependencias importam)
    - Como voce trata as referencias do Trading DB aos dados de mercado do Cosmos DB?
    - Quais consultas de validacao confirmam que cada banco de dados esta recuperado corretamente?

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-27"
  items={[
    "Azure SQL PITR and LTR configured to meet both operational and 10-year compliance retention",
    "Failover group configured for trading database with automatic failover and grace period justified",
    "Geo-restore vs failover group cost-benefit analysis completed for analytics database",
    "Cosmos DB continuous backup configured with appropriate retention tier selected",
    "PostgreSQL backup configured with geo-redundant storage",
    "Recovery orchestration runbook documents sequencing and dependency order"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Frequencia de Backup do Azure SQL</summary>

Backups automatizados do Azure SQL Database seguem um cronograma fixo:
- **Full backups**: Semanal
- **Differential backups**: A cada 12-24 horas
- **Transaction log backups**: A cada 5-10 minutos (aproximadamente)

Voce nao pode alterar essas frequencias. A frequencia de backup do transaction log significa que PITR tem um RPO de aproximadamente 5-10 minutos no pior caso. Para RPO quase zero, voce DEVE usar failover groups com replicacao sincrona (disponivel no tier Business Critical), que replica cada transacao confirmada para replicas secundarias.

A retencao de PITR e configuravel de 1-35 dias (padrao: 7 dias para DTU Basic, 35 dias para vCore).

</details>

<details>
<summary>Dica 2: Custos de Armazenamento de Long-Term Retention</summary>

Backups LTR sao armazenados como backups completos de banco de dados em armazenamento blob RA-GRS. Estimativa de custo:
- Taxa de armazenamento: aproximadamente $0,05/GB/mes para RA-GRS
- Um banco de dados Business Critical de 80 vCores pode ter 500 GB - 2 TB de tamanho
- 10 anos de backups semanais = 520 copias de backup (mas as mais antigas podem usar apenas retencao anual)

Estrategia de retencao otimizada:
- Semanal: 4 semanas (W=P4W) - 4 copias
- Mensal: 12 meses (M=P12M) - 12 copias
- Anual: 10 anos (Y=P10Y) - 10 copias
Total de copias unicas: ~26 (nao 520) com esta abordagem em camadas

Custo estimado para banco de dados de 1 TB com 26 copias: 26 TB x $0,05/GB x 1024 = ~$1.330/mes

</details>

<details>
<summary>Dica 3: Failover Groups vs Active Geo-Replication</summary>

Ambos fornecem geo-replicacao mas com diferencas-chave:
- **Failover groups**: Failover automatico com grace period, secundario legivel, endpoint de conexao unico que segue o primario. Melhor para aplicacoes que precisam de failover transparente.
- **Active geo-replication**: Failover manual, ate 4 secundarios em qualquer regiao, controle mais granular. Melhor quando voce precisa de read-replicas ou topologias complexas.

Para o banco de dados de trading com RPO quase zero:
- Use **failover groups** com grace period de 1 hora (minimo)
- O grace period define quanto tempo esperar antes do failover automatico apos detectar falha do primario
- Durante a replicacao sincrona no tier Business Critical, RPO e efetivamente 0 para falhas zone-local; para cross-region, RPO e ~5 segundos devido a replicacao assincrona.

</details>

<details>
<summary>Dica 4: Detalhes do Cosmos DB Continuous Backup</summary>

Modo de backup continuo do Cosmos DB:
- **Tier 1 (retencao de 7 dias)**: Incluido sem custo extra. Restaure para qualquer ponto nos ultimos 7 dias.
- **Tier 2 (retencao de 30 dias)**: Custo adicional por GB/mes. Restaure para qualquer ponto nos ultimos 30 dias.
- **Granularidade de restauracao**: 1 segundo (voce pode especificar timestamp exato)
- **Destino da restauracao**: Sempre uma NOVA conta (nao pode restaurar in-place)
- **Escopo de restauracao**: Conta inteira, banco de dados unico ou container unico
- **Tempo aproximado de restauracao**: 1-2 horas para 100 GB (varia pela distribuicao de dados)

Importante: O modo de backup continuo nao pode ser alterado de volta para periodico uma vez habilitado. Ele suporta todos os consistency levels, e a conta restaurada herda a configuracao de consistencia original.

</details>

## Recursos de Aprendizagem

- [Automated backups in Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/automated-backups-overview)
- [Long-term retention - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/long-term-retention-overview)
- [Failover groups overview - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-sql-db)
- [Continuous backup with point-in-time restore in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/continuous-backup-restore-introduction)
- [Backup and restore in Azure Database for PostgreSQL - Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-backup-restore)
- [Geo-restore - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/recovery-using-backups#geo-restore)

## Verificacao de Conhecimento

<details>
<summary>1. Uma aplicacao financeira requer zero perda de dados (RPO = 0) durante uma falha de zona, mas pode tolerar 5 segundos de perda de dados durante uma falha regional completa. Qual configuracao do Azure SQL alcanca isso?</summary>

**Azure SQL Database tier Business Critical com zone redundancy e um failover group para uma regiao secundaria.** O tier Business Critical usa Always On Availability Groups internamente com replicacao sincrona entre availability zones, fornecendo RPO = 0 para falhas de zona. O failover group para uma regiao secundaria usa replicacao assincrona (sincrona nao e possivel entre regioes devido a latencia), fornecendo RPO de aproximadamente 5 segundos para falhas em nivel regional. Esta configuracao corresponde precisamente ao requisito.

</details>

<details>
<summary>2. Por que voce nao pode usar PITR (point-in-time restore) sozinho para alcalcar RPO quase zero para um banco de dados critico de trading?</summary>

**PITR e baseado em backups de transaction log que ocorrem a cada 5-10 minutos.** Se o banco de dados primario falhar entre backups de log, quaisquer transacoes confirmadas apos o ultimo backup de log sao perdidas. Para uma plataforma de trading processando 50.000 transacoes por segundo, uma lacuna de 5 minutos pode significar ate 15 milhoes de transacoes perdidas. PITR e projetado para recuperacao operacional (delecoes acidentais, corrupcao) nao para disaster recovery com RPO zero. Para RPO quase zero, voce precisa de replicacao continua via failover groups ou active geo-replication.

</details>

<details>
<summary>3. Uma empresa precisa de retencao de 10 anos para conformidade mas so precisa consultar esses dados durante auditorias anuais. Qual e a estrategia de retencao mais custo-efetiva do Azure SQL?</summary>

**Use Long-Term Retention (LTR) com retencao de backup anual definida para 10 anos (Y=P10Y).** LTR armazena backups completos de banco de dados em armazenamento RA-GRS a uma fracao do custo de manter dados PITR ativos. Como auditorias sao anuais, configure retencao anual (mantendo um backup por ano) ao inves de retencao semanal (que armazenaria 520 copias em 10 anos). Isso reduz o armazenamento de centenas de copias para apenas 10 snapshots anuais. Combine com retencao mensal para o ano atual se recuperacao mais granular pode ser necessaria para dados recentes.

</details>

<details>
<summary>4. Ao restaurar uma conta Cosmos DB a partir de backup continuo, qual e uma limitacao critica que impacta o planejamento de recuperacao?</summary>

**O backup continuo do Cosmos DB sempre restaura para uma NOVA conta - voce nao pode restaurar in-place para a mesma conta.** Isso significa que suas connection strings da aplicacao devem ser atualizadas pos-restauracao, ou voce deve usar redirecionamento em nivel de DNS. Adicionalmente, o tempo de restauracao escala com o tamanho dos dados (aproximadamente 1-2 horas para 100 GB), o que impacta seus calculos de RTO. A conta restaurada herda o consistency level e configuracao de regiao originais, mas deve ser configurada manualmente para quaisquer configuracoes adicionais (networking, RBAC) aplicadas apos a criacao.

</details>

## Limpeza

```bash
# Delete trading database resources
az group delete --name rg-trading --yes --no-wait
az group delete --name rg-trading-dr --yes --no-wait

# Delete Cosmos DB test resources
az group delete --name rg-cosmosdb-trading --yes --no-wait

# Delete PostgreSQL resources
az group delete --name rg-postgresql-backoffice --yes --no-wait
```

---

**Proximo**: [Challenge 28: Design Backup & Recovery for Unstructured Data](/docs/az-305/business-continuity/challenge-28)
