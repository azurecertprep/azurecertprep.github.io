---
sidebar_position: 1
title: "Desafio 16: Estratégia de testes em pipelines"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 16: Estratégia de testes em pipelines

:::info Plataforma: GitHub Actions como padrão
O passo a passo principal utiliza GitHub Actions. O equivalente em Azure Pipelines é indicado onde aplicável.
:::

## Habilidades do exame

- Projetar uma estratégia abrangente de testes, incluindo testes locais, testes unitários, testes de integração e testes de carga
- Implementar testes em um pipeline, incluindo configuração de tarefas de teste, configuração de agentes de teste e integração de resultados de teste

---

## Cenário

A Contoso Ltd opera uma plataforma de e-commerce que realiza deploy três vezes por dia. A equipe não possui testes automatizados em seu pipeline de CI/CD. No último mês, quatro deployments introduziram regressões que quebraram os fluxos de checkout em produção.

O CTO emitiu uma diretriz: "Nada chega à produção sem passar por testes automatizados em cada camada."

Você é o engenheiro DevOps responsável por implementar uma pirâmide de testes no pipeline de CI:

- **Testes unitários** -- rápidos, isolados, sem dependências externas
- **Testes de integração** -- endpoints de API validados contra um banco de dados PostgreSQL real
- **Testes de carga** -- baseline de performance garantindo que a API de checkout suporta o tráfego esperado

A aplicação é uma API Node.js Express com backend PostgreSQL, hospedada no repositório `contoso-ecommerce`.

---

## Tarefas

### Tarefa 1: Criar o workflow de testes com estratégia matrix

Crie `.github/workflows/test-pipeline.yml` que executa testes unitários em múltiplas versões do Node.js:

```yaml
name: Test Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
      fail-fast: false

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests with coverage
        run: npx jest --coverage --ci --reporters=default --reporters=jest-junit
        env:
          JEST_JUNIT_OUTPUT_DIR: ./reports
          JEST_JUNIT_OUTPUT_NAME: junit-results.xml

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-node-${{ matrix.node-version }}
          path: ./reports/junit-results.xml

      - name: Upload coverage report
        if: matrix.node-version == 20
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: ./coverage/lcov.info
```

### Tarefa 2: Configurar o Jest para testes unitários com cobertura

Crie `jest.config.js`:

```javascript
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.js', '**/*.spec.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**',
    '!src/**/index.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'cobertura'],
  reporters: ['default', 'jest-junit'],
};
```

Adicione as dependências de desenvolvimento necessárias:

```bash
npm install --save-dev jest jest-junit @types/jest
```

### Tarefa 3: Adicionar testes de integração com um service container PostgreSQL

Adicione o job de testes de integração ao workflow:

```yaml
  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: contoso_test
          POSTGRES_PASSWORD: test_password_ci
          POSTGRES_DB: ecommerce_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U contoso_test"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npx knex migrate:latest
        env:
          DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test

      - name: Seed test data
        run: npx knex seed:run
        env:
          DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test

      - name: Run integration tests
        run: npx jest --config jest.integration.config.js --ci --forceExit
        env:
          DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test
          API_PORT: 3001
          NODE_ENV: test

      - name: Upload integration test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: ./reports/integration-junit.xml
```

### Tarefa 4: Adicionar testes de carga com k6

Crie `load-tests/checkout-load.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

  const cartPayload = JSON.stringify({
    items: [{ productId: 'PROD-001', quantity: 2 }],
  });

  const cartRes = http.post(`${baseUrl}/api/cart`, cartPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(cartRes, {
    'cart created': (r) => r.status === 201,
    'cart has id': (r) => r.json('id') !== undefined,
  });

  sleep(1);
}
```

Adicione o job de testes de carga ao workflow:

```yaml
  load-tests:
    runs-on: ubuntu-latest
    needs: integration-tests

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: contoso_test
          POSTGRES_PASSWORD: test_password_ci
          POSTGRES_DB: ecommerce_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U contoso_test"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup database
        run: |
          npx knex migrate:latest
          npx knex seed:run
        env:
          DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test

      - name: Start application server
        run: |
          npm start &
          sleep 5
          curl --retry 10 --retry-delay 2 --retry-connrefused http://localhost:3000/health
        env:
          DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test
          API_PORT: 3000

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
            | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load tests
        run: k6 run load-tests/checkout-load.js --out json=load-test-results.json
        env:
          BASE_URL: http://localhost:3000

      - name: Upload load test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: load-test-results.json
```

### Tarefa 5: Publicar resultados de testes como comentários em PRs

