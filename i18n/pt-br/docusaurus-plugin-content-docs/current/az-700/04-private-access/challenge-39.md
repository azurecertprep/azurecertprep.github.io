---
sidebar_position: 6
title: "Desafio 39: Migrar Service Endpoints para Private Endpoints"
sidebar_label: "Challenge 39"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 39: Migrar service endpoints para pontos de extremidade privados

:::info Tempo e custo estimados

**60-90 minutos** | **~$0.05/h** (Private Endpoint + zona DNS) | **Peso do exame: 10-15%**

:::

## Cenário

O Woodgrove Bank tem utilizado service endpoints para proteger o acesso ao Azure Storage e ao Azure SQL Database a partir das sub-redes de sua VNet. Como parte de uma iniciativa de modernização de segurança, a equipe de rede deve migrar todos os service endpoints para Private Endpoints. Isso fornece isolamento mais forte (IPs privados na VNet), habilita o acesso local via VPN e elimina os riscos de exfiltração de dados que os service endpoints sozinhos não conseguem resolver completamente.

A migração deve ser realizada com tempo de inatividade zero. Tanto os service endpoints quanto os Private Endpoints podem coexistir durante o período de transição. O caminho crítico é:

1. Implantar Private Endpoints junto com os service endpoints existentes (coexistência).
2. Configurar o DNS para resolver para IPs privados.
3. Validar a conectividade através do Private Endpoint.
4. Remover as regras de VNet do firewall da conta de armazenamento.
5. Desabilitar o acesso Ã  rede pública.
6. Remover os service endpoints da sub-rede.

### Ordem de migração (crítica)

```json
[Current State]
  Subnet -> Service Endpoint -> Storage (public IP, VNet rule)

[Step 1: Deploy PE alongside SE - coexistence]
  Subnet -> Service Endpoint -> Storage (public IP, VNet rule)
  Subnet -> Private Endpoint -> Storage (private IP)

[Step 2: DNS cutover]
  storageaccount.blob.core.windows.net -> private IP (via Private DNS zone)

[Step 3: Validate]
  Confirm all clients resolve to private IP and connectivity works

[Step 4: Remove SE infrastructure]
  Remove VNet rules -> Disable public access -> Remove SE from subnet

[Final State]
  Subnet -> Private Endpoint -> Storage (private IP only)
```

:::caution Risco de migração
Nunca remova o service endpoint ou as regras de VNet antes de validar que a resolução DNS do Private Endpoint está funcionando. Durante a coexistência, o tráfego utilizará qualquer caminho para o qual o DNS resolver. Se o DNS ainda apontar para o IP público, remover a regra de VNet interromperá a conectividade.
:::

---

## Tarefa 1: Documentar a configuração atual de service endpoint

Antes de migrar, capture a configuração existente para planejamento de rollback.

### Azure CLI

```bash
# Variables
RG="rg-challenge39"
LOCATION="eastus"
VNET_NAME="vnet-production"
SUBNET_NAME="snet-app"
STORAGE_NAME="stwoodgrovec39$(shuf -i 1000-9999 -n 1)"

# Create the lab environment (simulating existing SE setup)
az group create --name $RG --location $LOCATION

az storage account create \
  --resource-group $RG \
  --name $STORAGE_NAME \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

az network vnet create \
  --resource-group $RG \
  --name $VNET_NAME \
  --location $LOCATION \
  --address-prefixes "10.2.0.0/16" \
  --subnet-name $SUBNET_NAME \
  --subnet-prefixes "10.2.0.0/24"

# Enable service endpoint (existing state)
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --service-endpoints Microsoft.Storage

# Configure VNet rule on storage (existing state)
az storage account update \
  --resource-group $RG \
  --name $STORAGE_NAME \
  --default-action Deny

az storage account network-rule add \
  --resource-group $RG \
  --account-name $STORAGE_NAME \
  --vnet-name $VNET_NAME \
  --subnet $SUBNET_NAME

# Document current state
echo "=== Current Subnet Service Endpoints ==="
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --query "serviceEndpoints[].service" -o tsv

echo "=== Current Storage Network Rules ==="
az storage account network-rule list \
  --resource-group $RG \
  --account-name $STORAGE_NAME \
  --query "virtualNetworkRules[].{subnet:virtualNetworkResourceId, state:state}" -o table

echo "=== Current Default Action ==="
az storage account show \
  --resource-group $RG \
  --name $STORAGE_NAME \
  --query "networkRuleSet.defaultAction" -o tsv
```

