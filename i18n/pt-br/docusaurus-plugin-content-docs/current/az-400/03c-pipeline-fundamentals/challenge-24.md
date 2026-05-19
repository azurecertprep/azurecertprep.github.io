---
sidebar_position: 6
title: "Desafio 24: Verificações e aprovações"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 24: Verificações e aprovações

:::info Plataforma: comparação
Este desafio compara mecanismos de proteção de environment e aprovação entre GitHub Actions e Azure Pipelines.
:::

## Habilidades do exame

- Projetar e implementar verificações e aprovações usando environments baseados em YAML

## Cenário

A equipe de compliance da Contoso Ltd exigiu os seguintes controles de deploy:

1. Deploys para staging devem passar nos smoke tests automatizados antes de produção se tornar elegível
2. Deploys para produção requerem aprovação de pelo menos um engenheiro de nível VP
3. Nenhum deploy para produção é permitido às sextas-feiras ou fins de semana (restrição de horário comercial)
4. Apenas o branch `main` pode ser implantado em produção
5. Cada environment deve ter seu próprio conjunto de secrets e configuração

A equipe de DevOps precisa implementar esses controles usando regras de proteção de environment tanto no GitHub Actions quanto no Azure Pipelines.

## Tarefa 1: Environments do GitHub com regras de proteção

Configure environments do GitHub com revisores obrigatórios e restrições de branch:

```bash
# Create the staging environment
gh api --method PUT repos/contoso/contoso-api/environments/staging \
  --input - <<EOF
{
  "wait_timer": 0,
  "reviewers": [],
  "deployment_branch_policy": {
    "protected_branches": false,
    "custom_branch_policies": true
  }
}
EOF

# Add branch policy to staging (allow main and release branches)
gh api --method POST repos/contoso/contoso-api/environments/staging/deployment-branch-policies \
  --field name="main"

gh api --method POST repos/contoso/contoso-api/environments/staging/deployment-branch-policies \
  --field name="release/*" \
  --field type="branch"

# Create the production environment with reviewers and wait timer
gh api --method PUT repos/contoso/contoso-api/environments/production \
  --input - <<EOF
{
  "wait_timer": 15,
  "prevent_self_review": true,
  "reviewers": [
    {"type": "User", "id": 12345},
    {"type": "Team", "id": 67890}
  ],
  "deployment_branch_policy": {
    "protected_branches": false,
    "custom_branch_policies": true
  }
}
EOF

# Only allow main branch to deploy to production
gh api --method POST repos/contoso/contoso-api/environments/production/deployment-branch-policies \
  --field name="main"
```

Use environments no workflow:

```yaml
name: Production deployment with approvals

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.tag }}
    steps:
      - uses: actions/checkout@v4
      - name: Build application
        run: npm ci && npm run build
      - name: Determine version
        id: version
        run: echo "tag=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
      - uses: actions/upload-artifact@v4
        with:
          name: app-bundle
          path: dist/

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://contoso-api-staging.azurewebsites.net
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: app-bundle
          path: dist/
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Deploy to staging
        run: |
          az webapp deploy \
            --resource-group contoso-staging-rg \
            --name contoso-api-staging \
            --src-path dist/app.zip \
            --type zip

  smoke-tests:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run smoke tests
        run: |
          npm ci
          npm run test:smoke -- --base-url https://contoso-api-staging.azurewebsites.net
        env:
          SMOKE_TEST_API_KEY: ${{ secrets.STAGING_API_KEY }}
      - name: Run performance baseline
        run: |
          npx autocannon -c 10 -d 30 https://contoso-api-staging.azurewebsites.net/api/health
      - name: Verify response schema
        run: |
          RESPONSE=$(curl -s https://contoso-api-staging.azurewebsites.net/api/v1/status)
          echo "$RESPONSE" | jq -e '.status == "healthy"'

  # Production requires manual approval (configured on the environment)
  deploy-production:
    needs: smoke-tests
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://contoso-api.azurewebsites.net
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: app-bundle
          path: dist/
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Deploy to production
        run: |
          az webapp deploy \
            --resource-group contoso-prod-rg \
            --name contoso-api-prod \
            --src-path dist/app.zip \
            --type zip
      - name: Verify production health
        run: |
          sleep 30
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://contoso-api.azurewebsites.net/health)
          if [ "$STATUS" != "200" ]; then
            echo "Production health check failed"
            exit 1
          fi
```

