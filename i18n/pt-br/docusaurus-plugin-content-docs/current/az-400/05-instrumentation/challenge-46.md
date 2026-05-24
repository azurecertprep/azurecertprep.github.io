---
sidebar_position: 1
title: "Desafio 46: IntegraÃ§Ã£o do Azure Monitor com DevOps"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 46: IntegraÃ§Ã£o do Azure Monitor com DevOps

## Habilidades do exame abordadas

- Configurar Azure Monitor e Azure Monitor Logs para integraÃ§Ã£o com ferramentas DevOps

## CenÃ¡rio

A Contoso Ltd faz deploy de sua aplicaÃ§Ã£o web principal cinco vezes por dia. Apesar dessa velocidade, a equipe de operaÃ§Ãµes nÃ£o tem correlaÃ§Ã£o entre deploys e regressÃµes de desempenho. Na semana passada, um deploy introduziu um vazamento de memÃ³ria que passou despercebido por 8 horas porque ninguÃ©m conectou a taxa crescente de erros ao deploy das 14h15. VocÃª deve conectar o Azure Monitor ao pipeline de CI/CD para que o impacto dos deploys seja imediatamente visÃ­vel e o rollback automatizado possa ser acionado quando a saÃºde do sistema degradar.

## PrÃ©-requisitos

- Assinatura Azure com acesso de Contributor
- Azure App Service ou similar com Application Insights habilitado
- Projeto Azure DevOps ou repositÃ³rio GitHub com um pipeline de deploy
- Azure CLI instalado
- Workspace do Log Analytics

## Tarefas

### Tarefa 1: Criar anotaÃ§Ãµes de deploy no Application Insights

As anotaÃ§Ãµes de deploy marcam pontos especÃ­ficos no tempo nos grÃ¡ficos do Application Insights, facilitando a correlaÃ§Ã£o de mudanÃ§as em mÃ©tricas com deploys.

Para Azure Pipelines:

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

### Tarefa 2: Configurar alertas do Azure Monitor que acionam aÃ§Ãµes no pipeline

Crie alertas que disparam quando um deploy causa degradaÃ§Ã£o:

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
  --condition "count 'ExceptionSpike' > 100" \
  --condition-query ExceptionSpike="exceptions | where timestamp > ago(5m) | summarize count()" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --action-groups "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/actionGroups/ag-deployment-rollback" \
  --severity 1
```

### Tarefa 3: Implementar gates de deploy usando consultas do Azure Monitor

Configure gates de release que consultam o Azure Monitor antes de prosseguir:

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

Para validaÃ§Ã£o baseada em gates (pipelines de release do Azure DevOps):

1. Navegue atÃ©: Release pipeline > Stage > Pre-deployment conditions > Gates
2. Adicione o gate: "Query Azure Monitor alerts"
   - Resource group: rg-contoso-prod
   - Alert rules: alert-high-error-rate, alert-exception-spike
   - Filtro: Fired
3. OpÃ§Ãµes de avaliaÃ§Ã£o do gate:
   - Tempo entre avaliaÃ§Ãµes: 5 minutos
   - Tempo limite: 30 minutos
   - DuraÃ§Ã£o mÃ­nima: 10 minutos

### Tarefa 4: Criar anotaÃ§Ãµes de release via GitHub Actions

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

### Tarefa 5: Configurar grupos de aÃ§Ã£o do Azure Monitor

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

### Tarefa 6: Painel vinculando deploys a mudanÃ§as na taxa de erros

Crie um workbook que correlaciona deploys com a saÃºde da aplicaÃ§Ã£o:

```bash
# Create a workbook via ARM template
az deployment group create \
  --resource-group rg-contoso-prod \
  --template-file deployment-impact-workbook.json
```

O workbook deve conter estas consultas KQL:

```text
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

### Tarefa 7: Rollback automatizado baseado em alerta do Azure Monitor

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

## ExercÃ­cios de quebra e conserto

### CenÃ¡rio de quebra 1: AnotaÃ§Ãµes de deploy nÃ£o aparecem nos grÃ¡ficos

ApÃ³s configurar as anotaÃ§Ãµes, elas nÃ£o aparecem nos grÃ¡ficos de mÃ©tricas do Application Insights.

**Causa:** A chamada Ã  API de anotaÃ§Ãµes usa o ID de recurso errado, ou o formato do timestamp estÃ¡ incorreto, ou o usuÃ¡rio nÃ£o tem permissÃµes de escrita no Application Insights.

**DiagnÃ³stico:**

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


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:** Garanta que o timestamp estÃ¡ no formato UTC ISO 8601 e que o service principal tem acesso de Contributor ao recurso Application Insights.

</details>

### CenÃ¡rio de quebra 2: Alerta do Azure Monitor dispara mas o pipeline de rollback nÃ£o Ã© acionado

**Causa:** A aÃ§Ã£o de webhook no grupo de aÃ§Ã£o estÃ¡ configurada incorretamente ou o pipeline de destino requer autenticaÃ§Ã£o.

**DiagnÃ³stico:**

