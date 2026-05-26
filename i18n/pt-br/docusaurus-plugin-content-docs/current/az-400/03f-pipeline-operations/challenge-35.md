---
sidebar_position: 2
title: "Desafio 35: Otimização de pipeline"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 35: Otimização de pipeline

:::info Plataforma: comparação
Este desafio aborda técnicas de otimização tanto para GitHub Actions quanto para Azure Pipelines.
:::

## Habilidades do exame mapeadas

- Otimizar um pipeline para custo, tempo, desempenho e confiabilidade
- Otimizar a concorrência do pipeline para desempenho e custo

## Cenário

O pipeline principal de CI/CD da Contoso Ltd atualmente possui estas características de desempenho:

- Duração total: média de 45 minutos
- Custo mensal: $200 em minutos de GitHub Actions (ou tempo de agente hospedado do Azure Pipelines)
- Detalhamento dos jobs: Instalar dependências (5 min), Lint (3 min), Testes unitários (12 min), Testes de integração (15 min), Build Docker (8 min), Deploy (2 min)
- O pipeline executa 20 vezes por dia

Objetivo: Reduzir a duração do pipeline para menos de 15 minutos e o custo mensal para abaixo de $100, mantendo a confiabilidade.

O repositório é um monorepo Node.js com 3 pacotes:

```text
contoso-platform/
  packages/
    api/          (Express.js REST API)
    web/          (React frontend)
    shared/       (Shared utilities library)
  package.json
  package-lock.json
  Dockerfile.api
  Dockerfile.web
```

## Tarefa 1: Implementar caching (npm, Docker layers, actions/cache)

Adicione cache de dependências e de build para eliminar trabalho redundante:

```yaml
# GitHub Actions - Optimized caching strategy
name: CI Pipeline (Optimized)

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js with built-in cache
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"  # Automatically caches ~/.npm based on package-lock.json

      - name: Cache node_modules
        id: cache-modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-modules-${{ hashFiles('package-lock.json') }}

      - name: Install dependencies
        if: steps.cache-modules.outputs.cache-hit != 'true'
        run: npm ci

      # Persist node_modules for downstream jobs
      - name: Upload node_modules
        uses: actions/upload-artifact@v4
        with:
          name: node-modules
          path: node_modules
          retention-days: 1

  docker-build:
    runs-on: ubuntu-latest
    needs: [test-unit, lint]
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Cache Docker layers
        uses: actions/cache@v4
        with:
          path: /home/runner/.docker-cache
          key: ${{ runner.os }}-docker-${{ hashFiles('Dockerfile.api', 'package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-docker-

      - name: Build Docker image with layer cache
        uses: docker/build-push-action@v5
        with:
          context: .
          file: Dockerfile.api
          push: false
          tags: contoso-api:${{ github.sha }}
          cache-from: type=local,src=/home/runner/.docker-cache
          cache-to: type=local,dest=/home/runner/.docker-cache,mode=max
```

Para Azure Pipelines, use a task Cache:

```yaml
# azure-pipelines.yml - Caching configuration
steps:
  - task: Cache@2
    displayName: "Cache npm packages"
    inputs:
      key: 'npm | "$(Agent.OS)" | package-lock.json'
      restoreKeys: |
        npm | "$(Agent.OS)"
      path: $(npm_config_cache)

  - task: Cache@2
    displayName: "Cache node_modules"
    inputs:
      key: 'node_modules | "$(Agent.OS)" | package-lock.json'
      path: node_modules

  - script: |
      if [ ! -d "node_modules" ]; then
        npm ci
      fi
    displayName: "Install dependencies (if cache miss)"

  # Docker layer caching with ACR
  - task: Docker@2
    displayName: "Build with ACR cache"
    inputs:
      command: build
      repository: contoso/api
      dockerfile: Dockerfile.api
      arguments: |
        --cache-from type=registry,ref=contosoregistry.azurecr.io/contoso/api:cache
        --cache-to type=registry,ref=contosoregistry.azurecr.io/contoso/api:cache,mode=max
```

## Tarefa 2: Execução paralela de jobs (dividir suítes de teste)

Divida os testes em múltiplos runners paralelos para reduzir o tempo total:

