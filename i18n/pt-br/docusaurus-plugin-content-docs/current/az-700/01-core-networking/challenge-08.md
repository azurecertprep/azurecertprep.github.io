---
sidebar_position: 8
title: "Desafio 08: Rotas Definidas pelo Usuário & Túnel Forçado"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 08: Rotas definidas pelo usuÃ¡rio e tunelamento forÃ§ado

:::info Tempo e custo estimados

**90-120 minutos** | **~$2-4/hora** (VMs de NVA em execuÃ§Ã£o) | **Peso no exame: 15-20%**

:::

:::note PrÃ©-requisito

O Challenge 24 do AZ-104 cobre conceitos bÃ¡sicos de UDR (criar uma tabela de rotas, adicionar uma Ãºnica rota, associar a uma sub-rede). Este desafio se baseia nessa fundaÃ§Ã£o com tunelamento forÃ§ado empresarial, roteamento multi-caminho, controle de propagaÃ§Ã£o de rotas BGP e soluÃ§Ã£o de problemas de rotas efetivas.

:::

## CenÃ¡rio

A equipe de seguranÃ§a da Contoso exige que TODO o trÃ¡fego destinado Ã  internet das VNets spoke do Azure passe por um firewall centralizado de Network Virtual Appliance (NVA) na VNet hub para inspeÃ§Ã£o. AlÃ©m disso, trÃ¡fego especÃ­fico destinado a redes locais deve usar NVAs diferentes com base no destino. A equipe de rede deve implementar roteamento multi-caminho com UDRs, configurar tunelamento forÃ§ado para conformidade e solucionar conflitos de roteamento entre rotas aprendidas por BGP e UDRs estÃ¡ticas.

**Topologia de rede:**

```text
On-Premises (192.168.0.0/16)
        |
   VPN Gateway (with BGP)
        |
  Hub VNet (10.0.0.0/16)
   â”œâ”€â”€ GatewaySubnet (10.0.0.0/27)
   â”œâ”€â”€ NVA-A Subnet (10.0.1.0/24) â€” NVA-A: 10.0.1.4
   â””â”€â”€ NVA-B Subnet (10.0.2.0/24) â€” NVA-B: 10.0.2.4
        |
  Peered to:
  Spoke VNet (10.1.0.0/16)
   â”œâ”€â”€ Workload Subnet (10.1.1.0/24)
   â””â”€â”€ App Subnet (10.1.2.0/24)
```

## Objetivos de aprendizagem

ApÃ³s concluir este desafio, vocÃª serÃ¡ capaz de:

- Criar tabelas de rotas com propagaÃ§Ã£o de rotas BGP desabilitada
- Implementar tunelamento forÃ§ado usando UDRs com prefixo 0.0.0.0/0
- Configurar roteamento multi-caminho com diferentes NVAs por destino
- Habilitar encaminhamento de IP nas interfaces de rede da NVA
- Analisar rotas efetivas para verificar o comportamento do roteamento
- Usar o Network Watcher next-hop para diagnosticar problemas de roteamento
- Resolver conflitos entre rotas aprendidas por BGP e UDRs

## PrÃ©-requisitos

- Uma assinatura do Azure com acesso de Contribuidor
- Azure CLI instalado e autenticado (`az login`)
- Network Watcher habilitado na regiÃ£o de destino
- CompreensÃ£o bÃ¡sica de conceitos de roteamento (do Challenge 24 do AZ-104)

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| Prioridade de rota | UDR > BGP > Rotas do sistema |
| CorrespondÃªncia de prefixo mais longo | O prefixo mais especÃ­fico sempre vence, independentemente da origem |
| Tunelamento forÃ§ado | 0.0.0.0/0 next-hop para VirtualAppliance ou VNetGateway |
| PropagaÃ§Ã£o BGP | Quando desabilitada em uma tabela de rotas, rotas BGP nÃ£o sÃ£o injetadas naquela sub-rede |
| Encaminhamento de IP | Deve ser habilitado na NIC da NVA; caso contrÃ¡rio, o Azure descarta pacotes encaminhados |
| Next-hop VirtualAppliance | Deve referenciar um IP em uma sub-rede diretamente acessÃ­vel |

