---
sidebar_position: 4
title: "Challenge 22: Prompt Engineering Basics"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 22: Prompt Engineering Basics

:::info Estimated Time
**25-30 min** | **Cost**: Free | **Domain**: Generative AI (15-20%)
:::

## Exam skills covered

- Identify common scenarios for generative AI
- Describe prompt engineering techniques
- Identify features and capabilities of Azure OpenAI Service

## Overview

**Prompt engineering** is the practice of designing effective inputs (prompts) to get the best possible outputs from generative AI models. Since LLMs respond based on how you ask, the quality of your prompt directly determines the quality of the response. A well-crafted prompt can mean the difference between a vague, unhelpful response and a precise, actionable answer.

The key insight is that LLMs respond to **context**. A system message sets the behavioral boundaries ("You are a professional email editor"). **Few-shot examples** show the model what format you expect. Specific instructions ("Respond in bullet points, limit to 3 items") constrain the output. And **grounding data** (relevant documents or facts) gives the model accurate information to reference instead of relying on potentially outdated training data.

Prompt engineering is not about "tricking" the AI — it's about clear communication. Think of it like giving instructions to a new employee: the more context, examples, and constraints you provide, the better the result. Azure OpenAI's parameters (temperature, top-p, max tokens) further tune the model's behavior.

## Explore

### Task 1: Understand prompt components

An effective prompt typically includes some or all of these elements:

| Component | Purpose | Example |
|----------|---------|---------|
| **System message** | Define AI behavior/persona | "You are a concise technical writer." |
| **Context/grounding** | Provide relevant information | "Based on this document: [text]..." |
| **Instruction** | Tell the model what to do | "Summarize the following in 3 bullet points." |
| **Input data** | The content to process | [The text to summarize] |
| **Output format** | Specify desired structure | "Format as a numbered list" or "Respond in JSON" |
| **Few-shot examples** | Show expected behavior | "Example: Input: X → Output: Y" |
| **Constraints** | Set boundaries | "Maximum 100 words. Do not include opinions." |

### Task 2: Compare good vs. bad prompts

**Scenario**: You want a product description for a new wireless headphone.

❌ **Bad prompt**:
> "Write about headphones."

Result: Generic, unfocused text about headphones in general.

✅ **Good prompt**:
> "Write a 50-word product description for wireless noise-cancelling headphones targeting business travelers. Emphasize comfort for long flights, battery life, and noise cancellation. Tone: professional but friendly."

Result: Focused, specific description matching the requirements.

**More examples**:

| Task | Bad Prompt | Good Prompt |
|------|-----------|-------------|
| Summarize | "Summarize this" | "Summarize this article in 3 bullet points, focusing on the financial impact" |
| Code | "Write Python code" | "Write a Python function that takes a list of integers and returns the two largest values. Include docstring and type hints." |
| Email | "Write an email" | "Write a professional email declining a job offer politely. Keep it under 100 words. Express gratitude and leave the door open for future opportunities." |

### Task 3: Practice few-shot prompting

**Zero-shot** — No examples (model relies on training):
```
Classify the following review as Positive, Negative, or Neutral:
"The product arrived on time and works exactly as described."
```

**One-shot** — One example:
```
Classify reviews as Positive, Negative, or Neutral.

Example:
Review: "Absolutely terrible quality, broke after one day."
Classification: Negative

Now classify:
Review: "The product arrived on time and works exactly as described."
Classification:
```

**Few-shot** — Multiple examples:
```
Classify reviews as Positive, Negative, or Neutral.

Review: "Absolutely terrible quality, broke after one day."
Classification: Negative

Review: "It's okay, nothing special but does the job."
Classification: Neutral

Review: "Best purchase I've ever made! Highly recommend!"
Classification: Positive

Now classify:
Review: "The product arrived on time and works exactly as described."
Classification:
```

**Key insight**: More examples help the model understand the expected format and classification boundaries, but use more tokens (cost more).

### Task 4: Understand temperature and top-p effects

These parameters control the randomness and creativity of outputs:

**Temperature** (0 to 2):
| Value | Behavior | Best For |
|-------|----------|----------|
| 0 | Deterministic, same answer every time | Factual queries, data extraction, classification |
| 0.3-0.5 | Mostly consistent with slight variation | Customer support, professional writing |
| 0.7-1.0 | Creative, varied responses | Creative writing, brainstorming, storytelling |
| >1.0 | Very random, potentially incoherent | Rarely useful in production |

**Top-p** (0 to 1) — Nucleus sampling:
- Top-p 0.1: Only considers the top 10% most likely tokens → very focused
- Top-p 0.9: Considers the top 90% most likely tokens → more diverse
- Works as an alternative to temperature (use one or the other, not both)

**Your task**: For each scenario, what temperature would you recommend?
1. Extracting dates from a legal contract → **0** (accuracy matters, no creativity)
2. Writing marketing taglines → **0.8-1.0** (creativity desired)
3. Answering customer FAQ questions → **0.3** (consistent but natural)
4. Generating poetry → **1.0+** (maximum creativity)

