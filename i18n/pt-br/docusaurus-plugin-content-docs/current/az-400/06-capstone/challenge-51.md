---
sidebar_position: 1
title: "Desafio 51: Capstone entre domÃ­nios"
sidebar_label: "Desafio 51: Capstone entre domÃ­nios"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 51: Ciclo de vida DevOps de ponta a ponta

:::info Plataforma: comparaÃ§Ã£o
Este capstone integra GitHub e Azure DevOps em todos os domÃ­nios do exame.
:::

## Habilidades do exame abordadas

Este desafio testa habilidades de todos os cinco domÃ­nios do exame AZ-400:
- DomÃ­nio 1: Processos e comunicaÃ§Ãµes
- DomÃ­nio 2: EstratÃ©gia de controle de cÃ³digo-fonte
- DomÃ­nio 3: Pipelines de build e release
- DomÃ­nio 4: SeguranÃ§a e conformidade
- DomÃ­nio 5: EstratÃ©gia de instrumentaÃ§Ã£o

## CenÃ¡rio

A Contoso estÃ¡ lanÃ§ando o "Contoso Payments" -- um novo microsserviÃ§o de processamento de pagamentos que lida com transaÃ§Ãµes de cartÃ£o de crÃ©dito. O serviÃ§o deve processar pagamentos via uma REST API, integrar-se com gateways de pagamento externos e armazenar registros de transaÃ§Ãµes no Azure SQL Database.

Devido aos requisitos de conformidade PCI-DSS, cada aspecto do ciclo de vida DevOps deve ser adequadamente protegido, monitorado e auditÃ¡vel. Nenhum segredo pode existir no controle de cÃ³digo-fonte, todos os deployments devem ser rastreÃ¡veis atÃ© work items aprovados, e o ambiente de produÃ§Ã£o deve ter monitoramento contÃ­nuo com alertas automatizados.

Sua equipe consiste em quatro desenvolvedores, um engenheiro de QA e um SRE. VocÃª Ã© o engenheiro DevOps responsÃ¡vel por projetar e implementar todo o pipeline de entrega, desde a criaÃ§Ã£o do repositÃ³rio atÃ© o monitoramento em produÃ§Ã£o.

**Tempo estimado:** 60-90 minutos

---

## Parte 1: ConfiguraÃ§Ã£o do controle de cÃ³digo-fonte

### 1.1 Estrutura do repositÃ³rio

Crie um repositÃ³rio GitHub `contoso-payments` com a seguinte estrutura:

```text
contoso-payments/
  src/
    Contoso.Payments.Api/
    Contoso.Payments.Domain/
    Contoso.Payments.Infrastructure/
    Contoso.Payments.Sdk/
  tests/
    Contoso.Payments.Api.Tests/
    Contoso.Payments.Domain.Tests/
    Contoso.Payments.Integration.Tests/
  infra/
    modules/
    main.bicep
    parameters/
      staging.bicepparam
      production.bicepparam
  .github/
    workflows/
    CODEOWNERS
  docs/
```

### 1.2 EstratÃ©gia de branches

Implemente um modelo de desenvolvimento trunk-based com feature branches de curta duraÃ§Ã£o:

| Branch | PropÃ³sito | ProteÃ§Ã£o |
|--------|-----------|----------|
| `main` | CÃ³digo pronto para produÃ§Ã£o | Requer PR, 2 revisores, CI aprovado, sem force push |
| `release/*` | EstabilizaÃ§Ã£o de release | Requer PR, 1 revisor, CI aprovado |
| `feature/*` | Trabalho de desenvolvimento | Sem push direto para main |
| `hotfix/*` | CorreÃ§Ãµes de emergÃªncia | Requer 1 revisor, CI acelerado |

### 1.3 ConfiguraÃ§Ã£o do CODEOWNERS

```text
# Default owners
* @contoso/payments-team

# Infrastructure requires platform team review
/infra/ @contoso/platform-team @contoso/payments-team

# Security-sensitive files require security team
/.github/workflows/ @contoso/security-team @contoso/payments-team
/src/Contoso.Payments.Infrastructure/Encryption/ @contoso/security-team

# SDK changes require API governance review
/src/Contoso.Payments.Sdk/ @contoso/api-governance
```

### 1.4 Regras de proteÃ§Ã£o de branch

Configure o seguinte para `main`:

- Exigir revisÃµes de pull request (mÃ­nimo 2)
- Descartar revisÃµes obsoletas em novos pushes
- Exigir revisÃ£o dos CODEOWNERS
- Exigir verificaÃ§Ãµes de status: `build`, `test`, `security-scan`, `lint`
- Exigir que branches estejam atualizados antes do merge
- Exigir commits assinados
- Restringir quem pode fazer push (apenas lÃ­deres de equipe)
- Exigir histÃ³rico linear (apenas squash merge)

---

## Parte 2: Rastreamento de trabalho e rastreabilidade

