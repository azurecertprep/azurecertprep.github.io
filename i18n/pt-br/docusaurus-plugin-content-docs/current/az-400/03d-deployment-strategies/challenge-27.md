---
sidebar_position: 3
title: "Desafio 27: Feature flags"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 27: Feature flags

## Habilidades do exame mapeadas

- Implementar feature flags usando o Azure App Configuration Feature Manager

## Cenário

A Contoso Ltd quer desacoplar sua cadência de deployment das releases de funcionalidades. Atualmente, uma release "big bang" a cada duas semanas agrupa múltiplas funcionalidades juntas, tornando difícil isolar qual funcionalidade causa problemas. A equipe de produto quer a capacidade de:

1. Fazer deploy de código para produção com funcionalidades ocultas atrás de flags
2. Habilitar funcionalidades para usuários internos primeiro (ring 0)
3. Gradualmente disponibilizar para testadores beta por porcentagem
4. Desabilitar instantaneamente uma funcionalidade sem reimplantar se problemas forem detectados
5. Executar testes A/B comparando o novo fluxo de checkout com o existente

**Detalhes do ambiente:**
- Aplicação .NET 8 Web API
- Azure App Configuration: `appconfig-contoso-prod`
- Resource group: `rg-contoso-config`
- Região: East US

---

## Tarefa 1: Criar recurso do Azure App Configuration

### Provisionar o store do App Configuration

```bash
RESOURCE_GROUP="rg-contoso-config"
LOCATION="eastus"
CONFIG_STORE="appconfig-contoso-prod"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Configuration store (Standard tier for feature flags)
az appconfig create \
  --name $CONFIG_STORE \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard

# Enable managed identity for the App Configuration store
az appconfig identity assign \
  --name $CONFIG_STORE \
  --resource-group $RESOURCE_GROUP
```

### Configurar RBAC para aplicações lerem feature flags

```bash
# Get the App Configuration resource ID
CONFIG_ID=$(az appconfig show \
  --name $CONFIG_STORE \
  --resource-group $RESOURCE_GROUP \
  --query id -o tsv)

# Get the web app managed identity principal ID
APP_PRINCIPAL_ID=$(az webapp identity show \
  --name app-contoso-web \
  --resource-group rg-contoso-webapp-prod \
  --query principalId -o tsv)

# Assign App Configuration Data Reader role
az role assignment create \
  --assignee $APP_PRINCIPAL_ID \
  --role "App Configuration Data Reader" \
  --scope $CONFIG_ID
```

---

## Tarefa 2: Configurar feature flags (booleano, targeting, janela de tempo)

### Criar feature flags booleanas simples

```bash
# Simple on/off feature flag
az appconfig feature set \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --description "New streamlined checkout experience" \
  --yes

# Disable the flag initially (safe deployment)
az appconfig feature disable \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --yes

# Create a time-window feature flag
az appconfig feature set \
  --name $CONFIG_STORE \
  --feature MaintenanceMode \
  --label production \
  --description "Enable maintenance mode banner" \
  --yes

# Add a time window filter
az appconfig feature filter add \
  --name $CONFIG_STORE \
  --feature MaintenanceMode \
  --label production \
  --filter-name "Microsoft.TimeWindow" \
  --filter-parameters Start="2025-03-01T00:00:00Z" End="2025-03-01T06:00:00Z"
```

### Criar feature flag com targeting (rollout por porcentagem)

```bash
# Create the feature flag for gradual rollout
az appconfig feature set \
  --name $CONFIG_STORE \
  --feature NewPaymentProcessor \
  --label production \
  --description "New payment processing engine with improved performance" \
  --yes

# Add targeting filter for percentage-based rollout
az appconfig feature filter add \
  --name $CONFIG_STORE \
  --feature NewPaymentProcessor \
  --label production \
  --filter-name "Microsoft.Targeting" \
  --filter-parameters \
    Audience.DefaultRolloutPercentage=0 \
    Audience.Groups.0.Name="InternalTeam" \
    Audience.Groups.0.RolloutPercentage=100 \
    Audience.Groups.1.Name="BetaTesters" \
    Audience.Groups.1.RolloutPercentage=50 \
    Audience.Users.0="admin@contoso.com" \
    Audience.Users.1="productmanager@contoso.com"
```

