---
sidebar_position: 5
title: "Desafio 18: Autenticação P2S (Certificado, RADIUS, Entra ID)"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 18: AutenticaÃ§Ã£o P2S (certificado, RADIUS, Entra ID)

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,19/h** (VPN Gateway) | **Peso no exame: 20-25%**

:::

## CenÃ¡rio

A Contoso possui trÃªs grupos distintos de usuÃ¡rios que necessitam de acesso VPN ponto a site com diferentes mecanismos de autenticaÃ§Ã£o. Administradores de TI utilizam autenticaÃ§Ã£o baseada em certificado para forte confianÃ§a no nÃ­vel do dispositivo, funcionÃ¡rios gerais se autenticam via Microsoft Entra ID para logon Ãºnico e integraÃ§Ã£o com acesso condicional, e prestadores externos utilizam autenticaÃ§Ã£o RADIUS contra uma infraestrutura existente de Network Policy Server (NPS). AlÃ©m disso, executivos requerem Always On VPN para manter conectividade persistente sem interaÃ§Ã£o do usuÃ¡rio.

## Habilidades de exame abordadas

| Habilidade | DescriÃ§Ã£o |
|-------|-------------|
| Selecionar um mÃ©todo de autenticaÃ§Ã£o apropriado | Escolher entre certificado, Entra ID e RADIUS com base nos requisitos |
| Configurar autenticaÃ§Ã£o RADIUS | Integrar um servidor RADIUS/NPS com o Gateway VPN |
| Configurar autenticaÃ§Ã£o usando Microsoft Entra ID | Configurar autenticaÃ§Ã£o Entra ID (Azure AD) para VPN P2S |
| Especificar requisitos do Azure para Always On VPN | Entender os requisitos de IKEv2 + certificado de mÃ¡quina |

## VisÃ£o geral da arquitetura

```text
Authentication Methods for P2S VPN
                                          +-------------------+
  Admins (cert)  ----[Client Cert]------->|                   |
                                          |                   |
  Employees      ----[Entra ID/OAuth]--->|   VPN Gateway     |
                                          |   (VpnGw1)        |
  Contractors    ----[RADIUS]----------->|                   |
                       |                   +-------------------+
                       v                          |
               +---------------+           +------+------+
               | NPS Server    |           | VNet        |
               | (RADIUS)      |           | 10.60.0.0/16|
               +---------------+           +-------------+

  Executives   ----[Always On / IKEv2 + Machine Cert]---->
```

## PrÃ©-requisitos

- Um Gateway VPN implantado com P2S habilitado (do Challenge 17)
- Para tarefas do Entra ID: funÃ§Ã£o de Administrador Global ou Administrador de Aplicativos no Microsoft Entra ID
- Para tarefas RADIUS: apenas entendimento conceitual (servidor NPS nÃ£o implantado no laboratÃ³rio)

---

## Tarefa 1: Configurar autenticaÃ§Ã£o baseada em certificado

A autenticaÃ§Ã£o por certificado Ã© o mÃ©todo de autenticaÃ§Ã£o P2S padrÃ£o. VocÃª gera um certificado raiz autoassinado, faz upload da chave pÃºblica para o gateway e emite certificados de cliente assinados por essa raiz.

### Etapa 1a: Gerar certificados raiz e de cliente

#### PowerShell (Windows - usando PKI integrado)

```powershell
# Generate self-signed root certificate
$rootCert = New-SelfSignedCertificate -Type Custom `
  -KeySpec Signature `
  -Subject "CN=ContosoP2SRootCert" `
  -KeyExportPolicy Exportable `
  -HashAlgorithm sha256 `
  -KeyLength 2048 `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -KeyUsageProperty Sign `
  -KeyUsage CertSign

# Generate client certificate signed by root
$clientCert = New-SelfSignedCertificate -Type Custom `
  -DnsName "ContosoP2SClientCert" `
  -KeySpec Signature `
  -Subject "CN=ContosoP2SClientCert" `
  -KeyExportPolicy Exportable `
  -HashAlgorithm sha256 `
  -KeyLength 2048 `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -Signer $rootCert `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.2")

# Export root certificate public key (Base64 encoded .cer)
$rootCertBase64 = [System.Convert]::ToBase64String(
  $rootCert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
)

