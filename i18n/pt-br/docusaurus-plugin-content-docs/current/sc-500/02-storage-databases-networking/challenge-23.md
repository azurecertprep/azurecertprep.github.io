---
sidebar_position: 23
title: "Desafio 23: Azure Firewall"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 23: Azure Firewall

## Habilidades do exame cobertas

- Planejar e implementar Azure Firewall para segurança de rede
- Configurar regras do Azure Firewall (regras de rede, regras de aplicação, regras DNAT)
- Implementar políticas do Azure Firewall com grupos de coleção de regras
- Configurar filtragem baseada em threat intelligence
- Implementar recursos do Azure Firewall Premium (TLS inspection, IDPS, filtragem de URL)
- Integrar Azure Firewall com tabelas de rotas para tunelamento forçado

## Cenário

A Contoso Ltd está implantando uma arquitetura de rede hub-and-spoke onde todo o tráfego de saída para a internet e o tráfego entre spokes deve ser inspecionado pelo Azure Firewall. A equipe de segurança requer filtragem de threat intelligence para bloquear IPs maliciosos conhecidos, TLS inspection para visibilidade do tráfego criptografado, IDPS (Intrusion Detection and Prevention) para detecção de ameaças e filtragem granular de URL para categorias web. O firewall também deve fornecer regras DNAT para acesso de entrada a servidores web específicos. Você deve implantar e configurar o Azure Firewall Premium com políticas de segurança abrangentes.

---

## Pré-requisitos

- Assinatura Azure com função Network Contributor
- Azure CLI instalado e autenticado (`az login`)
- Entendimento da arquitetura de rede hub-and-spoke
- Azure Key Vault para certificados de TLS inspection (Premium)
- Consciência de custos: Azure Firewall Premium incorre em cobranças horárias significativas

---

## Tarefa 1: Implantar rede hub-and-spoke com Azure Firewall

Crie a VNet hub com Azure Firewall e VNets spoke para cargas de trabalho.

```bash
# Set variables
RG="rg-sc500-azure-firewall"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Create hub virtual network
az network vnet create \
  --name vnet-hub \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16

# Create AzureFirewallSubnet (required name, minimum /26)
az network vnet subnet create \
  --name AzureFirewallSubnet \
  --vnet-name vnet-hub \
  --resource-group $RG \
  --address-prefix 10.0.1.0/26

# Create AzureFirewallManagementSubnet (required for forced tunneling)
az network vnet subnet create \
  --name AzureFirewallManagementSubnet \
  --vnet-name vnet-hub \
  --resource-group $RG \
  --address-prefix 10.0.2.0/26

# Create public IP for Azure Firewall
az network public-ip create \
  --name pip-afw-contoso \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard \
  --allocation-method Static

# Create spoke VNets
az network vnet create \
  --name vnet-spoke-web \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.1.0.0/16 \
  --subnet-name snet-web --subnet-prefix 10.1.1.0/24

az network vnet create \
  --name vnet-spoke-app \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.2.0.0/16 \
  --subnet-name snet-app --subnet-prefix 10.2.1.0/24

# Peer hub to spokes
az network vnet peering create \
  --name hub-to-spoke-web \
  --resource-group $RG \
  --vnet-name vnet-hub \
  --remote-vnet vnet-spoke-web \
  --allow-forwarded-traffic true \
  --allow-vnet-access true

az network vnet peering create \
  --name spoke-web-to-hub \
  --resource-group $RG \
  --vnet-name vnet-spoke-web \
  --remote-vnet vnet-hub \
  --allow-forwarded-traffic true \
  --allow-vnet-access true

az network vnet peering create \
  --name hub-to-spoke-app \
  --resource-group $RG \
  --vnet-name vnet-hub \
  --remote-vnet vnet-spoke-app \
  --allow-forwarded-traffic true \
  --allow-vnet-access true

az network vnet peering create \
  --name spoke-app-to-hub \
  --resource-group $RG \
  --vnet-name vnet-spoke-app \
  --remote-vnet vnet-hub \
  --allow-forwarded-traffic true \
  --allow-vnet-access true
```

---

## Tarefa 2: Criar política do Azure Firewall com grupos de coleção de regras

Crie uma política de firewall hierárquica com coleções de regras organizadas.

