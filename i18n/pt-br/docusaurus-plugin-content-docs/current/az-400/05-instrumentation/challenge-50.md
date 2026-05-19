---
sidebar_position: 5
title: "Desafio 50: Análise de desempenho"
sidebar_label: "Desafio 50: Análise de desempenho"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 50: Análise de desempenho

## Habilidades do exame abordadas

- Inspecionar indicadores de desempenho de infraestrutura (CPU, memória, disco, rede)
- Analisar métricas usando telemetria coletada (uso, desempenho da aplicação)
- Inspecionar rastreamento distribuído usando Application Insights

## Cenário

Após o último deployment às 14h30, os usuários relatam que a aplicação web da Contoso está "lenta". A equipe de suporte observa um aumento de 40% nos tickets de reclamação em uma hora. Você deve usar o Azure Monitor, Application Insights e rastreamento distribuído para identificar a causa raiz, correlacioná-la com o deployment específico e determinar se deve fazer rollback ou hotfix.

## Pré-requisitos

- Assinatura Azure com um recurso Application Insights coletando telemetria
- Azure App Service ou cluster AKS com serviços implantados
- Application Insights com rastreamento distribuído habilitado entre serviços
- Workspace do Log Analytics com métricas de VM ou contêiner
- Azure CLI instalado

## Tarefas

### Tarefa 1: Inspecionar o blade de desempenho do Application Insights

```kql
// Overall performance summary: request duration distribution
requests
| where timestamp > ago(4h)
| summarize
    requestCount = count(),
    avgDuration = avg(duration),
    p50 = percentile(duration, 50),
    p90 = percentile(duration, 90),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99),
    maxDuration = max(duration)
| project
    requestCount,
    avgDuration = round(avgDuration, 0),
    p50 = round(p50, 0),
    p90 = round(p90, 0),
    p95 = round(p95, 0),
    p99 = round(p99, 0),
    maxDuration = round(maxDuration, 0)

// Slowest requests with dependency breakdown
requests
| where timestamp > ago(2h)
| where duration > 3000  // Requests over 3 seconds
| project operation_Id, name, duration, timestamp, resultCode
| order by duration desc
| take 20

// Slowest dependencies (databases, external APIs, caches)
dependencies
| where timestamp > ago(2h)
| summarize
    avgDuration = avg(duration),
    p95Duration = percentile(duration, 95),
    callCount = count(),
    failRate = round(countif(success == false) * 100.0 / count(), 1)
    by target, type, name
| order by p95Duration desc
| take 15

// Performance comparison: before vs after deployment
let deployTime = datetime(2024-11-15T14:30:00Z);
requests
| where timestamp between ((deployTime - 2h) .. (deployTime + 2h))
| extend period = iff(timestamp < deployTime, "Before", "After")
| summarize
    avgDuration = round(avg(duration), 0),
    p95Duration = round(percentile(duration, 95), 0),
    errorRate = round(countif(success == false) * 100.0 / count(), 2),
    requestCount = count()
    by period
```

Usando Azure CLI para consultar desempenho:

```bash
# Get overall performance metrics
az monitor app-insights metrics show \
  --app ai-contoso-webapp \
  --resource-group rg-contoso-prod \
  --metrics "requests/duration" \
  --aggregation avg,max \
  --interval PT5M \
  --start-time "2024-11-15T12:00:00Z" \
  --end-time "2024-11-15T18:00:00Z"

# Get failed request rate
az monitor app-insights metrics show \
  --app ai-contoso-webapp \
  --resource-group rg-contoso-prod \
  --metrics "requests/failed" \
  --aggregation count \
  --interval PT5M
```

### Tarefa 2: Usar rastreamento distribuído para encontrar o serviço gargalo

