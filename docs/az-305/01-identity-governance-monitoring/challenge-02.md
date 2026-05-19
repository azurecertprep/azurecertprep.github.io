---
sidebar_position: 2
title: "Challenge 02: Design Log Routing and Filtering"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 02: design Log routing and filtering

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-10 | **Exam Weight: 25-30%**

:::

## Introduction

Contoso Financial Services is a regulated financial institution running a portfolio of Azure services including App Services, Azure SQL Databases, Azure Key Vault, and Azure Kubernetes Service. Their compliance team has mandated that all security audit logs must be forwarded to their on-premises Splunk SIEM within 5 minutes of generation. Additionally, all logs must be archived for 7 years to meet financial regulatory requirements (at the lowest possible cost), and the operations team needs real-time alerting on critical infrastructure events.

The current state is chaotic: some resources have diagnostic settings pointing to a storage account no one monitors, others have no diagnostic settings at all, and the security team is manually exporting logs weekly via the portal. The monthly Azure bill for logging has been climbing steadily due to duplicate data being sent to multiple destinations without filtering.

Your task is to design a comprehensive log routing architecture that satisfies compliance, operational, and cost requirements while eliminating redundant data flows.

## Exam skills covered

- Recommend a solution for routing logs
- Recommend a logging solution
- Recommend a monitoring solution

## Design tasks

### Part 1: Log routing architecture

1. Design the routing architecture for Contoso's logs considering these destinations:
   - **SIEM (Splunk)**: Security audit logs, near real-time delivery
   - **Long-term archive**: All logs, 7-year retention, lowest cost
   - **Log Analytics**: Operational logs for alerting and troubleshooting
   - **Real-time stream processing**: Critical events for automated response

2. For each destination, determine the appropriate Azure service:
   - Event Hub, Storage Account, Log Analytics workspace, or partner solution
   - Document why each destination was chosen over alternatives

3. Create a data flow diagram showing how logs move from source resources to each destination.

### Part 2: diagnostic settings configuration

4. Design diagnostic settings for the following resource types, specifying which log categories go to which destinations:
   - Azure Key Vault (AuditEvent logs)
   - Azure SQL Database (SQLSecurityAuditEvents, QueryStoreRuntimeStatistics)
   - Azure App Service (AppServiceHTTPLogs, AppServiceConsoleLogs, AppServiceAppLogs)
   - Azure Kubernetes Service (kube-audit, kube-controller-manager, cluster-autoscaler)

5. Implement diagnostic settings for at least two resource types using Azure CLI.

### Part 3: Data collection rules

6. Design data collection rules (DCRs) to filter and transform logs before ingestion into Log Analytics:
   - Filter out health check HTTP requests (status 200, path "/health") from App Service logs
   - Transform AKS logs to extract only warning and error level messages
   - Reduce Key Vault audit log verbosity by dropping read-only operations in non-production environments

7. Implement one DCR using Azure CLI or ARM template that demonstrates log filtering with a KQL transformation.

### Part 4: cost optimization through routing

8. Calculate the cost impact of sending all logs to all destinations vs. selective routing. Consider:
   - Log Analytics ingestion cost per GB
   - Event Hub throughput unit costs
   - Storage account (cool tier) cost per GB
   - Data export costs

