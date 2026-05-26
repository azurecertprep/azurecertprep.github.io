---
sidebar_position: 8
title: "Challenge 07: Monitor Azure AI Resources"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 07: Monitor Azure AI Resources

:::info Estimated Time
**45-60 min** | **Cost**: ~$0.50 (Log Analytics ingestion) | **Domain**: Plan & Manage AI Solutions (20-25%)
:::

## Exam skills covered
- Monitor an Azure AI resource
- Configure diagnostic settings for Azure AI services
- Query metrics and logs using Azure Monitor and KQL

## Overview

Monitoring Azure AI resources is essential for maintaining reliability, tracking usage patterns, and detecting issues before they impact users. Azure Monitor provides a unified platform for collecting metrics, logs, and traces from AI services including latency, request counts, error rates, and token consumption.

In this challenge, you'll configure diagnostic settings to route logs and metrics to a Log Analytics workspace, write KQL queries to analyze service behavior, and set up alert rules for critical thresholds. You'll work with key metrics like `TotalCalls`, `TotalErrors`, `Latency`, and `TokenTransaction`.

Understanding the monitoring pipeline — from diagnostic settings through Log Analytics to alerts — is a core skill for managing production AI deployments at scale.

## Architecture

Diagnostic settings route metrics and logs from Azure AI services to Log Analytics, enabling KQL queries and alert rules.

![Challenge 07 topology](/img/ai-102/challenge-07-topology.svg)

## Prerequisites

- Azure subscription with an Azure AI services resource
- Log Analytics workspace (or will create one)
- Azure CLI installed
- Contributor role on the resource group

## Implementation

### Task 1: Create Log Analytics Workspace and Enable Diagnostic Settings

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.loganalytics import LogAnalyticsManagementClient
from azure.mgmt.monitor import MonitorManagementClient
from azure.mgmt.monitor.models import (
    DiagnosticSettingsResource,
    LogSettings,
    MetricSettings,
    RetentionPolicy
)

credential = DefaultAzureCredential()
subscription_id = "<your-subscription-id>"
resource_group = "rg-ai102-challenge07"

# Create Log Analytics workspace
la_client = LogAnalyticsManagementClient(credential, subscription_id)
workspace = la_client.workspaces.begin_create_or_update(
    resource_group_name=resource_group,
    workspace_name="law-ai102-monitor",
    parameters={
        "location": "eastus",
        "properties": {
            "sku": {"name": "PerGB2018"},
            "retention_in_days": 30
        }
    }
).result()
print(f"Workspace created: {workspace.id}")

# Enable diagnostic settings on AI services resource
monitor_client = MonitorManagementClient(credential, subscription_id)
ai_resource_id = (
    f"/subscriptions/{subscription_id}/resourceGroups/{resource_group}"
    f"/providers/Microsoft.CognitiveServices/accounts/ai-monitor-demo"
)

