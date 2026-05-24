---
sidebar_position: 3
title: "Desafio 18: AnÃ¡lise de cobertura de cÃ³digo"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 18: AnÃ¡lise de cobertura de cÃ³digo

:::info Plataforma: GitHub Actions como padrÃ£o
O passo a passo principal utiliza GitHub Actions. O equivalente em Azure Pipelines Ã© indicado onde aplicÃ¡vel.
:::

## Habilidades do exame

- Implementar anÃ¡lise de cobertura de cÃ³digo
- Configurar e integrar ferramentas de cobertura de cÃ³digo com pipelines de CI/CD
- Projetar gates de qualidade baseados em mÃ©tricas de cobertura

---

## CenÃ¡rio

O diretor de engenharia da Contoso Ltd observou um padrÃ£o: serviÃ§os com baixa cobertura de testes sofrem trÃªs vezes mais incidentes em produÃ§Ã£o. Uma nova polÃ­tica estÃ¡ agora em vigor:

1. Nenhum pull request Ã© mergeado se a cobertura geral de linhas cair abaixo de 80%
2. A cobertura nÃ£o deve diminuir em comparaÃ§Ã£o com a branch base (polÃ­tica de ratchet)
3. CÃ³digo novo em um PR deve ter pelo menos 90% de cobertura (diff coverage)
4. TendÃªncias de cobertura devem ser visÃ­veis para a equipe ao longo dos sprints

A equipe de plataforma gerencia trÃªs serviÃ§os em linguagens diferentes:
- **Checkout API** (Node.js, Jest)
- **Inventory service** (Python, pytest)
- **Payment gateway** (.NET, xUnit)

VocÃª deve implementar coleta, enforcement e relatÃ³rios de cobertura em todos os trÃªs stacks.

---

## Tarefas

### Tarefa 1: Configurar cobertura Jest para o serviÃ§o Node.js

Crie `jest.config.js` com configuraÃ§Ãµes de cobertura:

```javascript
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**',
    '!src/**/index.js',
    '!src/migrations/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'cobertura', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

Crie o workflow do GitHub Actions `.github/workflows/coverage.yml`:

```yaml
name: Code Coverage

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  coverage-node:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./services/checkout-api

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: './services/checkout-api/package-lock.json'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npx jest --coverage --ci

      - name: Upload coverage to artifact
        uses: actions/upload-artifact@v4
        with:
          name: coverage-node
          path: services/checkout-api/coverage/

      - name: Coverage summary comment
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const summary = JSON.parse(
              fs.readFileSync('services/checkout-api/coverage/coverage-summary.json', 'utf8')
            );
            const { lines, branches, functions, statements } = summary.total;

            const body = `## Checkout API coverage report

            | Metric | Coverage | Threshold | Status |
            |--------|----------|-----------|--------|
            | Lines | ${lines.pct}% | 80% | ${lines.pct >= 80 ? 'Passed' : 'FAILED'} |
            | Branches | ${branches.pct}% | 80% | ${branches.pct >= 80 ? 'Passed' : 'FAILED'} |
            | Functions | ${functions.pct}% | 80% | ${functions.pct >= 80 ? 'Passed' : 'FAILED'} |
            | Statements | ${statements.pct}% | 80% | ${statements.pct >= 80 ? 'Passed' : 'FAILED'} |`;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: body
            });
```

### Tarefa 2: Configurar cobertura pytest para o serviÃ§o Python

Crie a configuraÃ§Ã£o de cobertura em `services/inventory-service/pyproject.toml`:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "--cov=src --cov-report=xml:coverage/coverage.xml --cov-report=html:coverage/html --cov-report=term-missing --cov-fail-under=80"

[tool.coverage.run]
source = ["src"]
omit = [
    "src/migrations/*",
    "src/__init__.py",
    "tests/*",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if __name__ == .__main__.",
    "raise NotImplementedError",
    "pass",
]
fail_under = 80
show_missing = true
```

Adicione o job de cobertura Python ao workflow:

```yaml
  coverage-python:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./services/inventory-service

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
          cache-dependency-path: './services/inventory-service/requirements-dev.txt'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements-dev.txt

      - name: Run tests with coverage
        run: pytest

      - name: Upload coverage artifact
        uses: actions/upload-artifact@v4
        with:
          name: coverage-python
          path: services/inventory-service/coverage/

      - name: Publish coverage report
        if: github.event_name == 'pull_request'
        uses: orgoro/coverage@v3.2
        with:
          coverageFile: services/inventory-service/coverage/coverage.xml
          token: ${{ secrets.GITHUB_TOKEN }}
          thresholdAll: 0.80
          thresholdNew: 0.90
```

