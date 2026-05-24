---
sidebar_position: 3
title: "Desafio 32: DetecÃ§Ã£o e RedaÃ§Ã£o de PII"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 32: DetecÃ§Ã£o e RedaÃ§Ã£o de PII

:::info Tempo Estimado
**40 min** | **Custo**: $1-2 (estimado) | **DomÃ­nio**: Implementar SoluÃ§Ãµes de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Detectar PII (InformaÃ§Ãµes de IdentificaÃ§Ã£o Pessoal) em texto
- Redigir dados sensÃ­veis de documentos
- Configurar categorias de PII para detecÃ§Ã£o direcionada

## VisÃ£o Geral

A DetecÃ§Ã£o de PII identifica e opcionalmente redige informaÃ§Ãµes sensÃ­veis em texto. As categorias incluem:

| Categoria | Exemplos |
|-----------|----------|
| `Person` | Nomes |
| `Email` | email@domain.com |
| `PhoneNumber` | +1-555-123-4567 |
| `Address` | EndereÃ§os |
| `SSN` | NÃºmeros de Seguro Social (EUA) |
| `CreditCardNumber` | NÃºmeros de cartÃ£o de crÃ©dito |
| `IPAddress` | EndereÃ§os IP |
| `Organization` | Nomes de empresas (quando PII) |
| `DateTime` | Datas de nascimento |

A API retorna tanto as entidades detectadas quanto uma versÃ£o de **texto redigido** com PII substituÃ­do por rÃ³tulos de categoria de entidade.

## PrÃ©-requisitos
- Assinatura do Azure
- Recurso Azure AI Language
- Python 3.9+ ou .NET 8
- Pacote: `azure-ai-textanalytics` (v5.3+)

## ImplementaÃ§Ã£o

### Tarefa 1: Detectar PII em Texto

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.ai.textanalytics import TextAnalyticsClient, PiiEntityCategory
from azure.core.credentials import AzureKeyCredential

