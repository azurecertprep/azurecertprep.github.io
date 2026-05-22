---
sidebar_position: 1
title: "Challenge 34: Private Endpoints & DNS Integration"
sidebar_label: "Challenge 34"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 34: Private Endpoints e integração DNS

:::info Tempo e custo estimados

**45-60 minutos** | **~$0,01/h** | **Peso no exame: 10-15%**

:::

## Cenário

A MedSecure Health, uma empresa de saúde, está migrando seus serviços PaaS para acesso privado a fim de cumprir requisitos de residência de dados e segurança. A equipe de conformidade exige que nenhum dado de paciente trafegue pela internet pública. Você foi encarregado de configurar pontos de extremidade privados para a conta de Azure Storage (endpoint de blob) e garantir a resolução DNS adequada para que aplicações dentro da rede virtual resolvam o FQDN da conta de armazenamento para um endereço IP privado em vez de um público.

**Arquitetura:**

```
                    Azure VNet (10.0.0.0/16)
                    ┌──────────────────────────────────────────────┐
                    │                                              │
                    │  snet-workloads (10.0.1.0/24)                │
                    │  ┌──────────┐                                │
                    │  │  vm-test  │ ── nslookup ──┐               │
                    │  └──────────┘                │               │
                    │                              v               │
                    │  snet-pe (10.0.2.0/24)                       │
                    │  ┌──────────────────────────┐                │
                    │  │ pe-storage (10.0.2.4)    │                │
                    │  └──────────────────────────┘                │
                    │              │                                │
                    └──────────────┼────────────────────────────────┘
                                   │ Private connection
                                   v
                    ┌──────────────────────────────┐
                    │  stmedsecure.blob.core...    │
                    │  (Storage Account - Blob)    │
                    └──────────────────────────────┘

    Private DNS Zone: privatelink.blob.core.windows.net
    A record: stmedsecure → 10.0.2.4
```

## Objetivos de aprendizagem

Após concluir este desafio, você será capaz de:

- Criar um ponto de extremidade privado para um sub-recurso blob do Azure Storage
- Criar e configurar uma zona DNS privatelink para resolução automática de nomes
- Vincular uma zona DNS privada a uma rede virtual
- Usar grupos de zona DNS para gerenciamento automático de registros DNS
- Habilitar políticas de rede em uma sub-rede de ponto de extremidade privado para permitir a aplicação de NSG
- Verificar que a resolução DNS retorna o endereço IP privado
- Entender os estados de conexão do ponto de extremidade privado (Pending, Approved, Rejected)

## Pré-requisitos

- Uma assinatura Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- PowerShell com módulo Az instalado (`Install-Module Az -Force`)

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| Private Endpoint | Uma interface de rede com um IP privado que conecta você de forma privada a um serviço por meio do Azure Private Link |
| Zona DNS privatelink | Uma zona DNS privada (ex.: `privatelink.blob.core.windows.net`) usada para substituir a resolução DNS pública por IPs privados |
| Grupo de zona DNS | Associa um ponto de extremidade privado a uma zona DNS privada para gerenciamento automático do ciclo de vida dos registros A |
| Link de rede virtual | Conecta uma zona DNS privada a uma VNet para que VMs nessa VNet possam resolver registros da zona |
| Políticas de rede | Por padrão, NSGs e UDRs estão desabilitados em sub-redes de PE; devem ser habilitados explicitamente via configuração de sub-rede |
| Estados de conexão | Pending (aguardando aprovação), Approved (ativo), Rejected (negado pelo proprietário do serviço), Disconnected |
| Sub-recurso (group-id) | Identifica qual parte de um serviço multi-endpoint conectar (ex.: `blob`, `file`, `table`, `queue`) |

### Cadeia de resolução DNS para pontos de extremidade privados

Quando um cliente em uma VNet vinculada resolve `stmedsecure.blob.core.windows.net`:

1. O Azure DNS recebe a consulta
2. O DNS público retorna um CNAME para `stmedsecure.privatelink.blob.core.windows.net`
3. O Azure DNS verifica as zonas DNS privadas vinculadas
4. A zona privatelink retorna o registro A apontando para o IP privado (ex.: 10.0.2.4)

Sem a zona DNS privada vinculada à VNet, a resolução cai para o IP público.

:::tip Nota de exame

O exame frequentemente testa a cadeia de resolução DNS. Lembre-se de que o DNS público sempre retorna um CNAME para o subdomínio `privatelink`. É a zona DNS privada (vinculada à VNet) que resolve esse CNAME para o IP privado. Se a zona não estiver vinculada, a consulta resolve para o IP público.

:::

---

## Tarefa 1: Criar o grupo de recursos e a rede virtual

### Azure CLI

```bash
# Create resource group
az group create \
    --name rg-pe-lab \
    --location eastus2

# Create VNet with workload subnet
az network vnet create \
    --resource-group rg-pe-lab \
    --name vnet-medsecure \
    --location eastus2 \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name snet-workloads \
    --subnet-prefixes 10.0.1.0/24

# Create dedicated subnet for private endpoints
az network vnet subnet create \
    --resource-group rg-pe-lab \
    --vnet-name vnet-medsecure \
    --name snet-pe \
    --address-prefixes 10.0.2.0/24
```

### Azure PowerShell

```powershell
# Create resource group
New-AzResourceGroup -Name "rg-pe-lab" -Location "eastus2"

# Create subnet configurations
$snetWorkloads = New-AzVirtualNetworkSubnetConfig `
    -Name "snet-workloads" `
    -AddressPrefix "10.0.1.0/24"

$snetPe = New-AzVirtualNetworkSubnetConfig `
    -Name "snet-pe" `
    -AddressPrefix "10.0.2.0/24"

# Create VNet
New-AzVirtualNetwork `
    -ResourceGroupName "rg-pe-lab" `
    -Name "vnet-medsecure" `
    -Location "eastus2" `
    -AddressPrefix "10.0.0.0/16" `
    -Subnet $snetWorkloads, $snetPe
```

---

## Tarefa 2: Criar a conta de armazenamento

### Azure CLI

```bash
# Create storage account (must be globally unique name)
az storage account create \
    --resource-group rg-pe-lab \
    --name stmedsecurelab01 \
    --location eastus2 \
    --sku Standard_LRS \
    --kind StorageV2
```

### Azure PowerShell

```powershell
# Create storage account
$storageAccount = New-AzStorageAccount `
    -ResourceGroupName "rg-pe-lab" `
    -Name "stmedsecurelab01" `
    -Location "eastus2" `
    -SkuName "Standard_LRS" `
    -Kind "StorageV2"
```

---

## Tarefa 3: Criar o ponto de extremidade privado para armazenamento de blobs

### Azure CLI

```bash
# Get the storage account resource ID
STORAGE_ID=$(az storage account show \
    --resource-group rg-pe-lab \
    --name stmedsecurelab01 \
    --query "id" \
    --output tsv)

# Create private endpoint for blob sub-resource
az network private-endpoint create \
    --resource-group rg-pe-lab \
    --name pe-storage-blob \
    --vnet-name vnet-medsecure \
    --subnet snet-pe \
    --private-connection-resource-id $STORAGE_ID \
    --group-id blob \
    --connection-name pec-storage-blob \
    --location eastus2
```

### Azure PowerShell

```powershell
# Get storage account and VNet references
$storageAccount = Get-AzStorageAccount `
    -ResourceGroupName "rg-pe-lab" `
    -Name "stmedsecurelab01"

$vnet = Get-AzVirtualNetwork `
    -ResourceGroupName "rg-pe-lab" `
    -Name "vnet-medsecure"

$subnet = $vnet | Select-Object -ExpandProperty Subnets | `
    Where-Object { $_.Name -eq "snet-pe" }

