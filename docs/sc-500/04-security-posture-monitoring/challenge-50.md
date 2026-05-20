---
sidebar_position: 50
title: "Challenge 50: Integrated Threat Response – Sentinel + Defender XDR + Security Copilot"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 50: Integrated Threat Response – Sentinel + Defender XDR + Security Copilot

## Exam skills covered

- Design integrated threat detection and response workflows
- Create Sentinel analytics rules with KQL
- Investigate incidents in Defender XDR unified portal
- Use Security Copilot for incident enrichment and response guidance
- Correlate alerts across identity, endpoint, and cloud workloads
- Configure bi-directional sync between Sentinel and Defender XDR

## Scenario

Contoso Ltd's SOC receives an alert: a user account shows signs of compromise—suspicious sign-in from an unusual location followed by access to sensitive Azure resources. You must trace this attack through the entire detection-investigation-response pipeline using all three platforms working together: **Sentinel** detects and correlates, **Defender XDR** provides deep investigation capabilities, and **Security Copilot** enriches the analysis and recommends actions.

This challenge simulates a realistic incident triage workflow that a SOC analyst would follow during an active investigation.

---

## Prerequisites

- Azure subscription with Owner or Contributor role
- Microsoft Sentinel workspace with data connectors active
- Microsoft Defender XDR enabled with E5 security licensing
- 🔒 **License required**: Security Copilot compute units (for Task 4-5)
- Azure CLI with `sentinel` extension installed
- KQL proficiency for analytics rule creation
- Permissions: Security Administrator, Microsoft Sentinel Contributor

---

## Task 1: Create Sentinel analytics rules for multi-stage attack detection

Build detection rules that identify the initial compromise indicators.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-unified-soc"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-unified"

# Create resource group and workspace
az group create --name $RG_NAME --location $LOCATION

az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION

# Enable Sentinel on the workspace
az sentinel onboarding-state create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default"

# Get workspace resource ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query id -o tsv)
```

### Analytics Rule 1: Suspicious sign-in followed by Azure resource access

```bash
# Create scheduled analytics rule for impossible travel + resource access
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "rule-suspicious-signin-resource-access" \
  --scheduled \
  --name "Suspicious Sign-in Followed by Azure Resource Access" \
  --description "Detects sign-ins from unusual locations followed by access to sensitive Azure resources within 1 hour" \
  --severity "High" \
  --enabled true \
  --query "let timeframe = 1h;
let suspicious_signins = SigninLogs
| where TimeGenerated > ago(timeframe)
| where ResultType == 0
| where RiskLevelDuringSignIn in ('high', 'medium')
| where LocationDetails.city != '' 
| project SignInTime=TimeGenerated, UserPrincipalName, IPAddress, 
          City=tostring(LocationDetails.city), 
          Country=tostring(LocationDetails.countryOrRegion),
          RiskLevel=RiskLevelDuringSignIn, AppDisplayName;
let resource_access = AzureActivity
| where TimeGenerated > ago(timeframe)
| where CategoryValue == 'Administrative'
| where OperationNameValue has_any ('Microsoft.KeyVault', 'Microsoft.Storage', 'Microsoft.Sql')
| project AccessTime=TimeGenerated, Caller, ResourceGroup, 
          OperationName=OperationNameValue, ResourceId;
suspicious_signins
| join kind=inner (resource_access) on \$left.UserPrincipalName == \$right.Caller
| where AccessTime > SignInTime
| where datetime_diff('minute', AccessTime, SignInTime) < 60
| project SignInTime, AccessTime, UserPrincipalName, IPAddress, City, Country, 
          RiskLevel, OperationName, ResourceId" \
  --query-frequency "PT15M" \
  --query-period "PT1H" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "InitialAccess" "Collection" \
  --techniques "T1078" "T1530"
