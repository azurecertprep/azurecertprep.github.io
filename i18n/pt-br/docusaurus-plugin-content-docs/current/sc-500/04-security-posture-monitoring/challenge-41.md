---
sidebar_position: 41
title: "Desafio 41: Planos de Proteção de Cargas de Trabalho do Defender for Cloud"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 41: Planos de Proteção de Cargas de Trabalho do Defender for Cloud

## Habilidades do exame cobertas

- Configurar planos de proteção de cargas de trabalho do Microsoft Defender for Cloud
- Habilitar Defender for Servers, Storage, Databases e Containers
- Configurar acesso JIT a VMs
- Gerenciar controles adaptativos de aplicação e monitoramento de integridade de arquivos

## Cenário

A Contoso Ltd está migrando cargas de trabalho de produção para o Azure e precisa de proteção abrangente contra ameaças. A equipe de segurança precisa que você habilite os planos Defender para servidores, contas de armazenamento, bancos de dados e contêineres. Você também deve configurar o acesso JIT (just-in-time) a VMs para reduzir a superfície de ataque das portas de gerenciamento e configurar controles adaptativos de aplicação para detectar execução anômala de processos.

---

## Pré-requisitos

- Assinatura Azure com função Owner ou Security Admin
- Azure CLI instalado e autenticado
- Pelo menos uma VM implantada (para JIT e controles adaptativos)
- Uma conta de armazenamento e um banco de dados Azure SQL

---

## Tarefa 1: Habilitar Defender for Servers Plan 2

Habilite a proteção abrangente de servidores incluindo avaliação de vulnerabilidades e monitoramento de integridade de arquivos.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-workload-lab"
LOCATION="eastus"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Enable Defender for Servers Plan 2
az security pricing create \
  --name VirtualMachines \
  --tier Standard \
  --subplan P2

# Verify plan status
az security pricing show \
  --name VirtualMachines \
  --query "{Name:name, Tier:pricingTier, SubPlan:subPlan}" -o table

# Enable Defender for Servers extensions
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/pricings/VirtualMachines?api-version=2024-01-01" \
  --body '{
    "properties": {
      "pricingTier": "Standard",
      "subPlan": "P2",
      "extensions": [
        {"name": "AgentlessVmScanning", "isEnabled": "True"},
        {"name": "MdeDesignatedSubscription", "isEnabled": "True"},
        {"name": "FileIntegrityMonitoring", "isEnabled": "True"}
      ]
    }
  }'
```

## Tarefa 2: Habilitar Defender for Storage e Databases

Configure a proteção para recursos da camada de dados.

```bash
# Enable Defender for Storage (per-transaction pricing)
az security pricing create \
  --name StorageAccounts \
  --tier Standard \
  --subplan DefenderForStorageV2

# Enable Defender for Azure SQL Databases
az security pricing create \
  --name SqlServers \
  --tier Standard

# Enable Defender for Open Source Relational Databases
az security pricing create \
  --name OpenSourceRelationalDatabases \
  --tier Standard

# Enable Defender for Containers
az security pricing create \
  --name Containers \
  --tier Standard

# List all enabled Defender plans
az security pricing list \
  --query "[?pricingTier=='Standard'].{Plan:name, Tier:pricingTier, SubPlan:subPlan}" -o table
```

## Tarefa 3: Implantar uma VM e configurar acesso Just-In-Time

Crie uma VM e habilite o acesso JIT para restringir a exposição das portas de gerenciamento.

```bash
# Create a test VM
az vm create \
  --resource-group $RG_NAME \
  --name "vm-contoso-prod01" \
  --image Ubuntu2404 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --nsg-rule SSH

VM_ID=$(az vm show --resource-group $RG_NAME --name "vm-contoso-prod01" --query id -o tsv)

# Enable JIT on the VM via REST API
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Security/jitNetworkAccessPolicies/default?api-version=2020-01-01" \
  --body "{
    \"properties\": {
      \"virtualMachines\": [{
        \"id\": \"${VM_ID}\",
        \"ports\": [
          {\"number\": 22, \"protocol\": \"TCP\", \"allowedSourceAddressPrefix\": \"*\", \"maxRequestAccessDuration\": \"PT3H\"},
          {\"number\": 3389, \"protocol\": \"TCP\", \"allowedSourceAddressPrefix\": \"*\", \"maxRequestAccessDuration\": \"PT3H\"}
        ]
      }]
    },
    \"kind\": \"Basic\"
  }"

echo "JIT policy configured - ports 22 and 3389 are now blocked until access is requested"
```

## Tarefa 4: Solicitar acesso JIT

Simule a solicitação de acesso just-in-time à VM.

```bash
# Request JIT access for SSH (port 22) for 1 hour
MY_IP=$(curl -s https://ifconfig.me)

az rest --method POST \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Security/jitNetworkAccessPolicies/default/initiate?api-version=2020-01-01" \
  --body "{
    \"virtualMachines\": [{
      \"id\": \"${VM_ID}\",
      \"ports\": [{
        \"number\": 22,
        \"duration\": \"PT1H\",
        \"allowedSourceAddressPrefix\": \"${MY_IP}\"
      }]
    }]
  }"

