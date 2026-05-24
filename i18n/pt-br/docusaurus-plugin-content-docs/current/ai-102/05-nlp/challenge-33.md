---
sidebar_position: 4
title: "Desafio 33: TraduÃ§Ã£o de Texto e Documentos"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 33: TraduÃ§Ã£o de Texto e Documentos

:::info Tempo Estimado
**50 min** | **Custo**: $2-5 (estimado) | **DomÃ­nio**: Implementar SoluÃ§Ãµes de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Traduzir texto usando o serviÃ§o Azure Translator
- Traduzir documentos preservando a formataÃ§Ã£o
- Implementar modelos de traduÃ§Ã£o personalizados para termos especÃ­ficos de domÃ­nio

## VisÃ£o Geral

O Azure Translator fornece:

| Recurso | DescriÃ§Ã£o |
|---------|-----------|
| **Text Translation** | TraduÃ§Ã£o em tempo real de texto (atÃ© 50.000 caracteres) |
| **Document Translation** | Traduzir documentos inteiros preservando o layout |
| **Custom Translator** | Treinar modelos para terminologia de domÃ­nio |
| **TransliteraÃ§Ã£o** | Converter scripts (ex.: kanji japonÃªs â†’ romaji) |
| **DetecÃ§Ã£o de Idioma** | Detectar automaticamente o idioma de origem |
| **DicionÃ¡rio** | Buscar traduÃ§Ãµes alternativas |

O Text Translator usa um **endpoint global**: `https://api.cognitive.microsofttranslator.com`

## PrÃ©-requisitos
- Assinatura do Azure
- Recurso Azure Translator
- Python 3.9+ com biblioteca `requests`
- Para Document Translation: contÃªiner Azure Blob Storage

## ImplementaÃ§Ã£o

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
        print(f"  â†’ [{translation['to']}] {translation['text']}")
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

### Tarefa 3: TraduÃ§Ã£o de Documentos (Lote)

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

### Tarefa 4: TransliteraÃ§Ã£o

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
results = transliterate(["ã“ã‚“ã«ã¡ã¯ä¸–ç•Œ"], "ja", "Jpan", "Latn")
for r in results:
    print(f"Transliterated: {r['text']}")  # "konnichiwa sekai"

# Convert Hindi Devanagari to Latin
results = transliterate(["à¤¨à¤®à¤¸à¥à¤¤à¥‡ à¤¦à¥à¤¨à¤¿à¤¯à¤¾"], "hi", "Deva", "Latn")
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
  -d '[{"text": "ã“ã‚“ã«ã¡ã¯ä¸–ç•Œ"}]' | jq '.[0].text'
```

</TabItem>
</Tabs>

## SaÃ­da Esperada

```text
Source: 'Azure AI services make it easy to build intelligent applications.'
  Detected language: en (1.00)
  â†’ [es] Los servicios de Azure AI facilitan la creaciÃ³n de aplicaciones inteligentes.
  â†’ [fr] Les services Azure AI facilitent la crÃ©ation d'applications intelligentes.
  â†’ [ja] Azure AIã‚µãƒ¼ãƒ“ã‚¹ã‚’ä½¿ç”¨ã™ã‚‹ã¨ã€ã‚¤ãƒ³ãƒ†ãƒªã‚¸ã‚§ãƒ³ãƒˆãªã‚¢ãƒ—ãƒªã‚±ãƒ¼ã‚·ãƒ§ãƒ³ã‚’ç°¡å˜ã«æ§‹ç¯‰ã§ãã¾ã™ã€‚

Source: 'The weather in Seattle is rainy today.'
  Detected language: en (1.00)
  â†’ [es] El clima en Seattle estÃ¡ lluvioso hoy.
  â†’ [fr] Le temps Ã  Seattle est pluvieux aujourd'hui.
  â†’ [ja] ä»Šæ—¥ã®ã‚·ã‚¢ãƒˆãƒ«ã®å¤©æ°—ã¯é›¨ã§ã™ã€‚

