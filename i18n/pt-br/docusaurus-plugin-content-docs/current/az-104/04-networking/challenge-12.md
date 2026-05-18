---
sidebar_position: 2
title: "Challenge 12 — Network Security"
---

# Desafio 12 — Network Security

:::info Tempo Estimado & Custo
⏱️ **60 minutos** | 💰 **~$0,30** (Azure Bastion gera cobranças por hora — exclua rapidamente) | 📊 **Peso no exame: 15–20%**
:::

## Cenário

A equipe de segurança da Contoso concluiu uma revisão e emitiu diretrizes: todo tráfego de rede deve ser explicitamente permitido, o acesso administrativo deve passar por um bastion host (sem IPs públicos nas VMs), e conexões de banco de dados devem usar private endpoints. Seu trabalho é bloquear tudo mantendo a aplicação funcional.

## Habilidades do Exame Cobertas

| Habilidade | Peso |
|------------|------|
| Criar e configurar NSGs | Alto |
| Criar e configurar Application Security Groups (ASGs) | Alto |
| Avaliar regras de segurança efetivas | Médio |
| Implementar Azure Bastion | Alto |
| Configurar service endpoints | Médio |
| Configurar private endpoints | Alto |

## Referência Sysadmin ↔ Azure

| Tradicional | Equivalente no Azure |
|-------------|---------------------|
| Regras ACL de firewall (permitir/negar) | Regras NSG (Allow/Deny + prioridade) |
| Zonas de firewall (DMZ, confiável, não confiável) | Application Security Groups (ASGs) |
| Jump box / bastion host em uma VM reforçada | Azure Bastion (PaaS gerenciado) |
| Conexão SQL direta pela rede | Private endpoint (IP privado na sua VNet) |
| Lista de IPs permitidos em um banco de dados | Service endpoint (roteia tráfego pelo backbone do Azure) |

## Tarefas

### Tarefa 1 — Criar um NSG com Regras

```bash
# Create a resource group
az group create --name rg-netsec-lab --location eastus

# Create a VNet with subnets
az network vnet create \
  --resource-group rg-netsec-lab \
  --name vnet-secure \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-frontend \
  --subnet-prefix 10.0.1.0/24

az network vnet subnet create \
  --resource-group rg-netsec-lab \
  --vnet-name vnet-secure \
  --name snet-backend \
  --address-prefix 10.0.2.0/24

# Create an NSG
az network nsg create \
  --resource-group rg-netsec-lab \
  --name nsg-frontend

# Allow HTTP inbound
az network nsg rule create \
  --resource-group rg-netsec-lab \
  --nsg-name nsg-frontend \
  --name AllowHTTP \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 80

# Allow HTTPS inbound
az network nsg rule create \
  --resource-group rg-netsec-lab \
  --nsg-name nsg-frontend \
  --name AllowHTTPS \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 443

# Deny all other inbound traffic (explicit, lower priority)
az network nsg rule create \
  --resource-group rg-netsec-lab \
  --nsg-name nsg-frontend \
  --name DenyAllInbound \
  --priority 4000 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges '*'

# List the rules
az network nsg rule list -g rg-netsec-lab --nsg-name nsg-frontend -o table
```

### Tarefa 2 — Associar o NSG a uma Subnet

```bash
# Associate NSG with the frontend subnet
az network vnet subnet update \
  --resource-group rg-netsec-lab \
  --vnet-name vnet-secure \
  --name snet-frontend \
  --network-security-group nsg-frontend

# Verify the association
az network vnet subnet show -g rg-netsec-lab \
  --vnet-name vnet-secure -n snet-frontend \
  --query "networkSecurityGroup.id" -o tsv
```

### Tarefa 3 — Criar Application Security Groups

```bash
# Create ASGs for logical grouping
az network asg create \
  --resource-group rg-netsec-lab \
  --name asg-webservers

az network asg create \
  --resource-group rg-netsec-lab \
  --name asg-dbservers

# List ASGs
az network asg list -g rg-netsec-lab -o table
```

### Tarefa 4 — Criar Regras NSG Usando ASGs

