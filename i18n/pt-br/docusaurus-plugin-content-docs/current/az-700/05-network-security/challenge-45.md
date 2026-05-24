---
sidebar_position: 6
title: "Desafio 45: WAF no Application Gateway"
sidebar_label: "Challenge 45"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 45: WAF no Application Gateway

:::info Tempo e custo estimados
**60-90 minutos** | **~$0,40/hora** (Application Gateway WAF_v2 SKU) | **Peso no exame: 15-20%**
:::

:::danger Aviso de custo
O SKU Application Gateway WAF_v2 incorre em um custo fixo de aproximadamente $0,36/hora mais cobranças por unidade de capacidade. Exclua os recursos após concluir os exercícios.
:::

## Cenário

A Tailwind Traders executa uma aplicação web voltada ao cliente por trás do Azure Application Gateway. A aplicação tem sido alvo de repetidos ataques de injeção de SQL e cross-site scripting (XSS). A equipe de segurança precisa implantar uma política de Web Application Firewall (WAF) no modo de Prevenção usando o conjunto de regras padrão mais recente da Microsoft (DRS 2.1), criar regras personalizadas para bloquear padrões conhecidos de bots e aplicar limitação de taxa a IPs abusivos, além de configurar exclusões para parâmetros legítimos de API que disparam falsos positivos.

Seu trabalho é criar uma política WAF, associá-la a um Application Gateway, configurar regras gerenciadas e personalizadas, configurar exclusões e implementar substituições de política por listener.

## Habilidades do exame abordadas

| Habilidade | Peso |
|------------|------|
| Criar uma política WAF para Application Gateway | Alto |
| Configurar conjuntos de regras gerenciados (DRS/OWASP) | Alto |
| Criar regras personalizadas WAF (MatchRule, RateLimitRule) | Alto |
| Configurar exclusões WAF | Médio |
| Alternar entre modo de Detecção e modo de Prevenção | Médio |
| Associar política WAF a listeners/site | Médio |

## Pré-requisitos

- Assinatura do Azure com função de Colaborador
- Azure CLI 2.60+ ou Azure PowerShell Az 12.0+
- Um Application Gateway WAF_v2 SKU implantado (ou este desafio criará um)
- Compreensão básica de cabeçalhos HTTP, injeção de SQL e conceitos OWASP

## Tarefa 1: Criar uma política WAF no modo de Prevenção

Uma política WAF é o recurso independente que contém toda a configuração do WAF. Ela pode ser associada a um Application Gateway inteiro, a listeners individuais ou a regras baseadas em caminho específicas.

### Azure CLI

```bash
# Set variables
RG="rg-tailwind-waf"
LOCATION="eastus2"
WAF_POLICY="waf-policy-tailwind"

# Create resource group
az group create --name $RG --location $LOCATION

# Create WAF policy
az network application-gateway waf-policy create \
  --name $WAF_POLICY \
  --resource-group $RG \
  --location $LOCATION

# Set policy to Prevention mode with request body inspection enabled
az network application-gateway waf-policy policy-setting update \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --mode Prevention \
  --state Enabled \
  --request-body-check true \
  --max-request-body-size-in-kb 128 \
  --file-upload-limit-in-mb 100
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-tailwind-waf"
$location = "eastus2"
$wafPolicyName = "waf-policy-tailwind"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Create WAF policy
$wafPolicy = New-AzApplicationGatewayFirewallPolicy `
  -ResourceGroupName $rg `
  -Name $wafPolicyName `
  -Location $location

# Configure policy settings (Prevention mode)
$policySetting = New-AzApplicationGatewayFirewallPolicySetting `
  -Mode Prevention `
  -State Enabled `
  -MaxRequestBodySizeInKb 128 `
  -FileUploadLimitInMb 100 `
  -RequestBodyCheck $true

$wafPolicy.PolicySettings = $policySetting
Set-AzApplicationGatewayFirewallPolicy `
  -InputObject $wafPolicy
