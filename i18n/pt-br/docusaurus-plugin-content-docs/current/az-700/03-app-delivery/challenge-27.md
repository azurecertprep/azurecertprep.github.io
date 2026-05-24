---
sidebar_position: 3
sidebar_label: "Challenge 27"
title: "Desafio 27: Perfis e Roteamento do Traffic Manager"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 27: Perfis e roteamento do Traffic Manager

:::info Tempo e custo estimados
**45-60 minutos** | **~$0,01** (apenas consultas DNS, sem computação) | **Peso no exame: 10-15%**
:::

## Cenário

O Woodgrove Bank é uma empresa multinacional de serviços financeiros com operações na América do Norte, Europa e Ásia-Pacífico. Eles necessitam de roteamento de tráfego baseado em DNS para direcionar os usuários à implantação regional mais próxima para desempenho ideal. Dentro de cada região, um failover baseado em prioridade garante alta disponibilidade entre pontos de extremidade primários e secundários. Requisitos de conformidade determinam que os usuários na União Europeia devem ser roteados exclusivamente para pontos de extremidade hospedados na UE. A equipe de operações precisa de detecção rápida de failover com verificações de integridade personalizadas.

Seu trabalho é criar perfis do Traffic Manager usando diferentes métodos de roteamento, configurar perfis aninhados para roteamento hierárquico, configurar monitoramento de pontos de extremidade com caminhos e cabeçalhos personalizados e configurar intervalos de failover rápido.

## Habilidades do exame abordadas

| Habilidade | Peso |
|-------|--------|
| Configurar métodos de roteamento do Traffic Manager (Priority, Weighted, Performance, Geographic, MultiValue, Subnet) | Alto |
| Configurar perfis aninhados do Traffic Manager | Alto |
| Configurar monitoramento de pontos de extremidade e verificações de integridade | Médio |
| Configurar tipos de ponto de extremidade (Azure, External, Nested) | Médio |
| Configurar TTL e intervalos de failover rápido | Médio |

## Pré-requisitos

- Assinatura do Azure com função de Contributor
- Azure CLI 2.60+ ou Azure PowerShell Az 12.0+
- Compreensão básica de resolução DNS e TTL
- Web Apps ou IPs públicos implantados em múltiplas regiões (ou use os comandos de configuração abaixo)

## Tarefa 1: Criar um perfil de roteamento por desempenho

Implante um perfil do Traffic Manager com roteamento Performance para direcionar os usuários à região de menor latência.

### Azure CLI

```bash
# Set variables
RG="rg-woodgrove-tm"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Create Traffic Manager profile with Performance routing
az network traffic-manager profile create \
  --resource-group $RG \
  --name tm-woodgrove-performance \
  --routing-method Performance \
  --unique-dns-name woodgrove-perf-demo \
  --ttl 30 \
  --protocol HTTPS \
  --port 443 \
  --path "/health" \
  --interval 10 \
  --timeout 5 \
  --max-failures 3

# Add Azure endpoint (East US web app)
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-performance \
  --type azureEndpoints \
  --name ep-eastus \
  --target-resource-id /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Web/sites/app-woodgrove-eastus \
  --endpoint-status Enabled

# Add Azure endpoint (West Europe web app)
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-performance \
  --type azureEndpoints \
  --name ep-westeurope \
  --target-resource-id /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Web/sites/app-woodgrove-westeurope \
  --endpoint-status Enabled

# Add external endpoint (Asia-Pacific third-party CDN)
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-performance \
  --type externalEndpoints \
  --name ep-asiapacific \
  --target "app-woodgrove-apac.contoso.com" \
  --endpoint-location "Southeast Asia" \
  --endpoint-status Enabled
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-woodgrove-tm"
$location = "eastus"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Create Traffic Manager profile with Performance routing
New-AzTrafficManagerProfile `
  -ResourceGroupName $rg `
  -Name "tm-woodgrove-performance" `
  -TrafficRoutingMethod Performance `
  -RelativeDnsName "woodgrove-perf-demo" `
  -Ttl 30 `
  -MonitorProtocol HTTPS `
  -MonitorPort 443 `
  -MonitorPath "/health" `
  -MonitorIntervalInSeconds 10 `
  -MonitorTimeoutInSeconds 5 `
  -MonitorToleratedNumberOfFailures 3

# Add Azure endpoint (East US)
$webAppEastUS = Get-AzWebApp -ResourceGroupName $rg -Name "app-woodgrove-eastus"
New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-performance" `
  -Type AzureEndpoints `
  -Name "ep-eastus" `
  -TargetResourceId $webAppEastUS.Id `
  -EndpointStatus Enabled

# Add external endpoint (Asia-Pacific)
New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-performance" `
  -Type ExternalEndpoints `
  -Name "ep-asiapacific" `
  -Target "app-woodgrove-apac.contoso.com" `
  -EndpointLocation "Southeast Asia" `
  -EndpointStatus Enabled
