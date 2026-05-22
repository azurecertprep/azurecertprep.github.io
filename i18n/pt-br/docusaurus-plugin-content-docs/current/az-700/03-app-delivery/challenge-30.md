---
sidebar_position: 6
title: "Challenge 30: Application Gateway scaling and health"
sidebar_label: "Challenge 30"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 30: Escalabilidade e integridade do Application Gateway

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,27/h (SKU WAF_v2)** | **Peso no exame: 15-20%**

:::

:::warning Alerta de custo
O Application Gateway v2 é cobrado por hora mesmo quando ocioso. O SKU WAF_v2 custa aproximadamente $0,443/hora-gateway mais $0,0144/hora-unidade-de-capacidade. Configurações de autoscaling ainda incorrem na cobrança fixa por hora-gateway mesmo com zero instâncias. Exclua o gateway imediatamente após concluir este desafio para evitar cobranças inesperadas.
:::

## Cenário

Você é o engenheiro de plataforma da Relecloud Media, uma empresa de streaming que experimenta variabilidade significativa de tráfego. Durante eventos ao vivo, o tráfego pode saltar de 5.000 para 500.000 conexões simultâneas em minutos. A empresa também opera um recurso de chat ao vivo que requer suporte a WebSocket e realiza implantações com zero tempo de inatividade usando connection draining.

Suas tarefas são:

- Configurar autoscaling para lidar com picos de tráfego sem provisionamento excessivo durante períodos tranquilos
- Implementar health probes personalizados com condições de correspondência para detectar backends não saudáveis com precisão
- Habilitar connection draining para remover backends de forma graciosa durante implantações
- Configurar log de diagnóstico e identificar métricas-chave para planejamento de capacidade

## Visão geral da arquitetura

```
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

## Pré-requisitos

- Assinatura do Azure com acesso de Contributor
- Azure CLI 2.50+ ou módulo Azure PowerShell Az 10.0+
- Workspace do Log Analytics (criado neste laboratório)

---

## Tarefa 1: Implantar o Application Gateway com autoscaling

O modo de autoscaling permite que o Application Gateway escale horizontalmente para mais ou menos instâncias com base na carga de tráfego. Você especifica contagens mínima e máxima de instâncias. Cada instância equivale aproximadamente a 10 unidades de capacidade.

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

1. Navegue até **Criar um recurso** e selecione **Application Gateway**
2. Na guia **Básico**, defina o Nível como **Standard V2**
3. Em **Configurar autoscaling**, defina Autoscale como **Sim**
4. Defina **Contagem mínima de instâncias** como 2 e **Contagem máxima de instâncias** como 10
5. Complete as guias restantes com sua configuração de rede e backend

---

## Tarefa 2: Criar health probes personalizados com condições de correspondência

Health probes personalizados permitem especificar um caminho, códigos de status esperados e uma string de correspondência no corpo da resposta. O probe avalia a resposta com base nesses critérios para determinar a integridade do backend.

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

O connection draining remove graciosamente membros do pool de backend durante manutenção planejada ou implantações. Conexões existentes são permitidas a concluir dentro do timeout configurado antes que o servidor seja removido.

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

1. Navegue até o recurso do Application Gateway
2. Selecione **Configurações de backend** no menu à esquerda
3. Selecione as configurações HTTP que deseja modificar
4. Role até **Connection draining** e alterne para **Sim**
5. Defina o valor de **Drain timeout** em segundos (1-3600)
6. Selecione **Salvar**

---

## Tarefa 4: Habilitar suporte a WebSocket e HTTP/2

O Application Gateway v2 suporta WebSocket nativamente sem configuração adicional. O HTTP/2 é suportado na conexão frontend (cliente-para-gateway).

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

- Conexões WebSocket são encaminhadas de forma transparente pelo Application Gateway; nenhuma configuração especial é necessária
- O timeout das configurações HTTP do backend deve ser definido acima do padrão (ex.: 120 segundos) para conexões WebSocket de longa duração
- O HTTP/2 é suportado apenas na conexão **cliente-para-gateway**; o gateway se comunica com backends via HTTP/1.1
- WebSocket e HTTP/2 podem coexistir no mesmo listener

---

## Tarefa 5: Configurar diagnósticos e logs

O Application Gateway gera logs de diagnóstico para eventos de acesso, desempenho e firewall. Esses logs devem ser explicitamente configurados para coleta.

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

1. Navegue até o recurso do Application Gateway
2. Selecione **Configurações de diagnóstico** em **Monitoramento**
3. Selecione **Adicionar configuração de diagnóstico**
4. Nome: `appgw-diagnostics`
5. Marque todas as categorias de log: Log de acesso, Log de desempenho, Log de firewall
6. Marque **AllMetrics**
7. Em **Detalhes do destino**, selecione **Enviar para workspace do Log Analytics**
8. Escolha seu workspace e selecione **Salvar**

---

## Tarefa 6: Monitorar métricas-chave

As seguintes métricas são críticas para planejamento de capacidade e solução de problemas:

| Métrica | Descrição | Caso de uso |
|---------|-----------|-------------|
| Healthy Host Count | Número de backends saudáveis por pool | Detectar falhas de backend |
| Unhealthy Host Count | Número de backends não saudáveis | Alertar sobre degradação |
| Current Capacity Units | Consumo atual de CU | Monitoramento de autoscale |
| Estimated Billed Capacity Units | CUs mínimas cobradas | Monitoramento de custos |
| Compute Units | Capacidade orientada por CPU | Identificar gargalo de computação |
| Connection Count | Conexões ativas | Planejamento de capacidade |
| Response Status | Detalhamento 2xx/3xx/4xx/5xx | Monitoramento de taxa de erro |
| Backend Response Status | Códigos de status dos backends | Integridade do backend |
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

Uma unidade de capacidade mede o consumo combinado de recursos de uma instância do Application Gateway. Uma unidade de capacidade é o máximo de:

- **2.500 conexões persistentes** (capacidade de conexão)
- **2,22 Mbps de throughput** (capacidade de throughput)
- **1 unidade de computação** = 10 novas conexões/seg para não-TLS, ou 50 conexões TLS/seg com chave RSA de 2048 bits (capacidade de computação)

A mais alta dessas três dimensões determina as unidades de capacidade reais consumidas.

---

## Exercícios de quebra e correção

### Problema 1: Health probe retornando corpo sem correspondência

**Sintoma**: Todos os servidores de backend aparecem como não saudáveis na visualização de integridade do backend. Os servidores estão em execução e respondendo corretamente a requisições HTTP diretas.

**Causa raiz**: O health probe personalizado está configurado com `--match-body "\"status\":\"ok\""` mas a aplicação backend alterou recentemente a resposta do endpoint de saúde de `{"status":"ok"}` para `{"status":"healthy","version":"2.1"}`. A resposta não contém mais a string exata que o probe procura.

**Correção**: Atualize o match body do probe para refletir o novo formato de resposta:

```bash
az network application-gateway probe update \
  --resource-group rg-appgw-scale-lab \
  --gateway-name appgw-autoscale \
  --name probe-streaming \
  --match-body "\"status\":\"healthy\""
