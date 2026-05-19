---
sidebar_position: 1
title: "Challenge 31: Infrastructure as Code strategy"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 31: Infrastructure as Code strategy

:::info Platform: comparison
This challenge covers both GitHub Actions and Azure Pipelines for IaC deployment workflows.
:::

## Exam skills mapped

- Recommend a configuration management technology for application infrastructure
- Implement a configuration management strategy for application infrastructure
- Define an IaC strategy, including source control and automation of testing and deployment

## Scenario

Contoso Ltd manages 200+ Azure resources across 5 environments (dev, test, staging, production-east, production-west). All infrastructure changes have been performed manually through the Azure Portal by a team of 4 operations engineers. This has led to:

- Configuration drift between environments (staging has different SKUs than production)
- No audit trail for who changed what and when
- 3 production incidents in the past quarter caused by manual misconfigurations
- 2-week lead time for provisioning new environments

The CTO has mandated a move to Infrastructure as Code with automated testing, peer review, and CI/CD deployment. The team must choose between Bicep, Terraform, and ARM templates, then implement a complete pipeline.

The target architecture includes:

```
contoso-infrastructure/
  modules/
    networking/
    compute/
    database/
    monitoring/
  environments/
    dev.bicepparam       (or dev.tfvars)
    test.bicepparam
    staging.bicepparam
    prod-east.bicepparam
    prod-west.bicepparam
  main.bicep             (or main.tf)
  .github/workflows/
  azure-pipelines/
```

## Task 1: Compare IaC technologies and create a decision matrix

Evaluate Bicep, Terraform, and ARM templates for Contoso's requirements:

| Criteria | ARM templates | Bicep | Terraform |
|----------|--------------|-------|-----------|
| Learning curve | Verbose JSON, steep | Simplified DSL, moderate | HCL, moderate |
| Multi-cloud support | Azure only | Azure only | Multi-cloud |
| State management | Stateless (Azure is source of truth) | Stateless | Requires remote state |
| Modularity | Linked/nested templates | Modules with registry | Modules with registry |
| What-if / Plan | `az deployment what-if` | `az deployment what-if` | `terraform plan` |
| IDE support | Limited | VS Code extension with IntelliSense | VS Code extension |
| Community modules | Azure Verified Modules | Azure Verified Modules | Terraform Registry |
| Drift detection | None built-in | None built-in | `terraform plan` detects drift |

For Contoso (Azure-only, wants drift detection, some team knows HCL):

```bash
# Decision: Use Bicep for new Azure-native projects (simpler syntax, no state to manage)
# Decision: Use Terraform where drift detection or multi-cloud is needed

# Verify Bicep CLI is installed
az bicep version
az bicep upgrade

# Verify Terraform is installed
terraform version
```

## Task 2: Implement Bicep deployment via GitHub Actions

Create a modular Bicep structure with a GitHub Actions deployment pipeline:

```bicep
// modules/networking/main.bicep
@description('The Azure region for deployment')
param location string = resourceGroup().location

@description('Environment name used for naming conventions')
@allowed(['dev', 'test', 'staging', 'prod'])
param environmentName string

@description('Address space for the virtual network')
param vnetAddressPrefix string = '10.0.0.0/16'

var nameSuffix = '${environmentName}-${location}'

resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: 'vnet-contoso-${nameSuffix}'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [vnetAddressPrefix]
    }
    subnets: [
      {
        name: 'snet-app'
        properties: {
          addressPrefix: cidrSubnet(vnetAddressPrefix, 24, 0)
        }
      }
      {
        name: 'snet-data'
        properties: {
          addressPrefix: cidrSubnet(vnetAddressPrefix, 24, 1)
          serviceEndpoints: [
            { service: 'Microsoft.Sql' }
            { service: 'Microsoft.Storage' }
          ]
        }
      }
    ]
  }
}

output vnetId string = vnet.id
output appSubnetId string = vnet.properties.subnets[0].id
output dataSubnetId string = vnet.properties.subnets[1].id
```

