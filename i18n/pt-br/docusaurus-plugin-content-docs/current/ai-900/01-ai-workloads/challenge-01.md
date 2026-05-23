---
sidebar_position: 1
title: "Challenge 01: Identificar Cargas de Trabalho de IA"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 01: Identificar Cargas de Trabalho de IA

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Cargas de Trabalho de IA e IA Responsável (15-20%)
:::

## Habilidades do exame abordadas

- Identificar características de cargas de trabalho de visão computacional
- Identificar características de cargas de trabalho de processamento de linguagem natural
- Identificar características de cargas de trabalho de inteligência de documentos / mineração de conhecimento
- Identificar características de cargas de trabalho de IA generativa

## Visão Geral

Inteligência Artificial (IA) é um software capaz de realizar tarefas que normalmente exigem inteligência humana — ver, ouvir, entender linguagem, tomar decisões e criar conteúdo. O Azure organiza as capacidades de IA em **categorias de carga de trabalho** distintas, cada uma resolvendo um tipo diferente de problema.

Pense nas cargas de trabalho de IA como diferentes departamentos em uma empresa. O departamento "olhos" (Computer Vision) lida com qualquer coisa visual — ler placas, identificar produtos ou inspecionar qualidade. O departamento "ouvidos e voz" (Speech) transcreve conversas e lê textos em voz alta. O departamento "linguagem" (NLP) entende e gera texto escrito. O departamento "criativo" (IA Generativa) produz novo conteúdo do zero.

Entender qual carga de trabalho se aplica a um determinado cenário é uma habilidade essencial do exame. A pergunta-chave é sempre: **"Que tipo de dados a IA está processando e qual resultado precisamos?"**

## Explorar

### Tarefa 1: Mapear problemas para cargas de trabalho de IA

Revise a tabela abaixo e associe cada cenário do mundo real à sua categoria de carga de trabalho de IA:

| Carga de trabalho | O que faz | Cenários de exemplo |
|-------------------|-----------|---------------------|
| **Computer Vision** | Analisa imagens e vídeo | Detectar defeitos em linha de montagem, contar pessoas em uma loja, ler placas de veículos |
| **Processamento de Linguagem Natural** | Entende e gera texto | Chatbots, análise de sentimento, tradução, sumarização |
| **Speech** | Converte entre fala e texto | Assistentes de voz, transcrição de call center, legendagem em tempo real |
| **Document Intelligence** | Extrai dados estruturados de documentos | Processamento de faturas, digitalização de recibos, verificação de identidade |
| **IA Generativa** | Cria novo conteúdo (texto, imagens, código) | Assistentes estilo ChatGPT, geração de imagens, autocompletar código |

### Tarefa 2: Explorar Azure AI Services no portal

