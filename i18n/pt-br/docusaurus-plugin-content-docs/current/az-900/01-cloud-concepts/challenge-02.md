---
sidebar_position: 2
title: "Desafio 02: Benefícios dos Serviços em Nuvem"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 02: Benefícios dos Serviços em Nuvem

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Conceitos de Nuvem (25-30%)
:::

## Habilidades do exame cobertas

- Descrever os benefícios da alta disponibilidade
- Descrever os benefícios da escalabilidade
- Descrever os benefícios da elasticidade
- Descrever os benefícios da confiabilidade
- Descrever os benefícios da previsibilidade
- Descrever os benefícios de segurança e governança na nuvem
- Descrever os benefícios da capacidade de gerenciamento na nuvem

## Visão Geral

Por que as organizações migram para a nuvem? Não é apenas para economizar dinheiro — é para ganhar capacidades que são difíceis ou impossíveis de alcançar com infraestrutura on-premises.

O Azure fornece Service Level Agreements (SLAs) que garantem disponibilidade. Os serviços são projetados para sobreviver a falhas por meio de redundância. Os recursos podem escalar automaticamente com base na demanda. E tudo pode ser gerenciado por código, APIs e automação.

## Explorar

### Tarefa 1: Entender alta disponibilidade e SLAs

1. Acesse [azure.microsoft.com/support/legal/sla](https://azure.microsoft.com/support/legal/sla/)
2. Pesquise por **Virtual Machines** — observe o percentual de SLA
3. Pesquise por **App Service** — compare o SLA
4. Pesquise por **Azure SQL Database** — observe o SLA mais alto

**Referência de SLA:**

| SLA % | Tempo de inatividade por mês | Tempo de inatividade por ano |
|-------|------------------------------|------------------------------|
| 99% | 7.2 horas | 3.65 dias |
| 99.9% | 43.8 minutos | 8.76 horas |
| 99.95% | 21.9 minutos | 4.38 horas |
| 99.99% | 4.38 minutos | 52.56 minutos |

### Tarefa 2: Entender tipos de escalabilidade

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| **Escala vertical (scale up/down)** | Aumentar/diminuir o poder de um recurso existente | Mudar uma VM de 2 CPU para 8 CPU |
| **Escala horizontal (scale out/in)** | Adicionar/remover instâncias de um recurso | Ir de 1 servidor web para 5 servidores web |

**Sua tarefa**: Para cada cenário, identifique o tipo de escala:
- Um site recebe 10x mais tráfego na Black Friday → *Scale out*
- Um banco de dados precisa de mais RAM para consultas complexas → *Scale up*
- O tráfego retorna ao normal após o feriado → *Scale in*

### Tarefa 3: Explorar conceitos de confiabilidade

1. No Portal Azure, pesquise por **Service Health**
2. Clique em **Service Health** nos resultados
3. Explore a aba **Service issues** — veja incidentes atuais do Azure
4. Clique em **Health history** — veja problemas passados e como o Azure se recuperou
5. Isso demonstra a transparência do Azure sobre confiabilidade

### Tarefa 4: Explorar governança e capacidade de gerenciamento

1. No Portal Azure, pesquise por **Policy**
2. Clique em **Azure Policy**
3. Navegue pela aba **Definitions**
4. Observe categorias como "Compute", "Storage", "Network"
5. Essas políticas integradas ajudam a aplicar governança automaticamente

:::tip Alternativa Azure CLI
```bash
# List available Azure Policy definitions (first 10)
az policy definition list --query "[0:10].{Name:displayName, Category:metadata.category}" --output table

# Check service health
az monitor activity-log list --resource-provider "Microsoft.ResourceHealth" --output table
```
:::

## Conceitos-Chave

| Benefício | Descrição |
|-----------|-----------|
| **Alta disponibilidade** | Sistemas permanecem operacionais com tempo de inatividade mínimo (medido por SLA) |
| **Escalabilidade** | Capacidade de lidar com demanda aumentada adicionando recursos |
| **Elasticidade** | Escala automática — recursos expandem e contraem com a demanda |
| **Confiabilidade** | Capacidade de se recuperar de falhas e continuar funcionando |
| **Previsibilidade** | Confiança em desempenho consistente e previsão de custos |
| **Segurança** | Provedores de nuvem investem bilhões em infraestrutura de segurança |
| **Governança** | Políticas e padrões podem ser aplicados automaticamente |
| **Capacidade de gerenciamento** | Recursos gerenciados via portal, CLI, APIs, templates |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-02-q1',
      question: 'Um serviço Azure tem um SLA de 99.9%. Qual é o tempo máximo de inatividade aceitável por mês?',
      options: ['4.38 minutos', '43.8 minutos', '7.2 horas', '8.76 horas'],
      correctAnswer: 1,
      explanation: 'SLA de 99.9% significa que 0.1% do mês pode ser tempo de inatividade. Um mês tem ~43.800 minutos, então 0.1% = ~43.8 minutos de inatividade aceitável por mês.'
    },
    {
      id: 'az900-02-q2',
      question: 'Uma empresa precisa adicionar mais instâncias de servidor web durante horários de pico e removê-las fora do horário de pico. Qual benefício da nuvem isso descreve?',
      options: ['Alta disponibilidade', 'Elasticidade', 'Confiabilidade', 'Governança'],
      correctAnswer: 1,
      explanation: 'Elasticidade é a capacidade de escalar recursos automaticamente para cima ou para baixo com base na demanda. Adicionar instâncias no pico e remover fora dele é escala elástica.'
    },
    {
      id: 'az900-02-q3',
      question: 'Qual é a diferença entre escala vertical e escala horizontal?',
      options: ['Vertical adiciona mais instâncias; horizontal aumenta o tamanho da instância', 'Vertical aumenta o tamanho da instância; horizontal adiciona mais instâncias', 'São a mesma coisa', 'Vertical é para armazenamento; horizontal é para computação'],
      correctAnswer: 1,
      explanation: 'Escala vertical (scale up) aumenta o tamanho/poder de um recurso existente. Escala horizontal (scale out) adiciona mais instâncias de um recurso.'
    },
    {
      id: 'az900-02-q4',
      question: 'Qual benefício da computação em nuvem permite prever custos futuros com base nos padrões de uso atuais?',
      options: ['Escalabilidade', 'Confiabilidade', 'Previsibilidade', 'Elasticidade'],
      correctAnswer: 2,
      explanation: 'A previsibilidade na nuvem cobre tanto a previsibilidade de desempenho (experiência consistente) quanto a previsibilidade de custos (previsão de gastos com base nos padrões de uso).'
    },
    {
      id: 'az900-02-q5',
      question: 'Uma empresa implanta aplicações em múltiplas regiões Azure para que, se uma região falhar, outra possa assumir. Qual benefício da nuvem isso demonstra?',
      options: ['Escalabilidade', 'Elasticidade', 'Confiabilidade', 'Governança'],
      correctAnswer: 2,
      explanation: 'Confiabilidade é a capacidade de um sistema se recuperar de falhas e continuar funcionando. Implantar em múltiplas regiões garante que a aplicação sobreviva a interrupções regionais.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Guia de Estudos AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo curados
- [Microsoft Learn: Descrever benefícios dos serviços em nuvem](https://learn.microsoft.com/en-us/training/modules/describe-benefits-use-cloud-services/)
- [Resumo de SLA do Azure](https://azure.microsoft.com/support/legal/sla/summary/)
