---
sidebar_position: 9
title: "Challenge 09: Design a Management Group & Subscription Structure"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 09: design a Management Group & Subscription structure

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $0-1 | **Exam Weight: 25-30%**

:::

## Introduction

Northwind Traders is a multinational retail and logistics company with 200+ developers spread across five business units: E-Commerce, Supply Chain, In-Store Technology, Data Analytics, and Corporate IT. Over the past three years, they grew their Azure footprint organically under a single Enterprise Agreement subscription. The result is a tangled mess: 1,400 resources in one subscription with no clear ownership boundaries, developers from one team accidentally modifying another team's resources, and policy enforcement that either applies too broadly or not at all.

The CTO has approved a migration to a structured multi-subscription environment aligned with the Cloud Adoption Framework. Key requirements include: each business unit needs workload isolation with independent cost tracking, a shared services infrastructure (hub networking, DNS, monitoring) must be centrally managed by Corporate IT, production environments must be locked down with stricter policies than development, and the governance team needs the ability to apply organization-wide security baselines without impacting individual team autonomy. The company anticipates acquiring two smaller companies within 18 months, and the structure must accommodate new business units without redesign.

Your design must balance governance centralization (security, compliance) with decentralized workload autonomy (each BU manages its own subscriptions). The CFO requires cost attribution at the business unit level, and the security team needs a single pane of glass for compliance reporting across all subscriptions.

## Exam skills covered

- Recommend a structure for management groups, subscriptions, and resource groups

## Design tasks

### Part 1: Management Group hierarchy

1. Design a management group hierarchy for Northwind Traders. Include at minimum: a root management group strategy, separation between platform/shared services and workload landing zones, and accommodation for sandbox/dev environments that need relaxed policies.
2. Define how many levels deep the hierarchy should go and justify the depth. Document the trade-offs of deep hierarchies (granular policy targeting) versus shallow hierarchies (simpler management, Azure limit of 6 levels of depth).
3. Specify how the two future acquisitions will be onboarded into the hierarchy without restructuring existing management groups.
4. Define the governance inheritance model: which policies should be applied at the root level (affecting all subscriptions) versus lower management group levels.

### Part 2: Subscription design

5. Determine the subscription strategy for each business unit. Evaluate and choose between: one subscription per environment per BU, one subscription per workload, or a hybrid model. Document the reasoning.
6. Design the shared services / platform subscription model. Determine whether networking, monitoring, and identity services live in a single platform subscription or are split (e.g., connectivity subscription, management subscription, identity subscription per CAF).
7. Specify how sandbox subscriptions should be handled: who can create them, what spending limits apply, and how they are prevented from connecting to production networks.
8. Define subscription-level RBAC assignments. Determine which roles (Owner, Contributor, Reader, custom) each persona (BU lead, developer, SRE, security team) receives at each subscription level.

### Part 3: Resource Group strategy

9. Design a resource group naming convention and organization pattern. Define whether resource groups are organized by application, by lifecycle (deploy together/delete together), by resource type, or a combination.
10. Specify resource group-level policies and locks. Determine which resource groups need CanNotDelete locks and which need ReadOnly locks.
11. Define a process for resource group lifecycle management: who creates them, under what conditions, and how orphaned resource groups are identified and cleaned up.

### Part 4: naming conventions

12. Create a naming convention standard for management groups, subscriptions, and resource groups that encodes: environment, business unit, region, and purpose. Ensure names are globally unique where required and within length limits.

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-09"
  items={[
    "Designed a management group hierarchy aligned with Cloud Adoption Framework landing zone architecture",
    "Defined subscription strategy with clear isolation boundaries per business unit and environment",
    "Specified shared services / platform subscription model with centralized networking",
    "Created governance inheritance model showing which policies apply at which MG level",
    "Documented a scalable naming convention for MGs, subscriptions, and resource groups",
    "Addressed acquisition onboarding without hierarchy restructuring"
  ]}
/>

## Hints

<details>
<summary>Hint 1: CAF Landing Zone Hierarchy</summary>

The Cloud Adoption Framework recommends a standard hierarchy: Root MG > Platform (with children: Identity, Management, Connectivity) and Landing Zones (with children: Corp, Online). Additional top-level groups include Sandbox and Decommissioned. This gives you centralized platform control while allowing landing zone teams autonomy. You can add business-unit-level management groups under "Landing Zones" for per-BU policy targeting. Azure supports up to 6 levels of depth below the root tenant group.

</details>

<details>
<summary>Hint 2: Subscription Limits and Boundaries</summary>

Subscriptions serve as a unit of: billing (cost tracking), access control (RBAC boundary), policy scope, and resource limits (e.g., 980 resource groups per subscription, vCPU quotas). The CAF recommends creating new subscriptions when you need to: separate environments for compliance, isolate blast radius for production, or create distinct billing boundaries. Avoid creating subscriptions merely for organizational purposes when resource groups would suffice.

</details>

<details>
<summary>Hint 3: Policy Inheritance and Overrides</summary>