### 2.1 Quadro do GitHub Projects

Crie um quadro do GitHub Projects com as seguintes colunas:

| Coluna | AutomaÃ§Ã£o |
|--------|-----------|
| Backlog | Novas issues chegam aqui |
| Sprint Ready | Triados e estimados manualmente |
| In Progress | Move automaticamente quando branch criada ou PR aberto |
| In Review | Move automaticamente quando PR pronto para revisÃ£o |
| Done | Move automaticamente quando PR Ã© feito merge |

### 2.2 Templates de issues

Crie templates de issues para:

- **Feature request** -- inclui campos para critÃ©rios de aceitaÃ§Ã£o, serviÃ§os afetados e avaliaÃ§Ã£o de impacto PCI-DSS
- **Bug report** -- inclui passos de reproduÃ§Ã£o, classificaÃ§Ã£o de severidade e ambiente afetado
- **Security finding** -- visibilidade restrita, inclui pontuaÃ§Ã£o CVSS e prazo de remediaÃ§Ã£o

### 2.3 Rastreabilidade de commits

Aplique padrÃµes de mensagem de commit usando uma verificaÃ§Ã£o de commit-lint no CI:

```text
<type>(<scope>): <description>

[optional body]

Refs: #<issue-number>
```

Tipos vÃ¡lidos: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `security`

Cada commit para `main` (via squash merge) deve referenciar um work item. Configure uma GitHub Action que valide se a descriÃ§Ã£o do PR contÃ©m uma issue vinculada antes que o merge seja permitido.

---

## Parte 3: Pipeline de CI

### 3.1 Workflow de build e teste

Crie `.github/workflows/ci.yml`:

```yaml
name: CI Pipeline

on:
  pull_request:
    branches: [main, release/*]
  push:
    branches: [main]

permissions:
  contents: read
  checks: write
  security-events: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Restore dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --no-restore --configuration Release

      - name: Run unit tests with coverage
        run: |
          dotnet test tests/Contoso.Payments.Api.Tests \
            --no-build --configuration Release \
            --collect:"XPlat Code Coverage" \
            --results-directory ./coverage

      - name: Check coverage threshold
        uses: danielpalme/ReportGenerator-GitHub-Action@5
        with:
          reports: './coverage/**/coverage.cobertura.xml'
          targetdir: './coverage-report'
          reporttypes: 'TextSummary'

      - name: Enforce 80% coverage gate
        run: |
          COVERAGE=$(grep "Line coverage" coverage-report/Summary.txt | grep -oP '\d+\.?\d*')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run dotnet format check
        run: dotnet format --verify-no-changes --severity warn

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: csharp
          queries: +security-extended

      - name: Build for CodeQL
        run: dotnet build --configuration Release

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:csharp"
```

### 3.2 ConfiguraÃ§Ã£o do Dependabot

Crie `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "nuget"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "automated"
    groups:
      microsoft:
        patterns:
          - "Microsoft.*"
          - "Azure.*"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "ci"
      - "automated"
```

### 3.3 VerificaÃ§Ãµes de status obrigatÃ³rias

Todas as seguintes verificaÃ§Ãµes devem passar antes que um PR possa ser feito merge:

- `build` -- compilaÃ§Ã£o bem-sucedida
- `lint` -- sem violaÃ§Ãµes de formataÃ§Ã£o
- `security-scan` -- sem findings de alta/crÃ­tica severidade
- `coverage-gate` -- mÃ­nimo de 80% de cobertura de linhas
- `commit-lint` -- formato da mensagem de commit validado

---

## Parte 4: Gerenciamento de pacotes

### 4.1 PublicaÃ§Ã£o do SDK compartilhado

O projeto `Contoso.Payments.Sdk` Ã© um pacote NuGet compartilhado consumido por outros serviÃ§os da Contoso. Publique-o no GitHub Packages a cada merge para `main`.

Crie `.github/workflows/publish-sdk.yml`:

```yaml
name: Publish SDK

on:
  push:
    branches: [main]
    paths:
      - 'src/Contoso.Payments.Sdk/**'

permissions:
  packages: write
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Determine version
        id: version
        run: |
          VERSION="1.0.${{ github.run_number }}"
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Pack SDK
        run: |
          dotnet pack src/Contoso.Payments.Sdk \
            --configuration Release \
            -p:PackageVersion=${{ steps.version.outputs.version }}

      - name: Publish to GitHub Packages
        run: |
          dotnet nuget push src/Contoso.Payments.Sdk/bin/Release/*.nupkg \
            --source "https://nuget.pkg.github.com/contoso/index.json" \
            --api-key ${{ secrets.GITHUB_TOKEN }}
```

### 4.2 EstratÃ©gia de versionamento de pacotes

- Feature branches: versÃµes prÃ©-release (ex.: `1.0.42-feature-payments.1`)
- Branch main: versÃµes estÃ¡veis (ex.: `1.0.42`)
- Release branches: release candidates (ex.: `1.0.42-rc.1`)

