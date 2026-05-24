---
sidebar_position: 9
title: "Desafio 47: Azure Content Understanding — Análise Multimodal"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 47: Azure Content Understanding — Análise Multimodal

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$1,50 (transações AI Services) | **Domínio**: Mineração e Extração de Conhecimento (15-20%)
:::

:::caution Status do Serviço
Azure Content Understanding é uma capacidade mais recente do Azure AI. Consulte a [documentação](https://learn.microsoft.com/azure/ai-services/content-understanding/) para as versões de API mais recentes e disponibilidade. Este desafio utiliza padrões de API REST alinhados com a interface documentada.
:::

## Habilidades do exame cobertas

| Habilidade | Peso |
|-------|--------|
| Criar um analisador Azure Content Understanding | Alto |
| Resumir e classificar documentos | Alto |
| Extrair entidades de documentos | Médio |
| Extrair tabelas e pares chave-valor | Médio |
| Processar imagens e extrair dados estruturados | Médio |

## Visão geral

Azure Content Understanding oferece capacidades de análise multimodal que vão além do OCR tradicional e do Document Intelligence:

| Capacidade | Descrição |
|-----------|-------------|
| **Resumo de documentos** | Gerar resumos concisos de documentos longos |
| **Classificação de documentos** | Classificar documentos em categorias personalizadas |
| **Extração de entidades** | Extrair entidades personalizadas com compreensão LLM |
| **Extração de tabelas** | Extrair tabelas estruturadas de documentos |
| **Análise de imagens** | Compreender e descrever conteúdo de imagens |
| **Suporte multi-formato** | PDF, imagens, documentos Office, áudio, vídeo |

### Conceitos-chave
- **Analisador (Analyzer)**: Um pipeline configurado que define o que extrair do conteúdo
- **Campo (Field)**: Uma informação específica a ser extraída (com tipo e descrição)
- **Esquema (Schema)**: A estrutura de saída esperada para o analisador

## Pré-requisitos

- Assinatura Azure com função de Contribuidor
- Recurso Azure AI Services (conta multi-serviço) em uma região suportada
- Python 3.9+ com biblioteca `requests` (baseado em REST)
- .NET 8 com `HttpClient`
- Documentos de amostra (PDF, imagens)

## Implementação

### Tarefa 1: Criar um recurso Azure AI Services

```bash
RG="rg-ai102-content"
LOCATION="eastus"
AI_SERVICE="ai-content-$(openssl rand -hex 4)"

az group create --name $RG --location $LOCATION

# Create Azure AI Services (multi-service) resource
az cognitiveservices account create \
  --name $AI_SERVICE \
  --resource-group $RG \
  --location $LOCATION \
  --kind AIServices \
  --sku S0 \
  --yes

AI_ENDPOINT=$(az cognitiveservices account show \
  --name $AI_SERVICE --resource-group $RG \
  --query "properties.endpoint" -o tsv)

AI_KEY=$(az cognitiveservices account keys list \
  --name $AI_SERVICE --resource-group $RG \
  --query "key1" -o tsv)
```

### Tarefa 2: Criar um analisador de documentos com campos personalizados

<Tabs>
<TabItem value="python" label="Python (REST)">

```python
import requests
import json
import time

endpoint = AI_ENDPOINT.rstrip("/")
api_key = AI_KEY
api_version = "2024-12-01-preview"

# Create an analyzer for extracting invoice data
analyzer_definition = {
    "description": "Invoice analyzer with summarization and entity extraction",
    "scenario": "document",
    "fieldSchema": {
        "fields": {
            "Summary": {
                "type": "string",
                "description": "A brief summary of the document content"
            },
            "DocumentType": {
                "type": "string",
                "description": "The type of document (invoice, receipt, contract, etc.)"
            },
            "VendorName": {
                "type": "string",
                "description": "The name of the vendor or sender"
            },
            "TotalAmount": {
                "type": "number",
                "description": "The total monetary amount"
            },
            "Currency": {
                "type": "string",
                "description": "The currency code (USD, EUR, etc.)"
            },
            "KeyEntities": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "category": {"type": "string"}
                    }
                },
                "description": "Key entities mentioned in the document"
            }
        }
    }
}

# Create the analyzer
analyzer_id = "invoice-analyzer"
url = f"{endpoint}/contentunderstanding/analyzers/{analyzer_id}?api-version={api_version}"

response = requests.put(
    url,
    headers={
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "application/json"
    },
    json=analyzer_definition
)

if response.status_code in [200, 201]:
    print(f"Analyzer '{analyzer_id}' created successfully")
    print(json.dumps(response.json(), indent=2))
else:
    print(f"Error: {response.status_code} - {response.text}")
```

</TabItem>
<TabItem value="csharp" label="C# (REST)">

```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;

var httpClient = new HttpClient();
httpClient.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", aiKey);

var analyzerDefinition = new
{
    description = "Invoice analyzer with summarization and entity extraction",
    scenario = "document",
    fieldSchema = new
    {
        fields = new Dictionary<string, object>
        {
            ["Summary"] = new { type = "string", description = "A brief summary of the document content" },
            ["DocumentType"] = new { type = "string", description = "The type of document" },
            ["VendorName"] = new { type = "string", description = "The name of the vendor" },
            ["TotalAmount"] = new { type = "number", description = "The total monetary amount" },
            ["Currency"] = new { type = "string", description = "The currency code" }
        }
    }
};

var analyzerId = "invoice-analyzer";
var url = $"{aiEndpoint}/contentunderstanding/analyzers/{analyzerId}?api-version=2024-12-01-preview";

var content = new StringContent(JsonSerializer.Serialize(analyzerDefinition), Encoding.UTF8, "application/json");
var response = await httpClient.PutAsync(url, content);

Console.WriteLine($"Status: {response.StatusCode}");
var result = await response.Content.ReadAsStringAsync();
Console.WriteLine(result);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create an analyzer
ANALYZER_ID="invoice-analyzer"

curl -X PUT "${AI_ENDPOINT}/contentunderstanding/analyzers/${ANALYZER_ID}?api-version=2024-12-01-preview" \
  -H "Ocp-Apim-Subscription-Key: ${AI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Invoice analyzer with summarization and entity extraction",
    "scenario": "document",
    "fieldSchema": {
      "fields": {
        "Summary": {
          "type": "string",
          "description": "A brief summary of the document content"
        },
        "DocumentType": {
          "type": "string",
          "description": "The type of document"
        },
        "VendorName": {
          "type": "string",
          "description": "The name of the vendor"
        },
        "TotalAmount": {
          "type": "number",
          "description": "The total monetary amount"
        },
        "Currency": {
          "type": "string",
          "description": "The currency code"
        }
      }
    }
  }'
```

</TabItem>
</Tabs>

### Tarefa 3: Analisar um documento

<Tabs>
<TabItem value="python" label="Python (REST)">

```python
# Submit document for analysis
analyze_url = f"{endpoint}/contentunderstanding/analyzers/{analyzer_id}:analyze?api-version={api_version}"

# Analyze from URL
analyze_request = {
    "url": "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"
}

response = requests.post(
    analyze_url,
    headers={
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "application/json"
    },
    json=analyze_request
)

if response.status_code == 202:
    operation_url = response.headers["Operation-Location"]
    print(f"Analysis started. Polling: {operation_url}")

    # Poll for results
    while True:
        time.sleep(5)
        poll_response = requests.get(
            operation_url,
            headers={"Ocp-Apim-Subscription-Key": api_key}
        )
        status_data = poll_response.json()
        status = status_data.get("status", "unknown")
        print(f"  Status: {status}")

        if status == "succeeded":
            result = status_data.get("result", {})
            print("\n=== Analysis Results ===")
            contents = result.get("contents", [])
            for content in contents:
                fields = content.get("fields", {})
                for field_name, field_data in fields.items():
                    value = field_data.get("value", "N/A")
                    confidence = field_data.get("confidence", 0)
                    print(f"  {field_name}: {value} (confidence: {confidence:.2%})")
            break
        elif status == "failed":
            print(f"Analysis failed: {status_data}")
            break
else:
    print(f"Error: {response.status_code} - {response.text}")
```

</TabItem>
<TabItem value="csharp" label="C# (REST)">

```csharp
// Submit for analysis
var analyzeUrl = $"{aiEndpoint}/contentunderstanding/analyzers/{analyzerId}:analyze?api-version=2024-12-01-preview";

var analyzeRequest = new
{
    url = "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"
};

var analyzeContent = new StringContent(JsonSerializer.Serialize(analyzeRequest), Encoding.UTF8, "application/json");
var analyzeResponse = await httpClient.PostAsync(analyzeUrl, analyzeContent);

if (analyzeResponse.StatusCode == System.Net.HttpStatusCode.Accepted)
{
    var operationUrl = analyzeResponse.Headers.GetValues("Operation-Location").First();

    // Poll for results
    while (true)
    {
        await Task.Delay(5000);
        var pollResponse = await httpClient.GetAsync(operationUrl);
        var pollResult = JsonSerializer.Deserialize<JsonElement>(
            await pollResponse.Content.ReadAsStringAsync());

        var status = pollResult.GetProperty("status").GetString();
        Console.WriteLine($"Status: {status}");

        if (status == "succeeded")
        {
            Console.WriteLine(pollResult.GetProperty("result").ToString());
            break;
        }
        if (status == "failed") break;
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Submit analysis
OPERATION_URL=$(curl -s -i -X POST \
  "${AI_ENDPOINT}/contentunderstanding/analyzers/${ANALYZER_ID}:analyze?api-version=2024-12-01-preview" \
  -H "Ocp-Apim-Subscription-Key: ${AI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://raw.githubusercontent.com/Azure/azure-sdk-for-python/main/sdk/documentintelligence/azure-ai-documentintelligence/samples/sample_forms/forms/Invoice_1.pdf"
  }' | grep -i "operation-location" | cut -d' ' -f2 | tr -d '\r')

# Poll for results
sleep 10
curl -s "$OPERATION_URL" \
  -H "Ocp-Apim-Subscription-Key: ${AI_KEY}" | python -m json.tool
```

</TabItem>
</Tabs>

### Tarefa 4: Criar um analisador de imagens

<Tabs>
<TabItem value="python" label="Python (REST)">

```python
# Create analyzer for image content
image_analyzer = {
    "description": "Image content analyzer for product photos",
    "scenario": "image",
    "fieldSchema": {
        "fields": {
            "Description": {
                "type": "string",
                "description": "Detailed description of the image content"
            },
            "ObjectsDetected": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of objects visible in the image"
            },
            "DominantColors": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Dominant colors in the image"
            },
            "TextContent": {
                "type": "string",
                "description": "Any text visible in the image"
            }
        }
    }
}

img_analyzer_id = "image-analyzer"
url = f"{endpoint}/contentunderstanding/analyzers/{img_analyzer_id}?api-version={api_version}"

response = requests.put(
    url,
    headers={
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "application/json"
    },
    json=image_analyzer
)
print(f"Image analyzer created: {response.status_code}")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create image analyzer
curl -X PUT "${AI_ENDPOINT}/contentunderstanding/analyzers/image-analyzer?api-version=2024-12-01-preview" \
  -H "Ocp-Apim-Subscription-Key: ${AI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Image content analyzer",
    "scenario": "image",
    "fieldSchema": {
      "fields": {
        "Description": {"type": "string", "description": "Image description"},
        "ObjectsDetected": {"type": "array", "items": {"type": "string"}, "description": "Objects in image"},
        "TextContent": {"type": "string", "description": "Text visible in image"}
      }
    }
  }'
```

</TabItem>
</Tabs>

### Tarefa 5: Gerenciar analisadores (listar, obter, excluir)

<Tabs>
<TabItem value="python" label="Python (REST)">

```python
# List all analyzers
list_url = f"{endpoint}/contentunderstanding/analyzers?api-version={api_version}"
response = requests.get(list_url, headers={"Ocp-Apim-Subscription-Key": api_key})
analyzers = response.json().get("value", [])
print("Analyzers:")
for a in analyzers:
    print(f"  - {a['analyzerId']}: {a.get('description', 'N/A')}")

# Get analyzer details
get_url = f"{endpoint}/contentunderstanding/analyzers/{analyzer_id}?api-version={api_version}"
response = requests.get(get_url, headers={"Ocp-Apim-Subscription-Key": api_key})
print(f"\nAnalyzer details: {json.dumps(response.json(), indent=2)}")

# Delete an analyzer
delete_url = f"{endpoint}/contentunderstanding/analyzers/{analyzer_id}?api-version={api_version}"
response = requests.delete(delete_url, headers={"Ocp-Apim-Subscription-Key": api_key})
print(f"Delete status: {response.status_code}")
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# List analyzers
curl -s "${AI_ENDPOINT}/contentunderstanding/analyzers?api-version=2024-12-01-preview" \
  -H "Ocp-Apim-Subscription-Key: ${AI_KEY}" | python -m json.tool

# Delete analyzer
curl -X DELETE "${AI_ENDPOINT}/contentunderstanding/analyzers/invoice-analyzer?api-version=2024-12-01-preview" \
  -H "Ocp-Apim-Subscription-Key: ${AI_KEY}"
```

</TabItem>
</Tabs>

## Saída Esperada

```json
{
  "status": "succeeded",
  "result": {
    "contents": [
      {
        "fields": {
          "Summary": {
            "value": "Invoice #INV-001 from Contoso Ltd for consulting services totaling $3,800.00 USD, due February 15, 2024.",
            "confidence": 0.92
          },
          "DocumentType": {
            "value": "invoice",
            "confidence": 0.98
          },
          "VendorName": {
            "value": "Contoso Ltd",
            "confidence": 0.95
          },
          "TotalAmount": {
            "value": 3800.00,
            "confidence": 0.93
          },
          "Currency": {
            "value": "USD",
            "confidence": 0.97
          }
        }
      }
    ]
  }
}
```

## Quebra & conserta

| # | Cenário | Sintoma | Causa Raiz | Correção |
|---|----------|---------|------------|-----|
| 1 | Criação do analisador falha | HTTP 400 com erro de validação de esquema | Tipo de campo inválido (ex: usando "int" em vez de "number") | Use tipos suportados: string, number, boolean, array, object |
| 2 | Análise retorna baixa confiança | Campos extraídos com < 50% de confiança | Descrição do campo é muito vaga para o modelo de IA | Escreva descrições de campo mais específicas que orientem a extração |
| 3 | "Resource not found" na análise | HTTP 404 | ID do analisador digitado incorretamente ou região não suporta Content Understanding | Verifique o ID do analisador e confira a disponibilidade regional |
| 4 | Timeout em documentos grandes | Operação nunca completa | Documento excede os limites de tamanho | Verifique os limites de tamanho de arquivo; divida documentos grandes |
| 5 | Resultados vazios para imagem | Todos os campos retornam null | Usando cenário "document" para conteúdo de imagem | Use o cenário "image" para arquivos de imagem |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ai102-47-q1",
    question: "Você precisa extrair campos personalizados de documentos onde o esquema muda por cliente. Qual serviço do Azure permite definir campos de extração com descrições em linguagem natural?",
    options: [
      "Modelo prebuilt-layout do Azure Document Intelligence",
      "Azure Content Understanding com esquema de campo personalizado",
      "Azure AI Search com habilidades cognitivas integradas",
      "Azure OpenAI com saída estruturada"
    ],
    correctIndex: 1,
    explanation: "O Azure Content Understanding permite definir esquemas de campo personalizados com descrições em linguagem natural. O modelo de IA usa essas descrições para entender o que extrair, tornando-o flexível para formatos de documentos variados sem necessidade de treinamento."
  },
  {
    id: "ai102-47-q2",
    question: "Qual é a principal diferença entre o Azure Content Understanding e o Azure Document Intelligence para processamento de documentos?",
    options: [
      "Content Understanding só funciona com imagens; Document Intelligence só funciona com PDFs",
      "Eles são o mesmo serviço com nomes diferentes",
      "Content Understanding usa extração baseada em LLM com descrições de esquema; Document Intelligence usa modelos de ML treinados com dados rotulados",
      "Content Understanding requer treinamento; Document Intelligence não"
    ],
    correctIndex: 2,
    explanation: "O Content Understanding aproveita capacidades de LLM e descrições de campo em linguagem natural para extração (sem necessidade de treinamento). O Document Intelligence usa modelos de ML treinados especificamente, que fornecem alta precisão para tipos específicos de documentos, mas exigem treinamento para cenários personalizados."
  },
  {
    id: "ai102-47-q3",
    question: "Você cria um analisador Content Understanding com cenário 'document'. Um usuário envia um arquivo de imagem. O que acontece?",
    options: [
      "A imagem pode ser processada, mas os resultados podem ser subótimos — use o cenário 'image' para imagens",
      "A requisição falha com um erro de formato não suportado",
      "A imagem é automaticamente convertida para PDF primeiro",
      "O analisador ignora o cenário e processa qualquer formato de forma idêntica"
    ],
    correctIndex: 0,
    explanation: "Embora o Content Understanding possa lidar com múltiplos formatos, usar o cenário correto (document vs image vs audio vs video) otimiza o pipeline de análise. Usar 'document' para imagens pode funcionar, mas o cenário 'image' fornece melhores resultados para conteúdo específico de imagens."
  },
  {
    id: "ai102-47-q4",
    question: "Como o Content Understanding determina quais dados extrair de um documento?",
    options: [
      "A partir de modelos pré-treinados que compreendem todos os tipos de documentos",
      "A partir de dados de treinamento rotulados fornecidos durante a criação do modelo",
      "A partir da extensão do arquivo e tipo MIME",
      "A partir das descrições em linguagem natural na definição do fieldSchema"
    ],
    correctIndex: 3,
    explanation: "O Content Understanding usa as descrições de campo que você fornece no fieldSchema como instruções para o modelo de IA. Descrições claras e específicas melhoram a precisão da extração. Nenhum dado de treinamento ou amostra rotulada é necessário."
  },
  {
    id: "ai102-47-q5",
    question: "Qual código de status HTTP indica que a operação de análise foi aceita e está processando de forma assíncrona?",
    options: [
      "200 OK",
      "202 Accepted",
      "201 Created",
      "204 No Content"
    ],
    correctIndex: 1,
    explanation: "HTTP 202 Accepted indica que a requisição foi aceita para processamento, mas ainda não está completa. A resposta inclui um cabeçalho Operation-Location com a URL para consultar os resultados. Este é o padrão assíncrono padrão para serviços Azure AI."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-content --yes --no-wait
```

## Saiba Mais

- [Visão geral do Azure Content Understanding](https://learn.microsoft.com/azure/ai-services/content-understanding/overview)
- [Início rápido do Content Understanding](https://learn.microsoft.com/azure/ai-services/content-understanding/quickstart)
- [Conceitos de analisadores](https://learn.microsoft.com/azure/ai-services/content-understanding/concepts/analyzers)
- [Formatos de documento suportados](https://learn.microsoft.com/azure/ai-services/content-understanding/concepts/supported-formats)
