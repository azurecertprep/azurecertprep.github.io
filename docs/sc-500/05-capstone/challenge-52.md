---
sidebar_position: 1
title: "Challenge 52: Capstone – End-to-End Cloud and AI Security"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 52: Capstone – End-to-End Cloud and AI Security

## Exam skills covered

- **Identity & Access**: Configure PIM, Conditional Access, MFA enforcement
- **Data & Storage Security**: Key Vault with private endpoints, disk encryption
- **Compute Security**: Secure boot, vTPM, Bastion, JIT VM access
- **Network Security**: Hub-spoke topology, Azure Firewall, NSGs
- **Security Posture**: Defender for Cloud CSPM, workload protection plans
- **Threat Detection**: Microsoft Sentinel, analytics rules, automation playbooks
- **AI Security**: API Management AI Gateway, rate limiting, content safety

## Scenario

**THE GRAND FINALE**

Contoso Ltd is a global financial services company completing a major cloud migration. As the lead security architect, you must implement a comprehensive security architecture spanning all domains of the SC-500 exam. This capstone challenge integrates identity governance, data protection, network security, compute hardening, threat detection, and AI governance into a single cohesive deployment.

**Contoso's requirements:**
- Zero-trust architecture with PIM-protected privileged access
- All sensitive workloads must use private networking (no public endpoints)
- Virtual machines must meet CIS Level 1 hardening benchmarks
- All administrative access via Azure Bastion with JIT approval
- Hub-spoke network design with centralized firewall inspection
- Full security monitoring with automated incident response
- AI workloads governed by API Management with safety controls
- Compliance with SOC 2 Type II and PCI-DSS requirements

---

## Prerequisites

- Azure subscription with Owner role
- Microsoft Entra ID P2 licensing (PIM, Conditional Access)
- Microsoft Defender for Cloud enabled (CSPM plan)
- Azure CLI with extensions: `sentinel`, `bastion`, `ssh`
- Familiarity with all previous challenges (1-51)
- Estimated time: 90-120 minutes
- Estimated cost: ~$15-25 for the full deployment (delete promptly)

---

## Task 1: Configure PIM for privileged admin accounts with approval workflow

Implement Privileged Identity Management with time-bound, approval-required access for Global Administrators.

```bash
# Set variables for the entire capstone
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
RG_CORE="rg-contoso-capstone-core"
RG_SPOKE="rg-contoso-capstone-spoke"
LOCATION="eastus"

# Create core resource group
az group create --name $RG_CORE --location $LOCATION
az group create --name $RG_SPOKE --location $LOCATION

# Configure PIM settings via Graph API
# Set Global Admin role to require approval with 4-hour maximum duration
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/policies/roleManagementPolicies" \
  --headers "Content-Type=application/json" \
  --body '{
    "rules": [
      {
        "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyApprovalRule",
        "id": "Approval_EndUser_Assignment",
        "target": {"caller": "EndUser", "operations": ["all"], "level": "Assignment"},
        "setting": {
          "isApprovalRequired": true,
          "isApprovalRequiredForExtension": true,
          "approvalStages": [{
            "approvalStageTimeOutInDays": 1,
            "isApproverJustificationRequired": true,
            "primaryApprovers": [{
              "@odata.type": "#microsoft.graph.groupMembers",
              "groupId": "security-approvers-group-id",
              "description": "Security Approvers"
            }]
          }]
        }
      },
      {
        "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyExpirationRule",
        "id": "Expiration_EndUser_Assignment",
        "target": {"caller": "EndUser", "operations": ["all"], "level": "Assignment"},
        "isExpirationRequired": true,
        "maximumDuration": "PT4H"
      },
      {
        "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyAuthenticationContextRule",
        "id": "AuthenticationContext_EndUser_Assignment",
        "claimValue": "c1",
        "isEnabled": true
      }
    ]
  }'

# Make admin user eligible (not permanently assigned)
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests" \
  --body '{
    "action": "adminAssign",
    "justification": "Capstone: PIM eligible assignment for Global Admin",
    "roleDefinitionId": "62e90394-69f5-4237-9190-012177145e10",
    "directoryScopeId": "/",
    "principalId": "admin-user-object-id",
    "scheduleInfo": {
      "startDateTime": "2025-01-15T00:00:00Z",
      "expiration": {
        "type": "afterDuration",
        "duration": "P365D"
      }
    }
  }'
```

**Verify PIM configuration:**
1. Navigate to **Entra ID** → **Identity Governance** → **Privileged Identity Management**
2. Select **Azure AD roles** → **Settings** → **Global Administrator**
3. Confirm:
   - Activation requires approval ✓
   - Maximum activation duration: 4 hours ✓
   - Require MFA on activation ✓
   - Require justification ✓

---

## Task 2: Create Conditional Access policy requiring MFA for risky sign-ins

Deploy a Conditional Access policy that enforces MFA when Identity Protection detects risk.

```bash
# Create Conditional Access policy via Graph API
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --body '{
    "displayName": "Capstone: Require MFA for Risky Sign-ins",
    "state": "enabled",
    "conditions": {
      "users": {
        "includeUsers": ["All"],
        "excludeUsers": ["break-glass-admin-object-id"],
        "excludeGroups": ["service-accounts-group-id"]
      },
      "applications": {
        "includeApplications": ["All"]
      },
      "signInRiskLevels": ["high", "medium"],
      "userRiskLevels": ["high"]
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["mfa"]
    },
    "sessionControls": {
      "signInFrequency": {
        "value": 1,
        "type": "hours",
        "isEnabled": true
      }
    }
  }'

# Create a second policy: Block legacy authentication
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --body '{
    "displayName": "Capstone: Block Legacy Authentication",
    "state": "enabled",
    "conditions": {
      "users": {"includeUsers": ["All"]},
      "applications": {"includeApplications": ["All"]},
      "clientAppTypes": ["exchangeActiveSync", "other"]
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["block"]
    }
  }'
```

