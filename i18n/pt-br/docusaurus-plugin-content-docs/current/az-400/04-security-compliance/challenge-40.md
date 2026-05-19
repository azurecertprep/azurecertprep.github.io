---
sidebar_position: 2
title: "Desafio 40: Autenticação do GitHub"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 40: Autenticação do GitHub

## Habilidades do exame abordadas

- Implementar e gerenciar autenticação do GitHub, incluindo GitHub Apps, GITHUB_TOKEN e tokens de acesso pessoal
- Projetar e implementar permissões e funções no GitHub

## Cenário

A automação da Contoso Ltd depende de três tokens de acesso pessoal (PATs) clássicos criados por um desenvolvedor que saiu da empresa há seis meses. Esses PATs possuem escopo `repo` e `admin:org` sem data de expiração. Eles são compartilhados entre 15 repositórios e usados por integrações customizadas, workflows agendados e um bot de deployment. Você deve substituí-los por mecanismos de autenticação seguros, com escopo definido e auditáveis.

## Pré-requisitos

- Conta GitHub com acesso de administrador à organização (o plano gratuito é suficiente para a maioria das tarefas)
- Um repositório de teste na organização
- GitHub CLI (`gh`) instalado e autenticado

## Tarefas

### Tarefa 1: Entender o GITHUB_TOKEN (token automático)

O `GITHUB_TOKEN` é criado automaticamente para cada execução de workflow. Ele tem escopo para o repositório, não pode acessar outros repositórios e expira quando o job é concluído.

```yaml
# .github/workflows/auto-token-demo.yml
name: GITHUB_TOKEN demonstration
on:
  push:
    branches: [main]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  demo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create an issue using GITHUB_TOKEN
        run: |
          gh issue create \
            --title "Automated issue from workflow" \
            --body "Created by workflow run ${{ github.run_id }}" \
            --label "automation"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: List repository contents (read access)
        run: |
          gh api repos/${{ github.repository }}/contents \
            --jq '.[].name'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Características principais do GITHUB_TOKEN:
- Criado automaticamente, nenhuma configuração manual necessária
- Com escopo apenas para o repositório atual
- Expira quando o job é concluído
- Permissões configuráveis via a chave `permissions`
- Não pode disparar outros workflows (previne triggers recursivos)
- Não pode acessar outros repositórios na organização

### Tarefa 2: Criar um GitHub App para automação entre repositórios

Quando a automação precisa abranger múltiplos repositórios, crie um GitHub App.

```bash
# Navigate to: Organization Settings > Developer settings > GitHub Apps > New GitHub App

# Required settings:
# - App name: contoso-deploy-bot
# - Homepage URL: https://github.com/contoso
# - Webhook: Deactivate (for CI/CD use cases without event subscriptions)
# - Permissions:
#   - Repository: Contents (read), Pull requests (write), Deployments (write)
#   - Organization: Members (read)
# - Where can this app be installed: Only on this account
```

Gere um token de instalação em um workflow:

```yaml
# .github/workflows/cross-repo-deploy.yml
name: Cross-repo deployment
on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Generate installation token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ vars.CONTOSO_APP_ID }}
          private-key: ${{ secrets.CONTOSO_APP_PRIVATE_KEY }}
          owner: contoso

      - name: Clone deployment manifests from another repo
        run: |
          git clone https://x-access-token:${{ steps.app-token.outputs.token }}@github.com/contoso/deploy-manifests.git
          ls deploy-manifests/

      - name: Trigger deployment in target repo
        run: |
          gh workflow run deploy.yml \
            --repo contoso/production-infra \
            --ref main
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
```

### Tarefa 3: Tokens de acesso pessoal refinados (fine-grained)

Substitua PATs clássicos por PATs fine-grained com escopo limitado.

```bash
# Create a fine-grained PAT via:
# Settings > Developer settings > Personal access tokens > Fine-grained tokens

# Configuration:
# - Token name: contoso-ci-readonly
# - Expiration: 30 days (maximum recommended for automation)
# - Resource owner: contoso (organization)
# - Repository access: Only select repositories > contoso/webapp, contoso/api
# - Permissions:
#   - Contents: Read-only
#   - Metadata: Read-only (always required)
#   - Pull requests: Read and write

# Test the fine-grained PAT
gh auth login --with-token <<< "github_pat_xxxxx"

# Verify access scope
gh api repos/contoso/webapp --jq '.full_name'

