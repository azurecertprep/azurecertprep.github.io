---
sidebar_position: 1
sidebar_label: "Challenge 25"
title: "Challenge 25: Azure Load Balancer (Standard)"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 25: Azure Load Balancer (Standard)

:::info Tempo e custo estimados
**45-60 minutos** | **~$0.03/h** (Standard LB por hora + regras) | **Peso no exame: 15-20%**
:::

## Cenário

A NorthWind Traders é uma empresa de e-commerce lançando uma nova loja virtual. A arquitetura requer um Standard Load Balancer público para a camada web (duas VMs executando Nginx) e um Standard Load Balancer interno para a camada de dados (duas VMs executando PostgreSQL na porta 5432). A camada web deve suportar persistência de sessão para carrinhos de compras, e os administradores precisam de acesso SSH direto a VMs individuais do back-end para solução de problemas via regras de NAT de entrada.

Sua tarefa é implantar ambos os balanceadores de carga, configurar pools de back-end, investigações de integridade, regras de balanceamento de carga, regras de NAT de entrada para SSH e verificar a conectividade de ponta a ponta.

## Habilidades do exame abordadas

| Habilidade | Peso |
|------------|------|
| Projetar e implementar Azure Load Balancer (Standard SKU) | Alto |
| Configurar pools de back-end (baseado em NIC e baseado em IP) | Alto |
| Configurar investigações de integridade (TCP, HTTP, HTTPS) | Alto |
| Configurar regras de balanceamento de carga | Alto |
| Configurar regras de NAT de entrada | Médio |
| Configurar persistência de sessão (afinidade de IP de origem) | Médio |
| Configurar IP flutuante | Baixo |

## Pré-requisitos

- Assinatura do Azure com função de Colaborador
- Azure CLI 2.60+ ou Azure PowerShell Az 12.0+
- Conhecimento básico de TCP/IP, HTTP e conceitos de NSG

## Tarefa 1: Criar infraestrutura de rede

Configure a VNet, sub-rede, NSG e prepare o ambiente para os balanceadores de carga.

### Azure CLI

```bash
# Set variables
RG="rg-northwind-lb"
LOCATION="eastus2"

# Create resource group
az group create --name $RG --location $LOCATION

# Create VNet and subnets
az network vnet create \
  --resource-group $RG \
  --name vnet-northwind \
  --location $LOCATION \
  --address-prefixes 10.10.0.0/16 \
  --subnet-name snet-web \
  --subnet-prefixes 10.10.1.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-northwind \
  --name snet-data \
  --address-prefixes 10.10.2.0/24

# Create NSG for web tier
az network nsg create \
  --resource-group $RG \
  --name nsg-web

# Allow HTTP and HTTPS inbound
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name AllowHTTP \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 80 443 \
  --source-address-prefixes "*"

# Critical: Allow Azure Load Balancer health probe source IP
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name AllowAzureLoadBalancer \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 80 \
  --source-address-prefixes 168.63.129.16

# Allow SSH for management
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name AllowSSH \
  --priority 120 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 22 \
  --source-address-prefixes "*"

# Associate NSG with web subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-northwind \
  --name snet-web \
  --network-security-group nsg-web
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-northwind-lb"
$location = "eastus2"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Create NSG rules
$ruleHTTP = New-AzNetworkSecurityRuleConfig `
  -Name "AllowHTTP" `
  -Priority 100 `
  -Direction Inbound `
  -Access Allow `
  -Protocol Tcp `
  -DestinationPortRange 80,443 `
  -SourceAddressPrefix "*" `
  -SourcePortRange "*" `
  -DestinationAddressPrefix "*"

$ruleProbe = New-AzNetworkSecurityRuleConfig `
  -Name "AllowAzureLoadBalancer" `
  -Priority 110 `
  -Direction Inbound `
  -Access Allow `
  -Protocol Tcp `
  -DestinationPortRange 80 `
  -SourceAddressPrefix "168.63.129.16" `
  -SourcePortRange "*" `
  -DestinationAddressPrefix "*"

$ruleSSH = New-AzNetworkSecurityRuleConfig `
  -Name "AllowSSH" `
  -Priority 120 `
  -Direction Inbound `
  -Access Allow `
  -Protocol Tcp `
  -DestinationPortRange 22 `
  -SourceAddressPrefix "*" `
  -SourcePortRange "*" `
  -DestinationAddressPrefix "*"

