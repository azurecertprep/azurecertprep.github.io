---
sidebar_position: 1
title: "SC-500: Engenheiro de Seguranca em Nuvem e IA"
---

# SC-500: Engenheiro de Seguranca em Nuvem e IA

:::info Detalhes do exame

**Versao do exame**: Habilidades medidas a partir de julho de 2025 | **Nota de aprovacao**: 700/1000 | **Duracao**: ~120 minutos

:::

## Para quem e este exame?

Como engenheiro de seguranca em nuvem e IA, voce e responsavel por proteger sistemas em nuvem, hibridos e de IA ao longo de todo o ciclo de vida. Voce implementa e gerencia controles de seguranca, protecao contra ameacas e gerenciamento de postura de seguranca no Azure, Microsoft 365 e ambientes hibridos.

Suas responsabilidades incluem:

- Proteger identidade e acesso para workloads em nuvem
- Proteger armazenamento, bancos de dados e infraestrutura de rede
- Fortalecer recursos de computacao incluindo VMs, containers e workloads de IA
- Monitorar postura de seguranca e responder a ameacas usando Microsoft Defender e Sentinel
- Proteger workloads de IA, incluindo remediacao de exposicao de dados e protecao de modelos de IA

Voce trabalha em equipes multifuncionais que incluem:

- Administradores de nuvem
- Engenheiros de rede
- Engenheiros de identidade
- Engenheiros de dados
- Engenheiros de IA/ML
- Oficiais de conformidade

**Certificacoes pre-requisito**: [AZ-104: Azure Administrator Associate](https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/) (recomendado). Experiencia pratica com administracao Azure e assumida.

:::warning Substituindo o AZ-500

O SC-500 substitui o exame AZ-500 (Azure Security Engineer), que sera aposentado em **31 de agosto de 2026**. O SC-500 expande a cobertura para incluir **seguranca de IA, gerenciamento de postura de seguranca de dados do Purview e preparacao para Microsoft 365 Copilot** — topicos nao cobertos pelo AZ-500.

:::

## Habilidades em resumo

| Dominio | Peso | Desafios |
|---------|------|----------|
| Gerenciar identidade, acesso e governanca | 20–25% | 01–12 |
| Proteger armazenamento, bancos de dados e rede | 25–30% | 13–25 |
| Proteger computacao | 20–25% | 26–38 |
| Gerenciar e monitorar postura de seguranca | 20–25% | 39–51 |
| Capstone cross-domain | Todos | 52 |

:::tip Estrutura dos desafios

O Dominio 2 (Armazenamento, bancos de dados e rede) tem o maior peso com 25-30%. O Dominio 3 (Proteger computacao) inclui desafios de **seguranca de IA** (26-30) cobrindo Purview DSPM, hardening de workloads de IA e seguranca do Copilot — esses sao topicos totalmente novos que nao eram testados no AZ-500.

:::

## Como este exame difere do AZ-500 e SC-100

| Aspecto | AZ-500 (aposentando) | SC-100 (Arquiteto) | SC-500 (este exame) |
|---------|----------------------|--------------------|---------------------|
| Foco | Controles de seguranca Azure | Design de arquitetura de seguranca | Implementacao pratica de seguranca |
| Escopo | Somente Azure | Estrategia multi-cloud | Azure + M365 + IA |
| Estilo de questao | "Como voce configura X?" | "Qual design de solucao atende os requisitos?" | "Implemente e proteja este workload" |
| Cobertura de IA | Nenhuma | Governanca conceitual de IA | Seguranca de IA pratica (Purview DSPM, Copilot) |
| Nivel | Associate | Expert | Associate |

## O que torna esta certificacao unica

O SC-500 e a primeira certificacao de seguranca Azure que testa **seguranca de IA** junto com seguranca tradicional em nuvem:

- **Purview DSPM para IA** — Avaliar exposicao de dados antes de implantar o Copilot
- **Hardening de workloads de IA** — Proteger Azure OpenAI, defesa contra prompt injection
- **Defender for Cloud AI** — Monitorar e proteger implantacoes de modelos de IA
- **Sensitivity labels** — Impedir que a IA exponha conteudo restrito

## Como este site funciona

Cada desafio segue um formato focado em seguranca:

| Secao | Proposito |
|-------|-----------|
| Exam skills mapped | Habilidades oficiais que este desafio cobre |
| Scenario | Situacao real de seguranca que requer acao |
| Prerequisites | Licencas, funcoes e ferramentas necessarias |
| Tasks | Passo a passo com exemplos funcionais de CLI/portal |
| Break & Fix | Solucionar problemas em um controle de seguranca deliberadamente mal configurado |
| Knowledge check | Questoes no estilo do exame |
| Cleanup | Remover recursos, resetar configuracoes |

## Trilhas de aprendizado

| Trilha | Link |
|--------|------|
| Guia de estudo SC-500 | [Microsoft Learn study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/sc-500) |
| SC-500 no Microsoft Learn | [Modulos individuais](https://learn.microsoft.com/en-us/credentials/certifications/cloud-ai-security-engineer/) |
| Docs Microsoft Defender for Cloud | [learn.microsoft.com/defender-for-cloud](https://learn.microsoft.com/en-us/azure/defender-for-cloud/) |
| Docs Microsoft Sentinel | [learn.microsoft.com/sentinel](https://learn.microsoft.com/en-us/azure/sentinel/) |
| Docs Microsoft Purview | [learn.microsoft.com/purview](https://learn.microsoft.com/en-us/purview/) |
| Sandbox do exame | [Experimentar a interface do exame](https://aka.ms/examdemo) |

## Custo estimado

| Dominio | Custo Azure | Observacoes |
|---------|-------------|-------------|
| 1. Identidade e governanca | $0–5 | Trial gratuito do Entra ID P2 por 30 dias |
| 2. Armazenamento, bancos de dados e rede | $5–10 | Storage accounts, Key Vault, VNets |
| 3. Proteger computacao | $0–5 | VMs (B1s), containers, planos Defender |
| 4. Postura de seguranca e monitoramento | $0–5 | Sentinel tier gratuito (10 GB/dia nos primeiros 31 dias) |

**Total estimado: $10–15** (com limpeza agressiva apos cada desafio)
