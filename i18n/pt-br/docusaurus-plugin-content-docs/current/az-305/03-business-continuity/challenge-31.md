---
sidebar_position: 7
title: "Desafio 31: Projetar Alta Disponibilidade para Dados Relacionais"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 31: projetar alta disponibilidade para dados relacionais

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $15-30 | **Peso no Exame: 15-20%**

:::

## Introdução

A GlobalPay Corporation processa folha de pagamento para 100.000 funcionários em 15 paises abrangendo América do Norte, Europa e Asia-Pacifico. As execucoes de folha sao processos batch críticos em tempo que devem ser concluidos até a meia-noite no fuso horario local de cada pais, com resultados disponíveis para transferencias bancarias até as 6:00 AM. Se uma execução de folha falhar ou dados forem perdidos durante o processamento, a janela de re-execução e extremamente apertada, e folha de pagamento perdida aciona penalidades regulatorias imediatas em múltiplas jurisdicoes.

O banco de dados principal de folha de pagamento é um Azure SQL Database (tier Business Critical, 32 vCores) em East US, com read replicas em West Europe e Southeast Asia para relatórios regionais. O sistema processa folha em ondas rotativas: Asia-Pacifico executa primeiro (comecando as 15:00 UTC), Europa executa em seguida (comecando as 21:00 UTC), e América do Norte por último (comecando as 05:00 UTC). Durante cada execução, o banco de dados lida com operações intensivas de escrita (calculos de salario, retencoes de impostos, deducoes) seguidas por leituras pesadas (gerando contracheques, formularios fiscais, arquivos bancarios).

A GlobalPay não pode perder NENHUM dado durante um failover. Um failover durante o processamento que perca mesmo uma transação pode significar calculos de impostos incorretos para milhares de funcionários, exigindo correcoes caras e registros regulatorios. O banco de dados também deve estar disponível 24/7 porque o cronograma rotativo de folha significa que alguma região esta sempre processando.

## Habilidades do exame cobertas

- Recomendar uma solução de alta disponibilidade para dados relacionais

## Tarefas de design

### Parte 1: arquitetura de HA do Azure SQL database

1. Avalie as capacidades de HA integradas em cada tier de serviço do Azure SQL Database:

| Recurso | General Purpose | Business Critical | Hyperscale |
|---------|----------------|-------------------|------------|
| Zone redundancy | Opcional (custo extra) | Incluido | Opcional |
| Read replicas (na região) | 0 | 1-3 (incluidas) | 0-4 |
| Tempo de failover | 30+ segundos | < 30 segundos | Varia |
| RPO (falha de zona) | 0 (replicação sincrona) | 0 (replicação sincrona) | 0 |
| Named replicas | Não | Não | Sim |
| SLA (zone-redundant) | 99,995% | 99,995% | 99,99% |

2. Justifique por que o tier Business Critical é necessário para a carga de trabalho de folha de pagamento da GlobalPay:
   - Requisito de zero perda de dados (replicação sincrona para replicas secundarias)
   - Failover em menos de 30 segundos (batch de folha não pode tolerar longos atrasos de reconexao)
   - Read replicas integradas (consultas de relatórios descarregadas do processamento)
   - Armazenamento SSD local (alto IOPS para processamento batch)

3. Documente como o tier Business Critical alcanca recuperação de falha de zona com RPO zero internamente (arquitetura Always On Availability Group com replicas sincronas).

### Parte 2: failover Groups para HA Cross-Region

4. Projete a topologia de failover group para o requisito multi-região da GlobalPay:
   - Primário: East US (Business Critical, 32 vCores)
   - Secundário 1: West Europe (mesmo tier, usado para relatórios europeus)
   - Secundário 2: Southeast Asia (mesmo tier, usado para relatórios APAC)
   - Limitacao: Failover groups suportam apenas UM secundário. Como você trata três regiões?

5. Avalie as opcoes para acesso de leitura multi-região:

| Abordagem | Regiões | Auto-failover | Acesso de Leitura | Limitacao |
|----------|---------|---------------|-------------|------------|
| Failover group (secundário único) | 2 | Sim | Secundário legivel | Apenas 1 secundário |
| Active geo-replication | Até 4 | Apenas manual | Todos os secundários legiveis | Sem auto-failover |
| Failover group + geo-replication | 3+ | Parcial | Misto | Topologia complexa |

6. Projete a topologia recomendada:
   - Failover group entre East US e West Europe (auto-failover para DR primário)
   - Active geo-replication de East US para Southeast Asia (read-only, failover manual)
   - Documente o RPO e RTO para cada secundário

### Parte 3: comportamento de failover e impacto na aplicação