# Display the base64 string (this is what you upload to Azure)
Write-Output $rootCertBase64
```

### Etapa 1b: Fazer upload do certificado raiz para o Gateway VPN

#### Azure CLI

```bash
# Set variables
RG="rg-p2s-lab"
GW_NAME="vpngw-contoso-p2s"

# Upload root certificate public key to the gateway
# Replace <base64-cert-data> with the actual Base64 string from the root cert export
az network vnet-gateway root-cert create \
  --resource-group $RG \
  --gateway-name $GW_NAME \
  --name "ContosoP2SRootCert" \
  --public-cert-data "<base64-cert-data>"
```

#### Azure PowerShell

```powershell
# Upload root certificate to gateway
$rg = "rg-p2s-lab"
$gwName = "vpngw-contoso-p2s"

# Get the gateway
$gw = Get-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg

# Add the root certificate (using the Base64 string from earlier)
Add-AzVpnClientRootCertificate -VpnClientRootCertificateName "ContosoP2SRootCert" `
  -VirtualNetworkGatewayName $gwName `
  -ResourceGroupName $rg `
  -PublicCertData $rootCertBase64
```

### Etapa 1c: Configurar o gateway para autenticaÃ§Ã£o por certificado

#### Azure CLI

```bash
# Ensure the gateway is configured for certificate authentication
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --address-prefixes "172.16.201.0/24" \
  --client-protocol OpenVPN IkeV2 \
  --vpn-auth-type Certificate
```

#### Azure PowerShell

```powershell
$gw = Get-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg

Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -VpnClientAddressPool "172.16.201.0/24" `
  -VpnClientProtocol "OpenVPN", "IkeV2" `
  -VpnAuthenticationType "Certificate"
```

:::tip Dica de exame
Com autenticaÃ§Ã£o por certificado, a chave pÃºblica do certificado raiz Ã© carregada no gateway. Cada cliente conectando deve ter um certificado de cliente instalado que foi emitido pela CA raiz carregada. O gateway valida a cadeia de certificados durante a conexÃ£o.
:::

---

## Tarefa 2: Revogar um certificado de cliente

Quando um dispositivo Ã© perdido ou um funcionÃ¡rio sai da empresa, vocÃª deve revogar o certificado de cliente para impedir acesso futuro Ã  VPN.

### Azure CLI

```bash
# Revoke a client certificate by its thumbprint
az network vnet-gateway revoked-cert create \
  --resource-group $RG \
  --gateway-name $GW_NAME \
  --name "RevokedClientCert01" \
  --thumbprint "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2"
```

### Azure PowerShell

```powershell
# Revoke a specific client certificate
Add-AzVpnClientRevokedCertificate -VpnClientRevokedCertificateName "RevokedClientCert01" `
  -VirtualNetworkGatewayName $gwName `
  -ResourceGroupName $rg `
  -Thumbprint "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2"
```

### Verificar certificados revogados

```bash
az network vnet-gateway show \
  --resource-group $RG \
  --name $GW_NAME \
  --query "vpnClientConfiguration.vpnClientRevokedCertificates" \
  --output table
```

---

## Tarefa 3: Configurar autenticaÃ§Ã£o Microsoft Entra ID

A autenticaÃ§Ã£o Entra ID fornece logon Ãºnico, polÃ­ticas de acesso condicional e autenticaÃ§Ã£o multifator (MFA) para conexÃµes VPN P2S. Este mÃ©todo requer o tipo de tÃºnel OpenVPN.

### PrÃ©-requisitos para autenticaÃ§Ã£o Entra ID

1. LocatÃ¡rio Microsoft Entra com acesso de Administrador Global
2. O Gateway VPN deve estar configurado com o protocolo OpenVPN
3. O aplicativo Azure VPN Client deve estar registrado em seu locatÃ¡rio
4. Os usuÃ¡rios devem usar o Azure VPN Client (nÃ£o o cliente VPN nativo do SO)

### Etapa 3a: Garantir que OpenVPN estÃ¡ configurado no gateway

```bash
# OpenVPN is required for Entra ID authentication
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --address-prefixes "172.16.201.0/24" \
  --client-protocol OpenVPN
```

### Etapa 3b: Atribuir autenticaÃ§Ã£o Entra ID (AAD) ao gateway

#### Azure CLI

```bash
# Entra ID values (replace with your tenant-specific values)
TENANT_ID="<your-tenant-id>"
AAD_TENANT="https://login.microsoftonline.com/${TENANT_ID}/"
AAD_AUDIENCE="c632b3df-fb67-4d84-bdcf-b95ad541b5c8"  # Azure Public cloud VPN app ID
AAD_ISSUER="https://sts.windows.net/${TENANT_ID}/"

