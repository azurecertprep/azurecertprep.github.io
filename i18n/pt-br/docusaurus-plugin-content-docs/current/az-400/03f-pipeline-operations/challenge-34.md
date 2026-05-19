---
sidebar_position: 1
title: "Desafio 34: Monitoramento de saúde do pipeline"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 34: Monitoramento de saúde do pipeline

:::info Plataforma: comparação
Este desafio cobre tanto GitHub Actions quanto Azure Pipelines para observabilidade de pipeline.
:::

## Habilidades do exame mapeadas

- Monitorar a saúde do pipeline, incluindo taxa de falha, duração e testes instáveis (flaky tests)

## Cenário

O pipeline principal de CI da Contoso Ltd (`contoso-api-ci`) leva em média 45 minutos para ser concluído e falha em aproximadamente 30% de todas as execuções. A taxa de falha tem aumentado nos últimos 3 meses, e as equipes de desenvolvimento perderam a confiança no pipeline. Comportamentos comuns observados:

- Desenvolvedores fazem push diretamente na main para pular o CI ("vai falhar de qualquer forma")
- Os mesmos testes passam ao tentar novamente sem nenhuma alteração de código (flaky tests)
- Tempos de fila de build aumentam durante horários de pico (9-11h)
- Ninguém percebe quando o pipeline está quebrado há horas

O gerente de engenharia precisa restaurar a confiança no CI identificando as causas raiz, implementando gerenciamento de testes instáveis e criando visibilidade nas métricas de saúde do pipeline.

## Tarefa 1: Identificar testes instáveis (flaky tests)

Testes instáveis passam e falham de forma intermitente sem alterações de código. Implemente detecção e gerenciamento:

```yaml
# GitHub Actions - .github/workflows/ci.yml
# Add test retry with flaky test annotation
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - name: Run tests with retry for flaky detection
        run: |
          # Run tests with Jest retry configuration
          npx jest --ci --reporters=default --reporters=jest-junit \
            --testResultsProcessor=jest-flaky-test-reporter \
            --forceExit --detectOpenHandles
        env:
          JEST_JUNIT_OUTPUT_DIR: ./test-results
          JEST_JUNIT_OUTPUT_NAME: junit.xml

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: ./test-results/

      - name: Publish test report
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: "Jest Tests"
          path: "./test-results/junit.xml"
          reporter: java-junit
          fail-on-error: false
```

Configure o Jest para detectar testes instáveis:

```javascript
// jest.config.js - retry configuration for flaky detection
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  // Retry failed tests up to 2 times
  // If a test passes on retry, it is marked as flaky
  retryTimes: 2,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' > ',
      addFileAttribute: 'true'
    }]
  ],
  // Log when a test is retried
  verbose: true
};
```

Para Azure Pipelines, use a detecção de testes instáveis integrada:

```yaml
# azure-pipelines.yml - Flaky test management
trigger:
  branches:
    include: [main]

pool:
  vmImage: "ubuntu-latest"

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "20.x"

  - script: npm ci
    displayName: "Install dependencies"

  - script: npx jest --ci --reporters=default --reporters=jest-junit
    displayName: "Run tests"
    env:
      JEST_JUNIT_OUTPUT_DIR: $(System.DefaultWorkingDirectory)/test-results
      JEST_JUNIT_OUTPUT_NAME: junit.xml

  - task: PublishTestResults@2
    displayName: "Publish test results"
    condition: always()
    inputs:
      testResultsFormat: "JUnit"
      testResultsFiles: "**/junit.xml"
      searchFolder: "$(System.DefaultWorkingDirectory)/test-results"
      # Enable flaky test detection - Azure DevOps marks tests as flaky
      # if they pass and fail on the same code commit
      failTaskOnFailedTests: false
      failTaskOnMissingResultsFile: false
```

Habilite o gerenciamento de testes instáveis nas configurações do projeto Azure DevOps:

```bash
# Azure DevOps REST API - Enable flaky test detection
# Project Settings > Test Management > Flaky test detection
az devops invoke \
  --area testflakiness \
  --resource settings \
  --org https://dev.azure.com/contoso \
  --route-parameters project=ContosoAPI \
  --http-method PATCH \
  --in-file flaky-settings.json

# flaky-settings.json content:
# {
#   "flakySettings": {
#     "flakyDetection": {
#       "isEnabled": true,
#       "flakyDetectionType": "system"
#     },
#     "flakyInSummaryReport": true
#   }
# }
```

