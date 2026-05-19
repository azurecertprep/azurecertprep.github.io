---
sidebar_position: 4
title: "Challenge 37: Migrate classic to YAML"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 37: Migrate classic to YAML

:::info Platform: ADO-first
This challenge is specific to Azure DevOps Pipelines migration from classic (GUI) editor to YAML.
:::

## Exam skills mapped

- Migrate a pipeline from classic to YAML in Azure Pipelines

## Scenario

Contoso Ltd has 20 classic (GUI-based) build and release pipelines in Azure DevOps. These pipelines were created over the past 4 years and include:

- 8 classic build definitions (CI)
- 12 classic release definitions (CD) with multiple stages and gates
- Shared task groups used across pipelines
- Variable groups with environment-specific secrets
- Deployment groups for on-premises VM deployments

Microsoft recommends YAML pipelines for version control, code review, and template reuse. Contoso's DevOps team must migrate systematically without disrupting active deployments.

Current classic pipeline structure:

```
Classic Build: "Contoso API - CI"
  - Agent pool: Azure Pipelines (ubuntu-latest)
  - Triggers: CI on main, PR validation
  - Steps: npm install, lint, test, build, publish artifact

Classic Release: "Contoso API - CD"
  - Artifacts: From "Contoso API - CI" build
  - Stage 1: Dev (auto-deploy, no gates)
  - Stage 2: Staging (auto-deploy, pre-gate: Azure Monitor alerts check)
  - Stage 3: Production (manual approval + gate: 4-hour wait + query work items)
  - Deployment group: "contoso-prod-servers" (for hybrid deployments)
```

## Task 1: Export classic pipeline to YAML (built-in feature)

Use the built-in export functionality available in Azure DevOps:

```
Steps to export a classic build pipeline:
1. Navigate to Pipelines > [Select classic pipeline]
2. Click "Edit"
3. Click the three dots menu (...)
4. Select "Export to YAML" (if available in your Azure DevOps version)
5. Review the generated YAML

Note: The "View YAML" button on individual tasks shows the YAML equivalent
of each task, which you can combine manually.
```

For builds where the export feature is not available, manually convert by examining each task:

```bash
# List all classic build definitions in the project
az pipelines list \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI \
  --query "[?type=='build'].{Id:id, Name:name, Type:type}" \
  --output table

# Get details of a specific classic build definition
az pipelines show \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI \
  --id 42 \
  --query "{Name:name, Triggers:triggers, Variables:variables, Process:process}"
```

The exported/converted YAML for the classic build:

```yaml
# azure-pipelines/ci.yml - Converted from classic "Contoso API - CI"
trigger:
  branches:
    include:
      - main
  paths:
    exclude:
      - "**/*.md"

pr:
  branches:
    include:
      - main

pool:
  vmImage: "ubuntu-latest"

variables:
  - group: contoso-api-variables  # Linked variable group from classic
  - name: buildConfiguration
    value: "Release"
  - name: nodeVersion
    value: "20.x"

steps:
  - task: NodeTool@0
    displayName: "Use Node.js $(nodeVersion)"
    inputs:
      versionSpec: $(nodeVersion)

  - script: npm ci
    displayName: "Install dependencies"

  - script: npm run lint
    displayName: "Run linter"

  - script: npm run test -- --ci --coverage
    displayName: "Run tests"

  - task: PublishTestResults@2
    displayName: "Publish test results"
    condition: always()
    inputs:
      testResultsFormat: "JUnit"
      testResultsFiles: "**/junit.xml"

  - task: PublishCodeCoverageResults@2
    displayName: "Publish coverage"
    inputs:
      summaryFileLocation: "coverage/cobertura-coverage.xml"

  - script: npm run build
    displayName: "Build application"

  - task: PublishPipelineArtifact@1
    displayName: "Publish build artifact"
    inputs:
      targetPath: "$(System.DefaultWorkingDirectory)/dist"
      artifactName: "api-build"
```

## Task 2: Map classic concepts to YAML equivalents

Reference table for migration:

