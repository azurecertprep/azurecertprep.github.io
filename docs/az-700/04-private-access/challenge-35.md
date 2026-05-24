---
sidebar_position: 2
title: "Challenge 35: Private Endpoints for Multiple Services"
sidebar_label: "Challenge 35"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 35: Private endpoints for multiple services

:::info Estimated time and cost

**60-75 minutes** | **~$0.05/h** | **Exam weight: 10-15%**

:::

## Scenario

Contoso Enterprise is standardizing private access for all PaaS services consumed by their line-of-business applications. The security team requires that every Azure service used by production workloads must be accessible exclusively over private endpoints, with public access disabled. You must configure private endpoints for six different services, each with its own correct sub-resource (group-id) and privatelink DNS zone name.

**Architecture:**

<div style={{textAlign: 'center', margin: '20px 0'}}>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 420" style={{maxWidth: '560px', height: 'auto'}} font-family="Segoe UI, Arial, sans-serif">
  <!-- VNet container -->
  <rect x="30" y="10" width="500" height="245" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
  <text x="280" y="32" text-anchor="middle" font-size="12" font-weight="bold">Azure VNet: vnet-enterprise (10.0.0.0/16)</text>
  <!-- snet-app -->
  <rect x="50" y="42" width="200" height="50" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="1.5"/>
  <text x="150" y="62" text-anchor="middle" font-size="10" font-weight="bold">snet-app (10.0.1.0/24)</text>
  <text x="150" y="80" text-anchor="middle" font-size="10" fill="#555">App VMs / AKS</text>
  <!-- snet-pe -->
  <rect x="50" y="105" width="460" height="135" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="1.5"/>
  <text x="280" y="125" text-anchor="middle" font-size="10" font-weight="bold">snet-pe (10.0.2.0/24)</text>
  <!-- Row 1 of PEs -->
  <rect x="70" y="135" width="135" height="40" rx="4" fill="#f5f5f5" stroke="#82b366" stroke-width="1"/>
  <text x="137" y="153" text-anchor="middle" font-size="10" font-weight="bold">PE-Blob</text>
  <text x="137" y="168" text-anchor="middle" font-size="9" fill="#555">.2.4</text>
  <rect x="215" y="135" width="135" height="40" rx="4" fill="#f5f5f5" stroke="#82b366" stroke-width="1"/>
  <text x="282" y="153" text-anchor="middle" font-size="10" font-weight="bold">PE-File</text>
  <text x="282" y="168" text-anchor="middle" font-size="9" fill="#555">.2.5</text>
  <rect x="360" y="135" width="135" height="40" rx="4" fill="#f5f5f5" stroke="#82b366" stroke-width="1"/>
  <text x="427" y="153" text-anchor="middle" font-size="10" font-weight="bold">PE-SQL</text>
  <text x="427" y="168" text-anchor="middle" font-size="9" fill="#555">.2.6</text>
  <!-- Row 2 of PEs -->
  <rect x="70" y="185" width="135" height="40" rx="4" fill="#f5f5f5" stroke="#82b366" stroke-width="1"/>
  <text x="137" y="203" text-anchor="middle" font-size="10" font-weight="bold">PE-KV</text>
  <text x="137" y="218" text-anchor="middle" font-size="9" fill="#555">.2.7</text>
  <rect x="215" y="185" width="135" height="40" rx="4" fill="#f5f5f5" stroke="#82b366" stroke-width="1"/>
  <text x="282" y="203" text-anchor="middle" font-size="10" font-weight="bold">PE-Web</text>
  <text x="282" y="218" text-anchor="middle" font-size="9" fill="#555">.2.8</text>
  <rect x="360" y="185" width="135" height="40" rx="4" fill="#f5f5f5" stroke="#82b366" stroke-width="1"/>
  <text x="427" y="203" text-anchor="middle" font-size="10" font-weight="bold">PE-Cosmos</text>
  <text x="427" y="218" text-anchor="middle" font-size="9" fill="#555">.2.9</text>
  <!-- Private DNS Zones -->
  <rect x="50" y="275" width="460" height="130" rx="8" fill="#f5f5f5" stroke="#666" stroke-width="1.5"/>
  <text x="280" y="298" text-anchor="middle" font-size="11" font-weight="bold">Private DNS Zones</text>
  <text x="100" y="318" font-size="10" fill="#555">● privatelink.blob.core.windows.net</text>
  <text x="100" y="336" font-size="10" fill="#555">● privatelink.file.core.windows.net</text>
  <text x="100" y="354" font-size="10" fill="#555">● privatelink.database.windows.net</text>
  <text x="310" y="318" font-size="10" fill="#555">● privatelink.vaultcore.azure.net</text>
  <text x="310" y="336" font-size="10" fill="#555">● privatelink.azurewebsites.net</text>
  <text x="310" y="354" font-size="10" fill="#555">● privatelink.documents.azure.com</text>
