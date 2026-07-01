---
sidebar_position: 5
title: "Desafio 18: Azure AI Language e Speech Services"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 18: Azure AI Language e Speech Services

:::info Tempo Estimado
**25-30 min** | **Custo**: Gratuito | **Domínio**: Implementação no Azure AI Foundry (55-60%)
:::

## Habilidades do exame abordadas

- Identificar capacidades do serviço Azure AI Language
- Identificar capacidades do serviço Azure AI Speech
- Descrever recursos e usos para compreensão de linguagem conversacional (CLU)
- Descrever recursos e usos para respostas a perguntas

## Visão geral

O Azure fornece dois serviços primários para processamento de linguagem natural: **Azure AI Language** para NLP baseado em texto e **Azure AI Speech** para processamento baseado em áudio. Entender qual serviço lida com qual capacidade — e quando combiná-los — é essencial para o exame AI-901.

**Azure AI Language** é a potência de análise de texto. Além das capacidades pré-construídas (sentimento, entidades, frases-chave, detecção de idioma), oferece capacidades personalizadas como **Compreensão de Linguagem Conversacional (CLU)** para construir modelos de reconhecimento de intenção, **respostas a perguntas personalizadas** para bots estilo FAQ, **sumarização de texto**, **detecção de PII** e **classificação de texto personalizada**. Pense nele como "tudo que você pode fazer com texto escrito."

**Azure AI Speech** lida com a palavra falada. Além de fala para texto e texto para fala básicos, fornece **tradução de fala**, **reconhecimento de locutor** (identificando quem está falando), **reconhecimento de palavras-chave** (palavras de ativação como "Hey Cortana") e **avaliação de pronúncia**. Pense nele como "tudo que você pode fazer com áudio/voz."

## Explorar

### Tarefa 1: Mapear as capacidades do Azure AI Language

O Azure AI Language fornece capacidades tanto pré-construídas (prontas para uso) quanto personalizadas (treináveis):

**Capacidades pré-construídas** (sem treinamento necessário):

| Capacidade | O que faz |
|-----------|-----------|
| Análise de sentimento | Determina sentimento positivo/negativo/neutro/misto |
| Reconhecimento de entidades nomeadas | Identifica pessoas, lugares, organizações, datas |
| Extração de frases-chave | Extrai os principais pontos do texto |
| Detecção de idioma | Identifica em qual idioma o texto está escrito |
| Detecção de PII | Encontra informações pessoalmente identificáveis (CPFs, emails, telefones) |
| Sumarização de texto | Gera resumos concisos de documentos |
| Vinculação de entidades | Conecta entidades a entradas da base de conhecimento da Wikipédia |

**Capacidades personalizadas** (requerem dados de treinamento):

| Capacidade | O que faz |
|-----------|-----------|
| Compreensão de Linguagem Conversacional (CLU) | Reconhece intenções do usuário e extrai entidades de linguagem natural |
| Respostas a perguntas personalizadas | Constrói bases de conhecimento estilo FAQ para bots de Q&A |
| Classificação de texto personalizada | Classifica texto em suas próprias categorias |
| Reconhecimento de entidades nomeadas personalizado | Extrai entidades específicas de domínio que você define |

### Tarefa 2: Entender a Compreensão de Linguagem Conversacional (CLU)

CLU (anteriormente LUIS) ajuda você a construir aplicações que entendem comandos de linguagem natural:

**Conceitos-chave**:
- **Enunciado (Utterance)** — O que o usuário diz: "Reserve um voo para Paris na próxima sexta"
- **Intenção (Intent)** — O que o usuário quer fazer: "BookFlight"
- **Entidade (Entity)** — Detalhes importantes: "Paris" (destino), "próxima sexta" (data)

**Projeto de exemplo**:

| Enunciado | Intenção | Entidades |
|-----------|----------|----------|
| "Ligue as luzes da sala" | TurnOn | Device: luzes, Room: sala |
| "Ajuste a temperatura para 22 graus" | SetTemperature | Temperature: 22 |
| "Como está o tempo em São Paulo?" | GetWeather | Location: São Paulo |
| "Toque um pouco de jazz" | PlayMusic | Genre: jazz |

