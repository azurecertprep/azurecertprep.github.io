---
sidebar_position: 3
title: "Desafio 36: EstratÃ©gias de retenÃ§Ã£o"
sidebar_label: "Desafio 36: EstratÃ©gias de retenÃ§Ã£o"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 36: EstratÃ©gias de retenÃ§Ã£o

:::info Plataforma: comparaÃ§Ã£o
Este desafio abrange o gerenciamento de retenÃ§Ã£o tanto do GitHub Actions/Packages quanto do Azure Pipelines/Artifacts.
:::

## Habilidades do exame mapeadas

- Projetar e implementar uma estratÃ©gia de retenÃ§Ã£o para artefatos de pipeline e dependÃªncias

## CenÃ¡rio

O projeto Azure DevOps da Contoso Ltd acumulou 500 GB de armazenamento de artefatos que cresce 50 GB por mÃªs. Seus repositÃ³rios GitHub tambÃ©m tÃªm armazenamento de artefatos inchado. O detalhamento:

- Artefatos de execuÃ§Ã£o de pipeline (saÃ­das de build, resultados de teste): 200 GB
- Feed do Azure Artifacts (pacotes npm): 180 GB (incluindo 3 anos de versÃµes prÃ©-release)
- Imagens de contÃªiner no ACR: 120 GB
- Artefatos de release retidos indefinidamente: crescendo sem controle

Os custos mensais de armazenamento sÃ£o $150 e subindo. A equipe de conformidade exige que artefatos de release de produÃ§Ã£o sejam mantidos por 1 ano, mas artefatos de dev/test precisam apenas de 7 dias. Projete e implemente uma estratÃ©gia abrangente de retenÃ§Ã£o.

## Tarefa 1: Configurar polÃ­ticas de retenÃ§Ã£o de artefatos no Azure Pipelines

Defina polÃ­ticas de retenÃ§Ã£o no nÃ­vel do projeto e do pipeline:

```bash
# View current project retention settings
az devops invoke \
  --area build \
  --resource settings \
  --org https://dev.azure.com/contoso \
  --route-parameters project=ContosoAPI \
  --http-method GET
```

Configure no Azure DevOps: Project Settings > Pipelines > Settings > Retention:

```yaml
# azure-pipelines.yml - Pipeline-specific retention
trigger:
  branches:
    include: [main, release/*]

pool:
  vmImage: "ubuntu-latest"

jobs:
  - job: Build
    steps:
      - script: npm run build
        displayName: "Build application"

      # Short-lived artifacts for CI (7 days)
      - publish: $(System.DefaultWorkingDirectory)/dist
        artifact: build-output
        displayName: "Publish build artifact"

# Configure retention via pipeline settings
# Project Settings > Pipelines > Retention
# - Days to keep artifacts: 30 (default)
# - Minimum days to keep: 1
# - Days to keep pull request runs: 10
# - Days to keep runs with release artifacts: 365
```

Substitua a retenÃ§Ã£o no nÃ­vel da execuÃ§Ã£o para builds importantes:

```yaml
  # For release builds, extend retention
  - job: Release
    condition: startsWith(variables['Build.SourceBranch'], 'refs/heads/release/')
    steps:
      - script: npm run build
        displayName: "Build release"

      - publish: $(System.DefaultWorkingDirectory)/dist
        artifact: release-output

      # Programmatically set retention via REST API
      - task: PowerShell@2
        displayName: "Set retention to 365 days for release"
        inputs:
          targetType: inline
          script: |
            $headers = @{
              Authorization = "Bearer $(System.AccessToken)"
              "Content-Type" = "application/json"
            }
            $body = @{
              daysValid = 365
              definitionId = $(System.DefinitionId)
              ownerId = "User:$(Build.RequestedForId)"
              protectPipeline = $true
              runId = $(Build.BuildId)
            } | ConvertTo-Json

            $uri = "$(System.CollectionUri)$(System.TeamProject)/_apis/build/retention/leases?api-version=7.1"
            Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body
```

## Tarefa 2: Configurar retenÃ§Ã£o de artefatos do GitHub Actions

Defina retenÃ§Ã£o padrÃ£o e por artefato para GitHub Actions:

