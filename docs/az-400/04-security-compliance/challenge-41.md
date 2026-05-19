---
sidebar_position: 3
title: "Challenge 41: Azure DevOps permissions and service connections"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 41: Azure DevOps permissions and service connections

## Exam skills covered

- Implement and manage Azure DevOps service connections and personal access tokens
- Design and implement permissions and security groups in Azure DevOps
- Recommend appropriate access levels
- Configure projects and teams in Azure DevOps

## Scenario

Contoso Ltd's Azure DevOps organization has grown organically over three years. All 200 users are members of the Project Administrators group because "it was easier." Every pipeline uses a single service connection named `Azure-All` with Contributor access to the entire production subscription. The PAT used by the CI integration was created by a former employee with full scope and no expiration. You must redesign the permission model to implement least-privilege access.

## Prerequisites

- Azure DevOps organization with Project Collection Administrator access
- Azure subscription with Owner role
- Azure CLI with `azure-devops` extension installed
- At least one Azure DevOps project

## Tasks

### Task 1: Design security groups (per-team, per-role)

Create a group structure that maps to Contoso's team organization.

```bash
# Install the Azure DevOps CLI extension
az extension add --name azure-devops

# Set the default organization and project
az devops configure --defaults organization=https://dev.azure.com/contoso project=ContosoWeb

# Create team-specific security groups
az devops security group create \
  --name "Contoso-Backend-Developers" \
  --description "Backend development team - write access to backend repos" \
  --project ContosoWeb

az devops security group create \
  --name "Contoso-Frontend-Developers" \
  --description "Frontend development team - write access to frontend repos" \
  --project ContosoWeb

az devops security group create \
  --name "Contoso-DevOps-Engineers" \
  --description "Platform team - manage pipelines and service connections" \
  --project ContosoWeb

az devops security group create \
  --name "Contoso-Release-Managers" \
  --description "Approve and manage production releases" \
  --project ContosoWeb

az devops security group create \
  --name "Contoso-Stakeholders" \
  --description "View work items and dashboards only" \
  --project ContosoWeb
```

Remove users from Project Administrators:

```bash
# List current Project Administrators members
az devops security group membership list \
  --id "vstfs:///Classification/TeamProject/<project-id>\\Project Administrators"

# Remove a user from Project Administrators
az devops security group membership remove \
  --group "vstfs:///Classification/TeamProject/<project-id>\\Project Administrators" \
  --member-id <user-descriptor>

# Add user to the appropriate team group instead
az devops security group membership add \
  --group "vstfs:///Classification/TeamProject/<project-id>\\Contoso-Backend-Developers" \
  --member-id <user-descriptor>
```

### Task 2: Configure project-level permissions

Set granular permissions for each group.

```bash
# Get the security namespace IDs
az devops security permission namespace list --query "[].{name:name, id:namespaceId}" -o table

# Key namespace IDs:
# Build: 33344d9c-fc72-4d6f-aba5-fa317101a7e9
# Git Repositories: 2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87
# ReleaseManagement: c788c23e-1b46-4162-8f5e-d7585343b5de

# Grant build permissions to DevOps Engineers group
az devops security permission update \
  --namespace-id 33344d9c-fc72-4d6f-aba5-fa317101a7e9 \
  --subject <devops-engineers-group-descriptor> \
  --token "<project-id>" \
  --allow-bit 1535 \
  --deny-bit 0

# Restrict developers to only queue builds (not edit pipelines)
az devops security permission update \
  --namespace-id 33344d9c-fc72-4d6f-aba5-fa317101a7e9 \
  --subject <backend-developers-group-descriptor> \
  --token "<project-id>" \
  --allow-bit 128 \
  --deny-bit 0
```

Permission matrix for Contoso:

| Permission | Backend Devs | Frontend Devs | DevOps Engineers | Release Managers |
|-----------|-------------|---------------|------------------|-----------------|
| View builds | Yes | Yes | Yes | Yes |
| Queue builds | Yes | Yes | Yes | Yes |
| Edit build pipelines | No | No | Yes | No |
| Create releases | No | No | Yes | Yes |
| Approve releases | No | No | No | Yes |
| Manage service connections | No | No | Yes | No |
| Edit project settings | No | No | Yes | No |

### Task 3: Set up service connections with minimum permissions

Replace the overly permissive `Azure-All` connection with scoped connections.

```bash
# Create a resource group per environment
az group create --name rg-contoso-dev --location eastus
az group create --name rg-contoso-staging --location eastus
az group create --name rg-contoso-prod --location eastus

# Create service principals scoped to each environment
az ad sp create-for-rbac \
  --name "sp-ado-contoso-dev" \
  --role "Contributor" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-dev"

az ad sp create-for-rbac \
  --name "sp-ado-contoso-staging" \
  --role "Contributor" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-staging"

az ad sp create-for-rbac \
  --name "sp-ado-contoso-prod" \
  --role "Contributor" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod"
```

Create service connections in Azure DevOps:

```bash
# Create the development service connection
az devops service-endpoint azurerm create \
  --name "Azure-Dev" \
  --azure-rm-service-principal-id <dev-sp-app-id> \
  --azure-rm-subscription-id <subscription-id> \
  --azure-rm-subscription-name "Contoso Dev" \
  --azure-rm-tenant-id <tenant-id>

# Create staging and production connections similarly
az devops service-endpoint azurerm create \
  --name "Azure-Staging" \
  --azure-rm-service-principal-id <staging-sp-app-id> \
  --azure-rm-subscription-id <subscription-id> \
  --azure-rm-subscription-name "Contoso Staging" \
  --azure-rm-tenant-id <tenant-id>

az devops service-endpoint azurerm create \
  --name "Azure-Prod" \
  --azure-rm-service-principal-id <prod-sp-app-id> \
  --azure-rm-subscription-id <subscription-id> \
  --azure-rm-subscription-name "Contoso Production" \
  --azure-rm-tenant-id <tenant-id>
```

### Task 4: Federated service connections (workload identity)

Create a service connection using workload identity federation to eliminate secrets.

```bash
# Create the app registration
az ad app create --display-name "sp-ado-contoso-federated"

APP_OBJECT_ID=$(az ad app list --display-name "sp-ado-contoso-federated" --query "[0].id" -o tsv)
APP_CLIENT_ID=$(az ad app list --display-name "sp-ado-contoso-federated" --query "[0].appId" -o tsv)

# Create the federated credential for the service connection
az ad app federated-credential create \
  --id $APP_OBJECT_ID \
  --parameters '{
    "name": "ado-contoso-prod-connection",
    "issuer": "https://vstoken.dev.azure.com/<org-guid>",
    "subject": "sc://contoso/ContosoWeb/Azure-Prod-Federated",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Create service principal and assign role
az ad sp create --id $APP_CLIENT_ID
az role assignment create \
  --assignee $APP_CLIENT_ID \
  --role "Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod"
```

In Azure DevOps, create the service connection using "Workload Identity federation (manual)" and provide the app registration details.

### Task 5: Pipeline permissions (restrict service connection usage)

Restrict which pipelines can use each service connection.

```bash
# Get the service endpoint ID
ENDPOINT_ID=$(az devops service-endpoint list \
  --query "[?name=='Azure-Prod'].id" -o tsv)

# Disable "Grant access permission to all pipelines"
az devops service-endpoint update \
  --id $ENDPOINT_ID \
  --enable-for-all false
```

Use environments with approval checks in the pipeline:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

stages:
  - stage: Build
    jobs:
      - job: BuildApp
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - script: echo "Building application"

  - stage: DeployProd
    dependsOn: Build
    jobs:
      - deployment: DeployToProd
        pool:
          vmImage: 'ubuntu-latest'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: 'Azure-Prod-Federated'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      az group show --name rg-contoso-prod
