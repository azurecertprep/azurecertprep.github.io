---
sidebar_position: 5
title: "Azure Network CLI Cheat Sheet"
---

# Azure Network CLI cheat sheet

Quick reference for the most common `az network` commands used across AZ-700 challenges.

## Virtual networks

```bash
# Create VNet
az network vnet create \
  --resource-group $RG \
  --name "vnet-hub" \
  --address-prefixes "10.0.0.0/16" \
  --location "eastus2"

# Add subnet
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name "vnet-hub" \
  --name "snet-workload" \
  --address-prefixes "10.0.1.0/24"

# Add subnet with delegation
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name "vnet-hub" \
  --name "snet-appservice" \
  --address-prefixes "10.0.2.0/24" \
  --delegations "Microsoft.Web/serverFarms"

# List effective routes for a NIC
az network nic show-effective-route-table \
  --resource-group $RG \
  --name "nic-vm01" \
  -o table
```

## DNS

```bash
# Create public DNS zone
az network dns zone create \
  --resource-group $RG \
  --name "contoso.com"

# Create private DNS zone
az network private-dns zone create \
  --resource-group $RG \
  --name "privatelink.blob.core.windows.net"

# Link private DNS zone to VNet
az network private-dns link vnet create \
  --resource-group $RG \
  --zone-name "privatelink.blob.core.windows.net" \
  --name "link-vnet-hub" \
  --virtual-network "vnet-hub" \
  --registration-enabled false
```

## Peering

```bash
# Create VNet peering (both directions needed)
az network vnet peering create \
  --resource-group $RG \
  --name "hub-to-spoke1" \
  --vnet-name "vnet-hub" \
  --remote-vnet "vnet-spoke1" \
  --allow-vnet-access true \
  --allow-forwarded-traffic true \
  --allow-gateway-transit true

az network vnet peering create \
  --resource-group $RG_SPOKE \
  --name "spoke1-to-hub" \
  --vnet-name "vnet-spoke1" \
  --remote-vnet "vnet-hub" \
  --allow-vnet-access true \
  --allow-forwarded-traffic true \
  --use-remote-gateways true
```

## Route tables

```bash
# Create route table
az network route-table create \
  --resource-group $RG \
  --name "rt-spoke" \
  --disable-bgp-route-propagation true

# Add route to NVA
az network route-table route create \
  --resource-group $RG \
  --route-table-name "rt-spoke" \
  --name "to-internet-via-nva" \
  --address-prefix "0.0.0.0/0" \
  --next-hop-type "VirtualAppliance" \
  --next-hop-ip-address "10.0.0.4"

# Associate route table with subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name "vnet-spoke1" \
  --name "snet-workload" \
  --route-table "rt-spoke"
```

## NSG

```bash
# Create NSG
az network nsg create \
  --resource-group $RG \
  --name "nsg-web"

# Add inbound rule
az network nsg rule create \
  --resource-group $RG \
  --nsg-name "nsg-web" \
  --name "AllowHTTPS" \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 443 \
  --source-address-prefixes "*"

# Create Application Security Group
az network asg create \
  --resource-group $RG \
  --name "asg-webservers"
```

## VPN Gateway

```bash
# Create VPN Gateway (takes 30-45 minutes)
az network vnet-gateway create \
  --resource-group $RG \
  --name "vpngw-hub" \
  --vnet "vnet-hub" \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw1 \
  --generation Generation1 \
  --no-wait

# Create Local Network Gateway (on-premises)
az network local-gateway create \
  --resource-group $RG \
  --name "lgw-onprem" \
  --gateway-ip-address "203.0.113.1" \
  --local-address-prefixes "192.168.0.0/16"

# Create VPN connection
az network vpn-connection create \
  --resource-group $RG \
  --name "conn-to-onprem" \
  --vnet-gateway1 "vpngw-hub" \
  --local-gateway2 "lgw-onprem" \
  --shared-key "MyS3cur3Key!"
```

## Load Balancer

```bash
# Create public Standard LB
az network lb create \
  --resource-group $RG \
  --name "lb-web" \
  --sku Standard \
  --frontend-ip-name "fe-public" \
  --backend-pool-name "bp-web" \
  --public-ip-address "pip-lb"

# Add health probe
az network lb probe create \
  --resource-group $RG \
  --lb-name "lb-web" \
  --name "probe-http" \
  --protocol Http \
  --port 80 \
  --path "/"

# Add LB rule
az network lb rule create \
  --resource-group $RG \
  --lb-name "lb-web" \
  --name "rule-http" \
  --frontend-ip "fe-public" \
  --backend-pool "bp-web" \
  --probe "probe-http" \
  --protocol Tcp \
  --frontend-port 80 \
  --backend-port 80
```

## Azure Firewall

```bash
# Create Azure Firewall
az network firewall create \
  --resource-group $RG \
  --name "azfw-hub" \
  --location "eastus2" \
  --sku AZFW_VNet \
  --tier Standard

# Create Firewall Policy
az network firewall policy create \
  --resource-group $RG \
  --name "policy-hub" \
  --sku Standard

# Add application rule collection
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name "policy-hub" \
  --name "rcg-application" \
  --priority 200

az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name "policy-hub" \
  --rule-collection-group-name "rcg-application" \
  --name "allow-web" \
  --collection-priority 100 \
  --action Allow \
  --rule-type ApplicationRule \
  --rule-name "allow-microsoft" \
  --protocols Https=443 \
  --source-addresses "10.0.0.0/16" \
  --target-fqdns "*.microsoft.com"
```

## Private Endpoints

```bash
# Create private endpoint for Storage
az network private-endpoint create \
  --resource-group $RG \
  --name "pe-storage" \
  --vnet-name "vnet-hub" \
  --subnet "snet-privateendpoints" \
  --private-connection-resource-id "$STORAGE_ID" \
  --group-ids blob \
  --connection-name "pec-storage-blob"

# Create private DNS zone group (auto-register DNS)
az network private-endpoint dns-zone-group create \
  --resource-group $RG \
  --endpoint-name "pe-storage" \
  --name "default" \
  --private-dns-zone "privatelink.blob.core.windows.net" \
  --zone-name "blob"
```

## Network Watcher

```bash
# Check IP flow (is traffic allowed?)
az network watcher test-ip-flow \
  --direction Inbound \
  --protocol Tcp \
  --local "10.0.1.4:443" \
  --remote "203.0.113.5:50000" \
  --vm "vm-web01" \
  --resource-group $RG

# Get next hop
az network watcher show-next-hop \
  --resource-group $RG \
  --vm "vm-web01" \
  --source-ip "10.0.1.4" \
  --dest-ip "10.1.0.4"

# Connection troubleshoot
az network watcher test-connectivity \
  --resource-group $RG \
  --source-resource "vm-web01" \
  --dest-address "10.1.0.4" \
  --dest-port 443
```