```yaml
# Organization/repo level: Settings > Actions > General > Artifact and log retention
# Default: 90 days, Maximum: 400 days

# Per-artifact override in workflow
name: Build and Release

on:
  push:
    branches: [main, "release/**"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build

      # CI artifacts: short retention
      - name: Upload build artifact (CI)
        if: github.ref != 'refs/heads/main' && !startsWith(github.ref, 'refs/heads/release/')
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ github.sha }}
          path: dist/
          retention-days: 3  # PR artifacts only need 3 days

      # Main branch artifacts: medium retention
      - name: Upload build artifact (main)
        if: github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: build-main-${{ github.sha }}
          path: dist/
          retention-days: 30

      # Release artifacts: long retention
      - name: Upload release artifact
        if: startsWith(github.ref, 'refs/heads/release/')
        uses: actions/upload-artifact@v4
        with:
          name: release-${{ github.ref_name }}-${{ github.sha }}
          path: dist/
          retention-days: 365  # Keep releases for 1 year
```

Limpe artefatos antigos programaticamente:

```bash
# List artifacts and their sizes
gh api repos/{owner}/{repo}/actions/artifacts \
  --paginate \
  --jq '.artifacts[] | {id: .id, name: .name, size_mb: (.size_in_bytes / 1048576 | floor), created: .created_at, expired: .expired}'

# Delete artifacts older than 7 days (for PR artifacts)
gh api repos/{owner}/{repo}/actions/artifacts --paginate \
  --jq '.artifacts[] | select(.name | startswith("build-")) | select((.created_at | fromdateiso8601) < (now - 604800)) | .id' | \
  xargs -I {} gh api --method DELETE repos/{owner}/{repo}/actions/artifacts/{}

# Get total artifact storage usage
gh api repos/{owner}/{repo}/actions/artifacts \
  --paginate \
  --jq '[.artifacts[].size_in_bytes] | add / 1073741824 | "Total: \(.) GB"'
```

## Tarefa 3: RetenÃ§Ã£o de releases (manter releases de produÃ§Ã£o por mais tempo)

Implemente retenÃ§Ã£o em camadas baseada no ambiente:

```yaml
# azure-pipelines.yml - Multi-stage with tiered retention
stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - script: npm run build
          - publish: $(System.DefaultWorkingDirectory)/dist
            artifact: app-$(Build.BuildNumber)

  - stage: DeployDev
    dependsOn: Build
    jobs:
      - deployment: DeployDev
        environment: development
        strategy:
          runOnce:
            deploy:
              steps:
                - download: current
                  artifact: app-$(Build.BuildNumber)
                - script: echo "Deploying to dev..."

  - stage: DeployProd
    dependsOn: DeployDev
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployProd
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - download: current
                  artifact: app-$(Build.BuildNumber)
                - script: echo "Deploying to production..."

                # Create a retention lease for production deployments
                - task: PowerShell@2
                  displayName: "Retain production release for 1 year"
                  inputs:
                    targetType: inline
                    script: |
                      $headers = @{
                        Authorization = "Bearer $(System.AccessToken)"
                        "Content-Type" = "application/json"
                      }
                      $body = ConvertTo-Json @(
                        @{
                          daysValid = 365
                          definitionId = $(System.DefinitionId)
                          ownerId = "User:$(Build.RequestedForId)"
                          protectPipeline = $false
                          runId = $(Build.BuildId)
                        }
                      )
                      $uri = "$(System.CollectionUri)$(System.TeamProject)/_apis/build/retention/leases?api-version=7.1"
                      Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body
```

Para GitHub, use releases com retenÃ§Ã£o baseada em tags:

```bash
# Create a GitHub Release for production deployments (retained indefinitely)
gh release create v1.5.0 dist/*.zip \
  --title "v1.5.0 - Payment processing update" \
  --notes "Production release deployed 2024-03-15"

# GitHub Releases are not subject to artifact retention policies
# They persist until explicitly deleted

# List releases with asset sizes
gh release list --limit 20

# Delete old pre-release versions (keep only last 5)
gh release list --json tagName,isPrerelease --jq '.[] | select(.isPrerelease) | .tagName' | \
  tail -n +6 | \
  xargs -I {} gh release delete {} --yes --cleanup-tag
```

## Tarefa 4: RetenÃ§Ã£o de versÃµes de pacotes no Azure Artifacts e GitHub Packages

Configure retenÃ§Ã£o para feeds de pacotes:

```bash
# Azure Artifacts - View feed storage
az artifacts feed show \
  --name contoso-npm \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI \
  --query "{Name:name, Packages:packageCount}"

# List package versions with sizes
az artifacts package list \
  --feed contoso-npm \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI \
  --query "[].{Name:name, Version:version, Published:publishDate}" \
  --output table
```

Para GitHub Packages (npm):

```bash
# List versions of a package
gh api /orgs/contoso/packages/npm/contoso-shared/versions \
  --paginate \
  --jq '.[] | {id: .id, tag: .metadata.container.tags[0] // .name, created: .created_at, size_mb: ((.metadata.package_type // "unknown"))}'

# Delete old package versions (keep last 10)
gh api /orgs/contoso/packages/npm/contoso-shared/versions \
  --paginate \
  --jq '.[10:] | .[].id' | \
  xargs -I {} gh api --method DELETE /orgs/contoso/packages/npm/contoso-shared/versions/{}

# For container images in GHCR
gh api /orgs/contoso/packages/container/contoso-api/versions \
  --paginate \
  --jq '.[] | select(.metadata.container.tags | length == 0) | .id' | \
  xargs -I {} gh api --method DELETE /orgs/contoso/packages/container/contoso-api/versions/{}
```

## Tarefa 5: PolÃ­ticas de limpeza de feeds (remover versÃµes prÃ©-release antigas)

Configure views de retenÃ§Ã£o e limpeza do Azure Artifacts:

```bash
# Azure Artifacts uses "views" for retention:
# @local - all versions (default retention applies)
# @prerelease - pre-release versions
# @release - promoted stable versions (longer retention)

# Promote a package version to Release view (excluded from cleanup)
az artifacts universal publish \
  --feed contoso-npm \
  --name contoso-shared \
  --version 2.1.0 \
  --description "Stable release" \
  --path ./dist

# Configure feed retention policy via REST API
# Keep maximum 5 versions per package (pre-release only)
cat > feed-retention.json << 'EOF'
{
  "countLimit": 5,
  "daysToKeepRecentlyCreatedPackages": 30,
  "packageTypes": ["npm", "NuGet"],
  "views": ["@prerelease"]
}
EOF

# Note: Feed retention settings are configured in the Azure DevOps UI:
# Artifacts > Feed Settings > Retention policies
# - Maximum number of versions per package: 5
# - Days to keep recently downloaded packages: 30
```

Automatize a limpeza com um pipeline agendado:

```yaml
# azure-pipelines/cleanup-artifacts.yml
schedules:
  - cron: "0 2 * * 0"  # Weekly on Sunday at 2 AM
    displayName: "Weekly artifact cleanup"
    branches:
      include: [main]
    always: true

trigger: none

pool:
  vmImage: "ubuntu-latest"

steps:
  - task: AzureCLI@2
    displayName: "Clean up old pre-release packages"
    inputs:
      azureSubscription: "contoso-artifacts-sc"
      scriptType: bash
      scriptLocation: inlineScript
      inlineScript: |
        # Get all package versions older than 30 days that are pre-release
        FEED="contoso-npm"
        ORG="https://dev.azure.com/contoso"
        PROJECT="ContosoAPI"
        CUTOFF=$(date -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ)

        # List packages in the feed
        PACKAGES=$(az artifacts package list \
          --feed $FEED --org $ORG --project $PROJECT \
          --query "[].name" -o tsv)

        for PKG in $PACKAGES; do
          echo "Processing package: $PKG"
          # Get versions, keep latest 5, delete older pre-release
          VERSIONS=$(az artifacts package version list \
            --feed $FEED --org $ORG --project $PROJECT \
            --package-name $PKG \
            --query "[?contains(version, '-')]|sort_by(@, &publishDate)|[:-5].version" -o tsv)

          for VER in $VERSIONS; do
            echo "  Deleting pre-release version: $PKG@$VER"
            az artifacts package version delete \
              --feed $FEED --org $ORG --project $PROJECT \
              --package-name $PKG --version $VER --yes
          done
        done
```

## Tarefa 6: AnÃ¡lise de custos de armazenamento e otimizaÃ§Ã£o

Analise o uso atual de armazenamento e identifique economias:

```bash
# Azure DevOps storage analysis
# Navigate to: Organization Settings > Storage

# Azure Container Registry - Analyze image storage
az acr repository list --name contosoregistry --output table

# Show repository details with size
az acr manifest list-metadata \
  --registry contosoregistry \
  --name contoso-api \
  --orderby time_asc \
  --query "[].{Digest:digest, Created:createdTime, Tags:tags, Size_MB:(imageSize / 1048576)}" \
  --output table

# Delete untagged (dangling) images
az acr run --registry contosoregistry --cmd "acr purge \
  --filter 'contoso-api:.*' \
  --untagged \
  --ago 7d" /dev/null

# Delete old tagged images (keep last 10 tags)
az acr run --registry contosoregistry --cmd "acr purge \
  --filter 'contoso-api:.*' \
  --keep 10 \
  --ago 30d" /dev/null

# Set up automatic purge task (runs daily)
az acr task create \
  --name purge-old-images \
  --registry contosoregistry \
  --cmd "acr purge --filter 'contoso-api:.*' --untagged --ago 7d && \
         acr purge --filter 'contoso-api:.*' --keep 20 --ago 90d" \
  --schedule "0 3 * * *" \
  --context /dev/null
```

Calcule as economias com a implementaÃ§Ã£o da retenÃ§Ã£o:

```text
AnÃ¡lise de custos de armazenamento:
- Total atual: 500 GB a ~$0.30/GB/mÃªs = $150/mÃªs
- ApÃ³s polÃ­ticas de retenÃ§Ã£o:
  - Artefatos de pipeline: 200 GB -> 30 GB (retenÃ§Ã£o de 7 dias para CI, 365 para releases)
  - Feed de pacotes: 180 GB -> 50 GB (manter 5 versÃµes por pacote)
  - Imagens de contÃªiner: 120 GB -> 40 GB (manter 20 tags, purgar sem tag)
- Novo total: 120 GB a $0.30/GB/mÃªs = $36/mÃªs
- Economia mensal: $114/mÃªs ($1.368/ano)
```

## Tarefa 7: Implementando gerenciamento de ciclo de vida via Azure CLI e REST API

Automatize o gerenciamento de retenÃ§Ã£o com scripts e APIs:

```bash
# Azure Pipelines - Delete old pipeline runs (keep last 100)
# First, list runs to identify what to delete
az pipelines runs list \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI \
  --pipeline-ids 42 \
  --top 200 \
  --query "sort_by([],&id)|[:-100].{Id:id, Date:finishedDate, Result:result}" \
  --output table

# Delete old runs via REST API
OLD_RUNS=$(az pipelines runs list \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI \
  --pipeline-ids 42 \
  --top 200 \
  --query "sort_by([],&id)|[:-100].id" -o tsv)

for RUN_ID in $OLD_RUNS; do
  az devops invoke \
    --area build \
    --resource builds \
    --org https://dev.azure.com/contoso \
    --route-parameters project=ContosoAPI buildId=$RUN_ID \
    --http-method DELETE
done
```

Gerenciamento de ciclo de vida do GitHub Actions:

```yaml
# .github/workflows/retention-cleanup.yml
name: Storage cleanup

on:
  schedule:
    - cron: "0 4 * * 0"  # Weekly Sunday at 4 AM
  workflow_dispatch:

permissions:
  actions: write
  packages: write

jobs:
  cleanup-artifacts:
    runs-on: ubuntu-latest
    steps:
      - name: Delete old workflow run artifacts
        uses: actions/github-script@v7
        with:
          script: |
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const artifacts = await github.paginate(
              github.rest.actions.listArtifactsForRepo,
              { owner: context.repo.owner, repo: context.repo.repo, per_page: 100 }
            );

            let deletedCount = 0;
            let freedBytes = 0;

            for (const artifact of artifacts) {
              const created = new Date(artifact.created_at);
              // Delete non-release artifacts older than 30 days
              if (created < thirtyDaysAgo && !artifact.name.startsWith('release-')) {
                await github.rest.actions.deleteArtifact({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  artifact_id: artifact.id
                });
                deletedCount++;
                freedBytes += artifact.size_in_bytes;
              }
            }

            console.log(`Deleted ${deletedCount} artifacts, freed ${(freedBytes / 1073741824).toFixed(2)} GB`);

  cleanup-packages:
    runs-on: ubuntu-latest
    steps:
      - name: Delete old container image versions
        uses: actions/delete-package-versions@v5
        with:
          package-name: contoso-api
          package-type: container
          min-versions-to-keep: 20
          delete-only-untagged-versions: true

      - name: Delete old npm package versions
        uses: actions/delete-package-versions@v5
        with:
          package-name: contoso-shared
          package-type: npm
          min-versions-to-keep: 10
          delete-only-pre-release-versions: true
```

