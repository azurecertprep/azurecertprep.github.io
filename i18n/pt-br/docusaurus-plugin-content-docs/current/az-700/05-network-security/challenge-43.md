---
sidebar_position: 4
title: "Challenge 43: Azure Firewall Manager and policy hierarchy"
sidebar_label: "Challenge 43"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 43: Azure Firewall Manager e hierarquia de políticas

:::info Tempo e custo estimados
**60-90 minutos** | **~$1,75/hora** (Premium SKU) | **Peso do exame: 10-15%**
:::

:::danger Aviso de custo
O Azure Firewall Premium custa aproximadamente $1,75/hora ($1.277/mês). Isso é significativamente mais caro que o Standard. Implante apenas pela duração deste laboratório e exclua imediatamente após. O tier Premium é necessário para os recursos de inspeção TLS e IDPS abordados neste desafio.
:::

## Cenário

A Contoso Financial Services opera em múltiplas regiões do Azure (East US 2 e West Europe). A política de segurança exige:

- Um conjunto de regras base que se aplica globalmente a todas as regiões (política pai)
- Regras específicas por região para conformidade com regulamentações locais (políticas filhas)
- Sistema de Detecção e Prevenção de Intrusão (IDPS) para detectar e bloquear padrões de ataque conhecidos
- Inspeção TLS para detectar ameaças no tráfego criptografado para serviços externos
- Filtragem em nível de URL (não apenas FQDN) e bloqueio de categorias da web

Você deve implementar uma hierarquia de políticas usando o Azure Firewall Manager, implantar firewalls com Premium SKU e habilitar os recursos avançados de segurança.

## Habilidades do exame abordadas

| Habilidade | Peso |
|------------|------|
| Criar e gerenciar políticas de firewall com herança | Alto |
| Entender relacionamentos de política pai/filha | Alto |
| Implantar Azure Firewall Premium SKU | Médio |
| Configurar IDPS (Detecção e prevenção de intrusão) | Médio |
| Entender requisitos de inspeção TLS | Médio |
| Configurar filtragem de URL e categorias da web | Médio |
| Comparar SKUs de Firewall (Basic/Standard/Premium) | Alto |

## Pré-requisitos

- Assinatura do Azure com função de Contributor
- Azure CLI 2.60+ com a extensão `azure-firewall`
- Azure PowerShell Az 12.0+
- Conclusão do Challenge 42 (entendimento de políticas e regras de firewall)
- Um Key Vault (para armazenamento de certificado de inspeção TLS)

## Comparação de SKUs do Azure Firewall

| Recurso | Basic | Standard | Premium |
|---------|-------|----------|---------|
| Inteligência contra ameaças | Somente alerta | Alerta + Negar | Alerta + Negar |
| Filtragem de FQDN | Limitada | Completa | Completa |
| Regras de rede | Sim | Sim | Sim |
| DNAT | Sim | Sim | Sim |
| IDPS | Não | Não | Sim |
| Inspeção TLS | Não | Não | Sim |
| Filtragem de URL | Não | Não | Sim |
| Categorias da web | Não | Baseada em FQDN | Baseada em URL completa |
| Herança de política | Não | Sim | Sim |
| Túnel forçado | Não | Sim | Sim |
| Custo (aprox.) | $0,395/hr | $1,25/hr | $1,75/hr |

## Tarefa 1: Criar uma política de firewall pai (base)

A política pai contém regras base que se aplicam a todas as regiões. As políticas filhas herdam essas regras e não podem substituí-las ou excluí-las, apenas adicionar regras adicionais.

:::warning Regras de herança de política
- Políticas filhas herdam TODOS os grupos de coleção de regras da política pai
- Uma política filha não pode excluir ou modificar regras herdadas da pai
- Políticas filhas só podem ADICIONAR novos grupos de coleção de regras com prioridades diferentes
- Números de prioridade usados na pai são reservados e não podem ser reutilizados nas filhas
- A política pai pode ser Standard SKU; políticas filhas podem ser Premium (mas não o inverso)
:::

### Azure CLI

