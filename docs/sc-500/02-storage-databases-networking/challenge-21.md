---
sidebar_position: 21
title: "Challenge 21: Private Endpoints for PaaS Resources"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 21: Private Endpoints for PaaS Resources

## Exam skills covered

- Plan and implement private endpoints for Azure PaaS services
- Configure DNS resolution for private endpoints
- Integrate private endpoints with Azure Private DNS zones
- Implement private endpoint network policies
- Secure PaaS services by disabling public access after private endpoint deployment

## Scenario

Contoso Ltd's compliance team has mandated that all PaaS services (Azure SQL, Storage, Key Vault, and Azure Container Registry) must be accessed exclusively over private networks. Currently, these services have public endpoints that are accessible from the internet, which violates the company's data sovereignty and zero-trust requirements. You must deploy private endpoints for each service, configure DNS resolution, and disable public access to ensure all traffic traverses the Microsoft backbone network through private IP addresses.

---

## Prerequisites

- Azure subscription with Network Contributor and service-specific Contributor roles
- Azure CLI installed and authenticated (`az login`)
- A virtual network (or willingness to create one)
- Understanding of DNS resolution and Azure Private DNS zones

---

## Task 1: Create the network infrastructure for private endpoints

Deploy a virtual network with dedicated subnets for private endpoints and client workloads.

```bash
# Set variables
RG="rg-sc500-private-endpoints"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Create virtual network
az network vnet create \
  --name vnet-contoso-private \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16

# Create subnet for private endpoints
az network vnet subnet create \
  --name snet-private-endpoints \
  --vnet-name vnet-contoso-private \
  --resource-group $RG \
  --address-prefix 10.0.1.0/24

# Create subnet for workloads (VMs, App Services, etc.)
az network vnet subnet create \
  --name snet-workloads \
  --vnet-name vnet-contoso-private \
  --resource-group $RG \
  --address-prefix 10.0.2.0/24

# Enable private endpoint network policies (allows NSG on PE subnet)
az network vnet subnet update \
  --name snet-private-endpoints \
  --vnet-name vnet-contoso-private \
  --resource-group $RG \
  --private-endpoint-network-policies Enabled
```

---

## Task 2: Create private endpoint for Azure Storage

Deploy a private endpoint for Azure Blob Storage and configure DNS.

```bash
# Create storage account
STORAGE_ACCOUNT="stprivate$(openssl rand -hex 4)"
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

STORAGE_ID=$(az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --query id -o tsv)

# Create private endpoint for blob service
az network private-endpoint create \
  --name "pe-storage-blob" \
  --resource-group $RG \
  --location $LOCATION \
  --vnet-name vnet-contoso-private \
  --subnet snet-private-endpoints \
  --connection-name "pec-storage-blob" \
  --private-connection-resource-id $STORAGE_ID \
  --group-ids blob

# Create Azure Private DNS zone for blob storage
az network private-dns zone create \
  --name "privatelink.blob.core.windows.net" \
  --resource-group $RG

# Link Private DNS zone to virtual network
az network private-dns link vnet create \
  --name "link-vnet-blob" \
  --resource-group $RG \
  --zone-name "privatelink.blob.core.windows.net" \
  --virtual-network vnet-contoso-private \
  --registration-enabled false

# Create DNS zone group to auto-register the private endpoint DNS record
az network private-endpoint dns-zone-group create \
  --name "dzg-storage-blob" \
  --endpoint-name "pe-storage-blob" \
  --resource-group $RG \
  --private-dns-zone "privatelink.blob.core.windows.net" \
  --zone-name "blob"

# Verify the private IP assigned
az network private-endpoint show \
  --name "pe-storage-blob" \
  --resource-group $RG \
  --query "customDnsConfigurations[].{FQDN:fqdn, IP:ipAddresses[0]}" -o table

# Disable public access on the storage account
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --default-action Deny \
  --public-network-access Disabled
```

---

## Task 3: Create private endpoint for Azure SQL Database

Deploy a private endpoint for Azure SQL and configure DNS resolution.

