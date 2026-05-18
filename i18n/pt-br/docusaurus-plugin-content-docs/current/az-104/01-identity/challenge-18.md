---
sidebar_position: 18
title: "Desafio 18: Gerenciamento de Custos & Azure Advisor"
---

# Desafio 18: Gerenciamento de Custos & Azure Advisor

:::info Tempo Estimado e Custo

**45-60 minutos** | **Custo estimado**: Gratuito (operações do plano de gerenciamento) | **Peso no Exame: 10-15%**

:::

## Cenário

A conta mensal do Azure da Contoso Ltd. cresceu de $5.000 para $45.000 em seis meses, e o CFO está exigindo respostas. Ninguém sabe qual departamento está gastando o quê, não há alertas quando os orçamentos são excedidos, e o CTO suspeita que existem recursos ociosos queimando dinheiro. Você foi encarregado de implementar uma estratégia abrangente de gerenciamento de custos usando Azure Cost Management, orçamentos, alertas e recomendações do Azure Advisor.

## Habilidades do Exame Cobertas

| Habilidade | Peso |
|------------|------|
| Gerenciar custos usando alertas, orçamentos e recomendações do Azure Advisor | Alto |
| Configurar e revisar análise de custos do Azure | Médio |
| Implementar e gerenciar tags de recursos do Azure para alocação de custos | Alto |
| Interpretar recomendações de custo do Azure Advisor | Médio |
| Configurar grupos de ação para alertas de custo | Médio |

## Referência Sysadmin ↔ Azure

| On-Prem / Sysadmin | Equivalente Azure | Notas |
|---------------------|-------------------|-------|
| Planilha de planejamento de capacidade | Azure Cost Analysis | Visualização de gastos em tempo real |
| Revisão mensal de fatura | Orçamentos do Cost Management | Alertas proativos de limite |
| Rotular servidores por departamento | Tags de recursos do Azure | Metadados para alocação de custos |
| Recomendações de atualização de hardware | Azure Advisor | Redimensionamento, detecção de recursos ociosos |
| Email do chefe quando gasta demais | Alertas de orçamento + Action Groups | Notificações automatizadas nos limites |
| Relatórios de chargeback | Exportações de custo + filtro por tag | Detalhamento de custos por departamento |
| Monitoramento de utilização de disco | Redimensionamento do Advisor | Sugestões de otimização de VM e disco |

## Tarefas

### Tarefa 1: Configurar Tags de Recursos para Alocação de Custos

Crie uma estratégia consistente de tagging e aplique tags aos recursos existentes:

```bash
# Criar um grupo de recursos com tags de rastreamento de custos
az group create \
  --name rg-cost-lab \
  --location eastus \
  --tags Department=Engineering Environment=Development CostCenter=CC-4200 Owner=admin@contoso.com

# Criar recursos de exemplo com tags
az storage account create \
  --name stcostlab$RANDOM \
  --resource-group rg-cost-lab \
  --location eastus \
  --sku Standard_LRS \
  --tags Department=Engineering Environment=Development CostCenter=CC-4200 Project=WebApp

az vm create \
  --name vm-cost-test \
  --resource-group rg-cost-lab \
  --image Ubuntu2404 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --tags Department=Engineering Environment=Development CostCenter=CC-4200 Project=API
```

### Tarefa 2: Criar um Orçamento com Alertas

Crie um orçamento mensal com múltiplos limites de alerta:

```bash
# Criar um orçamento para o grupo de recursos (mensal, limite de $100)
az consumption budget create \
  --budget-name "budget-engineering-dev" \
  --amount 100 \
  --category Cost \
  --time-grain Monthly \
  --start-date "2024-01-01" \
  --end-date "2025-12-31" \
  --resource-group rg-cost-lab
```

:::tip Dica

1. Navegue até **Gerenciamento de Custos + Cobrança** > **Gerenciamento de Custos** > **Orçamentos**
2. Clique em **+ Adicionar** para criar um novo orçamento
3. Defina o escopo para seu grupo de recursos ou assinatura
4. Configure o valor do orçamento ($100 mensal)
5. Adicione condições de alerta:
   - **50% real** | notificar a equipe antecipadamente
   - **75% real** | escalar para o gerente
   - **100% real** | alertar todos os stakeholders
   - **110% previsto** | aviso proativo de previsão
6. Configure o grupo de ação ou destinatários de email para cada limite

:::

### Tarefa 3: Configurar Visualizações de Análise de Custos

Explore a análise de custos no Portal do Azure:

1. Navegue até **Gerenciamento de Custos** > **Análise de custos**
2. Crie as seguintes visualizações salvas:

**Visualização 1: Custo por Departamento (Tag)**
- Agrupar por: Tag (Department)
- Granularidade: Mensal
- Tipo de gráfico: Coluna (empilhado)

**Visualização 2: Custo por Tipo de Recurso**
- Agrupar por: Tipo de recurso
- Granularidade: Diário
- Intervalo de datas: Últimos 30 dias