```

Configure environment approvals:

1. Pipelines > Environments > production > Approvals and checks
2. Add "Approvals" with the Contoso-Release-Managers group
3. Add "Branch control" to restrict to `refs/heads/main` only
4. Add "Business hours" to prevent deployments outside working hours

### Task 6: Access levels (Basic, Stakeholder, Visual Studio)

| Access level | Cost | Key capabilities | Best for |
|-------------|------|-----------------|----------|
| Stakeholder | Free | View backlogs, create work items, view dashboards, view wiki | Product owners, managers, executives |
| Basic | Paid (first 5 free) | Full Boards, Repos, Pipelines, Test Plans (limited) | Developers, testers, DevOps engineers |
| Basic + Test Plans | Paid add-on | Full Test Plans, test case management | Dedicated QA engineers |
| Visual Studio subscription | Included | Same as Basic, included with VS Enterprise/Professional | Developers with VS subscriptions |

```bash
# List current access level assignments
az devops user list --query "items[].{name:user.displayName, level:accessLevel.accountLicenseType}" -o table

# Change a user's access level to Stakeholder
az devops user update \
  --user user@contoso.com \
  --license-type stakeholder

# Add a new user with Basic access
az devops user add \
  --email-id newdev@contoso.com \
  --license-type express \
  --send-email-invite true
```

### Task 7: PAT lifecycle management and policies

Configure organization-level PAT policies:

1. Organization Settings > Policies (via web portal):
   - Restrict creation of full-scoped PATs: Enabled
   - Restrict creation of global PATs: Enabled (force project-scoped)
   - Enforce maximum PAT lifetime: 90 days
   - Restrict creation of PATs with admin scope: Enabled

PAT audit and revocation:

```bash
# Via REST API: List all PATs for auditing
curl -u :$PAT \
  "https://vssps.dev.azure.com/contoso/_apis/tokens/pats?api-version=7.1-preview.1" \
  | jq '.patTokens[] | {displayName, scope, validTo}'

# Revoke a specific PAT
curl -X DELETE -u :$ADMIN_PAT \
  "https://vssps.dev.azure.com/contoso/_apis/tokens/pats?authorizationId=<pat-auth-id>&api-version=7.1-preview.1"
```

Create a scheduled pipeline that audits PAT usage:

```yaml
# azure-pipelines.yml
schedules:
  - cron: "0 8 * * 1"
    displayName: Weekly PAT audit
    branches:
      include:
        - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: PowerShell@2
    inputs:
      targetType: 'inline'
      script: |
        $headers = @{
          Authorization = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$(PAT_AUDIT_TOKEN)")))"
        }
        $uri = "https://vssps.dev.azure.com/contoso/_apis/tokens/pats?api-version=7.1-preview.1"
        $response = Invoke-RestMethod -Uri $uri -Headers $headers
        $expiringSoon = $response.patTokens | Where-Object {
          $_.validTo -lt (Get-Date).AddDays(14) -and $_.validTo -gt (Get-Date)
        }
        if ($expiringSoon) {
          Write-Host "##vso[task.logissue type=warning]PATs expiring within 14 days:"
          $expiringSoon | ForEach-Object {
            Write-Host "  - $($_.displayName): expires $($_.validTo)"
          }
        }
