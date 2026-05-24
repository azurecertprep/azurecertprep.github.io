---
sidebar_position: 9
title: "Desafio 09: Azure Route Server & Integração com NVA"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 09: Azure Route Server e integraÃ§Ã£o com NVA

:::info Tempo e custo estimados

**90-120 minutos** | **~$3-5/hora** (Route Server + VM NVA em execuÃ§Ã£o) | **Peso no exame: 10-15%**

:::

:::note PrÃ©-requisito

O Challenge 08 cobre rotas definidas pelo usuÃ¡rio e tunelamento forÃ§ado. Este desafio se baseia nessa fundaÃ§Ã£o, substituindo a manutenÃ§Ã£o estÃ¡tica de UDRs pela troca dinÃ¢mica de rotas BGP via Azure Route Server. CompreensÃ£o dos fundamentos de BGP (ASN, peering, anÃºncio de rotas) Ã© Ãºtil.

:::

## CenÃ¡rio

A Contoso implanta NVAs de terceiros (Cisco, Palo Alto) em sua VNet hub para inspeÃ§Ã£o de trÃ¡fego. Atualmente, toda vez que as rotas locais mudam, a equipe de rede precisa atualizar manualmente as UDRs. Eles querem implementar o Azure Route Server para estabelecer peering BGP entre os NVAs e a malha de roteamento do Azure, habilitando a troca dinÃ¢mica de rotas sem manutenÃ§Ã£o manual de UDRs.

**Topologia de rede:**

```text
On-Premises (172.16.0.0/16, 172.17.0.0/16)
        |
   VPN Gateway (ASN 65010)
        |
  Hub VNet (10.0.0.0/16)
   â”œâ”€â”€ GatewaySubnet (10.0.0.0/27)
   â”œâ”€â”€ RouteServerSubnet (10.0.1.0/26)
   â”œâ”€â”€ NVA Subnet (10.0.2.0/24) â€” NVA: 10.0.2.4
   â””â”€â”€ Management Subnet (10.0.3.0/24)
        |
  Peered to:
  Spoke VNet (10.1.0.0/16)
   â””â”€â”€ Workload Subnet (10.1.1.0/24) â€” VM: 10.1.1.4
```

## Objetivos de aprendizagem

ApÃ³s concluir este desafio, vocÃª serÃ¡ capaz de:

- Implantar o Azure Route Server em uma RouteServerSubnet dedicada
- Configurar peering BGP entre o Route Server e um NVA
- Verificar a propagaÃ§Ã£o de rotas do NVA para as redes virtuais do Azure
- Habilitar trÃ¢nsito branch-to-branch para troca de rotas entre VPN Gateway e NVA
- Inspecionar rotas efetivas nas NICs de VMs para confirmar rotas aprendidas dinamicamente
- Diagnosticar falhas de peering BGP e problemas de propagaÃ§Ã£o de rotas

## PrÃ©-requisitos

- Uma assinatura Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- CompreensÃ£o bÃ¡sica de conceitos BGP (ASN, peering, anÃºncio de rotas)
- Familiaridade com UDRs (do Challenge 08)

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| RouteServerSubnet | Sub-rede dedicada; tamanho mÃ­nimo /27; nÃ£o pode ter NSGs ou UDRs associados |
| ASN do Route Server | Fixo em 65515; nÃ£o pode ser alterado |
| RestriÃ§Ã£o de ASN do NVA | O NVA NÃƒO deve usar 65515, 65517, 65518, 65519 ou 65520 (reservados pelo Azure) |
| Limite de peers BGP | MÃ¡ximo de 16 peers BGP por Route Server |
| Limite de rotas por peer | MÃ¡ximo de 4.000 rotas por peer BGP (sessÃ£o cai se excedido) |
| Branch-to-branch | Quando habilitado, o Route Server troca rotas entre NVA e gateway VPN/ExpressRoute |
| Apenas plano de controle | O Route Server troca rotas BGP, mas NÃƒO estÃ¡ no caminho de dados |
| Peering de instÃ¢ncia dupla | O NVA deve fazer peering com ambas as instÃ¢ncias do Route Server para alta disponibilidade |
| PropagaÃ§Ã£o de rotas | Rotas aprendidas pelo Route Server sÃ£o propagadas para todas as VMs na VNet e VNets emparelhadas |
| Requisito de IP pÃºblico | O Route Server requer um IP pÃºblico SKU Standard para conectividade do plano de gerenciamento |

