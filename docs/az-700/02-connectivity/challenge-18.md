---
sidebar_position: 5
title: "Challenge 18: P2S Authentication (Certificate, RADIUS, Entra ID)"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 18: P2S authentication (certificate, RADIUS, Entra ID)

:::info Estimated time and cost

**60-90 minutes** | **~$0.19/h** (VPN Gateway) | **Exam weight: 20-25%**

:::

## Scenario

Contoso has three distinct user groups that require point-to-site VPN access with different authentication mechanisms. IT administrators use certificate-based authentication for strong device-level trust, general employees authenticate via Microsoft Entra ID for single sign-on and conditional access integration, and external contractors use RADIUS authentication against an existing Network Policy Server (NPS) infrastructure. Additionally, executives require Always On VPN to maintain persistent connectivity without user interaction.

## Exam skills covered

| Skill | Description |
|-------|-------------|
| Select an appropriate authentication method | Choose between certificate, Entra ID, and RADIUS based on requirements |
| Configure RADIUS authentication | Integrate a RADIUS/NPS server with the VPN gateway |
| Configure authentication by using Microsoft Entra ID | Set up Entra ID (Azure AD) auth for P2S VPN |
| Specify Azure requirements for Always On VPN | Understand IKEv2 + machine certificate requirements |

## Architecture overview

```
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

## Prerequisites

- A deployed VPN gateway with P2S enabled (from Challenge 17)
- For Entra ID tasks: Global Administrator or Application Administrator role in Microsoft Entra ID
- For RADIUS tasks: conceptual understanding only (NPS server not deployed in lab)

---

## Task 1: Configure certificate-based authentication

Certificate authentication is the default P2S authentication method. You generate a self-signed root certificate, upload the public key to the gateway, and issue client certificates signed by that root.

### Step 1a: Generate root and client certificates

#### PowerShell (Windows - using built-in PKI)

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

### Step 1b: Upload root certificate to the VPN gateway

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

### Step 1c: Configure the gateway for certificate authentication

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

:::tip Exam tip
With certificate authentication, the root certificate public key is uploaded to the gateway. Each connecting client must have a client certificate installed that was issued by the uploaded root CA. The gateway validates the certificate chain during connection.
:::

---

## Task 2: Revoke a client certificate

When a device is lost or an employee leaves, you must revoke their client certificate to prevent further VPN access.

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

### Verify revoked certificates

```bash
az network vnet-gateway show \
  --resource-group $RG \
  --name $GW_NAME \
  --query "vpnClientConfiguration.vpnClientRevokedCertificates" \
  --output table
```

---

## Task 3: Configure Microsoft Entra ID authentication

Entra ID authentication provides single sign-on, conditional access policies, and multi-factor authentication (MFA) for P2S VPN connections. This method requires the OpenVPN tunnel type.

### Prerequisites for Entra ID authentication

1. Microsoft Entra tenant with Global Administrator access
2. The VPN gateway must be configured with OpenVPN protocol
3. The Azure VPN Client application must be registered in your tenant
4. Users must use the Azure VPN Client (not the native OS VPN client)

### Step 3a: Ensure OpenVPN is configured on the gateway

```bash
# OpenVPN is required for Entra ID authentication
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --address-prefixes "172.16.201.0/24" \
  --client-protocol OpenVPN
```

### Step 3b: Assign Entra ID (AAD) authentication to the gateway

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

### Step 3c: Verify Entra ID configuration

```bash
# Show the AAD configuration on the gateway
az network vnet-gateway aad show \
  --resource-group $RG \
  --gateway-name $GW_NAME
```

### Step 3d: Remove Entra ID authentication (if needed)

```bash
az network vnet-gateway aad remove \
  --resource-group $RG \
  --gateway-name $GW_NAME
