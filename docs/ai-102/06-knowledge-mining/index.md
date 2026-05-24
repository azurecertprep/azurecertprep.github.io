---
sidebar_position: 1
title: "Knowledge Mining & Extraction - Introduction"
---

# Knowledge Mining & Extraction

This domain covers building intelligent search solutions and extracting structured data from documents using Azure AI Search and Azure Document Intelligence. It represents **15–20%** of the AI-102 exam.

You'll create search indexes, build enrichment pipelines with AI skillsets, implement vector and hybrid search, and extract structured data from invoices, receipts, and custom documents. These skills are critical for RAG implementations — Domain 2's retrieval layer depends on the indexing and search skills you build here.

The exam tests your understanding of the full AI Search pipeline: data sources → indexers → skillsets → index → queries. Know how to configure each stage, troubleshoot failures, and optimize for relevance. Document Intelligence questions focus on selecting the right prebuilt model and understanding custom model training.

## What You'll Learn

- Design and create Azure AI Search index schemas
- Configure indexers and data sources for automated indexing
- Build AI enrichment pipelines with built-in and custom skillsets
- Implement vector search with embedding fields
- Write effective search queries (simple, full Lucene, vector, hybrid)
- Extract data from documents with prebuilt and custom models
- Implement knowledge stores for downstream analytics

## Skills Measured

- Create and manage Azure AI Search indexes
- Implement an indexing pipeline with data sources and indexers
- Implement AI enrichment with skillsets (built-in and custom)
- Implement vector search and hybrid search
- Query an Azure AI Search index with multiple query types
- Analyze documents with Azure Document Intelligence

## Challenges

| # | Title | Key Topics |
|---|-------|------------|
| 40 | Create an AI Search Index | Index schema, fields, data types, analyzers |
| 41 | Scoring Profiles & Relevance | Scoring profiles, boosting, freshness functions |
| 42 | Indexers & Data Sources | Blob storage, SQL, change detection, schedule |
| 43 | Incremental Enrichment | Enrichment cache, partial updates, debug sessions |
| 44 | Built-in AI Skills | Entity recognition, key phrases, OCR, image analysis |
| 45 | Custom Skills & Knowledge Store | Azure Functions, projections, power skills |
| 46 | Vector Search & Hybrid Queries | Vector fields, HNSW config, hybrid ranking |
| 47 | Advanced Queries & Filters | Lucene syntax, facets, filters, autocomplete |
| 48 | Document Intelligence Models | Prebuilt invoice/receipt, custom models, composed models |

## Prerequisites

- Completed Domain 1 (Plan & Manage) or equivalent knowledge
- Completed Domain 2 (Generative AI) — vector concepts from Challenges 14–15
- Azure AI Search resource provisioned
- Understanding of JSON schema design
- Basic knowledge of search relevance concepts