9. Design a tiered routing strategy:
   - Tier 1 (Critical): Real-time to Log Analytics + Event Hub
   - Tier 2 (Audit): Log Analytics + Storage Archive
   - Tier 3 (Verbose): Storage Archive only (with optional restore)

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-02"
  items={[
    "Log routing architecture documented with clear destination justification for each log type",
    "Diagnostic settings designed for at least 4 resource types with appropriate category-to-destination mapping",
    "At least two diagnostic settings deployed and verified",
    "Data collection rule implemented with KQL transformation that filters unnecessary log entries",
    "Cost comparison documented between full-send and selective routing approaches",
    "Near real-time SIEM delivery path designed using Event Hub"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Diagnostic Settings Destinations</summary>

Each Azure resource can have up to 5 diagnostic settings, each pointing to a different destination. The four supported destinations are:

- **Log Analytics workspace**: For interactive querying, alerting, and Azure Monitor integration
- **Azure Storage account**: For long-term archival at low cost (supports lifecycle policies for tiering)
- **Azure Event Hub**: For streaming to external systems (SIEM, custom processing) with near real-time delivery
- **Partner solution**: For integrated third-party solutions (Datadog, Elastic, etc.)

A single diagnostic setting can send to multiple destinations simultaneously, but you cannot filter by log level within a category at the diagnostic setting level -- that requires Data Collection Rules.

</details>

<details>
<summary>Hint 2: Configuring Diagnostic Settings via CLI</summary>

```bash
# Get the resource ID of a Key Vault
KV_ID=$(az keyvault show --name contoso-prod-kv --query id -o tsv)

# Create diagnostic setting sending audit logs to event Hub and Storage
az monitor diagnostic-settings create \
  --name "security-routing" \
  --resource "$KV_ID" \
  --event-hub-name "security-logs" \
  --event-hub-rule "/subscriptions/{sub}/resourceGroups/rg-logging/providers/Microsoft.EventHub/namespaces/eh-contoso-security/authorizationRules/RootManageSharedAccessKey" \
  --storage-account "/subscriptions/{sub}/resourceGroups/rg-logging/providers/Microsoft.Storage/storageAccounts/stcontosologarchive" \
  --logs '[{"category":"AuditEvent","enabled":true,"retentionPolicy":{"enabled":true,"days":2555}}]'

# Create diagnostic setting sending to Log Analytics
az monitor diagnostic-settings create \
  --name "ops-routing" \
  --resource "$KV_ID" \
  --workspace "/subscriptions/{sub}/resourceGroups/rg-logging/providers/Microsoft.OperationalInsights/workspaces/law-contoso-ops" \
  --logs '[{"category":"AuditEvent","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

</details>

<details>
<summary>Hint 3: Data Collection Rules with KQL Transformations</summary>

Data Collection Rules allow you to filter and transform data before it reaches Log Analytics, reducing ingestion costs. The transformation uses KQL:

```bash
# Example DCR that filters out health check requests
# The KQL transformation filters rows where the URL path is not "/health"
az monitor data-collection rule create \
  --name "dcr-filter-healthchecks" \
  --resource-group rg-logging \
  --location centralus \
  --data-flows '[{
    "streams": ["Microsoft-Table-AppServiceHTTPLogs"],
    "destinations": ["law-contoso-ops"],
    "transformKql": "source | where CsUriStem != \"/health\" or ScStatus != 200"
  }]' \
  --destinations '{
    "logAnalytics": [{
      "workspaceResourceId": "/subscriptions/{sub}/resourceGroups/rg-logging/providers/Microsoft.OperationalInsights/workspaces/law-contoso-ops",
      "name": "law-contoso-ops"
    }]
  }'
```

</details>

<details>
<summary>Hint 4: Event Hub for SIEM Integration</summary>

For near real-time SIEM delivery, Event Hub is the recommended destination:
- Latency: Typically under 1 minute from log generation to Event Hub
- Splunk has a native Azure Event Hub input add-on
- Use dedicated Event Hub namespaces for security logs to ensure throughput isolation
- Configure consumer groups: one for Splunk, one for backup processing

Key sizing consideration: 1 throughput unit = 1 MB/s ingress. For 50 GB/day of security logs, you need approximately 1 throughput unit (50 GB / 86400 seconds = ~0.6 MB/s).

</details>

<details>
<summary>Hint 5: Storage Account Archival Strategy</summary>

For 7-year archival at lowest cost:
- Use a Storage Account with **cool** or **archive** access tier
- Enable lifecycle management to move blobs from cool to archive after 90 days
- Estimated cost: Archive tier is approximately $0.00099/GB/month (~$0.84/GB over 7 years)
- Diagnostic settings export logs in JSON format organized by date/time partitions

```bash
# Create storage account with cool default tier
az storage account create \
  --name stcontosologarchive \
  --resource-group rg-logging \
  --location centralus \
  --sku Standard_LRS \
  --access-tier Cool

# Add lifecycle policy to move to archive after 90 days
az storage account management-policy create \
  --account-name stcontosologarchive \
  --resource-group rg-logging \
  --policy '{
    "rules": [{
      "name": "archive-old-logs",
      "type": "Lifecycle",
      "definition": {
        "filters": {"blobTypes": ["blockBlob"]},
        "actions": {
          "baseBlob": {
            "tierToArchive": {"daysAfterModificationGreaterThan": 90}
          }
        }
      }
    }]
  }'