Adicione um job que comenta os resultados dos testes em pull requests:

```yaml
  report-results:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests, load-tests]
    if: github.event_name == 'pull_request'

    permissions:
      pull-requests: write

    steps:
      - name: Download all test artifacts
        uses: actions/download-artifact@v4
        with:
          path: ./artifacts

      - name: Post test summary to PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const path = require('path');

            let summary = '## Test Results Summary\n\n';
            summary += '| Suite | Status |\n|-------|--------|\n';
            summary += '| Unit Tests (Node 18) | Passed |\n';
            summary += '| Unit Tests (Node 20) | Passed |\n';
            summary += '| Unit Tests (Node 22) | Passed |\n';
            summary += '| Integration Tests | Passed |\n';
            summary += '| Load Tests | Passed |\n';

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: summary
            });
```

### Tarefa 6: Equivalente em Azure Pipelines

Para equipes que utilizam Azure DevOps, configure o pipeline equivalente em `azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: UnitTests
    displayName: 'Unit tests'
    jobs:
      - job: Test
        strategy:
          matrix:
            Node18:
              nodeVersion: '18.x'
            Node20:
              nodeVersion: '20.x'
            Node22:
              nodeVersion: '22.x'

        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '$(nodeVersion)'
            displayName: 'Install Node.js $(nodeVersion)'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npx jest --coverage --ci --reporters=default --reporters=jest-junit
            displayName: 'Run unit tests'
            env:
              JEST_JUNIT_OUTPUT_DIR: $(System.DefaultWorkingDirectory)/results
              JEST_JUNIT_OUTPUT_NAME: junit.xml

          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/junit.xml'
              mergeTestResults: true
              testRunTitle: 'Unit Tests - Node $(nodeVersion)'
            condition: always()

          - task: PublishCodeCoverageResults@2
            inputs:
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/coverage/cobertura-coverage.xml'
            condition: eq(variables['nodeVersion'], '20.x')

  - stage: IntegrationTests
    displayName: 'Integration tests'
    dependsOn: UnitTests
    jobs:
      - job: IntegrationTest
        services:
          postgres:
            image: postgres:16
            ports:
              - 5432:5432
            env:
              POSTGRES_USER: contoso_test
              POSTGRES_PASSWORD: test_password_ci
              POSTGRES_DB: ecommerce_test

        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: |
              npx knex migrate:latest
              npx knex seed:run
            displayName: 'Setup database'
            env:
              DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test

          - script: npx jest --config jest.integration.config.js --ci --forceExit
            displayName: 'Run integration tests'
            env:
              DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test
              API_PORT: 3001
              NODE_ENV: test

          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/integration-junit.xml'
              testRunTitle: 'Integration Tests'
            condition: always()

  - stage: LoadTests
    displayName: 'Load tests'
    dependsOn: IntegrationTests
    jobs:
      - job: LoadTest
        steps:
          - script: |
              sudo gpg -k
              sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
                --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
              echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
                | sudo tee /etc/apt/sources.list.d/k6.list
              sudo apt-get update && sudo apt-get install k6
            displayName: 'Install k6'

          - script: k6 run load-tests/checkout-load.js --out json=results.json
            displayName: 'Run load tests'
            env:
              BASE_URL: http://localhost:3000

          - task: PublishPipelineArtifact@1
            inputs:
              targetPath: 'results.json'
              artifactName: 'load-test-results'
```

---

## Exercícios de quebra e conserto

### O problema

Após implementar o workflow, os testes passam localmente nas máquinas dos desenvolvedores mas falham no CI com os seguintes erros:

**Sintoma 1:** Testes de integração falham com `ECONNREFUSED 127.0.0.1:5432`

**Sintoma 2:** Testes unitários falham no Node.js 22 com `TypeError: fetch is not defined`

**Sintoma 3:** Testes de carga reportam 100% de taxa de falha apesar da aplicação ter iniciado

---


<details>
<summary>Mostrar solução</summary>

### Análise de causa raiz

**Problema 1: Service container não está pronto**

O service container do PostgreSQL leva tempo para inicializar. Mesmo que o workflow defina health checks, o passo de migração da aplicação começa antes do banco de dados aceitar conexões.

As opções de health check apenas garantem que o container está em execução, não que ele está pronto para o banco de dados de teste específico.

**Problema 2: Compatibilidade de versão do Node.js**

A aplicação usa um polyfill para `fetch` que conflita com o `fetch` nativo do Node.js 22. A configuração de teste não leva em conta as diferenças de versão nas APIs globais.

**Problema 3: Condição de corrida na inicialização do servidor**