</svg>
</div>

## Learning objectives

After completing this challenge you will be able to:

- Map Azure services to their correct sub-resource group-ids
- Identify the correct privatelink DNS zone name for each service type
- Create private endpoints for Storage (blob/file), SQL Database, Key Vault, Web App, and Cosmos DB
- Verify DNS resolution for each private endpoint
- Disable public access on services after private endpoints are confirmed working

## Prerequisites

- An Azure subscription with Contributor access
- Azure CLI installed and authenticated (`az login`)
- PowerShell with Az module installed (`Install-Module Az -Force`)
- Completion of Challenge 34 (familiarity with PE and DNS concepts)

## Key concepts for AZ-700

### Service-to-group-id and DNS zone mapping

This is the critical reference table for the exam. Each service has a specific group-id and requires a specific privatelink DNS zone:

| Service | Resource type | group-id | Private DNS zone name |
|---------|--------------|----------|----------------------|
| Storage (Blob) | Microsoft.Storage/storageAccounts | `blob` | `privatelink.blob.core.windows.net` |
| Storage (File) | Microsoft.Storage/storageAccounts | `file` | `privatelink.file.core.windows.net` |
| Storage (Table) | Microsoft.Storage/storageAccounts | `table` | `privatelink.table.core.windows.net` |
| Storage (Queue) | Microsoft.Storage/storageAccounts | `queue` | `privatelink.queue.core.windows.net` |
| Azure SQL Database | Microsoft.Sql/servers | `sqlServer` | `privatelink.database.windows.net` |
| Key Vault | Microsoft.KeyVault/vaults | `vault` | `privatelink.vaultcore.azure.net` |
| Web App | Microsoft.Web/sites | `sites` | `privatelink.azurewebsites.net` |
| Cosmos DB (SQL API) | Microsoft.DocumentDB/databaseAccounts | `Sql` | `privatelink.documents.azure.com` |

:::warning Common exam traps

- SQL Database uses group-id `sqlServer` (not `sql` or `database`)
- SQL Database DNS zone is `privatelink.database.windows.net` (not `privatelink.sql.database.windows.net`)
- Key Vault DNS zone is `privatelink.vaultcore.azure.net` (not `privatelink.keyvault.azure.net`)
- Cosmos DB SQL API group-id is `Sql` (capital S) (not `sql` or `cosmosdb`)
- Web App group-id is `sites` (not `webapp` or `app`)
- Storage requires separate PEs for each sub-resource (blob, file, table, queue)

:::

---

## Task 1: Create the infrastructure

### Azure CLI

```bash
# Create resource group
az group create \
    --name rg-multiservice-pe \
    --location eastus2

# Create VNet
az network vnet create \
    --resource-group rg-multiservice-pe \
    --name vnet-enterprise \
    --location eastus2 \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name snet-app \
    --subnet-prefixes 10.0.1.0/24

# Create PE subnet
az network vnet subnet create \
    --resource-group rg-multiservice-pe \
    --vnet-name vnet-enterprise \
    --name snet-pe \
    --address-prefixes 10.0.2.0/24
```

### Azure PowerShell

```powershell
New-AzResourceGroup -Name "rg-multiservice-pe" -Location "eastus2"

$snetApp = New-AzVirtualNetworkSubnetConfig `
    -Name "snet-app" -AddressPrefix "10.0.1.0/24"
