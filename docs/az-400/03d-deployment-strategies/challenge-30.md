---
sidebar_position: 6
title: "Challenge 30: Hotfix paths and resiliency"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 30: Hotfix paths and resiliency

## Exam skills mapped

- Design a hotfix path plan for responding to high-priority code fixes
- Design and implement a resiliency strategy for deployment
- Design a pipeline to ensure that dependency deployments are reliably ordered

## Scenario

Production is down. A critical bug in Contoso's payment processing service is silently dropping transactions when the order total exceeds $10,000. The issue was introduced in yesterday's release (v2.4.0). The normal release pipeline takes 2 hours due to full integration tests, security scans, manual approval gates, and progressive rollout through rings. Customer impact is growing by the minute.

The engineering team needs a hotfix path that can deploy a verified fix to production in under 15 minutes while maintaining essential safety checks. They also need to design resilient deployment pipelines that handle dependency ordering and include circuit breakers to prevent cascading failures.

**Environment details:**
- Payment Service: Azure App Service `app-contoso-payments`
- Shared Library: NuGet package `Contoso.Payments.Core`
- Frontend: Azure Static Web Apps `swa-contoso-store`
- Resource group: `rg-contoso-prod`
- Current broken version: `v2.4.0` (tag: `release/2.4.0`)
- Last known good version: `v2.3.1` (tag: `release/2.3.1`)

---

## Task 1: Design hotfix branching strategy

### Branching model for hotfixes

The hotfix branch is created from the release tag (not from `main`) to avoid picking up unreleased changes.

```bash
# Step 1: Create hotfix branch from the broken release tag
git checkout -b hotfix/payment-over-10k release/2.4.0

# Step 2: Apply the minimal fix
# Edit the specific file with the bug fix
git add src/PaymentService/Handlers/ProcessPaymentHandler.cs
git commit -m "fix: handle payment amounts exceeding 10000 threshold

The payment validation incorrectly rejected amounts over 10000 due to
an integer overflow in the amount conversion. Changed to use decimal
comparison.

Fixes: INC-4521"

# Step 3: Tag the hotfix release
git tag -a release/2.4.1 -m "Hotfix: payment amount overflow fix"

# Step 4: Push the hotfix branch and tag
git push origin hotfix/payment-over-10k
git push origin release/2.4.1
```

### Post-hotfix: cherry-pick back to main

```bash
# After hotfix is deployed and verified, merge fix back to main
git checkout main
git pull origin main

# Cherry-pick the fix commit into main
git cherry-pick <hotfix-commit-sha>

# If there are conflicts, resolve them
git add .
git commit -m "fix: cherry-pick payment overflow fix from hotfix/payment-over-10k

Original fix deployed as v2.4.1 hotfix.
Cherry-picked to main for inclusion in next regular release."

git push origin main

# Clean up the hotfix branch
git branch -d hotfix/payment-over-10k
git push origin --delete hotfix/payment-over-10k
```

---

## Task 2: Expedited pipeline (skip non-critical gates, keep security scan)

### Hotfix pipeline (GitHub Actions)

Create `.github/workflows/hotfix-deploy.yml`:

```yaml
name: Hotfix deployment (expedited)

on:
  push:
    branches:
      - 'hotfix/**'
    tags:
      - 'release/*.*.*'

env:
  AZURE_WEBAPP_NAME: app-contoso-payments
  RESOURCE_GROUP: rg-contoso-prod
  DOTNET_VERSION: '8.0.x'

jobs:
  build-and-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Build
        run: |
          dotnet restore src/PaymentService/PaymentService.csproj
          dotnet build src/PaymentService/PaymentService.csproj -c Release

      - name: Run critical tests only (skip integration/e2e)
        run: |
          dotnet test tests/PaymentService.UnitTests/PaymentService.UnitTests.csproj \
            --configuration Release \
            --filter "Category=Critical|Category=Payment" \
            --no-build

      - name: Security scan (never skip this)
        uses: github/codeql-action/analyze@v3
        with:
          languages: csharp
          queries: security-and-quality

      - name: Publish
        run: |
          dotnet publish src/PaymentService/PaymentService.csproj \
            -c Release -o ./publish

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: hotfix-package
          path: ./publish

  deploy-hotfix:
    runs-on: ubuntu-latest
    needs: build-and-scan
    environment: production-hotfix
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: hotfix-package
          path: ./publish

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy directly to production slot
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          slot-name: staging
          package: ./publish

      - name: Quick health validation (30 seconds max)
        run: |
          STAGING_URL="https://${{ env.AZURE_WEBAPP_NAME }}-staging.azurewebsites.net"
          for i in {1..6}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/health")
            if [ "$STATUS" == "200" ]; then
              echo "Staging healthy - proceeding with swap"
              exit 0
            fi
            sleep 5
          done
          echo "Staging not healthy after 30 seconds"
          exit 1

      - name: Swap to production (immediate)
        run: |
          az webapp deployment slot swap \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --slot staging \
            --target-slot production

      - name: Verify fix in production
        run: |
          PROD_URL="https://${{ env.AZURE_WEBAPP_NAME }}.azurewebsites.net"
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/health")
          echo "Production status: $STATUS"
          if [ "$STATUS" != "200" ]; then
            echo "Production not healthy - rolling back"
            az webapp deployment slot swap \
              --name ${{ env.AZURE_WEBAPP_NAME }} \
              --resource-group ${{ env.RESOURCE_GROUP }} \
              --slot staging \
              --target-slot production
            exit 1
          fi

      - name: Notify team
        if: always()
        run: |
          if [ "${{ job.status }}" == "success" ]; then
            echo "Hotfix deployed successfully to production"
          else
            echo "Hotfix deployment FAILED - manual intervention required"
          fi
```

### Comparison: Normal vs hotfix pipeline

| Gate | Normal pipeline | Hotfix pipeline |
|------|----------------|-----------------|
| Unit tests | Full suite (~15 min) | Critical tests only (~2 min) |
| Integration tests | Full suite (~30 min) | Skipped |
| Security scan | Full SAST + DAST | SAST only (CodeQL) |
| Manual approval | Required (2 reviewers) | Single approver (on-call lead) |
| Progressive rollout | Ring 0, 1, 2, 3 (48 hrs) | Direct to production |
| Smoke tests | Full regression | Health check only |
| Total time | ~2 hours | ~10-15 minutes |

---

## Task 3: Deployment dependency ordering

### Service dependency graph

![Challenge 30 - Package Dependency Architecture](/img/az-400/challenge-30-topology.svg)


### Azure Pipelines with dependency ordering

Create `azure-pipelines-ordered-deploy.yml`:

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  azureSubscription: 'contoso-production-connection'

