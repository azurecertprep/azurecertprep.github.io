---
sidebar_position: 24
title: "Desafio 24: Diagnósticos do Network Watcher"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 24: Diagnósticos do Network Watcher

## Habilidades do exame cobertas

- Usar Network Watcher para diagnosticar problemas de segurança de rede
- Analisar regras de segurança efetivas para VMs e NICs
- Configurar e analisar NSG Flow Logs
- Usar IP flow verify para testar conectividade
- Implementar connection troubleshoot para diagnóstico ponta a ponta
- Configurar Traffic Analytics para visibilidade de rede

## Cenário

A equipe de operações da Contoso Ltd está recebendo relatórios de problemas intermitentes de conectividade entre suas camadas de aplicação. Servidores web ocasionalmente não conseguem alcançar servidores de aplicação, e algumas conexões de saída para APIs externas estão sendo bloqueadas. A equipe de segurança suspeita de configurações incorretas de NSG, mas precisa de evidências diagnósticas antes de fazer alterações. Você deve usar o Azure Network Watcher para diagnosticar sistematicamente problemas de conectividade, capturar flow logs para análise forense e implementar Traffic Analytics para visibilidade contínua dos padrões de tráfego de rede.

---

## Pré-requisitos

- Assinatura Azure com função Network Contributor
- Azure CLI instalado e autenticado (`az login`)
- Network Watcher habilitado na região de destino
- Máquinas virtuais implantadas (ou disposição para criar VMs de teste)
- Uma conta de armazenamento para armazenamento de flow logs

---

## Tarefa 1: Verificar Network Watcher e criar infraestrutura de teste

Garanta que o Network Watcher esteja habilitado e implante VMs de teste para diagnósticos.

```bash
# Set variables
RG="rg-sc500-network-watcher"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Verify Network Watcher is enabled in the region
az network watcher configure \
  --resource-group NetworkWatcherRG \
  --locations $LOCATION \
  --enabled true

# Verify Network Watcher exists
az network watcher list \
  --query "[?location=='$LOCATION'].{Name:name, Location:location, State:provisioningState}" -o table

# Create test infrastructure - VNet with NSGs
az network vnet create \
  --name vnet-diagnostics \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-web --subnet-prefix 10.0.1.0/24

az network vnet subnet create \
  --name snet-app \
  --vnet-name vnet-diagnostics \
  --resource-group $RG \
  --address-prefix 10.0.2.0/24

# Create NSGs
az network nsg create --name nsg-web --resource-group $RG --location $LOCATION
az network nsg create --name nsg-app --resource-group $RG --location $LOCATION

# Add rules to web NSG
az network nsg rule create \
  --nsg-name nsg-web --resource-group $RG \
  --name Allow-HTTP --priority 100 --direction Inbound \
  --access Allow --protocol Tcp \
  --source-address-prefixes Internet --destination-port-ranges 80 443

az network nsg rule create \
  --nsg-name nsg-web --resource-group $RG \
  --name Deny-All-Inbound --priority 4000 --direction Inbound \
  --access Deny --protocol "*" \
  --source-address-prefixes "*" --destination-address-prefixes "*" \
  --destination-port-ranges "*"

# Add rules to app NSG (intentionally restrictive for diagnostics)
az network nsg rule create \
  --nsg-name nsg-app --resource-group $RG \
  --name Allow-From-Web --priority 100 --direction Inbound \
  --access Allow --protocol Tcp \
  --source-address-prefixes "10.0.1.0/24" --destination-port-ranges 8080

# Associate NSGs with subnets
az network vnet subnet update \
  --name snet-web --vnet-name vnet-diagnostics \
  --resource-group $RG --network-security-group nsg-web

az network vnet subnet update \
  --name snet-app --vnet-name vnet-diagnostics \
  --resource-group $RG --network-security-group nsg-app

# Create test VMs
az vm create \
  --name vm-web-01 \
  --resource-group $RG \
  --location $LOCATION \
  --image Ubuntu2204 \
  --size Standard_B1ms \
  --vnet-name vnet-diagnostics \
  --subnet snet-web \
  --nsg "" \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait

az vm create \
  --name vm-app-01 \
  --resource-group $RG \
  --location $LOCATION \
  --image Ubuntu2204 \
  --size Standard_B1ms \
  --vnet-name vnet-diagnostics \
  --subnet snet-app \
  --nsg "" \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait

# Wait for VMs to be ready
az vm wait --name vm-web-01 --resource-group $RG --created
az vm wait --name vm-app-01 --resource-group $RG --created
```

