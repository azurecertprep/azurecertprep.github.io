---
sidebar_position: 1
title: "Challenge 25: Blue-green and canary deployments"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 25: Blue-green and canary deployments

## Exam skills mapped

- Design a deployment strategy, including blue-green, canary, ring, progressive exposure, feature flags, and A/B testing

## Scenario

Contoso Ltd operates a payment processing service that handles over 50,000 transactions per minute during peak hours. The service has a contractual SLA of 99.95% uptime. Engineering leadership has calculated that any deployment-related downtime costs approximately $10,000 per minute in lost revenue, SLA penalties, and customer trust erosion. The current deployment process involves a maintenance window every Thursday night, which violates the "always available" mandate from the CTO.

You are tasked with designing and implementing zero-downtime deployment strategies that allow Contoso to ship multiple times per day without impacting transaction processing.

**Environment details:**
- Azure App Service (Premium v3, P1v3) running the payment API
- Azure Traffic Manager for DNS-based routing
- Application Insights for monitoring
- Resource group: `rg-contoso-payments-prod`
- Region: East US 2

---

## Task 1: Implement blue-green deployment with Azure App Service deployment slots

Create an App Service with a staging deployment slot to enable blue-green deployments.

### Provision the infrastructure

```bash
# Set variables
RESOURCE_GROUP="rg-contoso-payments-prod"
LOCATION="eastus2"
APP_NAME="app-contoso-payments-api"
APP_SERVICE_PLAN="asp-contoso-payments"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service Plan (Standard tier or higher required for slots)
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --sku P1V3 \
  --is-linux

# Create the web app (production slot)
az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --runtime "DOTNET|8.0"

# Create the staging deployment slot
az webapp deployment slot create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging

# Configure slot-specific app settings (these stay with the slot, not the app)
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --slot-settings ENVIRONMENT=staging ASPNETCORE_ENVIRONMENT=Staging
```

### Perform a slot swap (blue-green flip)

```bash
# Swap staging to production (performs warm-up automatically)
az webapp deployment slot swap \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --target-slot production

# If something goes wrong, swap back immediately
az webapp deployment slot swap \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --target-slot production
```

---

## Task 2: GitHub Actions workflow for slot swap deployment

Create a GitHub Actions workflow that deploys to staging, validates health, then swaps to production.

### Create the workflow file

Create `.github/workflows/deploy-blue-green.yml`:

```yaml
name: Blue-Green Deployment

on:
  push:
    branches: [main]
    paths:
      - 'src/PaymentApi/**'

env:
  AZURE_WEBAPP_NAME: app-contoso-payments-api
  RESOURCE_GROUP: rg-contoso-payments-prod
  DOTNET_VERSION: '8.0.x'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Build and publish
        run: |
          dotnet restore src/PaymentApi/PaymentApi.csproj
          dotnet publish src/PaymentApi/PaymentApi.csproj \
            --configuration Release \
            --output ./publish

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: payment-api
          path: ./publish

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    environment: staging
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: payment-api
          path: ./publish

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to staging slot
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          slot-name: staging
          package: ./publish

      - name: Wait for staging to warm up
        run: sleep 30

      - name: Validate staging health
        run: |
          STAGING_URL="https://${{ env.AZURE_WEBAPP_NAME }}-staging.azurewebsites.net"
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/health")
          if [ "$HTTP_STATUS" != "200" ]; then
            echo "Health check failed with status $HTTP_STATUS"
            exit 1
          fi
          echo "Staging health check passed"

  swap-to-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Swap staging to production
        run: |
          az webapp deployment slot swap \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --slot staging \
            --target-slot production

      - name: Validate production health
        run: |
          PROD_URL="https://${{ env.AZURE_WEBAPP_NAME }}.azurewebsites.net"
          for i in {1..5}; do
            HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/health")
            if [ "$HTTP_STATUS" == "200" ]; then
              echo "Production health check passed (attempt $i)"
              exit 0
            fi
            echo "Attempt $i failed with status $HTTP_STATUS, retrying..."
            sleep 10
          done
          echo "Production health check failed after 5 attempts"
          exit 1

      - name: Rollback on failure
        if: failure()
        run: |
          az webapp deployment slot swap \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --slot production \
            --target-slot staging
          echo "Rolled back to previous production version"
```

