---
sidebar_position: 3
title: "Desafio 48: Monitoramento e alertas do GitHub"
sidebar_label: "Desafio 48: Monitoramento e alertas do GitHub"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 48: Monitoramento e alertas do GitHub

## Habilidades do exame abordadas

- Configurar monitoramento no GitHub, incluindo habilitar insights e criar e configurar gráficos
- Configurar alertas para eventos no GitHub Actions e Azure Pipelines

## Cenário

O gerente de engenharia da Contoso Ltd quer visibilidade sobre a velocidade da equipe, eficiência de workflows e padrões de deploy sem sair do GitHub. Atualmente, ninguém sabe o tempo médio de build do CI, quais workflows falham com mais frequência ou com que frequência as equipes fazem deploy. O gerente também quer alertas proativos quando workflows críticos falham para que a equipe não descubra builds quebrados horas depois. Você deve configurar monitoramento e alertas do GitHub para fornecer métricas de engenharia acionáveis.

## Pré-requisitos

- Organização GitHub com múltiplos repositórios
- Workflows do GitHub Actions que já executaram pelo menos algumas vezes (para dados históricos)
- Quadro do GitHub Projects
- GitHub CLI instalada e autenticada
- Um workspace do Slack ou canal do Microsoft Teams (para notificações de alerta)

## Tarefas

### Tarefa 1: Habilitar e explorar insights do repositório GitHub

O GitHub fornece insights integrados do repositório para tráfego, contribuições e saúde da comunidade.

```bash
# View repository traffic (requires push access)
gh api repos/contoso/webapp/traffic/views --jq '{
  totalViews: .count,
  uniqueVisitors: .uniques,
  daily: [.views[] | {date: .timestamp, views: .count, unique: .uniques}]
}'

# View clone statistics
gh api repos/contoso/webapp/traffic/clones --jq '{
  totalClones: .count,
  uniqueCloners: .uniques,
  daily: [.clones[] | {date: .timestamp, clones: .count, unique: .uniques}]
}'

# View top referral sources
gh api repos/contoso/webapp/traffic/popular/referrers --jq '.[] | {referrer, count, uniques}'

# View popular content paths
gh api repos/contoso/webapp/traffic/popular/paths --jq '.[] | {path, title, count, uniques}'

# View contributor statistics
gh api repos/contoso/webapp/stats/contributors --jq '.[] | {
  author: .author.login,
  totalCommits: .total,
  lastWeekCommits: (.weeks[-1].c)
}'

# View commit activity (weekly)
gh api repos/contoso/webapp/stats/commit_activity --jq '.[-4:] | .[] | {
  week: (.week | todate),
  totalCommits: .total,
  dailyBreakdown: .days
}'
```

Insights disponíveis na interface do GitHub (repositório > aba Insights):
- Pulse: resumo de atividades recentes
- Contributors: frequência de commits por contribuidor
- Community: arquivos de saúde da comunidade (README, CONTRIBUTING, CODE_OF_CONDUCT)
- Traffic: visualizações de página, clones, referenciadores
- Commits: frequência de commits ao longo do tempo
- Code frequency: adições e exclusões por semana
- Dependency graph: dependências e dependentes
- Network: visualização da rede de forks
- Forks: lista de forks com atividade

### Tarefa 2: Configurar insights de workflows do GitHub Actions