```bash
# Create Azure Firewall Policy (Premium tier for advanced features)
az network firewall policy create \
  --name "afwp-contoso-security" \
  --resource-group $RG \
  --location $LOCATION \
  --sku Premium \
  --threat-intel-mode Deny \
  --idps-mode Deny

# Create rule collection groups (ordered by priority)
# RCG 1: Platform rules (highest priority)
az network firewall policy rule-collection-group create \
  --name "rcg-platform" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --priority 100

# RCG 2: Application team rules
az network firewall policy rule-collection-group create \
  --name "rcg-application" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --priority 200

# RCG 3: DNAT rules for inbound traffic
az network firewall policy rule-collection-group create \
  --name "rcg-dnat" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --priority 300

# Add network rules - Allow DNS
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-network-infra" \
  --rule-collection-group-name "rcg-platform" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --collection-priority 100 \
  --action Allow \
  --rule-type NetworkRule \
  --rules "[{\"name\":\"Allow-DNS\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"destinationAddresses\":[\"*\"],\"destinationPorts\":[\"53\"],\"ipProtocols\":[\"UDP\",\"TCP\"]},{\"name\":\"Allow-NTP\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"destinationAddresses\":[\"*\"],\"destinationPorts\":[\"123\"],\"ipProtocols\":[\"UDP\"]}]"

# Add network rules - Allow inter-spoke on specific ports
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-network-inter-spoke" \
  --rule-collection-group-name "rcg-platform" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --collection-priority 200 \
  --action Allow \
  --rule-type NetworkRule \
  --rules "[{\"name\":\"Allow-Web-To-App\",\"sourceAddresses\":[\"10.1.0.0/16\"],\"destinationAddresses\":[\"10.2.0.0/16\"],\"destinationPorts\":[\"8080\",\"8443\"],\"ipProtocols\":[\"TCP\"]},{\"name\":\"Allow-App-To-SQL\",\"sourceAddresses\":[\"10.2.0.0/16\"],\"destinationAddresses\":[\"10.3.0.0/16\"],\"destinationPorts\":[\"1433\"],\"ipProtocols\":[\"TCP\"]}]"
```

---

## Tarefa 3: Configurar regras de aplicação com filtragem de URL

Adicione regras de aplicação para controlar o tráfego HTTPS de saída com filtragem de FQDN e URL.

```bash
# Add application rules - Allow Windows Update and Azure services
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-app-allowed-sites" \
  --rule-collection-group-name "rcg-application" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --collection-priority 100 \
  --action Allow \
  --rule-type ApplicationRule \
  --rules "[{\"name\":\"Allow-WindowsUpdate\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"protocols\":[{\"protocolType\":\"Https\",\"port\":443}],\"targetFqdns\":[\"*.windowsupdate.com\",\"*.microsoft.com\",\"*.msftconnecttest.com\"]},{\"name\":\"Allow-AzureManagement\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"protocols\":[{\"protocolType\":\"Https\",\"port\":443}],\"targetFqdns\":[\"management.azure.com\",\"login.microsoftonline.com\",\"*.vault.azure.net\"]}]"

# Add application rules - Allow specific web categories
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-app-web-categories" \
  --rule-collection-group-name "rcg-application" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --collection-priority 200 \
  --action Allow \
  --rule-type ApplicationRule \
  --rules "[{\"name\":\"Allow-Business-Sites\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"protocols\":[{\"protocolType\":\"Https\",\"port\":443},{\"protocolType\":\"Http\",\"port\":80}],\"webCategories\":[\"SearchEnginesAndPortals\",\"ComputersAndTechnology\",\"Business\"]}]"

# Add deny rule for specific categories (explicit deny before implicit deny)
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "rc-app-deny-categories" \
  --rule-collection-group-name "rcg-application" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --collection-priority 300 \
  --action Deny \
  --rule-type ApplicationRule \
  --rules "[{\"name\":\"Deny-SocialMedia\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"protocols\":[{\"protocolType\":\"Https\",\"port\":443},{\"protocolType\":\"Http\",\"port\":80}],\"webCategories\":[\"SocialNetworking\",\"StreamingMediaAndDownloads\",\"Gambling\"]},{\"name\":\"Deny-Anonymizers\",\"sourceAddresses\":[\"10.0.0.0/8\"],\"protocols\":[{\"protocolType\":\"Https\",\"port\":443}],\"webCategories\":[\"PrivateIPAddresses\",\"Anonymizers\"]}]"
```

---

## Tarefa 4: Configurar regras DNAT para acesso de entrada