```bash
# Create an NSG for the backend
az network nsg create \
  --resource-group rg-netsec-lab \
  --name nsg-backend

# Allow web servers to talk to database servers on port 5432 (PostgreSQL)
az network nsg rule create \
  --resource-group rg-netsec-lab \
  --nsg-name nsg-backend \
  --name AllowWebToDb \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-webservers \
  --source-port-ranges '*' \
  --destination-asgs asg-dbservers \
  --destination-port-ranges 5432

# Deny all other inbound to backend
az network nsg rule create \
  --resource-group rg-netsec-lab \
  --nsg-name nsg-backend \
  --name DenyAllInbound \
  --priority 4000 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges '*'

# Associate NSG with backend subnet
az network vnet subnet update \
  --resource-group rg-netsec-lab \
  --vnet-name vnet-secure \
  --name snet-backend \
  --network-security-group nsg-backend

# Deploy a VM and assign it to the web ASG
az vm create \
  --resource-group rg-netsec-lab \
  --name vm-web \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-secure \
  --subnet snet-frontend \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address "" \
  --asg asg-webservers \
  --no-wait

# Deploy a VM and assign it to the database ASG
az vm create \
  --resource-group rg-netsec-lab \
  --name vm-db \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-secure \
  --subnet snet-backend \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address "" \
  --asg asg-dbservers \
  --no-wait
```

### Tarefa 5 — Avaliar Regras de Segurança Efetivas

```bash
# Wait for VMs to finish provisioning
az vm wait -g rg-netsec-lab -n vm-web --created
az vm wait -g rg-netsec-lab -n vm-db --created

# Get the NIC for vm-web
WEB_NIC=$(az vm show -g rg-netsec-lab -n vm-web \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)

# Show effective security rules (combines NIC-level and subnet-level NSGs)
az network nic list-effective-nsg --ids $WEB_NIC -o table

# Show effective route table
az network nic show-effective-route-table --ids $WEB_NIC -o table

# Use Network Watcher to test a specific flow
WEB_PRIVATE_IP=$(az vm show -g rg-netsec-lab -n vm-web -d --query privateIps -o tsv)
DB_PRIVATE_IP=$(az vm show -g rg-netsec-lab -n vm-db -d --query privateIps -o tsv)

az network watcher test-ip-flow \
  --resource-group rg-netsec-lab \
  --vm vm-web \
  --direction Outbound \
  --protocol TCP \
  --local "$WEB_PRIVATE_IP:*" \
  --remote "$DB_PRIVATE_IP:5432"
```

### Tarefa 6 — Implantar o Azure Bastion

```bash
# Create the required AzureBastionSubnet (must be /26 or larger, must be named exactly this)
az network vnet subnet create \
  --resource-group rg-netsec-lab \
  --vnet-name vnet-secure \
  --name AzureBastionSubnet \
  --address-prefix 10.0.3.0/26

# Create a public IP for Bastion (must be Standard SKU, Static)
az network public-ip create \
  --resource-group rg-netsec-lab \
  --name pip-bastion \
  --sku Standard \
  --allocation-method Static

# Create Azure Bastion
az network bastion create \
  --resource-group rg-netsec-lab \
  --name bastion-secure \
  --public-ip-address pip-bastion \
  --vnet-name vnet-secure \
  --sku Basic \
  --no-wait

echo "Bastion takes 5-10 minutes to deploy."
echo "Once ready, connect to VMs via the Azure Portal → VM → Connect → Bastion"

# Verify Bastion
az network bastion show -g rg-netsec-lab -n bastion-secure \
  --query "{Name:name, State:provisioningState, SKU:sku.name}" -o table
```

<details>
<summary>💡 Dica — Conectar usando Bastion via CLI</summary>

Para SSH via Bastion pela CLI (requer o túnel Bastion):
```bash
az network bastion ssh \
  --resource-group rg-netsec-lab \
  --name bastion-secure \
  --target-resource-id $(az vm show -g rg-netsec-lab -n vm-web --query id -o tsv) \
  --auth-type ssh-key \
  --username azureuser \
  --ssh-key ~/.ssh/id_rsa
```
</details>

### Tarefa 7 — Configurar um Service Endpoint

```bash
# Create a storage account
STORAGE_NAME="contosodata$RANDOM"
az storage account create \
  --resource-group rg-netsec-lab \
  --name $STORAGE_NAME \
  --sku Standard_LRS \
  --kind StorageV2

# Enable a service endpoint for Microsoft.Storage on the backend subnet
az network vnet subnet update \
  --resource-group rg-netsec-lab \
  --vnet-name vnet-secure \
  --name snet-backend \
  --service-endpoints Microsoft.Storage

# Restrict the storage account to only accept traffic from the backend subnet
SUBNET_ID=$(az network vnet subnet show \
  -g rg-netsec-lab --vnet-name vnet-secure -n snet-backend --query id -o tsv)

az storage account network-rule add \
  --resource-group rg-netsec-lab \
  --account-name $STORAGE_NAME \
  --subnet $SUBNET_ID

# Set the default action to Deny
az storage account update \
  --resource-group rg-netsec-lab \
  --name $STORAGE_NAME \
  --default-action Deny

# Verify network rules
az storage account show -g rg-netsec-lab -n $STORAGE_NAME \
  --query "networkRuleSet" -o json
```

