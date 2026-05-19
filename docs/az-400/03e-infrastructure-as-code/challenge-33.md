---
sidebar_position: 3
title: "Challenge 33: Azure Deployment Environments"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 33: Azure Deployment Environments

:::info Platform: ADO-first
This challenge focuses on Azure DevOps Pipelines. GitHub Actions equivalents are noted where relevant.
:::

## Exam skills mapped

- Design and implement Azure Deployment Environments for on-demand self-deployment

## Scenario

Contoso Ltd has 40 developers working on a microservices platform. Currently, requesting a dev/test environment involves filing an IT ticket and waiting 3-5 business days for operations to manually provision resources. This bottleneck causes:

- Developers sharing environments, leading to conflicts and broken configurations
- Expensive long-lived environments sitting idle 80% of the time
- Inconsistency between developer environments and production
- Shadow IT: developers provisioning their own resources outside governance controls

The platform engineering team needs to implement self-service environment provisioning where developers can spin up fully configured environments on demand, with guardrails for cost control and compliance.

## Task 1: Create a Dev Center and Project

Set up the Azure Deployment Environments infrastructure:

```bash
# Register required resource providers
az provider register --namespace Microsoft.DevCenter
az provider register --namespace Microsoft.Fidalgo

# Create a resource group for the Dev Center
az group create \
  --name rg-contoso-devcenter \
  --location eastus2

# Create the Dev Center
az devcenter admin devcenter create \
  --name dc-contoso \
  --resource-group rg-contoso-devcenter \
  --location eastus2 \
  --identity-type SystemAssigned

# Create a project within the Dev Center
az devcenter admin project create \
  --name proj-contoso-platform \
  --resource-group rg-contoso-devcenter \
  --dev-center-name dc-contoso \
  --location eastus2 \
  --description "Contoso platform microservices project" \
  --max-dev-boxes-per-user 3

# Grant developers access to the project
az role assignment create \
  --assignee-object-id "{developer-group-object-id}" \
  --role "Deployment Environments User" \
  --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-devcenter/providers/Microsoft.DevCenter/projects/proj-contoso-platform"
```

## Task 2: Define environment types (Dev, Test, Staging)

Create environment types that map to Azure subscriptions with different policies:

```bash
# Create environment types at the Dev Center level
az devcenter admin environment-type create \
  --name Dev \
  --dev-center-name dc-contoso \
  --resource-group rg-contoso-devcenter

az devcenter admin environment-type create \
  --name Test \
  --dev-center-name dc-contoso \
  --resource-group rg-contoso-devcenter

az devcenter admin environment-type create \
  --name Staging \
  --dev-center-name dc-contoso \
  --resource-group rg-contoso-devcenter

# Map environment types to subscriptions at the project level
# Dev environments deploy to the dev subscription with contributor role
az devcenter admin project-environment-type create \
  --name Dev \
  --project-name proj-contoso-platform \
  --resource-group rg-contoso-devcenter \
  --deployment-target-id "/subscriptions/{dev-sub-id}" \
  --identity-type SystemAssigned \
  --roles "{\"8e3af657-a8ff-443c-a75c-2fe8c4bcb635\":{}}" \
  --status Enabled

# Test environments deploy to the test subscription
az devcenter admin project-environment-type create \
  --name Test \
  --project-name proj-contoso-platform \
  --resource-group rg-contoso-devcenter \
  --deployment-target-id "/subscriptions/{test-sub-id}" \
  --identity-type SystemAssigned \
  --roles "{\"8e3af657-a8ff-443c-a75c-2fe8c4bcb635\":{}}" \
  --status Enabled

# Staging - restricted, only team leads can create
az devcenter admin project-environment-type create \
  --name Staging \
  --project-name proj-contoso-platform \
  --resource-group rg-contoso-devcenter \
  --deployment-target-id "/subscriptions/{staging-sub-id}" \
  --identity-type SystemAssigned \
  --roles "{\"8e3af657-a8ff-443c-a75c-2fe8c4bcb635\":{}}" \
  --status Enabled
```

