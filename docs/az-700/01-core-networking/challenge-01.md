---
sidebar_position: 1
title: "Challenge 01: Enterprise VNet Design & IP Planning"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 01: Enterprise VNet design & IP planning

:::info Estimated time and cost
**60-90 minutes** | **~$0.05** (VNets and IPs are nearly free) | **Exam weight: 25-30%**
:::

## Scenario

Contoso Financial Services is migrating workloads to Azure. The network team must design a hub-spoke topology across two regions with non-overlapping address spaces. The hub VNet hosts shared services (Azure Firewall, VPN Gateway, Azure Bastion), while spoke VNets isolate production and dev/test workloads. Contoso also has an on-premises datacenter using 192.168.0.0/16 that must never overlap with Azure address space.

Your job is to plan the IP address scheme, create the VNets with correctly sized subnets, create a public IP prefix for predictable outbound IPs, and allocate individual public IPs from that prefix.

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Plan and implement network segmentation and address spaces | High |
| Create a virtual network (VNet) | High |
| Create a prefix for public IP addresses | Medium |
| Choose when to use a public IP address prefix | Medium |
| Plan and implement a custom public IP address prefix (BYOIP) | Low |
| Create a public IP address | High |
| Associate public IP addresses to resources | Medium |

## Prerequisites

- Prerequisite: Familiarity with AZ-104 Challenge 11 (Virtual Networks and Subnets)
- Azure subscription with Contributor role
- Azure CLI 2.60+ or Azure PowerShell Az 12.0+
- Basic understanding of CIDR notation and subnetting

## Task 1: Design and create the hub VNet

Contoso's hub VNet carries shared infrastructure. Each subnet has minimum size requirements enforced by Azure:

| Subnet | Purpose | Minimum size | Our allocation |
|--------|---------|--------------|----------------|
| GatewaySubnet | VPN/ExpressRoute gateway | /27 | 10.0.0.0/27 (32 IPs) |
| AzureFirewallSubnet | Azure Firewall | /26 | 10.0.1.0/26 (64 IPs) |
| AzureBastionSubnet | Azure Bastion | /26 | 10.0.2.0/26 (64 IPs) |
| SharedServicesSubnet | DNS, domain controllers | /24 | 10.0.10.0/24 (256 IPs) |

:::warning Subnet naming rules
`GatewaySubnet`, `AzureFirewallSubnet`, and `AzureBastionSubnet` are reserved names. Azure will reject gateway, firewall, or bastion deployments if the subnet uses a different name.
:::

### Azure CLI

```bash
# Set variables
RG="rg-contoso-networking"
LOCATION="eastus2"

# Create resource group
az group create --name $RG --location $LOCATION

# Create the hub VNet with the GatewaySubnet
az network vnet create \
  --resource-group $RG \
  --name vnet-hub-eastus2 \
  --location $LOCATION \
  --address-prefixes 10.0.0.0/16 \
  --subnet-name GatewaySubnet \
  --subnet-prefixes 10.0.0.0/27

# Add AzureFirewallSubnet
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus2 \
  --name AzureFirewallSubnet \
  --address-prefixes 10.0.1.0/26

# Add AzureBastionSubnet
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus2 \
  --name AzureBastionSubnet \
  --address-prefixes 10.0.2.0/26

# Add SharedServicesSubnet
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus2 \
  --name SharedServicesSubnet \
  --address-prefixes 10.0.10.0/24
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-contoso-networking"
$location = "eastus2"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Define subnet configurations
$gatewaySubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "GatewaySubnet" `
  -AddressPrefix "10.0.0.0/27"

$firewallSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "AzureFirewallSubnet" `
  -AddressPrefix "10.0.1.0/26"

$bastionSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "AzureBastionSubnet" `
  -AddressPrefix "10.0.2.0/26"

$sharedSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "SharedServicesSubnet" `
  -AddressPrefix "10.0.10.0/24"

# Create the hub VNet with all subnets
New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-hub-eastus2" `
  -Location $location `
  -AddressPrefix "10.0.0.0/16" `
  -Subnet $gatewaySubnet, $firewallSubnet, $bastionSubnet, $sharedSubnet
