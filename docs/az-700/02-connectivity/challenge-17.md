---
sidebar_position: 4
title: "Challenge 17: Point-to-Site VPN & Client Configuration"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 17: Point-to-site VPN and client configuration

:::info Estimated time and cost

**60-90 minutes** | **~$0.19/h** (VPN Gateway) | **Exam weight: 20-25%**

:::

## Scenario

Contoso's remote workforce needs secure access to Azure virtual networks from their personal and corporate laptops. The networking team must configure point-to-site (P2S) VPN connectivity on an existing VPN gateway, supporting multiple tunnel types to accommodate Windows, macOS, and Linux clients. They need to generate and distribute VPN client configuration packages and understand when to recommend each tunnel type based on organizational requirements.

## Exam skills covered

| Skill | Description |
|-------|-------------|
| Select an appropriate virtual network gateway SKU | Choose a SKU that supports P2S and required tunnel types |
| Select and configure a tunnel type | Configure OpenVPN, IKEv2, or SSTP based on client OS requirements |
| Implement a VPN client configuration file | Generate and distribute VPN client packages |
| Specify Azure requirements for Azure Network Adapter | Understand simplified P2S via Windows Admin Center |

## Architecture overview

<div style={{textAlign: 'center', margin: '20px 0'}}>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 300" style={{maxWidth: '620px', height: 'auto'}} font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <marker id="arrow-ch17" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666"/>
    </marker>
  </defs>
  <!-- Remote Clients -->
  <rect x="15" y="30" width="200" height="180" rx="8" fill="#d5e8d4" stroke="#82b366" stroke-width="2"/>
  <text x="115" y="52" text-anchor="middle" font-size="12" font-weight="bold">Remote Clients</text>
  <rect x="30" y="62" width="170" height="28" rx="4" fill="#f5f5f5" stroke="#666" stroke-width="1"/>
  <text x="115" y="80" text-anchor="middle" font-size="10">🖥 Windows laptop</text>
  <rect x="30" y="96" width="170" height="28" rx="4" fill="#f5f5f5" stroke="#666" stroke-width="1"/>
  <text x="115" y="114" text-anchor="middle" font-size="10">🍎 macOS laptop</text>
  <rect x="30" y="130" width="170" height="28" rx="4" fill="#f5f5f5" stroke="#666" stroke-width="1"/>
  <text x="115" y="148" text-anchor="middle" font-size="10">🐧 Linux laptop</text>
  <rect x="30" y="164" width="170" height="28" rx="4" fill="#f5f5f5" stroke="#666" stroke-width="1"/>
  <text x="115" y="182" text-anchor="middle" font-size="10">🏢 Windows (corp)</text>
  <!-- Connections -->
  <line x1="215" y1="76" x2="375" y2="76" stroke="#82b366" stroke-width="1.5" marker-end="url(#arrow-ch17)"/>
  <text x="295" y="70" text-anchor="middle" font-size="9" fill="#2e7d32">OpenVPN</text>
  <line x1="215" y1="110" x2="375" y2="100" stroke="#6c8ebf" stroke-width="1.5" marker-end="url(#arrow-ch17)"/>
  <text x="295" y="100" text-anchor="middle" font-size="9" fill="#6c8ebf">IKEv2</text>
  <line x1="215" y1="144" x2="375" y2="124" stroke="#82b366" stroke-width="1.5" marker-end="url(#arrow-ch17)"/>
  <text x="295" y="134" text-anchor="middle" font-size="9" fill="#2e7d32">OpenVPN</text>
  <line x1="215" y1="178" x2="375" y2="148" stroke="#d6b656" stroke-width="1.5" marker-end="url(#arrow-ch17)"/>
  <text x="295" y="166" text-anchor="middle" font-size="9" fill="#d6b656">SSTP</text>
  <!-- VPN Gateway -->
  <rect x="380" y="40" width="225" height="140" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
  <text x="492" y="65" text-anchor="middle" font-size="12" font-weight="bold">VPN Gateway (VpnGw1)</text>
  <text x="492" y="85" text-anchor="middle" font-size="10" fill="#555">P2S Address Pool:</text>
  <text x="492" y="102" text-anchor="middle" font-size="11" font-weight="bold">172.16.201.0/24</text>
  <rect x="400" y="115" width="185" height="50" rx="4" fill="#e1d5e7" stroke="#9673a6" stroke-width="1"/>
  <text x="492" y="137" text-anchor="middle" font-size="10">Tunnel types:</text>
  <text x="492" y="155" text-anchor="middle" font-size="9" fill="#555">OpenVPN | IKEv2 | SSTP</text>
  <!-- VNet -->
  <rect x="400" y="210" width="185" height="60" rx="8" fill="#fff2cc" stroke="#d6b656" stroke-width="2"/>
  <text x="492" y="235" text-anchor="middle" font-size="12" font-weight="bold">VNet</text>
  <text x="492" y="255" text-anchor="middle" font-size="10" fill="#555">10.60.0.0/16</text>
  <line x1="492" y1="180" x2="492" y2="208" stroke="#666" stroke-width="1.5" marker-end="url(#arrow-ch17)"/>
