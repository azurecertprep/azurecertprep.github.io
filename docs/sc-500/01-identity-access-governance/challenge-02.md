---
sidebar_position: 2
title: "Challenge 02: Conditional Access Policies"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 02: Conditional Access Policies

## Exam skills covered

- Design and implement Conditional Access policies for identity security
- Configure risk-based Conditional Access (sign-in risk, user risk)
- Implement device compliance-based access controls
- Configure named locations and location-based policies
- Implement authentication strength and session controls
- Troubleshoot Conditional Access policy evaluation

## Scenario

Contoso Ltd recently experienced a credential stuffing attack where compromised passwords from a third-party breach were used to access corporate email from foreign IP addresses. The security team must implement a layered Conditional Access strategy that enforces location-based restrictions, requires compliant devices for sensitive applications, and applies risk-based controls that automatically block or challenge suspicious sign-ins without disrupting legitimate users working from approved office locations.

---

## Prerequisites

- Azure subscription with Microsoft Entra ID P2 license (required for risk-based policies)
- Security Administrator or Conditional Access Administrator role
- Azure CLI installed and authenticated
- Microsoft Intune license (for device compliance integration)
- Test user accounts with MFA registered

---

## Task 1: Create named locations for corporate offices

Define trusted network locations representing Contoso's corporate offices so policies can differentiate between internal and external access.

```bash
# Create a named location for the corporate headquarters
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.ipNamedLocation",
    "displayName": "Contoso HQ - Seattle",
    "isTrusted": true,
    "ipRanges": [
      {
        "@odata.type": "#microsoft.graph.iPv4CidrRange",
        "cidrAddress": "203.0.113.0/24"
      },
      {
        "@odata.type": "#microsoft.graph.iPv4CidrRange",
        "cidrAddress": "198.51.100.0/24"
      }
    ]
  }'

# Create a named location for the branch office
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.ipNamedLocation",
    "displayName": "Contoso Branch - London",
    "isTrusted": true,
    "ipRanges": [
      {
        "@odata.type": "#microsoft.graph.iPv4CidrRange",
        "cidrAddress": "192.0.2.0/24"
      }
    ]
  }'

# Create a country-based named location for blocked regions
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.countryNamedLocation",
    "displayName": "Blocked Countries",
    "countriesAndRegions": ["KP", "IR", "RU", "CN"],
    "includeUnknownCountriesAndRegions": true
  }'

# List all named locations to verify
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
  --headers "Content-Type=application/json" \
  --query "value[].{name:displayName, type:['@odata.type']}"
```

## Task 2: Create a risk-based Conditional Access policy

Implement a policy that blocks high-risk sign-ins and requires MFA for medium-risk sign-ins.

```bash
# Create policy: Block high-risk sign-ins
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "CA001: Block high-risk sign-ins",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"],
        "excludeUsers": [],
        "excludeRoles": ["62e90394-69f5-4237-9190-012177145e10"]
      },
      "applications": {
        "includeApplications": ["All"]
      },
      "signInRiskLevels": ["high"]
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["block"]
    }
  }'

# Create policy: Require MFA for medium-risk sign-ins
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "CA002: Require MFA for medium-risk sign-ins",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"],
        "excludeRoles": ["62e90394-69f5-4237-9190-012177145e10"]
      },
      "applications": {
        "includeApplications": ["All"]
      },
      "signInRiskLevels": ["medium"]
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["mfa"]
    }
  }'

# Create policy: Require password change for high-risk users
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "CA003: Require password change for high-risk users",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"]
      },
      "applications": {
        "includeApplications": ["All"]
      },
      "userRiskLevels": ["high"]
    },
    "grantControls": {
      "operator": "AND",
      "builtInControls": ["mfa", "passwordChange"]
    }
  }'
```

## Task 3: Create device compliance-based policy

Require managed and compliant devices for accessing sensitive applications like SharePoint and Exchange Online.

