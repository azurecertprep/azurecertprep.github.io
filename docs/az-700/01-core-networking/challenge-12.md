---
sidebar_position: 12
title: "Challenge 12: Azure Monitor for Networks & Topology"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 12: Azure Monitor for networks & topology

:::info Estimated time and cost

**90-120 minutes** | **~$1-3/hour** (VMs for Connection Monitor agents) | **Exam weight: 10-15%**

:::

## Scenario

Contoso's NOC team needs end-to-end visibility into their Azure network. They must monitor connectivity between VMs and services across regions, set up alerts for network health degradation, and maintain a live topology view of their network resources. The team will deploy Connection Monitor to validate multi-hop paths, enable diagnostic logging across network resources, query network data with KQL, and configure proactive alerting for connectivity failures.

**Monitoring topology:**

```
Source VM (East US)
    |
    ├── TCP test → Load Balancer (East US) → Backend VMs
    ├── HTTP test → Web App endpoint
    └── ICMP test → VM in West US
            |
All results → Log Analytics Workspace
            |
    Alerts → Action Group (NOC email)
```

## Learning objectives

After completing this challenge you will be able to:

- Create and configure Connection Monitor with multi-protocol test groups
- Add endpoints and test configurations to an existing Connection Monitor
- Enable diagnostic settings for NSGs, VPN Gateways, and Load Balancers
- Query network monitoring data using KQL in Log Analytics
- Navigate Azure Monitor Network Insights for topology visualization
- Create metric alerts for connection monitor failures and latency breaches

## Prerequisites

- An Azure subscription with Contributor access
- Azure CLI installed and authenticated (`az login`)
- Network Watcher enabled in the target regions
- At least two VMs in different subnets (source VMs must have the Azure Monitor Agent installed)
- A Log Analytics workspace

## Key concepts for AZ-700

| Concept | Detail |
|---------|--------|
| Connection Monitor v2 | Current version; replaces both Network Performance Monitor and Connection Monitor classic |
| Azure Monitor Agent | Required on source VMs for Connection Monitor (replaces legacy Log Analytics agent) |
| Test frequency | Supported values: 30s, 60s, 300s, 600s, 1800s |
| Supported protocols | TCP, HTTP, ICMP |
| Network Insights | Zero-configuration dashboard with automatic topology discovery |
| NSG flow logs | Sent to Storage Account; require Traffic Analytics to reach Log Analytics |
| Diagnostic logs | VPN Gateway, Load Balancer, and Application Gateway logs go directly to Log Analytics |
| NWConnectionMonitorTestResult | Log Analytics table storing Connection Monitor test results |

---

## Task 1: Create a Connection Monitor with initial test group

Create a Connection Monitor that tests TCP connectivity from a source VM to a load balancer frontend IP.

### Step 1: Set up variables

```bash
RESOURCE_GROUP="rg-network-monitoring"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-netmon"
CM_NAME="cm-contoso-multihop"
SOURCE_VM_NAME="vm-source-eastus"
SOURCE_VM_ID=$(az vm show \
    --resource-group $RESOURCE_GROUP \
    --name $SOURCE_VM_NAME \
    --query "id" \
    --output tsv)
WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --resource-group $RESOURCE_GROUP \
    --workspace-name $WORKSPACE_NAME \
    --query "id" \
    --output tsv)
```

### Step 2: Create the Connection Monitor with a TCP test

```bash
az network watcher connection-monitor create \
    --name $CM_NAME \
    --endpoint-source-name "src-vm-eastus" \
    --endpoint-source-resource-id $SOURCE_VM_ID \
    --endpoint-dest-name "dest-lb-frontend" \
    --endpoint-dest-address "10.0.2.4" \
    --test-config-name "tcp-config-443" \
    --protocol Tcp \
    --tcp-port 443 \
    --frequency 60 \
    --threshold-failed-percent 10 \
    --threshold-round-trip-time 100 \
    --test-group-name "tg-vm-to-lb" \
    --workspace-ids $WORKSPACE_ID \
    --location $LOCATION
```

:::tip Exam note

The `az network watcher connection-monitor create` command requires `--endpoint-source-name`, `--endpoint-source-resource-id`, `--endpoint-dest-name`, and `--test-config-name` as mandatory parameters for Connection Monitor v2. The `--location` parameter specifies the Network Watcher region.

:::

