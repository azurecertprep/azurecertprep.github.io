---
sidebar_position: 3
title: "Challenge 36: Retention strategies"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 36: Retention strategies

:::info Platform: comparison
This challenge covers both GitHub Actions/Packages and Azure Pipelines/Artifacts retention management.
:::

## Exam skills mapped

- Design and implement a retention strategy for pipeline artifacts and dependencies

## Scenario

Contoso Ltd's Azure DevOps project has accumulated 500 GB of artifact storage that grows by 50 GB per month. Their GitHub repositories similarly have bloated artifact storage. The breakdown:

- Pipeline run artifacts (build outputs, test results): 200 GB
- Azure Artifacts feed (npm packages): 180 GB (including 3 years of pre-release versions)
- Container images in ACR: 120 GB
- Release artifacts retained indefinitely: growing unchecked

Monthly storage costs are $150 and climbing. The compliance team requires production release artifacts be kept for 1 year, but dev/test artifacts only need 7 days. Design and implement a comprehensive retention strategy.

## Task 1: Configure artifact retention policies in Azure Pipelines

Set project-level and pipeline-level retention policies:

```bash
# View current project retention settings
az devops invoke \
  --area build \
  --resource settings \
  --org https://dev.azure.com/contoso \
  --route-parameters project=ContosoAPI \
  --http-method GET
```

Configure in Azure DevOps: Project Settings > Pipelines > Settings > Retention:

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

Override retention at the run level for important builds:

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

## Task 2: Configure GitHub Actions artifact retention

Set default and per-artifact retention for GitHub Actions:

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

Clean up old artifacts programmatically:

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

## Task 3: Release retention (keep production releases longer)

Implement tiered retention based on environment:

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

For GitHub, use releases with tag-based retention:

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

## Task 4: Package version retention in Azure Artifacts and GitHub Packages

Configure retention for package feeds:

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

For GitHub Packages (npm):

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

## Task 5: Feed cleanup policies (remove old pre-release versions)

Configure Azure Artifacts retention views and cleanup:

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

Automate cleanup with a scheduled pipeline:

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

## Task 6: Storage cost analysis and optimization

Analyze current storage usage and identify savings:

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

Calculate savings from implementing retention:

```text
Storage cost analysis:
- Current total: 500 GB at ~$0.30/GB/month = $150/month
- After retention policies:
  - Pipeline artifacts: 200 GB -> 30 GB (7-day retention for CI, 365 for releases)
  - Package feed: 180 GB -> 50 GB (keep 5 versions per package)
  - Container images: 120 GB -> 40 GB (keep 20 tags, purge untagged)
- New total: 120 GB at $0.30/GB/month = $36/month
- Monthly savings: $114/month ($1,368/year)
```

## Task 7: Implementing lifecycle management via Azure CLI and REST API

Automate retention management with scripts and APIs:

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

GitHub Actions lifecycle management:

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

## Break & fix

### Exercise 1: Fix the retention leak

Production release artifacts are being deleted after 30 days despite a 365-day policy. Diagnose:

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
<summary>Show solution</summary>

**Fix:**

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

### Exercise 2: Fix the ACR purge deleting production images

The automated ACR purge task is deleting images currently running in production:

```bash
# BROKEN: Purges all images older than 7 days regardless of use
az acr run --registry contosoregistry --cmd "acr purge \
  --filter 'contoso-api:.*' \
  --ago 7d" /dev/null
# This deletes the 'latest' and 'v1.4.2' tags that production is using!
```


<details>
<summary>Show solution</summary>

**Fix:**

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
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is a retention lease in Azure Pipelines?",
    options: [
      "A license that determines how many pipelines can run concurrently",
      "A programmatic lock that prevents a pipeline run and its artifacts from being deleted by retention policies",
      "A storage quota assigned to each pipeline definition",
      "A time-limited permission to access pipeline artifacts"
    ],
    correctIndex: 1,
    explanation: "A retention lease is an API-managed lock that overrides project-level retention settings for specific pipeline runs. When a lease is active, the run and its artifacts are protected from automatic deletion regardless of the configured retention period. Leases have a daysValid property that defines how long the protection lasts."
  },
  {
    question: "How should artifact retention differ between CI builds and production releases?",
    options: [
      "All artifacts should have the same retention regardless of environment",
      "CI/PR artifacts should have short retention (1-7 days); production release artifacts should have long retention (90-365 days)",
      "CI artifacts should be kept longer because they are needed for debugging",
      "Production artifacts should be deleted immediately after deployment to save space"
    ],
    correctIndex: 1,
    explanation: "CI and PR artifacts are transient and only needed during the review/merge cycle (a few days at most). Production release artifacts may be needed for rollback, auditing, or compliance and should be retained for months or years depending on regulatory requirements. This tiered approach optimizes storage costs while meeting compliance needs."
  },
  {
    question: "What is the recommended approach for managing container image retention in Azure Container Registry?",
    options: [
      "Manually delete images when storage is full",
      "Use ACR purge tasks with filters to automatically remove untagged manifests and old tags while keeping a minimum number",
      "Delete the entire repository and re-push only needed images",
      "Use smaller base images to reduce storage"
    ],
    correctIndex: 1,
    explanation: "ACR purge tasks (scheduled via az acr task) provide automated lifecycle management. They support regex filters for tag patterns, --ago for age-based cleanup, --keep for minimum retention count, and --untagged for dangling manifests. This ensures production-critical images are preserved while old build artifacts are cleaned up automatically."
  },
  {
    question: "Why is it important to delete untagged container images from a registry?",
    options: [
      "Untagged images cause security vulnerabilities",
      "Untagged images consume storage without serving any purpose since they cannot be pulled by tag",
      "Untagged images slow down the registry API",
      "Untagged images prevent new pushes to the same repository"
    ],
    correctIndex: 1,
    explanation: "When a new image is pushed with an existing tag, the previous image becomes \"untagged\" (its manifest remains but has no tag reference). These dangling manifests accumulate storage but cannot be pulled by name, making them waste. Regular purging of untagged images is a best practice for container registry hygiene and cost control."
  }
]} />

## Cleanup

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
