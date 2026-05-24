---
sidebar_position: 4
title: "Desafio 37: Private Link com Clientes On-Premises"
sidebar_label: "Challenge 37"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 37: Private Link com clientes locais

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,20/h** (DNS Private Resolver) | **Peso no exame: 10-15%**

:::

## Cenário

A Contoso Ltd opera um ambiente híbrido com um datacenter local conectado ao Azure por meio de uma VPN site a site. A empresa implantou Private Endpoints para o Azure Storage e o Azure SQL Database. No entanto, os clientes locais não conseguem resolver os FQDNs dos Private Endpoints para endereços IP privados -- eles ainda resolvem para IPs públicos porque os servidores DNS locais não têm conhecimento das zonas do Azure Private DNS.

Sua tarefa é implantar o Azure DNS Private Resolver para habilitar a resolução DNS bidirecional entre o ambiente local e o Azure. Os clientes locais devem resolver nomes de Private Endpoints do Azure para IPs privados (por meio do ponto de extremidade de entrada), e as cargas de trabalho do Azure devem resolver nomes de domínio locais (por meio do ponto de extremidade de saída com regras de encaminhamento).

### Visão geral da arquitetura

```text
On-Premises DNS Server
    |
    | Conditional forwarder: privatelink.blob.core.windows.net -> Inbound Endpoint IP
    |
[VPN Gateway] <---> [Azure VNet]
                        |
                  [DNS Private Resolver]
                   /              \
        Inbound Endpoint    Outbound Endpoint
        (snet-inbound)      (snet-outbound)
              |                    |
    Receives queries        Forwarding Ruleset
    from on-prem            -> on-prem DNS for
                               contoso.local
```

### Conceitos-chave

- **Ponto de extremidade de entrada**: Recebe consultas DNS do ambiente local (ou de outras VNets) e as resolve usando o Azure DNS (incluindo zonas do Private DNS vinculadas Ã  VNet).
- **Ponto de extremidade de saída**: Envia consultas DNS do Azure para servidores DNS externos (como DNS local) com base em regras de encaminhamento.
- **Conjunto de regras de encaminhamento**: Uma coleção de regras que mapeia nomes de domínio para servidores DNS de destino para encaminhamento condicional.
- **Delegação de sub-rede**: Ambos os pontos de extremidade de entrada e saída requerem sub-redes dedicadas delegadas a `Microsoft.Network/dnsResolvers`. O tamanho mínimo é /28.

---

## Tarefa 1: Implantar a VNet do hub com sub-redes dedicadas

### Azure CLI

```bash
# Variables
RG="rg-challenge37"
LOCATION="eastus"
VNET_NAME="vnet-hub"
VNET_PREFIX="10.0.0.0/16"
SNET_INBOUND="snet-inbound"
SNET_OUTBOUND="snet-outbound"
SNET_WORKLOAD="snet-workload"

# Create resource group
az group create --name $RG --location $LOCATION

# Create the hub VNet
az network vnet create \
  --resource-group $RG \
  --name $VNET_NAME \
  --location $LOCATION \
  --address-prefixes $VNET_PREFIX

# Create inbound endpoint subnet with delegation (minimum /28)
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SNET_INBOUND \
  --address-prefixes "10.0.0.0/28" \
  --delegations "Microsoft.Network/dnsResolvers"

# Create outbound endpoint subnet with delegation (minimum /28)
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SNET_OUTBOUND \
  --address-prefixes "10.0.0.16/28" \
  --delegations "Microsoft.Network/dnsResolvers"

# Create a workload subnet for test VMs
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SNET_WORKLOAD \
  --address-prefixes "10.0.1.0/24"
```

### Azure PowerShell

