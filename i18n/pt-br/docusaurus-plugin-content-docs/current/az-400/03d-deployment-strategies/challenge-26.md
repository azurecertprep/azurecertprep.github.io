---
sidebar_position: 2
title: "Desafio 26: Rolling deployments e slot swaps"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 26: Rolling deployments e slot swaps

## Habilidades do exame mapeadas

- Planejar a minimização de tempo de inatividade durante deployments usando balanceamento de carga, rolling deployments e uso e swap de deployment slots

## Cenário

A Contoso Ltd executa sua aplicação web voltada ao cliente no Azure App Service com 4 instâncias atrás do balanceador de carga integrado. A aplicação serve 2 milhões de visualizações de página por dia. Durante o último deployment, todas as instâncias foram atualizadas simultaneamente, causando uma interrupção de 3 minutos que resultou em 4.200 requisições com falha e uma avalanche de tickets de suporte ao cliente.

A equipe de engenharia precisa implementar rolling deployments que atualizam instâncias gradualmente mantendo a disponibilidade, e aproveitar deployment slots para releases com zero tempo de inatividade com warm-up adequado e configurações de auto-swap.

**Detalhes do ambiente:**
- Azure App Service Plan: Premium V3, 4 instâncias
- Organização Azure DevOps: `contoso-devops`
- Projeto: `WebApp`
- Resource group: `rg-contoso-webapp-prod`
- Região: West US 2

---

## Tarefa 1: Configurar deployment slots do Azure App Service

Crie uma arquitetura de deployment multi-slot com ambientes de staging e pré-produção.

### Provisionar slots

```bash
RESOURCE_GROUP="rg-contoso-webapp-prod"
APP_NAME="app-contoso-web"

# Create staging slot
az webapp deployment slot create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging

# Create pre-production slot (for integration testing)
az webapp deployment slot create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot preprod

# List all slots
az webapp deployment slot list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[].name" -o tsv
```

### Configurar roteamento de tráfego de slot para testes

```bash
# Route 10% of production traffic to staging for pre-swap validation
az webapp traffic-routing set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --distribution staging=10

# Verify traffic routing configuration
az webapp traffic-routing show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
```

---

## Tarefa 2: Configurar auto-swap

Habilite o auto-swap para que deployments no slot de staging automaticamente façam swap para produção após a conclusão do warm-up.

```bash
# Enable auto-swap on the staging slot
az webapp deployment slot auto-swap \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --auto-swap-slot production

# Verify auto-swap configuration
az webapp config show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --query "autoSwapSlotName"
```

### Como o auto-swap funciona

1. O código é implantado no slot de staging
2. O Azure automaticamente aquece o slot de staging enviando requisições ao seu caminho raiz
3. Após a conclusão do warm-up, o Azure realiza o swap automaticamente
4. Se o warm-up falhar, o swap não ocorre

### Desabilitar auto-swap (quando validação manual é necessária)

```bash
az webapp deployment slot auto-swap \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --auto-swap-slot ""
```

---

## Tarefa 3: Configurações de app específicas do slot (sticky settings)

Configure definições que permanecem com um slot em vez de se mover com a aplicação durante o swap.

```bash
# Production slot settings (slot-sticky)
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot-settings \
    "ENVIRONMENT=production" \
    "CACHE_CONNECTION=redis-contoso-prod.redis.cache.windows.net:6380" \
    "APPINSIGHTS_INSTRUMENTATIONKEY=<prod-key>"

# Staging slot settings (slot-sticky)
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --slot-settings \
    "ENVIRONMENT=staging" \
    "CACHE_CONNECTION=redis-contoso-staging.redis.cache.windows.net:6380" \
    "APPINSIGHTS_INSTRUMENTATIONKEY=<staging-key>"

# Non-sticky settings (these WILL swap with the app code)
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "API_VERSION=v2.3.1" \
    "FEATURE_NEW_CHECKOUT=true"
```

### Connection strings que permanecem com os slots

```bash
# Production connection string (slot-sticky)
az webapp config connection-string set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --connection-string-type SQLAzure \
  --slot-settings \
    "DefaultConnection=Server=sql-contoso-prod.database.windows.net;Database=ContosoWeb;Authentication=Active Directory Managed Identity;"

# Staging connection string (slot-sticky)
az webapp config connection-string set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --connection-string-type SQLAzure \
  --slot-settings \
    "DefaultConnection=Server=sql-contoso-staging.database.windows.net;Database=ContosoWeb;Authentication=Active Directory Managed Identity;"
```

