---
sidebar_position: 12
title: "Challenge 12: Design Identity Governance"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 12: design identity governance

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $0-2 | **Exam Weight: 25-30%**

:::

## Introduction

Velocity Dynamics is a global engineering firm with 4,000 employees, 800 contractors, and an annual employee turnover rate of 25%. A recent security audit revealed alarming findings: 40% of users had access to Azure resources and applications they no longer needed for their current role, 15% of external contractor accounts remained active months after their contracts ended, and three former employees still had Contributor access to production subscriptions weeks after departure. The audit also found that 12 service accounts had permanent Global Administrator privileges with no justification or review process.

The CISO has been given a board mandate to implement zero-standing-access principles and automated identity lifecycle management within 6 months. Requirements include: all privileged access must be just-in-time (activated only when needed with time limits), access to sensitive resources must be reviewed quarterly with automatic revocation for non-responsive reviewers, new employees must automatically receive baseline access based on their department and role, and contractors must have access that automatically expires when their engagement ends. The company uses Microsoft Entra ID P2 licenses.

The challenge is balancing security rigor with operational efficiency. Engineers frequently need elevated access for troubleshooting (but not permanently). Project teams form and dissolve every 3-6 months, requiring dynamic access grants. The HR system (Workday) is the authoritative source for employee lifecycle events (hire, transfer, terminate), but contractor onboarding is managed by individual project managers with no centralized system.

## Exam skills covered

- Recommend a solution for identity governance

## Design tasks

### Part 1: privileged identity Management (pim)

1. Design the PIM configuration for Azure resource roles. Define which roles should be eligible (activated on-demand) versus permanently assigned. For each privileged role (Global Administrator, Subscription Owner, Subscription Contributor, Key Vault Administrator), specify: maximum activation duration, approval requirements, and MFA enforcement.
2. Design PIM for Entra ID directory roles. Determine which directory roles (Global Admin, User Administrator, Security Administrator, Privileged Role Administrator) need activation policies, and define the approval workflow (who approves, escalation path, auto-approval conditions).
3. Specify the alerting and notification configuration for PIM. Define who receives notifications when: a role is activated, a role activation is pending approval, a permanent assignment is made outside PIM, or an eligible assignment is about to expire.
4. Design the strategy for the 12 service accounts with permanent Global Administrator access. Determine how to transition these to least-privilege access (which may require breaking them into multiple service principals with specific role assignments).

### Part 2: access reviews

5. Design the access review program for Velocity Dynamics. Define review scopes: which groups, roles, application assignments, and Azure resource role assignments need periodic review. Specify review frequency (quarterly, semi-annually) based on risk level.
6. Define the reviewer assignment strategy. For each review type, determine who reviews: manager reviews direct reports' access, group owners review membership, resource owners review access to their resources, or self-attestation. Address scenarios where the designated reviewer is unresponsive.
7. Configure auto-apply settings for access reviews. Determine when access should be automatically revoked (reviewer does not respond within 14 days, reviewer explicitly denies, recommendations indicate unused access) versus when human intervention is required.
8. Design access reviews specifically for external/guest users. Define the review cadence, criteria for automatic removal (no sign-in for 90 days), and the notification workflow before access revocation.

### Part 3: entitlement Management

9. Design access packages for common role-based access patterns. Create access packages for: "Engineering Team Member" (baseline Azure resources + development tools), "Production Support" (read access to production + limited write for incident response), and "Data Analyst" (access to data lake + BI tools). Define what resources each package grants and the approval workflow.
10. Design the access package catalog structure. Determine whether to use a single catalog or multiple catalogs (per department, per project, per sensitivity level). Define catalog owners and their responsibilities.
11. Configure access package policies for different requestor types: internal employees (auto-approved for baseline packages), contractors (manager approval required), and cross-department requests (resource owner approval). Set expiration policies for each type.
12. Design connected organizations for contractor access. Determine how external partner organizations are onboarded, how their users request access packages, and how access is automatically removed when the partnership agreement ends.

### Part 4: lifecycle workflows