**Verify:**
```bash
# List all Conditional Access policies
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --query "value[].{Name:displayName, State:state}" -o table
```

---

## Task 3: Deploy Key Vault with private endpoint and firewall rules

Create a Key Vault that is only accessible via private networking.

```bash
# Create VNet for private endpoints (will be spoke network)
az network vnet create \
  --resource-group $RG_SPOKE \
  --name "vnet-contoso-spoke" \
  --address-prefix "10.1.0.0/16" \
  --subnet-name "snet-private-endpoints" \
  --subnet-prefix "10.1.1.0/24"

# Disable private endpoint network policies on subnet
az network vnet subnet update \
  --resource-group $RG_SPOKE \
  --vnet-name "vnet-contoso-spoke" \
  --name "snet-private-endpoints" \
  --private-endpoint-network-policies Disabled

# Create Key Vault with no public access
az keyvault create \
  --name "kv-contoso-capstone" \
  --resource-group $RG_SPOKE \
  --location $LOCATION \
  --sku premium \
  --enable-rbac-authorization true \
  --enable-purge-protection true \
  --enable-soft-delete true \
  --public-network-access Disabled \
  --retention-days 90

# Create private endpoint for Key Vault
az network private-endpoint create \
  --resource-group $RG_SPOKE \
  --name "pe-keyvault-capstone" \
  --vnet-name "vnet-contoso-spoke" \
  --subnet "snet-private-endpoints" \
  --private-connection-resource-id $(az keyvault show --name "kv-contoso-capstone" --resource-group $RG_SPOKE --query id -o tsv) \
  --group-ids vault \
  --connection-name "keyvault-private-connection"

# Create private DNS zone for Key Vault
az network private-dns zone create \
  --resource-group $RG_SPOKE \
  --name "privatelink.vaultcore.azure.net"

# Link DNS zone to VNet
az network private-dns link vnet create \
  --resource-group $RG_SPOKE \
  --zone-name "privatelink.vaultcore.azure.net" \
  --name "link-spoke-vnet" \
  --virtual-network "vnet-contoso-spoke" \
  --registration-enabled false

# Create DNS zone group for automatic DNS record management
az network private-endpoint dns-zone-group create \
  --resource-group $RG_SPOKE \
  --endpoint-name "pe-keyvault-capstone" \
  --name "default" \
  --private-dns-zone $(az network private-dns zone show --resource-group $RG_SPOKE --name "privatelink.vaultcore.azure.net" --query id -o tsv) \
  --zone-name "keyvault"

# Add a secret for testing
az keyvault secret set \
  --vault-name "kv-contoso-capstone" \
  --name "DatabaseConnectionString" \
  --value "Server=tcp:sql-contoso.database.windows.net;Encrypt=True;"

# Assign Key Vault Secrets Officer role to admin
az role assignment create \
  --assignee $(az ad signed-in-user show --query id -o tsv) \
  --role "Key Vault Secrets Officer" \
  --scope $(az keyvault show --name "kv-contoso-capstone" --resource-group $RG_SPOKE --query id -o tsv)
```

**Verify private-only access:**
```bash
# This should fail (no public access)
az keyvault secret show --vault-name "kv-contoso-capstone" --name "DatabaseConnectionString" 2>&1 | grep -i "forbidden\|error"

# Verify private endpoint is connected
az network private-endpoint show \
  --resource-group $RG_SPOKE \
  --name "pe-keyvault-capstone" \
  --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status" -o tsv
```

---

## Task 4: Create VM with disk encryption, secure boot, and vTPM

Deploy a hardened virtual machine with Trusted Launch and Azure Disk Encryption.

```bash
# Create VM subnet
az network vnet subnet create \
  --resource-group $RG_SPOKE \
  --vnet-name "vnet-contoso-spoke" \
  --name "snet-compute" \
  --address-prefix "10.1.2.0/24"

# Create Trusted Launch VM with secure boot and vTPM
az vm create \
  --resource-group $RG_SPOKE \
  --name "vm-contoso-secure" \
  --image "Canonical:ubuntu-24_04-lts:server:latest" \
  --size "Standard_D2s_v5" \
  --vnet-name "vnet-contoso-spoke" \
  --subnet "snet-compute" \
  --admin-username "contosoAdmin" \
  --generate-ssh-keys \
  --security-type TrustedLaunch \
  --enable-secure-boot true \
  --enable-vtpm true \
  --public-ip-address "" \
  --nsg ""

# Enable Azure Disk Encryption (using Key Vault for key management)
# First, create a disk encryption set
az disk-encryption-set create \
  --resource-group $RG_SPOKE \
  --name "des-contoso-capstone" \
  --key-url "https://kv-contoso-capstone.vault.azure.net/keys/disk-encryption-key/version" \
  --source-vault "kv-contoso-capstone" \
  --encryption-type EncryptionAtRestWithPlatformAndCustomerKeys \
  2>/dev/null || echo "Note: Key must be created in KV first for full disk encryption set"

# Enable host-based encryption on the VM
az vm update \
  --resource-group $RG_SPOKE \
  --name "vm-contoso-secure" \
  --set securityProfile.encryptionAtHost=true \
  2>/dev/null || echo "Note: encryptionAtHost requires feature registration"

# Install Guest Attestation extension for Trusted Launch verification
az vm extension set \
  --resource-group $RG_SPOKE \
  --vm-name "vm-contoso-secure" \
  --name "GuestAttestation" \
  --publisher "Microsoft.Azure.Security.LinuxAttestation" \
  --version "1.0"
```

