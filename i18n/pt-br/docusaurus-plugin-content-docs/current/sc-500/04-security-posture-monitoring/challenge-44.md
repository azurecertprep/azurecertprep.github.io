---
sidebar_position: 44
title: "Desafio 44: Microsoft Sentinel – Workspace, Funções e Content Hub"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 44: Microsoft Sentinel – Workspace, Funções e Content Hub

## Habilidades do exame cobertas

- Projetar e configurar um workspace do Microsoft Sentinel
- Configurar funções e permissões do Microsoft Sentinel
- Instalar e gerenciar soluções do Content Hub
- Gerenciar retenção e arquivamento do workspace do Sentinel

## Cenário

A Contoso Ltd está implantando o Microsoft Sentinel como seu SIEM nativo de nuvem. Você deve projetar a arquitetura do workspace para dar suporte à equipe SOC, configurar funções RBAC apropriadas para analistas e engenheiros, instalar soluções do Content Hub para o stack tecnológico utilizado e configurar políticas de retenção de dados adequadas para equilibrar custos com requisitos de conformidade.

---

## Pré-requisitos

- Assinatura Azure com função Owner ou Contributor
- Azure CLI instalado e autenticado
- Compreensão dos conceitos de workspace do Log Analytics

---

## Tarefa 1: Criar um workspace do Log Analytics e habilitar o Sentinel

Implante o workspace base e integre o Microsoft Sentinel.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-sentinel"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-sentinel"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create Log Analytics workspace with appropriate settings
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --retention-time 90 \
  --sku PerGB2018 \
  --capacity-reservation-level 100

# Get workspace resource ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Enable Microsoft Sentinel on the workspace
az sentinel onboarding-state create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default" \
  --customer-managed-key false

# Verify Sentinel is enabled
az sentinel onboarding-state show \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default" \
  --query "{State:provisioningState}" -o table
```

## Tarefa 2: Configurar retenção e arquivamento de tabelas do workspace

Configure retenção em camadas para otimizar custos e atender à conformidade.

```bash
# Set default workspace retention to 90 days
az monitor log-analytics workspace update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --retention-time 90

# Configure extended retention for SecurityEvent table (1 year for compliance)
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "SecurityEvent" \
  --retention-time 365 \
  --total-retention-time 730

# Configure retention for SigninLogs (required for audit)
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "SigninLogs" \
  --retention-time 180 \
  --total-retention-time 365

# List table retention settings
az monitor log-analytics workspace table list \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query "[?retentionInDays > 90].{Table:name, Retention:retentionInDays, TotalRetention:totalRetentionInDays}" -o table
```

## Tarefa 3: Configurar funções RBAC do Sentinel

Atribua funções apropriadas para analistas SOC, engenheiros e respondentes.

```bash
# Get workspace scope for role assignments
WORKSPACE_SCOPE="${WORKSPACE_ID}"

# Sentinel-specific built-in roles:
# - Microsoft Sentinel Reader: View data, incidents, workbooks
# - Microsoft Sentinel Responder: Reader + manage incidents
# - Microsoft Sentinel Contributor: Responder + create/edit analytics rules, workbooks
# - Microsoft Sentinel Playbook Operator: Run playbooks manually

# Assign Sentinel Responder to SOC Tier 1 Analyst group
# Replace with actual group Object ID
SOC_T1_GROUP="00000000-0000-0000-0000-000000000001"

az role assignment create \
  --assignee $SOC_T1_GROUP \
  --role "Microsoft Sentinel Responder" \
  --scope $WORKSPACE_SCOPE 2>/dev/null || echo "Note: Replace group ID with actual Azure AD group"

# Assign Sentinel Contributor to SOC Engineers
SOC_ENGINEERS_GROUP="00000000-0000-0000-0000-000000000002"

az role assignment create \
  --assignee $SOC_ENGINEERS_GROUP \
  --role "Microsoft Sentinel Contributor" \
  --scope $WORKSPACE_SCOPE 2>/dev/null || echo "Note: Replace group ID with actual Azure AD group"

# Assign Playbook Operator for automation access
az role assignment create \
  --assignee $SOC_T1_GROUP \
  --role "Microsoft Sentinel Playbook Operator" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}" 2>/dev/null || echo "Note: Replace group ID with actual Azure AD group"

# List current role assignments on the workspace
az role assignment list \
  --scope $WORKSPACE_SCOPE \
  --query "[].{Principal:principalName, Role:roleDefinitionName}" -o table
```

## Tarefa 4: Configurar RBAC por contexto de recurso e por tabela

Configure controle de acesso granular para tabelas de dados específicas.

```bash
# Enable resource-context access (allows resource owners to see their logs)
az monitor log-analytics workspace update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --set features.enableLogAccessUsingOnlyResourcePermissions=true