### 4.3 Consumo de pacotes

Configure serviÃ§os downstream para consumir o SDK do GitHub Packages adicionando um `nuget.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
    <add key="contoso" value="https://nuget.pkg.github.com/contoso/index.json" />
  </packageSources>
  <packageSourceCredentials>
    <contoso>
      <add key="Username" value="contoso-bot" />
      <add key="ClearTextPassword" value="%GITHUB_TOKEN%" />
    </contoso>
  </packageSourceCredentials>
</configuration>
```

---

## Parte 5: Pipeline de CD

### 5.1 Deployment multi-stage

Crie `.github/workflows/deploy.yml` implementando os seguintes estÃ¡gios:

```text
Build --> Staging (auto) --> Integration Tests --> Production (aprovaÃ§Ã£o manual, blue-green)
```

```yaml
name: Deploy

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - name: Build and push container image
        id: meta
        run: |
          IMAGE_TAG="${{ github.sha }}"
          az acr build \
            --registry contosopaymentsacr \
            --image payments-api:$IMAGE_TAG \
            --file src/Contoso.Payments.Api/Dockerfile .
          echo "tags=$IMAGE_TAG" >> $GITHUB_OUTPUT

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Login to Azure (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy to staging
        uses: azure/arm-deploy@v2
        with:
          resourceGroupName: rg-payments-staging
          template: infra/main.bicep
          parameters: infra/parameters/staging.bicepparam
          failOnStdErr: false

      - name: Update container app revision
        run: |
          az containerapp update \
            --name ca-payments-api \
            --resource-group rg-payments-staging \
            --image contosopaymentsacr.azurecr.io/payments-api:${{ needs.build.outputs.image-tag }}

  integration-tests:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run integration tests against staging
        run: |
          dotnet test tests/Contoso.Payments.Integration.Tests \
            --configuration Release \
            --environment "PAYMENTS_API_URL=https://ca-payments-api.staging.contoso.com"

  deploy-production:
    needs: integration-tests
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://payments.contoso.com
    steps:
      - uses: actions/checkout@v4

      - name: Login to Azure (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy infrastructure
        uses: azure/arm-deploy@v2
        with:
          resourceGroupName: rg-payments-production
          template: infra/main.bicep
          parameters: infra/parameters/production.bicepparam
          failOnStdErr: false

      - name: Blue-green deployment
        run: |
          # Deploy to inactive slot (green)
          az containerapp revision copy \
            --name ca-payments-api \
            --resource-group rg-payments-production \
            --image contosopaymentsacr.azurecr.io/payments-api:${{ needs.build.outputs.image-tag }} \
            --revision-suffix green-${{ github.run_number }}

          # Route 10% traffic to green for canary validation
          az containerapp ingress traffic set \
            --name ca-payments-api \
            --resource-group rg-payments-production \
            --revision-weight \
              ca-payments-api--active=90 \
              ca-payments-api--green-${{ github.run_number }}=10

      - name: Validate canary
        run: |
          sleep 120
          # Check error rate on green revision
          ERROR_RATE=$(az monitor metrics list \
            --resource /subscriptions/.../ca-payments-api \
            --metric "Requests" \
            --filter "StatusCode ge 500 and RevisionName eq 'green-${{ github.run_number }}'" \
            --interval PT5M | jq '.value[0].timeseries[0].data[-1].total // 0')

          if [ "$ERROR_RATE" -gt 5 ]; then
            echo "Canary failed: error rate too high"
            exit 1
          fi

      - name: Promote green to active
        run: |
          az containerapp ingress traffic set \
            --name ca-payments-api \
            --resource-group rg-payments-production \
            --revision-weight \
              ca-payments-api--green-${{ github.run_number }}=100
```

### 5.2 Regras de proteÃ§Ã£o de ambiente

| Ambiente | Regras |
|----------|--------|
| staging | Sem aprovaÃ§Ãµes, deploy a cada push para main |
| production | Requer 2 aprovaÃ§Ãµes (de `@contoso/release-managers`), temporizador de espera de 5 minutos, restrito Ã  branch `main` |

### 5.3 Procedimento de rollback

Se o deployment em produÃ§Ã£o falhar na validaÃ§Ã£o canary:

1. O trÃ¡fego Ã© automaticamente roteado de volta para a revisÃ£o ativa anterior (100%)
2. A revisÃ£o green que falhou Ã© desativada
3. Uma issue de incidente Ã© automaticamente criada com detalhes do deployment
4. A equipe Ã© notificada via webhook do Microsoft Teams

---

## Parte 6: SeguranÃ§a

### 6.1 Workload identity federation (OIDC)

Configure credenciais federadas para eliminar segredos armazenados para autenticaÃ§Ã£o no Azure:

```bash
# Create app registration for each environment
az ad app create --display-name "contoso-payments-staging"
az ad app create --display-name "contoso-payments-production"

# Configure federated credential for GitHub Actions
az ad app federated-credential create \
  --id <app-object-id> \
  --parameters '{
    "name": "github-main-branch",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/contoso-payments:environment:production",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### 6.2 IntegraÃ§Ã£o com Key Vault

Todos os segredos da aplicaÃ§Ã£o devem vir do Azure Key Vault. Nenhum segredo em variÃ¡veis de ambiente, configuraÃ§Ãµes de aplicaÃ§Ã£o ou variÃ¡veis de pipeline.

```bicep
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-payments-${environment}'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      virtualNetworkRules: [
        { id: containerAppSubnetId }
      ]
    }
  }
}
```

Segredos armazenados no Key Vault:
- `payment-gateway-api-key` -- credencial do processador de pagamentos externo
- `sql-connection-string` -- conexÃ£o com o banco de dados (managed identity preferida, connection string como fallback)
- `encryption-key` -- chave de criptografia de dados de cartÃ£o (rotaÃ§Ã£o automÃ¡tica a cada 90 dias)

### 6.3 Varredura e prevenÃ§Ã£o de segredos

- Habilitar GitHub secret scanning com push protection
- Configurar padrÃµes de segredos personalizados para tokens especÃ­ficos da Contoso (formato: `ctp_[a-zA-Z0-9]{32}`)
- Hook de pre-commit usando `gitleaks` para capturar segredos antes de chegarem ao remoto

### 6.4 Hardening de seguranÃ§a do pipeline

- Fixar todas as GitHub Actions por SHA (nÃ£o por tags): `uses: actions/checkout@<full-sha>`
- Usar `permissions` no nÃ­vel do job com menor privilÃ©gio
- Sem self-hosted runners para deployments em produÃ§Ã£o
- Encaminhamento de log de auditoria para SIEM para todas as execuÃ§Ãµes de workflow

---

## Parte 7: Monitoramento e observabilidade

### 7.1 IntegraÃ§Ã£o com Application Insights

Configure o Application Insights com o seguinte:

```csharp
// Program.cs
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
    options.EnableAdaptiveSampling = true;
});

builder.Services.AddApplicationInsightsTelemetryProcessor<PciDataScrubber>();

// Custom telemetry processor to strip PCI data from traces
public class PciDataScrubber : ITelemetryProcessor
{
    private readonly ITelemetryProcessor _next;

    public PciDataScrubber(ITelemetryProcessor next) => _next = next;

    public void Process(ITelemetry item)
    {
        if (item is RequestTelemetry request)
        {
            // Strip card numbers from request telemetry
            request.Properties.Remove("cardNumber");
            request.Url = SanitizeUrl(request.Url);
        }
        _next.Process(item);
    }
}
```

### 7.2 AnotaÃ§Ãµes de deployment

Adicione marcadores de deployment ao Application Insights apÃ³s cada deployment em produÃ§Ã£o:

```yaml
      - name: Create deployment annotation
        run: |
          az monitor app-insights component update-tags \
            --app ai-payments-production \
            --resource-group rg-payments-production \
            --tags "deployment=${{ github.sha }}"

          # Create release annotation via REST API
          ANNOTATION_BODY=$(cat <<EOF
          {
            "Id": "${{ github.run_id }}",
            "AnnotationName": "Release ${{ github.run_number }}",
            "EventTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "Category": "Deployment",
            "Properties": "{\"ReleaseName\":\"${{ github.run_number }}\",\"CommitSha\":\"${{ github.sha }}\"}"
          }
          EOF
          )

          az rest --method put \
            --uri "/subscriptions/{sub}/resourceGroups/rg-payments-production/providers/microsoft.insights/components/ai-payments-production/Annotations" \
            --body "$ANNOTATION_BODY"
```

### 7.3 Alerta KQL para pico de erros

Crie uma regra de alerta que dispara quando a taxa de erros 5xx excede a linha de base:

```kql
// Alert: Error rate spike detection
let baseline = requests
| where timestamp between (ago(7d) .. ago(1h))
| summarize baseline_rate = todouble(countif(resultCode startswith "5")) / count();
requests
| where timestamp > ago(5m)
| summarize
    current_errors = countif(resultCode startswith "5"),
    total_requests = count()
| extend current_rate = todouble(current_errors) / total_requests
| where current_rate > toscalar(baseline) * 3
    and current_errors > 10