# Assign AAD authentication to the gateway
az network vnet-gateway aad assign \
  --resource-group $RG \
  --gateway-name $GW_NAME \
  --tenant $AAD_TENANT \
  --audience $AAD_AUDIENCE \
  --issuer $AAD_ISSUER
```

#### Azure PowerShell

```powershell
$tenantId = "<your-tenant-id>"
$aadTenant = "https://login.microsoftonline.com/$tenantId/"
$aadAudience = "c632b3df-fb67-4d84-bdcf-b95ad541b5c8"
$aadIssuer = "https://sts.windows.net/$tenantId/"

$gw = Get-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg

Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -AadTenantUri $aadTenant `
  -AadAudienceId $aadAudience `
  -AadIssuerUri $aadIssuer `
  -VpnClientAddressPool "172.16.201.0/24" `
  -VpnClientProtocol "OpenVPN"
```

### Etapa 3c: Verificar configuraÃ§Ã£o do Entra ID

```bash
# Show the AAD configuration on the gateway
az network vnet-gateway aad show \
  --resource-group $RG \
  --gateway-name $GW_NAME
```

### Etapa 3d: Remover autenticaÃ§Ã£o Entra ID (se necessÃ¡rio)

```bash
az network vnet-gateway aad remove \
  --resource-group $RG \
  --gateway-name $GW_NAME
```

### IDs de audiÃªncia por nuvem Azure

| Nuvem | ID do aplicativo Azure VPN Client |
|-------|------------------------|
| Azure Public | `c632b3df-fb67-4d84-bdcf-b95ad541b5c8` |
| Azure Government | `51bb15d4-3a4f-4ebf-9dca-40096fe32426` |
| Azure China 21Vianet | `49f817b6-84ae-4cc0-928c-73f27289b3aa` |

:::warning RestriÃ§Ã£o crÃ­tica
A autenticaÃ§Ã£o Entra ID funciona SOMENTE com o tipo de tÃºnel OpenVPN. Se o seu gateway estiver configurado apenas com IKEv2 ou SSTP, a autenticaÃ§Ã£o Entra ID nÃ£o pode ser utilizada. VocÃª deve adicionar ou mudar para OpenVPN antes de habilitar a autenticaÃ§Ã£o Entra ID.
:::

---

## Tarefa 4: Configurar autenticaÃ§Ã£o RADIUS

A autenticaÃ§Ã£o RADIUS permite que vocÃª aproveite a infraestrutura existente de Network Policy Server (NPS) para autenticaÃ§Ã£o VPN. Isso Ã© comum quando organizaÃ§Ãµes jÃ¡ possuem polÃ­ticas NPS para controle de acesso Ã  rede.

### Etapa 4a: Configurar o gateway para RADIUS

#### Azure CLI

```bash
# Configure RADIUS authentication on the gateway
# The RADIUS server must be reachable from the VPN gateway VNet
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --address-prefixes "172.16.201.0/24" \
  --client-protocol OpenVPN IkeV2 \
  --radius-server "10.60.1.10" \
  --radius-secret "YourRadiusSharedSecret123!" \
  --vpn-auth-type Radius
```

#### Azure PowerShell

```powershell
$gw = Get-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg

Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -VpnClientAddressPool "172.16.201.0/24" `
  -VpnClientProtocol "OpenVPN", "IkeV2" `
  -VpnAuthenticationType "Radius" `
  -RadiusServerAddress "10.60.1.10" `
  -RadiusServerSecret (ConvertTo-SecureString "YourRadiusSharedSecret123!" -AsPlainText -Force)
```

### Etapa 4b: Gerar configuraÃ§Ã£o do cliente para RADIUS com EAP-MSCHAPv2

```bash
# Generate VPN client config for RADIUS with username/password auth
az network vnet-gateway vpn-client generate \
  --resource-group $RG \
  --name $GW_NAME \
  --authentication-method EAPMSCHAPv2
```

### Etapa 4c: Gerar configuraÃ§Ã£o do cliente para RADIUS com certificado (EAP-TLS)

```bash
# Generate VPN client config for RADIUS with certificate auth
az network vnet-gateway vpn-client generate \
  --resource-group $RG \
  --name $GW_NAME \
  --authentication-method EAPTLS
