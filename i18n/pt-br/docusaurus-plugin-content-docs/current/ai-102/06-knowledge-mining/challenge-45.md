---
sidebar_position: 7
title: "Desafio 45: Azure Document Intelligence â€” Modelos PrÃ©-construÃ­dos"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 45: Azure Document Intelligence â€” Modelos PrÃ©-construÃ­dos

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$1.00 (Document Intelligence camada S0 + transaÃ§Ãµes) | **DomÃ­nio**: Knowledge Mining & Extraction (15-20%)
:::

## Habilidades do exame cobertas

| Habilidade | Peso |
|-------|--------|
| Provisionar o Azure AI Document Intelligence | Alto |
| Usar modelos prÃ©-construÃ­dos para extrair dados de documentos | Alto |
| Selecionar o modelo prÃ©-construÃ­do apropriado para um cenÃ¡rio | Alto |
| Lidar com pontuaÃ§Ãµes de confianÃ§a e campos extraÃ­dos | MÃ©dio |
| Usar o modelo de layout para extraÃ§Ã£o de estrutura | MÃ©dio |

## VisÃ£o geral

O Azure AI Document Intelligence (anteriormente Form Recognizer) usa aprendizado de mÃ¡quina para extrair dados estruturados de documentos. Os modelos prÃ©-construÃ­dos sÃ£o prÃ©-treinados para tipos comuns de documentos:

| Modelo | Caso de uso | Campos-chave extraÃ­dos |
|-------|----------|-------------------|
| `prebuilt-invoice` | Faturas | VendorName, InvoiceTotal, DueDate, LineItems |
| `prebuilt-receipt` | Recibos | MerchantName, Total, TransactionDate, Items |
| `prebuilt-idDocument` | Documentos de identidade/Passaportes | FirstName, LastName, DateOfBirth, DocumentNumber |
| `prebuilt-businessCard` | CartÃµes de visita | ContactNames, Emails, PhoneNumbers |
| `prebuilt-tax.us.w2` | FormulÃ¡rios US W-2 | Employee, Employer, WagesTips, FederalIncomeTax |
| `prebuilt-layout` | Qualquer documento | Pages, Tables, Paragraphs, SelectionMarks |
| `prebuilt-read` | Qualquer documento | Linhas de texto, palavras, idiomas |

## PrÃ©-requisitos

- Assinatura do Azure com funÃ§Ã£o de Contributor
- Azure CLI 2.60+
- Python 3.9+ com `azure-ai-documentintelligence>=1.0.0`
- .NET 8 com `Azure.AI.DocumentIntelligence`
- Documentos de exemplo (PDF de fatura, imagem de recibo)

## ImplementaÃ§Ã£o

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

### Tarefa 2: Analisar uma fatura com modelo prÃ©-construÃ­do

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
            print(f"    {i+1}. {desc.value_string if desc else 'N/A'} â€” ${amount.value_currency.amount if amount else 'N/A'}")
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

### Tarefa 3: Extrair informaÃ§Ãµes de documento de identidade

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

## SaÃ­da Esperada

```text
Document type: invoice
Confidence: 95.20%
  Vendor: CONTOSO LTD. (confidence: 97.80%)
  Total: 3800.00 USD (confidence: 96.50%)
  Date: 2024-01-15 (confidence: 98.10%)
  Due: 2024-02-15

  Line Items (4 items):
    1. Consulting Services â€” $1500.00
    2. Software License â€” $1200.00
    3. Support Plan â€” $800.00
    4. Training â€” $300.00
```

## Quebra & conserta

| # | CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---|----------|---------|------------|-----|
| 1 | Modelo retorna resultados vazios | Array `documents` estÃ¡ vazio | Modelo errado para o tipo de documento (ex.: usando `prebuilt-receipt` para uma fatura) | Selecione o modelo prÃ©-construÃ­do correto que corresponda ao tipo do seu documento |
| 2 | PontuaÃ§Ãµes de confianÃ§a baixas | Campos extraÃ­dos com < 50% de confianÃ§a | Documento de baixa qualidade (digitalizaÃ§Ã£o borrada, manuscrito) | Use digitalizaÃ§Ãµes de maior resoluÃ§Ã£o; considere um modelo personalizado para documentos manuscritos |
| 3 | Erro "Resource not found" | HTTP 404 no endpoint de anÃ¡lise | Usando formato antigo de endpoint do Form Recognizer em vez do Document Intelligence | Use o formato de endpoint: `{endpoint}/documentintelligence/documentModels/{model}:analyze?api-version=2024-11-30` |
| 4 | Timeout em documentos grandes | OperaÃ§Ã£o de longa duraÃ§Ã£o nunca Ã© concluÃ­da | Documento excede o limite de pÃ¡ginas (2000 pÃ¡ginas para layout) ou Ã© muito grande | Divida documentos grandes; use o parÃ¢metro `pages` para processar pÃ¡ginas especÃ­ficas |
| 5 | Itens de linha ausentes | Total da fatura extraÃ­do mas array de itens estÃ¡ vazio | Layout do documento nÃ£o Ã© padrÃ£o; modelo nÃ£o consegue identificar a estrutura da tabela | Tente `prebuilt-layout` para ver a extraÃ§Ã£o bruta da tabela; considere um modelo personalizado |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ai102-45-q1",
    question: "VocÃª precisa extrair o nome do fornecedor, total da fatura e itens de linha de faturas digitalizadas. Qual modelo vocÃª deve usar?",
    options: [
      "prebuilt-layout",
      "prebuilt-invoice",
      "prebuilt-read",
      "prebuilt-document"
    ],
    correctIndex: 1,
    explanation: "O modelo prebuilt-invoice Ã© especificamente treinado para extrair campos especÃ­ficos de faturas como VendorName, InvoiceTotal, DueDate e LineItems. Embora o prebuilt-layout possa extrair tabelas, ele nÃ£o compreende a semÃ¢ntica de faturas."
  },
  {
    id: "ai102-45-q2",
    question: "A operaÃ§Ã£o de anÃ¡lise do Document Intelligence retorna imediatamente com um cabeÃ§alho Operation-Location. O que isso indica?",
    options: [
      "A operaÃ§Ã£o Ã© assÃ­ncrona â€” vocÃª deve fazer polling na URL do Operation-Location para obter os resultados",
      "O documento era muito grande e foi rejeitado",
      "A anÃ¡lise estÃ¡ completa e os resultados estÃ£o no cabeÃ§alho",
      "A requisiÃ§Ã£o foi redirecionada para outro endpoint"
    ],
    correctIndex: 0,
    explanation: "O Document Intelligence usa um padrÃ£o assÃ­ncrono. O POST inicial retorna HTTP 202 com um cabeÃ§alho Operation-Location. VocÃª faz polling nessa URL atÃ© que o status da operaÃ§Ã£o se torne 'succeeded', e entÃ£o recupera os resultados do corpo da resposta."
  },
  {
    id: "ai102-45-q3",
    question: "Um campo Ã© extraÃ­do com confianÃ§a de 0.45 (45%). O que sua aplicaÃ§Ã£o deve fazer?",
    options: [
      "Rejeitar o documento inteiro",
      "Reenviar o documento com configuraÃ§Ãµes de maior resoluÃ§Ã£o",
      "Sinalizar o campo para revisÃ£o humana com base em um limiar de confianÃ§a",
      "Aceitar o valor jÃ¡ que qualquer extraÃ§Ã£o Ã© melhor que entrada manual"
    ],
    correctIndex: 2,
    explanation: "A melhor prÃ¡tica Ã© definir um limiar de confianÃ§a (tipicamente 0.8 ou 80%) e sinalizar campos abaixo dele para revisÃ£o humana. Uma confianÃ§a de 45% sugere que o modelo estÃ¡ incerto. NÃ£o rejeite o documento inteiro â€” outros campos podem ter alta confianÃ§a."
  },
  {
    id: "ai102-45-q4",
    question: "Qual modelo prÃ©-construÃ­do extrai tabelas, parÃ¡grafos e marcas de seleÃ§Ã£o de QUALQUER tipo de documento sem precisar conhecer o formato do documento?",
    options: [
      "prebuilt-read",
      "prebuilt-document",
      "prebuilt-invoice",
      "prebuilt-layout"
    ],
    correctIndex: 3,
    explanation: "O prebuilt-layout Ã© o modelo de extraÃ§Ã£o de estrutura de propÃ³sito geral. Ele identifica pÃ¡ginas, tabelas, parÃ¡grafos, marcas de seleÃ§Ã£o (checkboxes) e cÃ³digos de barras de qualquer documento. O prebuilt-read apenas extrai texto. O prebuilt-invoice/receipt sÃ£o especÃ­ficos para formatos."
  },
  {
    id: "ai102-45-q5",
    question: "Qual Ã© o formato correto de endpoint da API para analisar um documento com o Document Intelligence (API 2024-11-30)?",
    options: [
      "{endpoint}/formrecognizer/v2.1/prebuilt/{modelId}/analyze",
      "{endpoint}/documentintelligence/documentModels/{modelId}:analyze?api-version=2024-11-30",
      "{endpoint}/vision/documentanalysis:analyze?api-version=2024-11-30",
      "{endpoint}/documentintelligence/analyze/{modelId}?api-version=2024-11-30"
    ],
    correctIndex: 1,
    explanation: "A API atual do Document Intelligence (v4.0, 2024-11-30) usa o formato de endpoint: {endpoint}/documentintelligence/documentModels/{modelId}:analyze. O caminho antigo formrecognizer estÃ¡ depreciado."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-docintell --yes --no-wait
```

## Saiba Mais

- [VisÃ£o geral do Document Intelligence](https://learn.microsoft.com/azure/ai-services/document-intelligence/overview)
- [Modelos prÃ©-construÃ­dos](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-model-overview)
- [Modelo de fatura](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-invoice)
- [Modelo de layout](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-layout)
- [InÃ­cio rÃ¡pido com SDK (Python)](https://learn.microsoft.com/azure/ai-services/document-intelligence/quickstarts/get-started-sdks-rest-api)