## Tarefa 2: Análise de execuções de workflow no GitHub Actions

Use a API do GitHub para rastrear tendências de desempenho do workflow:

```bash
# Get workflow runs for analysis
gh run list --workflow=ci.yml --limit 100 --json \
  databaseId,status,conclusion,createdAt,updatedAt,headBranch \
  --jq '.[] | {id: .databaseId, status: .conclusion, duration_seconds: (((.updatedAt | fromdateiso8601) - (.createdAt | fromdateiso8601))), branch: .headBranch}'

# Calculate failure rate over last 30 days
gh run list --workflow=ci.yml --limit 200 --json conclusion \
  --jq '[.[] | .conclusion] | {total: length, failures: ([.[] | select(. == "failure")] | length), success_rate: (([.[] | select(. == "success")] | length) / length * 100)}'

# Get average duration of successful runs
gh run list --workflow=ci.yml --limit 50 --json conclusion,createdAt,updatedAt \
  --jq '[.[] | select(.conclusion == "success") | ((.updatedAt | fromdateiso8601) - (.createdAt | fromdateiso8601))] | (add / length / 60) | "Average duration: \(.) minutes"'

# Find the slowest jobs
gh run view {run-id} --json jobs \
  --jq '.jobs | sort_by(.completedAt | fromdateiso8601 - (.startedAt | fromdateiso8601)) | reverse | .[:5] | .[] | "\(.name): \(((.completedAt | fromdateiso8601) - (.startedAt | fromdateiso8601)) / 60) minutes"'
```

Crie um workflow reutilizável para rastrear métricas:

```yaml
# .github/workflows/pipeline-metrics.yml
name: Pipeline metrics collector

on:
  workflow_run:
    workflows: ["CI Pipeline"]
    types: [completed]

permissions:
  actions: read
  issues: write

jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Collect run metrics
        uses: actions/github-script@v7
        with:
          script: |
            const run = context.payload.workflow_run;
            const duration = (new Date(run.updated_at) - new Date(run.created_at)) / 1000 / 60;

            // Get job details for breakdown
            const jobs = await github.rest.actions.listJobsForWorkflowRun({
              owner: context.repo.owner,
              repo: context.repo.repo,
              run_id: run.id
            });

            const metrics = {
              run_id: run.id,
              conclusion: run.conclusion,
              duration_minutes: duration.toFixed(2),
              branch: run.head_branch,
              triggered_by: run.triggering_actor.login,
              jobs: jobs.data.jobs.map(j => ({
                name: j.name,
                conclusion: j.conclusion,
                duration: ((new Date(j.completed_at) - new Date(j.started_at)) / 1000 / 60).toFixed(2)
              }))
            };

            console.log(JSON.stringify(metrics, null, 2));

            // Alert if duration exceeds threshold (45 min)
            if (duration > 45) {
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `Pipeline exceeded duration threshold: ${duration.toFixed(0)} minutes`,
                body: `Run #${run.run_number} took ${duration.toFixed(1)} minutes (threshold: 45 min).\n\nJob breakdown:\n${metrics.jobs.map(j => `- ${j.name}: ${j.duration} min (${j.conclusion})`).join('\n')}`,
                labels: ['pipeline-health', 'performance']
              });
            }
```

## Tarefa 3: Dashboard de análise do Azure Pipelines

Configure e use a análise de pipeline integrada no Azure DevOps:

```bash
# Access pipeline analytics via REST API
# Get pipeline run statistics for last 30 days
az devops invoke \
  --area pipelines \
  --resource runs \
  --org https://dev.azure.com/contoso \
  --route-parameters project=ContosoAPI pipelineId=42 \
  --query-parameters '$top=100' \
  --output json | \
  jq '{
    total_runs: length,
    succeeded: [.[] | select(.result == "succeeded")] | length,
    failed: [.[] | select(.result == "failed")] | length,
    canceled: [.[] | select(.result == "canceled")] | length,
    avg_duration_minutes: ([.[] | select(.result == "succeeded") | (.finishedDate | fromdateiso8601) - (.createdDate | fromdateiso8601)] | add / length / 60)
  }'