```yaml
# GitHub Actions - Parallel test execution
  test-unit:
    runs-on: ubuntu-latest
    needs: install
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]  # 4 parallel shards
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Download node_modules
        uses: actions/download-artifact@v4
        with:
          name: node-modules
          path: node_modules

      - name: Run unit tests (shard ${{ matrix.shard }}/4)
        run: |
          npx jest --ci --shard=${{ matrix.shard }}/4 \
            --coverage --coverageReporters=json \
            --outputFile=results-${{ matrix.shard }}.json

      - name: Upload coverage shard
        uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.shard }}
          path: coverage/coverage-final.json

  merge-coverage:
    runs-on: ubuntu-latest
    needs: test-unit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci

      - name: Download all coverage shards
        uses: actions/download-artifact@v4
        with:
          pattern: coverage-*
          merge-multiple: true
          path: coverage-parts/

      - name: Merge coverage reports
        run: |
          npx nyc merge coverage-parts/ coverage/merged.json
          npx nyc report --reporter=text --reporter=lcov \
            --temp-dir=coverage -t coverage
```

Execução paralela de testes no Azure Pipelines:

```yaml
# azure-pipelines.yml - Parallel strategy
jobs:
  - job: UnitTests
    displayName: "Unit tests"
    strategy:
      parallel: 4  # Azure DevOps auto-splits test files across 4 agents
    steps:
      - task: NodeTool@0
        inputs:
          versionSpec: "20.x"

      - script: npm ci
        displayName: "Install dependencies"

      # Azure Pipelines provides $(System.TotalJobsInPhase) and $(System.JobPositionInPhase)
      - script: |
          npx jest --ci \
            --shard=$(System.JobPositionInPhase)/$(System.TotalJobsInPhase) \
            --reporters=jest-junit
        displayName: "Run test shard"

      - task: PublishTestResults@2
        condition: always()
        inputs:
          testResultsFormat: "JUnit"
          testResultsFiles: "**/junit.xml"
```

## Tarefa 3: Execução condicional de jobs

Pule trabalho desnecessário com base em quais arquivos foram alterados:

```yaml
# GitHub Actions - Path-based conditional execution
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.filter.outputs.api }}
      web: ${{ steps.filter.outputs.web }}
      shared: ${{ steps.filter.outputs.shared }}
      docs_only: ${{ steps.filter.outputs.docs_only }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api:
              - 'packages/api/**'
              - 'shared/**'
            web:
              - 'packages/web/**'
              - 'shared/**'
            shared:
              - 'packages/shared/**'
            docs_only:
              - '**/*.md'
              - 'docs/**'

  test-api:
    needs: [install, detect-changes]
    if: needs.detect-changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci
      - run: npm run test --workspace=packages/api

  test-web:
    needs: [install, detect-changes]
    if: needs.detect-changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci
      - run: npm run test --workspace=packages/web

  deploy:
    needs: [test-api, test-web, detect-changes]
    if: |
      always() &&
      needs.detect-changes.outputs.docs_only != 'true' &&
      (needs.test-api.result == 'success' || needs.test-api.result == 'skipped') &&
      (needs.test-web.result == 'success' || needs.test-web.result == 'skipped')
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying..."
```

## Tarefa 4: Otimização de artefatos

Passe apenas os artefatos necessários entre jobs para reduzir o tempo de upload/download:

```yaml
# BEFORE (inefficient): Uploading entire workspace
  - uses: actions/upload-artifact@v4
    with:
      name: workspace
      path: .  # Uploads everything including node_modules (500MB+)

# AFTER (optimized): Upload only build output
  build-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build --workspace=packages/api

      # Upload only the compiled output needed for deployment
      - uses: actions/upload-artifact@v4
        with:
          name: api-dist
          path: packages/api/dist/
          retention-days: 1  # Short retention for intermediate artifacts
          compression-level: 6  # Balance speed vs size

  deploy-api:
    needs: build-api
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: api-dist
          path: ./dist
      - run: |
          ls -la dist/  # Only contains compiled JS files (~5MB vs 500MB)
          # Deploy from dist/
```

Para builds Docker, use multi-stage builds para minimizar o contexto:

```dockerfile
# Dockerfile.api - Optimized multi-stage build
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY packages/api/ ./packages/api/
COPY packages/shared/ ./packages/shared/
RUN npm run build --workspace=packages/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/api/dist ./dist
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Tarefa 5: Análise de custo de self-hosted runner

Compare runners hospedados vs self-hosted para otimização de custo:

```yaml
# GitHub Actions hosted runner pricing (as of 2024):
# Linux: $0.008/minute
# Windows: $0.016/minute
# macOS: $0.08/minute

# Current spend: 20 runs/day * 45 min * $0.008 = $7.20/day = ~$216/month

# With optimization (target 15 min):
# 20 runs/day * 15 min * $0.008 = $2.40/day = ~$72/month