---

## Task 3: Implement canary deployment using Azure Traffic Manager

Configure Azure Traffic Manager to route 90% of traffic to the stable deployment and 10% to the canary.

### Create Traffic Manager profile with weighted routing

```bash
# Create Traffic Manager profile
az network traffic-manager profile create \
  --name tm-contoso-payments \
  --resource-group $RESOURCE_GROUP \
  --routing-method Weighted \
  --unique-dns-name contoso-payments \
  --ttl 30 \
  --protocol HTTPS \
  --port 443 \
  --path "/health"

# Add production endpoint (weight 90)
az network traffic-manager endpoint create \
  --name ep-production \
  --resource-group $RESOURCE_GROUP \
  --profile-name tm-contoso-payments \
  --type azureEndpoints \
  --target-resource-id "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME" \
  --weight 90 \
  --endpoint-status enabled

# Add canary endpoint (weight 10)
az network traffic-manager endpoint create \
  --name ep-canary \
  --resource-group $RESOURCE_GROUP \
  --profile-name tm-contoso-payments \
  --type azureEndpoints \
  --target-resource-id "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/${APP_NAME}-canary" \
  --weight 10 \
  --endpoint-status enabled
```

### Canary promotion workflow

Create `.github/workflows/canary-deployment.yml`:

```yaml
name: Canary Deployment

on:
  workflow_dispatch:
    inputs:
      canary_weight:
        description: 'Traffic percentage for canary (0-100)'
        required: true
        default: '10'
      promote:
        description: 'Promote canary to production'
        required: false
        type: boolean
        default: false

env:
  RESOURCE_GROUP: rg-contoso-payments-prod
  TM_PROFILE: tm-contoso-payments

jobs:
  adjust-traffic:
    runs-on: ubuntu-latest
    if: ${{ !inputs.promote }}
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Update canary traffic weight
        run: |
          CANARY_WEIGHT=${{ inputs.canary_weight }}
          PROD_WEIGHT=$((100 - CANARY_WEIGHT))

          az network traffic-manager endpoint update \
            --name ep-canary \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --profile-name ${{ env.TM_PROFILE }} \
            --type azureEndpoints \
            --weight $CANARY_WEIGHT

          az network traffic-manager endpoint update \
            --name ep-production \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --profile-name ${{ env.TM_PROFILE }} \
            --type azureEndpoints \
            --weight $PROD_WEIGHT

          echo "Traffic split: Production=$PROD_WEIGHT%, Canary=$CANARY_WEIGHT%"

  promote-canary:
    runs-on: ubuntu-latest
    if: ${{ inputs.promote }}
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Route all traffic to canary (now becomes production)
        run: |
          az network traffic-manager endpoint update \
            --name ep-canary \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --profile-name ${{ env.TM_PROFILE }} \
            --type azureEndpoints \
            --weight 100

          az network traffic-manager endpoint update \
            --name ep-production \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --profile-name ${{ env.TM_PROFILE }} \
            --type azureEndpoints \
            --weight 0

          echo "Canary promoted to production - 100% traffic"
```

---

## Task 4: Ring-based deployment (internal, beta, GA)

Implement progressive exposure with ring-based deployment using Azure App Service slots and Traffic Manager.

### Ring definitions

| Ring | Audience | Traffic | Duration | Criteria to advance |
|------|----------|---------|----------|---------------------|
| Ring 0 | Internal team | 0% external | 2 hours | No P1/P2 alerts |
| Ring 1 | Beta users | 5% | 24 hours | Error rate below 0.1% |
| Ring 2 | Early adopters | 25% | 48 hours | P95 latency under 200ms |
| Ring 3 | General availability | 100% | Permanent | All rings validated |

