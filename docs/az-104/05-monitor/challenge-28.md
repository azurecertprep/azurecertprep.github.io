---
sidebar_position: 28
title: "Challenge 28: Azure Advisor & Service Health"
---

# Challenge 28: Azure Advisor & Service Health

:::info Estimated Time and Cost

**45-60 minutes** | **Estimated cost**: ~$0.00 (Advisor and Service Health are free) | **Exam Weight: 5-10%**

:::

## Scenario

Contoso Ltd. wants proactive monitoring with actionable recommendations across security, performance, cost, reliability, and operational excellence. The CTO has requested that the team regularly reviews Azure Advisor recommendations, tracks improvement over time, and sets up alerts for service health events (outages, planned maintenance, and health advisories) so they are never caught off guard.

## Exam Skills Covered

- Review and interpret Azure Advisor recommendations
- Configure Advisor alerts for new recommendations
- Suppress or postpone Advisor recommendations
- Configure Service Health alerts (service issues, planned maintenance, health advisories)
- Check Resource Health for specific resources
- Create action groups for notifications
- Understand Advisor score and improvement tracking

## Sysadmin ↔ Azure Reference

| On-Prem / Traditional | Azure Equivalent |
|---|---|
| Security audit / penetration test results | Advisor Security recommendations |
| Capacity planning reviews | Advisor Performance recommendations |
| Cost optimization meetings | Advisor Cost recommendations |
| Vendor maintenance notifications | Service Health (planned maintenance) |
| Status page (status.cloud.com) | Azure Service Health / Status |
| Hardware health monitoring (IPMI/iLO) | Resource Health |
| Best practices checklist (CIS benchmarks) | Advisor Operational Excellence |
| Remediation tracking spreadsheet | Advisor Score |

## Setup

```bash
# Variables
RG="rg-az104-challenge28"
LOCATION="eastus"

# Create resource group (for action groups and alert rules)
az group create --name $RG --location $LOCATION
```

:::tip No Infrastructure Needed

This challenge primarily uses Azure Advisor and Service Health, which analyze your existing subscription resources. You do not need to deploy VMs or services for this lab | Advisor analyzes whatever already exists in your subscription.

:::
## Tasks

### Task 1: Review Azure Advisor Recommendations

```bash
# List all Advisor recommendations for the subscription
az advisor recommendation list -o table

# Filter by category: Cost
az advisor recommendation list \
  --category Cost -o table

# Filter by category: Security
az advisor recommendation list \
  --category Security -o table

# Filter by category: Performance
az advisor recommendation list \
  --category Performance -o table

# Filter by category: Reliability (High Availability)
az advisor recommendation list \
  --category HighAvailability -o table

# Filter by category: Operational Excellence
az advisor recommendation list \
  --category OperationalExcellence -o table

# Get detailed information about a specific recommendation
# az advisor recommendation list --category Cost --query "[0]"
```

**Portal Steps:**
1. Navigate to **Azure Advisor** in the portal
2. Review the dashboard showing recommendations by category
3. Click into each category to see detailed recommendations
4. Each recommendation shows: Impact (High/Medium/Low), affected resources, and remediation steps

### Task 2: Understand Advisor Score

**Portal Steps:**
1. Navigate to **Advisor** > **Advisor Score**
2. View the overall score (0-100%) and per-category scores
3. Each category contributes to the overall score:
   - Reliability
   - Security
   - Performance
   - Cost
   - Operational Excellence

```bash
# Check Advisor configuration (what resource groups are included)
az advisor configuration list -o table

# Configure Advisor to exclude specific resource groups (if needed)
az advisor configuration update \
  --exclude \
  --resource-group "rg-dev-sandbox"
```

:::tip Advisor Score

Advisor Score represents the percentage of Advisor recommendations that have been addressed. A score of 100% means all recommendations are resolved. Use it to:
- Track improvement over time
- Compare across subscriptions
- Set organizational targets (e.g., maintain above 80%)

:::
### Task 3: Suppress or Postpone Recommendations

```bash
# List current recommendations
az advisor recommendation list --category Cost -o table

# Suppress (dismiss) a recommendation permanently
# Get the recommendation ID first
RECOMMENDATION_ID=$(az advisor recommendation list \
  --category Cost \
  --query "[0].id" -o tsv)

# Suppress for a specific resource
if [ -n "$RECOMMENDATION_ID" ]; then
  az advisor recommendation disable \
    --ids "$RECOMMENDATION_ID" \
    --days 30
fi
```

