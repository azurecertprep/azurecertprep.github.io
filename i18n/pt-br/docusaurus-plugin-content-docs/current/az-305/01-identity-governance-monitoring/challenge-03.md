---
sidebar_position: 3
title: "Desafio 03: Projetar uma Estratégia de Monitoramento e Alertas"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';
import DecisionMatrix from '@site/src/components/DecisionMatrix';

# Desafio 03: projetar uma estratégia de monitoramento e alertas

:::info Tempo Estimado e Custo

**75-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 25-30%**

:::

## Introdução

A TailSpin Toys opera uma plataforma global de e-commerce construida no Azure. Sua arquitetura inclui um Azure Front Door para balanceamento de carga global, Azure App Services em duas regiões (East US e West Europe), Azure SQL Database com geo-replicação, Azure Cache for Redis e Azure Functions para processamento de pedidos. A plataforma suporta 50.000 usuários simultaneos durante horarios de pico e definiu os seguintes objetivos de nível de serviço (SLOs):

- Tempo de carregamento da pagina inicial: abaixo de 2 segundos (p95)
- Tempo de resposta da API: abaixo de 500ms (p95)
- Processamento de pedidos: concluido em até 30 segundos
- Disponibilidade da plataforma: 99,95% de uptime mensal

Atualmente, a equipe só descobre interrupcoes quando clientes reclamam nas redes sociais. Não ha alertas proativos, não ha dashboards para visibilidade executiva e não ha remediacao automatizada. Na última Black Friday, um problema de esgotamento do cache Redis causou uma interrupcao de 45 minutos que custou $2M em receita perdida. A equipe de operações quer detectar e responder a problemas semelhantes automaticamente no futuro.

Sua tarefa é projetar uma estratégia abrangente de monitoramento e alertas que forneça aviso antecipado de degradacao, respostas automatizadas a padrões de falha conhecidos e visibilidade em nível executivo sobre a saúde da plataforma.

## Habilidades do exame cobertas

- Recomendar uma solução de monitoramento
- Recomendar uma solução de logging
- Recomendar uma solução para roteamento de logs

## Tarefas de design

### Parte 1: design da arquitetura de monitoramento

1. Projete a stack de monitoramento para a TailSpin Toys, específicando:
   - Quais recursos do Azure Monitor usar para cada camada (infraestrutura, aplicação, negócios)
   - Onde o Application Insights se encaixa vs. Azure Monitor Metrics vs. Log Analytics
   - Como alcancar rastreamento de transações de ponta a ponta através do Front Door, App Service, Functions e SQL

2. Crie uma matriz de cobertura de monitoramento:

<DecisionMatrix
  title="Monitoring Coverage Matrix"
  headers={["Metrics to Monitor", "Alert Threshold", "Data Source"]}
  rows={[
    {criteria: "Front Door", values: ["Request count, latency (p95), backend health, WAF blocked requests, origin response time", "Latency p95 > 500ms, backend health < 80%, error rate > 1%", "Azure Monitor Metrics (platform metrics) + diagnostic settings to Log Analytics"]},
    {criteria: "App Service", values: ["CPU %, memory %, HTTP 5xx count, response time (p95), thread count, request queue length", "CPU > 70% for 5min, HTTP 5xx > 10/min, response time p95 > 2s", "App Service Metrics + Application Insights (custom telemetry, dependency tracking)"]},
    {criteria: "SQL Database", values: ["DTU/vCore utilization, connection count, deadlocks, long-running queries, storage %", "DTU > 80% for 10min, deadlocks > 5/hour, storage > 85%", "Azure SQL Analytics + Query Performance Insight + diagnostic settings"]},
    {criteria: "Redis Cache", values: ["Memory usage %, server load %, cache hits/misses, connected clients, evicted keys", "Memory > 80%, server load > 70%, cache hit ratio < 90%", "Azure Monitor Metrics + Redis diagnostics to Log Analytics"]},
    {criteria: "Azure Functions", values: ["Execution count, duration, failure rate, queue length (for queue triggers), throttle count", "Failure rate > 5%, duration p95 > 10s, queue length > 1000", "Application Insights (integrated) + Function-level diagnostic settings"]}
  ]}
  storageKey="az305-challenge-03"
