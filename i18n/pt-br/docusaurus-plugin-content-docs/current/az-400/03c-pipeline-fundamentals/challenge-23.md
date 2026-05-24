---
sidebar_position: 5
title: "Desafio 23: Elementos reutilizÃ¡veis de pipeline"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 23: Elementos reutilizÃ¡veis de pipeline

:::info Plataforma: comparaÃ§Ã£o
Este desafio compara padrÃµes reutilizÃ¡veis entre GitHub Actions e Azure Pipelines.
:::

## Habilidades do exame

- Criar elementos reutilizÃ¡veis de pipeline, incluindo templates YAML, task groups, variÃ¡veis e grupos de variÃ¡veis

## CenÃ¡rio

A Contoso Ltd gerencia 15 microsserviÃ§os, todos seguindo o mesmo padrÃ£o de build-test-deploy. Atualmente, cada serviÃ§o tem sua prÃ³pria definiÃ§Ã£o completa de pipeline, e uma mudanÃ§a recente na polÃ­tica de seguranÃ§a (adiÃ§Ã£o de varredura de contÃªiner) exigiu a ediÃ§Ã£o de todos os 15 arquivos. A equipe de DevOps precisa centralizar a lÃ³gica comum de pipeline em componentes reutilizÃ¡veis para reduzir a duplicaÃ§Ã£o e o esforÃ§o de manutenÃ§Ã£o.

Os serviÃ§os seguem uma estrutura padrÃ£o:

```text
contoso-{service-name}/
  src/
  tests/
  Dockerfile
  package.json (or *.csproj)
```

Todos os serviÃ§os fazem deploy para Azure Container Apps usando o mesmo padrÃ£o de staging e depois produÃ§Ã£o.

## Tarefa 1: Workflows reutilizÃ¡veis do GitHub com workflow_call

Crie um workflow reutilizÃ¡vel centralizado em um repositÃ³rio compartilhado (`contoso/.github`):

```yaml
# .github/workflows/reusable-node-ci-cd.yml
name: Reusable Node.js CI/CD

on:
  workflow_call:
    inputs:
      node-version:
        description: "Node.js version"
        required: false
        type: string
        default: "20"
      working-directory:
        description: "Working directory for the service"
        required: false
        type: string
        default: "."
      image-name:
        description: "Container image name"
        required: true
        type: string
      azure-app-name:
        description: "Azure Container App name"
        required: true
        type: string
      run-integration-tests:
        description: "Whether to run integration tests"
        required: false
        type: boolean
        default: true
    secrets:
      AZURE_CLIENT_ID:
        required: true
      AZURE_TENANT_ID:
        required: true
      AZURE_SUBSCRIPTION_ID:
        required: true
      REGISTRY_USERNAME:
        required: false
      REGISTRY_PASSWORD:
        required: false
    outputs:
      image-tag:
        description: "The published image tag"
        value: ${{ jobs.docker.outputs.image-tag }}
      test-passed:
        description: "Whether tests passed"
        value: ${{ jobs.test.outputs.result }}

env:
  REGISTRY: ghcr.io

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: "npm"
          cache-dependency-path: "${{ inputs.working-directory }}/package-lock.json"
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-${{ inputs.image-name }}
          path: ${{ inputs.working-directory }}/dist/

  test:
    name: Test
    needs: build
    runs-on: ubuntu-latest
    outputs:
      result: ${{ steps.test-result.outputs.passed }}
    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: "npm"
          cache-dependency-path: "${{ inputs.working-directory }}/package-lock.json"
      - run: npm ci
      - run: npm test
      - name: Run integration tests
        if: inputs.run-integration-tests
        run: npm run test:integration
      - name: Set test result
        id: test-result
        if: always()
        run: echo "passed=${{ job.status == 'success' }}" >> $GITHUB_OUTPUT

  docker:
    name: Build and push image
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      image-tag: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/contoso/${{ inputs.image-name }}
          tags: |
            type=sha,prefix=
            type=raw,value=latest,enable={{is_default_branch}}
      - uses: docker/build-push-action@v5
        with:
          context: ${{ inputs.working-directory }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Run container scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/contoso/${{ inputs.image-name }}:latest
          format: "sarif"
          output: "trivy-results.sarif"
          severity: "CRITICAL,HIGH"

  deploy-staging:
    name: Deploy to staging
    needs: docker
    runs-on: ubuntu-latest
    environment: staging
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - name: Deploy to Container App (staging)
        run: |
          az containerapp update \
            --name ${{ inputs.azure-app-name }}-staging \
            --resource-group contoso-staging-rg \
            --image ${{ env.REGISTRY }}/contoso/${{ inputs.image-name }}:${{ needs.docker.outputs.image-tag }}

  deploy-production:
    name: Deploy to production
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - name: Deploy to Container App (production)
        run: |
          az containerapp update \
            --name ${{ inputs.azure-app-name }} \
            --resource-group contoso-prod-rg \
            --image ${{ env.REGISTRY }}/contoso/${{ inputs.image-name }}:${{ needs.docker.outputs.image-tag }}
```

