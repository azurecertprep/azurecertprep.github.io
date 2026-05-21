---
sidebar_position: 5
title: "Desafio 05: PaaS — Platform as a Service"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 05: PaaS — Platform as a Service

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Conceitos de Nuvem (25-30%)
:::

## Habilidades do exame cobertas

- Descrever Platform as a Service (PaaS)
- Identificar casos de uso apropriados para PaaS
- Descrever o modelo de responsabilidade compartilhada em relação ao PaaS

## Visão Geral

Platform as a Service (PaaS) é um meio-termo entre IaaS e SaaS. O provedor de nuvem gerencia a infraestrutura E a plataforma (SO, runtime, middleware), enquanto você foca apenas na sua aplicação e dados.

Pense no PaaS como alugar um food truck: você recebe o caminhão totalmente equipado com cozinha (plataforma), e você só traz suas receitas e ingredientes (aplicação e dados). Você não se preocupa com o motor, pneus ou eletricidade.

PaaS é ideal para desenvolvedores que querem construir aplicações sem se preocupar em gerenciar servidores, aplicar patches em sistemas operacionais ou configurar infraestrutura.

## Explorar

### Tarefa 1: Entender as responsabilidades do PaaS

| Camada | Quem gerencia? |
|--------|----------------|
| Dados e acesso | **Você** |
| Aplicações | **Você** |
| Runtime | **Azure** |
| Sistema operacional | **Azure** |
| Máquina virtual | **Azure** |
| Controles de rede | **Compartilhado** |
| Infraestrutura física | **Azure** |

Compare isso com IaaS — observe quanto mais o Azure gerencia para você!

### Tarefa 2: Explorar serviços PaaS do Azure

1. No Portal Azure, clique em **Create a resource**
2. Pesquise por **App Service** (Web App) — o serviço PaaS principal
3. Explore o formulário de criação:
   - Observe que você escolhe um **runtime** (Node.js, Python, .NET, Java) — não um SO
   - Você não configura tamanho de VM — você escolhe um **plano** (tier de preço)
   - Sem gerenciamento de disco, sem patches de SO
4. Clique **Cancel** — não crie nada

### Tarefa 3: Comparar serviços PaaS populares

| Serviço PaaS Azure | O que faz | Você gerencia |
|--------------------|-----------|---------------|
| Azure App Service | Hospeda aplicações web e APIs | Seu código + configuração |
| Azure SQL Database | Banco de dados relacional gerenciado | Consultas + dados |
| Azure Cosmos DB | Banco de dados NoSQL gerenciado | Dados + políticas de acesso |
| Azure Functions | Executa código sem servidores | Apenas o código da função |
| Azure Kubernetes Service | Orquestração de containers gerenciada | Imagens de container + config |

### Tarefa 4: Comparação PaaS vs IaaS

| Aspecto | IaaS (VM) | PaaS (App Service) |
|---------|-----------|-------------------|
| Patches de SO | Você aplica | Azure cuida |
| Escala | Você configura scale sets | Auto-scale integrado |
| Deploy | Instalar software na VM | Deploy do seu código/container |
| Modelo de custo | Paga pelo uptime da VM | Paga pelo plano + consumo |
| Tempo de deploy | Horas (configurar SO, instalar runtime) | Minutos (enviar código) |
| Controle | Acesso total ao SO | Apenas nível de aplicação |

### Tarefa 5: Quando usar PaaS

PaaS é ideal quando:
- Está construindo **novas aplicações web ou APIs**
- Você quer **focar no código**, não na infraestrutura
- Você precisa de **bancos de dados gerenciados** sem overhead de DBA
- Você quer **escala automática e alta disponibilidade**
- Desenvolvimento e deploy rápidos são críticos

PaaS NÃO é ideal quando:
- Você precisa de controle total no nível do SO
- Você tem aplicações legadas que requerem configurações específicas de SO
- Você precisa instalar drivers customizados ou módulos de kernel

:::tip Alternativa Azure CLI
```bash
# List available App Service plans (does not create anything)
az appservice list-locations --sku F1 --output table

# List available runtimes for App Service
az webapp list-runtimes --output table
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **PaaS** | A nuvem gerencia infraestrutura + plataforma; você implanta aplicações |
| **Azure App Service** | PaaS para hospedar aplicações web, APIs e backends mobile |
| **Banco de dados gerenciado** | Serviço de banco de dados onde o Azure cuida de backups, patches e HA |
| **Foco no código** | PaaS permite que desenvolvedores se concentrem na lógica de negócios |
| **Menos controle, menos responsabilidade** | Trade-off: gerenciamento mais simples mas menos acesso ao nível do SO |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-05-q1',
      question: 'No modelo PaaS, quem é responsável por gerenciar o sistema operacional?',
      options: ['O cliente', 'O provedor de nuvem', 'Um fornecedor terceirizado', 'Ninguém — não há SO'],
      correctAnswer: 1,
      explanation: 'No PaaS, o provedor de nuvem gerencia o sistema operacional, incluindo patches e atualizações. O cliente apenas gerencia suas aplicações e dados.'
    },
    {
      id: 'az900-05-q2',
      question: 'Um desenvolvedor quer implantar uma aplicação web Python sem gerenciar servidores ou patches de SO. Qual modelo de serviço é mais apropriado?',
      options: ['IaaS', 'PaaS', 'SaaS', 'On-premises'],
      correctAnswer: 1,
      explanation: 'PaaS (como Azure App Service) permite que desenvolvedores implantem aplicações sem gerenciar a infraestrutura subjacente ou o SO. Eles simplesmente fazem deploy do código.'
    },
    {
      id: 'az900-05-q3',
      question: 'Qual dos seguintes é um exemplo de PaaS no Azure?',
      options: ['Azure Virtual Machines', 'Azure App Service', 'Microsoft 365', 'Azure Virtual Desktop'],
      correctAnswer: 1,
      explanation: 'Azure App Service é PaaS — fornece uma plataforma para hospedar aplicações web sem gerenciar a infraestrutura subjacente. VMs são IaaS, M365 é SaaS.'
    },
    {
      id: 'az900-05-q4',
      question: 'Qual é uma desvantagem do PaaS em comparação com IaaS?',
      options: ['Custo mais alto', 'Menos controle sobre o sistema operacional', 'Deploy mais lento', 'Sem auto-scaling'],
      correctAnswer: 1,
      explanation: 'O principal trade-off do PaaS é controle reduzido. Você não pode acessar ou configurar o SO subjacente, instalar drivers customizados ou fazer alterações no nível do SO. Em troca, você obtém gerenciamento mais simples.'
    },
    {
      id: 'az900-05-q5',
      question: 'Azure SQL Database é um exemplo de qual modelo de serviço em nuvem?',
      options: ['IaaS', 'PaaS', 'SaaS', 'Apenas serverless'],
      correctAnswer: 1,
      explanation: 'Azure SQL Database é PaaS — a Microsoft gerencia a infraestrutura do SQL Server, patches, backups e alta disponibilidade. Você gerencia o esquema do banco de dados e os dados.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Guia de Estudos AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo curados
- [Microsoft Learn: Descrever tipos de serviço em nuvem](https://learn.microsoft.com/en-us/training/modules/describe-cloud-service-types/)
- [O que é PaaS?](https://azure.microsoft.com/resources/cloud-computing-dictionary/what-is-paas/)
