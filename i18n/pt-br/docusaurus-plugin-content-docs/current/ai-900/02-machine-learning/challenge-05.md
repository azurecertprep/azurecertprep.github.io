---
sidebar_position: 1
title: "Desafio 05: Regressão em Machine Learning"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 05: Regressão em Machine Learning

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **Domínio**: Machine Learning no Azure (15-20%)
:::

## Habilidades do exame abordadas

- Identificar cenários de machine learning com regressão
- Descrever como dados de treinamento são usados em regressão
- Identificar features e labels em um dataset
- Entender métricas de avaliação de modelo para regressão

## Visão Geral

Regressão é a técnica de machine learning usada para **prever um valor numérico**. Sempre que a resposta para sua pergunta é um número — um preço, uma temperatura, uma duração, uma quantidade — você está diante de um problema de regressão.

Pense na regressão como traçar a melhor linha de ajuste através de um gráfico de dispersão de pontos de dados. Se você plotar o tamanho de casas em um eixo e seus preços no outro, a regressão encontra o padrão (linha ou curva) que permite prever o preço de uma nova casa com base em seu tamanho. O modelo aprende: "para cada 10 metros quadrados a mais, o preço aumenta em aproximadamente R$X."

O vocabulário-chave: **features** são os dados de entrada (metragem, número de quartos, localização), e a **label** é o que você está prevendo (o preço). **Dados de treinamento** são exemplos históricos onde tanto as features QUANTO a label são conhecidas — o modelo aprende a relação entre elas.

## Explorar

### Tarefa 1: Entender a terminologia de regressão

| Termo | Definição | Exemplo (prevendo preço de casa) |
|-------|-----------|----------------------------------|
| **Features** | Variáveis de entrada usadas para previsão | Metragem, quartos, CEP, ano de construção |
| **Label** | O valor sendo previsto (saída) | Preço de venda (R$) |
| **Dados de treinamento** | Exemplos históricos com features E labels conhecidas | Vendas anteriores de casas com todos os detalhes |
| **Modelo** | A relação matemática aprendida dos dados de treinamento | "Preço = R$5.000 × m² + R$50.000 × quartos + ..." |
| **Previsão** | A saída do modelo para novos dados não vistos | Preço estimado para uma casa ainda não vendida |

### Tarefa 2: Identificar cenários de regressão

Quais destes são problemas de regressão? (Resposta: todos os que preveem um NÚMERO)

| Cenário | Regressão? | Por quê |
|---------|------------|---------|
| Prever a temperatura máxima de amanhã | ✅ Sim | Saída é um valor numérico (graus) |
| Prever a nota de um aluno na prova | ✅ Sim | Saída é um número (0-100) |
| Determinar se um e-mail é spam | ❌ Não | Saída é uma categoria (spam/não-spam) — isso é classificação |
| Prever quanto tempo uma entrega vai demorar | ✅ Sim | Saída é um número (minutos/horas) |
| Classificar fotos como "gato" ou "cachorro" | ❌ Não | Saída é uma categoria — classificação |
| Estimar a eficiência de combustível de um carro (km/l) | ✅ Sim | Saída é um valor numérico (quilômetros por litro) |

### Tarefa 3: Explorar amostra de regressão no Azure ML Designer

