---
sidebar_position: 4
title: "Desafio 04: Métricas e dashboards de DevOps"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 04: Métricas e dashboards de DevOps

## Habilidades do exame cobertas

- Projetar e implementar um dashboard, incluindo fluxo de trabalho (tempos de ciclo, tempo de recuperação, lead time)
- Projetar e implementar métricas e consultas apropriadas para planejamento de projetos, desenvolvimento, testes, segurança, entrega e operações

## Foco da plataforma

Comparação (GitHub e Azure DevOps)

## Cenário

O CTO da Contoso Ltd entra na reunião geral e faz três perguntas: "Com que rapidez entregamos funcionalidades? Com que frequência quebramos produção? Com que rapidez nos recuperamos quando as coisas dão errado?" A sala fica em silêncio. Ninguém tem respostas porque a organização nunca mediu o desempenho de entrega de software. As equipes relatam estimativas anedóticas, e não há dados para distinguir equipes de alto desempenho daquelas com dificuldades. O CTO quer que as métricas DORA sejam rastreadas automaticamente, exibidas em dashboards e usadas para impulsionar conversas de melhoria nas revisões mensais de engenharia.

---

## Pré-requisitos

- Um repositório GitHub com pelo menos 30 dias de histórico de commits e deploy
- Um projeto Azure DevOps com work items e execuções de pipeline
- GitHub CLI e Azure DevOps CLI instalados
- Familiaridade com conceitos básicos de análise (médias, percentis)
- Extensão Azure DevOps Analytics habilitada

---

## Tarefa 1: Entender as quatro métricas DORA

DORA (DevOps Research and Assessment) identifica quatro métricas-chave que preveem o desempenho de entrega de software:

### Frequência de deploy

Com que frequência o código é implantado em produção.

| Nível | Frequência |
|-------|-----------|
| Elite | Sob demanda (múltiplos deploys por dia) |
| Alto | Entre uma vez por dia e uma vez por semana |
| Médio | Entre uma vez por semana e uma vez por mês |
| Baixo | Entre uma vez por mês e uma vez a cada seis meses |

### Lead time para mudanças

Tempo desde o commit do código até a execução em produção.

| Nível | Lead time |
|-------|-----------|
| Elite | Menos de uma hora |
| Alto | Entre um dia e uma semana |
| Médio | Entre uma semana e um mês |
| Baixo | Entre um mês e seis meses |

### Tempo médio de recuperação (MTTR)

Quanto tempo leva para restaurar o serviço após um incidente em produção.

| Nível | Tempo de recuperação |
|-------|--------------|
| Elite | Menos de uma hora |
| Alto | Menos de um dia |
| Médio | Entre um dia e uma semana |
| Baixo | Mais de uma semana |

### Taxa de falha de mudanças

Porcentagem de deploys que resultam em degradação do serviço, exigindo remediação.

| Nível | Taxa de falha |
|-------|-------------|
| Elite | 0-15% |
| Alto | 16-30% |
| Médio | 31-45% |
| Baixo | 46-60% |

---

## Tarefa 2: Calcular métricas DORA a partir de dados do GitHub

### Frequência de deploy

```bash
# Count deployments per week for the last 90 days
gh api repos/{owner}/{repo}/deployments \
  --paginate \
  --jq '[.[] | select(.environment == "production")] | 
    group_by(.created_at[:10]) | 
    length' 

# More detailed: deployments per week
gh api repos/{owner}/{repo}/deployments \
  --paginate \
  --jq '[.[] | select(.environment == "production") | .created_at[:10]] | 
    sort | 
    group_by(.[0:7]) | 
    map({week: .[0][0:7], count: length})'

# Alternative: count merged PRs to main as a deployment proxy
gh pr list --state merged --base main --limit 100 \
  --json mergedAt \
  --jq 'group_by(.mergedAt[:10]) | map({date: .[0].mergedAt[:10], count: length})'
```

### Lead time para mudanças

```bash
# Calculate time from first commit in PR to merge
gh pr list --state merged --base main --limit 50 \
  --json number,createdAt,mergedAt \
  --jq '.[] | {
    pr: .number,
    created: .createdAt,
    merged: .mergedAt,
    lead_time_hours: ((.mergedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 3600
  }'

# Average lead time
gh pr list --state merged --base main --limit 50 \
  --json createdAt,mergedAt \
  --jq '[.[] | ((.mergedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 3600] | 
    (add / length) | 
    "Average lead time: \(. | floor) hours"'
```