---

## Tarefa 2: Verificar regras de segurança efetivas

Analise as regras de segurança efetivas aplicadas às interfaces de rede das VMs.

```bash
# Get NIC IDs for the VMs
WEB_NIC_ID=$(az vm show --name vm-web-01 --resource-group $RG \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)
WEB_NIC_NAME=$(echo $WEB_NIC_ID | awk -F'/' '{print $NF}')

APP_NIC_ID=$(az vm show --name vm-app-01 --resource-group $RG \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)
APP_NIC_NAME=$(echo $APP_NIC_ID | awk -F'/' '{print $NF}')

# Get effective security rules for web VM
echo "=== Effective Security Rules: vm-web-01 ==="
az network nic list-effective-nsg \
  --name $WEB_NIC_NAME \
  --resource-group $RG \
  --query "value[0].effectiveSecurityRules[].{Direction:direction, Priority:priority, Access:access, Protocol:protocol, SourcePrefix:sourceAddressPrefix, DestPort:destinationPortRange, Name:name}" \
  -o table

echo ""
echo "=== Effective Security Rules: vm-app-01 ==="
az network nic list-effective-nsg \
  --name $APP_NIC_NAME \
  --resource-group $RG \
  --query "value[0].effectiveSecurityRules[].{Direction:direction, Priority:priority, Access:access, Protocol:protocol, SourcePrefix:sourceAddressPrefix, DestPort:destinationPortRange, Name:name}" \
  -o table
```

---

## Tarefa 3: Usar IP Flow Verify para testar conectividade

Teste fluxos de tráfego específicos para identificar quais regras de NSG permitem ou negam tráfego.

```bash
# Get VM resource IDs
WEB_VM_ID=$(az vm show --name vm-web-01 --resource-group $RG --query id -o tsv)
APP_VM_ID=$(az vm show --name vm-app-01 --resource-group $RG --query id -o tsv)

# Get private IPs
WEB_IP=$(az vm show --name vm-web-01 --resource-group $RG --show-details --query privateIps -o tsv)
APP_IP=$(az vm show --name vm-app-01 --resource-group $RG --show-details --query privateIps -o tsv)

echo "Web VM IP: $WEB_IP"
echo "App VM IP: $APP_IP"

# Test 1: Can web VM reach app VM on port 8080? (should be allowed)
echo ""
echo "=== Test 1: Web → App on port 8080 ==="
az network watcher test-ip-flow \
  --vm $WEB_VM_ID \
  --direction Outbound \
  --protocol TCP \
  --local "${WEB_IP}:*" \
  --remote "${APP_IP}:8080"

# Test 2: Can web VM reach app VM on port 3389? (should be denied)
echo ""
echo "=== Test 2: Web → App on port 3389 ==="
az network watcher test-ip-flow \
  --vm $WEB_VM_ID \
  --direction Outbound \
  --protocol TCP \
  --local "${WEB_IP}:*" \
  --remote "${APP_IP}:3389"

# Test 3: Can app VM reach internet on port 443? (should be allowed by default)
echo ""
echo "=== Test 3: App → Internet on port 443 ==="
az network watcher test-ip-flow \
  --vm $APP_VM_ID \
  --direction Outbound \
  --protocol TCP \
  --local "${APP_IP}:*" \
  --remote "8.8.8.8:443"

# Test 4: Can internet reach web VM on port 80? (should be allowed)
echo ""
echo "=== Test 4: Internet → Web on port 80 ==="
az network watcher test-ip-flow \
  --vm $WEB_VM_ID \
  --direction Inbound \
  --protocol TCP \
  --local "${WEB_IP}:80" \
  --remote "203.0.113.1:*"

# Test 5: Can internet reach web VM on port 22? (should be denied)
echo ""
echo "=== Test 5: Internet → Web on port 22 ==="
az network watcher test-ip-flow \
  --vm $WEB_VM_ID \
  --direction Inbound \
  --protocol TCP \
  --local "${WEB_IP}:22" \
  --remote "203.0.113.1:*"
```

---

## Tarefa 4: Configurar NSG Flow Logs

Habilite NSG Flow Logs para gravação de tráfego e análise forense.