```powershell
# Variables
$rg = "rg-challenge37"
$location = "eastus"
$vnetName = "vnet-hub"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Create VNet with subnets (inbound and outbound require delegation)
$inboundSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-inbound" `
  -AddressPrefix "10.0.0.0/28" `
  -Delegation (New-AzDelegation -Name "dns-resolver-delegation" -ServiceName "Microsoft.Network/dnsResolvers")

$outboundSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-outbound" `
  -AddressPrefix "10.0.0.16/28" `
  -Delegation (New-AzDelegation -Name "dns-resolver-delegation" -ServiceName "Microsoft.Network/dnsResolvers")

$workloadSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-workload" `
  -AddressPrefix "10.0.1.0/24"

New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name $vnetName `
  -Location $location `
  -AddressPrefix "10.0.0.0/16" `
  -Subnet @($inboundSubnet, $outboundSubnet, $workloadSubnet)
```

### Portal

1. Navegue até **Virtual networks** e selecione **+ Create**.
2. Defina o grupo de recursos como `rg-challenge37`, o nome como `vnet-hub` e a região como **East US**.
3. Em **IP addresses**, adicione o espaço de endereço `10.0.0.0/16`.
4. Adicione a sub-rede `snet-inbound` com o prefixo `10.0.0.0/28`. Em **Subnet delegation**, selecione `Microsoft.Network/dnsResolvers`.
5. Adicione a sub-rede `snet-outbound` com o prefixo `10.0.0.16/28`. Em **Subnet delegation**, selecione `Microsoft.Network/dnsResolvers`.
6. Adicione a sub-rede `snet-workload` com o prefixo `10.0.1.0/24` (sem delegação).
7. Selecione **Review + create** e, em seguida, **Create**.

---

## Tarefa 2: Implantar o Azure DNS Private Resolver

### Azure CLI

```bash
RESOLVER_NAME="dnspr-contoso"

# Create the DNS Private Resolver
az dns-resolver create \
  --name $RESOLVER_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --id "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/virtualNetworks/$VNET_NAME"

# Create the inbound endpoint
az dns-resolver inbound-endpoint create \
  --name "inbound-ep" \
  --dns-resolver-name $RESOLVER_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --ip-configurations "[{\"private-ip-allocation-method\":\"Dynamic\",\"id\":\"/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/virtualNetworks/$VNET_NAME/subnets/$SNET_INBOUND\"}]"

# Retrieve the inbound endpoint IP (this is what on-prem DNS will forward to)
az dns-resolver inbound-endpoint show \
  --name "inbound-ep" \
  --dns-resolver-name $RESOLVER_NAME \
  --resource-group $RG \
  --query "ipConfigurations[0].privateIpAddress" -o tsv

# Create the outbound endpoint
az dns-resolver outbound-endpoint create \
  --name "outbound-ep" \
  --dns-resolver-name $RESOLVER_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --id "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/virtualNetworks/$VNET_NAME/subnets/$SNET_OUTBOUND"
```

### Azure PowerShell

```powershell
$resolverName = "dnspr-contoso"
$subscriptionId = (Get-AzContext).Subscription.Id
$vnetId = "/subscriptions/$subscriptionId/resourceGroups/$rg/providers/Microsoft.Network/virtualNetworks/$vnetName"

# Create DNS Private Resolver
New-AzDnsResolver `
  -Name $resolverName `
  -ResourceGroupName $rg `
  -Location $location `
  -VirtualNetworkId $vnetId

# Create inbound endpoint
$inboundSubnetId = "$vnetId/subnets/snet-inbound"
$ipConfig = New-AzDnsResolverIPConfigurationObject `
  -PrivateIPAllocationMethod "Dynamic" `
  -SubnetId $inboundSubnetId

New-AzDnsResolverInboundEndpoint `
  -DnsResolverName $resolverName `
  -Name "inbound-ep" `
  -ResourceGroupName $rg `
  -Location $location `
  -IPConfiguration $ipConfig