**Portal Steps:**
1. Navigate to **Advisor** > Select a recommendation
2. Click **Dismiss** or **Postpone**
3. Choose duration: 1 day, 1 week, 1 month, or forever
4. Optionally add a reason (e.g., "Accepted risk for dev environment")

:::tip When to Suppress

Suppress recommendations when:
- The recommendation does not apply to your scenario (e.g., cost savings for intentionally oversized dev VMs)
- You have compensating controls in place
- The risk is acknowledged and accepted
- The recommendation is a false positive for your workload

:::
### Task 4: Configure Advisor Alerts

```bash
# First, create an action group for notifications
az monitor action-group create \
  --resource-group $RG \
  --name ag-advisor-notifications \
  --short-name AdvisorAG \
  --action email ops-team opsTeam@contoso.com

# Create an Advisor alert for new cost recommendations
az advisor recommendation list --category Cost > /dev/null 2>&1

# Create activity log alert for new Advisor recommendations
az monitor activity-log alert create \
  --resource-group $RG \
  --name "alert-advisor-cost" \
  --description "Alert when new Cost Advisor recommendations appear" \
  --action-group ag-advisor-notifications \
  --condition category=Recommendation \
  --condition operationName="Microsoft.Advisor/recommendations/available/action"
```

**Portal Steps:**
1. Navigate to **Advisor** > **Alerts**
2. Click **New alert**
3. Configure:
   - Category: Cost (or All)
   - Impact: High, Medium (select as needed)
   - Action group: Select or create
4. Click **Create alert rule**

### Task 5: Configure Service Health Alerts

```bash
# Create alert for service issues (outages) in your region
az monitor activity-log alert create \
  --resource-group $RG \
  --name "alert-service-issues" \
  --description "Alert for Azure service issues affecting our resources" \
  --action-group ag-advisor-notifications \
  --condition category=ServiceHealth \
  --condition "properties.incidentType=Incident"

# Create alert for planned maintenance
az monitor activity-log alert create \
  --resource-group $RG \
  --name "alert-planned-maintenance" \
  --description "Alert for planned maintenance events" \
  --action-group ag-advisor-notifications \
  --condition category=ServiceHealth \
  --condition "properties.incidentType=Maintenance"

# Create alert for health advisories
az monitor activity-log alert create \
  --resource-group $RG \
  --name "alert-health-advisories" \
  --description "Alert for action-required service health events" \
  --action-group ag-advisor-notifications \
  --condition category=ServiceHealth \
  --condition "properties.incidentType=ActionRequired"

# List all activity log alerts
az monitor activity-log alert list \
  --resource-group $RG -o table
```

**Portal Steps:**
1. Navigate to **Service Health** > **Health alerts**
2. Click **Create service health alert**
3. Configure:
   - Subscription: Select your subscription
   - Services: Select specific services (or All)
   - Regions: Select your regions (e.g., East US)
   - Event types: Service issue, Planned maintenance, Health advisory, Security advisory
4. Select action group
5. Name the alert rule and click **Create**

### Task 6: Check Resource Health

```bash
# Check availability/health status of specific resources
# Resource Health is primarily a Portal feature, but you can query via REST

# Check VM health via CLI
az vm get-instance-view \
  --ids $(az vm list -g $RG --query "[].id" -o tsv 2>/dev/null) \
  --query "[].{Name:name, Status:instanceView.statuses[1].displayStatus}" -o table 2>/dev/null

# List resource health events via Activity Log
az monitor activity-log list \
  --resource-group $RG \
  --max-events 20 \
  --query "[?category.value=='ResourceHealth'].{Time:eventTimestamp, Resource:resourceId, Status:status.value}" -o table 2>/dev/null
```

**Portal Steps:**
1. Navigate to **Service Health** > **Resource Health**
2. Filter by subscription, resource type, and resource group
3. Check the health status of each resource:
   - **Available**: Resource is healthy
   - **Unavailable**: Azure detected an issue affecting the resource
   - **Degraded**: Performance issues detected
   - **Unknown**: No health signal received

4. Navigate to a specific resource > **Resource Health** blade
5. View historical health events and root cause analysis

### Task 7: Create Action Groups for Notifications

