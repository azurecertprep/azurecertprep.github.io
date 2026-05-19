---
sidebar_position: 2
title: "Desafio 02: Ciclos de feedback e rastreamento de trabalho"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 02: Ciclos de feedback e rastreamento de trabalho

## Habilidades do exame cobertas

- Projetar e implementar uma estratégia para ciclos de feedback, incluindo notificações e GitHub issues
- Projetar e implementar integração para rastreamento de trabalho, incluindo GitHub Projects, Azure Boards e repositórios

## Foco da plataforma

Comparação (GitHub Projects v2 e Azure Boards)

## Cenário

O desenvolvimento de produtos da Contoso Ltd está em desordem. Gerentes de projeto mantêm planilhas que ficam desatualizadas em poucas horas. Desenvolvedores rastreiam seu trabalho em notas adesivas físicas ou listas pessoais de tarefas. A equipe de QA só descobre sobre novas funcionalidades quando o código chega ao ambiente de staging. O planejamento de sprint é adivinhação porque ninguém tem dados sobre velocidade ou trabalho restante. O Diretor de Engenharia quer um sistema unificado de rastreamento de trabalho com ciclos de feedback adequados para que cada stakeholder tenha visibilidade em tempo real do status do projeto.

---

## Pré-requisitos

- Uma organização GitHub com um repositório (`contoso-webapp`)
- Uma organização Azure DevOps com um projeto (template de processo Agile)
- GitHub CLI instalado e autenticado
- Extensão Azure DevOps CLI instalada (`az extension add --name azure-devops`)
- Azure CLI autenticado (`az login`)

---

## Tarefa 1: Configurar GitHub Projects (v2) com campos personalizados e automação

GitHub Projects v2 usa um layout flexível de tabela/quadro com campos personalizados, visualizações e automação integrada.

### Criar o projeto

```bash
# Create an organization-level project
gh project create \
  --owner "contoso-org" \
  --title "Contoso Web Platform Q1" \
  --format "table"

# Note the project number from output (e.g., 5)
PROJECT_NUMBER=5

# List projects to confirm creation
gh project list --owner "contoso-org"
```

### Adicionar campos personalizados

```bash
# Add a Priority field (single select)
gh project field-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --name "Priority" \
  --data-type "SINGLE_SELECT" \
  --single-select-options "Critical,High,Medium,Low"

# Add a Sprint field (iteration)
gh project field-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --name "Sprint" \
  --data-type "ITERATION"

# Add a Team field (single select)
gh project field-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --name "Team" \
  --data-type "SINGLE_SELECT" \
  --single-select-options "Frontend,Backend,Platform,QA"

# Add a Story Points field (number)
gh project field-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --name "Story Points" \
  --data-type "NUMBER"
```

### Criar visualizações para diferentes stakeholders

```bash
# Create a board view for developers
gh project view-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --title "Sprint Board" \
  --layout "board"

# Create a table view for project managers
gh project view-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --title "Backlog Table" \
  --layout "table"

# Create a roadmap view for leadership
gh project view-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --title "Roadmap" \
  --layout "roadmap"
```

### Configurar automação integrada

Nas configurações do projeto (via UI ou API GraphQL), habilite estas automações:

```bash
# Using GraphQL to enable auto-add for a repository
gh api graphql -f query='
mutation {
  updateProjectV2(
    input: {
      projectId: "PROJECT_NODE_ID"
      title: "Contoso Web Platform Q1"
    }
  ) {
    projectV2 {
      id
    }
  }
}'

# Auto-add items from repository using project workflow settings
# Navigate to: Project > Settings > Workflows
# Enable:
#   - Item added to project -> Set Status to "Backlog"
#   - Pull request merged -> Set Status to "Done"
#   - Item reopened -> Set Status to "In Progress"
```

---

## Tarefa 2: Configurar Azure Boards com sprints, queries e dashboards

### Configurar o projeto Azure DevOps

```bash
# Set default organization and project
az devops configure --defaults \
  organization=https://dev.azure.com/contoso-org \
  project="Contoso Web Platform"

# Create a new team for the backend group
az devops team create \
  --name "Backend Team" \
  --description "Backend services development team"

# Create area paths for each team
az boards area project create \
  --name "Backend"
az boards area project create \
  --name "Frontend"
az boards area project create \
  --name "Platform"

# Create iteration paths for sprints
az boards iteration project create \
  --name "Sprint 1" \
  --start-date "2025-01-13" \
  --finish-date "2025-01-24"
az boards iteration project create \
  --name "Sprint 2" \
  --start-date "2025-01-27" \
  --finish-date "2025-02-07"
az boards iteration project create \
  --name "Sprint 3" \
  --start-date "2025-02-10" \
  --finish-date "2025-02-21"
```