Chame o workflow reutilizÃ¡vel a partir do repositÃ³rio de cada serviÃ§o:

```yaml
# contoso-order-service/.github/workflows/ci-cd.yml
name: Order Service CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci-cd:
    uses: contoso/.github/.github/workflows/reusable-node-ci-cd.yml@main
    with:
      image-name: order-service
      azure-app-name: contoso-orders
      node-version: "20"
      run-integration-tests: true
    secrets:
      AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
      AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
      AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

## Tarefa 2: Composite actions do GitHub

Crie uma composite action para lÃ³gica compartilhada de build (usada dentro de um Ãºnico workflow ou entre repositÃ³rios):

```yaml
# contoso/.github/actions/dotnet-build-test/action.yml
name: ".NET build and test"
description: "Builds and tests a .NET project with standard Contoso configuration"

inputs:
  dotnet-version:
    description: ".NET SDK version"
    required: false
    default: "8.0.x"
  project-path:
    description: "Path to the project file"
    required: true
  test-project-path:
    description: "Path to the test project file"
    required: false
    default: ""
  configuration:
    description: "Build configuration"
    required: false
    default: "Release"

outputs:
  artifact-path:
    description: "Path to the published output"
    value: ${{ steps.publish.outputs.path }}
  test-passed:
    description: "Whether tests passed"
    value: ${{ steps.test.outputs.passed }}

runs:
  using: "composite"
  steps:
    - name: Setup .NET
      uses: actions/setup-dotnet@v4
      with:
        dotnet-version: ${{ inputs.dotnet-version }}

    - name: Restore dependencies
      shell: bash
      run: dotnet restore ${{ inputs.project-path }}

    - name: Build
      shell: bash
      run: |
        dotnet build ${{ inputs.project-path }} \
          --configuration ${{ inputs.configuration }} \
          --no-restore

    - name: Test
      id: test
      if: inputs.test-project-path != ''
      shell: bash
      run: |
        dotnet test ${{ inputs.test-project-path }} \
          --configuration ${{ inputs.configuration }} \
          --no-build \
          --logger trx \
          --collect:"XPlat Code Coverage"
        echo "passed=true" >> $GITHUB_OUTPUT

    - name: Publish
      id: publish
      shell: bash
      run: |
        OUTPUT_PATH="${{ runner.temp }}/publish"
        dotnet publish ${{ inputs.project-path }} \
          --configuration ${{ inputs.configuration }} \
          --no-build \
          --output "$OUTPUT_PATH"
        echo "path=$OUTPUT_PATH" >> $GITHUB_OUTPUT
```

Use a composite action em um workflow:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and test
        id: build
        uses: contoso/.github/actions/dotnet-build-test@main
        with:
          project-path: src/Contoso.Api/Contoso.Api.csproj
          test-project-path: tests/Contoso.Api.Tests/Contoso.Api.Tests.csproj
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: published-app
          path: ${{ steps.build.outputs.artifact-path }}
```

