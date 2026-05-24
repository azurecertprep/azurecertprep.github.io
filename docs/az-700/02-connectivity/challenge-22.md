---
sidebar_position: 9
title: "Challenge 22: Virtual WAN Hub-Spoke"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 22: Virtual WAN hub-spoke

:::info Estimated time and cost

**90–120 minutes** | **~$0.36/h** (Virtual WAN Standard + VPN Gateway) | **Exam weight: 20–25%**

:::

## Scenario

Contoso is migrating from a manually configured hub-spoke topology (VNet peering with user-defined routes) to Azure Virtual WAN for simplified branch and spoke connectivity management. They operate in two Azure regions -- East US and West Europe -- and need automated spoke-to-spoke connectivity, integrated VPN gateways for branch offices, and centralized routing without maintaining UDR tables manually.

Their current architecture requires dozens of peering relationships and route tables. The network team wants to consolidate this into a Virtual WAN Standard deployment that supports transit routing between spokes, site-to-site VPN for on-premises branches, and future ExpressRoute integration.

## Exam skills measured

| Skill | Description |
|-------|-------------|
| Select a Virtual WAN SKU | Choose between Basic and Standard based on connectivity requirements |
| Design a Virtual WAN architecture | Select types and services including hub placement and gateway types |
| Create a virtual hub in Virtual WAN | Deploy hubs with correct address prefixes and SKU settings |
| Choose an appropriate scale unit | Size gateway scale units for throughput and connection requirements |
| Deploy a gateway into a virtual hub | Provision VPN gateways within the virtual hub infrastructure |

## Architecture overview

<div style={{textAlign: 'center', margin: '20px 0'}}>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 380" style={{maxWidth: '650px', height: 'auto'}} font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <marker id="arrow-ch22" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666"/>
    </marker>
  </defs>
  <!-- On-premises Branch -->
  <rect x="240" y="5" width="170" height="45" rx="8" fill="#d5e8d4" stroke="#82b366" stroke-width="2"/>
  <text x="325" y="25" text-anchor="middle" font-size="11" font-weight="bold">On-premises Branch</text>
  <text x="325" y="42" text-anchor="middle" font-size="10" fill="#555">[VPN Site]</text>
  <line x1="325" y1="50" x2="325" y2="75" stroke="#666" stroke-width="1.5" marker-end="url(#arrow-ch22)"/>
  <!-- Virtual WAN container -->
  <rect x="40" y="78" width="570" height="175" rx="10" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
  <text x="325" y="100" text-anchor="middle" font-size="13" font-weight="bold">Virtual WAN (Standard)</text>
  <!-- Hub East US -->
  <rect x="70" y="115" width="220" height="115" rx="8" fill="#fff2cc" stroke="#d6b656" stroke-width="1.5"/>
  <text x="180" y="137" text-anchor="middle" font-size="11" font-weight="bold">Hub East US</text>
  <text x="180" y="155" text-anchor="middle" font-size="10" fill="#555">10.1.0.0/24</text>
  <rect x="90" y="165" width="180" height="30" rx="4" fill="#e1d5e7" stroke="#9673a6" stroke-width="1"/>
  <text x="180" y="184" text-anchor="middle" font-size="10">VPN Gateway</text>
  <!-- Hub West Europe -->
  <rect x="360" y="115" width="220" height="115" rx="8" fill="#fff2cc" stroke="#d6b656" stroke-width="1.5"/>
  <text x="470" y="137" text-anchor="middle" font-size="11" font-weight="bold">Hub West Europe</text>
  <text x="470" y="155" text-anchor="middle" font-size="10" fill="#555">10.2.0.0/24</text>
  <rect x="380" y="165" width="180" height="30" rx="4" fill="#e1d5e7" stroke="#9673a6" stroke-width="1"/>
  <text x="470" y="184" text-anchor="middle" font-size="10">VPN Gateway</text>
  <!-- Hub-to-Hub link -->
  <line x1="290" y1="172" x2="360" y2="172" stroke="#6c8ebf" stroke-width="2" stroke-dasharray="5,3"/>
  <!-- Spokes under East US -->
  <rect x="60" y="290" width="80" height="35" rx="6" fill="#f5f5f5" stroke="#666" stroke-width="1.5"/>
  <text x="100" y="312" text-anchor="middle" font-size="10">Spoke1</text>
  <rect x="150" y="290" width="80" height="35" rx="6" fill="#f5f5f5" stroke="#666" stroke-width="1.5"/>
  <text x="190" y="312" text-anchor="middle" font-size="10">Spoke2</text>
  <rect x="240" y="290" width="80" height="35" rx="6" fill="#f5f5f5" stroke="#666" stroke-width="1.5"/>
  <text x="280" y="312" text-anchor="middle" font-size="10">Spoke3</text>
  <line x1="100" y1="253" x2="100" y2="288" stroke="#666" stroke-width="1" marker-end="url(#arrow-ch22)"/>
  <line x1="190" y1="253" x2="190" y2="288" stroke="#666" stroke-width="1" marker-end="url(#arrow-ch22)"/>
  <line x1="180" y1="230" x2="280" y2="288" stroke="#666" stroke-width="1" marker-end="url(#arrow-ch22)"/>
  <!-- Spokes under West Europe -->
  <rect x="380" y="290" width="80" height="35" rx="6" fill="#f5f5f5" stroke="#666" stroke-width="1.5"/>
  <text x="420" y="312" text-anchor="middle" font-size="10">Spoke4</text>
  <rect x="480" y="290" width="80" height="35" rx="6" fill="#f5f5f5" stroke="#666" stroke-width="1.5"/>
  <text x="520" y="312" text-anchor="middle" font-size="10">Spoke5</text>
  <line x1="420" y1="253" x2="420" y2="288" stroke="#666" stroke-width="1" marker-end="url(#arrow-ch22)"/>
  <line x1="470" y1="230" x2="520" y2="288" stroke="#666" stroke-width="1" marker-end="url(#arrow-ch22)"/>
  <!-- Labels -->
  <text x="180" y="272" text-anchor="middle" font-size="9" fill="#555">Connected VNets</text>
  <text x="470" y="272" text-anchor="middle" font-size="9" fill="#555">Connected VNets</text>