**Visualização 3: Custo por Localização**
- Agrupar por: Localização
- Granularidade: Mensal
- Tipo de gráfico: Rosca

```bash
# Consulta de custo via CLI (preview) - visualizar custos por tag
az costmanagement query \
  --type ActualCost \
  --scope "subscriptions/$(az account show --query id -o tsv)" \
  --timeframe MonthToDate \
  --dataset-grouping name=Department type=TagKey
```

### Tarefa 4: Configurar Exportações de Custos

Configure a exportação automatizada de dados de custo para uma conta de armazenamento:

```bash
# Obter o nome da conta de armazenamento
STORAGE_NAME=$(az storage account list -g rg-cost-lab --query "[0].name" -o tsv)

# Criar um contêiner para exportações de custo
az storage container create \
  --name cost-exports \
  --account-name $STORAGE_NAME \
  --auth-mode login

# Criar uma exportação agendada (diária)
az costmanagement export create \
  --name "daily-cost-export" \
  --scope "subscriptions/$(az account show --query id -o tsv)" \
  --type ActualCost \
  --timeframe MonthToDate \
  --storage-account-id $(az storage account show -n $STORAGE_NAME -g rg-cost-lab --query id -o tsv) \
  --storage-container cost-exports \
  --storage-directory "exports" \
  --schedule-recurrence Daily \
  --schedule-status Active
```

### Tarefa 5: Revisar Recomendações do Azure Advisor

```bash
# Listar todas as recomendações do Advisor
az advisor recommendation list -o table

# Filtrar apenas recomendações de custo
az advisor recommendation list \
  --category Cost \
  --query "[].{Resource:resourceMetadata.resourceId, Problem:shortDescription.problem, Impact:impact}" \
  -o table

# Obter recomendação detalhada para um recurso específico
az advisor recommendation list \
  --category Cost \
  --query "[0]"
```

:::tip Dica

Navegue até **Azure Advisor** > aba **Custo** para ver:
- VMs subutilizadas (redimensionar ou desligar)
- Discos gerenciados não anexados
- Load balancers ociosos, IPs públicos e circuitos ExpressRoute
- Recomendações de compra de Reserved Instances
- Planos de App Service não utilizados

:::

### Tarefa 6: Implementar Notificações de Gastos com Action Groups

```bash
# Criar um grupo de ação para alertas de custo
az monitor action-group create \
  --name "ag-cost-alerts" \
  --resource-group rg-cost-lab \
  --short-name "CostAlert" \
  --action email finance-team finance@contoso.com

# Verificar o grupo de ação
az monitor action-group show \
  --name "ag-cost-alerts" \
  --resource-group rg-cost-lab \
  --query "{Name:name, Receivers:emailReceivers[].{Name:name, Email:emailAddress}}" -o json
```

### Tarefa 7: Impor Tagging com Azure Policy

Aplique uma política que nega a criação de recursos sem a tag CostCenter obrigatória:

```bash
# Obter a definição da política integrada
POLICY_DEF=$(az policy definition list \
  --query "[?displayName=='Require a tag on resources'].id" -o tsv)

# Atribuir a política para impor a tag CostCenter
az policy assignment create \
  --name "require-costcenter-tag" \
  --display-name "Require CostCenter Tag" \
  --policy "$POLICY_DEF" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/rg-cost-lab" \
  --params '{"tagName": {"value": "CostCenter"}}'

# Teste: Tentar criar um recurso sem a tag (deve falhar após a política entrar em vigor)
az storage account create \
  --name stnotagtest$RANDOM \
  --resource-group rg-cost-lab \
  --location eastus \
  --sku Standard_LRS
```

## Critérios de Sucesso

- [ ] Recursos estão tagueados com tags Department, Environment, CostCenter e Owner
- [ ] Um orçamento mensal existe com pelo menos dois limites de alerta (50% e 100%)
- [ ] Visualizações de análise de custos mostram gastos agrupados por tag, tipo de recurso e localização
- [ ] Uma exportação automatizada de custos está configurada para uma conta de armazenamento
- [ ] Recomendações de custo do Azure Advisor foram revisadas
- [ ] Um grupo de ação existe para notificações de alertas de custo
- [ ] Uma política de tagging está atribuída que exige a tag CostCenter

## Dicas

<details>
<summary>Dica 1: Escopo do orçamento</summary>

Orçamentos podem ter escopo de assinatura, grupo de recursos ou grupo de gerenciamento. Para o exame, saiba que alertas de orçamento são informativos por padrão | eles não interrompem os gastos. Para desligar recursos automaticamente, você precisa combinar alertas de orçamento com runbooks do Azure Automation ou Logic Apps.

</details>

<details>
<summary>Dica 2: Herança de tags</summary>

