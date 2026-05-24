---
sidebar_position: 2
title: "Desafio 31: Text Analytics - Frases-chave, Entidades, Sentimento"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 31: Text Analytics - Frases-chave, Entidades, Sentimento

:::info Tempo Estimado
**45 min** | **Custo**: $1-3 (estimado) | **DomÃ­nio**: Implementar SoluÃ§Ãµes de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Extrair frases-chave de texto
- Reconhecer entidades nomeadas e entidades vinculadas
- Determinar sentimento com mineraÃ§Ã£o de opiniÃ£o
- Detectar idioma

## VisÃ£o Geral

O Azure AI Language (Text Analytics) fornece capacidades de NLP:

| Recurso | DescriÃ§Ã£o |
|---------|-----------|
| **AnÃ¡lise de Sentimento** | Positivo/neutro/negativo com confianÃ§a + mineraÃ§Ã£o de opiniÃ£o |
| **ExtraÃ§Ã£o de Frases-chave** | Identificar os principais pontos de discussÃ£o |
| **Reconhecimento de Entidades Nomeadas (NER)** | Detectar entidades (Pessoa, Local, OrganizaÃ§Ã£o, DateTime, etc.) |
| **VinculaÃ§Ã£o de Entidades** | Vincular entidades Ã  base de conhecimento da Wikipedia |
| **DetecÃ§Ã£o de Idioma** | Identificar o idioma do texto |

O cliente suporta **operaÃ§Ãµes em lote** â€” envie mÃºltiplos documentos em uma Ãºnica requisiÃ§Ã£o para eficiÃªncia.

## PrÃ©-requisitos
- Assinatura do Azure
- Recurso Azure AI Language (ou multi-serviÃ§o)
- Python 3.9+ ou .NET 8
- Pacote: `azure-ai-textanalytics` (v5.3+)

## ImplementaÃ§Ã£o

### Tarefa 1: Criar Recurso de Language

```bash
az group create --name rg-ai102-nlp --location eastus2

az cognitiveservices account create \
  --name language-ai102 \
  --resource-group rg-ai102-nlp \
  --kind TextAnalytics \
  --sku S \
  --location eastus2

ENDPOINT=$(az cognitiveservices account show --name language-ai102 --resource-group rg-ai102-nlp --query properties.endpoint -o tsv)
KEY=$(az cognitiveservices account keys list --name language-ai102 --resource-group rg-ai102-nlp --query key1 -o tsv)
```

### Tarefa 2: Analisar Sentimento com MineraÃ§Ã£o de OpiniÃ£o

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.ai.textanalytics import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential

client = TextAnalyticsClient(
    endpoint=os.environ["AZURE_AI_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["AZURE_AI_KEY"])
)

documents = [
    "The hotel room was clean and spacious, but the service was slow and unfriendly.",
    "I absolutely love this product! Fast delivery and excellent quality.",
    "The meeting was scheduled for 3 PM."
]

# Sentiment analysis with opinion mining
results = client.analyze_sentiment(
    documents,
    show_opinion_mining=True,
    language="en"
)

for idx, result in enumerate(results):
    if result.is_error:
        print(f"Doc {idx}: Error - {result.error.message}")
        continue
    
    print(f"Document {idx}: '{documents[idx][:50]}...'")
    print(f"  Overall: {result.sentiment} "
          f"(pos={result.confidence_scores.positive:.3f}, "
          f"neu={result.confidence_scores.neutral:.3f}, "
          f"neg={result.confidence_scores.negative:.3f})")
    
    for sentence in result.sentences:
        print(f"  Sentence: '{sentence.text[:40]}...' â†’ {sentence.sentiment}")
        
        # Opinion mining - aspect-based sentiment
        for mined_opinion in sentence.mined_opinions:
            target = mined_opinion.target
            print(f"    Target: '{target.text}' ({target.sentiment})")
            for assessment in mined_opinion.assessments:
                print(f"      Assessment: '{assessment.text}' ({assessment.sentiment})")
    print()
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.TextAnalytics;

var client = new TextAnalyticsClient(
    new Uri(Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")),
    new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_AI_KEY")));

var documents = new List<string>
{
    "The hotel room was clean and spacious, but the service was slow.",
    "I absolutely love this product! Fast delivery and excellent quality."
};

var options = new AnalyzeSentimentOptions { IncludeOpinionMining = true };
var results = client.AnalyzeSentimentBatch(documents, "en", options);

foreach (var result in results)
{
    Console.WriteLine($"Sentiment: {result.DocumentSentiment.Sentiment}");
    foreach (var sentence in result.DocumentSentiment.Sentences)
    {
        Console.WriteLine($"  '{sentence.Text}' -> {sentence.Sentiment}");
        foreach (var opinion in sentence.Opinions)
        {
            Console.WriteLine($"    Target: '{opinion.Target.Text}' ({opinion.Target.Sentiment})");
            foreach (var assessment in opinion.Assessments)
                Console.WriteLine($"      '{assessment.Text}' ({assessment.Sentiment})");
        }
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="https://<resource>.cognitiveservices.azure.com"
KEY="<your-key>"

curl -s "${ENDPOINT}/language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "SentimentAnalysis",
    "parameters": {"opinionMining": true},
    "analysisInput": {
      "documents": [
        {"id": "1", "language": "en", "text": "The hotel was great but the food was terrible."}
      ]
    }
  }' | jq '.results.documents[0]'
```

</TabItem>
</Tabs>

### Tarefa 3: Extrair Frases-chave e Entidades Nomeadas

<Tabs>
<TabItem value="python" label="Python SDK">

```python
documents = [
    "Microsoft CEO Satya Nadella announced Azure AI updates at the Build 2024 conference in Seattle on May 21.",
    "The quarterly revenue increased by 15% to $62 billion, driven by cloud services growth."
]

# Key phrase extraction
key_phrases_results = client.extract_key_phrases(documents, language="en")
print("=== KEY PHRASES ===")
for idx, result in enumerate(key_phrases_results):
    if not result.is_error:
        print(f"Doc {idx}: {result.key_phrases}")

# Named Entity Recognition
ner_results = client.recognize_entities(documents, language="en")
print("\n=== NAMED ENTITIES ===")
for idx, result in enumerate(ner_results):
    if not result.is_error:
        print(f"Doc {idx}:")
        for entity in result.entities:
            print(f"  '{entity.text}' â†’ {entity.category}"
                  f"{f'/{entity.subcategory}' if entity.subcategory else ''}"
                  f" (confidence: {entity.confidence_score:.3f})")

# Entity Linking (to Wikipedia)
linked_results = client.recognize_linked_entities(documents, language="en")
print("\n=== LINKED ENTITIES ===")
for idx, result in enumerate(linked_results):
    if not result.is_error:
        for entity in result.entities:
            print(f"  '{entity.name}' â†’ {entity.url}")
            print(f"    Data source: {entity.data_source}, ID: {entity.data_source_entity_id}")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Key phrases
curl -s "${ENDPOINT}/language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "KeyPhraseExtraction",
    "analysisInput": {
      "documents": [{"id": "1", "language": "en", "text": "Microsoft announced Azure AI updates at Build 2024 in Seattle."}]
    }
  }' | jq '.results.documents[0].keyPhrases'

# Named entities
curl -s "${ENDPOINT}/language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "EntityRecognition",
    "analysisInput": {
      "documents": [{"id": "1", "language": "en", "text": "Microsoft CEO Satya Nadella announced Azure AI updates at Build 2024 in Seattle on May 21."}]
    }
  }' | jq '.results.documents[0].entities[] | {text, category, confidenceScore}'
```

</TabItem>
</Tabs>

### Tarefa 4: DetecÃ§Ã£o de Idioma

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Language detection
multilingual_docs = [
    "Hello, how are you today?",
    "Bonjour, comment allez-vous?",
    "ã“ã‚“ã«ã¡ã¯ã€å…ƒæ°—ã§ã™ã‹ï¼Ÿ",
    "Hola, Â¿cÃ³mo estÃ¡s?"
]

lang_results = client.detect_language(multilingual_docs)
print("=== LANGUAGE DETECTION ===")
for idx, result in enumerate(lang_results):
    if not result.is_error:
        lang = result.primary_language
        print(f"  '{multilingual_docs[idx][:30]}...' â†’ {lang.name} ({lang.iso6391_name}) "
              f"confidence: {lang.confidence_score:.3f}")
```

</TabItem>
</Tabs>

## SaÃ­da Esperada

```text
Document 0: 'The hotel room was clean and spacious, but the s...'
  Overall: mixed (pos=0.450, neu=0.100, neg=0.450)
  Sentence: 'The hotel room was clean and sp...' â†’ mixed
    Target: 'room' (positive)
      Assessment: 'clean' (positive)
      Assessment: 'spacious' (positive)
    Target: 'service' (negative)
      Assessment: 'slow' (negative)
      Assessment: 'unfriendly' (negative)

=== KEY PHRASES ===
Doc 0: ['Microsoft CEO Satya Nadella', 'Azure AI updates', 'Build 2024 conference', 'Seattle']

=== NAMED ENTITIES ===
Doc 0:
  'Microsoft' â†’ Organization (confidence: 0.990)
  'Satya Nadella' â†’ Person (confidence: 0.985)
  'Azure AI' â†’ Product (confidence: 0.920)
  'Build 2024' â†’ Event (confidence: 0.880)
  'Seattle' â†’ Location (confidence: 0.995)
  'May 21' â†’ DateTime/Date (confidence: 0.970)

=== LANGUAGE DETECTION ===
  'Hello, how are you today?...' â†’ English (en) confidence: 1.000
  'Bonjour, comment allez-vous?...' â†’ French (fr) confidence: 1.000
  'ã“ã‚“ã«ã¡ã¯ã€å…ƒæ°—ã§ã™ã‹ï¼Ÿ...' â†’ Japanese (ja) confidence: 1.000
  'Hola, Â¿cÃ³mo estÃ¡s?...' â†’ Spanish (es) confidence: 1.000
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| Resultados mistos em texto claro | Sentimento `mixed` inesperado | MineraÃ§Ã£o de opiniÃ£o detecta opiniÃµes opostas | Use sentimento no nÃ­vel da sentenÃ§a para granularidade |
| Frases-chave vazias | Nenhuma frase retornada | Texto muito curto ou genÃ©rico | ForneÃ§a texto substancial (10+ palavras recomendado) |
| Categoria de entidade `Unknown` | Entidades nÃ£o reconhecidas | Termos especÃ­ficos de domÃ­nio nÃ£o estÃ£o no modelo | Use modelo NER personalizado para entidades especializadas |
| Erro em lote em um doc | `InvalidDocument` nos resultados | Documento excede 5.120 caracteres | Divida documentos longos; verifique `is_error` por documento |
| DetecÃ§Ã£o de idioma errada | Idioma incorreto | Texto em mÃºltiplos idiomas confunde a detecÃ§Ã£o | Separe texto por idioma; use amostras mais longas |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que a mineraÃ§Ã£o de opiniÃ£o adiciona Ã  anÃ¡lise de sentimento padrÃ£o?",
    options: [
      "Fornece pontuaÃ§Ãµes de sentimento geral mais precisas",
      "Traduz o texto antes de analisar o sentimento",
      "Identifica alvos (aspectos) especÃ­ficos e as avaliaÃ§Ãµes (opiniÃµes) sobre eles",
      "Detecta o idioma do texto"
    ],
    correctAnswer: 2,
    explanation: "A mineraÃ§Ã£o de opiniÃ£o extrai sentimento baseado em aspectos: alvos (ex.: 'room', 'service') e avaliaÃ§Ãµes (ex.: 'clean', 'slow') com sua polaridade individual de sentimento."
  },
  {
    question: "Qual Ã© o tamanho mÃ¡ximo de documento para uma Ãºnica requisiÃ§Ã£o de text analytics?",
    options: [
      "5.120 caracteres por documento (atÃ© 25 documentos por lote)",
      "1.000 caracteres por documento",
      "10.000 palavras por documento",
      "Sem limite"
    ],
    correctAnswer: 0,
    explanation: "Cada documento pode ter atÃ© 5.120 caracteres. Uma Ãºnica requisiÃ§Ã£o em lote pode conter atÃ© 25 documentos (ou 125.000 caracteres no total)."
  },
  {
    question: "Qual Ã© a diferenÃ§a entre Named Entity Recognition (NER) e Entity Linking?",
    options: [
      "NER Ã© mais rÃ¡pido; Entity Linking Ã© mais preciso",
      "SÃ£o o mesmo recurso com nomes diferentes",
      "NER funciona apenas em inglÃªs; Entity Linking suporta todos os idiomas",
      "NER categoriza entidades (Person, Location, etc.); Entity Linking conecta entidades a entradas da base de conhecimento da Wikipedia"
    ],
    correctAnswer: 3,
    explanation: "NER identifica entidades e atribui categorias (Person, Org, Location, DateTime). Entity Linking vai alÃ©m, vinculando entidades a entradas da Wikipedia com URLs e IDs."
  },
  {
    question: "Como vocÃª deve lidar com erros em resultados de text analytics em lote?",
    options: [
      "Capturar uma Ãºnica exceÃ§Ã£o para o lote inteiro",
      "Verificar a propriedade is_error em cada resultado de documento individual",
      "Erros nunca sÃ£o retornados â€” documentos que falharam sÃ£o ignorados silenciosamente",
      "Reenviar o lote inteiro se qualquer documento falhar"
    ],
    correctAnswer: 1,
    explanation: "Em operaÃ§Ãµes em lote, cada resultado de documento possui uma propriedade is_error. Alguns documentos podem ter sucesso enquanto outros falham, entÃ£o vocÃª deve verificar cada resultado individualmente."
  },
  {
    question: "Qual formato de pontuaÃ§Ã£o de confianÃ§a a detecÃ§Ã£o de idioma retorna?",
    options: [
      "Uma porcentagem de 0% a 100%",
      "Um inteiro de 1 a 10",
      "Um float de 0.0 a 1.0 indicando a confianÃ§a da detecÃ§Ã£o",
      "Um booleano (detectado ou nÃ£o detectado)"
    ],
    correctAnswer: 2,
    explanation: "A detecÃ§Ã£o de idioma retorna uma pontuaÃ§Ã£o de confianÃ§a de 0.0 a 1.0 para cada idioma detectado. Uma pontuaÃ§Ã£o de 1.0 significa confianÃ§a mÃ¡xima."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-nlp --yes --no-wait
```

## Saiba Mais

- [VisÃ£o geral do Text Analytics](https://learn.microsoft.com/azure/ai-services/language-service/overview)
- [AnÃ¡lise de sentimento](https://learn.microsoft.com/azure/ai-services/language-service/sentiment-opinion-mining/overview)
- [Reconhecimento de entidades nomeadas](https://learn.microsoft.com/azure/ai-services/language-service/named-entity-recognition/overview)
- [ExtraÃ§Ã£o de frases-chave](https://learn.microsoft.com/azure/ai-services/language-service/key-phrase-extraction/overview)
