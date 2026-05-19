---
sidebar_position: 4
title: "Desafio 49: Consultas KQL para DevOps"
sidebar_label: "Desafio 49: Consultas KQL para DevOps"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 49: Consultas KQL para DevOps

## Habilidades do exame abordadas

- Interrogar logs usando consultas básicas de Kusto Query Language (KQL)

## Cenário

A equipe de SRE da Contoso Ltd precisa responder perguntas críticas após cada deployment: "O último deployment causou o pico de erros?" e "A regressão no tempo de resposta está correlacionada com o release das 15h?" Atualmente, eles navegam manualmente pelo Application Insights procurando anomalias sem consultas estruturadas. Você deve escrever consultas KQL que correlacionem deployments com métricas de saúde da aplicação e construir regras de alerta reutilizáveis e templates de workbook.

## Pré-requisitos

- Assinatura Azure com um recurso Application Insights que possui dados de telemetria
- Workspace do Log Analytics com dados recentes
- Azure CLI instalado
- Familiaridade básica com sintaxe de consulta semelhante a SQL

## Tarefas

### Tarefa 1: Fundamentos de KQL

KQL (Kusto Query Language) é uma linguagem somente leitura para consultar grandes conjuntos de dados no Azure Monitor, Log Analytics e Application Insights.

```kql
// where: Filter rows
requests
| where timestamp > ago(24h)
| where resultCode == "500"

// summarize: Aggregate data
requests
| where timestamp > ago(24h)
| summarize count() by resultCode
| order by count_ desc

// extend: Add calculated columns
requests
| where timestamp > ago(1h)
| extend responseTimeSec = duration / 1000.0
| extend isSlowRequest = duration > 2000

// project: Select specific columns
requests
| where timestamp > ago(1h)
| project timestamp, name, duration, resultCode, success
| order by duration desc
| take 10

// render: Visualize results
requests
| where timestamp > ago(24h)
| summarize avgDuration = avg(duration) by bin(timestamp, 1h)
| render timechart

// join: Combine tables
requests
| where timestamp > ago(1h)
| where success == false
| join kind=inner (
    exceptions
    | where timestamp > ago(1h)
    | project operation_Id, exceptionType = type, exceptionMessage = outerMessage
) on operation_Id
| project timestamp, name, resultCode, exceptionType, exceptionMessage

// let: Define variables
let timeRange = ago(24h);
let errorThreshold = 5.0;
requests
| where timestamp > timeRange
| summarize
    totalRequests = count(),
    failedRequests = countif(success == false)
    by bin(timestamp, 5m)
| extend errorRate = (failedRequests * 100.0) / totalRequests
| where errorRate > errorThreshold
```

### Tarefa 2: Consultar logs do Application Insights para exceções após deployment

```kql
// Find all exceptions in the last hour grouped by type
exceptions
| where timestamp > ago(1h)
| summarize count() by type, outerMessage
| order by count_ desc

// Exceptions with full stack trace for a specific error
exceptions
| where timestamp > ago(4h)
| where type == "System.NullReferenceException"
| project timestamp, type, outerMessage, innermostMessage, details[0].rawStack
| order by timestamp desc
| take 5

// Compare exception counts before and after deployment
// Assume deployment happened at a specific time
let deploymentTime = datetime(2024-11-15T14:15:00Z);
let windowSize = 30m;
let beforeDeployment = exceptions
    | where timestamp between ((deploymentTime - windowSize) .. deploymentTime)
    | summarize beforeCount = count() by type;
let afterDeployment = exceptions
    | where timestamp between (deploymentTime .. (deploymentTime + windowSize))
    | summarize afterCount = count() by type;
beforeDeployment
| join kind=fullouter afterDeployment on type
| extend type = coalesce(type, type1)
| extend changePercent = round(((afterCount - beforeCount) * 100.0) / max_of(beforeCount, 1), 1)
| project type, beforeCount, afterCount, changePercent
| order by changePercent desc

// New exceptions that did not exist before deployment
let deploymentTime = datetime(2024-11-15T14:15:00Z);
let newExceptions = exceptions
    | where timestamp > deploymentTime
    | distinct type;
let oldExceptions = exceptions
    | where timestamp between (ago(7d) .. deploymentTime)
    | distinct type;
newExceptions
| join kind=leftanti oldExceptions on type
| project NewExceptionType = type
```

### Tarefa 3: Consultar métricas de desempenho

