---
sidebar_position: 1
title: "Desafio 46: Integração do Azure Monitor com DevOps"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 46: Integração do Azure Monitor com DevOps

## Habilidades do exame abordadas

- Configurar Azure Monitor e Azure Monitor Logs para integração com ferramentas DevOps

## Cenário

A Contoso Ltd faz deploy de sua aplicação web principal cinco vezes por dia. Apesar dessa velocidade, a equipe de operações não tem correlação entre deploys e regressões de desempenho. Na semana passada, um deploy introduziu um vazamento de memória que passou despercebido por 8 horas porque ninguém conectou a taxa crescente de erros ao deploy das 14h15. Você deve conectar o Azure Monitor ao pipeline de CI/CD para que o impacto dos deploys seja imediatamente visível e o rollback automatizado possa ser acionado quando a saúde do sistema degradar.

## Pré-requisitos

- Assinatura Azure com acesso de Contributor
- Azure App Service ou similar com Application Insights habilitado
- Projeto Azure DevOps ou repositório GitHub com um pipeline de deploy
- Azure CLI instalado
- Workspace do Log Analytics

## Tarefas

### Tarefa 1: Criar anotações de deploy no Application Insights

As anotações de deploy marcam pontos específicos no tempo nos gráficos do Application Insights, facilitando a correlação de mudanças em métricas com deploys.

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

### Tarefa 2: Configurar alertas do Azure Monitor que acionam ações no pipeline

Crie alertas que disparam quando um deploy causa degradação:

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

Para validação baseada em gates (pipelines de release do Azure DevOps):

1. Navegue até: Release pipeline > Stage > Pre-deployment conditions > Gates
2. Adicione o gate: "Query Azure Monitor alerts"
   - Resource group: rg-contoso-prod
   - Alert rules: alert-high-error-rate, alert-exception-spike
   - Filtro: Fired
3. Opções de avaliação do gate:
   - Tempo entre avaliações: 5 minutos
   - Tempo limite: 30 minutos
   - Duração mínima: 10 minutos

### Tarefa 4: Criar anotações de release via GitHub Actions

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

### Tarefa 5: Configurar grupos de ação do Azure Monitor

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

### Tarefa 6: Painel vinculando deploys a mudanças na taxa de erros

Crie um workbook que correlaciona deploys com a saúde da aplicação:

```bash
# Create a workbook via ARM template
az deployment group create \
  --resource-group rg-contoso-prod \
  --template-file deployment-impact-workbook.json
```

O workbook deve conter estas consultas KQL:

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

## Exercícios de quebra e conserto

### Cenário de quebra 1: Anotações de deploy não aparecem nos gráficos

Após configurar as anotações, elas não aparecem nos gráficos de métricas do Application Insights.

**Causa:** A chamada à API de anotações usa o ID de recurso errado, ou o formato do timestamp está incorreto, ou o usuário não tem permissões de escrita no Application Insights.

**Diagnóstico:**

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
<summary>Mostrar solução</summary>

**Correção:** Garanta que o timestamp está no formato UTC ISO 8601 e que o service principal tem acesso de Contributor ao recurso Application Insights.

</details>

### Cenário de quebra 2: Alerta do Azure Monitor dispara mas o pipeline de rollback não é acionado

**Causa:** A ação de webhook no grupo de ação está configurada incorretamente ou o pipeline de destino requer autenticação.

**Diagnóstico:**

```bash
# Check action group webhook status
az monitor action-group show \
  --name ag-deployment-rollback \
  --resource-group rg-contoso-prod \
  --query "webhookReceivers[].{name:name, uri:serviceUri}"
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Para pipelines do Azure DevOps, use um service hook ou Azure Function intermediário que se autentica com um PAT. Para GitHub Actions, use o evento `repository_dispatch` com um proxy de webhook-para-dispatch:

```bash
# Use Azure Function as intermediary
# Function receives the webhook, authenticates to GitHub, triggers dispatch
curl -X POST https://api.github.com/repos/contoso/webapp/dispatches \
  -H "Authorization: token $GITHUB_TOKEN" \
  -d '{"event_type":"deployment-health-alert","client_payload":{"alert":"high-error-rate"}}'
```

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso faz deploy 5 vezes por dia e quer ver imediatamente o impacto de cada deploy nos gráficos de desempenho do Application Insights. O que eles devem configurar?",
    options: [
      "Habilitar profiling contínuo no Application Insights",
      "Criar anotações de deploy via a API REST do Application Insights após cada deploy",
      "Configurar o Application Insights para detectar deploys automaticamente",
      "Habilitar detecção inteligente no Application Insights"
    ],
    correctIndex: 1,
    explanation: "As anotações de deploy são marcadores verticais nos gráficos de séries temporais do Application Insights que indicam quando um deploy ocorreu. Elas devem ser criadas explicitamente via a API REST ou CLI durante a etapa de deploy do pipeline. Isso permite a correlação visual entre deploys e mudanças nas métricas."
  },
  {
    question: "Um pipeline de release não deve prosseguir para o estágio de produção se o Azure Monitor mostrar alertas críticos ativos. Qual recurso fornece essa capacidade de controle?",
    options: [
      "Políticas de branch",
      "Aprovações de ambiente",
      "Gates de deploy com tipo de gate \"Query Azure Monitor alerts\"",
      "Triggers de pipeline"
    ],
    correctIndex: 2,
    explanation: "Os gates de deploy do Azure DevOps podem consultar o Azure Monitor para alertas ativos e bloquear a progressão do pipeline até que os alertas sejam resolvidos. O tipo de gate \"Query Azure Monitor alerts\" verifica regras de alerta especificadas e só permite que o estágio prossiga quando nenhum alerta correspondente estiver no estado \"Fired\"."
  },
  {
    question: "Após um deploy, a Contoso quer fazer rollback automaticamente se a taxa de erros exceder 5% dentro de 10 minutos. Qual é a melhor arquitetura?",
    options: [
      "Um desenvolvedor monitora o painel e aciona o rollback manualmente",
      "Um alerta do Azure Monitor aciona um webhook de grupo de ação que invoca um pipeline de rollback",
      "Detecção inteligente do Application Insights com notificações por email",
      "Um pipeline agendado que verifica métricas a cada hora"
    ],
    correctIndex: 1,
    explanation: "Um alerta do Azure Monitor com uma condição de métrica (taxa de erros > 5%) e uma janela de avaliação de 10 minutos, conectado a um grupo de ação que aciona um pipeline de rollback via webhook, fornece detecção e resposta totalmente automatizadas. A detecção inteligente é útil, mas não aciona ações automatizadas, e verificações agendadas são muito lentas."
  },
  {
    question: "Um grupo de ação do Azure Monitor inclui um webhook para acionar um pipeline do Azure DevOps para rollback. O webhook dispara, mas o pipeline não inicia. Qual é a causa mais provável?",
    options: [
      "O pipeline está desabilitado",
      "A URL do webhook requer autenticação que o grupo de ação não fornece",
      "Webhooks do Azure Monitor têm limite de taxa",
      "O pipeline deve ser acionado manualmente"
    ],
    correctIndex: 1,
    explanation: "A API REST de pipelines do Azure DevOps requer autenticação (PAT ou token OAuth). Grupos de ação do Azure Monitor enviam payloads de webhook sem cabeçalhos de autenticação personalizados. Um intermediário (Azure Function ou Logic App) é tipicamente necessário para receber o webhook e então se autenticar no Azure DevOps para acionar o pipeline."
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
