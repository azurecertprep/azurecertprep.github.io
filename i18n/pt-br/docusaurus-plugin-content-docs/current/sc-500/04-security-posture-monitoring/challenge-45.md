---
sidebar_position: 45
title: "Desafio 45: Data Connectors do Sentinel (Recursos Azure, Syslog, CEF)"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 45: Data Connectors do Sentinel (Recursos Azure, Syslog, CEF)

## Habilidades do exame cobertas

- Configurar data connectors para recursos do Azure
- Configurar coleta de dados via Syslog e CEF
- Configurar conectores de threat intelligence
- Validar a saúde e ingestão dos data connectors

## Cenário

A Contoso Ltd habilitou o Microsoft Sentinel e agora precisa conectar fontes de dados. O SOC precisa de visibilidade nos logs de atividade do Azure, sign-ins do Entra ID, alertas do Defender for Cloud, eventos syslog de servidores Linux e logs de appliances de rede via CEF. Você deve configurar esses data connectors e validar que os dados estão fluindo corretamente para o workspace.

---

## Pré-requisitos

- Assinatura Azure com role de Owner ou Contributor
- Workspace do Microsoft Sentinel (do Desafio 44 ou novo)
- Azure CLI instalado com a extensão `sentinel`
- Uma VM Linux para coleta de syslog/CEF (ou crie uma neste lab)

---

## Tarefa 1: Preparar o workspace do Sentinel

Crie ou referencie o workspace do Sentinel e prepare-o para a configuração dos data connectors.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-sentinel-connectors"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-soc"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --retention-time 90

# Enable Sentinel
az sentinel onboarding-state create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default"

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query id -o tsv)

echo "Sentinel workspace ready: ${WORKSPACE_ID}"
```

## Tarefa 2: Conectar os Azure Activity Logs

Configure o data connector de Azure Activity para transmitir eventos no nível da assinatura.

```bash
# Create diagnostic setting to send Activity Logs to the Sentinel workspace
az monitor diagnostic-settings create \
  --name "send-activity-to-sentinel" \
  --resource "/subscriptions/${SUBSCRIPTION_ID}" \
  --workspace $WORKSPACE_ID \
  --logs '[
    {"category": "Administrative", "enabled": true},
    {"category": "Security", "enabled": true},
    {"category": "Alert", "enabled": true},
    {"category": "Policy", "enabled": true},
    {"category": "Recommendation", "enabled": true}
  ]'

# Verify diagnostic setting
az monitor diagnostic-settings show \
  --name "send-activity-to-sentinel" \
  --resource "/subscriptions/${SUBSCRIPTION_ID}" \
  --query "{Name:name, Workspace:workspaceId, Categories:logs[?enabled].category}" -o json

echo "Azure Activity connector configured - data appears in AzureActivity table"
```

## Tarefa 3: Conectar logs de sign-in e auditoria do Microsoft Entra ID

Configure o data connector do Entra ID para visibilidade de identidade.

```bash
# Enable Entra ID diagnostic settings
# Note: Requires Azure AD Premium P1/P2 license for sign-in logs
az monitor diagnostic-settings create \
  --name "entra-to-sentinel" \
  --resource "/providers/Microsoft.aadiam" \
  --workspace $WORKSPACE_ID \
  --logs '[
    {"category": "SignInLogs", "enabled": true},
    {"category": "AuditLogs", "enabled": true},
    {"category": "NonInteractiveUserSignInLogs", "enabled": true},
    {"category": "ServicePrincipalSignInLogs", "enabled": true},
    {"category": "ManagedIdentitySignInLogs", "enabled": true},
    {"category": "RiskyUsers", "enabled": true},
    {"category": "UserRiskEvents", "enabled": true}
  ]' 2>/dev/null || echo "Note: Requires Global Admin or Security Admin for Entra ID diagnostics"

echo "Entra ID logs configured - data flows to SigninLogs and AuditLogs tables"
```

## Tarefa 4: Conectar alertas do Defender for Cloud

Habilite o data connector do Defender for Cloud via a API do Sentinel.

```bash
# Enable Microsoft Defender for Cloud data connector
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "defender-for-cloud-connector" \
  --kind "AzureSecurityCenter" 2>/dev/null

