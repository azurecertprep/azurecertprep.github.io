---
sidebar_position: 2
title: "Challenge 47: Telemetry collection and insights"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 47: Telemetry collection and insights

## Exam skills covered

- Configure collection of telemetry by using Application Insights, VM Insights, Container Insights, Azure Monitor for Storage, and Azure Monitor for Networks

## Scenario

Contoso Ltd operates a microservices architecture with components running on Azure VMs (legacy order service), Azure Kubernetes Service (payment and inventory services), and Azure App Service (web frontend). Each team monitors differently: the VM team checks RDP sessions, the AKS team has basic kubectl logs, and the App Service team uses no monitoring at all. The CTO wants standardized observability across all compute platforms with distributed tracing to track requests end-to-end.

## Prerequisites

- Azure subscription with Contributor access
- An Azure App Service web app
- An Azure VM (Linux or Windows)
- An AKS cluster with at least one deployed workload
- Azure CLI installed
- Log Analytics workspace

## Tasks

### Task 1: Configure Application Insights for a web app

```bash
# Create a Log Analytics workspace
az monitor log-analytics workspace create \
  --name law-contoso-observability \
  --resource-group rg-contoso-prod \
  --location eastus

LAW_ID=$(az monitor log-analytics workspace show \
  --name law-contoso-observability \
  --resource-group rg-contoso-prod \
  --query id -o tsv)

# Create Application Insights (workspace-based)
az monitor app-insights component create \
  --app ai-contoso-webapp \
  --resource-group rg-contoso-prod \
  --location eastus \
  --workspace $LAW_ID \
  --application-type web

# Get the instrumentation key and connection string
AI_CONNECTION_STRING=$(az monitor app-insights component show \
  --app ai-contoso-webapp \
  --resource-group rg-contoso-prod \
  --query connectionString -o tsv)

# Enable auto-instrumentation on App Service (no code changes needed)
az webapp config appsettings set \
  --name app-contoso-web \
  --resource-group rg-contoso-prod \
  --settings "APPLICATIONINSIGHTS_CONNECTION_STRING=$AI_CONNECTION_STRING" \
             "ApplicationInsightsAgent_EXTENSION_VERSION=~3" \
             "XDT_MicrosoftApplicationInsights_Mode=Recommended"

# Restart the app to enable auto-instrumentation
az webapp restart --name app-contoso-web --resource-group rg-contoso-prod
```

SDK-based instrumentation (for more control) in a .NET application:

```csharp
// Program.cs
using Microsoft.ApplicationInsights.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add Application Insights telemetry
builder.Services.AddApplicationInsightsTelemetry(new ApplicationInsightsServiceOptions
{
    ConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"],
    EnableAdaptiveSampling = true,
    EnableDependencyTrackingTelemetryModule = true,
    EnableRequestTrackingTelemetryModule = true
});

var app = builder.Build();
```

### Task 2: Enable VM Insights

```bash
# Enable VM Insights on an existing VM
az vm extension set \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor \
  --vm-name vm-contoso-orders \
  --resource-group rg-contoso-prod \
  --settings "{\"workspaceId\": \"$LAW_ID\"}"

# Create a data collection rule for VM Insights
az monitor data-collection rule create \
  --name dcr-vm-insights \
  --resource-group rg-contoso-prod \
  --location eastus \
  --data-flows '[{
    "streams": ["Microsoft-InsightsMetrics", "Microsoft-ServiceMap"],
    "destinations": ["law-contoso-observability"]
  }]' \
  --destinations "{\"logAnalytics\": [{\"workspaceResourceId\": \"$LAW_ID\", \"name\": \"law-contoso-observability\"}]}" \
  --data-sources "{\"performanceCounters\": [{\"streams\": [\"Microsoft-InsightsMetrics\"], \"samplingFrequencyInSeconds\": 60, \"counterSpecifiers\": [\"\\\\Processor(_Total)\\\\% Processor Time\", \"\\\\Memory\\\\Available Bytes\", \"\\\\LogicalDisk(_Total)\\\\% Free Space\"]}]}"

# Associate the data collection rule with the VM
DCR_ID=$(az monitor data-collection rule show \
  --name dcr-vm-insights \
  --resource-group rg-contoso-prod \
  --query id -o tsv)

az monitor data-collection rule association create \
  --name "vm-contoso-orders-association" \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/Microsoft.Compute/virtualMachines/vm-contoso-orders" \
  --rule-id $DCR_ID

# Enable VM Insights via the portal shortcut
# Azure Portal > VM > Monitoring > Insights > Enable
# This automatically installs the agent and creates the DCR
```

