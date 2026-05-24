---
sidebar_position: 2
title: "Desafio 35: Private Endpoints para Múltiplos Serviços"
sidebar_label: "Challenge 35"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 35: Pontos de extremidade privados para mÃºltiplos serviÃ§os

:::info Tempo e custo estimados

**60-75 minutos** | **~$0.05/h** | **Peso no exame: 10-15%**

:::

## CenÃ¡rio

A Contoso Enterprise estÃ¡ padronizando o acesso privado para todos os serviÃ§os PaaS consumidos por suas aplicaÃ§Ãµes de linha de negÃ³cios. A equipe de seguranÃ§a exige que todos os serviÃ§os Azure utilizados por cargas de trabalho de produÃ§Ã£o sejam acessÃ­veis exclusivamente por pontos de extremidade privados, com o acesso pÃºblico desabilitado. VocÃª deve configurar pontos de extremidade privados para seis serviÃ§os diferentes, cada um com seu sub-recurso (group-id) e nome de zona DNS privatelink corretos.

**Arquitetura:**

```text
                         Azure VNet: vnet-enterprise (10.0.0.0/16)
                         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                         â”‚  snet-app (10.0.1.0/24)                     â”‚
                         â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                         â”‚
                         â”‚  â”‚  App VMs/AKS   â”‚                         â”‚
                         â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                         â”‚
                         â”‚                                             â”‚
                         â”‚  snet-pe (10.0.2.0/24)                      â”‚
                         â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”‚
                         â”‚  â”‚ PE-Blob  â”‚ PE-File  â”‚ PE-SQL   â”‚         â”‚
                         â”‚  â”‚ .2.4     â”‚ .2.5     â”‚ .2.6     â”‚         â”‚
                         â”‚  â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤         â”‚
                         â”‚  â”‚ PE-KV    â”‚ PE-Web   â”‚ PE-Cosmosâ”‚         â”‚
                         â”‚  â”‚ .2.7     â”‚ .2.8     â”‚ .2.9     â”‚         â”‚
                         â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â”‚
                         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

    Private DNS Zones:
    â”œâ”€â”€ privatelink.blob.core.windows.net
    â”œâ”€â”€ privatelink.file.core.windows.net
    â”œâ”€â”€ privatelink.database.windows.net
    â”œâ”€â”€ privatelink.vaultcore.azure.net
    â”œâ”€â”€ privatelink.azurewebsites.net
    â””â”€â”€ privatelink.documents.azure.com
```

## Objetivos de aprendizagem

ApÃ³s concluir este desafio, vocÃª serÃ¡ capaz de:

- Mapear serviÃ§os Azure para seus group-ids de sub-recurso corretos
- Identificar o nome correto da zona DNS privatelink para cada tipo de serviÃ§o
- Criar pontos de extremidade privados para Storage (blob/file), SQL Database, Key Vault, Web App e Cosmos DB
- Verificar a resoluÃ§Ã£o DNS para cada ponto de extremidade privado
- Desabilitar o acesso pÃºblico nos serviÃ§os apÃ³s confirmar que os pontos de extremidade privados estÃ£o funcionando

## PrÃ©-requisitos

- Uma assinatura Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- PowerShell com mÃ³dulo Az instalado (`Install-Module Az -Force`)
- ConclusÃ£o do Challenge 34 (familiaridade com conceitos de PE e DNS)

## Conceitos-chave para o AZ-700

### Mapeamento de serviÃ§o para group-id e zona DNS

Esta Ã© a tabela de referÃªncia crÃ­tica para o exame. Cada serviÃ§o possui um group-id especÃ­fico e requer uma zona DNS privatelink especÃ­fica:

| ServiÃ§o | Tipo de recurso | group-id | Nome da zona DNS privada |
|---------|----------------|----------|--------------------------|
| Storage (Blob) | Microsoft.Storage/storageAccounts | `blob` | `privatelink.blob.core.windows.net` |
| Storage (File) | Microsoft.Storage/storageAccounts | `file` | `privatelink.file.core.windows.net` |
| Storage (Table) | Microsoft.Storage/storageAccounts | `table` | `privatelink.table.core.windows.net` |
| Storage (Queue) | Microsoft.Storage/storageAccounts | `queue` | `privatelink.queue.core.windows.net` |
| Azure SQL Database | Microsoft.Sql/servers | `sqlServer` | `privatelink.database.windows.net` |
| Key Vault | Microsoft.KeyVault/vaults | `vault` | `privatelink.vaultcore.azure.net` |
| Web App | Microsoft.Web/sites | `sites` | `privatelink.azurewebsites.net` |
| Cosmos DB (SQL API) | Microsoft.DocumentDB/databaseAccounts | `Sql` | `privatelink.documents.azure.com` |

:::warning Armadilhas comuns no exame

