---
sidebar_position: 46
title: "Desafio 46: Sentinel – Windows Security Events, Custom Logs e Purview Audit"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 46: Sentinel – Windows Security Events, Custom Logs e Purview Audit

## Habilidades do exame cobertas

- Configurar coleta de Windows Security Events via AMA
- Criar e gerenciar tabelas de custom log (baseadas em DCR)
- Configurar coleta de logs do Microsoft Purview Audit
- Projetar pipelines de ingestão para fontes de dados customizadas

## Cenário

O SOC da Contoso Ltd precisa ingerir eventos de Windows Security de domain controllers e servidores membros, coletar logs de aplicação customizados de um sistema de RH proprietário e transmitir logs do Microsoft Purview Audit para correlacionar acesso a dados com incidentes de segurança. Você deve configurar essas diversas fontes de dados usando pipelines modernos do Azure Monitor Agent.

---

## Pré-requisitos

- Assinatura Azure com role de Owner ou Contributor
- Workspace do Microsoft Sentinel habilitado
- Azure CLI com extensões `monitor` e `sentinel`
- Uma VM Windows (ou crie uma para fins de laboratório)
- Licença Microsoft 365 E5 ou equivalente (para Purview Audit)

---

## Tarefa 1: Preparar o workspace e implantar uma VM Windows

Prepare o ambiente para coleta de eventos Windows.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-sentinel-events"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-events"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create Log Analytics workspace with Sentinel
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --retention-time 90

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Enable Sentinel
az sentinel onboarding-state create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default"

# Create a Windows Server VM
az vm create \
  --resource-group $RG_NAME \
  --name "vm-dc-contoso01" \
  --image Win2022Datacenter \
  --size Standard_B2ms \
  --admin-username azureadmin \
  --admin-password "Contoso!Lab2024#" \
  --nsg-rule RDP

VM_ID=$(az vm show --resource-group $RG_NAME --name "vm-dc-contoso01" --query id -o tsv)
```

## Tarefa 2: Instalar o Azure Monitor Agent e configurar Windows Security Events

Implante o AMA e crie uma DCR para coleta de eventos de segurança do Windows.

```bash
# Install Azure Monitor Agent on Windows VM
az vm extension set \
  --resource-group $RG_NAME \
  --vm-name "vm-dc-contoso01" \
  --name AzureMonitorWindowsAgent \
  --publisher Microsoft.Azure.Monitor

# Create DCR for Windows Security Events (Common tier - recommended balance)
az monitor data-collection rule create \
  --name "dcr-windows-security" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --data-flows '[{
    "streams": ["Microsoft-SecurityEvent"],
    "destinations": ["sentinelWorkspace"]
  }]' \
  --log-analytics "[{
    \"name\": \"sentinelWorkspace\",
    \"workspaceResourceId\": \"${WORKSPACE_ID}\"
  }]" \
  --windows-event-logs "[{
    \"name\": \"securityEvents\",
    \"streams\": [\"Microsoft-SecurityEvent\"],
    \"xPathQueries\": [
      \"Security!*[System[(EventID=4624 or EventID=4625 or EventID=4648 or EventID=4672 or EventID=4688 or EventID=4698 or EventID=4720 or EventID=4726 or EventID=4728 or EventID=4732 or EventID=4756 or EventID=1102)]]\"
    ]
  }]"

# Associate DCR with the Windows VM
DCR_ID=$(az monitor data-collection rule show \
  --name "dcr-windows-security" \
  --resource-group $RG_NAME \
  --query id -o tsv)

az monitor data-collection rule association create \
  --name "windows-security-association" \
  --resource $VM_ID \
  --rule-id $DCR_ID