VM Insights provides:
- Performance tab: CPU, memory, disk IOPS, network
- Map tab: process dependencies and network connections
- Connection monitoring between VMs and external services

### Task 3: Enable Container Insights for AKS

```bash
# Enable monitoring add-on on existing AKS cluster
az aks enable-addons \
  --name aks-contoso-prod \
  --resource-group rg-contoso-prod \
  --addons monitoring \
  --workspace-resource-id $LAW_ID

# Verify the monitoring agent is running
az aks show \
  --name aks-contoso-prod \
  --resource-group rg-contoso-prod \
  --query "addonProfiles.omsagent.enabled"

# Enable Prometheus metrics collection (managed Prometheus)
az aks update \
  --name aks-contoso-prod \
  --resource-group rg-contoso-prod \
  --enable-azure-monitor-metrics

# Configure Container Insights to collect specific log types
# Create a ConfigMap for agent configuration
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: container-azm-ms-agentconfig
  namespace: kube-system
data:
  schema-version: v1
  config-version: v1
  log-data-collection-settings: |
    [log_collection_settings]
      [log_collection_settings.stdout]
        enabled = true
        exclude_namespaces = ["kube-system","gatekeeper-system"]
      [log_collection_settings.stderr]
        enabled = true
        exclude_namespaces = ["kube-system"]
      [log_collection_settings.env_var]
        enabled = false
  prometheus-data-collection-settings: |
    [prometheus_data_collection_settings.cluster]
      interval = "1m"
      monitor_kubernetes_pods = true
EOF
```

### Task 4: Configure custom metrics and events

```bash
# Send custom metrics via Application Insights SDK
# In application code (Node.js example):
```

```javascript
// telemetry.js
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setAutoCollectRequests(true)
  .setAutoCollectDependencies(true)
  .setAutoCollectExceptions(true)
  .start();

const client = appInsights.defaultClient;

// Track custom event
client.trackEvent({
  name: "OrderPlaced",
  properties: {
    customerId: order.customerId,
    region: order.region,
    paymentMethod: order.paymentMethod
  },
  measurements: {
    orderValue: order.total,
    itemCount: order.items.length
  }
});

// Track custom metric
client.trackMetric({
  name: "OrderProcessingTime",
  value: processingDurationMs,
  properties: {
    serviceVersion: process.env.APP_VERSION
  }
});

// Track dependency (external service call)
client.trackDependency({
  target: "payment-gateway",
  name: "ChargeCard",
  data: "POST /api/charge",
  duration: callDurationMs,
  resultCode: response.status,
  success: response.status === 200,
  dependencyTypeName: "HTTP"
});
```

### Task 5: Set up availability tests

```bash
# Create a standard URL ping test
az monitor app-insights web-test create \
  --name "contoso-web-availability" \
  --resource-group rg-contoso-prod \
  --defined-web-test-name "Homepage Health Check" \
  --location "us-east-1" \
  --location "eu-west-1" \
  --location "ap-southeast-1" \
  --kind "ping" \
  --frequency 300 \
  --timeout 120 \
  --web-test "<WebTest Name=\"Homepage\" Id=\"test-001\" Enabled=\"True\" Timeout=\"120\" xmlns=\"http://microsoft.com/schemas/VisualStudio/TeamTest/2010\"><Items><Request Method=\"GET\" Version=\"1.1\" Url=\"https://app-contoso-web.azurewebsites.net/health\" ThinkTime=\"0\" Timeout=\"120\" ParseDependentRequests=\"False\" FollowRedirects=\"True\" RecordResult=\"True\" Cache=\"False\" ResponseTimeGoal=\"0\" Encoding=\"utf-8\" ExpectedHttpStatusCode=\"200\" /></Items></WebTest>"

# Create an alert for availability test failures
az monitor metrics alert create \
  --name "alert-availability-failed" \
  --resource-group rg-contoso-prod \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/components/ai-contoso-webapp" \
  --condition "avg availabilityResults/availabilityPercentage < 99" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/actionGroups/ag-ops-team" \
  --description "Availability dropped below 99%"
```

