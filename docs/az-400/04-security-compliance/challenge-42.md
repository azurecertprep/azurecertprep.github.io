---
sidebar_position: 4
title: "Challenge 42: Secrets management"
---

# Challenge 42: Secrets management

## Exam skills covered

- Implement and manage secrets, keys, and certificates by using Azure Key Vault
- Implement secretless authentication (workload identity federation/OIDC)

## Scenario

Contoso Ltd stores database connection strings and API keys directly in Azure Pipelines and GitHub Actions as plain-text pipeline variables. A recent security audit found that 34 secrets are accessible to all 150 contributors across 12 repositories. Three API keys were found in pipeline logs due to accidental echo statements. You must implement centralized secrets management using Azure Key Vault and eliminate stored secrets where possible using workload identity federation.

## Prerequisites

- Azure subscription with Contributor access
- Azure CLI installed
- GitHub repository and Azure DevOps project
- An existing web application (App Service) for testing

## Tasks

### Task 1: Create Azure Key Vault and store secrets

```bash
# Create resource group
az group create --name rg-contoso-secrets --location eastus

# Create Key Vault with RBAC authorization (recommended over access policies)
az keyvault create \
  --name kv-contoso-secrets-001 \
  --resource-group rg-contoso-secrets \
  --location eastus \
  --enable-rbac-authorization true \
  --sku standard

# Assign yourself the Key Vault Secrets Officer role
USER_ID=$(az ad signed-in-user show --query id -o tsv)

az role assignment create \
  --assignee $USER_ID \
  --role "Key Vault Secrets Officer" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001"

# Store secrets
az keyvault secret set \
  --vault-name kv-contoso-secrets-001 \
  --name "SqlConnectionString" \
  --value "Server=tcp:sql-contoso.database.windows.net,1433;Database=ContosoDb;User ID=appuser;Password=SecureP@ss123;Encrypt=true"

az keyvault secret set \
  --vault-name kv-contoso-secrets-001 \
  --name "ApiKey-PaymentGateway" \
  --value "pk_live_abc123def456ghi789"

az keyvault secret set \
  --vault-name kv-contoso-secrets-001 \
  --name "StorageAccountKey" \
  --value "DefaultEndpointsProtocol=https;AccountName=stcontoso;AccountKey=base64encodedkey=="

# Set expiration on secrets
az keyvault secret set-attributes \
  --vault-name kv-contoso-secrets-001 \
  --name "ApiKey-PaymentGateway" \
  --expires "2025-12-31T23:59:59Z"

# List all secrets with their expiration status
az keyvault secret list \
  --vault-name kv-contoso-secrets-001 \
  --query "[].{name:name, expires:attributes.expires, enabled:attributes.enabled}" -o table
```

### Task 2: Integrate Key Vault with GitHub Actions

```yaml
# .github/workflows/deploy-with-keyvault.yml
name: Deploy with Key Vault secrets
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Get secrets from Key Vault
        uses: Azure/get-keyvault-secrets@v1
        with:
          keyvault: kv-contoso-secrets-001
          secrets: 'SqlConnectionString, ApiKey-PaymentGateway'
        id: keyvault

      - name: Deploy with secrets (automatically masked in logs)
        run: |
          az webapp config appsettings set \
            --name app-contoso-web \
            --resource-group rg-contoso-secrets \
            --settings \
              "ConnectionStrings__Default=${{ steps.keyvault.outputs.SqlConnectionString }}" \
              "PaymentGateway__ApiKey=${{ steps.keyvault.outputs.ApiKey-PaymentGateway }}"
```

Alternative using Azure CLI directly:

```yaml
      - name: Get secret via Azure CLI
        id: get-secret
        run: |
          SECRET=$(az keyvault secret show \
            --vault-name kv-contoso-secrets-001 \
            --name SqlConnectionString \
            --query value -o tsv)
          echo "::add-mask::$SECRET"
          echo "sql-connection=$SECRET" >> $GITHUB_OUTPUT

      - name: Use secret in deployment
        run: |
          az webapp config connection-string set \
            --name app-contoso-web \
            --resource-group rg-contoso-secrets \
            --connection-string-type SQLAzure \
            --settings Default='${{ steps.get-secret.outputs.sql-connection }}'
```

### Task 3: Integrate Key Vault with Azure Pipelines

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: AzureKeyVault@2
    inputs:
      azureSubscription: 'Azure-Prod-Federated'
      KeyVaultName: 'kv-contoso-secrets-001'
      SecretsFilter: 'SqlConnectionString,ApiKey-PaymentGateway,StorageAccountKey'
      RunAsPreJob: true
    displayName: 'Fetch secrets from Key Vault'

  - script: |
      echo "Deploying application..."
      echo "Connection string length: ${#SQLCONNECTIONSTRING}"
    displayName: 'Verify secrets loaded (length only, value is masked)'
    env:
      SQLCONNECTIONSTRING: $(SqlConnectionString)

  - task: AzureWebApp@1
    inputs:
      azureSubscription: 'Azure-Prod-Federated'
      appType: 'webApp'
      appName: 'app-contoso-web'
      appSettings: |
        -ConnectionStrings__Default "$(SqlConnectionString)"
        -PaymentGateway__ApiKey "$(ApiKey-PaymentGateway)"
