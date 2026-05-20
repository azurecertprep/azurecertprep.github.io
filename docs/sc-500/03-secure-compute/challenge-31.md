---
sidebar_position: 31
title: "Challenge 31: AI Security – Data and AI Security Dashboard Monitoring"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 31: AI Security – Data and AI Security Dashboard Monitoring

## Exam skills covered

- Navigate and interpret the Data and AI Security dashboard in Defender for Cloud
- Monitor AI workload security posture across Microsoft 365 and Azure
- Investigate AI-specific security alerts and recommendations
- Correlate AI security signals across Purview, Defender, and Entra ID
- Configure custom workbooks and alerting for AI security metrics

## Scenario

Contoso Ltd has deployed AI workloads across Microsoft 365 Copilot (5,000 users), Azure AI Foundry (3 production models), and 12 Copilot Studio agents. The CISO has requested a unified security monitoring capability that provides visibility into AI-related threats, data exposure risks, overshared content accessed by AI, and agent authentication anomalies. You must configure and operationalize the Data and AI Security dashboard.

---

## Prerequisites

- 🔒 **License required**: Microsoft 365 E5 + Defender for Cloud (Defender CSPM plan)
- Security Administrator or Security Reader role
- Microsoft Defender for Cloud portal access
- Microsoft Purview portal access
- Azure Monitor / Log Analytics workspace configured

---

## Task 1: Access and explore the Data and AI Security dashboard

Navigate to the unified AI security monitoring dashboard.

1. Navigate to **Microsoft Defender for Cloud** → **Workload protections**
2. Select **Data and AI Security** from the left navigation
3. Review the dashboard sections:
   - **AI Security Posture**: Overall health score for AI workloads
   - **Active Threats**: Current AI-specific threat detections
   - **Data Exposure Risks**: Overshared content accessible by AI
   - **Agent Activity**: Copilot Studio and custom agent monitoring
   - **Recommendations**: Prioritized security improvements

```bash
# Verify Defender for Cloud plans are enabled for AI monitoring
az security pricing list --query "[?name=='AI' || name=='CloudPosture']" --output table

# Check if AI security assessments are running
az security assessment list \
    --query "[?contains(displayName, 'AI') || contains(displayName, 'Copilot')]" \
    --output table
```

---

## Task 2: Configure AI security posture assessments

Enable and review security recommendations specific to AI workloads.

```bash
# List AI-related security recommendations
az security assessment list \
    --query "[?contains(displayName, 'AI') || contains(displayName, 'cognitive') || contains(displayName, 'OpenAI')]" \
    --output json | jq '.[].{name: .displayName, status: .status.code, severity: .metadata.severity}'

# Common AI security recommendations to address:
# - "Azure AI services should restrict network access"
# - "Azure AI services should have key access disabled"
# - "Azure AI services should use private link"
# - "Diagnostic logs in AI services should be enabled"

# Remediate: Restrict network access to Azure OpenAI
az cognitiveservices account update \
    --name "contoso-openai-prod" \
    --resource-group "rg-contoso-ai-security" \
    --public-network-access "Disabled"

# Remediate: Disable local (key) authentication
az cognitiveservices account update \
    --name "contoso-openai-prod" \
    --resource-group "rg-contoso-ai-security" \
    --disable-local-auth true

# Remediate: Enable diagnostic logging
az monitor diagnostic-settings create \
    --name "ai-service-diagnostics" \
    --resource "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.CognitiveServices/accounts/contoso-openai-prod" \
    --workspace "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.OperationalInsights/workspaces/law-contoso-security" \
    --logs '[{"category": "Audit", "enabled": true}, {"category": "RequestResponse", "enabled": true}, {"category": "Trace", "enabled": true}]' \
    --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

---

## Task 3: Monitor AI threat detections

Review and investigate active AI security alerts from the dashboard.

1. In **Data and AI Security** dashboard → **Active Threats** panel
2. Review alert categories:
   - **Prompt Injection Detected**: Attempts to manipulate AI models
   - **Sensitive Data in AI Response**: PII or secrets in model outputs
   - **Anomalous Token Consumption**: Potential wallet abuse
   - **Unauthorized Agent Authentication**: Agent identity compromise
   - **Data Exfiltration via AI**: Copilot used to extract large data volumes

```bash
# Query Defender alerts specific to AI workloads
az security alert list \
    --query "[?contains(alertType, 'AI') || contains(alertType, 'Cognitive')]" \
    --output json | jq '.[] | {
        alertType: .alertType,
        severity: .severity,
        status: .status,
        description: .description,
        detectedTime: .timeGeneratedUtc,
        affectedResource: .compromisedEntity
    }'

