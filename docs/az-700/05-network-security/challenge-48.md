---
sidebar_position: 9
title: "Challenge 48: Network segmentation and Just-in-Time access"
sidebar_label: "Challenge 48"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 48: Network segmentation and Just-in-Time access

:::info Estimated time and cost

**75-90 minutes** | **~$0.30/hour** (Bastion Standard + VMs) | **Exam weight: 10-15%**

:::

## Scenario

Your organization is implementing a zero-trust network design. All management access to VMs must be Just-in-Time (JIT) controlled through Microsoft Defender for Cloud, and administrative sessions must traverse Azure Bastion. Azure Virtual Network Manager (AVNM) enforces organization-wide security admin rules that cannot be overridden by local NSG administrators -- ensuring a deny-by-default posture across all network groups.

You must demonstrate that:
- Direct SSH/RDP access to VMs is denied by default
- AVNM security admin rules take precedence over local NSGs
- JIT access enables temporary, audited management access
- Bastion provides the only path for interactive VM administration

---

## Architecture overview

```text
   +--------------------------------------------------+
   |         Azure Virtual Network Manager             |
   |  (Security Admin Rules - deny by default)         |
   +--------------------------------------------------+
                          |
          +---------------+----------------+
          |                                |
   +------+------+                  +------+------+
   | Network     |                  | Network     |
   | Group: Prod |                  | Group: Dev  |
   | (tag-based) |                  | (tag-based) |
   +------+------+                  +------+------+
          |                                |
   +------+------+                  +------+------+
   | VNet-Prod   |                  | VNet-Dev    |
   | 10.1.0.0/16 |                  | 10.2.0.0/16 |
   +------+------+                  +------+------+
          |                                |
   [Bastion + JIT]                  [Bastion + JIT]
```

---

## Task 1: Deploy Azure Virtual Network Manager

### Azure CLI

```bash
# Variables
RG="rg-avnm-lab"
LOCATION="eastus"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create resource group
az group create --name $RG --location $LOCATION

# Create Azure Virtual Network Manager
az network manager create \
  --name "avnm-enterprise" \
  --resource-group $RG \
  --location $LOCATION \
  --description "Enterprise network security manager" \
  --scope-accesses "SecurityAdmin" \
  --network-manager-scopes subscriptions=$SUBSCRIPTION_ID

# Create VNets for the lab
az network vnet create \
  --resource-group $RG \
  --name vnet-prod \
  --address-prefixes 10.1.0.0/16 \
  --subnet-name workload-subnet \
  --subnet-prefixes 10.1.1.0/24 \
  --location $LOCATION \
  --tags Environment=Production

az network vnet create \
  --resource-group $RG \
  --name vnet-dev \
  --address-prefixes 10.2.0.0/16 \
  --subnet-name workload-subnet \
  --subnet-prefixes 10.2.1.0/24 \
  --location $LOCATION \
  --tags Environment=Development

# Create AzureBastionSubnet in prod VNet
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-prod \
  --name AzureBastionSubnet \
  --address-prefixes 10.1.254.0/26
```

### Azure PowerShell

```powershell
$rg = "rg-avnm-lab"
$location = "eastus"
$subscriptionId = (Get-AzContext).Subscription.Id

New-AzResourceGroup -Name $rg -Location $location

# Create AVNM
$scope = New-AzNetworkManagerScope -Subscription @($subscriptionId)

New-AzNetworkManager -Name "avnm-enterprise" -ResourceGroupName $rg `
  -Location $location -Description "Enterprise network security manager" `
  -NetworkManagerScope $scope -NetworkManagerScopeAccess @("SecurityAdmin")

# Create VNets
$prodSub = New-AzVirtualNetworkSubnetConfig -Name "workload-subnet" -AddressPrefix "10.1.1.0/24"
$bastionSub = New-AzVirtualNetworkSubnetConfig -Name "AzureBastionSubnet" -AddressPrefix "10.1.254.0/26"
$prodVnet = New-AzVirtualNetwork -Name "vnet-prod" -ResourceGroupName $rg `
  -Location $location -AddressPrefix "10.1.0.0/16" `
  -Subnet $prodSub, $bastionSub -Tag @{Environment="Production"}

$devSub = New-AzVirtualNetworkSubnetConfig -Name "workload-subnet" -AddressPrefix "10.2.1.0/24"
$devVnet = New-AzVirtualNetwork -Name "vnet-dev" -ResourceGroupName $rg `
  -Location $location -AddressPrefix "10.2.0.0/16" `
  -Subnet $devSub -Tag @{Environment="Development"}
```

