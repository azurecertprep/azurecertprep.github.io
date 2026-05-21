---
sidebar_position: 4
title: "Desafio 10: Containers e Hospedagem de Aplicações"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 10: Containers e Hospedagem de Aplicações

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Arquitetura e Serviços Azure (35-40%)
:::

## Habilidades do exame cobertas

- Comparar tipos de computação (containers, VMs, functions)
- Descrever opções de hospedagem de aplicações (web apps, containers, VMs)
- Descrever Azure Functions

## Visão Geral

Além de VMs, o Azure oferece opções de computação mais leves. **Containers** empacotam sua aplicação com suas dependências em uma unidade portátil. **Azure App Service** hospeda web apps sem gerenciar VMs. **Azure Functions** executam trechos individuais de código sob demanda (serverless).

Cada opção troca controle por simplicidade: VMs dão máximo controle, containers fornecem portabilidade, App Service simplifica hospedagem web, e Functions são os mais simples — apenas escreva código.

## Explorar

### Tarefa 1: Comparar opções de computação

| Serviço | O que você gerencia | Unidade de escala | Tempo de inicialização | Ideal para |
|---------|--------------------|--------------------|----------------------|-----------|
| Azure VMs | SO + Apps | VM completa | Minutos | Apps legados, controle total |
| Azure Container Instances | Imagem de container | Container | Segundos | Tarefas simples de container |
| Azure Container Apps | Imagem de container + regras de escala | Container | Segundos | Microsserviços |
| Azure App Service | Código da aplicação | Instância do app | Segundos | Web apps e APIs |
| Azure Functions | Código da função | Função individual | Milissegundos | Tarefas orientadas a eventos |

### Tarefa 2: Explorar Azure App Service

1. No Portal Azure, pesquise por **App Services**
2. Clique em **+ Create** → **Web App**
3. Explore o formulário de criação:
   - **Runtime stack**: .NET, Java, Node.js, Python, PHP, Ruby
   - **Operating System**: Linux ou Windows
   - **App Service Plan**: Tier de preço (Free F1 disponível!)
4. Observe: sem tamanho de VM, sem patches de SO, sem configuração de rede
5. Clique em **Cancel**

**Tier gratuito (F1):**
- 60 minutos de CPU/dia
- 1 GB RAM
- Sem domínio personalizado (usa azurewebsites.net)
- Perfeito para aprendizado!

### Tarefa 3: Explorar Azure Functions

1. No Portal Azure, pesquise por **Function App**
2. Clique em **+ Create**
3. Explore:
   - **Runtime**: .NET, Java, Node.js, Python, PowerShell
   - **Hosting plan**: Consumption (pague por execução), Premium ou Dedicated
4. Plano Consumption = serverless verdadeiro:
   - Primeiro **1 milhão de execuções/mês = GRÁTIS**
   - Auto-escala de 0 a milhares de instâncias
5. Clique em **Cancel**

**Triggers de função** (o que faz o código executar):
| Trigger | Exemplo |
|---------|---------|
| HTTP | Endpoint de REST API |
| Timer | Executar a cada 5 minutos |
| Blob Storage | Arquivo carregado |
| Queue | Mensagem recebida |
| Event Grid | Evento ocorreu |

### Tarefa 4: Entender containers

Containers são pacotes leves e portáteis que incluem:
- Código da sua aplicação
- Runtime e bibliotecas
- Arquivos de configuração
- Tudo necessário para executar — independente do host

| Conceito | VM | Container |
|----------|------|-----------|
| Inclui | SO completo + Apps | App + dependências apenas |
| Tamanho | Gigabytes | Megabytes |
| Tempo de inicialização | Minutos | Segundos |
| Isolamento | Nível de hardware | Nível de processo |
| Densidade | Poucos por host | Centenas por host |

**Serviços de container do Azure:**
- **Azure Container Instances (ACI)**: Execute um container sem gerenciar VMs
- **Azure Container Apps**: Plataforma gerenciada para microsserviços
- **Azure Kubernetes Service (AKS)**: Orquestração completa de containers

### Tarefa 5: Quando usar o quê

