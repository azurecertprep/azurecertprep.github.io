---
sidebar_position: 6
title: "Challenge 06: VNet Peering & Gateway Transit"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 06: Emparelhamento de VNet e trânsito de gateway

:::info Tempo e custo estimados

**90-120 minutos** | **~$1,50/hora** (VPN Gateway é o principal fator de custo) | **Peso no exame: 20-25%**

:::

## Cenário

A Contoso possui uma rede hub-spoke onde a VNet hub contém um VPN Gateway conectando ao ambiente local (on-premises). As VNets spoke precisam acessar recursos locais através do VPN Gateway do hub (trânsito de gateway). Além disso, alguns spokes precisam se comunicar entre si via hub (encadeamento de serviços através de um NVA), já que o emparelhamento de VNet é não transitivo por padrão.

## Objetivos de aprendizagem

Após concluir este desafio, você será capaz de:

- Criar uma topologia hub-spoke com emparelhamento de VNet
- Configurar trânsito de gateway para que VNets spoke usem o VPN Gateway do hub
- Explicar e demonstrar a natureza não transitiva do emparelhamento de VNet
- Implementar encadeamento de serviços com rotas definidas pelo usuário (UDRs) e um dispositivo virtual de rede (NVA)
- Configurar emparelhamento global de VNet entre regiões
- Verificar o status do emparelhamento, rotas efetivas e conectividade de ponta a ponta

## Pré-requisitos

- Uma assinatura Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- Um grupo de recursos para este laboratório (ou permissão para criar um)
- Compreensão básica de roteamento IP e espaços de endereçamento

---

## Tarefa 1: Criar a topologia hub-spoke com emparelhamento de VNet

Construa uma VNet hub e duas VNets spoke, depois estabeleça conexões de emparelhamento entre o hub e cada spoke.

### Etapa 1: Criar o grupo de recursos

```bash
az group create \
    --name rg-peering-lab \
    --location eastus2
```

### Etapa 2: Criar a VNet hub

```bash
az network vnet create \
    --resource-group rg-peering-lab \
    --name vnet-hub \
    --location eastus2 \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name GatewaySubnet \
    --subnet-prefixes 10.0.0.0/27
```

Adicione uma sub-rede para o NVA:

```bash
az network vnet subnet create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name subnet-nva \
    --address-prefixes 10.0.1.0/24
```

Adicione uma sub-rede de carga de trabalho no hub:

```bash
az network vnet subnet create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name subnet-hub-workload \
    --address-prefixes 10.0.2.0/24
```

### Etapa 3: Criar VNets spoke

```bash
az network vnet create \
    --resource-group rg-peering-lab \
    --name vnet-spoke1 \
    --location eastus2 \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name subnet-workload \
    --subnet-prefixes 10.1.1.0/24
```

```bash
az network vnet create \
    --resource-group rg-peering-lab \
    --name vnet-spoke2 \
    --location eastus2 \
    --address-prefixes 10.2.0.0/16 \
    --subnet-name subnet-workload \
    --subnet-prefixes 10.2.1.0/24
```

### Etapa 4: Criar emparelhamento do hub para spoke1

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke1 \
    --remote-vnet vnet-spoke1 \
    --allow-vnet-access true \
    --allow-forwarded-traffic true
```

### Etapa 5: Criar emparelhamento do spoke1 para hub

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke1 \
    --name spoke1-to-hub \
    --remote-vnet vnet-hub \
    --allow-vnet-access true \
    --allow-forwarded-traffic true
```

### Etapa 6: Criar emparelhamento entre hub e spoke2

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke2 \
    --remote-vnet vnet-spoke2 \
    --allow-vnet-access true \
    --allow-forwarded-traffic true
```

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke2 \
    --name spoke2-to-hub \
    --remote-vnet vnet-hub \
    --allow-vnet-access true \
    --allow-forwarded-traffic true
```

### Etapa 7: Verificar o status do emparelhamento

Ambos os lados devem mostrar `Connected` para que o tráfego flua:

```bash
az network vnet peering list \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --output table
```

```bash
az network vnet peering show \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke1 \
    --query peeringState \
    --output tsv
```

:::tip Nota para o exame

