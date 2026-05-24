---
sidebar_position: 2
title: "Desafio 20: Azure OpenAI Service"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 20: Azure OpenAI Service

:::info Tempo Estimado
**25-30 min** | **Custo**: Gratuito | **Domínio**: IA Generativa (15-20%)
:::

## Habilidades do exame abordadas

- Identificar recursos e capacidades do Azure OpenAI Service
- Descrever modelos do Azure OpenAI (GPT-4, GPT-3.5, DALL-E, Whisper)
- Identificar endpoints e implantações do Azure OpenAI

## Visão geral

O **Azure OpenAI Service** fornece acesso aos poderosos modelos de linguagem da OpenAI (GPT-4, GPT-4o, GPT-3.5-Turbo), geração de imagens (DALL-E) e transcrição de áudio (Whisper) através da plataforma de nuvem empresarial do Azure. Ele combina as capacidades de IA de ponta da OpenAI com os recursos de segurança, conformidade, rede e IA responsável do Azure.

Diferente de usar a OpenAI diretamente, o Azure OpenAI fornece benefícios empresariais: seus dados permanecem dentro do perímetro de conformidade do Azure, você obtém autenticação via Azure Active Directory (Microsoft Entra ID), conectividade de rede privada, filtragem de conteúdo integrada e disponibilidade regional com garantias de SLA. Isso o torna adequado para cargas de trabalho de produção em indústrias regulamentadas.

Para usar o Azure OpenAI, você primeiro cria um recurso Azure OpenAI, depois **implanta** modelos específicos dentro dele. Cada implantação recebe seu próprio endpoint que as aplicações chamam. Você pode ter múltiplas implantações (modelos diferentes ou o mesmo modelo com configurações diferentes) dentro de um único recurso. O **Azure OpenAI Studio** (agora parte do Azure AI Foundry) fornece um playground para testar prompts antes de integrá-los em aplicações.

## Explorar

### Tarefa 1: Entender os modelos do Azure OpenAI

O Azure OpenAI oferece várias famílias de modelos para diferentes casos de uso:

| Modelo | Capacidades | Melhor Para |
|--------|------------|-------------|
| **GPT-4o** | Texto + visão, modelo mais rápido da classe GPT-4 | Chat de uso geral, multimodal (texto + imagem) |
| **GPT-4** | Raciocínio avançado, tarefas complexas | Análise complexa, escrita criativa, conteúdo longo |
| **GPT-4 Turbo** | Janela de contexto grande (128K tokens) | Processar documentos longos, instruções detalhadas |
| **GPT-3.5-Turbo** | Geração de texto rápida e econômica | Chat simples, geração de conteúdo, classificação |
| **DALL-E** | Geração de imagens a partir de descrições textuais | Criar ilustrações, arte conceitual, mockups de design |
| **Whisper** | Transcrição de áudio (fala para texto) | Transcrição de reuniões, geração de legendas |
| **Modelos de Text Embedding** | Converter texto em representações vetoriais | Busca semântica, similaridade de documentos |

### Tarefa 2: Explore o Playground do Azure OpenAI Studio