```bash
# Check action group webhook status
az monitor action-group show \
  --name ag-deployment-rollback \
  --resource-group rg-contoso-prod \
  --query "webhookReceivers[].{name:name, uri:serviceUri}"
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:** Para pipelines do Azure DevOps, use um service hook ou Azure Function intermediÃ¡rio que se autentica com um PAT. Para GitHub Actions, use o evento `repository_dispatch` com um proxy de webhook-para-dispatch:

```bash
# Use Azure Function as intermediary
# Function receives the webhook, authenticates to GitHub, triggers dispatch
curl -X POST https://api.github.com/repos/contoso/webapp/dispatches \
  -H "Authorization: token $GITHUB_TOKEN" \
  -d '{"event_type":"deployment-health-alert","client_payload":{"alert":"high-error-rate"}}'
```

</details>
## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso faz deploy 5 vezes por dia e quer ver imediatamente o impacto de cada deploy nos grÃ¡ficos de desempenho do Application Insights. O que eles devem configurar?",
    options: [
      "Habilitar profiling contÃ­nuo no Application Insights",
      "Criar anotaÃ§Ãµes de deploy via a API REST do Application Insights apÃ³s cada deploy",
      "Configurar o Application Insights para detectar deploys automaticamente",
      "Habilitar detecÃ§Ã£o inteligente no Application Insights"
    ],
    correctIndex: 1,
    explanation: "As anotaÃ§Ãµes de deploy sÃ£o marcadores verticais nos grÃ¡ficos de sÃ©ries temporais do Application Insights que indicam quando um deploy ocorreu. Elas devem ser criadas explicitamente via a API REST ou CLI durante a etapa de deploy do pipeline. Isso permite a correlaÃ§Ã£o visual entre deploys e mudanÃ§as nas mÃ©tricas."
  },
  {
    question: "Um pipeline de release nÃ£o deve prosseguir para o estÃ¡gio de produÃ§Ã£o se o Azure Monitor mostrar alertas crÃ­ticos ativos. Qual recurso fornece essa capacidade de controle?",
    options: [
      "PolÃ­ticas de branch",
      "AprovaÃ§Ãµes de ambiente",
      "Gates de deploy com tipo de gate \"Query Azure Monitor alerts\"",
      "Triggers de pipeline"
    ],
    correctIndex: 2,
    explanation: "Os gates de deploy do Azure DevOps podem consultar o Azure Monitor para alertas ativos e bloquear a progressÃ£o do pipeline atÃ© que os alertas sejam resolvidos. O tipo de gate \"Query Azure Monitor alerts\" verifica regras de alerta especificadas e sÃ³ permite que o estÃ¡gio prossiga quando nenhum alerta correspondente estiver no estado \"Fired\"."
  },
  {
    question: "ApÃ³s um deploy, a Contoso quer fazer rollback automaticamente se a taxa de erros exceder 5% dentro de 10 minutos. Qual Ã© a melhor arquitetura?",
    options: [
      "Um desenvolvedor monitora o painel e aciona o rollback manualmente",
      "Um alerta do Azure Monitor aciona um webhook de grupo de aÃ§Ã£o que invoca um pipeline de rollback",
      "DetecÃ§Ã£o inteligente do Application Insights com notificaÃ§Ãµes por email",
      "Um pipeline agendado que verifica mÃ©tricas a cada hora"
    ],
    correctIndex: 1,
    explanation: "Um alerta do Azure Monitor com uma condiÃ§Ã£o de mÃ©trica (taxa de erros > 5%) e uma janela de avaliaÃ§Ã£o de 10 minutos, conectado a um grupo de aÃ§Ã£o que aciona um pipeline de rollback via webhook, fornece detecÃ§Ã£o e resposta totalmente automatizadas. A detecÃ§Ã£o inteligente Ã© Ãºtil, mas nÃ£o aciona aÃ§Ãµes automatizadas, e verificaÃ§Ãµes agendadas sÃ£o muito lentas."
  },
  {
    question: "Um grupo de aÃ§Ã£o do Azure Monitor inclui um webhook para acionar um pipeline do Azure DevOps para rollback. O webhook dispara, mas o pipeline nÃ£o inicia. Qual Ã© a causa mais provÃ¡vel?",
    options: [
      "O pipeline estÃ¡ desabilitado",
      "A URL do webhook requer autenticaÃ§Ã£o que o grupo de aÃ§Ã£o nÃ£o fornece",
      "Webhooks do Azure Monitor tÃªm limite de taxa",
      "O pipeline deve ser acionado manualmente"
    ],
    correctIndex: 1,
    explanation: "A API REST de pipelines do Azure DevOps requer autenticaÃ§Ã£o (PAT ou token OAuth). Grupos de aÃ§Ã£o do Azure Monitor enviam payloads de webhook sem cabeÃ§alhos de autenticaÃ§Ã£o personalizados. Um intermediÃ¡rio (Azure Function ou Logic App) Ã© tipicamente necessÃ¡rio para receber o webhook e entÃ£o se autenticar no Azure DevOps para acionar o pipeline."
  }
]} />

## Limpeza

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