### Ring deployment script

```bash
#!/bin/bash
# ring-deploy.sh - Progressive ring-based deployment

set -euo pipefail

RESOURCE_GROUP="rg-contoso-payments-prod"
TM_PROFILE="tm-contoso-payments"
APP_NAME="app-contoso-payments-api"

promote_ring() {
  local ring=$1
  case $ring in
    0)
      echo "Ring 0: Deploying to internal slot..."
      az webapp deployment slot swap \
        --name $APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --slot internal \
        --target-slot staging
      echo "Ring 0 deployed. Internal team can validate at: https://${APP_NAME}-internal.azurewebsites.net"
      ;;
    1)
      echo "Ring 1: Enabling 5% canary traffic..."
      az network traffic-manager endpoint update \
        --name ep-canary \
        --resource-group $RESOURCE_GROUP \
        --profile-name $TM_PROFILE \
        --type azureEndpoints \
        --weight 5
      az network traffic-manager endpoint update \
        --name ep-production \
        --resource-group $RESOURCE_GROUP \
        --profile-name $TM_PROFILE \
        --type azureEndpoints \
        --weight 95
      ;;
    2)
      echo "Ring 2: Increasing to 25% traffic..."
      az network traffic-manager endpoint update \
        --name ep-canary \
        --resource-group $RESOURCE_GROUP \
        --profile-name $TM_PROFILE \
        --type azureEndpoints \
        --weight 25
      az network traffic-manager endpoint update \
        --name ep-production \
        --resource-group $RESOURCE_GROUP \
        --profile-name $TM_PROFILE \
        --type azureEndpoints \
        --weight 75
      ;;
    3)
      echo "Ring 3: Promoting to 100% (GA)..."
      az webapp deployment slot swap \
        --name $APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --slot staging \
        --target-slot production
      az network traffic-manager endpoint update \
        --name ep-production \
        --resource-group $RESOURCE_GROUP \
        --profile-name $TM_PROFILE \
        --type azureEndpoints \
        --weight 100
      az network traffic-manager endpoint update \
        --name ep-canary \
        --resource-group $RESOURCE_GROUP \
        --profile-name $TM_PROFILE \
        --type azureEndpoints \
        --weight 0
      ;;
  esac
}

promote_ring "$1"
```

---

## Task 5: Automated rollback on health check failure

Configure Application Insights alerts that trigger an automated rollback.

### Application Insights alert rule

```bash
# Create action group for rollback automation
az monitor action-group create \
  --name ag-deployment-rollback \
  --resource-group $RESOURCE_GROUP \
  --short-name rollback \
  --action webhook rollback-webhook "https://prod.contoso.com/api/deployment/rollback"

# Create metric alert for error rate spike
az monitor metrics alert create \
  --name alert-deployment-error-rate \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME" \
  --condition "avg Http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action ag-deployment-rollback \
  --description "Triggers automatic rollback when 5xx errors exceed threshold"
```

### GitHub Actions post-deployment monitoring with auto-rollback

```yaml
  post-deployment-monitor:
    runs-on: ubuntu-latest
    needs: swap-to-production
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Monitor for 5 minutes post-deployment
        run: |
          APP_NAME="app-contoso-payments-api"
          RESOURCE_GROUP="rg-contoso-payments-prod"
          PROD_URL="https://${APP_NAME}.azurewebsites.net/health"
          MONITOR_DURATION=300
          CHECK_INTERVAL=30
          ELAPSED=0

          while [ $ELAPSED -lt $MONITOR_DURATION ]; do
            HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")
            if [ "$HTTP_STATUS" != "200" ]; then
              echo "Health check failed at ${ELAPSED}s with status $HTTP_STATUS. Rolling back..."
              az webapp deployment slot swap \
                --name $APP_NAME \
                --resource-group $RESOURCE_GROUP \
                --slot production \
                --target-slot staging
              echo "Rollback complete"
              exit 1
            fi
            echo "Health OK at ${ELAPSED}s (status: $HTTP_STATUS)"
            sleep $CHECK_INTERVAL
            ELAPSED=$((ELAPSED + CHECK_INTERVAL))
          done
          echo "Post-deployment monitoring passed (${MONITOR_DURATION}s)"
```

