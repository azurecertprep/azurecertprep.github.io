---
sidebar_position: 10
title: "Challenge 10: Design a Resource Tagging Strategy"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 10: Design a Resource Tagging Strategy

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $0-1 | **Exam Weight: 25-30%**

:::

## Introduction

Cloudvista Technologies is a SaaS company that has grown from 20 to 350 employees in three years. Their Azure spend has grown 300% year-over-year, now exceeding $180,000 per month, but the finance team cannot determine which team, project, or client is responsible for which portion of the bill. During a recent production incident, the on-call engineer spent 45 minutes identifying the owner of a failing Azure Function because there was no metadata indicating who built it or which project it supported.

The VP of Engineering has mandated a comprehensive tagging strategy that addresses three urgent needs: (1) Finance must be able to attribute 100% of Azure costs to specific business units, projects, and cost centers by next quarter; (2) Operations must be able to identify the owner and support tier of any resource within 30 seconds during an incident; (3) the Security team needs to classify resources by data sensitivity level for audit purposes. Additionally, the DevOps team wants tags that indicate the deployment mechanism (Terraform, Bicep, manual) and the last deployment date for drift detection.

The challenge is enforcement: Cloudvista has 15 development teams, each using different deployment tools (Terraform, Bicep, Azure CLI, Portal). Some teams are disciplined about tagging; others ignore it entirely. The solution must enforce minimum required tags while allowing teams to add custom tags for their own operational needs. Resources that cannot be tagged (some child resources) must be accounted for through parent resource tagging or alternative attribution methods.

## Exam Skills Covered

- Recommend a strategy for resource tagging

## Design Tasks

### Part 1: Tag Taxonomy Design

1. Design the complete tag taxonomy for Cloudvista. Categorize tags into: mandatory (must exist on every resource), conditional (required in specific contexts), and optional (team-discretion). For each tag, specify: tag name, allowed values (free-form vs. controlled vocabulary), and purpose.
2. Define minimum required tags for cost attribution. These must enable Finance to generate reports showing cost by: business unit, project/application, cost center, and environment.
3. Define operational tags that support incident response. At minimum: resource owner (individual or team), support tier (P1-P4), and deployment mechanism.
4. Define security and compliance tags: data classification level (public, internal, confidential, restricted), regulatory scope (GDPR, SOC2, HIPAA), and whether the resource handles PII.

### Part 2: Tag Enforcement with Azure Policy

5. Design Azure Policy definitions to enforce the mandatory tags. For each mandatory tag, determine the appropriate policy effect: should missing tags be denied (prevent creation), audited (flag non-compliance), or auto-remediated (inherit or apply a default value)?
6. Create a policy strategy for tag value validation. Determine which tags need controlled vocabularies (only specific values allowed) versus free-form text.
7. Design a remediation strategy for the 1,400+ existing resources that lack tags. Determine whether to use Azure Policy remediation tasks with `modify` effect, bulk scripting, or a manual triage process.
8. Address tag inheritance limitations. Azure tags do not automatically inherit from resource groups or subscriptions to child resources. Design a solution for ensuring resources inherit parent tags (options: Azure Policy with `modify` effect, deployment templates, or post-deployment automation).

### Part 3: Cost Allocation and Reporting

9. Design how tags integrate with Azure Cost Management. Specify which tags will be used as cost allocation dimensions, how untagged resources will be attributed, and how shared resources (hub networking, monitoring) will be allocated across business units.
10. Address resources that cannot be tagged (certain child resources, classic resources). Define an alternative cost attribution method for these resources.
11. Define a process for tag hygiene: how stale tag values are detected (e.g., an owner who left the company), who is responsible for updating them, and how often tag compliance is reviewed.

### Part 4: Naming Conventions and Automation

