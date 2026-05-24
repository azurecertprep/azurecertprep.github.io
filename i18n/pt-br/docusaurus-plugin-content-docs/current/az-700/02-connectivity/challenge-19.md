---
sidebar_position: 6
title: "Desafio 19: ExpressRoute Private Peering [SIMULAÇÃO]"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 19: ExpressRoute private peering

:::caution Modo de simulaÃ§Ã£o
Este desafio Ã© baseado em simulaÃ§Ã£o. O ExpressRoute requer um provedor de conectividade fÃ­sica e custa $55--$10.000+/mÃªs. VocÃª aprenderÃ¡ os comandos CLI, padrÃµes de configuraÃ§Ã£o e saÃ­das esperadas sem implantar recursos reais.
:::

:::info Tempo e custo estimados
**45--60 minutos** | **Sem custo (simulaÃ§Ã£o)** | **Peso no exame: 20--25%**
:::

## Objetivos

ApÃ³s concluir este desafio, vocÃª serÃ¡ capaz de:

- Selecionar um modelo de conectividade ExpressRoute
- Selecionar um SKU e tier apropriados para o ExpressRoute
- Criar um circuito ExpressRoute
- Escolher entre somente Azure private peering, somente Microsoft peering ou ambos
- Configurar o Azure private peering
- Criar e configurar um gateway ExpressRoute
- Conectar uma rede virtual a um circuito ExpressRoute

## CenÃ¡rio

A Contoso decidiu que suas cargas de trabalho hÃ­bridas exigem a largura de banda dedicada e a confiabilidade que somente o ExpressRoute pode fornecer. Seu datacenter local em Silicon Valley se conecta a uma instalaÃ§Ã£o de colocation da Equinix. Eles precisam:

1. Selecionar o modelo de conectividade correto para seu ambiente
2. Criar um circuito ExpressRoute com o SKU e largura de banda corretos
3. Implantar um gateway ExpressRoute em sua VNet hub
4. Configurar o Azure private peering para conectividade RFC 1918
5. Vincular a VNet ao circuito

---

## Tarefa 1: Entender os modelos de conectividade do ExpressRoute

Antes de criar qualquer recurso, vocÃª deve escolher o modelo de conectividade que corresponde Ã  sua infraestrutura fÃ­sica.

| Modelo de conectividade | DescriÃ§Ã£o | Caso de uso |
|---|---|---|
| **Co-localizaÃ§Ã£o em CloudExchange** | Seu datacenter estÃ¡ na mesma instalaÃ§Ã£o que uma exchange de nuvem (ex.: Equinix, Megaport) | Mais comum para empresas com presenÃ§a em colocation |
| **Ethernet ponto a ponto** | Fibra dedicada entre seu datacenter e a Microsoft | Alta largura de banda, conectividade de site Ãºnico |
| **Qualquer para qualquer (IPVPN)** | WAN baseada em MPLS que conecta mÃºltiplos escritÃ³rios filiais | Empresas multi-site que jÃ¡ utilizam MPLS |
| **ExpressRoute Direct** | Fibra direta para o edge da Microsoft (10 Gbps ou 100 Gbps) | IngestÃ£o massiva de dados, isolamento rigoroso, MACsec |

Para o cenÃ¡rio da Contoso, **co-localizaÃ§Ã£o em CloudExchange** Ã© apropriada porque eles jÃ¡ estÃ£o presentes na Equinix.

### Listar provedores de serviÃ§o disponÃ­veis

```bash
az network express-route list-service-providers --output table
```

**SaÃ­da esperada:**

```text
Name                  PeeringLocations                          BandwidthsOffered
--------------------  ----------------------------------------  ---------------------------
Equinix               Silicon Valley, Washington DC, Chicago    50Mbps, 100Mbps, 200Mbps,
                                                                500Mbps, 1Gbps, 2Gbps,
                                                                5Gbps, 10Gbps
AT&T Netbond          Silicon Valley, Chicago, Dallas           50Mbps, 100Mbps, 500Mbps,
                                                                1Gbps
Megaport              Silicon Valley, Sydney, London            50Mbps, 100Mbps, 200Mbps,
                                                                500Mbps, 1Gbps, 10Gbps
```

---

## Tarefa 2: Criar o circuito ExpressRoute

### Entendendo os tiers e famÃ­lias de SKU

