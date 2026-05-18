---
sidebar_position: 1
title: "Challenge 14: Azure Monitor & Alerts"
---

# Desafio 14: Azure Monitor & Alerts

| | |
|---|---|
| **Tempo estimado** | 60 minutos |
| **Custo estimado** | ~$0,10 |
| 📊 **Peso no exame** | 10–15% |

## Cenário

A Contoso precisa de observabilidade em todo o ambiente Azure. O mandato do CTO é claro: **"Se você não pode monitorar, não pode gerenciar."** Seu trabalho é configurar o Azure Monitor, criar alertas e provar que a equipe consegue detectar e responder a problemas antes dos clientes.

## Habilidades do Exame Cobertas

- Interpretar métricas no Azure Monitor
- Configurar configurações de log no Azure Monitor
- Consultar e analisar logs no Azure Monitor (KQL)
- Configurar regras de alerta, grupos de ação e regras de processamento de alertas
- Configurar monitoramento para VMs, armazenamento e redes usando Azure Monitor Insights
- Usar Azure Network Watcher e Connection Monitor

## Referência Sysadmin ➜ Azure

| On-Prem / Tradicional | Equivalente no Azure |
|---|---|
| Nagios / Zabbix | Azure Monitor |
| syslog / Visualizador de Eventos | Log Analytics workspace |
| Dashboards Grafana | Azure Monitor Workbooks |
| Alertas por email/PagerDuty | Action Groups |
| Wireshark | Captura de pacotes do Network Watcher |

## Configuração

```bash
# Variables
RG="rg-az104-challenge14"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION
```

## Tarefas

### Tarefa 1: Criar um Log Analytics Workspace

```bash
az monitor log-analytics workspace create \
  --resource-group $RG \
  --workspace-name law-contoso \
  --location $LOCATION
```

### Tarefa 2: Implantar uma VM e Habilitar VM Insights

Implante uma VM e habilite o Azure Monitor VM Insights para coletar dados de desempenho e dependência.

```bash
az vm create \
  --resource-group $RG \
  --name vm-monitored \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys
```

Habilite o VM Insights pelo Portal do Azure: **VM → Insights → Habilitar**.

:::tip Dica

O VM Insights instala automaticamente o Azure Monitor Agent e configura uma regra de coleta de dados (DCR).
:::

### Tarefa 3: Explorar Métricas do Azure Monitor

Navegue até **Azure Monitor → Métricas** (ou a aba Métricas da VM) e explore:

- **Percentage CPU** | Utilização atual da CPU
- **Available Memory Bytes** | Pressão de memória
- **Disk Read/Write Operations/Sec** | I/O de disco

Tente fixar um gráfico em um dashboard.

### Tarefa 4: Configurar Diagnostic Settings

Envie logs e métricas da plataforma para o Log Analytics:

```bash
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-contoso \
  --query id -o tsv)

VM_ID=$(az vm show \
  --resource-group $RG \
  --name vm-monitored \
  --query id -o tsv)

# Enable diagnostic settings (via Portal for VMs, or CLI for supported resources)
# For a storage account example:
az monitor diagnostic-settings create \
  --name diag-to-law \
  --resource $VM_ID \
  --workspace $WORKSPACE_ID \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

:::note

Pode levar **15–30 minutos** para os dados de log aparecerem no Log Analytics após habilitar as configurações de diagnóstico. Isso é normal.
:::

### Tarefa 5: Escrever Consultas KQL

Abra **Log Analytics → Logs** e execute estas consultas:

```kusto
// Top 10 processes by CPU usage
Perf
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| where InstanceName == "_Total"
| summarize AvgCPU = avg(CounterValue) by Computer
| top 10 by AvgCPU desc
```

```kusto
// Find error events in the last 24 hours
Syslog
| where SeverityLevel == "error" or SeverityLevel == "err"
| where TimeGenerated > ago(24h)
| project TimeGenerated, Computer, SyslogMessage, Facility
| order by TimeGenerated desc
| take 50
```

```kusto
// Heartbeat | which VMs are reporting?
Heartbeat
| summarize LastHeartbeat = max(TimeGenerated) by Computer
| extend Status = iff(LastHeartbeat < ago(5m), "Offline", "Online")
| order by Status asc
```

<details>
<summary>💡 Mais padrões KQL úteis</summary>

```kusto
// Count events by severity over time (for charting)
Syslog
| where TimeGenerated > ago(7d)
| summarize Count = count() by bin(TimeGenerated, 1h), SeverityLevel
| render timechart

// Memory usage trend
Perf
| where ObjectName == "Memory" and CounterName == "% Used Memory"
| summarize AvgMem = avg(CounterValue) by bin(TimeGenerated, 15m), Computer
| render timechart
```

</details>

### Tarefa 6: Criar um Action Group

Crie um grupo de ação que envia notificações por email:

```bash
az monitor action-group create \
  --resource-group $RG \
  --name ag-ops-team \
  --short-name OpsTeam \
  --action email ops-email yourname@contoso.com