### Criar work items

```bash
# Create an Epic
az boards work-item create \
  --type "Epic" \
  --title "User Authentication Overhaul" \
  --description "Replace legacy auth with OAuth 2.0 and OIDC" \
  --area "Contoso Web Platform\Backend" \
  --iteration "Contoso Web Platform\Sprint 1"

# Create a Feature under the Epic
az boards work-item create \
  --type "Feature" \
  --title "Implement SSO with Microsoft Entra ID" \
  --description "Enable single sign-on using MSAL library" \
  --area "Contoso Web Platform\Backend" \
  --iteration "Contoso Web Platform\Sprint 1"

# Create User Stories
az boards work-item create \
  --type "User Story" \
  --title "As a user, I can sign in with my corporate account" \
  --area "Contoso Web Platform\Backend" \
  --iteration "Contoso Web Platform\Sprint 1" \
  --fields "Microsoft.VSTS.Scheduling.StoryPoints=5"

az boards work-item create \
  --type "User Story" \
  --title "As an admin, I can configure SSO providers" \
  --area "Contoso Web Platform\Backend" \
  --iteration "Contoso Web Platform\Sprint 1" \
  --fields "Microsoft.VSTS.Scheduling.StoryPoints=8"

# Link parent-child relationships
az boards work-item relation add \
  --id 2 \
  --relation-type "Parent" \
  --target-id 1

az boards work-item relation add \
  --id 3 \
  --relation-type "Parent" \
  --target-id 2
```

### Criar queries úteis

```bash
# Create a shared query for sprint backlog
az boards query create \
  --name "Current Sprint - Backend" \
  --wiql "SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [Microsoft.VSTS.Scheduling.StoryPoints] FROM WorkItems WHERE [System.AreaPath] UNDER 'Contoso Web Platform\Backend' AND [System.IterationPath] = @CurrentIteration AND [System.State] <> 'Closed' ORDER BY [Microsoft.VSTS.Common.BacklogPriority]" \
  --path "Shared Queries"

# Create a query for bugs by priority
az boards query create \
  --name "Active Bugs by Priority" \
  --wiql "SELECT [System.Id], [System.Title], [System.State], [Microsoft.VSTS.Common.Priority], [System.AssignedTo] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] <> 'Closed' ORDER BY [Microsoft.VSTS.Common.Priority]" \
  --path "Shared Queries"
```

---

## Tarefa 3: Configurar GitHub Issues com templates, labels e milestones

### Criar templates de issue

```bash
cd contoso-webapp
mkdir -p .github/ISSUE_TEMPLATE

# Bug report template
cat > .github/ISSUE_TEMPLATE/bug_report.yml << 'EOF'
name: Bug Report
description: Report a bug in the application
title: "[Bug]: "
labels: ["bug", "triage"]
assignees: []
body:
  - type: markdown
    attributes:
      value: "Thank you for reporting a bug. Please fill in the details below."

  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - Critical (system down)
        - High (major feature broken)
        - Medium (feature impaired)
        - Low (cosmetic issue)
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Description
      description: What happened?
      placeholder: Describe the bug clearly
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Steps to reproduce
      description: How can we reproduce this?
      value: |
        1. Go to '...'
        2. Click on '...'
        3. Observe error
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
      description: What should have happened?
    validations:
      required: true

  - type: input
    id: environment
    attributes:
      label: Environment
      description: Browser, OS, and app version
      placeholder: "Chrome 120, Windows 11, v2.3.1"
    validations:
      required: true
EOF

# Feature request template
cat > .github/ISSUE_TEMPLATE/feature_request.yml << 'EOF'
name: Feature Request
description: Suggest a new feature or enhancement
title: "[Feature]: "
labels: ["enhancement"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem statement
      description: What problem does this feature solve?
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed solution
      description: How should this work?
    validations:
      required: true

  - type: dropdown
    id: priority
    attributes:
      label: Business priority
      options:
        - Must have (blocking release)
        - Should have (important but not blocking)
        - Nice to have (future consideration)
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
      description: What other approaches did you consider?
EOF

# Issue template chooser config
cat > .github/ISSUE_TEMPLATE/config.yml << 'EOF'
blank_issues_enabled: false
contact_links:
  - name: Security vulnerability
    url: https://github.com/contoso-org/contoso-webapp/security/advisories/new
    about: Report security vulnerabilities privately
  - name: Questions and discussions
    url: https://github.com/contoso-org/contoso-webapp/discussions
    about: Ask questions in GitHub Discussions
EOF
```