```

### Portal do Azure

1. Pesquise **Web Application Firewall policies** e selecione **Create**.
2. Defina a política para **Application Gateway**, assinatura, grupo de recursos, nome da política **waf-policy-tailwind**, região **East US 2**.
3. Na aba Policy settings, defina Mode como **Prevention**, State como **Enabled**.
4. Habilite **Request body inspection**, defina o tamanho máximo como **128 KB**.
5. Selecione **Review + create** e depois **Create**.

:::warning Modo de Detecção vs modo de Prevenção
- **Modo de Detecção**: Registra todas as correspondências de regras, mas NÃO bloqueia requisições. Use durante a implantação inicial para identificar falsos positivos.
- **Modo de Prevenção**: Bloqueia ativamente requisições que correspondem a regras e retorna uma resposta 403 Forbidden. Alterne para Prevenção somente após ajustar as exclusões.
:::

## Tarefa 2: Configurar o conjunto de regras gerenciado (DRS 2.1)

O Microsoft Default Rule Set (DRS) 2.1 é o conjunto de regras gerenciado mais recente, fornecendo proteção contra injeção de SQL, XSS, inclusão de arquivo local, execução remota de código e mais. Ele substitui os conjuntos de regras OWASP CRS mais antigos.

### Azure CLI

```bash
# Add Microsoft Default Rule Set 2.1
az network application-gateway waf-policy managed-rule rule-set add \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --type Microsoft_DefaultRuleSet \
  --version 2.1

# Add Bot Manager Rule Set (detects and blocks bad bots)
az network application-gateway waf-policy managed-rule rule-set add \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --type Microsoft_BotManagerRuleSet \
  --version 1.1

# List configured managed rule sets
az network application-gateway waf-policy managed-rule rule-set list \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  -o table
```

### Azure PowerShell

```powershell
# Get the WAF policy
$wafPolicy = Get-AzApplicationGatewayFirewallPolicy `
  -ResourceGroupName $rg `
  -Name $wafPolicyName

# Create managed rule set for DRS 2.1
$drsRuleSet = New-AzApplicationGatewayFirewallPolicyManagedRuleSet `
  -RuleSetType "Microsoft_DefaultRuleSet" `
  -RuleSetVersion "2.1"

# Create Bot Manager rule set
$botRuleSet = New-AzApplicationGatewayFirewallPolicyManagedRuleSet `
  -RuleSetType "Microsoft_BotManagerRuleSet" `
  -RuleSetVersion "1.1"

# Apply managed rules to the policy
$managedRules = New-AzApplicationGatewayFirewallPolicyManagedRule `
  -ManagedRuleSet @($drsRuleSet, $botRuleSet)

$wafPolicy.ManagedRules = $managedRules
Set-AzApplicationGatewayFirewallPolicy -InputObject $wafPolicy
```

### Portal do Azure

1. Abra **waf-policy-tailwind**, selecione **Managed rules** em Settings.
2. Selecione **Add** e escolha **Microsoft_DefaultRuleSet** versão **2.1**.
3. Selecione **Add** novamente e escolha **Microsoft_BotManagerRuleSet** versão **1.1**.
4. Selecione **Save**.

## Tarefa 3: Criar regras personalizadas

Regras personalizadas são avaliadas ANTES das regras gerenciadas. Elas suportam dois tipos:
- **MatchRule**: Avalia condições de correspondência e executa uma ação (Allow, Block, Log).
- **RateLimitRule**: Conta requisições que correspondem às condições em uma janela de tempo e bloqueia quando o limite é excedido.

A prioridade determina a ordem de avaliação entre regras personalizadas (número menor = avaliado primeiro).

### Azure CLI