### Taxa de falha de mudanças

```bash
# Count deployments with rollbacks or hotfixes
# Assuming failed deployments have a "failure" status
gh api repos/{owner}/{repo}/deployments \
  --paginate \
  --jq '{
    total: [.[] | select(.environment == "production")] | length,
    failed: [.[] | select(.environment == "production") | 
      select(.statuses[0].state == "failure" or .statuses[0].state == "error")] | length
  } | "Failure rate: \(.failed)/\(.total) = \(.failed * 100 / .total)%"'

# Alternative: count reverts and hotfix branches
gh pr list --state merged --base main --limit 200 \
  --json title \
  --jq '[.[] | select(.title | test("revert|hotfix|rollback"; "i"))] | length'
```

### Tempo médio de recuperação

```bash
# Using GitHub Issues labeled as incidents
gh issue list --label "incident" --state closed --limit 50 \
  --json number,createdAt,closedAt \
  --jq '[.[] | {
    issue: .number,
    recovery_hours: ((.closedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 3600
  }] | 
  (map(.recovery_hours) | add / length) |
  "Average MTTR: \(. | floor) hours"'
```

---

## Tarefa 3: Criar um dashboard no Azure DevOps com widgets de analytics

### Criar o dashboard

```bash
# Create a team dashboard
az devops invoke \
  --area dashboard \
  --resource dashboards \
  --http-method POST \
  --api-version 7.1-preview.3 \
  --route-parameters team="Backend Team" \
  --in-file - << 'EOF'
{
  "name": "Engineering Metrics",
  "description": "DORA metrics and team performance dashboard",
  "widgets": []
}
EOF
```

### Adicionar widgets via REST API

```bash
DASHBOARD_ID="<dashboard-id-from-above>"

# Add a Burndown widget
az devops invoke \
  --area dashboard \
  --resource widgets \
  --http-method POST \
  --api-version 7.1-preview.2 \
  --route-parameters team="Backend Team" dashboardId=$DASHBOARD_ID \
  --in-file - << 'EOF'
{
  "name": "Sprint Burndown",
  "position": {"row": 1, "column": 1},
  "size": {"rowSpan": 2, "columnSpan": 3},
  "contributionId": "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.BurndownWidget",
  "settings": "{\"timePeriod\":\"currentIteration\",\"aggregation\":\"storyPoints\"}"
}
EOF

# Add a Velocity widget
az devops invoke \
  --area dashboard \
  --resource widgets \
  --http-method POST \
  --api-version 7.1-preview.2 \
  --route-parameters team="Backend Team" dashboardId=$DASHBOARD_ID \
  --in-file - << 'EOF'
{
  "name": "Velocity",
  "position": {"row": 1, "column": 4},
  "size": {"rowSpan": 2, "columnSpan": 3},
  "contributionId": "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.VelocityWidget",
  "settings": "{\"numberOfSprints\":6}"
}
EOF

# Add a Cycle Time widget
az devops invoke \
  --area dashboard \
  --resource widgets \
  --http-method POST \
  --api-version 7.1-preview.2 \
  --route-parameters team="Backend Team" dashboardId=$DASHBOARD_ID \
  --in-file - << 'EOF'
{
  "name": "Cycle Time",
  "position": {"row": 3, "column": 1},
  "size": {"rowSpan": 2, "columnSpan": 3},
  "contributionId": "ms.vss-analytics-widgets.Microsoft.VisualStudioOnline.Analytics.CycleTimeWidget",
  "settings": "{\"timePeriod\":\"last30Days\",\"workItemType\":\"User Story\"}"
}
EOF
```

---

## Tarefa 4: Usar Azure DevOps Analytics com consultas OData

O Azure DevOps Analytics fornece endpoints OData para consultas avançadas.

### Consultar dados de tempo de ciclo

