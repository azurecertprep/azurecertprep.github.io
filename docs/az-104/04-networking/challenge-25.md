---
sidebar_position: 25
title: "Challenge 25: Private Endpoints & Service Endpoints"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 25: private endpoints & Service endpoints

:::info Estimated Time and Cost

**60-75 minutes** | **Estimated cost**: ~$0.15 | **Exam Weight: 15-20%**

:::

## Scenario

Contoso Ltd.'s security team has issued a mandate: all PaaS services (Storage, Key Vault, SQL) must be accessible only from within the corporate VNet. No public internet exposure is allowed. You must implement both service endpoints and private endpoints, understand their differences, and configure private DNS zones for seamless name resolution.

## Exam skills covered

- Configure service endpoints for Azure PaaS services
- Configure private endpoints for Azure PaaS services
- Configure private DNS zones for private endpoints
- Compare service endpoint vs private endpoint behavior
- Configure network policies for private endpoints

## Sysadmin ↔ Azure reference

| On-Prem / Traditional | Azure Equivalent |
|---|---|
| Direct fiber link to service provider | Service Endpoint (optimized route to PaaS) |
| Private leased line to SaaS | Private Endpoint (private IP in your VNet) |
| Internal DNS for private services | Private DNS Zone |
| Split-brain DNS | Private DNS Zone linked to VNet |
| Firewall rules restricting source IPs | Storage/Key Vault firewall with VNet rules |
| Network segmentation for sensitive data | Private Endpoint + NSG policies |

## Setup

```bash
# Variables
RG="rg-az104-challenge25"
LOCATION="eastus"
SUFFIX=$RANDOM

# Create resource group
az group create --name $RG --location $LOCATION

# Create VNet with subnets
az network vnet create \
  --resource-group $RG \
  --name vnet-contoso \
  --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-workload \
  --subnet-prefix 10.0.1.0/24

# Add a subnet for private endpoints
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-contoso \
  --name subnet-privateendpoints \
  --address-prefix 10.0.2.0/24

# Add a subnet for service endpoints
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-contoso \
  --name subnet-serviceendpoints \
  --address-prefix 10.0.3.0/24
```

## Tasks

### Task 1: create target PaaS resources

```bash
# Create a Storage account
STORAGE_NAME="contososa$SUFFIX"
az storage account create \
  --resource-group $RG \
  --name $STORAGE_NAME \
  --sku Standard_LRS \
  --location $LOCATION

# Create a blob container
az storage container create \
  --name documents \
  --account-name $STORAGE_NAME

# Create a Key Vault
KV_NAME="contoso-kv-$SUFFIX"
az keyvault create \
  --resource-group $RG \
  --name $KV_NAME \
  --location $LOCATION \
  --sku standard

# Add a test secret
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "db-connection-string" \
  --value "Server=sql.contoso.local;Database=app;Trusted_Connection=True;"
```

### Task 2: configure Service endpoint for Storage

```bash
# Enable the Microsoft.Storage service endpoint on the subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-contoso \
  --name subnet-serviceendpoints \
  --service-endpoints Microsoft.Storage

# Verify service endpoint is enabled
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name vnet-contoso \
  --name subnet-serviceendpoints \
  --query "serviceEndpoints[].service" -o table

# Configure storage account firewall to allow only VNet traffic
az storage account network-rule add \
  --resource-group $RG \
  --account-name $STORAGE_NAME \
  --vnet-name vnet-contoso \
  --subnet subnet-serviceendpoints

# Set default action to deny (block public access)
az storage account update \
  --resource-group $RG \
  --name $STORAGE_NAME \
  --default-action Deny

# Verify network rules
az storage account network-rule list \
  --resource-group $RG \
  --account-name $STORAGE_NAME -o table
```

:::tip Service Endpoints

Service endpoints keep traffic on the Azure backbone network and restrict PaaS access to specific VNet subnets. The PaaS service's public IP is still used for communication, but the source is identified by the VNet/subnet rather than a public IP.

:::
### Task 3: configure private endpoint for Storage