---

## Task 6: Deployment strategy decision table

| Strategy | Downtime | Rollback speed | Infrastructure cost | Complexity | Best for |
|----------|----------|----------------|---------------------|------------|----------|
| Blue-green | Zero | Instant (swap back) | 2x (duplicate env) | Low | Mission-critical services with strict SLA |
| Canary | Zero | Fast (route traffic away) | 1.1x (small canary) | Medium | Validating changes with real user traffic |
| Rolling | Near-zero | Moderate (roll forward/back) | 1x (in-place) | Medium | Stateless services with multiple instances |
| Ring-based | Zero | Fast (stop promotion) | 1.2x-1.5x | High | Large-scale services with diverse user base |
| Feature flags | Zero | Instant (toggle flag) | 1x | Medium | Decoupling deploy from release |

### When to use each strategy

- **Blue-green**: When you need instant rollback and can afford duplicate infrastructure. Ideal for Contoso's payment service where any failure must be reversed in seconds.
- **Canary**: When you want to validate with real traffic before full rollout. Use when you have good observability and can detect issues quickly.
- **Rolling**: When running multiple identical instances and want minimal extra infrastructure cost. Common for stateless web frontends.
- **Ring-based**: When you have distinct user populations (internal, beta, GA) and want progressive confidence building.
- **Feature flags**: When you want to deploy code without activating features. Ideal for long-running feature development.

---

## Break and fix exercises

### Exercise 1: Slot swap fails due to sticky settings

**Symptom:** After slot swap, the production app connects to the staging database.

**Investigate:**
```bash
# Check which settings are slot-specific
az webapp config appsettings list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[?slotSetting==``true``].{name:name, slotSetting:slotSetting}"
```


<details>
<summary>Show solution</summary>

**Root cause:** Connection strings were not marked as slot settings, so they swapped with the code.


**Fix:**
```bash
# Mark connection string as slot-specific (stays with the slot)
az webapp config connection-string set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --connection-string-type SQLAzure \
  --settings "DefaultConnection=Server=prod-sql.database.windows.net;Database=Payments;Authentication=Active Directory Managed Identity;"

# Set as slot setting on the staging slot
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --slot-settings "ConnectionStrings__DefaultConnection=Server=staging-sql.database.windows.net;Database=Payments;Authentication=Active Directory Managed Identity;"
```

</details>

### Exercise 2: Canary receiving more traffic than expected

**Symptom:** The canary endpoint configured for 10% traffic is receiving approximately 50% of requests.

**Investigate:**
```bash
# Check Traffic Manager endpoint weights
az network traffic-manager endpoint show \
  --name ep-canary \
  --resource-group $RESOURCE_GROUP \
  --profile-name $TM_PROFILE \
  --type azureEndpoints \
  --query "{weight:weight, status:endpointStatus}"

# Check DNS TTL
az network traffic-manager profile show \
  --name $TM_PROFILE \
  --resource-group $RESOURCE_GROUP \
  --query "{ttl:dnsConfig.ttl, routingMethod:trafficRoutingMethod}"
```


<details>
<summary>Show solution</summary>

**Root cause:** The DNS TTL was set to 300 seconds (5 minutes). Clients cache the DNS response, so weight changes take time to propagate. Additionally, Traffic Manager weighted routing is probabilistic at the DNS level, not per-request.


**Fix:**
```bash
# Reduce TTL for faster convergence
az network traffic-manager profile update \
  --name $TM_PROFILE \
  --resource-group $RESOURCE_GROUP \
  --ttl 30
```

