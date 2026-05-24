---
sidebar_position: 12
title: "Desafio 12: Azure Monitor para Redes & Topologia"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 12: Azure Monitor para redes e topologia

:::info Tempo e custo estimados

**90-120 minutos** | **~$1-3/hora** (VMs para agentes do Connection Monitor) | **Peso no exame: 10-15%**

:::

## CenÃ¡rio

A equipe do NOC da Contoso precisa de visibilidade ponta a ponta em sua rede Azure. Eles devem monitorar a conectividade entre VMs e serviÃ§os em diferentes regiÃµes, configurar alertas para degradaÃ§Ã£o da integridade da rede e manter uma visualizaÃ§Ã£o de topologia em tempo real dos recursos de rede. A equipe implantarÃ¡ o Connection Monitor para validar caminhos multi-hop, habilitarÃ¡ logs de diagnÃ³stico nos recursos de rede, consultarÃ¡ dados de rede com KQL e configurarÃ¡ alertas proativos para falhas de conectividade.

**Topologia de monitoramento:**

```text
Source VM (East US)
    |
    â”œâ”€â”€ TCP test â†’ Load Balancer (East US) â†’ Backend VMs
    â”œâ”€â”€ HTTP test â†’ Web App endpoint
    â””â”€â”€ ICMP test â†’ VM in West US
            |
All results â†’ Log Analytics Workspace
            |
    Alerts â†’ Action Group (NOC email)
```

## Objetivos de aprendizagem

ApÃ³s concluir este desafio, vocÃª serÃ¡ capaz de:

- Criar e configurar o Connection Monitor com grupos de teste multiprotocolo
- Adicionar endpoints e configuraÃ§Ãµes de teste a um Connection Monitor existente
- Habilitar configuraÃ§Ãµes de diagnÃ³stico para NSGs, VPN Gateways e Load Balancers
- Consultar dados de monitoramento de rede usando KQL no Log Analytics
- Navegar pelo Azure Monitor Network Insights para visualizaÃ§Ã£o de topologia
- Criar alertas de mÃ©tricas para falhas do Connection Monitor e violaÃ§Ãµes de latÃªncia

## PrÃ©-requisitos

- Uma assinatura Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- Network Watcher habilitado nas regiÃµes de destino
- Pelo menos duas VMs em sub-redes diferentes (as VMs de origem devem ter o Azure Monitor Agent instalado)
- Um workspace do Log Analytics

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| Connection Monitor v2 | VersÃ£o atual; substitui tanto o Network Performance Monitor quanto o Connection Monitor clÃ¡ssico |
| Azure Monitor Agent | NecessÃ¡rio nas VMs de origem para o Connection Monitor (substitui o agente legado do Log Analytics) |
| FrequÃªncia de teste | Valores suportados: 30s, 60s, 300s, 600s, 1800s |
| Protocolos suportados | TCP, HTTP, ICMP |
| Network Insights | Painel sem necessidade de configuraÃ§Ã£o com descoberta automÃ¡tica de topologia |
| NSG flow logs | Enviados para Storage Account; requerem Traffic Analytics para chegar ao Log Analytics |
| Logs de diagnÃ³stico | Logs do VPN Gateway, Load Balancer e Application Gateway vÃ£o diretamente para o Log Analytics |
| NWConnectionMonitorTestResult | Tabela do Log Analytics que armazena os resultados de teste do Connection Monitor |

---

## Tarefa 1: Criar um Connection Monitor com grupo de teste inicial

Crie um Connection Monitor que testa a conectividade TCP de uma VM de origem para um IP frontend de load balancer.

### Etapa 1: Configurar variÃ¡veis

```bash
RESOURCE_GROUP="rg-network-monitoring"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-netmon"
CM_NAME="cm-contoso-multihop"
SOURCE_VM_NAME="vm-source-eastus"
SOURCE_VM_ID=$(az vm show \
    --resource-group $RESOURCE_GROUP \
    --name $SOURCE_VM_NAME \
    --query "id" \
    --output tsv)
WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --resource-group $RESOURCE_GROUP \
    --workspace-name $WORKSPACE_NAME \
    --query "id" \
    --output tsv)
```

