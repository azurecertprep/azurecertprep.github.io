---
sidebar_position: 48
title: "Challenge 48: Security Copilot – Workspace, Permissions, and Plugins"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 48: Security Copilot – Workspace, Permissions, and Plugins

## Exam skills covered

- Configure Security Copilot workspace and capacity units
- Manage RBAC roles (Copilot owner, Copilot contributor)
- Enable and configure plugins (Sentinel, Defender XDR, Intune, Entra, NaturalLanguageToKQL)
- Configure promptbooks and sharing settings
- Understand Security Copilot data processing and privacy boundaries

## Scenario

Contoso Ltd has purchased Security Copilot compute units and wants to deploy the service for their SOC team. As the security administrator, you must configure the workspace capacity, set up appropriate RBAC permissions so that Tier 1 analysts can use Copilot but not modify settings, enable the relevant plugins for Contoso's environment, and configure promptbooks for common investigation workflows.

---

## Prerequisites

- Azure subscription with Owner or Contributor role
- 🔒 **License required**: Security Copilot compute units (SCU) provisioned in your tenant
- Microsoft Entra ID P2 (for role assignments)
- Microsoft Sentinel workspace with active data
- Microsoft Defender XDR enabled
- Microsoft Intune environment (optional, for Intune plugin)
- Global Administrator or Security Administrator role in Entra ID

---

## Task 1: Provision Security Copilot capacity

Configure the Security Copilot workspace with appropriate compute capacity for Contoso's SOC team of 12 analysts.

**Portal Steps:**