```bash
# Get workflow run statistics
gh api repos/contoso/webapp/actions/workflows --jq '.workflows[] | {
  name: .name,
  id: .id,
  state: .state
}'

# Get recent runs for a specific workflow with timing
gh run list --workflow deploy.yml --limit 20 --json status,conclusion,startedAt,updatedAt \
  --jq '.[] | {
    status,
    conclusion,
    started: .startedAt,
    duration: ((.updatedAt | fromdateiso8601) - (.startedAt | fromdateiso8601) | tostring + "s")
  }'

# Calculate success rate for the last 100 runs
gh run list --workflow deploy.yml --limit 100 --json conclusion \
  --jq '{
    total: length,
    success: [.[] | select(.conclusion == "success")] | length,
    failure: [.[] | select(.conclusion == "failure")] | length,
    cancelled: [.[] | select(.conclusion == "cancelled")] | length,
    successRate: (([.[] | select(.conclusion == "success")] | length) * 100 / length | tostring + "%")
  }'

# Get average workflow duration (last 50 successful runs)
gh run list --workflow deploy.yml --limit 50 --status completed --json startedAt,updatedAt,conclusion \
  --jq '[.[] | select(.conclusion == "success") | ((.updatedAt | fromdateiso8601) - (.startedAt | fromdateiso8601))] | (add / length | floor | tostring + " seconds average")'

# Usage minutes consumed
gh api orgs/contoso/settings/billing/actions --jq '{
  totalMinutesUsed: .total_minutes_used,
  includedMinutes: .included_minutes,
  paidMinutesUsed: .total_paid_minutes_used
}'
```

### Tarefa 3: Criar gráficos personalizados no GitHub Projects

O GitHub Projects (v2) suporta gráficos personalizados para acompanhar itens de trabalho.

```bash
# List projects in the organization
gh api graphql -f query='
{
  organization(login: "contoso") {
    projectsV2(first: 10) {
      nodes {
        id
        title
        number
      }
    }
  }
}' --jq '.data.organization.projectsV2.nodes[]'
```

Para criar gráficos no GitHub Projects:

1. Navegue até o quadro do Project
2. Clique na aba "Insights" (ícone de gráfico)
3. Crie gráficos:

**Gráfico 1: Gráfico de burn-down**
- Tipo: Gráfico de linha
- Eixo X: Tempo
- Eixo Y: Contagem de itens
- Filtro: Status != Done
- Agrupar por: Nenhum

**Gráfico 2: Itens por responsável**
- Tipo: Gráfico de barras
- Eixo X: Assignee
- Eixo Y: Contagem
- Filtro: Status = In Progress
- Agrupar por: Priority

**Gráfico 3: Tempo de ciclo**
- Tipo: Gráfico de linha
- Eixo X: Data de fechamento
- Eixo Y: Duração (dias desde criação até fechamento)
- Filtro: Status = Done

**Gráfico 4: Distribuição por label**
- Tipo: Gráfico de pizza
- Agrupar por: Label
- Filtro: Status != Done

### Tarefa 4: Configurar notificações de falha de workflow

```yaml
# .github/workflows/notify-on-failure.yml
name: CI Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
      - run: npm run build

  notify-failure:
    runs-on: ubuntu-latest
    needs: [build]
    if: failure()
    steps:
      - name: Send Slack notification
        uses: slackapi/slack-github-action@v1.27.0
        with:
          payload: |
            {
              "text": "CI Pipeline Failed",
              "blocks": [
                {
                  "type": "header",
                  "text": {
                    "type": "plain_text",
                    "text": "Pipeline Failure: ${{ github.workflow }}"
                  }
                },
                {
                  "type": "section",
                  "fields": [
                    {"type": "mrkdwn", "text": "*Repository:*\n${{ github.repository }}"},
                    {"type": "mrkdwn", "text": "*Branch:*\n${{ github.ref_name }}"},
                    {"type": "mrkdwn", "text": "*Commit:*\n${{ github.sha }}"},
                    {"type": "mrkdwn", "text": "*Author:*\n${{ github.actor }}"}
                  ]
                },
                {
                  "type": "actions",
                  "elements": [
                    {
                      "type": "button",
                      "text": {"type": "plain_text", "text": "View Run"},
                      "url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                    }
                  ]
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK

      - name: Send Teams notification
        run: |
          curl -X POST "${{ secrets.TEAMS_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            --data '{
              "@type": "MessageCard",
              "summary": "CI Pipeline Failed",
              "themeColor": "FF0000",
              "title": "Pipeline Failure: ${{ github.workflow }}",
              "sections": [{
                "facts": [
                  {"name": "Repository", "value": "${{ github.repository }}"},
                  {"name": "Branch", "value": "${{ github.ref_name }}"},
                  {"name": "Author", "value": "${{ github.actor }}"},
                  {"name": "Commit", "value": "${{ github.sha }}"}
                ]
              }],
              "potentialAction": [{
                "@type": "OpenUri",
                "name": "View Run",
                "targets": [{"os": "default", "uri": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"}]
              }]
            }'
```

