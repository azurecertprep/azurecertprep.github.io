---
sidebar_position: 3
title: "Desafio 07: Clustering em Machine Learning"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 07: Clustering em Machine Learning

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Conceitos e Capacidades de IA (40-45%)
:::

## Habilidades do exame abordadas

- Identificar cenários de machine learning com clustering
- Descrever como clustering difere de classificação
- Entender conceitos de aprendizado não supervisionado
- Identificar casos de uso apropriados para clustering

## Visão Geral

Clustering é a técnica de machine learning usada para **agrupar itens similares** quando você não tem categorias predefinidas. Diferente da classificação (onde você conhece as categorias antecipadamente — spam/não-spam), o clustering descobre agrupamentos naturais nos dados por conta própria.

Pense no clustering como organizar uma gaveta bagunçada. Você despeja 100 itens e começa a agrupar coisas que parecem similares: canetas ficam juntas, pilhas ficam juntas, cabos ficam juntos. Ninguém disse essas categorias antecipadamente — você as descobriu observando similaridades. Isso é clustering.

A distinção crítica: classificação é **aprendizado supervisionado** (você fornece exemplos rotulados), enquanto clustering é **aprendizado não supervisionado** (nenhum rótulo necessário). Clustering encontra padrões e agrupamentos que você talvez não soubesse que existiam.

## Explorar

### Tarefa 1: Classificação vs Clustering

Entender a diferença é um dos conceitos mais cobrados:

| Aspecto | Classificação | Clustering |
|---------|--------------|------------|
| **Tipo de aprendizado** | Supervisionado | Não supervisionado |
| **Rótulos necessários?** | Sim — dados de treinamento têm categorias conhecidas | Não — nenhum rótulo necessário |
| **Categorias** | Predefinidas (você especifica) | Descobertas (o algoritmo encontra) |
| **Objetivo** | Atribuir itens a grupos CONHECIDOS | Descobrir grupos DESCONHECIDOS |
| **Exemplo** | "Este e-mail é spam" (rótulo conhecido) | "Estes clientes se comportam de forma similar" (grupos descobertos) |

### Tarefa 2: Identificar cenários de clustering

| Cenário | Por que é clustering |
|---------|---------------------|
| **Segmentação de clientes** | Agrupar clientes por comportamento de compra para descobrir segmentos que você não sabia que existiam |
| **Agrupamento de documentos** | Organizar artigos por tópicos sem categorias predefinidas |
| **Detecção de anomalias** | Itens que não se encaixam em nenhum cluster podem ser outliers |
| **Análise de expressão gênica** | Agrupar genes com padrões de expressão similares |
| **Compressão de imagem** | Agrupar cores similares para reduzir o número de cores únicas |

**NÃO é clustering** (estes são classificação):
- Classificar e-mails em spam/não-spam (rótulos são conhecidos)
- Diagnosticar uma doença como Tipo A, B ou C (categorias predefinidas por médicos)
- Atribuir notas a redações de alunos como A/B/C/D/F (notas são predeterminadas)

### Tarefa 3: Entender K-Means clustering

K-Means é o algoritmo de clustering mais comum e o referenciado no exame:

1. **Escolha K** — decida quantos clusters você quer (ex: K=3 para 3 grupos)
2. **Inicialize** — posicione K pontos centrais aleatórios (centroides)
3. **Atribua** — cada ponto de dados se junta ao cluster do centroide mais próximo
4. **Atualize** — mova cada centroide para o centro de seus pontos atribuídos
5. **Repita** — continue atribuindo e atualizando até os clusters se estabilizarem

**Decisões-chave**:
- **Quantos clusters (K)?** — Não há resposta perfeita. Você tenta diferentes valores e avalia qual faz mais sentido para o negócio
- **Quais features usar?** — As features que você inclui determinam o que "similar" significa

### Tarefa 4: Clustering no Azure Machine Learning

No Azure ML, você pode construir modelos de clustering usando:

1. **Azure ML Designer** — pipeline de clustering drag-and-drop
   - Use o módulo "K-Means Clustering"
   - Conecte a um dataset (nenhuma coluna de label necessária!)
   - Configure o número de clusters
   - Avalie resultados com métricas como silhouette score

2. **Métricas-chave para clustering**:
   - **Silhouette score**: Mede quão similares os itens são ao seu próprio cluster vs. outros clusters (-1 a 1, maior é melhor)
   - **Inércia**: Soma das distâncias dos pontos até o centro de seu cluster (menor é melhor)

:::tip Estratégia para o exame
O gatilho do exame para clustering: **"Sem rótulos"** ou **"descobrir grupos"** ou **"segmentar clientes"**. Se o cenário diz "não sabemos as categorias ainda" ou "encontrar agrupamentos naturais" → clustering. Se as categorias já são conhecidas → classificação.
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Clustering | Técnica de ML não supervisionada que agrupa pontos de dados similares |
| Aprendizado não supervisionado | Abordagem de ML que encontra padrões sem dados de treinamento rotulados |
| Aprendizado supervisionado | Abordagem de ML que usa dados de treinamento rotulados (classificação, regressão) |
| K-Means | Algoritmo de clustering popular que divide dados em K grupos baseado na distância aos centroides |
| Centroide | O ponto central de um cluster |
| K (número de clusters) | Um parâmetro que você escolhe — quantos grupos o algoritmo deve criar |
| Silhouette score | Métrica que mede quão bem separados os clusters estão (-1 a 1) |
| Segmentação de clientes | Caso de uso comum: agrupar clientes por comportamento para descobrir segmentos de mercado |