O emparelhamento deve ser criado em ambos os lados. Se apenas um lado for criado, o estado será `Initiated` nesse lado e `Disconnected` no outro. O tráfego não flui até que ambos os lados atinjam o estado `Connected`.

:::

---

## Tarefa 2: Configurar trânsito de gateway

Configure o VPN Gateway do hub e habilite o trânsito de gateway para que as VNets spoke possam alcançar redes locais através do gateway do hub.

### Etapa 1: Criar um IP público para o VPN Gateway

```bash
az network public-ip create \
    --resource-group rg-peering-lab \
    --name pip-vpn-gateway \
    --allocation-method Static \
    --sku Standard \
    --location eastus2
```

### Etapa 2: Criar o VPN Gateway (leva 30-45 minutos)

```bash
az network vnet-gateway create \
    --resource-group rg-peering-lab \
    --name vpngw-hub \
    --vnet vnet-hub \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw1 \
    --public-ip-addresses pip-vpn-gateway \
    --no-wait
```

O flag `--no-wait` retorna imediatamente. Verifique o status de provisionamento com:

```bash
az network vnet-gateway show \
    --resource-group rg-peering-lab \
    --name vpngw-hub \
    --query provisioningState \
    --output tsv
```

Aguarde até que a saída mostre `Succeeded` antes de prosseguir.

### Etapa 3: Atualizar emparelhamento hub-para-spoke para permitir trânsito de gateway

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke1 \
    --set allowGatewayTransit=true
```

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke2 \
    --set allowGatewayTransit=true
```

### Etapa 4: Atualizar emparelhamento spoke-para-hub para usar gateways remotos

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke1 \
    --name spoke1-to-hub \
    --set useRemoteGateways=true
```

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke2 \
    --name spoke2-to-hub \
    --set useRemoteGateways=true
```

:::warning Importante

A configuração `useRemoteGateways` falhará se a VNet hub não tiver um gateway implantado e em estado de provisionamento `Succeeded`. Você deve aguardar a conclusão da criação do VPN Gateway antes de definir este flag no emparelhamento do spoke.

:::

### Etapa 5: Verificar a configuração de trânsito de gateway

```bash
az network vnet peering show \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke1 \
    --query '{allowGatewayTransit:allowGatewayTransit, peeringState:peeringState}' \
    --output json
```

```bash
az network vnet peering show \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke1 \
    --name spoke1-to-hub \
    --query '{useRemoteGateways:useRemoteGateways, peeringState:peeringState}' \
    --output json
```

:::tip Nota para o exame

O trânsito de gateway permite que VNets spoke usem o gateway do hub como se fosse seu próprio. O lado do hub define `allowGatewayTransit=true` e cada spoke define `useRemoteGateways=true`. Uma VNet não pode usar gateways remotos se já tiver seu próprio gateway implantado. O emparelhamento global suporta trânsito de gateway apenas com gateways VpnGw1 ou superior (não SKU Basic).

:::

---

## Tarefa 3: Demonstrar a não transitividade do emparelhamento de VNet

O emparelhamento é não transitivo: mesmo que Spoke1 esteja emparelhado com Hub e Hub esteja emparelhado com Spoke2, Spoke1 não consegue alcançar Spoke2 automaticamente. Esta tarefa demonstra esse comportamento implantando VMs e verificando rotas efetivas.

### Etapa 1: Implantar uma VM de teste no spoke1

```bash
az vm create \
    --resource-group rg-peering-lab \
    --name vm-spoke1 \
    --vnet-name vnet-spoke1 \
    --subnet subnet-workload \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --admin-username azureuser \
    --generate-ssh-keys \
    --no-wait
```

### Etapa 2: Implantar uma VM de teste no spoke2

```bash
az vm create \
    --resource-group rg-peering-lab \
    --name vm-spoke2 \
    --vnet-name vnet-spoke2 \
    --subnet subnet-workload \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --admin-username azureuser \
    --generate-ssh-keys \
    --no-wait
```

### Etapa 3: Verificar rotas efetivas na NIC da VM spoke1

Após a VM ser provisionada, recupere as rotas efetivas para verificar quais destinos a VM spoke1 pode alcançar:

```bash
az network nic show-effective-route-table \
    --resource-group rg-peering-lab \
    --name vm-spoke1VMNic \
    --output table
```