| Classic concept | YAML equivalent |
|----------------|-----------------|
| Build definition | `trigger`, `pool`, `steps` in a YAML file |
| Release definition | Multi-stage YAML pipeline with `stages` |
| Release stages | `stages:` with `- stage:` blocks |
| Environment (classic) | `environment:` in deployment jobs |
| Artifacts source | `resources: pipelines:` or same-pipeline artifacts |
| Pre-deployment approvals | Environment approvals and checks |
| Pre-deployment gates | Environment checks (Invoke REST API, Azure Monitor) |
| Deployment groups | `environment:` with VM resources |
| Task groups | YAML templates (`template:`) |
| Variable groups | `variables: - group:` reference |
| Agent phases | `jobs:` with different `pool:` settings |
| Parallel deployment | `strategy: parallel:` or matrix |

## Task 3: Convert release gates to YAML environment checks

Classic release gates become environment checks in YAML:

```yaml
# First, configure the environment in Azure DevOps UI:
# Environments > production > Approvals and checks > Add:
#   1. Approvals: Require 2 approvers from "Release Managers" group
#   2. Business Hours: Mon-Fri 9AM-5PM ET
#   3. Invoke REST API: Check Azure Monitor for critical alerts
#   4. Required template: Must extend from approved-release-template.yml

# azure-pipelines/cd.yml - Multi-stage CD pipeline (migrated from classic release)
trigger: none  # CD pipeline triggered by CI completion

resources:
  pipelines:
    - pipeline: ci-build
      source: "Contoso API - CI (YAML)"
      trigger:
        branches:
          include: [main]

stages:
  - stage: Dev
    displayName: "Deploy to Dev"
    jobs:
      - deployment: DeployDev
        displayName: "Deploy to development"
        environment: "contoso-dev"
        strategy:
          runOnce:
            deploy:
              steps:
                - download: ci-build
                  artifact: api-build

                - task: AzureWebApp@1
                  displayName: "Deploy to App Service"
                  inputs:
                    azureSubscription: "contoso-dev-sc"
                    appType: "webAppLinux"
                    appName: "app-contoso-api-dev"
                    package: "$(Pipeline.Workspace)/ci-build/api-build"

  - stage: Staging
    displayName: "Deploy to Staging"
    dependsOn: Dev
    jobs:
      - deployment: DeployStaging
        displayName: "Deploy to staging"
        # Environment with checks replaces classic pre-deployment gates:
        # - Invoke Azure Monitor query (replaces "Query Azure Monitor alerts" gate)
        # - Approval check (replaces pre-deployment approvals)
        environment: "contoso-staging"
        strategy:
          runOnce:
            preDeploy:
              steps:
                - script: echo "Pre-deployment validation..."
            deploy:
              steps:
                - download: ci-build
                  artifact: api-build

                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: "contoso-staging-sc"
                    appType: "webAppLinux"
                    appName: "app-contoso-api-staging"
                    package: "$(Pipeline.Workspace)/ci-build/api-build"

            routeTraffic:
              steps:
                - script: echo "Routing 10% traffic to new version..."

            postRouteTraffic:
              steps:
                - task: AzureCLI@2
                  displayName: "Run smoke tests"
                  inputs:
                    azureSubscription: "contoso-staging-sc"
                    scriptType: bash
                    scriptLocation: inlineScript
                    inlineScript: |
                      HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://app-contoso-api-staging.azurewebsites.net/health)
                      if [ "$HEALTH" != "200" ]; then
                        echo "##vso[task.logissue type=error]Health check failed with status $HEALTH"
                        exit 1
                      fi

  - stage: Production
    displayName: "Deploy to Production"
    dependsOn: Staging
    # Classic: Manual approval + 4-hour gate + work items query
    # YAML: All handled via environment checks configured in UI
    jobs:
      - deployment: DeployProd
        displayName: "Deploy to production"
        environment: "contoso-production"  # Has approval + business hours checks
        strategy:
          runOnce:
            deploy:
              steps:
                - download: ci-build
                  artifact: api-build

                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: "contoso-prod-sc"
                    appType: "webAppLinux"
                    appName: "app-contoso-api"
                    deployToSlotOrASE: true
                    slotName: "staging"
                    package: "$(Pipeline.Workspace)/ci-build/api-build"

                - task: AzureAppServiceManage@0
                  displayName: "Swap staging slot to production"
                  inputs:
                    azureSubscription: "contoso-prod-sc"
                    action: "Swap Slots"
                    webAppName: "app-contoso-api"
                    sourceSlot: "staging"
                    targetSlot: "production"
```