```

### Portal steps

1. Navigate to **Virtual networks** > **Create**.
2. Set Resource group to `rg-contoso-networking`, Name to `vnet-hub-eastus2`, Region to **East US 2**.
3. On the **IP Addresses** tab, set address space to `10.0.0.0/16`.
4. Add each subnet with the names and prefixes from the table above.
5. Select **Review + create** > **Create**.

## Task 2: Create spoke VNets

The spoke VNets isolate workloads from each other and from the hub. Each spoke uses a separate /16 block to allow growth.

### Azure CLI

```bash
# Spoke 1: Production workloads
az network vnet create \
  --resource-group $RG \
  --name vnet-spoke-prod-eastus2 \
  --location $LOCATION \
  --address-prefixes 10.1.0.0/16 \
  --subnet-name snet-web \
  --subnet-prefixes 10.1.1.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-spoke-prod-eastus2 \
  --name snet-app \
  --address-prefixes 10.1.2.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-spoke-prod-eastus2 \
  --name snet-data \
  --address-prefixes 10.1.3.0/24

# Spoke 2: Dev/Test workloads
az network vnet create \
  --resource-group $RG \
  --name vnet-spoke-dev-eastus2 \
  --location $LOCATION \
  --address-prefixes 10.2.0.0/16 \
  --subnet-name snet-dev-web \
  --subnet-prefixes 10.2.1.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-spoke-dev-eastus2 \
  --name snet-dev-app \
  --address-prefixes 10.2.2.0/24
```

### Azure PowerShell

```powershell
# Spoke 1: Production
$webSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-web" -AddressPrefix "10.1.1.0/24"
$appSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-app" -AddressPrefix "10.1.2.0/24"
$dataSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-data" -AddressPrefix "10.1.3.0/24"

New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-spoke-prod-eastus2" `
  -Location $location `
  -AddressPrefix "10.1.0.0/16" `
  -Subnet $webSubnet, $appSubnet, $dataSubnet

# Spoke 2: Dev/Test
$devWebSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-dev-web" -AddressPrefix "10.2.1.0/24"
$devAppSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-dev-app" -AddressPrefix "10.2.2.0/24"

New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-spoke-dev-eastus2" `
  -Location $location `
  -AddressPrefix "10.2.0.0/16" `
  -Subnet $devWebSubnet, $devAppSubnet
```

## Task 3: Create a public IP prefix and allocate addresses

A public IP prefix reserves a contiguous block of public IP addresses. This gives Contoso predictable outbound IPs for firewall allow-listing by partners. A /28 prefix provides 16 addresses.

:::tip When to use a public IP prefix
Use a public IP prefix when you need predictable, contiguous IP addresses for firewall rules, partner allow-lists, or compliance requirements. All IPs from a prefix share the same allocation and zone properties.
:::

### Azure CLI

```bash
# Create a zone-redundant public IP prefix (/28 = 16 IPs)
az network public-ip prefix create \
  --resource-group $RG \
  --name pip-prefix-contoso-eastus2 \
  --location $LOCATION \
  --length 28 \
  --sku Standard \
  --version IPv4 \
  --zone 1 2 3

# Allocate a public IP from the prefix (for firewall)
az network public-ip create \
  --resource-group $RG \
  --name pip-fw-contoso-01 \
  --sku Standard \
  --allocation-method Static \
  --version IPv4 \
  --zone 1 2 3 \
  --public-ip-prefix pip-prefix-contoso-eastus2

# Allocate a second public IP from the prefix (for VPN gateway)
az network public-ip create \
  --resource-group $RG \
  --name pip-vpngw-contoso-01 \
  --sku Standard \
  --allocation-method Static \
  --version IPv4 \
  --zone 1 2 3 \
  --public-ip-prefix pip-prefix-contoso-eastus2

# Verify the prefix and its allocated IPs
az network public-ip prefix show \
  --resource-group $RG \
  --name pip-prefix-contoso-eastus2 \
  --query "{name:name, prefix:ipPrefix, publicIPs:publicIpAddresses[].id}" \
  --output table
```

### Azure PowerShell

```powershell
# Create a zone-redundant public IP prefix
$prefix = New-AzPublicIpPrefix `
  -ResourceGroupName $rg `
  -Name "pip-prefix-contoso-eastus2" `
  -Location $location `
  -PrefixLength 28 `
  -Sku "Standard" `
  -IpAddressVersion "IPv4" `
  -Zone 1, 2, 3

# Allocate a public IP from the prefix
New-AzPublicIpAddress `
  -ResourceGroupName $rg `
  -Name "pip-fw-contoso-01" `
  -Location $location `
  -Sku "Standard" `
  -AllocationMethod "Static" `
  -IpAddressVersion "IPv4" `
  -Zone 1, 2, 3 `
  -PublicIpPrefix $prefix

# Allocate a second public IP from the prefix
New-AzPublicIpAddress `
  -ResourceGroupName $rg `
  -Name "pip-vpngw-contoso-01" `
  -Location $location `
  -Sku "Standard" `
  -AllocationMethod "Static" `
  -IpAddressVersion "IPv4" `
  -Zone 1, 2, 3 `
  -PublicIpPrefix $prefix
```

