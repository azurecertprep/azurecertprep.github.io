---
sidebar_position: 9
title: "Challenge 48: Network segmentation and Just-in-Time access"
sidebar_label: "Challenge 48"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 48: Segmentação de rede e acesso Just-in-Time

:::info Tempo e custo estimados

**75-90 minutos** | **~$0,30/hora** (Bastion Standard + VMs) | **Peso no exame: 10-15%**

:::

## Cenário

Sua organização está implementando um design de rede de confiança zero (zero-trust). Todo acesso de gerenciamento às VMs deve ser controlado por acesso Just-in-Time (JIT) através do Microsoft Defender for Cloud, e as sessões administrativas devem passar pelo Azure Bastion. O Azure Virtual Network Manager (AVNM) aplica regras de administrador de segurança em toda a organização que não podem ser substituídas por administradores locais de NSG — garantindo uma postura de negação por padrão em todos os grupos de rede.

Você deve demonstrar que:
- O acesso direto SSH/RDP às VMs é negado por padrão
- As regras de administrador de segurança do AVNM têm precedência sobre NSGs locais
- O acesso JIT permite acesso temporário e auditado para gerenciamento
- O Bastion fornece o único caminho para administração interativa de VMs

---

## Visão geral da arquitetura

```
   +--------------------------------------------------+
   |         Azure Virtual Network Manager             |
   |  (Security Admin Rules - deny by default)         |
   +--------------------------------------------------+
                          |
          +---------------+----------------+
          |                                |
   +------+------+                  +------+------+
   | Network     |                  | Network     |
   | Group: Prod |                  | Group: Dev  |
   | (tag-based) |                  | (tag-based) |
   +------+------+                  +------+------+
          |                                |
   +------+------+                  +------+------+
   | VNet-Prod   |                  | VNet-Dev    |
   | 10.1.0.0/16 |                  | 10.2.0.0/16 |
   +------+------+                  +------+------+
          |                                |
   [Bastion + JIT]                  [Bastion + JIT]
```

---

## Tarefa 1: Implantar o Azure Virtual Network Manager

### Azure CLI

```bash
# Variables
RG="rg-avnm-lab"
LOCATION="eastus"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create resource group
az group create --name $RG --location $LOCATION

# Create Azure Virtual Network Manager
az network manager create \
  --name "avnm-enterprise" \
  --resource-group $RG \
  --location $LOCATION \
  --description "Enterprise network security manager" \
  --scope-accesses "SecurityAdmin" \
  --network-manager-scopes subscriptions="/subscriptions/$SUBSCRIPTION_ID"

# Create VNets for the lab
az network vnet create \
  --resource-group $RG \
  --name vnet-prod \
  --address-prefixes 10.1.0.0/16 \
  --subnet-name workload-subnet \
  --subnet-prefixes 10.1.1.0/24 \
  --location $LOCATION \
  --tags Environment=Production

az network vnet create \
  --resource-group $RG \
  --name vnet-dev \
  --address-prefixes 10.2.0.0/16 \
  --subnet-name workload-subnet \
  --subnet-prefixes 10.2.1.0/24 \
  --location $LOCATION \
  --tags Environment=Development

# Create AzureBastionSubnet in prod VNet
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-prod \
  --name AzureBastionSubnet \
  --address-prefixes 10.1.254.0/26
```

### Azure PowerShell

```powershell
$rg = "rg-avnm-lab"
$location = "eastus"
$subscriptionId = (Get-AzContext).Subscription.Id

New-AzResourceGroup -Name $rg -Location $location

# Create AVNM
$scope = New-AzNetworkManagerScope -Subscription @("/subscriptions/$subscriptionId")

New-AzNetworkManager -Name "avnm-enterprise" -ResourceGroupName $rg `
  -Location $location -Description "Enterprise network security manager" `
  -NetworkManagerScope $scope -NetworkManagerScopeAccess @("SecurityAdmin")

# Create VNets
$prodSub = New-AzVirtualNetworkSubnetConfig -Name "workload-subnet" -AddressPrefix "10.1.1.0/24"
$bastionSub = New-AzVirtualNetworkSubnetConfig -Name "AzureBastionSubnet" -AddressPrefix "10.1.254.0/26"
$prodVnet = New-AzVirtualNetwork -Name "vnet-prod" -ResourceGroupName $rg `
  -Location $location -AddressPrefix "10.1.0.0/16" `
  -Subnet $prodSub, $bastionSub -Tag @{Environment="Production"}

$devSub = New-AzVirtualNetworkSubnetConfig -Name "workload-subnet" -AddressPrefix "10.2.1.0/24"
$devVnet = New-AzVirtualNetwork -Name "vnet-dev" -ResourceGroupName $rg `
  -Location $location -AddressPrefix "10.2.0.0/16" `
  -Subnet $devSub -Tag @{Environment="Development"}
```