```bash
# Set variables
RG="rg-fwmanager-challenge"
LOCATION_PRIMARY="eastus2"
LOCATION_SECONDARY="westeurope"

# Create resource group
az group create --name $RG --location $LOCATION_PRIMARY

# Create the parent (base) policy - Premium SKU needed since children use Premium features
az network firewall policy create \
  --resource-group $RG \
  --name policy-parent-global \
  --location $LOCATION_PRIMARY \
  --sku Premium \
  --threat-intel-mode Deny

# Create a rule collection group in the parent for baseline rules
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name policy-parent-global \
  --name rcg-baseline-network \
  --priority 200

# Add baseline network rule - Allow DNS everywhere
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-parent-global \
  --rule-collection-group-name rcg-baseline-network \
  --name rc-global-dns \
  --collection-priority 100 \
  --action Allow \
  --rule-name allow-dns-global \
  --rule-type NetworkRule \
  --source-addresses "10.0.0.0/8" \
  --destination-addresses "168.63.129.16" \
  --destination-ports 53 \
  --ip-protocols UDP TCP

# Add baseline network rule - Allow NTP everywhere
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-parent-global \
  --rule-collection-group-name rcg-baseline-network \
  --name rc-global-ntp \
  --collection-priority 200 \
  --action Allow \
  --rule-name allow-ntp-global \
  --rule-type NetworkRule \
  --source-addresses "10.0.0.0/8" \
  --destination-addresses "*" \
  --destination-ports 123 \
  --ip-protocols UDP

# Create baseline application rule collection group
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name policy-parent-global \
  --name rcg-baseline-application \
  --priority 300

# Add baseline application rule - Allow Microsoft services globally
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-parent-global \
  --rule-collection-group-name rcg-baseline-application \
  --name rc-global-microsoft \
  --collection-priority 100 \
  --action Allow \
  --rule-name allow-microsoft \
  --rule-type ApplicationRule \
  --source-addresses "10.0.0.0/8" \
  --protocols Https=443 Http=80 \
  --target-fqdns "*.microsoft.com" "*.azure.com" "*.windows.net" "*.windowsupdate.com"

# Add baseline deny-all as catch-all (high priority number = low precedence)
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-parent-global \
  --rule-collection-group-name rcg-baseline-application \
  --name rc-global-deny-all \
  --collection-priority 5000 \
  --action Deny \
  --rule-name deny-all-web \
  --rule-type ApplicationRule \
  --source-addresses "*" \
  --protocols Https=443 Http=80 \
  --target-fqdns "*"
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-fwmanager-challenge"
$locationPrimary = "eastus2"
$locationSecondary = "westeurope"

# Create resource group
New-AzResourceGroup -Name $rg -Location $locationPrimary

# Create parent policy (Premium SKU for IDPS and TLS)
$parentPolicy = New-AzFirewallPolicy `
  -ResourceGroupName $rg `
  -Name "policy-parent-global" `
  -Location $locationPrimary `
  -SkuTier Premium `
  -ThreatIntelMode Deny

# Create baseline network rules
$dnsRule = New-AzFirewallPolicyNetworkRule `
  -Name "allow-dns-global" `
  -SourceAddress "10.0.0.0/8" `
  -DestinationAddress "168.63.129.16" `
  -DestinationPort "53" `
  -Protocol UDP, TCP

$dnsCollection = New-AzFirewallPolicyFilterRuleCollection `
  -Name "rc-global-dns" `
  -Priority 100 `
  -ActionType Allow `
  -Rule $dnsRule

$ntpRule = New-AzFirewallPolicyNetworkRule `
  -Name "allow-ntp-global" `
  -SourceAddress "10.0.0.0/8" `
  -DestinationAddress "*" `
  -DestinationPort "123" `
  -Protocol UDP

$ntpCollection = New-AzFirewallPolicyFilterRuleCollection `
  -Name "rc-global-ntp" `
  -Priority 200 `
  -ActionType Allow `
  -Rule $ntpRule

New-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "policy-parent-global" `
  -Name "rcg-baseline-network" `
  -Priority 200 `
  -RuleCollection @($dnsCollection, $ntpCollection)

# Create baseline application rules
$msRule = New-AzFirewallPolicyApplicationRule `
  -Name "allow-microsoft" `
  -SourceAddress "10.0.0.0/8" `
  -TargetFqdn "*.microsoft.com", "*.azure.com", "*.windows.net", "*.windowsupdate.com" `
  -Protocol "Https:443", "Http:80"

$msCollection = New-AzFirewallPolicyFilterRuleCollection `
  -Name "rc-global-microsoft" `
  -Priority 100 `
  -ActionType Allow `
  -Rule $msRule

New-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "policy-parent-global" `
  -Name "rcg-baseline-application" `
  -Priority 300 `
  -RuleCollection @($msCollection)
