---
sidebar_position: 1
title: "Desafio 19: Fundamentos do GitHub Actions"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 19: Fundamentos do GitHub Actions

:::info Plataforma: GitHub-first
Este desafio foca em GitHub Actions. Equivalentes no Azure DevOps sÃ£o mencionados quando relevante.
:::

## Habilidades do exame

- Selecionar uma soluÃ§Ã£o de automaÃ§Ã£o de deploy, incluindo GitHub Actions
- Desenvolver pipelines usando YAML

## CenÃ¡rio

A Contoso Ltd estÃ¡ migrando seus pipelines de CI/CD do Jenkins para o GitHub Actions. A aplicaÃ§Ã£o principal Ã© uma API REST em Node.js (Express.js) que Ã© containerizada e implantada no Azure App Service. A equipe precisa de um workflow completo que lide com build, testes, criaÃ§Ã£o de imagem de contÃªiner e deploys em estÃ¡gios.

A estrutura do repositÃ³rio:

```text
contoso-api/
  src/
    index.js
    routes/
    middleware/
  tests/
    unit/
    integration/
  Dockerfile
  package.json
  .github/
    workflows/
    actions/
```

## Tarefa 1: Criar o workflow de CI com estÃ¡gios de build e teste

Crie `.github/workflows/ci-cd.yml` com triggers para push na `main` e pull requests:

```yaml
name: Contoso API CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        default: "staging"
        type: choice
        options:
          - staging
          - production
      skip_tests:
        description: "Skip test execution"
        required: false
        type: boolean
        default: false

env:
  NODE_VERSION: "20.x"
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    name: Build and lint
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
      sha_short: ${{ steps.version.outputs.sha_short }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Generate version info
        id: version
        run: |
          VERSION=$(node -p "require('./package.json').version")
          SHA_SHORT=$(git rev-parse --short HEAD)
          echo "version=${VERSION}" >> $GITHUB_OUTPUT
          echo "sha_short=${SHA_SHORT}" >> $GITHUB_OUTPUT

      - name: Build application
        run: npm run build

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
          retention-days: 5

  test:
    name: Run tests
    needs: build
    runs-on: ubuntu-latest
    if: ${{ !inputs.skip_tests }}
    strategy:
      matrix:
        test-type: [unit, integration]
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run ${{ matrix.test-type }} tests
        run: npm run test:${{ matrix.test-type }}
        env:
          REDIS_URL: redis://localhost:6379
          CI: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ matrix.test-type }}
          path: coverage/
```

## Tarefa 2: Adicionar build Docker e push para o GitHub Container Registry

Adicione um job que faz build e push da imagem de contÃªiner:

```yaml
  docker:
    name: Build and push container image
    needs: [build, test]
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}
      image_digest: ${{ steps.push.outputs.digest }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=semver,pattern={{version}},value=${{ needs.build.outputs.version }}
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push image
        id: push
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
            BUILD_SHA=${{ needs.build.outputs.sha_short }}
```

## Tarefa 3: Deploy para o Azure App Service com staging e produÃ§Ã£o

Adicione jobs de deploy usando environments:

```yaml
  deploy-staging:
    name: Deploy to staging
    needs: docker
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://contoso-api-staging.azurewebsites.net
    steps:
      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Azure App Service (staging slot)
        uses: azure/webapps-deploy@v3
        with:
          app-name: contoso-api
          slot-name: staging
          images: ${{ needs.docker.outputs.image_tag }}

      - name: Run smoke tests against staging
        run: |
          for i in {1..10}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://contoso-api-staging.azurewebsites.net/health)
            if [ "$STATUS" = "200" ]; then
              echo "Staging is healthy"
              exit 0
            fi
            echo "Attempt $i: Status $STATUS, retrying..."
            sleep 10
          done
          echo "Staging health check failed"
          exit 1

  deploy-production:
    name: Deploy to production
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://contoso-api.azurewebsites.net
    steps:
      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Swap staging slot to production
        run: |
          az webapp deployment slot swap \
            --resource-group contoso-rg \
            --name contoso-api \
            --slot staging \
            --target-slot production
```

## Tarefa 4: Criar uma composite action para etapas reutilizÃ¡veis

Crie `.github/actions/setup-node-project/action.yml`:

```yaml
name: "Setup Node.js project"
description: "Installs Node.js, caches dependencies, and runs npm ci"

inputs:
  node-version:
    description: "Node.js version to use"
    required: false
    default: "20.x"
  working-directory:
    description: "Working directory for npm commands"
    required: false
    default: "."

outputs:
  cache-hit:
    description: "Whether npm cache was hit"
    value: ${{ steps.cache.outputs.cache-hit }}

runs:
  using: "composite"
  steps:
    - name: Set up Node.js ${{ inputs.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}

    - name: Get npm cache directory
      id: npm-cache-dir
      shell: bash
      run: echo "dir=$(npm config get cache)" >> $GITHUB_OUTPUT

    - name: Cache npm dependencies
      id: cache
      uses: actions/cache@v4
      with:
        path: ${{ steps.npm-cache-dir.outputs.dir }}
        key: ${{ runner.os }}-node-${{ inputs.node-version }}-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-node-${{ inputs.node-version }}-

    - name: Install dependencies
      shell: bash
      working-directory: ${{ inputs.working-directory }}
      run: npm ci
```

Use a composite action no workflow:

```yaml
      - name: Setup project
        uses: ./.github/actions/setup-node-project
        with:
          node-version: ${{ env.NODE_VERSION }}
```

## Tarefa 5: Configurar secrets e variÃ¡veis de ambiente

Configure os seguintes secrets e variÃ¡veis nos nÃ­veis de repositÃ³rio e environment:

```bash
# Repository secrets (available to all workflows)
gh secret set AZURE_CREDENTIALS --body '{"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}'

# Environment-specific secrets
gh secret set DB_CONNECTION_STRING --env staging --body "Server=staging-db.database.windows.net;..."
gh secret set DB_CONNECTION_STRING --env production --body "Server=prod-db.database.windows.net;..."

# Repository variables
gh variable set APP_NAME --body "contoso-api"
gh variable set AZURE_RESOURCE_GROUP --body "contoso-rg"

# Environment variables
gh variable set APP_SERVICE_PLAN --env staging --body "contoso-plan-staging"
gh variable set APP_SERVICE_PLAN --env production --body "contoso-plan-prod"
```

## ExercÃ­cios de quebra e conserto

### ExercÃ­cio 1: Corrigir o workflow com falha

O workflow a seguir contÃ©m erros. Identifique e corrija-os:

```yaml
name: Broken Workflow

on:
  push:
    branches: main    # ERROR 1: Should be an array [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set output
        run: echo "result=success" >> $GITHUB_OUTPUT  # ERROR 2: Missing id field

      - name: Use output
        run: echo ${{ steps.set-output.outputs.result }}  # ERROR 3: step id doesn't match

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.APP_NAME }}  # ERROR 4: env context not available, use vars
          images: ${{ needs.build.outputs.image }}  # ERROR 5: build job has no outputs defined
```

**VersÃ£o corrigida:**

```yaml
name: Fixed Workflow

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.set-output.outputs.result }}
    steps:
      - uses: actions/checkout@v4

      - name: Set output
        id: set-output
        run: echo "result=success" >> $GITHUB_OUTPUT

      - name: Use output
        run: echo ${{ steps.set-output.outputs.result }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ vars.APP_NAME }}
          images: ${{ needs.build.outputs.image }}
```

### ExercÃ­cio 2: Depurar o problema de permissÃµes

Um workflow que faz push para o GHCR falha com `denied: permission_denied`. O arquivo de workflow contÃ©m:

```yaml
permissions:
  contents: read
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:** Adicione a permissÃ£o `packages: write` para permitir push para o GHCR:

```yaml
permissions:
  contents: read
  packages: write
```

</details>
## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "No GitHub Actions, qual Ã© a maneira correta de passar dados entre jobs?",
    options: [
      "Usar variÃ¡veis de ambiente definidas com 'export'",
      "Escrever em um arquivo compartilhado no workspace",
      "Usar outputs de job com '$GITHUB_OUTPUT' e o contexto 'needs'",
      "Usar variÃ¡veis de repositÃ³rio como armazenamento intermediÃ¡rio"
    ],
    correctIndex: 2,
    explanation: "Os outputs de job sÃ£o definidos usando echo \"key=value\" >> $GITHUB_OUTPUT em um step com um id, declarados na seÃ§Ã£o outputs do job e consumidos em jobs downstream usando ${{ needs.job_id.outputs.key }}. VariÃ¡veis de ambiente e arquivos do workspace nÃ£o persistem entre jobs, pois cada job executa em um runner novo."
  },
  {
    question: "Qual configuraÃ§Ã£o de trigger permite execuÃ§Ã£o manual do workflow com parÃ¢metros customizados?",
    options: [
      "'on: manual'",
      "'on: workflow_dispatch' com 'inputs'",
      "'on: repository_dispatch' com 'inputs'",
      "'on: push' com 'if: github.event.manual'"
    ],
    correctIndex: 1,
    explanation: "workflow_dispatch permite acionamento manual pela UI do GitHub ou API com inputs tipados (string, boolean, choice, environment). repository_dispatch Ã© acionado via API com um client_payload, mas nÃ£o fornece a mesma experiÃªncia de entrada orientada pela UI."
  },
  {
    question: "Qual Ã© a principal vantagem de uma composite action sobre um reusable workflow?",
    options: [
      "Composite actions podem usar secrets diretamente",
      "Composite actions executam no mesmo job, compartilhando o workspace e o runner",
      "Composite actions suportam estratÃ©gias de matrix",
      "Composite actions podem acionar outros workflows"
    ],
    correctIndex: 1,
    explanation: "Composite actions executam como steps dentro do job que as invoca, ou seja, compartilham o mesmo workspace, variÃ¡veis de ambiente e runner. Reusable workflows executam como um job separado (ou conjunto de jobs) com sua prÃ³pria instÃ¢ncia de runner. Isso torna as composite actions melhores para agrupar steps relacionados que precisam de estado compartilhado."
  },
  {
    question: "Qual valor de 'permissions' Ã© necessÃ¡rio para que um workflow faÃ§a push de imagens de contÃªiner para o GitHub Container Registry (ghcr.io)?",
    options: [
      "'contents: write'",
      "'packages: write'",
      "'deployments: write'",
      "'registry: write'"
    ],
    correctIndex: 1,
    explanation: "O GHCR usa o escopo de permissÃ£o packages. O workflow precisa de packages: write para fazer push de imagens e packages: read para pull. Quando permissions Ã© definido explicitamente, apenas as permissÃµes listadas sÃ£o concedidas (princÃ­pio do menor privilÃ©gio)."
  }
]} />

## Limpeza

```bash
# Remove the test workflow runs (optional)
gh run list --workflow=ci-cd.yml --limit 5 --json databaseId --jq '.[].databaseId' | \
  xargs -I {} gh run delete {}

# Delete environment if no longer needed
gh api --method DELETE repos/{owner}/{repo}/environments/staging
gh api --method DELETE repos/{owner}/{repo}/environments/production

# Remove GHCR images
gh api --method DELETE /user/packages/container/contoso-api/versions/{version_id}
```