---

## Tarefa 2: Criar grupos de rede com associação dinâmica

### Azure CLI

```bash
# Create network group for production VNets (dynamic membership by tag)
az network manager group create \
  --name "ng-production" \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --description "All production VNets"

# Create network group for development VNets
az network manager group create \
  --name "ng-development" \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --description "All development VNets"

# Add static members (alternatively use Azure Policy for dynamic membership)
PROD_VNET_ID=$(az network vnet show --resource-group $RG --name vnet-prod --query id -o tsv)
DEV_VNET_ID=$(az network vnet show --resource-group $RG --name vnet-dev --query id -o tsv)

az network manager group static-member create \
  --network-group-name "ng-production" \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --name "vnet-prod-member" \
  --resource-id $PROD_VNET_ID

az network manager group static-member create \
  --network-group-name "ng-development" \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --name "vnet-dev-member" \
  --resource-id $DEV_VNET_ID
```

:::tip Associação dinâmica via Azure Policy

Para implantações em produção, use associação dinâmica baseada em Azure Policy. VNets que correspondem a uma condição (como uma tag) são automaticamente adicionadas ao grupo de rede:

```json
{
  "if": {
    "allOf": [
      { "field": "type", "equals": "Microsoft.Network/virtualNetworks" },
      { "field": "tags['Environment']", "equals": "Production" }
    ]
  },
  "then": { "effect": "addToNetworkGroup" }
}
```

:::

---

## Tarefa 3: Configurar regras de administrador de segurança (negação por padrão)

:::warning Conceito crítico do exame

As regras de administrador de segurança do AVNM são avaliadas **antes** das regras de NSG. A ordem de avaliação é:

1. Regras de administrador de segurança do AVNM (AlwaysAllow > Deny > Allow)
2. Regras de NSG

Uma regra **Deny** no AVNM não pode ser substituída por uma regra Allow de NSG. Uma regra **AlwaysAllow** no AVNM ignora tanto as regras Deny de administrador de segurança quanto as regras de NSG.

:::

### Azure CLI

```bash
# Create security admin configuration
az network manager security-admin-config create \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --name "config-deny-default" \
  --description "Deny all inbound by default"

# Get network group ID for applies-to-groups
NG_PROD_ID=$(az network manager group show \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --name "ng-production" \
  --query id -o tsv)

# Create rule collection
az network manager security-admin-config rule-collection create \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --config-name "config-deny-default" \
  --name "rc-deny-inbound" \
  --applies-to-groups network-group-id=$NG_PROD_ID \
  --description "Deny all inbound management traffic"

# Rule: Deny all inbound SSH from internet
az network manager security-admin-config rule-collection rule create \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --config-name "config-deny-default" \
  --rule-collection-name "rc-deny-inbound" \
  --name "deny-ssh-inbound" \
  --access Deny \
  --direction Inbound \
  --priority 100 \
  --protocol Tcp \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges 22

# Rule: Deny all inbound RDP from internet
az network manager security-admin-config rule-collection rule create \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --config-name "config-deny-default" \
  --rule-collection-name "rc-deny-inbound" \
  --name "deny-rdp-inbound" \
  --access Deny \
  --direction Inbound \
  --priority 110 \
  --protocol Tcp \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges 3389

# Rule: AlwaysAllow Bastion traffic (cannot be blocked by other rules)
az network manager security-admin-config rule-collection rule create \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --config-name "config-deny-default" \
  --rule-collection-name "rc-deny-inbound" \
  --name "always-allow-bastion" \
  --access AlwaysAllow \
  --direction Inbound \
  --priority 50 \
  --protocol Tcp \
  --source-address-prefixes "10.1.254.0/26" \
  --destination-address-prefixes "*" \
  --destination-port-ranges 22 3389

# Commit the configuration to apply it
az network manager post-commit \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --target-locations $LOCATION \
  --configuration-ids "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Network/networkManagers/avnm-enterprise/securityAdminConfigurations/config-deny-default" \
  --commit-type "SecurityAdmin"
```

