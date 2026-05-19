---
sidebar_position: 3
title: "Desafio 27: Projetar Backup e Recuperação para Bancos de Dados"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 27: projetar Backup e recuperação para bancos de dados

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $10-25 | **Peso no Exame: 15-20%**

:::

## Introdução

A Apex Trading International opera uma plataforma de trading de alta frequência no Azure que processa 50.000 transações por segundo durante o horario de mercado. Seu banco de dados principal é um Azure SQL Database (tier Business Critical, 80 vCores) que registra cada operação com timestamps de microssegundos. Conformidade regulatoria (SEC Rule 17a-4 e MiFID II) exige que cada transação individual seja recuperavel até o segundo exato em que ocorreu, com um período obrigatório de retenção de 10 anos para todos os dados de trading. O banco de dados de trading tem um RPO de efetivamente zero - mesmo 5 segundos de operações perdidas durante o horario de mercado pode significar milhões em posicoes não reconciliadas.

Além do banco de dados de trading, a Apex opera um data warehouse de analytics (Azure SQL Database, tier General Purpose, 32 vCores) que agrega dados de trading para análise de risco e relatórios regulatorios. Este banco de dados pode tolerar até 1 hora de perda de dados já que é reconstruido a partir do banco de dados de trading toda noite. No entanto, deve ser restauravel em 4 horas para prazos de relatórios de conformidade.

A Apex também opera uma instância Cosmos DB para feeds de dados de mercado em tempo real é um PostgreSQL Flexible Server para suas operações de back-office. Cada um tem diferentes requisitos de backup e recuperação que devem ser abordados na estratégia geral de continuidade de banco de dados.

## Habilidades do exame cobertas

- Recomendar uma solução de backup e recuperação para bancos de dados

## Tarefas de design

### Parte 1: estratégia de Backup do Azure SQL database

1. Projete a configuração de backup para o banco de dados de trading (RPO quase zero):
   - Qual é a frequência padrão de backup para Azure SQL Database? (Full, differential, transaction log)
   - Você pode customizar a frequência de backup do transaction log? Qual é o intervalo mínimo?
   - Como a arquitetura do tier Business Critical (replicas Always On) contribui para o RPO?

2. Configure point-in-time restore (PITR) para ambos os bancos de dados:
   - Trading DB: Qual período de retenção garante recuperação rápida para problemas operacionais?
   - Analytics DB: Qual é a retenção mínima de PITR que atende ao requisito de RPO de 1 hora?
   - Qual é a retenção máxima de PITR disponível?

3. Projete long-term retention (LTR) para atender ao requisito de conformidade de 10 anos:
   - Configure retenção de backup semanal, mensal e anual
   - Calcule o custo de armazenamento para 10 anos de backups semanais para um banco de dados de 80 vCores
   - Determine se backups LTR são armazenados na mesma região ou podem ser geo-redundantes

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

### Parte 2: Geo-Restore e recuperação Cross-Region

4. Avalie as três opcoes de recuperação para Azure SQL Database e mapeie para cada carga de trabalho:

| Opcao de Recuperação | RPO | RTO | Trading DB | Analytics DB |
|-----------------|-----|-----|------------|--------------|
| Point-in-time restore | ~5-10 min | Minutos-horas | ? | ? |
| Geo-restore | ~1 hora | Até 12 horas | ? | ? |
| Failover groups | ~5 segundos | ~30 segundos | ? | ? |

5. Para o banco de dados de trading, justifique por que failover groups são a única opcao que atende ao requisito de RPO quase zero. Configure um auto-failover group:

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

### Parte 3: Cosmos DB continuous Backup

7. Projete a estratégia de backup para a instância Cosmos DB de dados de mercado:
   - Compare modo de backup periódico vs. modo de backup continuo
   - Para backup continuo, quais são os dois tiers de retenção (7 dias vs. 30 dias)?
   - Você pode restaurar para um timestamp específico? Qual é a granularidade?

8. Determine a configuração aprópriada de backup do Cosmos DB:
   - Dados de mercado requerem point-in-time restore para dentro de 1 segundo (operações referenciam precos de mercado por timestamp)
   - Dados com mais de 30 dias podem ser arquivados e não precisam de recuperação instantanea
   - Quais impactos de consistency level existem ao restaurar?

