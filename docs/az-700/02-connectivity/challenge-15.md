---
sidebar_position: 2
title: "Challenge 15: S2S VPN High Availability & Multi-Site"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 15: S2S VPN high availability and multi-site

:::info Estimated time and cost

**75-120 minutes** | **~$0.55/h** (VpnGw2AZ SKU) | **Exam weight: 20-25%**

:::

:::warning Deployment time

Active-active VPN Gateway provisioning takes **30-45 minutes**. Use `--no-wait` and continue with conceptual learning while the gateway deploys.

:::

## Scenario

Contoso's site-to-site VPN established in Challenge 14 uses a single VPN gateway instance, creating a single point of failure. During a recent Azure maintenance event, the VPN tunnel went down for 15 minutes causing a business disruption. The networking team must implement high availability for the VPN gateway using active-active configuration with zone-redundant SKUs, connect to multiple on-premises sites, and configure BGP for dynamic route exchange. Additionally, the team needs to understand Azure Extended Network for an upcoming Layer 2 migration project.

**Architecture:**

```text
On-prem Site A (Dallas)           Azure (East US)              On-prem Site B (Chicago)
(10.10.0.0/16)                   (10.1.0.0/16)               (10.20.0.0/16)
                                       |
[VPN Device A]  ─── Tunnel 1 ──► [pip-vgw-1]                [VPN Device B]
  203.0.113.10                        |                        198.51.100.25
                                  [VPN Gateway]
[VPN Device A]  ─── Tunnel 2 ──► [pip-vgw-2]                [VPN Device B]
  203.0.113.10                        |                        198.51.100.25
                                  Active-Active
                               (VpnGw2AZ, Zone 1+2)
                                  BGP ASN: 65010
```

## Learning objectives

After completing this challenge you will be able to:

- Design and implement a high-availability site-to-site VPN connection
- Deploy an active-active VPN gateway with zone-redundant SKUs
- Configure BGP on VPN gateways for dynamic routing
- Connect multiple on-premises sites to a single VPN gateway (multi-site)
- Explain the purpose and use case for Azure Extended Network

## Prerequisites

- Completion of Challenge 14 (or understanding of basic S2S VPN concepts)
- An Azure subscription with Contributor access
- Azure CLI installed and authenticated (`az login`)
- PowerShell with Az module installed

## Key concepts for AZ-700

| Concept | Detail |
|---------|--------|
| Active-active gateway | Two gateway instances, each with its own public IP; both tunnels active simultaneously |
| Zone-redundant gateway | SKUs ending in "AZ" (e.g., VpnGw2AZ) deploy instances across availability zones |
| BGP (Border Gateway Protocol) | Dynamic routing protocol; advertises routes automatically instead of static local-address-prefixes |
| ASN (Autonomous System Number) | Unique identifier for a BGP speaker; Azure default is 65515 |
| Multi-site VPN | Multiple local network gateways connected to a single VPN gateway (one connection per site) |
| Azure Extended Network | Layer 2 overlay that stretches an on-prem subnet into Azure for live migration without re-IP |

### Active-active vs active-standby

| Feature | Active-standby (default) | Active-active |
|---------|-------------------------|---------------|
| Gateway instances | 2 (one active, one standby) | 2 (both active) |
| Public IPs | 1 | 2 (one per instance) |
| Failover time | 60-90 seconds | Near-instant (other tunnel already active) |
| Tunnels per site | 1 | 2 (one to each instance) |
| On-prem configuration | Single tunnel to one IP | Two tunnels to two IPs |
| Throughput | Single instance bandwidth | Aggregated bandwidth from both instances |

### Zone-redundant SKU naming

| Standard SKU | Zone-redundant equivalent |
|--------------|--------------------------|
| VpnGw1 | VpnGw1AZ |
| VpnGw2 | VpnGw2AZ |
| VpnGw3 | VpnGw3AZ |
| VpnGw4 | VpnGw4AZ |
| VpnGw5 | VpnGw5AZ |

Zone-redundant SKUs require **Standard SKU public IPs** (not Basic) with **zone-redundant** allocation.

---

## Task 1: Deploy an active-active zone-redundant VPN gateway

### Step 1: Create the resource group and VNet

```bash
az group create \
    --name rg-vpn-ha-lab \
    --location eastus

az network vnet create \
    --resource-group rg-vpn-ha-lab \
    --name vnet-hub \
    --location eastus \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name snet-workloads \
    --subnet-prefixes 10.1.1.0/24

az network vnet subnet create \
    --resource-group rg-vpn-ha-lab \
    --vnet-name vnet-hub \
    --name GatewaySubnet \
    --address-prefixes 10.1.255.0/27
```

