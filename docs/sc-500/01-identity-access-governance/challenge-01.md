---
sidebar_position: 1
title: "Challenge 01: Implement Privileged Identity Management (PIM)"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 01: Implement Privileged Identity Management (PIM)

## Exam skills covered

- Design and implement privileged access
- Configure Privileged Identity Management (PIM) for Azure resources and Microsoft Entra roles
- Configure role activation requirements (approval, justification, MFA)
- Implement just-in-time access for administrative roles
- Monitor and audit privileged access using PIM alerts

## Scenario

Contoso Ltd's security team has identified that 47 users have permanent Global Administrator assignments, and several service accounts hold Owner roles on production subscriptions with no expiration. After a recent penetration test revealed that compromised credentials could immediately access critical resources without any additional verification, the CISO has mandated implementing Privileged Identity Management to enforce just-in-time access, approval workflows, and time-bound role assignments across all privileged roles.

---

## Prerequisites

- Azure subscription with Microsoft Entra ID P2 license (required for PIM)
- Global Administrator or Privileged Role Administrator role
- Azure CLI installed and authenticated (`az login`)
- At least two test user accounts for approval workflow testing

---

## Task 1: Enable PIM and discover privileged roles

Onboard PIM for your Entra ID tenant and review current permanent role assignments to identify overprivileged accounts.

```bash
# Set variables
TENANT_ID=$(az account show --query tenantId -o tsv)

# List all permanent (active) Global Administrator assignments
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments?\$filter=roleDefinitionId eq '62e90394-69f5-4237-9190-012177145e10'" \
  --headers "Content-Type=application/json"

# List all directory role definitions to find role IDs
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleDefinitions?\$select=id,displayName" \
  --headers "Content-Type=application/json"

# Check current PIM role settings for Global Administrator
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies?\$filter=scopeId eq '/' and scopeType eq 'DirectoryRole'" \
  --headers "Content-Type=application/json"
```

## Task 2: Configure PIM role settings for Global Administrator

Configure activation requirements including MFA, justification, approval, and maximum activation duration.

```bash
# Get the policy ID for Global Administrator role
# The role definition ID for Global Admin is 62e90394-69f5-4237-9190-012177145e10
POLICY_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies?\$filter=scopeId eq '/' and scopeType eq 'DirectoryRole'" \
  --headers "Content-Type=application/json" \
  --query "value[?contains(displayName,'Global Administrator')].id" -o tsv)

# Update activation settings: require MFA, justification, max 4 hours
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/Expiration_EndUser_Assignment" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyExpirationRule",
    "id": "Expiration_EndUser_Assignment",
    "isExpirationRequired": true,
    "maximumDuration": "PT4H",
    "target": {
      "caller": "EndUser",
      "operations": ["all"],
      "level": "Assignment",
      "inheritableSettings": [],
      "enforcedSettings": []
    }
  }'

# Enable MFA requirement on activation
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/AuthenticationContext_EndUser_Assignment" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyAuthenticationContextRule",
    "id": "AuthenticationContext_EndUser_Assignment",
    "isEnabled": true,
    "claimValue": "c1",
    "target": {
      "caller": "EndUser",
      "operations": ["all"],
      "level": "Assignment"
    }
  }'

# Require justification on activation
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/Enablement_EndUser_Assignment" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyEnablementRule",
    "id": "Enablement_EndUser_Assignment",
    "enabledRules": ["MultiFactorAuthentication", "Justification"],
    "target": {
      "caller": "EndUser",
      "operations": ["all"],
      "level": "Assignment"
    }
  }'
```

## Task 3: Configure approval workflow

Set up a multi-stage approval workflow requiring a security team member to approve Global Administrator activations.

```bash
# Get the approver user's object ID
APPROVER_ID=$(az ad user show --id "securityadmin@contoso.com" --query id -o tsv)

# Configure approval requirement for Global Administrator activation
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/Approval_EndUser_Assignment" \
  --headers "Content-Type=application/json" \
  --body "{
    \"@odata.type\": \"#microsoft.graph.unifiedRoleManagementPolicyApprovalRule\",
    \"id\": \"Approval_EndUser_Assignment\",
    \"setting\": {
      \"isApprovalRequired\": true,
      \"isApprovalRequiredForExtension\": false,
      \"isRequestorJustificationRequired\": true,
      \"approvalMode\": \"SingleStage\",
      \"approvalStages\": [
        {
          \"approvalStageTimeOutInDays\": 1,
          \"isApproverJustificationRequired\": true,
          \"escalationTimeInMinutes\": 0,
          \"isEscalationEnabled\": false,
          \"primaryApprovers\": [
            {
              \"@odata.type\": \"#microsoft.graph.singleUser\",
              \"userId\": \"$APPROVER_ID\"
            }
          ]
        }
      ]
    },
    \"target\": {
      \"caller\": \"EndUser\",
      \"operations\": [\"all\"],
      \"level\": \"Assignment\"
    }
  }"
```

