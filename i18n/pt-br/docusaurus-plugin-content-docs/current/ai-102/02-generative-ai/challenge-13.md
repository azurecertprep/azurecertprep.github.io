---
sidebar_position: 4
title: "Desafio 13: Prompt Flow"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 13: Prompt Flow

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$1.00 (estimado) | **Domínio**: Soluções de IA Generativa (15-20%)
:::

## Habilidades do exame abordadas

- Implementar uma solução com prompt flow
- Criar e configurar tipos de fluxo (standard, chat, evaluation)
- Definir nós e conexões de fluxo para orquestração

## Visão Geral

Prompt flow é um framework de orquestração dentro do Azure AI Foundry que permite construir, testar e implantar workflows baseados em LLM como grafos acíclicos direcionados (DAGs). Cada fluxo consiste em **nós** que executam sequencialmente ou em paralelo—incluindo nós LLM (chamando Azure OpenAI), nós Python (lógica customizada) e nós Prompt (renderização de templates). Os fluxos são definidos em YAML e podem ser executados localmente durante o desenvolvimento ou implantados como endpoints gerenciados.

Existem três **tipos de fluxo** principais: **Standard flows** para pipelines LLM de propósito geral (processamento de dados, sumarização, extração), **Chat flows** otimizados para aplicações conversacionais com gerenciamento integrado de histórico de chat, e **Evaluation flows** que avaliam a qualidade de outros fluxos usando métricas como fundamentação, relevância e coerência. O padrão de evaluation flow é crítico para sistemas de IA em produção—ele permite medição sistemática de qualidade antes da implantação.

**Variants** permitem testes A/B de prompts dentro de um único fluxo. Você pode definir múltiplas variantes de prompt para um nó LLM e executá-las contra as mesmas entradas para comparar qualidade e custo. **Connections** vinculam fluxos a serviços externos (Azure OpenAI, AI Search) e são configuradas no nível do workspace, permitindo gerenciamento seguro de credenciais separado da lógica do fluxo.

## Arquitetura

Prompt flow orquestra chamadas LLM, processamento Python e templates de prompt como nós conectados em um DAG, com conexões a serviços de IA externos.

![Topologia do Desafio 13](/img/ai-102/challenge-13-topology.svg)

## Pré-requisitos

- Projeto Azure AI Foundry (do Desafio 11)
- Implantação Azure OpenAI (do Desafio 12)
- Python 3.9+ com pacotes `promptflow` e `promptflow-tools`
- Azure CLI com extensão `ml`

## Implementação

### Tarefa 1: Criar um Standard Prompt Flow

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from promptflow.client import PFClient
from promptflow.entities import Run

# Initialize the Prompt Flow client (local development)
pf = PFClient()

# Define flow YAML programmatically
flow_yaml = """
$schema: https://azuremlschemas.azureedge.net/promptflow/latest/Flow.schema.json
inputs:
  topic:
    type: string
    default: "Azure AI Services"
outputs:
  summary:
    type: string
    reference: ${summarize.output}
nodes:
  - name: generate_content
    type: llm
    source:
      type: code
      path: generate_content.jinja2
    inputs:
      deployment_name: gpt-4o-standard
      max_tokens: 500
      temperature: 0.7
      topic: ${inputs.topic}
    connection: aoai-connection
    api: chat
  - name: summarize
    type: python
    source:
      type: code
      path: summarize.py
    inputs:
      content: ${generate_content.output}
"""

# Write flow definition
os.makedirs("my-standard-flow", exist_ok=True)
with open("my-standard-flow/flow.dag.yaml", "w") as f:
    f.write(flow_yaml)

# Create the LLM node prompt template
prompt_template = """system:
You are a technical writer specializing in Azure cloud services.

user:
Write a detailed paragraph about: {{topic}}
"""
with open("my-standard-flow/generate_content.jinja2", "w") as f:
    f.write(prompt_template)

