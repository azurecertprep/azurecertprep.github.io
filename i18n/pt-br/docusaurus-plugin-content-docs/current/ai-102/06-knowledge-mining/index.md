---
sidebar_position: 1
title: "Mineração e Extração de Conhecimento - Introdução"
---

# Mineração e Extração de Conhecimento

Este domínio cobre a construção de soluções inteligentes de busca e a extração de dados estruturados de documentos usando Azure AI Search e Azure Document Intelligence. Ele representa **15–20%** do exame AI-102.

Você criará índices de busca, construirá pipelines de enriquecimento com skillsets de IA, implementará busca vetorial e híbrida, e extrairá dados estruturados de faturas, recibos e documentos customizados. Essas habilidades são críticas para implementações de RAG — a camada de recuperação do Domínio 2 depende das habilidades de indexação e busca que você constrói aqui.

O exame testa sua compreensão do pipeline completo do AI Search: fontes de dados → indexadores → skillsets → índice → consultas. Saiba como configurar cada etapa, solucionar falhas e otimizar para relevância. Questões sobre Document Intelligence focam na seleção do modelo pré-construído correto e na compreensão do treinamento de modelos customizados.

## O Que Você Vai Aprender

- Projetar e criar schemas de índice no Azure AI Search
- Configurar indexadores e fontes de dados para indexação automatizada
- Construir pipelines de enriquecimento com IA usando skillsets built-in e customizados
- Implementar busca vetorial com campos de embedding
- Escrever consultas de busca eficazes (simples, Lucene completo, vetorial, híbrida)
- Extrair dados de documentos com modelos pré-construídos e customizados
- Implementar knowledge stores para análises downstream

## Habilidades Avaliadas

- Criar e gerenciar índices no Azure AI Search
- Implementar um pipeline de indexação com fontes de dados e indexadores
- Implementar enriquecimento com IA usando skillsets (built-in e customizados)
- Implementar busca vetorial e busca híbrida
- Consultar um índice Azure AI Search com múltiplos tipos de consulta
- Analisar documentos com Azure Document Intelligence

## Desafios

| # | Título | Tópicos Principais |
|---|--------|--------------------|
| 40 | Create an AI Search Index | Schema de índice, campos, tipos de dados, analyzers |
| 41 | Scoring Profiles & Relevance | Perfis de scoring, boosting, funções de freshness |
| 42 | Indexers & Data Sources | Blob storage, SQL, detecção de alterações, agendamento |
| 43 | Incremental Enrichment | Cache de enriquecimento, atualizações parciais, sessões de debug |
| 44 | Built-in AI Skills | Reconhecimento de entidades, frases-chave, OCR, análise de imagem |
| 45 | Custom Skills & Knowledge Store | Azure Functions, projeções, power skills |
| 46 | Vector Search & Hybrid Queries | Campos vetoriais, configuração HNSW, ranking híbrido |
| 47 | Advanced Queries & Filters | Sintaxe Lucene, facets, filtros, autocomplete |
| 48 | Document Intelligence Models | Prebuilt invoice/receipt, modelos customizados, modelos compostos |

## Pré-requisitos

- Domínio 1 (Planejar e Gerenciar) concluído ou conhecimento equivalente
- Domínio 2 (IA Generativa) concluído — conceitos de vetores dos Desafios 14–15
- Recurso Azure AI Search provisionado
- Compreensão de design de schema JSON
- Conhecimento básico de conceitos de relevância de busca