## Task 4: Migrate variable groups and service connections

Variable groups and service connections transfer directly to YAML:

```yaml
# Variable groups are referenced by name (no changes needed to the group itself)
variables:
  - group: contoso-api-common      # Shared variables (API keys, feature flags)
  - group: contoso-api-production  # Environment-specific secrets
  - name: localVar
    value: "inline-value"

# Conditional variable groups per stage
stages:
  - stage: Dev
    variables:
      - group: contoso-api-dev
    jobs:
      - job: Deploy
        steps:
          - script: echo "DB_HOST=$(DB_HOST)"  # From variable group

  - stage: Production
    variables:
      - group: contoso-api-production
    jobs:
      - job: Deploy
        steps:
          - script: echo "DB_HOST=$(DB_HOST)"  # Different value from prod group
```

Service connections are referenced in task inputs (same as classic):

```yaml
# Service connection references don't change between classic and YAML
- task: AzureWebApp@1
  inputs:
    azureSubscription: "contoso-prod-sc"  # Same service connection name
    appName: "app-contoso-api"
```

```bash
# List existing service connections (verify they work with YAML pipeline)
az devops service-endpoint list \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI \
  --query "[].{Name:name, Type:type, IsReady:isReady}" \
  --output table

# Grant the YAML pipeline access to a service connection
# Pipelines > Environments/Service Connections > Security > Pipeline permissions
```

## Task 5: Migrate task groups to YAML templates

Classic task groups become YAML templates:

```yaml
# Classic task group: "Build and Test Node.js App"
# Parameters: nodeVersion (default: 20.x), buildConfig (default: Release)

# Converted to: templates/build-test-node.yml
parameters:
  - name: nodeVersion
    type: string
    default: "20.x"
  - name: buildConfig
    type: string
    default: "Release"
  - name: workingDirectory
    type: string
    default: "."
  - name: publishArtifact
    type: boolean
    default: true

steps:
  - task: NodeTool@0
    displayName: "Use Node.js ${{ parameters.nodeVersion }}"
    inputs:
      versionSpec: ${{ parameters.nodeVersion }}

  - script: npm ci
    displayName: "Install dependencies"
    workingDirectory: ${{ parameters.workingDirectory }}

  - script: npm run lint
    displayName: "Run linter"
    workingDirectory: ${{ parameters.workingDirectory }}

  - script: npm run test -- --ci
    displayName: "Run tests"
    workingDirectory: ${{ parameters.workingDirectory }}

  - script: npm run build
    displayName: "Build (${{ parameters.buildConfig }})"
    workingDirectory: ${{ parameters.workingDirectory }}
    env:
      NODE_ENV: ${{ parameters.buildConfig }}

  - ${{ if eq(parameters.publishArtifact, true) }}:
    - task: PublishPipelineArtifact@1
      displayName: "Publish artifact"
      inputs:
        targetPath: "${{ parameters.workingDirectory }}/dist"
        artifactName: "build-output"
```

Use the template in pipelines:

```yaml
# azure-pipelines.yml - Using the template
trigger:
  branches:
    include: [main]

pool:
  vmImage: "ubuntu-latest"

steps:
  - template: templates/build-test-node.yml
    parameters:
      nodeVersion: "20.x"
      buildConfig: "Release"
      publishArtifact: true
```

For more complex task groups that span multiple jobs:

```yaml
# templates/deploy-stage.yml - Stage template (replaces multi-step task group)
parameters:
  - name: environment
    type: string
  - name: azureSubscription
    type: string
  - name: appName
    type: string
  - name: slotName
    type: string
    default: ""

stages:
  - stage: Deploy_${{ parameters.environment }}
    displayName: "Deploy to ${{ parameters.environment }}"
    jobs:
      - deployment: Deploy
        environment: "contoso-${{ parameters.environment }}"
        strategy:
          runOnce:
            deploy:
              steps:
                - download: current
                  artifact: build-output

                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: ${{ parameters.azureSubscription }}
                    appName: ${{ parameters.appName }}
                    ${{ if ne(parameters.slotName, '') }}:
                      deployToSlotOrASE: true
                      slotName: ${{ parameters.slotName }}
                    package: "$(Pipeline.Workspace)/build-output"
```

## Task 6: Handle classic-specific features (deployment groups to environments)

Migrate deployment groups to YAML environments with VM resources:

```bash
# Classic deployment groups manage on-premises VMs
# In YAML, these become "Environment" resources of type "Virtual Machine"

# Create the YAML environment
# Navigate to: Pipelines > Environments > New environment
#   Name: contoso-prod-vms
#   Resource: Virtual Machines

# Register VMs with the environment (generates a registration script)
# The script installs the Azure Pipelines agent on the VM
# For Windows:
# $env:VSTS_AGENT_INPUT_URL = "https://dev.azure.com/contoso"
# $env:VSTS_AGENT_INPUT_AUTH = "pat"
# $env:VSTS_AGENT_INPUT_TOKEN = "<PAT>"
# .\config.cmd --environment --environmentname "contoso-prod-vms" ...

# For Linux:
# ./config.sh --environment --environmentname "contoso-prod-vms" \
#   --agent $HOSTNAME --url https://dev.azure.com/contoso \
#   --auth pat --token <PAT>
```

YAML pipeline targeting VM environment:

```yaml
# azure-pipelines/vm-deploy.yml
# Replaces classic release with deployment group targets
trigger: none

resources:
  pipelines:
    - pipeline: ci-build
      source: "Contoso API CI"
      trigger:
        branches:
          include: [main]

stages:
  - stage: DeployVMs
    displayName: "Deploy to on-premises VMs"
    jobs:
      - deployment: DeployToVMs
        displayName: "Rolling deployment to VM pool"
        environment:
          name: contoso-prod-vms
          resourceType: VirtualMachine
          tags: "web"  # Target only VMs tagged as "web"
        strategy:
          rolling:
            maxParallel: 2  # Deploy to 2 VMs at a time
            preDeploy:
              steps:
                - script: echo "Taking VM out of load balancer..."
                  displayName: "Pre-deploy health check"
            deploy:
              steps:
                - download: ci-build
                  artifact: api-build

                - script: |
                    sudo systemctl stop contoso-api
                    sudo cp -r $(Pipeline.Workspace)/ci-build/api-build/* /opt/contoso-api/
                    sudo systemctl start contoso-api
                  displayName: "Deploy application"

            postRouteTraffic:
              steps:
                - script: |
                    sleep 10
                    curl -f http://localhost:3000/health || exit 1
                  displayName: "Health check after deploy"

            on:
              failure:
                steps:
                  - script: echo "Rolling back..."
                    displayName: "Rollback on failure"
              success:
                steps:
                  - script: echo "VM deployment successful"
                    displayName: "Success notification"
```

## Task 7: Phased migration strategy

Implement a safe, phased approach to migration:

```
Phase 1: Parallel run (Weeks 1-2)
- Create YAML pipeline alongside classic
- Both trigger on the same events
- Compare results (same artifacts, same tests, same deployments)
- YAML pipeline deploys to a separate "shadow" environment

Phase 2: YAML primary (Weeks 3-4)
- YAML pipeline becomes the official CI/CD
- Classic pipeline triggers disabled but retained
- Team uses YAML for all new deployments
- Classic available as emergency fallback

Phase 3: Classic decommission (Week 5+)
- Delete classic pipeline after 2 weeks with no issues
- Archive classic definition JSON for reference
- Update documentation and runbooks
```