Crie regras DNAT para permitir tráfego de entrada para servidores backend específicos.

```bash
# Get the firewall public IP address
AFW_PUBLIC_IP=$(az network public-ip show \
  --name pip-afw-contoso \
  --resource-group $RG \
  --query ipAddress -o tsv)

echo "Firewall Public IP: $AFW_PUBLIC_IP"

# Add DNAT rule - Forward HTTPS to web server
az network firewall policy rule-collection-group collection add-nat-collection \
  --name "rc-dnat-inbound" \
  --rule-collection-group-name "rcg-dnat" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG \
  --collection-priority 100 \
  --action DNAT \
  --rules "[{\"name\":\"DNAT-HTTPS-WebServer\",\"sourceAddresses\":[\"*\"],\"destinationAddresses\":[\"$AFW_PUBLIC_IP\"],\"destinationPorts\":[\"443\"],\"translatedAddress\":\"10.1.1.10\",\"translatedPort\":\"443\",\"ipProtocols\":[\"TCP\"]},{\"name\":\"DNAT-HTTP-WebServer\",\"sourceAddresses\":[\"203.0.113.0/24\"],\"destinationAddresses\":[\"$AFW_PUBLIC_IP\"],\"destinationPorts\":[\"80\"],\"translatedAddress\":\"10.1.1.10\",\"translatedPort\":\"80\",\"ipProtocols\":[\"TCP\"]}]"
```

---

## Tarefa 5: Implantar Azure Firewall e configurar TLS inspection (Premium)

Implante o firewall e configure TLS inspection para visibilidade do tráfego criptografado.

```bash
# Create Key Vault for TLS inspection CA certificate
KV_NAME="kv-afw-tls-$(openssl rand -hex 4)"
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG \
  --location $LOCATION

# Create a managed identity for Azure Firewall to access Key Vault
az identity create \
  --name "id-afw-contoso" \
  --resource-group $RG \
  --location $LOCATION

IDENTITY_ID=$(az identity show \
  --name "id-afw-contoso" \
  --resource-group $RG \
  --query id -o tsv)

IDENTITY_PRINCIPAL=$(az identity show \
  --name "id-afw-contoso" \
  --resource-group $RG \
  --query principalId -o tsv)

# Grant Key Vault access to the managed identity
az keyvault set-policy \
  --name $KV_NAME \
  --object-id $IDENTITY_PRINCIPAL \
  --secret-permissions get list \
  --certificate-permissions get list

# Note: In production, import an Intermediate CA certificate for TLS inspection
# az keyvault certificate import --vault-name $KV_NAME --name "tls-inspection-ca" --file ca-cert.pfx

# Configure TLS inspection on the firewall policy
# (requires the CA certificate in Key Vault)
echo "TLS Inspection Configuration:"
echo "  - Import Intermediate CA certificate to Key Vault"
echo "  - Configure the firewall policy to use the certificate"
echo "  - Enable TLS inspection on specific application rules"
echo ""
echo "Note: TLS inspection decrypts and re-encrypts HTTPS traffic."
echo "Clients must trust the Intermediate CA certificate."

# Deploy Azure Firewall with the policy
az network firewall create \
  --name "afw-contoso" \
  --resource-group $RG \
  --location $LOCATION \
  --sku AZFW_VNet \
  --tier Premium \
  --vnet-name vnet-hub \
  --firewall-policy "afwp-contoso-security" \
  --public-ip pip-afw-contoso

# Get Firewall private IP for route tables
AFW_PRIVATE_IP=$(az network firewall show \
  --name "afw-contoso" \
  --resource-group $RG \
  --query "ipConfigurations[0].privateIPAddress" -o tsv)

echo "Firewall Private IP: $AFW_PRIVATE_IP"
```

---

## Tarefa 6: Configurar tabelas de rotas para tunelamento forçado através do firewall

Crie UDRs para forçar todo o tráfego dos spokes através do Azure Firewall.