### Etapa 2: Criar o Connection Monitor com um teste TCP

```bash
az network watcher connection-monitor create \
    --name $CM_NAME \
    --endpoint-source-name "src-vm-eastus" \
    --endpoint-source-resource-id $SOURCE_VM_ID \
    --endpoint-dest-name "dest-lb-frontend" \
    --endpoint-dest-address "10.0.2.4" \
    --test-config-name "tcp-config-443" \
    --protocol Tcp \
    --tcp-port 443 \
    --frequency 60 \
    --threshold-failed-percent 10 \
    --threshold-round-trip-time 100 \
    --test-group-name "tg-vm-to-lb" \
    --workspace-ids $WORKSPACE_ID \
    --location $LOCATION
```

:::tip Nota para o exame

O comando `az network watcher connection-monitor create` requer `--endpoint-source-name`, `--endpoint-source-resource-id`, `--endpoint-dest-name` e `--test-config-name` como parÃ¢metros obrigatÃ³rios para o Connection Monitor v2. O parÃ¢metro `--location` especifica a regiÃ£o do Network Watcher.

:::

### Etapa 3: Verificar se o Connection Monitor foi criado

```bash
az network watcher connection-monitor show \
    --name $CM_NAME \
    --location $LOCATION \
    --query "{name:name, provisioningState:provisioningState}" \
    --output table
```

SaÃ­da esperada: `provisioningState` deve ser `Succeeded`.

---

## Tarefa 2: Adicionar endpoints e configuraÃ§Ãµes de teste para mÃºltiplos protocolos

Expanda o Connection Monitor com testes HTTP e ICMP direcionados a diferentes destinos.

### Etapa 1: Adicionar um endpoint HTTP externo

```bash
az network watcher connection-monitor endpoint add \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --name "dest-web-app" \
    --address "contoso-webapp.azurewebsites.net" \
    --dest-test-groups "tg-vm-to-lb" \
    --type ExternalAddress
```

### Etapa 2: Adicionar um endpoint de VM entre regiÃµes

```bash
DEST_VM_WESTUS_ID=$(az vm show \
    --resource-group $RESOURCE_GROUP \
    --name "vm-dest-westus" \
    --query "id" \
    --output tsv)

az network watcher connection-monitor endpoint add \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --name "dest-vm-westus" \
    --resource-id $DEST_VM_WESTUS_ID \
    --dest-test-groups "tg-crossregion" \
    --type AzureVM
```

### Etapa 3: Adicionar uma configuraÃ§Ã£o de teste HTTP

```bash
az network watcher connection-monitor test-configuration add \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --name "http-config-443" \
    --protocol Http \
    --http-port 443 \
    --http-method Get \
    --http-path "/" \
    --http-valid-status-codes "2xx 301 302" \
    --frequency 300 \
    --threshold-failed-percent 20 \
    --threshold-round-trip-time 200 \
    --test-groups "tg-vm-to-lb"
```

### Etapa 4: Adicionar uma configuraÃ§Ã£o de teste ICMP

```bash
az network watcher connection-monitor test-configuration add \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --name "icmp-config-crossregion" \
    --protocol Icmp \
    --frequency 60 \
    --threshold-round-trip-time 150 \
    --test-groups "tg-crossregion"
```

### Etapa 5: Adicionar um grupo de teste combinando endpoints entre regiÃµes

```bash
az network watcher connection-monitor test-group add \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --name "tg-crossregion" \
    --endpoint-source-name "src-vm-eastus" \
    --endpoint-dest-name "dest-vm-westus" \
    --test-config-name "icmp-config-crossregion"
```

### Etapa 6: Listar todas as configuraÃ§Ãµes de teste para verificaÃ§Ã£o

```bash
az network watcher connection-monitor test-configuration list \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --output table
```