```

### Analytics Rule 2: Credential access after initial compromise

Create a Near Real-Time (NRT) rule for detecting credential harvesting post-compromise:

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "rule-post-compromise-cred-access" \
  --nrt \
  --name "Post-Compromise Credential Access Attempt" \
  --description "NRT rule detecting Key Vault secret access or password changes after a risky sign-in" \
  --severity "High" \
  --enabled true \
  --query "let risky_users = SigninLogs
| where TimeGenerated > ago(15m)
| where RiskLevelDuringSignIn in ('high')
| where ResultType == 0
| distinct UserPrincipalName;
let keyvault_access = AzureDiagnostics
| where TimeGenerated > ago(15m)
| where ResourceProvider == 'MICROSOFT.KEYVAULT'
| where OperationName in ('SecretGet', 'SecretList', 'KeyGet', 'CertificateGet')
| project TimeGenerated, CallerIPAddress, 
          identity_claim_upn_s, OperationName, ResourceId;
let password_changes = AuditLogs
| where TimeGenerated > ago(15m)
| where OperationName has_any ('Change password', 'Reset password', 'Add app role assignment')
| extend InitiatedBy = tostring(InitiatedBy.user.userPrincipalName)
| project TimeGenerated, InitiatedBy, OperationName, TargetResources;
union
  (keyvault_access | where identity_claim_upn_s in (risky_users) 
   | project TimeGenerated, User=identity_claim_upn_s, Action=OperationName, Resource=ResourceId),
  (password_changes | where InitiatedBy in (risky_users)
   | project TimeGenerated, User=InitiatedBy, Action=OperationName, Resource=tostring(TargetResources))" \
  --tactics "CredentialAccess" "Persistence" \
  --techniques "T1555" "T1098"
```

### Analytics Rule 3: Lateral movement detection

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "rule-lateral-movement-detection" \
  --scheduled \
  --name "Lateral Movement via Azure Resource Access Escalation" \
  --description "Detects when a compromised account accesses resources across multiple subscriptions or resource groups" \
  --severity "Medium" \
  --enabled true \
  --query "AzureActivity
| where TimeGenerated > ago(1h)
| where CategoryValue == 'Administrative'
| where ActivityStatusValue == 'Success'
| summarize 
    ResourceGroupCount = dcount(ResourceGroup),
    SubscriptionCount = dcount(SubscriptionId),
    OperationCount = count(),
    ResourceGroups = make_set(ResourceGroup, 10),
    Operations = make_set(OperationNameValue, 10)
    by Caller, bin(TimeGenerated, 5m)
| where ResourceGroupCount > 3 or SubscriptionCount > 1
| where OperationCount > 10
| project TimeGenerated, Caller, ResourceGroupCount, SubscriptionCount, 
          OperationCount, ResourceGroups, Operations" \
  --query-frequency "PT5M" \
  --query-period "PT1H" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "LateralMovement" "Discovery" \
  --techniques "T1580" "T1087"
```

---

## Task 2: Configure Sentinel-Defender XDR bi-directional sync

Ensure incidents flow between Sentinel and Defender XDR for unified investigation.

```bash
# Enable the Microsoft Defender XDR data connector in Sentinel
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "MicrosoftThreatProtection" \
  --microsoft-threat-protection \
  --tenant-id $(az account show --query tenantId -o tsv) \
  --data-types-incidents-state "Enabled" \
  --data-types-alerts-state "Enabled"
