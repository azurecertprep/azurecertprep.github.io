---
sidebar_position: 4
title: "Desafio 23: Orquestração Multi-Agente"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 23: Orquestração Multi-Agente

:::info Tempo Estimado
**60 min** | **Custo**: $5-10 (estimado) | **Domínio**: Implementar Soluções Agênticas (5-10%)
:::

:::caution Preview
Frameworks multi-agente estão evoluindo rapidamente. As APIs mostradas aqui podem mudar. Este desafio cobre conceitos testados no exame com padrões atuais do SDK.
:::

## Habilidades do exame cobertas
- Implementar agentes complexos com Semantic Kernel Agent Framework
- Projetar soluções multi-agente com padrões de orquestração
- Testar e implantar soluções de agentes

## Visão Geral

Sistemas multi-agente usam múltiplos agentes especializados colaborando para resolver problemas complexos. Padrões principais:

- **Sequencial (pipeline)**: Agentes processam em ordem, cada um construindo sobre a saída anterior
- **Paralelo (fan-out/fan-in)**: Múltiplos agentes trabalham simultaneamente, resultados são agregados
- **Handoff**: Um agente transfere o controle para outro com base no contexto
- **Supervisor**: Um agente coordenador delega para agentes trabalhadores

Semantic Kernel fornece o Agent Framework para construir soluções multi-agente no Azure.

