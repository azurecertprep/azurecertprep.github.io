---
sidebar_position: 33
title: "Desafio 33: Azure Bastion e Acesso JIT a VMs"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 33: Azure Bastion e Acesso JIT a VMs

## Habilidades do exame cobertas

- Implantar Azure Bastion para acesso seguro RDP/SSH sem IPs públicos
- Configurar acesso Just-In-Time (JIT) a VMs no Defender for Cloud
- Implementar padrões de estação de trabalho com acesso privilegiado para VMs do Azure
- Configurar links compartilháveis do Bastion e gravação de sessão
- Integrar Bastion com Entra ID Conditional Access e PIM

## Cenário

A Contoso Ltd recebeu achados de auditoria indicando que 47 VMs de produção possuem endereços IP públicos com portas RDP (3389) e SSH (22) abertas para a internet. A equipe de segurança deve eliminar toda exposição direta à internet mantendo o acesso operacional para administradores. Você deve implantar Azure Bastion e JIT VM Access como o plano de gerenciamento exclusivo para conectividade de VMs.

---

## Pré-requisitos

- Assinatura do Azure com acesso de Contributor
- Microsoft Defender for Servers Plan 2 habilitado (para JIT)
- VMs do Azure implantadas sem IPs públicos (ou a serem remediadas)
- Azure CLI instalado
- Role de Network Contributor para implantação do Bastion

---

## Tarefa 1: Implantar Azure Bastion (SKU Standard)

Implante o Azure Bastion com recursos do tier Standard incluindo suporte a cliente nativo, links compartilháveis e gravação de sessão.

```bash
# Create resource group
az group create --name "rg-contoso-bastion" --location "eastus"

# Create VNet with dedicated AzureBastionSubnet
az network vnet create \
    --resource-group "rg-contoso-bastion" \
    --name "vnet-contoso-hub" \
    --address-prefix "10.0.0.0/16" \
    --subnet-name "AzureBastionSubnet" \
    --subnet-prefix "10.0.1.0/24"

# Create additional subnet for VMs
az network vnet subnet create \
    --resource-group "rg-contoso-bastion" \
    --vnet-name "vnet-contoso-hub" \
    --name "subnet-servers" \
    --address-prefix "10.0.2.0/24"

# Create public IP for Bastion
az network public-ip create \
    --resource-group "rg-contoso-bastion" \
    --name "pip-bastion-hub" \
    --sku "Standard" \
    --allocation-method "Static" \
    --location "eastus"

# Deploy Azure Bastion (Standard SKU)
az network bastion create \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --public-ip-address "pip-bastion-hub" \
    --vnet-name "vnet-contoso-hub" \
    --sku "Standard" \
    --enable-tunneling true \
    --enable-ip-connect true \
    --scale-units 2 \
    --location "eastus"

# Enable shareable links and session recording
az network bastion update \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --enable-shareable-link true \
    --enable-session-recording true
```

---

## Tarefa 2: Criar VMs de teste sem IPs públicos

Implante VMs que só podem ser acessadas através do Bastion.

```bash
# Create a Linux VM without public IP
az vm create \
    --resource-group "rg-contoso-bastion" \
    --name "vm-linux-web01" \
    --image "Canonical:ubuntu-24_04-lts:server:latest" \
    --size "Standard_B2ms" \
    --vnet-name "vnet-contoso-hub" \
    --subnet "subnet-servers" \
    --public-ip-address "" \
    --nsg "" \
    --admin-username "azadmin" \
    --generate-ssh-keys

# Create a Windows VM without public IP
az vm create \
    --resource-group "rg-contoso-bastion" \
    --name "vm-win-db01" \
    --image "MicrosoftWindowsServer:WindowsServer:2022-datacenter-g2:latest" \
    --size "Standard_B2ms" \
    --vnet-name "vnet-contoso-hub" \
    --subnet "subnet-servers" \
    --public-ip-address "" \
    --nsg "" \
    --admin-username "azadmin" \
    --admin-password "C0nt0s0!SecureP@ss2024"

# Create NSG that blocks all direct RDP/SSH from internet
az network nsg create \
    --resource-group "rg-contoso-bastion" \
    --name "nsg-servers-deny-direct"

az network nsg rule create \
    --resource-group "rg-contoso-bastion" \
    --nsg-name "nsg-servers-deny-direct" \
    --name "DenyRDP-Internet" \
    --priority 100 \
    --direction "Inbound" \
    --access "Deny" \
    --source-address-prefixes "Internet" \
    --destination-port-ranges 3389 \
    --protocol "Tcp"

az network nsg rule create \
    --resource-group "rg-contoso-bastion" \
    --nsg-name "nsg-servers-deny-direct" \
    --name "DenySSH-Internet" \
    --priority 110 \
    --direction "Inbound" \
    --access "Deny" \
    --source-address-prefixes "Internet" \
    --destination-port-ranges 22 \
    --protocol "Tcp"

# Associate NSG with servers subnet
az network vnet subnet update \
    --resource-group "rg-contoso-bastion" \
    --vnet-name "vnet-contoso-hub" \
    --name "subnet-servers" \
    --network-security-group "nsg-servers-deny-direct"
```

