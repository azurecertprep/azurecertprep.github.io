---
sidebar_position: 3
title: "Challenge 03: Authentication Methods and Passwordless"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 03: Authentication Methods and Passwordless

## Exam skills covered

- Plan and implement authentication methods (MFA, passwordless, FIDO2)
- Configure authentication method policies
- Implement passkeys and FIDO2 security keys
- Configure Microsoft Authenticator push notifications and number matching
- Manage authentication method registration and migration
- Monitor authentication method usage and gaps

## Scenario

Contoso Ltd's help desk reports that 35% of support tickets are password-related (resets, lockouts, expired passwords). The security team has also identified that SMS-based MFA was compromised in a recent SIM-swap attack targeting a senior executive. The CISO has approved a phased rollout of passwordless authentication, starting with FIDO2 security keys for administrators and Microsoft Authenticator passkeys for all users, while eliminating weaker methods like SMS and voice calls for privileged accounts.

---

## Prerequisites

- Azure subscription with Microsoft Entra ID P1 or P2 license
- Authentication Policy Administrator or Global Administrator role
- Azure CLI installed and authenticated
- FIDO2 security keys for testing (YubiKey, Feitian, etc.)
- Microsoft Authenticator app installed on test devices

---

## Task 1: Review current authentication method registrations

Audit which methods users have registered to identify gaps and plan the migration.

```bash
# Get authentication methods registration summary
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/reports/authenticationMethods/usersRegisteredByMethod" \
  --headers "Content-Type=application/json"

# Get per-user registration details (check specific users)
USER_ID=$(az ad user show --id "admin@contoso.com" --query id -o tsv)

az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users/$USER_ID/authentication/methods" \
  --headers "Content-Type=application/json"

# Check registration status across all users (paginated)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/reports/authenticationMethods/userRegistrationDetails?\$top=50&\$select=userPrincipalName,methodsRegistered,isMfaRegistered,isSsprRegistered" \
  --headers "Content-Type=application/json"

# Get users who have NOT registered any MFA method
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/reports/authenticationMethods/userRegistrationDetails?\$filter=isMfaRegistered eq false&\$select=userPrincipalName,methodsRegistered" \
  --headers "Content-Type=application/json"
```

## Task 2: Configure authentication method policies

Enable passwordless methods and restrict weaker methods for privileged users.

```bash
# Get current authentication methods policy
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy" \
  --headers "Content-Type=application/json"

# Enable FIDO2 security keys for the admin security group
ADMIN_GROUP_ID=$(az ad group create \
  --display-name "FIDO2-Enabled-Admins" \
  --mail-nickname "fido2-admins" \
  --query id -o tsv)

az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/fido2" \
  --headers "Content-Type=application/json" \
  --body "{
    \"@odata.type\": \"#microsoft.graph.fido2AuthenticationMethodConfiguration\",
    \"state\": \"enabled\",
    \"isAttestationEnforced\": true,
    \"isSelfServiceRegistrationAllowed\": true,
    \"keyRestrictions\": {
      \"isEnforced\": true,
      \"enforcementType\": \"allow\",
      \"aaGuids\": [
        \"cb69481e-8ff7-4039-93ec-0a2729a154a8\",
        \"ee882879-721c-4913-9775-3dfcce97072a\",
        \"2fc0579f-8113-47ea-b116-bb5a8db9202a\"
      ]
    },
    \"includeTargets\": [
      {
        \"targetType\": \"group\",
        \"id\": \"$ADMIN_GROUP_ID\",
        \"isRegistrationRequired\": false
      }
    ]
  }"

# Enable Microsoft Authenticator with number matching for all users
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/microsoftAuthenticator" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.microsoftAuthenticatorAuthenticationMethodConfiguration",
    "state": "enabled",
    "featureSettings": {
      "displayAppInformationRequiredState": {
        "state": "enabled",
        "includeTarget": {
          "targetType": "group",
          "id": "all_users"
        }
      },
      "displayLocationInformationRequiredState": {
        "state": "enabled",
        "includeTarget": {
          "targetType": "group",
          "id": "all_users"
        }
      },
      "numberMatchingRequiredState": {
        "state": "enabled",
        "includeTarget": {
          "targetType": "group",
          "id": "all_users"
        }
      }
    },
    "includeTargets": [
      {
        "targetType": "group",
        "id": "all_users",
        "authenticationMode": "any"
      }
    ]
  }'
```