```bash
# Export classic pipeline definition for archival
az pipelines show \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI \
  --id 42 \
  --output json > archived-classic-pipelines/contoso-api-ci-classic.json

# Disable classic pipeline triggers (Phase 2)
az pipelines update \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI \
  --id 42 \
  --yaml-path azure-pipelines/ci.yml \
  --skip-first-run true

# Rename classic pipeline to indicate deprecated status
az pipelines update \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI \
  --id 42 \
  --name "[DEPRECATED] Contoso API - CI (Classic)"

# Delete classic pipeline (Phase 3 - after validation period)
az pipelines delete \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI \
  --id 42 \
  --yes
```

Validation checklist for each migrated pipeline:

```yaml
# Migration validation pipeline
# azure-pipelines/migration-validation.yml
trigger: none

pool:
  vmImage: "ubuntu-latest"

steps:
  - script: |
      echo "=== Migration Validation Checklist ==="
      echo "1. Triggers: Verify CI/PR triggers match classic definition"
      echo "2. Variables: All variable groups accessible"
      echo "3. Artifacts: Same artifact names and content"
      echo "4. Tests: Same test results published"
      echo "5. Deployment: Same environments targeted"
      echo "6. Approvals: Environment checks configured"
      echo "7. Notifications: Service hooks updated"
      echo "8. Retention: Lease policies transferred"
    displayName: "Print validation checklist"

  # Compare artifact from YAML vs classic
  - task: DownloadPipelineArtifact@2
    displayName: "Download YAML build artifact"
    inputs:
      source: specific
      project: ContosoAPI
      pipeline: "Contoso API CI (YAML)"
      runVersion: latest
      artifactName: api-build
      targetPath: $(Pipeline.Workspace)/yaml-artifact

  - task: DownloadPipelineArtifact@2
    displayName: "Download classic build artifact"
    inputs:
      source: specific
      project: ContosoAPI
      pipeline: "Contoso API - CI"
      runVersion: latest
      artifactName: api-build
      targetPath: $(Pipeline.Workspace)/classic-artifact

  - script: |
      echo "Comparing artifacts..."
      diff -r $(Pipeline.Workspace)/yaml-artifact $(Pipeline.Workspace)/classic-artifact
      if [ $? -eq 0 ]; then
        echo "##vso[task.complete result=Succeeded;]Artifacts match!"
      else
        echo "##vso[task.logissue type=warning]Artifacts differ - review differences"
      fi
    displayName: "Compare YAML vs classic artifacts"
```

## Break and fix

### Exercise 1: Fix the broken artifact download in multi-pipeline trigger

After migration, the CD pipeline fails to download artifacts from the CI pipeline:

```yaml
# BROKEN: Classic used artifact source linkage automatically
# YAML requires explicit resource declaration
stages:
  - stage: Deploy
    jobs:
      - deployment: DeployApp
        environment: contoso-dev
        strategy:
          runOnce:
            deploy:
              steps:
                - download: current  # ERROR: No artifact in current pipeline
                  artifact: api-build
```

**Fix:**

```yaml
# FIXED: Declare the CI pipeline as a resource
resources:
  pipelines:
    - pipeline: ci-build  # Alias for reference
      source: "Contoso API CI (YAML)"  # Exact pipeline name
      trigger:
        branches:
          include: [main]

stages:
  - stage: Deploy
    jobs:
      - deployment: DeployApp
        environment: contoso-dev
        strategy:
          runOnce:
            deploy:
              steps:
                - download: ci-build  # Use the pipeline resource alias
                  artifact: api-build
                - script: ls $(Pipeline.Workspace)/ci-build/api-build
```

### Exercise 2: Fix the missing pre-deployment approval

After migration, deployments to production happen without any approval:

```yaml
# BROKEN: Environment exists but has no checks configured
- deployment: DeployProd
  environment: production  # No approvals configured on this environment
  strategy:
    runOnce:
      deploy:
        steps:
          - script: echo "Deploying to production..."
```

**Fix:** Environment checks must be configured in the Azure DevOps UI (they cannot be set via YAML):

