---
sidebar_position: 4
title: "Challenge 28: Application Gateway fundamentals"
sidebar_label: "Challenge 28"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 28: Fundamentos do Application Gateway

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,27/h (SKU WAF_v2)** | **Peso no exame: 15-20%**

:::

:::warning Alerta de custo
O Application Gateway v2 é cobrado por hora, mesmo quando ocioso. O SKU WAF_v2 custa aproximadamente $0,443/hora-de-gateway mais $0,0144/hora-de-unidade-de-capacidade. Exclua o gateway imediatamente após concluir este desafio para evitar cobranças inesperadas.
:::

## Cenário

Você é o engenheiro de rede da Contoso SaaS, uma empresa que hospeda múltiplas aplicações web atrás de um único Application Gateway. A plataforma atende duas marcas distintas de clientes:

- **contoso.com** - Site corporativo principal com um frontend de marketing e um backend de API em `/api/*`
- **fabrikam.com** - Portal de parceiros com um site de documentação estático e um endpoint de webhook em `/hooks/*`

Sua tarefa é implantar uma instância do Application Gateway v2 com ouvintes multi-site, pools de back-end dedicados para cada aplicação e regras de roteamento baseadas em caminho que direcionam o tráfego para o back-end correto com base no caminho da URL.

## Visão geral da arquitetura

```
Internet
   |
   v
[Public IP] --> [Application Gateway v2]
                     |
         +-----------+-----------+
         |                       |
   [Listener:                [Listener:
    contoso.com]              fabrikam.com]
         |                       |
    [Path Map]              [Path Map]
    /api/* -> API Pool      /hooks/* -> Hooks Pool
    /*    -> Web Pool       /*      -> Docs Pool
```

## Pré-requisitos

- Assinatura do Azure com acesso de Contributor
- Azure CLI 2.50+ ou módulo Azure PowerShell Az 10.0+
- Uma rede virtual com uma sub-rede dedicada para o Application Gateway (mínimo /24 recomendado)

---

## Tarefa 1: Criar a infraestrutura de rede

O Application Gateway requer uma sub-rede dedicada sem outros recursos implantados nela. O nome da sub-rede não precisa ser "AppGwSubnet", mas essa é a convenção comum.

### Azure CLI

```bash
# Create resource group
az group create \
  --name rg-appgw-lab \
  --location eastus2

# Create virtual network with Application Gateway subnet
az network vnet create \
  --resource-group rg-appgw-lab \
  --name vnet-appgw \
  --address-prefixes 10.0.0.0/16 \
  --subnet-name AppGwSubnet \
  --subnet-prefixes 10.0.0.0/24

# Create backend subnet for VMs or App Services
az network vnet subnet create \
  --resource-group rg-appgw-lab \
  --vnet-name vnet-appgw \
  --name BackendSubnet \
  --address-prefixes 10.0.1.0/24

# Create public IP (Standard SKU, static allocation required for v2)
az network public-ip create \
  --resource-group rg-appgw-lab \
  --name pip-appgw \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3
```

### Azure PowerShell

```powershell
# Create resource group
New-AzResourceGroup -Name "rg-appgw-lab" -Location "eastus2"

# Create subnet configurations
$appgwSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "AppGwSubnet" `
  -AddressPrefix "10.0.0.0/24"

$backendSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "BackendSubnet" `
  -AddressPrefix "10.0.1.0/24"

# Create virtual network
$vnet = New-AzVirtualNetwork `
  -ResourceGroupName "rg-appgw-lab" `
  -Name "vnet-appgw" `
  -Location "eastus2" `
  -AddressPrefix "10.0.0.0/16" `
  -Subnet $appgwSubnet, $backendSubnet

# Create public IP
$pip = New-AzPublicIpAddress `
  -ResourceGroupName "rg-appgw-lab" `
  -Name "pip-appgw" `
  -Location "eastus2" `
  -Sku Standard `
  -AllocationMethod Static `
  -Zone 1, 2, 3