---

## Task 2: Create network groups with dynamic membership

### Azure CLI

```bash
# Create network group for production VNets (dynamic membership by tag)
az network manager group create \
  --name "ng-production" \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --description "All production VNets"

# Create network group for development VNets
az network manager group create \
  --name "ng-development" \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --description "All development VNets"

# Add static members (alternatively use Azure Policy for dynamic membership)
PROD_VNET_ID=$(az network vnet show --resource-group $RG --name vnet-prod --query id -o tsv)
DEV_VNET_ID=$(az network vnet show --resource-group $RG --name vnet-dev --query id -o tsv)

az network manager group static-member create \
  --network-group-name "ng-production" \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --name "vnet-prod-member" \
  --resource-id $PROD_VNET_ID

az network manager group static-member create \
  --network-group-name "ng-development" \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --name "vnet-dev-member" \
  --resource-id $DEV_VNET_ID
```

:::tip Dynamic membership via Azure Policy

For production deployments, use Azure Policy-based dynamic membership. VNets matching a condition (such as a tag) are automatically added to the network group:

```json
{
  "if": {
    "allOf": [
      { "field": "type", "equals": "Microsoft.Network/virtualNetworks" },
      { "field": "tags['Environment']", "equals": "Production" }
    ]
  },
  "then": { "effect": "addToNetworkGroup" }
}
```

:::

---

## Task 3: Configure security admin rules (deny-by-default)

:::warning Critical exam concept

AVNM security admin rules are evaluated **before** NSG rules. The evaluation order is:

1. AVNM security admin rules (AlwaysAllow > Deny > Allow)
2. NSG rules

A **Deny** rule in AVNM cannot be overridden by an NSG Allow rule. An **AlwaysAllow** rule in AVNM bypasses both security admin Deny rules and NSG rules.

:::

### Azure CLI

```bash
# Create security admin configuration
az network manager security-admin-config create \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --name "config-deny-default" \
  --description "Deny all inbound by default"

# Get network group ID for applies-to-groups
NG_PROD_ID=$(az network manager group show \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --name "ng-production" \
  --query id -o tsv)

# Create rule collection
az network manager security-admin-config rule-collection create \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --config-name "config-deny-default" \
  --name "rc-deny-inbound" \
  --applies-to-groups network-group-id=$NG_PROD_ID \
  --description "Deny all inbound management traffic"

# Rule: Deny all inbound SSH from internet
az network manager security-admin-config rule-collection rule create \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --config-name "config-deny-default" \
  --rule-collection-name "rc-deny-inbound" \
  --name "deny-ssh-inbound" \
  --access Deny \
  --direction Inbound \
  --priority 100 \
  --protocol Tcp \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges 22

# Rule: Deny all inbound RDP from internet
az network manager security-admin-config rule-collection rule create \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --config-name "config-deny-default" \
  --rule-collection-name "rc-deny-inbound" \
  --name "deny-rdp-inbound" \
  --access Deny \
  --direction Inbound \
  --priority 110 \
  --protocol Tcp \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges 3389

# Rule: AlwaysAllow Bastion traffic (cannot be blocked by other rules)
az network manager security-admin-config rule-collection rule create \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --config-name "config-deny-default" \
  --rule-collection-name "rc-deny-inbound" \
  --name "always-allow-bastion" \
  --access AlwaysAllow \
  --direction Inbound \
  --priority 50 \
  --protocol Tcp \
  --source-address-prefixes "10.1.254.0/26" \
  --destination-address-prefixes "*" \
  --destination-port-ranges 22 3389

# Commit the configuration to apply it
az network manager post-commit \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --target-locations $LOCATION \
  --configuration-ids "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Network/networkManagers/avnm-enterprise/securityAdminConfigurations/config-deny-default" \
  --commit-type "SecurityAdmin"
```