---

## Tarefa 4: Rolling deployment com Azure Pipelines e VMSS

Para os serviços de backend da Contoso executando em Virtual Machine Scale Sets (VMSS), implemente uma estratégia de atualização rolling.

### Configurar política de atualização rolling do VMSS

```bash
VMSS_NAME="vmss-contoso-backend"

# Configure rolling upgrade policy
az vmss update \
  --name $VMSS_NAME \
  --resource-group $RESOURCE_GROUP \
  --set upgradePolicy.mode=Rolling \
  --set upgradePolicy.rollingUpgradePolicy.maxBatchInstancePercent=25 \
  --set upgradePolicy.rollingUpgradePolicy.maxUnhealthyInstancePercent=25 \
  --set upgradePolicy.rollingUpgradePolicy.maxUnhealthyUpgradedInstancePercent=25 \
  --set upgradePolicy.rollingUpgradePolicy.pauseTimeBetweenBatches="PT30S"
```

### YAML do Azure Pipelines para rolling deployment em VMSS

Crie `azure-pipelines-vmss-rolling.yml`:

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - src/BackendService/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  resourceGroup: 'rg-contoso-webapp-prod'
  vmssName: 'vmss-contoso-backend'
  azureSubscription: 'contoso-production-connection'

stages:
  - stage: Build
    displayName: 'Build application'
    jobs:
      - job: BuildApp
        steps:
          - task: UseDotNet@2
            inputs:
              packageType: 'sdk'
              version: '8.0.x'

          - script: |
              dotnet publish src/BackendService/BackendService.csproj \
                --configuration Release \
                --output $(Build.ArtifactStagingDirectory)/app
            displayName: 'Build and publish'

          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)/app'
              ArtifactName: 'backend-app'

  - stage: Deploy
    displayName: 'Rolling deployment to VMSS'
    dependsOn: Build
    jobs:
      - deployment: RollingDeploy
        environment: 'production'
        strategy:
          rolling:
            maxParallel: 25%
            preDeploy:
              steps:
                - task: AzureCLI@2
                  displayName: 'Drain instance from load balancer'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      echo "Draining instance from load balancer pool..."
                      sleep 30
            deploy:
              steps:
                - download: current
                  artifact: backend-app

                - task: AzureCLI@2
                  displayName: 'Deploy to instance'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      echo "Deploying new version to instance..."
                      az vmss extension set \
                        --vmss-name $(vmssName) \
                        --resource-group $(resourceGroup) \
                        --name CustomScript \
                        --publisher Microsoft.Azure.Extensions \
                        --version 2.1 \
                        --settings '{"commandToExecute":"bash /opt/deploy/update-app.sh"}'
            routeTraffic:
              steps:
                - task: AzureCLI@2
                  displayName: 'Re-enable instance in load balancer'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      echo "Adding instance back to load balancer pool..."
            postRouteTraffic:
              steps:
                - task: AzureCLI@2
                  displayName: 'Verify instance health'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      echo "Running health check on updated instance..."
                      sleep 15
                      HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
                      if [ "$HEALTH_STATUS" != "200" ]; then
                        echo "##vso[task.logissue type=error]Health check failed"
                        exit 1
                      fi
            on:
              failure:
                steps:
                  - task: AzureCLI@2
                    displayName: 'Rollback instance'
                    inputs:
                      azureSubscription: $(azureSubscription)
                      scriptType: 'bash'
                      scriptLocation: 'inlineScript'
                      inlineScript: |
                        echo "Rolling back failed instance..."
                        az vmss extension set \
                          --vmss-name $(vmssName) \
                          --resource-group $(resourceGroup) \
                          --name CustomScript \
                          --publisher Microsoft.Azure.Extensions \
                          --version 2.1 \
                          --settings '{"commandToExecute":"bash /opt/deploy/rollback-app.sh"}'
