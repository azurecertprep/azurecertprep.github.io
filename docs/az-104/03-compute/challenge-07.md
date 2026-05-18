---
sidebar_position: 1
title: "Challenge 07 — ARM Templates & Bicep"
---

# Challenge 07 — ARM Templates & Bicep

:::info Estimated Time & Cost
⏱️ **60 minutes** | 💰 **Free** (templates + storage account only) | 📊 **Exam Weight: 20–25%**
:::

## Scenario

Contoso's CTO has had enough of "it works on my portal" deployments. After a junior admin accidentally deleted a production storage account while clicking through the Azure Portal, the mandate is clear: **everything must be infrastructure as code**. No more portal clicks for provisioning — every resource must be repeatable, version-controlled, and auditable.

Your job is to take Contoso's first critical resource — a storage account — and define it as an ARM template, then modernize it to Bicep.

## Exam Skills Covered

| Skill | Weight |
|-------|--------|
| Interpret an ARM template | High |
| Modify an existing ARM template | High |
| Interpret a Bicep file | High |
| Modify an existing Bicep file | High |
| Deploy resources using ARM templates or Bicep | High |
| Export a deployment as an ARM template | Medium |
| Convert an ARM template to Bicep | Medium |

## Sysadmin ↔ Azure Reference

| Traditional | Azure Equivalent |
|-------------|-----------------|
| PowerShell/Bash provisioning scripts | ARM templates / Bicep files |
| Ansible playbooks | Bicep modules |
| Manual install documentation | Declarative templates (desired state) |
| Shell script parameters | ARM/Bicep parameters |
| Script output / return values | ARM/Bicep outputs |
| Reusable shell functions | Bicep modules / linked templates |

## Tasks

### Task 1 — Examine an ARM Template

Study this ARM template that creates a storage account. Identify the five key sections: `$schema`, `parameters`, `variables`, `resources`, and `outputs`.

Save this as `storage.json`:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storagePrefix": {
      "type": "string",
      "minLength": 3,
      "maxLength": 11,
      "metadata": {
        "description": "Prefix for the storage account name"
      }
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    }
  },
  "variables": {
    "uniqueStorageName": "[concat(parameters('storagePrefix'), uniqueString(resourceGroup().id))]"
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-01-01",
      "name": "[variables('uniqueStorageName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "Standard_LRS"
      },
      "kind": "StorageV2",
      "properties": {
        "supportsHttpsTrafficOnly": true
      }
    }
  ],
  "outputs": {
    "storageEndpoint": {
      "type": "string",
      "value": "[reference(variables('uniqueStorageName')).primaryEndpoints.blob]"
    }
  }
}
```

### Task 2 — Modify the ARM Template

Add a `environment` tag parameter to the template so every deployed resource gets tagged:

```bash
# After modifying storage.json, validate it:
az deployment group validate \
  --resource-group rg-iac-lab \
  --template-file storage.json \
  --parameters storagePrefix=contoso environment=dev
```

<details>
<summary>💡 Hint — Where to add the tag parameter</summary>

Add a new parameter:
```json
"environment": {
  "type": "string",
  "allowedValues": ["dev", "staging", "prod"],
  "defaultValue": "dev"
}
```

Then add a `tags` property to the resource:
```json
"tags": {
  "environment": "[parameters('environment')]"
}
```
</details>

### Task 3 — Deploy the ARM Template

```bash
# Create a resource group for this lab
az group create --name rg-iac-lab --location eastus

# Deploy the ARM template
az deployment group create \
  --resource-group rg-iac-lab \
  --template-file storage.json \
  --parameters storagePrefix=contoso environment=dev \
  --name deploy-storage-v1

# Verify the deployment
az deployment group show \
  --resource-group rg-iac-lab \
  --name deploy-storage-v1 \
  --query "properties.outputs"
```

### Task 4 — Export the Deployment

```bash
# Export the entire resource group as an ARM template
az group export --name rg-iac-lab --output json > exported-template.json

# Review what was exported
cat exported-template.json | python -m json.tool | head -50
```

### Task 5 — Convert ARM to Bicep

```bash
# Install/upgrade Bicep CLI
az bicep install
az bicep version

# Decompile the ARM template to Bicep
az bicep decompile --file storage.json

