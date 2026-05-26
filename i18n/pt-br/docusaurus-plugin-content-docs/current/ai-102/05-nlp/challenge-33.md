---
sidebar_position: 4
title: "Desafio 33: Tradução de Texto e Documentos"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 33: Tradução de Texto e Documentos

:::info Tempo Estimado
**50 min** | **Custo**: $2-5 (estimado) | **Domínio**: Implementar Soluções de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Traduzir texto usando o serviço Azure Translator
- Traduzir documentos preservando a formatação
- Implementar modelos de tradução personalizados para termos específicos de domínio

## Visão Geral

O Azure Translator fornece:

| Recurso | Descrição |
|---------|-----------|
| **Text Translation** | Tradução em tempo real de texto (até 50.000 caracteres) |
| **Document Translation** | Traduzir documentos inteiros preservando o layout |
| **Custom Translator** | Treinar modelos para terminologia de domínio |
| **Transliteração** | Converter scripts (ex.: kanji japonês → romaji) |
| **Detecção de Idioma** | Detectar automaticamente o idioma de origem |
| **Dicionário** | Buscar traduções alternativas |

O Text Translator usa um **endpoint global**: `https://api.cognitive.microsofttranslator.com`

## Pré-requisitos
- Assinatura do Azure
- Recurso Azure Translator
- Python 3.9+ com biblioteca `requests`
- Para Document Translation: contêiner Azure Blob Storage

## Implementação

### Tarefa 1: Criar Recurso do Translator

```bash
az group create --name rg-ai102-translator --location eastus2

az cognitiveservices account create \
  --name translator-ai102 \
  --resource-group rg-ai102-translator \
  --kind TextTranslation \
  --sku S1 \
  --location eastus2

TRANSLATOR_KEY=$(az cognitiveservices account keys list --name translator-ai102 --resource-group rg-ai102-translator --query key1 -o tsv)
TRANSLATOR_REGION="eastus2"
```

### Tarefa 2: Traduzir Texto

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import requests
import uuid

key = os.environ["AZURE_TRANSLATOR_KEY"]
region = os.environ["AZURE_TRANSLATOR_REGION"]
endpoint = "https://api.cognitive.microsofttranslator.com"

def translate_text(texts, target_languages, source_language=None):
    """Translate text to one or more target languages"""
    path = "/translate"
    params = {
        "api-version": "3.0",
        "to": target_languages
    }
    if source_language:
        params["from"] = source_language
    
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": region,
        "Content-type": "application/json",
        "X-ClientTraceId": str(uuid.uuid4())
    }
    
    body = [{"text": t} for t in texts]
    
    response = requests.post(
        endpoint + path,
        params=params,
        headers=headers,
        json=body
    )
    response.raise_for_status()
    return response.json()

# Translate to multiple languages simultaneously
texts = [
    "Azure AI services make it easy to build intelligent applications.",
    "The weather in Seattle is rainy today."
]

results = translate_text(texts, target_languages=["es", "fr", "ja"])

for i, result in enumerate(results):
    detected = result.get("detectedLanguage", {})
    print(f"\nSource: '{texts[i]}'")
    if detected:
        print(f"  Detected language: {detected['language']} ({detected['score']:.2f})")
    for translation in result["translations"]:
        print(f"  → [{translation['to']}] {translation['text']}")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
TRANSLATOR_KEY="<your-key>"
REGION="eastus2"

# Translate text to multiple languages
curl -s "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=es&to=fr&to=ja" \
  -H "Ocp-Apim-Subscription-Key: ${TRANSLATOR_KEY}" \
  -H "Ocp-Apim-Subscription-Region: ${REGION}" \
  -H "Content-Type: application/json" \
  -d '[{"text": "Azure AI services make it easy to build intelligent apps."}]' \
  | jq '.[0].translations[] | {language: .to, text}'