13. Design lifecycle workflows triggered by HR events from Workday. Define workflows for: joiner (new hire receives baseline access + department-specific access on start date), mover (employee changes department, old access revoked, new access granted), and leaver (all access revoked on last day, account disabled, licenses reclaimed after 30 days).
14. Address the contractor lifecycle gap (no centralized HR system). Design a process for contractor onboarding that ensures: sponsor accountability, time-bound access, and automatic disable if the contract end date passes without renewal.
15. Define temporary access workflows for project-based work. Design how an engineer gets time-limited access to a specific project's resources, and how that access automatically expires when the project milestone completes.

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-12"
  items={[
    "Designed PIM configuration eliminating permanent privileged access with appropriate activation policies",
    "Created access review program covering groups, roles, and guest users with auto-apply settings",
    "Designed entitlement management access packages for common role-based access patterns",
    "Specified lifecycle workflows for joiner/mover/leaver scenarios integrated with HR system",
    "Addressed contractor lifecycle management with time-bound access and sponsor accountability",
    "Defined alerting and escalation procedures for governance events"
  ]}
/>

## Hints

<details>
<summary>Hint 1: PIM Activation Settings</summary>

Key PIM settings per role: Maximum activation duration (default 8 hours, reduce to 1-4 hours for Global Admin), require MFA on activation, require justification text, require ticket number (for audit trail), require approval (for the most sensitive roles like Global Admin and Privileged Role Administrator). For production Subscription Owner, require approval from the security team. For Subscription Contributor in development, allow self-activation with MFA and justification (no approval needed, reduces friction). Eligible assignments should expire after 6-12 months and require re-assignment.

</details>

<details>
<summary>Hint 2: Access Review Best Practices</summary>

Configure reviews with: auto-apply results enabled (removes access when denied or not responded to), "If reviewers don't respond" set to "Remove access" (prevents rubber-stamping by inaction), send reminders starting 3 days before due date, and use "Recommendations" feature (shows whether the user has signed in to the resource in the past 30 days). For high-risk reviews (Global Admin eligible assignments), set frequency to quarterly. For standard group memberships, semi-annual is typically sufficient. Multi-stage reviews allow manager review followed by resource owner review for sensitive resources.

</details>

<details>
<summary>Hint 3: Entitlement Management Structure</summary>

Access packages bundle related resource access: groups (for RBAC), application role assignments, and SharePoint sites into a single requestable unit. Use catalogs to organize packages by domain (e.g., "Engineering Catalog" owned by VP of Engineering). Each access package can have multiple policies (different approval flows for different requestor types). Set expiration to match expected need duration: 365 days for employee role-based packages (with access review before expiry), 90-180 days for contractor packages, 30 days for temporary project access.

</details>

<details>
<summary>Hint 4: Lifecycle Workflow Integration</summary>

Microsoft Entra lifecycle workflows support triggers based on user attribute changes synced from HR (via Entra ID provisioning from Workday/SAP SuccessFactors). Key triggers: `employeeHireDate` minus N days (pre-hire tasks like account creation), `employeeHireDate` (joiner tasks like group membership, license assignment), attribute change on `department` (mover tasks), and `employeeLeaveDateTime` (leaver tasks like disable account, remove groups). Custom task extensions can call Logic Apps for complex workflows (e.g., notify IT to ship laptop, trigger access package assignment).

</details>

<details>
<summary>Hint 5: Contractor Lifecycle Without HR System</summary>

