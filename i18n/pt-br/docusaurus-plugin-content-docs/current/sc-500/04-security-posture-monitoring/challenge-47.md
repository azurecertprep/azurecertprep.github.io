---
sidebar_position: 47
title: "Desafio 47: Automação do Sentinel – Rules, Playbooks e Retenção de Dados"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 47: Automação do Sentinel – Rules, Playbooks e Retenção de Dados

## Habilidades do exame cobertas

- Criar e gerenciar analytics rules do Sentinel (scheduled, NRT, fusion)
- Configurar automation rules e execução de playbooks
- Projetar workflows de automação de resposta a incidentes
- Configurar estratégias de retenção e arquivamento de dados

## Cenário

A equipe de SOC da Contoso Ltd está sobrecarregada pelo volume de alertas e precisa automatizar a triagem e resposta. Você deve criar analytics rules para detectar ameaças, configurar automation rules para enriquecer incidentes, implantar playbooks para ações de resposta automatizada e definir políticas de retenção de dados que equilibrem as necessidades de investigação com a otimização de custos.

---

## Pré-requisitos

- Assinatura Azure com role de Owner ou Contributor
- Workspace do Microsoft Sentinel com dados fluindo (do Desafio 44/45)
- Azure CLI com extensão `sentinel`
- Permissões para criar Logic Apps (para playbooks)

---

## Tarefa 1: Criar uma scheduled analytics rule

Construa uma regra de detecção para tentativas de sign-in por força bruta.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-sentinel-auto"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-automation"

# Create resource group and workspace
az group create --name $RG_NAME --location $LOCATION

az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query id -o tsv)

az sentinel onboarding-state create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default"

# Create a scheduled analytics rule for brute-force detection
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/brute-force-detection?api-version=2024-03-01" \
  --body '{
    "kind": "Scheduled",
    "properties": {
      "displayName": "Brute Force Sign-In Attempts",
      "description": "Detects multiple failed sign-in attempts from the same IP within 10 minutes",
      "severity": "High",
      "enabled": true,
      "query": "SigninLogs\n| where ResultType != \"0\"\n| summarize FailedAttempts=count(), Accounts=dcount(UserPrincipalName) by IPAddress, bin(TimeGenerated, 10m)\n| where FailedAttempts > 10\n| extend AccountsTargeted = Accounts",
      "queryFrequency": "PT5M",
      "queryPeriod": "PT10M",
      "triggerOperator": "GreaterThan",
      "triggerThreshold": 0,
      "suppressionDuration": "PT1H",
      "suppressionEnabled": true,
      "tactics": ["CredentialAccess", "InitialAccess"],
      "techniques": ["T1110"],
      "incidentConfiguration": {
        "createIncident": true,
        "groupingConfiguration": {
          "enabled": true,
          "reopenClosedIncident": false,
          "lookbackDuration": "PT1H",
          "matchingMethod": "AllEntities",
          "groupByEntities": ["Ip"],
          "groupByAlertDetails": [],
          "groupByCustomDetails": []
        }
      },
      "entityMappings": [
        {
          "entityType": "IP",
          "fieldMappings": [{"identifier": "Address", "columnName": "IPAddress"}]
        }
      ],
      "alertDetailsOverride": {
        "alertDisplayNameFormat": "Brute Force from {{IPAddress}} - {{FailedAttempts}} attempts",
        "alertDescriptionFormat": "IP {{IPAddress}} attempted {{FailedAttempts}} failed logins targeting {{AccountsTargeted}} accounts"
      }
    }
  }'

echo "Scheduled analytics rule created: Brute Force Sign-In Attempts"
```

## Tarefa 2: Criar uma analytics rule Near-Real-Time (NRT)

Implante uma regra NRT para detecção imediata de ameaças de alta prioridade.

```bash
# Create NRT rule for privileged account compromise
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/nrt-privileged-signin-anomaly?api-version=2024-03-01" \
  --body '{
    "kind": "NRT",
    "properties": {
      "displayName": "NRT: Privileged Account Sign-In from New Location",
      "description": "Near-real-time detection of Global Admin sign-ins from previously unseen locations",
      "severity": "Critical",
      "enabled": true,
      "query": "SigninLogs\n| where UserPrincipalName in (\"admin@contoso.com\", \"globaladmin@contoso.com\")\n| where ResultType == \"0\"\n| where RiskLevelDuringSignIn in (\"high\", \"medium\")\n| extend City = tostring(LocationDetails.city), Country = tostring(LocationDetails.countryOrRegion)\n| project TimeGenerated, UserPrincipalName, IPAddress, City, Country, AppDisplayName, RiskLevelDuringSignIn",
      "suppressionDuration": "PT30M",
      "suppressionEnabled": true,
      "tactics": ["InitialAccess"],
      "techniques": ["T1078.004"],
      "incidentConfiguration": {
        "createIncident": true,
        "groupingConfiguration": {
          "enabled": true,
          "reopenClosedIncident": true,
          "lookbackDuration": "PT4H",
          "matchingMethod": "AllEntities",
          "groupByEntities": ["Account"],
          "groupByAlertDetails": [],
          "groupByCustomDetails": []
        }
      },
      "entityMappings": [
        {
          "entityType": "Account",
          "fieldMappings": [{"identifier": "FullName", "columnName": "UserPrincipalName"}]
        },
        {
          "entityType": "IP",
          "fieldMappings": [{"identifier": "Address", "columnName": "IPAddress"}]
        }
      ]
    }
  }'