```
1. Navigate to: Pipelines > Environments > production
2. Click three dots (...) > Approvals and checks
3. Add check: "Approvals"
   - Approvers: contoso-release-managers group
   - Minimum approvals: 2
   - Allow approvers to approve their own runs: No
4. Add check: "Business hours"
   - Time zone: Eastern Time
   - Business days: Mon-Fri
   - Business hours: 9:00 AM - 5:00 PM
5. Add check: "Invoke REST API"
   - URL: https://app-contoso-api-staging.azurewebsites.net/health
   - Method: GET
   - Success criteria: eq(root['status'], 'healthy')
```

The key insight: In classic pipelines, approvals and gates are configured per-stage in the release definition. In YAML pipelines, they are configured on the environment itself and apply to any pipeline that deploys to that environment.

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the YAML equivalent of a classic release definition's \"pre-deployment gates\"?",
    options: [
      "'condition:' expressions on the stage",
      "'dependsOn:' with custom scripts",
      "Environment approvals and checks configured on the target environment",
      "'trigger:' with schedule-based delays"
    ],
    correctIndex: 2,
    explanation: "Classic pre-deployment gates (Azure Monitor queries, REST API checks, work item queries) are replaced by environment checks in YAML. These are configured in the Azure DevOps UI on the environment resource, not in the YAML file itself. This provides separation of concerns: the pipeline defines what to deploy, the environment defines governance controls."
  },
  {
    question: "How should classic task groups be migrated to YAML?",
    options: [
      "Convert them to PowerShell scripts and call via 'script:' step",
      "Convert them to YAML templates ('.yml' files) with 'parameters:' and reference with 'template:'",
      "Keep using task groups directly (they work in YAML pipelines)",
      "Replace them with marketplace extensions that provide the same functionality"
    ],
    correctIndex: 1,
    explanation: "YAML templates are the direct successor to classic task groups. They support parameters, conditional logic, and can be shared across pipelines via repository references. Templates provide better version control (they are files in a repo) and support more complex patterns like stage templates and job templates, beyond just step reuse."
  },
  {
    question: "When migrating a classic release with deployment groups to YAML, what is the target resource type?",
    options: [
      "'environment:' with 'resourceType: Kubernetes'",
      "'environment:' with 'resourceType: VirtualMachine'",
      "'pool:' with self-hosted agents",
      "'resources: repositories:' with SSH connection"
    ],
    correctIndex: 1,
    explanation: "Classic deployment groups map to YAML environments with resourceType: VirtualMachine. VMs registered with the environment run the pipeline agent locally, just like deployment group targets. YAML adds the rolling deployment strategy (strategy: rolling:) which was configured differently in classic releases."
  },
  {
    question: "What is the recommended phased approach for migrating from classic to YAML?",
    options: [
      "Delete classic immediately and create YAML from scratch",
      "Run both in parallel, validate YAML matches classic output, then disable and archive classic",
      "Convert only build pipelines to YAML and keep release pipelines as classic indefinitely",
      "Wait until Microsoft removes classic support, then migrate everything at once"
    ],
    correctIndex: 1,
    explanation: "A phased approach (parallel run, YAML primary with classic fallback, then decommission) minimizes risk. Running both pipelines simultaneously allows validation that the YAML version produces identical artifacts and deployments. Only after a confidence period should the classic pipeline be disabled and eventually deleted (with its definition archived for reference)."
  }
]} />

## Cleanup

```bash
# Remove deprecated classic pipelines (after successful migration)
az pipelines list \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI \
  --query "[?contains(name, 'DEPRECATED')].{Id:id, Name:name}" \
  --output table

# Archive and delete
az pipelines show --id 42 --org https://dev.azure.com/contoso --project ContosoAPI \
  --output json > archived-classic-pipelines/pipeline-42.json

az pipelines delete --id 42 --org https://dev.azure.com/contoso --project ContosoAPI --yes

# Clean up test environments created during migration validation
# Pipelines > Environments > Delete test environments

# Remove migration validation pipeline
az pipelines delete \
  --name "Migration Validation" \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI \
  --yes
```