| Tier do SKU | Recursos |
|---|---|
| **Local** | Acesso apenas a regiÃµes no mesmo metro ou prÃ³ximas. Sem cobranÃ§as de egress de dados. |
| **Standard** | Acesso a todas as regiÃµes dentro do mesmo limite geopolÃ­tico. 10 links de VNet. |
| **Premium** | Conectividade global (entre limites geopolÃ­ticos). 100 links de VNet. Limites de rota maiores (10.000). |

| FamÃ­lia do SKU | Modelo de cobranÃ§a |
|---|---|
| **MeteredData** | Pagamento por GB de egress. Taxa mensal menor. |
| **UnlimitedData** | Taxa mensal fixa independente do volume de egress. |

### Criar o circuito

```bash
az network express-route create \
  --resource-group rg-contoso-network \
  --name er-circuit-contoso-sv \
  --bandwidth 200 \
  --peering-location "Silicon Valley" \
  --provider "Equinix" \
  --sku-family MeteredData \
  --sku-tier Standard \
  --location westus2
```

**SaÃ­da esperada:**

```json
{
  "allowClassicOperations": false,
  "bandwidthInGbps": null,
  "bandwidthInMbps": 200,
  "circuitProvisioningState": "Enabled",
  "id": "/subscriptions/aaaa0000-bb11-2222-33cc-444444dddddd/resourceGroups/rg-contoso-network/providers/Microsoft.Network/expressRouteCircuits/er-circuit-contoso-sv",
  "location": "westus2",
  "name": "er-circuit-contoso-sv",
  "peerings": [],
  "provisioningState": "Succeeded",
  "serviceKey": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "serviceProviderNotes": null,
  "serviceProviderProperties": {
    "bandwidthInMbps": 200,
    "peeringLocation": "Silicon Valley",
    "serviceProviderName": "Equinix"
  },
  "serviceProviderProvisioningState": "NotProvisioned",
  "sku": {
    "family": "MeteredData",
    "name": "Standard_MeteredData",
    "tier": "Standard"
  },
  "stag": null,
  "tags": null,
  "type": "Microsoft.Network/expressRouteCircuits"
}
```

**ObservaÃ§Ãµes importantes:**

- A `serviceKey` Ã© fornecida ao seu provedor de conectividade para que eles provisionem a conexÃ£o fÃ­sica do lado deles.
- `serviceProviderProvisioningState` comeÃ§a como `NotProvisioned` atÃ© que o provedor ative o link.
- `circuitProvisioningState` Ã© `Enabled` (lado Azure estÃ¡ pronto).

### Verificar o status do circuito

```bash
az network express-route show \
  --resource-group rg-contoso-network \
  --name er-circuit-contoso-sv \
  --query "{Name:name, Bandwidth:bandwidthInMbps, ProviderState:serviceProviderProvisioningState, CircuitState:circuitProvisioningState, SKU:sku.name}" \
  --output table
```

**SaÃ­da esperada (apÃ³s o provedor provisionar):**

```text
Name                    Bandwidth  ProviderState  CircuitState  SKU
----------------------  ---------  -------------  ------------  --------------------
er-circuit-contoso-sv   200        Provisioned    Enabled       Standard_MeteredData
```

---

## Tarefa 3: Criar o gateway ExpressRoute

Um gateway de rede virtual ExpressRoute conecta sua VNet do Azure ao circuito ExpressRoute. Ele deve ser implantado em uma sub-rede chamada `GatewaySubnet`.

### SKUs do gateway ExpressRoute

| SKU | MÃ¡ximo de conexÃµes | MÃ¡ximo de circuitos | Throughput |
|---|---|---|---|
| Standard (ErGw1AZ) | 4 | 4 | 1 Gbps |
| High Performance (ErGw2AZ) | 8 | 8 | 2 Gbps |
| Ultra Performance (ErGw3AZ) | 16 | 16 | 10 Gbps |
| ErGwScale | 4--16 | 4--16 | 1--40 Gbps (escalÃ¡vel) |

O sufixo `AZ` indica implantaÃ§Ã£o com redundÃ¢ncia de zona entre zonas de disponibilidade.

### Criar o GatewaySubnet

```bash
az network vnet subnet create \
  --resource-group rg-contoso-network \
  --vnet-name vnet-hub-westus2 \
  --name GatewaySubnet \
  --address-prefixes 10.0.255.0/27
```

### Criar um IP pÃºblico para o gateway

```bash
az network public-ip create \
  --resource-group rg-contoso-network \
  --name pip-er-gateway \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3
```

### Criar o gateway ExpressRoute

