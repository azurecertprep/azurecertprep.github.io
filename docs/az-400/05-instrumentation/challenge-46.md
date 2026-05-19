---
sidebar_position: 1
title: "Challenge 46: Azure Monitor integration with DevOps"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 46: Azure Monitor integration with DevOps

## Exam skills covered

- Configure Azure Monitor and Azure Monitor Logs to integrate with DevOps tools

## Scenario

Contoso Ltd deploys their flagship web application five times daily. Despite this velocity, the operations team has no correlation between deployments and performance regressions. Last week, a deployment introduced a memory leak that went undetected for 8 hours because no one connected the rising error rate to the 2:15 PM deployment. You must connect Azure Monitor to the CI/CD pipeline so that deployment impact is immediately visible and automated rollback can trigger when health degrades.

## Prerequisites

- Azure subscription with Contributor access
- Azure App Service or similar with Application Insights enabled
- Azure DevOps project or GitHub repository with a deployment pipeline
- Azure CLI installed
- Log Analytics workspace

## Tasks

### Task 1: Create deployment annotations in Application Insights

Deployment annotations mark specific points in time on Application Insights charts, making it easy to correlate changes in metrics with deployments.

For Azure Pipelines:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  appInsightsResourceId: '/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/components/ai-contoso-webapp'

steps:
  - script: |
      echo "Building and deploying application..."
    displayName: 'Build and Deploy'

  - task: AzureCLI@2
    displayName: 'Create deployment annotation'
    inputs:
      azureSubscription: 'Azure-Prod'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        # Create an annotation using the Application Insights REST API
        ANNOTATION_PROPERTIES=$(cat <<EOF
        {
          "Id": "$(Build.BuildId)",
          "AnnotationName": "Release $(Build.BuildNumber)",
          "EventTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
          "Category": "Deployment",
          "Properties": "{\"BuildNumber\":\"$(Build.BuildNumber)\",\"Branch\":\"$(Build.SourceBranchName)\",\"CommitId\":\"$(Build.SourceVersion)\",\"ReleaseName\":\"$(Build.BuildNumber)\"}"
        }
        EOF
        )

        az rest --method put \
          --url "https://management.azure.com$(appInsightsResourceId)/Annotations?api-version=2015-05-01" \
          --body "$ANNOTATION_PROPERTIES"
```

### Task 2: Configure Azure Monitor alerts that trigger pipeline actions

Create alerts that trigger when deployment causes degradation:

```bash
# Create a Log Analytics workspace (if not existing)
az monitor log-analytics workspace create \
  --name law-contoso-prod \
  --resource-group rg-contoso-prod \
  --location eastus

# Create an action group that triggers a webhook (for pipeline automation)
az monitor action-group create \
  --name ag-deployment-rollback \
  --resource-group rg-contoso-prod \
  --short-name Rollback \
  --action webhook rollback-webhook "https://dev.azure.com/contoso/ContosoWeb/_apis/pipelines/15/runs?api-version=7.1-preview.1" \
  --action email ops-team ops-team@contoso.com

# Create a metric alert for high error rate
az monitor metrics alert create \
  --name "alert-high-error-rate" \
  --resource-group rg-contoso-prod \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/Microsoft.Web/sites/app-contoso-web" \
  --condition "total Http5xx > 50" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action ag-deployment-rollback \
  --description "High 5xx error rate - possible bad deployment" \
  --severity 1

# Create a log-based alert using KQL
az monitor scheduled-query create \
  --name "alert-exception-spike" \
  --resource-group rg-contoso-prod \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/components/ai-contoso-webapp" \
  --condition "count > 100" \
  --condition-query "exceptions | where timestamp > ago(5m) | summarize count()" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --action-groups "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/actionGroups/ag-deployment-rollback" \
  --severity 1
