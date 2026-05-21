---
sidebar_position: 3
title: "Desafio 03: Modelos de Precificação em Nuvem"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 03: Modelos de Precificação em Nuvem

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Conceitos de Nuvem (25-30%)
:::

## Habilidades do exame cobertas

- Descrever o modelo baseado em consumo
- Comparar modelos de precificação em nuvem (CapEx vs OpEx)
- Descrever serverless

## Visão Geral

Uma das maiores mudanças ao migrar para a nuvem é como você paga pela TI. A computação on-premises tradicional exige grandes investimentos antecipados (comprar servidores, construir datacenters). A computação em nuvem muda isso para um modelo pague-conforme-o-uso — como pagar pela eletricidade em vez de construir uma usina.

Entender a diferença entre **Capital Expenditure (CapEx)** e **Operational Expenditure (OpEx)** é fundamental para o exame AZ-900 e para compreender a economia da nuvem.

## Explorar

### Tarefa 1: CapEx vs OpEx

| Aspecto | CapEx (Tradicional) | OpEx (Nuvem) |
|---------|--------------------:|-------------:|
| Momento do pagamento | Antecipado | Mensal/por hora |
| Propriedade | Você é dono | Você aluga |
| Depreciação | Deprecia com o tempo | Sem depreciação |
| Escala | Comprar mais hardware | Clicar um botão |
| Risco | Superprovisionamento ou subprovisionamento | Paga pelo que usa |
| Exemplo | Comprar servidores por R$500K | VM Azure a $0.05/hora |

### Tarefa 2: Usar a Calculadora de Preços do Azure