```

### Task 4: Variable groups linked to Key Vault

Create a variable group that dynamically pulls from Key Vault at pipeline runtime:

1. Navigate to Pipelines > Library > + Variable group
2. Name: "KeyVault-Production-Secrets"
3. Link secrets from an Azure key vault: enabled
4. Azure subscription: Azure-Prod-Federated
5. Key vault name: kv-contoso-secrets-001
6. Select secrets to link: SqlConnectionString, ApiKey-PaymentGateway

Use the variable group in a pipeline:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

variables:
  - group: KeyVault-Production-Secrets

pool:
  vmImage: 'ubuntu-latest'

steps:
  - script: |
      echo "Secrets from variable group are automatically masked in logs"
      echo "$(SqlConnectionString)"
    displayName: 'Demonstrate auto-masking'

  - task: AzureCLI@2
    inputs:
      azureSubscription: 'Azure-Prod-Federated'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        az webapp config appsettings set \
          --name app-contoso-web \
          --resource-group rg-contoso-secrets \
          --settings "DB_CONNECTION=$(SqlConnectionString)"
```

### Task 5: Implement OIDC/workload identity federation (secretless pattern)

Eliminate stored secrets entirely by using managed identity for app-to-service communication.

```bash
# Enable system-assigned managed identity on the App Service
az webapp identity assign \
  --name app-contoso-web \
  --resource-group rg-contoso-secrets

WEBAPP_IDENTITY=$(az webapp identity show \
  --name app-contoso-web \
  --resource-group rg-contoso-secrets \
  --query principalId -o tsv)

# Grant the App Service identity direct access to SQL Database
# (eliminates the stored connection string with password)
az sql server ad-admin create \
  --server-name sql-contoso \
  --resource-group rg-contoso-secrets \
  --display-name "App Service Identity" \
  --object-id $WEBAPP_IDENTITY

# Grant Key Vault access to the App Service (for runtime secret retrieval)
az role assignment create \
  --assignee-object-id $WEBAPP_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001"

# Configure App Service to use Key Vault references for remaining secrets
az webapp config appsettings set \
  --name app-contoso-web \
  --resource-group rg-contoso-secrets \
  --settings "PaymentGateway__ApiKey=@Microsoft.KeyVault(VaultName=kv-contoso-secrets-001;SecretName=ApiKey-PaymentGateway)"

# Update the connection string to use managed identity (no password)
az webapp config connection-string set \
  --name app-contoso-web \
  --resource-group rg-contoso-secrets \
  --connection-string-type SQLAzure \
  --settings Default="Server=tcp:sql-contoso.database.windows.net,1433;Database=ContosoDb;Authentication=Active Directory Managed Identity;Encrypt=true"
```

### Task 6: Secret rotation automation

Create an Event Grid subscription for secret near-expiry events:

```bash
# Subscribe to Key Vault secret expiry events
az eventgrid event-subscription create \
  --name secret-rotation-sub \
  --source-resource-id "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001" \
  --endpoint-type azurefunction \
  --endpoint "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.Web/sites/func-contoso-rotation/functions/SecretRotation" \
  --included-event-types "Microsoft.KeyVault.SecretNearExpiry"

# Enable Key Vault diagnostic logging to track secret access
az monitor diagnostic-settings create \
  --name kv-diagnostics \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001" \
  --workspace "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.OperationalInsights/workspaces/law-contoso" \
  --logs '[{"category":"AuditEvent","enabled":true}]'
```

### Task 7: Key Vault access policies vs RBAC

| Feature | Access policies | Azure RBAC |
|---------|----------------|------------|
| Granularity | Key, Secret, Certificate operations | Granular data-plane roles |
| Scope | Vault level only | Subscription, RG, vault, or individual secret |
| Management | Per-vault configuration | Centralized with Azure RBAC |
| Conditional access | No | Yes (via Microsoft Entra ID) |
| Audit | Vault diagnostics | Azure Activity Log + vault diagnostics |
| Recommended for | Legacy configurations | New deployments (Microsoft recommended) |

Key Vault RBAC roles:

| Role | Purpose |
|------|---------|
| Key Vault Administrator | Full management of all vault contents |
| Key Vault Secrets Officer | Create, read, update, delete secrets |
| Key Vault Secrets User | Read secret values only |
| Key Vault Certificates Officer | Manage certificates |
| Key Vault Crypto Officer | Manage keys |
| Key Vault Reader | Read metadata only (not secret values) |

