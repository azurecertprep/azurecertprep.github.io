---
sidebar_position: 6
title: "Desafio 30: Application Gateway Escalonamento e Integridade"
sidebar_label: "Challenge 30"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 30: Escalabilidade e integridade do Application Gateway

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,27/h (SKU WAF_v2)** | **Peso no exame: 15-20%**

:::

:::warning Alerta de custo
O Application Gateway v2 Ã© cobrado por hora mesmo quando ocioso. O SKU WAF_v2 custa aproximadamente $0,443/hora-gateway mais $0,0144/hora-unidade-de-capacidade. ConfiguraÃ§Ãµes de autoscaling ainda incorrem na cobranÃ§a fixa por hora-gateway mesmo com zero instÃ¢ncias. Exclua o gateway imediatamente apÃ³s concluir este desafio para evitar cobranÃ§as inesperadas.
:::

## CenÃ¡rio

VocÃª Ã© o engenheiro de plataforma da Relecloud Media, uma empresa de streaming que experimenta variabilidade significativa de trÃ¡fego. Durante eventos ao vivo, o trÃ¡fego pode saltar de 5.000 para 500.000 conexÃµes simultÃ¢neas em minutos. A empresa tambÃ©m opera um recurso de chat ao vivo que requer suporte a WebSocket e realiza implantaÃ§Ãµes com zero tempo de inatividade usando connection draining.

Suas tarefas sÃ£o:

- Configurar autoscaling para lidar com picos de trÃ¡fego sem provisionamento excessivo durante perÃ­odos tranquilos
- Implementar health probes personalizados com condiÃ§Ãµes de correspondÃªncia para detectar backends nÃ£o saudÃ¡veis com precisÃ£o
- Habilitar connection draining para remover backends de forma graciosa durante implantaÃ§Ãµes
- Configurar log de diagnÃ³stico e identificar mÃ©tricas-chave para planejamento de capacidade

## VisÃ£o geral da arquitetura

```json
[Traffic Spike]
      |
      v
[Application Gateway v2 - Autoscale: min 2, max 10]
      |
      +--> [Health Probe: /health (match: "status":"ok")]
      |
      +--> [Backend Pool - Streaming Servers]
      |         |--- Connection Draining (30s timeout)
      |
      +--> [Backend Pool - Chat WebSocket Servers]
      |
      +--> [Diagnostic Logs] --> Log Analytics Workspace
```

## PrÃ©-requisitos

- Assinatura do Azure com acesso de Contributor
- Azure CLI 2.50+ ou mÃ³dulo Azure PowerShell Az 10.0+
- Workspace do Log Analytics (criado neste laboratÃ³rio)

---

## Tarefa 1: Implantar o Application Gateway com autoscaling

O modo de autoscaling permite que o Application Gateway escale horizontalmente para mais ou menos instÃ¢ncias com base na carga de trÃ¡fego. VocÃª especifica contagens mÃ­nima e mÃ¡xima de instÃ¢ncias. Cada instÃ¢ncia equivale aproximadamente a 10 unidades de capacidade.

### Azure CLI

```bash
# Create resource group
az group create \
  --name rg-appgw-scale-lab \
  --location eastus2

# Create VNet and subnet
az network vnet create \
  --resource-group rg-appgw-scale-lab \
  --name vnet-appgw-scale \
  --address-prefixes 10.0.0.0/16 \
  --subnet-name AppGwSubnet \
  --subnet-prefixes 10.0.0.0/24

# Create backend subnet
az network vnet subnet create \
  --resource-group rg-appgw-scale-lab \
  --vnet-name vnet-appgw-scale \
  --name BackendSubnet \
  --address-prefixes 10.0.1.0/24

# Create public IP
az network public-ip create \
  --resource-group rg-appgw-scale-lab \
  --name pip-appgw-scale \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3

# Create Application Gateway with autoscaling (min 2, max 10)
az network application-gateway create \
  --resource-group rg-appgw-scale-lab \
  --name appgw-autoscale \
  --location eastus2 \
  --sku Standard_v2 \
  --min-capacity 2 \
  --max-capacity 10 \
  --vnet-name vnet-appgw-scale \
  --subnet AppGwSubnet \
  --public-ip-address pip-appgw-scale \
  --frontend-port 80 \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --priority 100
```

### Azure PowerShell

