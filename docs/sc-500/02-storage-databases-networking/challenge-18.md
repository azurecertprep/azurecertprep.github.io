---
sidebar_position: 18
title: "Challenge 18: Azure Virtual Network Manager"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 18: Azure Virtual Network Manager

## Exam skills covered

- Plan and implement Azure Virtual Network Manager (AVNM) for centralized network governance
- Configure network groups for logical VNet segmentation
- Create and deploy security admin rules that override NSG rules
- Implement connectivity configurations (hub-and-spoke, mesh)
- Deploy configurations to target regions

## Scenario

Contoso Ltd operates a multi-subscription Azure environment with over 50 virtual networks across development, staging, and production environments. The central security team needs to enforce consistent network security policies across all VNets, regardless of individual subscription owners' NSG configurations. They require the ability to block high-risk ports globally, enforce segmentation between environments, and maintain a centralized view of network connectivity. You must implement Azure Virtual Network Manager to establish security admin rules that cannot be overridden by local administrators.

---

## Prerequisites

- Azure subscription with Network Contributor role (ideally on a management group)
- Azure CLI installed and authenticated (`az login`)
- Multiple VNets (or willingness to create them for testing)
- Understanding of Azure networking and NSG concepts

---

## Task 1: Create Azure Virtual Network Manager instance

Deploy an AVNM instance with the appropriate scope and features.

```bash
# Set variables
RG="rg-sc500-avnm"
LOCATION="eastus"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create resource group
az group create --name $RG --location $LOCATION

# Create Azure Virtual Network Manager
az network manager create \
  --name "avnm-contoso-security" \
  --resource-group $RG \
  --location $LOCATION \
  --scope-accesses "SecurityAdmin" "Connectivity" \
  --network-manager-scopes subscriptions="/subscriptions/$SUBSCRIPTION_ID"

# Verify AVNM creation
az network manager show \
  --name "avnm-contoso-security" \
  --resource-group $RG \
  --query "{Name:name, ScopeAccesses:scopeAccesses, Scopes:networkManagerScopes}"
```

---

## Task 2: Create virtual networks and network groups

Create test VNets representing different environments and organize them into network groups.

```bash
# Create VNets representing different environments
az network vnet create \
  --name vnet-prod-web \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.1.0.0/16 \
  --subnet-name snet-default --subnet-prefix 10.1.0.0/24 \
  --tags environment=production tier=web

az network vnet create \
  --name vnet-prod-app \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.2.0.0/16 \
  --subnet-name snet-default --subnet-prefix 10.2.0.0/24 \
  --tags environment=production tier=app

az network vnet create \
  --name vnet-dev-web \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.10.0.0/16 \
  --subnet-name snet-default --subnet-prefix 10.10.0.0/24 \
  --tags environment=development tier=web

az network vnet create \
  --name vnet-dev-app \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.11.0.0/16 \
  --subnet-name snet-default --subnet-prefix 10.11.0.0/24 \
  --tags environment=development tier=app

# Create network group for all production VNets
az network manager group create \
  --name "ng-production" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --description "All production virtual networks"

# Create network group for all development VNets
az network manager group create \
  --name "ng-development" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --description "All development virtual networks"

# Create network group for all VNets (global policies)
az network manager group create \
  --name "ng-all-vnets" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --description "All managed virtual networks"

# Add VNets to network groups (static members)
PROD_WEB_ID=$(az network vnet show --name vnet-prod-web --resource-group $RG --query id -o tsv)
PROD_APP_ID=$(az network vnet show --name vnet-prod-app --resource-group $RG --query id -o tsv)
DEV_WEB_ID=$(az network vnet show --name vnet-dev-web --resource-group $RG --query id -o tsv)
DEV_APP_ID=$(az network vnet show --name vnet-dev-app --resource-group $RG --query id -o tsv)

az network manager group static-member create \
  --name "vnet-prod-web" \
  --network-group-name "ng-production" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --resource-id $PROD_WEB_ID

az network manager group static-member create \
  --name "vnet-prod-app" \
  --network-group-name "ng-production" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --resource-id $PROD_APP_ID

az network manager group static-member create \
  --name "vnet-dev-web" \
  --network-group-name "ng-development" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --resource-id $DEV_WEB_ID

az network manager group static-member create \
  --name "vnet-dev-app" \
  --network-group-name "ng-development" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --resource-id $DEV_APP_ID

# Add all VNets to the global group
for VNET_ID in $PROD_WEB_ID $PROD_APP_ID $DEV_WEB_ID $DEV_APP_ID; do
  MEMBER_NAME=$(echo $VNET_ID | awk -F'/' '{print $NF}')
  az network manager group static-member create \
    --name "$MEMBER_NAME" \
    --network-group-name "ng-all-vnets" \
    --network-manager-name "avnm-contoso-security" \
    --resource-group $RG \
    --resource-id $VNET_ID
done
```

---

## Task 3: Create security admin rules to block high-risk ports

Create a security admin configuration that blocks dangerous ports across all VNets. These rules cannot be overridden by NSGs.