```

### Tarefa 7: Criar um Alerta de Métrica

Crie um alerta que dispara quando a CPU excede 80% por 5 minutos:

```bash
VM_ID=$(az vm show --resource-group $RG --name vm-monitored --query id -o tsv)

az monitor metrics alert create \
  --resource-group $RG \
  --name alert-high-cpu \
  --scopes $VM_ID \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action ag-ops-team \
  --severity 2 \
  --description "CPU usage exceeded 80% for 5 minutes"
```

### Tarefa 8: Criar um Alerta de Log

Crie um alerta baseado em uma consulta KQL | por exemplo, detectar um padrão específico de erro nos logs:

<details>
<summary>💡 Dica</summary>

Use o Portal do Azure: **Monitor → Alertas → Criar → Regra de alerta de log**

- **Escopo**: Seu Log Analytics workspace
- **Condição**: Pesquisa de log personalizada com KQL
- **Consulta**: `Syslog | where SeverityLevel == "error" | where TimeGenerated > ago(5m)`
- **Limite**: Maior que 0
- **Grupo de Ação**: `ag-ops-team`

</details>

### Tarefa 9: Habilitar Storage Insights

1. Crie uma conta de armazenamento (se você não tiver uma)
2. Navegue até **Azure Monitor → Contas de armazenamento** (ou **Conta de armazenamento → Insights**)
3. Explore: métricas de transação, latência, disponibilidade, tendências de capacidade

### Tarefa 10: Usar o Network Watcher

Explore estas ferramentas do Network Watcher:

1. **Topologia** | Visualize sua VNet e recursos conectados
2. **IP Flow Verify** | Teste se o tráfego é permitido ou negado entre dois endpoints
3. **Connection Troubleshoot** | Verifique a conectividade de uma VM para um destino

```bash
# IP Flow Verify example
az network watcher test-ip-flow \
  --direction Inbound \
  --local 10.0.0.4:80 \
  --protocol TCP \
  --remote 0.0.0.0:* \
  --vm vm-monitored \
  --resource-group $RG
```

## 🔨 Quebre & Conserte

### Quebre
1. **Alerta sem ação** | Crie uma regra de alerta mas não anexe um grupo de ação. Acione a condição. Observe: o alerta dispara no portal mas nenhuma notificação é enviada. Por quê?
2. **Resultados de log vazios** | Consulte logs imediatamente após habilitar as configurações de diagnóstico. Os resultados estão vazios. Isso está quebrado?

### Conserte
- Anexe o grupo de ação à regra de alerta
- Entenda que a ingestão de logs tem um atraso (15–30 min) | isso é comportamento esperado, não um bug
- Use a tabela **Heartbeat** para verificar que o agente está conectado

## 📝 Teste seus Conhecimentos

1. **Qual é a diferença entre Métricas e Logs no Azure Monitor?**
   - Métricas = dados numéricos de séries temporais, quase em tempo real, armazenados em um banco de dados de séries temporais
   - Logs = texto estruturado/não estruturado, armazenado no Log Analytics, consultado com KQL

2. **Quais são os operadores KQL essenciais para o exame?**
   - `where` | filtrar linhas
   - `summarize` | agregar (count, avg, sum, max)
   - `ago()` | tempo relativo ao agora (ex: `ago(1h)`, `ago(7d)`)
   - `project` | selecionar colunas
   - `render` | visualizar resultados

3. **Quais são os níveis de severidade de alerta?**
   - 0 = Crítico, 1 = Erro, 2 = Aviso, 3 = Informativo, 4 = Detalhado

4. **O que são regras de processamento de alertas?**
   - Regras que modificam o comportamento de alertas disparados (ex: suprimir notificações durante janelas de manutenção, adicionar grupos de ação a todos os alertas em um escopo)

## 🧹 Limpeza

```bash
az group delete --name $RG --yes --no-wait
```

## ✅ Critérios de Sucesso

- [ ] Log Analytics workspace criado
- [ ] VM Insights habilitado e coletando dados
- [ ] Métricas do Azure Monitor exploradas e compreendidas
- [ ] Configurações de diagnóstico configuradas
- [ ] Consultas KQL executadas com sucesso
- [ ] Grupo de ação criado com notificação por email
- [ ] Alerta de métrica criado (CPU > 80%)
- [ ] Alerta de log criado para padrões de erro
- [ ] Storage Insights explorado
- [ ] Ferramentas do Network Watcher usadas (topologia, IP flow verify, connection troubleshoot)
- [ ] Cenários de Quebre & Conserte concluídos
- [ ] Recursos limpos