stages:
  - stage: BuildAll
    displayName: 'Build all services'
    jobs:
      - job: BuildCore
        displayName: 'Build shared library'
        steps:
          - script: |
              dotnet pack src/Contoso.Payments.Core/Contoso.Payments.Core.csproj \
                --configuration Release \
                --output $(Build.ArtifactStagingDirectory)/core
            displayName: 'Pack NuGet package'
          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)/core'
              ArtifactName: 'core-package'

      - job: BuildPaymentService
        displayName: 'Build Payment Service'
        dependsOn: BuildCore
        steps:
          - task: DownloadPipelineArtifact@2
            inputs:
              artifact: 'core-package'
              path: '$(Pipeline.Workspace)/core-package'
          - script: |
              dotnet nuget add source $(Pipeline.Workspace)/core-package --name local
              dotnet publish src/PaymentService/PaymentService.csproj \
                -c Release -o $(Build.ArtifactStagingDirectory)/payment
            displayName: 'Build with latest Core package'
          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)/payment'
              ArtifactName: 'payment-service'

      - job: BuildNotificationService
        displayName: 'Build Notification Service'
        dependsOn: BuildCore
        steps:
          - task: DownloadPipelineArtifact@2
            inputs:
              artifact: 'core-package'
              path: '$(Pipeline.Workspace)/core-package'
          - script: |
              dotnet nuget add source $(Pipeline.Workspace)/core-package --name local
              dotnet publish src/NotificationService/NotificationService.csproj \
                -c Release -o $(Build.ArtifactStagingDirectory)/notification
            displayName: 'Build with latest Core package'
          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)/notification'
              ArtifactName: 'notification-service'

      - job: BuildFrontend
        displayName: 'Build Frontend'
        steps:
          - script: |
              cd src/Frontend
              npm ci
              npm run build
            displayName: 'Build frontend'
          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: 'src/Frontend/dist'
              ArtifactName: 'frontend'

  - stage: DeployBackend
    displayName: 'Deploy backend services'
    dependsOn: BuildAll
    jobs:
      - deployment: DeployPaymentService
        displayName: 'Deploy Payment Service'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: $(azureSubscription)
                    appName: 'app-contoso-payments'
                    deployToSlotOrASE: true
                    slotName: 'staging'
                    package: '$(Pipeline.Workspace)/payment-service'
                - task: AzureAppServiceManage@0
                  inputs:
                    azureSubscription: $(azureSubscription)
                    action: 'Swap Slots'
                    webAppName: 'app-contoso-payments'
                    resourceGroupName: 'rg-contoso-prod'
                    sourceSlot: 'staging'

      - deployment: DeployNotificationService
        displayName: 'Deploy Notification Service'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: $(azureSubscription)
                    appName: 'app-contoso-notifications'
                    deployToSlotOrASE: true
                    slotName: 'staging'
                    package: '$(Pipeline.Workspace)/notification-service'
                - task: AzureAppServiceManage@0
                  inputs:
                    azureSubscription: $(azureSubscription)
                    action: 'Swap Slots'
                    webAppName: 'app-contoso-notifications'
                    resourceGroupName: 'rg-contoso-prod'
                    sourceSlot: 'staging'

  - stage: DeployFrontend
    displayName: 'Deploy Frontend (depends on backend)'
    dependsOn: DeployBackend
    jobs:
      - deployment: DeployStaticWebApp
        displayName: 'Deploy to Static Web Apps'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureStaticWebApp@0
                  inputs:
                    app_location: '$(Pipeline.Workspace)/frontend'
                    azure_static_web_apps_api_token: $(SWA_DEPLOYMENT_TOKEN)
```

---

## Task 4: Rollback automation (automatic revert on failure)

### Immediate rollback via slot swap

```bash
#!/bin/bash
# emergency-rollback.sh - Instant rollback via slot swap

set -euo pipefail

APP_NAME="app-contoso-payments"
RESOURCE_GROUP="rg-contoso-prod"

echo "EMERGENCY ROLLBACK: Swapping production back to previous version..."

# The staging slot contains the previous production version after a swap
az webapp deployment slot swap \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --target-slot production

echo "Rollback complete. Verifying..."

PROD_URL="https://${APP_NAME}.azurewebsites.net/health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")

if [ "$STATUS" == "200" ]; then
  echo "Production healthy after rollback (status: $STATUS)"
else
  echo "WARNING: Production still unhealthy after rollback (status: $STATUS)"
  echo "Manual intervention required!"
  exit 1
fi
```

### GitHub Actions reusable workflow for rollback

Create `.github/workflows/rollback.yml`:

```yaml
name: Emergency rollback

on:
  workflow_dispatch:
    inputs:
      service:
        description: 'Service to rollback'
        required: true
        type: choice
        options:
          - payment-service
          - notification-service
          - all
      reason:
        description: 'Reason for rollback'
        required: true
        type: string