---

## Tarefa 1: Criar grupo de recursos e infraestrutura de rede

Configure a VNet hub com a RouteServerSubnet dedicada e a sub-rede do NVA.

### Etapa 1: Criar o grupo de recursos

```bash
az group create \
    --name rg-routeserver-lab \
    --location eastus2
```

### Etapa 2: Criar a rede virtual hub com RouteServerSubnet

A RouteServerSubnet deve ter pelo menos /27. O nome da sub-rede deve ser exatamente `RouteServerSubnet`.

```bash
az network vnet create \
    --resource-group rg-routeserver-lab \
    --name vnet-hub \
    --location eastus2 \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name RouteServerSubnet \
    --subnet-prefixes 10.0.1.0/26
```

### Etapa 3: Criar a sub-rede do NVA

```bash
az network vnet subnet create \
    --resource-group rg-routeserver-lab \
    --vnet-name vnet-hub \
    --name snet-nva \
    --address-prefixes 10.0.2.0/24
```

### Etapa 4: Criar a rede virtual spoke

```bash
az network vnet create \
    --resource-group rg-routeserver-lab \
    --name vnet-spoke \
    --location eastus2 \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name snet-workload \
    --subnet-prefixes 10.1.1.0/24
```

### Etapa 5: Emparelhar as VNets hub e spoke

Habilite "Use Remote Gateway or Route Server" no lado do spoke para que as rotas aprendidas pelo Route Server se propaguem para o spoke.

```bash
az network vnet peering create \
    --resource-group rg-routeserver-lab \
    --name hub-to-spoke \
    --vnet-name vnet-hub \
    --remote-vnet vnet-spoke \
    --allow-forwarded-traffic \
    --allow-gateway-transit

az network vnet peering create \
    --resource-group rg-routeserver-lab \
    --name spoke-to-hub \
    --vnet-name vnet-spoke \
    --remote-vnet vnet-hub \
    --allow-forwarded-traffic \
    --use-remote-gateways true
```

:::warning Importante

O flag `--use-remote-gateways true` no peering do spoke requer que um gateway ou Route Server exista na VNet hub. Se vocÃª criar o peering antes de implantar o Route Server, o comando pode falhar. Implante o Route Server primeiro (Tarefa 2) e depois crie o peering com esse flag, ou atualize o peering posteriormente.

:::

### Etapa 6: Implantar um NVA simulado (VM Linux com FRRouting)

```bash
az vm create \
    --resource-group rg-routeserver-lab \
    --name vm-nva \
    --location eastus2 \
    --image Ubuntu2204 \
    --size Standard_B2s \
    --vnet-name vnet-hub \
    --subnet snet-nva \
    --private-ip-address 10.0.2.4 \
    --public-ip-sku Standard \
    --admin-username azureuser \
    --generate-ssh-keys
```

Habilite o encaminhamento de IP na NIC do NVA (necessÃ¡rio para rotear trÃ¡fego):

```bash
NVA_NIC_ID=$(az vm show \
    --resource-group rg-routeserver-lab \
    --name vm-nva \
    --query "networkProfile.networkInterfaces[0].id" \
    --output tsv)

az network nic update \
    --ids "$NVA_NIC_ID" \
    --ip-forwarding true
```

### Etapa 7: Implantar uma VM de carga de trabalho no spoke

```bash
az vm create \
    --resource-group rg-routeserver-lab \
    --name vm-workload \
    --location eastus2 \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --vnet-name vnet-spoke \
    --subnet snet-workload \
    --private-ip-address 10.1.1.4 \
    --public-ip-sku Standard \
    --admin-username azureuser \
    --generate-ssh-keys
```

---

## Tarefa 2: Implantar o Azure Route Server

### Etapa 1: Criar um IP pÃºblico Standard para o Route Server

O Route Server requer um IP pÃºblico SKU Standard para conectividade do plano de gerenciamento.

```bash
az network public-ip create \
    --resource-group rg-routeserver-lab \
    --name pip-routeserver \
    --sku Standard \
    --version IPv4 \
    --location eastus2
```