```powershell
# Create resource group
New-AzResourceGroup -Name "rg-appgw-scale-lab" -Location "eastus2"

# Create subnet configurations
$appgwSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "AppGwSubnet" `
  -AddressPrefix "10.0.0.0/24"

$backendSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "BackendSubnet" `
  -AddressPrefix "10.0.1.0/24"

# Create VNet
$vnet = New-AzVirtualNetwork `
  -ResourceGroupName "rg-appgw-scale-lab" `
  -Name "vnet-appgw-scale" `
  -Location "eastus2" `
  -AddressPrefix "10.0.0.0/16" `
  -Subnet $appgwSubnet, $backendSubnet

# Create public IP
$pip = New-AzPublicIpAddress `
  -ResourceGroupName "rg-appgw-scale-lab" `
  -Name "pip-appgw-scale" `
  -Location "eastus2" `
  -Sku Standard `
  -AllocationMethod Static `
  -Zone 1, 2, 3

# Configure autoscale
$autoscaleConfig = New-AzApplicationGatewayAutoscaleConfiguration `
  -MinCapacity 2 `
  -MaxCapacity 10

# Create SKU (no Capacity when using autoscale)
$sku = New-AzApplicationGatewaySku -Name Standard_v2 -Tier Standard_v2

# Configure gateway IP
$subnet = Get-AzVirtualNetworkSubnetConfig -Name "AppGwSubnet" -VirtualNetwork $vnet
$gipconfig = New-AzApplicationGatewayIPConfiguration -Name "appGwIPConfig" -Subnet $subnet

# Configure frontend
$fipconfig = New-AzApplicationGatewayFrontendIPConfig -Name "appGwFrontendIP" -PublicIPAddress $pip
$frontendPort = New-AzApplicationGatewayFrontendPort -Name "port80" -Port 80

# Configure backend
$pool = New-AzApplicationGatewayBackendAddressPool -Name "defaultPool"
$settings = New-AzApplicationGatewayBackendHttpSetting `
  -Name "defaultSettings" -Port 80 -Protocol Http -RequestTimeout 30

# Configure listener and rule
$listener = New-AzApplicationGatewayHttpListener `
  -Name "defaultListener" -Protocol Http `
  -FrontendIPConfiguration $fipconfig -FrontendPort $frontendPort

$rule = New-AzApplicationGatewayRequestRoutingRule `
  -Name "defaultRule" -RuleType Basic -Priority 100 `
  -HttpListener $listener -BackendAddressPool $pool -BackendHttpSettings $settings

# Create the gateway with autoscale
New-AzApplicationGateway `
  -ResourceGroupName "rg-appgw-scale-lab" `
  -Name "appgw-autoscale" `
  -Location "eastus2" `
  -Sku $sku `
  -AutoscaleConfiguration $autoscaleConfig `
  -GatewayIpConfigurations $gipconfig `
  -FrontendIpConfigurations $fipconfig `
  -FrontendPorts $frontendPort `
  -BackendAddressPools $pool `
  -BackendHttpSettingsCollection $settings `
  -HttpListeners $listener `
  -RequestRoutingRules $rule
```

### Portal

1. Navegue atÃ© **Criar um recurso** e selecione **Application Gateway**
2. Na guia **BÃ¡sico**, defina o NÃ­vel como **Standard V2**
3. Em **Configurar autoscaling**, defina Autoscale como **Sim**
4. Defina **Contagem mÃ­nima de instÃ¢ncias** como 2 e **Contagem mÃ¡xima de instÃ¢ncias** como 10
5. Complete as guias restantes com sua configuraÃ§Ã£o de rede e backend

---

## Tarefa 2: Criar health probes personalizados com condiÃ§Ãµes de correspondÃªncia

Health probes personalizados permitem especificar um caminho, cÃ³digos de status esperados e uma string de correspondÃªncia no corpo da resposta. O probe avalia a resposta com base nesses critÃ©rios para determinar a integridade do backend.

### Azure CLI

