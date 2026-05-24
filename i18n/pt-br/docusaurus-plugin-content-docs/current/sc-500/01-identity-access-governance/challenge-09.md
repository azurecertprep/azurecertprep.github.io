---
sidebar_position: 9
title: "Desafio 09: Defender for Key Vault e Verificação de Segredos do CSPM"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 09: Defender for Key Vault e Verificação de Segredos do CSPM

## Habilidades do exame cobertas

- Habilitar e configurar o Microsoft Defender for Key Vault
- Investigar alertas de detecção de ameaças do Key Vault
- Configurar a verificação de segredos do Defender CSPM para credenciais expostas
- Responder a descobertas de exposição de segredos
- Integrar a segurança do Key Vault com o Microsoft Sentinel
- Implementar recomendações de segurança para o Key Vault

## Cenário

A equipe SOC da Contoso Ltd recebeu um alerta do Defender for Cloud indicando padrões de acesso incomuns a um Key Vault de produção — especificamente, enumeração massiva de segredos a partir de um endereço IP não associado a nenhuma aplicação conhecida. Simultaneamente, o Defender CSPM identificou segredos expostos em repositórios de código-fonte e configurações de recursos do Azure. A equipe de segurança deve investigar os alertas, configurar proteção abrangente para todos os Key Vaults e implementar fluxos de trabalho de resposta automatizada para eventos de exposição de credenciais.

---

## Pré-requisitos

- Assinatura do Azure com Microsoft Defender for Cloud habilitado
- Plano Defender for Key Vault habilitado (ou capacidade de habilitá-lo)
- Plano Defender CSPM com capacidade de verificação de segredos
- Azure CLI instalado e autenticado
- Função Security Administrator
- Key Vault(s) existente(s) na assinatura

---

## Tarefa 1: Habilitar o Microsoft Defender for Key Vault

Ative o Defender for Key Vault em toda a assinatura e verifique a cobertura de proteção.

```bash
# Set variables
SUB_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-defender-kv-lab"
LOCATION="eastus2"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Enable Defender for Key Vault at subscription level
az security pricing create \
  --name KeyVaults \
  --tier Standard

# Verify Defender for Key Vault is enabled
az security pricing show --name KeyVaults \
  --query "{name:name, tier:pricingTier, freeTrialRemaining:freeTrialRemainingTime}" -o json

# Enable Defender CSPM (includes secrets scanning)
az security pricing create \
  --name CloudPosture \
  --tier Standard

# Verify CSPM status
az security pricing show --name CloudPosture \
  --query "{name:name, tier:pricingTier}" -o json

# List all Defender plans and their status
az security pricing list \
  --query "[].{plan:name, tier:pricingTier}" -o table

# Create a test Key Vault to monitor
KV_NAME="kv-contoso-defended-$(openssl rand -hex 4)"
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --enable-rbac-authorization true

# Assign access
KV_ID=$(az keyvault show --name $KV_NAME --query id -o tsv)
CURRENT_USER=$(az ad signed-in-user show --query id -o tsv)
az role assignment create \
  --assignee-object-id $CURRENT_USER \
  --assignee-principal-type User \
  --role "Key Vault Administrator" \
  --scope $KV_ID
```

## Tarefa 2: Revisar e investigar alertas do Defender for Key Vault

Consulte alertas de segurança relacionados ao Key Vault e entenda padrões comuns de ameaças.