```bash
# Create Azure SQL Server
SQL_SERVER="sql-private-$(openssl rand -hex 4)"
az sql server create \
  --name $SQL_SERVER \
  --resource-group $RG \
  --location $LOCATION \
  --admin-user "sqladmin" \
  --admin-password "Pr1vat3Endp0int!2024"

SQL_SERVER_ID=$(az sql server show \
  --name $SQL_SERVER \
  --resource-group $RG \
  --query id -o tsv)

# Create SQL Database
az sql db create \
  --name "sqldb-contoso" \
  --server $SQL_SERVER \
  --resource-group $RG \
  --edition Standard \
  --capacity 10

# Create private endpoint for SQL Server
az network private-endpoint create \
  --name "pe-sql-server" \
  --resource-group $RG \
  --location $LOCATION \
  --vnet-name vnet-contoso-private \
  --subnet snet-private-endpoints \
  --connection-name "pec-sql-server" \
  --private-connection-resource-id $SQL_SERVER_ID \
  --group-ids sqlServer

# Create Private DNS zone for SQL
az network private-dns zone create \
  --name "privatelink.database.windows.net" \
  --resource-group $RG

# Link DNS zone to VNet
az network private-dns link vnet create \
  --name "link-vnet-sql" \
  --resource-group $RG \
  --zone-name "privatelink.database.windows.net" \
  --virtual-network vnet-contoso-private \
  --registration-enabled false

# Create DNS zone group
az network private-endpoint dns-zone-group create \
  --name "dzg-sql" \
  --endpoint-name "pe-sql-server" \
  --resource-group $RG \
  --private-dns-zone "privatelink.database.windows.net" \
  --zone-name "sql"

# Disable public network access
az sql server update \
  --name $SQL_SERVER \
  --resource-group $RG \
  --set publicNetworkAccess="Disabled"

# Verify
az network private-endpoint show \
  --name "pe-sql-server" \
  --resource-group $RG \
  --query "customDnsConfigurations[].{FQDN:fqdn, IP:ipAddresses[0]}" -o table
```

---

## Task 4: Create private endpoint for Azure Key Vault

Deploy a private endpoint for Key Vault to protect secrets access.

```bash
# Create Key Vault
KV_NAME="kv-private-$(openssl rand -hex 4)"
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG \
  --location $LOCATION

KV_ID=$(az keyvault show \
  --name $KV_NAME \
  --resource-group $RG \
  --query id -o tsv)

# Create private endpoint for Key Vault
az network private-endpoint create \
  --name "pe-keyvault" \
  --resource-group $RG \
  --location $LOCATION \
  --vnet-name vnet-contoso-private \
  --subnet snet-private-endpoints \
  --connection-name "pec-keyvault" \
  --private-connection-resource-id $KV_ID \
  --group-ids vault

# Create Private DNS zone for Key Vault
az network private-dns zone create \
  --name "privatelink.vaultcore.azure.net" \
  --resource-group $RG

# Link DNS zone to VNet
az network private-dns link vnet create \
  --name "link-vnet-kv" \
  --resource-group $RG \
  --zone-name "privatelink.vaultcore.azure.net" \
  --virtual-network vnet-contoso-private \
  --registration-enabled false

# Create DNS zone group
az network private-endpoint dns-zone-group create \
  --name "dzg-keyvault" \
  --endpoint-name "pe-keyvault" \
  --resource-group $RG \
  --private-dns-zone "privatelink.vaultcore.azure.net" \
  --zone-name "vault"

# Disable public access on Key Vault
az keyvault update \
  --name $KV_NAME \
  --resource-group $RG \
  --public-network-access Disabled

# Verify DNS resolution
az network private-endpoint show \
  --name "pe-keyvault" \
  --resource-group $RG \
  --query "customDnsConfigurations[].{FQDN:fqdn, IP:ipAddresses[0]}" -o table
```

---

## Task 5: Create private endpoint for Azure Container Registry

Deploy a private endpoint for ACR to secure container image pulls.

```bash
# Create Azure Container Registry (Premium required for private endpoints)
ACR_NAME="acrprivate$(openssl rand -hex 4)"
az acr create \
  --name $ACR_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --sku Premium

ACR_ID=$(az acr show \
  --name $ACR_NAME \
  --resource-group $RG \
  --query id -o tsv)

# Create private endpoint for ACR (registry sub-resource)
az network private-endpoint create \
  --name "pe-acr-registry" \
  --resource-group $RG \
  --location $LOCATION \
  --vnet-name vnet-contoso-private \
  --subnet snet-private-endpoints \
  --connection-name "pec-acr-registry" \
  --private-connection-resource-id $ACR_ID \
  --group-ids registry

# Create Private DNS zones for ACR (requires two zones)
az network private-dns zone create \
  --name "privatelink.azurecr.io" \
  --resource-group $RG

az network private-dns zone create \
  --name "$(echo $LOCATION).data.privatelink.azurecr.io" \
  --resource-group $RG

# Link DNS zones to VNet
az network private-dns link vnet create \
  --name "link-vnet-acr" \
  --resource-group $RG \
  --zone-name "privatelink.azurecr.io" \
  --virtual-network vnet-contoso-private \
  --registration-enabled false

az network private-dns link vnet create \
  --name "link-vnet-acr-data" \
  --resource-group $RG \
  --zone-name "$(echo $LOCATION).data.privatelink.azurecr.io" \
  --virtual-network vnet-contoso-private \
  --registration-enabled false

# Create DNS zone group
az network private-endpoint dns-zone-group create \
  --name "dzg-acr" \
  --endpoint-name "pe-acr-registry" \
  --resource-group $RG \
  --private-dns-zone "privatelink.azurecr.io" \
  --zone-name "acr"

# Disable public access
az acr update \
  --name $ACR_NAME \
  --resource-group $RG \
  --public-network-enabled false

# Verify all private endpoints
echo "=== All Private Endpoints ==="
az network private-endpoint list \
  --resource-group $RG \
  --query "[].{Name:name, PrivateIP:customDnsConfigurations[0].ipAddresses[0], Status:privateLinkServiceConnections[0].privateLinkServiceConnectionState.status}" \
  -o table
```

