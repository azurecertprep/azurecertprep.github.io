---
sidebar_position: 49
title: "Challenge 49: Security Copilot – Microsoft Agents and Security Store"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 49: Security Copilot – Microsoft Agents and Security Store

## Exam skills covered

- Enable and configure built-in Microsoft security agents
- Configure Security Store agents and custom solutions
- Create custom promptbooks for investigation workflows
- Set up agent orchestration policies and guardrails
- Manage agent permissions and data access boundaries

## Scenario

Contoso Ltd wants to leverage Security Copilot's autonomous agents to reduce SOC workload. The security team handles 500+ phishing alerts daily and needs automated triage. Additionally, Contoso's vulnerability management team spends excessive time prioritizing patches. You must enable the built-in agents, configure custom promptbooks for specialized workflows, and set up orchestration policies that ensure agents operate within approved boundaries.

---

## Prerequisites

- 🔒 **License required**: Security Copilot compute units (SCU) provisioned and active
- Security Copilot workspace configured (from Challenge 48)
- Microsoft Sentinel workspace with active incidents
- Microsoft Defender XDR with alerts flowing
- Microsoft Defender Vulnerability Management enabled
- Copilot Owner role in Security Copilot
- Security Administrator role in Entra ID

---

## Task 1: Enable the Phishing Triage Agent

Configure the built-in phishing triage agent to automatically analyze and classify phishing alerts.

**Portal Steps:**