```

ConfiguraÃ§Ã£o do alerta:
- Severidade: 1 (CrÃ­tica)
- FrequÃªncia de avaliaÃ§Ã£o: 5 minutos
- Grupo de aÃ§Ã£o: acionar SRE de plantÃ£o via PagerDuty, criar incidente no GitHub Issues, postar no canal do Teams

### 7.4 Dashboard

Crie um Azure Dashboard com os seguintes tiles:

| Tile | MÃ©trica | VisualizaÃ§Ã£o |
|------|---------|--------------|
| Taxa de requisiÃ§Ãµes | requisiÃ§Ãµes por segundo | GrÃ¡fico temporal |
| Taxa de erros | 5xx / total de requisiÃ§Ãµes | GrÃ¡fico temporal com linha de threshold |
| Tempo de resposta P95 | percentil de duraÃ§Ã£o | GrÃ¡fico temporal |
| SaÃºde de dependÃªncias | latÃªncia do gateway de pagamento externo | GrÃ¡fico temporal |
| RevisÃµes ativas | divisÃ£o de trÃ¡fego por revisÃ£o do container app | GrÃ¡fico de pizza |
| FrequÃªncia de deployment | deployments por semana | GrÃ¡fico de barras (DORA) |

---

## Parte 8: OperaÃ§Ãµes de pipeline

### 8.1 Cache do pipeline

Otimize o tempo de execuÃ§Ã£o do pipeline de CI com caching:

```yaml
      - name: Cache NuGet packages
        uses: actions/cache@v4
        with:
          path: ~/.nuget/packages
          key: nuget-${{ runner.os }}-${{ hashFiles('**/*.csproj') }}
          restore-keys: |
            nuget-${{ runner.os }}-

      - name: Cache Docker layers
        uses: actions/cache@v4
        with:
          path: /tmp/.buildx-cache
          key: docker-${{ runner.os }}-${{ hashFiles('src/Contoso.Payments.Api/Dockerfile') }}
          restore-keys: |
            docker-${{ runner.os }}-
```

Meta: pipeline de CI completa em menos de 5 minutos para verificaÃ§Ãµes de PR.

### 8.2 PolÃ­tica de retenÃ§Ã£o

| Artefato | RetenÃ§Ã£o |
|----------|----------|
| Logs de build do CI | 30 dias |
| Imagens de container (nÃ£o-produÃ§Ã£o) | 14 dias |
| Imagens de container (produÃ§Ã£o) | 1 ano |
| Resultados de testes | 90 dias |
| RelatÃ³rios de varredura de seguranÃ§a | 2 anos (requisito PCI-DSS) |
| Logs de deployment | 1 ano |

Configure a retenÃ§Ã£o do Azure Container Registry:

```bash
az acr config retention update \
  --registry contosopaymentsacr \
  --status enabled \
  --days 14 \
  --type UntaggedManifests

# Tag production images for long-term retention
az acr repository update \
  --name contosopaymentsacr \
  --image payments-api:$TAG \
  --write-enabled false
```

### 8.3 Rastreamento de mÃ©tricas DORA

Rastreie as quatro mÃ©tricas DORA usando dados de workflows do GitHub Actions e Application Insights:

| MÃ©trica | Meta | MediÃ§Ã£o |
|---------|------|---------|
| FrequÃªncia de deployment | DiÃ¡ria | Contagem de deployments em produÃ§Ã£o por dia |
| Lead time para mudanÃ§as | Menos de 1 dia | Tempo do primeiro commit atÃ© o deployment em produÃ§Ã£o |
| Tempo mÃ©dio de recuperaÃ§Ã£o (MTTR) | Menos de 1 hora | Tempo da criaÃ§Ã£o do incidente atÃ© a resoluÃ§Ã£o |
| Taxa de falha de mudanÃ§as | Menos de 5% | Deployments em produÃ§Ã£o causando incidentes / total de deployments |

Implemente um workflow agendado que calcula e reporta essas mÃ©tricas semanalmente:

```yaml
name: DORA Metrics Report

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate deployment frequency
        uses: actions/github-script@v7
        with:
          script: |
            const runs = await github.rest.actions.listWorkflowRuns({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'deploy.yml',
              status: 'success',
              created: `>=${new Date(Date.now() - 7*24*60*60*1000).toISOString()}`
            });
            console.log(`Deployments this week: ${runs.data.total_count}`);
