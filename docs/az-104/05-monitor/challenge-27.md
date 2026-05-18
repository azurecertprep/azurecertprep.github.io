---
sidebar_position: 27
title: "Challenge 27: Log Analytics & KQL Deep Dive"
---

# Challenge 27: Log Analytics & KQL Deep Dive

| | |
|---|---|
| **Estimated Time** | 75-90 minutes |
| **Cost Estimate** | ~$0.15 |
| **Exam Weight** | 10-15% |

## Scenario

Contoso Ltd. needs centralized logging with powerful query capabilities to meet both compliance and operational needs. The operations team must collect logs from VMs, Azure resources, and applications into a single Log Analytics workspace, then write KQL queries to analyze performance, detect anomalies, and create visualizations in workbooks.

## Exam Skills Covered

- Create and configure Log Analytics workspace
- Configure log settings in Azure Monitor
- Configure data collection rules (DCR)
- Install and configure Azure Monitor Agent (AMA)
- Query and analyze logs using KQL (where, summarize, join, render)
- Create saved queries and functions
- Create Azure Monitor Workbooks with visualizations
- Configure diagnostic settings for Azure resources

## Sysadmin ↔ Azure Reference

| On-Prem / Traditional | Azure Equivalent |
|---|---|
| Splunk / ELK Stack / Graylog | Log Analytics workspace |
| rsyslog / syslog-ng / Fluentd | Azure Monitor Agent (AMA) |
| Log rotation / retention policies | Workspace retention settings |
| SQL queries on log databases | Kusto Query Language (KQL) |
| Grafana dashboards | Azure Monitor Workbooks |
| collectd / Telegraf config files | Data Collection Rules (DCR) |
| Windows Event Viewer forwarding | Windows Event Log collection via DCR |

## Setup

```bash
# Variables
RG="rg-az104-challenge27"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION
```

## Tasks

### Task 1: Create a Log Analytics Workspace

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --location $LOCATION \
  --retention-time 30 \
  --sku PerGB2018

# Verify workspace
az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --query "{Name:name, SKU:sku.name, Retention:retentionInDays, DailyCapGB:workspaceCapping.dailyQuotaGb}" -o table

# Get workspace ID and key (needed for agent configuration)
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --query "customerId" -o tsv)

echo "Workspace ID: $WORKSPACE_ID"
```

:::tip Workspace Pricing

The PerGB2018 SKU charges per GB ingested. For the exam, know these options:
- **Free tier**: 500 MB/day limit, 7-day retention
- **Per-GB**: Pay per GB ingested, 30-730 day configurable retention
- **Commitment tiers**: 100/200/300/400/500 GB/day for discounts
- **Daily cap**: Can set a daily ingestion cap to control costs
:::

### Task 2: Deploy Target VMs for Monitoring

```bash
# Create a VNet
az network vnet create \
  --resource-group $RG \
  --name vnet-monitored \
  --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-vms \
  --subnet-prefix 10.0.1.0/24

# Create a Linux VM
az vm create \
  --resource-group $RG \
  --name vm-linux-web \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-monitored \
  --subnet subnet-vms \
  --public-ip-address vm-linux-pip \
  --admin-username azureuser \
  --generate-ssh-keys

# Create a Windows VM
az vm create \
  --resource-group $RG \
  --name vm-win-app \
  --image Win2022Datacenter \
  --size Standard_B2s \
  --vnet-name vnet-monitored \
  --subnet subnet-vms \
  --public-ip-address vm-win-pip \
  --admin-username azureuser \
  --admin-password 'C0nt0so!Pass2024'

# Install a web server on Linux to generate logs
az vm run-command invoke \
  --resource-group $RG \
  --name vm-linux-web \
  --command-id RunShellScript \
  --scripts "sudo apt-get update && sudo apt-get install -y nginx && sudo systemctl start nginx"
```

### Task 3: Create Data Collection Rules (DCR)

```bash
# Get workspace resource ID
WORKSPACE_RESOURCE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --query "id" -o tsv)