echo "Windows Security Events configured with custom XPath filter"
echo "Collecting: Logon(4624), Failed Logon(4625), Explicit Creds(4648),"
echo "  Special Privileges(4672), Process Create(4688), Scheduled Task(4698),"
echo "  Account Mgmt(4720,4726), Group Mgmt(4728,4732,4756), Log Cleared(1102)"
```

## Tarefa 3: Criar uma tabela de custom log para dados da aplicação

Defina uma tabela customizada e uma DCR para ingerir logs proprietários do sistema de RH.

```bash
# Create a custom log table in the workspace
az monitor log-analytics workspace table create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "ContosoHRApp_CL" \
  --retention-time 90 \
  --total-retention-time 180 \
  --columns '[
    {"name": "TimeGenerated", "type": "datetime"},
    {"name": "EventType", "type": "string"},
    {"name": "UserPrincipalName", "type": "string"},
    {"name": "Action", "type": "string"},
    {"name": "TargetResource", "type": "string"},
    {"name": "SourceIP", "type": "string"},
    {"name": "Result", "type": "string"},
    {"name": "AdditionalDetails", "type": "string"}
  ]'

# Verify custom table was created
az monitor log-analytics workspace table show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "ContosoHRApp_CL" \
  --query "{Table:name, Retention:retentionInDays, Plan:plan, Columns:schema.columns[].name}" -o json
```

## Tarefa 4: Criar uma DCR para ingestão de custom log

Configure uma Data Collection Rule com uma transformação para normalizar os dados do custom log.

```bash
# Create Data Collection Endpoint (required for custom logs)
az monitor data-collection endpoint create \
  --name "dce-contoso-custom" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --public-network-access Enabled

DCE_ID=$(az monitor data-collection endpoint show \
  --name "dce-contoso-custom" \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Create DCR for custom log ingestion with transformation
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Insights/dataCollectionRules/dcr-custom-hrapp?api-version=2022-06-01" \
  --body "{
    \"location\": \"${LOCATION}\",
    \"properties\": {
      \"dataCollectionEndpointId\": \"${DCE_ID}\",
      \"streamDeclarations\": {
        \"Custom-ContosoHRApp_CL\": {
          \"columns\": [
            {\"name\": \"TimeGenerated\", \"type\": \"datetime\"},
            {\"name\": \"EventType\", \"type\": \"string\"},
            {\"name\": \"UserPrincipalName\", \"type\": \"string\"},
            {\"name\": \"Action\", \"type\": \"string\"},
            {\"name\": \"TargetResource\", \"type\": \"string\"},
            {\"name\": \"SourceIP\", \"type\": \"string\"},
            {\"name\": \"Result\", \"type\": \"string\"},
            {\"name\": \"AdditionalDetails\", \"type\": \"string\"}
          ]
        }
      },
      \"destinations\": {
        \"logAnalytics\": [{
          \"workspaceResourceId\": \"${WORKSPACE_ID}\",
          \"name\": \"sentinelWorkspace\"
        }]
      },
      \"dataFlows\": [{
        \"streams\": [\"Custom-ContosoHRApp_CL\"],
        \"destinations\": [\"sentinelWorkspace\"],
        \"transformKql\": \"source | extend TimeGenerated = coalesce(TimeGenerated, now())\",
        \"outputStream\": \"Custom-ContosoHRApp_CL\"
      }]
    }
  }"

echo "Custom log DCR created with transformation pipeline"
```

## Tarefa 5: Ingerir dados de teste via Logs Ingestion API

Envie dados de teste para a tabela de custom log usando a Data Collection API.

```bash
# Get the DCR immutable ID and DCE endpoint
DCR_IMMUTABLE_ID=$(az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Insights/dataCollectionRules/dcr-custom-hrapp?api-version=2022-06-01" \
  --query "properties.immutableId" -o tsv)

DCE_ENDPOINT=$(az monitor data-collection endpoint show \
  --name "dce-contoso-custom" \
  --resource-group $RG_NAME \
  --query "logsIngestion.endpoint" -o tsv)

echo "DCE Endpoint: ${DCE_ENDPOINT}"
echo "DCR Immutable ID: ${DCR_IMMUTABLE_ID}"

# Get access token for ingestion
TOKEN=$(az account get-access-token --resource "https://monitor.azure.com/" --query accessToken -o tsv)

# Send test data to the custom table
curl -X POST "${DCE_ENDPOINT}/dataCollectionRules/${DCR_IMMUTABLE_ID}/streams/Custom-ContosoHRApp_CL?api-version=2023-01-01" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "TimeGenerated": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
      "EventType": "AccessRequest",
      "UserPrincipalName": "john.doe@contoso.com",
      "Action": "ViewSalaryRecord",
      "TargetResource": "Employee/12345",
      "SourceIP": "10.0.1.50",
      "Result": "Success",
      "AdditionalDetails": "Viewed own salary record"
    },
    {
      "TimeGenerated": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
      "EventType": "AccessRequest",
      "UserPrincipalName": "jane.admin@contoso.com",
      "Action": "ExportAllRecords",
      "TargetResource": "Employee/*",
      "SourceIP": "10.0.2.100",
      "Result": "Denied",
      "AdditionalDetails": "Bulk export attempt blocked by policy"
    }
  ]' 2>/dev/null || echo "Note: Requires valid DCE endpoint and permissions"