echo "JIT access granted for port 22 from ${MY_IP} for 1 hour"
```

## Tarefa 5: Configurar controles adaptativos de aplicação

Configure controles adaptativos de aplicação para permitir apenas processos aprovados.

```bash
# List recommended application control groups
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/applicationWhitelistings?api-version=2020-01-01" \
  --query "value[].{Group:name, RecommendationStatus:properties.recommendationStatus, EnforcementMode:properties.enforcementMode}" -o table

# Configure adaptive application controls for a VM group
# Note: Adaptive controls require 2+ weeks of learning before recommendations appear
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/locations/${LOCATION}/applicationWhitelistings/YOURGROUP?api-version=2020-01-01" \
  --body '{
    "properties": {
      "enforcementMode": "Audit",
      "protectionMode": {
        "exe": "Audit",
        "msi": "Audit",
        "script": "None"
      },
      "vmRecommendations": [{
        "configurationStatus": "Configured",
        "enforcementSupport": "Supported"
      }]
    }
  }'
```

## Tarefa 6: Configurar monitoramento de integridade de arquivos

Habilite o FIM para detectar alterações em arquivos críticos do sistema.

```bash
# Create a Data Collection Rule for File Integrity Monitoring
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Insights/dataCollectionRules/dcr-fim-contoso?api-version=2022-06-01" \
  --body "{
    \"location\": \"${LOCATION}\",
    \"properties\": {
      \"description\": \"File Integrity Monitoring for Contoso production servers\",
      \"dataSources\": {
        \"extensions\": [{
          \"name\": \"ChangeTrackingDataSource\",
          \"extensionName\": \"ChangeTracking-Linux\",
          \"streams\": [\"Microsoft-ConfigurationChange\"],
          \"extensionSettings\": {
            \"enableFiles\": true,
            \"enableSoftware\": true,
            \"enableRegistry\": false,
            \"enableServices\": true,
            \"fileSettings\": {
              \"linuxFiles\": [
                {\"name\": \"etc_passwd\", \"path\": \"/etc/passwd\", \"recurse\": false, \"enabled\": true},
                {\"name\": \"etc_shadow\", \"path\": \"/etc/shadow\", \"recurse\": false, \"enabled\": true},
                {\"name\": \"etc_sudoers\", \"path\": \"/etc/sudoers*\", \"recurse\": true, \"enabled\": true}
              ]
            }
          }
        }]
      },
      \"destinations\": {
        \"logAnalytics\": [{
          \"name\": \"laDestination\",
          \"workspaceResourceId\": \"/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.OperationalInsights/workspaces/law-contoso-compliance\"
        }]
      },
      \"dataFlows\": [{
        \"streams\": [\"Microsoft-ConfigurationChange\"],
        \"destinations\": [\"laDestination\"]
      }]
    }
  }"

echo "FIM configured - monitoring /etc/passwd, /etc/shadow, and /etc/sudoers"
```

---

## Quebre & Conserte

### Cenário 1: Solicitação JIT falha com "Policy not found"

Um membro da equipe tenta solicitar acesso JIT, mas recebe um erro dizendo que a política JIT não existe para a VM.

<details>
<summary>Mostrar solução</summary>

```bash
# Verify JIT policy exists for the resource group
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Security/jitNetworkAccessPolicies?api-version=2020-01-01" \
  --query "value[].{Name:name, VMs:properties.virtualMachines[].id}" -o json

# Common causes:
# 1. JIT policy was created in wrong resource group
# 2. VM ID in the policy doesn't match the actual VM

# Verify the VM exists and get its full resource ID
az vm show --resource-group $RG_NAME --name "vm-contoso-prod01" --query id -o tsv

# Re-create the JIT policy if needed with correct VM ID
# Also ensure the NSG associated with the VM's NIC exists
az network nsg show --resource-group $RG_NAME --name "vm-contoso-prod01NSG" --query id -o tsv

# JIT requires an NSG associated with the VM's network interface
```

</details>

### Cenário 2: Alertas do Defender for Storage não são disparados

O Defender for Storage está habilitado, mas nenhum alerta é gerado quando padrões de acesso suspeitos ocorrem.

<details>
<summary>Mostrar solução</summary>

```bash
# Verify the correct sub-plan is enabled
az security pricing show --name StorageAccounts \
  --query "{Tier:pricingTier, SubPlan:subPlan}" -o table

# Should show SubPlan: DefenderForStorageV2
# If it shows "PerTransaction" or "PerStorageAccount", update it:
az security pricing create \
  --name StorageAccounts \
  --tier Standard \
  --subplan DefenderForStorageV2

