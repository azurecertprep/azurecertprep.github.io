---
sidebar_position: 7
title: "Desafio 31: Configuração do Azure Front Door"
sidebar_label: "Challenge 31"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 31: Configuração do Azure Front Door

:::info Tempo e custo estimados
**60-90 minutos** | **~$35/mês base** (Front Door Premium) | **Peso no exame: 15-20%**
:::

## Cenário

A Globex Retail opera uma plataforma global de e-commerce hospedada em várias regiões do Azure. O tráfego de pico durante eventos de vendas causa picos de latência para usuários distantes da região primária. A equipe de plataforma precisa implantar o Azure Front Door Premium para acelerar o tráfego globalmente, distribuir solicitações entre backends primários e secundários, armazenar conteúdo estático em cache na borda e garantir failover automático quando uma origem se tornar não íntegra.

Você criará um perfil Front Door Premium com endpoints, grupos de origem configurados com sondas de integridade, múltiplas origens ponderadas para distribuição de carga e rotas com cache e compressão habilitados.

## Habilidades do exame abordadas

| Habilidade | Peso |
|-------|--------|
| Criar e configurar um perfil Azure Front Door (Standard/Premium) | Alto |
| Configurar endpoints, grupos de origem e origens | Alto |
| Configurar sondas de integridade para grupos de origem | Alto |
| Configurar rotas e políticas de cache | Alto |
| Configurar compressão de conteúdo | Médio |
| Diferenciar entre os SKUs Front Door Standard e Premium | Médio |

## Pré-requisitos

- Assinatura do Azure com função de Colaborador
- Azure CLI 2.60+ ou Azure PowerShell Az 12.0+
- Dois web apps ou contas de armazenamento implantados em regiões diferentes (ou disposição para criá-los)
- Compreensão de conceitos de rede anycast

## Tarefa 1: Criar o perfil Front Door Premium

O Azure Front Door Standard/Premium usa o grupo de comandos `az afd`. O SKU Premium adiciona suporte a Private Link, WAF aprimorado e recursos de proteção contra bots que o Standard não oferece.

:::warning Distinção importante
O grupo de comandos `az afd` é para Front Door Standard/Premium (atual). O grupo legado `az network front-door` é para Front Door Classic (descontinuado). O exame foca no Standard/Premium.
:::

### Azure CLI

```bash
# Set variables
RG="rg-globex-frontdoor"
LOCATION="eastus2"
FD_PROFILE="fd-globex-ecommerce"

# Create resource group
az group create --name $RG --location $LOCATION

# Create Front Door Premium profile
az afd profile create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --sku Premium_AzureFrontDoor \
  --origin-response-timeout-seconds 60

# Verify the profile was created
az afd profile show \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --query "{name:name, sku:sku.name, state:resourceState}" \
  --output table
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-globex-frontdoor"
$location = "eastus2"
$fdProfile = "fd-globex-ecommerce"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Create Front Door Premium profile
New-AzFrontDoorCdnProfile `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -SkuName "Premium_AzureFrontDoor" `
  -OriginResponseTimeoutSecond 60

# Verify
Get-AzFrontDoorCdnProfile -ResourceGroupName $rg -ProfileName $fdProfile |
  Select-Object Name, SkuName, ResourceState
```

### Portal

1. Navegue até **Front Door and CDN profiles** > **Create**.
2. Selecione **Azure Front Door** e clique em **Continue**.
3. Escolha **Custom create** para controle total.
4. Defina o Grupo de recursos como `rg-globex-frontdoor`, Nome como `fd-globex-ecommerce`, Camada como **Premium**.
5. Clique em **Review + create** > **Create**.

## Tarefa 2: Criar um endpoint

Um endpoint fornece o nome de host público (ex.: `fd-globex-ecommerce-xxxxxx.z01.azurefd.net`) por meio do qual os usuários acessam a aplicação.

### Azure CLI

```bash
# Create the endpoint
az afd endpoint create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-globex-web \
  --enabled-state Enabled

# Retrieve the endpoint hostname
az afd endpoint show \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-globex-web \
  --query "hostName" \
  --output tsv
```

### Azure PowerShell

```powershell
# Create the endpoint
New-AzFrontDoorCdnEndpoint `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -EndpointName "ep-globex-web" `
  -Location "Global" `
  -EnabledState "Enabled"