**Fluxo de treinamento**:
1. Defina intenções (o que os usuários querem fazer)
2. Defina entidades (informações importantes a extrair)
3. Adicione enunciados de exemplo (rotulados com intenções e entidades)
4. Treine e teste o modelo
5. Implante e integre com sua aplicação

### Tarefa 3: Explore respostas a perguntas personalizadas

Respostas a perguntas personalizadas (anteriormente QnA Maker) cria bases de conhecimento a partir de conteúdo existente:

**Fontes que pode importar**:
- Páginas web de FAQ
- Documentos PDF
- Documentos Word
- Pares pergunta-resposta manuais

**Como funciona**:
1. Importe conteúdo (páginas FAQ, documentos)
2. O serviço extrai pares pergunta-resposta automaticamente
3. Adicione pares Q&A personalizados e formulações alternativas
4. Teste e refine respostas
5. Implante como um endpoint REST para chatbots

**Base de conhecimento de exemplo**:

| Pergunta | Resposta |
|---------|---------|
| Qual é o horário de funcionamento? | Estamos abertos de segunda a sexta, das 9h às 17h. |
| Como redefinir minha senha? | Vá à página de login, clique em "Esqueci a Senha" e siga as instruções do email. |
| Vocês oferecem frete grátis? | Frete grátis disponível em pedidos acima de R$ 200. |

### Tarefa 4: Navegue entre Language Studio vs Speech Studio

Compare os dois studios lado a lado:

**Azure AI Language Studio** ([language.cognitive.azure.com](https://language.cognitive.azure.com/)):
- Classificar texto (sentimento, classificação personalizada)
- Extrair informações (entidades, frases-chave, PII, sumarização)
- Entender perguntas e linguagem conversacional (CLU, Q&A)

**Azure AI Speech Studio** ([speech.microsoft.com](https://speech.microsoft.com/)):
- Fala para texto (tempo real e lote)
- Texto para fala (galeria de vozes, vozes personalizadas)
- Tradução de fala
- Reconhecimento de locutor
- Avaliação de pronúncia
- Reconhecimento de palavras-chave personalizadas

**Guia de decisão** — Qual serviço eu preciso?

| Eu quero... | Use |
|-------------|-----|
| Analisar texto para sentimento | Azure AI Language |
| Transcrever gravações de áudio | Azure AI Speech |
| Construir um chatbot que responda FAQs | Azure AI Language (Question Answering) |
| Criar um assistente de voz | Azure AI Speech + Azure AI Language |
| Detectar PII em documentos | Azure AI Language |
| Adicionar uma palavra de ativação ("Hey Assistente") | Azure AI Speech (Keyword Recognition) |
| Entender comandos do usuário em um app de casa inteligente | Azure AI Language (CLU) |
| Identificar quem está falando em uma gravação | Azure AI Speech (Speaker Recognition) |

:::tip Alternativa via Azure CLI
```bash
# Listar capacidades do seu recurso Language
az cognitiveservices account show \
  --name my-language-resource \
  --resource-group myResourceGroup \
  --query "{name:name, kind:kind, sku:sku.name, endpoint:properties.endpoint}"
```
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Azure AI Language | Serviço para NLP baseado em texto: sentimento, NER, CLU, Q&A, sumarização, detecção de PII |
| Azure AI Speech | Serviço para processamento baseado em áudio: STT, TTS, tradução de fala, reconhecimento de locutor |
| Compreensão de Linguagem Conversacional (CLU) | Modelo personalizado que reconhece intenções e entidades em entrada de linguagem natural |
| Intenção | O que o usuário quer realizar (ex.: BookFlight, GetWeather) |
| Respostas a perguntas personalizadas | Serviço de base de conhecimento para construir experiências de Q&A estilo FAQ |
| Reconhecimento de locutor | Identificar ou verificar a identidade de uma pessoa com base em sua voz |

## Equívocos Comuns

| Equívoco | Realidade |
|----------|-----------|
| Azure AI Language e Azure AI Speech são o mesmo serviço | São serviços separados — Language lida com texto, Speech lida com áudio |
| CLU substitui todas as capacidades de NLP | CLU é especificamente para entender intenções e entidades em entrada conversacional; outras capacidades (sentimento, NER) permanecem separadas |
| Respostas a perguntas requer programar um chatbot do zero | Você pode importar conteúdo FAQ existente e o serviço cria pares Q&A automaticamente |
| Reconhecimento de locutor identifica o que alguém diz | Reconhecimento de locutor identifica QUEM está falando, não o que dizem — isso é fala para texto |
| Você precisa de recursos Azure separados para cada capacidade de NLP | Um único recurso Azure AI Language fornece acesso a todas as capacidades de Language (sentimento, NER, CLU, etc.) |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-18-q1',
      question: 'Uma empresa quer construir um app de casa inteligente que entenda comandos como "desligue as luzes da cozinha" e "ajuste o termostato para 22 graus." Qual capacidade devem usar?',
      options: ['Análise de sentimento', 'Extração de frases-chave', 'Compreensão de Linguagem Conversacional (CLU)', 'Sumarização de texto'],
      correctAnswer: 2,
      explanation: 'CLU é projetado para reconhecer intenções do usuário (TurnOff, SetTemperature) e extrair entidades (luzes da cozinha, 22 graus) de comandos de linguagem natural — exatamente o que um app de casa inteligente precisa.'
    },
    {
      id: 'ai900-18-q2',
      question: 'Uma empresa tem um documento de FAQ de 50 páginas e quer criar um chatbot que responda perguntas de clientes a partir dele. Qual capacidade do Azure AI devem usar?',
      options: ['Reconhecimento de entidades nomeadas', 'Respostas a perguntas personalizadas', 'Fala para texto', 'Classificação de texto personalizada'],
      correctAnswer: 1,
      explanation: 'Respostas a perguntas personalizadas pode importar documentos FAQ, extrair automaticamente pares Q&A e fornecer um endpoint REST que chatbots podem consultar para encontrar respostas às perguntas dos clientes.'
    },
    {
      id: 'ai900-18-q3',
      question: 'Qual capacidade faz parte do Azure AI Speech (NÃO do Azure AI Language)?',
      options: ['Análise de sentimento', 'Reconhecimento de entidades nomeadas', 'Extração de frases-chave', 'Reconhecimento de locutor'],
      correctAnswer: 3,
      explanation: 'Reconhecimento de locutor (identificar quem está falando com base em características vocais) faz parte do serviço Azure AI Speech. Análise de sentimento, NER e extração de frases-chave são todas capacidades do Azure AI Language.'
    },
    {
      id: 'ai900-18-q4',
      question: 'Na Compreensão de Linguagem Conversacional, o que é uma "intenção"?',
      options: ['Uma informação específica extraída da entrada do usuário', 'O que o usuário quer realizar', 'O idioma que o usuário está falando', 'O sentimento da mensagem do usuário'],
      correctAnswer: 1,
      explanation: 'Uma intenção representa o que o usuário quer fazer ou realizar (ex.: BookFlight, GetWeather, TurnOnLights). Entidades são as informações específicas extraídas do enunciado.'
    },
    {
      id: 'ai900-18-q5',
      question: 'Uma empresa quer detectar e redigir automaticamente CPFs e endereços de email de documentos de clientes. Qual capacidade do Azure AI Language devem usar?',
      options: ['Detecção de PII', 'Análise de sentimento', 'Extração de frases-chave', 'Classificação de texto personalizada'],
      correctAnswer: 0,
      explanation: 'Detecção de PII (Informações Pessoalmente Identificáveis) identifica informações sensíveis como CPFs, endereços de email, números de telefone e números de cartão de crédito no texto — e pode opcionalmente redigi-las.'
    }
  ]}
/>

## Saiba Mais

- [Visão geral do Azure AI Language](https://learn.microsoft.com/en-us/azure/ai-services/language-service/overview)
- [Visão geral do Azure AI Speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/overview)
- [Compreensão de Linguagem Conversacional](https://learn.microsoft.com/en-us/azure/ai-services/language-service/conversational-language-understanding/overview)
- [Respostas a perguntas personalizadas](https://learn.microsoft.com/en-us/azure/ai-services/language-service/question-answering/overview)
- [Azure AI Language Studio](https://language.cognitive.azure.com/)
- [Azure AI Speech Studio](https://speech.microsoft.com/)