echo "Test data sent - check ContosoHRApp_CL table in ~5 minutes"
```

## Tarefa 6: Configurar o conector de logs do Microsoft Purview Audit

Habilite a coleta de dados do Purview Audit para visibilidade de governança de dados.

```bash
# Enable Office 365 / Microsoft Purview Audit connector
# This uses the Office 365 Management Activity API
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/dataConnectors/office365-connector?api-version=2024-03-01" \
  --body '{
    "kind": "Office365",
    "properties": {
      "tenantId": "'"$(az account show --query tenantId -o tsv)"'",
      "dataTypes": {
        "exchange": {"state": "Enabled"},
        "sharePoint": {"state": "Enabled"},
        "teams": {"state": "Enabled"}
      }
    }
  }'

echo "Office 365 / Purview Audit connector enabled"
echo "Data flows to: OfficeActivity table"
echo ""
echo "For Purview-specific audit queries, use:"
echo "  OfficeActivity | where OfficeWorkload == 'MicrosoftPurview'"
echo "  OfficeActivity | where Operation contains 'Sensitivity'"
```

---

## Quebre & Conserte

### Cenário 1: Windows Security events mostram apenas um subconjunto dos Event IDs esperados

A DCR está configurada, mas apenas eventos de logon (4624) aparecem — sem criação de processos ou eventos de gerenciamento de contas.

<details>
<summary>Mostrar solução</summary>

```bash
# Check the XPath query in the DCR
az monitor data-collection rule show \
  --name "dcr-windows-security" \
  --resource-group $RG_NAME \
  --query "properties.dataSources.windowsEventLogs[0].xPathQueries" -o tsv

# Common issue: XPath query is too restrictive or has syntax errors
# The XML filter must use proper XPath for Windows Event Log

# Verify events are being generated on the VM
az vm run-command invoke \
  --resource-group $RG_NAME \
  --name "vm-dc-contoso01" \
  --command-id RunPowerShellScript \
  --scripts '
    # Check if audit policies are enabled
    auditpol /get /category:*
    
    # Enable process creation auditing
    auditpol /set /subcategory:"Process Creation" /success:enable /failure:enable
    
    # Enable account management auditing
    auditpol /set /subcategory:"User Account Management" /success:enable /failure:enable
    auditpol /set /subcategory:"Security Group Management" /success:enable /failure:enable
  '

# Fix: Windows audit policy must be enabled for events to be generated
# The DCR can only collect events that Windows actually generates
```

</details>

### Cenário 2: Ingestão de custom log retorna 403 Forbidden

O envio de dados para a Logs Ingestion API retorna um erro 403.

<details>
<summary>Mostrar solução</summary>

```bash
# The identity sending data needs "Monitoring Metrics Publisher" role on the DCR
# Check current role assignments on the DCR

DCR_RESOURCE_ID="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Insights/dataCollectionRules/dcr-custom-hrapp"

az role assignment list \
  --scope $DCR_RESOURCE_ID \
  --query "[].{Principal:principalName, Role:roleDefinitionName}" -o table

# Assign the required role to the identity/service principal sending data
# For a user:
az role assignment create \
  --assignee "$(az account show --query user.name -o tsv)" \
  --role "Monitoring Metrics Publisher" \
  --scope $DCR_RESOURCE_ID