For contractors without an HR system signal: (1) Require a "sponsor" (internal employee who is accountable for the contractor's access), (2) Set the guest account's `accountExpires` attribute to the contract end date, (3) Use access package expiration policies (access auto-expires after 90/180 days, contractor must re-request), (4) Configure access reviews where the sponsor must attest quarterly that the contractor still needs access, (5) Use a conditional access policy with sign-in risk that blocks access from unexpected locations. Consider creating a "Contractor Offboarding" lifecycle workflow triggered by the account expiration date.

</details>

## Learning resources

- [What is Microsoft Entra ID Governance?](https://learn.microsoft.com/entra/id-governance/identity-governance-overview)
- [Plan a Microsoft Entra access reviews deployment](https://learn.microsoft.com/entra/id-governance/deploy-access-reviews)
- [What is Microsoft Entra Privileged Identity Management?](https://learn.microsoft.com/entra/id-governance/privileged-identity-management/pim-configure)
- [What is entitlement management?](https://learn.microsoft.com/entra/id-governance/entitlement-management-overview)
- [What are lifecycle workflows?](https://learn.microsoft.com/entra/id-governance/what-are-lifecycle-workflows)
- [Plan a lifecycle workflow deployment](https://learn.microsoft.com/entra/id-governance/lifecycle-workflows-deployment)

## Knowledge check

<details>
<summary>1. A production incident requires an engineer to activate the Subscription Owner role at 2 AM. The standard approval workflow requires the security team lead to approve, but they are unavailable. How should PIM be configured to handle this scenario?</summary>

**Configure an escalation path in the approval workflow.** PIM supports multi-level approval with escalation. Configure the primary approver as the security team lead, with an escalation approver (e.g., a security team group or the CISO) who is notified if the request is not approved within 30-60 minutes. Alternatively, for emergency scenarios, configure a "break glass" account with permanent Owner access (stored securely, usage monitored, access reviewed monthly). Some organizations also create a separate "Emergency Access" PIM role with a shorter approval timeout and alerting.

</details>

<details>
<summary>2. An access review for the "Production Contributors" group shows that a reviewer has not responded after 14 days. The review is configured with auto-apply and "If reviewers don't respond: Remove access." What happens next?</summary>

**Access is automatically revoked.** When the review period ends and a reviewer has not responded, the "no response" action takes effect. With "Remove access" configured, the user is automatically removed from the group. This is the recommended configuration to prevent "rubber-stamping" (where reviewers ignore reviews and everyone keeps access). The affected user receives a notification that their access was removed. They can re-request access through entitlement management if still needed. To prevent surprise removals, configure reminder emails 3 and 7 days before the review deadline.

</details>

<details>
<summary>3. Velocity Dynamics needs a new contractor to have access to three Azure resource groups, two SaaS applications, and a SharePoint site on their first day. The contractor's manager should approve. What Entra ID Governance feature bundles all this access into a single request?</summary>

**Entitlement management access packages.** Create an access package that includes: the security groups granting access to the three resource groups (via Azure RBAC group assignments), application role assignments for the two SaaS apps, and the SharePoint site. Configure the access package policy to require manager approval and set an expiration matching the contract duration. The contractor (or their manager) submits a single request for the package, and upon approval, all access is provisioned automatically. When the package expires, all bundled access is revoked simultaneously.

</details>

<details>
<summary>4. An employee transfers from the Engineering department to the Sales department. Their Workday record is updated. What lifecycle workflow actions should fire to ensure appropriate access?</summary>

**A "mover" lifecycle workflow should trigger on the department attribute change.** The workflow should: (1) Remove the employee from Engineering-specific groups (revoking Azure resource access, application assignments), (2) Add the employee to Sales-specific groups, (3) Revoke any Engineering access packages (or let them expire), (4) Optionally trigger an access review of any remaining access the user holds to ensure nothing inappropriate carries over. The trigger in lifecycle workflows is the attribute change (department from "Engineering" to "Sales") synced from Workday via Entra ID provisioning. A grace period (e.g., 7 days) before removing old access can be configured to handle transition periods.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge12 --location eastus
```

2. Create an access package catalog using Microsoft Graph:

```bash
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/catalogs" \
  --headers "Content-Type=application/json" \
  --body '{"displayName":"AZ305 Challenge 12 Lab Catalog","description":"Lab catalog for testing access packages","isExternallyVisible":false}'
```

3. Retrieve the catalog ID:

```bash
CATALOG_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/catalogs?\$filter=displayName eq 'AZ305 Challenge 12 Lab Catalog'" \
  --query "value[0].id" -o tsv)
echo "Catalog ID: $CATALOG_ID"
```

4. Create an access package in the catalog:

```bash
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/accessPackages" \
  --headers "Content-Type=application/json" \
  --body "{\"displayName\":\"Lab Developer Access\",\"description\":\"Access package for development resources\",\"catalog\":{\"id\":\"$CATALOG_ID\"},\"isHidden\":false}"
```

5. Verify the catalog and access package were created:

```bash
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/catalogs?\$filter=displayName eq 'AZ305 Challenge 12 Lab Catalog'" \
  --query "value[].{name:displayName, id:id, state:state}" -o table
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/accessPackages?\$filter=displayName eq 'Lab Developer Access'" \
  --query "value[].{name:displayName, id:id, isHidden:isHidden}" -o table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
# Delete the access package first, then the catalog
AP_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/accessPackages?\$filter=displayName eq 'Lab Developer Access'" \
  --query "value[0].id" -o tsv)
az rest --method DELETE \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/accessPackages/$AP_ID"
CATALOG_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/catalogs?\$filter=displayName eq 'AZ305 Challenge 12 Lab Catalog'" \
  --query "value[0].id" -o tsv)
az rest --method DELETE \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/catalogs/$CATALOG_ID"
az group delete --name rg-az305-challenge12 --yes --no-wait
```

---

**Next**: [Challenge 13: Design Governance for a Multi-Team Organization](/docs/az-305/identity-governance-monitoring/challenge-13)