7. Análise o que acontece durante um evento de failover automático:
   - Como a connection string da aplicação muda? (Não muda - endpoint do failover group e estavel)
   - O que acontece com transações em andamento? (Rollback no antigo primário)
   - Quanto tempo o banco de dados fica indisponivel durante o failover?
   - Qual é o grace period, e quais sao os trade-offs de defini-lo mais curto vs. mais longo?

8. Projete a lógica de retry em nível de aplicação para cenários de failover:
   - Codigos de erro transientes para retry: 40613, 40197, 40501, 49918
   - Estratégia de retry: Exponential backoff com máximo de 5 retries
   - Circuit breaker: Pare de retentar apos 60 segundos e alerte operações
   - Connection string deve usar endpoint do failover group, não nome individual do servidor

9. Aborde o cenário de risco "split-brain":
   - O que acontece se o primário ficar isolado (não consegue alcancar o secundário) mas ainda esta aceitando escritas?
   - Como o grace period previne failover prematuro?
   - Qual é a exposicao máxima de perda de dados durante o grace period?

### Parte 4: SQL managed instance Business Critical

10. A GlobalPay esta considerando migrar para Azure SQL Managed Instance por recursos como consultas cross-database e SQL Agent. Compare as capacidades de HA:

| Recurso | SQL Database BC | SQL MI BC |
|---------|----------------|-----------|
| Zone redundancy | Sim | Sim |
| Failover groups | Sim | Sim (nível de instância) |
| Consultas cross-database | Não | Sim |
| SQL Agent | Não | Sim |
| Unidade de failover | Banco de dados único | Instância inteira |
| Escopo do failover group | Bancos de dados selecionados | Todos os bancos na instância |

11. Projete a arquitetura de HA se a GlobalPay usar SQL Managed Instance:
    - Tier BC com zone redundancy (AG Always On de 4 nos)
    - Failover group para região secundária (instância inteira faz failover junto)
    - Impacto no failover: todos os bancos de dados movem juntos (vantagem para DBs de folha relacionados)

12. Crie uma estratégia de monitoramento e alertas:
    - Monitore a defasagem de replicação para secundários (deve ser < 5 segundos)
    - Alerte sobre eventos de failover (notificação automatizada para equipe DBA)
    - Monitore utilizacao de DTU/vCore durante execucoes de folha
    - Rastreie conexões bem-sucedidas para o endpoint do failover group

## Criterios de sucesso

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
- 1 replica primária + 3 replicas secundarias (todas sincronas)
- Dados armazenados em SSD local (não armazenamento remoto como General Purpose)
- Toda transação e confirmada em todas as replicas antes de reconhecer ao cliente
- Failover promove um secundário a primário em < 30 segundos
- Um secundário esta disponível como endpoint read-only (sem custo extra)

Configuração zone-redundant:
- Replicas sao distribuidas entre availability zones
- Sobrevive a falha completa de zona com zero perda de dados
- SLA aumenta de 99,99% para 99,995%

Esta arquitetura garante RPO = 0 para qualquer falha de zona porque todas as replicas confirmaram a transação antes de ser reconhecida.

</details>

<details>
<summary>Dica 2: Grace Period do Failover Group</summary>

O grace period (GracePeriodWithDataLossHours) controla quanto tempo o failover automático espera apos detectar indisponibilidade do primário:
- **Mínimo**: 1 hora
- **Recomendado**: 1 hora para a maioria das cargas de trabalho
- **Trade-off**: Grace period mais curto = failover mais rápido mas maior risco de falsos positivos

Durante o grace period:
- Primário esta inalcancavel (confirmado pelo monitoramento do Azure)
- Nenhuma escrita é possível (banco de dados e efetivamente read-only via secundário)
- Apos o grace period expirar: failover automático aciona, promovendo secundário a primário
- Quaisquer transações confirmadas no antigo primário mas ainda não replicadas para o secundário sao PERDIDAS

Para GlobalPay: Defina grace period para 1 hora. Durante esse tempo, processamento de folha para, mas nenhum dado e perdido. Se o primário recuperar dentro de 1 hora, nenhum failover ocorre. A pausa de 1 hora e aceitavel dado que a janela de processamento de folha e de 6+ horas.

</details>

<details>
<summary>Dica 3: Connection Strings do Failover Group</summary>

Failover group fornece endpoints estaveis que redirecionam automaticamente:
- **Read-write**: `<failover-group-name>.database.windows.net` (sempre aponta para o primário atual)
- **Read-only**: `<failover-group-name>.secondary.database.windows.net` (sempre aponta para o secundário)

Beneficios para a aplicação:
- Nenhuma mudança de connection string necessária durante failover
- TTL DNS para endpoints do failover group e 30 segundos
- Apos failover, novas conexões roteiam para o novo primário dentro de ~30 segundos
- Conexoes existentes sao descartadas e devem reconectar (lógica de retry trata isso)

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
<summary>Dica 4: Active Geo-Replication para Leituras Multi-Região</summary>