## Task 3: Create environment definitions (IaC templates in catalog)

Create Bicep templates that define what an environment looks like:

```
contoso-environment-catalog/
  environments/
    WebApp/
      environment.yaml
      main.bicep
    Microservice/
      environment.yaml
      main.bicep
    FullStack/
      environment.yaml
      main.bicep
```

Define the WebApp environment:

```yaml
# environments/WebApp/environment.yaml
name: WebApp
version: 1.0.0
summary: Single web application with database
description: Provisions an App Service, SQL Database, and Application Insights instance
templatePath: main.bicep
parameters:
  - id: appServicePlanSku
    name: App Service Plan SKU
    description: The SKU for the App Service Plan
    type: string
    default: B1
    allowed:
      - F1
      - B1
      - S1
      - P1v3
  - id: sqlDatabaseSku
    name: SQL Database SKU
    description: The SKU for the SQL Database
    type: string
    default: Basic
    allowed:
      - Basic
      - S0
      - S1
  - id: enableApplicationInsights
    name: Enable Application Insights
    description: Whether to deploy Application Insights
    type: boolean
    default: true
```

```bicep
// environments/WebApp/main.bicep
@description('Name for the environment (auto-populated by ADE)')
param environmentName string

@description('The SKU for the App Service Plan')
@allowed(['F1', 'B1', 'S1', 'P1v3'])
param appServicePlanSku string = 'B1'

@description('The SKU for the SQL Database')
@allowed(['Basic', 'S0', 'S1'])
param sqlDatabaseSku string = 'Basic'

@description('Whether to deploy Application Insights')
param enableApplicationInsights bool = true

param location string = resourceGroup().location

var baseName = 'contoso-${environmentName}'

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${baseName}'
  location: location
  sku: {
    name: appServicePlanSku
  }
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: 'app-${baseName}'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: enableApplicationInsights ? appInsights.properties.ConnectionString : ''
        }
        {
          name: 'ENVIRONMENT_NAME'
          value: environmentName
        }
      ]
    }
  }
}

resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: 'sql-${baseName}'
  location: location
  properties: {
    administratorLogin: 'contosoadmin'
    administratorLoginPassword: 'P@ssw0rd-${uniqueString(resourceGroup().id)}'
    minimalTlsVersion: '1.2'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent: sqlServer
  name: 'db-${baseName}'
  location: location
  sku: {
    name: sqlDatabaseSku
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = if (enableApplicationInsights) {
  name: 'ai-${baseName}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 30
  }
}

output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output webAppName string = webApp.name
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
```

Define the Microservice environment for containerized workloads:

```yaml
# environments/Microservice/environment.yaml
name: Microservice
version: 1.0.0
summary: Container-based microservice with service bus
description: Provisions Azure Container Apps, Container Registry, Service Bus, and Redis Cache
templatePath: main.bicep
parameters:
  - id: containerAppCount
    name: Number of container apps
    description: How many container app instances to create
    type: integer
    default: 1
  - id: enableServiceBus
    name: Enable Service Bus
    description: Whether to deploy a Service Bus namespace
    type: boolean
    default: true
```

## Task 4: Configure catalog from GitHub repo

Connect the Dev Center to a GitHub repository containing environment definitions:

```bash
# Create a GitHub personal access token or use a GitHub App
# The token needs 'repo' scope for private repositories

# Add the catalog to the Dev Center
az devcenter admin catalog create \
  --name contoso-environments \
  --dev-center-name dc-contoso \
  --resource-group rg-contoso-devcenter \
  --git-hub path="/environments" \
    branch="main" \
    uri="https://github.com/contoso/environment-catalog.git" \
    secret-identifier="https://kv-contoso-devcenter.vault.azure.net/secrets/github-pat"

# Sync the catalog (happens automatically but can be triggered)
az devcenter admin catalog sync \
  --name contoso-environments \
  --dev-center-name dc-contoso \
  --resource-group rg-contoso-devcenter

# Verify environment definitions are available
az devcenter admin environment-definition list \
  --dev-center-name dc-contoso \
  --resource-group rg-contoso-devcenter \
  --catalog-name contoso-environments \
  --query "[].{Name:name, Description:description}" \
  --output table
```