```

### Audience IDs by Azure cloud

| Cloud | Azure VPN Client App ID |
|-------|------------------------|
| Azure Public | `c632b3df-fb67-4d84-bdcf-b95ad541b5c8` |
| Azure Government | `51bb15d4-3a4f-4ebf-9dca-40096fe32426` |
| Azure China 21Vianet | `49f817b6-84ae-4cc0-928c-73f27289b3aa` |

:::warning Critical constraint
Entra ID authentication works ONLY with the OpenVPN tunnel type. If your gateway is configured with IKEv2 or SSTP only, Entra ID authentication cannot be used. You must add or switch to OpenVPN before enabling Entra ID authentication.
:::

---

## Task 4: Configure RADIUS authentication

RADIUS authentication allows you to leverage existing Network Policy Server (NPS) infrastructure for VPN authentication. This is common when organizations already have NPS policies for network access control.

### Step 4a: Configure the gateway for RADIUS

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

### Step 4b: Generate client config for RADIUS with EAP-MSCHAPv2

```bash
# Generate VPN client config for RADIUS with username/password auth
az network vnet-gateway vpn-client generate \
  --resource-group $RG \
  --name $GW_NAME \
  --authentication-method EAPMSCHAPv2
```

### Step 4c: Generate client config for RADIUS with certificate (EAP-TLS)

```bash
# Generate VPN client config for RADIUS with certificate auth
az network vnet-gateway vpn-client generate \
  --resource-group $RG \
  --name $GW_NAME \
  --authentication-method EAPTLS
```

### RADIUS architecture requirements

| Component | Requirement |
|-----------|------------|
| NPS Server | Must be network-reachable from the VPN gateway VNet |
| Shared secret | Must match between gateway and NPS server exactly |
| NPS policies | Must include a network policy allowing VPN connections |
| NPS as RADIUS client | The VPN gateway public IP must be registered as a RADIUS client on NPS |
| Port | NPS listens on UDP 1812 (authentication) and 1813 (accounting) |
| High availability | Configure two RADIUS servers for redundancy |

:::note RADIUS connectivity
The RADIUS server must be reachable from the gateway subnet. If the NPS server is on-premises, you need a site-to-site VPN or ExpressRoute connection between the Azure VNet and the on-premises network before RADIUS authentication can work for P2S clients.
:::

---

## Task 5: Configure multi-authentication

Azure VPN Gateway supports configuring multiple authentication methods simultaneously, allowing different user groups to authenticate differently.

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

:::tip Exam tip
Multi-authentication (combining AAD + Certificate + Radius) requires the OpenVPN tunnel type. The `--vpn-auth-type` parameter accepts space-separated values: `AAD`, `Certificate`, and `Radius`.
:::

---

## Task 6: Configure Always On VPN requirements

Always On VPN ensures that an authorized Windows 10/11 device maintains a persistent VPN connection without requiring user interaction.

### Always On VPN requirements

| Requirement | Detail |
|-------------|--------|
| Tunnel type | IKEv2 (required for device tunnel) |
| Authentication | Machine certificate (device tunnel) + User certificate or Entra ID (user tunnel) |
| Client OS | Windows 10/11 Enterprise or Education |
| Configuration | Deployed via Intune, SCCM, or PowerShell VPNv2 CSP |
| Two tunnels | Device tunnel (before logon) + User tunnel (after logon) |

### Always On VPN tunnel types

```
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

### Gateway configuration for Always On VPN

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

:::warning Always On VPN constraints
- The device tunnel requires IKEv2 and machine certificate authentication exclusively
- The device tunnel cannot use Entra ID or RADIUS authentication
- SSTP cannot be used for Always On VPN device tunnels
- The device must be domain-joined and running Windows 10/11 Enterprise or Education
:::

---

## Task 7: Authentication method comparison

### Decision matrix

| Criteria | Certificate | Entra ID | RADIUS |
|----------|:-----------:|:--------:|:------:|
| Supported tunnel types | OpenVPN, IKEv2, SSTP | OpenVPN only | OpenVPN, IKEv2, SSTP |
| MFA support | No (device trust only) | Yes (Conditional Access) | Yes (NPS policy) |
| Conditional Access | No | Yes | Partial (via NPS) |
| SSO experience | No | Yes | No |
| Requires additional infra | No | Entra ID P1/P2 for CA | NPS server |
| Certificate management | Manual or PKI | None | Depends on EAP method |
| Revocation method | Upload thumbprint | Disable user account | NPS policy |
| Always On device tunnel | Yes | No | No |
| Client app required | Native or OpenVPN | Azure VPN Client | Native or OpenVPN |

