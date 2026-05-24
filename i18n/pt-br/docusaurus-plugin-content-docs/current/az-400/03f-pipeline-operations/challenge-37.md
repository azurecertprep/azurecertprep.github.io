---
sidebar_position: 4
title: "Desafio 37: Migrar classic para YAML"
sidebar_label: "Desafio 37: Migrar classic para YAML"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 37: Migrar classic para YAML

:::info Plataforma: ADO-first
Este desafio Ã© especÃ­fico para a migraÃ§Ã£o do Azure DevOps Pipelines do editor classic (GUI) para YAML.
:::

## Habilidades do exame mapeadas

- Migrar um pipeline de classic para YAML no Azure Pipelines

## CenÃ¡rio

A Contoso Ltd possui 20 pipelines classic (baseados em GUI) de build e release no Azure DevOps. Esses pipelines foram criados nos Ãºltimos 4 anos e incluem:

- 8 definiÃ§Ãµes de build classic (CI)
- 12 definiÃ§Ãµes de release classic (CD) com mÃºltiplos stages e gates
- Task groups compartilhados entre pipelines
- Variable groups com secrets especÃ­ficos por ambiente
- Deployment groups para implantaÃ§Ãµes em VMs on-premises

A Microsoft recomenda pipelines YAML para controle de versÃ£o, code review e reutilizaÃ§Ã£o de templates. A equipe de DevOps da Contoso deve migrar sistematicamente sem interromper as implantaÃ§Ãµes ativas.

Estrutura atual do pipeline classic:

```python
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

## Tarefa 1: Exportar pipeline classic para YAML (funcionalidade integrada)

Use a funcionalidade de exportaÃ§Ã£o integrada disponÃ­vel no Azure DevOps:

```text
Passos para exportar um pipeline de build classic:
1. Navegue atÃ© Pipelines > [Selecione o pipeline classic]
2. Clique em "Edit"
3. Clique no menu de trÃªs pontos (...)
4. Selecione "Export to YAML" (se disponÃ­vel na sua versÃ£o do Azure DevOps)
5. Revise o YAML gerado

Nota: O botÃ£o "View YAML" em tarefas individuais mostra o equivalente YAML
de cada tarefa, que vocÃª pode combinar manualmente.
```

Para builds onde a funcionalidade de exportaÃ§Ã£o nÃ£o estÃ¡ disponÃ­vel, converta manualmente examinando cada tarefa:

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

O YAML exportado/convertido para o build classic:

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

## Tarefa 2: Mapear conceitos classic para equivalentes YAML

Tabela de referÃªncia para migraÃ§Ã£o:

| Conceito classic | Equivalente YAML |
|----------------|-----------------|
| Build definition | `trigger`, `pool`, `steps` em um arquivo YAML |
| Release definition | Pipeline YAML multi-stage com `stages` |
| Release stages | `stages:` com blocos `- stage:` |
| Environment (classic) | `environment:` em deployment jobs |
| Artifacts source | `resources: pipelines:` ou artefatos do mesmo pipeline |
| Pre-deployment approvals | Approvals e checks do environment |
| Pre-deployment gates | Environment checks (Invoke REST API, Azure Monitor) |
| Deployment groups | `environment:` com recursos VM |
| Task groups | YAML templates (`template:`) |
| Variable groups | ReferÃªncia `variables: - group:` |
| Agent phases | `jobs:` com diferentes configuraÃ§Ãµes de `pool:` |
| Parallel deployment | `strategy: parallel:` ou matrix |

## Tarefa 3: Converter release gates para environment checks YAML

Os gates de release classic se tornam environment checks no YAML:

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

## Tarefa 4: Migrar variable groups e service connections

Variable groups e service connections sÃ£o transferidos diretamente para YAML:

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

Service connections sÃ£o referenciadas nos inputs das tarefas (mesmo que no classic):

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

## Tarefa 5: Migrar task groups para YAML templates

Task groups classic se tornam YAML templates:

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

Use o template nos pipelines:

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

Para task groups mais complexos que abrangem mÃºltiplos jobs:

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

## Tarefa 6: Lidar com funcionalidades especÃ­ficas do classic (deployment groups para environments)

Migrar deployment groups para YAML environments com recursos VM:

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

Pipeline YAML direcionado ao environment de VM:

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

## Tarefa 7: EstratÃ©gia de migraÃ§Ã£o faseada

Implemente uma abordagem faseada e segura para a migraÃ§Ã£o:

```text
Fase 1: ExecuÃ§Ã£o paralela (Semanas 1-2)
- Criar pipeline YAML ao lado do classic
- Ambos disparam nos mesmos eventos
- Comparar resultados (mesmos artefatos, mesmos testes, mesmas implantaÃ§Ãµes)
- Pipeline YAML implanta em um ambiente "shadow" separado

Fase 2: YAML como primÃ¡rio (Semanas 3-4)
- Pipeline YAML se torna o CI/CD oficial
- Triggers do pipeline classic desabilitados mas retidos
- Equipe usa YAML para todas as novas implantaÃ§Ãµes
- Classic disponÃ­vel como fallback de emergÃªncia

Fase 3: Descomissionamento do classic (Semana 5+)
- Deletar pipeline classic apÃ³s 2 semanas sem problemas
- Arquivar definiÃ§Ã£o JSON do classic para referÃªncia
- Atualizar documentaÃ§Ã£o e runbooks
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

Checklist de validaÃ§Ã£o para cada pipeline migrado:

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

