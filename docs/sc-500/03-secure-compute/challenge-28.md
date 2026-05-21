---
sidebar_position: 28
title: "Challenge 28: AI Security – Entra Agent ID (Conditional Access, Blast Radius, Access Management)"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 28: AI Security – Entra Agent ID (Conditional Access, Blast Radius, Access Management)

## Exam skills covered

- Configure Microsoft Entra Agent ID for AI agent identity management
- Apply Conditional Access policies to AI agents
- Limit blast radius of compromised AI agent identities
- Implement least-privilege access for AI agents using Entra ID
- Monitor and audit AI agent authentication and authorization activities

## Scenario

Contoso Ltd has deployed 15 custom AI agents across business units — including agents for customer service, IT helpdesk, and financial analysis. The CISO has identified that these agents currently use overprivileged service principals with broad Graph API permissions. After a recent incident where a compromised agent credential exposed customer data, you must implement Entra Agent ID to create dedicated agent identities with Conditional Access, scoped permissions, and blast radius containment.

---

## Prerequisites

- 🔒 **License required**: Microsoft Entra ID P2 + Microsoft Entra Workload ID Premium
- Global Administrator or Application Administrator role
- Conditional Access Administrator role
- Microsoft Entra admin center access
- Azure CLI with `az ad` commands available

---

## Task 1: Create dedicated Entra Agent ID identities

Create managed identities specifically for AI agents using Entra Agent ID, replacing shared service principals.

1. Navigate to **Microsoft Entra admin center** → **Applications** → **Agent identities** (Preview)
2. Click **+ New agent identity**
3. Configure the agent identity:
   - **Name**: "CS-Agent-CustomerService-Prod"
   - **Description**: "Customer service AI agent - Production"
   - **Owner**: IT Security Team group
   - **Business unit**: Customer Operations
   - **Risk classification**: High (accesses customer PII)

```bash
# Register a workload identity for the AI agent
az ad app create \
    --display-name "CS-Agent-CustomerService-Prod" \
    --sign-in-audience "AzureADMyOrg" \
    --notes "Entra Agent ID - Customer Service AI Agent"

# Get the application ID
APP_ID=$(az ad app list --display-name "CS-Agent-CustomerService-Prod" --query "[0].appId" -o tsv)

# Create a service principal for the agent
az ad sp create --id $APP_ID

# Add identifying tags for agent governance
az ad app update --id $APP_ID \
    --set "tags=['AIAgent','AgentID','CustomerService','HighRisk']"

# Configure the agent identity with federated credentials (for workload identity)
az ad app federated-credential create --id $APP_ID \
    --parameters '{
        "name": "copilot-studio-federation",
        "issuer": "https://login.microsoftonline.com/{tenant-id}/v2.0",
        "subject": "agent:cs-agent-customerservice-prod",
        "audiences": ["api://AzureADTokenExchange"],
        "description": "Federated credential for Copilot Studio agent"
    }'
```

---

## Task 2: Apply Conditional Access policies to agent identities

Create Conditional Access policies that restrict how and where AI agents can authenticate.

1. Navigate to **Microsoft Entra admin center** → **Protection** → **Conditional Access**
2. Click **+ Create new policy**
3. Configure "AI Agent - Restrict Authentication":

```bash
# Create a named location for allowed agent authentication sources
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
    --body '{
        "@odata.type": "#microsoft.graph.ipNamedLocation",
        "displayName": "Approved Agent Infrastructure IPs",
        "isTrusted": true,
        "ipRanges": [
            {"@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "10.0.0.0/8"},
            {"@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "172.16.0.0/12"}
        ]
    }'
```

4. Configure the Conditional Access policy:

```bash
# Create Conditional Access policy for AI agents
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
    --body '{
        "displayName": "AI Agent - Location and Risk Restriction",
        "state": "enabledForReportingButNotEnforced",
        "conditions": {
            "clientApplications": {
                "includeServicePrincipals": ["all"],
                "servicePrincipalFilter": {
                    "mode": "include",
                    "rule": "CustomSecurityAttribute.AgentClassification -eq \"AIAgent\""
                }
            },
            "locations": {
                "includeLocations": ["All"],
                "excludeLocations": ["approved-agent-infrastructure-location-id"]
            },
            "servicePrincipalRiskLevels": ["high", "medium"]
        },
        "grantControls": {
            "operator": "OR",
            "builtInControls": ["block"]
        }
    }'
```

