---
sidebar_position: 4
title: "Desafio 22: Fundamentos de Engenharia de Prompt"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 22: Fundamentos de Engenharia de Prompt

:::info Tempo Estimado
**25-30 min** | **Custo**: Gratuito | **DomÃ­nio**: IA Generativa (15-20%)
:::

## Habilidades do exame abordadas

- Identificar cenÃ¡rios comuns para IA generativa
- Descrever tÃ©cnicas de engenharia de prompt
- Identificar recursos e capacidades do Azure OpenAI Service

## VisÃ£o geral

**Engenharia de prompt** Ã© a prÃ¡tica de projetar entradas (prompts) eficazes para obter as melhores saÃ­das possÃ­veis de modelos de IA generativa. Como LLMs respondem com base em como vocÃª pergunta, a qualidade do seu prompt determina diretamente a qualidade da resposta. Um prompt bem elaborado pode significar a diferenÃ§a entre uma resposta vaga e inÃºtil e uma resposta precisa e acionÃ¡vel.

A percepÃ§Ã£o chave Ã© que LLMs respondem a **contexto**. Uma system message define os limites comportamentais ("VocÃª Ã© um editor profissional de emails"). **Exemplos few-shot** mostram ao modelo qual formato vocÃª espera. InstruÃ§Ãµes especÃ­ficas ("Responda em tÃ³picos, limite a 3 itens") restringem a saÃ­da. E **dados de grounding** (documentos ou fatos relevantes) dÃ£o ao modelo informaÃ§Ãµes precisas para referenciar em vez de depender de dados de treinamento potencialmente desatualizados.

Engenharia de prompt nÃ£o Ã© sobre "enganar" a IA â€” Ã© sobre comunicaÃ§Ã£o clara. Pense nisso como dar instruÃ§Ãµes a um novo funcionÃ¡rio: quanto mais contexto, exemplos e restriÃ§Ãµes vocÃª fornecer, melhor o resultado. Os parÃ¢metros do Azure OpenAI (temperatura, top-p, max tokens) ajustam ainda mais o comportamento do modelo.

## Explorar

### Tarefa 1: Entender componentes do prompt

Um prompt eficaz tipicamente inclui alguns ou todos estes elementos:

| Componente | PropÃ³sito | Exemplo |
|-----------|-----------|---------|
| **System message** | Definir comportamento/persona da IA | "VocÃª Ã© um escritor tÃ©cnico conciso." |
| **Contexto/grounding** | Fornecer informaÃ§Ãµes relevantes | "Com base neste documento: [texto]..." |
| **InstruÃ§Ã£o** | Dizer ao modelo o que fazer | "Resuma o seguinte em 3 tÃ³picos." |
| **Dados de entrada** | O conteÃºdo a processar | [O texto a resumir] |
| **Formato de saÃ­da** | Especificar estrutura desejada | "Formate como lista numerada" ou "Responda em JSON" |
| **Exemplos few-shot** | Mostrar comportamento esperado | "Exemplo: Entrada: X â†’ SaÃ­da: Y" |
| **RestriÃ§Ãµes** | Definir limites | "MÃ¡ximo 100 palavras. NÃ£o inclua opiniÃµes." |

### Tarefa 2: Comparar prompts bons vs. ruins

**CenÃ¡rio**: VocÃª quer uma descriÃ§Ã£o de produto para um novo fone de ouvido sem fio.

âŒ **Prompt ruim**:
> "Escreva sobre fones de ouvido."

Resultado: Texto genÃ©rico e sem foco sobre fones de ouvido em geral.

âœ… **Prompt bom**:
> "Escreva uma descriÃ§Ã£o de produto de 50 palavras para fones de ouvido sem fio com cancelamento de ruÃ­do voltados para viajantes de negÃ³cios. Enfatize conforto para voos longos, duraÃ§Ã£o da bateria e cancelamento de ruÃ­do. Tom: profissional mas amigÃ¡vel."

Resultado: DescriÃ§Ã£o focada e especÃ­fica que atende aos requisitos.

**Mais exemplos**:

| Tarefa | Prompt Ruim | Prompt Bom |
|--------|-------------|------------|
| Resumir | "Resuma isso" | "Resuma este artigo em 3 tÃ³picos, focando no impacto financeiro" |
| CÃ³digo | "Escreva cÃ³digo Python" | "Escreva uma funÃ§Ã£o Python que recebe uma lista de inteiros e retorna os dois maiores valores. Inclua docstring e type hints." |
| Email | "Escreva um email" | "Escreva um email profissional recusando uma oferta de emprego educadamente. Mantenha em menos de 100 palavras. Expresse gratidÃ£o e deixe a porta aberta para oportunidades futuras." |

### Tarefa 3: Pratique prompting few-shot

**Zero-shot** â€” Sem exemplos (modelo depende do treinamento):
```python
Classify the following review as Positive, Negative, or Neutral:
"The product arrived on time and works exactly as described."
```