### Azure PowerShell

```powershell
# Create security admin configuration
$config = New-AzNetworkManagerSecurityAdminConfiguration `
  -NetworkManagerName "avnm-enterprise" -ResourceGroupName $rg `
  -Name "config-deny-default" -Description "Deny all inbound by default"

# Create rule collection
$ngProd = Get-AzNetworkManagerGroup -NetworkManagerName "avnm-enterprise" `
  -ResourceGroupName $rg -Name "ng-production"

$appliesToGroup = New-AzNetworkManagerSecurityGroupItem -NetworkGroupId $ngProd.Id

New-AzNetworkManagerSecurityAdminRuleCollection `
  -NetworkManagerName "avnm-enterprise" -ResourceGroupName $rg `
  -SecurityAdminConfigurationName "config-deny-default" `
  -Name "rc-deny-inbound" -AppliesToGroup $appliesToGroup

# Create deny SSH rule
New-AzNetworkManagerSecurityAdminRule `
  -NetworkManagerName "avnm-enterprise" -ResourceGroupName $rg `
  -SecurityAdminConfigurationName "config-deny-default" `
  -RuleCollectionName "rc-deny-inbound" `
  -Name "deny-ssh-inbound" -Access "Deny" -Direction "Inbound" `
  -Priority 100 -Protocol "Tcp" `
  -SourceAddressPrefix "*" -DestinationAddressPrefix "*" `
  -DestinationPortRange "22"
```

### Portal steps

1. Navigate to **Network Manager** and select your AVNM instance.
2. Under **Settings**, select **Security admin configurations** and click **Create**.
3. Add a rule collection targeting the production network group.
4. Create rules: Deny SSH (port 22) and RDP (port 3389) inbound from any source.
5. Create an AlwaysAllow rule for the Bastion subnet source to ports 22 and 3389.
6. Deploy the configuration to the target region.

---

## Task 4: Deploy Azure Bastion (Standard SKU)

### Azure CLI

```bash
# Create public IP for Bastion
az network public-ip create \
  --resource-group $RG \
  --name pip-bastion \
  --sku Standard \
  --allocation-method Static \
  --location $LOCATION

# Deploy Azure Bastion with Standard SKU and native client support
az network bastion create \
  --resource-group $RG \
  --name bastion-prod \
  --vnet-name vnet-prod \
  --public-ip-address pip-bastion \
  --sku Standard \
  --enable-tunneling true \
  --location $LOCATION
```

:::tip Bastion SKU comparison

| Feature | Basic | Standard |
|---------|-------|----------|
| Connect via portal (SSH/RDP) | Yes | Yes |
| Native client support (az network bastion ssh/rdp) | No | Yes |
| File transfer | No | Yes |
| Shareable link | No | Yes |
| Host scaling (2-50 instances) | No | Yes |
| IP-based connection | No | Yes |

The Standard SKU with `--enable-tunneling true` is required for native client connectivity via the Azure CLI.

:::

### Connect via native client

```bash
# Connect to a Linux VM through Bastion using native SSH client
az network bastion ssh \
  --resource-group $RG \
  --name bastion-prod \
  --target-resource-id "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Compute/virtualMachines/vm-prod1" \
  --auth-type ssh-key \
  --username azureuser \
  --ssh-key ~/.ssh/id_rsa
```

### Azure PowerShell

```powershell
$pip = New-AzPublicIpAddress -Name "pip-bastion" -ResourceGroupName $rg `
  -Location $location -Sku Standard -AllocationMethod Static

New-AzBastion -Name "bastion-prod" -ResourceGroupName $rg `
  -VirtualNetworkId $prodVnet.Id -PublicIpAddressId $pip.Id `
  -Sku "Standard" -EnableTunneling $true
```

