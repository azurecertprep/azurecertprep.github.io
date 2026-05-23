---
sidebar_position: 1
title: "Desafio 10: Classificação de Imagens"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 10: Classificação de Imagens

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **Domínio**: Visão Computacional no Azure (15-20%)
:::

## Habilidades do exame abordadas

- Identificar recursos de soluções de classificação de imagens
- Descrever classificação de imagens de rótulo único e múltiplos rótulos
- Compreender scores de confiança em resultados de classificação
- Identificar serviços do Azure para classificação de imagens

## Visão geral

Classificação de imagens é uma técnica de visão computacional que responde à pergunta: **"O que há nesta imagem?"** Dada uma imagem, o modelo atribui um ou mais rótulos de categoria com scores de confiança. É como mostrar uma foto para alguém e perguntar "o que é isso?" — exceto que a IA responde com probabilidades.

Pense na classificação de imagens como um guia de natureza identificando pássaros. Você mostra uma foto e ele diz "tenho 95% de certeza que é um cardeal, 3% azulão, 2% robin." Ele aprendeu a reconhecer centenas de espécies a partir de milhares de exemplos. Da mesma forma, um modelo de classificação de imagens aprende a partir de imagens de treinamento rotuladas para categorizar novas imagens que nunca viu.

Existem dois tipos: **classificação de rótulo único** atribui exatamente uma categoria (isso é OU um gato OU um cachorro), enquanto **classificação de múltiplos rótulos** pode atribuir múltiplas categorias (esta imagem contém TANTO uma praia QUANTO um pôr do sol QUANTO pessoas).

## Explorar

### Tarefa 1: Entender os tipos de classificação de imagens

| Tipo | Saída | Exemplo |
|------|-------|---------|
| **Rótulo único** | Uma categoria por imagem | "Isso é um gato" (não um cachorro, não um pássaro) |
| **Múltiplos rótulos** | Múltiplas categorias por imagem | "Isso contém: ar livre, praia, pessoas, pôr do sol" |

**Scores de confiança**: Toda previsão vem com uma probabilidade (0.0 a 1.0):
- 0.95 = 95% confiante → muito confiável
- 0.60 = 60% confiante → incerto, pode precisar de revisão humana
- Limiar: Aplicações tipicamente só aceitam previsões acima de uma certa confiança (ex.: > 0.7)

### Tarefa 2: Experimente a análise de imagens do Azure AI Vision

