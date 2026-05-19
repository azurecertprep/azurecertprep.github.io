---
sidebar_position: 5
title: "Challenge 23: Reusable pipeline elements"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 23: Reusable pipeline elements

:::info Platform: comparison
This challenge compares reusable patterns across GitHub Actions and Azure Pipelines.
:::

## Exam skills mapped

- Create reusable pipeline elements, including YAML templates, task groups, variables, and variable groups

## Scenario

Contoso Ltd manages 15 microservices, all following the same build-test-deploy pattern. Currently, each service has its own complete pipeline definition, and a recent security policy change (adding container scanning) required editing all 15 files. The DevOps team needs to centralize common pipeline logic into reusable components to reduce duplication and maintenance burden.

Services follow a standard structure:

```
contoso-{service-name}/
  src/
  tests/
  Dockerfile
  package.json (or *.csproj)
```

All services deploy to Azure Container Apps via the same staging-then-production pattern.

## Task 1: GitHub reusable workflows with workflow_call

Create a centralized reusable workflow in a shared repository (`contoso/.github`):

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

Call the reusable workflow from each service repository:

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

## Task 2: GitHub composite actions

Create a composite action for shared build logic (used within a single workflow or across repos):

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

Use the composite action in a workflow:

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

## Task 3: Azure Pipelines YAML templates

Create templates at step, job, and stage levels:

### Step template

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

### Job template

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

### Stage template

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

## Task 4: Use templates with parameters and conditional insertion

Assemble a complete pipeline from templates:

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

## Task 5: Variable groups and library integration

Configure variable groups for centralized configuration:

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

Reference variable groups in templates:

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

## Task 6: Task groups versus YAML templates

Task groups are the classic pipeline equivalent of YAML templates:

| Feature | Task groups (classic) | YAML templates |
|---------|----------------------|----------------|
| Interface | Visual designer | Code (YAML) |
| Version control | Built-in (drafts, versions) | Git-based versioning |
| Sharing | Within project or organization | Across repos via resources |
| Parameters | Typed inputs in UI | YAML parameters with types |
| Nesting | Supported | Supported (templates calling templates) |
| Conditional logic | Limited (custom conditions) | Full expression support |
| Reuse scope | Step-level only | Step, job, or stage level |

Converting a task group to a YAML template:

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

## Task 7: Sharing templates across repositories

### GitHub: Template repository pattern

```
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

Services reference templates by repository path:

```yaml
# In any contoso/* repository
jobs:
  build:
    uses: contoso/.github/.github/workflows/reusable-node-ci-cd.yml@v2
    # Pin to a tag/release for stability
```

### Azure DevOps: Template repository resource

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

Template repository structure:

```
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

## Break and fix

### Exercise 1: Reusable workflow secret inheritance

A reusable workflow call fails because secrets are not available:

```yaml
# Calling workflow
jobs:
  deploy:
    uses: contoso/.github/.github/workflows/deploy.yml@main
    with:
      environment: staging
    # ERROR: secrets not passed
```

**Fix:** Explicitly pass required secrets or use `secrets: inherit`:

```yaml
jobs:
  deploy:
    uses: contoso/.github/.github/workflows/deploy.yml@main
    with:
      environment: staging
    secrets: inherit  # Passes all secrets from caller to reusable workflow
    # OR pass specific secrets:
    # secrets:
    #   AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
    #   AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
```

### Exercise 2: Template parameter type mismatch

An Azure Pipelines template fails with "Unexpected value" error:

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

**Fix:** Pass an object (list) not a string:

```yaml
- template: deploy.yml
  parameters:
    environments:
      - staging
      - production
```

### Exercise 3: Template reference resolution failure

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

**Fix:** Use the full ref path:

```yaml
resources:
  repositories:
    - repository: templates
      type: git
      name: ContosoOrg/pipeline-templates
      ref: refs/heads/main
```

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the key difference between a GitHub reusable workflow and a composite action?",
    options: [
      "Reusable workflows can only be in the same repository; composite actions can be shared",
      "Reusable workflows run as separate jobs with their own runner; composite actions run as steps in the caller's job",
      "Composite actions support secrets; reusable workflows do not",
      "Reusable workflows are limited to 5 jobs; composite actions have no limits"
    ],
    correctIndex: 1,
    explanation: "A reusable workflow (triggered via workflow_call) executes as one or more complete jobs on their own runners with independent workspaces. A composite action runs as a set of steps within the calling job, sharing the runner, workspace, and environment variables. This distinction affects how state is shared, performance (no new runner spin-up for composite), and what each can access."
  },
  {
    question: "In Azure Pipelines, how do you reference a template from a different repository?",
    options: [
      "Use 'extends' with the repository URL directly in the template path",
      "Declare the repository in 'resources.repositories' and use '@alias' suffix in the template path",
      "Use 'import' statements at the top of the YAML file",
      "Template files must be in the same repository"
    ],
    correctIndex: 1,
    explanation: "External templates require a repository resource declaration with an alias. The template is then referenced using the template: path/to/file.yml@alias syntax. The alias matches the repository field in the resources section. This allows pinning to specific refs (branches or tags) for version control."
  },
  {
    question: "What happens when you use 'secrets: inherit' in a GitHub reusable workflow call?",
    options: [
      "Only organization-level secrets are passed",
      "All secrets available to the calling workflow are automatically passed to the reusable workflow",
      "A new set of secrets is generated for the reusable workflow",
      "Only secrets explicitly listed in the reusable workflow's 'secrets' definition are passed"
    ],
    correctIndex: 1,
    explanation: "secrets: inherit passes all secrets that the calling workflow has access to (repository secrets, environment secrets, and organization secrets) to the reusable workflow. Without secrets: inherit, you must explicitly pass each secret. Note that secrets: inherit also passes GITHUB_TOKEN with the calling workflow's permissions."
  },
  {
    question: "Which Azure Pipelines template type allows you to define reusable stages that include deployment jobs with environments?",
    options: [
      "Step template",
      "Job template",
      "Stage template",
      "Variable template"
    ],
    correctIndex: 2,
    explanation: "Stage templates can encapsulate entire stages including deployment jobs, environment references, and approval gates. They are the highest-level template type and can contain jobs and steps within them. This allows standardizing the full deployment pattern (environment, strategy, approval checks) across multiple pipelines."
  }
]} />

## Cleanup

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