# Get detailed investigation data for a specific alert
az security alert show \
    --name "{alert-id}" \
    --location "centralus" \
    --query "{type: .alertType, entities: .entities, remediation: .remediationSteps}"
```

---

## Task 4: Create custom monitoring workbooks for AI security

Build Azure Monitor workbooks to track AI-specific security KPIs.

```bash
# Create Log Analytics workspace for AI security monitoring
az monitor log-analytics workspace create \
    --resource-group "rg-contoso-ai-security" \
    --workspace-name "law-ai-security-monitoring" \
    --location "eastus"

WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --resource-group "rg-contoso-ai-security" \
    --workspace-name "law-ai-security-monitoring" \
    --query "customerId" -o tsv)
```

Create KQL queries for the workbook:

```kql
// AI Model Usage with Safety Events
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where Category == "RequestResponse"
| extend promptTokens = toint(properties_s.promptTokens)
| extend completionTokens = toint(properties_s.completionTokens)
| extend isFiltered = properties_s contains "content_filter"
| summarize
    TotalRequests = count(),
    FilteredRequests = countif(isFiltered),
    TotalPromptTokens = sum(promptTokens),
    TotalCompletionTokens = sum(completionTokens)
    by bin(TimeGenerated, 1h), Resource
| render timechart
```

```kql
// Prompt Injection Attempts Over Time
SecurityAlert
| where AlertType contains "AI" or AlertType contains "PromptInjection"
| summarize AttemptCount = count() by bin(TimeGenerated, 1h), AlertSeverity
| render barchart
```

```kql
// Copilot Usage and Data Access Patterns
OfficeActivity
| where Operation contains "Copilot"
| extend DataSource = tostring(parse_json(ModifiedProperties)[0].NewValue)
| summarize
    InteractionCount = count(),
    UniqueUsers = dcount(UserId),
    DataSourcesAccessed = dcount(DataSource)
    by bin(TimeGenerated, 1d)
| render timechart
```

```kql
// Agent Authentication Anomalies
AADServicePrincipalSignInLogs
| where AppDisplayName contains "Agent" or Tags contains "AIAgent"
| extend RiskLevel = tostring(RiskLevelDuringSignIn)
| where RiskLevel != "none"
| project TimeGenerated, AppDisplayName, IPAddress, Location, RiskLevel, Status
| order by TimeGenerated desc
```

---

## Task 5: Set up cross-signal correlation alerts

Create alerts that correlate signals from multiple AI security sources.

```bash
# Alert: Data overexposure + Copilot access = High risk
az monitor scheduled-query create \
    --name "ai-data-overexposure-copilot-access" \
    --resource-group "rg-contoso-ai-security" \
    --scopes "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.OperationalInsights/workspaces/law-ai-security-monitoring" \
    --condition "count 'OfficeActivity | where Operation contains \"Copilot\" and SiteUrl has_any (\"HRConfidential\", \"Finance-MA\", \"ExecutiveComp\")' > 10" \
    --window-size "PT15M" \
    --evaluation-frequency "PT5M" \
    --severity 1 \
    --description "Copilot accessing sensitive overexposed sites"