O **Playground do Azure OpenAI Studio** (acessível em [oai.azure.com](https://oai.azure.com)) permite que você interaja com modelos implantados. Aqui está o que você veria:

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
- **System message** â€” Instruções que definem o comportamento e persona da IA
- **Temperature** â€” Controla aleatoriedade (0-2, padrão ~0.7)
- **Max tokens** â€” Comprimento máximo da resposta
- **Top-p** â€” Controle alternativo de aleatoriedade (0-1)
- **Deployment** â€” Qual modelo implantado usar

### Tarefa 3: Entender implantações e endpoints

O Azure OpenAI usa um modelo de implantação para gerenciar o acesso:

```text
Azure OpenAI Resource (my-openai-resource)
â”œâ”€â”€ Deployment: "gpt4o-chat" (model: gpt-4o)
â”œâ”€â”€ Deployment: "gpt35-support" (model: gpt-3.5-turbo)
â””â”€â”€ Deployment: "dalle3-images" (model: dall-e-3)
```

**Conceitos-chave**:
- **Resource** â€” O recurso Azure que contém suas implantações
- **Deployment** â€” Uma instância de modelo específica com seu próprio nome e endpoint
- **Endpoint** â€” A URL que as aplicações chamam para acessar o modelo
- **API key / Microsoft Entra auth** â€” Métodos de autenticação para acessar implantações

**Estrutura do endpoint**:
```text
https://{resource-name}.openai.azure.com/openai/deployments/{deployment-name}/chat/completions?api-version=2024-02-01
```

### Tarefa 4: Comparar Chat Completions vs. Completions

O Azure OpenAI fornece diferentes padrões de API:

| API | Formato | Caso de Uso |
|-----|---------|-------------|
| **Chat Completions** | Array de mensagens (roles: system, user, assistant) | IA conversacional, maioria dos casos de uso modernos |
| **Completions** (legado) | Texto de prompt único | Completar texto simples |
| **Embeddings** | Texto de entrada â†’ array vetorial | Busca, similaridade, agrupamento |
| **Images** (DALL-E) | Descrição textual â†’ imagem | Geração de imagens |
| **Audio** (Whisper) | Arquivo de áudio â†’ texto | Transcrição |

**Formato de mensagens do Chat Completions** (o padrão mais comum):
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

Os **roles** são:
- `system` â€” Define o comportamento/persona da IA (oculto do usuário)
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

| Conceito | Definição |
|----------|-----------|
| Azure OpenAI Service | Acesso hospedado no Azure a modelos da OpenAI com segurança e conformidade empresarial |
| Deployment | Uma instância de modelo específica dentro de um recurso Azure OpenAI com seu próprio endpoint |
| System message | Instruções que definem o comportamento, persona e restrições do assistente de IA |
| Token | A unidade básica de processamento de texto (~Â¾ de uma palavra); determina custo e limites de contexto |
| Chat Completions API | O formato de API baseado em mensagens usando roles system/user/assistant |
| Filtragem de conteúdo | Recurso integrado do Azure OpenAI que bloqueia conteúdo prejudicial em entradas e saídas |

## Equívocos Comuns

| Equívoco | Realidade |
|----------|-----------|
| Azure OpenAI e a API da OpenAI são idênticos | Azure OpenAI adiciona recursos empresariais (conformidade, rede, filtros de conteúdo, autenticação Entra ID) não disponíveis na API direta da OpenAI |
| Você pode usar qualquer modelo imediatamente sem implantação | Você deve implantar um modelo antes de poder usá-lo â€” implantações criam o endpoint que sua aplicação chama |
| GPT-4 é sempre melhor que GPT-3.5 para toda tarefa | GPT-3.5 é mais rápido e barato; para tarefas simples (classificação, extração) pode ser suficiente e mais econômico |
| Azure OpenAI armazena e treina com seus dados | Por padrão, Azure OpenAI NÃƒO usa seus dados para retreinar modelos; seus dados permanecem dentro do seu perímetro de conformidade |
| DALL-E e GPT usam a mesma arquitetura de modelo | DALL-E usa modelos de difusão para geração de imagens; GPT usa modelos transformer para texto â€” são arquiteturas diferentes |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-20-q1',
      question: 'O que você deve criar antes que aplicações possam acessar um modelo do Azure OpenAI?',
      options: ['Uma máquina virtual', 'Uma implantação de modelo dentro do recurso Azure OpenAI', 'Um conjunto de dados de treinamento personalizado', 'Uma assinatura Azure separada para IA'],
      correctAnswer: 1,
      explanation: 'Antes que aplicações possam chamar um modelo do Azure OpenAI, você deve criar uma implantação (deployment). Uma implantação é uma instância de modelo específica com seu próprio nome e URL de endpoint que aplicações usam para enviar requisições.'
    },
    {
      id: 'ai900-20-q2',
      question: 'Qual modelo do Azure OpenAI você usaria para gerar imagens a partir de descrições textuais?',
      options: ['GPT-4o', 'GPT-3.5-Turbo', 'DALL-E', 'Whisper'],
      correctAnswer: 2,
      explanation: 'DALL-E é o modelo de geração de imagens no Azure OpenAI. Ele cria imagens a partir de descrições textuais (prompts). Modelos GPT geram texto, e Whisper transcreve áudio.'
    },
    {
      id: 'ai900-20-q3',
      question: 'Qual é o propósito da "system message" no Azure OpenAI Chat Completions?',
      options: ['Autenticar a requisição de API', 'Definir a conta de cobrança para a requisição', 'Especificar o nome da implantação', 'Definir o comportamento, persona e restrições do assistente de IA'],
      correctAnswer: 3,
      explanation: 'A system message define o comportamento e persona da IA â€” por exemplo, "Você é um agente de atendimento ao cliente prestativo que só discute nossos produtos." Ela fornece contexto e restrições para como o modelo deve responder.'
    },
    {
      id: 'ai900-20-q4',
      question: 'Qual é um benefício chave de usar o Azure OpenAI Service em vez da API direta da OpenAI?',
      options: ['Azure OpenAI fornece segurança empresarial, conformidade e filtragem de conteúdo', 'Azure OpenAI é sempre gratuito', 'Azure OpenAI oferece mais modelos que a OpenAI', 'Azure OpenAI gera respostas mais rápidas'],
      correctAnswer: 0,
      explanation: 'Azure OpenAI fornece recursos empresariais incluindo certificações de conformidade Azure, autenticação Microsoft Entra ID, rede privada, filtragem de conteúdo integrada e residência de dados regional â€” tornando-o adequado para indústrias regulamentadas.'
    },
    {
      id: 'ai900-20-q5',
      question: 'Qual modelo do Azure OpenAI é mais adequado para transcrever uma reunião gravada em texto?',
      options: ['GPT-4', 'DALL-E', 'Whisper', 'Text Embedding'],
      correctAnswer: 2,
      explanation: 'Whisper é o modelo de transcrição de áudio no Azure OpenAI. Ele converte áudio de fala em texto (fala para texto), tornando-o ideal para transcrever reuniões, entrevistas e outras gravações.'
    }
  ]}
/>

## Saiba Mais

- [O que é Azure OpenAI Service?](https://learn.microsoft.com/en-us/azure/ai-services/openai/overview)
- [Modelos do Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models)
- [Cotas e limites do Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/quotas-limits)
- [Azure OpenAI Studio](https://oai.azure.com)
- [Referência da API Chat Completions](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference)