```kql
// Find the slowest operation and trace it end-to-end
requests
| where timestamp > ago(1h)
| where duration > 5000  // Very slow requests (>5s)
| take 1
| project operation_Id, name, duration, timestamp

// Now trace all dependencies in that operation
let slowOperationId = "abc123-operation-id";
union requests, dependencies, exceptions
| where operation_Id == slowOperationId
| project
    timestamp,
    itemType = itemType,
    name,
    duration,
    success,
    target = coalesce(target, ""),
    resultCode = coalesce(resultCode, ""),
    type = coalesce(type, "")
| order by timestamp asc

// Find the service causing the most latency
dependencies
| where timestamp > ago(1h)
| where duration > 2000  // Slow dependencies
| summarize
    avgDuration = avg(duration),
    slowCallCount = count(),
    failedCount = countif(success == false)
    by target, name, type
| extend impact = avgDuration * slowCallCount
| order by impact desc
| take 10

// End-to-end transaction view for a specific request
let operationId = "specific-operation-id";
union
    (requests | where operation_Id == operationId | extend itemType = "request"),
    (dependencies | where operation_Id == operationId | extend itemType = "dependency"),
    (exceptions | where operation_Id == operationId | extend itemType = "exception"),
    (traces | where operation_Id == operationId | extend itemType = "trace")
| project timestamp, itemType, name, duration, success, target, resultCode
| order by timestamp asc
```

Navegue pela pesquisa de transações do Application Insights no portal:

1. Application Insights > Transaction search
2. Filtre por: duration > 5000ms, últimas 2 horas
3. Selecione uma requisição lenta
4. Visualize a timeline de transação de ponta a ponta mostrando todas as dependências
5. Identifique a dependência que consome mais tempo (destacada na visualização waterfall)

### Tarefa 3: Correlacionar com anotações de deployment

```kql
// Find the last deployment and compare metrics before/after
let lastDeployment = customEvents
| where name == "Deployment" or name == "DeploymentAnnotation"
| where timestamp > ago(24h)
| top 1 by timestamp desc
| project deployTime = timestamp;
let deployTime = toscalar(lastDeployment);
requests
| where timestamp between ((deployTime - 1h) .. (deployTime + 1h))
| extend relativeMinutes = datetime_diff('minute', timestamp, deployTime)
| extend period = iff(relativeMinutes < 0, "Before", "After")
| summarize
    avgDuration = round(avg(duration), 0),
    p95Duration = round(percentile(duration, 95), 0),
    errorRate = round(countif(success == false) * 100.0 / count(), 2),
    requestCount = count()
    by period, bin(relativeMinutes, 5)
| order by relativeMinutes asc
| render timechart

// Identify which specific endpoints degraded after deployment
let deployTime = datetime(2024-11-15T14:30:00Z);
let beforePerf = requests
| where timestamp between ((deployTime - 1h) .. deployTime)
| summarize beforeAvg = avg(duration), beforeP95 = percentile(duration, 95) by name;
let afterPerf = requests
| where timestamp between (deployTime .. (deployTime + 1h))
| summarize afterAvg = avg(duration), afterP95 = percentile(duration, 95) by name;
beforePerf
| join kind=inner afterPerf on name
| extend degradationPct = round(((afterAvg - beforeAvg) / beforeAvg) * 100, 1)
| where degradationPct > 50  // Endpoints that got 50%+ slower
| order by degradationPct desc
| project name, beforeAvg = round(beforeAvg, 0), afterAvg = round(afterAvg, 0), degradationPct, beforeP95 = round(beforeP95, 0), afterP95 = round(afterP95, 0)
```

### Tarefa 4: Analisar métricas de infraestrutura

