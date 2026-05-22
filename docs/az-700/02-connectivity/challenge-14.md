---
sidebar_position: 1
title: "Challenge 14: Site-to-Site VPN Gateway"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 14: Site-to-site VPN gateway

:::info Estimated time and cost

**60-90 minutes** | **~$0.19/h** (VpnGw1 SKU) | **Exam weight: 20-25%**

:::

:::warning Deployment time

VPN Gateway provisioning takes **30-45 minutes**. Use `--no-wait` and continue with other tasks while the gateway deploys.

:::

## Scenario

Contoso has a hub virtual network in Azure (`vnet-hub`, 10.1.0.0/16) and an on-premises datacenter with the address space 192.168.0.0/16. The on-premises VPN device has a public IP of 203.0.113.50. The networking team must establish a site-to-site IPsec VPN tunnel between the Azure hub VNet and the on-premises datacenter to enable hybrid connectivity for workloads that cannot yet migrate to Azure.

**Architecture:**

<div style={{textAlign: 'center', margin: '20px 0'}}>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 280" style={{maxWidth: '620px', height: 'auto'}} font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <marker id="arrow-ch14" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666"/>
    </marker>
  </defs>
  <!-- On-premises -->
  <rect x="15" y="40" width="210" height="90" rx="8" fill="#d5e8d4" stroke="#82b366" stroke-width="2"/>
  <text x="120" y="62" text-anchor="middle" font-size="12" font-weight="bold">On-premises datacenter</text>
  <text x="120" y="80" text-anchor="middle" font-size="10" fill="#555">192.168.0.0/16</text>
  <rect x="35" y="92" width="170" height="28" rx="4" fill="#f5f5f5" stroke="#666" stroke-width="1"/>
  <text x="120" y="110" text-anchor="middle" font-size="10">VPN Device: 203.0.113.50</text>
  <!-- IPsec tunnel -->
  <line x1="225" y1="85" x2="365" y2="85" stroke="#9673a6" stroke-width="2.5" stroke-dasharray="8,4"/>
  <text x="295" y="75" text-anchor="middle" font-size="10" font-weight="bold" fill="#9673a6">IPsec/IKE</text>
  <!-- Azure side -->
  <rect x="370" y="15" width="235" height="250" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
  <text x="487" y="37" text-anchor="middle" font-size="12" font-weight="bold">Azure — vnet-hub</text>
  <text x="487" y="53" text-anchor="middle" font-size="10" fill="#555">10.1.0.0/16</text>
  <!-- VPN Gateway -->
  <rect x="390" y="65" width="195" height="40" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="1.5"/>
  <text x="487" y="89" text-anchor="middle" font-size="11" font-weight="bold">VPN Gateway: vgw-hub</text>
  <!-- Subnets -->
  <rect x="390" y="120" width="195" height="30" rx="4" fill="#fff2cc" stroke="#d6b656" stroke-width="1"/>
  <text x="487" y="139" text-anchor="middle" font-size="10">GatewaySubnet (10.1.255.0/27)</text>
  <rect x="390" y="160" width="195" height="30" rx="4" fill="#f5f5f5" stroke="#666" stroke-width="1"/>
  <text x="487" y="179" text-anchor="middle" font-size="10">snet-workloads (10.1.1.0/24)</text>
  <rect x="390" y="200" width="195" height="30" rx="4" fill="#f5f5f5" stroke="#666" stroke-width="1"/>
  <text x="487" y="219" text-anchor="middle" font-size="10">snet-mgmt (10.1.2.0/24)</text>
</svg>
</div>

## Learning objectives

After completing this challenge you will be able to:

- Design and implement a site-to-site VPN connection
- Create and configure a local network gateway representing on-premises
- Create and configure a virtual network gateway (VPN type)
- Identify when to use a policy-based VPN versus a route-based VPN connection
- Verify VPN connection status and troubleshoot connectivity issues

## Prerequisites

- An Azure subscription with Contributor access
- Azure CLI installed and authenticated (`az login`)
- PowerShell with Az module installed (`Install-Module Az -Force`)
- A resource group and VNet already created (or create them in Task 1)

## Key concepts for AZ-700