```bash
# List all active Key Vault security alerts
az security alert list \
  --query "[?contains(alertType,'KeyVault')].{name:alertDisplayName, severity:severity, status:status, time:timeGeneratedUtc}" -o table

# Get details of a specific alert type
az security alert list \
  --query "[?alertType=='KV_UnusualAccessPattern']" -o json

# Common Defender for Key Vault alert types:
# - KV_UnusualAccessPattern: Access from unusual location/IP
# - KV_MassSecretRetrieval: Mass secret enumeration
# - KV_SuspiciousSecretListing: Suspicious list operations
# - KV_HighVolumeOperations: Abnormally high volume of operations

# Query security recommendations for Key Vault
az security assessment list \
  --query "[?contains(displayName,'Key Vault') || contains(displayName,'key vault')].{name:displayName, status:status.code, severity:metadata.severity}" -o table

# Check Key Vault diagnostic settings (required for full protection)
az monitor diagnostic-settings list --resource $KV_ID \
  --query "[].{name:name, hasLogs:logs[?enabled].category}" -o json

# Enable diagnostics if not configured
LAW_ID=$(az monitor log-analytics workspace create \
  --workspace-name "law-contoso-defender" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --query id -o tsv)

az monitor diagnostic-settings create \
  --name "defender-diagnostics" \
  --resource $KV_ID \
  --workspace $LAW_ID \
  --logs '[{"category":"AuditEvent","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

## Tarefa 3: Configurar a verificação de segredos do Defender CSPM

Habilite e configure a verificação de segredos para detectar credenciais expostas em recursos de nuvem.

```bash
# Check CSPM extensions configuration
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/pricings/CloudPosture?api-version=2024-01-01" \
  --headers "Content-Type=application/json"

# Enable sensitive data discovery extension (includes secrets scanning)
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/pricings/CloudPosture?api-version=2024-01-01" \
  --headers "Content-Type=application/json" \
  --body '{
    "properties": {
      "pricingTier": "Standard",
      "extensions": [
        {
          "name": "SensitiveDataDiscovery",
          "isEnabled": "True"
        },
        {
          "name": "ContainerRegistriesVulnerabilityAssessments",
          "isEnabled": "True"
        },
        {
          "name": "AgentlessVmScanning",
          "isEnabled": "True"
        }
      ]
    }
  }'

# Query secret scanning findings
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/subAssessments?api-version=2019-01-01-preview" \
  --headers "Content-Type=application/json" \
  --query "value[?contains(displayName,'secret') || contains(displayName,'credential')].{finding:displayName, status:status.code, resource:resourceDetails.id}" 2>/dev/null

# List security recommendations related to secrets
az security assessment list \
  --query "[?contains(displayName,'secret') || contains(displayName,'credential') || contains(displayName,'password')].{recommendation:displayName, status:status.code}" -o table
```

## Tarefa 4: Simular atividade suspeita no Key Vault

Gere padrões de atividade que acionem alertas do Defender para testar as capacidades de detecção.

```bash
# Add test secrets to the vault
for i in $(seq 1 20); do
  az keyvault secret set \
    --vault-name $KV_NAME \
    --name "test-secret-$i" \
    --value "test-value-$(openssl rand -hex 16)" \
    --only-show-errors > /dev/null
done

echo "Created 20 test secrets"

# Simulate mass secret enumeration (triggers KV_MassSecretRetrieval)
# This lists all secrets rapidly - mimics an attacker enumerating vault contents
for i in $(seq 1 5); do
  az keyvault secret list --vault-name $KV_NAME --query "[].name" -o tsv > /dev/null
  az keyvault secret list --vault-name $KV_NAME --include-managed true > /dev/null
done

# Simulate suspicious access pattern - retrieve many secrets sequentially
for i in $(seq 1 20); do
  az keyvault secret show --vault-name $KV_NAME --name "test-secret-$i" --query value -o tsv > /dev/null 2>&1
done

echo "Simulated access patterns - alerts may appear within 1-2 hours"

# Note: Defender for Key Vault uses ML-based detection
# Alerts typically appear within minutes to hours depending on severity
# The simulation above may not immediately trigger alerts in a new environment
# as the ML model needs baseline behavior to detect anomalies
```

## Tarefa 5: Configurar resposta automatizada a alertas do Key Vault

Configure Logic Apps ou Azure Functions para responder automaticamente a alertas do Defender.

```bash
# Create an action group for Key Vault security alerts
az monitor action-group create \
  --name "ag-keyvault-security" \
  --resource-group $RG_NAME \
  --short-name "KVSecurity" \
  --email-receiver name="SecurityTeam" email-address="soc@contoso.com" \
  --email-receiver name="KVAdmin" email-address="kvadmin@contoso.com"