**Verify VM security configuration:**
```bash
az vm show \
  --resource-group $RG_SPOKE \
  --name "vm-contoso-secure" \
  --query "{
    SecureBoot: securityProfile.uefiSettings.secureBootEnabled,
    VTPM: securityProfile.uefiSettings.vTpmEnabled,
    SecurityType: securityProfile.securityType,
    EncryptionAtHost: securityProfile.encryptionAtHost
  }" -o table
```

---

## Task 5: Configure Azure Bastion and JIT VM access

Deploy Bastion for secure administrative access and enable Just-In-Time policies.

```bash
# Create Bastion subnet (required name: AzureBastionSubnet)
az network vnet subnet create \
  --resource-group $RG_SPOKE \
  --vnet-name "vnet-contoso-spoke" \
  --name "AzureBastionSubnet" \
  --address-prefix "10.1.255.0/26"

# Create public IP for Bastion
az network public-ip create \
  --resource-group $RG_SPOKE \
  --name "pip-bastion-capstone" \
  --sku Standard \
  --allocation-method Static

# Deploy Azure Bastion (Standard SKU for file transfer and native client)
az network bastion create \
  --resource-group $RG_SPOKE \
  --name "bastion-contoso-capstone" \
  --public-ip-address "pip-bastion-capstone" \
  --vnet-name "vnet-contoso-spoke" \
  --sku Standard \
  --enable-tunneling true \
  --enable-ip-connect true

# Enable JIT VM access via Defender for Cloud
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG_SPOKE/providers/Microsoft.Compute/virtualMachines/vm-contoso-secure/providers/Microsoft.Security/jitNetworkAccessPolicies/default?api-version=2020-01-01" \
  --body '{
    "properties": {
      "virtualMachines": [{
        "id": "/subscriptions/'$SUBSCRIPTION_ID'/resourceGroups/'$RG_SPOKE'/providers/Microsoft.Compute/virtualMachines/vm-contoso-secure",
        "ports": [
          {
            "number": 22,
            "protocol": "TCP",
            "allowedSourceAddressPrefix": "*",
            "maxRequestAccessDuration": "PT3H"
          }
        ]
      }]
    },
    "kind": "Basic"
  }'
```

**Verify Bastion and JIT:**
```bash
# Verify Bastion is provisioned
az network bastion show \
  --resource-group $RG_SPOKE \
  --name "bastion-contoso-capstone" \
  --query "{Status:provisioningState, SKU:sku.name, Tunneling:enableTunneling}" -o table

# Verify JIT policy is active
az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG_SPOKE/providers/Microsoft.Security/jitNetworkAccessPolicies?api-version=2020-01-01" \
  --query "value[].{Name:name, VMs:properties.virtualMachines[].id}" -o table
```

---

## Task 6: Set up hub-spoke network with Azure Firewall and NSG rules

Create the hub network with centralized Azure Firewall for traffic inspection.

