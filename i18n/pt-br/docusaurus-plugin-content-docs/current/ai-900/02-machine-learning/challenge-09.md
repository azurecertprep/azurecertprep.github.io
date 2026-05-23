---
sidebar_position: 5
title: "Challenge 09: Workspace do Azure Machine Learning"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 09: Workspace do Azure Machine Learning

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **Domínio**: Machine Learning no Azure (15-20%)
:::

## Habilidades do exame abordadas

- Descrever capacidades do Automated Machine Learning
- Descrever serviços de dados e computação para machine learning
- Descrever capacidades de gerenciamento e implantação de modelos no Azure ML

## Visão Geral

Azure Machine Learning (Azure ML) é uma plataforma em nuvem para construir, treinar e implantar modelos de machine learning. O **workspace** é o hub central — pense nele como seu laboratório de ML que contém todos os seus experimentos, dados, modelos e recursos de computação em um espaço organizado.

Pense no workspace do Azure ML como uma cozinha profissional. A cozinha (workspace) contém ingredientes (datasets), equipamentos de cozinha (computação), receitas (notebooks/pipelines), pratos prontos (modelos treinados) e um balcão de serviço (endpoints para implantação). Tudo que você precisa para todo o ciclo de vida do ML está em um só lugar.

O Azure ML suporta três abordagens principais: **Automated ML** (a plataforma constrói modelos para você), **Designer** (pipelines visuais drag-and-drop) e **Notebooks** (escrever código diretamente). Para o exame AI-900, foque em entender o que cada componente faz em vez de como programar com ele.

## Explorar

### Tarefa 1: Componentes do workspace do Azure ML

| Componente | Propósito | Analogia |
|------------|-----------|----------|
| **Workspace** | Contêiner de nível superior para todos os ativos de ML | O laboratório |
| **Datastores** | Conexões com armazenamento de dados (Blob, SQL, etc.) | Despensa de ingredientes |
| **Datasets** | Coleções registradas e versionadas de dados | Ingredientes preparados para receita |
| **Instâncias de computação** | VMs para desenvolvimento (notebooks) | Sua estação de trabalho pessoal |
| **Clusters de computação** | VMs escaláveis para jobs de treinamento | Fornos industriais |
| **Experimentos** | Registros de execuções de treinamento com métricas | Caderno de laboratório com resultados |
| **Modelos** | Modelos de ML treinados (registrados e versionados) | Receitas aperfeiçoadas |
| **Endpoints** | Modelos implantados servindo previsões | Balcão de atendimento do restaurante |
| **Pipelines** | Fluxos de trabalho automatizados (prep dados → treinar → implantar) | Linha de montagem |

### Tarefa 2: Navegar pelo Azure ML Studio

