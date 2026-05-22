---
sidebar_position: 1
title: "Challenge 19: Generative AI Fundamentals"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 19: Generative AI Fundamentals

:::info Estimated Time
**20-30 min** | **Cost**: Free | **Domain**: Generative AI (15-20%)
:::

## Exam skills covered

- Identify features of generative AI models
- Identify common scenarios for generative AI
- Identify capabilities of Azure OpenAI Service

## Overview

**Generative AI** refers to artificial intelligence models that can create new content — text, images, code, audio, and video — based on patterns learned from vast amounts of training data. Unlike traditional AI that classifies or predicts, generative AI produces original outputs that didn't exist before. When you ask a chatbot to write an email, generate an image from a description, or complete your code, you're using generative AI.

The backbone of modern text-based generative AI is the **Large Language Model (LLM)**. LLMs like GPT-4 are trained on enormous datasets of text from the internet, books, and other sources. They learn patterns, grammar, facts, and reasoning abilities — then generate new text by predicting what comes next, token by token. They don't "understand" in the human sense, but they're remarkably capable at producing coherent, contextual responses.

**Foundation models** are large, pre-trained models designed to be adapted for many tasks. Rather than training a model from scratch for each use case, organizations can take a foundation model (like GPT-4) and fine-tune it or prompt-engineer it for specific needs. This "train once, use everywhere" approach has revolutionized AI development — making powerful AI accessible without requiring massive compute budgets or datasets.

## Explore

### Task 1: Understand what makes AI "generative"

Compare traditional AI vs. generative AI:

| Aspect | Traditional AI | Generative AI |
|--------|---------------|---------------|
| What it does | Classifies, predicts, detects | Creates new content |
| Output | Label, number, or category | Text, images, code, audio |
| Example | "This email is spam" | "Write a professional reply to this email" |
| Training approach | Task-specific datasets | Massive diverse datasets |
| Adaptability | One task per model | Many tasks per model |

**Types of generative AI models**:

| Model Type | What it generates | Examples |
|-----------|------------------|---------|
| Large Language Models (LLMs) | Text, code, reasoning | GPT-4, GPT-4o, GPT-3.5-Turbo |
| Diffusion models | Images from text descriptions | DALL-E, Stable Diffusion |
| Audio models | Speech, music, transcription | Whisper (transcription) |
| Multimodal models | Text + images combined | GPT-4o (vision + text) |

### Task 2: Explore common generative AI scenarios

Generative AI enables many practical business scenarios:

| Scenario | Description | Example |
|---------|-------------|---------|
| Content creation | Generate text, summaries, reports | Marketing copy, blog posts |
| Code generation | Write, explain, or debug code | GitHub Copilot, code completion |
| Conversational AI | Natural dialogue with users | Customer service chatbots |
| Image generation | Create images from text descriptions | Product mockups, design concepts |
| Document summarization | Condense long documents | Meeting notes, research papers |
| Data analysis | Interpret data and generate insights | Natural language queries on databases |
| Translation & localization | Contextual translation beyond word-by-word | Marketing content adaptation |

### Task 3: Try generative AI in action

