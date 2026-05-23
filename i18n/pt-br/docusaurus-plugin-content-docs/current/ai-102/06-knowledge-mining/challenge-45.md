---
sidebar_position: 7
title: "Desafio 45: Azure Document Intelligence — Modelos Pré-construídos"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 45: Azure Document Intelligence — Modelos Pré-construídos

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$1.00 (Document Intelligence camada S0 + transações) | **Domínio**: Knowledge Mining & Extraction (15-20%)
:::

## Habilidades do exame cobertas

| Habilidade | Peso |
|-------|--------|
| Provisionar o Azure AI Document Intelligence | Alto |
| Usar modelos pré-construídos para extrair dados de documentos | Alto |
| Selecionar o modelo pré-construído apropriado para um cenário | Alto |
| Lidar com pontuações de confiança e campos extraídos | Médio |
| Usar o modelo de layout para extração de estrutura | Médio |

## Visão geral

O Azure AI Document Intelligence (anteriormente Form Recognizer) usa aprendizado de máquina para extrair dados estruturados de documentos. Os modelos pré-construídos são pré-treinados para tipos comuns de documentos:

| Modelo | Caso de uso | Campos-chave extraídos |
|-------|----------|-------------------|
| `prebuilt-invoice` | Faturas | VendorName, InvoiceTotal, DueDate, LineItems |
| `prebuilt-receipt` | Recibos | MerchantName, Total, TransactionDate, Items |
| `prebuilt-idDocument` | Documentos de identidade/Passaportes | FirstName, LastName, DateOfBirth, DocumentNumber |
| `prebuilt-businessCard` | Cartões de visita | ContactNames, Emails, PhoneNumbers |
| `prebuilt-tax.us.w2` | Formulários US W-2 | Employee, Employer, WagesTips, FederalIncomeTax |
| `prebuilt-layout` | Qualquer documento | Pages, Tables, Paragraphs, SelectionMarks |
| `prebuilt-read` | Qualquer documento | Linhas de texto, palavras, idiomas |

## Pré-requisitos

- Assinatura do Azure com função de Contributor
- Azure CLI 2.60+
- Python 3.9+ com `azure-ai-documentintelligence>=1.0.0`
- .NET 8 com `Azure.AI.DocumentIntelligence`
- Documentos de exemplo (PDF de fatura, imagem de recibo)

## Implementação

### Tarefa 1: Provisionar o Azure Document Intelligence

```bash
RG="rg-ai102-docintell"
LOCATION="eastus"
DOC_INTEL="docintell-ai102-$(openssl rand -hex 4)"

az group create --name $RG --location $LOCATION

# Create Document Intelligence resource
az cognitiveservices account create \
  --name $DOC_INTEL \
  --resource-group $RG \
  --location $LOCATION \
  --kind FormRecognizer \
  --sku S0 \
  --yes

# Get endpoint and key
DOC_ENDPOINT=$(az cognitiveservices account show \
  --name $DOC_INTEL --resource-group $RG \
  --query "properties.endpoint" -o tsv)

DOC_KEY=$(az cognitiveservices account keys list \
  --name $DOC_INTEL --resource-group $RG \
  --query "key1" -o tsv)

echo "Endpoint: $DOC_ENDPOINT"
```

### Tarefa 2: Analisar uma fatura com modelo pré-construído

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest

credential = AzureKeyCredential(DOC_KEY)
client = DocumentIntelligenceClient(endpoint=DOC_ENDPOINT, credential=credential)

# Analyze invoice from URL
invoice_url = "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"

poller = client.begin_analyze_document(
    "prebuilt-invoice",
    AnalyzeDocumentRequest(url_source=invoice_url)
)
result = poller.result()

