---
sidebar_position: 7
title: "Challenge 31: Design High Availability for Relational Data"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 31: Design High Availability for Relational Data

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $15-30 | **Peso no Exame: 15-20%**

:::

## Introducao

A GlobalPay Corporation processa folha de pagamento para 100.000 funcionarios em 15 paises abrangendo America do Norte, Europa e Asia-Pacifico. As execucoes de folha sao processos batch criticos em tempo que devem ser concluidos ate a meia-noite no fuso horario local de cada pais, com resultados disponiveis para transferencias bancarias ate as 6:00 AM. Se uma execucao de folha falhar ou dados forem perdidos durante o processamento, a janela de re-execucao e extremamente apertada, e folha de pagamento perdida aciona penalidades regulatorias imediatas em multiplas jurisdicoes.

O banco de dados principal de folha de pagamento e um Azure SQL Database (tier Business Critical, 32 vCores) em East US, com read replicas em West Europe e Southeast Asia para relatorios regionais. O sistema processa folha em ondas rotativas: Asia-Pacifico executa primeiro (comecando as 15:00 UTC), Europa executa em seguida (comecando as 21:00 UTC), e America do Norte por ultimo (comecando as 05:00 UTC). Durante cada execucao, o banco de dados lida com operacoes intensivas de escrita (calculos de salario, retencoes de impostos, deducoes) seguidas por leituras pesadas (gerando contracheques, formularios fiscais, arquivos bancarios).

A GlobalPay nao pode perder NENHUM dado durante um failover. Um failover durante o processamento que perca mesmo uma transacao pode significar calculos de impostos incorretos para milhares de funcionarios, exigindo correcoes caras e registros regulatorios. O banco de dados tambem deve estar disponivel 24/7 porque o cronograma rotativo de folha significa que alguma regiao esta sempre processando.

## Habilidades do Exame Cobertas

- Recomendar uma solucao de alta disponibilidade para dados relacionais

## Tarefas de Design

### Parte 1: Arquitetura de HA do Azure SQL Database

1. Avalie as capacidades de HA integradas em cada tier de servico do Azure SQL Database:

| Recurso | General Purpose | Business Critical | Hyperscale |
|---------|----------------|-------------------|------------|
| Zone redundancy | Opcional (custo extra) | Incluido | Opcional |
| Read replicas (na regiao) | 0 | 1-3 (incluidas) | 0-4 |
| Tempo de failover | 30+ segundos | < 30 segundos | Varia |
| RPO (falha de zona) | 0 (replicacao sincrona) | 0 (replicacao sincrona) | 0 |
| Named replicas | Nao | Nao | Sim |
| SLA (zone-redundant) | 99,995% | 99,995% | 99,99% |

2. Justifique por que o tier Business Critical e necessario para a carga de trabalho de folha de pagamento da GlobalPay:
   - Requisito de zero perda de dados (replicacao sincrona para replicas secundarias)
   - Failover em menos de 30 segundos (batch de folha nao pode tolerar longos atrasos de reconexao)
   - Read replicas integradas (consultas de relatorios descarregadas do processamento)
   - Armazenamento SSD local (alto IOPS para processamento batch)

3. Documente como o tier Business Critical alcanca recuperacao de falha de zona com RPO zero internamente (arquitetura Always On Availability Group com replicas sincronas).

### Parte 2: Failover Groups para HA Cross-Region

4. Projete a topologia de failover group para o requisito multi-regiao da GlobalPay:
   - Primario: East US (Business Critical, 32 vCores)
   - Secundario 1: West Europe (mesmo tier, usado para relatorios europeus)
   - Secundario 2: Southeast Asia (mesmo tier, usado para relatorios APAC)
   - Limitacao: Failover groups suportam apenas UM secundario. Como voce trata tres regioes?

5. Avalie as opcoes para acesso de leitura multi-regiao:

| Abordagem | Regioes | Auto-failover | Acesso de Leitura | Limitacao |
|----------|---------|---------------|-------------|------------|
| Failover group (secundario unico) | 2 | Sim | Secundario legivel | Apenas 1 secundario |
| Active geo-replication | Ate 5 | Apenas manual | Todos os secundarios legiveis | Sem auto-failover |
| Failover group + geo-replication | 3+ | Parcial | Misto | Topologia complexa |

6. Projete a topologia recomendada:
   - Failover group entre East US e West Europe (auto-failover para DR primario)
   - Active geo-replication de East US para Southeast Asia (read-only, failover manual)
   - Documente o RPO e RTO para cada secundario

### Parte 3: Comportamento de Failover e Impacto na Aplicacao

7. Analise o que acontece durante um evento de failover automatico:
   - Como a connection string da aplicacao muda? (Nao muda - endpoint do failover group e estavel)
   - O que acontece com transacoes em andamento? (Rollback no antigo primario)
   - Quanto tempo o banco de dados fica indisponivel durante o failover?
   - Qual e o grace period, e quais sao os trade-offs de defini-lo mais curto vs. mais longo?

8. Projete a logica de retry em nivel de aplicacao para cenarios de failover:
   - Codigos de erro transientes para retry: 40613, 40197, 40501, 49918
   - Estrategia de retry: Exponential backoff com maximo de 5 retries
   - Circuit breaker: Pare de retentar apos 60 segundos e alerte operacoes
   - Connection string deve usar endpoint do failover group, nao nome individual do servidor

9. Aborde o cenario de risco "split-brain":
   - O que acontece se o primario ficar isolado (nao consegue alcancar o secundario) mas ainda esta aceitando escritas?
   - Como o grace period previne failover prematuro?
   - Qual e a exposicao maxima de perda de dados durante o grace period?

### Parte 4: SQL Managed Instance Business Critical

10. A GlobalPay esta considerando migrar para Azure SQL Managed Instance por recursos como consultas cross-database e SQL Agent. Compare as capacidades de HA:

| Recurso | SQL Database BC | SQL MI BC |
|---------|----------------|-----------|
| Zone redundancy | Sim | Sim |
| Failover groups | Sim | Sim (nivel de instancia) |
| Consultas cross-database | Nao | Sim |
| SQL Agent | Nao | Sim |
| Unidade de failover | Banco de dados unico | Instancia inteira |
| Escopo do failover group | Bancos de dados selecionados | Todos os bancos na instancia |

11. Projete a arquitetura de HA se a GlobalPay usar SQL Managed Instance:
    - Tier BC com zone redundancy (AG Always On de 4 nos)
    - Failover group para regiao secundaria (instancia inteira faz failover junto)
    - Impacto no failover: todos os bancos de dados movem juntos (vantagem para DBs de folha relacionados)

