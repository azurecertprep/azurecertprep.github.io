---
sidebar_position: 4
title: "Challenge 13: Prompt Flow"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 13: Prompt Flow

:::info Estimated Time
**45-60 min** | **Cost**: ~$1.00 (estimated) | **Domain**: Generative AI Solutions (15-20%)
:::

## Exam skills covered

- Implement a prompt flow solution
- Create and configure flow types (standard, chat, evaluation)
- Define flow nodes and connections for orchestration

## Overview

Prompt flow is an orchestration framework within Azure AI Foundry that enables you to build, test, and deploy LLM-powered workflows as directed acyclic graphs (DAGs). Each flow consists of **nodes** that execute sequentially or in parallel—including LLM nodes (calling Azure OpenAI), Python nodes (custom logic), and Prompt nodes (template rendering). Flows are defined in YAML and can be executed locally during development or deployed as managed endpoints.

There are three primary **flow types**: **Standard flows** for general-purpose LLM pipelines (data processing, summarization, extraction), **Chat flows** optimized for conversational applications with built-in chat history management, and **Evaluation flows** that assess the quality of other flows using metrics like groundedness, relevance, and coherence. The evaluation flow pattern is critical for production AI systems—it enables systematic quality measurement before deployment.

**Variants** allow A/B testing of prompts within a single flow. You can define multiple prompt variants for an LLM node and run them against the same inputs to compare quality and cost. **Connections** link flows to external services (Azure OpenAI, AI Search) and are configured at the workspace level, allowing secure credential management separate from flow logic.

## Architecture

Prompt flow orchestrates LLM calls, Python processing, and prompt templates as connected nodes in a DAG, with connections to external AI services.

![Challenge 13 topology](/img/ai-102/challenge-13-topology.svg)

## Prerequisites

- Azure AI Foundry project (from Challenge 11)
- Azure OpenAI deployment (from Challenge 12)
- Python 3.9+ with `promptflow` and `promptflow-tools` packages
- Azure CLI with `ml` extension

## Implementation

### Task 1: Create a Standard Prompt Flow

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

### Task 2: Add an Evaluation Flow

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

### Task 3: Test Flow with Variants

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

### Task 4: Deploy Flow to Managed Endpoint

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

## Expected Output

After completing all tasks, you should have:

1. **Standard flow** (`my-standard-flow/`) with:
   - `flow.dag.yaml` defining the DAG structure
   - LLM node using `generate_content.jinja2` template
   - Python node with `summarize.py` logic
2. **Evaluation flow** (`eval-flow/`) that scores relevance 1-5
3. **Variant flow** demonstrating A/B testing of prompt styles
4. **Deployed endpoint** serving the standard flow with key-based auth

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Flow test fails | `ConnectionNotFound: aoai-connection` | Connection not configured locally | Run `pf connection create --file connection.yaml` or set env vars |
| Node output empty | Downstream node receives `None` | Incorrect `${node.output}` reference | Verify node names match exactly in YAML references |
| Evaluation scores all 1 | LLM returns unexpected format | Prompt not constrained enough | Add "Return ONLY a number between 1 and 5" to system message |
| Deployment fails | `ModelNotFound` during deployment | Flow path incorrect or missing dependencies | Ensure `requirements.txt` is in flow directory |
| Variant not found | `VariantNotFound` error | Variant file naming doesn't match convention | Use `{node_name}_variant_{N}.jinja2` naming pattern |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ch13-q1",
    question: "What are the three primary flow types in Prompt Flow?",
    options: [
      "Input, Processing, and Output flows",
      "Standard, Chat, and Evaluation flows",
      "Simple, Complex, and Hybrid flows",
      "Batch, Streaming, and Real-time flows"
    ],
    correctAnswer: 1,
    explanation: "Prompt Flow supports three flow types: Standard (general-purpose LLM pipelines), Chat (conversational with history management), and Evaluation (quality assessment of other flows using metrics)."
  },
  {
    id: "ch13-q2",
    question: "How do variants enable prompt optimization in Prompt Flow?",
    options: [
      "Variants automatically select the best model for each request",
      "Variants allow A/B testing of different prompt templates within the same LLM node",
      "Variants split traffic between different endpoints",
      "Variants cache responses to reduce latency"
    ],
    correctAnswer: 1,
    explanation: "Variants allow you to define multiple prompt templates for an LLM node and run them against the same inputs. This enables A/B testing of different prompt styles, temperatures, or instructions to compare quality and cost."
  },
  {
    id: "ch13-q3",
    question: "What is the correct syntax to reference a node's output in flow YAML?",
    options: [
      "#{node_name.output}",
      "${inputs.node_name}",
      "${node_name.output}",
      "@{node_name.result}"
    ],
    correctAnswer: 2,
    explanation: "Node outputs are referenced using ${node_name.output} syntax in flow YAML. For flow inputs, use ${inputs.field_name}. This reference syntax connects nodes in the DAG."
  },
  {
    id: "ch13-q4",
    question: "What is the purpose of a connection in Prompt Flow?",
    options: [
      "To connect flow nodes in sequence",
      "To link the flow to source control",
      "To securely store and provide credentials for external services like Azure OpenAI",
      "To connect multiple flows into a pipeline"
    ],
    correctAnswer: 2,
    explanation: "Connections securely store credentials and endpoint information for external services (Azure OpenAI, AI Search, etc.). They are configured at the workspace level and referenced by name in flow nodes, separating credential management from flow logic."
  },
  {
    id: "ch13-q5",
    question: "Which node type would you use to implement custom data transformation logic in a flow?",
    options: [
      "LLM node with transformation instructions",
      "Python node with custom code",
      "Prompt node with Jinja2 template",
      "Tool node with built-in transform"
    ],
    correctAnswer: 1,
    explanation: "Python nodes execute custom Python code for data transformation, parsing, API calls, or any logic that doesn't require an LLM. They receive inputs from other nodes and produce outputs that downstream nodes can consume."
  }
]} />

## Cleanup

```bash
# Delete endpoint (stops billing for compute)
az ml online-endpoint delete \
  --name "pf-standard-flow-endpoint" \
  --resource-group rg-ai102-challenge13 \
  --workspace-name proj-ai102-genai --yes

az group delete --name rg-ai102-challenge13 --yes --no-wait
```

## Learn More

- [Prompt flow documentation](https://learn.microsoft.com/azure/ai-studio/how-to/prompt-flow)
- [Create and run a flow](https://learn.microsoft.com/azure/ai-studio/how-to/flow-develop)
- [Evaluate flows](https://learn.microsoft.com/azure/ai-studio/how-to/evaluate-flow-results)
- [Deploy a flow](https://learn.microsoft.com/azure/ai-studio/how-to/flow-deploy)
- [Prompt flow SDK reference](https://microsoft.github.io/promptflow/)
