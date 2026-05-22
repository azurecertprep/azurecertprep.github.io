---
sidebar_position: 2
title: "Challenge 02: Subnet Strategy for Azure Services"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 02: Estratégia de sub-rede para serviços do Azure

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,10** (VNets, sub-redes e NSGs são gratuitos; Bastion gera custo por hora se implantado) | **Peso no exame: 25-30%**

:::

## Cenário

A equipe de rede da Contoso está projetando uma VNet hub que hospedará vários serviços do Azure. Cada serviço impõe requisitos específicos de sub-rede em relação ao tamanho mínimo, convenções de nomenclatura e delegação. Sua tarefa é planejar e configurar sub-redes corretamente, aplicar delegação quando necessário e entender quais sub-redes devem ser dedicadas versus compartilhadas.

## Objetivos

Após completar este desafio você será capaz de:

- Planejar e configurar sub-redes para Azure Virtual Network Gateways, Azure Firewall, Azure Bastion, Application Gateway e Private Endpoints
- Configurar delegação de sub-rede para integração VNet do App Service, Azure Container Instances e API Management
- Distinguir entre requisitos de sub-redes dedicadas e compartilhadas
- Aplicar regras de NSG exigidas pelo Azure Bastion

## Pré-requisitos

- Assinatura do Azure com acesso de Contributor
- Azure CLI 2.60+ instalado
- Familiaridade com notação CIDR e planejamento de endereços IP

---

## Tarefa 1: Criar a VNet hub com sub-redes específicas para serviços

Os serviços do Azure possuem requisitos rigorosos para nomenclatura de sub-rede, comprimento mínimo de prefixo e se outros recursos podem coexistir na mesma sub-rede. Crie uma VNet hub com espaço de endereçamento `10.0.0.0/16` e as seguintes sub-redes:

| Nome da sub-rede | Prefixo | Tamanho mínimo | Nome obrigatório | Dedicada |
|---|---|---|---|---|
| GatewaySubnet | 10.0.0.0/27 | /27 | Sim (exato) | Sim |
| AzureFirewallSubnet | 10.0.1.0/26 | /26 | Sim (exato) | Sim |
| AzureFirewallManagementSubnet | 10.0.2.0/26 | /26 | Sim (exato) | Sim |
| AzureBastionSubnet | 10.0.3.0/26 | /26 | Sim (exato) | Sim |
| AppGatewaySubnet | 10.0.4.0/24 | /24 recomendado | Não | Recomendada |
| PrivateEndpointSubnet | 10.0.5.0/24 | Sem mínimo | Não | Não |

```bash
# Set variables
RG="rg-contoso-hub"
LOCATION="eastus2"
VNET_NAME="vnet-hub-eastus2"

# Create resource group
az group create --name $RG --location $LOCATION

# Create the hub VNet
az network vnet create \
  --resource-group $RG \
  --name $VNET_NAME \
  --location $LOCATION \
  --address-prefixes 10.0.0.0/16

# GatewaySubnet — exact name required, no NSG allowed, minimum /27
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name GatewaySubnet \
  --address-prefixes 10.0.0.0/27

# AzureFirewallSubnet — exact name required, minimum /26
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name AzureFirewallSubnet \
  --address-prefixes 10.0.1.0/26

# AzureFirewallManagementSubnet — required for forced tunneling scenarios
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name AzureFirewallManagementSubnet \
  --address-prefixes 10.0.2.0/26

# AzureBastionSubnet — exact name required, minimum /26, requires specific NSG
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name AzureBastionSubnet \
  --address-prefixes 10.0.3.0/26

# Application Gateway subnet — dedicated recommended, no delegation needed
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name AppGatewaySubnet \
  --address-prefixes 10.0.4.0/24

# Private Endpoints subnet — can share with other resources, NSG supported
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name PrivateEndpointSubnet \
  --address-prefixes 10.0.5.0/24
```

:::tip Fatos importantes para o exame

- **GatewaySubnet** deve usar exatamente esse nome. Você não pode associar um NSG a ela. Mínimo /27 (recomendado /27 para coexistência com ExpressRoute).
- **AzureFirewallSubnet** deve usar exatamente esse nome. Mínimo /26 para suportar escalabilidade.
- **AzureFirewallManagementSubnet** é necessária apenas ao usar tunelamento forçado. Também deve ter no mínimo /26.
- **AzureBastionSubnet** deve usar exatamente esse nome. Mínimo /26. NSG é suportado, mas requer regras específicas.
- **Application Gateway** não requer um nome específico, mas a Microsoft recomenda uma sub-rede dedicada sem outros recursos.
- **Private Endpoints** podem coexistir com outros recursos na mesma sub-rede. O suporte a NSG foi adicionado em 2023.