# Create NSG
$nsg = New-AzNetworkSecurityGroup `
  -ResourceGroupName $rg `
  -Location $location `
  -Name "nsg-web" `
  -SecurityRules $ruleHTTP, $ruleProbe, $ruleSSH

# Create VNet with subnets
$snetWeb = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-web" `
  -AddressPrefix "10.10.1.0/24" `
  -NetworkSecurityGroup $nsg

$snetData = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-data" `
  -AddressPrefix "10.10.2.0/24"

New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-northwind" `
  -Location $location `
  -AddressPrefix "10.10.0.0/16" `
  -Subnet $snetWeb, $snetData
```

### Portal

1. Navegue até **Resource groups** > **Create** > nomeie `rg-northwind-lb`, região **East US 2**.
2. Crie uma VNet chamada `vnet-northwind` com espaço de endereço `10.10.0.0/16`.
3. Adicione as sub-redes `snet-web` (10.10.1.0/24) e `snet-data` (10.10.2.0/24).
4. Crie o NSG `nsg-web` com regras de entrada para HTTP (80/443), origem da investigação de integridade (168.63.129.16 na porta 80) e SSH (22).
5. Associe o NSG à sub-rede `snet-web`.

## Tarefa 2: Criar o Standard Load Balancer público

Implante um Standard Load Balancer público para a camada web com um IP público estático com redundância de zona.

### Azure CLI

```bash
# Create a Standard SKU zone-redundant public IP for the LB frontend
az network public-ip create \
  --resource-group $RG \
  --name pip-lb-web \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3

# Create the public Standard Load Balancer with frontend and backend pool
az network lb create \
  --resource-group $RG \
  --name lb-web-public \
  --sku Standard \
  --location $LOCATION \
  --frontend-ip-name fe-web-public \
  --public-ip-address pip-lb-web \
  --backend-pool-name bp-web-nic
```

### Azure PowerShell

```powershell
# Create public IP
$pip = New-AzPublicIpAddress `
  -ResourceGroupName $rg `
  -Name "pip-lb-web" `
  -Location $location `
  -Sku Standard `
  -AllocationMethod Static `
  -Zone 1, 2, 3

# Create frontend IP configuration
$feConfig = New-AzLoadBalancerFrontendIpConfig `
  -Name "fe-web-public" `
  -PublicIpAddress $pip

# Create backend address pool
$bePool = New-AzLoadBalancerBackendAddressPoolConfig `
  -Name "bp-web-nic"

# Create the load balancer
$lb = New-AzLoadBalancer `
  -ResourceGroupName $rg `
  -Name "lb-web-public" `
  -Location $location `
  -Sku Standard `
  -FrontendIpConfiguration $feConfig `
  -BackendAddressPool $bePool
```

### Portal

1. Navegue até **Load balancers** > **Create**.
2. Defina o SKU como **Standard**, Tipo como **Public**, Camada como **Regional**.
3. Crie um novo IP público `pip-lb-web` (Standard, Static, Zone-redundant).
4. Nomeie o frontend `fe-web-public`, pool de back-end `bp-web-nic`.
5. Selecione **Review + create** > **Create**.

## Tarefa 3: Configurar investigações de integridade

Crie investigações de integridade HTTP e TCP. A investigação HTTP verifica o endpoint de integridade da aplicação; a investigação TCP valida a conectividade da porta.

### Azure CLI

```bash
# HTTP health probe for web tier (checks /health endpoint)
az network lb probe create \
  --resource-group $RG \
  --lb-name lb-web-public \
  --name probe-http-web \
  --protocol Http \
  --port 80 \
  --path "/health" \
  --interval 5 \
  --probe-threshold 2

# TCP health probe (alternative for non-HTTP workloads)
az network lb probe create \
  --resource-group $RG \
  --lb-name lb-web-public \
  --name probe-tcp-fallback \
  --protocol Tcp \
  --port 80 \
  --interval 10 \
  --probe-threshold 2
```