```bash
# Custom rule 1: Block traffic from specific countries (geo-filter)
az network application-gateway waf-policy custom-rule create \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name BlockHighRiskGeo \
  --priority 10 \
  --rule-type MatchRule \
  --action Block

# Add match condition for geo-filtering
az network application-gateway waf-policy custom-rule match-condition add \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name BlockHighRiskGeo \
  --match-variables RemoteAddr \
  --operator GeoMatch \
  --values CN RU KP

# Custom rule 2: Rate limit by client IP (max 100 requests per minute)
az network application-gateway waf-policy custom-rule create \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name RateLimitByIP \
  --priority 20 \
  --rule-type RateLimitRule \
  --rate-limit-duration OneMin \
  --rate-limit-threshold 100 \
  --action Block \
  --group-by-user-session "[{group-by-variables:[{variable-name:ClientAddr}]}]"

# Add match condition (apply to all traffic)
az network application-gateway waf-policy custom-rule match-condition add \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name RateLimitByIP \
  --match-variables RemoteAddr \
  --operator IPMatch \
  --values "0.0.0.0/0"

# Custom rule 3: Block requests with suspicious User-Agent
az network application-gateway waf-policy custom-rule create \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name BlockBadBots \
  --priority 30 \
  --rule-type MatchRule \
  --action Block

az network application-gateway waf-policy custom-rule match-condition add \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name BlockBadBots \
  --match-variables "RequestHeaders.User-Agent" \
  --operator Contains \
  --values "sqlmap" "nikto" "masscan" "zgrab" \
  --transforms Lowercase
```

### Azure PowerShell

```powershell
# Custom rule 1: Geo-filter
$geoCondition = New-AzApplicationGatewayFirewallCondition `
  -MatchVariable (New-AzApplicationGatewayFirewallMatchVariable -VariableName RemoteAddr) `
  -Operator GeoMatch `
  -MatchValue @("CN", "RU", "KP")

$geoRule = New-AzApplicationGatewayFirewallCustomRule `
  -Name "BlockHighRiskGeo" `
  -Priority 10 `
  -RuleType MatchRule `
  -MatchCondition $geoCondition `
  -Action Block `
  -State Enabled

# Custom rule 2: Rate limit
$rateLimitCondition = New-AzApplicationGatewayFirewallCondition `
  -MatchVariable (New-AzApplicationGatewayFirewallMatchVariable -VariableName RemoteAddr) `
  -Operator IPMatch `
  -MatchValue @("0.0.0.0/0")

$groupByVariable = New-AzApplicationGatewayFirewallCustomRuleGroupByVariable `
  -VariableName ClientAddr

$groupByUserSession = New-AzApplicationGatewayFirewallCustomRuleGroupByUserSession `
  -GroupByVariable $groupByVariable

$rateLimitRule = New-AzApplicationGatewayFirewallCustomRule `
  -Name "RateLimitByIP" `
  -Priority 20 `
  -RuleType RateLimitRule `
  -MatchCondition $rateLimitCondition `
  -Action Block `
  -State Enabled `
  -RateLimitDuration OneMin `
  -RateLimitThreshold 100 `
  -GroupByUserSession $groupByUserSession

# Custom rule 3: Block bad bots
$botCondition = New-AzApplicationGatewayFirewallCondition `
  -MatchVariable (New-AzApplicationGatewayFirewallMatchVariable `
    -VariableName RequestHeaders `
    -Selector "User-Agent") `
  -Operator Contains `
  -MatchValue @("sqlmap", "nikto", "masscan", "zgrab") `
  -Transform Lowercase

$botRule = New-AzApplicationGatewayFirewallCustomRule `
  -Name "BlockBadBots" `
  -Priority 30 `
  -RuleType MatchRule `
  -MatchCondition $botCondition `
  -Action Block `
  -State Enabled

# Apply custom rules to policy
$wafPolicy = Get-AzApplicationGatewayFirewallPolicy `
  -ResourceGroupName $rg -Name $wafPolicyName
$wafPolicy.CustomRules = @($geoRule, $rateLimitRule, $botRule)
Set-AzApplicationGatewayFirewallPolicy -InputObject $wafPolicy
```

## Tarefa 4: Configurar exclusões para falsos positivos

Regras gerenciadas podem disparar falsos positivos em tráfego legítimo. Por exemplo, um endpoint de API que aceita payloads JSON pode disparar regras de injeção de SQL quando o corpo contém sintaxe semelhante a SQL. Exclusões instruem o WAF a ignorar a inspeção de componentes específicos da requisição.

### Azure CLI