```bash
# Create hub VNet
az network vnet create \
  --resource-group $RG_CORE \
  --name "vnet-contoso-hub" \
  --address-prefix "10.0.0.0/16" \
  --subnet-name "AzureFirewallSubnet" \
  --subnet-prefix "10.0.1.0/26"

# Create Azure Firewall public IP
az network public-ip create \
  --resource-group $RG_CORE \
  --name "pip-firewall-capstone" \
  --sku Standard \
  --allocation-method Static

# Deploy Azure Firewall (Standard tier)
az network firewall create \
  --resource-group $RG_CORE \
  --name "fw-contoso-hub" \
  --location $LOCATION \
  --sku AZFW_VNet \
  --tier Standard

# Associate public IP with firewall
az network firewall ip-config create \
  --resource-group $RG_CORE \
  --firewall-name "fw-contoso-hub" \
  --name "fw-ipconfig" \
  --public-ip-address "pip-firewall-capstone" \
  --vnet-name "vnet-contoso-hub"

# Get firewall private IP for routing
FW_PRIVATE_IP=$(az network firewall show \
  --resource-group $RG_CORE \
  --name "fw-contoso-hub" \
  --query "ipConfigurations[0].privateIPAddress" -o tsv)

# Create firewall network rules (allow spoke to internet via firewall)
az network firewall network-rule create \
  --resource-group $RG_CORE \
  --firewall-name "fw-contoso-hub" \
  --collection-name "AllowSpokeOutbound" \
  --name "AllowHTTPS" \
  --protocols TCP \
  --source-addresses "10.1.0.0/16" \
  --destination-addresses "*" \
  --destination-ports 443 \
  --action Allow \
  --priority 100

# Create firewall application rules (restrict to approved FQDNs)
az network firewall application-rule create \
  --resource-group $RG_CORE \
  --firewall-name "fw-contoso-hub" \
  --collection-name "AllowAzureServices" \
  --name "AllowAzureManagement" \
  --protocols Https=443 \
  --source-addresses "10.1.0.0/16" \
  --fqdn-tags "AzureCloud" "MicrosoftActiveDirectory" \
  --action Allow \
  --priority 200

# Create DNAT rule to deny known malicious destinations
az network firewall network-rule create \
  --resource-group $RG_CORE \
  --firewall-name "fw-contoso-hub" \
  --collection-name "DenyMalicious" \
  --name "DenyKnownC2" \
  --protocols Any \
  --source-addresses "10.0.0.0/8" \
  --destination-addresses "198.51.100.0/24" "203.0.113.0/24" \
  --destination-ports "*" \
  --action Deny \
  --priority 50

# Peer hub and spoke VNets
az network vnet peering create \
  --resource-group $RG_CORE \
  --name "hub-to-spoke" \
  --vnet-name "vnet-contoso-hub" \
  --remote-vnet $(az network vnet show --resource-group $RG_SPOKE --name "vnet-contoso-spoke" --query id -o tsv) \
  --allow-forwarded-traffic \
  --allow-gateway-transit

az network vnet peering create \
  --resource-group $RG_SPOKE \
  --name "spoke-to-hub" \
  --vnet-name "vnet-contoso-spoke" \
  --remote-vnet $(az network vnet show --resource-group $RG_CORE --name "vnet-contoso-hub" --query id -o tsv) \
  --allow-forwarded-traffic \
  --use-remote-gateways false

# Create route table to force traffic through firewall
az network route-table create \
  --resource-group $RG_SPOKE \
  --name "rt-spoke-to-firewall" \
  --location $LOCATION

az network route-table route create \
  --resource-group $RG_SPOKE \
  --route-table-name "rt-spoke-to-firewall" \
  --name "default-to-firewall" \
  --address-prefix "0.0.0.0/0" \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $FW_PRIVATE_IP

# Associate route table with compute subnet
az network vnet subnet update \
  --resource-group $RG_SPOKE \
  --vnet-name "vnet-contoso-spoke" \
  --name "snet-compute" \
  --route-table "rt-spoke-to-firewall"

# Create NSG for compute subnet
az network nsg create \
  --resource-group $RG_SPOKE \
  --name "nsg-compute-capstone"

# Deny all inbound except Bastion
az network nsg rule create \
  --resource-group $RG_SPOKE \
  --nsg-name "nsg-compute-capstone" \
  --name "AllowBastionInbound" \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol TCP \
  --source-address-prefixes "10.1.255.0/26" \
  --destination-port-ranges 22 3389

az network nsg rule create \
  --resource-group $RG_SPOKE \
  --nsg-name "nsg-compute-capstone" \
  --name "DenyAllInbound" \
  --priority 4000 \
  --direction Inbound \
  --access Deny \
  --protocol "*" \
  --source-address-prefixes "*" \
  --destination-port-ranges "*"

# Associate NSG with compute subnet
az network vnet subnet update \
  --resource-group $RG_SPOKE \
  --vnet-name "vnet-contoso-spoke" \
  --name "snet-compute" \
  --network-security-group "nsg-compute-capstone"
```

---

## Task 7: Enable Defender for Cloud CSPM and workload protection

Activate full cloud security posture management and workload protection.

```bash
# Enable Defender for Cloud CSPM (Cloud Security Posture Management)
az security pricing create \
  --name "CloudPosture" \
  --tier "Standard"

# Enable Defender for Servers (Plan 2 - full EDR)
az security pricing create \
  --name "VirtualMachines" \
  --tier "Standard" \
  --subplan "P2"

# Enable Defender for Key Vault
az security pricing create \
  --name "KeyVaults" \
  --tier "Standard"

# Enable Defender for Storage
az security pricing create \
  --name "StorageAccounts" \
  --tier "Standard" \
  --subplan "DefenderForStorageV2"

# Enable Defender for Azure Resource Manager
az security pricing create \
  --name "Arm" \
  --tier "Standard"

# Enable Defender for DNS
az security pricing create \
  --name "Dns" \
  --tier "Standard"

# Configure security contact for alerts
az security contact create \
  --name "default" \
  --emails "soc@contoso.com" \
  --alert-notifications "On" \
  --alerts-to-admins "On"

# Enable auto-provisioning for Defender for Endpoint
az security auto-provisioning-setting update \
  --name "default" \
  --auto-provision "On"

# Set Defender for Cloud governance rules
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/providers/Microsoft.Security/governanceRules/capstone-governance?api-version=2022-01-01-preview" \
  --body '{
    "properties": {
      "displayName": "Capstone: Remediate Critical Findings in 7 Days",
      "description": "Auto-assign critical security findings to resource owners",
      "rulePriority": 100,
      "isGracePeriod": true,
      "governanceEmailNotification": {
        "disableManagerEmailNotification": false,
        "disableOwnerEmailNotification": false
      },
      "ownerSource": {"type": "ByTag", "value": "SecurityOwner"},
      "remediationTimeframe": "7.00:00:00",
      "conditionSets": [{
        "conditions": [{
          "property": "$.Severity",
          "value": ["High", "Critical"],
          "operator": "In"
        }]
      }]
    }
  }'
```

**Verify Defender for Cloud status:**
```bash
# Check all pricing tiers
az security pricing list --query "[].{Name:name, Tier:pricingTier}" -o table
```

---

## Task 8: Deploy Sentinel workspace with Azure Activity and Entra ID connectors

Create the security monitoring layer with Microsoft Sentinel.

