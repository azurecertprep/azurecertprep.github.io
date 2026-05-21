---
sidebar_position: 1
title: "Challenge 14: Azure Monitor & Alerts"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 14: Azure Monitor & alerts

:::info Estimated Time and Cost

**60 minutes** | **Estimated cost**: ~$0.10 | **Exam Weight: 10–15%**

:::

## Scenario

Contoso needs observability across their Azure environment. The CTO's mandate is clear: **"If you can't monitor it, you can't manage it."** Your job is to set up Azure Monitor, create alerts, and prove the team can detect and respond to issues before customers do.

## Exam skills covered

- Interpret metrics in Azure Monitor
- Configure log settings in Azure Monitor
- Query and analyze logs in Azure Monitor (KQL)
- Set up alert rules, action groups, and alert processing rules
- Configure monitoring for VMs, storage, and networks using Azure Monitor Insights
- Use Azure Network Watcher and Connection Monitor

## Sysadmin ↔ Azure reference

| On-Prem / Traditional | Azure Equivalent |
|---|---|
| Nagios / Zabbix | Azure Monitor |
| syslog / Event Viewer | Log Analytics workspace |
| Grafana dashboards | Azure Monitor Workbooks |
| Email/PagerDuty alerts | Action Groups |
| Wireshark | Network Watcher packet capture |

## Setup

```bash
# Variables
RG="rg-az104-challenge14"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION
```

## Tasks

### Task 1: create a Log Analytics workspace

```bash
az monitor log-analytics workspace create \
  --resource-group $RG \
  --workspace-name law-contoso \
  --location $LOCATION
```

### Task 2: deploy a VM and enable VM Insights

Deploy a VM, then enable Azure Monitor VM Insights to collect performance and dependency data.

```bash
az vm create \
  --resource-group $RG \
  --name vm-monitored \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys
```

Enable VM Insights via the Azure Portal: **VM → Insights → Enable**.

:::tip

VM Insights automatically installs the Azure Monitor Agent and configures a data collection rule (DCR).

:::
### Task 3: explore Azure Monitor metrics