1. Visite o [demo do Azure AI Vision](https://portal.vision.cognitive.azure.com/demo/generic-image-tagging)
2. Selecione ou faça upload de uma imagem de exemplo
3. Observe os resultados:
   - **Tags** — categorias/rótulos atribuídos à imagem
   - **Scores de confiança** — quão certo o modelo está para cada tag
   - Note que múltiplas tags podem ser retornadas (múltiplos rótulos)
4. Tente diferentes tipos de imagens (paisagens, animais, comida, objetos) e observe como as tags mudam

### Tarefa 3: Custom Vision vs Vision pré-construído

O Azure oferece duas abordagens para classificação de imagens:

| Abordagem | Quando usar | Como funciona |
|-----------|-------------|---------------|
| **Azure AI Vision (pré-construído)** | Compreensão geral de imagens | Pré-treinado com milhões de imagens; funciona imediatamente para objetos/cenas comuns |
| **Custom Vision** | Classificação específica de domínio | Você treina com SUAS imagens e SUAS categorias (ex.: produtos "defeituosos" vs "bons" na sua linha de montagem) |

**Fluxo de trabalho do Custom Vision**:
1. Faça upload de imagens de treinamento rotuladas (pelo menos 15 por categoria recomendado)
2. Treine o modelo (o Custom Vision cuida do ML)
3. Teste com novas imagens
4. Implante e use via API

### Tarefa 4: Classificação de imagens no mundo real

| Indústria | Caso de uso | Tipo de classificação |
|-----------|-------------|----------------------|
| Manufatura | Detecção de defeitos (peças boas/defeituosas) | Rótulo único binário |
| Varejo | Categorização de produtos a partir de fotos | Multi-classe rótulo único |
| Saúde | Classificação de lesões de pele (benigno/maligno) | Rótulo único binário |
| Agricultura | Identificação de doenças em culturas | Multi-classe rótulo único |
| Redes sociais | Moderação de conteúdo (apropriado/inapropriado) | Rótulo único binário |
| Fotografia | Auto-etiquetagem de fotos (praia, pessoas, pôr do sol...) | Múltiplos rótulos |

:::tip Dica para o exame
O exame distingue entre:
- **Classificação de imagens**: "O que é isso?" → atribui rótulo(s) à imagem inteira
- **Detecção de objetos**: "O que e ONDE?" → encontra objetos com caixas delimitadoras
- **OCR**: "Que texto está aqui?" → extrai texto de imagens

Saiba qual é qual!
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Classificação de imagens | Atribuir rótulos de categoria a uma imagem inteira |
| Classificação de rótulo único | Cada imagem recebe exatamente uma categoria (classes mutuamente exclusivas) |
| Classificação de múltiplos rótulos | Cada imagem pode receber múltiplas categorias (tags não exclusivas) |
| Score de confiança | Probabilidade (0-1) indicando quão certo o modelo está sobre uma previsão |
| Imagens de treinamento | Exemplos rotulados usados para ensinar ao modelo como cada categoria se parece |
| Custom Vision | Serviço do Azure para treinar modelos personalizados de classificação de imagens com seus próprios dados |
| Azure AI Vision | Serviço pré-construído para análise geral de imagens (etiquetagem, descrição, categorização) |
| Limiar | Score de confiança mínimo necessário para aceitar uma previsão |

## Equívocos Comuns

| Equívoco | Realidade |
|----------|-----------|
| "Classificação de imagens diz ONDE os objetos estão na imagem" | Classificação só diz O QUE está na imagem (a imagem inteira). Detecção de objetos diz ONDE (com caixas delimitadoras). São tarefas diferentes |
| "Você precisa de milhares de imagens para treinar um classificador personalizado" | O Azure Custom Vision pode funcionar com apenas 15 imagens por categoria para classificação básica. Mais imagens melhoram a precisão, mas você pode começar pequeno |
| "Um score de confiança de 90% significa que o modelo tem 90% de precisão" | Confiança é por previsão — significa que o modelo tem 90% de certeza sobre ESTA imagem específica. A precisão geral do modelo é medida separadamente em muitas imagens de teste |
| "O Azure AI Vision pré-construído pode classificar qualquer coisa" | Modelos pré-construídos lidam com objetos e cenas comuns. Para categorias específicas de domínio (seus tipos de produto, defeitos específicos), você precisa do Custom Vision com seus próprios dados de treinamento |
| "Múltiplos rótulos significa que o modelo está incerto" | Múltiplos rótulos significa que a imagem legitimamente contém múltiplas coisas. Uma imagem com um cachorro na praia corretamente recebe as tags "cachorro" e "praia" — isso não é incerteza |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-10-q1',
      question: 'Um aplicativo de compartilhamento de fotos precisa etiquetar automaticamente fotos enviadas com rótulos relevantes como "ar livre", "comida", "pessoas" e "pôr do sol" — uma imagem pode ter múltiplas tags. Que tipo de classificação é essa?',
      options: ['Classificação de rótulo único', 'Classificação de múltiplos rótulos', 'Detecção de objetos', 'Classificação binária'],
      correctAnswer: 1,
      explanation: 'Classificação de múltiplos rótulos atribui múltiplas categorias não exclusivas a uma única imagem. Uma foto pode ser etiquetada como "ar livre" E "comida" E "pessoas" simultaneamente.'
    },
    {
      id: 'ai900-10-q2',
      question: 'Um modelo de classificação de imagens retorna um score de confiança de 0.45 para "gato" e 0.42 para "cachorro". O que o aplicativo deve fazer?',
      options: ['Sempre aceitar o score mais alto (gato)', 'Fazer a média dos dois scores', 'Retornar ambos os rótulos', 'Rejeitar a previsão porque a confiança está abaixo de um limiar típico'],
      correctAnswer: 3,
      explanation: 'Scores de confiança baixos (abaixo de limiares típicos como 0.7) indicam que o modelo está incerto. Aplicações devem tipicamente rejeitar previsões abaixo do seu limiar de confiança e potencialmente encaminhar para revisão humana.'
    },
    {
      id: 'ai900-10-q3',
      question: 'Uma empresa de manufatura precisa classificar produtos na linha de montagem como "aprovado" ou "reprovado" com base em fotos. As categorias são específicas dos produtos deles. Qual serviço do Azure é mais apropriado?',
      options: ['Custom Vision', 'Azure AI Vision (pré-construído)', 'Azure AI Language', 'Azure OpenAI'],
      correctAnswer: 0,
      explanation: 'O Custom Vision é projetado para classificação específica de domínio onde você treina com suas próprias imagens e categorias. Um classificador aprovado/reprovado de manufatura precisa de treinamento nos produtos específicos daquela empresa — modelos pré-construídos não saberão como "defeituoso" se parece para os produtos deles.'
    },
    {
      id: 'ai900-10-q4',
      question: 'Qual é o número mínimo de imagens de treinamento recomendado por categoria ao usar o Azure Custom Vision?',
      options: ['Pelo menos 1 imagem por categoria', 'Pelo menos 1.000 imagens por categoria', 'Pelo menos 15 imagens por categoria', 'Pelo menos 10.000 imagens por categoria'],
      correctAnswer: 2,
      explanation: 'O Azure Custom Vision recomenda pelo menos 15 imagens por categoria como ponto de partida mínimo. Embora mais imagens geralmente melhorem a precisão, o Custom Vision é projetado para funcionar com conjuntos de dados relativamente pequenos.'
    },
    {
      id: 'ai900-10-q5',
      question: 'Qual é a diferença principal entre classificação de imagens e detecção de objetos?',
      options: ['Classificação é mais precisa', 'Classificação rotula a imagem inteira; detecção de objetos localiza objetos específicos com caixas delimitadoras', 'Detecção de objetos só funciona com vídeos', 'Classificação requer mais dados de treinamento'],
      correctAnswer: 1,
      explanation: 'Classificação de imagens responde "O que há nesta imagem?" para a imagem inteira. Detecção de objetos responde "Que objetos estão aqui e ONDE estão?" identificando objetos individuais e desenhando caixas delimitadoras ao redor de cada um.'
    }
  ]}
/>

## Saiba Mais

- [Microsoft Learn: Analisar imagens com Azure AI Vision](https://learn.microsoft.com/en-us/training/modules/analyze-images-computer-vision/)
- [Documentação do Azure AI Vision](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/)
- [Documentação do Custom Vision](https://learn.microsoft.com/en-us/azure/ai-services/custom-vision-service/)
- [Portal de demo do Azure AI Vision](https://portal.vision.cognitive.azure.com/)
