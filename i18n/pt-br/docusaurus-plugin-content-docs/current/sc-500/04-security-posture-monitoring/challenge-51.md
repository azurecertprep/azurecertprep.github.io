---
sidebar_position: 51
title: "Desafio 51: Arquitetura de Monitoramento de Segurança – Cenário de Detecção End-to-End"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 51: Arquitetura de Monitoramento de Segurança – Cenário de Detecção End-to-End

## Habilidades do exame cobertas

- Projetar arquiteturas completas de monitoramento de segurança para ambientes corporativos
- Definir fontes de log e configurar data connectors
- Criar regras de análise (scheduled, NRT, fusion)
- Construir playbooks de automação com Logic Apps
- Projetar workbooks e dashboards de segurança
- Escrever consultas KQL para detecções comuns de ameaças
- Implementar estratégias de retenção de dados e otimização de custos

## Cenário

A Contoso Ltd é uma empresa de serviços financeiros com 5.000 funcionários passando por uma transformação para a nuvem. Eles possuem uma infraestrutura híbrida com Active Directory on-premises, cargas de trabalho no Azure, Microsoft 365 e um footprint SaaS crescente. O CISO encarregou você de projetar e implementar uma arquitetura abrangente de monitoramento de segurança usando o Microsoft Sentinel.

Seu design deve detectar as seguintes categorias de ameaças:
- **Ataques de força bruta** contra contas de usuário
- **Impossible travel** em logins indicando roubo de credenciais
- **Escalação de privilégios** via atribuições de role não autorizadas
- **Exfiltração de dados** do SharePoint/OneDrive
- **Indicadores de malware/ransomware** em endpoints
- **Abuso de recursos em nuvem** (cryptomining, implantações não autorizadas)

---

## Pré-requisitos

- Assinatura do Azure com role Owner ou Contributor
- Licenciamento Microsoft 365 E5 ou equivalente em segurança
- Azure CLI com extensões `sentinel` e `monitor`
- Role Microsoft Sentinel Contributor
- Role Logic Apps Contributor (para playbooks)
- Conhecimento de KQL e framework MITRE ATT&CK

---

## Tarefa 1: Projetar a arquitetura de monitoramento e implantar o workspace

Defina a arquitetura de monitoramento de segurança da Contoso com design de workspace adequado.

```bash
# Architecture design variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-soc-architecture"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-soc"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create Log Analytics workspace with appropriate retention
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --retention-time 90 \
  --sku PerGB2018

# Enable Sentinel
az sentinel onboarding-state create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default"

# Get workspace ID for later use
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Configure data retention tiers
# Hot tier: 90 days (default interactive queries)
# Archive tier: 2 years (compliance requirement for financial services)
az monitor log-analytics workspace table update \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "SecurityEvent" \
  --retention-time 90 \
  --total-retention-time 730

az monitor log-analytics workspace table update \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "SigninLogs" \
  --retention-time 90 \
  --total-retention-time 730

az monitor log-analytics workspace table update \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "AuditLogs" \
  --retention-time 90 \
  --total-retention-time 730
```

**Visão geral da arquitetura:**

| Componente | Finalidade | Volume de Dados (est.) |
|-----------|---------|-------------------|
| Logs de Sign-in/Audit do Entra ID | Detecção de ameaças de identidade | ~2 GB/dia |
| Atividade do Microsoft 365 | Ameaças em Email/SharePoint/Teams | ~5 GB/dia |
| Logs de Azure Activity | Abuso de recursos em nuvem | ~500 MB/dia |
| Defender for Endpoint | Malware em endpoint/EDR | ~3 GB/dia |
| Defender for Cloud | Alertas de postura em nuvem | ~200 MB/dia |
| Diagnósticos do Azure Key Vault | Monitoramento de acesso a credenciais | ~100 MB/dia |
| Logs do Azure Firewall | Ameaças em nível de rede | ~1 GB/dia |
| AD on-premises (via AMA) | Monitoramento de identidade híbrida | ~1 GB/dia |
| **Total estimado de ingestão** | | **~13 GB/dia** |

---