1. Abra [portal.azure.com](https://portal.azure.com)
2. Na barra de pesquisa, digite **"Azure AI services"**
3. Clique em **+ Criar** (não crie de fato — apenas observe as opções)
4. Observe as diferentes categorias de serviço disponíveis:
   - Azure AI Vision
   - Azure AI Language
   - Azure AI Speech
   - Azure AI Document Intelligence
   - Azure OpenAI Service
5. Cada uma mapeia para uma categoria de carga de trabalho do exame

### Tarefa 3: Experimentar demos do Azure AI

1. Visite a [demo do Azure AI Vision](https://portal.vision.cognitive.azure.com/demo/generic-image-tagging)
2. Faça upload ou selecione uma imagem de exemplo — veja como o Vision identifica objetos e gera tags
3. Visite a [demo do Azure AI Language](https://language.cognitive.azure.com/)
4. Experimente a demo de análise de sentimento com texto de exemplo
5. Essas demos mostram cargas de trabalho de IA em ação sem precisar escrever código

### Tarefa 4: Identificar cargas de trabalho sobrepostas

Alguns cenários envolvem múltiplas cargas de trabalho de IA trabalhando juntas:

| Cenário | Cargas de trabalho envolvidas |
|---------|-------------------------------|
| Um assistente de voz que responde perguntas | Speech (voz→texto) + NLP (entender intenção) + Speech (texto→voz) |
| Processamento de faturas digitalizadas | Computer Vision (OCR) + Document Intelligence (extrair campos) |
| Um chatbot que gera imagens a partir de descrições | NLP (entender solicitação) + IA Generativa (criar imagem) |

**Insight principal**: Soluções reais frequentemente combinam múltiplas cargas de trabalho de IA. O exame testa se você consegue identificar qual carga de trabalho individual cuida de cada parte.

:::tip Alternativa via Azure CLI
```bash
# List available Azure AI service kinds
az cognitiveservices account list-kinds --output table
```
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Computer Vision | IA que analisa imagens e vídeo para extrair informações |
| Processamento de Linguagem Natural (NLP) | IA que lê, entende e gera texto em linguagem humana |
| Speech | IA que converte entre áudio falado e texto |
| Document Intelligence | IA que extrai dados estruturados (campos, tabelas) de documentos |
| IA Generativa | IA que cria novo conteúdo — texto, imagens, código, áudio |
| Mineração de Conhecimento | Uso de IA para extrair insights de grandes volumes de conteúdo não estruturado |
| IA Multi-modal | IA que processa múltiplos tipos de entrada (texto + imagens + áudio) |

## Conceitos Errôneos Comuns

| Conceito errôneo | Realidade |
|------------------|-----------|
| "Computer Vision e OCR são a mesma coisa" | OCR (leitura de texto em imagens) é uma capacidade dentro do Computer Vision. Vision também faz detecção de objetos, classificação e análise espacial |
| "NLP e Speech são a mesma carga de trabalho" | Speech lida com conversão áudio↔texto. NLP lida com entendimento e geração de texto escrito. Frequentemente trabalham juntos, mas são distintos |
| "IA Generativa substitui todas as outras cargas de trabalho" | IA Generativa cria conteúdo, mas serviços especializados (Vision, Speech) são melhores para tarefas analíticas específicas como detecção de objetos ou transcrição em tempo real |
| "Document Intelligence é apenas OCR" | OCR lê texto caractere por caractere. Document Intelligence entende a estrutura do documento — sabe que um número é um "total" ou uma "data" baseado no contexto |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-01-q1',
      question: 'Uma empresa de varejo quer contar automaticamente o número de clientes entrando em suas lojas usando câmeras de segurança. Qual carga de trabalho de IA é essa?',
      options: ['Processamento de Linguagem Natural', 'Computer Vision', 'IA Generativa', 'Document Intelligence'],
      correctAnswer: 1,
      explanation: 'Contar pessoas a partir de feeds de câmera é uma carga de trabalho de Computer Vision. Envolve analisar vídeo/imagens para detectar e contar objetos (pessoas) no quadro.'
    },
    {
      id: 'ai900-01-q2',
      question: 'Uma empresa precisa extrair automaticamente números de fatura, datas e totais de faturas PDF digitalizadas. Qual carga de trabalho de IA é mais adequada?',
      options: ['Computer Vision', 'Processamento de Linguagem Natural', 'Document Intelligence', 'IA Generativa'],
      correctAnswer: 2,
      explanation: 'Document Intelligence (anteriormente Form Recognizer) é especializado em extrair dados estruturados — campos específicos, tabelas e pares chave-valor — de documentos como faturas, recibos e formulários.'
    },
    {
      id: 'ai900-01-q3',
      question: 'Uma equipe de atendimento ao cliente quer analisar milhares de avaliações de produtos para determinar se os clientes estão satisfeitos ou insatisfeitos. Qual carga de trabalho de IA se aplica?',
      options: ['Computer Vision', 'Processamento de Linguagem Natural', 'Speech', 'Document Intelligence'],
      correctAnswer: 1,
      explanation: 'Analisar sentimento (positivo/negativo) em texto escrito é uma carga de trabalho de Processamento de Linguagem Natural (NLP). NLP entende o significado e a emoção na linguagem humana.'
    },
    {
      id: 'ai900-01-q4',
      question: 'Um desenvolvedor usa o Azure OpenAI para construir uma aplicação que escreve e-mails de marketing baseados em descrições de produtos. Qual categoria de carga de trabalho é essa?',
      options: ['Processamento de Linguagem Natural', 'Document Intelligence', 'IA Generativa', 'Mineração de Conhecimento'],
      correctAnswer: 2,
      explanation: 'Criar novo conteúdo (e-mails de marketing) a partir de entradas (descrições de produtos) é uma carga de trabalho de IA Generativa. A IA gera texto original em vez de apenas analisar texto existente.'
    },
    {
      id: 'ai900-01-q5',
      question: 'Um call center quer converter chamadas telefônicas gravadas em transcrições de texto para revisão de qualidade. Qual carga de trabalho de IA lida com isso?',
      options: ['Processamento de Linguagem Natural', 'Speech', 'IA Generativa', 'Computer Vision'],
      correctAnswer: 1,
      explanation: 'Converter áudio falado em texto escrito é speech-to-text (transcrição), que é uma carga de trabalho de Speech. Após a transcrição, NLP poderia analisar o texto — mas a etapa áudio→texto é Speech.'
    }
  ]}
/>

## Saiba Mais

- [Microsoft Learn: Conceitos fundamentais de IA](https://learn.microsoft.com/en-us/training/modules/get-started-ai-fundamentals/)
- [Documentação do Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/what-are-ai-services)
- [Demo do Azure AI Vision](https://portal.vision.cognitive.azure.com/)
- [Demo do Azure AI Language](https://language.cognitive.azure.com/)