```

## Break and fix

### Break scenario 1: Pipeline fails with resource authorization error

A developer creates a new pipeline and references the `Azure-Prod` service connection. The pipeline fails with "There was a resource authorization problem."

**Cause:** The service connection has "Grant access permission to all pipelines" disabled, and this pipeline has not been explicitly authorized.

**Diagnosis:** Check the pipeline run log for the authorization error. The UI will show a "Permit" button if you have sufficient permissions.


<details>
<summary>Solution</summary>

**Fix:**

1. Navigate to Project Settings > Service connections > Azure-Prod > Security
2. Under "Pipeline permissions," click the "+" button and add the specific pipeline
3. Alternatively, when the pipeline run shows the authorization prompt, click "Permit"

</details>

### Break scenario 2: User cannot view work items after group restructuring

After moving users from Project Administrators to team-specific groups, users report they cannot view work items.

**Cause:** The custom groups do not inherit from the "Contributors" built-in group, which has default read access to work items.


<details>
<summary>Solution</summary>

**Fix:**

```bash
# Make the custom group a member of Contributors (inherits basic permissions)
az devops security group membership add \
  --group "vstfs:///Classification/TeamProject/<project-id>\\Contributors" \
  --member-id <custom-group-descriptor>
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Contoso wants to ensure that only the Production-Deploy pipeline can use the 'Azure-Prod' service connection. What should you configure?",
    options: [
      "Set the service connection to \"Grant access permission to all pipelines\" and add a YAML condition",
      "Disable \"Grant access permission to all pipelines\" and explicitly add only the Production-Deploy pipeline to the service connection's pipeline permissions",
      "Create a separate Azure DevOps project for production pipelines",
      "Use pipeline variables to restrict which stages can access the connection"
    ],
    correctIndex: 1,
    explanation: "Disabling \"Grant access permission to all pipelines\" and explicitly adding only the specific pipeline to the service connection's permissions ensures that no other pipeline can reference this connection. This is the built-in authorization model for service connections in Azure DevOps."
  },
  {
    question: "Contoso has 200 users: 150 developers, 30 product managers who only need work item access, and 20 executives who view dashboards. What is the most cost-effective access level assignment?",
    options: [
      "200 Basic licenses",
      "150 Basic + 50 Stakeholder",
      "200 Stakeholder",
      "150 Basic + 30 Basic + 20 Stakeholder"
    ],
    correctIndex: 1,
    explanation: "Stakeholder access is free and provides the ability to view and create work items, view dashboards, and participate in discussions. Product managers and executives who do not need code access, pipeline management, or test plans should use Stakeholder access. Only developers who need full Repos, Pipelines, and Boards features require Basic access."
  },
  {
    question: "An organization policy requires all PATs to be project-scoped with a maximum lifetime of 90 days. Where should you configure these restrictions?",
    options: [
      "Project Settings > Policies",
      "Organization Settings > Policies",
      "Each user's Personal settings",
      "Microsoft Entra Conditional Access"
    ],
    correctIndex: 1,
    explanation: "PAT lifecycle policies (maximum lifetime, scope restrictions, and admin scope restrictions) are configured at the Organization Settings level under Policies. These apply to all users in the organization and cannot be overridden at the project level."
  },
  {
    question: "A team needs to deploy to both development and production environments from one pipeline. Production requires release manager approval. What is the correct configuration?",
    options: [
      "Create two separate pipelines with different triggers",
      "Use a single pipeline with stages and configure an Approvals check on the production environment resource",
      "Add a manual intervention task in the pipeline YAML",
      "Configure branch policies that require approval on the main branch"
    ],
    correctIndex: 1,
    explanation: "Azure DevOps environments support Approvals and checks that gate deployments. Configuring an approval check on the production environment means any pipeline stage targeting that environment will pause for approval. This provides a centralized, reusable control point regardless of which pipeline is used."
  }
]} />

## Cleanup

```bash
# Delete service connections
az devops service-endpoint delete --id <endpoint-id> --yes

# Delete security groups
az devops security group delete --id <group-descriptor>

# Delete service principals
az ad sp delete --id $(az ad sp list --display-name "sp-ado-contoso-dev" --query "[0].id" -o tsv)
az ad sp delete --id $(az ad sp list --display-name "sp-ado-contoso-staging" --query "[0].id" -o tsv)
az ad sp delete --id $(az ad sp list --display-name "sp-ado-contoso-prod" --query "[0].id" -o tsv)
az ad app delete --id $APP_OBJECT_ID

# Delete resource groups
az group delete --name rg-contoso-dev --yes --no-wait
az group delete --name rg-contoso-staging --yes --no-wait
az group delete --name rg-contoso-prod --yes --no-wait
```