Como failover groups suportam apenas um secundário, use active geo-replication para read replicas adicionais:

```bash
# Create geo-replica in southeast asia (in addition to failover group secondary in west europe)
az sql db replica create \
  --resource-group rg-globalpay \
  --server sql-globalpay-eastus \
  --name PayrollDB \
  --partner-server sql-globalpay-southeastasia \
  --partner-resource-group rg-globalpay-apac
```

Diferencas-chave dos failover groups:
- Sem failover automático (deve promover manualmente)
- Sem endpoint DNS estavel (deve tratar na aplicação)
- Pode ter até 4 geo-replicas (vs 1 secundário de failover group)
- Util para read-offload em regiões adicionais

Para GlobalPay: A região APAC usa geo-replica para leituras de relatórios, com procedimento de failover manual documentado como runbook (não esperado ser alvo principal de DR).

</details>

## Recursos de aprendizagem

- [High availability for Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/high-availability-sla-local-zone-redundancy)
- [Business Critical service tier - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-business-critical)
- [Failover groups overview - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-sql-db)
- [Active geo-replication - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/active-geo-replication-overview)
- [Business continuity overview - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/business-continuity-high-availability-disaster-recover-hadr-overview)
- [Azure SQL Managed Instance - High availability](https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/high-availability-sla-local-zone-redundancy)

## Verificação de conhecimento

<details>
<summary>1. A GlobalPay requer zero perda de dados durante failover. Qual tier e combinacao de recursos do Azure SQL garante RPO = 0 para falhas de zona?</summary>

**Tier Business Critical com zone redundancy habilitado.** Business Critical usa replicação sincrona para 3 replicas secundarias (Always On AG). Com zone redundancy, essas replicas sao distribuidas entre availability zones. Toda transação deve ser confirmada em TODAS as replicas antes do cliente receber reconhecimento, garantindo zero perda de dados para qualquer falha de zona única. O tier General Purpose também suporta zone redundancy mas armazena dados em armazenamento remoto com diferentes caracteristicas de HA. Para failover cross-region, RPO e aproximadamente 5 segundos (assincrono) porque replicação sincrona entre regiões não é possível devido a latência.

</details>

<details>
<summary>2. Por que você não pode usar um failover group para fornecer failover automático para AMBOS West Europe E Southeast Asia simultaneamente?</summary>

**Failover groups suportam exatamente um servidor secundário.** Um failover group estabelece uma relação 1:1 entre um servidor primário é um servidor parceiro, com failover automático, endpoints DNS estaveis e movimentacao coordenada de bancos de dados. Para regiões adicionais, você deve usar active geo-replication, que fornece secundários legiveis mas requer failover manual (sem promocao automática, sem endpoint DNS estavel). O padrão recomendado e: failover group para sua região principal de DR (failover automático) + active geo-replication para regiões adicionais (failover manual, read-offload apenas).

</details>

<details>
<summary>3. Durante um failover automático de failover group, o que acontece com um processo batch de folha que tem uma transação em andamento inserindo 10.000 registros de salario?</summary>

**A transação em andamento sofre rollback no antigo primário, e a aplicação deve detectar a desconexao e retentar.** Quando o failover ocorre, o antigo primário se torna read-only (ou indisponivel), e quaisquer transações não confirmadas sofrem rollback. O novo primário tem todas as transações previamente confirmadas (aquelas replicadas antes da falha). A aplicação recebe um erro de conexão (SQL error 40613 ou erro transiente similar), e a lógica de retry deve: reconectar ao endpoint do failover group (que agora resolve para o novo primário), detectar quais registros já foram confirmados, e retomar o batch a partir do último ponto confirmado. Isso requer design de batch idempotente com checkpointing.

</details>

<details>
<summary>4. Uma empresa define o grace period do failover group para 0 (se possível) para failover automático mais rápido. Por que o Azure impoe um mínimo de 1 hora?</summary>

**O mínimo de 1 hora previne perda de dados de failover prematuro durante problemas de rede transientes.** Se o grace period fosse 0, uma breve particao de rede entre o primário e secundário acionaria failover imediato para o secundário, que pode não ter recebido as transações mais recentes (defasagem de replicação de até 5 segundos). O grace period de 1 hora garante que interrupcoes transientes (blips de rede, manutenção breve) se resolvam sem acionar failover. Apenas interrupcoes sustentadas (> 1 hora) acionam failover automático, ponto no qual o risco de perda de dados (até 5 segundos de transações) e aceito como o custo de restaurar disponibilidade.

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

**Próximo**: [Challenge 32: Design High Availability for Non-Relational Data](/docs/az-305/business-continuity/challenge-32)
