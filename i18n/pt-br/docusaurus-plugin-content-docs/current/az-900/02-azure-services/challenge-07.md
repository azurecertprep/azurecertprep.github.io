---
sidebar_position: 1
title: "Desafio 07: Infraestrutura Global do Azure"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 07: Infraestrutura Global do Azure

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Arquitetura e Serviços Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever regiões Azure, region pairs e sovereign regions
- Descrever availability zones
- Descrever datacenters Azure

## Visão Geral

A infraestrutura global do Azure é a base física de todos os serviços em nuvem. Ela consiste em mais de 60 regiões ao redor do mundo, cada uma contendo um ou mais datacenters conectados por uma rede dedicada de baixa latência.

Entender como o Azure organiza sua infraestrutura — de datacenters individuais a availability zones e regiões — é essencial para projetar soluções em nuvem confiáveis e de alto desempenho.

## Explorar

### Tarefa 1: Explorar regiões Azure

1. Acesse [azure.microsoft.com/explore/global-infrastructure/geographies](https://azure.microsoft.com/explore/global-infrastructure/geographies/)
2. Clique em diferentes regiões para ver quais serviços estão disponíveis
3. Observe:
   - As regiões são organizadas por geografia (Américas, Europa, Ásia-Pacífico, etc.)
   - Nem todos os serviços estão disponíveis em todas as regiões
   - Algumas regiões são pareadas para recuperação de desastres

**Fatos importantes sobre regiões:**
- Uma **região** é um conjunto de datacenters implantados dentro de um perímetro definido
- As regiões são conectadas por uma rede regional dedicada de baixa latência
- Você escolhe uma região ao implantar a maioria dos recursos Azure
- Escolha a região mais próxima dos seus usuários para melhor desempenho

### Tarefa 2: Entender region pairs

| Região Primária | Região Pareada | Distância |
|----------------|---------------|-----------|
| East US | West US | ~2.500 km |
| North Europe (Irlanda) | West Europe (Holanda) | ~900 km |
| Southeast Asia (Singapura) | East Asia (Hong Kong) | ~2.600 km |

**Por que region pairs são importantes:**
- O Azure atualiza uma região por vez (nunca ambas em um par simultaneamente)
- Se uma grande indisponibilidade afetar uma região, a recuperação é priorizada para regiões pareadas
- A residência de dados é mantida dentro da mesma geografia

### Tarefa 3: Entender availability zones

1. No Portal Azure, pesquise por **Virtual Machine** e clique em **Create**
2. No dropdown **Availability options**, procure por **Availability zone**
3. Observe que você pode escolher Zone 1, 2 ou 3
4. **Cancele** — não crie a VM

**O que são availability zones?**
- Localizações fisicamente separadas dentro de uma região
- Cada zona tem energia, refrigeração e rede independentes
- Mínimo de 3 zonas em regiões habilitadas
- Projetadas para sobreviver a falhas de datacenter

```text
Region: East US
├── Availability Zone 1 (Datacenter A)
├── Availability Zone 2 (Datacenter B)
└── Availability Zone 3 (Datacenter C)
```

### Tarefa 4: Entender sovereign regions

Sovereign regions (regiões soberanas) são instâncias isoladas do Azure para necessidades específicas de conformidade:

| Sovereign Region | Finalidade | Quem pode acessar |
|-----------------|-----------|-------------------|
| Azure Government (EUA) | Agências do governo dos EUA | Pessoal do governo dos EUA com autorização |
| Azure China (21Vianet) | Residência de dados na China | Organizações baseadas na China |

Essas regiões são física e logicamente separadas da nuvem Azure pública.

:::tip Alternativa Azure CLI
```bash
# List all Azure regions
az account list-locations --query "[].{Name:name, DisplayName:displayName}" --output table

# List regions with availability zone support
az account list-locations --query "[?availabilityZoneMappings != null].{Name:displayName, Zones:availabilityZoneMappings[*].logicalZone}" --output table
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **Region** | Área geográfica com um ou mais datacenters |
| **Region pair** | Duas regiões na mesma geografia vinculadas para recuperação de desastres |
| **Availability zone** | Datacenter fisicamente separado dentro de uma região |
| **Sovereign region** | Instância isolada do Azure para necessidades governamentais/de conformidade |
| **Datacenter** | Instalação física com servidores, rede e refrigeração |
| **Geography** | Mercado contendo uma ou mais regiões (preserva residência de dados) |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-07-q1',
      question: 'O que é uma availability zone do Azure?',
      options: ['Uma área geográfica contendo um ou mais datacenters', 'Um datacenter fisicamente separado dentro de uma região', 'Um par de regiões na mesma geografia', 'Uma instância separada do Azure para uso governamental'],
      correctAnswer: 1,
      explanation: 'Uma availability zone é um datacenter fisicamente separado dentro de uma região Azure. Cada zona tem energia, refrigeração e rede independentes para fornecer isolamento contra falhas no nível do datacenter.'
    },
    {
      id: 'az900-07-q2',
      question: 'Por que o Azure usa region pairs?',
      options: ['Para reduzir custos compartilhando recursos', 'Para garantir que atualizações de plataforma e recuperação sejam coordenadas entre regiões pareadas', 'Para fornecer acesso mais rápido à internet', 'Para cumprir apenas com o GDPR'],
      correctAnswer: 1,
      explanation: 'Region pairs garantem que atualizações planejadas sejam implantadas em uma região por vez, e a recuperação é priorizada para regiões pareadas durante grandes indisponibilidades. Elas também mantêm a residência de dados dentro da mesma geografia.'
    },
    {
      id: 'az900-07-q3',
      question: 'Uma empresa precisa garantir que seus dados nunca saiam da Alemanha devido a regulamentações. Qual conceito do Azure atende a esse requisito?',
      options: ['Availability zones', 'Region pairs', 'Geography e residência de dados', 'Sovereign regions'],
      correctAnswer: 2,
      explanation: 'As geographies do Azure definem limites para residência de dados. Ao implantar em regiões alemãs e usar opções geo-redundantes dentro da geografia, os dados permanecem dentro das fronteiras exigidas.'
    },
    {
      id: 'az900-07-q4',
      question: 'Quantas availability zones existem no mínimo em uma região Azure que as suporta?',
      options: ['1', '2', '3', '5'],
      correctAnswer: 2,
      explanation: 'Regiões Azure que suportam availability zones têm no mínimo 3 zonas fisicamente separadas, cada uma com infraestrutura independente para garantir alta disponibilidade.'
    },
    {
      id: 'az900-07-q5',
      question: 'Qual oferta do Azure é projetada especificamente para agências e contratantes do governo dos EUA?',
      options: ['Azure region pair', 'Azure Government', 'Azure availability zone', 'Azure Premium tier'],
      correctAnswer: 1,
      explanation: 'Azure Government é uma sovereign region que é física e logicamente separada da nuvem Azure pública. É operada por pessoal autorizado dos EUA e atende aos requisitos de conformidade do governo americano.'
    }
  ]}
/>

## Saiba Mais

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe core architectural components](https://learn.microsoft.com/en-us/training/modules/describe-core-architectural-components-of-azure/)
- [Azure global infrastructure](https://azure.microsoft.com/explore/global-infrastructure/)