---

## Task 5: Configure Just-in-Time VM access

:::info Prerequisites

JIT VM access requires **Microsoft Defender for Servers Plan 2** (or Defender for Cloud enhanced security). The VM must have an NSG associated with its subnet or NIC.

:::

### Deploy a target VM

```bash
# Create a VM in the production VNet
az vm create \
  --resource-group $RG \
  --name vm-prod1 \
  --image Ubuntu2404 \
  --size Standard_B2s \
  --vnet-name vnet-prod \
  --subnet workload-subnet \
  --admin-username azureuser \
  --generate-ssh-keys \
  --nsg "" \
  --public-ip-address ""

# Create and associate an NSG (required for JIT)
az network nsg create \
  --resource-group $RG \
  --name nsg-prod-workload \
  --location $LOCATION

az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-prod \
  --name workload-subnet \
  --network-security-group nsg-prod-workload
```

### Configure JIT policy via REST API

The Azure CLI does not provide a direct command to create JIT policies. Use `az rest` to call the Defender for Cloud API:

```bash
# Create JIT access policy
az rest --method put \
  --uri "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Security/locations/$LOCATION/jitNetworkAccessPolicies/default?api-version=2020-01-01" \
  --body '{
    "properties": {
      "virtualMachines": [
        {
          "id": "/subscriptions/'$SUBSCRIPTION_ID'/resourceGroups/'$RG'/providers/Microsoft.Compute/virtualMachines/vm-prod1",
          "ports": [
            {
              "number": 22,
              "protocol": "TCP",
              "allowedSourceAddressPrefix": "*",
              "maxRequestAccessDuration": "PT3H"
            },
            {
              "number": 3389,
              "protocol": "TCP",
              "allowedSourceAddressPrefix": "*",
              "maxRequestAccessDuration": "PT3H"
            }
          ]
        }
      ]
    },
    "kind": "Basic"
  }'
```

### Request JIT access

```bash
# Initiate a JIT access request (opens port 22 for 1 hour)
MY_IP=$(curl -s https://ifconfig.me)

az rest --method post \
  --uri "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Security/locations/$LOCATION/jitNetworkAccessPolicies/default/initiate?api-version=2020-01-01" \
  --body '{
    "virtualMachines": [
      {
        "id": "/subscriptions/'$SUBSCRIPTION_ID'/resourceGroups/'$RG'/providers/Microsoft.Compute/virtualMachines/vm-prod1",
        "ports": [
          {
            "number": 22,
            "allowedSourceAddressPrefix": "'$MY_IP'",
            "duration": "PT1H"
          }
        ]
      }
    ],
    "justification": "Routine maintenance - applying security patches"
  }'
```

### List JIT policies

```bash
# List existing JIT policies
az security jit-policy list \
  --location $LOCATION \
  --resource-group $RG
```

### Portal steps

1. Navigate to **Microsoft Defender for Cloud** and then select **Workload protections**.
2. Select **Just-in-time VM access** from the left menu.
3. Click on the VM to configure and select **Enable JIT**.
4. Configure ports (22, 3389), maximum request duration (3 hours), and allowed source IPs.
5. To request access: select the VM, click **Request access**, specify justification and duration.

---

## Task 6: Validate the zero-trust design

### Verify AVNM blocks direct access

```bash
# Deploy a test VM with a public IP to verify AVNM enforcement
az vm create \
  --resource-group $RG \
  --name vm-test \
  --image Ubuntu2404 \
  --size Standard_B1s \
  --vnet-name vnet-prod \
  --subnet workload-subnet \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address pip-vm-test

# Attempt direct SSH (should fail due to AVNM deny rule)
ssh azureuser@$(az network public-ip show --resource-group $RG --name pip-vm-test --query ipAddress -o tsv)
# Expected: Connection timed out

# Verify the AVNM rule is enforced (even if NSG allows SSH)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-prod-workload \
  --name allow-ssh-test \
  --priority 100 \
  --direction Inbound \
  --source-address-prefixes "*" \
  --destination-port-ranges 22 \
  --protocol Tcp \
  --access Allow

# Attempt SSH again (should STILL fail - AVNM deny overrides NSG allow)
ssh azureuser@$(az network public-ip show --resource-group $RG --name pip-vm-test --query ipAddress -o tsv)
# Expected: Connection timed out
```