## Task 4: Understand custom public IP prefix (BYOIP)

Contoso owns the registered range 203.0.113.0/24 and wants to bring it to Azure. This uses the Custom IP Prefix (BYOIP) feature. The process has three phases: validation, provisioning, and commissioning.

:::note Exam awareness
The exam tests your understanding of BYOIP concepts and the `az network custom-ip prefix` command group. You do not need to execute this with a real IP range. Study the workflow and parameters.
:::

The CLI command to create a custom IP prefix is:

```bash
# Conceptual only - requires a registered IP range you own
az network custom-ip prefix create \
  --resource-group $RG \
  --name customprefix-contoso \
  --location $LOCATION \
  --cidr "203.0.113.0/24" \
  --authorization-message "<signed-message>" \
  --signed-message "<RSA-signed-authorization>" \
  --zone 1 2 3

# After provisioning, derive a public IP prefix from the custom prefix
az network public-ip prefix create \
  --resource-group $RG \
  --name pip-prefix-byoip \
  --location $LOCATION \
  --length 28 \
  --custom-ip-prefix-name customprefix-contoso

# Commission the prefix to start advertising via Microsoft WAN
az network custom-ip prefix update \
  --resource-group $RG \
  --name customprefix-contoso \
  --state Commission
```

Key points for the exam:
- You must own and register the range with a Regional Internet Registry (ARIN, RIPE, etc.)
- A Route Origin Authorization (ROA) must be created to authorize Microsoft ASN 8075
- The minimum prefix size for BYOIP is /24 for IPv4
- Only Standard SKU public IPs can be derived from a custom prefix
- The custom prefix must be in **Provisioned** or **Commissioned** state before deriving public IP prefixes

## Task 5: Associate a public IP to a resource

Create a test NIC and associate a public IP to verify the allocation works. This simulates attaching a public IP to a VM for direct inbound access.

### Azure CLI

```bash
# Create a NIC in the production spoke web subnet
az network nic create \
  --resource-group $RG \
  --name nic-test-web-01 \
  --vnet-name vnet-spoke-prod-eastus2 \
  --subnet snet-web \
  --public-ip-address pip-fw-contoso-01 \
  --location $LOCATION

# Verify the public IP association
az network nic show \
  --resource-group $RG \
  --name nic-test-web-01 \
  --query "ipConfigurations[0].publicIpAddress.id" \
  --output tsv

# View the allocated public IP address value
az network public-ip show \
  --resource-group $RG \
  --name pip-fw-contoso-01 \
  --query "{name:name, ip:ipAddress, prefix:publicIpPrefix.id}" \
  --output table
```

### Azure PowerShell

```powershell
# Get the subnet reference
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-spoke-prod-eastus2"
$subnet = Get-AzVirtualNetworkSubnetConfig -VirtualNetwork $vnet -Name "snet-web"
$pip = Get-AzPublicIpAddress -ResourceGroupName $rg -Name "pip-fw-contoso-01"

# Create a NIC with the public IP
$ipConfig = New-AzNetworkInterfaceIpConfig `
  -Name "ipconfig1" `
  -SubnetId $subnet.Id `
  -PublicIpAddressId $pip.Id

New-AzNetworkInterface `
  -ResourceGroupName $rg `
  -Name "nic-test-web-01" `
  -Location $location `
  -IpConfiguration $ipConfig

# Verify association
Get-AzNetworkInterface -ResourceGroupName $rg -Name "nic-test-web-01" |
  Select-Object -ExpandProperty IpConfigurations |
  Select-Object Name, @{N='PublicIP';E={$_.PublicIpAddress.Id}}
```

## Task 6: Verify address space planning and identify overlaps

Verify the complete address plan and confirm there are no overlaps between VNets or with on-premises (192.168.0.0/16).

### Azure CLI

```bash
# List all VNets and their address spaces
az network vnet list \
  --resource-group $RG \
  --query "[].{Name:name, AddressSpace:addressSpace.addressPrefixes[0], Subnets:subnets[].{name:name, prefix:addressPrefix}}" \
  --output json