- SQL Database usa o group-id `sqlServer` (nÃ£o `sql` ou `database`)
- A zona DNS do SQL Database Ã© `privatelink.database.windows.net` (nÃ£o `privatelink.sql.database.windows.net`)
- A zona DNS do Key Vault Ã© `privatelink.vaultcore.azure.net` (nÃ£o `privatelink.keyvault.azure.net`)
- O group-id da SQL API do Cosmos DB Ã© `Sql` (S maiÃºsculo) (nÃ£o `sql` ou `cosmosdb`)
- O group-id do Web App Ã© `sites` (nÃ£o `webapp` ou `app`)
- Storage requer PEs separados para cada sub-recurso (blob, file, table, queue)

:::

---

## Tarefa 1: Criar a infraestrutura

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

## Tarefa 2: Criar os serviÃ§os de destino

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

## Tarefa 3: Criar pontos de extremidade privados para cada serviÃ§o

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

### Azure PowerShell (exemplo para SQL e Key Vault)

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

## Tarefa 4: Criar todas as zonas DNS privadas necessÃ¡rias e vinculÃ¡-las

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

## Tarefa 5: Verificar a resoluÃ§Ã£o DNS para cada serviÃ§o

```bash
# From a VM inside vnet-enterprise, verify each service resolves to a private IP

# Storage Blob
nslookup stcontosope01.blob.core.windows.net
# Expected: stcontosope01.privatelink.blob.core.windows.net â†’ 10.0.2.x

# Storage File
nslookup stcontosope01.file.core.windows.net
# Expected: stcontosope01.privatelink.file.core.windows.net â†’ 10.0.2.x

# SQL Database
nslookup sql-contoso-pe01.database.windows.net
# Expected: sql-contoso-pe01.privatelink.database.windows.net â†’ 10.0.2.x

# Key Vault
nslookup kv-contoso-pe01.vault.azure.net
# Expected: kv-contoso-pe01.privatelink.vaultcore.azure.net â†’ 10.0.2.x

# Web App
nslookup webapp-contoso-pe01.azurewebsites.net
# Expected: webapp-contoso-pe01.privatelink.azurewebsites.net â†’ 10.0.2.x

# Cosmos DB
nslookup cosmos-contoso-pe01.documents.azure.com
# Expected: cosmos-contoso-pe01.privatelink.documents.azure.com â†’ 10.0.2.x
```

---

## Tarefa 6: Desabilitar o acesso pÃºblico apÃ³s verificaÃ§Ã£o do PE

Somente desabilite o acesso pÃºblico apÃ³s confirmar que os pontos de extremidade privados estÃ£o funcionando corretamente.

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

:::warning Ordem das operaÃ§Ãµes

Sempre verifique se a resoluÃ§Ã£o DNS do ponto de extremidade privado estÃ¡ funcionando antes de desabilitar o acesso pÃºblico. Se vocÃª desabilitar o acesso pÃºblico primeiro e o PE/DNS estiver mal configurado, vocÃª perderÃ¡ toda a conectividade com o serviÃ§o (incluindo o plano de gerenciamento em alguns casos). Este Ã© um dos incidentes de produÃ§Ã£o mais comuns com pontos de extremidade privados.

:::

---

## CenÃ¡rios de quebra e correÃ§Ã£o

### CenÃ¡rio 1: group-id incorreto utilizado

**Sintoma:** O ponto de extremidade privado do Cosmos DB aparece como conectado, mas a aplicaÃ§Ã£o nÃ£o consegue alcanÃ§ar o endpoint da SQL API.

**DiagnÃ³stico:**

```bash
az network private-endpoint show \
    --resource-group rg-multiservice-pe \
    --name pe-cosmosdb \
    --query "privateLinkServiceConnections[0].groupIds[0]" \
    --output tsv
```

**Causa raiz:** O group-id foi definido como `sql` (minÃºsculo) em vez de `Sql` (S maiÃºsculo), ou um group-id diferente como `MongoDB` foi usado para uma conta com SQL API.

**CorreÃ§Ã£o:** Exclua e recrie o PE com o group-id correto:

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

### CenÃ¡rio 2: Nome de zona DNS incorreto para SQL

**Sintoma:** `nslookup sql-contoso-pe01.database.windows.net` retorna o IP pÃºblico mesmo com o PE existente e a zona DNS criada.

**DiagnÃ³stico:**

```bash
# List DNS zones and check for typo
az network private-dns zone list \
    --resource-group rg-multiservice-pe \
    --query "[].name" \
    --output tsv
```

**Causa raiz:** A zona DNS foi criada como `privatelink.sql.database.windows.net` (incorreto) em vez de `privatelink.database.windows.net` (correto).

**CorreÃ§Ã£o:**

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

### CenÃ¡rio 3: Desabilitar acesso pÃºblico antes do PE estar pronto

**Sintoma:** ApÃ³s desabilitar o acesso pÃºblico na conta de armazenamento, todas as aplicaÃ§Ãµes (incluindo as na VNet) perdem a conectividade.

**DiagnÃ³stico:**

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

**Causa raiz:** O acesso pÃºblico foi desabilitado antes que o grupo de zona DNS fosse configurado, entÃ£o o DNS ainda resolve para um IP pÃºblico (que agora estÃ¡ bloqueado).