# This creates storage.bicep — review it
cat storage.bicep
```

### Task 6 — Modify the Bicep File

Add a blob container to the Bicep file:

```bash
# After modifying storage.bicep, build it to verify syntax
az bicep build --file storage.bicep
```

<details>
<summary>💡 Hint — Bicep blob container resource</summary>

```bicep
param storagePrefix string
param location string = resourceGroup().location
param environment string = 'dev'

var uniqueStorageName = '${storagePrefix}${uniqueString(resourceGroup().id)}'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: uniqueStorageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  tags: {
    environment: environment
  }
  properties: {
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'appdata'
  properties: {
    publicAccess: 'None'
  }
}

output storageEndpoint string = storageAccount.properties.primaryEndpoints.blob
output storageName string = storageAccount.name
```
</details>

### Task 7 — Deploy the Bicep File

```bash
# Deploy the Bicep file
az deployment group create \
  --resource-group rg-iac-lab \
  --template-file storage.bicep \
  --parameters storagePrefix=contoso environment=prod \
  --name deploy-storage-v2

# Verify the container was created
STORAGE_NAME=$(az deployment group show \
  --resource-group rg-iac-lab \
  --name deploy-storage-v2 \
  --query "properties.outputs.storageName.value" -o tsv)

az storage container list --account-name $STORAGE_NAME --auth-mode login -o table
```

### Task 8 — Preview Changes with What-If

```bash
# Run a what-if deployment to preview changes without deploying
az deployment group what-if \
  --resource-group rg-iac-lab \
  --template-file storage.bicep \
  --parameters storagePrefix=contoso environment=staging
```

## ✅ Success Criteria

- [ ] ARM template deploys a storage account with tags
- [ ] Exported template matches the deployed resources
- [ ] ARM template successfully converted to Bicep
- [ ] Bicep file deploys a storage account **and** blob container
- [ ] What-if shows expected changes without deploying

## 🔧 Break & Fix Scenarios

### Scenario A — Syntax Error
Deploy this broken template and fix the error:
```bash
# Introduce a typo in the template (e.g., "Standar_LRS" instead of "Standard_LRS")
# Deploy and observe the error message
az deployment group create \
  --resource-group rg-iac-lab \
  --template-file broken-storage.json \
  --parameters storagePrefix=contoso
```

### Scenario B — Missing Required Parameter
```bash
# Deploy without the required storagePrefix parameter
az deployment group create \
  --resource-group rg-iac-lab \
  --template-file storage.json \
  --name deploy-broken
# What error do you get? How does Azure validate parameters?
```

### Scenario C — Complete Mode Deployment
```bash
# WARNING: Complete mode deletes resources not in the template!
az deployment group what-if \
  --resource-group rg-iac-lab \
  --template-file storage.bicep \
  --parameters storagePrefix=contoso environment=dev \
  --mode Complete
# Compare the what-if output between Incremental and Complete modes
```

## 📝 Knowledge Check

**1. What is the key difference between ARM templates and Bicep?**

<details>
<summary>Show Answer</summary>

Bicep is a domain-specific language (DSL) that compiles down to ARM JSON. It offers cleaner syntax, automatic dependency management, and better tooling (VS Code extension). Under the hood, Azure Resource Manager only understands ARM JSON — Bicep is transpiled before deployment.
</details>

**2. What is the difference between Incremental and Complete deployment modes?**

<details>
<summary>Show Answer</summary>

- **Incremental** (default): Adds/updates resources in the template but **leaves existing resources untouched**. Safe for iterative deployments.
- **Complete**: Deploys template resources and **deletes any resources in the resource group not defined in the template**. Dangerous if you have resources not managed by the template.
</details>

**3. What does `az bicep decompile` do?**

<details>
<summary>Show Answer</summary>

It converts an ARM JSON template into a Bicep (.bicep) file. The conversion is best-effort — some constructs may need manual cleanup (warnings are printed). The reverse operation is `az bicep build`, which compiles Bicep to ARM JSON.
</details>

**4. Why use `uniqueString()` in storage account names?**

<details>
<summary>Show Answer</summary>

Storage account names must be globally unique across all of Azure (3–24 chars, lowercase + numbers only). `uniqueString()` generates a deterministic 13-character hash based on the input (e.g., `resourceGroup().id`), ensuring unique but repeatable names per resource group.
</details>

## 🧹 Cleanup

```bash
# Remove all resources created in this challenge
az group delete --name rg-iac-lab --yes --no-wait

# Clean up local files
rm -f storage.json storage.bicep exported-template.json broken-storage.json
```
