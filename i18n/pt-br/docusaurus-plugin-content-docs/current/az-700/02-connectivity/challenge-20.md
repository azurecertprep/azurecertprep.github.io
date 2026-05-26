---
sidebar_position: 7
title: "Desafio 20: ExpressRoute Avançado [SIMULAÇÃO]"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 20: Recursos avançados do ExpressRoute

:::caution Modo de simulação
Este desafio é baseado em simulação. O ExpressRoute requer um provedor de conectividade física e custa $55--$10.000+/mês. Você aprenderá os comandos CLI, padrões de configuração e saídas esperadas sem implantar recursos reais.
:::

:::info Tempo e custo estimados
**45--60 minutos** | **Sem custo (simulação)** | **Peso no exame: 20--25%**
:::

## Objetivos

Após concluir este desafio, você será capaz de:

- Projetar e implementar o ExpressRoute Global Reach
- Habilitar o FastPath em uma conexão ExpressRoute
- Configurar Bidirectional Forwarding Detection (BFD) sobre ExpressRoute
- Projetar ExpressRoute geo-redundante para recuperação de desastres
- Explicar quando o ExpressRoute Direct é apropriado

## Cenário

A Contoso expandiu globalmente. Agora eles possuem:

- **Escritório no Leste dos EUA** conectado via ExpressRoute através da Equinix em Washington DC
- **Escritório na Europa** conectado via ExpressRoute através da Interxion em Amsterdã

Atualmente, o tráfego entre os dois escritórios faz hairpin através do Azure (o escritório dos EUA entra no Azure, atravessa o backbone da Microsoft, sai para o escritório europeu). Eles precisam do ExpressRoute Global Reach para rotear o tráfego entre escritórios diretamente pelo backbone da Microsoft sem entrar nas VNets do Azure.

Além disso, seu aplicativo de negociação financeira sensível à latência requer o FastPath para ignorar o gateway ExpressRoute no caminho de dados. Eles também desejam BFD para detecção de failover em menos de um segundo.

---

## Tarefa 1: Configurar o ExpressRoute Global Reach

O Global Reach permite que dois circuitos ExpressRoute troquem rotas entre seus peerings privados. O tráfego flui diretamente pelo backbone da Microsoft, ignorando completamente as VNets do Azure.

### Pré-requisitos para o Global Reach

- Ambos os circuitos devem ter o Azure private peering configurado
- Ambos os circuitos devem estar em **regiões suportadas** (nem todas as regiões suportam o Global Reach)
- Os circuitos devem estar em locais de peering diferentes (não é possível usar Global Reach entre dois circuitos no mesmo local de peering)
- O SKU Premium é necessário se os circuitos estiverem em regiões geopolíticas diferentes

### Etapa 1: Identificar ambos os circuitos

```bash
# Circuit 1: US East
az network express-route show \
  --resource-group rg-contoso-network \
  --name er-circuit-contoso-dc \
  --query "{Name:name, PeeringLocation:serviceProviderProperties.peeringLocation, Peerings:peerings[].name}" \
  --output json
![Challenge 20 - Topologia de Rede](/img/az-700/challenge-20-topology.svg)


```bash
# Circuit 2: Europe
az network express-route show \
  --resource-group rg-contoso-network-eu \
  --name er-circuit-contoso-ams \
  --query "{Name:name, PeeringLocation:serviceProviderProperties.peeringLocation, Peerings:peerings[].name}" \
  --output json
```

**Saída esperada:**

```json
{
  "Name": "er-circuit-contoso-ams",
  "PeeringLocation": "Amsterdam",
  "Peerings": ["AzurePrivatePeering"]
}
```

### Etapa 2: Criar a conexão Global Reach

O comando `az network express-route peering connection create` estabelece o Global Reach entre dois circuitos. Ele opera no private peering do circuito iniciador e referencia o circuito par.

```bash
az network express-route peering connection create \
  --resource-group rg-contoso-network \
  --circuit-name er-circuit-contoso-dc \
  --peering-name AzurePrivatePeering \
  --name globalreach-us-to-eu \
  --peer-circuit "/subscriptions/aaaa0000-bb11-2222-33cc-444444dddddd/resourceGroups/rg-contoso-network-eu/providers/Microsoft.Network/expressRouteCircuits/er-circuit-contoso-ams/peerings/AzurePrivatePeering" \
  --address-prefix 172.16.100.0/29
