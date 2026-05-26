---
sidebar_position: 9
title: "Desafio 33: Balanceamento de Carga Global Multi-Camadas"
sidebar_label: "Challenge 33"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 33: Balanceamento de carga global multicamada

:::info Tempo e custo estimados
**90-120 minutos** | **~$0,50/h combinado** (todos os serviços de balanceamento de carga) | **Peso no exame: 15-20%**
:::

## Cenário

A Fabrikam Corporation está migrando uma aplicação de três camadas do ambiente local para o Azure. A arquitetura possui:

- **Camada web** (voltada ao público): Tráfego HTTP global atendendo usuários na América do Norte, Europa e Ásia-Pacífico. Requer cache de conteúdo, offload de SSL e aceleração de tráfego.
- **Camada API** (regional): APIs RESTful com regras de roteamento baseadas em caminho. Múltiplos microsserviços compartilham um único ponto de entrada por região. Requer roteamento por caminho de URL, backends com autoescala e proteção WAF.
- **Camada de dados** (interna): Réplicas de banco de dados e clusters de cache acessíveis apenas de dentro da rede virtual. Requer alta disponibilidade com balanceamento L4 e sem exposição pública.
- **Serviços não-HTTP**: Relay SMTP e serviços TCP personalizados que precisam de failover global baseado em DNS, mas não usam HTTP/HTTPS.

Este é um exercício de design que sintetiza todos os conceitos de balanceamento de carga do Domínio 3 em uma única arquitetura. Você selecionará o serviço de balanceamento de carga apropriado do Azure para cada camada, implementará a solução e verificará o fluxo de tráfego de ponta a ponta.

## Habilidades do exame abordadas

| Habilidade | Peso |
|------------|------|
| Identificar e recomendar uma solução de balanceamento de carga (critérios de decisão) | Alto |
| Combinar múltiplos serviços de balanceamento de carga em um design multicamada | Alto |
| Configurar Azure Front Door para aceleração HTTP global | Alto |
| Configurar Application Gateway para roteamento L7 regional | Alto |
| Configurar Internal Load Balancer para balanceamento L4 privado | Alto |
| Configurar Traffic Manager para failover global não-HTTP | Médio |

## Pré-requisitos

- Assinatura do Azure com função de Colaborador
- Azure CLI 2.60+ ou Azure PowerShell Az 12.0+
- Conclusão dos Desafios 25-32 (ou conhecimento equivalente de todos os serviços de LB)
- Compreensão da topologia de rede hub-spoke

## O framework de decisão de balanceamento de carga

Antes de implementar, você deve selecionar o serviço correto para cada camada. O Azure fornece cinco serviços de balanceamento de carga, cada um otimizado para cenários diferentes.

| Critério | Front Door | Traffic Manager | Application Gateway | Load Balancer | Gateway LB |
|----------|-----------|----------------|--------------------|--------------|----|
| Escopo | Global | Global | Regional | Regional | Regional |
| Protocolo | HTTP/HTTPS (L7) | Baseado em DNS (qualquer) | HTTP/HTTPS (L7) | TCP/UDP (L4) | TCP/UDP (L4) |
| Implantação | Edge (anycast) | Apenas DNS | Na VNet | Na VNet | NVA inline |
| Cache | Sim | Não | Não | Não | Não |
| WAF | Sim (Premium) | Não | Sim | Não | Não |
| Roteamento por caminho | Via mecanismo de regras | Não | Sim (nativo) | Não | Não |
| Backend privado | Premium PL | Não | Sim (nativo) | Sim (nativo) | Sim |
| Offload SSL | Sim | Não | Sim | Não | Não |
| Afinidade de sessão | Baseada em cookie | Não | Baseada em cookie | Baseada em tupla | N/A |
| Sondas de integridade | HTTP/HTTPS | HTTP/HTTPS/TCP | HTTP/HTTPS | TCP/HTTP/HTTPS | TCP/HTTP/HTTPS |

### Matriz de decisão para a Fabrikam

