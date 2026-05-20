---
sidebar_position: 1
title: "AZ-400: DevOps Engineer Expert"
---

# AZ-400: projetando e implementando soluções Microsoft DevOps

:::info Detalhes do exame

**Versão do exame**: Habilidades medidas a partir de 24 de abril de 2026 | **Pontuação para aprovação**: 700/1000 | **Duração**: ~120 minutos

:::

## Para quem é este exame?

Como engenheiro DevOps, você é um desenvolvedor ou administrador de infraestrutura que também possui experiência em trabalhar com pessoas, processos e produtos para permitir a entrega contínua de valor nas organizações.

Suas responsabilidades incluem entregar soluções Microsoft DevOps que forneçam segurança contínua, integração, testes, entrega, deploy, monitoramento e feedback. Você projeta e implementa fluxo de trabalho, colaboração, comunicação, controle de código-fonte e automação.

Como engenheiro DevOps, você trabalha em equipes multifuncionais que incluem:

- Desenvolvedores
- Engenheiros de confiabilidade de sites (SRE)
- Administradores Azure
- Engenheiros de segurança

Você deve ter experiência tanto em administração quanto em desenvolvimento no Azure, com habilidades sólidas em pelo menos uma dessas áreas. Você também deve ter experiência implementando soluções tanto em **GitHub** quanto em **Azure DevOps**.

**Certificações pré-requisito**: [AZ-104: Azure Administrator Associate](https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/) ou [AZ-204: Azure Developer Associate](https://learn.microsoft.com/en-us/credentials/certifications/azure-developer/) (recomendado)

## Habilidades em resumo

| Domínio | Peso | Desafios |
|--------|--------|------------|
| Projetar e implementar processos e comunicações | 10-15% | 01-06 |
| Projetar e implementar uma estratégia de controle de código-fonte | 10-15% | 07-12 |
| Projetar e implementar pipelines de build e release | 50-55% | 13-38 |
| Desenvolver um plano de segurança e conformidade | 10-15% | 39-45 |
| Implementar uma estratégia de instrumentação | 5-10% | 46-50 |
| Capstone entre domínios | Todos | 51 |

:::tip Estrutura dos desafios

O Domínio 3 (Pipelines de build e release) é subdividido em 6 seções devido ao seu peso de 50-55%:
- **3a** Gerenciamento de pacotes | **3b** Testes | **3c** Fundamentos de pipeline | **3d** Estratégias de deploy | **3e** Infraestrutura como Código | **3f** Operações de pipeline

:::

## Como este exame difere do AZ-104 e AZ-305

| Aspecto | AZ-104 (Administrador) | AZ-305 (Arquiteto) | AZ-400 (DevOps) |
|--------|------------------------|---------------------|------------------|
| Foco | Gerenciamento de recursos | Design de soluções | Automação e entrega |
| Plataformas | Azure Portal + CLI | Serviços Azure | GitHub + Azure DevOps + Azure |
| Estilo de questão | "Como você configura X?" | "Qual solução melhor atende aos requisitos?" | "Como você automatiza/protege este pipeline?" |
| Habilidades testadas | Comandos CLI, passos no portal | Seleção de serviços, trade-offs | Pipelines YAML, workflows, varredura de segurança |
| Abordagem de laboratório | Criar recursos Azure | Projetar arquiteturas | Construir pipelines CI/CD |

## O que torna esta certificação única

O AZ-400 é o único exame Azure que testa **duas plataformas igualmente**:

- **GitHub** — Actions, Packages, Advanced Security, Copilot, Projects
- **Azure DevOps** — Pipelines, Repos, Artifacts, Boards, Test Plans

O exame espera que você saiba quando usar cada plataforma e como integrá-las.

## Como este site funciona

Cada desafio segue um formato focado em DevOps:

| Seção | Propósito |
|---------|---------|
| Habilidades do exame mapeadas | Habilidades oficiais que este desafio cobre |
| Cenário | Situação real de DevOps que requer ação |
| Plataforma | Marcado como [GitHub-first], [ADO-first] ou [comparison] |
| Tarefas | Passo a passo com exemplos funcionais de YAML/workflow |
| Break & Fix | Solucionar problemas em um pipeline/configuração deliberadamente quebrado |
| Verificação de conhecimento | Questões no estilo do exame |
| Limpeza | Remover recursos, resetar configurações |

## Caminhos de aprendizado

| Caminho | Link |
|------|------|
| AZ-400 no Microsoft Learn | [Módulos autoguiados](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-400#two-ways-to-prepare) |
| Documentação do Azure DevOps | [docs.microsoft.com/azure/devops](https://learn.microsoft.com/en-us/azure/devops/) |
| Documentação do GitHub | [docs.github.com](https://docs.github.com) |
| Centro de Recursos DevOps | [learn.microsoft.com/devops](https://learn.microsoft.com/en-us/devops/) |
| Avaliação prática gratuita | [Questões práticas](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-400/practice/assessment?assessment-type=practice&assessmentId=56) |
| Sandbox do exame | [Experimente a interface do exame](https://aka.ms/examdemo) |

## Custo estimado

| Domínio | Custo Azure | Notas |
|--------|-----------|-------|
| 1. Processos e comunicações | $0 | GitHub Projects e Azure Boards são gratuitos |
| 2. Controle de código-fonte | $0 | Repositórios Git são gratuitos |
| 3. Pipelines de build e release | $0-10 | GitHub Actions (2000 min/mês grátis), App Service tier F1 |
| 4. Segurança e conformidade | $0 | GHAS é gratuito em repositórios públicos |
| 5. Instrumentação | $0-5 | Application Insights (5 GB/mês grátis) |

**Total estimado: $0-15** (a maioria dos laboratórios roda inteiramente em tiers gratuitos)