env:
  RESOURCE_GROUP: rg-contoso-prod

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production-emergency
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Rollback payment service
        if: inputs.service == 'payment-service' || inputs.service == 'all'
        run: |
          az webapp deployment slot swap \
            --name app-contoso-payments \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --slot staging \
            --target-slot production
          echo "Payment service rolled back"

      - name: Rollback notification service
        if: inputs.service == 'notification-service' || inputs.service == 'all'
        run: |
          az webapp deployment slot swap \
            --name app-contoso-notifications \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --slot staging \
            --target-slot production
          echo "Notification service rolled back"

      - name: Verify health
        run: |
          sleep 10
          if [ "${{ inputs.service }}" == "payment-service" ] || [ "${{ inputs.service }}" == "all" ]; then
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app-contoso-payments.azurewebsites.net/health")
            echo "Payment service: $STATUS"
          fi
          if [ "${{ inputs.service }}" == "notification-service" ] || [ "${{ inputs.service }}" == "all" ]; then
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app-contoso-notifications.azurewebsites.net/health")
            echo "Notification service: $STATUS"
          fi

      - name: Create incident record
        run: |
          echo "Rollback performed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
          echo "Service: ${{ inputs.service }}"
          echo "Reason: ${{ inputs.reason }}"
          echo "Triggered by: ${{ github.actor }}"
```

---

## Task 5: Circuit breaker pattern in deployment

### Deployment circuit breaker concept

A deployment circuit breaker stops progressive rollout when failure thresholds are exceeded, preventing bad deployments from reaching more users.

### Implementation in GitHub Actions

```yaml
  progressive-deploy-with-circuit-breaker:
    runs-on: ubuntu-latest
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to 10% (canary)
        run: |
          az webapp traffic-routing set \
            --name app-contoso-payments \
            --resource-group rg-contoso-prod \
            --distribution staging=10

      - name: Monitor canary (circuit breaker check)
        id: canary-check
        run: |
          MONITORING_DURATION=120
          CHECK_INTERVAL=15
          ERROR_THRESHOLD=5
          ERROR_COUNT=0
          ELAPSED=0

          while [ $ELAPSED -lt $MONITORING_DURATION ]; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app-contoso-payments-staging.azurewebsites.net/health")
            if [ "$STATUS" != "200" ]; then
              ERROR_COUNT=$((ERROR_COUNT + 1))
              echo "Error detected (count: $ERROR_COUNT, threshold: $ERROR_THRESHOLD)"

              if [ $ERROR_COUNT -ge $ERROR_THRESHOLD ]; then
                echo "CIRCUIT BREAKER TRIPPED: Error threshold exceeded"
                echo "tripped=true" >> $GITHUB_OUTPUT
                exit 1
              fi
            fi
            sleep $CHECK_INTERVAL
            ELAPSED=$((ELAPSED + CHECK_INTERVAL))
          done
          echo "Canary monitoring passed (errors: $ERROR_COUNT)"
          echo "tripped=false" >> $GITHUB_OUTPUT

      - name: Circuit breaker - halt and rollback
        if: failure()
        run: |
          echo "Circuit breaker activated - removing canary traffic"
          az webapp traffic-routing clear \
            --name app-contoso-payments \
            --resource-group rg-contoso-prod
          echo "All traffic restored to production (canary removed)"

      - name: Promote to 50%
        if: success()
        run: |
          az webapp traffic-routing set \
            --name app-contoso-payments \
            --resource-group rg-contoso-prod \
            --distribution staging=50

      - name: Monitor 50% deployment
        if: success()
        run: |
          # Same monitoring pattern as canary check
          sleep 120
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app-contoso-payments.azurewebsites.net/health")
          if [ "$STATUS" != "200" ]; then
            echo "Health check failed at 50% - rolling back"
            az webapp traffic-routing clear \
              --name app-contoso-payments \
              --resource-group rg-contoso-prod
            exit 1
          fi

      - name: Promote to 100% (swap)
        if: success()
        run: |
          az webapp traffic-routing clear \
            --name app-contoso-payments \
            --resource-group rg-contoso-prod
          az webapp deployment slot swap \
            --name app-contoso-payments \
            --resource-group rg-contoso-prod \
            --slot staging \
            --target-slot production