### Azure PowerShell

```powershell
# Get the load balancer
$lb = Get-AzLoadBalancer -ResourceGroupName $rg -Name "lb-web-public"

# Add HTTP health probe
$lb | Add-AzLoadBalancerProbeConfig `
  -Name "probe-http-web" `
  -Protocol Http `
  -Port 80 `
  -RequestPath "/health" `
  -IntervalInSeconds 5 `
  -ProbeCount 2

# Add TCP health probe
$lb | Add-AzLoadBalancerProbeConfig `
  -Name "probe-tcp-fallback" `
  -Protocol Tcp `
  -Port 80 `
  -IntervalInSeconds 10 `
  -ProbeCount 2

# Save the configuration
$lb | Set-AzLoadBalancer
```

### Portal

1. Abra `lb-web-public` > **Health probes** > **Add**.
2. Crie `probe-http-web`: Protocolo **HTTP**, Porta **80**, Caminho `/health`, Intervalo **5s**, Limite de não íntegro **2**.
3. Crie `probe-tcp-fallback`: Protocolo **TCP**, Porta **80**, Intervalo **10s**, Limite de não íntegro **2**.

## Tarefa 4: Configurar regras de balanceamento de carga com persistência de sessão

Crie regras de balanceamento de carga que distribuem tráfego HTTP com persistência de sessão por IP de origem para afinidade do carrinho de compras.

### Azure CLI

```bash
# LB rule with session persistence (SourceIP for shopping cart sessions)
az network lb rule create \
  --resource-group $RG \
  --lb-name lb-web-public \
  --name rule-http-web \
  --protocol Tcp \
  --frontend-port 80 \
  --backend-port 80 \
  --frontend-ip-name fe-web-public \
  --backend-pool-name bp-web-nic \
  --probe-name probe-http-web \
  --idle-timeout 15 \
  --load-distribution SourceIP \
  --enable-tcp-reset true

# HTTPS rule with default 5-tuple distribution (stateless API)
az network lb rule create \
  --resource-group $RG \
  --lb-name lb-web-public \
  --name rule-https-web \
  --protocol Tcp \
  --frontend-port 443 \
  --backend-port 443 \
  --frontend-ip-name fe-web-public \
  --backend-pool-name bp-web-nic \
  --probe-name probe-http-web \
  --idle-timeout 4 \
  --load-distribution Default \
  --enable-tcp-reset true
```

### Azure PowerShell

```powershell
$lb = Get-AzLoadBalancer -ResourceGroupName $rg -Name "lb-web-public"
$feConfig = $lb.FrontendIpConfigurations[0]
$bePool = $lb.BackendAddressPools[0]
$probe = $lb.Probes | Where-Object { $_.Name -eq "probe-http-web" }

# Add LB rule with SourceIP session persistence
$lb | Add-AzLoadBalancerRuleConfig `
  -Name "rule-http-web" `
  -Protocol Tcp `
  -FrontendPort 80 `
  -BackendPort 80 `
  -FrontendIpConfiguration $feConfig `
  -BackendAddressPool $bePool `
  -Probe $probe `
  -IdleTimeoutInMinutes 15 `
  -LoadDistribution SourceIP `
  -EnableTcpReset

# Add HTTPS rule with default (5-tuple) distribution
$lb | Add-AzLoadBalancerRuleConfig `
  -Name "rule-https-web" `
  -Protocol Tcp `
  -FrontendPort 443 `
  -BackendPort 443 `
  -FrontendIpConfiguration $feConfig `
  -BackendAddressPool $bePool `
  -Probe $probe `
  -IdleTimeoutInMinutes 4 `
  -LoadDistribution Default `
  -EnableTcpReset