### Verify Bastion connectivity

```bash
# Connect via Bastion native client (should succeed due to AlwaysAllow rule)
az network bastion ssh \
  --resource-group $RG \
  --name bastion-prod \
  --target-resource-id "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Compute/virtualMachines/vm-prod1" \
  --auth-type ssh-key \
  --username azureuser \
  --ssh-key ~/.ssh/id_rsa
```

---

## Break & fix

### Scenario 1: AVNM security admin rule blocks Bastion

**Symptom:** Azure Bastion cannot connect to VMs even though the Bastion deployment is successful.

**Root cause:** The AVNM deny rule blocks all inbound SSH/RDP traffic including traffic from the AzureBastionSubnet. No AlwaysAllow exception was created for the Bastion source prefix.

**Diagnosis:**

```bash
# Check effective security admin rules
az network manager list-effective-security-admin-rules \
  --resource-group $RG \
  --vnet-name vnet-prod

# Verify Bastion subnet prefix
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name vnet-prod \
  --name AzureBastionSubnet \
  --query addressPrefix -o tsv
```

**Fix:** Add an AlwaysAllow rule with the Bastion subnet as the source:

```bash
az network manager security-admin-config rule-collection rule create \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --config-name "config-deny-default" \
  --rule-collection-name "rc-deny-inbound" \
  --name "always-allow-bastion" \
  --access AlwaysAllow \
  --direction Inbound \
  --priority 50 \
  --protocol Tcp \
  --source-address-prefixes "10.1.254.0/26" \
  --destination-address-prefixes "*" \
  --destination-port-ranges 22 3389

# Commit the updated configuration
az network manager post-commit \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --target-locations $LOCATION \
  --configuration-ids "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Network/networkManagers/avnm-enterprise/securityAdminConfigurations/config-deny-default" \
  --commit-type "SecurityAdmin"
```

---

### Scenario 2: JIT request failing

**Symptom:** JIT access requests return an error or the JIT option is not available for the VM.

**Root cause:** Microsoft Defender for Servers (Plan 2) is not enabled on the subscription, or the VM does not have an NSG associated.

**Diagnosis:**

```bash
# Check Defender for Cloud pricing tier
az security pricing show --name VirtualMachines --query pricingTier -o tsv
# Should return "Standard" for JIT to work

# Verify NSG is associated with the VM's subnet or NIC
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name vnet-prod \
  --name workload-subnet \
  --query networkSecurityGroup.id -o tsv
```

**Fix:**

```bash
# Enable Defender for Servers (if not enabled)
az security pricing create --name VirtualMachines --tier Standard

# Ensure NSG is associated
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-prod \
  --name workload-subnet \
  --network-security-group nsg-prod-workload
```

---

### Scenario 3: Bastion native client not working

**Symptom:** The `az network bastion ssh` command fails with an error about unsupported features.

**Root cause:** Bastion was deployed with Basic SKU (tunneling/native client requires Standard SKU), or the `--enable-tunneling` flag was not set.

**Diagnosis:**

```bash
# Check Bastion SKU and tunneling status
az network bastion show \
  --resource-group $RG \
  --name bastion-prod \
  --query "{sku: sku.name, tunneling: enableTunneling}"
```

**Fix:**

