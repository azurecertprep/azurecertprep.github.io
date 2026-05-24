---
sidebar_position: 10
title: "Desafio 39: Modelos de TraduÃ§Ã£o Personalizados"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 39: Modelos de TraduÃ§Ã£o Personalizados

:::info Tempo Estimado
**60 min** | **Custo**: $5-15 (estimado) | **DomÃ­nio**: Implementar SoluÃ§Ãµes de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Implementar modelos de traduÃ§Ã£o de texto personalizados
- Treinar e avaliar traduÃ§Ã£o personalizada com dados paralelos
- Publicar e consumir modelos de traduÃ§Ã£o personalizados
- Implementar respostas a perguntas em mÃºltiplos idiomas

## VisÃ£o Geral

O Custom Translator treina modelos de traduÃ§Ã£o especÃ­ficos de domÃ­nio usando seus dados paralelos (pares de sentenÃ§as origem-destino). Isso melhora a precisÃ£o da traduÃ§Ã£o para terminologia especializada:

| Conceito | DescriÃ§Ã£o |
|----------|-----------|
| **Dados paralelos** | Pares de sentenÃ§as alinhadas nos idiomas de origem e destino |
| **PontuaÃ§Ã£o BLEU** | MÃ©trica de qualidade de traduÃ§Ã£o (0-100, maior = melhor) |
| **Category ID** | Identificador usado para rotear requisiÃ§Ãµes ao seu modelo personalizado |
| **Baseline** | Modelo de traduÃ§Ã£o geral da Microsoft (ponto de comparaÃ§Ã£o) |
| **Treinamento** | Ajuste fino do baseline com seus dados paralelos |

Multi-language Question Answering permite que uma Ãºnica base de conhecimento atenda respostas em mÃºltiplos idiomas.

