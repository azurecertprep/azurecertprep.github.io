---
sidebar_position: 5
title: "Challenge 50: Performance analysis"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 50: Performance analysis

## Exam skills covered

- Inspect infrastructure performance indicators (CPU, memory, disk, network)
- Analyze metrics by using collected telemetry (usage, application performance)
- Inspect distributed tracing by using Application Insights

## Scenario

After the latest deployment at 2:30 PM, users report the Contoso web application is "slow." The support team sees a 40% increase in complaint tickets within an hour. You must use Azure Monitor, Application Insights, and distributed tracing to identify the root cause, correlate it with the specific deployment, and determine whether to roll back or hotfix.

## Prerequisites

- Azure subscription with an Application Insights resource collecting telemetry
- Azure App Service or AKS cluster with deployed services
- Application Insights with distributed tracing enabled across services
- Log Analytics workspace with VM or container metrics
- Azure CLI installed

## Tasks

### Task 1: Inspect Application Insights performance blade

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

Using Azure CLI to query performance:

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

### Task 2: Use distributed tracing to find bottleneck service

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

Navigate the Application Insights transaction search in the portal:

1. Application Insights > Transaction search
2. Filter by: duration > 5000ms, last 2 hours
3. Select a slow request
4. View the end-to-end transaction timeline showing all dependencies
5. Identify the dependency taking the most time (highlighted in the waterfall view)

### Task 3: Correlate with deployment annotations

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

### Task 4: Analyze infrastructure metrics

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

Using Azure CLI for infrastructure metrics:

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

### Task 5: Create an Application Insights workbook for deployment impact analysis

Build a parameterized workbook that compares metrics before and after any deployment:

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

### Task 6: Set up smart detection alerts

Smart detection automatically finds anomalies in application performance:

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

### Task 7: Implement SLI/SLO tracking

Define Service Level Indicators and track them with KQL:

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

Create an SLO dashboard query for the workbook:

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

## Break and fix

### Break scenario 1: Distributed tracing shows missing spans

The end-to-end transaction view shows a gap between the web frontend calling the payment service, but the payment service request appears as a separate trace without correlation.

**Cause:** The payment service is not propagating the W3C trace context headers. The `traceparent` header from the incoming request is not forwarded to downstream calls.

**Diagnosis:**

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

**Fix:** Ensure the payment service SDK is configured for W3C trace context propagation. For Node.js:

```javascript
// Ensure Application Insights is initialized BEFORE other imports
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
  .start();
```

### Break scenario 2: CPU spike identified but cannot determine which process

Infrastructure metrics show a CPU spike on the VM at deployment time, but it is unclear which application process is responsible.

**Diagnosis:**

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

**Fix:** Once the process is identified, correlate with the deployment to determine if the new code version introduced a CPU regression. Check for missing database indexes, inefficient loops, or configuration changes.

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "After a deployment, the Application Insights performance blade shows average response time increased from 200ms to 1500ms. The dependency list shows the SQL database calls went from 50ms average to 1200ms. What should you investigate first?",
    options: [
      "The web server CPU utilization",
      "The network latency between App Service and SQL Database",
      "The SQL Database query performance (new slow queries or missing indexes)",
      "The Application Insights sampling configuration"
    ],
    correctIndex: 2,
    explanation: "The data clearly shows the SQL dependency is the bottleneck (1200ms of the 1500ms total). This is most likely caused by a new query pattern introduced in the deployment (missing index, N+1 query, or table scan). Investigating the SQL query performance and execution plans should be the first step."
  },
  {
    question: "A distributed trace in Application Insights shows: Frontend (50ms) -> API Gateway (30ms) -> Order Service (4500ms) -> Payment Service (timeout). Which service should the SRE team investigate?",
    options: [
      "Frontend",
      "API Gateway",
      "Order Service",
      "Payment Service"
    ],
    correctIndex: 3,
    explanation: "The trace shows the Payment Service is timing out, which causes the Order Service to wait 4500ms. The root cause is in the Payment Service (it either has a bug, a downstream dependency issue, or resource exhaustion). The Order Service is slow only because it is waiting for the Payment Service to respond."
  },
  {
    question: "Contoso's SLO is 99.9% availability over a 30-day window. After 15 days, they have consumed 80% of their error budget. What action should the SRE team take?",
    options: [
      "No action needed since the SLO has not been breached yet",
      "Freeze all deployments and focus on reliability improvements",
      "Reduce deployment frequency and increase testing rigor for remaining deployments",
      "Lower the SLO target to 99.5%"
    ],
    correctIndex: 2,
    explanation: "At 80% error budget consumed in 15 days (half the window), the burn rate is 1.6x normal. This warrants caution but not a complete freeze. The team should reduce risk by increasing testing rigor, deploying to canary environments first, and prioritizing reliability fixes alongside feature work. A complete deployment freeze (option B) is typically reserved for >100% budget consumption."
  },
  {
    question: "Which Application Insights feature automatically detects performance anomalies without requiring manual configuration of alert rules?",
    options: [
      "Availability tests",
      "Smart detection",
      "Log-based alerts",
      "Metric alerts with dynamic thresholds"
    ],
    correctIndex: 1,
    explanation: "Smart detection is an ML-based feature in Application Insights that automatically analyzes telemetry patterns and detects anomalies in failure rates, response times, and dependency durations without any manual configuration. It learns the normal behavior of the application and alerts when significant deviations occur. While dynamic threshold alerts (option D) also learn baselines, they must be manually created."
  }
]} />

## Cleanup

```bash
# Delete alert rules
az monitor metrics alert delete --name "alert-response-time-degradation" --resource-group rg-contoso-prod
az monitor metrics alert delete --name "alert-dynamic-response-time" --resource-group rg-contoso-prod

# Delete workbooks (via Azure Portal > Application Insights > Workbooks > delete)

# No other infrastructure to clean up - this challenge uses existing monitoring resources
```