# Create private link service connection
$plsConnection = New-AzPrivateLinkServiceConnection `
    -Name "pec-storage-blob" `
    -PrivateLinkServiceId $storageAccount.Id `
    -GroupId "blob"

# Create private endpoint
New-AzPrivateEndpoint `
    -ResourceGroupName "rg-pe-lab" `
    -Name "pe-storage-blob" `
    -Location "eastus2" `
    -Subnet $subnet `
    -PrivateLinkServiceConnection $plsConnection
```

### Portal

1. Pesquise **Private endpoints** e selecione **Create**
2. Em **Basics**: selecione o grupo de recursos `rg-pe-lab`, nomeie como `pe-storage-blob`, região `East US 2`
3. Em **Resource**: tipo de recurso `Microsoft.Storage/storageAccounts`, selecione sua conta de armazenamento, sub-recurso de destino `blob`
4. Em **Virtual Network**: selecione `vnet-medsecure`, sub-rede `snet-pe`
5. Em **DNS**: configure na próxima tarefa
6. Selecione **Review + create** e depois **Create**

:::note Estados de conexão

Ao criar um PE para um recurso em sua própria assinatura, a conexão é aprovada automaticamente (estado: Approved). Ao conectar-se a um recurso em outra assinatura ou a um Private Link Service, o estado inicia como Pending até que o proprietário do recurso o aprove.

:::

---

## Tarefa 4: Configurar zona DNS privada e vincular à VNet

### Azure CLI

```bash
# Create the privatelink DNS zone for blob storage
az network private-dns zone create \
    --resource-group rg-pe-lab \
    --name "privatelink.blob.core.windows.net"

# Link the DNS zone to the VNet
az network private-dns link vnet create \
    --resource-group rg-pe-lab \
    --zone-name "privatelink.blob.core.windows.net" \
    --name link-vnet-medsecure \
    --virtual-network vnet-medsecure \
    --registration-enabled false

# Create DNS zone group to auto-manage A records
az network private-endpoint dns-zone-group create \
    --resource-group rg-pe-lab \
    --endpoint-name pe-storage-blob \
    --name zone-group-blob \
    --private-dns-zone "privatelink.blob.core.windows.net" \
    --zone-name blob
```

### Azure PowerShell

```powershell
# Create private DNS zone
$dnsZone = New-AzPrivateDnsZone `
    -ResourceGroupName "rg-pe-lab" `
    -Name "privatelink.blob.core.windows.net"

# Link DNS zone to VNet
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-pe-lab" -Name "vnet-medsecure"

New-AzPrivateDnsVirtualNetworkLink `
    -ResourceGroupName "rg-pe-lab" `
    -ZoneName "privatelink.blob.core.windows.net" `
    -Name "link-vnet-medsecure" `
    -VirtualNetworkId $vnet.Id `
    -EnableRegistration $false

# Create DNS zone group for automatic record management
$dnsZoneConfig = New-AzPrivateDnsZoneConfig `
    -Name "blob" `
    -PrivateDnsZoneId $dnsZone.ResourceId

New-AzPrivateDnsZoneGroup `
    -ResourceGroupName "rg-pe-lab" `
    -PrivateEndpointName "pe-storage-blob" `
    -Name "zone-group-blob" `
    -PrivateDnsZoneConfig $dnsZoneConfig
```

:::tip Por que registration-enabled é false

O parâmetro `--registration-enabled false` significa que VMs na VNet vinculada NÃO registrarão automaticamente seus próprios registros DNS nesta zona. Isso é correto para zonas privatelink — você deseja apenas os registros A do ponto de extremidade privado aqui, não os nomes de host das VMs. Defina registration como true apenas em zonas destinadas ao registro automático de VMs (ex.: `contoso.internal`).

:::

---

## Tarefa 5: Verificar resolução DNS

### Azure CLI

```bash
# Check the private endpoint's private IP
az network private-endpoint show \
    --resource-group rg-pe-lab \
    --name pe-storage-blob \
    --query "customDnsConfigs[0].ipAddresses[0]" \
    --output tsv

# List DNS records in the private zone
az network private-dns record-set a list \
    --resource-group rg-pe-lab \
    --zone-name "privatelink.blob.core.windows.net" \
    --output table
```