```

Navegue até a análise de pipeline no Azure DevOps:
1. Pipelines > Selecione o pipeline > Aba Analytics
2. Métricas principais disponíveis:
   - Taxa de aprovação (últimos 14/30/90 dias)
   - Duração média com tendência
   - Taxa de aprovação de testes com detalhamento de testes instáveis
   - Detalhamento de duração por task/stage

Crie um widget de análise personalizado para o dashboard da equipe:

```yaml
# Use the Analytics OData endpoint for custom queries
# Example: Pipeline failure analysis by day of week
# URL: https://analytics.dev.azure.com/contoso/ContosoAPI/_odata/v4.0-preview/PipelineRuns
#   ?$apply=filter(
#     Pipeline/PipelineName eq 'contoso-api-ci'
#     and CompletedDate ge 2024-01-01Z
#   )
#   /groupby(
#     (CompletedDateSK, RunOutcome),
#     aggregate($count as RunCount)
#   )
```

## Tarefa 4: Rastrear métricas do pipeline (taxa de falha, MTTR, tempo de fila)

Defina e rastreie indicadores-chave de saúde do pipeline:

```yaml
# .github/workflows/health-report.yml
name: Weekly pipeline health report

on:
  schedule:
    - cron: "0 9 * * 1"  # Every Monday at 9 AM UTC
  workflow_dispatch:

permissions:
  actions: read
  issues: write

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - name: Generate health report
        uses: actions/github-script@v7
        with:
          script: |
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            // Get all workflow runs from last week
            const runs = await github.paginate(
              github.rest.actions.listWorkflowRuns,
              {
                owner: context.repo.owner,
                repo: context.repo.repo,
                workflow_id: 'ci.yml',
                created: `>=${oneWeekAgo.toISOString().split('T')[0]}`,
                per_page: 100
              }
            );

            // Calculate metrics
            const completed = runs.filter(r => r.status === 'completed');
            const succeeded = completed.filter(r => r.conclusion === 'success');
            const failed = completed.filter(r => r.conclusion === 'failure');

            const successRate = ((succeeded.length / completed.length) * 100).toFixed(1);

            // Calculate average duration for successful runs
            const durations = succeeded.map(r =>
              (new Date(r.updated_at) - new Date(r.created_at)) / 1000 / 60
            );
            const avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1);
            const p95Duration = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)]?.toFixed(1) || 'N/A';

            // Calculate MTTR (time from failure to next success on same branch)
            let mttrValues = [];
            const mainRuns = completed
              .filter(r => r.head_branch === 'main')
              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            for (let i = 0; i < mainRuns.length - 1; i++) {
              if (mainRuns[i].conclusion === 'failure' && mainRuns[i+1].conclusion === 'success') {
                const recovery = (new Date(mainRuns[i+1].updated_at) - new Date(mainRuns[i].created_at)) / 1000 / 60;
                mttrValues.push(recovery);
              }
            }
            const avgMTTR = mttrValues.length > 0
              ? (mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length).toFixed(0)
              : 'N/A';

            const report = `## Weekly pipeline health report

            | Métrica | Valor | Meta |
            |---------|-------|------|
            | Taxa de sucesso | ${successRate}% | > 90% |
            | Duração média | ${avgDuration} min | < 15 min |
            | Duração P95 | ${p95Duration} min | < 25 min |
            | MTTR (tempo médio de recuperação) | ${avgMTTR} min | < 30 min |
            | Total de execuções | ${completed.length} | - |
            | Execuções com falha | ${failed.length} | - |

            ### Failure breakdown
            ${failed.slice(0, 10).map(r => `- [Run #${r.run_number}](${r.html_url}) - ${r.head_branch} - ${new Date(r.created_at).toLocaleDateString()}`).join('\n')}
            `;

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Pipeline Health Report - Week of ${oneWeekAgo.toISOString().split('T')[0]}`,
              body: report,
              labels: ['pipeline-health', 'report']
            });
