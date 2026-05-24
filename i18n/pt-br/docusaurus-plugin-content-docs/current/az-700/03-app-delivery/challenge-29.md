---
sidebar_position: 5
title: "Desafio 29: Application Gateway TLS e Regravações"
sidebar_label: "Challenge 29"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 29: Application Gateway TLS e regras de reescrita

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,27/h (WAF_v2 SKU)** | **Peso no exame: 15-20%**

:::

:::warning Alerta de custo
O Application Gateway v2 Ã© cobrado por hora mesmo quando ocioso. O SKU WAF_v2 custa aproximadamente $0,443/hora-gateway mais $0,0144/hora-unidade de capacidade. Exclua o gateway imediatamente apÃ³s concluir este desafio para evitar cobranÃ§as inesperadas.
:::

## CenÃ¡rio

VocÃª Ã© o engenheiro de seguranÃ§a da Woodgrove Financial Services. A empresa possui requisitos rigorosos para proteger o trÃ¡fego atravÃ©s do Application Gateway:

- **AplicaÃ§Ãµes pÃºblicas** devem usar terminaÃ§Ã£o TLS no gateway com certificados armazenados no Azure Key Vault
- **Endpoints de API de parceiros** exigem TLS mÃºtuo (mTLS), onde tanto o gateway quanto o cliente conectante apresentam certificados para autenticaÃ§Ã£o
- **TLS de ponta a ponta** Ã© obrigatÃ³rio para o backend de processamento de pagamentos, mantendo a criptografia entre o gateway e os servidores de back-end
- **MigraÃ§Ã£o de URLs legadas** requer regras de reescrita para redirecionar padrÃµes de URL antigos para a nova estrutura de API sem quebrar integraÃ§Ãµes existentes
- **Redirecionamento HTTP-para-HTTPS** deve ser aplicado globalmente

Sua tarefa Ã© configurar polÃ­ticas TLS, fazer upload de certificados, habilitar mTLS, criar regras de reescrita para manipulaÃ§Ã£o de cabeÃ§alhos e URLs, e configurar redirecionamentos.

## VisÃ£o geral da arquitetura

```text
Internet
   |
   v
[Client w/ cert] --mTLS--> [AppGW] --E2E TLS--> [Partner API Pool]
[Browser]        --TLS----> [AppGW] --HTTP-----> [Web Pool]
[Legacy client]  --HTTP---> [AppGW] --301------> HTTPS listener
```

## PrÃ©-requisitos

- Desafio 28 concluÃ­do (Application Gateway implantado)
- Certificados autoassinados para teste (formato PFX)
- OpenSSL ou PowerShell para geraÃ§Ã£o de certificados

---

## Tarefa 1: Gerar certificados de teste

Esses certificados autoassinados sÃ£o apenas para fins de laboratÃ³rio. Ambientes de produÃ§Ã£o devem usar certificados de uma Autoridade Certificadora confiÃ¡vel.

### Bash (OpenSSL)

```bash
# Generate CA certificate (used for mTLS client verification)
openssl req -x509 -sha256 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout ca.key \
  -out ca.crt \
  -subj "/CN=Woodgrove-CA/O=Woodgrove Financial"

# Generate server certificate for TLS termination
openssl req -x509 -sha256 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout server.key \
  -out server.crt \
  -subj "/CN=*.woodgrove.com/O=Woodgrove Financial"

# Package server cert as PFX for Application Gateway
openssl pkcs12 -export \
  -out server.pfx \
  -inkey server.key \
  -in server.crt \
  -password pass:AppGwP@ss123

# Generate client certificate signed by CA (for mTLS testing)
openssl req -new -nodes \
  -newkey rsa:2048 \
  -keyout client.key \
  -out client.csr \
  -subj "/CN=partner-client/O=Partner Corp"

openssl x509 -req -days 365 \
  -in client.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out client.crt

# Generate backend certificate for E2E TLS
openssl req -x509 -sha256 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout backend.key \
  -out backend.crt \
  -subj "/CN=backend.woodgrove.internal/O=Woodgrove Financial"

# Export backend public key (CER format for auth-cert)
openssl x509 -in backend.crt -outform der -out backend.cer
```

### PowerShell