```

Alternativamente, use uma string de correspondência mais ampla que é menos provável de quebrar:

```bash
az network application-gateway probe update \
  --resource-group rg-appgw-scale-lab \
  --gateway-name appgw-autoscale \
  --name probe-streaming \
  --match-body "status"
```

### Problema 2: Autoscale não sendo acionado (unidades de capacidade mal configuradas)

**Sintoma**: Durante um teste de carga, os tempos de resposta aumentam significativamente e algumas requisições expiram, mas o Application Gateway permanece em 2 instâncias (mínimo) e não escala horizontalmente.

**Causa raiz**: A configuração de autoscale foi acidentalmente definida com `--max-capacity 2`, tornando-a igual ao mínimo. O gateway não pode escalar além de 2 instâncias independentemente da carga.

**Correção**: Atualize a capacidade máxima para permitir escalabilidade:

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

Verifique a configuração:

```bash
az network application-gateway show \
  --resource-group rg-appgw-scale-lab \
  --name appgw-autoscale \
  --query "autoscaleConfiguration" \
  --output table
```

### Problema 3: Timeout de connection draining muito curto causando conexões descartadas

**Sintoma**: Durante uma implantação, algumas conexões de streaming ativas são encerradas abruptamente. Usuários relatam interrupções breves em seus streams de vídeo durando 1-2 segundos.

**Causa raiz**: O connection draining está habilitado com timeout de 5 segundos. Conexões de streaming de vídeo frequentemente levam mais de 5 segundos para concluir o download do segmento atual. Quando um backend é removido do pool, conexões que não concluíram dentro de 5 segundos são encerradas forçosamente.

**Correção**: Aumente o timeout do connection draining para acomodar conexões de streaming de longa duração:

```bash
az network application-gateway http-settings update \
  --resource-group rg-appgw-scale-lab \
  --gateway-name appgw-autoscale \
  --name defaultSettings \
  --connection-draining-enabled true \
  --connection-draining-timeout 60
