---
sidebar_position: 5
title: "Desafio 38: Capstone de pipeline ponta a ponta"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 38: Capstone de pipeline ponta a ponta

:::info Plataforma: comparação
Este é o desafio capstone do Domínio 3. Ele integra gerenciamento de pacotes, testes, fundamentos de pipeline, estratégias de deploy, IaC e operações em um único exercício abrangente. Tempo estimado: 60-90 minutos.
:::

## Habilidades do exame mapeadas

Este desafio cobre todas as habilidades do Domínio 3 (Projetar e Implementar Pipelines):

- Configurar e gerenciar feeds de pacotes (Desafios 13-15)
- Projetar e implementar validação de qualidade em pipelines (Desafios 16-18)
- Projetar e implementar pipelines usando GitHub Actions e Azure Pipelines (Desafios 19-24)
- Projetar e implementar deploys com exposição progressiva e rollback (Desafios 25-30)
- Definir uma estratégia de IaC com testes automatizados e deploy (Desafios 31-33)
- Otimizar saúde, custo e desempenho do pipeline (Desafios 34-37)

## Cenário

A Contoso Ltd está lançando um novo microsserviço: o **Notification Service**. Esta API Node.js gerencia notificações por e-mail, SMS e push para todas as aplicações da Contoso. Você é o engenheiro DevOps responsável por construir o pipeline CI/CD completo do zero.

**Requisitos:**

- Código-fonte: repositório GitHub com API Node.js 20 Express
- Pacote: O serviço depende de um pacote npm compartilhado `@contoso/notification-sdk`
- Gates de qualidade: Lint, testes unitários (cobertura mínima de 80%), testes de integração, varredura de segurança
- Container: Imagem Docker enviada ao Azure Container Registry
- Deploy: Staging (automático), Produção (aprovação manual com slot swap blue-green)
- Infraestrutura: Implantada via Bicep (IaC validada no pipeline)
- Observabilidade: Smoke tests, anotação de deploy no Application Insights
- Operações: Cache, jobs paralelos, retenção de artefatos de 7 dias

**Estrutura do repositório:**

```
contoso-notification-service/
  src/
    index.ts
    routes/
      notifications.ts
      health.ts
    services/
      email.service.ts
      sms.service.ts
      push.service.ts
    middleware/
      auth.ts
      validation.ts
  tests/
    unit/
      services/
        email.service.test.ts
        sms.service.test.ts
      routes/
        notifications.test.ts
    integration/
      api.test.ts
  infrastructure/
    main.bicep
    modules/
      app-service.bicep
      container-registry.bicep
      app-insights.bicep
    environments/
      staging.bicepparam
      production.bicepparam
  Dockerfile
  package.json
  tsconfig.json
  .github/
    workflows/
      ci-cd.yml
    actions/
      setup-project/
        action.yml
```

## Tarefa 1: Configurar gerenciamento de pacotes

Configure a dependência do pacote npm compartilhado com autenticação adequada:

```json
// package.json
{
  "name": "@contoso/notification-service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "lint": "eslint src/ --ext .ts",
    "lint:fix": "eslint src/ --ext .ts --fix",
    "test": "jest --coverage",
    "test:unit": "jest --testPathPattern=tests/unit --coverage",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:ci": "jest --ci --coverage --coverageReporters=json-summary --coverageReporters=lcov"
  },
  "dependencies": {
    "@contoso/notification-sdk": "^2.3.0",
    "express": "^4.18.2",
    "applicationinsights": "^2.9.0",
    "nodemailer": "^6.9.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.10.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.0",
    "supertest": "^6.3.0"
  }
}
```

Configure o npm para usar o GitHub Packages para o escopo privado da Contoso:

```yaml
# .npmrc - Configure @contoso scope to use GitHub Packages
@contoso:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

No pipeline, autentique-se no registro de pacotes:

```yaml
      - name: Setup Node.js with registry
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          registry-url: "https://npm.pkg.github.com"
          scope: "@contoso"

      - name: Install dependencies
        run: npm ci
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Tarefa 2: Criar a composite action para configuração do projeto

