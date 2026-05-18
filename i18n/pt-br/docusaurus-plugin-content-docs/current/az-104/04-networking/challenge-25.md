---
sidebar_position: 25
title: "Desafio 25: Private Endpoints & Service Endpoints"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 25: Private Endpoints & Service Endpoints

:::info Tempo e Custo Estimados

**60-75 minutos** | **Custo estimado**: ~$0,15 | **Peso no Exame: 15-20%**

:::

## Cenário

A equipe de segurança da Contoso Ltd. emitiu um mandato: todos os serviços PaaS (Storage, Key Vault, SQL) devem ser acessíveis apenas de dentro da VNet corporativa. Nenhuma exposição à internet pública é permitida. Você deve implementar tanto service endpoints quanto private endpoints, entender suas diferenças e configurar zonas DNS privadas para resolução de nomes contínua.

## Habilidades do Exame Cobertas

- Configurar service endpoints para serviços PaaS do Azure
- Configurar private endpoints para serviços PaaS do Azure
- Configurar zonas DNS privadas para private endpoints
- Comparar o comportamento de service endpoint vs private endpoint
- Configurar políticas de rede para private endpoints

## Referência Sysadmin ↔ Azure

| On-Prem / Tradicional | Equivalente no Azure |
|---|---|
| Link de fibra direta com provedor de serviços | Service Endpoint (rota otimizada para PaaS) |
| Linha privada dedicada para SaaS | Private Endpoint (IP privado na sua VNet) |
| DNS interno para serviços privados | Private DNS Zone |
| DNS split-brain | Private DNS Zone vinculada à VNet |
| Regras de firewall restringindo IPs de origem | Firewall de Storage/Key Vault com regras de VNet |
| Segmentação de rede para dados sensíveis | Private Endpoint + políticas NSG |

## Configuração Inicial

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

## Tarefas

### Tarefa 1: Criar Recursos PaaS de Destino

```bash
# Create a Storage Account
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

### Tarefa 2: Configurar Service Endpoint para Storage

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

# Set default action to Deny (block public access)
az storage account update \
  --resource-group $RG \
  --name $STORAGE_NAME \
  --default-action Deny

# Verify network rules
az storage account network-rule list \
  --resource-group $RG \
  --account-name $STORAGE_NAME -o table
```

:::tip Dica

Service endpoints mantêm o tráfego na rede backbone do Azure e restringem o acesso ao PaaS a sub-redes específicas da VNet. O IP público do serviço PaaS ainda é usado para comunicação, mas a origem é identificada pela VNet/sub-rede em vez de um IP público.

:::
### Tarefa 3: Configurar Private Endpoint para Storage

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

### Tarefa 4: Configurar Private DNS Zone para Storage

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

# Create DNS zone group (auto-registers the private endpoint IP)
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

:::tip Dica

Quando você cria um private endpoint, precisa de uma Private DNS Zone para que o FQDN (ex.: `contososa12345.blob.core.windows.net`) resolva para o IP privado (ex.: `10.0.2.4`) em vez do IP público. O nome da zona deve corresponder à zona privatelink do serviço (ex.: `privatelink.blob.core.windows.net`).

:::
### Tarefa 5: Configurar Private Endpoint para Key Vault

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

### Tarefa 6: Verificar Resolução de Nomes Através do DNS Privado

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

### Tarefa 7: Configurar Políticas de Rede para Private Endpoints

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

### Tarefa 8: Comparar Service Endpoints vs Private Endpoints

Implante ambas as abordagens lado a lado e observe as diferenças:

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

## Critérios de Sucesso

<SuccessChecklist
  storageKey="az104-challenge-25"
  items={[
    "Conta de armazenamento criada com acesso público negado",
    "Service endpoint habilitado na sub-rede para Microsoft.Storage",
    "Firewall do storage configurado para permitir tráfego da VNet via service endpoint",
    "Private endpoint criado para Storage (blob) com IP privado",
    "Private DNS Zone criada e vinculada à VNet para blob storage",
    "DNS resolve o FQDN do storage para IP privado de dentro da VNet",
    "Private endpoint criado para Key Vault com DNS privado",
    "Acesso público do Key Vault desabilitado",
    "Políticas de rede (NSG) configuradas para sub-rede de private endpoints",
    "Diferenças entre service endpoints e private endpoints compreendidas"
  ]}
