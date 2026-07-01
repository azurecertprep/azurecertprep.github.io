---
sidebar_position: 5
title: "Challenge 14: RAG Pattern: Basic"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 14: RAG Pattern: Basic

:::info Estimated Time
**60 min** | **Cost**: ~$3.00 (AI Search + OpenAI) | **Domain**: Generative AI & Agentic Solutions (35-40%)
:::

## Exam skills covered

- Implement Retrieval Augmented Generation (RAG) by grounding models in your data
- Create and configure Azure AI Search indexes
- Use Azure OpenAI "On Your Data" feature for grounded responses

## Overview

**Retrieval Augmented Generation (RAG)** is a pattern that enhances LLM responses by first retrieving relevant information from an external knowledge base, then providing that context to the model alongside the user's question. This "grounds" the model's response in factual data, significantly reducing hallucinations and enabling the model to answer questions about proprietary or current information it wasn't trained on.

The basic RAG pattern in Azure uses **Azure AI Search** as the retrieval layer and **Azure OpenAI** as the generation layer. Azure AI Search indexes your documents (PDFs, Word files, web pages, structured data) and provides fast, relevant search results. Azure OpenAI's **"On Your Data"** feature simplifies RAG by automatically orchestrating the retrieval and generation steps—you configure a data source connection, and the service handles chunking, searching, and prompt augmentation behind the scenes.

The architecture flow is: User Query → Azure OpenAI (with data source config) → Azure AI Search (retrieval) → Relevant chunks returned → LLM generates grounded response with citations. Understanding this flow, configuring the data source connection, and comparing grounded vs. ungrounded responses are essential skills for the AI-103 exam.

## Architecture

The RAG pattern connects Azure OpenAI to Azure AI Search, enabling the model to retrieve relevant document chunks before generating responses.

![Challenge 14 topology](/img/ai-103/challenge-14-topology.svg)

## Prerequisites

- Azure subscription with Azure OpenAI access
- Azure CLI installed
- GPT-4o deployment (from Challenge 12)
- Python 3.9+ with `openai`, `azure-search-documents`, and `azure-identity` packages

## Implementation

### Task 1: Create Azure AI Search Index

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

### Task 2: Upload Sample Documents

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

### Task 3: Configure Azure OpenAI "On Your Data"

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

### Task 4: Compare Grounded vs Ungrounded Responses

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

## Expected Output

After completing all tasks, you should have:

1. **Azure AI Search index** `ai102-docs-index` with 5 documents indexed
2. **Grounded chat completions** returning answers sourced from your indexed documents
3. **Citations** referencing specific document titles and paths
4. **Comparison** showing grounded responses stay within your data while ungrounded may include external knowledge

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Search returns no results | "I don't have information about that" response | Documents not indexed or query doesn't match content | Verify doc count with `$count`; check field is `searchable` |
| 403 on search endpoint | Authentication failed for data source | Wrong API key or RBAC not configured | Use admin key for index operations; verify key in data_source config |
| Empty citations | Response has no context/citations | `in_scope` set to false or `top_n_documents` too low | Set `in_scope: true` and increase `top_n_documents` to 3-5 |
| Hallucinated answers | Response includes info not in index | `in_scope` not enabled | Set `"in_scope": true` to restrict answers to indexed content |
| Index creation fails | `ServiceNotFound` | Search service not provisioned | Create search service: `az search service create --sku basic` |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ch14-q1",
    question: "What is the primary purpose of the RAG (Retrieval Augmented Generation) pattern?",
    options: [
      "To ground LLM responses in external knowledge, reducing hallucinations",
      "To fine-tune the model on new data",
      "To reduce the cost of API calls by caching responses",
      "To replace the need for prompt engineering"
    ],
    correctAnswer: 0,
    explanation: "RAG grounds LLM responses in external knowledge by first retrieving relevant documents from a search index, then providing them as context to the model. This reduces hallucinations and enables answering questions about data the model wasn't trained on."
  },
  {
    id: "ch14-q2",
    question: "In Azure OpenAI's 'On Your Data' feature, what does the 'in_scope' parameter control?",
    options: [
      "Whether the model can access the internet",
      "The geographic region of the search service",
      "Whether responses are restricted to only information found in the configured data source",
      "Whether the model uses its training data in addition to the index"
    ],
    correctAnswer: 2,
    explanation: "When 'in_scope' is set to true, the model restricts its responses to only information found in the configured data source. If the answer isn't in the indexed data, the model will indicate it cannot answer rather than hallucinating."
  },
  {
    id: "ch14-q3",
    question: "Which SDK parameter in the OpenAI Python client configures the Azure AI Search data source for RAG?",
    options: [
      "tools parameter with search function",
      "extra_body parameter with data_sources array",
      "context parameter with search_config",
      "plugins parameter with azure_search"
    ],
    correctAnswer: 1,
    explanation: "The Azure OpenAI 'On Your Data' feature is configured via the 'extra_body' parameter containing a 'data_sources' array. Each data source specifies the type (azure_search), endpoint, index name, and authentication details."
  },
  {
    id: "ch14-q4",
    question: "What is the role of Azure AI Search in the basic RAG pattern?",
    options: [
      "It generates the final response to the user",
      "It fine-tunes the model with new data",
      "It serves as the retrieval layer, indexing documents and returning relevant chunks",
      "It handles user authentication and authorization"
    ],
    correctAnswer: 2,
    explanation: "Azure AI Search serves as the retrieval layer in RAG. It indexes your documents and provides fast, relevant search results. When a user asks a question, the relevant document chunks are retrieved and passed to the LLM as context for generating a grounded response."
  },
  {
    id: "ch14-q5",
    question: "What happens when you query Azure OpenAI with 'On Your Data' and the answer is not in the indexed documents (with in_scope=true)?",
    options: [
      "The model generates an answer from its training data",
      "The request fails with a 404 error",
      "The model searches the internet for the answer",
      "The model indicates it cannot find the information in the available data"
    ],
    correctAnswer: 3,
    explanation: "With in_scope=true, if the answer is not found in the indexed documents, the model will indicate it cannot find the relevant information rather than generating potentially incorrect answers from its training data."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge14 --yes --no-wait
```

## Learn More

- [Azure OpenAI On Your Data](https://learn.microsoft.com/azure/ai-services/openai/concepts/use-your-data)
- [Azure AI Search overview](https://learn.microsoft.com/azure/search/search-what-is-azure-search)
- [RAG pattern with Azure](https://learn.microsoft.com/azure/architecture/ai-ml/guide/rag/rag-solution-design-and-evaluation-guide)
- [Create a search index](https://learn.microsoft.com/azure/search/search-how-to-create-search-index)
- [Chat completions with data sources API reference](https://learn.microsoft.com/azure/ai-services/openai/references/on-your-data)