Policies assigned at a management group level apply to all child management groups, subscriptions, and resource groups below. You cannot override a policy from a parent scope - you can only add more policies or use exemptions. This means policies at the root MG must be universally applicable (e.g., "all resources must have a CostCenter tag," "diagnostic logging must be enabled"). Environment-specific restrictions (like "no public IPs in production") should be applied at the production MG level only, not the root.

</details>

<details>
<summary>Hint 4: Subscription Vending</summary>

For enterprises with multiple teams needing subscriptions, consider a "subscription vending" pattern: an automated process (using Bicep/Terraform modules) that creates a new subscription with baseline configuration (RBAC, policies, networking peering, diagnostic settings) when a team requests one. This ensures consistency and speeds onboarding. Each subscription should be "born" with the correct management group placement, networking connectivity, and monitoring configuration.

</details>

<details>
<summary>Hint 5: Sandbox Isolation</summary>

Sandbox subscriptions need special treatment: place them in a dedicated management group with relaxed policies (no deny policies, only audit). Critically, sandbox subscriptions should NOT be peered to production virtual networks. Apply spending limits or budget alerts. Consider using Azure Dev/Test subscription offer types for lower compute pricing. Some organizations auto-delete sandbox resources after 30 days using automation.

</details>

## Learning resources

- [Azure landing zone management group hierarchy](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/resource-org-management-groups)
- [Subscription organization and governance](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/resource-org-subscriptions)
- [Resource group design considerations](https://learn.microsoft.com/azure/azure-resource-manager/management/overview#resource-groups)
- [Azure naming conventions](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming)
- [Management group design considerations](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/resource-org-management-groups)
- [Subscription vending](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/subscription-vending)

## Knowledge check

<details>
<summary>1. Northwind's security team wants to enforce a policy that prevents any resource from being created without a "CostCenter" tag. This must apply to ALL subscriptions including future acquisitions. Where should this policy be assigned?</summary>

**At the root management group (or the highest custom management group below the tenant root).** Assigning at this level ensures the policy inherits to all current and future child management groups, subscriptions, and resources. New acquisitions onboarded under the root will automatically inherit this policy. Assigning at lower levels would miss subscriptions in other branches of the hierarchy.

</details>

<details>
<summary>2. The E-Commerce team wants to deploy resources with public IP addresses for their internet-facing services, but the Supply Chain team operates exclusively on private networks. How should policy be structured to accommodate both needs?</summary>

**Use separate management groups for each business unit (or environment type) and apply the "deny public IPs" policy only at the Supply Chain management group level.** Do NOT apply the deny-public-IP policy at the root, as it would block E-Commerce's legitimate need. Instead, place BU-specific restrictions at the BU management group level. Alternatively, use the "Corp" and "Online" landing zone separation pattern from CAF where "Corp" denies public IPs and "Online" permits them.

</details>

<details>
<summary>3. Northwind is evaluating whether the Data Analytics team needs its own subscription or can share the E-Commerce subscription with resource group separation. What factors determine whether a new subscription is warranted?</summary>

**Create a separate subscription when:** (1) the teams need independent billing/cost tracking at the subscription level, (2) they have different compliance or policy requirements that cannot coexist, (3) resource limits (vCPU quotas, resource group count) might be exceeded, (4) blast radius isolation is needed (a misconfiguration in one team cannot affect the other), or (5) different RBAC boundaries are required (subscription-level Contributor for one team should not grant access to the other). If only organizational separation is needed and the teams share policies and RBAC patterns, resource groups within the same subscription may suffice.

</details>

<details>
<summary>4. Azure management groups have a limit of 6 levels of depth. Northwind's proposed hierarchy has: Root > Industry > Region > BU > Environment > Workload. Should they use all 6 levels?</summary>

**Generally no - keep the hierarchy to 3-4 levels.** Deeper hierarchies create complexity in policy troubleshooting (policies from 6 levels of inheritance are hard to debug), slow down policy evaluation, and reduce agility. The CAF recommendation is typically 3-4 levels (Root > Platform/Landing Zones > Environment-type or BU > Subscriptions). Use resource groups and tags for additional categorization rather than adding MG levels. Each level should serve a clear policy or RBAC differentiation purpose - if two levels would have identical policies, merge them.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge09 --location eastus
```

2. Create a test management group to simulate your hierarchy:

```bash
az account management-group create \
  --name "mg-az305-challenge09-lab" \
  --display-name "AZ-305 Challenge 09 Lab"
```

3. Create a child management group under the test group:

```bash
az account management-group create \
  --name "mg-az305-ch09-workloads" \
  --display-name "Workloads" \
  --parent "mg-az305-challenge09-lab"
```

4. Verify the management group hierarchy:

```bash
az account management-group show \
  --name "mg-az305-challenge09-lab" \
  --expand \
  --recurse \
  --query "{name:displayName, children:children[].displayName}" -o json
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az account management-group delete --name "mg-az305-ch09-workloads"
az account management-group delete --name "mg-az305-challenge09-lab"
az group delete --name rg-az305-challenge09 --yes --no-wait
```

---

**Next**: [Challenge 10: Design a Resource Tagging Strategy](/docs/az-305/identity-governance-monitoring/challenge-10)