# Self-hosted runner analysis:
# Azure VM (Standard_D4s_v3, 4 vCPU, 16GB): ~$140/month
# Handles unlimited minutes but needs maintenance
# Break-even: ~$140/$0.008 = 17,500 minutes/month
# Current usage: 20 * 45 * 22 working days = 19,800 min/month (worth self-hosting)
# After optimization: 20 * 15 * 22 = 6,600 min/month (stay hosted)
```

Configure um self-hosted runner para cargas de trabalho específicas:

```yaml
# Use self-hosted for expensive/long jobs, hosted for short ones
jobs:
  lint:
    runs-on: ubuntu-latest  # Short job, use hosted
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  integration-tests:
    runs-on: [self-hosted, linux, x64]  # Long job, use self-hosted
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration
```

## Tarefa 6: Caching e jobs paralelos no Azure Pipelines

Padrões de otimização específicos do Azure Pipelines:

```yaml
# azure-pipelines.yml - Fully optimized pipeline
trigger:
  branches:
    include: [main]
  paths:
    exclude:
      - "**/*.md"
      - "docs/**"

pool:
  vmImage: "ubuntu-latest"

variables:
  npm_config_cache: $(Pipeline.Workspace)/.npm

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        steps:
          - task: Cache@2
            displayName: "Restore npm cache"
            inputs:
              key: 'npm | "$(Agent.OS)" | package-lock.json'
              restoreKeys: |
                npm | "$(Agent.OS)"
              path: $(npm_config_cache)

          - script: npm ci
            displayName: "Install dependencies"

          - script: npm run lint
            displayName: "Lint"

          - script: npm run build
            displayName: "Build"

          - publish: $(System.DefaultWorkingDirectory)/dist
            artifact: build-output
            displayName: "Publish build artifact"

      # Parallel test jobs (requires parallel job licenses)
      - job: UnitTests
        dependsOn: []  # Run in parallel with BuildAndTest
        strategy:
          parallel: 2
        steps:
          - task: Cache@2
            inputs:
              key: 'npm | "$(Agent.OS)" | package-lock.json'
              path: $(npm_config_cache)

          - script: npm ci
            displayName: "Install dependencies"

          - script: |
              npx jest --ci --shard=$(System.JobPositionInPhase)/$(System.TotalJobsInPhase)
            displayName: "Run test shard"
```

Entenda a precificação de jobs paralelos do Azure Pipelines:

```text
# Azure Pipelines parallel jobs:
# Free tier: 1 Microsoft-hosted parallel job (1800 min/month)
# Additional: $40/month per parallel job (unlimited minutes)
#
# Cost calculation for Contoso:
# Current: 1 job * 45 min * 20 runs = 900 min/day (exceeds free tier)
# With 4 parallel jobs: $120/month but 15 min total duration
# ROI: Developer time saved = 30 min * 20 runs * 22 days = 220 hours/month
```

## Tarefa 7: Builds incrementais (otimização de monorepo)

Compile e teste apenas os pacotes que foram alterados:

```yaml
# GitHub Actions - Turborepo for monorepo incremental builds
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Need previous commit for comparison

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      # Use Turborepo remote cache for incremental builds
      - name: Build with Turborepo (incremental)
        run: npx turbo run build --filter='...[HEAD~1]'
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: contoso

      - name: Test only affected packages
        run: npx turbo run test --filter='...[HEAD~1]'
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: contoso
```

Alternativa usando `nx affected` para monorepos:

```yaml
      - name: Determine affected projects
        id: affected
        run: |
          AFFECTED=$(npx nx show projects --affected --base=HEAD~1 --head=HEAD)
          echo "projects=$AFFECTED" >> $GITHUB_OUTPUT
          if [ -z "$AFFECTED" ]; then
            echo "skip=true" >> $GITHUB_OUTPUT
          fi

      - name: Build affected projects
        if: steps.affected.outputs.skip != 'true'
        run: npx nx affected --target=build --base=HEAD~1 --head=HEAD

      - name: Test affected projects
        if: steps.affected.outputs.skip != 'true'
        run: npx nx affected --target=test --base=HEAD~1 --head=HEAD
```

## Exercícios de quebra e conserto

### Exercício 1: Corrigir o cache quebrado

O pipeline sempre reporta cache miss apesar de ter uma configuração de cache:

```yaml
# BROKEN: Cache key never matches
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package.json') }}  # ERROR: Wrong file
    # package.json changes with every version bump
    # Should use package-lock.json which only changes when deps change
```


<details>
<summary>Mostrar solução</summary>

**Correção:**

```yaml
# FIXED: Use lock file for stable cache key
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

</details>

### Exercício 2: Corrigir jobs paralelos produzindo cobertura incompleta

O sharding de testes funciona, mas o relatório de cobertura mostra apenas 25% (cobertura de um único shard):