# Alert: Multiple jailbreak attempts from same source
az monitor scheduled-query create \
    --name "repeated-jailbreak-attempts" \
    --resource-group "rg-contoso-ai-security" \
    --scopes "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.OperationalInsights/workspaces/law-ai-security-monitoring" \
    --condition "count 'AzureDiagnostics | where ResourceProvider == \"MICROSOFT.COGNITIVESERVICES\" and resultSignature_d == 400 | summarize count() by CallerIPAddress | where count_ > 20' > 0" \
    --window-size "PT10M" \
    --evaluation-frequency "PT5M" \
    --severity 2 \
    --description "Repeated prompt injection attempts detected"

# Alert: Agent accessing data outside normal hours
az monitor scheduled-query create \
    --name "agent-offhours-access" \
    --resource-group "rg-contoso-ai-security" \
    --scopes "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.OperationalInsights/workspaces/law-ai-security-monitoring" \
    --condition "count 'AADServicePrincipalSignInLogs | where Tags contains \"AIAgent\" and hourofday(TimeGenerated) !between (6 .. 22)' > 5" \
    --window-size "PT1H" \
    --evaluation-frequency "PT15M" \
    --severity 3 \
    --description "AI agent authenticating outside business hours"
```

---

## Task 6: Generate AI security posture reports

Create automated reporting for AI security metrics.

```bash
# Create a Logic App for weekly AI security report
az logic workflow create \
    --resource-group "rg-contoso-ai-security" \
    --name "ai-security-weekly-report" \
    --location "eastus" \
    --definition '{
        "definition": {
            "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json",
            "triggers": {
                "Recurrence": {
                    "type": "Recurrence",
                    "recurrence": {
                        "frequency": "Week",
                        "interval": 1,
                        "schedule": {"weekDays": ["Monday"], "hours": ["8"]}
                    }
                }
            },
            "actions": {}
        }
    }'
```

Review key dashboard metrics weekly:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Prompt injection attempts/day | < 10 | > 50 |
| Content filter blocks/day | Baseline ±20% | > 200% increase |
| Token consumption variance | < 30% from baseline | > 100% spike |
| Agent auth failures | < 5/day | > 20/day |
| Sensitive data in responses | 0 | Any occurrence |
| Overshared sites with Copilot access | Trending down | Any increase |
| Unresolved high-severity alerts | 0 | > 3 unresolved for 24h |

---

## Break & Fix

### Scenario 1: AI Security dashboard shows no data despite active AI workloads

The Data and AI Security dashboard in Defender for Cloud shows "No data available" even though Contoso has active Azure OpenAI deployments and M365 Copilot in use.

<details>
<summary>Show solution</summary>

```bash
# 1. Verify Defender for Cloud plans are enabled
az security pricing show --name "AI" --query "pricingTier"
# Must show "Standard" not "Free"

az security pricing show --name "CloudPosture" --query "pricingTier"
# Defender CSPM must be Standard for the dashboard

# 2. Enable Defender for AI if not active
az security pricing create --name "AI" --tier "Standard"

# 3. Check diagnostic settings on AI resources
az monitor diagnostic-settings list \
    --resource "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.CognitiveServices/accounts/contoso-openai-prod"
# Must have Audit and RequestResponse categories enabled

# 4. Enable diagnostic settings if missing
az monitor diagnostic-settings create \
    --name "ai-diagnostics" \
    --resource "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.CognitiveServices/accounts/contoso-openai-prod" \
    --workspace "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.OperationalInsights/workspaces/law-ai-security-monitoring" \
    --logs '[{"category": "Audit", "enabled": true}, {"category": "RequestResponse", "enabled": true}]' \
    --metrics '[{"category": "AllMetrics", "enabled": true}]'

# 5. For M365 Copilot visibility, ensure Purview audit logging is enabled
# Navigate to Purview > Audit > Verify "Start recording user and admin activity" is ON
# Data may take 24-48 hours to populate after enabling

# 6. Verify Log Analytics workspace is in a supported region
az monitor log-analytics workspace show \
    --resource-group "rg-contoso-ai-security" \
    --workspace-name "law-ai-security-monitoring" \
    --query "location"