# Create the Python processing node
python_node = """
def summarize(content: str) -> str:
    \"\"\"Extract key points from generated content.\"\"\"
    lines = content.strip().split(". ")
    key_points = [line.strip() for line in lines[:3]]
    summary = "Key points: " + "; ".join(key_points)
    return summary
"""
with open("my-standard-flow/summarize.py", "w") as f:
    f.write(python_node)

print("Flow created at: my-standard-flow/")
print("Files: flow.dag.yaml, generate_content.jinja2, summarize.py")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.AI.OpenAI;
using System.Text.Json;

// Note: Prompt Flow is primarily a Python/YAML framework.
// In C#, you interact with deployed prompt flow endpoints or build equivalent logic.
// Below demonstrates calling a deployed prompt flow endpoint.

string endpoint = Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_AI_KEY")!;

// If prompt flow is deployed as a managed endpoint:
using var httpClient = new HttpClient();
httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
httpClient.DefaultRequestHeaders.Add("azureml-model-deployment", "my-standard-flow");

var requestBody = new
{
    topic = "Azure AI Services"
};

var response = await httpClient.PostAsync(
    $"{endpoint}/score",
    new StringContent(JsonSerializer.Serialize(requestBody),
        System.Text.Encoding.UTF8, "application/json"));

var result = await response.Content.ReadAsStringAsync();
Console.WriteLine($"Flow output: {result}");

// For local development, build the equivalent pipeline:
var openAiClient = new AzureOpenAIClient(
    new Uri(Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!),
    new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!));

var chatClient = openAiClient.GetChatClient("gpt-4o-standard");

// Step 1: Generate content (equivalent to LLM node)
var generateResponse = await chatClient.CompleteChatAsync(new[]
{
    new Azure.AI.OpenAI.Chat.SystemChatMessage(
        "You are a technical writer specializing in Azure cloud services."),
    new Azure.AI.OpenAI.Chat.UserChatMessage(
        "Write a detailed paragraph about: Azure AI Services")
});
string content = generateResponse.Value.Content[0].Text;

// Step 2: Summarize (equivalent to Python node)
var sentences = content.Split(". ").Take(3);
string summary = "Key points: " + string.Join("; ", sentences);
Console.WriteLine(summary);
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Install promptflow CLI tools
pip install promptflow promptflow-tools

# Create flow directory structure
mkdir -p my-standard-flow

# Create flow.dag.yaml
cat > my-standard-flow/flow.dag.yaml << 'EOF'
$schema: https://azuremlschemas.azureedge.net/promptflow/latest/Flow.schema.json
inputs:
  topic:
    type: string
    default: "Azure AI Services"
outputs:
  summary:
    type: string
    reference: ${summarize.output}
nodes:
  - name: generate_content
    type: llm
    source:
      type: code
      path: generate_content.jinja2
    inputs:
      deployment_name: gpt-4o-standard
      max_tokens: 500
      temperature: 0.7
      topic: ${inputs.topic}
    connection: aoai-connection
    api: chat
  - name: summarize
    type: python
    source:
      type: code
      path: summarize.py
    inputs:
      content: ${generate_content.output}
EOF

# Create prompt template
cat > my-standard-flow/generate_content.jinja2 << 'EOF'
system:
You are a technical writer specializing in Azure cloud services.

user:
Write a detailed paragraph about: {{topic}}
EOF

# Create Python node
cat > my-standard-flow/summarize.py << 'EOF'
def summarize(content: str) -> str:
    lines = content.strip().split(". ")
    key_points = [line.strip() for line in lines[:3]]
    return "Key points: " + "; ".join(key_points)
EOF