```

---

## ExercÃ­cios de quebra e conserto

### CenÃ¡rio 1: Erros 500 em produÃ§Ã£o apÃ³s deployment

**SituaÃ§Ã£o:** O pipeline de deploy foi concluÃ­do com sucesso. Todos os testes de integraÃ§Ã£o passaram no staging. No entanto, dentro de 10 minutos do deployment em produÃ§Ã£o, o Application Insights mostra um pico de erros 500 no endpoint `POST /api/payments`.

**Passos de investigaÃ§Ã£o:**

1. Verificar o alerta de pico de erros do Application Insights que disparou
2. Examinar a telemetria de exceÃ§Ãµes -- vocÃª encontra: `SqlException: Invalid column name 'PaymentMethodToken'`
3. Revisar o diff do deployment -- uma nova coluna foi adicionada Ã  tabela `Payments` no cÃ³digo, mas a migration do Entity Framework nunca foi aplicada ao banco de dados de produÃ§Ã£o
4. O ambiente de staging tinha a migration aplicada manualmente durante o desenvolvimento, mas nÃ£o existe um passo automatizado de migration no pipeline de CD


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**Causa raiz:** O pipeline de CD faz deploy do cÃ³digo da aplicaÃ§Ã£o, mas nÃ£o executa migrations de banco de dados. O ambiente de staging tinha a migration aplicada fora do processo, entÃ£o os testes de integraÃ§Ã£o passaram.


**CorreÃ§Ã£o:**

Adicione um passo de migration ao pipeline de deployment que executa antes da atualizaÃ§Ã£o da aplicaÃ§Ã£o:

```yaml
      - name: Run database migrations
        run: |
          dotnet tool install --global dotnet-ef
          dotnet ef database update \
            --project src/Contoso.Payments.Infrastructure \
            --startup-project src/Contoso.Payments.Api \
            --connection "${{ secrets.SQL_CONNECTION_STRING }}"
```

**PrevenÃ§Ã£o:** Adicione uma verificaÃ§Ã£o no CI que compara migrations pendentes contra o schema do banco de dados alvo e falha se as migrations nÃ£o estiverem incluÃ­das no deployment.


</details>

### CenÃ¡rio 2: Falso positivo de varredura de seguranÃ§a bloqueando deployment

**SituaÃ§Ã£o:** Um desenvolvedor submete um PR que adiciona validaÃ§Ã£o de entrada para nÃºmeros de cartÃ£o de crÃ©dito. O CodeQL sinaliza o cÃ³digo como um possÃ­vel finding de "Cleartext storage of sensitive information" porque o mÃ©todo de validaÃ§Ã£o aceita um parÃ¢metro de nÃºmero de cartÃ£o.

**O cÃ³digo sinalizado:**

```csharp
public static bool IsValidCardNumber(string cardNumber)
{
    // Luhn algorithm validation - no storage occurs
    int sum = 0;
    bool alternate = false;
    for (int i = cardNumber.Length - 1; i >= 0; i--)
    {
        int digit = cardNumber[i] - '0';
        if (alternate) digit *= 2;
        if (digit > 9) digit -= 9;
        sum += digit;
        alternate = !alternate;
    }
    return sum % 10 == 0;
}
```

**Passos de investigaÃ§Ã£o:**

1. Revisar o alerta do CodeQL na aba Security
2. Confirmar que o mÃ©todo realiza apenas validaÃ§Ã£o -- sem logging, sem persistÃªncia, sem chamadas de rede
3. O nome da variÃ¡vel `cardNumber` dispara o pattern match, mas os dados nunca sÃ£o armazenados


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:**

Crie uma configuraÃ§Ã£o do CodeQL para suprimir este falso positivo especÃ­fico:

```yaml
# .github/codeql/codeql-config.yml
name: "Contoso Payments CodeQL Config"
queries:
  - uses: security-extended

paths-ignore:
  - 'tests/**'

query-filters:
  - exclude:
      id: cs/cleartext-storage
      tags: contains security
```

Para o mÃ©todo especÃ­fico, adicione um comentÃ¡rio de supressÃ£o:

```csharp
[System.Diagnostics.CodeAnalysis.SuppressMessage(
    "Security", "CS0001:CleartextStorage",
    Justification = "Validation only - card number is not stored or logged")]
