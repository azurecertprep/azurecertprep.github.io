---
sidebar_position: 3
title: "Desafio 12: Reconhecimento Ã“ptico de Caracteres (OCR)"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 12: Reconhecimento Ã“ptico de Caracteres (OCR)

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **DomÃ­nio**: VisÃ£o Computacional no Azure (15-20%)
:::

## Habilidades do exame abordadas

- Identificar recursos de soluÃ§Ãµes de reconhecimento Ã³ptico de caracteres (OCR)
- Compreender a diferenÃ§a entre OCR e inteligÃªncia de documentos
- Identificar serviÃ§os do Azure para leitura de texto em imagens
- Descrever capacidades da Read API

## VisÃ£o geral

Reconhecimento Ã“ptico de Caracteres (OCR) Ã© a tecnologia que **extrai texto de imagens e documentos**. Sempre que vocÃª fotografa um documento, digitaliza um recibo ou aponta seu celular para uma placa e ele "lÃª" o texto â€” isso Ã© OCR em aÃ§Ã£o.

Pense no OCR como ensinar um computador a ler. Quando vocÃª olha para uma foto de um menu de restaurante, vocÃª instantaneamente reconhece letras e palavras. O OCR faz a mesma coisa â€” identifica as formas dos caracteres em uma imagem e os converte em texto legÃ­vel por mÃ¡quina que aplicaÃ§Ãµes podem processar, pesquisar e armazenar.

O Azure fornece OCR atravÃ©s de dois serviÃ§os principais: **Azure AI Vision** (Read API) para extraÃ§Ã£o geral de texto de imagens, e **Azure AI Document Intelligence** para processamento estruturado de documentos. A Read API lida com texto impresso e manuscrito de qualquer imagem. O Document Intelligence vai alÃ©m â€” ele compreende a estrutura do documento (campos, tabelas, pares chave-valor) de tipos especÃ­ficos de documentos como faturas, recibos e formulÃ¡rios.

## Explorar

### Tarefa 1: OCR vs Document Intelligence

| Recurso | Azure AI Vision (Read API) | Azure AI Document Intelligence |
|---------|---------------------------|-------------------------------|
| **O que extrai** | Texto bruto de imagens | Campos estruturados, tabelas e pares chave-valor |
| **Entrada** | Qualquer imagem com texto | Documentos (faturas, recibos, formulÃ¡rios, IDs) |
| **SaÃ­da** | Linhas e palavras com posiÃ§Ãµes | Campos nomeados (ex.: "TotalFatura: R$ 1.234,56") |
| **Caso de uso** | Ler uma placa, extrair texto de um screenshot | Processar 10.000 faturas e extrair totais, datas, fornecedores |
| **Analogia** | Ler texto em voz alta | Preencher uma planilha a partir de um formulÃ¡rio |

**DistinÃ§Ã£o principal**: OCR lÃª texto caractere por caractere. Document Intelligence COMPREENDE a estrutura do documento â€” ele sabe qual nÃºmero Ã© o "total" e qual Ã© a "data."

### Tarefa 2: Experimente o demo de OCR do Azure AI Vision