echo "NRT rule created - detects privileged sign-ins within ~1 minute of occurrence"
```

## Tarefa 3: Criar uma automation rule para enriquecimento de incidentes

Configure uma automation rule que auto-atribui incidentes e adiciona tags.

```bash
# Create an automation rule to triage brute-force incidents
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/automationRules/auto-triage-brute-force?api-version=2024-03-01" \
  --body '{
    "properties": {
      "displayName": "Auto-triage Brute Force Incidents",
      "order": 1,
      "triggeringLogic": {
        "isEnabled": true,
        "triggersOn": "Incidents",
        "triggersWhen": "Created",
        "conditions": [
          {
            "conditionType": "Property",
            "conditionProperties": {
              "propertyName": "IncidentTitle",
              "operator": "Contains",
              "propertyValues": ["Brute Force"]
            }
          }
        ]
      },
      "actions": [
        {
          "actionType": "ModifyProperties",
          "order": 1,
          "actionConfiguration": {
            "severity": "High",
            "status": "Active",
            "owner": {
              "assignedTo": "SOC Tier 1"
            },
            "labels": [
              {"labelName": "AutoTriaged", "labelType": "User"},
              {"labelName": "BruteForce", "labelType": "User"}
            ]
          }
        }
      ]
    }
  }'

echo "Automation rule created - brute force incidents auto-assigned to SOC Tier 1"
```

## Tarefa 4: Implantar um Playbook (Logic App) para resposta automatizada

Crie um Playbook em Logic App que bloqueia um endereço IP quando acionado.

```bash
# Create a Logic App for the playbook
az logic workflow create \
  --resource-group $RG_NAME \
  --name "playbook-block-ip" \
  --location $LOCATION \
  --definition '{
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "triggers": {
      "Microsoft_Sentinel_incident": {
        "type": "ApiConnectionWebhook",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters($connections)[azuresentinel][connectionId]"
            }
          },
          "body": {
            "callback_url": "@listCallbackUrl()"
          },
          "path": "/incident-creation"
        }
      }
    },
    "actions": {
      "Get_Incident_Entities": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters($connections)[azuresentinel][connectionId]"
            }
          },
          "method": "post",
          "path": "/entities/@{triggerBody()?[object]?[properties]?[incidentNumber]}"
        },
        "runAfter": {}
      },
      "Add_Comment_to_Incident": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters($connections)[azuresentinel][connectionId]"
            }
          },
          "method": "post",
          "body": {
            "incidentArmId": "@triggerBody()?[object]?[id]",
            "message": "Automated response: IP address has been submitted for blocking via NSG rule."
          },
          "path": "/comment"
        },
        "runAfter": {"Get_Incident_Entities": ["Succeeded"]}
      }
    },
    "parameters": {
      "$connections": {
        "type": "Object"
      }
    }
  }'

# Enable managed identity on the Logic App for Sentinel access
az logic workflow identity assign \
  --resource-group $RG_NAME \
  --name "playbook-block-ip"

PLAYBOOK_IDENTITY=$(az logic workflow show \
  --resource-group $RG_NAME \
  --name "playbook-block-ip" \
  --query "identity.principalId" -o tsv)

# Grant the playbook Sentinel Responder role
az role assignment create \
  --assignee $PLAYBOOK_IDENTITY \
  --role "Microsoft Sentinel Responder" \
  --scope $WORKSPACE_ID

echo "Playbook deployed with managed identity and Sentinel Responder role"
```

## Tarefa 5: Vincular a automation rule à execução do Playbook

Atualize a automation rule para acionar o Playbook após a criação de um Incident.

```bash
# Get the Logic App resource ID
PLAYBOOK_ID=$(az logic workflow show \
  --resource-group $RG_NAME \
  --name "playbook-block-ip" \
  --query id -o tsv)