| Concept | Detail |
|---------|--------|
| GatewaySubnet | Dedicated subnet for the VPN gateway; must be named exactly `GatewaySubnet`; recommended size /27 or larger |
| Virtual Network Gateway | Azure-managed VPN endpoint; supports route-based (dynamic) or policy-based (static) |
| Local Network Gateway | Logical representation of the on-premises VPN device (public IP + address prefixes) |
| VPN Connection | The IPsec/IKE tunnel linking the virtual network gateway to the local network gateway |
| Route-based VPN | Uses route tables for traffic selection; supports multiple tunnels, P2S, VNet-to-VNet, coexistence with ExpressRoute |
| Policy-based VPN | Uses traffic selectors (ACLs); limited to a single S2S tunnel; required for legacy devices |
| Shared key (PSK) | Pre-shared key that must match on both sides of the tunnel |

### Policy-based vs route-based VPN

| Feature | Policy-based | Route-based |
|---------|-------------|-------------|
| IKE version | IKEv1 only | IKEv1 and IKEv2 |
| Max S2S tunnels | 1 | 30 (VpnGw1) to 100 (VpnGw4/5) |
| Point-to-Site | Not supported | Supported |
| BGP support | Not supported | Supported |
| VNet-to-VNet | Not supported | Supported |
| Coexist with ExpressRoute | Not supported | Supported |
| Gateway SKU | Basic only | VpnGw1-5, VpnGw1AZ-5AZ |
| Use case | Legacy on-prem devices requiring IKEv1 policy match | All modern deployments |

:::tip Exam note

The exam frequently tests when policy-based is required versus route-based. The answer is almost always route-based unless the question explicitly states a legacy device that only supports IKEv1 with policy-based traffic selectors. Route-based gateways are the default recommendation.

:::

---

## Task 1: Create the hub VNet and GatewaySubnet

### Azure CLI

```bash
# Create resource group
az group create \
    --name rg-vpn-lab \
    --location eastus

# Create hub VNet
az network vnet create \
    --resource-group rg-vpn-lab \
    --name vnet-hub \
    --location eastus \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name snet-workloads \
    --subnet-prefixes 10.1.1.0/24

# Create the GatewaySubnet (must be named exactly "GatewaySubnet")
az network vnet subnet create \
    --resource-group rg-vpn-lab \
    --vnet-name vnet-hub \
    --name GatewaySubnet \
    --address-prefixes 10.1.255.0/27
```

### Azure PowerShell

```powershell
# Create resource group
New-AzResourceGroup -Name "rg-vpn-lab" -Location "eastus"

# Create hub VNet with subnets
$workloadsSubnet = New-AzVirtualNetworkSubnetConfig `
    -Name "snet-workloads" `
    -AddressPrefix "10.1.1.0/24"

$gatewaySubnet = New-AzVirtualNetworkSubnetConfig `
    -Name "GatewaySubnet" `
    -AddressPrefix "10.1.255.0/27"

New-AzVirtualNetwork `
    -ResourceGroupName "rg-vpn-lab" `
    -Name "vnet-hub" `
    -Location "eastus" `
    -AddressPrefix "10.1.0.0/16" `
    -Subnet $workloadsSubnet, $gatewaySubnet
```

:::note GatewaySubnet requirements

- The name **must** be `GatewaySubnet` (case-sensitive, no other names work)
- Minimum recommended size is /27 (32 addresses) to allow for future growth and active-active configurations
- /28 is the absolute minimum but limits future expandability
- Do not associate an NSG or route table with the GatewaySubnet (it can disrupt gateway operation)

:::

---

## Task 2: Deploy the VPN gateway

### Step 1: Create a public IP for the gateway

```bash
az network public-ip create \
    --resource-group rg-vpn-lab \
    --name pip-vgw-hub \
    --location eastus \
    --allocation-method Static \
    --sku Standard
```

### Step 2: Create the virtual network gateway

```bash
az network vnet-gateway create \
    --resource-group rg-vpn-lab \
    --name vgw-hub \
    --vnet vnet-hub \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw1 \
    --vpn-gateway-generation Generation1 \
    --public-ip-addresses pip-vgw-hub \
    --no-wait