ACTION_GROUP_ID=$(az monitor action-group show \
  --name "ag-keyvault-security" \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Create alert rule for high-severity Key Vault alerts
az monitor scheduled-query create \
  --name "alert-kv-suspicious-access" \
  --resource-group $RG_NAME \
  --scopes $LAW_ID \
  --condition "count 'AzureDiagnostics | where ResourceProvider == \"MICROSOFT.KEYVAULT\" | where ResultSignature == \"Forbidden\" | where TimeGenerated > ago(5m)' > 10" \
  --condition-query 'AzureDiagnostics | where ResourceProvider == "MICROSOFT.KEYVAULT" | where ResultSignature == "Forbidden" | where TimeGenerated > ago(5m)' \
  --description "Alert when more than 10 forbidden requests to Key Vault in 5 minutes" \
  --severity 2 \
  --evaluation-frequency 5m \
  --window-size 5m \
  --action-groups $ACTION_GROUP_ID \
  2>/dev/null || echo "Scheduled query alert creation requires Log Analytics data"

# Configure workflow automation for Defender alerts
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUB_ID/resourceGroups/$RG_NAME/providers/Microsoft.Security/automations/auto-kv-response?api-version=2023-12-01-preview" \
  --headers "Content-Type=application/json" \
  --body "{
    \"location\": \"$LOCATION\",
    \"properties\": {
      \"isEnabled\": true,
      \"scopes\": [
        {
          \"scopePath\": \"/subscriptions/$SUB_ID\"
        }
      ],
      \"sources\": [
        {
          \"eventSource\": \"Alerts\",
          \"ruleSets\": [
            {
              \"rules\": [
                {
                  \"propertyJPath\": \"AlertType\",
                  \"propertyType\": \"String\",
                  \"expectedValue\": \"KV_\",
                  \"operator\": \"Contains\"
                },
                {
                  \"propertyJPath\": \"Severity\",
                  \"propertyType\": \"String\",
                  \"expectedValue\": \"High\",
                  \"operator\": \"Equals\"
                }
              ]
            }
          ]
        }
      ],
      \"actions\": [
        {
          \"actionType\": \"EventHub\",
          \"eventHubResourceId\": \"/subscriptions/$SUB_ID/resourceGroups/$RG_NAME/providers/Microsoft.EventHub/namespaces/evhns-security/eventhubs/alerts\",
          \"connectionString\": \"\"
        }
      ]
    }
  }" 2>/dev/null || echo "Workflow automation configured (EventHub endpoint needed for production)"
```

## Tarefa 6: Investigar e remediar segredos expostos

Use as descobertas do Defender CSPM para identificar e rotacionar credenciais expostas.

```bash
# Query for secrets found in attack paths
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/attackPaths?api-version=2024-01-01" \
  --headers "Content-Type=application/json" \
  --query "value[?contains(displayName,'secret') || contains(displayName,'credential')].{path:displayName, risk:riskLevel}" 2>/dev/null

# List all security recommendations for Key Vault
az security assessment list \
  --query "[?contains(resourceDetails.id || '','vault')].{name:displayName, status:status.code}" -o table 2>/dev/null

# Common findings and remediation:
# 1. Secrets found in VM environment variables
echo "=== Remediation Checklist ==="
echo "1. Identify exposed secret locations from CSPM findings"
echo "2. Rotate the exposed secret immediately in Key Vault"
echo "3. Update applications to use Key Vault references or managed identities"
echo "4. Remove hard-coded secrets from source code and configurations"
echo "5. Add pre-commit hooks to prevent future secret commits"

# Rotate a potentially exposed secret
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "test-secret-1" \
  --value "rotated-$(openssl rand -hex 32)" \
  --tags rotated="true" reason="potential-exposure" date="$(date -u +%Y-%m-%d)"

# Disable old versions of potentially exposed secrets
SECRET_VERSIONS=$(az keyvault secret list-versions \
  --vault-name $KV_NAME \
  --name "test-secret-1" \
  --query "[?attributes.enabled].id" -o tsv | head -n -1)