```bash
# Disable private endpoint network policies on the subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-contoso \
  --name subnet-privateendpoints \
  --private-endpoint-network-policies Disabled

# Get storage account resource ID
STORAGE_ID=$(az storage account show \
  --resource-group $RG \
  --name $STORAGE_NAME \
  --query "id" -o tsv)

# Create private endpoint for blob storage
az network private-endpoint create \
  --resource-group $RG \
  --name pe-storage-blob \
  --vnet-name vnet-contoso \
  --subnet subnet-privateendpoints \
  --private-connection-resource-id $STORAGE_ID \
  --group-id blob \
  --connection-name storage-blob-connection

# Verify private endpoint
az network private-endpoint show \
  --resource-group $RG \
  --name pe-storage-blob \
  --query "{Name:name, PrivateIP:customDnsConfigs[0].ipAddresses[0], Status:privateLinkServiceConnections[0].privateLinkServiceConnectionState.status}" -o table
```

### Task 4: configure private DNS zone for Storage

```bash
# Create private DNS zone for blob storage
az network private-dns zone create \
  --resource-group $RG \
  --name "privatelink.blob.core.windows.net"

# Link the private DNS zone to the VNet
az network private-dns link vnet create \
  --resource-group $RG \
  --zone-name "privatelink.blob.core.windows.net" \
  --name link-to-vnet \
  --virtual-network vnet-contoso \
  --registration-enabled false

# Create DNS zone group (auto-registers the private endpoint ip)
az network private-endpoint dns-zone-group create \
  --resource-group $RG \
  --endpoint-name pe-storage-blob \
  --name storage-dns-group \
  --private-dns-zone "privatelink.blob.core.windows.net" \
  --zone-name blob

# Verify DNS record was created
az network private-dns record-set a list \
  --resource-group $RG \
  --zone-name "privatelink.blob.core.windows.net" -o table
```

:::tip Private DNS Zones

When you create a private endpoint, you need a Private DNS Zone so that the FQDN (e.g., `contososa12345.blob.core.windows.net`) resolves to the private IP (e.g., `10.0.2.4`) instead of the public IP. The zone name must match the service's privatelink zone (e.g., `privatelink.blob.core.windows.net`).

:::
### Task 5: configure private endpoint for Key Vault

```bash
# Get Key Vault resource ID
KV_ID=$(az keyvault show \
  --resource-group $RG \
  --name $KV_NAME \
  --query "id" -o tsv)

# Create private endpoint for Key Vault
az network private-endpoint create \
  --resource-group $RG \
  --name pe-keyvault \
  --vnet-name vnet-contoso \
  --subnet subnet-privateendpoints \
  --private-connection-resource-id $KV_ID \
  --group-id vault \
  --connection-name keyvault-connection

# Create private DNS zone for Key Vault
az network private-dns zone create \
  --resource-group $RG \
  --name "privatelink.vaultcore.azure.net"

# Link DNS zone to VNet
az network private-dns link vnet create \
  --resource-group $RG \
  --zone-name "privatelink.vaultcore.azure.net" \
  --name link-kv-to-vnet \
  --virtual-network vnet-contoso \
  --registration-enabled false

# Create DNS zone group for Key Vault PE
az network private-endpoint dns-zone-group create \
  --resource-group $RG \
  --endpoint-name pe-keyvault \
  --name keyvault-dns-group \
  --private-dns-zone "privatelink.vaultcore.azure.net" \
  --zone-name vault

# Disable public access on Key Vault
az keyvault update \
  --resource-group $RG \
  --name $KV_NAME \
  --public-network-access Disabled

# Verify DNS records
az network private-dns record-set a list \
  --resource-group $RG \
  --zone-name "privatelink.vaultcore.azure.net" -o table
```

### Task 6: verify name resolution through private DNS