Crie `.github/actions/setup-project/action.yml`:

```yaml
name: "Setup Notification Service"
description: "Installs Node.js, authenticates to GitHub Packages, and installs dependencies"

inputs:
  node-version:
    description: "Node.js version"
    required: false
    default: "20"

outputs:
  cache-hit:
    description: "Whether the npm cache was hit"
    value: ${{ steps.cache.outputs.cache-hit }}

runs:
  using: "composite"
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        registry-url: "https://npm.pkg.github.com"
        scope: "@contoso"

    - name: Cache node_modules
      id: cache
      uses: actions/cache@v4
      with:
        path: node_modules
        key: ${{ runner.os }}-modules-${{ hashFiles('package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-modules-

    - name: Install dependencies
      if: steps.cache.outputs.cache-hit != 'true'
      shell: bash
      run: npm ci
      env:
        NODE_AUTH_TOKEN: ${{ github.token }}
```

## Tarefa 3: Implementar o workflow CI/CD completo

Crie `.github/workflows/ci-cd.yml`:

```yaml
name: Notification Service CI/CD

on:
  push:
    branches: [main]
    paths-ignore:
      - "**/*.md"
      - "docs/**"
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      skip_deploy:
        description: "Skip deployment (build and test only)"
        type: boolean
        default: false

permissions:
  id-token: write
  contents: read
  packages: write
  pull-requests: write
  checks: write

env:
  NODE_VERSION: "20"
  REGISTRY: contosonotifacr.azurecr.io
  IMAGE_NAME: contoso-notification-service
  RESOURCE_GROUP: rg-contoso-notifications

jobs:
  # ============================================================
  # ESTÁGIO 1: Gates de qualidade (lint + varredura de segurança)
  # ============================================================
  lint:
    name: Lint and format check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project
      - run: npm run lint
      - run: npx tsc --noEmit  # Type checking

  security-scan:
    name: Security scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project

      - name: Run npm audit
        run: npm audit --audit-level=high

      - name: Run Trivy vulnerability scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          scan-ref: "."
          severity: "HIGH,CRITICAL"
          exit-code: "1"

  # ============================================================
  # ESTÁGIO 2: Testes com gate de cobertura (shards paralelos)
  # ============================================================
  test-unit:
    name: Unit tests (shard ${{ matrix.shard }})
    runs-on: ubuntu-latest
    needs: lint
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2]
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project

      - name: Run unit tests
        run: |
          npx jest --ci --shard=${{ matrix.shard }}/2 \
            --testPathPattern=tests/unit \
            --coverage --coverageReporters=json \
            --forceExit
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-unit-${{ matrix.shard }}
          path: coverage/coverage-final.json
          retention-days: 7

  test-integration:
    name: Integration tests
    runs-on: ubuntu-latest
    needs: lint
    services:
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
        options: --health-cmd "redis-cli ping" --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project

      - name: Run integration tests
        run: npx jest --ci --testPathPattern=tests/integration --forceExit
        env:
          REDIS_URL: redis://localhost:6379
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  coverage-gate:
    name: Coverage gate (80% minimum)
    runs-on: ubuntu-latest
    needs: test-unit
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project

      - name: Download coverage shards
        uses: actions/download-artifact@v4
        with:
          pattern: coverage-unit-*
          merge-multiple: true
          path: coverage-parts/

      - name: Merge and check coverage
        run: |
          npx nyc merge coverage-parts/ .nyc_output/out.json
          npx nyc report --reporter=text-summary --reporter=json-summary

          # Enforce 80% coverage gate
          COVERAGE=$(node -p "require('./coverage/coverage-summary.json').total.lines.pct")
          echo "Line coverage: ${COVERAGE}%"

          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "::error::Coverage ${COVERAGE}% is below the 80% threshold"
            exit 1
          fi
          echo "Coverage gate passed: ${COVERAGE}%"

      - name: Post coverage to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const summary = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
            const total = summary.total;
            const body = `### Coverage Report
            | Metric | Coverage |
            |--------|----------|
            | Lines | ${total.lines.pct}% |
            | Statements | ${total.statements.pct}% |
            | Functions | ${total.functions.pct}% |
            | Branches | ${total.branches.pct}% |`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

  # ============================================================
  # ESTÁGIO 3: Construir imagem de container e enviar ao ACR
  # ============================================================
  build-image:
    name: Build and push container image
    runs-on: ubuntu-latest
    needs: [coverage-gate, test-integration, security-scan]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}
      image_version: ${{ steps.version.outputs.version }}
    steps:
      - uses: actions/checkout@v4

      - name: Get version
        id: version
        run: |
          VERSION=$(node -p "require('./package.json').version")
          SHA_SHORT=$(git rev-parse --short HEAD)
          echo "version=${VERSION}-${SHA_SHORT}" >> $GITHUB_OUTPUT

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Azure Container Registry
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - run: az acr login --name contosonotifacr

      - name: Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=${{ steps.version.outputs.version }}
            type=sha,prefix=
            type=raw,value=latest

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NODE_VERSION=${{ env.NODE_VERSION }}

  # ============================================================
  # ESTÁGIO 4: Validar e implantar infraestrutura (IaC)
  # ============================================================
  validate-infra:
    name: Validate infrastructure
    runs-on: ubuntu-latest
    needs: build-image
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Lint Bicep templates
        run: az bicep build --file infrastructure/main.bicep --stdout > /dev/null

      - name: Validate deployment
        run: |
          az deployment group validate \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --template-file infrastructure/main.bicep \
            --parameters infrastructure/environments/staging.bicepparam \
            --parameters imageTag=${{ needs.build-image.outputs.image_version }}

      - name: What-if analysis
        run: |
          az deployment group what-if \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --template-file infrastructure/main.bicep \
            --parameters infrastructure/environments/staging.bicepparam \
            --parameters imageTag=${{ needs.build-image.outputs.image_version }}

  # ============================================================
  # ESTÁGIO 5: Deploy para staging (automático)
  # ============================================================
  deploy-staging:
    name: Deploy to staging
    runs-on: ubuntu-latest
    needs: [build-image, validate-infra]
    if: ${{ !inputs.skip_deploy }}
    environment:
      name: staging
      url: https://app-contoso-notif-staging.azurewebsites.net
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy infrastructure
        run: |
          az deployment group create \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --template-file infrastructure/main.bicep \
            --parameters infrastructure/environments/staging.bicepparam \
            --parameters imageTag=${{ needs.build-image.outputs.image_version }} \
            --name "staging-$(date +%Y%m%d-%H%M%S)"

      - name: Deploy container to App Service
        run: |
          az webapp config container set \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --name app-contoso-notif-staging \
            --container-image-name "${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ needs.build-image.outputs.image_version }}" \
            --container-registry-url "https://${{ env.REGISTRY }}"

      - name: Wait for deployment
        run: |
          az webapp restart \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --name app-contoso-notif-staging
          sleep 30

      - name: Run smoke tests
        run: |
          for i in $(seq 1 12); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
              https://app-contoso-notif-staging.azurewebsites.net/health)
            if [ "$STATUS" = "200" ]; then
              echo "Smoke test passed - staging is healthy"
              exit 0
            fi
            echo "Attempt $i: Got status $STATUS, waiting..."
            sleep 10
          done
          echo "::error::Smoke tests failed after 2 minutes"
          exit 1

      - name: Annotate Application Insights (staging)
        run: |
          az rest --method PUT \
            --url "https://management.azure.com/subscriptions/${{ secrets.AZURE_SUBSCRIPTION_ID }}/resourceGroups/${{ env.RESOURCE_GROUP }}/providers/Microsoft.Insights/components/ai-contoso-notif-staging/Annotations?api-version=2015-05-01" \
            --body '{
              "AnnotationName": "Deployment",
              "Category": "Deployment",
              "EventTime": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
              "Id": "'$(uuidgen)'",
              "Properties": "{\"DeploymentVersion\":\"${{ needs.build-image.outputs.image_version }}\",\"TriggeredBy\":\"${{ github.actor }}\",\"CommitSha\":\"${{ github.sha }}\"}"
            }'

  # ============================================================
  # ESTÁGIO 6: Deploy para produção (aprovação manual, blue-green)
  # ============================================================
  deploy-production:
    name: Deploy to production (blue-green)
    runs-on: ubuntu-latest
    needs: [deploy-staging, build-image]
    if: ${{ !inputs.skip_deploy }}
    environment:
      name: production
      url: https://app-contoso-notif.azurewebsites.net
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy infrastructure (production)
        run: |
          az deployment group create \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --template-file infrastructure/main.bicep \
            --parameters infrastructure/environments/production.bicepparam \
            --parameters imageTag=${{ needs.build-image.outputs.image_version }} \
            --name "prod-$(date +%Y%m%d-%H%M%S)"

      - name: Deploy to staging slot (blue-green)
        run: |
          az webapp config container set \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --name app-contoso-notif \
            --slot staging \
            --container-image-name "${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ needs.build-image.outputs.image_version }}" \
            --container-registry-url "https://${{ env.REGISTRY }}"

      - name: Warm up staging slot
        run: |
          az webapp restart \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --name app-contoso-notif \
            --slot staging
          sleep 30

          for i in $(seq 1 12); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
              https://app-contoso-notif-staging.azurewebsites.net/health)
            if [ "$STATUS" = "200" ]; then
              echo "Staging slot is healthy and warm"
              exit 0
            fi
            echo "Warming up... attempt $i (status: $STATUS)"
            sleep 10
          done
          echo "::error::Staging slot failed health check"
          exit 1

      - name: Swap slots (blue-green deployment)
        run: |
          az webapp deployment slot swap \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --name app-contoso-notif \
            --slot staging \
            --target-slot production

      - name: Verify production health
        run: |
          sleep 15
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            https://app-contoso-notif.azurewebsites.net/health)
          if [ "$STATUS" != "200" ]; then
            echo "::error::Production health check failed with status $STATUS"
            echo "Initiating rollback..."
            az webapp deployment slot swap \
              --resource-group ${{ env.RESOURCE_GROUP }} \
              --name app-contoso-notif \
              --slot staging \
              --target-slot production
            exit 1
          fi
          echo "Production deployment verified successfully"

      - name: Annotate Application Insights (production)
        run: |
          az rest --method PUT \
            --url "https://management.azure.com/subscriptions/${{ secrets.AZURE_SUBSCRIPTION_ID }}/resourceGroups/${{ env.RESOURCE_GROUP }}/providers/Microsoft.Insights/components/ai-contoso-notif/Annotations?api-version=2015-05-01" \
            --body '{
              "AnnotationName": "Production Deployment",
              "Category": "Deployment",
              "EventTime": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
              "Id": "'$(uuidgen)'",
              "Properties": "{\"Version\":\"${{ needs.build-image.outputs.image_version }}\",\"Actor\":\"${{ github.actor }}\",\"Commit\":\"${{ github.sha }}\",\"RunId\":\"${{ github.run_id }}\"}"
            }'

      - name: Create GitHub Release
        run: |
          gh release create "v${{ needs.build-image.outputs.image_version }}" \
            --title "v${{ needs.build-image.outputs.image_version }}" \
            --notes "Deployed to production by ${{ github.actor }}
            - Commit: ${{ github.sha }}
            - Image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ needs.build-image.outputs.image_version }}
            - Workflow run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Tarefa 4: Criar o Dockerfile

```dockerfile
# Dockerfile - Multi-stage optimized build
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
ARG NODE_AUTH_TOKEN
ENV NODE_AUTH_TOKEN=$NODE_AUTH_TOKEN
RUN npm ci --production && rm -f .npmrc

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc tsconfig.json ./
ARG NODE_AUTH_TOKEN
ENV NODE_AUTH_TOKEN=$NODE_AUTH_TOKEN
RUN npm ci && rm -f .npmrc
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
```

## Tarefa 5: Criar a infraestrutura (Bicep)

```bicep
// infrastructure/main.bicep
@description('Environment name')
@allowed(['staging', 'production'])
param environment string