### Step 3: Verify the Connection Monitor was created

```bash
az network watcher connection-monitor show \
    --name $CM_NAME \
    --location $LOCATION \
    --query "{name:name, provisioningState:provisioningState}" \
    --output table
```

Expected output: `provisioningState` should be `Succeeded`.

---

## Task 2: Add endpoints and test configurations for multiple protocols

Expand the Connection Monitor with HTTP and ICMP tests targeting different destinations.

### Step 1: Add an external HTTP endpoint

```bash
az network watcher connection-monitor endpoint add \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --name "dest-web-app" \
    --address "contoso-webapp.azurewebsites.net" \
    --dest-test-groups "tg-vm-to-lb" \
    --type ExternalAddress
```

### Step 2: Add a cross-region VM endpoint

```bash
DEST_VM_WESTUS_ID=$(az vm show \
    --resource-group $RESOURCE_GROUP \
    --name "vm-dest-westus" \
    --query "id" \
    --output tsv)

az network watcher connection-monitor endpoint add \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --name "dest-vm-westus" \
    --resource-id $DEST_VM_WESTUS_ID \
    --dest-test-groups "tg-crossregion" \
    --type AzureVM
```

### Step 3: Add an HTTP test configuration

```bash
az network watcher connection-monitor test-configuration add \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --name "http-config-443" \
    --protocol Http \
    --http-port 443 \
    --http-method Get \
    --http-path "/" \
    --http-valid-status-codes "2xx 301 302" \
    --frequency 300 \
    --threshold-failed-percent 20 \
    --threshold-round-trip-time 200 \
    --test-groups "tg-vm-to-lb"
```

### Step 4: Add an ICMP test configuration

```bash
az network watcher connection-monitor test-configuration add \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --name "icmp-config-crossregion" \
    --protocol Icmp \
    --frequency 60 \
    --threshold-round-trip-time 150 \
    --test-groups "tg-crossregion"
```

### Step 5: Add a test group combining cross-region endpoints

```bash
az network watcher connection-monitor test-group add \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --name "tg-crossregion" \
    --endpoint-source-name "src-vm-eastus" \
    --endpoint-dest-name "dest-vm-westus" \
    --test-config-name "icmp-config-crossregion"
```

### Step 6: List all test configurations to verify

```bash
az network watcher connection-monitor test-configuration list \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --output table
```

:::note Protocol selection guidance

- **TCP**: Use for testing connectivity to specific ports (databases, APIs, load balancers). Most reliable for verifying end-to-end reachability.
- **HTTP**: Use for web endpoints where you need to validate response codes and paths. Supports HTTPS preference.
- **ICMP**: Use for latency measurement and basic reachability. Some Azure resources block ICMP (PaaS services, NSG rules).

:::

---

## Task 3: Enable diagnostic logs for network resources

Configure diagnostic settings to send logs from NSGs, VPN Gateways, and Load Balancers to Log Analytics.

### Step 1: Get the Log Analytics workspace ID

```bash
WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --resource-group $RESOURCE_GROUP \
    --workspace-name $WORKSPACE_NAME \
    --query "id" \
    --output tsv)
```

### Step 2: Enable diagnostic settings for the Load Balancer

```bash
LB_ID=$(az network lb show \
    --resource-group $RESOURCE_GROUP \
    --name "lb-contoso-web" \
    --query "id" \
    --output tsv)

az monitor diagnostic-settings create \
    --name "diag-lb-to-law" \
    --resource $LB_ID \
    --workspace $WORKSPACE_ID \
    --logs '[{"category":"LoadBalancerAlertEvent","enabled":true},{"category":"LoadBalancerProbeHealthStatus","enabled":true}]' \
    --metrics '[{"category":"AllMetrics","enabled":true}]'
```

### Step 3: Enable diagnostic settings for the VPN Gateway

```bash
VPNGW_ID=$(az network vnet-gateway show \
    --resource-group $RESOURCE_GROUP \
    --name "vpngw-contoso-hub" \
    --query "id" \
    --output tsv)

az monitor diagnostic-settings create \
    --name "diag-vpngw-to-law" \
    --resource $VPNGW_ID \
    --workspace $WORKSPACE_ID \
    --logs '[{"category":"GatewayDiagnosticLog","enabled":true},{"category":"TunnelDiagnosticLog","enabled":true},{"category":"RouteDiagnosticLog","enabled":true},{"category":"IKEDiagnosticLog","enabled":true}]' \
    --metrics '[{"category":"AllMetrics","enabled":true}]'
```

