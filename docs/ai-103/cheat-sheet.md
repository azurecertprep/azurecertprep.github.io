---
sidebar_position: 5
title: "Azure AI SDK Cheat Sheet"
---

# Azure AI SDK Cheat Sheet

Quick-reference for the SDKs and REST APIs tested on AI-103. Keep this handy during your study — but remember, you can't use it during the exam!

## Authentication Patterns

### Key-Based Authentication (Development)

```python
from azure.core.credentials import AzureKeyCredential

credential = AzureKeyCredential(key)
client = SomeClient(endpoint, credential)
```

### Identity-Based Authentication (Production)

```python
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
client = SomeClient(endpoint, credential)
```

:::tip When to use which?
- **AzureKeyCredential**: Quick prototyping, tutorials, single-service access
- **DefaultAzureCredential**: Production apps, managed identity, multi-service, RBAC-based
:::

## Common Environment Variables

```bash
AZURE_AI_SERVICES_ENDPOINT=https://<name>.cognitiveservices.azure.com/
AZURE_AI_SERVICES_KEY=<key>
AZURE_OPENAI_ENDPOINT=https://<name>.openai.azure.com/
AZURE_OPENAI_API_KEY=<key>
AZURE_AI_SEARCH_ENDPOINT=https://<name>.search.windows.net
AZURE_AI_SEARCH_KEY=<key>
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://<name>.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=<key>
```

---

## Azure AI Vision

### Python SDK

```python
from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.ai.vision.imageanalysis.models import VisualFeatures
from azure.core.credentials import AzureKeyCredential

client = ImageAnalysisClient(endpoint, AzureKeyCredential(key))

result = client.analyze(
    image_url="https://example.com/image.jpg",
    visual_features=[
        VisualFeatures.CAPTION,
        VisualFeatures.TAGS,
        VisualFeatures.OBJECTS,
        VisualFeatures.READ,
    ]
)

print(result.caption.text)           # "A person standing near a car"
print(result.caption.confidence)     # 0.95
for tag in result.tags.list:
    print(f"{tag.name}: {tag.confidence:.2f}")
```

### REST API

```bash
POST {endpoint}/computervision/imageanalysis:analyze?api-version=2024-02-01
     &features=caption,tags,objects,read

Headers:
  Ocp-Apim-Subscription-Key: {key}
  Content-Type: application/json

Body:
  { "url": "https://example.com/image.jpg" }
```

### Install

```bash
pip install azure-ai-vision-imageanalysis
```

---

## Custom Vision

### Training (Python SDK)

```python
from azure.cognitiveservices.vision.customvision.training import CustomVisionTrainingClient
from azure.cognitiveservices.vision.customvision.training.models import ImageFileCreateBatch, ImageFileCreateEntry

trainer = CustomVisionTrainingClient(training_endpoint, AzureKeyCredential(training_key))

project = trainer.create_project("MyProject", classification_type="Multiclass")
tag = trainer.create_tag(project.id, "cat")

# Add images
trainer.create_images_from_urls(project.id, images=[...])

# Train
iteration = trainer.train_project(project.id)
```

### Prediction (Python SDK)

```python
from azure.cognitiveservices.vision.customvision.prediction import CustomVisionPredictionClient

predictor = CustomVisionPredictionClient(prediction_endpoint, AzureKeyCredential(prediction_key))

results = predictor.classify_image(project_id, publish_name, image_data)
for prediction in results.predictions:
    print(f"{prediction.tag_name}: {prediction.probability:.2%}")
```

---

## Azure AI Language

### Text Analytics (Python SDK)

```python
from azure.ai.textanalytics import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential

client = TextAnalyticsClient(endpoint, AzureKeyCredential(key))

# Sentiment Analysis
result = client.analyze_sentiment(["I love Azure AI services!"])
print(result[0].sentiment)  # "positive"

# Named Entity Recognition
result = client.recognize_entities(["Microsoft is based in Redmond, Washington."])
for entity in result[0].entities:
    print(f"{entity.text} ({entity.category}): {entity.confidence_score:.2f}")

# Key Phrase Extraction
result = client.extract_key_phrases(["Azure AI provides powerful ML capabilities."])
print(result[0].key_phrases)  # ["Azure AI", "powerful ML capabilities"]

# PII Detection
result = client.recognize_pii_entities(["My SSN is 123-45-6789"])
print(result[0].redacted_text)  # "My SSN is ***********"

# Language Detection
result = client.detect_language(["Bonjour le monde"])
print(result[0].primary_language.name)  # "French"
```