```

## Tarefa 2: Criar políticas filhas com substituições regionais

As políticas filhas herdam as regras da política pai e adicionam regras específicas da região. O parâmetro `--base-policy` estabelece o relacionamento de herança.

### Azure CLI

```bash
# Create child policy for East US 2 (inherits from parent)
az network firewall policy create \
  --resource-group $RG \
  --name policy-child-eastus2 \
  --location $LOCATION_PRIMARY \
  --sku Premium \
  --base-policy policy-parent-global

# Create child policy for West Europe (inherits from parent)
az network firewall policy create \
  --resource-group $RG \
  --name policy-child-westeurope \
  --location $LOCATION_SECONDARY \
  --sku Premium \
  --base-policy policy-parent-global

# Add region-specific rules to East US 2 child
# Allow access to US-specific SaaS applications
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name policy-child-eastus2 \
  --name rcg-regional-eastus2 \
  --priority 400

az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-child-eastus2 \
  --rule-collection-group-name rcg-regional-eastus2 \
  --name rc-us-saas \
  --collection-priority 100 \
  --action Allow \
  --rule-name allow-us-saas \
  --rule-type ApplicationRule \
  --source-addresses "10.1.0.0/16" \
  --protocols Https=443 \
  --target-fqdns "*.salesforce.com" "*.slack.com" "*.github.com"

# Add region-specific rules to West Europe child
# Allow access to EU-specific services
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name policy-child-westeurope \
  --name rcg-regional-westeurope \
  --priority 400

az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-child-westeurope \
  --rule-collection-group-name rcg-regional-westeurope \
  --name rc-eu-saas \
  --collection-priority 100 \
  --action Allow \
  --rule-name allow-eu-services \
  --rule-type ApplicationRule \
  --source-addresses "10.2.0.0/16" \
  --protocols Https=443 \
  --target-fqdns "*.eu.auth0.com" "*.europe.example.com"
```

### Azure PowerShell

```powershell
# Create child policies inheriting from parent
$parentPolicy = Get-AzFirewallPolicy -ResourceGroupName $rg -Name "policy-parent-global"

$childEastUs = New-AzFirewallPolicy `
  -ResourceGroupName $rg `
  -Name "policy-child-eastus2" `
  -Location $locationPrimary `
  -SkuTier Premium `
  -BasePolicy $parentPolicy.Id

$childWestEurope = New-AzFirewallPolicy `
  -ResourceGroupName $rg `
  -Name "policy-child-westeurope" `
  -Location $locationSecondary `
  -SkuTier Premium `
  -BasePolicy $parentPolicy.Id

# Add regional rules to East US 2 child
$usSaasRule = New-AzFirewallPolicyApplicationRule `
  -Name "allow-us-saas" `
  -SourceAddress "10.1.0.0/16" `
  -TargetFqdn "*.salesforce.com", "*.slack.com", "*.github.com" `
  -Protocol "Https:443"

$usSaasCollection = New-AzFirewallPolicyFilterRuleCollection `
  -Name "rc-us-saas" `
  -Priority 100 `
  -ActionType Allow `
  -Rule $usSaasRule

New-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "policy-child-eastus2" `
  -Name "rcg-regional-eastus2" `
  -Priority 400 `
  -RuleCollection @($usSaasCollection)
```

## Tarefa 3: Implantar Azure Firewall Premium e habilitar IDPS

O IDPS (Sistema de Detecção e Prevenção de Intrusão) inspeciona o tráfego de rede em busca de assinaturas e padrões de ataque conhecidos. Ele requer o Premium SKU.

### Azure CLI

