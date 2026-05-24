---
sidebar_position: 8
title: "Desafio 46: Modelos Customizados do Document Intelligence"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 46: Modelos Customizados do Document Intelligence

:::info Tempo Estimado
**60-90 min** | **Custo**: ~$2.00 (Document Intelligence S0 + treinamento de modelo customizado) | **DomÃ­nio**: Knowledge Mining & Extraction (15-20%)
:::

## Habilidades do exame cobertas

| Habilidade | Peso |
|-------|--------|
| Treinar um modelo de extraÃ§Ã£o customizado | Alto |
| Rotular dados de treinamento para modelos customizados | Alto |
| Avaliar a precisÃ£o do modelo customizado | MÃ©dio |
| Criar um modelo composto a partir de mÃºltiplos modelos customizados | Alto |
| Usar modelos customizados para inferÃªncia | MÃ©dio |

## VisÃ£o Geral

Quando os modelos prÃ©-construÃ­dos nÃ£o correspondem aos seus formatos de documento, os modelos customizados permitem que vocÃª treine a extraÃ§Ã£o nos SEUS documentos especÃ­ficos. O Azure Document Intelligence suporta duas abordagens de modelo customizado:

| Tipo de modelo | Abordagem de treinamento | Quando usar |
|-----------|-----------------|-------------|
| **Custom template** | Layout fixo, campos rotulados | FormulÃ¡rios com estrutura consistente (mesmo layout toda vez) |
| **Custom neural** | Layout variÃ¡vel, machine learning | Documentos com layouts variados (diferentes formatos de fatura de fornecedor) |

### Modelos compostos

Um **modelo composto** roteia documentos recebidos para o sub-modelo correto automaticamente. Por exemplo, vocÃª pode compor:
- Modelo de Fatura A (para o layout do Fornecedor X)
- Modelo de Fatura B (para o layout do Fornecedor Y)
- Modelo de Fatura C (para o layout do Fornecedor Z)

O modelo composto classifica o documento e roteia para o sub-modelo apropriado.

### Fluxo de treinamento
1. **Coletar** 5+ documentos de amostra (mÃ­nimo 5 para template, 10+ para neural)
2. **Rotular** campos no Document Intelligence Studio
3. **Treinar** o modelo
4. **Testar** com novos documentos
5. **Implantar** ou compor com outros modelos

## PrÃ©-requisitos

- Desafio 45 concluÃ­do (recurso Document Intelligence)
- Azure Storage Account com documentos de treinamento de amostra
- Acesso ao Document Intelligence Studio
- Python 3.9+ com `azure-ai-documentintelligence>=1.0.0`
- .NET 8 com `Azure.AI.DocumentIntelligence`

## ImplementaÃ§Ã£o

### Tarefa 1: Preparar dados de treinamento no Azure Storage

```bash
RG="rg-ai102-docintell"
STORAGE_ACCOUNT="stai102doctrain$(openssl rand -hex 4)"
CONTAINER="training-data"

# Create storage account for training data
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --location eastus \
  --sku Standard_LRS

# Create container
az storage container create \
  --name $CONTAINER \
  --account-name $STORAGE_ACCOUNT

# Enable CORS for Document Intelligence Studio
az storage cors add \
  --services b \
  --methods GET PUT OPTIONS POST \
  --origins "https://documentintelligence.ai.azure.com" \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 200 \
  --account-name $STORAGE_ACCOUNT

# Upload sample training documents (at least 5)
# In practice, upload your actual business documents here
for i in {1..6}; do
  echo "PurchaseOrder #PO-${i}001
Vendor: Contoso Supplies Inc.
Date: 2024-0${i}-15
Item: Widget Model ${i}
Quantity: ${i}0
Unit Price: \$${i}5.00
Total: \$${i}50.00
Ship To: 123 Main St, Seattle WA 98101" > "po-sample-${i}.txt"
  
  az storage blob upload \
    --account-name $STORAGE_ACCOUNT \
    --container-name $CONTAINER \
    --name "po-sample-${i}.txt" \
    --file "po-sample-${i}.txt"
done

# Get SAS URL for Document Intelligence Studio
EXPIRY=$(date -u -d "1 day" '+%Y-%m-%dT%H:%MZ')
SAS_URL=$(az storage container generate-sas \
  --account-name $STORAGE_ACCOUNT \
  --name $CONTAINER \
  --permissions rl \
  --expiry $EXPIRY \
  --https-only \
  -o tsv)

echo "Training data URL: https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER}?${SAS_URL}"
```

