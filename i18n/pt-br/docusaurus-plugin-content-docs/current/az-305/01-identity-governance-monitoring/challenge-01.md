---
sidebar_position: 1
title: "Desafio 01: Projetar uma Solução de Registro Centralizado"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Desafio 01: projetar uma solução de registro centralizado

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 25-30%**

:::

## Introdução

A Northwind Traders é uma empresa de varejo de médio porte que cresceu rapidamente por meio de aquisições. Atualmente opera cargas de trabalho em três assinaturas Azure: uma para TI corporativa, uma para sua plataforma de e-commerce e uma para a equipe de análise de dados. Cada equipe gerencia logs de forma independente, resultando em pontos cegos ao solucionar incidentes entre equipes e nenhuma visão unificada para auditorias de segurança.

O CTO determinou uma estratégia centralizada de logging que forneça um painel único para visibilidade operacional, respeitando requisitos de soberania de dados (dados da UE devem permanecer em regiões da UE). A equipe de segurança precisa de acesso a todos os logs relevantes de segurança, mas a equipe de análise deve ver apenas seus próprios logs de aplicação. O volume mensal de logs e estimado em 50 GB para TI corporativa, 200 GB para e-commerce e 100 GB para análise.

Sua tarefa é projetar uma arquitetura de workspace do Log Analytics que equilibre eficiência de custos, controle de acesso, requisitos de conformidade e simplicidade operacional.

## Habilidades do exame cobertas

- Recomendar uma solução de logging
- Recomendar uma solução para roteamento de logs
- Recomendar uma solução de monitoramento

## Tarefas de design

### Parte 1: decisao de arquitetura de workspace

1. Avalie as seguintes estratégias de workspace para a Northwind Traders e recomende uma com justificativa:
   - Workspace único centralizado
   - Um workspace por assinatura
   - Um workspace por equipe/função
   - Abordagem hibrida (workspace de segurança + workspaces operacionais)

2. Documente os trade-offs da arquitetura escolhida usando esta matriz de decisao:

<DecisionMatrix
  title="Log Analytics Workspace Architecture"
  headers={["Single Workspace", "Per-Subscription", "Per-Team", "Hybrid"]}
  rows={[
    {criteria: "Access control granularity", values: ["Limited - table-level RBAC only", "Good - natural subscription boundary", "Excellent - full isolation per team", "Best - security isolated + team access via resource-context"]},
    {criteria: "Cross-resource correlation", values: ["Excellent - all data in one place", "Difficult - requires cross-workspace queries", "Difficult - queries span multiple workspaces", "Good - security correlated centrally, operational per team"]},
    {criteria: "Cost optimization", values: ["Best - single commitment tier at highest volume discount", "Moderate - lower volume per workspace reduces tier discounts", "Poor - each workspace has low volume, no tier discounts", "Good - security workspace at high tier, operational at lower tiers"]},
    {criteria: "Compliance/data residency", values: ["Cannot satisfy - single region only", "Partially - if subscriptions map to regions", "Can satisfy - team workspaces in required regions", "Best - regional workspaces where required, central for non-regulated"]},
    {criteria: "Management overhead", values: ["Lowest - one workspace to manage", "Moderate - 3 workspaces", "High - one per team, grows with org", "Moderate - 2-3 workspaces with clear purpose"]}
  ]}
  storageKey="az305-challenge-01"
/>

3. Determine a(s) região(oes) apropriada(s) para seu(s) workspace(s) considerando o requisito de residencia de dados da UE.

### Parte 2: implantar e configurar o workspace

4. Crie o(s) workspace(s) do Log Analytics de acordo com seu design usando Azure CLI.

5. Configure a política de retencao de dados do workspace:
   - Logs de segurança: 365 dias (requisito de conformidade)
   - Logs operacionais: 90 dias
   - Dados de desempenho: 30 dias

6. Configure retencao por tabela onde diferentes tipos de dados requerem diferentes períodos de retencao.

### Parte 3: design de controle de acesso