5. Create a second policy for token lifetime restrictions:

```bash
# Restrict token lifetime for agent identities
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
    --body '{
        "displayName": "AI Agent - Short Token Lifetime",
        "state": "enabled",
        "conditions": {
            "clientApplications": {
                "includeServicePrincipals": ["all"],
                "servicePrincipalFilter": {
                    "mode": "include",
                    "rule": "CustomSecurityAttribute.AgentClassification -eq \"AIAgent\""
                }
            }
        },
        "sessionControls": {
            "signInFrequency": {
                "value": 1,
                "type": "hours",
                "isEnabled": true
            }
        }
    }'
```

---

## Task 3: Implement least-privilege Graph API permissions

Scope agent permissions to the minimum required using application permission grants.

```bash
# Get the service principal object ID
SP_ID=$(az ad sp list --display-name "CS-Agent-CustomerService-Prod" --query "[0].id" -o tsv)

# Remove overprivileged permissions (if existing)
# List current permissions
az ad app permission list --id $APP_ID --output table

# Remove broad permissions like User.Read.All, Mail.ReadWrite
az ad app permission delete --id $APP_ID \
    --api "00000003-0000-0000-c000-000000000000" \
    --api-permissions "User.Read.All=Role Mail.ReadWrite=Role"

# Grant minimal required permissions
# Customer service agent only needs:
# - User.ReadBasic.All (read basic user profiles)
# - Chat.Read (read chat messages for context)
az ad app permission add --id $APP_ID \
    --api "00000003-0000-0000-c000-000000000000" \
    --api-permissions "User.ReadBasic.All=Role"

az ad app permission add --id $APP_ID \
    --api "00000003-0000-0000-c000-000000000000" \
    --api-permissions "Chat.Read=Role"

# Grant admin consent for the limited permissions
az ad app permission admin-consent --id $APP_ID
```

```powershell
# Configure application access policy to restrict mailbox access
# This limits which mailboxes the agent can access even with granted permissions
Connect-ExchangeOnline

# Create a mail-enabled security group for allowed mailboxes
New-DistributionGroup -Name "Agent-Accessible-Mailboxes" `
    -Type "Security" `
    -ManagedBy "securityteam@contoso.com"

# Restrict the agent to only access specific mailboxes
New-ApplicationAccessPolicy `
    -AppId $APP_ID `
    -PolicyScopeGroupId "Agent-Accessible-Mailboxes" `
    -AccessRight "RestrictAccess" `
    -Description "Restrict CS agent to customer service mailboxes only"
```

---

## Task 4: Configure custom security attributes for agent classification

Use Entra ID custom security attributes to classify and govern agent identities.

```bash
# Create custom security attribute set for AI agents
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/directory/customSecurityAttributeDefinitions" \
    --body '{
        "attributeSet": "AgentGovernance",
        "description": "AI Agent classification and risk level",
        "id": "AgentGovernance_AgentClassification",
        "isCollection": false,
        "isSearchable": true,
        "name": "AgentClassification",
        "status": "Available",
        "type": "String",
        "usePreDefinedValuesOnly": true,
        "allowedValues": [
            {"id": "AIAgent", "isActive": true},
            {"id": "AutomationBot", "isActive": true},
            {"id": "ServiceIntegration", "isActive": true}
        ]
    }'

# Create risk level attribute
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/directory/customSecurityAttributeDefinitions" \
    --body '{
        "attributeSet": "AgentGovernance",
        "description": "Agent data risk classification",
        "id": "AgentGovernance_RiskLevel",
        "isCollection": false,
        "isSearchable": true,
        "name": "RiskLevel",
        "status": "Available",
        "type": "String",
        "usePreDefinedValuesOnly": true,
        "allowedValues": [
            {"id": "Critical", "isActive": true},
            {"id": "High", "isActive": true},
            {"id": "Medium", "isActive": true},
            {"id": "Low", "isActive": true}
        ]
    }'

# Assign attributes to the agent service principal
az rest --method PATCH \
    --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID" \
    --body '{
        "customSecurityAttributes": {
            "AgentGovernance": {
                "@odata.type": "#Microsoft.DirectoryServices.CustomSecurityAttributeValue",
                "AgentClassification": "AIAgent",
                "RiskLevel": "High"
            }
        }
    }'
```

