---
sidebar_position: 2
title: "Desafio 47: Coleta de telemetria e insights"
sidebar_label: "Desafio 47: Coleta de telemetria e insights"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 47: Coleta de telemetria e insights

## Habilidades do exame abordadas

- Configurar coleta de telemetria usando Application Insights, VM Insights, Container Insights, Azure Monitor for Storage e Azure Monitor for Networks

## CenÃ¡rio

A Contoso Ltd opera uma arquitetura de microsserviÃ§os com componentes executando em Azure VMs (serviÃ§o legado de pedidos), Azure Kubernetes Service (serviÃ§os de pagamento e estoque) e Azure App Service (frontend web). Cada equipe monitora de forma diferente: a equipe de VMs verifica sessÃµes RDP, a equipe de AKS usa logs bÃ¡sicos via kubectl, e a equipe de App Service nÃ£o usa nenhum monitoramento. O CTO quer observabilidade padronizada em todas as plataformas de computaÃ§Ã£o com rastreamento distribuÃ­do para acompanhar requisiÃ§Ãµes de ponta a ponta.

## PrÃ©-requisitos

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

InstrumentaÃ§Ã£o baseada em SDK (para mais controle) em uma aplicaÃ§Ã£o .NET:

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
- Aba de desempenho: CPU, memÃ³ria, IOPS de disco, rede
- Aba de mapa: dependÃªncias de processos e conexÃµes de rede
- Monitoramento de conexÃµes entre VMs e serviÃ§os externos

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

### Tarefa 4: Configurar mÃ©tricas e eventos personalizados

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

ConfiguraÃ§Ã£o de amostragem baseada em SDK:

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

Amostragem de ingestÃ£o (server-side, aplicada a todos os dados independentemente das configuraÃ§Ãµes do SDK):

```bash
# Set daily cap to control costs
az monitor app-insights component update \
  --app ai-contoso-webapp \
  --resource-group rg-contoso-prod \
  --ingestion-access Enabled \
  --cap 5  # 5 GB daily cap
```

### Tarefa 7: Implementar correlaÃ§Ã£o de rastreamento distribuÃ­do

Garantir correlaÃ§Ã£o de rastreamento entre serviÃ§os:

```bash
# Application Insights automatically correlates requests using W3C Trace Context
# Verify correlation is working by checking the Application Map:
# Azure Portal > Application Insights > Application Map

# For custom HTTP calls, ensure headers are propagated:
# traceparent: 00-<trace-id>-<span-id>-<trace-flags>
# tracestate: (optional vendor-specific state)
```

Configurar correlaÃ§Ã£o em microsserviÃ§os:

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

## ExercÃ­cios de quebra e conserto

### CenÃ¡rio de quebra 1: Container Insights nÃ£o mostra dados para novo namespace

Um novo microsserviÃ§o Ã© implantado em um novo namespace do Kubernetes, mas o Container Insights nÃ£o mostra logs nem mÃ©tricas.

**Causa:** O ConfigMap do Container Insights exclui certos namespaces da coleta de logs, ou o novo namespace foi adicionado Ã  lista de exclusÃ£o.

**DiagnÃ³stico:**