```bash
# Exclude a specific request header that triggers false positives
az network application-gateway waf-policy managed-rule exclusion add \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --match-variable RequestHeaderNames \
  --selector-match-operator Contains \
  --selector "X-Custom-Auth"

# Exclude request argument names that contain "query" (API search parameters)
az network application-gateway waf-policy managed-rule exclusion add \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --match-variable RequestArgNames \
  --selector-match-operator StartsWith \
  --selector "filter"

# Exclude specific cookie that triggers rules
az network application-gateway waf-policy managed-rule exclusion add \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --match-variable RequestCookieNames \
  --selector-match-operator Equals \
  --selector "session-data"

# List all configured exclusions
az network application-gateway waf-policy managed-rule exclusion list \
  --policy-name $WAF_POLICY \
  --resource-group $RG
```

### Azure PowerShell

```powershell
# Create exclusion entries
$exclusion1 = New-AzApplicationGatewayFirewallPolicyExclusion `
  -MatchVariable "RequestHeaderNames" `
  -SelectorMatchOperator "Contains" `
  -Selector "X-Custom-Auth"

$exclusion2 = New-AzApplicationGatewayFirewallPolicyExclusion `
  -MatchVariable "RequestArgNames" `
  -SelectorMatchOperator "StartsWith" `
  -Selector "filter"

$exclusion3 = New-AzApplicationGatewayFirewallPolicyExclusion `
  -MatchVariable "RequestCookieNames" `
  -SelectorMatchOperator "Equals" `
  -Selector "session-data"

# Apply exclusions to managed rules
$wafPolicy = Get-AzApplicationGatewayFirewallPolicy `
  -ResourceGroupName $rg -Name $wafPolicyName
$wafPolicy.ManagedRules.Exclusions = @($exclusion1, $exclusion2, $exclusion3)
Set-AzApplicationGatewayFirewallPolicy -InputObject $wafPolicy
```

### Portal do Azure

1. Abra **waf-policy-tailwind**, selecione **Managed rules**.
2. Selecione **Add exclusions**.
3. Defina Match variable como **Request header names**, Selector match operator como **Contains**, Selector como **X-Custom-Auth**.
4. Repita para exclusões adicionais.
5. Selecione **Save**.

:::tip Variáveis de correspondência para exclusões
Variáveis de correspondência disponíveis para exclusões:
- `RequestHeaderNames` / `RequestHeaderKeys` / `RequestHeaderValues`
- `RequestCookieNames` / `RequestCookieKeys` / `RequestCookieValues`
- `RequestArgNames` / `RequestArgKeys` / `RequestArgValues`

Operadores de correspondência de seletor: `Equals`, `Contains`, `StartsWith`, `EndsWith`, `EqualsAny`
:::

## Tarefa 5: Associar política WAF ao Application Gateway

Uma política WAF pode ser associada em três níveis:
1. **Global** (Application Gateway inteiro)
2. **Por listener** (substitui a global para um listener específico)
3. **Por regra de caminho** (substitui a política do listener para caminhos de URL específicos)

### Azure CLI

```bash
# Create VNet and subnet for Application Gateway
az network vnet create \
  --resource-group $RG \
  --name vnet-appgw \
  --location $LOCATION \
  --address-prefixes 10.50.0.0/16 \
  --subnet-name snet-appgw \
  --subnet-prefixes 10.50.1.0/24

# Create public IP for Application Gateway
az network public-ip create \
  --resource-group $RG \
  --name pip-appgw \
  --location $LOCATION \
  --sku Standard \
  --allocation-method Static

# Get WAF policy ID
WAF_POLICY_ID=$(az network application-gateway waf-policy show \
  --name $WAF_POLICY \
  --resource-group $RG \
  --query id -o tsv)

# Create Application Gateway WAF_v2 with the WAF policy
az network application-gateway create \
  --resource-group $RG \
  --name appgw-tailwind \
  --location $LOCATION \
  --sku WAF_v2 \
  --capacity 2 \
  --vnet-name vnet-appgw \
  --subnet snet-appgw \
  --public-ip-address pip-appgw \
  --waf-policy $WAF_POLICY_ID \
  --priority 100 \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --frontend-port 80
```

### Azure PowerShell

```powershell
# Create VNet for Application Gateway
$subnet = New-AzVirtualNetworkSubnetConfig -Name "snet-appgw" -AddressPrefix "10.50.1.0/24"
$vnet = New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-appgw" `
  -Location $location `
  -AddressPrefix "10.50.0.0/16" `
  -Subnet $subnet

