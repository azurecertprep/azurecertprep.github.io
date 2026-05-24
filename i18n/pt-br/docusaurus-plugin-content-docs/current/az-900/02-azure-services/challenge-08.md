---
sidebar_position: 2
title: "Desafio 08: Hierarquia de Recursos Azure"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 08: Hierarquia de Recursos Azure

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **DomÃ­nio**: Arquitetura e ServiÃ§os Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever recursos Azure e resource groups
- Descrever subscriptions
- Descrever management groups
- Descrever a hierarquia de resource groups, subscriptions e management groups

## VisÃ£o Geral

O Azure organiza recursos em uma hierarquia de quatro nÃ­veis. Entender essa hierarquia Ã© crÃ­tico porque ela controla acesso (RBAC), aplicaÃ§Ã£o de polÃ­ticas e faturamento.

```text
Management Groups
  â””â”€â”€ Subscriptions
        â””â”€â”€ Resource Groups
              â””â”€â”€ Resources
```

Cada nÃ­vel herda configuraÃ§Ãµes do nÃ­vel acima. PolÃ­ticas aplicadas em um management group fluem para todas as subscriptions, resource groups e recursos abaixo dele.

## Explorar

### Tarefa 1: Entender a hierarquia

| NÃ­vel | Finalidade | Exemplo |
|-------|-----------|---------|
| **Management groups** | Organizar subscriptions; aplicar polÃ­ticas em escala | "Production", "Development" |
| **Subscriptions** | Limite de faturamento + limite de controle de acesso | "Pay-As-You-Go", "Visual Studio Enterprise" |
| **Resource groups** | Container lÃ³gico para recursos relacionados | "rg-webapp-prod", "rg-database-dev" |
| **Resources** | InstÃ¢ncias individuais de serviÃ§os Azure | Uma VM especÃ­fica, storage account ou banco de dados |

### Tarefa 2: Explorar resource groups no Portal

1. No Portal Azure, pesquise por **Resource groups**
2. Clique em **+ Create** para ver o formulÃ¡rio de criaÃ§Ã£o:
   - Observe que vocÃª escolhe uma **Subscription** e uma **Region**
   - Resource groups sÃ£o gratuitos â€” sÃ£o apenas containers
3. Crie um resource group:
   - Nome: `rg-az900-learning`
   - RegiÃ£o: Sua regiÃ£o mais prÃ³xima
   - Clique em **Review + create** â†’ **Create**
4. Abra seu novo resource group â€” observe que estÃ¡ vazio (sem custo!)

### Tarefa 3: Entender subscriptions

1. No Portal Azure, pesquise por **Subscriptions**
2. Clique na sua subscription
3. Explore o menu:
   - **Overview**: Veja o ID da subscription, tipo de oferta
   - **Cost analysis**: Veja os gastos (deve ser $0)
   - **Access control (IAM)**: Quem tem acesso
   - **Resource groups**: Todos os RGs nesta subscription

**Fatos importantes:**
- Todo recurso Azure pertence a exatamente UM resource group
- Todo resource group pertence a exatamente UMA subscription
- Uma subscription pode ter mÃºltiplos resource groups
- Subscriptions sÃ£o a unidade primÃ¡ria de faturamento

### Tarefa 4: Explorar management groups

1. No Portal Azure, pesquise por **Management groups**
2. VocÃª verÃ¡ o **Tenant Root Group** (o topo da sua hierarquia)
3. Todas as subscriptions estÃ£o aninhadas dentro de management groups

**Exemplo de hierarquia para uma grande organizaÃ§Ã£o:**
```text
Tenant Root Group
â”œâ”€â”€ Production
â”‚   â”œâ”€â”€ Subscription: Prod-East
â”‚   â””â”€â”€ Subscription: Prod-West
â”œâ”€â”€ Development
â”‚   â””â”€â”€ Subscription: Dev-Team
â””â”€â”€ Sandbox
    â””â”€â”€ Subscription: Individual-Testing
```

### Tarefa 5: Regras de resource groups

Regras importantes para lembrar:

| Regra | DescriÃ§Ã£o |
|-------|-----------|
| Recursos sÃ³ podem estar em UM grupo | Uma VM nÃ£o pode estar em dois resource groups |
| Resource groups PODEM abranger regiÃµes | Um RG em "East US" pode conter recursos em "West Europe" |
| Deletar um RG deleta TODOS os recursos dentro | Cuidado! |
| RGs nÃ£o podem ser aninhados | VocÃª nÃ£o pode colocar um resource group dentro de outro |
| PermissÃµes sÃ£o herdadas | RBAC no nÃ­vel do RG se aplica a todos os recursos dentro dele |

