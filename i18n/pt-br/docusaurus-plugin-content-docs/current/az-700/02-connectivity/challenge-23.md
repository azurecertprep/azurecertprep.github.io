---
sidebar_position: 10
title: "Desafio 23: Virtual WAN Roteamento & Integração com NVA"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 23: Roteamento Virtual WAN e integração com NVA

:::info Tempo e custo estimados

**60–90 minutos** | **~$0,36/h** (Virtual WAN Standard + gateways) | **Peso no exame: 20–25%**

:::

## Cenário

A Contoso implantou o Azure Virtual WAN com um hub Standard e vários spokes conectados (do Challenge 22). Agora eles precisam de roteamento avançado: isolar VNets de spokes de desenvolvimento dos spokes de produção, rotear todo o tráfego de internet por meio de um Network Virtual Appliance (NVA) centralizado para inspeção e controlar quais spokes podem se comunicar entre si.

Seus requisitos:
- Os spokes de produção (vnet-prod-1, vnet-prod-2) devem se comunicar entre si e com serviços compartilhados
- Os spokes de desenvolvimento (vnet-dev-1, vnet-dev-2) devem ser isolados da produção
- Todo o tráfego de internet de ambos os ambientes deve ser roteado por um firewall/NVA centralizado
- O NVA é implantado como uma aplicação gerenciada do Azure Marketplace dentro do hub virtual

## Habilidades de exame avaliadas

| Habilidade | Descrição |
|------------|-----------|
| Configurar roteamento do hub virtual | Criar tabelas de rotas personalizadas, rotas estáticas e associações de roteamento |
| Integrar NVA de terceiros | Implantar e rotear tráfego por NVAs no hub virtual |

## Visão geral da arquitetura

![Challenge 23 - Topologia de Rede](/img/az-700/challenge-23-topology.svg)


## Conceitos-chave

### Comportamento padrão de roteamento do Virtual WAN

Quando uma conexão VNet é criada sem configuração explícita de roteamento:
- Ela é **associada** à `defaultRouteTable`
- Ela **propaga** rotas para a `defaultRouteTable`
- Todos os spokes aprendem as rotas uns dos outros (conectividade full mesh)

### Tabelas de rotas personalizadas para isolamento

Para isolar grupos de spokes, você cria tabelas de rotas personalizadas e configura:
- **Associação**: Qual tabela de rotas uma conexão usa para consultar rotas (determina para onde o tráfego é enviado)
- **Propagação**: Quais tabelas de rotas aprendem as rotas da conexão (determina quem pode alcançá-la)

### Intenção de roteamento e políticas de roteamento

A intenção de roteamento simplifica a configuração de roteamento permitindo que você defina:
- **Política de tráfego de internet**: Roteia 0.0.0.0/0 para um recurso de próximo salto (Azure Firewall ou NVA)
- **Política de tráfego privado**: Roteia prefixos RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) para um recurso de próximo salto

Quando a intenção de roteamento está habilitada, ela tem precedência sobre rotas estáticas individuais na defaultRouteTable.

---

## Tarefa 1: Entender o roteamento padrão

Antes de fazer alterações, examine a configuração de roteamento padrão para entender o comportamento base.

### Azure CLI

```bash
# Define variables (assumes resources from Challenge 22 exist)
RG="rg-vwan-challenge22"
HUB_NAME="hub-eastus"

# List route tables in the hub
az network vhub route-table list \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --output table

# Show the default route table
az network vhub route-table show \
  --name "defaultRouteTable" \
  --resource-group $RG \
  --vhub-name $HUB_NAME

# Check which route table a connection is associated with
az network vhub connection show \
  --name "conn-spoke1" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --query "routingConfiguration"
```

### Azure PowerShell

```powershell
$RG = "rg-vwan-challenge22"
$HubName = "hub-eastus"

# List route tables
Get-AzVHubRouteTable -ResourceGroupName $RG -VirtualHubName $HubName

# Get default route table details
Get-AzVHubRouteTable `
  -ResourceGroupName $RG `
  -VirtualHubName $HubName `
  -Name "defaultRouteTable"