```powershell
# Generate self-signed server certificate
$serverCert = New-SelfSignedCertificate `
  -CertStoreLocation "cert:\LocalMachine\My" `
  -DnsName "*.woodgrove.com" `
  -KeyLength 2048

# Export as PFX
$pwd = ConvertTo-SecureString -String "AppGwP@ss123" -Force -AsPlainText
Export-PfxCertificate `
  -Cert "cert:\LocalMachine\My\$($serverCert.Thumbprint)" `
  -FilePath ".\server.pfx" `
  -Password $pwd

# Generate CA certificate for mTLS
$caCert = New-SelfSignedCertificate `
  -CertStoreLocation "cert:\LocalMachine\My" `
  -Subject "CN=Woodgrove-CA" `
  -KeyUsage CertSign `
  -KeyLength 2048

# Export CA public cert
Export-Certificate `
  -Cert "cert:\LocalMachine\My\$($caCert.Thumbprint)" `
  -FilePath ".\ca.cer" `
  -Type CERT
```

---

## Tarefa 2: Configurar terminaÃ§Ã£o TLS

A terminaÃ§Ã£o TLS descriptografa o trÃ¡fego no Application Gateway. O gateway realiza o handshake SSL, reduzindo a carga de CPU nos servidores de back-end.

### Azure CLI

```bash
# Upload PFX certificate to Application Gateway
az network application-gateway ssl-cert create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name cert-woodgrove \
  --cert-file ./server.pfx \
  --cert-password "AppGwP@ss123"

# Create HTTPS frontend port
az network application-gateway frontend-port create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name port443 \
  --port 443

# Create HTTPS listener with SSL certificate
az network application-gateway http-listener create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name listener-https-woodgrove \
  --frontend-port port443 \
  --ssl-cert cert-woodgrove \
  --host-name "app.woodgrove.com"
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"

# Add SSL certificate
$password = ConvertTo-SecureString -String "AppGwP@ss123" -AsPlainText -Force
$appgw = Add-AzApplicationGatewaySslCertificate `
  -ApplicationGateway $appgw `
  -Name "cert-woodgrove" `
  -CertificateFile ".\server.pfx" `
  -Password $password

# Add HTTPS frontend port
$appgw = Add-AzApplicationGatewayFrontendPort `
  -ApplicationGateway $appgw `
  -Name "port443" `
  -Port 443

# Get references
$fipconfig = Get-AzApplicationGatewayFrontendIPConfig -ApplicationGateway $appgw -Name "appGwFrontendIP"
$fp443 = Get-AzApplicationGatewayFrontendPort -ApplicationGateway $appgw -Name "port443"
$sslCert = Get-AzApplicationGatewaySslCertificate -ApplicationGateway $appgw -Name "cert-woodgrove"

# Add HTTPS listener
$appgw = Add-AzApplicationGatewayHttpListener `
  -ApplicationGateway $appgw `
  -Name "listener-https-woodgrove" `
  -Protocol Https `
  -FrontendIPConfiguration $fipconfig `
  -FrontendPort $fp443 `
  -SslCertificate $sslCert `
  -HostName "app.woodgrove.com"

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Tarefa 3: Definir polÃ­tica TLS

As polÃ­ticas TLS controlam quais versÃµes de protocolo e conjuntos de cifras sÃ£o aceitÃ¡veis. O Application Gateway suporta os tipos de polÃ­tica Predefined, Custom e CustomV2.

### Azure CLI

```bash
# Set predefined TLS policy (recommended: AppGwSslPolicy20220101S for strictest)
az network application-gateway ssl-policy set \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --policy-type Predefined \
  --name AppGwSslPolicy20220101S

# Alternatively, set a custom policy with specific minimum version
az network application-gateway ssl-policy set \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --policy-type Custom \
  --min-protocol-version TLSv1_2 \
  --cipher-suites TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"

# Set predefined policy
Set-AzApplicationGatewaySslPolicy `
  -ApplicationGateway $appgw `
  -PolicyType Predefined `
  -PolicyName "AppGwSslPolicy20220101S"

# Or set custom policy
Set-AzApplicationGatewaySslPolicy `
  -ApplicationGateway $appgw `
  -PolicyType Custom `
  -MinProtocolVersion TLSv1_2 `
  -CipherSuite "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384", "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Tarefa 4: Configurar TLS de ponta a ponta