</svg>
</div>

## Prerequisites

This challenge builds on a VPN gateway deployed in a previous challenge. If you do not have one, deploy the gateway first using the setup commands in Task 1.

---

## Task 1: Deploy the base VPN gateway (if not already deployed)

If you already have a VPN gateway from Challenge 14, skip to Task 2.

### Azure CLI

```bash
# Variables
RG="rg-p2s-lab"
LOCATION="eastus"
VNET_NAME="vnet-contoso-p2s"
GW_SUBNET_PREFIX="10.60.255.0/27"
VNET_PREFIX="10.60.0.0/16"
GW_NAME="vpngw-contoso-p2s"
GW_PIP="pip-vpngw-p2s"

# Create resource group and VNet
az group create --name $RG --location $LOCATION

az network vnet create \
  --resource-group $RG \
  --name $VNET_NAME \
  --address-prefixes $VNET_PREFIX \
  --subnet-name GatewaySubnet \
  --subnet-prefixes $GW_SUBNET_PREFIX

# Create public IP for VPN gateway
az network public-ip create \
  --resource-group $RG \
  --name $GW_PIP \
  --allocation-method Static \
  --sku Standard

# Create VPN gateway (takes 30-45 minutes)
az network vnet-gateway create \
  --resource-group $RG \
  --name $GW_NAME \
  --vnet $VNET_NAME \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw1 \
  --vpn-gateway-generation Generation1 \
  --public-ip-addresses $GW_PIP \
  --no-wait
```

### Azure PowerShell

```powershell
# Variables
$rg = "rg-p2s-lab"
$location = "eastus"
$vnetName = "vnet-contoso-p2s"
$gwSubnetPrefix = "10.60.255.0/27"
$vnetPrefix = "10.60.0.0/16"
$gwName = "vpngw-contoso-p2s"
$gwPipName = "pip-vpngw-p2s"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Create VNet with GatewaySubnet
$gwSubnet = New-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -AddressPrefix $gwSubnetPrefix
$vnet = New-AzVirtualNetwork -Name $vnetName -ResourceGroupName $rg `
  -Location $location -AddressPrefix $vnetPrefix -Subnet $gwSubnet

# Create public IP
$gwPip = New-AzPublicIpAddress -Name $gwPipName -ResourceGroupName $rg `
  -Location $location -AllocationMethod Static -Sku Standard

# Get subnet reference
$gwSubnetRef = Get-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -VirtualNetwork $vnet

# Create IP configuration
$gwIpConfig = New-AzVirtualNetworkGatewayIpConfig -Name "gwIpConfig" `
  -SubnetId $gwSubnetRef.Id -PublicIpAddressId $gwPip.Id