:::note OrientaÃ§Ã£o para seleÃ§Ã£o de protocolo

- **TCP**: Use para testar conectividade em portas especÃ­ficas (bancos de dados, APIs, load balancers). Mais confiÃ¡vel para verificar acessibilidade ponta a ponta.
- **HTTP**: Use para endpoints web onde vocÃª precisa validar cÃ³digos de resposta e caminhos. Suporta preferÃªncia por HTTPS.
- **ICMP**: Use para mediÃ§Ã£o de latÃªncia e acessibilidade bÃ¡sica. Alguns recursos Azure bloqueiam ICMP (serviÃ§os PaaS, regras de NSG).

:::

---

## Tarefa 3: Habilitar logs de diagnÃ³stico para recursos de rede

Configure as configuraÃ§Ãµes de diagnÃ³stico para enviar logs de NSGs, VPN Gateways e Load Balancers para o Log Analytics.

### Etapa 1: Obter o ID do workspace do Log Analytics

```bash
WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --resource-group $RESOURCE_GROUP \
    --workspace-name $WORKSPACE_NAME \
    --query "id" \
    --output tsv)
```

### Etapa 2: Habilitar configuraÃ§Ãµes de diagnÃ³stico para o Load Balancer

```bash
LB_ID=$(az network lb show \
    --resource-group $RESOURCE_GROUP \
    --name "lb-contoso-web" \
    --query "id" \
    --output tsv)

az monitor diagnostic-settings create \
    --name "diag-lb-to-law" \
    --resource $LB_ID \
    --workspace $WORKSPACE_ID \
    --logs '[{"category":"LoadBalancerAlertEvent","enabled":true},{"category":"LoadBalancerProbeHealthStatus","enabled":true}]' \
    --metrics '[{"category":"AllMetrics","enabled":true}]'
```

### Etapa 3: Habilitar configuraÃ§Ãµes de diagnÃ³stico para o VPN Gateway

```bash
VPNGW_ID=$(az network vnet-gateway show \
    --resource-group $RESOURCE_GROUP \
    --name "vpngw-contoso-hub" \
    --query "id" \
    --output tsv)

az monitor diagnostic-settings create \
    --name "diag-vpngw-to-law" \
    --resource $VPNGW_ID \
    --workspace $WORKSPACE_ID \
    --logs '[{"category":"GatewayDiagnosticLog","enabled":true},{"category":"TunnelDiagnosticLog","enabled":true},{"category":"RouteDiagnosticLog","enabled":true},{"category":"IKEDiagnosticLog","enabled":true}]' \
    --metrics '[{"category":"AllMetrics","enabled":true}]'
```

### Etapa 4: Habilitar NSG flow logs (enviados para Storage Account com Traffic Analytics)

```bash
STORAGE_ID=$(az storage account show \
    --resource-group $RESOURCE_GROUP \
    --name "stcontosoflowlogs" \
    --query "id" \
    --output tsv)

NSG_ID=$(az network nsg show \
    --resource-group $RESOURCE_GROUP \
    --name "nsg-workload-subnet" \
    --query "id" \
    --output tsv)

az network watcher flow-log create \
    --resource-group $RESOURCE_GROUP \
    --name "fl-nsg-workload" \
    --nsg $NSG_ID \
    --storage-account $STORAGE_ID \
    --workspace $WORKSPACE_ID \
    --enabled true \
    --traffic-analytics true \
    --interval 10 \
    --location $LOCATION
```

:::caution NSG flow logs vs configuraÃ§Ãµes de diagnÃ³stico

Os NSG flow logs NÃƒO sÃ£o enviados diretamente para o Log Analytics. Eles sÃ£o armazenados em uma Storage Account. Para consultar dados de fluxo no Log Analytics, vocÃª deve habilitar o Traffic Analytics, que processa os flow logs e escreve dados resumidos na tabela `AzureNetworkAnalytics_CL`. O parÃ¢metro `--traffic-analytics true` e o parÃ¢metro `--workspace` habilitam esse pipeline.