@description('Container image tag to deploy')
param imageTag string

param location string = resourceGroup().location

var baseName = 'contoso-notif'
var envSuffix = environment == 'production' ? '' : '-${environment}'

module appInsights 'modules/app-insights.bicep' = {
  name: 'deploy-appinsights'
  params: {
    name: 'ai-${baseName}${envSuffix}'
    location: location
  }
}

module appService 'modules/app-service.bicep' = {
  name: 'deploy-appservice'
  params: {
    name: 'app-${baseName}${envSuffix}'
    location: location
    containerImage: '${acrName}.azurecr.io/contoso-notification-service:${imageTag}'
    appInsightsConnectionString: appInsights.outputs.connectionString
    enableStagingSlot: environment == 'production'
  }
}

var acrName = 'contosonotifacr'
```

```bicep
// infrastructure/modules/app-service.bicep
param name string
param location string
param containerImage string
param appInsightsConnectionString string
param enableStagingSlot bool = false

resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${name}'
  location: location
  sku: {
    name: 'P1v3'
    tier: 'PremiumV3'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource app 'Microsoft.Web/sites@2023-01-01' = {
  name: name
  location: location
  properties: {
    serverFarmId: plan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerImage}'
      alwaysOn: true
      healthCheckPath: '/health'
      appSettings: [
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
        { name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE', value: 'false' }
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://contosonotifacr.azurecr.io' }
      ]
    }
    httpsOnly: true
  }
  identity: {
    type: 'SystemAssigned'
  }
}

