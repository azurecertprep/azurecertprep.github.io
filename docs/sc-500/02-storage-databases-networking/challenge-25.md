---
sidebar_position: 25
title: "Challenge 25: Network Security Architecture Review"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 25: Network Security Architecture Review

## Exam skills covered

- Design end-to-end network segmentation strategies
- Evaluate network security posture across multiple Azure services
- Implement defense-in-depth for network architectures
- Integrate multiple network security controls (NSGs, Azure Firewall, Private Endpoints, AVNM)
- Review and remediate network security misconfigurations
- Document network security architecture decisions

## Scenario

Contoso Ltd has completed their cloud migration and now operates a complex Azure environment with multiple subscriptions, hub-and-spoke networking, PaaS services, hybrid connectivity, and a remote workforce. The CISO has requested a comprehensive network security architecture review before the annual compliance audit. The environment includes: a hub VNet with Azure Firewall, three spoke VNets (production, development, staging), multiple PaaS services accessed via private endpoints, site-to-site VPN to two branch offices, and point-to-site VPN for remote workers. You must perform a holistic security review, identify gaps, and implement remediations that demonstrate defense-in-depth across all network layers.

---

## Prerequisites

- Azure subscription with Network Contributor and Security Reader roles
- Azure CLI installed and authenticated (`az login`)
- Completion of Challenges 17-24 (conceptual understanding)
- Understanding of defense-in-depth network security principles
- Familiarity with Azure Well-Architected Framework (Security pillar)

---

## Task 1: Deploy the complete architecture for review

Create the full Contoso network architecture representing a real-world enterprise deployment.

```bash
# Set variables
RG="rg-sc500-arch-review"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# === HUB VNET ===
az network vnet create \
  --name vnet-hub \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16

az network vnet subnet create \
  --name AzureFirewallSubnet \
  --vnet-name vnet-hub \
  --resource-group $RG \
  --address-prefix 10.0.1.0/26

az network vnet subnet create \
  --name GatewaySubnet \
  --vnet-name vnet-hub \
  --resource-group $RG \
  --address-prefix 10.0.2.0/27

az network vnet subnet create \
  --name snet-shared-services \
  --vnet-name vnet-hub \
  --resource-group $RG \
  --address-prefix 10.0.3.0/24

az network vnet subnet create \
  --name snet-private-endpoints \
  --vnet-name vnet-hub \
  --resource-group $RG \
  --address-prefix 10.0.4.0/24

# === SPOKE VNETS ===
# Production spoke
az network vnet create \
  --name vnet-spoke-prod \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.1.0.0/16

az network vnet subnet create \
  --name snet-web --vnet-name vnet-spoke-prod \
  --resource-group $RG --address-prefix 10.1.1.0/24

az network vnet subnet create \
  --name snet-app --vnet-name vnet-spoke-prod \
  --resource-group $RG --address-prefix 10.1.2.0/24

az network vnet subnet create \
  --name snet-data --vnet-name vnet-spoke-prod \
  --resource-group $RG --address-prefix 10.1.3.0/24

# Development spoke
az network vnet create \
  --name vnet-spoke-dev \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.2.0.0/16

az network vnet subnet create \
  --name snet-dev-workloads --vnet-name vnet-spoke-dev \
  --resource-group $RG --address-prefix 10.2.1.0/24

# Staging spoke
az network vnet create \
  --name vnet-spoke-staging \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.3.0.0/16

az network vnet subnet create \
  --name snet-staging-workloads --vnet-name vnet-spoke-staging \
  --resource-group $RG --address-prefix 10.3.1.0/24

# === PEERINGS ===
for SPOKE in prod dev staging; do
  az network vnet peering create \
    --name "hub-to-spoke-$SPOKE" \
    --resource-group $RG \
    --vnet-name vnet-hub \
    --remote-vnet "vnet-spoke-$SPOKE" \
    --allow-forwarded-traffic true \
    --allow-vnet-access true \
    --allow-gateway-transit true

  az network vnet peering create \
    --name "spoke-$SPOKE-to-hub" \
    --resource-group $RG \
    --vnet-name "vnet-spoke-$SPOKE" \
    --remote-vnet vnet-hub \
    --allow-forwarded-traffic true \
    --allow-vnet-access true \
    --use-remote-gateways false
done
```

