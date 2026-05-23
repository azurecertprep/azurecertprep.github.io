---
sidebar_position: 1
title: "Desafio 14: Análise de Texto: Frases-Chave e Entidades"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 14: Análise de Texto: Frases-Chave e Entidades

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Processamento de Linguagem Natural (15-20%)
:::

## Habilidades do exame abordadas

- Identificar recursos e usos para extração de frases-chave
- Identificar recursos e usos para reconhecimento de entidades
- Identificar capacidades do serviço Azure AI Language

## Visão geral

Análise de texto é o processo de extrair informações significativas de texto não estruturado. Duas capacidades fundamentais são **extração de frases-chave** e **reconhecimento de entidades nomeadas (NER)** — ambas disponíveis através do serviço Azure AI Language.

**Extração de frases-chave** identifica os principais pontos discutidos em um documento. Dado um parágrafo sobre uma avaliação de hotel, pode extrair "equipe simpática", "quartos limpos" e "ótima localização". Isso ajuda você a entender rapidamente sobre o que um documento trata sem ler o texto inteiro. Casos de uso comuns incluem sumarização de documentos, etiquetagem de conteúdo e indexação para busca.

**Reconhecimento de entidades nomeadas** identifica e categoriza entidades no texto — pessoas, lugares, organizações, datas, quantidades e mais. Por exemplo, na frase "A Microsoft foi fundada por Bill Gates em 1975 em Albuquerque", o NER identificaria "Microsoft" (organização), "Bill Gates" (pessoa), "1975" (data/hora) e "Albuquerque" (localização). Isso potencializa aplicações como extração automatizada de dados, classificação de conteúdo e construção de grafos de conhecimento.

## Explorar

### Tarefa 1: Entender a extração de frases-chave

A extração de frases-chave identifica os pontos mais importantes do texto. Revise estes exemplos:

| Texto de Entrada | Frases-Chave Extraídas |
|-----------------|----------------------|
| "A comida estava deliciosa e a equipe foi maravilhosa no restaurante perto da praia." | comida, equipe, restaurante, praia |
| "Os serviços de Azure AI fornecem modelos de machine learning pré-construídos para cenários comuns." | serviços de Azure AI, modelos de machine learning pré-construídos, cenários comuns |
| "O relatório de resultados trimestrais mostrou aumento de receita no mercado europeu." | relatório de resultados trimestrais, aumento de receita, mercado europeu |

**Sua tarefa**: Pense em um parágrafo do seu trabalho (um email, relatório ou documento). Quais frases-chave você esperaria que o serviço extraísse?

### Tarefa 2: Explore o reconhecimento de entidades nomeadas