---

## Tarefa 1: Criar grupo de recursos e infraestrutura de rede

Configure a topologia hub-spoke com sub-redes de NVA.

### Etapa 1: Criar o grupo de recursos

```bash
az group create \
    --name rg-routing-lab \
    --location eastus2
```

### Etapa 2: Criar a rede virtual hub com sub-redes de NVA

```bash
az network vnet create \
    --resource-group rg-routing-lab \
    --name vnet-hub \
    --location eastus2 \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name snet-nva-a \
    --subnet-prefixes 10.0.1.0/24

az network vnet subnet create \
    --resource-group rg-routing-lab \
    --vnet-name vnet-hub \
    --name snet-nva-b \
    --address-prefixes 10.0.2.0/24

az network vnet subnet create \
    --resource-group rg-routing-lab \
    --vnet-name vnet-hub \
    --name GatewaySubnet \
    --address-prefixes 10.0.0.0/27
```

### Etapa 3: Criar a rede virtual spoke

```bash
az network vnet create \
    --resource-group rg-routing-lab \
    --name vnet-spoke \
    --location eastus2 \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name snet-workload \
    --subnet-prefixes 10.1.1.0/24

az network vnet subnet create \
    --resource-group rg-routing-lab \
    --vnet-name vnet-spoke \
    --name snet-app \
    --address-prefixes 10.1.2.0/24
```

### Etapa 4: Emparelhar as VNets hub e spoke

```bash
az network vnet peering create \
    --resource-group rg-routing-lab \
    --name hub-to-spoke \
    --vnet-name vnet-hub \
    --remote-vnet vnet-spoke \
    --allow-forwarded-traffic \
    --allow-gateway-transit

az network vnet peering create \
    --resource-group rg-routing-lab \
    --name spoke-to-hub \
    --vnet-name vnet-spoke \
    --remote-vnet vnet-hub \
    --allow-forwarded-traffic \
    --use-remote-gateways false
```

### Etapa 5: Implantar VMs de NVA simuladas (Linux com encaminhamento de IP)

```bash
az vm create \
    --resource-group rg-routing-lab \
    --name vm-nva-a \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --vnet-name vnet-hub \
    --subnet snet-nva-a \
    --private-ip-address 10.0.1.4 \
    --public-ip-address pip-nva-a \
    --admin-username azureuser \
    --generate-ssh-keys \
    --no-wait

az vm create \
    --resource-group rg-routing-lab \
    --name vm-nva-b \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --vnet-name vnet-hub \
    --subnet snet-nva-b \
    --private-ip-address 10.0.2.4 \
    --public-ip-address pip-nva-b \
    --admin-username azureuser \
    --generate-ssh-keys \
    --no-wait
```

### Etapa 6: Implantar uma VM de carga de trabalho no spoke

```bash
az vm create \
    --resource-group rg-routing-lab \
    --name vm-workload \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --vnet-name vnet-spoke \
    --subnet snet-workload \
    --private-ip-address 10.1.1.4 \
    --public-ip-address pip-workload \
    --admin-username azureuser \
    --generate-ssh-keys
```

---

## Tarefa 2: Criar tabelas de rotas com propagaÃ§Ã£o BGP desabilitada

Em topologias hub-spoke empresariais, vocÃª normalmente desabilita a propagaÃ§Ã£o de rotas BGP nas sub-redes spoke para que as rotas locais aprendidas via gateway VPN/ExpressRoute nÃ£o substituam suas UDRs.

### Etapa 1: Criar uma tabela de rotas com propagaÃ§Ã£o BGP desabilitada

```bash
az network route-table create \
    --resource-group rg-routing-lab \
    --name rt-spoke-workload \
    --location eastus2 \
    --disable-bgp-route-propagation true
```