1. Visite o [Azure Machine Learning Studio](https://ml.azure.com)
2. Se você não tem um workspace, revise este pipeline de exemplo conceitualmente:
   - **Dataset**: Dados de preço de automóveis (features: marca, estilo de carroceria, tamanho do motor, potência, etc.)
   - **Algoritmo**: Regressão Linear
   - **Objetivo**: Prever o preço de um carro com base em suas features
3. O Designer fornece uma experiência drag-and-drop para construir pipelines de ML sem código
4. Pipelines de exemplo demonstram regressão com datasets reais

### Tarefa 4: Entender métricas de avaliação de regressão

Após treinar um modelo de regressão, você avalia quão boas são suas previsões:

| Métrica | O que mede | Valor bom |
|---------|------------|-----------|
| **MAE** (Erro Médio Absoluto) | Diferença média entre valores previstos e reais | Menor é melhor |
| **RMSE** (Raiz do Erro Quadrático Médio) | Erro médio, penalizando erros grandes mais severamente | Menor é melhor |
| **R² (R-quadrado)** | Quanto da variação o modelo explica | Mais próximo de 1,0 é melhor |

**Exemplo**: Se um modelo prevê preços de casas com MAE de R$15.000, significa que, em média, as previsões erram em R$15.000 do preço real.

:::tip Estratégia para o exame
O exame testa se você consegue IDENTIFICAR cenários de regressão, não se consegue calcular métricas. A pergunta-chave: **"A saída é um número?"** Se sim → regressão. Se é uma categoria → classificação.
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Regressão | Técnica de ML que prevê um valor numérico contínuo |
| Features | Variáveis de entrada (preditores) usadas pelo modelo |
| Label | O valor-alvo sendo previsto |
| Dados de treinamento | Dados históricos com features e labels conhecidas usados para treinar o modelo |
| Regressão linear | Regressão mais simples — encontra uma relação em linha reta entre features e label |
| Erro Médio Absoluto (MAE) | Magnitude média dos erros nas previsões |
| R-quadrado (R²) | Proporção da variância na label explicada pelo modelo (0 a 1) |
| Overfitting | Modelo memoriza dados de treinamento em vez de aprender padrões gerais |

## Conceitos Errôneos Comuns

| Conceito errôneo | Realidade |
|------------------|-----------|
| "Regressão significa que os dados diminuem (regridem)" | Em ML, regressão significa prever um valor numérico. O termo vem da estatística ("regressão à média") — não tem nada a ver com tendências de queda |
| "Regressão só pode prever valores futuros" | Regressão prevê qualquer valor numérico — passado, presente ou futuro. Prever a idade de um fóssil ou o preço de uma pintura são ambos regressão |
| "Mais features sempre fazem um modelo melhor" | Features irrelevantes adicionam ruído e podem piorar as previsões. Seleção de features — escolher as entradas CERTAS — é crucial |
| "Regressão linear só pode modelar linhas retas" | Regressão linear modela relações em linha reta. Mas o Azure ML oferece muitos algoritmos de regressão (árvores de decisão, redes neurais) que podem modelar curvas complexas |
| "Um R² alto sempre significa que o modelo é bom" | Um R² muito alto nos dados de treinamento pode indicar overfitting — o modelo memorizou os dados de treinamento mas não generalizará para novos dados |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-05-q1',
      question: 'Uma empresa quer prever quantas unidades de um produto venderá no próximo mês com base em dados históricos de vendas, investimento em publicidade e tendências sazonais. Que tipo de problema de ML é esse?',
      options: ['Classificação', 'Clustering', 'Regressão', 'Detecção de anomalias'],
      correctAnswer: 2,
      explanation: 'Prever "quantas unidades" é prever um valor numérico, que é regressão. As features (histórico, investimento em publicidade, sazonalidade) são usadas para prever um número contínuo (unidades vendidas).'
    },
    {
      id: 'ai900-05-q2',
      question: 'Em um dataset usado para prever preços de casas, qual dos seguintes seria a LABEL?',
      options: ['Número de quartos', 'Metragem', 'Preço de venda', 'Ano de construção'],
      correctAnswer: 2,
      explanation: 'A label é o que você está prevendo — neste caso, o preço de venda. Número de quartos, metragem e ano de construção são features (entradas) usadas para prever o preço (label/saída).'
    },
    {
      id: 'ai900-05-q3',
      question: 'Um modelo de regressão tem um valor de R-quadrado de 0,92. O que isso indica?',
      options: ['O modelo tem 92% de precisão', 'O modelo explica 92% da variação nos valores previstos', 'O modelo tem 92% de chance de estar correto', 'O modelo leva 0,92 segundos para executar'],
      correctAnswer: 1,
      explanation: 'R-quadrado (R²) mede a proporção da variância na label que é explicada pelo modelo. Um valor de 0,92 significa que o modelo explica 92% da variação na variável-alvo.'
    },
    {
      id: 'ai900-05-q4',
      question: 'Qual cenário NÃO é um problema de regressão?',
      options: ['Prever a temperatura ao meio-dia amanhã', 'Estimar o tempo para concluir um projeto', 'Determinar se um paciente tem uma doença ou não', 'Prever receita trimestral'],
      correctAnswer: 2,
      explanation: 'Determinar se um paciente tem uma doença (sim/não) é classificação — a saída é uma categoria, não um número. Todas as outras opções preveem valores numéricos (temperatura, tempo, receita) e são problemas de regressão.'
    },
    {
      id: 'ai900-05-q5',
      question: 'Qual é o papel dos dados de treinamento em um modelo de regressão?',
      options: ['Testar o modelo após implantação', 'Fornecer exemplos com features e labels conhecidas para que o modelo aprenda padrões', 'Validar o modelo durante o desenvolvimento', 'Gerar dados sintéticos para teste'],
      correctAnswer: 1,
      explanation: 'Dados de treinamento fornecem exemplos históricos onde tanto as features (entradas) quanto a label (saída) são conhecidas. O modelo aprende a relação matemática entre features e labels a partir desses dados.'
    }
  ]}
/>

## Saiba Mais

- [Microsoft Learn: Criar um modelo de regressão com Azure ML Designer](https://learn.microsoft.com/en-us/training/modules/create-regression-model-azure-machine-learning-designer/)
- [Documentação do Azure Machine Learning](https://learn.microsoft.com/en-us/azure/machine-learning/)
- [Algoritmos de regressão no Azure ML](https://learn.microsoft.com/en-us/azure/machine-learning/algorithm-cheat-sheet)
