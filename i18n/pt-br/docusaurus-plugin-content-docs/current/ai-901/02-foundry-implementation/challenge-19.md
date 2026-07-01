---
sidebar_position: 1
title: "Desafio 19: Fundamentos de IA Generativa"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 19: Fundamentos de IA Generativa

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Implementação no Azure AI Foundry (55-60%)
:::

## Habilidades do exame abordadas

- Identificar recursos de modelos de IA generativa
- Identificar cenários comuns para IA generativa
- Identificar capacidades do Azure OpenAI Service

## Visão geral

**IA Generativa** refere-se a modelos de inteligência artificial que podem criar novo conteúdo — texto, imagens, código, áudio e vídeo — baseado em padrões aprendidos de grandes quantidades de dados de treinamento. Diferente da IA tradicional que classifica ou prediz, a IA generativa produz saídas originais que não existiam antes. Quando você pede a um chatbot para escrever um email, gerar uma imagem a partir de uma descrição, ou completar seu código, você está usando IA generativa.

A espinha dorsal da IA generativa moderna baseada em texto é o **Large Language Model (LLM)**. LLMs como GPT-4 são treinados em conjuntos enormes de dados de texto da internet, livros e outras fontes. Eles aprendem padrões, gramática, fatos e habilidades de raciocínio — e então geram novo texto prevendo o que vem a seguir, token por token. Eles não "entendem" no sentido humano, mas são notavelmente capazes de produzir respostas coerentes e contextuais.

**Modelos fundacionais** são modelos grandes e pré-treinados projetados para serem adaptados para muitas tarefas. Em vez de treinar um modelo do zero para cada caso de uso, organizações podem pegar um modelo fundacional (como GPT-4) e fazer fine-tuning ou engenharia de prompt para necessidades específicas. Essa abordagem de "treine uma vez, use em todo lugar" revolucionou o desenvolvimento de IA — tornando IA poderosa acessível sem exigir orçamentos massivos de computação ou conjuntos de dados.

## Explorar

### Tarefa 1: Entender o que torna a IA "generativa"

Compare IA tradicional vs. IA generativa:

| Aspecto | IA Tradicional | IA Generativa |
|---------|---------------|---------------|
| O que faz | Classifica, prediz, detecta | Cria novo conteúdo |
| Saída | Rótulo, número ou categoria | Texto, imagens, código, áudio |
| Exemplo | "Este email é spam" | "Escreva uma resposta profissional para este email" |
| Abordagem de treinamento | Conjuntos de dados específicos para a tarefa | Conjuntos de dados massivos e diversos |
| Adaptabilidade | Uma tarefa por modelo | Muitas tarefas por modelo |

**Tipos de modelos de IA generativa**:

| Tipo de Modelo | O que gera | Exemplos |
|---------------|------------|----------|
| Large Language Models (LLMs) | Texto, código, raciocínio | GPT-4, GPT-4o, GPT-3.5-Turbo |
| Modelos de difusão | Imagens a partir de descrições textuais | DALL-E, Stable Diffusion |
| Modelos de áudio | Fala, música, transcrição | Whisper (transcrição) |
| Modelos multimodais | Texto + imagens combinados | GPT-4o (visão + texto) |

### Tarefa 2: Explorar cenários comuns de IA generativa

A IA generativa possibilita muitos cenários práticos de negócios:

| Cenário | Descrição | Exemplo |
|---------|-----------|---------|
| Criação de conteúdo | Gerar texto, resumos, relatórios | Textos de marketing, posts de blog |
| Geração de código | Escrever, explicar ou debugar código | GitHub Copilot, completar código |
| IA conversacional | Diálogo natural com usuários | Chatbots de atendimento ao cliente |
| Geração de imagens | Criar imagens a partir de descrições textuais | Mockups de produtos, conceitos de design |
| Sumarização de documentos | Condensar documentos longos | Atas de reunião, artigos de pesquisa |
| Análise de dados | Interpretar dados e gerar insights | Consultas em linguagem natural em bancos de dados |
| Tradução e localização | Tradução contextual além de palavra por palavra | Adaptação de conteúdo de marketing |

### Tarefa 3: Experimente a IA generativa em ação

