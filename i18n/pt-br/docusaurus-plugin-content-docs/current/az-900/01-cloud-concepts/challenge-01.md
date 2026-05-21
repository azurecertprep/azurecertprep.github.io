---
sidebar_position: 1
title: "Desafio 01: O que é Computação em Nuvem?"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 01: O que é Computação em Nuvem?

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Conceitos de Nuvem (25-30%)
:::

## Habilidades do exame cobertas

- Definir computação em nuvem
- Descrever o modelo de responsabilidade compartilhada
- Definir modelos de nuvem (pública, privada, híbrida)
- Identificar casos de uso apropriados para cada modelo de nuvem

## Visão Geral

Computação em nuvem é a entrega de serviços de computação — servidores, armazenamento, bancos de dados, rede, software — pela internet ("a nuvem"). Em vez de comprar e manter hardware físico, você aluga recursos de um provedor de nuvem como o Microsoft Azure.

Pense nisso como eletricidade: você não constrói uma usina para acender uma luz. Você se conecta à rede elétrica e paga pelo que usa. A computação em nuvem funciona da mesma forma — você acessa poder computacional sob demanda e paga apenas pelo que consome.

O **modelo de responsabilidade compartilhada** define quem é responsável por quê. O provedor de nuvem sempre gerencia a infraestrutura física (hardware, rede, datacenter). O que VOCÊ gerencia depende do tipo de serviço (IaaS, PaaS ou SaaS).

## Explorar

### Tarefa 1: Entender modelos de nuvem

Existem três modelos de implantação em nuvem. Revise as diferenças:

| Modelo | Descrição | Exemplo |
|--------|-----------|---------|
| **Nuvem pública** | Recursos de propriedade do provedor de nuvem, compartilhados entre clientes | Azure, AWS, Google Cloud |
| **Nuvem privada** | Recursos dedicados a uma única organização | Azure Stack, datacenter on-premises |
| **Nuvem híbrida** | Combinação de nuvens pública e privada | AD on-prem + Azure Entra ID |

**Sua tarefa**: Pense na sua organização atual ou anterior. Qual modelo de nuvem seria o melhor? Por quê?

### Tarefa 2: Explorar o modelo de responsabilidade compartilhada

Navegue até: [Documentação de responsabilidade compartilhada da Microsoft](https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility)

Revise esta tabela:

| Responsabilidade | On-premises | IaaS | PaaS | SaaS |
|-----------------|-------------|------|------|------|
| Dados e acesso | Você | Você | Você | Você |
| Aplicações | Você | Você | Você | Provedor |
| Sistema operacional | Você | Você | Provedor | Provedor |
| Controles de rede | Você | Você | Provedor | Provedor |
| Infraestrutura física | Você | Provedor | Provedor | Provedor |

**Insight principal**: VOCÊ é sempre responsável pelos seus dados, contas e gerenciamento de acesso — independentemente do modelo de nuvem.

### Tarefa 3: Visitar o Portal Azure

1. Abra [portal.azure.com](https://portal.azure.com)
2. Observe a barra de pesquisa no topo — é assim que você encontra qualquer serviço Azure
3. Clique em **All services** no menu esquerdo
4. Navegue pelas categorias: Compute, Networking, Storage, Databases, etc.
5. Note quantos serviços existem — o Azure oferece mais de 200 serviços nessas categorias

### Tarefa 4: Explorar a presença global do Azure

1. Visite [azure.microsoft.com/explore/global-infrastructure](https://azure.microsoft.com/explore/global-infrastructure)
2. Observe o número de regiões no mundo
3. Esta é a "nuvem" — datacenters massivos distribuídos globalmente

:::tip Alternativa Azure CLI
```bash
# List all Azure regions
az account list-locations --output table

# Show your current subscription
az account show --output table
```
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Computação em nuvem | Entrega sob demanda de recursos de TI pela internet com precificação pague-conforme-o-uso |
| Nuvem pública | Ambiente multi-tenant gerenciado por um provedor de nuvem |
| Nuvem privada | Ambiente single-tenant, pode ser on-premises ou hospedado |
| Nuvem híbrida | Combina nuvens pública e privada, permitindo que dados/apps transitem entre elas |
| Responsabilidade compartilhada | Deveres de segurança/gerenciamento divididos entre provedor e cliente |
| Multi-cloud | Usar serviços de múltiplos provedores de nuvem |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-01-q1',
      question: 'Qual modelo de nuvem disponibiliza recursos para múltiplas organizações pela internet pública?',
      options: ['Nuvem privada', 'Nuvem pública', 'Nuvem híbrida', 'Nuvem comunitária'],
      correctAnswer: 1,
      explanation: 'Uma nuvem pública é de propriedade de um provedor de nuvem terceirizado e disponibiliza recursos para múltiplas organizações e usuários pela internet pública.'
    },
    {
      id: 'az900-01-q2',
      question: 'No modelo de responsabilidade compartilhada, quem é SEMPRE responsável pelos dados armazenados na nuvem?',
      options: ['O provedor de nuvem', 'O cliente', 'Ambos igualmente', 'O provedor de rede'],
      correctAnswer: 1,
      explanation: 'Independentemente do modelo de implantação em nuvem (IaaS, PaaS ou SaaS), o cliente é sempre responsável pelos seus dados, endpoints, contas e gerenciamento de acesso.'
    },
    {
      id: 'az900-01-q3',
      question: 'Uma empresa quer manter dados sensíveis on-premises mas usar o Azure para capacidade computacional adicional durante períodos de pico. Qual modelo de nuvem descreve essa abordagem?',
      options: ['Nuvem pública', 'Nuvem privada', 'Nuvem híbrida', 'Multi-cloud'],
      correctAnswer: 2,
      explanation: 'Uma nuvem híbrida combina infraestrutura on-premises (privada) com serviços de nuvem pública, permitindo que dados e aplicações sejam compartilhados entre eles.'
    },
    {
      id: 'az900-01-q4',
      question: 'Em um modelo de nuvem pública, quem é responsável pela manutenção do hardware físico?',
      options: ['O cliente', 'O provedor de nuvem', 'Um contratante terceirizado', 'O cliente e o provedor compartilham igualmente'],
      correctAnswer: 1,
      explanation: 'Em qualquer modelo de nuvem, o provedor de nuvem é sempre responsável pela infraestrutura física — servidores, hardware de rede e a instalação do datacenter.'
    },
    {
      id: 'az900-01-q5',
      question: 'Qual das seguintes é uma característica da computação em nuvem?',
      options: ['Custos mensais fixos independentemente do uso', 'Recursos são entregues pela internet sob demanda', 'Requer a compra de servidores físicos antecipadamente', 'Disponível apenas para grandes empresas'],
      correctAnswer: 1,
      explanation: 'A computação em nuvem entrega recursos pela internet sob demanda. Você pode escalar para cima ou para baixo conforme necessário e normalmente paga apenas pelo que usa.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Guia de Estudos AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo curados
- [Microsoft Learn: Descrever computação em nuvem](https://learn.microsoft.com/en-us/training/modules/describe-cloud-compute/)
- [Responsabilidade compartilhada na nuvem](https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility)