### Criar labels e milestones

```bash
# Create custom labels
gh label create "priority/critical" --color "B60205" --description "Requires immediate attention"
gh label create "priority/high" --color "D93F0B" --description "Important, fix soon"
gh label create "priority/medium" --color "FBCA04" --description "Normal priority"
gh label create "priority/low" --color "0E8A16" --description "Nice to have"
gh label create "team/backend" --color "1D76DB" --description "Backend team"
gh label create "team/frontend" --color "5319E7" --description "Frontend team"
gh label create "team/platform" --color "006B75" --description "Platform team"
gh label create "status/blocked" --color "B60205" --description "Blocked by dependency"
gh label create "status/needs-info" --color "D876E3" --description "Needs more information"

# Create milestones
gh api repos/{owner}/{repo}/milestones \
  --method POST \
  --field title="v2.4.0 - Auth Overhaul" \
  --field description="OAuth 2.0 migration and SSO support" \
  --field due_on="2025-02-28T00:00:00Z" \
  --field state="open"

gh api repos/{owner}/{repo}/milestones \
  --method POST \
  --field title="v2.5.0 - Performance" \
  --field description="Response time improvements and caching" \
  --field due_on="2025-03-31T00:00:00Z" \
  --field state="open"
```

---

## Tarefa 4: Vincular commits e PRs a work items

### Vinculação com GitHub Issues

```bash
# Create a commit that references an issue
git commit -m "feat: add OAuth callback handler

Implements the redirect URI handler for the Microsoft Entra ID
OAuth flow. Validates state parameter and exchanges auth code
for tokens.

Fixes #42
Relates to #38"

# Create a PR that closes an issue
gh pr create \
  --title "feat: implement SSO login flow" \
  --body "Implements the complete SSO login flow using MSAL.

Closes #42
Closes #43
Part of milestone v2.4.0"
```

### Vinculação com Azure Boards (sintaxe AB#)

Quando o Azure Boards está integrado ao seu repositório GitHub, use a sintaxe `AB#`:

```bash
# Commit that links to Azure Boards work item
git commit -m "feat: add token refresh logic

Implements automatic token refresh when the access token
expires. Uses the refresh token stored in the secure cookie.

AB#1234"

# PR that transitions a work item
gh pr create \
  --title "feat: token refresh implementation" \
  --body "Implements token refresh as described in the design doc.

Fixes AB#1234
Related to AB#1200"
```

A sintaxe `Fixes AB#1234` irá transicionar o work item para o estado "Done" quando o PR for mergeado.

---

## Tarefa 5: Configurar regras de notificação para stakeholders

### Configuração de notificações no GitHub

```bash
# Configure repository notification settings (per-user via API)
# Watch specific events only
gh api repos/{owner}/{repo}/subscription \
  --method PUT \
  --field subscribed=true \
  --field ignored=false

# Create a CODEOWNERS file for automatic review assignments
cat > .github/CODEOWNERS << 'EOF'
# Default owner for everything
* @contoso-org/engineering-leads

# Backend team owns API and services
/src/api/ @contoso-org/backend-team
/src/services/ @contoso-org/backend-team

# Frontend team owns UI components
/src/components/ @contoso-org/frontend-team
/src/pages/ @contoso-org/frontend-team

# Platform team owns infrastructure
/infrastructure/ @contoso-org/platform-team
/.github/workflows/ @contoso-org/platform-team

# Security team must review auth changes
/src/auth/ @contoso-org/security-team
EOF

git add .github/CODEOWNERS
git commit -m "chore: add CODEOWNERS for automatic review routing"
git push origin main
```

### Assinaturas de notificação no Azure DevOps