### A partir de uma VM dentro da VNet

```bash
# Run nslookup from a VM connected to vnet-medsecure
nslookup stmedsecurelab01.blob.core.windows.net

# Expected output (private IP resolution):
# Server:  UnKnown
# Address:  168.63.129.16
#
# Non-authoritative answer:
# Name:    stmedsecurelab01.privatelink.blob.core.windows.net
# Address:  10.0.2.4
# Aliases:  stmedsecurelab01.blob.core.windows.net
```

---

## Tarefa 6: Habilitar políticas de rede na sub-rede de PE

Por padrão, políticas de rede (NSGs e UDRs) estão desabilitadas em sub-redes que contêm pontos de extremidade privados. Para aplicar regras de NSG ao tráfego de/para seu ponto de extremidade privado, você deve habilitar explicitamente as políticas de rede.

### Azure CLI

```bash
# Enable network policies on the PE subnet
# NOTE: --disable-private-endpoint-network-policies false means policies ARE ENABLED
# This is a confusing double-negative in the CLI parameter name
az network vnet subnet update \
    --resource-group rg-pe-lab \
    --vnet-name vnet-medsecure \
    --name snet-pe \
    --disable-private-endpoint-network-policies false
```

### Azure PowerShell

```powershell
# Enable network policies on the PE subnet
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-pe-lab" -Name "vnet-medsecure"

# PrivateEndpointNetworkPoliciesFlag values:
# "Enabled" = NSGs and UDRs apply to private endpoints
# "Disabled" = NSGs and UDRs are bypassed (default)
Set-AzVirtualNetworkSubnetConfig `
    -Name "snet-pe" `
    -VirtualNetwork $vnet `
    -AddressPrefix "10.0.2.0/24" `
    -PrivateEndpointNetworkPoliciesFlag "Enabled"

$vnet | Set-AzVirtualNetwork
```

:::warning Dupla negação na CLI

O parâmetro da Azure CLI `--disable-private-endpoint-network-policies` usa uma dupla negação:
- `--disable-private-endpoint-network-policies true` = políticas estão DESABILITADAS (padrão, NSGs NÃO se aplicam)
- `--disable-private-endpoint-network-policies false` = políticas estão HABILITADAS (NSGs SE aplicam)

O equivalente em PowerShell é mais claro: `-PrivateEndpointNetworkPoliciesFlag "Enabled"` ou `"Disabled"`.

:::

### Criar uma regra NSG para a sub-rede de PE

```bash
# Create NSG
az network nsg create \
    --resource-group rg-pe-lab \
    --name nsg-snet-pe

# Allow HTTPS from workload subnet to PE subnet
az network nsg rule create \
    --resource-group rg-pe-lab \
    --nsg-name nsg-snet-pe \
    --name Allow-HTTPS-From-Workloads \
    --priority 100 \
    --direction Inbound \
    --source-address-prefixes 10.0.1.0/24 \
    --destination-address-prefixes 10.0.2.0/24 \
    --destination-port-ranges 443 \
    --protocol Tcp \
    --access Allow

# Deny all other inbound
az network nsg rule create \
    --resource-group rg-pe-lab \
    --nsg-name nsg-snet-pe \
    --name Deny-All-Inbound \
    --priority 4096 \
    --direction Inbound \
    --source-address-prefixes "*" \
    --destination-address-prefixes "*" \
    --destination-port-ranges "*" \
    --protocol "*" \
    --access Deny

# Associate NSG with PE subnet
az network vnet subnet update \
    --resource-group rg-pe-lab \
    --vnet-name vnet-medsecure \
    --name snet-pe \
    --network-security-group nsg-snet-pe
```

---

## Cenários de quebra e correção

### Cenário 1: DNS não resolve para o IP privado

**Sintoma:** `nslookup stmedsecurelab01.blob.core.windows.net` retorna o endereço IP público em vez de 10.0.2.4.

**Diagnóstico:**

