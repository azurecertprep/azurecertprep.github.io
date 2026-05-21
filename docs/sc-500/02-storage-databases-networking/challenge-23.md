---
sidebar_position: 23
title: "Challenge 23: Azure Firewall"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 23: Azure Firewall

## Exam skills covered

- Plan and implement Azure Firewall for network security
- Configure Azure Firewall rules (network rules, application rules, DNAT rules)
- Implement Azure Firewall policies with rule collection groups
- Configure threat intelligence-based filtering
- Implement Azure Firewall Premium features (TLS inspection, IDPS, URL filtering)
- Integrate Azure Firewall with route tables for forced tunneling

## Scenario

Contoso Ltd is deploying a hub-and-spoke network architecture where all outbound internet traffic and inter-spoke traffic must be inspected by Azure Firewall. The security team requires threat intelligence filtering to block known malicious IPs, TLS inspection for encrypted traffic visibility, IDPS (Intrusion Detection and Prevention) for threat detection, and granular URL filtering for web categories. The firewall must also provide DNAT rules for inbound access to specific web servers. You must deploy and configure Azure Firewall Premium with comprehensive security policies.

---

## Prerequisites

- Azure subscription with Network Contributor role
- Azure CLI installed and authenticated (`az login`)
- Understanding of hub-and-spoke network architecture
- Azure Key Vault for TLS inspection certificates (Premium)
- Budget awareness: Azure Firewall Premium incurs significant hourly charges

---

## Task 1: Deploy hub-and-spoke network with Azure Firewall

Create the hub VNet with Azure Firewall and spoke VNets for workloads.

```bash
# Set variables
RG="rg-sc500-azure-firewall"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Create hub virtual network
az network vnet create \
  --name vnet-hub \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16

# Create AzureFirewallSubnet (required name, minimum /26)
az network vnet subnet create \
  --name AzureFirewallSubnet \
  --vnet-name vnet-hub \
  --resource-group $RG \
  --address-prefix 10.0.1.0/26

# Create AzureFirewallManagementSubnet (required for forced tunneling)
az network vnet subnet create \
  --name AzureFirewallManagementSubnet \
  --vnet-name vnet-hub \
  --resource-group $RG \
  --address-prefix 10.0.2.0/26

# Create public IP for Azure Firewall
az network public-ip create \
  --name pip-afw-contoso \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard \
  --allocation-method Static

# Create spoke VNets
az network vnet create \
  --name vnet-spoke-web \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.1.0.0/16 \
  --subnet-name snet-web --subnet-prefix 10.1.1.0/24

az network vnet create \
  --name vnet-spoke-app \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.2.0.0/16 \
  --subnet-name snet-app --subnet-prefix 10.2.1.0/24

# Peer hub to spokes
az network vnet peering create \
  --name hub-to-spoke-web \
  --resource-group $RG \
  --vnet-name vnet-hub \
  --remote-vnet vnet-spoke-web \
  --allow-forwarded-traffic true \
  --allow-vnet-access true

az network vnet peering create \
  --name spoke-web-to-hub \
  --resource-group $RG \
  --vnet-name vnet-spoke-web \
  --remote-vnet vnet-hub \
  --allow-forwarded-traffic true \
  --allow-vnet-access true

az network vnet peering create \
  --name hub-to-spoke-app \
  --resource-group $RG \
  --vnet-name vnet-hub \
  --remote-vnet vnet-spoke-app \
  --allow-forwarded-traffic true \
  --allow-vnet-access true

az network vnet peering create \
  --name spoke-app-to-hub \
  --resource-group $RG \
  --vnet-name vnet-spoke-app \
  --remote-vnet vnet-hub \
  --allow-forwarded-traffic true \
  --allow-vnet-access true
```

---

## Task 2: Create Azure Firewall Policy with rule collection groups

Create a hierarchical firewall policy with organized rule collections.