```

### Azure Container Apps revision-based circuit breaker

```bash
# Deploy new revision with 0% traffic initially
az containerapp update \
  --name ca-contoso-payments \
  --resource-group rg-contoso-prod \
  --image acrcontosoprod.azurecr.io/payment-service:v2.4.1 \
  --revision-suffix hotfix-v241

# Route 10% to new revision
az containerapp ingress traffic set \
  --name ca-contoso-payments \
  --resource-group rg-contoso-prod \
  --revision-weight "ca-contoso-payments--hotfix-v241=10" \
  --revision-weight "ca-contoso-payments--stable=90"

# If errors detected, immediately route all traffic back
az containerapp ingress traffic set \
  --name ca-contoso-payments \
  --resource-group rg-contoso-prod \
  --revision-weight "ca-contoso-payments--stable=100"
```

---

## Task 6: Post-hotfix cherry-pick back to main

### Automated cherry-pick workflow

Create `.github/workflows/cherry-pick-hotfix.yml`:

```yaml
name: Cherry-pick hotfix to main

on:
  push:
    tags:
      - 'release/*'

jobs:
  cherry-pick:
    runs-on: ubuntu-latest
    if: contains(github.ref, 'hotfix') || contains(github.event.head_commit.message, 'fix:')
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.PAT_TOKEN }}

      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Cherry-pick to main
        run: |
          HOTFIX_SHA=$(git rev-parse HEAD)
          git checkout main
          git pull origin main

          if git cherry-pick $HOTFIX_SHA --no-commit; then
            git commit -m "fix: cherry-pick hotfix $(git describe --tags) to main

          Original commit: $HOTFIX_SHA
          Auto-cherry-picked from hotfix branch."
            git push origin main
            echo "Cherry-pick successful"
          else
            # If cherry-pick has conflicts, create a PR instead
            git cherry-pick --abort
            git checkout -b auto/cherry-pick-$HOTFIX_SHA
            git cherry-pick $HOTFIX_SHA || true
            git add -A
            git commit -m "fix: cherry-pick hotfix (conflicts resolved manually)"
            git push origin auto/cherry-pick-$HOTFIX_SHA

            gh pr create \
              --title "Cherry-pick hotfix to main (conflicts)" \
              --body "Automated cherry-pick of hotfix $HOTFIX_SHA. Manual conflict resolution required." \
              --base main \
              --head auto/cherry-pick-$HOTFIX_SHA
            echo "Created PR for manual conflict resolution"
          fi
```

---

## Break & fix

### Exercise 1: Hotfix deploys but fix is not active

**Symptom:** The hotfix was deployed and the slot swap succeeded, but customers still experience the payment bug.

**Investigate:**
```bash
# Check which version is actually running in production
curl -s "https://app-contoso-payments.azurewebsites.net/api/version"

# Check deployment slot status
az webapp show \
  --name app-contoso-payments \
  --resource-group rg-contoso-prod \
  --query "state"

# Check if traffic routing is sending traffic to staging instead
az webapp traffic-routing show \
  --name app-contoso-payments \
  --resource-group rg-contoso-prod
```

<details>
<summary>Show solution</summary>

**Root cause:** Traffic routing was still configured to send 10% to the staging slot from a previous canary test. After the swap, the "staging" slot now contains the OLD (broken) production code, and 10% of traffic goes there.

**Fix:**
```bash
# Clear all traffic routing rules
az webapp traffic-routing clear \
  --name app-contoso-payments \
  --resource-group rg-contoso-prod
```

</details>

### Exercise 2: Dependency ordering failure

**Symptom:** The frontend deployment completes before the Payment Service API is ready, causing UI errors for 2 minutes.

<details>
<summary>Show solution</summary>

**Root cause:** The pipeline stages did not have `dependsOn` configured between frontend and backend deployments.

**Fix:**
```yaml
# Ensure frontend waits for backend
- stage: DeployFrontend
  dependsOn: DeployBackend  # This ensures ordering
  condition: succeeded('DeployBackend')
