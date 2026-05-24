---
sidebar_position: 3
title: "Desafio 21: Azure AI Foundry"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 21: Azure AI Foundry

:::info Tempo Estimado
**25-30 min** | **Custo**: Gratuito | **DomÃ­nio**: IA Generativa (15-20%)
:::

## Habilidades do exame abordadas

- Identificar recursos e capacidades do Azure AI Foundry
- Descrever o catÃ¡logo de modelos no Azure AI Foundry
- Identificar opÃ§Ãµes de implantaÃ§Ã£o do Azure AI Foundry

## VisÃ£o geral

O **Azure AI Foundry** (anteriormente Azure AI Studio) Ã© a plataforma unificada da Microsoft para construir, avaliar e implantar aplicaÃ§Ãµes de IA. Pense nele como a "loja Ãºnica" para desenvolvimento de IA generativa no Azure. Ele reÃºne acesso a modelos, engenharia de prompt, ferramentas de avaliaÃ§Ã£o e implantaÃ§Ã£o â€” tudo em um Ãºnico portal em [ai.azure.com](https://ai.azure.com).

A plataforma Ã© organizada em torno de **hubs** e **projetos**. Um **hub** Ã© um contÃªiner de nÃ­vel superior que gerencia recursos compartilhados como computaÃ§Ã£o, conexÃµes e configuraÃ§Ãµes de seguranÃ§a em toda a sua organizaÃ§Ã£o. Um **projeto** vive dentro de um hub e Ã© onde equipes individuais fazem seu trabalho de IA â€” selecionando modelos, testando prompts, construindo fluxos e implantando aplicaÃ§Ãµes. Essa hierarquia hub-projeto permite governanÃ§a empresarial enquanto dÃ¡ flexibilidade Ã s equipes.

Um recurso de destaque Ã© o **catÃ¡logo de modelos** â€” uma coleÃ§Ã£o curada de modelos de IA de mÃºltiplos provedores. AlÃ©m dos modelos GPT da OpenAI, vocÃª pode acessar modelos da Meta (Llama), Mistral, Microsoft (Phi), Cohere e outros. Isso permite que vocÃª compare e escolha o melhor modelo para seu caso de uso especÃ­fico, considerando fatores como desempenho, custo e licenciamento.

## Explorar

### Tarefa 1: Entender o modelo Hub + Projeto

O Azure AI Foundry usa uma estrutura hierÃ¡rquica para organizaÃ§Ã£o:

```text
Azure AI Foundry
â””â”€â”€ Hub (recursos compartilhados, seguranÃ§a, governanÃ§a)
    â”œâ”€â”€ Projeto A (equipe 1 - chatbot de clientes)
    â”‚   â”œâ”€â”€ ImplantaÃ§Ãµes de modelos
    â”‚   â”œâ”€â”€ Prompt flows
    â”‚   â””â”€â”€ AvaliaÃ§Ãµes
    â”œâ”€â”€ Projeto B (equipe 2 - processamento de documentos)
    â”‚   â”œâ”€â”€ ImplantaÃ§Ãµes de modelos
    â”‚   â”œâ”€â”€ Prompt flows
    â”‚   â””â”€â”€ AvaliaÃ§Ãµes
    â””â”€â”€ Recursos Compartilhados
        â”œâ”€â”€ InstÃ¢ncias de computaÃ§Ã£o
        â”œâ”€â”€ ConexÃµes (para fontes de dados, APIs)
        â””â”€â”€ ConfiguraÃ§Ãµes de seguranÃ§a
```

| Componente | PropÃ³sito | Analogia |
|-----------|-----------|----------|
| Hub | Infraestrutura compartilhada e governanÃ§a | Um prÃ©dio de escritÃ³rios |
| Projeto | EspaÃ§o de trabalho individual da equipe | O andar/sala de uma equipe |
| ImplantaÃ§Ã£o de modelo | Um modelo em execuÃ§Ã£o pronto para aceitar requisiÃ§Ãµes | Um balcÃ£o de atendimento |
| ConexÃ£o | Link para recursos externos (armazenamento, APIs) | Cabos de rede |

### Tarefa 2: Explore o catÃ¡logo de modelos

Navegue para: [ai.azure.com](https://ai.azure.com) â†’ **Model catalog**

O catÃ¡logo de modelos oferece modelos de mÃºltiplos provedores:

| Provedor | Modelos de Exemplo | Pontos Fortes |
|---------|-------------------|---------------|
| OpenAI | GPT-4o, GPT-4, GPT-3.5-Turbo, DALL-E | Uso geral, raciocÃ­nio forte |
| Meta | Llama 3.1, Llama 3 | CÃ³digo aberto, personalizÃ¡vel |
| Mistral | Mistral Large, Mistral Small | Eficiente, multilÃ­ngue |
| Microsoft | Phi-3, Phi-3.5 | Modelos pequenos, eficientes para tarefas especÃ­ficas |
| Cohere | Command R+ | Busca empresarial, cenÃ¡rios RAG |

**Recursos do catÃ¡logo de modelos**:
- **Model cards** â€” DescriÃ§Ã£o, capacidades, limitaÃ§Ãµes para cada modelo
- **Benchmarks** â€” ComparaÃ§Ãµes de desempenho entre tarefas
- **OpÃ§Ãµes de implantaÃ§Ã£o** â€” API serverless, computaÃ§Ã£o gerenciada ou auto-hospedado
- **InformaÃ§Ãµes de licenciamento** â€” Termos de cÃ³digo aberto vs. proprietÃ¡rio
- **Experimente** â€” Teste modelos diretamente no catÃ¡logo antes de implantar

### Tarefa 3: Entender opÃ§Ãµes de implantaÃ§Ã£o

O Azure AI Foundry oferece diferentes formas de implantar modelos:

| Tipo de ImplantaÃ§Ã£o | DescriÃ§Ã£o | Quando Usar |
|--------------------|-----------|-------------|
| **API Serverless (MaaS)** | Pague por token, sem gerenciamento de infraestrutura | InÃ­cio rÃ¡pido, cargas de trabalho variÃ¡veis |
| **ComputaÃ§Ã£o Gerenciada** | ComputaÃ§Ã£o dedicada com modelo hospedado para vocÃª | Cargas de trabalho previsÃ­veis, modelos personalizados |
| **ImplantaÃ§Ã£o Azure OpenAI** | Via recurso Azure OpenAI Service | Modelos OpenAI com recursos empresariais |

**API Serverless (Models as a Service)** Ã© especialmente notÃ¡vel:
- Sem necessidade de provisionar computaÃ§Ã£o
- Pague apenas pelos tokens consumidos
- Modelos da Meta, Mistral e outros disponÃ­veis dessa forma
- RÃ¡pido para configurar â€” obtenha um endpoint em minutos

### Tarefa 4: Explore prompt flow e avaliaÃ§Ã£o

O Azure AI Foundry inclui ferramentas para construir e avaliar aplicaÃ§Ãµes de IA:

**Prompt Flow** â€” Ferramenta visual para construir fluxos de trabalho de aplicaÃ§Ãµes LLM:
- Encadear mÃºltiplas chamadas LLM juntas
- Adicionar etapas de processamento de dados entre chamadas
- Incluir lÃ³gica de ramificaÃ§Ã£o
- Conectar a fontes de dados externas
- Testar e debugar fluxos visualmente

**AvaliaÃ§Ã£o** â€” Medir a qualidade de aplicaÃ§Ãµes de IA:
- **FundamentaÃ§Ã£o (Groundedness)** â€” As respostas sÃ£o baseadas nos dados fornecidos?
- **RelevÃ¢ncia** â€” As respostas respondem Ã  pergunta?
- **CoerÃªncia** â€” As respostas sÃ£o logicamente estruturadas?
- **FluÃªncia** â€” A linguagem Ã© natural?
- **SeguranÃ§a** â€” A saÃ­da evita conteÃºdo prejudicial?

**Sua tarefa**: Considere um chatbot de suporte ao cliente. Quais mÃ©tricas de avaliaÃ§Ã£o seriam mais importantes? (FundamentaÃ§Ã£o e relevÃ¢ncia â€” vocÃª quer respostas precisas baseadas em documentaÃ§Ã£o real, nÃ£o respostas alucinadas.)

:::tip Dica para o exame
Para o exame, lembre-se que o Azure AI Foundry Ã© a plataforma que reÃºne tudo â€” seleÃ§Ã£o de modelo, engenharia de prompt, avaliaÃ§Ã£o e implantaÃ§Ã£o. NÃ£o Ã© um modelo em si, mas o ambiente onde vocÃª trabalha com modelos.
:::

## Conceitos-Chave

| Conceito | DefiniÃ§Ã£o |
|----------|-----------|
| Azure AI Foundry | Plataforma unificada da Microsoft para construir, avaliar e implantar aplicaÃ§Ãµes de IA generativa |
| Hub | ContÃªiner de nÃ­vel superior para recursos compartilhados, computaÃ§Ã£o, conexÃµes e governanÃ§a de seguranÃ§a |
| Projeto | EspaÃ§o de trabalho de equipe dentro de um hub para construir soluÃ§Ãµes de IA |
| CatÃ¡logo de modelos | ColeÃ§Ã£o curada de modelos de IA de mÃºltiplos provedores (OpenAI, Meta, Mistral, Microsoft, etc.) |
| Prompt flow | Ferramenta visual para construir fluxos de trabalho multi-etapas de aplicaÃ§Ãµes LLM |
| Models as a Service (MaaS) | ImplantaÃ§Ã£o serverless pague-por-token que nÃ£o requer gerenciamento de infraestrutura |

## EquÃ­vocos Comuns

| EquÃ­voco | Realidade |
|----------|-----------|
| Azure AI Foundry sÃ³ oferece modelos da OpenAI | O catÃ¡logo de modelos inclui modelos da Meta, Mistral, Microsoft, Cohere e outros provedores |
| Azure AI Foundry substitui o Azure OpenAI Service | Eles trabalham juntos â€” Azure OpenAI Service fornece os modelos; AI Foundry Ã© a plataforma de desenvolvimento |
| VocÃª precisa de um hub para cada projeto | MÃºltiplos projetos compartilham um Ãºnico hub; o hub fornece governanÃ§a e recursos compartilhados |
| Todos os modelos no catÃ¡logo sÃ£o gratuitos | Os modelos tÃªm preÃ§os diferentes; alguns sÃ£o pague-por-token, outros requerem computaÃ§Ã£o dedicada |
| Prompt flow requer programaÃ§Ã£o | Prompt flow fornece uma interface visual de baixo cÃ³digo para construir fluxos de trabalho LLM (embora cÃ³digo possa ser adicionado) |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-21-q1',
      question: 'Qual Ã© o propÃ³sito do catÃ¡logo de modelos no Azure AI Foundry?',
      options: ['Armazenar apenas seus modelos treinados personalizados', 'Fornecer uma coleÃ§Ã£o curada de modelos de IA de mÃºltiplos provedores para comparar e implantar', 'Exibir informaÃ§Ãµes de preÃ§os para serviÃ§os Azure', 'Gerenciar assinaturas Azure'],
      correctAnswer: 1,
      explanation: 'O catÃ¡logo de modelos Ã© uma coleÃ§Ã£o curada de modelos de IA de mÃºltiplos provedores (OpenAI, Meta, Mistral, Microsoft, Cohere) que vocÃª pode comparar, testar e implantar. Ele ajuda vocÃª a escolher o melhor modelo para seu caso de uso.'
    },
    {
      id: 'ai900-21-q2',
      question: 'No Azure AI Foundry, qual Ã© a relaÃ§Ã£o entre um hub e um projeto?',
      options: ['SÃ£o a mesma coisa com nomes diferentes', 'Hubs sÃ£o para produÃ§Ã£o, projetos sÃ£o apenas para desenvolvimento', 'Um projeto contÃ©m mÃºltiplos hubs', 'Um hub contÃ©m mÃºltiplos projetos e fornece recursos compartilhados e governanÃ§a'],
      correctAnswer: 3,
      explanation: 'Um hub Ã© o contÃªiner de nÃ­vel superior que gerencia recursos compartilhados (computaÃ§Ã£o, conexÃµes, seguranÃ§a) em uma organizaÃ§Ã£o. Projetos vivem dentro de um hub e sÃ£o onde as equipes fazem seu trabalho individual de desenvolvimento de IA.'
    },
    {
      id: 'ai900-21-q3',
      question: 'Uma empresa quer testar rapidamente um modelo Meta Llama sem provisionar nenhuma infraestrutura de computaÃ§Ã£o. Qual opÃ§Ã£o de implantaÃ§Ã£o devem escolher?',
      options: ['ComputaÃ§Ã£o Gerenciada', 'ImplantaÃ§Ã£o auto-hospedada', 'API Serverless (Models as a Service)', 'Azure Virtual Machine'],
      correctAnswer: 2,
      explanation: 'API Serverless (Models as a Service) permite que vocÃª implante e use modelos sem provisionar infraestrutura de computaÃ§Ã£o. VocÃª paga por token consumido e pode ter um endpoint rodando em minutos â€” ideal para testes rÃ¡pidos e cargas de trabalho variÃ¡veis.'
    },
    {
      id: 'ai900-21-q4',
      question: 'O que a mÃ©trica de avaliaÃ§Ã£o "groundedness" mede no Azure AI Foundry?',
      options: ['Se as respostas sÃ£o baseadas em dados fonte fornecidos em vez de alucinadas', 'QuÃ£o rÃ¡pido o modelo responde', 'A correÃ§Ã£o gramatical das respostas', 'Quantos tokens a resposta usa'],
      correctAnswer: 0,
      explanation: 'Groundedness mede se as respostas da IA sÃ£o baseadas nos dados fonte/contexto fornecidos em vez de conter informaÃ§Ãµes alucinadas ou inventadas. Isso Ã© crÃ­tico para aplicaÃ§Ãµes empresariais onde a precisÃ£o importa.'
    },
    {
      id: 'ai900-21-q5',
      question: 'Qual afirmaÃ§Ã£o sobre o Azure AI Foundry estÃ¡ correta?',
      options: ['Ele sÃ³ suporta modelos GPT da OpenAI', 'Ã‰ uma plataforma unificada para construir, avaliar e implantar aplicaÃ§Ãµes de IA', 'Ele substitui todos os outros serviÃ§os Azure AI', 'Ele requer habilidades avanÃ§adas de programaÃ§Ã£o para usar'],
      correctAnswer: 1,
      explanation: 'Azure AI Foundry Ã© a plataforma unificada da Microsoft que reÃºne seleÃ§Ã£o de modelo (de mÃºltiplos provedores), engenharia de prompt, ferramentas de avaliaÃ§Ã£o e capacidades de implantaÃ§Ã£o â€” tudo em um ambiente em ai.azure.com.'
    }
  ]}
/>

## Saiba Mais

- [O que Ã© Azure AI Foundry?](https://learn.microsoft.com/en-us/azure/ai-studio/what-is-ai-studio)
- [CatÃ¡logo de modelos do Azure AI Foundry](https://learn.microsoft.com/en-us/azure/ai-studio/how-to/model-catalog-overview)
- [Prompt flow no Azure AI Foundry](https://learn.microsoft.com/en-us/azure/ai-studio/how-to/prompt-flow)
- [Portal Azure AI Foundry](https://ai.azure.com)
- [Avaliar apps de IA generativa](https://learn.microsoft.com/en-us/azure/ai-studio/concepts/evaluation-approach-gen-ai)