```bash
# Grant pipeline identity read-only access to secrets
az role assignment create \
  --assignee <pipeline-sp-id> \
  --role "Key Vault Secrets User" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001"

# Grant security team full vault management
az role assignment create \
  --assignee <security-team-group-id> \
  --role "Key Vault Administrator" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001"
```

## Break and fix

### Break scenario 1: Pipeline returns 403 when reading Key Vault

The AzureKeyVault@2 task fails with "Access denied. Caller was not found on any access policy."

**Cause:** The Key Vault uses RBAC authorization but the service principal only has an access policy assignment (or no RBAC role).

**Diagnosis:**

```bash
# Check authorization mode
az keyvault show --name kv-contoso-secrets-001 \
  --query "properties.enableRbacAuthorization"

# If true, check RBAC role assignments
az role assignment list \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001" \
  --query "[].{principal:principalName, role:roleDefinitionName}" -o table
```

**Fix:**

```bash
az role assignment create \
  --assignee <pipeline-sp-id> \
  --role "Key Vault Secrets User" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001"
```

### Break scenario 2: Key Vault reference shows error in App Service

The application setting using `@Microsoft.KeyVault(...)` syntax shows a red status indicator in the portal.

**Cause:** The App Service managed identity does not have the Key Vault Secrets User role, or the identity is not enabled.

**Diagnosis:**

```bash
# Verify managed identity is enabled
az webapp identity show --name app-contoso-web --resource-group rg-contoso-secrets

# Check role assignments
az role assignment list --assignee $WEBAPP_IDENTITY --all \
  --query "[?contains(scope, 'kv-contoso')]"
```

**Fix:**

```bash
az role assignment create \
  --assignee-object-id $WEBAPP_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-secrets/providers/Microsoft.KeyVault/vaults/kv-contoso-secrets-001"
```

## Knowledge check

1. Contoso wants pipeline secrets to automatically reflect the latest version in Key Vault without pipeline changes. Which approach achieves this for Azure Pipelines?

   A) Store secrets as pipeline variables and manually update them after each rotation
   B) Use a variable group linked to Azure Key Vault
   C) Use the AzureKeyVault@2 task with specific secret version IDs
   D) Copy secrets to pipeline variables using a script task

   **Answer: B.** A variable group linked to Key Vault dynamically fetches the latest secret version at pipeline runtime. When a secret is rotated in Key Vault, the next pipeline run automatically picks up the new value without configuration changes. The AzureKeyVault@2 task also works but variable groups provide a reusable abstraction across multiple pipelines.

2. An App Service application needs to access Azure SQL Database. What is the most secure authentication approach?

   A) Store the SQL connection string with username and password in Key Vault
   B) Use a system-assigned managed identity with Microsoft Entra authentication to SQL
   C) Use a service principal with a client certificate stored in Key Vault
   D) Use SQL contained database users with passwords rotated monthly

   **Answer: B.** Using a managed identity with Microsoft Entra authentication eliminates all stored credentials. The App Service authenticates using its managed identity token, automatically managed by Azure. No secrets, passwords, or certificates need to be stored or rotated.

3. Which Azure Key Vault RBAC role should be assigned to a CI/CD pipeline that needs to read secret values during deployment but must not create or delete secrets?

   A) Key Vault Administrator
   B) Key Vault Secrets Officer
   C) Key Vault Secrets User
   D) Key Vault Reader

   **Answer: C.** Key Vault Secrets User allows reading secret values (get and list), which is what a pipeline needs. Key Vault Reader only reads metadata without values. Secrets Officer and Administrator provide unnecessary write access.

4. Contoso uses Key Vault references (`@Microsoft.KeyVault(...)`) in App Service settings. What happens when a secret is rotated in Key Vault?

   A) The App Service immediately picks up the new value
   B) The App Service picks up the new value within 24 hours via background refresh
   C) The App Service must be restarted to read the new value
   D) The reference must be updated to specify the new secret version

   **Answer: B.** Key Vault references in App Service are refreshed periodically (approximately every 24 hours). The app does not need a restart, and the reference resolves to the latest version automatically. For immediate refresh, you can trigger a settings update or restart the app.

## Cleanup

```bash
# Delete the Key Vault (enters soft-delete state)
az keyvault delete --name kv-contoso-secrets-001 --resource-group rg-contoso-secrets
az keyvault purge --name kv-contoso-secrets-001 --location eastus

# Delete resource group
az group delete --name rg-contoso-secrets --yes --no-wait

# Remove variable groups in Azure DevOps (Pipelines > Library > delete)
# Clean up GitHub workflow files
rm -f .github/workflows/deploy-with-keyvault.yml
git add -A && git commit -m "cleanup: remove challenge 42 workflows" && git push
```