---

## Task 2: Implement NSG segmentation across all tiers

Apply comprehensive NSG rules implementing micro-segmentation within the production spoke.

```bash
# Create NSGs for each production tier
az network nsg create --name nsg-prod-web --resource-group $RG --location $LOCATION
az network nsg create --name nsg-prod-app --resource-group $RG --location $LOCATION
az network nsg create --name nsg-prod-data --resource-group $RG --location $LOCATION
az network nsg create --name nsg-dev --resource-group $RG --location $LOCATION
az network nsg create --name nsg-staging --resource-group $RG --location $LOCATION

# Production Web Tier - Allow HTTPS from Azure Front Door / App Gateway
az network nsg rule create \
  --nsg-name nsg-prod-web --resource-group $RG \
  --name Allow-HTTPS-AFD --priority 100 --direction Inbound \
  --access Allow --protocol Tcp \
  --source-address-prefixes AzureFrontDoor.Backend \
  --destination-port-ranges 443

az network nsg rule create \
  --nsg-name nsg-prod-web --resource-group $RG \
  --name Allow-Health-Probe --priority 110 --direction Inbound \
  --access Allow --protocol Tcp \
  --source-address-prefixes AzureLoadBalancer \
  --destination-port-ranges "*"

az network nsg rule create \
  --nsg-name nsg-prod-web --resource-group $RG \
  --name Deny-All-Inbound --priority 4000 --direction Inbound \
  --access Deny --protocol "*" \
  --source-address-prefixes "*" --destination-address-prefixes "*" \
  --destination-port-ranges "*"

# Production App Tier - Only from web tier
az network nsg rule create \
  --nsg-name nsg-prod-app --resource-group $RG \
  --name Allow-From-Web --priority 100 --direction Inbound \
  --access Allow --protocol Tcp \
  --source-address-prefixes "10.1.1.0/24" \
  --destination-port-ranges 8080 8443

az network nsg rule create \
  --nsg-name nsg-prod-app --resource-group $RG \
  --name Deny-All-Inbound --priority 4000 --direction Inbound \
  --access Deny --protocol "*" \
  --source-address-prefixes "*" --destination-address-prefixes "*" \
  --destination-port-ranges "*"

# Production Data Tier - Only from app tier
az network nsg rule create \
  --nsg-name nsg-prod-data --resource-group $RG \
  --name Allow-From-App --priority 100 --direction Inbound \
  --access Allow --protocol Tcp \
  --source-address-prefixes "10.1.2.0/24" \
  --destination-port-ranges 1433 5432 6379

az network nsg rule create \
  --nsg-name nsg-prod-data --resource-group $RG \
  --name Deny-All-Inbound --priority 4000 --direction Inbound \
  --access Deny --protocol "*" \
  --source-address-prefixes "*" --destination-address-prefixes "*" \
  --destination-port-ranges "*"

# Development - Block access to production
az network nsg rule create \
  --nsg-name nsg-dev --resource-group $RG \
  --name Deny-To-Production --priority 100 --direction Outbound \
  --access Deny --protocol "*" \
  --source-address-prefixes "*" --destination-address-prefixes "10.1.0.0/16" \
  --destination-port-ranges "*"

# Associate NSGs with subnets
az network vnet subnet update --name snet-web --vnet-name vnet-spoke-prod \
  --resource-group $RG --network-security-group nsg-prod-web
az network vnet subnet update --name snet-app --vnet-name vnet-spoke-prod \
  --resource-group $RG --network-security-group nsg-prod-app
az network vnet subnet update --name snet-data --vnet-name vnet-spoke-prod \
  --resource-group $RG --network-security-group nsg-prod-data
az network vnet subnet update --name snet-dev-workloads --vnet-name vnet-spoke-dev \
  --resource-group $RG --network-security-group nsg-dev
az network vnet subnet update --name snet-staging-workloads --vnet-name vnet-spoke-staging \
  --resource-group $RG --network-security-group nsg-staging
```

---

## Task 3: Deploy Azure Firewall with comprehensive policies

Deploy the central firewall with policies covering all traffic flows.

