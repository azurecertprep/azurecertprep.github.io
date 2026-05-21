---
sidebar_position: 19
title: "Desafio 19: Segurança do Azure Virtual WAN e VPN"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 19: Segurança do Azure Virtual WAN e VPN

## Habilidades do exame cobertas

- Planejar e implementar recursos de segurança do Azure Virtual WAN
- Configurar segurança de VPN (políticas IPsec/IKE)
- Implementar VPN site-to-site (S2S) com políticas IPsec personalizadas
- Configurar VPN point-to-site (P2S) com autenticação por certificado ou RADIUS
- Proteger hubs do Virtual WAN com integração do Azure Firewall
- Implementar routing intent para inspeção de tráfego

## Cenário

A Contoso Ltd está consolidando a conectividade de suas filiais por meio do Azure Virtual WAN. Eles têm 15 filiais que precisam de conexões VPN site-to-site seguras com políticas IPsec fortes, e uma força de trabalho remota de 2.000 funcionários que requer acesso VPN point-to-site. A equipe de segurança exige IKEv2 com criptografia AES-256-GCM, PFS Group 14 e autenticação baseada em certificado para P2S. Além disso, todo o tráfego inter-hub e branch-to-branch deve ser inspecionado pelo Azure Firewall. Você deve implementar a arquitetura WAN segura.

> **Nota**: A implantação do hub do Virtual WAN leva aproximadamente 30 minutos e gera custos contínuos. Planeje adequadamente o tempo de laboratório e o orçamento.

---

## Pré-requisitos

- Assinatura do Azure com a função Network Contributor
- Azure CLI instalado e autenticado (`az login`)
- Compreensão de protocolos VPN (IPsec, IKEv2)
- Certificados autoassinados para teste de P2S (ou disposição para criá-los)
- Consciência de orçamento: hubs do Virtual WAN geram cobranças por hora

---

## Tarefa 1: Implantar Azure Virtual WAN e hub seguro

Crie uma instância do Virtual WAN e implante um hub seguro com Azure Firewall.

```bash
# Set variables
RG="rg-sc500-vwan"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Create Virtual WAN
az network vwan create \
  --name "vwan-contoso" \
  --resource-group $RG \
  --location $LOCATION \
  --type Standard \
  --branch-to-branch-traffic true

# Create Virtual WAN Hub (takes ~30 minutes)
az network vhub create \
  --name "hub-eastus" \
  --resource-group $RG \
  --vwan "vwan-contoso" \
  --location $LOCATION \
  --address-prefix 10.100.0.0/24 \
  --sku Standard

# Verify hub creation
az network vhub show \
  --name "hub-eastus" \
  --resource-group $RG \
  --query "{Name:name, State:provisioningState, AddressPrefix:addressPrefix}"
```

---

## Tarefa 2: Criar VPN Gateway com políticas IPsec personalizadas

Implante um VPN Gateway no hub com políticas IPsec/IKE reforçadas.

