---
sidebar_position: 2
title: "Desafio 17: Gates de qualidade e release"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 17: Gates de qualidade e release

:::info Plataforma: GitHub Actions como padrão
O passo a passo principal utiliza GitHub Actions. O equivalente em Azure Pipelines é indicado onde aplicável.
:::

## Habilidades do exame

- Projetar e implementar gates de qualidade e release, incluindo segurança e governança
- Implementar gates pré-deployment e pós-deployment
- Configurar aprovações e verificações de ambiente

---

## Cenário

A Contoso Ltd recentemente sofreu um incidente em produção onde um deployment com vulnerabilidades conhecidas de alta severidade passou pelo pipeline sem revisão. O gerente de release determinou gates de qualidade automatizados antes de qualquer deployment em produção. Nenhum código chega à produção a menos que:

1. Todos os testes automatizados passem com mais de 80% de cobertura de código
2. Zero vulnerabilidades críticas ou altas existam nas dependências
3. Pelo menos dois membros da equipe tenham aprovado a mudança
4. A verificação de regressão de performance confirme que a latência p95 permanece abaixo de 200ms
5. O scan de segurança (Defender for DevOps) não reporte achados críticos

Você deve implementar esses gates em ambientes do GitHub Actions e fornecer o equivalente em Azure Pipelines para os projetos Azure DevOps da equipe.

---

## Tarefas

### Tarefa 1: Configurar regras de proteção de ambiente no GitHub

Crie o ambiente de produção com regras de proteção usando o GitHub CLI:

```bash
# Create the production environment (requires admin access)
gh api repos/contoso-ltd/ecommerce-api/environments/production \
  --method PUT \
  --field wait_timer=5 \
  --field reviewers='[{"type":"Team","id":12345}]' \
  --field deployment_branch_policy='{"protected_branches":true,"custom_branch_policies":false}'
```

Configure as verificações de status obrigatórias nas configurações do repositório. Crie `.github/workflows/quality-gates.yml`:

```yaml
name: Quality Gates

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-and-coverage:
    runs-on: ubuntu-latest
    outputs:
      coverage-percentage: ${{ steps.coverage.outputs.percentage }}

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

      - name: Run tests with coverage
        run: npx jest --coverage --ci --coverageReporters=json-summary --coverageReporters=lcov

      - name: Extract coverage percentage
        id: coverage
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          echo "percentage=$COVERAGE" >> "$GITHUB_OUTPUT"
          echo "Line coverage: $COVERAGE%"

      - name: Upload coverage artifact
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  security-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run dependency audit
        run: |
          npm audit --audit-level=high --json > audit-results.json || true
          CRITICAL=$(cat audit-results.json | jq '.metadata.vulnerabilities.critical // 0')
          HIGH=$(cat audit-results.json | jq '.metadata.vulnerabilities.high // 0')
          echo "Critical: $CRITICAL, High: $HIGH"
          if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
            echo "::error::Found $CRITICAL critical and $HIGH high vulnerabilities"
            exit 1
          fi

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@0.28.0
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-results.sarif

  performance-baseline:
    runs-on: ubuntu-latest
    needs: test-and-coverage

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

      - name: Install dependencies and start server
        run: |
          npm ci
          npx knex migrate:latest
          npx knex seed:run
          npm start &
          for i in $(seq 1 30); do
            curl -s http://localhost:3000/health && break
            sleep 2
          done
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
          sudo apt-get update && sudo apt-get install k6

      - name: Run performance gate test
        run: |
          k6 run --out json=perf-results.json load-tests/gate-check.js
        env:
          BASE_URL: http://localhost:3000
          K6_THRESHOLD_P95: 200

      - name: Upload performance results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: performance-results
          path: perf-results.json
```

### Tarefa 2: Criar uma action customizada de gate de qualidade

Crie `.github/actions/quality-gate/action.yml`:

```yaml
name: 'Quality Gate Check'
description: 'Validates all quality gates pass before deployment'

inputs:
  coverage-threshold:
    description: 'Minimum code coverage percentage'
    required: true
    default: '80'
  coverage-file:
    description: 'Path to coverage summary JSON'
    required: true
  security-scan-passed:
    description: 'Whether security scan passed'
    required: true
  performance-passed:
    description: 'Whether performance gate passed'
    required: true

outputs:
  gate-passed:
    description: 'Whether all quality gates passed'
    value: ${{ steps.evaluate.outputs.passed }}
  gate-summary:
    description: 'Summary of gate results'
    value: ${{ steps.evaluate.outputs.summary }}

runs:
  using: 'composite'
  steps:
    - name: Evaluate quality gates
      id: evaluate
      shell: bash
      run: |
        PASSED=true
        SUMMARY=""

        # Check coverage
        if [ -f "${{ inputs.coverage-file }}" ]; then
          COVERAGE=$(cat "${{ inputs.coverage-file }}" | jq '.total.lines.pct')
          THRESHOLD=${{ inputs.coverage-threshold }}
          if (( $(echo "$COVERAGE >= $THRESHOLD" | bc -l) )); then
            SUMMARY="$SUMMARY\n- Coverage: ${COVERAGE}% (threshold: ${THRESHOLD}%) -- PASSED"
          else
            SUMMARY="$SUMMARY\n- Coverage: ${COVERAGE}% (threshold: ${THRESHOLD}%) -- FAILED"
            PASSED=false
          fi
        else
          SUMMARY="$SUMMARY\n- Coverage: File not found -- FAILED"
          PASSED=false
        fi

        # Check security
        if [ "${{ inputs.security-scan-passed }}" = "true" ]; then
          SUMMARY="$SUMMARY\n- Security scan: No critical/high vulnerabilities -- PASSED"
        else
          SUMMARY="$SUMMARY\n- Security scan: Vulnerabilities found -- FAILED"
          PASSED=false
        fi

        # Check performance
        if [ "${{ inputs.performance-passed }}" = "true" ]; then
          SUMMARY="$SUMMARY\n- Performance: p95 within threshold -- PASSED"
        else
          SUMMARY="$SUMMARY\n- Performance: p95 exceeded threshold -- FAILED"
          PASSED=false
        fi

        echo "passed=$PASSED" >> "$GITHUB_OUTPUT"
        echo "summary<<EOF" >> "$GITHUB_OUTPUT"
        echo -e "$SUMMARY" >> "$GITHUB_OUTPUT"
        echo "EOF" >> "$GITHUB_OUTPUT"

        if [ "$PASSED" = "false" ]; then
          echo "::error::Quality gates failed. Deployment blocked."
          exit 1
        fi
```

### Tarefa 3: Implementar o job de deployment com gates de ambiente

Adicione o job de deployment que utiliza o ambiente de produção:

```yaml
  deploy-production:
    runs-on: ubuntu-latest
    needs: [test-and-coverage, security-scan, performance-baseline]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: https://api.contoso.com

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download coverage report
        uses: actions/download-artifact@v4
        with:
          name: coverage-report
          path: ./coverage

      - name: Run quality gate check
        uses: ./.github/actions/quality-gate
        with:
          coverage-threshold: '80'
          coverage-file: './coverage/coverage-summary.json'
          security-scan-passed: ${{ needs.security-scan.result == 'success' }}
          performance-passed: ${{ needs.performance-baseline.result == 'success' }}

      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          az webapp deploy \
            --resource-group contoso-prod-rg \
            --name contoso-ecommerce-api \
            --src-path ./dist \
            --type zip
        env:
          AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS }}
```

### Tarefa 4: Criar o script k6 de gate de performance