```bicep
// main.bicep
targetScope = 'subscription'

@description('Environment to deploy')
@allowed(['dev', 'test', 'staging', 'prod'])
param environmentName string

@description('Primary Azure region')
param location string = 'eastus2'

var resourceGroupName = 'rg-contoso-${environmentName}'

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: {
    environment: environmentName
    managedBy: 'bicep'
    costCenter: 'engineering'
  }
}

module networking 'modules/networking/main.bicep' = {
  scope: rg
  name: 'deploy-networking-${environmentName}'
  params: {
    location: location
    environmentName: environmentName
  }
}
```

Create the GitHub Actions workflow at `.github/workflows/infrastructure.yml`:

```yaml
name: Infrastructure Deployment

on:
  push:
    branches: [main]
    paths:
      - "modules/**"
      - "environments/**"
      - "main.bicep"
  pull_request:
    branches: [main]
    paths:
      - "modules/**"
      - "environments/**"
      - "main.bicep"

permissions:
  id-token: write
  contents: read
  pull-requests: write

env:
  AZURE_SUBSCRIPTION_ID: ${{ vars.AZURE_SUBSCRIPTION_ID }}

jobs:
  validate:
    name: Validate Bicep
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run Bicep linter
        run: az bicep build --file main.bicep --stdout > /dev/null

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ env.AZURE_SUBSCRIPTION_ID }}

      - name: Validate deployment
        run: |
          az deployment sub validate \
            --location eastus2 \
            --template-file main.bicep \
            --parameters environments/dev.bicepparam

  what-if:
    name: What-if analysis
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ env.AZURE_SUBSCRIPTION_ID }}

      - name: Run what-if
        id: whatif
        run: |
          RESULT=$(az deployment sub what-if \
            --location eastus2 \
            --template-file main.bicep \
            --parameters environments/dev.bicepparam \
            --no-pretty-print 2>&1)
          echo "whatif_output<<EOF" >> $GITHUB_OUTPUT
          echo "$RESULT" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Post what-if to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const output = `#### Infrastructure What-If Results
            \`\`\`
            ${{ steps.whatif.outputs.whatif_output }}
            \`\`\`
            *Triggered by @${{ github.actor }} in commit ${{ github.sha }}*`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

  deploy-dev:
    name: Deploy to dev
    needs: what-if
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: infrastructure-dev
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ env.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy infrastructure
        run: |
          az deployment sub create \
            --location eastus2 \
            --template-file main.bicep \
            --parameters environments/dev.bicepparam \
            --name "deploy-dev-$(date +%Y%m%d-%H%M%S)"

  deploy-prod:
    name: Deploy to production
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: infrastructure-prod
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ env.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy infrastructure
        run: |
          az deployment sub create \
            --location eastus2 \
            --template-file main.bicep \
            --parameters environments/prod-east.bicepparam \
            --name "deploy-prod-$(date +%Y%m%d-%H%M%S)"
```

## Task 3: Implement Terraform with Azure backend via Azure Pipelines

Configure Terraform with remote state in Azure Storage and deploy via Azure Pipelines:

```bash
# Create storage account for Terraform state
az group create --name rg-contoso-tfstate --location eastus2

az storage account create \
  --name stcontosoterraform \
  --resource-group rg-contoso-tfstate \
  --sku Standard_LRS \
  --encryption-services blob \
  --allow-blob-public-access false

az storage container create \
  --name tfstate \
  --account-name stcontosoterraform

# Enable soft delete for state recovery
az storage blob service-properties update \
  --account-name stcontosoterraform \
  --enable-delete-retention true \
  --delete-retention-days 30
```

```hcl
# backend.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-contoso-tfstate"
    storage_account_name = "stcontosoterraform"
    container_name       = "tfstate"
    key                  = "contoso-infra.tfstate"
    use_oidc             = true
  }
}

provider "azurerm" {
  features {}
  use_oidc = true
}
```

```hcl
# variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["dev", "test", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, test, staging, or prod."
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus2"
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
```

```hcl
# main.tf
resource "azurerm_resource_group" "main" {
  name     = "rg-contoso-${var.environment}"
  location = var.location
  tags = merge(var.tags, {
    environment = var.environment
    managedBy   = "terraform"
  })
}