```

### Task 3: Implement deployment gates using Azure Monitor queries

Configure release gates that query Azure Monitor before proceeding:

```yaml
# azure-pipelines.yml with deployment gates
stages:
  - stage: Deploy
    jobs:
      - deployment: DeployApp
        pool:
          vmImage: 'ubuntu-latest'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: 'Azure-Prod'
                    appName: 'app-contoso-web'

  - stage: Validate
    dependsOn: Deploy
    jobs:
      - job: HealthCheck
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: AzureCLI@2
            displayName: 'Query Azure Monitor for health'
            inputs:
              azureSubscription: 'Azure-Prod'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                # Wait for telemetry to flow
                sleep 120

                # Query for error rate in the last 5 minutes
                ERROR_COUNT=$(az monitor app-insights query \
                  --app ai-contoso-webapp \
                  --resource-group rg-contoso-prod \
                  --analytics-query "requests | where timestamp > ago(5m) | where success == false | count" \
                  --query "tables[0].rows[0][0]" -o tsv)

                echo "Errors in last 5 minutes: $ERROR_COUNT"

                if [ "$ERROR_COUNT" -gt 50 ]; then
                  echo "##vso[task.logissue type=error]Error rate exceeds threshold. Triggering rollback."
                  exit 1
                fi
                echo "Health check passed."
```

For gate-based validation (Azure DevOps release pipelines):

1. Navigate to: Release pipeline > Stage > Pre-deployment conditions > Gates
2. Add gate: "Query Azure Monitor alerts"
   - Resource group: rg-contoso-prod
   - Alert rules: alert-high-error-rate, alert-exception-spike
   - Filter: Fired
3. Gate evaluation options:
   - Time between evaluations: 5 minutes
   - Timeout after: 30 minutes
   - Minimum duration: 10 minutes

### Task 4: Create release annotations via GitHub Actions

```yaml
# .github/workflows/deploy-with-annotations.yml
name: Deploy with monitoring annotations
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy application
        run: |
          az webapp deploy \
            --name app-contoso-web \
            --resource-group rg-contoso-prod \
            --src-path ./dist/app.zip \
            --type zip

      - name: Create deployment annotation
        run: |
          ANNOTATION_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
          APP_INSIGHTS_ID="/subscriptions/${{ secrets.AZURE_SUBSCRIPTION_ID }}/resourceGroups/rg-contoso-prod/providers/microsoft.insights/components/ai-contoso-webapp"

          az rest --method put \
            --url "https://management.azure.com${APP_INSIGHTS_ID}/Annotations?api-version=2015-05-01" \
            --body "{
              \"Id\": \"${{ github.run_id }}\",
              \"AnnotationName\": \"GitHub Deploy #${{ github.run_number }}\",
              \"EventTime\": \"${ANNOTATION_TIME}\",
              \"Category\": \"Deployment\",
              \"Properties\": \"{\\\"Commit\\\":\\\"${{ github.sha }}\\\",\\\"Branch\\\":\\\"${{ github.ref_name }}\\\",\\\"Author\\\":\\\"${{ github.actor }}\\\",\\\"WorkflowRun\\\":\\\"${{ github.run_id }}\\\"}\"
            }"

      - name: Post-deployment health check
        run: |
          echo "Waiting 2 minutes for telemetry..."
          sleep 120

          ERROR_COUNT=$(az monitor app-insights query \
            --app ai-contoso-webapp \
            --resource-group rg-contoso-prod \
            --analytics-query "requests | where timestamp > ago(5m) | where success == false | count" \
            --query "tables[0].rows[0][0]" -o tsv)

          echo "Post-deployment errors: $ERROR_COUNT"
          if [ "$ERROR_COUNT" -gt 50 ]; then
            echo "::error::Error rate spike detected after deployment"
            exit 1
          fi