### Etapa 2: Obter o ID de recurso da RouteServerSubnet

```bash
SUBNET_ID=$(az network vnet subnet show \
    --resource-group rg-routeserver-lab \
    --vnet-name vnet-hub \
    --name RouteServerSubnet \
    --query "id" \
    --output tsv)

echo $SUBNET_ID
```

### Etapa 3: Criar o Azure Route Server

```bash
az network routeserver create \
    --resource-group rg-routeserver-lab \
    --name rs-hub \
    --location eastus2 \
    --hosted-subnet "$SUBNET_ID" \
    --public-ip-address pip-routeserver
```

:::note Tempo de implantaÃ§Ã£o

A implantaÃ§Ã£o do Route Server pode levar de 15 a 30 minutos para ser concluÃ­da. O comando bloqueia atÃ© que o provisionamento termine.

:::

### Etapa 4: Verificar a implantaÃ§Ã£o do Route Server

```bash
az network routeserver show \
    --resource-group rg-routeserver-lab \
    --name rs-hub \
    --query "{name:name, provisioningState:provisioningState, virtualRouterAsn:virtualRouterAsn, virtualRouterIps:virtualRouterIps}" \
    --output table
```

A saÃ­da esperada mostra:
- `provisioningState`: Succeeded
- `virtualRouterAsn`: 65515 (fixo, nÃ£o pode ser alterado)
- `virtualRouterIps`: Dois endereÃ§os IP (ex.: 10.0.1.4 e 10.0.1.5) representando as duas instÃ¢ncias do Route Server

:::tip Nota para o exame

O Route Server sempre usa o ASN 65515. Ele expÃµe dois IPs de peer para alta disponibilidade. Seu NVA deve estabelecer sessÃµes BGP com AMBOS os IPs para garantir que as rotas sejam aprendidas corretamente mesmo durante manutenÃ§Ã£o.

:::

---

## Tarefa 3: Configurar peering BGP entre Route Server e NVA

### Etapa 1: Criar peering BGP no Route Server

Configure o Route Server para fazer peering com o NVA. O NVA usa ASN 65001 (nÃ£o deve conflitar com o 65515 do Route Server).

```bash
az network routeserver peering create \
    --resource-group rg-routeserver-lab \
    --routeserver rs-hub \
    --name peer-nva \
    --peer-ip 10.0.2.4 \
    --peer-asn 65001
```

### Etapa 2: Verificar se o peering foi criado

```bash
az network routeserver peering show \
    --resource-group rg-routeserver-lab \
    --routeserver rs-hub \
    --name peer-nva \
    --query "{name:name, peerAsn:peerAsn, peerIp:peerIp, provisioningState:provisioningState}" \
    --output table
```

### Etapa 3: Configurar FRRouting no NVA

Conecte-se via SSH na VM do NVA e instale o FRRouting para estabelecer a sessÃ£o BGP de volta ao Route Server. Use os dois IPs de peer do Route Server obtidos na Tarefa 2, Etapa 4.

```bash
ssh azureuser@<NVA_PUBLIC_IP>
```

Instale o FRRouting:

```bash
sudo apt update && sudo apt install -y frr

# Enable BGP daemon
sudo sed -i 's/bgpd=no/bgpd=yes/' /etc/frr/daemons

# Restart FRRouting
sudo systemctl restart frr
```

Configure o peering BGP com ambas as instÃ¢ncias do Route Server (substitua os IPs pelos IPs de peer do seu Route Server):

```bash
sudo vtysh
configure terminal

router bgp 65001
 bgp router-id 10.0.2.4
 no bgp ebgp-requires-policy
 neighbor 10.0.1.4 remote-as 65515
 neighbor 10.0.1.4 ebgp-multihop 2
 neighbor 10.0.1.5 remote-as 65515
 neighbor 10.0.1.5 ebgp-multihop 2

 address-family ipv4 unicast
  neighbor 10.0.1.4 soft-reconfiguration inbound
  neighbor 10.0.1.5 soft-reconfiguration inbound
  ! Advertise simulated on-prem routes
  network 172.16.0.0/16
  network 172.17.0.0/16
 exit-address-family

end
write memory
exit
```

:::note Por que ebgp-multihop