module "networking" {
  source       = "./modules/networking"
  environment  = var.environment
  location     = var.location
  rg_name      = azurerm_resource_group.main.name
}
```

Create the Azure Pipelines YAML at `azure-pipelines/infrastructure.yml`:

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - "*.tf"
      - "modules/**"
      - "environments/**"

pr:
  branches:
    include:
      - main
  paths:
    include:
      - "*.tf"
      - "modules/**"
      - "environments/**"

pool:
  vmImage: "ubuntu-latest"

variables:
  - group: terraform-backend
  - name: TF_VERSION
    value: "1.6.4"

stages:
  - stage: Validate
    displayName: "Validate Terraform"
    jobs:
      - job: Validate
        displayName: "Format check and validate"
        steps:
          - task: TerraformInstaller@1
            displayName: "Install Terraform $(TF_VERSION)"
            inputs:
              terraformVersion: $(TF_VERSION)

          - script: terraform fmt -check -recursive
            displayName: "Check formatting"
            workingDirectory: $(System.DefaultWorkingDirectory)

          - task: TerraformTaskV4@4
            displayName: "Terraform init"
            inputs:
              provider: "azurerm"
              command: "init"
              backendServiceArm: "contoso-terraform-sc"
              backendAzureRmResourceGroupName: "rg-contoso-tfstate"
              backendAzureRmStorageAccountName: "stcontosoterraform"
              backendAzureRmContainerName: "tfstate"
              backendAzureRmKey: "contoso-infra.tfstate"

          - task: TerraformTaskV4@4
            displayName: "Terraform validate"
            inputs:
              provider: "azurerm"
              command: "validate"

  - stage: Plan
    displayName: "Terraform Plan"
    dependsOn: Validate
    jobs:
      - job: Plan
        displayName: "Generate execution plan"
        steps:
          - task: TerraformInstaller@1
            inputs:
              terraformVersion: $(TF_VERSION)

          - task: TerraformTaskV4@4
            displayName: "Terraform init"
            inputs:
              provider: "azurerm"
              command: "init"
              backendServiceArm: "contoso-terraform-sc"
              backendAzureRmResourceGroupName: "rg-contoso-tfstate"
              backendAzureRmStorageAccountName: "stcontosoterraform"
              backendAzureRmContainerName: "tfstate"
              backendAzureRmKey: "contoso-infra.tfstate"

          - task: TerraformTaskV4@4
            displayName: "Terraform plan"
            inputs:
              provider: "azurerm"
              command: "plan"
              commandOptions: "-var-file=environments/dev.tfvars -out=tfplan"
              environmentServiceNameAzureRM: "contoso-terraform-sc"

          - task: PublishPipelineArtifact@1
            displayName: "Publish plan artifact"
            inputs:
              targetPath: "$(System.DefaultWorkingDirectory)/tfplan"
              artifactName: "terraform-plan"

  - stage: Apply
    displayName: "Terraform Apply"
    dependsOn: Plan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: Apply
        displayName: "Apply to dev"
        environment: "infrastructure-dev"
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self

                - task: TerraformInstaller@1
                  inputs:
                    terraformVersion: $(TF_VERSION)

                - task: TerraformTaskV4@4
                  displayName: "Terraform init"
                  inputs:
                    provider: "azurerm"
                    command: "init"
                    backendServiceArm: "contoso-terraform-sc"
                    backendAzureRmResourceGroupName: "rg-contoso-tfstate"
                    backendAzureRmStorageAccountName: "stcontosoterraform"
                    backendAzureRmContainerName: "tfstate"
                    backendAzureRmKey: "contoso-infra.tfstate"

                - task: DownloadPipelineArtifact@2
                  displayName: "Download plan"
                  inputs:
                    artifactName: "terraform-plan"
                    targetPath: "$(System.DefaultWorkingDirectory)"

                - task: TerraformTaskV4@4
                  displayName: "Terraform apply"
                  inputs:
                    provider: "azurerm"
                    command: "apply"
                    commandOptions: "tfplan"
                    environmentServiceNameAzureRM: "contoso-terraform-sc"
```