```bash
# Create a comprehensive action group with multiple notification channels
az monitor action-group create \
  --resource-group $RG \
  --name ag-critical-alerts \
  --short-name CritAlert \
  --action email cto-email cto@contoso.com \
  --action email ops-email ops@contoso.com \
  --action sms ops-sms 1 5551234567

# Create an action group with webhook (for integration with ITSM tools)
az monitor action-group create \
  --resource-group $RG \
  --name ag-webhook-itsm \
  --short-name ITSM \
  --action webhook servicenow-hook "https://contoso.service-now.com/api/webhook"

# List action groups
az monitor action-group list --resource-group $RG -o table

# Test an action group (sends test notifications)
AG_ID=$(az monitor action-group show \
  --resource-group $RG \
  --name ag-critical-alerts \
  --query "id" -o tsv)

# az monitor action-group test-notifications create \
#   --resource-group $RG \
#   --action-group-name ag-critical-alerts \
#   --alert-type servicehealth \
#   --notifications '[{"notificationType":"Email","emailAddress":"ops@contoso.com"}]'
```

### Task 8: Review Service Health Dashboard

**Portal Steps:**
1. Navigate to **Service Health** in the portal
2. Review the four sections:
   - **Service issues**: Current outages affecting your resources
   - **Planned maintenance**: Upcoming maintenance events
   - **Health advisories**: Recommendations and action items
   - **Security advisories**: Security-related notifications
3. Click on any active event to see:
   - Affected services and regions
   - Timeline of updates
   - Root cause (after resolution)
   - Recommended actions
4. Check **Health history** for past events

### Task 9: Implement Advisor Recommendations

```bash
# Example: Implement a common Advisor recommendation
# (Right-size or shut down underutilized VMs)

# List VMs with recommendations
az advisor recommendation list \
  --category Cost \
  --query "[?contains(shortDescription.problem, 'virtual machine')]" -o table

# Example: Resize a VM based on Advisor recommendation
# az vm resize --resource-group $RG --name vm-oversize --size Standard_B1s

# Example: Enable soft-delete on Key Vault (security recommendation)
# az keyvault update --name my-kv --enable-soft-delete true

# After implementing, refresh Advisor to verify
az advisor recommendation list --category Cost -o table
```

**Portal Steps:**
1. Navigate to **Advisor** > Select a recommendation
2. Click **View recommendation details**
3. Review the affected resources
4. Click **Remediate** (for recommendations with quick-fix)
5. Or follow the manual steps provided

## Success Criteria

- [ ] Advisor recommendations reviewed across all five categories
- [ ] Advisor Score viewed and understood
- [ ] At least one recommendation suppressed/postponed with reason
- [ ] Advisor alert configured for new recommendations
- [ ] Service Health alerts configured for: service issues, planned maintenance, and health advisories
- [ ] Resource Health checked for specific resources
- [ ] Action groups created with email (and optionally SMS/webhook) notifications
- [ ] Service Health dashboard explored (issues, maintenance, advisories)
- [ ] At least one Advisor recommendation implemented or acknowledged

## Break & Fix Scenarios

### Scenario A: Alert Not Firing

```bash
# Check if action group is correctly configured
az monitor action-group show \
  --resource-group $RG \
  --name ag-advisor-notifications

# Check if alert rule is enabled
az monitor activity-log alert list \
  --resource-group $RG \
  --query "[].{Name:name, Enabled:enabled}" -o table

# Common causes:
# 1. Action group has invalid email/phone
# 2. Alert rule is disabled
# 3. Condition scope is too narrow (wrong region/service)
# 4. Email is going to spam/junk folder

# Fix: Enable the alert rule
az monitor activity-log alert update \
  --resource-group $RG \
  --name "alert-service-issues" \
  --enabled true
```

### Scenario B: Too Many Notifications (Alert Fatigue)

```bash
# Problem: Getting too many low-impact Advisor notifications

# Fix 1: Suppress low-priority recommendations
az advisor recommendation disable \
  --ids "<recommendation-id>" \
  --days 90

# Fix 2: Create separate action groups for different severities
# High impact -> email + SMS + webhook
# Medium/Low -> email only

# Fix 3: Use alert processing rules to suppress during maintenance windows
az monitor alert-processing-rule create \
  --resource-group $RG \
  --name "suppress-weekends" \
  --rule-type RemoveAllActionGroups \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG" \
  --schedule-recurrence-type Weekly \
  --schedule-recurrence "Saturday" "Sunday"
```

### Scenario C: Resource Health Shows Unavailable