```

### Portal

1. Navegue até **Criar um recurso** e pesquise por **Application Gateway**
2. Na guia **Básico**, selecione sua assinatura e grupo de recursos
3. Em **Detalhes da instância**, forneça um nome e selecione a região
4. Em **Rede virtual**, crie uma nova VNet com o espaço de endereço 10.0.0.0/16
5. Crie uma sub-rede dedicada chamada AppGwSubnet com o prefixo 10.0.0.0/24

---

## Tarefa 2: Implantar o Application Gateway

### Azure CLI

```bash
# Create Application Gateway with WAF_v2 SKU
az network application-gateway create \
  --resource-group rg-appgw-lab \
  --name appgw-multisite \
  --location eastus2 \
  --sku WAF_v2 \
  --capacity 2 \
  --vnet-name vnet-appgw \
  --subnet AppGwSubnet \
  --public-ip-address pip-appgw \
  --frontend-port 80 \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --priority 100
```

### Azure PowerShell

```powershell
# Get subnet and IP references
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-appgw-lab" -Name "vnet-appgw"
$subnet = Get-AzVirtualNetworkSubnetConfig -Name "AppGwSubnet" -VirtualNetwork $vnet
$pip = Get-AzPublicIpAddress -ResourceGroupName "rg-appgw-lab" -Name "pip-appgw"

# Create gateway IP configuration
$gipconfig = New-AzApplicationGatewayIPConfiguration `
  -Name "appGwIPConfig" `
  -Subnet $subnet

# Create frontend IP configuration
$fipconfig = New-AzApplicationGatewayFrontendIPConfig `
  -Name "appGwFrontendIP" `
  -PublicIPAddress $pip

# Create frontend port
$frontendPort = New-AzApplicationGatewayFrontendPort `
  -Name "frontendPort80" `
  -Port 80

# Create default backend pool
$defaultPool = New-AzApplicationGatewayBackendAddressPool `
  -Name "defaultPool"

# Create default HTTP settings
$defaultSettings = New-AzApplicationGatewayBackendHttpSetting `
  -Name "defaultHttpSettings" `
  -Port 80 `
  -Protocol Http `
  -RequestTimeout 30

# Create default listener
$defaultListener = New-AzApplicationGatewayHttpListener `
  -Name "defaultListener" `
  -Protocol Http `
  -FrontendIPConfiguration $fipconfig `
  -FrontendPort $frontendPort

# Create default routing rule
$defaultRule = New-AzApplicationGatewayRequestRoutingRule `
  -Name "defaultRule" `
  -RuleType Basic `
  -Priority 100 `
  -HttpListener $defaultListener `
  -BackendAddressPool $defaultPool `
  -BackendHttpSettings $defaultSettings

# Create SKU
$sku = New-AzApplicationGatewaySku -Name WAF_v2 -Tier WAF_v2 -Capacity 2

# Create the Application Gateway
New-AzApplicationGateway `
  -ResourceGroupName "rg-appgw-lab" `
  -Name "appgw-multisite" `
  -Location "eastus2" `
  -Sku $sku `
  -GatewayIpConfigurations $gipconfig `
  -FrontendIpConfigurations $fipconfig `
  -FrontendPorts $frontendPort `
  -BackendAddressPools $defaultPool `
  -BackendHttpSettingsCollection $defaultSettings `
  -HttpListeners $defaultListener `
  -RequestRoutingRules $defaultRule
```

---

## Tarefa 3: Configurar ouvintes multi-site

Os ouvintes multi-site usam o parâmetro `--host-name` para corresponder solicitações de entrada com base no cabeçalho Host. Cada ouvinte se vincula ao mesmo IP de frontend e porta, mas roteia para back-ends diferentes com base no nome do host.

### Azure CLI

```bash
# Create named frontend port
az network application-gateway frontend-port create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name frontendPort80 \
  --port 80