```bash
# Create custom probe with body match condition
az network application-gateway probe create \
  --resource-group rg-appgw-scale-lab \
  --gateway-name appgw-autoscale \
  --name probe-streaming \
  --protocol Http \
  --host "localhost" \
  --path "/health" \
  --interval 15 \
  --timeout 10 \
  --threshold 3 \
  --match-status-codes "200" \
  --match-body "\"status\":\"ok\""

# Create probe for WebSocket servers (TCP-based for ws:// endpoints)
az network application-gateway probe create \
  --resource-group rg-appgw-scale-lab \
  --gateway-name appgw-autoscale \
  --name probe-chat \
  --protocol Http \
  --host "localhost" \
  --path "/ws/health" \
  --interval 10 \
  --timeout 5 \
  --threshold 2 \
  --match-status-codes "200-299"

# Associate probe with HTTP settings
az network application-gateway http-settings update \
  --resource-group rg-appgw-scale-lab \
  --gateway-name appgw-autoscale \
  --name defaultSettings \
  --probe probe-streaming
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-scale-lab" -Name "appgw-autoscale"

# Create match condition for streaming probe
$match = New-AzApplicationGatewayProbeHealthResponseMatch `
  -StatusCode "200" `
  -Body '"status":"ok"'

# Add custom probe
$appgw = Add-AzApplicationGatewayProbeConfig `
  -ApplicationGateway $appgw `
  -Name "probe-streaming" `
  -Protocol Http `
  -HostName "localhost" `
  -Path "/health" `
  -Interval 15 `
  -Timeout 10 `
  -UnhealthyThreshold 3 `
  -Match $match

# Create match for chat probe
$matchChat = New-AzApplicationGatewayProbeHealthResponseMatch `
  -StatusCode "200-299"

$appgw = Add-AzApplicationGatewayProbeConfig `
  -ApplicationGateway $appgw `
  -Name "probe-chat" `
  -Protocol Http `
  -HostName "localhost" `
  -Path "/ws/health" `
  -Interval 10 `
  -Timeout 5 `
  -UnhealthyThreshold 2 `
  -Match $matchChat

# Update existing HTTP settings to use the probe
$probe = Get-AzApplicationGatewayProbeConfig -ApplicationGateway $appgw -Name "probe-streaming"
$appgw = Set-AzApplicationGatewayBackendHttpSetting `
  -ApplicationGateway $appgw `
  -Name "defaultSettings" `
  -Port 80 `
  -Protocol Http `
  -RequestTimeout 30 `
  -CookieBasedAffinity Disabled `
  -Probe $probe

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Tarefa 3: Habilitar connection draining

O connection draining remove graciosamente membros do pool de backend durante manutenÃ§Ã£o planejada ou implantaÃ§Ãµes. ConexÃµes existentes sÃ£o permitidas a concluir dentro do timeout configurado antes que o servidor seja removido.

### Azure CLI

```bash
# Enable connection draining on HTTP settings with 30-second timeout
az network application-gateway http-settings update \
  --resource-group rg-appgw-scale-lab \
  --gateway-name appgw-autoscale \
  --name defaultSettings \
  --connection-draining-enabled true \
  --connection-draining-timeout 30

# Create separate HTTP settings for chat with longer drain timeout
az network application-gateway http-settings create \
  --resource-group rg-appgw-scale-lab \
  --gateway-name appgw-autoscale \
  --name settings-chat \
  --port 80 \
  --protocol Http \
  --cookie-based-affinity Enabled \
  --timeout 120 \
  --connection-draining-enabled true \
  --connection-draining-timeout 60 \
  --probe probe-chat
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-scale-lab" -Name "appgw-autoscale"

# Create connection draining configuration
$draining = New-AzApplicationGatewayConnectionDraining -Enabled $true -DrainTimeoutInSec 30

# Update HTTP settings with connection draining
$probe = Get-AzApplicationGatewayProbeConfig -ApplicationGateway $appgw -Name "probe-streaming"
$appgw = Set-AzApplicationGatewayBackendHttpSetting `
  -ApplicationGateway $appgw `
  -Name "defaultSettings" `
  -Port 80 `
  -Protocol Http `
  -RequestTimeout 30 `
  -CookieBasedAffinity Disabled `
  -ConnectionDraining $draining `
  -Probe $probe

# Create chat settings with longer drain timeout
$drainingChat = New-AzApplicationGatewayConnectionDraining -Enabled $true -DrainTimeoutInSec 60
$probeChat = Get-AzApplicationGatewayProbeConfig -ApplicationGateway $appgw -Name "probe-chat"

$appgw = Add-AzApplicationGatewayBackendHttpSetting `
  -ApplicationGateway $appgw `
  -Name "settings-chat" `
  -Port 80 `
  -Protocol Http `
  -CookieBasedAffinity Enabled `
  -RequestTimeout 120 `
  -ConnectionDraining $drainingChat `
  -Probe $probeChat

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