1. Abra [azure.microsoft.com/pricing/calculator](https://azure.microsoft.com/pricing/calculator/)
2. Clique em **Virtual Machines** na lista de produtos
3. Configure:
   - Region: East US
   - OS: Linux
   - Type: D2s v3 (2 vCPUs, 8 GB RAM)
   - Deixe os outros padrões
4. Observe a estimativa de custo mensal
5. Agora mude para **Windows** — veja como o custo aumenta (licenciamento do SO)
6. Mude a região para **West Europe** — observe que o preço pode variar por região

### Tarefa 3: Usar a TCO Calculator

1. Abra [azure.microsoft.com/pricing/tco/calculator](https://azure.microsoft.com/pricing/tco/calculator/)
2. Em **Define your workloads**, adicione:
   - Servers: 2 servidores, Windows, 4 cores, 16 GB RAM
3. Clique **Next** (Adjust assumptions)
4. Revise as suposições sobre eletricidade, mão de obra, etc.
5. Clique **Next** (View report)
6. Veja a comparação de custos de 5 anos entre on-premises e Azure

### Tarefa 4: Entender o modelo baseado em consumo

O modelo baseado em consumo significa:
- **Sem custo antecipado** — comece a usar serviços imediatamente
- **Sem recursos desperdiçados** — pare de pagar quando parar de usar
- **Pague pelo que precisa** — escale para cima/baixo com a demanda
- **Faturamento previsível** — previsão baseada em uso

**Analogia do mundo real:**
| Modelo | Analogia |
|--------|----------|
| CapEx | Comprar um carro (custo antecipado, manutenção, depreciação) |
| OpEx | Uber/táxi (paga por corrida, sem manutenção, sem propriedade) |

### Tarefa 5: Entender serverless

Computação serverless é o modelo de consumo máximo:
- Você implanta código, não infraestrutura
- A plataforma gerencia todos os servidores
- Você paga apenas quando seu código executa (por execução)
- Azure Functions: as primeiras 1 milhão de execuções/mês são **gratuitas**

:::tip Alternativa Azure CLI
```bash
# Get pricing for a specific VM size (informational)
az vm list-sizes --location eastus --query "[?name=='Standard_D2s_v3']" --output table

# List free-tier eligible services
az vm list-sizes --location eastus --query "[?name=='Standard_B1s']" --output table
```
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| **CapEx** | Grande investimento antecipado em infraestrutura física; deprecia com o tempo |
| **OpEx** | Gastos operacionais contínuos; pague-conforme-o-uso sem custo antecipado |
| **Baseado em consumo** | Pague apenas pelo que realmente usa; medidores rastreiam o uso |
| **Serverless** | Abstração máxima — sem gerenciamento de servidor, pague por execução |
| **Reserved Instances** | Compromisso de 1-3 anos para descontos significativos (ainda é OpEx) |
| **Spot pricing** | Use capacidade ociosa do Azure com grandes descontos (pode ser removido) |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-03-q1',
      question: 'Uma empresa está considerando migrar para o Azure para evitar a compra de novos servidores. Qual benefício financeiro da computação em nuvem isso representa?',
      options: ['Mover de OpEx para CapEx', 'Mover de CapEx para OpEx', 'Eliminar todos os custos de TI', 'Reduzir CapEx enquanto aumenta OpEx proporcionalmente'],
      correctAnswer: 1,
      explanation: 'Migrar para a nuvem muda os gastos de CapEx (comprar servidores) para OpEx (pagar mensalmente por serviços em nuvem). Você troca grandes custos antecipados por despesas recorrentes menores.'
    },
    {
      id: 'az900-03-q2',
      question: 'Qual modelo de precificação significa que você só paga pelos recursos quando eles estão sendo usados?',
      options: ['Precificação reservada', 'Precificação baseada em consumo', 'Despesa de capital', 'Precificação de taxa fixa'],
      correctAnswer: 1,
      explanation: 'O modelo baseado em consumo significa que você paga pelos recursos apenas enquanto eles estão sendo usados. Quando você para de usá-los, para de pagar. Este é o modelo fundamental de precificação em nuvem.'
    },
    {
      id: 'az900-03-q3',
      question: 'Qual é uma característica da computação serverless?',
      options: ['Você gerencia os servidores subjacentes', 'Você paga uma taxa mensal fixa', 'Você paga apenas quando seu código executa', 'Requer capacidade reservada'],
      correctAnswer: 2,
      explanation: 'Na computação serverless (como Azure Functions), você é cobrado com base no número de execuções e no tempo que seu código roda. Quando seu código não está rodando, você não paga nada.'
    },
    {
      id: 'az900-03-q4',
      question: 'Qual ferramenta Azure ajuda a estimar a economia de custos ao migrar cargas de trabalho on-premises para o Azure?',
      options: ['Azure Pricing Calculator', 'Total Cost of Ownership (TCO) Calculator', 'Azure Cost Management', 'Azure Advisor'],
      correctAnswer: 1,
      explanation: 'A TCO Calculator ajuda especificamente a estimar economia de custos comparando custos de infraestrutura on-premises (incluindo hardware, software, eletricidade, mão de obra) com serviços Azure equivalentes ao longo do tempo.'
    },
    {
      id: 'az900-03-q5',
      question: 'Uma empresa implanta uma Azure Function que processa 500.000 requisições por mês. A cota gratuita cobre 1 milhão de execuções. Quanto eles pagarão pelas execuções?',
      options: ['Metade da taxa normal', 'Nada — está dentro da cota gratuita', 'Uma cobrança mínima mensal se aplica', 'Eles devem comprar um plano reservado'],
      correctAnswer: 1,
      explanation: 'Azure Functions inclui uma cota gratuita de 1 milhão de execuções por mês. Como 500.000 está abaixo desse limite, o custo de execução é $0. Este é o modelo baseado em consumo em ação.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Guia de Estudos AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo curados
- [Microsoft Learn: Descrever tipos de serviço em nuvem](https://learn.microsoft.com/en-us/training/modules/describe-cloud-service-types/)
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
- [TCO Calculator](https://azure.microsoft.com/pricing/tco/calculator/)