</svg>
</div>

## Key concepts

### Virtual WAN SKU comparison

| Feature | Basic | Standard |
|---------|-------|----------|
| Site-to-site VPN | Yes | Yes |
| Point-to-site VPN | No | Yes |
| ExpressRoute | No | Yes |
| VNet-to-VNet transit through hub | No | Yes |
| Hub-to-hub connectivity | No | Yes |
| Azure Firewall in hub | No | Yes |
| NVA in hub | No | Yes |

### Scale units

Each VPN gateway scale unit provides approximately 500 Mbps of aggregate throughput. Common configurations:

| Scale units | Aggregate throughput | Max S2S connections |
|-------------|---------------------|---------------------|
| 1 | 500 Mbps | 500 |
| 2 | 1 Gbps | 500 |
| 20 | 10 Gbps | 1000 |
| 40 | 20 Gbps | 2000 |

---

## Task 1: Create the Virtual WAN resource

Provision a Virtual WAN resource with the Standard SKU to support transit routing, multiple gateway types, and hub-to-hub communication.

### Azure CLI

```bash
# Define variables
RG="rg-vwan-challenge22"
LOCATION="eastus"
VWAN_NAME="vwan-contoso"

# Create resource group
az group create \
  --name $RG \
  --location $LOCATION

# Create Virtual WAN with Standard SKU
az network vwan create \
  --name $VWAN_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --type Standard \
  --branch-to-branch-traffic true
```

### Azure PowerShell

```powershell
# Define variables
$RG = "rg-vwan-challenge22"
$Location = "eastus"
$VwanName = "vwan-contoso"

# Create resource group
New-AzResourceGroup -Name $RG -Location $Location

# Create Virtual WAN with Standard SKU
New-AzVirtualWan `
  -ResourceGroupName $RG `
  -Name $VwanName `
  -Location $Location `
  -VirtualWANType Standard `
  -AllowBranchToBranchTraffic
```

:::tip Why Standard?
The Basic SKU only supports site-to-site VPN. It does not support spoke-to-spoke transit, ExpressRoute, point-to-site, Azure Firewall, or hub-to-hub connectivity. For most enterprise deployments, Standard is required.
:::

---

## Task 2: Create a virtual hub in the primary region

Deploy a virtual hub in East US with a dedicated address prefix. The hub address space must not overlap with any connected spoke VNets.

### Azure CLI

```bash
# Create virtual hub in East US
az network vhub create \
  --name "hub-eastus" \
  --resource-group $RG \
  --vwan $VWAN_NAME \
  --address-prefix "10.1.0.0/24" \
  --location "eastus" \
  --sku Standard
