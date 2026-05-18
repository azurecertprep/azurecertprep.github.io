---
sidebar_position: 1
title: "Challenge 11 | Virtual Networks & Subnets"
---

# Desafio 11: Virtual Networks & Subnets

:::info Tempo Estimado & Custo

**45–60 minutos** | **~$0,10** (VMs para teste, desaloque rapidamente) | 📊 **Peso no exame: 15–20%**
:::

## Cenário

A Contoso está construindo uma arquitetura multi-camada com uma topologia de rede hub-spoke. A VNet hub contém serviços compartilhados (firewalls, DNS), enquanto as VNets spoke hospedam cargas de trabalho de aplicações. Você precisa projetar a rede com segmentação adequada, peering e roteamento | e depois provar que tudo funciona com testes de conectividade.

## Habilidades do Exame Cobertas

| Habilidade | Peso |
|------------|------|
| Criar e configurar VNets e subnets | Alto |
| Configurar VNet peering | Alto |
| Configurar endereços IP públicos | Médio |
| Configurar rotas definidas pelo usuário (UDRs) | Alto |
| Solucionar problemas de conectividade de rede | Alto |

## Referência Sysadmin ↔ Azure

| Tradicional | Equivalente no Azure |
|-------------|---------------------|
| VLANs | Subnets dentro de uma VNet |
| Roteamento inter-VLAN | VNet peering |
| Rotas estáticas em um roteador | User-Defined Routes (UDRs) |
| Link WAN dedicado entre sites | VNet peering (backbone privado) |
| `ping` / `traceroute` | Network Watcher (IP flow verify, next hop) |
| Diagrama de rede | Visualização de topologia VNet no Network Watcher |

## Tarefas

### Tarefa 1: Criar a VNet Hub

```bash
# Create a resource group
az group create --name rg-network-lab --location eastus

# Create the Hub VNet with two subnets
az network vnet create \
  --resource-group rg-network-lab \
  --name vnet-hub \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-frontend \
  --subnet-prefix 10.0.1.0/24

# Add a backend subnet
az network vnet subnet create \
  --resource-group rg-network-lab \
  --vnet-name vnet-hub \
  --name snet-backend \
  --address-prefix 10.0.2.0/24

# Verify the VNet
az network vnet show -g rg-network-lab -n vnet-hub \
  --query "{Name:name, AddressSpace:addressSpace.addressPrefixes, Subnets:subnets[].{Name:name, Prefix:addressPrefix}}" -o json
```

### Tarefa 2: Criar a VNet Spoke

```bash
# Create the Spoke VNet
az network vnet create \
  --resource-group rg-network-lab \
  --name vnet-spoke \
  --address-prefix 10.1.0.0/16 \
  --subnet-name snet-workloads \
  --subnet-prefix 10.1.1.0/24

# Verify
az network vnet list -g rg-network-lab -o table
```

### Tarefa 3: Criar VNet Peering Bidirecional

```bash
# Get VNet resource IDs
HUB_ID=$(az network vnet show -g rg-network-lab -n vnet-hub --query id -o tsv)
SPOKE_ID=$(az network vnet show -g rg-network-lab -n vnet-spoke --query id -o tsv)

# Create peering: Hub → Spoke
az network vnet peering create \
  --resource-group rg-network-lab \
  --name hub-to-spoke \
  --vnet-name vnet-hub \
  --remote-vnet $SPOKE_ID \
  --allow-vnet-access true \
  --allow-forwarded-traffic true

# Create peering: Spoke → Hub
az network vnet peering create \
  --resource-group rg-network-lab \
  --name spoke-to-hub \
  --vnet-name vnet-spoke \
  --remote-vnet $HUB_ID \
  --allow-vnet-access true \
  --allow-forwarded-traffic true

# Verify peering status (should be "Connected")
az network vnet peering list -g rg-network-lab --vnet-name vnet-hub -o table
az network vnet peering list -g rg-network-lab --vnet-name vnet-spoke -o table
```

### Tarefa 4: Implantar VMs e Testar Conectividade

