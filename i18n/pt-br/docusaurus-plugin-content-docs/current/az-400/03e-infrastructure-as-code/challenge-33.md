---
sidebar_position: 3
title: "Desafio 33: Azure Deployment Environments"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 33: Azure Deployment Environments

:::info Plataforma: ADO-first
Este desafio foca em Azure DevOps Pipelines. Equivalentes no GitHub Actions são mencionados quando relevante.
:::

## Habilidades do exame mapeadas

- Projetar e implementar Azure Deployment Environments para auto-deploy sob demanda

## Cenário

A Contoso Ltd tem 40 desenvolvedores trabalhando em uma plataforma de microsserviços. Atualmente, solicitar um ambiente de dev/test envolve abrir um ticket de TI e esperar de 3 a 5 dias úteis para que a operação provisione os recursos manualmente. Esse gargalo causa:

- Desenvolvedores compartilhando ambientes, levando a conflitos e configurações quebradas
- Ambientes de longa duração caros que ficam ociosos 80% do tempo
- Inconsistência entre ambientes de desenvolvimento e produção
- Shadow IT: desenvolvedores provisionando seus próprios recursos fora dos controles de governança

A equipe de engenharia de plataforma precisa implementar provisionamento de ambientes por autoatendimento onde os desenvolvedores possam criar ambientes totalmente configurados sob demanda, com proteções para controle de custos e conformidade.

## Tarefa 1: Criar um Dev Center e Projeto

Configure a infraestrutura do Azure Deployment Environments:

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

## Tarefa 2: Definir tipos de ambiente (Dev, Test, Staging)

Crie tipos de ambiente que mapeiam para assinaturas Azure com políticas diferentes:

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

## Tarefa 3: Criar definições de ambiente (templates IaC no catálogo)

Crie templates Bicep que definem como um ambiente se apresenta:

```text
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

Defina o ambiente WebApp:

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

Defina o ambiente Microservice para cargas de trabalho conteinerizadas:

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

## Tarefa 4: Configurar catálogo a partir de repositório GitHub

Conecte o Dev Center a um repositório GitHub contendo definições de ambiente:

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

Para catálogo do Azure DevOps:

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

## Tarefa 5: Portal de autoatendimento para desenvolvedores

Os desenvolvedores podem criar ambientes via CLI, Developer Portal ou API:

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

O Developer Portal (https://devportal.microsoft.com) fornece uma interface web onde os desenvolvedores podem:
- Navegar pelas definições de ambiente disponíveis
- Criar novos ambientes com formulários de parâmetros guiados
- Visualizar ambientes ativos e seus status
- Acessar as saídas do ambiente (URLs, credenciais)
- Excluir ambientes que possuem

## Tarefa 6: Definir limites e políticas (máximo de ambientes, agendamento de exclusão automática)

Configure controles de governança para prevenir excesso de custos:

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

Crie um Runbook do Azure Automation para limpeza agendada:

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

## Tarefa 7: Integração CI/CD (criar ambientes efêmeros por PR)

Crie um pipeline que provisiona um ambiente para cada pull request e o destrói no merge:

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

Equivalente no GitHub Actions para destruição do ambiente de PR:

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

## Exercícios de quebra e conserto

### Exercício 1: Corrigir a criação de ambiente com falha

Um desenvolvedor reporta este erro ao criar um ambiente:

```text
ERROR: The environment definition 'WebApp' was not found in catalog 'contoso-environments'.
```

**Passos de diagnóstico:**

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


<details>
<summary>Mostrar solução</summary>

**Correção:** O caminho do catálogo foi configurado incorretamente. As definições de ambiente estão na raiz do repositório, não em uma subpasta:

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

</details>

### Exercício 2: Corrigir o erro de permissão negada

Um desenvolvedor com a role "Deployment Environments User" recebe:

```text
ERROR: AuthorizationFailed - The client does not have authorization to perform action
'Microsoft.Resources/deployments/write' over scope '/subscriptions/{dev-sub-id}/...'
```


<details>
<summary>Mostrar solução</summary>

**Correção:** A identidade gerenciada do tipo de ambiente do projeto precisa de permissões na assinatura alvo:

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

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a relação entre um tipo de ambiente do Dev Center e um tipo de ambiente do projeto?",
    options: [
      "São a mesma coisa; \"tipo de ambiente do projeto\" é apenas um nome mais novo",
      "Os tipos de ambiente do Dev Center definem categorias; os tipos de ambiente do projeto mapeiam essas categorias para assinaturas e identidades específicas",
      "Os tipos do Dev Center são para produção; os tipos do projeto são para desenvolvimento",
      "Os tipos do Dev Center definem os templates IaC; os tipos do projeto definem os parâmetros"
    ],
    correctIndex: 1,
    explanation: "Os tipos de ambiente do Dev Center (Dev, Test, Staging) são categorias abstratas definidas centralmente. Os tipos de ambiente do projeto herdam desses e adicionam configuração de deploy: para qual assinatura fazer deploy, qual identidade gerenciada usar e quais roles RBAC atribuir. Essa separação permite que um único Dev Center atenda múltiplos projetos com mapeamentos de assinatura diferentes."
  },
  {
    question: "Como o Azure Deployment Environments aplica governança de custos para autoatendimento dos desenvolvedores?",
    options: [
      "Exigindo aprovação do gerente para cada criação de ambiente",
      "Através de limites máximos de ambientes por usuário, restrições de tipo de ambiente e exclusão automática agendada",
      "Limitando ambientes apenas a SKUs de camada gratuita",
      "Deduzindo custos do orçamento pessoal Azure do desenvolvedor"
    ],
    correctIndex: 1,
    explanation: "O ADE fornece múltiplos controles de governança: máximo de ambientes por usuário (definido no projeto), acesso por tipo de ambiente (qual role pode criar Staging vs Dev), restrições de parâmetros nas definições de ambiente (SKUs permitidas) e políticas organizacionais para expiração automática. Esses garantem que os desenvolvedores tenham velocidade de autoatendimento enquanto permanecem dentro dos limites de custo."
  },
  {
    question: "O que é um catálogo no Azure Deployment Environments?",
    options: [
      "Um marketplace de recursos Azure pré-construídos disponíveis para compra",
      "Um repositório Git contendo templates IaC (definições de ambiente) que o Dev Center sincroniza e oferece aos desenvolvedores",
      "Uma lista de serviços Azure aprovados que os desenvolvedores podem provisionar",
      "Um Azure Container Registry contendo imagens base aprovadas"
    ],
    correctIndex: 1,
    explanation: "Um catálogo é uma conexão com um repositório Git (GitHub ou Azure Repos) contendo definições de ambiente. Cada definição inclui um manifesto YAML e um template IaC (Bicep ou Terraform). O Dev Center sincroniza periodicamente o catálogo, tornando definições de ambiente novas ou atualizadas disponíveis para os desenvolvedores através do portal ou CLI."
  },
  {
    question: "Qual é o principal benefício de criar ambientes efêmeros por pull request?",
    options: [
      "Elimina a necessidade de revisão de código pois os ambientes são testados automaticamente",
      "Fornece ambientes isolados e semelhantes Ã  produção para testar alterações do PR sem afetar ambientes compartilhados",
      "Reduz o número de branches no repositório",
      "Faz merge automático de pull requests quando os testes passam"
    ],
    correctIndex: 1,
    explanation: "Ambientes efêmeros de PR dão a cada pull request sua própria infraestrutura isolada para testar alterações. Isso previne conflitos entre desenvolvedores compartilhando ambientes, habilita desenvolvimento paralelo e garante que o ambiente do PR esteja sempre limpo e consistente. Quando o PR sofre merge ou é fechado, o ambiente é automaticamente destruído, controlando custos."
  }
]} />

## Limpeza

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