```bash
# Create dedicated Sentinel workspace
SENTINEL_WORKSPACE="law-contoso-sentinel-capstone"

az monitor log-analytics workspace create \
  --workspace-name $SENTINEL_WORKSPACE \
  --resource-group $RG_CORE \
  --location $LOCATION \
  --retention-time 90

# Enable Sentinel
az sentinel onboarding-state create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --name "default"

# Enable Azure Activity data connector
az sentinel data-connector create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --data-connector-id "AzureActivity" \
  --azure-activity \
  --subscription-id $SUBSCRIPTION_ID \
  --data-types-azure-activity-state "Enabled"

# Enable Entra ID data connector
az sentinel data-connector create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --data-connector-id "AzureActiveDirectory" \
  --aad \
  --tenant-id $TENANT_ID \
  --data-types-sign-in-logs-state "Enabled" \
  --data-types-audit-logs-state "Enabled" \
  --data-types-alerts-state "Enabled"

# Enable Defender for Cloud connector
az sentinel data-connector create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --data-connector-id "AzureSecurityCenter" \
  --asc \
  --subscription-id $SUBSCRIPTION_ID \
  --data-types-alerts-state "Enabled"

# Send Azure Firewall logs to Sentinel workspace
SENTINEL_WS_ID=$(az monitor log-analytics workspace show \
  --workspace-name $SENTINEL_WORKSPACE \
  --resource-group $RG_CORE \
  --query id -o tsv)

az monitor diagnostic-settings create \
  --name "firewall-to-sentinel" \
  --resource $(az network firewall show --resource-group $RG_CORE --name "fw-contoso-hub" --query id -o tsv) \
  --workspace $SENTINEL_WS_ID \
  --logs '[
    {"category":"AzureFirewallApplicationRule","enabled":true},
    {"category":"AzureFirewallNetworkRule","enabled":true},
    {"category":"AzureFirewallDnsProxy","enabled":true}
  ]'

# Verify connectors
az sentinel data-connector list \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --query "[].{Name:name, Kind:kind}" -o table
```

---

## Task 9: Create analytics rules and automation playbook for brute-force detection

Build detection and automated response for credential attacks.

```bash
# Create brute-force detection rule
az sentinel alert-rule create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --rule-id "capstone-brute-force" \
  --scheduled \
  --name "Capstone: Brute Force Sign-in with Subsequent Success" \
  --description "Detects brute-force attacks where attacker eventually succeeds" \
  --severity "High" \
  --enabled true \
  --query "let failThreshold = 10;
SigninLogs
| where TimeGenerated > ago(1h)
| summarize 
    FailCount = countif(ResultType != 0),
    SuccessCount = countif(ResultType == 0),
    FirstAttempt = min(TimeGenerated),
    LastAttempt = max(TimeGenerated),
    AttemptedAccounts = make_set(UserPrincipalName, 20)
    by IPAddress
| where FailCount >= failThreshold and SuccessCount > 0
| project IPAddress, FailCount, SuccessCount, 
          FirstAttempt, LastAttempt, AttemptedAccounts" \
  --query-frequency "PT10M" \
  --query-period "PT1H" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "CredentialAccess" \
  --techniques "T1110"

# Create privilege escalation detection (NRT)
az sentinel alert-rule create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --rule-id "capstone-priv-esc" \
  --nrt \
  --name "Capstone: Unauthorized Role Assignment (NRT)" \
  --description "Detects direct privileged role assignment bypassing PIM" \
  --severity "High" \
  --enabled true \
  --query "AuditLogs
| where TimeGenerated > ago(5m)
| where OperationName == 'Add member to role'
| extend RoleName = tostring(TargetResources[0].displayName)
| where RoleName has_any ('Global Administrator', 'Privileged Role Administrator', 'Security Administrator')
| where OperationName != 'Add eligible member to role in PIM'
| extend Actor = tostring(InitiatedBy.user.userPrincipalName),
         Target = tostring(TargetResources[0].userPrincipalName)
| project TimeGenerated, Actor, Target, RoleName" \
  --tactics "PrivilegeEscalation" \
  --techniques "T1078.004"

# Create Logic App playbook for automated response
az logic workflow create \
  --resource-group $RG_CORE \
  --name "playbook-capstone-brute-force" \
  --location $LOCATION \
  --definition '{
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "contentVersion": "1.0.0.0",
      "triggers": {
        "Microsoft_Sentinel_incident": {
          "type": "ApiConnectionWebhook",
          "inputs": {
            "body": {"callback_url": "@{listCallbackUrl()}"},
            "host": {"connection": {"name": "@parameters($connections)[azuresentinel][connectionId]"}},
            "path": "/incident-creation"
          }
        }
      },
      "actions": {
        "Revoke_user_sessions": {
          "type": "Http",
          "inputs": {
            "method": "POST",
            "uri": "https://graph.microsoft.com/v1.0/users/@{triggerBody()?[object]?[properties]?[relatedEntities]?[0]?[properties]?[friendlyName]}/revokeSignInSessions"
          },
          "runAfter": {}
        },
        "Add_comment": {
          "type": "ApiConnection",
          "inputs": {
            "host": {"connection": {"name": "@parameters($connections)[azuresentinel][connectionId]"}},
            "method": "post",
            "path": "/comment",
            "body": {
              "incidentArmId": "@triggerBody()?[object]?[id]",
              "message": "Automated: User sessions revoked. IP submitted for blocking."
            }
          },
          "runAfter": {"Revoke_user_sessions": ["Succeeded"]}
        }
      }
    }
  }'

# Link playbook to brute-force rule via automation rule
PLAYBOOK_ID=$(az logic workflow show \
  --resource-group $RG_CORE \
  --name "playbook-capstone-brute-force" \
  --query id -o tsv)

az sentinel automation-rule create \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --automation-rule-id "capstone-auto-brute-force" \
  --name "Capstone: Auto-respond Brute Force" \
  --order 1 \
  --triggering-logic \
    is-enabled=true \
    triggers-on="Incidents" \
    triggers-when="Created" \
    conditions='[{
      "conditionType": "Property",
      "conditionProperties": {
        "propertyName": "IncidentSeverity",
        "operator": "Equals",
        "propertyValues": ["High"]
      }
    }]' \
  --actions '[{
    "actionType": "RunPlaybook",
    "order": 1,
    "actionConfiguration": {
      "logicAppResourceId": "'$PLAYBOOK_ID'",
      "tenantId": "'$TENANT_ID'"
    }
  }]'
```