</details>

### Exercise 3: Staging slot warm-up timeout

**Symptom:** After swap, the first requests to production take 30+ seconds, causing timeouts.


<details>
<summary>Show solution</summary>

**Root cause:** The application initialization (loading caches, warming JIT) was not completed before swap.


**Fix:** Configure application initialization settings:
```bash
# Set warm-up path
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --settings WEBSITE_SWAP_WARMUP_PING_PATH="/health" \
             WEBSITE_SWAP_WARMUP_PING_STATUSES="200"
```


</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Contoso wants to deploy a new version of their payment API with zero downtime. The deployment must allow instant rollback if issues are detected. Which approach requires the LEAST operational complexity while meeting these requirements?",
    options: [
      "Canary deployment with Azure Traffic Manager",
      "Blue-green deployment with Azure App Service deployment slots",
      "Rolling deployment across multiple VM instances",
      "Ring-based deployment with progressive exposure"
    ],
    correctIndex: 1,
    explanation: "Blue-green with deployment slots provides zero downtime and instant rollback (just swap back) with the least operational complexity. The swap operation is atomic and built into App Service. Canary and ring-based add traffic splitting complexity, and rolling updates require managing partially-deployed states."
  },
  {
    question: "A Traffic Manager profile uses weighted routing with production at weight 90 and canary at weight 10. The DNS TTL is set to 300 seconds. A developer notices the canary is receiving approximately 50% of traffic. What is the MOST LIKELY cause?",
    options: [
      "Traffic Manager does not support weighted routing with Azure App Service",
      "The canary endpoint has a higher priority than production",
      "DNS caching by clients causes uneven distribution, especially with low request volumes",
      "The production endpoint health probe is failing"
    ],
    correctIndex: 2,
    explanation: "Traffic Manager weighted routing operates at the DNS level. When clients cache DNS responses for the full TTL duration (300 seconds), a single client sends all requests to whichever endpoint was returned. With low request volumes, this creates uneven distribution. Reducing TTL and increasing request volume improves the statistical distribution."
  },
  {
    question: "During a blue-green deployment, the staging slot's connection string should NOT swap to production. Which configuration ensures this behavior?",
    options: [
      "Set the connection string value to be identical in both slots",
      "Mark the connection string as a slot setting (deployment slot setting)",
      "Store the connection string in Azure Key Vault",
      "Use a managed identity for database authentication"
    ],
    correctIndex: 1,
    explanation: "When a setting is marked as a \"slot setting\" (also called \"sticky\"), it remains with the slot rather than following the code during a swap. This ensures the staging connection string stays in staging and the production connection string stays in production, regardless of which code version is deployed to each slot."
  },
  {
    question: "Contoso implements ring-based deployment with Ring 0 (internal), Ring 1 (5% beta), Ring 2 (25% early adopters), and Ring 3 (GA). After deploying to Ring 1, the error rate increases to 2%. What should happen?",
    options: [
      "Immediately promote to Ring 2 to get more data points",
      "Roll back Ring 1 and investigate, blocking promotion to higher rings",
      "Increase Ring 1 to 15% to determine if the error is transient",
      "Skip to Ring 3 since 2% error rate is acceptable for beta users"
    ],
    correctIndex: 1,
    explanation: "The purpose of ring-based deployment is to catch issues at lower exposure levels before they impact more users. A 2% error rate at Ring 1 exceeds the advancement criteria (error rate below 0.1%) and indicates a problem that would affect more users at higher rings. The deployment should be rolled back, the issue investigated and fixed, then the ring process restarted."
  }
]} />

## Cleanup

```bash
# Remove all resources created in this challenge
az group delete --name rg-contoso-payments-prod --yes --no-wait

# If Traffic Manager is in a separate resource group
az network traffic-manager profile delete \
  --name tm-contoso-payments \
  --resource-group rg-contoso-payments-prod
```
