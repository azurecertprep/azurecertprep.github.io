---
sidebar_position: 6
title: "Desafio 06: SaaS — Software as a Service"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 06: SaaS — Software as a Service

:::info Tempo Estimado
**15-25 min** | **Custo**: Gratuito | **Domínio**: Conceitos de Nuvem (25-30%)
:::

## Habilidades do exame cobertas

- Descrever Software as a Service (SaaS)
- Identificar casos de uso apropriados para SaaS
- Descrever o modelo de responsabilidade compartilhada em relação ao SaaS

## Visão Geral

Software as a Service (SaaS) é o modelo de serviço em nuvem mais completo. O provedor gerencia tudo — infraestrutura, plataforma e a própria aplicação. Você simplesmente usa o software por meio de um navegador web ou app.

Pense no SaaS como assinar a Netflix: você não gerencia servidores, não instala software, não se preocupa com atualizações. Você apenas faz login e usa. O provedor cuida de tudo nos bastidores.

Você provavelmente usou SaaS hoje sem perceber: Gmail, Microsoft 365, Salesforce, Zoom — todos são SaaS.

## Explorar

### Tarefa 1: Entender as responsabilidades do SaaS

| Camada | Quem gerencia? |
|--------|----------------|
| Dados e acesso | **Você** (seu conteúdo e quem pode vê-lo) |
| Identidade e acesso | **Compartilhado** (você gerencia usuários; provedor gerencia o sistema de auth) |
| Aplicações | **Provedor** |
| Runtime | **Provedor** |
| Sistema operacional | **Provedor** |
| Máquina virtual | **Provedor** |
| Infraestrutura física | **Provedor** |

**Insight principal**: Com SaaS, sua única responsabilidade são seus dados e controlar o acesso a eles.

### Tarefa 2: Identificar exemplos de SaaS

| Produto SaaS | Categoria | O que você gerencia |
|--------------|-----------|---------------------|
| Microsoft 365 (Outlook, Teams, Word) | Produtividade | Seus documentos, e-mail, usuários |
| Microsoft Dynamics 365 | CRM/ERP | Seus dados de negócio |
| Power BI | Analytics | Seus relatórios e dashboards |
| GitHub | DevOps | Seus repositórios de código |
| Azure DevOps | DevOps | Seus projetos e pipelines |

### Tarefa 3: Comparar os três modelos

| Aspecto | IaaS | PaaS | SaaS |
|---------|------|------|------|
| Você gerencia | SO + Apps + Dados | Apps + Dados | Apenas dados |
| Provedor gerencia | Hardware | Hardware + SO + Runtime | Tudo |
| Flexibilidade | Máxima | Moderada | Mínima |
| Esforço de gerenciamento | Alto | Médio | Baixo |
| Exemplo | Azure VMs | Azure App Service | Microsoft 365 |
| Melhor para | Profissionais de TI | Desenvolvedores | Usuários finais |

### Tarefa 4: Explorar um portal SaaS

1. Abra [portal.office.com](https://portal.office.com) (se você tem uma conta Microsoft)
2. Ou visite [admin.microsoft.com](https://admin.microsoft.com) (se você tem acesso de admin)
3. Observe: você gerencia **usuários e dados**, não infraestrutura
4. Não há VMs para aplicar patches, não há servidores para gerenciar
5. Isso é SaaS puro — o software é totalmente gerenciado para você

### Tarefa 5: Quando usar cada modelo — exercício resumo

Associe cada cenário ao melhor modelo de serviço:

| Cenário | Melhor modelo | Por quê |
|---------|---------------|---------|
| Hospedar uma aplicação Windows Server legada | IaaS | Precisa de controle no nível do SO |
| Construir uma nova API web em Python | PaaS | Foco no código, não em servidores |
| Fornecer e-mail para 500 funcionários | SaaS | Usar Microsoft 365 |
| Rodar um modelo customizado de machine learning | IaaS/PaaS | Depende da customização necessária |
| Dar à equipe de vendas um sistema CRM | SaaS | Usar Dynamics 365 |

:::tip Alternativa Azure CLI
```bash
# SaaS is managed entirely by the provider, so there's no CLI to "manage" it
# However, you can check your Microsoft 365 licenses via:
az ad user list --query "[0:5].{Name:displayName, Mail:mail}" --output table
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **SaaS** | Aplicação completa gerenciada pelo provedor; você usa via navegador/app |
| **Menor responsabilidade** | Você só gerencia dados e acesso — provedor cuida de todo o resto |
| **Modelo de assinatura** | Normalmente paga por usuário por mês |
| **Atualizações automáticas** | Provedor envia atualizações — nenhuma ação necessária |
| **Multi-tenant** | Muitos clientes compartilham a mesma infraestrutura de aplicação |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-06-q1',
      question: 'Qual modelo de serviço em nuvem requer o MENOR esforço de gerenciamento do cliente?',
      options: ['IaaS', 'PaaS', 'SaaS', 'Híbrido'],
      correctAnswer: 2,
      explanation: 'SaaS requer o menor gerenciamento do cliente. O provedor gerencia tudo — infraestrutura, plataforma e aplicação. O cliente apenas gerencia dados e acesso.'
    },
    {
      id: 'az900-06-q2',
      question: 'Microsoft 365 (Outlook, Teams, Word Online) é um exemplo de qual modelo de serviço em nuvem?',
      options: ['IaaS', 'PaaS', 'SaaS', 'On-premises'],
      correctAnswer: 2,
      explanation: 'Microsoft 365 é SaaS — a Microsoft gerencia toda a pilha da aplicação. Os usuários simplesmente acessam o software por meio de um navegador ou app e gerenciam seus próprios dados.'
    },
    {
      id: 'az900-06-q3',
      question: 'No modelo SaaS, quem é responsável por atualizações e patches da aplicação?',
      options: ['O cliente', 'O provedor de nuvem', 'Um fornecedor terceirizado', 'A equipe de TI do cliente'],
      correctAnswer: 1,
      explanation: 'No SaaS, o provedor de nuvem gerencia tudo, incluindo atualizações da aplicação. O cliente não precisa instalar patches ou atualizar o software — isso acontece automaticamente.'
    },
    {
      id: 'az900-06-q4',
      question: 'Uma empresa precisa de e-mail, calendário e colaboração em documentos para 200 funcionários com gerenciamento mínimo de TI. Qual abordagem é melhor?',
      options: ['Implantar Exchange Server em VMs Azure (IaaS)', 'Construir um app customizado no App Service (PaaS)', 'Assinar Microsoft 365 (SaaS)', 'Instalar Office em cada desktop (on-premises)'],
      correctAnswer: 2,
      explanation: 'Microsoft 365 (SaaS) fornece e-mail, calendário e colaboração prontos para uso com zero gerenciamento de infraestrutura. É a escolha certa quando você precisa de ferramentas de produtividade padrão sem customização.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Guia de Estudos AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo curados
- [Microsoft Learn: Descrever tipos de serviço em nuvem](https://learn.microsoft.com/en-us/training/modules/describe-cloud-service-types/)
- [O que é SaaS?](https://azure.microsoft.com/resources/cloud-computing-dictionary/what-is-saas/)