```

### Portal

1. Navegue até **Traffic Manager profiles** > **Create**.
2. Nome: `tm-woodgrove-performance`, Método de roteamento: **Performance**, Nome DNS: `woodgrove-perf-demo`.
3. Em **Configuration**: Protocolo HTTPS, Porta 443, Caminho `/health`, Intervalo de investigação 10s, Falhas toleradas 3, Tempo limite da investigação 5s, TTL 30s.
4. Em **Endpoints** > **Add**: Tipo **Azure endpoint**, Nome `ep-eastus`, Recurso de destino: Web App em East US.
5. Adicione pontos de extremidade adicionais para cada região.

## Tarefa 2: Criar um perfil de roteamento geográfico

Configure o roteamento geográfico para garantir que os usuários da UE sejam roteados exclusivamente para pontos de extremidade hospedados na UE (conformidade com GDPR).

### Azure CLI

```bash
# Create Traffic Manager profile with Geographic routing
az network traffic-manager profile create \
  --resource-group $RG \
  --name tm-woodgrove-geographic \
  --routing-method Geographic \
  --unique-dns-name woodgrove-geo-demo \
  --ttl 60 \
  --protocol HTTPS \
  --port 443 \
  --path "/health" \
  --interval 10 \
  --timeout 5 \
  --max-failures 3

# Add EU endpoint with geographic mapping for Europe
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-geographic \
  --type azureEndpoints \
  --name ep-europe \
  --target-resource-id /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Web/sites/app-woodgrove-westeurope \
  --endpoint-status Enabled \
  --geo-mapping "GEO-EU"

# Add North America endpoint
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-geographic \
  --type azureEndpoints \
  --name ep-northamerica \
  --target-resource-id /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Web/sites/app-woodgrove-eastus \
  --endpoint-status Enabled \
  --geo-mapping "GEO-NA"

# Add Asia-Pacific endpoint
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-geographic \
  --type externalEndpoints \
  --name ep-apac \
  --target "app-woodgrove-apac.contoso.com" \
  --endpoint-location "Southeast Asia" \
  --endpoint-status Enabled \
  --geo-mapping "GEO-AP"

# Add a catch-all endpoint for WORLD (unmapped regions)
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-geographic \
  --type azureEndpoints \
  --name ep-default \
  --target-resource-id /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Web/sites/app-woodgrove-eastus \
  --endpoint-status Enabled \
  --geo-mapping "WORLD"
```

### Azure PowerShell

```powershell
# Create Geographic routing profile
New-AzTrafficManagerProfile `
  -ResourceGroupName $rg `
  -Name "tm-woodgrove-geographic" `
  -TrafficRoutingMethod Geographic `
  -RelativeDnsName "woodgrove-geo-demo" `
  -Ttl 60 `
  -MonitorProtocol HTTPS `
  -MonitorPort 443 `
  -MonitorPath "/health" `
  -MonitorIntervalInSeconds 10 `
  -MonitorTimeoutInSeconds 5 `
  -MonitorToleratedNumberOfFailures 3

# Add endpoint for Europe with geo-mapping
New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-geographic" `
  -Type AzureEndpoints `
  -Name "ep-europe" `
  -TargetResourceId "/subscriptions/{sub-id}/resourceGroups/$rg/providers/Microsoft.Web/sites/app-woodgrove-westeurope" `
  -EndpointStatus Enabled `
  -GeoMapping "GEO-EU"

# Add endpoint for North America
New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-geographic" `
  -Type AzureEndpoints `
  -Name "ep-northamerica" `
  -TargetResourceId "/subscriptions/{sub-id}/resourceGroups/$rg/providers/Microsoft.Web/sites/app-woodgrove-eastus" `
  -EndpointStatus Enabled `
  -GeoMapping "GEO-NA"

# Add catch-all for unmapped regions
New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-geographic" `
  -Type AzureEndpoints `
  -Name "ep-default" `
  -TargetResourceId "/subscriptions/{sub-id}/resourceGroups/$rg/providers/Microsoft.Web/sites/app-woodgrove-eastus" `
  -EndpointStatus Enabled `
  -GeoMapping "WORLD"