# For a managed identity or service principal:
# az role assignment create --assignee <app-id> --role "Monitoring Metrics Publisher" --scope $DCR_RESOURCE_ID

echo "Role assigned - retry the ingestion request"
```

</details>

### Cenário 3: Tabela customizada mostra plano "BasicLogs" mas você precisa de suporte completo a KQL

A tabela ContosoHRApp_CL foi acidentalmente configurada com o plano Basic, mas o SOC precisa de analytics completo.

<details>
<summary>Mostrar solução</summary>

```bash
# Check current table plan
az monitor log-analytics workspace table show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "ContosoHRApp_CL" \
  --query "{Table:name, Plan:plan}" -o table

# Change from Basic to Analytics plan
az monitor log-analytics workspace table update \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --name "ContosoHRApp_CL" \
  --plan Analytics

# Note: Changing from Basic to Analytics:
# - Takes effect immediately for new data
# - Historical data ingested under Basic plan remains Basic (limited queries)
# - Analytics plan costs more per GB but supports full KQL, alerts, and Sentinel rules
# - Cannot change back from Analytics to Basic for 30 days

echo "Table plan changed to Analytics - full KQL support enabled"
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual configuração de política de auditoria do Windows é necessária ANTES que os Windows Security events possam ser coletados por uma DCR?",
    options: [
      "Nenhuma política de auditoria é necessária; a DCR cuida de tudo",
      "A política de auditoria do Windows precisa estar habilitada para as categorias específicas de eventos que você deseja coletar",
      "Apenas o tamanho do log de segurança precisa ser aumentado",
      "O Windows Defender precisa estar em modo ativo"
    ],
    correctIndex: 1,
    explanation: "O Windows só gera eventos de segurança quando as políticas de auditoria correspondentes estão habilitadas (por exemplo, 'Audit Process Creation' para o Event ID 4688). A DCR só pode coletar eventos que o Windows realmente escreve no log de segurança."
  },
  {
    question: "Quais componentes são necessários para ingerir logs de aplicação customizados em uma tabela customizada do Sentinel?",
    options: [
      "Apenas um workspace do Log Analytics",
      "Um Data Collection Endpoint (DCE), uma Data Collection Rule (DCR) com declaração de stream e a definição da tabela customizada",
      "Uma Azure Function e um Event Hub",
      "Apenas a API legada HTTP Data Collector"
    ],
    correctIndex: 1,
    explanation: "A ingestão de custom log requer: (1) um DCE que fornece o endpoint de ingestão, (2) uma DCR que define o schema do stream, transformação e destino, e (3) a tabela customizada (_CL) no workspace correspondendo ao schema de saída."
  },
  {
    question: "Qual é a principal diferença entre os planos de tabela 'Analytics' e 'Basic' no Log Analytics?",
    options: [
      "Analytics é gratuito; Basic cobra por GB",
      "Basic suporta consultas KQL completas; Analytics é limitado",
      "Analytics suporta KQL completo, alertas e regras do Sentinel; Basic suporta consultas limitadas com custo menor",
      "Basic armazena dados por mais tempo que Analytics"
    ],
    correctIndex: 2,
    explanation: "Tabelas com plano Analytics suportam consultas KQL completas, alertas agendados e regras de analytics do Sentinel, mas custam mais por GB ingerido. Tabelas com plano Basic custam ~60% menos, mas suportam apenas operadores KQL limitados, não podem ser usadas em regras de alerta e têm retenção interativa fixa de 8 dias."
  }
]} />

## Limpeza

```bash
# Delete data collection rules and associations
az monitor data-collection rule association delete \
  --name "windows-security-association" \
  --resource $VM_ID --yes

az monitor data-collection rule delete \
  --name "dcr-windows-security" \
  --resource-group $RG_NAME --yes

az rest --method DELETE \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Insights/dataCollectionRules/dcr-custom-hrapp?api-version=2022-06-01"

az monitor data-collection endpoint delete \
  --name "dce-contoso-custom" \
  --resource-group $RG_NAME --yes

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

echo "Cleanup complete - all DCRs, endpoints, and resources deleted"
```