# Extract invoice fields
for document in result.documents:
    print(f"Document type: {document.doc_type}")
    print(f"Confidence: {document.confidence:.2%}")

    fields = document.fields
    if fields.get("VendorName"):
        print(f"  Vendor: {fields['VendorName'].value_string} (confidence: {fields['VendorName'].confidence:.2%})")
    if fields.get("InvoiceTotal"):
        total = fields["InvoiceTotal"]
        print(f"  Total: {total.value_currency.amount} {total.value_currency.currency_code} (confidence: {total.confidence:.2%})")
    if fields.get("InvoiceDate"):
        print(f"  Date: {fields['InvoiceDate'].value_date} (confidence: {fields['InvoiceDate'].confidence:.2%})")
    if fields.get("DueDate"):
        print(f"  Due: {fields['DueDate'].value_date}")

    # Line items
    if fields.get("Items"):
        print(f"\n  Line Items ({len(fields['Items'].value_list)} items):")
        for i, item in enumerate(fields["Items"].value_list):
            item_fields = item.value_object
            desc = item_fields.get("Description", {})
            amount = item_fields.get("Amount", {})
            print(f"    {i+1}. {desc.value_string if desc else 'N/A'} — ${amount.value_currency.amount if amount else 'N/A'}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.DocumentIntelligence;

var client = new DocumentIntelligenceClient(
    new Uri(docEndpoint),
    new AzureKeyCredential(docKey));

var invoiceUrl = new Uri("https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf");

var operation = await client.AnalyzeDocumentAsync(
    WaitUntil.Completed,
    "prebuilt-invoice",
    new AnalyzeDocumentContent() { UrlSource = invoiceUrl });

var result = operation.Value;

foreach (var document in result.Documents)
{
    Console.WriteLine($"Document type: {document.DocType}");
    Console.WriteLine($"Confidence: {document.Confidence:P2}");

    if (document.Fields.TryGetValue("VendorName", out var vendor))
        Console.WriteLine($"  Vendor: {vendor.ValueString} ({vendor.Confidence:P2})");

    if (document.Fields.TryGetValue("InvoiceTotal", out var total))
        Console.WriteLine($"  Total: {total.ValueCurrency.Amount} {total.ValueCurrency.CurrencyCode}");

    if (document.Fields.TryGetValue("Items", out var items))
    {
        Console.WriteLine($"\n  Line Items ({items.ValueList.Count}):");
        foreach (var item in items.ValueList)
        {
            var desc = item.ValueObject.GetValueOrDefault("Description")?.ValueString ?? "N/A";
            var amount = item.ValueObject.GetValueOrDefault("Amount")?.ValueCurrency?.Amount;
            Console.WriteLine($"    - {desc}: ${amount}");
        }
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Submit invoice for analysis
OPERATION_URL=$(curl -s -i -X POST \
  "${DOC_ENDPOINT}/documentintelligence/documentModels/prebuilt-invoice:analyze?api-version=2024-11-30" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" \
  -d '{"urlSource": "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"}' \
  | grep -i "operation-location" | cut -d' ' -f2 | tr -d '\r')

echo "Operation URL: $OPERATION_URL"

# Poll for results (wait a few seconds)
sleep 10
curl -s "$OPERATION_URL" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" | python -m json.tool
```

</TabItem>
</Tabs>

### Tarefa 3: Extrair informações de documento de identidade

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Analyze ID document (driver's license, passport, etc.)
id_url = "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/id_documents/license.jpg"

poller = client.begin_analyze_document(
    "prebuilt-idDocument",
    AnalyzeDocumentRequest(url_source=id_url)
)
result = poller.result()

for document in result.documents:
    fields = document.fields
    print(f"Document type: {document.doc_type}")  # e.g., "idDocument.driverLicense"

    if fields.get("FirstName"):
        print(f"  First Name: {fields['FirstName'].value_string}")
    if fields.get("LastName"):
        print(f"  Last Name: {fields['LastName'].value_string}")
    if fields.get("DateOfBirth"):
        print(f"  DOB: {fields['DateOfBirth'].value_date}")
    if fields.get("DocumentNumber"):
        print(f"  Document #: {fields['DocumentNumber'].value_string}")
    if fields.get("DateOfExpiration"):
        print(f"  Expires: {fields['DateOfExpiration'].value_date}")
    if fields.get("Address"):
        print(f"  Address: {fields['Address'].value_address}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var idUrl = new Uri("https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/id_documents/license.jpg");

var idOp = await client.AnalyzeDocumentAsync(
    WaitUntil.Completed,
    "prebuilt-idDocument",
    new AnalyzeDocumentContent() { UrlSource = idUrl });

var idResult = idOp.Value;
foreach (var doc in idResult.Documents)
{
    Console.WriteLine($"Type: {doc.DocType}");
    if (doc.Fields.TryGetValue("FirstName", out var first))
        Console.WriteLine($"  First Name: {first.ValueString}");
    if (doc.Fields.TryGetValue("LastName", out var last))
        Console.WriteLine($"  Last Name: {last.ValueString}");
    if (doc.Fields.TryGetValue("DateOfBirth", out var dob))
        Console.WriteLine($"  DOB: {dob.ValueDate}");
    if (doc.Fields.TryGetValue("DocumentNumber", out var docNum))
        Console.WriteLine($"  Document #: {docNum.ValueString}");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Analyze ID document
OPERATION_URL=$(curl -s -i -X POST \
  "${DOC_ENDPOINT}/documentintelligence/documentModels/prebuilt-idDocument:analyze?api-version=2024-11-30" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" \
  -d '{"urlSource": "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/id_documents/license.jpg"}' \
  | grep -i "operation-location" | cut -d' ' -f2 | tr -d '\r')

sleep 10
curl -s "$OPERATION_URL" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" | python -m json.tool
```

</TabItem>
</Tabs>

### Tarefa 4: Usar o modelo de Layout para tabelas e estrutura

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Layout model extracts structure: pages, tables, paragraphs, selection marks
layout_url = "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"

poller = client.begin_analyze_document(
    "prebuilt-layout",
    AnalyzeDocumentRequest(url_source=layout_url)
)
result = poller.result()

# Extract page information
for page in result.pages:
    print(f"Page {page.page_number}: {page.width}x{page.height} ({page.unit})")
    print(f"  Lines: {len(page.lines)}")
    print(f"  Words: {len(page.words)}")

# Extract tables
if result.tables:
    for table_idx, table in enumerate(result.tables):
        print(f"\nTable {table_idx + 1}: {table.row_count} rows x {table.column_count} cols")
        for cell in table.cells:
            print(f"  [{cell.row_index},{cell.column_index}] = {cell.content}")

# Extract paragraphs
if result.paragraphs:
    print(f"\nParagraphs: {len(result.paragraphs)}")
    for para in result.paragraphs[:5]:
        print(f"  Role: {para.role or 'body'} | {para.content[:60]}...")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var layoutOp = await client.AnalyzeDocumentAsync(
    WaitUntil.Completed,
    "prebuilt-layout",
    new AnalyzeDocumentContent() { UrlSource = new Uri(layoutUrl) });

var layoutResult = layoutOp.Value;

// Pages
foreach (var page in layoutResult.Pages)
{
    Console.WriteLine($"Page {page.PageNumber}: {page.Width}x{page.Height} ({page.Unit})");
    Console.WriteLine($"  Lines: {page.Lines.Count}, Words: {page.Words.Count}");
}

// Tables
foreach (var table in layoutResult.Tables)
{
    Console.WriteLine($"\nTable: {table.RowCount} rows x {table.ColumnCount} cols");
    foreach (var cell in table.Cells)
    {
        Console.WriteLine($"  [{cell.RowIndex},{cell.ColumnIndex}] = {cell.Content}");
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Layout analysis
OPERATION_URL=$(curl -s -i -X POST \
  "${DOC_ENDPOINT}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" \
  -d '{"urlSource": "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"}' \
  | grep -i "operation-location" | cut -d' ' -f2 | tr -d '\r')

sleep 10
curl -s "$OPERATION_URL" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" | python -m json.tool
```

</TabItem>
</Tabs>

## Saída Esperada

```
Document type: invoice
Confidence: 95.20%
  Vendor: CONTOSO LTD. (confidence: 97.80%)
  Total: 3800.00 USD (confidence: 96.50%)
  Date: 2024-01-15 (confidence: 98.10%)
  Due: 2024-02-15

  Line Items (4 items):
    1. Consulting Services — $1500.00
    2. Software License — $1200.00
    3. Support Plan — $800.00
    4. Training — $300.00
```

## Quebrar e Corrigir

| # | Cenário | Sintoma | Causa Raiz | Correção |
|---|----------|---------|------------|-----|
| 1 | Modelo retorna resultados vazios | Array `documents` está vazio | Modelo errado para o tipo de documento (ex.: usando `prebuilt-receipt` para uma fatura) | Selecione o modelo pré-construído correto que corresponda ao tipo do seu documento |
| 2 | Pontuações de confiança baixas | Campos extraídos com < 50% de confiança | Documento de baixa qualidade (digitalização borrada, manuscrito) | Use digitalizações de maior resolução; considere um modelo personalizado para documentos manuscritos |
| 3 | Erro "Resource not found" | HTTP 404 no endpoint de análise | Usando formato antigo de endpoint do Form Recognizer em vez do Document Intelligence | Use o formato de endpoint: `{endpoint}/documentintelligence/documentModels/{model}:analyze?api-version=2024-11-30` |
| 4 | Timeout em documentos grandes | Operação de longa duração nunca é concluída | Documento excede o limite de páginas (2000 páginas para layout) ou é muito grande | Divida documentos grandes; use o parâmetro `pages` para processar páginas específicas |
| 5 | Itens de linha ausentes | Total da fatura extraído mas array de itens está vazio | Layout do documento não é padrão; modelo não consegue identificar a estrutura da tabela | Tente `prebuilt-layout` para ver a extração bruta da tabela; considere um modelo personalizado |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ai102-45-q1",
    question: "Você precisa extrair o nome do fornecedor, total da fatura e itens de linha de faturas digitalizadas. Qual modelo você deve usar?",
    options: [
      "prebuilt-layout",
      "prebuilt-invoice",
      "prebuilt-read",
      "prebuilt-document"
    ],
    correctIndex: 1,
    explanation: "O modelo prebuilt-invoice é especificamente treinado para extrair campos específicos de faturas como VendorName, InvoiceTotal, DueDate e LineItems. Embora o prebuilt-layout possa extrair tabelas, ele não compreende a semântica de faturas."
  },
  {
    id: "ai102-45-q2",
    question: "A operação de análise do Document Intelligence retorna imediatamente com um cabeçalho Operation-Location. O que isso indica?",
    options: [
      "A operação é assíncrona — você deve fazer polling na URL do Operation-Location para obter os resultados",
      "O documento era muito grande e foi rejeitado",
      "A análise está completa e os resultados estão no cabeçalho",
      "A requisição foi redirecionada para outro endpoint"
    ],
    correctIndex: 0,
    explanation: "O Document Intelligence usa um padrão assíncrono. O POST inicial retorna HTTP 202 com um cabeçalho Operation-Location. Você faz polling nessa URL até que o status da operação se torne 'succeeded', e então recupera os resultados do corpo da resposta."
  },
  {
    id: "ai102-45-q3",
    question: "Um campo é extraído com confiança de 0.45 (45%). O que sua aplicação deve fazer?",
    options: [
      "Rejeitar o documento inteiro",
      "Reenviar o documento com configurações de maior resolução",
      "Sinalizar o campo para revisão humana com base em um limiar de confiança",
      "Aceitar o valor já que qualquer extração é melhor que entrada manual"
    ],
    correctIndex: 2,
    explanation: "A melhor prática é definir um limiar de confiança (tipicamente 0.8 ou 80%) e sinalizar campos abaixo dele para revisão humana. Uma confiança de 45% sugere que o modelo está incerto. Não rejeite o documento inteiro — outros campos podem ter alta confiança."
  },
  {
    id: "ai102-45-q4",
    question: "Qual modelo pré-construído extrai tabelas, parágrafos e marcas de seleção de QUALQUER tipo de documento sem precisar conhecer o formato do documento?",
    options: [
      "prebuilt-read",
      "prebuilt-document",
      "prebuilt-invoice",
      "prebuilt-layout"
    ],
    correctIndex: 3,
    explanation: "O prebuilt-layout é o modelo de extração de estrutura de propósito geral. Ele identifica páginas, tabelas, parágrafos, marcas de seleção (checkboxes) e códigos de barras de qualquer documento. O prebuilt-read apenas extrai texto. O prebuilt-invoice/receipt são específicos para formatos."
  },
  {
    id: "ai102-45-q5",
    question: "Qual é o formato correto de endpoint da API para analisar um documento com o Document Intelligence (API 2024-11-30)?",
    options: [
      "{endpoint}/formrecognizer/v2.1/prebuilt/{modelId}/analyze",
      "{endpoint}/documentintelligence/documentModels/{modelId}:analyze?api-version=2024-11-30",
      "{endpoint}/vision/documentanalysis:analyze?api-version=2024-11-30",
      "{endpoint}/documentintelligence/analyze/{modelId}?api-version=2024-11-30"
    ],
    correctIndex: 1,
    explanation: "A API atual do Document Intelligence (v4.0, 2024-11-30) usa o formato de endpoint: {endpoint}/documentintelligence/documentModels/{modelId}:analyze. O caminho antigo formrecognizer está depreciado."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-docintell --yes --no-wait
```

## Saiba Mais

- [Visão geral do Document Intelligence](https://learn.microsoft.com/azure/ai-services/document-intelligence/overview)
- [Modelos pré-construídos](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-model-overview)
- [Modelo de fatura](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-invoice)
- [Modelo de layout](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-layout)
- [Início rápido com SDK (Python)](https://learn.microsoft.com/azure/ai-services/document-intelligence/quickstarts/get-started-sdks-rest-api)
