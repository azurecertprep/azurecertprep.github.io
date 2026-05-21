---
sidebar_position: 6
title: "Challenge 06: Managed Identities for Azure Resources"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 06: Managed Identities for Azure Resources

## Exam skills covered

- Implement managed identities for Azure resources
- Choose between system-assigned and user-assigned managed identities
- Configure managed identity permissions using RBAC
- Use managed identities to access Azure services securely
- Implement managed identity federation for external workloads
- Troubleshoot managed identity authentication issues

## Scenario

Contoso Ltd's development team has been storing connection strings and service account credentials in application configuration files and environment variables. A recent security audit revealed hard-coded credentials in source control and shared secrets across multiple applications. The security architect must implement managed identities to eliminate credential management overhead, establish secure service-to-service communication, and configure workload identity federation for CI/CD pipelines running in GitHub Actions.

---

## Prerequisites

- Azure subscription with Contributor access
- Azure CLI installed and authenticated
- An existing resource group or ability to create one
- Basic understanding of Azure RBAC

---

## Task 1: Create resources with system-assigned managed identity

Deploy an Azure App Service and Azure Function with system-assigned managed identities enabled.

```bash
# Set variables
RG_NAME="rg-contoso-managed-identity-lab"
LOCATION="eastus2"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create an App Service plan
az appservice plan create \
  --name "asp-contoso-lab" \
  --resource-group $RG_NAME \
  --sku B1 \
  --is-linux

# Create a Web App with system-assigned managed identity
az webapp create \
  --name "app-contoso-api-$(openssl rand -hex 4)" \
  --resource-group $RG_NAME \
  --plan "asp-contoso-lab" \
  --runtime "DOTNET|8.0" \
  --assign-identity "[system]"

# Get the web app name and identity
WEB_APP_NAME=$(az webapp list --resource-group $RG_NAME --query "[0].name" -o tsv)
WEBAPP_IDENTITY=$(az webapp identity show \
  --name $WEB_APP_NAME \
  --resource-group $RG_NAME \
  --query principalId -o tsv)

echo "Web App System Identity: $WEBAPP_IDENTITY"

# Create an Azure Function App with system-assigned managed identity
STORAGE_NAME="stcontosolab$(openssl rand -hex 4)"
az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --sku Standard_LRS

az functionapp create \
  --name "func-contoso-processor-$(openssl rand -hex 4)" \
  --resource-group $RG_NAME \
  --storage-account $STORAGE_NAME \
  --consumption-plan-location $LOCATION \
  --runtime dotnet-isolated \
  --functions-version 4 \
  --assign-identity "[system]"

FUNC_APP_NAME=$(az functionapp list --resource-group $RG_NAME --query "[0].name" -o tsv)
FUNC_IDENTITY=$(az functionapp identity show \
  --name $FUNC_APP_NAME \
  --resource-group $RG_NAME \
  --query principalId -o tsv)

echo "Function App System Identity: $FUNC_IDENTITY"
```

## Task 2: Create and assign user-assigned managed identities

Create user-assigned managed identities for shared access patterns across multiple resources.

```bash
# Create a user-assigned managed identity for shared database access
az identity create \
  --name "id-contoso-db-reader" \
  --resource-group $RG_NAME \
  --location $LOCATION

# Create another identity for blob storage access
az identity create \
  --name "id-contoso-storage-writer" \
  --resource-group $RG_NAME \
  --location $LOCATION

# Get identity resource IDs
DB_IDENTITY_ID=$(az identity show \
  --name "id-contoso-db-reader" \
  --resource-group $RG_NAME \
  --query id -o tsv)

STORAGE_IDENTITY_ID=$(az identity show \
  --name "id-contoso-storage-writer" \
  --resource-group $RG_NAME \
  --query id -o tsv)

DB_IDENTITY_CLIENT_ID=$(az identity show \
  --name "id-contoso-db-reader" \
  --resource-group $RG_NAME \
  --query clientId -o tsv)

DB_IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name "id-contoso-db-reader" \
  --resource-group $RG_NAME \
  --query principalId -o tsv)

# Assign user-assigned identity to the Web App
az webapp identity assign \
  --name $WEB_APP_NAME \
  --resource-group $RG_NAME \
  --identities $DB_IDENTITY_ID $STORAGE_IDENTITY_ID

# Assign user-assigned identity to the Function App
az functionapp identity assign \
  --name $FUNC_APP_NAME \
  --resource-group $RG_NAME \
  --identities $DB_IDENTITY_ID

# Verify all identities assigned to the web app
az webapp identity show --name $WEB_APP_NAME --resource-group $RG_NAME
```

