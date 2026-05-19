---
sidebar_position: 26
title: "Desafio 26: Network Watcher & Diagnósticos"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 26: Network watcher & diagnósticos

:::info Tempo e Custo Estimados

**60-75 minutos** | **Custo estimado**: ~$0,20 | **Peso no Exame: 10-15%**

:::

## Cenário

A Contoso Ltd. está solucionando problemas de conectividade entre suas VMs do Azure e serviços externos. A equipe de rede precisa usar ferramentas de diagnóstico do Azure para identificar por que certas conexões falham, verificar se as regras NSG estão corretas, rastrear fluxos de pacotes e configurar monitoramento contínuo. Você deve se tornar proficiente com o kit completo de ferramentas do Network Watcher.

## Habilidades do exame cobertas

- Habilitar e usar o Azure Network Watcher
- Usar IP Flow Verify para testar regras NSG
- Usar Next Hop para diagnosticar roteamento
- Configurar e usar Packet Capture
- Configurar Connection Monitor
- Analisar NSG flow logs
- Usar a visualização de topologia do Network Watcher
- Verificar regras de segurança efetivas

## Referência sysadmin ↔ Azure

| On-Prem / Tradicional | Equivalente no Azure |
|---|---|
| Wireshark / tcpdump | Network Watcher Packet Capture |
| traceroute / tracert | Análise de Next Hop |
| iptables -L / netsh advfirewall show | IP Flow Verify / Regras de Segurança Efetivas |
| Verificações de conectividade Nagios / PRTG | Connection Monitor |
| Logs NetFlow / sFlow | NSG Flow Logs |
| Diagrama de topologia de rede (Visio) | Network Watcher Topology |
| ping / telnet para testar portas | Connection Troubleshoot |

## Configuração inicial

```bash
# Variables
RG="rg-az104-challenge26"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Create VNet with subnets
az network vnet create \
  --resource-group $RG \
  --name vnet-diag \
  --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-web \
  --subnet-prefix 10.0.1.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-diag \
  --name subnet-db \
  --address-prefix 10.0.2.0/24

# Create NSG with rules
az network nsg create --resource-group $RG --name nsg-web
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name AllowHTTP \
  --priority 100 \
  --source-address-prefixes "*" \
  --destination-port-ranges 80 443 \
  --protocol Tcp \
  --access Allow

az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name DenySSHFromInternet \
  --priority 200 \
  --source-address-prefixes Internet \
  --destination-port-ranges 22 \
  --protocol Tcp \
  --access Deny

# Associate NSG with web subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-diag \
  --name subnet-web \
  --network-security-group nsg-web

# Create VMs for testing
az vm create \
  --resource-group $RG \
  --name vm-web \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-diag \
  --subnet subnet-web \
  --public-ip-address vm-web-pip \
  --nsg "" \
  --admin-username azureuser \
  --generate-ssh-keys

az vm create \
  --resource-group $RG \
  --name vm-db \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-diag \
  --subnet subnet-db \
  --public-ip-address "" \
  --nsg "" \
  --admin-username azureuser \
  --generate-ssh-keys
```

## Tarefas

### Tarefa 1: habilitar o Network watcher

```bash
# Network watcher is auto-enabled for most subscriptions
# Verify it exists for your region
az network watcher list -o table

# If not enabled, create it
az network watcher configure \
  --resource-group NetworkWatcherRG \
  --locations $LOCATION \
  --enabled true

# Verify
az network watcher list \
  --query "[?location=='$LOCATION'] | [0].{Name:name, Location:location, State:provisioningState}" -o table
```

### Tarefa 2: IP flow verify

Teste se o tráfego é permitido ou negado pelas regras NSG:

```bash
# Get VM resource IDs
VM_WEB_ID=$(az vm show -g $RG -n vm-web --query "id" -o tsv)
VM_WEB_NIC=$(az vm show -g $RG -n vm-web \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)
VM_WEB_IP=$(az vm show -g $RG -n vm-web -d \
  --query "privateIps" -o tsv)

# Test: can internet reach port 80 on the web VM? (Should allow)
az network watcher test-ip-flow \
  --direction Inbound \
  --protocol Tcp \
  --local "$VM_WEB_IP:80" \
  --remote "1.2.3.4:12345" \
  --vm $VM_WEB_ID \
  --nic $VM_WEB_NIC

# Test: can internet reach port 22 on the web VM? (Should deny)
az network watcher test-ip-flow \
  --direction Inbound \
  --protocol Tcp \
  --local "$VM_WEB_IP:22" \
  --remote "1.2.3.4:12345" \
  --vm $VM_WEB_ID \
  --nic $VM_WEB_NIC

# Test: can the web VM reach the internet on port 443? (Should allow)
az network watcher test-ip-flow \
  --direction Outbound \
  --protocol Tcp \
  --local "$VM_WEB_IP:12345" \
  --remote "8.8.8.8:443" \
  --vm $VM_WEB_ID \
  --nic $VM_WEB_NIC
```