$snetPe = New-AzVirtualNetworkSubnetConfig `
    -Name "snet-pe" -AddressPrefix "10.0.2.0/24"

New-AzVirtualNetwork `
    -ResourceGroupName "rg-multiservice-pe" `
    -Name "vnet-enterprise" `
    -Location "eastus2" `
    -AddressPrefix "10.0.0.0/16" `
    -Subnet $snetApp, $snetPe
```

---

## Task 2: Create the target services

### Azure CLI

```bash
# Storage Account
az storage account create \
    --resource-group rg-multiservice-pe \
    --name stcontosope01 \
    --location eastus2 \
    --sku Standard_LRS \
    --kind StorageV2

# Azure SQL Server and Database
az sql server create \
    --resource-group rg-multiservice-pe \
    --name sql-contoso-pe01 \
    --location eastus2 \
    --admin-user sqladmin \
    --admin-password "P@ssw0rd1234!"

az sql db create \
    --resource-group rg-multiservice-pe \
    --server sql-contoso-pe01 \
    --name db-app01 \
    --service-objective S0

# Key Vault
az keyvault create \
    --resource-group rg-multiservice-pe \
    --name kv-contoso-pe01 \
    --location eastus2 \
    --sku standard

# Web App (requires App Service Plan with PremiumV2 or higher)
az appservice plan create \
    --resource-group rg-multiservice-pe \
    --name asp-contoso-pe01 \
    --location eastus2 \
    --sku P1V2

az webapp create \
    --resource-group rg-multiservice-pe \
    --plan asp-contoso-pe01 \
    --name webapp-contoso-pe01 \
    --runtime "DOTNET|8.0"

# Cosmos DB (SQL API)
az cosmosdb create \
    --resource-group rg-multiservice-pe \
    --name cosmos-contoso-pe01 \
    --locations regionName=eastus2 failoverPriority=0 \
    --kind GlobalDocumentDB
```

### Azure PowerShell

```powershell
# Storage Account
New-AzStorageAccount `
    -ResourceGroupName "rg-multiservice-pe" `
    -Name "stcontosope01" `
    -Location "eastus2" `
    -SkuName "Standard_LRS" `
    -Kind "StorageV2"

# SQL Server
New-AzSqlServer `
    -ResourceGroupName "rg-multiservice-pe" `
    -ServerName "sql-contoso-pe01" `
    -Location "eastus2" `
    -SqlAdministratorCredentials (New-Object PSCredential("sqladmin", `
        (ConvertTo-SecureString "P@ssw0rd1234!" -AsPlainText -Force)))

# SQL Database
New-AzSqlDatabase `
    -ResourceGroupName "rg-multiservice-pe" `
    -ServerName "sql-contoso-pe01" `
    -DatabaseName "db-app01" `
    -RequestedServiceObjectiveName "S0"

# Key Vault
New-AzKeyVault `
    -ResourceGroupName "rg-multiservice-pe" `
    -VaultName "kv-contoso-pe01" `
    -Location "eastus2" `
    -Sku "Standard"

# Cosmos DB
New-AzCosmosDBAccount `
    -ResourceGroupName "rg-multiservice-pe" `
    -Name "cosmos-contoso-pe01" `
    -Location "eastus2" `
    -Kind "GlobalDocumentDB"
```

---

## Task 3: Create private endpoints for each service

### Azure CLI

```bash
# --- Storage Blob PE ---
STORAGE_ID=$(az storage account show \
    --resource-group rg-multiservice-pe \
    --name stcontosope01 --query id -o tsv)

az network private-endpoint create \
    --resource-group rg-multiservice-pe \
    --name pe-storage-blob \
    --vnet-name vnet-enterprise \
    --subnet snet-pe \
    --private-connection-resource-id $STORAGE_ID \
    --group-id blob \
    --connection-name pec-storage-blob

# --- Storage File PE ---
az network private-endpoint create \
    --resource-group rg-multiservice-pe \
    --name pe-storage-file \
    --vnet-name vnet-enterprise \
    --subnet snet-pe \
    --private-connection-resource-id $STORAGE_ID \
    --group-id file \
    --connection-name pec-storage-file

