---
sidebar_position: 3
sidebar_label: "Challenge 27"
title: "Challenge 27: Traffic Manager profiles and routing"
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

## Quebra e correção

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
    question: "Woodgrove Bank needs EU users to always reach EU endpoints and never be routed elsewhere, even during regional failures. Which routing method enforces this geographic constraint?",
    options: [
      "Geographic routing - it hard-pins geographic regions to specific endpoints ✅",
      "Performance routing - it uses latency tables to find the nearest endpoint",
      "Priority routing - it routes to the highest priority healthy endpoint",
      "Weighted routing - it distributes based on configured weights"
    ],
    correctIndex: 0,
    explanation: "Geographic routing ensures traffic from a mapped region is only ever sent to the assigned endpoint. Even if that endpoint fails, traffic is NOT rerouted to another region's endpoint (it returns no answer instead). This guarantees data sovereignty compliance."
  },
  {
    id: "az700-27-q2",
    question: "A Traffic Manager profile has TTL set to 300 seconds. The primary endpoint fails and the probe detects it in 25 seconds. What is the maximum total failover time experienced by clients?",
    options: [
      "Up to 325 seconds (TTL 300s + detection 25s) because clients cache the old DNS answer ✅",
      "Exactly 25 seconds because Traffic Manager immediately notifies all DNS resolvers",
      "300 seconds because the TTL must expire before any failover begins",
      "Instantaneous because Traffic Manager uses anycast DNS"
    ],
    correctIndex: 0,
    explanation: "Total failover time = probe detection time + DNS TTL. Clients and recursive resolvers cache DNS answers for the TTL duration. After detection (25s), Traffic Manager updates its DNS response, but existing cached entries must expire (up to 300s) before clients query again and receive the new endpoint."
  },
  {
    id: "az700-27-q3",
    question: "What happens when a nested endpoint's min-child-endpoints threshold is not met?",
    options: [
      "The nested endpoint is marked as Degraded and excluded from routing in the parent profile ✅",
      "Traffic Manager automatically scales up child endpoints to meet the threshold",
      "The parent profile enters a failed state and stops responding to all queries",
      "Traffic is evenly distributed across all remaining healthy child endpoints"
    ],
    correctIndex: 0,
    explanation: "When the number of healthy child endpoints falls below min-child-endpoints, the nested endpoint is considered degraded by the parent profile. The parent then routes traffic to other endpoints based on its routing method, effectively treating the entire nested branch as unavailable."
  },
  {
    id: "az700-27-q4",
    question: "Which Traffic Manager endpoint types are supported?",
    options: [
      "Azure endpoints, External endpoints, and Nested endpoints ✅",
      "Azure endpoints, On-premises endpoints, and Hybrid endpoints",
      "Public IP endpoints, DNS endpoints, and Private endpoints",
      "Azure endpoints, External endpoints, and Gateway endpoints"
    ],
    correctIndex: 0,
    explanation: "Traffic Manager supports three endpoint types: Azure endpoints (Azure-hosted resources like Web Apps, Public IPs, Cloud Services), External endpoints (external FQDNs or IPv4 addresses), and Nested endpoints (other Traffic Manager profiles for hierarchical routing)."
  },
  {
    id: "az700-27-q5",
    question: "A Performance routing profile has endpoints in East US and West Europe. A user in Brazil resolves the Traffic Manager FQDN. How does Traffic Manager decide which endpoint to return?",
    options: [
      "It uses an internal Internet latency table to determine which Azure region has the lowest latency from the user's DNS resolver IP ✅",
      "It pings both endpoints from the user's location and picks the fastest response",
      "It always returns the geographically closest endpoint based on GPS coordinates",
      "It randomly selects an endpoint and monitors real-time network conditions"
    ],
    correctIndex: 0,
    explanation: "Performance routing uses Microsoft's Internet latency measurement table, which maps DNS resolver IP ranges to Azure region latency. It does not perform real-time probes or use GPS. The table is periodically updated based on aggregate network measurements."
  },
  {
    id: "az700-27-q6",
    question: "You configure a MultiValue profile with max-return set to 3 and 5 healthy endpoints. How many IP addresses does a single DNS query return?",
    options: [
      "3 (the max-return value limits how many healthy IPs are returned per query) ✅",
      "5 (all healthy endpoints are always returned)",
      "1 (DNS only ever returns a single record)",
      "2 (max-return minus 1 for redundancy)"
    ],
    correctIndex: 0,
    explanation: "MultiValue routing returns multiple healthy endpoint IPs in a single DNS response, up to the max-return limit. With max-return=3 and 5 healthy endpoints, exactly 3 IPs are returned. The client application can then try them in order, providing client-side failover."
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
