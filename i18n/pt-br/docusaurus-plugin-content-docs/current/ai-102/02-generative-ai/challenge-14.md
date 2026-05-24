---
sidebar_position: 5
title: "Desafio 14: Padrão RAG: Básico"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 14: Padrão RAG: Básico

:::info Tempo Estimado
**60 min** | **Custo**: ~$3.00 (AI Search + OpenAI) | **Domínio**: Soluções de IA Generativa (15-20%)
:::

## Habilidades do exame abordadas

- Implementar Retrieval Augmented Generation (RAG) fundamentando modelos nos seus dados
- Criar e configurar índices do Azure AI Search
- Usar o recurso "On Your Data" do Azure OpenAI para respostas fundamentadas

## Visão Geral

**Retrieval Augmented Generation (RAG)** é um padrão que aprimora as respostas de LLMs recuperando primeiro informações relevantes de uma base de conhecimento externa, e então fornecendo esse contexto ao modelo junto com a pergunta do usuário. Isso "fundamenta" a resposta do modelo em dados factuais, reduzindo significativamente alucinações e permitindo que o modelo responda perguntas sobre informações proprietárias ou atuais nas quais ele não foi treinado.

O padrão RAG básico no Azure usa o **Azure AI Search** como camada de recuperação e o **Azure OpenAI** como camada de geração. O Azure AI Search indexa seus documentos (PDFs, arquivos Word, páginas web, dados estruturados) e fornece resultados de busca rápidos e relevantes. O recurso **"On Your Data"** do Azure OpenAI simplifica o RAG orquestrando automaticamente as etapas de recuperação e geração—você configura uma conexão de fonte de dados, e o serviço cuida do chunking, busca e augmentação de prompt nos bastidores.

O fluxo da arquitetura é: Consulta do Usuário → Azure OpenAI (com configuração de fonte de dados) → Azure AI Search (recuperação) → Chunks relevantes retornados → LLM gera resposta fundamentada com citações. Entender esse fluxo, configurar a conexão da fonte de dados e comparar respostas fundamentadas vs. não fundamentadas são habilidades essenciais para o exame AI-102.

## Arquitetura

O padrão RAG conecta o Azure OpenAI ao Azure AI Search, permitindo que o modelo recupere chunks relevantes de documentos antes de gerar respostas.

![Topologia do Desafio 14](/img/ai-102/challenge-14-topology.svg)

## Pré-requisitos

- Assinatura Azure com acesso ao Azure OpenAI
- Azure CLI instalado
- Implantação GPT-4o (do Desafio 12)
- Python 3.9+ com pacotes `openai`, `azure-search-documents` e `azure-identity`

## Implementação

### Tarefa 1: Criar Índice do Azure AI Search

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.identity import DefaultAzureCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    SearchFieldDataType,
)
from azure.search.documents import SearchClient

endpoint = os.environ["AZURE_SEARCH_ENDPOINT"]
credential = DefaultAzureCredential()

# Create the search index
index_client = SearchIndexClient(endpoint=endpoint, credential=credential)

fields = [
    SimpleField(name="id", type=SearchFieldDataType.String, key=True, filterable=True),
    SearchableField(name="title", type=SearchFieldDataType.String, filterable=True),
    SearchableField(name="content", type=SearchFieldDataType.String),
    SimpleField(name="category", type=SearchFieldDataType.String, filterable=True, facetable=True),
    SimpleField(name="source", type=SearchFieldDataType.String, filterable=True),
]

