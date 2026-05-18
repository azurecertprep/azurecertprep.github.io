---
sidebar_position: 27
title: "Desafio 27: Log Analytics & KQL em Profundidade"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 27: Log Analytics & KQL em Profundidade

:::info Tempo e Custo Estimados

**75-90 minutos** | **Custo estimado**: ~$0,15 | **Peso no Exame: 10-15%**

:::

## Cenário

A Contoso Ltd. precisa de logging centralizado com capacidades de consulta poderosas para atender tanto necessidades de conformidade quanto operacionais. A equipe de operações deve coletar logs de VMs, recursos do Azure e aplicações em um único workspace do Log Analytics, e então escrever consultas KQL para analisar desempenho, detectar anomalias e criar visualizações em workbooks.

## Habilidades do Exame Cobertas

- Criar e configurar workspace do Log Analytics
- Configurar definições de log no Azure Monitor
- Configurar regras de coleta de dados (DCR)
- Instalar e configurar o Azure Monitor Agent (AMA)
- Consultar e analisar logs usando KQL (where, summarize, join, render)
- Criar consultas salvas e funções
- Criar Azure Monitor Workbooks com visualizações
- Configurar diagnostic settings para recursos do Azure

## Referência Sysadmin ↔ Azure

| On-Prem / Tradicional | Equivalente no Azure |
|---|---|
| Splunk / ELK Stack / Graylog | Workspace do Log Analytics |
| rsyslog / syslog-ng / Fluentd | Azure Monitor Agent (AMA) |
| Rotação de logs / políticas de retenção | Configurações de retenção do workspace |
| Consultas SQL em bancos de dados de logs | Kusto Query Language (KQL) |
| Dashboards Grafana | Azure Monitor Workbooks |
| Arquivos de configuração collectd / Telegraf | Data Collection Rules (DCR) |
| Encaminhamento do Windows Event Viewer | Coleta de Windows Event Log via DCR |

## Configuração Inicial

```bash
# Variables
RG="rg-az104-challenge27"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION
```

## Tarefas

### Tarefa 1: Criar um Workspace do Log Analytics

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --location $LOCATION \
  --retention-time 30 \
  --sku PerGB2018

# Verify workspace
az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --query "{Name:name, SKU:sku.name, Retention:retentionInDays, DailyCapGB:workspaceCapping.dailyQuotaGb}" -o table

# Get workspace ID and key (needed for agent configuration)
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --query "customerId" -o tsv)

echo "Workspace ID: $WORKSPACE_ID"
```

:::tip Dica

O SKU PerGB2018 cobra por GB ingerido. Para o exame, conheça estas opções:
- **Free tier**: Limite de 500 MB/dia, retenção de 7 dias
- **Per-GB**: Pague por GB ingerido, retenção configurável de 30-730 dias
- **Commitment tiers**: 100/200/300/400/500 GB/dia para descontos
- **Daily cap**: Pode definir um limite diário de ingestão para controlar custos

:::
### Tarefa 2: Implantar VMs Alvo para Monitoramento

```bash
# Create a VNet
az network vnet create \
  --resource-group $RG \
  --name vnet-monitored \
  --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-vms \
  --subnet-prefix 10.0.1.0/24

# Create a Linux VM
az vm create \
  --resource-group $RG \
  --name vm-linux-web \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-monitored \
  --subnet subnet-vms \
  --public-ip-address vm-linux-pip \
  --admin-username azureuser \
  --generate-ssh-keys

# Create a Windows VM
az vm create \
  --resource-group $RG \
  --name vm-win-app \
  --image Win2022Datacenter \
  --size Standard_B2s \
  --vnet-name vnet-monitored \
  --subnet subnet-vms \
  --public-ip-address vm-win-pip \
  --admin-username azureuser \
  --admin-password 'C0nt0so!Pass2024'

# Install a web server on Linux to generate logs
az vm run-command invoke \
  --resource-group $RG \
  --name vm-linux-web \
  --command-id RunShellScript \
  --scripts "sudo apt-get update && sudo apt-get install -y nginx && sudo systemctl start nginx"
```

### Tarefa 3: Criar Data Collection Rules (DCR)

```bash
# Get workspace resource ID
WORKSPACE_RESOURCE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --query "id" -o tsv)