$lb | Set-AzLoadBalancer
```

### Portal

1. Abra `lb-web-public` > **Load balancing rules** > **Add**.
2. Crie `rule-http-web`: Protocolo TCP, Porta frontend 80, Porta backend 80, Pool de back-end `bp-web-nic`, Investigação de integridade `probe-http-web`, Persistência de sessão **Client IP**, Tempo limite de ociosidade 15 min, TCP reset **Habilitado**.
3. Crie `rule-https-web`: Protocolo TCP, portas 443/443, Persistência de sessão **None**, Tempo limite de ociosidade 4 min.

## Tarefa 5: Configurar regras de NAT de entrada para acesso SSH

Crie regras de NAT de entrada para encaminhar portas frontend exclusivas para SSH (porta 22) em VMs individuais do back-end.

### Azure CLI

```bash
# Inbound NAT rule for VM1 (frontend port 2201 -> backend port 22)
az network lb inbound-nat-rule create \
  --resource-group $RG \
  --lb-name lb-web-public \
  --name nat-ssh-vm1 \
  --protocol Tcp \
  --frontend-port 2201 \
  --backend-port 22 \
  --frontend-ip-name fe-web-public

# Inbound NAT rule for VM2 (frontend port 2202 -> backend port 22)
az network lb inbound-nat-rule create \
  --resource-group $RG \
  --lb-name lb-web-public \
  --name nat-ssh-vm2 \
  --protocol Tcp \
  --frontend-port 2202 \
  --backend-port 22 \
  --frontend-ip-name fe-web-public

# Associate NAT rule with VM1 NIC (after VMs are created)
az network nic ip-config inbound-nat-rule add \
  --resource-group $RG \
  --nic-name nic-web-vm1 \
  --ip-config-name ipconfig1 \
  --inbound-nat-rule nat-ssh-vm1 \
  --lb-name lb-web-public

# Associate NAT rule with VM2 NIC
az network nic ip-config inbound-nat-rule add \
  --resource-group $RG \
  --nic-name nic-web-vm2 \
  --ip-config-name ipconfig1 \
  --inbound-nat-rule nat-ssh-vm2 \
  --lb-name lb-web-public
```

### Azure PowerShell

```powershell
$lb = Get-AzLoadBalancer -ResourceGroupName $rg -Name "lb-web-public"
$feConfig = $lb.FrontendIpConfigurations[0]

# Add inbound NAT rules
$lb | Add-AzLoadBalancerInboundNatRuleConfig `
  -Name "nat-ssh-vm1" `
  -Protocol Tcp `
  -FrontendPort 2201 `
  -BackendPort 22 `
  -FrontendIpConfiguration $feConfig

$lb | Add-AzLoadBalancerInboundNatRuleConfig `
  -Name "nat-ssh-vm2" `
  -Protocol Tcp `
  -FrontendPort 2202 `
  -BackendPort 22 `
  -FrontendIpConfiguration $feConfig

$lb | Set-AzLoadBalancer

# Associate with VM1 NIC
$nic1 = Get-AzNetworkInterface -ResourceGroupName $rg -Name "nic-web-vm1"
$lb = Get-AzLoadBalancer -ResourceGroupName $rg -Name "lb-web-public"
$natRule1 = $lb.InboundNatRules | Where-Object { $_.Name -eq "nat-ssh-vm1" }
$nic1.IpConfigurations[0].LoadBalancerInboundNatRules.Add($natRule1)
Set-AzNetworkInterface -NetworkInterface $nic1
```

### Portal

1. Abra `lb-web-public` > **Inbound NAT rules** > **Add**.
2. Crie `nat-ssh-vm1`: Tipo **Azure virtual machine**, VM de destino `vm-web-1`, IP frontend `fe-web-public`, Porta frontend **2201**, Porta backend **22**, Protocolo **TCP**.
3. Crie `nat-ssh-vm2`: Mesmas configurações, mas Porta frontend **2202**, VM de destino `vm-web-2`.

## Tarefa 6: Criar o Standard Load Balancer interno

Implante um balanceador de carga interno para a camada de dados (PostgreSQL) que não é exposto à internet.

### Azure CLI

```bash
# Create internal Standard Load Balancer
az network lb create \
  --resource-group $RG \
  --name lb-data-internal \
  --sku Standard \
  --location $LOCATION \
  --frontend-ip-name fe-data-internal \
  --vnet-name vnet-northwind \
  --subnet snet-data \
  --backend-pool-name bp-data-nic