```bash
# Create a team notification for high-priority bugs
az devops invoke \
  --area notification \
  --resource subscriptions \
  --http-method POST \
  --api-version 7.1 \
  --in-file - << 'EOF'
{
  "description": "High priority bug assigned to Backend Team",
  "filter": {
    "type": "Expression",
    "filterModel": {
      "clauses": [
        {
          "fieldName": "System.WorkItemType",
          "operator": "=",
          "value": "Bug"
        },
        {
          "fieldName": "Microsoft.VSTS.Common.Priority",
          "operator": "<=",
          "value": "2"
        },
        {
          "fieldName": "System.AreaPath",
          "operator": "Under",
          "value": "Contoso Web Platform\\Backend"
        }
      ]
    }
  },
  "channel": {
    "type": "EmailHtml"
  },
  "subscriber": {
    "id": "backend-team-id"
  }
}
EOF
```

---

## Tarefa 6: Configurar GitHub Actions para atualizar project boards automaticamente

Crie um workflow que gerencia automaticamente os itens do project board:

```bash
cat > .github/workflows/project-automation.yml << 'EOF'
name: Project automation

on:
  issues:
    types: [opened, closed, labeled]
  pull_request:
    types: [opened, ready_for_review, closed]

jobs:
  add-to-project:
    runs-on: ubuntu-latest
    if: github.event_name == 'issues' && github.event.action == 'opened'
    steps:
      - name: Add issue to project
        uses: actions/add-to-project@v1
        with:
          project-url: https://github.com/orgs/contoso-org/projects/5
          github-token: ${{ secrets.PROJECT_TOKEN }}

  set-priority-on-label:
    runs-on: ubuntu-latest
    if: github.event_name == 'issues' && github.event.action == 'labeled'
    steps:
      - name: Set priority field based on label
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.PROJECT_TOKEN }}
          script: |
            const label = context.payload.label.name;
            const priorityMap = {
              'priority/critical': 'Critical',
              'priority/high': 'High',
              'priority/medium': 'Medium',
              'priority/low': 'Low'
            };

            if (priorityMap[label]) {
              core.info(`Setting priority to ${priorityMap[label]}`);
              // GraphQL mutation to update project item field
              // Implementation depends on project field IDs
            }

  move-pr-to-review:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' && github.event.action == 'ready_for_review'
    steps:
      - name: Move linked issues to In Review
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.PROJECT_TOKEN }}
          script: |
            const prBody = context.payload.pull_request.body || '';
            const issueRefs = prBody.match(/#(\d+)/g) || [];

            for (const ref of issueRefs) {
              const issueNumber = parseInt(ref.replace('#', ''));
              core.info(`PR is ready for review, linked issue: ${issueNumber}`);
            }

  close-linked-issues:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' && github.event.action == 'closed' && github.event.pull_request.merged == true
    steps:
      - name: Update project status for merged PR
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.PROJECT_TOKEN }}
          script: |
            core.info('PR merged - project automation will move items to Done');
EOF

git add .github/workflows/project-automation.yml
git commit -m "ci: add project board automation workflow"
git push origin main
```

---

## Exercícios de quebra e conserto

### Cenário 1: Issues não estão aparecendo no project board

Novas issues são criadas, mas não aparecem no GitHub Project.

**Diagnóstico:**

```bash
# Check if the project automation workflow has the correct token
gh run list --workflow=project-automation.yml --limit 5

# Check the workflow run logs for permission errors
gh run view <run-id> --log

# Verify the PROJECT_TOKEN secret has correct scopes
# The token needs: project (read/write), issues (read)
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Certifique-se de que o Personal Access Token ou token do GitHub App armazenado em `PROJECT_TOKEN` possui o escopo `project`. Projetos de organização também requerem o escopo `org:read`.

</details>

### Cenário 2: Work items do Azure Boards não estão transicionando ao fazer merge do PR

A sintaxe `Fixes AB#1234` não está movendo os itens para Done.

**Diagnóstico:**

```bash
# Verify the Azure Boards GitHub integration is installed
gh api repos/{owner}/{repo}/installations --jq '.[].app_slug'
# Should include "azure-boards"

# Check the work item state
az boards work-item show --id 1234 --fields "System.State"
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Certifique-se de que o GitHub App do Azure Boards está instalado no repositório e que a palavra-chave `Fixes` (não apenas `AB#`) é utilizada. A conexão deve ser configurada no Azure DevOps em Project Settings > GitHub connections.

</details>

### Cenário 3: CODEOWNERS não está acionando solicitações de revisão