O parÃ¢metro `--disable-bgp-route-propagation true` impede que rotas aprendidas por BGP sejam injetadas nesta tabela de rotas. Isso Ã© crÃ­tico quando vocÃª deseja que as UDRs assumam controle total das decisÃµes de roteamento.

### Etapa 2: Criar uma segunda tabela de rotas para a sub-rede de aplicaÃ§Ã£o

```bash
az network route-table create \
    --resource-group rg-routing-lab \
    --name rt-spoke-app \
    --location eastus2 \
    --disable-bgp-route-propagation true
```

### Etapa 3: Verificar a configuraÃ§Ã£o da tabela de rotas

```bash
az network route-table show \
    --resource-group rg-routing-lab \
    --name rt-spoke-workload \
    --query "{Name:name, DisableBgp:disableBgpRoutePropagation}" \
    --output table
```

A saÃ­da esperada mostra `DisableBgp: true`.

:::tip Nota para o exame

Quando `disableBgpRoutePropagation` Ã© definido como `true`, rotas BGP do VPN Gateway ou ExpressRoute NÃƒO sÃ£o propagadas para a sub-rede. Isso significa que as Ãºnicas rotas disponÃ­veis sÃ£o rotas do sistema e suas UDRs explÃ­citas. Se vocÃª ainda precisar que a sub-rede alcance a rede local, vocÃª deve adicionar UDRs explÃ­citas para esses prefixos.

:::

---

## Tarefa 3: Adicionar UDRs para tunelamento forÃ§ado

O tunelamento forÃ§ado envia todo o trÃ¡fego destinado Ã  internet (0.0.0.0/0) para uma NVA ou gateway VPN em vez de diretamente para a internet. Este Ã© um requisito de conformidade para muitas organizaÃ§Ãµes.

### Etapa 1: Adicionar a rota de tunelamento forÃ§ado (rota padrÃ£o para NVA-A)

```bash
az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-workload \
    --name route-forced-tunnel \
    --address-prefix 0.0.0.0/0 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4
```

Esta rota substitui a rota padrÃ£o do sistema (0.0.0.0/0 para Internet) e forÃ§a todo o trÃ¡fego destinado Ã  internet atravÃ©s da NVA-A em 10.0.1.4.

### Etapa 2: Adicionar rotas especÃ­ficas para diferentes destinos locais

Rotear trÃ¡fego para diferentes NVAs com base na sub-rede de destino local:

```bash
# Traffic to on-prem subnet 192.168.1.0/24 goes via NVA-A
az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-workload \
    --name route-onprem-site-a \
    --address-prefix 192.168.1.0/24 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4

# Traffic to on-prem subnet 192.168.2.0/24 goes via NVA-B
az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-workload \
    --name route-onprem-site-b \
    --address-prefix 192.168.2.0/24 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.2.4
```

### Etapa 3: Adicionar rotas Ã  tabela de rotas da sub-rede de aplicaÃ§Ã£o

```bash
az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-app \
    --name route-forced-tunnel \
    --address-prefix 0.0.0.0/0 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4

az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-app \
    --name route-onprem-site-a \
    --address-prefix 192.168.1.0/24 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4

az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-app \
    --name route-onprem-site-b \
    --address-prefix 192.168.2.0/24 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.2.4
```

### Etapa 4: Listar rotas na tabela para verificar

```bash
az network route-table route list \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-workload \
    --output table
```

:::tip Nota para o exame

Os valores vÃ¡lidos de `--next-hop-type` sÃ£o: `VirtualAppliance`, `VNetGateway`, `VNetLocal`, `Internet` e `None`. O tipo `VirtualAppliance` requer que `--next-hop-ip-address` seja especificado. O tipo `None` descarta o trÃ¡fego (rota blackhole).

:::

---

## Tarefa 4: Associar tabelas de rotas Ã s sub-redes spoke

Uma tabela de rotas nÃ£o tem efeito atÃ© ser associada a uma ou mais sub-redes. Cada sub-rede pode ter no mÃ¡ximo uma tabela de rotas associada.