---

## Task 10: Configure API Management AI Gateway with rate limiting and content safety

Deploy an API Management instance as an AI Gateway with security controls.

```bash
# Create APIM subnet in spoke
az network vnet subnet create \
  --resource-group $RG_SPOKE \
  --vnet-name "vnet-contoso-spoke" \
  --name "snet-apim" \
  --address-prefix "10.1.3.0/24"

# Create API Management instance (Consumption tier for lab speed)
az apim create \
  --resource-group $RG_SPOKE \
  --name "apim-contoso-aigateway" \
  --publisher-name "Contoso Ltd" \
  --publisher-email "api-admin@contoso.com" \
  --sku-name Consumption \
  --location $LOCATION

# Import Azure OpenAI API as backend
az apim api import \
  --resource-group $RG_SPOKE \
  --service-name "apim-contoso-aigateway" \
  --path "openai" \
  --display-name "Azure OpenAI Gateway" \
  --specification-format OpenApi \
  --specification-url "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/stable/2024-02-01/inference.json" \
  --api-id "azure-openai-api" \
  2>/dev/null || echo "Note: Import URL may need updating for latest spec"

# Create rate limiting policy (token-based)
az apim api policy set \
  --resource-group $RG_SPOKE \
  --service-name "apim-contoso-aigateway" \
  --api-id "azure-openai-api" \
  --xml-policy '<policies>
  <inbound>
    <base />
    <!-- Rate limiting: 10000 tokens per minute per subscription -->
    <rate-limit-by-key 
      calls="60" 
      renewal-period="60" 
      counter-key="@(context.Subscription.Id)" />
    <!-- Token limit policy for AI workloads -->
    <azure-openai-token-limit
      counter-key="@(context.Subscription.Id)"
      tokens-per-minute="10000"
      estimate-prompt-tokens="true"
      remaining-tokens-variable-name="remainingTokens" />
    <!-- Content safety filter -->
    <azure-openai-semantic-cache-store duration="300" />
    <!-- Validate JWT for authentication -->
    <validate-azure-ad-token tenant-id="'$TENANT_ID'" header-name="Authorization">
      <client-application-ids>
        <application-id>allowed-client-app-id</application-id>
      </client-application-ids>
    </validate-azure-ad-token>
    <!-- Log token usage for monitoring -->
    <set-header name="x-request-timestamp" exists-action="override">
      <value>@(DateTime.UtcNow.ToString("o"))</value>
    </set-header>
  </inbound>
  <backend>
    <base />
  </backend>
  <outbound>
    <base />
    <!-- Emit token usage metrics -->
    <azure-openai-emit-token-metric namespace="AIGateway">
      <dimension name="Subscription" value="@(context.Subscription.Id)" />
      <dimension name="API" value="@(context.Api.Name)" />
      <dimension name="Model" value="@(context.Request.Headers.GetValueOrDefault(\"model\",\"unknown\"))" />
    </azure-openai-emit-token-metric>
  </outbound>
  <on-error>
    <base />
    <return-response>
      <set-status code="429" reason="Rate limit exceeded" />
      <set-body>{"error": "Token or request rate limit exceeded. Please retry after the rate limit window resets."}</set-body>
    </return-response>
  </on-error>
</policies>'

# Create subscription key for the AI API
az apim subscription create \
  --resource-group $RG_SPOKE \
  --service-name "apim-contoso-aigateway" \
  --display-name "AI-Team-Production" \
  --scope "/apis/azure-openai-api" \
  --state active
```

**Verify AI Gateway configuration:**
```bash
# List APIs
az apim api list \
  --resource-group $RG_SPOKE \
  --service-name "apim-contoso-aigateway" \
  --query "[].{Name:displayName, Path:path}" -o table

# List subscriptions
az apim subscription list \
  --resource-group $RG_SPOKE \
  --service-name "apim-contoso-aigateway" \
  --query "[].{Name:displayName, State:state}" -o table
```

---

## Break & Fix

### Scenario 1: PIM activation fails with "Authentication context required"

An admin attempts to activate their Global Administrator role via PIM but receives an error stating the authentication context requirement cannot be satisfied.

<details>
<summary>Show solution</summary>

**Root cause:** The PIM role policy references an authentication context (`c1`) that requires a specific Conditional Access policy to satisfy, but no CA policy is configured with that authentication context.

