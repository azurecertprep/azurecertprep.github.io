---
sidebar_position: 5
title: "Guia Rápido de Azure AI Services"
---

# Guia Rápido de Azure AI Services

## Hierarquia dos Azure AI services

```text
Azure AI services (guarda-chuva)
├── Azure AI Vision
├── Azure AI Language
├── Azure AI Speech
├── Azure AI Document Intelligence
├── Azure AI Translator
├── Azure AI Content Safety
└── Azure OpenAI Service (recurso separado)

Azure Machine Learning (plataforma separada)
└── Workspace → Compute → Pipelines → AutoML → Models
```

## Serviços de Visão

| Serviço | O que faz | Recursos principais |
|---|---|---|
| **Azure AI Vision** | Analisa imagens e vídeo | Análise de imagem, OCR, análise espacial, legendagem de imagem |
| **Face API** (parte do AI Vision) | Detecta e reconhece rostos | Detecção facial, verificação, identificação, emoção (limitado) |
| **Custom Vision** | Treina modelos de imagem personalizados | Classificação de imagem, detecção de objetos com seus próprios dados |

**Quando usar qual:**
- Precisa de análise geral de imagem? → **Azure AI Vision**
- Precisa treinar com suas próprias imagens? → **Custom Vision**
- Precisa detectar/verificar rostos? → **Face API**

## Serviços de Linguagem

| Serviço | O que faz | Recursos principais |
|---|---|---|
| **Azure AI Language** | Compreende e analisa texto | Análise de sentimento, extração de frases-chave, reconhecimento de entidades, CLU, sumarização, QnA |
| **CLU (Conversational Language Understanding)** | Constrói modelos de intenção + entidade | Substitui o LUIS; NLU customizado para chatbots e apps |
| **Azure AI Translator** | Traduz texto entre idiomas | 100+ idiomas, modelos customizados, tradução de documentos |
| **QnA (Question Answering)** | Cria bases de conhecimento a partir de FAQs | Parte do Azure AI Language; substitui o QnA Maker |

## Serviços de Fala

| Serviço | O que faz | Recursos principais |
|---|---|---|
| **Speech-to-Text** | Converte áudio em texto | Transcrição em tempo real e em lote, modelos customizados |
| **Text-to-Speech** | Converte texto em áudio | Vozes neurais, voz customizada, suporte a SSML |
| **Speech Translation** | Traduz linguagem falada em tempo real | Combina reconhecimento + tradução |
| **Speaker Recognition** | Identifica/verifica quem está falando | Perfis de voz, verificação, identificação |

## Document Intelligence

| Serviço | O que faz | Recursos principais |
|---|---|---|
| **Azure AI Document Intelligence** | Extrai dados estruturados de documentos | Modelos pré-construídos (faturas, recibos, identidade), modelos customizados, análise de layout |

> ⚠️ Anteriormente chamado "Form Recognizer" — o exame pode referenciar qualquer um dos nomes.

## Azure OpenAI Service

| Recurso | Detalhes |
|---|---|
| **Modelos GPT** | Geração de texto, chat completion, sumarização, geração de código |
| **DALL-E** | Geração de imagem a partir de prompts de texto |
| **Embeddings** | Representações vetoriais para busca semântica e RAG |
| **Whisper** | Modelo de transcrição de áudio |
| **Acesso** | Requer aplicação/aprovação; implantado via recurso Azure OpenAI |

## Azure Machine Learning

| Componente | Finalidade |
|---|---|
| **Workspace** | Hub central para todos os ativos de ML (dados, modelos, compute, experimentos) |
| **Compute** | Clusters de treinamento, instâncias de compute, endpoints de inferência |
| **Designer** | Construtor visual de pipelines de ML (sem código) |
| **AutoML** | Treina e ajusta modelos automaticamente a partir dos seus dados |
| **Pipelines** | Orquestra workflows de ML com múltiplas etapas |
| **Model Registry** | Versiona e gerencia modelos treinados |
| **Endpoints** | Implanta modelos como APIs REST (tempo real ou em lote) |

## IA Responsável — 6 princípios

| Princípio | Definição | Exemplo |
|---|---|---|
| **Equidade (Fairness)** | A IA trata todas as pessoas de forma equitativa | Modelo de empréstimo não discrimina por gênero |
| **Confiabilidade e Segurança (Reliability & Safety)** | A IA funciona de forma confiável sob condições esperadas | Carro autônomo lida com casos extremos com segurança |
| **Privacidade e Segurança (Privacy & Security)** | A IA respeita a privacidade e é segura | Dados de treinamento são anonimizados e criptografados |
| **Inclusão (Inclusiveness)** | A IA capacita todos | App funciona para usuários com deficiência |
| **Transparência (Transparency)** | Os sistemas de IA são compreensíveis | Usuários sabem quando estão interagindo com IA |
| **Responsabilização (Accountability)** | Pessoas são responsáveis pelos sistemas de IA | Processo de revisão humana para decisões de alto risco |

## Tabela de diferenças principais

| Nome antigo | Nome novo | Notas |
|---|---|---|
| Cognitive Services | Azure AI services | Rebranding geral (2023) |
| Form Recognizer | Azure AI Document Intelligence | Mesmas capacidades, novo nome |
| LUIS | CLU (Azure AI Language) | Conversational Language Understanding |
| QnA Maker | Question Answering (Azure AI Language) | Agora parte do serviço Language |
| Metrics Advisor | Azure AI Anomaly Detector | Consolidado |

| Comparação | Quando usar A | Quando usar B |
|---|---|---|
| **Custom Vision** vs **Azure AI Vision** | Você precisa treinar com suas próprias imagens rotuladas | Você precisa de análise de imagem de propósito geral (pronto para uso) |
| **CLU** vs **Recursos pré-construídos de Language** | Você precisa de intenções/entidades customizadas para seu domínio | Tarefas padrão (sentimento, frases-chave, NER) são suficientes |
| **Azure ML** vs **Azure AI services** | Você precisa construir/treinar/implantar modelos customizados | Você precisa de uma API pré-construída para uma tarefa comum de IA |
| **Azure OpenAI** vs **Azure AI Language** | Você precisa de texto generativo, chat ou código | Você precisa de NLP analítico (sentimento, extração) |

## Referência rápida de conceitos de ML

| Termo | Significado |
|---|---|
| **Feature (característica)** | Uma variável de entrada usada para predição (ex.: idade, renda) |
| **Label (rótulo)** | O valor que você está tentando prever (ex.: preço, categoria) |
| **Treinamento** | Alimentar dados a um algoritmo para que ele aprenda padrões |
| **Validação** | Testar o modelo em dados separados para medir a acurácia |
| **Inferência** | Usar um modelo treinado para fazer predições em novos dados |
| **Overfitting (sobreajuste)** | Modelo memoriza dados de treinamento; tem desempenho ruim em novos dados |
| **Underfitting (subajuste)** | Modelo é muito simples; perde padrões nos dados |