### When to use each method

- **Certificate**: Best for device-level trust, Always On VPN device tunnels, and environments without Entra ID P1/P2
- **Entra ID**: Best for user-centric authentication with SSO, MFA, and conditional access; requires Azure VPN Client
- **RADIUS**: Best for organizations with existing NPS infrastructure, complex network access policies, or third-party identity providers

---

## Break and fix scenarios

### Scenario 1: Entra ID configured with IKEv2 (incompatible)

**Symptom:** After configuring Entra ID authentication, users receive "Authentication method not supported" errors.

**Root cause:** The gateway is configured with IKEv2 protocol only. Entra ID authentication requires OpenVPN.

**Diagnosis:**

```bash
az network vnet-gateway show \
  --resource-group $RG \
  --name $GW_NAME \
  --query "vpnClientConfiguration.vpnClientProtocols"
```

**Fix:** Switch to or add OpenVPN protocol:

```bash
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --client-protocol OpenVPN
```

### Scenario 2: Expired client certificate

**Symptom:** Users who previously connected successfully now receive "Certificate has expired" errors.

**Root cause:** The client certificate has passed its expiry date.

**Fix:** Generate and install a new client certificate from the same root CA:

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

### Scenario 3: RADIUS server unreachable

**Symptom:** All P2S VPN connections fail with timeout errors. Certificate-based connections work fine.

**Root cause:** The NPS/RADIUS server at 10.60.1.10 is unreachable from the VPN gateway subnet. Common causes include NSG rules blocking UDP 1812/1813 or the RADIUS server being offline.

**Diagnosis:**

```bash
# Check the RADIUS server configuration on the gateway
az network vnet-gateway show \
  --resource-group $RG \
  --name $GW_NAME \
  --query "vpnClientConfiguration.radiusServerAddress"
```

**Fix:** Verify network connectivity between the gateway subnet and RADIUS server:
1. Ensure no NSG blocks UDP 1812/1813 between GatewaySubnet and RADIUS server
2. Verify the shared secret matches on both the gateway and NPS server
3. Confirm the gateway public IP is registered as a RADIUS client on the NPS server

### Scenario 4: Wrong Entra ID audience value

**Symptom:** Users authenticate in the browser but the Azure VPN Client shows "Access denied - invalid audience."

**Root cause:** The `--audience` value configured on the gateway does not match the Azure VPN application registration.

**Fix:**

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

## Cleanup

