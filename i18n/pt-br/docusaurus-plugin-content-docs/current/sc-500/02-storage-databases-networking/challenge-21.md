---
sidebar_position: 21
title: "Desafio 21: Private Endpoints para Recursos PaaS"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 21: Private Endpoints para Recursos PaaS

## Habilidades do exame cobertas

- Planejar e implementar private endpoints para serviços Azure PaaS
- Configurar resolução DNS para private endpoints
- Integrar private endpoints com zonas Azure Private DNS
- Implementar políticas de rede de private endpoints
- Proteger serviços PaaS desabilitando acesso público após implantação de private endpoints

## Cenário

A equipe de compliance da Contoso Ltd determinou que todos os serviços PaaS (Azure SQL, Storage, Key Vault e Azure Container Registry) devem ser acessados exclusivamente por redes privadas. Atualmente, esses serviços possuem endpoints públicos acessíveis pela internet, o que viola os requisitos de soberania de dados e zero-trust da empresa. Você deve implantar private endpoints para cada serviço, configurar a resolução DNS e desabilitar o acesso público para garantir que todo o tráfego trafegue pela rede backbone da Microsoft através de endereços IP privados.

---

## Pré-requisitos

- Assinatura Azure com funções Network Contributor e Contributor específicas do serviço
- Azure CLI instalado e autenticado (`az login`)
- Uma rede virtual (ou disposição para criar uma)
- Entendimento de resolução DNS e zonas Azure Private DNS

---

## Tarefa 1: Criar a infraestrutura de rede para private endpoints

Implante uma rede virtual com sub-redes dedicadas para private endpoints e cargas de trabalho de clientes.

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

## Tarefa 2: Criar private endpoint para Azure Storage

Implante um private endpoint para Azure Blob Storage e configure o DNS.

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

## Tarefa 3: Criar private endpoint para Azure SQL Database

Implante um private endpoint para Azure SQL e configure a resolução DNS.

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

## Tarefa 4: Criar private endpoint para Azure Key Vault

Implante um private endpoint para Key Vault para proteger o acesso a secrets.

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

## Tarefa 5: Criar private endpoint para Azure Container Registry

Implante um private endpoint para ACR para proteger o pull de imagens de contêiner.

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

## Tarefa 6: Verificar resolução DNS e conectividade

Valide que o DNS resolve para IPs privados e que o acesso público está bloqueado.

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

## Quebra & conserta

### Cenário 1: DNS do private endpoint não resolve para IP privado

Uma VM na VNet está tentando acessar a conta de armazenamento, mas `nslookup stprivateXXXX.blob.core.windows.net` retorna o IP público em vez do IP privado (10.0.1.x).

<details>
<summary>Mostrar solução</summary>

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

### Cenário 2: Conexão do private endpoint presa no estado "Pending"

Após criar um private endpoint para um recurso em outra assinatura, a conexão mostra status "Pending" e o tráfego não flui.

<details>
<summary>Mostrar solução</summary>

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

### Cenário 3: NSG bloqueando tráfego para o private endpoint

Após habilitar políticas de rede na sub-rede do private endpoint e adicionar um NSG, todo o tráfego para private endpoints é bloqueado.

<details>
<summary>Mostrar solução</summary>

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

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual zona DNS deve ser criada para que private endpoints do Azure SQL Database resolvam corretamente?",
    options: [
      "privatelink.sql.azure.com",
      "privatelink.database.windows.net",
      "privatelink.sqlserver.azure.net",
      "privatelink.azure-sql.net"
    ],
    correctIndex: 1,
    explanation: "Private endpoints do Azure SQL Database requerem a zona Private DNS 'privatelink.database.windows.net'. O registro DNS do private endpoint é criado como uma cadeia CNAME: server.database.windows.net → server.privatelink.database.windows.net → IP privado."
  },
  {
    question: "O que acontece com o acesso público existente quando você cria um private endpoint para um recurso PaaS?",
    options: [
      "O acesso público é automaticamente desabilitado quando o private endpoint é criado",
      "O acesso público permanece disponível a menos que você o desabilite explicitamente; ambos os caminhos de acesso coexistem",
      "O acesso público é redirecionado através do private endpoint",
      "O IP público do recurso PaaS é deletado"
    ],
    correctIndex: 1,
    explanation: "Criar um private endpoint NÃO desabilita automaticamente o acesso público. Ambos os caminhos de acesso público e privado coexistem até que você desabilite explicitamente o acesso público (ex.: definir publicNetworkAccess como Disabled ou configurar defaultAction do firewall como Deny)."
  },
  {
    question: "Por que o Azure Container Registry (ACR) requer um SKU Premium para private endpoints?",
    options: [
      "O SKU Premium tem mais capacidade de armazenamento necessária para rede privada",
      "O suporte a private endpoint é um recurso exclusivo do tier Premium para ACR",
      "Os SKUs Standard e Basic não suportam resolução DNS",
      "O SKU Premium é necessário para qualquer recurso de rede do ACR"
    ],
    correctIndex: 1,
    explanation: "O suporte a private endpoint no Azure Container Registry está disponível exclusivamente no tier SKU Premium. Isso é uma restrição de recurso, não uma limitação técnica. Os tiers Basic e Standard do ACR não suportam private endpoints."
  },
  {
    question: "O que deve ser configurado quando uma VNet usa servidores DNS customizados (não fornecidos pelo Azure) e private endpoints são implantados?",
    options: [
      "Private endpoints devem ser implantados em uma sub-rede diferente",
      "Servidores DNS customizados devem encaminhar condicionalmente zonas privatelink.* para o Azure DNS (168.63.129.16)",
      "Um gateway VPN é necessário para o tráfego DNS",
      "Cada private endpoint precisa de uma configuração de IP estático"
    ],
    correctIndex: 1,
    explanation: "Quando servidores DNS customizados são configurados em uma VNet, eles devem ser configurados para encaminhar condicionalmente consultas para zonas 'privatelink.*' ao Azure DNS (168.63.129.16). Caso contrário, as consultas DNS não alcançarão as zonas Azure Private DNS e resolverão para IPs públicos."
  }
]} />

## Limpeza

```bash
# Delete the resource group and all resources
az group delete --name $RG --yes --no-wait

# Note: Private DNS zones in the resource group will also be deleted
```