index = SearchIndex(name="ai102-docs-index", fields=fields)
result = index_client.create_or_update_index(index)
print(f"Index created: {result.name}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.Identity;
using Azure.Search.Documents.Indexes;
using Azure.Search.Documents.Indexes.Models;

string searchEndpoint = Environment.GetEnvironmentVariable("AZURE_SEARCH_ENDPOINT")!;
var credential = new DefaultAzureCredential();

var indexClient = new SearchIndexClient(
    new Uri(searchEndpoint), credential);

var fields = new FieldBuilder().Build(typeof(DocumentModel));

// Or define fields explicitly:
var index = new SearchIndex("ai102-docs-index")
{
    Fields =
    {
        new SimpleField("id", SearchFieldDataType.String) { IsKey = true, IsFilterable = true },
        new SearchableField("title") { IsFilterable = true },
        new SearchableField("content"),
        new SimpleField("category", SearchFieldDataType.String) { IsFilterable = true, IsFacetable = true },
        new SimpleField("source", SearchFieldDataType.String) { IsFilterable = true },
    }
};

var result = await indexClient.CreateOrUpdateIndexAsync(index);
Console.WriteLine($"Index created: {result.Value.Name}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
AZURE_SEARCH_ENDPOINT="https://search-ai102-challenge14.search.windows.net"
AZURE_SEARCH_KEY="YOUR_SEARCH_ADMIN_KEY"

# Create the search index
curl -X PUT \
  "${AZURE_SEARCH_ENDPOINT}/indexes/ai102-docs-index?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_SEARCH_KEY}" \
  -d '{
    "name": "ai102-docs-index",
    "fields": [
      {"name": "id", "type": "Edm.String", "key": true, "filterable": true},
      {"name": "title", "type": "Edm.String", "searchable": true, "filterable": true},
      {"name": "content", "type": "Edm.String", "searchable": true},
      {"name": "category", "type": "Edm.String", "filterable": true, "facetable": true},
      {"name": "source", "type": "Edm.String", "filterable": true}
    ]
  }'
```

</TabItem>
</Tabs>

### Tarefa 2: Fazer Upload de Documentos de Exemplo

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient

endpoint = os.environ["AZURE_SEARCH_ENDPOINT"]
credential = DefaultAzureCredential()

search_client = SearchClient(
    endpoint=endpoint,
    index_name="ai102-docs-index",
    credential=credential
)

# Sample documents about Azure AI services
documents = [
    {
        "id": "1",
        "title": "Azure AI Foundry Overview",
        "content": "Azure AI Foundry is a unified platform for building generative AI applications. It provides a hub-and-project architecture where hubs manage shared infrastructure including Storage, Key Vault, and Container Registry. Projects are workspaces where teams build and deploy AI solutions. The platform supports model deployment, prompt flow orchestration, and evaluation capabilities.",
        "category": "platform",
        "source": "docs/ai-foundry-overview.md"
    },
    {
        "id": "2",
        "title": "Azure OpenAI Model Deployment",
        "content": "Azure OpenAI supports multiple deployment types: Standard (shared compute, pay-per-token), Global Standard (global routing for higher availability), and Provisioned (dedicated compute with guaranteed throughput). Models available include GPT-4o for multimodal tasks, GPT-4o-mini for cost-efficient workloads, and embedding models like text-embedding-3-small for vector search.",
        "category": "models",
        "source": "docs/model-deployment.md"
    },
    {
        "id": "3",
        "title": "Responsible AI Principles",
        "content": "Microsoft's Responsible AI principles include fairness, reliability and safety, privacy and security, inclusiveness, transparency, and accountability. Azure AI services include built-in content filters that detect and block harmful content categories including hate, sexual, violence, and self-harm. Custom content filters can be configured per deployment.",
        "category": "governance",
        "source": "docs/responsible-ai.md"
    },
    {
        "id": "4",
        "title": "Azure AI Search Capabilities",
        "content": "Azure AI Search provides full-text search, vector search, and hybrid search combining both approaches. Semantic ranking uses deep learning models to re-rank results by semantic relevance. The service supports skillsets for AI enrichment during indexing, including OCR, entity recognition, and custom skills via Azure Functions.",
        "category": "search",
        "source": "docs/ai-search.md"
    },
    {
        "id": "5",
        "title": "Prompt Engineering Best Practices",
        "content": "Effective prompts include clear instructions, relevant context, and specific output format requirements. System messages define the AI assistant's behavior and constraints. Few-shot examples in the prompt improve output consistency. Chain-of-thought prompting helps with complex reasoning tasks. Temperature controls randomness (0 for deterministic, 1 for creative).",
        "category": "techniques",
        "source": "docs/prompt-engineering.md"
    }
]

result = search_client.upload_documents(documents=documents)
print(f"Uploaded {len(result)} documents")
for r in result:
    print(f"  {r.key}: {r.succeeded}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.Identity;
using Azure.Search.Documents;
using Azure.Search.Documents.Models;

string searchEndpoint = Environment.GetEnvironmentVariable("AZURE_SEARCH_ENDPOINT")!;
var credential = new DefaultAzureCredential();

var searchClient = new SearchClient(
    new Uri(searchEndpoint), "ai102-docs-index", credential);

var documents = new[]
{
    new {
        id = "1", title = "Azure AI Foundry Overview",
        content = "Azure AI Foundry is a unified platform for building generative AI applications. It provides a hub-and-project architecture where hubs manage shared infrastructure including Storage, Key Vault, and Container Registry.",
        category = "platform", source = "docs/ai-foundry-overview.md"
    },
    new {
        id = "2", title = "Azure OpenAI Model Deployment",
        content = "Azure OpenAI supports multiple deployment types: Standard (shared compute, pay-per-token), Global Standard (global routing), and Provisioned (dedicated compute with guaranteed throughput).",
        category = "models", source = "docs/model-deployment.md"
    },
    new {
        id = "3", title = "Responsible AI Principles",
        content = "Microsoft's Responsible AI principles include fairness, reliability and safety, privacy and security, inclusiveness, transparency, and accountability.",
        category = "governance", source = "docs/responsible-ai.md"
    },
    new {
        id = "4", title = "Azure AI Search Capabilities",
        content = "Azure AI Search provides full-text search, vector search, and hybrid search combining both approaches. Semantic ranking uses deep learning models to re-rank results.",
        category = "search", source = "docs/ai-search.md"
    },
    new {
        id = "5", title = "Prompt Engineering Best Practices",
        content = "Effective prompts include clear instructions, relevant context, and specific output format requirements. System messages define the AI assistant's behavior.",
        category = "techniques", source = "docs/prompt-engineering.md"
    }
};

var batch = IndexDocumentsBatch.Upload(documents);
var result = await searchClient.IndexDocumentsAsync(batch);
Console.WriteLine($"Uploaded {result.Value.Results.Count} documents");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Upload documents to the index
curl -X POST \
  "${AZURE_SEARCH_ENDPOINT}/indexes/ai102-docs-index/docs/index?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_SEARCH_KEY}" \
  -d '{
    "value": [
      {
        "@search.action": "upload",
        "id": "1",
        "title": "Azure AI Foundry Overview",
        "content": "Azure AI Foundry is a unified platform for building generative AI applications...",
        "category": "platform",
        "source": "docs/ai-foundry-overview.md"
      },
      {
        "@search.action": "upload",
        "id": "2",
        "title": "Azure OpenAI Model Deployment",
        "content": "Azure OpenAI supports multiple deployment types: Standard, Global Standard, and Provisioned...",
        "category": "models",
        "source": "docs/model-deployment.md"
      },
      {
        "@search.action": "upload",
        "id": "3",
        "title": "Responsible AI Principles",
        "content": "Microsofts Responsible AI principles include fairness, reliability, privacy, inclusiveness, transparency, and accountability...",
        "category": "governance",
        "source": "docs/responsible-ai.md"
      }
    ]
  }'

# Verify documents uploaded
curl -s "${AZURE_SEARCH_ENDPOINT}/indexes/ai102-docs-index/docs/\$count?api-version=2024-07-01" \
  -H "api-key: ${AZURE_SEARCH_KEY}"
```

</TabItem>
</Tabs>

### Tarefa 3: Configurar Azure OpenAI "On Your Data"

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
api_key = os.environ["AZURE_OPENAI_KEY"]
search_endpoint = os.environ["AZURE_SEARCH_ENDPOINT"]
search_key = os.environ["AZURE_SEARCH_KEY"]

client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version="2024-10-21"
)