### Azure PowerShell

```powershell
# Create security admin configuration
$config = New-AzNetworkManagerSecurityAdminConfiguration `
  -NetworkManagerName "avnm-enterprise" -ResourceGroupName $rg `
  -Name "config-deny-default" -Description "Deny all inbound by default"

# Create rule collection
$ngProd = Get-AzNetworkManagerGroup -NetworkManagerName "avnm-enterprise" `
  -ResourceGroupName $rg -Name "ng-production"

$appliesToGroup = New-AzNetworkManagerSecurityGroupItem -NetworkGroupId $ngProd.Id

New-AzNetworkManagerSecurityAdminRuleCollection `
  -NetworkManagerName "avnm-enterprise" -ResourceGroupName $rg `
  -SecurityAdminConfigurationName "config-deny-default" `
  -Name "rc-deny-inbound" -AppliesToGroup $appliesToGroup

# Create deny SSH rule
New-AzNetworkManagerSecurityAdminRule `
  -NetworkManagerName "avnm-enterprise" -ResourceGroupName $rg `
  -SecurityAdminConfigurationName "config-deny-default" `
  -RuleCollectionName "rc-deny-inbound" `
  -Name "deny-ssh-inbound" -Access "Deny" -Direction "Inbound" `
  -Priority 100 -Protocol "Tcp" `
  -SourceAddressPrefix "*" -DestinationAddressPrefix "*" `
  -DestinationPortRange "22"
```

### Etapas no portal

1. Navegue até **Network Manager** e selecione sua instância do AVNM.
2. Em **Configurações**, selecione **Security admin configurations** e clique em **Criar**.
3. Adicione uma coleção de regras direcionada ao grupo de rede de produção.
4. Crie regras: Deny SSH (porta 22) e RDP (porta 3389) de entrada de qualquer origem.
5. Crie uma regra AlwaysAllow para a sub-rede do Bastion como origem para as portas 22 e 3389.
6. Implante a configuração na região de destino.

---

## Tarefa 4: Implantar o Azure Bastion (SKU Standard)

### Azure CLI

```bash
# Create public IP for Bastion
az network public-ip create \
  --resource-group $RG \
  --name pip-bastion \
  --sku Standard \
  --allocation-method Static \
  --location $LOCATION

# Deploy Azure Bastion with Standard SKU and native client support
az network bastion create \
  --resource-group $RG \
  --name bastion-prod \
  --vnet-name vnet-prod \
  --public-ip-address pip-bastion \
  --sku Standard \
  --enable-tunneling true \
  --location $LOCATION
```

:::tip Comparação de SKUs do Bastion

| Recurso | Basic | Standard |
|---------|-------|----------|
| Conexão via portal (SSH/RDP) | Sim | Sim |
| Suporte a cliente nativo (az network bastion ssh/rdp) | Não | Sim |
| Transferência de arquivos | Não | Sim |
| Link compartilhável | Não | Sim |
| Escalabilidade de hosts (2-50 instâncias) | Não | Sim |
| Conexão baseada em IP | Não | Sim |

O SKU Standard com `--enable-tunneling true` é necessário para conectividade de cliente nativo via Azure CLI.

:::

### Conectar via cliente nativo

```bash
# Connect to a Linux VM through Bastion using native SSH client
az network bastion ssh \
  --resource-group $RG \
  --name bastion-prod \
  --target-resource-id "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Compute/virtualMachines/vm-prod1" \
  --auth-type ssh-key \
  --username azureuser \
  --ssh-key ~/.ssh/id_rsa
```

### Azure PowerShell

```powershell
$pip = New-AzPublicIpAddress -Name "pip-bastion" -ResourceGroupName $rg `
  -Location $location -Sku Standard -AllocationMethod Static

New-AzBastion -Name "bastion-prod" -ResourceGroupName $rg `
  -VirtualNetworkId $prodVnet.Id -PublicIpAddressId $pip.Id `
  -Sku "Standard" -EnableTunneling $true
```

