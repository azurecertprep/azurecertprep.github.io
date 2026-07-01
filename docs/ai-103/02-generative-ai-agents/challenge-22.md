---
sidebar_position: 3
title: "Challenge 22: Azure AI Agent Service"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 22: Azure AI Agent Service

:::info Estimated Time
**60 min** | **Cost**: $3-8 (estimated) | **Domain**: Generative AI & Agentic Solutions (35-40%)
:::

## Exam skills covered
- Create an agent with Azure AI Agent Service
- Configure agent tools (file search, code interpreter)
- Manage threads and runs for agent conversations

## Overview

Azure AI Agent Service provides a managed platform for building AI agents. It handles thread management, tool execution (file search, code interpreter, custom functions), run lifecycle, and file management.

The architecture: create an agent → create a thread → add messages → create a run → poll until complete → read responses.

## Prerequisites
- Azure subscription
- Azure AI Foundry hub and project
- Python 3.9+ or .NET 8
- Packages: `azure-ai-projects`, `azure-identity`

## Implementation

### Task 1: Set Up Azure AI Foundry Project

```bash
az group create --name rg-ai102-foundry-agents --location eastus2

az extension add --name ml

az ml workspace create \
  --name hub-ai102-agents \
  --resource-group rg-ai102-foundry-agents \
  --kind hub \
  --location eastus2
```

### Task 2: Create Agent with File Search

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import time
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import FilePurpose, FileSearchTool, RunStatus
from azure.identity import DefaultAzureCredential

project_client = AIProjectClient(
    credential=DefaultAzureCredential(),
    endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
)

# Upload a knowledge file
with open("pricing-info.md", "w") as f:
    f.write("# Azure AI Pricing\n- GPT-4o: $2.50/1M input, $10/1M output\n- Vision: $1/1K calls\n")

uploaded_file = project_client.agents.upload_file(
    file_path="pricing-info.md",
    purpose=FilePurpose.AGENTS
)

vector_store = project_client.agents.create_vector_store_and_poll(
    file_ids=[uploaded_file.id],
    name="pricing-kb"
)

# Create agent with file search tool
agent = project_client.agents.create_agent(
    model="gpt-4o",
    name="Pricing Assistant",
    instructions="You are a pricing assistant. Use file search to answer questions accurately.",
    tools=[FileSearchTool()],
    tool_resources={"file_search": {"vector_store_ids": [vector_store.id]}}
)
print(f"Created agent: {agent.id}")

# Create thread and run
thread = project_client.agents.create_thread()
project_client.agents.create_message(
    thread_id=thread.id, role="user",
    content="How much does GPT-4o cost per million input tokens?"
)

run = project_client.agents.create_run(thread_id=thread.id, agent_id=agent.id)

while run.status in [RunStatus.QUEUED, RunStatus.IN_PROGRESS]:
    time.sleep(1)
    run = project_client.agents.get_run(thread_id=thread.id, run_id=run.id)

if run.status == RunStatus.COMPLETED:
    messages = project_client.agents.list_messages(thread_id=thread.id)
    for msg in reversed(messages.data):
        if msg.role == "assistant":
            for block in msg.content:
                if hasattr(block, "text"):
                    print(f"Assistant: {block.text.value}")

project_client.agents.delete_agent(agent.id)
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="https://<project>.services.ai.azure.com"
API_VERSION="2025-05-01"
TOKEN=$(az account get-access-token --resource https://management.azure.com --query accessToken -o tsv)

# Create agent
curl -s "${ENDPOINT}/agents?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "name": "Pricing Assistant",
    "instructions": "Answer pricing questions using file search.",
    "tools": [{"type": "file_search"}]
  }' | jq .

# Create thread
curl -s "${ENDPOINT}/agents/threads?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

# Add message (replace THREAD_ID)
curl -s "${ENDPOINT}/agents/threads/THREAD_ID/messages?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"role": "user", "content": "How much does GPT-4o cost?"}' | jq .

# Create run (replace THREAD_ID, AGENT_ID)
curl -s "${ENDPOINT}/agents/threads/THREAD_ID/runs?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id": "AGENT_ID"}' | jq .

# Poll status (replace THREAD_ID, RUN_ID)
curl -s "${ENDPOINT}/agents/threads/THREAD_ID/runs/RUN_ID?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" | jq .status