## Task 3: Grant managed identities access to Azure resources

Assign RBAC roles to managed identities for accessing Key Vault, Storage, and SQL Database.

```bash
# Create a Key Vault
KV_NAME="kv-contoso-lab-$(openssl rand -hex 4)"
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --enable-rbac-authorization true

# Grant the web app's system identity access to Key Vault secrets
az role assignment create \
  --assignee-object-id $WEBAPP_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope $(az keyvault show --name $KV_NAME --query id -o tsv)

# Grant the user-assigned storage identity access to Blob Storage
STORAGE_IDENTITY_PRINCIPAL=$(az identity show \
  --name "id-contoso-storage-writer" \
  --resource-group $RG_NAME \
  --query principalId -o tsv)

az role assignment create \
  --assignee-object-id $STORAGE_IDENTITY_PRINCIPAL \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope $(az storage account show --name $STORAGE_NAME --query id -o tsv)

# Grant the function app's system identity access to read storage queues
az role assignment create \
  --assignee-object-id $FUNC_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Queue Data Reader" \
  --scope $(az storage account show --name $STORAGE_NAME --query id -o tsv)

# Grant the DB reader identity access to SQL (using Graph API for Entra auth)
# This would be done on the SQL Database itself:
# CREATE USER [id-contoso-db-reader] FROM EXTERNAL PROVIDER;
# ALTER ROLE db_datareader ADD MEMBER [id-contoso-db-reader];

# List all role assignments for our identities
az role assignment list --assignee $WEBAPP_IDENTITY --all -o table
az role assignment list --assignee $STORAGE_IDENTITY_PRINCIPAL --all -o table
```

## Task 4: Configure App Service to use managed identity for Key Vault references

Use Key Vault references in App Service configuration to securely access secrets without code changes.

```bash
# Add a secret to Key Vault
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "DatabaseConnectionString" \
  --value "Server=tcp:contoso-sql.database.windows.net;Database=ContosoDb;Authentication=Active Directory Managed Identity;"

az keyvault secret set \
  --vault-name $KV_NAME \
  --name "ApiKey" \
  --value "sk-contoso-api-key-12345"

# Configure the Web App to use Key Vault references
az webapp config appsettings set \
  --name $WEB_APP_NAME \
  --resource-group $RG_NAME \
  --settings \
    "DatabaseConnection=@Microsoft.KeyVault(VaultName=$KV_NAME;SecretName=DatabaseConnectionString)" \
    "ApiKey=@Microsoft.KeyVault(VaultName=$KV_NAME;SecretName=ApiKey)"

# Verify the Key Vault reference resolution
az webapp config appsettings list \
  --name $WEB_APP_NAME \
  --resource-group $RG_NAME \
  --query "[?contains(value,'Microsoft.KeyVault')].{name:name, value:value}" -o table

# Check Key Vault reference status
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG_NAME/providers/Microsoft.Web/sites/$WEB_APP_NAME/config/configreferences/appsettings?api-version=2022-03-01" \
  --headers "Content-Type=application/json"
```

## Task 5: Configure workload identity federation for GitHub Actions