```

---

## Tarefa 5: Health probes durante rolling updates

Configure health probes que o balanceador de carga usa para determinar se uma instância está pronta para receber tráfego.

### Extensão de saúde da aplicação para VMSS

```bash
# Install the Application Health extension
az vmss extension set \
  --vmss-name $VMSS_NAME \
  --resource-group $RESOURCE_GROUP \
  --name ApplicationHealthLinux \
  --publisher Microsoft.ManagedServices \
  --version 1.0 \
  --settings '{
    "protocol": "http",
    "port": 8080,
    "requestPath": "/health",
    "intervalInSeconds": 5,
    "numberOfProbes": 3,
    "gracePeriod": 600
  }'

# Configure automatic instance repair
az vmss update \
  --name $VMSS_NAME \
  --resource-group $RESOURCE_GROUP \
  --set automaticRepairsPolicy.enabled=true \
  --set automaticRepairsPolicy.gracePeriod="PT30M"
```

### Configuração de health check do App Service

```bash
# Enable health check for the App Service
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --generic-configurations '{"healthCheckPath":"/health"}'
```

---

## Tarefa 6: Configuração de warm-up para slots

Configure regras de inicialização da aplicação que garantem que a aplicação está completamente carregada antes de receber tráfego de produção.

### Configurações de warm-up do App Service

```bash
# Configure slot warm-up path and expected status
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --settings \
    "WEBSITE_SWAP_WARMUP_PING_PATH=/health/ready" \
    "WEBSITE_SWAP_WARMUP_PING_STATUSES=200" \
    "WEBSITE_WARMUP_PATH=/api/warmup"
```

### Módulo de inicialização de aplicação (para App Service Windows)

Para App Service baseado em Windows, configure o `web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <applicationInitialization doAppInitAfterRestart="true">
      <add initializationPage="/health" hostName="" />
      <add initializationPage="/api/products" hostName="" />
      <add initializationPage="/api/categories" hostName="" />
    </applicationInitialization>
  </system.webServer>
