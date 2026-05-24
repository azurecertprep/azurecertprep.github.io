---
sidebar_position: 14
title: "Desafio 14: Proteção contra Ameaças do Defender for Storage"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 14: Proteção contra Ameaças do Defender for Storage

## Habilidades do exame cobertas

- Habilitar e configurar o Microsoft Defender for Storage
- Configurar varredura de sensibilidade para descoberta de dados
- Configurar varredura de malware para conteúdo enviado
- Monitorar e responder a alertas de segurança de storage
- Configurar monitoramento de atividade para padrões de acesso anômalos

## Cenário

A Contoso Ltd recentemente sofreu um incidente onde malware foi enviado para um container do Azure Blob Storage usado pela aplicação de compartilhamento de arquivos. Adicionalmente, a equipe de segurança descobriu que dados sensíveis (números de cartão de crédito e números de seguro social) estavam sendo armazenados em containers sem classificação adequada. Você deve habilitar o Microsoft Defender for Storage para fornecer proteção contra ameaças, varredura de malware no upload e descoberta de dados sensíveis em todas as storage accounts da Contoso.

---

## Pré-requisitos

- Assinatura Azure com role de Security Admin ou Contributor
- Azure CLI instalado e autenticado (`az login`)
- Microsoft Defender for Cloud habilitado (camada gratuita no mínimo)
- Uma storage account existente ou disposição para criar uma

---

## Task 1: Habilitar o Microsoft Defender for Storage no nível da assinatura

Habilite o Defender for Storage com o novo plano de preços por transação que inclui varredura de malware e varredura de sensibilidade.

```bash
# Set variables
RG="rg-sc500-defender-storage"
LOCATION="eastus"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create resource group
az group create --name $RG --location $LOCATION

# Enable Defender for Storage at subscription level (new plan)
az security pricing create \
  --name StorageAccounts \
  --tier Standard

# Verify Defender for Storage is enabled
az security pricing show \
  --name StorageAccounts \
  --query "{Name:name, Tier:pricingTier, SubPlan:subPlan}"

# Check available extensions (malware scanning, sensitivity scanning)
az security pricing show \
  --name StorageAccounts \
  --query "extensions"
```

---

## Task 2: Configurar definições do Defender por storage account

Habilite o Defender for Storage em uma storage account específica com varredura de malware e descoberta de dados sensíveis.

```bash
# Create a storage account for testing
STORAGE_ACCOUNT="stdefender$(openssl rand -hex 4)"
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Enable Defender for Storage on the specific account using ARM
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview" \
  --body '{
    "properties": {
      "isEnabled": true,
      "malwareScanning": {
        "onUpload": {
          "isEnabled": true,
          "capGBPerMonth": 5000
        }
      },
      "sensitiveDataDiscovery": {
        "isEnabled": true
      },
      "overrideSubscriptionLevelSettings": true
    }
  }'

# Verify Defender settings on the storage account
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview"
```

---

## Task 3: Configurar varredura de malware com resposta automatizada

Configure a varredura de malware com integração ao Event Grid para colocar automaticamente em quarentena arquivos maliciosos.

```bash
# Create a quarantine container
STORAGE_KEY=$(az storage account keys list \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --query "[0].value" -o tsv)

az storage container create \
  --name uploads \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

az storage container create \
  --name quarantine \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

az storage container create \
  --name clean \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

# Create Event Grid system topic for the storage account
az eventgrid system-topic create \
  --name "evgt-defender-storage" \
  --resource-group $RG \
  --location $LOCATION \
  --source "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT" \
  --topic-type "Microsoft.Storage.StorageAccounts"

# Create an Event Grid subscription to filter malware scanning results
# This would typically trigger an Azure Function or Logic App
az eventgrid system-topic event-subscription create \
  --name "malware-scan-results" \
  --system-topic-name "evgt-defender-storage" \
  --resource-group $RG \
  --included-event-types "Microsoft.Security.MalwareScanningResult" \
  --endpoint-type storagequeue \
  --endpoint "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/queueServices/default/queues/scan-results"

# Create the queue first
az storage queue create \
  --name scan-results \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY
```

---

## Task 4: Configurar varredura de sensibilidade e classificação de dados

Configure a descoberta de dados sensíveis para identificar PII e dados financeiros em storage accounts.