## Task 4: Implement IaC testing strategy

Configure automated testing for both Bicep and Terraform:

```bash
# Bicep linting - configure bicepconfig.json
cat > bicepconfig.json << 'EOF'
{
  "analyzers": {
    "core": {
      "rules": {
        "no-hardcoded-env-urls": { "level": "error" },
        "no-unused-params": { "level": "warning" },
        "prefer-interpolation": { "level": "warning" },
        "secure-parameter-default": { "level": "error" },
        "simplify-interpolation": { "level": "warning" },
        "use-recent-api-versions": { "level": "warning", "maxAllowedAgeInDays": 730 }
      }
    }
  }
}
EOF

# Run Bicep linter
az bicep build --file main.bicep 2>&1 | grep -E "(Warning|Error)"

# Terraform validation commands
terraform init -backend=false
terraform validate
terraform fmt -check -recursive

# Terraform static analysis with tflint
tflint --init
tflint --recursive
```

Add a testing job to the GitHub Actions workflow:

```yaml
  test:
    name: Static analysis
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run Bicep linter
        run: |
          az bicep build --file main.bicep 2>&1
          if [ $? -ne 0 ]; then
            echo "::error::Bicep linting failed"
            exit 1
          fi

      - name: Run checkov for security scanning
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: .
          framework: bicep
          output_format: sarif
          output_file_path: results.sarif

      - name: Upload SARIF results
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

## Task 5: Implement PR workflow with plan-on-PR and apply-on-merge

Configure branch protection and the review workflow:

```bash
# Configure branch protection requiring IaC review
gh api repos/{owner}/{repo}/branches/main/protection --method PUT \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field required_status_checks='{"strict":true,"contexts":["Validate Bicep","What-if analysis"]}' \
  --field enforce_admins=true
```

The PR workflow posts what-if results as a comment (shown in Task 2). The key principle:

- On pull request: validate, lint, plan/what-if (read-only, informational)
- On merge to main: apply the changes (write operations)

This ensures every infrastructure change is peer-reviewed with full visibility of what will change before it is applied.

## Task 6: State management for Terraform

Configure secure remote state with locking:

```hcl
# State locking is automatic with azurerm backend (uses blob leases)
# To view current state:
terraform state list

# To inspect a specific resource:
terraform state show azurerm_resource_group.main

# Import existing resources into state:
terraform import azurerm_resource_group.main \
  /subscriptions/{sub-id}/resourceGroups/rg-contoso-dev

# Move state between configurations during refactoring:
terraform state mv module.old_name module.new_name
```

State management best practices for the pipeline:

```yaml
# In Azure Pipelines, use separate state files per environment
- task: TerraformTaskV4@4
  displayName: "Terraform init - $(environment)"
  inputs:
    provider: "azurerm"
    command: "init"
    backendServiceArm: "contoso-terraform-sc"
    backendAzureRmResourceGroupName: "rg-contoso-tfstate"
    backendAzureRmStorageAccountName: "stcontosoterraform"
    backendAzureRmContainerName: "tfstate"
    backendAzureRmKey: "contoso-$(environment).tfstate"
```

```bash
# Enable versioning for state recovery
az storage blob service-properties update \
  --account-name stcontosoterraform \
  --enable-versioning true

# List state file versions for recovery
az storage blob list \
  --account-name stcontosoterraform \
  --container-name tfstate \
  --include v \
  --output table
```

## Task 7: Drift detection with scheduled pipelines

Create a scheduled pipeline that detects configuration drift:

```yaml
# GitHub Actions - .github/workflows/drift-detection.yml
name: Infrastructure drift detection

on:
  schedule:
    - cron: "0 6 * * 1-5"  # Every weekday at 06:00 UTC
  workflow_dispatch:

permissions:
  id-token: write
  contents: read
  issues: write

