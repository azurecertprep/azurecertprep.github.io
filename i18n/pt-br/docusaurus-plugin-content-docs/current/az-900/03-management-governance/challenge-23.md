---
sidebar_position: 5
title: "Desafio 23: Azure Advisor e Service Health"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 23: Azure Advisor e Service Health

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Management & Governance (30-35%)
:::

## Habilidades do exame cobertas

- Descrever o propósito do Azure Advisor
- Descrever o Azure Service Health

## Visão Geral

O Azure fornece ferramentas para ajudar você a otimizar seu ambiente e se manter informado sobre o status da plataforma Azure. **Azure Advisor** oferece recomendações personalizadas de melhores práticas. **Azure Service Health** mantém você informado sobre problemas na plataforma Azure, manutenções planejadas e avisos de saúde que podem afetar seus recursos.

## Explorar

### Tarefa 1: Explorar o Azure Advisor

1. No Azure Portal, pesquise por **Advisor**
2. Clique em **Azure Advisor**
3. Explore as categorias de recomendação:

| Categoria | O que recomenda |
|-----------|----------------|
| **Reliability** | Melhorar a disponibilidade das suas aplicações |
| **Security** | Detectar ameaças e vulnerabilidades |
| **Performance** | Melhorar a velocidade das suas aplicações |
| **Cost** | Reduzir gastos e otimizar recursos |
| **Operational Excellence** | Eficiência de processos e melhores práticas |

4. Clique em cada categoria para ver recomendações específicas
5. Nota: Com uma conta nova/vazia, você pode ver poucas recomendações — isso é normal!

### Tarefa 2: Entender recomendações do Advisor

O Advisor analisa a configuração e uso dos seus recursos e então fornece:
- **Recomendações acionáveis** com passos específicos
- **Nível de impacto**: High, Medium, Low
- **Links diretos** para corrigir o problema
- **Economia estimada** para recomendações de custo

**Exemplos de recomendações:**
| Categoria | Exemplo de recomendação |
|-----------|------------------------|
| Cost | "Redimensione VMs subutilizadas — economize $50/mês" |
| Reliability | "Habilite availability zones para seu banco de dados SQL" |
| Security | "Habilite MFA para todas as contas de administrador" |
| Performance | "Atualize para Premium SSD para melhor IOPS" |

### Tarefa 3: Explorar o Azure Service Health

1. No Azure Portal, pesquise por **Service Health**
2. Explore os três componentes:

| Componente | O que mostra |
|-----------|-------------|
| **Azure Status** | Status global dos serviços Azure (todas as regiões, todos os serviços) |
| **Service Health** | Problemas que afetam SEUS serviços e regiões específicos |
| **Resource Health** | Saúde dos SEUS recursos individuais |

3. Clique em **Service issues** — veja problemas atuais (se houver)
4. Clique em **Planned maintenance** — janelas de manutenção programada
5. Clique em **Health advisories** — mudanças de recursos ou descontinuações
6. Clique em **Health history** — problemas passados e RCAs (Root Cause Analysis)

### Tarefa 4: Configurar alertas do Service Health

1. No Service Health, clique em **Health alerts**
2. Clique em **+ Create service health alert**
3. Explore o que você pode configurar:
   - Serviços para monitorar
   - Regiões para observar
   - Tipos de evento (Service issue, Planned maintenance, Health advisory)
   - Método de notificação (email, SMS, webhook)
4. Clique em **Cancel** (a menos que queira criar um alerta real)

### Tarefa 5: Página Azure Status

1. Visite [status.azure.com](https://status.azure.com)
2. Esta página pública mostra:
   - Status global de todos os serviços Azure
   - Status por região
   - Incidentes atuais (se houver)
   - Dados históricos de disponibilidade
3. Compare isso com o Service Health no portal:
   - status.azure.com = visão ampla, pública
   - Service Health = personalizado para SEUS recursos

:::tip Alternativa Azure CLI
```bash
# View Advisor recommendations
az advisor recommendation list --query "[0:5].{Category:category, Impact:impact, Problem:shortDescription.problem}" --output table 2>/dev/null || echo "Explore Advisor in the portal"

# No CLI for Service Health — use the portal for the best experience
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **Azure Advisor** | Consultor de nuvem personalizado recomendando melhores práticas |
| **Service Health** | Visão personalizada de problemas de serviço Azure que afetam você |
| **Resource Health** | Status de saúde dos seus recursos Azure específicos |
| **Azure Status** | Página pública mostrando saúde global dos serviços Azure |
| **Health alerts** | Notificações quando problemas Azure afetam seus recursos |
| **Planned maintenance** | Aviso prévio de manutenção programada do Azure |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-23-q1',
      question: 'Qual serviço Azure fornece recomendações personalizadas para melhorar custo, segurança, confiabilidade e desempenho?',
      options: ['Azure Monitor', 'Azure Advisor', 'Azure Service Health', 'Azure Policy'],
      correctAnswer: 1,
      explanation: 'Azure Advisor analisa sua configuração Azure e telemetria de uso, depois fornece recomendações personalizadas em cinco categorias: reliability, security, performance, cost e operational excellence.'
    },
    {
      id: 'az900-23-q2',
      question: 'Qual é a diferença entre Azure Service Health e a página pública Azure Status (status.azure.com)?',
      options: ['Mostram a mesma informação', 'Service Health é personalizado para seus recursos; Azure Status mostra status global', 'Azure Status é mais detalhado', 'Service Health é apenas para clientes enterprise'],
      correctAnswer: 1,
      explanation: 'Azure Service Health é personalizado — mostra apenas problemas que afetam SEUS serviços e regiões específicos. A página Azure Status (status.azure.com) mostra uma visão ampla e global de todos os serviços Azure.'
    },
    {
      id: 'az900-23-q3',
      question: 'O Azure Advisor identifica que várias das suas VMs estão subutilizadas. Em qual categoria de recomendação isso se enquadra?',
      options: ['Reliability', 'Security', 'Cost', 'Performance'],
      correctAnswer: 2,
      explanation: 'VMs subutilizadas são uma questão de otimização de custos. O Advisor recomendaria right-sizing (mover para um tamanho de VM menor) para reduzir gastos desnecessários.'
    },
    {
      id: 'az900-23-q4',
      question: 'Qual componente do Service Health mostra a saúde de um recurso Azure específico que você possui?',
      options: ['Azure Status', 'Service Health', 'Resource Health', 'Azure Advisor'],
      correctAnswer: 2,
      explanation: 'Resource Health fornece informações sobre a saúde dos seus recursos Azure individuais (como uma VM ou banco de dados específico). Service Health mostra problemas mais amplos a nível de serviço.'
    },
    {
      id: 'az900-23-q5',
      question: 'Como você pode ser notificado quando um evento de manutenção planejada do Azure afetará seus recursos?',
      options: ['Azure envia email automaticamente para todos os usuários', 'Criar um alerta de Service Health', 'Verificar o Azure Portal diariamente', 'Assinar o blog do Azure'],
      correctAnswer: 1,
      explanation: 'Alertas de Service Health podem ser configurados para notificar você (via email, SMS ou webhook) sobre problemas de serviço, manutenção planejada e avisos de saúde que afetam seus recursos e regiões específicas.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe monitoring tools in Azure](https://learn.microsoft.com/en-us/training/modules/describe-monitoring-tools-azure/)
- [Azure Advisor documentation](https://learn.microsoft.com/en-us/azure/advisor/)
- [Azure Service Health documentation](https://learn.microsoft.com/en-us/azure/service-health/)