```

## Tarefa 5: Implementar retry de testes para testes instáveis (com anotação)

Configure retry inteligente de testes que distingue testes instáveis de falhas genuínas:

```yaml
# GitHub Actions - Test retry with flaky annotation
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci

      - name: Run tests (attempt 1)
        id: test1
        continue-on-error: true
        run: npx jest --ci --json --outputFile=results1.json 2>&1 || true

      - name: Identify and retry failed tests
        id: retry
        if: steps.test1.outcome == 'failure'
        run: |
          # Extract failed test names from first run
          FAILED=$(node -e "
            const r = require('./results1.json');
            const failed = r.testResults
              .filter(t => t.status === 'failed')
              .map(t => t.name);
            console.log(failed.join(' '));
          ")

          if [ -n "$FAILED" ]; then
            echo "Retrying failed tests: $FAILED"
            npx jest --ci --json --outputFile=results2.json $FAILED
            RETRY_EXIT=$?

            # Compare results - tests that pass on retry are flaky
            node -e "
              const r1 = require('./results1.json');
              const r2 = require('./results2.json');
              const flaky = r2.testResults
                .filter(t => t.status === 'passed')
                .map(t => t.name);
              if (flaky.length > 0) {
                console.log('::warning::Flaky tests detected: ' + flaky.join(', '));
                const fs = require('fs');
                fs.writeFileSync('flaky-tests.txt', flaky.join('\n'));
              }
              // Fail only if tests still fail on retry
              const stillFailing = r2.testResults.filter(t => t.status === 'failed');
              process.exit(stillFailing.length > 0 ? 1 : 0);
            "
          fi

      - name: Annotate flaky tests
        if: always() && hashFiles('flaky-tests.txt') != ''
        run: |
          while IFS= read -r test; do
            echo "::warning file=$test::This test is flaky - passed on retry without code changes"
          done < flaky-tests.txt

      - name: Upload flaky test report
        if: always() && hashFiles('flaky-tests.txt') != ''
        uses: actions/upload-artifact@v4
        with:
          name: flaky-tests
          path: flaky-tests.txt
```

## Tarefa 6: Configurar alertas para degradação do pipeline

Configure alertas quando as métricas de saúde do pipeline ultrapassam limites:

```yaml
# .github/workflows/pipeline-alert.yml
name: Pipeline degradation alert

on:
  workflow_run:
    workflows: ["CI Pipeline"]
    types: [completed]

jobs:
  check-health:
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'failure'
    steps:
      - name: Check consecutive failures
        uses: actions/github-script@v7
        with:
          script: |
            // Get last 5 runs on main branch
            const runs = await github.rest.actions.listWorkflowRuns({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'ci.yml',
              branch: 'main',
              per_page: 5,
              status: 'completed'
            });

            const recentRuns = runs.data.workflow_runs;
            const consecutiveFailures = recentRuns
              .filter(r => r.conclusion === 'failure').length;

            if (consecutiveFailures >= 3) {
              // Create urgent issue
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `ALERT: ${consecutiveFailures} consecutive pipeline failures on main`,
                body: `The CI pipeline has failed ${consecutiveFailures} times in a row on the main branch.\n\nThis indicates a systemic issue that needs immediate attention.\n\nRecent failures:\n${recentRuns.filter(r => r.conclusion === 'failure').map(r => `- [Run #${r.run_number}](${r.html_url}) at ${r.created_at}`).join('\n')}`,
                labels: ['pipeline-health', 'urgent', 'P1'],
                assignees: ['oncall-engineer']
              });

              // Optionally send to Slack/Teams via webhook
              // await fetch(process.env.SLACK_WEBHOOK, { method: 'POST', body: JSON.stringify({text: '...'}) });
            }
```

Para Azure Pipelines, use Service Hooks:

```bash
# Configure a service hook for pipeline failure notifications
az devops service-endpoint create \
  --service-endpoint-type generic \
  --name "pipeline-alerts-webhook" \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI

# Create service hook subscription for build failures
# Navigate to Project Settings > Service hooks > Create subscription
# Event: Build completed (with filter: status = Failed, branch = main)
# Action: Web hook to Teams/Slack channel
```

## Tarefa 7: Criar um dashboard de saúde do pipeline

Construa um dashboard abrangente mostrando métricas-chave:

```yaml
# GitHub Actions - Generate dashboard data
# .github/workflows/dashboard-update.yml
name: Update pipeline dashboard

on:
  schedule:
    - cron: "0 */6 * * *"  # Every 6 hours

permissions:
  actions: read
  pages: write
  contents: write