# This should fail (not in token scope)
gh api repos/contoso/other-repo --jq '.full_name'
# Expected: 404 Not Found
```

Política organizacional para exigir PATs fine-grained:

1. Organization Settings > Personal access tokens > Settings
2. Restrict access via personal access tokens (classic): Do not allow
3. Require approval of fine-grained personal access tokens: Enable
4. Restrict access via fine-grained personal access tokens: Allow access via fine-grained personal access tokens

### Tarefa 4: Configurar permissões do GitHub App (mínimo necessário)

Projete permissões mínimas para os casos de uso da Contoso:

| Caso de uso | Permissões de repositório | Permissões de organização |
|----------|----------------------|-------------------------|
| Status de build CI | Checks: write, Contents: read | Nenhuma |
| Auto-merge de PRs | Pull requests: write, Contents: write | Nenhuma |
| Deployment | Deployments: write, Contents: read, Environments: read | Nenhuma |
| Notificações de equipe | Nenhuma | Members: read |
| Varredura de segurança | Security events: read, Contents: read | Nenhuma |

```bash
# Verify current app permissions
gh api /app --jq '.permissions'

# List installations and their repository access
gh api /app/installations --jq '.[].repository_selection'
```

### Tarefa 5: Usar GITHUB_TOKEN em workflows com a chave permissions

Configure permissões padrão e por job:

```yaml
# .github/workflows/restricted-permissions.yml
name: Least-privilege workflow
on:
  pull_request:
    branches: [main]

# Default permissions for all jobs in this workflow
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build

  test:
    runs-on: ubuntu-latest
    needs: build
    permissions:
      contents: read
      checks: write
    steps:
      - uses: actions/checkout@v4
      - run: npm test
      - name: Publish test results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Jest Tests
          path: reports/jest-*.xml
          reporter: jest-junit

  deploy:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push'
    permissions:
      contents: read
      id-token: write
      deployments: write
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

Defina permissões padrão de token na organização:

1. Organization Settings > Actions > General
2. Workflow permissions: Read repository contents and packages permissions
3. Desmarque "Allow GitHub Actions to create and approve pull requests"

### Tarefa 6: Funções de organização do GitHub

| Função | Nível de acesso | Caso de uso |
|------|-------------|----------|
| Owner | Acesso administrativo completo à organização | CTO, líder de plataforma (limitar a 2-3 pessoas) |
| Member | Acesso padrão, pode ser adicionado a equipes | Todos os desenvolvedores |
| Billing manager | Visualizar e gerenciar faturamento | Equipe financeira |
| Security manager | Acesso de leitura a todos os repos, gerenciar alertas de segurança | Equipe de segurança |
| Outside collaborator | Acesso apenas a repositórios específicos | Terceirizados, fornecedores |

```bash
# List organization members and their roles
gh api orgs/contoso/members --jq '.[] | {login: .login}'

# Set a team as security managers
gh api orgs/contoso/security-managers/teams/security-team -X PUT

# Invite an outside collaborator to a specific repo
gh api repos/contoso/webapp/collaborators/vendor-user -X PUT \
  --field permission=push
```

### Tarefa 7: Funções de repositório e funções customizadas

Funções padrão de repositório:

| Função | Permissões |
|------|------------|
| Read | Clonar, visualizar issues e PRs |
| Triage | Gerenciar issues e PRs (sem escrita de código) |
| Write | Push para branches não protegidos, merge de PRs |
| Maintain | Gerenciar configurações do repo (sem ações destrutivas) |
| Admin | Acesso completo incluindo configurações, exclusão |

Crie uma função de repositório customizada:

```bash
# Create a custom role via Organization Settings > Roles
gh api orgs/contoso/custom-repository-roles -X POST \
  --field name="Release Manager" \
  --field description="Can manage releases and deployments" \
  --field base_role="write" \
  --field permissions[]="manage_deploy_keys" \
  --field permissions[]="manage_releases" \
  --field permissions[]="edit_repo_metadata"

# Assign the custom role to a team for a repository
gh api orgs/contoso/teams/release-team/repos/contoso/webapp -X PUT \
  --field permission="custom:release-manager"
```

## Exercícios de quebra e conserto

### Cenário de quebra 1: GITHUB_TOKEN não pode fazer push para branch protegido

Um workflow que auto-formata código e faz push do resultado falha com "refusing to allow a GitHub App to create or update workflow files."

**Causa:** Por padrão, o `GITHUB_TOKEN` não pode fazer push para branches com regras de proteção que exigem revisão de PR, e nunca pode modificar arquivos de workflow em `.github/workflows/`.


<details>
<summary>Mostrar solução</summary>

**Correção:** Use um token de GitHub App em vez do GITHUB_TOKEN:

```yaml
- name: Generate token with bypass
  id: app-token
  uses: actions/create-github-app-token@v1
  with:
    app-id: ${{ vars.FORMATTER_APP_ID }}
    private-key: ${{ secrets.FORMATTER_APP_PRIVATE_KEY }}

- name: Push formatted code
  run: |
    git config user.name "contoso-formatter[bot]"
    git config user.email "contoso-formatter[bot]@users.noreply.github.com"
    git add -A
    git commit -m "style: auto-format"
    git push
  env:
    GH_TOKEN: ${{ steps.app-token.outputs.token }}
```