### Listar e gerenciar feature flags

```bash
# List all feature flags
az appconfig feature list \
  --name $CONFIG_STORE \
  --label production \
  --query "[].{name:name, state:state, description:description}" \
  --output table

# Enable a feature flag
az appconfig feature enable \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --yes

# Disable a feature flag (instant kill switch)
az appconfig feature disable \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --yes
```

---

## Tarefa 3: Implementar feature flags em uma aplicação .NET

### Instalar pacotes NuGet necessários

```bash
dotnet add package Microsoft.Azure.AppConfiguration.AspNetCore
dotnet add package Microsoft.FeatureManagement.AspNetCore
```

### Configurar a aplicação para usar o App Configuration

Em `Program.cs`:

```csharp
using Microsoft.FeatureManagement;
using Azure.Identity;

var builder = WebApplication.CreateBuilder(args);

// Connect to Azure App Configuration
var appConfigEndpoint = builder.Configuration["AppConfig:Endpoint"];
builder.Configuration.AddAzureAppConfiguration(options =>
{
    options.Connect(new Uri(appConfigEndpoint), new DefaultAzureCredential())
           .UseFeatureFlags(featureFlagOptions =>
           {
               featureFlagOptions.Label = "production";
               featureFlagOptions.CacheExpirationInterval = TimeSpan.FromSeconds(30);
           });
});

// Add feature management services
builder.Services.AddFeatureManagement()
    .AddFeatureFilter<TargetingFilter>();

// Add Azure App Configuration middleware for dynamic refresh
builder.Services.AddAzureAppConfiguration();

// Register targeting context accessor
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<ITargetingContextAccessor, HttpContextTargetingContextAccessor>();

builder.Services.AddControllers();
var app = builder.Build();

// Use Azure App Configuration middleware
app.UseAzureAppConfiguration();

app.MapControllers();
app.Run();
```

### Configurar `appsettings.json`

```json
{
  "AppConfig": {
    "Endpoint": "https://appconfig-contoso-prod.azconfig.io"
  }
}
```

### Usar feature flags em controllers

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement;
using Microsoft.FeatureManagement.Mvc;

[ApiController]
[Route("api/[controller]")]
public class CheckoutController : ControllerBase
{
    private readonly IFeatureManager _featureManager;
    private readonly ILogger<CheckoutController> _logger;

    public CheckoutController(IFeatureManager featureManager, ILogger<CheckoutController> logger)
    {
        _featureManager = featureManager;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> ProcessCheckout([FromBody] CheckoutRequest request)
    {
        if (await _featureManager.IsEnabledAsync("NewCheckoutFlow"))
        {
            _logger.LogInformation("Processing with new checkout flow");
            return await ProcessNewCheckout(request);
        }

        _logger.LogInformation("Processing with legacy checkout flow");
        return await ProcessLegacyCheckout(request);
    }

    // Gate an entire endpoint behind a feature flag
    [FeatureGate("NewPaymentProcessor")]
    [HttpPost("v2/payment")]
    public async Task<IActionResult> ProcessPaymentV2([FromBody] PaymentRequest request)
    {
        return Ok(new { processor = "v2", transactionId = Guid.NewGuid() });
    }

    private async Task<IActionResult> ProcessNewCheckout(CheckoutRequest request)
    {
        // New checkout logic
        return Ok(new { flow = "new", orderId = Guid.NewGuid() });
    }

    private async Task<IActionResult> ProcessLegacyCheckout(CheckoutRequest request)
    {
        // Legacy checkout logic
        return Ok(new { flow = "legacy", orderId = Guid.NewGuid() });
    }
}
```

---

## Tarefa 4: Implementar filtros de targeting (grupos de usuários, porcentagens)

### Accessor de contexto de targeting customizado

```csharp
using Microsoft.FeatureManagement.FeatureFilters;

public class HttpContextTargetingContextAccessor : ITargetingContextAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpContextTargetingContextAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public ValueTask<TargetingContext> GetContextAsync()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var user = httpContext?.User;