:::

---

## Tarefa 2: Configurar delegação de sub-rede

A delegação de sub-rede concede a um serviço designado do Azure permissão para injetar recursos específicos do serviço na sub-rede. Uma sub-rede pode ser delegada a apenas um serviço por vez.

Crie três sub-redes adicionais com delegação:

```bash
# Subnet delegated to App Service for VNet integration
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name AppServiceIntegrationSubnet \
  --address-prefixes 10.0.10.0/24 \
  --delegations Microsoft.Web/serverFarms

# Subnet delegated to Azure Container Instances
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name AciSubnet \
  --address-prefixes 10.0.11.0/24 \
  --delegations Microsoft.ContainerInstance/containerGroups

# Subnet delegated to API Management (internal mode)
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name ApimSubnet \
  --address-prefixes 10.0.12.0/24 \
  --delegations Microsoft.ApiManagement/service
```

Você também pode adicionar delegação a uma sub-rede existente usando `update`:

```bash
# Add delegation to an existing subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name ApimSubnet \
  --delegations Microsoft.ApiManagement/service
```

Para listar os serviços de delegação disponíveis para uma região:

```bash
az network vnet subnet list-available-delegations \
  --location $LOCATION \
  --query "[].serviceName" \
  --output tsv
```

:::tip Fatos importantes para o exame

- Uma sub-rede só pode ser delegada a **um** serviço por vez.
- A delegação não impede que você coloque manualmente outros recursos na sub-rede, mas o serviço delegado pode aplicar políticas de rede que restringem o que mais pode coexistir.
- `Microsoft.Web/serverFarms` é o valor de delegação para integração VNet do App Service (não `Microsoft.Web/sites`).
- Remover a delegação requer a remoção de todos os recursos delegados da sub-rede primeiro.

:::

---

## Tarefa 3: Sub-redes compartilhadas versus dedicadas

Entender quais sub-redes devem ser dedicadas é fundamental para cenários de exame:

| Sub-rede | Deve ser dedicada? | Motivo |
|---|---|---|
| GatewaySubnet | Sim | O Azure impõe isso; nenhum outro tipo de recurso é permitido |
| AzureFirewallSubnet | Sim | Azure Firewall requer uso exclusivo |
| AzureFirewallManagementSubnet | Sim | Apenas tráfego de gerenciamento |
| AzureBastionSubnet | Sim | Azure Bastion requer uso exclusivo |
| Application Gateway | Recomendada | Vários Application Gateways podem compartilhar, mas nenhum outro tipo de recurso |
| Private Endpoints | Não | Podem compartilhar com VMs, NICs e outros recursos |
| Sub-redes delegadas | Depende | O serviço delegado determina o que mais pode coexistir |

Verifique o que está implantado em cada sub-rede:

```bash
# List all resources in a subnet by checking IP configurations
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name PrivateEndpointSubnet \
  --query "{addressPrefix: addressPrefix, delegations: delegations[].serviceName, ipConfigurations: ipConfigurations[].id}" \
  --output json
```

---

## Tarefa 4: Configurar NSG para AzureBastionSubnet

O Azure Bastion requer um conjunto específico de regras de NSG. Se você aplicar um NSG à AzureBastionSubnet, deve incluir todas as regras a seguir. Omitir qualquer regra impedirá o Bastion de receber atualizações da plataforma ou bloqueará a conectividade com VMs.

### Criar o NSG

```bash
NSG_NAME="nsg-bastion"

az network nsg create \
  --resource-group $RG \
  --name $NSG_NAME \
  --location $LOCATION
```

### Regras de entrada

