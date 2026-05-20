---
sidebar_position: 5
title: "Challenge 05: OAuth Permission Grants and Consent Settings"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 05: OAuth Permission Grants and Consent Settings

## Exam skills covered

- Configure and manage OAuth permission grants
- Implement consent policies and permission grant conditions
- Review and revoke application consent grants
- Configure risk-based consent evaluation
- Investigate illicit consent grant attacks
- Implement permission classification and low-risk consent

## Scenario

Contoso Ltd's incident response team discovered that an attacker used a phishing email to trick a user into granting full mailbox access to a malicious OAuth application. The application had been silently reading emails for three weeks before detection. The security team must now audit all existing consent grants, implement strict consent policies, classify permissions by risk level, and set up monitoring to detect future illicit consent grant attacks.

---

## Prerequisites

- Azure subscription with Microsoft Entra ID P1 or P2 license
- Global Administrator or Cloud Application Administrator role
- Azure CLI installed and authenticated
- Understanding of OAuth 2.0 consent framework

---

## Task 1: Audit existing OAuth permission grants

Review all delegated and application permission grants across the tenant to identify overprivileged or suspicious consents.

```bash
# List all OAuth2 delegated permission grants (user consent)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$top=100" \
  --headers "Content-Type=application/json" \
  --query "value[].{clientId:clientId, consentType:consentType, scope:scope, principalId:principalId}"

# Get details about high-privilege delegated grants (Mail.ReadWrite, Files.ReadWrite.All)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=consentType eq 'Principal'" \
  --headers "Content-Type=application/json"

# List all application role assignments (application permissions)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals?\$filter=servicePrincipalType eq 'Application'&\$select=displayName,appId,id&\$expand=appRoleAssignments" \
  --headers "Content-Type=application/json"

# Find applications with dangerous permissions (Mail.ReadWrite, Directory.ReadWrite.All)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals?\$filter=servicePrincipalType eq 'Application'&\$expand=appRoleAssignments" \
  --headers "Content-Type=application/json" \
  --query "value[?appRoleAssignments[0]].{app:displayName, assignmentCount:length(appRoleAssignments)}"

# Identify apps without verified publisher
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals?\$filter=servicePrincipalType eq 'Application'&\$select=displayName,appId,verifiedPublisher,publisherName" \
  --headers "Content-Type=application/json" \
  --query "value[?!verifiedPublisher.displayName].{app:displayName, appId:appId}"
```

## Task 2: Revoke suspicious consent grants

Remove permissions from a suspicious application that was granted Mail.ReadWrite access through phishing.

```bash
# Identify the malicious app's service principal
MALICIOUS_SP_ID=$(az ad sp list --filter "displayName eq 'Suspicious App'" --query "[0].id" -o tsv)

# List all permission grants for this service principal
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=clientId eq '$MALICIOUS_SP_ID'" \
  --headers "Content-Type=application/json"

# Revoke all delegated permission grants for the app
GRANT_IDS=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=clientId eq '$MALICIOUS_SP_ID'" \
  --query "value[].id" -o tsv)

for GRANT_ID in $GRANT_IDS; do
  az rest --method DELETE \
    --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants/$GRANT_ID"
  echo "Revoked grant: $GRANT_ID"
done

# Revoke application permission assignments
APP_ROLE_ASSIGNMENTS=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$MALICIOUS_SP_ID/appRoleAssignments" \
  --query "value[].id" -o tsv)

for ASSIGNMENT_ID in $APP_ROLE_ASSIGNMENTS; do
  az rest --method DELETE \
    --url "https://graph.microsoft.com/v1.0/servicePrincipals/$MALICIOUS_SP_ID/appRoleAssignments/$ASSIGNMENT_ID"
  echo "Revoked app role assignment: $ASSIGNMENT_ID"
done

# Disable the service principal to block all access
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$MALICIOUS_SP_ID" \
  --headers "Content-Type=application/json" \
  --body '{
    "accountEnabled": false
  }'

# Invalidate all refresh tokens for the app
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$MALICIOUS_SP_ID/invalidateAllRefreshTokens" \
  --headers "Content-Type=application/json"
```

## Task 3: Configure user consent restrictions