| Camada | Requisito | Serviço selecionado | Justificativa |
|--------|-----------|--------------------|--------------| 
| Web (HTTP global) | Aceleração HTTP global, cache, WAF na borda | **Azure Front Door** | Único serviço que fornece aceleração HTTP global baseada em anycast com cache na borda |
| API (L7 regional) | Roteamento por caminho, WAF, autoescala | **Application Gateway v2** | Roteamento por caminho de URL nativo, WAF integrado e autoescala dentro de uma região |
| Dados (L4 interno) | HA L4 privado, sem exposição pública | **Internal Load Balancer** | Balanceamento L4 dentro da VNet; sem necessidade de IP público |
| Não-HTTP (global) | Failover DNS para serviços TCP/SMTP | **Traffic Manager** | Distribuição baseada em DNS funciona com qualquer protocolo; única opção global para não-HTTP |
| Encadeamento de NVA | Inserção transparente de appliances de firewall | **Gateway Load Balancer** | Encadeia NVAs inline sem modificar o caminho do tráfego da aplicação |

:::tip Atalhos de decisão para o exame
- **Global + HTTP** = Front Door
- **Global + não-HTTP** = Traffic Manager
- **Regional + HTTP + roteamento por caminho** = Application Gateway
- **Regional + TCP/UDP** = Load Balancer (público ou interno)
- **Inserção transparente de NVA** = Gateway Load Balancer
:::

## Tarefa 1: Implementar Azure Front Door para a camada web global

O Front Door fornece o ponto de entrada global, acelerando o tráfego HTTP para usuários em todo o mundo e armazenando conteúdo estático em cache nos locais de borda.

### Azure CLI

```bash
# Set variables
RG="rg-fabrikam-multitier"
LOCATION_PRIMARY="eastus2"
LOCATION_SECONDARY="westeurope"

# Create resource group
az group create --name $RG --location $LOCATION_PRIMARY

# Create Front Door Premium profile
az afd profile create \
  --resource-group $RG \
  --profile-name fd-fabrikam-web \
  --sku Premium_AzureFrontDoor

# Create endpoint
az afd endpoint create \
  --resource-group $RG \
  --profile-name fd-fabrikam-web \
  --endpoint-name ep-fabrikam-global \
  --enabled-state Enabled

# Create origin group for web tier backends
az afd origin-group create \
  --resource-group $RG \
  --profile-name fd-fabrikam-web \
  --origin-group-name og-web-appgw \
  --probe-request-type GET \
  --probe-protocol Https \
  --probe-interval-in-seconds 30 \
  --probe-path "/health" \
  --sample-size 4 \
  --successful-samples-required 3 \
  --additional-latency-in-milliseconds 50

# Add Application Gateway in East US 2 as primary origin
az afd origin create \
  --resource-group $RG \
  --profile-name fd-fabrikam-web \
  --origin-group-name og-web-appgw \
  --origin-name origin-appgw-eastus2 \
  --host-name appgw-fabrikam-eastus2.eastus2.cloudapp.azure.com \
  --origin-host-header appgw-fabrikam-eastus2.eastus2.cloudapp.azure.com \
  --http-port 80 \
  --https-port 443 \
  --priority 1 \
  --weight 1000 \
  --enabled-state Enabled

# Add Application Gateway in West Europe as secondary origin
az afd origin create \
  --resource-group $RG \
  --profile-name fd-fabrikam-web \
  --origin-group-name og-web-appgw \
  --origin-name origin-appgw-westeurope \
  --host-name appgw-fabrikam-westeurope.westeurope.cloudapp.azure.com \
  --origin-host-header appgw-fabrikam-westeurope.westeurope.cloudapp.azure.com \
  --http-port 80 \
  --https-port 443 \
  --priority 2 \
  --weight 1000 \
  --enabled-state Enabled

# Create route with caching for static content
az afd route create \
  --resource-group $RG \
  --profile-name fd-fabrikam-web \
  --endpoint-name ep-fabrikam-global \
  --route-name route-web \
  --origin-group og-web-appgw \
  --patterns-to-match "/*" \
  --supported-protocols Http Https \
  --https-redirect Enabled \
  --forwarding-protocol HttpsOnly \
  --link-to-default-domain Enabled \
  --enable-caching true \
  --enable-compression true \
  --query-string-caching-behavior UseQueryString
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-fabrikam-multitier"
$locationPrimary = "eastus2"
$locationSecondary = "westeurope"

# Create resource group
New-AzResourceGroup -Name $rg -Location $locationPrimary

# Create Front Door Premium
New-AzFrontDoorCdnProfile `
  -ResourceGroupName $rg `
  -ProfileName "fd-fabrikam-web" `
  -SkuName "Premium_AzureFrontDoor"

# Create endpoint
New-AzFrontDoorCdnEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "fd-fabrikam-web" `
  -EndpointName "ep-fabrikam-global" `
  -Location "Global" `
  -EnabledState "Enabled"
```