# Create an automation rule that triggers the playbook for critical incidents
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/automationRules/auto-respond-critical?api-version=2024-03-01" \
  --body "{
    \"properties\": {
      \"displayName\": \"Auto-respond to Critical Incidents\",
      \"order\": 2,
      \"triggeringLogic\": {
        \"isEnabled\": true,
        \"triggersOn\": \"Incidents\",
        \"triggersWhen\": \"Created\",
        \"conditions\": [
          {
            \"conditionType\": \"Property\",
            \"conditionProperties\": {
              \"propertyName\": \"IncidentSeverity\",
              \"operator\": \"Equals\",
              \"propertyValues\": [\"Critical\"]
            }
          }
        ]
      },
      \"actions\": [
        {
          \"actionType\": \"RunPlaybook\",
          \"order\": 1,
          \"actionConfiguration\": {
            \"logicAppResourceId\": \"${PLAYBOOK_ID}\",
            \"tenantId\": \"$(az account show --query tenantId -o tsv)\"
          }
        }
      ]
    }
  }"

echo "Automation rule linked to playbook - Critical incidents trigger auto-response"
```

## Tarefa 6: Configurar estratégia de retenção e arquivamento de dados

Defina retenção em camadas para diferentes tabelas de segurança.

```bash
# Configure retention tiers for different security data
# Tier 1: High-value data - 365 days interactive, 730 total
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "SecurityIncident" \
  --retention-time 365 \
  --total-retention-time 730

# Tier 2: Investigation data - 180 days interactive, 365 total
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "SecurityAlert" \
  --retention-time 180 \
  --total-retention-time 365

# Tier 3: Raw telemetry - 90 days interactive, 180 total (cost optimization)
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "Syslog" \
  --retention-time 90 \
  --total-retention-time 180

# Verify retention configuration
az monitor log-analytics workspace table list \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query "[?retentionInDays != totalRetentionInDays].{Table:name, Interactive:retentionInDays, Archive:totalRetentionInDays, Plan:plan}" -o table

echo ""
echo "Retention strategy:"
echo "  SecurityIncident: 365d interactive + 365d archive (2 years total)"
echo "  SecurityAlert: 180d interactive + 185d archive (1 year total)"
echo "  Syslog: 90d interactive + 90d archive (180 days total)"
```

---

## Quebre & Conserte

### Cenário 1: Analytics rule dispara mas nenhum Incident é criado

A scheduled rule gera alertas (visíveis na tabela SecurityAlert), mas incidentes não estão sendo criados.

<details>
<summary>Mostrar solução</summary>

```bash
# Check the incident configuration in the analytics rule
az rest --method GET \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/brute-force-detection?api-version=2024-03-01" \
  --query "properties.incidentConfiguration" -o json

# Common causes:
# 1. incidentConfiguration.createIncident is set to false
# 2. Grouping configuration is merging alerts into existing incidents
# 3. An automation rule is closing incidents immediately

# Fix: Ensure createIncident is true
az rest --method PATCH \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/brute-force-detection?api-version=2024-03-01" \
  --body '{
    "kind": "Scheduled",
    "properties": {
      "incidentConfiguration": {
        "createIncident": true,
        "groupingConfiguration": {
          "enabled": true,
          "reopenClosedIncident": false,
          "lookbackDuration": "PT1H",
          "matchingMethod": "AllEntities",
          "groupByEntities": ["Ip"]
        }
      }
    }
  }'

# Also check for automation rules that might be closing incidents
az rest --method GET \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/automationRules?api-version=2024-03-01" \
  --query "value[].{Name:properties.displayName, Actions:properties.actions[].actionType}" -o table
```

</details>

### Cenário 2: Playbook falha com "Forbidden" ao atualizar incidentes

A automation rule aciona o Playbook, mas ele falha com erro 403 ao tentar adicionar comentários aos incidentes.

<details>
<summary>Mostrar solução</summary>

```bash
# Check the playbook's managed identity role assignments
PLAYBOOK_IDENTITY=$(az logic workflow show \
  --resource-group $RG_NAME \
  --name "playbook-block-ip" \
  --query "identity.principalId" -o tsv)

az role assignment list \
  --assignee $PLAYBOOK_IDENTITY \
  --all \
  --query "[].{Role:roleDefinitionName, Scope:scope}" -o table

# The playbook needs Microsoft Sentinel Responder on the workspace
# AND the automation rule needs "Microsoft Sentinel Automation Contributor" 
# to run playbooks

# Fix: Assign correct roles
az role assignment create \
  --assignee $PLAYBOOK_IDENTITY \
  --role "Microsoft Sentinel Responder" \
  --scope $WORKSPACE_ID

# The user/identity that created the automation rule also needs:
az role assignment create \
  --assignee "$(az account show --query user.name -o tsv)" \
  --role "Microsoft Sentinel Automation Contributor" \
  --scope $WORKSPACE_ID

