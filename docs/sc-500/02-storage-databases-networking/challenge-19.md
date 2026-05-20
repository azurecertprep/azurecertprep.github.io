---
sidebar_position: 19
title: "Challenge 19: Azure Virtual WAN and VPN Security"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 19: Azure Virtual WAN and VPN Security

## Exam skills covered

- Plan and implement Azure Virtual WAN security features
- Configure VPN security (IPsec/IKE policies)
- Implement site-to-site (S2S) VPN with custom IPsec policies
- Configure point-to-site (P2S) VPN with certificate or RADIUS authentication
- Secure Virtual WAN hubs with Azure Firewall integration
- Implement routing intent for traffic inspection

## Scenario

Contoso Ltd is consolidating their branch office connectivity through Azure Virtual WAN. They have 15 branch offices that need secure site-to-site VPN connections with strong IPsec policies, and a remote workforce of 2,000 employees requiring point-to-site VPN access. The security team mandates IKEv2 with AES-256-GCM encryption, PFS Group 14, and certificate-based authentication for P2S. Additionally, all inter-hub and branch-to-branch traffic must be inspected by Azure Firewall. You must implement the secure WAN architecture.

> **Note**: Virtual WAN hub deployment takes approximately 30 minutes and incurs ongoing costs. Plan accordingly for lab time and budget.

---

## Prerequisites

- Azure subscription with Network Contributor role
- Azure CLI installed and authenticated (`az login`)
- Understanding of VPN protocols (IPsec, IKEv2)
- Self-signed certificates for P2S testing (or willingness to create them)
- Budget awareness: Virtual WAN hubs incur hourly charges

---

## Task 1: Deploy Azure Virtual WAN and secured hub

Create a Virtual WAN instance and deploy a secured hub with Azure Firewall.

```bash
# Set variables
RG="rg-sc500-vwan"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Create Virtual WAN
az network vwan create \
  --name "vwan-contoso" \
  --resource-group $RG \
  --location $LOCATION \
  --type Standard \
  --branch-to-branch-traffic true

# Create Virtual WAN Hub (takes ~30 minutes)
az network vhub create \
  --name "hub-eastus" \
  --resource-group $RG \
  --vwan "vwan-contoso" \
  --location $LOCATION \
  --address-prefix 10.100.0.0/24 \
  --sku Standard

# Verify hub creation
az network vhub show \
  --name "hub-eastus" \
  --resource-group $RG \
  --query "{Name:name, State:provisioningState, AddressPrefix:addressPrefix}"
```

---

## Task 2: Create VPN Gateway with custom IPsec policies

Deploy a VPN gateway in the hub with hardened IPsec/IKE policies.

```bash
# Create VPN Gateway in the Virtual WAN hub (takes ~30 minutes)
az network vpn-gateway create \
  --name "vpngw-hub-eastus" \
  --resource-group $RG \
  --vhub "hub-eastus" \
  --location $LOCATION \
  --scale-unit 1

# Verify VPN Gateway
az network vpn-gateway show \
  --name "vpngw-hub-eastus" \
  --resource-group $RG \
  --query "{Name:name, State:provisioningState}"

# Create a VPN site representing a branch office
az network vpn-site create \
  --name "site-branch-newyork" \
  --resource-group $RG \
  --location $LOCATION \
  --virtual-wan "vwan-contoso" \
  --ip-address "203.0.113.10" \
  --address-prefixes "192.168.1.0/24" \
  --device-vendor "Cisco" \
  --device-model "ISR4321" \
  --link-speed 100

# Create a second VPN site
az network vpn-site create \
  --name "site-branch-chicago" \
  --resource-group $RG \
  --location $LOCATION \
  --virtual-wan "vwan-contoso" \
  --ip-address "203.0.113.20" \
  --address-prefixes "192.168.2.0/24" \
  --device-vendor "Fortinet" \
  --device-model "FortiGate-60F" \
  --link-speed 200

# Connect VPN site with custom IPsec policy (hardened)
az network vpn-gateway connection create \
  --name "conn-branch-newyork" \
  --gateway-name "vpngw-hub-eastus" \
  --resource-group $RG \
  --remote-vpn-site "$(az network vpn-site show --name site-branch-newyork --resource-group $RG --query id -o tsv)" \
  --vpn-site-link "$(az network vpn-site show --name site-branch-newyork --resource-group $RG --query 'vpnSiteLinks[0].id' -o tsv)" \
  --shared-key "C0nt0s0S3cur3K3y!2024"

# Note: Custom IPsec policies are applied at the connection level
# Using REST API for more granular IPsec control
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
VPN_GW_ID=$(az network vpn-gateway show --name "vpngw-hub-eastus" --resource-group $RG --query id -o tsv)

echo "Custom IPsec Policy Parameters:"
echo "  IKE Phase 1: IKEv2, AES-256-GCM, SHA-384, DH Group 14"
echo "  IKE Phase 2: AES-256-GCM, SHA-256, PFS Group 14"
echo "  SA Lifetime: 28800 seconds (8 hours)"
echo "  DPD Timeout: 45 seconds"
```