# Create frontend port for HTTPS (if needed later)
az network application-gateway frontend-port create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name port443 \
  --port 443

# Create listener for contoso.com
az network application-gateway http-listener create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name listener-contoso \
  --frontend-port frontendPort80 \
  --host-name "contoso.com"

# Create listener for fabrikam.com
az network application-gateway http-listener create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name listener-fabrikam \
  --frontend-port frontendPort80 \
  --host-name "fabrikam.com"
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"
$fipconfig = Get-AzApplicationGatewayFrontendIPConfig -ApplicationGateway $appgw -Name "appGwFrontendIP"
$fp80 = Get-AzApplicationGatewayFrontendPort -ApplicationGateway $appgw -Name "frontendPort80"

# Add listener for contoso.com
$appgw = Add-AzApplicationGatewayHttpListener `
  -ApplicationGateway $appgw `
  -Name "listener-contoso" `
  -Protocol Http `
  -FrontendIPConfiguration $fipconfig `
  -FrontendPort $fp80 `
  -HostName "contoso.com"

# Add listener for fabrikam.com
$appgw = Add-AzApplicationGatewayHttpListener `
  -ApplicationGateway $appgw `
  -Name "listener-fabrikam" `
  -Protocol Http `
  -FrontendIPConfiguration $fipconfig `
  -FrontendPort $fp80 `
  -HostName "fabrikam.com"

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Tarefa 4: Criar pools de back-end

Cada componente de aplicação recebe seu próprio pool de back-end. Os pools de back-end podem conter endereços IP, FQDNs, Conjuntos de Dimensionamento de Máquinas Virtuais ou App Services.

### Azure CLI

```bash
# Backend pool for Contoso web frontend
az network application-gateway address-pool create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pool-contoso-web \
  --servers 10.0.1.4 10.0.1.5

# Backend pool for Contoso API
az network application-gateway address-pool create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pool-contoso-api \
  --servers 10.0.1.6 10.0.1.7

# Backend pool for Fabrikam docs
az network application-gateway address-pool create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pool-fabrikam-docs \
  --servers 10.0.1.8

# Backend pool for Fabrikam webhooks
az network application-gateway address-pool create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pool-fabrikam-hooks \
  --servers 10.0.1.9
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"

$appgw = Add-AzApplicationGatewayBackendAddressPool `
  -ApplicationGateway $appgw `
  -Name "pool-contoso-web" `
  -BackendIPAddresses "10.0.1.4", "10.0.1.5"

$appgw = Add-AzApplicationGatewayBackendAddressPool `
  -ApplicationGateway $appgw `
  -Name "pool-contoso-api" `
  -BackendIPAddresses "10.0.1.6", "10.0.1.7"

$appgw = Add-AzApplicationGatewayBackendAddressPool `
  -ApplicationGateway $appgw `
  -Name "pool-fabrikam-docs" `
  -BackendIPAddresses "10.0.1.8"

$appgw = Add-AzApplicationGatewayBackendAddressPool `
  -ApplicationGateway $appgw `
  -Name "pool-fabrikam-hooks" `
  -BackendIPAddresses "10.0.1.9"

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Tarefa 5: Configurar configurações HTTP com investigação personalizada

As configurações HTTP definem como o Application Gateway se comunica com os servidores de back-end. Uma investigação de integridade personalizada permite especificar um caminho, condições de correspondência e intervalo.

### Azure CLI

```bash
# Create custom health probe for the API backend
az network application-gateway probe create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name probe-api-health \
  --protocol Http \
  --host "localhost" \
  --path "/health" \
  --interval 30 \
  --timeout 30 \
  --threshold 3 \
  --match-status-codes "200-399" \
  --match-body "healthy"

# Create HTTP settings for web frontends (port 80)
az network application-gateway http-settings create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name settings-web \
  --port 80 \
  --protocol Http \
  --cookie-based-affinity Disabled \
  --timeout 30