# Test the flow locally
pf flow test --flow my-standard-flow --inputs topic="Azure AI Services"
```

</TabItem>
</Tabs>

### Tarefa 2: Adicionar um Evaluation Flow

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from promptflow.client import PFClient
from promptflow.entities import Run, AzureOpenAIConnection

pf = PFClient()

# Define evaluation flow
eval_flow_yaml = """
$schema: https://azuremlschemas.azureedge.net/promptflow/latest/Flow.schema.json
inputs:
  question:
    type: string
  answer:
    type: string
  ground_truth:
    type: string
outputs:
  relevance_score:
    type: string
    reference: ${evaluate_relevance.output}
nodes:
  - name: evaluate_relevance
    type: llm
    source:
      type: code
      path: evaluate_relevance.jinja2
    inputs:
      deployment_name: gpt-4o-standard
      max_tokens: 50
      temperature: 0.0
      question: ${inputs.question}
      answer: ${inputs.answer}
      ground_truth: ${inputs.ground_truth}
    connection: aoai-connection
    api: chat
"""

os.makedirs("eval-flow", exist_ok=True)
with open("eval-flow/flow.dag.yaml", "w") as f:
    f.write(eval_flow_yaml)

# Evaluation prompt template
eval_prompt = """system:
You are an AI quality evaluator. Score the answer's relevance to the question on a scale of 1-5.
Return ONLY a number.

user:
Question: {{question}}
Answer: {{answer}}
Ground Truth: {{ground_truth}}

Score (1-5):
"""
with open("eval-flow/evaluate_relevance.jinja2", "w") as f:
    f.write(eval_prompt)

# Create test data for evaluation
import json
test_data = [
    {
        "question": "What is Azure AI Foundry?",
        "answer": "Azure AI Foundry is a platform for building generative AI apps.",
        "ground_truth": "Azure AI Foundry is a unified platform for building, testing, and deploying AI solutions with hub and project architecture."
    },
    {
        "question": "What models does Azure OpenAI support?",
        "answer": "Azure OpenAI supports GPT-4o, GPT-4o-mini, and other models.",
        "ground_truth": "Azure OpenAI supports GPT-4o, GPT-4o-mini, GPT-4, DALL-E, Whisper, and text embedding models."
    }
]
with open("eval-flow/test_data.jsonl", "w") as f:
    for item in test_data:
        f.write(json.dumps(item) + "\n")

# Run the evaluation
eval_run = pf.run(
    flow="eval-flow",
    data="eval-flow/test_data.jsonl",
    name="eval-run-001"
)
print(f"Evaluation run: {eval_run.name}")
print(f"Status: {eval_run.status}")

# Get results
details = pf.get_details(eval_run)
print(f"\nResults:\n{details}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using System.Text.Json;

// Evaluation logic implemented as a C# equivalent to the evaluation flow
string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

var client = new AzureOpenAIClient(
    new Uri(endpoint), new AzureKeyCredential(apiKey));
var chatClient = client.GetChatClient("gpt-4o-standard");

// Test data for evaluation
var testCases = new[]
{
    new {
        Question = "What is Azure AI Foundry?",
        Answer = "Azure AI Foundry is a platform for building generative AI apps.",
        GroundTruth = "Azure AI Foundry is a unified platform for building, testing, and deploying AI solutions."
    },
    new {
        Question = "What models does Azure OpenAI support?",
        Answer = "Azure OpenAI supports GPT-4o, GPT-4o-mini, and other models.",
        GroundTruth = "Azure OpenAI supports GPT-4o, GPT-4o-mini, GPT-4, DALL-E, Whisper, and embedding models."
    }
};

Console.WriteLine("--- Evaluation Results ---");
foreach (var testCase in testCases)
{
    var evalPrompt = $@"Question: {testCase.Question}
Answer: {testCase.Answer}
Ground Truth: {testCase.GroundTruth}

Score the answer's relevance (1-5). Return ONLY a number.";

    var response = await chatClient.CompleteChatAsync(new[]
    {
        new Azure.AI.OpenAI.Chat.SystemChatMessage(
            "You are an AI quality evaluator. Score relevance 1-5. Return ONLY a number."),
        new Azure.AI.OpenAI.Chat.UserChatMessage(evalPrompt)
    });

    string score = response.Value.Content[0].Text.Trim();
    Console.WriteLine($"  Q: {testCase.Question}");
    Console.WriteLine($"  Relevance Score: {score}/5\n");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create evaluation flow structure
mkdir -p eval-flow

cat > eval-flow/flow.dag.yaml << 'EOF'
$schema: https://azuremlschemas.azureedge.net/promptflow/latest/Flow.schema.json
inputs:
  question:
    type: string
  answer:
    type: string
  ground_truth:
    type: string
outputs:
  relevance_score:
    type: string
    reference: ${evaluate_relevance.output}
nodes:
  - name: evaluate_relevance
    type: llm
    source:
      type: code
      path: evaluate_relevance.jinja2
    inputs:
      deployment_name: gpt-4o-standard
      max_tokens: 50
      temperature: 0.0
      question: ${inputs.question}
      answer: ${inputs.answer}
      ground_truth: ${inputs.ground_truth}
    connection: aoai-connection
    api: chat
EOF

# Create test data
cat > eval-flow/test_data.jsonl << 'EOF'
{"question": "What is Azure AI Foundry?", "answer": "A platform for building AI apps.", "ground_truth": "A unified platform for building, testing, and deploying AI solutions."}
{"question": "What models does Azure OpenAI support?", "answer": "GPT-4o and GPT-4o-mini.", "ground_truth": "GPT-4o, GPT-4o-mini, GPT-4, DALL-E, Whisper, and embedding models."}
EOF

# Run evaluation flow with batch data
pf run create \
  --flow eval-flow \
  --data eval-flow/test_data.jsonl \
  --name "eval-run-001" \
  --stream

# View results
pf run show-details --name "eval-run-001"
pf run show-metrics --name "eval-run-001"
```