```bash
# A VM shows "Unavailable" in Resource Health
# Possible causes:
# 1. Platform-initiated: Azure host issue (auto-recovery)
# 2. User-initiated: VM deallocated or stopped
# 3. Unknown: No health signal

# Check VM status
az vm get-instance-view -g $RG -n vm-affected \
  --query "instanceView.statuses[].{Code:code, Status:displayStatus}" -o table 2>/dev/null

# Check Activity Log for recent changes
az monitor activity-log list \
  --resource-group $RG \
  --max-events 10 \
  --query "[].{Time:eventTimestamp, Operation:operationName.value, Status:status.value}" \
  -o table 2>/dev/null
```

## Knowledge Check

**1. What are the five Azure Advisor categories?**

<details>
<summary>Show Answer</summary>

| Category | Focus Area | Example Recommendations |
|----------|-----------|------------------------|
| Reliability | High availability, disaster recovery | Enable VM backups, configure replication |
| Security | Vulnerabilities and threats | Enable MFA, fix NSG rules, enable encryption |
| Performance | Speed and responsiveness | Right-size VMs, add caching, optimize queries |
| Cost | Reduce spending | Shut down idle VMs, use reserved instances, delete orphaned resources |
| Operational Excellence | Best practices and efficiency | Enable diagnostics, tag resources, use automation |
</details>

**2. What are the Service Health event types?**

<details>
<summary>Show Answer</summary>

| Event Type | Description | Action Required |
|-----------|-------------|----------------|
| Service issues | Active outages affecting your resources | Monitor, failover if possible |
| Planned maintenance | Scheduled maintenance events | Plan for downtime, prepare failover |
| Health advisories | Changes requiring action (deprecations, etc.) | Update configurations before deadline |
| Security advisories | Security-related notifications | Apply patches, update configurations |

Service Health only shows events that affect YOUR resources (not all Azure issues globally).
</details>

**3. What is the difference between Service Health, Resource Health, and Azure Status?**

<details>
<summary>Show Answer</summary>

| Feature | Scope | Personalized | Use Case |
|---------|-------|--------------|----------|
| Azure Status (status.azure.com) | Global, all customers | No | Check if Azure-wide outage |
| Service Health | Your subscription | Yes | See issues affecting your services/regions |
| Resource Health | Single resource | Yes | Diagnose why a specific resource is unhealthy |

Use Resource Health for individual resource troubleshooting, Service Health for subscription-wide awareness, and Azure Status for global incident information.
</details>

**4. What types of actions can an action group perform?**

<details>
<summary>Show Answer</summary>

| Action Type | Description |
|-------------|-------------|
| Email | Send email notification |
| SMS | Send text message |
| Voice | Automated phone call |
| Push notification | Azure mobile app |
| Webhook | HTTP POST to a URL |
| Logic App | Trigger an Azure Logic App |
| Azure Function | Invoke a function |
| ITSM | Create ticket in ServiceNow, etc. |
| Automation Runbook | Execute a runbook |
| Event Hub | Stream to Event Hub |
| Secure Webhook | Webhook with AAD auth |

Rate limits apply: Email (100/hour), SMS (1/5 min), Voice (1/5 min).
</details>

## Cleanup

```bash
# Delete alert rules and action groups
az monitor activity-log alert delete -g $RG --name "alert-service-issues" 2>/dev/null
az monitor activity-log alert delete -g $RG --name "alert-planned-maintenance" 2>/dev/null
az monitor activity-log alert delete -g $RG --name "alert-health-advisories" 2>/dev/null
az monitor activity-log alert delete -g $RG --name "alert-advisor-cost" 2>/dev/null

# Delete the resource group
az group delete --name $RG --yes --no-wait

echo "Resources are being deleted in the background."
```

## Learning Resources

- [Azure Advisor overview](https://learn.microsoft.com/azure/advisor/advisor-overview)
- [Advisor Score](https://learn.microsoft.com/azure/advisor/azure-advisor-score)
- [Azure Service Health](https://learn.microsoft.com/azure/service-health/overview)
- [Resource Health overview](https://learn.microsoft.com/azure/service-health/resource-health-overview)
- [Create Service Health alerts](https://learn.microsoft.com/azure/service-health/alerts-activity-log-service-notifications-portal)
- [Action groups](https://learn.microsoft.com/azure/azure-monitor/alerts/action-groups)
- [Advisor alerts](https://learn.microsoft.com/azure/advisor/advisor-alerts-portal)