```bash
# Create Azure Firewall Policy (Premium tier for advanced features)
az network firewall policy create \
  --name "afwp-contoso-security" \
  --resource-group $RG \
  --location $LOCATION \
  --sku Premium \
  --threat-intel-mode Deny \
  --idps-mode Deny

# Create rule collection groups (ordered by priority)
# RCG 1: Platform rules (highest priority)
az network firewall policy rule-collection-group create \
  --name "rcg-platform" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --priority 100

# RCG 2: Application team rules
az network firewall policy rule-collection-group create \
  --name "rcg-application" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --priority 200

# RCG 3: DNAT rules for inbound traffic
az network firewall policy rule-collection-group create \
  --name "rcg-dnat" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --priority 300

# Add network rules - Allow DNS
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-network-infra" \
  --rule-collection-group-name "rcg-platform" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --collection-priority 100 \
  --action Allow \
  --rule-type NetworkRule \
  --rules "[{\"name\":\"Allow-DNS\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"destinationAddresses\":[\"*\"],\"destinationPorts\":[\"53\"],\"ipProtocols\":[\"UDP\",\"TCP\"]},{\"name\":\"Allow-NTP\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"destinationAddresses\":[\"*\"],\"destinationPorts\":[\"123\"],\"ipProtocols\":[\"UDP\"]}]"

# Add network rules - Allow inter-spoke on specific ports
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-network-inter-spoke" \
  --rule-collection-group-name "rcg-platform" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --collection-priority 200 \
  --action Allow \
  --rule-type NetworkRule \
  --rules "[{\"name\":\"Allow-Web-To-App\",\"sourceAddresses\":[\"10.1.0.0/16\"],\"destinationAddresses\":[\"10.2.0.0/16\"],\"destinationPorts\":[\"8080\",\"8443\"],\"ipProtocols\":[\"TCP\"]},{\"name\":\"Allow-App-To-SQL\",\"sourceAddresses\":[\"10.2.0.0/16\"],\"destinationAddresses\":[\"10.3.0.0/16\"],\"destinationPorts\":[\"1433\"],\"ipProtocols\":[\"TCP\"]}]"
```

---

## Task 3: Configure application rules with URL filtering

Add application rules to control outbound HTTPS traffic with FQDN and URL filtering.

```bash
# Add application rules - Allow Windows Update and Azure services
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-app-allowed-sites" \
  --rule-collection-group-name "rcg-application" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --collection-priority 100 \
  --action Allow \
  --rule-type ApplicationRule \
  --rules "[{\"name\":\"Allow-WindowsUpdate\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"protocols\":[{\"protocolType\":\"Https\",\"port\":443}],\"targetFqdns\":[\"*.windowsupdate.com\",\"*.microsoft.com\",\"*.msftconnecttest.com\"]},{\"name\":\"Allow-AzureManagement\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"protocols\":[{\"protocolType\":\"Https\",\"port\":443}],\"targetFqdns\":[\"management.azure.com\",\"login.microsoftonline.com\",\"*.vault.azure.net\"]}]"

# Add application rules - Allow specific web categories
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-app-web-categories" \
  --rule-collection-group-name "rcg-application" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --collection-priority 200 \
  --action Allow \
  --rule-type ApplicationRule \
  --rules "[{\"name\":\"Allow-Business-Sites\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"protocols\":[{\"protocolType\":\"Https\",\"port\":443},{\"protocolType\":\"Http\",\"port\":80}],\"webCategories\":[\"SearchEnginesAndPortals\",\"ComputersAndTechnology\",\"Business\"]}]"

# Add deny rule for specific categories (explicit deny before implicit deny)
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-app-deny-categories" \
  --rule-collection-group-name "rcg-application" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --collection-priority 300 \
  --action Deny \
  --rule-type ApplicationRule \
  --rules "[{\"name\":\"Deny-SocialMedia\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"protocols\":[{\"protocolType\":\"Https\",\"port\":443},{\"protocolType\":\"Http\",\"port\":80}],\"webCategories\":[\"SocialNetworking\",\"StreamingMediaAndDownloads\",\"Gambling\"]},{\"name\":\"Deny-Anonymizers\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"protocols\":[{\"protocolType\":\"Https\",\"port\":443}],\"webCategories\":[\"PrivateIPAddresses\",\"Anonymizers\"]}]"
```

---

## Task 4: Configure DNAT rules for inbound access