# TCP health probe for PostgreSQL
az network lb probe create \
  --resource-group $RG \
  --lb-name lb-data-internal \
  --name probe-tcp-postgres \
  --protocol Tcp \
  --port 5432 \
  --interval 10 \
  --probe-threshold 2

# LB rule for PostgreSQL traffic
az network lb rule create \
  --resource-group $RG \
  --lb-name lb-data-internal \
  --name rule-postgres \
  --protocol Tcp \
  --frontend-port 5432 \
  --backend-port 5432 \
  --frontend-ip-name fe-data-internal \
  --backend-pool-name bp-data-nic \
  --probe-name probe-tcp-postgres \
  --idle-timeout 30 \
  --load-distribution Default \
  --enable-tcp-reset true

# LB rule with floating IP enabled (for cluster listener patterns)
az network lb rule create \
  --resource-group $RG \
  --lb-name lb-data-internal \
  --name rule-cluster-listener \
  --protocol Tcp \
  --frontend-port 5433 \
  --backend-port 5433 \
  --frontend-ip-name fe-data-internal \
  --backend-pool-name bp-data-nic \
  --probe-name probe-tcp-postgres \
  --floating-ip true \
  --enable-tcp-reset true
```

### Azure PowerShell

```powershell
# Get the VNet and subnet
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-northwind"
$snetData = $vnet.Subnets | Where-Object { $_.Name -eq "snet-data" }

# Create frontend IP config (internal, private IP)
$feInternal = New-AzLoadBalancerFrontendIpConfig `
  -Name "fe-data-internal" `
  -Subnet $snetData

# Create backend pool
$bePoolData = New-AzLoadBalancerBackendAddressPoolConfig `
  -Name "bp-data-nic"

# Create TCP probe for PostgreSQL
$probePostgres = New-AzLoadBalancerProbeConfig `
  -Name "probe-tcp-postgres" `
  -Protocol Tcp `
  -Port 5432 `
  -IntervalInSeconds 10 `
  -ProbeCount 2

# Create LB rule
$rulePostgres = New-AzLoadBalancerRuleConfig `
  -Name "rule-postgres" `
  -Protocol Tcp `
  -FrontendPort 5432 `
  -BackendPort 5432 `
  -FrontendIpConfiguration $feInternal `
  -BackendAddressPool $bePoolData `
  -Probe $probePostgres `
  -IdleTimeoutInMinutes 30 `
  -LoadDistribution Default `
  -EnableTcpReset

# Create the internal load balancer
New-AzLoadBalancer `
  -ResourceGroupName $rg `
  -Name "lb-data-internal" `
  -Location $location `
  -Sku Standard `
  -FrontendIpConfiguration $feInternal `
  -BackendAddressPool $bePoolData `
  -Probe $probePostgres `
  -LoadBalancingRule $rulePostgres
```

### Portal

1. Navegue até **Load balancers** > **Create**.
2. Defina o SKU como **Standard**, Tipo como **Internal**, Camada como **Regional**.
3. Selecione a VNet `vnet-northwind`, Sub-rede `snet-data`.
4. Nomeie o frontend `fe-data-internal` (atribuição dinâmica de IP privado).
5. Adicione o pool de back-end `bp-data-nic`.
6. Adicione a investigação de integridade `probe-tcp-postgres` (TCP, porta 5432, intervalo 10s).
7. Adicione a regra `rule-postgres` (TCP 5432/5432, tempo limite de ociosidade 30 min).

## Quebra e correção

Estes exercícios simulam configurações incorretas comuns. Diagnostique e corrija cada um.

### Cenário 1: Investigação de integridade falhando devido ao caminho incorreto

```bash
# Create a probe pointing to a non-existent path
az network lb probe create \
  --resource-group $RG \
  --lb-name lb-web-public \
  --name probe-broken-path \
  --protocol Http \
  --port 80 \
  --path "/healthcheck" \
  --interval 5 \
  --probe-threshold 2