# Create a DCR for Linux performance and syslog
az monitor data-collection rule create \
  --resource-group $RG \
  --name dcr-linux-perf-syslog \
  --location $LOCATION \
  --data-flows '[{"streams":["Microsoft-Perf","Microsoft-Syslog"],"destinations":["law-destination"]}]' \
  --log-analytics "[{\"name\":\"law-destination\",\"workspace-resource-id\":\"$WORKSPACE_RESOURCE_ID\"}]" \
  --performance-counters '[{"name":"perfCounters","streams":["Microsoft-Perf"],"sampling-frequency":60,"counter-specifiers":["\\Processor(*)\\% Processor Time","\\Memory\\Available Bytes","\\LogicalDisk(*)\\% Free Space","\\Network(*)\\Total Bytes Transmitted"]}]' \
  --syslog '[{"name":"syslogCollection","streams":["Microsoft-Syslog"],"facility-names":["auth","authpriv","daemon","kern","syslog"],"log-levels":["Warning","Error","Critical","Alert","Emergency"]}]'

# Create a DCR for Windows events and performance
az monitor data-collection rule create \
  --resource-group $RG \
  --name dcr-windows-events \
  --location $LOCATION \
  --data-flows '[{"streams":["Microsoft-Perf","Microsoft-Event"],"destinations":["law-destination"]}]' \
  --log-analytics "[{\"name\":\"law-destination\",\"workspace-resource-id\":\"$WORKSPACE_RESOURCE_ID\"}]" \
  --performance-counters '[{"name":"winPerfCounters","streams":["Microsoft-Perf"],"sampling-frequency":60,"counter-specifiers":["\\Processor(*)\\% Processor Time","\\Memory\\% Committed Bytes In Use","\\LogicalDisk(*)\\% Free Space"]}]' \
  --windows-event-logs '[{"name":"winEvents","streams":["Microsoft-Event"],"x-path-queries":["Application!*[System[(Level=1 or Level=2 or Level=3)]]","System!*[System[(Level=1 or Level=2 or Level=3)]]","Security!*[System[(band(Keywords,13510798882111488))]]"]}]'

# List DCRs
az monitor data-collection rule list --resource-group $RG -o table
```

### Tarefa 4: Instalar Azure Monitor Agent e Associar DCRs

```bash
# Install Azure Monitor Agent on Linux VM
az vm extension set \
  --resource-group $RG \
  --vm-name vm-linux-web \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor \
  --version 1.0 \
  --enable-auto-upgrade true

# Install Azure Monitor Agent on Windows VM
az vm extension set \
  --resource-group $RG \
  --vm-name vm-win-app \
  --name AzureMonitorWindowsAgent \
  --publisher Microsoft.Azure.Monitor \
  --version 1.0 \
  --enable-auto-upgrade true

# Associate Linux DCR with the Linux VM
LINUX_VM_ID=$(az vm show -g $RG -n vm-linux-web --query "id" -o tsv)
DCR_LINUX_ID=$(az monitor data-collection rule show \
  --resource-group $RG \
  --name dcr-linux-perf-syslog \
  --query "id" -o tsv)

az monitor data-collection rule association create \
  --name "linux-dcr-association" \
  --resource $LINUX_VM_ID \
  --rule-id $DCR_LINUX_ID

# Associate Windows DCR with the Windows VM
WIN_VM_ID=$(az vm show -g $RG -n vm-win-app --query "id" -o tsv)
DCR_WIN_ID=$(az monitor data-collection rule show \
  --resource-group $RG \
  --name dcr-windows-events \
  --query "id" -o tsv)

az monitor data-collection rule association create \
  --name "windows-dcr-association" \
  --resource $WIN_VM_ID \
  --rule-id $DCR_WIN_ID

# Verify associations
az monitor data-collection rule association list --resource $LINUX_VM_ID -o table
az monitor data-collection rule association list --resource $WIN_VM_ID -o table
```

:::tip Dica

O AMA substitui o agente legado do Log Analytics (MMA/OMS) e a extensão de Diagnósticos:
- **AMA**: Usa Data Collection Rules (DCR), suporta multi-homing, usa managed identity
- **MMA Legado**: Usa configuração do workspace, sendo descontinuado
- Para o exame AZ-104, foque no AMA + DCR (abordagem moderna)

:::
### Tarefa 5: Configurar Diagnostic Settings para Recursos do Azure

```bash
# Enable diagnostic settings for the VNet (sending to Log Analytics)
VNET_ID=$(az network vnet show -g $RG -n vnet-monitored --query "id" -o tsv)

