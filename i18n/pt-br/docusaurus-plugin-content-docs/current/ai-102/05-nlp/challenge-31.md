---
sidebar_position: 2
title: "Desafio 31: Text Analytics - Frases-chave, Entidades, Sentimento"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 31: Text Analytics - Frases-chave, Entidades, Sentimento

:::info Tempo Estimado
**45 min** | **Custo**: $1-3 (estimado) | **Domínio**: Implementar Soluções de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Extrair frases-chave de texto
- Reconhecer entidades nomeadas e entidades vinculadas
- Determinar sentimento com mineração de opinião
- Detectar idioma

## Visão Geral

O Azure AI Language (Text Analytics) fornece capacidades de NLP:

| Recurso | Descrição |
|---------|-----------|
| **Análise de Sentimento** | Positivo/neutro/negativo com confiança + mineração de opinião |
| **Extração de Frases-chave** | Identificar os principais pontos de discussão |
| **Reconhecimento de Entidades Nomeadas (NER)** | Detectar entidades (Pessoa, Local, Organização, DateTime, etc.) |
| **Vinculação de Entidades** | Vincular entidades à base de conhecimento da Wikipedia |
| **Detecção de Idioma** | Identificar o idioma do texto |

O cliente suporta **operações em lote** — envie múltiplos documentos em uma única requisição para eficiência.

## Pré-requisitos
- Assinatura do Azure
- Recurso Azure AI Language (ou multi-serviço)
- Python 3.9+ ou .NET 8
- Pacote: `azure-ai-textanalytics` (v5.3+)

## Implementação

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

### Tarefa 2: Analisar Sentimento com Mineração de Opinião

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
        print(f"  Sentence: '{sentence.text[:40]}...' → {sentence.sentiment}")
        
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
            print(f"  '{entity.text}' → {entity.category}"
                  f"{f'/{entity.subcategory}' if entity.subcategory else ''}"
                  f" (confidence: {entity.confidence_score:.3f})")

# Entity Linking (to Wikipedia)
linked_results = client.recognize_linked_entities(documents, language="en")
print("\n=== LINKED ENTITIES ===")
for idx, result in enumerate(linked_results):
    if not result.is_error:
        for entity in result.entities:
            print(f"  '{entity.name}' → {entity.url}")
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

### Tarefa 4: Detecção de Idioma

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Language detection
multilingual_docs = [
    "Hello, how are you today?",
    "Bonjour, comment allez-vous?",
    "こんにちは、元気ですか？",
    "Hola, ¿cómo estás?"
]

lang_results = client.detect_language(multilingual_docs)
print("=== LANGUAGE DETECTION ===")
for idx, result in enumerate(lang_results):
    if not result.is_error:
        lang = result.primary_language
        print(f"  '{multilingual_docs[idx][:30]}...' → {lang.name} ({lang.iso6391_name}) "
              f"confidence: {lang.confidence_score:.3f}")
```

</TabItem>
</Tabs>

## Saída Esperada

```text
Document 0: 'The hotel room was clean and spacious, but the s...'
  Overall: mixed (pos=0.450, neu=0.100, neg=0.450)
  Sentence: 'The hotel room was clean and sp...' → mixed
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
  'Microsoft' → Organization (confidence: 0.990)
  'Satya Nadella' → Person (confidence: 0.985)
  'Azure AI' → Product (confidence: 0.920)
  'Build 2024' → Event (confidence: 0.880)
  'Seattle' → Location (confidence: 0.995)
  'May 21' → DateTime/Date (confidence: 0.970)

=== LANGUAGE DETECTION ===
  'Hello, how are you today?...' → English (en) confidence: 1.000
  'Bonjour, comment allez-vous?...' → French (fr) confidence: 1.000
  'こんにちは、元気ですか？...' → Japanese (ja) confidence: 1.000
  'Hola, ¿cómo estás?...' → Spanish (es) confidence: 1.000