# Also check if per-resource override is disabling it
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Storage/storageAccounts/<account-name>/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview" \
  --query "properties.isEnabled"

# Enable at resource level if overridden
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Storage/storageAccounts/<account-name>/providers/Microsoft.Security/defenderForStorageSettings/current?api-version=2022-12-01-preview" \
  --body '{"properties": {"isEnabled": true, "malwareScanning": {"onUpload": {"isEnabled": true, "capGBPerMonth": 5000}}, "sensitiveDataDiscovery": {"isEnabled": true}}}'
```

</details>

### Cenário 3: VM não aparece nas recomendações de controle adaptativo de aplicação

Uma VM de produção está em execução há 3 semanas, mas não aparece nas recomendações de controle adaptativo de aplicação.

<details>
<summary>Mostrar solução</summary>

```bash
# Adaptive application controls require:
# 1. Defender for Servers P2 enabled
# 2. Log Analytics agent or Azure Monitor Agent collecting process data
# 3. VM running consistently for 2+ weeks

# Check if the VM has the monitoring agent
az vm extension list --resource-group $RG_NAME --vm-name "vm-contoso-prod01" \
  --query "[].{Name:name, ProvisioningState:provisioningState}" -o table

# If no agent, install Azure Monitor Agent
az vm extension set \
  --resource-group $RG_NAME \
  --vm-name "vm-contoso-prod01" \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor

# Also verify the VM is in a supported region and OS
az vm show --resource-group $RG_NAME --name "vm-contoso-prod01" \
  --query "{Location:location, OS:storageProfile.imageReference.offer}" -o table
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a duração máxima que o acesso JIT a uma VM pode ser concedido em uma única solicitação?",
    options: [
      "1 hora",
      "3 horas",
      "24 horas",
      "Depende do maxRequestAccessDuration configurado na política"
    ],
    correctIndex: 3,
    explanation: "A duração máxima é configurada por porta na política JIT através do campo maxRequestAccessDuration (no formato de duração ISO 8601). Cada solicitação não pode exceder esse máximo configurado."
  },
  {
    question: "Qual plano do Defender for Servers inclui verificação de vulnerabilidades sem agente e monitoramento de integridade de arquivos?",
    options: [
      "Defender for Servers tier Gratuito",
      "Defender for Servers Plan 1 (P1)",
      "Defender for Servers Plan 2 (P2)",
      "Tanto P1 quanto P2 incluem todos os recursos"
    ],
    correctIndex: 2,
    explanation: "O Defender for Servers Plan 2 (P2) inclui todos os recursos do P1 além de verificação de VM sem agente, monitoramento de integridade de arquivos, controles adaptativos de aplicação e ingestão gratuita de dados (500 MB/dia) para tipos específicos de dados de segurança."
  },
  {
    question: "O que a capacidade de verificação de malware do Defender for Storage faz quando malware é detectado em um blob enviado?",
    options: [
      "Exclui automaticamente o blob",
      "Gera um alerta de segurança e pode disparar um evento do Event Grid para automação",
      "Coloca o blob em quarentena e notifica quem fez o upload",
      "Bloqueia todo o acesso à conta de armazenamento"
    ],
    correctIndex: 1,
    explanation: "Quando malware é detectado, o Defender for Storage gera um alerta de segurança e publica um evento do Event Grid. O blob NÃO é excluído ou colocado em quarentena automaticamente — as organizações devem configurar sua própria resposta via Logic Apps ou Functions acionados pelo evento do Event Grid."
  },
  {
    question: "Como o controle adaptativo de aplicação difere do whitelisting tradicional de aplicações?",
    options: [
      "Usa machine learning para recomendar quais aplicações devem ser permitidas com base no comportamento observado",
      "Funciona apenas em servidores Windows",
      "Bloqueia todas as aplicações por padrão sem nenhum período de aprendizado",
      "Requer configuração manual de cada processo permitido"
    ],
    correctIndex: 0,
    explanation: "Os controles adaptativos de aplicação usam machine learning para analisar processos em execução ao longo do tempo e recomendar listas de permissão de aplicações com base no comportamento observado. Isso reduz o esforço manual do whitelisting tradicional enquanto se adapta à carga de trabalho específica."
  }
]} />

## Limpeza

```bash
# Disable Defender plans
az security pricing create --name VirtualMachines --tier Free
az security pricing create --name StorageAccounts --tier Free
az security pricing create --name SqlServers --tier Free
az security pricing create --name OpenSourceRelationalDatabases --tier Free
az security pricing create --name Containers --tier Free

# Delete JIT policy
az rest --method DELETE \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Security/jitNetworkAccessPolicies/default?api-version=2020-01-01"

# Delete resource group and all resources
az group delete --name $RG_NAME --yes --no-wait

echo "Cleanup complete - all Defender plans set to Free tier"
```