```kql
// Response time percentiles over time
requests
| where timestamp > ago(24h)
| summarize
    p50 = percentile(duration, 50),
    p90 = percentile(duration, 90),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99)
    by bin(timestamp, 15m)
| render timechart

// Top 10 slowest endpoints
requests
| where timestamp > ago(4h)
| summarize
    avgDuration = avg(duration),
    p95Duration = percentile(duration, 95),
    requestCount = count()
    by name
| where requestCount > 10
| order by p95Duration desc
| take 10

// Failed requests by endpoint with error details
requests
| where timestamp > ago(1h)
| where success == false
| summarize
    failCount = count(),
    avgDuration = avg(duration)
    by name, resultCode
| order by failCount desc

// Dependency performance (external calls: databases, APIs)
dependencies
| where timestamp > ago(1h)
| summarize
    avgDuration = avg(duration),
    failRate = round(countif(success == false) * 100.0 / count(), 1),
    callCount = count()
    by target, name
| order by avgDuration desc

// Requests per second trend
requests
| where timestamp > ago(6h)
| summarize requestsPerSec = count() / 60.0 by bin(timestamp, 1m)
| render timechart
```

### Tarefa 4: Criar gráficos de séries temporais correlacionando deployments com erros

```kql
// Error rate with deployment annotations overlay
let deployments = customEvents
| where name == "Deployment" or name == "DeploymentAnnotation"
| project deployTime = timestamp, version = tostring(customDimensions.BuildNumber);
let errorRate = requests
| where timestamp > ago(24h)
| summarize
    totalReq = count(),
    failedReq = countif(success == false)
    by bin(timestamp, 5m)
| extend errorPercent = round((failedReq * 100.0) / totalReq, 2);
errorRate
| render timechart

// Side-by-side: error rate before and after each deployment
let deployments = customEvents
| where name == "Deployment"
| project deployTime = timestamp;
deployments
| extend beforeWindow = deployTime - 30m
| extend afterWindow = deployTime + 30m
| mv-expand timestamp = range(beforeWindow, afterWindow, 5m) to typeof(datetime)
| join kind=inner (
    requests
    | summarize errorRate = round(countif(success == false) * 100.0 / count(), 2)
        by bin(timestamp, 5m)
) on timestamp
| extend relativeMinutes = datetime_diff('minute', timestamp, deployTime)
| project deployTime, relativeMinutes, errorRate
| render timechart

// Response time degradation detection
requests
| where timestamp > ago(24h)
| summarize avgDuration = avg(duration) by bin(timestamp, 5m)
| extend movingAvg = avg_if(avgDuration, timestamp > ago(1h))
| extend isAnomaly = avgDuration > (movingAvg * 2)
| render timechart
```

### Tarefa 5: Construir regras de alerta usando KQL (thresholds dinâmicos)

```kql
// Alert: Error rate exceeds dynamic baseline
// This query returns results when current error rate is 3x the 7-day average
let baseline = requests
| where timestamp between (ago(7d) .. ago(1h))
| summarize baselineErrorRate = countif(success == false) * 100.0 / count();
let current = requests
| where timestamp > ago(5m)
| summarize currentErrorRate = countif(success == false) * 100.0 / count();
current
| extend threshold = toscalar(baseline) * 3
| where currentErrorRate > threshold
| project currentErrorRate, threshold

// Alert: Response time spike (p95 exceeds 2x normal)
let baselineP95 = requests
| where timestamp between (ago(7d) .. ago(1h))
| summarize percentile(duration, 95);
requests
| where timestamp > ago(5m)
| summarize currentP95 = percentile(duration, 95)
| where currentP95 > (toscalar(baselineP95) * 2)
| project currentP95, baselineP95 = toscalar(baselineP95), ratio = currentP95 / toscalar(baselineP95)

// Alert: New exception type appeared
exceptions
| where timestamp > ago(15m)
| distinct type
| join kind=leftanti (
    exceptions
    | where timestamp between (ago(7d) .. ago(15m))
    | distinct type
) on type
| project NewExceptionType = type
```

Crie a regra de alerta usando Azure CLI:

```bash
# Create a log-based alert rule
az monitor scheduled-query create \
  --name "alert-error-rate-spike" \
  --resource-group rg-contoso-prod \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/components/ai-contoso-webapp" \
  --condition "count 'ErrorRateSpike' > 0" \
  --condition-query ErrorRateSpike="let baseline = requests | where timestamp between (ago(7d) .. ago(1h)) | summarize baselineErrorRate = countif(success == false) * 100.0 / count(); let current = requests | where timestamp > ago(5m) | summarize currentErrorRate = countif(success == false) * 100.0 / count(); current | extend threshold = toscalar(baseline) * 3 | where currentErrorRate > threshold" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --action-groups "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/actionGroups/ag-sre-team" \
  --severity 2 \
  --description "Error rate exceeds 3x the 7-day baseline"
```