```bash
# Get average cycle time for user stories in the last 30 days
ANALYTICS_URL="https://analytics.dev.azure.com/contoso-org/Contoso%20Web%20Platform/_odata/v4.0-preview"

curl -s -u ":$AZURE_DEVOPS_PAT" \
  "$ANALYTICS_URL/WorkItems?\$filter=WorkItemType eq 'User Story' and StateCategory eq 'Completed' and CompletedDate gt 2025-01-01Z&\$select=WorkItemId,Title,CycleTimeDays&\$orderby=CompletedDate desc&\$top=50" | \
  jq '.value[] | {id: .WorkItemId, title: .Title, cycle_time_days: .CycleTimeDays}'

# Get lead time distribution
curl -s -u ":$AZURE_DEVOPS_PAT" \
  "$ANALYTICS_URL/WorkItems?\$filter=WorkItemType eq 'User Story' and StateCategory eq 'Completed' and CompletedDate gt 2024-12-01Z&\$apply=groupby((Area/AreaPath),aggregate(LeadTimeDays with average as AvgLeadTime, LeadTimeDays with max as MaxLeadTime, \$count as Count))" | \
  jq '.value'

# Pipeline pass rate over time
curl -s -u ":$AZURE_DEVOPS_PAT" \
  "$ANALYTICS_URL/PipelineRuns?\$filter=CompletedDate gt 2025-01-01Z and Pipeline/PipelineName eq 'contoso-webapp-ci'&\$apply=groupby((CompletedDateSK),aggregate(\$count as TotalRuns, SucceededCount with sum as Passed))" | \
  jq '.value[] | {date: .CompletedDateSK, total: .TotalRuns, passed: .Passed, pass_rate: (.Passed * 100 / .TotalRuns)}'
```

### Consultar frequência de deploy a partir de pipelines

```bash
# Count production deployments per week
curl -s -u ":$AZURE_DEVOPS_PAT" \
  "$ANALYTICS_URL/PipelineRuns?\$filter=Pipeline/PipelineName eq 'contoso-webapp-deploy' and RunOutcome eq 'Succeed' and CompletedDate gt 2024-10-01Z&\$apply=groupby((CompletedDate/WeekStartingMonday),aggregate(\$count as DeployCount))&\$orderby=CompletedDate/WeekStartingMonday desc" | \
  jq '.value'
```

---

## Tarefa 5: Implementar um workflow do GitHub Actions que rastreia a frequência de deploy

```bash
cat > .github/workflows/track-deployment.yml << 'EOF'
name: Track deployment metrics

on:
  deployment_status:
    types: [completed]
  workflow_run:
    workflows: ["Deploy to Production"]
    types: [completed]

jobs:
  record-deployment:
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success' || github.event.workflow_run.conclusion == 'success'
    steps:
      - uses: actions/checkout@v4

      - name: Record deployment event
        uses: actions/github-script@v7
        with:
          script: |
            const now = new Date().toISOString();
            const sha = context.sha;
            
            // Get the first commit time for this deployment
            const commits = await github.rest.repos.listCommits({
              owner: context.repo.owner,
              repo: context.repo.repo,
              sha: sha,
              per_page: 1
            });
            
            const commitTime = commits.data[0]?.commit?.author?.date;
            const deployTime = now;
            
            // Calculate lead time in hours
            const leadTimeMs = new Date(deployTime) - new Date(commitTime);
            const leadTimeHours = (leadTimeMs / (1000 * 60 * 60)).toFixed(1);
            
            core.info(`Deployment recorded:`);
            core.info(`  SHA: ${sha}`);
            core.info(`  Deploy time: ${deployTime}`);
            core.info(`  Commit time: ${commitTime}`);
            core.info(`  Lead time: ${leadTimeHours} hours`);
            
            // Create a deployment annotation
            await github.rest.repos.createDeploymentStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              deployment_id: context.payload.deployment?.id || 0,
              state: 'success',
              description: `Lead time: ${leadTimeHours}h`,
              environment: 'production'
            });

      - name: Check for change failure
        uses: actions/github-script@v7
        with:
          script: |
            // Look for rollback deployments in the last 24 hours
            const deployments = await github.rest.repos.listDeployments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              environment: 'production',
              per_page: 10
            });
            
            const now = new Date();
            const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
            
            const recentDeployments = deployments.data.filter(
              d => new Date(d.created_at) > oneDayAgo
            );
            
            if (recentDeployments.length > 3) {
              core.warning(
                `${recentDeployments.length} deployments in last 24h - possible instability`
              );
            }
            
            core.info(`Deployments in last 24h: ${recentDeployments.length}`);
EOF

git add .github/workflows/track-deployment.yml
git commit -m "ci: add deployment metrics tracking workflow"
git push origin main
```