## Task 4: Create eligible role assignments

Convert permanent assignments to eligible assignments so users must activate through PIM.

```bash
# Get the user to make eligible
USER_ID=$(az ad user show --id "cloudadmin@contoso.com" --query id -o tsv)

# Create an eligible assignment for Global Administrator (eligible, not active)
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests" \
  --headers "Content-Type=application/json" \
  --body "{
    \"action\": \"adminAssign\",
    \"justification\": \"Assign eligible Global Admin role per PIM policy\",
    \"roleDefinitionId\": \"62e90394-69f5-4237-9190-012177145e10\",
    \"directoryScopeId\": \"/\",
    \"principalId\": \"$USER_ID\",
    \"scheduleInfo\": {
      \"startDateTime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"expiration\": {
        \"type\": \"afterDuration\",
        \"duration\": \"P365D\"
      }
    }
  }"

# Remove the permanent (active) assignment
ASSIGNMENT_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignmentScheduleInstances?\$filter=principalId eq '$USER_ID' and roleDefinitionId eq '62e90394-69f5-4237-9190-012177145e10'" \
  --query "value[0].id" -o tsv)

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignmentScheduleRequests" \
  --headers "Content-Type=application/json" \
  --body "{
    \"action\": \"adminRemove\",
    \"justification\": \"Remove permanent assignment - replaced with eligible via PIM\",
    \"roleDefinitionId\": \"62e90394-69f5-4237-9190-012177145e10\",
    \"directoryScopeId\": \"/\",
    \"principalId\": \"$USER_ID\"
  }"
```

## Task 5: Configure PIM for Azure resource roles

Extend PIM to protect Azure subscription-level roles (Owner, Contributor) with time-bound eligible assignments.

```bash
# Get subscription ID
SUB_ID=$(az account show --query id -o tsv)

# List current Owner role assignments on the subscription
az role assignment list --role "Owner" --scope "/subscriptions/$SUB_ID" --query "[].{principal:principalName,type:principalType}" -o table

# Create an eligible assignment for Owner role on subscription using PIM
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/roleManagement/azureResources/roleEligibilityScheduleRequests" \
  --headers "Content-Type=application/json" \
  --body "{
    \"action\": \"adminAssign\",
    \"justification\": \"Eligible Owner for emergency access\",
    \"roleDefinitionId\": \"/subscriptions/$SUB_ID/providers/Microsoft.Authorization/roleDefinitions/8e3af657-a8ff-443c-a75c-2fe8c4bcb635\",
    \"directoryScopeId\": \"/subscriptions/$SUB_ID\",
    \"principalId\": \"$USER_ID\",
    \"scheduleInfo\": {
      \"startDateTime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"expiration\": {
        \"type\": \"afterDuration\",
        \"duration\": \"P90D\"
      }
    }
  }"

# Configure the Azure resource role policy (max 2 hours for Owner)
# First get the policy for Owner role on the subscription
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies?\$filter=scopeId eq '/subscriptions/$SUB_ID' and scopeType eq 'subscription'" \
  --headers "Content-Type=application/json"
```

## Task 6: Configure PIM alerts and access reviews

Set up alerts for suspicious PIM activity and schedule periodic access reviews.