diagnostic_settings = monitor_client.diagnostic_settings.create_or_update(
    resource_uri=ai_resource_id,
    name="ai-diagnostics",
    parameters=DiagnosticSettingsResource(
        workspace_id=workspace.id,
        logs=[
            LogSettings(
                category="Audit",
                enabled=True,
                retention_policy=RetentionPolicy(enabled=True, days=30)
            ),
            LogSettings(
                category="RequestResponse",
                enabled=True,
                retention_policy=RetentionPolicy(enabled=True, days=30)
            )
        ],
        metrics=[
            MetricSettings(
                category="AllMetrics",
                enabled=True,
                retention_policy=RetentionPolicy(enabled=True, days=30)
            )
        ]
    )
)
print(f"Diagnostic settings created: {diagnostic_settings.name}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.Monitor;
using Azure.ResourceManager.Monitor.Models;
using Azure.ResourceManager.OperationalInsights;
using Azure.ResourceManager.OperationalInsights.Models;

var credential = new DefaultAzureCredential();
var armClient = new ArmClient(credential);

var subscription = await armClient.GetDefaultSubscriptionAsync();
var resourceGroup = await subscription.GetResourceGroups().GetAsync("rg-ai102-challenge07");

// Create Log Analytics workspace
var workspaceData = new OperationalInsightsWorkspaceData(Azure.Core.AzureLocation.EastUS)
{
    Sku = new OperationalInsightsWorkspaceSku(OperationalInsightsWorkspaceSkuName.PerGB2018),
    RetentionInDays = 30
};

var workspaceOp = await resourceGroup.Value
    .GetOperationalInsightsWorkspaces()
    .CreateOrUpdateAsync(Azure.WaitUntil.Completed, "law-ai102-monitor", workspaceData);
var workspace = workspaceOp.Value;
Console.WriteLine($"Workspace created: {workspace.Id}");

// Enable diagnostic settings on AI services resource
string aiResourceId = $"/subscriptions/{subscription.Data.SubscriptionId}" +
    $"/resourceGroups/rg-ai102-challenge07" +
    $"/providers/Microsoft.CognitiveServices/accounts/ai-monitor-demo";

var diagnosticData = new DiagnosticSettingData
{
    WorkspaceId = workspace.Id
};
diagnosticData.Logs.Add(new DiagnosticSettingLogConfiguration(true) { Category = "Audit" });
diagnosticData.Logs.Add(new DiagnosticSettingLogConfiguration(true) { Category = "RequestResponse" });
diagnosticData.Metrics.Add(new DiagnosticSettingMetricConfiguration(true) { Category = "AllMetrics" });

var diagnosticResource = armClient.GetDiagnosticSettingResource(
    DiagnosticSettingResource.CreateResourceIdentifier(aiResourceId, "ai-diagnostics"));

// Note: Use the parent resource's diagnostic settings collection in practice
Console.WriteLine("Diagnostic settings configured for Audit, RequestResponse logs and AllMetrics");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
RESOURCE_GROUP="rg-ai102-challenge07"
LOCATION="eastus"
AI_ACCOUNT="ai-monitor-demo"
WORKSPACE_NAME="law-ai102-monitor"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create AI services resource
az cognitiveservices account create \
  --name $AI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --kind AIServices \
  --sku S0 \
  --location $LOCATION

# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $WORKSPACE_NAME \
  --location $LOCATION \
  --retention-time 30

# Get workspace ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $WORKSPACE_NAME \
  --query id -o tsv)

# Enable diagnostic settings
az monitor diagnostic-settings create \
  --name "ai-diagnostics" \
  --resource $(az cognitiveservices account show \
    --name $AI_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --query id -o tsv) \
  --workspace $WORKSPACE_ID \
  --logs '[
    {"category": "Audit", "enabled": true, "retentionPolicy": {"enabled": true, "days": 30}},
    {"category": "RequestResponse", "enabled": true, "retentionPolicy": {"enabled": true, "days": 30}}
  ]' \
  --metrics '[
    {"category": "AllMetrics", "enabled": true, "retentionPolicy": {"enabled": true, "days": 30}}
  ]'

