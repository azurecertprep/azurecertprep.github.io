---
sidebar_position: 1
title: "Desafio 19: Gerenciamento de Custos Azure e Calculadora de Preços"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 19: Gerenciamento de Custos Azure e Calculadora de Preços

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **Domínio**: Management & Governance (30-35%)
:::

## Habilidades do exame cobertas

- Descrever fatores que podem afetar custos no Azure
- Comparar o Pricing Calculator e o Total Cost of Ownership (TCO) Calculator
- Descrever recursos do Cost Management (alertas de custo, orçamentos, recomendações)
- Descrever o propósito de tags

## Visão Geral

Entender os custos do Azure é fundamental para qualquer organização. Os custos são afetados pelo tipo de recurso, uso, região e transferência de dados. O Azure fornece ferramentas para estimar, monitorar e otimizar gastos: o **Pricing Calculator** (estimar custos futuros), **TCO Calculator** (comparar on-premises vs. nuvem) e **Cost Management** (monitorar e controlar gastos atuais).

## Explorar

### Tarefa 1: Entender fatores de custo

| Fator | Impacto no custo | Exemplo |
|-------|-----------------|---------|
| **Tipo de recurso** | Diferentes serviços têm preços diferentes | VMs custam mais que armazenamento |
| **Região** | Preços variam por região | East US pode diferir de West Europe |
| **Uso/consumo** | Mais uso = custo mais alto | Executar uma VM 24/7 vs. 8 horas/dia |
| **Transferência de dados** | Entrada gratuita, saída tem custo | Baixar dados DO Azure |
| **Tier/SKU** | Tiers mais altos custam mais | Premium SSD vs. Standard HDD |
| **Capacidade reservada** | Compromisso = desconto | Reserva de 1 ano ou 3 anos |

### Tarefa 2: Usar o Pricing Calculator