# Create VPN gateway (takes 30-45 minutes)
New-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg `
  -Location $location -IpConfigurations $gwIpConfig `
  -GatewayType Vpn -VpnType RouteBased `
  -GatewaySku VpnGw1 -VpnGatewayGeneration Generation1 -AsJob
```

---

## Task 2: Configure P2S with OpenVPN tunnel type

OpenVPN is the recommended tunnel type for cross-platform support (Windows, macOS, Linux). It uses TLS and operates on port 443.

### Azure CLI

```bash
# Configure P2S address pool and OpenVPN protocol
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --address-prefixes "172.16.201.0/24" \
  --client-protocol OpenVPN

# Verify P2S configuration
az network vnet-gateway show \
  --resource-group $RG \
  --name $GW_NAME \
  --query "vpnClientConfiguration" \
  --output json
```

### Azure PowerShell

```powershell
# Get the gateway
$gw = Get-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg

# Configure P2S with OpenVPN
Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -VpnClientAddressPool "172.16.201.0/24" `
  -VpnClientProtocol "OpenVPN"

# Verify configuration
$gw = Get-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg
$gw.VpnClientConfiguration | Format-List
```

:::tip Exam tip
OpenVPN is the only tunnel type that supports all three major authentication methods: certificates, Microsoft Entra ID, and RADIUS. It also works across Windows, macOS, Linux, iOS, and Android.
:::

---

## Task 3: Configure IKEv2 tunnel type

IKEv2 is a standards-based IPsec VPN solution natively supported on Windows 10+ and macOS without additional client software.

### Azure CLI

```bash
# Configure P2S with both IKEv2 and OpenVPN protocols
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --address-prefixes "172.16.201.0/24" \
  --client-protocol IkeV2 OpenVPN

# Verify the updated configuration
az network vnet-gateway show \
  --resource-group $RG \
  --name $GW_NAME \
  --query "vpnClientConfiguration.vpnClientProtocols" \
  --output tsv
```

### Azure PowerShell

```powershell
$gw = Get-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg

# Configure both IKEv2 and OpenVPN
Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -VpnClientAddressPool "172.16.201.0/24" `
  -VpnClientProtocol "IkeV2", "OpenVPN"
```

:::note IKEv2 considerations
- IKEv2 uses UDP ports 500 and 4500, which may be blocked by some corporate firewalls
- Supports a maximum of 128 concurrent connections per gateway instance
- Required for Always On VPN configuration with machine-level tunnels
- Native client support on Windows 10/11 and macOS (no third-party app needed)
:::

---

## Task 4: Configure SSTP tunnel type

SSTP (Secure Socket Tunneling Protocol) is a Windows-only protocol that uses TCP port 443, making it ideal for connections from behind restrictive firewalls.

### Azure CLI

```bash
# Configure P2S with IKEv2 + OpenVPN (cross-platform, recommended)
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --address-prefixes "172.16.201.0/24" \
  --client-protocol IkeV2 OpenVPN

# Alternative: IKEv2 + SSTP (Windows-only fallback with firewall traversal)
# az network vnet-gateway update \
#   --resource-group $RG \
#   --name $GW_NAME \
#   --address-prefixes "172.16.201.0/24" \
#   --client-protocol IkeV2 SSTP
```

### Azure PowerShell

```powershell
$gw = Get-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg

# IKEv2 + OpenVPN (cross-platform, recommended)
Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -VpnClientAddressPool "172.16.201.0/24" `
  -VpnClientProtocol "IkeV2", "OpenVPN"