```bash
# Create route table for spoke subnets
az network route-table create \
  --name "rt-spoke-to-firewall" \
  --resource-group $RG \
  --location $LOCATION \
  --disable-bgp-route-propagation true

# Add default route pointing to Azure Firewall
az network route-table route create \
  --name "route-to-firewall" \
  --route-table-name "rt-spoke-to-firewall" \
  --resource-group $RG \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $AFW_PRIVATE_IP

# Add route for inter-spoke traffic through firewall
az network route-table route create \
  --name "route-spoke-to-spoke" \
  --route-table-name "rt-spoke-to-firewall" \
  --resource-group $RG \
  --address-prefix 10.0.0.0/8 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $AFW_PRIVATE_IP

# Associate route table with spoke subnets
az network vnet subnet update \
  --name snet-web \
  --vnet-name vnet-spoke-web \
  --resource-group $RG \
  --route-table "rt-spoke-to-firewall"

az network vnet subnet update \
  --name snet-app \
  --vnet-name vnet-spoke-app \
  --resource-group $RG \
  --route-table "rt-spoke-to-firewall"

# Verify route table configuration
az network route-table route list \
  --route-table-name "rt-spoke-to-firewall" \
  --resource-group $RG \
  -o table

# Enable diagnostic logging on Azure Firewall
WORKSPACE_NAME="law-sc500-firewall"
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME --resource-group $RG --query id -o tsv)

AFW_ID=$(az network firewall show --name "afw-contoso" --resource-group $RG --query id -o tsv)

az monitor diagnostic-settings create \
  --name "afw-diagnostics" \
  --resource $AFW_ID \
  --workspace $WORKSPACE_ID \
  --logs '[{"category":"AzureFirewallApplicationRule","enabled":true},{"category":"AzureFirewallNetworkRule","enabled":true},{"category":"AzureFirewallDnsProxy","enabled":true},{"category":"AZFWIdpsSignature","enabled":true},{"category":"AZFWThreatIntel","enabled":true}]'
```

---

## Quebra & conserta

### Cenário 1: VMs dos spokes não conseguem acessar a internet apesar das regras de permissão do firewall

VMs nas VNets spoke não conseguem acessar nenhum site, mesmo com regras de aplicação permitindo tráfego HTTPS. O firewall não mostra entradas de log para o tráfego.

<details>
<summary>Mostrar solução</summary>

```bash
# Check if the route table is associated with the spoke subnet
az network vnet subnet show \
  --name snet-web \
  --vnet-name vnet-spoke-web \
  --resource-group $RG \
  --query "routeTable.id"

# Check if the default route points to the firewall
az network route-table route list \
  --route-table-name "rt-spoke-to-firewall" \
  --resource-group $RG -o table

# Verify the firewall private IP matches the route next-hop
echo "Firewall IP: $AFW_PRIVATE_IP"

# Check VNet peering allows forwarded traffic
az network vnet peering show \
  --name spoke-web-to-hub \
  --vnet-name vnet-spoke-web \
  --resource-group $RG \
  --query "{AllowForwarded:allowForwardedTraffic, AllowVNetAccess:allowVirtualNetworkAccess}"

# If forwarded traffic is not allowed, update peering
az network vnet peering update \
  --name spoke-web-to-hub \
  --vnet-name vnet-spoke-web \
  --resource-group $RG \
  --set allowForwardedTraffic=true

# Also ensure the hub-to-spoke peering allows gateway transit or forwarded traffic
az network vnet peering update \
  --name hub-to-spoke-web \
  --vnet-name vnet-hub \
  --resource-group $RG \
  --set allowForwardedTraffic=true
```

</details>

### Cenário 2: Regra DNAT não funciona — usuários externos não conseguem acessar o servidor web

Usuários externos não conseguem acessar o servidor web no IP público do firewall na porta 443. A regra DNAT do firewall existe, mas a conexão expira.

<details>
<summary>Mostrar solução</summary>

```bash
# Verify the DNAT rule configuration
az network firewall policy rule-collection-group collection list \
  --rule-collection-group-name "rcg-dnat" \
  --policy-name "afwp-contoso-security" \
  --resource-group $RG

# Check if there's also a network rule allowing the translated traffic
# DNAT rules translate the destination but the traffic also needs a matching
# network rule to allow the translated traffic flow (in some configurations)

# Verify the translated address (10.1.1.10) is reachable from the firewall
# The web server must be in a peered spoke with proper routing

# Check if the web server has an NSG blocking the traffic
# After DNAT, the source IP is the original client IP (not the firewall)
# The NSG on the web server subnet must allow the traffic

# Common fix: Ensure no NSG blocks traffic from Internet to the web server
# The firewall handles the security; NSGs should allow from the firewall subnet
az network nsg rule create \
  --nsg-name nsg-web \
  --resource-group $RG \
  --name "Allow-From-Firewall" \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes "10.0.1.0/26" \
  --destination-port-ranges 443 80 2>/dev/null || echo "Create NSG if needed"
```