        var targetingContext = new TargetingContext
        {
            UserId = user?.Identity?.Name ?? "anonymous",
            Groups = GetUserGroups(user)
        };

        return new ValueTask<TargetingContext>(targetingContext);
    }

    private IEnumerable<string> GetUserGroups(System.Security.Claims.ClaimsPrincipal? user)
    {
        if (user == null) return Enumerable.Empty<string>();

        var groups = new List<string>();

        // Add internal team group based on email domain
        var email = user.FindFirst("email")?.Value ?? "";
        if (email.EndsWith("@contoso.com"))
            groups.Add("InternalTeam");

        // Add beta testers group based on claim
        if (user.HasClaim("beta_tester", "true"))
            groups.Add("BetaTesters");

        // Add enterprise users group
        if (user.HasClaim("tier", "enterprise"))
            groups.Add("EnterpriseUsers");

        return groups;
    }
}
```

### Targeting com rollout por porcentagem por grupo

```csharp
[HttpGet("features/status")]
public async Task<IActionResult> GetFeatureStatus()
{
    var features = new Dictionary<string, bool>
    {
        ["NewCheckoutFlow"] = await _featureManager.IsEnabledAsync("NewCheckoutFlow"),
        ["NewPaymentProcessor"] = await _featureManager.IsEnabledAsync("NewPaymentProcessor"),
        ["MaintenanceMode"] = await _featureManager.IsEnabledAsync("MaintenanceMode")
    };

    return Ok(features);
}
```

---

## Tarefa 5: Integrar feature flags com pipeline de CI/CD

### Workflow do GitHub Actions que alterna feature flag após verificação do deployment

Crie `.github/workflows/deploy-with-feature-flag.yml`:

```yaml
name: Deploy and enable feature flag

on:
  push:
    branches: [main]
    paths:
      - 'src/WebApp/**'

env:
  CONFIG_STORE: appconfig-contoso-prod
  RESOURCE_GROUP: rg-contoso-config
  APP_NAME: app-contoso-web

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Build and publish
        run: |
          dotnet publish src/WebApp/WebApp.csproj \
            --configuration Release \
            --output ./publish

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.APP_NAME }}
          slot-name: staging
          package: ./publish

      - name: Validate deployment
        run: |
          STAGING_URL="https://${{ env.APP_NAME }}-staging.azurewebsites.net"
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/health")
          if [ "$STATUS" != "200" ]; then
            echo "Deployment validation failed"
            exit 1
          fi

      - name: Swap to production
        run: |
          az webapp deployment slot swap \
            --name ${{ env.APP_NAME }} \
            --resource-group rg-contoso-webapp-prod \
            --slot staging \
            --target-slot production

      - name: Enable feature flag for internal team
        run: |
          az appconfig feature enable \
            --name ${{ env.CONFIG_STORE }} \
            --feature NewCheckoutFlow \
            --label production \
            --yes
          echo "Feature 'NewCheckoutFlow' enabled for internal team"
```

### Alternância de feature flag no Azure Pipelines

```yaml
- task: AzureCLI@2
  displayName: 'Toggle feature flag based on deployment success'
  inputs:
    azureSubscription: 'contoso-production-connection'
    scriptType: 'bash'
    scriptLocation: 'inlineScript'
    inlineScript: |
      FEATURE_NAME="NewCheckoutFlow"
      CONFIG_STORE="appconfig-contoso-prod"
      LABEL="production"

      HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app-contoso-web.azurewebsites.net/health")

      if [ "$HEALTH_STATUS" == "200" ]; then
        az appconfig feature enable \
          --name $CONFIG_STORE \
          --feature $FEATURE_NAME \
          --label $LABEL \
          --yes
        echo "Feature flag '$FEATURE_NAME' enabled"
      else
        az appconfig feature disable \
          --name $CONFIG_STORE \
          --feature $FEATURE_NAME \
          --label $LABEL \
          --yes
        echo "Deployment unhealthy - feature flag '$FEATURE_NAME' disabled"
      fi
