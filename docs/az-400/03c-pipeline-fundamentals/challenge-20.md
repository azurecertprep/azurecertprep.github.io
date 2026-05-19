---
sidebar_position: 2
title: "Challenge 20: Azure Pipelines YAML"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 20: Azure Pipelines YAML

:::info Platform: ADO-first
This challenge focuses on Azure Pipelines. GitHub Actions equivalents are noted where relevant.
:::

## Exam skills mapped

- Develop pipelines by using YAML
- Design and implement integration between GitHub repositories and Azure Pipelines

## Scenario

Contoso Ltd's enterprise team uses Azure DevOps for their software delivery. They maintain a .NET 8 Web API that deploys to Azure App Service across multiple environments. The team needs a multi-stage YAML pipeline that integrates with Azure Key Vault for secrets, uses templates for consistency, and connects to their GitHub repository as the source.

The repository structure:

```
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

## Task 1: Create the multi-stage pipeline

Create `pipelines/azure-pipelines.yml`:

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

## Task 2: Configure variable groups and Key Vault integration

Create variable groups linked to Azure Key Vault:

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

Variable group configuration in the pipeline:

```yaml
variables:
  # Scoped to entire pipeline
  - group: contoso-common
  # Stage-scoped variable group (declared in stage)
  - group: contoso-staging

  # Key Vault task fetches secrets at runtime
  # Secrets become pipeline variables with the same name
```

## Task 3: Create pipeline templates

Create `pipelines/templates/build-template.yml`:

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

Create `pipelines/templates/deploy-template.yml`:

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

Use templates in the main pipeline:

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

## Task 4: Configure pipeline resources

Define resources for cross-repository templates and pipeline triggers:

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

## Task 5: Connect GitHub repository as source

Configure Azure Pipelines to use a GitHub repository:

1. Create a GitHub service connection in Azure DevOps:

```bash
# Using Azure CLI with DevOps extension
az devops service-endpoint github create \
  --github-url "https://github.com" \
  --name "contoso-github-connection" \
  --organization "https://dev.azure.com/contoso" \
  --project "ContosoApi"
```

2. Configure the pipeline to use GitHub as source:

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

3. Set up status checks for pull requests:

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

## Break and fix

### Exercise 1: Template parameter errors

The following pipeline fails with template validation errors:

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

**Corrected version:**

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

### Exercise 2: Variable scope issues

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
<summary>Solution</summary>

**Fix:** Variables defined at stage level are only available within that stage. To share values across stages, use pipeline artifacts or output variables:

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
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the correct syntax to reference a Key Vault secret fetched by the AzureKeyVault@2 task?",
    options: [
      "'$(keyVault.SecretName)'",
      "'$(SecretName)'",
      "'$\{\{ variables.SecretName \}\}'",
      "'$(secrets.SecretName)'"
    ],
    correctIndex: 1,
    explanation: "The AzureKeyVault@2 task maps Key Vault secrets directly to pipeline variables using the secret's name. If the Key Vault contains a secret called SqlConnectionString, it becomes available as $(SqlConnectionString) in subsequent steps. The task flattens the secret name to a variable name directly."
  },
  {
    question: "How do you pass output variables between stages in Azure Pipelines YAML?",
    options: [
      "Use '##vso[task.setvariable]' with 'isOutput=true' and reference via 'stageDependencies'",
      "Use 'echo \"key=value\" >> $PIPELINE_OUTPUT'",
      "Write to a shared file in the artifact staging directory",
      "Use variable groups to store values at runtime"
    ],
    correctIndex: 0,
    explanation: "Cross-stage variable sharing requires setting an output variable with isOutput=true and a named step, then referencing it in the downstream stage using the stageDependencies.StageName.JobName.outputs['stepName.variableName'] expression. This is a compile-time expression using $[ ] syntax."
  },
  {
    question: "What is the key difference between '$\{\{ \}\}' and '$[ ]' expressions in Azure Pipelines?",
    options: [
      "'$\{\{ \}\}' is for templates and '$[ ]' is for variables",
      "'$\{\{ \}\}' is evaluated at compile time (template expansion) and '$[ ]' is evaluated at runtime",
      "'$\{\{ \}\}' is for YAML pipelines and '$[ ]' is for classic pipelines",
      "There is no difference; they are interchangeable"
    ],
    correctIndex: 1,
    explanation: "$\{\{ \}\} expressions are evaluated during template expansion before the pipeline runs (compile time). They can include or exclude entire steps, jobs, or stages. $[ ] expressions are evaluated at runtime and can access runtime values like output variables from previous jobs or stages. $( ) is also runtime but used for macro expansion of variables."
  },
  {
    question: "When using a 'deployment' job with 'strategy: runOnce', what does the 'environment' property enable?",
    options: [
      "It automatically provisions Azure resources",
      "It provides deployment history, manual approvals, and checks configured on that environment",
      "It sets environment variables for the job",
      "It determines which variable group to use"
    ],
    correctIndex: 1,
    explanation: "The environment property in a deployment job links the deployment to an Azure DevOps environment resource. This enables deployment history tracking, manual approval gates, exclusive locks, and other checks configured on the environment in Azure DevOps. It does not provision resources or set variables automatically."
  }
]} />

## Cleanup

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
