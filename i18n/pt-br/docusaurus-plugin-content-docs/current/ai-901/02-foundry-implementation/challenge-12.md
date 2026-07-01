---
sidebar_position: 3
title: "Desafio 12: Reconhecimento Óptico de Caracteres (OCR)"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 12: Reconhecimento Óptico de Caracteres (OCR)

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **Domínio**: Implementação no Azure AI Foundry (55-60%)
:::

## Habilidades do exame abordadas

- Identificar recursos de soluções de reconhecimento óptico de caracteres (OCR)
- Compreender a diferença entre OCR e inteligência de documentos
- Identificar serviços do Azure para leitura de texto em imagens
- Descrever capacidades da Read API

## Visão geral

Reconhecimento Óptico de Caracteres (OCR) é a tecnologia que **extrai texto de imagens e documentos**. Sempre que você fotografa um documento, digitaliza um recibo ou aponta seu celular para uma placa e ele "lê" o texto — isso é OCR em ação.

Pense no OCR como ensinar um computador a ler. Quando você olha para uma foto de um menu de restaurante, você instantaneamente reconhece letras e palavras. O OCR faz a mesma coisa — identifica as formas dos caracteres em uma imagem e os converte em texto legível por máquina que aplicações podem processar, pesquisar e armazenar.

O Azure fornece OCR através de dois serviços principais: **Azure AI Vision** (Read API) para extração geral de texto de imagens, e **Azure AI Document Intelligence** para processamento estruturado de documentos. A Read API lida com texto impresso e manuscrito de qualquer imagem. O Document Intelligence vai além — ele compreende a estrutura do documento (campos, tabelas, pares chave-valor) de tipos específicos de documentos como faturas, recibos e formulários.

## Explorar

### Tarefa 1: OCR vs Document Intelligence

| Recurso | Azure AI Vision (Read API) | Azure AI Document Intelligence |
|---------|---------------------------|-------------------------------|
| **O que extrai** | Texto bruto de imagens | Campos estruturados, tabelas e pares chave-valor |
| **Entrada** | Qualquer imagem com texto | Documentos (faturas, recibos, formulários, IDs) |
| **Saída** | Linhas e palavras com posições | Campos nomeados (ex.: "TotalFatura: R$ 1.234,56") |
| **Caso de uso** | Ler uma placa, extrair texto de um screenshot | Processar 10.000 faturas e extrair totais, datas, fornecedores |
| **Analogia** | Ler texto em voz alta | Preencher uma planilha a partir de um formulário |

**Distinção principal**: OCR lê texto caractere por caractere. Document Intelligence COMPREENDE a estrutura do documento — ele sabe qual número é o "total" e qual é a "data."

### Tarefa 2: Experimente o demo de OCR do Azure AI Vision

