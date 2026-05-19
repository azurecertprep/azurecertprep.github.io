---
sidebar_position: 5
title: "Challenge 05: Design Identity Management"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Challenge 05: design identity Management

:::info Estimated Time and Cost

**75-90 min** | **Estimated cost**: $0-5 | **Exam Weight: 25-30%**

:::

## Introduction

Woodgrove Bank is a financial institution with 8,000 employees across 12 offices. They have a mature on-premises Active Directory environment (Windows Server 2019 domain controllers, single forest, three domains) that manages all employee identities, group policies, and application access. They are migrating to a hybrid cloud model with Microsoft 365 and Azure workloads but cannot abandon on-premises AD due to legacy line-of-business applications that require Kerberos authentication.

The CISO has identified several critical security gaps in the current identity posture:
- 15 Global Administrator accounts with no access reviews or time-limited activation
- Service accounts with permanently assigned high-privilege roles
- No detection mechanism for compromised credentials or impossible travel sign-ins
- Passwords synced from AD with no cloud-native password protection
- Former contractors still have active accounts discovered during a recent audit

Your task is to design a hybrid identity management solution that synchronizes identities to the cloud while implementing modern security controls for privileged access and identity protection.

## Exam skills covered

- Recommend an identity management solution
- Recommend an authentication solution
- Recommend a solution for authorizing access to Azure resources

## Design tasks

### Part 1: hybrid identity synchronization

1. Evaluate and recommend the appropriate synchronization method for Woodgrove Bank:

<DecisionMatrix
  title="Hybrid Identity Synchronization"
  headers={["Description", "When to Use"]}
  rows={[
    {criteria: "Microsoft Entra Connect Sync", values: ["Traditional sync engine installed on-prem. Full-featured with support for complex topologies, device writeback, group writeback, and custom sync rules.", "Multi-forest environments, complex filtering/transformation needs, device writeback required, organizations needing granular control over sync behavior and custom attribute mappings."]},
    {criteria: "Microsoft Entra Cloud Sync", values: ["Lightweight cloud-managed agent. No heavy infrastructure, auto-updates, supports multiple disconnected forests from a single config.", "Disconnected forests, simple sync scenarios, organizations wanting minimal on-prem footprint, multi-forest mergers where a single Connect Sync server cannot reach all forests."]},
    {criteria: "Federation (AD FS)", values: ["On-prem federation service that redirects authentication to local AD. Tokens issued locally, no password hashes in the cloud.", "Strict regulatory requirements prohibiting password hashes in cloud, smart card/certificate-based auth required, third-party MFA that cannot integrate with Entra ID directly. Being deprecated in favor of cloud auth."]}
  ]}
  storageKey="az305-challenge-05"
/>

2. Design the synchronization topology considering:
   - Single forest, three domains
   - Which objects to synchronize (users, groups, contacts, devices)
   - Filtering strategy (OU-based, attribute-based, or domain-based)
   - Password hash synchronization vs. pass-through authentication vs. federation

3. Design the authentication method hierarchy:
   - Primary authentication method for cloud resources
   - Failover authentication method if primary is unavailable
   - Staged rollout approach for migration

### Part 2: password protection and authentication security

4. Design password protection for Woodgrove Bank:
   - Microsoft Entra Password Protection (custom banned password list)
   - On-premises password protection agent deployment
   - Smart lockout configuration
   - Self-service password reset with on-premises writeback

5. Evaluate passwordless authentication options and design a rollout plan:
   - Windows Hello for Business
   - FIDO2 security keys
   - Microsoft Authenticator phone sign-in
   - Certificate-based authentication

### Part 3: privileged identity Management (pim)

6. Design a PIM strategy for the 15 Global Administrator accounts:
   - Eligible vs. active role assignments
   - Maximum activation duration
   - Approval workflow requirements
   - MFA requirement for activation
   - Justification and ticket requirements

7. Design PIM for Azure resource roles:
   - Owner role on production subscriptions: who can activate, approval required
   - Contributor role on development subscriptions: who can activate, auto-approve
   - Just-in-time access windows and notification configuration

8. Create an access review schedule:
   - Quarterly review of Global Administrator assignments
   - Monthly review of guest user access
   - Semi-annual review of Azure subscription Owner assignments

### Part 4: identity protection

9. Design Identity Protection policies for Woodgrove Bank:
   - Sign-in risk policy: what actions for low, medium, and high risk
   - User risk policy: when to require password change vs. block access
   - Risk-based Conditional Access integration

10. Design detection and response for these scenarios:
    - Employee sign-in from two countries within 1 hour (impossible travel)
    - Sign-in from a known botnet IP address
    - Credentials found in a dark web breach database
    - Anomalous token usage pattern

### Part 5: implement proof of concept

11. Configure Entra ID Password Protection with a custom banned password list.