### Step 2: Create two zone-redundant public IPs (required for active-active)

```bash
az network public-ip create \
    --resource-group rg-vpn-ha-lab \
    --name pip-vgw-hub-1 \
    --location eastus \
    --allocation-method Static \
    --sku Standard \
    --zone 1 2 3

az network public-ip create \
    --resource-group rg-vpn-ha-lab \
    --name pip-vgw-hub-2 \
    --location eastus \
    --allocation-method Static \
    --sku Standard \
    --zone 1 2 3
```

:::note Zone-redundant public IPs

When using zone-redundant gateway SKUs (ending in AZ), the public IPs must be Standard SKU. Specifying `--zone 1 2 3` makes the IP zone-redundant, meaning it survives the failure of any single availability zone.

:::

### Step 3: Create the active-active VPN gateway

```bash
az network vnet-gateway create \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --vnet vnet-hub \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw2AZ \
    --public-ip-addresses pip-vgw-hub-1 pip-vgw-hub-2 \
    --active-active \
    --no-wait
```

### Azure PowerShell

```powershell
# Create public IPs
$pip1 = New-AzPublicIpAddress `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "pip-vgw-hub-1" `
    -Location "eastus" `
    -AllocationMethod Static `
    -Sku Standard `
    -Zone 1, 2, 3

$pip2 = New-AzPublicIpAddress `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "pip-vgw-hub-2" `
    -Location "eastus" `
    -AllocationMethod Static `
    -Sku Standard `
    -Zone 1, 2, 3

# Get subnet reference
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-vpn-ha-lab" -Name "vnet-hub"
$gwSubnet = Get-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -VirtualNetwork $vnet

# Create two IP configurations (one per public IP)
$ipConfig1 = New-AzVirtualNetworkGatewayIpConfig `
    -Name "gwIpConfig1" `
    -SubnetId $gwSubnet.Id `
    -PublicIpAddressId $pip1.Id

$ipConfig2 = New-AzVirtualNetworkGatewayIpConfig `
    -Name "gwIpConfig2" `
    -SubnetId $gwSubnet.Id `
    -PublicIpAddressId $pip2.Id

# Create active-active VPN gateway
New-AzVirtualNetworkGateway `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "vgw-hub-ha" `
    -Location "eastus" `
    -IpConfigurations $ipConfig1, $ipConfig2 `
    -GatewayType Vpn `
    -VpnType RouteBased `
    -GatewaySku VpnGw2AZ `
    -EnableActiveActiveFeature `
    -AsJob
```

---

## Task 2: Connect multiple on-premises sites (multi-site VPN)

### Step 1: Create local network gateways for each site

```bash
# Site A: Dallas datacenter
az network local-gateway create \
    --resource-group rg-vpn-ha-lab \
    --name lgw-dallas \
    --gateway-ip-address 203.0.113.10 \
    --local-address-prefixes 10.10.0.0/16 \
    --location eastus

# Site B: Chicago datacenter
az network local-gateway create \
    --resource-group rg-vpn-ha-lab \
    --name lgw-chicago \
    --gateway-ip-address 198.51.100.25 \
    --local-address-prefixes 10.20.0.0/16 \
    --location eastus
```

### Step 2: Create VPN connections to each site

```bash
# Connection to Dallas
az network vpn-connection create \
    --resource-group rg-vpn-ha-lab \
    --name conn-to-dallas \
    --vnet-gateway1 vgw-hub-ha \
    --local-gateway2 lgw-dallas \
    --shared-key "DallasKey!2024Secure"

# Connection to Chicago
az network vpn-connection create \
    --resource-group rg-vpn-ha-lab \
    --name conn-to-chicago \
    --vnet-gateway1 vgw-hub-ha \
    --local-gateway2 lgw-chicago \
    --shared-key "ChicagoKey!2024Secure"
```

### Azure PowerShell

```powershell
# Create local gateways
$lgwDallas = New-AzLocalNetworkGateway `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "lgw-dallas" `
    -Location "eastus" `
    -GatewayIpAddress "203.0.113.10" `
    -AddressPrefix "10.10.0.0/16"

$lgwChicago = New-AzLocalNetworkGateway `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "lgw-chicago" `
    -Location "eastus" `
    -GatewayIpAddress "198.51.100.25" `
    -AddressPrefix "10.20.0.0/16"

# Create connections
$vgw = Get-AzVirtualNetworkGateway -ResourceGroupName "rg-vpn-ha-lab" -Name "vgw-hub-ha"

New-AzVirtualNetworkGatewayConnection `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "conn-to-dallas" `
    -Location "eastus" `
    -VirtualNetworkGateway1 $vgw `
    -LocalNetworkGateway2 $lgwDallas `
    -ConnectionType IPsec `
    -SharedKey "DallasKey!2024Secure"

New-AzVirtualNetworkGatewayConnection `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "conn-to-chicago" `
    -Location "eastus" `
    -VirtualNetworkGateway1 $vgw `
    -LocalNetworkGateway2 $lgwChicago `
    -ConnectionType IPsec `
    -SharedKey "ChicagoKey!2024Secure"
```

