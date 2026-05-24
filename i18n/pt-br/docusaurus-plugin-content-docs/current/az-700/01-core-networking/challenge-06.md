---
sidebar_position: 6
title: "Desafio 06: VNet Peering & Gateway Transit"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 06: Emparelhamento de VNet e trÃ¢nsito de gateway

:::info Tempo e custo estimados

**90-120 minutos** | **~$1,50/hora** (VPN Gateway Ã© o principal fator de custo) | **Peso no exame: 20-25%**

:::

## CenÃ¡rio

A Contoso possui uma rede hub-spoke onde a VNet hub contÃ©m um VPN Gateway conectando ao ambiente local (on-premises). As VNets spoke precisam acessar recursos locais atravÃ©s do VPN Gateway do hub (trÃ¢nsito de gateway). AlÃ©m disso, alguns spokes precisam se comunicar entre si via hub (encadeamento de serviÃ§os atravÃ©s de um NVA), jÃ¡ que o emparelhamento de VNet Ã© nÃ£o transitivo por padrÃ£o.

## Objetivos de aprendizagem

ApÃ³s concluir este desafio, vocÃª serÃ¡ capaz de:

- Criar uma topologia hub-spoke com emparelhamento de VNet
- Configurar trÃ¢nsito de gateway para que VNets spoke usem o VPN Gateway do hub
- Explicar e demonstrar a natureza nÃ£o transitiva do emparelhamento de VNet
- Implementar encadeamento de serviÃ§os com rotas definidas pelo usuÃ¡rio (UDRs) e um dispositivo virtual de rede (NVA)
- Configurar emparelhamento global de VNet entre regiÃµes
- Verificar o status do emparelhamento, rotas efetivas e conectividade de ponta a ponta

## PrÃ©-requisitos

- Uma assinatura Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- Um grupo de recursos para este laboratÃ³rio (ou permissÃ£o para criar um)
- CompreensÃ£o bÃ¡sica de roteamento IP e espaÃ§os de endereÃ§amento

---

## Tarefa 1: Criar a topologia hub-spoke com emparelhamento de VNet

Construa uma VNet hub e duas VNets spoke, depois estabeleÃ§a conexÃµes de emparelhamento entre o hub e cada spoke.

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

Ambos os lados devem mostrar `Connected` para que o trÃ¡fego flua:

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

O emparelhamento deve ser criado em ambos os lados. Se apenas um lado for criado, o estado serÃ¡ `Initiated` nesse lado e `Disconnected` no outro. O trÃ¡fego nÃ£o flui atÃ© que ambos os lados atinjam o estado `Connected`.

:::

---

## Tarefa 2: Configurar trÃ¢nsito de gateway

Configure o VPN Gateway do hub e habilite o trÃ¢nsito de gateway para que as VNets spoke possam alcanÃ§ar redes locais atravÃ©s do gateway do hub.

### Etapa 1: Criar um IP pÃºblico para o VPN Gateway

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

Aguarde atÃ© que a saÃ­da mostre `Succeeded` antes de prosseguir.

### Etapa 3: Atualizar emparelhamento hub-para-spoke para permitir trÃ¢nsito de gateway

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

A configuraÃ§Ã£o `useRemoteGateways` falharÃ¡ se a VNet hub nÃ£o tiver um gateway implantado e em estado de provisionamento `Succeeded`. VocÃª deve aguardar a conclusÃ£o da criaÃ§Ã£o do VPN Gateway antes de definir este flag no emparelhamento do spoke.

:::

### Etapa 5: Verificar a configuraÃ§Ã£o de trÃ¢nsito de gateway

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

O trÃ¢nsito de gateway permite que VNets spoke usem o gateway do hub como se fosse seu prÃ³prio. O lado do hub define `allowGatewayTransit=true` e cada spoke define `useRemoteGateways=true`. Uma VNet nÃ£o pode usar gateways remotos se jÃ¡ tiver seu prÃ³prio gateway implantado. O emparelhamento global suporta trÃ¢nsito de gateway apenas com gateways VpnGw1 ou superior (nÃ£o SKU Basic).

:::

---

## Tarefa 3: Demonstrar a nÃ£o transitividade do emparelhamento de VNet

O emparelhamento Ã© nÃ£o transitivo: mesmo que Spoke1 esteja emparelhado com Hub e Hub esteja emparelhado com Spoke2, Spoke1 nÃ£o consegue alcanÃ§ar Spoke2 automaticamente. Esta tarefa demonstra esse comportamento implantando VMs e verificando rotas efetivas.

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