---

## Tarefa 3: Conectar a VMs usando cliente nativo do Bastion

Use o recurso de tunelamento de cliente nativo da Azure CLI para conexões SSH e RDP.

```bash
# SSH into Linux VM via Bastion native client tunnel
az network bastion ssh \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --target-resource-id "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-linux-web01" \
    --auth-type "ssh-key" \
    --username "azadmin" \
    --ssh-key "~/.ssh/id_rsa"

# RDP into Windows VM via Bastion tunnel
az network bastion rdp \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --target-resource-id "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-win-db01"

# Create a tunnel for custom port forwarding
az network bastion tunnel \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --target-resource-id "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-linux-web01" \
    --resource-port 22 \
    --port 2222
# Then connect: ssh azadmin@127.0.0.1 -p 2222

# Connect using Entra ID authentication (for VMs with AAD login extension)
az network bastion ssh \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --target-resource-id "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-linux-web01" \
    --auth-type "AAD"
```

---

## Tarefa 4: Configurar acesso Just-In-Time a VMs

Habilite o acesso JIT para fornecer conectividade baseada em aprovação e com tempo limitado para VMs.

```bash
# Enable JIT VM access policy via Defender for Cloud
az security jit-policy create \
    --resource-group "rg-contoso-bastion" \
    --name "default" \
    --location "eastus" \
    --virtual-machines '[{
        "id": "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-linux-web01",
        "ports": [
            {"number": 22, "protocol": "TCP", "allowedSourceAddressPrefix": "*", "maxRequestAccessDuration": "PT3H"},
            {"number": 3389, "protocol": "TCP", "allowedSourceAddressPrefix": "*", "maxRequestAccessDuration": "PT3H"}
        ]
    }, {
        "id": "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-win-db01",
        "ports": [
            {"number": 3389, "protocol": "TCP", "allowedSourceAddressPrefix": "*", "maxRequestAccessDuration": "PT1H"},
            {"number": 1433, "protocol": "TCP", "allowedSourceAddressPrefix": "10.0.0.0/8", "maxRequestAccessDuration": "PT2H"}
        ]
    }]'

# Request JIT access for a specific VM
az security jit-policy initiate \
    --resource-group "rg-contoso-bastion" \
    --name "default" \
    --location "eastus" \
    --virtual-machines '[{
        "id": "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-linux-web01",
        "ports": [{"number": 22, "duration": "PT1H", "allowedSourceAddressPrefix": "203.0.113.50"}]
    }]'

# List active JIT requests
az security jit-policy list \
    --resource-group "rg-contoso-bastion" \
    --query "[].{name: name, vms: virtualMachines[].id}" \
    --output table
```

---

## Tarefa 5: Integrar com Entra ID e PIM para acesso elevado

Configure a autenticação Entra ID para VMs e exija ativação PIM para acesso administrativo.

```bash
# Install AAD Login extension on Linux VM
az vm extension set \
    --resource-group "rg-contoso-bastion" \
    --vm-name "vm-linux-web01" \
    --name "AADSSHLoginForLinux" \
    --publisher "Microsoft.Azure.ActiveDirectory"

# Install AAD Login extension on Windows VM
az vm extension set \
    --resource-group "rg-contoso-bastion" \
    --vm-name "vm-win-db01" \
    --name "AADLoginForWindows" \
    --publisher "Microsoft.Azure.ActiveDirectory"

# Assign "Virtual Machine Administrator Login" role (eligible via PIM)
az role assignment create \
    --assignee "admin-group-object-id" \
    --role "Virtual Machine Administrator Login" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion"

# Assign "Virtual Machine User Login" for standard users
az role assignment create \
    --assignee "standard-users-group-id" \
    --role "Virtual Machine User Login" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion"
```

Configure o PIM para ativação de role Just-in-Time:

1. Navegue até **Entra ID** → **Privileged Identity Management** → **Azure resources**
2. Selecione a assinatura → **Roles** → "Virtual Machine Administrator Login"
3. Clique em **Settings** → Configure:
   - **Activation maximum duration**: 2 horas
   - **Require justification on activation**: Sim
   - **Require approval**: Sim (defina o grupo aprovador)
   - **Require MFA on activation**: Sim
4. Em **Assignment**:
   - **Allow permanent eligible assignment**: Não
   - **Expire eligible assignments after**: 90 dias

---

## Tarefa 6: Remover IPs públicos e impor acesso exclusivo via Bastion

Remedie VMs existentes removendo IPs públicos e impondo o Bastion como único caminho de acesso.

```bash
# Find all VMs with public IPs in the subscription
az vm list-ip-addresses \
    --query "[?virtualMachine.network.publicIpAddresses[0].id != null].{vm: virtualMachine.name, rg: virtualMachine.resourceGroup, publicIp: virtualMachine.network.publicIpAddresses[0].ipAddress}" \
    --output table

# Remove public IP from a VM (dissociate then delete)
# Get NIC details
NIC_ID=$(az vm show --resource-group "rg-contoso-bastion" --name "vm-linux-web01" --query "networkProfile.networkInterfaces[0].id" -o tsv)

# Update NIC to remove public IP
az network nic ip-config update \
    --resource-group "rg-contoso-bastion" \
    --nic-name "vm-linux-web01VMNic" \
    --name "ipconfigvm-linux-web01" \
    --remove publicIpAddress

# Assign Azure Policy to deny public IPs on VMs
az policy assignment create \
    --name "deny-vm-public-ip" \
    --display-name "Deny Public IP on VMs" \
    --policy "/providers/Microsoft.Authorization/policyDefinitions/83a86a26-fd1f-447c-b59d-e51f44264114" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion" \
    --enforcement-mode "Default"

# Assign Azure Policy to require NSG on subnets
az policy assignment create \
    --name "require-nsg-subnet" \
    --display-name "Require NSG on Subnets" \
    --policy "/providers/Microsoft.Authorization/policyDefinitions/e71308d3-144b-4262-b144-efdc3cc90517" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion" \
    --enforcement-mode "Default"
```

---

## Quebre & Conserte

### Cenário 1: Conexão do Bastion expira — "Unable to connect to target VM"

Administradores reportam que conexões do Bastion para VMs em uma VNet emparelhada falham com erros de timeout. VMs na VNet local do Bastion funcionam normalmente.

<details>
<summary>Mostrar solução</summary>

```bash
# 1. Verify VNet peering is configured correctly
az network vnet peering list \
    --resource-group "rg-contoso-bastion" \
    --vnet-name "vnet-contoso-hub" \
    --output table

# 2. Ensure peering allows traffic from Bastion subnet
az network vnet peering show \
    --resource-group "rg-contoso-bastion" \
    --vnet-name "vnet-contoso-hub" \
    --name "hub-to-spoke" \
    --query "{allowForwarded: allowForwardedTraffic, allowGateway: allowGatewayTransit, useRemoteGateways: useRemoteGateways, peeringState: peeringState}"

# 3. Fix: Enable IP-based connection (required for cross-VNet)
az network bastion update \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --enable-ip-connect true

# 4. Verify NSG on target VM allows Bastion traffic
# Bastion communicates from its subnet to the VM on ports 22/3389
# Check target VM's NSG allows inbound from AzureBastionSubnet
az network nsg rule create \
    --resource-group "rg-contoso-spoke" \
    --nsg-name "nsg-spoke-servers" \
    --name "AllowBastionInbound" \
    --priority 200 \
    --direction "Inbound" \
    --access "Allow" \
    --source-address-prefixes "10.0.1.0/24" \
    --destination-port-ranges "22" "3389" \
    --protocol "Tcp"

# 5. Verify peering state is "Connected" on both sides
az network vnet peering show \
    --resource-group "rg-contoso-spoke" \
    --vnet-name "vnet-contoso-spoke" \
    --name "spoke-to-hub" \
    --query "peeringState"
```

</details>

### Cenário 2: Solicitação de acesso JIT aprovada mas VM permanece inacessível

Uma solicitação JIT foi aprovada para a porta 22 em uma VM Linux, mas o administrador ainda não consegue fazer SSH na VM através do Bastion.

<details>
<summary>Mostrar solução</summary>