```

### Requisitos de arquitetura RADIUS

| Componente | Requisito |
|-----------|------------|
| Servidor NPS | Deve ser acessÃ­vel pela rede a partir da VNet do Gateway VPN |
| Chave compartilhada | Deve coincidir exatamente entre o gateway e o servidor NPS |
| PolÃ­ticas NPS | Devem incluir uma polÃ­tica de rede permitindo conexÃµes VPN |
| NPS como cliente RADIUS | O IP pÃºblico do Gateway VPN deve ser registrado como cliente RADIUS no NPS |
| Porta | NPS escuta em UDP 1812 (autenticaÃ§Ã£o) e 1813 (contabilizaÃ§Ã£o) |
| Alta disponibilidade | Configure dois servidores RADIUS para redundÃ¢ncia |

:::note Conectividade RADIUS
O servidor RADIUS deve ser acessÃ­vel a partir da sub-rede do gateway. Se o servidor NPS estiver on-premises, vocÃª precisa de uma conexÃ£o VPN site a site ou ExpressRoute entre a VNet do Azure e a rede on-premises antes que a autenticaÃ§Ã£o RADIUS funcione para clientes P2S.
:::

---

## Tarefa 5: Configurar multi-autenticaÃ§Ã£o

O Azure VPN Gateway suporta a configuraÃ§Ã£o de mÃºltiplos mÃ©todos de autenticaÃ§Ã£o simultaneamente, permitindo que diferentes grupos de usuÃ¡rios se autentiquem de maneiras diferentes.

### Azure CLI

```bash
# Configure gateway with both Certificate and Entra ID authentication
az network vnet-gateway create \
  --resource-group $RG \
  --name $GW_NAME \
  --vnet "vnet-contoso-p2s" \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw1 \
  --vpn-gateway-generation Generation1 \
  --public-ip-addresses "pip-vpngw-p2s" \
  --address-prefixes "172.16.201.0/24" \
  --client-protocol OpenVPN \
  --vpn-auth-type AAD Certificate Radius \
  --aad-tenant "https://login.microsoftonline.com/<tenant-id>/" \
  --aad-audience "c632b3df-fb67-4d84-bdcf-b95ad541b5c8" \
  --aad-issuer "https://sts.windows.net/<tenant-id>/" \
  --radius-server "10.60.1.10" \
  --radius-secret "YourRadiusSharedSecret123!" \
  --root-cert-name "ContosoP2SRootCert" \
  --root-cert-data "root-cert.cer"
```

:::tip Dica de exame
Multi-autenticaÃ§Ã£o (combinando AAD + Certificado + Radius) requer o tipo de tÃºnel OpenVPN. O parÃ¢metro `--vpn-auth-type` aceita valores separados por espaÃ§o: `AAD`, `Certificate` e `Radius`.
:::

---

## Tarefa 6: Configurar requisitos do Always On VPN

O Always On VPN garante que um dispositivo Windows 10/11 autorizado mantenha uma conexÃ£o VPN persistente sem exigir interaÃ§Ã£o do usuÃ¡rio.

### Requisitos do Always On VPN

| Requisito | Detalhe |
|-------------|--------|
| Tipo de tÃºnel | IKEv2 (obrigatÃ³rio para tÃºnel de dispositivo) |
| AutenticaÃ§Ã£o | Certificado de mÃ¡quina (tÃºnel de dispositivo) + Certificado de usuÃ¡rio ou Entra ID (tÃºnel de usuÃ¡rio) |
| SO do cliente | Windows 10/11 Enterprise ou Education |
| ConfiguraÃ§Ã£o | Implantado via Intune, SCCM ou PowerShell VPNv2 CSP |
| Dois tÃºneis | TÃºnel de dispositivo (antes do logon) + TÃºnel de usuÃ¡rio (apÃ³s logon) |

### Tipos de tÃºnel Always On VPN

```text
+-------------------------------------------------------+
|  DEVICE TUNNEL (IKEv2 + machine cert)                 |
|  - Connects before user logs on                        |
|  - Limited to infrastructure resources (DC, SCCM)     |
|  - Machine certificate from internal CA               |
+-------------------------------------------------------+
|  USER TUNNEL (IKEv2 or OpenVPN)                       |
|  - Connects after user authenticates                  |
|  - Full access to corporate resources                 |
|  - User certificate, Entra ID, or RADIUS             |
+-------------------------------------------------------+
```

### ConfiguraÃ§Ã£o do gateway para Always On VPN

```bash
# Gateway must support IKEv2 for device tunnel
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --address-prefixes "172.16.201.0/24" \
  --client-protocol IkeV2 OpenVPN
