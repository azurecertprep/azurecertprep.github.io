---
sidebar_position: 4
title: "Desafio 22: Triggers e ordem de execução"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 22: Triggers e ordem de execução

:::info Plataforma: comparação
Este desafio compara padrões de trigger e execução entre GitHub Actions e Azure Pipelines.
:::

## Habilidades do exame

- Desenvolver e implementar regras de trigger de pipeline
- Projetar e implementar uma estratégia para ordem de execução de jobs, incluindo paralelismo e pipelines multi-stage

## Cenário

A Contoso Ltd mantém um monorepo contendo seu frontend (React), backend (Node.js API) e código de infraestrutura (Bicep). Eles querem pipelines eficientes. Quando um desenvolvedor altera apenas o código do frontend, apenas os stages do pipeline de frontend devem executar. Quando a infraestrutura muda, a validação do Bicep deve executar, mas os testes de aplicação devem ser ignorados. Eles também precisam de builds noturnos agendados, testes em matrix com múltiplas versões do Node.js e dependências adequadas entre jobs para garantir a ordem de execução.

Estrutura do repositório:

```text
contoso-monorepo/
  frontend/
    src/
    package.json
    Dockerfile
  backend/
    src/
    package.json
    Dockerfile
  infra/
    main.bicep
    modules/
  shared/
    utils/
    types/
  .github/workflows/
  pipelines/
```

## Tarefa 1: Filtros de path no GitHub Actions

Configure workflows que disparam com base nos caminhos alterados:

```yaml
# .github/workflows/frontend.yml
name: Frontend CI

on:
  push:
    branches: [main]
    paths:
      - "frontend/**"
      - "shared/**"
      - ".github/workflows/frontend.yml"
  pull_request:
    branches: [main]
    paths:
      - "frontend/**"
      - "shared/**"

jobs:
  build-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test -- --coverage
```

```yaml
# .github/workflows/backend.yml
name: Backend CI

on:
  push:
    branches: [main]
    paths:
      - "backend/**"
      - "shared/**"
      - ".github/workflows/backend.yml"
    paths-ignore:
      - "backend/docs/**"
      - "backend/**/*.md"
  pull_request:
    branches: [main]
    paths:
      - "backend/**"
      - "shared/**"

jobs:
  build-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

```yaml
# .github/workflows/infra.yml
name: Infrastructure Validation

on:
  push:
    branches: [main]
    paths:
      - "infra/**"
  pull_request:
    branches: [main]
    paths:
      - "infra/**"

jobs:
  validate-bicep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Validate Bicep
        run: |
          az bicep build --file infra/main.bicep
          az deployment group validate \
            --resource-group contoso-rg \
            --template-file infra/main.bicep \
            --parameters @infra/parameters/dev.json
