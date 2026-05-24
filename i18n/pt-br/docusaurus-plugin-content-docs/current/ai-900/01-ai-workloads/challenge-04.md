---
sidebar_position: 4
title: "Desafio 04: Visão Geral dos Azure AI Services"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 04: Visão Geral dos Azure AI Services

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **Domínio**: Cargas de Trabalho de IA e IA Responsável (15-20%)
:::

## Habilidades do exame abordadas

- Mapear casos de uso para Azure AI services (Vision, Language, Speech, Decision, OpenAI)
- Descrever a diferença entre recursos multi-serviço e de serviço único
- Identificar camadas de preço e endpoints dos Azure AI services
- Entender chaves, endpoints e autenticação para Azure AI services

## Visão Geral

Azure AI services são APIs baseadas na nuvem que permitem a desenvolvedores adicionar capacidades de IA a aplicações sem construir modelos de machine learning do zero. Eles são pré-treinados, prontos para uso e acessados via APIs REST ou SDKs. Você não precisa ser um cientista de dados — basta chamar a API e receber resultados inteligentes de volta.

Pense nos Azure AI services como a cozinha de um restaurante. Você não precisa saber cozinhar (construir modelos de ML) — basta fazer o pedido pelo menu (chamar a API) e receber um prato pronto (resultado com IA). A cozinha (infraestrutura da Microsoft) cuida de toda a complexidade nos bastidores.

O Azure oferece duas formas de provisionar esses serviços: um **recurso multi-serviço** (um recurso para Vision, Language, Speech, etc. com uma única chave/endpoint) ou **recursos de serviço único** (recursos separados para cada serviço). A abordagem multi-serviço é mais simples para começar, enquanto recursos de serviço único permitem cobrança e controle de acesso granulares.

## Explorar

### Tarefa 1: Entender a taxonomia dos Azure AI services

| Categoria de serviço | Serviços incluídos | Exemplos de casos de uso |
|---------------------|-------------------|--------------------------|
| **Azure AI Vision** | Image Analysis, Custom Vision, Face | Descrever imagens, detectar objetos, ler texto em imagens |
| **Azure AI Language** | Text Analytics, QnA, CLU, Translator | Análise de sentimento, reconhecimento de entidades, tradução |
| **Azure AI Speech** | Speech-to-Text, Text-to-Speech, Translation | Transcrição, assistentes de voz, tradução em tempo real |
| **Azure AI Document Intelligence** | Modelos pré-construídos, Modelos customizados | Processamento de faturas, digitalização de recibos, extração de identidade |
| **Azure OpenAI Service** | GPT-4, DALL-E, Whisper, Embeddings | Geração de conteúdo, sumarização, assistência de código |
| **Azure AI Search** | Busca full-text, Busca vetorial, Enriquecimento de IA | Mineração de conhecimento, padrões RAG, busca empresarial |

### Tarefa 2: Criar um recurso multi-serviço (camada gratuita)