Create DNAT rules to allow inbound traffic to specific backend servers.

```bash
# Get the firewall public IP address
AFW_PUBLIC_IP=$(az network public-ip show \
  --name pip-afw-contoso \
  --resource-group $RG \
  --query ipAddress -o tsv)

echo "Firewall Public IP: $AFW_PUBLIC_IP"

# Add DNAT rule - Forward HTTPS to web server
az network firewall policy rule-collection-group collection add-nat-collection \
  --name "rc-dnat-inbound" \
  --rule-collection-group-name "rcg-dnat" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --collection-priority 100 \
  --action DNAT \
  --rules "[{\"name\":\"DNAT-HTTPS-WebServer\",\"sourceAddresses\":[\"*\"],\"destinationAddresses\":[\"$AFW_PUBLIC_IP\"],\"destinationPorts\":[\"443\"],\"translatedAddress\":\"10.1.1.10\",\"translatedPort\":\"443\",\"ipProtocols\":[\"TCP\"]},{\"name\":\"DNAT-HTTP-WebServer\",\"sourceAddresses\":[\"203.0.113.0/24\"],\"destinationAddresses\":[\"$AFW_PUBLIC_IP\"],\"destinationPorts\":[\"80\"],\"translatedAddress\":\"10.1.1.10\",\"translatedPort\":\"80\",\"ipProtocols\":[\"TCP\"]}]"
```

---

## Task 5: Deploy Azure Firewall and configure TLS inspection (Premium)

Deploy the firewall and configure TLS inspection for encrypted traffic visibility.

```bash
# Create Key Vault for TLS inspection CA certificate
KV_NAME="kv-afw-tls-$(openssl rand -hex 4)"
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG \
  --location $LOCATION

# Create a managed identity for Azure Firewall to access Key Vault
az identity create \
  --name "id-afw-contoso" \
  --resource-group $RG \
  --location $LOCATION

IDENTITY_ID=$(az identity show \
  --name "id-afw-contoso" \
  --resource-group $RG \
  --query id -o tsv)

IDENTITY_PRINCIPAL=$(az identity show \
  --name "id-afw-contoso" \
  --resource-group $RG \
  --query principalId -o tsv)

# Grant Key Vault access to the managed identity
az keyvault set-policy \
  --name $KV_NAME \
  --object-id $IDENTITY_PRINCIPAL \
  --secret-permissions get list \
  --certificate-permissions get list

# Note: In production, import an Intermediate CA certificate for TLS inspection
# az keyvault certificate import --vault-name $KV_NAME --name "tls-inspection-ca" --file ca-cert.pfx

# Configure TLS inspection on the firewall policy
# (requires the CA certificate in Key Vault)
echo "TLS Inspection Configuration:"
echo "  - Import Intermediate CA certificate to Key Vault"
echo "  - Configure the firewall policy to use the certificate"
echo "  - Enable TLS inspection on specific application rules"
echo ""
echo "Note: TLS inspection decrypts and re-encrypts HTTPS traffic."
echo "Clients must trust the Intermediate CA certificate."

# Deploy Azure Firewall with the policy
az network firewall create \
  --name "afw-contoso" \
  --resource-group $RG \
  --location $LOCATION \
  --sku AZFW_VNet \
  --tier Premium \
  --vnet-name vnet-hub \
  --firewall-policy "afwp-contoso-security" \
  --public-ip pip-afw-contoso

# Get Firewall private IP for route tables
AFW_PRIVATE_IP=$(az network firewall show \
  --name "afw-contoso" \
  --resource-group $RG \
  --query "ipConfigurations[0].privateIPAddress" -o tsv)

echo "Firewall Private IP: $AFW_PRIVATE_IP"
```

---

## Task 6: Configure route tables for forced tunneling through firewall

Create UDRs to force all spoke traffic through Azure Firewall.