12. Design tag naming conventions: case sensitivity handling (Azure tags are case-insensitive for keys but case-sensitive for values), maximum lengths (tag name: 512 chars, tag value: 256 chars), and character restrictions.
13. Define how IaC tools (Terraform, Bicep) should implement tags. Specify a pattern for default tags applied by the CI/CD pipeline (e.g., deployment timestamp, pipeline run ID, git commit SHA) without requiring developer action.
14. Design a tag compliance dashboard that shows: percentage of resources tagged per team, most common missing tags, and cost of untagged resources.

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-10"
  items={[
    "Designed a complete tag taxonomy with mandatory, conditional, and optional categories",
    "Specified Azure Policy enforcement strategy with appropriate effects for each tag type",
    "Addressed tag inheritance from resource groups to child resources",
    "Defined cost allocation strategy using tags with handling for untaggable resources",
    "Created a remediation plan for existing untagged resources",
    "Documented IaC integration patterns for automatic tag application in CI/CD pipelines"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Recommended Minimum Tags</summary>

Microsoft's Cloud Adoption Framework recommends these minimum tags: `CostCenter`, `Owner`, `Environment` (dev/test/staging/prod), `Application` or `Workload`, `DataClassification`, and `BusinessUnit`. Additional commonly used tags include: `CreatedBy`, `CreatedDate`, `Criticality` (mission-critical/business-critical/low), and `SupportTeam`. Keep mandatory tags to 5-7 maximum to avoid developer friction. Every additional mandatory tag increases the chance of non-compliance.

</details>

<details>
<summary>Hint 2: Policy Effects for Tag Enforcement</summary>

Use different effects for different scenarios: `deny` for truly mandatory tags in production (prevents resource creation without the tag), `audit` for monitoring compliance without blocking (good for rollout periods), `modify` for auto-applying default values or inheriting from resource groups (great for tags like `Environment` that can be inferred from the subscription). The `modify` effect requires a managed identity on the policy assignment. For tag inheritance, use the built-in policy "Inherit a tag from the resource group" with `modify` effect.

</details>

<details>
<summary>Hint 3: Tag Value Validation</summary>

Azure Policy can enforce specific allowed values using the `in` or `notIn` conditions. For example, enforce that `Environment` must be one of: `dev`, `test`, `staging`, `prod`. For tags with many valid values (like `CostCenter`), maintain an allowed list in a policy parameter that updates quarterly. For free-form tags like `Owner`, enforce format patterns (e.g., must be a valid email address) using the `match` or `like` conditions in policy rules.

</details>

<details>
<summary>Hint 4: Handling Existing Resources</summary>

For the 1,400+ existing untagged resources: (1) Start by deploying policies in `audit` mode to assess the gap. (2) Use Azure Resource Graph queries to identify resources missing mandatory tags and export to CSV for team assignment. (3) Create remediation tasks using the `modify` effect to auto-apply tags where values can be inferred (e.g., all resources in rg-ecommerce-prod get `BusinessUnit: E-Commerce`, `Environment: prod`). (4) For tags requiring human input (like `Owner`), assign accountability per resource group and set a 30-day deadline before switching policies to `deny`.

</details>

<details>
<summary>Hint 5: IaC Tag Automation</summary>

In Terraform, use a `default_tags` block in the provider configuration to automatically apply tags to all resources. In Bicep, create a module that merges mandatory tags with resource-specific tags. In CI/CD pipelines, inject dynamic tags (commit SHA, pipeline ID, deployment timestamp) as pipeline variables that pass to the IaC tool. This ensures consistent tagging without developer intervention. Azure DevOps and GitHub Actions can both inject these values automatically.

</details>

## Learning Resources

- [Define your tagging strategy](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-tagging)
- [Azure tagging decision guide](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming-and-tagging-decision-guide)
- [Assign policy to enforce tagging](https://learn.microsoft.com/azure/azure-resource-manager/management/tag-policies)
- [Use tags to organize Azure resources](https://learn.microsoft.com/azure/azure-resource-manager/management/tag-resources)
- [Azure Policy built-in definitions for tags](https://learn.microsoft.com/azure/governance/policy/samples/built-in-policies#tags)
- [Cost allocation with tags in Azure Cost Management](https://learn.microsoft.com/azure/cost-management-billing/costs/cost-analysis-built-in-views)

## Knowledge Check

<details>
<summary>1. Cloudvista wants to ensure every new resource in production subscriptions has a "CostCenter" tag before it can be created. However, in development subscriptions, they want to flag non-compliance without blocking. What policy configuration achieves this?</summary>

**Use the same policy definition with different effects at different scopes.** Assign the "Require CostCenter tag" policy at the production management group with effect `deny` (blocks creation without the tag). Assign the same policy definition at the development management group with effect `audit` (logs non-compliance in the compliance dashboard but allows creation). Alternatively, use a parameterized policy where the effect is a parameter, and use different parameter values per assignment.

</details>

<details>
<summary>2. A resource group is tagged with "Environment: prod" but the resources inside it are not. How can Cloudvista automatically apply the resource group's Environment tag to all child resources?</summary>

**Use the built-in policy "Inherit a tag from the resource group" with the `modify` effect.** This policy automatically copies the specified tag from the resource group to any resource created within it that is missing that tag. Assign it with a managed identity (required for `modify` effect). For existing resources already missing the tag, run a remediation task which retroactively applies the tag to non-compliant resources. Note: this only copies at creation or via remediation - it does not dynamically sync if the RG tag value changes later.

</details>

<details>
<summary>3. Some Azure resources (like managed disk snapshots or certain child resources) do not support tags. How should costs for these resources be attributed?</summary>

**Use multiple attribution methods:** (1) Azure Cost Management allows cost allocation rules that distribute untagged resource costs based on parent resource tags or resource group tags. (2) For resources that support parent-child relationships, tag the parent resource and use cost analysis grouping by resource group. (3) Create cost allocation rules in Azure Cost Management to split shared costs (like networking) proportionally across business units based on a defined formula. (4) Accept that a small percentage (typically under 5%) of costs will require manual attribution.

</details>

<details>
<summary>4. A developer creates a resource via the Azure Portal and forgets to add required tags. The resource is created successfully but appears non-compliant in the policy dashboard. What policy effect was likely used, and what should change for stricter enforcement?</summary>

**The current effect is `audit` (or `auditIfNotExists`)**, which logs non-compliance but does not prevent resource creation. To enforce strictly, change the effect to `deny`, which returns a 403 error and prevents the resource from being created without the required tag. However, this may block Portal users who are unaware of the requirement. A middle ground is to use `deny` for production and `modify` for development (which auto-applies a default value like "unassigned" so the resource is created but flagged for follow-up).

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge10 --location eastus --tags "Environment=Lab"
```

2. Assign a built-in policy that requires a "CostCenter" tag on resource groups:

```bash
SUB_ID=$(az account show --query id -o tsv)
az policy assignment create \
  --name "require-costcenter-tag-lab" \
  --display-name "Require CostCenter tag on resource groups" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/96670d01-0a4d-4649-9c89-2d3abc0a5025" \
  --scope "/subscriptions/$SUB_ID" \
  --params '{"tagName":{"value":"CostCenter"}}'
```

3. Wait for the policy to take effect, then test by creating a resource group without the tag (should be denied):

```bash
sleep 30
az group create --name rg-az305-tag-test-noncompliant --location eastus 2>&1 || echo "Policy denied creation as expected"
```

4. Test creating a compliant resource group with the required tag:

```bash
az group create --name rg-az305-tag-test-compliant --location eastus --tags "CostCenter=12345"
```

5. Verify the policy assignment is active:

```bash
az policy assignment show \
  --name "require-costcenter-tag-lab" \
  --query "{name:displayName, enforcement:enforcementMode, scope:scope}" -o table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
SUB_ID=$(az account show --query id -o tsv)
az policy assignment delete --name "require-costcenter-tag-lab" --scope "/subscriptions/$SUB_ID"
az group delete --name rg-az305-tag-test-compliant --yes --no-wait 2>/dev/null || true
az group delete --name rg-az305-tag-test-noncompliant --yes --no-wait 2>/dev/null || true
az group delete --name rg-az305-challenge10 --yes --no-wait
```

---

**Next**: [Challenge 11: Design a Compliance Solution](/docs/az-305/identity-governance-monitoring/challenge-11)