</TabItem>
</Tabs>

### Tarefa 3: Testar Fluxo com Variants

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from promptflow.client import PFClient

pf = PFClient()

# Create a flow with prompt variants for A/B testing
variant_flow_yaml = """
$schema: https://azuremlschemas.azureedge.net/promptflow/latest/Flow.schema.json
inputs:
  topic:
    type: string
    default: "Azure Kubernetes Service"
outputs:
  result:
    type: string
    reference: ${generate.output}
nodes:
  - name: generate
    type: llm
    source:
      type: code
      path: generate.jinja2
    inputs:
      deployment_name: gpt-4o-standard
      max_tokens: 300
      temperature: 0.7
      topic: ${inputs.topic}
    connection: aoai-connection
    api: chat
    use_variants: true
"""

os.makedirs("variant-flow", exist_ok=True)
with open("variant-flow/flow.dag.yaml", "w") as f:
    f.write(variant_flow_yaml)

# Variant 0: Concise style
variant_0 = """system:
You are a concise technical writer. Keep responses under 100 words.

user:
Explain: {{topic}}
"""
with open("variant-flow/generate.jinja2", "w") as f:
    f.write(variant_0)

# Variant 1: Detailed style
variant_1 = """system:
You are a detailed technical writer. Provide comprehensive explanations with examples.

user:
Provide a detailed explanation of: {{topic}}
Include at least one practical example.
"""
with open("variant-flow/generate_variant_1.jinja2", "w") as f:
    f.write(variant_1)

# Test with default variant
result_0 = pf.test(flow="variant-flow", inputs={"topic": "Azure Kubernetes Service"})
print(f"Variant 0 (Concise): {result_0['result'][:100]}...")

# Test with variant 1
result_1 = pf.test(
    flow="variant-flow",
    inputs={"topic": "Azure Kubernetes Service"},
    node="generate",
    variant="${generate.variant_1}"
)
print(f"\nVariant 1 (Detailed): {result_1['result'][:100]}...")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

var client = new AzureOpenAIClient(
    new Uri(endpoint), new AzureKeyCredential(apiKey));
var chatClient = client.GetChatClient("gpt-4o-standard");

string topic = "Azure Kubernetes Service";

// Variant 0: Concise style
var conciseResponse = await chatClient.CompleteChatAsync(new[]
{
    new Azure.AI.OpenAI.Chat.SystemChatMessage(
        "You are a concise technical writer. Keep responses under 100 words."),
    new Azure.AI.OpenAI.Chat.UserChatMessage($"Explain: {topic}")
});