```bash
# Create an access review for Global Administrator eligible assignments
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions" \
  --headers "Content-Type=application/json" \
  --body "{
    \"displayName\": \"Global Admin PIM Review - Quarterly\",
    \"descriptionForAdmins\": \"Quarterly review of Global Administrator eligible assignments\",
    \"descriptionForReviewers\": \"Please verify these users still require Global Administrator eligibility\",
    \"scope\": {
      \"@odata.type\": \"#microsoft.graph.principalResourceMembershipsScope\",
      \"principalScopes\": [
        {
          \"@odata.type\": \"#microsoft.graph.accessReviewQueryScope\",
          \"query\": \"/users\",
          \"queryType\": \"MicrosoftGraph\"
        }
      ],
      \"resourceScopes\": [
        {
          \"@odata.type\": \"#microsoft.graph.accessReviewQueryScope\",
          \"query\": \"/roleManagement/directory/roleDefinitions/62e90394-69f5-4237-9190-012177145e10\",
          \"queryType\": \"MicrosoftGraph\"
        }
      ]
    },
    \"reviewers\": [
      {
        \"query\": \"/users/$APPROVER_ID\",
        \"queryType\": \"MicrosoftGraph\"
      }
    ],
    \"settings\": {
      \"mailNotificationsEnabled\": true,
      \"reminderNotificationsEnabled\": true,
      \"justificationRequiredOnApproval\": true,
      \"defaultDecisionEnabled\": true,
      \"defaultDecision\": \"Deny\",
      \"instanceDurationInDays\": 14,
      \"autoApplyDecisionsEnabled\": true,
      \"recommendationsEnabled\": true,
      \"recurrence\": {
        \"pattern\": {
          \"type\": \"absoluteMonthly\",
          \"interval\": 3
        },
        \"range\": {
          \"type\": \"noEnd\",
          \"startDate\": \"2025-01-01\"
        }
      }
    }
  }"

# Check PIM alerts
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/roleManagementAlerts/alerts?\$filter=scopeId eq '/' and scopeType eq 'DirectoryRole'" \
  --headers "Content-Type=application/json"
```

---

## Break & Fix

### Scenario 1: User cannot activate their eligible role

A user reports they have an eligible Global Administrator assignment in PIM but receives an error when trying to activate. The error states "MFA claim is not present in the token."

<details>
<summary>Show solution</summary>

The user has not completed multi-factor authentication before attempting activation. The PIM policy requires MFA on activation.

```bash
# Verify the enablement rules require MFA
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/Enablement_EndUser_Assignment" \
  --headers "Content-Type=application/json"

# Option 1: User must re-authenticate with MFA before activating
# This is the expected behavior - user needs to complete MFA challenge

# Option 2: If MFA is blocking legitimate access, temporarily adjust the policy
# (Only do this in emergency situations)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/Enablement_EndUser_Assignment" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyEnablementRule",
    "id": "Enablement_EndUser_Assignment",
    "enabledRules": ["Justification"],
    "target": {
      "caller": "EndUser",
      "operations": ["all"],
      "level": "Assignment"
    }
  }'

# Verify the user has registered MFA methods
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users/$USER_ID/authentication/methods" \
  --headers "Content-Type=application/json"
```

</details>

### Scenario 2: Permanent role assignment bypassing PIM

A new team member was granted a permanent Contributor role directly via `az role assignment create`, bypassing PIM entirely. The assignment has no expiration and doesn't require activation.

<details>
<summary>Show solution</summary>

```bash
# Identify the direct (non-PIM) role assignment
az role assignment list --assignee "newuser@contoso.com" \
  --scope "/subscriptions/$SUB_ID" \
  --query "[?roleDefinitionName=='Contributor']" -o table

# Remove the permanent direct assignment
az role assignment delete --assignee "newuser@contoso.com" \
  --role "Contributor" \
  --scope "/subscriptions/$SUB_ID"

# Create a proper PIM eligible assignment instead
NEW_USER_ID=$(az ad user show --id "newuser@contoso.com" --query id -o tsv)

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/roleManagement/azureResources/roleEligibilityScheduleRequests" \
  --headers "Content-Type=application/json" \
  --body "{
    \"action\": \"adminAssign\",
    \"justification\": \"Convert permanent to eligible assignment per security policy\",
    \"roleDefinitionId\": \"/subscriptions/$SUB_ID/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c\",
    \"directoryScopeId\": \"/subscriptions/$SUB_ID\",
    \"principalId\": \"$NEW_USER_ID\",
    \"scheduleInfo\": {
      \"startDateTime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"expiration\": {
        \"type\": \"afterDuration\",
        \"duration\": \"P180D\"
      }
    }
  }"

# Create an Azure Policy to audit direct role assignments (detect future bypasses)
az policy assignment create \
  --name "audit-direct-owner-assignments" \
  --display-name "Audit direct Owner role assignments" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/f8456c1c-aa66-4dfb-861a-25d127b775c9" \
  --scope "/subscriptions/$SUB_ID"
```

</details>

### Scenario 3: PIM approval request stuck - no approvers configured

An activation request has been pending for 48 hours. Investigation shows the configured approver left the company, and no fallback approvers exist.

<details>
<summary>Show solution</summary>