## ExercÃ­cios de quebra e conserto

### ExercÃ­cio 1: Corrigir o vazamento de retenÃ§Ã£o

Artefatos de release de produÃ§Ã£o estÃ£o sendo excluÃ­dos apÃ³s 30 dias apesar de uma polÃ­tica de 365 dias. Diagnostique:

```yaml
# BROKEN: Retention lease is created but never protects the artifact
- task: PowerShell@2
  displayName: "Set retention lease"
  inputs:
    targetType: inline
    script: |
      $body = @{
        daysValid = 365
        definitionId = $(System.DefinitionId)
        ownerId = "User:$(Build.RequestedForId)"
        protectPipeline = $true
        runId = $(Build.BuildId)
      } | ConvertTo-Json

      # ERROR: Missing authorization header
      $uri = "$(System.CollectionUri)$(System.TeamProject)/_apis/build/retention/leases?api-version=7.1"
      Invoke-RestMethod -Uri $uri -Method POST -Body $body
      # Also ERROR: Body must be an array, not a single object
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:**

```yaml
- task: PowerShell@2
  displayName: "Set retention lease"
  inputs:
    targetType: inline
    script: |
      $headers = @{
        Authorization = "Bearer $(System.AccessToken)"
        "Content-Type" = "application/json"
      }
      # Body must be a JSON array
      $body = ConvertTo-Json @(
        @{
          daysValid = 365
          definitionId = $(System.DefinitionId)
          ownerId = "User:$(Build.RequestedForId)"
          protectPipeline = $false
          runId = $(Build.BuildId)
        }
      )
      $uri = "$(System.CollectionUri)$(System.TeamProject)/_apis/build/retention/leases?api-version=7.1"
      Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body
```

</details>

### ExercÃ­cio 2: Corrigir o ACR purge excluindo imagens de produÃ§Ã£o

A tarefa automatizada de ACR purge estÃ¡ excluindo imagens que estÃ£o em execuÃ§Ã£o na produÃ§Ã£o:

```bash
# BROKEN: Purges all images older than 7 days regardless of use
az acr run --registry contosoregistry --cmd "acr purge \
  --filter 'contoso-api:.*' \
  --ago 7d" /dev/null
# This deletes the 'latest' and 'v1.4.2' tags that production is using!
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:**

```bash
# FIXED: Only purge untagged images and keep specific tag patterns
az acr run --registry contosoregistry --cmd "acr purge \
  --filter 'contoso-api:sha-.*' \
  --ago 7d \
  --untagged" /dev/null

# Separately handle versioned tags with a longer window and minimum keep
az acr run --registry contosoregistry --cmd "acr purge \
  --filter 'contoso-api:v[0-9]*' \
  --ago 90d \
  --keep 10" /dev/null

# Never purge 'latest' or 'production' tags - they match no regex above
```