Console.WriteLine("Variant 0 (Concise):");
Console.WriteLine($"  {conciseResponse.Value.Content[0].Text}");
Console.WriteLine($"  Tokens: {conciseResponse.Value.Usage.TotalTokenCount}\n");

// Variant 1: Detailed style
var detailedResponse = await chatClient.CompleteChatAsync(new[]
{
    new Azure.AI.OpenAI.Chat.SystemChatMessage(
        "You are a detailed technical writer. Provide comprehensive explanations with examples."),
    new Azure.AI.OpenAI.Chat.UserChatMessage(
        $"Provide a detailed explanation of: {topic}\nInclude at least one practical example.")
});

Console.WriteLine("Variant 1 (Detailed):");
Console.WriteLine($"  {detailedResponse.Value.Content[0].Text}");
Console.WriteLine($"  Tokens: {detailedResponse.Value.Usage.TotalTokenCount}");

// Compare: Variant 0 costs less tokens but may sacrifice quality
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Test flow with default variant
pf flow test --flow variant-flow --inputs topic="Azure Kubernetes Service"

# Test flow with variant 1
pf flow test --flow variant-flow \
  --inputs topic="Azure Kubernetes Service" \
  --variant '${generate.variant_1}'

# Run batch test comparing variants
pf run create \
  --flow variant-flow \
  --data variant-flow/test_data.jsonl \
  --variant '${generate.variant_1}' \
  --name "variant-1-run"

# Compare runs
pf run visualize --names "default-run,variant-1-run"
```

</TabItem>
</Tabs>

### Tarefa 4: Implantar Fluxo em Endpoint Gerenciado

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.ai.ml import MLClient
from azure.ai.ml.entities import (
    ManagedOnlineEndpoint,
    ManagedOnlineDeployment,
    Model,
    Environment,
)

credential = DefaultAzureCredential()
ml_client = MLClient(
    credential=credential,
    subscription_id="YOUR_SUBSCRIPTION_ID",
    resource_group_name="rg-ai102-challenge13",
    workspace_name="proj-ai102-genai",
)

# Create managed online endpoint
endpoint = ManagedOnlineEndpoint(
    name="pf-standard-flow-endpoint",
    description="Prompt Flow standard flow endpoint",
    auth_mode="key",
)
ml_client.online_endpoints.begin_create_or_update(endpoint).result()
print(f"Endpoint created: {endpoint.name}")

# Deploy the flow
deployment = ManagedOnlineDeployment(
    name="default",
    endpoint_name="pf-standard-flow-endpoint",
    model=Model(path="my-standard-flow"),
    instance_type="Standard_DS3_v2",
    instance_count=1,
)
ml_client.online_deployments.begin_create_or_update(deployment).result()
print(f"Deployment created: {deployment.name}")

# Set traffic to 100%
endpoint.traffic = {"default": 100}
ml_client.online_endpoints.begin_create_or_update(endpoint).result()

# Test the deployed endpoint
import json
result = ml_client.online_endpoints.invoke(
    endpoint_name="pf-standard-flow-endpoint",
    request_file=json.dumps({"topic": "Azure AI Services"}),
)
print(f"Response: {result}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.MachineLearning;
using Azure.ResourceManager.MachineLearning.Models;
using System.Text.Json;

var credential = new DefaultAzureCredential();
var client = new ArmClient(credential);

string subscriptionId = "YOUR_SUBSCRIPTION_ID";
string resourceGroup = "rg-ai102-challenge13";
string workspaceName = "proj-ai102-genai";

var workspaceId = MachineLearningWorkspaceResource.CreateResourceIdentifier(
    subscriptionId, resourceGroup, workspaceName);
var workspace = client.GetMachineLearningWorkspaceResource(workspaceId);

// Create online endpoint
var endpoints = workspace.GetMachineLearningOnlineEndpoints();
var endpointData = new MachineLearningOnlineEndpointData(
    Azure.Core.AzureLocation.EastUS2)
{
    Properties = new MachineLearningOnlineEndpointProperties(
        MachineLearningEndpointAuthMode.Key)
    {
        Description = "Prompt Flow endpoint"
    }
};

var endpointOp = await endpoints.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "pf-standard-flow-endpoint", endpointData);
Console.WriteLine($"Endpoint created: {endpointOp.Value.Data.Name}");

// Invoke the deployed endpoint
using var httpClient = new HttpClient();
var scoringUri = endpointOp.Value.Data.Properties.ScoringUri;
var keys = await endpointOp.Value.GetKeysAsync();

httpClient.DefaultRequestHeaders.Add(
    "Authorization", $"Bearer {keys.Value.PrimaryKey}");

var payload = JsonSerializer.Serialize(new { topic = "Azure AI Services" });
var response = await httpClient.PostAsync(scoringUri.ToString(),
    new StringContent(payload, System.Text.Encoding.UTF8, "application/json"));

Console.WriteLine($"Response: {await response.Content.ReadAsStringAsync()}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Deploy flow to Azure AI Foundry managed endpoint
# First, register the flow as a model
az ml model create \
  --name "standard-flow-model" \
  --path my-standard-flow \
  --resource-group rg-ai102-challenge13 \
  --workspace-name proj-ai102-genai

# Create online endpoint
az ml online-endpoint create \
  --name "pf-standard-flow-endpoint" \
  --resource-group rg-ai102-challenge13 \
  --workspace-name proj-ai102-genai \
  --auth-mode key

# Create deployment
az ml online-deployment create \
  --name default \
  --endpoint-name "pf-standard-flow-endpoint" \
  --model "azureml:standard-flow-model:1" \
  --instance-type Standard_DS3_v2 \
  --instance-count 1 \
  --resource-group rg-ai102-challenge13 \
  --workspace-name proj-ai102-genai

# Set traffic
az ml online-endpoint update \
  --name "pf-standard-flow-endpoint" \
  --traffic "default=100" \
  --resource-group rg-ai102-challenge13 \
  --workspace-name proj-ai102-genai

# Test endpoint
az ml online-endpoint invoke \
  --name "pf-standard-flow-endpoint" \
  --request-file request.json \
  --resource-group rg-ai102-challenge13 \
  --workspace-name proj-ai102-genai
```