:::note OperaÃ§Ãµes Baseadas no Portal
Algumas operaÃ§Ãµes do Custom Translator (criaÃ§Ã£o de projeto, upload de arquivos) sÃ£o feitas principalmente via o [portal do Custom Translator](https://portal.customtranslator.azure.ai/). Este desafio documenta o fluxo de trabalho e o consumo programÃ¡tico de modelos treinados.
:::

## PrÃ©-requisitos
- Assinatura do Azure
- Recurso Azure Translator (tier S1 para traduÃ§Ã£o personalizada)
- Dados de treinamento paralelos (arquivos TMX, XLIFF, TSV ou TXT)
- Acesso ao portal Custom Translator

## ImplementaÃ§Ã£o

### Tarefa 1: Preparar Dados de Treinamento Paralelos

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os

# Custom translation requires parallel data - aligned sentences
# Format: Tab-separated source and target (or separate aligned files)

# Example: Medical domain English-to-Spanish parallel data
training_data_tsv = """The patient presents with acute bronchitis.\tEl paciente presenta bronquitis aguda.
Administer 500mg amoxicillin three times daily.\tAdministrar 500mg de amoxicilina tres veces al dÃ­a.
Blood pressure reading is 120 over 80.\tLa lectura de presiÃ³n arterial es 120 sobre 80.
The MRI shows no abnormalities.\tLa resonancia magnÃ©tica no muestra anomalÃ­as.
Schedule a follow-up appointment in two weeks.\tProgramar una cita de seguimiento en dos semanas.
Patient reports chest pain and shortness of breath.\tEl paciente reporta dolor en el pecho y dificultad para respirar.
Prescribe ibuprofen 400mg as needed for pain.\tRecetar ibuprofeno 400mg segÃºn sea necesario para el dolor.
The biopsy results are benign.\tLos resultados de la biopsia son benignos.
Apply topical antibiotic ointment twice daily.\tAplicar ungÃ¼ento antibiÃ³tico tÃ³pico dos veces al dÃ­a.
Refer patient to cardiology for further evaluation.\tReferir al paciente a cardiologÃ­a para evaluaciÃ³n adicional."""

# Save training file
with open("medical-training-en-es.tsv", "w", encoding="utf-8") as f:
    f.write(training_data_tsv)

# Tuning data (separate set for validation)
tuning_data = """Patient exhibits symptoms of type 2 diabetes.\tEl paciente exhibe sÃ­ntomas de diabetes tipo 2.
Recommend physical therapy twice a week.\tRecomendar fisioterapia dos veces por semana.
Lab results indicate elevated cholesterol.\tLos resultados del laboratorio indican colesterol elevado."""

with open("medical-tuning-en-es.tsv", "w", encoding="utf-8") as f:
    f.write(tuning_data)

# Testing data (for BLEU evaluation)
test_data = """Administer insulin injection before meals.\tAdministrar inyecciÃ³n de insulina antes de las comidas.
The X-ray reveals a hairline fracture.\tLa radiografÃ­a revela una fractura capilar."""

with open("medical-test-en-es.tsv", "w", encoding="utf-8") as f:
    f.write(test_data)

print("Training data files created:")
print(f"  medical-training-en-es.tsv ({training_data_tsv.count(chr(10))+1} sentence pairs)")
print(f"  medical-tuning-en-es.tsv (3 sentence pairs)")
print(f"  medical-test-en-es.tsv (2 sentence pairs)")
print("\nNote: Production models need 10,000+ sentence pairs for significant improvement.")
```

</TabItem>
</Tabs>

### Tarefa 2: Fluxo de Trabalho do Custom Translator (Portal + API)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import requests
import uuid

# Custom Translator portal workflow:
# 1. Create a workspace at https://portal.customtranslator.azure.ai
# 2. Create a project (specify language pair: en â†’ es)
# 3. Upload parallel documents (training, tuning, testing)
# 4. Train the model
# 5. Publish the model (get Category ID)

# After training in the portal, you'll receive a Category ID
# Use this to route translation requests to your custom model

CATEGORY_ID = os.environ.get("CUSTOM_TRANSLATOR_CATEGORY_ID", "your-category-id")

# The BLEU score comparison after training:
print("""
Custom Translation Training Results (example):
================================================
Model: Medical-EN-ES-v1
Language pair: English â†’ Spanish
Training sentences: 10,000
BLEU Score (baseline): 42.5
BLEU Score (custom):   58.3 (+15.8 improvement)
Status: Published
Category ID: {CATEGORY_ID}

Interpretation:
  - BLEU < 30: Low quality (general model may be better for this pair)
  - BLEU 30-40: Reasonable quality
  - BLEU 40-60: Good quality
  - BLEU > 60: Excellent quality
""")
```

</TabItem>
</Tabs>

### Tarefa 3: Consumir Modelo de TraduÃ§Ã£o Personalizado

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import requests
import uuid

key = os.environ["AZURE_TRANSLATOR_KEY"]
region = os.environ["AZURE_TRANSLATOR_REGION"]
endpoint = "https://api.cognitive.microsofttranslator.com"
category_id = os.environ.get("CUSTOM_TRANSLATOR_CATEGORY_ID", "general")

def translate_with_custom_model(texts, source_lang, target_lang, category=None):
    """Translate using custom model by specifying category"""
    path = "/translate"
    params = {
        "api-version": "3.0",
        "from": source_lang,
        "to": target_lang,
    }
    if category:
        params["category"] = category  # Routes to custom model
    
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": region,
        "Content-type": "application/json",
        "X-ClientTraceId": str(uuid.uuid4())
    }
    
    body = [{"text": t} for t in texts]
    response = requests.post(endpoint + path, params=params, headers=headers, json=body)
    response.raise_for_status()
    return response.json()

# Test sentences with medical terminology
medical_texts = [
    "The patient presents with acute myocardial infarction.",
    "Administer epinephrine 0.3mg intramuscularly immediately.",
    "Schedule an echocardiogram to assess ventricular function."
]

# Compare general vs custom model
print("=== General Model (baseline) ===")
general_results = translate_with_custom_model(medical_texts, "en", "es", category="general")
for i, result in enumerate(general_results):
    print(f"  EN: {medical_texts[i]}")
    print(f"  ES: {result['translations'][0]['text']}\n")

print("=== Custom Model (medical domain) ===")
custom_results = translate_with_custom_model(medical_texts, "en", "es", category=category_id)
for i, result in enumerate(custom_results):
    print(f"  EN: {medical_texts[i]}")
    print(f"  ES: {result['translations'][0]['text']}\n")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
TRANSLATOR_KEY="<key>"
REGION="eastus2"
CATEGORY_ID="<your-category-id>"

# Translate with custom model (add category parameter)
curl -s "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=es&category=${CATEGORY_ID}" \
  -H "Ocp-Apim-Subscription-Key: ${TRANSLATOR_KEY}" \
  -H "Ocp-Apim-Subscription-Region: ${REGION}" \
  -H "Content-Type: application/json" \
  -d '[{"text": "The patient presents with acute myocardial infarction."}]' \
  | jq '.[0].translations[0].text'