### Step 4: Enable NSG flow logs (sent to Storage Account with Traffic Analytics)

```bash
STORAGE_ID=$(az storage account show \
    --resource-group $RESOURCE_GROUP \
    --name "stcontosoflowlogs" \
    --query "id" \
    --output tsv)

NSG_ID=$(az network nsg show \
    --resource-group $RESOURCE_GROUP \
    --name "nsg-workload-subnet" \
    --query "id" \
    --output tsv)

az network watcher flow-log create \
    --resource-group $RESOURCE_GROUP \
    --name "fl-nsg-workload" \
    --nsg $NSG_ID \
    --storage-account $STORAGE_ID \
    --workspace $WORKSPACE_ID \
    --enabled true \
    --traffic-analytics true \
    --interval 10 \
    --location $LOCATION
```

:::caution NSG flow logs vs diagnostic settings

NSG flow logs are NOT sent directly to Log Analytics. They are stored in a Storage Account. To query flow data in Log Analytics, you must enable Traffic Analytics, which processes the flow logs and writes summarized data to the `AzureNetworkAnalytics_CL` table. The `--traffic-analytics true` flag and `--workspace` parameter enable this pipeline.

:::

### Step 5: Verify diagnostic settings are active

```bash
az monitor diagnostic-settings list \
    --resource $LB_ID \
    --output table
```

---

## Task 4: Query network logs with KQL in Log Analytics

Use Kusto Query Language to analyze Connection Monitor results and network analytics data.

### Step 1: Query Connection Monitor test results

Open the Log Analytics workspace in the Azure portal and run the following KQL queries. These can also be executed via the Azure CLI or REST API.

**View recent Connection Monitor test results:**

```text
NWConnectionMonitorTestResult
| where TimeGenerated > ago(1h)
| project TimeGenerated, ConnectionMonitorResourceId, TestGroupName,
    SourceName, DestinationName, TestConfigurationName,
    TestResult, ChecksFailed, ChecksTotal,
    AvgRoundTripTimeMs, MaxRoundTripTimeMs
| order by TimeGenerated desc
| take 50
```

### Step 2: Identify failing tests

```text
NWConnectionMonitorTestResult
| where TimeGenerated > ago(24h)
| where TestResult == "Fail"
| summarize FailureCount = count(),
    AvgLatency = avg(AvgRoundTripTimeMs),
    LastFailure = max(TimeGenerated)
    by SourceName, DestinationName, TestConfigurationName
| order by FailureCount desc
```

### Step 3: Monitor latency trends

```text
NWConnectionMonitorTestResult
| where TimeGenerated > ago(7d)
| where TestGroupName == "tg-crossregion"
| summarize P50Latency = percentile(AvgRoundTripTimeMs, 50),
    P95Latency = percentile(AvgRoundTripTimeMs, 95),
    P99Latency = percentile(AvgRoundTripTimeMs, 99)
    by bin(TimeGenerated, 1h)
| render timechart
```

### Step 4: Query Traffic Analytics data (from NSG flow logs)

```text
AzureNetworkAnalytics_CL
| where TimeGenerated > ago(1h)
| where SubType_s == "FlowLog"
| summarize TotalFlows = count(),
    AllowedFlows = countif(FlowStatus_s == "A"),
    DeniedFlows = countif(FlowStatus_s == "D")
    by NSGRule_s, bin(TimeGenerated, 5m)
| order by DeniedFlows desc
```

### Step 5: Find top talkers across NSG flow data

```text
AzureNetworkAnalytics_CL
| where TimeGenerated > ago(1h)
| where SubType_s == "FlowLog"
| where FlowStatus_s == "A"
| summarize BytesSent = sum(OutboundBytes_d),
    BytesReceived = sum(InboundBytes_d),
    FlowCount = count()
    by SrcIP_s, DestIP_s, DestPort_d
| top 10 by BytesSent desc
```

:::tip Exam note

For the AZ-700 exam, know the key Log Analytics tables for network monitoring:
- `NWConnectionMonitorTestResult` -- Connection Monitor test outcomes
- `NWConnectionMonitorPathResult` -- Hop-by-hop path data
- `AzureNetworkAnalytics_CL` -- Traffic Analytics from NSG flow logs
- `AzureDiagnostics` -- VPN Gateway, Load Balancer, and Application Gateway logs (when not using resource-specific tables)