## Conceitos Errôneos Comuns

| Conceito errôneo | Realidade |
|------------------|-----------|
| "Clustering e classificação são a mesma coisa" | Classificação atribui itens a categorias CONHECIDAS usando dados rotulados. Clustering DESCOBRE grupos desconhecidos sem rótulos. A presença ou ausência de rótulos predefinidos é a diferença-chave |
| "Clustering diz o que cada grupo significa" | Clustering encontra grupos de itens similares, mas interpretar o que cada grupo representa é uma tarefa humana. O algoritmo diz "esses itens são similares" — você decide o significado |
| "Você deve saber o número de clusters de antemão" | Embora K-Means exija que você especifique K, tipicamente você testa múltiplos valores e usa métricas (silhouette score) ou lógica de negócio para escolher o melhor número |
| "Clustering requer grandes datasets" | Clustering pode funcionar com datasets menores, embora a qualidade dos grupos descobertos melhore com mais dados. Até mesmo algumas centenas de pontos podem formar clusters significativos |
| "Não supervisionado significa sem envolvimento humano" | Não supervisionado significa sem rótulos nos dados. Humanos ainda escolhem features, definem parâmetros (como K), interpretam resultados e validam que os clusters são significativos |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-07-q1',
      question: 'Uma equipe de marketing quer agrupar seus clientes em segmentos com base em comportamento de compra, mas não tem categorias predefinidas de clientes. Qual técnica de ML devem usar?',
      options: ['Regressão', 'Classificação', 'Detecção de anomalias', 'Clustering'],
      correctAnswer: 3,
      explanation: 'Clustering agrupa itens similares sem categorias predefinidas. Como a equipe de marketing quer DESCOBRIR segmentos de clientes (não atribuir a categorias conhecidas), clustering é a abordagem correta.'
    },
    {
      id: 'ai900-07-q2',
      question: 'Qual é a diferença PRINCIPAL entre clustering e classificação?',
      options: ['Clustering é mais rápido que classificação', 'Classificação requer dados de treinamento rotulados; clustering não', 'Clustering é mais preciso que classificação', 'Classificação só funciona com dados de texto'],
      correctAnswer: 1,
      explanation: 'Classificação é aprendizado supervisionado — requer dados de treinamento rotulados com categorias conhecidas. Clustering é não supervisionado — descobre agrupamentos naturais sem precisar de rótulos. Esta é a distinção fundamental.'
    },
    {
      id: 'ai900-07-q3',
      question: 'Em K-Means clustering, o que "K" representa?',
      options: ['O número de features no dataset', 'O número de pontos de dados', 'O número de clusters a criar', 'O limiar de precisão'],
      correctAnswer: 2,
      explanation: 'K representa o número de clusters que o algoritmo vai criar. Você especifica K como um parâmetro, e o algoritmo divide os dados em exatamente K grupos baseado em similaridade.'
    },
    {
      id: 'ai900-07-q4',
      question: 'Qual das seguintes NÃO é um cenário de clustering?',
      options: ['Prever se um e-mail é spam ou não spam', 'Agrupar artigos de notícias similares por tópico', 'Segmentar clientes por comportamento de compras', 'Descobrir grupos de genes similares'],
      correctAnswer: 0,
      explanation: 'Prever spam/não-spam é classificação — as categorias (spam, não-spam) são predefinidas, e você treina com exemplos rotulados. Todas as outras opções descobrem agrupamentos desconhecidos sem rótulos predefinidos.'
    },
    {
      id: 'ai900-07-q5',
      question: 'Um algoritmo de clustering agrupa dados com base em similaridade. Quem determina o que os grupos descobertos SIGNIFICAM ou representam?',
      options: ['O algoritmo nomeia cada grupo automaticamente', 'Azure AI atribui rótulos de negócio', 'Humanos interpretam e atribuem significado aos clusters', 'Os dados de treinamento fornecem os nomes dos grupos'],
      correctAnswer: 2,
      explanation: 'Algoritmos de clustering encontram grupos de itens similares mas não interpretam seu significado. Humanos devem analisar as características de cada cluster e atribuir significado de negócio (ex: "estes são compradores econômicos" ou "estes são clientes premium").'
    }
  ]}
/>

## Saiba Mais

- [Microsoft Learn: Criar um modelo de clustering com Azure ML Designer](https://learn.microsoft.com/en-us/training/modules/create-clustering-model-azure-machine-learning-designer/)
- [K-Means clustering no Azure ML](https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/k-means-clustering)
- [Aprendizado supervisionado vs não supervisionado](https://learn.microsoft.com/en-us/azure/machine-learning/concept-what-is-machine-learning)