```bash
# Create hub VNet for the Premium firewall
az network vnet create \
  --resource-group $RG \
  --name vnet-hub-eastus2 \
  --location $LOCATION_PRIMARY \
  --address-prefixes 10.0.0.0/16 \
  --subnet-name AzureFirewallSubnet \
  --subnet-prefixes 10.0.1.0/26

# Create public IP for the Premium firewall
az network public-ip create \
  --resource-group $RG \
  --name pip-fw-premium \
  --location $LOCATION_PRIMARY \
  --sku Standard \
  --allocation-method Static

# Deploy Azure Firewall Premium with the child policy
az network firewall create \
  --resource-group $RG \
  --name fw-premium-eastus2 \
  --location $LOCATION_PRIMARY \
  --sku AZFW_VNet \
  --tier Premium \
  --firewall-policy policy-child-eastus2

# Configure IP configuration
az network firewall ip-config create \
  --resource-group $RG \
  --firewall-name fw-premium-eastus2 \
  --name fw-ipconfig \
  --public-ip-address pip-fw-premium \
  --vnet-name vnet-hub-eastus2

# Enable IDPS in Deny mode on the child policy
az network firewall policy update \
  --resource-group $RG \
  --name policy-child-eastus2 \
  --idps-mode Deny

# Alternatively, set IDPS to Alert mode first for testing
az network firewall policy update \
  --resource-group $RG \
  --name policy-child-eastus2 \
  --idps-mode Alert
```

### Azure PowerShell

```powershell
# Create hub VNet
$fwSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "AzureFirewallSubnet" -AddressPrefix "10.0.1.0/26"

$hubVnet = New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-hub-eastus2" `
  -Location $locationPrimary `
  -AddressPrefix "10.0.0.0/16" `
  -Subnet $fwSubnet

# Create public IP
$pip = New-AzPublicIpAddress `
  -ResourceGroupName $rg `
  -Name "pip-fw-premium" `
  -Location $locationPrimary `
  -Sku Standard `
  -AllocationMethod Static

# Deploy Premium firewall
$childPolicy = Get-AzFirewallPolicy -ResourceGroupName $rg -Name "policy-child-eastus2"
$hubVnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-hub-eastus2"

$firewall = New-AzFirewall `
  -ResourceGroupName $rg `
  -Name "fw-premium-eastus2" `
  -Location $locationPrimary `
  -VirtualNetwork $hubVnet `
  -PublicIpAddress $pip `
  -FirewallPolicyId $childPolicy.Id `
  -SkuTier Premium

# Enable IDPS
$policy = Get-AzFirewallPolicy -ResourceGroupName $rg -Name "policy-child-eastus2"
$policy.IntrusionDetection = New-AzFirewallPolicyIntrusionDetection -Mode "Deny"
$policy | Set-AzFirewallPolicy
```

### Modos do IDPS

| Modo | Comportamento |
|------|---------------|
| Off | IDPS desabilitado |
| Alert | Detecta e registra padrões de intrusão, mas não bloqueia o tráfego |
| Deny | Detecta, registra e bloqueia ativamente o tráfego que corresponde a assinaturas de intrusão |

## Tarefa 4: Configurar inspeção TLS

A inspeção TLS descriptografa o tráfego HTTPS de saída, inspeciona-o contra regras de aplicação e IDPS, e então recriptografa. Isso requer um certificado de CA intermediária armazenado no Azure Key Vault.

:::warning Requisitos da inspeção TLS
- Requer Azure Firewall Premium SKU
- Requer um certificado de CA intermediária (não um certificado leaf autoassinado)
- O certificado deve ser armazenado no Azure Key Vault
- A identidade gerenciada do firewall deve ter acesso ao Key Vault
- As máquinas clientes devem confiar na CA intermediária (adicionar ao repositório de raízes confiáveis)
- Quebrar o TLS para alguns aplicativos (certificate pinning) causará falhas de conexão
:::

### Azure CLI

```bash
# Create Key Vault for TLS certificate
KV_NAME="kv-fwtls-${RANDOM}"

az keyvault create \
  --resource-group $RG \
  --name $KV_NAME \
  --location $LOCATION_PRIMARY \
  --enable-rbac-authorization false

# Generate a self-signed intermediate CA certificate (for lab purposes only)
# In production, use a proper intermediate CA from your PKI
az keyvault certificate create \
  --vault-name $KV_NAME \
  --name "fw-intermediate-ca" \
  --policy @- <<EOF
{
  "issuerParameters": { "name": "Self" },
  "keyProperties": { "exportable": true, "keySize": 2048, "keyType": "RSA" },
  "x509CertificateProperties": {
    "subject": "CN=Contoso Firewall Intermediate CA",
    "validityInMonths": 12,
    "keyUsage": ["keyCertSign", "cRLSign"],
    "basicConstraints": { "ca": true }
  }
}
EOF