```

---

## Tarefa 6: Workflow do GitHub Actions para gerenciamento de feature flags

Crie `.github/workflows/feature-flag-management.yml`:

```yaml
name: Feature flag management

on:
  workflow_dispatch:
    inputs:
      feature_name:
        description: 'Feature flag name'
        required: true
        type: string
      action:
        description: 'Action to perform'
        required: true
        type: choice
        options:
          - enable
          - disable
          - rollout-10
          - rollout-50
          - rollout-100
      label:
        description: 'Label (environment)'
        required: true
        default: 'production'
        type: string

env:
  CONFIG_STORE: appconfig-contoso-prod

jobs:
  manage-feature-flag:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Perform feature flag action
        run: |
          FEATURE="${{ inputs.feature_name }}"
          ACTION="${{ inputs.action }}"
          LABEL="${{ inputs.label }}"

          case $ACTION in
            enable)
              az appconfig feature enable \
                --name ${{ env.CONFIG_STORE }} \
                --feature "$FEATURE" \
                --label "$LABEL" \
                --yes
              echo "Feature '$FEATURE' enabled"
              ;;
            disable)
              az appconfig feature disable \
                --name ${{ env.CONFIG_STORE }} \
                --feature "$FEATURE" \
                --label "$LABEL" \
                --yes
              echo "Feature '$FEATURE' disabled (kill switch activated)"
              ;;
            rollout-10)
              az appconfig feature filter update \
                --name ${{ env.CONFIG_STORE }} \
                --feature "$FEATURE" \
                --label "$LABEL" \
                --filter-name "Microsoft.Targeting" \
                --filter-parameters Audience.DefaultRolloutPercentage=10 \
                --yes
              echo "Feature '$FEATURE' rolling out to 10%"
              ;;
            rollout-50)
              az appconfig feature filter update \
                --name ${{ env.CONFIG_STORE }} \
                --feature "$FEATURE" \
                --label "$LABEL" \
                --filter-name "Microsoft.Targeting" \
                --filter-parameters Audience.DefaultRolloutPercentage=50 \
                --yes
              echo "Feature '$FEATURE' rolling out to 50%"
              ;;
            rollout-100)
              az appconfig feature filter update \
                --name ${{ env.CONFIG_STORE }} \
                --feature "$FEATURE" \
                --label "$LABEL" \
                --filter-name "Microsoft.Targeting" \
                --filter-parameters Audience.DefaultRolloutPercentage=100 \
                --yes
              echo "Feature '$FEATURE' fully rolled out to 100%"
              ;;
          esac

      - name: Verify feature flag state
        run: |
          az appconfig feature show \
            --name ${{ env.CONFIG_STORE }} \
            --feature "${{ inputs.feature_name }}" \
            --label "${{ inputs.label }}"
```

---

## Tarefa 7: Testes A/B com feature flags

### Configurar um teste A/B usando porcentagens de targeting

```bash
# Create an A/B test feature flag with 50/50 split
az appconfig feature set \
  --name $CONFIG_STORE \
  --feature CheckoutExperiment \
  --label production \
  --description "A/B test: new checkout vs existing checkout" \
  --yes

az appconfig feature filter add \
  --name $CONFIG_STORE \
  --feature CheckoutExperiment \
  --label production \
  --filter-name "Microsoft.Targeting" \
  --filter-parameters \
    Audience.DefaultRolloutPercentage=50

az appconfig feature enable \
  --name $CONFIG_STORE \
  --feature CheckoutExperiment \
  --label production \
  --yes