PRs que modificam arquivos do backend não estão solicitando automaticamente revisões da equipe de backend.

**Diagnóstico:**

```bash
# Check if branch protection requires CODEOWNER reviews
gh api repos/{owner}/{repo}/branches/main/protection/required_pull_request_reviews \
  --jq '.require_code_owner_reviews'

# Verify CODEOWNERS file is in the correct location
# Must be in: .github/CODEOWNERS, CODEOWNERS, or docs/CODEOWNERS
gh api repos/{owner}/{repo}/contents/.github/CODEOWNERS --jq '.name'

# Check if the team exists and has repository access
gh api orgs/{org}/teams/backend-team/repos --jq '.[].name'
```


<details>
<summary>Mostrar solução</summary>

**Correção:** A proteção de branch deve ter "Require review from Code Owners" habilitado. A equipe referenciada no CODEOWNERS deve ter pelo menos acesso de leitura ao repositório.

</details>

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "No GitHub Projects v2, qual é a diferença entre uma visualização (view) e um campo (field)?",
    options: [
      "Visualizações são apenas para administradores; campos são visíveis para todos",
      "Campos definem os dados armazenados em cada item; visualizações definem como os itens são exibidos e filtrados",
      "Visualizações são permanentes; campos podem ser alterados",
      "Campos se aplicam apenas a issues; visualizações se aplicam a pull requests"
    ],
    correctIndex: 1,
    explanation: "Campos são metadados personalizados (prioridade, sprint, story points) anexados a cada item do projeto. Visualizações são configurações salvas que definem layout (tabela, quadro, roadmap), agrupamento, filtragem e ordenação desses itens."
  },
  {
    question: "Qual sintaxe na descrição de um PR irá automaticamente transicionar um work item do Azure Boards para o estado resolvido/fechado quando o PR for mergeado?",
    options: [
      "'AB#1234'",
      "'Linked AB#1234'",
      "'Fixes AB#1234'",
      "'Closes AB#1234'"
    ],
    correctIndex: 2,
    explanation: "A palavra-chave Fixes AB#1234 aciona a transição de estado. Usar apenas AB#1234 cria um vínculo sem transicionar. A palavra-chave Fixes é o gatilho obrigatório."
  },
  {
    question: "Qual é o propósito do arquivo CODEOWNERS em um repositório GitHub?",
    options: [
      "Restringe quem pode clonar o repositório",
      "Atribui automaticamente revisores a PRs com base nos arquivos modificados",
      "Define quem pode fazer merge de pull requests",
      "Configura permissões de acesso ao repositório"
    ],
    correctIndex: 1,
    explanation: "O CODEOWNERS mapeia caminhos de arquivos para equipes ou indivíduos que são automaticamente solicitados como revisores quando esses arquivos são alterados em um PR. Combinado com \"require CODEOWNER review\" na proteção de branch, ele garante a aprovação por especialistas do domínio."
  },
  {
    question: "Ao configurar iteration paths do Azure Boards para planejamento de sprint, o que a macro '@CurrentIteration' faz em uma query?",
    options: [
      "Retorna work items de todas as iterações passadas e atuais",
      "Resolve dinamicamente para a iteração que contém a data de hoje com base no contexto da equipe",
      "Mostra apenas itens na próxima iteração",
      "Retorna a iteração com mais work items"
    ],
    correctIndex: 1,
    explanation: "@CurrentIteration é uma macro dinâmica que resolve para qualquer iteration path que contenha a data atual no cronograma de iterações configurado da equipe. Isso significa que queries de dashboard mudam automaticamente para o sprint ativo sem atualizações manuais."
  }
]} />

## Limpeza

```bash
# Delete the GitHub project
gh project delete $PROJECT_NUMBER --owner "contoso-org" --yes

# Delete Azure Boards work items (if in a test project)
az boards work-item delete --id 1 --yes --destroy
az boards work-item delete --id 2 --yes --destroy
az boards work-item delete --id 3 --yes --destroy

# Remove labels
gh label delete "priority/critical" --yes
gh label delete "priority/high" --yes
gh label delete "priority/medium" --yes
gh label delete "priority/low" --yes
gh label delete "team/backend" --yes
gh label delete "team/frontend" --yes
gh label delete "team/platform" --yes

# Remove milestones
gh api repos/{owner}/{repo}/milestones/1 --method DELETE
gh api repos/{owner}/{repo}/milestones/2 --method DELETE
```
