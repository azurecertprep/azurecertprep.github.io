---
sidebar_position: 3
title: "Desafio 03: Padrões e Casos de Uso Comuns de IA"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 03: Padrões e Casos de Uso Comuns de IA

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Conceitos e Capacidades de IA (40-45%)
:::

## Habilidades do exame abordadas

- Identificar padrões comuns de IA: detecção de anomalias, previsão, classificação, mineração de conhecimento
- Mapear padrões de IA para casos de uso apropriados
- Entender como os padrões de IA se relacionam com os Azure AI services

## Visão Geral

IA não é mágica — ela segue **padrões** reconhecíveis para resolver problemas. Uma vez que você aprende a identificar esses padrões, pode associar qualquer cenário de negócio à abordagem de IA correta. Os quatro padrões mais comuns são: detecção de anomalias (encontrar o incomum), previsão (prever o futuro), classificação (organizar em categorias) e mineração de conhecimento (extrair insights de dados).

Pense nesses padrões como ferramentas em uma caixa de ferramentas. Um martelo (classificação) separa pregos por tipo. Um termômetro (previsão) prevê a temperatura de amanhã com base nos dados de hoje. Um detector de fumaça (detecção de anomalias) alerta quando algo incomum acontece. Uma lupa (mineração de conhecimento) encontra pistas ocultas em grandes pilhas de documentos.

O exame testa se você consegue reconhecer qual padrão se aplica a um determinado cenário de negócio. O tipo de dados e o resultado desejado sempre apontam para a resposta correta.

## Explorar

### Tarefa 1: Entender os quatro padrões comuns de IA

| Padrão | O que faz | Entrada → Saída | Azure Services |
|--------|-----------|-----------------|----------------|
| **Detecção de Anomalias** | Identifica pontos de dados incomuns que não se encaixam em padrões normais | Dados de série temporal → Alertas sobre outliers | Azure AI services (Anomaly Detection) / Azure Machine Learning |
| **Previsão (Regressão)** | Prevê valores numéricos com base em dados históricos | Dados históricos → Valores futuros | Azure Machine Learning |
| **Classificação** | Atribui categorias/rótulos aos dados | Dados → Rótulo de categoria | Azure Machine Learning, Azure AI Language |
| **Mineração de Conhecimento** | Extrai insights de grandes volumes de conteúdo não estruturado | Documentos/imagens → Insights estruturados | Azure AI Search (Cognitive Search) |

### Tarefa 2: Associar cenários a padrões

Pratique identificando qual padrão cada cenário usa:

| Cenário | Padrão | Por quê |
|---------|--------|---------|
| Um banco sinaliza transações incomuns de cartão de crédito | Detecção de Anomalias | Identificar transações que desviam dos padrões normais de gasto |
| Um e-commerce prevê a receita do próximo trimestre | Previsão | Prever um valor numérico (receita) a partir de dados históricos |
| Um sistema de e-mail marca mensagens como spam ou não spam | Classificação | Classificar e-mails em duas categorias (spam/não-spam) |
| Um escritório de advocacia busca em milhares de contratos cláusulas específicas | Mineração de Conhecimento | Extrair informações estruturadas de documentos não estruturados |
| Um sensor de fábrica detecta vibração incomum em máquinas | Detecção de Anomalias | Detectar desvios do comportamento normal da máquina |
| Um hospital prevê a probabilidade de readmissão de pacientes | Previsão | Prever uma probabilidade (valor numérico) com base em dados do paciente |

### Tarefa 3: Explorar Azure AI Search (Mineração de Conhecimento)