### Azure PowerShell

```powershell
# Variables
$rg = "rg-challenge39"
$location = "eastus"
$vnetName = "vnet-production"
$subnetName = "snet-app"
$storageName = "stwoodgrovec39$(Get-Random -Minimum 1000 -Maximum 9999)"

# Create the lab environment
New-AzResourceGroup -Name $rg -Location $location

New-AzStorageAccount -ResourceGroupName $rg -Name $storageName `
  -Location $location -SkuName Standard_LRS -Kind StorageV2

$subnet = New-AzVirtualNetworkSubnetConfig -Name $subnetName `
  -AddressPrefix "10.2.0.0/24" -ServiceEndpoint "Microsoft.Storage"

$vnet = New-AzVirtualNetwork -ResourceGroupName $rg -Name $vnetName `
  -Location $location -AddressPrefix "10.2.0.0/16" -Subnet $subnet

# Add VNet rule to storage
Update-AzStorageAccountNetworkRuleSet -ResourceGroupName $rg `
  -Name $storageName -DefaultAction Deny

$subnetObj = Get-AzVirtualNetwork -ResourceGroupName $rg -Name $vnetName | `
  Get-AzVirtualNetworkSubnetConfig -Name $subnetName

Add-AzStorageAccountNetworkRule -ResourceGroupName $rg `
  -Name $storageName -VirtualNetworkResourceId $subnetObj.Id

# Document current state
Write-Output "=== Current Subnet Configuration ==="
$subnetObj.ServiceEndpoints | Format-Table
Write-Output "=== Current Storage VNet Rules ==="
(Get-AzStorageAccountNetworkRuleSet -ResourceGroupName $rg -AccountName $storageName).VirtualNetworkRules
```

---

## Tarefa 2: Implantar Private Endpoint junto com o service endpoint existente

Durante esta fase, tanto o SE quanto o PE coexistem. O tráfego existente continua fluindo pelo service endpoint até que o DNS seja atualizado.

### Azure CLI

```bash
# Create a subnet for Private Endpoints
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name "snet-private-endpoints" \
  --address-prefixes "10.2.1.0/24"

# Get the storage account resource ID
STORAGE_ID=$(az storage account show \
  --name $STORAGE_NAME \
  --resource-group $RG \
  --query id -o tsv)

# Create the Private Endpoint for blob storage
az network private-endpoint create \
  --resource-group $RG \
  --name "pe-${STORAGE_NAME}-blob" \
  --vnet-name $VNET_NAME \
  --subnet "snet-private-endpoints" \
  --private-connection-resource-id $STORAGE_ID \
  --group-id "blob" \
  --connection-name "pec-${STORAGE_NAME}-blob" \
  --location $LOCATION

# Verify the Private Endpoint was created
az network private-endpoint show \
  --resource-group $RG \
  --name "pe-${STORAGE_NAME}-blob" \
  --query "{name:name, provisioningState:provisioningState, privateIP:customDnsConfigs[0].ipAddresses[0]}" -o table
```

### Azure PowerShell

```powershell
# Create PE subnet
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name $vnetName
Add-AzVirtualNetworkSubnetConfig -Name "snet-private-endpoints" `
  -VirtualNetwork $vnet -AddressPrefix "10.2.1.0/24"
$vnet | Set-AzVirtualNetwork