## Tarefa 2: Configurar data connectors para todas as fontes de log

Habilite os data connectors que alimentam a arquitetura de monitoramento da Contoso.

```bash
# Microsoft Entra ID connector (Sign-in and Audit logs)
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "AzureActiveDirectory" \
  --aad \
  --tenant-id $(az account show --query tenantId -o tsv) \
  --data-types-alerts-state "Enabled" \
  --data-types-sign-in-logs-state "Enabled" \
  --data-types-audit-logs-state "Enabled"

# Microsoft Defender XDR connector
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "MicrosoftThreatProtection" \
  --microsoft-threat-protection \
  --tenant-id $(az account show --query tenantId -o tsv) \
  --data-types-incidents-state "Enabled" \
  --data-types-alerts-state "Enabled"

# Microsoft Defender for Cloud connector
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "AzureSecurityCenter" \
  --asc \
  --subscription-id $SUBSCRIPTION_ID \
  --data-types-alerts-state "Enabled"

# Azure Activity connector
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "AzureActivity" \
  --azure-activity \
  --subscription-id $SUBSCRIPTION_ID \
  --data-types-azure-activity-state "Enabled"

# Microsoft 365 connector (Exchange, SharePoint, Teams)
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "Office365" \
  --office365 \
  --tenant-id $(az account show --query tenantId -o tsv) \
  --data-types-exchange-state "Enabled" \
  --data-types-share-point-state "Enabled" \
  --data-types-teams-state "Enabled"

# Configure diagnostic settings for Key Vault
az monitor diagnostic-settings create \
  --name "send-to-sentinel" \
  --resource "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG_NAME/providers/Microsoft.KeyVault/vaults/kv-contoso-prod" \
  --workspace $WORKSPACE_ID \
  --logs '[{"category":"AuditEvent","enabled":true},{"category":"AllMetrics","enabled":false}]' \
  2>/dev/null || echo "Key Vault diagnostic settings - configure after KV is created"

# Configure diagnostic settings for Azure Firewall
az monitor diagnostic-settings create \
  --name "send-to-sentinel" \
  --resource "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG_NAME/providers/Microsoft.Network/azureFirewalls/fw-contoso-hub" \
  --workspace $WORKSPACE_ID \
  --logs '[{"category":"AzureFirewallApplicationRule","enabled":true},{"category":"AzureFirewallNetworkRule","enabled":true},{"category":"AzureFirewallDnsProxy","enabled":true}]' \
  2>/dev/null || echo "Firewall diagnostic settings - configure after FW is created"
```

**Verificar status dos conectores:**

```bash
# List all configured data connectors
az sentinel data-connector list \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --query "[].{Name:name, Kind:kind}" -o table
```

---

## Tarefa 3: Criar regras de análise para detecção de ameaças

Implemente regras de detecção para cada categoria de ameaça nos requisitos da Contoso.

### Detecção 1: Detecção de ataque de força bruta

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "detect-brute-force" \
  --scheduled \
  --name "Brute Force Attack Detected" \
  --description "Detects multiple failed sign-in attempts followed by a success from the same IP" \
  --severity "High" \
  --enabled true \
  --query "let failureThreshold = 10;
let timeWindow = 15m;
let successWindow = 1h;
// Find IPs with many failures
let bruteForceAttempts = SigninLogs
| where TimeGenerated > ago(successWindow)
| where ResultType != 0
| summarize 
    FailureCount = count(),
    FailedAccounts = make_set(UserPrincipalName, 20),
    FirstFailure = min(TimeGenerated),
    LastFailure = max(TimeGenerated)
    by IPAddress
| where FailureCount >= failureThreshold;
// Check if any succeeded after failures
let successfulLogins = SigninLogs
| where TimeGenerated > ago(successWindow)
| where ResultType == 0
| project SuccessTime=TimeGenerated, UserPrincipalName, IPAddress, 
          AppDisplayName, DeviceDetail, Location=LocationDetails;