</details>

### Cenário 3: Threat intelligence não está bloqueando domínios maliciosos conhecidos

Apesar do modo de threat intelligence estar configurado como "Deny", o tráfego para domínios maliciosos conhecidos não está sendo bloqueado.

<details>
<summary>Mostrar solução</summary>

```bash
# Verify threat intelligence mode on the firewall policy
az network firewall policy show \
  --name "afwp-contoso-security" \
  --resource-group $RG \
  --query "threatIntelMode"

# If set to "Off" or "Alert", update to "Deny"
az network firewall policy update \
  --name "afwp-contoso-security" \
  --resource-group $RG \
  --threat-intel-mode Deny

# Check if there's an allow list bypassing threat intel
az network firewall policy show \
  --name "afwp-contoso-security" \
  --resource-group $RG \
  --query "threatIntelWhitelist"

# Remove any mistakenly added whitelist entries
az network firewall policy update \
  --name "afwp-contoso-security" \
  --resource-group $RG \
  --threat-intel-whitelist fqdns="" ip-addresses=""

# Note: Application rules with explicit FQDN allow take precedence
# over threat intelligence. Check if an app rule allows the domain.
# Remove or modify the conflicting application rule.
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Em que ordem o Azure Firewall avalia os tipos de regras?",
    options: [
      "Regras de aplicação → Regras de rede → Regras DNAT",
      "Regras DNAT → Regras de rede → Regras de aplicação",
      "Regras de rede → Regras de aplicação → Regras DNAT",
      "Todas as regras são avaliadas simultaneamente"
    ],
    correctIndex: 1,
    explanation: "O Azure Firewall avalia as regras nesta ordem: regras DNAT primeiro (para tradução de tráfego de entrada), depois regras de rede, depois regras de aplicação. Dentro de cada tipo, as regras são processadas por prioridade. Se uma regra de rede corresponder, as regras de aplicação não são avaliadas para esse tráfego."
  },
  {
    question: "O que é necessário para o TLS inspection do Azure Firewall funcionar?",
    options: [
      "Um certificado CA raiz autoassinado carregado no firewall",
      "Um certificado CA Intermediário armazenado no Azure Key Vault com uma identidade gerenciada para acesso",
      "O certificado CA público da Microsoft",
      "Um certificado SSL wildcard comprado de uma CA pública"
    ],
    correctIndex: 1,
    explanation: "O TLS inspection do Azure Firewall requer um certificado CA Intermediário armazenado no Azure Key Vault. O firewall usa uma identidade gerenciada para acessar o certificado. O firewall assina o tráfego re-criptografado com esse CA intermediário, então os clientes devem confiar no CA raiz que o emitiu."
  },
  {
    question: "Qual é o tamanho mínimo de sub-rede necessário para o AzureFirewallSubnet?",
    options: [
      "/28 (16 endereços)",
      "/26 (64 endereços)",
      "/24 (256 endereços)",
      "/27 (32 endereços)"
    ],
    correctIndex: 1,
    explanation: "O AzureFirewallSubnet requer um mínimo de /26 (64 endereços). Isso ocorre porque o Azure Firewall pode escalar para múltiplas instâncias durante alta carga, e cada instância requer endereços IP dessa sub-rede. A Microsoft recomenda /26 como mínimo."
  },
  {
    question: "Como o bloqueio de threat intelligence do Azure Firewall interage com regras de permissão explícitas?",
    options: [
      "Threat intelligence sempre tem a mais alta precedência sobre todas as regras",
      "Regras de permissão explícitas de aplicação/rede têm precedência sobre threat intelligence",
      "Eles não podem ser usados juntos",
      "Threat intelligence só se aplica ao tráfego de entrada"
    ],
    correctIndex: 0,
    explanation: "Quando threat intelligence está configurado no modo 'Deny', ele tem a mais alta precedência — tráfego de/para IPs/FQDNs maliciosos conhecidos é bloqueado mesmo se uma regra de permissão explícita existir. No entanto, IPs/FQDNs específicos podem ser adicionados à whitelist de threat intelligence para substituir esse comportamento."
  }
]} />

## Limpeza

```bash
# Delete the resource group (firewall deletion takes several minutes)
az group delete --name $RG --yes --no-wait

# Purge Key Vault if needed
az keyvault purge --name $KV_NAME --no-wait 2>/dev/null
```