ApÃ³s a VM ser provisionada, recupere as rotas efetivas para verificar quais destinos a VM spoke1 pode alcanÃ§ar:

```bash
az network nic show-effective-route-table \
    --resource-group rg-peering-lab \
    --name vm-spoke1VMNic \
    --output table
```

VocÃª verÃ¡ rotas para:
- `10.1.0.0/16` (VNet local) com prÃ³ximo salto `VnetLocal`
- `10.0.0.0/16` (VNet hub via emparelhamento) com prÃ³ximo salto `VNetPeering`

VocÃª NÃƒO verÃ¡ uma rota para `10.2.0.0/16` (spoke2). Isso confirma a nÃ£o transitividade: spoke1 pode alcanÃ§ar o hub, mas nÃ£o spoke2 atravÃ©s do hub.

### Etapa 4: Tentar conectividade do spoke1 para spoke2

```bash
az network watcher test-connectivity \
    --resource-group rg-peering-lab \
    --source-resource vm-spoke1 \
    --dest-address 10.2.1.4 \
    --dest-port 22
```

Este teste deve retornar `ConnectionStatus: Unreachable` porque nÃ£o hÃ¡ emparelhamento direto ou rota entre os dois spokes.

:::tip Nota para o exame

O emparelhamento de VNet Ã© sempre nÃ£o transitivo. Se VNet A estÃ¡ emparelhada com VNet B e VNet B estÃ¡ emparelhada com VNet C, VNet A nÃ£o tem caminho para VNet C a menos que vocÃª (a) emparelhe A diretamente com C, ou (b) roteie o trÃ¡fego atravÃ©s de um NVA ou Azure Firewall na VNet B usando UDRs (encadeamento de serviÃ§os).

:::

---

## Tarefa 4: Implementar encadeamento de serviÃ§os com UDRs

Habilite a comunicaÃ§Ã£o spoke-a-spoke roteando o trÃ¡fego atravÃ©s de um dispositivo virtual de rede (NVA) na VNet hub.

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

O NVA deve encaminhar pacotes que nÃ£o sÃ£o destinados a ele mesmo. Habilite o encaminhamento de IP na camada de rede do Azure:

```bash
az network nic update \
    --resource-group rg-peering-lab \
    --name vm-nvaVMNic \
    --ip-forwarding true
```

TambÃ©m habilite o encaminhamento de IP dentro da VM Linux:

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

Adicione uma rota direcionando o trÃ¡fego do spoke2 para o NVA:

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

### Etapa 5: Associar tabelas de rotas Ã s sub-redes spoke

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

VocÃª deve agora ver uma rota para `10.2.0.0/16` com tipo de prÃ³ximo salto `VirtualAppliance` e endereÃ§o de prÃ³ximo salto `10.0.1.4`.

### Etapa 7: Testar conectividade spoke-a-spoke

```bash
az network watcher test-connectivity \
    --resource-group rg-peering-lab \
    --source-resource vm-spoke1 \
    --dest-address 10.2.1.4 \
    --dest-port 22
```

O status da conexÃ£o deve agora mostrar `Reachable` (assumindo que os NSGs permitem o trÃ¡fego e o NVA estÃ¡ encaminhando pacotes).

:::warning Importante

Para que o encadeamento de serviÃ§os funcione, `--allow-forwarded-traffic` deve ser definido como `true` em AMBOS os lados de CADA conexÃ£o de emparelhamento. O trÃ¡fego do spoke1 destinado ao spoke2 entra no hub como trÃ¡fego encaminhado (jÃ¡ que o hub nÃ£o Ã© o destino original). Se `allowForwardedTraffic` for false no emparelhamento hub-para-spoke2, o hub nÃ£o encaminharÃ¡ esse trÃ¡fego para spoke2.

:::

---

## Tarefa 5: Configurar emparelhamento global de VNet

Crie uma VNet em uma regiÃ£o diferente e estabeleÃ§a emparelhamento global (entre regiÃµes) com o hub.

### Etapa 1: Criar uma VNet em uma segunda regiÃ£o

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

### Etapa 5: Implantar uma VM e testar latÃªncia

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

O trÃ¡fego de emparelhamento entre regiÃµes percorre a rede backbone da Microsoft. Espere latÃªncia mais alta (tipicamente 30-80ms entre Leste dos EUA e Oeste da Europa) comparado ao emparelhamento na mesma regiÃ£o (menos de 2ms).

:::tip Nota para o exame