### Etapa 1: Associar tabela de rotas Ã  sub-rede de carga de trabalho

```bash
az network vnet subnet update \
    --resource-group rg-routing-lab \
    --vnet-name vnet-spoke \
    --name snet-workload \
    --route-table rt-spoke-workload
```

### Etapa 2: Associar tabela de rotas Ã  sub-rede de aplicaÃ§Ã£o

```bash
az network vnet subnet update \
    --resource-group rg-routing-lab \
    --vnet-name vnet-spoke \
    --name snet-app \
    --route-table rt-spoke-app
```

### Etapa 3: Verificar a associaÃ§Ã£o

```bash
az network vnet subnet show \
    --resource-group rg-routing-lab \
    --vnet-name vnet-spoke \
    --name snet-workload \
    --query "routeTable.id" \
    --output tsv
```

:::warning Importante

ApÃ³s associar a tabela de rotas de tunelamento forÃ§ado, as VMs na sub-rede perderÃ£o o acesso direto Ã  internet. O trÃ¡fego de saÃ­da para a internet serÃ¡ roteado para a NVA. Se a NVA nÃ£o estiver configurada para encaminhar ou fazer NAT deste trÃ¡fego, a conectividade serÃ¡ interrompida. Este Ã© o comportamento esperado para tunelamento forÃ§ado.

:::

---

## Tarefa 5: Habilitar encaminhamento de IP nas NICs da NVA

Por padrÃ£o, o Azure descarta pacotes que nÃ£o sÃ£o endereÃ§ados ao IP prÃ³prio de uma NIC. Para que uma NVA encaminhe trÃ¡fego entre sub-redes, o encaminhamento de IP deve ser habilitado no nÃ­vel da plataforma Azure (no recurso de NIC) e dentro do sistema operacional convidado.

### Etapa 1: Habilitar encaminhamento de IP na NIC da NVA-A (nÃ­vel da plataforma Azure)

```bash
az network nic update \
    --resource-group rg-routing-lab \
    --name vm-nva-aVMNic \
    --ip-forwarding true
```

### Etapa 2: Habilitar encaminhamento de IP na NIC da NVA-B

```bash
az network nic update \
    --resource-group rg-routing-lab \
    --name vm-nva-bVMNic \
    --ip-forwarding true
```

:::note Encontrando o nome da NIC

Se vocÃª nÃ£o tem certeza do nome da NIC, recupere-o a partir da VM:

```bash
az vm show \
    --resource-group rg-routing-lab \
    --name vm-nva-a \
    --query "networkProfile.networkInterfaces[0].id" \
    --output tsv
```

:::

### Etapa 3: Verificar se o encaminhamento de IP estÃ¡ habilitado

```bash
az network nic show \
    --resource-group rg-routing-lab \
    --name vm-nva-aVMNic \
    --query "enableIPForwarding" \
    --output tsv
```

SaÃ­da esperada: `true`

### Etapa 4: Habilitar encaminhamento de IP dentro do sistema operacional convidado (Linux)

Conecte-se via SSH em cada NVA e habilite o encaminhamento no nÃ­vel do kernel:

```bash
# On the NVA VM (via SSH):
sudo sysctl -w net.ipv4.ip_forward=1

# Make persistent across reboots:
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

:::tip Nota para o exame

O encaminhamento de IP deve ser habilitado em DOIS lugares: (1) no recurso de NIC do Azure usando `az network nic update --ip-forwarding true`, e (2) dentro do sistema operacional convidado. A ausÃªncia de qualquer um deles faz com que a NVA descarte pacotes encaminhados silenciosamente.

:::

---

## Tarefa 6: Verificar rotas efetivas e diagnosticar com o Network Watcher

As rotas efetivas mostram o resultado combinado de rotas do sistema, UDRs e rotas aprendidas por BGP. Esta Ã© a principal ferramenta de soluÃ§Ã£o de problemas para questÃµes de roteamento.

### Etapa 1: Visualizar rotas efetivas na NIC da VM de carga de trabalho

```bash
az network nic show-effective-route-table \
    --resource-group rg-routing-lab \
    --name vm-workloadVMNic \
    --output table