## Tarefa 2: Implementar Application Gateway para a camada API regional

O Application Gateway fornece balanceamento de carga L7 dentro de cada região, com roteamento baseado em caminho de URL para direcionar o tráfego a diferentes backends de microsserviços.

### Azure CLI

```bash
# Create VNet and subnets for Application Gateway
az network vnet create \
  --resource-group $RG \
  --name vnet-fabrikam-eastus2 \
  --location $LOCATION_PRIMARY \
  --address-prefixes 10.1.0.0/16 \
  --subnet-name snet-appgw \
  --subnet-prefixes 10.1.0.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-fabrikam-eastus2 \
  --name snet-api \
  --address-prefixes 10.1.1.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-fabrikam-eastus2 \
  --name snet-data \
  --address-prefixes 10.1.2.0/24

# Create public IP for Application Gateway
az network public-ip create \
  --resource-group $RG \
  --name pip-appgw-eastus2 \
  --location $LOCATION_PRIMARY \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3

# Create Application Gateway WAF v2 with path-based routing
az network application-gateway create \
  --resource-group $RG \
  --name appgw-fabrikam-eastus2 \
  --location $LOCATION_PRIMARY \
  --sku WAF_v2 \
  --capacity 2 \
  --vnet-name vnet-fabrikam-eastus2 \
  --subnet snet-appgw \
  --public-ip-address pip-appgw-eastus2 \
  --http-settings-port 443 \
  --http-settings-protocol Https \
  --frontend-port 443 \
  --priority 100

# Create backend pools for different microservices
az network application-gateway address-pool create \
  --resource-group $RG \
  --gateway-name appgw-fabrikam-eastus2 \
  --name pool-orders-api \
  --servers 10.1.1.10 10.1.1.11

az network application-gateway address-pool create \
  --resource-group $RG \
  --gateway-name appgw-fabrikam-eastus2 \
  --name pool-inventory-api \
  --servers 10.1.1.20 10.1.1.21

# Create URL path map for routing
az network application-gateway url-path-map create \
  --resource-group $RG \
  --gateway-name appgw-fabrikam-eastus2 \
  --name pathmap-api \
  --default-address-pool pool-orders-api \
  --default-http-settings appGatewayBackendHttpSettings \
  --paths "/api/orders/*" \
  --address-pool pool-orders-api \
  --http-settings appGatewayBackendHttpSettings \
  --path-map-rule-name rule-orders

az network application-gateway url-path-map rule create \
  --resource-group $RG \
  --gateway-name appgw-fabrikam-eastus2 \
  --name rule-inventory \
  --path-map-name pathmap-api \
  --paths "/api/inventory/*" \
  --address-pool pool-inventory-api \
  --http-settings appGatewayBackendHttpSettings
```

### Azure PowerShell

```powershell
# Create VNet
$appgwSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-appgw" -AddressPrefix "10.1.0.0/24"
$apiSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-api" -AddressPrefix "10.1.1.0/24"
$dataSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-data" -AddressPrefix "10.1.2.0/24"

New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-fabrikam-eastus2" `
  -Location $locationPrimary `
  -AddressPrefix "10.1.0.0/16" `
  -Subnet $appgwSubnet, $apiSubnet, $dataSubnet

# Create public IP
$pip = New-AzPublicIpAddress `
  -ResourceGroupName $rg `
  -Name "pip-appgw-eastus2" `
  -Location $locationPrimary `
  -Sku "Standard" `
  -AllocationMethod "Static" `
  -Zone 1, 2, 3

# Application Gateway configuration (simplified for readability)
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-fabrikam-eastus2"
$subnet = Get-AzVirtualNetworkSubnetConfig -VirtualNetwork $vnet -Name "snet-appgw"

$gipConfig = New-AzApplicationGatewayIPConfiguration -Name "appGwIPConfig" -Subnet $subnet
$fipConfig = New-AzApplicationGatewayFrontendIPConfig -Name "appGwFrontendIP" -PublicIPAddress $pip
$frontendPort = New-AzApplicationGatewayFrontendPort -Name "port443" -Port 443

$poolOrders = New-AzApplicationGatewayBackendAddressPool -Name "pool-orders-api" `
  -BackendIPAddresses "10.1.1.10","10.1.1.11"
$poolInventory = New-AzApplicationGatewayBackendAddressPool -Name "pool-inventory-api" `
  -BackendIPAddresses "10.1.1.20","10.1.1.21"