O emparelhamento global de VNet suporta todos os recursos do emparelhamento regional com estas ressalvas: (1) VPN Gateways com SKU Basic nÃ£o suportam trÃ¢nsito de gateway sobre emparelhamento global (VpnGw1 ou superior Ã© necessÃ¡rio), (2) balanceadores de carga internos Basic nÃ£o sÃ£o acessÃ­veis sobre emparelhamento global (use SKU Standard), e (3) a largura de banda pode ser menor que o emparelhamento na mesma regiÃ£o dependendo dos tamanhos das VMs.

:::

---

## Tarefa 6: Verificar status do emparelhamento, rotas efetivas e conectividade

Confirme que a topologia geral funciona revisando o status do emparelhamento em todas as conexÃµes e validando a propagaÃ§Ã£o de rotas.

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

O NVA deve ver rotas para todas as VNets emparelhadas (10.1.0.0/16, 10.2.0.0/16, 10.3.0.0/16) com tipo de prÃ³ximo salto `VNetPeering` ou `VNetGlobalPeering`.

### Etapa 3: Verificar que spoke1 tem rotas para on-premises via trÃ¢nsito de gateway

Se o VPN Gateway aprendeu rotas locais (por exemplo, 192.168.0.0/16 via BGP), verifique se spoke1 as herda:

```bash
az network nic show-effective-route-table \
    --resource-group rg-peering-lab \
    --name vm-spoke1VMNic \
    --query "[?source=='VirtualNetworkGateway']" \
    --output table
```

Rotas aprendidas do gateway aparecerÃ£o com source `VirtualNetworkGateway` porque `useRemoteGateways=true` faz com que o spoke herde a tabela de rotas do gateway do hub.

### Etapa 4: Executar uma verificaÃ§Ã£o completa de conectividade

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

## CenÃ¡rios de quebra e correÃ§Ã£o

### CenÃ¡rio 1: Emparelhamento preso no estado "Initiated"

Um colega criou emparelhamento do hub para uma nova VNet spoke, mas o trÃ¡fego nÃ£o estÃ¡ fluindo. VocÃª verifica o estado do emparelhamento:

```bash
az network vnet peering show \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke1 \
    --query peeringState \
    --output tsv
```

SaÃ­da: `Initiated`

**Causa raiz:** O emparelhamento foi criado apenas no lado do hub. O emparelhamento reverso (spoke para hub) nunca foi criado.

**CorreÃ§Ã£o:** Crie o emparelhamento ausente no lado do spoke:

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke1 \
    --name spoke1-to-hub \
    --remote-vnet vnet-hub \
    --allow-vnet-access true \
    --allow-forwarded-traffic true
```

ApÃ³s ambos os lados existirem, o estado transiciona para `Connected` em ambos os emparelhamentos.

### CenÃ¡rio 2: TrÃ¢nsito de gateway falha no emparelhamento do spoke

VocÃª tenta habilitar `useRemoteGateways` em um emparelhamento de spoke, mas recebe um erro:

```text
"Cannot use remote gateways because the referenced virtual network has no gateways"
```

**Causa raiz:** O VPN Gateway na VNet hub ainda nÃ£o foi implantado ou ainda estÃ¡ em estado de provisionamento.

**CorreÃ§Ã£o:** Verifique se o gateway existe e estÃ¡ totalmente provisionado:

```bash
az network vnet-gateway show \
    --resource-group rg-peering-lab \
    --name vpngw-hub \
    --query provisioningState \
    --output tsv
```

Aguarde atÃ© que mostre `Succeeded`, depois tente novamente habilitar `useRemoteGateways`. Se o gateway nÃ£o existir, implante-o primeiro (veja Tarefa 2, Etapa 2).

### CenÃ¡rio 3: TrÃ¡fego spoke-a-spoke bloqueado apesar das UDRs

As tabelas de rotas estÃ£o corretamente configuradas apontando para o NVA, e o NVA tem encaminhamento de IP habilitado. No entanto, o trÃ¡fego do spoke1 para spoke2 ainda falha.

**Causa raiz:** O emparelhamento hub-para-spoke2 tem `allowForwardedTraffic` definido como `false`. O hub recebe o pacote do spoke1 e o roteia para o NVA, mas quando o NVA encaminha o pacote para spoke2, o emparelhamento o descarta porque trÃ¡fego encaminhado nÃ£o Ã© permitido.

**CorreÃ§Ã£o:** Atualize o emparelhamento para permitir trÃ¡fego encaminhado:

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke2 \
    --set allowForwardedTraffic=true
```

TambÃ©m verifique se o emparelhamento spoke2-para-hub permite trÃ¡fego encaminhado (necessÃ¡rio para o trÃ¡fego de retorno):

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke2 \
    --name spoke2-to-hub \
    --set allowForwardedTraffic=true