## Tarefa 2: Branches e tags de deploy

Restrinja quais branches e tags podem disparar deploys para environments específicos:

```bash
# Allow only tagged releases to deploy to production
gh api --method POST repos/contoso/contoso-api/environments/production/deployment-branch-policies \
  --field name="v*" \
  --field type="tag"

# Remove any branch policies that are too permissive
gh api repos/contoso/contoso-api/environments/production/deployment-branch-policies \
  --jq '.branch_policies[] | select(.name != "main" and .name != "v*") | .id' | \
  xargs -I {} gh api --method DELETE \
    repos/contoso/contoso-api/environments/production/deployment-branch-policies/{}
```

Workflow que faz deploy de tags para produção:

```yaml
name: Release deployment

on:
  push:
    tags:
      - "v[0-9]+.[0-9]+.[0-9]+"

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://contoso-api.azurewebsites.net
    steps:
      - uses: actions/checkout@v4
      - name: Extract version from tag
        id: version
        run: echo "version=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT
      - name: Deploy release ${{ steps.version.outputs.version }}
        run: |
          echo "Deploying version ${{ steps.version.outputs.version }} to production"
```

## Tarefa 3: Regras customizadas de proteção de deploy

Implemente uma regra customizada de proteção de deploy usando um GitHub App para impor horário comercial:

```yaml
# The GitHub App webhook handler (Node.js Express server)
# This runs as a separate service that GitHub calls before allowing deployment
```

```javascript
// app.js - Custom deployment protection rule handler
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Verify webhook signature
function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  const hash = 'sha256=' + crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
}

// Business hours check: Monday-Thursday, 9am-5pm ET
function isWithinBusinessHours() {
  const now = new Date();
  const etOptions = { timeZone: 'America/New_York' };
  const etHour = parseInt(now.toLocaleString('en-US', { ...etOptions, hour: 'numeric', hour12: false }));
  const etDay = now.toLocaleString('en-US', { ...etOptions, weekday: 'long' });

  const workDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const isWorkDay = workDays.includes(etDay);
  const isWorkHours = etHour >= 9 && etHour < 17;

  return isWorkDay && isWorkHours;
}

app.post('/webhook/deployment-protection', (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }

  const { action, environment, deployment_callback_url } = req.body;

  if (action !== 'requested') {
    return res.status(200).send('OK');
  }

  const approved = isWithinBusinessHours();
  const comment = approved
    ? 'Deployment approved: within business hours (Mon-Thu, 9am-5pm ET)'
    : 'Deployment rejected: outside business hours. Deployments are only allowed Monday-Thursday, 9am-5pm ET.';

  // Respond to GitHub with approval or rejection
  fetch(deployment_callback_url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_APP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      environment_name: environment,
      state: approved ? 'approved' : 'rejected',
      comment: comment
    })
  });

  res.status(200).send('OK');
});

app.listen(3000, () => console.log('Protection rule handler running on port 3000'));
```

Registre a regra customizada de proteção de deploy:

```bash
# Enable the GitHub App as a deployment protection rule on the environment
gh api --method POST \
  repos/contoso/contoso-api/environments/production/deployment_protection_rules \
  --field integration_id=<github-app-id>
```

## Tarefa 4: Environments do Azure Pipelines com verificações

Configure environments do Azure DevOps com múltiplos tipos de verificação:

### Verificação de aprovação manual