# Alternative: Use REST API for the connector
az rest --method PUT \
  --uri "https://management.azure.com${WORKSPACE_ID}/providers/Microsoft.SecurityInsights/dataConnectors/defender-cloud-connector?api-version=2024-03-01" \
  --body "{
    \"kind\": \"AzureSecurityCenter\",
    \"properties\": {
      \"subscriptionId\": \"${SUBSCRIPTION_ID}\",
      \"dataTypes\": {
        \"alerts\": {
          \"state\": \"Enabled\"
        }
      }
    }
  }"

echo "Defender for Cloud connector enabled - alerts flow to SecurityAlert table"
```

## Tarefa 5: Configurar coleta de Syslog de VMs Linux

Implante uma VM Linux e configure o encaminhamento de syslog para o Sentinel via Azure Monitor Agent.

```bash
# Create a Linux VM for syslog collection
az vm create \
  --resource-group $RG_NAME \
  --name "vm-syslog-collector" \
  --image Ubuntu2404 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys

# Install Azure Monitor Agent
az vm extension set \
  --resource-group $RG_NAME \
  --vm-name "vm-syslog-collector" \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor \
  --settings '{}'

# Create a Data Collection Rule for Syslog
az monitor data-collection rule create \
  --name "dcr-syslog-contoso" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --data-flows '[{
    "streams": ["Microsoft-Syslog"],
    "destinations": ["logAnalyticsWorkspace"]
  }]' \
  --log-analytics "[{
    \"name\": \"logAnalyticsWorkspace\",
    \"workspaceResourceId\": \"${WORKSPACE_ID}\"
  }]" \
  --syslog "[{
    \"name\": \"syslogDataSource\",
    \"streams\": [\"Microsoft-Syslog\"],
    \"facilityNames\": [\"auth\", \"authpriv\", \"daemon\", \"kern\", \"syslog\"],
    \"logLevels\": [\"Warning\", \"Error\", \"Critical\", \"Alert\", \"Emergency\"]
  }]"

# Associate DCR with the VM
DCR_ID=$(az monitor data-collection rule show \
  --name "dcr-syslog-contoso" \
  --resource-group $RG_NAME \
  --query id -o tsv)

VM_ID=$(az vm show --resource-group $RG_NAME --name "vm-syslog-collector" --query id -o tsv)

az monitor data-collection rule association create \
  --name "syslog-association" \
  --resource $VM_ID \
  --rule-id $DCR_ID

echo "Syslog collection configured - auth/kern/daemon logs at Warning+ severity"
```

## Tarefa 6: Configurar coleta de logs CEF

Configure a coleta de logs no formato Common Event Format (CEF) para appliances de rede.

```bash
# Create a DCR for CEF log collection
az monitor data-collection rule create \
  --name "dcr-cef-contoso" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --data-flows '[{
    "streams": ["Microsoft-CommonSecurityLog"],
    "destinations": ["logAnalyticsWorkspace"]
  }]' \
  --log-analytics "[{
    \"name\": \"logAnalyticsWorkspace\",
    \"workspaceResourceId\": \"${WORKSPACE_ID}\"
  }]" \
  --syslog "[{
    \"name\": \"cefDataSource\",
    \"streams\": [\"Microsoft-CommonSecurityLog\"],
    \"facilityNames\": [\"local0\", \"local1\", \"local2\", \"local3\"],
    \"logLevels\": [\"Debug\", \"Info\", \"Notice\", \"Warning\", \"Error\", \"Critical\", \"Alert\", \"Emergency\"]
  }]"

# Associate with the collector VM
CEF_DCR_ID=$(az monitor data-collection rule show \
  --name "dcr-cef-contoso" \
  --resource-group $RG_NAME \
  --query id -o tsv)

az monitor data-collection rule association create \
  --name "cef-association" \
  --resource $VM_ID \
  --rule-id $CEF_DCR_ID

