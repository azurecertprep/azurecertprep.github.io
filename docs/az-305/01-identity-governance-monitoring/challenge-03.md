---
sidebar_position: 3
title: "Challenge 03: Design a Monitoring and Alerting Strategy"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Challenge 03: design a monitoring and alerting strategy

:::info Estimated Time and Cost

**75-90 min** | **Estimated cost**: $5-15 | **Exam Weight: 25-30%**

:::

## Introduction

TailSpin Toys operates a global e-commerce platform built on Azure. Their architecture includes an Azure Front Door for global load balancing, Azure App Services in two regions (East US and West Europe), Azure SQL Database with geo-replication, Azure Cache for Redis, and Azure Functions for order processing. The platform handles 50,000 concurrent users during peak hours and has defined the following service level objectives (SLOs):

- Homepage load time: under 2 seconds (p95)
- API response time: under 500ms (p95)
- Order processing: completed within 30 seconds
- Platform availability: 99.95% monthly uptime

Currently, the team only discovers outages when customers complain on social media. There are no proactive alerts, no dashboards for executive visibility, and no automated remediation. Last Black Friday, a Redis cache exhaustion issue caused a 45-minute outage that cost $2M in lost revenue. The operations team wants to detect and respond to similar issues automatically in the future.

Your task is to design a comprehensive monitoring and alerting strategy that provides early warning of degradation, automated responses to known failure patterns, and executive-level visibility into platform health.

## Exam skills covered

- Recommend a monitoring solution
- Recommend a logging solution
- Recommend a solution for routing logs

## Design tasks

### Part 1: monitoring architecture design

1. Design the monitoring stack for TailSpin Toys, specifying:
   - Which Azure Monitor features to use for each tier (infrastructure, application, business)
   - Where Application Insights fits vs. Azure Monitor Metrics vs. Log Analytics
   - How to achieve end-to-end transaction tracing across Front Door, App Service, Functions, and SQL

2. Create a monitoring coverage matrix:

<DecisionMatrix
  title="Monitoring Coverage Matrix"
  headers={["Metrics to Monitor", "Alert Threshold", "Data Source"]}
  rows={[
    {criteria: "Front Door", values: ["Request count, latency (p95), backend health, WAF blocked requests, origin response time", "Latency p95 > 500ms, backend health < 80%, error rate > 1%", "Azure Monitor Metrics (platform metrics) + diagnostic settings to Log Analytics"]},
    {criteria: "App Service", values: ["CPU %, memory %, HTTP 5xx count, response time (p95), thread count, request queue length", "CPU > 70% for 5min, HTTP 5xx > 10/min, response time p95 > 2s", "App Service Metrics + Application Insights (custom telemetry, dependency tracking)"]},
    {criteria: "SQL Database", values: ["DTU/vCore utilization, connection count, deadlocks, long-running queries, storage %", "DTU > 80% for 10min, deadlocks > 5/hour, storage > 85%", "Azure SQL Analytics + Query Performance Insight + diagnostic settings"]},
    {criteria: "Redis Cache", values: ["Memory usage %, server load %, cache hits/misses, connected clients, evicted keys", "Memory > 80%, server load > 70%, cache hit ratio < 90%", "Azure Monitor Metrics + Redis diagnostics to Log Analytics"]},
    {criteria: "Azure Functions", values: ["Execution count, duration, failure rate, queue length (for queue triggers), throttle count", "Failure rate > 5%, duration p95 > 10s, queue length > 1000", "Application Insights (integrated) + Function-level diagnostic settings"]}
  ]}
  storageKey="az305-challenge-03"
/>

### Part 2: alert design

3. Design alert rules for each SLO, specifying:
   - Metric or log-based alert type
   - Evaluation frequency and aggregation window
   - Severity level (0-4)
   - Dynamic vs. static thresholds (and why)

4. Design a multi-stage alerting strategy:
   - Warning (early degradation): Notify operations channel
   - Critical (SLO breach imminent): Page on-call engineer
   - Emergency (active outage): Trigger automated remediation + page leadership

5. Design action groups for each alert severity:
   - Notification channels (email, SMS, Teams, PagerDuty)
   - Automated actions (Azure Functions, Logic Apps, runbooks)
   - Escalation paths

### Part 3: automated remediation

6. Design an automated response for the Redis cache exhaustion scenario:
   - Detection: What metric/pattern indicates cache pressure before failure?
   - Response: What automated action prevents the outage?
   - Validation: How do you verify the remediation worked?

7. Design autoscale rules for App Service that respond to:
   - CPU utilization exceeding 70% for 5 minutes
   - HTTP queue length exceeding 100 requests
   - Custom metric: orders-per-second exceeding capacity threshold

### Part 4: dashboards and workbooks

8. Design an executive dashboard showing:
   - Current SLO compliance (uptime percentage this month)
   - Revenue at risk (based on error rates)
   - Regional health comparison
   - Trend analysis (week-over-week performance)