### Portal

1. Navegue atÃ© o recurso do Application Gateway
2. Selecione **ConfiguraÃ§Ãµes de backend** no menu Ã  esquerda
3. Selecione as configuraÃ§Ãµes HTTP que deseja modificar
4. Role atÃ© **Connection draining** e alterne para **Sim**
5. Defina o valor de **Drain timeout** em segundos (1-3600)
6. Selecione **Salvar**

---

## Tarefa 4: Habilitar suporte a WebSocket e HTTP/2

O Application Gateway v2 suporta WebSocket nativamente sem configuraÃ§Ã£o adicional. O HTTP/2 Ã© suportado na conexÃ£o frontend (cliente-para-gateway).

### Azure CLI

```bash
# Enable HTTP/2 on the Application Gateway
az network application-gateway update \
  --resource-group rg-appgw-scale-lab \
  --name appgw-autoscale \
  --set enableHttp2=true

# Verify HTTP/2 and WebSocket status
az network application-gateway show \
  --resource-group rg-appgw-scale-lab \
  --name appgw-autoscale \
  --query "{enableHttp2:enableHttp2}" \
  --output table
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-scale-lab" -Name "appgw-autoscale"

# Enable HTTP/2
$appgw.EnableHttp2 = $true

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

### Pontos-chave sobre WebSocket e HTTP/2

- ConexÃµes WebSocket sÃ£o encaminhadas de forma transparente pelo Application Gateway; nenhuma configuraÃ§Ã£o especial Ã© necessÃ¡ria
- O timeout das configuraÃ§Ãµes HTTP do backend deve ser definido acima do padrÃ£o (ex.: 120 segundos) para conexÃµes WebSocket de longa duraÃ§Ã£o
- O HTTP/2 Ã© suportado apenas na conexÃ£o **cliente-para-gateway**; o gateway se comunica com backends via HTTP/1.1
- WebSocket e HTTP/2 podem coexistir no mesmo listener

---

## Tarefa 5: Configurar diagnÃ³sticos e logs

O Application Gateway gera logs de diagnÃ³stico para eventos de acesso, desempenho e firewall. Esses logs devem ser explicitamente configurados para coleta.

### Azure CLI

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group rg-appgw-scale-lab \
  --workspace-name law-appgw-diagnostics \
  --location eastus2

# Get the Application Gateway resource ID
APPGW_ID=$(az network application-gateway show \
  --resource-group rg-appgw-scale-lab \
  --name appgw-autoscale \
  --query id --output tsv)

# Get the Log Analytics workspace ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group rg-appgw-scale-lab \
  --workspace-name law-appgw-diagnostics \
  --query id --output tsv)

# Create diagnostic settings to send all logs and metrics
az monitor diagnostic-settings create \
  --name "appgw-diagnostics" \
  --resource "$APPGW_ID" \
  --workspace "$WORKSPACE_ID" \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

### Azure PowerShell

```powershell
# Create Log Analytics workspace
$workspace = New-AzOperationalInsightsWorkspace `
  -ResourceGroupName "rg-appgw-scale-lab" `
  -Name "law-appgw-diagnostics" `
  -Location "eastus2"

# Get Application Gateway resource
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-scale-lab" -Name "appgw-autoscale"

# Enable diagnostic settings
Set-AzDiagnosticSetting `
  -ResourceId $appgw.Id `
  -Name "appgw-diagnostics" `
  -WorkspaceId $workspace.ResourceId `
  -Enabled $true `
  -Category "ApplicationGatewayAccessLog", "ApplicationGatewayPerformanceLog", "ApplicationGatewayFirewallLog" `
  -MetricCategory "AllMetrics"
```

### Portal

1. Navegue atÃ© o recurso do Application Gateway
2. Selecione **ConfiguraÃ§Ãµes de diagnÃ³stico** em **Monitoramento**
3. Selecione **Adicionar configuraÃ§Ã£o de diagnÃ³stico**
4. Nome: `appgw-diagnostics`
5. Marque todas as categorias de log: Log de acesso, Log de desempenho, Log de firewall
6. Marque **AllMetrics**
7. Em **Detalhes do destino**, selecione **Enviar para workspace do Log Analytics**
8. Escolha seu workspace e selecione **Salvar**

---

## Tarefa 6: Monitorar mÃ©tricas-chave