# Configure the VM's rsyslog to receive CEF from network devices
az vm run-command invoke \
  --resource-group $RG_NAME \
  --name "vm-syslog-collector" \
  --command-id RunShellScript \
  --scripts '
    # Enable rsyslog to listen on UDP 514
    sudo sed -i "s/#module(load=\"imudp\")/module(load=\"imudp\")/" /etc/rsyslog.conf
    sudo sed -i "s/#input(type=\"imudp\" port=\"514\")/input(type=\"imudp\" port=\"514\")/" /etc/rsyslog.conf
    
    # Enable TCP 514
    sudo sed -i "s/#module(load=\"imtcp\")/module(load=\"imtcp\")/" /etc/rsyslog.conf
    sudo sed -i "s/#input(type=\"imtcp\" port=\"514\")/input(type=\"imtcp\" port=\"514\")/" /etc/rsyslog.conf
    
    # Restart rsyslog
    sudo systemctl restart rsyslog
    echo "rsyslog configured to receive CEF on TCP/UDP 514"
  '

echo "CEF collection configured - network appliances should forward to this VM on port 514"
echo "CEF data appears in the CommonSecurityLog table"
```

---

## Quebre & Conserte

### Cenário 1: Azure Activity logs não aparecem no Sentinel após 1 hora

A configuração de diagnóstico foi criada, mas nenhum dado aparece na tabela AzureActivity.

<details>
<summary>Mostrar solução</summary>

```bash
# Verify diagnostic setting targets the correct workspace
az monitor diagnostic-settings show \
  --name "send-activity-to-sentinel" \
  --resource "/subscriptions/${SUBSCRIPTION_ID}" \
  --query "{Workspace:workspaceId, Enabled:logs[?enabled].category}"

# Check if the workspace ID is correct
echo "Expected workspace: ${WORKSPACE_ID}"

# Common issues:
# 1. Diagnostic setting points to wrong workspace
# 2. Activity log categories not enabled
# 3. No activity has occurred since enabling (generate some activity)

# Generate test activity
az group create --name "rg-test-activity" --location eastus
az group delete --name "rg-test-activity" --yes --no-wait

# Verify data ingestion (may take 5-10 minutes)
# In portal: Sentinel > Logs > AzureActivity | take 10

# If wrong workspace, recreate the diagnostic setting
az monitor diagnostic-settings delete \
  --name "send-activity-to-sentinel" \
  --resource "/subscriptions/${SUBSCRIPTION_ID}"

# Then recreate with correct workspace ID
```

</details>

### Cenário 2: Dados de Syslog não fluem da VM Linux

O Azure Monitor Agent está instalado e a DCR está associada, mas nenhum dado de Syslog aparece.

<details>
<summary>Mostrar solução</summary>

```bash
# Check AMA extension status on the VM
az vm extension show \
  --resource-group $RG_NAME \
  --vm-name "vm-syslog-collector" \
  --name AzureMonitorLinuxAgent \
  --query "{Status:provisioningState, Version:typeHandlerVersion}" -o table

# Verify DCR association
az monitor data-collection rule association list \
  --resource $VM_ID \
  --query "[].{Name:name, RuleId:dataCollectionRuleId}" -o table

# Check if agent is picking up the DCR (SSH into VM)
az vm run-command invoke \
  --resource-group $RG_NAME \
  --name "vm-syslog-collector" \
  --command-id RunShellScript \
  --scripts '
    # Check AMA status
    systemctl status azuremonitoragent
    
    # Check if AMA is listening for syslog
    ss -tlnp | grep mdsd
    
    # Generate test syslog event
    logger -p auth.warning "Test authentication warning from Contoso"
    
    # Check AMA logs for errors
    tail -20 /var/opt/microsoft/azuremonitoragent/log/mdsd.err
  '

# Common fixes:
# 1. Restart the AMA service
# 2. Verify DCR has correct facility/severity levels
# 3. Check if rsyslog is forwarding to AMA's socket
```

</details>

### Cenário 3: Mensagens CEF ingeridas mas parseadas incorretamente

Logs CEF aparecem na CommonSecurityLog, mas campos como DeviceVendor e DeviceProduct estão vazios.

<details>
<summary>Mostrar solução</summary>

```bash
# CEF format requires a specific header format:
# CEF:0|Vendor|Product|Version|SignatureID|Name|Severity|Extension
# If the source is sending invalid CEF, fields will be empty