## Pré-requisitos
- Assinatura Azure com acesso ao Azure OpenAI
- Azure OpenAI com GPT-4o implantado
- Python 3.10+ ou .NET 8
- Pacotes: `semantic-kernel>=1.0.0` (Python) ou `Microsoft.SemanticKernel` (C#)

## Implementação

### Tarefa 1: Criar Agentes Especializados com Semantic Kernel

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import asyncio
from semantic_kernel import Kernel
from semantic_kernel.agents import ChatCompletionAgent, AgentGroupChat
from semantic_kernel.agents.strategies import SequentialSelectionStrategy, TerminationStrategy
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion

# Configure kernel with Azure OpenAI
kernel = Kernel()
kernel.add_service(AzureChatCompletion(
    deployment_name="gpt-4o",
    endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"]
))

# Create specialized agents
researcher = ChatCompletionAgent(
    kernel=kernel,
    name="Researcher",
    instructions=(
        "You are a research analyst. Given a topic, provide factual information, "
        "data points, and key findings. Be thorough and cite sources when possible. "
        "Focus on gathering information, not making recommendations."
    )
)

writer = ChatCompletionAgent(
    kernel=kernel,
    name="Writer",
    instructions=(
        "You are a technical writer. Take research findings and create clear, "
        "well-structured content. Use headings, bullet points, and concise language. "
        "Transform raw research into polished documentation."
    )
)

reviewer = ChatCompletionAgent(
    kernel=kernel,
    name="Reviewer",
    instructions=(
        "You are a quality reviewer. Evaluate the written content for accuracy, "
        "clarity, and completeness. Provide specific feedback. "
        "Say 'APPROVED' when the content meets quality standards."
    )
)

# Define termination condition
class ApprovalTermination(TerminationStrategy):
    async def should_agent_terminate(self, agent, history):
        if history:
            last_message = history[-1].content
            return "APPROVED" in last_message.upper()
        return False

# Create group chat with sequential strategy
chat = AgentGroupChat(
    agents=[researcher, writer, reviewer],
    selection_strategy=SequentialSelectionStrategy(),
    termination_strategy=ApprovalTermination(maximum_iterations=6)
)

async def run_multi_agent():
    await chat.add_chat_message(
        message="Create a brief guide about Azure AI Agent Service architecture and use cases."
    )

    async for response in chat.invoke():
        print(f"\n{'='*60}")
        print(f"[{response.name}]:")
        print(f"{'='*60}")
        print(response.content[:500])

asyncio.run(run_multi_agent())
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Agents;
using Microsoft.SemanticKernel.Agents.Chat;

var builder = Kernel.CreateBuilder();
builder.AddAzureOpenAIChatCompletion(
    deploymentName: "gpt-4o",
    endpoint: Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!,
    apiKey: Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!
);
var kernel = builder.Build();

// Create specialized agents
var researcher = new ChatCompletionAgent
{
    Kernel = kernel,
    Name = "Researcher",
    Instructions = "You are a research analyst. Provide factual data and findings on the given topic."
};

var writer = new ChatCompletionAgent
{
    Kernel = kernel,
    Name = "Writer",
    Instructions = "You are a technical writer. Create clear, structured content from research findings."
};

var reviewer = new ChatCompletionAgent
{
    Kernel = kernel,
    Name = "Reviewer",
    Instructions = "You are a reviewer. Evaluate content quality. Say 'APPROVED' when ready."
};

// Create group chat
var chat = new AgentGroupChat(researcher, writer, reviewer)
{
    ExecutionSettings = new()
    {
        SelectionStrategy = new SequentialSelectionStrategy(),
        TerminationStrategy = new ApprovalTerminationStrategy { MaximumIterations = 6 }
    }
};

chat.AddChatMessage(new ChatMessageContent(
    AuthorRole.User,
    "Create a brief guide about Azure AI Agent Service."
));

await foreach (var message in chat.InvokeAsync())
{
    Console.WriteLine($"\n[{message.AuthorName}]:");
    Console.WriteLine(message.Content?[..Math.Min(message.Content.Length, 500)]);
}

// Custom termination strategy
class ApprovalTerminationStrategy : TerminationStrategy
{
    protected override Task<bool> ShouldAgentTerminateAsync(
        Agent agent, IReadOnlyList<ChatMessageContent> history, CancellationToken ct)
    {
        return Task.FromResult(
            history.LastOrDefault()?.Content?.Contains("APPROVED", StringComparison.OrdinalIgnoreCase) ?? false
        );
    }
}
```

</TabItem>
</Tabs>

### Tarefa 2: Implementar Padrão de Handoff entre Agentes

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from semantic_kernel.agents import ChatCompletionAgent
from semantic_kernel.contents import ChatMessageContent, AuthorRole

# Specialized agents for different domains
billing_agent = ChatCompletionAgent(
    kernel=kernel,
    name="BillingAgent",
    instructions=(
        "You handle billing inquiries: invoices, payments, pricing questions. "
        "If the user asks about technical issues, say: HANDOFF:TechnicalAgent"
    )
)

technical_agent = ChatCompletionAgent(
    kernel=kernel,
    name="TechnicalAgent",
    instructions=(
        "You handle technical support: errors, configuration, troubleshooting. "
        "If the user asks about billing, say: HANDOFF:BillingAgent"
    )
)

triage_agent = ChatCompletionAgent(
    kernel=kernel,
    name="TriageAgent",
    instructions=(
        "You are a triage agent. Analyze the user's request and route to the correct agent. "
        "For billing questions respond: HANDOFF:BillingAgent "
        "For technical questions respond: HANDOFF:TechnicalAgent"
    )
)

async def handoff_orchestrator(user_message: str):
    """Simple handoff orchestration"""
    agents = {
        "TriageAgent": triage_agent,
        "BillingAgent": billing_agent,
        "TechnicalAgent": technical_agent
    }
    
    current_agent = triage_agent
    history = [ChatMessageContent(role=AuthorRole.USER, content=user_message)]
    max_handoffs = 3
    
    for i in range(max_handoffs):
        print(f"\n[Routing to: {current_agent.name}]")
        
        response = await current_agent.invoke(history)
        response_text = str(response)
        print(f"[{current_agent.name}]: {response_text[:200]}")
        
        if "HANDOFF:" in response_text:
            target = response_text.split("HANDOFF:")[1].strip().split()[0]
            if target in agents:
                current_agent = agents[target]
                continue
        
        return response_text
    
    return "Max handoffs reached."

# Test handoff
asyncio.run(handoff_orchestrator("My API calls are returning 429 errors"))
asyncio.run(handoff_orchestrator("I need a copy of last month's invoice"))
```

</TabItem>
</Tabs>

### Tarefa 3: Testar e Avaliar Saída Multi-Agente

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import json
from datetime import datetime

# Evaluation framework for multi-agent systems
class AgentEvaluator:
    def __init__(self):
        self.results = []
    
    async def evaluate_run(self, chat, test_input, expected_keywords):
        """Evaluate a multi-agent run against expected outcomes"""
        start_time = datetime.now()
        
        await chat.add_chat_message(message=test_input)
        
        messages = []
        async for response in chat.invoke():
            messages.append({
                "agent": response.name,
                "content": response.content,
                "timestamp": datetime.now().isoformat()
            })
        
        duration = (datetime.now() - start_time).total_seconds()
        
        # Check if expected keywords appear in final output
        final_content = messages[-1]["content"] if messages else ""
        keywords_found = [kw for kw in expected_keywords if kw.lower() in final_content.lower()]
        
        result = {
            "input": test_input,
            "num_turns": len(messages),
            "agents_involved": [m["agent"] for m in messages],
            "duration_seconds": duration,
            "keywords_found": len(keywords_found),
            "keywords_expected": len(expected_keywords),
            "coverage": len(keywords_found) / len(expected_keywords) if expected_keywords else 0,
            "terminated_properly": "APPROVED" in (messages[-1]["content"] if messages else "")
        }
        
        self.results.append(result)
        return result

    def summary(self):
        avg_turns = sum(r["num_turns"] for r in self.results) / len(self.results)
        avg_coverage = sum(r["coverage"] for r in self.results) / len(self.results)
        success_rate = sum(1 for r in self.results if r["terminated_properly"]) / len(self.results)
        
        print(f"\nEvaluation Summary ({len(self.results)} tests)")
        print(f"  Avg turns per conversation: {avg_turns:.1f}")
        print(f"  Avg keyword coverage: {avg_coverage:.0%}")
        print(f"  Proper termination rate: {success_rate:.0%}")

# Run evaluation
evaluator = AgentEvaluator()

test_cases = [
    ("Explain Azure AI Search pricing tiers", ["basic", "standard", "free"]),
    ("How to configure vector search", ["vector", "index", "embedding"]),
]

async def run_evaluation():
    for test_input, keywords in test_cases:
        result = await evaluator.evaluate_run(chat, test_input, keywords)
        print(f"Test: {test_input[:40]}... Coverage: {result['coverage']:.0%}")
    evaluator.summary()

asyncio.run(run_evaluation())
```

</TabItem>
</Tabs>

## Saída Esperada

```text
============================================================
[Researcher]:
============================================================
Azure AI Agent Service is a managed platform for building AI agents...
Key features: thread management, tool execution, run lifecycle...

============================================================
[Writer]:
============================================================
# Azure AI Agent Service Guide
## Architecture
The service uses a thread-based architecture...
## Use Cases
1. Customer support automation
2. Document analysis and Q&A...

============================================================
[Reviewer]:
============================================================
The content is well-structured and accurate. APPROVED.

[Routing to: TriageAgent]
[TriageAgent]: HANDOFF:TechnicalAgent
[Routing to: TechnicalAgent]
[TechnicalAgent]: HTTP 429 indicates rate limiting. Check your TPM quota...
```

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Loop infinito de agentes | Agentes continuam passando um para o outro | Nenhuma condição de terminação atendida | Adicione limite `maximum_iterations`; garanta que keywords de terminação estejam claras |
| Agente errado selecionado | Respostas irrelevantes | Instruções de triagem muito vagas | Adicione regras de roteamento explícitas com exemplos nas instruções |
| Contexto perdido entre agentes | Agente ignora contexto anterior | Histórico não passado corretamente | Garanta que o histórico completo de mensagens seja compartilhado via AgentGroupChat |
| Alto uso de tokens | Execuções caras | Cada agente recebe o histórico completo | Resuma o histórico antes de passar; limite a janela de contexto |
| Destino de handoff não encontrado | KeyError na busca do agente | Erro de digitação no nome do destino do HANDOFF | Valide os destinos de handoff contra os nomes de agentes registrados |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que é o padrão de orquestração 'sequencial' em sistemas multi-agente?",
    options: [
      "Todos os agentes processam a entrada simultaneamente e votam na melhor resposta",
      "Um supervisor atribui tarefas a agentes aleatórios",
      "Agentes competem e a resposta mais rápida vence",
      "Agentes se revezam processando em uma ordem fixa, cada um construindo sobre a saída anterior"
    ],
    correctAnswer: 3,
    explanation: "O padrão sequencial (pipeline) tem agentes processando em uma ordem definida. Cada agente recebe a saída do agente anterior, refinando progressivamente o resultado."
  },
  {
    question: "No Semantic Kernel Agent Framework, o que o AgentGroupChat fornece?",
    options: [
      "Um componente de UI para exibir conversas de agentes",
      "Um container de orquestração gerenciado que coordena múltiplos agentes com estratégias de seleção e terminação",
      "Um sistema de logging para interações de agentes",
      "Um endpoint de API para comunicação externa de agentes"
    ],
    correctAnswer: 1,
    explanation: "AgentGroupChat é o container de orquestração que gerencia conversas multi-agente, aplicando estratégias de seleção (quem fala a seguir) e estratégias de terminação (quando parar)."
  },
  {
    question: "O que é o padrão 'handoff' na arquitetura multi-agente?",
    options: [
      "Um agente transfere explicitamente o controle da conversação para outro agente especializado",
      "Agentes compartilham sua memória com outros agentes",
      "Todos os agentes processam cada mensagem em paralelo",
      "Agentes são substituídos por versões mais novas durante a execução"
    ],
    correctAnswer: 0,
    explanation: "Handoff é quando um agente reconhece que não pode lidar com uma solicitação e transfere explicitamente o controle para um agente especializado mais apropriado."
  },
  {
    question: "Como você deve prevenir loops infinitos na orquestração multi-agente?",
    options: [
      "Usar apenas um agente por vez",
      "Reiniciar a aplicação após cada conversação",
      "Definir maximum_iterations na estratégia de terminação e definir keywords claras de terminação",
      "Limitar cada agente a uma resposta"
    ],
    correctAnswer: 2,
    explanation: "Loops infinitos são prevenidos definindo maximum_iterations como um limite rígido e definindo condições claras de terminação (como keywords 'APPROVED') que os agentes são instruídos a usar."
  },
  {
    question: "Qual é a principal vantagem dos sistemas multi-agente sobre sistemas de agente único?",
    options: [
      "Eles são sempre mais rápidos",
      "Eles custam menos para executar",
      "Agentes especializados lidam com tarefas específicas de domínio melhor do que um agente generalista",
      "Eles não requerem Azure OpenAI"
    ],
    correctAnswer: 2,
    explanation: "Sistemas multi-agente se destacam porque cada agente pode ser especializado com instruções e ferramentas focadas, lidando com seu domínio melhor do que um único agente generalista tentando fazer tudo."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-agents --yes --no-wait
```

## Saiba Mais

- [Semantic Kernel Agent Framework](https://learn.microsoft.com/semantic-kernel/frameworks/agent)
- [Padrões de design multi-agente](https://learn.microsoft.com/azure/ai-services/agents/concepts/multi-agent)
- [AutoGen multi-agent](https://microsoft.github.io/autogen/)
- [Avaliação de agentes](https://learn.microsoft.com/azure/ai-studio/how-to/evaluate-generative-ai-app)