### Tarefa 3: Configurar cobertura .NET para o payment gateway

Crie a configuraÃ§Ã£o do projeto de testes em `services/payment-gateway/tests/PaymentGateway.Tests.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.9.0" />
    <PackageReference Include="xunit" Version="2.7.0" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.5.7" />
    <PackageReference Include="coverlet.collector" Version="6.0.2" />
    <PackageReference Include="coverlet.msbuild" Version="6.0.2" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\src\PaymentGateway\PaymentGateway.csproj" />
  </ItemGroup>
</Project>
```

Adicione o job de cobertura .NET:

```yaml
  coverage-dotnet:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./services/payment-gateway

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Restore dependencies
        run: dotnet restore

      - name: Run tests with coverage
        run: |
          dotnet test \
            --no-restore \
            --collect:"XPlat Code Coverage" \
            --results-directory ./coverage \
            -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=cobertura \
               DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.ExcludeByFile="**/Migrations/**"

      - name: Install ReportGenerator
        run: dotnet tool install -g dotnet-reportgenerator-globaltool

      - name: Generate coverage report
        run: |
          reportgenerator \
            -reports:"coverage/**/coverage.cobertura.xml" \
            -targetdir:"coverage/report" \
            -reporttypes:"Html;Cobertura;JsonSummary"

      - name: Upload coverage artifact
        uses: actions/upload-artifact@v4
        with:
          name: coverage-dotnet
          path: services/payment-gateway/coverage/report/
```

### Tarefa 4: Criar um gate de cobertura que falha PRs abaixo do threshold

Crie `.github/workflows/coverage-gate.yml` como verificaÃ§Ã£o de status obrigatÃ³ria:

```yaml
name: Coverage Gate

on:
  pull_request:
    branches: [main]

jobs:
  coverage-gate:
    runs-on: ubuntu-latest
    needs: [coverage-node, coverage-python, coverage-dotnet]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download all coverage artifacts
        uses: actions/download-artifact@v4
        with:
          path: ./coverage-artifacts

      - name: Evaluate coverage gate
        run: |
          FAILED=false

          # Check Node.js coverage
          if [ -f "./coverage-artifacts/coverage-node/coverage-summary.json" ]; then
            NODE_COV=$(jq '.total.lines.pct' ./coverage-artifacts/coverage-node/coverage-summary.json)
            echo "Checkout API coverage: ${NODE_COV}%"
            if (( $(echo "$NODE_COV < 80" | bc -l) )); then
              echo "::error::Checkout API coverage ${NODE_COV}% is below 80% threshold"
              FAILED=true
            fi
          fi

          # Check Python coverage
          if [ -f "./coverage-artifacts/coverage-python/coverage.xml" ]; then
            PYTHON_COV=$(python3 -c "
            import xml.etree.ElementTree as ET
            tree = ET.parse('./coverage-artifacts/coverage-python/coverage.xml')
            root = tree.getroot()
            print(float(root.attrib['line-rate']) * 100)
            ")
            echo "Inventory service coverage: ${PYTHON_COV}%"
            if (( $(echo "$PYTHON_COV < 80" | bc -l) )); then
              echo "::error::Inventory service coverage ${PYTHON_COV}% is below 80% threshold"
              FAILED=true
            fi
          fi

          # Check .NET coverage
          if [ -f "./coverage-artifacts/coverage-dotnet/Summary.json" ]; then
            DOTNET_COV=$(jq '.summary.linecoverage' ./coverage-artifacts/coverage-dotnet/Summary.json)
            echo "Payment gateway coverage: ${DOTNET_COV}%"
            if (( $(echo "$DOTNET_COV < 80" | bc -l) )); then
              echo "::error::Payment gateway coverage ${DOTNET_COV}% is below 80% threshold"
              FAILED=true
            fi
          fi

          if [ "$FAILED" = true ]; then
            echo "::error::Coverage gate FAILED. One or more services below threshold."
            exit 1
          fi

          echo "All coverage gates passed."

      - name: Post coverage summary
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            let summary = '## Coverage gate results\n\n';
            summary += '| Service | Coverage | Threshold | Status |\n';
            summary += '|---------|----------|-----------|--------|\n';

            try {
              const nodeData = JSON.parse(
                fs.readFileSync('./coverage-artifacts/coverage-node/coverage-summary.json', 'utf8')
              );
              const nodeCov = nodeData.total.lines.pct;
              summary += `| Checkout API (Node.js) | ${nodeCov}% | 80% | ${nodeCov >= 80 ? 'Passed' : 'FAILED'} |\n`;
            } catch (e) {
              summary += '| Checkout API (Node.js) | N/A | 80% | ERROR |\n';
            }

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: summary
            });
```