```

### Task 5: Configure Azure Monitor action groups

```bash
# Create a comprehensive action group for deployment events
az monitor action-group create \
  --name ag-deployment-events \
  --resource-group rg-contoso-prod \
  --short-name DeployEvt \
  --action email ops-lead "ops-lead@contoso.com" \
  --action email sre-team "sre-team@contoso.com" \
  --action webhook teams-webhook "https://contoso.webhook.office.com/webhookb2/..." \
  --action webhook slack-webhook "https://hooks.slack.com/services/T00/B00/xxx" \
  --action azurefunction rollback-func "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/Microsoft.Web/sites/func-contoso-ops/functions/TriggerRollback" "https://func-contoso-ops.azurewebsites.net/api/TriggerRollback" "true"

# Test the action group
az monitor action-group test-notifications create \
  --resource-group rg-contoso-prod \
  --action-group ag-deployment-events \
  --alert-type "metric" \
  --notification-type "Email" \
  --recipients email-receiver="ops-lead"
```

### Task 6: Dashboard linking deployments to error rate changes

Create a workbook that correlates deployments with application health:

```bash
# Create a workbook via ARM template
az deployment group create \
  --resource-group rg-contoso-prod \
  --template-file deployment-impact-workbook.json
```

The workbook should contain these KQL queries:

```
// Query 1: Deployment annotations timeline
let deployments = customEvents
| where name == "Deployment"
| project timestamp, DeployVersion = tostring(customDimensions.BuildNumber);

// Query 2: Error rate over time with deployment markers
let errorRate = requests
| summarize
    totalRequests = count(),
    failedRequests = countif(success == false)
    by bin(timestamp, 5m)
| extend errorPercentage = (failedRequests * 100.0) / totalRequests;

// Query 3: Response time percentiles with deployment context
requests
| summarize
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99)
    by bin(timestamp, 5m)
| render timechart
```

### Task 7: Automated rollback based on Azure Monitor alert

```yaml
# .github/workflows/automated-rollback.yml
name: Automated rollback
on:
  repository_dispatch:
    types: [deployment-health-alert]

permissions:
  id-token: write
  contents: read

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Get previous deployment
        id: prev-deploy
        run: |
          PREV_DEPLOYMENT=$(az webapp deployment list-publishing-credentials \
            --name app-contoso-web \
            --resource-group rg-contoso-prod \
            --query publishingUserName -o tsv)

          # Get the previous successful deployment slot
          az webapp deployment slot swap \
            --name app-contoso-web \
            --resource-group rg-contoso-prod \
            --slot staging \
            --target-slot production

          echo "Rollback initiated - swapped production with staging (previous good version)"

      - name: Verify rollback health
        run: |
          sleep 60
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://app-contoso-web.azurewebsites.net/health)
          if [ "$HTTP_STATUS" -eq 200 ]; then
            echo "Rollback successful - application healthy"
          else
            echo "::error::Rollback may have failed - health check returned $HTTP_STATUS"
            exit 1
          fi

      - name: Notify team
        run: |
          curl -X POST "${{ secrets.TEAMS_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            --data '{
              "text": "Automated rollback completed for app-contoso-web. Triggered by health alert. Please investigate the failed deployment."
            }'
```

## Break and fix

### Break scenario 1: Deployment annotations not appearing on charts

After configuring annotations, they do not appear on Application Insights metrics charts.

**Cause:** The annotation API call uses the wrong resource ID, or the timestamp format is incorrect, or the user lacks write permissions to Application Insights.

**Diagnosis:**

```bash
# Verify the Application Insights resource ID
az monitor app-insights component show \
  --app ai-contoso-webapp \
  --resource-group rg-contoso-prod \
  --query id -o tsv

# Check existing annotations
az rest --method get \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/components/ai-contoso-webapp/Annotations?api-version=2015-05-01"
```

**Fix:** Ensure the timestamp is in UTC ISO 8601 format and the service principal has Contributor access to the Application Insights resource.

### Break scenario 2: Azure Monitor alert fires but rollback pipeline does not trigger

**Cause:** The webhook action in the action group is misconfigured or the target pipeline requires authentication.

**Diagnosis:**

```bash
# Check action group webhook status
az monitor action-group show \
  --name ag-deployment-rollback \
  --resource-group rg-contoso-prod \
  --query "webhookReceivers[].{name:name, uri:serviceUri}"