:::

### Etapa 5: Verificar se as configuraÃ§Ãµes de diagnÃ³stico estÃ£o ativas

```bash
az monitor diagnostic-settings list \
    --resource $LB_ID \
    --output table
```

---

## Tarefa 4: Consultar logs de rede com KQL no Log Analytics

Use a Kusto Query Language para analisar os resultados do Connection Monitor e dados de anÃ¡lise de rede.

### Etapa 1: Consultar resultados de teste do Connection Monitor

Abra o workspace do Log Analytics no portal do Azure e execute as seguintes consultas KQL. Elas tambÃ©m podem ser executadas via Azure CLI ou API REST.

**Visualizar resultados recentes de teste do Connection Monitor:**

```text
NWConnectionMonitorTestResult
| where TimeGenerated > ago(1h)
| project TimeGenerated, ConnectionMonitorResourceId, TestGroupName,
    SourceName, DestinationName, TestConfigurationName,
    TestResult, ChecksFailed, ChecksTotal,
    AvgRoundTripTimeMs, MaxRoundTripTimeMs
| order by TimeGenerated desc
| take 50
```

### Etapa 2: Identificar testes com falha

```text
NWConnectionMonitorTestResult
| where TimeGenerated > ago(24h)
| where TestResult == "Fail"
| summarize FailureCount = count(),
    AvgLatency = avg(AvgRoundTripTimeMs),
    LastFailure = max(TimeGenerated)
    by SourceName, DestinationName, TestConfigurationName
| order by FailureCount desc
```

### Etapa 3: Monitorar tendÃªncias de latÃªncia

```text
NWConnectionMonitorTestResult
| where TimeGenerated > ago(7d)
| where TestGroupName == "tg-crossregion"
| summarize P50Latency = percentile(AvgRoundTripTimeMs, 50),
    P95Latency = percentile(AvgRoundTripTimeMs, 95),
    P99Latency = percentile(AvgRoundTripTimeMs, 99)
    by bin(TimeGenerated, 1h)
| render timechart
```

### Etapa 4: Consultar dados do Traffic Analytics (dos NSG flow logs)

```text
AzureNetworkAnalytics_CL
| where TimeGenerated > ago(1h)
| where SubType_s == "FlowLog"
| summarize TotalFlows = count(),
    AllowedFlows = countif(FlowStatus_s == "A"),
    DeniedFlows = countif(FlowStatus_s == "D")
    by NSGRule_s, bin(TimeGenerated, 5m)
| order by DeniedFlows desc
```

### Etapa 5: Encontrar os maiores consumidores nos dados de fluxo do NSG

```text
AzureNetworkAnalytics_CL
| where TimeGenerated > ago(1h)
| where SubType_s == "FlowLog"
| where FlowStatus_s == "A"
| summarize BytesSent = sum(OutboundBytes_d),
    BytesReceived = sum(InboundBytes_d),
    FlowCount = count()
    by SrcIP_s, DestIP_s, DestPort_d
| top 10 by BytesSent desc
```

:::tip Nota para o exame

Para o exame AZ-700, conheÃ§a as principais tabelas do Log Analytics para monitoramento de rede:
- `NWConnectionMonitorTestResult` -- Resultados de teste do Connection Monitor
- `NWConnectionMonitorPathResult` -- Dados de caminho hop a hop
- `AzureNetworkAnalytics_CL` -- Dados do Traffic Analytics dos NSG flow logs
- `AzureDiagnostics` -- Logs do VPN Gateway, Load Balancer e Application Gateway (quando nÃ£o se usam tabelas especÃ­ficas de recurso)

:::

---

## Tarefa 5: Visualizar topologia de rede no Azure Monitor Network Insights

O Network Insights fornece uma visualizaÃ§Ã£o de topologia sem necessidade de configuraÃ§Ã£o que descobre automaticamente todos os recursos de rede em suas assinaturas.

### Etapa 1: Acessar o Network Insights