For Azure DevOps catalog:

```bash
# Alternative: Use Azure DevOps repository as catalog source
az devcenter admin catalog create \
  --name contoso-ado-environments \
  --dev-center-name dc-contoso \
  --resource-group rg-contoso-devcenter \
  --ado-git path="/environments" \
    branch="main" \
    uri="https://dev.azure.com/contoso/Platform/_git/environment-catalog" \
    secret-identifier="https://kv-contoso-devcenter.vault.azure.net/secrets/ado-pat"
```

## Task 5: Developer self-service portal

Developers can create environments via CLI, Developer Portal, or API:

```bash
# Developer creates an environment via Azure CLI
az devcenter dev environment create \
  --name "feature-auth-redesign" \
  --project-name proj-contoso-platform \
  --dev-center-name dc-contoso \
  --environment-type Dev \
  --catalog-name contoso-environments \
  --environment-definition-name WebApp \
  --parameters '{"appServicePlanSku": "B1", "sqlDatabaseSku": "Basic", "enableApplicationInsights": true}'

# List my environments
az devcenter dev environment list \
  --project-name proj-contoso-platform \
  --dev-center-name dc-contoso \
  --query "[].{Name:name, Type:environmentType, Status:provisioningState, Created:createdDate}" \
  --output table

# Get environment outputs (URLs, connection strings)
az devcenter dev environment show \
  --name "feature-auth-redesign" \
  --project-name proj-contoso-platform \
  --dev-center-name dc-contoso \
  --query "outputs"

# Delete environment when done
az devcenter dev environment delete \
  --name "feature-auth-redesign" \
  --project-name proj-contoso-platform \
  --dev-center-name dc-contoso \
  --yes
```

