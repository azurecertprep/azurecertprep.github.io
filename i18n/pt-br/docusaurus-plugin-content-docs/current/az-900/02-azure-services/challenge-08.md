---
sidebar_position: 2
title: "Desafio 08: Hierarquia de Recursos Azure"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 08: Hierarquia de Recursos Azure

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **Domínio**: Arquitetura e Serviços Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever recursos Azure e resource groups
- Descrever subscriptions
- Descrever management groups
- Descrever a hierarquia de resource groups, subscriptions e management groups

## Visão Geral

O Azure organiza recursos em uma hierarquia de quatro níveis. Entender essa hierarquia é crítico porque ela controla acesso (RBAC), aplicação de políticas e faturamento.

```
Management Groups
  └── Subscriptions
        └── Resource Groups
              └── Resources
```

Cada nível herda configurações do nível acima. Políticas aplicadas em um management group fluem para todas as subscriptions, resource groups e recursos abaixo dele.

## Explorar

### Tarefa 1: Entender a hierarquia

| Nível | Finalidade | Exemplo |
|-------|-----------|---------|
| **Management groups** | Organizar subscriptions; aplicar políticas em escala | "Production", "Development" |
| **Subscriptions** | Limite de faturamento + limite de controle de acesso | "Pay-As-You-Go", "Visual Studio Enterprise" |
| **Resource groups** | Container lógico para recursos relacionados | "rg-webapp-prod", "rg-database-dev" |
| **Resources** | Instâncias individuais de serviços Azure | Uma VM específica, storage account ou banco de dados |

### Tarefa 2: Explorar resource groups no Portal

1. No Portal Azure, pesquise por **Resource groups**
2. Clique em **+ Create** para ver o formulário de criação:
   - Observe que você escolhe uma **Subscription** e uma **Region**
   - Resource groups são gratuitos — são apenas containers
3. Crie um resource group:
   - Nome: `rg-az900-learning`
   - Região: Sua região mais próxima
   - Clique em **Review + create** → **Create**
4. Abra seu novo resource group — observe que está vazio (sem custo!)

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
- Uma subscription pode ter múltiplos resource groups
- Subscriptions são a unidade primária de faturamento

### Tarefa 4: Explorar management groups

1. No Portal Azure, pesquise por **Management groups**
2. Você verá o **Tenant Root Group** (o topo da sua hierarquia)
3. Todas as subscriptions estão aninhadas dentro de management groups

**Exemplo de hierarquia para uma grande organização:**
```
Tenant Root Group
├── Production
│   ├── Subscription: Prod-East
│   └── Subscription: Prod-West
├── Development
│   └── Subscription: Dev-Team
└── Sandbox
    └── Subscription: Individual-Testing
```

### Tarefa 5: Regras de resource groups

Regras importantes para lembrar:

| Regra | Descrição |
|-------|-----------|
| Recursos só podem estar em UM grupo | Uma VM não pode estar em dois resource groups |
| Resource groups PODEM abranger regiões | Um RG em "East US" pode conter recursos em "West Europe" |
| Deletar um RG deleta TODOS os recursos dentro | Cuidado! |
| RGs não podem ser aninhados | Você não pode colocar um resource group dentro de outro |
| Permissões são herdadas | RBAC no nível do RG se aplica a todos os recursos dentro dele |

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

| Conceito | Descrição |
|----------|-----------|
| **Resource** | Qualquer item gerenciável no Azure (VM, banco de dados, VNet) |
| **Resource group** | Container que agrupa recursos relacionados para gerenciamento |
| **Subscription** | Unidade de faturamento e limite de controle de acesso |
| **Management group** | Container para gerenciar acesso/políticas entre subscriptions |
| **Herança** | Políticas e acesso fluem PARA BAIXO na hierarquia |
| **Tenant** | A organização de nível superior do Azure AD (Entra ID) |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-08-q1',
      question: 'O que acontece quando você deleta um resource group?',
      options: ['Apenas o grupo é deletado; os recursos são movidos', 'Todos os recursos dentro do grupo também são deletados', 'A subscription é cancelada', 'Os recursos são arquivados por 30 dias'],
      correctAnswer: 1,
      explanation: 'Deletar um resource group deleta TODOS os recursos contidos nele. Esta é uma ação permanente e é útil para limpar ambientes inteiros de uma vez.'
    },
    {
      id: 'az900-08-q2',
      question: 'Qual nível da hierarquia Azure é o limite primário de faturamento?',
      options: ['Management group', 'Subscription', 'Resource group', 'Resource'],
      correctAnswer: 1,
      explanation: 'A subscription é o limite primário de faturamento. Todos os custos de recursos dentro de uma subscription são faturados juntos. Management groups ajudam a organizar subscriptions, mas não são faturados diretamente.'
    },
    {
      id: 'az900-08-q3',
      question: 'Um resource group pode conter recursos de diferentes regiões Azure?',
      options: ['Não, todos os recursos devem estar na mesma região que o resource group', 'Sim, um resource group pode conter recursos de qualquer região', 'Somente se estiverem em regiões pareadas', 'Somente dentro da mesma geografia'],
      correctAnswer: 1,
      explanation: 'Um resource group pode conter recursos de qualquer região Azure. A região do resource group especifica apenas onde os metadados do grupo são armazenados, não onde seus recursos devem ser implantados.'
    },
    {
      id: 'az900-08-q4',
      question: 'Uma organização tem múltiplos departamentos que precisam cada um de seu próprio faturamento e controle de acesso Azure. O que eles devem usar?',
      options: ['Múltiplos resource groups em uma subscription', 'Múltiplas subscriptions organizadas por management groups', 'Múltiplas regiões', 'Múltiplas contas de tenant'],
      correctAnswer: 1,
      explanation: 'Usar múltiplas subscriptions (uma por departamento) fornece limites separados de faturamento e acesso. Management groups podem então organizar essas subscriptions e aplicar políticas entre elas.'
    },
    {
      id: 'az900-08-q5',
      question: 'Uma política é aplicada no nível do management group. Quais recursos ela afeta?',
      options: ['Apenas recursos diretamente no management group', 'Todos os recursos em todas as subscriptions dentro daquele management group', 'Apenas a primeira subscription no grupo', 'Nenhum — políticas só funcionam no nível da subscription'],
      correctAnswer: 1,
      explanation: 'Políticas aplicadas no nível do management group são herdadas por todas as subscriptions, resource groups e recursos abaixo daquele management group na hierarquia.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe core architectural components](https://learn.microsoft.com/en-us/training/modules/describe-core-architectural-components-of-azure/)
- [Azure Resource Manager overview](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview)