### Tarefa 8 — Criar um Private Endpoint

```bash
# Disable private endpoint network policies on a subnet
az network vnet subnet update \
  --resource-group rg-netsec-lab \
  --vnet-name vnet-secure \
  --name snet-backend \
  --private-endpoint-network-policies Disabled

# Get the storage account resource ID
STORAGE_ID=$(az storage account show -g rg-netsec-lab -n $STORAGE_NAME --query id -o tsv)

# Create a private endpoint for the storage account
az network private-endpoint create \
  --resource-group rg-netsec-lab \
  --name pe-storage \
  --vnet-name vnet-secure \
  --subnet snet-backend \
  --private-connection-resource-id $STORAGE_ID \
  --group-id blob \
  --connection-name pe-storage-connection

# Verify the private endpoint
az network private-endpoint show -g rg-netsec-lab -n pe-storage \
  --query "{Name:name, Subnet:subnet.id, IP:customDnsConfigs[0].ipAddresses[0], Status:privateLinkServiceConnections[0].privateLinkServiceConnectionState.status}" -o table
```

### Tarefa 9 — Verificar Conectividade do Private Endpoint

```bash
# Create a private DNS zone for blob storage
az network private-dns zone create \
  --resource-group rg-netsec-lab \
  --name privatelink.blob.core.windows.net

# Link the DNS zone to the VNet
az network private-dns link vnet create \
  --resource-group rg-netsec-lab \
  --zone-name privatelink.blob.core.windows.net \
  --name link-vnet-secure \
  --virtual-network vnet-secure \
  --registration-enabled false

# Get the private endpoint's NIC IP
PE_NIC_ID=$(az network private-endpoint show -g rg-netsec-lab -n pe-storage \
  --query "networkInterfaces[0].id" -o tsv)
PE_IP=$(az network nic show --ids $PE_NIC_ID \
  --query "ipConfigurations[0].privateIpAddress" -o tsv)

# Create a DNS record pointing the storage FQDN to the private IP
az network private-dns record-set a create \
  --resource-group rg-netsec-lab \
  --zone-name privatelink.blob.core.windows.net \
  --name $STORAGE_NAME

az network private-dns record-set a add-record \
  --resource-group rg-netsec-lab \
  --zone-name privatelink.blob.core.windows.net \
  --record-set-name $STORAGE_NAME \
  --ipv4-address $PE_IP

echo "Storage account $STORAGE_NAME.blob.core.windows.net now resolves to $PE_IP inside the VNet"
echo "From vm-db, run: nslookup $STORAGE_NAME.blob.core.windows.net"
```

## ✅ Critérios de Sucesso

- [ ] NSG criado com regras de permissão HTTP/HTTPS e deny-all
- [ ] NSG associado à subnet frontend
- [ ] ASGs criados para servidores web e servidores de banco de dados
- [ ] Regras NSG usam ASGs como origem/destino
- [ ] Regras de segurança efetivas mostram regras combinadas de NIC + subnet
- [ ] Azure Bastion implantado — VMs acessíveis sem IPs públicos
- [ ] Service endpoint habilitado para Storage na subnet backend
- [ ] Private endpoint criado para a conta de armazenamento
- [ ] Zona DNS resolve o FQDN do armazenamento para IP privado dentro da VNet

## 🔧 Cenários de Quebre & Conserte

### Cenário A — Regras NSG Conflitantes
```bash
# Add a rule at priority 200 that allows SSH, then another at priority 150 that denies it
az network nsg rule create -g rg-netsec-lab --nsg-name nsg-frontend \
  --name AllowSSH --priority 200 --direction Inbound --access Allow \
  --protocol Tcp --destination-port-ranges 22

az network nsg rule create -g rg-netsec-lab --nsg-name nsg-frontend \
  --name DenySSH --priority 150 --direction Inbound --access Deny \
  --protocol Tcp --destination-port-ranges 22
# Which rule wins? (Lower number = higher priority = evaluated first)
```

### Cenário B — Bloqueado Fora de uma VM
```bash
# What if you accidentally remove the SSH allow rule and can't connect?
# Azure Bastion bypasses NSG rules on the AzureBastionSubnet
# Connect via Azure Portal → VM → Connect → Bastion
```