```

## Tarefa 3: Implementar Internal Load Balancer para a camada de dados

O balanceador de carga interno distribui o tráfego entre réplicas de banco de dados e nós de cache sem qualquer exposição à internet pública.

### Azure CLI

```bash
# Create Internal Load Balancer for data tier
az network lb create \
  --resource-group $RG \
  --name ilb-fabrikam-data \
  --location $LOCATION_PRIMARY \
  --sku Standard \
  --vnet-name vnet-fabrikam-eastus2 \
  --subnet snet-data \
  --frontend-ip-name fe-data \
  --backend-pool-name pool-sql-replicas

# Create health probe for SQL
az network lb probe create \
  --resource-group $RG \
  --lb-name ilb-fabrikam-data \
  --name probe-sql \
  --protocol Tcp \
  --port 1433 \
  --interval 15 \
  --probe-threshold 2

# Create load balancing rule for SQL traffic
az network lb rule create \
  --resource-group $RG \
  --lb-name ilb-fabrikam-data \
  --name rule-sql \
  --protocol Tcp \
  --frontend-port 1433 \
  --backend-port 1433 \
  --frontend-ip-name fe-data \
  --backend-pool-name pool-sql-replicas \
  --probe-name probe-sql \
  --idle-timeout 30 \
  --enable-tcp-reset true

# Create a second rule for Redis cache traffic
az network lb probe create \
  --resource-group $RG \
  --lb-name ilb-fabrikam-data \
  --name probe-redis \
  --protocol Tcp \
  --port 6380 \
  --interval 15 \
  --probe-threshold 2

az network lb rule create \
  --resource-group $RG \
  --lb-name ilb-fabrikam-data \
  --name rule-redis \
  --protocol Tcp \
  --frontend-port 6380 \
  --backend-port 6380 \
  --frontend-ip-name fe-data \
  --backend-pool-name pool-sql-replicas \
  --probe-name probe-redis \
  --idle-timeout 10 \
  --enable-tcp-reset true

# Verify the internal LB frontend IP (should be private)
az network lb show \
  --resource-group $RG \
  --name ilb-fabrikam-data \
  --query "frontendIPConfigurations[].{name:name, privateIP:privateIPAddress, subnet:subnet.id}" \
  --output table
```

### Azure PowerShell

```powershell
# Get subnet reference
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-fabrikam-eastus2"
$dataSubnet = Get-AzVirtualNetworkSubnetConfig -VirtualNetwork $vnet -Name "snet-data"

# Create frontend IP configuration (internal)
$feIpConfig = New-AzLoadBalancerFrontendIpConfig `
  -Name "fe-data" `
  -Subnet $dataSubnet `
  -PrivateIpAddress "10.1.2.10"

# Create backend pool
$bePool = New-AzLoadBalancerBackendAddressPoolConfig -Name "pool-sql-replicas"

# Create health probe
$probe = New-AzLoadBalancerProbeConfig `
  -Name "probe-sql" `
  -Protocol "Tcp" `
  -Port 1433 `
  -IntervalInSeconds 15 `
  -ProbeCount 2

# Create load balancing rule
$lbRule = New-AzLoadBalancerRuleConfig `
  -Name "rule-sql" `
  -FrontendIpConfiguration $feIpConfig `
  -BackendAddressPool $bePool `
  -Probe $probe `
  -Protocol "Tcp" `
  -FrontendPort 1433 `
  -BackendPort 1433 `
  -IdleTimeoutInMinutes 30 `
  -EnableTcpReset

# Create the Internal Load Balancer
New-AzLoadBalancer `
  -ResourceGroupName $rg `
  -Name "ilb-fabrikam-data" `
  -Location $locationPrimary `
  -Sku "Standard" `
  -FrontendIpConfiguration $feIpConfig `
  -BackendAddressPool $bePool `
  -Probe $probe `
  -LoadBalancingRule $lbRule
```

## Tarefa 4: Implementar Traffic Manager para failover global não-HTTP

O Traffic Manager fornece balanceamento de carga global baseado em DNS para o serviço de relay SMTP que não pode usar sondagem baseada em HTTP.

### Azure CLI