Set up federated identity credentials to allow GitHub Actions to authenticate as an Azure managed identity without secrets.

```bash
# Create a user-assigned identity for the CI/CD pipeline
az identity create \
  --name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --location $LOCATION

GITHUB_IDENTITY_ID=$(az identity show \
  --name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --query id -o tsv)

GITHUB_IDENTITY_CLIENT_ID=$(az identity show \
  --name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --query clientId -o tsv)

GITHUB_IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --query principalId -o tsv)

# Create federated credential for GitHub Actions (main branch)
az identity federated-credential create \
  --name "github-actions-main" \
  --identity-name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:contoso/contoso-app:ref:refs/heads/main" \
  --audiences "api://AzureADTokenExchange"

# Create federated credential for pull requests
az identity federated-credential create \
  --name "github-actions-pr" \
  --identity-name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:contoso/contoso-app:pull_request" \
  --audiences "api://AzureADTokenExchange"

# Create federated credential for a specific environment
az identity federated-credential create \
  --name "github-actions-production" \
  --identity-name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:contoso/contoso-app:environment:production" \
  --audiences "api://AzureADTokenExchange"

# Grant the deployment identity Contributor access to the resource group
az role assignment create \
  --assignee-object-id $GITHUB_IDENTITY_PRINCIPAL_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG_NAME"

# List federated credentials
az identity federated-credential list \
  --identity-name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --query "[].{name:name, issuer:issuer, subject:subject}" -o table
```

## Task 6: Test managed identity access and verify token acquisition

Validate that managed identities can successfully acquire tokens and access resources.

```bash
# Test token acquisition from within the App Service (via Kudu console)
# This simulates what the app code does internally
# The IDENTITY_ENDPOINT and IDENTITY_HEADER are set automatically

# Verify the web app's identity configuration
az webapp show --name $WEB_APP_NAME --resource-group $RG_NAME \
  --query "identity.{type:type, systemPrincipalId:principalId, userAssigned:userAssignedIdentities}" -o json

# Verify role assignments are effective
az role assignment list \
  --assignee $WEBAPP_IDENTITY \
  --all \
  --query "[].{role:roleDefinitionName, scope:scope}" -o table

# Test Key Vault access with the managed identity (simulating from local dev)
# In production, the app uses DefaultAzureCredential which auto-detects managed identity
az keyvault secret show \
  --vault-name $KV_NAME \
  --name "DatabaseConnectionString" \
  --query "value" -o tsv

# Verify storage access
az storage blob list \
  --account-name $STORAGE_NAME \
  --container-name "test" \
  --auth-mode login 2>/dev/null || echo "Container not created yet - identity permissions verified via RBAC"

# Check for any identity-related issues in App Service logs
az webapp log show --name $WEB_APP_NAME --resource-group $RG_NAME --only-show-errors
```

---

## Break & Fix

### Scenario 1: Key Vault reference returns "SecretNotFound" in App Service

The web application shows Key Vault reference errors in the app settings status. The managed identity has been configured but secrets cannot be resolved.

<details>
<summary>Show solution</summary>

```bash
# Check Key Vault reference status
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG_NAME/providers/Microsoft.Web/sites/$WEB_APP_NAME/config/configreferences/appsettings?api-version=2022-03-01"

# Common issues:
# 1. Identity doesn't have the correct RBAC role on Key Vault
az role assignment list \
  --assignee $WEBAPP_IDENTITY \
  --scope $(az keyvault show --name $KV_NAME --query id -o tsv) \
  --query "[].roleDefinitionName" -o tsv

# Fix: Assign Key Vault Secrets User role if missing
az role assignment create \
  --assignee-object-id $WEBAPP_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope $(az keyvault show --name $KV_NAME --query id -o tsv)

# 2. Key Vault might be using access policies instead of RBAC
KV_AUTH_MODE=$(az keyvault show --name $KV_NAME --query "properties.enableRbacAuthorization" -o tsv)
if [ "$KV_AUTH_MODE" != "true" ]; then
  # Add access policy for the identity
  az keyvault set-policy \
    --name $KV_NAME \
    --object-id $WEBAPP_IDENTITY \
    --secret-permissions get list
fi

# 3. Key Vault reference syntax might be wrong
# Correct format: @Microsoft.KeyVault(VaultName=myvault;SecretName=mysecret)
az webapp config appsettings list \
  --name $WEB_APP_NAME \
  --resource-group $RG_NAME \
  --query "[?contains(value,'KeyVault')]"

# 4. Key Vault firewall might be blocking App Service
az keyvault network-rule list --name $KV_NAME
# Add the App Service's outbound IPs or use private endpoint
```

