---
sidebar_position: 6
title: "Desafio 24: Azure Monitor, Log Analytics e Alertas"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 24: Azure Monitor, Log Analytics e Alertas

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **DomÃ­nio**: Management & Governance (30-35%)
:::

## Habilidades do exame cobertas

- Descrever o Azure Monitor (incluindo Log Analytics, Azure Monitor Alerts, Application Insights)

## VisÃ£o Geral

**Azure Monitor** Ã© a soluÃ§Ã£o abrangente de monitoramento para o Azure. Ele coleta, analisa e age sobre telemetria dos seus ambientes em nuvem e on-premises. Dentro do Azure Monitor, **Log Analytics** fornece capacidades poderosas de consulta, **Alerts** notificam vocÃª sobre problemas, e **Application Insights** monitora aplicaÃ§Ãµes web em tempo real.

Este Ã© o desafio final â€” ele reÃºne conceitos de monitoramento que se aplicam a tudo o que vocÃª aprendeu.

## Explorar

### Tarefa 1: Entender a arquitetura do Azure Monitor

```text
Data Sources               Azure Monitor              Actions
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€             â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€             â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Applications    â”€â”€â”       â”Œâ”€ Metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’  Dashboards
VMs/Containers  â”€â”€â”¼â”€â”€â†’    â”‚  (numbers,           Alerts
Networks        â”€â”€â”¤       â”‚   time-series)       Autoscale
Custom sources  â”€â”€â”˜       â”‚
                          â””â”€ Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’  Log Analytics
                             (detailed,           Workbooks
                              rich data)          Export
```

| Tipo de dado | O que Ã© | Exemplo | Consultar com |
|-------------|---------|---------|--------------|
| **Metrics** | Dados numÃ©ricos em sÃ©rie temporal | CPU %, uso de memÃ³ria, contagem de requisiÃ§Ãµes | Metrics Explorer |
| **Logs** | Dados detalhados de eventos (texto, estruturado) | Logs de erro, eventos de auditoria, traces | Log Analytics (KQL) |

### Tarefa 2: Explorar o Azure Monitor

1. No Azure Portal, pesquise por **Monitor**
2. Explore as seÃ§Ãµes principais:
   - **Overview**: Dashboard resumido
   - **Metrics**: Dados numÃ©ricos em tempo real (se vocÃª tiver recursos)
   - **Logs**: Consulte logs com KQL (Kusto Query Language)
   - **Alerts**: Configure e visualize alertas
   - **Insights**: Monitoramento prÃ©-construÃ­do para VMs, armazenamento, redes
3. Clique em **Metrics** â€” mesmo sem recursos, observe a interface

### Tarefa 3: Entender o Log Analytics

Log Analytics Ã© a ferramenta para consultar Azure Monitor Logs:

- Usa **KQL (Kusto Query Language)** â€” uma linguagem de consulta somente leitura
- Coleta dados de: recursos Azure, VMs (via agentes), aplicaÃ§Ãµes
- Armazena dados em um **Log Analytics workspace**

**Exemplo bÃ¡sico de KQL:**
```kusto
// Show recent activity log events
AzureActivity
| where TimeGenerated > ago(24h)
| project TimeGenerated, OperationName, ActivityStatus
| take 10
```

### Tarefa 4: Entender Azure Monitor Alerts

Alertas notificam vocÃª proativamente quando condiÃ§Ãµes sÃ£o atendidas:

| Componente do alerta | DescriÃ§Ã£o |
|---------------------|-----------|
| **Alert rule** | CondiÃ§Ã£o que dispara o alerta |
| **Action group** | Quem Ã© notificado e como (email, SMS, webhook) |
| **Severity** | 0 (Critical) a 4 (Verbose) |

**Tipos de alerta:**
| Tipo | Dispara em | Exemplo |
|------|-----------|---------|
| **Metric alert** | Limite de mÃ©trica ultrapassado | CPU > 90% por 5 minutos |
| **Log alert** | Consulta de log retorna resultados | Contagem de erros > 10 em 1 hora |
| **Activity log alert** | OperaÃ§Ã£o Azure ocorre | VM excluÃ­da, polÃ­tica alterada |
| **Service Health alert** | Problema de serviÃ§o Azure | InterrupÃ§Ã£o na sua regiÃ£o |

### Tarefa 5: Entender o Application Insights

Application Insights monitora **aplicaÃ§Ãµes web em tempo real**:

| Recurso | O que detecta |
|---------|--------------|
| **Request rates** | PadrÃµes de trÃ¡fego e throughput |
| **Response times** | QuÃ£o rÃ¡pido sua aplicaÃ§Ã£o responde |
| **Failure rates** | Porcentagens de erro |
| **Dependencies** | Desempenho de chamadas a serviÃ§os externos |
| **Page views** | Comportamento do usuÃ¡rio e desempenho do navegador |
| **Availability tests** | Sua aplicaÃ§Ã£o estÃ¡ acessÃ­vel? |

**Caso de uso**: Uma aplicaÃ§Ã£o web estÃ¡ lenta. Application Insights mostra:
- Quais requisiÃ§Ãµes estÃ£o lentas
- Qual dependÃªncia (banco de dados? API?) Ã© o gargalo
- Quais usuÃ¡rios sÃ£o afetados
- Quando o problema comeÃ§ou