# Create HTTP settings for API backends (port 8080 with custom probe)
az network application-gateway http-settings create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name settings-api \
  --port 8080 \
  --protocol Http \
  --cookie-based-affinity Disabled \
  --timeout 60 \
  --probe probe-api-health
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"

# Create health probe match condition
$match = New-AzApplicationGatewayProbeHealthResponseMatch `
  -StatusCode "200-399" `
  -Body "healthy"

# Add custom probe
$appgw = Add-AzApplicationGatewayProbeConfig `
  -ApplicationGateway $appgw `
  -Name "probe-api-health" `
  -Protocol Http `
  -HostName "localhost" `
  -Path "/health" `
  -Interval 30 `
  -Timeout 30 `
  -UnhealthyThreshold 3 `
  -Match $match

# Add HTTP settings for web
$appgw = Add-AzApplicationGatewayBackendHttpSetting `
  -ApplicationGateway $appgw `
  -Name "settings-web" `
  -Port 80 `
  -Protocol Http `
  -CookieBasedAffinity Disabled `
  -RequestTimeout 30

# Add HTTP settings for API with probe
$probe = Get-AzApplicationGatewayProbeConfig -ApplicationGateway $appgw -Name "probe-api-health"
$appgw = Add-AzApplicationGatewayBackendHttpSetting `
  -ApplicationGateway $appgw `
  -Name "settings-api" `
  -Port 8080 `
  -Protocol Http `
  -CookieBasedAffinity Disabled `
  -RequestTimeout 60 `
  -Probe $probe

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Tarefa 6: Criar regras de roteamento baseadas em caminho

O roteamento baseado em caminho usa mapas de caminho de URL para direcionar solicitações a diferentes pools de back-end com base no padrão de caminho da URL.

### Azure CLI

```bash
# Create URL path map for contoso.com
az network application-gateway url-path-map create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pathmap-contoso \
  --paths "/api/*" \
  --address-pool pool-contoso-api \
  --http-settings settings-api \
  --default-address-pool pool-contoso-web \
  --default-http-settings settings-web

# Create URL path map for fabrikam.com
az network application-gateway url-path-map create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pathmap-fabrikam \
  --paths "/hooks/*" \
  --address-pool pool-fabrikam-hooks \
  --http-settings settings-api \
  --default-address-pool pool-fabrikam-docs \
  --default-http-settings settings-web

# Create path-based routing rule for contoso.com
az network application-gateway rule create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name rule-contoso \
  --rule-type PathBasedRouting \
  --priority 200 \
  --http-listener listener-contoso \
  --url-path-map pathmap-contoso

# Create path-based routing rule for fabrikam.com
az network application-gateway rule create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name rule-fabrikam \
  --rule-type PathBasedRouting \
  --priority 300 \
  --http-listener listener-fabrikam \
  --url-path-map pathmap-fabrikam
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"

$poolContosoWeb = Get-AzApplicationGatewayBackendAddressPool -ApplicationGateway $appgw -Name "pool-contoso-web"
$poolContosoApi = Get-AzApplicationGatewayBackendAddressPool -ApplicationGateway $appgw -Name "pool-contoso-api"
$poolFabrikamDocs = Get-AzApplicationGatewayBackendAddressPool -ApplicationGateway $appgw -Name "pool-fabrikam-docs"
$poolFabrikamHooks = Get-AzApplicationGatewayBackendAddressPool -ApplicationGateway $appgw -Name "pool-fabrikam-hooks"
$settingsWeb = Get-AzApplicationGatewayBackendHttpSetting -ApplicationGateway $appgw -Name "settings-web"
$settingsApi = Get-AzApplicationGatewayBackendHttpSetting -ApplicationGateway $appgw -Name "settings-api"

# Create path rule for Contoso API
$apiPathRule = New-AzApplicationGatewayPathRuleConfig `
  -Name "contoso-api-rule" `
  -Paths "/api/*" `
  -BackendAddressPool $poolContosoApi `
  -BackendHttpSettings $settingsApi

# Create URL path map for Contoso
$appgw = Add-AzApplicationGatewayUrlPathMapConfig `
  -ApplicationGateway $appgw `
  -Name "pathmap-contoso" `
  -PathRules $apiPathRule `
  -DefaultBackendAddressPool $poolContosoWeb `
  -DefaultBackendHttpSettings $settingsWeb