jobs:
  detect-drift:
    name: Check for configuration drift
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Run what-if to detect drift
        id: drift
        run: |
          RESULT=$(az deployment sub what-if \
            --location eastus2 \
            --template-file main.bicep \
            --parameters environments/prod-east.bicepparam \
            --no-pretty-print 2>&1)

          if echo "$RESULT" | grep -q "noChange"; then
            echo "drift_detected=false" >> $GITHUB_OUTPUT
          else
            echo "drift_detected=true" >> $GITHUB_OUTPUT
            echo "drift_details<<EOF" >> $GITHUB_OUTPUT
            echo "$RESULT" >> $GITHUB_OUTPUT
            echo "EOF" >> $GITHUB_OUTPUT
          fi

      - name: Create issue for drift
        if: steps.drift.outputs.drift_detected == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Infrastructure drift detected - ${new Date().toISOString().split('T')[0]}`,
              body: `## Drift detection report\n\nConfiguration drift was detected in the production environment.\n\n\`\`\`\n${{ steps.drift.outputs.drift_details }}\n\`\`\`\n\nPlease investigate and either update the IaC templates or revert the manual change.`,
              labels: ['infrastructure', 'drift', 'urgent']
            });
```

For Terraform, drift detection is simpler:

```yaml
# Azure Pipelines - scheduled drift detection
schedules:
  - cron: "0 6 * * 1-5"
    displayName: "Weekday drift check"
    branches:
      include: [main]
    always: true

stages:
  - stage: DriftCheck
    jobs:
      - job: DetectDrift
        steps:
          - task: TerraformInstaller@1
            inputs:
              terraformVersion: $(TF_VERSION)

          - task: TerraformTaskV4@4
            displayName: "Terraform init"
            inputs:
              provider: "azurerm"
              command: "init"
              backendServiceArm: "contoso-terraform-sc"
              backendAzureRmResourceGroupName: "rg-contoso-tfstate"
              backendAzureRmStorageAccountName: "stcontosoterraform"
              backendAzureRmContainerName: "tfstate"
              backendAzureRmKey: "contoso-prod.tfstate"

          - task: TerraformTaskV4@4
            displayName: "Terraform plan (drift check)"
            name: plan
            inputs:
              provider: "azurerm"
              command: "plan"
              commandOptions: "-var-file=environments/prod.tfvars -detailed-exitcode"
              environmentServiceNameAzureRM: "contoso-terraform-sc"

          - script: |
              if [ $(plan.exitCode) -eq 2 ]; then
                echo "##vso[task.logissue type=warning]Drift detected in production"
                echo "##vso[task.setvariable variable=driftDetected]true"
              fi
            displayName: "Evaluate drift status"
```

## Break and fix

### Exercise 1: Fix the broken Bicep deployment

The following Bicep template and pipeline have issues. Identify and fix them:

```bicep
// BROKEN: main.bicep
targetScope = 'subscription'

param environmentName string = 'production'  // ERROR 1: Default value for prod is dangerous
param location string

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-contoso'  // ERROR 2: No environment differentiation
  location: location
}

module storage 'modules/storage.bicep' = {
  scope: resourceGroup(rg.name)  // ERROR 3: Must use rg reference directly
  name: 'storageDeployment'
  params: {
    storageAccountName: 'stcontoso${environmentName}'  // ERROR 4: May exceed 24 chars
  }
}
```

```yaml
# BROKEN: GitHub Actions workflow
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}  # ERROR 5: Using legacy auth, not OIDC

      - run: |
          az deployment sub create \
            --template-file main.bicep \
            --location eastus2
          # ERROR 6: Missing --parameters flag
```

**Corrected version:**

```bicep
// FIXED: main.bicep
targetScope = 'subscription'

@allowed(['dev', 'test', 'staging', 'prod'])
param environmentName string  // No default - must be explicitly provided

param location string = 'eastus2'

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-contoso-${environmentName}'
  location: location
}

module storage 'modules/storage.bicep' = {
  scope: rg
  name: 'storageDeployment'
  params: {
    storageAccountName: take('stcontoso${environmentName}', 24)
  }
}
```

```yaml
# FIXED: GitHub Actions workflow
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - run: |
          az deployment sub create \
            --template-file main.bicep \
            --parameters environments/dev.bicepparam \
            --location eastus2