:::tip Alternativa Azure CLI
```bash
# List Azure Monitor alert rules
az monitor metrics alert list --output table 2>/dev/null || echo "No alert rules configured"

# List Log Analytics workspaces
az monitor log-analytics workspace list --query "[].{Name:name, Location:location}" --output table 2>/dev/null || echo "No workspaces found"

# View recent activity log
az monitor activity-log list --max-events 5 --query "[].{Time:eventTimestamp, Operation:operationName.localizedValue, Status:status.localizedValue}" --output table
```
:::

## Conceitos-Chave

| Conceito | DescriÃ§Ã£o |
|----------|-----------|
| **Azure Monitor** | Plataforma abrangente de monitoramento para recursos Azure |
| **Metrics** | Dados numÃ©ricos em sÃ©rie temporal (CPU %, memÃ³ria, requisiÃ§Ãµes) |
| **Logs** | Dados detalhados de eventos e diagnÃ³stico |
| **Log Analytics** | Ferramenta para consultar logs usando KQL |
| **KQL** | Kusto Query Language â€” linguagem somente leitura para anÃ¡lise de logs |
| **Alerts** | NotificaÃ§Ãµes disparadas por condiÃ§Ãµes (mÃ©trica/log/atividade) |
| **Action groups** | Definem quem Ã© notificado e como quando alertas disparam |
| **Application Insights** | Ferramenta APM para monitorar aplicaÃ§Ãµes web em tempo real |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-24-q1',
      question: 'Qual serviÃ§o Azure coleta e analisa telemetria de recursos Azure?',
      options: ['Azure Advisor', 'Azure Monitor', 'Azure Service Health', 'Azure Policy'],
      correctAnswer: 1,
      explanation: 'Azure Monitor coleta, analisa e age sobre dados de telemetria de recursos Azure, ambientes on-premises e ambientes multi-cloud.'
    },
    {
      id: 'az900-24-q2',
      question: 'Qual ferramenta dentro do Azure Monitor permite escrever consultas para analisar dados de log?',
      options: ['Metrics Explorer', 'Log Analytics', 'Azure Advisor', 'Application Insights'],
      correctAnswer: 1,
      explanation: 'Log Analytics Ã© a ferramenta dentro do Azure Monitor que permite escrever consultas KQL (Kusto Query Language) para analisar dados de log armazenados em workspaces do Log Analytics.'
    },
    {
      id: 'az900-24-q3',
      question: 'Uma equipe quer ser notificada por email quando o uso de CPU da VM exceder 90% por mais de 5 minutos. O que devem configurar?',
      options: ['Azure Policy', 'Um metric alert com um action group', 'Um resource lock', 'Azure Advisor'],
      correctAnswer: 1,
      explanation: 'Um metric alert monitora mÃ©tricas numÃ©ricas (como CPU %). Combinado com um action group (configurado para email), ele envia notificaÃ§Ãµes quando o limite Ã© ultrapassado pela duraÃ§Ã£o especificada.'
    },
    {
      id: 'az900-24-q4',
      question: 'Qual recurso do Azure Monitor Ã© especificamente projetado para monitorar aplicaÃ§Ãµes web em tempo real?',
      options: ['Log Analytics', 'Metrics Explorer', 'Application Insights', 'Azure Advisor'],
      correctAnswer: 2,
      explanation: 'Application Insights Ã© um recurso APM (Application Performance Management) dentro do Azure Monitor. Ele monitora aplicaÃ§Ãµes web em tempo real, detectando anomalias de desempenho, falhas e comportamento do usuÃ¡rio.'
    },
    {
      id: 'az900-24-q5',
      question: 'Qual Ã© a diferenÃ§a entre Azure Monitor Metrics e Azure Monitor Logs?',
      options: ['Metrics sÃ£o gratuitos; Logs sÃ£o pagos', 'Metrics sÃ£o dados numÃ©ricos em sÃ©rie temporal; Logs sÃ£o registros detalhados de eventos', 'SÃ£o a mesma coisa', 'Metrics monitoram apenas VMs; Logs monitoram todo o resto'],
      correctAnswer: 1,
      explanation: 'Metrics sÃ£o dados numÃ©ricos leves em sÃ©rie temporal (CPU %, memÃ³ria, contagem de requisiÃ§Ãµes) ideais para monitoramento em tempo real. Logs sÃ£o registros ricos e detalhados de eventos que suportam anÃ¡lise complexa via consultas KQL.'
    }
  ]}
/>

## ðŸŽ‰ ParabÃ©ns!

VocÃª completou todos os 24 desafios do AZ-900! Aqui estÃ¡ o que fazer em seguida:

1. **Revise** a [Matriz de Cobertura](/docs/az-900/coverage-matrix) para garantir que vocÃª cobriu todas as habilidades do exame
2. **FaÃ§a** a [AvaliaÃ§Ã£o PrÃ¡tica da Microsoft](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-900/practice/assessment?assessment-type=practice&assessmentId=23)
3. **Agende** seu exame no [Pearson VUE](https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/)
4. **PrÃ³ximo passo**: Considere o [AZ-104: Azure Administrator](/docs/az-104/overview) para habilidades prÃ¡ticas mais aprofundadas

## Saiba Mais

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) â€” Materiais de estudo selecionados
- [Microsoft Learn: Describe monitoring tools in Azure](https://learn.microsoft.com/en-us/training/modules/describe-monitoring-tools-azure/)
- [Azure Monitor documentation](https://learn.microsoft.com/en-us/azure/azure-monitor/)
- [Application Insights documentation](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