# Check connection routing configuration
Get-AzVirtualHubVnetConnection `
  -ResourceGroupName $RG `
  -VirtualHubName $HubName `
  -Name "conn-spoke1" |
  Select-Object -ExpandProperty RoutingConfiguration
```

---

## Tarefa 2: Criar tabelas de rotas personalizadas para isolamento

Crie tabelas de rotas separadas para cargas de trabalho de produção e desenvolvimento. Labels permitem que você referencie grupos de tabelas de rotas durante a configuração de propagação.

### Azure CLI

```bash
# Create route table for production spokes
az network vhub route-table create \
  --name "RT_PROD" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --labels "prod"

# Create route table for development spokes
az network vhub route-table create \
  --name "RT_DEV" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --labels "dev"

# Verify route tables were created
az network vhub route-table list \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --output table
```

### Azure PowerShell

```powershell
# Create route table for production
New-AzVHubRouteTable `
  -ResourceGroupName $RG `
  -VirtualHubName $HubName `
  -Name "RT_PROD" `
  -Label @("prod")

# Create route table for development
New-AzVHubRouteTable `
  -ResourceGroupName $RG `
  -VirtualHubName $HubName `
  -Name "RT_DEV" `
  -Label @("dev")
```

---

## Tarefa 3: Associar conexões de spoke com tabelas de rotas personalizadas

Atualize conexões existentes ou crie novas com configuração explícita de roteamento. Spokes de produção associam-se ao RT_PROD e propagam apenas para o RT_PROD. Spokes de desenvolvimento associam-se ao RT_DEV e propagam apenas para o RT_DEV.

### Azure CLI

```bash
# Create production spoke VNets
az network vnet create \
  --name "vnet-prod-1" \
  --resource-group $RG \
  --location "eastus" \
  --address-prefixes "10.30.0.0/16" \
  --subnet-name "workload" \
  --subnet-prefixes "10.30.1.0/24"

az network vnet create \
  --name "vnet-prod-2" \
  --resource-group $RG \
  --location "eastus" \
  --address-prefixes "10.40.0.0/16" \
  --subnet-name "workload" \
  --subnet-prefixes "10.40.1.0/24"

# Create dev spoke VNets
az network vnet create \
  --name "vnet-dev-1" \
  --resource-group $RG \
  --location "eastus" \
  --address-prefixes "10.50.0.0/16" \
  --subnet-name "workload" \
  --subnet-prefixes "10.50.1.0/24"

# Get the route table resource IDs
RT_PROD_ID=$(az network vhub route-table show \
  --name "RT_PROD" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --query "id" -o tsv)

RT_DEV_ID=$(az network vhub route-table show \
  --name "RT_DEV" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --query "id" -o tsv)

# Connect production spoke with routing configuration
az network vhub connection create \
  --name "conn-prod-1" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --remote-vnet "vnet-prod-1" \
  --associated-route-table $RT_PROD_ID \
  --propagated-route-tables $RT_PROD_ID \
  --labels "prod"

az network vhub connection create \
  --name "conn-prod-2" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --remote-vnet "vnet-prod-2" \
  --associated-route-table $RT_PROD_ID \
  --propagated-route-tables $RT_PROD_ID \
  --labels "prod"

# Connect development spoke with routing configuration
az network vhub connection create \
  --name "conn-dev-1" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --remote-vnet "vnet-dev-1" \
  --associated-route-table $RT_DEV_ID \
  --propagated-route-tables $RT_DEV_ID \
  --labels "dev"
```

### Azure PowerShell

```powershell
# Create production spoke VNet
$vnetProd1 = New-AzVirtualNetwork `
  -ResourceGroupName $RG `
  -Name "vnet-prod-1" `
  -Location "eastus" `
  -AddressPrefix "10.30.0.0/16"

Add-AzVirtualNetworkSubnetConfig `
  -Name "workload" `
  -VirtualNetwork $vnetProd1 `
  -AddressPrefix "10.30.1.0/24"