```

</details>

## Learning resources

- [Diagnostic settings in Azure Monitor](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings)
- [Data collection rules overview](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/data-collection-rule-overview)
- [Data collection transformations](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/data-collection-transformations)
- [Stream Azure monitoring data to Event Hub](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/stream-monitoring-data-event-hubs)
- [Archive Azure resource logs to storage account](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/resource-logs)
- [Azure Monitor cost and usage](https://learn.microsoft.com/en-us/azure/azure-monitor/cost-usage)

## Knowledge check

<details>
<summary>1. Contoso needs security audit logs delivered to their Splunk SIEM within 5 minutes and archived for 7 years at lowest cost. Which combination of destinations should you configure in the diagnostic settings?</summary>

**Azure Event Hub for SIEM delivery + Azure Storage Account (archive tier) for long-term retention.** Event Hub provides near real-time streaming (sub-minute latency) with native Splunk integration via the Azure Event Hub input add-on. Storage Account with archive tier provides the lowest cost for 7-year retention at approximately $0.001/GB/month. You do NOT need to route through Log Analytics first -- diagnostic settings can send directly to Event Hub and Storage simultaneously.

</details>

<details>
<summary>2. An application generates 100 GB/day of HTTP logs, but 60% are health check probes (GET /health, status 200). The operations team only needs non-health-check logs for troubleshooting. How do you reduce Log Analytics ingestion costs?</summary>

**Use a Data Collection Rule (DCR) with a KQL transformation** to filter out health check requests before ingestion. The transformation `source | where not(CsUriStem == "/health" and ScStatus == 200)` drops the 60 GB/day of health probes, reducing ingestion from 100 GB to 40 GB per day. This saves approximately 60% on Log Analytics ingestion costs. Note: If you still need the complete logs for compliance, send the unfiltered stream to a Storage Account via a separate diagnostic setting.

</details>

<details>
<summary>3. What is the maximum number of diagnostic settings per Azure resource, and what constraint does this impose on routing architecture?</summary>

**Each resource supports a maximum of 5 diagnostic settings.** Each setting can target one destination of each type (one Log Analytics workspace, one Storage Account, one Event Hub, one partner solution). This means a single resource can send logs to at most 5 Log Analytics workspaces, 5 Storage Accounts, and 5 Event Hubs across all its diagnostic settings. You cannot create two settings targeting the same destination. This limit rarely impacts designs but must be considered when multiple teams each want their own destination.

</details>

<details>
<summary>4. A company wants to send AKS kube-audit logs to Log Analytics for the operations team and to Event Hub for the security team. The operations team only needs warning and error level entries, but the security team needs all entries. How should you design this?</summary>

**Create two diagnostic settings on the AKS cluster:** One sends the kube-audit category to Event Hub (unfiltered, for security team). The second sends kube-audit to Log Analytics with a Data Collection Rule that applies a KQL transformation filtering to only warning and error levels. This way the security team gets complete audit data in near real-time, while Log Analytics ingestion costs are reduced by excluding informational entries that the operations team does not need for alerting.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge02 --location eastus
```

2. Deploy a Log Analytics workspace as the primary sink:

```bash
az monitor log-analytics workspace create \
  --resource-group rg-az305-challenge02 \
  --workspace-name law-routing-lab \
  --retention-time 30
```

3. Deploy an Event Hub namespace as a secondary routing target:

```bash
az eventhubs namespace create \
  --resource-group rg-az305-challenge02 \
  --name eh-routing-lab-$RANDOM \
  --sku Standard
```

4. Create a diagnostic setting on the resource group to route Activity Logs:

```bash
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group rg-az305-challenge02 \
  --workspace-name law-routing-lab \
  --query id -o tsv)
SUB_ID=$(az account show --query id -o tsv)
az monitor diagnostic-settings create \
  --name "route-to-law" \
  --resource "/subscriptions/$SUB_ID" \
  --workspace "$WORKSPACE_ID" \
  --logs '[{"category":"Administrative","enabled":true},{"category":"Security","enabled":true}]'
```

5. Verify the diagnostic setting is active:

```bash
az monitor diagnostic-settings list \
  --resource "/subscriptions/$SUB_ID" \
  --query "[?name=='route-to-law'].{name:name, workspace:workspaceId}" -o table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
SUB_ID=$(az account show --query id -o tsv)
az monitor diagnostic-settings delete \
  --name "route-to-law" \
  --resource "/subscriptions/$SUB_ID"
az group delete --name rg-az305-challenge02 --yes --no-wait
```

---

**Next**: [Challenge 03: Design a Monitoring and Alerting Strategy](/docs/az-305/identity-governance-monitoring/challenge-03)