```bash
# Check if the DNS zone exists
az network private-dns zone show \
    --resource-group rg-pe-lab \
    --name "privatelink.blob.core.windows.net" \
    --query "name" \
    --output tsv

# Check if the VNet link exists
az network private-dns link vnet list \
    --resource-group rg-pe-lab \
    --zone-name "privatelink.blob.core.windows.net" \
    --output table
```

**Causa raiz:** A zona DNS privada não está vinculada à VNet onde a VM cliente reside.

**Correção:**

```bash
az network private-dns link vnet create \
    --resource-group rg-pe-lab \
    --zone-name "privatelink.blob.core.windows.net" \
    --name link-vnet-medsecure \
    --virtual-network vnet-medsecure \
    --registration-enabled false
```

---

### Cenário 2: NSG bloqueando tráfego para o ponto de extremidade privado

**Sintoma:** A aplicação em snet-workloads não consegue conectar-se ao armazenamento via PE, mas o DNS resolve corretamente para o IP privado.

**Diagnóstico:**

```bash
# Check if network policies are enabled on the PE subnet
az network vnet subnet show \
    --resource-group rg-pe-lab \
    --vnet-name vnet-medsecure \
    --name snet-pe \
    --query "privateEndpointNetworkPolicies" \
    --output tsv
```

**Causa raiz:** Políticas de rede foram habilitadas na sub-rede e um NSG foi associado, mas o NSG não possui uma regra Allow para o tráfego necessário. Quando as políticas estão habilitadas, todas as regras padrão de NSG se aplicam ao tráfego do PE.

**Correção:** Adicione uma regra Allow para a porta 443 a partir da sub-rede de origem, ou desabilite as políticas de rede se a aplicação de NSG não for necessária:

```bash
# Option A: Disable network policies (NSG rules will not apply to PE)
az network vnet subnet update \
    --resource-group rg-pe-lab \
    --vnet-name vnet-medsecure \
    --name snet-pe \
    --disable-private-endpoint-network-policies true

# Option B: Add allow rule (if policies should remain enabled)
az network nsg rule create \
    --resource-group rg-pe-lab \
    --nsg-name nsg-snet-pe \
    --name Allow-Storage-HTTPS \
    --priority 100 \
    --direction Inbound \
    --source-address-prefixes 10.0.1.0/24 \
    --destination-address-prefixes 10.0.2.0/24 \
    --destination-port-ranges 443 \
    --protocol Tcp \
    --access Allow
```

---

### Cenário 3: Ponto de extremidade privado travado no estado Pending

**Sintoma:** A conexão do ponto de extremidade privado mostra o estado `Pending` e o tráfego não flui.

**Diagnóstico:**

```bash
# Check connection state
az network private-endpoint show \
    --resource-group rg-pe-lab \
    --name pe-storage-blob \
    --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status" \
    --output tsv
```

**Causa raiz:** O PE foi criado com `--manual-request true` ou o recurso de destino está em uma assinatura diferente, exigindo aprovação manual do proprietário do recurso.

**Correção:**