### Task 6: Configure sampling to manage costs

```bash
# Configure adaptive sampling in Application Insights
# For auto-instrumented App Service, set via app settings:
az webapp config appsettings set \
  --name app-contoso-web \
  --resource-group rg-contoso-prod \
  --settings "MicrosoftAppInsights_AdaptiveSamplingTelemetryProcessor_MaxTelemetryItemsPerSecond=5"
```

SDK-based sampling configuration:

```csharp
// Program.cs - Configure sampling
builder.Services.AddApplicationInsightsTelemetry();
builder.Services.Configure<TelemetryConfiguration>(config =>
{
    var builder = config.DefaultTelemetrySink.TelemetryProcessorChainBuilder;

    // Adaptive sampling: target 5 items per second
    builder.UseAdaptiveSampling(maxTelemetryItemsPerSecond: 5);

    // Fixed-rate sampling: keep 25% of telemetry
    // builder.UseSampling(25.0);

    // Exclude certain telemetry types from sampling
    builder.UseAdaptiveSampling(maxTelemetryItemsPerSecond: 5,
        excludedTypes: "Event;Exception");

    builder.Build();
});
```

Ingestion sampling (server-side, applied to all data regardless of SDK settings):

```bash
# Set daily cap to control costs
az monitor app-insights component update \
  --app ai-contoso-webapp \
  --resource-group rg-contoso-prod \
  --ingestion-access Enabled \
  --cap 5  # 5 GB daily cap
```

### Task 7: Implement distributed tracing correlation

Ensure trace correlation across services:

```bash
# Application Insights automatically correlates requests using W3C Trace Context
# Verify correlation is working by checking the Application Map:
# Azure Portal > Application Insights > Application Map

# For custom HTTP calls, ensure headers are propagated:
# traceparent: 00-<trace-id>-<span-id>-<trace-flags>
# tracestate: (optional vendor-specific state)
```

Configure correlation in microservices:

```yaml
# For AKS services, deploy with environment variables for App Insights
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    spec:
      containers:
        - name: payment-service
          image: contoso.azurecr.io/payment-service:latest
          env:
            - name: APPLICATIONINSIGHTS_CONNECTION_STRING
              valueFrom:
                secretKeyRef:
                  name: app-insights-secret
                  key: connection-string
            - name: OTEL_SERVICE_NAME
              value: "payment-service"
```

Verify end-to-end tracing:

```
// KQL: Find a request and trace it across services
requests
| where timestamp > ago(1h)
| where name == "POST /api/orders"
| project operation_Id, timestamp, duration, resultCode
| take 1
| join kind=inner (
    dependencies
    | project operation_Id, target, name, duration, success
) on operation_Id
| project-away operation_Id1
```

## Break and fix

### Break scenario 1: Container Insights shows no data for new namespace

A new microservice is deployed to a new Kubernetes namespace, but Container Insights shows no logs or metrics.

**Cause:** The Container Insights ConfigMap excludes certain namespaces from log collection, or the new namespace was added to the exclusion list.

**Diagnosis:**

```bash
kubectl get configmap container-azm-ms-agentconfig -n kube-system -o yaml
```


<details>
<summary>Solution</summary>

**Fix:** Update the ConfigMap to include the new namespace:

```bash
kubectl edit configmap container-azm-ms-agentconfig -n kube-system
# Remove the namespace from exclude_namespaces list
# Restart the omsagent pods
kubectl rollout restart daemonset omsagent -n kube-system
```

</details>

### Break scenario 2: Distributed tracing shows gaps between services