bruteForceAttempts
| join kind=inner (successfulLogins) on IPAddress
| where SuccessTime > LastFailure
| project IPAddress, FailureCount, FailedAccounts, 
          CompromisedUser=UserPrincipalName, SuccessTime, 
          AppDisplayName, FirstFailure, LastFailure" \
  --query-frequency "PT10M" \
  --query-period "PT1H" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "CredentialAccess" \
  --techniques "T1110"
```

### Detecção 2: Impossible travel

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "detect-impossible-travel" \
  --scheduled \
  --name "Impossible Travel Detected" \
  --description "Detects sign-ins from geographically distant locations within an impossible timeframe" \
  --severity "Medium" \
  --enabled true \
  --query "let maxTimeDiffMinutes = 60;
let maxDistanceKm = 500;
SigninLogs
| where TimeGenerated > ago(1h)
| where ResultType == 0
| extend City = tostring(LocationDetails.city),
         State = tostring(LocationDetails.state),
         Country = tostring(LocationDetails.countryOrRegion),
         Latitude = toreal(LocationDetails.geoCoordinates.latitude),
         Longitude = toreal(LocationDetails.geoCoordinates.longitude)
| where isnotempty(Latitude) and isnotempty(Longitude)
| sort by UserPrincipalName, TimeGenerated asc
| serialize
| extend PrevTime = prev(TimeGenerated, 1),
         PrevLatitude = prev(Latitude, 1),
         PrevLongitude = prev(Longitude, 1),
         PrevCity = prev(City, 1),
         PrevCountry = prev(Country, 1),
         PrevUser = prev(UserPrincipalName, 1)
| where UserPrincipalName == PrevUser
| extend TimeDiffMinutes = datetime_diff('minute', TimeGenerated, PrevTime)
| where TimeDiffMinutes <= maxTimeDiffMinutes and TimeDiffMinutes > 0
// Haversine distance approximation
| extend DistanceKm = 6371 * acos(
    sin(radians(Latitude)) * sin(radians(PrevLatitude)) +
    cos(radians(Latitude)) * cos(radians(PrevLatitude)) * 
    cos(radians(PrevLongitude - Longitude)))
| where DistanceKm > maxDistanceKm
| project TimeGenerated, UserPrincipalName, 
          CurrentLocation=strcat(City, ', ', Country),
          PreviousLocation=strcat(PrevCity, ', ', PrevCountry),
          TimeDiffMinutes, DistanceKm, IPAddress" \
  --query-frequency "PT15M" \
  --query-period "PT2H" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "InitialAccess" \
  --techniques "T1078"
```

### Detecção 3: Escalação de privilégios via atribuição de role não autorizada

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "detect-privilege-escalation" \
  --nrt \
  --name "Unauthorized Privileged Role Assignment (NRT)" \
  --description "Near real-time detection of privileged role assignments outside PIM or approved processes" \
  --severity "High" \
  --enabled true \
  --query "let privilegedRoles = dynamic([
  'Global Administrator', 'Privileged Role Administrator',
  'Security Administrator', 'Exchange Administrator',
  'SharePoint Administrator', 'User Administrator',
  'Application Administrator', 'Cloud Application Administrator']);
AuditLogs
| where TimeGenerated > ago(5m)
| where OperationName == 'Add member to role'
| extend TargetRole = tostring(TargetResources[0].displayName)
| where TargetRole in (privilegedRoles)
// Exclude PIM-activated assignments
| where OperationName != 'Add eligible member to role in PIM'
| extend InitiatedBy = tostring(InitiatedBy.user.userPrincipalName),
         TargetUser = tostring(TargetResources[0].userPrincipalName),
         InitiatedByIP = tostring(InitiatedBy.user.ipAddress)
// Exclude approved service accounts
| where InitiatedBy !in ('pim-service@contoso.com', 'identity-governance@contoso.com')
| project TimeGenerated, InitiatedBy, InitiatedByIP, 
          TargetUser, TargetRole, OperationName,
          AdditionalDetails" \
  --tactics "PrivilegeEscalation" "Persistence" \
  --techniques "T1078.004" "T1098"