```

A saÃ­da esperada deve mostrar:
- `0.0.0.0/0` com next hop `VirtualAppliance` e IP `10.0.1.4` (origem: User)
- `192.168.1.0/24` com next hop `VirtualAppliance` e IP `10.0.1.4` (origem: User)
- `192.168.2.0/24` com next hop `VirtualAppliance` e IP `10.0.2.4` (origem: User)
- `10.1.0.0/16` com next hop `VNetLocal` (origem: Default)

### Etapa 2: Usar o Network Watcher next-hop para testar trÃ¡fego destinado Ã  internet

```bash
az network watcher show-next-hop \
    --resource-group rg-routing-lab \
    --vm vm-workload \
    --source-ip 10.1.1.4 \
    --dest-ip 8.8.8.8
```

Resultado esperado: `nextHopType: VirtualAppliance`, `nextHopIpAddress: 10.0.1.4` â€” confirmando que o tunelamento forÃ§ado estÃ¡ ativo.

### Etapa 3: Testar roteamento para o site A local

```bash
az network watcher show-next-hop \
    --resource-group rg-routing-lab \
    --vm vm-workload \
    --source-ip 10.1.1.4 \
    --dest-ip 192.168.1.10
```

Esperado: next hop Ã© `VirtualAppliance` com IP `10.0.1.4` (NVA-A).

### Etapa 4: Testar roteamento para o site B local

```bash
az network watcher show-next-hop \
    --resource-group rg-routing-lab \
    --vm vm-workload \
    --source-ip 10.1.1.4 \
    --dest-ip 192.168.2.10
```

Esperado: next hop Ã© `VirtualAppliance` com IP `10.0.2.4` (NVA-B).

### Etapa 5: Testar roteamento para um endereÃ§o da VNet hub (deve usar emparelhamento de VNet diretamente)

```bash
az network watcher show-next-hop \
    --resource-group rg-routing-lab \
    --vm vm-workload \
    --source-ip 10.1.1.4 \
    --dest-ip 10.0.1.4
```

Esperado: tipo de next hop Ã© `VNetPeering` (trÃ¡fego para a VNet emparelhada usa o link de emparelhamento, nÃ£o a UDR, porque 10.0.0.0/16 nÃ£o tem UDR explÃ­cita e a rota do sistema cuida disso).

:::tip Nota para o exame

O comando `az network watcher show-next-hop` requer que a VM esteja em execuÃ§Ã£o. Ele avalia o roteamento da perspectiva da NIC de uma VM especÃ­fica. O parÃ¢metro `--nic` Ã© necessÃ¡rio apenas se a VM tiver mÃºltiplas NICs com encaminhamento de IP habilitado.

:::

---

## CenÃ¡rios de quebra e correÃ§Ã£o

Esses cenÃ¡rios representam configuraÃ§Ãµes incorretas comuns que vocÃª encontrarÃ¡ em produÃ§Ã£o e no exame.

### CenÃ¡rio 1: NVA descarta pacotes encaminhados

**Sintoma:** VMs na sub-rede spoke nÃ£o conseguem alcanÃ§ar a internet mesmo que a UDR esteja configurada corretamente.

**Causa raiz:** O encaminhamento de IP nÃ£o estÃ¡ habilitado na NIC da NVA no nÃ­vel da plataforma Azure.

**DiagnÃ³stico:**

```bash
az network nic show \
    --resource-group rg-routing-lab \
    --name vm-nva-aVMNic \
    --query "enableIPForwarding"
```

Se a saÃ­da for `false`, pacotes que chegam Ã  NVA destinados a outros IPs sÃ£o descartados silenciosamente.

**CorreÃ§Ã£o:**

```bash
az network nic update \
    --resource-group rg-routing-lab \
    --name vm-nva-aVMNic \
    --ip-forwarding true
