---
sidebar_position: 13
title: "Challenge 13: Design Governance for a Multi-Team Organization"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 13: Design Governance for a Multi-Team Organization

:::info Estimated Time and Cost

**90-120 min** | **Estimated cost**: $2-5 | **Exam Weight: 25-30%**

:::

## Introduction

Contoso Consulting is a 500-person technology consulting firm serving clients in three highly regulated industries: healthcare, financial services, and retail. Each client engagement (typically 6-18 months) receives its own dedicated Azure environment to ensure data isolation. At any given time, Contoso runs 30-40 active engagements across 12 project teams. Consultants rotate between engagements every 3-6 months, and some senior architects work on multiple engagements simultaneously.

The current state is unsustainable. Contoso has 45 Azure subscriptions with no consistent structure: some engagements share subscriptions, others have multiple subscriptions for a single client. Tagging is inconsistent (some use "Client" tag, others use "Customer" or "Project"), making cost attribution for client billing nearly impossible. Each engagement team deploys their own governance, resulting in wildly different compliance postures - a critical problem when healthcare clients require HIPAA compliance, financial clients require PCI-DSS, and retail clients have their own data privacy requirements. When consultants rotate off an engagement, their access often lingers for months because there is no automated deprovisioning tied to engagement lifecycle.

The CTO has allocated budget for a comprehensive governance redesign. The solution must: (1) provide complete client data isolation with provable compliance boundaries, (2) enable per-engagement cost tracking for accurate client billing, (3) enforce industry-specific compliance policies without manual per-engagement configuration, (4) automate consultant access lifecycle tied to engagement assignments, and (5) scale to support a planned growth to 60+ concurrent engagements within two years. This is the culmination of your governance design work - integrating management group structure, tagging, policy, and identity governance into a cohesive solution.

## Exam Skills Covered

- Recommend a structure for management groups, subscriptions, and resource groups
- Recommend a strategy for resource tagging
- Recommend a solution for managing compliance
- Recommend a solution for identity governance

## Design Tasks

### Part 1: Management Group and Subscription Architecture

1. Design the complete management group hierarchy for Contoso Consulting. Consider groups for: platform/shared services, industry-specific landing zones (healthcare, financial, retail), sandbox/training environments, and decommissioned engagements. Reference the design patterns from Challenge 09.
2. Define the subscription strategy for client engagements. Decide: one subscription per engagement, one subscription per client (with resource groups per engagement), or one subscription per industry. Justify the choice considering data isolation, cost tracking, policy inheritance, and scale limits.
3. Design the shared services model. Determine how hub networking (Azure Firewall, DNS, VPN), centralized monitoring, and identity services are structured. All engagement environments must route through a central firewall for egress filtering and logging.
4. Define the engagement lifecycle for subscriptions: how a new engagement subscription is provisioned (subscription vending), how it is configured with the correct policies based on client industry, and how it is decommissioned (data retained per contract, resources deleted, subscription moved to "Decommissioned" management group).

### Part 2: Tagging Strategy for Client Billing

5. Design the mandatory tag taxonomy for Contoso. Include tags for: client name, engagement ID, industry vertical, engagement manager, billing code, start date, and expected end date. Reference the patterns from Challenge 10.
6. Define how tags enable per-engagement cost attribution for client billing. Address shared costs (networking, monitoring, security tools) that must be allocated proportionally across engagements.
7. Design tag enforcement policies. Determine which tags use `deny` (must exist before resource creation), which use `modify` (auto-inherit from resource group), and which use `audit` (flag for follow-up). Consider that engagement teams use different IaC tools and some manual Portal deployments.
8. Address the tag migration plan for the 45 existing subscriptions. Determine how to normalize inconsistent tag names ("Client" vs. "Customer" vs. "Project") into the new standard taxonomy.

### Part 3: Industry-Specific Compliance Policies

9. Design policy initiatives for each industry vertical:
   - **Healthcare (HIPAA):** encryption at rest with CMK, no public endpoints, audit logging required, PHI data classification tags mandatory
   - **Financial (PCI-DSS):** network segmentation required, key separation (separate Key Vaults per environment), approved VM SKUs only, vulnerability scanning enabled
   - **Retail:** data residency enforcement (resources only in approved regions), PII handling tags, GDPR right-to-deletion support
10. Design the policy assignment model that automatically applies the correct industry initiative when an engagement subscription is placed in the corresponding management group. No manual policy assignment should be needed.
11. Define the exemption process for cross-industry requirements. Some engagements span multiple regulatory frameworks (e.g., a healthcare client that also processes payments). Design how overlapping compliance requirements are handled.
12. Design the compliance reporting structure. Each client contract requires monthly compliance attestation. Define how per-engagement compliance reports are generated showing adherence to the specific regulatory framework applicable to that engagement.

### Part 4: Identity Governance for Consultant Rotation