```bash
# Upgrade Bastion to Standard SKU with tunneling
az network bastion update \
  --resource-group $RG \
  --name bastion-prod \
  --sku Standard \
  --enable-tunneling true
```

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-48-q1",
    question: "How do AVNM security admin rules interact with NSG rules?",
    options: [
      "NSG rules are evaluated first, then AVNM rules override conflicts",
      "AVNM security admin rules are evaluated BEFORE NSG rules and take precedence ✅",
      "AVNM rules and NSG rules are merged and the lowest priority number wins",
      "AVNM rules only apply when no NSG is associated with the subnet"
    ],
    correctIndex: 1,
    explanation: "AVNM security admin rules are evaluated before NSG rules. A Deny rule in AVNM cannot be overridden by an Allow rule in an NSG. This allows central security teams to enforce organization-wide policies that subnet owners cannot circumvent."
  },
  {
    id: "az700-48-q2",
    question: "What is required for Just-in-Time VM access to function?",
    options: [
      "Azure Firewall Premium and a public IP on the VM",
      "Microsoft Defender for Servers (Plan 2) and an NSG associated with the VM ✅",
      "Azure Bastion Standard SKU and a network security perimeter",
      "Azure Virtual Network Manager and a security admin configuration"
    ],
    correctIndex: 1,
    explanation: "JIT VM access requires Microsoft Defender for Servers Plan 2 (part of Defender for Cloud enhanced security). The VM must also have an NSG associated with its subnet or NIC, because JIT works by dynamically adding and removing NSG rules."
  },
  {
    id: "az700-48-q3",
    question: "Which Azure Bastion SKU supports native client connectivity (az network bastion ssh)?",
    options: [
      "Basic SKU",
      "Standard SKU with tunneling enabled ✅",
      "Developer SKU",
      "Any SKU with a public IP"
    ],
    correctIndex: 1,
    explanation: "Native client support (allowing az network bastion ssh and az network bastion rdp commands) requires the Standard SKU with the enable-tunneling feature turned on. The Basic SKU only supports browser-based connections through the Azure portal."
  },
  {
    id: "az700-48-q4",
    question: "What are the three access actions available in AVNM security admin rules?",
    options: [
      "Allow, Deny, Drop",
      "Permit, Block, Override",
      "Allow, Deny, AlwaysAllow ✅",
      "Accept, Reject, Force"
    ],
    correctIndex: 2,
    explanation: "AVNM security admin rules support three actions: Allow (permits traffic but can be overridden by NSG deny), Deny (blocks traffic and cannot be overridden by NSG allow), and AlwaysAllow (permits traffic bypassing both admin deny rules and NSG rules)."
  },
  {
    id: "az700-48-q5",
    question: "You created an AVNM security admin rule that denies all inbound traffic. Azure Bastion can no longer connect to VMs. What should you do?",
    options: [
      "Add an NSG allow rule for the Bastion subnet - it will override the AVNM deny",
      "Remove the AVNM deny rule entirely",
      "Add an AlwaysAllow rule with a lower priority number for traffic from the AzureBastionSubnet ✅",
      "Redeploy Bastion in a different VNet not managed by AVNM"
    ],
    correctIndex: 2,
    explanation: "An AlwaysAllow rule with a lower priority number (evaluated first) will permit Bastion traffic regardless of other deny rules. NSG allow rules cannot override AVNM deny rules. The AlwaysAllow action is specifically designed for this use case -- exempting critical infrastructure traffic."
  },
  {
    id: "az700-48-q6",
    question: "How can you define dynamic membership for an AVNM network group?",
    options: [
      "Using Azure Policy with conditional expressions that match VNet properties like tags ✅",
      "Using NSG flow logs to automatically detect VNet communication patterns",
      "Using Azure Monitor alerts to add VNets when traffic thresholds are met",
      "Using ARM template deployments with linked resource IDs"
    ],
    correctIndex: 0,
    explanation: "AVNM supports dynamic membership through Azure Policy. You define a policy condition (such as matching a specific tag like Environment=Production) and VNets that match the condition are automatically added to the network group. This eliminates manual membership management as new VNets are deployed."
  }
]} />

---

## Cleanup

```bash
az group delete --name $RG --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-avnm-lab" -Force -AsJob
```

---

:::danger Cost warning

This lab deploys Azure Bastion (Standard SKU) which costs approximately **$0.25/hour** plus VMs. Delete the resource group immediately after completing the lab. Additionally, disable Defender for Servers if you enabled it only for this lab to avoid ongoing charges (~$15/server/month).

:::