The Application Map shows all services but trace correlation breaks between the frontend and the payment service.

**Cause:** The payment service uses a custom HTTP client that does not propagate W3C trace context headers.


<details>
<summary>Solution</summary>

**Fix:** Ensure the HTTP client library propagates `traceparent` and `tracestate` headers. In Node.js with Application Insights:

```javascript
// The Application Insights SDK auto-patches common HTTP libraries
// If using a custom client, manually propagate:
const { context, propagation } = require('@opentelemetry/api');

function makeDownstreamCall(url, payload) {
  const headers = {};
  propagation.inject(context.active(), headers);

  return fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Contoso has a .NET web app on App Service. They want Application Insights telemetry without modifying application code. What should they configure?",
    options: [
      "Install the Application Insights NuGet package and add SDK initialization code",
      "Enable auto-instrumentation by setting the 'ApplicationInsightsAgent_EXTENSION_VERSION' app setting",
      "Deploy an Application Insights agent as a sidecar container",
      "Configure a data collection rule with Azure Monitor Agent"
    ],
    correctIndex: 1,
    explanation: "App Service auto-instrumentation (codeless attach) enables Application Insights by setting the ApplicationInsightsAgent_EXTENSION_VERSION app setting to ~3 along with the connection string. No code changes or NuGet packages are required. This works for .NET, Java, Node.js, and Python applications on App Service."
  },
  {
    question: "Contoso runs services on VMs, AKS, and App Service. Which monitoring solution provides process-level dependency mapping showing which processes communicate with which external services on the VM?",
    options: [
      "Application Insights",
      "Container Insights",
      "VM Insights (Map feature)",
      "Network Watcher"
    ],
    correctIndex: 2,
    explanation: "VM Insights Map feature discovers running processes on the VM and their network connections, showing which processes communicate with external services, databases, and other VMs. This provides a dependency map without requiring application code changes."
  },
  {
    question: "Application Insights is generating 50 GB of telemetry daily, resulting in high costs. Which approach reduces costs while preserving visibility into errors and exceptions?",
    options: [
      "Disable Application Insights entirely",
      "Configure adaptive sampling that excludes exceptions from sampling",
      "Set a daily cap of 1 GB and lose all data above the cap",
      "Switch from workspace-based to classic Application Insights"
    ],
    correctIndex: 1,
    explanation: "Adaptive sampling reduces telemetry volume by dynamically adjusting the sampling rate while maintaining statistical accuracy. By excluding exceptions from sampling, all errors are preserved for debugging while routine successful requests are sampled. This is more effective than a daily cap, which drops all telemetry after the limit."
  },
  {
    question: "A request to the Contoso web app calls three backend microservices. In Application Insights, the end-to-end transaction view shows only the initial request without the downstream calls. What is the most likely cause?",
    options: [
      "The backend services are not instrumented with Application Insights",
      "The services use different Application Insights resources",
      "The trace context headers are not propagated between services",
      "Sampling is filtering out dependency calls"
    ],
    correctIndex: 2,
    explanation: "Distributed tracing requires W3C trace context headers (traceparent) to be propagated between services. If a service does not forward these headers in outgoing HTTP calls, the downstream telemetry cannot be correlated with the parent request. All services should be instrumented AND trace context must flow through HTTP headers."
  }
]} />

## Cleanup

```bash
# Remove Application Insights
az monitor app-insights component delete \
  --app ai-contoso-webapp \
  --resource-group rg-contoso-prod

# Disable VM Insights agent
az vm extension delete \
  --name AzureMonitorLinuxAgent \
  --vm-name vm-contoso-orders \
  --resource-group rg-contoso-prod

# Disable Container Insights
az aks disable-addons \
  --name aks-contoso-prod \
  --resource-group rg-contoso-prod \
  --addons monitoring

# Delete data collection rules
az monitor data-collection rule delete \
  --name dcr-vm-insights \
  --resource-group rg-contoso-prod

# Delete Log Analytics workspace
az monitor log-analytics workspace delete \
  --name law-contoso-observability \
  --resource-group rg-contoso-prod \
  --yes
```