```bash
# Delete all resources
az group delete --name $RG --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-p2s-lab" -Force -AsJob
```

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-18-q1",
    question: "Which authentication method requires the OpenVPN tunnel type exclusively?",
    options: [
      "Certificate-based authentication",
      "Microsoft Entra ID authentication",
      "RADIUS authentication",
      "Machine certificate for Always On VPN"
    ],
    correctIndex: 1,
    explanation: "Microsoft Entra ID (Azure AD) authentication works only with the OpenVPN tunnel type. Certificate and RADIUS authentication support OpenVPN, IKEv2, and SSTP. Always On device tunnel requires IKEv2 specifically."
  },
  {
    id: "az700-18-q2",
    question: "Which Azure CLI command uploads a root certificate to the VPN gateway for P2S authentication?",
    options: [
      "az network vnet-gateway update --root-cert-data",
      "az network vnet-gateway root-cert create --public-cert-data",
      "az network vnet-gateway aad assign --audience",
      "az network vnet-gateway vpn-client generate"
    ],
    correctIndex: 1,
    explanation: "The 'az network vnet-gateway root-cert create' command uploads a root certificate to the gateway. It requires --gateway-name, --name (cert name), --public-cert-data (Base64 cert), and --resource-group."
  },
  {
    id: "az700-18-q3",
    question: "A company requires Always On VPN with a device tunnel that connects before user logon. Which combination of tunnel type and authentication is required?",
    options: [
      "OpenVPN with Entra ID authentication",
      "SSTP with username/password",
      "IKEv2 with machine certificate",
      "OpenVPN with RADIUS"
    ],
    correctIndex: 2,
    explanation: "The Always On VPN device tunnel (connects before user logon) requires IKEv2 protocol with machine certificate authentication. This is the only supported combination for device-level tunnels. OpenVPN and SSTP cannot be used for device tunnels."
  },
  {
    id: "az700-18-q4",
    question: "How do you revoke a specific client certificate from P2S VPN access?",
    options: [
      "Delete the root certificate from the gateway",
      "Add the client certificate thumbprint to the revoked certificates list",
      "Disable the user account in Entra ID",
      "Remove the RADIUS shared secret"
    ],
    correctIndex: 1,
    explanation: "To revoke a specific client certificate, add its thumbprint to the gateway's revoked certificates list using 'az network vnet-gateway revoked-cert create --thumbprint'. Deleting the root cert would revoke ALL clients signed by that root."
  },
  {
    id: "az700-18-q5",
    question: "What is the correct Azure CLI command to configure Entra ID authentication on a VPN gateway?",
    options: [
      "az network vnet-gateway update --aad-tenant --aad-audience --aad-issuer",
      "az network vnet-gateway aad assign --tenant --audience --issuer",
      "az network vnet-gateway create --vpn-auth-type AAD",
      "az network vnet-gateway vpn-client generate --authentication-method AAD"
    ],
    correctIndex: 1,
    explanation: "The dedicated command is 'az network vnet-gateway aad assign' with required parameters --tenant, --audience, --issuer, --gateway-name, and --resource-group. While 'az network vnet-gateway update' also accepts --aad-* parameters, the 'aad assign' subcommand is the preferred approach."
  },
  {
    id: "az700-18-q6",
    question: "A company configures RADIUS authentication for P2S VPN. Which network requirement must be met?",
    options: [
      "The RADIUS server must have a public IP address",
      "The RADIUS server must be reachable from the VPN gateway VNet",
      "The RADIUS server must run in the same resource group as the gateway",
      "The RADIUS server must use TCP port 443"
    ],
    correctIndex: 1,
    explanation: "The RADIUS/NPS server must be network-reachable from the VPN gateway VNet. If on-premises, this requires an existing S2S VPN or ExpressRoute. RADIUS uses UDP 1812/1813, not TCP 443. It can run anywhere as long as network connectivity exists."
  },
  {
    id: "az700-18-q7",
    question: "Which authentication methods can be combined on a single VPN gateway using multi-authentication?",
    options: [
      "Certificate and SSTP only",
      "Certificate, Entra ID, and RADIUS (all three simultaneously)",
      "Entra ID and RADIUS only",
      "Certificate and IKEv2 only"
    ],
    correctIndex: 1,
    explanation: "Azure VPN Gateway supports multi-authentication where Certificate, Entra ID (AAD), and RADIUS can all be configured simultaneously. This requires the OpenVPN tunnel type and is set using --vpn-auth-type AAD Certificate Radius."
  }
]} />

---

## Additional resources

- [About P2S VPN Gateway authentication](https://learn.microsoft.com/azure/vpn-gateway/point-to-site-about#authentication)
- [Configure P2S VPN with certificate authentication](https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-howto-point-to-site-resource-manager-portal)
- [Configure P2S VPN with Microsoft Entra ID authentication](https://learn.microsoft.com/azure/vpn-gateway/point-to-site-entra-gateway)
- [Configure P2S VPN with RADIUS authentication](https://learn.microsoft.com/azure/vpn-gateway/point-to-site-how-to-radius-ps)
- [About Always On VPN](https://learn.microsoft.com/windows-server/remote/remote-access/vpn/always-on-vpn/)
- [Generate and export certificates for P2S](https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-certificates-point-to-site)