```bash
# Create public IP for firewall
az network public-ip create \
  --name pip-afw --resource-group $RG --location $LOCATION \
  --sku Standard --allocation-method Static

# Create firewall policy
az network firewall policy create \
  --name "afwp-contoso-enterprise" \
  --resource-group $RG \
  --location $LOCATION \
  --sku Premium \
  --threat-intel-mode Deny \
  --idps-mode Deny

# Platform rules - DNS, NTP, Azure services
az network firewall policy rule-collection-group create \
  --name "rcg-platform" \
  --policy-name "afwp-contoso-enterprise" \
  --resource-group $RG --priority 100

az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-infra-allow" \
  --rule-collection-group-name "rcg-platform" \
  --policy-name "afwp-contoso-enterprise" \
  --resource-group $RG \
  --collection-priority 100 --action Allow \
  --rule-type NetworkRule \
  --rules "[{\"name\":\"Allow-DNS\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"destinationAddresses\":[\"*\"],\"destinationPorts\":[\"53\"],\"ipProtocols\":[\"UDP\",\"TCP\"]},{\"name\":\"Allow-NTP\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"destinationAddresses\":[\"*\"],\"destinationPorts\":[\"123\"],\"ipProtocols\":[\"UDP\"]},{\"name\":\"Allow-KMS\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"destinationFqdns\":[\"kms.core.windows.net\"],\"destinationPorts\":[\"1688\"],\"ipProtocols\":[\"TCP\"]}]"

# Application rules - Allowed outbound
az network firewall policy rule-collection-group create \
  --name "rcg-application" \
  --policy-name "afwp-contoso-enterprise" \
  --resource-group $RG --priority 200

az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-app-allow-azure" \
  --rule-collection-group-name "rcg-application" \
  --policy-name "afwp-contoso-enterprise" \
  --resource-group $RG \
  --collection-priority 100 --action Allow \
  --rule-type ApplicationRule \
  --rules "[{\"name\":\"Allow-Azure-Services\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"protocols\":[{\"protocolType\":\"Https\",\"port\":443}],\"targetFqdns\":[\"*.azure.com\",\"*.microsoft.com\",\"*.windows.net\",\"*.microsoftonline.com\"]}]"

# Deploy Azure Firewall
az network firewall create \
  --name "afw-contoso-hub" \
  --resource-group $RG \
  --location $LOCATION \
  --sku AZFW_VNet \
  --tier Premium \
  --vnet-name vnet-hub \
  --firewall-policy "afwp-contoso-enterprise" \
  --public-ip pip-afw

# Get firewall private IP
AFW_IP=$(az network firewall show --name "afw-contoso-hub" --resource-group $RG \
  --query "ipConfigurations[0].privateIPAddress" -o tsv)

# Create route tables for forced tunneling
az network route-table create \
  --name rt-spoke-to-fw --resource-group $RG --location $LOCATION \
  --disable-bgp-route-propagation true

az network route-table route create \
  --name default-to-fw --route-table-name rt-spoke-to-fw \
  --resource-group $RG --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance --next-hop-ip-address $AFW_IP

# Associate route table with all spoke subnets
for SUBNET in "snet-web:vnet-spoke-prod" "snet-app:vnet-spoke-prod" "snet-data:vnet-spoke-prod" "snet-dev-workloads:vnet-spoke-dev" "snet-staging-workloads:vnet-spoke-staging"; do
  SNET=$(echo $SUBNET | cut -d: -f1)
  VNET=$(echo $SUBNET | cut -d: -f2)
  az network vnet subnet update \
    --name $SNET --vnet-name $VNET \
    --resource-group $RG --route-table rt-spoke-to-fw
done
```

---

## Task 4: Deploy private endpoints for PaaS services

Secure all PaaS services with private endpoints and disable public access.