```

### Azure PowerShell

```powershell
# Get the Virtual WAN object
$vwan = Get-AzVirtualWan -ResourceGroupName $RG -Name $VwanName

# Create virtual hub in East US
New-AzVirtualHub `
  -ResourceGroupName $RG `
  -Name "hub-eastus" `
  -VirtualWan $vwan `
  -AddressPrefix "10.1.0.0/24" `
  -Location "eastus" `
  -HubRoutingPreference "VpnGateway"
```

:::warning Hub provisioning time
Virtual hub creation takes 20-30 minutes. The hub must reach **Succeeded** provisioning state before you can connect spokes or deploy gateways. Monitor the status with:
```bash
az network vhub show --name "hub-eastus" --resource-group $RG --query "provisioningState"
```
:::

---

## Task 3: Create spoke VNets and connect them to the hub

Create spoke VNets and establish connections to the virtual hub. Virtual WAN automatically handles routing between connected spokes.

### Azure CLI

```bash
# Create spoke VNets
az network vnet create \
  --name "vnet-spoke1" \
  --resource-group $RG \
  --location "eastus" \
  --address-prefixes "10.10.0.0/16" \
  --subnet-name "workload" \
  --subnet-prefixes "10.10.1.0/24"

az network vnet create \
  --name "vnet-spoke2" \
  --resource-group $RG \
  --location "eastus" \
  --address-prefixes "10.20.0.0/16" \
  --subnet-name "workload" \
  --subnet-prefixes "10.20.1.0/24"

# Connect spoke1 to the virtual hub
az network vhub connection create \
  --name "conn-spoke1" \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --remote-vnet "vnet-spoke1" \
  --internet-security true

# Connect spoke2 to the virtual hub
az network vhub connection create \
  --name "conn-spoke2" \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --remote-vnet "vnet-spoke2" \
  --internet-security true
```

### Azure PowerShell

```powershell
# Create spoke VNets
$spoke1 = New-AzVirtualNetwork `
  -ResourceGroupName $RG `
  -Name "vnet-spoke1" `
  -Location "eastus" `
  -AddressPrefix "10.10.0.0/16"

Add-AzVirtualNetworkSubnetConfig `
  -Name "workload" `
  -VirtualNetwork $spoke1 `
  -AddressPrefix "10.10.1.0/24"
$spoke1 | Set-AzVirtualNetwork

$spoke2 = New-AzVirtualNetwork `
  -ResourceGroupName $RG `
  -Name "vnet-spoke2" `
  -Location "eastus" `
  -AddressPrefix "10.20.0.0/16"

Add-AzVirtualNetworkSubnetConfig `
  -Name "workload" `
  -VirtualNetwork $spoke2 `
  -AddressPrefix "10.20.1.0/24"
$spoke2 | Set-AzVirtualNetwork

# Get hub object
$hub = Get-AzVirtualHub -ResourceGroupName $RG -Name "hub-eastus"

# Connect spoke1
$spoke1Ref = Get-AzVirtualNetwork -ResourceGroupName $RG -Name "vnet-spoke1"
New-AzVirtualHubVnetConnection `
  -ResourceGroupName $RG `
  -VirtualHubName "hub-eastus" `
  -Name "conn-spoke1" `
  -RemoteVirtualNetwork $spoke1Ref `
  -EnableInternetSecurity $true

# Connect spoke2
$spoke2Ref = Get-AzVirtualNetwork -ResourceGroupName $RG -Name "vnet-spoke2"
New-AzVirtualHubVnetConnection `
  -ResourceGroupName $RG `
  -VirtualHubName "hub-eastus" `
  -Name "conn-spoke2" `
  -RemoteVirtualNetwork $spoke2Ref `
  -EnableInternetSecurity $true
```

---

## Task 4: Deploy a VPN gateway in the virtual hub

Deploy a site-to-site VPN gateway within the hub. Select scale units based on required throughput -- Contoso needs 1 Gbps aggregate bandwidth.

### Azure CLI

```bash
# Deploy VPN gateway in the hub (scale unit 2 = ~1 Gbps)
az network vpn-gateway create \
  --name "vpngw-hub-eastus" \
  --resource-group $RG \
  --vhub "hub-eastus" \
  --location "eastus" \
  --scale-unit 2 \
  --no-wait
```

### Azure PowerShell

```powershell
# Deploy VPN gateway in the hub (scale unit 2 = ~1 Gbps)
New-AzVpnGateway `
  -ResourceGroupName $RG `
  -Name "vpngw-hub-eastus" `
  -VirtualHub $hub `
  -VpnGatewayScaleUnit 2