```

### Azure PowerShell

```powershell
# Create public IP
$pip = New-AzPublicIpAddress `
    -ResourceGroupName "rg-vpn-lab" `
    -Name "pip-vgw-hub" `
    -Location "eastus" `
    -AllocationMethod Static `
    -Sku Standard

# Get subnet reference
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-vpn-lab" -Name "vnet-hub"
$gwSubnet = Get-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -VirtualNetwork $vnet

# Create IP configuration
$ipConfig = New-AzVirtualNetworkGatewayIpConfig `
    -Name "gwIpConfig" `
    -SubnetId $gwSubnet.Id `
    -PublicIpAddressId $pip.Id

# Create the VPN gateway (takes 30-45 minutes)
New-AzVirtualNetworkGateway `
    -ResourceGroupName "rg-vpn-lab" `
    -Name "vgw-hub" `
    -Location "eastus" `
    -IpConfigurations $ipConfig `
    -GatewayType Vpn `
    -VpnType RouteBased `
    -GatewaySku VpnGw1 `
    -AsJob
```

### Step 3: Monitor deployment progress

```bash
# Check provisioning state (repeat until "Succeeded")
az network vnet-gateway show \
    --resource-group rg-vpn-lab \
    --name vgw-hub \
    --query "provisioningState" \
    --output tsv
```

---

## Task 3: Create the local network gateway

The local network gateway represents the on-premises VPN device in Azure. It stores the public IP of the on-prem device and the address prefixes of the on-prem network.

### Azure CLI

```bash
az network local-gateway create \
    --resource-group rg-vpn-lab \
    --name lgw-onprem-datacenter \
    --gateway-ip-address 203.0.113.50 \
    --local-address-prefixes 192.168.0.0/16 \
    --location eastus
```

### Azure PowerShell

```powershell
New-AzLocalNetworkGateway `
    -ResourceGroupName "rg-vpn-lab" `
    -Name "lgw-onprem-datacenter" `
    -Location "eastus" `
    -GatewayIpAddress "203.0.113.50" `
    -AddressPrefix "192.168.0.0/16"
```

### Multiple on-premises subnets

If the on-premises network has multiple non-contiguous subnets, list them all:

```bash
az network local-gateway create \
    --resource-group rg-vpn-lab \
    --name lgw-onprem-datacenter \
    --gateway-ip-address 203.0.113.50 \
    --local-address-prefixes 192.168.1.0/24 192.168.2.0/24 10.50.0.0/16 \
    --location eastus
```

---

## Task 4: Create the VPN connection

Once the VPN gateway has finished provisioning, create the IPsec connection.

### Azure CLI

```bash
az network vpn-connection create \
    --resource-group rg-vpn-lab \
    --name conn-hub-to-onprem \
    --vnet-gateway1 vgw-hub \
    --local-gateway2 lgw-onprem-datacenter \
    --shared-key "Contoso!VPN#2024secure"
```

### Azure PowerShell

```powershell
$vgw = Get-AzVirtualNetworkGateway -ResourceGroupName "rg-vpn-lab" -Name "vgw-hub"
$lgw = Get-AzLocalNetworkGateway -ResourceGroupName "rg-vpn-lab" -Name "lgw-onprem-datacenter"

New-AzVirtualNetworkGatewayConnection `
    -ResourceGroupName "rg-vpn-lab" `
    -Name "conn-hub-to-onprem" `
    -Location "eastus" `
    -VirtualNetworkGateway1 $vgw `
    -LocalNetworkGateway2 $lgw `
    -ConnectionType IPsec `
    -SharedKey "Contoso!VPN#2024secure"
```

:::note Shared key requirements

- The shared key must be identical on both sides (Azure and on-premises device)
- Maximum 128 characters
- Supports alphanumeric characters and special characters
- Use a strong, randomly generated key in production

:::

---

## Task 5: Verify connection status

### Azure CLI

```bash
# Check connection status
az network vpn-connection show \
    --resource-group rg-vpn-lab \
    --name conn-hub-to-onprem \
    --query "{status:connectionStatus, inBytes:ingressBytesTransferred, outBytes:egressBytesTransferred}" \
    --output table
```

### Azure PowerShell

```powershell
Get-AzVirtualNetworkGatewayConnection `
    -ResourceGroupName "rg-vpn-lab" `
    -Name "conn-hub-to-onprem" | `
    Select-Object Name, ConnectionStatus, IngressBytesTransferred, EgressBytesTransferred
```