## Task 3: Disable SMS and voice for privileged accounts

Remove weaker authentication methods (SMS, voice call) for users with administrative roles.

```bash
# Create a group for users who should NOT use SMS/Voice
PRIVILEGED_GROUP_ID=$(az ad group create \
  --display-name "No-SMS-Voice-Auth" \
  --mail-nickname "no-sms-voice" \
  --query id -o tsv)

# Disable SMS for the privileged group (configure with exclude)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/sms" \
  --headers "Content-Type=application/json" \
  --body "{
    \"@odata.type\": \"#microsoft.graph.smsAuthenticationMethodConfiguration\",
    \"state\": \"enabled\",
    \"includeTargets\": [
      {
        \"targetType\": \"group\",
        \"id\": \"all_users\",
        \"isUsableForSignIn\": false
      }
    ],
    \"excludeTargets\": [
      {
        \"targetType\": \"group\",
        \"id\": \"$PRIVILEGED_GROUP_ID\"
      }
    ]
  }"

# Disable voice call for privileged users
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/voice" \
  --headers "Content-Type=application/json" \
  --body "{
    \"@odata.type\": \"#microsoft.graph.voiceAuthenticationMethodConfiguration\",
    \"state\": \"enabled\",
    \"includeTargets\": [
      {
        \"targetType\": \"group\",
        \"id\": \"all_users\"
      }
    ],
    \"excludeTargets\": [
      {
        \"targetType\": \"group\",
        \"id\": \"$PRIVILEGED_GROUP_ID\"
      }
    ]
  }"

# Add admin users to the privileged group
az ad group member add --group "$PRIVILEGED_GROUP_ID" --member-id "$USER_ID"
```

## Task 4: Configure Temporary Access Pass for onboarding

Set up Temporary Access Pass (TAP) as a time-limited credential for initial passwordless registration.

```bash
# Enable Temporary Access Pass policy
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/temporaryAccessPass" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.temporaryAccessPassAuthenticationMethodConfiguration",
    "state": "enabled",
    "defaultLifetimeInMinutes": 60,
    "defaultLength": 12,
    "minimumLifetimeInMinutes": 15,
    "maximumLifetimeInMinutes": 480,
    "isUsableOnce": true,
    "includeTargets": [
      {
        "targetType": "group",
        "id": "all_users"
      }
    ]
  }'

# Create a TAP for a user (e.g., new employee onboarding)
NEW_USER_ID=$(az ad user show --id "newemployee@contoso.com" --query id -o tsv)

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/users/$NEW_USER_ID/authentication/temporaryAccessPassMethods" \
  --headers "Content-Type=application/json" \
  --body '{
    "lifetimeInMinutes": 120,
    "isUsableOnce": true
  }'
```

## Task 5: Enable passkeys (FIDO2) with device-bound restrictions

Configure passkey support with attestation enforcement and AAGUID restrictions for approved vendors.

```bash
# Enable passkey (device-bound) authentication for all users
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/fido2" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.fido2AuthenticationMethodConfiguration",
    "state": "enabled",
    "isAttestationEnforced": true,
    "isSelfServiceRegistrationAllowed": true,
    "keyRestrictions": {
      "isEnforced": true,
      "enforcementType": "allow",
      "aaGuids": [
        "cb69481e-8ff7-4039-93ec-0a2729a154a8",
        "ee882879-721c-4913-9775-3dfcce97072a",
        "2fc0579f-8113-47ea-b116-bb5a8db9202a",
        "d8522d9f-575b-4866-88a9-ba99fa02f35b",
        "73bb0cd4-e502-49b8-9c6f-b59445bf720b"
      ]
    },
    "includeTargets": [
      {
        "targetType": "group",
        "id": "all_users",
        "isRegistrationRequired": false
      }
    ]
  }'

# List registered FIDO2 keys for a user
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users/$USER_ID/authentication/fido2Methods" \
  --headers "Content-Type=application/json"

# Delete a specific FIDO2 key (if lost or compromised)
# FIDO2_KEY_ID="obtained from previous query"
# az rest --method DELETE \
#   --url "https://graph.microsoft.com/v1.0/users/$USER_ID/authentication/fido2Methods/$FIDO2_KEY_ID"
```

## Task 6: Configure registration campaign for MFA migration

Set up a registration campaign to nudge users to register Microsoft Authenticator.