```bash
# Create security admin configuration
az network manager security-admin-config create \
  --name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --description "Block high-risk ports across all VNets"

# Create rule collection for the configuration
az network manager security-admin-config rule-collection create \
  --name "rc-global-deny" \
  --configuration-name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --applies-to-groups "[{\"networkGroupId\":\"$(az network manager group show --name ng-all-vnets --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)\"}]"

# Rule 1: Block RDP from internet
az network manager security-admin-config rule-collection rule create \
  --name "Deny-RDP-Internet" \
  --rule-collection-name "rc-global-deny" \
  --configuration-name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --kind "Custom" \
  --protocol Tcp \
  --direction Inbound \
  --access Deny \
  --priority 100 \
  --source-port-ranges "*" \
  --sources "[{\"addressPrefix\":\"Internet\",\"addressPrefixType\":\"ServiceTag\"}]" \
  --dest-port-ranges "3389" \
  --destinations "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]"

# Rule 2: Block SSH from internet
az network manager security-admin-config rule-collection rule create \
  --name "Deny-SSH-Internet" \
  --rule-collection-name "rc-global-deny" \
  --configuration-name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --kind "Custom" \
  --protocol Tcp \
  --direction Inbound \
  --access Deny \
  --priority 110 \
  --source-port-ranges "*" \
  --sources "[{\"addressPrefix\":\"Internet\",\"addressPrefixType\":\"ServiceTag\"}]" \
  --dest-port-ranges "22" \
  --destinations "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]"

# Rule 3: Block SMB from internet
az network manager security-admin-config rule-collection rule create \
  --name "Deny-SMB-Internet" \
  --rule-collection-name "rc-global-deny" \
  --configuration-name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --kind "Custom" \
  --protocol Tcp \
  --direction Inbound \
  --access Deny \
  --priority 120 \
  --source-port-ranges "*" \
  --sources "[{\"addressPrefix\":\"Internet\",\"addressPrefixType\":\"ServiceTag\"}]" \
  --dest-port-ranges "445" \
  --destinations "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]"

# Rule 4: Block Telnet from anywhere
az network manager security-admin-config rule-collection rule create \
  --name "Deny-Telnet-All" \
  --rule-collection-name "rc-global-deny" \
  --configuration-name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --kind "Custom" \
  --protocol Tcp \
  --direction Inbound \
  --access Deny \
  --priority 130 \
  --source-port-ranges "*" \
  --sources "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]" \
  --dest-port-ranges "23" \
  --destinations "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]"
```

---

## Task 4: Create environment isolation rules

Create security admin rules that prevent communication between production and development environments.

```bash
# Create a separate security admin configuration for environment isolation
az network manager security-admin-config create \
  --name "sac-env-isolation" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --description "Isolate production from development environments"

# Create rule collection targeting production VNets
az network manager security-admin-config rule-collection create \
  --name "rc-prod-isolation" \
  --configuration-name "sac-env-isolation" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --applies-to-groups "[{\"networkGroupId\":\"$(az network manager group show --name ng-production --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)\"}]"

# Deny all traffic from development address ranges to production
az network manager security-admin-config rule-collection rule create \
  --name "Deny-Dev-To-Prod" \
  --rule-collection-name "rc-prod-isolation" \
  --configuration-name "sac-env-isolation" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --kind "Custom" \
  --protocol "*" \
  --direction Inbound \
  --access Deny \
  --priority 100 \
  --source-port-ranges "*" \
  --sources "[{\"addressPrefix\":\"10.10.0.0/15\",\"addressPrefixType\":\"IPPrefix\"}]" \
  --dest-port-ranges "*" \
  --destinations "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]"
```

---

## Task 5: Deploy security configurations

Deploy the security admin configurations to the target regions.

```bash
# Deploy the high-risk port blocking configuration
az network manager post-commit \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --commit-type "SecurityAdmin" \
  --configuration-ids "$(az network manager security-admin-config show --name sac-block-high-risk --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)" \
  --target-locations $LOCATION

# Deploy the environment isolation configuration
az network manager post-commit \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --commit-type "SecurityAdmin" \
  --configuration-ids "$(az network manager security-admin-config show --name sac-env-isolation --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)" \
  --target-locations $LOCATION

# Check deployment status
az network manager list-deploy-status \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --deployment-types "SecurityAdmin" \
  --regions $LOCATION

# Verify the security admin rules are applied to a VNet
az network manager list-effective-security-admin-rules \
  --resource-group $RG \
  --virtual-network-name vnet-prod-web
```

---

## Task 6: Configure connectivity (hub-and-spoke topology)

Create a connectivity configuration for production VNets using hub-and-spoke topology.