```

**Portal verification for unified incident queue:**

1. Navigate to [Microsoft Defender portal](https://security.microsoft.com)
2. Go to **Settings** → **Microsoft Sentinel** → **Bi-directional sync**
3. Verify:

| Setting | Expected Value |
|---------|---------------|
| Sync status | Active |
| Sentinel workspace | law-contoso-unified |
| Incident sync direction | Bi-directional |
| Alert sync | Enabled |
| Entity sync | Enabled |

4. Navigate to **Incidents** in the Defender portal
5. Confirm you see incidents from both Sentinel and Defender XDR in one queue
6. Verify incident status changes sync between portals

---

## Task 3: Simulate and investigate the attack in Defender XDR

Walk through the investigation workflow when the analytics rules trigger.

**Scenario: The attack unfolds**

A Contoso employee (`alex.johnson@contoso.com`) has their credentials compromised via a phishing email. The attacker:
1. Signs in from an unusual location (Eastern Europe)
2. Accesses Azure Key Vault to retrieve storage account keys
3. Downloads sensitive data from a storage account
4. Attempts to create a new admin user for persistence

**Portal Investigation in Defender XDR:**

1. Navigate to **Incidents & alerts** → **Incidents**
2. Locate the incident: "Multi-stage attack: Suspicious sign-in + credential access"
3. Click the incident to open the investigation view

**Incident Overview tab:**
- Review the incident timeline
- Note the correlated alerts from multiple sources:
  - Sentinel: "Suspicious Sign-in Followed by Azure Resource Access"
  - Sentinel: "Post-Compromise Credential Access Attempt"
  - Defender for Cloud Apps: "Activity from infrequent country"
  - Entra ID Protection: "Risky sign-in detected"

**Evidence & Response tab:**
- Review affected entities:
  - User: alex.johnson@contoso.com
  - IP: 185.x.x.x (Eastern European ISP)
  - Resources: Key Vault `kv-contoso-prod`, Storage `stcontosoprod`

**Advanced Hunting (KQL in Defender XDR):**

```kql
// Trace all activities by the compromised user in the attack window
let attackStart = datetime(2025-01-15T08:30:00Z);
let attackEnd = datetime(2025-01-15T10:00:00Z);
let compromisedUser = "alex.johnson@contoso.com";
union CloudAppEvents, IdentityLogonEvents, AADSignInEventsBeta
| where Timestamp between (attackStart .. attackEnd)
| where AccountUpn == compromisedUser or 
        AccountObjectId == "user-object-id"
| project Timestamp, ActionType, Application, 
          IPAddress, Country, DeviceName
| sort by Timestamp asc
```

```kql
// Check for persistence mechanisms created by the attacker
let compromisedUser = "alex.johnson@contoso.com";
CloudAppEvents
| where Timestamp > ago(4h)
| where AccountUpn == compromisedUser
| where ActionType in ("Add member to role.", "Add user.", 
                        "Add service principal.", "Consent to application.")
| project Timestamp, ActionType, RawEventData, IPAddress
```

```kql
// Identify all resources accessed during the attack
let compromisedUser = "alex.johnson@contoso.com";
CloudAppEvents
| where Timestamp > ago(4h)
| where AccountUpn == compromisedUser
| where Application in ("Microsoft Azure", "Azure Key Vault", "Azure Storage")
| summarize Actions=make_set(ActionType), Count=count() by Application
```

**Automated Investigation results:**
- Review the Automated Investigation tab
- Note any auto-remediation actions taken (if configured)
- Review the evidence graph showing attack chain

---

## Task 4: Enrich the investigation with Security Copilot

Use Security Copilot to accelerate the investigation and gain deeper insights.

**Open Security Copilot and run investigation prompts:**

```text
Prompt 1 - Incident Summary:
"Summarize Defender XDR incident #12345 including all correlated alerts, 
affected entities, and the attack timeline. Map each step to MITRE ATT&CK."
```

**Expected Copilot response includes:**
- Attack narrative with timeline
- MITRE mapping: T1078 (Valid Accounts) → T1555 (Credential Access) → T1530 (Data from Cloud Storage) → T1098 (Account Manipulation)
- Affected entities summary
- Severity assessment

```text
Prompt 2 - User Risk Assessment:
"What is the full risk profile for alex.johnson@contoso.com? Include recent 
sign-in activity, risk detections, group memberships, privileged roles, and 
any previous security incidents involving this account."
```

```text
Prompt 3 - Threat Intelligence Enrichment:
"Enrich IP address 185.x.x.x with threat intelligence. What threat actors 
are associated with this IP? What campaigns has it been seen in? What is its 
current reputation across multiple TI feeds?"
```

```text
Prompt 4 - Impact Assessment:
"What Azure resources did alex.johnson@contoso.com have access to? List all 
Key Vault secrets that were accessed, storage accounts touched, and any data 
that may have been exfiltrated. Estimate the blast radius."
```

```text
Prompt 5 - KQL Generation for Deeper Investigation:
"Write a KQL query for Sentinel that finds all sign-ins from the IP range 
185.x.x.0/24 across all user accounts in the last 30 days. I want to know 
if other accounts were targeted by the same threat actor."
```

**Expected KQL from Copilot:**

```kql
// Generated by Security Copilot - NL2KQL plugin
let suspiciousRange = "185.";
SigninLogs
| where TimeGenerated > ago(30d)
| where IPAddress startswith suspiciousRange
| summarize 
    SignInCount = count(),
    UniqueUsers = dcount(UserPrincipalName),
    Users = make_set(UserPrincipalName, 20),
    SuccessCount = countif(ResultType == 0),
    FailureCount = countif(ResultType != 0),
    FirstSeen = min(TimeGenerated),
    LastSeen = max(TimeGenerated)
    by IPAddress