O TLS de ponta a ponta mantÃ©m a criptografia entre o Application Gateway e os servidores de back-end. Para o SKU v2, vocÃª faz upload do certificado de CA raiz confiÃ¡vel que assinou o certificado do servidor de back-end.

### Azure CLI

```bash
# Upload trusted root certificate for backend verification (v2 uses root-cert)
az network application-gateway root-cert create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name backend-root-cert \
  --cert-file ./ca.crt

# Create HTTPS backend settings with the trusted root cert
az network application-gateway http-settings create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name settings-e2e-tls \
  --port 443 \
  --protocol Https \
  --cookie-based-affinity Disabled \
  --timeout 60 \
  --host-name-from-backend-pool false \
  --root-certs backend-root-cert
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"

# Add trusted root certificate
$appgw = Add-AzApplicationGatewayTrustedRootCertificate `
  -ApplicationGateway $appgw `
  -Name "backend-root-cert" `
  -CertificateFile ".\ca.crt"

$rootCert = Get-AzApplicationGatewayTrustedRootCertificate -ApplicationGateway $appgw -Name "backend-root-cert"

# Add HTTPS backend settings
$appgw = Add-AzApplicationGatewayBackendHttpSetting `
  -ApplicationGateway $appgw `
  -Name "settings-e2e-tls" `
  -Port 443 `
  -Protocol Https `
  -CookieBasedAffinity Disabled `
  -RequestTimeout 60 `
  -TrustedRootCertificate $rootCert

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Tarefa 5: Configurar TLS mÃºtuo (mTLS)

O TLS mÃºtuo exige que o cliente apresente um certificado que Ã© validado contra uma CA de cliente confiÃ¡vel. No Application Gateway v2, o mTLS Ã© configurado atravÃ©s de perfis SSL e certificados de cliente confiÃ¡veis.

### Azure CLI

```bash
# Upload trusted client CA certificate
az network application-gateway client-cert add \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name trusted-client-ca \
  --data @ca.crt

# Create SSL profile with mTLS enabled
az network application-gateway ssl-profile add \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name profile-mtls \
  --client-auth-configuration true \
  --trusted-client-cert trusted-client-ca \
  --policy-type Predefined \
  --policy-name AppGwSslPolicy20220101S

# Associate SSL profile with a listener
az network application-gateway http-listener update \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name listener-https-woodgrove \
  --ssl-profile-id "/subscriptions/{sub-id}/resourceGroups/rg-appgw-lab/providers/Microsoft.Network/applicationGateways/appgw-multisite/sslProfiles/profile-mtls"
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"

# Add trusted client certificate
$appgw = Add-AzApplicationGatewayTrustedClientCertificate `
  -ApplicationGateway $appgw `
  -Name "trusted-client-ca" `
  -CertificateFile ".\ca.cer"

$clientCert = Get-AzApplicationGatewayTrustedClientCertificate -ApplicationGateway $appgw -Name "trusted-client-ca"

# Add SSL profile with client authentication
$appgw = Add-AzApplicationGatewaySslProfile `
  -ApplicationGateway $appgw `
  -Name "profile-mtls" `
  -TrustedClientCertificate $clientCert `
  -PolicyType Predefined `
  -PolicyName "AppGwSslPolicy20220101S"

# Update the SSL profile to enable client auth verification
# The client-auth-configuration flag enables certificate verification

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Tarefa 6: Criar regras de reescrita

As regras de reescrita modificam cabeÃ§alhos de requisiÃ§Ã£o e resposta HTTP, e podem reescrever caminhos de URL e query strings. Elas sÃ£o avaliadas apÃ³s o processamento das regras de roteamento.

### Azure CLI