**Fix:**
1. Create a Conditional Access policy with the required authentication context:
   ```bash
   az rest --method POST \
     --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
     --body '{
       "displayName": "Require phishing-resistant MFA for PIM activation",
       "state": "enabled",
       "conditions": {
         "users": {"includeUsers": ["All"]},
         "applications": {
           "includeAuthenticationContextClassReferences": ["c1"]
         }
       },
       "grantControls": {
         "operator": "OR",
         "authenticationStrength": {
           "id": "00000000-0000-0000-0000-000000000004"
         }
       }
     }'
   ```
2. Alternatively, remove the authentication context requirement from the PIM policy if phishing-resistant MFA is not feasible

</details>

### Scenario 2: VM cannot reach Key Vault via private endpoint

The secure VM in the spoke VNet cannot access Key Vault secrets even though the private endpoint exists.

<details>
<summary>Show solution</summary>

**Root cause:** The private DNS zone is not resolving correctly—the VM is still trying to reach the public endpoint which is disabled.

**Fix:**
1. Verify DNS resolution from the VM:
   ```bash
   az network bastion ssh \
     --resource-group $RG_SPOKE \
     --name "bastion-contoso-capstone" \
     --target-resource-id $(az vm show -g $RG_SPOKE -n "vm-contoso-secure" --query id -o tsv) \
     --auth-type ssh-key \
     --username contosoAdmin \
     --ssh-key "~/.ssh/id_rsa" \
     -- -t "nslookup kv-contoso-capstone.vault.azure.net"
   ```
2. If resolving to public IP, verify the private DNS zone link:
   ```bash
   az network private-dns link vnet show \
     --resource-group $RG_SPOKE \
     --zone-name "privatelink.vaultcore.azure.net" \
     --name "link-spoke-vnet"
   ```
3. Ensure the DNS zone group is created on the private endpoint:
   ```bash
   az network private-endpoint dns-zone-group show \
     --resource-group $RG_SPOKE \
     --endpoint-name "pe-keyvault-capstone" \
     --name "default"
   ```
4. If the route table forces all traffic through the firewall, ensure the firewall has a network rule allowing traffic to the private endpoint IP (10.1.1.x) or use a service endpoint

</details>

### Scenario 3: Firewall blocks legitimate Azure management traffic from spoke VMs

After enabling the route table forcing traffic through the firewall, the VM can no longer reach Azure management endpoints needed for extensions and updates.

<details>
<summary>Show solution</summary>

**Root cause:** The firewall application rules use FQDN tags but the rules may not cover all required management endpoints, or the priority ordering is incorrect.

**Fix:**
1. Add required service tags to network rules:
   ```bash
   az network firewall network-rule create \
     --resource-group $RG_CORE \
     --firewall-name "fw-contoso-hub" \
     --collection-name "AllowAzureManagement" \
     --name "AllowAzureMonitor" \
     --protocols TCP \
     --source-addresses "10.1.0.0/16" \
     --destination-addresses "AzureMonitor" \
     --destination-ports 443 \
     --action Allow \
     --priority 150
   ```
2. Verify FQDN tag `AzureCloud` includes all needed endpoints
3. Consider adding specific service tags: `AzureActiveDirectory`, `AzureKeyVault`, `Storage`
4. Check firewall logs for blocked traffic:
   ```kql
   AzureDiagnostics
   | where ResourceProvider == "MICROSOFT.NETWORK"
   | where Category == "AzureFirewallNetworkRule"
   | where msg_s has "Deny"
   | where msg_s has "10.1."
   | project TimeGenerated, msg_s
   | sort by TimeGenerated desc
   | take 20
   ```

</details>

### Scenario 4: Sentinel analytics rule fires but automation playbook doesn't execute

The brute-force detection rule creates incidents correctly, but the automation rule never triggers the playbook.

<details>
<summary>Show solution</summary>

**Root cause:** The Logic App's managed identity doesn't have the **Microsoft Sentinel Automation Contributor** role on the workspace, which is required to trigger playbooks from automation rules.

**Fix:**
```bash
# Get the Logic App's managed identity
LOGIC_APP_PRINCIPAL=$(az logic workflow show \
  --resource-group $RG_CORE \
  --name "playbook-capstone-brute-force" \
  --query identity.principalId -o tsv)

# If no managed identity, enable one
az logic workflow identity assign \
  --resource-group $RG_CORE \
  --name "playbook-capstone-brute-force" \
  --system-assigned

# Assign Sentinel Automation Contributor role
az role assignment create \
  --assignee $LOGIC_APP_PRINCIPAL \
  --role "Microsoft Sentinel Automation Contributor" \
  --scope $SENTINEL_WS_ID
```