1. Visite [ml.azure.com](https://ml.azure.com) (Azure Machine Learning Studio)
2. Se você não tem um workspace, explore a interface conceitualmente:
   - **Menu esquerdo**: Autor (Notebooks, Automated ML, Designer) | Ativos (Dados, Jobs, Modelos, Endpoints) | Gerenciar (Computação)
3. Áreas-chave para entender para o exame:
   - **Automated ML**: Faça upload de dados → escolha coluna-alvo → Azure constrói o melhor modelo
   - **Designer**: Construtor visual de pipelines drag-and-drop
   - **Modelos**: Registro de todos os modelos treinados com versões
   - **Endpoints**: Onde modelos implantados servem previsões

### Tarefa 3: Entender capacidades do Automated ML

Automated ML (AutoML) automatiza as partes mais demoradas do machine learning:

| Etapa | O que o AutoML faz automaticamente |
|-------|-------------------------------------|
| **Seleção de algoritmo** | Testa múltiplos algoritmos (regressão logística, árvores de decisão, gradient boosting, etc.) |
| **Ajuste de hiperparâmetros** | Encontra as melhores configurações para cada algoritmo |
| **Engenharia de features** | Cria e seleciona as features mais úteis |
| **Avaliação de modelo** | Compara todos os modelos usando métricas apropriadas |
| **Seleção do melhor modelo** | Retorna o modelo com melhor desempenho |

**AutoML suporta três tipos de tarefa**:
- **Classificação** — prever categorias
- **Regressão** — prever números
- **Previsão de séries temporais** — prever valores futuros ao longo do tempo

### Tarefa 4: Implantação de modelos e endpoints

Uma vez que um modelo é treinado, ele precisa ser implantado para que aplicações possam usá-lo:

| Tipo de implantação | Caso de uso | Como funciona |
|---------------------|-------------|---------------|
| **Endpoint em tempo real** | Previsões imediatas | Aplicação envia dados, recebe previsão instantaneamente (API REST) |
| **Endpoint batch** | Processar grandes datasets | Envie um dataset, receba previsões depois (assíncrono) |

**Fluxo de implantação**:
1. **Registrar** o modelo no Registro de Modelos
2. **Criar** um endpoint (tempo real ou batch)
3. **Implantar** o modelo no endpoint
4. **Testar** enviando dados e recebendo previsões
5. **Monitorar** desempenho e drift de dados ao longo do tempo

:::tip Alternativa via Azure CLI
```bash
# List Azure ML workspaces in your subscription
az ml workspace list --output table

# List compute instances in a workspace
az ml compute list --workspace-name my-workspace --resource-group my-rg --output table

# List registered models
az ml model list --workspace-name my-workspace --resource-group my-rg --output table
```
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Workspace do Azure ML | Hub central contendo todos os recursos de ML: dados, computação, modelos, endpoints |
| Automated ML (AutoML) | Recurso que treina e compara automaticamente múltiplos modelos, selecionando o melhor |
| Instância de computação | VM única para desenvolvimento e testes (notebooks) |
| Cluster de computação | Grupo escalável de VMs que cresce/diminui conforme a demanda dos jobs de treinamento |
| Registro de modelos | Catálogo versionado de modelos treinados para rastreamento e implantação |
| Endpoint em tempo real | Modelo implantado que retorna previsões imediatamente via API REST |
| Endpoint batch | Modelo implantado que processa grandes datasets de forma assíncrona |
| Pipeline de ML | Fluxo de trabalho automatizado e repetível para todo o processo de ML |
| Designer | Ferramenta visual drag-and-drop para construir pipelines de ML sem código |

## Conceitos Errôneos Comuns

| Conceito errôneo | Realidade |
|------------------|-----------|
| "Você precisa saber programar para usar Azure ML" | O Azure ML Designer fornece uma experiência visual drag-and-drop, e o Automated ML constrói modelos com configuração mínima. Código (Python) é opcional |
| "Automated ML produz modelos prontos para produção toda vez" | Automated ML dá um ótimo ponto de partida, mas implantação em produção frequentemente requer avaliação, testes e monitoramento adicionais |
| "Uma instância de computação é necessária para implantar um modelo" | Instâncias de computação são para desenvolvimento. Modelos implantados rodam em endpoints gerenciados — infraestrutura separada otimizada para servir previsões |
| "Uma vez implantado, um modelo nunca precisa de atualização" | Modelos degradam ao longo do tempo conforme dados do mundo real mudam (concept drift / data drift). Monitoramento e retreinamento são necessidades contínuas |
| "Azure ML e Azure AI services são a mesma coisa" | Azure AI services fornecem APIs de IA pré-construídas e prontas para uso. Azure ML é para construir seus PRÓPRIOS modelos customizados a partir dos seus dados |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-09-q1',
      question: 'Um cientista de dados quer que o Azure tente automaticamente múltiplos algoritmos e selecione o modelo com melhor desempenho para seu dataset. Qual recurso do Azure ML deve usar?',
      options: ['Azure ML Designer', 'Automated ML', 'Azure ML Notebooks', 'Azure AI services'],
      correctAnswer: 1,
      explanation: 'Automated ML (AutoML) testa automaticamente múltiplos algoritmos, ajusta hiperparâmetros e seleciona o melhor modelo. Ele automatiza as partes mais demoradas do processo de seleção de modelos de ML.'
    },
    {
      id: 'ai900-09-q2',
      question: 'Qual é o propósito de um endpoint em tempo real no Azure Machine Learning?',
      options: ['Armazenar dados de treinamento', 'Treinar o modelo mais rápido', 'Servir previsões imediatas via API REST quando aplicações enviam dados', 'Monitorar o desempenho do modelo'],
      correctAnswer: 2,
      explanation: 'Um endpoint em tempo real implanta um modelo treinado como uma API REST que aplicações podem chamar. Quando dados são enviados ao endpoint, ele retorna previsões imediatamente — habilitando inferência em tempo real nas aplicações.'
    },
    {
      id: 'ai900-09-q3',
      question: 'Qual componente do Azure ML fornece uma experiência visual, drag-and-drop para construir pipelines de machine learning?',
      options: ['Designer', 'Automated ML', 'Notebooks', 'Clusters de computação'],
      correctAnswer: 0,
      explanation: 'O Azure ML Designer fornece uma tela visual onde você arrasta e solta componentes (módulos de dados, algoritmos, etapas de avaliação) para construir pipelines de ML sem escrever código.'
    },
    {
      id: 'ai900-09-q4',
      question: 'Qual é a diferença entre uma instância de computação e um cluster de computação no Azure ML?',
      options: ['Instâncias de computação são gratuitas; clusters custam dinheiro', 'Instâncias de computação são para implantação; clusters são para treinamento', 'Não há diferença — são a mesma coisa', 'Instâncias de computação são para desenvolvimento; clusters escalam para jobs de treinamento'],
      correctAnswer: 3,
      explanation: 'Uma instância de computação é uma VM única para trabalho individual de desenvolvimento (executar notebooks, explorar dados). Um cluster de computação é um grupo escalável de VMs que automaticamente cresce e diminui conforme a demanda dos jobs de treinamento.'
    },
    {
      id: 'ai900-09-q5',
      question: 'Qual é a diferença principal entre Azure Machine Learning e Azure AI services?',
      options: ['Azure ML é gratuito; AI services são pagos', 'Azure ML permite construir modelos customizados; AI services fornecem APIs de IA pré-construídas e prontas para uso', 'AI services são mais precisos que Azure ML', 'Azure ML só funciona com Python; AI services funcionam com qualquer linguagem'],
      correctAnswer: 1,
      explanation: 'Azure ML é uma plataforma para construir, treinar e implantar seus PRÓPRIOS modelos customizados a partir dos seus dados. Azure AI services fornecem APIs de IA pré-construídas e prontas para uso (Vision, Language, Speech) que funcionam imediatamente sem treinamento customizado.'
    }
  ]}
/>

## Saiba Mais

- [Microsoft Learn: Fundamentos do Azure Machine Learning](https://learn.microsoft.com/en-us/training/modules/use-automated-machine-learning/)
- [Documentação do workspace do Azure ML](https://learn.microsoft.com/en-us/azure/machine-learning/concept-workspace)
- [Documentação do Automated ML](https://learn.microsoft.com/en-us/azure/machine-learning/concept-automated-ml)
- [Implantar modelos com Azure ML](https://learn.microsoft.com/en-us/azure/machine-learning/concept-endpoints)