---

## Task 5: Contain blast radius with resource-scoped access

Limit the damage a compromised agent identity can cause by scoping access to specific resources.

```bash
# Create a resource group specifically for the agent's resources
az group create --name "rg-agent-customerservice" --location "eastus"

# Assign minimal RBAC role scoped to the resource group only
az role assignment create \
    --assignee $SP_ID \
    --role "Reader" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-agent-customerservice"

# Create an administrative unit for user objects the agent can manage
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/directory/administrativeUnits" \
    --body '{
        "displayName": "AU-CustomerService-Agents",
        "description": "Administrative unit scoping CS agent access to customer service users",
        "visibility": "HiddenMembership"
    }'

# Add only relevant users to the AU
AU_ID=$(az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/directory/administrativeUnits?\$filter=displayName eq 'AU-CustomerService-Agents'" \
    --query "value[0].id" -o tsv)

# Assign the agent a scoped role within the AU only
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/directory/administrativeUnits/$AU_ID/scopedRoleMembers" \
    --body '{
        "roleId": "helpdesk-administrator-role-template-id",
        "roleMemberInfo": {
            "id": "'$SP_ID'"
        }
    }'
```

```bash
# Configure credential rotation and monitoring
# Set short credential lifetime (90 days max)
az ad app credential reset --id $APP_ID \
    --years 0 \
    --end-date "$(date -d '+90 days' +%Y-%m-%d)"

# Enable workload identity recommendations
# Navigate to Entra > Workload Identities > Recommendations
# Review: "Remove unused credentials", "Replace expiring credentials"
```

---

## Task 6: Monitor agent identity activity with Entra ID logs

Set up continuous monitoring for agent authentication anomalies and suspicious behavior.

```bash
# Query sign-in logs for agent identities
az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=servicePrincipalId eq '$SP_ID' and createdDateTime ge 2024-01-01T00:00:00Z&\$top=50" |
    jq '.value[] | {timestamp: .createdDateTime, status: .status.errorCode, ipAddress: .ipAddress, location: .location.city}'

# Create alert rule for anomalous agent behavior
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/security/alerts_v2" \
    --body '{
        "title": "Anomalous AI Agent Authentication",
        "description": "Agent identity authenticated from unexpected location",
        "severity": "high",
        "status": "new"
    }'

# Monitor workload identity risk detections
az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/identityProtection/servicePrincipalRiskDetections?\$filter=servicePrincipalId eq '$SP_ID'" |
    jq '.value[] | {riskType: .riskEventType, level: .riskLevel, detectedOn: .activityDateTime}'
```

---

## Break & Fix

### Scenario 1: AI agent blocked after Conditional Access policy deployment

After deploying the location-based CA policy, the customer service agent can no longer authenticate and all customer interactions are failing.

<details>
<summary>Show solution</summary>

```bash
# 1. Check if the agent's hosting infrastructure IP is in the allowed list
az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" |
    jq '.value[] | select(.displayName == "Approved Agent Infrastructure IPs")'

# 2. Verify the agent's actual source IP from sign-in logs
az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=servicePrincipalId eq '$SP_ID'&\$top=5&\$orderby=createdDateTime desc" |
    jq '.value[] | {ip: .ipAddress, status: .status.errorCode, failureReason: .status.failureReason}'

# 3. Update the named location to include the agent's hosting IP
# Get the named location ID
LOCATION_ID=$(az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations?\$filter=displayName eq 'Approved Agent Infrastructure IPs'" \
    --query "value[0].id" -o tsv)

# Add the missing IP range (e.g., Azure Container Apps outbound IPs)
az rest --method PATCH \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations/$LOCATION_ID" \
    --body '{
        "ipRanges": [
            {"@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "10.0.0.0/8"},
            {"@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "172.16.0.0/12"},
            {"@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "20.x.x.x/24"}
        ]
    }'

# 4. Temporarily set policy to report-only while fixing
az rest --method PATCH \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/{policy-id}" \
    --body '{"state": "enabledForReportingButNotEnforced"}'
```

</details>

### Scenario 2: Compromised agent credential accessing data outside its scope

