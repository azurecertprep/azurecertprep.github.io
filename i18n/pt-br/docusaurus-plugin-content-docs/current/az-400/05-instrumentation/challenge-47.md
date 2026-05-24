---
sidebar_position: 2
title: "Desafio 47: Coleta de telemetria e insights"
sidebar_label: "Desafio 47: Coleta de telemetria e insights"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 47: Coleta de telemetria e insights

## Habilidades do exame abordadas

- Configurar coleta de telemetria usando Application Insights, VM Insights, Container Insights, Azure Monitor for Storage e Azure Monitor for Networks

## Cenário

A Contoso Ltd opera uma arquitetura de microsserviços com componentes executando em Azure VMs (serviço legado de pedidos), Azure Kubernetes Service (serviços de pagamento e estoque) e Azure App Service (frontend web). Cada equipe monitora de forma diferente: a equipe de VMs verifica sessões RDP, a equipe de AKS usa logs básicos via kubectl, e a equipe de App Service não usa nenhum monitoramento. O CTO quer observabilidade padronizada em todas as plataformas de computação com rastreamento distribuído para acompanhar requisições de ponta a ponta.

## Pré-requisitos

- Assinatura Azure com acesso de Contributor
- Um web app no Azure App Service
- Uma Azure VM (Linux ou Windows)
- Um cluster AKS com pelo menos uma carga de trabalho implantada
- Azure CLI instalada
- Log Analytics workspace

## Tarefas

### Tarefa 1: Configurar Application Insights para um web app

```bash
# Create a Log Analytics workspace
az monitor log-analytics workspace create \
  --name law-contoso-observability \
  --resource-group rg-contoso-prod \
  --location eastus

LAW_ID=$(az monitor log-analytics workspace show \
  --name law-contoso-observability \
  --resource-group rg-contoso-prod \
  --query id -o tsv)

# Create Application Insights (workspace-based)
az monitor app-insights component create \
  --app ai-contoso-webapp \
  --resource-group rg-contoso-prod \
  --location eastus \
  --workspace $LAW_ID \
  --application-type web

# Get the instrumentation key and connection string
AI_CONNECTION_STRING=$(az monitor app-insights component show \
  --app ai-contoso-webapp \
  --resource-group rg-contoso-prod \
  --query connectionString -o tsv)

# Enable auto-instrumentation on App Service (no code changes needed)
az webapp config appsettings set \
  --name app-contoso-web \
  --resource-group rg-contoso-prod \
  --settings "APPLICATIONINSIGHTS_CONNECTION_STRING=$AI_CONNECTION_STRING" \
             "ApplicationInsightsAgent_EXTENSION_VERSION=~3" \
             "XDT_MicrosoftApplicationInsights_Mode=Recommended"

# Restart the app to enable auto-instrumentation
az webapp restart --name app-contoso-web --resource-group rg-contoso-prod
```

Instrumentação baseada em SDK (para mais controle) em uma aplicação .NET:

```csharp
// Program.cs
using Microsoft.ApplicationInsights.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add Application Insights telemetry
builder.Services.AddApplicationInsightsTelemetry(new ApplicationInsightsServiceOptions
{
    ConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"],
    EnableAdaptiveSampling = true,
    EnableDependencyTrackingTelemetryModule = true,
    EnableRequestTrackingTelemetryModule = true
});

var app = builder.Build();
```

### Tarefa 2: Habilitar VM Insights

```bash
# Enable VM Insights on an existing VM
az vm extension set \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor \
  --vm-name vm-contoso-orders \
  --resource-group rg-contoso-prod \
  --settings "{\"workspaceId\": \"$LAW_ID\"}"

# Create a data collection rule for VM Insights
az monitor data-collection rule create \
  --name dcr-vm-insights \
  --resource-group rg-contoso-prod \
  --location eastus \
  --data-flows '[{
    "streams": ["Microsoft-InsightsMetrics", "Microsoft-ServiceMap"],
    "destinations": ["law-contoso-observability"]
  }]' \
  --destinations "{\"logAnalytics\": [{\"workspaceResourceId\": \"$LAW_ID\", \"name\": \"law-contoso-observability\"}]}" \
  --data-sources "{\"performanceCounters\": [{\"streams\": [\"Microsoft-InsightsMetrics\"], \"samplingFrequencyInSeconds\": 60, \"counterSpecifiers\": [\"\\\\Processor(_Total)\\\\% Processor Time\", \"\\\\Memory\\\\Available Bytes\", \"\\\\LogicalDisk(_Total)\\\\% Free Space\"]}]}"

# Associate the data collection rule with the VM
DCR_ID=$(az monitor data-collection rule show \
  --name dcr-vm-insights \
  --resource-group rg-contoso-prod \
  --query id -o tsv)

az monitor data-collection rule association create \
  --name "vm-contoso-orders-association" \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/Microsoft.Compute/virtualMachines/vm-contoso-orders" \
  --rule-id $DCR_ID

# Enable VM Insights via the portal shortcut
# Azure Portal > VM > Monitoring > Insights > Enable
# This automatically installs the agent and creates the DCR
```

