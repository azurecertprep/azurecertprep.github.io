---
sidebar_position: 2
title: "Desafio 20: Azure OpenAI Service"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 20: Azure OpenAI Service

:::info Tempo Estimado
**25-30 min** | **Custo**: Gratuito | **DomÃ­nio**: IA Generativa (15-20%)
:::

## Habilidades do exame abordadas

- Identificar recursos e capacidades do Azure OpenAI Service
- Descrever modelos do Azure OpenAI (GPT-4, GPT-3.5, DALL-E, Whisper)
- Identificar endpoints e implantaÃ§Ãµes do Azure OpenAI

## VisÃ£o geral

O **Azure OpenAI Service** fornece acesso aos poderosos modelos de linguagem da OpenAI (GPT-4, GPT-4o, GPT-3.5-Turbo), geraÃ§Ã£o de imagens (DALL-E) e transcriÃ§Ã£o de Ã¡udio (Whisper) atravÃ©s da plataforma de nuvem empresarial do Azure. Ele combina as capacidades de IA de ponta da OpenAI com os recursos de seguranÃ§a, conformidade, rede e IA responsÃ¡vel do Azure.

Diferente de usar a OpenAI diretamente, o Azure OpenAI fornece benefÃ­cios empresariais: seus dados permanecem dentro do perÃ­metro de conformidade do Azure, vocÃª obtÃ©m autenticaÃ§Ã£o via Azure Active Directory (Microsoft Entra ID), conectividade de rede privada, filtragem de conteÃºdo integrada e disponibilidade regional com garantias de SLA. Isso o torna adequado para cargas de trabalho de produÃ§Ã£o em indÃºstrias regulamentadas.

Para usar o Azure OpenAI, vocÃª primeiro cria um recurso Azure OpenAI, depois **implanta** modelos especÃ­ficos dentro dele. Cada implantaÃ§Ã£o recebe seu prÃ³prio endpoint que as aplicaÃ§Ãµes chamam. VocÃª pode ter mÃºltiplas implantaÃ§Ãµes (modelos diferentes ou o mesmo modelo com configuraÃ§Ãµes diferentes) dentro de um Ãºnico recurso. O **Azure OpenAI Studio** (agora parte do Azure AI Foundry) fornece um playground para testar prompts antes de integrÃ¡-los em aplicaÃ§Ãµes.

## Explorar

### Tarefa 1: Entender os modelos do Azure OpenAI

O Azure OpenAI oferece vÃ¡rias famÃ­lias de modelos para diferentes casos de uso:

| Modelo | Capacidades | Melhor Para |
|--------|------------|-------------|
| **GPT-4o** | Texto + visÃ£o, modelo mais rÃ¡pido da classe GPT-4 | Chat de uso geral, multimodal (texto + imagem) |
| **GPT-4** | RaciocÃ­nio avanÃ§ado, tarefas complexas | AnÃ¡lise complexa, escrita criativa, conteÃºdo longo |
| **GPT-4 Turbo** | Janela de contexto grande (128K tokens) | Processar documentos longos, instruÃ§Ãµes detalhadas |
| **GPT-3.5-Turbo** | GeraÃ§Ã£o de texto rÃ¡pida e econÃ´mica | Chat simples, geraÃ§Ã£o de conteÃºdo, classificaÃ§Ã£o |
| **DALL-E** | GeraÃ§Ã£o de imagens a partir de descriÃ§Ãµes textuais | Criar ilustraÃ§Ãµes, arte conceitual, mockups de design |
| **Whisper** | TranscriÃ§Ã£o de Ã¡udio (fala para texto) | TranscriÃ§Ã£o de reuniÃµes, geraÃ§Ã£o de legendas |
| **Modelos de Text Embedding** | Converter texto em representaÃ§Ãµes vetoriais | Busca semÃ¢ntica, similaridade de documentos |

### Tarefa 2: Explore o Playground do Azure OpenAI Studio