```

Para cargas de trabalho de streaming, um timeout de 30-60 segundos é tipicamente apropriado. Para conexões WebSocket que podem persistir indefinidamente, considere usar um timeout mais longo (até 3600 segundos no máximo) ou implementar sinais de encerramento gracioso na sua aplicação.

---

## Verificação de conhecimento

<KnowledgeCheck questions={[{id:"q1", question:"An Application Gateway is configured with min-capacity 2 and max-capacity 10. During a traffic spike, what determines the number of instances that scale out?", options:["The number of backend pool members","The highest consumed capacity unit dimension (compute, connections, or throughput) ✅","The number of routing rules configured","The total number of HTTP requests per second only"], correctIndex:1, explanation:"Autoscaling is driven by capacity unit consumption. A capacity unit is the maximum of three dimensions: compute units (new connections/sec), persistent connections (2,500 per CU), and throughput (2.22 Mbps per CU). The gateway scales to meet whichever dimension is highest."},{id:"q2", question:"A custom health probe is configured with --interval 30 and --threshold 3. How long does it take to mark a backend as unhealthy after it stops responding?", options:["30 seconds","60 seconds","90 seconds (3 failed probes at 30-second intervals) ✅","120 seconds"], correctIndex:2, explanation:"The unhealthy threshold (--threshold) defines how many consecutive probe failures are needed. With interval=30 and threshold=3, it takes 3 x 30 = 90 seconds of consecutive failures before the backend is marked unhealthy."},{id:"q3", question:"What happens to in-flight requests when connection draining is enabled and a backend server is removed from the pool?", options:["All connections are immediately terminated","New connections are blocked but existing ones complete within the drain timeout ✅","The backend continues receiving new connections until timeout expires","Connections are migrated to another backend server"], correctIndex:1, explanation:"Connection draining allows existing connections to complete within the configured timeout period. No new connections are sent to the draining backend. After the timeout expires, any remaining connections are forcibly terminated."},{id:"q4", question:"Which protocol does Application Gateway use between the gateway and backend servers when HTTP/2 is enabled?", options:["HTTP/2 end-to-end","HTTP/1.1 (gateway always uses HTTP/1.1 to backends) ✅","HTTP/2 or HTTP/1.1 depending on backend capability","gRPC over HTTP/2"], correctIndex:1, explanation:"HTTP/2 is only supported on the client-to-gateway (frontend) connection. Application Gateway always communicates with backend servers using HTTP/1.1, regardless of the frontend protocol."},{id:"q5", question:"What is the maximum connection draining timeout value supported by Application Gateway?", options:["60 seconds","300 seconds","1800 seconds","3600 seconds ✅"], correctIndex:3, explanation:"The connection draining timeout can be set between 1 and 3600 seconds (1 hour). This is the maximum time Application Gateway waits for existing connections to complete before forcibly closing them."},{id:"q6", question:"Which diagnostic log category captures information about individual requests processed by Application Gateway?", options:["ApplicationGatewayPerformanceLog","ApplicationGatewayFirewallLog","ApplicationGatewayAccessLog ✅","ApplicationGatewayOperationsLog"], correctIndex:2, explanation:"The ApplicationGatewayAccessLog captures per-request information including caller IP, URL, response latency, return code, and bytes in/out. The PerformanceLog aggregates performance data, and the FirewallLog records WAF evaluations."}]} />

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
O Application Gateway v2 cobra aproximadamente $0,27/hora enquanto implantado. Configurações de autoscaling ainda incorrem na taxa base por hora-gateway mesmo na capacidade mínima. Sempre exclua os recursos do laboratório imediatamente após concluir os exercícios.
:::

---

## Principais conclusões

- O autoscaling usa **unidades de capacidade** como métrica de escalabilidade; cada CU é o máximo das dimensões de computação, conexão e throughput
- A contagem mínima de instâncias garante capacidade de base; a máxima previne custos descontrolados de escalabilidade
- Cada instância fornece aproximadamente **10 unidades de capacidade**
- Health probes personalizados suportam **condições de correspondência** para códigos de status HTTP e strings no corpo da resposta (correspondência de substring)
- O **connection draining** evita interrupção de serviço durante implantações permitindo que conexões existentes sejam concluídas (timeout máximo de 3600s)
- O suporte a **WebSocket** é nativo e não requer configuração especial; aumente o timeout das configurações HTTP do backend para conexões de longa duração
- O **HTTP/2** é apenas frontend; a comunicação gateway-para-backend sempre usa HTTP/1.1
- Métricas-chave para planejamento de capacidade: **Current Capacity Units**, **Healthy Host Count**, **Response Status** e **Throughput**
- Logs de diagnóstico devem ser explicitamente habilitados; o **Access Log** fornece detalhes por requisição para solução de problemas
- Decisões de autoscale levam 1-2 minutos para serem aplicadas; defina a capacidade mínima para lidar com o tráfego de base esperado sem atraso de escalabilidade