Navigate to **Azure Monitor → Metrics** (or the VM's Metrics blade) and explore:

- **Percentage CPU** | Current CPU utilization
- **Available Memory Bytes** | Memory pressure
- **Disk Read/Write Operations/Sec** | Disk I/O

Try pinning a chart to a dashboard.

### Task 4: configure diagnostic settings

Send platform logs and metrics to Log Analytics:

```bash
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-contoso \
  --query id -o tsv)

VM_ID=$(az vm show \
  --resource-group $RG \
  --name vm-monitored \
  --query id -o tsv)

# Enable diagnostic settings for the VM:
az monitor diagnostic-settings create \
  --name diag-to-law \
  --resource $VM_ID \
  --workspace $WORKSPACE_ID \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

:::note

It can take **15–30 minutes** for log data to appear in Log Analytics after enabling diagnostic settings. This is normal.

:::
### Task 5: write KQL queries

Open **Log Analytics → Logs** and run these queries:

```kusto
// Top 10 processes by CPU usage
Perf
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| where InstanceName == "_Total"
| summarize AvgCPU = avg(CounterValue) by Computer
| top 10 by AvgCPU desc
```

```kusto
// Find error events in the last 24 hours
Syslog
| where SeverityLevel == "error" or SeverityLevel == "err"
| where TimeGenerated > ago(24h)
| project TimeGenerated, Computer, SyslogMessage, Facility
| order by TimeGenerated desc
| take 50
```

```kusto
// Heartbeat | which VMs are reporting?
Heartbeat
| summarize LastHeartbeat = max(TimeGenerated) by Computer
| extend Status = iff(LastHeartbeat < ago(5m), "Offline", "Online")
| order by Status asc
```

<details>
<summary>More useful KQL patterns</summary>

```kusto
// Count events by severity over time (for charting)
Syslog
| where TimeGenerated > ago(7d)
| summarize Count = count() by bin(TimeGenerated, 1h), SeverityLevel
| render timechart

// Memory usage trend
Perf
| where ObjectName == "Memory" and CounterName == "% Used Memory"
| summarize AvgMem = avg(CounterValue) by bin(TimeGenerated, 15m), Computer
| render timechart
```

</details>

### Task 6: create an action Group

Create an action group that sends email notifications:

```bash
az monitor action-group create \
  --resource-group $RG \
  --name ag-ops-team \
  --short-name OpsTeam \
  --action email ops-email yourname@contoso.com
```

### Task 7: create a metric alert

Create an alert that fires when CPU exceeds 80% for 5 minutes:

```bash
VM_ID=$(az vm show --resource-group $RG --name vm-monitored --query id -o tsv)

az monitor metrics alert create \
  --resource-group $RG \
  --name alert-high-cpu \
  --scopes $VM_ID \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action ag-ops-team \
  --severity 2 \
  --description "CPU usage exceeded 80% for 5 minutes"
```

### Task 8: create a Log alert

Create an alert based on a KQL query | e.g., detect a specific error pattern in logs:

<details>
<summary>Hint</summary>

Use the Azure Portal: **Monitor → Alerts → Create → Log alert rule**

- **Scope**: Your Log Analytics workspace
- **Condition**: Custom log search with KQL
- **Query**: `Syslog | where SeverityLevel == "error" | where TimeGenerated > ago(5m)`
- **Threshold**: Greater than 0
- **Action Group**: `ag-ops-team`

</details>

### Task 9: enable Storage Insights

1. Create a storage account (if you don't have one)
2. Navigate to **Azure Monitor → Storage accounts** (or **Storage account → Insights**)
3. Explore: transaction metrics, latency, availability, capacity trends

### Task 10: use Network watcher

Explore these Network Watcher tools:

1. **Topology** | Visualize your VNet and connected resources
2. **IP Flow Verify** | Test if traffic is allowed or denied between two endpoints
3. **Connection Troubleshoot** | Check connectivity from a VM to a destination

```bash
# IP flow verify example
az network watcher test-ip-flow \
  --direction Inbound \
  --local 10.0.0.4:80 \
  --protocol TCP \
  --remote 0.0.0.0:* \
  --vm vm-monitored \
  --resource-group $RG
```

## Break & fix

### Break it
1. **Alert without action** | Create an alert rule but don't attach an action group. Trigger the condition. Notice: the alert fires in the portal but no notification is sent. Why?
2. **Empty log results** | Query logs immediately after enabling diagnostic settings. Results are empty. Is this broken?

### Fix it
- Attach the action group to the alert rule
- Understand that log ingestion has a delay (15–30 min) | this is expected behavior, not a bug
- Use **Heartbeat** table to verify the agent is connected

## Knowledge check

1. **What is the difference between Metrics and Logs in Azure Monitor?**
   - Metrics = numeric time-series data, near real-time, stored in a time-series database
   - Logs = structured/unstructured text, stored in Log Analytics, queried with KQL

2. **What are the essential KQL operators for the exam?**
   - `where` | filter rows
   - `summarize` | aggregate (count, avg, sum, max)
   - `ago()` | time relative to now (e.g., `ago(1h)`, `ago(7d)`)
   - `project` | select columns
   - `render` | visualize results

3. **What are the alert severity levels?**
   - 0 = Critical, 1 = Error, 2 = Warning, 3 = Informational, 4 = Verbose

4. **What are alert processing rules?**
   - Rules that modify the behavior of fired alerts (e.g., suppress notifications during maintenance windows, add action groups to all alerts in a scope)

## Cleanup

```bash
az group delete --name $RG --yes --no-wait
```

## Success criteria

<SuccessChecklist
  storageKey="az104-challenge-14"
  items={[
    "Log Analytics workspace created",
    "VM Insights enabled and collecting data",
    "Azure Monitor metrics explored and understood",
    "Diagnostic settings configured",
    "KQL queries executed successfully",
    "Action group created with email notification",
    "Metric alert created (CPU > 80%)",
    "Log alert created for error patterns",
    "Storage Insights explored",
    "Network Watcher tools used (topology, IP flow verify, connection troubleshoot)",
    "Break & Fix scenarios completed",
    "Resources cleaned up"
  ]}
/>