### Tarefa 5: Configurar dashboard de atividade de deploy por branch

```yaml
# .github/workflows/deployment-tracker.yml
name: Track deployments
on:
  deployment_status:

jobs:
  track:
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success'
    steps:
      - name: Record deployment metrics
        run: |
          echo "Deployment to ${{ github.event.deployment.environment }} succeeded"
          echo "SHA: ${{ github.event.deployment.sha }}"
          echo "Created: ${{ github.event.deployment.created_at }}"

          # Post deployment frequency metric
          gh api repos/${{ github.repository }}/deployments \
            --jq '[.[] | select(.environment == "${{ github.event.deployment.environment }}")] | length' \
            | xargs -I {} echo "Total deployments to ${{ github.event.deployment.environment }}: {}"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Consultar histórico de deploys:

```bash
# List recent deployments
gh api repos/contoso/webapp/deployments --jq '.[] | {
  id: .id,
  environment: .environment,
  sha: .sha[:7],
  creator: .creator.login,
  created: .created_at,
  description: .description
}' | head -20

# Deployment frequency (last 30 days)
gh api repos/contoso/webapp/deployments --jq '[
  .[] | select((.created_at | fromdateiso8601) > (now - 2592000))
] | group_by(.environment) | .[] | {
  environment: .[0].environment,
  count: length,
  frequency: (length / 30 | tostring + " per day")
}'
```

### Tarefa 6: Alertas do Azure Pipelines

Configurar notificações no Azure DevOps:

```bash
# Azure DevOps notification settings (via web UI):
# 1. Project Settings > Notifications
# 2. Create subscription:
#    - Category: Build
#    - Event: A build completes > with status Failed
#    - Deliver to: Team email or custom email
#    - Filter: Definition name = "Production-Deploy"

# Alternatively, configure per-pipeline notifications via REST API:
curl -X POST \
  "https://dev.azure.com/contoso/ContosoWeb/_apis/notification/subscriptions?api-version=7.1-preview.1" \
  -H "Authorization: Basic $(echo -n :$PAT | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Notify on production pipeline failure",
    "filter": {
      "type": "Expression",
      "filterModel": {
        "clauses": [{
          "logicalOperator": "",
          "fieldName": "Definition name",
          "operator": "=",
          "value": "Production-Deploy"
        }]
      }
    },
    "channel": {
      "type": "EmailHtml"
    },
    "subscriber": {
      "id": "ops-team@contoso.com"
    }
  }'
```

Avisos de retenção de pipeline:

```yaml
# azure-pipelines.yml - Warn before artifacts expire
schedules:
  - cron: "0 9 * * 1"
    displayName: Weekly retention audit
    branches:
      include:
        - main

steps:
  - task: PowerShell@2
    inputs:
      targetType: 'inline'
      script: |
        $headers = @{
          Authorization = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$(System.AccessToken)")))"
        }
        # Check builds with artifacts nearing retention limit
        $builds = Invoke-RestMethod -Uri "https://dev.azure.com/contoso/ContosoWeb/_apis/build/builds?api-version=7.1&minTime=$((Get-Date).AddDays(-25).ToString('o'))&maxTime=$((Get-Date).AddDays(-20).ToString('o'))" -Headers $headers
        if ($builds.count -gt 0) {
          Write-Host "##vso[task.logissue type=warning]$($builds.count) builds have artifacts expiring within 5 days"
        }