```bash
# Approve the pending connection (run from the storage account owner's context)
az network private-endpoint-connection approve \
    --resource-group rg-pe-lab \
    --name <connection-name> \
    --resource-name stmedsecurelab01 \
    --type Microsoft.Storage/storageAccounts \
    --description "Approved for MedSecure VNet access"
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-34-q1",
    question: "A VM inside a VNet resolves stmedsecure.blob.core.windows.net to a public IP despite a private endpoint existing. What is the most likely cause?",
    options: [
      "The private DNS zone privatelink.blob.core.windows.net is not linked to the VM's VNet ✅",
      "The private endpoint is using the wrong group-id",
      "The storage account firewall is blocking the VM's IP",
      "The private endpoint subnet does not have a route table"
    ],
    correctIndex: 0,
    explanation: "DNS resolution to a private IP requires the privatelink DNS zone to be linked to the VNet where the client resides. Without the link, Azure DNS cannot find the A record and the resolution falls through to the public IP via the CNAME chain."
  },
  {
    id: "az700-34-q2",
    question: "What does the Azure CLI parameter --disable-private-endpoint-network-policies false accomplish?",
    options: [
      "It ENABLES network policies (NSGs/UDRs) on the private endpoint subnet ✅",
      "It DISABLES network policies on the private endpoint subnet",
      "It removes the private endpoint from the subnet",
      "It prevents new private endpoints from being created in the subnet"
    ],
    correctIndex: 0,
    explanation: "The parameter name is a double negative. Setting --disable-private-endpoint-network-policies to false means 'do NOT disable policies', which enables them. When enabled, NSG rules and UDRs apply to traffic destined to private endpoints in that subnet."
  },
  {
    id: "az700-34-q3",
    question: "A private endpoint connection to a storage account in another subscription shows state 'Pending'. What must happen for traffic to flow?",
    options: [
      "The consumer must upgrade their subscription tier",
      "The resource owner must approve the private endpoint connection ✅",
      "The private endpoint must be recreated with --manual-request false",
      "A VPN connection must be established between subscriptions"
    ],
    correctIndex: 1,
    explanation: "When a private endpoint targets a resource in another subscription, the connection enters a Pending state. The owner of the target resource must explicitly approve the connection before it transitions to Approved and traffic can flow."
  },
  {
    id: "az700-34-q4",
    question: "Which group-id value is used when creating a private endpoint for Azure Storage blob access?",
    options: [
      "storage",
      "blobStorage",
      "blob ✅",
      "Microsoft.Storage/blobServices"
    ],
    correctIndex: 2,
    explanation: "The group-id (sub-resource) for Azure Storage blob is simply 'blob'. Other storage sub-resources are 'file', 'table', 'queue', 'web', and 'dfs'. These values identify which specific service endpoint of the storage account the private endpoint connects to."
  },
  {
    id: "az700-34-q5",
    question: "What is the purpose of a DNS zone group on a private endpoint?",
    options: [
      "It routes traffic from the private endpoint to the DNS server",
      "It automatically creates and manages A records in the linked private DNS zone when the PE is created or deleted ✅",
      "It encrypts DNS queries between the PE and the DNS zone",
      "It enables conditional DNS forwarding for the PE subnet"
    ],
    correctIndex: 1,
    explanation: "A DNS zone group creates a strong association between the private endpoint and a private DNS zone. It automatically manages the lifecycle of A records -- creating them when the PE is provisioned and removing them when the PE is deleted. This eliminates the need for manual DNS record management."
  },
  {
    id: "az700-34-q6",
    question: "In the DNS resolution chain for a private endpoint, what does public DNS return for stmedsecure.blob.core.windows.net?",
    options: [
      "The private IP address of the endpoint directly",
      "A CNAME record pointing to stmedsecure.privatelink.blob.core.windows.net ✅",
      "An error indicating the record does not exist",
      "The public IP address of the storage account"
    ],
    correctIndex: 1,
    explanation: "Public DNS always returns a CNAME to the privatelink subdomain (stmedsecure.privatelink.blob.core.windows.net). It is then the private DNS zone (if linked to the VNet) that resolves this CNAME to the private IP. If no private zone is linked, the CNAME resolves back to the public IP through the normal public resolution path."
  }
]} />

---

## Limpeza

Remova todos os recursos criados neste desafio para interromper a cobrança:

```bash
az group delete --name rg-pe-lab --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-pe-lab" -Force -AsJob
```

:::danger Aviso de custo

Private Endpoints geram cobranças de aproximadamente $0,01/hora por endpoint. Embora seja mínimo, certifique-se de fazer a limpeza após concluir o laboratório para evitar custos desnecessários. A conta de armazenamento também gera cobranças pelos dados armazenados.

:::

---

## Referências adicionais

- [What is a private endpoint?](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview)
- [Azure Private Endpoint DNS configuration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- [Create a private endpoint - Azure CLI](https://learn.microsoft.com/en-us/azure/private-link/create-private-endpoint-cli)
- [Manage network policies for private endpoints](https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy)
- [Private endpoint DNS integration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration)