## Tarefa 3: Templates YAML do Azure Pipelines

Crie templates nos nÃ­veis de step, job e stage:

### Template de step

```yaml
# pipelines/templates/steps/dotnet-build.yml
parameters:
  - name: dotnetVersion
    type: string
    default: "8.0.x"
  - name: projectPath
    type: string
  - name: configuration
    type: string
    default: "Release"
  - name: publishOutput
    type: boolean
    default: true

steps:
  - task: UseDotNet@2
    displayName: "Install .NET ${{ parameters.dotnetVersion }}"
    inputs:
      packageType: "sdk"
      version: ${{ parameters.dotnetVersion }}

  - task: DotNetCoreCLI@2
    displayName: "Restore"
    inputs:
      command: "restore"
      projects: "${{ parameters.projectPath }}"

  - task: DotNetCoreCLI@2
    displayName: "Build"
    inputs:
      command: "build"
      projects: "${{ parameters.projectPath }}"
      arguments: "--configuration ${{ parameters.configuration }} --no-restore"

  - ${{ if parameters.publishOutput }}:
      - task: DotNetCoreCLI@2
        displayName: "Publish"
        inputs:
          command: "publish"
          projects: "${{ parameters.projectPath }}"
          arguments: "--configuration ${{ parameters.configuration }} --output $(Build.ArtifactStagingDirectory)/app --no-build"
          publishWebProjects: false
      - task: PublishPipelineArtifact@1
        displayName: "Upload artifact"
        inputs:
          targetPath: "$(Build.ArtifactStagingDirectory)/app"
          artifact: "drop"
```

### Template de job

```yaml
# pipelines/templates/jobs/docker-build-push.yml
parameters:
  - name: imageName
    type: string
  - name: dockerfilePath
    type: string
    default: "Dockerfile"
  - name: buildContext
    type: string
    default: "."
  - name: registry
    type: string
    default: "contoso.azurecr.io"
  - name: registryServiceConnection
    type: string
    default: "contoso-acr-connection"
  - name: tags
    type: object
    default:
      - "$(Build.BuildId)"
      - "latest"

jobs:
  - job: DockerBuildPush
    displayName: "Build and push ${{ parameters.imageName }}"
    pool:
      vmImage: "ubuntu-latest"
    steps:
      - task: Docker@2
        displayName: "Login to ACR"
        inputs:
          command: "login"
          containerRegistry: "${{ parameters.registryServiceConnection }}"

      - task: Docker@2
        displayName: "Build image"
        inputs:
          command: "build"
          repository: "${{ parameters.imageName }}"
          dockerfile: "${{ parameters.dockerfilePath }}"
          buildContext: "${{ parameters.buildContext }}"
          tags: |
            ${{ each tag in parameters.tags }}:
              ${{ tag }}

      - task: Docker@2
        displayName: "Push image"
        inputs:
          command: "push"
          repository: "${{ parameters.imageName }}"
          containerRegistry: "${{ parameters.registryServiceConnection }}"
          tags: |
            ${{ each tag in parameters.tags }}:
              ${{ tag }}

      - script: |
          echo "##vso[task.setvariable variable=imageTag;isOutput=true]$(Build.BuildId)"
        name: outputTag
        displayName: "Set image tag output"
```

### Template de stage