---

## Tarefa 5: Configurar acesso Just-in-Time para VMs

:::info Pré-requisitos

O acesso JIT para VMs requer **Microsoft Defender for Servers Plan 2** (ou segurança aprimorada do Defender for Cloud). A VM deve ter um NSG associado à sua sub-rede ou NIC.

:::

### Implantar uma VM de destino

```bash
# Create a VM in the production VNet
az vm create \
  --resource-group $RG \
  --name vm-prod1 \
  --image Ubuntu2404 \
  --size Standard_B2s \
  --vnet-name vnet-prod \
  --subnet workload-subnet \
  --admin-username azureuser \
  --generate-ssh-keys \
  --nsg "" \
  --public-ip-address ""

# Create and associate an NSG (required for JIT)
az network nsg create \
  --resource-group $RG \
  --name nsg-prod-workload \
  --location $LOCATION

az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-prod \
  --name workload-subnet \
  --network-security-group nsg-prod-workload
```

### Configurar política JIT via REST API

A Azure CLI não fornece um comando direto para criar políticas JIT. Use `az rest` para chamar a API do Defender for Cloud:

```bash
# Create JIT access policy
az rest --method put \
  --uri "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Security/locations/$LOCATION/jitNetworkAccessPolicies/default?api-version=2020-01-01" \
  --body '{
    "properties": {
      "virtualMachines": [
        {
          "id": "/subscriptions/'$SUBSCRIPTION_ID'/resourceGroups/'$RG'/providers/Microsoft.Compute/virtualMachines/vm-prod1",
          "ports": [
            {
              "number": 22,
              "protocol": "TCP",
              "allowedSourceAddressPrefix": "*",
              "maxRequestAccessDuration": "PT3H"
            },
            {
              "number": 3389,
              "protocol": "TCP",
              "allowedSourceAddressPrefix": "*",
              "maxRequestAccessDuration": "PT3H"
            }
          ]
        }
      ]
    },
    "kind": "Basic"
  }'
```

### Solicitar acesso JIT

```bash
# Initiate a JIT access request (opens port 22 for 1 hour)
MY_IP=$(curl -s https://ifconfig.me)

az rest --method post \
  --uri "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Security/locations/$LOCATION/jitNetworkAccessPolicies/default/initiate?api-version=2020-01-01" \
  --body '{
    "virtualMachines": [
      {
        "id": "/subscriptions/'$SUBSCRIPTION_ID'/resourceGroups/'$RG'/providers/Microsoft.Compute/virtualMachines/vm-prod1",
        "ports": [
          {
            "number": 22,
            "allowedSourceAddressPrefix": "'$MY_IP'",
            "duration": "PT1H"
          }
        ]
      }
    ],
    "justification": "Routine maintenance - applying security patches"
  }'
```

### Listar políticas JIT

```bash
# List existing JIT policies
az security jit-policy list \
  --location $LOCATION \
  --resource-group $RG
```

### Etapas no portal

1. Navegue até **Microsoft Defender for Cloud** e selecione **Workload protections**.
2. Selecione **Just-in-time VM access** no menu à esquerda.
3. Clique na VM para configurar e selecione **Enable JIT**.
4. Configure as portas (22, 3389), duração máxima de solicitação (3 horas) e IPs de origem permitidos.
5. Para solicitar acesso: selecione a VM, clique em **Request access**, especifique a justificativa e a duração.

---

## Tarefa 6: Validar o design de confiança zero (zero-trust)

### Verificar se o AVNM bloqueia acesso direto

```bash
# Deploy a test VM with a public IP to verify AVNM enforcement
az vm create \
  --resource-group $RG \
  --name vm-test \
  --image Ubuntu2404 \
  --size Standard_B1s \
  --vnet-name vnet-prod \
  --subnet workload-subnet \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address pip-vm-test

# Attempt direct SSH (should fail due to AVNM deny rule)
ssh azureuser@$(az network public-ip show --resource-group $RG --name pip-vm-test --query ipAddress -o tsv)
# Expected: Connection timed out

# Verify the AVNM rule is enforced (even if NSG allows SSH)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-prod-workload \
  --name allow-ssh-test \
  --priority 100 \
  --direction Inbound \
  --source-address-prefixes "*" \
  --destination-port-ranges 22 \
  --protocol Tcp \
  --access Allow

# Attempt SSH again (should STILL fail - AVNM deny overrides NSG allow)
ssh azureuser@$(az network public-ip show --resource-group $RG --name pip-vm-test --query ipAddress -o tsv)
# Expected: Connection timed out
```