As seguintes mÃ©tricas sÃ£o crÃ­ticas para planejamento de capacidade e soluÃ§Ã£o de problemas:

| MÃ©trica | DescriÃ§Ã£o | Caso de uso |
|---------|-----------|-------------|
| Healthy Host Count | NÃºmero de backends saudÃ¡veis por pool | Detectar falhas de backend |
| Unhealthy Host Count | NÃºmero de backends nÃ£o saudÃ¡veis | Alertar sobre degradaÃ§Ã£o |
| Current Capacity Units | Consumo atual de CU | Monitoramento de autoscale |
| Estimated Billed Capacity Units | CUs mÃ­nimas cobradas | Monitoramento de custos |
| Compute Units | Capacidade orientada por CPU | Identificar gargalo de computaÃ§Ã£o |
| Connection Count | ConexÃµes ativas | Planejamento de capacidade |
| Response Status | Detalhamento 2xx/3xx/4xx/5xx | Monitoramento de taxa de erro |
| Backend Response Status | CÃ³digos de status dos backends | Integridade do backend |
| Throughput | Bytes/segundo servidos | Monitoramento de largura de banda |

### Azure CLI

```bash
# Query current capacity units (last 1 hour, 5-minute intervals)
az monitor metrics list \
  --resource "$APPGW_ID" \
  --metric "CapacityUnits" \
  --interval PT5M \
  --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --output table

# Query healthy host count
az monitor metrics list \
  --resource "$APPGW_ID" \
  --metric "HealthyHostCount" \
  --interval PT1M \
  --output table

# Query response status breakdown
az monitor metrics list \
  --resource "$APPGW_ID" \
  --metric "ResponseStatus" \
  --interval PT5M \
  --output table
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-scale-lab" -Name "appgw-autoscale"

# Get capacity units metric
Get-AzMetric `
  -ResourceId $appgw.Id `
  -MetricName "CapacityUnits" `
  -TimeGrain 00:05:00 `
  -StartTime (Get-Date).AddHours(-1) `
  -EndTime (Get-Date)

# Get healthy host count
Get-AzMetric `
  -ResourceId $appgw.Id `
  -MetricName "HealthyHostCount" `
  -TimeGrain 00:01:00 `
  -StartTime (Get-Date).AddHours(-1) `
  -EndTime (Get-Date)
```

### Entendendo unidades de capacidade

Uma unidade de capacidade mede o consumo combinado de recursos de uma instÃ¢ncia do Application Gateway. Uma unidade de capacidade Ã© o mÃ¡ximo de:

- **2.500 conexÃµes persistentes** (capacidade de conexÃ£o)
- **2,22 Mbps de throughput** (capacidade de throughput)
- **1 unidade de computaÃ§Ã£o** = 10 novas conexÃµes/seg para nÃ£o-TLS, ou 50 conexÃµes TLS/seg com chave RSA de 2048 bits (capacidade de computaÃ§Ã£o)

A mais alta dessas trÃªs dimensÃµes determina as unidades de capacidade reais consumidas.

---

## ExercÃ­cios de quebra e correÃ§Ã£o

### Problema 1: Health probe retornando corpo sem correspondÃªncia

**Sintoma**: Todos os servidores de backend aparecem como nÃ£o saudÃ¡veis na visualizaÃ§Ã£o de integridade do backend. Os servidores estÃ£o em execuÃ§Ã£o e respondendo corretamente a requisiÃ§Ãµes HTTP diretas.

**Causa raiz**: O health probe personalizado estÃ¡ configurado com `--match-body "\"status\":\"ok\""` mas a aplicaÃ§Ã£o backend alterou recentemente a resposta do endpoint de saÃºde de `{"status":"ok"}` para `{"status":"healthy","version":"2.1"}`. A resposta nÃ£o contÃ©m mais a string exata que o probe procura.

**CorreÃ§Ã£o**: Atualize o match body do probe para refletir o novo formato de resposta:

```bash
az network application-gateway probe update \
  --resource-group rg-appgw-scale-lab \
  --gateway-name appgw-autoscale \
  --name probe-streaming \
  --match-body "\"status\":\"healthy\""
```

Alternativamente, use uma string de correspondÃªncia mais ampla que Ã© menos provÃ¡vel de quebrar:

```bash
az network application-gateway probe update \
  --resource-group rg-appgw-scale-lab \
  --gateway-name appgw-autoscale \
  --name probe-streaming \
  --match-body "status"
```

