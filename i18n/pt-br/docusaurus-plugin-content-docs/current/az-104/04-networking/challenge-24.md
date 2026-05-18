---
sidebar_position: 24
title: "Desafio 24: Rotas Definidas pelo Usuário & Controle de Tráfego"
---

# Desafio 24: Rotas Definidas pelo Usuário & Controle de Tráfego

:::info Tempo e Custo Estimados

**60-75 minutos** | **Custo estimado**: ~$0,25 | **Peso no Exame: 15-20%**

:::

## Cenário

A Contoso Ltd. possui uma topologia de rede hub-spoke no Azure. A equipe de segurança exige que todo o tráfego destinado à internet a partir das VNets spoke passe por um Network Virtual Appliance (NVA) central na VNet hub para inspeção e registro. Você deve implementar rotas definidas pelo usuário (UDRs) para substituir o roteamento padrão do Azure e impor esse padrão de fluxo de tráfego (túnel forçado).

## Habilidades do Exame Cobertas

- Criar e configurar tabelas de rotas
- Criar e configurar rotas definidas pelo usuário
- Associar tabelas de rotas a sub-redes
- Configurar túnel forçado (forced tunneling)
- Configurar tipos de próximo salto (Virtual Appliance, VNet Gateway, Internet, None)
- Diagnosticar problemas de roteamento usando rotas efetivas

## Referência Sysadmin ↔ Azure

| On-Prem / Tradicional | Equivalente no Azure |
|---|---|
| Rotas estáticas em roteadores | User-Defined Routes (UDRs) |
| Configuração de gateway padrão | Próximo salto na tabela de rotas |
| Roteador/Firewall como inspetor de tráfego | Network Virtual Appliance (NVA) |
| Roteamento baseado em política (PBR) | Tabela de rotas associada à sub-rede |
| Forçar tráfego através de proxy/firewall | Túnel forçado (Forced tunneling) |
| `ip route show` / `route print` | Visualização de rotas efetivas |
| Tabelas de rotas BGP | Propagação de rotas do VNet Gateway |

## Configuração Inicial

```bash
# Variables
RG="rg-az104-challenge24"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION
```

## Tarefas

### Tarefa 1: Criar Topologia de VNet Hub-Spoke

```bash
# Create Hub VNet
az network vnet create \
  --resource-group $RG \
  --name vnet-hub \
  --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-nva \
  --subnet-prefix 10.0.1.0/24

# Add a GatewaySubnet to hub (for VPN scenarios)
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub \
  --name GatewaySubnet \
  --address-prefix 10.0.255.0/27

# Create Spoke VNet
az network vnet create \
  --resource-group $RG \
  --name vnet-spoke \
  --address-prefix 10.1.0.0/16 \
  --subnet-name subnet-workload \
  --subnet-prefix 10.1.1.0/24

# Peer Hub to Spoke
az network vnet peering create \
  --resource-group $RG \
  --name hub-to-spoke \
  --vnet-name vnet-hub \
  --remote-vnet vnet-spoke \
  --allow-forwarded-traffic \
  --allow-gateway-transit

# Peer Spoke to Hub
az network vnet peering create \
  --resource-group $RG \
  --name spoke-to-hub \
  --vnet-name vnet-spoke \
  --remote-vnet vnet-hub \
  --allow-forwarded-traffic \
  --use-remote-gateways false
```

### Tarefa 2: Implantar um Network Virtual Appliance (NVA) Simulado

```bash
# Create NVA VM in the hub
az vm create \
  --resource-group $RG \
  --name vm-nva \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-hub \
  --subnet subnet-nva \
  --private-ip-address 10.0.1.4 \
  --public-ip-address nva-pip \
  --admin-username azureuser \
  --generate-ssh-keys

# Enable IP forwarding on the NVA NIC (critical for routing)
NVA_NIC=$(az vm show -g $RG -n vm-nva \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)
NVA_NIC_NAME=$(basename $NVA_NIC)

az network nic update \
  --resource-group $RG \
  --name $NVA_NIC_NAME \
  --ip-forwarding true

# Enable IP forwarding inside the VM OS
az vm run-command invoke \
  --resource-group $RG \
  --name vm-nva \
  --command-id RunShellScript \
  --scripts "sudo sysctl -w net.ipv4.ip_forward=1 && echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf && sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE"
```