O VM Insights fornece:
- Aba de desempenho: CPU, memória, IOPS de disco, rede
- Aba de mapa: dependências de processos e conexões de rede
- Monitoramento de conexões entre VMs e serviços externos

### Tarefa 3: Habilitar Container Insights para AKS

```bash
# Enable monitoring add-on on existing AKS cluster
az aks enable-addons \
  --name aks-contoso-prod \
  --resource-group rg-contoso-prod \
  --addons monitoring \
  --workspace-resource-id $LAW_ID

# Verify the monitoring agent is running
az aks show \
  --name aks-contoso-prod \
  --resource-group rg-contoso-prod \
  --query "addonProfiles.omsagent.enabled"

# Enable Prometheus metrics collection (managed Prometheus)
az aks update \
  --name aks-contoso-prod \
  --resource-group rg-contoso-prod \
  --enable-azure-monitor-metrics

# Configure Container Insights to collect specific log types
# Create a ConfigMap for agent configuration
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: container-azm-ms-agentconfig
  namespace: kube-system
data:
  schema-version: v1
  config-version: v1
  log-data-collection-settings: |
    [log_collection_settings]
      [log_collection_settings.stdout]
        enabled = true
        exclude_namespaces = ["kube-system","gatekeeper-system"]
      [log_collection_settings.stderr]
        enabled = true
        exclude_namespaces = ["kube-system"]
      [log_collection_settings.env_var]
        enabled = false
  prometheus-data-collection-settings: |
    [prometheus_data_collection_settings.cluster]
      interval = "1m"
      monitor_kubernetes_pods = true
EOF
```

### Tarefa 4: Configurar métricas e eventos personalizados

```bash
# Send custom metrics via Application Insights SDK
# In application code (Node.js example):
```

```javascript
// telemetry.js
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setAutoCollectRequests(true)
  .setAutoCollectDependencies(true)
  .setAutoCollectExceptions(true)
  .start();

const client = appInsights.defaultClient;

// Track custom event
client.trackEvent({
  name: "OrderPlaced",
  properties: {
    customerId: order.customerId,
    region: order.region,
    paymentMethod: order.paymentMethod
  },
  measurements: {
    orderValue: order.total,
    itemCount: order.items.length
  }
});

// Track custom metric
client.trackMetric({
  name: "OrderProcessingTime",
  value: processingDurationMs,
  properties: {
    serviceVersion: process.env.APP_VERSION
  }
});

// Track dependency (external service call)
client.trackDependency({
  target: "payment-gateway",
  name: "ChargeCard",
  data: "POST /api/charge",
  duration: callDurationMs,
  resultCode: response.status,
  success: response.status === 200,
  dependencyTypeName: "HTTP"
});
```

### Tarefa 5: Configurar testes de disponibilidade

```bash
# Create a standard URL ping test
az monitor app-insights web-test create \
  --name "contoso-web-availability" \
  --resource-group rg-contoso-prod \
  --location "East US" \
  --defined-web-test-name "Homepage Health Check" \
  --locations Id="us-fl-mia-edge" \
  --locations Id="emea-nl-ams-azr" \
  --locations Id="apac-sg-sin-azr" \
  --kind "ping" \
  --frequency 300 \
  --timeout 120 \
  --web-test "<WebTest Name=\"Homepage\" Id=\"test-001\" Enabled=\"True\" Timeout=\"120\" xmlns=\"http://microsoft.com/schemas/VisualStudio/TeamTest/2010\"><Items><Request Method=\"GET\" Version=\"1.1\" Url=\"https://app-contoso-web.azurewebsites.net/health\" ThinkTime=\"0\" Timeout=\"120\" ParseDependentRequests=\"False\" FollowRedirects=\"True\" RecordResult=\"True\" Cache=\"False\" ResponseTimeGoal=\"0\" Encoding=\"utf-8\" ExpectedHttpStatusCode=\"200\" /></Items></WebTest>"

# Create an alert for availability test failures
az monitor metrics alert create \
  --name "alert-availability-failed" \
  --resource-group rg-contoso-prod \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/components/ai-contoso-webapp" \
  --condition "avg availabilityResults/availabilityPercentage < 99" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-contoso-prod/providers/microsoft.insights/actionGroups/ag-ops-team" \
  --description "Availability dropped below 99%"
```