/>
## Cenários de Quebrar & Consertar

### Cenário A: DNS Não Resolve para IP Privado

```bash
# Symptom: nslookup returns public IP instead of private IP
# Cause: Private DNS zone not linked to the VNet

# Check DNS zone links
az network private-dns link vnet list \
  --resource-group $RG \
  --zone-name "privatelink.blob.core.windows.net" -o table

# Fix: Link the DNS zone to the VNet
az network private-dns link vnet create \
  --resource-group $RG \
  --zone-name "privatelink.blob.core.windows.net" \
  --name fix-link \
  --virtual-network vnet-contoso \
  --registration-enabled false
```

### Cenário B: Conexão do Private Endpoint Não Aprovada

```bash
# If using manual approval, the connection stays in "Pending" state
az network private-endpoint show \
  --resource-group $RG \
  --name pe-storage-blob \
  --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status"

# If pending, approve it on the resource side:
# az network private-endpoint-connection approve \
#   --resource-group $RG \
#   --resource-name $STORAGE_NAME \
#   --type Microsoft.Storage/storageAccounts \
#   --name <connection-name>
```

### Cenário C: Storage Acessível pela Internet Apesar do Firewall

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

## Verificação de Conhecimento

**1. Quais são as principais diferenças entre service endpoints e private endpoints?**

<details>
<summary>Mostrar Resposta</summary>

| Aspecto | Service Endpoint | Private Endpoint |
|--------|-----------------|-----------------|
| Endereço IP | IP público do PaaS | IP privado na sua VNet |
| DNS | Resolve para IP público | Resolve para IP privado (precisa de Private DNS) |
| Acesso on-premises | Não (apenas VNet) | Sim (via VPN/ExpressRoute) |
| Cross-region | Não (mesma região) | Sim |
| Proteção contra exfiltração de dados | Limitada | Forte (recurso específico) |
| Custo | Gratuito | Cobrança por hora + dados |
| Configuração | Nível de sub-rede | Específico por recurso |
</details>

**2. Quais nomes de Private DNS Zone são necessários para serviços comuns?**

<details>
<summary>Mostrar Resposta</summary>

| Serviço | Group ID | Private DNS Zone |
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

**3. Por que você precisa desabilitar políticas de rede de private endpoints em uma sub-rede?**

<details>
<summary>Mostrar Resposta</summary>

Por padrão, regras NSG e UDRs não se aplicam a private endpoints. A configuração da sub-rede `privateEndpointNetworkPolicies` controla isso:
- **Desabilitada** (padrão legado): NSGs e tabelas de rotas são ignoradas para tráfego de PE
- **Habilitada**: NSGs e tabelas de rotas se aplicam ao tráfego de private endpoints (recomendado para controle granular)

Você deve habilitar isso explicitamente se quiser usar NSGs para controlar o acesso a private endpoints.
</details>

**4. Um private endpoint pode ser acessado a partir do on-premises?**

<details>
<summary>Mostrar Resposta</summary>

Sim. Esta é uma vantagem chave em relação aos service endpoints. Clientes on-premises podem acessar private endpoints através de:
1. Conexão VPN para a VNet
2. ExpressRoute private peering para a VNet
3. O DNS deve resolver o FQDN do PaaS para o IP privado (configure encaminhadores condicionais on-premises apontando para o Azure Private DNS resolver ou o DNS da VNet)
</details>

## Limpeza

```bash
# Delete all resources
az group delete --name $RG --yes --no-wait

echo "Resources are being deleted in the background."
```

## Recursos de Aprendizagem

- [O que é Azure Private Link?](https://learn.microsoft.com/azure/private-link/private-link-overview)
- [Criar um private endpoint](https://learn.microsoft.com/azure/private-link/create-private-endpoint-cli)
- [Service endpoints de rede virtual](https://learn.microsoft.com/azure/virtual-network/virtual-network-service-endpoints-overview)
- [Zonas DNS privadas do Azure](https://learn.microsoft.com/azure/dns/private-dns-overview)
- [Integração DNS de private endpoints](https://learn.microsoft.com/azure/private-link/private-endpoint-dns)
- [Gerenciar políticas de rede para private endpoints](https://learn.microsoft.com/azure/private-link/disable-private-endpoint-network-policy)