```

**Detalhes dos parâmetros:**

| Parâmetro | Finalidade |
|---|---|
| `--circuit-name` | O circuito iniciador (local) |
| `--peering-name` | Deve ser `AzurePrivatePeering` (o Global Reach funciona apenas sobre private peering) |
| `--peer-circuit` | ID de recurso completo do private peering do circuito remoto |
| `--address-prefix` | Uma sub-rede /29 usada para o túnel do Global Reach (não deve ser do seu espaço de endereços existente) |

**Saída esperada:**

```json
{
  "addressPrefix": "172.16.100.0/29",
  "circuitConnectionStatus": "Connected",
  "id": "/subscriptions/.../peerings/AzurePrivatePeering/connections/globalreach-us-to-eu",
  "name": "globalreach-us-to-eu",
  "peerExpressRouteCircuitPeering": {
    "id": "/subscriptions/.../er-circuit-contoso-ams/peerings/AzurePrivatePeering"
  },
  "provisioningState": "Succeeded"
}
```

### Etapa 3: Verificar a conectividade do Global Reach

```bash
az network express-route peering connection list \
  --resource-group rg-contoso-network \
  --circuit-name er-circuit-contoso-dc \
  --peering-name AzurePrivatePeering \
  --output table
```

**Saída esperada:**

```text
Name                  CircuitConnectionStatus  AddressPrefix     ProvisioningState
--------------------  -----------------------  ----------------  -----------------
globalreach-us-to-eu  Connected                172.16.100.0/29   Succeeded
```

### Global Reach entre assinaturas

Se o circuito par estiver em uma assinatura diferente, você precisa de uma chave de autorização:

```bash
# On the peer circuit's subscription, create an authorization
az network express-route auth create \
  --resource-group rg-contoso-network-eu \
  --circuit-name er-circuit-contoso-ams \
  --name auth-for-globalreach

# Use the authorization key when creating the connection
az network express-route peering connection create \
  --resource-group rg-contoso-network \
  --circuit-name er-circuit-contoso-dc \
  --peering-name AzurePrivatePeering \
  --name globalreach-us-to-eu \
  --peer-circuit "/subscriptions/bbbb1111-cc22-3333-44dd-555555eeeeee/resourceGroups/rg-contoso-network-eu/providers/Microsoft.Network/expressRouteCircuits/er-circuit-contoso-ams/peerings/AzurePrivatePeering" \
  --address-prefix 172.16.100.0/29 \
  --authorization-key "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

---

## Tarefa 2: Habilitar o FastPath

O FastPath melhora o desempenho do caminho de dados enviando o tráfego de rede diretamente para as VMs na rede virtual, ignorando o gateway ExpressRoute. O gateway ainda é necessário para operações do plano de controle (troca de rotas), mas os pacotes de dados tomam um atalho.

### Requisitos do FastPath

| Requisito | Detalhe |
|---|---|
| SKU do gateway | Ultra Performance, ErGw3AZ ou ErGwScale (mínimo 10 unidades de escala) |
| Tipo de circuito | Qualquer circuito ExpressRoute |
| Private peering | Deve estar configurado |

O FastPath **não é suportado** com os SKUs de gateway ErGw1AZ (Standard) ou ErGw2AZ (High Performance).

### Habilitar o FastPath em uma nova conexão

```bash
az network vpn-connection create \
  --resource-group rg-contoso-network \
  --name conn-er-hub-fastpath \
  --vnet-gateway1 gw-expressroute-hub \
  --express-route-circuit2 er-circuit-contoso-dc \
  --express-route-gateway-bypass true
```

**Saída esperada:**

