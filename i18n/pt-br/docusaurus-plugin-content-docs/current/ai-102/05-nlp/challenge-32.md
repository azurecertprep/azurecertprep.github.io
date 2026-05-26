---
sidebar_position: 3
title: "Desafio 32: Detecção e Redação de PII"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 32: Detecção e Redação de PII

:::info Tempo Estimado
**40 min** | **Custo**: $1-2 (estimado) | **Domínio**: Implementar Soluções de NLP (15-20%)
:::

## Habilidades do exame abordadas
- Detectar PII (Informações de Identificação Pessoal) em texto
- Redigir dados sensíveis de documentos
- Configurar categorias de PII para detecção direcionada

## Visão Geral

A Detecção de PII identifica e opcionalmente redige informações sensíveis em texto. As categorias incluem:

| Categoria | Exemplos |
|-----------|----------|
| `Person` | Nomes |
| `Email` | email@domain.com |
| `PhoneNumber` | +1-555-123-4567 |
| `Address` | Endereços |
| `SSN` | Números de Seguro Social (EUA) |
| `CreditCardNumber` | Números de cartão de crédito |
| `IPAddress` | Endereços IP |
| `Organization` | Nomes de empresas (quando PII) |
| `DateTime` | Datas de nascimento |

A API retorna tanto as entidades detectadas quanto uma versão de **texto redigido** com PII substituído por rótulos de categoria de entidade.

## Pré-requisitos
- Assinatura do Azure
- Recurso Azure AI Language
- Python 3.9+ ou .NET 8
- Pacote: `azure-ai-textanalytics` (v5.3+)

## Implementação

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

### Tarefa 2: Filtrar por Categorias Específicas de PII

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

### Tarefa 3: PII Específico de Domínio (PHI para Saúde)

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

## Saída Esperada

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

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| PII não detectado | Entidade não encontrada | Formato incomum ou baixa confiança | Diminua o threshold; verifique formatos suportados |
| Redação excessiva | Texto não-PII removido | Detecção de categoria ampla | Use `categories_filter` para direcionar tipos específicos de PII |
| Categoria errada | Email detectado como URL | Padrões ambíguos | Categorias se sobrepõem; verifique confiança e use filtragem |
| Formato de redação errado | Asteriscos ao invés de rótulos | A redação padrão usa caracteres `*` | O texto redigido substitui PII por asteriscos por padrão |
| PHI não detectado | Entidades de saúde não encontradas | Usando domínio padrão | Defina `domain_filter="phi"` para detecção específica de saúde |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que a propriedade redacted_text contém?",
    options: [
      "O texto original com PII detectado substituído por caracteres de asterisco correspondendo ao tamanho da entidade",
      "O texto original com entidades PII destacadas",
      "Um resumo do texto sem nenhuma informação sensível",
      "O texto traduzido para um idioma diferente"
    ],
    correctAnswer: 0,
    explanation: "redacted_text contém o texto original com todas as entidades PII detectadas substituídas por caracteres de asterisco (*) correspondendo ao tamanho do texto PII original."
  },
  {
    question: "Como você limita a detecção de PII apenas a categorias específicas como SSN e email?",
    options: [
      "Use um endpoint de API diferente para cada categoria",
      "Crie um modelo personalizado treinado apenas nessas categorias",
      "A detecção de PII sempre retorna todas as categorias — filtre no lado do cliente",
      "Passe um parâmetro categories_filter com os valores de PiiEntityCategory desejados"
    ],
    correctAnswer: 3,
    explanation: "O parâmetro categories_filter (SDK) ou piiCategories (REST) limita a detecção apenas às categorias especificadas, reduzindo ruído de detecções indesejadas."
  },
  {
    question: "Para que o filtro de domínio 'phi' é usado?",
    options: [
      "Detectar tentativas de phishing",
      "Detectar Protected Health Information em texto médico/de saúde",
      "Detectar conteúdo filosófico",
      "Detectar apenas endereços físicos"
    ],
    correctAnswer: 1,
    explanation: "O domínio 'phi' (Protected Health Information) ativa a detecção de PII específica para saúde, incluindo números de prontuário médico, datas de diagnóstico e outras entidades relevantes para HIPAA."
  },
  {
    question: "Quais informações cada entidade PII detectada inclui?",
    options: [
      "Apenas o texto e a categoria",
      "Apenas a posição redigida",
      "Texto, categoria, subcategoria, pontuação de confiança, offset e tamanho",
      "Texto, categoria e um ID único de entidade"
    ],
    correctAnswer: 2,
    explanation: "Cada entidade PII inclui: o texto correspondido, categoria, subcategoria opcional, pontuação de confiança (0.0-1.0), offset de caractere no documento e tamanho."
  },
  {
    question: "A detecção de PII pode processar múltiplos documentos em uma única requisição?",
    options: [
      "Não — apenas um documento por requisição",
      "Sim — documentos ilimitados por requisição",
      "Sim — operações em lote suportam até 25 documentos por requisição",
      "Apenas se os documentos estiverem no mesmo idioma"
    ],
    correctAnswer: 2,
    explanation: "A detecção de PII suporta operações em lote com até 25 documentos (ou 125.000 caracteres totais) por requisição. Cada documento pode estar em um idioma diferente."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-nlp --yes --no-wait
```

## Saiba Mais

- [Visão geral da detecção de PII](https://learn.microsoft.com/azure/ai-services/language-service/personally-identifiable-information/overview)
- [Categorias de PII suportadas](https://learn.microsoft.com/azure/ai-services/language-service/personally-identifiable-information/concepts/entity-categories)
- [Biblioteca cliente de Text Analytics](https://learn.microsoft.com/python/api/overview/azure/ai-textanalytics-readme)