</configuration>
```

### Endpoint de warm-up customizado no código da aplicação

```csharp
[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    private readonly IDistributedCache _cache;
    private readonly IProductRepository _products;

    public HealthController(IDistributedCache cache, IProductRepository products)
    {
        _cache = cache;
        _products = products;
    }

    [HttpGet("ready")]
    public async Task<IActionResult> Ready()
    {
        // Warm up the distributed cache connection
        var cacheStatus = await _cache.GetStringAsync("warmup-check");
        if (cacheStatus == null)
        {
            await _cache.SetStringAsync("warmup-check", "initialized",
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
                });
        }

        // Pre-load frequently accessed data
        var productCount = await _products.GetCountAsync();
        if (productCount == 0)
        {
            return StatusCode(503, "Data not yet loaded");
        }

        return Ok(new { status = "ready", products = productCount });
    }
}
```

---

## Tarefa 7: YAML do Azure Pipelines para deployment com slot swap

Crie um workflow completo do Azure Pipelines que faz deploy no staging, valida e faz swap.

Crie `azure-pipelines-slot-swap.yml`:

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - src/WebApp/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  azureSubscription: 'contoso-production-connection'
  resourceGroup: 'rg-contoso-webapp-prod'
  appName: 'app-contoso-web'
  dotnetVersion: '8.0.x'

stages:
  - stage: Build
    displayName: 'Build application'
    jobs:
      - job: Build
        steps:
          - task: UseDotNet@2
            inputs:
              packageType: 'sdk'
              version: $(dotnetVersion)

          - script: |
              dotnet restore src/WebApp/WebApp.csproj
              dotnet build src/WebApp/WebApp.csproj --configuration Release --no-restore
              dotnet test tests/WebApp.Tests/WebApp.Tests.csproj --configuration Release
              dotnet publish src/WebApp/WebApp.csproj --configuration Release --output $(Build.ArtifactStagingDirectory)/webapp
            displayName: 'Build, test, and publish'

          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)/webapp'
              ArtifactName: 'webapp'

  - stage: DeployStaging
    displayName: 'Deploy to staging slot'
    dependsOn: Build
    jobs:
      - deployment: DeployStaging
        environment: 'staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  displayName: 'Deploy to staging slot'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    appType: 'webAppLinux'
                    appName: $(appName)
                    deployToSlotOrASE: true
                    resourceGroupName: $(resourceGroup)
                    slotName: 'staging'
                    package: '$(Pipeline.Workspace)/webapp'

                - task: AzureCLI@2
                  displayName: 'Wait for warm-up'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      echo "Waiting for staging slot to warm up..."
                      STAGING_URL="https://$(appName)-staging.azurewebsites.net/health/ready"
                      MAX_ATTEMPTS=20
                      ATTEMPT=0

                      while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
                        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL")
                        if [ "$HTTP_STATUS" == "200" ]; then
                          echo "Staging is warm and ready (attempt $ATTEMPT)"
                          exit 0
                        fi
                        echo "Attempt $ATTEMPT: status=$HTTP_STATUS, waiting..."
                        ATTEMPT=$((ATTEMPT + 1))
                        sleep 15
                      done
                      echo "##vso[task.logissue type=error]Staging warm-up failed after $MAX_ATTEMPTS attempts"
                      exit 1

  - stage: ValidateStaging
    displayName: 'Validate staging deployment'
    dependsOn: DeployStaging
    jobs:
      - job: SmokeTests
        steps:
          - task: AzureCLI@2
            displayName: 'Run smoke tests against staging'
            inputs:
              azureSubscription: $(azureSubscription)
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                STAGING_URL="https://$(appName)-staging.azurewebsites.net"

                # Test health endpoint
                STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/health")
                [ "$STATUS" == "200" ] || { echo "Health check failed"; exit 1; }

                # Test API endpoint
                STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/api/products")
                [ "$STATUS" == "200" ] || { echo "Products API failed"; exit 1; }

                # Test response time
                RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$STAGING_URL/api/products")
                echo "Response time: ${RESPONSE_TIME}s"

                echo "All smoke tests passed"

  - stage: SwapToProduction
    displayName: 'Swap staging to production'
    dependsOn: ValidateStaging
    jobs:
      - deployment: SwapSlots
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureAppServiceManage@0
                  displayName: 'Swap staging to production'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    action: 'Swap Slots'
                    webAppName: $(appName)
                    resourceGroupName: $(resourceGroup)
                    sourceSlot: 'staging'

                - task: AzureCLI@2
                  displayName: 'Post-swap production validation'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      PROD_URL="https://$(appName).azurewebsites.net/health"
                      for i in {1..5}; do
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")
                        if [ "$STATUS" == "200" ]; then
                          echo "Production validation passed"
                          exit 0
                        fi
                        sleep 10
                      done
                      echo "##vso[task.logissue type=error]Production validation failed"
                      exit 1

  - stage: Rollback
    displayName: 'Rollback on failure'
    dependsOn: SwapToProduction
    condition: failed()
    jobs:
      - deployment: RollbackSwap
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureAppServiceManage@0
                  displayName: 'Swap back (rollback)'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    action: 'Swap Slots'
                    webAppName: $(appName)
                    resourceGroupName: $(resourceGroup)
                    sourceSlot: 'staging'
```

---

## Exercícios de quebra e conserto

### Exercício 1: Auto-swap não é acionado

**Sintoma:** O código é implantado no slot de staging, mas o auto-swap para produção nunca ocorre.

**Investigar:**
```bash
# Check if auto-swap is configured
az webapp config show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --query "autoSwapSlotName"

# Check slot activity log for swap errors
az monitor activity-log list \
  --resource-group $RESOURCE_GROUP \
  --query "[?contains(operationName.value, 'slotsswap')].{time:eventTimestamp, status:status.value}" \
  --output table
```


<details>
<summary>Mostrar solução</summary>

**Causa raiz:** O App Service plan está no tier Free ou Basic, que não suporta auto-swap.


**Correção:**
```bash
# Upgrade to Standard tier or higher
az appservice plan update \
  --name asp-contoso-webapp \
  --resource-group $RESOURCE_GROUP \
  --sku S1
```

</details>

### Exercício 2: Rolling update travado em 25%

**Sintoma:** O rolling update do VMSS processa 25% das instâncias e então para.

**Investigar:**
```bash
# Check rolling upgrade status
az vmss rolling-upgrade get-latest \
  --name $VMSS_NAME \
  --resource-group $RESOURCE_GROUP

# Check instance health states
az vmss list-instances \
  --name $VMSS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[].{id:instanceId, state:provisioningState}" \
  --output table
```


<details>
<summary>Mostrar solução</summary>

**Causa raiz:** O primeiro lote de instâncias atualizadas está falhando nos health checks. O threshold `maxUnhealthyUpgradedInstancePercent` foi atingido, bloqueando atualizações adicionais.