# Test with a properly formatted CEF message
az vm run-command invoke \
  --resource-group $RG_NAME \
  --name "vm-syslog-collector" \
  --command-id RunShellScript \
  --scripts '
    # Send a valid CEF test message via syslog
    logger -p local0.warning "CEF:0|Contoso|Firewall|1.0|100|Connection Blocked|7|src=192.168.1.100 dst=10.0.0.5 dpt=443 act=Block"
    
    # Common CEF formatting issues:
    # 1. Missing "CEF:0|" prefix
    # 2. Wrong number of pipe-delimited fields in header
    # 3. Incorrect extension key-value formatting
    # 4. Using wrong syslog facility (must match DCR)
    
    echo "Valid CEF test message sent"
  '

# Verify in Sentinel that test message appears correctly:
# CommonSecurityLog | where DeviceVendor == "Contoso" | take 5
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual tabela no Microsoft Sentinel armazena os dados de log CEF (Common Event Format)?",
    options: [
      "Syslog",
      "CommonSecurityLog",
      "SecurityEvent",
      "CEFLog"
    ],
    correctIndex: 1,
    explanation: "Os dados CEF são armazenados na tabela CommonSecurityLog. Embora o CEF seja transportado pelo protocolo syslog, ele é parseado na tabela estruturada CommonSecurityLog com campos como DeviceVendor, DeviceProduct e campos de extensão."
  },
  {
    question: "Qual é o método recomendado para coletar logs syslog e CEF no Sentinel com o Azure Monitor Agent?",
    options: [
      "Instalar o agente legado do Log Analytics em cada dispositivo de origem",
      "Configurar uma Data Collection Rule (DCR) e associá-la às VMs com Azure Monitor Agent",
      "Usar uma Azure Function para fazer pull do syslog dos dispositivos",
      "Configurar cada dispositivo para enviar diretamente à API do Log Analytics"
    ],
    correctIndex: 1,
    explanation: "O método recomendado é usar Data Collection Rules (DCRs) com o Azure Monitor Agent. As DCRs definem quais facilities e níveis de severidade coletar e para qual workspace enviar os dados. O AMA coleta e encaminha os logs."
  },
  {
    question: "Qual licença do Azure AD é necessária para transmitir logs de sign-in para o Microsoft Sentinel?",
    options: [
      "O nível gratuito do Azure AD é suficiente",
      "Azure AD Premium P1 ou P2",
      "Apenas Microsoft 365 E5",
      "Nenhuma licença necessária além da assinatura Azure"
    ],
    correctIndex: 1,
    explanation: "A transmissão de logs de sign-in (SigninLogs, NonInteractiveUserSignInLogs, etc.) para qualquer destino requer Azure AD Premium P1 ou P2. Logs de auditoria estão disponíveis com qualquer edição do Azure AD, mas logs de sign-in exigem Premium."
  },
  {
    question: "Ao configurar o data connector de Azure Activity, qual mecanismo é usado para encaminhar os logs?",
    options: [
      "Um agente instalado no control plane do Azure",
      "Diagnostic settings do Azure no escopo da assinatura",
      "Um Logic App que faz pull da API de Activity Log",
      "Azure Event Grid subscription"
    ],
    correctIndex: 1,
    explanation: "O data connector de Azure Activity usa diagnostic settings configurados no escopo da assinatura. Isso cria um pipeline que transmite categorias de atividade como Administrative, Security, Alert, Policy e outras para o workspace do Log Analytics."
  }
]} />

## Limpeza

```bash
# Remove diagnostic settings
az monitor diagnostic-settings delete \
  --name "send-activity-to-sentinel" \
  --resource "/subscriptions/${SUBSCRIPTION_ID}"

# Delete data collection rules
az monitor data-collection rule delete \
  --name "dcr-syslog-contoso" \
  --resource-group $RG_NAME --yes

az monitor data-collection rule delete \
  --name "dcr-cef-contoso" \
  --resource-group $RG_NAME --yes

# Delete resource group (includes VM, workspace, Sentinel)
az group delete --name $RG_NAME --yes --no-wait

echo "Cleanup complete - all data connectors and resources removed"
```