12. Create a PIM eligible role assignment (using a non-production role) and demonstrate the activation workflow.

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-05"
  items={[
    "Synchronization method selected with documented justification considering multi-domain topology",
    "Authentication method hierarchy designed with primary and failover methods",
    "PIM configured for privileged roles with appropriate activation duration and approval workflows",
    "Identity Protection policies designed for sign-in risk and user risk scenarios",
    "Password protection strategy covers both cloud and on-premises with banned password list",
    "Access review schedule defined for all privileged role types"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Entra Connect Sync vs. Cloud Sync</summary>

**Microsoft Entra Connect Sync** (formerly Azure AD Connect):
- Mature, feature-rich sync engine installed on-premises
- Supports complex topologies (multi-forest, filtering, device writeback)
- Required for: device writeback, Exchange hybrid, group writeback
- Single server per directory (staging server for HA)

**Microsoft Entra Cloud Sync** (lightweight agent):
- Cloud-managed, multiple agents for HA
- Simpler setup, auto-updates
- Supports multi-forest disconnected scenarios
- Limited features: no device writeback, no pass-through authentication

For Woodgrove Bank's scenario (single forest, three domains, needs PHS + PTA failover), **Entra Connect Sync** is the better choice because it supports the full feature set needed for a complex enterprise environment including password writeback and staged rollout.

</details>

<details>
<summary>Hint 2: Password Hash Sync vs. Pass-Through Authentication</summary>

**Password Hash Synchronization (PHS)**:
- Hashes of password hashes synced to cloud (double-hashed, not actual passwords)
- Works even if on-prem AD is unavailable (resilience)
- Required for Identity Protection leaked credentials detection
- Simplest deployment and maintenance

**Pass-Through Authentication (PTA)**:
- Authentication validated in real-time against on-prem AD
- Passwords never stored in cloud (compliance requirement for some orgs)
- Requires on-prem connectivity (no sign-in if all agents are offline)
- Install multiple agents (3+) for high availability

**Recommended for Woodgrove**: PHS as primary (enables Identity Protection, works if on-prem fails) with PTA as additional if compliance requires on-prem password validation. Both can be enabled simultaneously as "staged rollout."

</details>

<details>
<summary>Hint 3: Configuring PIM for Global Admin</summary>

```bash
# Note: PIM configuration is primarily done through the portal or Microsoft graph API
# The following shows the graph API approach

# List eligible role assignments for global administrator
az rest --method get \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleInstances?\$filter=roleDefinitionId eq '62e90394-69f5-4237-9190-012177145e10'"

# Create an eligible assignment (makes user eligible but not active)
az rest --method post \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests" \
  --body '{
    "action": "adminAssign",
    "justification": "Assign eligible Global Admin for emergency use",
    "roleDefinitionId": "62e90394-69f5-4237-9190-012177145e10",
    "directoryScopeId": "/",
    "principalId": "<user-object-id>",
    "scheduleInfo": {
      "startDateTime": "2024-01-01T00:00:00Z",
      "expiration": {
        "type": "afterDuration",
        "duration": "P365D"
      }
    }
  }'
```

PIM best practices for Global Admin:
- Maximum activation duration: 2 hours (not 8 or 24)
- Require approval from another Global Admin
- Require MFA at activation time
- Require justification and incident ticket number
- Send notification to all other Global Admins on activation

</details>

<details>
<summary>Hint 4: Identity Protection Risk Policies</summary>

Design risk response by severity:

| Risk Level | Sign-in Risk Response | User Risk Response |
|------------|----------------------|-------------------|
| Low | Allow with MFA | Allow (monitor) |
| Medium | Require MFA | Require password change |
| High | Block access | Block until admin review |

Key configuration:
- Sign-in risk detects: impossible travel, unfamiliar sign-in properties, malware-linked IPs, anonymous IPs
- User risk detects: leaked credentials (requires PHS), anomalous user activity
- Risk-based Conditional Access policies supersede the legacy Identity Protection policies

```bash
# Conditional access policy for high sign-in risk (via graph api)
az rest --method post \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --body '{
    "displayName": "Block high risk sign-ins",
    "state": "enabled",
    "conditions": {
      "signInRiskLevels": ["high"],
      "applications": {"includeApplications": ["All"]},
      "users": {"includeUsers": ["All"], "excludeUsers": ["<break-glass-id>"]}
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["block"]
    }
  }'
```

</details>

<details>
<summary>Hint 5: Custom Banned Password List</summary>

Microsoft Entra Password Protection evaluates passwords against:
1. The global banned password list (maintained by Microsoft, based on telemetry)
2. Your custom banned password list (up to 1,000 entries)
3. Normalization rules (character substitution: @ for a, 3 for e, etc.)

For Woodgrove Bank, add company-specific terms:
- Company name and variations (woodgrove, w00dgr0ve)
- Product names
- Office locations
- Common internal abbreviations

On-premises deployment requires:
- Azure AD Password Protection Proxy service (at least one per forest)
- Azure AD Password Protection DC Agent (on every DC)
- No internet connectivity required from DCs (proxy handles communication)

```bash
# Configure custom banned passwords (Portal or PowerShell)
# PowerShell example:
# Connect-MgGraph -Scopes "Policy.ReadWrite.AuthenticationMethod"
# Update-MgPolicyAuthenticationMethodPolicy -AuthenticationMethodConfigurations @{
# customBannedPasswords = @("woodgrove", "banking123", "finance2024")
# }
```

</details>

## Learning resources

- [Microsoft Entra Connect Sync documentation](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-azure-ad-connect)
- [Microsoft Entra Cloud Sync](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/what-is-cloud-sync)
- [Privileged Identity Management](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure)
- [Identity Protection overview](https://learn.microsoft.com/en-us/entra/id-protection/overview-identity-protection)
- [Password protection in Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-password-ban-bad)
- [Passwordless authentication methods](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-passwordless)
- [Access reviews](https://learn.microsoft.com/en-us/entra/id-governance/access-reviews-overview)

## Knowledge check

<details>
<summary>1. Woodgrove Bank has a compliance requirement that passwords must never leave their on-premises environment, but they also want Identity Protection leaked credentials detection. Which authentication methods satisfy both requirements?</summary>

**These requirements are mutually exclusive.** Leaked credentials detection in Identity Protection requires password hash synchronization (PHS) because it compares cloud-stored hashes against known breached credential databases. If compliance strictly prohibits password hashes in the cloud, you must choose: use Pass-Through Authentication (PTA) for compliance and lose leaked credential detection, OR use PHS to gain Identity Protection at the cost of having hashes in the cloud. Microsoft's guidance is that PHS hashes are double-hashed and extremely secure. Most organizations accept PHS for the security benefits gained.

</details>

<details>
<summary>2. Woodgrove has 15 permanently active Global Administrator accounts. After implementing PIM, what should the target state look like?</summary>

**Target state:** (1) Reduce to 2-3 permanently active Global Admins (emergency/break-glass accounts only), (2) Convert remaining 12-13 accounts to "eligible" assignments requiring activation, (3) Set maximum activation duration to 1-2 hours, (4) Require multi-person approval for activation, (5) Require MFA and justification at activation time, (6) Configure quarterly access reviews to verify continued need, (7) Set up alerts for any activation event. The goal is zero standing access -- all privileged access is just-in-time and time-bounded.

</details>

<details>
<summary>3. The company has three AD domains in one forest. They need to sync users from two domains but exclude the third (legacy domain being decommissioned). Which filtering approach should they use?</summary>

**Domain-based filtering in Microsoft Entra Connect Sync.** During the Entra Connect Sync installation wizard, you can select which domains to include in synchronization. Deselect the legacy domain entirely. Alternatively, use OU-based filtering if you need finer control within domains (sync specific OUs while excluding others). Domain-based filtering is the simplest and most maintainable approach when the exclusion boundary aligns with domain boundaries. Remember to also configure the sync scope to exclude disabled accounts from the remaining domains.

</details>

<details>
<summary>4. An employee's credentials are detected in a dark web breach database. Identity Protection flags the user risk as "high." What automated response should occur?</summary>

**The user risk policy should force a secure password change.** When user risk is "high" due to leaked credentials: (1) The risk-based Conditional Access policy triggers at next sign-in, (2) The user is required to perform MFA (proving they are the legitimate user), (3) After MFA, they must change their password, (4) The new password is validated against the banned password list, (5) If SSPR with on-premises writeback is configured, the new password is written back to on-prem AD, (6) After successful password change, the user risk is automatically remediated (reset to none). If the user cannot complete MFA, access is blocked pending admin intervention.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge05 --location eastus
```

2. Create a security group to simulate a privileged access group:

```bash
az ad group create \
  --display-name "sg-az305-challenge05-admins" \
  --mail-nickname "sg-az305-challenge05-admins"
```

3. Get the group object ID:

```bash
GROUP_ID=$(az ad group show \
  --group "sg-az305-challenge05-admins" \
  --query id -o tsv)
```

4. Assign the Reader role to the group scoped to the resource group with a description:

```bash
az role assignment create \
  --assignee-object-id "$GROUP_ID" \
  --assignee-principal-type Group \
  --role "Reader" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/rg-az305-challenge05" \
  --description "Lab: Simulated PIM-eligible assignment for challenge 05"
```

5. Verify the role assignment:

```bash
az role assignment list \
  --resource-group rg-az305-challenge05 \
  --query "[?principalId=='$GROUP_ID'].{role:roleDefinitionName, scope:scope}" -o table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
GROUP_ID=$(az ad group show --group "sg-az305-challenge05-admins" --query id -o tsv)
az role assignment delete \
  --assignee "$GROUP_ID" \
  --role "Reader" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/rg-az305-challenge05"
az ad group delete --group "sg-az305-challenge05-admins"
az group delete --name rg-az305-challenge05 --yes --no-wait
```

---

**Next**: [Challenge 06: Design Authorization for Azure Resources](/docs/az-305/identity-governance-monitoring/challenge-06)