```bash
# 1. Verify JIT request was properly activated
az security jit-policy list \
    --resource-group "rg-contoso-bastion" \
    --query "[].virtualMachines[].ports[].{number: number, status: status, sourceAddressPrefix: allowedSourceAddressPrefix}"

# 2. Check if the NSG rule was actually created by JIT
az network nsg rule list \
    --resource-group "rg-contoso-bastion" \
    --nsg-name "nsg-servers-deny-direct" \
    --query "[?contains(name, 'JIT')]" \
    --output table

# 3. Common issue: JIT creates the rule on the VM's NSG,
# but there's also a subnet-level NSG blocking traffic
# Check subnet NSG
az network vnet subnet show \
    --resource-group "rg-contoso-bastion" \
    --vnet-name "vnet-contoso-hub" \
    --name "subnet-servers" \
    --query "networkSecurityGroup.id"

# 4. The subnet NSG has a DenyAll rule at higher priority
# JIT only modifies the VM-level NSG, not the subnet NSG
# Fix: Ensure subnet NSG allows Bastion traffic
az network nsg rule create \
    --resource-group "rg-contoso-bastion" \
    --nsg-name "nsg-servers-deny-direct" \
    --name "AllowBastionSSH" \
    --priority 150 \
    --direction "Inbound" \
    --access "Allow" \
    --source-address-prefixes "10.0.1.0/24" \
    --destination-port-ranges 22 \
    --protocol "Tcp"

# 5. The DenyRDP/SSH rule at priority 100 blocks everything
# including Bastion. Adjust priority so Bastion allow comes first
az network nsg rule update \
    --resource-group "rg-contoso-bastion" \
    --nsg-name "nsg-servers-deny-direct" \
    --name "DenySSH-Internet" \
    --priority 200
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é o SKU mínimo do Bastion necessário para usar tunelamento de cliente nativo (az network bastion ssh/rdp)?",
    options: [
      "SKU Basic",
      "SKU Standard com tunelamento habilitado",
      "Apenas SKU Premium",
      "Qualquer SKU suporta cliente nativo"
    ],
    correctIndex: 1,
    explanation: "O tunelamento de cliente nativo (usando comandos az network bastion ssh/rdp) requer o SKU Standard com o recurso de tunelamento explicitamente habilitado. O SKU Basic suporta apenas conexões baseadas em navegador através do portal do Azure."
  },
  {
    question: "Como o JIT VM Access funciona com o Azure Bastion?",
    options: [
      "JIT substitui o Bastion — você não precisa de ambos",
      "JIT cria regras de NSG com tempo limitado que permitem ao Bastion alcançar a VM em portas específicas, adicionando uma camada de controle de acesso baseada em tempo",
      "JIT fornece um caminho de conexão separado que ignora o Bastion",
      "JIT funciona apenas com endereços IP públicos, não com Bastion"
    ],
    correctIndex: 1,
    explanation: "JIT e Bastion são complementares: o Bastion elimina IPs públicos e fornece o proxy de conexão segura, enquanto o JIT adiciona regras de NSG com tempo limitado que controlam quando as portas estão abertas — mesmo para o Bastion. Juntos, eles fornecem tanto isolamento de rede quanto controle de acesso temporal."
  },
  {
    question: "O que acontece quando a atribuição de role PIM de um administrador para 'Virtual Machine Administrator Login' expira durante uma sessão ativa do Bastion?",
    options: [
      "A sessão é terminada imediatamente",
      "A sessão continua, mas novas sessões não podem ser estabelecidas até a reativação",
      "PIM não tem efeito em sessões ativas do Bastion",
      "A VM reinicia automaticamente para impor a política"
    ],
    correctIndex: 1,
    explanation: "Sessões existentes do Bastion continuam até serem desconectadas (as sessões já estão autenticadas). No entanto, novas tentativas de conexão falharão porque a atribuição de role expirou e o usuário não possui mais a permissão RBAC necessária para conectar."
  },
  {
    question: "Qual Azure Policy deve ser imposta para impedir que administradores criem VMs com endereços IP públicos?",
    options: [
      "Negar todas as modificações de network security group",
      "Interfaces de rede não devem ter IPs públicos (negar associação de IP público em NICs)",
      "Todas as subnets devem ter uma tabela de rotas",
      "VMs devem ser implantadas em availability zones"
    ],
    correctIndex: 1,
    explanation: "A política 'Network interfaces should not have public IPs' (ou 'Not allowed resource types: Microsoft.Network/publicIPAddresses') impede que VMs sejam criadas com IPs públicos, impondo o Bastion como o único caminho de acesso."
  }
]} />

## Limpeza

```bash
# Delete all resources
az group delete --name "rg-contoso-bastion" --yes --no-wait
```