</details>
## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que Ã© um retention lease no Azure Pipelines?",
    options: [
      "Uma licenÃ§a que determina quantos pipelines podem ser executados simultaneamente",
      "Um bloqueio programÃ¡tico que impede que uma execuÃ§Ã£o de pipeline e seus artefatos sejam excluÃ­dos pelas polÃ­ticas de retenÃ§Ã£o",
      "Uma cota de armazenamento atribuÃ­da a cada definiÃ§Ã£o de pipeline",
      "Uma permissÃ£o com tempo limitado para acessar artefatos de pipeline"
    ],
    correctIndex: 1,
    explanation: "Um retention lease Ã© um bloqueio gerenciado por API que substitui as configuraÃ§Ãµes de retenÃ§Ã£o no nÃ­vel do projeto para execuÃ§Ãµes de pipeline especÃ­ficas. Quando um lease estÃ¡ ativo, a execuÃ§Ã£o e seus artefatos sÃ£o protegidos contra exclusÃ£o automÃ¡tica independentemente do perÃ­odo de retenÃ§Ã£o configurado. Leases possuem uma propriedade daysValid que define quanto tempo a proteÃ§Ã£o dura."
  },
  {
    question: "Como a retenÃ§Ã£o de artefatos deve diferir entre builds de CI e releases de produÃ§Ã£o?",
    options: [
      "Todos os artefatos devem ter a mesma retenÃ§Ã£o independentemente do ambiente",
      "Artefatos de CI/PR devem ter retenÃ§Ã£o curta (1-7 dias); artefatos de release de produÃ§Ã£o devem ter retenÃ§Ã£o longa (90-365 dias)",
      "Artefatos de CI devem ser mantidos por mais tempo porque sÃ£o necessÃ¡rios para depuraÃ§Ã£o",
      "Artefatos de produÃ§Ã£o devem ser excluÃ­dos imediatamente apÃ³s o deploy para economizar espaÃ§o"
    ],
    correctIndex: 1,
    explanation: "Artefatos de CI e PR sÃ£o transitÃ³rios e necessÃ¡rios apenas durante o ciclo de revisÃ£o/merge (alguns dias no mÃ¡ximo). Artefatos de release de produÃ§Ã£o podem ser necessÃ¡rios para rollback, auditoria ou conformidade e devem ser retidos por meses ou anos dependendo dos requisitos regulatÃ³rios. Essa abordagem em camadas otimiza custos de armazenamento enquanto atende Ã s necessidades de conformidade."
  },
  {
    question: "Qual Ã© a abordagem recomendada para gerenciar a retenÃ§Ã£o de imagens de contÃªiner no Azure Container Registry?",
    options: [
      "Excluir imagens manualmente quando o armazenamento estiver cheio",
      "Usar tarefas ACR purge com filtros para remover automaticamente manifestos sem tag e tags antigas, mantendo um nÃºmero mÃ­nimo",
      "Excluir o repositÃ³rio inteiro e reenviar apenas as imagens necessÃ¡rias",
      "Usar imagens base menores para reduzir o armazenamento"
    ],
    correctIndex: 1,
    explanation: "As tarefas ACR purge (agendadas via az acr task) fornecem gerenciamento automatizado de ciclo de vida. Elas suportam filtros regex para padrÃµes de tags, --ago para limpeza baseada em idade, --keep para contagem mÃ­nima de retenÃ§Ã£o, e --untagged para manifestos pendentes. Isso garante que imagens crÃ­ticas para produÃ§Ã£o sejam preservadas enquanto artefatos de build antigos sÃ£o limpos automaticamente."
  },
  {
    question: "Por que Ã© importante excluir imagens de contÃªiner sem tag de um registro?",
    options: [
      "Imagens sem tag causam vulnerabilidades de seguranÃ§a",
      "Imagens sem tag consomem armazenamento sem servir a nenhum propÃ³sito, pois nÃ£o podem ser baixadas por tag",
      "Imagens sem tag tornam a API do registro mais lenta",
      "Imagens sem tag impedem novos pushes para o mesmo repositÃ³rio"
    ],
    correctIndex: 1,
    explanation: "Quando uma nova imagem Ã© enviada com uma tag existente, a imagem anterior fica \"sem tag\" (seu manifesto permanece, mas nÃ£o tem referÃªncia de tag). Esses manifestos pendentes acumulam armazenamento mas nÃ£o podem ser baixados por nome, tornando-os desperdÃ­cio. A limpeza regular de imagens sem tag Ã© uma prÃ¡tica recomendada para higiene do registro de contÃªineres e controle de custos."
  }
]} />

## Limpeza

```bash
# Remove ACR purge tasks
az acr task delete --name purge-old-images --registry contosoregistry --yes

# Remove scheduled cleanup pipelines
gh workflow disable retention-cleanup.yml

# Remove retention leases (Azure DevOps)
# List leases
az devops invoke \
  --area build \
  --resource retention/leases \
  --org https://dev.azure.com/contoso \
  --route-parameters project=ContosoAPI \
  --query-parameters 'ownerId=User:*'

# Clean up test artifacts created during this challenge
gh api repos/{owner}/{repo}/actions/artifacts --paginate \
  --jq '.artifacts[] | select(.name | test("^(build-|coverage-)")) | .id' | \
  xargs -I {} gh api --method DELETE repos/{owner}/{repo}/actions/artifacts/{}
```