---

## Task 6: Verify DNS resolution and connectivity

Validate that DNS resolves to private IPs and that public access is blocked.

```bash
# List all private DNS zones and their records
echo "=== Private DNS Zones ==="
az network private-dns zone list \
  --resource-group $RG \
  --query "[].name" -o tsv

# Show A records in each zone
for ZONE in "privatelink.blob.core.windows.net" "privatelink.database.windows.net" "privatelink.vaultcore.azure.net" "privatelink.azurecr.io"; do
  echo ""
  echo "--- Zone: $ZONE ---"
  az network private-dns record-set a list \
    --zone-name $ZONE \
    --resource-group $RG \
    --query "[].{Name:name, IP:aRecords[0].ipv4Address}" -o table 2>/dev/null
done

# Verify all private endpoint connections are approved
az network private-endpoint list \
  --resource-group $RG \
  --query "[].{Name:name, Status:privateLinkServiceConnections[0].privateLinkServiceConnectionState.status, Resource:privateLinkServiceConnections[0].privateLinkServiceId}" -o table

# Verify public access is disabled on all services
echo ""
echo "=== Public Access Status ==="
echo "Storage: $(az storage account show --name $STORAGE_ACCOUNT --resource-group $RG --query publicNetworkAccess -o tsv)"
echo "SQL: $(az sql server show --name $SQL_SERVER --resource-group $RG --query publicNetworkAccess -o tsv)"
echo "Key Vault: $(az keyvault show --name $KV_NAME --resource-group $RG --query 'properties.publicNetworkAccess' -o tsv)"
echo "ACR: $(az acr show --name $ACR_NAME --resource-group $RG --query publicNetworkAccess -o tsv)"
```

---

## Break & Fix

### Scenario 1: Private endpoint DNS not resolving to private IP

A VM in the VNet is trying to access the storage account but `nslookup stprivateXXXX.blob.core.windows.net` returns the public IP instead of the private IP (10.0.1.x).

<details>
<summary>Show solution</summary>

```bash
# Check if the Private DNS zone link to the VNet exists
az network private-dns link vnet list \
  --zone-name "privatelink.blob.core.windows.net" \
  --resource-group $RG -o table

# If missing, create the link
az network private-dns link vnet create \
  --name "link-vnet-blob" \
  --resource-group $RG \
  --zone-name "privatelink.blob.core.windows.net" \
  --virtual-network vnet-contoso-private \
  --registration-enabled false

# Verify A record exists in the zone
az network private-dns record-set a list \
  --zone-name "privatelink.blob.core.windows.net" \
  --resource-group $RG -o table

# If no records, recreate the DNS zone group on the private endpoint
az network private-endpoint dns-zone-group create \
  --name "dzg-storage-blob" \
  --endpoint-name "pe-storage-blob" \
  --resource-group $RG \
  --private-dns-zone "privatelink.blob.core.windows.net" \
  --zone-name "blob"

# Also check if the VNet uses custom DNS servers
# If custom DNS is configured, ensure it forwards privatelink zones to Azure DNS (168.63.129.16)
az network vnet show \
  --name vnet-contoso-private \
  --resource-group $RG \
  --query "dhcpOptions.dnsServers"
```

</details>

### Scenario 2: Private endpoint connection stuck in "Pending" state

After creating a private endpoint for a resource in another subscription, the connection shows "Pending" status and traffic cannot flow.

<details>
<summary>Show solution</summary>