```

### CenÃ¡rio 2: Acesso Ã  internet completamente interrompido

**Sintoma:** A rota de tunelamento forÃ§ado (0.0.0.0/0 para VirtualAppliance) estÃ¡ configurada, mas a NVA estÃ¡ desligada ou nÃ£o estÃ¡ fazendo NAT.

**Causa raiz:** Quando o tunelamento forÃ§ado estÃ¡ ativo, todo o trÃ¡fego de internet deve passar pela NVA. Se a NVA estiver inativa, nÃ£o hÃ¡ caminho para a internet.

**DiagnÃ³stico:**

```bash
# Check NVA status
az vm get-instance-view \
    --resource-group rg-routing-lab \
    --name vm-nva-a \
    --query "instanceView.statuses[1].displayStatus" \
    --output tsv

# Verify the effective route still points to the NVA
az network watcher show-next-hop \
    --resource-group rg-routing-lab \
    --vm vm-workload \
    --source-ip 10.1.1.4 \
    --dest-ip 8.8.8.8
```

**CorreÃ§Ã£o:** Inicie a NVA, ou remova temporariamente a rota de tunelamento forÃ§ado:

```bash
az network route-table route delete \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-workload \
    --name route-forced-tunnel
```

### CenÃ¡rio 3: Roteamento assimÃ©trico

**Sintoma:** O trÃ¡fego flui de saÃ­da pela NVA, mas o trÃ¡fego de retorno a contorna, fazendo com que regras de firewall stateful descartem os pacotes de retorno.

**Causa raiz:** Uma UDR existe na sub-rede spoke (direÃ§Ã£o de saÃ­da), mas nenhuma UDR existe na sub-rede hub para o trÃ¡fego de retorno da NVA de volta ao spoke.

**DiagnÃ³stico:** Verifique as rotas efetivas na NIC da NVA. Se o caminho de retorno para 10.1.0.0/16 usa apenas a rota do sistema (emparelhamento de VNet), a NVA pode rotear o trÃ¡fego de retorno corretamente. No entanto, se a NVA envia trÃ¡fego para o spoke e hÃ¡ um salto intermediÃ¡rio, vocÃª precisa de UDRs para o caminho de retorno tambÃ©m.

**CorreÃ§Ã£o:** Adicione uma tabela de rotas Ã  sub-rede da NVA com rotas para trÃ¡fego de retorno (se necessÃ¡rio), ou garanta que a NVA seja o primeiro e Ãºltimo salto para fluxos inspecionados.

### CenÃ¡rio 4: Rota BGP substitui UDR

**Sintoma:** VocÃª configurou uma UDR para 192.168.1.0/24 apontando para NVA-A, mas o trÃ¡fego vai pelo VPN Gateway porque uma rota aprendida por BGP existe para o mesmo prefixo.

**Causa raiz:** A propagaÃ§Ã£o de rotas BGP estÃ¡ habilitada na tabela de rotas (`disableBgpRoutePropagation: false`).

**DiagnÃ³stico:**

```bash
az network route-table show \
    --resource-group rg-routing-lab \
    --name rt-spoke-workload \
    --query "disableBgpRoutePropagation"
```

Se `false`, rotas BGP estÃ£o sendo propagadas. No entanto, observe que UDRs devem substituir rotas BGP para o mesmo prefixo. O problema real Ã© tipicamente que a rota BGP tem um prefixo MAIS ESPECÃFICO (por exemplo, 192.168.1.0/25 do BGP vs. 192.168.1.0/24 da UDR).

**CorreÃ§Ã£o:** Desabilite a propagaÃ§Ã£o BGP ou adicione uma UDR mais especÃ­fica:

```bash
# Option 1: Disable BGP propagation
az network route-table update \
    --resource-group rg-routing-lab \
    --name rt-spoke-workload \
    --disable-bgp-route-propagation true

# Option 2: Add a more specific route matching the BGP prefix
az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-workload \
    --name route-onprem-site-a-specific \
    --address-prefix 192.168.1.0/25 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4