### Conversational Language Understanding (CLU)

```python
from azure.ai.language.conversations import ConversationAnalysisClient

client = ConversationAnalysisClient(endpoint, AzureKeyCredential(key))

result = client.analyze_conversation(
    task={
        "kind": "Conversation",
        "analysisInput": {
            "conversationItem": {
                "id": "1",
                "participantId": "user",
                "text": "Book a flight to Paris tomorrow"
            }
        },
        "parameters": {
            "projectName": "travel-app",
            "deploymentName": "production"
        }
    }
)

top_intent = result["result"]["prediction"]["topIntent"]
entities = result["result"]["prediction"]["entities"]
```

### Custom Question Answering

```python
from azure.ai.language.questionanswering import QuestionAnsweringClient

client = QuestionAnsweringClient(endpoint, AzureKeyCredential(key))

output = client.get_answers(
    question="What is Azure AI?",
    project_name="my-kb",
    deployment_name="production"
)

for answer in output.answers:
    print(f"{answer.answer} (confidence: {answer.confidence:.2f})")
```

### Install

```bash
pip install azure-ai-textanalytics azure-ai-language-conversations azure-ai-language-questionanswering
```

---

## Azure AI Speech

### Speech-to-Text (Python SDK)

```python
import azure.cognitiveservices.speech as speechsdk

speech_config = speechsdk.SpeechConfig(subscription=key, region=region)
speech_config.speech_recognition_language = "en-US"

audio_config = speechsdk.audio.AudioConfig(filename="audio.wav")
recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

result = recognizer.recognize_once()
if result.reason == speechsdk.ResultReason.RecognizedSpeech:
    print(f"Recognized: {result.text}")
```

### Text-to-Speech (Python SDK)

```python
speech_config = speechsdk.SpeechConfig(subscription=key, region=region)
speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"

synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
result = synthesizer.speak_text_async("Hello from Azure AI!").get()
```

### Speech Translation

```python
translation_config = speechsdk.translation.SpeechTranslationConfig(
    subscription=key, region=region
)
translation_config.speech_recognition_language = "en-US"
translation_config.add_target_language("fr")
translation_config.add_target_language("de")

recognizer = speechsdk.translation.TranslationRecognizer(
    translation_config=translation_config
)
result = recognizer.recognize_once()
print(result.translations["fr"])  # French translation
```

### Install

```bash
pip install azure-cognitiveservices-speech
```

---

## Azure OpenAI

### Chat Completions (Python SDK)

```python
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version="2024-06-01"
)

response = client.chat.completions.create(
    model="gpt-4o",  # This is your DEPLOYMENT name
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain RAG in one sentence."}
    ],
    temperature=0.7,
    max_tokens=150
)

print(response.choices[0].message.content)
print(f"Tokens used: {response.usage.total_tokens}")
```

### Embeddings

```python
response = client.embeddings.create(
    model="text-embedding-ada-002",  # Deployment name
    input="Azure AI Search enables vector search"
)

embedding_vector = response.data[0].embedding  # List of 1536 floats
```

### Image Generation (DALL-E)

```python
response = client.images.generate(
    model="dall-e-3",  # Deployment name
    prompt="A futuristic city with Azure clouds",
    size="1024x1024",
    quality="standard",
    n=1
)

image_url = response.data[0].url
```

### Function Calling

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's the weather in Seattle?"}],
    tools=[{
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"}
                },
                "required": ["location"]
            }
        }
    }]
)

tool_call = response.choices[0].message.tool_calls[0]
print(tool_call.function.name)       # "get_weather"
print(tool_call.function.arguments)  # '{"location": "Seattle"}'
```

### REST API

```bash
POST {endpoint}/openai/deployments/{deployment}/chat/completions?api-version=2024-06-01

Headers:
  api-key: {key}
  Content-Type: application/json