</details>

### Scenario 2: Managed identity token acquisition fails with "identity not found"

A Function App deployed to a new region fails with "ManagedIdentityCredential authentication unavailable. The requested identity has not been assigned to this resource." The same code works in the original region.

<details>
<summary>Show solution</summary>

```bash
# Check if the Function App has identity assigned
az functionapp identity show --name $FUNC_APP_NAME --resource-group $RG_NAME

# If using user-assigned identity, verify it's assigned to THIS function app
az functionapp show --name $FUNC_APP_NAME --resource-group $RG_NAME \
  --query "identity.userAssignedIdentities"

# Common issue: The code specifies a user-assigned identity client ID
# but the identity isn't assigned to the new deployment
# Fix: Assign the user-assigned identity
az functionapp identity assign \
  --name $FUNC_APP_NAME \
  --resource-group $RG_NAME \
  --identities $DB_IDENTITY_ID

# If using DefaultAzureCredential with a specific client ID in config:
# Ensure AZURE_CLIENT_ID environment variable matches the assigned identity
az functionapp config appsettings set \
  --name $FUNC_APP_NAME \
  --resource-group $RG_NAME \
  --settings "AZURE_CLIENT_ID=$DB_IDENTITY_CLIENT_ID"

# Verify the identity is propagated (may take a few minutes)
az functionapp identity show --name $FUNC_APP_NAME --resource-group $RG_NAME \
  --query "{system:principalId, userAssigned:userAssignedIdentities}"

# Restart the function app to pick up identity changes
az functionapp restart --name $FUNC_APP_NAME --resource-group $RG_NAME
```

</details>

### Scenario 3: Workload identity federation returns "AADSTS700024: Client assertion is not within its valid time range"

GitHub Actions workflow using workload identity federation fails during the Azure login step with a token time validation error.

<details>
<summary>Show solution</summary>

