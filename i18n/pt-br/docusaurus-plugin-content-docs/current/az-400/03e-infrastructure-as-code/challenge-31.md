---
sidebar_position: 1
title: "Desafio 31: Estratégia de infraestrutura como código"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 31: Estratégia de infraestrutura como código

:::info Plataforma: comparação
Este desafio abrange tanto GitHub Actions quanto Azure Pipelines para workflows de deploy de IaC.
:::

## Habilidades do exame mapeadas

- Recomendar uma tecnologia de gerenciamento de configuração para infraestrutura de aplicações
- Implementar uma estratégia de gerenciamento de configuração para infraestrutura de aplicações
- Definir uma estratégia de IaC, incluindo controle de código-fonte e automação de testes e deploy

## Cenário

A Contoso Ltd gerencia mais de 200 recursos Azure em 5 ambientes (dev, test, staging, production-east, production-west). Todas as alterações de infraestrutura foram realizadas manualmente através do Portal Azure por uma equipe de 4 engenheiros de operações. Isso levou a:

- Desvio de configuração entre ambientes (staging possui SKUs diferentes de produção)
- Nenhum rastro de auditoria sobre quem alterou o quê e quando
- 3 incidentes de produção no último trimestre causados por configurações manuais incorretas
- 2 semanas de tempo de espera para provisionamento de novos ambientes

O CTO determinou a migração para Infraestrutura como Código com testes automatizados, revisão por pares e deploy via CI/CD. A equipe deve escolher entre Bicep, Terraform e ARM templates, e então implementar um pipeline completo.

A arquitetura alvo inclui:

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

## Tarefa 1: Comparar tecnologias de IaC e criar uma matriz de decisão

Avalie Bicep, Terraform e ARM templates para os requisitos da Contoso:

| Critério | ARM templates | Bicep | Terraform |
|----------|--------------|-------|-----------|
| Curva de aprendizado | JSON verboso, íngreme | DSL simplificado, moderado | HCL, moderado |
| Suporte multi-cloud | Apenas Azure | Apenas Azure | Multi-cloud |
| Gerenciamento de estado | Stateless (Azure é a fonte de verdade) | Stateless | Requer estado remoto |
| Modularidade | Templates vinculados/aninhados | Módulos com registro | Módulos com registro |
| What-if / Plan | `az deployment what-if` | `az deployment what-if` | `terraform plan` |
| Suporte IDE | Limitado | Extensão VS Code com IntelliSense | Extensão VS Code |
| Módulos da comunidade | Azure Verified Modules | Azure Verified Modules | Terraform Registry |
| Detecção de drift | Nenhuma nativa | Nenhuma nativa | `terraform plan` detecta drift |

Para a Contoso (somente Azure, deseja detecção de drift, parte da equipe conhece HCL):

```bash
# Decision: Use Bicep for new Azure-native projects (simpler syntax, no state to manage)
# Decision: Use Terraform where drift detection or multi-cloud is needed

# Verify Bicep CLI is installed
az bicep version
az bicep upgrade

# Verify Terraform is installed
terraform version
```

## Tarefa 2: Implementar deploy Bicep via GitHub Actions

Crie uma estrutura Bicep modular com um pipeline de deploy no GitHub Actions:

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

Crie o workflow do GitHub Actions em `.github/workflows/infrastructure.yml`:

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

## Tarefa 3: Implementar Terraform com backend Azure via Azure Pipelines

Configure o Terraform com estado remoto no Azure Storage e faça deploy via Azure Pipelines:

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

Crie o YAML do Azure Pipelines em `azure-pipelines/infrastructure.yml`:

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

## Tarefa 4: Implementar estratégia de testes de IaC

Configure testes automatizados para Bicep e Terraform:

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

Adicione um job de testes ao workflow do GitHub Actions:

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

## Tarefa 5: Implementar workflow de PR com plan-on-PR e apply-on-merge

Configure proteção de branch e o workflow de revisão:

```bash
# Configure branch protection requiring IaC review
gh api repos/{owner}/{repo}/branches/main/protection --method PUT \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field required_status_checks='{"strict":true,"contexts":["Validate Bicep","What-if analysis"]}' \
  --field enforce_admins=true
```

O workflow de PR publica os resultados do what-if como um comentário (mostrado na Tarefa 2). O princípio chave:

- No pull request: validar, lint, plan/what-if (somente leitura, informativo)
- No merge para main: aplicar as alterações (operações de escrita)

Isso garante que toda alteração de infraestrutura seja revisada por pares com visibilidade completa do que será alterado antes da aplicação.