---

## Task 3: Configure Point-to-Site VPN with certificate authentication

Set up P2S VPN gateway with certificate-based authentication for remote workers.

```bash
# Create P2S VPN Gateway in the hub
az network p2s-vpn-gateway create \
  --name "p2svpngw-hub-eastus" \
  --resource-group $RG \
  --location $LOCATION \
  --vhub "hub-eastus" \
  --scale-unit 1 \
  --vpn-server-config "vsc-contoso-cert"

# First, create VPN Server Configuration with certificate auth
# Generate a root CA certificate (for testing)
# In production, use enterprise PKI

# Create VPN Server Configuration
az network vpn-server-config create \
  --name "vsc-contoso-cert" \
  --resource-group $RG \
  --location $LOCATION \
  --vpn-client-root-certs "[{\"name\":\"ContosoRootCA\",\"publicCertData\":\"<BASE64_ENCODED_ROOT_CERT>\"}]" \
  --vpn-protocols IkeV2 OpenVPN \
  --auth-types Certificate

# For production: Generate certificates using PowerShell
echo "=== Generate Root and Client Certificates (PowerShell) ==="
echo '
# Generate Root CA
$rootCert = New-SelfSignedCertificate -Type Custom `
  -KeySpec Signature `
  -Subject "CN=ContosoVPNRootCA" `
  -KeyExportPolicy Exportable `
  -HashAlgorithm sha256 `
  -KeyLength 2048 `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -KeyUsageProperty Sign `
  -KeyUsage CertSign

# Generate Client Certificate
$clientCert = New-SelfSignedCertificate -Type Custom `
  -DnsName "ContosoVPNClient" `
  -KeySpec Signature `
  -Subject "CN=ContosoVPNClient" `
  -KeyExportPolicy Exportable `
  -HashAlgorithm sha256 `
  -KeyLength 2048 `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -Signer $rootCert `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.2")

# Export Root CA public key (Base64)
$rootCertBase64 = [Convert]::ToBase64String($rootCert.RawData)
'

# Configure P2S address pool
echo "P2S Configuration:"
echo "  Address Pool: 172.16.0.0/16"
echo "  Protocols: IKEv2 and OpenVPN"
echo "  Authentication: Certificate-based"
echo "  DNS Servers: 10.100.0.4 (Azure DNS Private Resolver)"
```

---

## Task 4: Implement Azure Firewall in the Virtual WAN hub

Deploy Azure Firewall in the hub for traffic inspection between branches and VNets.

```bash
# Create Azure Firewall Policy
az network firewall policy create \
  --name "afwp-vwan-security" \
  --resource-group $RG \
  --location $LOCATION \
  --sku Premium \
  --threat-intel-mode Deny \
  --idps-mode Deny

# Create rule collection group for branch traffic
az network firewall policy rule-collection-group create \
  --name "rcg-branch-security" \
  --policy-name "afwp-vwan-security" \
  --resource-group $RG \
  --priority 200