### Tarefa 6: Configurar amostragem para gerenciar custos

```bash
# Configure adaptive sampling in Application Insights
# For auto-instrumented App Service, set via app settings:
az webapp config appsettings set \
  --name app-contoso-web \
  --resource-group rg-contoso-prod \
  --settings "MicrosoftAppInsights_AdaptiveSamplingTelemetryProcessor_MaxTelemetryItemsPerSecond=5"
```

Configuração de amostragem baseada em SDK:

```csharp
// Program.cs - Configure sampling
builder.Services.AddApplicationInsightsTelemetry();
builder.Services.Configure<TelemetryConfiguration>(config =>
{
    var builder = config.DefaultTelemetrySink.TelemetryProcessorChainBuilder;

    // Adaptive sampling: target 5 items per second
    builder.UseAdaptiveSampling(maxTelemetryItemsPerSecond: 5);

    // Fixed-rate sampling: keep 25% of telemetry
    // builder.UseSampling(25.0);

    // Exclude certain telemetry types from sampling
    builder.UseAdaptiveSampling(maxTelemetryItemsPerSecond: 5,
        excludedTypes: "Event;Exception");

    builder.Build();
});
```

Amostragem de ingestão (server-side, aplicada a todos os dados independentemente das configurações do SDK):

```bash
# Set daily cap to control costs
az monitor app-insights component update \
  --app ai-contoso-webapp \
  --resource-group rg-contoso-prod \
  --ingestion-access Enabled \
  --cap 5  # 5 GB daily cap
```

### Tarefa 7: Implementar correlação de rastreamento distribuído

Garantir correlação de rastreamento entre serviços:

```bash
# Application Insights automatically correlates requests using W3C Trace Context
# Verify correlation is working by checking the Application Map:
# Azure Portal > Application Insights > Application Map

# For custom HTTP calls, ensure headers are propagated:
# traceparent: 00-<trace-id>-<span-id>-<trace-flags>
# tracestate: (optional vendor-specific state)
```

Configurar correlação em microsserviços:

```yaml
# For AKS services, deploy with environment variables for App Insights
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    spec:
      containers:
        - name: payment-service
          image: contoso.azurecr.io/payment-service:latest
          env:
            - name: APPLICATIONINSIGHTS_CONNECTION_STRING
              valueFrom:
                secretKeyRef:
                  name: app-insights-secret
                  key: connection-string
            - name: OTEL_SERVICE_NAME
              value: "payment-service"
```

Verificar rastreamento de ponta a ponta:

```text
// KQL: Find a request and trace it across services
requests
| where timestamp > ago(1h)
| where name == "POST /api/orders"
| project operation_Id, timestamp, duration, resultCode
| take 1
| join kind=inner (
    dependencies
    | project operation_Id, target, name, duration, success
) on operation_Id
| project-away operation_Id1
```

## Exercícios de quebra e conserto

### Cenário de quebra 1: Container Insights não mostra dados para novo namespace

Um novo microsserviço é implantado em um novo namespace do Kubernetes, mas o Container Insights não mostra logs nem métricas.

**Causa:** O ConfigMap do Container Insights exclui certos namespaces da coleta de logs, ou o novo namespace foi adicionado Ã  lista de exclusão.

**Diagnóstico:**

```bash
kubectl get configmap container-azm-ms-agentconfig -n kube-system -o yaml
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Atualize o ConfigMap para incluir o novo namespace:

```bash
kubectl edit configmap container-azm-ms-agentconfig -n kube-system
# Remove the namespace from exclude_namespaces list
# Restart the omsagent pods
kubectl rollout restart daemonset omsagent -n kube-system
```

</details>

### Cenário de quebra 2: Rastreamento distribuído mostra lacunas entre serviços

O Application Map mostra todos os serviços, mas a correlação de rastreamento falha entre o frontend e o serviço de pagamento.

**Causa:** O serviço de pagamento usa um cliente HTTP personalizado que não propaga os cabeçalhos W3C de contexto de rastreamento.


<details>
<summary>Mostrar solução</summary>

**Correção:** Garanta que a biblioteca do cliente HTTP propague os cabeçalhos `traceparent` e `tracestate`. Em Node.js com Application Insights:

```javascript
// The Application Insights SDK auto-patches common HTTP libraries
// If using a custom client, manually propagate:
const { context, propagation } = require('@opentelemetry/api');