```

### Portal

1. Crie um novo perfil do Traffic Manager com o método de roteamento **Geographic**.
2. Adicione o ponto de extremidade `ep-europe` e atribua o mapeamento geográfico **Europe**.
3. Adicione o ponto de extremidade `ep-northamerica` com mapeamento **North America**.
4. Adicione o ponto de extremidade `ep-default` com mapeamento **World** (catch-all para regiões não mapeadas).

:::warning Requisito do roteamento geográfico
Cada região geográfica deve ser mapeada para exatamente um ponto de extremidade. Se uma região não estiver mapeada para nenhum ponto de extremidade, os usuários dessa região recebem um NXDOMAIN (sem resposta). Sempre inclua um mapeamento WORLD como catch-all.
:::

## Tarefa 3: Criar perfis aninhados para roteamento hierárquico

Configure perfis aninhados do Traffic Manager: um perfil pai usando roteamento Geographic que delega para perfis filhos usando roteamento Priority dentro de cada região para failover.

### Azure CLI

```bash
# --- Child profile: Europe (Priority routing for failover) ---
az network traffic-manager profile create \
  --resource-group $RG \
  --name tm-woodgrove-europe-priority \
  --routing-method Priority \
  --unique-dns-name woodgrove-eu-priority \
  --ttl 10 \
  --protocol HTTPS \
  --port 443 \
  --path "/health" \
  --interval 10 \
  --timeout 5 \
  --max-failures 2

# Primary endpoint (West Europe)
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-europe-priority \
  --type azureEndpoints \
  --name ep-primary-westeurope \
  --target-resource-id /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Web/sites/app-woodgrove-westeurope \
  --priority 1 \
  --endpoint-status Enabled

# Secondary endpoint (North Europe)
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-europe-priority \
  --type azureEndpoints \
  --name ep-secondary-northeurope \
  --target-resource-id /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Web/sites/app-woodgrove-northeurope \
  --priority 2 \
  --endpoint-status Enabled

# --- Child profile: North America (Priority routing) ---
az network traffic-manager profile create \
  --resource-group $RG \
  --name tm-woodgrove-na-priority \
  --routing-method Priority \
  --unique-dns-name woodgrove-na-priority \
  --ttl 10 \
  --protocol HTTPS \
  --port 443 \
  --path "/health" \
  --interval 10 \
  --timeout 5 \
  --max-failures 2

az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-na-priority \
  --type azureEndpoints \
  --name ep-primary-eastus \
  --target-resource-id /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Web/sites/app-woodgrove-eastus \
  --priority 1 \
  --endpoint-status Enabled

az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-na-priority \
  --type azureEndpoints \
  --name ep-secondary-westus \
  --target-resource-id /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Web/sites/app-woodgrove-westus \
  --priority 2 \
  --endpoint-status Enabled

# --- Parent profile: Geographic with Nested endpoints ---
az network traffic-manager profile create \
  --resource-group $RG \
  --name tm-woodgrove-parent-geo \
  --routing-method Geographic \
  --unique-dns-name woodgrove-global \
  --ttl 60 \
  --protocol HTTPS \
  --port 443 \
  --path "/health" \
  --interval 10 \
  --timeout 5 \
  --max-failures 3

# Add child Europe profile as nested endpoint
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-parent-geo \
  --type nestedEndpoints \
  --name ep-nested-europe \
  --target-resource-id /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Network/trafficManagerProfiles/tm-woodgrove-europe-priority \
  --min-child-endpoints 1 \
  --min-child-ipv4 1 \
  --endpoint-status Enabled \
  --geo-mapping "GEO-EU"

# Add child North America profile as nested endpoint
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-parent-geo \
  --type nestedEndpoints \
  --name ep-nested-na \
  --target-resource-id /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Network/trafficManagerProfiles/tm-woodgrove-na-priority \
  --min-child-endpoints 1 \
  --min-child-ipv4 1 \
  --endpoint-status Enabled \
  --geo-mapping "GEO-NA" "WORLD"
```

### Azure PowerShell

```powershell
# --- Child profile: Europe Priority ---
$tmEU = New-AzTrafficManagerProfile `
  -ResourceGroupName $rg `
  -Name "tm-woodgrove-europe-priority" `
  -TrafficRoutingMethod Priority `
  -RelativeDnsName "woodgrove-eu-priority" `
  -Ttl 10 `
  -MonitorProtocol HTTPS `
  -MonitorPort 443 `
  -MonitorPath "/health" `
  -MonitorIntervalInSeconds 10 `
  -MonitorTimeoutInSeconds 5 `
  -MonitorToleratedNumberOfFailures 2

New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-europe-priority" `
  -Type AzureEndpoints `
  -Name "ep-primary-westeurope" `
  -TargetResourceId "/subscriptions/{sub-id}/resourceGroups/$rg/providers/Microsoft.Web/sites/app-woodgrove-westeurope" `
  -Priority 1 `
  -EndpointStatus Enabled