```

**Fix:** For Azure DevOps pipelines, use a service hook or Azure Function intermediary that authenticates with a PAT. For GitHub Actions, use the `repository_dispatch` event with a webhook-to-dispatch proxy:

```bash
# Use Azure Function as intermediary
# Function receives the webhook, authenticates to GitHub, triggers dispatch
curl -X POST https://api.github.com/repos/contoso/webapp/dispatches \
  -H "Authorization: token $GITHUB_TOKEN" \
  -d '{"event_type":"deployment-health-alert","client_payload":{"alert":"high-error-rate"}}'
```

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Contoso deploys 5 times daily and wants to immediately see the impact of each deployment on Application Insights performance charts. What should they configure?",
    options: [
      "Enable continuous profiling in Application Insights",
      "Create deployment annotations via the Application Insights REST API after each deployment",
      "Configure Application Insights to auto-detect deployments",
      "Enable smart detection in Application Insights"
    ],
    correctIndex: 1,
    explanation: "Deployment annotations are vertical markers on Application Insights time-series charts that indicate when a deployment occurred. They must be explicitly created via the REST API or CLI during the pipeline deployment step. This allows visual correlation between deployments and metric changes."
  },
  {
    question: "A release pipeline should not proceed to the production stage if Azure Monitor shows active critical alerts. Which feature provides this gating capability?",
    options: [
      "Branch policies",
      "Environment approvals",
      "Deployment gates with \"Query Azure Monitor alerts\" gate type",
      "Pipeline triggers"
    ],
    correctIndex: 2,
    explanation: "Azure DevOps deployment gates can query Azure Monitor for active alerts and block pipeline progression until alerts are resolved. The \"Query Azure Monitor alerts\" gate type checks specified alert rules and only allows the stage to proceed when no matching alerts are in a \"Fired\" state."
  },
  {
    question: "After a deployment, Contoso wants to automatically roll back if the error rate exceeds 5% within 10 minutes. What is the best architecture?",
    options: [
      "A developer monitors the dashboard and manually triggers rollback",
      "An Azure Monitor alert triggers an action group webhook that invokes a rollback pipeline",
      "Application Insights smart detection with email notifications",
      "A scheduled pipeline that checks metrics every hour"
    ],
    correctIndex: 1,
    explanation: "An Azure Monitor alert with a metric condition (error rate > 5%) and a 10-minute evaluation window, connected to an action group that triggers a rollback pipeline via webhook, provides fully automated detection and response. Smart detection is useful but does not trigger automated actions, and scheduled checks are too slow."
  },
  {
    question: "An Azure Monitor action group includes a webhook to trigger an Azure DevOps pipeline for rollback. The webhook fires but the pipeline does not start. What is the most likely cause?",
    options: [
      "The pipeline is disabled",
      "The webhook URL requires authentication that the action group does not provide",
      "Azure Monitor webhooks are rate-limited",
      "The pipeline must be triggered manually"
    ],
    correctIndex: 1,
    explanation: "Azure DevOps pipeline REST API requires authentication (PAT or OAuth token). Azure Monitor action groups send webhook payloads without custom authentication headers. An intermediary (Azure Function or Logic App) is typically needed to receive the webhook and then authenticate to Azure DevOps to trigger the pipeline."
  }
]} />

## Cleanup

```bash
# Delete alerts
az monitor metrics alert delete --name "alert-high-error-rate" --resource-group rg-contoso-prod
az monitor scheduled-query delete --name "alert-exception-spike" --resource-group rg-contoso-prod

# Delete action groups
az monitor action-group delete --name ag-deployment-rollback --resource-group rg-contoso-prod
az monitor action-group delete --name ag-deployment-events --resource-group rg-contoso-prod

# Remove workflow files
rm -f .github/workflows/deploy-with-annotations.yml
rm -f .github/workflows/automated-rollback.yml
git add -A && git commit -m "cleanup: remove challenge 46 monitoring integration" && git push
```