```kql
// CPU usage over time (from VM Insights or Container Insights)
Perf
| where TimeGenerated > ago(4h)
| where Computer == "vm-contoso-orders"
| where CounterName == "% Processor Time"
| where InstanceName == "_Total"
| summarize avgCPU = avg(CounterValue), maxCPU = max(CounterValue) by bin(TimeGenerated, 5m)
| render timechart

// Memory usage trend
Perf
| where TimeGenerated > ago(4h)
| where Computer == "vm-contoso-orders"
| where CounterName == "Available MBytes"
| summarize avgAvailableMB = avg(CounterValue) by bin(TimeGenerated, 5m)
| render timechart

// Container resource consumption (for AKS)
ContainerInventory
| where TimeGenerated > ago(2h)
| where ContainerHostname contains "payment-service"
| project TimeGenerated, Computer, ContainerHostname, ContainerState

// Container CPU and memory from Container Insights
Perf
| where TimeGenerated > ago(2h)
| where ObjectName == "K8SContainer"
| where CounterName == "cpuUsageNanoCores"
| where InstanceName contains "payment-service"
| summarize avgCPU = avg(CounterValue / 1000000.0) by bin(TimeGenerated, 1m)
| render timechart

// Disk I/O (potential bottleneck for database VMs)
Perf
| where TimeGenerated > ago(4h)
| where Computer == "vm-contoso-orders"
| where CounterName == "Disk Reads/sec" or CounterName == "Disk Writes/sec"
| summarize avgIOPS = avg(CounterValue) by bin(TimeGenerated, 5m), CounterName
| render timechart

// Network throughput
Perf
| where TimeGenerated > ago(4h)
| where Computer == "vm-contoso-orders"
| where CounterName == "Bytes Sent/sec" or CounterName == "Bytes Received/sec"
| summarize avgBytesPerSec = avg(CounterValue) by bin(TimeGenerated, 5m), CounterName
| render timechart
```

Usando Azure CLI para métricas de infraestrutura:

```bash
# Get CPU metrics for App Service
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/Microsoft.Web/sites/app-contoso-web" \
  --metric "CpuPercentage" \
  --interval PT5M \
  --start-time "2024-11-15T12:00:00Z" \
  --end-time "2024-11-15T18:00:00Z" \
  --aggregation Average,Maximum

# Get memory metrics
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/Microsoft.Web/sites/app-contoso-web" \
  --metric "MemoryWorkingSet" \
  --interval PT5M \
  --aggregation Average,Maximum

# Get HTTP response code breakdown
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/Microsoft.Web/sites/app-contoso-web" \
  --metric "Http5xx,Http4xx,Http2xx" \
  --interval PT5M \
  --aggregation Total
```

### Tarefa 5: Criar um workbook do Application Insights para análise de impacto de deployment

Construa um workbook parametrizado que compara métricas antes e depois de qualquer deployment:

```kql
// Workbook Query 1: Deployment selector (parameter)
customEvents
| where name == "Deployment"
| where timestamp > ago(30d)
| project deployTime = timestamp, version = tostring(customDimensions.BuildNumber)
| order by deployTime desc

// Workbook Query 2: Request volume and error rate (time chart)
// Uses {DeploymentTime} parameter
let deployTime = todatetime('{DeploymentTime}');
requests
| where timestamp between ((deployTime - 2h) .. (deployTime + 2h))
| summarize
    totalRequests = count(),
    failedRequests = countif(success == false)
    by bin(timestamp, 5m)
| extend errorRate = round((failedRequests * 100.0) / totalRequests, 2)
| project timestamp, totalRequests, errorRate
| render timechart

// Workbook Query 3: Before/After summary table
let deployTime = todatetime('{DeploymentTime}');
requests
| where timestamp between ((deployTime - 1h) .. (deployTime + 1h))
| extend period = iff(timestamp < deployTime, "1-Before", "2-After")
| summarize
    requestCount = count(),
    avgDuration = round(avg(duration), 0),
    p95Duration = round(percentile(duration, 95), 0),
    errorRate = round(countif(success == false) * 100.0 / count(), 2)
    by period

// Workbook Query 4: Most impacted endpoints
let deployTime = todatetime('{DeploymentTime}');
let before = requests | where timestamp between ((deployTime - 1h) .. deployTime)
    | summarize beforeAvg = avg(duration) by name;
let after = requests | where timestamp between (deployTime .. (deployTime + 1h))
    | summarize afterAvg = avg(duration) by name;
before | join after on name
| extend change = round(((afterAvg - beforeAvg) / beforeAvg) * 100, 1)
| project name, beforeMs = round(beforeAvg, 0), afterMs = round(afterAvg, 0), changePct = change
| order by changePct desc
| take 10

// Workbook Query 5: Infrastructure metrics during deployment
let deployTime = todatetime('{DeploymentTime}');
Perf
| where TimeGenerated between ((deployTime - 1h) .. (deployTime + 1h))
| where CounterName == "% Processor Time" and InstanceName == "_Total"
| summarize avgCPU = avg(CounterValue) by bin(TimeGenerated, 5m)
| render timechart
```