```bash
# Configure the registration campaign (system-managed nudge)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy" \
  --headers "Content-Type=application/json" \
  --body "{
    \"registrationEnforcement\": {
      \"authenticationMethodsRegistrationCampaign\": {
        \"snoozeDurationInDays\": 3,
        \"state\": \"enabled\",
        \"excludeTargets\": [],
        \"includeTargets\": [
          {
            \"id\": \"all_users\",
            \"targetType\": \"group\",
            \"targetedAuthenticationMethod\": \"microsoftAuthenticator\"
          }
        ]
      }
    }
  }"

# Check authentication methods activity (usage reports)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/reports/authenticationMethods/usersRegisteredByMethod" \
  --headers "Content-Type=application/json"
```

---

## Break & Fix

### Scenario 1: FIDO2 key registration fails for users

Users attempting to register their YubiKey 5 receive an error: "This security key model is not allowed by your organization's policy." The keys were purchased in bulk for the deployment.

<details>
<summary>Show solution</summary>

The FIDO2 key restriction policy uses AAGUID (Authenticator Attestation GUID) to allow/block specific key models. The YubiKey 5 series AAGUID may not be in the allow list.

```bash
# Check the current FIDO2 key restrictions
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/fido2" \
  --headers "Content-Type=application/json" \
  --query "{enforced:keyRestrictions.isEnforced, type:keyRestrictions.enforcementType, aaGuids:keyRestrictions.aaGuids}"

# The YubiKey 5 NFC has AAGUID: cb69481e-8ff7-4039-93ec-0a2729a154a8
# The YubiKey 5Ci has AAGUID: c5ef55ff-ad9a-4b9f-b580-adebafe026d0
# Add the missing AAGUID to the allow list

az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/fido2" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.fido2AuthenticationMethodConfiguration",
    "keyRestrictions": {
      "isEnforced": true,
      "enforcementType": "allow",
      "aaGuids": [
        "cb69481e-8ff7-4039-93ec-0a2729a154a8",
        "ee882879-721c-4913-9775-3dfcce97072a",
        "2fc0579f-8113-47ea-b116-bb5a8db9202a",
        "c5ef55ff-ad9a-4b9f-b580-adebafe026d0",
        "d8522d9f-575b-4866-88a9-ba99fa02f35b"
      ]
    }
  }'

# Alternative: temporarily disable enforcement for testing
# az rest --method PATCH \
#   --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/fido2" \
#   --body '{"keyRestrictions":{"isEnforced":false}}'
```

</details>

### Scenario 2: Authenticator push notifications showing as "Deny" without user interaction

Multiple users report that their Microsoft Authenticator app automatically denies authentication requests they didn't initiate. The security team suspects MFA fatigue attacks.

<details>
<summary>Show solution</summary>

Number matching should already prevent blind approvals, but the organization needs to verify it's enabled and also enable additional context (app name + location) to help users identify legitimate requests.

```bash
# Verify number matching is enabled (prevents MFA fatigue)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/microsoftAuthenticator" \
  --headers "Content-Type=application/json" \
  --query "featureSettings.numberMatchingRequiredState"

# Ensure additional context is showing (app + location)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/microsoftAuthenticator" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.microsoftAuthenticatorAuthenticationMethodConfiguration",
    "featureSettings": {
      "displayAppInformationRequiredState": {
        "state": "enabled",
        "includeTarget": {
          "targetType": "group",
          "id": "all_users"
        }
      },
      "displayLocationInformationRequiredState": {
        "state": "enabled",
        "includeTarget": {
          "targetType": "group",
          "id": "all_users"
        }
      },
      "numberMatchingRequiredState": {
        "state": "enabled",
        "includeTarget": {
          "targetType": "group",
          "id": "all_users"
        }
      }
    }
  }'

# Check sign-in logs for suspicious MFA attempts (multiple rapid attempts)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=status/errorCode eq 500121&\$top=20&\$orderby=createdDateTime desc" \
  --headers "Content-Type=application/json"

# Investigate the affected users for compromised credentials
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers?\$filter=riskLevel eq 'high'" \
  --headers "Content-Type=application/json"
```

</details>

### Scenario 3: TAP expired before user could complete registration

A new employee received a Temporary Access Pass but it expired before they could register their FIDO2 key due to IT onboarding delays. They now have no way to authenticate.

