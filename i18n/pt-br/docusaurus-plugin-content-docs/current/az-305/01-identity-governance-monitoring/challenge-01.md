---
sidebar_position: 1
title: "Challenge 01: Design a Centralized Logging Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Challenge 01: Design a Centralized Logging Solution

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 25-30%**

:::

## Introducao

A Northwind Traders e uma empresa de varejo de medio porte que cresceu rapidamente por meio de aquisicoes. Atualmente opera cargas de trabalho em tres assinaturas Azure: uma para TI corporativa, uma para sua plataforma de e-commerce e uma para a equipe de analise de dados. Cada equipe gerencia logs de forma independente, resultando em pontos cegos ao solucionar incidentes entre equipes e nenhuma visao unificada para auditorias de seguranca.

O CTO determinou uma estrategia centralizada de logging que forneca um painel unico para visibilidade operacional, respeitando requisitos de soberania de dados (dados da UE devem permanecer em regioes da UE). A equipe de seguranca precisa de acesso a todos os logs relevantes de seguranca, mas a equipe de analise deve ver apenas seus proprios logs de aplicacao. O volume mensal de logs e estimado em 50 GB para TI corporativa, 200 GB para e-commerce e 100 GB para analise.

Sua tarefa e projetar uma arquitetura de workspace do Log Analytics que equilibre eficiencia de custos, controle de acesso, requisitos de conformidade e simplicidade operacional.

## Habilidades do Exame Cobertas

- Recomendar uma solucao de logging
- Recomendar uma solucao para roteamento de logs
- Recomendar uma solucao de monitoramento

## Tarefas de Design

### Parte 1: Decisao de Arquitetura de Workspace

1. Avalie as seguintes estrategias de workspace para a Northwind Traders e recomende uma com justificativa:
   - Workspace unico centralizado
   - Um workspace por assinatura
   - Um workspace por equipe/funcao
   - Abordagem hibrida (workspace de seguranca + workspaces operacionais)

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

3. Determine a(s) regiao(oes) apropriada(s) para seu(s) workspace(s) considerando o requisito de residencia de dados da UE.

### Parte 2: Implantar e Configurar o Workspace

4. Crie o(s) workspace(s) do Log Analytics de acordo com seu design usando Azure CLI.

5. Configure a politica de retencao de dados do workspace:
   - Logs de seguranca: 365 dias (requisito de conformidade)
   - Logs operacionais: 90 dias
   - Dados de desempenho: 30 dias

6. Configure retencao por tabela onde diferentes tipos de dados requerem diferentes periodos de retencao.

### Parte 3: Design de Controle de Acesso

7. Projete um modelo de acesso que satisfaca estes requisitos:
   - Equipe de seguranca: acesso de leitura a todos os logs de seguranca em todos os workspaces
   - Equipe de e-commerce: acesso de leitura/escrita apenas aos seus logs de aplicacao
   - Equipe de analise: acesso de leitura apenas ao seu proprio workspace
   - Equipe de plataforma: acesso administrativo completo a todos os workspaces

8. Implemente controle de acesso resource-context vs. workspace-context onde apropriado.

### Parte 4: Gerenciamento de Custos

9. Avalie o preco do commitment tier vs. pay-as-you-go para o volume total esperado de ingestao de 350 GB/dia.

10. Projete uma estrategia para reduzir custos de ingestao para logs verbosos mas de baixa prioridade (ex.: logs de aplicacao em nivel de debug).

## Criterios de Sucesso

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
<summary>Dica 1: Melhores Praticas de Arquitetura de Workspace</summary>

A Microsoft recomenda minimizar o numero de workspaces. Um workspace unico fornece a correlacao entre recursos mais facil e simplifica o gerenciamento. No entanto, voce precisa de multiplos workspaces quando:
- Requisitos de residencia de dados exigem separacao regional
- Isolamento estrito de acesso e necessario (alem do que o RBAC em nivel de tabela fornece)
- Voce precisa de limites de cobranca separados

Para a maioria das organizacoes, uma abordagem hibrida com um workspace central de seguranca (Microsoft Sentinel) mais um ou dois workspaces operacionais e ideal.

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
<summary>Dica 3: Retencao em Nivel de Tabela</summary>

Voce pode definir diferentes periodos de retencao por tabela dentro de um workspace. Isso e fundamental para equilibrar conformidade (retencao longa para seguranca) com custo (retencao curta para logs verbosos):