Implement policies that control when users can consent to applications and what permissions they can grant.

```bash
# Disable user consent entirely (most restrictive)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionGrantPolicyIdsAssignedToDefaultUserRole": []
  }'

# OR: Allow user consent only for verified publisher apps with low-risk permissions
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionGrantPolicyIdsAssignedToDefaultUserRole": [
      "managePermissionGrantsForSelf.microsoft-user-default-low"
    ]
  }'

# Verify the current consent settings
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --query "permissionGrantPolicyIdsAssignedToDefaultUserRole"
```

## Task 4: Create a custom permission grant policy

Define granular conditions for when consent is automatically approved (verified publishers, specific permissions only).

```bash
# Create a custom permission grant policy
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/policies/permissionGrantPolicies" \
  --headers "Content-Type=application/json" \
  --body '{
    "id": "contoso-restricted-consent",
    "displayName": "Contoso Restricted Consent",
    "description": "Allow consent only for verified publishers with classified low-risk permissions"
  }'

# Add an include condition: verified publisher apps only
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/policies/permissionGrantPolicies/contoso-restricted-consent/includes" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionType": "delegated",
    "permissionClassification": "low",
    "clientApplicationsFromVerifiedPublisherOnly": true,
    "resourceApplication": "any"
  }'

# Add an exclude condition: never allow mail or directory write permissions
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/policies/permissionGrantPolicies/contoso-restricted-consent/excludes" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionType": "delegated",
    "permissions": {
      "@odata.type": "#microsoft.graph.allPreApprovedPermissions",
      "permissionIds": [
        "e383f46e-2787-4529-855e-0e479a3ffac0",
        "024d486e-b451-40bb-833d-3e66d98c5c73"
      ]
    }
  }'

# Apply the custom policy to the default user role
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionGrantPolicyIdsAssignedToDefaultUserRole": [
      "managePermissionGrantsForSelf.contoso-restricted-consent"
    ]
  }'
```

## Task 5: Classify permissions by risk level

Categorize Microsoft Graph delegated permissions as low, medium, or high risk to enable risk-based consent.

```bash
# Get the Microsoft Graph service principal ID
GRAPH_SP_ID=$(az ad sp list --filter "appId eq '00000003-0000-0000-c000-000000000000'" --query "[0].id" -o tsv)

# Classify User.Read as low risk
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionId": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
    "permissionName": "User.Read",
    "classification": "low"
  }'

# Classify openid as low risk
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionId": "37f7f235-527c-4136-accd-4a02d197296e",
    "permissionName": "openid",
    "classification": "low"
  }'

# Classify profile as low risk
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionId": "14dad69e-099b-42c9-810b-d002981feec1",
    "permissionName": "profile",
    "classification": "low"
  }'

# Classify email as low risk
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionId": "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0",
    "permissionName": "email",
    "classification": "low"
  }'

# List all permission classifications
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --headers "Content-Type=application/json" \
  --query "value[].{permission:permissionName, classification:classification}"
```

## Task 6: Enable admin consent workflow and monitoring

Configure an approval process for consent requests and set up audit logging.

```bash
# Enable the admin consent request workflow
REVIEWER_ID=$(az ad user show --id "securityadmin@contoso.com" --query id -o tsv)

az rest --method PUT \
  --url "https://graph.microsoft.com/v1.0/policies/adminConsentRequestPolicy" \
  --headers "Content-Type=application/json" \
  --body "{
    \"isEnabled\": true,
    \"notifyReviewers\": true,
    \"remindersEnabled\": true,
    \"requestDurationInDays\": 14,
    \"reviewers\": [
      {
        \"query\": \"/users/$REVIEWER_ID\",
        \"queryType\": \"MicrosoftGraph\"
      }
    ]
  }"

# Check pending consent requests
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/appConsent/appConsentRequests" \
  --headers "Content-Type=application/json"

# Query audit logs for consent grant activities
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=activityDisplayName eq 'Consent to application'&\$top=20&\$orderby=activityDateTime desc" \
  --headers "Content-Type=application/json" \
  --query "value[].{time:activityDateTime, app:targetResources[0].displayName, user:initiatedBy.user.userPrincipalName, result:result}"

# Look for suspicious consent patterns (consent granted from unusual locations)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=activityDisplayName eq 'Consent to application' and result eq 'success'&\$top=50" \
  --headers "Content-Type=application/json"
```

