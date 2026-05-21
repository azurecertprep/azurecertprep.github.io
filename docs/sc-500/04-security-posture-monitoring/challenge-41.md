---
sidebar_position: 41
title: "Challenge 41: Defender for Cloud Workload Protection Plans"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 41: Defender for Cloud Workload Protection Plans

## Exam skills covered

- Configure Microsoft Defender for Cloud workload protection plans
- Enable Defender for Servers, Storage, Databases, and Containers
- Configure just-in-time VM access
- Manage adaptive application controls and file integrity monitoring

## Scenario

Contoso Ltd is migrating production workloads to Azure and needs comprehensive threat protection. The security team requires you to enable Defender plans for servers, storage accounts, databases, and containers. You must also configure just-in-time (JIT) VM access to reduce the attack surface of management ports and set up adaptive application controls to detect anomalous process execution.

---

## Prerequisites

- Azure subscription with Owner or Security Admin role
- Azure CLI installed and authenticated
- At least one VM deployed (for JIT and adaptive controls)
- A storage account and an Azure SQL database

---

## Task 1: Enable Defender for Servers Plan 2

Enable comprehensive server protection including vulnerability assessment and file integrity monitoring.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-workload-lab"
LOCATION="eastus"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Enable Defender for Servers Plan 2
# Note: --subplan parameter may not be supported in all CLI versions; REST API approach is more reliable
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/pricings/VirtualMachines?api-version=2024-01-01" \
  --body '{"properties":{"pricingTier":"Standard","subPlan":"P2"}}'

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
        {"name": "AgentlessVmScanning", "isEnabled": true},
        {"name": "MdeDesignatedSubscription", "isEnabled": true},
        {"name": "FileIntegrityMonitoring", "isEnabled": true}
      ]
    }
  }'
```

## Task 2: Enable Defender for Storage and Databases

Configure protection for data-tier resources.

```bash
# Enable Defender for Storage (per-transaction pricing)
# Note: --subplan parameter may not be supported in all CLI versions; REST API approach is more reliable
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/pricings/StorageAccounts?api-version=2024-01-01" \
  --body '{"properties":{"pricingTier":"Standard","subPlan":"PerStorageAccount"}}'

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

## Task 3: Deploy a VM and configure Just-In-Time access

Create a VM and enable JIT access to restrict management port exposure.

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

## Task 4: Request JIT access

Simulate requesting just-in-time access to the VM.

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

## Task 5: Configure adaptive application controls

Set up adaptive application controls to whitelist approved processes.

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

## Task 6: Configure file integrity monitoring

Enable FIM to detect changes to critical system files.

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

## Break & Fix

### Scenario 1: JIT request fails with "Policy not found"

A team member tries to request JIT access but gets an error saying the JIT policy does not exist for the VM.

<details>
<summary>Show solution</summary>

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

### Scenario 2: Defender for Storage alerts not triggering

Defender for Storage is enabled but no alerts are generated when suspicious access patterns occur.

<details>
<summary>Show solution</summary>

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

### Scenario 3: VM not appearing in adaptive application control recommendations

A production VM has been running for 3 weeks but doesn't appear in the adaptive application control recommendations.

<details>
<summary>Show solution</summary>

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

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the maximum duration that JIT VM access can be granted for a single request?",
    options: [
      "1 hour",
      "3 hours",
      "24 hours",
      "It depends on the maxRequestAccessDuration configured in the policy"
    ],
    correctIndex: 3,
    explanation: "The maximum duration is configured per-port in the JIT policy via the maxRequestAccessDuration field (in ISO 8601 duration format). Each request cannot exceed this configured maximum."
  },
  {
    question: "Which Defender for Servers plan includes agentless vulnerability scanning and file integrity monitoring?",
    options: [
      "Defender for Servers Free tier",
      "Defender for Servers Plan 1 (P1)",
      "Defender for Servers Plan 2 (P2)",
      "Both P1 and P2 include all features"
    ],
    correctIndex: 2,
    explanation: "Defender for Servers Plan 2 (P2) includes all P1 features plus agentless VM scanning, file integrity monitoring, adaptive application controls, and free data ingestion (500 MB/day) for specific security data types."
  },
  {
    question: "What does Defender for Storage's malware scanning capability do when malware is detected in an uploaded blob?",
    options: [
      "Automatically deletes the blob",
      "Generates a security alert and can trigger an Event Grid event for automation",
      "Quarantines the blob and notifies the uploader",
      "Blocks all access to the storage account"
    ],
    correctIndex: 1,
    explanation: "When malware is detected, Defender for Storage generates a security alert and publishes an Event Grid event. The blob is NOT automatically deleted or quarantined—organizations must configure their own response via Logic Apps or Functions triggered by the Event Grid event."
  },
  {
    question: "How does adaptive application control differ from traditional application whitelisting?",
    options: [
      "It uses machine learning to recommend which applications should be allowed based on observed behavior",
      "It only works on Windows servers",
      "It blocks all applications by default without any learning period",
      "It requires manual configuration of every allowed process"
    ],
    correctIndex: 0,
    explanation: "Adaptive application controls use machine learning to analyze running processes over time and recommend application allowlists based on observed behavior. This reduces the manual effort of traditional whitelisting while adapting to the specific workload."
  }
]} />

## Cleanup

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