### Tarefa 6: Consultas OData do Azure DevOps Analytics

O Azure DevOps fornece visualizações de Analytics acessíveis via OData para consultar work items, pipelines e dados de teste.

```bash
# Query pipeline run duration analytics
curl -u :$PAT \
  "https://analytics.dev.azure.com/contoso/ContosoWeb/_odata/v4.0-preview/PipelineRuns?\$filter=CompletedDate gt 2024-11-01Z and PipelineName eq 'Production-Deploy'&\$select=PipelineRunId,CompletedDate,RunDuration,RunOutcome&\$orderby=CompletedDate desc&\$top=50"

# Query work item cycle time
curl -u :$PAT \
  "https://analytics.dev.azure.com/contoso/ContosoWeb/_odata/v4.0-preview/WorkItems?\$filter=WorkItemType eq 'User Story' and State eq 'Closed' and ClosedDate gt 2024-10-01Z&\$select=WorkItemId,Title,CycleTimeDays,LeadTimeDays&\$orderby=ClosedDate desc&\$top=50"

# Query test run pass rates
curl -u :$PAT \
  "https://analytics.dev.azure.com/contoso/ContosoWeb/_odata/v4.0-preview/TestRuns?\$filter=CompletedDate gt 2024-11-01Z&\$select=Title,TotalTests,PassedTests,FailedTests,NotExecutedTests&\$orderby=CompletedDate desc&\$top=20"
```

### Tarefa 7: Salvar e compartilhar consultas como templates de workbook

Crie um Azure Workbook reutilizável com consultas de correlação de deployment:

```bash
# Create a workbook via Azure CLI
az monitor app-insights workbook create \
  --resource-group rg-contoso-prod \
  --name "Deployment Impact Analysis" \
  --location eastus \
  --kind shared
```

Estrutura JSON do workbook com consultas parametrizadas:

```json
{
  "version": "Notebook/1.0",
  "items": [
    {
      "type": 9,
      "content": {
        "version": "KqlParameterItem/1.0",
        "parameters": [
          {
            "name": "TimeRange",
            "type": 4,
            "defaultValue": "Last 24 hours"
          },
          {
            "name": "Environment",
            "type": 2,
            "query": "requests | distinct cloud_RoleName"
          }
        ]
      }
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "requests\n| where timestamp > {TimeRange:start}\n| where cloud_RoleName == '{Environment}'\n| summarize\n    totalReq = count(),\n    failedReq = countif(success == false),\n    avgDuration = avg(duration)\n    by bin(timestamp, 5m)\n| extend errorRate = round((failedReq * 100.0) / totalReq, 2)\n| render timechart",
        "title": "Error rate and request volume"
      }
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "requests\n| where timestamp > {TimeRange:start}\n| where cloud_RoleName == '{Environment}'\n| summarize\n    p50 = percentile(duration, 50),\n    p95 = percentile(duration, 95),\n    p99 = percentile(duration, 99)\n    by bin(timestamp, 5m)\n| render timechart",
        "title": "Response time percentiles"
      }
    }
  ]
}
```

Compartilhe o workbook com a equipe:

```bash
# Grant read access to the SRE team
az role assignment create \
  --assignee <sre-team-group-id> \
  --role "Monitoring Reader" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/components/ai-contoso-webapp"
```

## Exercícios de quebra e conserto

### Cenário de quebra 1: Consulta KQL não retorna resultados apesar de existirem dados

Uma consulta filtrando por `customDimensions.Environment == "production"` retorna resultados vazios mesmo com os dados existindo.

**Causa:** Custom dimensions são armazenadas como objetos dinâmicos (JSON). Comparações de string requerem conversão explícita de tipo.


<details>
<summary>Mostrar solução</summary>

**Correção:**

```kql
// Wrong: comparing dynamic value directly
requests
| where customDimensions.Environment == "production"

// Correct: cast to string explicitly
requests
| where tostring(customDimensions.Environment) == "production"

// Alternative: use indexer notation
requests
| where customDimensions["Environment"] == "production"
```

</details>

### Cenário de quebra 2: Alerta dispara constantemente (falsos positivos)

Um alerta baseado em log para "pico de taxa de erro" dispara a cada 5 minutos mesmo durante operação normal.

**Causa:** O cálculo do baseline inclui o período de pico atual, ou o threshold é muito sensível.


