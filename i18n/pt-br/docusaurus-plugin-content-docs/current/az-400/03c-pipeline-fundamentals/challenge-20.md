---
sidebar_position: 2
title: "Desafio 20: Azure Pipelines YAML"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 20: Azure Pipelines YAML

:::info Plataforma: ADO-first
Este desafio foca em Azure Pipelines. Equivalentes no GitHub Actions sÃ£o mencionados quando relevante.
:::

## Habilidades do exame

- Desenvolver pipelines usando YAML
- Projetar e implementar a integraÃ§Ã£o entre repositÃ³rios GitHub e Azure Pipelines

## CenÃ¡rio

A equipe enterprise da Contoso Ltd usa o Azure DevOps para sua entrega de software. Eles mantÃªm uma Web API em .NET 8 que Ã© implantada no Azure App Service em mÃºltiplos ambientes. A equipe precisa de um pipeline YAML multi-stage que se integre com o Azure Key Vault para secrets, use templates para consistÃªncia e se conecte ao repositÃ³rio GitHub como fonte.

A estrutura do repositÃ³rio:

```text
contoso-webapi/
  src/
    Contoso.Api/
      Contoso.Api.csproj
      Program.cs
      Controllers/
    Contoso.Api.Tests/
      Contoso.Api.Tests.csproj
  infra/
    main.bicep
    parameters/
      staging.json
      production.json
  pipelines/
    azure-pipelines.yml
    templates/
      build-template.yml
      deploy-template.yml
      test-template.yml
  nuget.config
  Contoso.Api.sln
```

## Tarefa 1: Criar o pipeline multi-stage