```bash
# Deploy a VM in the Hub VNet
az vm create \
  --resource-group rg-network-lab \
  --name vm-hub \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-hub \
  --subnet snet-frontend \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address pip-hub \
  --no-wait

# Deploy a VM in the Spoke VNet
az vm create \
  --resource-group rg-network-lab \
  --name vm-spoke \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-spoke \
  --subnet snet-workloads \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address pip-spoke \
  --no-wait

# Wait for both VMs to be created, then get private IPs
az vm list -g rg-network-lab \
  --query "[].{Name:name, PrivateIP:privateIps, PublicIP:publicIps}" -d -o table

# SSH into vm-hub and ping vm-spoke's private IP
HUB_PUBLIC_IP=$(az vm show -g rg-network-lab -n vm-hub -d --query publicIps -o tsv)
SPOKE_PRIVATE_IP=$(az vm show -g rg-network-lab -n vm-spoke -d --query privateIps -o tsv)

echo "SSH into hub: ssh azureuser@$HUB_PUBLIC_IP"
echo "Then ping spoke: ping $SPOKE_PRIVATE_IP"
```

<details>
<summary>💡 Dica | Se o ping não funcionar</summary>

ICMP (ping) pode estar bloqueado pelo NSG padrão. Permita ICMP:
```bash
# Get the NSG name associated with the spoke VM's NIC
NSG_NAME=$(az network nsg list -g rg-network-lab --query "[?contains(name,'spoke')].name" -o tsv)

az network nsg rule create \
  --resource-group rg-network-lab \
  --nsg-name $NSG_NAME \
  --name AllowICMP \
  --priority 100 \
  --protocol Icmp \
  --direction Inbound \
  --access Allow
```
</details>

### Tarefa 5: Criar um IP Público

```bash
# Create a static Standard public IP
az network public-ip create \
  --resource-group rg-network-lab \
  --name pip-static-web \
  --sku Standard \
  --allocation-method Static \
  --version IPv4

# Show the IP address
az network public-ip show -g rg-network-lab -n pip-static-web \
  --query "{Name:name, IP:ipAddress, SKU:sku.name, Method:publicIpAllocationMethod}" -o table
```

### Tarefa 6: Criar uma Rota Definida pelo Usuário (UDR)

```bash
# Create a route table
az network route-table create \
  --resource-group rg-network-lab \
  --name rt-spoke-to-hub

# Add a route that forces spoke traffic to hub's frontend subnet
# to go through a simulated NVA (vm-hub's private IP)
HUB_PRIVATE_IP=$(az vm show -g rg-network-lab -n vm-hub -d --query privateIps -o tsv)

az network route-table route create \
  --resource-group rg-network-lab \
  --route-table-name rt-spoke-to-hub \
  --name route-via-hub-nva \
  --address-prefix 10.0.1.0/24 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $HUB_PRIVATE_IP

# Associate the route table with the spoke subnet
az network vnet subnet update \
  --resource-group rg-network-lab \
  --vnet-name vnet-spoke \
  --name snet-workloads \
  --route-table rt-spoke-to-hub

# Verify the route table association
az network vnet subnet show -g rg-network-lab \
  --vnet-name vnet-spoke -n snet-workloads \
  --query "routeTable.id" -o tsv
```

### Tarefa 7: Usar o Network Watcher para Solucionar Problemas

```bash
# Enable Network Watcher (usually auto-enabled)
az network watcher configure \
  --resource-group NetworkWatcherRG \
  --locations eastus \
  --enabled true 2>/dev/null || true

# IP Flow Verify: check if traffic from spoke VM to hub VM is allowed
az network watcher test-ip-flow \
  --resource-group rg-network-lab \
  --vm vm-spoke \
  --direction Outbound \
  --protocol TCP \
  --local "$SPOKE_PRIVATE_IP:*" \
  --remote "$HUB_PRIVATE_IP:80"

# Next Hop: check where traffic from spoke goes
az network watcher show-next-hop \
  --resource-group rg-network-lab \
  --vm vm-spoke \
  --source-ip $SPOKE_PRIVATE_IP \
  --dest-ip $HUB_PRIVATE_IP

# Show effective routes on the spoke VM's NIC
SPOKE_NIC=$(az vm show -g rg-network-lab -n vm-spoke \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)

az network nic show-effective-route-table \
  --ids $SPOKE_NIC -o table
```

## ✅ Critérios de Sucesso

- [ ] VNet Hub (10.0.0.0/16) com subnets frontend e backend
- [ ] VNet Spoke (10.1.0.0/16) com subnet de workloads
- [ ] VNet peering bidirecional mostrando status "Connected"
- [ ] VMs conseguem fazer ping entre si por IPs privados através do peering
- [ ] IP público estático criado
- [ ] UDR força o tráfego spoke-para-hub a passar por um IP de appliance virtual
- [ ] Network Watcher IP flow verify e next hop retornam resultados esperados

## Cenários de Quebre & Conserte