Tags NÃO são herdadas de grupos de recursos para recursos. Se você taguear um grupo de recursos com "Department=IT", os recursos dentro dele não recebem automaticamente essa tag. Use Azure Policy com o efeito "Herdar uma tag do grupo de recursos" para impor a herança.

</details>

<details>
<summary>Dica 3: Atualização de recomendações do Advisor</summary>

O Azure Advisor atualiza recomendações a cada 24 horas. Se você acabou de criar recursos, as recomendações podem não aparecer imediatamente. Você pode disparar manualmente uma atualização no portal via Advisor > Visão Geral > Atualizar.

</details>

<details>
<summary>Dica 4: Acesso à análise de custos</summary>

Para visualizar custos, você precisa no mínimo da função **Cost Management Reader** ou função **Reader** no escopo. Billing Account Reader fornece acesso a dados de fatura, mas não à análise de custos no nível de recursos.

</details>

## Quebrar & Consertar

### Cenário A: Orçamento Não Está Alertando

Você criou um orçamento com um limite de $100, mas os gastos chegaram a $120 e nenhum alerta foi enviado. Investigue: Um grupo de ação foi configurado? O endereço de email é válido? Verifique as condições de alerta do orçamento e certifique-se de que "real" vs "previsto" está configurado corretamente.

### Cenário B: Recursos Sem Tags

Execute uma consulta para encontrar todos os recursos em um grupo de recursos que estão sem a tag CostCenter. Como você remedia recursos existentes sem tags? (Resposta: Use tarefas de remediação de política com efeitos "Modify" ou "DeployIfNotExists".)

```bash
# Encontrar recursos sem a tag CostCenter
az resource list --resource-group rg-cost-lab \
  --query "[?tags.CostCenter==null].{Name:name, Type:type}" -o table
```

### Cenário C: Falhas na Exportação de Custos

Sua exportação diária de custos parou de funcionar. Verifique o status da exportação e causas comuns: rotação de chave da conta de armazenamento, contêiner excluído ou restrições de acesso de rede na conta de armazenamento.

## Verificação de Conhecimento

<details>
<summary>1. Qual é a diferença entre alertas de orçamento reais e previstos?</summary>

**Alertas reais** disparam quando os gastos cumulativos atingem o percentual limite do orçamento. **Alertas previstos** disparam quando a projeção de gastos ao final do período deve exceder o limite. Alertas previstos são proativos | eles avisam antes de você gastar demais com base nas tendências de gastos.

</details>

<details>
<summary>2. Os orçamentos do Azure podem interromper automaticamente o consumo de recursos?</summary>

**Não.** Alertas de orçamento são apenas informativos | eles enviam notificações, mas não param ou excluem recursos. Para automatizar ações de controle de custos (como desligar VMs), você deve combinar alertas de orçamento com **Action Groups** que acionam **runbooks do Azure Automation** ou **Logic Apps**.

</details>

<details>
<summary>3. Quais são as categorias de recomendações do Azure Advisor?</summary>

1. **Custo** | Redimensionar ou desligar recursos subutilizados
2. **Segurança** | Detecção de vulnerabilidades e ameaças
3. **Confiabilidade** | Alta disponibilidade e continuidade de negócios
4. **Desempenho** | Melhorias de velocidade e responsividade
5. **Excelência Operacional** | Melhores práticas de processos e workflows

(Nota: Na verdade existem cinco categorias nas atualizações mais recentes.)

</details>

<details>
<summary>4. Qual função é necessária para criar orçamentos?</summary>

Para criar orçamentos, você precisa da função **Cost Management Contributor** (ou Contributor/Owner). A função **Cost Management Reader** só permite visualizar custos e orçamentos, mas não criá-los.

</details>

## Limpeza

```bash
# Excluir atribuição de política
az policy assignment delete \
  --name "require-costcenter-tag" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/rg-cost-lab"

# Excluir exportação de custos
az costmanagement export delete \
  --name "daily-cost-export" \
  --scope "subscriptions/$(az account show --query id -o tsv)"

# Excluir grupo de ação
az monitor action-group delete \
  --name "ag-cost-alerts" \
  --resource-group rg-cost-lab

# Excluir o grupo de recursos inteiro e todos os recursos
az group delete --name rg-cost-lab --yes --no-wait

echo "Limpeza concluída. Dados de custo ainda podem aparecer por 24-48 horas."
```

## Recursos de Aprendizagem

- [Visão geral do Azure Cost Management](https://learn.microsoft.com/en-us/azure/cost-management-billing/cost-management-billing-overview)
- [Criar e gerenciar orçamentos](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets)
- [Usar análise de custos](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/quick-acm-cost-analysis)
- [Recomendações de custo do Azure Advisor](https://learn.microsoft.com/en-us/azure/advisor/advisor-cost-recommendations)
- [Taguear recursos para gerenciamento de custos](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/cost-mgt-best-practices#tag-shared-resources)
- [Exportar dados de custo](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-export-acm-data)
