---
sidebar_position: 3
title: "Desafio 36: Estratégias de retenção"
sidebar_label: "Desafio 36: Estratégias de retenção"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 36: Estratégias de retenção

:::info Plataforma: comparação
Este desafio abrange o gerenciamento de retenção tanto do GitHub Actions/Packages quanto do Azure Pipelines/Artifacts.
:::

## Habilidades do exame mapeadas

- Projetar e implementar uma estratégia de retenção para artefatos de pipeline e dependências

## Cenário

O projeto Azure DevOps da Contoso Ltd acumulou 500 GB de armazenamento de artefatos que cresce 50 GB por mês. Seus repositórios GitHub também têm armazenamento de artefatos inchado. O detalhamento:

- Artefatos de execução de pipeline (saídas de build, resultados de teste): 200 GB
- Feed do Azure Artifacts (pacotes npm): 180 GB (incluindo 3 anos de versões pré-release)
- Imagens de contêiner no ACR: 120 GB
- Artefatos de release retidos indefinidamente: crescendo sem controle

Os custos mensais de armazenamento são $150 e subindo. A equipe de conformidade exige que artefatos de release de produção sejam mantidos por 1 ano, mas artefatos de dev/test precisam apenas de 7 dias. Projete e implemente uma estratégia abrangente de retenção.

## Tarefa 1: Configurar políticas de retenção de artefatos no Azure Pipelines

Defina políticas de retenção no nível do projeto e do pipeline:

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

Substitua a retenção no nível da execução para builds importantes:

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

## Tarefa 2: Configurar retenção de artefatos do GitHub Actions

Defina retenção padrão e por artefato para GitHub Actions:

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

## Tarefa 3: Retenção de releases (manter releases de produção por mais tempo)

Implemente retenção em camadas baseada no ambiente:

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

Para GitHub, use releases com retenção baseada em tags:

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

## Tarefa 4: Retenção de versões de pacotes no Azure Artifacts e GitHub Packages

Configure retenção para feeds de pacotes:

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

## Tarefa 5: Políticas de limpeza de feeds (remover versões pré-release antigas)

Configure views de retenção e limpeza do Azure Artifacts:

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

## Tarefa 6: Análise de custos de armazenamento e otimização

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

Calcule as economias com a implementação da retenção:

```text
Análise de custos de armazenamento:
- Total atual: 500 GB a ~$0.30/GB/mês = $150/mês
- Após políticas de retenção:
  - Artefatos de pipeline: 200 GB -> 30 GB (retenção de 7 dias para CI, 365 para releases)
  - Feed de pacotes: 180 GB -> 50 GB (manter 5 versões por pacote)
  - Imagens de contêiner: 120 GB -> 40 GB (manter 20 tags, purgar sem tag)
- Novo total: 120 GB a $0.30/GB/mês = $36/mês
- Economia mensal: $114/mês ($1.368/ano)
```

## Tarefa 7: Implementando gerenciamento de ciclo de vida via Azure CLI e REST API

Automatize o gerenciamento de retenção com scripts e APIs:

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

## Exercícios de quebra e conserto

### Exercício 1: Corrigir o vazamento de retenção

Artefatos de release de produção estão sendo excluídos após 30 dias apesar de uma política de 365 dias. Diagnostique:

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
<summary>Mostrar solução</summary>

**Correção:**

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

### Exercício 2: Corrigir o ACR purge excluindo imagens de produção

A tarefa automatizada de ACR purge está excluindo imagens que estão em execução na produção:

```bash
# BROKEN: Purges all images older than 7 days regardless of use
az acr run --registry contosoregistry --cmd "acr purge \
  --filter 'contoso-api:.*' \
  --ago 7d" /dev/null
# This deletes the 'latest' and 'v1.4.2' tags that production is using!
```


<details>
<summary>Mostrar solução</summary>

**Correção:**

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
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que é um retention lease no Azure Pipelines?",
    options: [
      "Uma licença que determina quantos pipelines podem ser executados simultaneamente",
      "Um bloqueio programático que impede que uma execução de pipeline e seus artefatos sejam excluídos pelas políticas de retenção",
      "Uma cota de armazenamento atribuída a cada definição de pipeline",
      "Uma permissão com tempo limitado para acessar artefatos de pipeline"
    ],
    correctIndex: 1,
    explanation: "Um retention lease é um bloqueio gerenciado por API que substitui as configurações de retenção no nível do projeto para execuções de pipeline específicas. Quando um lease está ativo, a execução e seus artefatos são protegidos contra exclusão automática independentemente do período de retenção configurado. Leases possuem uma propriedade daysValid que define quanto tempo a proteção dura."
  },
  {
    question: "Como a retenção de artefatos deve diferir entre builds de CI e releases de produção?",
    options: [
      "Todos os artefatos devem ter a mesma retenção independentemente do ambiente",
      "Artefatos de CI/PR devem ter retenção curta (1-7 dias); artefatos de release de produção devem ter retenção longa (90-365 dias)",
      "Artefatos de CI devem ser mantidos por mais tempo porque são necessários para depuração",
      "Artefatos de produção devem ser excluídos imediatamente após o deploy para economizar espaço"
    ],
    correctIndex: 1,
    explanation: "Artefatos de CI e PR são transitórios e necessários apenas durante o ciclo de revisão/merge (alguns dias no máximo). Artefatos de release de produção podem ser necessários para rollback, auditoria ou conformidade e devem ser retidos por meses ou anos dependendo dos requisitos regulatórios. Essa abordagem em camadas otimiza custos de armazenamento enquanto atende às necessidades de conformidade."
  },
  {
    question: "Qual é a abordagem recomendada para gerenciar a retenção de imagens de contêiner no Azure Container Registry?",
    options: [
      "Excluir imagens manualmente quando o armazenamento estiver cheio",
      "Usar tarefas ACR purge com filtros para remover automaticamente manifestos sem tag e tags antigas, mantendo um número mínimo",
      "Excluir o repositório inteiro e reenviar apenas as imagens necessárias",
      "Usar imagens base menores para reduzir o armazenamento"
    ],
    correctIndex: 1,
    explanation: "As tarefas ACR purge (agendadas via az acr task) fornecem gerenciamento automatizado de ciclo de vida. Elas suportam filtros regex para padrões de tags, --ago para limpeza baseada em idade, --keep para contagem mínima de retenção, e --untagged para manifestos pendentes. Isso garante que imagens críticas para produção sejam preservadas enquanto artefatos de build antigos são limpos automaticamente."
  },
  {
    question: "Por que é importante excluir imagens de contêiner sem tag de um registro?",
    options: [
      "Imagens sem tag causam vulnerabilidades de segurança",
      "Imagens sem tag consomem armazenamento sem servir a nenhum propósito, pois não podem ser baixadas por tag",
      "Imagens sem tag tornam a API do registro mais lenta",
      "Imagens sem tag impedem novos pushes para o mesmo repositório"
    ],
    correctIndex: 1,
    explanation: "Quando uma nova imagem é enviada com uma tag existente, a imagem anterior fica \"sem tag\" (seu manifesto permanece, mas não tem referência de tag). Esses manifestos pendentes acumulam armazenamento mas não podem ser baixados por nome, tornando-os desperdício. A limpeza regular de imagens sem tag é uma prática recomendada para higiene do registro de contêineres e controle de custos."
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