resource stagingSlot 'Microsoft.Web/sites/slots@2023-01-01' = if (enableStagingSlot) {
  parent: app
  name: 'staging'
  location: location
  properties: {
    serverFarmId: plan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerImage}'
      alwaysOn: true
      healthCheckPath: '/health'
    }
  }
}

output appUrl string = 'https://${app.properties.defaultHostName}'
```

## Tarefa 6: Configurar ambientes e aprovações

```bash
# Create GitHub environments with protection rules
gh api repos/{owner}/{repo}/environments/staging --method PUT \
  --field wait_timer=0 \
  --field deployment_branch_policy='{"protected_branches":true,"custom_branch_policies":false}'

gh api repos/{owner}/{repo}/environments/production --method PUT \
  --field wait_timer=0 \
  --field reviewers='[{"type":"User","id":12345}]' \
  --field deployment_branch_policy='{"protected_branches":true,"custom_branch_policies":false}'

# Configure secrets for each environment
gh secret set AZURE_CLIENT_ID --env staging --body "{staging-sp-client-id}"
gh secret set AZURE_CLIENT_ID --env production --body "{prod-sp-client-id}"

# Shared secrets at repository level
gh secret set AZURE_TENANT_ID --body "{tenant-id}"
gh secret set AZURE_SUBSCRIPTION_ID --body "{subscription-id}"
```

## Tarefa 7: Verificar operações (retenção, métricas)

Confirme que os aspectos operacionais estão implementados:

```yaml
# Retention is configured via retention-days on artifacts (Task 3 uses 7 days)
# Caching is configured via the composite action and Docker cache-from/cache-to
# Parallel execution is configured via test sharding (matrix strategy)