```bash
az network vnet-gateway create \
  --resource-group rg-contoso-network \
  --name gw-expressroute-hub \
  --vnet vnet-hub-westus2 \
  --gateway-type ExpressRoute \
  --sku ErGw1AZ \
  --public-ip-addresses pip-er-gateway \
  --no-wait
```

**SaÃ­da esperada (apÃ³s a implantaÃ§Ã£o ser concluÃ­da, ~25--45 minutos):**

```json
{
  "activeActive": false,
  "gatewayType": "ExpressRoute",
  "id": "/subscriptions/aaaa0000-bb11-2222-33cc-444444dddddd/resourceGroups/rg-contoso-network/providers/Microsoft.Network/virtualNetworkGateways/gw-expressroute-hub",
  "ipConfigurations": [
    {
      "privateIpAllocationMethod": "Dynamic",
      "publicIpAddress": {
        "id": "/subscriptions/.../publicIPAddresses/pip-er-gateway"
      },
      "subnet": {
        "id": "/subscriptions/.../subnets/GatewaySubnet"
      }
    }
  ],
  "name": "gw-expressroute-hub",
  "provisioningState": "Succeeded",
  "sku": {
    "capacity": 2,
    "name": "ErGw1AZ",
    "tier": "ErGw1AZ"
  }
}
```

---

## Tarefa 4: Configurar o Azure private peering

O Azure private peering habilita a conectividade entre sua rede local e VNets do Azure usando endereÃ§os IP RFC 1918 (privados). Este Ã© o tipo de peering mais comum.

### Requisitos de peering

- **Sub-rede primÃ¡ria**: Uma sub-rede IPv4 /30 para o link de sessÃ£o BGP primÃ¡rio
- **Sub-rede secundÃ¡ria**: Uma sub-rede IPv4 /30 para o link de sessÃ£o BGP secundÃ¡rio
- **VLAN ID**: Uma tag VLAN Ãºnica para isolar este peering no link fÃ­sico
- **ASN do peer**: Seu nÃºmero de sistema autÃ´nomo BGP local (nÃ£o pode ser 65515, que o Azure reserva)

Cada sub-rede /30 fornece dois IPs utilizÃ¡veis: vocÃª usa o primeiro, a Microsoft usa o segundo.

### Configurar o private peering

```bash
az network express-route peering create \
  --resource-group rg-contoso-network \
  --circuit-name er-circuit-contoso-sv \
  --peering-type AzurePrivatePeering \
  --peer-asn 65020 \
  --primary-peer-subnet 172.16.0.0/30 \
  --secondary-peer-subnet 172.16.0.4/30 \
  --vlan-id 200 \
  --shared-key "ContosoSharedKey123"
```

**SaÃ­da esperada:**

```json
{
  "azureASN": 12076,
  "gatewayManagerEtag": "",
  "id": "/subscriptions/.../peerings/AzurePrivatePeering",
  "ipv6PeeringConfig": null,
  "lastModifiedBy": "Customer",
  "microsoftPeeringConfig": null,
  "name": "AzurePrivatePeering",
  "peerASN": 65020,
  "peeringType": "AzurePrivatePeering",
  "primaryAzurePort": "",
  "primaryPeerAddressPrefix": "172.16.0.0/30",
  "provisioningState": "Succeeded",
  "secondaryAzurePort": "",
  "secondaryPeerAddressPrefix": "172.16.0.4/30",
  "sharedKey": "ContosoSharedKey123",
  "state": "Enabled",
  "vlanId": 200
}
```

### Verificar a configuraÃ§Ã£o do peering

```bash
az network express-route peering show \
  --resource-group rg-contoso-network \
  --circuit-name er-circuit-contoso-sv \
  --name AzurePrivatePeering \
  --output table
```

**SaÃ­da esperada:**

```text
Name                  PeeringType           PeerAsn  VlanId  State    ProvisioningState
--------------------  --------------------  -------  ------  -------  -----------------
AzurePrivatePeering   AzurePrivatePeering   65020    200     Enabled  Succeeded
```

---

## Tarefa 5: Conectar a VNet ao circuito ExpressRoute

Com o gateway implantado e o peering configurado, vincule-os usando `az network vpn-connection create` com o parÃ¢metro `--express-route-circuit2`.

```bash
az network vpn-connection create \
  --resource-group rg-contoso-network \
  --name conn-er-hub \
  --vnet-gateway1 gw-expressroute-hub \
  --express-route-circuit2 er-circuit-contoso-sv
```

**SaÃ­da esperada:**