# Query with "On Your Data" (grounded response)
response = client.chat.completions.create(
    model="gpt-4o-standard",
    messages=[
        {"role": "system", "content": "You are an AI assistant that helps users understand Azure AI services. Use the provided data sources to answer questions accurately."},
        {"role": "user", "content": "What deployment types does Azure OpenAI support and what are their differences?"}
    ],
    extra_body={
        "data_sources": [
            {
                "type": "azure_search",
                "parameters": {
                    "endpoint": search_endpoint,
                    "index_name": "ai102-docs-index",
                    "authentication": {
                        "type": "api_key",
                        "key": search_key
                    },
                    "query_type": "simple",
                    "top_n_documents": 3,
                    "in_scope": True
                }
            }
        ]
    }
)

print("Grounded Response:")
print(response.choices[0].message.content)

# Check citations
if hasattr(response.choices[0].message, 'context'):
    context = response.choices[0].message.context
    if 'citations' in context:
        print("\nCitations:")
        for citation in context['citations']:
            print(f"  - {citation.get('title', 'N/A')} ({citation.get('filepath', 'N/A')})")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using Azure.AI.OpenAI.Chat;
using OpenAI.Chat;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;
string searchEndpoint = Environment.GetEnvironmentVariable("AZURE_SEARCH_ENDPOINT")!;
string searchKey = Environment.GetEnvironmentVariable("AZURE_SEARCH_KEY")!;