```json
{
  "connectionType": "ExpressRoute",
  "expressRouteGatewayBypass": true,
  "id": "/subscriptions/.../connections/conn-er-hub-fastpath",
  "name": "conn-er-hub-fastpath",
  "provisioningState": "Succeeded",
  "virtualNetworkGateway1": {
    "id": "/subscriptions/.../virtualNetworkGateways/gw-expressroute-hub"
  }
}
```

### Habilitar o FastPath em uma conexão existente

```bash
az network vpn-connection update \
  --resource-group rg-contoso-network \
  --name conn-er-hub \
  --express-route-gateway-bypass true
```

**Saída esperada:**

```json
{
  "connectionType": "ExpressRoute",
  "expressRouteGatewayBypass": true,
  "name": "conn-er-hub",
  "provisioningState": "Succeeded"
}
```

### Limitações do FastPath para entender no exame

- O FastPath não suporta UDRs de VNet peering no GatewaySubnet (sem ExpressRoute Direct)
- O FastPath com Private Link é suportado apenas em circuitos ExpressRoute Direct (10 Gbps ou 100 Gbps)
- O suporte a VNet peering com FastPath requer conexões ExpressRoute Direct
- O gateway continua sendo necessário para o plano de controle (troca de rotas BGP)

---

## Tarefa 3: Configurar Bidirectional Forwarding Detection (BFD)

O BFD fornece detecção de falha de link em menos de um segundo entre os roteadores Microsoft Enterprise Edge (MSEE) e seus roteadores CE/PE locais. Sem o BFD, os timers de hold do BGP podem levar até 180 segundos para detectar uma falha.

### Como o BFD funciona com o ExpressRoute

- O BFD é habilitado **por padrão** em todas as interfaces de private peering e Microsoft peering recém-criadas no lado do MSEE
- Você só precisa configurar o BFD no **seu** roteador CE/PE para completar a sessão BFD
- O intervalo do BFD no MSEE é configurado para 300 milissegundos
- Não há comando Azure CLI para habilitar o BFD no MSEE; é automático

### Configuração do BFD no roteador do cliente (exemplo Cisco IOS XE)

```text
interface TenGigabitEthernet2/0/0.200
  description ExpressRoute private peering to Azure
  encapsulation dot1Q 200
  ip vrf forwarding AZURE
  ip address 172.16.0.1 255.255.255.252
  bfd interval 300 min_rx 300 multiplier 3

router bgp 65020
  address-family ipv4 vrf AZURE
    neighbor 172.16.0.2 remote-as 12076
    neighbor 172.16.0.2 fall-over bfd
    neighbor 172.16.0.2 activate
  exit-address-family
```

**Parâmetros-chave do BFD:**

| Parâmetro | Valor | Significado |
|---|---|---|
| `interval` | 300 ms | Intervalo de transmissão para pacotes BFD |
| `min_rx` | 300 ms | Intervalo mínimo de recebimento |
| `multiplier` | 3 | Perder 3 pacotes antes de declarar link inativo |
| **Tempo de detecção** | 900 ms | 300 ms * 3 = detecção em menos de um segundo |

### Negociação de timers do BFD

Entre os pares BFD, o mais lento dos dois determina a taxa de transmissão real. Os intervalos de BFD do MSEE são configurados para 300 milissegundos. Você pode configurar valores mais altos no seu lado (forçando detecção mais lenta), mas não pode configurá-los abaixo de 300 ms.

### Habilitando o BFD em peerings existentes

Para circuitos configurados com private peering antes de agosto de 2018, ou Microsoft peering antes de janeiro de 2020, você deve redefinir o peering para habilitar o BFD no lado do MSEE:

```bash
# Reset the peering to enable BFD (for legacy peerings only)
az network express-route peering delete \
  --resource-group rg-contoso-network \
  --circuit-name er-circuit-contoso-dc \
  --name AzurePrivatePeering

# Recreate the peering (BFD will be enabled automatically)
az network express-route peering create \
  --resource-group rg-contoso-network \
  --circuit-name er-circuit-contoso-dc \
  --peering-type AzurePrivatePeering \
  --peer-asn 65020 \
  --primary-peer-subnet 172.16.0.0/30 \
  --secondary-peer-subnet 172.16.0.4/30 \
  --vlan-id 200
```