**CorreÃ§Ã£o:** Reabilite o acesso pÃºblico temporariamente, corrija o DNS e depois desabilite novamente:

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

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-35-q1",
    question: "Qual é o valor correto de group-id ao criar um private endpoint para o Azure SQL Database?",
    options: [
      "sql",
      "database",
      "sqlServer ✅",
      "Microsoft.Sql"
    ],
    correctIndex: 2,
    explanation: "O Azure SQL Database usa o group-id 'sqlServer'. Este é o identificador de sub-recurso para o servidor lógico SQL. Erros comuns incluem usar 'sql', 'database' ou 'SqlServer' (maiúsculas/minúsculas importam em alguns contextos)."
  },
  {
    id: "az700-35-q2",
    question: "Qual nome de zona de Private DNS está correto para private endpoints do Azure Key Vault?",
    options: [
      "privatelink.keyvault.azure.net",
      "privatelink.vault.azure.net",
      "privatelink.vaultcore.azure.net ✅",
      "privatelink.keyvault.core.windows.net"
    ],
    correctIndex: 2,
    explanation: "A zona DNS correta para o Key Vault é privatelink.vaultcore.azure.net. Esta é uma pegadinha comum no exame porque o FQDN público usa vault.azure.net, mas a zona privatelink usa vaultcore.azure.net."
  },
  {
    id: "az700-35-q3",
    question: "Uma conta de armazenamento precisa de acesso privado tanto para blob quanto para file shares. Quantos private endpoints são necessários?",
    options: [
      "Um PE com ambos os group-ids especificados",
      "Dois PEs separados, um com group-id 'blob' e outro com group-id 'file' ✅",
      "Um PE com group-id 'storage' cobre todos os sub-recursos",
      "Dois PEs são opcionais; um PE com group-id 'blob' inclui automaticamente file"
    ],
    correctIndex: 1,
    explanation: "Cada sub-recurso de armazenamento (blob, file, table, queue, web, dfs) requer seu próprio private endpoint. Um único PE só pode se conectar a um sub-recurso. Você não pode combinar múltiplos group-ids em um único private endpoint."
  },
  {
    id: "az700-35-q4",
    question: "Qual é a zona de Private DNS correta para o Azure Cosmos DB com API SQL?",
    options: [
      "privatelink.cosmosdb.azure.com",
      "privatelink.documents.azure.com ✅",
      "privatelink.cosmos.azure.com",
      "privatelink.sql.cosmos.azure.com"
    ],
    correctIndex: 1,
    explanation: "O Cosmos DB com API SQL usa a zona DNS privatelink.documents.azure.com. Diferentes APIs do Cosmos DB usam zonas diferentes: MongoDB usa privatelink.mongo.cosmos.azure.com, Cassandra usa privatelink.cassandra.cosmos.azure.com, etc."
  },
  {
    id: "az700-35-q5",
    question: "Você desabilitou o acesso à rede pública em um servidor SQL, mas as aplicações na VNet não conseguem se conectar. A resolução DNS mostra o IP público. O que você deve verificar primeiro?",
    options: [
      "Se o firewall do SQL permite a sub-rede da VNet",
      "Se a zona de Private DNS está vinculada à VNet ✅",
      "Se o servidor SQL suporta private endpoints",
      "Se a VNet possui um service endpoint para SQL"
    ],
    correctIndex: 1,
    explanation: "Se o DNS ainda resolve para o IP público após criar um PE, a causa mais provável é que a zona de DNS privatelink não está vinculada à VNet do cliente. Sem o vínculo, a cadeia CNAME resolve através do DNS público para o IP público (agora bloqueado)."
  },
  {
    id: "az700-35-q6",
    question: "Qual é o group-id para criar um private endpoint para um Azure Web App?",
    options: [
      "webapp",
      "app",
      "sites ✅",
      "Microsoft.Web"
    ],
    correctIndex: 2,
    explanation: "O Azure Web Apps (App Service) usa o group-id 'sites'. Isso corresponde ao tipo de recurso Microsoft.Web/sites. O Web App deve estar em um plano App Service PremiumV2 ou superior para suportar private endpoints."
  }
]} />

---

## Limpeza

Remova todos os recursos criados neste desafio para interromper a cobranÃ§a:

```bash
az group delete --name rg-multiservice-pe --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-multiservice-pe" -Force -AsJob
```

:::danger Aviso de custo

Este desafio cria mÃºltiplos recursos cobrÃ¡veis: pontos de extremidade privados (~$0.01/h cada), um App Service Plan (P1V2 ~$0.035/h), um SQL Database (S0 ~$0.02/h), uma conta Cosmos DB (~$0.008/h mÃ­nimo) e um Key Vault. O custo total estimado Ã© de aproximadamente $0.05/h. Exclua o grupo de recursos imediatamente apÃ³s concluir o laboratÃ³rio.

:::

---

## ReferÃªncias adicionais

- [Valores de zona DNS do Azure Private Endpoint](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- [ReferÃªncia de sub-recurso (group-id) do Private Endpoint](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview#private-link-resource)
- [Usar pontos de extremidade privados para Azure Storage](https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints)
- [Private endpoint do Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview)
- [Private link do Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/private-link-service)
- [Private endpoint do Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-configure-private-endpoints)