Crie `pipelines/azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - main
      - release/*
  paths:
    exclude:
      - docs/**
      - "*.md"

pr:
  branches:
    include:
      - main
  paths:
    include:
      - src/**
      - pipelines/**

pool:
  vmImage: "ubuntu-latest"

variables:
  - group: contoso-common
  - name: buildConfiguration
    value: "Release"
  - name: dotnetVersion
    value: "8.0.x"
  - name: projectPath
    value: "src/Contoso.Api/Contoso.Api.csproj"
  - name: testProjectPath
    value: "src/Contoso.Api.Tests/Contoso.Api.Tests.csproj"

stages:
  - stage: Build
    displayName: "Build and package"
    jobs:
      - job: BuildJob
        displayName: "Build .NET application"
        steps:
          - task: UseDotNet@2
            displayName: "Install .NET SDK"
            inputs:
              packageType: "sdk"
              version: $(dotnetVersion)

          - task: DotNetCoreCLI@2
            displayName: "Restore NuGet packages"
            inputs:
              command: "restore"
              projects: "**/*.csproj"
              feedsToUse: "config"
              nugetConfigPath: "nuget.config"

          - task: DotNetCoreCLI@2
            displayName: "Build solution"
            inputs:
              command: "build"
              projects: "$(projectPath)"
              arguments: "--configuration $(buildConfiguration) --no-restore"

          - task: DotNetCoreCLI@2
            displayName: "Publish application"
            inputs:
              command: "publish"
              projects: "$(projectPath)"
              arguments: "--configuration $(buildConfiguration) --output $(Build.ArtifactStagingDirectory)/app --no-build"
              publishWebProjects: false

          - task: PublishPipelineArtifact@1
            displayName: "Publish build artifact"
            inputs:
              targetPath: "$(Build.ArtifactStagingDirectory)/app"
              artifact: "drop"
              publishLocation: "pipeline"

          - task: PublishPipelineArtifact@1
            displayName: "Publish infrastructure artifact"
            inputs:
              targetPath: "infra"
              artifact: "infra"
              publishLocation: "pipeline"

  - stage: Test
    displayName: "Run tests"
    dependsOn: Build
    jobs:
      - job: UnitTests
        displayName: "Unit tests"
        steps:
          - task: UseDotNet@2
            inputs:
              packageType: "sdk"
              version: $(dotnetVersion)

          - task: DotNetCoreCLI@2
            displayName: "Run unit tests"
            inputs:
              command: "test"
              projects: "$(testProjectPath)"
              arguments: "--configuration $(buildConfiguration) --collect:\"XPlat Code Coverage\" --logger trx --results-directory $(Agent.TempDirectory)/testresults"

          - task: PublishTestResults@2
            displayName: "Publish test results"
            condition: always()
            inputs:
              testResultsFormat: "VSTest"
              testResultsFiles: "**/*.trx"
              searchFolder: "$(Agent.TempDirectory)/testresults"
              mergeTestResults: true

          - task: PublishCodeCoverageResults@2
            displayName: "Publish code coverage"
            inputs:
              summaryFileLocation: "$(Agent.TempDirectory)/testresults/**/coverage.cobertura.xml"

  - stage: DeployStaging
    displayName: "Deploy to staging"
    dependsOn: Test
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    variables:
      - group: contoso-staging
    jobs:
      - deployment: DeployStagingJob
        displayName: "Deploy to staging environment"
        environment: "contoso-staging"
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureKeyVault@2
                  displayName: "Fetch secrets from Key Vault"
                  inputs:
                    azureSubscription: "contoso-azure-connection"
                    KeyVaultName: "kv-contoso-staging"
                    SecretsFilter: "SqlConnectionString,AppInsightsKey"
                    RunAsPreJob: false

                - task: AzureRmWebAppDeployment@4
                  displayName: "Deploy to App Service"
                  inputs:
                    ConnectionType: "AzureRM"
                    azureSubscription: "contoso-azure-connection"
                    appType: "webApp"
                    WebAppName: "contoso-api-staging"
                    packageForLinux: "$(Pipeline.Workspace)/drop/**/*.zip"
                    AppSettings: >-
                      -ConnectionStrings__Default "$(SqlConnectionString)"
                      -APPLICATIONINSIGHTS_CONNECTION_STRING "$(AppInsightsKey)"
                      -ASPNETCORE_ENVIRONMENT "Staging"

                - script: |
                    echo "Running smoke tests against staging..."
                    for i in $(seq 1 10); do
                      STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://contoso-api-staging.azurewebsites.net/health)
                      if [ "$STATUS" = "200" ]; then
                        echo "Staging health check passed"
                        exit 0
                      fi
                      echo "Attempt $i: HTTP $STATUS, retrying in 10s..."
                      sleep 10
                    done
                    echo "Staging health check failed after 10 attempts"
                    exit 1
                  displayName: "Run smoke tests"

  - stage: DeployProduction
    displayName: "Deploy to production"
    dependsOn: DeployStaging
    condition: succeeded()
    variables:
      - group: contoso-production
    jobs:
      - deployment: DeployProductionJob
        displayName: "Deploy to production environment"
        environment: "contoso-production"
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureKeyVault@2
                  displayName: "Fetch secrets from Key Vault"
                  inputs:
                    azureSubscription: "contoso-azure-connection"
                    KeyVaultName: "kv-contoso-prod"
                    SecretsFilter: "SqlConnectionString,AppInsightsKey"
                    RunAsPreJob: false

                - task: AzureRmWebAppDeployment@4
                  displayName: "Deploy to App Service"
                  inputs:
                    ConnectionType: "AzureRM"
                    azureSubscription: "contoso-azure-connection"
                    appType: "webApp"
                    WebAppName: "contoso-api-prod"
                    packageForLinux: "$(Pipeline.Workspace)/drop/**/*.zip"
                    AppSettings: >-
                      -ConnectionStrings__Default "$(SqlConnectionString)"
                      -APPLICATIONINSIGHTS_CONNECTION_STRING "$(AppInsightsKey)"
                      -ASPNETCORE_ENVIRONMENT "Production"
                    deployToSlotOrASE: true
                    SlotName: "canary"

                - script: |
                    echo "Validating canary slot..."
                    STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://contoso-api-prod-canary.azurewebsites.net/health)
                    if [ "$STATUS" != "200" ]; then
                      echo "Canary health check failed with HTTP $STATUS"
                      exit 1
                    fi
                    echo "Canary is healthy, proceeding with swap"
                  displayName: "Validate canary slot"

                - task: AzureCLI@2
                  displayName: "Swap canary to production"
                  inputs:
                    azureSubscription: "contoso-azure-connection"
                    scriptType: "bash"
                    scriptLocation: "inlineScript"
                    inlineScript: |
                      az webapp deployment slot swap \
                        --resource-group contoso-rg \
                        --name contoso-api-prod \
                        --slot canary \
                        --target-slot production
```

## Tarefa 2: Configurar variable groups e integraÃ§Ã£o com Key Vault

Crie variable groups vinculados ao Azure Key Vault:

```bash
# Create a variable group linked to Key Vault
az pipelines variable-group create \
  --name "contoso-staging" \
  --authorize true \
  --organization "https://dev.azure.com/contoso" \
  --project "ContosoApi" \
  --variables Environment=Staging Region=eastus

# Link an existing variable group to Key Vault (via UI or REST API)
# In Azure DevOps: Pipelines > Library > + Variable group
# Enable "Link secrets from an Azure key vault as variables"
# Select service connection, Key Vault, and secret names
```