```bash
# Create PaaS services
STORAGE="starchreview$(openssl rand -hex 4)"
SQL_SERVER="sql-archreview-$(openssl rand -hex 4)"
KV_NAME="kv-archreview-$(openssl rand -hex 4)"

az storage account create --name $STORAGE --resource-group $RG \
  --location $LOCATION --sku Standard_LRS
az sql server create --name $SQL_SERVER --resource-group $RG \
  --location $LOCATION --admin-user sqladmin --admin-password "Arch!Review2024"
az keyvault create --name $KV_NAME --resource-group $RG --location $LOCATION

# Get resource IDs
STORAGE_ID=$(az storage account show --name $STORAGE --resource-group $RG --query id -o tsv)
SQL_ID=$(az sql server show --name $SQL_SERVER --resource-group $RG --query id -o tsv)
KV_ID=$(az keyvault show --name $KV_NAME --resource-group $RG --query id -o tsv)

# Create private endpoints in hub
az network private-endpoint create --name pe-storage --resource-group $RG --location $LOCATION \
  --vnet-name vnet-hub --subnet snet-private-endpoints \
  --connection-name pec-storage --private-connection-resource-id $STORAGE_ID --group-ids blob

az network private-endpoint create --name pe-sql --resource-group $RG --location $LOCATION \
  --vnet-name vnet-hub --subnet snet-private-endpoints \
  --connection-name pec-sql --private-connection-resource-id $SQL_ID --group-ids sqlServer

az network private-endpoint create --name pe-kv --resource-group $RG --location $LOCATION \
  --vnet-name vnet-hub --subnet snet-private-endpoints \
  --connection-name pec-kv --private-connection-resource-id $KV_ID --group-ids vault

# Create Private DNS zones and link to hub VNet
for ZONE in "privatelink.blob.core.windows.net" "privatelink.database.windows.net" "privatelink.vaultcore.azure.net"; do
  az network private-dns zone create --name $ZONE --resource-group $RG
  az network private-dns link vnet create --name "link-hub-$ZONE" \
    --resource-group $RG --zone-name $ZONE \
    --virtual-network vnet-hub --registration-enabled false
  # Also link to spoke VNets for DNS resolution
  for SPOKE in prod dev staging; do
    az network private-dns link vnet create --name "link-spoke-$SPOKE-$ZONE" \
      --resource-group $RG --zone-name $ZONE \
      --virtual-network "vnet-spoke-$SPOKE" --registration-enabled false 2>/dev/null
  done
done

# Disable public access on all PaaS services
az storage account update --name $STORAGE --resource-group $RG --public-network-access Disabled
az sql server update --name $SQL_SERVER --resource-group $RG --set publicNetworkAccess="Disabled"
az keyvault update --name $KV_NAME --resource-group $RG --public-network-access Disabled
```

---

## Task 5: Perform security posture assessment

Run a comprehensive assessment of the network security posture.

```bash
echo "========================================"
echo "  CONTOSO NETWORK SECURITY ASSESSMENT  "
echo "========================================"
echo ""

# Check 1: NSGs on all subnets
echo "=== CHECK 1: NSG Coverage ==="
az network vnet subnet list --vnet-name vnet-spoke-prod --resource-group $RG \
  --query "[].{Subnet:name, NSG:networkSecurityGroup.id}" -o table
echo ""

# Check 2: Route tables forcing traffic through firewall
echo "=== CHECK 2: UDR Coverage ==="
az network vnet subnet list --vnet-name vnet-spoke-prod --resource-group $RG \
  --query "[].{Subnet:name, RouteTable:routeTable.id}" -o table
echo ""

# Check 3: Public access disabled on PaaS
echo "=== CHECK 3: PaaS Public Access ==="
echo "Storage: $(az storage account show --name $STORAGE --resource-group $RG --query publicNetworkAccess -o tsv)"
echo "SQL: $(az sql server show --name $SQL_SERVER --resource-group $RG --query publicNetworkAccess -o tsv)"
echo "Key Vault: $(az keyvault show --name $KV_NAME --resource-group $RG --query 'properties.publicNetworkAccess' -o tsv)"
echo ""

# Check 4: Firewall threat intelligence
echo "=== CHECK 4: Firewall Threat Intelligence ==="
az network firewall policy show --name "afwp-contoso-enterprise" --resource-group $RG \
  --query "{ThreatIntel:threatIntelMode, IDPS:intrusionDetection.mode}" -o table
echo ""

# Check 5: VNet peering security
echo "=== CHECK 5: Peering Configuration ==="
az network vnet peering list --vnet-name vnet-hub --resource-group $RG \
  --query "[].{Peer:name, AllowForwarded:allowForwardedTraffic, AllowGWTransit:allowGatewayTransit}" -o table
echo ""

# Check 6: Private endpoint connections
echo "=== CHECK 6: Private Endpoints ==="
az network private-endpoint list --resource-group $RG \
  --query "[].{Name:name, Status:privateLinkServiceConnections[0].privateLinkServiceConnectionState.status}" -o table
echo ""

# Check 7: Identify security gaps
echo "=== IDENTIFIED GAPS ==="
echo "1. [ ] NSG flow logs not enabled on all NSGs"
echo "2. [ ] No DDoS protection plan on VNets with public-facing services"
echo "3. [ ] Development spoke can still reach staging via hub"
echo "4. [ ] No Web Application Firewall (WAF) for web tier"
echo "5. [ ] Diagnostic settings not configured on all resources"
echo "6. [ ] No Azure Virtual Network Manager for cross-subscription governance"
```