# --- SQL Database PE ---
SQL_ID=$(az sql server show \
    --resource-group rg-multiservice-pe \
    --name sql-contoso-pe01 --query id -o tsv)

az network private-endpoint create \
    --resource-group rg-multiservice-pe \
    --name pe-sql \
    --vnet-name vnet-enterprise \
    --subnet snet-pe \
    --private-connection-resource-id $SQL_ID \
    --group-id sqlServer \
    --connection-name pec-sql

# --- Key Vault PE ---
KV_ID=$(az keyvault show \
    --resource-group rg-multiservice-pe \
    --name kv-contoso-pe01 --query id -o tsv)

az network private-endpoint create \
    --resource-group rg-multiservice-pe \
    --name pe-keyvault \
    --vnet-name vnet-enterprise \
    --subnet snet-pe \
    --private-connection-resource-id $KV_ID \
    --group-id vault \
    --connection-name pec-keyvault

# --- Web App PE ---
WEBAPP_ID=$(az webapp show \
    --resource-group rg-multiservice-pe \
    --name webapp-contoso-pe01 --query id -o tsv)

az network private-endpoint create \
    --resource-group rg-multiservice-pe \
    --name pe-webapp \
    --vnet-name vnet-enterprise \
    --subnet snet-pe \
    --private-connection-resource-id $WEBAPP_ID \
    --group-id sites \
    --connection-name pec-webapp

# --- Cosmos DB PE (SQL API) ---
COSMOS_ID=$(az cosmosdb show \
    --resource-group rg-multiservice-pe \
    --name cosmos-contoso-pe01 --query id -o tsv)

az network private-endpoint create \
    --resource-group rg-multiservice-pe \
    --name pe-cosmosdb \
    --vnet-name vnet-enterprise \
    --subnet snet-pe \
    --private-connection-resource-id $COSMOS_ID \
    --group-id Sql \
    --connection-name pec-cosmosdb
```

### Azure PowerShell (example for SQL and Key Vault)

```powershell
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-multiservice-pe" -Name "vnet-enterprise"
$subnet = $vnet.Subnets | Where-Object { $_.Name -eq "snet-pe" }

# SQL Database PE
$sqlServer = Get-AzSqlServer -ResourceGroupName "rg-multiservice-pe" -ServerName "sql-contoso-pe01"
$sqlConnection = New-AzPrivateLinkServiceConnection `
    -Name "pec-sql" `
    -PrivateLinkServiceId $sqlServer.ResourceId `
    -GroupId "sqlServer"

New-AzPrivateEndpoint `
    -ResourceGroupName "rg-multiservice-pe" `
    -Name "pe-sql" `
    -Location "eastus2" `
    -Subnet $subnet `
    -PrivateLinkServiceConnection $sqlConnection

# Key Vault PE
$kv = Get-AzKeyVault -ResourceGroupName "rg-multiservice-pe" -VaultName "kv-contoso-pe01"
$kvConnection = New-AzPrivateLinkServiceConnection `
    -Name "pec-keyvault" `
    -PrivateLinkServiceId $kv.ResourceId `
    -GroupId "vault"

New-AzPrivateEndpoint `
    -ResourceGroupName "rg-multiservice-pe" `
    -Name "pe-keyvault" `
    -Location "eastus2" `
    -Subnet $subnet `
    -PrivateLinkServiceConnection $kvConnection
```

---

## Task 4: Create all required private DNS zones and link them

### Azure CLI

```bash
# Create all privatelink DNS zones
ZONES=(
    "privatelink.blob.core.windows.net"
    "privatelink.file.core.windows.net"
    "privatelink.database.windows.net"
    "privatelink.vaultcore.azure.net"
    "privatelink.azurewebsites.net"
    "privatelink.documents.azure.com"
)

for ZONE in "${ZONES[@]}"; do
    az network private-dns zone create \
        --resource-group rg-multiservice-pe \
        --name "$ZONE"

    az network private-dns link vnet create \
        --resource-group rg-multiservice-pe \
        --zone-name "$ZONE" \
        --name "link-vnet-enterprise" \
        --virtual-network vnet-enterprise \
        --registration-enabled false
