---
sidebar_position: 1
title: "Planejar e Gerenciar Soluções de IA - Introdução"
---

# Planejar e Gerenciar Soluções de IA

Este domínio cobre as habilidades fundamentais que todo engenheiro de IA no Azure precisa: selecionar os serviços adequados, provisionar recursos de forma segura, monitorar a saúde dos serviços, gerenciar custos e implementar práticas de IA responsável. Ele representa **20–25%** do exame AI-102.

Antes de escrever uma única linha de código de IA, você precisa entender o ecossistema de serviços de IA do Azure, saber como proteger endpoints com chaves e identidade gerenciada, implantar serviços em contêineres para cenários de borda, e configurar logs de diagnóstico que possibilitem a solução de problemas em produção.

Estes desafios estabelecem padrões que você reutilizará em todos os domínios subsequentes. Domine autenticação, provisionamento de recursos e monitoramento aqui — eles aparecem em todas as outras seções do exame.

## O Que Você Vai Aprender

- Como selecionar o serviço Azure AI apropriado para um determinado requisito
- Criar e gerenciar recursos Azure AI Services (Portal, CLI, Bicep)
- Configurar segurança de rede (private endpoints, VNets, firewalls)
- Implementar autenticação baseada em chaves e em identidade
- Implantar serviços de IA em contêineres Docker
- Configurar logs de diagnóstico e monitoramento com Azure Monitor
- Gerenciar custos com camadas de preço e alertas de orçamento
- Aplicar princípios de IA responsável e filtragem de conteúdo

## Habilidades Avaliadas

- Selecionar o serviço Azure AI apropriado para um requisito
- Planejar e configurar segurança para Azure AI Services
- Criar e gerenciar recursos Azure AI
- Configurar logs de diagnóstico e monitoramento
- Gerenciar custos para Azure AI Services
- Implementar práticas de IA responsável
- Implantar serviços de IA em contêineres

## Desafios

| # | Título | Tópicos Principais |
|---|--------|--------------------|
| 01 | Select and Provision Azure AI Services | Recurso multi-serviço, serviço único, seleção de SKU |
| 02 | AI Services Resource Management | Provisionamento via CLI/Bicep, tags, organização de recursos |
| 03 | Secure AI Endpoints with Keys & Identity | AzureKeyCredential, DefaultAzureCredential, Key Vault |
| 04 | Network Security for AI Services | Private endpoints, integração com VNet, firewalls de IP |
| 05 | Deploy AI in Containers | Contêineres Docker, modo conectado/desconectado, cobrança |
| 06 | Diagnostic Logging & Monitoring | Azure Monitor, Log Analytics, configurações de diagnóstico |
| 07 | Cost Management & Optimization | Camadas de preço, orçamentos, descontos de compromisso |
| 08 | Health Checks & Alerting | Métricas de disponibilidade, regras de alerta, grupos de ação |
| 09 | Responsible AI Governance | Notas de transparência, avaliações de impacto, painel de RAI |
| 10 | Content Safety & Filtering | Azure AI Content Safety, limites de severidade, blocklists |

## Pré-requisitos

- Assinatura Azure com acesso de Contributor
- Azure CLI instalado e autenticado
- Habilidades básicas de programação em Python ou C#
- Familiaridade com a navegação no Portal do Azure