```bash
# Create a rewrite rule set
az network application-gateway rewrite-rule set create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name rewrite-set-headers

# Create rewrite rule to add security headers to responses
az network application-gateway rewrite-rule create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --rule-set-name rewrite-set-headers \
  --name add-security-headers \
  --sequence 100 \
  --response-headers "Strict-Transport-Security=max-age=31536000; includeSubDomains" "X-Content-Type-Options=nosniff"

# Create rewrite rule for URL rewrite (legacy migration)
az network application-gateway rewrite-rule create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --rule-set-name rewrite-set-headers \
  --name rewrite-legacy-url \
  --sequence 200 \
  --modified-path "/v2/api/{var_uri_path_1}" \
  --conditions "[{\"variable\":\"var_uri_path\",\"pattern\":\"/v1/api/(.*)\",\"ignore-case\":true,\"negate\":false}]"

# Create rewrite rule to strip server header from response
az network application-gateway rewrite-rule create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --rule-set-name rewrite-set-headers \
  --name strip-server-header \
  --sequence 300 \
  --response-headers "Server="
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"

# Create response header action (add HSTS)
$responseHeaderAction = New-AzApplicationGatewayRewriteRuleHeaderConfiguration `
  -HeaderName "Strict-Transport-Security" `
  -HeaderValue "max-age=31536000; includeSubDomains"

$responseHeaderAction2 = New-AzApplicationGatewayRewriteRuleHeaderConfiguration `
  -HeaderName "X-Content-Type-Options" `
  -HeaderValue "nosniff"

# Create the action set
$actionSet = New-AzApplicationGatewayRewriteRuleActionSet `
  -ResponseHeaderConfiguration $responseHeaderAction, $responseHeaderAction2

# Create the rewrite rule
$rewriteRule = New-AzApplicationGatewayRewriteRule `
  -Name "add-security-headers" `
  -ActionSet $actionSet `
  -RuleSequence 100

# Create URL rewrite condition for legacy migration
$condition = New-AzApplicationGatewayRewriteRuleCondition `
  -Variable "var_uri_path" `
  -Pattern "/v1/api/(.*)" `
  -IgnoreCase

$urlAction = New-AzApplicationGatewayRewriteRuleUrlConfiguration `
  -ModifiedPath "/v2/api/{var_uri_path_1}"

$urlActionSet = New-AzApplicationGatewayRewriteRuleActionSet `
  -UrlConfiguration $urlAction

$urlRewriteRule = New-AzApplicationGatewayRewriteRule `
  -Name "rewrite-legacy-url" `
  -ActionSet $urlActionSet `
  -RuleSequence 200 `
  -Condition $condition

# Create the rewrite rule set
$appgw = Add-AzApplicationGatewayRewriteRuleSet `
  -ApplicationGateway $appgw `
  -Name "rewrite-set-headers" `
  -RewriteRule $rewriteRule, $urlRewriteRule

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Tarefa 7: Configurar redirecionamento HTTP-para-HTTPS

### Azure CLI

```bash
# Create HTTP listener for redirection
az network application-gateway http-listener create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name listener-http-redirect \
  --frontend-port frontendPort80

# Create redirect configuration (301 Permanent)
az network application-gateway redirect-config create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name redirect-http-to-https \
  --type Permanent \
  --target-listener listener-https-woodgrove \
  --include-path true \
  --include-query-string true

# Create routing rule for the redirect
az network application-gateway rule create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name rule-http-redirect \
  --rule-type Basic \
  --priority 50 \
  --http-listener listener-http-redirect \
  --redirect-config redirect-http-to-https
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"

$httpsListener = Get-AzApplicationGatewayHttpListener -ApplicationGateway $appgw -Name "listener-https-woodgrove"

# Create redirect configuration
$appgw = Add-AzApplicationGatewayRedirectConfiguration `
  -ApplicationGateway $appgw `
  -Name "redirect-http-to-https" `
  -RedirectType Permanent `
  -TargetListener $httpsListener `
  -IncludePath $true `
  -IncludeQueryString $true

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

### Portal

1. Navegue atÃ© o recurso do Application Gateway
2. Selecione **Listeners** e crie um ouvinte HTTP na porta 80
3. Selecione **Rules** e crie uma nova regra de roteamento
4. Defina o tipo de regra como **Basic** e selecione o ouvinte HTTP
5. Em **Backend targets**, selecione **Redirection** em vez de Backend pool
6. Escolha o tipo de destino **Listener** e selecione seu ouvinte HTTPS
7. Marque **Include path** e **Include query string**
8. Defina o tipo de redirecionamento como **Permanent (301)**

---

## ExercÃ­cios de quebra e correÃ§Ã£o

### Problema 1: Cadeia de certificados incompleta (intermediÃ¡rio ausente)