Transliterated: konnichiwa sekai
Transliterated: namaste duniya
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| 401 Unauthorized | Falha na autenticaÃ§Ã£o | Header de regiÃ£o ausente | Inclua o header `Ocp-Apim-Subscription-Region` |
| TraduÃ§Ãµes vazias | Nenhum resultado | ParÃ¢metro `to` ausente | Especifique pelo menos um idioma de destino |
| Idioma errado detectado | TraduÃ§Ã£o incorreta | Texto curto ou ambÃ­guo | Especifique o parÃ¢metro `from` explicitamente para origem conhecida |
| Document translation 400 | Bad request | Token SAS ou contÃªiner invÃ¡lido | Verifique se o SAS tem permissÃµes de leitura (origem) e escrita (destino) |
| Erro de transliteraÃ§Ã£o | Script nÃ£o suportado | CÃ³digo de script invÃ¡lido | Verifique scripts suportados por idioma via endpoint `/languages` |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual Ã© o endpoint global para a API de texto do Azure Translator?",
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
    question: "Qual header Ã© necessÃ¡rio alÃ©m da chave de assinatura para requisiÃ§Ãµes do Translator?",
    options: [
      "Ocp-Apim-Subscription-Region (especificando a regiÃ£o Azure do recurso)",
      "Content-Length",
      "Accept-Language",
      "X-Forwarded-For"
    ],
    correctAnswer: 0,
    explanation: "O header Ocp-Apim-Subscription-Region Ã© necessÃ¡rio para rotear a requisiÃ§Ã£o ao endpoint regional correto. Sem ele, as requisiÃ§Ãµes falham com 401."
  },
  {
    question: "Como o Document Translation difere do Text Translation?",
    options: [
      "Document Translation Ã© sÃ­ncrono; Text Translation Ã© assÃ­ncrono",
      "Document Translation suporta mais idiomas",
      "NÃ£o hÃ¡ diferenÃ§a â€” usam o mesmo endpoint",
      "Document Translation traduz arquivos inteiros (preservando formataÃ§Ã£o) via Blob Storage; Text Translation lida com strings de texto puro"
    ],
    correctAnswer: 3,
    explanation: "Document Translation Ã© assÃ­ncrono â€” traduz arquivos inteiros (Word, PDF, etc.) entre contÃªineres Blob Storage preservando a formataÃ§Ã£o e layout originais."
  },
  {
    question: "O que a transliteraÃ§Ã£o faz?",
    options: [
      "Traduz texto de um idioma para outro",
      "Converte texto de um sistema de escrita para outro dentro do mesmo idioma (ex.: kanji japonÃªs para romaji)",
      "Detecta o idioma do texto de entrada",
      "Corrige erros de ortografia em texto traduzido"
    ],
    correctAnswer: 1,
    explanation: "A transliteraÃ§Ã£o converte texto entre scripts sem mudar o idioma â€” ex.: kanji japonÃªs â†’ Latim (romaji), Devanagari hindi â†’ Latim."
  },
  {
    question: "Quantos idiomas de destino vocÃª pode especificar em uma Ãºnica requisiÃ§Ã£o de traduÃ§Ã£o de texto?",
    options: [
      "Apenas 1 idioma de destino por requisiÃ§Ã£o",
      "MÃ¡ximo de 2 idiomas de destino",
      "MÃºltiplos idiomas de destino repetindo o parÃ¢metro 'to'",
      "Ilimitado, mas apenas os primeiros 5 sÃ£o processados"
    ],
    correctAnswer: 2,
    explanation: "VocÃª pode traduzir para mÃºltiplos idiomas em uma requisiÃ§Ã£o especificando o parÃ¢metro 'to' mÃºltiplas vezes (ex.: to=es&to=fr&to=ja). Cada traduÃ§Ã£o aparece na resposta."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-translator --yes --no-wait
```

## Saiba Mais

- [VisÃ£o geral do Translator](https://learn.microsoft.com/azure/ai-services/translator/translator-overview)
- [InÃ­cio rÃ¡pido do Text Translation](https://learn.microsoft.com/azure/ai-services/translator/quickstart-text-rest-api)
- [Document Translation](https://learn.microsoft.com/azure/ai-services/translator/document-translation/overview)
- [Custom Translator](https://learn.microsoft.com/azure/ai-services/translator/custom-translator/overview)