# Get inbound endpoint IP
$inboundEp = Get-AzDnsResolverInboundEndpoint `
  -Name "inbound-ep" `
  -DnsResolverName $resolverName `
  -ResourceGroupName $rg
$inboundIp = $inboundEp.IPConfiguration[0].PrivateIPAddress
Write-Output "Inbound endpoint IP: $inboundIp"

# Create outbound endpoint
$outboundSubnetId = "$vnetId/subnets/snet-outbound"
New-AzDnsResolverOutboundEndpoint `
  -DnsResolverName $resolverName `
  -Name "outbound-ep" `
  -ResourceGroupName $rg `
  -Location $location `
  -SubnetId $outboundSubnetId
```

### Portal

1. Pesquise por **DNS Private Resolvers** e selecione **+ Create**.
2. Defina o grupo de recursos, o nome como `dnspr-contoso` e a região como **East US**.
3. Selecione a VNet `vnet-hub`.
4. Em **Inbound Endpoints**, adicione um com o nome `inbound-ep` e selecione a sub-rede `snet-inbound`.
5. Em **Outbound Endpoints**, adicione um com o nome `outbound-ep` e selecione a sub-rede `snet-outbound`.
6. Selecione **Review + create** e, em seguida, **Create**.
7. Após a implantação, anote o **IP do ponto de extremidade de entrada** na visão geral do recurso.

---

## Tarefa 3: Criar um conjunto de regras de encaminhamento DNS (Azure para ambiente local)

O ponto de extremidade de saída permite que VMs do Azure resolvam domínios locais encaminhando consultas para servidores DNS locais.

### Azure CLI

```bash
RULESET_NAME="fwrs-contoso"
ONPREM_DNS_IP="192.168.1.10"

# Create the forwarding ruleset linked to the outbound endpoint
az dns-resolver forwarding-ruleset create \
  --name $RULESET_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --outbound-endpoints "[{\"id\":\"/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/dnsResolvers/$RESOLVER_NAME/outboundEndpoints/outbound-ep\"}]"

# Create a forwarding rule for on-premises domain
az dns-resolver forwarding-rule create \
  --name "contoso-local" \
  --ruleset-name $RULESET_NAME \
  --resource-group $RG \
  --domain-name "contoso.local." \
  --forwarding-rule-state "Enabled" \
  --target-dns-servers "[{\"ip-address\":\"$ONPREM_DNS_IP\",\"port\":53}]"

# Link the forwarding ruleset to the hub VNet
az dns-resolver vnet-link create \
  --name "link-hub-vnet" \
  --ruleset-name $RULESET_NAME \
  --resource-group $RG \
  --id "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/virtualNetworks/$VNET_NAME"
```

### Azure PowerShell

```powershell
$rulesetName = "fwrs-contoso"
$onpremDnsIp = "192.168.1.10"
$outboundEpId = "/subscriptions/$subscriptionId/resourceGroups/$rg/providers/Microsoft.Network/dnsResolvers/$resolverName/outboundEndpoints/outbound-ep"

# Create forwarding ruleset
$outboundEpRef = @{ Id = $outboundEpId }
New-AzDnsForwardingRuleset `
  -Name $rulesetName `
  -ResourceGroupName $rg `
  -Location $location `
  -DnsResolverOutboundEndpoint @($outboundEpRef)

# Create forwarding rule for on-premises domain
$targetDns = New-AzDnsResolverTargetDnsServerObject -IPAddress $onpremDnsIp -Port 53
New-AzDnsForwardingRulesetForwardingRule `
  -ResourceGroupName $rg `
  -DnsForwardingRulesetName $rulesetName `
  -Name "contoso-local" `
  -DomainName "contoso.local." `
  -ForwardingRuleState "Enabled" `
  -TargetDnsServer @($targetDns)

# Link ruleset to VNet
New-AzDnsForwardingRulesetVirtualNetworkLink `
  -DnsForwardingRulesetName $rulesetName `
  -ResourceGroupName $rg `
  -Name "link-hub-vnet" `
  -VirtualNetworkId $vnetId