:::tip Dica

IP Flow Verify informa qual regra NSG (nome e prioridade) está permitindo ou negando o tráfego. Verifica tanto o NSG no nível da NIC quanto no nível da sub-rede. Esta é a maneira mais rápida de diagnosticar problemas de "por que não consigo conectar?".

:::
### Tarefa 3: análise de next hop

Determine o próximo salto para o tráfego a partir de uma VM:

```bash
# What is the next hop for traffic going to the internet?
az network watcher show-next-hop \
  --resource-group $RG \
  --vm vm-web \
  --source-ip $VM_WEB_IP \
  --dest-ip 8.8.8.8

# What is the next hop for traffic going to the DB VM?
VM_DB_IP=$(az vm show -g $RG -n vm-db -d --query "privateIps" -o tsv)
az network watcher show-next-hop \
  --resource-group $RG \
  --vm vm-web \
  --source-ip $VM_WEB_IP \
  --dest-ip $VM_DB_IP

# What is the next hop for traffic to a non-existent address?
az network watcher show-next-hop \
  --resource-group $RG \
  --vm vm-web \
  --source-ip $VM_WEB_IP \
  --dest-ip 192.168.1.1
```

### Tarefa 4: packet capture

```bash
# Create a storage account for packet captures
CAPTURE_STORAGE="diagcapture$RANDOM"
az storage account create \
  --resource-group $RG \
  --name $CAPTURE_STORAGE \
  --sku Standard_LRS

# Start a packet capture on the web VM
az network watcher packet-capture create \
  --resource-group $RG \
  --vm vm-web \
  --name capture-web-traffic \
  --storage-account $CAPTURE_STORAGE \
  --time-limit 60 \
  --filters '[{"protocol":"TCP","localPort":"80"}]'

# Check capture status
az network watcher packet-capture show \
  --location $LOCATION \
  --name capture-web-traffic

# Generate some traffic (from another terminal or using the vm)
az vm run-command invoke \
  --resource-group $RG \
  --name vm-web \
  --command-id RunShellScript \
  --scripts "curl -s http://localhost > /dev/null; echo done"

# Stop the capture
az network watcher packet-capture stop \
  --location $LOCATION \
  --name capture-web-traffic

# List all packet captures
az network watcher packet-capture list --location $LOCATION -o table

# Delete capture when done
az network watcher packet-capture delete \
  --location $LOCATION \
  --name capture-web-traffic
```

:::tip Dica

Capturas de pacotes são armazenadas como arquivos .cap na conta de armazenamento. Você pode baixar e analisá-los com o Wireshark. O agente do Network Watcher deve estar instalado na VM (instalado automaticamente quando você cria uma captura).

:::
### Tarefa 5: connection Monitor

```bash
# Create a connection Monitor to continuously test connectivity
az network watcher connection-monitor create \
  --name cm-web-to-internet \
  --location $LOCATION \
  --test-group-name tg-web-external \
  --endpoint-source-name "vm-web" \
  --endpoint-source-resource-id $VM_WEB_ID \
  --endpoint-dest-name "google-dns" \
  --endpoint-dest-address "8.8.8.8" \
  --test-config-name "tcp-443" \
  --protocol Tcp \
  --tcp-port 443 \
  --frequency 30

# Create a second test for internal connectivity
VM_DB_ID=$(az vm show -g $RG -n vm-db --query "id" -o tsv)
az network watcher connection-monitor create \
  --name cm-web-to-db \
  --location $LOCATION \
  --test-group-name tg-internal \
  --endpoint-source-name "vm-web" \
  --endpoint-source-resource-id $VM_WEB_ID \
  --endpoint-dest-name "vm-db" \
  --endpoint-dest-resource-id $VM_DB_ID \
  --test-config-name "tcp-5432" \
  --protocol Tcp \
  --tcp-port 5432 \
  --frequency 60

# Check connection monitor status
az network watcher connection-monitor list --location $LOCATION -o table

# Show test results
az network watcher connection-monitor show \
  --location $LOCATION \
  --name cm-web-to-internet
```

### Tarefa 6: NSG flow logs

