---
sidebar_position: 1
title: "Challenge 39: Authentication and identity for DevOps"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 39: Authentication and identity for DevOps

## Exam skills covered

- Choose between Microsoft Entra service principals and managed identities (system-assigned and user-assigned)
- Implement and manage secrets, keys, and certificates by using Azure Key Vault
- Implement secretless authentication (workload identity federation/OIDC)

## Scenario

Contoso Ltd operates 40 microservices deployed through Azure Pipelines and GitHub Actions. The platform team recently discovered that 12 pipelines authenticate to Azure using a shared service principal whose secret is stored as a plain-text pipeline variable visible to all contributors. Three teams independently created their own service principals with Contributor access to the entire production subscription. The security audit also revealed that secrets are rotated manually (last rotation was 14 months ago). You must migrate Contoso to modern identity patterns that eliminate stored secrets where possible and enforce least-privilege access.

## Prerequisites

- Azure subscription with Owner or User Access Administrator role
- Azure CLI 2.50+ installed
- GitHub account with a repository for testing
- Azure DevOps organization with a project

## Tasks

### Task 1: Create a service principal for pipeline authentication

Create a service principal with a client secret, scoped to a specific resource group.

```bash
# Create a resource group for the challenge
az group create --name rg-contoso-challenge39 --location eastus

# Create a service principal scoped to the resource group
az ad sp create-for-rbac \
  --name "sp-contoso-pipeline-dev" \
  --role "Contributor" \
  --scopes "/subscriptions/<subscription-id>/resourceGroups/rg-contoso-challenge39" \
  --years 1
```

Record the output (appId, password, tenant). This demonstrates the traditional approach with a client secret.

```bash
# Verify the service principal can authenticate
az login --service-principal \
  --username <appId> \
  --password <password> \
  --tenant <tenantId>

# Confirm access scope
az group show --name rg-contoso-challenge39
```

### Task 2: Create a user-assigned managed identity

Create a managed identity that can be shared across multiple Azure resources without managing secrets.

```bash
# Create a user-assigned managed identity
az identity create \
  --name id-contoso-pipeline \
  --resource-group rg-contoso-challenge39 \
  --location eastus

# Get the principal ID and client ID
IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name id-contoso-pipeline \
  --resource-group rg-contoso-challenge39 \
  --query principalId -o tsv)

IDENTITY_CLIENT_ID=$(az identity show \
  --name id-contoso-pipeline \
  --resource-group rg-contoso-challenge39 \
  --query clientId -o tsv)

# Assign a role to the managed identity
az role assignment create \
  --assignee-object-id $IDENTITY_PRINCIPAL_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/rg-contoso-challenge39"
```

### Task 3: Implement workload identity federation for GitHub Actions

Configure OIDC-based authentication so GitHub Actions can authenticate to Azure without storing secrets.

```bash
# Create an app registration for GitHub Actions
az ad app create --display-name "sp-contoso-github-oidc"

APP_ID=$(az ad app list --display-name "sp-contoso-github-oidc" --query "[0].appId" -o tsv)
OBJECT_ID=$(az ad app list --display-name "sp-contoso-github-oidc" --query "[0].id" -o tsv)

# Create a service principal from the app registration
az ad sp create --id $APP_ID

# Add federated credential for the main branch
az ad app federated-credential create \
  --id $OBJECT_ID \
  --parameters '{
    "name": "github-main-branch",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/webapp:ref:refs/heads/main",
    "description": "GitHub Actions main branch",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Add federated credential for the production environment
az ad app federated-credential create \
  --id $OBJECT_ID \
  --parameters '{
    "name": "github-production-env",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/webapp:environment:production",
    "description": "GitHub Actions production environment",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Assign role to the service principal
az role assignment create \
  --assignee $APP_ID \
  --role "Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/rg-contoso-challenge39"
```

Create the GitHub Actions workflow using OIDC:

```yaml
# .github/workflows/deploy.yml
name: Deploy with OIDC
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

      - name: Azure Login with OIDC
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy resources
        run: |
          az group show --name rg-contoso-challenge39
```

### Task 4: Implement workload identity federation for Azure Pipelines

Configure workload identity federation for Azure DevOps service connections.

```bash
# Create federated credential for Azure DevOps
az ad app federated-credential create \
  --id $OBJECT_ID \
  --parameters '{
    "name": "azdo-contoso-project",
    "issuer": "https://vstoken.dev.azure.com/<org-id>",
    "subject": "sc://contoso-org/contoso-project/azure-production",
    "description": "Azure DevOps service connection",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

In Azure DevOps, create a service connection:

1. Project Settings > Service connections > New service connection
2. Select "Azure Resource Manager"
3. Select "Workload Identity federation (manual)"
4. Enter the Issuer URL, Service Principal Client ID, and Tenant ID
5. Name the connection `azure-production`

Pipeline YAML using the federated connection:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: AzureCLI@2
    inputs:
      azureSubscription: 'azure-production'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        az group show --name rg-contoso-challenge39
```

### Task 5: Compare authentication methods (decision table)

| Criteria | Service principal + secret | Managed identity | Workload identity federation |
|----------|---------------------------|------------------|------------------------------|
| Secret management | Requires storing and rotating secrets | No secrets to manage | No secrets to manage |
| Rotation needed | Yes (expiry 1-2 years) | No | No (token exchange) |
| Works from | Anywhere | Azure-hosted resources only | GitHub Actions, Azure Pipelines, external OIDC providers |
| Scope control | Custom RBAC | Custom RBAC | Custom RBAC |
| Audit trail | Sign-in logs | Sign-in logs | Sign-in logs with federated claims |
| Best for | Legacy systems, on-premises agents | Azure-hosted compute (VMs, App Service, AKS) | CI/CD pipelines (GitHub, ADO) |
| Risk if compromised | Secret can be used from anywhere until rotated | Cannot be used outside assigned resource | Token valid only for specific repo/branch/environment |

