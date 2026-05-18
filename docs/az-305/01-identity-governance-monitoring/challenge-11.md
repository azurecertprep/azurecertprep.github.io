---
sidebar_position: 11
title: "Challenge 11: Design a Compliance Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 11: Design a Compliance Solution

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $1-3 | **Exam Weight: 25-30%**

:::

## Introduction

HealthBridge Medical Systems is a healthcare technology company that provides electronic health records (EHR), patient scheduling, and telehealth platforms to 150 hospitals and clinics across the United States. All patient data is stored and processed in Azure, making HIPAA compliance a legal requirement. Beyond HIPAA, HealthBridge has internal standards that exceed regulatory minimums: all storage accounts must use customer-managed encryption keys, no virtual machine may use a public IP address, only approved VM SKUs may be deployed (to control costs and ensure patching compliance), and all resources must send diagnostic logs to a central Log Analytics workspace.

Last month, a junior developer accidentally created a storage account with anonymous blob access enabled in a production subscription. The misconfiguration was discovered 72 hours later during a routine check, resulting in a reportable breach notification. The CISO has mandated that the compliance team implement automated guardrails that prevent non-compliant resources from being created and auto-remediate drift where possible. The team must also produce a monthly compliance report for the board showing adherence to both HIPAA controls and internal standards.

The compliance team consists of only two people and cannot manually review every deployment. They need a policy-as-code approach that scales with the organization's growth (they plan to double their Azure footprint within 18 months). Some development teams have legitimate exceptions - the telehealth team needs public IP addresses for their WebRTC signaling servers, and the data science team needs GPU-enabled VM SKUs not on the standard approved list. The solution must accommodate these exceptions without undermining the overall compliance posture.

## Exam Skills Covered

- Recommend a solution for managing compliance

## Design Tasks

### Part 1: Policy Framework Design

1. Design the Azure Policy initiative structure for HealthBridge. Define separate initiatives for: HIPAA regulatory controls, internal security standards, and cost governance. Determine whether to use the built-in HIPAA HITRUST initiative as-is, customize it, or build a custom initiative.
2. For each policy category below, specify the policy effect and justification:
   - Storage accounts must not allow anonymous blob access (deny vs. audit vs. modify)
   - All VMs must use approved SKUs only (deny with allowed list)
   - All storage must use customer-managed encryption keys (audit vs. deny)
   - No public IP addresses on VMs (deny with exception mechanism)
   - Diagnostic logs must be sent to central Log Analytics (deployIfNotExists)
3. Design the policy assignment hierarchy. Determine which policies apply at which management group or subscription level, considering that some policies must be universal while others are environment-specific (e.g., stricter in production than development).
4. Define a process for creating and managing custom policy definitions versus using built-in policies. Identify which of HealthBridge's requirements are met by built-in policies and which require custom definitions.

### Part 2: Exception Management

5. Design an exemption workflow for teams with legitimate compliance exceptions. Define: who can grant exemptions, what documentation is required, whether exemptions are time-bound (waiver) or permanent (mitigated), and how exemptions are tracked for audit purposes.
6. For the telehealth team's public IP requirement, design the specific exemption mechanism. Choose between: Azure Policy exemptions at the resource group scope, a separate management group with different policies, or a custom policy with exclusion conditions.
7. For the data science team's non-standard VM SKUs, design a policy parameter update process. Determine how the approved SKU list is maintained, who approves additions, and how changes are deployed without downtime.

### Part 3: Auto-Remediation

8. Design auto-remediation policies using the `deployIfNotExists` effect. Define which compliance gaps should be automatically fixed (e.g., enable diagnostic logging, enable encryption) versus which should only be flagged (e.g., deleting a public IP might break a running service).
9. Specify the managed identity requirements for remediation tasks. Define the role assignments needed, the principle of least privilege for remediation identities, and the scope of their permissions.
10. Design a drift detection and correction mechanism. Determine how to handle resources that were compliant at creation but drifted out of compliance (e.g., someone disabled encryption after initial deployment).

### Part 4: Compliance Reporting