```bash
# Allow HTTPS from Internet (user browser connections)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name $NSG_NAME \
  --name AllowHttpsInbound \
  --priority 120 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 443

# Allow GatewayManager (control plane communication)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name $NSG_NAME \
  --name AllowGatewayManagerInbound \
  --priority 130 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes GatewayManager \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 443

# Allow Azure Load Balancer health probes
az network nsg rule create \
  --resource-group $RG \
  --nsg-name $NSG_NAME \
  --name AllowAzureLoadBalancerInbound \
  --priority 140 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes AzureLoadBalancer \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 443

# Allow Bastion data-plane communication between hosts
az network nsg rule create \
  --resource-group $RG \
  --nsg-name $NSG_NAME \
  --name AllowBastionHostCommunicationInbound \
  --priority 150 \
  --direction Inbound \
  --access Allow \
  --protocol '*' \
  --source-address-prefixes VirtualNetwork \
  --source-port-ranges '*' \
  --destination-address-prefixes VirtualNetwork \
  --destination-port-ranges 8080 5701
```

### Regras de saída

```bash
# Allow SSH and RDP to target VMs in VNet
az network nsg rule create \
  --resource-group $RG \
  --nsg-name $NSG_NAME \
  --name AllowSshRdpOutbound \
  --priority 100 \
  --direction Outbound \
  --access Allow \
  --protocol '*' \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes VirtualNetwork \
  --destination-port-ranges 22 3389

# Allow outbound to Azure Cloud (diagnostics and metering)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name $NSG_NAME \
  --name AllowAzureCloudOutbound \
  --priority 110 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes AzureCloud \
  --destination-port-ranges 443

# Allow Bastion data-plane communication outbound
az network nsg rule create \
  --resource-group $RG \
  --nsg-name $NSG_NAME \
  --name AllowBastionCommunicationOutbound \
  --priority 120 \
  --direction Outbound \
  --access Allow \
  --protocol '*' \
  --source-address-prefixes VirtualNetwork \
  --source-port-ranges '*' \
  --destination-address-prefixes VirtualNetwork \
  --destination-port-ranges 8080 5701

# Allow HTTP outbound to Internet (certificate validation)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name $NSG_NAME \
  --name AllowHttpOutbound \
  --priority 130 \
  --direction Outbound \
  --access Allow \
  --protocol '*' \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes Internet \
  --destination-port-ranges 80
```

### Associar o NSG à AzureBastionSubnet

```bash
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name AzureBastionSubnet \
  --network-security-group $NSG_NAME
```

:::warning Regras obrigatórias

Todas as oito regras listadas acima são obrigatórias quando você aplica um NSG à AzureBastionSubnet. Omitir qualquer regra impedirá o Bastion de receber atualizações da plataforma ou bloqueará a conectividade com VMs. Em caso de dúvida, não associe um NSG à sub-rede do Bastion.

:::

---

## Tarefa 5: Verificar status de delegação e testar restrições

### Verificar delegação

```bash
# Show delegation on the App Service integration subnet
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name AppServiceIntegrationSubnet \
  --query "delegations[].{service:serviceName, actions:actions}" \
  --output table

# Show all subnets and their delegations
az network vnet subnet list \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --query "[].{name:name, prefix:addressPrefix, delegation:delegations[0].serviceName}" \
  --output table
```

### Remover delegação (requer remoção dos recursos delegados primeiro)

```bash
# Clear delegation by passing empty value
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name AciSubnet \
  --delegations ""
```

---

## Cenários de quebra e correção

Estes exercícios demonstram erros comuns e proteções da plataforma.

### Cenário 1: Tentar associar um NSG à GatewaySubnet

A GatewaySubnet não suporta associação de NSG. Tentar isso resultará em um erro:

```bash
# This will fail
az network nsg create \
  --resource-group $RG \
  --name nsg-gateway-test \
  --location $LOCATION

az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name GatewaySubnet \
  --network-security-group nsg-gateway-test
```

**Resultado esperado:** A operação será rejeitada com um erro indicando que o NSG não pode ser associado à GatewaySubnet.

### Cenário 2: Implantar um recurso incompatível em uma sub-rede delegada

Quando uma sub-rede é delegada, o serviço pode impor restrições sobre quais outros tipos de recurso podem ser implantados:

```bash
# Attempt to create a VM NIC in the ACI-delegated subnet
az network nic create \
  --resource-group $RG \
  --name nic-test-aci \
  --vnet-name $VNET_NAME \
  --subnet AciSubnet
```

**Resultado esperado:** Dependendo da delegação, você pode receber um erro ou a operação pode ter sucesso, mas com avisos. A delegação `Microsoft.ContainerInstance/containerGroups` restringe a sub-rede apenas a recursos de grupos de contêiner.

### Cenário 3: Criar AzureBastionSubnet com tamanho insuficiente