var client = new AzureOpenAIClient(
    new Uri(endpoint), new AzureKeyCredential(apiKey));
var chatClient = client.GetChatClient("gpt-4o-standard");

// Configure "On Your Data" with Azure Search
var dataSource = new AzureSearchChatDataSource
{
    Endpoint = new Uri(searchEndpoint),
    IndexName = "ai102-docs-index",
    Authentication = DataSourceAuthentication.FromApiKey(searchKey),
    QueryType = DataSourceQueryType.Simple,
    TopNDocuments = 3,
    InScope = true
};

var options = new ChatCompletionOptions();
options.AddDataSource(dataSource);

var messages = new ChatMessage[]
{
    new SystemChatMessage("You are an AI assistant. Use provided data sources to answer accurately."),
    new UserChatMessage("What deployment types does Azure OpenAI support?")
};

var response = await chatClient.CompleteChatAsync(messages, options);

Console.WriteLine("Grounded Response:");
Console.WriteLine(response.Value.Content[0].Text);

// Access citations from context
var context = response.Value.GetMessageContext();
if (context?.Citations != null)
{
    Console.WriteLine("\nCitations:");
    foreach (var citation in context.Citations)
    {
        Console.WriteLine($"  - {citation.Title} ({citation.FilePath})");
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
AZURE_OPENAI_ENDPOINT="https://aoai-ai102-challenge14.openai.azure.com"
AZURE_OPENAI_KEY="YOUR_OPENAI_KEY"
AZURE_SEARCH_ENDPOINT="https://search-ai102-challenge14.search.windows.net"
AZURE_SEARCH_KEY="YOUR_SEARCH_KEY"

# Chat completion with "On Your Data"
curl -s "${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o-standard/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are an AI assistant. Use provided data to answer accurately."},
      {"role": "user", "content": "What deployment types does Azure OpenAI support?"}
    ],
    "data_sources": [
      {
        "type": "azure_search",
        "parameters": {
          "endpoint": "'${AZURE_SEARCH_ENDPOINT}'",
          "index_name": "ai102-docs-index",
          "authentication": {
            "type": "api_key",
            "key": "'${AZURE_SEARCH_KEY}'"
          },
          "query_type": "simple",
          "top_n_documents": 3,
          "in_scope": true
        }
      }
    ]
  }' | jq '{response: .choices[0].message.content, citations: .choices[0].message.context.citations}'