```

---

## Limpeza de recursos

Exclua o grupo de recursos para remover todos os recursos do laboratÃ³rio e parar de incorrer em cobranÃ§as (especialmente o VPN Gateway):

```bash
az group delete \
    --name rg-peering-lab \
    --yes \
    --no-wait
```

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-06-q1",
    question: "Você cria um peering de VNet de VNet-A para VNet-B, mas esquece de criar o peering reverso. Qual estado o peering mostrará na VNet-A?",
    options: [
      "Connected",
      "Initiated",
      "Disconnected",
      "Failed"
    ],
    correctIndex: 1,
    explanation: "Quando o peering é criado em apenas um lado, esse lado mostra o estado 'Initiated'. O peering não transicionará para 'Connected' até que o peering reverso também seja criado de VNet-B para VNet-A. O tráfego não flui no estado 'Initiated'."
  },
  {
    id: "az700-06-q2",
    question: "A Contoso tem uma topologia hub-spoke. Spoke1 faz peering com Hub e Hub faz peering com Spoke2. Uma VM no Spoke1 tenta alcançar uma VM no Spoke2. O que acontece?",
    options: [
      "O tráfego flui com sucesso porque ambos os spokes fazem peering com o mesmo hub",
      "O tráfego é bloqueado porque o peering de VNet é não-transitivo",
      "O tráfego flui, mas com o dobro da latência devido ao salto extra",
      "O tráfego é bloqueado pelas regras padrão do NSG"
    ],
    correctIndex: 1,
    explanation: "O peering de VNet é não-transitivo. Mesmo que Spoke1 faça peering com Hub e Hub faça peering com Spoke2, Spoke1 não tem rota para Spoke2. Você deve criar um peering direto entre os spokes ou implementar service chaining através de um NVA no hub usando UDRs."
  },
  {
    id: "az700-06-q3",
    question: "Você deseja que VNets spoke usem o VPN Gateway do hub para alcançar o on-premises. Qual combinação de configurações está correta?",
    options: [
      "Definir allowGatewayTransit=true no peering do spoke e useRemoteGateways=true no peering do hub",
      "Definir allowGatewayTransit=true no peering do hub e useRemoteGateways=true no peering do spoke",
      "Definir useRemoteGateways=true em ambos os lados do peering",
      "Definir allowGatewayTransit=true em ambos os lados do peering"
    ],
    correctIndex: 1,
    explanation: "O gateway transit requer que o lado hub (que possui o gateway) defina allowGatewayTransit=true, e o lado spoke defina useRemoteGateways=true. Isso permite que o spoke herde rotas aprendidas pelo gateway do hub."
  },
  {
    id: "az700-06-q4",
    question: "O service chaining através de um NVA em um hub requer qual configuração no peering hub-para-spoke?",
    options: [
      "allowVnetAccess=true",
      "allowGatewayTransit=true",
      "allowForwardedTraffic=true",
      "useRemoteGateways=true"
    ],
    correctIndex: 2,
    explanation: "Quando um NVA no hub encaminha pacotes para um spoke, esses pacotes são considerados 'tráfego encaminhado' (não se originaram da VNet hub). O peering hub-para-spoke deve ter allowForwardedTraffic=true para permitir esse tráfego. Sem isso, o peering descarta pacotes encaminhados."
  },
  {
    id: "az700-06-q5",
    question: "Você tenta definir useRemoteGateways=true em um peering de spoke, mas recebe um erro. Qual é a causa mais provável?",
    options: [
      "A VNet spoke já tem seu próprio VPN Gateway implantado",
      "A VNet hub não tem um gateway no estado de provisionamento Succeeded",
      "Tanto A quanto B são causas válidas para esse erro",
      "O peering está usando peering global (cross-region)"
    ],
    correctIndex: 2,
    explanation: "O flag useRemoteGateways falha se (a) a VNet remota não tem gateway implantado ou o gateway não está totalmente provisionado, ou (b) a VNet local já tem seu próprio gateway. Uma VNet não pode usar tanto seu próprio gateway quanto um gateway remoto simultaneamente."
  },
  {
    id: "az700-06-q6",
    question: "Qual SKU de VPN Gateway NÃO suporta gateway transit sobre peering global de VNet?",
    options: [
      "VpnGw1",
      "VpnGw2",
      "Basic",
      "VpnGw1AZ"
    ],
    correctIndex: 2,
    explanation: "O VPN Gateway SKU Basic não suporta gateway transit sobre peering global (cross-region) de VNet. Você deve usar VpnGw1 ou superior (equivalente ao SKU Standard ou acima) para que o gateway transit funcione entre regiões."
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