# Add pipeline health monitoring (from Challenge 34)
  pipeline-metrics:
    name: Record pipeline metrics
    runs-on: ubuntu-latest
    needs: [deploy-production]
    if: always()
    steps:
      - name: Record deployment metrics
        uses: actions/github-script@v7
        with:
          script: |
            const duration = (new Date() - new Date('${{ github.event.head_commit.timestamp }}')) / 1000 / 60;
            console.log(`Total pipeline duration: ${duration.toFixed(1)} minutes`);
            console.log(`Deployment status: ${{ needs.deploy-production.result }}`);
```

## Exercícios de quebra e conserto

### Exercício 1: Corrigir o gate de cobertura com falha

O pipeline falha no gate de cobertura com "80% exigido, obteve 78.5%". Um desenvolvedor sugere diminuir o threshold. Em vez disso, encontre e corrija a causa raiz:

```bash
# Examine the coverage report to find uncovered code
# The coverage-summary.json shows:
# {
#   "total": { "lines": { "pct": 78.5 } },
#   "src/services/push.service.ts": { "lines": { "pct": 45.0 } }  <-- Problem
# }

# The push.service.ts has error handling paths that are never tested
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Adicione a cobertura de teste faltante em vez de diminuir o threshold:

```typescript
// tests/unit/services/push.service.test.ts - Add missing tests
describe('PushService', () => {
  describe('sendNotification', () => {
    it('should handle invalid device tokens gracefully', async () => {
      const result = await pushService.sendNotification({
        deviceToken: 'invalid-token',
        message: 'test'
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid device token');
    });

    it('should retry on transient network errors', async () => {
      // Mock network failure then success
      mockPushProvider
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce({ delivered: true });

      const result = await pushService.sendNotification({
        deviceToken: 'valid-token',
        message: 'test'
      });
      expect(result.success).toBe(true);
      expect(mockPushProvider).toHaveBeenCalledTimes(2);
    });
  });
});
```