:::tip Dica

Para que uma VM do Azure funcione como roteador/NVA, o encaminhamento de IP deve ser habilitado em DOIS níveis:
1. Nível da NIC do Azure (`az network nic update --ip-forwarding true`)
2. Nível do SO (`sysctl net.ipv4.ip_forward=1`)

Sem ambos, os pacotes encaminhados serão descartados.

:::
### Tarefa 3: Criar uma Tabela de Rotas

```bash
# Create a route table for the spoke subnet
az network route-table create \
  --resource-group $RG \
  --name rt-spoke-workload \
  --disable-bgp-route-propagation true

# Verify route table
az network route-table show \
  --resource-group $RG \
  --name rt-spoke-workload \
  --query "{Name:name, DisableBGP:disableBgpRoutePropagation}" -o table
```

:::tip Dica

Definir `--disable-bgp-route-propagation true` impede que rotas aprendidas via BGP (de gateways VPN/ExpressRoute) sejam injetadas na tabela de rotas. Isso lhe dá controle total sobre o roteamento para aquela sub-rede.

:::
### Tarefa 4: Criar Rotas Definidas pelo Usuário

```bash
# Route all internet traffic (0.0.0.0/0) through the NVA
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-workload \
  --name route-to-internet \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.4

# Route traffic to hub VNet through the NVA
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-workload \
  --name route-to-hub \
  --address-prefix 10.0.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.4

# Create a "black hole" route to drop traffic to a specific range
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-workload \
  --name route-block-range \
  --address-prefix 192.168.0.0/16 \
  --next-hop-type None

# List all routes in the table
az network route-table route list \
  --resource-group $RG \
  --route-table-name rt-spoke-workload -o table
```

### Tarefa 5: Associar Tabela de Rotas à Sub-rede

```bash
# Associate the route table with the spoke workload subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-spoke \
  --name subnet-workload \
  --route-table rt-spoke-workload

# Verify association
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name vnet-spoke \
  --name subnet-workload \
  --query "{Subnet:name, RouteTable:routeTable.id}" -o table
```

### Tarefa 6: Implantar uma VM de Carga de Trabalho e Verificar o Roteamento

```bash
# Create a workload VM in the spoke
az vm create \
  --resource-group $RG \
  --name vm-workload \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-spoke \
  --subnet subnet-workload \
  --public-ip-address workload-pip \
  --admin-username azureuser \
  --generate-ssh-keys

# Check effective routes on the workload VM NIC
WORKLOAD_NIC=$(az vm show -g $RG -n vm-workload \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)
WORKLOAD_NIC_NAME=$(basename $WORKLOAD_NIC)

az network nic show-effective-route-table \
  --resource-group $RG \
  --name $WORKLOAD_NIC_NAME -o table
```

### Tarefa 7: Verificar Rotas Efetivas e Diagnosticar

```bash
# Show effective routes (combines system routes + UDRs)
az network nic show-effective-route-table \
  --resource-group $RG \
  --name $WORKLOAD_NIC_NAME -o table

# Expected output should show:
# - 0.0.0.0/0 -> VirtualAppliance (10.0.1.4) [User route]
# - 10.0.0.0/16 -> VirtualAppliance (10.0.1.4) [User route]
# - 192.168.0.0/16 -> None [User route - black hole]
# - 10.1.0.0/16 -> VnetLocal [System route]
```

**Passos no Portal:**
1. Navegue até a NIC da VM > **Effective routes**
2. Compare rotas de Usuário vs rotas de Sistema
3. Observe que rotas de Usuário substituem rotas de Sistema para o mesmo prefixo