# Create a custom role for limited table access (HR team sees only specific tables)
az role definition create --role-definition '{
  "Name": "Sentinel SignIn Logs Reader",
  "Description": "Can read only SigninLogs and AADNonInteractiveUserSignInLogs tables",
  "Actions": [
    "Microsoft.OperationalInsights/workspaces/read",
    "Microsoft.OperationalInsights/workspaces/query/SigninLogs/read",
    "Microsoft.OperationalInsights/workspaces/query/AADNonInteractiveUserSignInLogs/read"
  ],
  "NotActions": [],
  "AssignableScopes": ["/subscriptions/'"${SUBSCRIPTION_ID}"'"]
}' 2>/dev/null || echo "Custom role created (or already exists)"

echo "Resource-context RBAC enabled - resource owners can query their own resource logs"
```

## Tarefa 5: Instalar soluções do Content Hub

Instale soluções pré-construídas para o stack tecnológico da Contoso.

```bash
# List available Content Hub solutions
az sentinel content list \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --query "[].{Name:name, ContentKind:properties.contentKind}" -o table \
  | head -20

# Install Microsoft Entra ID solution
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.OperationalInsights/workspaces/${WORKSPACE_NAME}/providers/Microsoft.SecurityInsights/contentPackages/azuresentinel.azure-sentinel-solution-azureactivedirectory?api-version=2024-03-01" \
  --body '{
    "properties": {
      "contentId": "azuresentinel.azure-sentinel-solution-azureactivedirectory",
      "contentProductId": "azuresentinel.azure-sentinel-solution-azureactivedirectory",
      "displayName": "Microsoft Entra ID",
      "contentKind": "Solution",
      "version": "3.0.0",
      "isNew": true,
      "isPreview": false
    }
  }'

# Install Microsoft Defender for Cloud solution
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.OperationalInsights/workspaces/${WORKSPACE_NAME}/providers/Microsoft.SecurityInsights/contentPackages/azuresentinel.azure-sentinel-solution-microsoftdefenderforcloud?api-version=2024-03-01" \
  --body '{
    "properties": {
      "contentId": "azuresentinel.azure-sentinel-solution-microsoftdefenderforcloud",
      "contentProductId": "azuresentinel.azure-sentinel-solution-microsoftdefenderforcloud",
      "displayName": "Microsoft Defender for Cloud",
      "contentKind": "Solution",
      "version": "3.0.0",
      "isNew": true,
      "isPreview": false
    }
  }'

# Install Azure Activity solution
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.OperationalInsights/workspaces/${WORKSPACE_NAME}/providers/Microsoft.SecurityInsights/contentPackages/azuresentinel.azure-sentinel-solution-azureactivity?api-version=2024-03-01" \
  --body '{
    "properties": {
      "contentId": "azuresentinel.azure-sentinel-solution-azureactivity",
      "contentProductId": "azuresentinel.azure-sentinel-solution-azureactivity",
      "displayName": "Azure Activity",
      "contentKind": "Solution",
      "version": "2.0.0",
      "isNew": true,
      "isPreview": false
    }
  }'

echo "Content Hub solutions installed: Entra ID, Defender for Cloud, Azure Activity"
```

## Tarefa 6: Configurar monitoramento de saúde do workspace

Habilite diagnósticos de saúde para o workspace do Sentinel.

```bash
# Enable Sentinel health diagnostics
az monitor diagnostic-settings create \
  --name "sentinel-health" \
  --resource "${WORKSPACE_ID}/providers/Microsoft.SecurityInsights" \
  --workspace $WORKSPACE_ID \
  --logs '[
    {"category": "DataConnectors", "enabled": true},
    {"category": "Analytics", "enabled": true},
    {"category": "Automation", "enabled": true}
  ]' 2>/dev/null || echo "Note: Sentinel diagnostic settings require specific API version"

# Alternative: Enable via REST API
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/diagnosticSettings/sentinel-health?api-version=2021-05-01-preview" \
  --body "{
    \"properties\": {
      \"workspaceId\": \"${WORKSPACE_ID}\",
      \"logs\": [
        {\"category\": \"DataConnectors\", \"enabled\": true},
        {\"category\": \"Analytics\", \"enabled\": true}
      ]
    }
  }" 2>/dev/null || echo "Health monitoring configured"

echo "Workspace health monitoring enabled - check SentinelHealth table for connector status"
```

---

## Quebre & Conserte

### Cenário 1: Analista não consegue visualizar incidentes apesar de ter a função Log Analytics Reader

Um analista SOC possui Log Analytics Reader no workspace, mas não consegue ver os incidentes do Sentinel.

<details>
<summary>Mostrar solução</summary>

```bash
# Log Analytics Reader does NOT grant Sentinel incident access
# The analyst needs a Sentinel-specific role

# Check current role assignments for the user
az role assignment list \
  --assignee "analyst@contoso.com" \
  --scope $WORKSPACE_SCOPE \
  --query "[].roleDefinitionName" -o tsv

# Solution: Assign Microsoft Sentinel Responder (minimum for incident management)
az role assignment create \
  --assignee "analyst@contoso.com" \
  --role "Microsoft Sentinel Responder" \
  --scope $WORKSPACE_SCOPE