New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-europe-priority" `
  -Type AzureEndpoints `
  -Name "ep-secondary-northeurope" `
  -TargetResourceId "/subscriptions/{sub-id}/resourceGroups/$rg/providers/Microsoft.Web/sites/app-woodgrove-northeurope" `
  -Priority 2 `
  -EndpointStatus Enabled

# --- Child profile: NA Priority ---
$tmNA = New-AzTrafficManagerProfile `
  -ResourceGroupName $rg `
  -Name "tm-woodgrove-na-priority" `
  -TrafficRoutingMethod Priority `
  -RelativeDnsName "woodgrove-na-priority" `
  -Ttl 10 `
  -MonitorProtocol HTTPS `
  -MonitorPort 443 `
  -MonitorPath "/health" `
  -MonitorIntervalInSeconds 10 `
  -MonitorTimeoutInSeconds 5 `
  -MonitorToleratedNumberOfFailures 2

New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-na-priority" `
  -Type AzureEndpoints `
  -Name "ep-primary-eastus" `
  -TargetResourceId "/subscriptions/{sub-id}/resourceGroups/$rg/providers/Microsoft.Web/sites/app-woodgrove-eastus" `
  -Priority 1 `
  -EndpointStatus Enabled

New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-na-priority" `
  -Type AzureEndpoints `
  -Name "ep-secondary-westus" `
  -TargetResourceId "/subscriptions/{sub-id}/resourceGroups/$rg/providers/Microsoft.Web/sites/app-woodgrove-westus" `
  -Priority 2 `
  -EndpointStatus Enabled

# --- Parent profile: Geographic with nested endpoints ---
$tmParent = New-AzTrafficManagerProfile `
  -ResourceGroupName $rg `
  -Name "tm-woodgrove-parent-geo" `
  -TrafficRoutingMethod Geographic `
  -RelativeDnsName "woodgrove-global" `
  -Ttl 60 `
  -MonitorProtocol HTTPS `
  -MonitorPort 443 `
  -MonitorPath "/health" `
  -MonitorIntervalInSeconds 10 `
  -MonitorTimeoutInSeconds 5 `
  -MonitorToleratedNumberOfFailures 3

# Add nested endpoint for Europe
New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-parent-geo" `
  -Type NestedEndpoints `
  -Name "ep-nested-europe" `
  -TargetResourceId $tmEU.Id `
  -MinChildEndpoints 1 `
  -MinChildEndpointsIPv4 1 `
  -EndpointStatus Enabled `
  -GeoMapping "GEO-EU"

# Add nested endpoint for North America (with WORLD as catch-all)
New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-parent-geo" `
  -Type NestedEndpoints `
  -Name "ep-nested-na" `
  -TargetResourceId $tmNA.Id `
  -MinChildEndpoints 1 `
  -MinChildEndpointsIPv4 1 `
  -EndpointStatus Enabled `
  -GeoMapping "GEO-NA", "WORLD"
```

### Portal

1. Crie o perfil filho `tm-woodgrove-europe-priority` com roteamento **Priority**.
2. Adicione pontos de extremidade primário (prioridade 1) e secundário (prioridade 2) do tipo Azure.
3. Crie o perfil filho `tm-woodgrove-na-priority` com roteamento **Priority** e seus pontos de extremidade.
4. Crie o perfil pai `tm-woodgrove-parent-geo` com roteamento **Geographic**.
5. Adicione pontos de extremidade aninhados apontando para os perfis filhos, atribua mapeamentos geográficos (Europe, North America + World).
6. Defina **Minimum child endpoints** como 1 para cada ponto de extremidade aninhado.

## Tarefa 4: Configurar roteamento ponderado e multivalor

Implante métodos de roteamento adicionais para testes A/B (Weighted) e respostas DNS com múltiplos endereços (MultiValue).

### Azure CLI

```bash
# --- Weighted routing for A/B testing (canary deployments) ---
az network traffic-manager profile create \
  --resource-group $RG \
  --name tm-woodgrove-weighted \
  --routing-method Weighted \
  --unique-dns-name woodgrove-weighted-demo \
  --ttl 10 \
  --protocol HTTPS \
  --port 443 \
  --path "/health" \
  --interval 10 \
  --timeout 5 \
  --max-failures 3

# Production endpoint (90% traffic)
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-weighted \
  --type azureEndpoints \
  --name ep-production \
  --target-resource-id /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Web/sites/app-woodgrove-prod \
  --weight 90 \
  --endpoint-status Enabled

# Canary endpoint (10% traffic)
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-weighted \
  --type azureEndpoints \
  --name ep-canary \
  --target-resource-id /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Web/sites/app-woodgrove-canary \
  --weight 10 \
  --endpoint-status Enabled