```bash
# Create route table for spoke subnets
az network route-table create \
  --name "rt-spoke-to-firewall" \
  --resource-group $RG \
  --location $LOCATION \
  --disable-bgp-route-propagation true

# Add default route pointing to Azure Firewall
az network route-table route create \
  --name "route-to-firewall" \
  --route-table-name "rt-spoke-to-firewall" \
  --resource-group $RG \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $AFW_PRIVATE_IP

# Add route for inter-spoke traffic through firewall
az network route-table route create \
  --name "route-spoke-to-spoke" \
  --route-table-name "rt-spoke-to-firewall" \
  --resource-group $RG \
  --address-prefix 10.0.0.0/8 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $AFW_PRIVATE_IP

# Associate route table with spoke subnets
az network vnet subnet update \
  --name snet-web \
  --vnet-name vnet-spoke-web \
  --resource-group $RG \
  --route-table "rt-spoke-to-firewall"

az network vnet subnet update \
  --name snet-app \
  --vnet-name vnet-spoke-app \
  --resource-group $RG \
  --route-table "rt-spoke-to-firewall"

# Verify route table configuration
az network route-table route list \
  --route-table-name "rt-spoke-to-firewall" \
  --resource-group $RG \
  -o table

# Enable diagnostic logging on Azure Firewall
WORKSPACE_NAME="law-sc500-firewall"
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME --resource-group $RG --query id -o tsv)

AFW_ID=$(az network firewall show --name "afw-contoso" --resource-group $RG --query id -o tsv)

az monitor diagnostic-settings create \
  --name "afw-diagnostics" \
  --resource $AFW_ID \
  --workspace $WORKSPACE_ID \
  --logs '[{"category":"AzureFirewallApplicationRule","enabled":true},{"category":"AzureFirewallNetworkRule","enabled":true},{"category":"AzureFirewallDnsProxy","enabled":true},{"category":"AZFWIdpsSignature","enabled":true},{"category":"AZFWThreatIntel","enabled":true}]'
```

---

## Break & Fix

### Scenario 1: Spoke VMs cannot reach the internet despite firewall allow rules

VMs in the spoke VNets cannot access any websites even though application rules allow HTTPS traffic. The firewall shows no log entries for the traffic.

<details>
<summary>Show solution</summary>

```bash
# Check if the route table is associated with the spoke subnet
az network vnet subnet show \
  --name snet-web \
  --vnet-name vnet-spoke-web \
  --resource-group $RG \
  --query "routeTable.id"

# Check if the default route points to the firewall
az network route-table route list \
  --route-table-name "rt-spoke-to-firewall" \
  --resource-group $RG -o table

# Verify the firewall private IP matches the route next-hop
echo "Firewall IP: $AFW_PRIVATE_IP"

# Check VNet peering allows forwarded traffic
az network vnet peering show \
  --name spoke-web-to-hub \
  --vnet-name vnet-spoke-web \
  --resource-group $RG \
  --query "{AllowForwarded:allowForwardedTraffic, AllowVNetAccess:allowVirtualNetworkAccess}"

# If forwarded traffic is not allowed, update peering
az network vnet peering update \
  --name spoke-web-to-hub \
  --vnet-name vnet-spoke-web \
  --resource-group $RG \
  --set allowForwardedTraffic=true

# Also ensure the hub-to-spoke peering allows gateway transit or forwarded traffic
az network vnet peering update \
  --name hub-to-spoke-web \
  --vnet-name vnet-hub \
  --resource-group $RG \
  --set allowForwardedTraffic=true
```

</details>

### Scenario 2: DNAT rule not working — external users cannot reach the web server

External users cannot access the web server at the firewall's public IP on port 443. The firewall DNAT rule exists but the connection times out.

<details>
<summary>Show solution</summary>

```bash
# Verify the DNAT rule configuration
az network firewall policy rule-collection-group collection list \
  --rule-collection-group-name "rcg-dnat" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG

# Check if there's also a network rule allowing the translated traffic
# DNAT rules translate the destination but the traffic also needs a matching
# network rule to allow the translated traffic flow (in some configurations)

# Verify the translated address (10.1.1.10) is reachable from the firewall
# The web server must be in a peered spoke with proper routing

# Check if the web server has an NSG blocking the traffic
# After DNAT, the source IP is the original client IP (not the firewall)
# The NSG on the web server subnet must allow the traffic

# Common fix: Ensure no NSG blocks traffic from Internet to the web server
# The firewall handles the security; NSGs should allow from the firewall subnet
az network nsg rule create \
  --nsg-name nsg-web \
  --resource-group $RG \
  --name "Allow-From-Firewall" \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes "10.0.1.0/26" \
  --destination-port-ranges 443 80 2>/dev/null || echo "Create NSG if needed"
```

