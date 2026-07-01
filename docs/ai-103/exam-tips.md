---
sidebar_position: 4
title: "Exam Tips & Strategy"
---

# Exam Tips & Strategy

The AI-103 is a proctored exam that tests your ability to write code integrating Azure AI services. Knowing the exam mechanics is as important as knowing the SDKs.

## Exam Format

| Detail | Value |
|--------|-------|
| **Number of questions** | ~40–60 questions |
| **Duration** | ~120 minutes |
| **Passing score** | 700 out of 1000 |
| **Cost** | $165 USD |
| **Question types** | Multiple choice, multiple answer, drag-and-drop, hot area, case study |
| **Penalty for wrong answers** | None — always answer every question |
| **Can you go back?** | Yes, within a section. No, between sections. |
| **Replaces** | AI-102 (retired June 30, 2026) |

## Study Strategy

### Weeks 1–2: Plan & Manage + Generative AI & Agents (Challenges 01–23)
These domains cover **50-60%** of the exam. The GenAI + Agents domain alone is **35-40%** — the largest single domain. Focus on Azure OpenAI, RAG patterns, prompt engineering, agent architecture, and function calling.

### Weeks 3–4: Computer Vision + Text Analysis (Challenges 24–39)
These are heavily SDK-focused. Know the exact client initialization patterns, API calls, and response parsing for Vision, Language, and Speech services.

### Week 5: Information Extraction (Challenges 40–48)
AI Search skillsets, vector search, custom skills, and Document Intelligence are detail-heavy. Critical for RAG implementations.

### Week 6: Review + Practice
- Take the [Free Practice Assessment](https://learn.microsoft.com/en-us/credentials/certifications/exams/ai-103/practice/assessment?assessment-type=practice&assessmentId=61)
- Review the [Coverage Matrix](/docs/ai-103/coverage-matrix) — any gaps?
- Redo Break & Fix scenarios from each challenge

## Key Focus Areas

### Generative AI (Increasing Weight)
The exam has increased Generative AI coverage. Know these deeply:
- **RAG architecture**: embeddings → vector search → prompt construction → completion
- **Azure OpenAI deployment models**: GPT-4o, GPT-4o-mini, text-embedding-ada-002
- **Content filtering**: configuring input/output filters, severity levels
- **System/user/assistant message roles** and when to use each
- **Token management**: counting tokens, managing context windows, chunking strategies

### SDK vs REST Patterns
The exam tests both approaches. Know when each is appropriate:
- **SDK**: Production applications, type safety, retry logic built-in
- **REST**: Quick prototyping, language-agnostic, understanding what SDKs do underneath

### Authentication Patterns
```python
# Key-based (simple, for development)
from azure.core.credentials import AzureKeyCredential
client = SomeClient(endpoint, AzureKeyCredential(key))

# Identity-based (production, recommended)
from azure.identity import DefaultAzureCredential
client = SomeClient(endpoint, DefaultAzureCredential())
```

## Common Name Change Traps

:::warning Service Rebranding — These WILL appear on the exam

| Old Name | New Name | Notes |
|----------|----------|-------|
| Cognitive Services | **Azure AI services** | Umbrella name changed |
| Form Recognizer | **Document Intelligence** | Complete rebrand |
| LUIS | **CLU (Conversational Language Understanding)** | Migrated to Azure AI Language |
| QnA Maker | **Custom Question Answering** | Now part of Azure AI Language |
| Anomaly Detector | **Deprecated** (Azure AI Metrics Advisor) | May still appear in older questions |
| Azure Cognitive Search | **Azure AI Search** | Name + features updated |
| Azure OpenAI Studio | **Azure AI Foundry** | Portal renamed |

If you see an old name in a question, mentally map it to the new service.
:::

## Azure OpenAI Knowledge

Key concepts the exam tests:
- **Deployment vs Model**: You deploy a model to get an endpoint. Same model can have multiple deployments.
- **Token limits**: GPT-4o supports 128K input tokens. Know approximate limits for each model family.
- **Content filtering**: Default filters are ON. Know how to customize severity thresholds.
- **Responsible AI**: When to use content filtering, groundedness detection, abuse monitoring
- **Function calling**: How to define tools and handle tool_calls in the response

## Time Management

| Section | Suggested Time |
|---------|---------------|
| First pass through all questions | 60–70 minutes |
| Review flagged questions | 20–25 minutes |
| Case studies (if present) | 20–25 minutes |
| Buffer | 5–10 minutes |

**Tip**: Don't spend more than 2 minutes on any single question in your first pass. Flag it and move on.

## Day-of Checklist

- [ ] Photo ID ready (passport or government-issued)
- [ ] Test your computer and internet connection (for online proctoring)
- [ ] Clear your desk — nothing allowed except monitor, keyboard, mouse
- [ ] Close all applications except the exam browser
- [ ] Have water nearby (allowed for online exams)
- [ ] Review the [Cheat Sheet](/docs/ai-103/cheat-sheet) one final time (not during the exam!)
- [ ] Arrive 15 minutes early for check-in

## Useful Links

| Resource | Link |
|----------|------|
| **Try the exam interface** | [Exam Sandbox](https://aka.ms/examdemo) |
| **Free practice questions** | [Practice Assessment](https://learn.microsoft.com/en-us/credentials/certifications/exams/ai-103/practice/assessment?assessment-type=practice&assessmentId=61) |
| **Schedule the exam** | [Pearson VUE](https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-engineer/) |
| **Official study guide** | [AI-103 Study Guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/AI-103) |
| **Exam Replay offer** | [Exam Deals](https://learn.microsoft.com/en-us/credentials/certifications/deals) |

## After You Pass 🎉

- Your certification appears on your [Microsoft Learn profile](https://learn.microsoft.com/en-us/users/) within 24 hours
- You get a **digital badge** via Credly to share on LinkedIn
- The certification is **valid for 1 year** — renew for free by passing an online assessment
- Consider your next step: [AI-050](https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-engineer/) (Azure AI Foundry), [AZ-305](https://learn.microsoft.com/en-us/credentials/certifications/azure-solutions-architect/) (Architect), or specialize with data engineering

---

**Ready to start studying?** Head to [Challenge 01](/docs/ai-103/plan-manage/challenge-01).