```

</details>

### Exercise 3: Cherry-pick conflicts block main

**Symptom:** After deploying the hotfix from `release/2.4.0`, the cherry-pick to `main` fails with merge conflicts because `main` has diverged significantly.

<details>
<summary>Show solution</summary>

**Root cause:** The file structure on `main` changed (refactoring moved the affected code), so the cherry-pick cannot apply cleanly.

**Fix:** Instead of an automated cherry-pick, create a PR with the logical fix applied to the new file structure:
```bash
# Create a branch from main and manually apply the fix
git checkout main
git checkout -b fix/payment-overflow-main
# Apply the fix to the new file location
git add .
git commit -m "fix: payment amount overflow (port from hotfix/payment-over-10k)"
git push origin fix/payment-overflow-main

# Create PR for review
gh pr create \
  --title "Port hotfix: payment amount overflow" \
  --body "Manual port of hotfix v2.4.1 to main branch due to cherry-pick conflicts." \
  --base main
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Contoso's production payment service is down. The normal release pipeline takes 2 hours. A hotfix branch is created from the release tag. Which gates should be SKIPPED in the hotfix pipeline to reduce deployment time while maintaining safety?",
    options: [
      "Security scan, unit tests, and manual approval",
      "Integration tests, progressive rollout rings, and full regression suite",
      "All gates should be maintained regardless of urgency",
      "Security scan and unit tests (only manual approval remains)"
    ],
    correctIndex: 1,
    explanation: "For hotfixes, the pipeline should skip time-consuming but non-critical gates: integration tests, end-to-end tests, progressive rollout (rings), and full regression. However, security scans and critical unit tests should NEVER be skipped, as they catch vulnerabilities and verify the fix works. Manual approval can be reduced to a single on-call approver."
  },
  {
    question: "A hotfix branch should be created from which source to ensure it only contains the minimal fix without unreleased changes?",
    options: [
      "The 'main' branch (latest development code)",
      "The release tag that introduced the bug (e.g., 'release/2.4.0')",
      "The 'develop' branch (next release candidate)",
      "The previous release tag (e.g., 'release/2.3.1')"
    ],
    correctIndex: 1,
    explanation: "The hotfix branch should be created from the current production release tag. This ensures the fix is applied to exactly the code running in production without including unreleased features from main or develop. Creating from the previous release (v2.3.1) would revert all v2.4.0 changes, not just fix the bug."
  },
  {
    question: "Contoso has three services with dependencies: Shared Library leads to API leads to Frontend. The pipeline deploys all three. What ensures the Frontend is not deployed before the API is ready?",
    options: [
      "Configure all deployments to run in parallel for speed",
      "Use 'dependsOn' in the pipeline to create explicit stage ordering",
      "Deploy all services to the same App Service Plan",
      "Use Azure Traffic Manager to hold frontend traffic"
    ],
    correctIndex: 1,
    explanation: "The dependsOn property in Azure Pipelines (or needs in GitHub Actions) creates explicit execution ordering between stages or jobs. The Frontend deployment stage should depend on the Backend deployment stage, which depends on the Shared Library stage. This ensures each layer is deployed and healthy before the next layer begins."
  },
  {
    question: "A deployment circuit breaker monitors the canary deployment and detects the error rate exceeding 5%. What should the circuit breaker do?",
    options: [
      "Increase the canary traffic percentage to get more data",
      "Alert the team and wait for manual intervention",
      "Immediately halt promotion and route all traffic back to the stable version",
      "Restart the canary instances to clear transient errors"
    ],
    correctIndex: 2,
    explanation: "A deployment circuit breaker should automatically halt the rollout and revert to the known-good state when failure thresholds are exceeded. This minimizes customer impact by immediately stopping the deployment without waiting for human intervention. The team can then investigate the issue offline and retry the deployment after fixing it."
  }
]} />

## Cleanup

```bash
# Delete hotfix branch
git push origin --delete hotfix/payment-over-10k 2>/dev/null || true

# Clear any traffic routing
az webapp traffic-routing clear \
  --name app-contoso-payments \
  --resource-group rg-contoso-prod

# Delete resource group
az group delete --name rg-contoso-prod --yes --no-wait
```