# Get the Key Vault secret ID for TLS inspection configuration
KV_SECRET_ID=$(az keyvault secret show --vault-name $KV_NAME --name "fw-intermediate-ca" --query id -o tsv)

# Configure TLS inspection on the policy
az network firewall policy update \
  --resource-group $RG \
  --name policy-child-eastus2 \
  --cert-name "fw-intermediate-ca" \
  --key-vault-secret-id $KV_SECRET_ID
```

### Azure PowerShell

```powershell
# Create Key Vault
$kvName = "kv-fwtls-$(Get-Random -Minimum 1000 -Maximum 9999)"
$kv = New-AzKeyVault `
  -ResourceGroupName $rg `
  -Name $kvName `
  -Location $locationPrimary `
  -EnableRbacAuthorization $false

# Create certificate policy and generate cert (lab purposes)
$certPolicy = New-AzKeyVaultCertificatePolicy `
  -SubjectName "CN=Contoso Firewall Intermediate CA" `
  -IssuerName Self `
  -ValidityInMonths 12 `
  -KeyUsage KeyCertSign, CRLSign `
  -CertificateTransparency $false

Add-AzKeyVaultCertificate `
  -VaultName $kvName `
  -Name "fw-intermediate-ca" `
  -CertificatePolicy $certPolicy

# Get the secret ID for the certificate
$certSecret = Get-AzKeyVaultSecret -VaultName $kvName -Name "fw-intermediate-ca"

# Update policy with TLS inspection certificate
$policy = Get-AzFirewallPolicy -ResourceGroupName $rg -Name "policy-child-eastus2"
$policy.TransportSecurity = New-AzFirewallPolicyTransportSecurity `
  -CertificateAuthority @{
    Name = "fw-intermediate-ca"
    KeyVaultSecretId = $certSecret.Id
  }
$policy | Set-AzFirewallPolicy
```

## Tarefa 5: Configurar filtragem de URL e categorias da web

O Premium SKU suporta filtragem completa de URL (correspondência em nível de caminho) e filtragem de categorias da web (bloqueio de categorias inteiras como jogos de azar, malware, etc.).

### Azure CLI

```bash
# Add URL filtering rule collection group
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name policy-child-eastus2 \
  --name rcg-url-filtering \
  --priority 500

# Allow specific URLs (not just FQDNs)
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-child-eastus2 \
  --rule-collection-group-name rcg-url-filtering \
  --name rc-allow-specific-urls \
  --collection-priority 100 \
  --action Allow \
  --rule-name allow-github-repos \
  --rule-type ApplicationRule \
  --source-addresses "10.1.0.0/16" \
  --protocols Https=443 \
  --target-urls "github.com/contoso/*" "raw.githubusercontent.com/contoso/*"

# Block Web categories
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-child-eastus2 \
  --rule-collection-group-name rcg-url-filtering \
  --name rc-block-categories \
  --collection-priority 200 \
  --action Deny \
  --rule-name block-risky-categories \
  --rule-type ApplicationRule \
  --source-addresses "10.1.0.0/16" \
  --protocols Https=443 Http=80 \
  --web-categories Gambling Malware Phishing
```

### Azure PowerShell

```powershell
# URL filtering rule
$urlRule = New-AzFirewallPolicyApplicationRule `
  -Name "allow-github-repos" `
  -SourceAddress "10.1.0.0/16" `
  -TargetUrl "github.com/contoso/*", "raw.githubusercontent.com/contoso/*" `
  -Protocol "Https:443"

$urlCollection = New-AzFirewallPolicyFilterRuleCollection `
  -Name "rc-allow-specific-urls" `
  -Priority 100 `
  -ActionType Allow `
  -Rule $urlRule

# Web category blocking rule
$webCatRule = New-AzFirewallPolicyApplicationRule `
  -Name "block-risky-categories" `
  -SourceAddress "10.1.0.0/16" `
  -WebCategory "Gambling", "Malware", "Phishing" `
  -Protocol "Https:443", "Http:80"

$webCatCollection = New-AzFirewallPolicyFilterRuleCollection `
  -Name "rc-block-categories" `
  -Priority 200 `
  -ActionType Deny `
  -Rule $webCatRule

New-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "policy-child-eastus2" `
  -Name "rcg-url-filtering" `
  -Priority 500 `
  -RuleCollection @($urlCollection, $webCatCollection)