### Cenário C — Nome Errado da Subnet do Bastion
```bash
# Try creating Bastion with a differently named subnet
az network vnet subnet create -g rg-netsec-lab \
  --vnet-name vnet-secure --name BastionSubnet --address-prefix 10.0.4.0/26
# Bastion requires the subnet to be named EXACTLY "AzureBastionSubnet"
```

## 📝 Teste seus Conhecimentos

**1. Como funciona a prioridade de regras NSG?**

<details>
<summary>Mostrar Resposta</summary>

- As regras são avaliadas do **número mais baixo (maior prioridade) ao número mais alto**.
- Faixa de prioridade: **100 a 4096**.
- A **primeira regra correspondente vence** — o Azure para de avaliar após uma correspondência.
- Regras padrão (65000-65500) não podem ser excluídas, mas podem ser substituídas por regras personalizadas de menor prioridade.
- Se nenhuma regra personalizada corresponder, as regras padrão se aplicam (permitir VNet-para-VNet, permitir load balancer, negar todo outro tráfego de entrada).
</details>

**2. Quais são as regras NSG padrão?**

<details>
<summary>Mostrar Resposta</summary>

**Regras Padrão de Entrada:**
| Prioridade | Nome | Ação |
|------------|------|------|
| 65000 | AllowVNetInBound | Permitir VNet ↔ VNet |
| 65001 | AllowAzureLoadBalancerInBound | Permitir probes de integridade |
| 65500 | DenyAllInBound | Negar todo o restante |

**Regras Padrão de Saída:**
| Prioridade | Nome | Ação |
|------------|------|------|
| 65000 | AllowVNetOutBound | Permitir VNet ↔ VNet |
| 65001 | AllowInternetOutBound | Permitir saída para internet |
| 65500 | DenyAllOutBound | Negar todo o restante |
</details>

**3. Como as regras de entrada são processadas quando NSGs existem tanto na NIC quanto na subnet?**

<details>
<summary>Mostrar Resposta</summary>

**Tráfego de entrada**: O NSG da subnet é avaliado **primeiro**, depois o NSG da NIC. O tráfego deve ser permitido por **ambos** os NSGs.

**Tráfego de saída**: O NSG da NIC é avaliado **primeiro**, depois o NSG da subnet. O tráfego deve ser permitido por **ambos** os NSGs.

Isso significa que a combinação mais restritiva se aplica. Se o NSG da subnet permite a porta 80, mas o NSG da NIC a nega, o tráfego é negado.
</details>

**4. Qual é a diferença entre service endpoints e private endpoints?**

<details>
<summary>Mostrar Resposta</summary>

| Recurso | Service Endpoint | Private Endpoint |
|---------|-----------------|-----------------|
| **Como funciona** | Roteia tráfego para o serviço Azure pelo backbone do Azure; o serviço ainda usa IP público | Cria um IP privado na sua VNet mapeado para o serviço |
| **Resolução DNS** | IP público (mas o tráfego fica no backbone) | IP privado via Private DNS Zone |
| **Acesso do on-premises** | ❌ Não suportado | ✅ Suportado (via VPN/ExpressRoute + DNS) |
| **Custo** | Gratuito | Cobranças pelo private endpoint + processamento de dados |
| **Granularidade** | Nível de subnet | Nível de recurso (conta de armazenamento específica, SQL server) |
| **Dica para o exame** | Mais simples de configurar, limitado ao backbone do Azure | Mais seguro, funciona com redes híbridas |
</details>

**5. Quais são os requisitos da subnet do Azure Bastion?**

<details>
<summary>Mostrar Resposta</summary>

- A subnet deve ser nomeada **exatamente** `AzureBastionSubnet` (sensível a maiúsculas e minúsculas)
- Tamanho mínimo: **/26** (64 endereços) ou maior
- Deve estar na **mesma VNet** das VMs que você deseja conectar (ou VNets com peering)
- Requer um IP público **Standard SKU, Static**
- **Nenhum outro recurso** pode ser implantado na AzureBastionSubnet
- O NSG na AzureBastionSubnet deve permitir regras específicas de entrada/saída (o Azure gerencia isso com o SKU Basic)
</details>

## 🧹 Limpeza

```bash
# Delete all resources — Bastion incurs hourly charges so clean up promptly!
az group delete --name rg-netsec-lab --yes --no-wait

echo "Resources are being deleted in the background."
echo "IMPORTANT: Verify in the portal that the resource group is deleted."
echo "Azure Bastion charges ~$0.19/hour while running."
```