Navegue até o demo do Azure AI Language Studio: [language.cognitive.azure.com](https://language.cognitive.azure.com/)

1. Selecione **Extract information** → **Named entity recognition**
2. Experimente o seguinte texto de exemplo:

> "Em 15 de janeiro de 2024, a Contoso Ltd. anunciou um investimento de US$ 2,5 bilhões em sua sede em Seattle. A CEO Jane Smith disse que a expansão criaria 5.000 novos empregos."

Categorias de entidades esperadas:

| Entidade | Categoria | Subcategoria |
|----------|----------|-------------|
| 15 de janeiro de 2024 | DateTime | Date |
| Contoso Ltd. | Organization | — |
| US$ 2,5 bilhões | Quantity | Currency |
| Seattle | Location | City |
| Jane Smith | Person | — |
| 5.000 | Quantity | Number |

### Tarefa 3: Compare frases-chave vs. entidades

Essas duas capacidades servem a propósitos diferentes:

| Capacidade | O que extrai | Melhor para |
|-----------|-------------|-------------|
| Extração de frases-chave | Conceitos e tópicos importantes | Entender sobre o que o texto trata |
| Reconhecimento de entidades | Coisas nomeadas específicas (pessoas, lugares, datas) | Extrair dados estruturados do texto |

**Sua tarefa**: Para a frase "O CEO da Microsoft, Satya Nadella, anunciou novos recursos de IA na conferência Build em Seattle em 21 de maio de 2024":
- Frases-chave seriam: CEO da Microsoft, Satya Nadella, novos recursos de IA, conferência Build, Seattle
- Entidades seriam: Microsoft (Org), Satya Nadella (Pessoa), Build (Evento), Seattle (Localização), 21 de maio de 2024 (DateTime)

### Tarefa 4: Explore as categorias de entidades

O Azure AI Language reconhece muitas categorias de entidades. Consulte a documentação:
[Categorias de entidades no Azure AI Language](https://learn.microsoft.com/en-us/azure/ai-services/language-service/named-entity-recognition/concepts/named-entity-categories)

Categorias principais incluem:
- **Person** — Nomes de pessoas
- **Location** — Localizações físicas, entidades geográficas
- **Organization** — Empresas, instituições, agências
- **DateTime** — Datas, horários, durações
- **Quantity** — Números, porcentagens, moedas
- **Event** — Eventos históricos ou nomeados
- **Product** — Produtos físicos ou digitais
- **Skill** — Capacidades ou áreas de expertise

:::tip Alternativa via Azure CLI
```bash
# Criar um recurso Azure AI Language (nível Free)
az cognitiveservices account create \
  --name my-language-resource \
  --resource-group myResourceGroup \
  --kind TextAnalytics \
  --sku F0 \
  --location eastus
```
:::

## Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Extração de frases-chave | Identifica os principais pontos e conceitos importantes no texto |
| Reconhecimento de entidades nomeadas (NER) | Detecta e categoriza entidades nomeadas (pessoas, lugares, organizações, datas) no texto |
| Categoria de entidade | O tipo de classificação atribuído a uma entidade detectada (Person, Location, etc.) |
| Vinculação de entidades | Conecta entidades reconhecidas a entradas de base de conhecimento conhecidas (ex.: Wikipédia) |
| Azure AI Language | O serviço do Azure que fornece capacidades de análise de texto incluindo NER e frases-chave |
| Detecção de PII | Uma capacidade relacionada ao NER que identifica especificamente informações pessoalmente identificáveis |

## Equívocos Comuns

| Equívoco | Realidade |
|----------|-----------|
| Frases-chave e entidades são a mesma coisa | Frases-chave capturam conceitos/tópicos importantes; entidades identificam coisas nomeadas específicas com categorias |
| NER só funciona em inglês | O Azure AI Language suporta NER em muitos idiomas incluindo espanhol, francês, alemão, chinês e mais |
| Você precisa treinar um modelo para NER básico | NER pré-construído funciona imediatamente; NER personalizado só é necessário para tipos de entidade específicos de domínio |
| Extração de frases-chave entende significado | Usa padrões estatísticos para identificar frases importantes — não "entende" verdadeiramente o contexto |
| Reconhecimento de entidades é 100% preciso | A precisão depende do contexto, idioma e domínio; texto ambíguo pode produzir categorizações incorretas |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'ai900-14-q1',
      question: 'Uma empresa quer etiquetar automaticamente tickets de suporte ao cliente com os principais tópicos discutidos. Qual capacidade de análise de texto é mais apropriada?',
      options: ['Reconhecimento de entidades nomeadas', 'Extração de frases-chave', 'Análise de sentimento', 'Detecção de idioma'],
      correctAnswer: 1,
      explanation: 'Extração de frases-chave identifica os principais pontos e tópicos no texto, tornando-a ideal para etiquetar automaticamente documentos com seus assuntos principais.'
    },
    {
      id: 'ai900-14-q2',
      question: 'Em qual categoria de entidade "Microsoft" seria classificada pelo reconhecimento de entidades nomeadas?',
      options: ['Person', 'Product', 'Organization', 'Skill'],
      correctAnswer: 2,
      explanation: 'Microsoft é uma empresa e seria categorizada como uma entidade Organization. Person é para nomes de pessoas, Product é para bens/serviços e Skill é para capacidades.'
    },
    {
      id: 'ai900-14-q3',
      question: 'Qual é a principal diferença entre extração de frases-chave e reconhecimento de entidades nomeadas?',
      options: ['Frases-chave identificam tópicos importantes enquanto NER identifica e categoriza coisas nomeadas específicas', 'Frases-chave funcionam apenas em inglês enquanto NER funciona em todos os idiomas', 'NER é mais rápido que extração de frases-chave', 'Extração de frases-chave requer treinamento enquanto NER não'],
      correctAnswer: 0,
      explanation: 'Extração de frases-chave identifica conceitos e tópicos importantes no texto, enquanto NER identifica entidades nomeadas específicas (pessoas, lugares, organizações, datas) e atribui categorias a elas.'
    },
    {
      id: 'ai900-14-q4',
      question: 'Um escritório de advocacia quer extrair automaticamente todos os nomes de pessoas, datas e valores monetários de contratos. Qual capacidade deve usar?',
      options: ['Extração de frases-chave', 'Sumarização de texto', 'Reconhecimento de entidades nomeadas', 'Detecção de idioma'],
      correctAnswer: 2,
      explanation: 'Reconhecimento de entidades nomeadas identifica e categoriza entidades específicas como nomes de Person, valores DateTime e quantidades Quantity/Currency — exatamente o que o escritório de advocacia precisa extrair dos contratos.'
    },
    {
      id: 'ai900-14-q5',
      question: 'Qual serviço do Azure fornece tanto extração de frases-chave quanto reconhecimento de entidades nomeadas como capacidades pré-construídas?',
      options: ['Azure Machine Learning', 'Azure OpenAI Service', 'Azure AI Vision', 'Azure AI Language'],
      correctAnswer: 3,
      explanation: 'O Azure AI Language (anteriormente Text Analytics) fornece capacidades de NLP pré-construídas incluindo extração de frases-chave, reconhecimento de entidades nomeadas, análise de sentimento e detecção de idioma.'
    }
  ]}
/>

## Saiba Mais

- [O que é Azure AI Language?](https://learn.microsoft.com/en-us/azure/ai-services/language-service/overview)
- [Visão geral da extração de frases-chave](https://learn.microsoft.com/en-us/azure/ai-services/language-service/key-phrase-extraction/overview)
- [Visão geral do reconhecimento de entidades nomeadas](https://learn.microsoft.com/en-us/azure/ai-services/language-service/named-entity-recognition/overview)
- [Azure AI Language Studio](https://language.cognitive.azure.com/)