13. Design access packages for engagement-level access (reference Challenge 12). Create access package templates for: "Engagement Contributor" (deploy resources within the engagement subscription), "Engagement Reader" (client stakeholder read-only access), and "Engagement Admin" (full control for the engagement lead). Each package should be scoped to a specific engagement.
14. Design the consultant rotation workflow. When a consultant is assigned to a new engagement (by their resource manager in the project management tool), they should automatically receive the appropriate access package. When removed from an engagement, access should be revoked within 24 hours.
15. Design the engagement lifecycle integration with access reviews. Configure quarterly access reviews for each engagement where the engagement manager attests that all team members still need access. Define what happens when an engagement officially ends (all access packages expire, guest accounts for client stakeholders are disabled).
16. Design the privileged access model for engagement environments. Determine how "break glass" emergency access works within a client's isolated environment, who has standing privileged access (if anyone), and how PIM eligibility is scoped per engagement.

### Part 5: Operational Integration

17. Design a "new engagement onboarding" automation that orchestrates the entire setup: subscription provisioning, management group placement, policy inheritance verification, tag application, access package creation, and hub network peering. Define the inputs (client name, industry, engagement team roster, duration) and the expected outputs.
18. Design monitoring and alerting for governance drift across all 30-40 concurrent engagements. Define how the central governance team detects and responds to: a subscription with compliance violations, an engagement with orphaned access (consultants no longer assigned but still have access), or a subscription approaching cost thresholds.
19. Design the engagement offboarding process: data retention per contractual obligations, resource deletion after retention period, subscription cleanup, access revocation for all team members and guest accounts, and movement of the subscription to the "Decommissioned" management group.

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-13"
  items={[
    "Designed an integrated management group hierarchy supporting industry-specific compliance inheritance",
    "Created subscription strategy ensuring complete client data isolation with engagement-level cost tracking",
    "Defined industry-specific policy initiatives that auto-apply based on MG placement",
    "Designed tag taxonomy and enforcement enabling per-engagement client billing",
    "Implemented identity governance with access packages tied to engagement lifecycle",
    "Specified end-to-end automation for engagement onboarding and offboarding"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Management Group Design for Multi-Industry</summary>

Consider this hierarchy: Root > Contoso (custom root) > Platform (Connectivity, Identity, Management) + Landing Zones (Healthcare, Financial, Retail) + Sandbox + Decommissioned. Each industry MG has the corresponding regulatory initiative assigned. When a new engagement starts, place the subscription under the correct industry MG and it automatically inherits the compliance policies. For engagements spanning multiple industries, place the subscription under the strictest MG and add the additional initiative as a direct assignment.

</details>

<details>
<summary>Hint 2: Subscription per Engagement Pattern</summary>

For a consulting firm with strict client isolation requirements, one subscription per engagement is the strongest isolation boundary. It provides: clean cost tracking (subscription = billing unit = engagement), RBAC isolation (engagement team is Contributor only in their subscription), policy isolation (can apply engagement-specific policies), and clean decommissioning (delete the subscription after retention). The trade-off is subscription sprawl (60+ subscriptions), but subscription vending automation makes this manageable. Use resource groups within the subscription for workload organization (e.g., rg-networking, rg-application, rg-data).

</details>

<details>
<summary>Hint 3: Dynamic Access Packages per Engagement</summary>

Create a "catalog" per industry vertical in Entitlement Management. When a new engagement is onboarded, the automation creates: (1) A security group for the engagement (e.g., "sg-engagement-ACME-2025"), (2) Azure RBAC assignments for that group on the engagement subscription, (3) An access package in the appropriate catalog that grants membership in the engagement group. Consultants request (or are auto-assigned via API) the access package. Set expiration to the engagement end date. When the engagement ends, expire the access package and all members lose access simultaneously.

</details>

<details>
<summary>Hint 4: Compliance Inheritance via MG Placement</summary>

The power of the MG + Policy model: Assign the HIPAA initiative at the "Healthcare" management group. Any subscription placed under this MG automatically evaluates against HIPAA controls with no manual policy assignment. This is why MG hierarchy design is critical - it enables "policy-by-placement." For the new engagement onboarding automation, the only input needed for compliance is "which industry is this client in?" - the automation places the subscription in the correct MG and compliance is inherited. Test this by checking the regulatory compliance dashboard after placement.

</details>

<details>
<summary>Hint 5: Engagement Offboarding Sequence</summary>

The offboarding sequence must be ordered: (1) Notify all team members that access will be revoked in 7 days, (2) Expire all access packages for the engagement, (3) Disable guest accounts for client stakeholders, (4) Create a final compliance report for the engagement (contractual deliverable), (5) Export and archive any required data to long-term storage per the retention clause, (6) Delete all resources in the subscription (or run `az group delete` for each resource group), (7) Move the subscription to the "Decommissioned" management group (which has no policies, preventing new resource creation), (8) After the contractual retention period, cancel the subscription. Automate this as a multi-stage Logic App or Durable Function with approval gates.

</details>

## Learning Resources

- [Cloud Adoption Framework landing zone architecture](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/)
- [Management group and subscription organization](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/resource-org)
- [Azure Policy governance design](https://learn.microsoft.com/azure/governance/policy/overview)
- [Microsoft Entra entitlement management](https://learn.microsoft.com/entra/id-governance/entitlement-management-overview)
- [Subscription vending automation](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/subscription-vending)
- [Tagging strategy for Azure](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-tagging)
- [Azure landing zone FAQ](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/enterprise-scale/faq)

## Knowledge Check

<details>
<summary>1. Contoso onboards a new healthcare client engagement. The onboarding automation creates a subscription and places it under the "Healthcare" management group. What compliance policies are automatically enforced without any additional configuration?</summary>

**All policies assigned at the Healthcare management group and all parent management groups above it.** Policy inheritance means the subscription receives: (1) Root-level policies (mandatory tags, diagnostic logging), (2) Landing Zone-level policies (if any intermediate MG has policies), and (3) Healthcare MG policies (HIPAA initiative - encryption, no public endpoints, audit logging). This "compliance by placement" model eliminates manual per-subscription policy assignment and ensures every healthcare engagement has identical compliance posture from day one.

</details>

<details>
<summary>2. A consultant is working on two engagements simultaneously (a healthcare and a financial client). They need Contributor access to both engagement subscriptions. How should this be managed with entitlement management?</summary>

**The consultant requests (or is assigned) two separate access packages - one for each engagement.** Each access package grants Contributor access to the specific engagement subscription through group membership. Each package has its own expiration date (matching the respective engagement end dates), approval workflow, and access review schedule. This ensures that when one engagement ends, only that specific access is revoked while the other remains active. The packages can be from different catalogs (healthcare catalog and financial catalog) with different policies appropriate to each industry.

</details>

<details>
<summary>3. Contoso needs to bill Client A for their Azure consumption last month. The engagement subscription also contains shared monitoring resources that serve multiple engagements. How are costs accurately attributed?</summary>

**Use a combination of subscription-level billing and tag-based cost allocation for shared resources.** Primary engagement costs are easily attributed because each engagement has its own subscription (subscription cost = engagement cost). For shared resources in the platform subscription (monitoring, networking), use Azure Cost Management cost allocation rules to distribute costs proportionally based on: per-engagement consumption metrics (data ingested per workspace), fixed allocation percentages defined in the engagement contract, or tag-based allocation (tag shared resources with all engagement IDs they serve and split evenly). The "EngagementID" tag on all resources ensures any cross-subscription resource costs are attributable.

</details>

<details>
<summary>4. An engagement ends and the offboarding process begins. The client contract requires data retention for 7 years, but the subscription resources should be deleted immediately to stop incurring costs. How do you reconcile these requirements?</summary>

**Export required data to long-term archival storage before deleting engagement resources.** The offboarding workflow should: (1) Identify data subject to retention (databases, storage accounts, logs), (2) Export data to a dedicated archival storage account in the Platform subscription (using Archive tier for cost efficiency), (3) Tag the archived data with the engagement ID and retention expiry date (for automated deletion after 7 years), (4) Delete all resources in the engagement subscription to stop costs, (5) Move the empty subscription to "Decommissioned" management group, (6) Create an automation that checks archive retention dates and purges data after 7 years. This separates the retention obligation from the running cost obligation.

</details>

## Cleanup

```bash
# This capstone challenge creates significant infrastructure. Clean up in order:

# 1. Remove access packages and catalogs (via Portal or Graph API)
# az rest --method DELETE --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/accessPackages/<package-id>"

# 2. Remove policy assignments from management groups
az policy assignment delete --name "hipaa-initiative" --scope "/providers/Microsoft.Management/managementGroups/mg-contoso-healthcare"
az policy assignment delete --name "pcidss-initiative" --scope "/providers/Microsoft.Management/managementGroups/mg-contoso-financial"
az policy assignment delete --name "retail-privacy" --scope "/providers/Microsoft.Management/managementGroups/mg-contoso-retail"

# 3. Remove test resource groups
az group delete --name rg-engagement-demo --yes --no-wait
az group delete --name rg-contoso-platform --yes --no-wait

# 4. Remove management groups (must remove child subscriptions/MGs first)
az account management-group delete --name "mg-contoso-decommissioned"
az account management-group delete --name "mg-contoso-sandbox"
az account management-group delete --name "mg-contoso-healthcare"
az account management-group delete --name "mg-contoso-financial"
az account management-group delete --name "mg-contoso-retail"
az account management-group delete --name "mg-contoso-platform"
az account management-group delete --name "mg-contoso-root"
```

---

**Next**: [Challenge 14: Design a Data Storage Solution](/docs/az-305/data-storage/challenge-14)