```

### Rastrear resultados do teste A/B no Application Insights

```csharp
[HttpPost("checkout")]
public async Task<IActionResult> Checkout([FromBody] CheckoutRequest request)
{
    var isNewCheckout = await _featureManager.IsEnabledAsync("CheckoutExperiment");
    var variant = isNewCheckout ? "new_checkout" : "legacy_checkout";

    // Track which variant the user is in
    _telemetryClient.TrackEvent("CheckoutStarted", new Dictionary<string, string>
    {
        ["variant"] = variant,
        ["userId"] = User.Identity?.Name ?? "anonymous"
    });

    var stopwatch = System.Diagnostics.Stopwatch.StartNew();

    IActionResult result = isNewCheckout
        ? await ProcessNewCheckout(request)
        : await ProcessLegacyCheckout(request);

    stopwatch.Stop();

    // Track completion metrics for both variants
    _telemetryClient.TrackMetric("CheckoutDurationMs", stopwatch.ElapsedMilliseconds,
        new Dictionary<string, string> { ["variant"] = variant });

    return result;
}
```

### Consultar resultados do teste A/B no Application Insights (KQL)

```kusto
// Compare conversion rates between variants
customEvents
| where name == "CheckoutCompleted"
| extend variant = tostring(customDimensions["variant"])
| summarize
    totalAttempts = count(),
    successCount = countif(tostring(customDimensions["success"]) == "true")
    by variant
| extend conversionRate = round(100.0 * successCount / totalAttempts, 2)
| project variant, totalAttempts, successCount, conversionRate
```

---

## Exercícios de quebra e conserto

### Exercício 1: Feature flag não atualiza

**Sintoma:** Uma feature flag foi habilitada no Azure App Configuration há 10 minutos, mas a aplicação ainda apresenta o comportamento antigo.

**Investigar:**
```bash
# Verify the flag is enabled in App Configuration
az appconfig feature show \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --query "{state:state, lastModified:lastModified}"
```


<details>
<summary>Mostrar solução</summary>

**Causa raiz:** O `CacheExpirationInterval` está configurado muito alto (o padrão pode ter sido sobrescrito), ou o middleware do Azure App Configuration (`app.UseAzureAppConfiguration()`) está faltando no pipeline.


**Correção:**
```csharp
// Ensure cache expiration is set to 30 seconds
options.UseFeatureFlags(featureFlagOptions =>
{
    featureFlagOptions.CacheExpirationInterval = TimeSpan.FromSeconds(30);
    featureFlagOptions.Label = "production";
});