```bash
kubectl get configmap container-azm-ms-agentconfig -n kube-system -o yaml
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:** Atualize o ConfigMap para incluir o novo namespace:

```bash
kubectl edit configmap container-azm-ms-agentconfig -n kube-system
# Remove the namespace from exclude_namespaces list
# Restart the omsagent pods
kubectl rollout restart daemonset omsagent -n kube-system
```

</details>

### CenÃ¡rio de quebra 2: Rastreamento distribuÃ­do mostra lacunas entre serviÃ§os

O Application Map mostra todos os serviÃ§os, mas a correlaÃ§Ã£o de rastreamento falha entre o frontend e o serviÃ§o de pagamento.

**Causa:** O serviÃ§o de pagamento usa um cliente HTTP personalizado que nÃ£o propaga os cabeÃ§alhos W3C de contexto de rastreamento.


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:** Garanta que a biblioteca do cliente HTTP propague os cabeÃ§alhos `traceparent` e `tracestate`. Em Node.js com Application Insights:

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
## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso tem um web app .NET no App Service. Eles querem telemetria do Application Insights sem modificar o cÃ³digo da aplicaÃ§Ã£o. O que devem configurar?",
    options: [
      "Instalar o pacote NuGet do Application Insights e adicionar cÃ³digo de inicializaÃ§Ã£o do SDK",
      "Habilitar auto-instrumentaÃ§Ã£o configurando o app setting 'ApplicationInsightsAgent_EXTENSION_VERSION'",
      "Implantar um agente do Application Insights como contÃªiner sidecar",
      "Configurar uma data collection rule com o Azure Monitor Agent"
    ],
    correctIndex: 1,
    explanation: "A auto-instrumentaÃ§Ã£o do App Service (codeless attach) habilita o Application Insights configurando o app setting ApplicationInsightsAgent_EXTENSION_VERSION para ~3 junto com a connection string. Nenhuma alteraÃ§Ã£o de cÃ³digo ou pacote NuGet Ã© necessÃ¡ria. Isso funciona para aplicaÃ§Ãµes .NET, Java, Node.js e Python no App Service."
  },
  {
    question: "A Contoso executa serviÃ§os em VMs, AKS e App Service. Qual soluÃ§Ã£o de monitoramento fornece mapeamento de dependÃªncias no nÃ­vel de processo, mostrando quais processos se comunicam com quais serviÃ§os externos na VM?",
    options: [
      "Application Insights",
      "Container Insights",
      "VM Insights (recurso Map)",
      "Network Watcher"
    ],
    correctIndex: 2,
    explanation: "O recurso Map do VM Insights descobre processos em execuÃ§Ã£o na VM e suas conexÃµes de rede, mostrando quais processos se comunicam com serviÃ§os externos, bancos de dados e outras VMs. Isso fornece um mapa de dependÃªncias sem exigir alteraÃ§Ãµes no cÃ³digo da aplicaÃ§Ã£o."
  },
  {
    question: "O Application Insights estÃ¡ gerando 50 GB de telemetria diariamente, resultando em custos altos. Qual abordagem reduz custos enquanto preserva visibilidade de erros e exceÃ§Ãµes?",
    options: [
      "Desabilitar o Application Insights completamente",
      "Configurar amostragem adaptativa que exclui exceÃ§Ãµes da amostragem",
      "Definir um limite diÃ¡rio de 1 GB e perder todos os dados acima do limite",
      "Mudar do Application Insights baseado em workspace para o clÃ¡ssico"
    ],
    correctIndex: 1,
    explanation: "A amostragem adaptativa reduz o volume de telemetria ajustando dinamicamente a taxa de amostragem enquanto mantÃ©m precisÃ£o estatÃ­stica. Ao excluir exceÃ§Ãµes da amostragem, todos os erros sÃ£o preservados para depuraÃ§Ã£o enquanto requisiÃ§Ãµes bem-sucedidas de rotina sÃ£o amostradas. Isso Ã© mais eficaz do que um limite diÃ¡rio, que descarta toda a telemetria apÃ³s o limite."
  },
  {
    question: "Uma requisiÃ§Ã£o ao web app da Contoso chama trÃªs microsserviÃ§os backend. No Application Insights, a visualizaÃ§Ã£o de transaÃ§Ã£o de ponta a ponta mostra apenas a requisiÃ§Ã£o inicial sem as chamadas downstream. Qual Ã© a causa mais provÃ¡vel?",
    options: [
      "Os serviÃ§os backend nÃ£o estÃ£o instrumentados com o Application Insights",
      "Os serviÃ§os usam recursos diferentes do Application Insights",
      "Os cabeÃ§alhos de contexto de rastreamento nÃ£o estÃ£o sendo propagados entre os serviÃ§os",
      "A amostragem estÃ¡ filtrando chamadas de dependÃªncia"
    ],
    correctIndex: 2,
    explanation: "O rastreamento distribuÃ­do requer que os cabeÃ§alhos de contexto de rastreamento W3C (traceparent) sejam propagados entre os serviÃ§os. Se um serviÃ§o nÃ£o encaminha esses cabeÃ§alhos nas chamadas HTTP de saÃ­da, a telemetria downstream nÃ£o pode ser correlacionada com a requisiÃ§Ã£o pai. Todos os serviÃ§os devem estar instrumentados E o contexto de rastreamento deve fluir atravÃ©s dos cabeÃ§alhos HTTP."
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