```bash
# Create Traffic Manager profile with priority routing
az network traffic-manager profile create \
  --resource-group $RG \
  --name tm-fabrikam-smtp \
  --routing-method Priority \
  --unique-dns-name fabrikam-smtp-relay \
  --ttl 30 \
  --protocol TCP \
  --port 25 \
  --interval 30 \
  --timeout 10 \
  --max-failures 3

# Add primary endpoint (East US 2)
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-fabrikam-smtp \
  --name ep-smtp-eastus2 \
  --type externalEndpoints \
  --target smtp-eastus2.fabrikam.com \
  --endpoint-status Enabled \
  --priority 1

# Add secondary endpoint (West Europe)
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-fabrikam-smtp \
  --name ep-smtp-westeurope \
  --type externalEndpoints \
  --target smtp-westeurope.fabrikam.com \
  --endpoint-status Enabled \
  --priority 2

# Verify Traffic Manager DNS resolution
az network traffic-manager profile show \
  --resource-group $RG \
  --name tm-fabrikam-smtp \
  --query "{fqdn:dnsConfig.fqdn, routing:trafficRoutingMethod, monitorProtocol:monitorConfig.protocol}" \
  --output table
```

### Azure PowerShell

```powershell
# Create Traffic Manager profile
New-AzTrafficManagerProfile `
  -ResourceGroupName $rg `
  -Name "tm-fabrikam-smtp" `
  -TrafficRoutingMethod "Priority" `
  -RelativeDnsName "fabrikam-smtp-relay" `
  -Ttl 30 `
  -MonitorProtocol "TCP" `
  -MonitorPort 25 `
  -MonitorIntervalInSeconds 30 `
  -MonitorTimeoutInSeconds 10 `
  -MonitorToleratedNumberOfFailures 3

# Add primary endpoint
New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-fabrikam-smtp" `
  -Name "ep-smtp-eastus2" `
  -Type "ExternalEndpoints" `
  -Target "smtp-eastus2.fabrikam.com" `
  -EndpointStatus "Enabled" `
  -Priority 1

# Add secondary endpoint
New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-fabrikam-smtp" `
  -Name "ep-smtp-westeurope" `
  -Type "ExternalEndpoints" `
  -Target "smtp-westeurope.fabrikam.com" `
  -EndpointStatus "Enabled" `
  -Priority 2
```

### Portal

1. Navegue até **Traffic Manager profiles** > **Create**.
2. Defina o Nome como `tm-fabrikam-smtp`, Método de roteamento como **Priority**.
3. Após a criação, vá para **Endpoints** > **Add**.
4. Adicione endpoints externos para cada relay SMTP com os valores de prioridade apropriados.
5. Em **Configuration**, defina o protocolo do monitor como **TCP**, porta como **25**.

## Tarefa 5: Configurar NSGs para permitir sondas de integridade do Front Door

Um ponto de integração crítico: as sondas de integridade do Front Door originam-se da service tag `AzureFrontDoor.Backend`. Se os NSGs do Application Gateway bloquearem esse tráfego, as sondas falham e o Front Door marca a origem como não íntegra.

### Azure CLI

```bash
# Create NSG for the Application Gateway subnet
az network nsg create \
  --resource-group $RG \
  --name nsg-appgw-subnet \
  --location $LOCATION_PRIMARY

# Allow Front Door health probes (service tag)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-appgw-subnet \
  --name AllowFrontDoorProbes \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes AzureFrontDoor.Backend \
  --destination-port-ranges 443 80 \
  --description "Allow Azure Front Door health probes"

# Allow Application Gateway v2 infrastructure (required)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-appgw-subnet \
  --name AllowGatewayManager \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes GatewayManager \
  --destination-port-ranges 65200-65535 \
  --description "Required for AppGW v2 infrastructure"

# Allow Azure Load Balancer probes (required for AppGW health)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-appgw-subnet \
  --name AllowAzureLBProbes \
  --priority 120 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes AzureLoadBalancer \
  --destination-port-ranges "*" \
  --description "Allow Azure LB health probes"

# Associate NSG with the Application Gateway subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-fabrikam-eastus2 \
  --name snet-appgw \
  --network-security-group nsg-appgw-subnet