# Create public IP
$pip = New-AzPublicIpAddress `
  -ResourceGroupName $rg `
  -Name "pip-appgw" `
  -Location $location `
  -Sku Standard `
  -AllocationMethod Static

# Get WAF policy
$wafPolicy = Get-AzApplicationGatewayFirewallPolicy `
  -ResourceGroupName $rg -Name $wafPolicyName

# Create Application Gateway with WAF policy association
$subnetRef = Get-AzVirtualNetworkSubnetConfig -Name "snet-appgw" -VirtualNetwork $vnet

$ipConfig = New-AzApplicationGatewayIPConfiguration `
  -Name "appgw-ipconfig" -Subnet $subnetRef

$fipConfig = New-AzApplicationGatewayFrontendIPConfig `
  -Name "appgw-frontend-ip" -PublicIPAddress $pip

$fPort = New-AzApplicationGatewayFrontendPort -Name "port80" -Port 80

$listener = New-AzApplicationGatewayHttpListener `
  -Name "listener-http" `
  -Protocol Http `
  -FrontendIPConfiguration $fipConfig `
  -FrontendPort $fPort `
  -FirewallPolicy $wafPolicy

$backendPool = New-AzApplicationGatewayBackendAddressPool -Name "backend-pool"

$backendSettings = New-AzApplicationGatewayBackendHttpSetting `
  -Name "http-settings" -Port 80 -Protocol Http -RequestTimeout 30

$rule = New-AzApplicationGatewayRequestRoutingRule `
  -Name "rule-basic" `
  -RuleType Basic `
  -Priority 100 `
  -HttpListener $listener `
  -BackendAddressPool $backendPool `
  -BackendHttpSettings $backendSettings

New-AzApplicationGateway `
  -ResourceGroupName $rg `
  -Name "appgw-tailwind" `
  -Location $location `
  -Sku (New-AzApplicationGatewaySku -Name WAF_v2 -Tier WAF_v2 -Capacity 2) `
  -GatewayIPConfigurations $ipConfig `
  -FrontendIPConfigurations $fipConfig `
  -FrontendPorts $fPort `
  -HttpListeners $listener `
  -BackendAddressPools $backendPool `
  -BackendHttpSettingsCollection $backendSettings `
  -RequestRoutingRules $rule `
  -FirewallPolicy $wafPolicy
```

## Tarefa 6: Habilitar logs do WAF e verificar a avaliação de regras

### Azure CLI

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group $RG \
  --workspace-name law-tailwind-waf \
  --location $LOCATION

LAW_ID=$(az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-tailwind-waf \
  --query id -o tsv)

# Get Application Gateway resource ID
APPGW_ID=$(az network application-gateway show \
  --resource-group $RG \
  --name appgw-tailwind \
  --query id -o tsv)

# Enable WAF diagnostic logs
az monitor diagnostic-settings create \
  --name waf-diagnostics \
  --resource $APPGW_ID \
  --workspace $LAW_ID \
  --logs '[{"category":"ApplicationGatewayFirewallLog","enabled":true},{"category":"ApplicationGatewayAccessLog","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

### Azure PowerShell

```powershell
# Create Log Analytics workspace
$law = New-AzOperationalInsightsWorkspace `
  -ResourceGroupName $rg `
  -Name "law-tailwind-waf" `
  -Location $location

# Enable diagnostic settings
$appgw = Get-AzApplicationGateway -ResourceGroupName $rg -Name "appgw-tailwind"

$logs = @(
  New-AzDiagnosticSettingLogSettingsObject -Category "ApplicationGatewayFirewallLog" -Enabled $true
  New-AzDiagnosticSettingLogSettingsObject -Category "ApplicationGatewayAccessLog" -Enabled $true
)

New-AzDiagnosticSetting `
  -ResourceId $appgw.Id `
  -Name "waf-diagnostics" `
  -WorkspaceId $law.ResourceId `
  -Log $logs `
  -Metric (New-AzDiagnosticSettingMetricSettingsObject -Category "AllMetrics" -Enabled $true)