</details>

### Scenario 3: Threat intelligence not blocking known malicious domains

Despite threat intelligence mode being set to "Deny", traffic to known malicious domains is not being blocked.

<details>
<summary>Show solution</summary>

```bash
# Verify threat intelligence mode on the firewall policy
az network firewall policy show \
  --name "afwp-contoso-security" \
  --resource-group $RG \
  --query "threatIntelMode"

# If set to "Off" or "Alert", update to "Deny"
az network firewall policy update \
  --name "afwp-contoso-security" \
  --resource-group $RG \
  --threat-intel-mode Deny

# Check if there's an allow list bypassing threat intel
az network firewall policy show \
  --name "afwp-contoso-security" \
  --resource-group $RG \
  --query "threatIntelWhitelist"

# Remove any mistakenly added whitelist entries
az network firewall policy update \
  --name "afwp-contoso-security" \
  --resource-group $RG \
  --threat-intel-whitelist fqdns="" ip-addresses=""

# Note: Threat intelligence in Deny mode has highest precedence, blocking
# traffic even if an explicit allow rule exists. If legitimate traffic is
# blocked, add the FQDN/IP to the threat intelligence whitelist.
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "In what order does Azure Firewall evaluate rule types?",
    options: [
      "Application rules → Network rules → DNAT rules",
      "DNAT rules → Network rules → Application rules",
      "Network rules → Application rules → DNAT rules",
      "All rules are evaluated simultaneously"
    ],
    correctIndex: 1,
    explanation: "Azure Firewall evaluates rules in this order: DNAT rules first (for inbound traffic translation), then Network rules, then Application rules. Within each type, rules are processed by priority. If a network rule matches, application rules are not evaluated for that traffic."
  },
  {
    question: "What is required for Azure Firewall TLS inspection to work?",
    options: [
      "A self-signed root CA certificate uploaded to the firewall",
      "An Intermediate CA certificate stored in Azure Key Vault with a managed identity for access",
      "Microsoft's public CA certificate",
      "A wildcard SSL certificate purchased from a public CA"
    ],
    correctIndex: 1,
    explanation: "Azure Firewall TLS inspection requires an Intermediate CA certificate stored in Azure Key Vault. The firewall uses a managed identity to access the certificate. The firewall signs re-encrypted traffic with this intermediate CA, so clients must trust the root CA that issued it."
  },
  {
    question: "What is the minimum subnet size required for the AzureFirewallSubnet?",
    options: [
      "/28 (16 addresses)",
      "/26 (64 addresses)",
      "/24 (256 addresses)",
      "/27 (32 addresses)"
    ],
    correctIndex: 1,
    explanation: "The AzureFirewallSubnet requires a minimum of /26 (64 addresses). This is because Azure Firewall can scale to multiple instances during high load, and each instance requires IP addresses from this subnet. Microsoft recommends /26 as the minimum."
  },
  {
    question: "How does Azure Firewall threat intelligence blocking interact with explicit allow rules?",
    options: [
      "Threat intelligence takes highest precedence over all rules by default",
      "Explicit application/network allow rules take precedence over threat intelligence",
      "They cannot be used together",
      "Threat intelligence only applies to inbound traffic"
    ],
    correctIndex: 0,
    explanation: "When threat intelligence is set to 'Deny' mode, it takes highest precedence — traffic to/from known malicious IPs/FQDNs is blocked even if an explicit allow rule exists. However, specific IPs/FQDNs can be added to the threat intelligence whitelist to override this behavior."
  }
]} />

## Cleanup

```bash
# Delete the resource group (firewall deletion takes several minutes)
az group delete --name $RG --yes --no-wait

# Purge Key Vault if needed
az keyvault purge --name $KV_NAME --no-wait 2>/dev/null
```