az monitor diagnostic-settings create \
  --name "vnet-diagnostics" \
  --resource $VNET_ID \
  --workspace $WORKSPACE_RESOURCE_ID \
  --metrics '[{"category":"AllMetrics","enabled":true}]'

# Enable diagnostic settings for NSG (if exists)
# Create a storage account for archival
DIAG_STORAGE="diagstorage$RANDOM"
az storage account create \
  --resource-group $RG \
  --name $DIAG_STORAGE \
  --sku Standard_LRS

# List available diagnostic categories for a resource type
az monitor diagnostic-settings categories list \
  --resource $VNET_ID -o table
```

**Passos no Portal:**
1. Navegue até qualquer recurso do Azure > **Diagnostic settings**
2. Clique em **Add diagnostic setting**
3. Selecione categorias de logs e métricas para coletar
4. Escolha destinos: workspace do Log Analytics, conta de armazenamento, Event Hub
5. Clique em **Save**

### Tarefa 6: Escrever Consultas KQL

:::tip Dica

Aguarde 10-15 minutos após configurar a coleta de dados para os logs aparecerem. Use o editor de consultas do Log Analytics no Portal para testes interativos.

:::
**Portal: Navegue até o workspace do Log Analytics > Logs**

```kusto
// Basic query: Find all heartbeat records from the last hour
Heartbeat
| where TimeGenerated > ago(1h)
| project Computer, TimeGenerated, OSType, Version

// Filter (where): Find errors in syslog
Syslog
| where TimeGenerated > ago(24h)
| where SeverityLevel in ("err", "crit", "alert", "emerg")
| project TimeGenerated, Computer, Facility, SeverityLevel, SyslogMessage
| order by TimeGenerated desc

// Summarize: Count events by severity
Syslog
| where TimeGenerated > ago(24h)
| summarize Count=count() by SeverityLevel
| order by Count desc

// Summarize with time bins: CPU usage over time
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| where InstanceName == "_Total"
| summarize AvgCPU=avg(CounterValue) by bin(TimeGenerated, 5m), Computer
| order by TimeGenerated asc

// Join: Correlate performance with events
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| where InstanceName == "_Total"
| summarize AvgCPU=avg(CounterValue) by bin(TimeGenerated, 5m), Computer
| join kind=leftouter (
    Syslog
    | where TimeGenerated > ago(1h)
    | summarize ErrorCount=count() by bin(TimeGenerated, 5m), Computer
) on TimeGenerated, Computer
| project TimeGenerated, Computer, AvgCPU, ErrorCount=coalesce(ErrorCount, 0)

// Render: Create a time chart
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| where InstanceName == "_Total"
| summarize AvgCPU=avg(CounterValue) by bin(TimeGenerated, 5m), Computer
| render timechart

// Advanced: Find VMs with high memory usage
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Memory"
| where CounterName == "Available Bytes" or CounterName == "% Committed Bytes In Use"
| summarize AvgValue=avg(CounterValue) by Computer, CounterName
| evaluate pivot(CounterName, any(AvgValue))
```

### Tarefa 7: Criar Consultas Salvas e Funções

```bash
# Save a query via the Portal:
# 1. Run the query in Log Analytics > Logs
# 2. Click "Save" > "Save as query"
# 3. Name: "High CPU VMs", Category: "Performance"

# Create a function (reusable query) via CLI
az monitor log-analytics workspace saved-search create \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --name "HighCPUAlerts" \
  --display-name "High CPU VMs" \
  --category "Performance" \
  --saved-query "Perf | where ObjectName == 'Processor' and CounterName == '% Processor Time' and InstanceName == '_Total' | where CounterValue > 80 | summarize AvgCPU=avg(CounterValue) by Computer, bin(TimeGenerated, 5m) | where AvgCPU > 80"

# List saved queries
az monitor log-analytics workspace saved-search list \
  --resource-group $RG \
  --workspace-name law-contoso-ops -o table