1. Abra [azure.microsoft.com/pricing/calculator](https://azure.microsoft.com/pricing/calculator/)
2. Adicione uma **Virtual Machine**:
   - Região: East US, Linux, D2s v3
   - Anote o custo mensal
3. Adicione uma **Storage Account**:
   - LRS, Hot tier, 100 GB
   - Anote o custo (muito mais barato que VMs!)
4. Adicione um **App Service**:
   - Basic tier B1
   - Anote o custo mensal
5. Compare o total — observe que VMs geralmente são o maior custo

### Tarefa 3: Explorar o Cost Management

1. No Azure Portal, pesquise por **Cost Management**
2. Explore estas seções:
   - **Cost analysis**: Visualize gastos por serviço, grupo de recursos, localização
   - **Budgets**: Defina limites de gastos com alertas
   - **Advisor recommendations**: Sugestões para economia de custos
   - **Alerts**: Seja notificado quando os gastos ultrapassarem limites
3. Se sua conta é nova, os dados podem ser mínimos — tudo bem

### Tarefa 4: Entender tags para rastreamento de custos

Tags são pares nome-valor que você anexa a recursos para organização:

| Chave da tag | Valor da tag | Propósito |
|-------------|-------------|-----------|
| `Environment` | `Production` | Identificar recursos de produção |
| `CostCenter` | `IT-1234` | Rastrear custos por departamento |
| `Owner` | `alice@contoso.com` | Saber quem é dono do recurso |
| `Project` | `WebApp-v2` | Associar custos a projetos |

**Regras de tags:**
- Tags NÃO são herdadas (tags do RG pai não se aplicam automaticamente aos recursos)
- Você pode ter até 50 tags por recurso
- Tags permitem filtrar custos no Cost Management
- Azure Policy pode impor requisitos de tags

### Tarefa 5: Formas de reduzir custos

| Estratégia | Descrição | Economia |
|-----------|-----------|----------|
| **Reserved Instances** | Compromisso de 1 ou 3 anos | Até 72% de desconto |
| **Azure Hybrid Benefit** | Usar licenças Windows/SQL existentes | Até 40% de desconto |
| **Spot VMs** | Usar capacidade ociosa (pode ser interrompida) | Até 90% de desconto |
| **Right-sizing** | Adequar tamanho da VM ao uso real | Variável |
| **Auto-shutdown** | Desligar VMs de dev/teste à noite | Até 70% de desconto |
| **Azure Advisor** | Seguir recomendações de custo | Variável |

:::tip Alternativa Azure CLI
```bash
# List tags on a resource group
az group show --name rg-az900-learning --query tags --output table 2>/dev/null || echo "No tags set"

# Add a tag to a resource group
az group update --name rg-az900-learning --tags Environment=Learning CostCenter=Training 2>/dev/null || echo "Create the RG first in Challenge 08"
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **Pricing Calculator** | Estimar custos para novas implantações no Azure |
| **TCO Calculator** | Comparar custos on-premises com custos do Azure ao longo do tempo |
| **Cost Management** | Monitorar, alocar e otimizar gastos no Azure |
| **Budget** | Definir limites de gastos com alertas automáticos |
| **Tags** | Pares chave-valor para organizar e rastrear custos de recursos |
| **Reserved Instance** | Comprometer-se com prazo de 1-3 anos para desconto significativo |
| **Azure Advisor** | Recomendações personalizadas incluindo economia de custos |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-19-q1',
      question: 'Qual ferramenta do Azure você deve usar para estimar o custo mensal de uma nova implantação antes de criar qualquer recurso?',
      options: ['Azure Cost Management', 'Azure Pricing Calculator', 'TCO Calculator', 'Azure Advisor'],
      correctAnswer: 1,
      explanation: 'O Azure Pricing Calculator permite estimar custos configurando serviços e vendo cobranças mensais projetadas antes de implantar qualquer coisa.'
    },
    {
      id: 'az900-19-q2',
      question: 'A transferência de dados PARA o Azure (ingress) é:',
      options: ['Sempre gratuita', 'Sempre cobrada', 'Gratuita para os primeiros 5 GB', 'Cobrada com taxas premium'],
      correctAnswer: 0,
      explanation: 'A transferência de dados de entrada (ingress) para o Azure é gratuita. Você é cobrado pela transferência de dados de saída (egress) quando dados saem dos datacenters do Azure.'
    },
    {
      id: 'az900-19-q3',
      question: 'Qual é o propósito das tags de recursos no Azure?',
      options: ['Criptografar recursos', 'Organizar recursos e rastrear custos por metadados', 'Restringir acesso a recursos', 'Replicar recursos entre regiões'],
      correctAnswer: 1,
      explanation: 'Tags são pares chave-valor anexados a recursos para organização e rastreamento de custos. Elas permitem filtrar e agrupar recursos em relatórios de custos por departamento, projeto, ambiente, etc.'
    },
    {
      id: 'az900-19-q4',
      question: 'Uma empresa quer reduzir custos de VM comprometendo-se com um tamanho de VM específico por 3 anos. Qual opção de preço oferece o melhor desconto?',
      options: ['Pay-as-you-go', 'Spot VMs', 'Reserved Instances', 'Azure Hybrid Benefit'],
      correctAnswer: 2,
      explanation: 'Reserved Instances oferecem até 72% de economia comparado ao preço pay-as-you-go quando você se compromete com termos de 1 ou 3 anos para tamanhos de VM e regiões específicas.'
    },
    {
      id: 'az900-19-q5',
      question: 'As tags de recursos são automaticamente herdadas de um grupo de recursos para seus recursos?',
      options: ['Sim, sempre', 'Não, tags NÃO são herdadas por padrão', 'Apenas tags relacionadas a custos são herdadas', 'Apenas se o recurso estiver na mesma região'],
      correctAnswer: 1,
      explanation: 'Tags NÃO são herdadas por padrão. Tags aplicadas a um grupo de recursos não fluem automaticamente para os recursos dentro dele. Você pode usar Azure Policy para impor herança de tags se necessário.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe cost management in Azure](https://learn.microsoft.com/en-us/training/modules/describe-cost-management-azure/)
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
- [Azure Cost Management documentation](https://learn.microsoft.com/en-us/azure/cost-management-billing/)