:::tip Alternativa Azure CLI
```bash
# List your subscriptions
az account list --output table

# List resource groups
az group list --output table

# Create a resource group (free!)
az group create --name rg-az900-learning --location eastus

# Show resource group details
az group show --name rg-az900-learning --output table
```
:::

## Conceitos-Chave

| Conceito | DescriÃ§Ã£o |
|----------|-----------|
| **Resource** | Qualquer item gerenciÃ¡vel no Azure (VM, banco de dados, VNet) |
| **Resource group** | Container que agrupa recursos relacionados para gerenciamento |
| **Subscription** | Unidade de faturamento e limite de controle de acesso |
| **Management group** | Container para gerenciar acesso/polÃ­ticas entre subscriptions |
| **HeranÃ§a** | PolÃ­ticas e acesso fluem PARA BAIXO na hierarquia |
| **Tenant** | A organizaÃ§Ã£o de nÃ­vel superior do Azure AD (Entra ID) |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-08-q1',
      question: 'O que acontece quando vocÃª deleta um resource group?',
      options: ['Apenas o grupo Ã© deletado; os recursos sÃ£o movidos', 'Todos os recursos dentro do grupo tambÃ©m sÃ£o deletados', 'A subscription Ã© cancelada', 'Os recursos sÃ£o arquivados por 30 dias'],
      correctAnswer: 1,
      explanation: 'Deletar um resource group deleta TODOS os recursos contidos nele. Esta Ã© uma aÃ§Ã£o permanente e Ã© Ãºtil para limpar ambientes inteiros de uma vez.'
    },
    {
      id: 'az900-08-q2',
      question: 'Qual nÃ­vel da hierarquia Azure Ã© o limite primÃ¡rio de faturamento?',
      options: ['Management group', 'Subscription', 'Resource group', 'Resource'],
      correctAnswer: 1,
      explanation: 'A subscription Ã© o limite primÃ¡rio de faturamento. Todos os custos de recursos dentro de uma subscription sÃ£o faturados juntos. Management groups ajudam a organizar subscriptions, mas nÃ£o sÃ£o faturados diretamente.'
    },
    {
      id: 'az900-08-q3',
      question: 'Um resource group pode conter recursos de diferentes regiÃµes Azure?',
      options: ['NÃ£o, todos os recursos devem estar na mesma regiÃ£o que o resource group', 'Sim, um resource group pode conter recursos de qualquer regiÃ£o', 'Somente se estiverem em regiÃµes pareadas', 'Somente dentro da mesma geografia'],
      correctAnswer: 1,
      explanation: 'Um resource group pode conter recursos de qualquer regiÃ£o Azure. A regiÃ£o do resource group especifica apenas onde os metadados do grupo sÃ£o armazenados, nÃ£o onde seus recursos devem ser implantados.'
    },
    {
      id: 'az900-08-q4',
      question: 'Uma organizaÃ§Ã£o tem mÃºltiplos departamentos que precisam cada um de seu prÃ³prio faturamento e controle de acesso Azure. O que eles devem usar?',
      options: ['MÃºltiplos resource groups em uma subscription', 'MÃºltiplas subscriptions organizadas por management groups', 'MÃºltiplas regiÃµes', 'MÃºltiplas contas de tenant'],
      correctAnswer: 1,
      explanation: 'Usar mÃºltiplas subscriptions (uma por departamento) fornece limites separados de faturamento e acesso. Management groups podem entÃ£o organizar essas subscriptions e aplicar polÃ­ticas entre elas.'
    },
    {
      id: 'az900-08-q5',
      question: 'Uma polÃ­tica Ã© aplicada no nÃ­vel do management group. Quais recursos ela afeta?',
      options: ['Apenas recursos diretamente no management group', 'Todos os recursos em todas as subscriptions dentro daquele management group', 'Apenas a primeira subscription no grupo', 'Nenhum â€” polÃ­ticas sÃ³ funcionam no nÃ­vel da subscription'],
      correctAnswer: 1,
      explanation: 'PolÃ­ticas aplicadas no nÃ­vel do management group sÃ£o herdadas por todas as subscriptions, resource groups e recursos abaixo daquele management group na hierarquia.'
    }
  ]}
/>

## Saiba Mais

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) â€” Materiais de estudo selecionados
- [Microsoft Learn: Describe core architectural components](https://learn.microsoft.com/en-us/training/modules/describe-core-architectural-components-of-azure/)
- [Azure Resource Manager overview](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview)