### Cenário A: Espaços de Endereço Sobrepostos
```bash
# Try to create a VNet with overlapping address space and peer it
az network vnet create -g rg-network-lab \
  --name vnet-overlap --address-prefix 10.0.0.0/16 \
  --subnet-name default --subnet-prefix 10.0.3.0/24

az network vnet peering create -g rg-network-lab \
  --name hub-to-overlap --vnet-name vnet-hub \
  --remote-vnet vnet-overlap --allow-vnet-access true
# What error do you get? Why can't overlapping VNets be peered?
```

### Cenário B: Next Hop Inválido
```bash
# Create a UDR with a next hop IP that doesn't exist
az network route-table route create \
  --resource-group rg-network-lab \
  --route-table-name rt-spoke-to-hub \
  --name route-to-nowhere \
  --address-prefix 192.168.0.0/24 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.99.99.99
# The route is created but traffic to 192.168.0.0/24 will blackhole. How do you diagnose?
```

### Cenário C: Peering Unidirecional
```bash
# Delete only one side of the peering
az network vnet peering delete -g rg-network-lab \
  --vnet-name vnet-hub --name hub-to-spoke
# Check the peering status on vnet-spoke:
az network vnet peering show -g rg-network-lab \
  --vnet-name vnet-spoke --name spoke-to-hub \
  --query peeringState -o tsv
# What state is it in? Can traffic still flow?
```

## 📝 Teste seus Conhecimentos

**1. Qual é a diferença entre VNet peering e um VPN gateway?**

<details>
<summary>Mostrar Resposta</summary>

| Recurso | VNet Peering | VPN Gateway |
|---------|-------------|-------------|
| **Latência** | Muito baixa (backbone do Azure) | Maior (túnel criptografado) |
| **Largura de banda** | Sem limite (largura de banda da rede) | Até ~1,25 Gbps |
| **Criptografia** | Não criptografado (backbone privado) | Criptografado com IPSec |
| **Entre regiões** | ✅ (peering global) | ✅ |
| **Entre assinaturas** | ✅ | ✅ |
| **On-premises** | ❌ | ✅ |
| **Custo** | Entrada + saída por GB | Gateway + saída por GB |
| **Transitividade** | Não transitivo por padrão | Suporta roteamento transitivo |
</details>

**2. Quando você deve usar User-Defined Routes (UDRs)?**

<details>
<summary>Mostrar Resposta</summary>

Use UDRs quando precisar substituir as rotas de sistema padrão do Azure:
- **Forçar tráfego por um NVA** (firewall, IDS/IPS) para inspeção
- **Rotear tráfego para um VPN gateway** para conectividade on-premises
- **Bloquear tráfego (black-hole)** definindo next hop como "None"
- **Substituir rotas de peering** para forçar tráfego por um hub central
- **Substituir rotas BGP** quando precisar preferir um caminho específico

Sem UDRs, o Azure usa rotas de sistema que roteiam automaticamente entre subnets, VNets com peering e a internet.
</details>

**3. Qual é a diferença entre rotas de sistema e rotas personalizadas?**

<details>
<summary>Mostrar Resposta</summary>

- **Rotas de sistema**: Criadas automaticamente pelo Azure. Cobrem o espaço de endereço da VNet, VNets com peering, gateways VPN/ExpressRoute e rota padrão para internet (0.0.0.0/0). Você não pode excluí-las.
- **Rotas personalizadas (UDRs)**: Criadas por você via tabelas de rota. Substituem rotas de sistema para o mesmo prefixo (correspondência de prefixo mais longo, depois personalizada > sistema). Aplicadas no nível da subnet.
- **Rotas BGP**: Propagadas do on-premises via VPN/ExpressRoute. Podem ser substituídas por UDRs.

Prioridade: UDR > BGP > Rotas de sistema (para o mesmo prefixo).
</details>

**4. Como funciona o IP flow verify do Network Watcher?**

<details>
<summary>Mostrar Resposta</summary>

O IP flow verify verifica se um pacote é permitido ou negado simulando as regras do NSG aplicadas à NIC e subnet de uma VM:

1. Você especifica: VM, direção (entrada/saída), protocolo, IP:porta local, IP:porta remoto
2. Ele avalia as regras NSG tanto no **NSG no nível da NIC** quanto no **NSG no nível da subnet**
3. Retorna: Permitir ou Negar, além do nome específico da regra NSG que correspondeu

Ele **não** verifica UDRs, firewalls ou NVAs | apenas regras NSG. Para problemas de roteamento, use "Next Hop".
</details>

## 🧹 Limpeza

```bash
# Delete all resources
az group delete --name rg-network-lab --yes --no-wait

echo "Resources are being deleted in the background."
echo "VMs will stop billing immediately upon resource group deletion."
```