7. Projete um modelo de acesso que satisfaca estes requisitos:
   - Equipe de segurança: acesso de leitura a todos os logs de segurança em todos os workspaces
   - Equipe de e-commerce: acesso de leitura/escrita apenas aos seus logs de aplicação
   - Equipe de análise: acesso de leitura apenas ao seu próprio workspace
   - Equipe de plataforma: acesso administrativo completo a todos os workspaces

8. Implemente controle de acesso resource-context vs. workspace-context onde apropriado.

### Parte 4: gerenciamento de custos

9. Avalie o preco do commitment tier vs. pay-as-you-go para o volume total esperado de ingestao de 350 GB/dia.

10. Projete uma estratégia para reduzir custos de ingestao para logs verbosos mas de baixa prioridade (ex.: logs de aplicação em nível de debug).

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-01"
  items={[
    "Documented workspace architecture decision with clear justification for chosen approach",
    "Log Analytics workspace(s) deployed in appropriate region(s)",
    "Data retention configured per table with compliance-appropriate durations",
    "Access control model designed using resource-context or workspace-context permissions",
    "Commitment tier pricing evaluated with cost comparison documented",
    "EU data residency requirement addressed in the design"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Melhores Práticas de Arquitetura de Workspace</summary>

A Microsoft recomenda minimizar o número de workspaces. Um workspace único fornece a correlacao entre recursos mais fácil e simplifica o gerenciamento. No entanto, você precisa de múltiplos workspaces quando:
- Requisitos de residencia de dados exigem separacao regional
- Isolamento estrito de acesso é necessário (além do que o RBAC em nível de tabela fornece)
- Você precisa de limites de cobranca separados

Para a maioria das organizações, uma abordagem hibrida com um workspace central de segurança (Microsoft Sentinel) mais um ou dois workspaces operacionais é ideal.

</details>

<details>
<summary>Dica 2: Criando um Workspace do Log Analytics</summary>

```bash
# Create resource group
az group create --name rg-logging-centralus --location centralus

# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group rg-logging-centralus \
  --workspace-name law-northwind-central \
  --location centralus \
  --retention-time 90 \
  --sku PerGB2018

# Create EU workspace for data residency
az monitor log-analytics workspace create \
  --resource-group rg-logging-westeurope \
  --workspace-name law-northwind-eu \
  --location westeurope \
  --retention-time 90
```

</details>

<details>
<summary>Dica 3: Retencao em Nível de Tabela</summary>

Você pode definir diferentes períodos de retencao por tabela dentro de um workspace. Isso é fundamental para equilibrar conformidade (retencao longa para segurança) com custo (retencao curta para logs verbosos):

```bash
# Set SecurityEvent table to 365 days
az monitor log-analytics workspace table update \
  --resource-group rg-logging-centralus \
  --workspace-name law-northwind-central \
  --name SecurityEvent \
  --retention-time 365

# Set perf table to 30 days
az monitor log-analytics workspace table update \
  --resource-group rg-logging-centralus \
  --workspace-name law-northwind-central \
  --name Perf \
  --retention-time 30
```

</details>

<details>
<summary>Dica 4: Opcoes de Controle de Acesso</summary>

O Log Analytics suporta dois modos de acesso:
- **Workspace-context**: O usuário obtem acesso a todos os logs no workspace com base em permissões em nível de workspace
- **Resource-context**: O usuário acessa logs de um recurso específico por meio do RBAC daquele recurso (requer `Log Analytics Reader` mais acesso ao recurso)

Para a equipe de e-commerce, resource-context é ideal porque eles precisam ver apenas logs de seus próprios recursos, sem necessitar de permissões diretas no workspace.

```bash
# Grant workspace-level access to security team
az role assignment create \
  --assignee security-team@northwind.com \
  --role "Log Analytics Reader" \
  --scope /subscriptions/{sub-id}/resourceGroups/rg-logging/providers/Microsoft.OperationalInsights/workspaces/law-northwind-central
```

</details>

<details>
<summary>Dica 5: Preco do Commitment Tier</summary>

Com 350 GB/dia de ingestao total, o commitment tier de 300 GB/dia oferece economia significativa em relação ao pay-as-you-go. Consideracoes importantes de preco:
- Pay-as-you-go: cobrado por GB ingerido
- Commitment tiers: 100, 200, 300, 400, 500+ GB/dia com descontos crescentes
- Dados retidos além do período incluso (primeiros 31 dias gratuitos) sao cobrados por GB/mes
- O tier Basic Logs e mais barato para dados de alto volume e consultas infrequentes

Compare: commitment tier de 300 GB + 50 GB de excedente vs. commitment tier de 400 GB com capacidade não utilizada.

</details>

## Recursos de aprendizagem

- [Design a Log Analytics workspace architecture](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/workspace-design)
- [Azure Monitor Logs overview](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-platform-logs)
- [Manage access to Log Analytics workspaces](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/manage-access)
- [Azure Monitor pricing](https://learn.microsoft.com/en-us/azure/azure-monitor/cost-usage)
- [Configure data retention and archive](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-configure)
- [Basic Logs in Azure Monitor](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/basic-logs-configure)

## Verificação de conhecimento

<details>
<summary>1. A Northwind Traders tem 350 GB/dia de ingestao de logs divididos entre três equipes. A equipe de segurança precisa consultar todos os logs, mas a equipe de análise deve ver apenas seus próprios dados. Qual é a arquitetura de workspace mais economica?</summary>

**Uma abordagem hibrida com um workspace único usando controle de acesso resource-context** e a mais economica. Um workspace único qualifica-se para o commitment tier de 300 GB/dia (desconto significativo), enquanto o RBAC resource-context garante que a equipe de análise veja apenas logs de seus próprios recursos. A equipe de segurança recebe Log Analytics Reader em nível de workspace para visibilidade completa. Adicione um segundo workspace apenas se a residencia de dados da UE exigir separacao física.

</details>

<details>
<summary>2. Uma empresa precisa reter logs de segurança por 7 anos mas deseja minimizar custos. Qual combinacao de recursos deve ser usada?</summary>

**Use retencao em nível de tabela com tier de arquivo.** Defina a retencao interativa para 90 dias para consultas ativas, depois configure a retencao total (arquivo) para 2.555 dias (7 anos). Dados arquivados custam significativamente menos que retencao interativa, mas requerem um search job ou restore para consulta. Alternativamente, exporte logs para uma Storage Account com tier cool/archive para o armazenamento de longo prazo mais barato.

</details>

<details>
<summary>3. Qual é a diferenca entre controle de acesso workspace-context e resource-context no Log Analytics?</summary>

**Workspace-context** concede aos usuários acesso a todos os dados no workspace com base em sua atribuicao de função no nível do workspace (ex.: Log Analytics Reader no workspace). **Resource-context** permite que usuários vejam logs apenas de recursos aos quais já possuem acesso de leitura, sem precisar de permissões explicitas no workspace. Resource-context é habilitado pela configuração de modo de controle de acesso do workspace e é preferido para acesso granular em nível de recurso sem expor dados não relacionados.

</details>

<details>
<summary>4. Quando você deve usar múltiplos workspaces do Log Analytics em vez de um workspace único?</summary>

Use múltiplos workspaces quando: (1) Requisitos de soberania/residencia de dados exigem localizacoes geograficas diferentes, (2) Você precisa de limites rigidos de cobranca entre unidades de negocio, (3) Você tem requisitos estritos de isolamento de tenant (provedores de serviço multi-tenant), ou (4) Conformidade requer segregação de dados que não pode ser alcancada com RBAC em nível de tabela. Evite múltiplos workspaces apenas para controle de acesso, pois resource-context e RBAC em nível de tabela lidam com a maioria dos cenários dentro de um único workspace.

</details>

## Limpeza

```bash
# Delete resource groups containing Log Analytics workspaces
az group delete --name rg-logging-centralus --yes --no-wait
az group delete --name rg-logging-westeurope --yes --no-wait
```

---

**Próximo**: [Challenge 02: Design Log Routing and Filtering](/docs/az-305/identity-governance-monitoring/challenge-02)