The Developer Portal (https://devportal.microsoft.com) provides a web UI where developers can:
- Browse available environment definitions
- Create new environments with guided parameter forms
- View active environments and their status
- Access environment outputs (URLs, credentials)
- Delete environments they own

## Task 6: Set limits and policies (max environments, auto-delete schedule)

Configure governance controls to prevent cost overruns:

```bash
# Set maximum environments per user at project level (already set during create)
az devcenter admin project update \
  --name proj-contoso-platform \
  --resource-group rg-contoso-devcenter \
  --max-dev-boxes-per-user 3

# Configure auto-expiration for environments using Azure Policy
# Create a policy that tags environments with an expiry date
cat > auto-delete-policy.json << 'EOF'
{
  "properties": {
    "displayName": "Auto-expire dev environments after 7 days",
    "description": "Tags deployment environments with expiry and triggers deletion",
    "mode": "All",
    "policyRule": {
      "if": {
        "allOf": [
          {
            "field": "type",
            "equals": "Microsoft.Resources/resourceGroups"
          },
          {
            "field": "tags['ade-environment-type']",
            "equals": "Dev"
          }
        ]
      },
      "then": {
        "effect": "modify",
        "details": {
          "roleDefinitionIds": [
            "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c"
          ],
          "operations": [
            {
              "operation": "addOrReplace",
              "field": "tags['auto-delete-after']",
              "value": "[utcNow('yyyy-MM-ddTHH:mm:ssZ')]"
            }
          ]
        }
      }
    }
  }
}
EOF

az policy definition create \
  --name "auto-expire-dev-environments" \
  --rules auto-delete-policy.json
```

Create an Azure Automation Runbook for scheduled cleanup:

```powershell
# Runbook: Remove-ExpiredEnvironments.ps1
param(
    [int]$MaxAgeDays = 7
)

Connect-AzAccount -Identity

$cutoffDate = (Get-Date).AddDays(-$MaxAgeDays)

# Find resource groups created by ADE that are older than threshold
$expiredGroups = Get-AzResourceGroup |
    Where-Object {
        $_.Tags['ade-environment-type'] -eq 'Dev' -and
        [DateTime]$_.Tags['auto-delete-after'] -lt $cutoffDate
    }

foreach ($rg in $expiredGroups) {
    Write-Output "Deleting expired environment: $($rg.ResourceGroupName) (created: $($rg.Tags['auto-delete-after']))"
    Remove-AzResourceGroup -Name $rg.ResourceGroupName -Force -AsJob
}

Write-Output "Processed $($expiredGroups.Count) expired environments."
```

## Task 7: CI/CD integration (create ephemeral environments per PR)

Create a pipeline that provisions an environment for each pull request and tears it down on merge:

```yaml
# azure-pipelines/pr-environment.yml
trigger: none

pr:
  branches:
    include: [main]

pool:
  vmImage: "ubuntu-latest"

variables:
  - name: environmentName
    value: "pr-$(System.PullRequest.PullRequestNumber)"
  - name: devCenterName
    value: "dc-contoso"
  - name: projectName
    value: "proj-contoso-platform"

stages:
  - stage: CreateEnvironment
    displayName: "Provision PR environment"
    jobs:
      - job: Provision
        displayName: "Create ADE environment"
        steps:
          - task: AzureCLI@2
            displayName: "Create environment for PR"
            inputs:
              azureSubscription: "contoso-devcenter-sc"
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                # Check if environment already exists
                EXISTS=$(az devcenter dev environment show \
                  --name "$(environmentName)" \
                  --project-name "$(projectName)" \
                  --dev-center-name "$(devCenterName)" \
                  --query "name" -o tsv 2>/dev/null || true)

                if [ -z "$EXISTS" ]; then
                  echo "Creating environment $(environmentName)..."
                  az devcenter dev environment create \
                    --name "$(environmentName)" \
                    --project-name "$(projectName)" \
                    --dev-center-name "$(devCenterName)" \
                    --environment-type Dev \
                    --catalog-name contoso-environments \
                    --environment-definition-name WebApp \
                    --parameters '{"appServicePlanSku":"F1","sqlDatabaseSku":"Basic","enableApplicationInsights":true}'
                else
                  echo "Environment $(environmentName) already exists."
                fi

          - task: AzureCLI@2
            displayName: "Get environment URL"
            name: getUrl
            inputs:
              azureSubscription: "contoso-devcenter-sc"
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                # Wait for provisioning to complete
                for i in $(seq 1 30); do
                  STATUS=$(az devcenter dev environment show \
                    --name "$(environmentName)" \
                    --project-name "$(projectName)" \
                    --dev-center-name "$(devCenterName)" \
                    --query "provisioningState" -o tsv)
                  if [ "$STATUS" == "Succeeded" ]; then
                    break
                  fi
                  echo "Waiting for environment... (attempt $i, status: $STATUS)"
                  sleep 30
                done

                URL=$(az devcenter dev environment show \
                  --name "$(environmentName)" \
                  --project-name "$(projectName)" \
                  --dev-center-name "$(devCenterName)" \
                  --query "outputs.webAppUrl.value" -o tsv)
                echo "##vso[task.setvariable variable=envUrl;isOutput=true]$URL"

  - stage: DeployApp
    displayName: "Deploy to PR environment"
    dependsOn: CreateEnvironment
    variables:
      envUrl: $[ stageDependencies.CreateEnvironment.Provision.outputs['getUrl.envUrl'] ]
    jobs:
      - job: Deploy
        steps:
          - task: AzureCLI@2
            displayName: "Deploy application code"
            inputs:
              azureSubscription: "contoso-devcenter-sc"
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                echo "Deploying to: $(envUrl)"
                az webapp deploy \
                  --name "app-contoso-$(environmentName)" \
                  --resource-group "rg-$(environmentName)" \
                  --src-path ./dist/app.zip \
                  --type zip

          - task: PowerShell@2
            displayName: "Post environment URL to PR"
            inputs:
              targetType: inline
              script: |
                $body = @{
                  body = "Environment ready: $(envUrl)`n`nThis environment will be automatically deleted when the PR is merged or closed."
                } | ConvertTo-Json
                # Post comment via Azure DevOps REST API
                $uri = "$(System.CollectionUri)$(System.TeamProject)/_apis/git/repositories/$(Build.Repository.Name)/pullRequests/$(System.PullRequest.PullRequestNumber)/threads?api-version=7.1"
                Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json" -Headers @{Authorization="Bearer $(System.AccessToken)"}
```

GitHub Actions equivalent for PR environment teardown:

```yaml
# .github/workflows/pr-cleanup.yml
name: Cleanup PR environment

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Delete PR environment
        run: |
          ENV_NAME="pr-${{ github.event.pull_request.number }}"
          echo "Deleting environment: $ENV_NAME"
          az devcenter dev environment delete \
            --name "$ENV_NAME" \
            --project-name "proj-contoso-platform" \
            --dev-center-name "dc-contoso" \
            --yes 2>/dev/null || echo "Environment not found (may already be deleted)"
```

## Break and fix

### Exercise 1: Fix the failing environment creation

A developer reports this error when creating an environment:

```
ERROR: The environment definition 'WebApp' was not found in catalog 'contoso-environments'.
```

**Diagnosis steps:**

```bash
# Check if catalog is synced
az devcenter admin catalog show \
  --name contoso-environments \
  --dev-center-name dc-contoso \
  --resource-group rg-contoso-devcenter \
  --query "{Status:syncState, LastSync:lastSyncTime}"
# Returns: {"Status": "Failed", "LastSync": "2024-01-10T08:00:00Z"}

# Check sync errors
az devcenter admin catalog get-sync-error-details \
  --name contoso-environments \
  --dev-center-name dc-contoso \
  --resource-group rg-contoso-devcenter
# Returns: "Path '/environments' not found in repository"
```

**Fix:** The catalog path was configured incorrectly. The environment definitions are at the repo root, not in a subfolder:

```bash
# Delete and recreate catalog with correct path
az devcenter admin catalog delete \
  --name contoso-environments \
  --dev-center-name dc-contoso \
  --resource-group rg-contoso-devcenter \
  --yes

az devcenter admin catalog create \
  --name contoso-environments \
  --dev-center-name dc-contoso \
  --resource-group rg-contoso-devcenter \
  --git-hub path="/" \
    branch="main" \
    uri="https://github.com/contoso/environment-catalog.git" \
    secret-identifier="https://kv-contoso-devcenter.vault.azure.net/secrets/github-pat"

# Force sync
az devcenter admin catalog sync \
  --name contoso-environments \
  --dev-center-name dc-contoso \
  --resource-group rg-contoso-devcenter
```

### Exercise 2: Fix the permission denied error

A developer with "Deployment Environments User" role gets:

```
ERROR: AuthorizationFailed - The client does not have authorization to perform action
'Microsoft.Resources/deployments/write' over scope '/subscriptions/{dev-sub-id}/...'
```

**Fix:** The project environment type's managed identity needs permissions on the target subscription:

```bash
# Get the project environment type's identity principal ID
PRINCIPAL_ID=$(az devcenter admin project-environment-type show \
  --name Dev \
  --project-name proj-contoso-platform \
  --resource-group rg-contoso-devcenter \
  --query "identity.principalId" -o tsv)

# Assign Contributor role on the target subscription
az role assignment create \
  --assignee-object-id "$PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "/subscriptions/{dev-sub-id}"
```

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the relationship between a Dev Center environment type and a project environment type?",
    options: [
      "They are the same thing; \"project environment type\" is just a newer name",
      "Dev Center environment types define categories; project environment types map those categories to specific subscriptions and identities",
      "Dev Center types are for production; project types are for development",
      "Dev Center types define the IaC templates; project types define the parameters"
    ],
    correctIndex: 1,
    explanation: "Dev Center environment types (Dev, Test, Staging) are abstract categories defined centrally. Project environment types inherit from these and add deployment configuration: which subscription to deploy to, what managed identity to use, and what RBAC roles to assign. This separation allows a single Dev Center to serve multiple projects with different subscription mappings."
  },
  {
    question: "How does Azure Deployment Environments enforce cost governance for developer self-service?",
    options: [
      "By requiring manager approval for every environment creation",
      "Through maximum environment limits per user, environment type restrictions, and scheduled auto-deletion",
      "By limiting environments to free-tier SKUs only",
      "By deducting costs from the developer's personal Azure budget"
    ],
    correctIndex: 1,
    explanation: "ADE provides multiple governance controls: maximum environments per user (set on the project), environment type access (which role can create Staging vs Dev), parameter constraints in environment definitions (allowed SKUs), and organizational policies for auto-expiration. These ensure developers get self-service speed while staying within cost boundaries."
  },
  {
    question: "What is a catalog in Azure Deployment Environments?",
    options: [
      "A marketplace of pre-built Azure resources available for purchase",
      "A Git repository containing IaC templates (environment definitions) that the Dev Center syncs and offers to developers",
      "A list of approved Azure services that developers can provision",
      "An Azure Container Registry containing approved base images"
    ],
    correctIndex: 1,
    explanation: "A catalog is a connection to a Git repository (GitHub or Azure Repos) containing environment definitions. Each definition includes a YAML manifest and IaC template (Bicep or Terraform). The Dev Center periodically syncs the catalog, making new or updated environment definitions available to developers through the portal or CLI."
  },
  {
    question: "What is the primary benefit of creating ephemeral environments per pull request?",
    options: [
      "It eliminates the need for code review since environments are tested automatically",
      "It provides isolated, production-like environments for testing PR changes without affecting shared environments",
      "It reduces the number of branches in the repository",
      "It automatically merges pull requests when tests pass"
    ],
    correctIndex: 1,
    explanation: "Ephemeral PR environments give each pull request its own isolated infrastructure to test changes. This prevents conflicts between developers sharing environments, enables parallel development, and ensures the PR environment is always clean and consistent. When the PR is merged or closed, the environment is automatically destroyed, controlling costs."
  }
]} />

## Cleanup

```bash
# Delete all developer environments in the project
az devcenter dev environment list \
  --project-name proj-contoso-platform \
  --dev-center-name dc-contoso \
  --query "[].name" -o tsv | \
  xargs -I {} az devcenter dev environment delete \
    --name {} \
    --project-name proj-contoso-platform \
    --dev-center-name dc-contoso \
    --yes

# Remove the catalog
az devcenter admin catalog delete \
  --name contoso-environments \
  --dev-center-name dc-contoso \
  --resource-group rg-contoso-devcenter \
  --yes

# Remove environment types from project
az devcenter admin project-environment-type delete \
  --name Dev --project-name proj-contoso-platform \
  --resource-group rg-contoso-devcenter --yes

az devcenter admin project-environment-type delete \
  --name Test --project-name proj-contoso-platform \
  --resource-group rg-contoso-devcenter --yes

# Remove the project
az devcenter admin project delete \
  --name proj-contoso-platform \
  --resource-group rg-contoso-devcenter \
  --yes

# Remove the Dev Center
az devcenter admin devcenter delete \
  --name dc-contoso \
  --resource-group rg-contoso-devcenter \
  --yes

# Remove the resource group
az group delete --name rg-contoso-devcenter --yes --no-wait
```