:::tip Multi-site considerations

- Each on-premises site requires its own local network gateway and VPN connection resource
- Route-based VPN gateways support up to 30 S2S tunnels (VpnGw1) or 100 (VpnGw4/5)
- Address spaces across all local network gateways must not overlap
- Each connection can have a different shared key

:::

---

## Task 3: Configure BGP on the VPN gateway

BGP enables dynamic route exchange, eliminating the need to manually maintain `--local-address-prefixes` on local network gateways when on-premises networks change.

### Step 1: Enable BGP on the VPN gateway

```bash
az network vnet-gateway update \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --enable-bgp true \
    --asn 65010
```

### Step 2: Create a BGP-enabled local network gateway

When using BGP, the local network gateway includes the on-premises BGP peer IP and ASN:

```bash
az network local-gateway create \
    --resource-group rg-vpn-ha-lab \
    --name lgw-dallas-bgp \
    --gateway-ip-address 203.0.113.10 \
    --local-address-prefixes 10.10.0.0/16 \
    --bgp-peering-address 10.10.255.254 \
    --asn 65020 \
    --location eastus
```

### Step 3: Create a BGP-enabled connection

```bash
az network vpn-connection create \
    --resource-group rg-vpn-ha-lab \
    --name conn-to-dallas-bgp \
    --vnet-gateway1 vgw-hub-ha \
    --local-gateway2 lgw-dallas-bgp \
    --shared-key "DallasBGP!2024Key" \
    --enable-bgp true
```

### Azure PowerShell

```powershell
# Update gateway with BGP
$vgw = Get-AzVirtualNetworkGateway -ResourceGroupName "rg-vpn-ha-lab" -Name "vgw-hub-ha"
$vgw.EnableBgp = $true
$vgw.BgpSettings.Asn = 65010
Set-AzVirtualNetworkGateway -VirtualNetworkGateway $vgw

# Create BGP-enabled local gateway
$lgwDallasBgp = New-AzLocalNetworkGateway `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "lgw-dallas-bgp" `
    -Location "eastus" `
    -GatewayIpAddress "203.0.113.10" `
    -AddressPrefix "10.10.0.0/16" `
    -BgpPeeringAddress "10.10.255.254" `
    -Asn 65020

# Create connection with BGP
New-AzVirtualNetworkGatewayConnection `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "conn-to-dallas-bgp" `
    -Location "eastus" `
    -VirtualNetworkGateway1 $vgw `
    -LocalNetworkGateway2 $lgwDallasBgp `
    -ConnectionType IPsec `
    -SharedKey "DallasBGP!2024Key" `
    -EnableBgp $true
```

### Step 4: Verify BGP configuration

```bash
# Show gateway BGP settings
az network vnet-gateway show \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --query "{bgpEnabled:enableBgp, asn:bgpSettings.asn, peerAddress:bgpSettings.bgpPeeringAddress}" \
    --output table

# List learned BGP routes
az network vnet-gateway list-learned-routes \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --output table

# List advertised routes to a specific peer
az network vnet-gateway list-advertised-routes \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --peer 10.10.255.254 \
    --output table
```

:::note BGP ASN rules

- Azure reserved ASN: 65515 (default for Azure VPN gateways if not specified)
- Do not use 65515 for on-premises devices
- Private ASN range: 64512-65534 and 4200000000-4294967294
- Each BGP peer (Azure gateway and on-prem device) must have a unique ASN
- The `--bgp-peering-address` on the local network gateway is the on-prem device's internal BGP peer IP (not its public IP)

:::

---

## Task 4: Verify active-active gateway instances

### Azure CLI

```bash
# Show both public IPs assigned to the active-active gateway
az network vnet-gateway show \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --query "ipConfigurations[].{name:name, publicIP:publicIpAddress.id}" \
    --output table

# Show both tunnel IPs
az network public-ip show \
    --resource-group rg-vpn-ha-lab \
    --name pip-vgw-hub-1 \
    --query "ipAddress" \
    --output tsv