# Get the endpoint hostname
(Get-AzFrontDoorCdnEndpoint -ResourceGroupName $rg -ProfileName $fdProfile `
  -EndpointName "ep-globex-web").HostName
```

## Tarefa 3: Criar um grupo de origem com sondas de integridade

O grupo de origem define como o Front Door verifica a integridade e distribui a carga entre seus backends. A configuração da sonda de integridade é crítica para o comportamento de failover.

### Azure CLI

```bash
# Create origin group with health probe settings
az afd origin-group create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --origin-group-name og-globex-web \
  --probe-request-type GET \
  --probe-protocol Https \
  --probe-interval-in-seconds 30 \
  --probe-path "/health" \
  --sample-size 4 \
  --successful-samples-required 3 \
  --additional-latency-in-milliseconds 50

# Verify origin group settings
az afd origin-group show \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --origin-group-name og-globex-web \
  --query "{name:name, probeSettings:healthProbeSettings, loadBalancing:loadBalancingSettings}" \
  --output json
```

### Azure PowerShell

```powershell
# Create health probe settings object
$healthProbe = New-AzFrontDoorCdnOriginGroupHealthProbeSettingObject `
  -ProbeIntervalInSecond 30 `
  -ProbePath "/health" `
  -ProbeProtocol "Https" `
  -ProbeRequestType "GET"

# Create load balancing settings object
$loadBalancing = New-AzFrontDoorCdnOriginGroupLoadBalancingSettingObject `
  -SampleSize 4 `
  -SuccessfulSamplesRequired 3 `
  -AdditionalLatencyInMillisecond 50

# Create origin group
New-AzFrontDoorCdnOriginGroup `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -OriginGroupName "og-globex-web" `
  -HealthProbeSetting $healthProbe `
  -LoadBalancingSetting $loadBalancing
```

:::tip Melhores práticas para sondas de integridade
- Use um endpoint dedicado `/health` que verifica as dependências da aplicação (banco de dados, cache)
- Use GET em vez de HEAD se seu endpoint de integridade retorna códigos de status significativos baseados em lógica
- Defina o intervalo da sonda entre 10-60 segundos; intervalos menores detectam falhas mais rápido, mas aumentam a carga na origem
- Um sample-size de 4 com successful-samples-required de 3 significa que uma falha na sonda é tolerada antes de marcar como não íntegro
:::

## Tarefa 4: Adicionar origens primária e secundária

As origens representam os servidores backend. A prioridade determina a ordem de failover (número menor = prioridade maior). O peso distribui o tráfego entre origens de mesma prioridade.

### Azure CLI

```bash
# Primary origin - East US 2 web app
az afd origin create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --origin-group-name og-globex-web \
  --origin-name origin-eastus2-primary \
  --host-name globex-web-eastus2.azurewebsites.net \
  --origin-host-header globex-web-eastus2.azurewebsites.net \
  --http-port 80 \
  --https-port 443 \
  --priority 1 \
  --weight 1000 \
  --enabled-state Enabled

# Secondary origin - West US 2 web app (failover)
az afd origin create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --origin-group-name og-globex-web \
  --origin-name origin-westus2-secondary \
  --host-name globex-web-westus2.azurewebsites.net \
  --origin-host-header globex-web-westus2.azurewebsites.net \
  --http-port 80 \
  --https-port 443 \
  --priority 2 \
  --weight 1000 \
  --enabled-state Enabled

# Verify origins
az afd origin list \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --origin-group-name og-globex-web \
  --query "[].{name:name, host:hostName, priority:priority, weight:weight}" \
  --output table
```

### Azure PowerShell

```powershell
# Primary origin
New-AzFrontDoorCdnOrigin `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -OriginGroupName "og-globex-web" `
  -OriginName "origin-eastus2-primary" `
  -HostName "globex-web-eastus2.azurewebsites.net" `
  -OriginHostHeader "globex-web-eastus2.azurewebsites.net" `
  -HttpPort 80 `
  -HttpsPort 443 `
  -Priority 1 `
  -Weight 1000 `
  -EnabledState "Enabled"

# Secondary origin (failover)
New-AzFrontDoorCdnOrigin `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -OriginGroupName "og-globex-web" `
  -OriginName "origin-westus2-secondary" `
  -HostName "globex-web-westus2.azurewebsites.net" `
  -OriginHostHeader "globex-web-westus2.azurewebsites.net" `
  -HttpPort 80 `
  -HttpsPort 443 `
  -Priority 2 `
  -Weight 1000 `
  -EnabledState "Enabled"
```

:::note Prioridade vs. peso
- **Prioridade**: Determina a ordem de failover. Todo o tráfego vai para origens de prioridade 1 enquanto estiverem íntegras. Somente quando todas as origens de prioridade 1 falham o tráfego é direcionado para a prioridade 2.
- **Peso**: Distribui o tráfego entre origens com a mesma prioridade. Uma origem com peso 1000 recebe o dobro do tráfego de uma com peso 500 (no mesmo nível de prioridade).
:::

## Tarefa 5: Criar uma rota com cache e compressão

As rotas conectam o endpoint ao grupo de origem e definem padrões de URL, protocolos de encaminhamento e comportamento de cache.

### Azure CLI

```bash
# Create route with caching enabled
az afd route create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-globex-web \
  --route-name route-default \
  --origin-group og-globex-web \
  --patterns-to-match "/*" \
  --supported-protocols Http Https \
  --https-redirect Enabled \
  --forwarding-protocol HttpsOnly \
  --link-to-default-domain Enabled \
  --enable-caching true \
  --enable-compression true \
  --query-string-caching-behavior IncludeSpecifiedQueryStrings \
  --query-parameters "sku" "category" \
  --content-types-to-compress "text/html" "text/css" "application/javascript" "application/json" "image/svg+xml"

# Create a separate route for API (no caching)
az afd route create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-globex-web \
  --route-name route-api \
  --origin-group og-globex-web \
  --patterns-to-match "/api/*" \
  --supported-protocols Https \
  --https-redirect Disabled \
  --forwarding-protocol HttpsOnly \
  --link-to-default-domain Enabled \
  --enable-caching false

# List all routes
az afd route list \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-globex-web \
  --query "[].{name:name, patterns:patternsToMatch, caching:cacheConfiguration}" \
  --output json
```

### Azure PowerShell

```powershell
# Create route with caching
New-AzFrontDoorCdnRoute `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -EndpointName "ep-globex-web" `
  -RouteName "route-default" `
  -OriginGroupId (Get-AzFrontDoorCdnOriginGroup -ResourceGroupName $rg -ProfileName $fdProfile -OriginGroupName "og-globex-web").Id `
  -PatternsToMatch "/*" `
  -SupportedProtocol "Http","Https" `
  -HttpsRedirect "Enabled" `
  -ForwardingProtocol "HttpsOnly" `
  -LinkToDefaultDomain "Enabled" `
  -CacheConfigurationQueryStringCachingBehavior "IncludeSpecifiedQueryStrings" `
  -CacheConfigurationQueryParameter "sku","category" `
  -CompressionSettingIsCompressionEnabled `
  -CompressionSettingContentTypesToCompress "text/html","text/css","application/javascript","application/json","image/svg+xml"
```

### Portal

1. No perfil do Front Door, navegue até **Front Door manager** > **+ Add a route**.
2. Defina o nome da rota como `route-default`, vincule ao seu endpoint.
3. Defina Patterns to match como `/*`.
4. Selecione o grupo de origem `og-globex-web`.
5. Defina o protocolo de encaminhamento como **HTTPS only**, habilite **HTTPS redirect**.
6. Em **Caching**, ative **Enable caching**, selecione o comportamento de query string e marque **Enable compression**.
7. Clique em **Add**.

:::tip Comportamentos de cache de query string
- **IgnoreQueryString**: O cache trata todas as variações de query string como o mesmo recurso
- **UseQueryString**: Cada query string única cria uma entrada de cache separada
- **IncludeSpecifiedQueryStrings**: Somente os parâmetros listados diferenciam as entradas de cache
- **IgnoreSpecifiedQueryStrings**: Os parâmetros listados são removidos antes da consulta ao cache

Para e-commerce, `IncludeSpecifiedQueryStrings` com parâmetros de identificação de produto (sku, category) equilibra a eficiência do cache com a correção dos dados.
:::

## Tarefa 6: Validar a aceleração de tráfego e o cache

Teste a implantação acessando o endpoint e verificando os cabeçalhos de resposta.

### Azure CLI

```bash
# Get the endpoint hostname
ENDPOINT_HOST=$(az afd endpoint show \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-globex-web \
  --query "hostName" \
  --output tsv)

echo "Front Door endpoint: https://$ENDPOINT_HOST"

# Test the endpoint (look for X-Cache header)
curl -sI "https://$ENDPOINT_HOST/" | grep -i "x-cache\|x-azure-ref\|age"

# Purge the cache for a specific path
az afd endpoint purge \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-globex-web \
  --content-paths "/*"
```

Cabeçalhos de resposta importantes para verificar:
- **X-Cache**: Mostra `TCP_HIT` (servido do cache) ou `TCP_MISS` (buscado da origem)
- **X-Azure-Ref**: Referência única para a transação do Front Door (útil para tickets de suporte)
- **Age**: Segundos desde que o objeto foi armazenado no cache de borda

## Quebra & conserta

Estes exercícios simulam configurações incorretas comuns do Front Door.

### Cenário 1: Origem não respondendo (caminho da sonda de integridade incorreto)

```bash
# Misconfigure the health probe path to a non-existent endpoint
az afd origin-group update \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --origin-group-name og-globex-web \
  --probe-path "/nonexistent-health-check"
```

**Sintoma**: Todas as origens aparecem como não íntegras no status de integridade do Front Door. As solicitações ao endpoint retornam 503 Service Unavailable.

**Causa raiz**: O caminho da sonda de integridade `/nonexistent-health-check` retorna 404 na origem. O Front Door considera qualquer resposta diferente de HTTP 200 como não íntegra. Quando todas as origens no grupo estão não íntegras, o Front Door retorna 503.

**Correção**: Corrija o caminho da sonda para um endpoint que retorne HTTP 200:

```bash
az afd origin-group update \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --origin-group-name og-globex-web \
  --probe-path "/health"
```

### Cenário 2: Cache não sendo populado (query string não encaminhada)

```bash
# Set caching to ignore all query strings, but the app uses them for content
az afd route update \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-globex-web \
  --route-name route-default \
  --query-string-caching-behavior IgnoreQueryString
```

**Sintoma**: As páginas de produto mostram o conteúdo errado. Usuários navegando para `/products?sku=ABC123` e `/products?sku=XYZ789` veem a mesma página em cache.

**Causa raiz**: `IgnoreQueryString` remove todos os parâmetros de query antes da consulta ao cache, então ambas as URLs mapeiam para a mesma chave de cache (`/products`). O backend depende do parâmetro `sku` para servir conteúdo diferente.

**Correção**: Inclua os parâmetros de query relevantes na chave de cache:

```bash
az afd route update \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-globex-web \
  --route-name route-default \
  --query-string-caching-behavior IncludeSpecifiedQueryStrings \
  --query-parameters "sku" "category"
```

### Cenário 3: Incompatibilidade de padrão de rota

```bash
# Create an overly specific route that shadows the API route
az afd route create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-globex-web \
  --route-name route-broken-pattern \
  --origin-group og-globex-web \
  --patterns-to-match "/api/v1/*" \
  --supported-protocols Https \
  --forwarding-protocol HttpsOnly \
  --link-to-default-domain Enabled \
  --enable-caching true
```

**Sintoma**: As respostas da API para `/api/v1/orders` estão sendo armazenadas em cache quando não deveriam, causando dados desatualizados.

**Causa raiz**: A rota `route-broken-pattern` com padrão `/api/v1/*` tem cache habilitado e corresponde antes da rota mais ampla `/api/*` (que tem cache desabilitado). O Front Door avalia a correspondência de padrão mais específica primeiro.

**Correção**: Exclua a rota conflitante ou desabilite o cache nela:

```bash
az afd route delete \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-globex-web \
  --route-name route-broken-pattern \
  --yes
```

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-31-q1",
    question: "Qual é a principal diferença entre os SKUs Standard e Premium do Azure Front Door?",
    options: [
      "O Premium adiciona suporte a origem com Private Link, WAF aprimorado e proteção contra bots ✅",
      "O Premium suporta mais endpoints por perfil",
      "O Standard não suporta caching",
      "O Premium usa uma rede anycast diferente"
    ],
    correctIndex: 0,
    explanation: "O Front Door Premium adiciona conectividade de origem via Private Link, WAF aprimorado com proteção contra bots e conjuntos de regras gerenciadas, e relatórios de segurança. Ambos os SKUs compartilham a mesma rede anycast global e capacidades de caching."
  },
  {
    id: "az700-31-q2",
    question: "Um grupo de origem tem duas origens: Origin-A (prioridade 1, peso 600) e Origin-B (prioridade 2, peso 400). Como o tráfego é distribuído quando ambas as origens estão íntegras?",
    options: [
      "100% para Origin-A, 0% para Origin-B ✅",
      "60% para Origin-A, 40% para Origin-B",
      "50% para cada origem",
      "O tráfego é distribuído com base na proximidade geográfica"
    ],
    correctIndex: 0,
    explanation: "A prioridade determina a ordem de failover. Todo o tráfego vai para origens de prioridade 1 enquanto estiverem íntegras. O peso distribui tráfego apenas entre origens no mesmo nível de prioridade. Como Origin-B é prioridade 2, ela não recebe tráfego enquanto Origin-A (prioridade 1) estiver íntegra."
  },
  {
    id: "az700-31-q3",
    question: "Uma rota do Front Door tem caching habilitado com query-string-caching-behavior definido como IncludeSpecifiedQueryStrings e query-parameters definido como 'sku'. Quais duas URLs produzem a MESMA entrada de cache?",
    options: [
      "/products?sku=ABC&color=red e /products?sku=ABC&color=blue ✅",
      "/products?sku=ABC e /products?sku=XYZ",
      "/products?sku=ABC e /products",
      "/Products?sku=ABC e /products?sku=ABC"
    ],
    correctIndex: 0,
    explanation: "Com IncludeSpecifiedQueryStrings, apenas os parâmetros listados (sku) diferenciam entradas de cache. Ambas as URLs têm sku=ABC, então o parâmetro 'color' é ignorado na chave de cache. Valores diferentes de sku ou sku ausente criam entradas separadas. Os caminhos de URL diferenciam maiúsculas e minúsculas."
  },
  {
    id: "az700-31-q4",
    question: "As health probes do Front Door para todas as origens em um grupo estão retornando HTTP 404. O que acontece com as requisições de clientes de entrada?",
    options: [
      "O Front Door retorna 503 Service Unavailable para os clientes ✅",
      "O Front Door roteia o tráfego para as origens mesmo assim usando round-robin",
      "O Front Door tenta novamente a requisição para cada origem sequencialmente",
      "O Front Door armazena em cache a última resposta bem-sucedida e serve essa"
    ],
    correctIndex: 0,
    explanation: "Quando todas as origens em um grupo são marcadas como não íntegras (respostas de probe não-200), o Front Door não pode rotear tráfego e retorna 503 Service Unavailable. O Front Door não roteia para origens não íntegras nem serve cache desatualizado quando todas as origens estão indisponíveis."
  },
  {
    id: "az700-31-q5",
    question: "Qual grupo de comandos do Azure CLI você deve usar para o Azure Front Door Standard/Premium (geração atual)?",
    options: [
      "az afd ✅",
      "az network front-door",
      "az cdn",
      "az frontdoor"
    ],
    correctIndex: 0,
    explanation: "O grupo de comandos 'az afd' gerencia perfis do Front Door Standard/Premium. O grupo 'az network front-door' é para o Front Door Classic descontinuado. Embora 'az cdn' compartilhe alguma herança, as operações do Front Door Standard/Premium usam exclusivamente 'az afd'."
  },
  {
    id: "az700-31-q6",
    question: "Você habilita compressão em uma rota do Front Door. Qual tipo de conteúdo é comprimido por padrão?",
    options: [
      "text/html e application/javascript ✅",
      "image/jpeg e image/png",
      "application/octet-stream",
      "Todos os tipos de conteúdo independentemente do tipo MIME"
    ],
    correctIndex: 0,
    explanation: "O Front Door comprime tipos de conteúdo baseados em texto (text/html, text/css, application/javascript, application/json, etc.) por padrão. Formatos já comprimidos como JPEG, PNG e streams binários não são comprimidos adicionalmente. Você pode personalizar a lista com --content-types-to-compress."
  }
]} />

## Limpeza

Remova todos os recursos criados neste desafio.

### Azure CLI

```bash
# Delete the entire resource group and all resources within it
az group delete --name rg-globex-frontdoor --yes --no-wait
```

### Azure PowerShell

```powershell
# Delete the entire resource group and all resources within it
Remove-AzResourceGroup -Name "rg-globex-frontdoor" -Force -AsJob
```

:::danger Aviso de custo
O Azure Front Door Premium custa aproximadamente $35/mês apenas pela taxa base do perfil, além de cobranças por solicitação e transferência de dados. Exclua o perfil imediatamente após concluir este desafio para evitar cobranças desnecessárias. O flag `--no-wait` retorna imediatamente enquanto a exclusão prossegue em segundo plano.
:::

:::tip Verificar limpeza
Após alguns minutos, confirme a exclusão:
```bash
az group show --name rg-globex-frontdoor 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::