# --- MultiValue routing (returns multiple healthy IPs) ---
az network traffic-manager profile create \
  --resource-group $RG \
  --name tm-woodgrove-multivalue \
  --routing-method MultiValue \
  --unique-dns-name woodgrove-multi-demo \
  --ttl 10 \
  --protocol TCP \
  --port 443 \
  --max-return 3 \
  --interval 10 \
  --timeout 5 \
  --max-failures 3

# Add external endpoints with IP targets (MultiValue requires IP-based targets)
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-multivalue \
  --type externalEndpoints \
  --name ep-ip-1 \
  --target "20.42.0.1" \
  --endpoint-status Enabled

az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-multivalue \
  --type externalEndpoints \
  --name ep-ip-2 \
  --target "20.42.0.2" \
  --endpoint-status Enabled

az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-multivalue \
  --type externalEndpoints \
  --name ep-ip-3 \
  --target "20.42.0.3" \
  --endpoint-status Enabled
```

### Azure PowerShell

```powershell
# Weighted routing profile
New-AzTrafficManagerProfile `
  -ResourceGroupName $rg `
  -Name "tm-woodgrove-weighted" `
  -TrafficRoutingMethod Weighted `
  -RelativeDnsName "woodgrove-weighted-demo" `
  -Ttl 10 `
  -MonitorProtocol HTTPS `
  -MonitorPort 443 `
  -MonitorPath "/health" `
  -MonitorIntervalInSeconds 10 `
  -MonitorTimeoutInSeconds 5 `
  -MonitorToleratedNumberOfFailures 3

# Production endpoint (weight 90)
New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-weighted" `
  -Type AzureEndpoints `
  -Name "ep-production" `
  -TargetResourceId "/subscriptions/{sub-id}/resourceGroups/$rg/providers/Microsoft.Web/sites/app-woodgrove-prod" `
  -Weight 90 `
  -EndpointStatus Enabled

# Canary endpoint (weight 10)
New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-weighted" `
  -Type AzureEndpoints `
  -Name "ep-canary" `
  -TargetResourceId "/subscriptions/{sub-id}/resourceGroups/$rg/providers/Microsoft.Web/sites/app-woodgrove-canary" `
  -Weight 10 `
  -EndpointStatus Enabled

# MultiValue routing profile
New-AzTrafficManagerProfile `
  -ResourceGroupName $rg `
  -Name "tm-woodgrove-multivalue" `
  -TrafficRoutingMethod MultiValue `
  -RelativeDnsName "woodgrove-multi-demo" `
  -Ttl 10 `
  -MonitorProtocol TCP `
  -MonitorPort 443 `
  -MaxReturn 3 `
  -MonitorIntervalInSeconds 10 `
  -MonitorTimeoutInSeconds 5 `
  -MonitorToleratedNumberOfFailures 3
```

### Portal

1. Crie o perfil `tm-woodgrove-weighted` com roteamento **Weighted**.
2. Adicione pontos de extremidade com pesos 90 (produção) e 10 (canary).
3. Crie o perfil `tm-woodgrove-multivalue` com roteamento **MultiValue**.
4. Defina **Max return** como 3 (número de IPs retornados por consulta DNS).
5. Adicione pontos de extremidade externos com destinos baseados em IP.

## Tarefa 5: Configurar monitoramento de pontos de extremidade com cabeçalhos personalizados e failover rápido

Configure monitoramento de integridade agressivo para detecção rápida de failover usando cabeçalhos personalizados e intervalos reduzidos.

### Azure CLI

```bash
# Update the performance profile for fast failover
az network traffic-manager profile update \
  --resource-group $RG \
  --name tm-woodgrove-performance \
  --interval 10 \
  --timeout 5 \
  --max-failures 2

# Add custom headers to endpoint monitoring
az network traffic-manager endpoint update \
  --resource-group $RG \
  --profile-name tm-woodgrove-performance \
  --type azureEndpoints \
  --name ep-eastus \
  --custom-headers host=app-woodgrove-eastus.azurewebsites.net

# Configure expected status code ranges (200-299 and 301)
az network traffic-manager profile update \
  --resource-group $RG \
  --name tm-woodgrove-performance \
  --status-code-ranges "200-299" "301-301"

# Verify endpoint monitoring status
az network traffic-manager endpoint show \
  --resource-group $RG \
  --profile-name tm-woodgrove-performance \
  --type azureEndpoints \
  --name ep-eastus \
  --query "{name:name, status:endpointStatus, monitorStatus:endpointMonitorStatus}"
```

### Azure PowerShell