### Task 5: Understand grounding and context windows

**Grounding** connects the model to real data to reduce hallucinations:

```
System: You are a customer support agent. Only answer based on 
the following product documentation. If the answer is not in the 
documentation, say "I don't have that information."

Documentation:
- Product X costs $99/month for the basic plan
- Product X supports up to 50 users on the basic plan
- Enterprise plan costs $499/month for unlimited users

User: How much does Product X cost?
```

This approach (called **Retrieval-Augmented Generation / RAG**) is preferred because:
- Reduces hallucinations (model references real data)
- Provides up-to-date information (not limited to training data)
- Enables verifiable responses (you can check against the source)

**Context window** — the total tokens a model can handle (input + output):
| Model | Context Window |
|-------|---------------|
| GPT-4o | 128,000 tokens |
| GPT-4 Turbo | 128,000 tokens |
| GPT-3.5-Turbo | 16,384 tokens |

:::tip
For the exam, remember: system messages set behavior, few-shot examples show format, grounding provides accuracy, and temperature/top-p control creativity. These are the fundamental prompt engineering levers.
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Prompt engineering | Designing effective inputs to optimize generative AI model outputs |
| System message | Instructions that define the AI's behavior, persona, and constraints |
| Few-shot prompting | Providing examples in the prompt to show the model the expected output format |
| Grounding | Providing relevant source data so the model answers based on facts rather than hallucinating |
| Context window | The maximum number of tokens a model can process (input + output combined) |
| RAG (Retrieval-Augmented Generation) | Pattern of retrieving relevant documents and including them in the prompt for grounded responses |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| Longer prompts always produce better results | Concise, clear prompts with the right context often outperform verbose ones; unnecessary length wastes tokens |
| Temperature 0 means the model won't make mistakes | Temperature 0 makes output deterministic (same input → same output) but doesn't guarantee factual accuracy |
| Few-shot examples teach the model permanently | Examples only apply to the current conversation; the model doesn't retain learning between sessions |
| You should always use maximum context window | Including irrelevant context can actually confuse the model; include only what's needed to answer the question |
| Prompt engineering is a one-time task | Effective prompts require iterative testing and refinement based on actual outputs |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-22-q1',
      question: 'A developer wants an AI model to always respond in a specific JSON format. Which prompt engineering technique is most effective?',
      options: ['Setting temperature to 0', 'Providing few-shot examples showing the exact JSON format expected', 'Using a larger model', 'Increasing the max tokens parameter'],
      correctAnswer: 1,
      explanation: 'Few-shot examples showing the exact expected JSON format teach the model what structure to produce. While temperature 0 helps with consistency, few-shot examples are the primary technique for format specification.'
    },
    {
      id: 'ai900-22-q2',
      question: 'What is the primary purpose of grounding in prompt engineering?',
      options: ['To make responses longer and more detailed', 'To speed up response generation', 'To increase the creativity of responses', 'To reduce hallucinations by connecting the model to real source data'],
      correctAnswer: 3,
      explanation: 'Grounding provides relevant, factual source data in the prompt so the model answers based on real information rather than generating potentially incorrect content from its training data. This reduces hallucinations.'
    },
    {
      id: 'ai900-22-q3',
      question: 'An application needs to extract specific data points from invoices with high accuracy. What temperature setting is most appropriate?',
      options: ['Temperature 0 (deterministic)', 'Temperature 0.7 (balanced)', 'Temperature 1.0 (creative)', 'Temperature 2.0 (maximum randomness)'],
      correctAnswer: 0,
      explanation: 'Temperature 0 produces deterministic, focused output — ideal for data extraction tasks where accuracy and consistency matter more than creativity. Higher temperatures introduce randomness that could produce incorrect extractions.'
    },
    {
      id: 'ai900-22-q4',
      question: 'What is the context window in a generative AI model?',
      options: ['The visual interface where you type prompts', 'The time limit for generating a response', 'The maximum total tokens the model can process (input + output combined)', 'The number of users who can access the model simultaneously'],
      correctAnswer: 2,
      explanation: 'The context window is the maximum number of tokens (input prompt + output completion combined) that a model can handle in a single request. For example, GPT-4o has a 128K token context window.'
    },
    {
      id: 'ai900-22-q5',
      question: 'What is "few-shot prompting"?',
      options: ['Using the model for only a few requests per day', 'Providing examples in the prompt to demonstrate the expected output format', 'Training the model with a small dataset', 'Limiting the response to a few sentences'],
      correctAnswer: 1,
      explanation: 'Few-shot prompting means including one or more examples (input-output pairs) in the prompt to show the model what format and style of response you expect. This helps the model understand your requirements without any training.'
    }
  ]}
/>

## Learn More

- [Prompt engineering techniques](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/prompt-engineering)
- [System message framework](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/system-message)
- [Introduction to prompt engineering](https://learn.microsoft.com/en-us/training/modules/introduction-prompt-engineering-with-github-copilot/)
- [Best practices for prompt engineering](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/prompt-engineering)
- [RAG with Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/use-your-data)