```bash
# Create storage account for flow logs
FLOW_STORAGE="stflowlogs$(openssl rand -hex 4)"
az storage account create \
  --name $FLOW_STORAGE \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Create Log Analytics workspace for Traffic Analytics
WORKSPACE_NAME="law-sc500-netwatch"
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME --resource-group $RG --query id -o tsv)

WORKSPACE_GUID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME --resource-group $RG --query customerId -o tsv)

WORKSPACE_LOCATION=$LOCATION

# Enable NSG Flow Logs v2 on web NSG
NSG_WEB_ID=$(az network nsg show --name nsg-web --resource-group $RG --query id -o tsv)

az network watcher flow-log create \
  --name "fl-nsg-web" \
  --nsg $NSG_WEB_ID \
  --resource-group NetworkWatcherRG \
  --location $LOCATION \
  --storage-account $FLOW_STORAGE \
  --enabled true \
  --format JSON \
  --log-version 2 \
  --retention 90 \
  --traffic-analytics true \
  --workspace $WORKSPACE_ID

# Enable NSG Flow Logs on app NSG
NSG_APP_ID=$(az network nsg show --name nsg-app --resource-group $RG --query id -o tsv)

az network watcher flow-log create \
  --name "fl-nsg-app" \
  --nsg $NSG_APP_ID \
  --resource-group NetworkWatcherRG \
  --location $LOCATION \
  --storage-account $FLOW_STORAGE \
  --enabled true \
  --format JSON \
  --log-version 2 \
  --retention 90 \
  --traffic-analytics true \
  --workspace $WORKSPACE_ID

# Verify flow log configuration
az network watcher flow-log list \
  --location $LOCATION \
  --query "[].{Name:name, Enabled:enabled, RetentionDays:retentionPolicy.days, TrafficAnalytics:flowAnalyticsConfiguration.networkWatcherFlowAnalyticsConfiguration.enabled}" -o table
```

---

## Tarefa 5: Usar Connection Troubleshoot para diagnóstico ponta a ponta

Realize connection troubleshoot para diagnosticar conectividade entre VMs.

```bash
# Install Network Watcher extension on VMs (required for connection troubleshoot)
az vm extension set \
  --vm-name vm-web-01 \
  --resource-group $RG \
  --name NetworkWatcherAgentLinux \
  --publisher Microsoft.Azure.NetworkWatcher

az vm extension set \
  --vm-name vm-app-01 \
  --resource-group $RG \
  --name NetworkWatcherAgentLinux \
  --publisher Microsoft.Azure.NetworkWatcher

# Connection troubleshoot: Web to App on port 8080
echo "=== Connection Troubleshoot: Web → App:8080 ==="
az network watcher test-connectivity \
  --source-resource $WEB_VM_ID \
  --dest-resource $APP_VM_ID \
  --dest-port 8080 \
  --protocol TCP

# Connection troubleshoot: Web to App on port 22 (likely blocked)
echo ""
echo "=== Connection Troubleshoot: Web → App:22 ==="
az network watcher test-connectivity \
  --source-resource $WEB_VM_ID \
  --dest-resource $APP_VM_ID \
  --dest-port 22 \
  --protocol TCP

# Connection troubleshoot: App to external service
echo ""
echo "=== Connection Troubleshoot: App → External API ==="
az network watcher test-connectivity \
  --source-resource $APP_VM_ID \
  --dest-address "api.contoso.com" \
  --dest-port 443 \
  --protocol TCP

# Next hop analysis - where does traffic to the internet go?
echo ""
echo "=== Next Hop: App VM → Internet ==="
az network watcher show-next-hop \
  --vm $APP_VM_ID \
  --source-ip $APP_IP \
  --dest-ip "8.8.8.8" \
  --resource-group $RG

# Next hop analysis - where does traffic to peer VNet go?
echo ""
echo "=== Next Hop: Web VM → App VM ==="
az network watcher show-next-hop \
  --vm $WEB_VM_ID \
  --source-ip $WEB_IP \
  --dest-ip $APP_IP \
  --resource-group $RG
```

---

## Tarefa 6: Analisar flow logs e Traffic Analytics

Consulte dados do Traffic Analytics para entender padrões de tráfego de rede.