---

## Tarefa 4: Projetar ExpressRoute geo-redundante

Para recuperação de desastres, a Microsoft recomenda implantar circuitos ExpressRoute em pelo menos dois locais de peering diferentes. Isso garante que a conectividade sobreviva a uma falha em um único local.

### Padrão de design de redundância

```text
                    +-----------------------+
                    |   Azure Region        |
                    |  (e.g., East US 2)    |
                    |                       |
                    |   ER Gateway          |
                    |   (ErGw2AZ, zone-     |
                    |    redundant)         |
                    +---+---------------+---+
                        |               |
              Connection 1      Connection 2
                        |               |
              +---------+---+   +---+---------+
              | Circuit A   |   | Circuit B   |
              | Washington  |   | New York    |
              | DC          |   |             |
              | (Equinix)   |   | (Megaport)  |
              +------+------+   +------+------+
                     |                  |
              +------+------+   +------+------+
              | On-Prem     |   | On-Prem     |
              | Router A    |   | Router B    |
              +-------------+   +-------------+
```

### Criar o segundo circuito para redundância

```bash
az network express-route create \
  --resource-group rg-contoso-network \
  --name er-circuit-contoso-ny \
  --bandwidth 200 \
  --peering-location "New York" \
  --provider "Megaport" \
  --sku-family MeteredData \
  --sku-tier Standard \
  --location eastus2
```

### Conectar ambos os circuitos ao mesmo gateway

```bash
# Connection to primary circuit (Washington DC)
az network vpn-connection create \
  --resource-group rg-contoso-network \
  --name conn-er-primary-dc \
  --vnet-gateway1 gw-expressroute-hub \
  --express-route-circuit2 er-circuit-contoso-dc \
  --routing-weight 10

# Connection to secondary circuit (New York)
az network vpn-connection create \
  --resource-group rg-contoso-network \
  --name conn-er-secondary-ny \
  --vnet-gateway1 gw-expressroute-hub \
  --express-route-circuit2 er-circuit-contoso-ny \
  --routing-weight 5
```

O parâmetro `--routing-weight` influencia a preferência de caminho quando ambos os circuitos anunciam as mesmas rotas. Peso maior é preferido.

---

## Tarefa 5: ExpressRoute Direct

O ExpressRoute Direct fornece portas físicas dedicadas de 10 Gbps ou 100 Gbps diretamente na borda da Microsoft. É diferente do ExpressRoute padrão, onde você se conecta através de um provedor.

### Quando usar o ExpressRoute Direct

| Cenário | Por que usar Direct |
|---|---|
| Ingestão massiva de dados (multi-terabyte) | Necessidade de largura de banda sustentada de 10+ Gbps |
| Requisito de criptografia MACsec | Disponível apenas em portas Direct |
| Isolamento físico estrito | Seu próprio par de portas dedicado |
| Múltiplos circuitos na mesma porta | Criar múltiplos circuitos lógicos a partir de uma porta |
| Conformidade regulatória | Os dados não trafegam pela infraestrutura compartilhada do provedor |

### Criar um recurso ExpressRoute Direct

```bash
# List available peering locations for ExpressRoute Direct
az network express-route port location list --output table
```

**Saída esperada:**

```text
Name                   AvailableBandwidths    Address
---------------------  --------------------   --------
Equinix-Ashburn-DC2    100 Gbps, 10 Gbps     21715 Filigree Ct, Ashburn, VA
Equinix-Dallas-DA3     100 Gbps, 10 Gbps     1950 N Stemmons Fwy, Dallas, TX
Interxion-Amsterdam    100 Gbps, 10 Gbps     Science Park 505, Amsterdam
```

```bash
# Create the ExpressRoute Direct port
az network express-route port create \
  --resource-group rg-contoso-network \
  --name er-direct-contoso \
  --bandwidth 100 gbps \
  --encapsulation Dot1Q \
  --peering-location "Equinix-Ashburn-DC2" \
  --location eastus
```