```

</TabItem>
</Tabs>

### Tarefa 3: Tradução de Documentos (Lote)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import time

# Document Translation requires Azure Blob Storage
# Source container: contains documents to translate
# Target container: receives translated documents

translator_endpoint = os.environ.get("AZURE_TRANSLATOR_DOCUMENT_ENDPOINT",
    "https://translator-ai102.cognitiveservices.azure.com")

def translate_documents(source_url, target_url, target_language):
    """Translate all documents in source container to target container"""
    path = "/translator/document/batches"
    url = translator_endpoint + path
    
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/json"
    }
    
    body = {
        "inputs": [
            {
                "source": {
                    "sourceUrl": source_url,
                    "language": "en"
                },
                "targets": [
                    {
                        "targetUrl": target_url,
                        "language": target_language
                    }
                ]
            }
        ]
    }
    
    response = requests.post(url, headers=headers, json=body, params={"api-version": "2024-05-01"})
    
    if response.status_code == 202:
        operation_url = response.headers["Operation-Location"]
        print(f"Translation started: {operation_url}")
        return operation_url
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None

def poll_translation_status(operation_url):
    """Poll until translation completes"""
    headers = {"Ocp-Apim-Subscription-Key": key}
    
    while True:
        response = requests.get(operation_url, headers=headers)
        result = response.json()
        status = result["status"]
        print(f"  Status: {status}")
        
        if status in ["Succeeded", "Failed", "Cancelled"]:
            return result
        time.sleep(5)

# Example usage (requires storage SAS URLs)
source_sas = "https://storage.blob.core.windows.net/source-docs?sv=...&sig=..."
target_sas = "https://storage.blob.core.windows.net/translated-es?sv=...&sig=..."

# operation_url = translate_documents(source_sas, target_sas, "es")
# result = poll_translation_status(operation_url)
print("Document translation configured (requires Blob Storage SAS URLs)")
```

</TabItem>
</Tabs>

### Tarefa 4: Transliteração

<Tabs>
<TabItem value="python" label="Python SDK">

```python
def transliterate(texts, language, from_script, to_script):
    """Convert text from one script to another"""
    path = "/transliterate"
    params = {
        "api-version": "3.0",
        "language": language,
        "fromScript": from_script,
        "toScript": to_script
    }
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": region,
        "Content-type": "application/json"
    }
    body = [{"text": t} for t in texts]
    
    response = requests.post(endpoint + path, params=params, headers=headers, json=body)
    return response.json()

# Convert Japanese to Latin script
results = transliterate(["こんにちは世界"], "ja", "Jpan", "Latn")
for r in results:
    print(f"Transliterated: {r['text']}")  # "konnichiwa sekai"

# Convert Hindi Devanagari to Latin
results = transliterate(["नमस्ते दुनिया"], "hi", "Deva", "Latn")
for r in results:
    print(f"Transliterated: {r['text']}")  # "namaste duniya"
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Transliterate Japanese to Latin
curl -s "https://api.cognitive.microsofttranslator.com/transliterate?api-version=3.0&language=ja&fromScript=Jpan&toScript=Latn" \
  -H "Ocp-Apim-Subscription-Key: ${TRANSLATOR_KEY}" \
  -H "Ocp-Apim-Subscription-Region: ${REGION}" \
  -H "Content-Type: application/json" \
  -d '[{"text": "こんにちは世界"}]' | jq '.[0].text'
```

</TabItem>
</Tabs>

## Saída Esperada