1. Navigate to [Security Copilot](https://securitycopilot.microsoft.com)
2. Go to **Settings** → **Agents** → **Microsoft agents**
3. Locate **Phishing Triage Agent** and click **Configure**
4. Enable the agent with the following settings:

| Setting | Value |
|---------|-------|
| Status | Enabled |
| Data sources | Microsoft Defender XDR, Exchange Online |
| Auto-classify confidence threshold | High (90%+) |
| Actions on high-confidence phishing | Move to quarantine, notify user |
| Actions on suspicious (medium confidence) | Flag for analyst review |
| Actions on benign (low threat) | Close alert, no action |
| Working hours | 24/7 |
| Maximum alerts per hour | 100 |

5. Configure the triage criteria:

| Criteria | Weight |
|----------|--------|
| Known malicious sender domains | High |
| URL reputation (VirusTotal, Microsoft) | High |
| Attachment analysis (detonation) | High |
| Impersonation detection | Medium |
| SPF/DKIM/DMARC failures | Medium |
| User-reported vs. automated detection | Low |

6. Set escalation rules:

| Condition | Action |
|-----------|--------|
| VIP target (C-suite, finance) | Immediate analyst notification |
| Business email compromise indicators | Escalate to Tier 2 |
| Credential harvesting link detected | Block sender domain, escalate |
| Agent confidence < 60% | Route to human analyst |

7. Click **Save and activate**

**Verify agent operation:**

1. Navigate to **Security Copilot** → **Agent activity**
2. Confirm the phishing agent shows status: **Active**
3. Review recent triage decisions in the agent log
4. Verify alert volume reduction in Defender XDR alerts queue

---

## Task 2: Enable the Alert Triage Agent

Configure the alert triage agent for non-phishing security alerts from Defender XDR.

**Portal Steps:**

1. Navigate to **Settings** → **Agents** → **Microsoft agents**
2. Locate **Alert Triage Agent** and click **Configure**
3. Enable with settings:

| Setting | Value |
|---------|-------|
| Status | Enabled |
| Scope | All Defender XDR alerts (excluding email) |
| Auto-resolve true positives | No (flag for review) |
| Auto-close false positives | Yes (confidence > 95%) |
| Enrichment sources | Sentinel, Entra ID, Threat Intelligence |
| Incident correlation | Enabled |

4. Configure alert categories and handling:

| Alert Category | Agent Action |
|---------------|-------------|
| Malware detection (endpoint) | Enrich with device context, check lateral movement |
| Suspicious process execution | Correlate with MITRE ATT&CK, check other endpoints |
| Impossible travel | Verify with Entra sign-in logs, check VPN usage |
| Anomalous Azure resource access | Check role assignments, verify authorization |
| Credential access attempts | Correlate with identity protection, check MFA status |

5. Configure enrichment prompts the agent uses internally:

```text
Enrichment 1: "What is the risk score and recent activity for the user associated with this alert?"
Enrichment 2: "Are there related alerts from the same entity in the last 48 hours?"
Enrichment 3: "What MITRE ATT&CK stage does this alert represent and what is the typical next stage?"
Enrichment 4: "Is the affected device compliant with Intune policies?"
```

6. Set output format:

| Field | Description |
|-------|-------------|
| Triage verdict | True positive / False positive / Needs review |
| Confidence score | 0-100% |
| Enrichment summary | Key context gathered by agent |
| Recommended action | Suggested next steps for analyst |
| Related incidents | Links to correlated incidents |

7. Click **Save and activate**

---

## Task 3: Enable the Vulnerability Remediation Agent

Configure the agent to prioritize and recommend remediation for discovered vulnerabilities.

**Portal Steps:**

1. Navigate to **Settings** → **Agents** → **Microsoft agents**
2. Locate **Vulnerability Remediation Agent** and click **Configure**
3. Enable with settings:

| Setting | Value |
|---------|-------|
| Status | Enabled |
| Data source | Microsoft Defender Vulnerability Management |
| Prioritization model | Risk-based (EPSS + asset criticality) |
| Remediation recommendations | Enabled |
| Patch scheduling suggestions | Enabled |
| Compensating control recommendations | Enabled |

4. Configure asset criticality mapping:

| Asset Group | Criticality | SLA for Critical CVEs |
|-------------|-------------|----------------------|
| Domain Controllers | Critical | 24 hours |
| Public-facing web servers | High | 48 hours |
| Database servers | High | 48 hours |
| Developer workstations | Medium | 7 days |
| General endpoints | Low | 14 days |

5. Configure agent output:

```text
For each vulnerability, the agent provides:
- CVE ID and description
- EPSS score (probability of exploitation)
- Affected assets with criticality ratings
- Available patches or workarounds
- Compensating controls if patching isn't immediate
- Recommended remediation timeline based on SLA
- Impact assessment if vulnerability is exploited
```

6. Set notification rules:

| Condition | Action |
|-----------|--------|
| CISA KEV addition | Immediate notification to security leads |
| EPSS > 0.9 on critical asset | High-priority remediation ticket |
| Zero-day with active exploitation | Emergency change request |
| Patch available for aging vulnerability | Reminder to patch owner |

7. Click **Save and activate**

---

## Task 4: Configure Security Store agents and custom solutions

Browse and install additional agents from the Security Store.

**Portal Steps:**

1. Navigate to **Security Copilot** → **Security Store**
2. Browse available agents and solutions
3. Install the following community/partner agents:

### Threat Intelligence Enrichment Agent

1. Find **"Threat Intelligence Enrichment"** in the Security Store
2. Click **Install**
3. Configure:

| Setting | Value |
|---------|-------|
| TI feeds | Microsoft TI, CIRCL, AlienVault OTX |
| Auto-enrich indicators | Enabled |
| IOC aging policy | 90 days |
| Confidence threshold for blocking | 80% |

4. Click **Activate**

### Compliance Posture Agent

1. Find **"Compliance Posture Monitor"** in the Security Store
2. Click **Install**
3. Configure:

| Setting | Value |
|---------|-------|
| Frameworks | NIST 800-53, CIS Benchmarks, ISO 27001 |
| Scan frequency | Daily |
| Drift alerting | Enabled |
| Auto-remediation | Disabled (recommend only) |

4. Click **Activate**

**Managing installed agents:**

1. Navigate to **Settings** → **Agents** → **Installed agents**
2. Review each agent's:
   - Activity log (prompts processed, actions taken)
   - Error rate and failed operations
   - Capacity consumption (SCU usage)
   - Data access audit trail

---

## Task 5: Create custom promptbooks for agent-driven workflows

Design promptbooks that leverage agents for complex investigation scenarios.

**Portal Steps:**

1. Navigate to **Security Copilot** → **Promptbook library**
2. Click **+ Create promptbook**

### Promptbook: Automated Incident Response

| Setting | Value |
|---------|-------|
| Name | Agent-Driven Incident Response |
| Description | End-to-end incident investigation using agents and manual steps |
| Trigger | Manual or agent-initiated |
| Sharing | SOC-Leads and SOC-Analysts-Tier1 |

3. Add prompts:

```text
Prompt 1 (Agent: Alert Triage): 
"Analyze incident {incident_id} and provide a triage verdict with enrichment context from all available sources"

Prompt 2 (Agent: Threat Intelligence): 
"Enrich all indicators of compromise found in incident {incident_id} with threat intelligence from all configured feeds"

Prompt 3 (Copilot): 
"Based on the triage and threat intelligence enrichment, what is the kill chain stage and what are the likely next attacker actions?"

Prompt 4 (Copilot): 
"Generate containment recommendations for this incident. Include immediate actions and long-term remediation"

Prompt 5 (Agent: Compliance Posture): 
"What compliance controls failed that allowed this incident? Recommend control improvements"

Prompt 6 (Copilot): 
"Create a complete incident report for incident {incident_id} including timeline, impact assessment, root cause, and lessons learned"
```

4. Configure input parameters:
   - `{incident_id}` — Type: String, Required: Yes
5. Click **Save promptbook**

### Promptbook: Weekly Vulnerability Review

| Setting | Value |
|---------|-------|
| Name | Weekly Vulnerability Prioritization |
| Description | Agent-driven vulnerability assessment for weekly patch review |
| Trigger | Scheduled (Every Monday 08:00 UTC) |
| Sharing | Security-Operations group |

6. Add prompts:

```text
Prompt 1 (Agent: Vulnerability Remediation): 
"List all new vulnerabilities discovered in the last 7 days, sorted by risk score (EPSS × asset criticality)"

Prompt 2 (Agent: Threat Intelligence): 
"Are any of the top 20 vulnerabilities being actively exploited in the wild? Check CISA KEV and exploit databases"

Prompt 3 (Copilot): 
"Create a prioritized patch deployment plan for this week based on risk scores, active exploitation, and asset criticality"

Prompt 4 (Copilot): 
"For vulnerabilities that cannot be patched immediately, recommend compensating controls"

Prompt 5 (Copilot): 
"Generate a weekly vulnerability report suitable for the CISO including risk trends, patch compliance metrics, and recommendations"
```

7. Click **Save promptbook**

---

## Task 6: Configure agent orchestration policies

Set up guardrails and policies that govern how agents operate.

**Portal Steps:**

1. Navigate to **Security Copilot** → **Settings** → **Agent policies**
2. Create an orchestration policy:

| Setting | Value |
|---------|-------|
| Policy name | Contoso Agent Guardrails |
| Scope | All agents |
| Priority | High |

3. Configure boundaries:

**Action boundaries:**

| Action Type | Policy |
|-------------|--------|
| Read data | Allowed - all connected sources |
| Modify alert status | Allowed - with audit logging |
| Quarantine email | Allowed - phishing agent only |
| Isolate device | Requires human approval |
| Disable user account | Requires human approval |
| Block IP/domain | Requires human approval |
| Delete data | Prohibited |

**Data access boundaries:**

| Data Category | Access Level |
|--------------|-------------|
| Security alerts and incidents | Full access |
| User sign-in logs | Full access |
| Email content | Metadata only (no body) |
| File content | Hash and metadata only |
| HR/personnel data | Prohibited |
| Financial systems | Prohibited |

**Operational limits:**

| Limit | Value |
|-------|-------|
| Max actions per hour per agent | 200 |
| Max SCU consumption per agent per hour | 1 SCU |
| Escalation timeout | 15 minutes |
| Retry limit on failures | 3 |
| Circuit breaker threshold | 10 consecutive failures |

4. Click **Save policy**

5. Configure alert routing:

| Alert Type | Primary Agent | Fallback |
|------------|--------------|----------|
| Phishing/email threats | Phishing Triage Agent | Alert Triage Agent |
| Endpoint alerts | Alert Triage Agent | Human analyst |
| Identity alerts | Alert Triage Agent | Human analyst |
| Cloud resource alerts | Alert Triage Agent | Human analyst |
| Vulnerability findings | Vulnerability Agent | Human analyst |

6. Click **Save routing configuration**

---

## Break & Fix

### Scenario 1: Phishing agent over-quarantining legitimate emails

The phishing triage agent has quarantined several legitimate emails from a new business partner, causing business disruption.

<details>
<summary>Show solution</summary>

**Root cause:** The new partner's domain is recently registered and has low reputation scores, triggering the agent's confidence threshold.

**Fix:**
1. Navigate to **Settings** → **Agents** → **Phishing Triage Agent** → **Configuration**
2. Add the partner domain to the **Allow list**:
   - Domain: `newpartner.com`
   - Reason: "Verified business partner - approved by IT security"
   - Expiration: 90 days (review periodically)
3. Adjust confidence threshold for domain age:
   - Reduce weight of "recently registered domain" from High to Medium
4. Review and release quarantined emails:
   - Go to Defender XDR → **Email & collaboration** → **Quarantine**
   - Release legitimate emails and mark as "not junk"
5. Monitor the agent's decisions for the partner domain over the next 24 hours

</details>

### Scenario 2: Agent capacity exhaustion during incident surge

During a major security incident, all agents stop responding and analysts see "capacity unavailable" errors.

<details>
<summary>Show solution</summary>

**Root cause:** The incident generated hundreds of alerts simultaneously, exhausting the allocated SCU capacity across all agents.

**Fix:**
1. **Immediate:** Navigate to **Settings** → **Capacity management**
   - Increase SCU allocation temporarily (e.g., from 3 to 8 SCUs)
2. **Short-term:** Adjust agent operational limits:
   - Reduce phishing agent max alerts per hour during the incident
   - Pause the vulnerability agent (non-urgent during active incident)
   - Prioritize alert triage agent capacity
3. **Long-term:** Configure agent priority during capacity contention:
   - Navigate to **Settings** → **Agent policies** → **Priority**
   - Set: Alert Triage Agent = Priority 1, Phishing Agent = Priority 2, Others = Priority 3
   - Enable "capacity reservation" for Priority 1 agents (reserve 1 SCU minimum)

</details>

### Scenario 3: Custom promptbook returns inconsistent results

The weekly vulnerability review promptbook sometimes returns different prioritizations for the same data.

<details>
<summary>Show solution</summary>

**Root cause:** The prompts use ambiguous language, and the LLM interprets "risk score" differently across runs.

**Fix:**
1. Navigate to **Promptbook library** → Edit the weekly vulnerability promptbook
2. Make prompts more deterministic:

```text
# Before (ambiguous):
"List vulnerabilities sorted by risk score"

# After (specific):
"List all new vulnerabilities discovered between {start_date} and {end_date}. 
Sort by: EPSS score × Asset Criticality Score (Critical=4, High=3, Medium=2, Low=1). 
Output as a table with columns: CVE-ID, EPSS, Asset Criticality, Calculated Risk Score, Affected Hosts Count"
```

3. Add explicit output format requirements to each prompt
4. Use input parameters for dates instead of relative terms ("last 7 days" can shift)
5. Test the updated promptbook 3 times and verify consistent output

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Which built-in Security Copilot agent would you enable to automatically classify and triage email-based threats?",
    options: [
      "Alert Triage Agent",
      "Phishing Triage Agent",
      "Vulnerability Remediation Agent",
      "Compliance Posture Agent"
    ],
    correctIndex: 1,
    explanation: "The Phishing Triage Agent is specifically designed to analyze and classify email-based threats including phishing, business email compromise, and malicious attachments. It can automatically quarantine, flag for review, or close alerts based on confidence thresholds."
  },
  {
    question: "An agent needs to isolate a compromised device. Based on the orchestration policy configured in this challenge, what happens?",
    options: [
      "The device is immediately isolated",
      "The action is prohibited and blocked",
      "The action requires human approval before execution",
      "The action is logged but executed without approval"
    ],
    correctIndex: 2,
    explanation: "According to the orchestration policy, device isolation falls under 'Requires human approval' in the action boundaries. High-impact actions like isolating devices, disabling accounts, or blocking IPs require a human analyst to approve before the agent can execute."
  },
  {
    question: "What should you configure when agents exhaust capacity during an incident surge?",
    options: [
      "Disable all agents until the incident is resolved",
      "Configure agent priority levels and capacity reservation",
      "Remove all orchestration policies",
      "Switch to manual-only mode permanently"
    ],
    correctIndex: 1,
    explanation: "Configuring agent priority levels with capacity reservation ensures critical agents (like Alert Triage) maintain a minimum SCU allocation during surges. Lower-priority agents can be paused or throttled while the incident is active."
  },
  {
    question: "A custom promptbook returns inconsistent results across multiple runs. What is the most effective fix?",
    options: [
      "Increase the SCU allocation for promptbook execution",
      "Make prompts more specific with explicit output formats and deterministic criteria",
      "Disable all plugins and re-enable them one by one",
      "Delete and recreate the promptbook with the same prompts"
    ],
    correctIndex: 1,
    explanation: "LLMs can produce variable outputs for ambiguous prompts. Making prompts more specific—with explicit sorting criteria, output format requirements, and deterministic parameters—significantly improves consistency across runs."
  }
]} />

---

## Cleanup

Since this challenge involves portal-only agent configuration:

1. Navigate to **Settings** → **Agents** → **Microsoft agents**
2. Disable each agent: Phishing Triage, Alert Triage, Vulnerability Remediation
3. Navigate to **Security Store** → **Installed agents**
4. Uninstall Threat Intelligence Enrichment and Compliance Posture agents
5. Delete custom promptbooks from the Promptbook library
6. Remove orchestration policies from **Settings** → **Agent policies**

> ⚠️ **Cost warning:** Active agents consume SCU capacity even when idle (they process incoming alerts). Disable agents when not actively studying.