---

## Task 6: Implement remediation for identified gaps

Address the security gaps found during the assessment.

```bash
# Remediation 1: Enable NSG flow logs on all NSGs
FLOW_STORAGE="stflowarch$(openssl rand -hex 4)"
az storage account create --name $FLOW_STORAGE --resource-group $RG \
  --location $LOCATION --sku Standard_LRS

WORKSPACE_NAME="law-arch-review"
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME --resource-group $RG --location $LOCATION
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME --resource-group $RG --query id -o tsv)

for NSG in nsg-prod-web nsg-prod-app nsg-prod-data nsg-dev nsg-staging; do
  NSG_ID=$(az network nsg show --name $NSG --resource-group $RG --query id -o tsv)
  az network watcher flow-log create \
    --name "fl-$NSG" \
    --nsg $NSG_ID \
    --resource-group NetworkWatcherRG \
    --location $LOCATION \
    --storage-account $FLOW_STORAGE \
    --enabled true --format JSON --log-version 2 --retention 90 \
    --traffic-analytics true --workspace $WORKSPACE_ID 2>/dev/null
done

# Remediation 2: Enable DDoS protection (Network protection tier)
# Note: DDoS Protection plan has significant cost (~$2,944/month)
# For the review, document the recommendation
echo "RECOMMENDATION: Enable Azure DDoS Network Protection on vnet-hub"
echo "Cost impact: ~\$2,944/month + overage charges"
echo "Alternative: DDoS IP Protection at \$199/month per public IP"

# Remediation 3: Block dev-to-staging traffic via NSG
az network nsg rule create \
  --nsg-name nsg-dev --resource-group $RG \
  --name Deny-To-Staging --priority 110 --direction Outbound \
  --access Deny --protocol "*" \
  --source-address-prefixes "*" --destination-address-prefixes "10.3.0.0/16" \
  --destination-port-ranges "*"

# Remediation 4: Document WAF recommendation
echo ""
echo "RECOMMENDATION: Deploy Azure Application Gateway with WAF v2"
echo "  - Place in hub VNet or dedicated WAF subnet"
echo "  - Enable OWASP 3.2 rule set"
echo "  - Configure custom rules for API protection"
echo "  - Enable bot protection"

# Remediation 5: Enable diagnostic settings
AFW_ID=$(az network firewall show --name "afw-contoso-hub" --resource-group $RG --query id -o tsv)
az monitor diagnostic-settings create \
  --name "afw-security-logs" --resource $AFW_ID --workspace $WORKSPACE_ID \
  --logs '[{"category":"AzureFirewallApplicationRule","enabled":true},{"category":"AzureFirewallNetworkRule","enabled":true},{"category":"AZFWIdpsSignature","enabled":true},{"category":"AZFWThreatIntel","enabled":true}]'

echo ""
echo "========================================"
echo "  ARCHITECTURE REVIEW SUMMARY          "
echo "========================================"
echo ""
echo "Defense-in-Depth Layers Implemented:"
echo "  ✅ Layer 1: Azure DDoS Protection (recommended)"
echo "  ✅ Layer 2: Azure Firewall (Premium) with threat intelligence + IDPS"
echo "  ✅ Layer 3: NSGs with micro-segmentation per tier"
echo "  ✅ Layer 4: Private Endpoints for PaaS (public access disabled)"
echo "  ✅ Layer 5: Encryption (TLS 1.2+, CMK where applicable)"
echo "  ✅ Layer 6: NSG Flow Logs + Traffic Analytics for monitoring"
echo "  ⚠️  Layer 7: WAF for web application protection (recommended)"
echo "  ✅ Layer 8: Environment isolation (dev/staging blocked from prod)"
echo ""
echo "Compliance Status: PARTIALLY COMPLIANT"
echo "  - Implement WAF and DDoS Protection to achieve full compliance"
```