---

## Tarefa 6: Criar um relatório resumido de métricas

Construa um workflow que gera um resumo semanal de métricas DORA:

```bash
cat > .github/workflows/weekly-metrics.yml << 'EOF'
name: Weekly DORA metrics report

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
  workflow_dispatch:

jobs:
  generate-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Calculate deployment frequency
        id: deploy-freq
        uses: actions/github-script@v7
        with:
          script: |
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            
            const deployments = await github.rest.repos.listDeployments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              environment: 'production',
              per_page: 100
            });
            
            const thisWeek = deployments.data.filter(
              d => new Date(d.created_at) > new Date(sevenDaysAgo)
            );
            
            core.setOutput('count', thisWeek.length);
            core.setOutput('frequency', thisWeek.length >= 7 ? 'Elite' : 
              thisWeek.length >= 1 ? 'High' : 'Medium');

      - name: Calculate lead time
        id: lead-time
        uses: actions/github-script@v7
        with:
          script: |
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            
            const prs = await github.rest.pulls.list({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'closed',
              base: 'main',
              sort: 'updated',
              direction: 'desc',
              per_page: 50
            });
            
            const mergedThisWeek = prs.data.filter(
              pr => pr.merged_at && new Date(pr.merged_at) > new Date(sevenDaysAgo)
            );
            
            if (mergedThisWeek.length === 0) {
              core.setOutput('avg_hours', 'N/A');
              core.setOutput('level', 'N/A');
              return;
            }
            
            const leadTimes = mergedThisWeek.map(pr => {
              return (new Date(pr.merged_at) - new Date(pr.created_at)) / (1000 * 60 * 60);
            });
            
            const avg = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;
            core.setOutput('avg_hours', avg.toFixed(1));
            core.setOutput('level', avg < 1 ? 'Elite' : avg < 168 ? 'High' : 'Medium');

      - name: Create metrics issue
        uses: actions/github-script@v7
        with:
          script: |
            const deployCount = '${{ steps.deploy-freq.outputs.count }}';
            const deployLevel = '${{ steps.deploy-freq.outputs.frequency }}';
            const leadTime = '${{ steps.lead-time.outputs.avg_hours }}';
            const leadLevel = '${{ steps.lead-time.outputs.level }}';
            
            const today = new Date().toISOString().split('T')[0];
            const body = `## Weekly DORA metrics report - ${today}

| Metric | Value | Level |
|--------|-------|-------|
| Deployment frequency | ${deployCount} deploys/week | ${deployLevel} |
| Lead time for changes | ${leadTime} hours avg | ${leadLevel} |
| Change failure rate | TBD | TBD |
| MTTR | TBD | TBD |

### Performance levels reference
- Elite: Multiple deploys/day, <1h lead time, <15% failure, <1h recovery
- High: Weekly deploys, <1 week lead time, 16-30% failure, <1 day recovery
- Medium: Monthly deploys, <1 month lead time, 31-45% failure, <1 week recovery

### Actions
- [ ] Review metrics with engineering leads
- [ ] Identify improvement opportunities
- [ ] Update team OKRs if needed
`;
            
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `DORA Metrics Report - Week of ${today}`,
              body: body,
              labels: ['metrics', 'automated']
            });
EOF

git add .github/workflows/weekly-metrics.yml
git commit -m "ci: add weekly DORA metrics report generation"
git push origin main
```

---

## Exercícios de quebra e conserto

### Cenário 1: Consultas OData do Analytics retornam 401 Unauthorized

```bash
# Check if the Analytics extension is enabled
az devops extension show \
  --publisher-id ms \
  --extension-id vss-analytics \
  --org https://dev.azure.com/contoso-org

# If disabled, enable it
az devops extension install \
  --publisher-id ms \
  --extension-id vss-analytics \
  --org https://dev.azure.com/contoso-org
```


<details>
<summary>Mostrar solução</summary>

**Correção:** A extensão Azure DevOps Analytics deve estar instalada na organização. O PAT deve ter o escopo Analytics (read). Verifique com:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -u ":$AZURE_DEVOPS_PAT" \
  "https://analytics.dev.azure.com/contoso-org/_odata/v4.0-preview/\$metadata"