# Show detailed subnet configuration for the hub
az network vnet show \
  --resource-group $RG \
  --name vnet-hub-eastus2 \
  --query "{name:name, addressSpace:addressSpace.addressPrefixes, subnets:subnets[].{name:name, prefix:addressPrefix}}" \
  --output json

# List all public IPs and their assignments
az network public-ip list \
  --resource-group $RG \
  --query "[].{Name:name, IP:ipAddress, SKU:sku.name, Prefix:publicIpPrefix.id, AssociatedTo:ipConfiguration.id}" \
  --output table
```

### Expected address plan summary

| VNet | Address space | Purpose | Overlap check |
|------|---------------|---------|---------------|
| vnet-hub-eastus2 | 10.0.0.0/16 | Shared services | No overlap |
| vnet-spoke-prod-eastus2 | 10.1.0.0/16 | Production | No overlap |
| vnet-spoke-dev-eastus2 | 10.2.0.0/16 | Dev/Test | No overlap |
| On-premises | 192.168.0.0/16 | Corporate DC | No overlap |

## Break & fix

These exercises simulate common misconfigurations. Try to diagnose and fix each one.

### Scenario 1: Overlapping address spaces prevent peering

```bash
# Create a VNet with an address space that overlaps with the hub
az network vnet create \
  --resource-group $RG \
  --name vnet-broken-overlap \
  --location $LOCATION \
  --address-prefixes 10.0.0.0/20 \
  --subnet-name snet-overlap \
  --subnet-prefixes 10.0.0.0/24

# Attempt to peer with the hub (this will FAIL)
az network vnet peering create \
  --resource-group $RG \
  --name peer-broken-to-hub \
  --vnet-name vnet-broken-overlap \
  --remote-vnet vnet-hub-eastus2 \
  --allow-vnet-access
```

**Symptom**: The peering creation fails with an error about overlapping address spaces.

**Root cause**: Both `vnet-broken-overlap` (10.0.0.0/20) and `vnet-hub-eastus2` (10.0.0.0/16) contain the 10.0.0.0 range. Azure does not allow peering between VNets with overlapping address spaces.

**Fix**: Use a non-overlapping address space for the new VNet:

```bash
az network vnet delete --resource-group $RG --name vnet-broken-overlap

az network vnet create \
  --resource-group $RG \
  --name vnet-fixed-nooverlap \
  --location $LOCATION \
  --address-prefixes 10.3.0.0/16 \
  --subnet-name snet-workload \
  --subnet-prefixes 10.3.1.0/24
```

### Scenario 2: GatewaySubnet too small

```bash
# Create a VNet with GatewaySubnet of /29 (too small for non-Basic SKUs)
az network vnet create \
  --resource-group $RG \
  --name vnet-broken-gateway \
  --location $LOCATION \
  --address-prefixes 10.4.0.0/16 \
  --subnet-name GatewaySubnet \
  --subnet-prefixes 10.4.0.0/29
```

**Symptom**: When you later try to deploy a VPN Gateway (VpnGw1 or higher), the deployment fails because the GatewaySubnet is too small.

**Root cause**: All VPN Gateway SKUs except Basic require a GatewaySubnet of /27 or larger. A /29 only provides 8 addresses (5 usable), which is insufficient for gateway VMs and services. Microsoft recommends /27 as the minimum for production gateways.

**Fix**: Delete and recreate the subnet with /27:

```bash
az network vnet subnet delete \
  --resource-group $RG \
  --vnet-name vnet-broken-gateway \
  --name GatewaySubnet

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-broken-gateway \
  --name GatewaySubnet \
  --address-prefixes 10.4.0.0/27
```

### Scenario 3: SKU mismatch when allocating from prefix

```bash
# Try to create a Basic SKU public IP from a Standard prefix (this will FAIL)
az network public-ip create \
  --resource-group $RG \
  --name pip-broken-sku \
  --sku Basic \
  --allocation-method Dynamic \
  --public-ip-prefix pip-prefix-contoso-eastus2
