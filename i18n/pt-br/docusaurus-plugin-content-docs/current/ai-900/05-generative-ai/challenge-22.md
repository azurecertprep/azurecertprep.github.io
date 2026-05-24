---
sidebar_position: 4
title: "Desafio 22: Fundamentos de Engenharia de Prompt"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 22: Fundamentos de Engenharia de Prompt

:::info Tempo Estimado
**25-30 min** | **Custo**: Gratuito | **Domínio**: IA Generativa (15-20%)
:::

## Habilidades do exame abordadas

- Identificar cenários comuns para IA generativa
- Descrever técnicas de engenharia de prompt
- Identificar recursos e capacidades do Azure OpenAI Service

## Visão geral

**Engenharia de prompt** é a prática de projetar entradas (prompts) eficazes para obter as melhores saídas possíveis de modelos de IA generativa. Como LLMs respondem com base em como você pergunta, a qualidade do seu prompt determina diretamente a qualidade da resposta. Um prompt bem elaborado pode significar a diferença entre uma resposta vaga e inútil e uma resposta precisa e acionável.

A percepção chave é que LLMs respondem a **contexto**. Uma system message define os limites comportamentais ("Você é um editor profissional de emails"). **Exemplos few-shot** mostram ao modelo qual formato você espera. Instruções específicas ("Responda em tópicos, limite a 3 itens") restringem a saída. E **dados de grounding** (documentos ou fatos relevantes) dão ao modelo informações precisas para referenciar em vez de depender de dados de treinamento potencialmente desatualizados.

Engenharia de prompt não é sobre "enganar" a IA â€” é sobre comunicação clara. Pense nisso como dar instruções a um novo funcionário: quanto mais contexto, exemplos e restrições você fornecer, melhor o resultado. Os parâmetros do Azure OpenAI (temperatura, top-p, max tokens) ajustam ainda mais o comportamento do modelo.

## Explorar

### Tarefa 1: Entender componentes do prompt

Um prompt eficaz tipicamente inclui alguns ou todos estes elementos:

| Componente | Propósito | Exemplo |
|-----------|-----------|---------|
| **System message** | Definir comportamento/persona da IA | "Você é um escritor técnico conciso." |
| **Contexto/grounding** | Fornecer informações relevantes | "Com base neste documento: [texto]..." |
| **Instrução** | Dizer ao modelo o que fazer | "Resuma o seguinte em 3 tópicos." |
| **Dados de entrada** | O conteúdo a processar | [O texto a resumir] |
| **Formato de saída** | Especificar estrutura desejada | "Formate como lista numerada" ou "Responda em JSON" |
| **Exemplos few-shot** | Mostrar comportamento esperado | "Exemplo: Entrada: X â†’ Saída: Y" |
| **Restrições** | Definir limites | "Máximo 100 palavras. Não inclua opiniões." |

### Tarefa 2: Comparar prompts bons vs. ruins

**Cenário**: Você quer uma descrição de produto para um novo fone de ouvido sem fio.

âŒ **Prompt ruim**:
> "Escreva sobre fones de ouvido."

Resultado: Texto genérico e sem foco sobre fones de ouvido em geral.

âœ… **Prompt bom**:
> "Escreva uma descrição de produto de 50 palavras para fones de ouvido sem fio com cancelamento de ruído voltados para viajantes de negócios. Enfatize conforto para voos longos, duração da bateria e cancelamento de ruído. Tom: profissional mas amigável."

Resultado: Descrição focada e específica que atende aos requisitos.

**Mais exemplos**:

| Tarefa | Prompt Ruim | Prompt Bom |
|--------|-------------|------------|
| Resumir | "Resuma isso" | "Resuma este artigo em 3 tópicos, focando no impacto financeiro" |
| Código | "Escreva código Python" | "Escreva uma função Python que recebe uma lista de inteiros e retorna os dois maiores valores. Inclua docstring e type hints." |
| Email | "Escreva um email" | "Escreva um email profissional recusando uma oferta de emprego educadamente. Mantenha em menos de 100 palavras. Expresse gratidão e deixe a porta aberta para oportunidades futuras." |

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