9. Design an operational workbook for the on-call engineer that provides:
   - Real-time service health across all components
   - Drill-down from high-level health to specific failing requests
   - Correlation of alerts with deployment events

### Part 5: deploy proof of concept

10. Deploy Application Insights and configure at least one alert rule with an action group that demonstrates the end-to-end alerting pipeline.

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-03"
  items={[
    "Monitoring coverage matrix completed for all platform components with appropriate metrics and thresholds",
    "Alert rules designed for all four SLOs with appropriate severity and frequency",
    "Action groups defined with clear escalation paths from warning to emergency",
    "Automated remediation designed for at least one known failure scenario",
    "Autoscale rules designed with appropriate metrics and cooldown periods",
    "Application Insights deployed with at least one working alert rule"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Application Insights vs. Azure Monitor Metrics</summary>

Use **Application Insights** for:
- Application-level metrics (request duration, failure rate, dependency calls)
- End-to-end distributed tracing (correlation across services)
- Availability tests (synthetic monitoring)
- Custom business metrics (orders/second, cart abandonment)

Use **Azure Monitor platform metrics** for:
- Infrastructure metrics (CPU, memory, disk, network)
- Service-specific metrics (SQL DTU, Redis cache hits, Function executions)
- Autoscale trigger signals
- Near real-time alerting (1-minute granularity)

Application Insights data flows to a Log Analytics workspace, so you can correlate application telemetry with infrastructure logs using KQL.

</details>

<details>
<summary>Hint 2: Creating Alert Rules</summary>

```bash
# Create a resource group for monitoring resources
az group create --name rg-monitoring --location eastus

# Create Application Insights
az monitor app-insights component create \
  --app appins-tailspin-prod \
  --location eastus \
  --resource-group rg-monitoring \
  --workspace "/subscriptions/{sub}/resourceGroups/rg-logging/providers/Microsoft.OperationalInsights/workspaces/law-tailspin"

# Create action group
az monitor action-group create \
  --name ag-ops-critical \
  --resource-group rg-monitoring \
  --short-name OpsCrit \
  --action email ops-team ops-oncall@tailspintoys.com \
  --action sms oncall 1 5551234567

# Create metric alert for App Service response time
az monitor metrics alert create \
  --name "alert-response-time-p95" \
  --resource-group rg-monitoring \
  --scopes "/subscriptions/{sub}/resourceGroups/rg-app/providers/Microsoft.Web/sites/app-tailspin-prod" \
  --condition "avg HttpResponseTime > 500" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action ag-ops-critical \
  --description "P95 response time exceeding 500ms SLO"
```

</details>

<details>
<summary>Hint 3: Dynamic Thresholds vs. Static Thresholds</summary>

**Static thresholds** work well when you have clear, fixed SLO targets (e.g., response time must be under 500ms). They are predictable and easy to reason about.

**Dynamic thresholds** use machine learning to establish baseline patterns and detect anomalies. They are ideal for:
- Metrics with daily/weekly seasonality (traffic patterns)
- Scenarios where absolute values vary but deviation from normal matters
- Reducing alert noise from expected spikes (batch jobs, deployments)

For TailSpin Toys:
- Use **static thresholds** for SLO-bound metrics (response time, availability)
- Use **dynamic thresholds** for capacity planning signals (CPU, memory, queue depth) where normal varies by time of day

</details>

<details>
<summary>Hint 4: Autoscale Configuration</summary>

```bash
# Create autoscale settings for App Service plan
az monitor autoscale create \
  --resource-group rg-app \
  --name autoscale-tailspin \
  --resource "/subscriptions/{sub}/resourceGroups/rg-app/providers/Microsoft.Web/serverFarms/plan-tailspin-prod" \
  --min-count 2 \
  --max-count 10 \
  --count 3

# Add scale-out rule: CPU > 70% for 5 minutes
az monitor autoscale rule create \
  --resource-group rg-app \
  --autoscale-name autoscale-tailspin \
  --condition "CpuPercentage > 70 avg 5m" \
  --scale out 2

# Add scale-in rule: CPU < 30% for 10 minutes
az monitor autoscale rule create \
  --resource-group rg-app \
  --autoscale-name autoscale-tailspin \
  --condition "CpuPercentage < 30 avg 10m" \
  --scale in 1 \
  --cooldown 10
```

Key design considerations:
- Always set a cooldown period (5-10 min) to prevent flapping
- Scale out aggressively (by 2), scale in conservatively (by 1)
- Use multiple metrics (CPU AND queue length) for scale-out decisions

</details>

<details>
<summary>Hint 5: Automated Remediation with Action Groups</summary>

Action groups can trigger automated responses:
- **Azure Automation Runbook**: For complex multi-step remediation (e.g., scale Redis, flush stale keys, verify connectivity)
- **Azure Function**: For lightweight custom logic
- **Logic App**: For workflow orchestration with approval gates
- **Webhook**: For integration with external incident management (PagerDuty, ServiceNow)

For the Redis exhaustion scenario, an Automation Runbook could:
1. Detect: Alert fires when `usedmemorypercentage` exceeds 85%
2. Act: Scale Redis to next tier, or flush low-priority cached items
3. Validate: Check that memory percentage drops below 70%
4. Notify: Post to Teams channel with action taken

</details>

## Learning resources

- [Azure Monitor overview](https://learn.microsoft.com/en-us/azure/azure-monitor/overview)
- [Application Insights overview](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [Azure Monitor alerts overview](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview)
- [Autoscale in Azure Monitor](https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-overview)
- [Azure Monitor workbooks](https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-overview)
- [Create and manage action groups](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/action-groups)
- [Distributed tracing with Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/distributed-trace-data)

## Knowledge check

<details>
<summary>1. TailSpin Toys needs to detect when their order processing pipeline exceeds 30 seconds. Orders are processed by Azure Functions triggered by Service Bus. Which monitoring approach provides the most accurate measurement?</summary>

**Use Application Insights distributed tracing with end-to-end transaction correlation.** Instrument the Function App with Application Insights SDK to track the entire dependency chain from Service Bus message receipt through database writes. Create a custom metric or use a log-based alert with a KQL query against the `requests` table filtering by operation name and duration. Platform metrics alone (Function execution time) would miss time spent waiting in the Service Bus queue.

</details>

<details>
<summary>2. The operations team receives 200+ alert emails daily and has started ignoring them. How should you redesign the alerting strategy to reduce noise while maintaining coverage?</summary>

**Implement alert severity tiering with appropriate routing and suppression.** (1) Review and eliminate duplicate/redundant alerts. (2) Use dynamic thresholds instead of static for metrics with natural variation. (3) Implement alert processing rules to suppress known maintenance windows. (4) Group related alerts using smart groups. (5) Route only Sev 0-1 alerts to pager, Sev 2 to Teams channel, Sev 3-4 to dashboard only. (6) Set appropriate evaluation frequency (not every minute for non-critical metrics).

</details>

<details>
<summary>3. During Black Friday, traffic increases 10x. The autoscale rules currently scale based on CPU utilization. What design improvement would provide faster scaling?</summary>

**Add schedule-based autoscale profiles combined with predictive metrics.** (1) Create a recurring autoscale profile that pre-scales to a higher instance count before known traffic events (Black Friday, flash sales). (2) Add HTTP queue length as an additional scale-out trigger, which responds faster than CPU (queue builds before CPU saturates). (3) Consider a custom metric from Application Insights (requests/second) as an early signal. (4) Reduce the lookback window for scale-out rules from 10 minutes to 5 minutes during peak periods.

</details>

<details>
<summary>4. The security team wants to be alerted when more than 50 failed login attempts occur within 5 minutes from the same IP address. Should this be a metric alert or a log-based alert?</summary>

**This should be a log-based alert (log search alert rule).** The condition requires aggregation by IP address and counting events matching specific criteria over a time window -- this logic requires a KQL query against sign-in logs in Log Analytics. Metric alerts cannot perform grouping by arbitrary dimensions like IP address with count aggregation. The KQL query would be: `SigninLogs | where ResultType != 0 | summarize FailCount=count() by IPAddress, bin(TimeGenerated, 5m) | where FailCount > 50`.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge03 --location eastus
```

2. Deploy an Application Insights resource:

```bash
az monitor app-insights component create \
  --app appi-monitoring-lab \
  --location eastus \
  --resource-group rg-az305-challenge03 \
  --kind web \
  --application-type web
```

3. Create an availability (ping) test:

```bash
APPI_ID=$(az monitor app-insights component show \
  --app appi-monitoring-lab \
  --resource-group rg-az305-challenge03 \
  --query id -o tsv)
az monitor app-insights web-test create \
  --resource-group rg-az305-challenge03 \
  --name "availability-test-lab" \
  --defined-web-test-name "Homepage Ping" \
  --location eastus \
  --frequency 300 \
  --timeout 30 \
  --web-test-kind standard \
  --request-url "https://azure.microsoft.com" \
  --expected-status-code 200 \
  --locations '[{"Id":"us-il-ch1-azr"}]' \
  --tags "hidden-link:$APPI_ID=Resource"
```

4. Create a metric alert rule on failed availability:

```bash
az monitor metrics alert create \
  --name "alert-availability-failed" \
  --resource-group rg-az305-challenge03 \
  --scopes "$APPI_ID" \
  --condition "avg availabilityResults/availabilityPercentage < 90" \
  --description "Availability dropped below 90 percent" \
  --evaluation-frequency 5m \
  --window-size 15m \
  --severity 2
```

5. Verify the alert rule was created:

```bash
az monitor metrics alert list \
  --resource-group rg-az305-challenge03 \
  --query "[].{name:name, severity:severity, enabled:enabled}" -o table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge03 --yes --no-wait
```

---

**Next**: [Challenge 04: Design Authentication for Cloud-Native Apps](/docs/az-305/identity-governance-monitoring/challenge-04)