### Tarefa 8: Entender os Tipos de Próximo Salto

Crie rotas demonstrando cada tipo de próximo salto:

```bash
# Create a second route table for demonstration
az network route-table create \
  --resource-group $RG \
  --name rt-demo-nexthops

# Next-hop: VirtualAppliance (send to a specific IP | firewall/NVA)
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-demo-nexthops \
  --name demo-virtual-appliance \
  --address-prefix 172.16.0.0/12 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.4

# Next-hop: VnetGateway (send to VPN/ExpressRoute gateway)
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-demo-nexthops \
  --name demo-vnet-gateway \
  --address-prefix 192.168.100.0/24 \
  --next-hop-type VirtualNetworkGateway

# Next-hop: Internet (override to force direct internet path)
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-demo-nexthops \
  --name demo-internet \
  --address-prefix 203.0.113.0/24 \
  --next-hop-type Internet

# Next-hop: None (black hole | drop traffic)
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-demo-nexthops \
  --name demo-drop \
  --address-prefix 10.99.0.0/16 \
  --next-hop-type None

# List all demo routes
az network route-table route list \
  --resource-group $RG \
  --route-table-name rt-demo-nexthops -o table
```

### Tarefa 9: Implementar Túnel Forçado

:::tip Dica

O túnel forçado redireciona todo o tráfego destinado à internet (0.0.0.0/0) do Azure de volta para on-premises via um gateway VPN ou através de um NVA. Isso garante que todo o tráfego seja inspecionado antes de alcançar a internet.

:::
```bash
# Forced tunneling via UDR is already in place (Task 4):
# route-to-internet: 0.0.0.0/0 -> VirtualAppliance (10.0.1.4)

# For VPN-based forced tunneling, you would:
# 1. Create a VPN Gateway in the hub
# 2. Configure the default route (0.0.0.0/0) via BGP from on-premises
# 3. OR create a UDR with next-hop VirtualNetworkGateway

# Verify forced tunneling is active
az network nic show-effective-route-table \
  --resource-group $RG \
  --name $WORKLOAD_NIC_NAME \
  --query "[?addressPrefix[0]=='0.0.0.0/0']" -o table
```

## Critérios de Sucesso

- [ ] Topologia de VNet hub-spoke criada com peering
- [ ] VM NVA implantada com encaminhamento de IP habilitado (NIC + nível do SO)
- [ ] Tabela de rotas criada com propagação BGP desabilitada
- [ ] UDR para tráfego de internet (0.0.0.0/0) apontando para NVA
- [ ] UDR para tráfego cross-VNet apontando para NVA
- [ ] Rota black hole (próximo salto None) configurada
- [ ] Tabela de rotas associada à sub-rede spoke
- [ ] Rotas efetivas mostram UDRs substituindo rotas de sistema
- [ ] Todos os tipos de próximo salto compreendidos e demonstrados

## Cenários de Quebrar & Consertar

### Cenário A: Encaminhamento de IP do NVA Ausente

```bash
# Disable IP forwarding on the NVA NIC
az network nic update \
  --resource-group $RG \
  --name $NVA_NIC_NAME \
  --ip-forwarding false

# Try to reach the internet from the workload VM: it will fail
# because packets reach the NVA but are dropped (not forwarded)

# Diagnosis: Check NIC IP forwarding setting
az network nic show -g $RG -n $NVA_NIC_NAME \
  --query "enableIPForwarding"

# Fix: Re-enable IP forwarding
az network nic update \
  --resource-group $RG \
  --name $NVA_NIC_NAME \
  --ip-forwarding true
```

### Cenário B: Endereço IP de Próximo Salto Incorreto

```bash
# Create a route with wrong NVA IP
az network route-table route update \
  --resource-group $RG \
  --route-table-name rt-spoke-workload \
  --name route-to-internet \
  --next-hop-ip-address 10.0.1.99

# Traffic is now sent to a non-existent IP: packets are black-holed
# Diagnosis: Check effective routes and verify next-hop IP exists
# Fix: Update to correct NVA IP (10.0.1.4)
az network route-table route update \
  --resource-group $RG \
  --route-table-name rt-spoke-workload \
  --name route-to-internet \
  --next-hop-ip-address 10.0.1.4
```