# Create a DCR for Linux performance and syslog
az monitor data-collection rule create \
  --resource-group $RG \
  --name dcr-linux-perf-syslog \
  --location $LOCATION \
  --data-flows '[{"streams":["Microsoft-Perf","Microsoft-Syslog"],"destinations":["law-destination"]}]' \
  --log-analytics "[{\"name\":\"law-destination\",\"workspace-resource-id\":\"$WORKSPACE_RESOURCE_ID\"}]" \
  --performance-counters '[{"name":"perfCounters","streams":["Microsoft-Perf"],"sampling-frequency":60,"counter-specifiers":["\\Processor(*)\\% Processor Time","\\Memory\\Available Bytes","\\LogicalDisk(*)\\% Free Space","\\Network(*)\\Total Bytes Transmitted"]}]' \
  --syslog '[{"name":"syslogCollection","streams":["Microsoft-Syslog"],"facility-names":["auth","authpriv","daemon","kern","syslog"],"log-levels":["Warning","Error","Critical","Alert","Emergency"]}]'

# Create a DCR for Windows events and performance
az monitor data-collection rule create \
  --resource-group $RG \
  --name dcr-windows-events \
  --location $LOCATION \
  --data-flows '[{"streams":["Microsoft-Perf","Microsoft-Event"],"destinations":["law-destination"]}]' \
  --log-analytics "[{\"name\":\"law-destination\",\"workspace-resource-id\":\"$WORKSPACE_RESOURCE_ID\"}]" \
  --performance-counters '[{"name":"winPerfCounters","streams":["Microsoft-Perf"],"sampling-frequency":60,"counter-specifiers":["\\Processor(*)\\% Processor Time","\\Memory\\% Committed Bytes In Use","\\LogicalDisk(*)\\% Free Space"]}]' \
  --windows-event-logs '[{"name":"winEvents","streams":["Microsoft-Event"],"x-path-queries":["Application!*[System[(Level=1 or Level=2 or Level=3)]]","System!*[System[(Level=1 or Level=2 or Level=3)]]","Security!*[System[(band(Keywords,13510798882111488))]]"]}]'

# List DCRs
az monitor data-collection rule list --resource-group $RG -o table
```

### Task 4: Install Azure Monitor Agent and Associate DCRs

```bash
# Install Azure Monitor Agent on Linux VM
az vm extension set \
  --resource-group $RG \
  --vm-name vm-linux-web \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor \
  --version 1.0 \
  --enable-auto-upgrade true

# Install Azure Monitor Agent on Windows VM
az vm extension set \
  --resource-group $RG \
  --vm-name vm-win-app \
  --name AzureMonitorWindowsAgent \
  --publisher Microsoft.Azure.Monitor \
  --version 1.0 \
  --enable-auto-upgrade true

# Associate Linux DCR with the Linux VM
LINUX_VM_ID=$(az vm show -g $RG -n vm-linux-web --query "id" -o tsv)
DCR_LINUX_ID=$(az monitor data-collection rule show \
  --resource-group $RG \
  --name dcr-linux-perf-syslog \
  --query "id" -o tsv)

az monitor data-collection rule association create \
  --name "linux-dcr-association" \
  --resource $LINUX_VM_ID \
  --rule-id $DCR_LINUX_ID

# Associate Windows DCR with the Windows VM
WIN_VM_ID=$(az vm show -g $RG -n vm-win-app --query "id" -o tsv)
DCR_WIN_ID=$(az monitor data-collection rule show \
  --resource-group $RG \
  --name dcr-windows-events \
  --query "id" -o tsv)

az monitor data-collection rule association create \
  --name "windows-dcr-association" \
  --resource $WIN_VM_ID \
  --rule-id $DCR_WIN_ID