```bash
# Verify sensitivity scanning is enabled (configured in Task 2)
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview" \
  --query "properties.sensitiveDataDiscovery"

# Upload sample files to test sensitivity scanning
echo "Customer: John Doe, SSN: 123-45-6789, CC: 4111-1111-1111-1111" > sample-sensitive.txt

az storage blob upload \
  --container-name uploads \
  --name "customer-data/sample-sensitive.txt" \
  --file sample-sensitive.txt \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

# Upload a non-sensitive file for comparison
echo "Product catalog: Widget A, Widget B, Widget C" > sample-clean.txt

az storage blob upload \
  --container-name uploads \
  --name "catalog/sample-clean.txt" \
  --file sample-clean.txt \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

# Clean up local files
rm -f sample-sensitive.txt sample-clean.txt

# View security alerts (sensitivity findings appear after scanning)
az security alert list \
  --resource-group $RG \
  --query "[?contains(alertType, 'Storage')].{Type:alertType, Severity:severity, Status:status, Time:timeGeneratedUtc}" \
  -o table
```

---

## Task 5: Monitorar e investigar alertas de segurança de storage

Revise e gerencie alertas de segurança gerados pelo Defender for Storage.

```bash
# List all storage-related security alerts
az security alert list \
  --query "[?contains(alertType, 'Storage')].{AlertType:alertType, Name:alertDisplayName, Severity:severity, Status:status}" \
  -o table

# Get details of a specific alert type
az security alert list \
  --query "[?alertType=='Storage.Blob_MalwareHashReputation']"

# Simulate suspicious activity - access from Tor exit node (for awareness)
# Note: This would normally trigger "Access from a Tor exit node" alert
# az security alert list --query "[?alertType=='Storage.Blob_TorAnomaly']"

# List alert types that Defender for Storage can detect:
echo "Common Defender for Storage alert types:"
echo "  - Storage.Blob_MalwareHashReputation (Known malware uploaded)"
echo "  - Storage.Blob_MalwareScanMalwareFound (Malware found by scan)"
echo "  - Storage.Blob_TorAnomaly (Access from Tor exit node)"
echo "  - Storage.Blob_AccessInspectionAnomaly (Unusual access pattern)"
echo "  - Storage.Blob_DataExfiltration (Potential data exfiltration)"
echo "  - Storage.Blob_GeoAnomaly (Access from unusual location)"
echo "  - Storage.Blob_AnonymousAccessAnomaly (Anonymous access anomaly)"

# Configure alert suppression rule (suppress known false positives)
az security automation create \
  --name "suppress-known-scanner" \
  --resource-group $RG \
  --location $LOCATION \
  --scopes "[{\"description\":\"Subscription\",\"scopePath\":\"/subscriptions/$SUBSCRIPTION_ID\"}]" \
  --sources "[{\"eventSource\":\"Alerts\",\"ruleSets\":[{\"rules\":[{\"propertyJPath\":\"Severity\",\"propertyType\":\"String\",\"expectedValue\":\"Low\",\"operator\":\"Equals\"}]}]}]" \
  --actions "[{\"actionType\":\"LogicApp\",\"logicAppResourceId\":\"/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Logic/workflows/placeholder\",\"uri\":\"https://placeholder.logic.azure.com\"}]"
```

---

## Task 6: Configurar definições de diagnóstico para auditoria de segurança de storage

Configure logging de diagnóstico para capturar todas as operações de storage relevantes para segurança.

```bash
# Create Log Analytics workspace for storage diagnostics
WORKSPACE_NAME="law-sc500-storage"
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --query id -o tsv)

# Enable diagnostic settings for the storage account (blob service)
az monitor diagnostic-settings create \
  --name "storage-security-audit" \
  --resource "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/blobServices/default" \
  --workspace $WORKSPACE_ID \
  --logs '[{"category": "StorageRead", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}, {"category": "StorageWrite", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}, {"category": "StorageDelete", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}]' \
  --metrics '[{"category": "Transaction", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}]'

# Verify diagnostic settings
az monitor diagnostic-settings list \
  --resource "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/blobServices/default" \
  --query "[].{Name:name, WorkspaceId:workspaceId}" -o table
```

---

## Quebra & conserta

### Cenário 1: Varredura de malware não é acionada nos uploads de arquivo

Usuários estão enviando arquivos para a storage account mas alertas de varredura de malware não estão sendo gerados para arquivos de teste de malware conhecidos (arquivo de teste EICAR). O plano do Defender aparece como habilitado.

<details>
<summary>Mostrar solução</summary>

```bash
# Check if malware scanning on-upload is enabled
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview" \
  --query "properties.malwareScanning.onUpload"

# If capGBPerMonth is reached, scanning stops. Check usage.
# Re-enable with adequate cap
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview" \
  --body '{
    "properties": {
      "isEnabled": true,
      "malwareScanning": {
        "onUpload": {
          "isEnabled": true,
          "capGBPerMonth": 10000
        }
      },
      "sensitiveDataDiscovery": {
        "isEnabled": true
      },
      "overrideSubscriptionLevelSettings": true
    }
  }'

# Also verify the storage account allows the Defender service
# The storage firewall must allow trusted Microsoft services
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --bypass AzureServices
```