### Problema 2: Autoscale nÃ£o sendo acionado (unidades de capacidade mal configuradas)

**Sintoma**: Durante um teste de carga, os tempos de resposta aumentam significativamente e algumas requisiÃ§Ãµes expiram, mas o Application Gateway permanece em 2 instÃ¢ncias (mÃ­nimo) e nÃ£o escala horizontalmente.

**Causa raiz**: A configuraÃ§Ã£o de autoscale foi acidentalmente definida com `--max-capacity 2`, tornando-a igual ao mÃ­nimo. O gateway nÃ£o pode escalar alÃ©m de 2 instÃ¢ncias independentemente da carga.

**CorreÃ§Ã£o**: Atualize a capacidade mÃ¡xima para permitir escalabilidade:

```bash
az network application-gateway update \
  --resource-group rg-appgw-scale-lab \
  --name appgw-autoscale \
  --max-capacity 10
```

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-scale-lab" -Name "appgw-autoscale"
$appgw.AutoscaleConfiguration.MaxCapacity = 10
$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

Verifique a configuraÃ§Ã£o:

```bash
az network application-gateway show \
  --resource-group rg-appgw-scale-lab \
  --name appgw-autoscale \
  --query "autoscaleConfiguration" \
  --output table
```

### Problema 3: Timeout de connection draining muito curto causando conexÃµes descartadas

**Sintoma**: Durante uma implantaÃ§Ã£o, algumas conexÃµes de streaming ativas sÃ£o encerradas abruptamente. UsuÃ¡rios relatam interrupÃ§Ãµes breves em seus streams de vÃ­deo durando 1-2 segundos.

**Causa raiz**: O connection draining estÃ¡ habilitado com timeout de 5 segundos. ConexÃµes de streaming de vÃ­deo frequentemente levam mais de 5 segundos para concluir o download do segmento atual. Quando um backend Ã© removido do pool, conexÃµes que nÃ£o concluÃ­ram dentro de 5 segundos sÃ£o encerradas forÃ§osamente.

**CorreÃ§Ã£o**: Aumente o timeout do connection draining para acomodar conexÃµes de streaming de longa duraÃ§Ã£o:

```bash
az network application-gateway http-settings update \
  --resource-group rg-appgw-scale-lab \
  --gateway-name appgw-autoscale \
  --name defaultSettings \
  --connection-draining-enabled true \
  --connection-draining-timeout 60
```