```bash
# This error typically occurs when:
# 1. The federated credential subject doesn't match the token's claims
# 2. Clock skew between GitHub and Azure AD

# Verify the federated credential configuration
az identity federated-credential list \
  --identity-name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --query "[].{name:name, subject:subject, issuer:issuer}" -o table

# Check if the subject matches the workflow context
# For a push to main: "repo:contoso/contoso-app:ref:refs/heads/main"
# For a pull request: "repo:contoso/contoso-app:pull_request"
# For an environment: "repo:contoso/contoso-app:environment:production"

# Common fix: The subject claim doesn't match
# If the workflow runs on a tag, it needs a different credential:
az identity federated-credential create \
  --name "github-actions-tags" \
  --identity-name "id-contoso-github-deploy" \
  --resource-group $RG_NAME \
  --issuer "https://token.actions.githubusercontent.com" \
  # Note: Wildcards not supported. Create one credential per tag, or use environment-based subjects.
  --subject "repo:contoso/contoso-app:ref:refs/tags/v1.0.0" \
  --audiences "api://AzureADTokenExchange"

# Verify the GitHub Actions workflow YAML uses correct parameters:
# - uses: azure/login@v2
#   with:
#     client-id: ${{ secrets.AZURE_CLIENT_ID }}
#     tenant-id: ${{ secrets.AZURE_TENANT_ID }}
#     subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

# Ensure the client-id matches the managed identity's client ID
echo "Client ID for GitHub secrets: $GITHUB_IDENTITY_CLIENT_ID"
echo "Tenant ID: $(az account show --query tenantId -o tsv)"
echo "Subscription ID: $(az account show --query id -o tsv)"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "A web application needs to access both Azure Key Vault and Azure SQL Database. Three separate App Services need the same database access. What is the recommended managed identity approach?",
    options: [
      "Use system-assigned managed identity on each App Service with individual RBAC assignments",
      "Use a single user-assigned managed identity for database access shared across all three App Services",
      "Create a service principal with a client secret for shared access",
      "Use a single system-assigned identity from one App Service shared with the others"
    ],
    correctIndex: 1,
    explanation: "User-assigned managed identities are ideal for shared access patterns. A single user-assigned identity can be assigned to multiple resources, maintaining consistent permissions and simplifying management. System-assigned identities are tied to a single resource lifecycle and cannot be shared."
  },
  {
    question: "What happens to a system-assigned managed identity when the associated Azure resource is deleted?",
    options: [
      "The identity persists and can be reassigned to another resource",
      "The identity is automatically deleted along with all its role assignments",
      "The identity is moved to a 'soft-deleted' state for 30 days",
      "The identity remains but its role assignments are removed"
    ],
    correctIndex: 1,
    explanation: "System-assigned managed identities have the same lifecycle as the resource they're attached to. When the resource is deleted, the identity is automatically deleted and all associated role assignments are removed. This is a key difference from user-assigned identities, which persist independently."
  },
  {
    question: "Contoso's CI/CD pipeline in GitHub Actions needs to deploy to Azure without storing secrets. Which feature should they use?",
    options: [
      "Store Azure credentials as GitHub encrypted secrets",
      "Use workload identity federation with a federated credential on a user-assigned managed identity",
      "Create a long-lived service principal with certificate authentication",
      "Use Azure DevOps service connections with automatic rotation"
    ],
    correctIndex: 1,
    explanation: "Workload identity federation allows external identity providers (like GitHub Actions) to exchange their tokens for Azure AD tokens without any stored credentials. A federated credential on a user-assigned managed identity trusts tokens from GitHub's OIDC provider for specific repositories and branches."
  },
  {
    question: "An App Service uses Key Vault references in app settings but some references show 'SecretNotFound'. The managed identity exists and has the 'Reader' role on the Key Vault. What is wrong?",
    options: [
      "The App Service needs to be restarted",
      "Key Vault references require HTTPS endpoint configuration",
      "The 'Reader' role only provides metadata access; the identity needs 'Key Vault Secrets User' role",
      "The Key Vault must be in the same region as the App Service"
    ],
    correctIndex: 2,
    explanation: "The 'Reader' RBAC role provides access to Key Vault metadata (resource properties) but not to the data plane (secrets, keys, certificates). To read secrets via Key Vault references, the managed identity needs the 'Key Vault Secrets User' role which grants data plane read access to secrets."
  }
]} />

## Cleanup

```bash
# Delete the entire resource group (removes all resources)
az group delete --name $RG_NAME --yes --no-wait

# If you need to clean up individual resources:
# az webapp delete --name $WEB_APP_NAME --resource-group $RG_NAME
# az functionapp delete --name $FUNC_APP_NAME --resource-group $RG_NAME
# az keyvault delete --name $KV_NAME
# az keyvault purge --name $KV_NAME  # If soft-delete is enabled
# az identity delete --name "id-contoso-db-reader" --resource-group $RG_NAME
# az identity delete --name "id-contoso-storage-writer" --resource-group $RG_NAME
# az identity delete --name "id-contoso-github-deploy" --resource-group $RG_NAME
# az storage account delete --name $STORAGE_NAME --resource-group $RG_NAME --yes
```