function makeDownstreamCall(url, payload) {
  const headers = {};
  propagation.inject(context.active(), headers);

  return fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso tem um web app .NET no App Service. Eles querem telemetria do Application Insights sem modificar o código da aplicação. O que devem configurar?",
    options: [
      "Instalar o pacote NuGet do Application Insights e adicionar código de inicialização do SDK",
      "Habilitar auto-instrumentação configurando o app setting 'ApplicationInsightsAgent_EXTENSION_VERSION'",
      "Implantar um agente do Application Insights como contêiner sidecar",
      "Configurar uma data collection rule com o Azure Monitor Agent"
    ],
    correctIndex: 1,
    explanation: "A auto-instrumentação do App Service (codeless attach) habilita o Application Insights configurando o app setting ApplicationInsightsAgent_EXTENSION_VERSION para ~3 junto com a connection string. Nenhuma alteração de código ou pacote NuGet é necessária. Isso funciona para aplicações .NET, Java, Node.js e Python no App Service."
  },
  {
    question: "A Contoso executa serviços em VMs, AKS e App Service. Qual solução de monitoramento fornece mapeamento de dependências no nível de processo, mostrando quais processos se comunicam com quais serviços externos na VM?",
    options: [
      "Application Insights",
      "Container Insights",
      "VM Insights (recurso Map)",
      "Network Watcher"
    ],
    correctIndex: 2,
    explanation: "O recurso Map do VM Insights descobre processos em execução na VM e suas conexões de rede, mostrando quais processos se comunicam com serviços externos, bancos de dados e outras VMs. Isso fornece um mapa de dependências sem exigir alterações no código da aplicação."
  },
  {
    question: "O Application Insights está gerando 50 GB de telemetria diariamente, resultando em custos altos. Qual abordagem reduz custos enquanto preserva visibilidade de erros e exceções?",
    options: [
      "Desabilitar o Application Insights completamente",
      "Configurar amostragem adaptativa que exclui exceções da amostragem",
      "Definir um limite diário de 1 GB e perder todos os dados acima do limite",
      "Mudar do Application Insights baseado em workspace para o clássico"
    ],
    correctIndex: 1,
    explanation: "A amostragem adaptativa reduz o volume de telemetria ajustando dinamicamente a taxa de amostragem enquanto mantém precisão estatística. Ao excluir exceções da amostragem, todos os erros são preservados para depuração enquanto requisições bem-sucedidas de rotina são amostradas. Isso é mais eficaz do que um limite diário, que descarta toda a telemetria após o limite."
  },
  {
    question: "Uma requisição ao web app da Contoso chama três microsserviços backend. No Application Insights, a visualização de transação de ponta a ponta mostra apenas a requisição inicial sem as chamadas downstream. Qual é a causa mais provável?",
    options: [
      "Os serviços backend não estão instrumentados com o Application Insights",
      "Os serviços usam recursos diferentes do Application Insights",
      "Os cabeçalhos de contexto de rastreamento não estão sendo propagados entre os serviços",
      "A amostragem está filtrando chamadas de dependência"
    ],
    correctIndex: 2,
    explanation: "O rastreamento distribuído requer que os cabeçalhos de contexto de rastreamento W3C (traceparent) sejam propagados entre os serviços. Se um serviço não encaminha esses cabeçalhos nas chamadas HTTP de saída, a telemetria downstream não pode ser correlacionada com a requisição pai. Todos os serviços devem estar instrumentados E o contexto de rastreamento deve fluir através dos cabeçalhos HTTP."
  }
]} />

## Limpeza

```bash
# Remove Application Insights
az monitor app-insights component delete \
  --app ai-contoso-webapp \
  --resource-group rg-contoso-prod

# Disable VM Insights agent
az vm extension delete \
  --name AzureMonitorLinuxAgent \
  --vm-name vm-contoso-orders \
  --resource-group rg-contoso-prod

# Disable Container Insights
az aks disable-addons \
  --name aks-contoso-prod \
  --resource-group rg-contoso-prod \
  --addons monitoring

# Delete data collection rules
az monitor data-collection rule delete \
  --name dcr-vm-insights \
  --resource-group rg-contoso-prod

# Delete Log Analytics workspace
az monitor log-analytics workspace delete \
  --name law-contoso-observability \
  --resource-group rg-contoso-prod \
  --yes
```
