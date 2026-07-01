---
sidebar_position: 2
title: "Am I Ready?"
---

import SelfAssessment from '@site/src/components/SelfAssessment';

# Am I Ready for the AI-103?

Before diving into the challenges, take a few minutes to assess your readiness. The AI-103 is an **Associate-level** exam that assumes hands-on programming experience and familiarity with AI concepts. Unlike AI-901, this exam requires you to write code that integrates Azure AI services into applications.

## Self-Assessment Checklist

Click each row to cycle through: ✅ Comfortable | ⚠️ Need Review | ❌ New to Me

### Programming Skills

<SelfAssessment
  storageKey="ai102-programming"
  skills={[
    "I can write Python or C# code confidently",
    "I understand REST APIs and HTTP requests",
    "I can read and write JSON",
    "I have used SDKs to call cloud services",
    "I understand async/await patterns",
    "I know how to use environment variables and configuration",
    "I can deploy containers (Docker basics)",
  ]}
/>

### AI & Azure AI Experience

<SelfAssessment
  storageKey="ai102-ai-experience"
  skills={[
    "I have used Azure AI services or Cognitive Services",
    "I understand what embeddings and vectors are",
    "I know the RAG (Retrieval-Augmented Generation) pattern",
    "I have worked with Azure OpenAI or OpenAI API",
    "I understand NLP concepts (tokenization, NER, sentiment)",
    "I have built or used a search index",
    "I know what prompt engineering means",
  ]}
/>

## How to Interpret Your Results

### Mostly ✅: You're ready!
Jump straight to [Lab Setup](/docs/ai-103/lab-setup) and start Challenge 01.

### Mix of ✅ and ⚠️: You're almost ready
Start the challenges but budget 2–4 weeks of focused study. Use the **Learning Resources** links in each challenge to fill gaps as you go.

### Several ❌: Start with fundamentals first
Consider these resources before starting AI-103:
- [AI-901: Azure AI Fundamentals](/docs/ai-901/overview) — Build foundational AI and Azure AI concepts
- [Python for Beginners](https://learn.microsoft.com/en-us/training/paths/beginner-python/) — Free Microsoft Learn path
- [Azure OpenAI Getting Started](https://learn.microsoft.com/en-us/azure/ai-services/openai/quickstart) — Hands-on quickstart

:::tip No AI experience at all?

That's okay! The AI-901 (Azure AI Fundamentals) certification is an excellent starting point. It covers the concepts behind AI services without requiring code. Many candidates take AI-901 first, build programming skills, then tackle AI-103.

:::

## Experience Expectations

According to Microsoft, AI-103 candidates should have:

- **1+ years** of experience with Python or C#
- Familiarity with **REST APIs and SDKs**
- Understanding of **Azure services** (subscriptions, resource groups, deployment)
- Knowledge of **AI/ML fundamentals** (training, inference, models, evaluation)
- Experience with **DevOps basics** (Git, CI/CD concepts, containers)

:::note Don't have a full year of experience?

These challenges are designed to accelerate your learning. Each challenge is self-contained with Python, C#, and REST tabs. If you're a fast learner and can code confidently, you can build equivalent hands-on experience by completing all 49 challenges in 4–6 weeks of focused study.

:::

---

**Ready to go?** Head to the [Lab Setup](/docs/ai-103/lab-setup) to configure your environment, then start with [Challenge 01](/docs/ai-103/plan-manage/challenge-01).
