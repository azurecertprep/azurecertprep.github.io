---
sidebar_position: 4
title: "Desafio 28: Fundamentos do Application Gateway"
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

![Challenge 28 - Topologia de Rede](/img/az-700/challenge-28-topology.svg)


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

<KnowledgeCheck questions={[{id:"q1", question:"Qual é o tamanho mínimo de sub-rede recomendado para uma implantação do Application Gateway v2?", options:["/28 (16 endereços)","/26 (64 endereços)","/24 (256 endereços) ✅","/29 (8 endereços)"], correctIndex:2, explanation:"A Microsoft recomenda uma sub-rede /24 para o Application Gateway v2. Embora o tamanho mínimo suportado seja /26, um /24 fornece espaço para escalar instâncias e crescimento futuro."},{id:"q2", question:"Em uma configuração multi-site, o que determina qual listener recebe uma requisição de entrada?", options:["O número de prioridade da regra de roteamento","O cabeçalho Host na requisição HTTP ✅","O endereço IP de origem do cliente","A ordem em que os listeners foram criados"], correctIndex:1, explanation:"Listeners multi-site correspondem requisições de entrada com base no valor do cabeçalho Host. Cada listener especifica um parâmetro host-name que é comparado com o cabeçalho Host para determinar o roteamento."},{id:"q3", question:"O que acontece quando a URL de uma requisição não corresponde a nenhuma regra de caminho em um mapa de caminhos de URL?", options:["A requisição é rejeitada com 404","A requisição é enviada para o backend pool padrão ✅","A requisição é encaminhada para a primeira regra de caminho","O gateway retorna 502 Bad Gateway"], correctIndex:1, explanation:"Quando nenhuma regra de caminho corresponde à URL de entrada, o Application Gateway roteia a requisição para o pool de endereços de backend padrão e as configurações HTTP padrão configuradas no mapa de caminhos de URL."},{id:"q4", question:"Qual tipo de regra de roteamento deve ser usado com mapas de caminhos de URL?", options:["Basic","PathBasedRouting ✅","MultiSite","WeightedRouting"], correctIndex:1, explanation:"O tipo de regra PathBasedRouting deve ser especificado ao associar uma regra de roteamento com um mapa de caminhos de URL. Regras Basic não podem referenciar mapas de caminhos de URL."},{id:"q5", question:"Qual é o efeito de definir --priority nas regras de roteamento do Application Gateway?", options:["Determina a ordem em que os certificados TLS são avaliados","Define o peso para balanceamento de carga entre backends","Determina a ordem de avaliação quando múltiplas regras podem corresponder ✅","Controla qual backend pool recebe mais tráfego"], correctIndex:2, explanation:"O valor de prioridade (1-20000, número menor = maior prioridade) determina a ordem em que as regras de roteamento são avaliadas quando múltiplas regras podem potencialmente corresponder a uma requisição de entrada."},{id:"q6", question:"Uma health probe está configurada com --match-body 'OK' e o backend retorna 'Server OK Ready'. Qual é o status de integridade?", options:["Íntegro, porque o corpo da resposta contém a string de correspondência ✅","Não íntegro, porque o corpo da resposta não é exatamente igual à string de correspondência","Não íntegro, porque texto extra após a string de correspondência não é permitido","Desconhecido, porque a correspondência de corpo requer um padrão regex exato"], correctIndex:0, explanation:"O parâmetro match-body verifica se o corpo da resposta CONTÉM a string especificada. Como 'Server OK Ready' contém 'OK', a probe é considerada íntegra."}]} />

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