<details>
<summary>Show solution</summary>

```bash
# Check the user's current authentication methods
NEW_USER_ID=$(az ad user show --id "newemployee@contoso.com" --query id -o tsv)

az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users/$NEW_USER_ID/authentication/temporaryAccessPassMethods" \
  --headers "Content-Type=application/json"

# Delete the expired TAP
EXPIRED_TAP_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users/$NEW_USER_ID/authentication/temporaryAccessPassMethods" \
  --query "value[0].id" -o tsv)

az rest --method DELETE \
  --url "https://graph.microsoft.com/v1.0/users/$NEW_USER_ID/authentication/temporaryAccessPassMethods/$EXPIRED_TAP_ID"

# Issue a new TAP with longer lifetime
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/users/$NEW_USER_ID/authentication/temporaryAccessPassMethods" \
  --headers "Content-Type=application/json" \
  --body '{
    "lifetimeInMinutes": 480,
    "isUsableOnce": false
  }'

# The new TAP can be used multiple times within 8 hours
# giving the user enough time to register their FIDO2 key
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Contoso wants to prevent MFA fatigue attacks where attackers repeatedly trigger push notifications hoping the user will approve. Which Microsoft Authenticator feature should they enable?",
    options: [
      "Passwordless phone sign-in",
      "Number matching with additional context (app and location)",
      "OATH hardware tokens",
      "SMS verification codes"
    ],
    correctIndex: 1,
    explanation: "Number matching requires the user to enter a number displayed on the sign-in screen into the Authenticator app, preventing blind approvals. Additional context shows the application name and sign-in location, helping users identify suspicious requests they didn't initiate."
  },
  {
    question: "An organization wants to enforce FIDO2 security keys from only approved vendors. Which FIDO2 policy setting controls this?",
    options: [
      "Set isAttestationEnforced to true",
      "Configure keyRestrictions with enforcementType 'allow' and specific AAGUIDs",
      "Disable self-service registration",
      "Configure Conditional Access to block non-compliant devices"
    ],
    correctIndex: 1,
    explanation: "Key restrictions with the 'allow' enforcement type and a list of AAGUIDs (Authenticator Attestation GUIDs) ensures only security keys from approved vendors/models can be registered. Each FIDO2 key model has a unique AAGUID that identifies its manufacturer and model."
  },
  {
    question: "A new employee needs to register a FIDO2 security key but has no existing authentication methods. What is the recommended approach?",
    options: [
      "Have an administrator register the key on behalf of the user",
      "Issue a Temporary Access Pass (TAP) so the user can sign in and self-register the key",
      "Temporarily enable password authentication for the user",
      "Use email verification to bootstrap the account"
    ],
    correctIndex: 1,
    explanation: "Temporary Access Pass is designed as a time-limited credential for bootstrapping passwordless methods. It allows users to sign in once (or multiple times within the validity period) to register their FIDO2 key or configure Authenticator without needing a pre-existing authentication method."
  },
  {
    question: "Which authentication methods are considered phishing-resistant in Microsoft Entra ID?",
    options: [
      "SMS, voice call, and email OTP",
      "Microsoft Authenticator push notifications and OATH tokens",
      "FIDO2 security keys, Windows Hello for Business, and certificate-based authentication",
      "All forms of MFA including SMS and voice"
    ],
    correctIndex: 2,
    explanation: "Phishing-resistant methods are those that cannot be intercepted by a man-in-the-middle attack. FIDO2, Windows Hello for Business, and certificate-based authentication use cryptographic challenges bound to the origin, making them immune to phishing. SMS, voice, and push notifications can be socially engineered or intercepted."
  }
]} />

## Cleanup

```bash
# Delete test groups
az ad group delete --group "FIDO2-Enabled-Admins"
az ad group delete --group "No-SMS-Voice-Auth"

# Reset FIDO2 policy to default (disabled)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/fido2" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.fido2AuthenticationMethodConfiguration",
    "state": "disabled"
  }'

# Reset TAP policy
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/temporaryAccessPass" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.temporaryAccessPassAuthenticationMethodConfiguration",
    "state": "disabled"
  }'

# Reset registration campaign
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy" \
  --headers "Content-Type=application/json" \
  --body '{
    "registrationEnforcement": {
      "authenticationMethodsRegistrationCampaign": {
        "state": "disabled"
      }
    }
  }'
```