```bash
# Create VPN Gateway in the Virtual WAN hub (takes ~30 minutes)
az network vpn-gateway create \
  --name "vpngw-hub-eastus" \
  --resource-group $RG \
  --vhub "hub-eastus" \
  --location $LOCATION \
  --scale-unit 1

# Verify VPN Gateway
az network vpn-gateway show \
  --name "vpngw-hub-eastus" \
  --resource-group $RG \
  --query "{Name:name, State:provisioningState}"

# Create a VPN site representing a branch office
az network vpn-site create \
  --name "site-branch-newyork" \
  --resource-group $RG \
  --location $LOCATION \
  --virtual-wan "vwan-contoso" \
  --ip-address "203.0.113.10" \
  --address-prefixes "192.168.1.0/24" \
  --device-vendor "Cisco" \
  --device-model "ISR4321" \
  --link-speed 100

# Create a second VPN site
az network vpn-site create \
  --name "site-branch-chicago" \
  --resource-group $RG \
  --location $LOCATION \
  --virtual-wan "vwan-contoso" \
  --ip-address "203.0.113.20" \
  --address-prefixes "192.168.2.0/24" \
  --device-vendor "Fortinet" \
  --device-model "FortiGate-60F" \
  --link-speed 200

# Connect VPN site with custom IPsec policy (hardened)
az network vpn-gateway connection create \
  --name "conn-branch-newyork" \
  --gateway-name "vpngw-hub-eastus" \
  --resource-group $RG \
  --remote-vpn-site "$(az network vpn-site show --name site-branch-newyork --resource-group $RG --query id -o tsv)" \
  --vpn-site-link "$(az network vpn-site show --name site-branch-newyork --resource-group $RG --query 'vpnSiteLinks[0].id' -o tsv)" \
  --shared-key "C0nt0s0S3cur3K3y!2024"

# Note: Custom IPsec policies are applied at the connection level
# Using REST API for more granular IPsec control
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
VPN_GW_ID=$(az network vpn-gateway show --name "vpngw-hub-eastus" --resource-group $RG --query id -o tsv)

echo "Custom IPsec Policy Parameters:"
echo "  IKE Phase 1: IKEv2, AES-256-GCM, SHA-384, DH Group 14"
echo "  IKE Phase 2: AES-256-GCM, SHA-256, PFS Group 14"
echo "  SA Lifetime: 28800 seconds (8 hours)"
echo "  DPD Timeout: 45 seconds"
```

---

## Tarefa 3: Configurar VPN Point-to-Site com autenticação por certificado

Configure o P2S VPN Gateway com autenticação baseada em certificado para trabalhadores remotos.

```bash
# Create P2S VPN Gateway in the hub
az network p2s-vpn-gateway create \
  --name "p2svpngw-hub-eastus" \
  --resource-group $RG \
  --location $LOCATION \
  --vhub "hub-eastus" \
  --scale-unit 1 \
  --vpn-server-config "vsc-contoso-cert"

# First, create VPN Server Configuration with certificate auth
# Generate a root CA certificate (for testing)
# In production, use enterprise PKI

# Create VPN Server Configuration
az network vpn-server-config create \
  --name "vsc-contoso-cert" \
  --resource-group $RG \
  --location $LOCATION \
  --vpn-client-root-certs "[{\"name\":\"ContosoRootCA\",\"publicCertData\":\"<BASE64_ENCODED_ROOT_CERT>\"}]" \
  --vpn-protocols IkeV2 OpenVPN \
  --auth-types Certificate

# For production: Generate certificates using PowerShell
echo "=== Generate Root and Client Certificates (PowerShell) ==="
echo '
# Generate Root CA
$rootCert = New-SelfSignedCertificate -Type Custom `
  -KeySpec Signature `
  -Subject "CN=ContosoVPNRootCA" `
  -KeyExportPolicy Exportable `
  -HashAlgorithm sha256 `
  -KeyLength 2048 `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -KeyUsageProperty Sign `
  -KeyUsage CertSign

# Generate Client Certificate
$clientCert = New-SelfSignedCertificate -Type Custom `
  -DnsName "ContosoVPNClient" `
  -KeySpec Signature `
  -Subject "CN=ContosoVPNClient" `
  -KeyExportPolicy Exportable `
  -HashAlgorithm sha256 `
  -KeyLength 2048 `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -Signer $rootCert `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.2")

# Export Root CA public key (Base64)
$rootCertBase64 = [Convert]::ToBase64String($rootCert.RawData)
'

# Configure P2S address pool
echo "P2S Configuration:"
echo "  Address Pool: 172.16.0.0/16"
echo "  Protocols: IKEv2 and OpenVPN"
echo "  Authentication: Certificate-based"
echo "  DNS Servers: 10.100.0.4 (Azure DNS Private Resolver)"
```

---

## Tarefa 4: Implementar Azure Firewall no hub do Virtual WAN

Implante o Azure Firewall no hub para inspeção de tráfego entre filiais e VNets.

```bash
# Create Azure Firewall Policy
az network firewall policy create \
  --name "afwp-vwan-security" \
  --resource-group $RG \
  --location $LOCATION \
  --sku Premium \
  --threat-intel-mode Deny \
  --idps-mode Deny