**Saída esperada:**

```json
{
  "bandwidthInGbps": 100,
  "encapsulation": "Dot1Q",
  "etherType": "0x8100",
  "id": "/subscriptions/.../expressRoutePorts/er-direct-contoso",
  "links": [
    {
      "adminState": "Disabled",
      "connectorType": "LC",
      "interfaceName": "Ethernet 2/2/1",
      "name": "link1",
      "patchPanelId": "PP:0001:111111",
      "provisioningState": "Succeeded",
      "rackId": "YOURDC:YOURROW:YOURRACK"
    },
    {
      "adminState": "Disabled",
      "connectorType": "LC",
      "interfaceName": "Ethernet 2/2/2",
      "name": "link2",
      "patchPanelId": "PP:0001:111112",
      "provisioningState": "Succeeded",
      "rackId": "YOURDC:YOURROW:YOURRACK"
    }
  ],
  "location": "eastus",
  "mtu": "1500",
  "name": "er-direct-contoso",
  "peeringLocation": "Equinix-Ashburn-DC2",
  "provisionedBandwidthInGbps": 0.0,
  "provisioningState": "Succeeded"
}
```

### Criar um circuito na porta Direct

```bash
az network express-route create \
  --resource-group rg-contoso-network \
  --name er-circuit-direct-01 \
  --bandwidth-in-gbps 10 \
  --express-route-port "/subscriptions/.../expressRoutePorts/er-direct-contoso" \
  --sku-family MeteredData \
  --sku-tier Premium \
  --location eastus
```

Observe que ao usar o ExpressRoute Direct, você não especifica `--provider` ou `--peering-location` porque está se conectando diretamente à Microsoft (você é efetivamente seu próprio provedor).

---

## Cenários de quebra e correção

### Cenário A: Global Reach entre circuitos no mesmo local de peering

**Sintoma:** `az network express-route peering connection create` falha com um erro.

**Mensagem de erro:**

```text
(GlobalReachSamePeeringLocation) The two circuits are at the same peering location.
Global Reach requires circuits at different peering locations.
```

**Causa raiz:** Ambos os circuitos usam o mesmo local de peering (por exemplo, ambos em "Washington DC"). O Global Reach requer que os circuitos estejam em locais de peering diferentes para que o tráfego atravesse o backbone da Microsoft.

**Resolução:** Use circuitos em locais de peering diferentes, ou use VNet peering com gateways para circuitos no mesmo local.

### Cenário B: FastPath com SKU de gateway não suportado

**Sintoma:** A conexão é criada com `--express-route-gateway-bypass true`, mas o tráfego ainda atravessa o gateway.

**Causa raiz:** O gateway usa ErGw1AZ (Standard) ou ErGw2AZ (High Performance), que não suportam o FastPath.

**Resolução:** Atualize o gateway para ErGw3AZ ou Ultra Performance:

```bash
# Note: Gateway SKU upgrade requires recreation in most cases
az network vnet-gateway update \
  --resource-group rg-contoso-network \
  --name gw-expressroute-hub \
  --sku ErGw3AZ
```

### Cenário C: BFD não detectando falha rapidamente

**Sintoma:** A falha do link leva 60+ segundos para ser detectada apesar do BFD estar configurado no roteador CE.

**Causa raiz:** Possíveis problemas:
1. O BFD está configurado na interface mas não vinculado à sessão BGP (`fall-over bfd` ausente)
2. O multiplicador está configurado muito alto (por exemplo, multiplicador 20 com intervalo de 300 ms = detecção em 6 segundos)
3. O peering foi configurado antes de agosto de 2018 e o BFD não está habilitado no MSEE