```yaml
# pipelines/templates/stages/deploy-container-app.yml
parameters:
  - name: environment
    type: string
  - name: azureSubscription
    type: string
  - name: resourceGroup
    type: string
  - name: containerAppName
    type: string
  - name: imageName
    type: string
  - name: imageTag
    type: string
  - name: registry
    type: string
    default: "contoso.azurecr.io"
  - name: dependsOn
    type: object
    default: []
  - name: condition
    type: string
    default: "succeeded()"

stages:
  - stage: Deploy_${{ parameters.environment }}
    displayName: "Deploy to ${{ parameters.environment }}"
    dependsOn: ${{ parameters.dependsOn }}
    condition: ${{ parameters.condition }}
    variables:
      - group: contoso-${{ parameters.environment }}
    jobs:
      - deployment: Deploy
        displayName: "Deploy ${{ parameters.containerAppName }}"
        environment: ${{ parameters.environment }}
        pool:
          vmImage: "ubuntu-latest"
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  displayName: "Deploy container revision"
                  inputs:
                    azureSubscription: ${{ parameters.azureSubscription }}
                    scriptType: "bash"
                    scriptLocation: "inlineScript"
                    inlineScript: |
                      az containerapp update \
                        --name ${{ parameters.containerAppName }} \
                        --resource-group ${{ parameters.resourceGroup }} \
                        --image ${{ parameters.registry }}/${{ parameters.imageName }}:${{ parameters.imageTag }}

                - task: AzureCLI@2
                  displayName: "Verify deployment health"
                  inputs:
                    azureSubscription: ${{ parameters.azureSubscription }}
                    scriptType: "bash"
                    scriptLocation: "inlineScript"
                    inlineScript: |
                      FQDN=$(az containerapp show \
                        --name ${{ parameters.containerAppName }} \
                        --resource-group ${{ parameters.resourceGroup }} \
                        --query "properties.configuration.ingress.fqdn" -o tsv)
                      STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${FQDN}/health")
                      if [ "$STATUS" != "200" ]; then
                        echo "Health check failed with HTTP $STATUS"
                        exit 1
                      fi
                      echo "Deployment healthy at https://${FQDN}"
```

## Tarefa 4: Uso de templates com parÃ¢metros e inserÃ§Ã£o condicional

Monte um pipeline completo a partir de templates:

```yaml
# pipelines/order-service-pipeline.yml
trigger:
  branches:
    include: [main]
  paths:
    include: [src/order-service/**]

resources:
  repositories:
    - repository: templates
      type: git
      name: ContosoPlatform/pipeline-templates
      ref: refs/heads/main

variables:
  - name: serviceName
    value: "order-service"
  - name: imageTag
    value: "$(Build.BuildId)"

stages:
  - stage: Build
    displayName: "Build"
    jobs:
      - job: BuildApp
        pool:
          vmImage: "ubuntu-latest"
        steps:
          - template: templates/steps/dotnet-build.yml@templates
            parameters:
              projectPath: "src/order-service/OrderService.csproj"
              configuration: "Release"

  - stage: Test
    displayName: "Test"
    dependsOn: Build
    jobs:
      - job: UnitTest
        pool:
          vmImage: "ubuntu-latest"
        steps:
          - template: templates/steps/dotnet-build.yml@templates
            parameters:
              projectPath: "src/order-service/OrderService.csproj"
              publishOutput: false
          - task: DotNetCoreCLI@2
            displayName: "Run tests"
            inputs:
              command: "test"
              projects: "tests/OrderService.Tests/*.csproj"
              arguments: "--no-build --logger trx"

  - stage: Docker
    displayName: "Container image"
    dependsOn: Test
    jobs:
      - template: templates/jobs/docker-build-push.yml@templates
        parameters:
          imageName: $(serviceName)
          dockerfilePath: "src/order-service/Dockerfile"
          buildContext: "src/order-service"
          tags:
            - $(Build.BuildId)
            - $(Build.SourceBranchName)
            - latest

  - template: templates/stages/deploy-container-app.yml@templates
    parameters:
      environment: "staging"
      azureSubscription: "contoso-azure-connection"
      resourceGroup: "contoso-staging-rg"
      containerAppName: "contoso-orders-staging"
      imageName: $(serviceName)
      imageTag: $(imageTag)
      dependsOn: [Docker]

  - template: templates/stages/deploy-container-app.yml@templates
    parameters:
      environment: "production"
      azureSubscription: "contoso-azure-connection"
      resourceGroup: "contoso-prod-rg"
      containerAppName: "contoso-orders"
      imageName: $(serviceName)
      imageTag: $(imageTag)
      dependsOn: [Deploy_staging]
      condition: "and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))"
```

## Tarefa 5: Grupos de variÃ¡veis e integraÃ§Ã£o com biblioteca