```

</details>

### Scenario 2: Alert fatigue from excessive low-severity AI alerts

The security team is receiving 200+ alerts per day from AI workloads, most of which are false positives from content filter triggers on legitimate business queries.

<details>
<summary>Show solution</summary>

```bash
# 1. Analyze alert patterns to identify false positive sources
az security alert list \
    --query "[?contains(alertType, 'AI')]" \
    --output json | jq 'group_by(.alertType) | map({type: .[0].alertType, count: length, severity: .[0].severity})'

# 2. Tune alert thresholds for scheduled queries
# Increase the threshold for repeated attempts
az monitor scheduled-query update \
    --name "repeated-jailbreak-attempts" \
    --resource-group "rg-contoso-ai-security" \
    --condition "count 'AzureDiagnostics | where ResourceProvider == \"MICROSOFT.COGNITIVESERVICES\" and resultSignature_d == 400 | summarize count() by CallerIPAddress | where count_ > 50' > 0"

# 3. Create suppression rules for known false positive patterns
# Navigate to Defender for Cloud > Security alerts > Suppression rules
# Add rule: Suppress "ContentFilter" alerts from internal test IPs
# Add rule: Suppress low-severity alerts from dev/test environments

# 4. Implement alert tiering - only notify on High and Critical
az monitor action-group update \
    --name "AI-Security-Response" \
    --resource-group "rg-contoso-ai-security" \
    --short-name "AISec"
    # Configure separate action groups per severity

# 5. Create a summary digest instead of individual notifications
# Use Logic App to aggregate alerts and send daily digest
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What Defender for Cloud plan must be enabled to access the Data and AI Security dashboard?",
    options: [
      "Defender for Servers",
      "Defender CSPM (Cloud Security Posture Management) with the AI security extension",
      "Defender for Key Vault",
      "Defender for DNS"
    ],
    correctIndex: 1,
    explanation: "The Data and AI Security dashboard requires Defender CSPM (Standard tier) to be enabled, which provides the security posture assessment, recommendations, and unified dashboard capabilities for AI workloads."
  },
  {
    question: "Which signal combination indicates the highest-priority AI security incident?",
    options: [
      "Single prompt injection attempt from an external IP",
      "Copilot accessing an overshared site containing M&A data + anomalous data download volume + off-hours activity",
      "A content filter blocking a user request for harmful content",
      "An AI model returning a grounded response with low confidence"
    ],
    correctIndex: 1,
    explanation: "Cross-signal correlation of multiple indicators (overshared sensitive data access + data exfiltration pattern + unusual timing) represents the highest risk scenario, potentially indicating a coordinated attack using Copilot to extract sensitive information."
  },
  {
    question: "What is the recommended approach to reduce alert fatigue from AI security monitoring?",
    options: [
      "Disable all AI security alerts",
      "Tune alert thresholds, create suppression rules for known false positives, implement severity-based routing, and use daily digests for low-severity items",
      "Only monitor production environments and ignore dev/test",
      "Increase the alert threshold to 1000+ events before triggering"
    ],
    correctIndex: 1,
    explanation: "Effective alert management combines threshold tuning (based on baseline analysis), suppression rules for known benign patterns, severity-based routing (immediate notification for High/Critical only), and aggregated digests for informational alerts."
  }
]} />

## Cleanup

```bash
# Delete monitoring resources
az monitor scheduled-query delete --name "ai-data-overexposure-copilot-access" --resource-group "rg-contoso-ai-security" --yes
az monitor scheduled-query delete --name "repeated-jailbreak-attempts" --resource-group "rg-contoso-ai-security" --yes
az monitor scheduled-query delete --name "agent-offhours-access" --resource-group "rg-contoso-ai-security" --yes
az logic workflow delete --name "ai-security-weekly-report" --resource-group "rg-contoso-ai-security" --yes

# Delete resource group
az group delete --name "rg-contoso-ai-security" --yes --no-wait
```