# Alternative: IKEv2 + SSTP (Windows-only fallback with firewall traversal)
# Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
#   -VpnClientAddressPool "172.16.201.0/24" `
#   -VpnClientProtocol "IkeV2", "SSTP"
```

### SSTP characteristics

| Property | Detail |
|----------|--------|
| Supported OS | Windows only |
| Port | TCP 443 (same as HTTPS) |
| Firewall friendliness | Excellent - traverses most firewalls and proxies |
| Max connections | 128 per gateway instance |
| Protocol limitation | Cannot be combined with OpenVPN on the same gateway (both use TLS; IKEv2+SSTP is valid) |

:::warning Important limitation
SSTP and OpenVPN cannot coexist on the same gateway because both use TLS-based tunneling on TCP 443. Valid combinations are: IKEv2+OpenVPN (cross-platform), IKEv2+SSTP (Windows with firewall traversal), or IKEv2 alone. If you need both macOS/Linux support and firewall traversal, choose IKEv2+OpenVPN.
:::

---

## Task 5: Generate and download VPN client configuration package

The VPN client configuration package contains the settings needed for client devices to connect via P2S.

### Azure CLI

```bash
# Generate VPN client configuration (returns a URL to download the zip file)
az network vnet-gateway vpn-client generate \
  --resource-group $RG \
  --name $GW_NAME \
  --processor-architecture Amd64

# Retrieve the pre-generated VPN client URL
az network vnet-gateway vpn-client show-url \
  --resource-group $RG \
  --name $GW_NAME
```

### Azure PowerShell

```powershell
# Generate the VPN client configuration package
$profile = New-AzVpnClientConfiguration -ResourceGroupName $rg `
  -Name $gwName -AuthenticationMethod "EapTls"

# The URL to download the client package
$profile.VPNProfileSASUrl
```

### What is in the client package

The downloaded ZIP file contains folders for each configured protocol:

<div style={{textAlign: 'center', margin: '20px 0'}}>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 200" style={{maxWidth: '480px', height: 'auto'}} font-family="Segoe UI, Arial, sans-serif">
  <!-- ZIP file header -->
  <rect x="20" y="10" width="440" height="30" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="1.5"/>
  <text x="240" y="30" text-anchor="middle" font-size="11" font-weight="bold">📦 VpnClientConfiguration.zip</text>
  <!-- Folder entries -->
  <rect x="40" y="50" width="420" height="28" rx="4" fill="#d5e8d4" stroke="#82b366" stroke-width="1"/>
  <text x="55" y="68" font-size="10" font-weight="bold">OpenVPN/</text>
  <text x="250" y="68" font-size="9" fill="#555">OpenVPN profile (.ovpn file)</text>
  <rect x="40" y="82" width="420" height="28" rx="4" fill="#fff2cc" stroke="#d6b656" stroke-width="1"/>
  <text x="55" y="100" font-size="10" font-weight="bold">WindowsAmd64/</text>
  <text x="250" y="100" font-size="9" fill="#555">Windows 64-bit native client installer</text>
  <rect x="40" y="114" width="420" height="28" rx="4" fill="#fff2cc" stroke="#d6b656" stroke-width="1"/>
  <text x="55" y="132" font-size="10" font-weight="bold">WindowsX86/</text>
  <text x="250" y="132" font-size="9" fill="#555">Windows 32-bit native client installer</text>
  <rect x="40" y="146" width="420" height="28" rx="4" fill="#f5f5f5" stroke="#666" stroke-width="1"/>
  <text x="55" y="164" font-size="10" font-weight="bold">Generic/</text>
  <text x="250" y="164" font-size="9" fill="#555">Profile XML for manual configuration</text>
  <rect x="40" y="178" width="420" height="28" rx="4" fill="#e1d5e7" stroke="#9673a6" stroke-width="1"/>
  <text x="55" y="196" font-size="10" font-weight="bold">AzureVPN/</text>
  <text x="250" y="196" font-size="9" fill="#555">Azure VPN Client profile (azurevpnconfig.xml)</text>
</svg>
</div>

| Client | Protocol used | Configuration file |
|--------|--------------|-------------------|
| Azure VPN Client (Windows/macOS) | OpenVPN | AzureVPN/azurevpnconfig.xml |
| OpenVPN Connect | OpenVPN | OpenVPN/vpnconfig.ovpn |
| Windows native VPN | IKEv2/SSTP | WindowsAmd64/ installer |
| macOS native VPN | IKEv2 | Generic/ mobileconfig |
| strongSwan (Linux) | IKEv2 | Generic/ profile |