```

---

## Aprofundamento na seleÃ§Ã£o de rotas

Entender como o Azure seleciona rotas Ã© crÃ­tico para o exame AZ-700:

| Prioridade | Origem da rota | Exemplo |
|------------|---------------|---------|
| 1 (mais alta) | Rota definida pelo usuÃ¡rio (UDR) | Rota personalizada na tabela de rotas |
| 2 | Rota BGP | Rota aprendida do gateway VPN/ExpressRoute |
| 3 (mais baixa) | Rota do sistema | Rotas padrÃ£o do Azure (VNet, Internet, etc.) |

**Dentro do mesmo nÃ­vel de prioridade**, a correspondÃªncia de prefixo mais longo vence. Uma rota /25 Ã© mais especÃ­fica que uma rota /24 e serÃ¡ preferida independentemente da origem.

**Casos especiais:**
- Se uma UDR e uma rota BGP tÃªm o MESMO prefixo, a UDR vence
- Se o BGP anuncia um prefixo MAIS ESPECÃFICO que sua UDR, a rota BGP vence devido Ã  correspondÃªncia de prefixo mais longo
- Desabilitar a propagaÃ§Ã£o BGP remove completamente as rotas BGP da consideraÃ§Ã£o

---

## Limpeza

Remova todos os recursos criados neste desafio:

```bash
az group delete \
    --name rg-routing-lab \
    --yes \
    --no-wait