$vnetProd1 | Set-AzVirtualNetwork

# Get route table objects
$rtProd = Get-AzVHubRouteTable `
  -ResourceGroupName $RG `
  -VirtualHubName $HubName `
  -Name "RT_PROD"

$rtDev = Get-AzVHubRouteTable `
  -ResourceGroupName $RG `
  -VirtualHubName $HubName `
  -Name "RT_DEV"

# Create routing configuration for production
$routingConfig = New-AzRoutingConfiguration `
  -AssociatedRouteTable $rtProd.Id `
  -PropagatedRouteTable @($rtProd.Id) `
  -Label @("prod")

# Connect with routing config
$vnetRef = Get-AzVirtualNetwork -ResourceGroupName $RG -Name "vnet-prod-1"
New-AzVirtualHubVnetConnection `
  -ResourceGroupName $RG `
  -VirtualHubName $HubName `
  -Name "conn-prod-1" `
  -RemoteVirtualNetwork $vnetRef `
  -RoutingConfiguration $routingConfig
```

---

## Tarefa 4: Adicionar rotas estáticas a uma tabela de rotas do hub

Adicione uma rota estática para forçar o tráfego destinado à internet (0.0.0.0/0) por meio de um NVA ou Azure Firewall. O próximo salto é especificado como um ID de recurso.

### Azure CLI

```bash
# Add a default route pointing to an NVA/Firewall resource
# Replace <firewall-resource-id> with actual Azure Firewall or NVA resource ID
FIREWALL_ID="/subscriptions/<sub-id>/resourceGroups/$RG/providers/Microsoft.Network/azureFirewalls/fw-hub-eastus"

az network vhub route-table route add \
  --name "RT_PROD" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --route-name "default-to-firewall" \
  --destination-type CIDR \
  --destinations "0.0.0.0/0" \
  --next-hop-type ResourceId \
  --next-hop $FIREWALL_ID

# Verify routes in the table
az network vhub route-table route list \
  --name "RT_PROD" \
  --resource-group $RG \
  --vhub-name $HUB_NAME
```

### Azure PowerShell

```powershell
# Define the route
$route = New-AzVHubRoute `
  -Name "default-to-firewall" `
  -DestinationType "CIDR" `
  -Destination @("0.0.0.0/0") `
  -NextHopType "ResourceId" `
  -NextHop $firewallId

# Update the route table with the new route
Update-AzVHubRouteTable `
  -ResourceGroupName $RG `
  -VirtualHubName $HubName `
  -Name "RT_PROD" `
  -Route @($route)
```

---

## Tarefa 5: Configurar intenção de roteamento e políticas de roteamento

A intenção de roteamento fornece uma maneira declarativa de configurar políticas de roteamento que se aplicam a todas as conexões no hub. Esta é a abordagem recomendada para enviar tráfego por meio de uma solução de segurança.

### Azure CLI

```bash
# Create routing intent with both Internet and Private traffic policies
# The next-hop must be an Azure Firewall or supported NVA resource ID
az network vhub routing-intent create \
  --name "RoutingIntent-EastUS" \
  --resource-group $RG \
  --vhub $HUB_NAME \
  --routing-policies "[{name:InternetTraffic,destinations:[Internet],next-hop:$FIREWALL_ID},{name:PrivateTrafficPolicy,destinations:[PrivateTraffic],next-hop:$FIREWALL_ID}]"

# Verify routing intent configuration
az network vhub routing-intent show \
  --name "RoutingIntent-EastUS" \
  --resource-group $RG \
  --vhub $HUB_NAME
```

### Azure PowerShell

```powershell
# Create routing policies
$internetPolicy = New-AzRoutingPolicy `
  -Name "InternetTraffic" `
  -Destination @("Internet") `
  -NextHop $firewallId