```bash
# Create environment (via Azure DevOps UI or REST API)
# Project Settings > Environments > New environment

# Add approval check via REST API
az rest --method POST \
  --uri "https://dev.azure.com/contoso/ContosoApi/_apis/pipelines/checks/configurations?api-version=7.1-preview.1" \
  --headers "Content-Type=application/json" \
  --body '{
    "type": {
      "id": "8C6F20A7-A545-4486-9777-F762FAFE0D4D",
      "name": "Approval"
    },
    "settings": {
      "approvers": [
        {"id": "<user-id>", "displayName": "VP Engineering"}
      ],
      "minRequiredApprovers": 1,
      "executionOrder": "anyOrder",
      "instructions": "Review the staging deployment results before approving production deployment.",
      "blockedApprovers": [],
      "timeout": 43200
    },
    "resource": {
      "type": "environment",
      "id": "<environment-id>"
    }
  }'
```

### Verificação de horário comercial

Configure no Azure DevOps (Project Settings > Environments > production > Checks > Add check > Business Hours):

- Fuso horário: Eastern Time (US and Canada)
- Dias: Segunda a quinta-feira
- Hora de início: 09:00
- Hora de término: 17:00

No pipeline, isso se manifesta como um portão que segura o deploy até o horário comercial:

```yaml
stages:
  - stage: DeployProduction
    dependsOn: DeployStaging
    jobs:
      - deployment: Production
        environment: "contoso-production"  # Has business hours check configured
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "This only runs during business hours"
```

### Verificação de alertas do Azure Monitor

Adicione uma verificação do Azure Monitor que valida se não há alertas ativos antes do deploy:

```bash
# Configure via Azure DevOps UI:
# Environment > Checks > Add check > Invoke Azure Function
# Or use the built-in "Azure Monitor alerts" check type

# The check queries Azure Monitor for active alerts on the target resource
# If there are active Sev0 or Sev1 alerts, the deployment is blocked
```

Pipeline com todas as verificações:

```yaml
stages:
  - stage: DeployStaging
    jobs:
      - deployment: Staging
        environment: "contoso-staging"
        # Staging has: Invoke REST API check (smoke tests)
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureRmWebAppDeployment@4
                  inputs:
                    azureSubscription: "contoso-azure-connection"
                    appType: "webApp"
                    WebAppName: "contoso-api-staging"
                    packageForLinux: "$(Pipeline.Workspace)/drop/**/*.zip"

  - stage: DeployProduction
    dependsOn: DeployStaging
    jobs:
      - deployment: Production
        environment: "contoso-production"
        # Production has: Manual approval + Business hours + Azure Monitor alerts
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureRmWebAppDeployment@4
                  inputs:
                    azureSubscription: "contoso-azure-connection"
                    appType: "webApp"
                    WebAppName: "contoso-api-prod"
                    packageForLinux: "$(Pipeline.Workspace)/drop/**/*.zip"
```

## Tarefa 5: Lock exclusivo e deploy sequencial

Previna deploys concorrentes para o mesmo environment:

```yaml
# Azure Pipelines: Exclusive lock check
# Configure via: Environment > Checks > Add check > Exclusive lock

# When configured, if multiple pipeline runs target the same environment,
# only the latest run proceeds and older queued runs are cancelled.

# In the pipeline, declare the concurrency behavior:
stages:
  - stage: DeployProduction
    lockBehavior: sequential  # Options: sequential, runLatest
    jobs:
      - deployment: Production
        environment: "contoso-production"
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Only one deployment at a time"
```

```yaml
# GitHub Actions: Concurrency control
name: Deploy

on:
  push:
    branches: [main]

# Only one deployment workflow runs at a time
# If a new one starts, the in-progress one is cancelled
concurrency:
  group: production-deploy
  cancel-in-progress: false  # Queue instead of cancel (wait for current to finish)

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    # Job-level concurrency (different from workflow-level)
    concurrency:
      group: staging-deploy
      cancel-in-progress: true  # Cancel previous staging deploys
    environment: staging
    steps:
      - run: echo "Deploying to staging"

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    concurrency:
      group: production-deploy-${{ github.ref }}
      cancel-in-progress: false
    environment: production
    steps:
      - run: echo "Deploying to production"
```