Você verá rotas para:
- `10.1.0.0/16` (VNet local) com próximo salto `VnetLocal`
- `10.0.0.0/16` (VNet hub via emparelhamento) com próximo salto `VNetPeering`

Você NÃO verá uma rota para `10.2.0.0/16` (spoke2). Isso confirma a não transitividade: spoke1 pode alcançar o hub, mas não spoke2 através do hub.

### Etapa 4: Tentar conectividade do spoke1 para spoke2

```bash
az network watcher test-connectivity \
    --resource-group rg-peering-lab \
    --source-resource vm-spoke1 \
    --dest-address 10.2.1.4 \
    --dest-port 22
```

Este teste deve retornar `ConnectionStatus: Unreachable` porque não há emparelhamento direto ou rota entre os dois spokes.

:::tip Nota para o exame

O emparelhamento de VNet é sempre não transitivo. Se VNet A está emparelhada com VNet B e VNet B está emparelhada com VNet C, VNet A não tem caminho para VNet C a menos que você (a) emparelhe A diretamente com C, ou (b) roteie o tráfego através de um NVA ou Azure Firewall na VNet B usando UDRs (encadeamento de serviços).

:::

---

## Tarefa 4: Implementar encadeamento de serviços com UDRs

Habilite a comunicação spoke-a-spoke roteando o tráfego através de um dispositivo virtual de rede (NVA) na VNet hub.

### Etapa 1: Implantar um NVA no hub

```bash
az vm create \
    --resource-group rg-peering-lab \
    --name vm-nva \
    --vnet-name vnet-hub \
    --subnet subnet-nva \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --admin-username azureuser \
    --generate-ssh-keys \
    --private-ip-address 10.0.1.4
```

### Etapa 2: Habilitar encaminhamento de IP na NIC do NVA

O NVA deve encaminhar pacotes que não são destinados a ele mesmo. Habilite o encaminhamento de IP na camada de rede do Azure:

```bash
az network nic update \
    --resource-group rg-peering-lab \
    --name vm-nvaVMNic \
    --ip-forwarding true
```

Também habilite o encaminhamento de IP dentro da VM Linux:

```bash
az vm run-command invoke \
    --resource-group rg-peering-lab \
    --name vm-nva \
    --command-id RunShellScript \
    --scripts "sudo sysctl -w net.ipv4.ip_forward=1 && echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf"
```

### Etapa 3: Criar uma tabela de rotas para spoke1

```bash
az network route-table create \
    --resource-group rg-peering-lab \
    --name rt-spoke1 \
    --location eastus2
```

Adicione uma rota direcionando o tráfego do spoke2 para o NVA:

```bash
az network route-table route create \
    --resource-group rg-peering-lab \
    --route-table-name rt-spoke1 \
    --name to-spoke2 \
    --address-prefix 10.2.0.0/16 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4
```

### Etapa 4: Criar uma tabela de rotas para spoke2

```bash
az network route-table create \
    --resource-group rg-peering-lab \
    --name rt-spoke2 \
    --location eastus2
```

```bash
az network route-table route create \
    --resource-group rg-peering-lab \
    --route-table-name rt-spoke2 \
    --name to-spoke1 \
    --address-prefix 10.1.0.0/16 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4
```

### Etapa 5: Associar tabelas de rotas às sub-redes spoke

```bash
az network vnet subnet update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke1 \
    --name subnet-workload \
    --route-table rt-spoke1
```

```bash
az network vnet subnet update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke2 \
    --name subnet-workload \
    --route-table rt-spoke2
```

### Etapa 6: Verificar que as rotas efetivas agora incluem a UDR

```bash
az network nic show-effective-route-table \
    --resource-group rg-peering-lab \
    --name vm-spoke1VMNic \
    --output table
```

Você deve agora ver uma rota para `10.2.0.0/16` com tipo de próximo salto `VirtualAppliance` e endereço de próximo salto `10.0.1.4`.

### Etapa 7: Testar conectividade spoke-a-spoke

```bash
az network watcher test-connectivity \
    --resource-group rg-peering-lab \
    --source-resource vm-spoke1 \
    --dest-address 10.2.1.4 \
    --dest-port 22
```

