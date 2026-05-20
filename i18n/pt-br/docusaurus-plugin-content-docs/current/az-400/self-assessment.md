---
sidebar_position: 2
title: "Estou pronto?"
---

import SelfAssessment from '@site/src/components/SelfAssessment';

# Estou pronto para o AZ-400?

Antes de mergulhar nos desafios, avalie sua prontidão. O AZ-400 assume que você já tem experiência administrando ou desenvolvendo no Azure, além de familiaridade com pelo menos uma plataforma de CI/CD.

## Checklist de autoavaliação

Clique em cada linha para alternar entre: ✅ Confortável | ⚠️ Preciso Revisar | ❌ Novo para Mim

### Pré-requisitos

<SelfAssessment
  storageKey="az400-prereqs"
  skills={[
    "Tenho experiência com administração Azure (nível AZ-104) ou desenvolvimento Azure (nível AZ-204)",
    "Estou confortável com a linha de comando (Bash, PowerShell)",
    "Entendo sintaxe YAML e consigo ler/escrever arquivos YAML",
    "Já usei Git para controle de versão (commit, branch, merge, PR)",
    "Entendo redes básicas (HTTP, DNS, load balancers, TLS)",
    "Já fiz deploy de pelo menos uma aplicação no Azure (App Service, ACA ou VMs)",
  ]}
/>

### Domínio 1: Processos e comunicações (10-15%)

<SelfAssessment
  storageKey="az400-domain1"
  skills={[
    "Consigo projetar um fluxo de branching GitHub Flow para uma equipe",
    "Consigo configurar GitHub Projects ou Azure Boards para rastreamento de sprints",
    "Consigo configurar integração entre Azure Boards e repositórios GitHub",
    "Consigo explicar DORA metrics (frequência de deploy, lead time, MTTR, taxa de falha de mudanças)",
    "Consigo configurar webhooks e notificações no Teams para eventos de pipeline",
    "Consigo criar documentação de projeto usando wikis e diagramas Mermaid",
  ]}
/>

### Domínio 2: Estratégia de controle de código-fonte (10-15%)

<SelfAssessment
  storageKey="az400-domain2"
  skills={[
    "Consigo explicar estratégias trunk-based vs feature branch vs release branch",
    "Consigo configurar regras de proteção de branch e políticas",
    "Consigo configurar um fluxo de PR com revisores obrigatórios, status checks e restrições de merge",
    "Consigo configurar Git LFS para arquivos binários grandes",
    "Consigo recuperar branches deletadas e usar git reflog",
    "Consigo remover dados sensíveis do histórico git usando filter-repo",
    "Consigo explicar quando usar mono-repo vs multi-repo",
  ]}
/>

### Domínio 3: Pipelines de build e release (50-55%)

#### Gerenciamento de pacotes

<SelfAssessment
  storageKey="az400-packages"
  skills={[
    "Consigo publicar pacotes no GitHub Packages e Azure Artifacts",
    "Consigo configurar upstream sources e feed views (prerelease, release)",
    "Consigo implementar SemVer e explicar quando usar CalVer",
  ]}
/>

#### Testes

<SelfAssessment
  storageKey="az400-testing"
  skills={[
    "Consigo configurar testes unitários, de integração e de carga em um pipeline",
    "Consigo implementar quality gates que bloqueiam deploys em caso de falha de teste",
    "Consigo configurar limites de cobertura de código e relatórios",
  ]}
/>

#### Fundamentos de pipeline

<SelfAssessment
  storageKey="az400-pipelines"
  skills={[
    "Consigo escrever um workflow multi-stage de GitHub Actions do zero",
    "Consigo escrever um arquivo YAML multi-stage de Azure Pipelines do zero",
    "Consigo configurar self-hosted runners/agents",
    "Consigo implementar triggers de pipeline (push, PR, schedule, manual)",
    "Consigo criar templates de workflow reutilizáveis e composite actions",
    "Consigo configurar environments com regras de proteção e aprovações",
  ]}
/>

#### Deploys

<SelfAssessment
  storageKey="az400-deployments"
  skills={[
    "Consigo implementar deploys blue-green com slot swaps",
    "Consigo configurar deploys progressivos canary e ring-based",
    "Consigo implementar feature flags usando Azure App Configuration",
    "Consigo fazer deploy de apps containerizados para ACR + ACA/AKS via pipeline",
    "Consigo automatizar migrações de schema de banco de dados em um pipeline de deploy",
  ]}
/>

#### Infraestrutura como Código

<SelfAssessment
  storageKey="az400-iac"
  skills={[
    "Consigo implementar IaC com Bicep ou Terraform em um pipeline CI/CD",
    "Consigo configurar Azure Machine Configuration para estado desejado",
    "Consigo configurar Azure Deployment Environments para self-service",
  ]}
/>

#### Operações de pipeline

<SelfAssessment
  storageKey="az400-operations"
  skills={[
    "Consigo monitorar a saúde do pipeline (taxa de falha, duração, testes instáveis)",
    "Consigo otimizar pipelines para custo e desempenho (cache, paralelismo)",
    "Consigo migrar Azure Pipelines do editor classic para YAML",
  ]}
/>

### Domínio 4: Segurança e conformidade (10-15%)

<SelfAssessment
  storageKey="az400-security"
  skills={[
    "Consigo escolher entre service principals, managed identities e workload identity federation",
    "Consigo configurar GitHub Apps e explicar quando usar GITHUB_TOKEN vs PAT",
    "Consigo configurar service connections do Azure DevOps com credenciais federadas",
    "Consigo integrar Azure Key Vault com pipelines para gerenciamento de secrets",
    "Consigo configurar autenticação sem secrets (OIDC/workload identity)",
    "Consigo habilitar e configurar GitHub Advanced Security (CodeQL, Dependabot, secret scanning)",
    "Consigo configurar Microsoft Defender for Cloud DevOps Security",
  ]}
/>

### Domínio 5: Instrumentação (5-10%)

<SelfAssessment
  storageKey="az400-instrumentation"
  skills={[
    "Consigo configurar Azure Monitor e Application Insights para uma app em produção",
    "Consigo configurar anotações de deploy no Application Insights",
    "Consigo escrever queries básicas de KQL para analisar logs",
    "Consigo configurar alertas e insights de workflows do GitHub Actions",
    "Consigo correlacionar eventos de deploy com métricas de desempenho",
  ]}
/>

## Guia de pontuação

| Seus resultados | Recomendação |
|--------------|---------------|
| Maioria ✅ | Pronto para agendar o exame |
| Mix de ✅ e ⚠️ | Revise as áreas fracas usando os desafios relevantes, depois agende |
| Vários ⚠️ e ❌ | Complete todos os desafios nos seus domínios fracos primeiro |
| Maioria ❌ | Comece com os caminhos de aprendizado do Microsoft Learn, depois volte |

:::tip Prontidão para o exame

Diferente do AZ-104/AZ-305, o exame AZ-400 testa intensamente **sintaxe YAML** e **configuração específica de plataforma**. Certifique-se de que consegue escrever YAML de pipeline de memória, não apenas reconhecê-lo.

:::