// Ensure middleware is registered in the correct order
app.UseAzureAppConfiguration(); // Must be before app.MapControllers()
app.MapControllers();
```

</details>

### Exercício 2: Filtro de targeting não aplicando corretamente

**Sintoma:** Membros da equipe interna (com email @contoso.com) não estão vendo a nova funcionalidade mesmo que o filtro de targeting os inclua em 100%.


<details>
<summary>Mostrar solução</summary>

**Causa raiz:** O `IHttpContextAccessor` não está registrado no contêiner de DI, então o `HttpContext` é null e o resolver de contexto de targeting retorna "anonymous" sem grupos.


**Correção:**
```csharp
// In Program.cs, register IHttpContextAccessor
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<ITargetingContextAccessor, HttpContextTargetingContextAccessor>();
```

</details>

### Exercício 3: Incompatibilidade de label da feature flag

**Sintoma:** Feature flags funcionam em staging mas não em produção. A flag é exibida como habilitada no portal do Azure.

**Investigar:**
```bash
# Check what labels exist for the feature
az appconfig feature list \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --query "[].{label:label, state:state}"
```


<details>
<summary>Mostrar solução</summary>

**Causa raiz:** A flag foi habilitada com label `staging` mas a aplicação de produção está configurada para ler label `production`.


**Correção:**
```bash
# Enable the flag with the correct label
az appconfig feature enable \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --yes
```


</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso quer habilitar uma nova funcionalidade para 10% de todos os usuários, 100% dos membros da equipe interna e testadores beta específicos nomeados. Qual filtro de feature flag do Azure App Configuration eles devem usar?",
    options: [
      "Filtro Microsoft.TimeWindow",
      "Filtro Microsoft.Targeting",
      "Filtro Microsoft.Percentage",
      "Filtro customizado com membership de grupo do Azure AD"
    ],
    correctIndex: 1,
    explanation: "O filtro Microsoft.Targeting suporta os três requisitos: rollout baseado em porcentagem (DefaultRolloutPercentage), targeting baseado em grupo com porcentagens diferentes por grupo, e targeting de usuários específicos por ID de usuário. O filtro TimeWindow só suporta ativação baseada em tempo. O filtro Percentage só suporta uma porcentagem global sem granularidade de grupo ou usuário."
  },
  {
    question: "Uma aplicação .NET usa feature flags do Azure App Configuration, mas mudanças feitas no portal levam mais de 5 minutos para refletir na aplicação. Qual mudança de configuração reduz esse atraso para menos de 30 segundos?",
    options: [
      "Habilitar notificações push em tempo real via Azure Event Grid",
      "Definir 'CacheExpirationInterval' como 'TimeSpan.FromSeconds(30)' nas opções de 'UseFeatureFlags'",
      "Reiniciar o App Service após cada mudança de feature flag",
      "Definir o SKU do App Configuration como Premium para replicação mais rápida"
    ],
    correctIndex: 1,
    explanation: "O CacheExpirationInterval controla com que frequência a biblioteca de gerenciamento de funcionalidades verifica o App Configuration por atualizações. O padrão é 30 segundos, mas se foi sobrescrito para um valor maior, reduzi-lo garante que a aplicação captura mudanças mais rapidamente. O middleware do Azure App Configuration usa um modelo de polling, então o intervalo determina diretamente o atraso máximo."
  },
  {
    question: "A Contoso faz deploy de novo código que inclui uma funcionalidade atrás de uma feature flag. A flag está desabilitada no momento do deploy. Após verificar que o deployment está saudável, o pipeline habilita a flag. Se a funcionalidade causar erros, qual é a remediação mais rápida?",
    options: [
      "Reimplantar a versão anterior da aplicação",
      "Desabilitar a feature flag no Azure App Configuration",
      "Realizar um slot swap de volta para a versão anterior",
      "Escalar o App Service para lidar com a carga de erros adicional"
    ],
    correctIndex: 1,
    explanation: "Desabilitar a feature flag é instantâneo (faz efeito dentro do intervalo de expiração do cache, tipicamente 30 segundos) e não requer nenhum deployment ou mudança de infraestrutura. Um slot swap ou reimplantação leva minutos. Esta é a principal vantagem das feature flags: elas desacoplam deployment de release e fornecem um kill switch instantâneo."
  },
  {
    question: "Qual pacote NuGet fornece o atributo '[FeatureGate]' para restringir ações de controllers ASP.NET Core atrás de feature flags?",
    options: [
      "Microsoft.Azure.AppConfiguration.AspNetCore",
      "Microsoft.FeatureManagement.AspNetCore",
      "Azure.Data.AppConfiguration",
      "Microsoft.Extensions.Configuration.AzureAppConfiguration"
    ],
    correctIndex: 1,
    explanation: "O pacote Microsoft.FeatureManagement.AspNetCore fornece o atributo [FeatureGate], a interface IFeatureManager e integração com ASP.NET Core incluindo tag helpers e filtros de ação. O pacote Microsoft.Azure.AppConfiguration.AspNetCore fornece a conexão com o Azure App Configuration mas não inclui os atributos de gerenciamento de funcionalidades."
  }
]} />

## Limpeza

```bash
# Delete feature flags
az appconfig feature delete \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --yes

az appconfig feature delete \
  --name $CONFIG_STORE \
  --feature NewPaymentProcessor \
  --label production \
  --yes

az appconfig feature delete \
  --name $CONFIG_STORE \
  --feature CheckoutExperiment \
  --label production \
  --yes

# Delete the resource group
az group delete --name rg-contoso-config --yes --no-wait
```