```

### Portal

1. No recurso DNS Private Resolver, navegue até **Forwarding Rulesets** ou pesquise por **DNS forwarding rulesets**.
2. Selecione **+ Create**, defina o nome como `fwrs-contoso`, selecione a região e escolha o ponto de extremidade de saída `outbound-ep`.
3. Adicione uma **Forwarding Rule**:
   - Nome da regra: `contoso-local`
   - Nome do domínio: `contoso.local.` (ponto final obrigatório)
   - Servidores DNS de destino: `192.168.1.10:53`
   - Estado: Enabled
4. Em **Virtual Network Links**, adicione um link para `vnet-hub`.
5. Selecione **Review + create** e, em seguida, **Create**.

---

## Tarefa 4: Configurar o encaminhador condicional DNS local

No servidor DNS Windows local, configure encaminhadores condicionais para que as consultas para zonas do Azure Private DNS sejam encaminhadas para o IP do ponto de extremidade de entrada do Private Resolver.

### PowerShell (no servidor DNS Windows)

```powershell
# Get the inbound endpoint IP from Task 2 (e.g., 10.0.0.4)
$inboundEndpointIp = "10.0.0.4"

# Add conditional forwarders for Azure Private DNS zones
Add-DnsServerConditionalForwarderZone `
  -Name "privatelink.blob.core.windows.net" `
  -MasterServers $inboundEndpointIp `
  -ReplicationScope "Forest"

Add-DnsServerConditionalForwarderZone `
  -Name "privatelink.database.windows.net" `
  -MasterServers $inboundEndpointIp `
  -ReplicationScope "Forest"

Add-DnsServerConditionalForwarderZone `
  -Name "privatelink.vaultcore.azure.net" `
  -MasterServers $inboundEndpointIp `
  -ReplicationScope "Forest"

# Verify conditional forwarders
Get-DnsServerZone | Where-Object { $_.ZoneType -eq "Forwarder" }
```

:::tip Importante
O ponto final nos nomes de domínio é implícito no DNS Manager do Windows, mas obrigatório em alguns contextos. Ao adicionar encaminhadores condicionais na GUI do DNS Manager, não inclua o ponto final. Nas regras de encaminhamento do DNS Private Resolver, sempre inclua o ponto final (por exemplo, `contoso.local.`).
:::

---

## Tarefa 5: Validar a resolução DNS de ponta a ponta

### A partir de um cliente local (simulado com uma VM)

```bash
# Verify that Private Endpoint FQDN resolves to private IP
nslookup contosostorage.blob.core.windows.net
# Expected: resolves to 10.0.x.x (private IP from PE)

# Verify the resolution chain
nslookup contosostorage.privatelink.blob.core.windows.net
# Expected: same private IP
```

### A partir de uma VM do Azure (verificar encaminhamento de saída)

```bash
# Verify that on-premises domain resolves via outbound endpoint
nslookup dc01.contoso.local
# Expected: resolves to 192.168.1.x (on-prem IP)

# Verify Azure Private DNS still works
nslookup contosostorage.blob.core.windows.net
# Expected: resolves to private IP
```

---

## Cenários de quebra e correção

### Cenário 1: DNS local não encaminha corretamente

**Sintoma**: Clientes locais resolvem `storageaccount.blob.core.windows.net` para um IP público em vez do IP privado do Private Endpoint.

**Causa raiz**: O encaminhador condicional no servidor DNS local está apontando para o endereço IP incorreto (por exemplo, o IP do ponto de extremidade de saída em vez do IP do ponto de extremidade de entrada).

**Correção**:

```powershell
# Check current conditional forwarder configuration
Get-DnsServerZone -Name "privatelink.blob.core.windows.net"

# Remove incorrect forwarder
Remove-DnsServerZone -Name "privatelink.blob.core.windows.net" -Force

# Add correct forwarder pointing to INBOUND endpoint IP
Add-DnsServerConditionalForwarderZone `
  -Name "privatelink.blob.core.windows.net" `
  -MasterServers "10.0.0.4"
```