```bash
# Wait for flow logs to accumulate (at least 10 minutes)
echo "Flow logs take 10-60 minutes to appear in Traffic Analytics"
echo "Sample KQL queries for Log Analytics:"

# KQL query to find blocked traffic
cat << 'EOF'
=== KQL: Blocked Traffic (run in Log Analytics) ===

AzureNetworkAnalytics_CL
| where FlowStatus_s == "D"  // Denied
| summarize BlockedFlows=count() by
    SrcIP_s,
    DestIP_s,
    DestPort_d,
    NSGRule_s
| sort by BlockedFlows desc
| take 20

=== KQL: Top talkers ===

AzureNetworkAnalytics_CL
| where FlowStatus_s == "A"  // Allowed
| summarize TotalBytes=sum(InboundBytes_d + OutboundBytes_d) by SrcIP_s
| sort by TotalBytes desc
| take 10

=== KQL: Traffic by geo-location ===

AzureNetworkAnalytics_CL
| where FlowDirection_s == "I"  // Inbound
| where isnotempty(SrcPublicIPs_s)
| summarize Flows=count() by Country_s
| sort by Flows desc
| take 20

=== KQL: NSG rule hit count ===

AzureNetworkAnalytics_CL
| summarize HitCount=count() by NSGRule_s, FlowStatus_s
| sort by HitCount desc
EOF

# Check flow log storage for raw data
az storage blob list \
  --account-name $FLOW_STORAGE \
  --container-name "insights-logs-networksecuritygroupflowevent" \
  --query "[].name" -o tsv 2>/dev/null | head -5 || echo "Flow log blobs may take time to appear"

# Topology view
az network watcher show-topology \
  --resource-group $RG \
  --query "resources[].{Name:name, Type:id}" -o table
```

---

## Quebra & conserta

### Cenário 1: Flow logs não mostram dados após 24 horas

NSG Flow Logs foram habilitados, mas a conta de armazenamento não mostra dados de flow log e o Traffic Analytics não tem entradas.

<details>
<summary>Mostrar solução</summary>

```bash
# Check flow log status
az network watcher flow-log list \
  --location $LOCATION \
  --query "[].{Name:name, Enabled:enabled, StorageId:storageId}" -o table

# Verify the storage account is accessible and in the same region
az storage account show \
  --name $FLOW_STORAGE \
  --resource-group $RG \
  --query "{Name:name, Location:location, NetworkDefaultAction:networkRuleSet.defaultAction}"

# If storage firewall is blocking, add Network Watcher to trusted services
az storage account update \
  --name $FLOW_STORAGE \
  --resource-group $RG \
  --bypass AzureServices

# Verify the NSG has actual traffic flowing through it
# An NSG with no associated subnet/NIC won't generate logs
az network nsg show --name nsg-web --resource-group $RG \
  --query "subnets[].id"

# Check if the Microsoft.Insights provider is registered
az provider show --namespace Microsoft.Insights --query "registrationState"
az provider register --namespace Microsoft.Insights 2>/dev/null

# Re-create the flow log
az network watcher flow-log delete --name "fl-nsg-web" --location $LOCATION

az network watcher flow-log create \
  --name "fl-nsg-web" \
  --nsg $NSG_WEB_ID \
  --resource-group NetworkWatcherRG \
  --location $LOCATION \
  --storage-account $FLOW_STORAGE \
  --enabled true \
  --format JSON \
  --log-version 2 \
  --retention 90
```

</details>

### Cenário 2: IP Flow Verify mostra "Allow" mas a conexão ainda falha

IP Flow Verify confirma que o tráfego deveria ser permitido, mas a conectividade real entre as VMs falha.

<details>
<summary>Mostrar solução</summary>

```bash
# IP Flow Verify only checks NSG rules. Connection failure can be caused by:
# 1. VM-level firewall (iptables, Windows Firewall)
# 2. Application not listening on the port
# 3. Route table sending traffic to wrong next-hop
# 4. DNS resolution failure

# Check the route table / next hop
az network watcher show-next-hop \
  --vm $WEB_VM_ID \
  --source-ip $WEB_IP \
  --dest-ip $APP_IP \
  --resource-group $RG

# Use connection troubleshoot for full path analysis
az network watcher test-connectivity \
  --source-resource $WEB_VM_ID \
  --dest-resource $APP_VM_ID \
  --dest-port 8080 \
  --protocol TCP

# Check if a UDR is misrouting traffic
az network vnet subnet show \
  --name snet-web \
  --vnet-name vnet-diagnostics \
  --resource-group $RG \
  --query "routeTable"

# Check effective routes on the NIC
az network nic show-effective-route-table \
  --name $WEB_NIC_NAME \
  --resource-group $RG -o table

# The application may not be listening - this is beyond NSG scope
echo "If NSG allows traffic but connection fails, check:"
echo "1. Target VM OS firewall (iptables -L / netsh advfirewall)"
echo "2. Application is listening (netstat -tlnp | grep 8080)"
echo "3. Route table is not misrouting traffic"
```

</details>

### Cenário 3: Traffic Analytics mostrando origens "Unknown" para tráfego suspeito