echo "Diagnostic settings enabled"
```

</TabItem>
</Tabs>

### Task 2: Query Metrics via Azure Monitor REST API

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.monitor import MonitorManagementClient
from datetime import datetime, timedelta

credential = DefaultAzureCredential()
subscription_id = "<your-subscription-id>"
monitor_client = MonitorManagementClient(credential, subscription_id)

resource_id = (
    f"/subscriptions/{subscription_id}/resourceGroups/rg-ai102-challenge07"
    f"/providers/Microsoft.CognitiveServices/accounts/ai-monitor-demo"
)

# Query TotalCalls metric for the last 24 hours
end_time = datetime.utcnow()
start_time = end_time - timedelta(hours=24)
timespan = f"{start_time.isoformat()}Z/{end_time.isoformat()}Z"

# Get total calls
metrics_response = monitor_client.metrics.list(
    resource_uri=resource_id,
    timespan=timespan,
    interval="PT1H",
    metricnames="TotalCalls,TotalErrors,Latency,TokenTransaction",
    aggregation="Total,Average"
)

for metric in metrics_response.value:
    print(f"\n=== {metric.name.value} ===")
    for timeseries in metric.timeseries:
        for data_point in timeseries.data:
            if data_point.total is not None:
                print(f"  {data_point.time_stamp}: Total={data_point.total}")
            if data_point.average is not None:
                print(f"  {data_point.time_stamp}: Avg={data_point.average:.2f}ms")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;

var credential = new DefaultAzureCredential();
var metricsClient = new MetricsQueryClient(credential);

string resourceId = "/subscriptions/<subscription-id>/resourceGroups/rg-ai102-challenge07" +
    "/providers/Microsoft.CognitiveServices/accounts/ai-monitor-demo";

// Query metrics for the last 24 hours
var response = await metricsClient.QueryResourceAsync(
    resourceId,
    new[] { "TotalCalls", "TotalErrors", "Latency", "TokenTransaction" },
    new MetricsQueryOptions
    {
        TimeRange = new QueryTimeRange(TimeSpan.FromHours(24)),
        Granularity = TimeSpan.FromHours(1),
        Aggregations = { MetricAggregationType.Total, MetricAggregationType.Average }
    }
);

foreach (MetricResult metric in response.Value.Metrics)
{
    Console.WriteLine($"\n=== {metric.Name} ===");
    foreach (MetricTimeSeriesElement timeSeries in metric.TimeSeries)
    {
        foreach (MetricValue value in timeSeries.Values)
        {
            if (value.Total.HasValue)
                Console.WriteLine($"  {value.TimeStamp}: Total={value.Total}");
            if (value.Average.HasValue)
                Console.WriteLine($"  {value.TimeStamp}: Avg={value.Average:F2}ms");
        }
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Get access token
TOKEN=$(az account get-access-token --query accessToken -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RESOURCE_ID="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-ai102-challenge07/providers/Microsoft.CognitiveServices/accounts/ai-monitor-demo"

# Query metrics via REST API
END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
START_TIME=$(date -u -d "24 hours ago" +"%Y-%m-%dT%H:%M:%SZ")

curl -s -X GET \
  "https://management.azure.com${RESOURCE_ID}/providers/Microsoft.Insights/metrics?api-version=2023-10-01&timespan=${START_TIME}/${END_TIME}&interval=PT1H&metricnames=TotalCalls,TotalErrors,Latency,TokenTransaction&aggregation=Total,Average" \
  -H "Authorization: Bearer $TOKEN" | jq '.value[] | {name: .name.value, timeseries: [.timeseries[].data[] | select(.total != null or .average != null) | {time: .timeStamp, total, average}]}'

# Quick metrics check via Azure CLI
az monitor metrics list \
  --resource $RESOURCE_ID \
  --metric "TotalCalls" "TotalErrors" "Latency" \
  --interval PT1H \
  --start-time $(date -u -d "1 hour ago" +"%Y-%m-%dT%H:%M:%SZ") \
  --output table
```

</TabItem>
</Tabs>

### Task 3: Write KQL Queries for AI Service Logs

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.monitor.query import LogsQueryClient
from datetime import timedelta

credential = DefaultAzureCredential()
logs_client = LogsQueryClient(credential)

workspace_id = "<your-workspace-id>"

# KQL: Top operations by count and average duration
kql_operations = """
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where TimeGenerated > ago(24h)
| summarize
    RequestCount = count(),
    AvgDuration = avg(DurationMs),
    P95Duration = percentile(DurationMs, 95),
    ErrorCount = countif(ResultType == "Failed")
  by OperationName
| sort by RequestCount desc
"""

response = logs_client.query_workspace(
    workspace_id=workspace_id,
    query=kql_operations,
    timespan=timedelta(days=1)
)