### Tarefa 6: Configurar alertas de detecção inteligente

A detecção inteligente encontra automaticamente anomalias no desempenho da aplicação:

```bash
# Smart detection is enabled by default in Application Insights
# Verify smart detection configuration
az monitor app-insights component show \
  --app ai-contoso-webapp \
  --resource-group rg-contoso-prod \
  --query "properties.Request_Source"

# Configure smart detection notification recipients
# Azure Portal > Application Insights > Smart Detection > Settings
# - Failure Anomalies: enabled (sends to subscription owners by default)
# - Slow page load time: enabled
# - Slow server response time: enabled
# - Long dependency duration: enabled

# Create a custom metric alert for specific degradation patterns
az monitor metrics alert create \
  --name "alert-response-time-degradation" \
  --resource-group rg-contoso-prod \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/components/ai-contoso-webapp" \
  --condition "avg requests/duration > 3000" \
  --window-size 10m \
  --evaluation-frequency 5m \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/actionGroups/ag-sre-team" \
  --description "Average response time exceeds 3 seconds" \
  --severity 2

# Dynamic threshold alert (automatically learns baseline)
az monitor metrics alert create \
  --name "alert-dynamic-response-time" \
  --resource-group rg-contoso-prod \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/components/ai-contoso-webapp" \
  --condition "avg requests/duration > dynamic medium 3 of 5" \
  --window-size 5m \
  --evaluation-frequency 5m \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/actionGroups/ag-sre-team" \
  --description "Response time anomaly detected (dynamic threshold)" \
  --severity 3
```

### Tarefa 7: Implementar rastreamento de SLI/SLO

Defina Service Level Indicators e rastreie-os com KQL:

```kql
// SLI: Availability (percentage of successful requests)
let sloTarget = 99.9;
requests
| where timestamp > ago(30d)
| summarize
    totalRequests = count(),
    successfulRequests = countif(success == true and resultCode !startswith "5")
| extend
    availability = round((successfulRequests * 100.0) / totalRequests, 3),
    sloTarget = sloTarget,
    errorBudgetTotal = round(totalRequests * (1 - sloTarget / 100), 0),
    errorBudgetUsed = totalRequests - successfulRequests
| extend
    errorBudgetRemaining = errorBudgetTotal - errorBudgetUsed,
    errorBudgetPct = round((errorBudgetUsed * 100.0) / errorBudgetTotal, 1)

// SLI: Latency (percentage of requests under threshold)
let latencyTarget = 99.0;  // 99% of requests under 1 second
let latencyThreshold = 1000;  // milliseconds
requests
| where timestamp > ago(30d)
| summarize
    totalRequests = count(),
    fastRequests = countif(duration < latencyThreshold)
| extend
    latencyCompliance = round((fastRequests * 100.0) / totalRequests, 2),
    sloTarget = latencyTarget,
    withinBudget = (fastRequests * 100.0 / totalRequests) >= latencyTarget

// SLI tracking over time (daily burn rate)
requests
| where timestamp > ago(30d)
| summarize
    totalReq = count(),
    failedReq = countif(success == false or resultCode startswith "5")
    by bin(timestamp, 1d)
| extend
    dailyErrorRate = round((failedReq * 100.0) / totalReq, 3),
    dailyAvailability = round(((totalReq - failedReq) * 100.0) / totalReq, 3)
| render timechart

// Error budget burn rate (are we burning budget too fast?)
let sloTarget = 99.9;
let windowDays = 30;
requests
| where timestamp > ago(30d)
| summarize
    totalReq = count(),
    failedReq = countif(success == false)
    by bin(timestamp, 1d)
| extend
    dailyErrorBudget = totalReq * (1 - sloTarget / 100.0),
    dailyBudgetUsed = failedReq,
    burnRate = round(failedReq / (totalReq * (1 - sloTarget / 100.0)), 2)
| extend isBurningFast = burnRate > 1.0
| render timechart
```