az network public-ip show \
    --resource-group rg-vpn-ha-lab \
    --name pip-vgw-hub-2 \
    --query "ipAddress" \
    --output tsv
```

### Azure PowerShell

```powershell
# Verify active-active configuration
$vgw = Get-AzVirtualNetworkGateway -ResourceGroupName "rg-vpn-ha-lab" -Name "vgw-hub-ha"
$vgw.ActiveActive
$vgw.IpConfigurations | Format-Table Name, PublicIpAddress
```

---

## Task 5: Simulate failover

In an active-active configuration, if one gateway instance becomes unavailable, the on-premises device detects the dead peer (via IKE Dead Peer Detection) and fails over to the remaining active tunnel. No Azure-side action is required.

### Verification steps

```bash
# Monitor connection status for both tunnels
az network vpn-connection show \
    --resource-group rg-vpn-ha-lab \
    --name conn-to-dallas \
    --query "{status:connectionStatus, tunnelStatus:tunnelConnectionStatus}" \
    --output json
```

### Understanding failover behavior

| Scenario | Active-standby behavior | Active-active behavior |
|----------|------------------------|----------------------|
| Planned maintenance | 60-90 second downtime | Near-zero downtime (other tunnel remains) |
| Zone failure | Gateway unavailable if in affected zone | Survives if using AZ SKU across zones |
| Single instance failure | 60-90 second failover to standby | Immediate use of other active tunnel |
| On-prem device failure | Tunnel down until device recovers | Tunnel down until device recovers (same) |

---

## Task 6: Azure Extended Network (conceptual)

Azure Extended Network is a Layer 2 overlay technology that stretches an on-premises subnet into an Azure VNet, allowing VMs to retain their on-premises IP addresses when migrated to Azure.

### Use case

- Live migration of VMs from on-premises to Azure without changing IP addresses
- Avoid re-IP during phased migration projects
- Maintain network dependencies (hardcoded IPs, legacy apps) during transition

### Requirements and limitations

| Requirement | Detail |
|-------------|--------|
| On-premises | Windows Server 2019+ with Hyper-V |
| Azure | Windows Server 2019+ VMs in Azure |
| Network | Site-to-site VPN or ExpressRoute between on-prem and Azure |
| Subnet | /24 maximum for the stretched subnet |
| Scope | Intended for migration only, not long-term production use |

### How it works

1. A pair of appliance VMs (one on-prem, one in Azure) create a VXLAN tunnel over the S2S VPN
2. ARP and broadcast traffic is proxied between the two sides
3. VMs on either side of the stretched subnet can communicate at Layer 2
4. After migration is complete, the on-prem end is decommissioned

:::tip Exam note

Azure Extended Network is a niche topic on the exam. Key points to remember: it requires Windows Server 2019+, works over existing S2S VPN or ExpressRoute, is limited to /24 subnets, and is designed as a temporary migration aid (not a permanent architecture). If the exam asks about stretching Layer 2 to Azure, this is the answer.

:::

### Reference commands (conceptual only)

Azure Extended Network is configured through Windows Admin Center, not via Azure CLI or PowerShell directly:

1. Install the Azure Extended Network extension in Windows Admin Center
2. Connect to the on-premises host
3. Select the subnet to extend
4. Specify the Azure VNet and subnet to extend into
5. Deploy the Azure appliance VM

For details, see [Azure Extended Network documentation](https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/azure/azure-extended-network).

---

## Break & fix

### Scenario 1: BGP ASN conflict

**Symptom:** BGP peering fails to establish. Connection shows `Connected` but no routes are learned.

**Root cause:** Both the Azure VPN gateway and the on-premises device are configured with the same ASN (e.g., both using 65515).

**Diagnostic command:**

```bash
az network vnet-gateway show \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --query "bgpSettings.asn" \
    --output tsv

az network local-gateway show \
    --resource-group rg-vpn-ha-lab \
    --name lgw-dallas-bgp \
    --query "bgpSettings.asn" \
    --output tsv
```

**Fix:** Change one side to a unique ASN:

```bash
az network vnet-gateway update \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --asn 65010
```

### Scenario 2: Active-active with only one public IP

**Symptom:** Gateway creation fails or falls back to active-standby mode.

**Root cause:** Only one public IP was specified in `--public-ip-addresses` when creating the gateway. Active-active requires exactly two public IPs.

**Fix:** Recreate the gateway with two public IPs (cannot add a second IP after creation):

```bash
# Delete and recreate (gateway update cannot add active-active after creation)
az network vnet-gateway delete \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --no-wait