---

## Break & Fix

### Scenario 1: Illicit consent grant attack detected

The SOC team notices in audit logs that a user consented to an application called "Document Viewer Pro" that requested Mail.ReadWrite and Files.ReadWrite.All permissions. The app has no verified publisher and was registered in an external tenant.

<details>
<summary>Show solution</summary>

```bash
# Find the malicious application's service principal
MALICIOUS_APP=$(az ad sp list --filter "displayName eq 'Document Viewer Pro'" --query "[0]" -o json)
MALICIOUS_SP_ID=$(echo $MALICIOUS_APP | jq -r '.id')
MALICIOUS_APP_ID=$(echo $MALICIOUS_APP | jq -r '.appId')

# Identify which users consented
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=clientId eq '$MALICIOUS_SP_ID' and consentType eq 'Principal'" \
  --headers "Content-Type=application/json" \
  --query "value[].{userId:principalId, scopes:scope}"

# Revoke ALL consent grants for this application
GRANT_IDS=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=clientId eq '$MALICIOUS_SP_ID'" \
  --query "value[].id" -o tsv)

for GID in $GRANT_IDS; do
  az rest --method DELETE \
    --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants/$GID"
done

# Disable the service principal
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$MALICIOUS_SP_ID" \
  --headers "Content-Type=application/json" \
  --body '{"accountEnabled": false}'

# Revoke the affected user's sessions to force re-authentication
AFFECTED_USER_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=clientId eq '$MALICIOUS_SP_ID' and consentType eq 'Principal'" \
  --query "value[0].principalId" -o tsv)

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/users/$AFFECTED_USER_ID/revokeSignInSessions" \
  --headers "Content-Type=application/json"

# Prevent future incidents: disable user consent
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionGrantPolicyIdsAssignedToDefaultUserRole": [
      "managePermissionGrantsForSelf.microsoft-user-default-low"
    ]
  }'
```

</details>

### Scenario 2: Legitimate app blocked by consent restrictions

After implementing strict consent policies, a legitimate vendor application (with verified publisher) that the marketing team uses for campaign analytics is being blocked. Users receive "Need admin approval" errors.

<details>
<summary>Show solution</summary>