| where UniqueUsers > 1 or FailureCount > 5
| sort by SignInCount desc
```

```text
Prompt 6 - Containment Recommendations:
"Based on this investigation, provide specific containment and remediation 
steps in priority order. Include both immediate actions and long-term fixes."
```

**Expected Copilot recommendations:**
1. **Immediate**: Revoke all sessions for alex.johnson@contoso.com
2. **Immediate**: Reset password and require MFA re-registration
3. **Immediate**: Rotate all Key Vault secrets that were accessed
4. **Short-term**: Block the attacker IP range at the network level
5. **Short-term**: Review and remove any persistence mechanisms (new users, app consents)
6. **Long-term**: Implement PIM for Key Vault access
7. **Long-term**: Enable Conditional Access requiring compliant device for Key Vault access

---

## Task 5: Execute containment and create automation for future incidents

Based on Copilot's recommendations, execute containment and build automation.

```bash
# Immediate containment: Revoke user sessions
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/users/alex.johnson@contoso.com/revokeSignInSessions"

# Block the attacker IP in Conditional Access (via Graph API)
# First, create a named location for the malicious IP range
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
  --body '{
    "@odata.type": "#microsoft.graph.ipNamedLocation",
    "displayName": "Blocked - Attack Source IPs",
    "isTrusted": false,
    "ipRanges": [
      {"@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "185.0.0.0/24"}
    ]
  }'
```

**Create Sentinel automation rule for future similar incidents:**

```bash
# Create automation rule to auto-enrich and escalate similar incidents
az sentinel automation-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --automation-rule-id "auto-rule-compromise-response" \
  --name "Auto-Respond to Account Compromise Incidents" \
  --order 1 \
  --triggering-logic \
    is-enabled=true \
    triggers-on="Incidents" \
    triggers-when="Created" \
    conditions='[
      {
        "conditionType": "Property",
        "conditionProperties": {
          "propertyName": "IncidentSeverity",
          "operator": "Equals",
          "propertyValues": ["High"]
        }
      },
      {
        "conditionType": "Property", 
        "conditionProperties": {
          "propertyName": "IncidentTactics",
          "operator": "Contains",
          "propertyValues": ["InitialAccess", "CredentialAccess"]
        }
      }
    ]' \
  --actions '[
    {
      "actionType": "ModifyProperties",
      "order": 1,
      "actionConfiguration": {
        "severity": "High",
        "status": "Active",
        "owner": {
          "objectId": "soc-tier2-group-object-id",
          "assignedTo": "SOC Tier 2"
        }
      }
    },
    {
      "actionType": "RunPlaybook",
      "order": 2,
      "actionConfiguration": {
        "logicAppResourceId": "/subscriptions/'$SUBSCRIPTION_ID'/resourceGroups/'$RG_NAME'/providers/Microsoft.Logic/workflows/playbook-compromise-response",
        "tenantId": "'$(az account show --query tenantId -o tsv)'"
      }
    }
  ]'
