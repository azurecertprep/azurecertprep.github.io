---
sidebar_position: 7
title: "Challenge 46: WAF on Azure Front Door"
sidebar_label: "Challenge 46"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 46: WAF no Azure Front Door

:::info Tempo e custo estimados
**60-90 minutos** | **~$35/mês base** (Front Door Standard/Premium) | **Peso no exame: 15-20%**
:::

:::danger Aviso de custo
O Azure Front Door Premium (necessário para regras gerenciadas do WAF) tem um custo base de aproximadamente $46/mês. O tier Standard custa aproximadamente $35/mês. Exclua o perfil após concluir os exercícios. Mesmo sem tráfego, a taxa base é cobrada.
:::

## Cenário

O Woodgrove Bank opera uma plataforma SaaS global servida via Azure Front Door. A equipe de segurança identificou vários requisitos:
1. Bloquear acesso de países embargados (filtragem geográfica).
2. Proteger endpoints de API contra abuso com limitação de taxa (100 requisições por minuto por IP para caminhos /api/*).
3. Habilitar proteção contra bots para bloquear bots maliciosos conhecidos enquanto permite crawlers legítimos.
4. Criar regras personalizadas com múltiplas condições de correspondência para bloquear padrões de requisição suspeitos.

Seu trabalho é criar uma política WAF do Front Door, configurar regras personalizadas de filtragem geográfica e limitação de taxa, habilitar o conjunto de regras gerenciado de proteção contra bots, associar a política a um endpoint do Front Door e analisar logs do WAF no Log Analytics.

## Habilidades do exame abordadas

| Habilidade | Peso |
|------------|------|
| Criar uma política WAF para o Azure Front Door | Alto |
| Configurar regras de filtragem geográfica | Alto |
| Configurar regras de limitação de taxa | Alto |
| Habilitar conjunto de regras gerenciado de proteção contra bots | Médio |
| Criar regras personalizadas com múltiplas condições de correspondência | Médio |
| Analisar logs do WAF com Log Analytics | Médio |

## Pré-requisitos

- Assinatura do Azure com função de Colaborador
- Azure CLI 2.75+ com a extensão `front-door`
- Azure PowerShell Az 12.0+
- Compreensão de anatomia de requisições HTTP, códigos de país ISO e conceitos de limitação de taxa

## Tarefa 1: Criar uma política WAF do Front Door

As políticas WAF do Front Door são recursos independentes. Para o tier Premium (necessário para conjuntos de regras gerenciados, incluindo proteção contra bots), use `--sku Premium_AzureFrontDoor`.

### Azure CLI

```bash
# Set variables
RG="rg-woodgrove-frontdoor"
LOCATION="global"
WAF_POLICY="wafpolicywoodgrove"

# Create resource group
az group create --name $RG --location eastus2

# Create Front Door WAF policy (Premium SKU for managed rules)
az network front-door waf-policy create \
  --name $WAF_POLICY \
  --resource-group $RG \
  --sku Premium_AzureFrontDoor \
  --mode Prevention \
  --enabled-state Enabled \
  --redirect-url "https://www.woodgrovebank.com/blocked"
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-woodgrove-frontdoor"
$wafPolicyName = "wafpolicywoodgrove"

# Create resource group
New-AzResourceGroup -Name $rg -Location "eastus2"

# Create Front Door WAF policy
$wafPolicy = New-AzFrontDoorWafPolicy `
  -ResourceGroupName $rg `
  -Name $wafPolicyName `
  -Sku Premium_AzureFrontDoor `
  -Mode Prevention `
  -EnabledState Enabled `
  -RedirectUrl "https://www.woodgrovebank.com/blocked"
```

### Portal do Azure

1. Pesquise por **Web Application Firewall policies** e selecione **Create**.
2. Defina policy for como **Azure Front Door**, tier **Premium**.
3. Defina assinatura, grupo de recursos, nome da política **wafpolicywoodgrove**.
4. Na aba Policy settings, defina Mode como **Prevention**, State como **Enabled**.
5. Defina a URL de redirecionamento para requisições bloqueadas.
6. Selecione **Review + create** e depois **Create**.

:::warning Front Door Standard vs Premium para WAF
- **Tier Standard**: Suporta apenas regras personalizadas (filtragem geográfica, limitação de taxa, regras de correspondência personalizadas).
- **Tier Premium**: Suporta regras personalizadas E conjuntos de regras gerenciados (DRS, proteção contra bots). Se você precisa de regras gerenciadas, deve usar o Premium.
:::

## Tarefa 2: Configurar regra de filtragem geográfica

A filtragem geográfica bloqueia ou permite tráfego com base no país de origem (determinado pela geolocalização do IP do cliente). Use códigos de país ISO 3166-1 alpha-2.

### Azure CLI

```bash
# Create geo-filtering custom rule to block embargoed countries
az network front-door waf-policy rule create \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name BlockEmbargoedCountries \
  --priority 100 \
  --rule-type MatchRule \
  --action Block \
  --match-condition "{match-variable:RemoteAddr,operator:GeoMatch,match-value:[KP,IR,CU,SY,RU]}"

# Verify the rule was created
az network front-door waf-policy rule list \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  -o table
```

### Azure PowerShell

```powershell
# Create geo-filtering match condition
$geoCondition = New-AzFrontDoorWafMatchConditionObject `
  -MatchVariable RemoteAddr `
  -OperatorProperty GeoMatch `
  -MatchValue @("KP", "IR", "CU", "SY", "RU")

# Create the custom rule
$geoRule = New-AzFrontDoorWafCustomRuleObject `
  -Name "BlockEmbargoedCountries" `
  -RuleType MatchRule `
  -MatchCondition $geoCondition `
  -Action Block `
  -Priority 100 `
  -EnabledState Enabled

# Add rule to policy
$wafPolicy = Get-AzFrontDoorWafPolicy -ResourceGroupName $rg -Name $wafPolicyName
$wafPolicy.CustomRules.Add($geoRule)
Set-AzFrontDoorWafPolicy -InputObject $wafPolicy
```

### Portal do Azure

1. Abra **wafpolicywoodgrove**, selecione **Custom rules** em Settings.
2. Selecione **Add custom rule**, nome **BlockEmbargoedCountries**, prioridade **100**, status **Enabled**.
3. Em Conditions, defina match type como **Geo-location**, operation como **Is**, selecione os países **KP, IR, CU, SY, RU**.
4. Defina action como **Deny traffic (Block)**.
5. Selecione **Add** e depois **Save**.

:::tip Códigos de país ISO 3166-1
Códigos comuns para países embargados: KP (Coreia do Norte), IR (Irã), CU (Cuba), SY (Síria), RU (Rússia). O Front Door usa o banco de dados GeoIP da IANA para resolução de IP-para-país. Usuários de VPN podem contornar a filtragem geográfica se seu nó de saída estiver em um país não bloqueado.
:::

## Tarefa 3: Configurar regra de limitação de taxa

A limitação de taxa no Front Door permite restringir o número de requisições de um único endereço IP em uma janela de tempo. Quando o limite é excedido, requisições subsequentes são bloqueadas (ou redirecionadas).

### Azure CLI

```bash
# Create rate limit rule for API endpoints (100 requests per minute per IP)
az network front-door waf-policy rule create \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name RateLimitAPI \
  --priority 200 \
  --rule-type RateLimitRule \
  --rate-limit-threshold 100 \
  --rate-limit-duration 1 \
  --action Block \
  --match-condition "{match-variable:RequestUri,operator:Contains,match-value:[/api/]}"

# Create a more permissive rate limit for general pages
az network front-door waf-policy rule create \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name RateLimitGeneral \
  --priority 210 \
  --rule-type RateLimitRule \
  --rate-limit-threshold 1000 \
  --rate-limit-duration 1 \
  --action Block \
  --match-condition "{match-variable:RequestUri,operator:Contains,match-value:[/]}"
```

### Azure PowerShell

```powershell
# Create rate limit condition (match /api/ paths)
$apiCondition = New-AzFrontDoorWafMatchConditionObject `
  -MatchVariable RequestUri `
  -OperatorProperty Contains `
  -MatchValue @("/api/")

# Create rate limit rule
$rateLimitRule = New-AzFrontDoorWafCustomRuleObject `
  -Name "RateLimitAPI" `
  -RuleType RateLimitRule `
  -MatchCondition $apiCondition `
  -Action Block `
  -Priority 200 `
  -EnabledState Enabled `
  -RateLimitThreshold 100 `
  -RateLimitDurationInMinutes 1

# Add to policy
$wafPolicy = Get-AzFrontDoorWafPolicy -ResourceGroupName $rg -Name $wafPolicyName
$wafPolicy.CustomRules.Add($rateLimitRule)
Set-AzFrontDoorWafPolicy -InputObject $wafPolicy
```

### Portal do Azure

1. Abra **wafpolicywoodgrove**, selecione **Custom rules**.
2. Selecione **Add custom rule**, nome **RateLimitAPI**, prioridade **200**, tipo de regra **Rate limit**.
3. Defina rate limit threshold como **100**, duration como **1 minute**.
4. Em Conditions, defina match type como **Request URI**, operation como **Contains**, valor **/api/**.
5. Defina action como **Deny traffic (Block)**.
6. Selecione **Add** e depois **Save**.

:::tip Duração da limitação de taxa
A duração da limitação de taxa do WAF do Front Door é especificada em minutos (1 ou 5 minutos). O parâmetro `--rate-limit-duration` na CLI aceita o valor em minutos. Um limite de 100 com duração 1 significa: se um único IP enviar mais de 100 requisições para URLs correspondentes dentro de qualquer janela de 1 minuto, as requisições subsequentes serão bloqueadas pelo restante dessa janela.
:::

## Tarefa 4: Habilitar conjunto de regras gerenciado de proteção contra bots

O Microsoft Bot Manager Rule Set identifica e classifica bots em bots bons (crawlers de mecanismos de busca), bots ruins (scrapers, scanners de vulnerabilidade) e bots desconhecidos. Ele requer o tier Premium.

### Azure CLI

```bash
# Add Microsoft Default Rule Set 2.1 (protection against OWASP top 10)
az network front-door waf-policy managed-rules add \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --type Microsoft_DefaultRuleSet \
  --version 2.1 \
  --action Block

# Add Bot Manager Rule Set 1.1
az network front-door waf-policy managed-rules add \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --type Microsoft_BotManagerRuleSet \
  --version 1.1

# List available managed rule set definitions
az network front-door waf-policy managed-rule-definition list \
  --query "[].{Type:ruleSetType, Version:ruleSetVersion}" \
  -o table

# List currently configured managed rules on the policy
az network front-door waf-policy managed-rules list \
  --policy-name $WAF_POLICY \
  --resource-group $RG
```

### Azure PowerShell

```powershell
# Create managed rule set objects
$drsRuleSet = New-AzFrontDoorWafManagedRuleObject `
  -Type Microsoft_DefaultRuleSet `
  -Version 2.1 `
  -Action Block

$botRuleSet = New-AzFrontDoorWafManagedRuleObject `
  -Type Microsoft_BotManagerRuleSet `
  -Version 1.1

# Apply managed rules to policy
$wafPolicy = Get-AzFrontDoorWafPolicy -ResourceGroupName $rg -Name $wafPolicyName
$wafPolicy.ManagedRules = @($drsRuleSet, $botRuleSet)
Set-AzFrontDoorWafPolicy -InputObject $wafPolicy
```

### Portal do Azure

1. Abra **wafpolicywoodgrove**, selecione **Managed rules**.
2. Selecione **Add**, escolha **Microsoft_DefaultRuleSet** versão **2.1**.
3. Selecione **Add** novamente, escolha **Microsoft_BotManagerRuleSet** versão **1.1**.
4. Selecione **Save**.

## Tarefa 5: Criar regra personalizada com múltiplas condições de correspondência

Regras personalizadas podem combinar múltiplas condições que devem TODAS ser verdadeiras (AND lógico) para que a regra seja acionada. Isso permite o direcionamento preciso de padrões de requisição específicos.

### Azure CLI

```bash
# Block requests that match BOTH: specific URI pattern AND suspicious header
az network front-door waf-policy rule create \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name BlockSuspiciousAPIAccess \
  --priority 150 \
  --rule-type MatchRule \
  --action Block \
  --match-condition "{match-variable:RequestUri,operator:Contains,match-value:[/api/admin]}" "{match-variable:RequestHeader,operator:Contains,selector:User-Agent,match-value:[python-requests,curl,wget],transforms:[Lowercase]}"
```

### Azure PowerShell

```powershell
# Condition 1: Request targets admin API
$uriCondition = New-AzFrontDoorWafMatchConditionObject `
  -MatchVariable RequestUri `
  -OperatorProperty Contains `
  -MatchValue @("/api/admin")

# Condition 2: User-Agent indicates automated tool
$uaCondition = New-AzFrontDoorWafMatchConditionObject `
  -MatchVariable RequestHeader `
  -Selector "User-Agent" `
  -OperatorProperty Contains `
  -MatchValue @("python-requests", "curl", "wget") `
  -Transform Lowercase

# Create rule with both conditions (AND logic)
$suspiciousRule = New-AzFrontDoorWafCustomRuleObject `
  -Name "BlockSuspiciousAPIAccess" `
  -RuleType MatchRule `
  -MatchCondition @($uriCondition, $uaCondition) `
  -Action Block `
  -Priority 150 `
  -EnabledState Enabled

# Add to policy
$wafPolicy = Get-AzFrontDoorWafPolicy -ResourceGroupName $rg -Name $wafPolicyName
$wafPolicy.CustomRules.Add($suspiciousRule)
Set-AzFrontDoorWafPolicy -InputObject $wafPolicy
```

## Tarefa 6: Associar política ao endpoint do Front Door e analisar logs

### Azure CLI

```bash
# Create a Front Door profile (Premium tier)
az afd profile create \
  --profile-name fd-woodgrove \
  --resource-group $RG \
  --sku Premium_AzureFrontDoor

# Create an endpoint
az afd endpoint create \
  --endpoint-name woodgrove-endpoint \
  --profile-name fd-woodgrove \
  --resource-group $RG \
  --enabled-state Enabled

# Get WAF policy resource ID
WAF_POLICY_ID=$(az network front-door waf-policy show \
  --name $WAF_POLICY \
  --resource-group $RG \
  --query id -o tsv)

# Create a security policy to associate WAF with the endpoint
az afd security-policy create \
  --security-policy-name sp-waf-woodgrove \
  --profile-name fd-woodgrove \
  --resource-group $RG \
  --waf-policy $WAF_POLICY_ID \
  --domains "/subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Cdn/profiles/fd-woodgrove/afdEndpoints/woodgrove-endpoint"

# Create Log Analytics workspace for WAF logs
az monitor log-analytics workspace create \
  --resource-group $RG \
  --workspace-name law-woodgrove-waf \
  --location eastus2

LAW_ID=$(az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-woodgrove-waf \
  --query id -o tsv)

# Get Front Door profile resource ID
FD_ID=$(az afd profile show \
  --profile-name fd-woodgrove \
  --resource-group $RG \
  --query id -o tsv)

# Enable diagnostic settings for WAF logs
az monitor diagnostic-settings create \
  --name fd-waf-diagnostics \
  --resource $FD_ID \
  --workspace $LAW_ID \
  --logs '[{"category":"FrontDoorWebApplicationFirewallLog","enabled":true},{"category":"FrontDoorAccessLog","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

### Azure PowerShell

```powershell
# Create Front Door profile
$fdProfile = New-AzFrontDoorCdnProfile `
  -ResourceGroupName $rg `
  -ProfileName "fd-woodgrove" `
  -SkuName Premium_AzureFrontDoor `
  -Location "Global"

# Create endpoint
$endpoint = New-AzFrontDoorCdnEndpoint `
  -ResourceGroupName $rg `
  -ProfileName "fd-woodgrove" `
  -EndpointName "woodgrove-endpoint" `
  -Location "Global"

# Associate WAF policy via security policy
$wafPolicy = Get-AzFrontDoorWafPolicy -ResourceGroupName $rg -Name $wafPolicyName

$association = New-AzFrontDoorCdnSecurityPolicyWebApplicationFirewallAssociationObject `
  -Domain @(@{Id = $endpoint.Id}) `
  -PatternsToMatch @("/*")

$parameter = New-AzFrontDoorCdnSecurityPolicyWebApplicationFirewallParametersObject `
  -Association $association `
  -WafPolicyId $wafPolicy.Id

New-AzFrontDoorCdnSecurityPolicy `
  -ResourceGroupName $rg `
  -ProfileName "fd-woodgrove" `
  -Name "sp-waf-woodgrove" `
  -Parameter $parameter

# Create Log Analytics workspace
$law = New-AzOperationalInsightsWorkspace `
  -ResourceGroupName $rg `
  -Name "law-woodgrove-waf" `
  -Location "eastus2"
```

### Consultas KQL para análise de logs do WAF

Após os logs estarem fluindo (aguarde 5-10 minutos), use estas consultas KQL no Log Analytics:

```kusto
AzureDiagnostics
| where Category == "FrontDoorWebApplicationFirewallLog"
| project TimeGenerated, clientIP_s, host_s, requestUri_s, 
    ruleName_s, action_s, policy_s, trackingReference_s
| order by TimeGenerated desc
| take 100

// Count blocks by country
AzureDiagnostics
| where Category == "FrontDoorWebApplicationFirewallLog"
| where action_s == "Block"
| summarize BlockCount = count() by clientCountry_s
| order by BlockCount desc

// Rate limit triggers over time
AzureDiagnostics
| where Category == "FrontDoorWebApplicationFirewallLog"
| where ruleName_s contains "RateLimit"
| summarize Triggers = count() by bin(TimeGenerated, 5m), clientIP_s
| order by Triggers desc

// Bot detection events
AzureDiagnostics
| where Category == "FrontDoorWebApplicationFirewallLog"
| where ruleName_s contains "Bot"
| summarize count() by ruleName_s, action_s
| order by count_ desc
```

## Quebra e correção

Estes exercícios simulam configurações incorretas comuns do WAF do Front Door.

### Cenário 1: Limitação de taxa não acionando

**Sintoma**: Você configurou uma limitação de taxa de 100 requisições por minuto para endpoints /api/, mas durante o teste de carga você enviou 200 requisições em 30 segundos e nenhuma foi bloqueada.

**Causa raiz**: O limite de taxa foi definido muito alto (1000 em vez de 100) ou a condição de correspondência não corresponde ao padrão real do URI da requisição. Além disso, o WAF do Front Door avalia limites de taxa no nível do POP de borda, não globalmente. Se seu tráfego de teste atinge múltiplos POPs, a contagem é distribuída.

**Correção**: Verifique a configuração da regra e reduza o limite se necessário:

```bash
# Check current rule configuration
az network front-door waf-policy rule list \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  -o json | jq '.[] | select(.name=="RateLimitAPI")'

# Update threshold if incorrect
az network front-door waf-policy rule update \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name RateLimitAPI \
  --rate-limit-threshold 100 \
  --rate-limit-duration 1
```

Verifique também se a condição de correspondência tem como alvo o padrão de URI correto. A contagem de limitação de taxa é aplicada por IP de origem por POP do Front Door. Durante os testes, garanta que as requisições sejam roteadas para o mesmo POP usando um único local de cliente.

### Cenário 2: Filtro geográfico bloqueando tráfego legítimo

**Sintoma**: Usuários na Alemanha (DE) relatam estar sendo bloqueados, mas sua regra de filtragem geográfica tem como alvo apenas KP, IR, CU, SY, RU.

**Causa raiz**: A condição de correspondência foi acidentalmente configurada com negação (operador NOT), invertendo a lógica para que bloqueie todos os países EXCETO os listados. Alternativamente, um serviço de VPN ou proxy em um país bloqueado está sendo utilizado.

**Correção**: Verifique se a regra não usa negação:

```bash
# Inspect the rule configuration
az network front-door waf-policy rule list \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  -o json | jq '.[] | select(.name=="BlockEmbargoedCountries")'

# If negation is set, recreate the rule without it
az network front-door waf-policy rule delete \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name BlockEmbargoedCountries

az network front-door waf-policy rule create \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name BlockEmbargoedCountries \
  --priority 100 \
  --rule-type MatchRule \
  --action Block \
  --match-condition "{match-variable:RemoteAddr,operator:GeoMatch,match-value:[KP,IR,CU,SY,RU]}"
```

### Cenário 3: Proteção contra bots bloqueando crawler legítimo

**Sintoma**: O Google Search Console relata que o Googlebot não consegue acessar seu site. Os logs do WAF mostram o Bot Manager Rule Set bloqueando requisições com User-Agent contendo "Googlebot".

**Causa raiz**: O Bot Manager Rule Set classifica bots em categorias. Por padrão, bots bons como o Googlebot devem ser permitidos, mas se a ação do conjunto de regras foi definida como Block para todas as categorias, ou se uma substituição foi aplicada, crawlers legítimos podem ser negados.

**Correção**: Adicione uma substituição de regra gerenciada para permitir o grupo de regras GoodBots:

```bash
# Add an override to allow good bots
az network front-door waf-policy managed-rules override add \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --type Microsoft_BotManagerRuleSet \
  --rule-group-id GoodBots \
  --action Allow
```

Alternativamente, crie uma regra personalizada com um número de prioridade menor para permitir o Googlebot antes que as regras gerenciadas sejam avaliadas:

```bash
az network front-door waf-policy rule create \
  --policy-name $WAF_POLICY \
  --resource-group $RG \
  --name AllowGooglebot \
  --priority 5 \
  --rule-type MatchRule \
  --action Allow \
  --match-condition "{match-variable:RequestHeader,operator:Contains,selector:User-Agent,match-value:[Googlebot]}"
```

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-46-q1",
    question: "What is the key difference between Front Door WAF and Application Gateway WAF?",
    options: [
      "Front Door WAF operates at the global edge (POP locations); Application Gateway WAF operates at the regional level within a VNet ✅",
      "Front Door WAF only supports custom rules; Application Gateway WAF supports both custom and managed rules",
      "Application Gateway WAF supports rate limiting; Front Door WAF does not",
      "Front Door WAF requires Standard tier; Application Gateway WAF requires Premium tier"
    ],
    correctIndex: 0,
    explanation: "Front Door WAF inspects traffic at Microsoft's global edge POP locations before it reaches your origin, providing protection close to the attacker. Application Gateway WAF operates within an Azure region, inside your VNet. Both support custom and managed rules, and both support rate limiting."
  },
  {
    id: "az700-46-q2",
    question: "You configure a Front Door WAF rate limit with threshold 100 and duration 1 minute. A single IP sends 150 requests in 60 seconds. How many requests are blocked?",
    options: [
      "Approximately 50 (requests exceeding the 100 threshold are blocked for the remainder of the window) ✅",
      "All 150 requests are blocked because the limit was exceeded",
      "None, because the count resets every second",
      "Exactly 100 requests are allowed and exactly 50 are blocked"
    ],
    correctIndex: 0,
    explanation: "Rate limiting blocks requests that arrive after the threshold is exceeded within the time window. The first 100 requests pass through, and subsequent requests (approximately 50) in that 1-minute window are blocked. The exact number blocked depends on when the threshold is crossed relative to the window boundary."
  },
  {
    id: "az700-46-q3",
    question: "Which Front Door SKU is required to use managed rule sets including bot protection?",
    options: [
      "Premium_AzureFrontDoor ✅",
      "Standard_AzureFrontDoor",
      "Classic",
      "Any SKU supports managed rules"
    ],
    correctIndex: 0,
    explanation: "Managed rule sets (Microsoft_DefaultRuleSet, Microsoft_BotManagerRuleSet) require the Premium_AzureFrontDoor SKU. The Standard tier only supports custom rules (geo-filtering, rate limiting, match rules). The Classic Front Door tier is the legacy SKU with different WAF capabilities."
  },
  {
    id: "az700-46-q4",
    question: "In a Front Door WAF custom rule with multiple match conditions, what is the logical relationship between conditions?",
    options: [
      "All conditions must be true (logical AND) for the rule to trigger ✅",
      "Any condition being true (logical OR) triggers the rule",
      "Conditions are evaluated in order and the first match triggers the rule",
      "The relationship depends on the rule type (MatchRule vs RateLimitRule)"
    ],
    correctIndex: 0,
    explanation: "Multiple match conditions within a single custom rule are combined with logical AND. ALL conditions must be true for the rule action to execute. To achieve OR logic, create separate rules with the same action. This applies to both MatchRule and RateLimitRule types."
  },
  {
    id: "az700-46-q5",
    question: "Which ISO country code format does Front Door WAF geo-filtering use?",
    options: [
      "ISO 3166-1 alpha-2 (two-letter codes like US, DE, JP) ✅",
      "ISO 3166-1 alpha-3 (three-letter codes like USA, DEU, JPN)",
      "ISO 3166-1 numeric (three-digit codes like 840, 276, 392)",
      "IANA country TLDs (.us, .de, .jp)"
    ],
    correctIndex: 0,
    explanation: "Front Door WAF uses ISO 3166-1 alpha-2 two-letter country codes for geo-filtering. Examples: US (United States), DE (Germany), KP (North Korea), IR (Iran). These are the same codes used by most Azure services for geographic classification."
  },
  {
    id: "az700-46-q6",
    question: "You need to allow Googlebot while blocking other bots. Custom rules evaluate before managed rules. What is the correct approach?",
    options: [
      "Create a custom Allow rule with low priority number matching Googlebot User-Agent, so it triggers before bot protection rules ✅",
      "Disable the entire Bot Manager Rule Set and rely only on custom rules",
      "Set the Bot Manager Rule Set action to Allow for all bots",
      "Move the bot protection rules to a higher priority than custom rules"
    ],
    correctIndex: 0,
    explanation: "Since custom rules evaluate before managed rules, a custom Allow rule with a low priority number (e.g., 5) matching Googlebot's User-Agent will allow the request before the Bot Manager Rule Set evaluates it. This preserves bot protection for all other bots while exempting known good crawlers."
  }
]} />

## Limpeza

Remova todos os recursos criados neste desafio para parar de incorrer em cobranças.

### Azure CLI

```bash
# Delete the entire resource group
az group delete --name rg-woodgrove-frontdoor --yes --no-wait
```

### Azure PowerShell

```powershell
# Delete the entire resource group
Remove-AzResourceGroup -Name "rg-woodgrove-frontdoor" -Force -AsJob
```

:::tip Verificar limpeza
```bash
az group show --name rg-woodgrove-frontdoor 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::

:::danger Lembrete de custo pós-laboratório
O Azure Front Door Premium cobra uma taxa base de aproximadamente $46/mês mesmo com zero tráfego. A política WAF em si é gratuita quando não associada, mas o perfil do Front Door incorre em custo enquanto existir. Exclua prontamente.
:::