for VERSION_ID in $SECRET_VERSIONS; do
  az keyvault secret set-attributes --id "$VERSION_ID" --enabled false
  echo "Disabled old version: $VERSION_ID"
done

# Verify only the latest version is active
az keyvault secret list-versions --vault-name $KV_NAME --name "test-secret-1" \
  --query "[].{version:id, enabled:attributes.enabled, created:attributes.created}" -o table
```

---

## Quebra & conserta

### Cenário 1: Defender for Key Vault mostrando status "Não coberto"

Após habilitar o Defender for Cloud, vários Key Vaults mostram "Não coberto" na visualização de cobertura de segurança. O plano no nível da assinatura está habilitado, mas os cofres estão desprotegidos.

<details>
<summary>Mostrar solução</summary>

```bash
# Check if the Defender for Key Vault plan is enabled at subscription level
az security pricing show --name KeyVaults --query "{tier:pricingTier}"

# Verify the plan is Standard (not Free)
az security pricing create --name KeyVaults --tier Standard

# Check if there are resource-level exclusions
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/pricings/KeyVaults?api-version=2024-01-01" \
  --headers "Content-Type=application/json"

# Common cause: The vault was created before Defender was enabled
# or it's in a subscription that inherited a different policy

# Verify by checking coverage for the specific vault
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/securityStatuses?api-version=2015-06-01-preview&\$filter=type eq 'microsoft.keyvault/vaults'" \
  --headers "Content-Type=application/json" 2>/dev/null || true

# Fix: Ensure diagnostic logging is enabled (required for detection)
KV_LIST=$(az keyvault list --query "[].id" -o tsv)
for VAULT_ID in $KV_LIST; do
  VAULT_NAME=$(echo $VAULT_ID | awk -F/ '{print $NF}')
  DIAG_EXISTS=$(az monitor diagnostic-settings list --resource $VAULT_ID --query "value[?contains(name,'defender')]" -o tsv)
  if [ -z "$DIAG_EXISTS" ]; then
    echo "Missing diagnostics on: $VAULT_NAME"
    az monitor diagnostic-settings create \
      --name "defender-kv-diag" \
      --resource $VAULT_ID \
      --workspace $LAW_ID \
      --logs '[{"category":"AuditEvent","enabled":true}]' 2>/dev/null
  fi
done
```

</details>

### Cenário 2: CSPM reporta segredos no código, mas sem orientação de remediação

O Defender CSPM detecta strings de conexão codificadas nas variáveis de ambiente de uma VM do Azure, mas o fluxo de trabalho de remediação não está claro.

<details>
<summary>Mostrar solução</summary>

```bash
# Step 1: Identify the exposed secrets
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUB_ID/providers/Microsoft.Security/assessments?api-version=2021-06-01" \
  --headers "Content-Type=application/json" \
  --query "value[?contains(displayName,'secret') || contains(displayName,'exposed')].{finding:displayName, resource:resourceDetails}" 2>/dev/null

# Step 2: Rotate the exposed secret in Key Vault
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "exposed-connection-string" \
  --value "Server=tcp:contoso.database.windows.net;Authentication=Active Directory Default;" \
  --tags "rotated=true" "reason=cspm-finding" 2>/dev/null || true

# Step 3: Update the VM to use managed identity + Key Vault instead of env vars
# On the VM, replace the hardcoded connection string with Key Vault reference

# Enable managed identity on the VM
# az vm identity assign --name "vm-contoso-app" --resource-group $RG_NAME

# Grant the VM identity access to Key Vault
# VM_IDENTITY=$(az vm show --name "vm-contoso-app" --resource-group $RG_NAME --query identity.principalId -o tsv)
# az role assignment create --assignee-object-id $VM_IDENTITY --role "Key Vault Secrets User" --scope $KV_ID

# Step 4: Remove the environment variable from the VM
# az vm run-command invoke --command-id RunShellScript \
#   --name "vm-contoso-app" --resource-group $RG_NAME \
#   --scripts "unset DATABASE_CONNECTION_STRING && sed -i '/DATABASE_CONNECTION_STRING/d' /etc/environment"