```json
{
  "connectionType": "ExpressRoute",
  "enableBgp": false,
  "expressRouteCircuit2": {
    "id": "/subscriptions/.../expressRouteCircuits/er-circuit-contoso-sv"
  },
  "id": "/subscriptions/.../connections/conn-er-hub",
  "name": "conn-er-hub",
  "provisioningState": "Succeeded",
  "routingWeight": 0,
  "virtualNetworkGateway1": {
    "id": "/subscriptions/.../virtualNetworkGateways/gw-expressroute-hub"
  }
}
```

### Verificar o status da conexÃ£o

```bash
az network vpn-connection show \
  --resource-group rg-contoso-network \
  --name conn-er-hub \
  --query "{Name:name, Status:connectionStatus, Type:connectionType}" \
  --output table
```

**SaÃ­da esperada:**

```text
Name          Status     Type
------------  ---------  ------------
conn-er-hub   Connected  ExpressRoute
```

---

## Tarefa 6: Verificar o provisionamento do circuito e a tabela de rotas

### Verificar a integridade completa do circuito

```bash
az network express-route show \
  --resource-group rg-contoso-network \
  --name er-circuit-contoso-sv \
  --query "{Name:name, ServiceProviderState:serviceProviderProvisioningState, CircuitState:circuitProvisioningState, Peerings:peerings[].{Type:peeringType,State:state}}" \
  --output json
```

**SaÃ­da esperada:**

```json
{
  "Name": "er-circuit-contoso-sv",
  "ServiceProviderState": "Provisioned",
  "CircuitState": "Enabled",
  "Peerings": [
    {
      "Type": "AzurePrivatePeering",
      "State": "Enabled"
    }
  ]
}
```

### Visualizar a tabela de rotas do peering

```bash
az network express-route list-route-tables \
  --resource-group rg-contoso-network \
  --name er-circuit-contoso-sv \
  --path primary \
  --peering-name AzurePrivatePeering
```

**SaÃ­da esperada:**

```json
{
  "value": [
    {
      "locPrf": "",
      "network": "10.0.0.0/16",
      "nextHop": "172.16.0.1",
      "path": "65020",
      "weight": 0
    },
    {
      "locPrf": "",
      "network": "192.168.1.0/24",
      "nextHop": "172.16.0.1",
      "path": "65020",
      "weight": 0
    }
  ]
}
```

Isso mostra que a rede local (10.0.0.0/16 e 192.168.1.0/24) estÃ¡ sendo anunciada a partir do roteador do cliente (ASN 65020) para o edge da Microsoft.

---

## CenÃ¡rios de quebra e correÃ§Ã£o

### CenÃ¡rio A: Circuito preso em NotProvisioned

**Sintoma:** O circuito foi criado hÃ¡ horas, mas `serviceProviderProvisioningState` ainda mostra `NotProvisioned`.

**Causa raiz:** O provedor de conectividade ainda nÃ£o provisionou a cross-connect fÃ­sica usando a chave de serviÃ§o.

**ResoluÃ§Ã£o:**
1. Confirme que a chave de serviÃ§o foi compartilhada com seu provedor
2. Contate o provedor para verificar se eles iniciaram o provisionamento
3. Alguns provedores requerem ativaÃ§Ã£o separada no portal (ex.: portal Equinix Cloud Exchange)

```bash
# Check current state
az network express-route show \
  --resource-group rg-contoso-network \
  --name er-circuit-contoso-sv \
  --query "serviceProviderProvisioningState"
# Output: "NotProvisioned"
```

### CenÃ¡rio B: VLAN ID incorreto causa falha no peering

**Sintoma:** O private peering mostra `state: Disabled` e a sessÃ£o BGP nÃ£o se estabelece.

**Causa raiz:** O VLAN ID configurado no Azure nÃ£o corresponde Ã  tag VLAN configurada no roteador CE/PE.

**ResoluÃ§Ã£o:** Atualize o VLAN ID para corresponder Ã  configuraÃ§Ã£o do seu roteador.

```bash
az network express-route peering update \
  --resource-group rg-contoso-network \
  --circuit-name er-circuit-contoso-sv \
  --name AzurePrivatePeering \
  --vlan-id 300
```

### CenÃ¡rio C: Conflito de ASN do peer

**Sintoma:** A criaÃ§Ã£o do peering falha com um erro sobre o ASN ser invÃ¡lido.

**Causa raiz:** O ASN 65515 Ã© reservado pelo Azure para o VPN Gateway. VocÃª nÃ£o pode usÃ¡-lo como ASN do peer.