```text
Source: 'Azure AI services make it easy to build intelligent applications.'
  Detected language: en (1.00)
  → [es] Los servicios de Azure AI facilitan la creación de aplicaciones inteligentes.
  → [fr] Les services Azure AI facilitent la création d'applications intelligentes.
  → [ja] Azure AIサービスを使用すると、インテリジェントなアプリケーションを簡単に構築できます。

Source: 'The weather in Seattle is rainy today.'
  Detected language: en (1.00)
  → [es] El clima en Seattle está lluvioso hoy.
  → [fr] Le temps à Seattle est pluvieux aujourd'hui.
  → [ja] 今日のシアトルの天気は雨です。

Transliterated: konnichiwa sekai
Transliterated: namaste duniya
```

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| 401 Unauthorized | Falha na autenticação | Header de região ausente | Inclua o header `Ocp-Apim-Subscription-Region` |
| Traduções vazias | Nenhum resultado | Parâmetro `to` ausente | Especifique pelo menos um idioma de destino |
| Idioma errado detectado | Tradução incorreta | Texto curto ou ambíguo | Especifique o parâmetro `from` explicitamente para origem conhecida |
| Document translation 400 | Bad request | Token SAS ou contêiner inválido | Verifique se o SAS tem permissões de leitura (origem) e escrita (destino) |
| Erro de transliteração | Script não suportado | Código de script inválido | Verifique scripts suportados por idioma via endpoint `/languages` |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é o endpoint global para a API de texto do Azure Translator?",
    options: [
      "https://<resource>.cognitiveservices.azure.com/translate",
      "https://translator.azure.com/api",
      "https://api.cognitive.microsofttranslator.com",
      "https://<resource>.translator.azure.com"
    ],
    correctAnswer: 2,
    explanation: "O Text Translator usa o endpoint global https://api.cognitive.microsofttranslator.com. Ele requer o header Ocp-Apim-Subscription-Region para roteamento regional."
  },
  {
    question: "Qual header é necessário além da chave de assinatura para requisições do Translator?",
    options: [
      "Ocp-Apim-Subscription-Region (especificando a região Azure do recurso)",
      "Content-Length",
      "Accept-Language",
      "X-Forwarded-For"
    ],
    correctAnswer: 0,
    explanation: "O header Ocp-Apim-Subscription-Region é necessário para rotear a requisição ao endpoint regional correto. Sem ele, as requisições falham com 401."
  },
  {
    question: "Como o Document Translation difere do Text Translation?",
    options: [
      "Document Translation é síncrono; Text Translation é assíncrono",
      "Document Translation suporta mais idiomas",
      "Não há diferença — usam o mesmo endpoint",
      "Document Translation traduz arquivos inteiros (preservando formatação) via Blob Storage; Text Translation lida com strings de texto puro"
    ],
    correctAnswer: 3,
    explanation: "Document Translation é assíncrono — traduz arquivos inteiros (Word, PDF, etc.) entre contêineres Blob Storage preservando a formatação e layout originais."
  },
  {
    question: "O que a transliteração faz?",
    options: [
      "Traduz texto de um idioma para outro",
      "Converte texto de um sistema de escrita para outro dentro do mesmo idioma (ex.: kanji japonês para romaji)",
      "Detecta o idioma do texto de entrada",
      "Corrige erros de ortografia em texto traduzido"
    ],
    correctAnswer: 1,
    explanation: "A transliteração converte texto entre scripts sem mudar o idioma — ex.: kanji japonês → Latim (romaji), Devanagari hindi → Latim."
  },
  {
    question: "Quantos idiomas de destino você pode especificar em uma única requisição de tradução de texto?",
    options: [
      "Apenas 1 idioma de destino por requisição",
      "Máximo de 2 idiomas de destino",
      "Múltiplos idiomas de destino repetindo o parâmetro 'to'",
      "Ilimitado, mas apenas os primeiros 5 são processados"
    ],
    correctAnswer: 2,
    explanation: "Você pode traduzir para múltiplos idiomas em uma requisição especificando o parâmetro 'to' múltiplas vezes (ex.: to=es&to=fr&to=ja). Cada tradução aparece na resposta."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-translator --yes --no-wait
```

## Saiba Mais

- [Visão geral do Translator](https://learn.microsoft.com/azure/ai-services/translator/translator-overview)
- [Início rápido do Text Translation](https://learn.microsoft.com/azure/ai-services/translator/quickstart-text-rest-api)
- [Document Translation](https://learn.microsoft.com/azure/ai-services/translator/document-translation/overview)
- [Custom Translator](https://learn.microsoft.com/azure/ai-services/translator/custom-translator/overview)