Configure grupos de variÃ¡veis para configuraÃ§Ã£o centralizada:

```bash
# Create variable group with inline variables
az pipelines variable-group create \
  --name "contoso-common" \
  --authorize true \
  --organization "https://dev.azure.com/contoso" \
  --project "ContosoServices" \
  --variables \
    Registry=contoso.azurecr.io \
    AzureSubscription=contoso-azure-connection \
    DotNetVersion=8.0.x

# Create environment-specific variable groups
az pipelines variable-group create \
  --name "contoso-staging" \
  --authorize true \
  --organization "https://dev.azure.com/contoso" \
  --project "ContosoServices" \
  --variables \
    ResourceGroup=contoso-staging-rg \
    AppSuffix=-staging \
    LogLevel=Debug

az pipelines variable-group create \
  --name "contoso-production" \
  --authorize true \
  --organization "https://dev.azure.com/contoso" \
  --project "ContosoServices" \
  --variables \
    ResourceGroup=contoso-prod-rg \
    AppSuffix="" \
    LogLevel=Warning
```

Referencie grupos de variÃ¡veis em templates:

```yaml
# Variables can be scoped at pipeline, stage, or job level
variables:
  - group: contoso-common  # Pipeline-wide
  - name: localVar
    value: "my-value"

stages:
  - stage: DeployStaging
    variables:
      - group: contoso-staging  # Stage-scoped
    jobs:
      - job: Deploy
        steps:
          - script: |
              echo "Registry: $(Registry)"          # From contoso-common
              echo "Resource Group: $(ResourceGroup)" # From contoso-staging
```

## Tarefa 6: Task groups versus templates YAML

Task groups sÃ£o o equivalente clÃ¡ssico de pipelines dos templates YAML:

| Recurso | Task groups (clÃ¡ssico) | Templates YAML |
|---------|----------------------|----------------|
| Interface | Designer visual | CÃ³digo (YAML) |
| Controle de versÃ£o | Embutido (rascunhos, versÃµes) | Versionamento baseado em Git |
| Compartilhamento | Dentro do projeto ou organizaÃ§Ã£o | Entre repositÃ³rios via resources |
| ParÃ¢metros | Inputs tipados na UI | ParÃ¢metros YAML com tipos |
| Aninhamento | Suportado | Suportado (templates chamando templates) |
| LÃ³gica condicional | Limitada (condiÃ§Ãµes customizadas) | Suporte completo a expressÃµes |
| Escopo de reutilizaÃ§Ã£o | Apenas nÃ­vel de step | NÃ­vel de step, job ou stage |

Convertendo um task group para um template YAML:

```yaml
# Task group equivalent in YAML (step template):
# pipelines/templates/steps/security-scan.yml
parameters:
  - name: scanType
    type: string
    default: "full"
    values:
      - quick
      - full
  - name: failOnHighSeverity
    type: boolean
    default: true

steps:
  - script: |
      echo "Running ${{ parameters.scanType }} security scan"
    displayName: "Initialize scan"

  - task: CredScan@3
    displayName: "Credential scan"
    inputs:
      scanFolder: "$(Build.SourcesDirectory)"

  - ${{ if eq(parameters.scanType, 'full') }}:
      - task: ComponentGovernanceComponentDetection@0
        displayName: "Component governance"

      - task: ContainerStructureTest@0
        displayName: "Container structure test"
        inputs:
          dockerRegistryServiceConnection: "contoso-acr-connection"

  - script: |
      if [ "${{ parameters.failOnHighSeverity }}" = "True" ]; then
        echo "Checking for high-severity findings..."
        # Parse scan results and fail if critical issues found
      fi
    displayName: "Evaluate scan results"
```

## Tarefa 7: Compartilhamento de templates entre repositÃ³rios

### GitHub: PadrÃ£o de repositÃ³rio de templates