### Tarefa 2: Construir e treinar um modelo customizado

:::tip Studio vs API
O treinamento com dados rotulados Ã© feito mais facilmente no [Document Intelligence Studio](https://documentintelligence.ai.azure.com). O Studio fornece uma interface visual de rotulagem. A API abaixo mostra a construÃ§Ã£o programÃ¡tica do modelo para automaÃ§Ã£o.
:::

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceAdministrationClient
from azure.ai.documentintelligence.models import (
    BuildDocumentModelRequest,
    AzureBlobContentSource,
    DocumentBuildMode,
)

admin_client = DocumentIntelligenceAdministrationClient(
    endpoint=DOC_ENDPOINT,
    credential=AzureKeyCredential(DOC_KEY)
)

# Build custom model from labeled training data
# Note: Labels (.ocr.json and .labels.json) must exist in the container
# These are created by Document Intelligence Studio during labeling
poller = admin_client.begin_build_document_model(
    BuildDocumentModelRequest(
        model_id="purchase-order-model",
        description="Custom model for Contoso purchase orders",
        build_mode=DocumentBuildMode.TEMPLATE,
        azure_blob_source=AzureBlobContentSource(
            container_url=f"https://{STORAGE_ACCOUNT}.blob.core.windows.net/{CONTAINER}?{SAS_URL}"
        )
    )
)

model = poller.result()
print(f"Model ID: {model.model_id}")
print(f"Status: {model.status}")
print(f"Created: {model.created_date_time}")
print(f"Doc types: {list(model.doc_types.keys())}")

# Show field schema
for doc_type, doc_type_info in model.doc_types.items():
    print(f"\nDocument type: {doc_type}")
    for field_name, field_info in doc_type_info.field_schema.items():
        print(f"  {field_name}: {field_info['type']} (confidence: {doc_type_info.field_confidence.get(field_name, 'N/A')})")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.AI.DocumentIntelligence;

var adminClient = new DocumentIntelligenceAdministrationClient(
    new Uri(docEndpoint),
    new AzureKeyCredential(docKey));

// Build custom model
var buildRequest = new BuildDocumentModelContent(
    modelId: "purchase-order-model",
    buildMode: DocumentBuildMode.Template)
{
    Description = "Custom model for Contoso purchase orders",
    AzureBlobSource = new AzureBlobContentSource(
        new Uri($"https://{storageAccount}.blob.core.windows.net/{container}?{sasUrl}"))
};

var operation = await adminClient.BuildDocumentModelAsync(
    WaitUntil.Completed, buildRequest);
var model = operation.Value;

Console.WriteLine($"Model ID: {model.ModelId}");
Console.WriteLine($"Created: {model.CreatedDateTime}");

foreach (var docType in model.DocTypes)
{
    Console.WriteLine($"\nDoc type: {docType.Key}");
    foreach (var field in docType.Value.FieldSchema)
    {
        Console.WriteLine($"  {field.Key}: {field.Value.Type}");
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Build custom model
curl -s -i -X POST \
  "${DOC_ENDPOINT}/documentintelligence/documentModels:build?api-version=2024-11-30" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" \
  -d '{
    "modelId": "purchase-order-model",
    "description": "Custom model for Contoso purchase orders",
    "buildMode": "template",
    "azureBlobSource": {
      "containerUrl": "https://'"${STORAGE_ACCOUNT}"'.blob.core.windows.net/'"${CONTAINER}"'?'"${SAS_URL}"'"
    }
  }'

# Check model status (get operation-location from response header)
# curl -s "$OPERATION_LOCATION" -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}"

# List models
curl -s "${DOC_ENDPOINT}/documentintelligence/documentModels?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" | python -m json.tool
```

</TabItem>
</Tabs>

### Tarefa 3: Testar o modelo customizado

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest

client = DocumentIntelligenceClient(
    endpoint=DOC_ENDPOINT,
    credential=AzureKeyCredential(DOC_KEY)
)

# Analyze a new document with the custom model
test_url = f"https://{STORAGE_ACCOUNT}.blob.core.windows.net/{CONTAINER}/po-sample-1.txt?{SAS_URL}"

poller = client.begin_analyze_document(
    "purchase-order-model",
    AnalyzeDocumentRequest(url_source=test_url)
)
result = poller.result()

for document in result.documents:
    print(f"Document type: {document.doc_type}")
    print(f"Confidence: {document.confidence:.2%}")
    for field_name, field in document.fields.items():
        print(f"  {field_name}: {field.content} (confidence: {field.confidence:.2%})")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var analysisClient = new DocumentIntelligenceClient(
    new Uri(docEndpoint), new AzureKeyCredential(docKey));

var testOp = await analysisClient.AnalyzeDocumentAsync(
    WaitUntil.Completed,
    "purchase-order-model",
    new AnalyzeDocumentContent() { UrlSource = new Uri(testUrl) });

var testResult = testOp.Value;
foreach (var doc in testResult.Documents)
{
    Console.WriteLine($"Type: {doc.DocType} (confidence: {doc.Confidence:P2})");
    foreach (var (name, field) in doc.Fields)
    {
        Console.WriteLine($"  {name}: {field.Content} ({field.Confidence:P2})");
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Test custom model
curl -s -i -X POST \
  "${DOC_ENDPOINT}/documentintelligence/documentModels/purchase-order-model:analyze?api-version=2024-11-30" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" \
  -d '{"urlSource": "'"${TEST_URL}"'"}'
```

</TabItem>
</Tabs>

### Tarefa 4: Criar um modelo composto

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.documentintelligence.models import (
    ComposeDocumentModelRequest,
    DocumentTypeDetails,
)

# Compose multiple custom models into one
# The composed model auto-classifies and routes to the correct sub-model
poller = admin_client.begin_compose_model(
    ComposeDocumentModelRequest(
        model_id="composed-documents-model",
        description="Composed model routing purchase orders and invoices",
        component_models=[
            {"model_id": "purchase-order-model"},
            {"model_id": "invoice-custom-model"},  # assume this exists
        ]
    )
)

composed_model = poller.result()
print(f"Composed model ID: {composed_model.model_id}")
print(f"Component models: {len(composed_model.doc_types)} document types")
for doc_type in composed_model.doc_types:
    print(f"  - {doc_type}")

# Use the composed model â€” it auto-classifies the document
poller = client.begin_analyze_document(
    "composed-documents-model",
    AnalyzeDocumentRequest(url_source=test_url)
)
result = poller.result()
for document in result.documents:
    print(f"Classified as: {document.doc_type} (confidence: {document.confidence:.2%})")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// Compose models
var composeRequest = new ComposeDocumentModelContent(
    modelId: "composed-documents-model",
    componentModels: new[]
    {
        new ComponentDocumentModelDetails("purchase-order-model"),
        new ComponentDocumentModelDetails("invoice-custom-model")
    })
{
    Description = "Composed model for POs and invoices"
};

var composeOp = await adminClient.ComposeModelAsync(WaitUntil.Completed, composeRequest);
var composed = composeOp.Value;
Console.WriteLine($"Composed model: {composed.ModelId}");
Console.WriteLine($"Doc types: {composed.DocTypes.Count}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Compose model
curl -s -i -X POST \
  "${DOC_ENDPOINT}/documentintelligence/documentModels:compose?api-version=2024-11-30" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" \
  -d '{
    "modelId": "composed-documents-model",
    "description": "Composed model for POs and invoices",
    "componentModels": [
      {"modelId": "purchase-order-model"},
      {"modelId": "invoice-custom-model"}
    ]
  }'
```

</TabItem>
</Tabs>

### Tarefa 5: Gerenciamento de modelos â€” listar, obter, excluir

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# List all models
models = admin_client.list_models()
for model in models:
    print(f"  {model.model_id} | Created: {model.created_date_time} | Status: {model.status}")

# Get model details
model_info = admin_client.get_model("purchase-order-model")
print(f"\nModel: {model_info.model_id}")
print(f"  Description: {model_info.description}")
print(f"  Build mode: {model_info.build_mode}")
print(f"  Training documents: {model_info.training_documents_count if hasattr(model_info, 'training_documents_count') else 'N/A'}")

# Delete a model
admin_client.delete_model("purchase-order-model")
print("Model deleted")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// List models
await foreach (var m in adminClient.GetModelsAsync())
{
    Console.WriteLine($"  {m.ModelId} | {m.CreatedDateTime}");
}

// Get model details
var details = await adminClient.GetModelAsync("purchase-order-model");
Console.WriteLine($"Model: {details.Value.ModelId}");

// Delete model
await adminClient.DeleteModelAsync("purchase-order-model");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# List models
curl -s "${DOC_ENDPOINT}/documentintelligence/documentModels?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}" | python -m json.tool

# Delete model
curl -s -X DELETE \
  "${DOC_ENDPOINT}/documentintelligence/documentModels/purchase-order-model?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${DOC_KEY}"
```

</TabItem>
</Tabs>

## SaÃ­da Esperada

```text
Model ID: purchase-order-model
Status: ready
Created: 2024-03-15T10:30:00Z
Doc types: ['purchase-order-model']

Document type: purchase-order-model
  PurchaseOrderNumber: string (confidence: 0.95)
  VendorName: string (confidence: 0.92)
  OrderDate: date (confidence: 0.90)
  ItemDescription: string (confidence: 0.88)
  Quantity: number (confidence: 0.91)
  UnitPrice: number (confidence: 0.89)
  Total: number (confidence: 0.93)
```

## Quebra & conserta

| # | CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---|----------|---------|------------|-----|
| 1 | Treinamento falha com "Not enough documents" | OperaÃ§Ã£o de build falha | Modelos template precisam de 5+ documentos rotulados; neural precisa de 10+ | Adicione mais amostras de treinamento com rotulagem consistente |
| 2 | ClassificaÃ§Ã£o errada no modelo composto | Documento roteado para o sub-modelo errado | Dados de treinamento entre sub-modelos sÃ£o muito similares ou rÃ³tulos se sobrepÃµem | Garanta layouts de documentos distintos; adicione mais amostras de treinamento diversas |
| 3 | Modelo customizado nÃ£o retorna campos | AnÃ¡lise bem-sucedida mas `fields` estÃ¡ vazio | Layout do documento de teste difere significativamente dos dados de treinamento | Use o modo de build neural para layouts variÃ¡veis, ou adicione layouts de documentos similares ao conjunto de treinamento |
| 4 | Erro de CORS no Document Intelligence Studio | NÃ£o Ã© possÃ­vel acessar dados de treinamento pelo Studio | CORS nÃ£o configurado na conta de armazenamento para o domÃ­nio do Studio | Adicione regra CORS para `https://documentintelligence.ai.azure.com` |
| 5 | Token SAS expirado | Erro 403 ao construir modelo | URL SAS usada para o container expirou | Gere um novo token SAS com tempo de expiraÃ§Ã£o suficiente |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ai102-46-q1",
    question: "VocÃª recebe faturas de 5 fornecedores diferentes, cada um com um layout completamente diferente. Qual modo de build de modelo customizado Ã© mais apropriado?",
    options: [
      "Template (modelo custom template)",
      "Modelo composto com 5 modelos template",
      "Modelo prÃ©-construÃ­do de fatura",
      "Neural (modelo custom neural)"
    ],
    correctIndex: 3,
    explanation: "Modelos custom neural lidam com layouts variÃ¡veis e podem aprender extraÃ§Ã£o de campos em diferentes estruturas de documento. Modelos template requerem layouts fixos. Embora um modelo composto com 5 modelos template funcionasse, o neural Ã© mais simples e lida com variaÃ§Ã£o entre layouts nativamente."
  },
  {
    id: "ai102-46-q2",
    question: "Qual Ã© o nÃºmero mÃ­nimo de documentos de treinamento necessÃ¡rios para um modelo custom template?",
    options: [
      "1 documento",
      "5 documentos",
      "10 documentos",
      "50 documentos"
    ],
    correctIndex: 1,
    explanation: "Modelos custom template requerem um mÃ­nimo de 5 documentos de treinamento rotulados. Na prÃ¡tica, mais documentos (especialmente representando variaÃ§Ãµes de layout) melhoram a precisÃ£o. Modelos neural precisam de pelo menos 10 documentos."
  },
  {
    id: "ai102-46-q3",
    question: "VocÃª tem modelos customizados separados para ordens de compra, faturas e recibos. VocÃª quer um Ãºnico endpoint que classifique automaticamente e extraia. O que vocÃª deve criar?",
    options: [
      "Um novo modelo neural treinado em todos os tipos de documento",
      "TrÃªs endpoints separados com um classificador customizado na frente",
      "Um modelo composto combinando todos os trÃªs modelos customizados",
      "Um Ãºnico modelo template com todos os rÃ³tulos de campo de todos os tipos"
    ],
    correctIndex: 2,
    explanation: "Um modelo composto combina mÃºltiplos modelos customizados em um. Ele classifica automaticamente o documento recebido e o roteia para o sub-modelo correto para extraÃ§Ã£o. Isso fornece um Ãºnico endpoint de API para mÃºltiplos tipos de documento."
  },
  {
    id: "ai102-46-q4",
    question: "Durante o treinamento do modelo customizado, onde vocÃª realiza a rotulagem de campos?",
    options: [
      "Document Intelligence Studio (interface web)",
      "Azure CLI com comando az cognitiveservices label",
      "Diretamente no arquivo de manifesto JSON apenas",
      "Blade do Document Intelligence no Portal Azure"
    ],
    correctIndex: 0,
    explanation: "O Document Intelligence Studio (documentintelligence.ai.azure.com) fornece uma interface visual de rotulagem onde vocÃª desenha caixas delimitadoras e atribui nomes de campos Ã s regiÃµes nos seus documentos. Os rÃ³tulos sÃ£o armazenados como arquivos JSON junto aos seus dados de treinamento."
  },
  {
    id: "ai102-46-q5",
    question: "Qual Ã© o nÃºmero mÃ¡ximo de modelos customizados que podem ser compostos em um Ãºnico modelo composto?",
    options: [
      "10 modelos",
      "50 modelos",
      "500 modelos",
      "200 modelos"
    ],
    correctIndex: 3,
    explanation: "Um Ãºnico modelo composto pode conter atÃ© 200 modelos componentes. Isso permite pipelines abrangentes de processamento de documentos que roteiam muitos tipos diferentes de documentos atravÃ©s de uma Ãºnica chamada de API."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-docintell --yes --no-wait
# Also remove local sample files
rm -f po-sample-*.txt
```

## Saiba Mais

- [Custom models overview](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-custom)
- [Build a custom model](https://learn.microsoft.com/azure/ai-services/document-intelligence/how-to-guides/build-a-custom-model)
- [Composed models](https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-composed-models)
- [Document Intelligence Studio](https://documentintelligence.ai.azure.com)
- [Training data requirements](https://learn.microsoft.com/azure/ai-services/document-intelligence/how-to-guides/build-a-custom-model#training-data-tips)