:::

---

## Task 5: View network topology in Azure Monitor Network Insights

Network Insights provides a zero-configuration topology view that automatically discovers all network resources in your subscriptions.

### Step 1: Access Network Insights

Network Insights is accessed through the Azure portal:

1. Navigate to **Azure Monitor** in the portal
2. Select **Networks** under the Insights section
3. The dashboard loads automatically with no additional configuration

### Step 2: Explore the topology view

The Topology tab displays an interactive map of your network resources showing:

- Virtual networks and their peering relationships
- Subnets and connected resources (VMs, NICs, NSGs)
- Load balancers and backend pools
- VPN/ExpressRoute gateways and connections
- Network security group associations

### Step 3: Review connectivity status

The Connectivity tab in Network Insights aggregates Connection Monitor data to show:

- Overall health status of all monitored paths
- Tests failing or degraded
- Latency trends across all test groups

### Step 4: Inspect resource health metrics

Use the portal to drill into specific resource types:

1. Click on any resource in the topology view
2. Review associated metrics (throughput, packet drops, connection counts)
3. Access diagnostic logs directly from the resource card

### Step 5: Generate topology programmatically (for automation)

```bash
az network watcher show-topology \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --query "resources[].{Name:name, Type:id}" \
    --output table
```

:::note Network Insights capabilities

Network Insights requires no agent installation or additional configuration. It automatically discovers resources across all subscriptions you have access to. However, Connection Monitor data only appears after you configure Connection Monitor tests (as done in Tasks 1-2). The topology view refreshes approximately every 5 minutes.

:::

---

## Task 6: Create alerts for connection monitor failures

Configure metric alerts that notify the NOC team when connectivity degrades or latency exceeds thresholds.

### Step 1: Create an action group for NOC notifications

```bash
az monitor action-group create \
    --resource-group $RESOURCE_GROUP \
    --name "ag-noc-alerts" \
    --short-name "NOC" \
    --action email noc-team noc@contoso.com
```

### Step 2: Create an alert for Connection Monitor check failures

```bash
CM_RESOURCE_ID=$(az network watcher connection-monitor show \
    --name $CM_NAME \
    --location $LOCATION \
    --query "id" \
    --output tsv)

az monitor metrics alert create \
    --name "alert-conn-monitor-failures" \
    --resource-group $RESOURCE_GROUP \
    --scopes $CM_RESOURCE_ID \
    --condition "avg ChecksFailedPercent > 50" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --severity 1 \
    --action "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Insights/actionGroups/ag-noc-alerts" \
    --description "Connection Monitor checks failing above 50 percent threshold"
```

### Step 3: Create an alert for high latency

```bash
az monitor metrics alert create \
    --name "alert-conn-monitor-latency" \
    --resource-group $RESOURCE_GROUP \
    --scopes $CM_RESOURCE_ID \
    --condition "avg RoundTripTimeMs > 200" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --severity 2 \
    --action "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Insights/actionGroups/ag-noc-alerts" \
    --description "Connection Monitor average latency exceeding 200ms"
```

### Step 4: Create an alert for test reachability (complete failure)

```bash
az monitor metrics alert create \
    --name "alert-conn-monitor-unreachable" \
    --resource-group $RESOURCE_GROUP \
    --scopes $CM_RESOURCE_ID \
    --condition "max TestResult < 1" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --severity 0 \
    --action "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Insights/actionGroups/ag-noc-alerts" \
    --description "Connection Monitor destination unreachable - critical alert"
```

### Step 5: Verify alerts are created

```bash
az monitor metrics alert list \
    --resource-group $RESOURCE_GROUP \
    --output table
```

:::tip Exam note

Connection Monitor exposes two key metrics for alerting:
- `ChecksFailedPercent` -- Percentage of checks that failed in the evaluation window
- `RoundTripTimeMs` -- Average round-trip time in milliseconds

Use `--window-size` to define the aggregation period and `--evaluation-frequency` to control how often the rule is evaluated. A window of 5m with evaluation frequency of 1m means the alert checks every minute using data from the last 5 minutes.

:::

---

## Break and fix scenarios

These scenarios represent common misconfigurations encountered in production and on the exam.

### Scenario 1: Connection Monitor shows "Unreachable" but traffic works