# Create Private Endpoint
$storageAccount = Get-AzStorageAccount -ResourceGroupName $rg -Name $storageName
$peSubnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name $vnetName | `
  Get-AzVirtualNetworkSubnetConfig -Name "snet-private-endpoints"

$peLinkConfig = New-AzPrivateLinkServiceConnection `
  -Name "pec-$storageName-blob" `
  -PrivateLinkServiceId $storageAccount.Id `
  -GroupId "blob"

New-AzPrivateEndpoint `
  -ResourceGroupName $rg `
  -Name "pe-$storageName-blob" `
  -Location $location `
  -Subnet $peSubnet `
  -PrivateLinkServiceConnection $peLinkConfig
```

### Portal

1. Navegue até **Private endpoints** e selecione **+ Create**.
2. Defina o grupo de recursos, nome como `pe-storagename-blob`, região como **East US**.
3. Em **Resource**, selecione a conta de armazenamento e o sub-recurso `blob`.
4. Em **Virtual Network**, selecione `vnet-production` e a sub-rede `snet-private-endpoints`.
5. Selecione **Review + create** e depois **Create**.

---

## Tarefa 3: Configurar zona de DNS privado e link

Para que o DNS resolva o FQDN do armazenamento para o IP privado, uma zona de DNS privado é necessária.

### Azure CLI

```bash
# Create Private DNS zone for blob storage
az network private-dns zone create \
  --resource-group $RG \
  --name "privatelink.blob.core.windows.net"

# Link the DNS zone to the VNet (enable auto-registration is not needed here)
az network private-dns link vnet create \
  --resource-group $RG \
  --zone-name "privatelink.blob.core.windows.net" \
  --name "link-vnet-production" \
  --virtual-network $VNET_NAME \
  --registration-enabled false

# Create DNS zone group to auto-register PE records
az network private-endpoint dns-zone-group create \
  --resource-group $RG \
  --endpoint-name "pe-${STORAGE_NAME}-blob" \
  --name "default" \
  --private-dns-zone "privatelink.blob.core.windows.net" \
  --zone-name "blob"
```

### Azure PowerShell

```powershell
# Create Private DNS Zone
$dnsZone = New-AzPrivateDnsZone -ResourceGroupName $rg `
  -Name "privatelink.blob.core.windows.net"

# Link DNS zone to VNet
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name $vnetName
New-AzPrivateDnsVirtualNetworkLink -ResourceGroupName $rg `
  -ZoneName "privatelink.blob.core.windows.net" `
  -Name "link-vnet-production" `
  -VirtualNetworkId $vnet.Id

# Create DNS zone group for automatic record registration
$dnsZoneConfig = New-AzPrivateDnsZoneConfig `
  -Name "privatelink.blob.core.windows.net" `
  -PrivateDnsZoneId $dnsZone.ResourceId

New-AzPrivateDnsZoneGroup -ResourceGroupName $rg `
  -PrivateEndpointName "pe-$storageName-blob" `
  -Name "default" `
  -PrivateDnsZoneConfig $dnsZoneConfig
```

### Portal

1. Pesquise por **Private DNS zones** e selecione **+ Create**.
2. Nome: `privatelink.blob.core.windows.net`, grupo de recursos: `rg-challenge39`.
3. Após a criação, vá para **Virtual network links** e adicione um link para `vnet-production`.
4. Volte ao Private Endpoint, selecione **DNS configuration** e adicione um grupo de zona DNS vinculado Ã  zona.

---

## Tarefa 4: Validar conectividade do Private Endpoint

Este é o passo crítico antes de remover os service endpoints. Confirme que o DNS resolve para o IP privado.

### Azure CLI

```bash
# Get the expected private IP of the PE
PE_IP=$(az network private-endpoint show \
  --resource-group $RG \
  --name "pe-${STORAGE_NAME}-blob" \
  --query "customDnsConfigs[0].ipAddresses[0]" -o tsv)