**One-shot** â€” Um exemplo:
```python
Classify reviews as Positive, Negative, or Neutral.

Example:
Review: "Absolutely terrible quality, broke after one day."
Classification: Negative

Now classify:
Review: "The product arrived on time and works exactly as described."
Classification:
```

**Few-shot** â€” MÃºltiplos exemplos:
```python
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

**PercepÃ§Ã£o chave**: Mais exemplos ajudam o modelo a entender o formato esperado e os limites de classificaÃ§Ã£o, mas usam mais tokens (custam mais).

### Tarefa 4: Entender efeitos de temperatura e top-p

Estes parÃ¢metros controlam a aleatoriedade e criatividade das saÃ­das:

**Temperatura** (0 a 2):
| Valor | Comportamento | Melhor Para |
|-------|--------------|-------------|
| 0 | DeterminÃ­stico, mesma resposta toda vez | Consultas factuais, extraÃ§Ã£o de dados, classificaÃ§Ã£o |
| 0.3-0.5 | Majoritariamente consistente com leve variaÃ§Ã£o | Suporte ao cliente, escrita profissional |
| 0.7-1.0 | Criativo, respostas variadas | Escrita criativa, brainstorming, storytelling |
| >1.0 | Muito aleatÃ³rio, potencialmente incoerente | Raramente Ãºtil em produÃ§Ã£o |

**Top-p** (0 a 1) â€” Amostragem de nÃºcleo:
- Top-p 0.1: Considera apenas os 10% de tokens mais provÃ¡veis â†’ muito focado
- Top-p 0.9: Considera os 90% de tokens mais provÃ¡veis â†’ mais diverso
- Funciona como alternativa Ã  temperatura (use um ou outro, nÃ£o ambos)

**Sua tarefa**: Para cada cenÃ¡rio, qual temperatura vocÃª recomendaria?
1. Extrair datas de um contrato jurÃ­dico â†’ **0** (precisÃ£o importa, sem criatividade)
2. Escrever taglines de marketing â†’ **0.8-1.0** (criatividade desejada)
3. Responder perguntas FAQ de clientes â†’ **0.3** (consistente mas natural)
4. Gerar poesia â†’ **1.0+** (mÃ¡xima criatividade)

### Tarefa 5: Entender grounding e janelas de contexto

**Grounding** conecta o modelo a dados reais para reduzir alucinaÃ§Ãµes:

```yaml
System: You are a customer support agent. Only answer based on 
the following product documentation. If the answer is not in the 
documentation, say "I don't have that information."

Documentation:
- Product X costs $99/month for the basic plan
- Product X supports up to 50 users on the basic plan
- Enterprise plan costs $499/month for unlimited users