# Verify associations
az monitor data-collection rule association list --resource $LINUX_VM_ID -o table
az monitor data-collection rule association list --resource $WIN_VM_ID -o table
```

:::tip Azure Monitor Agent vs Legacy Agents

AMA replaces the legacy Log Analytics agent (MMA/OMS) and Diagnostics extension:
- **AMA**: Uses Data Collection Rules (DCR), supports multi-homing, uses managed identity
- **Legacy MMA**: Uses workspace configuration, being deprecated
- For the AZ-104 exam, focus on AMA + DCR (the modern approach)
:::

### Task 5: Configure Diagnostic Settings for Azure Resources

```bash
# Enable diagnostic settings for the VNet (sending to Log Analytics)
VNET_ID=$(az network vnet show -g $RG -n vnet-monitored --query "id" -o tsv)

az monitor diagnostic-settings create \
  --name "vnet-diagnostics" \
  --resource $VNET_ID \
  --workspace $WORKSPACE_RESOURCE_ID \
  --metrics '[{"category":"AllMetrics","enabled":true}]'

# Enable diagnostic settings for NSG (if exists)
# Create a storage account for archival
DIAG_STORAGE="diagstorage$RANDOM"
az storage account create \
  --resource-group $RG \
  --name $DIAG_STORAGE \
  --sku Standard_LRS

# List available diagnostic categories for a resource type
az monitor diagnostic-settings categories list \
  --resource $VNET_ID -o table
```

**Portal Steps:**
1. Navigate to any Azure resource > **Diagnostic settings**
2. Click **Add diagnostic setting**
3. Select log categories and metrics to collect
4. Choose destinations: Log Analytics workspace, Storage account, Event Hub
5. Click **Save**

### Task 6: Write KQL Queries

:::tip KQL Basics

Wait 10-15 minutes after configuring data collection for logs to appear. Use the Portal Log Analytics query editor for interactive testing.
:::

**Portal: Navigate to Log Analytics workspace > Logs**

```kusto
// Basic query: Find all heartbeat records from the last hour
Heartbeat
| where TimeGenerated > ago(1h)
| project Computer, TimeGenerated, OSType, Version

// Filter (where): Find errors in syslog
Syslog
| where TimeGenerated > ago(24h)
| where SeverityLevel in ("err", "crit", "alert", "emerg")
| project TimeGenerated, Computer, Facility, SeverityLevel, SyslogMessage
| order by TimeGenerated desc

// Summarize: Count events by severity
Syslog
| where TimeGenerated > ago(24h)
| summarize Count=count() by SeverityLevel
| order by Count desc

// Summarize with time bins: CPU usage over time
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| where InstanceName == "_Total"
| summarize AvgCPU=avg(CounterValue) by bin(TimeGenerated, 5m), Computer
| order by TimeGenerated asc

// Join: Correlate performance with events
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| where InstanceName == "_Total"
| summarize AvgCPU=avg(CounterValue) by bin(TimeGenerated, 5m), Computer
| join kind=leftouter (
    Syslog
    | where TimeGenerated > ago(1h)
    | summarize ErrorCount=count() by bin(TimeGenerated, 5m), Computer
) on TimeGenerated, Computer
| project TimeGenerated, Computer, AvgCPU, ErrorCount=coalesce(ErrorCount, 0)

// Render: Create a time chart
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| where InstanceName == "_Total"
| summarize AvgCPU=avg(CounterValue) by bin(TimeGenerated, 5m), Computer
| render timechart

// Advanced: Find VMs with high memory usage
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Memory"
| where CounterName == "Available Bytes" or CounterName == "% Committed Bytes In Use"
| summarize AvgValue=avg(CounterValue) by Computer, CounterName
| evaluate pivot(CounterName, any(AvgValue))
```

### Task 7: Create Saved Queries and Functions

```bash
# Save a query via the Portal:
# 1. Run the query in Log Analytics > Logs
# 2. Click "Save" > "Save as query"
# 3. Name: "High CPU VMs", Category: "Performance"