```bash
# Set SecurityEvent table to 365 days
az monitor log-analytics workspace table update \
  --resource-group rg-logging-centralus \
  --workspace-name law-northwind-central \
  --name SecurityEvent \
  --retention-time 365

# Set Perf table to 30 days
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
- **Workspace-context**: O usuario obtem acesso a todos os logs no workspace com base em permissoes em nivel de workspace
- **Resource-context**: O usuario acessa logs de um recurso especifico por meio do RBAC daquele recurso (requer `Log Analytics Reader` mais acesso ao recurso)

Para a equipe de e-commerce, resource-context e ideal porque eles precisam ver apenas logs de seus proprios recursos, sem necessitar de permissoes diretas no workspace.

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

Com 350 GB/dia de ingestao total, o commitment tier de 300 GB/dia oferece economia significativa em relacao ao pay-as-you-go. Consideracoes importantes de preco:
- Pay-as-you-go: cobrado por GB ingerido
- Commitment tiers: 100, 200, 300, 400, 500+ GB/dia com descontos crescentes
- Dados retidos alem do periodo incluso (primeiros 31 dias gratuitos) sao cobrados por GB/mes
- O tier Basic Logs e mais barato para dados de alto volume e consultas infrequentes

Compare: commitment tier de 300 GB + 50 GB de excedente vs. commitment tier de 400 GB com capacidade nao utilizada.

</details>

## Recursos de Aprendizagem

- [Design a Log Analytics workspace architecture](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/workspace-design)
- [Azure Monitor Logs overview](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-platform-logs)
- [Manage access to Log Analytics workspaces](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/manage-access)
- [Azure Monitor pricing](https://learn.microsoft.com/en-us/azure/azure-monitor/cost-usage)
- [Configure data retention and archive](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-configure)
- [Basic Logs in Azure Monitor](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/basic-logs-configure)

## Verificacao de Conhecimento

<details>
<summary>1. A Northwind Traders tem 350 GB/dia de ingestao de logs divididos entre tres equipes. A equipe de seguranca precisa consultar todos os logs, mas a equipe de analise deve ver apenas seus proprios dados. Qual e a arquitetura de workspace mais economica?</summary>

**Uma abordagem hibrida com um workspace unico usando controle de acesso resource-context** e a mais economica. Um workspace unico qualifica-se para o commitment tier de 300 GB/dia (desconto significativo), enquanto o RBAC resource-context garante que a equipe de analise veja apenas logs de seus proprios recursos. A equipe de seguranca recebe Log Analytics Reader em nivel de workspace para visibilidade completa. Adicione um segundo workspace apenas se a residencia de dados da UE exigir separacao fisica.

</details>

<details>
<summary>2. Uma empresa precisa reter logs de seguranca por 7 anos mas deseja minimizar custos. Qual combinacao de recursos deve ser usada?</summary>

**Use retencao em nivel de tabela com tier de arquivo.** Defina a retencao interativa para 90 dias para consultas ativas, depois configure a retencao total (arquivo) para 2.555 dias (7 anos). Dados arquivados custam significativamente menos que retencao interativa, mas requerem um search job ou restore para consulta. Alternativamente, exporte logs para uma Storage Account com tier cool/archive para o armazenamento de longo prazo mais barato.

</details>

<details>
<summary>3. Qual e a diferenca entre controle de acesso workspace-context e resource-context no Log Analytics?</summary>

**Workspace-context** concede aos usuarios acesso a todos os dados no workspace com base em sua atribuicao de funcao no nivel do workspace (ex.: Log Analytics Reader no workspace). **Resource-context** permite que usuarios vejam logs apenas de recursos aos quais ja possuem acesso de leitura, sem precisar de permissoes explicitas no workspace. Resource-context e habilitado pela configuracao de modo de controle de acesso do workspace e e preferido para acesso granular em nivel de recurso sem expor dados nao relacionados.

</details>

<details>
<summary>4. Quando voce deve usar multiplos workspaces do Log Analytics em vez de um workspace unico?</summary>

Use multiplos workspaces quando: (1) Requisitos de soberania/residencia de dados exigem localizacoes geograficas diferentes, (2) Voce precisa de limites rigidos de cobranca entre unidades de negocio, (3) Voce tem requisitos estritos de isolamento de tenant (provedores de servico multi-tenant), ou (4) Conformidade requer segregacao de dados que nao pode ser alcancada com RBAC em nivel de tabela. Evite multiplos workspaces apenas para controle de acesso, pois resource-context e RBAC em nivel de tabela lidam com a maioria dos cenarios dentro de um unico workspace.

</details>

## Limpeza

```bash
# Delete resource groups containing Log Analytics workspaces
az group delete --name rg-logging-centralus --yes --no-wait
az group delete --name rg-logging-westeurope --yes --no-wait
```

---

**Proximo**: [Challenge 02: Design Log Routing and Filtering](/docs/az-305/identity-governance-monitoring/challenge-02)