# Compare with general model (category=general or omit)
curl -s "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=es&category=general" \
  -H "Ocp-Apim-Subscription-Key: ${TRANSLATOR_KEY}" \
  -H "Ocp-Apim-Subscription-Region: ${REGION}" \
  -H "Content-Type: application/json" \
  -d '[{"text": "The patient presents with acute myocardial infarction."}]' \
  | jq '.[0].translations[0].text'
```

</TabItem>
</Tabs>

### Tarefa 4: Question Answering em MÃºltiplos Idiomas

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.language.questionanswering import QuestionAnsweringClient
from azure.core.credentials import AzureKeyCredential

# Multi-language QA: one knowledge base serving multiple languages
# The project must be created with multilingualResource=True

qa_client = QuestionAnsweringClient(
    endpoint=os.environ["AZURE_AI_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["AZURE_AI_KEY"])
)

# Query in different languages against the same knowledge base
multilingual_queries = [
    ("What is Azure AI?", "en"),
    ("Â¿QuÃ© es Azure AI?", "es"),
    ("Azure AIã¨ã¯ä½•ã§ã™ã‹ï¼Ÿ", "ja"),
    ("Qu'est-ce qu'Azure AI?", "fr")
]

print("=== Multi-Language QA ===")
for question, lang in multilingual_queries:
    response = qa_client.get_answers(
        question=question,
        project_name="faq-knowledge-base",
        deployment_name="production",
        language=lang
    )
    
    if response.answers:
        top_answer = response.answers[0]
        print(f"\n[{lang}] Q: {question}")
        print(f"     A: {top_answer.answer[:80]}...")
        print(f"     Confidence: {top_answer.confidence:.3f}")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Query in Spanish against English knowledge base
curl -s "${ENDPOINT}/language/:query-knowledgebases?projectName=faq-knowledge-base&deploymentName=production&api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Â¿QuÃ© es Azure AI?",
    "top": 1,
    "language": "es"
  }' | jq '.answers[0] | {answer: .answer[0:100], confidence: .confidenceScore}'
```

</TabItem>
</Tabs>

## SaÃ­da Esperada