```

### Exercise 2: Fix the Terraform state locking error

A developer reports this error when running `terraform apply`:

```
Error: Error acquiring the state lock
Lock Info:
  ID:        a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Path:      contoso-infra.tfstate
  Operation: OperationTypeApply
  Who:       runner@fv-az123-456
  Created:   2024-01-15 08:30:00.000000000 +0000 UTC
```

**Diagnosis:** A previous pipeline run crashed without releasing the state lock.

**Fix:**

```bash
# Verify the lock is stale (previous run no longer active)
az storage blob show \
  --account-name stcontosoterraform \
  --container-name tfstate \
  --name contoso-infra.tfstate \
  --query "properties.lease.status"

# Force unlock (use only when confirmed stale)
terraform force-unlock a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Prevention: Add timeout to pipeline steps to prevent indefinite hangs
# In azure-pipelines.yml:
#   timeoutInMinutes: 30
```

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the primary advantage of using 'az deployment sub what-if' in a PR pipeline?",
    options: [
      "It deploys resources to a temporary subscription for testing",
      "It shows what changes would be made without actually modifying any resources",
      "It validates the Bicep syntax and checks for compilation errors",
      "It runs the deployment in a sandbox mode that auto-reverts after 1 hour"
    ],
    correctIndex: 1,
    explanation: "The what-if operation is a read-only comparison that shows what resources would be created, modified, or deleted if the deployment were executed. This gives reviewers full visibility into the impact of infrastructure changes during code review without making any actual changes to Azure resources."
  },
  {
    question: "Which Terraform command exit code indicates that drift has been detected?",
    options: [
      "Exit code 0 (plan has no changes)",
      "Exit code 1 (plan encountered an error)",
      "Exit code 2 (plan succeeded with changes detected)",
      "Exit code 3 (plan detected destructive changes)"
    ],
    correctIndex: 2,
    explanation: "When terraform plan is run with the -detailed-exitcode flag, it returns exit code 0 for no changes, exit code 1 for errors, and exit code 2 when changes are detected. This makes it ideal for drift detection scripts that need to programmatically determine whether the actual state differs from the desired state."
  },
  {
    question: "Why should Terraform state files use a remote backend with locking in a CI/CD pipeline?",
    options: [
      "Local state files are too large for pipeline runners",
      "Remote backends provide automatic backup and encryption",
      "Multiple pipeline runs could corrupt state without locking, and the state must persist between runs",
      "Terraform requires network access to read state files"
    ],
    correctIndex: 2,
    explanation: "State files track the mapping between IaC definitions and real resources. Without a remote backend, state would be lost between pipeline runs (each run gets a fresh workspace). Without locking, concurrent runs could read/write state simultaneously, leading to corruption or duplicate resource creation."
  },
  {
    question: "In a Bicep module architecture, what is the recommended approach for environment-specific values?",
    options: [
      "Use conditional logic with 'if' statements inside the module",
      "Create separate Bicep files for each environment",
      "Use parameter files ('.bicepparam') per environment with a shared template",
      "Hard-code environment values in the module and use deployment names to differentiate"
    ],
    correctIndex: 2,
    explanation: "The recommended pattern is a single set of Bicep templates with environment-specific .bicepparam files that provide different values (SKUs, instance counts, feature flags) per environment. This ensures the infrastructure structure is consistent while allowing configuration to vary, reducing duplication and drift between environment definitions."
  }
]} />

## Cleanup

```bash
# Remove deployed resource groups (if testing)
az group delete --name rg-contoso-dev --yes --no-wait
az group delete --name rg-contoso-test --yes --no-wait

# Remove Terraform state storage (if no longer needed)
az group delete --name rg-contoso-tfstate --yes --no-wait

# Remove GitHub environments
gh api --method DELETE repos/{owner}/{repo}/environments/infrastructure-dev
gh api --method DELETE repos/{owner}/{repo}/environments/infrastructure-prod

# Clean up Terraform local files
rm -rf .terraform/
rm -f tfplan
rm -f .terraform.lock.hcl
```