```

## Quebra & conserta

Estes exercícios simulam configurações incorretas comuns do WAF.

### Cenário 1: WAF bloqueando chamadas legítimas de API (falso positivo)

**Sintoma**: Após habilitar o modo de Prevenção, seu endpoint de API REST `/api/search?filter=SELECT * FROM products` retorna 403 Forbidden. O log do WAF mostra que a regra 942100 (injeção de SQL) foi disparada pelo parâmetro de consulta.

**Causa raiz**: A regra gerenciada de injeção de SQL (942100 no grupo SQLI) identifica corretamente sintaxe semelhante a SQL no parâmetro de consulta `filter`. No entanto, este é um comportamento legítimo da aplicação para a API de pesquisa.

**Correção**: Adicione uma exclusão para o argumento de requisição específico:

```bash
az network application-gateway waf-policy managed-rule exclusion add \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --match-variable RequestArgNames \
  --selector-match-operator Equals \
  --selector "filter"
```

Alternativamente, desabilite a regra específica apenas para esse parâmetro usando exclusões por regra:

```bash
az network application-gateway waf-policy managed-rule exclusion add \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --match-variable RequestArgNames \
  --selector-match-operator Equals \
  --selector "filter" \
  --rule-sets "[{ruleSetType:Microsoft_DefaultRuleSet,ruleSetVersion:2.1,ruleGroups:[{ruleGroupName:SQLI,rules:[{ruleId:942100}]}]}]"
```

### Cenário 2: Prioridade de regra personalizada causa comportamento inesperado

**Sintoma**: Você criou uma regra personalizada para permitir tráfego do seu serviço de monitoramento (prioridade 50, ação Allow) e uma regra de bloqueio geográfico (prioridade 10, ação Block). Seu serviço de monitoramento, localizado em um país bloqueado, está tendo o acesso negado.

**Causa raiz**: Regras personalizadas são avaliadas em ordem de prioridade (número mais baixo primeiro). A regra de bloqueio geográfico com prioridade 10 é executada antes da regra de permissão com prioridade 50. Como o bloqueio geográfico corresponde primeiro e a ação é Block, a requisição nunca alcança a regra de permissão.

**Correção**: Defina a regra de permissão do monitoramento com um número de prioridade menor que a regra de bloqueio geográfico:

```bash
az network application-gateway waf-policy custom-rule update \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name AllowMonitoring \
  --priority 5
```

### Cenário 3: Modo de Detecção não bloqueia ataques

**Sintoma**: Os logs do WAF mostram tentativas de injeção de SQL sendo detectadas (correspondências de regras aparecem nos logs), mas os ataques não estão sendo bloqueados. Requisições maliciosas ainda alcançam o backend.

**Causa raiz**: A política WAF está no modo de Detecção, que apenas registra correspondências de regras sem executar ação de bloqueio.

**Correção**: Alterne para o modo de Prevenção:

```bash
az network application-gateway waf-policy policy-setting update \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --mode Prevention \
  --state Enabled