print("=== Operations Summary ===")
for row in response.tables[0].rows:
    print(f"  {row[0]}: {row[1]} calls, Avg: {row[2]:.0f}ms, P95: {row[3]:.0f}ms, Errors: {row[4]}")

# KQL: Error analysis
kql_errors = """
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where ResultType == "Failed"
| where TimeGenerated > ago(24h)
| summarize ErrorCount = count() by ResultSignature, OperationName
| sort by ErrorCount desc
| take 10
"""

error_response = logs_client.query_workspace(
    workspace_id=workspace_id,
    query=kql_errors,
    timespan=timedelta(days=1)
)

print("\n=== Error Analysis ===")
for row in error_response.tables[0].rows:
    print(f"  {row[1]} - {row[0]}: {row[2]} errors")

# KQL: Token usage over time (for Azure OpenAI)
kql_tokens = """
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where Category == "RequestResponse"
| where TimeGenerated > ago(24h)
| extend promptTokens = toint(properties_s.promptTokens)
| extend completionTokens = toint(properties_s.completionTokens)
| summarize
    TotalPromptTokens = sum(promptTokens),
    TotalCompletionTokens = sum(completionTokens),
    TotalTokens = sum(promptTokens) + sum(completionTokens)
  by bin(TimeGenerated, 1h)
| sort by TimeGenerated asc
"""

token_response = logs_client.query_workspace(
    workspace_id=workspace_id,
    query=kql_tokens,
    timespan=timedelta(days=1)
)