ConfiguraÃ§Ã£o do variable group no pipeline:

```yaml
variables:
  # Scoped to entire pipeline
  - group: contoso-common
  # Stage-scoped variable group (declared in stage)
  - group: contoso-staging

  # Key Vault task fetches secrets at runtime
  # Secrets become pipeline variables with the same name
```

## Tarefa 3: Criar templates de pipeline

Crie `pipelines/templates/build-template.yml`:

```yaml
parameters:
  - name: dotnetVersion
    type: string
    default: "8.0.x"
  - name: buildConfiguration
    type: string
    default: "Release"
  - name: projectPath
    type: string
  - name: publishArtifact
    type: boolean
    default: true

steps:
  - task: UseDotNet@2
    displayName: "Install .NET SDK ${{ parameters.dotnetVersion }}"
    inputs:
      packageType: "sdk"
      version: ${{ parameters.dotnetVersion }}

  - task: DotNetCoreCLI@2
    displayName: "Restore packages"
    inputs:
      command: "restore"
      projects: "${{ parameters.projectPath }}"

  - task: DotNetCoreCLI@2
    displayName: "Build project"
    inputs:
      command: "build"
      projects: "${{ parameters.projectPath }}"
      arguments: "--configuration ${{ parameters.buildConfiguration }} --no-restore"

  - ${{ if parameters.publishArtifact }}:
      - task: DotNetCoreCLI@2
        displayName: "Publish application"
        inputs:
          command: "publish"
          projects: "${{ parameters.projectPath }}"
          arguments: "--configuration ${{ parameters.buildConfiguration }} --output $(Build.ArtifactStagingDirectory)/app --no-build"
          publishWebProjects: false

      - task: PublishPipelineArtifact@1
        displayName: "Upload artifact"
        inputs:
          targetPath: "$(Build.ArtifactStagingDirectory)/app"
          artifact: "drop"
```

Crie `pipelines/templates/deploy-template.yml`:

```yaml
parameters:
  - name: environment
    type: string
  - name: azureSubscription
    type: string
  - name: appName
    type: string
  - name: keyVaultName
    type: string
  - name: slot
    type: string
    default: ""
  - name: swapSlot
    type: boolean
    default: false

jobs:
  - deployment: Deploy_${{ parameters.environment }}
    displayName: "Deploy to ${{ parameters.environment }}"
    environment: ${{ parameters.environment }}
    strategy:
      runOnce:
        deploy:
          steps:
            - task: AzureKeyVault@2
              displayName: "Fetch secrets"
              inputs:
                azureSubscription: ${{ parameters.azureSubscription }}
                KeyVaultName: ${{ parameters.keyVaultName }}
                SecretsFilter: "*"
                RunAsPreJob: false

            - task: AzureRmWebAppDeployment@4
              displayName: "Deploy to ${{ parameters.appName }}"
              inputs:
                ConnectionType: "AzureRM"
                azureSubscription: ${{ parameters.azureSubscription }}
                appType: "webApp"
                WebAppName: ${{ parameters.appName }}
                packageForLinux: "$(Pipeline.Workspace)/drop/**/*.zip"
                ${{ if ne(parameters.slot, '') }}:
                  deployToSlotOrASE: true
                  SlotName: ${{ parameters.slot }}

            - ${{ if parameters.swapSlot }}:
                - task: AzureCLI@2
                  displayName: "Swap ${{ parameters.slot }} to production"
                  inputs:
                    azureSubscription: ${{ parameters.azureSubscription }}
                    scriptType: "bash"
                    scriptLocation: "inlineScript"
                    inlineScript: |
                      az webapp deployment slot swap \
                        --resource-group contoso-rg \
                        --name ${{ parameters.appName }} \
                        --slot ${{ parameters.slot }} \
                        --target-slot production
```

Use templates no pipeline principal:

```yaml
stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - template: templates/build-template.yml
            parameters:
              dotnetVersion: "8.0.x"
              projectPath: "src/Contoso.Api/Contoso.Api.csproj"

  - stage: DeployStaging
    dependsOn: Build
    jobs:
      - template: templates/deploy-template.yml
        parameters:
          environment: "contoso-staging"
          azureSubscription: "contoso-azure-connection"
          appName: "contoso-api-staging"
          keyVaultName: "kv-contoso-staging"

  - stage: DeployProduction
    dependsOn: DeployStaging
    jobs:
      - template: templates/deploy-template.yml
        parameters:
          environment: "contoso-production"
          azureSubscription: "contoso-azure-connection"
          appName: "contoso-api-prod"
          keyVaultName: "kv-contoso-prod"
          slot: "canary"
          swapSlot: true
```