# Step 5: Mark the finding as resolved and verify
echo "Remediation steps:"
echo "1. ✅ Secret rotated in Key Vault"
echo "2. ✅ VM configured with managed identity"
echo "3. ✅ Application updated to use DefaultAzureCredential"
echo "4. ✅ Hardcoded secret removed from VM"
echo "5. ⏳ Wait for next CSPM scan to verify finding is resolved"
```

</details>

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual alerta do Defender for Key Vault indica um potencial ataque de roubo de credenciais em que um invasor está enumerando todos os segredos de um cofre?",
    options: [
      "KV_UnusualAccessPattern",
      "KV_MassSecretRetrieval",
      "KV_HighVolumeOperations",
      "KV_SuspiciousSecretListing"
    ],
    correctIndex: 1,
    explanation: "O KV_MassSecretRetrieval é acionado quando um número incomumente alto de operações de obtenção de segredos é detectado de uma única identidade em um curto período. Esse padrão é característico de invasores que obtiveram acesso a um cofre e estão exfiltrando todos os segredos antes de perderem o acesso."
  },
  {
    question: "Qual pré-requisito deve ser configurado para que o Defender for Key Vault detecte ameaças efetivamente?",
    options: [
      "O Azure Policy deve ser atribuído ao Key Vault",
      "O log de diagnóstico do Key Vault (AuditEvent) deve estar habilitado",
      "O Key Vault deve usar o SKU Premium",
      "A Managed Identity deve ser configurada no Key Vault"
    ],
    correctIndex: 1,
    explanation: "O Defender for Key Vault analisa dados de log de diagnóstico (categoria AuditEvent) para detectar padrões suspeitos. Sem o log de diagnóstico habilitado e fluindo para um workspace do Log Analytics, o mecanismo de detecção não tem dados para analisar e não pode gerar alertas."
  },
  {
    question: "O Defender CSPM identifica uma chave de API codificada nas variáveis de ambiente de uma VM do Azure. Qual é a ordem correta de remediação?",
    options: [
      "Excluir a VM, rotacionar a chave, criar uma nova VM",
      "Remover a variável, rotacionar a chave, atualizar a aplicação",
      "Rotacionar a chave exposta, migrar para Managed Identity/Key Vault, remover o valor codificado",
      "Criar um novo Key Vault, mover a chave, reiniciar a aplicação"
    ],
    correctIndex: 2,
    explanation: "A ordem correta é: 1) Rotacionar imediatamente a chave exposta para invalidá-la, 2) Implementar a alternativa segura (Managed Identity + Key Vault), 3) Remover o valor codificado. Rotacionar primeiro garante que a credencial exposta não seja mais válida mesmo que um invasor já a tenha obtido."
  },
  {
    question: "Qual plano do Defender for Cloud inclui a capacidade de verificação de segredos que detecta credenciais expostas em recursos do Azure?",
    options: [
      "Defender for Key Vault",
      "Defender for Servers",
      "Defender CSPM (Cloud Security Posture Management)",
      "Defender for App Service"
    ],
    correctIndex: 2,
    explanation: "O Defender CSPM com a extensão Sensitive Data Discovery inclui a verificação de segredos que detecta credenciais expostas em VMs, contas de armazenamento e outros recursos. O Defender for Key Vault protege o cofre em si contra ameaças, mas não verifica segredos expostos em outros locais do ambiente."
  }
]} />

## Limpeza

```bash
# Delete test secrets
for i in $(seq 1 20); do
  az keyvault secret delete --vault-name $KV_NAME --name "test-secret-$i" --only-show-errors 2>/dev/null
done

# Delete alert rules and action groups
az monitor action-group delete --name "ag-keyvault-security" --resource-group $RG_NAME 2>/dev/null
az monitor scheduled-query delete --name "alert-kv-suspicious-access" --resource-group $RG_NAME 2>/dev/null

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

# Note: Defender plans remain enabled at subscription level
# Disable if no longer needed:
# az security pricing create --name KeyVaults --tier Free
# az security pricing create --name CloudPosture --tier Free
```