O status da conexão deve agora mostrar `Reachable` (assumindo que os NSGs permitem o tráfego e o NVA está encaminhando pacotes).

:::warning Importante

Para que o encadeamento de serviços funcione, `--allow-forwarded-traffic` deve ser definido como `true` em AMBOS os lados de CADA conexão de emparelhamento. O tráfego do spoke1 destinado ao spoke2 entra no hub como tráfego encaminhado (já que o hub não é o destino original). Se `allowForwardedTraffic` for false no emparelhamento hub-para-spoke2, o hub não encaminhará esse tráfego para spoke2.

:::

---

## Tarefa 5: Configurar emparelhamento global de VNet

Crie uma VNet em uma região diferente e estabeleça emparelhamento global (entre regiões) com o hub.

### Etapa 1: Criar uma VNet em uma segunda região

```bash
az network vnet create \
    --resource-group rg-peering-lab \
    --name vnet-spoke3-westeurope \
    --location westeurope \
    --address-prefixes 10.3.0.0/16 \
    --subnet-name subnet-workload \
    --subnet-prefixes 10.3.1.0/24
```

### Etapa 2: Criar emparelhamento global do hub para spoke3

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke3 \
    --remote-vnet vnet-spoke3-westeurope \
    --allow-vnet-access true \
    --allow-forwarded-traffic true \
    --allow-gateway-transit true
```

### Etapa 3: Criar emparelhamento global do spoke3 para hub

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke3-westeurope \
    --name spoke3-to-hub \
    --remote-vnet vnet-hub \
    --allow-vnet-access true \
    --allow-forwarded-traffic true \
    --use-remote-gateways true
```

### Etapa 4: Verificar o status do emparelhamento global

```bash
az network vnet peering show \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke3 \
    --query '{peeringState:peeringState, allowGatewayTransit:allowGatewayTransit, remoteVnetRegion:remoteVirtualNetwork.id}' \
    --output json
```

### Etapa 5: Implantar uma VM e testar latência

```bash
az vm create \
    --resource-group rg-peering-lab \
    --name vm-spoke3 \
    --vnet-name vnet-spoke3-westeurope \
    --subnet subnet-workload \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --admin-username azureuser \
    --generate-ssh-keys \
    --location westeurope \
    --no-wait
```

O tráfego de emparelhamento entre regiões percorre a rede backbone da Microsoft. Espere latência mais alta (tipicamente 30-80ms entre Leste dos EUA e Oeste da Europa) comparado ao emparelhamento na mesma região (menos de 2ms).

:::tip Nota para o exame

O emparelhamento global de VNet suporta todos os recursos do emparelhamento regional com estas ressalvas: (1) VPN Gateways com SKU Basic não suportam trânsito de gateway sobre emparelhamento global (VpnGw1 ou superior é necessário), (2) balanceadores de carga internos Basic não são acessíveis sobre emparelhamento global (use SKU Standard), e (3) a largura de banda pode ser menor que o emparelhamento na mesma região dependendo dos tamanhos das VMs.

:::

---

## Tarefa 6: Verificar status do emparelhamento, rotas efetivas e conectividade

Confirme que a topologia geral funciona revisando o status do emparelhamento em todas as conexões e validando a propagação de rotas.

### Etapa 1: Listar todos os emparelhamentos na VNet hub

```bash
az network vnet peering list \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --query '[].{Name:name, State:peeringState, GatewayTransit:allowGatewayTransit, ForwardedTraffic:allowForwardedTraffic}' \
    --output table
```

### Etapa 2: Verificar rotas efetivas na perspectiva do NVA hub

```bash
az network nic show-effective-route-table \
    --resource-group rg-peering-lab \
    --name vm-nvaVMNic \
    --output table
```

O NVA deve ver rotas para todas as VNets emparelhadas (10.1.0.0/16, 10.2.0.0/16, 10.3.0.0/16) com tipo de próximo salto `VNetPeering` ou `VNetGlobalPeering`.

### Etapa 3: Verificar que spoke1 tem rotas para on-premises via trânsito de gateway

Se o VPN Gateway aprendeu rotas locais (por exemplo, 192.168.0.0/16 via BGP), verifique se spoke1 as herda:

```bash
az network nic show-effective-route-table \
    --resource-group rg-peering-lab \
    --name vm-spoke1VMNic \
    --query "[?source=='VirtualNetworkGateway']" \
    --output table
```

Rotas aprendidas do gateway aparecerão com source `VirtualNetworkGateway` porque `useRemoteGateways=true` faz com que o spoke herde a tabela de rotas do gateway do hub.

### Etapa 4: Executar uma verificação completa de conectividade

```bash
# Spoke1 to Hub NVA (should succeed - direct peering)
az network watcher test-connectivity \
    --resource-group rg-peering-lab \
    --source-resource vm-spoke1 \
    --dest-address 10.0.1.4 \
    --dest-port 22

# Spoke1 to Spoke2 (should succeed - via NVA service chaining)
az network watcher test-connectivity \
    --resource-group rg-peering-lab \
    --source-resource vm-spoke1 \
    --dest-address 10.2.1.4 \
    --dest-port 22
```

---

## Cenários de quebra e correção

### Cenário 1: Emparelhamento preso no estado "Initiated"

Um colega criou emparelhamento do hub para uma nova VNet spoke, mas o tráfego não está fluindo. Você verifica o estado do emparelhamento:

```bash
az network vnet peering show \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke1 \
    --query peeringState \
    --output tsv
```

Saída: `Initiated`

**Causa raiz:** O emparelhamento foi criado apenas no lado do hub. O emparelhamento reverso (spoke para hub) nunca foi criado.

**Correção:** Crie o emparelhamento ausente no lado do spoke:

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke1 \
    --name spoke1-to-hub \
    --remote-vnet vnet-hub \
    --allow-vnet-access true \
    --allow-forwarded-traffic true
```

Após ambos os lados existirem, o estado transiciona para `Connected` em ambos os emparelhamentos.

### Cenário 2: Trânsito de gateway falha no emparelhamento do spoke

Você tenta habilitar `useRemoteGateways` em um emparelhamento de spoke, mas recebe um erro:

```
"Cannot use remote gateways because the referenced virtual network has no gateways"
```

**Causa raiz:** O VPN Gateway na VNet hub ainda não foi implantado ou ainda está em estado de provisionamento.

**Correção:** Verifique se o gateway existe e está totalmente provisionado:

```bash
az network vnet-gateway show \
    --resource-group rg-peering-lab \
    --name vpngw-hub \
    --query provisioningState \
    --output tsv
```

Aguarde até que mostre `Succeeded`, depois tente novamente habilitar `useRemoteGateways`. Se o gateway não existir, implante-o primeiro (veja Tarefa 2, Etapa 2).

### Cenário 3: Tráfego spoke-a-spoke bloqueado apesar das UDRs

As tabelas de rotas estão corretamente configuradas apontando para o NVA, e o NVA tem encaminhamento de IP habilitado. No entanto, o tráfego do spoke1 para spoke2 ainda falha.

**Causa raiz:** O emparelhamento hub-para-spoke2 tem `allowForwardedTraffic` definido como `false`. O hub recebe o pacote do spoke1 e o roteia para o NVA, mas quando o NVA encaminha o pacote para spoke2, o emparelhamento o descarta porque tráfego encaminhado não é permitido.

**Correção:** Atualize o emparelhamento para permitir tráfego encaminhado:

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke2 \
    --set allowForwardedTraffic=true
```

Também verifique se o emparelhamento spoke2-para-hub permite tráfego encaminhado (necessário para o tráfego de retorno):

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke2 \
    --name spoke2-to-hub \
    --set allowForwardedTraffic=true