```bash
# Deploy a test VM in the workload subnet
az vm create \
  --resource-group $RG \
  --name vm-test \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-contoso \
  --subnet subnet-workload \
  --public-ip-address vm-test-pip \
  --admin-username azureuser \
  --generate-ssh-keys

# Test DNS resolution from within the VNet
az vm run-command invoke \
  --resource-group $RG \
  --name vm-test \
  --command-id RunShellScript \
  --scripts "nslookup $STORAGE_NAME.blob.core.windows.net"

# Expected: resolves to private IP (10.0.2.x) NOT public IP

# Test Key Vault DNS resolution
az vm run-command invoke \
  --resource-group $RG \
  --name vm-test \
  --command-id RunShellScript \
  --scripts "nslookup $KV_NAME.vault.azure.net"

# Expected: resolves to private IP (10.0.2.x)
```

### Task 7: configure Network Policies for private endpoints

```bash
# Enable NSG support for private endpoints (newer feature)
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-contoso \
  --name subnet-privateendpoints \
  --private-endpoint-network-policies Enabled

# Create an NSG with rules for private endpoint subnet
az network nsg create \
  --resource-group $RG \
  --name nsg-privateendpoints

# Allow traffic from workload subnet only
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-privateendpoints \
  --name AllowWorkloadSubnet \
  --priority 100 \
  --direction Inbound \
  --source-address-prefixes 10.0.1.0/24 \
  --destination-address-prefixes 10.0.2.0/24 \
  --destination-port-ranges 443 \
  --protocol Tcp \
  --access Allow

# Deny all other inbound
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-privateendpoints \
  --name DenyAllInbound \
  --priority 200 \
  --direction Inbound \
  --source-address-prefixes "*" \
  --destination-address-prefixes 10.0.2.0/24 \
  --destination-port-ranges "*" \
  --protocol "*" \
  --access Deny

# Associate NSG with private endpoint subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-contoso \
  --name subnet-privateendpoints \
  --network-security-group nsg-privateendpoints
```

### Task 8: compare Service endpoints vs private endpoints

Deploy both approaches side by side and observe the differences:

```bash
# From the test VM, check how storage is accessed via each method:

# Service endpoint path: traffic goes to public IP but via Azure backbone
# The source is identified as the VNet subnet
echo "Service Endpoint: Uses public IP, traffic stays on Azure backbone"
echo "Storage sees source as: VNet/Subnet identity"

# Private endpoint path: traffic goes to a private IP in your VNet
# Full private connectivity, no public IP involved
echo "Private Endpoint: Uses private IP (10.0.2.x) in your VNet"
echo "Storage sees source as: Private endpoint connection"

# Summary comparison
echo "
| Feature              | Service Endpoint          | Private Endpoint           |
|---------------------|---------------------------|---------------------------|
| IP used             | Public IP of PaaS         | Private IP in VNet        |
| DNS resolution      | Public IP                 | Private IP (via DNS zone) |
| Traffic path        | Azure backbone            | VNet (never leaves VNet)  |
| Cross-region        | Same region only           | Cross-region supported    |
| On-premises access  | Not accessible             | Accessible via VPN/ER     |
| Cost                | Free                      | Per hour + data processed |
| NSG support         | Limited                   | Full NSG support          |
"
```

## Success criteria

<SuccessChecklist
  storageKey="az104-challenge-25"
  items={[
    "Storage account created with public access denied",
    "Service endpoint enabled on subnet for Microsoft.Storage",
    "Storage firewall configured to allow VNet traffic via service endpoint",
    "Private endpoint created for Storage (blob) with private IP",
    "Private DNS zone created and linked to VNet for blob storage",
    "DNS resolves storage FQDN to private IP from within VNet",
    "Private endpoint created for Key Vault with private DNS",
    "Key Vault public access disabled",
    "Network policies (NSG) configured for private endpoint subnet",
    "Differences between service endpoints and private endpoints understood"
  ]}
/>
## Break & fix

### Scenario a: DNS not resolving to private IP

```bash
# Symptom: nslookup returns public IP instead of private IP
# Cause: private DNS zone not linked to the VNet

# Check DNS zone links
az network private-dns link vnet list \
  --resource-group $RG \
  --zone-name "privatelink.blob.core.windows.net" -o table

# Fix: link the DNS zone to the VNet
az network private-dns link vnet create \
  --resource-group $RG \
  --zone-name "privatelink.blob.core.windows.net" \
  --name fix-link \
  --virtual-network vnet-contoso \
  --registration-enabled false
```