# Create path rule for Fabrikam hooks
$hooksPathRule = New-AzApplicationGatewayPathRuleConfig `
  -Name "fabrikam-hooks-rule" `
  -Paths "/hooks/*" `
  -BackendAddressPool $poolFabrikamHooks `
  -BackendHttpSettings $settingsApi

# Create URL path map for Fabrikam
$appgw = Add-AzApplicationGatewayUrlPathMapConfig `
  -ApplicationGateway $appgw `
  -Name "pathmap-fabrikam" `
  -PathRules $hooksPathRule `
  -DefaultBackendAddressPool $poolFabrikamDocs `
  -DefaultBackendHttpSettings $settingsWeb

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Tarefa 7: Verificar a integridade do back-end

### Azure CLI

```bash
# Check backend health status
az network application-gateway show-backend-health \
  --resource-group rg-appgw-lab \
  --name appgw-multisite \
  --output table
```

### Azure PowerShell

```powershell
Get-AzApplicationGatewayBackendHealth `
  -ResourceGroupName "rg-appgw-lab" `
  -Name "appgw-multisite"
```

### Portal

1. Navegue até o recurso do Application Gateway
2. Selecione **Integridade do back-end** no menu à esquerda em **Monitoramento**
3. Revise o status de integridade de cada pool de back-end e servidores individuais
4. Um servidor saudável mostra o código de status 200 e o status "Healthy"

---

## Exercícios de quebra e correção

### Problema 1: Conflito de ouvinte multi-site (cabeçalho host ausente)

**Sintoma**: Solicitações para fabrikam.com são roteadas inesperadamente para os pools de back-end do contoso.com.

**Causa raiz**: O ouvinte do fabrikam.com foi criado sem o parâmetro `--host-name`, tornando-o um ouvinte básico que captura todo o tráfego não correspondido. Quando dois ouvintes compartilham o mesmo IP de frontend e porta sem cabeçalhos host distintos, a prioridade de roteamento determina qual ouvinte recebe o tráfego.

**Correção**: Atualize o ouvinte para incluir o nome de host correto:

```bash
az network application-gateway http-listener update \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name listener-fabrikam \
  --host-name "fabrikam.com"