### Tarefa 5: Rastrear tendÃªncias de cobertura ao longo do tempo

Crie um workflow que armazena dados de cobertura em cada merge para `main`:

```yaml
  store-coverage-baseline:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: [coverage-node, coverage-python, coverage-dotnet]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download coverage artifacts
        uses: actions/download-artifact@v4
        with:
          path: ./coverage-artifacts

      - name: Store coverage baseline
        run: |
          mkdir -p .coverage-history
          DATE=$(date +%Y-%m-%d)
          COMMIT=$(git rev-parse --short HEAD)

          NODE_COV=$(jq '.total.lines.pct' ./coverage-artifacts/coverage-node/coverage-summary.json 2>/dev/null || echo "0")

          echo "{\"date\":\"$DATE\",\"commit\":\"$COMMIT\",\"checkout_api\":$NODE_COV}" >> .coverage-history/trend.jsonl

      - name: Upload coverage baseline
        uses: actions/cache/save@v4
        with:
          path: .coverage-history/
          key: coverage-baseline-${{ github.sha }}

  compare-coverage:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: [coverage-node]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Restore baseline coverage
        uses: actions/cache/restore@v4
        with:
          path: .coverage-history/
          key: coverage-baseline-
          restore-keys: |
            coverage-baseline-

      - name: Download current coverage
        uses: actions/download-artifact@v4
        with:
          name: coverage-node
          path: ./current-coverage

      - name: Compare coverage (ratchet check)
        run: |
          CURRENT=$(jq '.total.lines.pct' ./current-coverage/coverage-summary.json)

          if [ -f ".coverage-history/trend.jsonl" ]; then
            BASELINE=$(tail -1 .coverage-history/trend.jsonl | jq '.checkout_api')
            echo "Baseline coverage: ${BASELINE}%"
            echo "Current coverage: ${CURRENT}%"

            if (( $(echo "$CURRENT < $BASELINE" | bc -l) )); then
              DIFF=$(echo "$BASELINE - $CURRENT" | bc -l)
              echo "::error::Coverage decreased by ${DIFF}% (from ${BASELINE}% to ${CURRENT}%). Coverage ratchet policy violated."
              exit 1
            else
              echo "Coverage maintained or improved: ${BASELINE}% -> ${CURRENT}%"
            fi
          else
            echo "No baseline found. Using current as initial measurement."
          fi
```

### Tarefa 6: Configurar diff coverage (comparaÃ§Ã£o em nÃ­vel de branch)

Instale e configure diff-cover para serviÃ§os Python:

```bash
pip install diff-cover
```

Adicione diff coverage ao job Python:

```yaml
      - name: Generate diff coverage report
        if: github.event_name == 'pull_request'
        run: |
          git fetch origin main:refs/remotes/origin/main
          diff-cover coverage/coverage.xml \
            --compare-branch=origin/main \
            --fail-under=90 \
            --html-report coverage/diff-cover.html \
            --markdown-report coverage/diff-cover.md
        working-directory: ./services/inventory-service

      - name: Post diff coverage comment
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync(
              'services/inventory-service/coverage/diff-cover.md', 'utf8'
            );
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## Diff coverage (inventory service)\n\n${report}`
            });