print("\n=== Token Usage (Hourly) ===")
for row in token_response.tables[0].rows:
    print(f"  {row[0]}: Prompt={row[1]}, Completion={row[2]}, Total={row[3]}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;

var credential = new DefaultAzureCredential();
var logsClient = new LogsQueryClient(credential);

string workspaceId = "<your-workspace-id>";

// KQL: Top operations by count and average duration
string kqlOperations = @"
AzureDiagnostics
| where ResourceProvider == 'MICROSOFT.COGNITIVESERVICES'
| where TimeGenerated > ago(24h)
| summarize
    RequestCount = count(),
    AvgDuration = avg(DurationMs),
    P95Duration = percentile(DurationMs, 95),
    ErrorCount = countif(ResultType == 'Failed')
  by OperationName
| sort by RequestCount desc";

var operationsResponse = await logsClient.QueryWorkspaceAsync(
    workspaceId,
    kqlOperations,
    new QueryTimeRange(TimeSpan.FromDays(1))
);

Console.WriteLine("=== Operations Summary ===");
foreach (var row in operationsResponse.Value.Table.Rows)
{
    Console.WriteLine($"  {row["OperationName"]}: {row["RequestCount"]} calls, " +
        $"Avg: {row["AvgDuration"]:F0}ms, Errors: {row["ErrorCount"]}");
}

// KQL: Error analysis
string kqlErrors = @"
AzureDiagnostics
| where ResourceProvider == 'MICROSOFT.COGNITIVESERVICES'
| where ResultType == 'Failed'
| where TimeGenerated > ago(24h)
| summarize ErrorCount = count() by ResultSignature, OperationName
| sort by ErrorCount desc
| take 10";

var errorResponse = await logsClient.QueryWorkspaceAsync(
    workspaceId,
    kqlErrors,
    new QueryTimeRange(TimeSpan.FromDays(1))
);

Console.WriteLine("\n=== Error Analysis ===");
foreach (var row in errorResponse.Value.Table.Rows)
{
    Console.WriteLine($"  {row["OperationName"]} - {row["ResultSignature"]}: {row["ErrorCount"]} errors");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Get workspace ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group rg-ai102-challenge07 \
  --workspace-name law-ai102-monitor \
  --query customerId -o tsv)

# KQL: Operations summary
az monitor log-analytics query \
  --workspace $WORKSPACE_ID \
  --analytics-query "
    AzureDiagnostics
    | where ResourceProvider == 'MICROSOFT.COGNITIVESERVICES'
    | where TimeGenerated > ago(24h)
    | summarize
        RequestCount = count(),
        AvgDuration = avg(DurationMs),
        P95Duration = percentile(DurationMs, 95),
        ErrorCount = countif(ResultType == 'Failed')
      by OperationName
    | sort by RequestCount desc
  " --output table

# KQL: Errors by HTTP status code
az monitor log-analytics query \
  --workspace $WORKSPACE_ID \
  --analytics-query "
    AzureDiagnostics
    | where ResourceProvider == 'MICROSOFT.COGNITIVESERVICES'
    | where ResultType == 'Failed'
    | where TimeGenerated > ago(24h)
    | summarize count() by ResultSignature, OperationName
    | sort by count_ desc
    | take 10
  " --output table

# KQL: Latency percentiles
az monitor log-analytics query \
  --workspace $WORKSPACE_ID \
  --analytics-query "
    AzureDiagnostics
    | where ResourceProvider == 'MICROSOFT.COGNITIVESERVICES'
    | where TimeGenerated > ago(1h)
    | summarize
        P50 = percentile(DurationMs, 50),
        P90 = percentile(DurationMs, 90),
        P99 = percentile(DurationMs, 99)
      by bin(TimeGenerated, 5m)
    | sort by TimeGenerated asc
  " --output table
```

</TabItem>
</Tabs>

### Task 4: Create Alert Rule for High Latency

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.monitor import MonitorManagementClient
from azure.mgmt.monitor.models import (
    MetricAlertResource,
    MetricAlertSingleResourceMultipleMetricCriteria,
    MetricCriteria,
    MetricAlertAction
)

credential = DefaultAzureCredential()
subscription_id = "<your-subscription-id>"
monitor_client = MonitorManagementClient(credential, subscription_id)

resource_id = (
    f"/subscriptions/{subscription_id}/resourceGroups/rg-ai102-challenge07"
    f"/providers/Microsoft.CognitiveServices/accounts/ai-monitor-demo"
)

# Create metric alert for high latency (> 2000ms average)
alert = monitor_client.metric_alerts.create_or_update(
    resource_group_name="rg-ai102-challenge07",
    rule_name="high-latency-alert",
    parameters=MetricAlertResource(
        location="global",
        description="Alert when average latency exceeds 2000ms",
        severity=2,
        enabled=True,
        scopes=[resource_id],
        evaluation_frequency="PT5M",
        window_size="PT15M",
        criteria=MetricAlertSingleResourceMultipleMetricCriteria(
            all_of=[
                MetricCriteria(
                    name="HighLatency",
                    metric_name="Latency",
                    metric_namespace="Microsoft.CognitiveServices/accounts",
                    operator="GreaterThan",
                    threshold=2000,
                    time_aggregation="Average"
                )
            ]
        ),
        actions=[
            MetricAlertAction(
                action_group_id=(
                    f"/subscriptions/{subscription_id}/resourceGroups/rg-ai102-challenge07"
                    f"/providers/Microsoft.Insights/actionGroups/ai-ops-team"
                )
            )
        ]
    )
)
print(f"Alert rule created: {alert.name}")

# Create alert for high error rate (> 5% of total calls)
error_alert = monitor_client.metric_alerts.create_or_update(
    resource_group_name="rg-ai102-challenge07",
    rule_name="high-error-rate-alert",
    parameters=MetricAlertResource(
        location="global",
        description="Alert when error rate exceeds 5%",
        severity=1,
        enabled=True,
        scopes=[resource_id],
        evaluation_frequency="PT5M",
        window_size="PT5M",
        criteria=MetricAlertSingleResourceMultipleMetricCriteria(
            all_of=[
                MetricCriteria(
                    name="HighErrors",
                    metric_name="TotalErrors",
                    metric_namespace="Microsoft.CognitiveServices/accounts",
                    operator="GreaterThan",
                    threshold=10,
                    time_aggregation="Total"
                )
            ]
        ),
        actions=[]
    )
)
print(f"Error alert created: {error_alert.name}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.Monitor;
using Azure.ResourceManager.Monitor.Models;

var credential = new DefaultAzureCredential();
var armClient = new ArmClient(credential);

var subscription = await armClient.GetDefaultSubscriptionAsync();
var resourceGroup = await subscription.GetResourceGroups().GetAsync("rg-ai102-challenge07");

string aiResourceId = $"/subscriptions/{subscription.Data.SubscriptionId}" +
    "/resourceGroups/rg-ai102-challenge07" +
    "/providers/Microsoft.CognitiveServices/accounts/ai-monitor-demo";

// Create metric alert for high latency
var alertData = new MetricAlertData(
    Azure.Core.AzureLocation.Global,
    severity: 2,
    isEnabled: true,
    scopes: { aiResourceId },
    evaluationFrequency: TimeSpan.FromMinutes(5),
    windowSize: TimeSpan.FromMinutes(15),
    criteria: new MetricAlertSingleResourceMultipleMetricCriteria()
)
{
    Description = "Alert when average latency exceeds 2000ms"
};

var criteria = alertData.Criteria as MetricAlertSingleResourceMultipleMetricCriteria;
criteria!.AllOf.Add(new MetricCriteria(
    "HighLatency",
    "Latency",
    MetricCriteriaTimeAggregationType.Average,
    MetricCriteriaOperator.GreaterThan,
    2000));

var alertOp = await resourceGroup.Value
    .GetMetricAlerts()
    .CreateOrUpdateAsync(Azure.WaitUntil.Completed, "high-latency-alert", alertData);

Console.WriteLine($"Alert rule created: {alertOp.Value.Data.Name}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create action group for notifications
az monitor action-group create \
  --resource-group rg-ai102-challenge07 \
  --name "ai-ops-team" \
  --short-name "AIOps" \
  --action email ops-lead ops-lead@contoso.com

# Create metric alert for high latency (> 2000ms)
AI_RESOURCE_ID=$(az cognitiveservices account show \
  --name ai-monitor-demo \
  --resource-group rg-ai102-challenge07 \
  --query id -o tsv)

az monitor metrics alert create \
  --name "high-latency-alert" \
  --resource-group rg-ai102-challenge07 \
  --scopes $AI_RESOURCE_ID \
  --condition "avg Latency > 2000" \
  --window-size 15m \
  --evaluation-frequency 5m \
  --severity 2 \
  --description "Average latency exceeds 2000ms" \
  --action ai-ops-team

# Create alert for high error count
az monitor metrics alert create \
  --name "high-error-rate-alert" \
  --resource-group rg-ai102-challenge07 \
  --scopes $AI_RESOURCE_ID \
  --condition "total TotalErrors > 10" \
  --window-size 5m \
  --evaluation-frequency 5m \
  --severity 1 \
  --description "More than 10 errors in 5 minutes" \
  --action ai-ops-team

# Create alert for token consumption spike
az monitor metrics alert create \
  --name "token-spike-alert" \
  --resource-group rg-ai102-challenge07 \
  --scopes $AI_RESOURCE_ID \
  --condition "total TokenTransaction > 100000" \
  --window-size 1h \
  --evaluation-frequency 15m \
  --severity 3 \
  --description "Token consumption exceeds 100K in 1 hour"

# List all alerts
az monitor metrics alert list \
  --resource-group rg-ai102-challenge07 \
  --output table
```

</TabItem>
</Tabs>

## Expected Output

```text
=== Operations Summary ===
  TextAnalytics.Analyze: 1247 calls, Avg: 342ms, P95: 890ms, Errors: 3
  OpenAI.ChatCompletions: 856 calls, Avg: 1205ms, P95: 3400ms, Errors: 12
  TextAnalytics.DetectLanguage: 432 calls, Avg: 156ms, P95: 340ms, Errors: 0

=== Error Analysis ===
  OpenAI.ChatCompletions - 429: 8 errors
  OpenAI.ChatCompletions - 500: 4 errors
  TextAnalytics.Analyze - 400: 3 errors

=== Alert Rules ===
Name                    Severity  Enabled  Condition
high-latency-alert      2         True     avg Latency > 2000
high-error-rate-alert   1         True     total TotalErrors > 10
token-spike-alert       3         True     total TokenTransaction > 100000
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| No logs appearing in Log Analytics | KQL queries return empty results | Diagnostic settings not enabled or recent (ingestion delay 5-15 min) | Verify diagnostic settings exist; wait for ingestion delay |
| Metric alert never fires | No alert notifications despite high latency | Wrong metric namespace or aggregation type | Verify `Microsoft.CognitiveServices/accounts` namespace and correct aggregation |
| "No access" error on Log Analytics query | 403 when querying workspace | Missing `Log Analytics Reader` role on workspace | Assign `Log Analytics Reader` role to the querying identity |
| Incomplete metrics data | Some metrics show gaps | Resource SKU doesn't emit all metrics | Verify S0 tier; free tier has limited metrics emission |
| Alert fires too frequently | Alert noise/fatigue | Window size too small or threshold too low | Increase `window-size` or adjust threshold to reduce false positives |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "Which Azure Monitor metric tracks the total number of tokens processed by an Azure OpenAI resource?",
    options: [
      "TotalCalls",
      "ProcessedTokens",
      "TokenTransaction",
      "TokenUsage"
    ],
    correctAnswer: 2,
    explanation: "The TokenTransaction metric tracks the total number of tokens processed (both prompt and completion tokens) by Azure OpenAI and other Azure AI services that use token-based billing."
  },
  {
    question: "What is the typical ingestion delay for logs appearing in a Log Analytics workspace after diagnostic settings are enabled?",
    options: [
      "Immediate (< 1 second)",
      "5-15 minutes",
      "1-2 hours",
      "24 hours"
    ],
    correctAnswer: 1,
    explanation: "Log Analytics typically has a 5-15 minute ingestion delay from when logs are generated to when they appear in the workspace and can be queried via KQL."
  },
  {
    question: "Which KQL table contains diagnostic logs from Azure Cognitive Services resources?",
    options: [
      "CognitiveServicesLogs",
      "AIServicesMetrics",
      "AzureActivity",
      "AzureDiagnostics"
    ],
    correctAnswer: 3,
    explanation: "Azure Cognitive Services diagnostic logs are stored in the AzureDiagnostics table in Log Analytics. You filter by ResourceProvider == 'MICROSOFT.COGNITIVESERVICES' to isolate AI service logs."
  },
  {
    question: "When creating a metric alert rule, what does the 'window size' parameter control?",
    options: [
      "The time range over which the metric is aggregated for evaluation",
      "How long the alert stays active after firing",
      "The maximum number of notifications to send",
      "The delay before the alert rule becomes active"
    ],
    correctAnswer: 0,
    explanation: "The window size defines the lookback period over which the metric values are aggregated (e.g., average over 15 minutes). The evaluation frequency determines how often this window is checked."
  },
  {
    question: "Which log category must be enabled in diagnostic settings to capture API request and response details for Azure AI services?",
    options: [
      "Audit",
      "AllMetrics",
      "RequestResponse",
      "OperationalLogs"
    ],
    correctAnswer: 2,
    explanation: "The RequestResponse category captures detailed information about API requests and responses including status codes, duration, and for Azure OpenAI, token counts. The Audit category captures control-plane operations like key regeneration."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge07 --yes --no-wait
```

## Learn More

- [Monitor Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/diagnostic-logging)
- [Azure Monitor metrics for Cognitive Services](https://learn.microsoft.com/en-us/azure/ai-services/metrics)
- [KQL quick reference](https://learn.microsoft.com/en-us/kusto/query/kql-quick-reference)
- [Create metric alert rules in Azure Monitor](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-create-metric-alert-rule)
- [Log Analytics workspace overview](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/log-analytics-workspace-overview)