Para cargas de trabalho de streaming, um timeout de 30-60 segundos Ã© tipicamente apropriado. Para conexÃµes WebSocket que podem persistir indefinidamente, considere usar um timeout mais longo (atÃ© 3600 segundos no mÃ¡ximo) ou implementar sinais de encerramento gracioso na sua aplicaÃ§Ã£o.

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[{id:"q1", question:"Um Application Gateway está configurado com min-capacity 2 e max-capacity 10. Durante um pico de tráfego, o que determina o número de instâncias que escalam?", options:["O número de membros do backend pool","A dimensão de unidade de capacidade mais consumida (computação, conexões ou throughput) ✅","O número de regras de roteamento configuradas","O número total de requisições HTTP por segundo apenas"], correctIndex:1, explanation:"O autoscaling é orientado pelo consumo de unidades de capacidade. Uma unidade de capacidade é o máximo de três dimensões: unidades de computação (novas conexões/seg), conexões persistentes (2.500 por CU) e throughput (2,22 Mbps por CU). O gateway escala para atender a dimensão que estiver mais alta."},{id:"q2", question:"Uma health probe personalizada está configurada com --interval 30 e --threshold 3. Quanto tempo leva para marcar um backend como não íntegro após ele parar de responder?", options:["30 segundos","60 segundos","90 segundos (3 probes com falha em intervalos de 30 segundos) ✅","120 segundos"], correctIndex:2, explanation:"O limite de não íntegro (--threshold) define quantas falhas consecutivas de probe são necessárias. Com interval=30 e threshold=3, leva 3 x 30 = 90 segundos de falhas consecutivas antes que o backend seja marcado como não íntegro."},{id:"q3", question:"O que acontece com requisições em andamento quando o connection draining está habilitado e um servidor de backend é removido do pool?", options:["Todas as conexões são imediatamente terminadas","Novas conexões são bloqueadas, mas as existentes completam dentro do timeout de drenagem ✅","O backend continua recebendo novas conexões até o timeout expirar","As conexões são migradas para outro servidor de backend"], correctIndex:1, explanation:"O connection draining permite que conexões existentes completem dentro do período de timeout configurado. Nenhuma nova conexão é enviada para o backend em drenagem. Após o timeout expirar, quaisquer conexões restantes são terminadas forçadamente."},{id:"q4", question:"Qual protocolo o Application Gateway usa entre o gateway e os servidores de backend quando HTTP/2 está habilitado?", options:["HTTP/2 de ponta a ponta","HTTP/1.1 (o gateway sempre usa HTTP/1.1 para backends) ✅","HTTP/2 ou HTTP/1.1 dependendo da capacidade do backend","gRPC sobre HTTP/2"], correctIndex:1, explanation:"HTTP/2 é suportado apenas na conexão cliente-para-gateway (frontend). O Application Gateway sempre se comunica com servidores de backend usando HTTP/1.1, independentemente do protocolo do frontend."},{id:"q5", question:"Qual é o valor máximo de timeout de connection draining suportado pelo Application Gateway?", options:["60 segundos","300 segundos","1800 segundos","3600 segundos ✅"], correctIndex:3, explanation:"O timeout de connection draining pode ser definido entre 1 e 3600 segundos (1 hora). Este é o tempo máximo que o Application Gateway espera para conexões existentes completarem antes de fechá-las forçadamente."},{id:"q6", question:"Qual categoria de log de diagnóstico captura informações sobre requisições individuais processadas pelo Application Gateway?", options:["ApplicationGatewayPerformanceLog","ApplicationGatewayFirewallLog","ApplicationGatewayAccessLog ✅","ApplicationGatewayOperationsLog"], correctIndex:2, explanation:"O ApplicationGatewayAccessLog captura informações por requisição incluindo IP do chamador, URL, latência de resposta, código de retorno e bytes de entrada/saída. O PerformanceLog agrega dados de desempenho e o FirewallLog registra avaliações do WAF."}]} />

---

## Limpeza

```bash
# Delete the entire resource group and all resources within it
az group delete --name rg-appgw-scale-lab --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-appgw-scale-lab" -Force
```

:::warning
O Application Gateway v2 cobra aproximadamente $0,27/hora enquanto implantado. ConfiguraÃ§Ãµes de autoscaling ainda incorrem na taxa base por hora-gateway mesmo na capacidade mÃ­nima. Sempre exclua os recursos do laboratÃ³rio imediatamente apÃ³s concluir os exercÃ­cios.
:::

---

## Principais conclusÃµes

- O autoscaling usa **unidades de capacidade** como mÃ©trica de escalabilidade; cada CU Ã© o mÃ¡ximo das dimensÃµes de computaÃ§Ã£o, conexÃ£o e throughput
- A contagem mÃ­nima de instÃ¢ncias garante capacidade de base; a mÃ¡xima previne custos descontrolados de escalabilidade
- Cada instÃ¢ncia fornece aproximadamente **10 unidades de capacidade**
- Health probes personalizados suportam **condiÃ§Ãµes de correspondÃªncia** para cÃ³digos de status HTTP e strings no corpo da resposta (correspondÃªncia de substring)
- O **connection draining** evita interrupÃ§Ã£o de serviÃ§o durante implantaÃ§Ãµes permitindo que conexÃµes existentes sejam concluÃ­das (timeout mÃ¡ximo de 3600s)
- O suporte a **WebSocket** Ã© nativo e nÃ£o requer configuraÃ§Ã£o especial; aumente o timeout das configuraÃ§Ãµes HTTP do backend para conexÃµes de longa duraÃ§Ã£o
- O **HTTP/2** Ã© apenas frontend; a comunicaÃ§Ã£o gateway-para-backend sempre usa HTTP/1.1
- MÃ©tricas-chave para planejamento de capacidade: **Current Capacity Units**, **Healthy Host Count**, **Response Status** e **Throughput**
- Logs de diagnÃ³stico devem ser explicitamente habilitados; o **Access Log** fornece detalhes por requisiÃ§Ã£o para soluÃ§Ã£o de problemas
- DecisÃµes de autoscale levam 1-2 minutos para serem aplicadas; defina a capacidade mÃ­nima para lidar com o trÃ¡fego de base esperado sem atraso de escalabilidade