Além disso, adicione o GitHub App à lista de bypass da proteção de branch nas configurações do repositório.

</details>

### Cenário de quebra 2: Token de instalação do GitHub App retorna 403

**Causa:** O GitHub App está instalado na organização mas seu acesso a repositórios está configurado como "Selected repositories" e o repositório alvo não está incluído.

**Diagnóstico:**

```bash
# Check which repos the app installation can access
gh api /app/installations/{installation_id}/repositories --jq '.repositories[].full_name'
```


<details>
<summary>Mostrar solução</summary>

**Correção:** Atualize a instalação do app para incluir o repositório faltante via Organization Settings > Installed GitHub Apps > contoso-deploy-bot > Configure > adicione o repositório.

</details>
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Um workflow precisa criar um deployment no repositório atual e também disparar um workflow em um repositório diferente dentro da mesma organização. Qual abordagem de autenticação você deve usar?",
    options: [
      "GITHUB_TOKEN com 'permissions: contents: write'",
      "Um PAT clássico com escopo 'repo' armazenado como secret",
      "Um token de instalação de GitHub App",
      "Um PAT fine-grained com acesso a ambos os repositórios"
    ],
    correctIndex: 2,
    explanation: "O GITHUB_TOKEN não pode acessar outros repositórios, então não pode disparar workflows entre repos. Um GitHub App com acesso de instalação a ambos os repositórios fornece autenticação com escopo definido e auditável sem estar vinculado a uma conta de usuário. Embora um PAT fine-grained pudesse tecnicamente funcionar, GitHub Apps são preferidos para automação porque fornecem melhor trilha de auditoria e não são afetados por mudanças na conta do usuário."
  },
  {
    question: "A Contoso quer garantir que todos os tokens de automação expirem dentro de 90 dias. Quais tipos de token suportam expiração obrigatória no nível da organização?",
    options: [
      "Apenas PATs clássicos",
      "Apenas PATs fine-grained",
      "Tanto PATs clássicos quanto fine-grained",
      "GITHUB_TOKEN e PATs fine-grained"
    ],
    correctIndex: 1,
    explanation: "Administradores da organização podem impor políticas de tempo de vida máximo para PATs fine-grained através das configurações da organização. PATs clássicos podem ser configurados para expirar pelo usuário, mas a organização não pode impor uma política de tempo de vida máximo sobre eles (apenas restringir ou bloqueá-los inteiramente). O GITHUB_TOKEN já expira automaticamente após cada job."
  },
  {
    question: "Um security manager na Contoso precisa visualizar e descartar alertas do Dependabot em todos os repositórios, mas não deve poder modificar código. Qual é a função mais apropriada?",
    options: [
      "Organization Owner",
      "Organization Member com acesso Write a todos os repos",
      "Função de organização Security Manager",
      "Função de repositório Triage em cada repo"
    ],
    correctIndex: 2,
    explanation: "A função Security Manager concede acesso de leitura a todos os repositórios e a capacidade de gerenciar alertas de segurança (incluindo Dependabot, secret scanning e code scanning) em toda a organização sem acesso de escrita ao código. Isso segue o princípio do privilégio mínimo."
  },
  {
    question: "Qual afirmação sobre o GITHUB_TOKEN está correta?",
    options: [
      "Ele pode ser usado para disparar outros workflows no mesmo repositório",
      "Suas permissões são fixas e não podem ser customizadas por workflow",
      "Ele persiste entre múltiplas execuções de workflow para fins de cache",
      "Ele não pode ser usado para fazer push de commits no repositório se a proteção de branch exige revisões de PR"
    ],
    correctIndex: 3,
    explanation: "O GITHUB_TOKEN respeita regras de proteção de branch e não pode contornar revisões obrigatórias. Ele também não pode disparar outros workflows (para prevenir loops infinitos). Suas permissões são customizáveis via a chave permissions, e ele expira após cada job (não persiste entre execuções)."
  }
]} />

## Limpeza

```bash
# Delete the GitHub App (via web UI)
# Organization Settings > Developer settings > GitHub Apps > contoso-deploy-bot > Delete

# Revoke fine-grained PATs
# Settings > Developer settings > Personal access tokens > Fine-grained tokens > Delete

# Remove outside collaborators
gh api repos/contoso/webapp/collaborators/vendor-user -X DELETE

# Delete custom roles
gh api orgs/contoso/custom-repository-roles/{role_id} -X DELETE

# Delete test repository workflows
rm -rf .github/workflows/auto-token-demo.yml
rm -rf .github/workflows/cross-repo-deploy.yml
rm -rf .github/workflows/restricted-permissions.yml
git add -A && git commit -m "cleanup: remove challenge 40 test workflows" && git push
```