**Few-shot** â€” Múltiplos exemplos:
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

**Percepção chave**: Mais exemplos ajudam o modelo a entender o formato esperado e os limites de classificação, mas usam mais tokens (custam mais).

### Tarefa 4: Entender efeitos de temperatura e top-p

Estes parâmetros controlam a aleatoriedade e criatividade das saídas:

**Temperatura** (0 a 2):
| Valor | Comportamento | Melhor Para |
|-------|--------------|-------------|
| 0 | Determinístico, mesma resposta toda vez | Consultas factuais, extração de dados, classificação |
| 0.3-0.5 | Majoritariamente consistente com leve variação | Suporte ao cliente, escrita profissional |
| 0.7-1.0 | Criativo, respostas variadas | Escrita criativa, brainstorming, storytelling |
| >1.0 | Muito aleatório, potencialmente incoerente | Raramente útil em produção |

**Top-p** (0 a 1) â€” Amostragem de núcleo:
- Top-p 0.1: Considera apenas os 10% de tokens mais prováveis â†’ muito focado
- Top-p 0.9: Considera os 90% de tokens mais prováveis â†’ mais diverso
- Funciona como alternativa Ã  temperatura (use um ou outro, não ambos)

**Sua tarefa**: Para cada cenário, qual temperatura você recomendaria?
1. Extrair datas de um contrato jurídico â†’ **0** (precisão importa, sem criatividade)
2. Escrever taglines de marketing â†’ **0.8-1.0** (criatividade desejada)
3. Responder perguntas FAQ de clientes â†’ **0.3** (consistente mas natural)
4. Gerar poesia â†’ **1.0+** (máxima criatividade)

### Tarefa 5: Entender grounding e janelas de contexto

**Grounding** conecta o modelo a dados reais para reduzir alucinações:

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

Esta abordagem (chamada **Retrieval-Augmented Generation / RAG**) é preferida porque:
- Reduz alucinações (modelo referencia dados reais)
- Fornece informações atualizadas (não limitado a dados de treinamento)
- Permite respostas verificáveis (você pode conferir com a fonte)

**Janela de contexto** â€” o total de tokens que um modelo pode lidar (entrada + saída):
| Modelo | Janela de Contexto |
|--------|-------------------|
| GPT-4o | 128.000 tokens |
| GPT-4 Turbo | 128.000 tokens |
| GPT-3.5-Turbo | 16.384 tokens |

:::tip Dica para o exame
Para o exame, lembre-se: system messages definem comportamento, exemplos few-shot mostram formato, grounding fornece precisão, e temperatura/top-p controlam criatividade. Essas são as alavancas fundamentais de engenharia de prompt.
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Engenharia de prompt | Projetar entradas eficazes para otimizar as saídas de modelos de IA generativa |
| System message | Instruções que definem o comportamento, persona e restrições da IA |
| Prompting few-shot | Fornecer exemplos no prompt para mostrar ao modelo o formato de saída esperado |
| Grounding | Fornecer dados fonte relevantes para que o modelo responda com base em fatos em vez de alucinar |
| Janela de contexto | O número máximo de tokens que um modelo pode processar (entrada + saída combinados) |
| RAG (Retrieval-Augmented Generation) | Padrão de recuperar documentos relevantes e incluí-los no prompt para respostas fundamentadas |

## Equívocos Comuns