## Tarefa 6: Variáveis e secrets com escopo de environment

Configure secrets e variáveis isolados para environments específicos:

### GitHub Actions

```bash
# Create environment secrets (different values per environment)
gh secret set DATABASE_URL --env staging \
  --body "postgresql://user:pass@staging-db.postgres.database.azure.com:5432/contoso"
gh secret set DATABASE_URL --env production \
  --body "postgresql://user:pass@prod-db.postgres.database.azure.com:5432/contoso"

gh secret set API_KEY --env staging --body "staging-key-abc123"
gh secret set API_KEY --env production --body "prod-key-xyz789"

# Create environment variables
gh variable set FEATURE_FLAGS --env staging --body '{"newUI":true,"betaAPI":true}'
gh variable set FEATURE_FLAGS --env production --body '{"newUI":false,"betaAPI":false}'

gh variable set LOG_LEVEL --env staging --body "debug"
gh variable set LOG_LEVEL --env production --body "warning"

gh variable set REPLICA_COUNT --env staging --body "1"
gh variable set REPLICA_COUNT --env production --body "3"
```

Acesso no workflow:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # This scopes which secrets/vars are available
    steps:
      - name: Deploy with environment config
        run: |
          echo "Database: connecting to environment-specific DB"
          echo "Log level: ${{ vars.LOG_LEVEL }}"
          echo "Replicas: ${{ vars.REPLICA_COUNT }}"
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
```

### Azure Pipelines

```yaml
# Variable groups per environment
variables:
  - group: contoso-common  # Shared across all stages

stages:
  - stage: DeployStaging
    variables:
      - group: contoso-staging-secrets  # Linked to Key Vault
      - group: contoso-staging-config
    jobs:
      - deployment: Staging
        environment: "contoso-staging"
        strategy:
          runOnce:
            deploy:
              steps:
                - script: |
                    echo "Log level: $(LogLevel)"
                    echo "Replica count: $(ReplicaCount)"
                  displayName: "Use staging configuration"

  - stage: DeployProduction
    variables:
      - group: contoso-production-secrets  # Different Key Vault
      - group: contoso-production-config
    jobs:
      - deployment: Production
        environment: "contoso-production"
        strategy:
          runOnce:
            deploy:
              steps:
                - script: |
                    echo "Log level: $(LogLevel)"
                    echo "Replica count: $(ReplicaCount)"
                  displayName: "Use production configuration"
```

## Exercícios de quebra e conserto

### Exercício 1: Aprovação de environment ignorada

Um deploy chega à produção sem aprovação. Investigue:

```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    # ERROR: Missing environment declaration
    steps:
      - name: Deploy to production
        run: az webapp deploy --name contoso-api-prod ...
```


<details>
<summary>Mostrar solução</summary>

**Correção:** O job não referencia o environment `production`, então nenhuma regra de proteção é avaliada. Adicione a chave `environment`:

```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://contoso-api.azurewebsites.net
    steps:
      - name: Deploy to production
        run: az webapp deploy --name contoso-api-prod ...
```

</details>

### Exercício 2: Grupo de concorrência cancela deploys desejados

Múltiplos serviços fazem deploy independentemente mas compartilham um grupo de concorrência, causando cancelamentos:

```yaml
# In service-a workflow:
concurrency:
  group: production  # ERROR: Too broad - shared across all services
  cancel-in-progress: true

# In service-b workflow:
concurrency:
  group: production  # Same group - will cancel service-a deployment
  cancel-in-progress: true
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Defina o escopo dos grupos de concorrência para o serviço específico:

```yaml
# In service-a workflow:
concurrency:
  group: production-service-a
  cancel-in-progress: true

# In service-b workflow:
concurrency:
  group: production-service-b
  cancel-in-progress: true
```