Crie uma consulta de dashboard SLO para o workbook:

```kql
// Multi-window burn rate alert (Google SRE book pattern)
// Fast burn: 14.4x budget consumption in 1 hour
// Slow burn: 6x budget consumption in 6 hours
let sloTarget = 99.9;
let monthlyBudget = 43.2;  // minutes of downtime per month for 99.9%
let fastWindow = 1h;
let slowWindow = 6h;
let fastBurn = requests
| where timestamp > ago(fastWindow)
| summarize errorRate = countif(success == false) * 100.0 / count()
| extend burnRate = errorRate / (100 - sloTarget);
let slowBurn = requests
| where timestamp > ago(slowWindow)
| summarize errorRate = countif(success == false) * 100.0 / count()
| extend burnRate = errorRate / (100 - sloTarget);
union
    (fastBurn | extend window = "1h", threshold = 14.4),
    (slowBurn | extend window = "6h", threshold = 6.0)
| extend alert = burnRate > threshold
| project window, errorRate = round(errorRate, 3), burnRate = round(burnRate, 2), threshold, alert
```

## Exercícios de quebra e conserto

### Cenário de quebra 1: Rastreamento distribuído mostra spans ausentes

A visualização de transação de ponta a ponta mostra uma lacuna entre o frontend web chamando o serviço de pagamento, mas a requisição do serviço de pagamento aparece como um trace separado sem correlação.

**Causa:** O serviço de pagamento não está propagando os headers de contexto de trace W3C. O header `traceparent` da requisição de entrada não está sendo encaminhado para chamadas downstream.

**Diagnóstico:**

```kql
// Check if operation_Id matches between services
requests
| where timestamp > ago(1h)
| where cloud_RoleName == "payment-service"
| summarize distinctOperations = dcount(operation_Id)
| project distinctOperations

// Compare with dependencies from the calling service
dependencies
| where timestamp > ago(1h)
| where target contains "payment"
| project operation_Id, name, duration
| join kind=leftanti (
    requests
    | where cloud_RoleName == "payment-service"
    | project operation_Id
) on operation_Id
| count  // Number of unmatched traces
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Garanta que o SDK do serviço de pagamento esteja configurado para propagação de contexto de trace W3C. Para Node.js:

```javascript
// Ensure Application Insights is initialized BEFORE other imports
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
  .start();