1. Visite o [demo do Azure AI Vision](https://portal.vision.cognitive.azure.com/demo/extract-text-from-images)
2. Selecione a opÃ§Ã£o **"Extract text from images"**
3. Tente com uma imagem de exemplo ou faÃ§a upload da sua (foto de uma placa, documento ou manuscrito)
4. Observe os resultados:
   - Texto Ã© extraÃ­do linha por linha
   - Cada palavra tem coordenadas de posiÃ§Ã£o (polÃ­gono delimitador)
   - Tanto texto impresso quanto manuscrito pode ser detectado
   - O texto Ã© retornado na ordem de leitura

### Tarefa 3: Entenda a estrutura de resposta da Read API

A Read API retorna uma estrutura hierÃ¡rquica:

```text
Read Result
â”œâ”€â”€ Page 1
â”‚   â”œâ”€â”€ Line 1: "Invoice #12345"
â”‚   â”‚   â”œâ”€â”€ Word: "Invoice" (confidence: 0.99, position: [x,y,w,h])
â”‚   â”‚   â””â”€â”€ Word: "#12345" (confidence: 0.97, position: [x,y,w,h])
â”‚   â”œâ”€â”€ Line 2: "Date: January 15, 2024"
â”‚   â”‚   â”œâ”€â”€ Word: "Date:" (confidence: 0.99)
â”‚   â”‚   â”œâ”€â”€ Word: "January" (confidence: 0.98)
â”‚   â”‚   â””â”€â”€ ...
â”‚   â””â”€â”€ ...
â””â”€â”€ Page 2 (if multi-page document)
    â””â”€â”€ ...
```

**Recursos principais da Read API**:
- Lida com texto **impresso** e **manuscrito**
- Suporta **mÃºltiplos idiomas** (120+ idiomas)
- Funciona com texto **rotacionado** e **inclinado**
- Processa **documentos de mÃºltiplas pÃ¡ginas** (PDF, TIFF)
- Retorna **scores de confianÃ§a** para cada palavra

### Tarefa 4: Modelos prÃ©-construÃ­dos do Document Intelligence

O Azure AI Document Intelligence oferece modelos prÃ©-construÃ­dos para tipos comuns de documentos:

| Modelo prÃ©-construÃ­do | O que extrai |
|-----------------------|-------------|
| **Fatura** | Nome do fornecedor, total da fatura, data de vencimento, itens de linha |
| **Recibo** | Comerciante, data, total, imposto, itens comprados |
| **Documento de identidade** | Nome, data de nascimento, nÃºmero do documento, expiraÃ§Ã£o |
| **CartÃ£o de visita** | Nome, empresa, email, nÃºmero de telefone |
| **FormulÃ¡rio fiscal W-2** | InformaÃ§Ãµes do funcionÃ¡rio, salÃ¡rios, impostos retidos |
| **CartÃ£o de plano de saÃºde** | InformaÃ§Ãµes do membro, detalhes do plano, nÃºmero do grupo |

**Modelos personalizados**: Se seus documentos nÃ£o correspondem aos modelos prÃ©-construÃ­dos, vocÃª pode treinar o Document Intelligence com suas prÃ³prias amostras de documentos.

:::tip Alternativa via Azure CLI
```bash
# Analisar uma imagem com a Read API
az cognitiveservices account show \
  --name my-ai-services \
  --resource-group my-rg \
  --query "properties.endpoint"

# Document Intelligence Ã© acessado via REST API:
# POST {endpoint}/documentintelligence/documentModels/prebuilt-invoice:analyze?api-version=2024-02-29
```
:::

## Conceitos-Chave

| Conceito | DefiniÃ§Ã£o |
|----------|-----------|
| OCR (Reconhecimento Ã“ptico de Caracteres) | Tecnologia que extrai texto de imagens e documentos digitalizados |
| Read API | Capacidade do Azure AI Vision que extrai texto impresso e manuscrito |
| Azure AI Document Intelligence | ServiÃ§o que extrai dados estruturados (campos, tabelas) de documentos |
| Caixa/polÃ­gono delimitador | Coordenadas indicando onde cada palavra/linha aparece na imagem |
| Texto impresso | Texto gerado por mÃ¡quina (fontes) â€” maior precisÃ£o |
| Texto manuscrito | Texto escrito Ã  mÃ£o â€” mais desafiador, menor precisÃ£o |
| Modelo prÃ©-construÃ­do | Modelo prÃ©-treinado do Document Intelligence para tipos especÃ­ficos de documentos |
| Modelo personalizado | Modelo treinado pelo usuÃ¡rio do Document Intelligence para formatos Ãºnicos de documentos |
| Score de confianÃ§a | Medida de confiabilidade (0-1) para cada palavra extraÃ­da |

## EquÃ­vocos Comuns

| EquÃ­voco | Realidade |
|----------|-----------|
| "OCR e Document Intelligence sÃ£o a mesma coisa" | OCR extrai texto bruto (caracteres e palavras). Document Intelligence compreende a ESTRUTURA do documento â€” ele sabe qual texto Ã© uma data, qual Ã© um total e qual Ã© o nome de um fornecedor |
| "OCR sÃ³ funciona com texto impresso" | A Read API do Azure lida com texto impresso e manuscrito. Texto impresso tipicamente tem maior precisÃ£o, mas o reconhecimento de manuscrito melhorou dramaticamente |
| "OCR requer imagens perfeitamente claras e retas" | OCR moderno lida com texto rotacionado, inclinado e atÃ© parcialmente obstruÃ­do. A Read API compensa qualidade de imagem imperfeita |
| "Document Intelligence requer treinamento personalizado para cada tipo de documento" | Modelos prÃ©-construÃ­dos funcionam imediatamente para documentos comuns (faturas, recibos, IDs). Treinamento personalizado sÃ³ Ã© necessÃ¡rio para formatos de documentos Ãºnicos/proprietÃ¡rios |
| "OCR fornece dados estruturados diretamente" | OCR fornece texto bruto na ordem de leitura. Para dados estruturados (pares chave-valor, tabelas), vocÃª precisa do Document Intelligence, que se baseia no OCR mas adiciona compreensÃ£o de documentos |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-12-q1',
      question: 'Uma empresa recebe milhares de faturas em papel e precisa extrair automaticamente o nome do fornecedor, data da fatura e valor total para o sistema contÃ¡bil. Qual serviÃ§o do Azure Ã© mais apropriado?',
      options: ['Azure AI Vision (Read API)', 'Azure AI Document Intelligence', 'Azure AI Language', 'Azure Custom Vision'],
      correctAnswer: 1,
      explanation: 'O Azure AI Document Intelligence Ã© especializado em extrair campos estruturados (nome do fornecedor, data, total) de documentos como faturas. A Read API extrairia todo o texto mas nÃ£o entenderia qual texto Ã© o fornecedor vs. o total.'
    },
    {
      id: 'ai900-12-q2',
      question: 'Um desenvolvedor precisa extrair todo o texto de fotografias de placas de rua em mÃºltiplos idiomas. Qual capacidade do Azure ele deve usar?',
      options: ['Azure AI Document Intelligence', 'Azure AI Translator', 'Azure AI Vision Read API', 'Azure Custom Vision'],
      correctAnswer: 2,
      explanation: 'A Azure AI Vision Read API extrai texto de qualquer imagem (incluindo fotografias de placas) e suporta 120+ idiomas. Document Intelligence Ã© para documentos estruturados, nÃ£o fotografias gerais.'
    },
    {
      id: 'ai900-12-q3',
      question: 'O que a Read API retorna alÃ©m do texto extraÃ­do?',
      options: ['Apenas a string de texto bruto', 'Um resumo do conteÃºdo do documento', 'Apenas o idioma do texto', 'Texto com coordenadas de posiÃ§Ã£o (polÃ­gonos delimitadores) e scores de confianÃ§a para cada palavra'],
      correctAnswer: 3,
      explanation: 'A Read API retorna texto extraÃ­do organizado por pÃ¡ginas e linhas, com cada palavra incluindo suas coordenadas de posiÃ§Ã£o (polÃ­gono delimitador) e um score de confianÃ§a indicando a confiabilidade.'
    },
    {
      id: 'ai900-12-q4',
      question: 'Qual dos seguintes a Azure AI Vision Read API pode processar?',
      options: ['Apenas texto impresso claramente em inglÃªs', 'Apenas PDFs digitais, nÃ£o imagens digitalizadas', 'Texto impresso e manuscrito em mÃºltiplos idiomas', 'Apenas documentos de uma pÃ¡gina'],
      correctAnswer: 2,
      explanation: 'A Read API lida com texto impresso E manuscrito, suporta 120+ idiomas, funciona com imagens digitalizadas e PDFs digitais, e pode processar documentos de mÃºltiplas pÃ¡ginas.'
    },
    {
      id: 'ai900-12-q5',
      question: 'Qual Ã© a diferenÃ§a principal entre OCR (Read API) e Document Intelligence?',
      options: ['OCR extrai texto bruto; Document Intelligence extrai campos estruturados e compreende o layout do documento', 'OCR Ã© mais rÃ¡pido; Document Intelligence Ã© mais lento', 'Document Intelligence sÃ³ funciona com PDFs', 'OCR requer mais dados de treinamento'],
      correctAnswer: 0,
      explanation: 'OCR (Read API) extrai texto como estÃ¡ das imagens. Document Intelligence vai alÃ©m â€” ele compreende a estrutura do documento e extrai campos nomeados e estruturados (como "TotalFatura" ou "NomeFornecedor") de tipos especÃ­ficos de documentos.'
    }
  ]}
/>

## Saiba Mais

- [Microsoft Learn: Ler texto de imagens e documentos](https://learn.microsoft.com/en-us/training/modules/read-text-images-documents-with-computer-vision-service/)
- [DocumentaÃ§Ã£o da Azure AI Vision Read API](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-ocr)
- [VisÃ£o geral do Azure AI Document Intelligence](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/overview)
- [Demo de OCR do Azure AI Vision](https://portal.vision.cognitive.azure.com/demo/extract-text-from-images)