```

### Azure PowerShell

```powershell
# Create NSG with Front Door rule
$ruleFD = New-AzNetworkSecurityRuleConfig `
  -Name "AllowFrontDoorProbes" `
  -Priority 100 `
  -Direction "Inbound" `
  -Access "Allow" `
  -Protocol "Tcp" `
  -SourceAddressPrefix "AzureFrontDoor.Backend" `
  -SourcePortRange "*" `
  -DestinationAddressPrefix "*" `
  -DestinationPortRange "443","80"

$ruleGwMgr = New-AzNetworkSecurityRuleConfig `
  -Name "AllowGatewayManager" `
  -Priority 110 `
  -Direction "Inbound" `
  -Access "Allow" `
  -Protocol "Tcp" `
  -SourceAddressPrefix "GatewayManager" `
  -SourcePortRange "*" `
  -DestinationAddressPrefix "*" `
  -DestinationPortRange "65200-65535"

$nsg = New-AzNetworkSecurityGroup `
  -ResourceGroupName $rg `
  -Name "nsg-appgw-subnet" `
  -Location $locationPrimary `
  -SecurityRules $ruleFD, $ruleGwMgr

# Associate with subnet
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-fabrikam-eastus2"
$subnet = Get-AzVirtualNetworkSubnetConfig -VirtualNetwork $vnet -Name "snet-appgw"
$subnet.NetworkSecurityGroup = $nsg
Set-AzVirtualNetwork -VirtualNetwork $vnet
```

## Tarefa 6: Verificar fluxo de tráfego de ponta a ponta

Valide a arquitetura verificando a integridade e conectividade de cada componente.

### Azure CLI

```bash
# Check Front Door endpoint health
az afd endpoint show \
  --resource-group $RG \
  --profile-name fd-fabrikam-web \
  --endpoint-name ep-fabrikam-global \
  --query "{hostname:hostName, state:enabledState}" \
  --output table

# Check origin health states
az afd origin list \
  --resource-group $RG \
  --profile-name fd-fabrikam-web \
  --origin-group-name og-web-appgw \
  --query "[].{name:name, enabled:enabledState, priority:priority}" \
  --output table

# Check Application Gateway backend health
az network application-gateway show-backend-health \
  --resource-group $RG \
  --name appgw-fabrikam-eastus2 \
  --query "backendAddressPools[].backendHttpSettingsCollection[].servers[].{address:address, health:health}" \
  --output table

# Check Internal Load Balancer backend health
az network lb show \
  --resource-group $RG \
  --name ilb-fabrikam-data \
  --query "backendAddressPools[].{name:name, count:loadBalancerBackendAddresses|length(@)}" \
  --output table

# Check Traffic Manager endpoint status
az network traffic-manager endpoint list \
  --resource-group $RG \
  --profile-name tm-fabrikam-smtp \
  --type externalEndpoints \
  --query "[].{name:name, status:endpointMonitorStatus, priority:priority}" \
  --output table
```

## Resumo da arquitetura

```text
Users (Global)
    |
    v