```

</details>

### Cenário de quebra 2: Pico de CPU identificado mas não é possível determinar qual processo

Métricas de infraestrutura mostram um pico de CPU na VM no momento do deployment, mas não está claro qual processo da aplicação é responsável.

**Diagnóstico:**

```kql
// Use VM Insights process data to identify the culprit
VMProcess
| where TimeGenerated > ago(2h)
| where Computer == "vm-contoso-orders"
| summarize avgCPU = avg(PercentProcessorTime) by ProcessName, bin(TimeGenerated, 5m)
| where avgCPU > 10
| order by avgCPU desc
| render timechart
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Uma vez identificado o processo, correlacione com o deployment para determinar se a nova versão do código introduziu uma regressão de CPU. Verifique índices de banco de dados ausentes, loops ineficientes ou mudanças de configuração.

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Após um deployment, o blade de desempenho do Application Insights mostra que o tempo médio de resposta aumentou de 200ms para 1500ms. A lista de dependências mostra que as chamadas ao banco de dados SQL foram de 50ms em média para 1200ms. O que você deve investigar primeiro?",
    options: [
      "A utilização de CPU do servidor web",
      "A latência de rede entre o App Service e o SQL Database",
      "O desempenho de consultas do SQL Database (novas consultas lentas ou índices ausentes)",
      "A configuração de amostragem do Application Insights"
    ],
    correctIndex: 2,
    explanation: "Os dados mostram claramente que a dependência SQL é o gargalo (1200ms dos 1500ms totais). Isso é provavelmente causado por um novo padrão de consulta introduzido no deployment (índice ausente, consulta N+1 ou varredura de tabela). Investigar o desempenho de consultas SQL e planos de execução deve ser o primeiro passo."
  },
  {
    question: "Um trace distribuído no Application Insights mostra: Frontend (50ms) -> API Gateway (30ms) -> Order Service (4500ms) -> Payment Service (timeout). Qual serviço a equipe de SRE deve investigar?",
    options: [
      "Frontend",
      "API Gateway",
      "Order Service",
      "Payment Service"
    ],
    correctIndex: 3,
    explanation: "O trace mostra que o Payment Service está com timeout, o que faz o Order Service esperar 4500ms. A causa raiz está no Payment Service (ele tem um bug, um problema de dependência downstream ou exaustão de recursos). O Order Service está lento apenas porque está esperando o Payment Service responder."
  },
  {
    question: "O SLO da Contoso é 99,9% de disponibilidade em uma janela de 30 dias. Após 15 dias, eles consumiram 80% do error budget. Qual ação a equipe de SRE deve tomar?",
    options: [
      "Nenhuma ação necessária já que o SLO ainda não foi violado",
      "Congelar todos os deployments e focar em melhorias de confiabilidade",
      "Reduzir a frequência de deployments e aumentar o rigor de testes para os deployments restantes",
      "Reduzir a meta do SLO para 99,5%"
    ],
    correctIndex: 2,
    explanation: "Com 80% do error budget consumido em 15 dias (metade da janela), a taxa de consumo é 1,6x o normal. Isso justifica cautela, mas não um congelamento completo. A equipe deve reduzir o risco aumentando o rigor de testes, fazendo deploy em ambientes canary primeiro e priorizando correções de confiabilidade junto com trabalho de funcionalidades. Um congelamento completo de deployments (opção B) é tipicamente reservado para consumo >100% do budget."
  },
  {
    question: "Qual funcionalidade do Application Insights detecta automaticamente anomalias de desempenho sem exigir configuração manual de regras de alerta?",
    options: [
      "Testes de disponibilidade",
      "Smart detection",
      "Alertas baseados em log",
      "Alertas de métrica com thresholds dinâmicos"
    ],
    correctIndex: 1,
    explanation: "Smart detection é uma funcionalidade baseada em ML no Application Insights que analisa automaticamente padrões de telemetria e detecta anomalias em taxas de falha, tempos de resposta e durações de dependência sem nenhuma configuração manual. Ela aprende o comportamento normal da aplicação e alerta quando ocorrem desvios significativos. Embora alertas com threshold dinâmico (opção D) também aprendam baselines, eles precisam ser criados manualmente."
  }
]} />

## Limpeza

```bash
# Delete alert rules
az monitor metrics alert delete --name "alert-response-time-degradation" --resource-group rg-contoso-prod
az monitor metrics alert delete --name "alert-dynamic-response-time" --resource-group rg-contoso-prod

# Delete workbooks (via Azure Portal > Application Insights > Workbooks > delete)

# No other infrastructure to clean up - this challenge uses existing monitoring resources
```