```powershell
# Update profile for fast failover
$profile = Get-AzTrafficManagerProfile `
  -ResourceGroupName $rg `
  -Name "tm-woodgrove-performance"

$profile.MonitorIntervalInSeconds = 10
$profile.MonitorTimeoutInSeconds = 5
$profile.MonitorToleratedNumberOfFailures = 2
Set-AzTrafficManagerProfile -TrafficManagerProfile $profile

# Add custom headers to an endpoint
$endpoint = Get-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-performance" `
  -Type AzureEndpoints `
  -Name "ep-eastus"

$header = New-Object Microsoft.Azure.Commands.TrafficManager.Models.TrafficManagerCustomHeader
$header.Name = "host"
$header.Value = "app-woodgrove-eastus.azurewebsites.net"
$endpoint.CustomHeaders = @($header)
Set-AzTrafficManagerEndpoint -TrafficManagerEndpoint $endpoint

# Check endpoint health status
Get-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-performance" `
  -Type AzureEndpoints `
  -Name "ep-eastus" |
  Select-Object Name, EndpointStatus, EndpointMonitorStatus
```

### Portal

1. Abra `tm-woodgrove-performance` > **Configuration**.
2. Defina o intervalo de investigação para **10 segundos** (rápido), tempo limite da investigação para **5 segundos**, número de falhas toleradas para **2**.
3. Nas configurações de cada ponto de extremidade, adicione o cabeçalho personalizado: `host: app-woodgrove-eastus.azurewebsites.net`.
4. Em **Configuration**, defina os intervalos de códigos de status esperados como `200-299, 301-301`.

:::tip Cálculo de failover rápido
Tempo de failover = (Intervalo de investigação x Falhas toleradas) + Tempo limite da investigação.
Com intervalo de 10s, falhas 2, tempo limite 5s: o failover ocorre em aproximadamente 25 segundos.
Intervalo padrão (30s) com 3 falhas: aproximadamente 95 segundos.
:::

## Tarefa 6: Configurar roteamento por sub-rede

Implante roteamento baseado em sub-rede para direcionar intervalos de IP de clientes específicos a pontos de extremidade designados (útil para testes internos ou redes de parceiros).

### Azure CLI

```bash
# Create Subnet routing profile
az network traffic-manager profile create \
  --resource-group $RG \
  --name tm-woodgrove-subnet \
  --routing-method Subnet \
  --unique-dns-name woodgrove-subnet-demo \
  --ttl 30 \
  --protocol HTTPS \
  --port 443 \
  --path "/health" \
  --interval 30 \
  --timeout 10 \
  --max-failures 3

# Endpoint for corporate office IP range
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-subnet \
  --type externalEndpoints \
  --name ep-corporate \
  --target "internal.woodgrove.com" \
  --subnets "10.0.0.0:24" \
  --endpoint-status Enabled

# Endpoint for partner network
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-subnet \
  --type externalEndpoints \
  --name ep-partner \
  --target "partner.woodgrove.com" \
  --subnets "172.16.0.0:16" \
  --endpoint-status Enabled

# Default endpoint for all other traffic
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-woodgrove-subnet \
  --type externalEndpoints \
  --name ep-public-default \
  --target "www.woodgrove.com" \
  --endpoint-status Enabled
```

### Azure PowerShell

```powershell
# Subnet routing profile
New-AzTrafficManagerProfile `
  -ResourceGroupName $rg `
  -Name "tm-woodgrove-subnet" `
  -TrafficRoutingMethod Subnet `
  -RelativeDnsName "woodgrove-subnet-demo" `
  -Ttl 30 `
  -MonitorProtocol HTTPS `
  -MonitorPort 443 `
  -MonitorPath "/health" `
  -MonitorIntervalInSeconds 30 `
  -MonitorTimeoutInSeconds 10 `
  -MonitorToleratedNumberOfFailures 3

# Add subnet-mapped endpoints
$subnet1 = New-Object Microsoft.Azure.Commands.TrafficManager.Models.TrafficManagerIpAddressRange
$subnet1.First = "10.0.0.0"
$subnet1.Scope = 24

New-AzTrafficManagerEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "tm-woodgrove-subnet" `
  -Type ExternalEndpoints `
  -Name "ep-corporate" `
  -Target "internal.woodgrove.com" `
  -SubnetMapping $subnet1 `
  -EndpointStatus Enabled
```

### Portal

1. Crie o perfil `tm-woodgrove-subnet` com roteamento **Subnet**.
2. Adicione o ponto de extremidade `ep-corporate` e atribua o intervalo de sub-rede `10.0.0.0/24`.
3. Adicione o ponto de extremidade `ep-partner` com sub-rede `172.16.0.0/16`.
4. Adicione o ponto de extremidade padrão `ep-public-default` sem mapeamento de sub-rede (captura o tráfego não correspondido).

## Quebra & conserta

### Cenário 1: Roteamento geográfico sem atribuição de região