Experimente o **Microsoft Copilot** (gratuito): [copilot.microsoft.com](https://copilot.microsoft.com)

1. **Geração de texto**: Peça "Escreva um email profissional curto recusando educadamente um convite para reunião"
2. **Sumarização**: Cole um parágrafo longo e peça "Resuma isso em 2 frases"
3. **Geração de código**: Peça "Escreva uma função Python que calcula o fatorial de um número"
4. **Conteúdo criativo**: Peça "Escreva um haiku sobre computação em nuvem"
5. **Raciocínio**: Peça "Se um trem viaja a 100 km/h por 2,5 horas, qual distância ele percorre? Mostre seu trabalho."

Observe como o modelo:
- Gera respostas coerentes e contextuais
- Segue instruções e requisitos de formato
- Adapta o tom com base no seu prompt
- Pode lidar com tarefas diversas com um único modelo

### Tarefa 4: Entender conceitos-chave de IA generativa

Revise estes conceitos fundamentais que aparecem no exame:

| Conceito | Definição |
|----------|-----------|
| **Token** | A unidade básica de processamento de texto — aproximadamente ¾ de uma palavra. "Hello world" ≈ 2 tokens |
| **Janela de contexto** | Máximo de tokens que um modelo pode processar (entrada + saída combinados) |
| **Temperatura** | Controla aleatoriedade: 0 = determinístico/focado, 1 = criativo/variado |
| **Top-p** | Controle alternativo de aleatoriedade: limita a seleção de tokens às opções mais prováveis |
| **Prompt** | A entrada/instrução que você dá ao modelo |
| **Completion** | A saída/resposta que o modelo gera |
| **Grounding** | Conectar a saída do modelo a fontes de dados reais e verificáveis |
| **Alucinação** | Quando o modelo gera informação plausível mas factualmente incorreta |

**Exemplo de temperatura**:
- Temperatura 0: "A capital da França é Paris." (sempre o mesmo)
- Temperatura 1: "A capital da França é Paris, uma cidade conhecida por..." (pode variar a cada vez, mais criativo)

:::tip Dica para o exame
O exame espera que você saiba que a IA generativa pode produzir informações incorretas (alucinações) e que técnicas como grounding ajudam a mitigar isso. Isso se conecta aos princípios de IA responsável.
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| IA Generativa | Modelos de IA que criam novo conteúdo (texto, imagens, código) em vez de apenas classificar ou predizer |
| Large Language Model (LLM) | Modelo de IA treinado em dados massivos de texto que gera texto prevendo o próximo token |
| Modelo fundacional | Um modelo grande pré-treinado projetado para ser adaptado para muitas tarefas downstream |
| Token | A unidade básica de texto para LLMs — aproximadamente ¾ de uma palavra |
| Alucinação | Quando um modelo de IA gera conteúdo que soa plausível mas é factualmente incorreto |
| Grounding | Conectar saídas de IA a fontes de dados reais para melhorar a precisão e reduzir alucinações |

## Equívocos Comuns

| Equívoco | Realidade |
|----------|-----------|
| IA generativa "entende" como humanos | LLMs preveem tokens prováveis seguintes com base em padrões — eles não têm compreensão verdadeira ou consciência |
| IA generativa sempre produz informações corretas | Modelos podem alucinar — gerando afirmações confiantes mas incorretas. Sempre verifique informações críticas |
| Você precisa treinar seu próprio modelo para usar IA generativa | Modelos fundacionais são pré-treinados e prontos para uso; você pode fazer engenharia de prompt ou fine-tuning neles |
| IA generativa substitui toda outra IA | IA tradicional (classificação, detecção, predição) continua melhor para muitas tarefas estruturadas |
| Temperatura mais alta sempre significa melhor saída | Temperatura mais alta aumenta criatividade mas também aumenta aleatoriedade e potencial para erros |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-19-q1',
      question: 'O que distingue a IA generativa das abordagens tradicionais de IA?',
      options: ['IA generativa é mais rápida que IA tradicional', 'IA generativa cria novo conteúdo enquanto IA tradicional classifica ou prediz', 'IA generativa só funciona com texto', 'IA generativa não requer dados de treinamento'],
      correctAnswer: 1,
      explanation: 'A distinção fundamental é que a IA generativa cria novo conteúdo original (texto, imagens, código) enquanto a IA tradicional tipicamente classifica entradas, faz predições ou detecta padrões em dados existentes.'
    },
    {
      id: 'ai900-19-q2',
      question: 'O que é uma "alucinação" no contexto de IA generativa?',
      options: ['Quando o modelo se recusa a responder uma pergunta', 'Quando o modelo gera conteúdo no idioma errado', 'Quando o modelo demora demais para responder', 'Quando o modelo gera informação plausível mas factualmente incorreta'],
      correctAnswer: 3,
      explanation: 'Uma alucinação ocorre quando um modelo de IA generativa produz conteúdo que soa plausível e confiante mas é factualmente incorreto. Esta é uma limitação conhecida que técnicas de grounding ajudam a mitigar.'
    },
    {
      id: 'ai900-19-q3',
      question: 'O que o parâmetro "temperatura" controla em um modelo de IA generativa?',
      options: ['A velocidade de geração de resposta', 'O comprimento máximo da saída', 'A aleatoriedade e criatividade da saída', 'O idioma da resposta'],
      correctAnswer: 2,
      explanation: 'Temperatura controla a aleatoriedade da saída. Uma temperatura de 0 produz respostas determinísticas e focadas. Temperaturas mais altas (até 1 ou 2) produzem respostas mais criativas e variadas, mas potencialmente menos precisas.'
    },
    {
      id: 'ai900-19-q4',
      question: 'O que é um modelo fundacional?',
      options: ['Um modelo grande pré-treinado que pode ser adaptado para muitas tarefas diferentes', 'Um modelo pequeno projetado para dispositivos de borda', 'Um modelo que só pode realizar uma tarefa específica', 'Um modelo que não requer dados para funcionar'],
      correctAnswer: 0,
      explanation: 'Um modelo fundacional é um modelo grande de IA treinado em dados amplos que pode ser adaptado (através de fine-tuning ou prompting) para muitas tarefas downstream diferentes — em vez de construir modelos separados para cada tarefa.'
    },
    {
      id: 'ai900-19-q5',
      question: 'Qual dos seguintes é um cenário comum para IA generativa?',
      options: ['Classificar emails como spam ou não spam', 'Detectar objetos em um feed de câmera de segurança', 'Gerar um resumo de um artigo de pesquisa longo', 'Prever preços de ações com base em dados históricos'],
      correctAnswer: 2,
      explanation: 'Gerar resumos é uma tarefa de IA generativa — o modelo cria novo texto mais curto que captura os pontos principais. Classificação de spam, detecção de objetos e predição de preços são tarefas de IA tradicional que classificam ou predizem em vez de gerar.'
    }
  ]}
/>

## Saiba Mais

- [Introdução à IA generativa](https://learn.microsoft.com/en-us/training/modules/fundamentals-generative-ai/)
- [O que é Azure OpenAI Service?](https://learn.microsoft.com/en-us/azure/ai-services/openai/overview)
- [Microsoft Copilot](https://copilot.microsoft.com)
- [Entenda tokens no Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/tokens)