```

### Problema 2: Mapa de caminho não correspondendo

**Sintoma**: Solicitações para `contoso.com/api/users` são roteadas para o pool web padrão em vez do pool de API.

**Causa raiz**: A regra de caminho foi configurada como `/api` em vez de `/api/*`. Sem o curinga, apenas correspondências exatas com `/api` serão roteadas para o pool de API. Subcaminhos como `/api/users` são encaminhados para o back-end padrão.

**Correção**: Atualize a regra do mapa de caminho de URL para incluir o curinga:

```bash
az network application-gateway url-path-map update \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pathmap-contoso \
  --default-address-pool pool-contoso-web \
  --default-http-settings settings-web
```

Em seguida, recrie a regra de caminho com o padrão curinga correto `/api/*`.

### Problema 3: Pool de back-end usando porta incorreta

**Sintoma**: A integridade do back-end mostra todos os servidores como não saudáveis com erros de tempo limite de conexão.

**Causa raiz**: As configurações HTTP para o back-end de API estão configuradas para investigar na porta 8080, mas os servidores de back-end escutam apenas na porta 80. A investigação de integridade não consegue estabelecer uma conexão porque nada está escutando na porta de destino.

**Correção**: Atualize as configurações HTTP para usar a porta correta:

```bash
az network application-gateway http-settings update \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name settings-api \
  --port 80
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[{id:"q1", question:"What is the minimum recommended subnet size for an Application Gateway v2 deployment?", options:["/28 (16 addresses)","/26 (64 addresses)","/24 (256 addresses) ✅","/29 (8 addresses)"], correctIndex:2, explanation:"Microsoft recommends a /24 subnet for Application Gateway v2. While the minimum supported size is /26, a /24 provides room for scaling instances and future growth."},{id:"q2", question:"In a multi-site configuration, what determines which listener receives an incoming request?", options:["The routing rule priority number","The Host header in the HTTP request ✅","The source IP address of the client","The order listeners were created"], correctIndex:1, explanation:"Multi-site listeners match incoming requests based on the Host header value. Each listener specifies a host-name parameter that is compared against the Host header to determine routing."},{id:"q3", question:"What happens when a request URL does not match any path rule in a URL path map?", options:["The request is rejected with 404","The request is sent to the default backend pool ✅","The request is forwarded to the first path rule","The gateway returns 502 Bad Gateway"], correctIndex:1, explanation:"When no path rule matches the incoming URL, Application Gateway routes the request to the default backend address pool and default HTTP settings configured in the URL path map."},{id:"q4", question:"Which routing rule type must be used with URL path maps?", options:["Basic","PathBasedRouting ✅","MultiSite","WeightedRouting"], correctIndex:1, explanation:"The PathBasedRouting rule type must be specified when associating a routing rule with a URL path map. Basic rules cannot reference URL path maps."},{id:"q5", question:"What is the effect of setting --priority on Application Gateway routing rules?", options:["It determines the order TLS certificates are evaluated","It sets the weight for load balancing across backends","It determines evaluation order when multiple rules could match ✅","It controls which backend pool receives the most traffic"], correctIndex:2, explanation:"The priority value (1-20000, lower number = higher priority) determines the order in which routing rules are evaluated when multiple rules could potentially match an incoming request."},{id:"q6", question:"A health probe is configured with --match-body 'OK' and the backend returns 'Server OK Ready'. What is the health status?", options:["Healthy, because the response body contains the match string ✅","Unhealthy, because the response body does not exactly equal the match string","Unhealthy, because extra text after the match string is not allowed","Unknown, because body matching requires an exact regex pattern"], correctIndex:0, explanation:"The match-body parameter checks if the response body CONTAINS the specified string. Since 'Server OK Ready' contains 'OK', the probe is considered healthy."}]} />

---

## Limpeza

```bash
# Delete the entire resource group and all resources within it
az group delete --name rg-appgw-lab --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-appgw-lab" -Force
```

:::warning
O Application Gateway v2 cobra aproximadamente $0,27/hora enquanto implantado. Sempre exclua seus recursos de laboratório imediatamente após concluir os exercícios para evitar custos desnecessários.
:::

---

## Principais conclusões

- O Application Gateway requer uma **sub-rede dedicada** sem outros recursos; /24 é o tamanho recomendado
- Ouvintes multi-site diferenciam o tráfego usando o valor do **cabeçalho Host** nas solicitações de entrada
- Regras de roteamento baseadas em caminho usam **mapas de caminho de URL** para direcionar solicitações a diferentes pools de back-end com base no caminho da URL
- Padrões de caminho devem incluir **curingas** (ex.: `/api/*`) para corresponder subcaminhos; caminhos exatos correspondem apenas à string literal
- Investigações de integridade personalizadas suportam **condições de correspondência** tanto para códigos de status quanto para conteúdo do corpo da resposta
- Regras de roteamento requerem um valor de **prioridade**; números menores são avaliados primeiro
- Cada ouvinte pode ser associado a apenas **uma regra de roteamento**