```bash
# Create a geographic profile without the WORLD catch-all
az network traffic-manager profile create \
  --resource-group $RG \
  --name tm-broken-geo \
  --routing-method Geographic \
  --unique-dns-name woodgrove-broken-geo \
  --ttl 60 \
  --protocol HTTPS \
  --port 443 \
  --path "/health"

# Only map Europe - all other regions get no answer
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-broken-geo \
  --type externalEndpoints \
  --name ep-europe-only \
  --target "eu.woodgrove.com" \
  --endpoint-status Enabled \
  --geo-mapping "GEO-EU"
```

**Sintoma**: Usuários fora da Europa (América do Norte, Ásia, etc.) recebem NXDOMAIN ou nenhuma resposta DNS ao resolver o FQDN do Traffic Manager.

**Causa raiz**: O roteamento geográfico requer que cada região de origem possível seja mapeada para um ponto de extremidade. Regiões sem mapeamento não retornam resposta DNS. Não há ponto de extremidade catch-all com WORLD.

**Correção**: Adicione um ponto de extremidade catch-all com mapeamento WORLD:

```bash
az network traffic-manager endpoint create \
  --resource-group $RG \
  --profile-name tm-broken-geo \
  --type externalEndpoints \
  --name ep-catch-all \
  --target "www.woodgrove.com" \
  --endpoint-status Enabled \
  --geo-mapping "WORLD"
```

### Cenário 2: Perfil aninhado com mínimo incorreto de pontos de extremidade filhos

```bash
# Create nested endpoint requiring 5 healthy children, but child has only 2
az network traffic-manager endpoint update \
  --resource-group $RG \
  --profile-name tm-woodgrove-parent-geo \
  --type nestedEndpoints \
  --name ep-nested-europe \
  --min-child-endpoints 5
```

**Sintoma**: O ponto de extremidade aninhado está sempre marcado como Degraded no perfil pai, mesmo com ambos os pontos de extremidade filhos saudáveis. O tráfego não é roteado para a região da UE.

**Causa raiz**: O valor de `min-child-endpoints` está definido como 5, mas o perfil filho contém apenas 2 pontos de extremidade. Como 2 < 5, o ponto de extremidade aninhado nunca atinge o limite mínimo e é permanentemente marcado como degradado.

**Correção**: Defina min-child-endpoints para um valor dentro do número real de pontos de extremidade filhos:

```bash
az network traffic-manager endpoint update \
  --resource-group $RG \
  --profile-name tm-woodgrove-parent-geo \
  --type nestedEndpoints \
  --name ep-nested-europe \
  --min-child-endpoints 1
```