```

---

## Limpeza de recursos

Exclua o grupo de recursos para remover todos os recursos do laboratório e parar de incorrer em cobranças (especialmente o VPN Gateway):

```bash
az group delete \
    --name rg-peering-lab \
    --yes \
    --no-wait
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-06-q1",
    question: "You create a VNet peering from VNet-A to VNet-B but forget to create the reverse peering. What state will the peering show on VNet-A?",
    options: [
      "Connected",
      "Initiated",
      "Disconnected",
      "Failed"
    ],
    correctIndex: 1,
    explanation: "When peering is created on only one side, that side shows 'Initiated' state. The peering will not transition to 'Connected' until the reverse peering is also created from VNet-B to VNet-A. Traffic does not flow in 'Initiated' state."
  },
  {
    id: "az700-06-q2",
    question: "Contoso has a hub-spoke topology. Spoke1 peers with Hub and Hub peers with Spoke2. A VM in Spoke1 tries to reach a VM in Spoke2. What happens?",
    options: [
      "Traffic flows successfully because both spokes peer with the same hub",
      "Traffic is blocked because VNet peering is non-transitive",
      "Traffic flows but with double the latency due to the extra hop",
      "Traffic is blocked by the default NSG rules"
    ],
    correctIndex: 1,
    explanation: "VNet peering is non-transitive. Even though Spoke1 peers with Hub and Hub peers with Spoke2, Spoke1 has no route to Spoke2. You must either create a direct peering between the spokes or implement service chaining through an NVA in the hub using UDRs."
  },
  {
    id: "az700-06-q3",
    question: "You want spoke VNets to use the hub VPN Gateway to reach on-premises. Which combination of settings is correct?",
    options: [
      "Set allowGatewayTransit=true on the spoke peering and useRemoteGateways=true on the hub peering",
      "Set allowGatewayTransit=true on the hub peering and useRemoteGateways=true on the spoke peering",
      "Set useRemoteGateways=true on both sides of the peering",
      "Set allowGatewayTransit=true on both sides of the peering"
    ],
    correctIndex: 1,
    explanation: "Gateway transit requires the hub side (which owns the gateway) to set allowGatewayTransit=true, and the spoke side to set useRemoteGateways=true. This allows the spoke to inherit routes learned by the hub's gateway."
  },
  {
    id: "az700-06-q4",
    question: "Service chaining through an NVA in a hub requires which setting on the hub-to-spoke peering?",
    options: [
      "allowVnetAccess=true",
      "allowGatewayTransit=true",
      "allowForwardedTraffic=true",
      "useRemoteGateways=true"
    ],
    correctIndex: 2,
    explanation: "When an NVA in the hub forwards packets to a spoke, those packets are considered 'forwarded traffic' (they did not originate from the hub VNet). The hub-to-spoke peering must have allowForwardedTraffic=true to permit this traffic. Without it, the peering drops forwarded packets."
  },
  {
    id: "az700-06-q5",
    question: "You attempt to set useRemoteGateways=true on a spoke peering but receive an error. What is the most likely cause?",
    options: [
      "The spoke VNet already has its own VPN Gateway deployed",
      "The hub VNet does not have a gateway in Succeeded provisioning state",
      "Both A and B are valid causes for this error",
      "The peering is using global (cross-region) peering"
    ],
    correctIndex: 2,
    explanation: "The useRemoteGateways flag fails if (a) the remote VNet has no gateway deployed or the gateway is not fully provisioned, or (b) the local VNet already has its own gateway. A VNet cannot use both its own gateway and a remote gateway simultaneously."
  },
  {
    id: "az700-06-q6",
    question: "Which VPN Gateway SKU does NOT support gateway transit over global VNet peering?",
    options: [
      "VpnGw1",
      "VpnGw2",
      "Basic",
      "VpnGw1AZ"
    ],
    correctIndex: 2,
    explanation: "The Basic SKU VPN Gateway does not support gateway transit over global (cross-region) VNet peering. You must use VpnGw1 or higher (Standard SKU equivalent or above) for gateway transit to work across regions."
  }
]} />

---

## Recursos adicionais

- [Virtual network peering overview](https://learn.microsoft.com/azure/virtual-network/virtual-network-peering-overview)
- [Create, change, or delete a virtual network peering](https://learn.microsoft.com/azure/virtual-network/virtual-network-manage-peering)
- [Configure VPN gateway transit for virtual network peering](https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-peering-gateway-transit)
- [Hub-spoke network topology in Azure](https://learn.microsoft.com/azure/architecture/networking/architecture/hub-spoke)
- [Virtual network traffic routing (UDRs)](https://learn.microsoft.com/azure/virtual-network/virtual-networks-udr-overview)
- [Tutorial: Route network traffic with a route table](https://learn.microsoft.com/azure/virtual-network/tutorial-create-route-table)