# Recreate with two public IPs
az network vnet-gateway create \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --vnet vnet-hub \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw2AZ \
    --public-ip-addresses pip-vgw-hub-1 pip-vgw-hub-2 \
    --active-active \
    --no-wait
```

### Scenario 3: Non-AZ SKU in zone-redundant configuration

**Symptom:** Gateway deploys but does not survive availability zone failure. Inspection shows instances in a single zone.

**Root cause:** A non-AZ SKU (e.g., VpnGw2 instead of VpnGw2AZ) was used. Non-AZ SKUs deploy both instances in the same zone or no specific zone.

**Diagnostic command:**

```bash
az network vnet-gateway show \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --query "sku.name" \
    --output tsv
# Returns: VpnGw2 (should be VpnGw2AZ)
```

**Fix:** Recreate the gateway with an AZ SKU (SKU change requires delete and recreate):

```bash
az network vnet-gateway delete \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --no-wait

az network vnet-gateway create \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --vnet vnet-hub \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw2AZ \
    --public-ip-addresses pip-vgw-hub-1 pip-vgw-hub-2 \
    --active-active \
    --no-wait
```

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-15-q1",
    question: "How many public IP addresses are required for an active-active VPN gateway?",
    options: [
      "1",
      "2",
      "3",
      "None (uses private IPs only)"
    ],
    correctIndex: 1,
    explanation: "An active-active VPN gateway requires exactly two public IP addresses, one for each gateway instance. Each on-premises device must establish tunnels to both public IPs for full redundancy."
  },
  {
    id: "az700-15-q2",
    question: "Which VPN Gateway SKU provides zone-redundant deployment across availability zones?",
    options: [
      "VpnGw2",
      "VpnGw2AZ",
      "VpnGw2Standard",
      "VpnGw2Zone"
    ],
    correctIndex: 1,
    explanation: "Zone-redundant VPN Gateway SKUs have the 'AZ' suffix (VpnGw1AZ through VpnGw5AZ). These SKUs deploy gateway instances across multiple availability zones, surviving single-zone failures. Standard (non-AZ) SKUs do not guarantee zone distribution."
  },
  {
    id: "az700-15-q3",
    question: "What is the default ASN assigned to Azure VPN gateways if no custom ASN is specified?",
    options: [
      "64512",
      "65000",
      "65515",
      "65535"
    ],
    correctIndex: 2,
    explanation: "Azure VPN gateways use ASN 65515 by default. On-premises devices must use a different ASN to establish BGP peering. Common choices for on-prem are in the private ASN range (64512-65534), excluding 65515."
  },
  {
    id: "az700-15-q4",
    question: "What is the primary use case for Azure Extended Network?",
    options: [
      "Permanent Layer 2 connectivity between on-premises and Azure",
      "Temporary Layer 2 stretch to allow VM migration without re-IP",
      "High-speed Layer 2 data transfer for backup purposes",
      "Replacing ExpressRoute with a software-defined overlay"
    ],
    correctIndex: 1,
    explanation: "Azure Extended Network provides a temporary Layer 2 stretch between on-premises and Azure, allowing VMs to be migrated without changing their IP addresses. It is designed as a migration aid, not a permanent architecture. It requires Windows Server 2019+ and is limited to /24 subnets."
  },
  {
    id: "az700-15-q5",
    question: "What happens during planned Azure maintenance on an active-active VPN gateway?",
    options: [
      "Both tunnels go down simultaneously for 60-90 seconds",
      "One instance is maintained at a time; the other continues handling traffic with near-zero downtime",
      "Traffic is paused and queued until maintenance completes",
      "The gateway automatically fails over to a standby instance in another region"
    ],
    correctIndex: 1,
    explanation: "In active-active mode, Azure performs rolling maintenance on one instance at a time. While one instance is being maintained, the other instance continues to handle VPN traffic through its active tunnel, providing near-zero downtime for the VPN connection."
  }
]} />

---

## Cleanup

Remove all resources created in this challenge to stop billing:

```bash
az group delete --name rg-vpn-ha-lab --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-vpn-ha-lab" -Force -AsJob
```

---

## Additional references

- [Highly available cross-premises connectivity](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-highlyavailable)
- [Active-active VPN gateways](https://learn.microsoft.com/en-us/azure/vpn-gateway/active-active-portal)
- [Configure BGP for VPN gateways](https://learn.microsoft.com/en-us/azure/vpn-gateway/bgp-howto)
- [Zone-redundant VPN gateways](https://learn.microsoft.com/en-us/azure/vpn-gateway/about-zone-redundant-vnet-gateways)
- [Azure Extended Network](https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/azure/azure-extended-network)