```bash
# Check private endpoint connection status
az network private-endpoint show \
  --name "pe-storage-blob" \
  --resource-group $RG \
  --query "privateLinkServiceConnections[].privateLinkServiceConnectionState"

# For cross-subscription scenarios, the resource owner must approve the connection
# List pending connections on the storage account
az network private-endpoint-connection list \
  --id $STORAGE_ID \
  --query "[?properties.privateLinkServiceConnectionState.status=='Pending']"

# Approve the pending connection (must be done by resource owner)
CONN_ID=$(az network private-endpoint-connection list \
  --id $STORAGE_ID \
  --query "[?properties.privateLinkServiceConnectionState.status=='Pending'].id" -o tsv)

az network private-endpoint-connection approve \
  --id $CONN_ID \
  --description "Approved by security team"

# Verify the connection is now approved
az network private-endpoint show \
  --name "pe-storage-blob" \
  --resource-group $RG \
  --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status"
```

</details>

### Scenario 3: NSG blocking traffic to private endpoint

After enabling network policies on the private endpoint subnet and adding an NSG, all traffic to private endpoints is blocked.

<details>
<summary>Show solution</summary>

```bash
# When private endpoint network policies are enabled, NSGs apply to PE traffic
# Check if there's an NSG blocking the traffic

# Find the NSG on the PE subnet
az network vnet subnet show \
  --name snet-private-endpoints \
  --vnet-name vnet-contoso-private \
  --resource-group $RG \
  --query "networkSecurityGroup.id"

# If an NSG is blocking traffic, add an allow rule for the workload subnet
# to reach private endpoints on their specific ports
NSG_NAME="nsg-pe-subnet"  # example

az network nsg rule create \
  --nsg-name $NSG_NAME \
  --resource-group $RG \
  --name "Allow-Workload-To-PE" \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes "10.0.2.0/24" \
  --destination-address-prefixes "10.0.1.0/24" \
  --destination-port-ranges 443 1433 5432

# Alternatively, if PE network policies should not apply, disable them
az network vnet subnet update \
  --name snet-private-endpoints \
  --vnet-name vnet-contoso-private \
  --resource-group $RG \
  --private-endpoint-network-policies Disabled
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What DNS zone must be created for Azure SQL Database private endpoints to resolve correctly?",
    options: [
      "privatelink.sql.azure.com",
      "privatelink.database.windows.net",
      "privatelink.sqlserver.azure.net",
      "privatelink.azure-sql.net"
    ],
    correctIndex: 1,
    explanation: "Azure SQL Database private endpoints require the 'privatelink.database.windows.net' Private DNS zone. The private endpoint DNS record is created as a CNAME chain: server.database.windows.net → server.privatelink.database.windows.net → private IP."
  },
  {
    question: "What happens to existing public access when you create a private endpoint for a PaaS resource?",
    options: [
      "Public access is automatically disabled when the private endpoint is created",
      "Public access remains available unless you explicitly disable it; both access paths coexist",
      "Public access is redirected through the private endpoint",
      "The PaaS resource's public IP is deleted"
    ],
    correctIndex: 1,
    explanation: "Creating a private endpoint does NOT automatically disable public access. Both public and private access paths coexist until you explicitly disable public access (e.g., set publicNetworkAccess to Disabled or configure firewall defaultAction to Deny)."
  },
  {
    question: "Why does Azure Container Registry (ACR) require a Premium SKU for private endpoints?",
    options: [
      "Premium SKU has more storage capacity needed for private networking",
      "Private endpoint support is a Premium-tier feature for ACR",
      "Standard and Basic SKUs don't support DNS resolution",
      "Premium SKU is required for any ACR networking feature"
    ],
    correctIndex: 1,
    explanation: "Private endpoint support in Azure Container Registry is exclusively available in the Premium SKU tier. This is a feature gate, not a technical limitation. Basic and Standard ACR tiers do not support private endpoints."
  },
  {
    question: "What must be configured when a VNet uses custom DNS servers (not Azure-provided) and private endpoints are deployed?",
    options: [
      "Private endpoints must be deployed in a different subnet",
      "Custom DNS servers must conditionally forward privatelink.* zones to Azure DNS (168.63.129.16)",
      "A VPN gateway is required for DNS traffic",
      "Each private endpoint needs a static IP configuration"
    ],
    correctIndex: 1,
    explanation: "When custom DNS servers are configured on a VNet, they must be set up to conditionally forward queries for 'privatelink.*' zones to Azure DNS (168.63.129.16). Otherwise, DNS queries will not reach the Azure Private DNS zones and will resolve to public IPs."
  }
]} />

## Cleanup

```bash
# Delete the resource group and all resources
az group delete --name $RG --yes --no-wait

# Note: Private DNS zones in the resource group will also be deleted
```