---

## Task 6: Understand Azure Network Adapter

Azure Network Adapter is a feature in Windows Admin Center that provides a simplified point-to-site VPN setup experience for Windows Server machines.

### Key characteristics

| Feature | Description |
|---------|-------------|
| Purpose | Connect on-premises Windows Server to Azure VNet without complex VPN setup |
| Interface | Windows Admin Center plugin |
| Protocol used | IKEv2 P2S VPN |
| Authentication | Certificate-based (auto-generated) |
| Gateway requirement | Requires existing VPN gateway with P2S configured |
| Use case | Hybrid management, single-server connectivity |

### Requirements for Azure Network Adapter

1. Windows Admin Center installed and registered with Azure
2. An existing VPN gateway with a P2S-capable SKU (VpnGw1 or higher)
3. The gateway must have P2S address pool configured
4. Azure subscription permissions to manage the VPN gateway
5. Windows Server 2012 R2 or later on the on-premises machine

:::tip Exam tip
Azure Network Adapter automates certificate generation, gateway configuration, and client installation. You do not need to manually generate certificates or download client packages when using this feature. It is a "wizard-based" experience through Windows Admin Center.
:::

---

## Task 7: Understand VPN gateway SKU capabilities for P2S

### SKU comparison for P2S

| SKU | Max P2S connections | Supported tunnels | Throughput |
|-----|--------------------:|-------------------|-----------|
| Basic | 128 | SSTP only | 100 Mbps |
| VpnGw1 | 250 | SSTP, IKEv2, OpenVPN | 650 Mbps |
| VpnGw2 | 500 | SSTP, IKEv2, OpenVPN | 1.0 Gbps |
| VpnGw3 | 1,000 | SSTP, IKEv2, OpenVPN | 1.25 Gbps |
| VpnGw4 | 5,000 | SSTP, IKEv2, OpenVPN | 5.0 Gbps |
| VpnGw5 | 10,000 | SSTP, IKEv2, OpenVPN | 10.0 Gbps |

:::warning Basic SKU limitation
The Basic SKU only supports SSTP tunnel type (Windows only). It does not support IKEv2 or OpenVPN. For cross-platform P2S connectivity, use VpnGw1 or higher.
:::

---

## Break and fix scenarios

### Scenario 1: Address pool overlap

**Symptom:** Clients connect to VPN but cannot reach resources in the VNet.

**Root cause:** The P2S address pool (172.16.201.0/24) overlaps with an on-premises subnet or another VNet address space.

**Fix:** Choose a P2S address pool that does not overlap with any connected network:

```bash
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --address-prefixes "192.168.100.0/24"
```

### Scenario 2: macOS client cannot connect (wrong tunnel type)

**Symptom:** macOS users report connection failures. The gateway is configured with SSTP only.

**Root cause:** SSTP is Windows-only. macOS requires IKEv2 or OpenVPN.

**Fix:** Add IKEv2 or OpenVPN to the gateway configuration:

```bash
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --client-protocol OpenVPN IkeV2
```

### Scenario 3: Client configuration package is outdated

**Symptom:** Client connects with old settings after gateway reconfiguration.

**Root cause:** The client is using a VPN profile generated before the gateway was updated.

**Fix:** Regenerate the VPN client configuration and redistribute:

```bash
az network vnet-gateway vpn-client generate \
  --resource-group $RG \
  --name $GW_NAME \
  --processor-architecture Amd64
```

### Scenario 4: OpenVPN client fails on port 443

**Symptom:** OpenVPN client reports timeout connecting on port 443.

**Root cause:** An intermediate proxy or firewall is intercepting TLS traffic and breaking the OpenVPN handshake.

**Fix:** Ensure the proxy or firewall allows direct TLS connections to the gateway public IP. Consider adding an exclusion for the gateway IP in the proxy configuration, or switch to IKEv2 (UDP 500/4500) if UDP is permitted.