O Network Insights Ã© acessado pelo portal do Azure:

1. Navegue atÃ© **Azure Monitor** no portal
2. Selecione **Networks** na seÃ§Ã£o Insights
3. O painel carrega automaticamente sem configuraÃ§Ã£o adicional

### Etapa 2: Explorar a visualizaÃ§Ã£o de topologia

A aba Topology exibe um mapa interativo dos seus recursos de rede mostrando:

- Redes virtuais e seus relacionamentos de peering
- Sub-redes e recursos conectados (VMs, NICs, NSGs)
- Load balancers e pools de backend
- Gateways VPN/ExpressRoute e conexÃµes
- AssociaÃ§Ãµes de Network Security Groups

### Etapa 3: Revisar o status de conectividade

A aba Connectivity no Network Insights agrega dados do Connection Monitor para mostrar:

- Status geral de integridade de todos os caminhos monitorados
- Testes com falha ou degradados
- TendÃªncias de latÃªncia em todos os grupos de teste

### Etapa 4: Inspecionar mÃ©tricas de integridade do recurso

Use o portal para investigar tipos de recursos especÃ­ficos:

1. Clique em qualquer recurso na visualizaÃ§Ã£o de topologia
2. Revise as mÃ©tricas associadas (throughput, descarte de pacotes, contagem de conexÃµes)
3. Acesse os logs de diagnÃ³stico diretamente do cartÃ£o do recurso

### Etapa 5: Gerar topologia programaticamente (para automaÃ§Ã£o)

```bash
az network watcher show-topology \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --query "resources[].{Name:name, Type:id}" \
    --output table
```

:::note Capacidades do Network Insights

O Network Insights nÃ£o requer instalaÃ§Ã£o de agente nem configuraÃ§Ã£o adicional. Ele descobre automaticamente recursos em todas as assinaturas Ã s quais vocÃª tem acesso. No entanto, os dados do Connection Monitor sÃ³ aparecem apÃ³s vocÃª configurar os testes do Connection Monitor (conforme feito nas Tarefas 1-2). A visualizaÃ§Ã£o de topologia Ã© atualizada aproximadamente a cada 5 minutos.

:::

---

## Tarefa 6: Criar alertas para falhas do Connection Monitor

Configure alertas de mÃ©tricas que notificam a equipe do NOC quando a conectividade degrada ou a latÃªncia excede os limites.

### Etapa 1: Criar um grupo de aÃ§Ã£o para notificaÃ§Ãµes do NOC

```bash
az monitor action-group create \
    --resource-group $RESOURCE_GROUP \
    --name "ag-noc-alerts" \
    --short-name "NOC" \
    --action email noc-team noc@contoso.com
```

### Etapa 2: Criar um alerta para falhas de verificaÃ§Ã£o do Connection Monitor

```bash
CM_RESOURCE_ID=$(az network watcher connection-monitor show \
    --name $CM_NAME \
    --location $LOCATION \
    --query "id" \
    --output tsv)

az monitor metrics alert create \
    --name "alert-conn-monitor-failures" \
    --resource-group $RESOURCE_GROUP \
    --scopes $CM_RESOURCE_ID \
    --condition "avg ChecksFailedPercent > 50" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --severity 1 \
    --action "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Insights/actionGroups/ag-noc-alerts" \
    --description "Connection Monitor checks failing above 50 percent threshold"
```

### Etapa 3: Criar um alerta para alta latÃªncia

```bash
az monitor metrics alert create \
    --name "alert-conn-monitor-latency" \
    --resource-group $RESOURCE_GROUP \
    --scopes $CM_RESOURCE_ID \
    --condition "avg RoundTripTimeMs > 200" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --severity 2 \
    --action "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Insights/actionGroups/ag-noc-alerts" \
    --description "Connection Monitor average latency exceeding 200ms"
```

### Etapa 4: Criar um alerta para acessibilidade de teste (falha completa)