12. Crie uma estrategia de monitoramento e alertas:
    - Monitore a defasagem de replicacao para secundarios (deve ser < 5 segundos)
    - Alerte sobre eventos de failover (notificacao automatizada para equipe DBA)
    - Monitore utilizacao de DTU/vCore durante execucoes de folha
    - Rastreie conexoes bem-sucedidas para o endpoint do failover group

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-31"
  items={[
    "Business Critical tier selected with justification for zero-RPO and sub-30s failover",
    "Failover group configured with appropriate grace period for automatic failover",
    "Multi-region read access topology designed (failover group + active geo-replication)",
    "Application retry logic designed for transient failover errors",
    "Split-brain scenario analyzed with grace period trade-offs documented",
    "Monitoring and alerting configured for replication lag and failover events"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Arquitetura Interna do Business Critical</summary>

O tier Business Critical do Azure SQL Database usa uma arquitetura baseada em Always On Availability Groups:
- 1 replica primaria + 3 replicas secundarias (todas sincronas)
- Dados armazenados em SSD local (nao armazenamento remoto como General Purpose)
- Toda transacao e confirmada em todas as replicas antes de reconhecer ao cliente
- Failover promove um secundario a primario em < 30 segundos
- Um secundario esta disponivel como endpoint read-only (sem custo extra)

Configuracao zone-redundant:
- Replicas sao distribuidas entre availability zones
- Sobrevive a falha completa de zona com zero perda de dados
- SLA aumenta de 99,99% para 99,995%

Esta arquitetura garante RPO = 0 para qualquer falha de zona porque todas as replicas confirmaram a transacao antes de ser reconhecida.

</details>

<details>
<summary>Dica 2: Grace Period do Failover Group</summary>

O grace period (GracePeriodWithDataLossHours) controla quanto tempo o failover automatico espera apos detectar indisponibilidade do primario:
- **Minimo**: 1 hora
- **Recomendado**: 1 hora para a maioria das cargas de trabalho
- **Trade-off**: Grace period mais curto = failover mais rapido mas maior risco de falsos positivos

Durante o grace period:
- Primario esta inalcancavel (confirmado pelo monitoramento do Azure)
- Nenhuma escrita e possivel (banco de dados e efetivamente read-only via secundario)
- Apos o grace period expirar: failover automatico aciona, promovendo secundario a primario
- Quaisquer transacoes confirmadas no antigo primario mas ainda nao replicadas para o secundario sao PERDIDAS

Para GlobalPay: Defina grace period para 1 hora. Durante esse tempo, processamento de folha para, mas nenhum dado e perdido. Se o primario recuperar dentro de 1 hora, nenhum failover ocorre. A pausa de 1 hora e aceitavel dado que a janela de processamento de folha e de 6+ horas.

</details>

<details>
<summary>Dica 3: Connection Strings do Failover Group</summary>

Failover group fornece endpoints estaveis que redirecionam automaticamente:
- **Read-write**: `<failover-group-name>.database.windows.net` (sempre aponta para o primario atual)
- **Read-only**: `<failover-group-name>.secondary.database.windows.net` (sempre aponta para o secundario)

Beneficios para a aplicacao:
- Nenhuma mudanca de connection string necessaria durante failover
- TTL DNS para endpoints do failover group e 30 segundos
- Apos failover, novas conexoes roteiam para o novo primario dentro de ~30 segundos
- Conexoes existentes sao descartadas e devem reconectar (logica de retry trata isso)

```bash
# Create failover group
az sql failover-group create \
  --resource-group rg-globalpay \
  --server sql-globalpay-eastus \
  --partner-server sql-globalpay-westeurope \
  --name fg-globalpay \
  --failover-policy Automatic \
  --grace-period 1 \
  --add-db PayrollDB
```

</details>

<details>
<summary>Dica 4: Active Geo-Replication para Leituras Multi-Regiao</summary>

Como failover groups suportam apenas um secundario, use active geo-replication para read replicas adicionais:

```bash
# Create geo-replica in Southeast Asia (in addition to failover group secondary in West Europe)
az sql db replica create \
  --resource-group rg-globalpay \
  --server sql-globalpay-eastus \
  --name PayrollDB \
  --partner-server sql-globalpay-southeastasia \
  --partner-resource-group rg-globalpay-apac
```

Diferencas-chave dos failover groups:
- Sem failover automatico (deve promover manualmente)
- Sem endpoint DNS estavel (deve tratar na aplicacao)
- Pode ter ate 4 geo-replicas (vs 1 secundario de failover group)
- Util para read-offload em regioes adicionais

Para GlobalPay: A regiao APAC usa geo-replica para leituras de relatorios, com procedimento de failover manual documentado como runbook (nao esperado ser alvo principal de DR).

</details>

## Recursos de Aprendizagem

- [High availability for Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/high-availability-sla-local-zone-redundancy)
- [Business Critical service tier - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-business-critical)
- [Failover groups overview - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-sql-db)
- [Active geo-replication - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/active-geo-replication-overview)
- [Business continuity overview - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/business-continuity-high-availability-disaster-recover-hadr-overview)
- [Azure SQL Managed Instance - High availability](https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/high-availability-sla-local-zone-redundancy)

## Verificacao de Conhecimento

<details>
<summary>1. A GlobalPay requer zero perda de dados durante failover. Qual tier e combinacao de recursos do Azure SQL garante RPO = 0 para falhas de zona?</summary>

**Tier Business Critical com zone redundancy habilitado.** Business Critical usa replicacao sincrona para 3 replicas secundarias (Always On AG). Com zone redundancy, essas replicas sao distribuidas entre availability zones. Toda transacao deve ser confirmada em TODAS as replicas antes do cliente receber reconhecimento, garantindo zero perda de dados para qualquer falha de zona unica. O tier General Purpose tambem suporta zone redundancy mas armazena dados em armazenamento remoto com diferentes caracteristicas de HA. Para failover cross-region, RPO e aproximadamente 5 segundos (assincrono) porque replicacao sincrona entre regioes nao e possivel devido a latencia.

</details>

<details>
<summary>2. Por que voce nao pode usar um failover group para fornecer failover automatico para AMBOS West Europe E Southeast Asia simultaneamente?</summary>

**Failover groups suportam exatamente um servidor secundario.** Um failover group estabelece uma relacao 1:1 entre um servidor primario e um servidor parceiro, com failover automatico, endpoints DNS estaveis e movimentacao coordenada de bancos de dados. Para regioes adicionais, voce deve usar active geo-replication, que fornece secundarios legiveis mas requer failover manual (sem promocao automatica, sem endpoint DNS estavel). O padrao recomendado e: failover group para sua regiao principal de DR (failover automatico) + active geo-replication para regioes adicionais (failover manual, read-offload apenas).

</details>

<details>
<summary>3. Durante um failover automatico de failover group, o que acontece com um processo batch de folha que tem uma transacao em andamento inserindo 10.000 registros de salario?</summary>

**A transacao em andamento sofre rollback no antigo primario, e a aplicacao deve detectar a desconexao e retentar.** Quando o failover ocorre, o antigo primario se torna read-only (ou indisponivel), e quaisquer transacoes nao confirmadas sofrem rollback. O novo primario tem todas as transacoes previamente confirmadas (aquelas replicadas antes da falha). A aplicacao recebe um erro de conexao (SQL error 40613 ou erro transiente similar), e a logica de retry deve: reconectar ao endpoint do failover group (que agora resolve para o novo primario), detectar quais registros ja foram confirmados, e retomar o batch a partir do ultimo ponto confirmado. Isso requer design de batch idempotente com checkpointing.

</details>

<details>
<summary>4. Uma empresa define o grace period do failover group para 0 (se possivel) para failover automatico mais rapido. Por que o Azure impoe um minimo de 1 hora?</summary>

**O minimo de 1 hora previne perda de dados de failover prematuro durante problemas de rede transientes.** Se o grace period fosse 0, uma breve particao de rede entre o primario e secundario acionaria failover imediato para o secundario, que pode nao ter recebido as transacoes mais recentes (defasagem de replicacao de ate 5 segundos). O grace period de 1 hora garante que interrupcoes transientes (blips de rede, manutencao breve) se resolvam sem acionar failover. Apenas interrupcoes sustentadas (> 1 hora) acionam failover automatico, ponto no qual o risco de perda de dados (ate 5 segundos de transacoes) e aceito como o custo de restaurar disponibilidade.

</details>

## Limpeza

```bash
# Delete resources in reverse dependency order
az sql failover-group delete \
  --resource-group rg-globalpay \
  --server sql-globalpay-eastus \
  --name fg-globalpay

az group delete --name rg-globalpay --yes --no-wait
az group delete --name rg-globalpay-europe --yes --no-wait
az group delete --name rg-globalpay-apac --yes --no-wait
```

---

**Proximo**: [Challenge 32: Design High Availability for Non-Relational Data](/docs/az-305/business-continuity/challenge-32)