### Cenário C: Tabela de Rotas Não Associada

```bash
# Disassociate route table from subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-spoke \
  --name subnet-workload \
  --remove routeTable

# Traffic now uses default system routes (direct to internet)
# Diagnosis: Check subnet configuration
az network vnet subnet show -g $RG --vnet-name vnet-spoke -n subnet-workload \
  --query "routeTable"

# Fix: Re-associate
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-spoke \
  --name subnet-workload \
  --route-table rt-spoke-workload
```

## Verificação de Conhecimento

**1. Qual é a ordem de precedência de rotas no Azure?**

<details>
<summary>Mostrar Resposta</summary>

A seleção de rotas segue a correspondência de prefixo mais longo. Quando múltiplas rotas correspondem ao mesmo prefixo:
1. **Rotas Definidas pelo Usuário (UDRs)** | maior prioridade
2. **Rotas BGP** | de gateways VPN/ExpressRoute
3. **Rotas de sistema** | rotas padrão do Azure

Dentro da mesma origem, o prefixo mais específico (correspondência mais longa) vence.
</details>

**2. Quais são as rotas de sistema padrão do Azure?**

<details>
<summary>Mostrar Resposta</summary>

Toda sub-rede recebe automaticamente estas rotas de sistema:
| Prefixo | Próximo Salto |
|--------|----------|
| Espaço de endereço da VNet | VNet Local |
| 0.0.0.0/0 | Internet |
| 10.0.0.0/8 | None (descartar) |
| 172.16.0.0/12 | None (descartar) |
| 192.168.0.0/16 | None (descartar) |
| 100.64.0.0/10 | None (descartar) |

As rotas "None" do RFC 1918 são substituídas quando você cria sub-redes nesses intervalos.
</details>

**3. O que acontece quando o NVA (próximo salto) está indisponível?**

<details>
<summary>Mostrar Resposta</summary>

Se a VM do NVA estiver parada ou a NIC estiver inativa, o tráfego roteado para ela é **descartado** (black-holed). O Azure NÃO faz failover automaticamente para a rota de sistema. Por isso, implantações de NVA em produção devem usar:
- Load balancer na frente de múltiplas instâncias de NVA
- Azure Firewall (gerenciado, HA por padrão)
- Health probes para detectar falha do NVA
</details>

**4. Qual é a diferença entre desabilitar a propagação de rotas BGP e mantê-la habilitada?**

<details>
<summary>Mostrar Resposta</summary>

- **Habilitada (padrão):** Rotas aprendidas via BGP de gateways VPN/ExpressRoute são automaticamente adicionadas às rotas efetivas da sub-rede. Rotas on-premises ficam visíveis.
- **Desabilitada:** Rotas aprendidas via BGP NÃO são injetadas. Apenas UDRs e rotas de sistema se aplicam. Use quando quiser controle total e não quiser que rotas do gateway interfiram no seu roteamento personalizado.
</details>

## Limpeza

```bash
# Delete all resources
az group delete --name $RG --yes --no-wait

echo "Resources are being deleted in the background."
```

## Recursos de Aprendizagem

- [Roteamento de tráfego de rede virtual](https://learn.microsoft.com/azure/virtual-network/virtual-networks-udr-overview)
- [Criar e gerenciar tabelas de rotas](https://learn.microsoft.com/azure/virtual-network/manage-route-table)
- [Topologia de rede hub-spoke](https://learn.microsoft.com/azure/architecture/reference-architectures/hybrid-networking/hub-spoke)
- [Túnel forçado](https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-forced-tunneling-rm)
- [Diagnóstico de roteamento de tráfego de rede virtual](https://learn.microsoft.com/azure/network-watcher/network-watcher-next-hop-overview)