```

**Symptom**: The command fails because Basic SKU public IPs cannot be allocated from a public IP prefix.

**Root cause**: Public IP prefixes are always Standard SKU. Only Standard SKU static public IPs can be allocated from a prefix. Basic SKU IPs use dynamic allocation and are incompatible.

**Fix**: Use Standard SKU with static allocation:

```bash
az network public-ip create \
  --resource-group $RG \
  --name pip-fixed-sku \
  --sku Standard \
  --allocation-method Static \
  --version IPv4 \
  --public-ip-prefix pip-prefix-contoso-eastus2
```

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-01-q1",
    question: "Contoso plans to deploy a VPN Gateway with SKU VpnGw2. What is the minimum size for the GatewaySubnet?",
    options: [
      "/27 (32 addresses)",
      "/28 (16 addresses)",
      "/29 (8 addresses)",
      "/26 (64 addresses)"
    ],
    correctIndex: 0,
    explanation: "All VPN Gateway SKUs except Basic require a GatewaySubnet of /27 or larger. While /29 works for the Basic SKU only, Microsoft recommends /27 as minimum for all production deployments. A /28 is not sufficient for VpnGw2."
  },
  {
    id: "az700-01-q2",
    question: "You need to allocate a public IP address from a public IP prefix. Which SKU and allocation method combination is valid?",
    options: [
      "Standard SKU with Static allocation",
      "Basic SKU with Dynamic allocation",
      "Standard SKU with Dynamic allocation",
      "Basic SKU with Static allocation"
    ],
    correctIndex: 0,
    explanation: "Public IP prefixes are Standard SKU only. IPs derived from a prefix must also be Standard SKU with Static allocation method. Basic SKU and Dynamic allocation are not supported with prefixes."
  },
  {
    id: "az700-01-q3",
    question: "Two VNets need to be peered. VNet-A uses 10.0.0.0/16 and VNet-B uses 10.0.128.0/17. Can you create the peering?",
    options: [
      "No, because 10.0.128.0/17 falls within the 10.0.0.0/16 range and they overlap",
      "Yes, because /17 is a more specific route than /16",
      "Yes, if you enable gateway transit",
      "No, but only because they are in the same resource group"
    ],
    correctIndex: 0,
    explanation: "Azure VNet peering requires non-overlapping address spaces. The range 10.0.128.0/17 is a subset of 10.0.0.0/16, so these VNets overlap and cannot be peered. The specificity of the route is irrelevant for peering validation."
  },
  {
    id: "az700-01-q4",
    question: "What is the correct subnet name for deploying Azure Bastion into a VNet?",
    options: [
      "AzureBastionSubnet",
      "BastionSubnet",
      "bastion-subnet",
      "Any name, as long as you select it during Bastion deployment"
    ],
    correctIndex: 0,
    explanation: "Azure Bastion requires a subnet named exactly 'AzureBastionSubnet'. This is a reserved name enforced by the platform. The subnet must also be at least /26 in size."
  },
  {
    id: "az700-01-q5",
    question: "Contoso owns registered IP range 198.51.100.0/24 and wants to use it in Azure. Which command creates the custom IP prefix resource?",
    options: [
      "az network custom-ip prefix create",
      "az network public-ip prefix create --byoip",
      "az network vnet create --custom-prefix",
      "az network public-ip create --bring-your-own-ip"
    ],
    correctIndex: 0,
    explanation: "The 'az network custom-ip prefix create' command is used to provision a customer-owned IP range (BYOIP) in Azure. After provisioning and commissioning, you derive public IP prefixes from it using --custom-ip-prefix-name on 'az network public-ip prefix create'."
  },
  {
    id: "az700-01-q6",
    question: "You create a public IP prefix with --length 28. How many public IP addresses can you allocate from it?",
    options: [
      "16",
      "14",
      "12",
      "28"
    ],
    correctIndex: 0,
    explanation: "A /28 prefix provides 16 IP addresses. Unlike subnets, public IP prefixes do not reserve addresses for network/broadcast. All 16 addresses in a /28 public IP prefix are usable and can be allocated as individual public IPs."
  }
]} />

## Cleanup

Remove all resources created in this challenge to avoid any charges.

### Azure CLI

```bash
# Delete the entire resource group and all resources within it
az group delete --name rg-contoso-networking --yes --no-wait
```

### Azure PowerShell

```powershell
# Delete the entire resource group and all resources within it
Remove-AzResourceGroup -Name "rg-contoso-networking" -Force -AsJob
```

:::tip Verify cleanup
After a few minutes, confirm deletion with:
```bash
az group show --name rg-contoso-networking 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::