```bash
# Check what permissions the app is requesting
VENDOR_APP_ID="<vendor-app-client-id>"
VENDOR_SP_ID=$(az ad sp list --filter "appId eq '$VENDOR_APP_ID'" --query "[0].id" -o tsv)

# Check if the publisher is verified
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$VENDOR_SP_ID?\$select=displayName,verifiedPublisher,publisherName" \
  --headers "Content-Type=application/json"

# Option 1: Grant admin consent for the specific app (pre-approve)
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/oauth2PermissionGrants" \
  --headers "Content-Type=application/json" \
  --body "{
    \"clientId\": \"$VENDOR_SP_ID\",
    \"consentType\": \"AllPrincipals\",
    \"resourceId\": \"$(az ad sp list --filter \"appId eq '00000003-0000-0000-c000-000000000000'\" --query '[0].id' -o tsv)\",
    \"scope\": \"User.Read Analytics.Read\"
  }"

# Option 2: Classify the requested permissions as low-risk
# so the consent policy allows them automatically
GRAPH_SP_ID=$(az ad sp list --filter "appId eq '00000003-0000-0000-c000-000000000000'" --query "[0].id" -o tsv)

# If the app needs Analytics.Read, classify it as low risk
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionId": "e03cf23f-8056-446a-8994-7d93dfc8b50e",
    "permissionName": "Analytics.Read",
    "classification": "low"
  }'

# Option 3: Process the admin consent request if it's pending
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityGovernance/appConsent/appConsentRequests?\$filter=appId eq '$VENDOR_APP_ID'" \
  --headers "Content-Type=application/json"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "An attacker sends a phishing email that redirects the victim to a consent prompt for a malicious app requesting Mail.ReadWrite. What is this attack called and what is the primary mitigation?",
    options: [
      "Password spray attack; mitigated by MFA",
      "Illicit consent grant attack; mitigated by restricting user consent and requiring admin approval",
      "Token replay attack; mitigated by Conditional Access session controls",
      "Credential stuffing; mitigated by Azure AD Identity Protection"
    ],
    correctIndex: 1,
    explanation: "An illicit consent grant attack tricks users into granting OAuth permissions to attacker-controlled applications. The primary mitigation is restricting user consent (allowing only verified publishers with low-risk permissions) and enabling the admin consent workflow so dangerous permissions require administrator approval."
  },
  {
    question: "Which setting allows users to consent to applications from verified publishers requesting only permissions classified as 'low impact'?",
    options: [
      "permissionGrantPolicyIdsAssignedToDefaultUserRole: ['managePermissionGrantsForSelf.microsoft-user-default-low']",
      "defaultUserRolePermissions.allowedToCreateApps: true",
      "adminConsentRequestPolicy.isEnabled: true",
      "permissionGrantPolicyIdsAssignedToDefaultUserRole: ['managePermissionGrantsForSelf.microsoft-all']"
    ],
    correctIndex: 0,
    explanation: "The 'microsoft-user-default-low' policy allows users to consent to apps from verified publishers requesting only permissions classified as low risk. This is the recommended balanced approach between security and usability, as it blocks consent to unverified apps and high-risk permissions."
  },
  {
    question: "After discovering a compromised OAuth application, what is the correct order of incident response steps?",
    options: [
      "Delete the app registration, notify users, reset passwords",
      "Revoke consent grants, disable the service principal, revoke user sessions, investigate data access",
      "Reset all user passwords, enable MFA, block the IP address",
      "Create a Conditional Access policy to block the app, wait for token expiration"
    ],
    correctIndex: 1,
    explanation: "The correct response is: 1) Revoke all consent grants to stop ongoing access, 2) Disable the service principal to prevent new token acquisition, 3) Revoke affected users' sessions to invalidate cached tokens, 4) Investigate what data was accessed. Waiting for token expiration leaves a window of continued access."
  },
  {
    question: "What is the difference between 'consentType: AllPrincipals' and 'consentType: Principal' in an OAuth2PermissionGrant?",
    options: [
      "AllPrincipals means admin consent (applies to all users); Principal means individual user consent",
      "AllPrincipals is for application permissions; Principal is for delegated permissions",
      "AllPrincipals requires P2 license; Principal works with any license",
      "AllPrincipals is for multi-tenant apps; Principal is for single-tenant apps"
    ],
    correctIndex: 0,
    explanation: "In OAuth2PermissionGrant objects, 'AllPrincipals' indicates that admin consent was granted on behalf of all users in the tenant (no individual consent needed). 'Principal' indicates that a specific user (identified by principalId) individually consented. Admin consent (AllPrincipals) is preferred for trusted apps."
  }
]} />

## Cleanup

```bash
# Re-enable default user consent settings
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authorizationPolicy/authorizationPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "permissionGrantPolicyIdsAssignedToDefaultUserRole": [
      "managePermissionGrantsForSelf.microsoft-user-default-legacy"
    ]
  }'

# Delete custom permission grant policy
az rest --method DELETE \
  --url "https://graph.microsoft.com/v1.0/policies/permissionGrantPolicies/contoso-restricted-consent"

# Remove permission classifications
GRAPH_SP_ID=$(az ad sp list --filter "appId eq '00000003-0000-0000-c000-000000000000'" --query "[0].id" -o tsv)
CLASSIFICATIONS=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications" \
  --query "value[].id" -o tsv)

for CLASS_ID in $CLASSIFICATIONS; do
  az rest --method DELETE \
    --url "https://graph.microsoft.com/v1.0/servicePrincipals/$GRAPH_SP_ID/delegatedPermissionClassifications/$CLASS_ID"
done

# Disable admin consent workflow
az rest --method PUT \
  --url "https://graph.microsoft.com/v1.0/policies/adminConsentRequestPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "isEnabled": false,
    "notifyReviewers": false,
    "remindersEnabled": false,
    "requestDurationInDays": 30,
    "reviewers": []
  }'
```