```text
Training data files created:
  medical-training-en-es.tsv (10 sentence pairs)
  medical-tuning-en-es.tsv (3 sentence pairs)
  medical-test-en-es.tsv (2 sentence pairs)

Custom Translation Training Results (example):
================================================
Model: Medical-EN-ES-v1
BLEU Score (baseline): 42.5
BLEU Score (custom):   58.3 (+15.8 improvement)

=== General Model (baseline) ===
  EN: The patient presents with acute myocardial infarction.
  ES: El paciente se presenta con infarto agudo de miocardio.

=== Custom Model (medical domain) ===
  EN: The patient presents with acute myocardial infarction.
  ES: El paciente presenta infarto agudo al miocardio.

=== Multi-Language QA ===
[en] Q: What is Azure AI?
     A: Azure AI Services is a collection of cloud-based AI APIs that help developers...
     Confidence: 0.953
[es] Q: Â¿QuÃ© es Azure AI?
     A: Azure AI Services is a collection of cloud-based AI APIs...
     Confidence: 0.891
[ja] Q: Azure AIã¨ã¯ä½•ã§ã™ã‹ï¼Ÿ
     A: Azure AI Services is a collection of cloud-based AI APIs...
     Confidence: 0.845
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| Modelo personalizado nÃ£o usado | TraduÃ§Ãµes gerais retornadas | Category ID nÃ£o especificado ou incorreto | Verifique se o parÃ¢metro `category` corresponde ao Category ID do modelo publicado |
| PontuaÃ§Ã£o BLEU baixa | Nenhuma melhoria sobre o baseline | Dados de treinamento insuficientes ou alinhamento ruim | NecessÃ¡rio 10.000+ pares de sentenÃ§as alinhadas; verifique qualidade do alinhamento |
| Treinamento falha | Upload rejeitado | Formato de arquivo incorreto | Use formatos suportados: TMX, XLIFF, TSV, TXT alinhado |
| Categoria nÃ£o encontrada | Erro 400 na traduÃ§Ã£o | Modelo nÃ£o publicado ou expirado | Publique o modelo no portal Custom Translator; verifique expiraÃ§Ã£o |
| QA multi-idioma ruim | Baixa confianÃ§a entre idiomas | Projeto nÃ£o configurado como multilingual | Habilite `multilingualResource: true` ao criar o projeto |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Como vocÃª roteia uma requisiÃ§Ã£o de traduÃ§Ã£o para seu modelo personalizado?",
    options: [
      "Use um endpoint de API diferente",
      "Inclua o nome do modelo no corpo da requisiÃ§Ã£o",
      "Adicione o parÃ¢metro 'category' com o Category ID do seu modelo Ã  requisiÃ§Ã£o de traduÃ§Ã£o",
      "Modelos personalizados sÃ£o usados automaticamente uma vez publicados"
    ],
    correctAnswer: 2,
    explanation: "O parÃ¢metro category roteia requisiÃ§Ãµes para seu modelo personalizado. Sem ele (ou com category='general'), o modelo padrÃ£o da Microsoft Ã© usado."
  },
  {
    question: "Para que a pontuaÃ§Ã£o BLEU Ã© usada no Custom Translator?",
    options: [
      "Avaliar a qualidade da traduÃ§Ã£o comparando a saÃ­da do modelo personalizado com traduÃ§Ãµes de referÃªncia (escala 0-100)",
      "Medir a velocidade da traduÃ§Ã£o",
      "Calcular o custo da traduÃ§Ã£o",
      "Medir o nÃºmero de idiomas suportados"
    ],
    correctAnswer: 0,
    explanation: "BLEU (Bilingual Evaluation Understudy) mede a qualidade da traduÃ§Ã£o comparando com traduÃ§Ãµes de referÃªncia. PontuaÃ§Ãµes mais altas (0-100) indicam melhor qualidade; compare pontuaÃ§Ãµes personalizada vs baseline."
  },
  {
    question: "Que tipo de dados de treinamento o Custom Translator requer?",
    options: [
      "Apenas texto no idioma de origem â€” o modelo aprende o idioma de destino automaticamente",
      "Um dicionÃ¡rio de terminologia",
      "Exemplos de traduÃ§Ã£o do Google Translate",
      "Dados paralelos: pares de sentenÃ§as alinhadas nos idiomas de origem e destino"
    ],
    correctAnswer: 3,
    explanation: "O Custom Translator requer dados paralelos â€” pares alinhados de sentenÃ§as em ambos os idiomas. O modelo aprende padrÃµes de domÃ­nio a partir desses exemplos alinhados."
  },
  {
    question: "Como o Question Answering em mÃºltiplos idiomas funciona?",
    options: [
      "VocÃª deve criar uma base de conhecimento separada para cada idioma",
      "Uma Ãºnica base de conhecimento multilingual pode responder perguntas em mÃºltiplos idiomas usando correspondÃªncia entre idiomas",
      "As perguntas devem ser traduzidas para o idioma da KB antes de consultar",
      "Apenas bases de conhecimento em inglÃªs suportam mÃºltiplos idiomas"
    ],
    correctAnswer: 1,
    explanation: "Com multilingualResource=true, uma Ãºnica base de conhecimento pode corresponder perguntas em qualquer idioma suportado a respostas, usando compreensÃ£o semÃ¢ntica entre idiomas."
  },
  {
    question: "Qual Ã© a quantidade mÃ­nima recomendada de dados de treinamento paralelos para melhoria significativa?",
    options: [
      "10 pares de sentenÃ§as",
      "100 pares de sentenÃ§as",
      "1 milhÃ£o de pares de sentenÃ§as",
      "10.000+ pares de sentenÃ§as para melhoria significativa especÃ­fica de domÃ­nio"
    ],
    correctAnswer: 3,
    explanation: "A Microsoft recomenda 10.000+ pares de sentenÃ§as alinhadas para melhoria significativa. Mais dados (especialmente conteÃºdo diverso e especÃ­fico de domÃ­nio) geralmente produzem modelos melhores."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-translator --yes --no-wait
```

## Saiba Mais

- [VisÃ£o geral do Custom Translator](https://learn.microsoft.com/azure/ai-services/translator/custom-translator/overview)
- [Portal do Custom Translator](https://portal.customtranslator.azure.ai/)
- [ExplicaÃ§Ã£o da pontuaÃ§Ã£o BLEU](https://learn.microsoft.com/azure/ai-services/translator/custom-translator/concepts/bleu-score)
- [QA multi-idioma](https://learn.microsoft.com/azure/ai-services/language-service/question-answering/how-to/multiple-languages)
