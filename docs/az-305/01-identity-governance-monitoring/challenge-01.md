---
sidebar_position: 1
title: "Challenge 01: Design a Centralized Logging Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Challenge 01: Design a Centralized Logging Solution

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-15 | **Exam Weight: 25-30%**

:::

## Introduction

Northwind Traders is a mid-size retail company that has grown rapidly through acquisitions. They now operate workloads across three Azure subscriptions: one for corporate IT, one for their e-commerce platform, and one for their data analytics team. Each team has been managing logs independently, resulting in blind spots when troubleshooting cross-team incidents and no unified view for security audits.

The CTO has mandated a centralized logging strategy that provides a single pane of glass for operational visibility while respecting data sovereignty requirements (EU data must stay in EU regions). The security team needs access to all security-relevant logs, but the analytics team should only see their own application logs. Monthly log volume is estimated at 50 GB for corporate IT, 200 GB for e-commerce, and 100 GB for analytics.

Your task is to design a Log Analytics workspace architecture that balances cost efficiency, access control, compliance requirements, and operational simplicity.

## Exam Skills Covered

- Recommend a logging solution
- Recommend a solution for routing logs
- Recommend a monitoring solution

## Design Tasks

### Part 1: Workspace Architecture Decision

1. Evaluate the following workspace strategies for Northwind Traders and recommend one with justification:
   - Single centralized workspace
   - One workspace per subscription
   - One workspace per team/function
   - Hybrid approach (security workspace + operational workspaces)

2. Document the trade-offs of your chosen architecture using this decision matrix:

<DecisionMatrix
  title="Log Analytics Workspace Architecture"
  headers={["Single Workspace", "Per-Subscription", "Per-Team", "Hybrid"]}
  rows={[
    {criteria: "Access control granularity", values: ["Limited - table-level RBAC only", "Good - natural subscription boundary", "Excellent - full isolation per team", "Best - security isolated + team access via resource-context"]},
    {criteria: "Cross-resource correlation", values: ["Excellent - all data in one place", "Difficult - requires cross-workspace queries", "Difficult - queries span multiple workspaces", "Good - security correlated centrally, operational per team"]},
    {criteria: "Cost optimization", values: ["Best - single commitment tier at highest volume discount", "Moderate - lower volume per workspace reduces tier discounts", "Poor - each workspace has low volume, no tier discounts", "Good - security workspace at high tier, operational at lower tiers"]},
    {criteria: "Compliance/data residency", values: ["Cannot satisfy - single region only", "Partially - if subscriptions map to regions", "Can satisfy - team workspaces in required regions", "Best - regional workspaces where required, central for non-regulated"]},
    {criteria: "Management overhead", values: ["Lowest - one workspace to manage", "Moderate - 3 workspaces", "High - one per team, grows with org", "Moderate - 2-3 workspaces with clear purpose"]}
  ]}
  storageKey="az305-challenge-01"
/>

3. Determine the appropriate region(s) for your workspace(s) considering the EU data residency requirement.

### Part 2: Deploy and Configure the Workspace

4. Create the Log Analytics workspace(s) according to your design using Azure CLI.

5. Configure the workspace data retention policy:
   - Security logs: 365 days (compliance requirement)
   - Operational logs: 90 days
   - Performance data: 30 days

6. Set up table-level retention where different data types require different retention periods.

### Part 3: Access Control Design

7. Design an access model that satisfies these requirements:
   - Security team: read access to all security logs across all workspaces
   - E-commerce team: read/write access to only their application logs
   - Analytics team: read access to only their own workspace
   - Platform team: full admin access to all workspaces

8. Implement resource-context vs. workspace-context access control where appropriate.

### Part 4: Cost Management

9. Evaluate commitment tier pricing vs. pay-as-you-go for the expected 350 GB/day total ingestion volume.