```

```powershell
# PowerShell - configure for Always On VPN
$gw = Get-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg

Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -VpnClientAddressPool "172.16.201.0/24" `
  -VpnClientProtocol "IkeV2", "OpenVPN"
```

:::warning RestriÃ§Ãµes do Always On VPN
- O tÃºnel de dispositivo requer IKEv2 e autenticaÃ§Ã£o por certificado de mÃ¡quina exclusivamente
- O tÃºnel de dispositivo nÃ£o pode usar autenticaÃ§Ã£o Entra ID ou RADIUS
- SSTP nÃ£o pode ser usado para tÃºneis de dispositivo Always On VPN
- O dispositivo deve ser associado ao domÃ­nio e executar Windows 10/11 Enterprise ou Education
:::

---

## Tarefa 7: ComparaÃ§Ã£o de mÃ©todos de autenticaÃ§Ã£o

### Matriz de decisÃ£o

| CritÃ©rio | Certificado | Entra ID | RADIUS |
|----------|:-----------:|:--------:|:------:|
| Tipos de tÃºnel suportados | OpenVPN, IKEv2, SSTP | Apenas OpenVPN | OpenVPN, IKEv2, SSTP |
| Suporte a MFA | NÃ£o (apenas confianÃ§a de dispositivo) | Sim (Acesso Condicional) | Sim (polÃ­tica NPS) |
| Acesso Condicional | NÃ£o | Sim | Parcial (via NPS) |
| ExperiÃªncia SSO | NÃ£o | Sim | NÃ£o |
| Requer infraestrutura adicional | NÃ£o | Entra ID P1/P2 para CA | Servidor NPS |
| Gerenciamento de certificados | Manual ou PKI | Nenhum | Depende do mÃ©todo EAP |
| MÃ©todo de revogaÃ§Ã£o | Upload de thumbprint | Desabilitar conta de usuÃ¡rio | PolÃ­tica NPS |
| TÃºnel de dispositivo Always On | Sim | NÃ£o | NÃ£o |
| Aplicativo cliente necessÃ¡rio | Nativo ou OpenVPN | Azure VPN Client | Nativo ou OpenVPN |

### Quando usar cada mÃ©todo

- **Certificado**: Melhor para confianÃ§a no nÃ­vel do dispositivo, tÃºneis de dispositivo Always On VPN e ambientes sem Entra ID P1/P2
- **Entra ID**: Melhor para autenticaÃ§Ã£o centrada no usuÃ¡rio com SSO, MFA e acesso condicional; requer Azure VPN Client
- **RADIUS**: Melhor para organizaÃ§Ãµes com infraestrutura NPS existente, polÃ­ticas complexas de acesso Ã  rede ou provedores de identidade de terceiros

---

## CenÃ¡rios de quebra e correÃ§Ã£o

### CenÃ¡rio 1: Entra ID configurado com IKEv2 (incompatÃ­vel)

**Sintoma:** ApÃ³s configurar a autenticaÃ§Ã£o Entra ID, os usuÃ¡rios recebem erros "Authentication method not supported".

**Causa raiz:** O gateway estÃ¡ configurado apenas com o protocolo IKEv2. A autenticaÃ§Ã£o Entra ID requer OpenVPN.

**DiagnÃ³stico:**

```bash
az network vnet-gateway show \
  --resource-group $RG \
  --name $GW_NAME \
  --query "vpnClientConfiguration.vpnClientProtocols"
```

**CorreÃ§Ã£o:** Mude para ou adicione o protocolo OpenVPN:

```bash
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --client-protocol OpenVPN
```

### CenÃ¡rio 2: Certificado de cliente expirado

**Sintoma:** UsuÃ¡rios que se conectavam com sucesso anteriormente agora recebem erros "Certificate has expired".

**Causa raiz:** O certificado de cliente ultrapassou sua data de expiraÃ§Ã£o.

**CorreÃ§Ã£o:** Gere e instale um novo certificado de cliente a partir da mesma CA raiz:

```powershell
# Retrieve the existing root cert from the local store
$rootCert = Get-ChildItem -Path "Cert:\CurrentUser\My" |
  Where-Object { $_.Subject -eq "CN=ContosoP2SRootCert" }

# Generate a new client certificate
New-SelfSignedCertificate -Type Custom `
  -DnsName "ContosoP2SClientCert-Renewed" `
  -KeySpec Signature `
  -Subject "CN=ContosoP2SClientCert-Renewed" `
  -KeyExportPolicy Exportable `
  -HashAlgorithm sha256 `
  -KeyLength 2048 `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -Signer $rootCert `
  -NotAfter (Get-Date).AddMonths(12) `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.2")
```

### CenÃ¡rio 3: Servidor RADIUS inacessÃ­vel

**Sintoma:** Todas as conexÃµes VPN P2S falham com erros de timeout. ConexÃµes baseadas em certificado funcionam normalmente.

**Causa raiz:** O servidor NPS/RADIUS em 10.60.1.10 estÃ¡ inacessÃ­vel a partir da sub-rede do Gateway VPN. Causas comuns incluem regras NSG bloqueando UDP 1812/1813 ou o servidor RADIUS estando offline.

**DiagnÃ³stico:**

```bash
# Check the RADIUS server configuration on the gateway
az network vnet-gateway show \
  --resource-group $RG \
  --name $GW_NAME \
  --query "vpnClientConfiguration.radiusServerAddress"
```

**CorreÃ§Ã£o:** Verifique a conectividade de rede entre a sub-rede do gateway e o servidor RADIUS:
1. Garanta que nenhum NSG bloqueie UDP 1812/1813 entre GatewaySubnet e o servidor RADIUS
2. Verifique se a chave compartilhada coincide no gateway e no servidor NPS
3. Confirme que o IP pÃºblico do gateway estÃ¡ registrado como cliente RADIUS no servidor NPS

### CenÃ¡rio 4: Valor de audiÃªncia do Entra ID incorreto

**Sintoma:** Os usuÃ¡rios se autenticam no navegador, mas o Azure VPN Client exibe "Access denied - invalid audience."

**Causa raiz:** O valor `--audience` configurado no gateway nÃ£o corresponde ao registro do aplicativo Azure VPN.

**CorreÃ§Ã£o:**

```bash
# Correct the audience value for Azure Public cloud
az network vnet-gateway aad assign \
  --resource-group $RG \
  --gateway-name $GW_NAME \
  --tenant "https://login.microsoftonline.com/<tenant-id>/" \
  --audience "c632b3df-fb67-4d84-bdcf-b95ad541b5c8" \
  --issuer "https://sts.windows.net/<tenant-id>/"