### Scenario b: private endpoint connection not approved

```bash
# If using manual approval, the connection stays in "Pending" state
az network private-endpoint show \
  --resource-group $RG \
  --name pe-storage-blob \
  --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status"

# If pending, approve it on the resource side:
# az network private-endpoint-connection approve \
# --resource-group $rg \
# --resource-name $storage_name \
# --type Microsoft.Storage/storageAccounts \
# --name <connection-name>
```

### Scenario c: Storage accessible from internet despite Firewall

```bash
# Check if default action is set correctly
az storage account show -g $RG -n $STORAGE_NAME \
  --query "networkRuleSet.defaultAction"

# Should be "Deny": if "Allow", public access is still open
az storage account update -g $RG -n $STORAGE_NAME --default-action Deny

# Also check if "Allow Azure services" bypass is enabled
az storage account show -g $RG -n $STORAGE_NAME \
  --query "networkRuleSet.bypass"
```

## Knowledge check

**1. What are the key differences between service endpoints and private endpoints?**

<details>
<summary>Show Answer</summary>

| Aspect | Service Endpoint | Private Endpoint |
|--------|-----------------|-----------------|
| IP address | PaaS public IP | Private IP in your VNet |
| DNS | Resolves to public IP | Resolves to private IP (needs Private DNS) |
| On-premises access | No (VNet-only) | Yes (via VPN/ExpressRoute) |
| Cross-region | No (same region) | Yes |
| Data exfiltration protection | Limited | Strong (specific resource) |
| Cost | Free | Hourly charge + data |
| Configuration | Subnet-level | Resource-specific |
</details>

**2. What private DNS zone names are required for common services?**

<details>
<summary>Show Answer</summary>

| Service | Group ID | Private DNS Zone |
|---------|----------|-----------------|
| Blob Storage | blob | privatelink.blob.core.windows.net |
| File Storage | file | privatelink.file.core.windows.net |
| Queue Storage | queue | privatelink.queue.core.windows.net |
| Table Storage | table | privatelink.table.core.windows.net |
| Key Vault | vault | privatelink.vaultcore.azure.net |
| SQL Database | sqlServer | privatelink.database.windows.net |
| Cosmos DB | Sql | privatelink.documents.azure.com |
| App Service | sites | privatelink.azurewebsites.net |
</details>

**3. Why must you disable private endpoint network policies on a subnet?**

<details>
<summary>Show Answer</summary>

By default, NSG rules and UDRs do not apply to private endpoints. The subnet setting `privateEndpointNetworkPolicies` controls this:
- **Disabled** (legacy default): NSGs and route tables are ignored for PE traffic
- **Enabled**: NSGs and route tables apply to private endpoint traffic (recommended for granular control)

You must explicitly enable this if you want to use NSGs to control access to private endpoints.
</details>

**4. Can a private endpoint be accessed from on-premises?**

<details>
<summary>Show Answer</summary>

Yes. This is a key advantage over service endpoints. On-premises clients can access private endpoints through:
1. VPN connection to the VNet
2. ExpressRoute private peering to the VNet
3. DNS must resolve the PaaS FQDN to the private IP (configure conditional forwarders on-premises pointing to Azure Private DNS resolver or the VNet DNS)
</details>

## Cleanup

```bash
# Delete all resources
az group delete --name $RG --yes --no-wait

echo "Resources are being deleted in the background."
```

## Learning resources

- [What is Azure Private Link?](https://learn.microsoft.com/azure/private-link/private-link-overview)
- [Create a private endpoint](https://learn.microsoft.com/azure/private-link/create-private-endpoint-cli)
- [Virtual network service endpoints](https://learn.microsoft.com/azure/virtual-network/virtual-network-service-endpoints-overview)
- [Azure Private DNS zones](https://learn.microsoft.com/azure/dns/private-dns-overview)
- [Private endpoint DNS integration](https://learn.microsoft.com/azure/private-link/private-endpoint-dns)
- [Manage network policies for private endpoints](https://learn.microsoft.com/azure/private-link/disable-private-endpoint-network-policy)