---

## Break & Fix

### Scenario 1: Complete architecture — staging resources can access production database

Despite NSG rules on the production data tier, a VM in staging can connect to the production SQL database on port 1433 through the hub firewall.

<details>
<summary>Show solution</summary>

```bash
# The firewall has a broad inter-spoke allow rule or the network rules
# don't distinguish between staging and production address ranges

# Check firewall network rules
az network firewall policy rule-collection-group collection list \
  --rule-collection-group-name "rcg-platform" \
  --policy-name "afwp-contoso-enterprise" \
  --resource-group $RG

# Fix: Add explicit deny rule in firewall for staging-to-prod-data
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-deny-staging-to-prod-data" \
  --rule-collection-group-name "rcg-platform" \
  --policy-name "afwp-contoso-enterprise" \
  --resource-group $RG \
  --collection-priority 90 --action Deny \
  --rule-type NetworkRule \
  --rules "[{\"name\":\"Deny-Staging-To-ProdDB\",\"sourceAddresses\":[\"10.3.0.0/16\"],\"destinationAddresses\":[\"10.1.3.0/24\"],\"destinationPorts\":[\"1433\",\"5432\",\"6379\"],\"ipProtocols\":[\"TCP\"]}]"

# Also strengthen the NSG on production data tier
az network nsg rule create \
  --nsg-name nsg-prod-data --resource-group $RG \
  --name Deny-Staging-Inbound --priority 90 --direction Inbound \
  --access Deny --protocol "*" \
  --source-address-prefixes "10.3.0.0/16" \
  --destination-address-prefixes "*" --destination-port-ranges "*"
```

</details>

### Scenario 2: Private DNS resolution works in hub but not in spokes

VMs in spoke VNets cannot resolve the private endpoint FQDNs (e.g., storage.privatelink.blob.core.windows.net) while VMs in the hub can.

<details>
<summary>Show solution</summary>

```bash
# Check if Private DNS zones are linked to spoke VNets
for ZONE in "privatelink.blob.core.windows.net" "privatelink.database.windows.net" "privatelink.vaultcore.azure.net"; do
  echo "Zone: $ZONE"
  az network private-dns link vnet list \
    --zone-name $ZONE --resource-group $RG \
    --query "[].{Link:name, VNet:virtualNetwork.id}" -o table
  echo ""
done

# Fix: Link Private DNS zones to all spoke VNets
for ZONE in "privatelink.blob.core.windows.net" "privatelink.database.windows.net" "privatelink.vaultcore.azure.net"; do
  for SPOKE in prod dev staging; do
    az network private-dns link vnet create \
      --name "link-spoke-$SPOKE" \
      --resource-group $RG \
      --zone-name $ZONE \
      --virtual-network "vnet-spoke-$SPOKE" \
      --registration-enabled false 2>/dev/null
  done
done

# If spokes use custom DNS, ensure conditional forwarders exist for privatelink zones
echo "If using custom DNS servers on spoke VNets:"
echo "  Configure conditional forwarders for privatelink.* → 168.63.129.16"
```

</details>

### Scenario 3: Firewall logs show no traffic despite UDRs being configured

Azure Firewall diagnostic logs show zero traffic from spoke subnets even though UDRs are associated and point to the firewall IP.

<details>
<summary>Show solution</summary>