**ResoluÃ§Ã£o:** Escolha um ASN privado no intervalo 64512--65514 ou 65516--65534, ou use um ASN pÃºblico que sua organizaÃ§Ã£o possui.

---

## Resumo da arquitetura

```text
On-Premises DC            Equinix Colo          Microsoft Edge         Azure VNet
+-----------+          +-------------+        +-------------+       +------------+
|  Router   |---fiber--|  Exchange   |--xconn-|    MSEE     |--BGP--|  ER Gateway |
|  ASN 65020|          |  Provider   |        |  ASN 12076  |       |  ErGw1AZ   |
+-----------+          +-------------+        +-------------+       +------------+
     |                                              |                     |
  VLAN 200                                    Private Peering          vnet-hub
  172.16.0.1/30                               172.16.0.2/30         10.0.0.0/16
```

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-19-q1",
    question: "Qual comando conecta um virtual network gateway a um circuito ExpressRoute?",
    options: [
      "az network vpn-connection create --vnet-gateway1 <gw> --express-route-circuit2 <circuit>",
      "az network express-route connect --gateway <gw> --circuit <circuit>",
      "az network vnet-gateway connect --express-route <circuit>",
      "az network express-route peering create --gateway <gw>"
    ],
    correctIndex: 0,
    explanation: "Apesar do 'vpn-connection' no nome do comando, az network vpn-connection create com --express-route-circuit2 é o comando CLI correto para vincular um gateway de VNet a um circuito ExpressRoute."
  },
  {
    id: "az700-19-q2",
    question: "Um circuito ExpressRoute mostra serviceProviderProvisioningState como NotProvisioned. O que deve acontecer antes de você poder configurar o peering?",
    options: [
      "O circuito deve ser excluído e recriado com um SKU diferente",
      "O provedor de conectividade deve provisionar o circuito usando a chave de serviço",
      "Você deve fazer upgrade para o tier Premium primeiro",
      "A GatewaySubnet deve ser criada antes que o provisionamento possa ser concluído"
    ],
    correctIndex: 1,
    explanation: "Após criar o circuito no Azure, a chave de serviço deve ser fornecida ao provedor de conectividade. Eles devem ativar a conexão física antes que o estado mude para Provisioned."
  },
  {
    id: "az700-19-q3",
    question: "Qual tier de SKU do ExpressRoute fornece conectividade entre fronteiras geopolíticas e suporta até 100 links de VNet?",
    options: [
      "Local",
      "Standard",
      "Premium",
      "Basic"
    ],
    correctIndex: 2,
    explanation: "O tier Premium fornece conectividade global entre fronteiras geopolíticas, suporta até 100 links de VNet e permite que 10.000 rotas sejam anunciadas via peering privado."
  },
  {
    id: "az700-19-q4",
    question: "Qual é o tamanho mínimo de sub-rede necessário para cada link de peering BGP no peering privado do ExpressRoute?",
    options: [
      "/28",
      "/29",
      "/30",
      "/31"
    ],
    correctIndex: 2,
    explanation: "O peering privado do ExpressRoute requer duas sub-redes /30 (uma para primário, uma para secundário). Cada /30 fornece exatamente dois endereços de host utilizáveis: um para o seu roteador e um para o roteador de borda da Microsoft."
  },
  {
    id: "az700-19-q5",
    question: "Qual valor de ASN é reservado pelo Azure e não pode ser usado como ASN de peer para peering privado do ExpressRoute?",
    options: [
      "65000",
      "65515",
      "12076",
      "64512"
    ],
    correctIndex: 1,
    explanation: "O ASN 65515 é reservado pelo Azure para sessões BGP do VPN Gateway. O ASN 12076 é o ASN próprio da Microsoft usado no lado MSEE. O ASN de peer do cliente não deve conflitar com estes."
  }
]} />

---

## Recursos adicionais

- [ExpressRoute connectivity models](https://learn.microsoft.com/azure/expressroute/expressroute-connectivity-models)
- [Create and modify an ExpressRoute circuit using CLI](https://learn.microsoft.com/azure/expressroute/howto-circuit-cli)
- [Create and modify peering for an ExpressRoute circuit using CLI](https://learn.microsoft.com/azure/expressroute/howto-routing-cli)
- [Connect a virtual network to an ExpressRoute circuit using CLI](https://learn.microsoft.com/azure/expressroute/expressroute-howto-linkvnet-cli)
- [ExpressRoute virtual network gateway SKUs](https://learn.microsoft.com/azure/expressroute/expressroute-about-virtual-network-gateways)