| Equívoco | Realidade |
|----------|-----------|
| Prompts mais longos sempre produzem melhores resultados | Prompts concisos e claros com o contexto certo frequentemente superam os verbosos; comprimento desnecessário desperdiça tokens |
| Temperatura 0 significa que o modelo não vai errar | Temperatura 0 torna a saída determinística (mesma entrada â†’ mesma saída) mas não garante precisão factual |
| Exemplos few-shot ensinam o modelo permanentemente | Exemplos se aplicam apenas Ã  conversa atual; o modelo não retém aprendizado entre sessões |
| Você deve sempre usar a janela de contexto máxima | Incluir contexto irrelevante pode na verdade confundir o modelo; inclua apenas o necessário para responder Ã  pergunta |
| Engenharia de prompt é uma tarefa única | Prompts eficazes requerem testes iterativos e refinamento com base nas saídas reais |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-22-q1',
      question: 'Um desenvolvedor quer que um modelo de IA sempre responda em um formato JSON específico. Qual técnica de engenharia de prompt é mais eficaz?',
      options: ['Definir temperatura como 0', 'Fornecer exemplos few-shot mostrando o formato JSON exato esperado', 'Usar um modelo maior', 'Aumentar o parâmetro max tokens'],
      correctAnswer: 1,
      explanation: 'Exemplos few-shot mostrando o formato JSON exato esperado ensinam ao modelo qual estrutura produzir. Embora temperatura 0 ajude com consistência, exemplos few-shot são a técnica primária para especificação de formato.'
    },
    {
      id: 'ai900-22-q2',
      question: 'Qual é o propósito principal do grounding na engenharia de prompt?',
      options: ['Tornar respostas mais longas e detalhadas', 'Acelerar a geração de respostas', 'Aumentar a criatividade das respostas', 'Reduzir alucinações conectando o modelo a dados fonte reais'],
      correctAnswer: 3,
      explanation: 'Grounding fornece dados fonte relevantes e factuais no prompt para que o modelo responda com base em informações reais em vez de gerar conteúdo potencialmente incorreto dos seus dados de treinamento. Isso reduz alucinações.'
    },
    {
      id: 'ai900-22-q3',
      question: 'Uma aplicação precisa extrair pontos de dados específicos de faturas com alta precisão. Qual configuração de temperatura é mais apropriada?',
      options: ['Temperatura 0 (determinística)', 'Temperatura 0.7 (equilibrada)', 'Temperatura 1.0 (criativa)', 'Temperatura 2.0 (aleatoriedade máxima)'],
      correctAnswer: 0,
      explanation: 'Temperatura 0 produz saída determinística e focada â€” ideal para tarefas de extração de dados onde precisão e consistência importam mais que criatividade. Temperaturas mais altas introduzem aleatoriedade que poderia produzir extrações incorretas.'
    },
    {
      id: 'ai900-22-q4',
      question: 'O que é a janela de contexto em um modelo de IA generativa?',
      options: ['A interface visual onde você digita prompts', 'O limite de tempo para gerar uma resposta', 'O máximo total de tokens que o modelo pode processar (entrada + saída combinados)', 'O número de usuários que podem acessar o modelo simultaneamente'],
      correctAnswer: 2,
      explanation: 'A janela de contexto é o número máximo de tokens (prompt de entrada + completion de saída combinados) que um modelo pode lidar em uma única requisição. Por exemplo, GPT-4o tem uma janela de contexto de 128K tokens.'
    },
    {
      id: 'ai900-22-q5',
      question: 'O que é "prompting few-shot"?',
      options: ['Usar o modelo para apenas algumas requisições por dia', 'Fornecer exemplos no prompt para demonstrar o formato de saída esperado', 'Treinar o modelo com um conjunto de dados pequeno', 'Limitar a resposta a poucas frases'],
      correctAnswer: 1,
      explanation: 'Prompting few-shot significa incluir um ou mais exemplos (pares entrada-saída) no prompt para mostrar ao modelo qual formato e estilo de resposta você espera. Isso ajuda o modelo a entender seus requisitos sem nenhum treinamento.'
    }
  ]}
/>

## Saiba Mais

- [Técnicas de engenharia de prompt](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/prompt-engineering)
- [Framework de system message](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/system-message)
- [Introdução Ã  engenharia de prompt](https://learn.microsoft.com/en-us/training/modules/introduction-prompt-engineering-with-github-copilot/)
- [Melhores práticas para engenharia de prompt](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/prompt-engineering)
- [RAG com Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/use-your-data)
