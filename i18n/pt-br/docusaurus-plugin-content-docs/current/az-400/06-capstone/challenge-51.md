---
sidebar_position: 1
title: "Desafio 51: Capstone entre domínios"
sidebar_label: "Desafio 51: Capstone entre domínios"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 51: Ciclo de vida DevOps de ponta a ponta

:::info Plataforma: comparação
Este capstone integra GitHub e Azure DevOps em todos os domínios do exame.
:::

## Habilidades do exame abordadas

Este desafio testa habilidades de todos os cinco domínios do exame AZ-400:
- Domínio 1: Processos e comunicações
- Domínio 2: Estratégia de controle de código-fonte
- Domínio 3: Pipelines de build e release
- Domínio 4: Segurança e conformidade
- Domínio 5: Estratégia de instrumentação

## Cenário

A Contoso está lançando o "Contoso Payments" -- um novo microsserviço de processamento de pagamentos que lida com transações de cartão de crédito. O serviço deve processar pagamentos via uma REST API, integrar-se com gateways de pagamento externos e armazenar registros de transações no Azure SQL Database.

Devido aos requisitos de conformidade PCI-DSS, cada aspecto do ciclo de vida DevOps deve ser adequadamente protegido, monitorado e auditável. Nenhum segredo pode existir no controle de código-fonte, todos os deployments devem ser rastreáveis até work items aprovados, e o ambiente de produção deve ter monitoramento contínuo com alertas automatizados.

Sua equipe consiste em quatro desenvolvedores, um engenheiro de QA e um SRE. Você é o engenheiro DevOps responsável por projetar e implementar todo o pipeline de entrega, desde a criação do repositório até o monitoramento em produção.

**Tempo estimado:** 60-90 minutos

---

## Parte 1: Configuração do controle de código-fonte

### 1.1 Estrutura do repositório

Crie um repositório GitHub `contoso-payments` com a seguinte estrutura:

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

### 1.2 Estratégia de branches

Implemente um modelo de desenvolvimento trunk-based com feature branches de curta duração:

| Branch | Propósito | Proteção |
|--------|-----------|----------|
| `main` | Código pronto para produção | Requer PR, 2 revisores, CI aprovado, sem force push |
| `release/*` | Estabilização de release | Requer PR, 1 revisor, CI aprovado |
| `feature/*` | Trabalho de desenvolvimento | Sem push direto para main |
| `hotfix/*` | Correções de emergência | Requer 1 revisor, CI acelerado |

### 1.3 Configuração do CODEOWNERS

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

### 1.4 Regras de proteção de branch

Configure o seguinte para `main`:

- Exigir revisões de pull request (mínimo 2)
- Descartar revisões obsoletas em novos pushes
- Exigir revisão dos CODEOWNERS
- Exigir verificações de status: `build`, `test`, `security-scan`, `lint`
- Exigir que branches estejam atualizados antes do merge
- Exigir commits assinados
- Restringir quem pode fazer push (apenas líderes de equipe)
- Exigir histórico linear (apenas squash merge)

---

## Parte 2: Rastreamento de trabalho e rastreabilidade

### 2.1 Quadro do GitHub Projects

Crie um quadro do GitHub Projects com as seguintes colunas:

| Coluna | Automação |
|--------|-----------|
| Backlog | Novas issues chegam aqui |
| Sprint Ready | Triados e estimados manualmente |
| In Progress | Move automaticamente quando branch criada ou PR aberto |
| In Review | Move automaticamente quando PR pronto para revisão |
| Done | Move automaticamente quando PR é feito merge |

### 2.2 Templates de issues

Crie templates de issues para:

- **Feature request** -- inclui campos para critérios de aceitação, serviços afetados e avaliação de impacto PCI-DSS
- **Bug report** -- inclui passos de reprodução, classificação de severidade e ambiente afetado
- **Security finding** -- visibilidade restrita, inclui pontuação CVSS e prazo de remediação

### 2.3 Rastreabilidade de commits

Aplique padrões de mensagem de commit usando uma verificação de commit-lint no CI:

```text
<type>(<scope>): <description>

[optional body]

Refs: #<issue-number>
```

Tipos válidos: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `security`