```

### Detecção 4: Exfiltração de dados do SharePoint/OneDrive

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "detect-data-exfiltration" \
  --scheduled \
  --name "Anomalous Data Download from SharePoint/OneDrive" \
  --description "Detects unusually large file downloads that may indicate data exfiltration" \
  --severity "Medium" \
  --enabled true \
  --query "let lookback = 14d;
let threshold_multiplier = 3;
// Calculate baseline download volume per user
let baseline = OfficeActivity
| where TimeGenerated > ago(lookback) and TimeGenerated < ago(1d)
| where Operation in ('FileDownloaded', 'FileSyncDownloadedFull')
| where OfficeWorkload in ('SharePoint', 'OneDrive')
| summarize 
    AvgDailyDownloads = count() / 14.0,
    AvgDailyBytes = sum(toint(OfficeObjectId)) / 14.0
    by UserId;
// Today's activity
let today_activity = OfficeActivity
| where TimeGenerated > ago(1d)
| where Operation in ('FileDownloaded', 'FileSyncDownloadedFull')
| where OfficeWorkload in ('SharePoint', 'OneDrive')
| summarize 
    TodayDownloads = count(),
    UniqueFiles = dcount(OfficeObjectId),
    Sites = make_set(Site_Url, 10)
    by UserId;
today_activity
| join kind=inner (baseline) on UserId
| where TodayDownloads > AvgDailyDownloads * threshold_multiplier
| where TodayDownloads > 50
| project UserId, TodayDownloads, AvgDailyDownloads, 
          AnomalyRatio = round(TodayDownloads / AvgDailyDownloads, 1),
          UniqueFiles, Sites" \
  --query-frequency "PT1H" \
  --query-period "PT14D" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "Exfiltration" \
  --techniques "T1567"
```

### Detecção 5: Abuso de recursos em nuvem (indicadores de cryptomining)

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "detect-cryptomining" \
  --scheduled \
  --name "Potential Cryptomining - Unusual VM Deployments" \
  --description "Detects bulk VM creation or GPU VM deployments that may indicate cryptomining" \
  --severity "High" \
  --enabled true \
  --query "let cryptoVmSizes = dynamic(['Standard_NC', 'Standard_ND', 'Standard_NV', 
  'Standard_HB', 'Standard_HC', 'Standard_F72s']);
// Detect bulk VM creation
let bulkDeployment = AzureActivity
| where TimeGenerated > ago(1h)
| where OperationNameValue == 'Microsoft.Compute/virtualMachines/write'
| where ActivityStatusValue == 'Success'
| summarize 
    VMCount = count(),
    ResourceGroups = make_set(ResourceGroup, 5),
    VMNames = make_set(Resource, 10)
    by Caller, bin(TimeGenerated, 15m)
| where VMCount > 5;
// Detect GPU VM creation
let gpuDeployment = AzureActivity
| where TimeGenerated > ago(1h)
| where OperationNameValue == 'Microsoft.Compute/virtualMachines/write'
| where ActivityStatusValue == 'Success'
| where Properties_d has_any (cryptoVmSizes)
| project TimeGenerated, Caller, ResourceGroup, Resource,
          VMSize = tostring(parse_json(tostring(Properties_d)).responseBody);
union 
  (bulkDeployment | extend DetectionType = 'BulkVMDeployment'),
  (gpuDeployment | extend DetectionType = 'GPUVMDeployment')" \
  --query-frequency "PT15M" \
  --query-period "PT1H" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "Impact" \
  --techniques "T1496"
