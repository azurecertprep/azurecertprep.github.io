---
sidebar_position: 2
title: "Challenge 06: Classificação em Machine Learning"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 06: Classificação em Machine Learning

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **Domínio**: Machine Learning no Azure (15-20%)
:::

## Habilidades do exame abordadas

- Identificar cenários de machine learning com classificação
- Descrever classificação binária vs classificação multiclasse
- Entender treinamento e avaliação de modelos de classificação
- Identificar métricas de avaliação apropriadas para classificação

## Visão Geral

Classificação é a técnica de machine learning usada para **prever uma categoria** (também chamada de classe ou rótulo). Sempre que a resposta para sua pergunta é "a qual grupo isso pertence?" — você está diante de um problema de classificação. Spam/não-spam, doença/saudável, gato/cachorro/pássaro — todos são classificação.

Pense na classificação como um classificador de correspondência nos correios. Cartas chegam, e o classificador coloca cada uma na caixa correta com base em features (CEP, tamanho, peso). O classificador aprendeu as regras vendo milhares de cartas previamente classificadas (dados de treinamento). Agora ele pode classificar novas cartas que nunca viu antes.

Existem dois tipos: **classificação binária** tem exatamente dois resultados possíveis (sim/não, verdadeiro/falso, spam/não-spam). **Classificação multiclasse** tem três ou mais resultados possíveis (gato/cachorro/pássaro, ou categorizar tickets de suporte em cobrança/técnico/frete/outros).

## Explorar

### Tarefa 1: Classificação binária vs multiclasse

| Tipo | Número de classes | Exemplos |
|------|-------------------|----------|
| **Binária** | Exatamente 2 | Spam ou não spam, fraude ou legítima, aprovado ou reprovado, sentimento positivo ou negativo |
| **Multiclasse** | 3 ou mais | Espécie animal (gato/cachorro/pássaro/peixe), categoria de produto, detecção de idioma, tipo de doença |

**Regra principal**: Se a saída é uma de DUAS categorias possíveis → binária. Se TRÊS ou mais → multiclasse.

### Tarefa 2: Identificar cenários de classificação

| Cenário | Tipo | Por quê |
|---------|------|---------|
| Esta transação de cartão de crédito é fraudulenta? | Binária | Dois resultados: fraude / não fraude |
| Em qual idioma este texto está escrito? | Multiclasse | Muitos idiomas possíveis |
| Este cliente vai cancelar (churn)? | Binária | Dois resultados: sim / não |
| Qual tipo de flor íris é esta? | Multiclasse | Três espécies: setosa, versicolor, virginica |
| Este raio-X mostra pneumonia? | Binária | Dois resultados: pneumonia / normal |
| Qual departamento deve tratar este ticket? | Multiclasse | Múltiplos departamentos (cobrança, técnico, frete...) |

### Tarefa 3: Explorar Automated ML para classificação

O Automated ML do Azure Machine Learning pode construir modelos de classificação com esforço mínimo:

1. Visite o [Azure Machine Learning Studio](https://ml.azure.com)
2. Revise o conceito de Automated ML:
   - Você fornece um dataset rotulado (features + categorias conhecidas)
   - O Automated ML testa múltiplos algoritmos e configurações
   - Ele retorna o modelo com melhor desempenho automaticamente
3. Para o exame, entenda estas capacidades do Automated ML:
   - **Proteções de dados**: Verifica automaticamente problemas de qualidade dos dados
   - **Seleção de algoritmo**: Testa múltiplos algoritmos (regressão logística, árvores de decisão, etc.)
   - **Ajuste de hiperparâmetros**: Otimiza configurações do modelo automaticamente
   - **Engenharia de features**: Pode criar novas features a partir de dados existentes

### Tarefa 4: Entender métricas de avaliação de classificação

| Métrica | O que mede | Explicação simples |
|---------|------------|-------------------|
| **Acurácia** | Correção geral | "Qual % das previsões estava correta?" |
| **Precisão** | Qualidade das previsões positivas | "Quando ele diz 'spam', com que frequência está certo?" |
| **Recall** | Completude da detecção positiva | "De todo spam real, qual % ele capturou?" |
| **F1 Score** | Equilíbrio entre precisão e recall | Média harmônica — útil quando classes são desbalanceadas |
| **AUC** | Capacidade do modelo de distinguir classes | 1,0 = perfeito, 0,5 = adivinhação aleatória |

**Exemplo**: Um filtro de spam com alta precisão mas baixo recall significa: quando ele marca algo como spam, geralmente está certo — mas ele perde muito spam real.

:::tip Insight para o exame
O exame adora perguntas sobre quando a acurácia sozinha é enganosa. Se 99% dos e-mails são legítimos e 1% são spam, um modelo que diz "não é spam" para tudo tem 99% de acurácia mas pega ZERO spam. É por isso que precisão, recall e AUC importam.
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Classificação | Técnica de ML que prevê a qual categoria/classe um item pertence |
| Classificação binária | Classificação com exatamente dois resultados possíveis |
| Classificação multiclasse | Classificação com três ou mais resultados possíveis |
| Regressão logística | Algoritmo comum para classificação binária (apesar do nome, ele classifica) |
| Matriz de confusão | Tabela mostrando verdadeiros positivos, verdadeiros negativos, falsos positivos e falsos negativos |
| Precisão | De todos os itens previstos como positivos, qual percentual realmente é positivo |
| Recall (Sensibilidade) | De todos os itens realmente positivos, qual percentual o modelo identificou corretamente |
| AUC (Área Sob a Curva) | Mede quão bem o modelo separa as classes (0,5 a 1,0) |

## Conceitos Errôneos Comuns

| Conceito errôneo | Realidade |
|------------------|-----------|
| "Classificação e regressão são intercambiáveis" | Classificação prevê categorias (spam/não-spam). Regressão prevê números (R$500, 73 graus). O tipo de saída determina qual técnica usar |
| "Classificação binária só pode retornar 'sim' ou 'não'" | Binária significa duas classes, mas podem ser qualquer coisa: spam/ham, maligno/benigno, aprovado/negado. São sempre exatamente dois resultados |
| "Regressão logística é uma técnica de regressão" | Apesar do nome, regressão logística é usada para classificação. Ela retorna uma probabilidade (0 a 1) que é então convertida em um rótulo de classe |
| "Maior acurácia sempre significa um modelo melhor" | Com datasets desbalanceados, acurácia é enganosa. Um modelo que prevê a classe majoritária sempre pode ter alta acurácia mas zero utilidade para detectar a classe minoritária |
| "Você precisa de milhares de exemplos para classificar" | Embora mais dados geralmente ajudem, a quantidade necessária depende da complexidade do problema. Alguns problemas funcionam bem com centenas de exemplos por classe |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-06-q1',
      question: 'Um hospital quer prever se um tumor é maligno ou benigno com base em medições celulares. Que tipo de problema de machine learning é esse?',
      options: ['Regressão', 'Classificação binária', 'Classificação multiclasse', 'Clustering'],
      correctAnswer: 1,
      explanation: 'Isso é classificação binária porque a previsão tem exatamente dois resultados possíveis: maligno ou benigno. O modelo atribui um de dois rótulos de categoria com base nas features de entrada.'
    },
    {
      id: 'ai900-06-q2',
      question: 'Um sistema de reconhecimento de imagem precisa identificar se uma foto contém um gato, cachorro, pássaro ou peixe. Que tipo de classificação é essa?',
      options: ['Classificação binária', 'Clustering', 'Regressão', 'Classificação multiclasse'],
      correctAnswer: 3,
      explanation: 'Isso é classificação multiclasse porque há mais de duas categorias possíveis (gato, cachorro, pássaro, peixe). Cada imagem recebe um dos múltiplos rótulos de classe.'
    },
    {
      id: 'ai900-06-q3',
      question: 'Um modelo de detecção de spam tem alta precisão mas baixo recall. O que isso significa na prática?',
      options: ['Quando ele marca algo como spam, geralmente está correto, mas perde muitos e-mails de spam reais', 'Ele pega todo spam mas também marca alguns e-mails legítimos', 'É muito rápido mas não muito preciso', 'Funciona bem nos dados de treinamento mas mal em dados novos'],
      correctAnswer: 0,
      explanation: 'Alta precisão significa que o modelo geralmente está correto quando prevê spam (poucos falsos positivos). Baixo recall significa que ele perde muitos e-mails de spam reais (muitos falsos negativos). É conservador — quando em dúvida, diz "não é spam."'
    },
    {
      id: 'ai900-06-q4',
      question: 'Qual capacidade do Azure Machine Learning tenta automaticamente múltiplos algoritmos e seleciona o melhor modelo de classificação?',
      options: ['Azure ML Designer', 'Azure ML Notebooks', 'Automated ML (AutoML)', 'Azure AI Language'],
      correctAnswer: 2,
      explanation: 'Automated ML (AutoML) testa automaticamente múltiplos algoritmos, ajusta hiperparâmetros e seleciona o modelo com melhor desempenho para seu dataset. Ele simplifica o processo de seleção de modelo.'
    },
    {
      id: 'ai900-06-q5',
      question: 'Qual é a diferença principal entre um problema de classificação e um problema de regressão?',
      options: ['Classificação usa dados rotulados; regressão não', 'Classificação prevê categorias; regressão prevê valores numéricos', 'Regressão é mais precisa que classificação', 'Classificação só funciona com imagens; regressão funciona com números'],
      correctAnswer: 1,
      explanation: 'A diferença fundamental é o tipo de saída. Classificação prevê uma categoria discreta (spam/não-spam, gato/cachorro/pássaro). Regressão prevê um valor numérico contínuo (preço, temperatura, duração).'
    }
  ]}
/>

## Saiba Mais

- [Microsoft Learn: Criar um modelo de classificação com Azure ML Designer](https://learn.microsoft.com/en-us/training/modules/create-classification-model-azure-machine-learning-designer/)
- [Classificação com Automated ML](https://learn.microsoft.com/en-us/azure/machine-learning/how-to-auto-train-classification)
- [Algoritmos de classificação no Azure ML](https://learn.microsoft.com/en-us/azure/machine-learning/algorithm-cheat-sheet)