done

# Create DNS zone groups for each PE
az network private-endpoint dns-zone-group create \
    --resource-group rg-multiservice-pe \
    --endpoint-name pe-storage-blob \
    --name zg-blob \
    --private-dns-zone "privatelink.blob.core.windows.net" \
    --zone-name blob

az network private-endpoint dns-zone-group create \
    --resource-group rg-multiservice-pe \
    --endpoint-name pe-storage-file \
    --name zg-file \
    --private-dns-zone "privatelink.file.core.windows.net" \
    --zone-name file

az network private-endpoint dns-zone-group create \
    --resource-group rg-multiservice-pe \
    --endpoint-name pe-sql \
    --name zg-sql \
    --private-dns-zone "privatelink.database.windows.net" \
    --zone-name sqlServer

az network private-endpoint dns-zone-group create \
    --resource-group rg-multiservice-pe \
    --endpoint-name pe-keyvault \
    --name zg-vault \
    --private-dns-zone "privatelink.vaultcore.azure.net" \
    --zone-name vault

az network private-endpoint dns-zone-group create \
    --resource-group rg-multiservice-pe \
    --endpoint-name pe-webapp \
    --name zg-webapp \
    --private-dns-zone "privatelink.azurewebsites.net" \
    --zone-name sites

az network private-endpoint dns-zone-group create \
    --resource-group rg-multiservice-pe \
    --endpoint-name pe-cosmosdb \
    --name zg-cosmos \
    --private-dns-zone "privatelink.documents.azure.com" \
    --zone-name cosmos
```

---

## Task 5: Verify DNS resolution for each service

```bash
# From a VM inside vnet-enterprise, verify each service resolves to a private IP

# Storage Blob
nslookup stcontosope01.blob.core.windows.net
# Expected: stcontosope01.privatelink.blob.core.windows.net → 10.0.2.x

# Storage File
nslookup stcontosope01.file.core.windows.net
# Expected: stcontosope01.privatelink.file.core.windows.net → 10.0.2.x

# SQL Database
nslookup sql-contoso-pe01.database.windows.net
# Expected: sql-contoso-pe01.privatelink.database.windows.net → 10.0.2.x

# Key Vault
nslookup kv-contoso-pe01.vault.azure.net
# Expected: kv-contoso-pe01.privatelink.vaultcore.azure.net → 10.0.2.x

# Web App
nslookup webapp-contoso-pe01.azurewebsites.net
# Expected: webapp-contoso-pe01.privatelink.azurewebsites.net → 10.0.2.x

# Cosmos DB
nslookup cosmos-contoso-pe01.documents.azure.com
# Expected: cosmos-contoso-pe01.privatelink.documents.azure.com → 10.0.2.x
```

---

## Task 6: Disable public access after PE verification

Only disable public access after confirming private endpoints are working correctly.

### Azure CLI

```bash
# Disable public access on Storage
az storage account update \
    --resource-group rg-multiservice-pe \
    --name stcontosope01 \
    --public-network-access Disabled

# Disable public access on SQL Server
az sql server update \
    --resource-group rg-multiservice-pe \
    --name sql-contoso-pe01 \
    --public-network-access Disabled

# Disable public access on Key Vault
az keyvault update \
    --resource-group rg-multiservice-pe \
    --name kv-contoso-pe01 \
    --public-network-access Disabled

# Disable public access on Cosmos DB
az cosmosdb update \
    --resource-group rg-multiservice-pe \
    --name cosmos-contoso-pe01 \
    --public-network-access Disabled

# Web App - restrict access to VNet only
az webapp update \
    --resource-group rg-multiservice-pe \
    --name webapp-contoso-pe01 \
    --set publicNetworkAccess=Disabled
```

:::warning Order of operations

Always verify that private endpoint DNS resolution is working before disabling public access. If you disable public access first and the PE/DNS is misconfigured, you will lose all connectivity to the service (including management plane in some cases). This is one of the most common production incidents with private endpoints.

:::

---

## Break & fix

### Scenario 1: Wrong group-id used

**Symptom:** Private endpoint for Cosmos DB shows as connected, but the application cannot reach the SQL API endpoint.

**Diagnosis:**

```bash
az network private-endpoint show \
    --resource-group rg-multiservice-pe \
    --name pe-cosmosdb \
    --query "privateLinkServiceConnections[0].groupIds[0]" \
    --output tsv