echo "Expected Private IP: $PE_IP"

# From a VM in the VNet, verify DNS resolution
# (Run nslookup from the VM)
# nslookup <storagename>.blob.core.windows.net
# Expected output:
#   <storagename>.blob.core.windows.net
#   canonical name = <storagename>.privatelink.blob.core.windows.net
#   Address: 10.2.1.4 (the PE private IP)

# Verify the A record exists in the Private DNS zone
az network private-dns record-set a list \
  --resource-group $RG \
  --zone-name "privatelink.blob.core.windows.net" \
  --query "[].{name:name, ip:aRecords[0].ipv4Address}" -o table
```

### PowerShell (a partir de uma VM na VNet)

```powershell
# Test DNS resolution
Resolve-DnsName -Name "$storageName.blob.core.windows.net"

# Expected output should show:
# Name: storagename.privatelink.blob.core.windows.net
# Type: A
# IPAddress: 10.2.1.4

# Test connectivity to blob endpoint via private IP
Test-NetConnection -ComputerName "$storageName.blob.core.windows.net" -Port 443
```

:::tip Lista de verificação de validação
Antes de prosseguir com a remoção dos service endpoints, confirme:
1. `nslookup` resolve para um IP privado (10.x.x.x), não um IP público.
2. A cadeia CNAME inclui `privatelink.blob.core.windows.net`.
3. Os testes de conectividade da aplicação são bem-sucedidos.
4. Os clientes locais (se aplicável) também resolvem para o IP privado.
:::

---

## Tarefa 5: Remover infraestrutura de service endpoint

Após a validação confirmar que o Private Endpoint está funcionando, remova a configuração do service endpoint na ordem correta.

### Azure CLI

```bash
# Step 1: Remove VNet rule from storage account firewall
az storage account network-rule remove \
  --resource-group $RG \
  --account-name $STORAGE_NAME \
  --vnet-name $VNET_NAME \
  --subnet $SUBNET_NAME

# Step 2: Disable public network access entirely
az storage account update \
  --resource-group $RG \
  --name $STORAGE_NAME \
  --public-network-access Disabled

# Step 3: Remove service endpoint from the subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --remove serviceEndpoints

# Verify final state
echo "=== Storage Public Access ==="
az storage account show \
  --resource-group $RG \
  --name $STORAGE_NAME \
  --query "{publicAccess:publicNetworkAccess, defaultAction:networkRuleSet.defaultAction}" -o table

echo "=== Subnet Service Endpoints ==="
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --query "serviceEndpoints" -o table
```

### Azure PowerShell

```powershell
# Step 1: Remove VNet rule from storage account
$subnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name $vnetName | `
  Get-AzVirtualNetworkSubnetConfig -Name $subnetName

Remove-AzStorageAccountNetworkRule -ResourceGroupName $rg `
  -Name $storageName -VirtualNetworkResourceId $subnet.Id

# Step 2: Disable public network access
Set-AzStorageAccount -ResourceGroupName $rg `
  -Name $storageName -PublicNetworkAccess Disabled

# Step 3: Remove service endpoint from subnet
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name $vnetName
Set-AzVirtualNetworkSubnetConfig -VirtualNetwork $vnet `
  -Name $subnetName -AddressPrefix "10.2.0.0/24" `
  -ServiceEndpoint @()
$vnet | Set-AzVirtualNetwork

# Verify
Get-AzStorageAccount -ResourceGroupName $rg -Name $storageName | `
  Select-Object StorageAccountName, PublicNetworkAccess
```

### Portal

1. Navegue até a conta de armazenamento > **Networking**.
2. Em **Virtual networks**, remova a regra de VNet para `snet-app`.
3. Defina **Public network access** como **Disabled**.
4. Salve.
5. Navegue até VNet > sub-rede `snet-app` > **Service endpoints**.
6. Remova `Microsoft.Storage` da lista.
7. Salve.

---

## Tarefa 6: Verificar conectividade pós-migração

```bash
# From a VM inside the VNet, confirm blob access still works via PE
# nslookup should still return private IP
nslookup $STORAGE_NAME.blob.core.windows.net