```

## Quebra e correção

### Cenário 1: Colisão de prioridade da política filha com a pai

```bash
# Parent has rcg-baseline-network at priority 200
# Try to create a child rule collection group at the SAME priority
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name policy-child-eastus2 \
  --name rcg-child-network \
  --priority 200
```

**Sintoma**: O comando falha com um erro de conflito de prioridade porque a prioridade 200 já está em uso por um grupo de coleção de regras herdado da política pai.

**Causa raiz**: As prioridades dos grupos de coleção de regras devem ser únicas em toda a hierarquia de políticas (pai + filha combinadas). Como a pai já usa a prioridade 200 para `rcg-baseline-network`, a filha não pode reutilizá-la.

**Correção**: Use um número de prioridade que não conflite com nenhum grupo de coleção de regras da pai:

```bash
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name policy-child-eastus2 \
  --name rcg-child-network \
  --priority 250
```

### Cenário 2: Inspeção TLS quebrando aplicativos internos

**Sintoma**: Após habilitar a inspeção TLS, aplicativos internos que usam certificate pinning (apps de banco móvel, certos clientes de API) falham com erros de TLS/certificado.

**Causa raiz**: A inspeção TLS usa a CA intermediária do firewall para reassinar o tráfego descriptografado. Aplicativos que fixam certificados ou CAs específicas rejeitam o certificado reassinado porque ele não corresponde ao certificado esperado.

**Correção**: Crie regras de bypass para aplicativos que usam certificate pinning:

```bash
# Add a network rule to bypass TLS inspection for specific destinations
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-child-eastus2 \
  --rule-collection-group-name rcg-url-filtering \
  --name rc-tls-bypass \
  --collection-priority 50 \
  --action Allow \
  --rule-name bypass-cert-pinned-apps \
  --rule-type ApplicationRule \
  --source-addresses "10.1.0.0/16" \
  --protocols Https=443 \
  --target-fqdns "api.banking-partner.com" "pinned-service.internal.com"
```

Além disso, certifique-se de que o certificado de CA intermediária seja distribuído a todos os repositórios de confiança dos clientes.

### Cenário 3: Falsos positivos do IDPS bloqueando tráfego legítimo

**Sintoma**: Após habilitar o IDPS no modo Deny, tráfego legítimo de aplicativos está sendo bloqueado. Os logs do firewall mostram hits de assinatura IDPS para padrões de tráfego normais.

**Causa raiz**: Algumas assinaturas IDPS possuem padrões de correspondência amplos que podem disparar em tráfego legítimo, especialmente durante varreduras de segurança, testes de carga, ou quando aplicativos usam métodos HTTP incomuns ou padrões de payload.

**Correção**: Crie regras de substituição de assinatura para alterar assinaturas específicas para o modo Alert, mantendo a política geral no modo Deny:

```bash
# Override a specific IDPS signature to Alert mode
az network firewall policy intrusion-detection add \
  --resource-group $RG \
  --policy-name policy-child-eastus2 \
  --mode Alert \
  --signature-id 2024897