### Verificar conectividade do Bastion

```bash
# Connect via Bastion native client (should succeed due to AlwaysAllow rule)
az network bastion ssh \
  --resource-group $RG \
  --name bastion-prod \
  --target-resource-id "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Compute/virtualMachines/vm-prod1" \
  --auth-type ssh-key \
  --username azureuser \
  --ssh-key ~/.ssh/id_rsa
```

---

## Quebra e correção

### Cenário 1: Regra de administrador de segurança do AVNM bloqueia o Bastion

**Sintoma:** O Azure Bastion não consegue se conectar às VMs mesmo após a implantação bem-sucedida do Bastion.

**Causa raiz:** A regra Deny do AVNM bloqueia todo o tráfego SSH/RDP de entrada, incluindo o tráfego da AzureBastionSubnet. Nenhuma exceção AlwaysAllow foi criada para o prefixo de origem do Bastion.

**Diagnóstico:**

```bash
# Check effective security admin rules
az network manager list-effective-security-admin-rules \
  --resource-group $RG \
  --vnet-name vnet-prod

# Verify Bastion subnet prefix
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name vnet-prod \
  --name AzureBastionSubnet \
  --query addressPrefix -o tsv
```

**Correção:** Adicione uma regra AlwaysAllow com a sub-rede do Bastion como origem:

```bash
az network manager security-admin-config rule-collection rule create \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --config-name "config-deny-default" \
  --rule-collection-name "rc-deny-inbound" \
  --name "always-allow-bastion" \
  --access AlwaysAllow \
  --direction Inbound \
  --priority 50 \
  --protocol Tcp \
  --source-address-prefixes "10.1.254.0/26" \
  --destination-address-prefixes "*" \
  --destination-port-ranges 22 3389

# Commit the updated configuration
az network manager post-commit \
  --network-manager-name "avnm-enterprise" \
  --resource-group $RG \
  --target-locations $LOCATION \
  --configuration-ids "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Network/networkManagers/avnm-enterprise/securityAdminConfigurations/config-deny-default" \
  --commit-type "SecurityAdmin"
```

---

### Cenário 2: Solicitação JIT falhando

**Sintoma:** As solicitações de acesso JIT retornam um erro ou a opção JIT não está disponível para a VM.

**Causa raiz:** O Microsoft Defender for Servers (Plan 2) não está habilitado na assinatura, ou a VM não tem um NSG associado.

**Diagnóstico:**

```bash
# Check Defender for Cloud pricing tier
az security pricing show --name VirtualMachines --query pricingTier -o tsv
# Should return "Standard" for JIT to work

# Verify NSG is associated with the VM's subnet or NIC
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name vnet-prod \
  --name workload-subnet \
  --query networkSecurityGroup.id -o tsv
```

**Correção:**

```bash
# Enable Defender for Servers (if not enabled)
az security pricing create --name VirtualMachines --tier Standard

# Ensure NSG is associated
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-prod \
  --name workload-subnet \
  --network-security-group nsg-prod-workload
```

---

### Cenário 3: Cliente nativo do Bastion não funciona

**Sintoma:** O comando `az network bastion ssh` falha com um erro sobre recursos não suportados.

**Causa raiz:** O Bastion foi implantado com SKU Basic (tunelamento/cliente nativo requer SKU Standard), ou o flag `--enable-tunneling` não foi definido.

**Diagnóstico:**

```bash
# Check Bastion SKU and tunneling status
az network bastion show \
  --resource-group $RG \
  --name bastion-prod \
  --query "{sku: sku.name, tunneling: enableTunneling}"
```

**Correção:**