```

## Tarefa 2: Filtros de path no Azure Pipelines

Triggers equivalentes baseados em path no YAML do Azure Pipelines:

```yaml
# pipelines/frontend-pipeline.yml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - frontend/*
      - shared/*
    exclude:
      - frontend/docs/*
      - frontend/*.md

pr:
  branches:
    include:
      - main
  paths:
    include:
      - frontend/*
      - shared/*

pool:
  vmImage: "ubuntu-latest"

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "20.x"
  - script: |
      cd frontend
      npm ci
      npm run lint
      npm run build
      npm test -- --coverage
    displayName: "Build and test frontend"
```

```yaml
# pipelines/backend-pipeline.yml
trigger:
  branches:
    include:
      - main
      - release/*
  paths:
    include:
      - backend/*
      - shared/*
    exclude:
      - backend/docs/*

pr:
  branches:
    include:
      - main
  paths:
    include:
      - backend/*
      - shared/*
  drafts: false  # Do not trigger on draft PRs

pool:
  vmImage: "ubuntu-latest"

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "20.x"
  - script: |
      cd backend
      npm ci
      npm run lint
      npm run build
      npm test
    displayName: "Build and test backend"
```

## Tarefa 3: Triggers agendados

Configure builds agendados para testes noturnos e varredura de dependências:

```yaml
# GitHub Actions: Cron-based schedule
name: Nightly build and security scan

on:
  schedule:
    # Run at 02:00 UTC every weekday (Monday-Friday)
    - cron: "0 2 * * 1-5"
    # Run full regression at 04:00 UTC on Sundays
    - cron: "0 4 * * 0"
  workflow_dispatch: {}  # Allow manual trigger as well

jobs:
  nightly-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run dependency audit
        run: npm audit --production
      - name: Run CodeQL analysis
        uses: github/codeql-action/analyze@v3

  full-regression:
    if: github.event.schedule == '0 4 * * 0'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:regression
```

```yaml
# Azure Pipelines: Schedule triggers
trigger: none  # Disable CI trigger for this pipeline

schedules:
  - cron: "0 2 * * 1-5"
    displayName: "Weekday nightly build"
    branches:
      include:
        - main
    always: false  # Only run if there are code changes since last run
  - cron: "0 4 * * 0"
    displayName: "Sunday full regression"
    branches:
      include:
        - main
    always: true  # Run even if no changes

pool:
  vmImage: "ubuntu-latest"

stages:
  - stage: NightlyBuild
    displayName: "Nightly build"
    jobs:
      - job: Build
        steps:
          - script: npm ci && npm run build
            displayName: "Build"

  - stage: FullRegression
    displayName: "Full regression tests"
    condition: eq(variables['Build.CronSchedule.DisplayName'], 'Sunday full regression')
    jobs:
      - job: Regression
        timeoutInMinutes: 120
        steps:
          - script: npm ci && npm run test:regression
            displayName: "Run full regression suite"
```

## Tarefa 4: Triggers de conclusão de pipeline e workflow

Dispare pipelines quando outro pipeline é concluído:

```yaml
# GitHub Actions: Trigger on workflow completion
name: Deploy after tests pass

on:
  workflow_run:
    workflows: ["Backend CI", "Frontend CI"]
    types: [completed]
    branches: [main]

jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
      - name: Deploy to staging
        run: echo "Deploying commit ${{ github.event.workflow_run.head_sha }}"

  notify-failure:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    steps:
      - name: Notify team of failure
        run: |
          echo "Workflow ${{ github.event.workflow_run.name }} failed"
          echo "Branch: ${{ github.event.workflow_run.head_branch }}"
          echo "Commit: ${{ github.event.workflow_run.head_sha }}"
```

```yaml
# Azure Pipelines: Pipeline completion trigger via resources
resources:
  pipelines:
    - pipeline: backendCI
      source: "Backend-CI-Pipeline"
      trigger:
        branches:
          include:
            - main
        stages:
          - Test  # Only trigger when Test stage completes
    - pipeline: frontendCI
      source: "Frontend-CI-Pipeline"
      trigger:
        branches:
          include:
            - main

pool:
  vmImage: "ubuntu-latest"

jobs:
  - job: Deploy
    displayName: "Deploy after upstream success"
    steps:
      - download: backendCI
        artifact: drop
      - download: frontendCI
        artifact: dist
      - script: echo "Deploying artifacts from both pipelines"
        displayName: "Deploy"
```

## Tarefa 5: Dependências de jobs e ordem de execução

Defina grafos complexos de dependências entre jobs:

```yaml
# GitHub Actions: Job dependencies with 'needs'
name: Complex build pipeline

on:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  integration-tests:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:integration

  # This job depends on BOTH test jobs completing
  build-image:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t contoso-api .

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-image
    environment: staging
    steps:
      - run: echo "Deploying to staging"

  # Fan-out: Multiple independent verification jobs
  smoke-tests:
    runs-on: ubuntu-latest
    needs: deploy-staging
    steps:
      - run: curl -f https://staging.contoso.com/health

  performance-tests:
    runs-on: ubuntu-latest
    needs: deploy-staging
    steps:
      - run: echo "Running load tests against staging"

  # Fan-in: Wait for all verification before production
  deploy-production:
    runs-on: ubuntu-latest
    needs: [smoke-tests, performance-tests]
    environment: production
    steps:
      - run: echo "Deploying to production"
```

```yaml
# Azure Pipelines: Stage dependencies with dependsOn
stages:
  - stage: Lint
    jobs:
      - job: LintJob
        steps:
          - script: npm run lint

  - stage: UnitTest
    dependsOn: Lint
    jobs:
      - job: UnitTestJob
        steps:
          - script: npm test

  - stage: IntegrationTest
    dependsOn: Lint
    jobs:
      - job: IntegrationTestJob
        steps:
          - script: npm run test:integration

  # Fan-in: depends on both test stages
  - stage: BuildImage
    dependsOn:
      - UnitTest
      - IntegrationTest
    jobs:
      - job: DockerBuild
        steps:
          - script: docker build -t contoso-api .

  - stage: DeployStaging
    dependsOn: BuildImage
    jobs:
      - deployment: Staging
        environment: staging
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to staging"

  - stage: DeployProduction
    dependsOn: DeployStaging
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: Production
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to production"
```

## Tarefa 6: Estratégias de matrix para execução paralela

Execute testes em múltiplas versões e plataformas simultaneamente:

```yaml
# GitHub Actions: Matrix strategy
name: Cross-platform tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20, 22]
        exclude:
          - os: macos-latest
            node-version: 18
        include:
          - os: ubuntu-latest
            node-version: 20
            coverage: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
      - name: Upload coverage
        if: matrix.coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
```

```yaml
# Azure Pipelines: Matrix strategy
jobs:
  - job: CrossPlatformTest
    strategy:
      matrix:
        linux_node20:
          vmImage: "ubuntu-latest"
          nodeVersion: "20.x"
        linux_node22:
          vmImage: "ubuntu-latest"
          nodeVersion: "22.x"
        windows_node20:
          vmImage: "windows-latest"
          nodeVersion: "20.x"
      maxParallel: 3
    pool:
      vmImage: $(vmImage)
    steps:
      - task: NodeTool@0
        inputs:
          versionSpec: $(nodeVersion)
      - script: npm ci && npm test
        displayName: "Test on $(vmImage) with Node $(nodeVersion)"
```

## Tarefa 7: Execução condicional

Controle a execução de jobs e steps com condições:

```yaml
# GitHub Actions: Conditional execution with 'if'
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      changed_frontend: ${{ steps.changes.outputs.frontend }}
      changed_backend: ${{ steps.changes.outputs.backend }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Detect changes
        id: changes
        run: |
          if git diff --name-only HEAD~1 | grep -q '^frontend/'; then
            echo "frontend=true" >> $GITHUB_OUTPUT
          else
            echo "frontend=false" >> $GITHUB_OUTPUT
          fi
          if git diff --name-only HEAD~1 | grep -q '^backend/'; then
            echo "backend=true" >> $GITHUB_OUTPUT
          else
            echo "backend=false" >> $GITHUB_OUTPUT
          fi

  deploy-frontend:
    needs: build
    if: needs.build.outputs.changed_frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying frontend changes"

  deploy-backend:
    needs: build
    if: needs.build.outputs.changed_backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying backend changes"

  # Always runs regardless of previous job status
  notify:
    needs: [deploy-frontend, deploy-backend]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Send notification
        if: contains(needs.*.result, 'failure')
        run: echo "One or more deployments failed"
```

```yaml
# Azure Pipelines: Conditions
stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - script: npm run build

  - stage: DeployStaging
    dependsOn: Build
    # Only deploy from main branch
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - job: Deploy
        steps:
          - script: echo "Deploying to staging"

  - stage: DeployProduction
    dependsOn: DeployStaging
    # Only deploy if tagged as release
    condition: and(succeeded(), startsWith(variables['Build.SourceBranch'], 'refs/tags/v'))
    jobs:
      - job: Deploy
        steps:
          - script: echo "Deploying to production"

  - stage: Notify
    dependsOn:
      - DeployStaging
      - DeployProduction
    # Run even if previous stages failed or were skipped
    condition: always()
    jobs:
      - job: NotifyTeam
        steps:
          - script: echo "Pipeline completed"
            condition: succeededOrFailed()
```

## Tarefa 8: Triggers manuais

Configure workflows com trigger manual e parâmetros:

```yaml
# GitHub Actions: workflow_dispatch with inputs
name: Manual deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options:
          - development
          - staging
          - production
      version:
        description: "Version tag to deploy"
        required: true
        type: string
      dry_run:
        description: "Perform a dry run without actual deployment"
        required: false
        type: boolean
        default: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.version }}
      - name: Deploy
        if: ${{ !inputs.dry_run }}
        run: |
          echo "Deploying ${{ inputs.version }} to ${{ inputs.environment }}"
      - name: Dry run
        if: ${{ inputs.dry_run }}
        run: |
          echo "DRY RUN: Would deploy ${{ inputs.version }} to ${{ inputs.environment }}"
```

```yaml
# Azure Pipelines: Manual trigger with runtime parameters
trigger: none  # No automatic trigger

parameters:
  - name: environment
    displayName: "Target environment"
    type: string
    default: staging
    values:
      - development
      - staging
      - production
  - name: version
    displayName: "Version to deploy"
    type: string
  - name: dryRun
    displayName: "Dry run (no actual deployment)"
    type: boolean
    default: false

stages:
  - stage: Deploy
    displayName: "Deploy to ${{ parameters.environment }}"
    jobs:
      - deployment: DeployJob
        environment: ${{ parameters.environment }}
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                  fetchDepth: 0
                - script: git checkout ${{ parameters.version }}
                  displayName: "Checkout version ${{ parameters.version }}"
                - ${{ if not(parameters.dryRun) }}:
                    - script: echo "Deploying ${{ parameters.version }}"
                      displayName: "Deploy"
                - ${{ if parameters.dryRun }}:
                    - script: echo "DRY RUN - would deploy ${{ parameters.version }}"
                      displayName: "Dry run"
```

## Exercícios de quebra e conserto

### Exercício 1: Trigger nunca dispara

O seguinte workflow nunca dispara apesar de pushes para `main` que incluem alterações em `backend/`:

```yaml
name: Backend CI

on:
  push:
    branches: [main]
    paths:
      - "backend/**"
    paths-ignore:        # ERROR: Cannot use both paths and paths-ignore
      - "backend/docs/**"
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Use apenas `paths` com o padrão de exclusão removido, ou trate exclusões de forma diferente. `paths` e `paths-ignore` são mutuamente exclusivos:

```yaml
on:
  push:
    branches: [main]
    paths:
      - "backend/**"
      - "!backend/docs/**"  # Negation pattern to exclude
```

Nota: GitHub Actions não suporta negação em `paths`. A abordagem correta é usar apenas `paths-ignore` ou usar apenas `paths` e aceitar que alterações em docs vão disparar o workflow:

```yaml
on:
  push:
    branches: [main]
    paths:
      - "backend/src/**"
      - "backend/package.json"
      - "backend/package-lock.json"
      - "backend/Dockerfile"
```

</details>

### Exercício 2: Ciclo de dependência entre jobs

```yaml
jobs:
  test:
    needs: build       # ERROR: circular dependency
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  build:
    needs: test        # ERROR: circular dependency
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Remova o ciclo. O build deve vir antes do test:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
```

</details>

### Exercício 3: Agendamento nunca executa

Um Azure Pipeline com trigger agendado nunca executa:

```yaml
trigger:
  branches:
    include:
      - main

schedules:
  - cron: "0 2 * * *"
    displayName: "Nightly"
    branches:
      include:
        - develop    # ERROR: Schedule branch doesn't match trigger branch
    always: false    # Only runs if changes exist since last run
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Garanta que o branch do agendamento esteja incluído no trigger do pipeline, ou defina `always: true`:

```yaml
trigger:
  branches:
    include:
      - main
      - develop

schedules:
  - cron: "0 2 * * *"
    displayName: "Nightly"
    branches:
      include:
        - main
    always: true
```

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "No GitHub Actions, o que acontece quando tanto 'paths' quanto 'paths-ignore' são especificados em um trigger?",
    options: [
      "'paths-ignore' tem precedência sobre 'paths'",
      "'paths' é avaliado primeiro, depois 'paths-ignore' filtra os resultados",
      "O workflow falha na validação porque eles são mutuamente exclusivos",
      "Ambos são avaliados independentemente e combinados com lógica OR"
    ],
    correctIndex: 2,
    explanation: "O GitHub Actions não permite tanto paths quanto paths-ignore no mesmo evento de trigger. Especificar ambos resulta em erro de validação. Você deve usar um ou outro. Use paths para incluir diretórios específicos, ou paths-ignore para excluir diretórios específicos do disparo."
  },
  {
    question: "Como o 'fail-fast' em uma estratégia de matrix afeta a execução dos jobs?",
    options: [
      "Ele faz com que todos os jobs da matrix em execução sejam cancelados quando qualquer job falha",
      "Ele impede que a matrix inicie se a primeira configuração falhar",
      "Ele executa todos os jobs sequencialmente e para na primeira falha",
      "Ele afeta apenas quais resultados são reportados, não a execução"
    ],
    correctIndex: 0,
    explanation: "Quando fail-fast está definido como true (o padrão), o GitHub cancela todos os jobs da matrix em andamento e na fila assim que qualquer job na matrix falha. Definir fail-fast: false permite que todos os jobs da matrix sejam concluídos independentemente de falhas individuais, o que é útil quando você precisa de resultados de todas as configurações."
  },
  {
    question: "No Azure Pipelines, qual é a diferença entre 'condition: succeeded()' e 'condition: always()' em um stage?",
    options: [
      "'succeeded()' executa se o stage anterior teve sucesso; 'always()' executa independentemente do resultado do stage anterior",
      "'succeeded()' verifica apenas o predecessor imediato; 'always()' verifica todos os predecessores",
      "Eles são idênticos em comportamento para stages",
      "'always()' ignora o requisito 'dependsOn'"
    ],
    correctIndex: 0,
    explanation: "succeeded() (a condição padrão) significa que o stage executa somente se todas as suas dependências (definidas por dependsOn) foram concluídas com sucesso. always() significa que o stage executa independentemente de as dependências terem tido sucesso, falhado ou sido canceladas. Isso é útil para stages de notificação ou limpeza que devem executar mesmo após falhas."
  },
  {
    question: "Qual é a forma correta de disparar um workflow do GitHub Actions quando outro workflow é concluído?",
    options: [
      "Usar 'on: workflow_completed' com o nome do workflow",
      "Usar 'on: workflow_run' com 'types: [completed]' e verificar a conclusão",
      "Usar 'on: repository_dispatch' disparado pelo workflow upstream",
      "Encadear workflows usando 'needs' entre arquivos de workflow"
    ],
    correctIndex: 1,
    explanation: "O evento workflow_run dispara quando uma execução de workflow referenciado é solicitada, está em andamento ou é concluída. Para agir apenas em conclusões bem-sucedidas, adicione uma condição verificando github.event.workflow_run.conclusion == 'success'. A palavra-chave needs funciona apenas entre jobs dentro de um único arquivo de workflow, não entre workflows."
  }
]} />