```

**Sintoma**: Todas as VMs do back-end aparecem como não íntegras. Nenhum tráfego é distribuído.

**Causa raiz**: O caminho da investigação de integridade HTTP `/healthcheck` não existe nos servidores web. A aplicação expõe seu endpoint de integridade em `/health`. A investigação recebe HTTP 404, que está fora do intervalo de sucesso 200-399, então todas as instâncias são marcadas como inativas.

**Correção**: Atualize a investigação para usar o caminho correto:

```bash
az network lb probe update \
  --resource-group $RG \
  --lb-name lb-web-public \
  --name probe-broken-path \
  --path "/health"
```

### Cenário 2: Incompatibilidade de porta do back-end

```bash
# Rule forwards to wrong backend port
az network lb rule create \
  --resource-group $RG \
  --lb-name lb-web-public \
  --name rule-broken-port \
  --protocol Tcp \
  --frontend-port 80 \
  --backend-port 8080 \
  --frontend-ip-name fe-web-public \
  --backend-pool-name bp-web-nic \
  --probe-name probe-http-web
```

**Sintoma**: As investigações de integridade passam (verificando a porta 80), mas as conexões dos clientes expiram. A investigação e a regra visam portas de back-end diferentes.

**Causa raiz**: A regra de balanceamento de carga encaminha o tráfego para a porta de back-end 8080, mas os servidores web escutam na porta 80. O tráfego chega à VM, mas nenhum processo escuta na porta 8080.

**Correção**: Corrija a porta do back-end:

```bash
az network lb rule update \
  --resource-group $RG \
  --lb-name lb-web-public \
  --name rule-broken-port \
  --backend-port 80
```

### Cenário 3: Regra de NSG ausente para origem da investigação de integridade (168.63.129.16)

```bash
# Remove the health probe allow rule
az network nsg rule delete \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name AllowAzureLoadBalancer

# Add an overly restrictive deny rule
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name DenyAllInbound \
  --priority 4000 \
  --direction Inbound \
  --access Deny \
  --protocol "*" \
  --destination-port-ranges "*" \
  --source-address-prefixes "*"
```

**Sintoma**: Todas as instâncias do back-end aparecem como não íntegras. A investigação de integridade nunca alcança as VMs.

**Causa raiz**: As investigações de integridade do Azure Load Balancer originam-se do endereço IP `168.63.129.16`. Se o NSG bloquear essa origem, as investigações falham e todas as VMs aparecem como inativas. A tag de serviço `AzureLoadBalancer` cobre esse IP.

**Correção**: Readicione a regra de permissão para a origem da investigação:

```bash
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name AllowAzureLoadBalancer \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 80 \
  --source-address-prefixes 168.63.129.16