```bash
# Get the service principal IDs for Office 365 apps
# Exchange Online: 00000002-0000-0ff1-ce00-000000000000
# SharePoint Online: 00000003-0000-0ff1-ce00-000000000000

# Create policy: Require compliant device for Office 365
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "CA004: Require compliant device for Office 365",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"],
        "excludeGroups": []
      },
      "applications": {
        "includeApplications": [
          "00000002-0000-0ff1-ce00-000000000000",
          "00000003-0000-0ff1-ce00-000000000000"
        ]
      },
      "platforms": {
        "includePlatforms": ["all"],
        "excludePlatforms": []
      },
      "locations": {
        "includeLocations": ["All"],
        "excludeLocations": ["AllTrusted"]
      }
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["compliantDevice", "domainJoinedDevice"]
    }
  }'

# Create policy: Block legacy authentication
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "CA005: Block legacy authentication",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"]
      },
      "applications": {
        "includeApplications": ["All"]
      },
      "clientAppTypes": ["exchangeActiveSync", "other"]
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["block"]
    }
  }'
```

## Task 4: Configure location-based blocking policy

Block access from untrusted countries and require MFA from non-corporate locations.

```bash
# Get the named location ID for blocked countries
BLOCKED_LOCATION_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations?\$filter=displayName eq 'Blocked Countries'" \
  --query "value[0].id" -o tsv)

# Create policy: Block access from blocked countries
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body "{
    \"displayName\": \"CA006: Block access from restricted countries\",
    \"state\": \"enabledForReportingButNotEnforced\",
    \"conditions\": {
      \"users\": {
        \"includeUsers\": [\"All\"],
        \"excludeRoles\": [\"62e90394-69f5-4237-9190-012177145e10\"]
      },
      \"applications\": {
        \"includeApplications\": [\"All\"]
      },
      \"locations\": {
        \"includeLocations\": [\"$BLOCKED_LOCATION_ID\"],
        \"excludeLocations\": []
      }
    },
    \"grantControls\": {
      \"operator\": \"OR\",
      \"builtInControls\": [\"block\"]
    }
  }"

# Create policy: Require MFA outside corporate network
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "CA007: Require MFA outside corporate network",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"]
      },
      "applications": {
        "includeApplications": ["All"]
      },
      "locations": {
        "includeLocations": ["All"],
        "excludeLocations": ["AllTrusted"]
      }
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["mfa"]
    },
    "sessionControls": {
      "signInFrequency": {
        "value": 4,
        "type": "hours",
        "isEnabled": true
      }
    }
  }'
```

## Task 5: Configure authentication strength

Create a custom authentication strength requiring phishing-resistant methods for admin portal access.

```bash
# Create a custom authentication strength
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/authenticationStrength/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "Phishing-Resistant MFA",
    "description": "Requires FIDO2 security key or Windows Hello for Business",
    "allowedCombinations": [
      "fido2",
      "windowsHelloForBusiness",
      "x509CertificateMultiFactor"
    ]
  }'

# Get the authentication strength ID
AUTH_STRENGTH_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/authenticationStrength/policies?\$filter=displayName eq 'Phishing-Resistant MFA'" \
  --query "value[0].id" -o tsv)

# Create policy requiring phishing-resistant MFA for Azure portal
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body "{
    \"displayName\": \"CA008: Require phishing-resistant MFA for admin portals\",
    \"state\": \"enabledForReportingButNotEnforced\",
    \"conditions\": {
      \"users\": {
        \"includeRoles\": [
          \"62e90394-69f5-4237-9190-012177145e10\",
          \"e8611ab8-c189-46e8-94e1-60213ab1f814\",
          \"194ae4cb-b126-40b2-bd5b-6091b380977d\"
        ]
      },
      \"applications\": {
        \"includeApplications\": [
          \"797f4846-ba00-4fd7-ba43-dac1f8f63013\",
          \"c44b4083-3bb0-49c1-b47d-974e53cbdf3c\"
        ]
      }
    },
    \"grantControls\": {
      \"operator\": \"OR\",
      \"authenticationStrength\": {
        \"id\": \"$AUTH_STRENGTH_ID\"
      }
    }
  }"
```

## Task 6: Test and monitor policies using report-only mode

Evaluate policy impact using sign-in logs and report-only mode before enforcement.