```bash
az monitor metrics alert create \
    --name "alert-conn-monitor-unreachable" \
    --resource-group $RESOURCE_GROUP \
    --scopes $CM_RESOURCE_ID \
    --condition "max TestResult < 1" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --severity 0 \
    --action "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Insights/actionGroups/ag-noc-alerts" \
    --description "Connection Monitor destination unreachable - critical alert"
```

### Etapa 5: Verificar se os alertas foram criados

```bash
az monitor metrics alert list \
    --resource-group $RESOURCE_GROUP \
    --output table
```

:::tip Nota para o exame

O Connection Monitor expÃµe duas mÃ©tricas principais para alertas:
- `ChecksFailedPercent` -- Porcentagem de verificaÃ§Ãµes que falharam na janela de avaliaÃ§Ã£o
- `RoundTripTimeMs` -- Tempo mÃ©dio de ida e volta em milissegundos

Use `--window-size` para definir o perÃ­odo de agregaÃ§Ã£o e `--evaluation-frequency` para controlar com que frequÃªncia a regra Ã© avaliada. Uma janela de 5m com frequÃªncia de avaliaÃ§Ã£o de 1m significa que o alerta verifica a cada minuto usando dados dos Ãºltimos 5 minutos.

:::

---

## CenÃ¡rios de quebra e correÃ§Ã£o

Esses cenÃ¡rios representam configuraÃ§Ãµes incorretas comuns encontradas em produÃ§Ã£o e no exame.

### CenÃ¡rio 1: Connection Monitor mostra "Unreachable" mas o trÃ¡fego funciona

**Sintoma:** O Connection Monitor reporta todos os testes como falhos com status "Unreachable", mas vocÃª consegue fazer SSH ou RDP para a VM de destino e confirmar que o trÃ¡fego de rede flui normalmente.

**Causa raiz:** O Azure Monitor Agent (ou o agente legado do Log Analytics) nÃ£o estÃ¡ instalado na VM de origem. O Connection Monitor requer um agente no endpoint de origem para executar os testes.

**DiagnÃ³stico:**

```bash
az vm extension list \
    --resource-group $RESOURCE_GROUP \
    --vm-name $SOURCE_VM_NAME \
    --query "[?contains(name, 'AzureMonitor') || contains(name, 'MicrosoftMonitoring')].{Name:name, State:provisioningState}" \
    --output table
```

Se nenhuma extensÃ£o de monitoramento aparecer, o agente estÃ¡ ausente.

**CorreÃ§Ã£o:**

```bash
az vm extension set \
    --resource-group $RESOURCE_GROUP \
    --vm-name $SOURCE_VM_NAME \
    --name AzureMonitorLinuxAgent \
    --publisher Microsoft.Azure.Monitor \
    --enable-auto-upgrade true
```

Para VMs Windows, use `AzureMonitorWindowsAgent` como nome da extensÃ£o.

### CenÃ¡rio 2: Log Analytics nÃ£o mostra dados de rede

**Sintoma:** VocÃª navega atÃ© o Log Analytics e consulta `AzureDiagnostics` ou `NWConnectionMonitorTestResult` mas obtÃ©m zero resultados mesmo apÃ³s esperar 30 minutos.

**Causa raiz:** As configuraÃ§Ãµes de diagnÃ³stico nÃ£o foram definidas nos recursos de rede, ou o Connection Monitor nÃ£o foi configurado com uma saÃ­da de workspace.

**DiagnÃ³stico:**

```bash
# Check if diagnostic settings exist for the Load Balancer
az monitor diagnostic-settings list \
    --resource $LB_ID \
    --output table

# Check Connection Monitor workspace output
az network watcher connection-monitor show \
    --name $CM_NAME \
    --location $LOCATION \
    --query "outputs"
```

**CorreÃ§Ã£o:** Crie as configuraÃ§Ãµes de diagnÃ³stico (veja a Tarefa 3) ou adicione uma saÃ­da de workspace ao Connection Monitor:

```bash
az network watcher connection-monitor output add \
    --connection-monitor $CM_NAME \
    --location $LOCATION \
    --type Workspace \
    --workspace-id $WORKSPACE_ID
```

### CenÃ¡rio 3: Alerta nunca dispara apesar de problemas de conectividade

**Sintoma:** Os testes de conectividade mostram falhas no painel do Connection Monitor, mas o alerta configurado nunca dispara.

**Causa raiz:** O limite do alerta estÃ¡ definido muito alto (por exemplo, `ChecksFailedPercent > 95` quando as falhas reais sÃ£o 60%), ou a janela de avaliaÃ§Ã£o Ã© muito grande em relaÃ§Ã£o Ã  duraÃ§Ã£o da falha.

**DiagnÃ³stico:**

```bash
az monitor metrics alert show \
    --name "alert-conn-monitor-failures" \
    --resource-group $RESOURCE_GROUP \
    --query "{condition:criteria.allOf[0], windowSize:windowSize, frequency:evaluationFrequency}"
```

**CorreÃ§Ã£o:** Reduza o limite e diminua o tamanho da janela:

```bash
az monitor metrics alert update \
    --name "alert-conn-monitor-failures" \
    --resource-group $RESOURCE_GROUP \
    --condition "avg ChecksFailedPercent > 20" \
    --window-size 5m \
    --evaluation-frequency 1m
```

---

## Limpeza

Remova todos os recursos criados neste desafio:

```bash
az group delete \
    --name $RESOURCE_GROUP \
    --yes \
    --no-wait
```

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-12-q1",
    question: "Um teste do Connection Monitor mostra 'Unreachable' para todos os destinos, mas você consegue fazer ping no destino a partir da VM de origem manualmente. Qual é a causa mais provável?",
    options: [
      "O NSG no destino bloqueia especificamente o tráfego do Connection Monitor",
      "O Azure Monitor Agent não está instalado na VM de origem",
      "O Connection Monitor excedeu sua cota de testes",
      "A VM de destino não tem um endereço IP público"
    ],
    correctIndex: 1,
    explanation: "O Connection Monitor requer o Azure Monitor Agent (ou o agente legado do Log Analytics) instalado nas VMs de origem para executar testes de conectividade. Sem o agente, o Connection Monitor não consegue iniciar testes a partir da origem, resultando no status 'Unreachable' mesmo quando a conectividade manual funciona normalmente."
  },
  {
    id: "az700-12-q2",
    question: "Você configura NSG flow logs e espera consultá-los no Log Analytics. Após 2 horas, a tabela AzureNetworkAnalytics_CL está vazia. Qual é a configuração mais provável que está faltando?",
    options: [
      "Configurações de diagnóstico devem ser criadas no recurso de NSG",
      "O Traffic Analytics deve ser habilitado na configuração do flow log",
      "O NSG deve ter pelo menos uma regra de negação para gerar dados de fluxo",
      "Flow logs requerem o Azure Monitor Agent em todas as VMs na subnet"
    ],
    correctIndex: 1,
    explanation: "Os NSG flow logs são gravados em uma Storage Account, não diretamente no Log Analytics. Para obter dados de fluxo no Log Analytics, você deve habilitar o Traffic Analytics na configuração do flow log. O Traffic Analytics processa os flow logs brutos e grava dados resumidos na tabela AzureNetworkAnalytics_CL no workspace especificado."
  },
  {
    id: "az700-12-q3",
    question: "Qual tabela do Log Analytics contém dados de caminho hop-by-hop mostrando a rota percorrida entre os endpoints de origem e destino do Connection Monitor?",
    options: [
      "NWConnectionMonitorTestResult",
      "NWConnectionMonitorPathResult",
      "AzureNetworkAnalytics_CL",
      "AzureDiagnostics"
    ],
    correctIndex: 1,
    explanation: "NWConnectionMonitorPathResult contém os dados de rastreamento de caminho hop-by-hop mostrando cada salto intermediário entre origem e destino. NWConnectionMonitorTestResult contém o status geral de aprovação/falha e métricas de latência. AzureNetworkAnalytics_CL contém dados do Traffic Analytics dos NSG flow logs."
  },
  {
    id: "az700-12-q4",
    question: "Você precisa alertar a equipe do NOC quando mais de 30 por cento das verificações do Connection Monitor falharem em uma janela de 5 minutos, avaliada a cada minuto. Quais parâmetros do az CLI alcançam isso?",
    options: [
      "--condition 'avg ChecksFailedPercent > 30' --window-size 5m --evaluation-frequency 1m",
      "--condition 'total ChecksFailed > 30' --window-size 1m --evaluation-frequency 5m",
      "--condition 'count ChecksFailedPercent > 0.30' --window-size 5m --evaluation-frequency 1m",
      "--condition 'max ChecksFailedPercent > 30' --window-size 1m --evaluation-frequency 1m"
    ],
    correctIndex: 0,
    explanation: "A condição correta usa 'avg ChecksFailedPercent > 30' com --window-size 5m (período de agregação) e --evaluation-frequency 1m (frequência de verificação da regra). ChecksFailedPercent é uma métrica de porcentagem (0-100), então 30 significa 30 por cento. A agregação avg ao longo de 5 minutos suaviza picos transitórios."
  },
  {
    id: "az700-12-q5",
    question: "O que é necessário para o Azure Monitor Network Insights exibir a topologia de rede?",
    options: [
      "O Connection Monitor deve ser configurado com pelo menos um grupo de teste",
      "O Azure Monitor Agent deve ser instalado em todas as VMs na assinatura",
      "Nenhuma configuração adicional é necessária; ele descobre automaticamente os recursos de rede",
      "Configurações de diagnóstico devem ser habilitadas em todas as redes virtuais"
    ],
    correctIndex: 2,
    explanation: "O Azure Monitor Network Insights é um dashboard de configuração zero que descobre e exibe automaticamente todos os recursos de rede (VNets, subnets, peerings, gateways, load balancers) nas assinaturas que você tem acesso. Nenhuma instalação de agente ou configuração de diagnóstico é necessária para a visualização de topologia. No entanto, o Connection Monitor deve ser configurado separadamente para que dados de monitoramento de conectividade apareçam na aba Connectivity."
  },
  {
    id: "az700-12-q6",
    question: "Você cria um Connection Monitor com --frequency 60 e --threshold-round-trip-time 100. O que esses parâmetros controlam?",
    options: [
      "Testes são executados a cada 60 minutos e alertam se a latência exceder 100 segundos",
      "Testes são executados a cada 60 segundos e o teste é avaliado como falho se o tempo de ida e volta exceder 100 milissegundos",
      "Testes são executados 60 vezes por hora e expiram após 100 milissegundos",
      "O monitor verifica 60 endpoints e permite 100ms de jitter"
    ],
    correctIndex: 1,
    explanation: "O parâmetro --frequency define o intervalo de teste em segundos (60 significa um teste a cada 60 segundos). O --threshold-round-trip-time define o tempo máximo aceitável de ida e volta em milissegundos. Se o RTT medido exceder esse limite, a verificação individual é marcada como falha e contribui para a métrica ChecksFailedPercent."
  }
]} />

---

## Recursos adicionais

- [Connection Monitor overview](https://learn.microsoft.com/azure/network-watcher/connection-monitor-overview)
- [Create a Connection Monitor - Azure CLI](https://learn.microsoft.com/azure/network-watcher/connection-monitor-create-using-cli)
- [Azure Monitor Network Insights](https://learn.microsoft.com/azure/network-watcher/network-insights-overview)
- [NSG flow logs with Traffic Analytics](https://learn.microsoft.com/azure/network-watcher/traffic-analytics)
- [Monitor VPN Gateway with Azure Monitor](https://learn.microsoft.com/azure/vpn-gateway/monitor-vpn-gateway)
- [KQL quick reference](https://learn.microsoft.com/azure/data-explorer/kql-quick-reference)