```

:::warning Gateway provisioning
VPN gateway creation inside a virtual hub takes 25-45 minutes. Do not proceed to creating connections until the gateway reaches **Succeeded** state:
```bash
az network vpn-gateway show \
  --name "vpngw-hub-eastus" \
  --resource-group $RG \
  --query "provisioningState"
```
:::

---

## Task 5: Create a VPN site and connection

Define the on-premises branch as a VPN site and create the S2S connection through the Virtual WAN VPN gateway.

### Azure CLI

```bash
# Create a VPN site representing the on-premises branch
az network vpn-site create \
  --name "site-branch-nyc" \
  --resource-group $RG \
  --location "eastus" \
  --ip-address "203.0.113.10" \
  --address-prefixes "192.168.0.0/16" \
  --virtual-wan $VWAN_NAME \
  --device-vendor "Cisco" \
  --device-model "ISR4321" \
  --link-speed 100

# Create the VPN gateway connection to the site
az network vpn-gateway connection create \
  --name "conn-branch-nyc" \
  --resource-group $RG \
  --gateway-name "vpngw-hub-eastus" \
  --remote-vpn-site "site-branch-nyc"
```

### Azure PowerShell

```powershell
# Create a VPN site representing the on-premises branch
$vpnSite = New-AzVpnSite `
  -ResourceGroupName $RG `
  -Name "site-branch-nyc" `
  -Location "eastus" `
  -IpAddress "203.0.113.10" `
  -AddressSpace @("192.168.0.0/16") `
  -VirtualWanResourceGroupName $RG `
  -VirtualWanName $VwanName `
  -DeviceModel "ISR4321" `
  -DeviceVendor "Cisco" `
  -LinkSpeedInMbps 100

# Create VPN gateway connection
$vpnSiteObj = Get-AzVpnSite -ResourceGroupName $RG -Name "site-branch-nyc"
$vpnGw = Get-AzVpnGateway -ResourceGroupName $RG -Name "vpngw-hub-eastus"

New-AzVpnConnection `
  -ResourceGroupName $RG `
  -ParentResourceName "vpngw-hub-eastus" `
  -Name "conn-branch-nyc" `
  -VpnSite $vpnSiteObj
```

---

## Task 6: Verify spoke-to-spoke connectivity

With Standard SKU, spoke-to-spoke transit routing is automatic through the hub. Verify by checking the effective routes on spoke connections.

### Azure CLI

```bash
# Check effective routes for the virtual hub
az network vhub get-effective-routes \
  --name "hub-eastus" \
  --resource-group $RG

# Verify hub connection status
az network vhub connection show \
  --name "conn-spoke1" \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --query "{name:name, status:provisioningState, routingConfig:routingConfiguration}"

# List all connections on the hub
az network vhub connection list \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --output table
```

### Azure PowerShell

```powershell
# Get hub connection details
Get-AzVirtualHubVnetConnection `
  -ResourceGroupName $RG `
  -VirtualHubName "hub-eastus" |
  Select-Object Name, ProvisioningState, RoutingConfiguration

# Verify hub effective routes
Get-AzVirtualHubEffectiveRoute `
  -ResourceGroupName $RG `
  -VirtualHubName "hub-eastus"
```

---

## Break & fix

### Scenario 1: Basic SKU with VPN gateway fails

**Symptom:** Attempting to deploy a VPN gateway fails with an error about unsupported features.

**Root cause:** The Virtual WAN was created with `--type Basic` but gateways other than basic S2S VPN require Standard SKU. Additionally, Basic does not support spoke-to-spoke transit.

**Fix:**
```bash
# Upgrade from Basic to Standard
az network vwan update \
  --name $VWAN_NAME \
  --resource-group $RG \
  --type Standard
```

:::note
Upgrading from Basic to Standard is a non-disruptive operation. However, downgrading from Standard to Basic is not supported.
:::

---

### Scenario 2: Spoke connectivity not working after hub connection

**Symptom:** VMs in spoke VNets cannot reach each other even though connections show Succeeded status.

**Root cause:** The virtual hub has not fully provisioned its routing infrastructure. The hub routing state must be **Provisioned** (not just the connection).

**Diagnosis:**
```bash
# Check hub routing state
az network vhub show \
  --name "hub-eastus" \
  --resource-group $RG \
  --query "{routingState:routingState, provisioningState:provisioningState}"