client = TextAnalyticsClient(
    endpoint=os.environ["AZURE_AI_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["AZURE_AI_KEY"])
)

documents = [
    "My name is John Smith and my email is john.smith@contoso.com. "
    "My SSN is 123-45-6789 and I live at 123 Main Street, Seattle, WA 98101. "
    "You can reach me at 555-123-4567.",
    
    "Patient Jane Doe (DOB: 03/15/1985) was seen at the clinic. "
    "Insurance ID: ABC-123456789. Credit card ending in 4532."
]

# Detect all PII
results = client.recognize_pii_entities(documents, language="en")

for idx, result in enumerate(results):
    if result.is_error:
        print(f"Error: {result.error.message}")
        continue
    
    print(f"Document {idx}:")
    print(f"  Redacted: {result.redacted_text}")
    print(f"  Entities found: {len(result.entities)}")
    
    for entity in result.entities:
        print(f"    [{entity.category}] '{entity.text}' "
              f"(confidence: {entity.confidence_score:.3f}, "
              f"offset: {entity.offset}, length: {entity.length})")
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

string document = "My name is John Smith, email: john@contoso.com, SSN: 123-45-6789.";

var response = client.RecognizePiiEntities(document, "en");

Console.WriteLine($"Redacted: {response.Value.RedactedText}");
foreach (var entity in response.Value)
{
    Console.WriteLine($"  [{entity.Category}] '{entity.Text}' (confidence: {entity.ConfidenceScore:F3})");
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
    "kind": "PiiEntityRecognition",
    "parameters": {"domain": "none"},
    "analysisInput": {
      "documents": [
        {"id": "1", "language": "en", "text": "John Smith SSN 123-45-6789, email john@contoso.com"}
      ]
    }
  }' | jq '.results.documents[0] | {redactedText, entities: [.entities[] | {text, category, confidenceScore}]}'
```

</TabItem>
</Tabs>

### Tarefa 2: Filtrar por Categorias EspecÃ­ficas de PII

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Detect only specific PII categories
results = client.recognize_pii_entities(
    documents,
    language="en",
    categories_filter=[
        PiiEntityCategory.US_SOCIAL_SECURITY_NUMBER,
        PiiEntityCategory.CREDIT_CARD_NUMBER,
        PiiEntityCategory.EMAIL,
        PiiEntityCategory.PHONE_NUMBER
    ]
)

print("=== FILTERED PII (SSN, CC, Email, Phone only) ===")
for idx, result in enumerate(results):
    if not result.is_error:
        print(f"Doc {idx} redacted: {result.redacted_text}")
        for entity in result.entities:
            print(f"  [{entity.category}] '{entity.text}'")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Filter specific categories
curl -s "${ENDPOINT}/language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "PiiEntityRecognition",
    "parameters": {
      "piiCategories": ["USSocialSecurityNumber", "CreditCardNumber", "Email", "PhoneNumber"]
    },
    "analysisInput": {
      "documents": [{"id": "1", "language": "en", "text": "John Smith SSN 123-45-6789 email john@contoso.com phone 555-123-4567"}]
    }
  }' | jq '.results.documents[0].redactedText'
```

</TabItem>
</Tabs>

### Tarefa 3: PII EspecÃ­fico de DomÃ­nio (PHI para SaÃºde)

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Use healthcare domain for PHI (Protected Health Information)
healthcare_docs = [
    "Patient John Doe, MRN: 12345, was diagnosed with diabetes on 01/15/2024. "
    "Prescribed metformin 500mg. Next appointment: 02/15/2024 with Dr. Smith."
]

results = client.recognize_pii_entities(
    healthcare_docs,
    language="en",
    domain_filter="phi"  # Protected Health Information domain
)

print("=== PHI DETECTION (Healthcare Domain) ===")
for result in results:
    if not result.is_error:
        print(f"Redacted: {result.redacted_text}\n")
        for entity in result.entities:
            print(f"  [{entity.category}] '{entity.text}' ({entity.confidence_score:.3f})")
```

</TabItem>
</Tabs>

## SaÃ­da Esperada

```text
Document 0:
  Redacted: My name is ********* and my email is ********************.
  My SSN is *********** and I live at *********************************.
  You can reach me at ************.
  Entities found: 5
    [Person] 'John Smith' (confidence: 0.950, offset: 11, length: 10)
    [Email] 'john.smith@contoso.com' (confidence: 0.990, offset: 38, length: 22)
    [USSocialSecurityNumber] '123-45-6789' (confidence: 0.980, offset: 72, length: 11)
    [Address] '123 Main Street, Seattle, WA 98101' (confidence: 0.920, offset: 98, length: 35)
    [PhoneNumber] '555-123-4567' (confidence: 0.970, offset: 152, length: 12)

=== FILTERED PII (SSN, CC, Email, Phone only) ===
Doc 0 redacted: My name is John Smith and my email is *********************.
  My SSN is *********** and I live at 123 Main Street, Seattle, WA 98101.
  You can reach me at ************.

=== PHI DETECTION (Healthcare Domain) ===
Redacted: Patient ********, MRN: *****, was diagnosed with diabetes on **********...
  [Person] 'John Doe' (0.980)
  [MedicalRecordNumber] '12345' (0.920)
  [DateTime] '01/15/2024' (0.990)
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| PII nÃ£o detectado | Entidade nÃ£o encontrada | Formato incomum ou baixa confianÃ§a | Diminua o threshold; verifique formatos suportados |
| RedaÃ§Ã£o excessiva | Texto nÃ£o-PII removido | DetecÃ§Ã£o de categoria ampla | Use `categories_filter` para direcionar tipos especÃ­ficos de PII |
| Categoria errada | Email detectado como URL | PadrÃµes ambÃ­guos | Categorias se sobrepÃµem; verifique confianÃ§a e use filtragem |
| Formato de redaÃ§Ã£o errado | Asteriscos ao invÃ©s de rÃ³tulos | A redaÃ§Ã£o padrÃ£o usa caracteres `*` | O texto redigido substitui PII por asteriscos por padrÃ£o |
| PHI nÃ£o detectado | Entidades de saÃºde nÃ£o encontradas | Usando domÃ­nio padrÃ£o | Defina `domain_filter="phi"` para detecÃ§Ã£o especÃ­fica de saÃºde |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que a propriedade redacted_text contÃ©m?",
    options: [
      "O texto original com PII detectado substituÃ­do por caracteres de asterisco correspondendo ao tamanho da entidade",
      "O texto original com entidades PII destacadas",
      "Um resumo do texto sem nenhuma informaÃ§Ã£o sensÃ­vel",
      "O texto traduzido para um idioma diferente"
    ],
    correctAnswer: 0,
    explanation: "redacted_text contÃ©m o texto original com todas as entidades PII detectadas substituÃ­das por caracteres de asterisco (*) correspondendo ao tamanho do texto PII original."
  },
  {
    question: "Como vocÃª limita a detecÃ§Ã£o de PII apenas a categorias especÃ­ficas como SSN e email?",
    options: [
      "Use um endpoint de API diferente para cada categoria",
      "Crie um modelo personalizado treinado apenas nessas categorias",
      "A detecÃ§Ã£o de PII sempre retorna todas as categorias â€” filtre no lado do cliente",
      "Passe um parÃ¢metro categories_filter com os valores de PiiEntityCategory desejados"
    ],
    correctAnswer: 3,
    explanation: "O parÃ¢metro categories_filter (SDK) ou piiCategories (REST) limita a detecÃ§Ã£o apenas Ã s categorias especificadas, reduzindo ruÃ­do de detecÃ§Ãµes indesejadas."
  },
  {
    question: "Para que o filtro de domÃ­nio 'phi' Ã© usado?",
    options: [
      "Detectar tentativas de phishing",
      "Detectar Protected Health Information em texto mÃ©dico/de saÃºde",
      "Detectar conteÃºdo filosÃ³fico",
      "Detectar apenas endereÃ§os fÃ­sicos"
    ],
    correctAnswer: 1,
    explanation: "O domÃ­nio 'phi' (Protected Health Information) ativa a detecÃ§Ã£o de PII especÃ­fica para saÃºde, incluindo nÃºmeros de prontuÃ¡rio mÃ©dico, datas de diagnÃ³stico e outras entidades relevantes para HIPAA."
  },
  {
    question: "Quais informaÃ§Ãµes cada entidade PII detectada inclui?",
    options: [
      "Apenas o texto e a categoria",
      "Apenas a posiÃ§Ã£o redigida",
      "Texto, categoria, subcategoria, pontuaÃ§Ã£o de confianÃ§a, offset e tamanho",
      "Texto, categoria e um ID Ãºnico de entidade"
    ],
    correctAnswer: 2,
    explanation: "Cada entidade PII inclui: o texto correspondido, categoria, subcategoria opcional, pontuaÃ§Ã£o de confianÃ§a (0.0-1.0), offset de caractere no documento e tamanho."
  },
  {
    question: "A detecÃ§Ã£o de PII pode processar mÃºltiplos documentos em uma Ãºnica requisiÃ§Ã£o?",
    options: [
      "NÃ£o â€” apenas um documento por requisiÃ§Ã£o",
      "Sim â€” documentos ilimitados por requisiÃ§Ã£o",
      "Sim â€” operaÃ§Ãµes em lote suportam atÃ© 25 documentos por requisiÃ§Ã£o",
      "Apenas se os documentos estiverem no mesmo idioma"
    ],
    correctAnswer: 2,
    explanation: "A detecÃ§Ã£o de PII suporta operaÃ§Ãµes em lote com atÃ© 25 documentos (ou 125.000 caracteres totais) por requisiÃ§Ã£o. Cada documento pode estar em um idioma diferente."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-nlp --yes --no-wait
```

## Saiba Mais

- [VisÃ£o geral da detecÃ§Ã£o de PII](https://learn.microsoft.com/azure/ai-services/language-service/personally-identifiable-information/overview)
- [Categorias de PII suportadas](https://learn.microsoft.com/azure/ai-services/language-service/personally-identifiable-information/concepts/entity-categories)
- [Biblioteca cliente de Text Analytics](https://learn.microsoft.com/python/api/overview/azure/ai-textanalytics-readme)
