---
sidebar_position: 3
title: "Desafio 22: Azure AI Agent Service"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 22: Azure AI Agent Service

:::info Tempo Estimado
**60 min** | **Custo**: $3-8 (estimado) | **DomÃ­nio**: Implementar SoluÃ§Ãµes AgÃªnticas (5-10%)
:::

## Habilidades do exame cobertas
- Criar um agente com Azure AI Agent Service
- Configurar ferramentas do agente (file search, code interpreter)
- Gerenciar threads e runs para conversas do agente

## VisÃ£o Geral

O Azure AI Agent Service fornece uma plataforma gerenciada para construir agentes de IA. Ele gerencia threads, execuÃ§Ã£o de ferramentas (file search, code interpreter, funÃ§Ãµes personalizadas), ciclo de vida de runs e gerenciamento de arquivos.

A arquitetura: criar um agente â†’ criar uma thread â†’ adicionar mensagens â†’ criar um run â†’ fazer polling atÃ© completar â†’ ler respostas.

## PrÃ©-requisitos
- Assinatura Azure
- Hub e projeto Azure AI Foundry
- Python 3.9+ ou .NET 8
- Pacotes: `azure-ai-projects`, `azure-identity`

## ImplementaÃ§Ã£o

### Tarefa 1: Configurar o Projeto Azure AI Foundry

```bash
az group create --name rg-ai102-foundry-agents --location eastus2

az extension add --name ml

az ml workspace create \
  --name hub-ai102-agents \
  --resource-group rg-ai102-foundry-agents \
  --kind hub \
  --location eastus2
```

### Tarefa 2: Criar Agente com File Search

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

### Tarefa 3: Ferramenta Code Interpreter

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

## SaÃ­da Esperada

```text
Created agent: asst_ABC123
Assistant: Based on the pricing document, Azure OpenAI GPT-4o costs $2.50 per 1 million input tokens.

Monthly Cost Breakdown:
| Service       | Usage          | Monthly Cost |
|--------------|----------------|--------------|
| GPT-4o Input | 15M tokens/mo  | $37.50       |
| GPT-4o Output| 3M tokens/mo   | $30.00       |
| Total        |                | $67.50       |
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| Run travado em `in_progress` | Timeout | IndexaÃ§Ã£o de arquivo grande ou latÃªncia do modelo | Use `create_and_process_run` com timeout; verifique o status do vector store |
| Status `requires_action` | Run pausa | Agente precisa de resultados de chamada de funÃ§Ã£o | Envie outputs de ferramentas via `submit_tool_outputs` |
| File search nÃ£o retorna nada | Resposta genÃ©rica | Arquivo ainda nÃ£o indexado | Aguarde o status `completed` do vector store antes de executar |
| 404 na thread | Thread nÃ£o encontrada | ID da thread incorreto ou deletado | Verifique o ID da thread; threads persistem atÃ© serem explicitamente deletadas |
| Erro de deployment do modelo | CriaÃ§Ã£o do agente falha | Modelo nÃ£o implantado no projeto | Implante o modelo via portal AI Foundry primeiro |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual Ã© a sequÃªncia correta para usar o Azure AI Agent Service?",
    options: [
      "Criar agente â†’ Criar thread â†’ Adicionar mensagem â†’ Criar run",
      "Criar thread â†’ Criar agente â†’ Adicionar mensagem â†’ Criar run",
      "Criar run â†’ Criar agente â†’ Criar thread â†’ Adicionar mensagem",
      "Criar agente â†’ Criar run â†’ Criar thread â†’ Adicionar mensagem"
    ],
    correctAnswer: 0,
    explanation: "O fluxo correto: criar um agente (define comportamento e ferramentas), criar uma thread (container de conversaÃ§Ã£o), adicionar mensagens Ã  thread, e entÃ£o criar um run (dispara o processamento do agente)."
  },
  {
    question: "O que a ferramenta file_search fornece no Azure AI Agent Service?",
    options: [
      "Busca arquivos no sistema de arquivos local",
      "Realiza busca semÃ¢ntica sobre arquivos enviados e indexados em um vector store",
      "Lista todos os arquivos no projeto Azure",
      "Busca em containers do Azure Blob Storage"
    ],
    correctAnswer: 1,
    explanation: "File search realiza busca semÃ¢ntica (vetorial) sobre documentos enviados e indexados em um vector store, habilitando RAG para o agente."
  },
  {
    question: "Qual Ã© o propÃ³sito da ferramenta code_interpreter?",
    options: [
      "Traduz cÃ³digo entre linguagens de programaÃ§Ã£o",
      "Interpreta linguagem natural e converte para cÃ³digo",
      "Depura cÃ³digo enviado pelo usuÃ¡rio",
      "Executa Python em um ambiente sandboxed para cÃ¡lculos, anÃ¡lises e geraÃ§Ã£o de arquivos"
    ],
    correctAnswer: 3,
    explanation: "Code interpreter executa cÃ³digo Python em um ambiente sandboxed, permitindo cÃ¡lculos, anÃ¡lise de dados, visualizaÃ§Ãµes e geraÃ§Ã£o de arquivos."
  },
  {
    question: "Como vocÃª deve lidar com o status 'requires_action' de um run?",
    options: [
      "Cancelar e retentar o run",
      "Criar um novo run com parÃ¢metros diferentes",
      "Enviar outputs de ferramentas para as chamadas de funÃ§Ã£o solicitadas",
      "Aguardar â€” ele se resolve automaticamente"
    ],
    correctAnswer: 2,
    explanation: "Quando o status Ã© 'requires_action', o agente precisa de resultados de funÃ§Ãµes. Execute as funÃ§Ãµes solicitadas e envie os outputs via submit_tool_outputs."
  },
  {
    question: "Qual Ã© a relaÃ§Ã£o entre agentes e threads?",
    options: [
      "Agentes e threads sÃ£o independentes â€” qualquer agente pode executar em qualquer thread",
      "Cada agente sÃ³ pode processar uma thread",
      "Cada thread Ã© permanentemente vinculada a um agente",
      "Threads sÃ£o criadas automaticamente quando agentes sÃ£o criados"
    ],
    correctAnswer: 0,
    explanation: "Agentes e threads sÃ£o recursos independentes. O mesmo agente pode processar muitas threads, e uma thread pode ser processada por diferentes agentes via runs separados."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-foundry-agents --yes --no-wait
```

## Saiba Mais

- [VisÃ£o geral do Azure AI Agent Service](https://learn.microsoft.com/azure/ai-services/agents/overview)
- [InÃ­cio rÃ¡pido: Criar um agente](https://learn.microsoft.com/azure/ai-services/agents/quickstart)
- [Ferramenta file search](https://learn.microsoft.com/azure/ai-services/agents/how-to/tools/file-search)
- [Ferramenta code interpreter](https://learn.microsoft.com/azure/ai-services/agents/how-to/tools/code-interpreter)