jobs:
  update-dashboard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate dashboard data
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');

            // Collect 30 days of data
            const since = new Date();
            since.setDate(since.getDate() - 30);

            const allRuns = await github.paginate(
              github.rest.actions.listWorkflowRuns,
              {
                owner: context.repo.owner,
                repo: context.repo.repo,
                workflow_id: 'ci.yml',
                created: `>=${since.toISOString().split('T')[0]}`,
                status: 'completed',
                per_page: 100
              }
            );

            // Group by date
            const byDate = {};
            allRuns.forEach(run => {
              const date = run.created_at.split('T')[0];
              if (!byDate[date]) byDate[date] = { success: 0, failure: 0, durations: [] };
              if (run.conclusion === 'success') {
                byDate[date].success++;
                byDate[date].durations.push(
                  (new Date(run.updated_at) - new Date(run.created_at)) / 1000 / 60
                );
              } else {
                byDate[date].failure++;
              }
            });

            const dashboardData = Object.entries(byDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, data]) => ({
                date,
                success_rate: ((data.success / (data.success + data.failure)) * 100).toFixed(1),
                avg_duration: data.durations.length > 0
                  ? (data.durations.reduce((a,b) => a+b, 0) / data.durations.length).toFixed(1)
                  : null,
                total_runs: data.success + data.failure
              }));

            fs.writeFileSync('docs/pipeline-health.json', JSON.stringify(dashboardData, null, 2));

      - name: Commit dashboard data
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/pipeline-health.json
          git diff --staged --quiet || git commit -m "Update pipeline health dashboard data"
          git push
```

## Exercícios de quebra e conserto

### Exercício 1: Corrigir resultados de teste enganosos

O pipeline mostra 100% de taxa de aprovação nos testes, mas desenvolvedores relatam bugs em produção. A investigação revela:

```yaml
# BROKEN: Tests never actually fail the build
- script: npx jest --ci || true  # ERROR: '|| true' swallows failures
  displayName: "Run tests"

- task: PublishTestResults@2
  condition: always()
  inputs:
    testResultsFormat: "JUnit"
    testResultsFiles: "**/junit.xml"
    failTaskOnFailedTests: false  # ERROR: Never fails even with test failures
```


<details>
<summary>Mostrar solução</summary>

**Correção:**

```yaml
# FIXED: Tests properly fail the build
- script: npx jest --ci --reporters=default --reporters=jest-junit
  displayName: "Run tests"
  # No '|| true' - let the step fail naturally

- task: PublishTestResults@2
  condition: always()  # Still publish results even on failure (for visibility)
  inputs:
    testResultsFormat: "JUnit"
    testResultsFiles: "**/junit.xml"
    failTaskOnFailedTests: true  # Fail the task if any test failed
    failTaskOnMissingResultsFile: true
```

</details>

### Exercício 2: Corrigir o problema invisível de testes instáveis

Testes estão sendo reexecutados, mas não há visibilidade sobre quais testes são instáveis. A equipe não sabe quais testes priorizar para correção:

```yaml
# BROKEN: Retries mask the problem without tracking
- name: Run tests
  run: |
    for i in 1 2 3; do
      npx jest --ci && break || echo "Attempt $i failed, retrying..."
    done
  # ERROR: No tracking of which tests needed retries
  # ERROR: No annotation or reporting of flaky tests
  # ERROR: Exit code may be wrong (last command in loop)
```


<details>
<summary>Mostrar solução</summary>

**Correção:**

```yaml
# FIXED: Retry with proper tracking and reporting
- name: Run tests with flaky tracking
  run: |
    # First attempt
    npx jest --ci --json --outputFile=attempt1.json 2>&1 || true
    FIRST_EXIT=$?

    if [ $FIRST_EXIT -ne 0 ]; then
      # Extract failed tests for targeted retry
      FAILED=$(node -p "require('./attempt1.json').testResults.filter(t => t.status === 'failed').map(t => t.testFilePath).join(' ')")

      echo "::group::Retrying ${FAILED}"
      npx jest --ci --json --outputFile=attempt2.json $FAILED
      SECOND_EXIT=$?
      echo "::endgroup::"

      if [ $SECOND_EXIT -eq 0 ]; then
        echo "::warning::Flaky tests detected - passed on retry: ${FAILED}"
        echo "FLAKY_DETECTED=true" >> $GITHUB_ENV
      else
        exit 1  # Genuine failure
      fi
    fi

- name: Report flaky tests
  if: env.FLAKY_DETECTED == 'true'
  uses: actions/github-script@v7
  with:
    script: |
      // Create or update tracking issue for flaky tests
      const issues = await github.rest.issues.listForRepo({
        owner: context.repo.owner,
        repo: context.repo.repo,
        labels: 'flaky-test',
        state: 'open'
      });
      // Add comment with today's flaky occurrence
      // ... tracking logic