**Insight principal**: O ponto de extremidade de entrada recebe consultas de fora do Azure (ambiente local). O ponto de extremidade de saída envia consultas do Azure para servidores externos. Confundir esses dois é a configuração incorreta mais comum.

---

### Cenário 2: Ponto de extremidade de entrada do Private Resolver na sub-rede errada

**Sintoma**: A implantação do ponto de extremidade de entrada falha com um erro sobre delegação de sub-rede.

**Causa raiz**: O ponto de extremidade de entrada foi colocado em uma sub-rede que não possui a delegação `Microsoft.Network/dnsResolvers` ou é compartilhada com outros recursos.

**Correção**:

```bash
# Verify subnet delegation
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SNET_INBOUND \
  --query "delegations[].serviceName" -o tsv

# If delegation is missing, update the subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SNET_INBOUND \
  --delegations "Microsoft.Network/dnsResolvers"
```

**Insight principal**: As sub-redes do DNS Resolver devem ser dedicadas -- nenhum outro recurso pode ser implantado nelas. Cada sub-rede deve ter no mínimo /28 (16 endereços).

---

### Cenário 3: Conjunto de regras de encaminhamento DNS sem servidor DNS de destino

**Sintoma**: VMs do Azure não conseguem resolver nomes de host locais (por exemplo, `dc01.contoso.local` retorna NXDOMAIN).

**Causa raiz**: O conjunto de regras de encaminhamento não possui uma regra para o domínio local ou a regra tem um IP de servidor DNS de destino incorreto ou ausente.

**Correção**:

```bash
# List existing forwarding rules
az dns-resolver forwarding-rule list \
  --ruleset-name $RULESET_NAME \
  --resource-group $RG \
  --query "[].{name:name, domain:domainName, servers:targetDnsServers}" -o table

# If the rule is missing, create it
az dns-resolver forwarding-rule create \
  --name "contoso-local" \
  --ruleset-name $RULESET_NAME \
  --resource-group $RG \
  --domain-name "contoso.local." \
  --forwarding-rule-state "Enabled" \
  --target-dns-servers "[{\"ip-address\":\"192.168.1.10\",\"port\":53}]"

# Verify the VNet link exists (ruleset must be linked to the VNet)
az dns-resolver vnet-link list \
  --ruleset-name $RULESET_NAME \
  --resource-group $RG
```

