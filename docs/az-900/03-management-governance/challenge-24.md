---
sidebar_position: 6
title: "Challenge 24: Azure Monitor, Log Analytics & Alerts"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 24: Azure Monitor, Log Analytics & Alerts

:::info Estimated Time
**25-35 min** | **Cost**: Free | **Domain**: Management & Governance (30-35%)
:::

## Exam skills covered

- Describe Azure Monitor (including Log Analytics, Azure Monitor Alerts, Application Insights)

## Overview

**Azure Monitor** is the comprehensive monitoring solution for Azure. It collects, analyzes, and acts on telemetry from your cloud and on-premises environments. Within Azure Monitor, **Log Analytics** provides powerful querying capabilities, **Alerts** notify you of issues, and **Application Insights** monitors live web applications.

This is the final challenge â€” it brings together monitoring concepts that apply across everything you've learned.

## Explore

### Task 1: Understand Azure Monitor architecture

```text
Data Sources               Azure Monitor              Actions
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€             â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€             â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Applications    â”€â”€â”       â”Œâ”€ Metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’  Dashboards
VMs/Containers  â”€â”€â”¼â”€â”€â†’    â”‚  (numbers,           Alerts
Networks        â”€â”€â”¤       â”‚   time-series)       Autoscale
Custom sources  â”€â”€â”˜       â”‚
                          â””â”€ Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’  Log Analytics
                             (detailed,           Workbooks
                              rich data)          Export
```

| Data type | What it is | Example | Query with |
|-----------|-----------|---------|-----------|
| **Metrics** | Numerical time-series data | CPU %, Memory usage, request count | Metrics Explorer |
| **Logs** | Detailed event data (text, structured) | Error logs, audit events, traces | Log Analytics (KQL) |

### Task 2: Explore Azure Monitor

1. In Azure Portal, search for **Monitor**
2. Explore the main sections:
   - **Overview**: Summary dashboard
   - **Metrics**: Real-time numerical data (if you have resources)
   - **Logs**: Query logs with KQL (Kusto Query Language)
   - **Alerts**: Configure and view alerts
   - **Insights**: Pre-built monitoring for VMs, storage, networks
3. Click **Metrics** â€” even without resources, observe the interface

### Task 3: Understand Log Analytics

Log Analytics is the tool for querying Azure Monitor Logs:

- Uses **KQL (Kusto Query Language)** â€” a read-only query language
- Collects data from: Azure resources, VMs (via agents), applications
- Stores data in a **Log Analytics workspace**

**Basic KQL example:**
```kusto
// Show recent activity log events
AzureActivity
| where TimeGenerated > ago(24h)
| project TimeGenerated, OperationName, ActivityStatus
| take 10
```

### Task 4: Understand Azure Monitor Alerts

Alerts proactively notify you when conditions are met:

| Alert component | Description |
|----------------|-------------|
| **Alert rule** | Condition that triggers the alert |
| **Action group** | Who gets notified and how (email, SMS, webhook) |
| **Severity** | 0 (Critical) to 4 (Verbose) |

**Alert types:**
| Type | Triggers on | Example |
|------|------------|---------|
| **Metric alert** | Metric threshold crossed | CPU > 90% for 5 minutes |
| **Log alert** | Log query returns results | Error count > 10 in 1 hour |
| **Activity log alert** | Azure operation occurs | VM deleted, policy changed |
| **Service Health alert** | Azure service issue | Outage in your region |

### Task 5: Understand Application Insights

Application Insights monitors **live web applications**:

| Feature | What it detects |
|---------|----------------|
| **Request rates** | Traffic patterns and throughput |
| **Response times** | How fast your app responds |
| **Failure rates** | Error percentages |
| **Dependencies** | External service call performance |
| **Page views** | User behavior and browser performance |
| **Availability tests** | Is your app reachable? |

**Use case**: A web application is slow. Application Insights shows:
- Which requests are slow
- Which dependency (database? API?) is the bottleneck
- Which users are affected
- When the problem started