```

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-45-q1",
    question: "Em que ordem as regras do WAF são avaliadas no Application Gateway?",
    options: [
      "Regras personalizadas primeiro (por prioridade), depois regras gerenciadas ✅",
      "Regras gerenciadas primeiro, depois regras personalizadas",
      "Todas as regras são avaliadas simultaneamente, vencendo a correspondência mais específica",
      "Em ordem alfabética pelo nome da regra"
    ],
    correctIndex: 0,
    explanation: "As regras personalizadas são sempre avaliadas antes das regras gerenciadas. Dentro das regras personalizadas, números de prioridade mais baixos são avaliados primeiro. Se uma regra personalizada corresponder e a ação for Block ou Allow, o processamento para. Somente se nenhuma regra personalizada corresponder, a avaliação prossegue para as regras gerenciadas."
  },
  {
    id: "az700-45-q2",
    question: "Qual é a diferença entre o modo Detection e Prevention em uma política WAF?",
    options: [
      "Detection apenas registra correspondências; Prevention registra e bloqueia ativamente as requisições correspondentes ✅",
      "Detection bloqueia requisições silenciosamente; Prevention bloqueia e registra",
      "Detection se aplica apenas a regras personalizadas; Prevention se aplica a regras gerenciadas",
      "O modo Detection tem custo menor que o modo Prevention"
    ],
    correctIndex: 0,
    explanation: "O modo Detection monitora e registra todas as correspondências de regras, mas permite que todo o tráfego passe para o backend. O modo Prevention bloqueia ativamente as requisições que correspondem às regras, retornando uma resposta 403. O modo Detection é recomendado durante a implantação inicial do WAF para identificar falsos positivos antes de mudar para Prevention."
  },
  {
    id: "az700-45-q3",
    question: "Qual tipo de conjunto de regras gerenciadas representa o ruleset mais recente mantido pela Microsoft para o WAF do Application Gateway?",
    options: [
      "Microsoft_DefaultRuleSet (DRS) ✅",
      "OWASP",
      "Microsoft_BotManagerRuleSet",
      "Microsoft_HTTPDDoSRuleSet"
    ],
    correctIndex: 0,
    explanation: "Microsoft_DefaultRuleSet (DRS) é o ruleset mais recente mantido pela Microsoft com versões como 2.1. Ele substitui os rulesets OWASP CRS (3.0, 3.1, 3.2) com melhor detecção e menos falsos positivos. Os rulesets OWASP ainda são suportados, mas o DRS é recomendado para novas implantações."
  },
  {
    id: "az700-45-q4",
    question: "Uma regra personalizada tem prioridade 100 e outra tem prioridade 50. Qual é avaliada primeiro?",
    options: [
      "Prioridade 50 é avaliada primeiro (menor número = maior precedência) ✅",
      "Prioridade 100 é avaliada primeiro (maior número = maior precedência)",
      "Ambas são avaliadas simultaneamente",
      "A ordem de avaliação depende do tipo de regra, não da prioridade"
    ],
    correctIndex: 0,
    explanation: "Números de prioridade mais baixos são avaliados primeiro. Prioridade 1 é a mais alta (avaliada primeiro) e prioridade 100 é avaliada após a prioridade 50. Isso é consistente tanto para regras personalizadas do WAF do Application Gateway quanto do Front Door."
  },
  {
    id: "az700-45-q5",
    question: "Qual variável de correspondência de exclusão do WAF você usaria para isentar um parâmetro específico de query string da inspeção de regras?",
    options: [
      "RequestArgNames ✅",
      "RequestHeaderNames",
      "RequestCookieNames",
      "RequestBodyArgNames"
    ],
    correctIndex: 0,
    explanation: "RequestArgNames é usado para excluir nomes específicos de parâmetros de query string da inspeção de regras do WAF. RequestHeaderNames exclui cabeçalhos HTTP e RequestCookieNames exclui cookies. Não existe RequestBodyArgNames; para parâmetros do corpo POST, use RequestArgNames que cobre tanto parâmetros de query string quanto de corpo."
  },
  {
    id: "az700-45-q6",
    question: "Você associa uma política WAF no nível do Application Gateway e uma política diferente em um listener específico. Qual política se aplica às requisições nesse listener?",
    options: [
      "A política no nível do listener substitui a política no nível do gateway ✅",
      "A política no nível do gateway sempre tem precedência",
      "Ambas as políticas são avaliadas e a ação mais restritiva vence",
      "A configuração é inválida e o gateway não iniciará"
    ],
    correctIndex: 0,
    explanation: "As políticas WAF seguem uma hierarquia de especificidade: por regra de caminho substitui por listener, que substitui por gateway. Quando uma política mais específica é associada, ela substitui completamente a política mais ampla para aquele escopo. Isso permite ajuste fino do WAF por site em Application Gateways multi-tenant."
  }
]} />

## Limpeza

Remova todos os recursos criados neste desafio para parar de incorrer em cobranças.

### Azure CLI

```bash
# Delete the entire resource group
az group delete --name rg-tailwind-waf --yes --no-wait
```

### Azure PowerShell

```powershell
# Delete the entire resource group
Remove-AzResourceGroup -Name "rg-tailwind-waf" -Force -AsJob
```

:::tip Verificar limpeza
```bash
az group show --name rg-tailwind-waf 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::

:::danger Lembrete de custo pós-laboratório
O SKU Application Gateway WAF_v2 cobra aproximadamente $0,36/hora como custo fixo. Exclua os recursos imediatamente após concluir os exercícios.
:::