:::tip Testando a resolução do Traffic Manager
Use `nslookup` ou `dig` para verificar as respostas DNS:
```bash
nslookup woodgrove-global.trafficmanager.net
dig woodgrove-global.trafficmanager.net +short
```
Lembre-se de que o cache de TTL do DNS significa que as alterações podem levar até o TTL configurado em segundos para se propagar a todos os clientes.
:::

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-27-q1",
    question: "O Woodgrove Bank precisa que usuários da UE sempre alcancem endpoints da UE e nunca sejam roteados para outro lugar, mesmo durante falhas regionais. Qual método de roteamento impõe essa restrição geográfica?",
    options: [
      "Roteamento geográfico - ele fixa regiões geográficas a endpoints específicos ✅",
      "Roteamento por desempenho - ele usa tabelas de latência para encontrar o endpoint mais próximo",
      "Roteamento por prioridade - ele roteia para o endpoint saudável de maior prioridade",
      "Roteamento ponderado - ele distribui com base nos pesos configurados"
    ],
    correctIndex: 0,
    explanation: "O roteamento geográfico garante que o tráfego de uma região mapeada seja enviado apenas para o endpoint atribuído. Mesmo que esse endpoint falhe, o tráfego NÃO é reroteado para o endpoint de outra região (ele retorna sem resposta). Isso garante conformidade com soberania de dados."
  },
  {
    id: "az700-27-q2",
    question: "Um perfil do Traffic Manager tem TTL definido como 300 segundos. O endpoint primário falha e a probe detecta isso em 25 segundos. Qual é o tempo máximo total de failover experimentado pelos clientes?",
    options: [
      "Até 325 segundos (TTL 300s + detecção 25s) porque os clientes armazenam em cache a resposta DNS antiga ✅",
      "Exatamente 25 segundos porque o Traffic Manager notifica imediatamente todos os resolvedores DNS",
      "300 segundos porque o TTL deve expirar antes de qualquer failover começar",
      "Instantâneo porque o Traffic Manager usa DNS anycast"
    ],
    correctIndex: 0,
    explanation: "Tempo total de failover = tempo de detecção da probe + TTL do DNS. Clientes e resolvedores recursivos armazenam em cache as respostas DNS pela duração do TTL. Após a detecção (25s), o Traffic Manager atualiza sua resposta DNS, mas as entradas em cache existentes devem expirar (até 300s) antes que os clientes consultem novamente e recebam o novo endpoint."
  },
  {
    id: "az700-27-q3",
    question: "O que acontece quando o limite de min-child-endpoints de um endpoint aninhado não é atingido?",
    options: [
      "O endpoint aninhado é marcado como Degradado e excluído do roteamento no perfil pai ✅",
      "O Traffic Manager escala automaticamente os endpoints filhos para atingir o limite",
      "O perfil pai entra em estado de falha e para de responder a todas as consultas",
      "O tráfego é distribuído igualmente entre todos os endpoints filhos saudáveis restantes"
    ],
    correctIndex: 0,
    explanation: "Quando o número de endpoints filhos saudáveis cai abaixo de min-child-endpoints, o endpoint aninhado é considerado degradado pelo perfil pai. O pai então roteia o tráfego para outros endpoints com base em seu método de roteamento, tratando efetivamente toda a ramificação aninhada como indisponível."
  },
  {
    id: "az700-27-q4",
    question: "Quais tipos de endpoint do Traffic Manager são suportados?",
    options: [
      "Endpoints do Azure, endpoints externos e endpoints aninhados ✅",
      "Endpoints do Azure, endpoints locais e endpoints híbridos",
      "Endpoints de IP público, endpoints DNS e endpoints privados",
      "Endpoints do Azure, endpoints externos e endpoints de gateway"
    ],
    correctIndex: 0,
    explanation: "O Traffic Manager suporta três tipos de endpoint: endpoints do Azure (recursos hospedados no Azure como Web Apps, IPs públicos, Cloud Services), endpoints externos (FQDNs externos ou endereços IPv4) e endpoints aninhados (outros perfis do Traffic Manager para roteamento hierárquico)."
  },
  {
    id: "az700-27-q5",
    question: "Um perfil de roteamento por desempenho tem endpoints em East US e West Europe. Um usuário no Brasil resolve o FQDN do Traffic Manager. Como o Traffic Manager decide qual endpoint retornar?",
    options: [
      "Ele usa uma tabela interna de latência da Internet para determinar qual região do Azure tem a menor latência a partir do IP do resolvedor DNS do usuário ✅",
      "Ele faz ping em ambos os endpoints a partir da localização do usuário e escolhe a resposta mais rápida",
      "Ele sempre retorna o endpoint geograficamente mais próximo com base em coordenadas GPS",
      "Ele seleciona aleatoriamente um endpoint e monitora condições de rede em tempo real"
    ],
    correctIndex: 0,
    explanation: "O roteamento por desempenho usa a tabela de medição de latência da Internet da Microsoft, que mapeia faixas de IP de resolvedores DNS para a latência das regiões do Azure. Ele não realiza probes em tempo real nem usa GPS. A tabela é atualizada periodicamente com base em medições agregadas de rede."
  },
  {
    id: "az700-27-q6",
    question: "Você configura um perfil MultiValue com max-return definido como 3 e 5 endpoints saudáveis. Quantos endereços IP uma única consulta DNS retorna?",
    options: [
      "3 (o valor de max-return limita quantos IPs saudáveis são retornados por consulta) ✅",
      "5 (todos os endpoints saudáveis são sempre retornados)",
      "1 (o DNS sempre retorna apenas um único registro)",
      "2 (max-return menos 1 para redundância)"
    ],
    correctIndex: 0,
    explanation: "O roteamento MultiValue retorna múltiplos IPs de endpoints saudáveis em uma única resposta DNS, até o limite de max-return. Com max-return=3 e 5 endpoints saudáveis, exatamente 3 IPs são retornados. A aplicação cliente pode então tentá-los em ordem, fornecendo failover do lado do cliente."
  }
]} />

## Limpeza

Remova todos os recursos criados neste desafio.

### Azure CLI

```bash
# Delete the resource group and all Traffic Manager profiles
az group delete --name rg-woodgrove-tm --yes --no-wait
```

### Azure PowerShell

```powershell
# Delete the resource group
Remove-AzResourceGroup -Name "rg-woodgrove-tm" -Force -AsJob
```

:::warning Lembrete de custo
Os custos do Traffic Manager são mínimos (aproximadamente $0,54 por milhão de consultas DNS + $0,36 por mês por ponto de extremidade com verificação de integridade). No entanto, se você implantou App Services ou VMs como destinos de pontos de extremidade durante este laboratório, esses recursos incorrem em seus próprios custos de computação. Exclua tudo quando terminar.
:::

:::tip Verificar limpeza
```bash
az group show --name rg-woodgrove-tm 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::