**Symptom:** Connection Monitor reports all tests as failed with status "Unreachable", yet you can successfully SSH or RDP to the destination VM and confirm network traffic flows normally.

**Root cause:** The Azure Monitor Agent (or legacy Log Analytics agent) is not installed on the source VM. Connection Monitor requires an agent on the source endpoint to execute tests.

**Diagnosis:**

```bash
az vm extension list \
    --resource-group $RESOURCE_GROUP \
    --vm-name $SOURCE_VM_NAME \
    --query "[?contains(name, 'AzureMonitor') || contains(name, 'MicrosoftMonitoring')].{Name:name, State:provisioningState}" \
    --output table
```

If no monitoring extension appears, the agent is missing.

**Fix:**

```bash
az vm extension set \
    --resource-group $RESOURCE_GROUP \
    --vm-name $SOURCE_VM_NAME \
    --name AzureMonitorLinuxAgent \
    --publisher Microsoft.Azure.Monitor \
    --enable-auto-upgrade true
```

For Windows VMs, use `AzureMonitorWindowsAgent` as the extension name.

### Scenario 2: Log Analytics shows no network data

**Symptom:** You navigate to Log Analytics and query `AzureDiagnostics` or `NWConnectionMonitorTestResult` but get zero results even after waiting 30 minutes.

**Root cause:** Diagnostic settings were not configured on the network resources, or the Connection Monitor was not configured with a workspace output.

**Diagnosis:**

```bash
# Check if diagnostic settings exist for the Load Balancer
az monitor diagnostic-settings list \
    --resource $LB_ID \
    --output table

# Check Connection Monitor workspace output
az network watcher connection-monitor show \
    --name $CM_NAME \
    --location $LOCATION \
    --query "outputs"
```

**Fix:** Create the diagnostic settings (see Task 3) or add a workspace output to the Connection Monitor:

```bash
az network watcher connection-monitor output add \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --type Workspace \
    --workspace-id $WORKSPACE_ID
```

### Scenario 3: Alert never fires despite connectivity issues

**Symptom:** Connectivity tests show failures in the Connection Monitor dashboard, but the configured alert never triggers.

**Root cause:** The alert threshold is set too high (for example, `ChecksFailedPercent > 95` when actual failures are 60%), or the evaluation window is too large relative to the failure duration.

**Diagnosis:**

```bash
az monitor metrics alert show \
    --name "alert-conn-monitor-failures" \
    --resource-group $RESOURCE_GROUP \
    --query "{condition:criteria.allOf[0], windowSize:windowSize, frequency:evaluationFrequency}"
```

**Fix:** Lower the threshold and reduce the window size:

```bash
az monitor metrics alert update \
    --name "alert-conn-monitor-failures" \
    --resource-group $RESOURCE_GROUP \
    --condition "avg ChecksFailedPercent > 20" \
    --window-size 5m \
    --evaluation-frequency 1m
```

---

## Cleanup

Remove all resources created in this challenge:

```bash
az group delete \
    --name $RESOURCE_GROUP \
    --yes \
    --no-wait
```

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-12-q1",
    question: "A Connection Monitor test shows 'Unreachable' for all destinations, but you can ping the destination from the source VM manually. What is the most likely cause?",
    options: [
      "The NSG on the destination blocks Connection Monitor traffic specifically",
      "The Azure Monitor Agent is not installed on the source VM",
      "The Connection Monitor has exceeded its test quota",
      "The destination VM does not have a public IP address"
    ],
    correctIndex: 1,
    explanation: "Connection Monitor requires the Azure Monitor Agent (or legacy Log Analytics agent) installed on source VMs to execute connectivity tests. Without the agent, the Connection Monitor cannot initiate tests from the source, resulting in 'Unreachable' status even when manual connectivity works fine."
  },
  {
    id: "az700-12-q2",
    question: "You configure NSG flow logs and expect to query them in Log Analytics. After 2 hours, the AzureNetworkAnalytics_CL table is empty. What is the most likely missing configuration?",
    options: [
      "Diagnostic settings must be created on the NSG resource",
      "Traffic Analytics must be enabled on the flow log configuration",
      "The NSG must have at least one deny rule to generate flow data",
      "Flow logs require the Azure Monitor Agent on all VMs in the subnet"
    ],
    correctIndex: 1,
    explanation: "NSG flow logs are written to a Storage Account, not directly to Log Analytics. To get flow data into Log Analytics, you must enable Traffic Analytics on the flow log configuration. Traffic Analytics processes the raw flow logs and writes summarized data to the AzureNetworkAnalytics_CL table in the specified workspace."
  },
  {
    id: "az700-12-q3",
    question: "Which Log Analytics table contains hop-by-hop path data showing the route taken between Connection Monitor source and destination endpoints?",
    options: [
      "NWConnectionMonitorTestResult",
      "NWConnectionMonitorPathResult",
      "AzureNetworkAnalytics_CL",
      "AzureDiagnostics"
    ],
    correctIndex: 1,
    explanation: "NWConnectionMonitorPathResult contains the hop-by-hop path trace data showing each intermediate hop between source and destination. NWConnectionMonitorTestResult contains the overall pass/fail status and latency metrics. AzureNetworkAnalytics_CL contains Traffic Analytics data from NSG flow logs."
  },
  {
    id: "az700-12-q4",
    question: "You need to alert the NOC team when more than 30 percent of Connection Monitor checks fail over a 5-minute window, evaluated every minute. Which az CLI parameters achieve this?",
    options: [
      "--condition 'avg ChecksFailedPercent > 30' --window-size 5m --evaluation-frequency 1m",
      "--condition 'total ChecksFailed > 30' --window-size 1m --evaluation-frequency 5m",
      "--condition 'count ChecksFailedPercent > 0.30' --window-size 5m --evaluation-frequency 1m",
      "--condition 'max ChecksFailedPercent > 30' --window-size 1m --evaluation-frequency 1m"
    ],
    correctIndex: 0,
    explanation: "The correct condition uses 'avg ChecksFailedPercent > 30' with --window-size 5m (aggregation period) and --evaluation-frequency 1m (how often the rule checks). ChecksFailedPercent is a percentage metric (0-100), so 30 means 30 percent. The avg aggregation over 5 minutes smooths out transient blips."
  },
  {
    id: "az700-12-q5",
    question: "What is required for Azure Monitor Network Insights to display network topology?",
    options: [
      "Connection Monitor must be configured with at least one test group",
      "The Azure Monitor Agent must be installed on all VMs in the subscription",
      "No additional configuration is required; it automatically discovers network resources",
      "Diagnostic settings must be enabled on all virtual networks"
    ],
    correctIndex: 2,
    explanation: "Azure Monitor Network Insights is a zero-configuration dashboard that automatically discovers and displays all network resources (VNets, subnets, peerings, gateways, load balancers) across subscriptions you have access to. No agent installation or diagnostic settings are required for the topology view. However, Connection Monitor must be configured separately for connectivity monitoring data to appear in the Connectivity tab."
  },
  {
    id: "az700-12-q6",
    question: "You create a Connection Monitor with --frequency 60 and --threshold-round-trip-time 100. What do these parameters control?",
    options: [
      "Tests run every 60 minutes and alert if latency exceeds 100 seconds",
      "Tests run every 60 seconds and the test evaluates as failed if round-trip time exceeds 100 milliseconds",
      "Tests run 60 times per hour and timeout after 100 milliseconds",
      "The monitor checks 60 endpoints and allows 100ms jitter"
    ],
    correctIndex: 1,
    explanation: "The --frequency parameter sets the test interval in seconds (60 means one test every 60 seconds). The --threshold-round-trip-time sets the maximum acceptable round-trip time in milliseconds. If the measured RTT exceeds this threshold, the individual check is marked as failed and contributes to the ChecksFailedPercent metric."
  }
]} />

---

## Additional resources

- [Connection Monitor overview](https://learn.microsoft.com/azure/network-watcher/connection-monitor-overview)
- [Create a Connection Monitor - Azure CLI](https://learn.microsoft.com/azure/network-watcher/connection-monitor-create-using-cli)
- [Azure Monitor Network Insights](https://learn.microsoft.com/azure/network-watcher/network-insights-overview)
- [NSG flow logs with Traffic Analytics](https://learn.microsoft.com/azure/network-watcher/traffic-analytics)
- [Monitor VPN Gateway with Azure Monitor](https://learn.microsoft.com/azure/vpn-gateway/monitor-vpn-gateway)
- [KQL quick reference](https://learn.microsoft.com/azure/data-explorer/kql-quick-reference)