```

</details>

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que é um teste instável (flaky test) e como o Azure DevOps os detecta automaticamente?",
    options: [
      "Um teste que demora muito; detectado comparando a duração do teste com um limite",
      "Um teste que passa e falha no mesmo commit de código; detectado comparando resultados entre execuções sem alterações de código",
      "Um teste que só falha em sistemas operacionais específicos; detectado pela comparação de builds em matriz",
      "Um teste que requer acesso à rede; detectado monitorando chamadas de rede durante a execução do teste"
    ],
    correctIndex: 1,
    explanation: "Um teste instável é aquele que produz resultados diferentes (aprovação/falha) no mesmo código. A detecção automática de testes instáveis do Azure DevOps funciona comparando resultados de testes entre execuções de pipeline onde o mesmo teste passou e falhou no mesmo commit ou sem alterações de código intermediárias. Uma vez detectados, os testes instáveis podem ser excluídos do cálculo de aprovação/falha."
  },
  {
    question: "O que é MTTR no contexto de saúde do pipeline e por que é importante?",
    options: [
      "Maximum Test Timeout Ratio - o tempo máximo que um teste deve executar antes de ser encerrado",
      "Mean Time To Recovery - o tempo médio desde uma falha no pipeline até a próxima execução bem-sucedida",
      "Minimum Throughput Threshold Requirement - o número mínimo de execuções por dia",
      "Manual Test Trigger Rate - com que frequência os testes são executados manualmente vs automaticamente"
    ],
    correctIndex: 1,
    explanation: "MTTR (Mean Time To Recovery) mede a rapidez com que a equipe consegue corrigir um pipeline quebrado. Um MTTR baixo significa que as falhas são detectadas e resolvidas rapidamente. Um MTTR alto indica que pipelines quebrados ficam sem atendimento, bloqueando toda a equipe. Rastrear o MTTR incentiva práticas como investigação imediata de falhas e alterações menores e mais revisáveis."
  },
  {
    question: "Qual abordagem lida corretamente com retries de testes sem mascarar falhas genuínas?",
    options: [
      "Executar todos os testes com '|| true' e verificar o relatório de testes separadamente",
      "Reexecutar apenas os testes que falharam, marcar aqueles que passam no retry como instáveis e falhar apenas para testes que falham em todas as tentativas",
      "Executar toda a suíte de testes 3 vezes e usar voto majoritário (2/3 aprovações = sucesso)",
      "Desabilitar testes que falham com anotações 'skip' até que sejam corrigidos"
    ],
    correctIndex: 1,
    explanation: "O retry direcionado apenas dos testes que falharam é a abordagem correta. Testes que passam no retry sem alterações de código são marcados como instáveis (para rastreamento e correção priorizada). Testes que falham em todas as tentativas de retry representam regressões genuínas e devem falhar o build. Isso fornece sinal preciso enquanto rastreia dívida de confiabilidade."
  },
  {
    question: "Qual é a resposta recomendada quando a taxa de falha do pipeline ultrapassa 30%?",
    options: [
      "Aumentar o número de retries para 5 para reduzir falhas visíveis",
      "Pular o CI em feature branches e executar apenas na main",
      "Analisar causas de falha, colocar testes instáveis em quarentena, corrigir problemas de infraestrutura e rastrear métricas de melhoria",
      "Mudar para testes manuais até que o pipeline seja reescrito do zero"
    ],
    correctIndex: 2,
    explanation: "Taxas de falha altas requerem investigação sistemática. Categorize as falhas (testes instáveis, problemas de infraestrutura, bugs genuínos), coloque em quarentena os testes sabidamente instáveis (ainda os execute, mas não bloqueie o build), corrija problemas de infraestrutura subjacentes (configurações de timeout, limites de recursos) e estabeleça métricas para rastrear a melhoria ao longo do tempo. Simplesmente ocultar falhas erode ainda mais a confiança."
  }
]} />

## Limpeza

```bash
# Close pipeline health issues
gh issue list --label "pipeline-health" --state open --json number --jq '.[].number' | \
  xargs -I {} gh issue close {}

# Remove dashboard data file if no longer needed
rm -f docs/pipeline-health.json

# Remove test result artifacts older than 7 days
gh run list --workflow=ci.yml --limit 50 --json databaseId,createdAt --jq \
  '.[] | select((.createdAt | fromdateiso8601) < (now - 604800)) | .databaseId' | \
  xargs -I {} gh api repos/{owner}/{repo}/actions/runs/{}/artifacts --jq '.artifacts[].id' | \
  xargs -I {} gh api --method DELETE repos/{owner}/{repo}/actions/artifacts/{}
```