9. Documente o processo de self-service restore para backup continuo do Cosmos DB:
   - Qual é o destino da restauração? (Nova conta, mesma conta, região diferente)
   - Você pode restaurar um único container ou deve restaurar a conta inteira?
   - Qual é o tempo aproximado de restauração para um banco de dados de 100 GB?

### Parte 4: PostgreSQL e orquestração de recuperação Cross-Database

10. Projete a abordagem de backup para o PostgreSQL Flexible Server:
    - Configure backups automatizados com armazenamento geo-redundante
    - Defina retenção aprópriada (7-35 dias para PITR)
    - Documente capacidades e limitacoes de geo-restore

11. Crie um runbook de recuperação unificado que sequencie a recuperação de banco de dados em todos os quatro sistemas em ordem de prioridade:
    - Qual banco de dados deve recuperar primeiro? (Dependencias importam)
    - Como você trata as referências do Trading DB aos dados de mercado do Cosmos DB?
    - Quais consultas de validação confirmam que cada banco de dados esta recuperado corretamente?

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-27"
  items={[
    "Azure SQL PITR and LTR configured to meet both operational and 10-year compliance retention",
    "Failover group configured for trading database with automatic failover and grace period justified",
    "Geo-restore vs failover group cost-benefit analysis completed for analytics database",
    "Cosmos DB continuous backup configured with apprópriate retention tier selected",
    "PostgreSQL backup configured with geo-redundant storage",
    "Recovery orchestration runbook documents sequencing and dependency order"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Frequência de Backup do Azure SQL</summary>

Backups automatizados do Azure SQL Database seguem um cronograma fixo:
- **Full backups**: Semanal
- **Differential backups**: A cada 12-24 horas
- **Transaction log backups**: A cada 5-10 minutos (aproximadamente)

Você não pode alterar essas frequencias. A frequência de backup do transaction log significa que PITR tem um RPO de aproximadamente 5-10 minutos no pior caso. Para RPO quase zero, você DEVE usar failover groups com replicação sincrona (disponível no tier Business Critical), que replica cada transação confirmada para replicas secundarias.

A retenção de PITR e configuravel de 1-35 dias (padrão: 7 dias para DTU Basic, 35 dias para vCore).

</details>

<details>
<summary>Dica 2: Custos de Armazenamento de Long-Term Retention</summary>

Backups LTR são armazenados como backups completos de banco de dados em armazenamento blob RA-GRS. Estimativa de custo:
- Taxa de armazenamento: aproximadamente $0,05/GB/mes para RA-GRS
- Um banco de dados Business Critical de 80 vCores pode ter 500 GB - 2 TB de tamanho
- 10 anos de backups semanais = 520 copias de backup (mas as mais antigas podem usar apenas retenção anual)

Estratégia de retenção otimizada:
- Semanal: 4 semanas (W=P4W) - 4 copias
- Mensal: 12 meses (M=P12M) - 12 copias
- Anual: 10 anos (Y=P10Y) - 10 copias
Total de copias únicas: ~26 (não 520) com esta abordagem em camadas

Custo estimado para banco de dados de 1 TB com 26 copias: 26 TB x $0,05/GB x 1024 = ~$1.330/mes

</details>

<details>
<summary>Dica 3: Failover Groups vs Active Geo-Replication</summary>

Ambos fornecem geo-replicação mas com diferencas-chave:
- **Failover groups**: Failover automático com grace period, secundário legivel, endpoint de conexão único que segue o primário. Melhor para aplicações que precisam de failover transparente.
- **Active geo-replication**: Failover manual, até 4 secundários em qualquer região, controle mais granular. Melhor quando você precisa de read-replicas ou topologias complexas.

Para o banco de dados de trading com RPO quase zero:
- Use **failover groups** com grace period de 1 hora (mínimo)
- O grace period define quanto tempo esperar antes do failover automático apos detectar falha do primário
- Durante a replicação sincrona no tier Business Critical, RPO e efetivamente 0 para falhas zone-local; para cross-region, RPO e ~5 segundos devido a replicação assincrona.

</details>

<details>
<summary>Dica 4: Detalhes do Cosmos DB Continuous Backup</summary>

Modo de backup continuo do Cosmos DB:
- **Tier 1 (retenção de 7 dias)**: Incluido sem custo extra. Restaure para qualquer ponto nos últimos 7 dias.
- **Tier 2 (retenção de 30 dias)**: Custo adicional por GB/mes. Restaure para qualquer ponto nos últimos 30 dias.
- **Granularidade de restauração**: 1 segundo (você pode específicar timestamp exato)
- **Destino da restauração**: Sempre uma NOVA conta (não pode restaurar in-place)
- **Escopo de restauração**: Conta inteira, banco de dados único ou container único
- **Tempo aproximado de restauração**: 1-2 horas para 100 GB (varia pela distribuição de dados)

Importante: O modo de backup continuo não pode ser alterado de volta para periódico uma vez habilitado. Ele suporta todos os consistency levels, e a conta restaurada herda a configuração de consistência original.

</details>

## Recursos de aprendizagem

- [Automated backups in Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/automated-backups-overview)
- [Long-term retention - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/long-term-retention-overview)
- [Failover groups overview - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-sql-db)
- [Continuous backup with point-in-time restore in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/continuous-backup-restore-introduction)
- [Backup and restore in Azure Database for PostgreSQL - Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-backup-restore)
- [Geo-restore - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/recovery-using-backups#geo-restore)

## Verificação de conhecimento

<details>
<summary>1. Uma aplicação financeira requer zero perda de dados (RPO = 0) durante uma falha de zona, mas pode tolerar 5 segundos de perda de dados durante uma falha regional completa. Qual configuração do Azure SQL alcanca isso?</summary>

**Azure SQL Database tier Business Critical com zone redundancy é um failover group para uma região secundária.** O tier Business Critical usa Always On Availability Groups internamente com replicação sincrona entre availability zones, fornecendo RPO = 0 para falhas de zona. O failover group para uma região secundária usa replicação assincrona (sincrona não é possível entre regiões devido a latência), fornecendo RPO de aproximadamente 5 segundos para falhas em nível regional. Esta configuração corresponde precisamente ao requisito.

</details>

<details>
<summary>2. Por que você não pode usar PITR (point-in-time restore) sozinho para alcalcar RPO quase zero para um banco de dados crítico de trading?</summary>

**PITR é baseado em backups de transaction log que ocorrem a cada 5-10 minutos.** Se o banco de dados primário falhar entre backups de log, quaisquer transações confirmadas apos o último backup de log são perdidas. Para uma plataforma de trading processando 50.000 transações por segundo, uma lacuna de 5 minutos pode significar até 15 milhões de transações perdidas. PITR é projetado para recuperação operacional (delecoes acidentais, corrupcao) não para disaster recovery com RPO zero. Para RPO quase zero, você precisa de replicação continua via failover groups ou active geo-replication.

</details>

<details>
<summary>3. Uma empresa precisa de retenção de 10 anos para conformidade mas só precisa consultar esses dados durante auditorias anuais. Qual é a estratégia de retenção mais custo-efetiva do Azure SQL?</summary>

**Use Long-Term Retention (LTR) com retenção de backup anual definida para 10 anos (Y=P10Y).** LTR armazena backups completos de banco de dados em armazenamento RA-GRS a uma fracao do custo de manter dados PITR ativos. Como auditorias são anuais, configure retenção anual (mantendo um backup por ano) ao inves de retenção semanal (que armazenaria 520 copias em 10 anos). Isso reduz o armazenamento de centenas de copias para apenas 10 snapshots anuais. Combine com retenção mensal para o ano atual se recuperação mais granular pode ser necessária para dados recentes.

</details>

<details>
<summary>4. Ao restaurar uma conta Cosmos DB a partir de backup continuo, qual é uma limitacao crítica que impacta o planejamento de recuperação?</summary>

**O backup continuo do Cosmos DB sempre restaura para uma NOVA conta - você não pode restaurar in-place para a mesma conta.** Isso significa que suas connection strings da aplicação devem ser atualizadas pós-restauração, ou você deve usar redirecionamento em nível de DNS. Adicionalmente, o tempo de restauração escala com o tamanho dos dados (aproximadamente 1-2 horas para 100 GB), o que impacta seus calculos de RTO. A conta restaurada herda o consistency level e configuração de região originais, mas deve ser configurada manualmente para quaisquer configurações adicionais (networking, RBAC) aplicadas apos a criação.

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

**Próximo**: [Challenge 28: Design Backup & Recovery for Unstructured Data](/docs/az-305/business-continuity/challenge-28)
