---
sidebar_position: 1
title: "Desafio 07: Infraestrutura Global do Azure"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 07: Infraestrutura Global do Azure

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **DomÃ­nio**: Arquitetura e ServiÃ§os Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever regiÃµes Azure, region pairs e sovereign regions
- Descrever availability zones
- Descrever datacenters Azure

## VisÃ£o Geral

A infraestrutura global do Azure Ã© a base fÃ­sica de todos os serviÃ§os em nuvem. Ela consiste em mais de 60 regiÃµes ao redor do mundo, cada uma contendo um ou mais datacenters conectados por uma rede dedicada de baixa latÃªncia.

Entender como o Azure organiza sua infraestrutura â€” de datacenters individuais a availability zones e regiÃµes â€” Ã© essencial para projetar soluÃ§Ãµes em nuvem confiÃ¡veis e de alto desempenho.

## Explorar

### Tarefa 1: Explorar regiÃµes Azure

1. Acesse [azure.microsoft.com/explore/global-infrastructure/geographies](https://azure.microsoft.com/explore/global-infrastructure/geographies/)
2. Clique em diferentes regiÃµes para ver quais serviÃ§os estÃ£o disponÃ­veis
3. Observe:
   - As regiÃµes sÃ£o organizadas por geografia (AmÃ©ricas, Europa, Ãsia-PacÃ­fico, etc.)
   - Nem todos os serviÃ§os estÃ£o disponÃ­veis em todas as regiÃµes
   - Algumas regiÃµes sÃ£o pareadas para recuperaÃ§Ã£o de desastres

**Fatos importantes sobre regiÃµes:**
- Uma **regiÃ£o** Ã© um conjunto de datacenters implantados dentro de um perÃ­metro definido
- As regiÃµes sÃ£o conectadas por uma rede regional dedicada de baixa latÃªncia
- VocÃª escolhe uma regiÃ£o ao implantar a maioria dos recursos Azure
- Escolha a regiÃ£o mais prÃ³xima dos seus usuÃ¡rios para melhor desempenho

### Tarefa 2: Entender region pairs

| RegiÃ£o PrimÃ¡ria | RegiÃ£o Pareada | DistÃ¢ncia |
|----------------|---------------|-----------|
| East US | West US | ~2.500 km |
| North Europe (Irlanda) | West Europe (Holanda) | ~900 km |
| Southeast Asia (Singapura) | East Asia (Hong Kong) | ~2.600 km |

**Por que region pairs sÃ£o importantes:**
- O Azure atualiza uma regiÃ£o por vez (nunca ambas em um par simultaneamente)
- Se uma grande indisponibilidade afetar uma regiÃ£o, a recuperaÃ§Ã£o Ã© priorizada para regiÃµes pareadas
- A residÃªncia de dados Ã© mantida dentro da mesma geografia

### Tarefa 3: Entender availability zones

1. No Portal Azure, pesquise por **Virtual Machine** e clique em **Create**
2. No dropdown **Availability options**, procure por **Availability zone**
3. Observe que vocÃª pode escolher Zone 1, 2 ou 3
4. **Cancele** â€” nÃ£o crie a VM

**O que sÃ£o availability zones?**
- LocalizaÃ§Ãµes fisicamente separadas dentro de uma regiÃ£o
- Cada zona tem energia, refrigeraÃ§Ã£o e rede independentes
- MÃ­nimo de 3 zonas em regiÃµes habilitadas
- Projetadas para sobreviver a falhas de datacenter

```text
Region: East US
â”œâ”€â”€ Availability Zone 1 (Datacenter A)
â”œâ”€â”€ Availability Zone 2 (Datacenter B)
â””â”€â”€ Availability Zone 3 (Datacenter C)
```

### Tarefa 4: Entender sovereign regions

Sovereign regions (regiÃµes soberanas) sÃ£o instÃ¢ncias isoladas do Azure para necessidades especÃ­ficas de conformidade:

| Sovereign Region | Finalidade | Quem pode acessar |
|-----------------|-----------|-------------------|
| Azure Government (EUA) | AgÃªncias do governo dos EUA | Pessoal do governo dos EUA com autorizaÃ§Ã£o |
| Azure China (21Vianet) | ResidÃªncia de dados na China | OrganizaÃ§Ãµes baseadas na China |

Essas regiÃµes sÃ£o fÃ­sica e logicamente separadas da nuvem Azure pÃºblica.

:::tip Alternativa Azure CLI
```bash
# List all Azure regions
az account list-locations --query "[].{Name:name, DisplayName:displayName}" --output table

# List regions with availability zone support
az account list-locations --query "[?availabilityZoneMappings != null].{Name:displayName, Zones:availabilityZoneMappings[*].logicalZone}" --output table
```
:::

## Conceitos-Chave

| Conceito | DescriÃ§Ã£o |
|----------|-----------|
| **Region** | Ãrea geogrÃ¡fica com um ou mais datacenters |
| **Region pair** | Duas regiÃµes na mesma geografia vinculadas para recuperaÃ§Ã£o de desastres |
| **Availability zone** | Datacenter fisicamente separado dentro de uma regiÃ£o |
| **Sovereign region** | InstÃ¢ncia isolada do Azure para necessidades governamentais/de conformidade |
| **Datacenter** | InstalaÃ§Ã£o fÃ­sica com servidores, rede e refrigeraÃ§Ã£o |
| **Geography** | Mercado contendo uma ou mais regiÃµes (preserva residÃªncia de dados) |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-07-q1',
      question: 'O que Ã© uma availability zone do Azure?',
      options: ['Uma Ã¡rea geogrÃ¡fica contendo um ou mais datacenters', 'Um datacenter fisicamente separado dentro de uma regiÃ£o', 'Um par de regiÃµes na mesma geografia', 'Uma instÃ¢ncia separada do Azure para uso governamental'],
      correctAnswer: 1,
      explanation: 'Uma availability zone Ã© um datacenter fisicamente separado dentro de uma regiÃ£o Azure. Cada zona tem energia, refrigeraÃ§Ã£o e rede independentes para fornecer isolamento contra falhas no nÃ­vel do datacenter.'
    },
    {
      id: 'az900-07-q2',
      question: 'Por que o Azure usa region pairs?',
      options: ['Para reduzir custos compartilhando recursos', 'Para garantir que atualizaÃ§Ãµes de plataforma e recuperaÃ§Ã£o sejam coordenadas entre regiÃµes pareadas', 'Para fornecer acesso mais rÃ¡pido Ã  internet', 'Para cumprir apenas com o GDPR'],
      correctAnswer: 1,
      explanation: 'Region pairs garantem que atualizaÃ§Ãµes planejadas sejam implantadas em uma regiÃ£o por vez, e a recuperaÃ§Ã£o Ã© priorizada para regiÃµes pareadas durante grandes indisponibilidades. Elas tambÃ©m mantÃªm a residÃªncia de dados dentro da mesma geografia.'
    },
    {
      id: 'az900-07-q3',
      question: 'Uma empresa precisa garantir que seus dados nunca saiam da Alemanha devido a regulamentaÃ§Ãµes. Qual conceito do Azure atende a esse requisito?',
      options: ['Availability zones', 'Region pairs', 'Geography e residÃªncia de dados', 'Sovereign regions'],
      correctAnswer: 2,
      explanation: 'As geographies do Azure definem limites para residÃªncia de dados. Ao implantar em regiÃµes alemÃ£s e usar opÃ§Ãµes geo-redundantes dentro da geografia, os dados permanecem dentro das fronteiras exigidas.'
    },
    {
      id: 'az900-07-q4',
      question: 'Quantas availability zones existem no mÃ­nimo em uma regiÃ£o Azure que as suporta?',
      options: ['1', '2', '3', '5'],
      correctAnswer: 2,
      explanation: 'RegiÃµes Azure que suportam availability zones tÃªm no mÃ­nimo 3 zonas fisicamente separadas, cada uma com infraestrutura independente para garantir alta disponibilidade.'
    },
    {
      id: 'az900-07-q5',
      question: 'Qual oferta do Azure Ã© projetada especificamente para agÃªncias e contratantes do governo dos EUA?',
      options: ['Azure region pair', 'Azure Government', 'Azure availability zone', 'Azure Premium tier'],
      correctAnswer: 1,
      explanation: 'Azure Government Ã© uma sovereign region que Ã© fÃ­sica e logicamente separada da nuvem Azure pÃºblica. Ã‰ operada por pessoal autorizado dos EUA e atende aos requisitos de conformidade do governo americano.'
    }
  ]}
/>

## Saiba Mais

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) â€” Materiais de estudo selecionados
- [Microsoft Learn: Describe core architectural components](https://learn.microsoft.com/en-us/training/modules/describe-core-architectural-components-of-azure/)
- [Azure global infrastructure](https://azure.microsoft.com/explore/global-infrastructure/)