Body:
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7
}
```

### Install

```bash
pip install openai
```

---

## Azure AI Search

### Create Index (Python SDK)

```python
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex, SimpleField, SearchableField,
    SearchFieldDataType, VectorSearch,
    HnswAlgorithmConfiguration, VectorSearchProfile,
    SearchField
)

index_client = SearchIndexClient(endpoint, AzureKeyCredential(key))

fields = [
    SimpleField(name="id", type=SearchFieldDataType.String, key=True),
    SearchableField(name="content", type=SearchFieldDataType.String),
    SearchField(
        name="content_vector",
        type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
        searchable=True,
        vector_search_dimensions=1536,
        vector_search_profile_name="my-vector-profile"
    )
]

vector_search = VectorSearch(
    algorithms=[HnswAlgorithmConfiguration(name="my-hnsw")],
    profiles=[VectorSearchProfile(name="my-vector-profile", algorithm_configuration_name="my-hnsw")]
)

index = SearchIndex(name="my-index", fields=fields, vector_search=vector_search)
index_client.create_or_update_index(index)
```

### Search Documents (Hybrid + Vector)

```python
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery

search_client = SearchClient(endpoint, "my-index", AzureKeyCredential(key))

# Vector query
vector_query = VectorizedQuery(
    vector=query_embedding,  # List of floats
    k_nearest_neighbors=5,
    fields="content_vector"
)

results = search_client.search(
    search_text="Azure AI capabilities",  # Hybrid: text + vector
    vector_queries=[vector_query],
    top=5
)

for result in results:
    print(f"{result['content']} (score: {result['@search.score']:.4f})")
```

### REST API

```bash
POST {endpoint}/indexes/my-index/docs/search?api-version=2024-07-01

Headers:
  api-key: {key}
  Content-Type: application/json

Body:
{
  "search": "Azure AI",
  "vectorQueries": [{
    "kind": "vector",
    "vector": [0.1, 0.2, ...],
    "fields": "content_vector",
    "k": 5
  }],
  "top": 5
}
```

### Install

```bash
pip install azure-search-documents
```

---

## Azure Document Intelligence

### Analyze Document (Python SDK)

```python
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest

client = DocumentIntelligenceClient(endpoint, AzureKeyCredential(key))

# Analyze with prebuilt model
poller = client.begin_analyze_document(
    "prebuilt-invoice",
    AnalyzeDocumentRequest(url_source="https://example.com/invoice.pdf")
)
result = poller.result()

for document in result.documents:
    print(f"Invoice to: {document.fields['CustomerName'].content}")
    print(f"Total: {document.fields['InvoiceTotal'].content}")

# Available prebuilt models:
# prebuilt-invoice, prebuilt-receipt, prebuilt-idDocument,
# prebuilt-businessCard, prebuilt-layout, prebuilt-read
```

### REST API

```bash
POST {endpoint}/documentintelligence/documentModels/prebuilt-invoice:analyze?api-version=2024-02-29-preview

Headers:
  Ocp-Apim-Subscription-Key: {key}
  Content-Type: application/json

Body:
  { "urlSource": "https://example.com/invoice.pdf" }
```

### Install

```bash
pip install azure-ai-documentintelligence
```

---

## Quick Reference Table

| Service | Python Package | Client Class |
|---------|---------------|--------------|
| AI Vision | `azure-ai-vision-imageanalysis` | `ImageAnalysisClient` |
| Text Analytics | `azure-ai-textanalytics` | `TextAnalyticsClient` |
| CLU | `azure-ai-language-conversations` | `ConversationAnalysisClient` |
| Question Answering | `azure-ai-language-questionanswering` | `QuestionAnsweringClient` |
| Speech | `azure-cognitiveservices-speech` | `SpeechRecognizer` / `SpeechSynthesizer` |
| OpenAI | `openai` | `AzureOpenAI` |
| AI Search | `azure-search-documents` | `SearchClient` / `SearchIndexClient` |
| Document Intelligence | `azure-ai-documentintelligence` | `DocumentIntelligenceClient` |
| Authentication | `azure-identity` | `DefaultAzureCredential` |

---

**Ready to use these SDKs hands-on?** Start with [Challenge 01](/docs/ai-103/plan-manage/challenge-01).