Ou use o nome do workflow dinamicamente:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

</details>

### Exercício 3: Wait timer não funciona como esperado

O environment de produção tem um wait timer de 15 minutos configurado, mas os deploys prosseguem imediatamente:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: Production  # ERROR: Case-sensitive mismatch
    steps:
      - run: echo "deploying"
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Nomes de environment no GitHub são sensíveis a maiúsculas e minúsculas. Se o environment foi criado como `production` (minúsculo), o workflow deve referenciá-lo exatamente:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Must match exactly
    steps:
      - run: echo "deploying"
```

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "No GitHub Actions, o que acontece quando um workflow tem como alvo um environment que possui revisores obrigatórios configurados?",
    options: [
      "O workflow falha imediatamente com um erro de permissão",
      "O job pausa e aguarda um revisor autorizado aprovar antes de prosseguir",
      "O workflow pula o job e passa para o próximo",
      "O GitHub aprova automaticamente se o committer for um administrador do repositório"
    ],
    correctIndex: 1,
    explanation: "Quando um job referencia um environment com revisores obrigatórios, o job entra em estado \"Waiting\" e o GitHub notifica os revisores designados. O job não prossegue até que pelo menos o número mínimo de revisores obrigatórios aprove. A aprovação pode ser concedida pela página de execução do workflow na interface do GitHub. Se não for aprovado em 30 dias, a execução é automaticamente cancelada."
  },
  {
    question: "Como a chave 'concurrency' no GitHub Actions difere do lock exclusivo do Azure Pipelines?",
    options: [
      "Eles são idênticos em comportamento",
      "O 'concurrency' do GitHub com 'cancel-in-progress: true' cancela execuções na fila, enquanto o lock exclusivo do Azure com comportamento 'runLatest' cancela execuções antigas e mantém apenas a mais recente",
      "A concurrency do GitHub se aplica apenas a pull requests",
      "O lock exclusivo do Azure funciona apenas com deployment jobs"
    ],
    correctIndex: 1,
    explanation: "Ambos fornecem exclusão mútua, mas o comportamento de cancelamento difere. No GitHub Actions, cancel-in-progress: true cancela o workflow em execução no momento em favor do novo. No Azure Pipelines, o lock exclusivo com comportamento runLatest cancela todas as execuções antigas na fila e apenas a mais recente prossegue. Com comportamento sequential no Azure Pipelines, as execuções ficam em fila e executam uma de cada vez em ordem."
  },
  {
    question: "Qual é o propósito de um wait timer em um environment do GitHub?",
    options: [
      "Ele limita por quanto tempo um job de deploy pode executar",
      "Ele impõe um atraso obrigatório entre quando o job é disparado e quando ele pode começar a executar",
      "Ele define o timeout para aprovação do revisor",
      "Ele controla o intervalo entre tentativas de retry"
    ],
    correctIndex: 1,
    explanation: "O wait timer introduz um atraso obrigatório (em minutos) entre quando um job direcionado ao environment fica pronto e quando ele realmente começa a executar. Isso fornece um período de \"espera\" durante o qual a equipe pode inspecionar o deploy anterior ou cancelar o próximo. O timer é executado após a aprovação (se revisores obrigatórios também estiverem configurados)."
  },
  {
    question: "No Azure Pipelines, qual tipo de verificação você usaria para prevenir deploys quando a aplicação alvo está passando por um incidente ativo?",
    options: [
      "Aprovação manual",
      "Horário comercial",
      "Alertas do Azure Monitor",
      "Lock exclusivo"
    ],
    correctIndex: 2,
    explanation: "A verificação de alertas do Azure Monitor avalia se existem alertas ativos (em níveis de severidade especificados) nos recursos Azure alvo. Se alertas ativos existirem correspondendo aos critérios configurados (como alertas Sev0 ou Sev1), o deploy é bloqueado até que os alertas sejam resolvidos. Isso previne o deploy de novo código em um sistema que já está experimentando problemas."
  }
]} />