```

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Resultados mistos em texto claro | Sentimento `mixed` inesperado | Mineração de opinião detecta opiniões opostas | Use sentimento no nível da sentença para granularidade |
| Frases-chave vazias | Nenhuma frase retornada | Texto muito curto ou genérico | Forneça texto substancial (10+ palavras recomendado) |
| Categoria de entidade `Unknown` | Entidades não reconhecidas | Termos específicos de domínio não estão no modelo | Use modelo NER personalizado para entidades especializadas |
| Erro em lote em um doc | `InvalidDocument` nos resultados | Documento excede 5.120 caracteres | Divida documentos longos; verifique `is_error` por documento |
| Detecção de idioma errada | Idioma incorreto | Texto em múltiplos idiomas confunde a detecção | Separe texto por idioma; use amostras mais longas |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que a mineração de opinião adiciona à análise de sentimento padrão?",
    options: [
      "Fornece pontuações de sentimento geral mais precisas",
      "Traduz o texto antes de analisar o sentimento",
      "Identifica alvos (aspectos) específicos e as avaliações (opiniões) sobre eles",
      "Detecta o idioma do texto"
    ],
    correctAnswer: 2,
    explanation: "A mineração de opinião extrai sentimento baseado em aspectos: alvos (ex.: 'room', 'service') e avaliações (ex.: 'clean', 'slow') com sua polaridade individual de sentimento."
  },
  {
    question: "Qual é o tamanho máximo de documento para uma única requisição de text analytics?",
    options: [
      "5.120 caracteres por documento (até 25 documentos por lote)",
      "1.000 caracteres por documento",
      "10.000 palavras por documento",
      "Sem limite"
    ],
    correctAnswer: 0,
    explanation: "Cada documento pode ter até 5.120 caracteres. Uma única requisição em lote pode conter até 25 documentos (ou 125.000 caracteres no total)."
  },
  {
    question: "Qual é a diferença entre Named Entity Recognition (NER) e Entity Linking?",
    options: [
      "NER é mais rápido; Entity Linking é mais preciso",
      "São o mesmo recurso com nomes diferentes",
      "NER funciona apenas em inglês; Entity Linking suporta todos os idiomas",
      "NER categoriza entidades (Person, Location, etc.); Entity Linking conecta entidades a entradas da base de conhecimento da Wikipedia"
    ],
    correctAnswer: 3,
    explanation: "NER identifica entidades e atribui categorias (Person, Org, Location, DateTime). Entity Linking vai além, vinculando entidades a entradas da Wikipedia com URLs e IDs."
  },
  {
    question: "Como você deve lidar com erros em resultados de text analytics em lote?",
    options: [
      "Capturar uma única exceção para o lote inteiro",
      "Verificar a propriedade is_error em cada resultado de documento individual",
      "Erros nunca são retornados — documentos que falharam são ignorados silenciosamente",
      "Reenviar o lote inteiro se qualquer documento falhar"
    ],
    correctAnswer: 1,
    explanation: "Em operações em lote, cada resultado de documento possui uma propriedade is_error. Alguns documentos podem ter sucesso enquanto outros falham, então você deve verificar cada resultado individualmente."
  },
  {
    question: "Qual formato de pontuação de confiança a detecção de idioma retorna?",
    options: [
      "Uma porcentagem de 0% a 100%",
      "Um inteiro de 1 a 10",
      "Um float de 0.0 a 1.0 indicando a confiança da detecção",
      "Um booleano (detectado ou não detectado)"
    ],
    correctAnswer: 2,
    explanation: "A detecção de idioma retorna uma pontuação de confiança de 0.0 a 1.0 para cada idioma detectado. Uma pontuação de 1.0 significa confiança máxima."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-nlp --yes --no-wait
```

## Saiba Mais

- [Visão geral do Text Analytics](https://learn.microsoft.com/azure/ai-services/language-service/overview)
- [Análise de sentimento](https://learn.microsoft.com/azure/ai-services/language-service/sentiment-opinion-mining/overview)
- [Reconhecimento de entidades nomeadas](https://learn.microsoft.com/azure/ai-services/language-service/named-entity-recognition/overview)
- [Extração de frases-chave](https://learn.microsoft.com/azure/ai-services/language-service/key-phrase-extraction/overview)