1. Navigate to the [Azure portal](https://portal.azure.com)
2. Search for **"Microsoft Security Copilot"** in the search bar
3. Select **Security Copilot** → **Settings** → **Capacity management**
4. Click **+ Add capacity**
5. Configure the capacity unit:

| Setting | Value |
|---------|-------|
| Subscription | Contoso-Production |
| Resource group | rg-contoso-seccopilot |
| Region | East US |
| Capacity name | scu-contoso-soc |
| Compute units | 3 SCUs |
| Cross-geo evaluation | Disabled |

6. Click **Review + Create** → **Create**
7. Wait for provisioning to complete (typically 2-5 minutes)

**Verify the capacity:**

1. Navigate to **Security Copilot** → **Settings** → **Capacity management**
2. Confirm status shows **Active**
3. Note the capacity units allocated and region

> 💡 **Exam tip:** Each SCU provides approximately 30 prompts per hour across all users. Plan capacity based on team size and expected usage patterns.

---

## Task 2: Configure RBAC roles for the SOC team

Set up role-based access so that SOC leads can manage Copilot settings while analysts can only use the service.

**Portal Steps:**

1. Navigate to **Security Copilot** → **Settings** → **Role assignments**
2. Click **+ Add role assignment**
3. Assign **Copilot owner** role:

| Setting | Value |
|---------|-------|
| Role | Microsoft Security Copilot Owner |
| Assign to | SOC-Leads (security group) |
| Scope | Entire workspace |

4. Click **Add**
5. Assign **Copilot contributor** role:

| Setting | Value |
|---------|-------|
| Role | Microsoft Security Copilot Contributor |
| Assign to | SOC-Analysts-Tier1 (security group) |
| Scope | Entire workspace |

6. Click **Add**

**Understanding the roles:**

| Role | Capabilities |
|------|-------------|
| **Copilot Owner** | Full access: manage settings, plugins, capacity, view all sessions, create/share promptbooks |
| **Copilot Contributor** | Use Copilot, create personal sessions, run shared promptbooks, cannot modify global settings |

**Verify role assignments:**

1. Sign in as a user in the SOC-Analysts-Tier1 group
2. Navigate to Security Copilot
3. Confirm the user can create sessions and run prompts
4. Confirm the user **cannot** access Settings → Capacity management
5. Sign in as a SOC-Leads member and verify full settings access

> 💡 **Exam tip:** Copilot Owner maps to managing the service; Copilot Contributor maps to using it. This is separate from Azure RBAC—these are Security Copilot-specific roles.

---

## Task 3: Enable and configure plugins

Enable the security plugins that Contoso needs for their environment.

**Portal Steps:**

1. Navigate to **Security Copilot** → **Settings** → **Plugins**
2. Enable the following Microsoft plugins:

### Microsoft Sentinel Plugin

| Setting | Value |
|---------|-------|
| Status | Enabled |
| Workspace | law-contoso-sentinel |
| Subscription | Contoso-Production |
| Resource group | rg-contoso-sentinel |
| Default time range | Last 7 days |

3. Click **Save**

### Microsoft Defender XDR Plugin

| Setting | Value |
|---------|-------|
| Status | Enabled |
| Scope | All Defender workloads |
| Include advanced hunting | Yes |

4. Click **Save**

### Microsoft Entra Plugin

| Setting | Value |
|---------|-------|
| Status | Enabled |
| Include sign-in logs | Yes |
| Include audit logs | Yes |
| Include risky users | Yes |

5. Click **Save**

### Microsoft Intune Plugin

| Setting | Value |
|---------|-------|
| Status | Enabled |
| Include device compliance | Yes |
| Include app protection | Yes |

6. Click **Save**

### Natural Language to KQL Plugin

| Setting | Value |
|---------|-------|
| Status | Enabled |
| Target workspace | law-contoso-sentinel |
| Allow query execution | Yes |
| Maximum query results | 100 |

7. Click **Save**

**Verify plugins are working:**

1. Open a new Security Copilot session
2. Test each plugin with sample prompts:

```text
# Test Sentinel plugin
"Show me the top 10 security alerts from Sentinel in the last 24 hours"

# Test Defender XDR plugin
"List active incidents in Defender XDR with high severity"

# Test Entra plugin
"Show users flagged as risky in the last 7 days"

# Test Intune plugin
"List non-compliant devices in Intune"

# Test NL2KQL plugin
"Write a KQL query to find failed sign-in attempts from outside the US"
```

3. Verify each prompt returns relevant results from the respective service

---

## Task 4: Configure promptbooks and sharing settings

Create reusable promptbooks for common SOC investigation workflows.

**Portal Steps:**

1. Navigate to **Security Copilot** → **Promptbook library**
2. Click **+ Create promptbook**
3. Create the **Incident Triage** promptbook:

| Setting | Value |
|---------|-------|
| Name | Incident Triage - Initial Assessment |
| Description | Standard triage workflow for new security incidents |
| Sharing | Shared with SOC-Analysts-Tier1 group |

4. Add the following prompts in sequence:

```text
Prompt 1: "Summarize incident {incident_id} including affected entities, timeline, and severity justification"

Prompt 2: "What MITRE ATT&CK techniques are associated with this incident?"

Prompt 3: "Are there any related incidents or alerts in the last 30 days involving the same entities?"

Prompt 4: "What remediation steps do you recommend based on this incident type?"

Prompt 5: "Generate an executive summary of this incident suitable for management notification"
```

5. Set input parameters:
   - `{incident_id}` — Type: String, Required: Yes
6. Click **Save promptbook**

**Create a second promptbook for User Investigation:**

1. Click **+ Create promptbook**
2. Configure:

| Setting | Value |
|---------|-------|
| Name | User Compromise Investigation |
| Description | Deep-dive investigation for potentially compromised user accounts |
| Sharing | Shared with SOC-Leads group |

3. Add prompts:

```text
Prompt 1: "Show all sign-in activity for user {user_upn} in the last 14 days including locations and devices"

Prompt 2: "Has this user had any impossible travel detections or sign-ins from anonymous IP addresses?"

Prompt 3: "What Azure resources has this user accessed in the last 7 days?"

Prompt 4: "Check if this user's credentials appear in any known breach databases"

Prompt 5: "Generate a timeline of suspicious activities for this user and recommend containment actions"
```

4. Click **Save promptbook**

**Configure sharing settings:**

1. Navigate to **Settings** → **Sharing & privacy**
2. Configure:

| Setting | Value |
|---------|-------|
| Allow session sharing | Yes - within organization |
| Allow promptbook sharing | Yes - with security groups |
| Data sharing with Microsoft | Opt-out (for compliance) |
| Session history retention | 90 days |
| Audit logging | Enabled |

3. Click **Save**

---

## Task 5: Configure data boundaries and compliance settings

Ensure Security Copilot data processing meets Contoso's compliance requirements.

**Portal Steps:**

1. Navigate to **Security Copilot** → **Settings** → **Data and privacy**
2. Configure data boundaries:

| Setting | Value |
|---------|-------|
| Data processing region | United States |
| Cross-geo processing | Disabled |
| Customer data storage | Tenant boundary only |
| Prompt logging for improvement | Disabled |

3. Navigate to **Settings** → **Audit and compliance**
4. Enable audit logging:

| Setting | Value |
|---------|-------|
| Audit log destination | law-contoso-sentinel |
| Log all user prompts | Yes |
| Log plugin invocations | Yes |
| Log session metadata | Yes |

5. Click **Save**

**Verify audit logging:**

1. Run a test prompt in Security Copilot
2. Wait 5-10 minutes for log ingestion
3. In Sentinel, query the audit logs:

```kql
SecurityCopilotAudit_CL
| where TimeGenerated > ago(1h)
| project TimeGenerated, UserPrincipalName, OperationType, PluginUsed, PromptText
| sort by TimeGenerated desc
```

---

## Break & Fix

### Scenario 1: Plugin returns "No data available"

A Tier 1 analyst reports that the Sentinel plugin always returns "No data available" even though data exists in the workspace.

<details>
<summary>Show solution</summary>

**Root cause:** The analyst's Entra ID account lacks the **Microsoft Sentinel Reader** role on the workspace.

**Fix:**
1. Navigate to the Sentinel workspace → **Access control (IAM)**
2. Add role assignment: **Microsoft Sentinel Reader** → assign to the analyst's account or their security group
3. Wait 5-10 minutes for permissions to propagate
4. Test the plugin again

> Security Copilot plugins respect the underlying service permissions. Even with Copilot Contributor role, users need appropriate RBAC on the data sources.

</details>

### Scenario 2: Promptbook execution fails with capacity error

SOC leads report that promptbook execution fails intermittently with "Insufficient capacity" errors during peak hours.

<details>
<summary>Show solution</summary>

**Root cause:** The provisioned SCUs (3) are insufficient for 12 analysts running promptbooks simultaneously.

**Fix:**
1. Navigate to **Security Copilot** → **Settings** → **Capacity management**
2. Select the existing capacity unit → **Edit**
3. Increase compute units from 3 to 6 SCUs
4. Enable **burst capacity** if available
5. Consider implementing usage policies:
   - Limit concurrent sessions per user
   - Schedule intensive promptbooks during off-peak hours
   - Monitor usage patterns in the capacity dashboard

> Each SCU supports approximately 30 prompts/hour. For 12 analysts, plan for 5-8 SCUs depending on usage patterns.

</details>

### Scenario 3: Cross-geo data processing alert

Compliance team flags that Security Copilot is processing data in a European region despite the tenant being configured for US-only processing.

<details>
<summary>Show solution</summary>

**Root cause:** Cross-geo evaluation was accidentally enabled, or a third-party plugin is routing data through another region.

**Fix:**
1. Navigate to **Security Copilot** → **Settings** → **Data and privacy**
2. Verify **Cross-geo processing** is set to **Disabled**
3. Check **Settings** → **Plugins** for any third-party plugins
4. Disable any plugins that may process data outside the US boundary
5. Review audit logs for processing region information:

```kql
SecurityCopilotAudit_CL
| where ProcessingRegion != "US"
| project TimeGenerated, UserPrincipalName, PluginUsed, ProcessingRegion
```

6. If the issue persists, contact Microsoft Support with the audit evidence

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the minimum role required for a SOC analyst to use Security Copilot without modifying settings?",
    options: [
      "Security Administrator",
      "Microsoft Security Copilot Owner",
      "Microsoft Security Copilot Contributor",
      "Global Reader"
    ],
    correctIndex: 2,
    explanation: "The Microsoft Security Copilot Contributor role allows users to create sessions, run prompts, and use shared promptbooks without the ability to modify global settings, plugins, or capacity configuration."
  },
  {
    question: "A Security Copilot plugin returns no data even though the underlying service has data. What is the most likely cause?",
    options: [
      "The plugin is not enabled in Security Copilot settings",
      "The user lacks RBAC permissions on the underlying data source",
      "The Security Copilot capacity units are exhausted",
      "The promptbook has an incorrect input parameter"
    ],
    correctIndex: 1,
    explanation: "Security Copilot plugins enforce the permissions of the calling user on the underlying service. If a user lacks Sentinel Reader role on the workspace, the Sentinel plugin cannot retrieve data regardless of Copilot role assignments."
  },
  {
    question: "Which setting must be disabled to prevent Security Copilot from processing prompts in regions outside your designated geography?",
    options: [
      "Data sharing with Microsoft",
      "Cross-geo evaluation",
      "Prompt logging for improvement",
      "Session history retention"
    ],
    correctIndex: 1,
    explanation: "Cross-geo evaluation controls whether Security Copilot can process prompts in data centers outside your configured region. Disabling this ensures all processing stays within your designated geography for compliance purposes."
  },
  {
    question: "How many prompts per hour does one Security Copilot compute unit (SCU) approximately support?",
    options: [
      "10 prompts per hour",
      "30 prompts per hour",
      "100 prompts per hour",
      "Unlimited prompts per hour"
    ],
    correctIndex: 1,
    explanation: "Each Security Copilot compute unit (SCU) provides approximately 30 prompts per hour across all users sharing that capacity. Plan capacity based on team size and expected concurrent usage patterns."
  }
]} />

---

## Cleanup

Since this challenge involves portal-only configuration, cleanup involves removing the Security Copilot resources:

1. Navigate to **Security Copilot** → **Settings** → **Capacity management**
2. Select the capacity unit → **Delete**
3. Remove role assignments from **Settings** → **Role assignments**
4. Delete promptbooks from the **Promptbook library**

> ⚠️ **Cost warning:** Security Copilot compute units are billed hourly. Delete capacity when not actively studying to avoid charges.