1. Visite a [documentação do Azure AI Search](https://learn.microsoft.com/en-us/azure/search/search-what-is-azure-search)
2. Entenda o pipeline de mineração de conhecimento:
   - **Ingestão** → Captura documentos, imagens e dados não estruturados
   - **Enriquecimento** → Aplica habilidades de IA (OCR, reconhecimento de entidades, extração de frases-chave)
   - **Exploração** → Pesquisa e analisa os dados enriquecidos e estruturados
3. É assim que organizações transformam milhares de PDFs em conhecimento pesquisável e estruturado

### Tarefa 4: Explorar conceitos do Azure AI Anomaly Detector

1. Revise a [documentação do Anomaly Detector](https://learn.microsoft.com/en-us/azure/ai-services/anomaly-detector/overview)
2. Conceitos-chave:
   - Funciona com **dados de série temporal** (valores ao longo do tempo)
   - Detecta picos, quedas e mudanças de tendência
   - Casos de uso: monitoramento de sensores IoT, fraude financeira, anomalias de tráfego web
3. Nota: O serviço standalone Anomaly Detector foi descontinuado em 2023. A detecção de anomalias multivariada permanece disponível através do Azure AI services, e o conceito ainda é cobrado no exame como um padrão

:::tip Estratégia para o exame
Quando o exame apresentar um cenário, pergunte:
- "É sobre encontrar algo **incomum**?" → Detecção de Anomalias
- "É sobre **prever um número**?" → Previsão/Regressão
- "É sobre **organizar em grupos**?" → Classificação
- "É sobre **encontrar informações** em grandes volumes de dados?" → Mineração de Conhecimento
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Detecção de Anomalias | Identificar pontos de dados que desviam significativamente dos padrões esperados |
| Previsão (Regressão) | Usar dados históricos para prever valores numéricos futuros |
| Classificação | Atribuir rótulos de categoria predefinidos a itens de dados |
| Mineração de Conhecimento | Usar IA para extrair informações estruturadas de grandes volumes de conteúdo não estruturado |
| Dados de série temporal | Pontos de dados coletados ao longo do tempo (ex: leituras de temperatura a cada hora) |
| Enriquecimento de IA | Adicionar metadados gerados por IA ao conteúdo (ex: extrair entidades de texto) |
| Habilidades cognitivas | Capacidades de IA pré-construídas usadas no Azure AI Search para enriquecer conteúdo |

## Conceitos Errôneos Comuns

| Conceito errôneo | Realidade |
|------------------|-----------|
| "Detecção de anomalias diz POR QUE algo é incomum" | Detecção de anomalias apenas sinaliza que algo É incomum. Determinar a causa requer investigação adicional ou IA complementar |
| "Classificação e previsão são a mesma coisa" | Classificação atribui uma categoria (spam/não-spam). Previsão calcula um valor numérico (R$500, 73%). O tipo de saída é a diferença-chave |
| "Mineração de conhecimento requer dados estruturados" | Mineração de conhecimento é projetada especificamente para dados NÃO estruturados — PDFs, imagens, e-mails. Ela transforma conteúdo não estruturado em informação estruturada e pesquisável |
| "Detecção de anomalias requer dados de treinamento rotulados" | Muitas abordagens de detecção de anomalias são não supervisionadas — aprendem como é o "normal" e sinalizam desvios sem precisar de exemplos rotulados de anomalias |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-03-q1',
      question: 'Uma empresa de manufatura monitora sensores de equipamentos e quer ser alertada quando as vibrações da máquina ficam fora das faixas normais de operação. Qual padrão de IA devem usar?',
      options: ['Classificação', 'Previsão', 'Detecção de Anomalias', 'Mineração de Conhecimento'],
      correctAnswer: 2,
      explanation: 'Detecção de Anomalias identifica pontos de dados que desviam de padrões normais. Detectar vibrações incomuns em dados de sensores de série temporal é um cenário clássico de detecção de anomalias.'
    },
    {
      id: 'ai900-03-q2',
      question: 'Uma imobiliária quer estimar o preço de venda de casas com base em características como metragem, localização e número de quartos. Qual padrão de IA se aplica?',
      options: ['Classificação', 'Previsão (Regressão)', 'Detecção de Anomalias', 'Mineração de Conhecimento'],
      correctAnswer: 1,
      explanation: 'Prever um valor numérico (preço de casa) com base em features de entrada é um padrão de previsão/regressão. A saída é um número contínuo, não uma categoria.'
    },
    {
      id: 'ai900-03-q3',
      question: 'Um escritório de advocacia tem 50.000 contratos e precisa pesquisar em todos eles para encontrar menções a cláusulas específicas de responsabilidade, extrair nomes das partes e identificar datas. Qual padrão é mais apropriado?',
      options: ['Classificação', 'Detecção de Anomalias', 'Previsão', 'Mineração de Conhecimento'],
      correctAnswer: 3,
      explanation: 'Mineração de Conhecimento extrai insights estruturados de grandes volumes de conteúdo não estruturado. Pesquisar documentos, extrair entidades (nomes, datas) e tornar conteúdo pesquisável é exatamente o que a mineração de conhecimento faz.'
    },
    {
      id: 'ai900-03-q4',
      question: 'Uma loja online quer categorizar automaticamente tickets de suporte ao cliente como "cobrança", "técnico" ou "consulta geral". Qual padrão de IA é esse?',
      options: ['Classificação', 'Mineração de Conhecimento', 'Detecção de Anomalias', 'Previsão'],
      correctAnswer: 0,
      explanation: 'Atribuir rótulos de categoria predefinidos (cobrança, técnico, geral) a itens de dados (tickets de suporte) é classificação. A IA classifica cada ticket em uma das categorias definidas.'
    },
    {
      id: 'ai900-03-q5',
      question: 'Qual padrão de IA trabalha com dados de série temporal para identificar picos ou quedas incomuns?',
      options: ['Classificação', 'Mineração de Conhecimento', 'Detecção de Anomalias', 'Previsão'],
      correctAnswer: 2,
      explanation: 'Detecção de Anomalias é especializada em análise de dados de série temporal — identificando pontos de dados que desviam de padrões esperados, incluindo picos, quedas ou mudanças de tendência inesperados.'
    }
  ]}
/>

## Saiba Mais

- [Microsoft Learn: Fundamentos de IA — Explorar detecção de anomalias](https://learn.microsoft.com/en-us/training/modules/get-started-ai-fundamentals/)
- [Documentação do Azure AI Search](https://learn.microsoft.com/en-us/azure/search/search-what-is-azure-search)
- [Acelerador de soluções de mineração de conhecimento](https://learn.microsoft.com/en-us/azure/search/cognitive-search-concept-intro)
- [Cenários do Azure Machine Learning](https://learn.microsoft.com/en-us/azure/machine-learning/concept-what-is-machine-learning)