O job de teste de carga inicia o k6 antes do servidor Express terminar de fazer bind na porta 3000. O `sleep 5` é insuficiente em runners de CI sob carga.


### Correção

**Correção 1:** Adicione um passo explícito de espera pelo banco de dados antes das migrações:

```yaml
      - name: Wait for PostgreSQL
        run: |
          for i in $(seq 1 30); do
            pg_isready -h localhost -p 5432 -U contoso_test && break
            echo "Waiting for postgres... attempt $i"
            sleep 2
          done
```

**Correção 2:** Trate condicionalmente o polyfill de fetch no setup de testes:

```javascript
// jest.setup.js
if (typeof globalThis.fetch === 'undefined') {
  const { fetch, Headers, Request, Response } = require('undici');
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}
```

**Correção 3:** Substitua o `sleep` por um loop de retry que confirma que o servidor responde:

```yaml
      - name: Start application server
        run: |
          npm start &
          for i in $(seq 1 30); do
            if curl -s http://localhost:3000/health > /dev/null 2>&1; then
              echo "Server is ready"
              break
            fi
            echo "Waiting for server... attempt $i"
            sleep 2
          done
          curl -f http://localhost:3000/health || exit 1
        env:
          DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test
          API_PORT: 3000
```


</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Em um workflow do GitHub Actions usando estratégia matrix, o que 'fail-fast: false' faz?",
    options: [
      "Impede que o workflow seja executado se alguma combinação da matrix for inválida",
      "Permite que todas as combinações da matrix sejam concluídas mesmo se uma falhar",
      "Executa as combinações da matrix sequencialmente em vez de em paralelo",
      "Ignora o relatório de testes para combinações da matrix que falharam"
    ],
    correctIndex: 1,
    explanation: "Por padrão, o GitHub Actions cancela todos os jobs da matrix em andamento quando algum falha. Configurar fail-fast: false permite que todas as combinações sejam executadas até o fim, o que é importante ao testar compatibilidade entre múltiplas versões -- você quer saber quais versões passam e quais falham."
  },
  {
    question: "Qual configuração de health check garante que um service container PostgreSQL está pronto antes que os passos do workflow sejam executados?",
    options: [
      "Configurar 'ports: ['5432:5432']' na definição do serviço",
      "Adicionar 'options: --health-cmd=\"pg_isready\" --health-interval=10s --health-retries=5'",
      "Usar 'needs: postgres' na definição do job",
      "Configurar 'services.postgres.ready: true'"
    ],
    correctIndex: 1,
    explanation: "O campo options passa argumentos de health check do Docker para o container. O GitHub Actions aguarda o health check ser aprovado antes de prosseguir com os passos do job. pg_isready é a sonda padrão de prontidão do PostgreSQL."
  },
  {
    question: "No Azure Pipelines, qual task publica resultados de teste JUnit para que apareçam na aba Tests?",
    options: [
      "'PublishPipelineArtifact@1'",
      "'PublishTestResults@2'",
      "'PublishCodeCoverageResults@2'",
      "'DownloadBuildArtifacts@1'"
    ],
    correctIndex: 1,
    explanation: "A task PublishTestResults@2 analisa arquivos nos formatos JUnit, NUnit, VSTest, xUnit ou CTest e os publica na aba Tests do Azure Pipelines. PublishCodeCoverageResults@2 é especificamente para dados de cobertura, não para resultados de aprovação/falha de testes."
  },
  {
    question: "Qual é o principal propósito dos thresholds do k6 em um pipeline de CI?",
    options: [
      "Definir o número de usuários virtuais para o teste",
      "Definir critérios de aprovação/falha que determinam o código de saída do processo k6",
      "Configurar a duração de cada estágio do teste de carga",
      "Especificar quais endpoints testar"
    ],
    correctIndex: 1,
    explanation: "Os thresholds definem critérios de aprovação/falha baseados em SLO. Se algum threshold for violado, o k6 encerra com código diferente de zero, o que faz o passo do CI falhar. Isso permite a detecção automatizada de regressão de performance no pipeline."
  }
]} />

## Limpeza

Remova a infraestrutura de testes após completar o desafio:

```bash
# Remove the workflow file
rm .github/workflows/test-pipeline.yml

# Remove test configuration files
rm jest.config.js jest.integration.config.js jest.setup.js

# Remove load test files
rm -rf load-tests/

# Remove Azure Pipelines file if created
rm -f azure-pipelines.yml

# Remove test dependencies
npm uninstall jest jest-junit @types/jest undici

# Clean up generated reports
rm -rf coverage/ reports/
```