</details>

### Cenário 2: Varredura de sensibilidade não mostra resultados após 48 horas

A varredura de sensibilidade do Defender for Storage foi habilitada mas nenhuma descoberta de dados sensíveis aparece apesar de PII conhecida nos containers.

<details>
<summary>Mostrar solução</summary>

```bash
# Verify sensitivity scanning is enabled
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview" \
  --query "properties.sensitiveDataDiscovery.isEnabled"

# Check if the storage account has the required permissions
# Sensitivity scanning requires Microsoft Purview to be connected
# Verify Microsoft Purview integration in Defender for Cloud settings

# Check if the subscription has Microsoft Purview configured
az security pricing show \
  --name StorageAccounts \
  --query "extensions[?name=='SensitiveDataDiscovery']"

# Ensure the storage account is not excluded from scanning
# and that blobs are in supported formats (text, CSV, JSON, Parquet, etc.)

# Re-upload data in supported format
echo "name,ssn,credit_card" > test-data.csv
echo "John Doe,123-45-6789,4111111111111111" >> test-data.csv
az storage blob upload \
  --container-name uploads \
  --name "pii-test/test-data.csv" \
  --file test-data.csv \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --overwrite
rm -f test-data.csv
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que acontece quando o limite mensal para varredura de malware (capGBPerMonth) é atingido no Defender for Storage?",
    options: [
      "Todas as operações de storage são bloqueadas até o próximo mês",
      "A varredura de malware para pelo restante do mês, mas os uploads continuam",
      "O limite aumenta automaticamente em 50%",
      "Alertas ainda são gerados mas os arquivos não são colocados em quarentena"
    ],
    correctIndex: 1,
    explanation: "Quando o limite mensal de varredura é atingido, o Defender for Storage para de varrer novos uploads pelo restante do mês. Os uploads não são bloqueados — eles simplesmente prosseguem sem serem varridos. Este é um mecanismo de controle de custos."
  },
  {
    question: "Qual tipo de evento do Event Grid você deve assinar para receber resultados de varredura de malware do Defender for Storage?",
    options: [
      "Microsoft.Storage.BlobCreated",
      "Microsoft.Security.MalwareScanningResult",
      "Microsoft.Defender.StorageAlert",
      "Microsoft.Storage.BlobThreatDetected"
    ],
    correctIndex: 1,
    explanation: "O tipo de evento 'Microsoft.Security.MalwareScanningResult' é publicado no Event Grid quando o Defender for Storage conclui uma varredura de malware. O evento contém o veredito da varredura (malicioso ou limpo) e pode acionar respostas automatizadas."
  },
  {
    question: "Qual pré-requisito é necessário para a varredura de sensibilidade do Defender for Storage descobrir PII em containers de blob?",
    options: [
      "Labels do Azure Information Protection devem ser aplicados a todos os blobs",
      "O Microsoft Purview deve estar conectado ao ambiente do Defender for Cloud",
      "Chaves gerenciadas pelo cliente devem ser configuradas na storage account",
      "O Azure Policy deve ser atribuído para impor classificação de dados"
    ],
    correctIndex: 1,
    explanation: "A varredura de sensibilidade do Defender for Storage utiliza o mecanismo de classificação de dados do Microsoft Purview. O Microsoft Purview deve estar conectado ao ambiente do Defender for Cloud para que a descoberta de dados sensíveis funcione."
  },
  {
    question: "Para garantir que a varredura de malware do Defender for Storage funcione quando o firewall da storage account está habilitado, o que deve ser configurado?",
    options: [
      "Adicionar o intervalo de IP do Microsoft Defender à lista de permissões do firewall da storage",
      "Configurar o bypass para permitir 'Trusted Microsoft services'",
      "Criar um private endpoint para o serviço do Defender",
      "Desabilitar o firewall da storage durante janelas de varredura"
    ],
    correctIndex: 1,
    explanation: "Quando firewalls de storage account estão habilitados, você deve configurar o bypass de 'Trusted Microsoft services' para permitir que o Defender for Storage acesse e varra blobs. O Defender for Storage é um serviço Microsoft first-party confiável."
  }
]} />

## Limpeza

```bash
# Delete the resource group and all resources
az group delete --name $RG --yes --no-wait

# Remove the Event Grid system topic if needed
az eventgrid system-topic delete \
  --name "evgt-defender-storage" \
  --resource-group $RG --yes 2>/dev/null
```
