---
sidebar_position: 4
title: "Dicas e estratégia para o exame"
---

# Dicas e estratégia para o exame AZ-400

## Formato do exame

- **40-60 questões** (múltipla escolha, arrastar e soltar, estudos de caso, laboratórios)
- **~120 minutos** (alguns candidatos relatam receber 150 min)
- **Pontuação para aprovação**: 700/1000
- As questões vêm de todos os 5 domínios, mas ~50% serão do Domínio 3 (pipelines)
- Questões de laboratório podem exigir que você execute tarefas no Azure DevOps ou no Azure Portal

## Principais estratégias

### 1. Conheça a sintaxe YAML de cor

O exame mostrará YAML de pipeline e pedirá que você:
- Identifique erros
- Escolha a configuração correta de trigger/stage/job
- Complete seções faltantes

Você precisa escrever YAML de memória, não apenas reconhecê-lo.

### 2. Pense em duas plataformas

Cada conceito tem duas implementações:
- GitHub Actions ↔ Azure Pipelines
- GitHub Packages ↔ Azure Artifacts
- GitHub Advanced Security ↔ Extensões do Azure DevOps
- GitHub Projects ↔ Azure Boards

O exame testa se você conhece **ambas** e quando escolher cada uma.

### 3. Segurança é uma área comum de reprovação

Candidatos frequentemente perdem pontos em:
- Workload identity federation vs service principals vs managed identities
- Quando usar GITHUB_TOKEN vs PAT vs GitHub App
- Padrões de autenticação sem secrets (OIDC)
- Permissões de pipeline e privilégio mínimo

### 4. DORA metrics aparecem frequentemente

Conheça as quatro métricas-chave:
- **Frequência de deploy** — Com que frequência você faz deploy em produção
- **Lead time para mudanças** — Tempo do commit até a produção
- **Tempo médio de recuperação (MTTR)** — Tempo para restaurar o serviço após um incidente
- **Taxa de falha de mudanças** — % de deploys que causam falhas

### 5. Estratégias de deploy importam

Seja capaz de explicar os trade-offs entre:
- Blue-green (rollback instantâneo, custo dobrado de infraestrutura)
- Canary (gradual, requer divisão de tráfego)
- Ring-based (exposição progressiva por audiência)
- Feature flags (nível de código, independente do deploy)

## Referência de armadilhas YAML

### Erros comuns em GitHub Actions

```yaml
# ERRADO: sintaxe de trigger
on:
  push:
    branch: main        # Deveria ser "branches: [main]"

# ERRADO: falta prefixo "uses"
steps:
  - checkout@v4        # Deveria ser "uses: actions/checkout@v4"

# ERRADO: env vs secrets
env:
  TOKEN: ${{ secrets.MY_TOKEN }}   # Correto para secrets
  TOKEN: ${{ env.MY_TOKEN }}       # Isso lê variável de ambiente, não secret

# ERRADO: dependência de job
jobs:
  deploy:
    needs: [build]     # Correto
    need: build        # Nome de chave errado
```

### Erros comuns em Azure Pipelines

```yaml
# ERRADO: stage vs stages
stage:                 # Deveria ser "stages:"
  - stage: Build

# ERRADO: sintaxe de pool
pool: ubuntu-latest    # Deveria ser "pool: { vmImage: 'ubuntu-latest' }"

# ERRADO: referência de variável
variables:
  myVar: 'hello'
steps:
  - script: echo $myVar          # Apenas Linux
  - script: echo $(myVar)        # Correto para Azure Pipelines
  - script: echo ${{ variables.myVar }}  # Expressão em tempo de compilação

# ERRADO: referência de template
template: templates/build.yml    # Deveria estar sob "extends:" ou em "steps:"
```

### Principais diferenças para memorizar

| Conceito | GitHub Actions | Azure Pipelines |
|---------|---------------|-----------------|
| Localização do arquivo CI | `.github/workflows/*.yml` | Raiz ou caminho especificado |
| Palavra-chave de trigger | `on:` | `trigger:` / `pr:` |
| Runner do job | `runs-on:` | `pool:` |
| Steps | `uses:` / `run:` | `task:` / `script:` |
| Acesso a secrets | `${{ secrets.NAME }}` | `$(NAME)` (de variable group/Key Vault) |
| Workflows reutilizáveis | `uses: org/repo/.github/workflows/x.yml@main` | `template: path/to/template.yml` |
| Environments | `environment:` com regras de proteção | `environment:` com checks/aprovações |
| Upload de artefatos | `actions/upload-artifact@v4` | Task `PublishBuildArtifacts@1` |
| Cache | `actions/cache@v4` | Task `Cache@2` |
| Estratégia de matrix | `strategy: { matrix: {} }` | `strategy: { matrix: {} }` (igual!) |

## Gerenciamento de tempo

| Seção | Tempo sugerido | Notas |
|---------|---------------|-------|
| Primeira passada (todas as questões) | 80 min | Responda o que sabe, marque o resto |
| Segunda passada (marcadas) | 30 min | Foque em questões de cenário |
| Seção de laboratório (se presente) | 20-30 min | Geralmente 1-2 tarefas de laboratório |
| Revisão | 10 min | Verifique respostas marcadas |

## Dicas por domínio

### Domínio 1: Processos (10-15%)

- Saiba a diferença entre GitHub Projects (v2) e Azure Boards
- Entenda como vincular commits a work items (sintaxe AB#123 no Azure DevOps)
- Conheça formatos de payload de webhook e quando usá-los

### Domínio 2: Controle de código-fonte (10-15%)

- `git filter-repo` é a ferramenta recomendada para remover dados sensíveis (não `filter-branch`)
- Entenda Scalar para repositórios grandes (protocolo GVFS)
- Saiba a diferença entre `CODEOWNERS` no GitHub vs políticas de branch no Azure DevOps

### Domínio 3: Pipelines (50-55%)

- Isso é METADE do exame — dedique tempo de estudo proporcional
- Saiba como configurar parallel jobs e agent pools
- Entenda a diferença entre `dependsOn` e `condition`
- Pipelines multi-stage: conheça a hierarquia stage → job → step
- Migração de classic para YAML é testável

### Domínio 4: Segurança (10-15%)

- Workload identity federation (OIDC) é a melhor prática moderna — conheça bem
- GitHub Advanced Security: CodeQL + secret scanning + Dependabot = o trio
- Microsoft Defender for Cloud DevOps Security conecta GitHub/ADO ao Defender

### Domínio 5: Instrumentação (5-10%)

- Saiba como criar anotações de deploy no Application Insights
- Básico de KQL: `where`, `summarize`, `render`, `ago(1h)`
- Entenda a diferença entre VM Insights, Container Insights e App Insights

## Recursos

| Recurso | Link |
|----------|------|
| Guia de estudo AZ-400 | [aka.ms/AZ400-StudyGuide](https://aka.ms/AZ400-StudyGuide) |
| Vídeos de preparação | [Exam Readiness Zone](https://learn.microsoft.com/en-us/shows/exam-readiness-zone/preparing-for-az-400-configure-processes-and-communications-1-of-5) |
| Avaliação prática gratuita | [Questões práticas](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-400/practice/assessment?assessment-type=practice&assessmentId=56) |
| Documentação GitHub Actions | [docs.github.com/actions](https://docs.github.com/en/actions) |
| Documentação Azure Pipelines | [learn.microsoft.com/azure/devops/pipelines](https://learn.microsoft.com/en-us/azure/devops/pipelines/) |
