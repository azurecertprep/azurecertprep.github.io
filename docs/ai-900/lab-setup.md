---
sidebar_position: 3
title: "Lab Setup"
---

# Lab Setup

The AI-900 is a fundamentals exam. The challenges in this guide are exploration-based and designed to cost **$0** using Azure free-tier resources. No complex infrastructure or paid services are required.

## What you need

| Requirement | Details |
|---|---|
| **Azure account** | Free tier is sufficient — includes $200 credit for 30 days |
| **Web browser** | Any modern browser (Edge, Chrome, Firefox) |
| **Azure Cloud Shell** | Built into the Azure Portal — no local install needed |

## Setup steps

### 1. Create a free Azure account

1. Go to [https://azure.microsoft.com/free](https://azure.microsoft.com/free)
2. Click **Start free**
3. Sign in with a Microsoft account (or create one)
4. Complete the verification process (phone + credit card for identity — you won't be charged)
5. You'll receive **$200 in credits** valid for 30 days, plus 12 months of free-tier services

### 2. Access the Azure Portal

1. Navigate to [https://portal.azure.com](https://portal.azure.com)
2. Sign in with your Azure account
3. Familiarize yourself with the portal home page and navigation menu

### 3. Explore Azure AI services in the portal

1. In the portal search bar, type **Azure AI services**
2. Browse the available services: Vision, Language, Speech, OpenAI, Document Intelligence
3. Note: You do not need to create any resources yet — the challenges will guide you through that

## Tools used in this guide

| Tool | Purpose | Cost |
|---|---|---|
| **Azure Portal** | Primary interface for creating and managing resources | Free |
| **Azure Cloud Shell** | Browser-based CLI for running commands (Bash or PowerShell) | Free (storage: negligible) |
| **Azure AI Studio** | Web UI for exploring and testing AI models | Free tier available |
| **Azure Machine Learning Studio** | Web UI for ML experiments and pipelines | Free workspace tier |

## Troubleshooting

| Issue | Solution |
|---|---|
| "You don't have access to create resources" | Ensure you're using a subscription with the Owner or Contributor role |
| Azure Cloud Shell won't start | Create a storage account when prompted; select your active subscription |
| AI services not showing in portal | Some services require registration — search "Resource providers" in portal settings and register `Microsoft.CognitiveServices` |
| Credit card declined during signup | Try a different card; virtual/prepaid cards are sometimes rejected |
| $200 credit expired | Free-tier services remain available after credits expire; upgrade to Pay-As-You-Go (you still won't be charged for free-tier usage) |

## Ready to begin?

Head to [Challenge 01: AI Workloads Overview](/docs/ai-900/ai-workloads/challenge-01) to start your AI-900 preparation.