```bash
# Create a Log Analytics workspace for flow logs
az monitor log-analytics workspace create \
  --resource-group $RG \
  --workspace-name law-network-diag \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-network-diag \
  --query "id" -o tsv)

# Create storage account for flow logs
FLOW_STORAGE="flowlogs$RANDOM"
az storage account create \
  --resource-group $RG \
  --name $FLOW_STORAGE \
  --sku Standard_LRS

# Get NSG resource ID
NSG_ID=$(az network nsg show -g $RG -n nsg-web --query "id" -o tsv)

# Enable NSG flow logs (version 2 for traffic analytics)
az network watcher flow-log create \
  --location $LOCATION \
  --name flowlog-nsg-web \
  --nsg $NSG_ID \
  --storage-account $FLOW_STORAGE \
  --workspace $WORKSPACE_ID \
  --enabled true \
  --format JSON \
  --log-version 2 \
  --retention 7 \
  --traffic-analytics true \
  --interval 10

# Verify flow log configuration
az network watcher flow-log show \
  --location $LOCATION \
  --name flowlog-nsg-web
```

**Passos no Portal:**
1. Navegue até **Network Watcher** > **NSG flow logs**
2. Selecione o NSG
3. Habilite flow logs com Versão 2
4. Configure conta de armazenamento e retenção
5. Habilite Traffic Analytics com workspace do Log Analytics
6. Defina o intervalo de processamento (10 minutos recomendado)

### Tarefa 7: connection troubleshoot

```bash
# One-time connectivity check from VM to destination
az network watcher test-connectivity \
  --resource-group $RG \
  --source-resource vm-web \
  --dest-address 8.8.8.8 \
  --dest-port 443 \
  --protocol Tcp

# Test connectivity to the DB VM on port 5432
az network watcher test-connectivity \
  --resource-group $RG \
  --source-resource vm-web \
  --dest-resource vm-db \
  --dest-port 5432 \
  --protocol Tcp

# Test connectivity to a service that should be blocked
az network watcher test-connectivity \
  --resource-group $RG \
  --source-resource vm-web \
  --dest-address 10.99.99.99 \
  --dest-port 80 \
  --protocol Tcp
```

### Tarefa 8: visualização de topologia e regras de segurança efetivas

```bash
# Generate network topology
az network watcher show-topology \
  --resource-group $RG

# View effective security rules for the web VM NIC
WEB_NIC_NAME=$(basename $VM_WEB_NIC)
az network nic list-effective-nsg \
  --resource-group $RG \
  --name $WEB_NIC_NAME -o table
```

**Passos no Portal para Topologia:**
1. Navegue até **Network Watcher** > **Topology**
2. Selecione sua assinatura e grupo de recursos
3. Visualize o diagrama interativo mostrando VNets, sub-redes, NICs e VMs
4. Observe os relacionamentos entre os recursos de rede

**Passos no Portal para Regras de Segurança Efetivas:**
1. Navegue até **Network Watcher** > **Effective security rules**
2. Selecione a VM ou NIC
3. Visualize a lista combinada de todas as regras NSG aplicáveis (nível NIC + sub-rede)
4. Identifique qual regra está permitindo ou bloqueando o tráfego

## Critérios de sucesso

<SuccessChecklist
  storageKey="az104-challenge-26"
  items={[
    "Network Watcher habilitado na região alvo",
    "IP Flow Verify usado para testar tráfego permitido/negado (porta 80 permitida, porta 22 negada)",
    "Análise de Next Hop realizada para destinos internet, internos e inalcançáveis",
    "Packet capture criado, tráfego capturado e captura finalizada",
    "Connection Monitor configurado para testes de conectividade externa e interna",
    "NSG flow logs habilitados com Traffic Analytics",
    "Connection Troubleshoot usado para verificar conectividade",
    "Visualização de topologia examinada",
    "Regras de segurança efetivas revisadas para impacto combinado de NSG (NIC + sub-rede)"
  ]}
/>
## Cenários de quebrar & consertar

### Cenário a: VM não consegue alcançar a internet

```bash
# Add a deny-all outbound rule to the NSG
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name BlockOutbound \
  --priority 100 \
  --direction Outbound \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*" \
  --protocol "*" \
  --access Deny

# Diagnose with IP flow verify
az network watcher test-ip-flow \
  --direction Outbound \
  --protocol Tcp \
  --local "$VM_WEB_IP:12345" \
  --remote "8.8.8.8:443" \
  --vm $VM_WEB_ID \
  --nic $VM_WEB_NIC

# Output will show: "Access: deny, rule: BlockOutbound"

# Fix: remove the blocking rule
az network nsg rule delete \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name BlockOutbound
```