O Route Server e o NVA estÃ£o em sub-redes diferentes dentro da mesma VNet. Como eles nÃ£o estÃ£o diretamente conectados na Camada 2, Ã© necessÃ¡rio eBGP multi-hop. O Azure Route Server requer BGP externo multi-hop de todos os NVAs emparelhados.

:::

### Etapa 4: Verificar o status da sessÃ£o BGP no NVA

```bash
sudo vtysh -c "show bgp summary"
```

A saÃ­da esperada deve mostrar dois vizinhos estabelecidos (as duas instÃ¢ncias do Route Server) com o estado mostrando uma contagem de rotas em vez de "Active" ou "Connect".

---

## Tarefa 4: Verificar a propagaÃ§Ã£o de rotas

### Etapa 1: Visualizar rotas aprendidas pelo Route Server a partir do NVA

```bash
az network routeserver peering list-learned-routes \
    --resource-group rg-routeserver-lab \
    --routeserver rs-hub \
    --name peer-nva
```

A saÃ­da esperada inclui as rotas anunciadas pelo NVA: 172.16.0.0/16 e 172.17.0.0/16, com next hop 10.0.2.4 e AS path contendo 65001.

### Etapa 2: Visualizar rotas anunciadas pelo Route Server ao NVA

```bash
az network routeserver peering list-advertised-routes \
    --resource-group rg-routeserver-lab \
    --routeserver rs-hub \
    --name peer-nva
```

Isso mostra os espaÃ§os de endereÃ§o da VNet (10.0.0.0/16 e 10.1.0.0/16 do spoke emparelhado) que o Route Server anuncia ao NVA.

### Etapa 3: Verificar rotas efetivas na NIC da VM de carga de trabalho do spoke

As rotas anunciadas pelo NVA devem aparecer nas rotas efetivas das VMs na VNet hub e nas VNets spoke emparelhadas.

```bash
WORKLOAD_NIC_ID=$(az vm show \
    --resource-group rg-routeserver-lab \
    --name vm-workload \
    --query "networkProfile.networkInterfaces[0].id" \
    --output tsv)

az network nic show-effective-route-table \
    --ids "$WORKLOAD_NIC_ID" \
    --output table
```

Esperado: VocÃª deve ver entradas para 172.16.0.0/16 e 172.17.0.0/16 com tipo de next hop `VirtualAppliance` e endereÃ§o de next hop `10.0.2.4`. Essas rotas foram aprendidas dinamicamente via BGP atravÃ©s do Route Server, nÃ£o configuradas manualmente via UDR.

### Etapa 4: Confirmar com o next-hop do Network Watcher

```bash
az network watcher show-next-hop \
    --resource-group rg-routeserver-lab \
    --vm vm-workload \
    --source-ip 10.1.1.4 \
    --dest-ip 172.16.1.10
```

Esperado: o tipo de next hop Ã© `VirtualAppliance` com IP de next hop `10.0.2.4` (o NVA).

:::tip DiferenÃ§a-chave em relaÃ§Ã£o Ã s UDRs

Com o Route Server, essas rotas apareceram automaticamente quando o NVA as anunciou via BGP. Nenhuma criaÃ§Ã£o manual de tabela de rotas ou associaÃ§Ã£o de sub-rede foi necessÃ¡ria. Quando as rotas locais mudam, o NVA atualiza seu anÃºncio BGP e o Route Server propaga as mudanÃ§as automaticamente.

:::

---

## Tarefa 5: Habilitar trÃ¢nsito branch-to-branch

O branch-to-branch permite que o VPN Gateway e o NVA troquem rotas atravÃ©s do Route Server. Sem isso, o VPN Gateway nÃ£o aprende rotas anunciadas pelo NVA e vice-versa.

### Etapa 1: Habilitar trÃ¡fego branch-to-branch

```bash
az network routeserver update \
    --resource-group rg-routeserver-lab \
    --name rs-hub \
    --allow-b2b-traffic true
```

### Etapa 2: Verificar a configuraÃ§Ã£o

```bash
az network routeserver show \
    --resource-group rg-routeserver-lab \
    --name rs-hub \
    --query "{name:name, allowBranchToBranchTraffic:allowBranchToBranchTraffic}" \
    --output table
```

Esperado: `allowBranchToBranchTraffic` Ã© `true`.

### Etapa 3: Entender o efeito