$privatePolicy = New-AzRoutingPolicy `
  -Name "PrivateTrafficPolicy" `
  -Destination @("PrivateTraffic") `
  -NextHop $firewallId

# Create routing intent
New-AzRoutingIntent `
  -ResourceGroupName $RG `
  -VirtualHubName $HubName `
  -Name "RoutingIntent-EastUS" `
  -RoutingPolicy @($internetPolicy, $privatePolicy)
```

:::warning Restrições da intenção de roteamento
Quando a intenção de roteamento está habilitada em um hub:
- Todas as conexões nesse hub terão seu próximo salto para tráfego de internet e/ou privado definido para o recurso especificado (Azure Firewall ou NVA)
- Você não pode configurar rotas estáticas na defaultRouteTable que conflitem com a intenção de roteamento
- A intenção de roteamento se aplica a todas as conexões novas e existentes no hub
- Você deve usar um tipo de próximo salto suportado: Azure Firewall ou um NVA gerenciado do Marketplace
:::

---

## Tarefa 6: Implantação de NVA no hub virtual (conceitual)

NVAs de terceiros podem ser implantados diretamente no hub virtual a partir do Azure Marketplace. Isso é diferente de implantar um NVA em uma VNet spoke — NVAs integrados ao hub participam diretamente na infraestrutura de roteamento do hub.

### Parceiros NVA suportados (exemplos)

| Fornecedor | Produto | Caso de uso |
|------------|---------|-------------|
| Barracuda Networks | CloudGen WAN | SD-WAN, firewall |
| Cisco | Viptela SD-WAN | SD-WAN |
| Fortinet | FortiGate | Firewall de próxima geração |
| Palo Alto Networks | Cloud NGFW | Firewall de próxima geração |
| Versa Networks | SD-WAN | SD-WAN |

### Etapas de implantação (baseadas no portal)

A implantação de NVA no hub é gerenciada por meio do Azure Marketplace e do plano de gerenciamento do parceiro:

1. Navegue até o hub virtual no Portal do Azure
2. Selecione **Provedores de segurança de terceiros** ou **Network Virtual Appliance**
3. Escolha o fornecedor de NVA no Marketplace
4. Selecione unidades de infraestrutura (análogas a unidades de escala para throughput)
5. Conclua a configuração específica do fornecedor
6. O NVA é implantado como uma aplicação gerenciada dentro do hub

### Usando NVA como próximo salto no roteamento

Uma vez implantado, o ID de recurso do NVA pode ser usado como próximo salto em tabelas de rotas e intenção de roteamento:

```bash
# Reference the NVA in a static route
NVA_ID="/subscriptions/<sub-id>/resourceGroups/<managed-rg>/providers/Microsoft.Network/networkVirtualAppliances/nva-hub-eastus"

az network vhub route-table route add \
  --name "RT_PROD" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --route-name "inspect-traffic" \
  --destination-type CIDR \
  --destinations "10.0.0.0/8" \
  --next-hop-type ResourceId \
  --next-hop $NVA_ID
```

---

## Cenários de quebra e correção

### Cenário 1: Spoke na tabela de rotas errada

**Sintoma:** Uma VM de produção (em vnet-prod-1) não consegue alcançar serviços compartilhados que estão na defaultRouteTable, mas pode alcançar outros spokes de produção.

**Causa raiz:** A conexão de produção está associada ao RT_PROD e propaga apenas para o RT_PROD. As VNets de serviços compartilhados propagam apenas para a defaultRouteTable. Não há troca de rotas entre RT_PROD e defaultRouteTable.

**Diagnóstico:**
```bash
# Check what routes RT_PROD contains
az network vhub route-table route list \
  --name "RT_PROD" \
  --resource-group $RG \
  --vhub-name $HUB_NAME

# Check shared services connection propagation
az network vhub connection show \
  --name "conn-shared-services" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --query "routingConfiguration.propagatedRouteTables"
```

