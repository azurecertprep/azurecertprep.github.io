---
sidebar_position: 3
title: "Desafio 21: Azure AI Foundry"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 21: Azure AI Foundry

:::info Tempo Estimado
**25-30 min** | **Custo**: Gratuito | **Domínio**: IA Generativa (15-20%)
:::

## Habilidades do exame abordadas

- Identificar recursos e capacidades do Azure AI Foundry
- Descrever o catálogo de modelos no Azure AI Foundry
- Identificar opções de implantação do Azure AI Foundry

## Visão geral

O **Azure AI Foundry** (anteriormente Azure AI Studio) é a plataforma unificada da Microsoft para construir, avaliar e implantar aplicações de IA. Pense nele como a "loja única" para desenvolvimento de IA generativa no Azure. Ele reúne acesso a modelos, engenharia de prompt, ferramentas de avaliação e implantação — tudo em um único portal em [ai.azure.com](https://ai.azure.com).

A plataforma é organizada em torno de **hubs** e **projetos**. Um **hub** é um contêiner de nível superior que gerencia recursos compartilhados como computação, conexões e configurações de segurança em toda a sua organização. Um **projeto** vive dentro de um hub e é onde equipes individuais fazem seu trabalho de IA — selecionando modelos, testando prompts, construindo fluxos e implantando aplicações. Essa hierarquia hub-projeto permite governança empresarial enquanto dá flexibilidade às equipes.

Um recurso de destaque é o **catálogo de modelos** — uma coleção curada de modelos de IA de múltiplos provedores. Além dos modelos GPT da OpenAI, você pode acessar modelos da Meta (Llama), Mistral, Microsoft (Phi), Cohere e outros. Isso permite que você compare e escolha o melhor modelo para seu caso de uso específico, considerando fatores como desempenho, custo e licenciamento.

## Explorar

### Tarefa 1: Entender o modelo Hub + Projeto

O Azure AI Foundry usa uma estrutura hierárquica para organização:

```text
Azure AI Foundry
└── Hub (recursos compartilhados, segurança, governança)
    ├── Projeto A (equipe 1 - chatbot de clientes)
    │   ├── Implantações de modelos
    │   ├── Prompt flows
    │   └── Avaliações
    ├── Projeto B (equipe 2 - processamento de documentos)
    │   ├── Implantações de modelos
    │   ├── Prompt flows
    │   └── Avaliações
    └── Recursos Compartilhados
        ├── Instâncias de computação
        ├── Conexões (para fontes de dados, APIs)
        └── Configurações de segurança
```

| Componente | Propósito | Analogia |
|-----------|-----------|----------|
| Hub | Infraestrutura compartilhada e governança | Um prédio de escritórios |
| Projeto | Espaço de trabalho individual da equipe | O andar/sala de uma equipe |
| Implantação de modelo | Um modelo em execução pronto para aceitar requisições | Um balcão de atendimento |
| Conexão | Link para recursos externos (armazenamento, APIs) | Cabos de rede |

### Tarefa 2: Explore o catálogo de modelos

Navegue para: [ai.azure.com](https://ai.azure.com) → **Model catalog**

O catálogo de modelos oferece modelos de múltiplos provedores:

| Provedor | Modelos de Exemplo | Pontos Fortes |
|---------|-------------------|---------------|
| OpenAI | GPT-4o, GPT-4, GPT-3.5-Turbo, DALL-E | Uso geral, raciocínio forte |
| Meta | Llama 3.1, Llama 3 | Código aberto, personalizável |
| Mistral | Mistral Large, Mistral Small | Eficiente, multilíngue |
| Microsoft | Phi-3, Phi-3.5 | Modelos pequenos, eficientes para tarefas específicas |
| Cohere | Command R+ | Busca empresarial, cenários RAG |

**Recursos do catálogo de modelos**:
- **Model cards** — Descrição, capacidades, limitações para cada modelo
- **Benchmarks** — Comparações de desempenho entre tarefas
- **Opções de implantação** — API serverless, computação gerenciada ou auto-hospedado
- **Informações de licenciamento** — Termos de código aberto vs. proprietário
- **Experimente** — Teste modelos diretamente no catálogo antes de implantar

### Tarefa 3: Entender opções de implantação

O Azure AI Foundry oferece diferentes formas de implantar modelos:

| Tipo de Implantação | Descrição | Quando Usar |
|--------------------|-----------|-------------|
| **API Serverless (MaaS)** | Pague por token, sem gerenciamento de infraestrutura | Início rápido, cargas de trabalho variáveis |
| **Computação Gerenciada** | Computação dedicada com modelo hospedado para você | Cargas de trabalho previsíveis, modelos personalizados |
| **Implantação Azure OpenAI** | Via recurso Azure OpenAI Service | Modelos OpenAI com recursos empresariais |

**API Serverless (Models as a Service)** é especialmente notável:
- Sem necessidade de provisionar computação
- Pague apenas pelos tokens consumidos
- Modelos da Meta, Mistral e outros disponíveis dessa forma
- Rápido para configurar — obtenha um endpoint em minutos

### Tarefa 4: Explore prompt flow e avaliação

O Azure AI Foundry inclui ferramentas para construir e avaliar aplicações de IA:

**Prompt Flow** — Ferramenta visual para construir fluxos de trabalho de aplicações LLM:
- Encadear múltiplas chamadas LLM juntas
- Adicionar etapas de processamento de dados entre chamadas
- Incluir lógica de ramificação
- Conectar a fontes de dados externas
- Testar e debugar fluxos visualmente

**Avaliação** — Medir a qualidade de aplicações de IA:
- **Fundamentação (Groundedness)** — As respostas são baseadas nos dados fornecidos?
- **Relevância** — As respostas respondem à pergunta?
- **Coerência** — As respostas são logicamente estruturadas?
- **Fluência** — A linguagem é natural?
- **Segurança** — A saída evita conteúdo prejudicial?

**Sua tarefa**: Considere um chatbot de suporte ao cliente. Quais métricas de avaliação seriam mais importantes? (Fundamentação e relevância — você quer respostas precisas baseadas em documentação real, não respostas alucinadas.)

:::tip Dica para o exame
Para o exame, lembre-se que o Azure AI Foundry é a plataforma que reúne tudo — seleção de modelo, engenharia de prompt, avaliação e implantação. Não é um modelo em si, mas o ambiente onde você trabalha com modelos.
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Azure AI Foundry | Plataforma unificada da Microsoft para construir, avaliar e implantar aplicações de IA generativa |
| Hub | Contêiner de nível superior para recursos compartilhados, computação, conexões e governança de segurança |
| Projeto | Espaço de trabalho de equipe dentro de um hub para construir soluções de IA |
| Catálogo de modelos | Coleção curada de modelos de IA de múltiplos provedores (OpenAI, Meta, Mistral, Microsoft, etc.) |
| Prompt flow | Ferramenta visual para construir fluxos de trabalho multi-etapas de aplicações LLM |
| Models as a Service (MaaS) | Implantação serverless pague-por-token que não requer gerenciamento de infraestrutura |

## Equívocos Comuns

| Equívoco | Realidade |
|----------|-----------|
| Azure AI Foundry só oferece modelos da OpenAI | O catálogo de modelos inclui modelos da Meta, Mistral, Microsoft, Cohere e outros provedores |
| Azure AI Foundry substitui o Azure OpenAI Service | Eles trabalham juntos — Azure OpenAI Service fornece os modelos; AI Foundry é a plataforma de desenvolvimento |
| Você precisa de um hub para cada projeto | Múltiplos projetos compartilham um único hub; o hub fornece governança e recursos compartilhados |
| Todos os modelos no catálogo são gratuitos | Os modelos têm preços diferentes; alguns são pague-por-token, outros requerem computação dedicada |
| Prompt flow requer programação | Prompt flow fornece uma interface visual de baixo código para construir fluxos de trabalho LLM (embora código possa ser adicionado) |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-21-q1',
      question: 'Qual é o propósito do catálogo de modelos no Azure AI Foundry?',
      options: ['Armazenar apenas seus modelos treinados personalizados', 'Fornecer uma coleção curada de modelos de IA de múltiplos provedores para comparar e implantar', 'Exibir informações de preços para serviços Azure', 'Gerenciar assinaturas Azure'],
      correctAnswer: 1,
      explanation: 'O catálogo de modelos é uma coleção curada de modelos de IA de múltiplos provedores (OpenAI, Meta, Mistral, Microsoft, Cohere) que você pode comparar, testar e implantar. Ele ajuda você a escolher o melhor modelo para seu caso de uso.'
    },
    {
      id: 'ai900-21-q2',
      question: 'No Azure AI Foundry, qual é a relação entre um hub e um projeto?',
      options: ['São a mesma coisa com nomes diferentes', 'Hubs são para produção, projetos são apenas para desenvolvimento', 'Um projeto contém múltiplos hubs', 'Um hub contém múltiplos projetos e fornece recursos compartilhados e governança'],
      correctAnswer: 3,
      explanation: 'Um hub é o contêiner de nível superior que gerencia recursos compartilhados (computação, conexões, segurança) em uma organização. Projetos vivem dentro de um hub e são onde as equipes fazem seu trabalho individual de desenvolvimento de IA.'
    },
    {
      id: 'ai900-21-q3',
      question: 'Uma empresa quer testar rapidamente um modelo Meta Llama sem provisionar nenhuma infraestrutura de computação. Qual opção de implantação devem escolher?',
      options: ['Computação Gerenciada', 'Implantação auto-hospedada', 'API Serverless (Models as a Service)', 'Azure Virtual Machine'],
      correctAnswer: 2,
      explanation: 'API Serverless (Models as a Service) permite que você implante e use modelos sem provisionar infraestrutura de computação. Você paga por token consumido e pode ter um endpoint rodando em minutos — ideal para testes rápidos e cargas de trabalho variáveis.'
    },
    {
      id: 'ai900-21-q4',
      question: 'O que a métrica de avaliação "groundedness" mede no Azure AI Foundry?',
      options: ['Se as respostas são baseadas em dados fonte fornecidos em vez de alucinadas', 'Quão rápido o modelo responde', 'A correção gramatical das respostas', 'Quantos tokens a resposta usa'],
      correctAnswer: 0,
      explanation: 'Groundedness mede se as respostas da IA são baseadas nos dados fonte/contexto fornecidos em vez de conter informações alucinadas ou inventadas. Isso é crítico para aplicações empresariais onde a precisão importa.'
    },
    {
      id: 'ai900-21-q5',
      question: 'Qual afirmação sobre o Azure AI Foundry está correta?',
      options: ['Ele só suporta modelos GPT da OpenAI', 'É uma plataforma unificada para construir, avaliar e implantar aplicações de IA', 'Ele substitui todos os outros serviços Azure AI', 'Ele requer habilidades avançadas de programação para usar'],
      correctAnswer: 1,
      explanation: 'Azure AI Foundry é a plataforma unificada da Microsoft que reúne seleção de modelo (de múltiplos provedores), engenharia de prompt, ferramentas de avaliação e capacidades de implantação — tudo em um ambiente em ai.azure.com.'
    }
  ]}
/>

## Saiba Mais

- [O que é Azure AI Foundry?](https://learn.microsoft.com/en-us/azure/ai-studio/what-is-ai-studio)
- [Catálogo de modelos do Azure AI Foundry](https://learn.microsoft.com/en-us/azure/ai-studio/how-to/model-catalog-overview)
- [Prompt flow no Azure AI Foundry](https://learn.microsoft.com/en-us/azure/ai-studio/how-to/prompt-flow)
- [Portal Azure AI Foundry](https://ai.azure.com)
- [Avaliar apps de IA generativa](https://learn.microsoft.com/en-us/azure/ai-studio/concepts/evaluation-approach-gen-ai)