</details>

### Exercício 2: Corrigir o slot swap blue-green quebrado

O deploy em produção reporta sucesso, mas os usuários veem a versão antiga. O slot swap parece reverter imediatamente:

```yaml
# BROKEN: Health check fails on new version, triggering immediate rollback
- name: Verify production health
  run: |
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      https://app-contoso-notif.azurewebsites.net/health)
    # ERROR: Checking immediately after swap without warmup time
    # The new code needs 15-30 seconds to start serving traffic
    if [ "$STATUS" != "200" ]; then
      echo "Rolling back..."
      az webapp deployment slot swap ...  # Swaps back!
      exit 1
    fi
```


<details>
<summary>Mostrar solução</summary>

**Correção:**

```yaml
# FIXED: Add proper warmup delay and retry logic before checking health
- name: Verify production health
  run: |
    echo "Waiting for slot swap traffic shift..."
    sleep 15

    SUCCESS=false
    for i in $(seq 1 6); do
      STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        https://app-contoso-notif.azurewebsites.net/health)
      if [ "$STATUS" = "200" ]; then
        # Verify it is actually the new version
        VERSION=$(curl -s https://app-contoso-notif.azurewebsites.net/health | jq -r '.version')
        if [ "$VERSION" = "${{ needs.build-image.outputs.image_version }}" ]; then
          echo "Production verified: version $VERSION is live"
          SUCCESS=true
          break
        fi
      fi
      echo "Attempt $i: status=$STATUS, waiting 10s..."
      sleep 10
    done

    if [ "$SUCCESS" != "true" ]; then
      echo "::error::Production verification failed - initiating rollback"
      az webapp deployment slot swap \
        --resource-group ${{ env.RESOURCE_GROUP }} \
        --name app-contoso-notif \
        --slot staging \
        --target-slot production
      exit 1
    fi
```