<details>
<summary>Mostrar solução</summary>

**Correção:** Ajuste a janela de baseline para excluir dados recentes e adicione uma contagem mínima de requisições:

```kql
// Improved: exclude last hour from baseline, require minimum traffic
let baseline = requests
| where timestamp between (ago(7d) .. ago(2h))  // Exclude recent 2 hours
| summarize baselineErrorRate = countif(success == false) * 100.0 / count();
requests
| where timestamp > ago(5m)
| summarize
    currentErrorRate = countif(success == false) * 100.0 / count(),
    requestCount = count()
| where requestCount > 20  // Minimum traffic threshold
| where currentErrorRate > (toscalar(baseline) * 3)
| where currentErrorRate > 1.0  // Minimum absolute error rate
```

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Um SRE precisa encontrar os 5 endpoints de API mais lentos na última hora pelo tempo de resposta do percentil 95, excluindo endpoints com menos de 10 requisições. Qual consulta KQL realiza isso?",
    options: [
      "'requests | where timestamp > ago(1h) | top 5 by duration'",
      "'requests | where timestamp > ago(1h) | summarize p95 = percentile(duration, 95), count = count() by name | where count > 10 | top 5 by p95'",
      "'requests | where timestamp > ago(1h) | where duration > 1000 | summarize count() by name'",
      "'requests | where timestamp > ago(1h) | order by duration | take 5'"
    ],
    correctIndex: 1,
    explanation: "Esta consulta calcula corretamente o percentil 95 por endpoint, filtra endpoints com pouco tráfego (count > 10) e retorna os top 5 por duração p95. A opção A retorna as 5 requisições individuais mais lentas (não endpoints). A opção D também retorna requisições individuais sem agregação."
  },
  {
    question: "A Contoso quer um alerta que dispare quando a taxa de erro nos últimos 5 minutos exceder 3 vezes a taxa de erro média de 7 dias. Qual construção KQL é essencial para comparar métricas atuais com um baseline histórico?",
    options: [
      "Operador 'join'",
      "Função 'toscalar()' com uma subconsulta",
      "Operador 'mv-expand'",
      "Operador 'parse'"
    ],
    correctIndex: 1,
    explanation: "A função toscalar() converte um resultado de subconsulta tabular em um valor escalar que pode ser usado em comparações. Isso é essencial para comparar um valor de métrica atual com um baseline pré-computado (por exemplo, where currentRate > toscalar(baselineQuery) * 3)."
  },
  {
    question: "Após um deployment, um novo tipo de exceção 'Contoso.PaymentTimeoutException' aparece. Qual consulta KQL identifica tipos de exceção que NÃO existiam antes do deployment?",
    options: [
      "'exceptions | where timestamp > deployTime | where type contains \"Timeout\"'",
      "'exceptions | where timestamp > deployTime | distinct type | join kind=leftanti (exceptions | where timestamp < deployTime | distinct type) on type'",
      "'exceptions | summarize count() by type | where count_ == 1'",
      "'exceptions | where timestamp > deployTime | summarize count() by type | order by count_ asc'"
    ],
    correctIndex: 1,
    explanation: "O leftanti join retorna linhas da tabela esquerda (tipos de exceção pós-deployment) que não possuem linhas correspondentes na tabela direita (tipos de exceção pré-deployment). Isso identifica precisamente novas exceções que apareceram após o deployment."
  },
  {
    question: "Uma equipe do Azure DevOps quer consultar durações de execução de pipeline e taxas de aprovação do último trimestre para planejamento de capacidade. Qual fonte de dados eles devem usar?",
    options: [
      "API REST do Azure DevOps para execuções de pipeline",
      "Endpoint OData do Azure DevOps Analytics",
      "Custom events do Application Insights",
      "Logs de atividade do Azure Monitor"
    ],
    correctIndex: 1,
    explanation: "O Azure DevOps Analytics fornece um endpoint OData especificamente projetado para consultas analíticas históricas sobre pipelines, work items e testes. Ele suporta agregação, filtragem e análise de séries temporais que seriam difíceis de implementar com a API REST padrão (que é projetada para recuperação de registros individuais em vez de consultas analíticas)."
  }
]} />

## Limpeza

```bash
# Delete alert rules
az monitor scheduled-query delete \
  --name "alert-error-rate-spike" \
  --resource-group rg-contoso-prod

# Delete workbooks (via portal or CLI)
az monitor app-insights workbook delete \
  --resource-group rg-contoso-prod \
  --name "<workbook-resource-id>"

# No infrastructure to delete - this challenge primarily uses queries
```
