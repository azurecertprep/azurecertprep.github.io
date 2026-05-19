---
sidebar_position: 4
title: "Challenge 49: KQL queries for DevOps"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 49: KQL queries for DevOps

## Exam skills covered

- Interrogate logs using basic Kusto Query Language (KQL) queries

## Scenario

Contoso Ltd's SRE team needs to answer critical questions after each deployment: "Did the last deployment cause the error spike?" and "Is the response time regression correlated with the 3 PM release?" Currently, they manually browse Application Insights looking for anomalies without structured queries. You must write KQL queries that correlate deployments with application health metrics and build reusable alert rules and workbook templates.

## Prerequisites

- Azure subscription with an Application Insights resource that has telemetry data
- Log Analytics workspace with recent data
- Azure CLI installed
- Basic familiarity with SQL-like query syntax

## Tasks

### Task 1: KQL fundamentals

KQL (Kusto Query Language) is a read-only language for querying large datasets in Azure Monitor, Log Analytics, and Application Insights.

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

### Task 2: Query Application Insights logs for exceptions after deployment

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

### Task 3: Query performance metrics

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

### Task 4: Create time-series charts correlating deployments with errors

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

### Task 5: Build alert rules using KQL (dynamic thresholds)

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

Create the alert rule using Azure CLI:

```bash
# Create a log-based alert rule
az monitor scheduled-query create \
  --name "alert-error-rate-spike" \
  --resource-group rg-contoso-prod \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/components/ai-contoso-webapp" \
  --condition "count > 0" \
  --condition-query "let baseline = requests | where timestamp between (ago(7d) .. ago(1h)) | summarize baselineErrorRate = countif(success == false) * 100.0 / count(); let current = requests | where timestamp > ago(5m) | summarize currentErrorRate = countif(success == false) * 100.0 / count(); current | extend threshold = toscalar(baseline) * 3 | where currentErrorRate > threshold" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --action-groups "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/actionGroups/ag-sre-team" \
  --severity 2 \
  --description "Error rate exceeds 3x the 7-day baseline"
```

### Task 6: Azure DevOps Analytics OData queries

Azure DevOps provides Analytics views accessible via OData for querying work items, pipelines, and test data.

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

### Task 7: Save and share queries as workbook templates

Create a reusable Azure Workbook with deployment correlation queries:

```bash
# Create a workbook via Azure CLI
az monitor app-insights workbook create \
  --resource-group rg-contoso-prod \
  --name "Deployment Impact Analysis" \
  --location eastus \
  --kind shared
```

Workbook JSON structure with parameterized queries:

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

Share the workbook with the team:

```bash
# Grant read access to the SRE team
az role assignment create \
  --assignee <sre-team-group-id> \
  --role "Monitoring Reader" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/components/ai-contoso-webapp"
```

## Break and fix

### Break scenario 1: KQL query returns no results despite existing data

A query filtering on `customDimensions.Environment == "production"` returns empty results even though the data exists.

**Cause:** Custom dimensions are stored as dynamic (JSON) objects. String comparisons require explicit type casting.


<details>
<summary>Solution</summary>

**Fix:**

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

### Break scenario 2: Alert fires constantly (false positives)

A log-based alert for "error rate spike" fires every 5 minutes even during normal operation.

**Cause:** The baseline calculation includes the current spike period, or the threshold is too sensitive.


<details>
<summary>Solution</summary>

**Fix:** Adjust the baseline window to exclude recent data and add a minimum request count:

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
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "An SRE needs to find the top 5 slowest API endpoints in the last hour by their 95th percentile response time, excluding endpoints with fewer than 10 requests. Which KQL query achieves this?",
    options: [
      "'requests | where timestamp > ago(1h) | top 5 by duration'",
      "'requests | where timestamp > ago(1h) | summarize p95 = percentile(duration, 95), count = count() by name | where count > 10 | top 5 by p95'",
      "'requests | where timestamp > ago(1h) | where duration > 1000 | summarize count() by name'",
      "'requests | where timestamp > ago(1h) | order by duration | take 5'"
    ],
    correctIndex: 1,
    explanation: "This query correctly calculates the 95th percentile per endpoint, filters out low-traffic endpoints (count > 10), and returns the top 5 by p95 duration. Option A returns the 5 slowest individual requests (not endpoints). Option D also returns individual requests without aggregation."
  },
  {
    question: "Contoso wants an alert that fires when the error rate in the last 5 minutes exceeds 3 times the 7-day average error rate. Which KQL construct is essential for comparing current metrics against a historical baseline?",
    options: [
      "'join' operator",
      "'toscalar()' function with a sub-query",
      "'mv-expand' operator",
      "'parse' operator"
    ],
    correctIndex: 1,
    explanation: "The toscalar() function converts a tabular sub-query result into a scalar value that can be used in comparisons. This is essential for comparing a current metric value against a pre-computed baseline (for example, where currentRate > toscalar(baselineQuery) * 3)."
  },
  {
    question: "After a deployment, a new exception type 'Contoso.PaymentTimeoutException' appears. Which KQL query identifies exception types that did NOT exist before the deployment?",
    options: [
      "'exceptions | where timestamp > deployTime | where type contains \"Timeout\"'",
      "'exceptions | where timestamp > deployTime | distinct type | join kind=leftanti (exceptions | where timestamp < deployTime | distinct type) on type'",
      "'exceptions | summarize count() by type | where count_ == 1'",
      "'exceptions | where timestamp > deployTime | summarize count() by type | order by count_ asc'"
    ],
    correctIndex: 1,
    explanation: "The leftanti join returns rows from the left table (post-deployment exception types) that have no matching rows in the right table (pre-deployment exception types). This precisely identifies new exceptions that appeared after the deployment."
  },
  {
    question: "An Azure DevOps team wants to query pipeline run durations and pass rates over the last quarter for capacity planning. Which data source should they use?",
    options: [
      "Azure DevOps REST API for pipeline runs",
      "Azure DevOps Analytics OData endpoint",
      "Application Insights custom events",
      "Azure Monitor activity logs"
    ],
    correctIndex: 1,
    explanation: "Azure DevOps Analytics provides an OData endpoint specifically designed for historical analytics queries on pipelines, work items, and tests. It supports aggregation, filtering, and time-series analysis that would be cumbersome to implement with the standard REST API (which is designed for individual record retrieval rather than analytical queries)."
  }
]} />

## Cleanup

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