1. Visite o [demo do Azure AI Vision](https://portal.vision.cognitive.azure.com/demo/extract-text-from-images)
2. Selecione a opção **"Extract text from images"**
3. Tente com uma imagem de exemplo ou faça upload da sua (foto de uma placa, documento ou manuscrito)
4. Observe os resultados:
   - Texto é extraído linha por linha
   - Cada palavra tem coordenadas de posição (polígono delimitador)
   - Tanto texto impresso quanto manuscrito pode ser detectado
   - O texto é retornado na ordem de leitura

### Tarefa 3: Entenda a estrutura de resposta da Read API

A Read API retorna uma estrutura hierárquica:

```text
Read Result
├── Page 1
│   ├── Line 1: "Invoice #12345"
│   │   ├── Word: "Invoice" (confidence: 0.99, position: [x,y,w,h])
│   │   └── Word: "#12345" (confidence: 0.97, position: [x,y,w,h])
│   ├── Line 2: "Date: January 15, 2024"
│   │   ├── Word: "Date:" (confidence: 0.99)
│   │   ├── Word: "January" (confidence: 0.98)
│   │   └── ...
│   └── ...
└── Page 2 (if multi-page document)
    └── ...
```

**Recursos principais da Read API**:
- Lida com texto **impresso** e **manuscrito**
- Suporta **múltiplos idiomas** (120+ idiomas)
- Funciona com texto **rotacionado** e **inclinado**
- Processa **documentos de múltiplas páginas** (PDF, TIFF)
- Retorna **scores de confiança** para cada palavra

### Tarefa 4: Modelos pré-construídos do Document Intelligence

O Azure AI Document Intelligence oferece modelos pré-construídos para tipos comuns de documentos:

| Modelo pré-construído | O que extrai |
|-----------------------|-------------|
| **Fatura** | Nome do fornecedor, total da fatura, data de vencimento, itens de linha |
| **Recibo** | Comerciante, data, total, imposto, itens comprados |
| **Documento de identidade** | Nome, data de nascimento, número do documento, expiração |
| **Cartão de visita** | Nome, empresa, email, número de telefone |
| **Formulário fiscal W-2** | Informações do funcionário, salários, impostos retidos |
| **Cartão de plano de saúde** | Informações do membro, detalhes do plano, número do grupo |

**Modelos personalizados**: Se seus documentos não correspondem aos modelos pré-construídos, você pode treinar o Document Intelligence com suas próprias amostras de documentos.

:::tip Alternativa via Azure CLI
```bash
# Analisar uma imagem com a Read API
az cognitiveservices account show \
  --name my-ai-services \
  --resource-group my-rg \
  --query "properties.endpoint"

# Document Intelligence é acessado via REST API:
# POST {endpoint}/documentintelligence/documentModels/prebuilt-invoice:analyze?api-version=2024-02-29
```
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| OCR (Reconhecimento Óptico de Caracteres) | Tecnologia que extrai texto de imagens e documentos digitalizados |
| Read API | Capacidade do Azure AI Vision que extrai texto impresso e manuscrito |
| Azure AI Document Intelligence | Serviço que extrai dados estruturados (campos, tabelas) de documentos |
| Caixa/polígono delimitador | Coordenadas indicando onde cada palavra/linha aparece na imagem |
| Texto impresso | Texto gerado por máquina (fontes) — maior precisão |
| Texto manuscrito | Texto escrito à mão — mais desafiador, menor precisão |
| Modelo pré-construído | Modelo pré-treinado do Document Intelligence para tipos específicos de documentos |
| Modelo personalizado | Modelo treinado pelo usuário do Document Intelligence para formatos únicos de documentos |
| Score de confiança | Medida de confiabilidade (0-1) para cada palavra extraída |

## Equívocos Comuns

| Equívoco | Realidade |
|----------|-----------|
| "OCR e Document Intelligence são a mesma coisa" | OCR extrai texto bruto (caracteres e palavras). Document Intelligence compreende a ESTRUTURA do documento — ele sabe qual texto é uma data, qual é um total e qual é o nome de um fornecedor |
| "OCR só funciona com texto impresso" | A Read API do Azure lida com texto impresso e manuscrito. Texto impresso tipicamente tem maior precisão, mas o reconhecimento de manuscrito melhorou dramaticamente |
| "OCR requer imagens perfeitamente claras e retas" | OCR moderno lida com texto rotacionado, inclinado e até parcialmente obstruído. A Read API compensa qualidade de imagem imperfeita |
| "Document Intelligence requer treinamento personalizado para cada tipo de documento" | Modelos pré-construídos funcionam imediatamente para documentos comuns (faturas, recibos, IDs). Treinamento personalizado só é necessário para formatos de documentos únicos/proprietários |
| "OCR fornece dados estruturados diretamente" | OCR fornece texto bruto na ordem de leitura. Para dados estruturados (pares chave-valor, tabelas), você precisa do Document Intelligence, que se baseia no OCR mas adiciona compreensão de documentos |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-12-q1',
      question: 'Uma empresa recebe milhares de faturas em papel e precisa extrair automaticamente o nome do fornecedor, data da fatura e valor total para o sistema contábil. Qual serviço do Azure é mais apropriado?',
      options: ['Azure AI Vision (Read API)', 'Azure AI Document Intelligence', 'Azure AI Language', 'Azure Custom Vision'],
      correctAnswer: 1,
      explanation: 'O Azure AI Document Intelligence é especializado em extrair campos estruturados (nome do fornecedor, data, total) de documentos como faturas. A Read API extrairia todo o texto mas não entenderia qual texto é o fornecedor vs. o total.'
    },
    {
      id: 'ai900-12-q2',
      question: 'Um desenvolvedor precisa extrair todo o texto de fotografias de placas de rua em múltiplos idiomas. Qual capacidade do Azure ele deve usar?',
      options: ['Azure AI Document Intelligence', 'Azure AI Translator', 'Azure AI Vision Read API', 'Azure Custom Vision'],
      correctAnswer: 2,
      explanation: 'A Azure AI Vision Read API extrai texto de qualquer imagem (incluindo fotografias de placas) e suporta 120+ idiomas. Document Intelligence é para documentos estruturados, não fotografias gerais.'
    },
    {
      id: 'ai900-12-q3',
      question: 'O que a Read API retorna além do texto extraído?',
      options: ['Apenas a string de texto bruto', 'Um resumo do conteúdo do documento', 'Apenas o idioma do texto', 'Texto com coordenadas de posição (polígonos delimitadores) e scores de confiança para cada palavra'],
      correctAnswer: 3,
      explanation: 'A Read API retorna texto extraído organizado por páginas e linhas, com cada palavra incluindo suas coordenadas de posição (polígono delimitador) e um score de confiança indicando a confiabilidade.'
    },
    {
      id: 'ai900-12-q4',
      question: 'Qual dos seguintes a Azure AI Vision Read API pode processar?',
      options: ['Apenas texto impresso claramente em inglês', 'Apenas PDFs digitais, não imagens digitalizadas', 'Texto impresso e manuscrito em múltiplos idiomas', 'Apenas documentos de uma página'],
      correctAnswer: 2,
      explanation: 'A Read API lida com texto impresso E manuscrito, suporta 120+ idiomas, funciona com imagens digitalizadas e PDFs digitais, e pode processar documentos de múltiplas páginas.'
    },
    {
      id: 'ai900-12-q5',
      question: 'Qual é a diferença principal entre OCR (Read API) e Document Intelligence?',
      options: ['OCR extrai texto bruto; Document Intelligence extrai campos estruturados e compreende o layout do documento', 'OCR é mais rápido; Document Intelligence é mais lento', 'Document Intelligence só funciona com PDFs', 'OCR requer mais dados de treinamento'],
      correctAnswer: 0,
      explanation: 'OCR (Read API) extrai texto como está das imagens. Document Intelligence vai além — ele compreende a estrutura do documento e extrai campos nomeados e estruturados (como "TotalFatura" ou "NomeFornecedor") de tipos específicos de documentos.'
    }
  ]}
/>

## Saiba Mais

- [Microsoft Learn: Ler texto de imagens e documentos](https://learn.microsoft.com/en-us/training/modules/read-text-images-documents-with-computer-vision-service/)
- [Documentação da Azure AI Vision Read API](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-ocr)
- [Visão geral do Azure AI Document Intelligence](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/overview)
- [Demo de OCR do Azure AI Vision](https://portal.vision.cognitive.azure.com/demo/extract-text-from-images)