```

### Tarefa 8: Criar um Workbook com Visualizações

**Passos no Portal (Workbooks requerem Portal):**

1. Navegue até **Azure Monitor** > **Workbooks**
2. Clique em **New**
3. Adicione os seguintes elementos:

**Seção 1 | Visão Geral de Saúde das VMs (Grid):**
```kusto
Heartbeat
| where TimeGenerated > ago(5m)
| summarize LastHeartbeat=max(TimeGenerated) by Computer, OSType
| extend Status = iff(LastHeartbeat > ago(5m), "Healthy", "Unhealthy")
| project Computer, OSType, LastHeartbeat, Status
```

**Seção 2 | Uso de CPU ao Longo do Tempo (Gráfico de Linha):**
```kusto
Perf
| where TimeGenerated > ago(4h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| where InstanceName == "_Total"
| summarize AvgCPU=avg(CounterValue) by bin(TimeGenerated, 5m), Computer
| render timechart
```

**Seção 3 | Resumo de Erros (Gráfico de Pizza):**
```kusto
Syslog
| where TimeGenerated > ago(24h)
| where SeverityLevel in ("err", "crit", "alert", "emerg")
| summarize Count=count() by Facility
| render piechart
```

**Seção 4 | Top Consumidores de Rede (Gráfico de Barras):**
```kusto
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Network" and CounterName == "Total Bytes Transmitted"
| summarize TotalBytes=sum(CounterValue) by Computer
| top 10 by TotalBytes desc
| render barchart
```

4. Clique em **Save** e nomeie o workbook "Contoso Operations Dashboard"

### Tarefa 9: Configurar Definições do Workspace

```bash
# Set daily ingestion cap (cost control)
az monitor log-analytics workspace update \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --quota 1

# Update retention period
az monitor log-analytics workspace update \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --retention-time 60

# Configure table-level retention (different retention per table)
# Some tables may need longer retention for compliance
az monitor log-analytics workspace table update \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --name Syslog \
  --retention-time 90

# Show workspace configuration
az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --query "{Name:name, Retention:retentionInDays, DailyCapGB:workspaceCapping.dailyQuotaGb}" -o table
```

## Critérios de Sucesso

<SuccessChecklist
  storageKey="az104-challenge-27"
  items={[
    "Workspace do Log Analytics criado com SKU e retenção apropriados",
    "Data Collection Rules criadas para Linux (perf + syslog) e Windows (perf + events)",
    "Azure Monitor Agent instalado em ambas as VMs Linux e Windows",
    "Associações DCR criadas (VMs vinculadas às suas respectivas DCRs)",
    "Diagnostic settings configurados para recursos do Azure",
    "Consultas KQL escritas e testadas (where, summarize, join, render)",
    "Consultas salvas ou funções criadas",
    "Workbook criado com múltiplas visualizações",
    "Daily cap e retenção do workspace configurados"
  ]}
/>
## Cenários de Quebrar & Consertar

### Cenário A: Nenhum Dado Aparecendo no Log Analytics

```bash
# Check if AMA extension is installed and healthy
az vm extension list --resource-group $RG --vm-name vm-linux-web -o table

# Check if DCR association exists
az monitor data-collection rule association list \
  --resource $LINUX_VM_ID -o table

# Check DCR configuration
az monitor data-collection rule show \
  --resource-group $RG \
  --name dcr-linux-perf-syslog

# Common causes:
# 1. AMA extension not installed or failed
# 2. DCR not associated with the VM
# 3. Workspace ID mismatch in DCR
# 4. Wait time (data takes 5-15 minutes to appear)
```

### Cenário B: Consulta KQL Não Retorna Resultados

```kusto
// Common mistake: Wrong table name
// "Perf" not "PerformanceCounters" or "perf"

// Common mistake: Wrong time range
// Use ago(1h), ago(24h), not specific dates that may be in the future

// Debug: Check what tables have data
search *
| where TimeGenerated > ago(1h)
| summarize Count=count() by $table
| order by Count desc
```

### Cenário C: Daily Cap Atingido

```bash
# Symptom: Data stops flowing into workspace
# Check current usage
az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --query "workspaceCapping"

# Fix: Increase or remove the daily cap
az monitor log-analytics workspace update \
  --resource-group $RG \
  --workspace-name law-contoso-ops \
  --quota -1
# (-1 removes the cap)
```

## Verificação de Conhecimento

**1. Qual é a diferença entre Data Collection Rules e Diagnostic Settings?**

<details>
<summary>Mostrar Resposta</summary>

| Recurso | Data Collection Rules (DCR) | Diagnostic Settings |
|---------|---------------------------|-------------------|
| Origem | VMs (via agente AMA) | Recursos de plataforma Azure |
| Tipos de dados | Contadores de perf, logs, customizados | Métricas de plataforma, logs de recursos |
| Agente necessário | Sim (AMA) | Não (nativo) |
| Configuração | Centralizada, reutilizável | Por recurso |
| Filtragem | Sim (no momento da coleta) | Baseada em categoria |

Use DCRs para dados de VM/compute. Use Diagnostic Settings para dados de PaaS/plataforma.
</details>

**2. Quais são os operadores KQL essenciais para o exame AZ-104?**

<details>
<summary>Mostrar Resposta</summary>

| Operador | Finalidade | Exemplo |
|----------|---------|---------|
| where | Filtrar linhas | `where CounterValue > 80` |
| project | Selecionar colunas | `project Computer, TimeGenerated` |
| summarize | Agregar | `summarize avg(CounterValue) by Computer` |
| bin() | Agrupamento temporal | `bin(TimeGenerated, 5m)` |
| join | Combinar tabelas | `Table1 \| join Table2 on Column` |
| render | Visualizar | `render timechart` |
| extend | Adicionar coluna calculada | `extend GB = Bytes / 1073741824` |
| order by | Ordenar | `order by Count desc` |
| top | Pegar N maiores | `top 10 by Value desc` |
| count | Contar linhas | `count` |
</details>

**3. Qual é a diferença entre Azure Monitor Agent (AMA) e o agente legado Log Analytics Agent (MMA)?**

<details>
<summary>Mostrar Resposta</summary>

| Recurso | AMA (Novo) | MMA/OMS (Legado) |
|---------|-----------|-----------------|
| Configuração | Data Collection Rules | Configurações do workspace |
| Multi-homing | Nativo (múltiplas DCRs) | Limitado |
| Autenticação | Managed Identity | Chave do workspace |
| Filtragem | Na origem (DCR) | No workspace |
| Status | Atual, recomendado | Descontinuado (Ago 2024) |
| Nome da extensão | AzureMonitorLinuxAgent / AzureMonitorWindowsAgent | OmsAgentForLinux / MicrosoftMonitoringAgent |
</details>

**4. Como funciona a retenção do workspace?**

<details>
<summary>Mostrar Resposta</summary>

- Retenção padrão: 30 dias (incluída no preço Per-GB)
- Configurável: 30-730 dias (custo adicional além de 30 dias)
- Retenção por tabela: Substituir o padrão do workspace por tabela
- Tier de arquivo: Dados mais antigos que a retenção são movidos para arquivo (mais barato, requer restauração para consultar)
- Retenção interativa: Dados consultáveis imediatamente
- Conformidade: Algumas regulamentações exigem retenção de 1+ ano
</details>

## Limpeza

```bash
# Delete all resources
az group delete --name $RG --yes --no-wait

echo "Resources are being deleted in the background."
```

## Recursos de Aprendizagem

- [Visão geral dos Logs do Azure Monitor](https://learn.microsoft.com/azure/azure-monitor/logs/data-platform-logs)
- [Workspace do Log Analytics](https://learn.microsoft.com/azure/azure-monitor/logs/log-analytics-workspace-overview)
- [Data Collection Rules](https://learn.microsoft.com/azure/azure-monitor/essentials/data-collection-rule-overview)
- [Visão geral do Azure Monitor Agent](https://learn.microsoft.com/azure/azure-monitor/agents/azure-monitor-agent-overview)
- [Referência rápida de KQL](https://learn.microsoft.com/azure/data-explorer/kql-quick-reference)
- [Azure Monitor Workbooks](https://learn.microsoft.com/azure/azure-monitor/visualize/workbooks-overview)
- [Diagnostic settings](https://learn.microsoft.com/azure/azure-monitor/essentials/diagnostic-settings)