```bash
# Check UDR association
az network vnet subnet show --name snet-web --vnet-name vnet-spoke-prod \
  --resource-group $RG --query "routeTable.id"

# Verify the next-hop IP matches the firewall's private IP
AFW_IP=$(az network firewall show --name "afw-contoso-hub" --resource-group $RG \
  --query "ipConfigurations[0].privateIPAddress" -o tsv)
echo "Firewall IP: $AFW_IP"

az network route-table route list --route-table-name rt-spoke-to-fw \
  --resource-group $RG --query "[].{Prefix:addressPrefix, NextHop:nextHopIpAddress}" -o table

# Check VNet peering allows forwarded traffic
az network vnet peering show --name spoke-prod-to-hub \
  --vnet-name vnet-spoke-prod --resource-group $RG \
  --query "{AllowForwarded:allowForwardedTraffic, State:peeringState}"

# Fix: Ensure peering allows forwarded traffic
az network vnet peering update --name spoke-prod-to-hub \
  --vnet-name vnet-spoke-prod --resource-group $RG \
  --set allowForwardedTraffic=true

# Also check from hub side
az network vnet peering update --name hub-to-spoke-prod \
  --vnet-name vnet-hub --resource-group $RG \
  --set allowForwardedTraffic=true

# Verify diagnostic settings are on the firewall
az monitor diagnostic-settings list --resource $AFW_ID \
  --query "[].name" -o tsv
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "In a hub-and-spoke architecture with Azure Firewall, which combination provides defense-in-depth for a web application?",
    options: [
      "NSG on subnet + Azure Firewall only",
      "Azure DDoS Protection + WAF + Azure Firewall + NSGs + Private Endpoints for backend PaaS",
      "Azure Firewall Premium with IDPS only",
      "NSGs + Private Endpoints only"
    ],
    correctIndex: 1,
    explanation: "True defense-in-depth requires multiple layers: DDoS Protection (volumetric attack mitigation), WAF (application-layer protection), Azure Firewall (network-layer inspection with IDPS), NSGs (micro-segmentation), and Private Endpoints (eliminating public attack surface for backend services). Each layer addresses different threat vectors."
  },
  {
    question: "When implementing forced tunneling through Azure Firewall in a hub-and-spoke architecture, what must be configured on VNet peerings?",
    options: [
      "allowVirtualNetworkAccess must be false",
      "allowForwardedTraffic must be true on both sides of the peering",
      "allowGatewayTransit must be true on the spoke side",
      "useRemoteGateways must be true on the hub side"
    ],
    correctIndex: 1,
    explanation: "For traffic from spokes to be forwarded through the hub's Azure Firewall, 'allowForwardedTraffic' must be enabled on both the hub-to-spoke and spoke-to-hub peering connections. Without this, traffic destined for the firewall's IP will be dropped at the peering boundary."
  },
  {
    question: "What is the recommended approach to ensure Private DNS zone resolution works for private endpoints in a hub-and-spoke topology?",
    options: [
      "Deploy Private DNS zones in each spoke VNet independently",
      "Link centralized Private DNS zones (in hub resource group) to all VNets that need resolution",
      "Use Azure Firewall DNS proxy exclusively",
      "Configure hosts files on each VM"
    ],
    correctIndex: 1,
    explanation: "The recommended approach is to deploy Private DNS zones centrally (often in the hub's connectivity resource group) and link them to all VNets (hub and all spokes) that need to resolve private endpoint addresses. This ensures consistent DNS resolution across the entire topology."
  },
  {
    question: "In a network security architecture review, which finding represents the highest risk?",
    options: [
      "NSG flow logs are not enabled on development VNet NSGs",
      "PaaS services have both public access and private endpoints enabled simultaneously",
      "Azure Firewall IDPS is set to 'Alert' mode instead of 'Deny' mode",
      "DDoS Protection is not enabled on the hub VNet"
    ],
    correctIndex: 1,
    explanation: "Having both public access and private endpoints enabled means the PaaS service is still exposed to the internet, negating the security benefit of private endpoints. This represents the highest risk because it provides a direct attack path bypassing all network security controls (firewall, NSGs, segmentation)."
  }
]} />

## Cleanup

```bash
# Delete flow logs
for NSG in nsg-prod-web nsg-prod-app nsg-prod-data nsg-dev nsg-staging; do
  az network watcher flow-log delete --name "fl-$NSG" --location $LOCATION 2>/dev/null
done

# Delete the resource group (will take several minutes due to firewall)
az group delete --name $RG --yes --no-wait

# Purge Key Vault
az keyvault purge --name $KV_NAME --no-wait 2>/dev/null

echo "Cleanup initiated. Azure Firewall deletion may take 10+ minutes."
```