| Cenário | Melhor escolha | Por quê |
|---------|---------------|---------|
| Hospedar um blog WordPress | App Service | Hospedagem web PaaS, configuração fácil |
| Processar imagens quando carregadas | Azure Functions | Orientado a eventos, pague por execução |
| Executar um microsserviço containerizado | Container Apps | Hospedagem gerenciada de containers |
| Migrar um servidor on-premises | Azure VM | Lift-and-shift, controle total |
| Executar um trabalho em lote por 10 minutos | ACI | Container simples, sem custo de longa duração |

:::tip Alternativa Azure CLI
```bash
# List available App Service runtimes
az webapp list-runtimes --output table

# List available Function App runtimes
az functionapp list-runtimes --os linux --output table
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **Azure App Service** | PaaS para web apps, APIs, backends mobile |
| **Azure Functions** | Computação serverless — execute código sob demanda, pague por execução |
| **Container** | Pacote leve com app + dependências (portátil) |
| **ACI** | Execute um container sem gerenciar infraestrutura |
| **Container Apps** | Plataforma gerenciada para containers de microsserviços |
| **AKS** | Kubernetes gerenciado para orquestração complexa de containers |
| **Serverless** | Sem gerenciamento de servidor, escala automática, faturamento por execução |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-10-q1',
      question: 'Qual serviço Azure permite executar código que responde a eventos sem gerenciar nenhuma infraestrutura?',
      options: ['Azure Virtual Machines', 'Azure App Service', 'Azure Functions', 'Azure Container Instances'],
      correctAnswer: 2,
      explanation: 'Azure Functions é um serviço de computação serverless que executa código em resposta a eventos (requisições HTTP, timers, mensagens). Você escreve o código; o Azure gerencia todo o resto.'
    },
    {
      id: 'az900-10-q2',
      question: 'Qual é uma vantagem principal dos containers comparados às máquinas virtuais?',
      options: ['Containers incluem um sistema operacional completo', 'Containers iniciam mais rápido e usam menos recursos', 'Containers fornecem isolamento no nível de hardware', 'Containers não podem ser escalados'],
      correctAnswer: 1,
      explanation: 'Containers são leves — compartilham o kernel do SO do host, iniciam em segundos e são medidos em megabytes ao invés de gigabytes. Isso os torna mais rápidos para iniciar e mais eficientes em recursos do que VMs.'
    },
    {
      id: 'az900-10-q3',
      question: 'Um desenvolvedor quer hospedar uma aplicação web com escala automática e sem gerenciamento de servidor. O app é escrito em Python. Qual serviço é mais apropriado?',
      options: ['Azure Virtual Machine', 'Azure App Service', 'Azure Virtual Desktop', 'Azure Blob Storage'],
      correctAnswer: 1,
      explanation: 'Azure App Service suporta Python e fornece escala automática, balanceamento de carga integrado e zero gerenciamento de servidor. É o serviço de hospedagem web PaaS.'
    },
    {
      id: 'az900-10-q4',
      question: 'No plano Consumption do Azure Functions, quando você paga?',
      options: ['Uma taxa mensal fixa', 'Apenas quando seu código executa', '24/7 por capacidade reservada', 'Por GB de armazenamento usado'],
      correctAnswer: 1,
      explanation: 'O plano Consumption cobra apenas quando sua função executa — baseado no número de execuções e no tempo de execução. Quando seu código não está rodando, você não é cobrado.'
    },
    {
      id: 'az900-10-q5',
      question: 'Qual serviço Azure fornece orquestração gerenciada de containers Kubernetes?',
      options: ['Azure Container Instances', 'Azure Container Apps', 'Azure Kubernetes Service (AKS)', 'Azure App Service'],
      correctAnswer: 2,
      explanation: 'Azure Kubernetes Service (AKS) fornece orquestração Kubernetes totalmente gerenciada para aplicações containerizadas complexas que requerem capacidades avançadas de implantação, escala e gerenciamento.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure compute and networking](https://learn.microsoft.com/en-us/training/modules/describe-azure-compute-networking-services/)
- [Azure App Service documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- [Azure Functions documentation](https://learn.microsoft.com/en-us/azure/azure-functions/)