```

---

## Tarefa 4: Construir playbooks de automação com Logic Apps

Crie um playbook Logic App que enriquece e responde a incidentes de força bruta.

```bash
# Create Logic App for brute-force response
az logic workflow create \
  --resource-group $RG_NAME \
  --name "playbook-brute-force-response" \
  --location $LOCATION \
  --definition '{
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "contentVersion": "1.0.0.0",
      "triggers": {
        "Microsoft_Sentinel_incident": {
          "type": "ApiConnectionWebhook",
          "inputs": {
            "body": {
              "callback_url": "@{listCallbackUrl()}"
            },
            "host": {
              "connection": {
                "name": "@parameters($connections)['azuresentinel']['connectionId']"
              }
            },
            "path": "/incident-creation"
          }
        }
      },
      "actions": {
        "Get_incident_entities": {
          "type": "ApiConnection",
          "inputs": {
            "host": {
              "connection": {
                "name": "@parameters($connections)['azuresentinel']['connectionId']"
              }
            },
            "method": "post",
            "path": "/entities/@{triggerBody()?['object']?['properties']?['relatedAnalyticRuleIds']}"
          },
          "runAfter": {}
        },
        "Block_IP_in_named_location": {
          "type": "Http",
          "inputs": {
            "method": "POST",
            "uri": "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations",
            "body": {
              "@odata.type": "#microsoft.graph.ipNamedLocation",
              "displayName": "Auto-blocked: Brute force source",
              "isTrusted": false,
              "ipRanges": [
                {
                  "@odata.type": "#microsoft.graph.iPv4CidrRange",
                  "cidrAddress": "@{body('Get_incident_entities')?['IPs']?[0]}/32"
                }
              ]
            }
          },
          "runAfter": {"Get_incident_entities": ["Succeeded"]}
        },
        "Send_Teams_notification": {
          "type": "ApiConnection",
          "inputs": {
            "host": {
              "connection": {
                "name": "@parameters($connections)['teams']['connectionId']"
              }
            },
            "method": "post",
            "path": "/v1.0/teams/SOC-Alerts/channels/General/messages",
            "body": {
              "content": "🚨 Brute Force Alert: @{triggerBody()?['object']?['properties']?['title']} - Severity: @{triggerBody()?['object']?['properties']?['severity']}"
            }
          },
          "runAfter": {"Block_IP_in_named_location": ["Succeeded"]}
        },
        "Add_comment_to_incident": {
          "type": "ApiConnection",
          "inputs": {
            "host": {
              "connection": {
                "name": "@parameters($connections)['azuresentinel']['connectionId']"
              }
            },
            "method": "post",
            "path": "/comment",
            "body": {
              "incidentArmId": "@triggerBody()?['object']?['id']",
              "message": "Automated response: Source IP blocked in Conditional Access. Teams notification sent to SOC channel."
            }
          },
          "runAfter": {"Send_Teams_notification": ["Succeeded"]}
        }
      }
    }
  }'
```

**Vincular o playbook a uma automation rule:**

```bash
PLAYBOOK_ID=$(az logic workflow show \
  --resource-group $RG_NAME \
  --name "playbook-brute-force-response" \
  --query id -o tsv)

az sentinel automation-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --automation-rule-id "auto-brute-force-response" \
  --name "Auto-Respond to Brute Force" \
  --order 1 \
  --triggering-logic \
    is-enabled=true \
    triggers-on="Incidents" \
    triggers-when="Created" \
    conditions='[{
      "conditionType": "Property",
      "conditionProperties": {
        "propertyName": "IncidentRelatedAnalyticRuleIds",
        "operator": "Contains",
        "propertyValues": ["detect-brute-force"]
      }
    }]' \
  --actions '[{
    "actionType": "RunPlaybook",
    "order": 1,
    "actionConfiguration": {
      "logicAppResourceId": "'$PLAYBOOK_ID'",
      "tenantId": "'$(az account show --query tenantId -o tsv)'"
    }
  }]'
```

---

## Tarefa 5: Projetar workbooks e dashboards

Crie um workbook de operações de segurança para a equipe SOC.

**Passos no Portal (workbooks são melhor criados no portal):**

1. Navegue até **Microsoft Sentinel** → **Workbooks** → **+ Add workbook**
2. Clique em **Edit** para entrar no modo de edição
3. Adicione os seguintes componentes:

### Dashboard de Operações SOC - Consultas KQL

**Componente 1: Resumo de Incidentes (últimas 24h)**

```kql
SecurityIncident
| where TimeGenerated > ago(24h)
| summarize 
    Total = count(),
    Critical = countif(Severity == "High"),
    Medium = countif(Severity == "Medium"),
    Low = countif(Severity == "Low"),
    Open = countif(Status == "New" or Status == "Active"),
    Closed = countif(Status == "Closed")