```

</TabItem>
</Tabs>

### Tarefa 4: Comparar Respostas Fundamentadas vs Não Fundamentadas

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
api_key = os.environ["AZURE_OPENAI_KEY"]
search_endpoint = os.environ["AZURE_SEARCH_ENDPOINT"]
search_key = os.environ["AZURE_SEARCH_KEY"]

client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version="2024-10-21"
)

question = "What are Microsoft's Responsible AI principles and how do content filters work?"

# Ungrounded response (no data source)
ungrounded = client.chat.completions.create(
    model="gpt-4o-standard",
    messages=[
        {"role": "system", "content": "You are an AI assistant."},
        {"role": "user", "content": question}
    ],
    max_tokens=300
)

print("=" * 60)
print("UNGROUNDED RESPONSE (no data source):")
print("=" * 60)
print(ungrounded.choices[0].message.content)

# Grounded response (with data source)
grounded = client.chat.completions.create(
    model="gpt-4o-standard",
    messages=[
        {"role": "system", "content": "You are an AI assistant. Answer based only on the provided data."},
        {"role": "user", "content": question}
    ],
    max_tokens=300,
    extra_body={
        "data_sources": [
            {
                "type": "azure_search",
                "parameters": {
                    "endpoint": search_endpoint,
                    "index_name": "ai102-docs-index",
                    "authentication": {
                        "type": "api_key",
                        "key": search_key
                    },
                    "query_type": "simple",
                    "top_n_documents": 3,
                    "in_scope": True
                }
            }
        ]
    }
)

print("\n" + "=" * 60)
print("GROUNDED RESPONSE (with Azure AI Search):")
print("=" * 60)
print(grounded.choices[0].message.content)

# Key differences to note:
print("\n" + "=" * 60)
print("COMPARISON NOTES:")
print("=" * 60)
print("- Grounded responses cite specific documents")
print("- Grounded responses stay within indexed knowledge")
print("- Ungrounded may include information not in your data")
print("- 'in_scope: true' restricts answers to indexed content only")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using Azure.AI.OpenAI.Chat;
using OpenAI.Chat;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;
string searchEndpoint = Environment.GetEnvironmentVariable("AZURE_SEARCH_ENDPOINT")!;
string searchKey = Environment.GetEnvironmentVariable("AZURE_SEARCH_KEY")!;

var client = new AzureOpenAIClient(
    new Uri(endpoint), new AzureKeyCredential(apiKey));
var chatClient = client.GetChatClient("gpt-4o-standard");

string question = "What are Microsoft's Responsible AI principles?";

// Ungrounded response
var ungroundedMessages = new ChatMessage[]
{
    new SystemChatMessage("You are an AI assistant."),
    new UserChatMessage(question)
};
var ungrounded = await chatClient.CompleteChatAsync(ungroundedMessages);

Console.WriteLine("=== UNGROUNDED RESPONSE ===");
Console.WriteLine(ungrounded.Value.Content[0].Text);

// Grounded response
var dataSource = new AzureSearchChatDataSource
{
    Endpoint = new Uri(searchEndpoint),
    IndexName = "ai102-docs-index",
    Authentication = DataSourceAuthentication.FromApiKey(searchKey),
    QueryType = DataSourceQueryType.Simple,
    TopNDocuments = 3,
    InScope = true
};

var options = new ChatCompletionOptions();
options.AddDataSource(dataSource);

var groundedMessages = new ChatMessage[]
{
    new SystemChatMessage("You are an AI assistant. Answer based only on provided data."),
    new UserChatMessage(question)
};
var grounded = await chatClient.CompleteChatAsync(groundedMessages, options);

Console.WriteLine("\n=== GROUNDED RESPONSE ===");
Console.WriteLine(grounded.Value.Content[0].Text);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Ungrounded response (standard chat completion)
echo "=== UNGROUNDED RESPONSE ==="
curl -s "${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o-standard/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are an AI assistant."},
      {"role": "user", "content": "What are Microsofts Responsible AI principles?"}
    ],
    "max_tokens": 300
  }' | jq -r '.choices[0].message.content'

echo ""
echo "=== GROUNDED RESPONSE ==="
# Grounded response (with data source)
curl -s "${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o-standard/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [
      {"role": "system", "content": "Answer based only on provided data."},
      {"role": "user", "content": "What are Microsofts Responsible AI principles?"}
    ],
    "max_tokens": 300,
    "data_sources": [{
      "type": "azure_search",
      "parameters": {
        "endpoint": "'${AZURE_SEARCH_ENDPOINT}'",
        "index_name": "ai102-docs-index",
        "authentication": {"type": "api_key", "key": "'${AZURE_SEARCH_KEY}'"},
        "query_type": "simple",
        "top_n_documents": 3,
        "in_scope": true
      }
    }]
  }' | jq -r '.choices[0].message.content'
```

</TabItem>
</Tabs>

## Saída Esperada

Após completar todas as tarefas, você deve ter:

1. **Índice Azure AI Search** `ai102-docs-index` com 5 documentos indexados
2. **Chat completions fundamentadas** retornando respostas baseadas nos seus documentos indexados
3. **Citações** referenciando títulos e caminhos de documentos específicos
4. **Comparação** mostrando que respostas fundamentadas ficam dentro dos seus dados enquanto não fundamentadas podem incluir conhecimento externo

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Busca não retorna resultados | Resposta "I don't have information about that" | Documentos não indexados ou consulta não corresponde ao conteúdo | Verifique a contagem de docs com `$count`; confirme que o campo é `searchable` |
| 403 no endpoint de busca | Falha de autenticação na fonte de dados | Chave API incorreta ou RBAC não configurado | Use chave admin para operações de índice; verifique a chave na configuração de data_source |
| Citações vazias | Resposta sem context/citations | `in_scope` definido como false ou `top_n_documents` muito baixo | Defina `in_scope: true` e aumente `top_n_documents` para 3-5 |
| Respostas alucinadas | Resposta inclui informações que não estão no índice | `in_scope` não habilitado | Defina `"in_scope": true` para restringir respostas ao conteúdo indexado |
| Criação do índice falha | `ServiceNotFound` | Serviço de busca não provisionado | Crie o serviço de busca: `az search service create --sku basic` |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ch14-q1",
    question: "Qual é o propósito principal do padrão RAG (Retrieval Augmented Generation)?",
    options: [
      "Fundamentar respostas de LLMs em conhecimento externo, reduzindo alucinações",
      "Fazer fine-tuning do modelo com novos dados",
      "Reduzir o custo de chamadas de API através de cache de respostas",
      "Substituir a necessidade de engenharia de prompt"
    ],
    correctAnswer: 0,
    explanation: "O RAG fundamenta respostas de LLMs em conhecimento externo recuperando primeiro documentos relevantes de um índice de busca, e então fornecendo-os como contexto ao modelo. Isso reduz alucinações e permite responder perguntas sobre dados nos quais o modelo não foi treinado."
  },
  {
    id: "ch14-q2",
    question: "No recurso 'On Your Data' do Azure OpenAI, o que o parâmetro 'in_scope' controla?",
    options: [
      "Se o modelo pode acessar a internet",
      "A região geográfica do serviço de busca",
      "Se as respostas são restritas apenas às informações encontradas na fonte de dados configurada",
      "Se o modelo usa seus dados de treinamento além do índice"
    ],
    correctAnswer: 2,
    explanation: "Quando 'in_scope' é definido como true, o modelo restringe suas respostas apenas às informações encontradas na fonte de dados configurada. Se a resposta não estiver nos dados indexados, o modelo indicará que não pode responder em vez de alucinar."
  },
  {
    id: "ch14-q3",
    question: "Qual parâmetro do SDK no cliente Python do OpenAI configura a fonte de dados Azure AI Search para RAG?",
    options: [
      "Parâmetro tools com função de busca",
      "Parâmetro extra_body com array data_sources",
      "Parâmetro context com search_config",
      "Parâmetro plugins com azure_search"
    ],
    correctAnswer: 1,
    explanation: "O recurso 'On Your Data' do Azure OpenAI é configurado via o parâmetro 'extra_body' contendo um array 'data_sources'. Cada fonte de dados especifica o tipo (azure_search), endpoint, nome do índice e detalhes de autenticação."
  },
  {
    id: "ch14-q4",
    question: "Qual é o papel do Azure AI Search no padrão RAG básico?",
    options: [
      "Ele gera a resposta final para o usuário",
      "Ele faz fine-tuning do modelo com novos dados",
      "Ele serve como camada de recuperação, indexando documentos e retornando chunks relevantes",
      "Ele gerencia autenticação e autorização de usuários"
    ],
    correctAnswer: 2,
    explanation: "O Azure AI Search serve como a camada de recuperação no RAG. Ele indexa seus documentos e fornece resultados de busca rápidos e relevantes. Quando um usuário faz uma pergunta, os chunks de documentos relevantes são recuperados e passados ao LLM como contexto para gerar uma resposta fundamentada."
  },
  {
    id: "ch14-q5",
    question: "O que acontece quando você consulta o Azure OpenAI com 'On Your Data' e a resposta não está nos documentos indexados (com in_scope=true)?",
    options: [
      "O modelo gera uma resposta a partir dos seus dados de treinamento",
      "A requisição falha com um erro 404",
      "O modelo busca a resposta na internet",
      "O modelo indica que não consegue encontrar a informação nos dados disponíveis"
    ],
    correctAnswer: 3,
    explanation: "Com in_scope=true, se a resposta não for encontrada nos documentos indexados, o modelo indicará que não consegue encontrar a informação relevante em vez de gerar respostas potencialmente incorretas a partir dos seus dados de treinamento."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-challenge14 --yes --no-wait
```

## Saiba Mais

- [Azure OpenAI On Your Data](https://learn.microsoft.com/azure/ai-services/openai/concepts/use-your-data)
- [Visão geral do Azure AI Search](https://learn.microsoft.com/azure/search/search-what-is-azure-search)
- [Padrão RAG com Azure](https://learn.microsoft.com/azure/architecture/ai-ml/guide/rag/rag-solution-design-and-evaluation-guide)
- [Criar um índice de busca](https://learn.microsoft.com/azure/search/search-how-to-create-search-index)
- [Referência da API de chat completions com fontes de dados](https://learn.microsoft.com/azure/ai-services/openai/references/on-your-data)