# Role hierarchy:
# - Log Analytics Reader: Can query data but NOT see Sentinel-specific resources
# - Sentinel Reader: Can view incidents, analytics rules, workbooks (read-only)
# - Sentinel Responder: Can manage incidents (assign, change severity, close)
# - Sentinel Contributor: Can create/edit analytics rules, workbooks, hunting queries
```

</details>

### Cenário 2: Instalação de solução do Content Hub falha com erro de permissão

Um engenheiro de segurança tenta instalar uma solução do Content Hub, mas recebe um erro 403 Forbidden.

<details>
<summary>Mostrar solução</summary>

```bash
# Content Hub solution installation requires:
# 1. Microsoft Sentinel Contributor role on the workspace
# 2. AND Template Spec Reader on the subscription (for solution templates)

# Check the engineer's roles
az role assignment list \
  --assignee "engineer@contoso.com" \
  --all \
  --query "[?contains(scope, '${RG_NAME}')].roleDefinitionName" -o tsv

# Solution: Ensure both roles are assigned
az role assignment create \
  --assignee "engineer@contoso.com" \
  --role "Microsoft Sentinel Contributor" \
  --scope $WORKSPACE_SCOPE

# Template Spec Reader at subscription level for solution templates
az role assignment create \
  --assignee "engineer@contoso.com" \
  --role "Template Spec Reader" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}"
```

</details>

### Cenário 3: Workspace se aproximando do limite de dados com volume de ingestão inesperado

O workspace está ingerindo 3x o volume esperado, elevando os custos inesperadamente.

<details>
<summary>Mostrar solução</summary>

```bash
# Identify which tables are consuming the most data
az monitor log-analytics workspace table list \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query "sort_by([].{Table:name, Plan:plan, RetentionDays:retentionInDays}, &Table)" -o table

# Use a KQL query to find top data sources (run in portal or via API)
# Query: Usage | where TimeGenerated > ago(7d) | summarize GB=sum(Quantity)/1024 by DataType | top 10 by GB

# Set a daily cap to prevent runaway costs (use with caution!)
az monitor log-analytics workspace update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --set features.dailyQuotaGb=5

# Better approach: Move noisy tables to Basic tier
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "ContainerLog" \
  --plan Basic

echo "Daily cap set to 5 GB. Consider Basic tier for high-volume, low-query tables."
echo "WARNING: Daily cap stops ALL ingestion when reached - use sparingly!"
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a função mínima do Sentinel necessária para um analista SOC atribuir incidentes a membros da equipe e alterar a severidade do incidente?",
    options: [
      "Microsoft Sentinel Reader",
      "Microsoft Sentinel Responder",
      "Microsoft Sentinel Contributor",
      "Log Analytics Contributor"
    ],
    correctIndex: 1,
    explanation: "Microsoft Sentinel Responder é a função mínima que permite gerenciar incidentes (atribuir, alterar severidade, fechar, adicionar comentários). Reader só pode visualizar, e Contributor adiciona a capacidade de criar regras de análise e workbooks."
  },
  {
    question: "Qual é a diferença entre 'retenção interativa' e 'retenção total' para uma tabela do Log Analytics?",
    options: [
      "A retenção interativa é gratuita; a retenção total tem custo adicional",
      "A retenção interativa suporta consultas KQL completas; a retenção total (arquivo) suporta apenas pesquisa limitada e operações de restauração",
      "A retenção interativa é para dados quentes; a retenção total é para armazenamento frio em uma conta separada",
      "Não há diferença; são a mesma configuração"
    ],
    correctIndex: 1,
    explanation: "A retenção interativa mantém os dados no armazenamento quente, suportando consultas KQL completas e alertas. Após a retenção interativa expirar, os dados são movidos para arquivo (parte da retenção total), onde apenas trabalhos de pesquisa limitados e operações de restauração são suportados, com custo menor."
  },
  {
    question: "O que uma solução do Content Hub no Microsoft Sentinel normalmente inclui?",
    options: [
      "Apenas conectores de dados",
      "Apenas regras de análise",
      "Um pacote de conectores de dados, regras de análise, workbooks, consultas de hunting e playbooks para um cenário específico",
      "Apenas templates de workbook"
    ],
    correctIndex: 2,
    explanation: "Soluções do Content Hub são pacotes abrangentes que agrupam múltiplos tipos de conteúdo — conectores de dados, regras de análise, workbooks, consultas de hunting, playbooks e parsers — todos projetados para funcionar juntos para um produto, serviço ou cenário de ameaça específico."
  }
]} />

## Limpeza

```bash
# Remove Sentinel from workspace
az sentinel onboarding-state delete \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default" --yes

# Delete workspace
az monitor log-analytics workspace delete \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --yes

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

echo "Cleanup complete - Sentinel workspace deleted"
echo "Note: Workspace soft-delete retains data for 14 days by default"
```