Com branch-to-branch habilitado:
- Rotas do VPN Gateway (prefixos locais) sÃ£o compartilhadas com o NVA via Route Server
- Rotas do NVA sÃ£o compartilhadas com o VPN Gateway via Route Server
- O ambiente local pode aprender sobre rotas anunciadas pelo NVA e vice-versa

Sem branch-to-branch:
- O Route Server apenas propaga rotas do NVA para VMs na VNet e VNets emparelhadas
- VPN Gateway e NVA operam independentemente, sem troca de rotas entre eles

:::warning LimitaÃ§Ã£o

O nÃºmero total de rotas anunciadas do espaÃ§o de endereÃ§o da rede virtual e do Route Server em direÃ§Ã£o a um circuito ExpressRoute (quando o branch-to-branch estÃ¡ habilitado) nÃ£o deve exceder 1.000. Planeje seus anÃºncios de rotas cuidadosamente em ambientes com muitos prefixos.

:::

---

## Tarefa 6: Testar o comportamento de failover

Quando um NVA fica indisponÃ­vel, a sessÃ£o BGP cai e as rotas sÃ£o retiradas. Isso demonstra a natureza de autocorreÃ§Ã£o do roteamento dinÃ¢mico.

### Etapa 1: Confirmar que as rotas atuais existem

```bash
az network nic show-effective-route-table \
    --ids "$WORKLOAD_NIC_ID" \
    --output table | grep "172.16"
```

VocÃª deve ver a rota 172.16.0.0/16 com next hop 10.0.2.4.

### Etapa 2: Simular falha do NVA (parar a VM)

```bash
az vm deallocate \
    --resource-group rg-routeserver-lab \
    --name vm-nva
```

### Etapa 3: Aguardar a expiraÃ§Ã£o do hold timer BGP

O Route Server usa um timer de keepalive BGP de 60 segundos e um hold timer de 180 segundos. ApÃ³s aproximadamente 180 segundos sem mensagens de keepalive, a sessÃ£o BGP Ã© declarada como inativa e as rotas sÃ£o retiradas.

Aguarde 3-4 minutos e verifique as rotas efetivas novamente:

```bash
az network nic show-effective-route-table \
    --ids "$WORKLOAD_NIC_ID" \
    --output table | grep "172.16"
```

Esperado: As rotas 172.16.0.0/16 e 172.17.0.0/16 nÃ£o devem mais aparecer na tabela de rotas efetivas, demonstrando a retirada automÃ¡tica de rotas.

### Etapa 4: Restaurar o NVA e verificar a recuperaÃ§Ã£o de rotas

```bash
az vm start \
    --resource-group rg-routeserver-lab \
    --name vm-nva
```

ApÃ³s a VM inicializar e o FRRouting restabelecer a sessÃ£o BGP (aguarde 2-3 minutos para boot mais convergÃªncia BGP):

```bash
az network routeserver peering list-learned-routes \
    --resource-group rg-routeserver-lab \
    --routeserver rs-hub \
    --name peer-nva
```

As rotas devem reaparecer quando a sessÃ£o BGP for restabelecida.

:::tip Nota para o exame

O Route Server nÃ£o requer intervenÃ§Ã£o manual quando um NVA falha ou se recupera. Os timers BGP gerenciam o ciclo de vida da sessÃ£o automaticamente. Esta Ã© a principal vantagem sobre UDRs estÃ¡ticas, que requerem atualizaÃ§Ãµes manuais ou automaÃ§Ã£o personalizada via chamadas de API do Azure.

:::

---

## CenÃ¡rios de quebra e correÃ§Ã£o

Esses cenÃ¡rios representam configuraÃ§Ãµes incorretas comuns encontradas em produÃ§Ã£o e no exame.

### CenÃ¡rio 1: NVA usa ASN 65515

**Sintoma:** A criaÃ§Ã£o do peering BGP falha ou a sessÃ£o BGP nunca se estabelece.

**Causa raiz:** O NVA estÃ¡ configurado com ASN 65515, que Ã© o mesmo ASN usado pelo Route Server. O BGP requer ASNs diferentes para peering eBGP. O Azure reserva os ASNs 65515, 65517, 65518, 65519 e 65520.

**DiagnÃ³stico:**