O **Playground do Azure OpenAI Studio** (acessÃ­vel em [oai.azure.com](https://oai.azure.com)) permite que vocÃª interaja com modelos implantados. Aqui estÃ¡ o que vocÃª veria:

**Interface do Chat Playground**:
```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ System message:                                          â”‚
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚ â”‚ You are a helpful AI assistant that provides         â”‚ â”‚
â”‚ â”‚ concise, accurate information.                       â”‚ â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                                          â”‚
â”‚ Parameters:              â”‚ Chat:                         â”‚
â”‚  Temperature: 0.7        â”‚  User: What is Azure?         â”‚
â”‚  Max tokens: 800         â”‚  AI: Azure is Microsoft's     â”‚
â”‚  Top-p: 0.95            â”‚      cloud computing           â”‚
â”‚  Deployment: gpt-4o     â”‚      platform...               â”‚
â”‚                          â”‚                               â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Componentes principais do playground**:
- **System message** â€” InstruÃ§Ãµes que definem o comportamento e persona da IA
- **Temperature** â€” Controla aleatoriedade (0-2, padrÃ£o ~0.7)
- **Max tokens** â€” Comprimento mÃ¡ximo da resposta
- **Top-p** â€” Controle alternativo de aleatoriedade (0-1)
- **Deployment** â€” Qual modelo implantado usar

### Tarefa 3: Entender implantaÃ§Ãµes e endpoints

O Azure OpenAI usa um modelo de implantaÃ§Ã£o para gerenciar o acesso:

```text
Azure OpenAI Resource (my-openai-resource)
â”œâ”€â”€ Deployment: "gpt4o-chat" (model: gpt-4o)
â”œâ”€â”€ Deployment: "gpt35-support" (model: gpt-3.5-turbo)
â””â”€â”€ Deployment: "dalle3-images" (model: dall-e-3)
```

**Conceitos-chave**:
- **Resource** â€” O recurso Azure que contÃ©m suas implantaÃ§Ãµes
- **Deployment** â€” Uma instÃ¢ncia de modelo especÃ­fica com seu prÃ³prio nome e endpoint
- **Endpoint** â€” A URL que as aplicaÃ§Ãµes chamam para acessar o modelo
- **API key / Microsoft Entra auth** â€” MÃ©todos de autenticaÃ§Ã£o para acessar implantaÃ§Ãµes

**Estrutura do endpoint**:
```text
https://{resource-name}.openai.azure.com/openai/deployments/{deployment-name}/chat/completions?api-version=2024-02-01
```

### Tarefa 4: Comparar Chat Completions vs. Completions

O Azure OpenAI fornece diferentes padrÃµes de API:

| API | Formato | Caso de Uso |
|-----|---------|-------------|
| **Chat Completions** | Array de mensagens (roles: system, user, assistant) | IA conversacional, maioria dos casos de uso modernos |
| **Completions** (legado) | Texto de prompt Ãºnico | Completar texto simples |
| **Embeddings** | Texto de entrada â†’ array vetorial | Busca, similaridade, agrupamento |
| **Images** (DALL-E) | DescriÃ§Ã£o textual â†’ imagem | GeraÃ§Ã£o de imagens |
| **Audio** (Whisper) | Arquivo de Ã¡udio â†’ texto | TranscriÃ§Ã£o |

**Formato de mensagens do Chat Completions** (o padrÃ£o mais comum):
```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is Azure?"},
    {"role": "assistant", "content": "Azure is Microsoft's cloud..."},
    {"role": "user", "content": "Tell me about pricing."}
  ]
}
```

Os **roles** sÃ£o:
- `system` â€” Define o comportamento/persona da IA (oculto do usuÃ¡rio)
- `user` â€” As mensagens do humano
- `assistant` â€” As respostas anteriores da IA (para contexto multi-turno)

:::tip Alternativa via Azure CLI
```bash
# Create an Azure OpenAI resource
az cognitiveservices account create \
  --name my-openai-resource \
  --resource-group myResourceGroup \
  --kind OpenAI \
  --sku S0 \
  --location eastus2

# List available models for deployment
az cognitiveservices account list-models \
  --name my-openai-resource \
  --resource-group myResourceGroup \
  --output table