```

**Create the response playbook KQL for the Logic App:**

```kql
// This query runs inside the playbook to gather context
let incidentEntities = dynamic(["alex.johnson@contoso.com"]);
let lookback = 4h;
// Gather all activities by compromised entities
let allActivities = union SigninLogs, AuditLogs, AzureActivity
| where TimeGenerated > ago(lookback)
| where UserPrincipalName in (incidentEntities) or Caller in (incidentEntities);
// Generate containment summary
allActivities
| summarize 
    TotalEvents = count(),
    SignIns = countif(Type == "SigninLogs"),
    AdminActions = countif(Type == "AzureActivity"),
    DirectoryChanges = countif(Type == "AuditLogs"),
    UniqueIPs = dcount(IPAddress),
    IPAddresses = make_set(IPAddress, 20)
    by UserPrincipalName
```

---

## Break & Fix

### Scenario 1: Sentinel analytics rule fires but Defender XDR doesn't show the incident

The analytics rule triggers correctly in Sentinel, but the incident doesn't appear in the unified Defender XDR incident queue.

<details>
<summary>Show solution</summary>

**Root cause:** Bi-directional sync is not properly configured, or the incident severity doesn't meet the sync threshold.

**Fix:**
1. Navigate to Defender portal → **Settings** → **Microsoft Sentinel**
2. Verify bi-directional sync is **Active**
3. Check if there's a severity filter:
   - Ensure "Sync all severities" is selected (not just High/Critical)
4. Verify the Sentinel workspace is connected:
   ```bash
   az sentinel data-connector show \
     --resource-group $RG_NAME \
     --workspace-name $WORKSPACE_NAME \
     --data-connector-id "MicrosoftThreatProtection"
   ```
5. If disconnected, recreate the data connector
6. Wait 5-10 minutes and trigger the rule again to verify sync

</details>

### Scenario 2: Security Copilot returns "I don't have access to that incident"

When querying about Defender XDR incident #12345, Security Copilot says it cannot access the incident.

<details>
<summary>Show solution</summary>

**Root cause:** The user's account lacks permissions on the Defender XDR workspace, or the Defender XDR plugin is misconfigured.

**Fix:**
1. Verify the user has at minimum **Security Reader** role in Defender XDR:
   - Navigate to Defender portal → **Settings** → **Permissions** → **Roles**
   - Confirm the user's security group has appropriate permissions
2. Check the Security Copilot plugin configuration:
   - Navigate to Security Copilot → **Settings** → **Plugins**
   - Verify the Defender XDR plugin shows **Connected**
   - Re-authenticate if needed
3. Verify the incident ID is correct:
   - Defender XDR uses numeric IDs while Sentinel uses GUIDs
   - Ensure you're using the Defender XDR incident ID, not the Sentinel ID
4. Test with a simpler prompt: "List my recent incidents in Defender XDR"

</details>

### Scenario 3: NRT rule not triggering despite matching events

The Near Real-Time analytics rule for credential access doesn't fire even though matching Key Vault access events exist in the logs.

<details>
<summary>Show solution</summary>

**Root cause:** The Key Vault diagnostic logs are not being sent to the Sentinel workspace, or there's a log ingestion delay.

**Fix:**
1. Verify Key Vault diagnostics are configured:
   ```bash
   az monitor diagnostic-settings list \
     --resource "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG_NAME/providers/Microsoft.KeyVault/vaults/kv-contoso-prod"
   ```
2. If no diagnostic settings exist, create them:
   ```bash
   az monitor diagnostic-settings create \
     --name "send-to-sentinel" \
     --resource "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG_NAME/providers/Microsoft.KeyVault/vaults/kv-contoso-prod" \
     --workspace $WORKSPACE_ID \
     --logs '[{"category":"AuditEvent","enabled":true}]'
   ```
3. Check NRT rule status:
   ```bash
   az sentinel alert-rule show \
     --resource-group $RG_NAME \
     --workspace-name $WORKSPACE_NAME \
     --rule-id "rule-post-compromise-cred-access"
   ```
4. Verify the rule's last run time and any errors in the health blade
5. NRT rules run every ~1 minute—wait for the next execution cycle

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "In an integrated SOC using Sentinel, Defender XDR, and Security Copilot, which platform is primarily responsible for correlating alerts from multiple sources into a unified incident?",
    options: [
      "Security Copilot correlates alerts using AI",
      "Microsoft Sentinel correlates alerts via analytics rules and fusion",
      "Defender XDR only correlates endpoint alerts",
      "Each platform handles correlation independently with no integration"
    ],
    correctIndex: 1,
    explanation: "Microsoft Sentinel is the SIEM that correlates alerts from multiple sources (Defender XDR, Entra ID, Azure Activity, etc.) into unified incidents via analytics rules, fusion rules, and ML-based correlation. Defender XDR correlates within its scope, and bi-directional sync unifies the incident queues."
  },
  {
    question: "A SOC analyst wants Security Copilot to write a KQL query based on natural language. Which plugin must be enabled?",
    options: [
      "Microsoft Sentinel plugin",
      "Microsoft Defender XDR plugin",
      "Natural Language to KQL plugin",
      "Microsoft Entra plugin"
    ],
    correctIndex: 2,
    explanation: "The Natural Language to KQL (NL2KQL) plugin specifically translates natural language questions into KQL queries that can run against a specified Log Analytics workspace. While the Sentinel plugin provides incident data, NL2KQL handles query generation."
  },
  {
    question: "Which type of Sentinel analytics rule provides the fastest detection with near real-time alerting?",
    options: [
      "Scheduled rule with 5-minute frequency",
      "Fusion rule",
      "Near Real-Time (NRT) rule",
      "Microsoft Security rule"
    ],
    correctIndex: 2,
    explanation: "Near Real-Time (NRT) rules run approximately every 1 minute and provide the fastest detection in Sentinel. Scheduled rules have a minimum 5-minute frequency. NRT rules are ideal for high-priority detections where every minute counts."
  },
  {
    question: "During incident containment, what is the correct Graph API method to immediately prevent a compromised user from accessing any resources?",
    options: [
      "DELETE the user account",
      "POST to /users/{id}/revokeSignInSessions",
      "PATCH the user to set accountEnabled=false",
      "POST to /users/{id}/invalidateAllRefreshTokens"
    ],
    correctIndex: 1,
    explanation: "POST to /users/{id}/revokeSignInSessions immediately invalidates all refresh tokens and session cookies for the user, forcing re-authentication everywhere. This is the fastest containment action. Disabling the account (PATCH accountEnabled=false) is also effective but prevents the user from re-authenticating even after password reset."
  },
  {
    question: "In bi-directional sync between Sentinel and Defender XDR, what happens when an analyst closes an incident in Defender XDR?",
    options: [
      "Nothing - changes only flow from Sentinel to Defender",
      "The incident is also closed in Sentinel automatically",
      "The incident remains open in Sentinel with a sync conflict flag",
      "The Sentinel incident is deleted"
    ],
    correctIndex: 1,
    explanation: "Bi-directional sync means status changes in either direction are propagated. When an analyst closes an incident in Defender XDR, the corresponding Sentinel incident is also closed automatically, maintaining consistency across both platforms."
  }
]} />

---

## Cleanup

```bash
# Remove analytics rules
az sentinel alert-rule delete \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "rule-suspicious-signin-resource-access" --yes

az sentinel alert-rule delete \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "rule-post-compromise-cred-access" --yes

az sentinel alert-rule delete \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "rule-lateral-movement-detection" --yes

# Remove automation rules
az sentinel automation-rule delete \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --automation-rule-id "auto-rule-compromise-response" --yes

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait
```