# Add network rule collection - Allow branch-to-branch on specific ports
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-branch-to-branch" \
  --rule-collection-group-name "rcg-branch-security" \
  --policy-name "afwp-vwan-security" \
  --resource-group $RG \
  --collection-priority 100 \
  --action Allow \
  --rule-type NetworkRule \
  --rules "[{\"name\":\"Allow-HTTPS\",\"sourceAddresses\":[\"192.168.0.0/16\"],\"destinationAddresses\":[\"192.168.0.0/16\"],\"destinationPorts\":[\"443\"],\"ipProtocols\":[\"TCP\"]},{\"name\":\"Allow-RDP-Internal\",\"sourceAddresses\":[\"192.168.0.0/16\"],\"destinationAddresses\":[\"192.168.0.0/16\"],\"destinationPorts\":[\"3389\"],\"ipProtocols\":[\"TCP\"]}]"

# Add deny rule for high-risk protocols between branches
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-deny-risky-branch" \
  --rule-collection-group-name "rcg-branch-security" \
  --policy-name "afwp-vwan-security" \
  --resource-group $RG \
  --collection-priority 200 \
  --action Deny \
  --rule-type NetworkRule \
  --rules "[{\"name\":\"Deny-Telnet\",\"sourceAddresses\":[\"*\"],\"destinationAddresses\":[\"*\"],\"destinationPorts\":[\"23\"],\"ipProtocols\":[\"TCP\"]},{\"name\":\"Deny-FTP\",\"sourceAddresses\":[\"*\"],\"destinationAddresses\":[\"*\"],\"destinationPorts\":[\"20\",\"21\"],\"ipProtocols\":[\"TCP\"]}]"

# Deploy Azure Firewall in the Virtual WAN hub
az network firewall create \
  --name "afw-hub-eastus" \
  --resource-group $RG \
  --location $LOCATION \
  --vhub "hub-eastus" \
  --sku AZFW_Hub \
  --tier Premium \
  --firewall-policy "afwp-vwan-security"

# Verify firewall deployment
az network firewall show \
  --name "afw-hub-eastus" \
  --resource-group $RG \
  --query "{Name:name, State:provisioningState, Sku:sku.tier}"
```

---

## Task 5: Configure routing intent for traffic inspection

Set up routing intent to force all traffic (inter-hub, branch-to-internet, private traffic) through Azure Firewall.

```bash
# Configure routing intent on the hub
# This forces all private and internet traffic through Azure Firewall
az network vhub routing-intent create \
  --name "ri-force-firewall" \
  --resource-group $RG \
  --vhub "hub-eastus" \
  --routing-policies "[{\"name\":\"PrivateTrafficPolicy\",\"destinations\":[\"PrivateTraffic\"],\"nextHop\":\"$(az network firewall show --name afw-hub-eastus --resource-group $RG --query id -o tsv)\"},{\"name\":\"InternetTrafficPolicy\",\"destinations\":[\"Internet\"],\"nextHop\":\"$(az network firewall show --name afw-hub-eastus --resource-group $RG --query id -o tsv)\"}]"

# Verify routing intent
az network vhub routing-intent show \
  --name "ri-force-firewall" \
  --resource-group $RG \
  --vhub "hub-eastus" \
  --query "{Name:name, Policies:routingPolicies[].{Name:name, Destinations:destinations}}"

# Connect a VNet to the hub for testing
az network vnet create \
  --name vnet-spoke-prod \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.50.0.0/16 \
  --subnet-name snet-workload --subnet-prefix 10.50.1.0/24

az network vhub connection create \
  --name "conn-spoke-prod" \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --remote-vnet "vnet-spoke-prod" \
  --internet-security true
```

---

## Task 6: Monitor VPN connections and security events

Set up monitoring for VPN tunnel health and security events.

```bash
# Create Log Analytics workspace for VWAN diagnostics
WORKSPACE_NAME="law-sc500-vwan"
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --query id -o tsv)

# Enable diagnostic settings on VPN Gateway
VPN_GW_ID=$(az network vpn-gateway show --name "vpngw-hub-eastus" --resource-group $RG --query id -o tsv)

az monitor diagnostic-settings create \
  --name "vpn-diagnostics" \
  --resource $VPN_GW_ID \
  --workspace $WORKSPACE_ID \
  --logs '[{"category": "GatewayDiagnosticLog", "enabled": true}, {"category": "TunnelDiagnosticLog", "enabled": true}, {"category": "RouteDiagnosticLog", "enabled": true}, {"category": "IKEDiagnosticLog", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'

# Enable diagnostic settings on Azure Firewall
AFW_ID=$(az network firewall show --name "afw-hub-eastus" --resource-group $RG --query id -o tsv)

az monitor diagnostic-settings create \
  --name "firewall-diagnostics" \
  --resource $AFW_ID \
  --workspace $WORKSPACE_ID \
  --logs '[{"category": "AzureFirewallApplicationRule", "enabled": true}, {"category": "AzureFirewallNetworkRule", "enabled": true}, {"category": "AzureFirewallDnsProxy", "enabled": true}, {"category": "AZFWIdpsSignature", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'

# Check VPN gateway connection status
az network vpn-gateway connection list \
  --gateway-name "vpngw-hub-eastus" \
  --resource-group $RG \
  --query "[].{Name:name, Status:connectionStatus}" -o table
```

---

## Break & Fix

### Scenario 1: S2S VPN tunnel not establishing — Phase 1 mismatch

A branch office reports that the VPN tunnel is not coming up. IKE Phase 1 negotiation fails with a "no proposal chosen" error.

<details>
<summary>Show solution</summary>

```bash
# Check IKE diagnostic logs (if available)
# Common issue: IPsec policy mismatch between Azure and on-premises device

# Verify the connection's IPsec policy
az network vpn-gateway connection show \
  --name "conn-branch-newyork" \
  --gateway-name "vpngw-hub-eastus" \
  --resource-group $RG \
  --query "vpnLinkConnections[0].ipsecPolicies"

# Ensure both sides agree on:
# - IKE encryption (e.g., AES256)
# - IKE integrity (e.g., SHA256)
# - DH Group (e.g., DHGroup14)
# - IPsec encryption (e.g., GCMAES256)
# - IPsec integrity (e.g., GCMAES256)
# - PFS Group (e.g., PFS14)
# - SA lifetime (e.g., 28800 seconds)

# Fix: Update the connection with explicit IPsec policy matching on-prem
# The on-premises device must be configured with matching parameters
echo "Verify on-premises device configuration matches:"
echo "  Phase 1: IKEv2, AES-256, SHA-256, DH Group 14"
echo "  Phase 2: ESP AES-256-GCM, PFS Group 14"
echo "  Lifetime: 28800 seconds"
echo "  DPD: 45 seconds"
```

</details>

### Scenario 2: Branch traffic not being inspected by Azure Firewall

Branch-to-branch traffic is flowing directly without passing through Azure Firewall for inspection, despite routing intent being configured.

<details>
<summary>Show solution</summary>

```bash
# Verify routing intent is properly configured
az network vhub routing-intent show \
  --name "ri-force-firewall" \
  --resource-group $RG \
  --vhub "hub-eastus"

# Check if the routing intent includes PrivateTraffic destination
# Branch-to-branch is classified as PrivateTraffic

# Verify the firewall is in a healthy state
az network firewall show \
  --name "afw-hub-eastus" \
  --resource-group $RG \
  --query "{State:provisioningState, HubId:virtualHub.id}"

# If routing intent doesn't have PrivateTraffic, update it
AFW_ID=$(az network firewall show --name "afw-hub-eastus" --resource-group $RG --query id -o tsv)

az network vhub routing-intent create \
  --name "ri-force-firewall" \
  --resource-group $RG \
  --vhub "hub-eastus" \
  --routing-policies "[{\"name\":\"PrivateTrafficPolicy\",\"destinations\":[\"PrivateTraffic\"],\"nextHop\":\"$AFW_ID\"},{\"name\":\"InternetTrafficPolicy\",\"destinations\":[\"Internet\"],\"nextHop\":\"$AFW_ID\"}]"

# Verify the effective routes on the hub
az network vhub get-effective-routes \
  --resource-group $RG \
  --name "hub-eastus" \
  --resource-type "VpnGateway" \
  --resource-id "$(az network vpn-gateway show --name vpngw-hub-eastus --resource-group $RG --query id -o tsv)"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the purpose of routing intent in Azure Virtual WAN?",
    options: [
      "To configure DNS resolution for VPN clients",
      "To force all private and/or internet traffic through a next-hop security appliance like Azure Firewall",
      "To enable branch-to-branch connectivity",
      "To configure BGP route advertisements"
    ],
    correctIndex: 1,
    explanation: "Routing intent in Azure Virtual WAN allows you to configure routing policies that force private traffic (branch-to-branch, VNet-to-VNet) and/or internet-bound traffic through a next-hop security appliance like Azure Firewall for inspection."
  },
  {
    question: "Which IPsec encryption algorithm provides both confidentiality and integrity in a single operation (AEAD)?",
    options: [
      "AES-CBC-256 with SHA-256",
      "AES-256-GCM",
      "3DES with MD5",
      "DES-CBC with SHA-1"
    ],
    correctIndex: 1,
    explanation: "AES-256-GCM (Galois/Counter Mode) is an Authenticated Encryption with Associated Data (AEAD) algorithm that provides both confidentiality and integrity in a single cryptographic operation, making it more efficient and secure than separate encryption and hashing."
  },
  {
    question: "In a Virtual WAN site-to-site VPN configuration, what happens if the IPsec policy is not explicitly specified on the connection?",
    options: [
      "The connection fails to establish",
      "Azure uses default IPsec/IKE parameters and negotiates with the on-premises device",
      "Only IKEv1 is used",
      "Traffic flows unencrypted"
    ],
    correctIndex: 1,
    explanation: "If no custom IPsec policy is specified, Azure VPN gateways use default parameters and attempt to negotiate with the on-premises device using standard proposals. The default includes multiple cipher suites for compatibility, though custom policies are recommended for security hardening."
  },
  {
    question: "What is required to deploy Azure Firewall in a Virtual WAN hub (secured hub)?",
    options: [
      "A Standard SKU Virtual WAN with a Standard SKU hub",
      "A Basic SKU Virtual WAN with any hub SKU",
      "Azure Firewall Manager and a separate VNet for the firewall",
      "A dedicated subnet named 'AzureFirewallSubnet' in the hub VNet"
    ],
    correctIndex: 0,
    explanation: "Azure Firewall can only be deployed in a Virtual WAN hub (creating a 'secured hub') when both the Virtual WAN and hub are Standard SKU. Unlike standalone Azure Firewall, you don't need to create a subnet — the hub manages firewall placement automatically."
  }
]} />

## Cleanup

```bash
# Delete the resource group (this will take several minutes due to hub/gateway deletion)
az group delete --name $RG --yes --no-wait

# Note: Virtual WAN hub and gateway deletion can take 30+ minutes
echo "Resource deletion initiated. Hub and gateway cleanup may take 30+ minutes."
```