User: How much does Product X cost?
```

Esta abordagem (chamada **Retrieval-Augmented Generation / RAG**) Ã© preferida porque:
- Reduz alucinaÃ§Ãµes (modelo referencia dados reais)
- Fornece informaÃ§Ãµes atualizadas (nÃ£o limitado a dados de treinamento)
- Permite respostas verificÃ¡veis (vocÃª pode conferir com a fonte)

**Janela de contexto** â€” o total de tokens que um modelo pode lidar (entrada + saÃ­da):
| Modelo | Janela de Contexto |
|--------|-------------------|
| GPT-4o | 128.000 tokens |
| GPT-4 Turbo | 128.000 tokens |
| GPT-3.5-Turbo | 16.384 tokens |

:::tip Dica para o exame
Para o exame, lembre-se: system messages definem comportamento, exemplos few-shot mostram formato, grounding fornece precisÃ£o, e temperatura/top-p controlam criatividade. Essas sÃ£o as alavancas fundamentais de engenharia de prompt.
:::

## Conceitos-Chave

| Conceito | DefiniÃ§Ã£o |
|----------|-----------|
| Engenharia de prompt | Projetar entradas eficazes para otimizar as saÃ­das de modelos de IA generativa |
| System message | InstruÃ§Ãµes que definem o comportamento, persona e restriÃ§Ãµes da IA |
| Prompting few-shot | Fornecer exemplos no prompt para mostrar ao modelo o formato de saÃ­da esperado |
| Grounding | Fornecer dados fonte relevantes para que o modelo responda com base em fatos em vez de alucinar |
| Janela de contexto | O nÃºmero mÃ¡ximo de tokens que um modelo pode processar (entrada + saÃ­da combinados) |
| RAG (Retrieval-Augmented Generation) | PadrÃ£o de recuperar documentos relevantes e incluÃ­-los no prompt para respostas fundamentadas |

## EquÃ­vocos Comuns

| EquÃ­voco | Realidade |
|----------|-----------|
| Prompts mais longos sempre produzem melhores resultados | Prompts concisos e claros com o contexto certo frequentemente superam os verbosos; comprimento desnecessÃ¡rio desperdiÃ§a tokens |
| Temperatura 0 significa que o modelo nÃ£o vai errar | Temperatura 0 torna a saÃ­da determinÃ­stica (mesma entrada â†’ mesma saÃ­da) mas nÃ£o garante precisÃ£o factual |
| Exemplos few-shot ensinam o modelo permanentemente | Exemplos se aplicam apenas Ã  conversa atual; o modelo nÃ£o retÃ©m aprendizado entre sessÃµes |
| VocÃª deve sempre usar a janela de contexto mÃ¡xima | Incluir contexto irrelevante pode na verdade confundir o modelo; inclua apenas o necessÃ¡rio para responder Ã  pergunta |
| Engenharia de prompt Ã© uma tarefa Ãºnica | Prompts eficazes requerem testes iterativos e refinamento com base nas saÃ­das reais |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-22-q1',
      question: 'Um desenvolvedor quer que um modelo de IA sempre responda em um formato JSON especÃ­fico. Qual tÃ©cnica de engenharia de prompt Ã© mais eficaz?',
      options: ['Definir temperatura como 0', 'Fornecer exemplos few-shot mostrando o formato JSON exato esperado', 'Usar um modelo maior', 'Aumentar o parÃ¢metro max tokens'],
      correctAnswer: 1,
      explanation: 'Exemplos few-shot mostrando o formato JSON exato esperado ensinam ao modelo qual estrutura produzir. Embora temperatura 0 ajude com consistÃªncia, exemplos few-shot sÃ£o a tÃ©cnica primÃ¡ria para especificaÃ§Ã£o de formato.'
    },
    {
      id: 'ai900-22-q2',
      question: 'Qual Ã© o propÃ³sito principal do grounding na engenharia de prompt?',
      options: ['Tornar respostas mais longas e detalhadas', 'Acelerar a geraÃ§Ã£o de respostas', 'Aumentar a criatividade das respostas', 'Reduzir alucinaÃ§Ãµes conectando o modelo a dados fonte reais'],
      correctAnswer: 3,
      explanation: 'Grounding fornece dados fonte relevantes e factuais no prompt para que o modelo responda com base em informaÃ§Ãµes reais em vez de gerar conteÃºdo potencialmente incorreto dos seus dados de treinamento. Isso reduz alucinaÃ§Ãµes.'
    },
    {
      id: 'ai900-22-q3',
      question: 'Uma aplicaÃ§Ã£o precisa extrair pontos de dados especÃ­ficos de faturas com alta precisÃ£o. Qual configuraÃ§Ã£o de temperatura Ã© mais apropriada?',
      options: ['Temperatura 0 (determinÃ­stica)', 'Temperatura 0.7 (equilibrada)', 'Temperatura 1.0 (criativa)', 'Temperatura 2.0 (aleatoriedade mÃ¡xima)'],
      correctAnswer: 0,
      explanation: 'Temperatura 0 produz saÃ­da determinÃ­stica e focada â€” ideal para tarefas de extraÃ§Ã£o de dados onde precisÃ£o e consistÃªncia importam mais que criatividade. Temperaturas mais altas introduzem aleatoriedade que poderia produzir extraÃ§Ãµes incorretas.'
    },
    {
      id: 'ai900-22-q4',
      question: 'O que Ã© a janela de contexto em um modelo de IA generativa?',
      options: ['A interface visual onde vocÃª digita prompts', 'O limite de tempo para gerar uma resposta', 'O mÃ¡ximo total de tokens que o modelo pode processar (entrada + saÃ­da combinados)', 'O nÃºmero de usuÃ¡rios que podem acessar o modelo simultaneamente'],
      correctAnswer: 2,
      explanation: 'A janela de contexto Ã© o nÃºmero mÃ¡ximo de tokens (prompt de entrada + completion de saÃ­da combinados) que um modelo pode lidar em uma Ãºnica requisiÃ§Ã£o. Por exemplo, GPT-4o tem uma janela de contexto de 128K tokens.'
    },
    {
      id: 'ai900-22-q5',
      question: 'O que Ã© "prompting few-shot"?',
      options: ['Usar o modelo para apenas algumas requisiÃ§Ãµes por dia', 'Fornecer exemplos no prompt para demonstrar o formato de saÃ­da esperado', 'Treinar o modelo com um conjunto de dados pequeno', 'Limitar a resposta a poucas frases'],
      correctAnswer: 1,
      explanation: 'Prompting few-shot significa incluir um ou mais exemplos (pares entrada-saÃ­da) no prompt para mostrar ao modelo qual formato e estilo de resposta vocÃª espera. Isso ajuda o modelo a entender seus requisitos sem nenhum treinamento.'
    }
  ]}
/>

## Saiba Mais

- [TÃ©cnicas de engenharia de prompt](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/prompt-engineering)
- [Framework de system message](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/system-message)
- [IntroduÃ§Ã£o Ã  engenharia de prompt](https://learn.microsoft.com/en-us/training/modules/introduction-prompt-engineering-with-github-copilot/)
- [Melhores prÃ¡ticas para engenharia de prompt](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/prompt-engineering)
- [RAG com Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/use-your-data)