# Test data access (using Azure CLI with storage key or managed identity)
az storage container list \
  --account-name $STORAGE_NAME \
  --auth-mode login

# Verify public access is truly disabled
# From outside the VNet (your local machine), this should fail:
curl -s -o /dev/null -w "%{http_code}" \
  "https://$STORAGE_NAME.blob.core.windows.net/?comp=list"
# Expected: 403 or connection refused
```

---

## Cenários de quebra e correção

### Cenário 1: Remoção do service endpoint antes do DNS do PE estar funcionando

**Sintoma**: Após remover o service endpoint e as regras de VNet, as aplicações perdem conectividade com a conta de armazenamento. O DNS ainda resolve para o IP público, e o acesso público agora está negado.

**Causa raiz**: A zona de DNS privado não foi criada, não foi vinculada Ã  VNet, ou o grupo de zona DNS não foi configurado no Private Endpoint. Sem o DNS adequado, o FQDN ainda resolve para o IP público.

**Correção (rollback)**:

```bash
# Re-enable public network access temporarily
az storage account update \
  --resource-group $RG \
  --name $STORAGE_NAME \
  --public-network-access Enabled

# Re-add the service endpoint and VNet rule (restore previous state)
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --service-endpoints Microsoft.Storage

az storage account network-rule add \
  --resource-group $RG \
  --account-name $STORAGE_NAME \
  --vnet-name $VNET_NAME \
  --subnet $SUBNET_NAME

# Now fix the DNS issue - verify DNS zone exists and is linked
az network private-dns zone show \
  --resource-group $RG \
  --name "privatelink.blob.core.windows.net" 2>/dev/null || \
  echo "DNS ZONE MISSING - must create it"

az network private-dns link vnet list \
  --resource-group $RG \
  --zone-name "privatelink.blob.core.windows.net" \
  --query "[].{name:name, vnet:virtualNetwork.id}" -o table
```

**Insight principal**: Sempre valide a resolução DNS antes de remover os service endpoints. A ordem de rollback é inversa: restaurar acesso público, reabilitar SE, readicionar regras de VNet.

---

### Cenário 2: Cache DNS não atualizado após migração

**Sintoma**: Alguns clientes ainda conectam pelo caminho público mesmo com a zona de DNS privado corretamente configurada. Falhas intermitentes ocorrem pois algumas requisições atingem o IP público (agora negado) enquanto outras alcançam o IP privado.

**Causa raiz**: Cache DNS no nível do sistema operacional do cliente, nível da aplicação, ou em resolvedores DNS intermediários. O registro DNS do IP público antigo possui um TTL que ainda não expirou.

**Correção**:

```powershell
# On Windows clients, flush DNS cache
ipconfig /flushdns

# On Linux clients
sudo systemd-resolve --flush-caches
# or
sudo resolvectl flush-caches

# Verify resolution after flush
nslookup storageaccount.blob.core.windows.net

# For persistent issues, check if the VM is using custom DNS servers
# that may not have the Private DNS zone linked
az network vnet show \
  --resource-group $RG \
  --name $VNET_NAME \
  --query "dhcpOptions.dnsServers" -o tsv