```

Para Node.js, use um script de comparaÃ§Ã£o de cobertura:

```yaml
      - name: Generate diff coverage for Node.js
        if: github.event_name == 'pull_request'
        run: |
          # Get list of changed files in the PR
          git fetch origin main:refs/remotes/origin/main
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD -- 'services/checkout-api/src/**/*.js')

          if [ -z "$CHANGED_FILES" ]; then
            echo "No source files changed in checkout-api"
            exit 0
          fi

          # Parse lcov for changed files only
          node -e "
          const fs = require('fs');
          const lcov = fs.readFileSync('services/checkout-api/coverage/lcov.info', 'utf8');
          const changedFiles = process.env.CHANGED_FILES.split('\n').filter(Boolean);

          let totalLines = 0;
          let coveredLines = 0;
          let currentFile = '';
          let inChangedFile = false;

          for (const line of lcov.split('\n')) {
            if (line.startsWith('SF:')) {
              currentFile = line.slice(3);
              inChangedFile = changedFiles.some(f => currentFile.endsWith(f.replace('services/checkout-api/', '')));
            }
            if (inChangedFile && line.startsWith('DA:')) {
              const [, hits] = line.slice(3).split(',');
              totalLines++;
              if (parseInt(hits) > 0) coveredLines++;
            }
          }

          const pct = totalLines > 0 ? ((coveredLines / totalLines) * 100).toFixed(2) : 100;
          console.log('Diff coverage: ' + pct + '% (' + coveredLines + '/' + totalLines + ' lines)');
          if (parseFloat(pct) < 90) {
            console.error('Diff coverage ' + pct + '% is below 90% threshold');
            process.exit(1);
          }
          "
        env:
          CHANGED_FILES: ${{ steps.changed-files.outputs.files }}
        working-directory: ./services/checkout-api
```

### Tarefa 7: Publicar cobertura no Azure Pipelines

Para o equivalente em Azure Pipelines, configure a publicaÃ§Ã£o de cobertura em `azure-pipelines-coverage.yml`:

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Coverage
    displayName: 'Test and coverage'
    jobs:
      - job: NodeCoverage
        displayName: 'Node.js coverage'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: |
              cd services/checkout-api
              npm ci
              npx jest --coverage --ci --coverageReporters=cobertura --coverageReporters=text
            displayName: 'Run tests with coverage'

          - task: PublishCodeCoverageResults@2
            displayName: 'Publish Node.js coverage'
            inputs:
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/services/checkout-api/coverage/cobertura-coverage.xml'

      - job: PythonCoverage
        displayName: 'Python coverage'
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: '3.12'

          - script: |
              cd services/inventory-service
              pip install -r requirements-dev.txt
              pytest --cov=src --cov-report=xml:coverage/coverage.xml
            displayName: 'Run tests with coverage'

          - task: PublishCodeCoverageResults@2
            displayName: 'Publish Python coverage'
            inputs:
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/services/inventory-service/coverage/coverage.xml'

      - job: DotNetCoverage
        displayName: '.NET coverage'
        steps:
          - task: UseDotNet@2
            inputs:
              packageType: 'sdk'
              version: '8.0.x'

          - script: |
              cd services/payment-gateway
              dotnet test --collect:"XPlat Code Coverage" --results-directory ./coverage \
                -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=cobertura
            displayName: 'Run tests with coverage'

          - task: PublishCodeCoverageResults@2
            displayName: 'Publish .NET coverage'
            inputs:
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/services/payment-gateway/coverage/**/coverage.cobertura.xml'

  - stage: CoverageGate
    displayName: 'Coverage gate'
    dependsOn: Coverage
    jobs:
      - job: ValidateCoverage
        displayName: 'Validate coverage threshold'
        steps:
          - task: PowerShell@2
            displayName: 'Check coverage threshold'
            inputs:
              targetType: 'inline'
              script: |
                $threshold = 80
                $coverageFiles = Get-ChildItem -Path "$(Pipeline.Workspace)" -Filter "coverage.cobertura.xml" -Recurse

                foreach ($file in $coverageFiles) {
                  [xml]$xml = Get-Content $file.FullName
                  $lineRate = [math]::Round([double]$xml.coverage.'line-rate' * 100, 2)
                  Write-Host "Coverage for $($file.Directory.Name): $lineRate%"

                  if ($lineRate -lt $threshold) {
                    Write-Error "Coverage $lineRate% is below threshold $threshold% for $($file.Directory.Name)"
                    exit 1
                  }
                }

                Write-Host "All services meet coverage threshold of $threshold%"
```

---

## ExercÃ­cios de quebra e conserto

### O problema

ApÃ³s implementar o relatÃ³rio de cobertura, a equipe observa que os relatÃ³rios de cobertura mostram 0% em todas as mÃ©tricas no pipeline, mesmo que os testes claramente executem e passem. A saÃ­da dos testes mostra "42 tests passed" mas a cobertura mostra:

```text
Lines:       0%
Branches:    0%
Functions:   0%
Statements:  0%
```

---


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

### AnÃ¡lise de causa raiz

**Problema 1: Formato incorreto do reporter de cobertura**

A configuraÃ§Ã£o do Jest usa `coverageReporters: ['text']` mas o pipeline espera um arquivo `cobertura-coverage.xml`. O reporter text apenas exibe no console e nÃ£o gera o arquivo XML que `PublishCodeCoverageResults@2` requer.

**Problema 2: Incompatibilidade de caminho de saÃ­da**

O comando de cobertura do pytest gera a saÃ­da em `coverage.xml` no diretÃ³rio de trabalho atual, mas a task de publicaÃ§Ã£o procura em `$(System.DefaultWorkingDirectory)/services/inventory-service/coverage/coverage.xml`. O arquivo existe mas no local errado.

**Problema 3: Arquivo de cobertura .NET nÃ£o gerado**

O comando `dotnet test` usa `--collect:"XPlat Code Coverage"` mas o pacote Coverlet nÃ£o estÃ¡ referenciado no projeto de testes. Sem `coverlet.collector` como dependÃªncia, o coletor de dados silenciosamente nÃ£o produz saÃ­da.

**Problema 4: Cobertura coletada contra saÃ­da compilada, nÃ£o o cÃ³digo-fonte**

Para Node.js, se `babel` ou `ts-jest` transforma o cÃ³digo, a cobertura mapeia para arquivos transpilados a menos que source maps estejam configurados. A cobertura Ã© executada contra cÃ³digo transformado em `node_modules/.cache` e reporta 0% para os arquivos-fonte originais.


### CorreÃ§Ã£o

**CorreÃ§Ã£o 1:** Garanta que todos os reporters necessÃ¡rios estejam listados na configuraÃ§Ã£o do Jest:

```javascript
// jest.config.js - must include both text and cobertura
coverageReporters: ['text', 'text-summary', 'lcov', 'cobertura'],
```

Verifique se o arquivo de saÃ­da existe apÃ³s executar os testes:

```bash
npx jest --coverage
ls -la coverage/cobertura-coverage.xml
```

**CorreÃ§Ã£o 2:** Corrija o caminho de saÃ­da na configuraÃ§Ã£o do pytest ou na task do pipeline:

```toml
# pyproject.toml - explicit output path
[tool.pytest.ini_options]
addopts = "--cov=src --cov-report=xml:coverage/coverage.xml"
```

Ou corrija o pipeline para corresponder ao local real de saÃ­da:

```yaml
- task: PublishCodeCoverageResults@2
  inputs:
    summaryFileLocation: '$(System.DefaultWorkingDirectory)/services/inventory-service/coverage/coverage.xml'
```

**CorreÃ§Ã£o 3:** Adicione o pacote Coverlet collector ao projeto de testes:

```bash
cd services/payment-gateway/tests
dotnet add package coverlet.collector --version 6.0.2
```

Verifique se aparece no `.csproj`:

```xml
<PackageReference Include="coverlet.collector" Version="6.0.2">
  <PrivateAssets>all</PrivateAssets>
  <IncludeAssets>runtime; build; native; contentfiles; analyzers</IncludeAssets>
</PackageReference>
```

**CorreÃ§Ã£o 4:** Configure suporte a source map para cÃ³digo transformado:

```javascript
// jest.config.js
module.exports = {
  transform: {
    '^.+\\.js$': ['babel-jest', { sourceMaps: true }],
  },
  coverageProvider: 'v8', // Use V8 native coverage instead of babel instrumentation
};
```

Para projetos TypeScript usando `ts-jest`:

```javascript
module.exports = {
  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: false }],
  },
  coverageProvider: 'v8',
};
```