Traffic Analytics mostra grandes volumes de tráfego de entrada de localizações geográficas "Unknown" atingindo a camada web.

<details>
<summary>Mostrar solução</summary>

```bash
# "Unknown" in Traffic Analytics means the IP couldn't be geo-located
# This often indicates private RFC1918 IPs or newly allocated public IPs

# Query the raw flow logs for these unknown flows
cat << 'EOF'
=== KQL: Investigate Unknown Sources ===

AzureNetworkAnalytics_CL
| where Country_s == "" or Country_s == "Unknown"
| where FlowDirection_s == "I"
| summarize FlowCount=count(), TotalBytes=sum(InboundBytes_d)
    by SrcIP_s, DestPort_d, NSGRule_s
| sort by FlowCount desc
| take 20
EOF

# If the traffic is suspicious, add a deny rule for the source IPs
# identified in the flow logs

# For private IPs showing as "Unknown", this is normal for VNet-to-VNet traffic

# Ensure NSG flow logs are v2 (includes more metadata)
az network watcher flow-log show \
  --name "fl-nsg-web" \
  --location $LOCATION \
  --query "format.version"

# Upgrade to v2 if needed
az network watcher flow-log update \
  --name "fl-nsg-web" \
  --location $LOCATION \
  --log-version 2
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que o IP Flow Verify NÃO verifica ao determinar se o tráfego é permitido ou negado?",
    options: [
      "Regras de NSG na sub-rede",
      "Regras de NSG na NIC",
      "Regras de firewall no nível da VM (SO) e se a aplicação está escutando",
      "Regras padrão de NSG"
    ],
    correctIndex: 2,
    explanation: "O IP Flow Verify avalia apenas regras de NSG do Azure (tanto no nível da sub-rede quanto no nível da NIC, incluindo regras padrão). Ele NÃO verifica firewalls no nível da VM (iptables, Windows Firewall), se a aplicação de destino está em execução, tabelas de rotas ou resolução DNS. Use Connection Troubleshoot para diagnóstico mais abrangente."
  },
  {
    question: "Qual é a diferença entre NSG Flow Logs versão 1 e versão 2?",
    options: [
      "A versão 2 suporta IPv6 enquanto a versão 1 suporta apenas IPv4",
      "A versão 2 inclui informações de estado do fluxo, bytes e pacotes por fluxo, habilitando Traffic Analytics",
      "A versão 2 captura dados da camada de aplicação enquanto a versão 1 captura apenas a camada de rede",
      "A versão 2 é em tempo real enquanto a versão 1 tem um atraso de 5 minutos"
    ],
    correctIndex: 1,
    explanation: "NSG Flow Logs versão 2 inclui informações adicionais como estado do fluxo (início, continuação, término), bytes transferidos e contagem de pacotes por fluxo. Esses dados adicionais são necessários para que o Traffic Analytics forneça insights de largura de banda e throughput."
  },
  {
    question: "Qual componente Azure deve ser instalado em uma VM para o Connection Troubleshoot funcionar?",
    options: [
      "Azure Monitor Agent",
      "Extensão de VM do Network Watcher Agent",
      "Agente do Log Analytics",
      "Agente do Azure Security"
    ],
    correctIndex: 1,
    explanation: "A extensão de VM do Network Watcher Agent (NetworkWatcherAgentLinux ou NetworkWatcherAgentWindows) deve ser instalada na VM de origem para que o Connection Troubleshoot e a captura de pacotes funcionem. Sem essa extensão, esses diagnósticos não podem ser realizados."
  },
  {
    question: "Quanto tempo geralmente leva para os dados de NSG Flow Log aparecerem no Traffic Analytics após serem habilitados?",
    options: [
      "Imediatamente (tempo real)",
      "5 minutos",
      "10 a 60 minutos dependendo do intervalo de processamento",
      "24 horas"
    ],
    correctIndex: 2,
    explanation: "O Traffic Analytics processa dados de flow log em intervalos configuráveis (10 minutos ou 60 minutos). Após a habilitação, geralmente leva pelo menos um intervalo de processamento mais algum tempo adicional para a agregação inicial de dados antes que os resultados apareçam no Log Analytics."
  }
]} />

## Limpeza

```bash
# Delete flow logs first
az network watcher flow-log delete --name "fl-nsg-web" --location $LOCATION
az network watcher flow-log delete --name "fl-nsg-app" --location $LOCATION

# Delete the resource group
az group delete --name $RG --yes --no-wait
```