```

:::tip Tag de serviço AzureLoadBalancer
Você pode usar a tag de serviço `AzureLoadBalancer` como alternativa ao IP literal `168.63.129.16`. Ambos são equivalentes, mas a tag de serviço é a abordagem recomendada e compatível com versões futuras.
:::

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-25-q1",
    question: "NorthWind Traders has a Basic SKU Load Balancer and wants to add VMs from multiple availability zones to the backend pool. What must they do first?",
    options: [
      "Upgrade the Load Balancer to Standard SKU ✅",
      "Add all VMs to the same availability set",
      "Create a new public IP with Basic SKU",
      "Enable cross-zone load balancing in the Basic LB settings"
    ],
    correctIndex: 0,
    explanation: "Basic SKU Load Balancer only supports backends within a single availability set or a single VM scale set. Standard SKU is required for zone-redundant backends and mixing VMs from different availability zones."
  },
  {
    id: "az700-25-q2",
    question: "A health probe is configured with protocol HTTP, port 80, path '/health', interval 5 seconds, and unhealthy threshold 2. When does the Load Balancer mark a VM as unhealthy?",
    options: [
      "After 2 consecutive failed probes (approximately 10 seconds) ✅",
      "After 1 failed probe (5 seconds)",
      "After 5 consecutive failed probes (25 seconds)",
      "After 2 failed probes within any 30-second window"
    ],
    correctIndex: 0,
    explanation: "The unhealthy threshold (probe-threshold) defines consecutive probe failures needed to mark an instance unhealthy. With threshold 2 and interval 5s, a VM is removed from rotation after 2 consecutive failures, taking approximately 10 seconds."
  },
  {
    id: "az700-25-q3",
    question: "Backend VMs behind a Standard Load Balancer cannot reach the internet for OS updates. There is no NAT Gateway, no outbound rule, and no instance-level public IP. What is the root cause?",
    options: [
      "Standard LB does not provide default outbound SNAT; explicit outbound connectivity must be configured ✅",
      "The health probe is failing which blocks all outbound traffic",
      "The NSG is missing an outbound allow rule for internet",
      "Standard LB requires a separate outbound LB rule for port 443"
    ],
    correctIndex: 0,
    explanation: "Unlike Basic LB, Standard Load Balancer does not provide default outbound connectivity (implicit SNAT). Backend VMs require one of: an outbound rule on the LB, a NAT Gateway on the subnet, or an instance-level public IP."
  },
  {
    id: "az700-25-q4",
    question: "You configure session persistence as 'Source IP and protocol' on a load-balancing rule. Which hash tuple pins client sessions to a backend?",
    options: [
      "Source IP + Protocol (2-tuple) ✅",
      "Source IP only (1-tuple)",
      "Source IP + Source Port + Destination IP (3-tuple)",
      "Source IP + Destination IP + Source Port + Destination Port + Protocol (5-tuple)"
    ],
    correctIndex: 0,
    explanation: "Session persistence 'Source IP and protocol' uses a 2-tuple hash (client IP + protocol). 'Source IP' uses client IP alone. 'None' uses the default 5-tuple hash. The 2-tuple ensures all TCP connections from the same client reach the same backend VM."
  },
  {
    id: "az700-25-q5",
    question: "What is the purpose of enabling Floating IP (Direct Server Return) on a load-balancing rule?",
    options: [
      "The frontend IP is delivered to the VM without DNAT, enabling SQL AlwaysOn listener scenarios ✅",
      "The backend VM responds directly to the client without routing through the LB return path",
      "It allows multiple frontend IPs to share a single backend pool simultaneously",
      "It disables SNAT and uses the VM's private IP for all outbound traffic"
    ],
    correctIndex: 0,
    explanation: "Floating IP delivers packets to the backend VM with the LB frontend IP preserved as the destination (no destination NAT). This is required for SQL Server AlwaysOn listeners and cluster configurations where the application must bind to and respond on the virtual IP."
  },
  {
    id: "az700-25-q6",
    question: "An HTTP health probe returns status code 503 from a backend VM. How does the Load Balancer treat this response?",
    options: [
      "The probe fails because only HTTP 200-399 responses indicate a healthy endpoint ✅",
      "The probe passes because any HTTP response means the server is reachable",
      "The LB falls back to a TCP probe automatically",
      "The 503 is ignored and the instance stays in rotation for 30 more seconds"
    ],
    correctIndex: 0,
    explanation: "Azure Load Balancer HTTP health probes only consider HTTP status codes 200 through 399 as healthy. Any other code (including 503 Service Unavailable) counts as a probe failure. After reaching the unhealthy threshold, the instance is removed from rotation."
  }
]} />

## Limpeza

Remova todos os recursos criados neste desafio para evitar cobranças contínuas.

### Azure CLI

```bash
# Delete the entire resource group and all resources within it
az group delete --name rg-northwind-lb --yes --no-wait
```

### Azure PowerShell

```powershell
# Delete the entire resource group
Remove-AzResourceGroup -Name "rg-northwind-lb" -Force -AsJob
```

:::warning Lembrete de custo
O Standard Load Balancer custa aproximadamente $0.025/hora mais $0.01/hora por regra, mesmo sem tráfego. A cobrança de processamento de dados é de $0.005/GB. Sempre exclua os recursos de laboratório quando terminar de praticar.
:::

:::tip Verificar limpeza
Após alguns minutos, confirme a exclusão:
```bash
az group show --name rg-northwind-lb 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::