/>

### Parte 2: design de alertas

3. Projete regras de alerta para cada SLO, específicando:
   - Tipo de alerta baseado em metrica ou log
   - Frequência de avaliação e janela de agregacao
   - Nível de severidade (0-4)
   - Thresholds dinamicos vs. estaticos (é por que)

4. Projete uma estratégia de alertas em múltiplos estagios:
   - Aviso (degradacao inicial): Notificar canal de operações
   - Crítico (violacao de SLO iminente): Acionar engenheiro de plantao
   - Emergencia (interrupcao ativa): Disparar remediacao automatizada + acionar lideranca

5. Projete action groups para cada severidade de alerta:
   - Canais de notificação (email, SMS, Teams, PagerDuty)
   - Ações automatizadas (Azure Functions, Logic Apps, runbooks)
   - Caminhos de escalação

### Parte 3: remediacao automatizada

6. Projete uma resposta automatizada para o cenário de esgotamento do cache Redis:
   - Detecção: Qual metrica/padrão indica pressao no cache antes da falha?
   - Resposta: Qual acao automatizada previne a interrupcao?
   - Validação: Como você verifica que a remediacao funcionou?

7. Projete regras de autoscale para o App Service que respondam a:
   - Utilizacao de CPU excedendo 70% por 5 minutos
   - Comprimento da fila HTTP excedendo 100 requisicoes
   - Metrica customizada: pedidos-por-segundo excedendo o threshold de capacidade

### Parte 4: dashboards e workbooks

8. Projete um dashboard executivo mostrando:
   - Conformidade atual com SLO (percentual de uptime neste mes)
   - Receita em risco (baseado em taxas de erro)
   - Comparacao de saúde regional
   - Análise de tendencias (performance semana a semana)

9. Projete um workbook operacional para o engenheiro de plantao que forneça:
   - Saúde do serviço em tempo real em todos os componentes
   - Drill-down da saúde de alto nível até requisicoes específicas com falha
   - Correlacao de alertas com eventos de deployment

### Parte 5: implantar prova de conceito