```bash
# List all Conditional Access policies and their state
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --query "value[].{name:displayName, state:state}" -o table

# Check sign-in logs for report-only policy evaluation
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$top=10&\$filter=createdDateTime ge 2025-01-01T00:00:00Z&\$select=userDisplayName,appDisplayName,conditionalAccessStatus,appliedConditionalAccessPolicies" \
  --headers "Content-Type=application/json"

# Enable a policy after validation (move from report-only to enabled)
POLICY_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies?\$filter=displayName eq 'CA005: Block legacy authentication'" \
  --query "value[0].id" -o tsv)

az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/$POLICY_ID" \
  --headers "Content-Type=application/json" \
  --body '{
    "state": "enabled"
  }'

# Use What If to test policy evaluation for a specific user
az rest --method POST \
  --url "https://graph.microsoft.com/beta/identity/conditionalAccess/evaluate" \
  --headers "Content-Type=application/json" \
  --body "{
    \"conditionalAccessWhatIfSubject\": {
      \"@odata.type\": \"#microsoft.graph.userSubject\",
      \"userId\": \"$USER_ID\"
    },
    \"conditionalAccessWhatIfConditions\": {
      \"ipAddress\": \"185.220.101.1\",
      \"country\": \"RU\",
      \"clientAppType\": \"browser\",
      \"servicePrincipalRiskLevel\": \"none\",
      \"userRiskLevel\": \"none\",
      \"signInRiskLevel\": \"none\",
      \"applicationId\": \"00000002-0000-0ff1-ce00-000000000000\"
    }
  }"
```

---

## Break & Fix

### Scenario 1: Users locked out after policy deployment

After enabling a Conditional Access policy requiring compliant devices, all mobile users lost access to Exchange Online, including executives on business travel with personal devices.

<details>
<summary>Show solution</summary>

```bash
# Immediately switch the problematic policy to report-only mode
POLICY_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies?\$filter=displayName eq 'CA004: Require compliant device for Office 365'" \
  --query "value[0].id" -o tsv)

az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/$POLICY_ID" \
  --headers "Content-Type=application/json" \
  --body '{
    "state": "enabledForReportingButNotEnforced"
  }'

# Create an exclusion group for executives/travelers
EXCLUDE_GROUP_ID=$(az ad group create \
  --display-name "CA-Exclude-Mobile-Users" \
  --mail-nickname "ca-exclude-mobile" \
  --query id -o tsv)

# Update the policy to exclude this group and add app protection as alternative
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/$POLICY_ID" \
  --headers "Content-Type=application/json" \
  --body "{
    \"state\": \"enabledForReportingButNotEnforced\",
    \"conditions\": {
      \"users\": {
        \"includeUsers\": [\"All\"],
        \"excludeGroups\": [\"$EXCLUDE_GROUP_ID\"]
      },
      \"applications\": {
        \"includeApplications\": [
          \"00000002-0000-0ff1-ce00-000000000000\",
          \"00000003-0000-0ff1-ce00-000000000000\"
        ]
      },
      \"platforms\": {
        \"includePlatforms\": [\"all\"]
      },
      \"locations\": {
        \"includeLocations\": [\"All\"],
        \"excludeLocations\": [\"AllTrusted\"]
      }
    },
    \"grantControls\": {
      \"operator\": \"OR\",
      \"builtInControls\": [\"compliantDevice\", \"compliantApplication\"]
    }
  }"
```

</details>

### Scenario 2: Risk-based policy not triggering for known compromised accounts

Identity Protection detects risky sign-ins but the CA policy isn't blocking them. Users flagged as high-risk can still sign in without challenge.

<details>
<summary>Show solution</summary>