Try **Microsoft Copilot** (free): [copilot.microsoft.com](https://copilot.microsoft.com)

1. **Text generation**: Ask "Write a short professional email declining a meeting invitation politely"
2. **Summarization**: Paste a long paragraph and ask "Summarize this in 2 sentences"
3. **Code generation**: Ask "Write a Python function that calculates the factorial of a number"
4. **Creative content**: Ask "Write a haiku about cloud computing"
5. **Reasoning**: Ask "If a train travels at 60 mph for 2.5 hours, how far does it go? Show your work."

Observe how the model:
- Generates coherent, contextual responses
- Follows instructions and format requests
- Adapts tone based on your prompt
- Can handle diverse tasks with a single model

### Task 4: Understand key generative AI concepts

Review these fundamental concepts that appear on the exam:

| Concept | Definition |
|---------|-----------|
| **Token** | The basic unit of text processing — roughly ¾ of a word. "Hello world" ≈ 2 tokens |
| **Context window** | Maximum tokens a model can process (input + output combined) |
| **Temperature** | Controls randomness: 0 = deterministic/focused, 1 = creative/varied |
| **Top-p** | Alternative randomness control: limits token selection to most probable options |
| **Prompt** | The input/instruction you give the model |
| **Completion** | The output/response the model generates |
| **Grounding** | Connecting model output to real, verifiable data sources |
| **Hallucination** | When the model generates plausible but factually incorrect information |

**Temperature example**:
- Temperature 0: "The capital of France is Paris." (always the same)
- Temperature 1: "The capital of France is Paris, a city known for..." (may vary each time, more creative)

:::tip
The exam expects you to know that generative AI can produce incorrect information (hallucinations) and that techniques like grounding help mitigate this. This connects to responsible AI principles.
:::

## Key Concepts

| Concept | Definition |
|---------|-----------|
| Generative AI | AI models that create new content (text, images, code) rather than just classifying or predicting |
| Large Language Model (LLM) | AI model trained on massive text data that generates text by predicting the next token |
| Foundation model | A large pre-trained model designed to be adapted for many downstream tasks |
| Token | The basic unit of text for LLMs — approximately ¾ of a word |
| Hallucination | When an AI model generates plausible-sounding but factually incorrect content |
| Grounding | Connecting AI outputs to real data sources to improve accuracy and reduce hallucinations |

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| Generative AI "understands" like humans do | LLMs predict probable next tokens based on patterns — they don't have true comprehension or consciousness |
| Generative AI always produces correct information | Models can hallucinate — generating confident but incorrect statements. Always verify critical information |
| You need to train your own model to use generative AI | Foundation models are pre-trained and ready to use; you can prompt-engineer or fine-tune them |
| Generative AI replaces all other AI | Traditional AI (classification, detection, prediction) remains better for many structured tasks |
| Higher temperature always means better output | Higher temperature increases creativity but also increases randomness and potential for errors |

## Knowledge Check

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-19-q1',
      question: 'What distinguishes generative AI from traditional AI approaches?',
      options: ['Generative AI is faster than traditional AI', 'Generative AI creates new content while traditional AI classifies or predicts', 'Generative AI only works with text', 'Generative AI does not require training data'],
      correctAnswer: 1,
      explanation: 'The key distinction is that generative AI creates new original content (text, images, code) while traditional AI typically classifies inputs, makes predictions, or detects patterns in existing data.'
    },
    {
      id: 'ai900-19-q2',
      question: 'What is a "hallucination" in the context of generative AI?',
      options: ['When the model refuses to answer a question', 'When the model generates plausible but factually incorrect information', 'When the model takes too long to respond', 'When the model generates content in the wrong language'],
      correctAnswer: 1,
      explanation: 'A hallucination occurs when a generative AI model produces content that sounds plausible and confident but is factually incorrect. This is a well-known limitation that grounding techniques help mitigate.'
    },
    {
      id: 'ai900-19-q3',
      question: 'What does the "temperature" parameter control in a generative AI model?',
      options: ['The speed of response generation', 'The maximum length of the output', 'The randomness and creativity of the output', 'The language of the response'],
      correctAnswer: 2,
      explanation: 'Temperature controls the randomness of output. A temperature of 0 produces deterministic, focused responses. Higher temperatures (up to 1 or 2) produce more creative, varied, but potentially less precise responses.'
    },
    {
      id: 'ai900-19-q4',
      question: 'What is a foundation model?',
      options: ['A model that can only perform one specific task', 'A small model designed for edge devices', 'A large pre-trained model that can be adapted for many different tasks', 'A model that requires no data to function'],
      correctAnswer: 2,
      explanation: 'A foundation model is a large AI model trained on broad data that can be adapted (through fine-tuning or prompting) for many different downstream tasks — rather than building separate models for each task.'
    },
    {
      id: 'ai900-19-q5',
      question: 'Which of the following is a common scenario for generative AI?',
      options: ['Classifying emails as spam or not spam', 'Detecting objects in a security camera feed', 'Generating a summary of a long research paper', 'Predicting stock prices based on historical data'],
      correctAnswer: 2,
      explanation: 'Generating summaries is a generative AI task — the model creates new, shorter text that captures the key points. Spam classification, object detection, and price prediction are traditional AI tasks that classify or predict rather than generate.'
    }
  ]}
/>

## Learn More

- [Introduction to generative AI](https://learn.microsoft.com/en-us/training/modules/fundamentals-generative-ai/)
- [What is Azure OpenAI Service?](https://learn.microsoft.com/en-us/azure/ai-services/openai/overview)
- [Microsoft Copilot](https://copilot.microsoft.com)
- [Understand tokens in Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/tokens)