Cada commit para `main` (via squash merge) deve referenciar um work item. Configure uma GitHub Action que valide se a descrição do PR contém uma issue vinculada antes que o merge seja permitido.

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

### 3.2 Configuração do Dependabot

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

### 3.3 Verificações de status obrigatórias

Todas as seguintes verificações devem passar antes que um PR possa ser feito merge:

- `build` -- compilação bem-sucedida
- `lint` -- sem violações de formatação
- `security-scan` -- sem findings de alta/crítica severidade
- `coverage-gate` -- mínimo de 80% de cobertura de linhas
- `commit-lint` -- formato da mensagem de commit validado

---

## Parte 4: Gerenciamento de pacotes

### 4.1 Publicação do SDK compartilhado

O projeto `Contoso.Payments.Sdk` é um pacote NuGet compartilhado consumido por outros serviços da Contoso. Publique-o no GitHub Packages a cada merge para `main`.

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

### 4.2 Estratégia de versionamento de pacotes

- Feature branches: versões pré-release (ex.: `1.0.42-feature-payments.1`)
- Branch main: versões estáveis (ex.: `1.0.42`)
- Release branches: release candidates (ex.: `1.0.42-rc.1`)

### 4.3 Consumo de pacotes

Configure serviços downstream para consumir o SDK do GitHub Packages adicionando um `nuget.config`:

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

Crie `.github/workflows/deploy.yml` implementando os seguintes estágios:

```text
Build --> Staging (auto) --> Integration Tests --> Production (aprovação manual, blue-green)
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

### 5.2 Regras de proteção de ambiente

| Ambiente | Regras |
|----------|--------|
| staging | Sem aprovações, deploy a cada push para main |
| production | Requer 2 aprovações (de `@contoso/release-managers`), temporizador de espera de 5 minutos, restrito Ã  branch `main` |

### 5.3 Procedimento de rollback

Se o deployment em produção falhar na validação canary:

1. O tráfego é automaticamente roteado de volta para a revisão ativa anterior (100%)
2. A revisão green que falhou é desativada
3. Uma issue de incidente é automaticamente criada com detalhes do deployment
4. A equipe é notificada via webhook do Microsoft Teams

---

## Parte 6: Segurança

### 6.1 Workload identity federation (OIDC)

Configure credenciais federadas para eliminar segredos armazenados para autenticação no Azure:

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

### 6.2 Integração com Key Vault

Todos os segredos da aplicação devem vir do Azure Key Vault. Nenhum segredo em variáveis de ambiente, configurações de aplicação ou variáveis de pipeline.

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
- `sql-connection-string` -- conexão com o banco de dados (managed identity preferida, connection string como fallback)
- `encryption-key` -- chave de criptografia de dados de cartão (rotação automática a cada 90 dias)

### 6.3 Varredura e prevenção de segredos

- Habilitar GitHub secret scanning com push protection
- Configurar padrões de segredos personalizados para tokens específicos da Contoso (formato: `ctp_[a-zA-Z0-9]{32}`)
- Hook de pre-commit usando `gitleaks` para capturar segredos antes de chegarem ao remoto

### 6.4 Hardening de segurança do pipeline

- Fixar todas as GitHub Actions por SHA (não por tags): `uses: actions/checkout@<full-sha>`
- Usar `permissions` no nível do job com menor privilégio
- Sem self-hosted runners para deployments em produção
- Encaminhamento de log de auditoria para SIEM para todas as execuções de workflow

---

## Parte 7: Monitoramento e observabilidade

### 7.1 Integração com Application Insights

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

### 7.2 Anotações de deployment

Adicione marcadores de deployment ao Application Insights após cada deployment em produção:

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

Configuração do alerta:
- Severidade: 1 (Crítica)
- Frequência de avaliação: 5 minutos
- Grupo de ação: acionar SRE de plantão via PagerDuty, criar incidente no GitHub Issues, postar no canal do Teams

### 7.4 Dashboard

Crie um Azure Dashboard com os seguintes tiles:

| Tile | Métrica | Visualização |
|------|---------|--------------|
| Taxa de requisições | requisições por segundo | Gráfico temporal |
| Taxa de erros | 5xx / total de requisições | Gráfico temporal com linha de threshold |
| Tempo de resposta P95 | percentil de duração | Gráfico temporal |
| Saúde de dependências | latência do gateway de pagamento externo | Gráfico temporal |
| Revisões ativas | divisão de tráfego por revisão do container app | Gráfico de pizza |
| Frequência de deployment | deployments por semana | Gráfico de barras (DORA) |

---

## Parte 8: Operações de pipeline

### 8.1 Cache do pipeline

Otimize o tempo de execução do pipeline de CI com caching:

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

Meta: pipeline de CI completa em menos de 5 minutos para verificações de PR.

### 8.2 Política de retenção

| Artefato | Retenção |
|----------|----------|
| Logs de build do CI | 30 dias |
| Imagens de container (não-produção) | 14 dias |
| Imagens de container (produção) | 1 ano |
| Resultados de testes | 90 dias |
| Relatórios de varredura de segurança | 2 anos (requisito PCI-DSS) |
| Logs de deployment | 1 ano |

Configure a retenção do Azure Container Registry:

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

### 8.3 Rastreamento de métricas DORA

Rastreie as quatro métricas DORA usando dados de workflows do GitHub Actions e Application Insights:

| Métrica | Meta | Medição |
|---------|------|---------|
| Frequência de deployment | Diária | Contagem de deployments em produção por dia |
| Lead time para mudanças | Menos de 1 dia | Tempo do primeiro commit até o deployment em produção |
| Tempo médio de recuperação (MTTR) | Menos de 1 hora | Tempo da criação do incidente até a resolução |
| Taxa de falha de mudanças | Menos de 5% | Deployments em produção causando incidentes / total de deployments |

Implemente um workflow agendado que calcula e reporta essas métricas semanalmente:

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

## Exercícios de quebra e conserto

### Cenário 1: Erros 500 em produção após deployment

**Situação:** O pipeline de deploy foi concluído com sucesso. Todos os testes de integração passaram no staging. No entanto, dentro de 10 minutos do deployment em produção, o Application Insights mostra um pico de erros 500 no endpoint `POST /api/payments`.

**Passos de investigação:**

1. Verificar o alerta de pico de erros do Application Insights que disparou
2. Examinar a telemetria de exceções -- você encontra: `SqlException: Invalid column name 'PaymentMethodToken'`
3. Revisar o diff do deployment -- uma nova coluna foi adicionada Ã  tabela `Payments` no código, mas a migration do Entity Framework nunca foi aplicada ao banco de dados de produção
4. O ambiente de staging tinha a migration aplicada manualmente durante o desenvolvimento, mas não existe um passo automatizado de migration no pipeline de CD


<details>
<summary>Mostrar solução</summary>

**Causa raiz:** O pipeline de CD faz deploy do código da aplicação, mas não executa migrations de banco de dados. O ambiente de staging tinha a migration aplicada fora do processo, então os testes de integração passaram.


**Correção:**

Adicione um passo de migration ao pipeline de deployment que executa antes da atualização da aplicação:

```yaml
      - name: Run database migrations
        run: |
          dotnet tool install --global dotnet-ef
          dotnet ef database update \
            --project src/Contoso.Payments.Infrastructure \
            --startup-project src/Contoso.Payments.Api \
            --connection "${{ secrets.SQL_CONNECTION_STRING }}"
```

**Prevenção:** Adicione uma verificação no CI que compara migrations pendentes contra o schema do banco de dados alvo e falha se as migrations não estiverem incluídas no deployment.


</details>

### Cenário 2: Falso positivo de varredura de segurança bloqueando deployment

**Situação:** Um desenvolvedor submete um PR que adiciona validação de entrada para números de cartão de crédito. O CodeQL sinaliza o código como um possível finding de "Cleartext storage of sensitive information" porque o método de validação aceita um parâmetro de número de cartão.

**O código sinalizado:**

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

**Passos de investigação:**

1. Revisar o alerta do CodeQL na aba Security
2. Confirmar que o método realiza apenas validação -- sem logging, sem persistência, sem chamadas de rede
3. O nome da variável `cardNumber` dispara o pattern match, mas os dados nunca são armazenados


<details>
<summary>Mostrar solução</summary>

**Correção:**

Crie uma configuração do CodeQL para suprimir este falso positivo específico:

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

Para o método específico, adicione um comentário de supressão:

```csharp
[System.Diagnostics.CodeAnalysis.SuppressMessage(
    "Security", "CS0001:CleartextStorage",
    Justification = "Validation only - card number is not stored or logged")]