```

**Root cause:** The group-id was set to `sql` (lowercase) instead of `Sql` (capital S), or a different group-id like `MongoDB` was used for a SQL API account.

**Fix:** Delete and recreate the PE with the correct group-id:

```bash
az network private-endpoint delete \
    --resource-group rg-multiservice-pe \
    --name pe-cosmosdb

az network private-endpoint create \
    --resource-group rg-multiservice-pe \
    --name pe-cosmosdb \
    --vnet-name vnet-enterprise \
    --subnet snet-pe \
    --private-connection-resource-id $COSMOS_ID \
    --group-id Sql \
    --connection-name pec-cosmosdb
```

---

### Scenario 2: Incorrect DNS zone name for SQL

**Symptom:** `nslookup sql-contoso-pe01.database.windows.net` returns the public IP even though the PE exists and DNS zone is created.

**Diagnosis:**

```bash
# List DNS zones and check for typo
az network private-dns zone list \
    --resource-group rg-multiservice-pe \
    --query "[].name" \
    --output tsv
```

**Root cause:** The DNS zone was created as `privatelink.sql.database.windows.net` (incorrect) instead of `privatelink.database.windows.net` (correct).

**Fix:**

```bash
# Delete the incorrect zone
az network private-dns zone delete \
    --resource-group rg-multiservice-pe \
    --name "privatelink.sql.database.windows.net" \
    --yes

# Create the correct zone
az network private-dns zone create \
    --resource-group rg-multiservice-pe \
    --name "privatelink.database.windows.net"

az network private-dns link vnet create \
    --resource-group rg-multiservice-pe \
    --zone-name "privatelink.database.windows.net" \
    --name link-vnet-enterprise \
    --virtual-network vnet-enterprise \
    --registration-enabled false

# Recreate the DNS zone group
az network private-endpoint dns-zone-group create \
    --resource-group rg-multiservice-pe \
    --endpoint-name pe-sql \
    --name zg-sql \
    --private-dns-zone "privatelink.database.windows.net" \
    --zone-name sqlServer
```

---

### Scenario 3: Disabling public access before PE is ready

**Symptom:** After disabling public access on the storage account, all applications (including those on the VNet) lose connectivity.

**Diagnosis:**

```bash
# Verify PE connection status
az network private-endpoint show \
    --resource-group rg-multiservice-pe \
    --name pe-storage-blob \
    --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status" \
    --output tsv

# Check if DNS zone group was created
az network private-endpoint dns-zone-group list \
    --resource-group rg-multiservice-pe \
    --endpoint-name pe-storage-blob \
    --output table
```

**Root cause:** Public access was disabled before the DNS zone group was configured, so DNS still resolves to a public IP (which is now blocked).

**Fix:** Re-enable public access temporarily, fix the DNS, then disable again:

```bash
# Re-enable public access
az storage account update \
    --resource-group rg-multiservice-pe \
    --name stcontosope01 \
    --public-network-access Enabled

# Create missing DNS zone group
az network private-endpoint dns-zone-group create \
    --resource-group rg-multiservice-pe \
    --endpoint-name pe-storage-blob \
    --name zg-blob \
    --private-dns-zone "privatelink.blob.core.windows.net" \
    --zone-name blob

# Verify resolution from VNet VM, then disable public access
az storage account update \
    --resource-group rg-multiservice-pe \
    --name stcontosope01 \
    --public-network-access Disabled