```bash
# Create a hub VNet
az network vnet create \
  --name vnet-hub \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-default --subnet-prefix 10.0.0.0/24

HUB_VNET_ID=$(az network vnet show --name vnet-hub --resource-group $RG --query id -o tsv)

# Create connectivity configuration (hub-and-spoke)
az network manager connect-config create \
  --configuration-name "cc-prod-hub-spoke" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --connectivity-topology "HubAndSpoke" \
  --hub "{\"resourceId\":\"$HUB_VNET_ID\",\"resourceType\":\"Microsoft.Network/virtualNetworks\"}" \
  --applies-to-groups "[{\"networkGroupId\":\"$(az network manager group show --name ng-production --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)\",\"useHubGateway\":\"False\",\"isGlobal\":\"False\",\"groupConnectivity\":\"DirectlyConnected\"}]"

# Deploy connectivity configuration
az network manager post-commit \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --commit-type "Connectivity" \
  --configuration-ids "$(az network manager connect-config show --name cc-prod-hub-spoke --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)" \
  --target-locations $LOCATION

# Verify connectivity deployment
az network manager list-deploy-status \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --deployment-types "Connectivity" \
  --regions $LOCATION
```

---

## Break & Fix

### Scenario 1: Security admin rules not appearing on VNets

After deploying the security admin configuration, the rules don't appear when checking effective security rules on VNets in the target region.

<details>
<summary>Show solution</summary>

```bash
# Check if the deployment was successful
az network manager list-deploy-status \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --deployment-types "SecurityAdmin" \
  --regions $LOCATION

# Verify the VNets are actually members of the network group
az network manager group static-member list \
  --network-group-name "ng-all-vnets" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG -o table

# Ensure the region in the deployment matches the VNet location
# Re-deploy if needed
az network manager post-commit \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --commit-type "SecurityAdmin" \
  --configuration-ids "$(az network manager security-admin-config show --name sac-block-high-risk --network-manager-name avnm-contoso-security --resource-group $RG --query id -o tsv)" \
  --target-locations $LOCATION

# Verify effective rules
az network manager list-effective-security-admin-rules \
  --resource-group $RG \
  --virtual-network-name vnet-prod-web
```

</details>

### Scenario 2: Local admin can still allow RDP despite deny rule

A subscription owner added an NSG rule allowing RDP (port 3389) from the internet. Despite the AVNM deny rule, they claim it works.

<details>
<summary>Show solution</summary>

```bash
# Security admin rules with "Deny" action CANNOT be overridden by NSGs.
# If RDP is working, the security admin rule may not be deployed correctly.

# Verify the rule is deployed
az network manager list-effective-security-admin-rules \
  --resource-group $RG \
  --virtual-network-name vnet-prod-web

# Check rule priority and ensure it's not set to "AlwaysAllow"
# (AlwaysAllow can be overridden; Deny and Allow cannot be overridden by NSGs)
az network manager security-admin-config rule-collection rule show \
  --name "Deny-RDP-Internet" \
  --rule-collection-name "rc-global-deny" \
  --configuration-name "sac-block-high-risk" \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --query "{Name:name, Access:access, Direction:direction, DestPorts:destinationPortRanges}"

# If access is "AlwaysAllow" instead of "Deny", update it
# AlwaysAllow means "allow and can be overridden by NSG"
# Deny means "block and cannot be overridden by NSG"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the key difference between Azure Virtual Network Manager security admin rules and NSG rules?",
    options: [
      "Security admin rules are free while NSG rules incur per-rule charges",
      "Security admin rules are evaluated first and can enforce policies that NSGs cannot override",
      "NSG rules support more protocols than security admin rules",
      "Security admin rules only work with peered virtual networks"
    ],
    correctIndex: 1,
    explanation: "Security admin rules are evaluated before NSG rules and can enforce 'Deny' and 'Allow' actions that local NSG rules cannot override. This enables central security teams to enforce organization-wide policies regardless of what individual subscription owners configure in their NSGs."
  },
  {
    question: "Which access type in a security admin rule allows traffic but can still be overridden by a local NSG deny rule?",
    options: [
      "Allow",
      "AlwaysAllow",
      "Deny",
      "Permit"
    ],
    correctIndex: 0,
    explanation: "The 'Allow' access type in security admin rules permits traffic but can still be overridden by local NSG deny rules. The 'AlwaysAllow' access type permits traffic and CANNOT be overridden by NSG rules. Use 'Allow' when you want to set a baseline that local admins can restrict further."
  },
  {
    question: "How are VNets added to network groups in Azure Virtual Network Manager?",
    options: [
      "Only through Azure Policy automatic membership",
      "Only through manual static membership",
      "Through static membership (manual) or dynamic membership (Azure Policy conditions)",
      "Through DNS registration"
    ],
    correctIndex: 2,
    explanation: "Network groups support both static membership (manually adding specific VNet resource IDs) and dynamic membership (using Azure Policy conditions like tags or naming conventions to automatically include matching VNets). Dynamic membership is preferred for large-scale environments."
  }
]} />

## Cleanup

```bash
# Remove deployments first (required before deleting configurations)
az network manager post-commit \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --commit-type "SecurityAdmin" \
  --configuration-ids "[]" \
  --target-locations $LOCATION

az network manager post-commit \
  --network-manager-name "avnm-contoso-security" \
  --resource-group $RG \
  --commit-type "Connectivity" \
  --configuration-ids "[]" \
  --target-locations $LOCATION

# Delete the resource group
az group delete --name $RG --yes --no-wait
```