10. Design a strategy to reduce ingestion costs for verbose but low-priority logs (e.g., debug-level application logs).

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-01"
  items={[
    "Documented workspace architecture decision with clear justification for chosen approach",
    "Log Analytics workspace(s) deployed in appropriate region(s)",
    "Data retention configured per table with compliance-appropriate durations",
    "Access control model designed using resource-context or workspace-context permissions",
    "Commitment tier pricing evaluated with cost comparison documented",
    "EU data residency requirement addressed in the design"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Workspace Architecture Best Practice</summary>

Microsoft recommends minimizing the number of workspaces. A single workspace provides the easiest cross-resource correlation and simplifies management. However, you need multiple workspaces when:
- Data residency requirements mandate regional separation
- Strict access isolation is needed (beyond what table-level RBAC provides)
- You need separate billing boundaries

For most organizations, a hybrid approach with a central security workspace (Microsoft Sentinel) plus one or two operational workspaces is optimal.

</details>

<details>
<summary>Hint 2: Creating a Log Analytics Workspace</summary>

```bash
# Create resource group
az group create --name rg-logging-centralus --location centralus

# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group rg-logging-centralus \
  --workspace-name law-northwind-central \
  --location centralus \
  --retention-time 90 \
  --sku PerGB2018

# Create EU workspace for data residency
az monitor log-analytics workspace create \
  --resource-group rg-logging-westeurope \
  --workspace-name law-northwind-eu \
  --location westeurope \
  --retention-time 90
```

</details>

<details>
<summary>Hint 3: Table-Level Retention</summary>

You can set different retention periods per table within a workspace. This is key for balancing compliance (long retention for security) with cost (short retention for verbose logs):

```bash
# Set SecurityEvent table to 365 days
az monitor log-analytics workspace table update \
  --resource-group rg-logging-centralus \
  --workspace-name law-northwind-central \
  --name SecurityEvent \
  --retention-time 365

# Set Perf table to 30 days
az monitor log-analytics workspace table update \
  --resource-group rg-logging-centralus \
  --workspace-name law-northwind-central \
  --name Perf \
  --retention-time 30
```

</details>

<details>
<summary>Hint 4: Access Control Options</summary>

Log Analytics supports two access modes:
- **Workspace-context**: User gets access to all logs in the workspace based on workspace-level permissions
- **Resource-context**: User accesses logs for a specific resource through that resource's RBAC (requires `Log Analytics Reader` plus resource access)

For the e-commerce team, resource-context is ideal because they only need to see logs from their own resources, without needing direct workspace permissions.

```bash
# Grant workspace-level access to security team
az role assignment create \
  --assignee security-team@northwind.com \
  --role "Log Analytics Reader" \
  --scope /subscriptions/{sub-id}/resourceGroups/rg-logging/providers/Microsoft.OperationalInsights/workspaces/law-northwind-central
```

</details>

<details>
<summary>Hint 5: Commitment Tier Pricing</summary>

At 350 GB/day total ingestion, the 300 GB/day commitment tier offers significant savings over pay-as-you-go. Key pricing considerations:
- Pay-as-you-go: billed per GB ingested
- Commitment tiers: 100, 200, 300, 400, 500+ GB/day with increasing discounts
- Data retained beyond the included period (first 31 days free) is charged per GB/month
- Basic Logs tier is cheaper for high-volume, infrequently queried data

Compare: 300 GB commitment tier + 50 GB overage vs. 400 GB commitment tier with unused capacity.

</details>

## Learning Resources

- [Design a Log Analytics workspace architecture](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/workspace-design)
- [Azure Monitor Logs overview](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-platform-logs)
- [Manage access to Log Analytics workspaces](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/manage-access)
- [Azure Monitor pricing](https://learn.microsoft.com/en-us/azure/azure-monitor/cost-usage)
- [Configure data retention and archive](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-configure)
- [Basic Logs in Azure Monitor](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/basic-logs-configure)

## Knowledge Check

<details>
<summary>1. Northwind Traders has 350 GB/day of log ingestion split across three teams. The security team needs to query all logs, but the analytics team should only see their own data. What is the most cost-effective workspace architecture?</summary>

**A hybrid approach with a single workspace using resource-context access control** is most cost-effective. A single workspace qualifies for the 300 GB/day commitment tier (significant discount), while resource-context RBAC ensures the analytics team only sees logs from their own resources. The security team gets workspace-level Log Analytics Reader for full visibility. Only add a second workspace if EU data residency requires physical separation.

</details>

<details>
<summary>2. A company needs to retain security logs for 7 years but wants to minimize costs. What combination of features should they use?</summary>

**Use table-level retention with archive tier.** Set interactive retention to 90 days for active querying, then configure total retention (archive) for 2,555 days (7 years). Archived data costs significantly less than interactive retention but requires a search job or restore to query. Alternatively, export logs to a Storage Account with cool/archive tier for the cheapest long-term storage.

</details>

<details>
<summary>3. What is the difference between workspace-context and resource-context access control in Log Analytics?</summary>

**Workspace-context** grants users access to all data in the workspace based on their role assignment at the workspace level (e.g., Log Analytics Reader on the workspace). **Resource-context** allows users to view logs only for resources they already have read access to, without needing explicit workspace permissions. Resource-context is enabled by the workspace access control mode setting and is preferred for granular, resource-level access without exposing unrelated data.

</details>

<details>
<summary>4. When should you use multiple Log Analytics workspaces instead of a single workspace?</summary>

Use multiple workspaces when: (1) Data sovereignty/residency requirements mandate different geographic locations, (2) You need hard billing boundaries between business units, (3) You have strict tenant isolation requirements (multi-tenant service providers), or (4) Compliance requires data segregation that cannot be achieved with table-level RBAC. Avoid multiple workspaces solely for access control since resource-context and table-level RBAC handle most scenarios within a single workspace.

</details>

## Cleanup

```bash
# Delete resource groups containing Log Analytics workspaces
az group delete --name rg-logging-centralus --yes --no-wait
az group delete --name rg-logging-westeurope --yes --no-wait
```

---

**Next**: [Challenge 02: Design Log Routing and Filtering](/docs/az-305/identity-governance-monitoring/challenge-02)