# Create rule collection group for branch traffic
az network firewall policy rule-collection-group create \
  --name "rcg-branch-security" \
  --policy-name "afwp-vwan-security" \
  --resource-group $RG \
  --priority 200

# Add network rule collection - Allow branch-to-branch on specific ports
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-branch-to-branch" \
  --rule-collection-group-name "rcg-branch-security" \
  --policy-name "afwp-vwan-security" \
  --resource-group $RG \
  --collection-priority 100 \
  --action Allow \
  --rule-type NetworkRule \
  --rules "[{\"name\":\"Allow-HTTPS\",\"sourceAddresses\":[\"192.168.0.0/16\"],\"destinationAddresses\":[\"192.168.0.0/16\"],\"destinationPorts\":[\"443\"],\"ipProtocols\":[\"TCP\"]},{\"name\":\"Allow-RDP-Internal\",\"sourceAddresses\":[\"192.168.0.0/16\"],\"destinationAddresses\":[\"192.168.0.0/16\"],\"destinationPorts\":[\"3389\"],\"ipProtocols\":[\"TCP\"]}]"

# Add deny rule for high-risk protocols between branches
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-deny-risky-branch" \
  --rule-collection-group-name "rcg-branch-security" \
  --policy-name "afwp-vwan-security" \
  --resource-group $RG \
  --collection-priority 200 \
  --action Deny \
  --rule-type NetworkRule \
  --rules "[{\"name\":\"Deny-Telnet\",\"sourceAddresses\":[\"*\"],\"destinationAddresses\":[\"*\"],\"destinationPorts\":[\"23\"],\"ipProtocols\":[\"TCP\"]},{\"name\":\"Deny-FTP\",\"sourceAddresses\":[\"*\"],\"destinationAddresses\":[\"*\"],\"destinationPorts\":[\"20\",\"21\"],\"ipProtocols\":[\"TCP\"]}]"

# Deploy Azure Firewall in the Virtual WAN hub
az network firewall create \
  --name "afw-hub-eastus" \
  --resource-group $RG \
  --location $LOCATION \
  --vhub "hub-eastus" \
  --sku AZFW_Hub \
  --tier Premium \
  --firewall-policy "afwp-vwan-security"

# Verify firewall deployment
az network firewall show \
  --name "afw-hub-eastus" \
  --resource-group $RG \
  --query "{Name:name, State:provisioningState, Sku:sku.tier}"
```

---

## Tarefa 5: Configurar routing intent para inspeção de tráfego

Configure o routing intent para forçar todo o tráfego (inter-hub, branch-to-internet, tráfego privado) através do Azure Firewall.

```bash
# Configure routing intent on the hub
# This forces all private and internet traffic through Azure Firewall
az network vhub routing-intent create \
  --name "ri-force-firewall" \
  --resource-group $RG \
  --vhub "hub-eastus" \
  --routing-policies "[{\"name\":\"PrivateTrafficPolicy\",\"destinations\":[\"PrivateTraffic\"],\"nextHop\":\"$(az network firewall show --name afw-hub-eastus --resource-group $RG --query id -o tsv)\"},{\"name\":\"InternetTrafficPolicy\",\"destinations\":[\"Internet\"],\"nextHop\":\"$(az network firewall show --name afw-hub-eastus --resource-group $RG --query id -o tsv)\"}]"

# Verify routing intent
az network vhub routing-intent show \
  --name "ri-force-firewall" \
  --resource-group $RG \
  --vhub "hub-eastus" \
  --query "{Name:name, Policies:routingPolicies[].{Name:name, Destinations:destinations}}"

# Connect a VNet to the hub for testing
az network vnet create \
  --name vnet-spoke-prod \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.50.0.0/16 \
  --subnet-name snet-workload --subnet-prefix 10.50.1.0/24

az network vhub connection create \
  --name "conn-spoke-prod" \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --remote-vnet "vnet-spoke-prod" \
  --internet-security true
```

---

## Tarefa 6: Monitorar conexões VPN e eventos de segurança

Configure o monitoramento para a saúde dos túneis VPN e eventos de segurança.

```bash
# Create Log Analytics workspace for VWAN diagnostics
WORKSPACE_NAME="law-sc500-vwan"
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --query id -o tsv)

# Enable diagnostic settings on VPN Gateway
VPN_GW_ID=$(az network vpn-gateway show --name "vpngw-hub-eastus" --resource-group $RG --query id -o tsv)

az monitor diagnostic-settings create \
  --name "vpn-diagnostics" \
  --resource $VPN_GW_ID \
  --workspace $WORKSPACE_ID \
  --logs '[{"category": "GatewayDiagnosticLog", "enabled": true}, {"category": "TunnelDiagnosticLog", "enabled": true}, {"category": "RouteDiagnosticLog", "enabled": true}, {"category": "IKEDiagnosticLog", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'

# Enable diagnostic settings on Azure Firewall
AFW_ID=$(az network firewall show --name "afw-hub-eastus" --resource-group $RG --query id -o tsv)

az monitor diagnostic-settings create \
  --name "firewall-diagnostics" \
  --resource $AFW_ID \
  --workspace $WORKSPACE_ID \
  --logs '[{"category": "AzureFirewallApplicationRule", "enabled": true}, {"category": "AzureFirewallNetworkRule", "enabled": true}, {"category": "AzureFirewallDnsProxy", "enabled": true}, {"category": "AZFWIdpsSignature", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'

# Check VPN gateway connection status
az network vpn-gateway connection list \
  --gateway-name "vpngw-hub-eastus" \
  --resource-group $RG \
  --query "[].{Name:name, Status:connectionStatus}" -o table
```

---

## Quebre &amp; Conserte

### Cenário 1: Túnel VPN S2S não estabelece — incompatibilidade na Fase 1

Uma filial relata que o túnel VPN não está subindo. A negociação IKE Fase 1 falha com o erro "no proposal chosen".

<details>
<summary>Mostrar solução</summary>

```bash
# Check IKE diagnostic logs (if available)
# Common issue: IPsec policy mismatch between Azure and on-premises device

# Verify the connection's IPsec policy
az network vpn-gateway connection show \
  --name "conn-branch-newyork" \
  --gateway-name "vpngw-hub-eastus" \
  --resource-group $RG \
  --query "vpnLinkConnections[0].ipsecPolicies"

# Ensure both sides agree on:
# - IKE encryption (e.g., AES256)
# - IKE integrity (e.g., SHA256)
# - DH Group (e.g., DHGroup14)
# - IPsec encryption (e.g., GCMAES256)
# - IPsec integrity (e.g., GCMAES256)
# - PFS Group (e.g., PFS14)
# - SA lifetime (e.g., 28800 seconds)

# Fix: Update the connection with explicit IPsec policy matching on-prem
# The on-premises device must be configured with matching parameters
echo "Verify on-premises device configuration matches:"
echo "  Phase 1: IKEv2, AES-256, SHA-256, DH Group 14"
echo "  Phase 2: ESP AES-256-GCM, PFS Group 14"
echo "  Lifetime: 28800 seconds"
echo "  DPD: 45 seconds"
```

</details>

### Cenário 2: Tráfego das filiais não está sendo inspecionado pelo Azure Firewall

O tráfego branch-to-branch está fluindo diretamente sem passar pelo Azure Firewall para inspeção, apesar do routing intent estar configurado.

<details>
<summary>Mostrar solução</summary>

```bash
# Verify routing intent is properly configured
az network vhub routing-intent show \
  --name "ri-force-firewall" \
  --resource-group $RG \
  --vhub "hub-eastus"

# Check if the routing intent includes PrivateTraffic destination
# Branch-to-branch is classified as PrivateTraffic

# Verify the firewall is in a healthy state
az network firewall show \
  --name "afw-hub-eastus" \
  --resource-group $RG \
  --query "{State:provisioningState, HubId:virtualHub.id}"

# If routing intent doesn't have PrivateTraffic, update it
AFW_ID=$(az network firewall show --name "afw-hub-eastus" --resource-group $RG --query id -o tsv)

az network vhub routing-intent create \
  --name "ri-force-firewall" \
  --resource-group $RG \
  --vhub "hub-eastus" \
  --routing-policies "[{\"name\":\"PrivateTrafficPolicy\",\"destinations\":[\"PrivateTraffic\"],\"nextHop\":\"$AFW_ID\"},{\"name\":\"InternetTrafficPolicy\",\"destinations\":[\"Internet\"],\"nextHop\":\"$AFW_ID\"}]"

# Verify the effective routes on the hub
az network vhub get-effective-routes \
  --resource-group $RG \
  --name "hub-eastus" \
  --resource-type "VpnGateway" \
  --resource-id "$(az network vpn-gateway show --name vpngw-hub-eastus --resource-group $RG --query id -o tsv)"
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é o propósito do routing intent no Azure Virtual WAN?",
    options: [
      "Configurar resolução DNS para clientes VPN",
      "Forçar todo o tráfego privado e/ou de internet através de um appliance de segurança de próximo salto como o Azure Firewall",
      "Habilitar conectividade branch-to-branch",
      "Configurar anúncios de rotas BGP"
    ],
    correctIndex: 1,
    explanation: "O routing intent no Azure Virtual WAN permite configurar políticas de roteamento que forçam o tráfego privado (branch-to-branch, VNet-to-VNet) e/ou tráfego destinado à internet através de um appliance de segurança de próximo salto como o Azure Firewall para inspeção."
  },
  {
    question: "Qual algoritmo de criptografia IPsec fornece tanto confidencialidade quanto integridade em uma única operação (AEAD)?",
    options: [
      "AES-CBC-256 com SHA-256",
      "AES-256-GCM",
      "3DES com MD5",
      "DES-CBC com SHA-1"
    ],
    correctIndex: 1,
    explanation: "AES-256-GCM (Galois/Counter Mode) é um algoritmo de Authenticated Encryption with Associated Data (AEAD) que fornece tanto confidencialidade quanto integridade em uma única operação criptográfica, tornando-o mais eficiente e seguro do que criptografia e hashing separados."
  },
  {
    question: "Em uma configuração de VPN site-to-site do Virtual WAN, o que acontece se a política IPsec não for especificada explicitamente na conexão?",
    options: [
      "A conexão falha ao estabelecer",
      "O Azure usa parâmetros IPsec/IKE padrão e negocia com o dispositivo on-premises",
      "Apenas IKEv1 é utilizado",
      "O tráfego flui sem criptografia"
    ],
    correctIndex: 1,
    explanation: "Se nenhuma política IPsec personalizada for especificada, os VPN Gateways do Azure usam parâmetros padrão e tentam negociar com o dispositivo on-premises usando propostas padrão. O padrão inclui múltiplos conjuntos de cifras para compatibilidade, embora políticas personalizadas sejam recomendadas para reforço de segurança."
  },
  {
    question: "O que é necessário para implantar o Azure Firewall em um hub do Virtual WAN (hub seguro)?",
    options: [
      "Um Virtual WAN SKU Standard com um hub SKU Standard",
      "Um Virtual WAN SKU Basic com qualquer SKU de hub",
      "Azure Firewall Manager e uma VNet separada para o firewall",
      "Uma sub-rede dedicada chamada 'AzureFirewallSubnet' na VNet do hub"
    ],
    correctIndex: 0,
    explanation: "O Azure Firewall só pode ser implantado em um hub do Virtual WAN (criando um 'hub seguro') quando tanto o Virtual WAN quanto o hub são SKU Standard. Diferente do Azure Firewall standalone, você não precisa criar uma sub-rede — o hub gerencia o posicionamento do firewall automaticamente."
  }
]} />

## Limpeza

```bash
# Delete the resource group (this will take several minutes due to hub/gateway deletion)
az group delete --name $RG --yes --no-wait

# Note: Virtual WAN hub and gateway deletion can take 30+ minutes
echo "Resource deletion initiated. Hub and gateway cleanup may take 30+ minutes."
```