---

## Cleanup

```bash
# Delete the resource group and all resources within it
az group delete --name $RG --yes --no-wait
```

```powershell
# PowerShell cleanup
Remove-AzResourceGroup -Name "rg-p2s-lab" -Force -AsJob
```

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-17-q1",
    question: "Which tunnel type supports Windows, macOS, and Linux clients?",
    options: [
      "OpenVPN",
      "SSTP",
      "IKEv2",
      "L2TP"
    ],
    correctIndex: 0,
    explanation: "OpenVPN supports Windows, macOS, Linux, iOS, and Android. SSTP is Windows-only. IKEv2 supports Windows and macOS natively but requires additional software on Linux. L2TP is not supported for Azure P2S VPN."
  },
  {
    id: "az700-17-q2",
    question: "A company needs P2S VPN connectivity for 300 concurrent remote users. Which is the minimum VPN gateway SKU that supports this requirement?",
    options: [
      "Basic",
      "VpnGw1",
      "VpnGw2",
      "VpnGw3"
    ],
    correctIndex: 2,
    explanation: "VpnGw2 supports up to 500 P2S connections. VpnGw1 supports only 250, which is insufficient for 300 users. Basic supports only 128 connections and is limited to SSTP."
  },
  {
    id: "az700-17-q3",
    question: "Which protocol uses TCP port 443 and works only on Windows?",
    options: [
      "OpenVPN",
      "IKEv2",
      "SSTP",
      "WireGuard"
    ],
    correctIndex: 2,
    explanation: "SSTP (Secure Socket Tunneling Protocol) uses TCP port 443 and is supported only on Windows. OpenVPN also uses port 443 but is cross-platform. IKEv2 uses UDP 500 and 4500."
  },
  {
    id: "az700-17-q4",
    question: "What does the command 'az network vnet-gateway vpn-client generate' return?",
    options: [
      "A URL to download the VPN client configuration ZIP file",
      "The VPN client configuration XML inline",
      "A list of connected P2S clients",
      "The gateway public IP address"
    ],
    correctIndex: 0,
    explanation: "The 'az network vnet-gateway vpn-client generate' command generates the VPN client configuration and returns a URL (SAS URL) to download the ZIP file containing client profiles for all configured protocols."
  },
  {
    id: "az700-17-q5",
    question: "Which tunnel type is required for Always On VPN with machine-level tunneling?",
    options: [
      "OpenVPN",
      "SSTP",
      "IKEv2",
      "GRE"
    ],
    correctIndex: 2,
    explanation: "Always On VPN with device (machine) tunnel requires IKEv2 protocol. The device tunnel connects before any user logs on and uses machine certificate authentication. OpenVPN can be used for the user tunnel but not the device tunnel."
  },
  {
    id: "az700-17-q6",
    question: "What is the purpose of Azure Network Adapter in Windows Admin Center?",
    options: [
      "To configure site-to-site VPN between on-premises networks",
      "To provide a simplified wizard for connecting a Windows Server to an Azure VNet via P2S",
      "To manage Azure virtual NIC settings on VMs",
      "To configure ExpressRoute private peering"
    ],
    correctIndex: 1,
    explanation: "Azure Network Adapter is a Windows Admin Center feature that simplifies connecting an on-premises Windows Server to an Azure VNet using P2S VPN. It automates certificate generation, gateway configuration, and client setup."
  }
]} />

---

## Additional resources

- [About Azure Point-to-Site VPN](https://learn.microsoft.com/azure/vpn-gateway/point-to-site-about)
- [Configure OpenVPN for P2S VPN Gateway](https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-howto-openvpn)
- [Azure VPN Client versions](https://learn.microsoft.com/azure/vpn-gateway/azure-vpn-client-versions)
- [Azure Network Adapter overview](https://learn.microsoft.com/windows-server/manage/windows-admin-center/azure/azure-network-adapter)