## Tarefa 4: Configurar recursos do pipeline

Defina recursos para templates entre repositÃ³rios e triggers de pipeline:

```yaml
resources:
  repositories:
    - repository: templates
      type: github
      name: contoso/pipeline-templates
      ref: refs/heads/main
      endpoint: contoso-github-connection
    - repository: infra
      type: git
      name: ContosoInfra
      ref: refs/heads/main

  pipelines:
    - pipeline: infrastructurePipeline
      source: "Contoso-Infrastructure-Deploy"
      trigger:
        branches:
          include:
            - main

  containers:
    - container: build-tools
      image: contoso.azurecr.io/build-tools:latest
      endpoint: contoso-acr-connection

# Using a template from external repository
stages:
  - stage: Build
    jobs:
      - job: BuildJob
        container: build-tools
        steps:
          - template: dotnet/build.yml@templates
            parameters:
              projectPath: "src/Contoso.Api/Contoso.Api.csproj"
```

## Tarefa 5: Conectar repositÃ³rio GitHub como fonte

Configure o Azure Pipelines para usar um repositÃ³rio GitHub:

1. Crie uma conexÃ£o de serviÃ§o GitHub no Azure DevOps:

```bash
# Using Azure CLI with DevOps extension
az devops service-endpoint github create \
  --github-url "https://github.com" \
  --name "contoso-github-connection" \
  --organization "https://dev.azure.com/contoso" \
  --project "ContosoApi"
```

2. Configure o pipeline para usar o GitHub como fonte:

```yaml
resources:
  repositories:
    - repository: self
      type: github
      name: contoso/contoso-webapi
      endpoint: contoso-github-connection
      trigger:
        branches:
          include:
            - main
            - release/*

# The checkout step uses the GitHub repo
steps:
  - checkout: self
    fetchDepth: 0
    persistCredentials: true
```

3. Configure status checks para pull requests:

```yaml
pr:
  branches:
    include:
      - main
  paths:
    include:
      - src/**
  drafts: false
```

## ExercÃ­cios de quebra e conserto

### ExercÃ­cio 1: Erros de parÃ¢metro em template

O pipeline a seguir falha com erros de validaÃ§Ã£o de template:

```yaml
# templates/broken-template.yml
parameters:
  - name: environment
    type: string
    values:           # ERROR 1: 'values' should be 'allowed' for enum validation
      - dev
      - staging
      - prod
  - name: runTests
    type: bool        # ERROR 2: type should be 'boolean', not 'bool'
    default: true

steps:
  - script: echo "Deploying to ${{ parameters.environment }}"
  - ${{ if eq(parameters.runTests, 'true') }}:  # ERROR 3: boolean comparison should not use quotes
      - script: echo "Running tests"
```

**VersÃ£o corrigida:**

```yaml
parameters:
  - name: environment
    type: string
    values:
      - dev
      - staging
      - prod
  - name: runTests
    type: boolean
    default: true

steps:
  - script: echo "Deploying to ${{ parameters.environment }}"
  - ${{ if eq(parameters.runTests, true) }}:
      - script: echo "Running tests"
```

### ExercÃ­cio 2: Problemas de escopo de variÃ¡veis

```yaml
variables:
  - group: contoso-common

stages:
  - stage: Build
    variables:
      buildOutput: "$(Build.ArtifactStagingDirectory)"  # This works
    jobs:
      - job: BuildJob
        steps:
          - script: echo $(buildOutput)  # Works - stage variable

  - stage: Deploy
    jobs:
      - job: DeployJob
        steps:
          - script: echo $(buildOutput)  # ERROR: buildOutput not available here
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:** VariÃ¡veis definidas no nÃ­vel de stage sÃ³ estÃ£o disponÃ­veis dentro daquele stage. Para compartilhar valores entre stages, use pipeline artifacts ou output variables:

```yaml
stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - script: |
              echo "##vso[task.setvariable variable=buildVersion;isOutput=true]1.2.3"
            name: setVersion

  - stage: Deploy
    dependsOn: Build
    variables:
      buildVersion: $[ stageDependencies.Build.BuildJob.outputs['setVersion.buildVersion'] ]
    jobs:
      - job: DeployJob
        steps:
          - script: echo $(buildVersion)