```bash
# Check pending activation requests
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignmentScheduleRequests?\$filter=status eq 'PendingApproval'" \
  --headers "Content-Type=application/json"

# Update the approval policy with new approvers
NEW_APPROVER_ID=$(az ad user show --id "securitylead@contoso.com" --query id -o tsv)
BACKUP_APPROVER_ID=$(az ad user show --id "ciso@contoso.com" --query id -o tsv)

az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/$POLICY_ID/rules/Approval_EndUser_Assignment" \
  --headers "Content-Type=application/json" \
  --body "{
    \"@odata.type\": \"#microsoft.graph.unifiedRoleManagementPolicyApprovalRule\",
    \"id\": \"Approval_EndUser_Assignment\",
    \"setting\": {
      \"isApprovalRequired\": true,
      \"isRequestorJustificationRequired\": true,
      \"approvalMode\": \"SingleStage\",
      \"approvalStages\": [
        {
          \"approvalStageTimeOutInDays\": 1,
          \"isApproverJustificationRequired\": true,
          \"primaryApprovers\": [
            {
              \"@odata.type\": \"#microsoft.graph.singleUser\",
              \"userId\": \"$NEW_APPROVER_ID\"
            },
            {
              \"@odata.type\": \"#microsoft.graph.singleUser\",
              \"userId\": \"$BACKUP_APPROVER_ID\"
            }
          ]
        }
      ]
    },
    \"target\": {
      \"caller\": \"EndUser\",
      \"operations\": [\"all\"],
      \"level\": \"Assignment\"
    }
  }"

# The stuck request will time out. User needs to submit a new activation request.
# A Privileged Role Administrator can also cancel and re-process the request.
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "A security engineer needs to ensure that Global Administrator activations require approval from a security team member, justification, and MFA. Which PIM role setting combination achieves this?",
    options: [
      "Configure activation requirements with MFA, justification, and add approvers in the approval workflow",
      "Set the role as permanent with Conditional Access requiring MFA",
      "Create a custom role with reduced permissions and assign it permanently",
      "Use Azure AD Identity Protection risk policies to require MFA"
    ],
    correctIndex: 0,
    explanation: "PIM role settings allow configuring activation requirements (MFA, justification) and approval workflows independently. Combining all three in the role's PIM settings ensures every activation must satisfy MFA, include justification, and receive explicit approval."
  },
  {
    question: "What is the maximum activation duration that can be configured for a PIM eligible role assignment?",
    options: [
      "8 hours",
      "12 hours",
      "24 hours",
      "72 hours"
    ],
    correctIndex: 2,
    explanation: "The maximum activation duration for PIM eligible assignments is 24 hours. After this period, the user must re-activate the role. This ensures that elevated access is always time-bound and requires periodic re-authorization."
  },
  {
    question: "Contoso wants to automatically remove eligible role assignments that haven't been activated in 90 days. Which PIM feature should they configure?",
    options: [
      "PIM alerts for redundant role assignments",
      "Access reviews with auto-apply enabled and deny as default decision",
      "Conditional Access session controls",
      "Azure Policy with deny effect"
    ],
    correctIndex: 1,
    explanation: "Access reviews can be configured to periodically review eligible assignments. With auto-apply enabled and 'Deny' as the default decision, assignments where reviewers don't respond will be automatically removed. PIM also provides alerts for roles that haven't been used."
  },
  {
    question: "A user has an eligible PIM assignment for the Contributor role on a subscription. They attempt to activate but receive 'Authorization failed'. What is the most likely cause?",
    options: [
      "The user's eligible assignment has expired",
      "The subscription has been moved to a different management group",
      "The PIM policy requires a Conditional Access authentication context that the user hasn't satisfied",
      "The Contributor role has been deprecated"
    ],
    correctIndex: 0,
    explanation: "Eligible PIM assignments have an expiration date. If the eligible assignment period has passed, the user can no longer activate the role. The Privileged Role Administrator must create a new eligible assignment. Always check the eligibility schedule when activation fails."
  }
]} />

## Cleanup

```bash
# Remove eligible assignments created during the lab
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests" \
  --headers "Content-Type=application/json" \
  --body "{
    \"action\": \"adminRemove\",
    \"justification\": \"Lab cleanup\",
    \"roleDefinitionId\": \"62e90394-69f5-4237-9190-012177145e10\",
    \"directoryScopeId\": \"/\",
    \"principalId\": \"$USER_ID\"
  }"

# Remove access review
REVIEW_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions?\$filter=displayName eq 'Global Admin PIM Review - Quarterly'" \
  --query "value[0].id" -o tsv)

az rest --method DELETE \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions/$REVIEW_ID" \
  --headers "Content-Type=application/json"

# Remove any policy assignments created
az policy assignment delete --name "audit-direct-owner-assignments"
```