```

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-08-q1",
    question: "Uma UDR para 192.168.0.0/16 aponta para NVA-A, e uma rota aprendida via BGP para 192.168.1.0/24 aponta para o VPN Gateway. Para onde vai o tráfego destinado a 192.168.1.100?",
    options: [
      "NVA-A, porque UDRs sempre sobrescrevem rotas BGP",
      "VPN Gateway, porque a rota BGP tem uma correspondência de prefixo mais longa (mais específica)",
      "O tráfego é descartado por causa de um conflito de roteamento",
      "Ambos os caminhos são usados com roteamento equal-cost multi-path"
    ],
    correctIndex: 1,
    explanation: "A correspondência de prefixo mais longo sempre vence, independentemente da origem da rota. A rota BGP para 192.168.1.0/24 é mais específica que a UDR para 192.168.0.0/16, então o tráfego para 192.168.1.100 segue a rota BGP até o VPN Gateway. Para sobrescrever isso, adicione uma UDR com um prefixo igual ou mais específico que /24."
  },
  {
    id: "az700-08-q2",
    question: "Você configura tunelamento forçado (0.0.0.0/0 para um VirtualAppliance) em uma subnet spoke, mas as VMs ainda não conseguem acessar a internet. O NVA está em execução e tem IP forwarding habilitado no nível do SO. Qual é a causa mais provável?",
    options: [
      "A tabela de rotas não está associada à subnet",
      "O IP forwarding não está habilitado no recurso de NIC do Azure",
      "O VNet peering não permite tráfego encaminhado",
      "O Network Watcher não está habilitado na região"
    ],
    correctIndex: 1,
    explanation: "O IP forwarding deve ser habilitado em dois lugares: no recurso de NIC do Azure (az network nic update --ip-forwarding true) E dentro do SO convidado. Se apenas o encaminhamento no nível do SO estiver habilitado, mas não a configuração da NIC do Azure, o Azure descarta os pacotes não endereçados à NIC antes que eles cheguem à VM."
  },
  {
    id: "az700-08-q3",
    question: "O que a configuração --disable-bgp-route-propagation true em uma tabela de rotas faz?",
    options: [
      "Impede que a tabela de rotas seja anunciada para o on-premises via BGP",
      "Impede que rotas BGP aprendidas dos gateways VPN/ExpressRoute sejam injetadas nas subnets associadas",
      "Desabilita o BGP no VPN Gateway",
      "Remove todas as rotas do sistema da subnet"
    ],
    correctIndex: 1,
    explanation: "Quando a propagação de rotas BGP é desabilitada em uma tabela de rotas, as rotas aprendidas via BGP (do VPN Gateway ou ExpressRoute) NÃO são propagadas para as subnets associadas a essa tabela de rotas. A subnet só vê rotas do sistema e UDRs explícitas. Isso dá controle completo sobre o roteamento sem interferência do BGP."
  },
  {
    id: "az700-08-q4",
    question: "Você precisa que o tráfego da subnet spoke A alcance a rede on-premises 192.168.1.0/24 via NVA-A e 192.168.2.0/24 via NVA-B. A propagação BGP está desabilitada. Quantas rotas devem existir na tabela de rotas (mínimo) para conseguir isso mais o tunelamento forçado?",
    options: [
      "1 (apenas a rota padrão cobre tudo)",
      "2 (uma para cada prefixo on-premises)",
      "3 (rota padrão para tunelamento forçado, mais uma rota por destino on-premises)",
      "4 (rota padrão, duas rotas on-premises e uma rota de retorno)"
    ],
    correctIndex: 2,
    explanation: "Você precisa de no mínimo três rotas: (1) 0.0.0.0/0 para NVA-A para tunelamento forçado do tráfego de internet, (2) 192.168.1.0/24 para NVA-A para tráfego do site A, e (3) 192.168.2.0/24 para NVA-B para tráfego do site B. As rotas on-premises são mais específicas que 0.0.0.0/0 e farão correspondência primeiro para esses destinos."
  },
  {
    id: "az700-08-q5",
    question: "Qual comando az CLI você usaria para determinar o próximo salto (next hop) para o tráfego saindo de uma VM com destino a 8.8.8.8?",
    options: [
      "az network nic show-effective-route-table --name vmNic --resource-group rg",
      "az network watcher show-next-hop --vm myVm --source-ip 10.1.1.4 --dest-ip 8.8.8.8 --resource-group rg",
      "az network route-table route list --route-table-name rt --resource-group rg",
      "az network vnet subnet show --name subnet --vnet-name vnet --resource-group rg"
    ],
    correctIndex: 1,
    explanation: "O comando az network watcher show-next-hop avalia o roteamento a partir de uma VM específica e retorna o tipo e endereço IP do próximo salto real para o tráfego destinado a um dado destino. Ele considera todas as fontes de rotas (UDR, BGP, sistema). A tabela de rotas efetivas mostra todas as rotas, mas não avalia qual vence para um destino específico."
  },
  {
    id: "az700-08-q6",
    question: "Uma tabela de rotas tem uma UDR para 10.0.0.0/8 com next-hop-type None (blackhole). Uma VM na subnet associada tenta acessar 10.5.1.1. O que acontece?",
    options: [
      "O tráfego é roteado via VNet peering porque as rotas do sistema têm prioridade mais alta",
      "O tráfego é descartado porque a UDR com next-hop None tem prioridade sobre as rotas do sistema",
      "O tráfego é enviado para a internet como fallback",
      "Um erro é retornado para a aplicação imediatamente"
    ],
    correctIndex: 1,
    explanation: "Uma UDR com next-hop-type None cria uma rota blackhole que descarta o tráfego correspondente. UDRs têm prioridade mais alta que rotas do sistema (incluindo rotas de VNet peering), então o pacote é descartado silenciosamente. Nenhum ICMP unreachable é retornado ao remetente por padrão."
  }
]} />

---

## Recursos adicionais

- [Virtual network traffic routing](https://learn.microsoft.com/azure/virtual-network/virtual-networks-udr-overview)
- [Create, change, or delete a route table](https://learn.microsoft.com/azure/virtual-network/manage-route-table)
- [Diagnose a VM network routing problem - CLI](https://learn.microsoft.com/azure/network-watcher/diagnose-vm-network-routing-problem-cli)
- [Configure forced tunneling](https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-forced-tunneling-rm)
- [Hub-spoke network topology in Azure](https://learn.microsoft.com/azure/architecture/networking/architecture/hub-spoke)