```

---

## Limpeza

```bash
# Delete all resources
az group delete --name $RG --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-p2s-lab" -Force -AsJob
```

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-18-q1",
    question: "Qual método de autenticação requer exclusivamente o tipo de túnel OpenVPN?",
    options: [
      "Autenticação baseada em certificado",
      "Autenticação Microsoft Entra ID",
      "Autenticação RADIUS",
      "Certificado de máquina para Always On VPN"
    ],
    correctIndex: 1,
    explanation: "A autenticação Microsoft Entra ID (Azure AD) funciona apenas com o tipo de túnel OpenVPN. A autenticação por certificado e RADIUS suportam OpenVPN, IKEv2 e SSTP. O túnel de dispositivo Always On requer IKEv2 especificamente."
  },
  {
    id: "az700-18-q2",
    question: "Qual comando da Azure CLI faz upload de um certificado raiz para o VPN Gateway para autenticação P2S?",
    options: [
      "az network vnet-gateway update --root-cert-data",
      "az network vnet-gateway root-cert create --public-cert-data",
      "az network vnet-gateway aad assign --audience",
      "az network vnet-gateway vpn-client generate"
    ],
    correctIndex: 1,
    explanation: "O comando 'az network vnet-gateway root-cert create' faz upload de um certificado raiz para o gateway. Ele requer --gateway-name, --name (nome do certificado), --public-cert-data (certificado Base64) e --resource-group."
  },
  {
    id: "az700-18-q3",
    question: "Uma empresa requer Always On VPN com um túnel de dispositivo que conecta antes do logon do usuário. Qual combinação de tipo de túnel e autenticação é necessária?",
    options: [
      "OpenVPN com autenticação Entra ID",
      "SSTP com nome de usuário/senha",
      "IKEv2 com certificado de máquina",
      "OpenVPN com RADIUS"
    ],
    correctIndex: 2,
    explanation: "O túnel de dispositivo Always On VPN (conecta antes do logon do usuário) requer o protocolo IKEv2 com autenticação por certificado de máquina. Esta é a única combinação suportada para túneis em nível de dispositivo. OpenVPN e SSTP não podem ser usados para túneis de dispositivo."
  },
  {
    id: "az700-18-q4",
    question: "Como você revoga um certificado de cliente específico do acesso VPN P2S?",
    options: [
      "Excluir o certificado raiz do gateway",
      "Adicionar a impressão digital do certificado do cliente à lista de certificados revogados",
      "Desabilitar a conta do usuário no Entra ID",
      "Remover o segredo compartilhado do RADIUS"
    ],
    correctIndex: 1,
    explanation: "Para revogar um certificado de cliente específico, adicione sua impressão digital à lista de certificados revogados do gateway usando 'az network vnet-gateway revoked-cert create --thumbprint'. Excluir o certificado raiz revogaria TODOS os clientes assinados por aquela raiz."
  },
  {
    id: "az700-18-q5",
    question: "Qual é o comando correto da Azure CLI para configurar autenticação Entra ID em um VPN Gateway?",
    options: [
      "az network vnet-gateway update --aad-tenant --aad-audience --aad-issuer",
      "az network vnet-gateway aad assign --tenant --audience --issuer",
      "az network vnet-gateway create --vpn-auth-type AAD",
      "az network vnet-gateway vpn-client generate --authentication-method AAD"
    ],
    correctIndex: 1,
    explanation: "O comando dedicado é 'az network vnet-gateway aad assign' com os parâmetros obrigatórios --tenant, --audience, --issuer, --gateway-name e --resource-group. Embora 'az network vnet-gateway update' também aceite parâmetros --aad-*, o subcomando 'aad assign' é a abordagem preferida."
  },
  {
    id: "az700-18-q6",
    question: "Uma empresa configura autenticação RADIUS para VPN P2S. Qual requisito de rede deve ser atendido?",
    options: [
      "O servidor RADIUS deve ter um endereço IP público",
      "O servidor RADIUS deve ser acessível a partir da VNet do VPN Gateway",
      "O servidor RADIUS deve estar no mesmo grupo de recursos do gateway",
      "O servidor RADIUS deve usar a porta TCP 443"
    ],
    correctIndex: 1,
    explanation: "O servidor RADIUS/NPS deve ser acessível pela rede a partir da VNet do VPN Gateway. Se estiver on-premises, isso requer uma VPN S2S existente ou ExpressRoute. O RADIUS usa UDP 1812/1813, não TCP 443. Ele pode estar em qualquer lugar desde que exista conectividade de rede."
  },
  {
    id: "az700-18-q7",
    question: "Quais métodos de autenticação podem ser combinados em um único VPN Gateway usando multi-autenticação?",
    options: [
      "Certificado e SSTP apenas",
      "Certificado, Entra ID e RADIUS (todos os três simultaneamente)",
      "Entra ID e RADIUS apenas",
      "Certificado e IKEv2 apenas"
    ],
    correctIndex: 1,
    explanation: "O Azure VPN Gateway suporta multi-autenticação onde Certificado, Entra ID (AAD) e RADIUS podem ser configurados simultaneamente. Isso requer o tipo de túnel OpenVPN e é configurado usando --vpn-auth-type AAD Certificate Radius."
  }
]} />

---

## Recursos adicionais

- [About P2S VPN Gateway authentication](https://learn.microsoft.com/azure/vpn-gateway/point-to-site-about#authentication)
- [Configure P2S VPN with certificate authentication](https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-howto-point-to-site-resource-manager-portal)
- [Configure P2S VPN with Microsoft Entra ID authentication](https://learn.microsoft.com/azure/vpn-gateway/point-to-site-entra-gateway)
- [Configure P2S VPN with RADIUS authentication](https://learn.microsoft.com/azure/vpn-gateway/point-to-site-how-to-radius-ps)
- [About Always On VPN](https://learn.microsoft.com/windows-server/remote/remote-access/vpn/always-on-vpn/)
- [Generate and export certificates for P2S](https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-certificates-point-to-site)