```

**Insight principal**: Planeje o tempo de propagação do TTL do DNS. Registros DNS do Azure tipicamente possuem TTLs curtos (10-60 segundos), mas o cache do lado do cliente pode persistir por mais tempo. Permita tempo adequado entre a transferência de DNS e a remoção do SE. Se servidores DNS personalizados estão configurados na VNet, certifique-se de que esses servidores podem encaminhar para o Azure DNS (168.63.129.16) ou que possuem a zona de DNS privado vinculada.

---

### Cenário 3: Clientes locais quebrados após desabilitar acesso público

**Sintoma**: Clientes locais que acessam a conta de armazenamento via VPN perdem conectividade após o acesso Ã  rede pública ser desabilitado. Eles anteriormente acessavam pelo endpoint público com regras de firewall baseadas em IP.

**Causa raiz**: O DNS local não foi atualizado para resolver o FQDN do armazenamento para o IP do Private Endpoint. Sem encaminhamento DNS para um Azure DNS Private Resolver ou encaminhador condicional, os clientes locais ainda resolvem para o IP público (que agora está bloqueado).

**Correção**:

```bash
# Option 1: Configure DNS forwarding from on-prem (see Challenge 37)
# On-prem DNS -> conditional forwarder -> Private Resolver inbound endpoint

# Option 2: Add a DNS host record on the on-prem DNS server
# Add A record: storageaccount.privatelink.blob.core.windows.net -> PE private IP
# Add CNAME: storageaccount.blob.core.windows.net -> storageaccount.privatelink.blob.core.windows.net

# Option 3: Temporary workaround - re-enable public access with IP rules
az storage account update \
  --resource-group $RG \
  --name $STORAGE_NAME \
  --public-network-access Enabled

# Add on-prem public IP to storage firewall (temporary)
az storage account network-rule add \
  --resource-group $RG \
  --account-name $STORAGE_NAME \
  --ip-address "203.0.113.0/24"