[Azure Front Door Premium]  <-- Global HTTP acceleration + caching + WAF
    |
    |--- East US 2 (Priority 1)
    |       |
    |       v
    |   [Application Gateway v2]  <-- Regional L7: path-based routing
    |       |
    |       |--- /api/orders/*  --> pool-orders-api (10.1.1.10, .11)
    |       |--- /api/inventory/* --> pool-inventory-api (10.1.1.20, .21)
    |       |
    |       v
    |   [Internal Load Balancer]  <-- L4 HA for data tier
    |       |--- SQL: port 1433 --> replicas
    |       |--- Redis: port 6380 --> cache nodes
    |
    |--- West Europe (Priority 2, failover)
            |
            v
        [Application Gateway v2]  <-- Same pattern, secondary region
            |
            v
        [Internal Load Balancer]

[Traffic Manager]  <-- DNS failover for non-HTTP (SMTP)
    |--- smtp-eastus2.fabrikam.com (Priority 1)
    |--- smtp-westeurope.fabrikam.com (Priority 2)
```

## Quebra & conserta

### Cenário 1: Sondas de integridade do Front Door bloqueadas pelo NSG do AppGW

```bash
# Simulate: Remove the Front Door allow rule from the NSG
az network nsg rule delete \
  --resource-group $RG \
  --nsg-name nsg-appgw-subnet \
  --name AllowFrontDoorProbes
```

**Sintoma**: O Front Door marca a origem do Application Gateway como não íntegra. O endpoint retorna 503 para todos os usuários, mesmo que o Application Gateway esteja funcionando corretamente e acessível diretamente.

**Causa raiz**: As sondas de integridade do Front Door originam-se dos intervalos de IP da service tag `AzureFrontDoor.Backend`. Sem uma regra de NSG permitindo esse tráfego, as sondas são descartadas no nível da sub-rede e o Front Door não consegue verificar a integridade do backend.

**Correção**: Readicione a regra do NSG permitindo as sondas do Front Door:

```bash
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-appgw-subnet \
  --name AllowFrontDoorProbes \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes AzureFrontDoor.Backend \
  --destination-port-ranges 443 80
```

### Cenário 2: Sonda de integridade do Internal LB falhando (porta de sonda incorreta)

```bash
# Misconfigure the SQL health probe to wrong port
az network lb probe update \
  --resource-group $RG \
  --lb-name ilb-fabrikam-data \
  --name probe-sql \
  --port 1434
```

**Sintoma**: A camada API recebe timeouts de conexão ao consultar o banco de dados através do balanceador de carga interno. O balanceador de carga para de rotear tráfego para as instâncias SQL de backend.

**Causa raiz**: A sonda de integridade aponta para a porta 1434, mas o SQL Server escuta na porta 1433. Todas as tentativas de sonda falham, então o LB marca todos os backends como não íntegros e para de encaminhar tráfego.

**Correção**: Corrija a porta da sonda:

```bash
az network lb probe update \
  --resource-group $RG \
  --lb-name ilb-fabrikam-data \
  --name probe-sql \
  --port 1433
```

### Cenário 3: Traffic Manager retornando endpoint incorreto

**Sintoma**: O tráfego não-HTTP sempre roteia para o relay SMTP secundário, mesmo quando o primário está íntegro.

**Diagnóstico**:

```bash
# Check endpoint monitoring status
az network traffic-manager endpoint show \
  --resource-group $RG \
  --profile-name tm-fabrikam-smtp \
  --name ep-smtp-eastus2 \
  --type externalEndpoints \
  --query "{name:name, status:endpointMonitorStatus, priority:priority}" \
  --output json
```

**Causa raiz**: O endpoint primário tem `endpointMonitorStatus: Degraded` porque o monitor de integridade está configurado com a porta incorreta ou o serviço SMTP não está escutando.

**Correção**: Verifique se a configuração do monitor corresponde ao serviço:

```bash
az network traffic-manager profile update \
  --resource-group $RG \
  --name tm-fabrikam-smtp \
  --protocol TCP \
  --port 25
```

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-33-q1",
    question: "A Fabrikam precisa de balanceamento de carga global para um serviço baseado em TCP na porta 5672 (AMQP). Qual serviço do Azure eles devem usar?",
    options: [
      "Traffic Manager com health probes TCP ✅",
      "Azure Front Door com encaminhamento TCP",
      "Application Gateway com listeners TCP",
      "Azure Load Balancer com camada global"
    ],
    correctIndex: 0,
    explanation: "O Traffic Manager é o único serviço de balanceamento de carga global do Azure que funciona com protocolos não-HTTP. Ele opera na camada DNS e usa health probes TCP/HTTP/HTTPS. O Front Door lida apenas com HTTP/HTTPS. Application Gateway e Load Balancer são serviços regionais."
  },
  {
    id: "az700-33-q2",
    question: "Em uma arquitetura multicamadas, o Front Door roteia tráfego para o Application Gateway. As probes do Front Door mostram a origem do AppGW como não íntegra, mas o AppGW responde corretamente a requisições diretas do navegador. Qual é a causa mais provável?",
    options: [
      "Um NSG na sub-rede do Application Gateway bloqueia a service tag AzureFrontDoor.Backend ✅",
      "O WAF do Application Gateway está bloqueando as probes",
      "O Front Door e o Application Gateway estão em assinaturas diferentes",
      "O caminho da health probe do Application Gateway retorna um redirecionamento"
    ],
    correctIndex: 0,
    explanation: "As health probes do Front Door se originam das faixas de IP da service tag AzureFrontDoor.Backend. Se um NSG na sub-rede do AppGW não tiver uma regra de permissão para essa service tag, as probes são descartadas silenciosamente. O acesso direto pelo navegador funciona porque vem de uma faixa de IP diferente."
  },
  {
    id: "az700-33-q3",
    question: "Qual combinação associa corretamente cada serviço à sua camada de balanceamento de carga?",
    options: [
      "Front Door = L7 Global, Traffic Manager = DNS Global, Application Gateway = L7 Regional, Load Balancer = L4 Regional ✅",
      "Front Door = L7 Regional, Traffic Manager = L7 Global, Application Gateway = DNS Global, Load Balancer = L4 Regional",
      "Front Door = L4 Global, Traffic Manager = DNS Global, Application Gateway = L7 Regional, Load Balancer = L7 Regional",
      "Front Door = L7 Global, Traffic Manager = DNS Regional, Application Gateway = L4 Regional, Load Balancer = L4 Regional"
    ],
    correctIndex: 0,
    explanation: "O Front Door opera na L7 globalmente (HTTP/HTTPS com anycast). O Traffic Manager é distribuição global baseada em DNS (funciona com qualquer protocolo). O Application Gateway é um balanceador de carga L7 regional (HTTP/HTTPS com roteamento por caminho). O Load Balancer é um serviço L4 regional (TCP/UDP)."
  },
  {
    id: "az700-33-q4",
    question: "Uma health probe de um Internal Load Balancer está configurada na porta 1434, mas o backend SQL Server escuta na porta 1433. O que acontece?",
    options: [
      "Todos os backends são marcados como não íntegros e o LB para de encaminhar tráfego na porta 1433 ✅",
      "O tráfego é encaminhado, mas as conexões expiram no backend",
      "O LB detecta automaticamente a porta correta e ajusta",
      "Apenas a health probe falha; o encaminhamento de tráfego não é afetado"
    ],
    correctIndex: 0,
    explanation: "Health probes e regras de balanceamento de carga são configurações independentes. Se a porta da probe (1434) não obtém resposta, todos os backends são marcados como não íntegros. Quando todos os backends estão não íntegros, o LB descarta todas as novas conexões na regra associada (porta 1433), mesmo que os backends estejam realmente escutando na 1433."
  },
  {
    id: "az700-33-q5",
    question: "Quando você deve usar o Gateway Load Balancer em vez de um Load Balancer padrão?",
    options: [
      "Quando você precisa inserir de forma transparente appliances virtuais de rede (NVAs) no caminho do tráfego sem alterar a configuração da aplicação ✅",
      "Quando você precisa de balanceamento de carga global entre regiões",
      "Quando você precisa de roteamento baseado em caminho HTTP",
      "Quando você precisa balancear carga de tráfego entre múltiplas assinaturas"
    ],
    correctIndex: 0,
    explanation: "O Gateway Load Balancer permite encadeamento transparente de NVAs (firewalls, appliances DDoS, inspeção de pacotes) no caminho da rede. O tráfego é tunelado para o pool de NVAs e retornado sem que a aplicação ou o cliente saibam sobre a camada de inspeção."
  },
  {
    id: "az700-33-q6",
    question: "O Front Door usa roteamento baseado em prioridade para Application Gateways em duas regiões. O que determina quando o tráfego muda da prioridade 1 para a prioridade 2?",
    options: [
      "Quando todas as origens na prioridade 1 falham suas health probes com base nos limites de sample-size e successful-samples-required ✅",
      "Quando a latência para a prioridade 1 excede um limite configurado",
      "Imediatamente quando qualquer health probe individual falha",
      "Com base em uma divisão percentual de tráfego configurada"
    ],
    correctIndex: 0,
    explanation: "O failover do Front Door é orientado por probes. O tráfego muda para prioridade 2 apenas quando TODAS as origens na prioridade 1 falham as health probes. O limite de falha é determinado pelas configurações de sample-size e successful-samples-required no grupo de origem. Uma única falha de probe não aciona o failover."
  }
]} />

## Limpeza

Remova todos os recursos criados neste desafio.

### Azure CLI

```bash
# Delete the entire resource group and all resources within it
az group delete --name rg-fabrikam-multitier --yes --no-wait
```

### Azure PowerShell

```powershell
# Delete the entire resource group and all resources within it
Remove-AzResourceGroup -Name "rg-fabrikam-multitier" -Force -AsJob
```

:::danger Aviso de custo
Este desafio implanta múltiplos serviços de balanceamento de carga. Custos combinados aproximados durante a execução:
- Front Door Premium: ~$35/mês base
- Application Gateway WAF v2 (2 instâncias): ~$0,36/h (~$260/mês)
- Internal Load Balancer (Standard): ~$0,025/h por regra
- Traffic Manager: ~$0,75/milhão de consultas

Exclua todos os recursos imediatamente após concluir o desafio. A flag `--no-wait` retorna o controle imediatamente enquanto a exclusão prossegue em segundo plano.
:::

:::tip Verificar limpeza
Após alguns minutos, confirme a exclusão:
```bash
az group show --name rg-fabrikam-multitier 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::