| project Total, Critical, Medium, Low, Open, Closed
```

**Componente 2: Tendência de alertas (7 dias)**

```kql
SecurityAlert
| where TimeGenerated > ago(7d)
| summarize AlertCount = count() by bin(TimeGenerated, 1h), AlertSeverity
| render timechart
```

**Componente 3: Usuários mais visados**

```kql
SigninLogs
| where TimeGenerated > ago(24h)
| where ResultType != 0
| summarize FailedAttempts = count(), 
            UniqueIPs = dcount(IPAddress),
            LastAttempt = max(TimeGenerated)
    by UserPrincipalName
| top 10 by FailedAttempts desc
| project UserPrincipalName, FailedAttempts, UniqueIPs, LastAttempt
```

**Componente 4: Mapa geográfico de ameaças**

```kql
SigninLogs
| where TimeGenerated > ago(24h)
| where RiskLevelDuringSignIn in ('high', 'medium')
| extend Latitude = toreal(LocationDetails.geoCoordinates.latitude),
         Longitude = toreal(LocationDetails.geoCoordinates.longitude),
         Country = tostring(LocationDetails.countryOrRegion)
| where isnotempty(Latitude)
| summarize RiskySignIns = count() by Country, Latitude, Longitude
| top 20 by RiskySignIns desc
```

**Componente 5: Cobertura MITRE ATT&CK**

```kql
SecurityAlert
| where TimeGenerated > ago(30d)
| extend Tactics = parse_json(ExtendedProperties).Tactics
| mv-expand Tactic = Tactics
| summarize AlertCount = count() by tostring(Tactic)
| sort by AlertCount desc
| render barchart
```

**Componente 6: Tempo Médio de Resposta (MTTR)**

```kql
SecurityIncident
| where TimeGenerated > ago(30d)
| where Status == "Closed"
| extend CreatedTime = CreatedTime,
         ClosedTime = ClosedTime
| extend MTTR_hours = datetime_diff('hour', ClosedTime, CreatedTime)
| summarize 
    AvgMTTR = avg(MTTR_hours),
    MedianMTTR = percentile(MTTR_hours, 50),
    P95_MTTR = percentile(MTTR_hours, 95)
    by bin(TimeGenerated, 1d)
| render timechart
```

4. Salve o workbook como **"Contoso SOC Operations Dashboard"**
5. Fixe na página de visão geral do Sentinel

---

## Tarefa 6: Implementar otimização de custos e gerenciamento de dados

Configure regras de coleta de dados e otimização de custos para operações sustentáveis.

```bash
# Create a Data Collection Rule (DCR) to filter noisy logs
az monitor data-collection rule create \
  --resource-group $RG_NAME \
  --name "dcr-contoso-filtering" \
  --location $LOCATION \
  --data-flows '[{
    "streams": ["Microsoft-SecurityEvent"],
    "destinations": ["law-contoso-soc"],
    "transformKql": "source | where EventID in (4624, 4625, 4648, 4672, 4720, 4722, 4723, 4724, 4725, 4726, 4732, 4733, 4740, 4756, 4757, 4767, 4769, 4771, 4776, 5136, 5145)"
  }]' \
  --destinations '{
    "logAnalytics": [{
      "workspaceResourceId": "'$WORKSPACE_ID'",
      "name": "law-contoso-soc"
    }]
  }'

# Configure Basic Logs tier for high-volume, low-priority tables
az monitor log-analytics workspace table update \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "ContainerLog" \
  --plan "Basic"

az monitor log-analytics workspace table update \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "AppTraces" \
  --plan "Basic"

