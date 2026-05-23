---
sidebar_position: 4
title: "Challenge 23: Multi-Agent Orchestration"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 23: Multi-Agent Orchestration

:::info Estimated Time
**60 min** | **Cost**: $5-10 (estimated) | **Domain**: Implement Agentic Solutions (5-10%)
:::

:::caution Preview
Multi-agent frameworks are rapidly evolving. APIs shown here may change. This challenge covers concepts tested on the exam with current SDK patterns.
:::

## Exam skills covered
- Implement complex agents with Semantic Kernel Agent Framework
- Design multi-agent solutions with orchestration patterns
- Test and deploy agent solutions

## Overview

Multi-agent systems use multiple specialized agents collaborating to solve complex problems. Key patterns:

- **Sequential (pipeline)**: Agents process in order, each building on previous output
- **Parallel (fan-out/fan-in)**: Multiple agents work simultaneously, results aggregated
- **Handoff**: One agent transfers control to another based on context
- **Supervisor**: A coordinator agent delegates to worker agents

Semantic Kernel provides the Agent Framework for building multi-agent solutions in Azure.

## Prerequisites
- Azure subscription with Azure OpenAI access
- Azure OpenAI with GPT-4o deployed
- Python 3.10+ or .NET 8
- Packages: `semantic-kernel>=1.0.0` (Python) or `Microsoft.SemanticKernel` (C#)

## Implementation

### Task 1: Create Specialized Agents with Semantic Kernel

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

### Task 2: Implement Agent Handoff Pattern

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

### Task 3: Test and Evaluate Multi-Agent Output

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

## Expected Output

```
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

## Break and Fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Infinite agent loop | Agents keep passing to each other | No termination condition met | Add `maximum_iterations` limit; ensure termination keywords are clear |
| Wrong agent selected | Irrelevant responses | Triage instructions too vague | Add explicit routing rules with examples in instructions |
| Context lost between agents | Agent ignores prior context | History not passed properly | Ensure full message history is shared via AgentGroupChat |
| High token usage | Expensive runs | Each agent gets full history | Summarize history before passing; limit context window |
| Handoff target not found | KeyError on agent lookup | Typo in HANDOFF target name | Validate handoff targets against registered agent names |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What is the 'sequential' orchestration pattern in multi-agent systems?",
    options: [
      "All agents process the input simultaneously and vote on the best response",
      "A supervisor assigns tasks to random agents",
      "Agents compete and the fastest response wins",
      "Agents take turns processing in a fixed order, each building on previous output"
    ],
    correctAnswer: 3,
    explanation: "Sequential (pipeline) pattern has agents process in a defined order. Each agent receives the output of the previous agent, progressively refining the result."
  },
  {
    question: "In Semantic Kernel Agent Framework, what does AgentGroupChat provide?",
    options: [
      "A UI component for displaying agent conversations",
      "A managed orchestration container that coordinates multiple agents with selection and termination strategies",
      "A logging system for agent interactions",
      "An API endpoint for external agent communication"
    ],
    correctAnswer: 1,
    explanation: "AgentGroupChat is the orchestration container that manages multi-agent conversations, applying selection strategies (who speaks next) and termination strategies (when to stop)."
  },
  {
    question: "What is the 'handoff' pattern in multi-agent architecture?",
    options: [
      "One agent explicitly transfers conversation control to another specialized agent",
      "Agents share their memory with other agents",
      "All agents process every message in parallel",
      "Agents are replaced with newer versions during runtime"
    ],
    correctAnswer: 0,
    explanation: "Handoff is when one agent recognizes it cannot handle a request and explicitly transfers control to a more appropriate specialized agent."
  },
  {
    question: "How should you prevent infinite loops in multi-agent orchestration?",
    options: [
      "Use only one agent at a time",
      "Restart the application after each conversation",
      "Set maximum_iterations on the termination strategy and define clear termination keywords",
      "Limit each agent to one response"
    ],
    correctAnswer: 2,
    explanation: "Infinite loops are prevented by setting maximum_iterations as a hard stop and defining clear termination conditions (like 'APPROVED' keywords) that agents are instructed to use."
  },
  {
    question: "What is the primary advantage of multi-agent systems over single-agent systems?",
    options: [
      "They are always faster",
      "They cost less to run",
      "Specialized agents handle domain-specific tasks better than one generalist agent",
      "They don't require Azure OpenAI"
    ],
    correctAnswer: 2,
    explanation: "Multi-agent systems excel because each agent can be specialized with focused instructions and tools, handling its domain better than a single generalist agent trying to do everything."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-agents --yes --no-wait
```

## Learn More

- [Semantic Kernel Agent Framework](https://learn.microsoft.com/semantic-kernel/frameworks/agent)
- [Multi-agent design patterns](https://learn.microsoft.com/azure/ai-services/agents/concepts/multi-agent)
- [AutoGen multi-agent](https://microsoft.github.io/autogen/)
- [Agent evaluation](https://learn.microsoft.com/azure/ai-studio/how-to/evaluate-generative-ai-app)