### Cenário b: roteamento assimétrico causa descartes

```bash
# Add a UDR that routes response traffic differently than request traffic
# This causes asymmetric routing (responses take different path than requests)
# Diagnose with next hop to see unexpected routing
az network watcher show-next-hop \
  --resource-group $RG \
  --vm vm-web \
  --source-ip $VM_WEB_IP \
  --dest-ip 1.2.3.4

# If next hop shows "VirtualAppliance" but no NVA exists, traffic is black-holed
```

### Cenário c: connection Monitor mostra falhas

```bash
# Check connection Monitor for failures
az network watcher connection-monitor show \
  --location $LOCATION \
  --name cm-web-to-db

# Common causes:
# 1. no service listening on destination port
# 2. NSG blocking the port
# 3. OS-level firewall (iptables/ufw) blocking
# Diagnose: use IP flow verify + connection troubleshoot
```

## Verificação de conhecimento

**1. Qual é a diferença entre Connection Monitor e Connection Troubleshoot?**

<details>
<summary>Mostrar Resposta</summary>

| Recurso | Connection Monitor | Connection Troubleshoot |
|---------|-------------------|------------------------|
| Tipo | Monitoramento contínuo | Teste único |
| Duração | Executa indefinidamente (agendado) | Verificação pontual |
| Alertas | Sim (integra com Azure Monitor) | Não |
| Histórico | Mantém dados históricos | Resultado pontual |
| Caso de uso | Monitoramento de saúde contínuo | Depuração ad-hoc |
</details>

**2. Quais informações o IP Flow Verify fornece?**

<details>
<summary>Mostrar Resposta</summary>

IP Flow Verify retorna:
- **Access**: Allow ou Deny
- **Rule Name**: A regra NSG específica causando o allow/deny
- **NSG ID**: Qual NSG (nível NIC ou nível sub-rede) contém a regra correspondente

Avalia tanto NSGs no nível da NIC quanto no nível da sub-rede e retorna a primeira regra correspondente. Esta é a maneira mais rápida de diagnosticar problemas de conectividade relacionados a NSG.
</details>

**3. Quais são os requisitos para packet capture?**

<details>
<summary>Mostrar Resposta</summary>

- A extensão de VM do agente Network Watcher deve estar instalada (instalada automaticamente na primeira captura)
- A VM deve estar no estado Running
- Conta de armazenamento na mesma região (para armazenar arquivos .cap)
- Limites máximos de tamanho de captura e tempo podem ser configurados
- Filtros podem ser aplicados (protocolo, IP local/remoto, porta)
- A saída pode ir para conta de armazenamento, arquivo local na VM, ou ambos
</details>

**4. O que o NSG Flow Log versão 2 adiciona em relação à versão 1?**

<details>
<summary>Mostrar Resposta</summary>

A versão 2 adiciona:
- **Bytes enviados/recebidos** por fluxo (rastreamento de largura de banda)
- Informações de **estado do fluxo** (Begin, Continuing, End)
- Suporte a **Traffic Analytics** (requer workspace do Log Analytics)

A versão 1 registra apenas: timestamp, IP origem/destino, porta origem/destino, protocolo, direção do tráfego (inbound/outbound) e allow/deny.
</details>

## Limpeza

```bash
# Delete connection monitors first
az network watcher connection-monitor delete \
  --location $LOCATION --name cm-web-to-internet 2>/dev/null
az network watcher connection-monitor delete \
  --location $LOCATION --name cm-web-to-db 2>/dev/null

# Delete flow logs
az network watcher flow-log delete \
  --location $LOCATION --name flowlog-nsg-web 2>/dev/null

# Delete all resources
az group delete --name $RG --yes --no-wait

echo "Resources are being deleted in the background."
```

## Recursos de aprendizagem

- [Visão geral do Azure Network Watcher](https://learn.microsoft.com/azure/network-watcher/network-watcher-monitoring-overview)
- [IP Flow Verify](https://learn.microsoft.com/azure/network-watcher/network-watcher-ip-flow-verify-overview)
- [Next Hop](https://learn.microsoft.com/azure/network-watcher/network-watcher-next-hop-overview)
- [Packet Capture](https://learn.microsoft.com/azure/network-watcher/network-watcher-packet-capture-overview)
- [Connection Monitor](https://learn.microsoft.com/azure/network-watcher/connection-monitor-overview)
- [NSG Flow Logs](https://learn.microsoft.com/azure/network-watcher/nsg-flow-logs-overview)
- [Traffic Analytics](https://learn.microsoft.com/azure/network-watcher/traffic-analytics)