```bash
# Check that the risk-based policy is in "enabled" state, not "report-only"
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies?\$filter=displayName eq 'CA001: Block high-risk sign-ins'" \
  --headers "Content-Type=application/json" \
  --query "value[0].state"

# Common issue: Policy is still in report-only mode
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/$POLICY_ID" \
  --headers "Content-Type=application/json" \
  --body '{
    "state": "enabled"
  }'

# Verify that Identity Protection is correctly feeding risk signals
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers?\$filter=riskLevel eq 'high'" \
  --headers "Content-Type=application/json"

# Ensure the user is not in an excluded group or role
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/$POLICY_ID" \
  --headers "Content-Type=application/json" \
  --query "{excludeUsers:conditions.users.excludeUsers, excludeGroups:conditions.users.excludeGroups, excludeRoles:conditions.users.excludeRoles}"

# Check if there's a conflicting policy granting access that takes precedence
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --query "value[?state=='enabled'].{name:displayName, grant:grantControls.builtInControls}"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "A Conditional Access policy is configured to block access from untrusted locations. A user connects from a corporate VPN but is still blocked. What is the most likely cause?",
    options: [
      "The VPN's public IP address is not included in the trusted named locations",
      "The user's device is not Intune-enrolled",
      "The policy is in report-only mode",
      "The user has not registered for MFA"
    ],
    correctIndex: 0,
    explanation: "Named locations are evaluated based on the source IP address of the connection. If the VPN's egress IP is not listed in any trusted named location, the connection is treated as coming from an untrusted location regardless of the underlying network."
  },
  {
    question: "Contoso wants to ensure that only phishing-resistant authentication methods are accepted when administrators access the Azure portal. Which Conditional Access grant control should they use?",
    options: [
      "Require multifactor authentication",
      "Require authentication strength (Phishing-resistant MFA)",
      "Require compliant device",
      "Require approved client app"
    ],
    correctIndex: 1,
    explanation: "Authentication strength policies allow specifying which authentication method combinations are acceptable. The built-in 'Phishing-resistant MFA' strength requires FIDO2, Windows Hello for Business, or certificate-based authentication, which are all resistant to phishing attacks unlike SMS or phone-based MFA."
  },
  {
    question: "When multiple Conditional Access policies apply to a sign-in, how are their grant controls evaluated?",
    options: [
      "Only the most restrictive policy applies",
      "Only the first matching policy applies",
      "All applicable policies are evaluated and ALL grant controls must be satisfied",
      "Policies are evaluated in alphabetical order and the first block wins"
    ],
    correctIndex: 2,
    explanation: "When multiple Conditional Access policies apply to a single sign-in, ALL policies are evaluated and all required grant controls from all applicable policies must be satisfied. If any policy blocks, the sign-in is blocked. This is why careful exclusion management is critical."
  },
  {
    question: "What is the recommended approach before enabling a new Conditional Access policy in production?",
    options: [
      "Enable the policy in 'disabled' state and check logs after 24 hours",
      "Deploy the policy in 'report-only' mode and analyze the sign-in logs impact",
      "Create the policy on a test tenant and export it",
      "Enable the policy only during business hours"
    ],
    correctIndex: 1,
    explanation: "Report-only mode evaluates the policy against all sign-ins and logs what the outcome would have been without actually enforcing it. This allows administrators to assess the impact on users before enabling enforcement, preventing accidental lockouts."
  }
]} />

## Cleanup

```bash
# Delete all Conditional Access policies created in this lab
for POLICY_NAME in "CA001" "CA002" "CA003" "CA004" "CA005" "CA006" "CA007" "CA008"; do
  POLICY_ID=$(az rest --method GET \
    --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
    --headers "Content-Type=application/json" \
    --query "value[?contains(displayName,'$POLICY_NAME')].id" -o tsv)
  if [ -n "$POLICY_ID" ]; then
    az rest --method DELETE \
      --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/$POLICY_ID"
    echo "Deleted policy: $POLICY_NAME"
  fi
done

# Delete named locations
for LOCATION_NAME in "Contoso HQ - Seattle" "Contoso Branch - London" "Blocked Countries"; do
  LOC_ID=$(az rest --method GET \
    --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations?\$filter=displayName eq '$LOCATION_NAME'" \
    --query "value[0].id" -o tsv)
  if [ -n "$LOC_ID" ]; then
    az rest --method DELETE \
      --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations/$LOC_ID"
    echo "Deleted location: $LOCATION_NAME"
  fi
done

# Delete authentication strength policy
az rest --method DELETE \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/authenticationStrength/policies/$AUTH_STRENGTH_ID"

# Delete exclusion group
az ad group delete --group "CA-Exclude-Mobile-Users"
```