```

**Insight principal**: Private Endpoints só funcionam se o DNS resolver o FQDN para o IP privado. Clientes locais precisam de infraestrutura de encaminhamento DNS (DNS Private Resolver, encaminhadores condicionais ou entradas de arquivo host) para resolver zonas de DNS privado do Azure. Planeje isso antes de desabilitar o acesso público.

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-39-q1",
    question: "Durante uma migração de service endpoints para Private Endpoints, qual é a ordem correta de operações?",
    options: [
      "Remover SE, implantar PE, configurar DNS, validar",
      "Implantar PE, configurar DNS, validar, remover regras de VNet, desabilitar acesso público, remover SE ✅",
      "Configurar DNS, implantar PE, remover SE, validar",
      "Desabilitar acesso público, implantar PE, configurar DNS, remover SE"
    ],
    correctIndex: 1,
    explanation: "A ordem correta garante zero tempo de inatividade: implantar PE junto com SE (coexistência), configurar DNS para resolução privada, validar que a conectividade funciona via PE, então remover regras de VNet, desabilitar acesso público e finalmente remover SE da sub-rede."
  },
  {
    id: "az700-39-q2",
    question: "Service endpoints e Private Endpoints podem coexistir na mesma conta de armazenamento simultaneamente?",
    options: [
      "Não, são configurações mutuamente exclusivas",
      "Sim, ambos podem estar ativos simultaneamente durante a migração ✅",
      "Apenas se o acesso à rede pública estiver definido como Habilitado",
      "Apenas se o Private Endpoint estiver em uma VNet diferente"
    ],
    correctIndex: 1,
    explanation: "Service endpoints e Private Endpoints podem coexistir na mesma conta de armazenamento. Durante a migração, o tráfego de uma sub-rede usa o caminho para o qual o DNS resolve. A regra de VNet (SE) e o Private Endpoint podem estar ambos ativos, permitindo uma migração segura com capacidade de rollback."
  },
  {
    id: "az700-39-q3",
    question: "Após implantar um Private Endpoint, o que determina se o tráfego flui pelo caminho do SE ou do PE?",
    options: [
      "A tabela de roteamento de rede na sub-rede",
      "O resultado da resolução DNS (IP público vs IP privado) ✅",
      "A ordem em que SE e PE foram criados",
      "As regras de prioridade do firewall da conta de armazenamento"
    ],
    correctIndex: 1,
    explanation: "A resolução DNS é o fator determinante. Se o FQDN resolve para o IP público (sem zona de Private DNS), o tráfego usa o caminho do service endpoint. Se resolve para um IP privado (zona de Private DNS ativa), o tráfego vai diretamente para o Private Endpoint. Por isso a configuração DNS é a etapa crítica de transição."
  },
  {
    id: "az700-39-q4",
    question: "Qual é o risco de desabilitar o acesso à rede pública em uma conta de armazenamento antes de verificar a configuração DNS local?",
    options: [
      "Nenhum risco, Private Endpoints sempre funcionam independente do DNS",
      "Clientes locais perderão acesso porque ainda resolvem para o IP público que agora está bloqueado ✅",
      "O Private Endpoint também parará de funcionar",
      "VMs do Azure na VNet perderão acesso"
    ],
    correctIndex: 1,
    explanation: "Se o DNS local não foi configurado para resolver o FQDN do armazenamento para o IP do Private Endpoint (via encaminhamento DNS ou registros de host), os clientes locais ainda resolverão para o IP público. Com o acesso público desabilitado, essas conexões serão recusadas."
  },
  {
    id: "az700-39-q5",
    question: "Se você precisar reverter uma migração de PE que falhou, qual é a sequência correta de rollback?",
    options: [
      "Remover o Private Endpoint primeiro, depois reabilitar o SE",
      "Reabilitar acesso público, readicionar regra de VNet, reabilitar SE na sub-rede ✅",
      "Simplesmente remover a zona de Private DNS para reverter o DNS",
      "Excluir e recriar a conta de armazenamento"
    ],
    correctIndex: 1,
    explanation: "O rollback requer restaurar o estado anterior: reabilitar o acesso à rede pública na conta de armazenamento, readicionar a regra de VNet permitindo acesso à sub-rede e garantir que o service endpoint ainda esteja habilitado na sub-rede. O Private Endpoint e a zona DNS podem permanecer (eles não interferem)."
  },
  {
    id: "az700-39-q6",
    question: "Após a migração ser concluída e o acesso público estar desabilitado, quais clientes ainda podem acessar a conta de armazenamento?",
    options: [
      "Apenas clientes na mesma VNet do Private Endpoint",
      "Clientes na mesma VNet, VNets emparelhadas e clientes locais com configuração DNS adequada (todos via PE) ✅",
      "Apenas serviços Azure com acesso confiável habilitado",
      "Nenhum cliente pode acessar; o acesso público deve permanecer habilitado"
    ],
    correctIndex: 1,
    explanation: "Com o acesso público desabilitado, o acesso só é possível via Private Endpoints. Isso inclui clientes na VNet do PE, VNets emparelhadas (se o DNS estiver configurado) e clientes locais conectados via VPN/ExpressRoute com encaminhamento DNS para resolver o FQDN para o IP privado do PE."
  }
]} />

---

## Limpeza

```bash
# Delete all resources
az group delete --name rg-challenge39 --yes --no-wait
```

```powershell
# PowerShell cleanup
Remove-AzResourceGroup -Name "rg-challenge39" -Force -AsJob
```

:::warning Gerenciamento de custos
Private Endpoints custam aproximadamente **$0.01/hora** por endpoint mais cobranças de processamento de dados. A VM de teste e a conta de armazenamento também geram cobranças mínimas. Exclua o grupo de recursos imediatamente após concluir este desafio.
:::

---

## Resumo

Neste desafio, você realizou uma migração com tempo de inatividade zero de service endpoints para Private Endpoints. Você aprendeu a importância crítica da ordem de migração -- implantar PE junto com SE, validar a resolução DNS antes de remover a infraestrutura de SE, e as armadilhas comuns que causam indisponibilidades (remoção prematura do SE, cache DNS, configuração DNS local ausente). Este padrão de migração é um tópico frequente no exame e uma tarefa comum no mundo real Ã  medida que as organizações adotam Private Endpoints para melhorar a postura de segurança.