## Tarefa 6: Gerenciamento de estado para Terraform

Configure estado remoto seguro com bloqueio:

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

Melhores práticas de gerenciamento de estado para o pipeline:

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

## Tarefa 7: Detecção de drift com pipelines agendados

Crie um pipeline agendado que detecta desvios de configuração:

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

Para Terraform, a detecção de drift é mais simples:

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

## Exercícios de quebra e conserto

### Exercício 1: Corrigir o deploy Bicep com falha

O seguinte template Bicep e pipeline possuem problemas. Identifique e corrija-os:

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

**Versão corrigida:**

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

### Exercício 2: Corrigir o erro de bloqueio de estado do Terraform

Um desenvolvedor reporta este erro ao executar `terraform apply`:

```
Error: Error acquiring the state lock
Lock Info:
  ID:        a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Path:      contoso-infra.tfstate
  Operation: OperationTypeApply
  Who:       runner@fv-az123-456
  Created:   2024-01-15 08:30:00.000000000 +0000 UTC
```

**Diagnóstico:** Uma execução anterior do pipeline falhou sem liberar o bloqueio de estado.


<details>
<summary>Mostrar solução</summary>

**Correção:**

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

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a principal vantagem de usar 'az deployment sub what-if' em um pipeline de PR?",
    options: [
      "Ele faz deploy de recursos em uma assinatura temporária para testes",
      "Ele mostra quais alterações seriam feitas sem realmente modificar nenhum recurso",
      "Ele valida a sintaxe Bicep e verifica erros de compilação",
      "Ele executa o deploy em modo sandbox que reverte automaticamente após 1 hora"
    ],
    correctIndex: 1,
    explanation: "A operação what-if é uma comparação somente leitura que mostra quais recursos seriam criados, modificados ou excluídos se o deploy fosse executado. Isso dá aos revisores visibilidade completa do impacto das alterações de infraestrutura durante a revisão de código sem fazer nenhuma alteração real nos recursos Azure."
  },
  {
    question: "Qual código de saída do comando Terraform indica que drift foi detectado?",
    options: [
      "Código de saída 0 (plan não tem alterações)",
      "Código de saída 1 (plan encontrou um erro)",
      "Código de saída 2 (plan bem-sucedido com alterações detectadas)",
      "Código de saída 3 (plan detectou alterações destrutivas)"
    ],
    correctIndex: 2,
    explanation: "Quando terraform plan é executado com a flag -detailed-exitcode, ele retorna código de saída 0 para nenhuma alteração, código de saída 1 para erros e código de saída 2 quando alterações são detectadas. Isso o torna ideal para scripts de detecção de drift que precisam determinar programaticamente se o estado real difere do estado desejado."
  },
  {
    question: "Por que os arquivos de estado do Terraform devem usar um backend remoto com bloqueio em um pipeline CI/CD?",
    options: [
      "Arquivos de estado locais são grandes demais para runners de pipeline",
      "Backends remotos fornecem backup e criptografia automáticos",
      "Múltiplas execuções de pipeline podem corromper o estado sem bloqueio, e o estado deve persistir entre execuções",
      "O Terraform requer acesso à rede para ler arquivos de estado"
    ],
    correctIndex: 2,
    explanation: "Arquivos de estado rastreiam o mapeamento entre definições de IaC e recursos reais. Sem um backend remoto, o estado seria perdido entre execuções do pipeline (cada execução recebe um workspace limpo). Sem bloqueio, execuções concorrentes poderiam ler/gravar o estado simultaneamente, levando a corrupção ou criação duplicada de recursos."
  },
  {
    question: "Em uma arquitetura de módulos Bicep, qual é a abordagem recomendada para valores específicos de ambiente?",
    options: [
      "Usar lógica condicional com instruções 'if' dentro do módulo",
      "Criar arquivos Bicep separados para cada ambiente",
      "Usar arquivos de parâmetros ('.bicepparam') por ambiente com um template compartilhado",
      "Codificar valores de ambiente diretamente no módulo e usar nomes de deploy para diferenciar"
    ],
    correctIndex: 2,
    explanation: "O padrão recomendado é um conjunto único de templates Bicep com arquivos .bicepparam específicos por ambiente que fornecem valores diferentes (SKUs, contagens de instâncias, feature flags) por ambiente. Isso garante que a estrutura da infraestrutura seja consistente enquanto permite que a configuração varie, reduzindo duplicação e drift entre definições de ambiente."
  }
]} />

## Limpeza

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