### Connection status values

| Status | Meaning |
|--------|---------|
| Connected | Tunnel is established and passing traffic |
| Connecting | Azure side is ready but waiting for the on-prem device to respond |
| NotConnected | Connection object exists but the tunnel has not been initiated |
| Unknown | Cannot determine state (check gateway health) |

:::tip Lab simulation

In a lab without a real on-premises device, the connection will remain in `Connecting` state. This is expected. To simulate a fully connected tunnel, deploy a second VPN gateway in another VNet and create a VNet-to-VNet connection (both sides are under your control).

:::

---

## Task 6: Test connectivity (lab simulation with second VNet)

To verify end-to-end connectivity in a lab, create a second VNet simulating the on-premises network:

```bash
# Create simulated on-prem VNet
az network vnet create \
    --resource-group rg-vpn-lab \
    --name vnet-onprem-sim \
    --location eastus \
    --address-prefixes 192.168.0.0/16 \
    --subnet-name snet-servers \
    --subnet-prefixes 192.168.1.0/24

az network vnet subnet create \
    --resource-group rg-vpn-lab \
    --vnet-name vnet-onprem-sim \
    --name GatewaySubnet \
    --address-prefixes 192.168.255.0/27

# Create second public IP and gateway
az network public-ip create \
    --resource-group rg-vpn-lab \
    --name pip-vgw-onprem \
    --location eastus \
    --allocation-method Static \
    --sku Standard

az network vnet-gateway create \
    --resource-group rg-vpn-lab \
    --name vgw-onprem-sim \
    --vnet vnet-onprem-sim \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw1 \
    --vpn-gateway-generation Generation1 \
    --public-ip-addresses pip-vgw-onprem \
    --no-wait
```

After both gateways are provisioned, create connections in both directions:

```bash
# Update local gateway with actual public IP of simulated on-prem gateway
ONPREM_GW_IP=$(az network public-ip show \
    --resource-group rg-vpn-lab \
    --name pip-vgw-onprem \
    --query "ipAddress" \
    --output tsv)

az network local-gateway update \
    --resource-group rg-vpn-lab \
    --name lgw-onprem-datacenter \
    --gateway-ip-address "$ONPREM_GW_IP"

# Create the reverse local gateway (representing Azure hub from on-prem perspective)
HUB_GW_IP=$(az network public-ip show \
    --resource-group rg-vpn-lab \
    --name pip-vgw-hub \
    --query "ipAddress" \
    --output tsv)

az network local-gateway create \
    --resource-group rg-vpn-lab \
    --name lgw-azure-hub \
    --gateway-ip-address "$HUB_GW_IP" \
    --local-address-prefixes 10.1.0.0/16 \
    --location eastus

# Create reverse connection (on-prem to hub) with same shared key
az network vpn-connection create \
    --resource-group rg-vpn-lab \
    --name conn-onprem-to-hub \
    --vnet-gateway1 vgw-onprem-sim \
    --local-gateway2 lgw-azure-hub \
    --shared-key "Contoso!VPN#2024secure"
```

---

## Break and fix scenarios

### Scenario 1: Shared key mismatch

**Symptom:** Connection status remains `Connecting` indefinitely.

**Root cause:** The shared key on the Azure connection does not match the key configured on the on-premises device.

**Diagnostic command:**

```bash
az network vpn-connection show \
    --resource-group rg-vpn-lab \
    --name conn-hub-to-onprem \
    --query "connectionStatus" \
    --output tsv
# Returns: Connecting
```

**Fix:** Update the shared key to match both sides:

```bash
az network vpn-connection update \
    --resource-group rg-vpn-lab \
    --name conn-hub-to-onprem \
    --shared-key "CorrectMatchingKey2024!"
```

### Scenario 2: Missing GatewaySubnet

**Symptom:** Gateway creation fails with an error about missing subnet.

**Root cause:** The VNet does not have a subnet named exactly `GatewaySubnet`.

**Fix:** Create the subnet with the exact required name:

```bash
az network vnet subnet create \
    --resource-group rg-vpn-lab \
    --vnet-name vnet-hub \
    --name GatewaySubnet \
    --address-prefixes 10.1.255.0/27
```

### Scenario 3: Wrong local address prefixes

**Symptom:** VPN tunnel is `Connected` but traffic to certain on-premises subnets is not routed through the tunnel.

**Root cause:** The local network gateway is missing address prefixes for some on-premises subnets.

**Diagnostic command:**

```bash
az network local-gateway show \
    --resource-group rg-vpn-lab \
    --name lgw-onprem-datacenter \
    --query "localNetworkAddressSpace.addressPrefixes" \
    --output tsv
```

**Fix:** Update the local gateway with all on-premises prefixes:

```bash
az network local-gateway update \
    --resource-group rg-vpn-lab \
    --name lgw-onprem-datacenter \
    --local-address-prefixes 192.168.0.0/16 10.50.0.0/16
```

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-14-q1",
    question: "What must the dedicated subnet for a VPN gateway be named?",
    options: [
      "GatewaySubnet",
      "VpnGatewaySubnet",
      "gateway-subnet",
      "Any name with a 'gateway' tag"
    ],
    correctIndex: 0,
    explanation: "The subnet must be named exactly 'GatewaySubnet' (case-sensitive). Azure will not deploy a virtual network gateway into a subnet with any other name."
  },
  {
    id: "az700-14-q2",
    question: "A partner organization has a legacy VPN device that only supports IKEv1 with policy-based traffic selectors. Which VPN type must you configure on the Azure VPN gateway?",
    options: [
      "Route-based with custom IPsec policy",
      "Policy-based",
      "Route-based with BGP enabled",
      "Route-based with forced tunneling"
    ],
    correctIndex: 1,
    explanation: "Policy-based VPN gateways use IKEv1 with traffic selectors defined by ACLs (access policies). They are required when the on-premises device only supports policy-based negotiations. Route-based gateways use IKEv2 with route tables and do not support legacy IKEv1-only devices that require policy matching."
  },
  {
    id: "az700-14-q3",
    question: "Which Azure resource represents the on-premises VPN device in a site-to-site VPN configuration?",
    options: [
      "Virtual network gateway",
      "VPN connection",
      "Local network gateway",
      "Network interface"
    ],
    correctIndex: 2,
    explanation: "The local network gateway is the Azure resource that represents the on-premises VPN device. It stores the public IP address of the on-prem device and the address prefixes of the on-premises network, allowing Azure to know where to route traffic destined for on-prem."
  },
  {
    id: "az700-14-q4",
    question: "A VPN connection shows status 'Connecting' for over 30 minutes. What is the most likely cause?",
    options: [
      "The VPN gateway SKU is too small",
      "The shared key (PSK) does not match between both sides",
      "The GatewaySubnet is too large",
      "The local network gateway is in the wrong region"
    ],
    correctIndex: 1,
    explanation: "A persistent 'Connecting' state typically indicates that the IKE negotiation is failing. The most common cause is a shared key mismatch between the Azure connection and the on-premises device. Other causes include firewall rules blocking UDP 500/4500 or incompatible IKE/IPsec parameters."
  },
  {
    id: "az700-14-q5",
    question: "Which of the following is NOT a limitation of policy-based VPN gateways?",
    options: [
      "Maximum of one S2S tunnel",
      "No BGP support",
      "No support for IKEv1",
      "No Point-to-Site support"
    ],
    correctIndex: 2,
    explanation: "Policy-based VPN gateways exclusively use IKEv1, so 'no support for IKEv1' is incorrect as a limitation. The actual limitations are: only one S2S tunnel, no BGP, no P2S, no VNet-to-VNet, and only the Basic SKU."
  }
]} />

---

## Cleanup

Remove all resources created in this challenge to stop billing:

```bash
az group delete --name rg-vpn-lab --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-vpn-lab" -Force -AsJob
```

---

## Additional references

- [Create a site-to-site VPN connection](https://learn.microsoft.com/en-us/azure/vpn-gateway/tutorial-site-to-site-portal)
- [About VPN Gateway](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways)
- [VPN Gateway FAQ](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-vpn-faq)
- [Policy-based vs route-based VPN gateways](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-connect-multiple-policybased-rm-ps)