Security alerts show the customer service agent identity is accessing the Finance SharePoint site and executive mailboxes — well outside its authorized scope.

<details>
<summary>Show solution</summary>

```bash
# 1. IMMEDIATELY revoke all credentials for the compromised agent
# List all credentials and delete each one
for KEY_ID in $(az ad sp credential list --id $SP_ID --query "[].keyId" -o tsv); do
    az ad sp credential delete --id $SP_ID --key-id "$KEY_ID"
done

# Revoke active tokens via continuous access evaluation
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/revokeSignInSessions"

# 2. Disable the service principal
az ad sp update --id $SP_ID --set "accountEnabled=false"

# 3. Investigate the scope of compromise
az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=servicePrincipalId eq '$SP_ID' and createdDateTime ge $(date -d '-7 days' +%Y-%m-%dT00:00:00Z)" |
    jq '.value[] | {time: .createdDateTime, ip: .ipAddress, resource: .resourceDisplayName}'

# 4. Check what data was accessed
az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=initiatedBy/app/servicePrincipalId eq '$SP_ID'" |
    jq '.value[] | {activity: .activityDisplayName, target: .targetResources[0].displayName}'

# 5. After investigation, rotate credentials and re-enable with tighter controls
az ad app credential reset --id $APP_ID --years 0 --end-date "$(date -d '+30 days' +%Y-%m-%d)"
az ad sp update --id $SP_ID --set "accountEnabled=true"

# 6. Add continuous access evaluation enforcement
# Ensure CAE is enabled for workload identities in CA policy
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the primary purpose of Microsoft Entra Agent ID?",
    options: [
      "To create user accounts for human operators managing AI systems",
      "To provide dedicated identity lifecycle management for AI agents with governance controls",
      "To encrypt AI model weights stored in Azure",
      "To authenticate end-users accessing AI-powered applications"
    ],
    correctIndex: 1,
    explanation: "Entra Agent ID provides purpose-built identity management for AI agents, including dedicated identities, Conditional Access, risk detection, and governance controls separate from human user identities."
  },
  {
    question: "How does Conditional Access for workload identities differ from user-based Conditional Access?",
    options: [
      "Workload CA cannot enforce MFA since agents cannot perform interactive authentication",
      "Workload CA is identical to user CA in all aspects",
      "Workload CA only works with Azure resources, not Microsoft 365",
      "Workload CA cannot use location-based conditions"
    ],
    correctIndex: 0,
    explanation: "Unlike user-based CA, workload identity CA cannot require MFA (agents authenticate non-interactively). Instead, it relies on location restrictions, risk levels, token lifetime limits, and blocking controls to secure agent authentication."
  },
  {
    question: "What is the recommended approach to contain the blast radius of a compromised AI agent identity?",
    options: [
      "Grant the agent Global Administrator role with time-limited access",
      "Use administrative units, application access policies, and resource-scoped RBAC to limit what the agent can access",
      "Share a single service principal across all agents for easier monitoring",
      "Disable all Conditional Access policies during agent operation"
    ],
    correctIndex: 1,
    explanation: "Blast radius containment combines administrative units (scoping directory access), application access policies (limiting mailbox/resource access), and resource-scoped RBAC to ensure a compromised agent can only access its designated resources."
  },
  {
    question: "When a workload identity risk detection triggers for an AI agent, what is the correct incident response sequence?",
    options: [
      "Delete the agent identity and recreate it from scratch",
      "Revoke tokens, disable the service principal, investigate access logs, rotate credentials, then re-enable with enhanced controls",
      "Simply change the agent's password and continue operations",
      "Wait for the risk to auto-resolve within 24 hours"
    ],
    correctIndex: 1,
    explanation: "The correct sequence is: immediately revoke tokens and disable the principal to stop the attack, investigate what was accessed, rotate credentials, and re-enable with tighter Conditional Access controls to prevent recurrence."
  }
]} />

## Cleanup

```bash
# Delete test agent identity
az ad app delete --id $APP_ID

# Remove resource group
az group delete --name "rg-agent-customerservice" --yes --no-wait

# Remove administrative unit
az rest --method DELETE \
    --uri "https://graph.microsoft.com/v1.0/directory/administrativeUnits/$AU_ID"

# Remove Conditional Access policies (by ID)
# az rest --method DELETE --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/{policy-id}"
```