public static bool IsValidCardNumber(string cardNumber)
```

**Processo:** Documente todas as exceÃ§Ãµes de varredura de seguranÃ§a em um arquivo `SECURITY_EXCEPTIONS.md` que Ã© revisado trimestralmente pela equipe de seguranÃ§a. Cada exceÃ§Ã£o deve incluir a justificativa, o revisor e a data de expiraÃ§Ã£o.


</details>

### CenÃ¡rio 3: Hotfix de emergÃªncia para falhas de pagamento em produÃ§Ã£o

**SituaÃ§Ã£o:** Ã€s 2:00 da manhÃ£, o SRE de plantÃ£o recebe um alerta do PagerDuty: o processamento de pagamentos estÃ¡ falhando para todas as transaÃ§Ãµes. O Application Insights mostra que o gateway de pagamento externo estÃ¡ retornando `401 Unauthorized`. A investigaÃ§Ã£o revela que a chave da API do gateway foi rotacionada pelo provedor, mas o segredo no Key Vault nÃ£o foi atualizado.

**Resposta necessÃ¡ria:**

1. **Triagem imediata (5 minutos)**
   - Confirmar o problema via rastreamento de dependÃªncias do Application Insights
   - Verificar se o erro Ã© `401` do gateway de pagamento, nÃ£o um problema interno
   - Verificar logs de auditoria do Key Vault para confirmar que nÃ£o houve acesso nÃ£o autorizado

2. **Criar branch de hotfix (2 minutos)**
   ```bash
   git checkout main
   git pull
   git checkout -b hotfix/payment-gateway-key-rotation
   ```

3. **Atualizar segredo no Key Vault (5 minutos)**
   ```bash
   az keyvault secret set \
     --vault-name kv-payments-production \
     --name payment-gateway-api-key \
     --value "<new-key-from-provider>"
   ```

4. **Reiniciar aplicaÃ§Ã£o para buscar o novo segredo (3 minutos)**
   ```bash
   az containerapp revision restart \
     --name ca-payments-api \
     --resource-group rg-payments-production \
     --revision ca-payments-api--active
   ```

5. **Pipeline acelerado para validaÃ§Ã£o**
   - O PR de hotfix dispara um pipeline de CI acelerado (pular testes de integraÃ§Ã£o, executar apenas testes unitÃ¡rios e varredura de seguranÃ§a)
   - Aprovador Ãºnico necessÃ¡rio (lÃ­der de plantÃ£o)
   - Deploy direto para produÃ§Ã£o (pular staging para mudanÃ§as somente no Key Vault)

6. **PÃ³s-incidente (prÃ³ximo dia Ãºtil)**
   - Criar issue de revisÃ£o pÃ³s-incidente
   - Implementar monitoramento automatizado de expiraÃ§Ã£o de segredos do Key Vault
   - Adicionar alerta para segredo do Key Vault prÃ³ximo da expiraÃ§Ã£o (aviso de 30 dias)
   - Configurar webhook do gateway de pagamento para notificar sobre rotaÃ§Ã£o de chave

**ConfiguraÃ§Ã£o do pipeline para branches de hotfix:**

```yaml
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize]