# Create a function (reusable query) via CLI
az monitor log-analytics workspace saved-search create \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --name "HighCPUAlerts" \
  --display-name "High CPU VMs" \
  --category "Performance" \
  --saved-query "Perf | where ObjectName == 'Processor' and CounterName == '% Processor Time' and InstanceName == '_Total' | where CounterValue > 80 | summarize AvgCPU=avg(CounterValue) by Computer, bin(TimeGenerated, 5m) | where AvgCPU > 80"

# List saved queries
az monitor log-analytics workspace saved-search list \
  --resource-group $RG \
  --workspace-name law-contoso-ops -o table
```

### Task 8: Create a Workbook with Visualizations

**Portal Steps (Workbooks require Portal):**

1. Navigate to **Azure Monitor** > **Workbooks**
2. Click **New**
3. Add the following elements:

**Section 1 | VM Health Overview (Grid):**
```kusto
Heartbeat
| where TimeGenerated > ago(5m)
| summarize LastHeartbeat=max(TimeGenerated) by Computer, OSType
| extend Status = iff(LastHeartbeat > ago(5m), "Healthy", "Unhealthy")
| project Computer, OSType, LastHeartbeat, Status
```

**Section 2 | CPU Usage Over Time (Line Chart):**
```kusto
Perf
| where TimeGenerated > ago(4h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| where InstanceName == "_Total"
| summarize AvgCPU=avg(CounterValue) by bin(TimeGenerated, 5m), Computer
| render timechart
```

**Section 3 | Error Summary (Pie Chart):**
```kusto
Syslog
| where TimeGenerated > ago(24h)
| where SeverityLevel in ("err", "crit", "alert", "emerg")
| summarize Count=count() by Facility
| render piechart
```

**Section 4 | Top Talkers (Bar Chart):**
```kusto
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Network" and CounterName == "Total Bytes Transmitted"
| summarize TotalBytes=sum(CounterValue) by Computer
| top 10 by TotalBytes desc
| render barchart
```

4. Click **Save** and name the workbook "Contoso Operations Dashboard"

### Task 9: Configure Workspace Settings

```bash
# Set daily ingestion cap (cost control)
az monitor log-analytics workspace update \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --quota 1

# Update retention period
az monitor log-analytics workspace update \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --retention-time 60

# Configure table-level retention (different retention per table)
# Some tables may need longer retention for compliance
az monitor log-analytics workspace table update \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --name Syslog \
  --retention-time 90

# Show workspace configuration
az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --query "{Name:name, Retention:retentionInDays, DailyCapGB:workspaceCapping.dailyQuotaGb}" -o table
```

## Success Criteria

- [ ] Log Analytics workspace created with appropriate SKU and retention
- [ ] Data Collection Rules created for Linux (perf + syslog) and Windows (perf + events)
- [ ] Azure Monitor Agent installed on both Linux and Windows VMs
- [ ] DCR associations created (VMs linked to their respective DCRs)
- [ ] Diagnostic settings configured for Azure resources
- [ ] KQL queries written and tested (where, summarize, join, render)
- [ ] Saved queries or functions created
- [ ] Workbook created with multiple visualizations
- [ ] Workspace daily cap and retention configured

## Break & Fix Scenarios

### Scenario A: No Data Appearing in Log Analytics

```bash
# Check if AMA extension is installed and healthy
az vm extension list --resource-group $RG --vm-name vm-linux-web -o table

# Check if DCR association exists
az monitor data-collection rule association list \
  --resource $LINUX_VM_ID -o table

# Check DCR configuration
az monitor data-collection rule show \
  --resource-group $RG \
  --name dcr-linux-perf-syslog

# Common causes:
# 1. AMA extension not installed or failed
# 2. DCR not associated with the VM
# 3. Workspace ID mismatch in DCR
# 4. Wait time (data takes 5-15 minutes to appear)
```

### Scenario B: KQL Query Returns No Results

```kusto
// Common mistake: Wrong table name
// "Perf" not "PerformanceCounters" or "perf"

// Common mistake: Wrong time range
// Use ago(1h), ago(24h), not specific dates that may be in the future

// Debug: Check what tables have data
search *
| where TimeGenerated > ago(1h)
| summarize Count=count() by $table
| order by Count desc
```

### Scenario C: Daily Cap Reached

```bash
# Symptom: Data stops flowing into workspace
# Check current usage
az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --query "workspaceCapping"

# Fix: Increase or remove the daily cap
az monitor log-analytics workspace update \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --quota -1
# (-1 removes the cap)
```

## Knowledge Check

**1. What is the difference between Data Collection Rules and Diagnostic Settings?**

<details>
<summary>Show Answer</summary>

| Feature | Data Collection Rules (DCR) | Diagnostic Settings |
|---------|---------------------------|-------------------|
| Source | VMs (via AMA agent) | Azure platform resources |
| Data types | Perf counters, logs, custom | Platform metrics, resource logs |
| Agent required | Yes (AMA) | No (built-in) |
| Configuration | Centralized, reusable | Per-resource |
| Filtering | Yes (at collection time) | Category-based |

Use DCRs for VM/compute data. Use Diagnostic Settings for PaaS/platform data.
</details>

**2. What are the key KQL operators for the AZ-104 exam?**

<details>
<summary>Show Answer</summary>

| Operator | Purpose | Example |
|----------|---------|---------|
| where | Filter rows | `where CounterValue > 80` |
| project | Select columns | `project Computer, TimeGenerated` |
| summarize | Aggregate | `summarize avg(CounterValue) by Computer` |
| bin() | Time bucketing | `bin(TimeGenerated, 5m)` |
| join | Combine tables | `Table1 \| join Table2 on Column` |
| render | Visualize | `render timechart` |
| extend | Add calculated column | `extend GB = Bytes / 1073741824` |
| order by | Sort | `order by Count desc` |
| top | Take N highest | `top 10 by Value desc` |
| count | Count rows | `count` |
</details>

**3. What is the difference between Azure Monitor Agent (AMA) and the legacy Log Analytics Agent (MMA)?**

<details>
<summary>Show Answer</summary>

| Feature | AMA (New) | MMA/OMS (Legacy) |
|---------|-----------|-----------------|
| Configuration | Data Collection Rules | Workspace settings |
| Multi-homing | Native (multiple DCRs) | Limited |
| Authentication | Managed Identity | Workspace key |
| Filtering | At source (DCR) | At workspace |
| Status | Current, recommended | Deprecated (Aug 2024) |
| Extension name | AzureMonitorLinuxAgent / AzureMonitorWindowsAgent | OmsAgentForLinux / MicrosoftMonitoringAgent |
</details>

**4. How does workspace retention work?**

<details>
<summary>Show Answer</summary>

- Default retention: 30 days (included in Per-GB price)
- Configurable: 30-730 days (additional cost beyond 30 days)
- Table-level retention: Override workspace default per table
- Archive tier: Data older than retention is moved to archive (cheaper, requires restore to query)
- Interactive retention: Data queryable immediately
- Compliance: Some regulations require 1+ year retention
</details>

## Cleanup

```bash
# Delete all resources
az group delete --name $RG --yes --no-wait

echo "Resources are being deleted in the background."
```

## Learning Resources

- [Azure Monitor Logs overview](https://learn.microsoft.com/azure/azure-monitor/logs/data-platform-logs)
- [Log Analytics workspace](https://learn.microsoft.com/azure/azure-monitor/logs/log-analytics-workspace-overview)
- [Data Collection Rules](https://learn.microsoft.com/azure/azure-monitor/essentials/data-collection-rule-overview)
- [Azure Monitor Agent overview](https://learn.microsoft.com/azure/azure-monitor/agents/azure-monitor-agent-overview)
- [KQL quick reference](https://learn.microsoft.com/azure/data-explorer/kql-quick-reference)
- [Azure Monitor Workbooks](https://learn.microsoft.com/azure/azure-monitor/visualize/workbooks-overview)
- [Diagnostic settings](https://learn.microsoft.com/azure/azure-monitor/essentials/diagnostic-settings)