**Correção:**
```bash
# Fix the application issue, then restart the rolling upgrade
az vmss rolling-upgrade start \
  --name $VMSS_NAME \
  --resource-group $RESOURCE_GROUP
```

</details>

### Exercício 3: Slot swap causa cold start

**Sintoma:** Após o swap de staging para produção, o primeiro lote de requisições experimenta tempos de resposta de 10 a 15 segundos.

**Investigar:**
```bash
# Check if warm-up settings are configured
az webapp config appsettings list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --query "[?name=='WEBSITE_SWAP_WARMUP_PING_PATH']"
```


<details>
<summary>Mostrar solução</summary>

**Causa raiz:** Nenhum caminho de warm-up está configurado. O Azure realiza o swap sem garantir que a aplicação está completamente inicializada.


**Correção:**
```bash
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --settings \
    "WEBSITE_SWAP_WARMUP_PING_PATH=/health/ready" \
    "WEBSITE_SWAP_WARMUP_PING_STATUSES=200"
```


</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso executa 4 instâncias de seu web app em um VMSS e quer realizar um rolling deployment que atualiza uma instância por vez. Qual configuração garante que no máximo 25% das instâncias ficam indisponíveis durante a atualização?",
    options: [
      "Definir 'maxBatchInstancePercent' como 25 na política de rolling upgrade do VMSS",
      "Definir o escalonamento do App Service com mínimo de 3 instâncias",
      "Configurar o balanceador de carga com timeout de dreno de 25 segundos",
      "Definir 'maxUnhealthyInstancePercent' como 75 na política de rolling upgrade do VMSS"
    ],
    correctIndex: 0,
    explanation: "O parâmetro maxBatchInstancePercent controla qual porcentagem de instâncias pode ser atualizada simultaneamente. Definir como 25 significa que apenas 1 de 4 instâncias (25%) será atualizada por vez, garantindo que 75% da capacidade é mantida durante todo o deployment."
  },
  {
    question: "Quais tiers do App Service plan suportam deployment slots? (Selecione o tier MÍNIMO necessário)",
    options: [
      "Free (F1)",
      "Basic (B1)",
      "Standard (S1)",
      "Premium (P1V2)"
    ],
    correctIndex: 2,
    explanation: "Deployment slots estão disponíveis a partir do tier Standard. Os tiers Free e Basic não suportam deployment slots. Standard permite até 5 slots, Premium permite até 20 slots."
  },
  {
    question: "Durante um slot swap, quais das seguintes configurações se movem COM o código da aplicação para o slot de destino por padrão?",
    options: [
      "Connection strings marcadas como slot settings",
      "App settings marcadas como slot settings",
      "App settings NÃO marcadas como slot settings",
      "Bindings de domínio customizado"
    ],
    correctIndex: 2,
    explanation: "Configurações que NÃO são marcadas como \"slot settings\" (não-sticky) se movem com o código da aplicação durante um swap. Configurações slot-sticky permanecem em seus respectivos slots. Bindings de domínio customizado e connection strings marcadas como slot settings ficam com seu slot."
  },
  {
    question: "O slot de staging da Contoso serve requisições com sucesso, mas após o swap para produção, as primeiras 100 requisições falham com HTTP 503. O que deve ser configurado para prevenir isso?",
    options: [
      "Aumentar a contagem de instâncias do App Service Plan",
      "Configurar 'WEBSITE_SWAP_WARMUP_PING_PATH' para um endpoint de saúde no slot de staging",
      "Habilitar Always On para o slot de produção",
      "Reduzir o TTL do DNS para o domínio customizado"
    ],
    correctIndex: 1,
    explanation: "A configuração WEBSITE_SWAP_WARMUP_PING_PATH diz ao Azure para enviar requisições ao caminho especificado no slot de staging antes de completar o swap. Isso garante que a aplicação está completamente inicializada (caches carregados, conexões estabelecidas) antes de receber tráfego de produção. O swap não será completado até que o caminho de warm-up retorne o código de status esperado."
  }
]} />

## Limpeza

```bash
# Delete deployment slots
az webapp deployment slot delete \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging

az webapp deployment slot delete \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot preprod

# Delete the resource group and all resources
az group delete --name rg-contoso-webapp-prod --yes --no-wait
```