```yaml
# BROKEN: Each shard overwrites the same coverage file
- name: Upload coverage
  uses: actions/upload-artifact@v4
  with:
    name: coverage  # ERROR: Same name across all shards - last one wins
    path: coverage/
```


<details>
<summary>Mostrar solução</summary>

**Correção:**

```yaml
# FIXED: Unique artifact names per shard, then merge
- name: Upload coverage shard
  uses: actions/upload-artifact@v4
  with:
    name: coverage-shard-${{ matrix.shard }}  # Unique per shard
    path: coverage/coverage-final.json

# In a subsequent job:
- uses: actions/download-artifact@v4
  with:
    pattern: coverage-shard-*
    merge-multiple: true
    path: all-coverage/

- name: Merge and report
  run: |
    npx nyc merge all-coverage/ .nyc_output/merged.json
    npx nyc report --reporter=text-summary --reporter=lcov
```

</details>

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a estratégia de caching mais eficaz para dependências npm em um pipeline de CI?",
    options: [
      "Cachear o diretório '~/.npm' com chave baseada em 'package.json'",
      "Cachear 'node_modules' com chave baseada em 'package-lock.json' com uma chave de restauração de fallback",
      "Cachear o diretório inteiro do workspace",
      "Baixar dependências de um mirror de registro privado"
    ],
    correctIndex: 1,
    explanation: "Cachear node_modules com chave baseada em package-lock.json oferece o melhor equilíbrio. O arquivo lock muda apenas quando as dependências realmente mudam (diferente do package.json que muda a cada bump de versão). Uma chave de restauração como ${{ runner.os }}-modules- fornece correspondências parciais quando o arquivo lock muda, oferecendo um cache aquecido mesmo após atualizações de dependências."
  },
  {
    question: "Como o sharding de testes reduz a duração do pipeline?",
    options: [
      "Ele executa menos testes amostrando um subconjunto da suíte de testes",
      "Ele divide a suíte de testes em múltiplos runners paralelos, reduzindo o tempo de relógio proporcionalmente",
      "Ele pula testes que passaram na execução anterior",
      "Ele executa testes mais rápido reduzindo o isolamento dos testes"
    ],
    correctIndex: 1,
    explanation: "O sharding de testes divide a suíte completa em N partes iguais e executa cada parte em um runner separado simultaneamente. Com 4 shards, uma suíte de testes de 12 minutos leva aproximadamente 3 minutos de tempo de relógio. Todos os testes ainda são executados; apenas o tempo decorrido é reduzido pela paralelização."
  },
  {
    question: "Quando você deve escolher self-hosted runners em vez de runners hospedados?",
    options: [
      "Sempre, porque self-hosted runners são mais rápidos",
      "Quando os custos mensais de runners hospedados excedem o custo de manter uma VM, ou quando você precisa de hardware/software especializado",
      "Apenas para deploys em produção",
      "Quando você precisa de acesso à internet pública"
    ],
    correctIndex: 1,
    explanation: "Self-hosted runners fazem sentido economicamente quando o uso de runners hospedados excede o ponto de equilíbrio (custo total da VM + overhead de manutenção). Eles também oferecem benefícios como caches persistentes, hardware especializado (GPU, ARM), acesso a redes privadas e ferramentas pré-instaladas que de outra forma desacelerariam cada execução."
  },
  {
    question: "Qual é o principal benefício da execução condicional de jobs baseada em caminhos de arquivos?",
    options: [
      "Reduz o armazenamento do repositório removendo arquivos não alterados",
      "Previne conflitos de merge nos arquivos alterados",
      "Evita executar jobs caros (testes, builds, deploys) quando as alterações não afetam esses componentes",
      "Aprova automaticamente pull requests que alteram apenas documentação"
    ],
    correctIndex: 2,
    explanation: "A filtragem baseada em caminhos pula jobs que não são relevantes para os arquivos alterados. Uma alteração apenas de documentação não deveria acionar uma suíte de testes de integração de 15 minutos. Isso reduz tanto o custo (menos minutos consumidos) quanto o tempo de espera do desenvolvedor (feedback mais rápido no PR), enquanto garante que alterações significativas ainda recebam validação completa."
  }
]} />

## Limpeza

```bash
# Remove cached artifacts
gh cache list --json key --jq '.[].key' | \
  xargs -I {} gh cache delete "{}"

# Remove Turborepo remote cache (if using Vercel)
# This is managed via the Vercel dashboard

# Clean up self-hosted runner (if provisioned)
# Remove from GitHub Settings > Actions > Runners first, then delete VM
az vm delete --resource-group rg-contoso-runners --name vm-runner-01 --yes
az group delete --name rg-contoso-runners --yes --no-wait
```