**Resolução:**
- Verifique se a sessão BGP referencia o BFD: `neighbor x.x.x.x fall-over bfd`
- Configure o timer apropriado: `bfd interval 300 min_rx 300 multiplier 3`
- Se for um peering legado, redefina e recrie-o para habilitar o BFD no lado do MSEE

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-20-q1",
    question: "Qual é o comando CLI para estabelecer o ExpressRoute Global Reach entre dois circuitos?",
    options: [
      "az network express-route peering connection create",
      "az network express-route global-reach create",
      "az network vpn-connection create --global-reach true",
      "az network express-route connect --peer-circuit"
    ],
    correctIndex: 0,
    explanation: "O Global Reach é configurado via az network express-route peering connection create, que cria uma conexão entre os private peerings de dois circuitos. O parâmetro --peer-circuit especifica o ID do recurso de peering do circuito remoto."
  },
  {
    id: "az700-20-q2",
    question: "Quais SKUs de gateway ExpressRoute suportam FastPath? (Selecione a melhor resposta)",
    options: [
      "Standard (ErGw1AZ) e superiores",
      "High Performance (ErGw2AZ) e superiores",
      "Ultra Performance, ErGw3AZ ou ErGwScale (mínimo de 10 unidades de escala)",
      "Todos os SKUs de gateway ExpressRoute suportam FastPath"
    ],
    correctIndex: 2,
    explanation: "O FastPath requer Ultra Performance, ErGw3AZ ou ErGwScale com pelo menos 10 unidades de escala. Os gateways Standard e High Performance não suportam o bypass de caminho de dados do FastPath."
  },
  {
    id: "az700-20-q3",
    question: "O BFD nos roteadores MSEE do ExpressRoute usa um intervalo de transmissão de 300 ms com qual efeito na detecção de falhas?",
    options: [
      "A falha é detectada em 300 ms (um pacote perdido)",
      "A falha é detectada em 900 ms (com multiplicador de 3)",
      "A falha é detectada em 3 segundos (BGP hold timer)",
      "A falha é detectada em 60 segundos (BGP keepalive padrão)"
    ],
    correctIndex: 1,
    explanation: "Com intervalo BFD de 300 ms e multiplicador de 3, a falha de link é detectada em 300 ms x 3 = 900 ms (sub-segundo). Sem BFD, os hold timers do BGP de 180 segundos seriam aplicados."
  },
  {
    id: "az700-20-q4",
    question: "Qual tamanho de sub-rede é necessário para o parâmetro address-prefix ao configurar o Global Reach?",
    options: [
      "Sub-rede /30 (4 endereços)",
      "Sub-rede /29 (8 endereços)",
      "Sub-rede /28 (16 endereços)",
      "Sub-rede /27 (32 endereços)"
    ],
    correctIndex: 1,
    explanation: "O Global Reach requer uma sub-rede IPv4 /29 para o parâmetro address-prefix. Essa sub-rede fornece os endereços IP usados para estabelecer conectividade entre os dois circuitos ExpressRoute através do backbone da Microsoft."
  },
  {
    id: "az700-20-q5",
    question: "Qual recurso está disponível APENAS com ExpressRoute Direct e não com ExpressRoute baseado em provedor?",
    options: [
      "Azure private peering",
      "Global Reach",
      "Criptografia MACsec",
      "FastPath"
    ],
    correctIndex: 2,
    explanation: "O MACsec (criptografia ponto a ponto de Camada 2) está disponível apenas em portas ExpressRoute Direct porque requer conectividade física direta com o edge da Microsoft. Circuitos padrão baseados em provedor não suportam MACsec."
  }
]} />

---

## Recursos adicionais

- [Configure ExpressRoute Global Reach](https://learn.microsoft.com/azure/expressroute/expressroute-howto-set-global-reach)
- [Configure ExpressRoute FastPath](https://learn.microsoft.com/azure/expressroute/expressroute-howto-linkvnet-cli#configure-expressroute-fastpath)
- [Configure BFD over ExpressRoute](https://learn.microsoft.com/azure/expressroute/expressroute-bfd)
- [About ExpressRoute Direct](https://learn.microsoft.com/azure/expressroute/expressroute-erdirect-about)
- [Designing for high availability with ExpressRoute](https://learn.microsoft.com/azure/expressroute/designing-for-high-availability-with-expressroute)