:::tip Azure CLI Alternative
```bash
# List Azure Monitor alert rules
az monitor metrics alert list --output table 2>/dev/null || echo "No alert rules configured"

# List Log Analytics workspaces
az monitor log-analytics workspace list --query "[].{Name:name, Location:location}" --output table 2>/dev/null || echo "No workspaces found"

# View recent activity log
az monitor activity-log list --max-events 5 --query "[].{Time:eventTimestamp, Operation:operationName.localizedValue, Status:status.localizedValue}" --output table
```
:::

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Azure Monitor** | Comprehensive monitoring platform for Azure resources |
| **Metrics** | Numerical time-series data (CPU %, memory, requests) |
| **Logs** | Detailed event and diagnostic data |
| **Log Analytics** | Tool for querying logs using KQL |
| **KQL** | Kusto Query Language â€” read-only language for log analysis |
| **Alerts** | Notifications triggered by conditions (metric/log/activity) |
| **Action groups** | Define who is notified and how when alerts fire |
| **Application Insights** | APM tool for monitoring live web applications |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'az900-24-q1',
      question: 'Which Azure service collects and analyzes telemetry from Azure resources?',
      options: ['Azure Advisor', 'Azure Monitor', 'Azure Service Health', 'Azure Policy'],
      correctAnswer: 1,
      explanation: 'Azure Monitor collects, analyzes, and acts on telemetry data from Azure resources, on-premises environments, and multi-cloud environments.'
    },
    {
      id: 'az900-24-q2',
      question: 'What tool within Azure Monitor allows you to write queries to analyze log data?',
      options: ['Metrics Explorer', 'Log Analytics', 'Azure Advisor', 'Application Insights'],
      correctAnswer: 1,
      explanation: 'Log Analytics is the tool within Azure Monitor that allows you to write KQL (Kusto Query Language) queries to analyze log data stored in Log Analytics workspaces.'
    },
    {
      id: 'az900-24-q3',
      question: 'A team wants to be notified by email when VM CPU usage exceeds 90% for more than 5 minutes. What should they configure?',
      options: ['Azure Policy', 'A metric alert with an action group', 'A resource lock', 'Azure Advisor'],
      correctAnswer: 1,
      explanation: 'A metric alert monitors numerical metrics (like CPU %). Combined with an action group (configured for email), it sends notifications when the threshold is crossed for the specified duration.'
    },
    {
      id: 'az900-24-q4',
      question: 'Which Azure Monitor feature is specifically designed to monitor live web applications?',
      options: ['Log Analytics', 'Metrics Explorer', 'Application Insights', 'Azure Advisor'],
      correctAnswer: 2,
      explanation: 'Application Insights is an APM (Application Performance Management) feature within Azure Monitor. It monitors live web applications, detecting performance anomalies, failures, and user behavior.'
    },
    {
      id: 'az900-24-q5',
      question: 'What is the difference between Azure Monitor Metrics and Azure Monitor Logs?',
      options: ['Metrics are free; Logs are paid', 'Metrics are time-series numerical data; Logs are detailed event records', 'They are the same thing', 'Metrics monitor VMs only; Logs monitor everything else'],
      correctAnswer: 1,
      explanation: 'Metrics are lightweight numerical time-series data (CPU %, memory, request count) ideal for real-time monitoring. Logs are rich, detailed event records that support complex analysis via KQL queries.'
    }
  ]}
/>

## ðŸŽ‰ Congratulations!

You've completed all 24 AZ-900 challenges! Here's what to do next:

1. **Review** the [Coverage Matrix](/docs/az-900/coverage-matrix) to ensure you've covered all exam skills
2. **Take** the [Microsoft Practice Assessment](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-900/practice/assessment?assessment-type=practice&assessmentId=23)
3. **Schedule** your exam at [Pearson VUE](https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/)
4. **Next step**: Consider [AZ-104: Azure Administrator](/docs/az-104/overview) for deeper hands-on skills

## Learn More

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) â€” Curated study materials
- [Microsoft Learn: Describe monitoring tools in Azure](https://learn.microsoft.com/en-us/training/modules/describe-monitoring-tools-azure/)
- [Azure Monitor documentation](https://learn.microsoft.com/en-us/azure/azure-monitor/)
- [Application Insights documentation](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