jobs:
  determine-pipeline:
    runs-on: ubuntu-latest
    outputs:
      is-hotfix: ${{ steps.check.outputs.hotfix }}
    steps:
      - id: check
        run: |
          if [[ "${{ github.head_ref }}" == hotfix/* ]]; then
            echo "hotfix=true" >> $GITHUB_OUTPUT
          else
            echo "hotfix=false" >> $GITHUB_OUTPUT
          fi

  expedited-ci:
    needs: determine-pipeline
    if: needs.determine-pipeline.outputs.is-hotfix == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: dotnet build
      - run: dotnet test tests/Contoso.Payments.Api.Tests
      # Skip integration tests for expedited path
```

---

## Lista de verificaÃ§Ã£o de validaÃ§Ã£o

Antes de considerar este desafio completo, verifique:

- [ ] RepositÃ³rio tem regras de proteÃ§Ã£o de branch corretas aplicadas
- [ ] Arquivo CODEOWNERS encaminha revisÃµes para as equipes apropriadas
- [ ] Pipeline de CI aplica 80% de cobertura, lint e varredura de seguranÃ§a
- [ ] SDK Ã© publicado no GitHub Packages com versionamento adequado
- [ ] Pipeline de CD faz deploy no staging automaticamente e na produÃ§Ã£o com aprovaÃ§Ã£o
- [ ] Deployment blue-green estÃ¡ configurado com validaÃ§Ã£o canary
- [ ] Nenhum segredo existe no repositÃ³rio ou variÃ¡veis de pipeline (somente OIDC + Key Vault)
- [ ] Application Insights estÃ¡ configurado com scrubbing de dados PCI
- [ ] AnotaÃ§Ãµes de deployment aparecem na timeline do Application Insights
- [ ] Alerta de pico de erros estÃ¡ configurado e testado
- [ ] Cache do pipeline reduz o tempo de CI para menos de 5 minutos
- [ ] MÃ©tricas DORA sÃ£o calculadas e reportadas semanalmente
- [ ] Caminho de hotfix estÃ¡ disponÃ­vel com CI acelerado

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A equipe quer garantir que todo deployment em produÃ§Ã£o possa ser rastreado atÃ© um work item aprovado. Qual combinaÃ§Ã£o de configuraÃ§Ãµes alcanÃ§a isso?",
    options: [
      "Exigir commits assinados e regras de proteÃ§Ã£o de branch",
      "Exigir issues vinculadas em PRs, polÃ­tica de squash merge e linting de mensagem de commit",
      "Habilitar log de auditoria do GitHub e exigir revisÃµes de PR",
      "Configurar gates de deployment com consulta de work item"
    ],
    correctIndex: 1,
    explanation: "Exigir issues vinculadas garante rastreabilidade atÃ© work items. Squash merge cria um mapeamento limpo 1:1 entre PRs e commits. Linting de mensagem de commit aplica o formato Refs: #issue."
  },
  {
    question: "Um desenvolvedor acidentalmente faz push de um commit contendo uma chave de API de teste para uma feature branch. A chave Ã© detectada pelo GitHub secret scanning push protection. O que acontece?",
    options: [
      "O push Ã© bloqueado e o desenvolvedor deve remover o segredo antes de fazer push novamente",
      "O push Ã© bem-sucedido mas um alerta Ã© criado para a equipe de seguranÃ§a",
      "O push Ã© bloqueado e o repositÃ³rio Ã© automaticamente arquivado",
      "O push Ã© bem-sucedido e o segredo Ã© automaticamente rotacionado"
    ],
    correctIndex: 0,
    explanation: "Push protection bloqueia o push no nÃ­vel do git. O desenvolvedor deve remover o segredo do histÃ³rico de commits (usando git filter-branch ou git rebase) antes que o push seja bem-sucedido. Ele tambÃ©m pode solicitar um bypass com justificativa."
  },
  {
    question: "O pipeline de CD usa deployment blue-green com validaÃ§Ã£o canary. Durante a fase canary, a nova revisÃ£o recebe 10% do trÃ¡fego. A taxa de erros na nova revisÃ£o excede o threshold. O que deve acontecer automaticamente?",
    options: [
      "Reverter todo o deployment e acionar o engenheiro de plantÃ£o",
      "Rotear todo o trÃ¡fego de volta para a revisÃ£o anterior, desativar a revisÃ£o que falhou e criar uma issue de incidente",
      "Aumentar a porcentagem canary para 50% para mais dados antes de decidir",
      "Parar o pipeline e aguardar intervenÃ§Ã£o manual"
    ],
    correctIndex: 1,
    explanation: "Rollback automatizado roteia o trÃ¡fego para a revisÃ£o conhecida como boa, prevenindo impacto ao usuÃ¡rio. Desativar a revisÃ£o que falhou previne roteamento acidental de trÃ¡fego. Criar uma issue de incidente garante que a equipe investigue a falha."
  },
  {
    question: "O pipeline autentica no Azure usando workload identity federation (OIDC). Qual Ã© a principal vantagem de seguranÃ§a sobre usar um segredo de service principal armazenado no GitHub Secrets?",
    options: [
      "OIDC Ã© mais rÃ¡pido que autenticaÃ§Ã£o baseada em segredo",
      "NÃ£o existem credenciais de longa duraÃ§Ã£o que possam ser vazadas ou que precisem de rotaÃ§Ã£o",
      "OIDC fornece permissÃµes mais granulares que service principals",
      "OIDC elimina a necessidade de Azure RBAC"
    ],
    correctIndex: 1,
    explanation: "Workload identity federation usa tokens de curta duraÃ§Ã£o emitidos pelo provedor OIDC do GitHub. NÃ£o hÃ¡ segredo armazenado para vazar, rotacionar ou expirar. A credencial federada Ã© limitada a um repositÃ³rio, branch e ambiente especÃ­ficos."
  },
  {
    question: "O Application Insights mostra um pico de erros 500 apÃ³s um deployment. A anotaÃ§Ã£o de deployment Ã© visÃ­vel na timeline. Qual consulta KQL ajuda a identificar a causa raiz?",
    options: [
      "'traces | where timestamp > ago(1h) | summarize count() by message'",
      "'exceptions | where timestamp > deploymentTime | summarize count() by type, outerMessage | top 10 by count_'",
      "'requests | where resultCode == \"500\" | project url, duration'",
      "'dependencies | where success == false | summarize count() by target'"
    ],
    correctIndex: 1,
    explanation: "Consultar exceÃ§Ãµes agrupadas por tipo e mensagem imediatamente apÃ³s o timestamp do deployment revela os tipos de erro especÃ­ficos introduzidos pelo novo cÃ³digo. Isso identifica a causa raiz ao invÃ©s de apenas mostrar sintomas."
  },
  {
    question: "Um auditor PCI-DSS pede evidÃªncias de que todas as mudanÃ§as em produÃ§Ã£o sÃ£o autorizadas, testadas e rastreÃ¡veis. Qual combinaÃ§Ã£o de artefatos satisfaz esse requisito?",
    options: [
      "HistÃ³rico de commits do Git e logs de pipeline",
      "Log de auditoria de proteÃ§Ã£o de branch, registros de aprovaÃ§Ã£o de PR, resultados de testes de CI, logs de deployment com work items vinculados e auditoria de acesso ao Key Vault",
      "Logs de requisiÃ§Ãµes do Application Insights e Azure Activity Log",
      "HistÃ³rico de execuÃ§Ã£o de workflows do GitHub Actions e alertas do Dependabot"
    ],
    correctIndex: 1,
    explanation: "PCI-DSS requer evidÃªncias de controle de mudanÃ§as (proteÃ§Ã£o de branch + aprovaÃ§Ãµes de PR), testes (resultados de CI), autorizaÃ§Ã£o (work items vinculados), trilha de auditoria de deployment (logs de deployment) e controle de acesso (auditoria do Key Vault). Esta combinaÃ§Ã£o fornece rastreabilidade de ponta a ponta do requisito Ã  produÃ§Ã£o."
  }
]} />