```

</details>
## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual Ã© a sintaxe correta para referenciar um secret do Key Vault obtido pela task AzureKeyVault@2?",
    options: [
      "'$(keyVault.SecretName)'",
      "'$(SecretName)'",
      "'${{ variables.SecretName }}'",
      "'$(secrets.SecretName)'"
    ],
    correctIndex: 1,
    explanation: "A task AzureKeyVault@2 mapeia secrets do Key Vault diretamente para variÃ¡veis do pipeline usando o nome do secret. Se o Key Vault contÃ©m um secret chamado SqlConnectionString, ele fica disponÃ­vel como $(SqlConnectionString) nos steps subsequentes. A task simplifica o nome do secret para um nome de variÃ¡vel diretamente."
  },
  {
    question: "Como vocÃª passa output variables entre stages no Azure Pipelines YAML?",
    options: [
      "Usar '##vso[task.setvariable]' com 'isOutput=true' e referenciar via 'stageDependencies'",
      "Usar 'echo \"key=value\" >> $PIPELINE_OUTPUT'",
      "Escrever em um arquivo compartilhado no artifact staging directory",
      "Usar variable groups para armazenar valores em tempo de execuÃ§Ã£o"
    ],
    correctIndex: 0,
    explanation: "O compartilhamento de variÃ¡veis entre stages requer definir uma output variable com isOutput=true e um step nomeado, depois referenciÃ¡-la no stage downstream usando a expressÃ£o stageDependencies.StageName.JobName.outputs['stepName.variableName']. Esta Ã© uma expressÃ£o em tempo de compilaÃ§Ã£o usando a sintaxe $[ ]."
  },
  {
    question: "Qual Ã© a diferenÃ§a principal entre expressÃµes '${{ }}' e '$[ ]' no Azure Pipelines?",
    options: [
      "'${{ }}' Ã© para templates e '$[ ]' Ã© para variÃ¡veis",
      "'${{ }}' Ã© avaliada em tempo de compilaÃ§Ã£o (expansÃ£o de template) e '$[ ]' Ã© avaliada em tempo de execuÃ§Ã£o",
      "'${{ }}' Ã© para pipelines YAML e '$[ ]' Ã© para pipelines clÃ¡ssicos",
      "NÃ£o hÃ¡ diferenÃ§a; sÃ£o intercambiÃ¡veis"
    ],
    correctIndex: 1,
    explanation: "ExpressÃµes ${{ }} sÃ£o avaliadas durante a expansÃ£o de template antes do pipeline executar (tempo de compilaÃ§Ã£o). Elas podem incluir ou excluir steps, jobs ou stages inteiros. ExpressÃµes $[ ] sÃ£o avaliadas em tempo de execuÃ§Ã£o e podem acessar valores de runtime como output variables de jobs ou stages anteriores. $( ) tambÃ©m Ã© runtime, mas usado para expansÃ£o de macro de variÃ¡veis."
  },
  {
    question: "Ao usar um job 'deployment' com 'strategy: runOnce', o que a propriedade 'environment' habilita?",
    options: [
      "Provisiona automaticamente recursos do Azure",
      "Fornece histÃ³rico de deploy, aprovaÃ§Ãµes manuais e verificaÃ§Ãµes configuradas naquele environment",
      "Define variÃ¡veis de ambiente para o job",
      "Determina qual variable group usar"
    ],
    correctIndex: 1,
    explanation: "A propriedade environment em um deployment job vincula o deploy a um recurso de environment do Azure DevOps. Isso habilita rastreamento de histÃ³rico de deploy, gates de aprovaÃ§Ã£o manual, locks exclusivos e outras verificaÃ§Ãµes configuradas no environment no Azure DevOps. Ela nÃ£o provisiona recursos nem define variÃ¡veis automaticamente."
  }
]} />

## Limpeza

```bash
# Delete the pipeline
az pipelines delete --id <pipeline-id> \
  --organization "https://dev.azure.com/contoso" \
  --project "ContosoApi" --yes

# Remove service connection
az devops service-endpoint delete --id <endpoint-id> \
  --organization "https://dev.azure.com/contoso" \
  --project "ContosoApi" --yes

# Delete variable groups
az pipelines variable-group delete --group-id <group-id> \
  --organization "https://dev.azure.com/contoso" \
  --project "ContosoApi" --yes

# Remove environment
# (Done via Azure DevOps UI: Pipelines > Environments > select > delete)
```
