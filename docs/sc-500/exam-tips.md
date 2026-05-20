---
sidebar_position: 2
title: "Exam tips and strategy"
---

# SC-500 exam tips and strategy

## Exam format

- **40–60 questions** (multiple choice, drag-and-drop, case studies, labs)
- **~120 minutes** (some candidates report getting 150 min)
- **Passing score**: 700/1000
- Questions are distributed across all 4 domains (no single domain dominates like AZ-400's pipeline focus)
- Lab questions may require you to configure security settings in the Azure Portal or run Azure CLI commands

## Time management

| Section | Suggested time | Notes |
|---------|---------------|-------|
| First pass (all questions) | 70 min | Answer what you know, flag the rest |
| Second pass (flagged) | 30 min | Focus on scenario-based questions |
| Lab section (if present) | 20–30 min | Usually 1–2 portal tasks |
| Review | 10 min | Check flagged answers |

:::tip Time trap

Case study questions provide a lot of context. **Read the question first**, then scan the case study for relevant details. Don't read the entire case study before looking at the question — it wastes time.

:::

## Top strategies

### 1. Know the security stack hierarchy

Many questions test whether you pick the right tool for the job:

| Layer | Tool |
|-------|------|
| Identity | Entra ID, PIM, Conditional Access |
| Network | NSG, Azure Firewall, WAF, Private Link |
| Data | Encryption, Key Vault, Purview |
| Compute | Defender plans, JIT VM access, endpoint protection |
| Monitoring | Defender for Cloud, Sentinel, Security alerts |
| AI | Purview DSPM, sensitivity labels, Azure AI content safety |

### 2. Understand the "defense in depth" answer pattern

When multiple answers seem correct, the exam often wants the **most specific** control at the **closest layer** to the asset being protected.

### 3. Conditional Access is heavily tested

Know the evaluation order:
1. Session state evaluated
2. Assignments checked (users, apps, conditions)
3. Access controls enforced (grant/block, MFA, device compliance)
4. Session controls applied (sign-in frequency, app-enforced restrictions)

### 4. Know the difference between similar services

The exam loves asking you to choose between:
- Azure Firewall vs NSG vs WAF
- Private Endpoint vs Service Endpoint
- Customer-managed keys vs Microsoft-managed keys vs double encryption
- Defender for Servers Plan 1 vs Plan 2
- Sentinel analytics rules vs Defender alerts

### 5. AI security is NEW — study it carefully

This is net-new content from AZ-500. Expect questions on:
- Purview DSPM for AI (data overexposure assessment)
- Sensitivity labels preventing Copilot from surfacing restricted data
- Azure OpenAI content filtering and safety
- Prompt injection awareness

## Domain-specific tips

### Domain 1: Identity, access, and governance (20–25%)

- **PIM activation flows**: Know the full sequence — eligible → activate → approve → time-bound active assignment
- **Conditional Access evaluation order**: Assignments are evaluated first, then grant controls, then session controls
- **Access reviews**: Know when to use Entra access reviews vs PIM access reviews
- **Entitlement management**: Access packages, catalogs, and connected organizations
- Know the difference between **administrative units** and **management groups**
- **Custom RBAC roles**: Understand `Actions`, `NotActions`, `DataActions`, `NotDataActions`

### Domain 2: Storage, databases, and networking (25–30%)

- **NSG rule priority**: Lowest number = highest priority. Default rules start at 65000.
- **Private Endpoint DNS**: You MUST configure DNS (private DNS zone or custom DNS) — private endpoints don't work without correct name resolution
- **Key Vault access models**: RBAC vs access policies. RBAC is the recommended model for new deployments.
- **SQL Database security layers**: Firewall rules → Private Link → TDE → Always Encrypted → Dynamic Data Masking → Row-Level Security
- **Storage encryption**: Know when to use CMK (customer-managed keys) vs infrastructure encryption (double encryption)
- **DDoS Protection**: Standard vs Network (formerly Basic) — know what each covers

### Domain 3: Secure compute (20–25%)

- **Defender plans**: Know which plan covers which resource:
  - Defender for Servers (Plan 1 = EDR only, Plan 2 = EDR + vulnerability scanning + JIT + adaptive controls)
  - Defender for Containers (registry scanning + runtime protection)
  - Defender for App Service, Storage, SQL, Key Vault, DNS, Resource Manager
- **AI security is NEW**: Purview DSPM, sensitivity labels for Copilot readiness, Azure AI content safety
- **JIT VM access**: Opens ports for a limited time — know that it modifies the NSG rules temporarily
- **Adaptive application controls**: Machine learning-based allowlisting for VMs
- **Container security**: Admission control with Azure Policy, registry scanning with Defender

### Domain 4: Security posture and monitoring (20–25%)

- **KQL basics for Sentinel**: You don't need to be an expert, but know:
  - `where`, `project`, `summarize`, `extend`, `ago()`, `render`
  - Common tables: `SecurityEvent`, `SigninLogs`, `AzureActivity`, `CommonSecurityLog`
- **Data connector types**: Know the difference between built-in connectors, CEF/Syslog, and custom connectors (DCR-based)
- **Sentinel analytics rules**: Scheduled vs NRT (near real-time) vs Microsoft Security vs Fusion
- **Secure Score**: Know how recommendations map to score impact
- **Attack path analysis**: Defender CSPM feature — understand how it chains vulnerabilities

## Common traps

| Trap | Why it's wrong | Correct answer |
|------|---------------|----------------|
| "Use Azure Firewall to block traffic between subnets" | Azure Firewall is for internet/cross-VNet; use **NSGs** for intra-subnet | NSG on the subnet |
| "Use Service Endpoint to fully isolate storage" | Service Endpoints still use public IPs; use **Private Endpoint** for full isolation | Private Endpoint |
| "Enable Defender for Cloud Basic tier" | There is no "Basic tier" — it's **free tier** (CSPM) vs **paid plans** (Defender plans) | Enable the specific Defender plan |
| "Store secrets in App Configuration" | App Configuration is for feature flags/config; use **Key Vault** for secrets | Azure Key Vault |
| "Use access policies for new Key Vault" | Microsoft now recommends **RBAC** for Key Vault access control | Azure RBAC permission model |
| "Block Copilot access with Conditional Access" | You can't block Copilot this way; use **sensitivity labels** and **Purview DSPM** | Sensitivity labels + DSPM |

## Lab cost management

- **Entra ID P2**: Use a free 30-day trial for PIM and Identity Protection labs
- **Defender for Cloud**: Plans are billed per-resource. Enable only for the challenge, disable after.
- **Sentinel**: First 10 GB/day free for 31 days on a new workspace. Use this wisely.
- **VMs**: Use B1s/B1ls and deallocate immediately after each challenge
- **Set a budget alert at $15** to catch any runaway resources

:::tip Pro tip

Many Domain 1 (Identity) challenges can be completed entirely with an Entra ID P2 trial and free-tier resources. Domain 4 (Monitoring) challenges benefit from Sentinel's free trial period. Plan your study order to maximize free trials.

:::

## Resources

| Resource | Link |
|----------|------|
| SC-500 study guide | [Microsoft Learn study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/sc-500) |
| SC-500 learning path | [Self-paced modules](https://learn.microsoft.com/en-us/credentials/certifications/cloud-ai-security-engineer/) |
| Defender for Cloud docs | [learn.microsoft.com/defender-for-cloud](https://learn.microsoft.com/en-us/azure/defender-for-cloud/) |
| Microsoft Sentinel docs | [learn.microsoft.com/sentinel](https://learn.microsoft.com/en-us/azure/sentinel/) |
| Entra ID documentation | [learn.microsoft.com/entra](https://learn.microsoft.com/en-us/entra/identity/) |
| Exam sandbox | [Try the exam interface](https://aka.ms/examdemo) |