```text
# Organization template repository structure:
contoso/.github/
  .github/
    workflows/
      reusable-node-ci-cd.yml
      reusable-dotnet-ci-cd.yml
      reusable-security-scan.yml
  actions/
    setup-node-project/
      action.yml
    dotnet-build-test/
      action.yml
    deploy-container-app/
      action.yml
```

Os serviÃ§os referenciam templates pelo caminho do repositÃ³rio:

```yaml
# In any contoso/* repository
jobs:
  build:
    uses: contoso/.github/.github/workflows/reusable-node-ci-cd.yml@v2
    # Pin to a tag/release for stability
```

### Azure DevOps: Recurso de repositÃ³rio de templates

```yaml
# In the consuming pipeline:
resources:
  repositories:
    - repository: shared-templates
      type: git
      name: ContosoOrg/pipeline-templates
      ref: refs/tags/v2.1.0  # Pin to specific version

stages:
  - template: stages/standard-deploy.yml@shared-templates
    parameters:
      serviceName: "order-service"
      environment: "production"
```

Estrutura do repositÃ³rio de templates:

```text
pipeline-templates/
  README.md
  stages/
    standard-deploy.yml
    standard-build-test.yml
  jobs/
    docker-build-push.yml
    security-scan.yml
  steps/
    dotnet-build.yml
    node-build.yml
    notify-teams.yml
  variables/
    common.yml
```

## ExercÃ­cios de quebra e conserto

### ExercÃ­cio 1: HeranÃ§a de secrets em workflow reutilizÃ¡vel

Uma chamada de workflow reutilizÃ¡vel falha porque os secrets nÃ£o estÃ£o disponÃ­veis:

```yaml
# Calling workflow
jobs:
  deploy:
    uses: contoso/.github/.github/workflows/deploy.yml@main
    with:
      environment: staging
    # ERROR: secrets not passed
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:** Passe explicitamente os secrets necessÃ¡rios ou use `secrets: inherit`:

```yaml
jobs:
  deploy:
    uses: contoso/.github/.github/workflows/deploy.yml@main
    with:
      environment: staging
    secrets: inherit  # Passes all secrets from caller to reusable workflow
    # OR pass specific secrets:
    #   AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
    #   AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
```

</details>

### ExercÃ­cio 2: Incompatibilidade de tipo de parÃ¢metro no template

Um template do Azure Pipelines falha com erro "Unexpected value":

```yaml
# Template expects:
parameters:
  - name: environments
    type: object
    default: []

# Caller provides:
- template: deploy.yml
  parameters:
    environments: "staging,production"  # ERROR: string instead of object
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:** Passe um objeto (lista), nÃ£o uma string:

```yaml
- template: deploy.yml
  parameters:
    environments:
      - staging
      - production
```

</details>

### ExercÃ­cio 3: Falha na resoluÃ§Ã£o de referÃªncia do template

```yaml
resources:
  repositories:
    - repository: templates
      type: git
      name: ContosoOrg/pipeline-templates
      ref: main  # ERROR: Should be refs/heads/main for branch reference

steps:
  - template: steps/build.yml@templates
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:** Use o caminho completo da ref:

```yaml
resources:
  repositories:
    - repository: templates
      type: git
      name: ContosoOrg/pipeline-templates
      ref: refs/heads/main