10. Implante o Application Insights e configure pelo menos uma regra de alerta com um action group que demonstre o pipeline de alertas de ponta a ponta.

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-03"
  items={[
    "Monitoring coverage matrix completed for all platform components with apprópriate metrics and thresholds",
    "Alert rules designed for all four SLOs with apprópriate severity and frequency",
    "Action groups defined with clear escalation paths from warning to emergency",
    "Automated remediation designed for at least one known failure scenário",
    "Autoscale rules designed with apprópriate metrics and cooldown periods",
    "Application Insights deployed with at least one working alert rule"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Application Insights vs. Azure Monitor Metrics</summary>

Use **Application Insights** para:
- Metricas em nível de aplicação (duracao de requisicao, taxa de falha, chamadas de dependência)
- Rastreamento distribuido de ponta a ponta (correlacao entre serviços)
- Testes de disponibilidade (monitoramento sintetico)
- Metricas de negócios customizadas (pedidos/segundo, abandono de carrinho)

Use **Azure Monitor platform metrics** para:
- Metricas de infraestrutura (CPU, memoria, disco, rede)
- Metricas específicas de serviço (SQL DTU, Redis cache hits, execucoes de Functions)
- Sinais de trigger de autoscale
- Alertas em tempo quase real (granularidade de 1 minuto)

Os dados do Application Insights fluem para um workspace do Log Analytics, entao você pode correlacionar telemetria de aplicação com logs de infraestrutura usando KQL.

</details>

<details>
<summary>Dica 2: Criando Regras de Alerta</summary>

```bash
# Create a resource group for monitoring resources
az group create --name rg-monitoring --location eastus

# Create Application Insights
az monitor app-insights component create \
  --app appins-tailspin-prod \
  --location eastus \
  --resource-group rg-monitoring \
  --workspace "/subscriptions/{sub}/resourceGroups/rg-logging/providers/Microsoft.OperationalInsights/workspaces/law-tailspin"

# Create action group
az monitor action-group create \
  --name ag-ops-critical \
  --resource-group rg-monitoring \
  --short-name OpsCrit \
  --action email ops-team ops-oncall@tailspintoys.com \
  --action sms oncall 1 5551234567

# Create metric alert for App Service response time
az monitor metrics alert create \
  --name "alert-response-time-p95" \
  --resource-group rg-monitoring \
  --scopes "/subscriptions/{sub}/resourceGroups/rg-app/providers/Microsoft.Web/sites/app-tailspin-prod" \
  --condition "avg HttpResponseTime > 500" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action ag-ops-critical \
  --description "P95 response time exceeding 500ms SLO"
```

</details>

<details>
<summary>Dica 3: Thresholds Dinamicos vs. Thresholds Estaticos</summary>

**Thresholds estaticos** funcionam bem quando você tem metas de SLO claras e fixas (por exemplo, tempo de resposta deve ser inferior a 500ms). Eles são previsiveis e faceis de entender.

**Thresholds dinamicos** usam machine learning para estabelecer padrões de baseline e detectar anomalias. Eles são ideais para:
- Metricas com sazonalidade diaria/semanal (padrões de trafego)
- Cenários onde valores absolutos variam mas o desvio do normal importa
- Reduzir ruido de alertas de picos esperados (jobs batch, deployments)

Para a TailSpin Toys:
- Use **thresholds estaticos** para metricas vinculadas a SLO (tempo de resposta, disponibilidade)
- Use **thresholds dinamicos** para sinais de planejamento de capacidade (CPU, memoria, profundidade da fila) onde o normal varia por hora do dia

</details>

<details>
<summary>Dica 4: Configuração de Autoscale</summary>

```bash
# Create autoscale settings for App Service plan
az monitor autoscale create \
  --resource-group rg-app \
  --name autoscale-tailspin \
  --resource "/subscriptions/{sub}/resourceGroups/rg-app/providers/Microsoft.Web/serverFarms/plan-tailspin-prod" \
  --min-count 2 \
  --max-count 10 \
  --count 3

# Add scale-out rule: CPU > 70% for 5 minutes
az monitor autoscale rule create \
  --resource-group rg-app \
  --autoscale-name autoscale-tailspin \
  --condition "CpuPercentage > 70 avg 5m" \
  --scale out 2

# Add scale-in rule: CPU < 30% for 10 minutes
az monitor autoscale rule create \
  --resource-group rg-app \
  --autoscale-name autoscale-tailspin \
  --condition "CpuPercentage < 30 avg 10m" \
  --scale in 1 \
  --cooldown 10
```

Consideracoes importantes de design:
- Sempre defina um período de cooldown (5-10 min) para evitar oscilacao
- Escale para fora agressivamente (por 2), escale para dentro conservadoramente (por 1)
- Use múltiplas metricas (CPU E comprimento da fila) para decisoes de scale-out

</details>

<details>
<summary>Dica 5: Remediacao Automatizada com Action Groups</summary>

Action groups podem disparar respostas automatizadas:
- **Azure Automation Runbook**: Para remediacao complexa em múltiplas etapas (por exemplo, escalar Redis, limpar chaves obsoletas, verificar conectividade)
- **Azure Function**: Para lógica customizada leve
- **Logic App**: Para orquestração de workflow com gates de aprovacao
- **Webhook**: Para integração com gerenciamento de incidentes externo (PagerDuty, ServiceNow)

Para o cenário de esgotamento do Redis, um Automation Runbook poderia:
1. Detectar: Alerta dispara quando `usedmemorypercentage` excede 85%
2. Agir: Escalar Redis para o próximo tier, ou limpar itens de cache de baixa prioridade
3. Validar: Verificar que o percentual de memoria caiu abaixo de 70%
4. Notificar: Postar no canal do Teams com a acao tomada

</details>

## Recursos de aprendizagem

- [Azure Monitor overview](https://learn.microsoft.com/en-us/azure/azure-monitor/overview)
- [Application Insights overview](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [Azure Monitor alerts overview](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview)
- [Autoscale in Azure Monitor](https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-overview)
- [Azure Monitor workbooks](https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-overview)
- [Create and manage action groups](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/action-groups)
- [Distributed tracing with Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/distributed-trace-data)

## Verificação de conhecimento

<details>
<summary>1. A TailSpin Toys precisa detectar quando o pipeline de processamento de pedidos excede 30 segundos. Os pedidos são processados por Azure Functions acionadas por Service Bus. Qual abordagem de monitoramento fornece a medicao mais precisa?</summary>

**Use rastreamento distribuido do Application Insights com correlacao de transação de ponta a ponta.** Instrumente o Function App com o SDK do Application Insights para rastrear toda a cadeia de dependências desde o recebimento da mensagem do Service Bus até as escritas no banco de dados. Crie uma metrica customizada ou use um alerta baseado em log com uma consulta KQL contra a tabela `requests` filtrando por nome de operação e duracao. Metricas de plataforma sozinhas (tempo de execução da Function) perderiam o tempo gasto esperando na fila do Service Bus.

</details>

<details>
<summary>2. A equipe de operações recebe mais de 200 emails de alerta diariamente e comecou a ignora-los. Como você deve reprojetar a estratégia de alertas para reduzir o ruido mantendo a cobertura?</summary>

**Implemente classificacao de severidade de alertas com roteamento e supressao aprópriados.** (1) Revise e elimine alertas duplicados/redundantes. (2) Use thresholds dinamicos em vez de estaticos para metricas com variacao natural. (3) Implemente regras de processamento de alertas para suprimir janelas de manutenção conhecidas. (4) Agrupe alertas relacionados usando smart groups. (5) Roteie apenas alertas Sev 0-1 para o pager, Sev 2 para canal do Teams, Sev 3-4 apenas para dashboard. (6) Defina frequência de avaliação aprópriada (não a cada minuto para metricas não críticas).

</details>

<details>
<summary>3. Durante a Black Friday, o trafego aumenta 10x. As regras de autoscale atualmente escalam com base na utilizacao de CPU. Qual melhoria de design forneceria escalonamento mais rápido?</summary>

**Adicione perfis de autoscale baseados em agenda combinados com metricas preditivas.** (1) Crie um perfil de autoscale recorrente que pré-escala para uma contagem de instâncias maior antes de eventos de trafego conhecidos (Black Friday, vendas relampago). (2) Adicione comprimento da fila HTTP como um trigger adicional de scale-out, que responde mais rápido que CPU (a fila cresce antes da CPU saturar). (3) Considere uma metrica customizada do Application Insights (requisicoes/segundo) como um sinal antecipado. (4) Reduza a janela de lookback para regras de scale-out de 10 minutos para 5 minutos durante períodos de pico.

</details>

<details>
<summary>4. A equipe de segurança quer ser alertada quando mais de 50 tentativas de login falhas ocorrem em 5 minutos do mesmo endereço IP. Isso deveria ser um alerta de metrica ou um alerta baseado em log?</summary>

**Isso deveria ser um alerta baseado em log (regra de alerta de pesquisa de log).** A condição requer agregacao por endereço IP e contagem de eventos correspondentes a critérios específicos em uma janela de tempo -- essa lógica requer uma consulta KQL contra logs de sign-in no Log Analytics. Alertas de metrica não podem realizar agrupamento por dimensões arbitrarias como endereço IP com agregacao de contagem. A consulta KQL seria: `SigninLogs | where ResultType != 0 | summarize FailCount=count() by IPAddress, bin(TimeGenerated, 5m) | where FailCount > 50`.

</details>

## Limpeza

```bash
# Delete monitoring resources
az group delete --name rg-monitoring --yes --no-wait

# If autoscale was configured on existing resources:
az monitor autoscale delete --resource-group rg-app --name autoscale-tailspin

# Delete alert rules if created in other resource groups:
az monitor metrics alert delete --name "alert-response-time-p95" --resource-group rg-monitoring
```

---

**Próximo**: [Challenge 04: Design Authentication for Cloud-Native Apps](/docs/az-305/identity-governance-monitoring/challenge-04)