public static bool IsValidCardNumber(string cardNumber)
```

**Processo:** Documente todas as exceções de varredura de segurança em um arquivo `SECURITY_EXCEPTIONS.md` que é revisado trimestralmente pela equipe de segurança. Cada exceção deve incluir a justificativa, o revisor e a data de expiração.


</details>

### Cenário 3: Hotfix de emergência para falhas de pagamento em produção

**Situação:** Ã€s 2:00 da manhã, o SRE de plantão recebe um alerta do PagerDuty: o processamento de pagamentos está falhando para todas as transações. O Application Insights mostra que o gateway de pagamento externo está retornando `401 Unauthorized`. A investigação revela que a chave da API do gateway foi rotacionada pelo provedor, mas o segredo no Key Vault não foi atualizado.

**Resposta necessária:**

1. **Triagem imediata (5 minutos)**
   - Confirmar o problema via rastreamento de dependências do Application Insights
   - Verificar se o erro é `401` do gateway de pagamento, não um problema interno
   - Verificar logs de auditoria do Key Vault para confirmar que não houve acesso não autorizado

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

4. **Reiniciar aplicação para buscar o novo segredo (3 minutos)**
   ```bash
   az containerapp revision restart \
     --name ca-payments-api \
     --resource-group rg-payments-production \
     --revision ca-payments-api--active
   ```

5. **Pipeline acelerado para validação**
   - O PR de hotfix dispara um pipeline de CI acelerado (pular testes de integração, executar apenas testes unitários e varredura de segurança)
   - Aprovador único necessário (líder de plantão)
   - Deploy direto para produção (pular staging para mudanças somente no Key Vault)

6. **Pós-incidente (próximo dia útil)**
   - Criar issue de revisão pós-incidente
   - Implementar monitoramento automatizado de expiração de segredos do Key Vault
   - Adicionar alerta para segredo do Key Vault próximo da expiração (aviso de 30 dias)
   - Configurar webhook do gateway de pagamento para notificar sobre rotação de chave

**Configuração do pipeline para branches de hotfix:**

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

## Lista de verificação de validação

Antes de considerar este desafio completo, verifique:

- [ ] Repositório tem regras de proteção de branch corretas aplicadas
- [ ] Arquivo CODEOWNERS encaminha revisões para as equipes apropriadas
- [ ] Pipeline de CI aplica 80% de cobertura, lint e varredura de segurança
- [ ] SDK é publicado no GitHub Packages com versionamento adequado
- [ ] Pipeline de CD faz deploy no staging automaticamente e na produção com aprovação
- [ ] Deployment blue-green está configurado com validação canary
- [ ] Nenhum segredo existe no repositório ou variáveis de pipeline (somente OIDC + Key Vault)
- [ ] Application Insights está configurado com scrubbing de dados PCI
- [ ] Anotações de deployment aparecem na timeline do Application Insights
- [ ] Alerta de pico de erros está configurado e testado
- [ ] Cache do pipeline reduz o tempo de CI para menos de 5 minutos
- [ ] Métricas DORA são calculadas e reportadas semanalmente
- [ ] Caminho de hotfix está disponível com CI acelerado

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A equipe quer garantir que todo deployment em produção possa ser rastreado até um work item aprovado. Qual combinação de configurações alcança isso?",
    options: [
      "Exigir commits assinados e regras de proteção de branch",
      "Exigir issues vinculadas em PRs, política de squash merge e linting de mensagem de commit",
      "Habilitar log de auditoria do GitHub e exigir revisões de PR",
      "Configurar gates de deployment com consulta de work item"
    ],
    correctIndex: 1,
    explanation: "Exigir issues vinculadas garante rastreabilidade até work items. Squash merge cria um mapeamento limpo 1:1 entre PRs e commits. Linting de mensagem de commit aplica o formato Refs: #issue."
  },
  {
    question: "Um desenvolvedor acidentalmente faz push de um commit contendo uma chave de API de teste para uma feature branch. A chave é detectada pelo GitHub secret scanning push protection. O que acontece?",
    options: [
      "O push é bloqueado e o desenvolvedor deve remover o segredo antes de fazer push novamente",
      "O push é bem-sucedido mas um alerta é criado para a equipe de segurança",
      "O push é bloqueado e o repositório é automaticamente arquivado",
      "O push é bem-sucedido e o segredo é automaticamente rotacionado"
    ],
    correctIndex: 0,
    explanation: "Push protection bloqueia o push no nível do git. O desenvolvedor deve remover o segredo do histórico de commits (usando git filter-branch ou git rebase) antes que o push seja bem-sucedido. Ele também pode solicitar um bypass com justificativa."
  },
  {
    question: "O pipeline de CD usa deployment blue-green com validação canary. Durante a fase canary, a nova revisão recebe 10% do tráfego. A taxa de erros na nova revisão excede o threshold. O que deve acontecer automaticamente?",
    options: [
      "Reverter todo o deployment e acionar o engenheiro de plantão",
      "Rotear todo o tráfego de volta para a revisão anterior, desativar a revisão que falhou e criar uma issue de incidente",
      "Aumentar a porcentagem canary para 50% para mais dados antes de decidir",
      "Parar o pipeline e aguardar intervenção manual"
    ],
    correctIndex: 1,
    explanation: "Rollback automatizado roteia o tráfego para a revisão conhecida como boa, prevenindo impacto ao usuário. Desativar a revisão que falhou previne roteamento acidental de tráfego. Criar uma issue de incidente garante que a equipe investigue a falha."
  },
  {
    question: "O pipeline autentica no Azure usando workload identity federation (OIDC). Qual é a principal vantagem de segurança sobre usar um segredo de service principal armazenado no GitHub Secrets?",
    options: [
      "OIDC é mais rápido que autenticação baseada em segredo",
      "Não existem credenciais de longa duração que possam ser vazadas ou que precisem de rotação",
      "OIDC fornece permissões mais granulares que service principals",
      "OIDC elimina a necessidade de Azure RBAC"
    ],
    correctIndex: 1,
    explanation: "Workload identity federation usa tokens de curta duração emitidos pelo provedor OIDC do GitHub. Não há segredo armazenado para vazar, rotacionar ou expirar. A credencial federada é limitada a um repositório, branch e ambiente específicos."
  },
  {
    question: "O Application Insights mostra um pico de erros 500 após um deployment. A anotação de deployment é visível na timeline. Qual consulta KQL ajuda a identificar a causa raiz?",
    options: [
      "'traces | where timestamp > ago(1h) | summarize count() by message'",
      "'exceptions | where timestamp > deploymentTime | summarize count() by type, outerMessage | top 10 by count_'",
      "'requests | where resultCode == \"500\" | project url, duration'",
      "'dependencies | where success == false | summarize count() by target'"
    ],
    correctIndex: 1,
    explanation: "Consultar exceções agrupadas por tipo e mensagem imediatamente após o timestamp do deployment revela os tipos de erro específicos introduzidos pelo novo código. Isso identifica a causa raiz ao invés de apenas mostrar sintomas."
  },
  {
    question: "Um auditor PCI-DSS pede evidências de que todas as mudanças em produção são autorizadas, testadas e rastreáveis. Qual combinação de artefatos satisfaz esse requisito?",
    options: [
      "Histórico de commits do Git e logs de pipeline",
      "Log de auditoria de proteção de branch, registros de aprovação de PR, resultados de testes de CI, logs de deployment com work items vinculados e auditoria de acesso ao Key Vault",
      "Logs de requisições do Application Insights e Azure Activity Log",
      "Histórico de execução de workflows do GitHub Actions e alertas do Dependabot"
    ],
    correctIndex: 1,
    explanation: "PCI-DSS requer evidências de controle de mudanças (proteção de branch + aprovações de PR), testes (resultados de CI), autorização (work items vinculados), trilha de auditoria de deployment (logs de deployment) e controle de acesso (auditoria do Key Vault). Esta combinação fornece rastreabilidade de ponta a ponta do requisito Ã  produção."
  }
]} />