**Sintoma**: Os navegadores exibem "NET::ERR_CERT_AUTHORITY_INVALID" ao conectar ao ouvinte HTTPS. O certificado parece vÃ¡lido quando inspecionado diretamente, mas a cadeia nÃ£o pode ser verificada.

**Causa raiz**: O arquivo PFX carregado no Application Gateway contÃ©m apenas o certificado folha sem os certificados de CA intermediÃ¡rios. Os navegadores precisam da cadeia completa para validar o certificado atÃ© uma raiz confiÃ¡vel.

**CorreÃ§Ã£o**: Reconstrua o arquivo PFX com a cadeia de certificados completa:

```bash
# Combine leaf + intermediate into chain
cat server.crt intermediate.crt > fullchain.crt

# Re-package with full chain
openssl pkcs12 -export \
  -out server-fullchain.pfx \
  -inkey server.key \
  -in fullchain.crt \
  -password pass:AppGwP@ss123

# Update the certificate
az network application-gateway ssl-cert update \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name cert-woodgrove \
  --cert-file ./server-fullchain.pfx \
  --cert-password "AppGwP@ss123"
```

### Problema 2: CondiÃ§Ã£o de reescrita nÃ£o avaliada (nome de variÃ¡vel incorreto)

**Sintoma**: A regra de reescrita de URL estÃ¡ configurada, mas as requisiÃ§Ãµes para `/v1/api/users` nÃ£o estÃ£o sendo reescritas para `/v2/api/users`. A regra parece nÃ£o ter efeito.

**Causa raiz**: A condiÃ§Ã£o usa `uri_path` (sem o prefixo `var_`) como nome da variÃ¡vel de servidor. As condiÃ§Ãµes de reescrita do Application Gateway exigem o formato correto da variÃ¡vel: `var_uri_path` para o caminho do URI.

**CorreÃ§Ã£o**: Atualize a condiÃ§Ã£o da regra de reescrita para usar o nome de variÃ¡vel correto:

```bash
az network application-gateway rewrite-rule update \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --rule-set-name rewrite-set-headers \
  --name rewrite-legacy-url \
  --conditions "[{\"variable\":\"var_uri_path\",\"pattern\":\"/v1/api/(.*)\",\"ignore-case\":true,\"negate\":false}]"
```

As variÃ¡veis de servidor comuns para condiÃ§Ãµes de reescrita incluem: `var_uri_path`, `var_query_string`, `var_host`, `var_request_uri`, `var_server_name`, e cabeÃ§alhos HTTP acessados como `http_req_HeaderName`.

### Problema 3: Cookie de afinidade causando desbalanceamento

**Sintoma**: ApÃ³s habilitar a afinidade baseada em cookie, um servidor de back-end recebe 90% do trÃ¡fego enquanto os outros permanecem ociosos. Novas sessÃµes nÃ£o estÃ£o sendo distribuÃ­das uniformemente.

**Causa raiz**: A afinidade baseada em cookie fixa uma sessÃ£o de cliente a um servidor de back-end especÃ­fico durante toda sua vida Ãºtil. Se a distribuiÃ§Ã£o inicial de sessÃµes estava desbalanceada (por exemplo, durante uma implantaÃ§Ã£o quando apenas um servidor estava saudÃ¡vel), as requisiÃ§Ãµes subsequentes continuam sendo roteadas para esse servidor via cookie de afinidade.

**CorreÃ§Ã£o**: Desabilite e reabilite temporariamente a afinidade, ou ajuste as configuraÃ§Ãµes HTTP:

```bash
# Disable cookie-based affinity to reset distribution
az network application-gateway http-settings update \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name settings-web \
  --cookie-based-affinity Disabled

# Re-enable with shorter cookie lifetime if needed
az network application-gateway http-settings update \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name settings-web \
  --cookie-based-affinity Enabled
```

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[{id:"q1", question:"Qual tipo de política TLS você deve usar para especificar tanto uma versão mínima de protocolo quanto uma lista personalizada de cipher suites?", options:["Predefined","Custom ✅","CustomV2","Standard"], correctIndex:1, explanation:"O tipo de política Custom permite especificar tanto uma versão mínima de protocolo (--min-protocol-version) quanto cipher suites específicos (--cipher-suites). Políticas predefinidas usam uma configuração nomeada fixa. CustomV2 é para ciphers mais recentes com TLS 1.2/1.3."},{id:"q2", question:"No TLS mútuo (mTLS) no Application Gateway v2, onde o certificado CA de cliente confiável é configurado?", options:["Diretamente no listener HTTP","Nas configurações HTTP do backend","Em um perfil SSL associado ao listener ✅","Na configuração de IP do frontend"], correctIndex:2, explanation:"A validação de certificado de cliente mTLS é configurada através de perfis SSL no Application Gateway v2. O perfil SSL referencia certificados de cliente confiáveis e é associado a um listener específico."},{id:"q3", question:"Qual tipo de redirecionamento define um código de status HTTP 301?", options:["Found","Temporary","Permanent ✅","SeeOther"], correctIndex:2, explanation:"O tipo de redirecionamento Permanent mapeia para HTTP 301 (Moved Permanently). Found mapeia para 302, Temporary mapeia para 307 e SeeOther mapeia para 303."},{id:"q4", question:"Qual é o formato correto de variável de servidor para acessar o caminho da URI em uma condição de regra de reescrita?", options:["uri_path","server.uri_path","var_uri_path ✅","http_uri_path"], correctIndex:2, explanation:"As condições de reescrita do Application Gateway usam o prefixo 'var_' para variáveis de servidor. O caminho da URI é acessado como 'var_uri_path'. Cabeçalhos de requisição HTTP usam o formato 'http_req_HeaderName'."},{id:"q5", question:"Para TLS de ponta a ponta com Application Gateway v2, qual tipo de certificado deve ser carregado para verificar o servidor de backend?", options:["A chave privada PFX do servidor de backend","O certificado CA raiz confiável que assinou o certificado do backend ✅","O próprio certificado SSL do Application Gateway","Um certificado de cliente para o backend verificar o gateway"], correctIndex:1, explanation:"O Application Gateway v2 usa certificados raiz confiáveis (a CA que assinou o certificado do servidor de backend) para verificar a identidade do servidor de backend durante TLS de ponta a ponta. O SKU v1 usa certificados de autenticação (o certificado público do backend) em vez disso."},{id:"q6", question:"Uma regra de reescrita tem --include-path definido como true em uma configuração de redirecionamento. O que isso significa?", options:["O caminho da requisição original é anexado à URL de destino do redirecionamento ✅","Um novo caminho é adicionado a todas as requisições independentemente do original","O caminho é removido do redirecionamento","Apenas requisições com um caminho específico disparam o redirecionamento"], correctIndex:0, explanation:"Quando --include-path é true, o caminho da URL da requisição original é preservado e anexado ao destino do redirecionamento. Por exemplo, uma requisição para /old/page seria redirecionada para https://target/old/page em vez de apenas https://target/."}]} />

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
O Application Gateway v2 cobra aproximadamente $0,27/hora enquanto implantado. Sempre exclua seus recursos de laboratÃ³rio imediatamente apÃ³s concluir os exercÃ­cios para evitar custos desnecessÃ¡rios.
:::

---

## Principais conclusÃµes

- A terminaÃ§Ã£o TLS descarrega o processamento SSL para o gateway; o back-end recebe trÃ¡fego HTTP nÃ£o criptografado
- O TLS de ponta a ponta mantÃ©m a criptografia entre o gateway e o back-end; requer um **certificado de raiz confiÃ¡vel** no gateway (SKU v2)
- O TLS mÃºtuo (mTLS) Ã© configurado atravÃ©s de **perfis SSL** que referenciam certificados de CA de cliente confiÃ¡veis
- Tipos de polÃ­tica TLS: **Predefined** (polÃ­tica nomeada), **Custom** (escolha versÃµes e cifras), **CustomV2** (apenas cifras modernas)
- As regras de reescrita usam variÃ¡veis de servidor com o prefixo `var_` (por exemplo, `var_uri_path`, `var_query_string`)
- Os tipos de redirecionamento mapeiam para cÃ³digos de status HTTP: **Permanent** (301), **Found** (302), **SeeOther** (303), **Temporary** (307)
- Os flags `--include-path` e `--include-query-string` nos redirecionamentos controlam se os componentes originais da URL sÃ£o preservados
- Problemas na cadeia de certificados sÃ£o a causa mais comum de erros TLS; sempre inclua certificados intermediÃ¡rios no arquivo PFX