**Insight principal**: Um conjunto de regras de encaminhamento afeta apenas as VNets vinculadas a ele. Se o link da VNet estiver ausente, as VMs do Azure nessa VNet não usarão as regras de encaminhamento.

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-37-q1",
    question: "Qual é a finalidade do ponto de extremidade de entrada (inbound endpoint) do Azure DNS Private Resolver?",
    options: [
      "Envia consultas DNS do Azure para servidores DNS locais",
      "Recebe consultas DNS do ambiente local ou VNets emparelhadas e as resolve usando o Azure DNS ✅",
      "Bloqueia consultas DNS de alcançarem zonas de Azure Private DNS",
      "Fornece resolução DNS pública para recursos do Azure"
    ],
    correctIndex: 1,
    explanation: "O ponto de extremidade de entrada recebe consultas DNS de fora do Azure (redes locais, VNets emparelhadas) e as resolve usando o Azure DNS, incluindo zonas de Private DNS vinculadas à VNet do resolver."
  },
  {
    id: "az700-37-q2",
    question: "Qual é o tamanho mínimo de sub-rede necessário para um endpoint do DNS Private Resolver?",
    options: [
      "/30 (4 endereços)",
      "/29 (8 endereços)",
      "/28 (16 endereços) ✅",
      "/27 (32 endereços)"
    ],
    correctIndex: 2,
    explanation: "Ambas as sub-redes de endpoints de entrada e saída requerem no mínimo /28 (16 endereços IP). As sub-redes devem ser delegadas a Microsoft.Network/dnsResolvers e não podem conter outros recursos."
  },
  {
    id: "az700-37-q3",
    question: "Qual delegação deve ser aplicada às sub-redes usadas pelos endpoints do DNS Private Resolver?",
    options: [
      "Microsoft.Network/virtualNetworks",
      "Microsoft.Network/dnsResolvers ✅",
      "Microsoft.Network/privateDnsZones",
      "Microsoft.Network/dnsForwardingRulesets"
    ],
    correctIndex: 1,
    explanation: "As sub-redes para ambos os endpoints de entrada e saída devem ser delegadas a Microsoft.Network/dnsResolvers. Isso garante que a sub-rede seja usada exclusivamente pelo serviço DNS Private Resolver."
  },
  {
    id: "az700-37-q4",
    question: "Em um cenário híbrido, para onde o encaminhador condicional do servidor DNS local deve apontar para resolver nomes de Private Endpoint do Azure?",
    options: [
      "Os servidores DNS públicos do Azure (168.63.129.16)",
      "O IP do ponto de extremidade de saída do Private Resolver",
      "O IP do ponto de extremidade de entrada do Private Resolver ✅",
      "O endereço IP da zona de Azure Private DNS"
    ],
    correctIndex: 2,
    explanation: "Os encaminhadores condicionais do DNS local devem apontar para o IP do ponto de extremidade de entrada do Private Resolver. Este IP recebe consultas DNS e as resolve contra o Azure DNS (incluindo zonas de Private DNS vinculadas à VNet do resolver)."
  },
  {
    id: "az700-37-q5",
    question: "O que acontece se um conjunto de regras de encaminhamento (forwarding ruleset) for criado, mas não vinculado a uma VNet?",
    options: [
      "O conjunto de regras se aplica automaticamente a todas as VNets na assinatura",
      "O conjunto de regras não tem efeito; as VMs na VNet não usarão as regras de encaminhamento ✅",
      "O conjunto de regras se aplica apenas à VNet onde o resolver está implantado",
      "A resolução DNS falha completamente para todas as VMs do Azure"
    ],
    correctIndex: 1,
    explanation: "Um conjunto de regras de encaminhamento deve ser explicitamente vinculado a cada VNet onde deve ser aplicado. Sem um vínculo de VNet, as regras de encaminhamento não têm efeito e as consultas DNS das VMs nessa VNet não serão encaminhadas."
  },
  {
    id: "az700-37-q6",
    question: "Qual caractere final é necessário no campo domain-name ao criar uma regra de encaminhamento DNS?",
    options: [
      "Um ponto e vírgula (;)",
      "Uma barra (/)",
      "Um ponto final (.) ✅",
      "Nenhum caractere especial é necessário"
    ],
    correctIndex: 2,
    explanation: "O nome de domínio em uma regra de encaminhamento DNS deve terminar com um ponto final (ex.: contoso.local.) para indicar que é um nome de domínio totalmente qualificado. Isso segue as convenções padrão de nomenclatura DNS."
  }
]} />

---

## Limpeza

```bash
# Delete all resources
az group delete --name rg-challenge37 --yes --no-wait
```

```powershell
# PowerShell cleanup
Remove-AzResourceGroup -Name "rg-challenge37" -Force -AsJob
```

:::warning Gerenciamento de custos
O Azure DNS Private Resolver cobra aproximadamente **$0,20/hora** por instância do resolvedor (pontos de extremidade de entrada + saída). Executar por um mês inteiro custa aproximadamente **$146/mês**. Exclua o resolvedor imediatamente após concluir este desafio para evitar cobranças inesperadas.
:::

---

## Resumo

Neste desafio, você implantou o Azure DNS Private Resolver para habilitar a resolução DNS bidirecional em um ambiente híbrido. Você configurou o ponto de extremidade de entrada para receber consultas do ambiente local, o ponto de extremidade de saída com regras de encaminhamento para resolução do Azure para o ambiente local, e validou a cadeia completa de resolução DNS. Compreender essa arquitetura é essencial para o exame AZ-700, pois o Private Resolver é a solução recomendada para DNS híbrido no Azure.