</TabItem>
</Tabs>

## Saída Esperada

Após completar todas as tarefas, você deve ter:

1. **Standard flow** (`my-standard-flow/`) com:
   - `flow.dag.yaml` definindo a estrutura do DAG
   - Nó LLM usando o template `generate_content.jinja2`
   - Nó Python com a lógica `summarize.py`
2. **Evaluation flow** (`eval-flow/`) que pontua relevância de 1-5
3. **Variant flow** demonstrando teste A/B de estilos de prompt
4. **Endpoint implantado** servindo o standard flow com autenticação por chave

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Teste do fluxo falha | `ConnectionNotFound: aoai-connection` | Conexão não configurada localmente | Execute `pf connection create --file connection.yaml` ou defina variáveis de ambiente |
| Saída do nó vazia | Nó downstream recebe `None` | Referência `${node.output}` incorreta | Verifique se os nomes dos nós correspondem exatamente nas referências YAML |
| Avaliação pontua tudo como 1 | LLM retorna formato inesperado | Prompt não restritivo o suficiente | Adicione "Return ONLY a number between 1 and 5" à mensagem de sistema |
| Implantação falha | `ModelNotFound` durante implantação | Caminho do fluxo incorreto ou dependências faltando | Garanta que `requirements.txt` está no diretório do fluxo |
| Variant não encontrada | Erro `VariantNotFound` | Nomenclatura do arquivo de variante não segue a convenção | Use o padrão de nomenclatura `{node_name}_variant_{N}.jinja2` |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ch13-q1",
    question: "Quais são os três tipos de fluxo principais no Prompt Flow?",
    options: [
      "Fluxos de Input, Processing e Output",
      "Fluxos Standard, Chat e Evaluation",
      "Fluxos Simple, Complex e Hybrid",
      "Fluxos Batch, Streaming e Real-time"
    ],
    correctAnswer: 1,
    explanation: "O Prompt Flow suporta três tipos de fluxo: Standard (pipelines LLM de propósito geral), Chat (conversacional com gerenciamento de histórico) e Evaluation (avaliação de qualidade de outros fluxos usando métricas)."
  },
  {
    id: "ch13-q2",
    question: "Como as variants permitem otimização de prompts no Prompt Flow?",
    options: [
      "Variants selecionam automaticamente o melhor modelo para cada requisição",
      "Variants permitem teste A/B de diferentes templates de prompt dentro do mesmo nó LLM",
      "Variants dividem o tráfego entre diferentes endpoints",
      "Variants fazem cache de respostas para reduzir latência"
    ],
    correctAnswer: 1,
    explanation: "Variants permitem que você defina múltiplos templates de prompt para um nó LLM e os execute contra as mesmas entradas. Isso permite teste A/B de diferentes estilos de prompt, temperaturas ou instruções para comparar qualidade e custo."
  },
  {
    id: "ch13-q3",
    question: "Qual é a sintaxe correta para referenciar a saída de um nó no YAML do fluxo?",
    options: [
      "#{node_name.output}",
      "${inputs.node_name}",
      "${node_name.output}",
      "@{node_name.result}"
    ],
    correctAnswer: 2,
    explanation: "Saídas de nós são referenciadas usando a sintaxe ${node_name.output} no YAML do fluxo. Para inputs do fluxo, use ${inputs.field_name}. Essa sintaxe de referência conecta os nós no DAG."
  },
  {
    id: "ch13-q4",
    question: "Qual é o propósito de uma connection no Prompt Flow?",
    options: [
      "Conectar nós do fluxo em sequência",
      "Vincular o fluxo ao controle de versão",
      "Armazenar de forma segura e fornecer credenciais para serviços externos como Azure OpenAI",
      "Conectar múltiplos fluxos em um pipeline"
    ],
    correctAnswer: 2,
    explanation: "Connections armazenam de forma segura credenciais e informações de endpoint para serviços externos (Azure OpenAI, AI Search, etc.). Elas são configuradas no nível do workspace e referenciadas por nome nos nós do fluxo, separando o gerenciamento de credenciais da lógica do fluxo."
  },
  {
    id: "ch13-q5",
    question: "Qual tipo de nó você usaria para implementar lógica customizada de transformação de dados em um fluxo?",
    options: [
      "Nó LLM com instruções de transformação",
      "Nó Python com código customizado",
      "Nó Prompt com template Jinja2",
      "Nó Tool com transform integrado"
    ],
    correctAnswer: 1,
    explanation: "Nós Python executam código Python customizado para transformação de dados, parsing, chamadas de API ou qualquer lógica que não requer um LLM. Eles recebem inputs de outros nós e produzem outputs que nós downstream podem consumir."
  }
]} />

## Limpeza

```bash
# Delete endpoint (stops billing for compute)
az ml online-endpoint delete \
  --name "pf-standard-flow-endpoint" \
  --resource-group rg-ai102-challenge13 \
  --workspace-name proj-ai102-genai --yes

az group delete --name rg-ai102-challenge13 --yes --no-wait
```

## Saiba Mais

- [Documentação do Prompt flow](https://learn.microsoft.com/azure/ai-studio/how-to/prompt-flow)
- [Criar e executar um fluxo](https://learn.microsoft.com/azure/ai-studio/how-to/flow-develop)
- [Avaliar fluxos](https://learn.microsoft.com/azure/ai-studio/how-to/evaluate-flow-results)
- [Implantar um fluxo](https://learn.microsoft.com/azure/ai-studio/how-to/flow-deploy)
- [Referência do SDK Prompt flow](https://microsoft.github.io/promptflow/)
