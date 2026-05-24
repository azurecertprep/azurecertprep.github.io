---
sidebar_position: 25
title: "Desafio 25: Revisão de Arquitetura de Segurança de Rede"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 25: Revisão de Arquitetura de Segurança de Rede

## Habilidades do exame cobertas

- Projetar estratégias de segmentação de rede ponta a ponta
- Avaliar a postura de segurança de rede em múltiplos serviços Azure
- Implementar defesa em profundidade para arquiteturas de rede
- Integrar múltiplos controles de segurança de rede (NSGs, Azure Firewall, Private Endpoints, AVNM)
- Revisar e remediar configurações incorretas de segurança de rede
- Documentar decisões de arquitetura de segurança de rede

## Cenário

A Contoso Ltd concluiu sua migração para a nuvem e agora opera um ambiente Azure complexo com múltiplas assinaturas, rede hub-and-spoke, serviços PaaS, conectividade híbrida e uma força de trabalho remota. O CISO solicitou uma revisão abrangente da arquitetura de segurança de rede antes da auditoria anual de conformidade. O ambiente inclui: uma VNet hub com Azure Firewall, três VNets spoke (produção, desenvolvimento, staging), múltiplos serviços PaaS acessados via Private Endpoints, VPN site-to-site para dois escritórios filiais e VPN point-to-site para trabalhadores remotos. Você deve realizar uma revisão holística de segurança, identificar lacunas e implementar remediações que demonstrem defesa em profundidade em todas as camadas de rede.

---

## Pré-requisitos

- Assinatura Azure com funções Network Contributor e Security Reader
- Azure CLI instalado e autenticado (`az login`)
- Conclusão dos Desafios 17-24 (entendimento conceitual)
- Entendimento dos princípios de defesa em profundidade de segurança de rede
- Familiaridade com o Azure Well-Architected Framework (pilar de Segurança)

---

## Tarefa 1: Implantar a arquitetura completa para revisão

Crie a arquitetura de rede completa da Contoso representando uma implantação empresarial real.

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

## Tarefa 2: Implementar segmentação NSG em todas as camadas

Aplique regras NSG abrangentes implementando micro-segmentação dentro do spoke de produção.

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

## Tarefa 3: Implantar Azure Firewall com políticas abrangentes

Implante o firewall central com políticas cobrindo todos os fluxos de tráfego.

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

## Tarefa 4: Implantar Private Endpoints para serviços PaaS

Proteja todos os serviços PaaS com Private Endpoints e desabilite o acesso público.

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

## Tarefa 5: Realizar avaliação de postura de segurança

Execute uma avaliação abrangente da postura de segurança de rede.

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

## Tarefa 6: Implementar remediação para lacunas identificadas

Resolva as lacunas de segurança encontradas durante a avaliação.

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

## Quebra & conserta

### Cenário 1: Arquitetura completa — recursos de staging conseguem acessar o banco de dados de produção

Apesar das regras NSG na camada de dados de produção, uma VM no staging consegue se conectar ao banco de dados SQL de produção na porta 1433 através do firewall do hub.

<details>
<summary>Mostrar solução</summary>

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

### Cenário 2: Resolução DNS privada funciona no hub mas não nos spokes

VMs nas VNets spoke não conseguem resolver os FQDNs de Private Endpoint (ex.: storage.privatelink.blob.core.windows.net) enquanto VMs no hub conseguem.

<details>
<summary>Mostrar solução</summary>

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

### Cenário 3: Logs do firewall não mostram tráfego apesar das UDRs estarem configuradas

Os logs de diagnóstico do Azure Firewall mostram zero tráfego das sub-redes spoke, mesmo que as UDRs estejam associadas e apontem para o IP do firewall.

<details>
<summary>Mostrar solução</summary>

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

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Em uma arquitetura hub-and-spoke com Azure Firewall, qual combinação fornece defesa em profundidade para uma aplicação web?",
    options: [
      "NSG na sub-rede + Azure Firewall apenas",
      "Azure DDoS Protection + WAF + Azure Firewall + NSGs + Private Endpoints para PaaS backend",
      "Azure Firewall Premium com IDPS apenas",
      "NSGs + Private Endpoints apenas"
    ],
    correctIndex: 1,
    explanation: "A verdadeira defesa em profundidade requer múltiplas camadas: DDoS Protection (mitigação de ataques volumétricos), WAF (proteção na camada de aplicação), Azure Firewall (inspeção na camada de rede com IDPS), NSGs (micro-segmentação) e Private Endpoints (eliminação da superfície de ataque pública para serviços backend). Cada camada aborda diferentes vetores de ameaça."
  },
  {
    question: "Ao implementar tunelamento forçado através do Azure Firewall em uma arquitetura hub-and-spoke, o que deve ser configurado nos peerings de VNet?",
    options: [
      "allowVirtualNetworkAccess deve ser false",
      "allowForwardedTraffic deve ser true em ambos os lados do peering",
      "allowGatewayTransit deve ser true no lado do spoke",
      "useRemoteGateways deve ser true no lado do hub"
    ],
    correctIndex: 1,
    explanation: "Para que o tráfego dos spokes seja encaminhado através do Azure Firewall do hub, 'allowForwardedTraffic' deve ser habilitado nas conexões de peering hub-to-spoke e spoke-to-hub. Sem isso, o tráfego destinado ao IP do firewall será descartado na fronteira do peering."
  },
  {
    question: "Qual é a abordagem recomendada para garantir que a resolução de zona DNS privada funcione para Private Endpoints em uma topologia hub-and-spoke?",
    options: [
      "Implantar zonas DNS privadas em cada VNet spoke independentemente",
      "Vincular zonas DNS privadas centralizadas (no resource group do hub) a todas as VNets que precisam de resolução",
      "Usar o proxy DNS do Azure Firewall exclusivamente",
      "Configurar arquivos hosts em cada VM"
    ],
    correctIndex: 1,
    explanation: "A abordagem recomendada é implantar zonas DNS privadas centralmente (geralmente no resource group de conectividade do hub) e vinculá-las a todas as VNets (hub e todos os spokes) que precisam resolver endereços de Private Endpoint. Isso garante resolução DNS consistente em toda a topologia."
  },
  {
    question: "Em uma revisão de arquitetura de segurança de rede, qual achado representa o maior risco?",
    options: [
      "NSG flow logs não estão habilitados nos NSGs da VNet de desenvolvimento",
      "Serviços PaaS têm acesso público e Private Endpoints habilitados simultaneamente",
      "O IDPS do Azure Firewall está configurado no modo 'Alert' em vez do modo 'Deny'",
      "DDoS Protection não está habilitado na VNet hub"
    ],
    correctIndex: 1,
    explanation: "Ter acesso público e Private Endpoints habilitados significa que o serviço PaaS ainda está exposto à internet, anulando o benefício de segurança dos Private Endpoints. Isso representa o maior risco porque fornece um caminho de ataque direto contornando todos os controles de segurança de rede (firewall, NSGs, segmentação)."
  }
]} />

## Limpeza

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