</details>

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Em um pipeline multi-estágio com shards de teste paralelos, como a cobertura de testes deve ser agregada?",
    options: [
      "Usar o valor de cobertura mais alto de qualquer shard individual",
      "Mesclar o JSON de cobertura de todos os shards usando uma ferramenta como nyc merge e então gerar um relatório combinado",
      "Calcular a média das porcentagens de cobertura de cada shard",
      "Medir a cobertura apenas no último shard que executa por último"
    ],
    correctIndex: 1,
    explanation: "Cada shard executa apenas um subconjunto dos testes e cobre caminhos de código diferentes. Os relatórios de cobertura individuais são incompletos. Eles devem ser mesclados (usando nyc merge, istanbul merge ou similar) para produzir uma visão precisa da cobertura total. Em seguida, o relatório combinado é verificado contra o threshold. Calcular a média das porcentagens dos shards seria incorreto porque os shards podem se sobrepor na cobertura."
  },
  {
    question: "Por que o pipeline faz deploy da imagem de container no slot de staging antes de fazer swap para produção?",
    options: [
      "O slot de staging é mais barato de executar do que o slot de produção",
      "Isso permite deploy com zero downtime: a nova versão aquece no slot de staging antes de receber tráfego de produção via swap",
      "O Azure exige que todos os deploys passem primeiro por um slot de staging",
      "O slot de staging tem health checks menos rigorosos"
    ],
    correctIndex: 1,
    explanation: "O deploy blue-green via slot swap garante zero downtime. A nova versão é implantada no slot de staging onde inicia, carrega caches e aquece compiladores JIT sem afetar os usuários de produção. Somente após o slot de staging estar saudável o swap redireciona o tráfego. Se a nova versão falhar, reverter é instantâneo já que a versão antiga ainda está rodando no slot que agora é o staging."
  },
  {
    question: "Qual é o propósito da anotação de deploy do Application Insights no pipeline?",
    options: [
      "Ela aciona rollback automático se o Application Insights detectar erros",
      "Ela cria um marcador visual nos gráficos de métricas correlacionando deploys com mudanças no comportamento da aplicação",
      "Ela configura a taxa de amostragem do Application Insights para a nova versão",
      "Ela envia uma notificação para a equipe de desenvolvimento sobre o deploy"
    ],
    correctIndex: 1,
    explanation: "As anotações de deploy criam marcadores verticais nos gráficos de telemetria do Application Insights (tempos de resposta, taxas de erro, volumes de requisição). Isso torna imediatamente visível quando um deploy se correlaciona com uma mudança no comportamento da aplicação, ajudando as equipes a determinar rapidamente se um deploy causou uma regressão ou melhoria."
  },
  {
    question: "Neste pipeline capstone, o que impede um commit quebrado de chegar à produção?",
    options: [
      "Apenas o gate de aprovação manual antes da produção",
      "Múltiplas camadas: lint, verificação de tipos, testes unitários com gate de cobertura, testes de integração, varredura de segurança, validação de IaC, smoke tests no staging e aprovação manual",
      "O health check do Dockerfile",
      "Apenas as regras de proteção de branch"
    ],
    correctIndex: 1,
    explanation: "Defesa em profundidade é aplicada: qualidade de código (lint + verificação de tipos), corretude (testes unitários com mínimo de 80% de cobertura), validade de integração (testes de integração), segurança (npm audit + Trivy), validade de infraestrutura (Bicep lint + validate + what-if), verificação de deploy (smoke tests no staging) e julgamento humano (aprovação manual). Cada camada captura diferentes categorias de problemas, e todas devem passar antes que a produção receba a mudança."
  }
]} />

## Limpeza

```bash
# Delete Azure resources
az group delete --name rg-contoso-notifications --yes --no-wait

# Remove GitHub environments
gh api --method DELETE repos/{owner}/{repo}/environments/staging
gh api --method DELETE repos/{owner}/{repo}/environments/production

# Remove GitHub releases created during testing
gh release list --limit 5 --json tagName --jq '.[].tagName' | \
  xargs -I {} gh release delete {} --yes --cleanup-tag

# Clean up container images from ACR
az acr repository delete \
  --name contosonotifacr \
  --repository contoso-notification-service \
  --yes

# Remove secrets
gh secret delete AZURE_CLIENT_ID --env staging
gh secret delete AZURE_CLIENT_ID --env production
gh secret delete AZURE_TENANT_ID
gh secret delete AZURE_SUBSCRIPTION_ID

# Remove workflow runs
gh run list --workflow=ci-cd.yml --limit 20 --json databaseId --jq '.[].databaseId' | \
  xargs -I {} gh run delete {}

# Clear GitHub Actions cache
gh cache list --json key --jq '.[].key' | xargs -I {} gh cache delete "{}"
```