```bash
# Upgrade Bastion to Standard SKU with tunneling
az network bastion update \
  --resource-group $RG \
  --name bastion-prod \
  --sku Standard \
  --enable-tunneling true
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-48-q1",
    question: "How do AVNM security admin rules interact with NSG rules?",
    options: [
      "NSG rules are evaluated first, then AVNM rules override conflicts",
      "AVNM security admin rules are evaluated BEFORE NSG rules and take precedence ✅",
      "AVNM rules and NSG rules are merged and the lowest priority number wins",
      "AVNM rules only apply when no NSG is associated with the subnet"
    ],
    correctIndex: 1,
    explanation: "AVNM security admin rules are evaluated before NSG rules. A Deny rule in AVNM cannot be overridden by an Allow rule in an NSG. This allows central security teams to enforce organization-wide policies that subnet owners cannot circumvent."
  },
  {
    id: "az700-48-q2",
    question: "What is required for Just-in-Time VM access to function?",
    options: [
      "Azure Firewall Premium and a public IP on the VM",
      "Microsoft Defender for Servers (Plan 2) and an NSG associated with the VM ✅",
      "Azure Bastion Standard SKU and a network security perimeter",
      "Azure Virtual Network Manager and a security admin configuration"
    ],
    correctIndex: 1,
    explanation: "JIT VM access requires Microsoft Defender for Servers Plan 2 (part of Defender for Cloud enhanced security). The VM must also have an NSG associated with its subnet or NIC, because JIT works by dynamically adding and removing NSG rules."
  },
  {
    id: "az700-48-q3",
    question: "Which Azure Bastion SKU supports native client connectivity (az network bastion ssh)?",
    options: [
      "Basic SKU",
      "Standard SKU with tunneling enabled ✅",
      "Developer SKU",
      "Any SKU with a public IP"
    ],
    correctIndex: 1,
    explanation: "Native client support (allowing az network bastion ssh and az network bastion rdp commands) requires the Standard SKU with the enable-tunneling feature turned on. The Basic SKU only supports browser-based connections through the Azure portal."
  },
  {
    id: "az700-48-q4",
    question: "What are the three access actions available in AVNM security admin rules?",
    options: [
      "Allow, Deny, Drop",
      "Permit, Block, Override",
      "Allow, Deny, AlwaysAllow ✅",
      "Accept, Reject, Force"
    ],
    correctIndex: 2,
    explanation: "AVNM security admin rules support three actions: Allow (permits traffic but can be overridden by NSG deny), Deny (blocks traffic and cannot be overridden by NSG allow), and AlwaysAllow (permits traffic bypassing both admin deny rules and NSG rules)."
  },
  {
    id: "az700-48-q5",
    question: "You created an AVNM security admin rule that denies all inbound traffic. Azure Bastion can no longer connect to VMs. What should you do?",
    options: [
      "Add an NSG allow rule for the Bastion subnet - it will override the AVNM deny",
      "Remove the AVNM deny rule entirely",
      "Add an AlwaysAllow rule with a lower priority number for traffic from the AzureBastionSubnet ✅",
      "Redeploy Bastion in a different VNet not managed by AVNM"
    ],
    correctIndex: 2,
    explanation: "An AlwaysAllow rule with a lower priority number (evaluated first) will permit Bastion traffic regardless of other deny rules. NSG allow rules cannot override AVNM deny rules. The AlwaysAllow action is specifically designed for this use case -- exempting critical infrastructure traffic."
  },
  {
    id: "az700-48-q6",
    question: "How can you define dynamic membership for an AVNM network group?",
    options: [
      "Using Azure Policy with conditional expressions that match VNet properties like tags ✅",
      "Using NSG flow logs to automatically detect VNet communication patterns",
      "Using Azure Monitor alerts to add VNets when traffic thresholds are met",
      "Using ARM template deployments with linked resource IDs"
    ],
    correctIndex: 0,
    explanation: "AVNM supports dynamic membership through Azure Policy. You define a policy condition (such as matching a specific tag like Environment=Production) and VNets that match the condition are automatically added to the network group. This eliminates manual membership management as new VNets are deployed."
  }
]} />

---

## Limpeza

```bash
az group delete --name $RG --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-avnm-lab" -Force -AsJob
```

---

:::danger Aviso de custo

Este laboratório implanta o Azure Bastion (SKU Standard) que custa aproximadamente **$0,25/hora** além das VMs. Exclua o grupo de recursos imediatamente após concluir o laboratório. Além disso, desabilite o Defender for Servers se você o habilitou apenas para este laboratório para evitar cobranças contínuas (~$15/servidor/mês).

:::