**Correção:** Garanta que a VNet de serviços compartilhados propague para a defaultRouteTable e o RT_PROD:
```bash
# Update shared services to propagate to both route tables
DEFAULT_RT_ID=$(az network vhub route-table show \
  --name "defaultRouteTable" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --query "id" -o tsv)

az network vhub connection update \
  --name "conn-shared-services" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --propagated-route-tables $DEFAULT_RT_ID $RT_PROD_ID $RT_DEV_ID \
  --labels "default" "prod" "dev"
```

---

### Cenário 2: Intenção de roteamento conflita com rotas estáticas

**Sintoma:** Após habilitar a intenção de roteamento, rotas estáticas configuradas manualmente na defaultRouteTable param de funcionar. O tráfego não segue mais o caminho esperado.

**Causa raiz:** A intenção de roteamento tem precedência sobre rotas estáticas na defaultRouteTable. Quando a intenção de roteamento está configurada para tráfego privado, ela programa automaticamente as rotas 10.0.0.0/8, 172.16.0.0/12 e 192.168.0.0/16. Rotas estáticas manuais 0.0.0.0/0 se tornam redundantes.

**Diagnóstico:**
```bash
# Check routing intent status
az network vhub routing-intent show \
  --name "RoutingIntent-EastUS" \
  --resource-group $RG \
  --vhub $HUB_NAME

# Check effective routes to see what is programmed
az network vhub get-effective-routes \
  --name $HUB_NAME \
  --resource-group $RG
```

**Correção:** Remova rotas estáticas conflitantes da defaultRouteTable. Use a intenção de roteamento como o único mecanismo para direcionamento de tráfego:
```bash
# Remove the conflicting static route (by index, starting at 1)
az network vhub route-table route remove \
  --name "defaultRouteTable" \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --index 1
```

---

### Cenário 3: Próximo salto NVA inalcançável

**Sintoma:** O tráfego destinado ao NVA é descartado. A tabela de rotas mostra o próximo salto correto, mas a conectividade falha.

**Causa raiz:** A aplicação gerenciada do NVA não concluiu o provisionamento ou as unidades de infraestrutura do NVA estão definidas como 0 (efetivamente desabilitadas).

**Diagnóstico:**
```bash
# Check the NVA provisioning state
az network virtual-appliance show \
  --name "nva-hub-eastus" \
  --resource-group $RG \
  --query "{provisioningState:provisioningState, deploymentType:deploymentType}"
```

**Correção:** Verifique se o NVA está no estado Succeeded e tem pelo menos 2 unidades de infraestrutura configuradas. Se o NVA estiver com problemas, verifique o portal de gerenciamento do fornecedor para problemas no nível do appliance.

---

## Limpeza