Also verify the automation rule condition matches the incident properties:
```bash
az sentinel automation-rule show \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --automation-rule-id "capstone-auto-brute-force"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "In a hub-spoke network design, what is the correct way to force all spoke traffic through the Azure Firewall in the hub?",
    options: [
      "Create an NSG rule on the spoke subnet that redirects traffic",
      "Configure a User-Defined Route (UDR) on spoke subnets with 0.0.0.0/0 pointing to the firewall's private IP",
      "Enable forced tunneling on the VNet peering configuration",
      "Configure the firewall's DNAT rules to intercept spoke traffic"
    ],
    correctIndex: 1,
    explanation: "A User-Defined Route (UDR) with the default route (0.0.0.0/0) pointing to the Azure Firewall's private IP as the next hop forces all traffic from spoke subnets through the hub firewall for inspection. This is the standard hub-spoke traffic flow pattern."
  },
  {
    question: "What is required for a Logic App playbook to be triggered by a Sentinel automation rule?",
    options: [
      "The Logic App must have a system-assigned managed identity with Security Reader role",
      "The Logic App must use the Microsoft Sentinel incident trigger and have Sentinel Automation Contributor role",
      "The Logic App must be in the same resource group as the Sentinel workspace",
      "The Logic App must have Contributor role on the entire subscription"
    ],
    correctIndex: 1,
    explanation: "A Sentinel playbook requires two things: (1) a Microsoft Sentinel incident trigger in the Logic App definition, and (2) the Logic App's managed identity must have the Microsoft Sentinel Automation Contributor role on the workspace to be invoked by automation rules."
  },
  {
    question: "When configuring PIM with an authentication context requirement, what additional configuration is needed?",
    options: [
      "A Conditional Access policy that targets the authentication context class reference",
      "An Azure RBAC custom role with the authentication context permission",
      "A Key Vault certificate linked to the PIM activation flow",
      "An Entra ID group with the authentication context claim type"
    ],
    correctIndex: 0,
    explanation: "Authentication contexts in PIM work by requiring that the activating user satisfies a Conditional Access policy that targets the specific authentication context class reference (e.g., 'c1'). Without this CA policy, PIM activation fails because the context requirement cannot be evaluated."
  },
  {
    question: "Why does a VM fail to access a Key Vault via private endpoint when the route table forces all traffic through Azure Firewall?",
    options: [
      "Private endpoints are not compatible with Azure Firewall",
      "The firewall needs a network rule allowing traffic to the private endpoint's private IP",
      "Key Vault private endpoints only work with Premium tier firewalls",
      "The VM must have a service endpoint enabled for Key Vault"
    ],
    correctIndex: 1,
    explanation: "When a UDR forces traffic through Azure Firewall, traffic to private endpoint IPs also routes through the firewall. The firewall must have a network rule allowing traffic from the spoke subnet to the private endpoint IP (or the privatelink FQDN) on port 443. Without this rule, the firewall blocks the connection."
  },
  {
    question: "Which Azure Defender for Cloud plan provides full endpoint detection and response (EDR) capabilities via Microsoft Defender for Endpoint integration?",
    options: [
      "Defender for Servers Plan 1",
      "Defender for Servers Plan 2",
      "Defender for Cloud CSPM",
      "Defender for Key Vault"
    ],
    correctIndex: 1,
    explanation: "Defender for Servers Plan 2 includes full EDR capabilities via Microsoft Defender for Endpoint integration, plus vulnerability assessment, just-in-time VM access, file integrity monitoring, and adaptive application controls. Plan 1 provides basic endpoint protection without the full EDR, vulnerability scanning, and JIT features."
  },
  {
    question: "In the API Management AI Gateway policy, what does the azure-openai-token-limit policy do?",
    options: [
      "Validates that the request contains a valid OAuth token",
      "Limits the total number of API calls per time window",
      "Enforces token consumption limits per subscription based on estimated prompt and completion tokens",
      "Encrypts tokens in the request body for security"
    ],
    correctIndex: 2,
    explanation: "The azure-openai-token-limit policy enforces token-based rate limiting specifically for AI/LLM workloads. It estimates prompt tokens from the request, tracks consumption per subscription (or other key), and rejects requests that would exceed the configured tokens-per-minute limit. This is different from call-count rate limiting."
  }
]} />

---

## Cleanup

```bash
# ⚠️ IMPORTANT: Run cleanup promptly to avoid ongoing charges
# Bastion and Azure Firewall incur significant hourly costs

# Delete automation and analytics rules
az sentinel automation-rule delete \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --automation-rule-id "capstone-auto-brute-force" --yes 2>/dev/null

az sentinel alert-rule delete \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --rule-id "capstone-brute-force" --yes 2>/dev/null

az sentinel alert-rule delete \
  --resource-group $RG_CORE \
  --workspace-name $SENTINEL_WORKSPACE \
  --rule-id "capstone-priv-esc" --yes 2>/dev/null

# Delete Logic App
az logic workflow delete \
  --resource-group $RG_CORE \
  --name "playbook-capstone-brute-force" --yes 2>/dev/null

# Delete both resource groups (removes all resources)
az group delete --name $RG_SPOKE --yes --no-wait
az group delete --name $RG_CORE --yes --no-wait

# Remove Conditional Access policies (clean up carefully)
# List policies and delete the ones created in this challenge
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --query "value[?contains(displayName,'Capstone')].{Name:displayName, ID:id}" -o table

# Delete each capstone CA policy by ID
# az rest --method DELETE --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/{policy-id}"

echo "🎉 Capstone cleanup complete! Verify in portal that all resources are deleted."
echo "⚠️  Remember to check: Defender for Cloud pricing tiers may remain enabled."
echo "⚠️  PIM eligible assignments should be removed manually if no longer needed."
```

---

## 🎉 Congratulations!

You've completed the **SC-500 Capstone Challenge** — the grand finale covering all exam domains:

| Domain | Tasks Covered |
|--------|--------------|
| Identity & Access | PIM, Conditional Access, MFA, authentication contexts |
| Data & Storage | Key Vault, private endpoints, disk encryption |
| Compute Security | Trusted Launch, secure boot, vTPM, JIT access |
| Network Security | Hub-spoke, Azure Firewall, NSGs, UDRs, peering |
| Security Posture | Defender for Cloud, CSPM, workload protection |
| Threat Detection | Sentinel, analytics rules, automation playbooks |
| AI Security | API Management, token limits, content safety |

You are now ready to tackle the SC-500 exam with hands-on confidence! 🚀