```

Em produção, investigue cada falso positivo, verifique se é realmente benigno e só então crie substituições para IDs de assinatura específicos.

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-43-q1",
    question: "A parent firewall policy has a rule collection group at priority 200. A child policy attempts to create a rule collection group at the same priority. What happens?",
    options: [
      "The operation fails because priorities must be unique across the entire parent-child hierarchy ✅",
      "The child rule collection group overrides the parent's",
      "Both coexist and the child rule is evaluated first",
      "The parent rule is automatically re-prioritized"
    ],
    correctIndex: 0,
    explanation: "Rule collection group priorities must be globally unique across the combined parent and child policy. The child cannot reuse any priority number already claimed by the parent. This prevents ambiguity in rule evaluation order."
  },
  {
    id: "az700-43-q2",
    question: "Which Azure Firewall feature requires the Premium SKU but is NOT available in Standard?",
    options: [
      "TLS inspection and IDPS (Intrusion Detection and Prevention System) ✅",
      "FQDN-based application rules",
      "Threat intelligence in Deny mode",
      "DNAT rules for inbound translation"
    ],
    correctIndex: 0,
    explanation: "TLS inspection and IDPS are exclusive to Azure Firewall Premium. Standard supports threat intelligence (Alert and Deny), FQDN filtering, network rules, and DNAT, but cannot decrypt TLS traffic or perform signature-based intrusion detection."
  },
  {
    id: "az700-43-q3",
    question: "What is required for Azure Firewall TLS inspection to function?",
    options: [
      "An intermediate CA certificate stored in Azure Key Vault with firewall managed identity access ✅",
      "A self-signed leaf certificate imported directly into the firewall",
      "A public SSL certificate from a trusted CA like DigiCert",
      "Only the Premium SKU is needed; TLS inspection works without certificates"
    ],
    correctIndex: 0,
    explanation: "TLS inspection requires an intermediate CA certificate stored in Key Vault. The firewall's managed identity must have Get access to the certificate. The firewall uses this CA to re-sign decrypted traffic. Client machines must trust this intermediate CA in their root store."
  },
  {
    id: "az700-43-q4",
    question: "What are the available IDPS modes on Azure Firewall Premium?",
    options: [
      "Off, Alert (detect and log only), and Deny (detect, log, and block) ✅",
      "Passive, Active, and Inline",
      "Monitor, Detect, and Prevent",
      "Off, Log, and Quarantine"
    ],
    correctIndex: 0,
    explanation: "Azure Firewall Premium IDPS supports three modes: Off (disabled), Alert (detects and logs intrusion patterns without blocking), and Deny (actively blocks traffic matching intrusion signatures while logging the event)."
  },
  {
    id: "az700-43-q5",
    question: "A child policy inherits rules from a parent policy. Can the child delete or modify the inherited rules?",
    options: [
      "No, child policies cannot modify or delete inherited parent rules; they can only add new rules ✅",
      "Yes, child rules always override parent rules with matching names",
      "Yes, but only if the child has a higher SKU than the parent",
      "No, but the parent can grant override permissions to specific children"
    ],
    correctIndex: 0,
    explanation: "Policy inheritance is strictly additive. Child policies inherit all parent rule collection groups as read-only. Children can add new rule collection groups at different priorities but cannot modify, delete, or override any inherited content."
  },
  {
    id: "az700-43-q6",
    question: "What is the key difference between URL filtering (Premium) and FQDN filtering (Standard)?",
    options: [
      "URL filtering matches the full URL path (e.g., contoso.com/api/v2); FQDN filtering only matches the domain name ✅",
      "URL filtering is faster because it caches results",
      "FQDN filtering can match wildcards but URL filtering cannot",
      "There is no difference; they are different names for the same feature"
    ],
    correctIndex: 0,
    explanation: "Standard FQDN filtering matches only the domain portion (e.g., *.contoso.com). Premium URL filtering inspects the entire URL path after TLS decryption (e.g., contoso.com/api/v2/*), enabling granular path-based access control. URL filtering requires TLS inspection to see the full URL in HTTPS traffic."
  }
]} />

## Limpeza

Remova todos os recursos imediatamente para parar as cobranças do firewall Premium.

### Azure CLI

```bash
# Delete the entire resource group
az group delete --name rg-fwmanager-challenge --yes --no-wait
```

### Azure PowerShell

```powershell
Remove-AzResourceGroup -Name "rg-fwmanager-challenge" -Force -AsJob
```

:::tip Verificar limpeza
O Azure Firewall Premium cobra ~$1,75/hora. Verifique a exclusão imediatamente:
```bash
az group show --name rg-fwmanager-challenge 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists - DELETE NOW!"
```
:::

:::danger Lembrete de custo
Azure Firewall Premium: ~$1,75/hora ($1.277/mês). Este é o recurso mais caro da série de desafios AZ-700. Exclua todos os recursos imediatamente após concluir o laboratório. Se você precisar se ausentar durante o laboratório, exclua o firewall primeiro e recrie-o quando retornar. A política e as regras do firewall persistem sem custo; apenas a instância do firewall em si gera cobranças por hora.
:::