```bash
# If you created new resources beyond Challenge 22, delete them
# Or delete the entire resource group
az group delete --name $RG --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-vwan-challenge22" -Force -AsJob
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-23-q1",
    question: "No Virtual WAN, o que a 'associação' de uma conexão VNet com uma tabela de rotas personalizada realiza?",
    options: [
      "Determina qual tabela de rotas a conexão usa para consultar rotas nas decisões de encaminhamento",
      "Adiciona os prefixos de endereço da conexão à tabela de rotas personalizada",
      "Cria uma relação de peering entre a VNet e o hub",
      "Habilita a VNet a anunciar rotas BGP para o hub"
    ],
    correctIndex: 0,
    explanation: "Associar uma conexão a uma tabela de rotas determina qual tabela de rotas é usada para consulta de rotas (decisões de encaminhamento) para o tráfego originado daquela conexão. A propagação determina quais tabelas de rotas aprendem as rotas da conexão. São conceitos separados -- a associação afeta o roteamento de saída do spoke, enquanto a propagação afeta a alcançabilidade de entrada ao spoke."
  },
  {
    id: "az700-23-q2",
    question: "A Contoso quer que os spokes de desenvolvimento se comuniquem entre si, mas não com spokes de produção. Os spokes de produção devem se comunicar entre si, mas não com dev. Ambos os ambientes precisam de acesso à internet através de um firewall. Qual configuração atinge esse objetivo?",
    options: [
      "Criar RT_PROD e RT_DEV. Associar spokes de prod com RT_PROD (propagar para RT_PROD). Associar spokes de dev com RT_DEV (propagar para RT_DEV). Configurar routing intent para tráfego de internet.",
      "Colocar todos os spokes na defaultRouteTable e usar NSGs para bloquear tráfego entre ambientes",
      "Criar uma única tabela de rotas personalizada e usar rotas estáticas com ações de negação",
      "Associar todos os spokes à defaultRouteTable e usar labels de propagação para filtrar"
    ],
    correctIndex: 0,
    explanation: "Criar tabelas de rotas separadas com associação e propagação isoladas garante que spokes de prod aprendam apenas rotas de outros spokes de prod (via RT_PROD) e spokes de dev aprendam apenas rotas de outros spokes de dev (via RT_DEV). O routing intent gerencia a política de tráfego de internet centralmente. NSGs podem bloquear tráfego mas não impedem a propagação de rotas. Tabelas de rotas do Virtual WAN não suportam ações de negação."
  },
  {
    id: "az700-23-q3",
    question: "Quais são os destinos válidos para uma política de roteamento dentro de uma configuração de routing intent?",
    options: [
      "Internet e PrivateTraffic",
      "0.0.0.0/0 e 10.0.0.0/8",
      "PublicEndpoints e VirtualNetwork",
      "DefaultRoute e RFC1918"
    ],
    correctIndex: 0,
    explanation: "As políticas de roteamento no routing intent suportam dois tipos de destino: 'Internet' (que programa 0.0.0.0/0) e 'PrivateTraffic' (que programa 10.0.0.0/8, 172.16.0.0/12 e 192.168.0.0/16). Estas são as únicas duas palavras-chave de destino válidas. Você não pode especificar faixas CIDR personalizadas dentro das políticas de routing intent."
  },
  {
    id: "az700-23-q4",
    question: "Após habilitar o routing intent com uma política de tráfego privado, qual das seguintes afirmações é verdadeira sobre a defaultRouteTable?",
    options: [
      "O routing intent programa automaticamente rotas na defaultRouteTable que sobrescrevem quaisquer rotas estáticas adicionadas manualmente para prefixos RFC 1918",
      "A defaultRouteTable é excluída e substituída pelo recurso de routing intent",
      "Rotas estáticas manuais na defaultRouteTable têm precedência sobre o routing intent",
      "A defaultRouteTable se torna somente leitura e não pode ser modificada"
    ],
    correctIndex: 0,
    explanation: "Quando o routing intent é configurado, ele programa automaticamente a defaultRouteTable com rotas para os tipos de tráfego especificados (Internet = 0.0.0.0/0, PrivateTraffic = 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16). Essas rotas programadas pelo sistema têm precedência sobre rotas estáticas configuradas manualmente. A defaultRouteTable continua existindo, mas as rotas programadas pelo routing intent sobrescrevem entradas manuais."
  },
  {
    id: "az700-23-q5",
    question: "Quais tipos de next-hop são suportados para políticas de routing intent em um hub Virtual WAN?",
    options: [
      "Azure Firewall ou um Network Virtual Appliance (NVA) gerenciado suportado implantado no hub",
      "Qualquer endereço IP de VM em uma VNet spoke",
      "Azure Application Gateway ou Azure Load Balancer",
      "VPN Gateway ou ExpressRoute Gateway no hub"
    ],
    correctIndex: 0,
    explanation: "O next-hop do routing intent deve ser um Azure Firewall implantado no hub ou um NVA gerenciado suportado do Azure Marketplace implantado no hub (como Palo Alto, Fortinet ou Cisco). Você não pode apontar o routing intent para VMs arbitrárias em VNets spoke, load balancers ou recursos de gateway. O NVA deve ser um aplicativo gerenciado integrado com a infraestrutura do hub Virtual WAN."
  }
]} />