```

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-35-q1",
    question: "What is the correct group-id value when creating a private endpoint for Azure SQL Database?",
    options: [
      "sql",
      "database",
      "sqlServer \u2705",
      "Microsoft.Sql"
    ],
    correctIndex: 2,
    explanation: "Azure SQL Database uses the group-id 'sqlServer'. This is the sub-resource identifier for the SQL logical server. Common mistakes include using 'sql', 'database', or 'SqlServer' (case matters in some contexts)."
  },
  {
    id: "az700-35-q2",
    question: "Which private DNS zone name is correct for Azure Key Vault private endpoints?",
    options: [
      "privatelink.keyvault.azure.net",
      "privatelink.vault.azure.net",
      "privatelink.vaultcore.azure.net \u2705",
      "privatelink.keyvault.core.windows.net"
    ],
    correctIndex: 2,
    explanation: "The correct DNS zone for Key Vault is privatelink.vaultcore.azure.net. This is a common exam trap because the public FQDN uses vault.azure.net, but the privatelink zone uses vaultcore.azure.net."
  },
  {
    id: "az700-35-q3",
    question: "A storage account needs private access for both blob and file shares. How many private endpoints are required?",
    options: [
      "One PE with both group-ids specified",
      "Two separate PEs, one with group-id 'blob' and one with group-id 'file' \u2705",
      "One PE with group-id 'storage' covers all sub-resources",
      "Two PEs are optional; one PE with group-id 'blob' automatically includes file"
    ],
    correctIndex: 1,
    explanation: "Each storage sub-resource (blob, file, table, queue, web, dfs) requires its own private endpoint. A single PE can only connect to one sub-resource. You cannot combine multiple group-ids in a single private endpoint."
  },
  {
    id: "az700-35-q4",
    question: "What is the correct private DNS zone for Azure Cosmos DB with SQL API?",
    options: [
      "privatelink.cosmosdb.azure.com",
      "privatelink.documents.azure.com \u2705",
      "privatelink.cosmos.azure.com",
      "privatelink.sql.cosmos.azure.com"
    ],
    correctIndex: 1,
    explanation: "Cosmos DB SQL API uses the DNS zone privatelink.documents.azure.com. Different Cosmos DB APIs use different zones: MongoDB uses privatelink.mongo.cosmos.azure.com, Cassandra uses privatelink.cassandra.cosmos.azure.com, etc."
  },
  {
    id: "az700-35-q5",
    question: "You disabled public network access on a SQL server but applications in the VNet cannot connect. DNS resolution shows the public IP. What should you check first?",
    options: [
      "Whether the SQL firewall allows the VNet subnet",
      "Whether the private DNS zone is linked to the VNet \u2705",
      "Whether the SQL server supports private endpoints",
      "Whether the VNet has a service endpoint for SQL"
    ],
    correctIndex: 1,
    explanation: "If DNS still resolves to the public IP after creating a PE, the most likely cause is that the privatelink DNS zone is not linked to the client's VNet. Without the link, the CNAME chain resolves through public DNS to the (now blocked) public IP."
  },
  {
    id: "az700-35-q6",
    question: "What is the group-id for creating a private endpoint to an Azure Web App?",
    options: [
      "webapp",
      "app",
      "sites \u2705",
      "Microsoft.Web"
    ],
    correctIndex: 2,
    explanation: "Azure Web Apps (App Service) uses the group-id 'sites'. This corresponds to the Microsoft.Web/sites resource type. The Web App must be on a PremiumV2 or higher App Service plan to support private endpoints."
  }
]} />

---

## Cleanup

Remove all resources created in this challenge to stop billing:

```bash
az group delete --name rg-multiservice-pe --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-multiservice-pe" -Force -AsJob
```

:::danger Cost warning

This challenge creates multiple billable resources: private endpoints (~$0.01/h each), an App Service Plan (P1V2 ~$0.035/h), a SQL Database (S0 ~$0.02/h), a Cosmos DB account (~$0.008/h minimum), and a Key Vault. Total estimated cost is approximately $0.05/h. Delete the resource group promptly after completing the lab.

:::

---

## Additional references

- [Azure Private Endpoint DNS zone values](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- [Private endpoint sub-resource (group-id) reference](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview#private-link-resource)
- [Use private endpoints for Azure Storage](https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints)
- [Azure SQL private endpoint](https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview)
- [Key Vault private link](https://learn.microsoft.com/en-us/azure/key-vault/general/private-link-service)
- [Cosmos DB private endpoint](https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-configure-private-endpoints)