# Should return 200
```

</details>

### Cenário 2: Frequência de deploy mostra zero apesar de deploys ativos

**Diagnóstico:**

```bash
# Check if deployments use the correct environment name
gh api repos/{owner}/{repo}/deployments --jq '.[].environment' | sort -u

# Common issue: environment is "Production" (capitalized) but query uses "production"
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Os ambientes de deploy do GitHub são case-sensitive. Certifique-se de que seu workflow cria deploys com um nome de ambiente consistente, e que as consultas correspondam exatamente.

</details>

### Cenário 3: Cálculo de lead time está inflado por PRs obsoletos

PRs antigos que ficaram abertos por semanas distorcem o lead time médio.


<details>
<summary>Mostrar solução</summary>

**Correção:** Filtre para PRs criados dentro da janela de medição, ou use o p50 (mediana) em vez da média:

```bash
gh pr list --state merged --base main --limit 100 \
  --json createdAt,mergedAt \
  --jq '[.[] | ((.mergedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 3600] | sort | .[length/2 | floor]'
```


</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual métrica DORA mede o tempo entre um desenvolvedor fazer commit do código e esse código estar rodando em produção?",
    options: [
      "Frequência de deploy",
      "Lead time para mudanças",
      "Tempo médio de recuperação",
      "Taxa de falha de mudanças"
    ],
    correctIndex: 1,
    explanation: "Lead time para mudanças mede o tempo decorrido desde quando uma mudança de código é commitada até quando está rodando com sucesso em produção. Isso inclui tempo de code review, execução do pipeline de CI/CD e quaisquer gates de aprovação manual."
  },
  {
    question: "Uma organização faz deploy em produção três vezes por semana e tem um lead time médio de quatro dias. De acordo com as classificações DORA, qual nível de desempenho essas métricas indicam?",
    options: [
      "Elite para ambas",
      "Alto para frequência de deploy, Médio para lead time",
      "Alto para ambas",
      "Médio para frequência de deploy, Alto para lead time"
    ],
    correctIndex: 2,
    explanation: "Três deploys por semana se enquadra na categoria Alto (entre diário e semanal). Quatro dias de lead time também se enquadra na categoria Alto (entre um dia e uma semana)."
  },
  {
    question: "Qual é o objetivo principal do endpoint OData do Azure DevOps Analytics?",
    options: [
      "Armazenar artefatos de build",
      "Fornecer uma camada de relatórios consultável sobre os dados operacionais do Azure DevOps com suporte a agregação",
      "Substituir as consultas do Azure Boards",
      "Sincronizar dados entre Azure DevOps e GitHub"
    ],
    correctIndex: 1,
    explanation: "O endpoint OData do Analytics fornece um data warehouse otimizado para leitura e consultável sobre os dados do Azure DevOps. Ele suporta operações de agregação, filtragem e agrupamento que seriam caras ou impossíveis diretamente contra as APIs operacionais."
  },
  {
    question: "Uma equipe quer melhorar sua taxa de falha de mudanças. Qual prática reduziria mais diretamente essa métrica?",
    options: [
      "Fazer deploy com mais frequência",
      "Implementar testes automatizados abrangentes, rollouts progressivos e feature flags",
      "Reduzir o número de desenvolvedores",
      "Aumentar o número de aprovações manuais"
    ],
    correctIndex: 1,
    explanation: "A taxa de falha de mudanças é reduzida ao detectar problemas antes que cheguem à produção (testes automatizados), limitar o raio de impacto quando problemas ocorrem (rollouts progressivos, deploys canário) e permitir rollback instantâneo sem reimplantação (feature flags)."
  }
]} />

## Limpeza

```bash
# Remove workflow files
rm -f .github/workflows/track-deployment.yml
rm -f .github/workflows/weekly-metrics.yml

# Close any auto-generated metrics issues
gh issue list --label "metrics,automated" --json number --jq '.[].number' | \
  xargs -I {} gh issue close {}

# Remove the metrics label
gh label delete "metrics" --yes
gh label delete "automated" --yes

# Commit cleanup
git add -A
git commit -m "chore: remove metrics lab artifacts"
git push origin main
```