## ExercÃ­cios de quebra e conserto

### ExercÃ­cio 1: Corrigir o download de artefato quebrado em trigger multi-pipeline

ApÃ³s a migraÃ§Ã£o, o pipeline CD falha ao baixar artefatos do pipeline CI:

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


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:**

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

</details>

### ExercÃ­cio 2: Corrigir a aprovaÃ§Ã£o de prÃ©-implantaÃ§Ã£o ausente

ApÃ³s a migraÃ§Ã£o, as implantaÃ§Ãµes para produÃ§Ã£o acontecem sem nenhuma aprovaÃ§Ã£o:

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


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:** Os environment checks devem ser configurados na interface do Azure DevOps (nÃ£o podem ser definidos via YAML):

```text
1. Navegue atÃ©: Pipelines > Environments > production
2. Clique nos trÃªs pontos (...) > Approvals and checks
3. Adicionar check: "Approvals"
   - Approvers: grupo contoso-release-managers
   - Minimum approvals: 2
   - Allow approvers to approve their own runs: No
4. Adicionar check: "Business hours"
   - Time zone: Eastern Time
   - Business days: Mon-Fri
   - Business hours: 9:00 AM - 5:00 PM
5. Adicionar check: "Invoke REST API"
   - URL: https://app-contoso-api-staging.azurewebsites.net/health
   - Method: GET
   - Success criteria: eq(root['status'], 'healthy')
```

O ponto-chave: Em pipelines classic, aprovaÃ§Ãµes e gates sÃ£o configurados por stage na definiÃ§Ã£o de release. Em pipelines YAML, eles sÃ£o configurados no prÃ³prio environment e se aplicam a qualquer pipeline que implante naquele environment.

</details>
## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual Ã© o equivalente YAML dos \"pre-deployment gates\" de uma definiÃ§Ã£o de release classic?",
    options: [
      "ExpressÃµes 'condition:' no stage",
      "'dependsOn:' com scripts personalizados",
      "Approvals e checks do environment configurados no environment de destino",
      "'trigger:' com atrasos baseados em agendamento"
    ],
    correctIndex: 2,
    explanation: "Os gates de prÃ©-implantaÃ§Ã£o classic (consultas ao Azure Monitor, verificaÃ§Ãµes de REST API, consultas de work items) sÃ£o substituÃ­dos por environment checks no YAML. Estes sÃ£o configurados na interface do Azure DevOps no recurso de environment, nÃ£o no prÃ³prio arquivo YAML. Isso fornece separaÃ§Ã£o de responsabilidades: o pipeline define o que implantar, o environment define os controles de governanÃ§a."
  },
  {
    question: "Como os task groups classic devem ser migrados para YAML?",
    options: [
      "ConvertÃª-los em scripts PowerShell e chamar via step 'script:'",
      "ConvertÃª-los em YAML templates (arquivos '.yml') com 'parameters:' e referenciar com 'template:'",
      "Continuar usando task groups diretamente (eles funcionam em pipelines YAML)",
      "SubstituÃ­-los por extensÃµes do marketplace que fornecem a mesma funcionalidade"
    ],
    correctIndex: 1,
    explanation: "YAML templates sÃ£o os sucessores diretos dos task groups classic. Eles suportam parÃ¢metros, lÃ³gica condicional e podem ser compartilhados entre pipelines via referÃªncias de repositÃ³rio. Templates oferecem melhor controle de versÃ£o (sÃ£o arquivos em um repositÃ³rio) e suportam padrÃµes mais complexos como stage templates e job templates, alÃ©m da reutilizaÃ§Ã£o apenas de steps."
  },
  {
    question: "Ao migrar uma release classic com deployment groups para YAML, qual Ã© o tipo de recurso de destino?",
    options: [
      "'environment:' com 'resourceType: Kubernetes'",
      "'environment:' com 'resourceType: VirtualMachine'",
      "'pool:' com agentes self-hosted",
      "'resources: repositories:' com conexÃ£o SSH"
    ],
    correctIndex: 1,
    explanation: "Deployment groups classic sÃ£o mapeados para YAML environments com resourceType: VirtualMachine. VMs registradas no environment executam o agente do pipeline localmente, assim como os alvos de deployment group. O YAML adiciona a estratÃ©gia de rolling deployment (strategy: rolling:) que era configurada de forma diferente em releases classic."
  },
  {
    question: "Qual Ã© a abordagem faseada recomendada para migrar de classic para YAML?",
    options: [
      "Deletar o classic imediatamente e criar YAML do zero",
      "Executar ambos em paralelo, validar que o YAML corresponde Ã  saÃ­da do classic, depois desabilitar e arquivar o classic",
      "Converter apenas pipelines de build para YAML e manter pipelines de release como classic indefinidamente",
      "Esperar atÃ© a Microsoft remover o suporte ao classic, depois migrar tudo de uma vez"
    ],
    correctIndex: 1,
    explanation: "Uma abordagem faseada (execuÃ§Ã£o paralela, YAML como primÃ¡rio com classic como fallback, depois descomissionamento) minimiza o risco. Executar ambos os pipelines simultaneamente permite validar que a versÃ£o YAML produz artefatos e implantaÃ§Ãµes idÃªnticos. Somente apÃ³s um perÃ­odo de confianÃ§a o pipeline classic deve ser desabilitado e eventualmente deletado (com sua definiÃ§Ã£o arquivada para referÃªncia)."
  }
]} />

## Limpeza

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