```bash
az network routeserver peering show \
    --resource-group rg-routeserver-lab \
    --routeserver rs-hub \
    --name peer-nva \
    --query "peerAsn"
```

No NVA, verifique o ASN configurado:

```bash
sudo vtysh -c "show running-config" | grep "router bgp"
```

**CorreÃ§Ã£o:** Altere a configuraÃ§Ã£o BGP do NVA para usar um ASN nÃ£o reservado (ex.: 65001):

```bash
sudo vtysh
configure terminal
no router bgp 65515
router bgp 65001
 bgp router-id 10.0.2.4
 neighbor 10.0.1.4 remote-as 65515
 neighbor 10.0.1.4 ebgp-multihop 2
 neighbor 10.0.1.5 remote-as 65515
 neighbor 10.0.1.5 ebgp-multihop 2
end
write memory
```

Em seguida, atualize o peering do Route Server:

```bash
az network routeserver peering delete \
    --resource-group rg-routeserver-lab \
    --routeserver rs-hub \
    --name peer-nva \
    --yes

az network routeserver peering create \
    --resource-group rg-routeserver-lab \
    --routeserver rs-hub \
    --name peer-nva \
    --peer-ip 10.0.2.4 \
    --peer-asn 65001
```

### CenÃ¡rio 2: Rotas nÃ£o propagam para VNets spoke

**Sintoma:** As rotas do NVA aparecem nas rotas efetivas da VNet hub, mas nÃ£o na VNet spoke.

**Causa raiz:** O peering de VNet do lado do spoke nÃ£o tem "Use Remote Gateways or Route Server" habilitado.

**DiagnÃ³stico:**

```bash
az network vnet peering show \
    --resource-group rg-routeserver-lab \
    --vnet-name vnet-spoke \
    --name spoke-to-hub \
    --query "{useRemoteGateways:useRemoteGateways, allowForwardedTraffic:allowForwardedTraffic}" \
    --output table
```

Se `useRemoteGateways` for `false`, as rotas do Route Server nÃ£o sÃ£o propagadas para o spoke.

**CorreÃ§Ã£o:**

```bash
az network vnet peering update \
    --resource-group rg-routeserver-lab \
    --vnet-name vnet-spoke \
    --name spoke-to-hub \
    --use-remote-gateways true
```

Verifique tambÃ©m se o peering hub-to-spoke permite trÃ¢nsito de gateway:

```bash
az network vnet peering update \
    --resource-group rg-routeserver-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke \
    --allow-gateway-transit true
```

### CenÃ¡rio 3: VPN Gateway nÃ£o aprende rotas do NVA

**Sintoma:** O ambiente local nÃ£o consegue alcanÃ§ar destinos anunciados pelo NVA, mesmo que o NVA esteja emparelhado com o Route Server e as rotas estejam visÃ­veis na VNet.

**Causa raiz:** O trÃ¡fego branch-to-branch nÃ£o estÃ¡ habilitado no Route Server. Sem isso, o Route Server nÃ£o troca rotas entre o NVA e o VPN Gateway.

**DiagnÃ³stico:**

```bash
az network routeserver show \
    --resource-group rg-routeserver-lab \
    --name rs-hub \
    --query "allowBranchToBranchTraffic"
```

Se o resultado for `false`, as rotas nÃ£o sÃ£o trocadas entre o gateway e o NVA.

**CorreÃ§Ã£o:**

```bash
az network routeserver update \
    --resource-group rg-routeserver-lab \
    --name rs-hub \
    --allow-b2b-traffic true
```

---

## Limpeza

Remova todos os recursos criados neste desafio:

```bash
az group delete \
    --name rg-routeserver-lab \
    --yes \
    --no-wait
```

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-09-q1",
    question: "Qual é o ASN fixo usado pelo Azure Route Server e ele pode ser alterado?",
    options: [
      "ASN 65515; não pode ser alterado",
      "ASN 65515; pode ser alterado usando az network routeserver update",
      "ASN 65001; não pode ser alterado",
      "ASN 12076; é compartilhado com o ExpressRoute"
    ],
    correctIndex: 0,
    explanation: "O Azure Route Server sempre usa o ASN 65515. Este é um valor fixo que não pode ser modificado. NVAs que fazem peering com o Route Server devem usar um ASN diferente. O Azure reserva os ASNs 65515, 65517, 65518, 65519 e 65520 para uso interno."
  },
  {
    id: "az700-09-q2",
    question: "Qual é o tamanho mínimo de subnet necessário para a RouteServerSubnet?",
    options: [
      "/28 (16 endereços)",
      "/27 (32 endereços)",
      "/26 (64 endereços)",
      "/24 (256 endereços)"
    ],
    correctIndex: 1,
    explanation: "A RouteServerSubnet requer um tamanho mínimo de /27 (32 endereços). A subnet deve ser nomeada exatamente como 'RouteServerSubnet'. Ela não pode ter NSGs ou UDRs associadas."
  },
  {
    id: "az700-09-q3",
    question: "Um engenheiro de rede habilita o tráfego branch-to-branch no Route Server. O que isso realiza?",
    options: [
      "Permite que o tráfego de dados flua através do Route Server entre as filiais",
      "Habilita o Route Server a trocar rotas entre o NVA e o gateway VPN/ExpressRoute",
      "Cria um túnel VPN entre dois escritórios filiais",
      "Habilita o BGP no VPN Gateway automaticamente"
    ],
    correctIndex: 1,
    explanation: "O branch-to-branch habilita o Route Server a trocar rotas entre NVAs e gateways de rede virtual (VPN ou ExpressRoute). O Route Server permanece como um serviço apenas de plano de controle e não encaminha tráfego de dados. Os dados reais ainda fluem diretamente entre os endpoints."
  },
  {
    id: "az700-09-q4",
    question: "Um NVA tem peering com o Route Server e está anunciando rotas, mas as VMs da VNet spoke não veem as rotas na tabela de rotas efetivas. O peering hub-to-spoke tem allowGatewayTransit habilitado. Qual é a causa mais provável?",
    options: [
      "O Route Server não suporta propagação de rotas para VNets com peering",
      "O peering spoke-to-hub não tem 'Use Remote Gateways' habilitado",
      "O NVA não está anunciando rotas para ambas as instâncias do Route Server",
      "O branch-to-branch deve ser habilitado para propagação de rotas ao spoke"
    ],
    correctIndex: 1,
    explanation: "Para que o Route Server propague rotas para VNets spoke, o peering spoke-to-hub deve ter 'Use Remote Gateways or Route Server' habilitado (useRemoteGateways: true), e o peering hub-to-spoke deve ter 'Allow Gateway Transit' habilitado. Sem isso, as rotas ficam locais apenas na VNet hub."
  },
  {
    id: "az700-09-q5",
    question: "O que acontece com as rotas aprendidas dinamicamente quando o NVA cai e a sessão BGP com o Route Server é interrompida?",
    options: [
      "As rotas permanecem na tabela de rotas efetivas indefinidamente até serem removidas manualmente",
      "As rotas são retiradas após o hold timer do BGP expirar (180 segundos por padrão)",
      "As rotas são removidas imediatamente assim que o primeiro keepalive é perdido",
      "O Route Server converte as rotas BGP em UDRs estáticas como fallback"
    ],
    correctIndex: 1,
    explanation: "O Azure Route Server usa um keepalive timer BGP de 60 segundos e um hold timer de 180 segundos. Quando um NVA falha, a sessão BGP é declarada inativa após o hold timer expirar (3 keepalives perdidos). Nesse ponto, as rotas aprendidas desse peer são retiradas de todas as VMs na VNet e VNets com peering."
  },
  {
    id: "az700-09-q6",
    question: "O Azure Route Server fica no caminho de dados entre o NVA e as VMs de destino?",
    options: [
      "Sim, todo o tráfego é roteado através do Route Server para inspeção",
      "Sim, mas apenas para tráfego entre VNets com peering",
      "Não, o Route Server apenas troca rotas BGP (plano de controle); os dados fluem diretamente entre origem e destino",
      "Não, mas o Route Server atua como um load balancer para o tráfego do NVA"
    ],
    correctIndex: 2,
    explanation: "O Azure Route Server é um serviço apenas de plano de controle. Ele troca rotas BGP com NVAs e programa essas rotas na malha SDN do Azure, mas o tráfego de dados real flui diretamente entre a VM de origem e o NVA (ou destino). O Route Server nunca toca nos pacotes de dados."
  }
]} />