Crie `load-tests/gate-check.js`:

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

  const endpoints = [
    { path: '/api/products', method: 'GET' },
    { path: '/api/cart', method: 'GET' },
    { path: '/api/health', method: 'GET' },
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${baseUrl}${endpoint.path}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

### Tarefa 5: Configuração de gates no Azure Pipelines

Crie `azure-pipelines-gates.yml` com gates pré-deployment:

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    displayName: 'Build and test'
    jobs:
      - job: BuildAndTest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npx jest --coverage --ci
            displayName: 'Run tests'

          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/junit.xml'
            condition: always()

          - task: PublishCodeCoverageResults@2
            inputs:
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/coverage/cobertura-coverage.xml'

  - stage: SecurityScan
    displayName: 'Security scan'
    dependsOn: Build
    jobs:
      - job: DependencyScan
        steps:
          - task: MicrosoftSecurityDevOps@1
            displayName: 'Run Microsoft Security DevOps'
            inputs:
              categories: 'secrets,dependencies'

  - stage: DeployProduction
    displayName: 'Deploy to production'
    dependsOn: [Build, SecurityScan]
    jobs:
      - deployment: DeployProd
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to production"
                  displayName: 'Deploy application'
```

Configure o ambiente `production` no Azure DevOps com gates:

```bash
# Using Azure DevOps CLI to configure environment checks
az devops configure --defaults organization=https://dev.azure.com/contoso-ltd project=ecommerce

# Create the environment (done via UI or REST API)
# Navigate to Pipelines > Environments > production > Approvals and checks

# Add approvals: Require 2 reviewers from the release-approvers group
# Add gate: Azure Monitor alerts (no active alerts on production)
# Add gate: REST API health check
```

Configuração de gate de ambiente do Azure Pipelines (definida via portal ou REST API):

```json
{
  "type": {
    "id": "fe1de3ee-a436-41b4-bb20-f6eb4cb879a7",
    "name": "InvokeRestAPI"
  },
  "settings": {
    "displayName": "Health check gate",
    "definitionRef": {
      "id": "9c94e4ce-a8cf-11e7-a3ef-0050568a4487",
      "name": "InvokeRestAPI",
      "version": "0.0.1"
    },
    "inputs": {
      "connectedServiceNameSelector": "connectedServiceName",
      "connectedServiceName": "contoso-health-endpoint",
      "method": "GET",
      "urlSuffix": "/api/health",
      "headers": "",
      "body": "",
      "waitForCompletion": "false",
      "successCriteria": "eq(root['status'], 'healthy')"
    }
  },
  "timeout": 43200,
  "retryOn": "all",
  "evaluationOptions": {
    "period": 300000,
    "timeout": 86400000,
    "initialDelay": 0
  }
}
```

### Tarefa 6: Integrar o Defender for DevOps como gate de release

Adicione o scan do Microsoft Security DevOps ao workflow do GitHub:

```yaml
  defender-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Microsoft Security DevOps
        uses: microsoft/security-devops-action@v1
        id: msdo
        with:
          categories: 'IaC,secrets,code'

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: ${{ steps.msdo.outputs.sarifFile }}

      - name: Fail on critical findings
        run: |
          if [ -f "${{ steps.msdo.outputs.sarifFile }}" ]; then
            CRITICAL_COUNT=$(cat "${{ steps.msdo.outputs.sarifFile }}" | \
              jq '[.runs[].results[] | select(.level == "error")] | length')
            if [ "$CRITICAL_COUNT" -gt 0 ]; then
              echo "::error::Found $CRITICAL_COUNT critical security findings"
              exit 1
            fi
          fi
```

---

## Exercícios de quebra e conserto

### O problema

Após configurar todos os gates de qualidade, o deployment para produção fica bloqueado indefinidamente. O workflow mostra o job `deploy-production` como "Waiting" e nunca prossegue, mesmo que todos os testes passem e o PR tenha sido aprovado.

A equipe observa:

- O job de scan de segurança reporta sucesso
- A cobertura está em 85% (acima do threshold)
- Os testes de performance passam
- Dois revisores aprovaram
- Mas o job de deployment nunca inicia

---


<details>
<summary>Mostrar solução</summary>

### Análise de causa raiz

**Problema 1: Dependência circular nas verificações de status obrigatórias**

A proteção de branch do repositório exige que a verificação de status `deploy-production` passe antes do merge. Mas `deploy-production` só executa após o merge para `main`. Isso cria um deadlock: o PR não pode ser mergeado porque está aguardando uma verificação que só executa após o merge.

**Problema 2: Falso positivo no gate de REST API health (Azure Pipelines)**

O gate do Azure Pipelines consulta o endpoint de health, mas o critério de sucesso usa `eq(root['status'], 'healthy')` enquanto a API real retorna `{"status": "ok"}`. O gate reavalia a cada 5 minutos mas nunca passa.

**Problema 3: Revisor do ambiente não recebe notificação**

A regra de proteção do ambiente do GitHub referencia um ID de equipe que não existe mais (a equipe foi renomeada). O GitHub silenciosamente ignora o requisito de revisão, mas o job permanece em estado pendente aguardando o timer de espera configurado que foi definido com um valor excessivamente alto.


### Correção

**Correção 1:** Remova `deploy-production` das verificações de status obrigatórias. Apenas verificações de gate que executam em PRs (testes, scan de segurança, cobertura) devem ser obrigatórias:

```bash
# Update branch protection to only require PR-time checks
gh api repos/contoso-ltd/ecommerce-api/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["test-and-coverage","security-scan","performance-baseline"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2}'
```

**Correção 2:** Corrija o critério de sucesso do gate no Azure Pipelines para corresponder à resposta real da API:

```json
{
  "successCriteria": "eq(root['status'], 'ok')"
}
```

Ou atualize o endpoint de health para retornar o formato esperado. Sempre verifique os critérios do gate contra a resposta real do endpoint antes de habilitar o gate.

**Correção 3:** Atualize a proteção do ambiente para referenciar a equipe correta e definir um timer de espera razoável:

```bash
gh api repos/contoso-ltd/ecommerce-api/environments/production \
  --method PUT \
  --field wait_timer=0 \
  --field reviewers='[{"type":"Team","id":67890}]'
```

Verifique que a equipe existe e tem membros:

```bash
gh api orgs/contoso-ltd/teams/release-approvers/members --jq '.[].login'
```


</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "No GitHub Actions, qual é a relação entre regras de proteção de 'environment' e dependências 'needs'?",
    options: [
      "'needs' substitui a proteção de ambiente; eles não podem ser usados juntos",
      "O job deve satisfazer tanto 'needs' (jobs predecessores bem-sucedidos) quanto as regras de ambiente (aprovações, timers de espera) antes de ser executado",
      "As regras de proteção de ambiente substituem completamente as dependências 'needs'",
      "'needs' se aplica a jobs; proteção de ambiente se aplica apenas a workflows"
    ],
    correctIndex: 1,
    explanation: "Ambas as restrições devem ser satisfeitas. A palavra-chave needs garante que os jobs predecessores sejam concluídos com sucesso, enquanto as regras de proteção de ambiente adicionam gates adicionais (aprovações manuais, timers de espera, revisores obrigatórios). O job só inicia quando todas as condições são atendidas."
  },
  {
    question: "No Azure Pipelines, o que acontece quando a avaliação de um gate pré-deployment falha?",
    options: [
      "O deployment é cancelado imediatamente",
      "O gate é reavaliado no intervalo configurado até passar ou atingir o timeout",
      "O pipeline falha e deve ser reiniciado manualmente",
      "O resultado do gate é ignorado e o deployment prossegue"
    ],
    correctIndex: 1,
    explanation: "Os gates do Azure Pipelines usam um modelo de polling. Quando uma avaliação de gate retorna um resultado negativo, o sistema aguarda o período configurado (intervalo de reavaliação) e tenta novamente. Isso continua até o gate passar ou o timeout ser atingido, momento em que o deployment falha."
  },
  {
    question: "Qual permissão do GitHub Actions é necessária para fazer upload de arquivos SARIF de um scanner de segurança?",
    options: [
      "'contents: write'",
      "'security-events: write'",
      "'actions: write'",
      "'packages: write'"
    ],
    correctIndex: 1,
    explanation: "A permissão security-events: write é necessária para fazer upload de arquivos SARIF (Static Analysis Results Interchange Format) para os alertas de code scanning do GitHub. Isso permite que resultados de ferramentas como Trivy, CodeQL ou Microsoft Security DevOps apareçam na aba Security."
  },
  {
    question: "Qual é o principal risco de incluir verificações de status de deployment nas verificações obrigatórias de proteção de branch?",
    options: [
      "Deployments executam em todo pull request, desperdiçando recursos",
      "Uma dependência circular onde o PR não pode ser mergeado porque aguarda uma verificação pós-merge",
      "A proteção de branch impede que o deployment acesse secrets",
      "Verificações obrigatórias tornam o pipeline de CI mais lento para todos os contribuidores"
    ],
    correctIndex: 1,
    explanation: "Se uma verificação de deployment só executa na branch main (pós-merge) mas está listada como verificação de status obrigatória para merge na main, ocorre um deadlock. O PR aguarda uma verificação que nunca será executada até que o PR seja mergeado. Apenas verificações que executam em eventos de pull request devem ser obrigatórias."
  }
]} />

## Limpeza

Remova a infraestrutura de gates de qualidade após completar o desafio:

```bash
# Remove workflow files
rm .github/workflows/quality-gates.yml

# Remove custom action
rm -rf .github/actions/quality-gate/

# Remove load test gate script
rm load-tests/gate-check.js

# Remove Azure Pipelines gates file
rm -f azure-pipelines-gates.yml

# Remove environment (requires admin)
gh api repos/contoso-ltd/ecommerce-api/environments/production --method DELETE

# Reset branch protection (be careful in real repositories)
gh api repos/contoso-ltd/ecommerce-api/branches/main/protection \
  --method DELETE
```

# Desafio 17: Gates de qualidade e release

Este desafio está em desenvolvimento.