```
:::

## Conceitos-Chave

| Conceito | DefiniÃ§Ã£o |
|----------|-----------|
| Azure OpenAI Service | Acesso hospedado no Azure a modelos da OpenAI com seguranÃ§a e conformidade empresarial |
| Deployment | Uma instÃ¢ncia de modelo especÃ­fica dentro de um recurso Azure OpenAI com seu prÃ³prio endpoint |
| System message | InstruÃ§Ãµes que definem o comportamento, persona e restriÃ§Ãµes do assistente de IA |
| Token | A unidade bÃ¡sica de processamento de texto (~Â¾ de uma palavra); determina custo e limites de contexto |
| Chat Completions API | O formato de API baseado em mensagens usando roles system/user/assistant |
| Filtragem de conteÃºdo | Recurso integrado do Azure OpenAI que bloqueia conteÃºdo prejudicial em entradas e saÃ­das |

## EquÃ­vocos Comuns

| EquÃ­voco | Realidade |
|----------|-----------|
| Azure OpenAI e a API da OpenAI sÃ£o idÃªnticos | Azure OpenAI adiciona recursos empresariais (conformidade, rede, filtros de conteÃºdo, autenticaÃ§Ã£o Entra ID) nÃ£o disponÃ­veis na API direta da OpenAI |
| VocÃª pode usar qualquer modelo imediatamente sem implantaÃ§Ã£o | VocÃª deve implantar um modelo antes de poder usÃ¡-lo â€” implantaÃ§Ãµes criam o endpoint que sua aplicaÃ§Ã£o chama |
| GPT-4 Ã© sempre melhor que GPT-3.5 para toda tarefa | GPT-3.5 Ã© mais rÃ¡pido e barato; para tarefas simples (classificaÃ§Ã£o, extraÃ§Ã£o) pode ser suficiente e mais econÃ´mico |
| Azure OpenAI armazena e treina com seus dados | Por padrÃ£o, Azure OpenAI NÃƒO usa seus dados para retreinar modelos; seus dados permanecem dentro do seu perÃ­metro de conformidade |
| DALL-E e GPT usam a mesma arquitetura de modelo | DALL-E usa modelos de difusÃ£o para geraÃ§Ã£o de imagens; GPT usa modelos transformer para texto â€” sÃ£o arquiteturas diferentes |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-20-q1',
      question: 'O que vocÃª deve criar antes que aplicaÃ§Ãµes possam acessar um modelo do Azure OpenAI?',
      options: ['Uma mÃ¡quina virtual', 'Uma implantaÃ§Ã£o de modelo dentro do recurso Azure OpenAI', 'Um conjunto de dados de treinamento personalizado', 'Uma assinatura Azure separada para IA'],
      correctAnswer: 1,
      explanation: 'Antes que aplicaÃ§Ãµes possam chamar um modelo do Azure OpenAI, vocÃª deve criar uma implantaÃ§Ã£o (deployment). Uma implantaÃ§Ã£o Ã© uma instÃ¢ncia de modelo especÃ­fica com seu prÃ³prio nome e URL de endpoint que aplicaÃ§Ãµes usam para enviar requisiÃ§Ãµes.'
    },
    {
      id: 'ai900-20-q2',
      question: 'Qual modelo do Azure OpenAI vocÃª usaria para gerar imagens a partir de descriÃ§Ãµes textuais?',
      options: ['GPT-4o', 'GPT-3.5-Turbo', 'DALL-E', 'Whisper'],
      correctAnswer: 2,
      explanation: 'DALL-E Ã© o modelo de geraÃ§Ã£o de imagens no Azure OpenAI. Ele cria imagens a partir de descriÃ§Ãµes textuais (prompts). Modelos GPT geram texto, e Whisper transcreve Ã¡udio.'
    },
    {
      id: 'ai900-20-q3',
      question: 'Qual Ã© o propÃ³sito da "system message" no Azure OpenAI Chat Completions?',
      options: ['Autenticar a requisiÃ§Ã£o de API', 'Definir a conta de cobranÃ§a para a requisiÃ§Ã£o', 'Especificar o nome da implantaÃ§Ã£o', 'Definir o comportamento, persona e restriÃ§Ãµes do assistente de IA'],
      correctAnswer: 3,
      explanation: 'A system message define o comportamento e persona da IA â€” por exemplo, "VocÃª Ã© um agente de atendimento ao cliente prestativo que sÃ³ discute nossos produtos." Ela fornece contexto e restriÃ§Ãµes para como o modelo deve responder.'
    },
    {
      id: 'ai900-20-q4',
      question: 'Qual Ã© um benefÃ­cio chave de usar o Azure OpenAI Service em vez da API direta da OpenAI?',
      options: ['Azure OpenAI fornece seguranÃ§a empresarial, conformidade e filtragem de conteÃºdo', 'Azure OpenAI Ã© sempre gratuito', 'Azure OpenAI oferece mais modelos que a OpenAI', 'Azure OpenAI gera respostas mais rÃ¡pidas'],
      correctAnswer: 0,
      explanation: 'Azure OpenAI fornece recursos empresariais incluindo certificaÃ§Ãµes de conformidade Azure, autenticaÃ§Ã£o Microsoft Entra ID, rede privada, filtragem de conteÃºdo integrada e residÃªncia de dados regional â€” tornando-o adequado para indÃºstrias regulamentadas.'
    },
    {
      id: 'ai900-20-q5',
      question: 'Qual modelo do Azure OpenAI Ã© mais adequado para transcrever uma reuniÃ£o gravada em texto?',
      options: ['GPT-4', 'DALL-E', 'Whisper', 'Text Embedding'],
      correctAnswer: 2,
      explanation: 'Whisper Ã© o modelo de transcriÃ§Ã£o de Ã¡udio no Azure OpenAI. Ele converte Ã¡udio de fala em texto (fala para texto), tornando-o ideal para transcrever reuniÃµes, entrevistas e outras gravaÃ§Ãµes.'
    }
  ]}
/>

## Saiba Mais

- [O que Ã© Azure OpenAI Service?](https://learn.microsoft.com/en-us/azure/ai-services/openai/overview)
- [Modelos do Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models)
- [Cotas e limites do Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/quotas-limits)
- [Azure OpenAI Studio](https://oai.azure.com)
- [ReferÃªncia da API Chat Completions](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference)