```

**Fix:** Wait for `routingState` to show `Provisioned`. If stuck, remove and recreate the connection:
```bash
az network vhub connection delete \
  --name "conn-spoke1" \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --yes

# Wait 2 minutes, then recreate
az network vhub connection create \
  --name "conn-spoke1" \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --remote-vnet "vnet-spoke1"
```

---

### Scenario 3: Insufficient throughput from VPN gateway

**Symptom:** Branch office reports slow connectivity. Monitoring shows the VPN gateway is saturated at 500 Mbps.

**Root cause:** The gateway was deployed with scale unit 1, providing only 500 Mbps aggregate throughput.

**Fix:**
```bash
# Update the VPN gateway scale unit
az network vpn-gateway update \
  --name "vpngw-hub-eastus" \
  --resource-group $RG \
  --scale-unit 4
```

---

## Cleanup

```bash
# Delete the entire resource group and all resources
az group delete --name $RG --yes --no-wait
```

```powershell
# PowerShell cleanup
Remove-AzResourceGroup -Name "rg-vwan-challenge22" -Force -AsJob
```

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-22-q1",
    question: "Contoso needs spoke-to-spoke transit routing through a Virtual WAN hub, ExpressRoute connectivity, and Azure Firewall integration. Which Virtual WAN SKU must they select?",
    options: [
      "Standard",
      "Basic",
      "Premium",
      "Enterprise"
    ],
    correctIndex: 0,
    explanation: "The Standard SKU is required for spoke-to-spoke transit, ExpressRoute, Point-to-Site VPN, Azure Firewall in hub, NVA in hub, and hub-to-hub connectivity. The Basic SKU only supports site-to-site VPN without transit routing. Premium and Enterprise SKUs do not exist for Virtual WAN."
  },
  {
    id: "az700-22-q2",
    question: "A VPN gateway in a Virtual WAN hub is configured with 2 scale units. What is the approximate aggregate throughput?",
    options: [
      "250 Mbps",
      "500 Mbps",
      "1 Gbps",
      "2 Gbps"
    ],
    correctIndex: 2,
    explanation: "Each VPN gateway scale unit provides approximately 500 Mbps of aggregate throughput. With 2 scale units, the gateway provides approximately 1 Gbps. Scale unit 1 = 500 Mbps, scale unit 2 = 1 Gbps, scale unit 20 = 10 Gbps."
  },
  {
    id: "az700-22-q3",
    question: "After creating a virtual hub and connecting two spoke VNets, VMs in the spokes cannot communicate. The hub connection shows Succeeded. What should you check next?",
    options: [
      "Verify the hub routingState shows Provisioned",
      "Create a UDR in each spoke to route traffic to the hub",
      "Enable VNet peering between the two spokes directly",
      "Add a route to the defaultRouteTable manually"
    ],
    correctIndex: 0,
    explanation: "In Virtual WAN, spoke-to-spoke transit routing is automatic when using Standard SKU. No UDRs or manual peering is needed. However, the hub must have its routingState as Provisioned for routing to work. The connection provisioningState and the hub routingState are separate -- both must be healthy."
  },
  {
    id: "az700-22-q4",
    question: "Which CLI command creates a VPN site representing an on-premises branch in Azure Virtual WAN?",
    options: [
      "az network vpn-site create --ip-address --name --resource-group --virtual-wan",
      "az network vnet-gateway create --name --resource-group --vnet --gateway-type Vpn",
      "az network local-gateway create --name --resource-group --gateway-ip-address",
      "az network vpn-gateway connection create --gateway-name --name --resource-group"
    ],
    correctIndex: 0,
    explanation: "In Virtual WAN, on-premises branches are represented as VPN sites using 'az network vpn-site create'. This is different from traditional VPN where you create a local network gateway. The VPN site is associated with the Virtual WAN resource and connected via the hub VPN gateway."
  },
  {
    id: "az700-22-q5",
    question: "What happens when you attempt to downgrade a Virtual WAN from Standard to Basic SKU?",
    options: [
      "The downgrade succeeds but disables all transit routing",
      "The downgrade is not supported -- you can only upgrade from Basic to Standard",
      "The downgrade requires removing all ExpressRoute connections first",
      "The downgrade triggers a 30-minute maintenance window"
    ],
    correctIndex: 1,
    explanation: "Downgrading from Standard to Basic is not supported in Azure Virtual WAN. You can only upgrade from Basic to Standard. If you need a Basic deployment, you must create a new Virtual WAN resource. The upgrade from Basic to Standard is a non-disruptive operation."
  }
]} />