11. Design the compliance dashboard and reporting solution. Specify how the monthly board report is generated, what metrics it includes (compliance percentage per initiative, trend over time, top violations), and how the regulatory compliance dashboard in Microsoft Defender for Cloud integrates with Azure Policy.
12. Define alerting for critical compliance violations. Determine which violations trigger immediate alerts (e.g., anonymous blob access enabled) versus which are acceptable to include in weekly compliance reports.
13. Design the audit trail for compliance evidence. Specify how to demonstrate to HIPAA auditors that controls are continuously enforced (Activity Log retention, policy evaluation logs, exemption history).

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-11"
  items={[
    "Designed policy initiative structure separating regulatory, security, and cost governance concerns",
    "Selected appropriate policy effects for each compliance requirement with justified rationale",
    "Created an exemption workflow with time-bound waivers and audit documentation",
    "Specified auto-remediation policies with appropriate managed identity permissions",
    "Designed compliance reporting that produces board-ready monthly summaries",
    "Addressed drift detection for resources that become non-compliant after creation"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Policy Effects Selection Guide</summary>

Choose effects based on impact and urgency: Use `deny` for high-risk violations that must never occur (anonymous blob access, unapproved VM SKUs in production). Use `audit` during rollout periods or for requirements that need human review before enforcement. Use `deployIfNotExists` for configurations that can be safely auto-applied (diagnostic settings, backup policies). Use `modify` for tag enforcement or adding missing configurations that do not disrupt running workloads. Always start with `audit` and graduate to `deny` after teams have had time to remediate existing non-compliance.

</details>

<details>
<summary>Hint 2: Built-in vs. Custom Initiatives</summary>

Azure includes a built-in "HIPAA HITRUST" regulatory compliance initiative with 100+ policy definitions. However, this initiative may be too broad (policies you do not need) or too narrow (missing your internal standards). The recommended approach: (1) Assign the built-in HIPAA initiative for regulatory compliance dashboard visibility, (2) Create a custom initiative for internal standards that references a mix of built-in policy definitions (where they exist) and custom definitions (for unique requirements). This gives you regulatory coverage plus internal enforcement in a single view.

</details>

<details>
<summary>Hint 3: Policy Exemptions</summary>

Azure Policy exemptions can be: `Waiver` (acknowledged non-compliance with expiry date - resource remains non-compliant but does not count against compliance percentage) or `Mitigated` (compensating control exists - resource is excluded from evaluation). Exemptions are scoped (resource, resource group, or subscription level) and support an `expiresOn` date. Best practice: require all waivers to have an expiration date and a linked ticket/justification. Use Azure Resource Graph to query all active exemptions for audit reporting.

</details>

<details>
<summary>Hint 4: Remediation Tasks and Managed Identity</summary>

`deployIfNotExists` and `modify` policies require a managed identity to perform remediation. When you create a policy assignment with these effects, Azure automatically creates a system-assigned managed identity and grants it the roles specified in the policy definition's `roleDefinitionIds`. For custom policies, carefully define the minimum required roles. Remediation tasks can be triggered manually (for existing resources) or automatically (for new non-compliant resources). Automatic remediation only applies to newly evaluated resources; existing resources require a manual remediation task to be created.

</details>

<details>
<summary>Hint 5: Compliance Reporting Architecture</summary>

Combine three data sources for comprehensive reporting: (1) Azure Policy compliance states (available via Azure Resource Graph query: `policyResources | where type == "microsoft.policyinsights/policystates"`), (2) Microsoft Defender for Cloud regulatory compliance dashboard (maps policies to regulatory control IDs), (3) Activity Log entries for exemption changes and policy assignment modifications. Export Policy compliance data to a Log Analytics workspace for historical trending. Use Azure Workbooks or Power BI for the monthly board report.

</details>

## Learning Resources

- [Azure Policy overview](https://learn.microsoft.com/azure/governance/policy/overview)
- [Azure Policy effects](https://learn.microsoft.com/azure/governance/policy/concepts/effect-basics)
- [Azure Policy initiatives (initiative definitions)](https://learn.microsoft.com/azure/governance/policy/concepts/initiative-definition-structure)
- [Remediate non-compliant resources](https://learn.microsoft.com/azure/governance/policy/how-to/remediate-resources)
- [Azure Policy exemptions](https://learn.microsoft.com/azure/governance/policy/concepts/exemption-structure)
- [Regulatory compliance in Microsoft Defender for Cloud](https://learn.microsoft.com/azure/defender-for-cloud/regulatory-compliance-dashboard)
- [Tutorial: Create a custom policy definition](https://learn.microsoft.com/azure/governance/policy/tutorials/create-custom-policy-definition)

## Knowledge Check

<details>
<summary>1. HealthBridge deploys a policy with `deny` effect that prevents storage accounts without customer-managed keys. An existing storage account that was created before the policy lacks CMK. Will this resource be blocked from updates?</summary>

**Yes, if the update triggers policy evaluation on the properties covered by the policy rule.** The `deny` effect evaluates on resource create AND update operations. If the existing storage account is updated (e.g., changing a network rule), and the policy rule evaluates the encryption configuration, the update will be denied until CMK is configured. However, the resource continues to run as-is without modification. This behavior encourages teams to remediate existing non-compliance before making other changes. To avoid this blocking behavior on updates, some teams start with `audit` and migrate to `deny` after remediation.

</details>

<details>
<summary>2. The compliance team needs diagnostic logs automatically enabled on all new Azure SQL databases. No database should be created without logging. Which policy effect is most appropriate?</summary>

**`deployIfNotExists`.** This effect evaluates whether a related resource (the diagnostic setting) exists after the Azure SQL database is created. If the diagnostic setting does not exist, it automatically deploys an ARM template that creates it. This does not block database creation (unlike `deny`) but ensures logging is configured immediately after creation. The policy assignment needs a managed identity with permissions to create diagnostic settings on the target resources.

</details>

<details>
<summary>3. The telehealth team has a permanent need for public IPs on their WebRTC servers. The compliance team wants this exception documented but does not want it to negatively impact the organization's compliance percentage. Which exemption type should they use?</summary>

**Mitigated exemption.** A `Mitigated` exemption indicates that a compensating control exists (in this case, the public IPs are protected by NSGs, DDoS protection, and WAF). Mitigated exemptions exclude the resource from policy evaluation entirely, so it does not appear as non-compliant. A `Waiver` exemption would still show the resource as non-compliant but not count it in the compliance percentage. Since this is permanent (not a temporary exception), `Mitigated` is appropriate with documentation of the compensating controls.

</details>

<details>
<summary>4. HealthBridge assigns a policy initiative with 50 policies at the subscription level. A new developer complains that resource creation takes 30+ seconds longer than before. What is happening and how can it be addressed?</summary>

**Policy evaluation adds latency to resource creation requests.** Each `deny` and `append/modify` effect policy must be evaluated before the request reaches the resource provider. With 50 policies, this evaluation chain adds noticeable latency. To address: (1) Ensure policies use efficient conditions (avoid complex nested logic), (2) Disable policies that are not actively needed (use the `disabled` effect rather than deleting), (3) Use resource selectors to limit policy evaluation to specific resource types rather than evaluating all 50 policies against every resource type. Note: `auditIfNotExists` and `deployIfNotExists` evaluate AFTER resource creation and do not add creation latency.

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge11 --location eastus
```

2. Assign the Azure Security Benchmark initiative to the resource group:

```bash
RG_ID=$(az group show --name rg-az305-challenge11 --query id -o tsv)
az policy assignment create \
  --name "asb-initiative-lab" \
  --display-name "Azure Security Benchmark (Lab)" \
  --policy-set-definition "/providers/Microsoft.Authorization/policySetDefinitions/1f3afdf9-d0c9-4c3d-847f-89da613e70a8" \
  --scope "$RG_ID" \
  --enforcement-mode DoNotEnforce
```

3. Deploy a storage account to evaluate compliance against:

```bash
az storage account create \
  --name staz305ch11$RANDOM \
  --resource-group rg-az305-challenge11 \
  --location eastus \
  --sku Standard_LRS \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false
```

4. Trigger a compliance evaluation (results take 10-15 minutes):

```bash
az policy state trigger-scan --resource-group rg-az305-challenge11 --no-wait
```

5. Verify the initiative assignment is active:

```bash
az policy assignment show \
  --name "asb-initiative-lab" \
  --scope "$RG_ID" \
  --query "{name:displayName, enforcement:enforcementMode, scope:scope}" -o table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
RG_ID=$(az group show --name rg-az305-challenge11 --query id -o tsv)
az policy assignment delete --name "asb-initiative-lab" --scope "$RG_ID"
az group delete --name rg-az305-challenge11 --yes --no-wait
```

---

**Next**: [Challenge 12: Design Identity Governance](/docs/az-305/identity-governance-monitoring/challenge-12)