O Azure Bastion requer um prefixo mínimo /26. Tentar um prefixo menor falhará:

```bash
# This will fail — /28 is too small for AzureBastionSubnet
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name AzureBastionSubnet \
  --address-prefixes 10.0.100.0/28
```

**Resultado esperado:** A operação falhará com um erro de validação informando que o tamanho mínimo de sub-rede para Azure Bastion é /26.

---

## Limpeza

```bash
az group delete --name $RG --yes --no-wait
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-02-q1",
    question: "What is the minimum subnet prefix length for AzureBastionSubnet?",
    options: ["/28", "/27", "/26", "/24"],
    correctIndex: 2,
    explanation: "Azure Bastion requires a minimum /26 subnet (64 addresses). A /28 or /27 will be rejected during creation."
  },
  {
    id: "az700-02-q2",
    question: "Which of the following subnets CANNOT have an NSG associated with it?",
    options: ["AzureBastionSubnet", "GatewaySubnet", "AzureFirewallSubnet", "PrivateEndpointSubnet"],
    correctIndex: 1,
    explanation: "GatewaySubnet does not support NSG association. AzureBastionSubnet supports NSGs but requires specific rules. AzureFirewallSubnet and Private Endpoint subnets also support NSGs."
  },
  {
    id: "az700-02-q3",
    question: "What is the correct delegation value for App Service VNet integration?",
    options: ["Microsoft.Web/sites", "Microsoft.Web/serverFarms", "Microsoft.AppService/environments", "Microsoft.Web/hostingEnvironments"],
    correctIndex: 1,
    explanation: "App Service VNet integration requires delegation to Microsoft.Web/serverFarms, not Microsoft.Web/sites. The serverFarms resource provider represents the App Service Plan that hosts the app."
  },
  {
    id: "az700-02-q4",
    question: "A subnet delegated to Microsoft.ContainerInstance/containerGroups already exists. You need to also delegate it to Microsoft.Web/serverFarms. What should you do?",
    options: [
      "Add the second delegation using az network vnet subnet update --delegations",
      "Remove the existing delegation first, then add the new one",
      "This is not possible — a subnet can only be delegated to one service",
      "Create a new delegation using az network vnet subnet create --delegations"
    ],
    correctIndex: 2,
    explanation: "A subnet can only be delegated to a single service at a time. To use a different delegation, you must remove all resources from the current delegated service, remove the delegation, and then apply the new one. Alternatively, create a separate subnet for the second service."
  },
  {
    id: "az700-02-q5",
    question: "Which outbound NSG rule is required on the AzureBastionSubnet for Bastion to connect to target VMs?",
    options: [
      "Allow TCP 443 to VirtualNetwork",
      "Allow TCP/UDP 22 and 3389 to VirtualNetwork",
      "Allow TCP 443 to AzureCloud",
      "Allow TCP 80 to Internet"
    ],
    correctIndex: 1,
    explanation: "Azure Bastion connects to target VMs over SSH (port 22) and RDP (port 3389) within the VirtualNetwork. The AllowSshRdpOutbound rule must permit both ports to the VirtualNetwork service tag."
  },
  {
    id: "az700-02-q6",
    question: "You need to deploy Private Endpoints and a set of VMs in the same subnet. Is this supported?",
    options: [
      "No — Private Endpoints require a dedicated subnet",
      "Yes — Private Endpoints can share a subnet with other resources",
      "Only if the subnet has no NSG associated",
      "Only if the subnet is delegated to Microsoft.Network/privateEndpoints"
    ],
    correctIndex: 1,
    explanation: "Private Endpoints can coexist with other resources such as VMs in the same subnet. They do not require delegation or a dedicated subnet. NSG support for Private Endpoints was added in 2023."
  }
]} />

---

## Recursos de estudo adicionais

- [Virtual network subnet requirements for Azure services](https://learn.microsoft.com/azure/virtual-network/virtual-network-for-azure-services)
- [Subnet delegation overview](https://learn.microsoft.com/azure/virtual-network/subnet-delegation-overview)
- [Configure NSG rules for Azure Bastion](https://learn.microsoft.com/azure/bastion/bastion-nsg)
- [Azure Firewall subnet sizing](https://learn.microsoft.com/azure/firewall/firewall-faq#why-does-azure-firewall-need-a--26-subnet-size)
- [Private Endpoint NSG support](https://learn.microsoft.com/azure/private-link/disable-private-endpoint-network-policy)