# Get messages
curl -s "${ENDPOINT}/agents/threads/THREAD_ID/messages?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data[] | select(.role=="assistant")'
```

</TabItem>
</Tabs>

### Task 3: Code Interpreter Tool

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.projects.models import CodeInterpreterTool

code_agent = project_client.agents.create_agent(
    model="gpt-4o",
    name="Data Analyst",
    instructions="You are a data analyst. Use code interpreter for calculations and charts.",
    tools=[CodeInterpreterTool()]
)

thread = project_client.agents.create_thread()
project_client.agents.create_message(
    thread_id=thread.id, role="user",
    content="Calculate monthly cost: 500K GPT-4o input tokens/day, 100K output/day. Show breakdown."
)

run = project_client.agents.create_and_process_run(
    thread_id=thread.id, agent_id=code_agent.id
)

if run.status == RunStatus.COMPLETED:
    messages = project_client.agents.list_messages(thread_id=thread.id)
    for msg in messages.data:
        if msg.role == "assistant":
            for block in msg.content:
                if hasattr(block, "text"):
                    print(block.text.value)

project_client.agents.delete_agent(code_agent.id)
```

</TabItem>
</Tabs>

## Expected Output

![Challenge 22 - Multi-Agent Conversation Flow](/img/AI-103/challenge-22-topology.svg)


## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Run stuck in `in_progress` | Timeout | Large file indexing or model latency | Use `create_and_process_run` with timeout; check vector store status |
| `requires_action` status | Run pauses | Agent needs function call results | Submit tool outputs via `submit_tool_outputs` |
| File search returns nothing | Generic response | File not indexed yet | Wait for vector store `completed` status before running |
| 404 on thread | Thread not found | Thread ID incorrect or deleted | Verify thread ID; threads persist until explicitly deleted |
| Model deployment error | Agent creation fails | Model not deployed in project | Deploy model via AI Foundry portal first |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What is the correct sequence for using Azure AI Agent Service?",
    options: [
      "Create agent → Create thread → Add message → Create run",
      "Create thread → Create agent → Add message → Create run",
      "Create run → Create agent → Create thread → Add message",
      "Create agent → Create run → Create thread → Add message"
    ],
    correctAnswer: 0,
    explanation: "The correct flow: create an agent (defines behavior and tools), create a thread (conversation container), add messages to the thread, then create a run (triggers agent processing)."
  },
  {
    question: "What does the file_search tool provide in Azure AI Agent Service?",
    options: [
      "Searches the local file system for files",
      "Performs semantic search over uploaded files indexed in a vector store",
      "Lists all files in the Azure project",
      "Searches Azure Blob Storage containers"
    ],
    correctAnswer: 1,
    explanation: "File search performs semantic (vector) search over documents uploaded and indexed in a vector store, enabling RAG for the agent."
  },
  {
    question: "What is the purpose of the code_interpreter tool?",
    options: [
      "Translates code between programming languages",
      "Interprets natural language and converts it to code",
      "Debugs user-submitted code",
      "Executes Python in a sandboxed environment for calculations, analysis, and file generation"
    ],
    correctAnswer: 3,
    explanation: "Code interpreter runs Python code in a sandboxed environment, allowing calculations, data analysis, visualizations, and file generation."
  },
  {
    question: "How should you handle the 'requires_action' run status?",
    options: [
      "Cancel and retry the run",
      "Create a new run with different parameters",
      "Submit tool outputs for the requested function calls",
      "Wait — it resolves automatically"
    ],
    correctAnswer: 2,
    explanation: "When status is 'requires_action', the agent needs function results. Execute the requested functions and submit outputs via submit_tool_outputs."
  },
  {
    question: "What is the relationship between agents and threads?",
    options: [
      "Agents and threads are independent — any agent can run on any thread",
      "Each agent can only process one thread",
      "Each thread is permanently bound to one agent",
      "Threads are auto-created when agents are created"
    ],
    correctAnswer: 0,
    explanation: "Agents and threads are independent resources. The same agent can process many threads, and a thread can be processed by different agents via separate runs."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-foundry-agents --yes --no-wait
```

## Learn More

- [Azure AI Agent Service overview](https://learn.microsoft.com/azure/ai-services/agents/overview)
- [Quickstart: Create an agent](https://learn.microsoft.com/azure/ai-services/agents/quickstart)
- [File search tool](https://learn.microsoft.com/azure/ai-services/agents/how-to/tools/file-search)
- [Code interpreter tool](https://learn.microsoft.com/azure/ai-services/agents/how-to/tools/code-interpreter)