### Task 6: Configure federated credentials for specific repos, branches, and environments

```bash
# Federated credential for pull requests
az ad app federated-credential create \
  --id $OBJECT_ID \
  --parameters '{
    "name": "github-pull-request",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/webapp:pull_request",
    "description": "GitHub Actions pull requests",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Federated credential for a specific tag pattern
az ad app federated-credential create \
  --id $OBJECT_ID \
  --parameters '{
    "name": "github-release-tags",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/webapp:ref:refs/tags/v1.0.0",
    "description": "GitHub Actions release tag v1.0.0 (one credential per tag needed - wildcards not supported)",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# List all federated credentials
az ad app federated-credential list --id $OBJECT_ID
```

## Break and fix

### Break scenario 1: Federated credential subject mismatch

A developer reports that the GitHub Actions workflow fails with "AADSTS70021: No matching federated identity record found."

**Cause:** The `subject` claim in the federated credential does not match the token issued by GitHub. Common causes include wrong repository name, wrong branch, or missing environment configuration in the workflow.

**Diagnosis:**

```bash
# List federated credentials to check subjects
az ad app federated-credential list --id $OBJECT_ID --query "[].{name:name, subject:subject}"
```


<details>
<summary>Show solution</summary>

**Fix:** Verify the workflow trigger matches the federated credential subject. If the workflow runs on `refs/heads/develop` but the credential specifies `refs/heads/main`, add a new credential:

```bash
az ad app federated-credential create \
  --id $OBJECT_ID \
  --parameters '{
    "name": "github-develop-branch",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/webapp:ref:refs/heads/develop",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

</details>

### Break scenario 2: Managed identity has no role assignment

An application using a managed identity returns "AuthorizationFailed" when trying to access a storage account.

**Diagnosis:**

```bash
# Check role assignments for the managed identity
az role assignment list --assignee $IDENTITY_PRINCIPAL_ID --all
```


<details>
<summary>Show solution</summary>

**Fix:**

```bash
az role assignment create \
  --assignee-object-id $IDENTITY_PRINCIPAL_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/rg-contoso-challenge39"
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Which authentication method should you recommend for a pipeline running on a self-hosted Azure DevOps agent hosted on an Azure VM that needs to deploy to Azure resources?",
    options: [
      "Service principal with client secret stored in pipeline variables",
      "User-assigned managed identity assigned to the VM",
      "Personal access token",
      "SSH key pair"
    ],
    correctIndex: 1,
    explanation: "A user-assigned managed identity eliminates the need to store and rotate secrets. Since the agent runs on an Azure VM, managed identity is available and is the most secure option. Service principals with secrets require rotation and risk exposure. PATs and SSH keys are for different authentication scenarios."
  },
  {
    question: "A GitHub Actions workflow uses workload identity federation but fails with \"AADSTS700024: Client assertion is not within its valid time range.\" What is the most likely cause?",
    options: [
      "The federated credential has expired",
      "The system clock on the GitHub runner is significantly skewed",
      "The GitHub token has been revoked",
      "The Azure subscription has been suspended"
    ],
    correctIndex: 1,
    explanation: "This error indicates a time validation failure in the token exchange. While GitHub-hosted runners rarely have clock skew, this error points to timing issues in the OIDC token validation. Federated credentials do not have their own expiry separate from the app registration."
  },
  {
    question: "When configuring workload identity federation for Azure Pipelines, what format should the 'subject' claim use?",
    options: [
      "'repo:org/repo:ref:refs/heads/main'",
      "'sc://organization/project/service-connection-name'",
      "'pipeline://organization/project/pipeline-id'",
      "'ado://organization/project/environment'"
    ],
    correctIndex: 1,
    explanation: "Azure DevOps uses the format sc://organization/project/service-connection-name for the subject claim in federated credentials. The repo: format is used by GitHub Actions. Azure Pipelines identifies itself through the service connection name."
  },
  {
    question: "Contoso has three environments (dev, staging, production) and wants a single app registration with federated credentials that limit which GitHub branch can deploy to each environment. What is the correct approach?",
    options: [
      "Create three app registrations, one per environment",
      "Create three federated credentials on the same app registration with different subject claims targeting different environments",
      "Use a single federated credential with a wildcard subject",
      "Create three managed identities"
    ],
    correctIndex: 1,
    explanation: "You can add multiple federated credentials to a single app registration, each with a different subject claim (for example, repo:org/repo:environment:production and repo:org/repo:environment:staging). This maintains a single identity while restricting which workflow context can obtain tokens for each environment. Wildcard subjects are not supported."
  }
]} />

## Cleanup

```bash
# Delete the resource group
az group delete --name rg-contoso-challenge39 --yes --no-wait

# Delete the service principal
az ad sp delete --id $(az ad sp list --display-name "sp-contoso-pipeline-dev" --query "[0].id" -o tsv)

# Delete the app registration and its federated credentials
az ad app delete --id $OBJECT_ID

# Delete the managed identity (deleted with resource group)
az identity delete --name id-contoso-pipeline --resource-group rg-contoso-challenge39
```