# Set up daily cap as cost safeguard (10x normal to catch anomalies only)
az monitor log-analytics workspace update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --set properties.workspaceCapping.dailyQuotaGb=130
```

**Resumo de otimização de custos:**

| Estratégia | Implementação | Economia |
|----------|---------------|---------|
| Filtragem por DCR | Ingerir apenas EventIDs relevantes para segurança | ~40% em SecurityEvent |
| Tier Basic Logs | Tabelas de baixa prioridade com custo reduzido | ~60% em logs de container/app |
| Tier Archive | Dados de compliance após 90 dias | ~80% vs. retenção interativa |
| Cap diário | Rede de segurança com 10x a ingestão normal | Previne surpresas na conta |
| Tier de compromisso | Compromisso de 100 GB/dia | ~20% de desconto |

---

## Quebre & Conserte

### Cenário 1: A regra de análise gera muitos falsos positivos

A regra de impossible travel dispara mais de 50 alertas diários, a maioria de usuários VPN que parecem se conectar do gateway VPN e de sua localização residencial simultaneamente.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** Conexões VPN criam eventos de login tanto da localização real do usuário quanto da localização do gateway VPN.

**Correção:** Adicione os IPs do gateway VPN a uma lista de exclusão na consulta KQL:

```kql
// Add this filter before the distance calculation
let vpnGatewayIPs = dynamic(["203.0.113.0/24", "198.51.100.0/24"]);
let trustedLocations = dynamic(["Contoso HQ", "Contoso DC"]);
SigninLogs
| where TimeGenerated > ago(1h)
| where ResultType == 0
// Exclude VPN and trusted locations
| where not(ipv4_is_in_any_range(IPAddress, vpnGatewayIPs))
| where not(tostring(LocationDetails.city) in (trustedLocations))
// ... rest of the impossible travel query
```

Considere também aumentar o `maxTimeDiffMinutes` de 60 para 90 para compensar a sobreposição de sessões.

</details>

### Cenário 2: Playbook falha com erro "Forbidden"

O playbook de resposta a força bruta é acionado mas falha na etapa "Block IP" com erro 403 Forbidden.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** A managed identity do Logic App não possui permissões da Graph API para criar named locations.

**Correção:**
1. Habilite a managed identity atribuída pelo sistema no Logic App:
   ```bash
   az logic workflow identity assign \
     --resource-group $RG_NAME \
     --name "playbook-brute-force-response" \
     --system-assigned
   ```
2. Conceda à managed identity a permissão `Policy.ReadWrite.ConditionalAccess`:
   ```bash
   LOGIC_APP_OBJECT_ID=$(az logic workflow show \
     --resource-group $RG_NAME \
     --name "playbook-brute-force-response" \
     --query identity.principalId -o tsv)
   
   # Grant Graph API permission (requires admin consent)
   az ad app permission grant \
     --id $LOGIC_APP_OBJECT_ID \
     --api 00000003-0000-0000-c000-000000000000 \
     --scope "Policy.ReadWrite.ConditionalAccess"
   ```
3. Alternativamente, use uma API connection com uma conta de serviço que tenha a role Conditional Access Administrator

</details>

### Cenário 3: Custos de ingestão de dados sobem inesperadamente

Os custos mensais saltam de $3.000 para $12.000 devido a um aumento repentino no volume de ingestão de logs.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** Uma configuração de diagnóstico mal feita está enviando logs verbosos de debug de todos os recursos.

**Correção:**
1. Identifique a fonte do aumento de ingestão:
   ```kql
   Usage
   | where TimeGenerated > ago(7d)
   | summarize IngestionGB = sum(Quantity) / 1000.0 by DataType, bin(TimeGenerated, 1d)
   | where IngestionGB > 1
   | sort by IngestionGB desc
   ```
2. Encontre o recurso específico inundando logs:
   ```kql
   AzureDiagnostics
   | where TimeGenerated > ago(1d)
   | summarize Count = count(), SizeGB = sum(_BilledSize) / (1024*1024*1024) by ResourceProvider, ResourceType
   | sort by SizeGB desc
   ```
3. Remova ou corrija a configuração de diagnóstico incorreta
4. Defina um cap diário como proteção imediata:
   ```bash
   az monitor log-analytics workspace update \
     --workspace-name $WORKSPACE_NAME \
     --resource-group $RG_NAME \
     --set properties.workspaceCapping.dailyQuotaGb=20
   ```
5. Implemente filtragem por DCR para o recurso ruidoso

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual tipo de regra de análise do Sentinel é mais apropriado para detectar escalação de privilégios que requer alerta imediato em 1-2 minutos?",
    options: [
      "Regra agendada com frequência de 5 minutos",
      "Regra Near Real-Time (NRT)",
      "Regra Fusion",
      "Regra de análise comportamental com Machine Learning"
    ],
    correctIndex: 1,
    explanation: "Regras NRT executam aproximadamente a cada 1 minuto, fornecendo o tempo de detecção mais rápido. Para escalação de privilégios — um evento de alta severidade e sensível ao tempo — regras NRT garantem que analistas SOC sejam alertados em minutos ao invés de esperar pelo intervalo de uma consulta agendada."
  },
  {
    question: "Qual função KQL é usada para calcular a distância geográfica entre duas localizações de login para detecção de impossible travel?",
    options: [
      "geo_distance_2points()",
      "A fórmula de Haversine usando acos(), sin(), cos() e radians()",
      "distance(lat1, lon1, lat2, lon2)",
      "calculate_travel_distance()"
    ],
    correctIndex: 1,
    explanation: "KQL não possui uma função nativa de distância geográfica no Log Analytics padrão. A fórmula de Haversine usando as funções acos(), sin(), cos() e radians() calcula a distância do grande círculo entre dois pontos na Terra, que é a abordagem padrão para detecção de impossible travel no Sentinel."
  },
  {
    question: "Para reduzir custos de ingestão em tabelas de alto volume mas raramente consultadas, qual plano do Log Analytics você deve usar?",
    options: [
      "Plano Analytics com retenção reduzida",
      "Plano Basic Logs",
      "Tier Archive",
      "Tier gratuito"
    ],
    correctIndex: 1,
    explanation: "O plano Basic Logs fornece custo de ingestão reduzido (~60% menos) para tabelas que são raramente consultadas. Basic Logs possuem capacidades de consulta limitadas (8 dias de retenção interativa, sem alertas) mas são ideais para dados de compliance ou troubleshooting. O tier Archive é para dados além do período de retenção interativa."
  },
  {
    question: "Um playbook Logic App precisa bloquear um endereço IP no Conditional Access. Qual permissão a managed identity deve ter?",
    options: [
      "Security Reader",
      "Role Conditional Access Administrator",
      "Permissão Graph API Policy.ReadWrite.ConditionalAccess",
      "Role Azure RBAC Network Contributor"
    ],
    correctIndex: 2,
    explanation: "Para criar ou modificar named locations no Conditional Access via Graph API, a managed identity precisa da permissão de aplicação Policy.ReadWrite.ConditionalAccess da Graph API. A role Entra Conditional Access Administrator funciona para usuários interativos, mas automação baseada em API requer permissões da Graph API na identidade."
  },
  {
    question: "Em uma Data Collection Rule (DCR), qual é a finalidade da propriedade transformKql?",
    options: [
      "Criptografa os dados antes da ingestão",
      "Filtra e transforma dados antes de chegarem ao workspace, reduzindo o volume de ingestão",
      "Cria regras de análise automaticamente a partir dos dados",
      "Roteia dados para múltiplos workspaces simultaneamente"
    ],
    correctIndex: 1,
    explanation: "A propriedade transformKql em uma DCR aplica uma transformação KQL nos dados antes de serem ingeridos no workspace. Isso permite filtrar registros desnecessários (por exemplo, manter apenas EventIDs específicos) e transformar dados para reduzir volume e custo no momento da ingestão."
  }
]} />

---

## Limpeza

```bash
# Delete automation rules
az sentinel automation-rule delete \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --automation-rule-id "auto-brute-force-response" --yes

# Delete analytics rules
for RULE_ID in "detect-brute-force" "detect-impossible-travel" "detect-privilege-escalation" "detect-data-exfiltration" "detect-cryptomining"; do
  az sentinel alert-rule delete \
    --resource-group $RG_NAME \
    --workspace-name $WORKSPACE_NAME \
    --rule-id $RULE_ID --yes
done

# Delete Logic App playbook
az logic workflow delete \
  --resource-group $RG_NAME \
  --name "playbook-brute-force-response" --yes

# Delete the resource group (removes everything)
az group delete --name $RG_NAME --yes --no-wait
```