echo "Roles assigned - playbook should now have permission to update incidents"
```

</details>

### Cenário 3: Regra NRT não detecta eventos que aparecem em consulta manual

Executar a consulta KQL manualmente retorna resultados, mas a regra NRT nunca dispara.

<details>
<summary>Mostrar solução</summary>

```bash
# Check if the rule is enabled
az rest --method GET \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/nrt-privileged-signin-anomaly?api-version=2024-03-01" \
  --query "{Enabled:properties.enabled, Suppression:properties.suppressionEnabled, SuppressionDuration:properties.suppressionDuration}"

# Common causes for NRT rules not firing:
# 1. Suppression is enabled and the suppression window hasn't expired
# 2. The query uses time filters (NRT rules automatically scope to recent data)
# 3. Data ingestion delay - NRT processes data as it arrives

# Fix: Remove any time filters from the NRT query
# NRT rules should NOT contain "| where TimeGenerated > ago(...)" 
# The system automatically handles the time window

# Check if suppression is blocking repeated fires
# Reduce suppression or disable temporarily for testing
az rest --method PATCH \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/nrt-privileged-signin-anomaly?api-version=2024-03-01" \
  --body '{
    "kind": "NRT",
    "properties": {
      "suppressionEnabled": false
    }
  }'

echo "Suppression disabled - NRT rule will fire on every matching event"
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a latência máxima de detecção para uma analytics rule Near-Real-Time (NRT) no Sentinel?",
    options: [
      "A cada 5 minutos",
      "Aproximadamente 1 minuto após a ingestão dos dados",
      "A cada 15 minutos",
      "Imediatamente (sub-segundo)"
    ],
    correctIndex: 1,
    explanation: "As analytics rules NRT processam dados em aproximadamente 1 minuto após a ingestão. Elas executam continuamente sem uma frequência configurada, verificando cada lote de dados conforme chega. Isso as torna muito mais rápidas que regras scheduled (frequência mínima de 5 minutos)."
  },
  {
    question: "Qual role a managed identity de um Playbook em Logic App precisa para atualizar incidentes no Sentinel?",
    options: [
      "Logic App Contributor",
      "Microsoft Sentinel Responder (mínimo)",
      "Owner no resource group",
      "Log Analytics Contributor"
    ],
    correctIndex: 1,
    explanation: "A managed identity de um Playbook precisa no mínimo da role Microsoft Sentinel Responder no workspace para atualizar incidentes (alterar status, severidade, adicionar comentários, atribuir). Para executar playbooks via automation rules, o criador da regra também precisa da role Sentinel Automation Contributor."
  },
  {
    question: "Como automation rules e playbooks diferem no Sentinel?",
    options: [
      "São a mesma coisa com nomes diferentes",
      "Automation rules definem condições e ações simples (triagem); playbooks são Logic Apps que executam respostas complexas em múltiplas etapas",
      "Playbooks executam mais rápido que automation rules",
      "Automation rules exigem licença premium; playbooks são gratuitos"
    ],
    correctIndex: 1,
    explanation: "Automation rules são pares leves de condição-ação para triagem de incidentes (atribuir, etiquetar, alterar severidade, fechar ou acionar playbooks). Playbooks são Logic Apps completos que podem realizar orquestração complexa: chamar APIs externas, enviar e-mails, bloquear IPs, criar tickets, etc."
  },
  {
    question: "O que acontece com os dados após o período de retenção interativa expirar, mas antes do fim da retenção total?",
    options: [
      "Os dados são permanentemente excluídos",
      "Os dados passam para a camada de arquivo, onde apenas search jobs e operações de restore funcionam",
      "Os dados são comprimidos mas totalmente consultáveis",
      "Os dados são exportados para Blob storage automaticamente"
    ],
    correctIndex: 1,
    explanation: "Após a retenção interativa expirar, os dados entram na camada de arquivo (porção restante da retenção total). Dados arquivados suportam apenas search jobs limitados e operações de restore-to-table — não consultas KQL diretas, alertas ou analytics rules. Isso fornece armazenamento de longo prazo com custo otimizado para compliance."
  }
]} />

## Limpeza

```bash
# Delete automation rules
az rest --method DELETE \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/automationRules/auto-triage-brute-force?api-version=2024-03-01"

az rest --method DELETE \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/automationRules/auto-respond-critical?api-version=2024-03-01"

# Delete analytics rules
az rest --method DELETE \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/brute-force-detection?api-version=2024-03-01"

az rest --method DELETE \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/alertRules/nrt-privileged-signin-anomaly?api-version=2024-03-01"

# Delete playbook
az logic workflow delete \
  --resource-group $RG_NAME \
  --name "playbook-block-ip" --yes

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

echo "Cleanup complete - all automation resources removed"
```