1. Abra [portal.azure.com](https://portal.azure.com)
2. Clique em **+ Criar um recurso**
3. Pesquise por **"Azure AI services"**
4. Selecione **Azure AI services** (a opção multi-serviço)
5. Configure:
   - **Assinatura**: Sua assinatura
   - **Grupo de recursos**: Criar novo → `rg-ai900-lab`
   - **Região**: Escolha uma próxima a você
   - **Nome**: `ai900-demo-[suasiniciais]`
   - **Camada de preço**: **Free F0**
6. Revise o aviso de IA Responsável — você deve reconhecê-lo
7. Clique em **Revisar + criar** → **Criar**

### Tarefa 3: Explorar chaves e endpoint

Após a implantação:

1. Vá para seu novo recurso de Azure AI services
2. Clique em **Chaves e Endpoint** no menu lateral esquerdo
3. Observe:
   - **Chave 1** e **Chave 2** — usadas para autenticação (duas chaves para rotação sem tempo de inatividade)
   - **Endpoint** — a URL que suas aplicações chamam (ex: `https://eastus.api.cognitive.microsoft.com/`)
   - **Localização/Região** — onde seu recurso está hospedado
4. Essas três informações (chave + endpoint + região) são o que as aplicações precisam para usar o serviço

### Tarefa 4: Recursos multi-serviço vs serviço único

| Característica | Recurso multi-serviço | Recurso de serviço único |
|---------------|----------------------|--------------------------|
| Cobrança | Conta única para todos os serviços | Conta separada por serviço |
| Chaves | Uma chave acessa todos os serviços | Chave única por serviço |
| Endpoint | Endpoint único | Endpoints separados |
| Controle de acesso | Mesmas permissões para todos | RBAC granular por serviço |
| Melhor para | Primeiros passos, prototipagem | Produção com controle de acesso rigoroso |

:::tip Alternativa via Azure CLI
```bash
# Create a multi-service Azure AI resource (Free tier)
az cognitiveservices account create \
  --name ai900-demo \
  --resource-group rg-ai900-lab \
  --kind AIServices \
  --sku F0 \
  --location eastus

# List keys
az cognitiveservices account keys list \
  --name ai900-demo \
  --resource-group rg-ai900-lab

# Show endpoint
az cognitiveservices account show \
  --name ai900-demo \
  --resource-group rg-ai900-lab \
  --query "properties.endpoint"
```
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Azure AI services | Modelos de IA pré-construídos acessíveis via APIs REST — nenhuma expertise em ML necessária |
| Recurso multi-serviço | Recurso único do Azure que fornece acesso a múltiplos serviços de IA com uma chave/endpoint |
| Recurso de serviço único | Recurso dedicado do Azure para um serviço de IA específico (ex: apenas Vision) |
| Chave de API | String secreta usada para autenticar requisições aos Azure AI services |
| Endpoint | URL que as aplicações chamam para acessar o serviço de IA |
| Camada gratuita (F0) | Camada de preço sem custo com transações limitadas por mês — ideal para aprendizado |
| Camada padrão (S0) | Preço por uso com limites maiores para cargas de trabalho de produção |
| Região | Localização do datacenter do Azure onde o serviço de IA está hospedado e processa dados |

## Conceitos Errôneos Comuns

| Conceito errôneo | Realidade |
|------------------|-----------|
| "Você precisa de expertise em machine learning para usar Azure AI services" | Azure AI services são APIs pré-treinadas. Você as chama com dados e obtém resultados — nenhum conhecimento de ML necessário |
| "Recursos multi-serviço e de serviço único têm capacidades diferentes" | As capacidades de IA são idênticas. A diferença é apenas na cobrança, controle de acesso e gerenciamento de recursos |
| "Azure OpenAI é o mesmo que a API pública da OpenAI" | Azure OpenAI executa modelos da OpenAI na infraestrutura do Azure com segurança empresarial, conformidade e residência regional de dados. Requer aprovação separada para acesso |
| "A camada gratuita é limitada a um curto período de teste" | A camada F0 (Free) não tem limite de tempo. Tem limites de transações por mês mas não expira |
| "Você precisa de duas chaves porque uma pode parar de funcionar" | Duas chaves existem para permitir rotação de chaves sem tempo de inatividade. Enquanto você regenera a Chave 1, as aplicações usam a Chave 2, e vice-versa |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-04-q1',
      question: 'Um desenvolvedor quer um único recurso do Azure que forneça acesso a serviços de IA de Vision, Language e Speech com um conjunto de credenciais. O que ele deve criar?',
      options: ['Três recursos de Azure AI separados', 'Um workspace do Azure Machine Learning', 'Um recurso do Azure OpenAI', 'Um recurso multi-serviço de Azure AI services'],
      correctAnswer: 3,
      explanation: 'Um recurso multi-serviço de Azure AI services fornece acesso a múltiplas capacidades de IA (Vision, Language, Speech, etc.) através de uma única chave e endpoint, simplificando o gerenciamento.'
    },
    {
      id: 'ai900-04-q2',
      question: 'Quais são as informações mínimas que uma aplicação precisa para chamar um Azure AI service?',
      options: ['ID da assinatura e nome do grupo de recursos', 'URL do endpoint e chave de API', 'Usuário e senha', 'Apenas string de conexão'],
      correctAnswer: 1,
      explanation: 'Para chamar um Azure AI service, uma aplicação precisa da URL do endpoint (para onde enviar as requisições) e uma chave de API (para autenticação). Essas informações são encontradas na seção "Chaves e Endpoint" do recurso.'
    },
    {
      id: 'ai900-04-q3',
      question: 'Por que o Azure fornece DUAS chaves para cada recurso de AI services?',
      options: ['Para permitir rotação de chaves sem interrupção do serviço', 'Uma chave é para leitura e outra para escrita', 'A segunda chave é um backup caso a primeira seja perdida', 'Cada chave tem níveis de permissão diferentes'],
      correctAnswer: 0,
      explanation: 'Duas chaves permitem rotação de chaves sem interrupção. Você pode regenerar a Chave 1 enquanto aplicações usam a Chave 2, depois migrar as aplicações para a nova Chave 1. Isso evita qualquer tempo de inatividade durante a rotação de segurança.'
    },
    {
      id: 'ai900-04-q4',
      question: 'Uma empresa precisa processar recibos e extrair automaticamente valores de compra, datas e nomes de estabelecimentos. Qual Azure AI service deve usar?',
      options: ['Azure AI Vision', 'Azure AI Language', 'Azure AI Document Intelligence', 'Azure AI Speech'],
      correctAnswer: 2,
      explanation: 'Azure AI Document Intelligence (anteriormente Form Recognizer) é especializado em extrair dados estruturados — campos específicos como valores, datas e nomes de estabelecimentos — de documentos como recibos e faturas.'
    },
    {
      id: 'ai900-04-q5',
      question: 'Qual é a principal vantagem de usar recursos de serviço único em vez de um recurso multi-serviço?',
      options: ['Melhor desempenho do modelo de IA', 'Menor custo por transação', 'Controle de acesso e cobrança granulares por serviço', 'Acesso a mais recursos de IA'],
      correctAnswer: 2,
      explanation: 'Recursos de serviço único permitem cobrança granular (rastrear custos por serviço) e controle de acesso (permissões diferentes para Vision vs Language). As capacidades de IA em si são idênticas independentemente do tipo de recurso.'
    }
  ]}
/>

## Saiba Mais

- [Microsoft Learn: Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/what-are-ai-services)
- [Criar um recurso multi-serviço](https://learn.microsoft.com/en-us/azure/ai-services/multi-service-resource)
- [Preços do Azure AI services](https://azure.microsoft.com/pricing/details/cognitive-services/)
- [Visão geral do Azure OpenAI Service](https://learn.microsoft.com/en-us/azure/ai-services/openai/overview)