```

### Tarefa 7: Criar um workflow que envia resumo semanal de métricas

```yaml
# .github/workflows/weekly-metrics.yml
name: Weekly engineering metrics
on:
  schedule:
    - cron: '0 9 * * 1'  # Monday 9 AM UTC
  workflow_dispatch:

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Collect metrics
        id: metrics
        run: |
          # Workflow success rates
          DEPLOY_RUNS=$(gh run list --workflow deploy.yml --limit 50 --json conclusion)
          DEPLOY_SUCCESS=$(echo "$DEPLOY_RUNS" | jq '[.[] | select(.conclusion == "success")] | length')
          DEPLOY_TOTAL=$(echo "$DEPLOY_RUNS" | jq 'length')
          DEPLOY_RATE=$(echo "scale=1; $DEPLOY_SUCCESS * 100 / $DEPLOY_TOTAL" | bc)

          CI_RUNS=$(gh run list --workflow ci.yml --limit 50 --json conclusion)
          CI_SUCCESS=$(echo "$CI_RUNS" | jq '[.[] | select(.conclusion == "success")] | length')
          CI_TOTAL=$(echo "$CI_RUNS" | jq 'length')
          CI_RATE=$(echo "scale=1; $CI_SUCCESS * 100 / $CI_TOTAL" | bc)

          # PR metrics
          PRS_MERGED=$(gh pr list --state merged --limit 100 --json mergedAt \
            --jq '[.[] | select((.mergedAt | fromdateiso8601) > (now - 604800))] | length')
          PRS_OPEN=$(gh pr list --state open --json number --jq 'length')

          # Issues
          ISSUES_CLOSED=$(gh issue list --state closed --limit 100 --json closedAt \
            --jq '[.[] | select((.closedAt | fromdateiso8601) > (now - 604800))] | length')
          ISSUES_OPEN=$(gh issue list --state open --json number --jq 'length')

          # Store metrics
          echo "deploy-rate=$DEPLOY_RATE" >> $GITHUB_OUTPUT
          echo "ci-rate=$CI_RATE" >> $GITHUB_OUTPUT
          echo "prs-merged=$PRS_MERGED" >> $GITHUB_OUTPUT
          echo "prs-open=$PRS_OPEN" >> $GITHUB_OUTPUT
          echo "issues-closed=$ISSUES_CLOSED" >> $GITHUB_OUTPUT
          echo "issues-open=$ISSUES_OPEN" >> $GITHUB_OUTPUT
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Send digest to Slack
        uses: slackapi/slack-github-action@v1.27.0
        with:
          payload: |
            {
              "blocks": [
                {
                  "type": "header",
                  "text": {"type": "plain_text", "text": "Weekly Engineering Metrics - ${{ github.repository }}"}
                },
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Pipeline:* ${{ steps.metrics.outputs.deploy-rate }}% success rate\n*CI Pipeline:* ${{ steps.metrics.outputs.ci-rate }}% success rate\n*PRs Merged:* ${{ steps.metrics.outputs.prs-merged }} this week\n*PRs Open:* ${{ steps.metrics.outputs.prs-open }}\n*Issues Closed:* ${{ steps.metrics.outputs.issues-closed }} this week\n*Issues Open:* ${{ steps.metrics.outputs.issues-open }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK

## Exercícios de quebra e conserto

### Cenário de quebra 1: Insights do workflow mostram 0% de taxa de sucesso mas os pipelines estão passando

A página de insights do GitHub Actions mostra falhas para um workflow, mas os desenvolvedores confirmam que os builds estão verdes.

**Causa:** O workflow tem um job obrigatório que está sendo pulado devido a um filtro de caminho ou condicional. Jobs pulados são contados como neutros, mas a conclusão geral do workflow pode aparecer como "failure" se um job downstream falhar porque uma dependência foi pulada.

**Diagnóstico:**

```bash
gh run list --workflow ci.yml --limit 10 --json conclusion,status \
  --jq '.[] | {conclusion, status}'
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Garanta que jobs condicionais tratem condições de skip corretamente:

```yaml
jobs:
  test:
    if: always()
    needs: [build]
    # Use outcome check instead of default success() which fails on skip
    steps:
      - run: echo "Tests running"
        if: needs.build.result == 'success'
```

</details>

### Cenário de quebra 2: Notificações do Slack não estão sendo entregues

O job `notify-on-failure` executa com sucesso mas nenhuma mensagem do Slack aparece.

**Causa:** A URL do webhook do Slack expirou ou o webhook foi excluído do workspace do Slack.

**Diagnóstico:**

```bash
# Test the webhook directly
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "test message"}'
# If response is "invalid_token" or "channel_not_found", the webhook is broken
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Gere uma nova URL de webhook no Slack (Apps > Incoming Webhooks > Add new) e atualize o secret do repositório:

```bash
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/NEW/WEBHOOK/URL"
```

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "O gerente de engenharia da Contoso quer saber a frequência de deploy nos últimos 30 dias sem sair do terminal. Qual abordagem fornece esses dados?",
    options: [
      "Verificar a página de cobrança do GitHub Actions",
      "Consultar a API de deployments via 'gh api repos/contoso/webapp/deployments' e filtrar por data",
      "Baixar os logs de execução do workflow e contar manualmente",
      "Usar a página de tráfego do GitHub Insights"
    ],
    correctIndex: 1,
    explanation: "A API de Deployments do GitHub fornece um registro completo de todos os deploys com timestamps, ambientes e criadores. Ao consultar essa API e filtrar por intervalo de datas, você pode calcular a frequência de deploy, a cadência de deploy por ambiente e identificar padrões de deploy."
  },
  {
    question: "Um workflow do GitHub Actions precisa enviar uma notificação para o Microsoft Teams apenas quando o job de deploy de produção falha. Qual é a abordagem correta?",
    options: [
      "Adicionar um step de notificação no final do job de deploy",
      "Criar um job separado com 'if: failure()' que depende do job de deploy",
      "Configurar entrega de webhook do GitHub para o Teams",
      "Usar as notificações por email integradas do GitHub"
    ],
    correctIndex: 1,
    explanation: "Um job de notificação separado com needs: [deploy] e if: failure() executa apenas quando o job de dependência falha. Isso é mais limpo do que adicionar steps condicionais ao job de deploy (que não executariam se o job falhar cedo) e mais flexível do que notificações por email integradas."
  },
  {
    question: "A Contoso quer acompanhar o progresso de sprints com gráficos de burn-down e métricas de tempo de ciclo. Onde devem configurar essas visualizações?",
    options: [
      "Aba Insights do repositório GitHub",
      "GitHub Projects Insights (gráficos)",
      "Insights de workflows do GitHub Actions",
      "Azure DevOps Analytics"
    ],
    correctIndex: 1,
    explanation: "O GitHub Projects (v2) fornece uma aba Insights com gráficos personalizáveis incluindo gráficos de burn-down, acompanhamento de velocidade e visualizações de tempo de ciclo. Esses são baseados nos itens do projeto e suas transições de status. O Insights do repositório cobre tráfego e contribuições, não acompanhamento de itens de trabalho."
  },
  {
    question: "Um pipeline do Azure DevOps deve enviar uma notificação quando um build falha e também quando um build tem sucesso após uma falha anterior (notificação de recuperação). Como isso deve ser configurado?",
    options: [
      "Criar duas assinaturas de notificação: uma para falha e outra para sucesso com o filtro \"estado anterior era falha\"",
      "Criar uma única notificação para todas as conclusões de build",
      "Usar um step do pipeline com lógica condicional para verificar o status do build anterior",
      "Configurar um service hook com filtros de transição de estado"
    ],
    correctIndex: 0,
    explanation: "As assinaturas de notificação do Azure DevOps suportam filtragem por estado do evento. Criar uma assinatura para \"build falha\" e outra para \"build tem sucesso E último build falhou\" fornece tanto alertas de falha quanto notificações de recuperação. Esta é uma capacidade integrada do sistema de notificações sem exigir lógica personalizada no pipeline."
  }
]} />

## Limpeza

```bash
# Remove workflow files
rm -f .github/workflows/notify-on-failure.yml
rm -f .github/workflows/deployment-tracker.yml
rm -f .github/workflows/weekly-metrics.yml

# Remove notification subscriptions in Azure DevOps
# Project Settings > Notifications > Delete custom subscriptions

# Remove Slack webhook secret
gh secret delete SLACK_WEBHOOK_URL
gh secret delete TEAMS_WEBHOOK_URL

git add -A && git commit -m "cleanup: remove challenge 48 monitoring workflows" && git push
```