```

</details>
## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual Ã© a principal diferenÃ§a entre um workflow reutilizÃ¡vel do GitHub e uma composite action?",
    options: [
      "Workflows reutilizÃ¡veis sÃ³ podem estar no mesmo repositÃ³rio; composite actions podem ser compartilhadas",
      "Workflows reutilizÃ¡veis executam como jobs separados com seu prÃ³prio runner; composite actions executam como steps no job do chamador",
      "Composite actions suportam secrets; workflows reutilizÃ¡veis nÃ£o",
      "Workflows reutilizÃ¡veis sÃ£o limitados a 5 jobs; composite actions nÃ£o tÃªm limites"
    ],
    correctIndex: 1,
    explanation: "Um workflow reutilizÃ¡vel (disparado via workflow_call) executa como um ou mais jobs completos em seus prÃ³prios runners com workspaces independentes. Uma composite action executa como um conjunto de steps dentro do job chamador, compartilhando o runner, workspace e variÃ¡veis de ambiente. Essa distinÃ§Ã£o afeta como o estado Ã© compartilhado, o desempenho (sem spin-up de novo runner para composite), e o que cada um pode acessar."
  },
  {
    question: "No Azure Pipelines, como vocÃª referencia um template de um repositÃ³rio diferente?",
    options: [
      "Usar 'extends' com a URL do repositÃ³rio diretamente no caminho do template",
      "Declarar o repositÃ³rio em 'resources.repositories' e usar o sufixo '@alias' no caminho do template",
      "Usar declaraÃ§Ãµes 'import' no topo do arquivo YAML",
      "Arquivos de template devem estar no mesmo repositÃ³rio"
    ],
    correctIndex: 1,
    explanation: "Templates externos requerem uma declaraÃ§Ã£o de recurso de repositÃ³rio com um alias. O template Ã© entÃ£o referenciado usando a sintaxe template: path/to/file.yml@alias. O alias corresponde ao campo repository na seÃ§Ã£o resources. Isso permite fixar em refs especÃ­ficas (branches ou tags) para controle de versÃ£o."
  },
  {
    question: "O que acontece quando vocÃª usa 'secrets: inherit' em uma chamada de workflow reutilizÃ¡vel do GitHub?",
    options: [
      "Apenas secrets no nÃ­vel da organizaÃ§Ã£o sÃ£o passados",
      "Todos os secrets disponÃ­veis para o workflow chamador sÃ£o automaticamente passados para o workflow reutilizÃ¡vel",
      "Um novo conjunto de secrets Ã© gerado para o workflow reutilizÃ¡vel",
      "Apenas secrets explicitamente listados na definiÃ§Ã£o de 'secrets' do workflow reutilizÃ¡vel sÃ£o passados"
    ],
    correctIndex: 1,
    explanation: "secrets: inherit passa todos os secrets que o workflow chamador tem acesso (secrets do repositÃ³rio, secrets do environment e secrets da organizaÃ§Ã£o) para o workflow reutilizÃ¡vel. Sem secrets: inherit, vocÃª deve passar explicitamente cada secret. Note que secrets: inherit tambÃ©m passa o GITHUB_TOKEN com as permissÃµes do workflow chamador."
  },
  {
    question: "Qual tipo de template do Azure Pipelines permite definir stages reutilizÃ¡veis que incluem deployment jobs com environments?",
    options: [
      "Template de step",
      "Template de job",
      "Template de stage",
      "Template de variÃ¡vel"
    ],
    correctIndex: 2,
    explanation: "Templates de stage podem encapsular stages inteiros incluindo deployment jobs, referÃªncias de environment e portÃµes de aprovaÃ§Ã£o. Eles sÃ£o o tipo de template de mais alto nÃ­vel e podem conter jobs e steps dentro deles. Isso permite padronizar o padrÃ£o completo de deploy (environment, estratÃ©gia, verificaÃ§Ãµes de aprovaÃ§Ã£o) entre mÃºltiplos pipelines."
  }
]} />

## Limpeza

```bash
# Remove template repository files (if testing locally)
rm -rf .github/workflows/reusable-*.yml
rm -rf .github/actions/

# Azure DevOps: Delete variable groups
az pipelines variable-group list \
  --organization "https://dev.azure.com/contoso" \
  --project "ContosoServices" \
  --query "[?starts_with(name, 'contoso-')].id" -o tsv | \
  xargs -I {} az pipelines variable-group delete --group-id {} --yes \
    --organization "https://dev.azure.com/contoso" \
    --project "ContosoServices"

# Remove test pipelines
az pipelines list \
  --organization "https://dev.azure.com/contoso" \
  --project "ContosoServices" \
  --query "[?contains(name, 'order-service')].id" -o tsv | \
  xargs -I {} az pipelines delete --id {} --yes \
    --organization "https://dev.azure.com/contoso" \
    --project "ContosoServices"
```