</details>
## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual Ã© a diferenÃ§a entre cobertura geral e diff coverage no contexto de um pull request?",
    options: [
      "A cobertura geral mede apenas os arquivos alterados no PR; diff coverage mede todo o codebase",
      "A cobertura geral mede todo o codebase; diff coverage mede apenas as linhas novas ou modificadas no PR",
      "A cobertura geral inclui arquivos de teste; diff coverage os exclui",
      "SÃ£o mÃ©tricas idÃªnticas calculadas por ferramentas diferentes"
    ],
    correctIndex: 1,
    explanation: "A cobertura geral (agregada) mede a porcentagem de todas as linhas de cÃ³digo-fonte cobertas por testes em todo o codebase. Diff coverage foca exclusivamente em linhas adicionadas ou modificadas no pull request, garantindo que cÃ³digo novo seja bem testado independentemente da dÃ­vida de cobertura legada."
  },
  {
    question: "No Azure Pipelines, qual task e formato vocÃª deve usar para exibir resultados de cobertura de cÃ³digo no resumo do pipeline?",
    options: [
      "'PublishTestResults@2' com formato JUnit",
      "'PublishCodeCoverageResults@2' com formato Cobertura ou JaCoCo",
      "'PublishPipelineArtifact@1' com formato LCOV",
      "'PublishBuildArtifacts@1' com formato HTML"
    ],
    correctIndex: 1,
    explanation: "A task PublishCodeCoverageResults@2 aceita arquivos nos formatos XML Cobertura ou JaCoCo e renderiza dados de cobertura na aba Code Coverage do Azure Pipelines. Formatos LCOV e HTML nÃ£o sÃ£o suportados por esta task. PublishTestResults@2 trata resultados de aprovaÃ§Ã£o/falha de testes, nÃ£o cobertura."
  },
  {
    question: "O que uma polÃ­tica de \"ratchet\" de cobertura impÃµe?",
    options: [
      "A cobertura deve aumentar pelo menos 5% a cada PR",
      "A cobertura nunca pode diminuir abaixo do baseline registrado anteriormente",
      "Apenas caminhos crÃ­ticos requerem cobertura",
      "Thresholds de cobertura se aplicam apenas a repositÃ³rios novos"
    ],
    correctIndex: 1,
    explanation: "Uma polÃ­tica de ratchet (tambÃ©m chamada de polÃ­tica \"nunca diminuir\") armazena a porcentagem de cobertura em cada merge para a branch main. PRs subsequentes devem manter ou melhorar esse nÃ­vel. Isso previne erosÃ£o gradual de cobertura enquanto evita a carga de atingir imediatamente alta cobertura em cÃ³digo legado."
  },
  {
    question: "Por que um relatÃ³rio de cobertura pode mostrar 0% mesmo que todos os testes passem com sucesso?",
    options: [
      "O framework de testes tem um bug que impede a cobertura de funcionar",
      "A ferramenta de cobertura nÃ£o estÃ¡ instalada ou configurada para gerar o formato esperado, entÃ£o nenhum arquivo de dados de cobertura Ã© gerado",
      "Testes que passam sempre tÃªm 100% de cobertura, nunca 0%",
      "O runner de CI nÃ£o suporta instrumentaÃ§Ã£o de cobertura de cÃ³digo"
    ],
    correctIndex: 1,
    explanation: "O relatÃ³rio de cobertura requer tanto a execuÃ§Ã£o dos testes (que produz resultados de aprovaÃ§Ã£o/falha) quanto a instrumentaÃ§Ã£o do cÃ³digo (que produz dados de cobertura). Causas comuns de 0% de cobertura incluem: pacotes de cobertura ausentes, configuraÃ§Ã£o errada de formato de reporter, incompatibilidade de caminhos de saÃ­da onde o pipeline procura arquivos no diretÃ³rio errado, ou problemas de source map com cÃ³digo transpilado."
  }
]} />

## Limpeza

Remova a infraestrutura de cobertura apÃ³s completar o desafio:

```bash
# Remove workflow files
rm .github/workflows/coverage.yml
rm .github/workflows/coverage-gate.yml

# Remove Node.js coverage config
rm services/checkout-api/jest.config.js

# Remove Python coverage config changes
# (revert pyproject.toml coverage settings)

# Remove .NET coverage packages
cd services/payment-gateway/tests
dotnet remove package coverlet.collector
dotnet remove package coverlet.msbuild

# Remove Azure Pipelines coverage file
rm -f azure-pipelines-coverage.yml

# Remove generated coverage data
rm -rf services/checkout-api/coverage/
rm -rf services/inventory-service/coverage/
rm -rf services/payment-gateway/coverage/

# Remove coverage history
rm -rf .coverage-history/

# Uninstall diff-cover if installed globally
pip uninstall diff-cover -y
```

# Desafio 18: AnÃ¡lise de cobertura de cÃ³digo

Este desafio estÃ¡ em desenvolvimento.
