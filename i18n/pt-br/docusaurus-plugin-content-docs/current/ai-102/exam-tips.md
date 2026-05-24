---
sidebar_position: 4
title: "Dicas e Estratégia para o Exame"
---

# Dicas e Estratégia para o Exame

O AI-102 é um exame supervisionado que testa sua capacidade de escrever código integrando serviços Azure AI. Conhecer a mecânica do exame é tão importante quanto conhecer os SDKs.

## Formato do Exame

| Detalhe | Valor |
|--------|-------|
| **Número de questões** | ~40–60 questões |
| **Duração** | 100–120 minutos |
| **Nota de aprovação** | 700 de 1000 |
| **Custo** | $165 USD |
| **Tipos de questão** | Múltipla escolha, múltipla resposta, arrastar e soltar, hot area, estudo de caso |
| **Penalidade por resposta errada** | Nenhuma — sempre responda todas as questões |
| **Pode voltar?** | Sim, dentro de uma seção. Não, entre seções. |

:::warning O Exame se Encerra em 30 de Junho de 2026
Este exame se encerra em **30 de junho de 2026**. Planeje seu cronograma de preparação de acordo. A Microsoft pode substituí-lo por uma nova certificação alinhada ao Azure AI Foundry e padrões de IA agêntica.
:::

## Estratégia de Estudo

### Semanas 1–2: Planejar e Gerenciar + IA Generativa (Desafios 01–20)
Esses domínios cobrem **35–45%** do exame. IA Generativa teve seu peso **aumentado para 15–20%** — esta é a seção de crescimento mais rápido. Foque em Azure OpenAI, padrões RAG e prompt engineering.

### Semanas 3–4: Visão Computacional + NLP (Desafios 24–39)
Estes são fortemente focados em SDK. Conheça os padrões exatos de inicialização de client, chamadas de API e parsing de resposta para serviços de Vision, Language e Speech.

### Semana 5: Agentes + Knowledge Mining (Desafios 21–23, 40–48)
Skillsets do AI Search, skills customizados e Document Intelligence são ricos em detalhes. Arquitetura de agentes é nova (5–10%) mas direta.

### Semana 6: Revisão + Prática
- Faça a [Avaliação Prática Gratuita](https://learn.microsoft.com/en-us/credentials/certifications/exams/ai-102/practice/assessment?assessment-type=practice&assessmentId=61)
- Revise a [Matriz de Cobertura](/docs/ai-102/coverage-matrix) — alguma lacuna?
- Refaça os cenários de Break & Fix de cada desafio

## Áreas de Foco Principais

### IA Generativa (Peso Crescente)
O exame aumentou a cobertura de IA Generativa. Conheça profundamente:
- **Arquitetura RAG**: embeddings → busca vetorial → construção do prompt → completion
- **Modelos de deployment do Azure OpenAI**: GPT-4o, GPT-4o-mini, text-embedding-ada-002
- **Filtragem de conteúdo**: configurando filtros de entrada/saída, níveis de severidade
- **Roles de mensagem system/user/assistant** e quando usar cada um
- **Gerenciamento de tokens**: contagem de tokens, gerenciamento de janelas de contexto, estratégias de chunking

### Padrões SDK vs REST
O exame testa ambas as abordagens. Saiba quando cada uma é apropriada:
- **SDK**: Aplicações de produção, segurança de tipos, lógica de retry embutida
- **REST**: Prototipagem rápida, independente de linguagem, entender o que os SDKs fazem por baixo

### Padrões de Autenticação
```python
# Baseado em chave (simples, para desenvolvimento)
from azure.core.credentials import AzureKeyCredential
client = SomeClient(endpoint, AzureKeyCredential(key))

# Baseado em identidade (produção, recomendado)
from azure.identity import DefaultAzureCredential
client = SomeClient(endpoint, DefaultAzureCredential())
```

## Armadilhas Comuns de Mudança de Nome

:::warning Rebranding de Serviços — Estes VÃO aparecer no exame

| Nome Antigo | Nome Novo | Notas |
|----------|----------|-------|
| Cognitive Services | **Azure AI services** | Nome guarda-chuva mudou |
| Form Recognizer | **Document Intelligence** | Rebrand completo |
| LUIS | **CLU (Conversational Language Understanding)** | Migrado para Azure AI Language |
| QnA Maker | **Custom Question Answering** | Agora parte do Azure AI Language |
| Anomaly Detector | **Descontinuado** (Azure AI Metrics Advisor) | Ainda pode aparecer em questões antigas |
| Azure Cognitive Search | **Azure AI Search** | Nome + funcionalidades atualizados |
| Azure OpenAI Studio | **Azure AI Foundry** | Portal renomeado |

Se você vir um nome antigo em uma questão, mapeie mentalmente para o novo serviço.
:::

## Conhecimento sobre Azure OpenAI

Conceitos-chave que o exame testa:
- **Deployment vs Modelo**: Você faz o deploy de um modelo para obter um endpoint. O mesmo modelo pode ter múltiplos deployments.
- **Limites de tokens**: GPT-4o suporta 128K tokens de entrada. Conheça os limites aproximados para cada família de modelo.
- **Filtragem de conteúdo**: Filtros padrão estão ATIVADOS. Saiba como personalizar limites de severidade.
- **IA Responsável**: Quando usar filtragem de conteúdo, detecção de fundamentação, monitoramento de abuso
- **Function calling**: Como definir tools e lidar com tool_calls na resposta

## Gerenciamento de Tempo

| Seção | Tempo Sugerido |
|---------|---------------|
| Primeira passagem por todas as questões | 60–70 minutos |
| Revisão de questões marcadas | 20–25 minutos |
| Estudos de caso (se presentes) | 20–25 minutos |
| Reserva | 5–10 minutos |

**Dica**: Não gaste mais de 2 minutos em qualquer questão na primeira passagem. Marque e siga em frente.

## Checklist do Dia do Exame

- [ ] Documento com foto pronto (passaporte ou documento emitido pelo governo)
- [ ] Teste seu computador e conexão com a internet (para proctoring online)
- [ ] Limpe sua mesa — nada permitido exceto monitor, teclado, mouse
- [ ] Feche todas as aplicações exceto o navegador do exame
- [ ] Tenha água por perto (permitido para exames online)
- [ ] Revise o [Guia Rápido](/docs/ai-102/cheat-sheet) uma última vez (não durante o exame!)
- [ ] Chegue 15 minutos antes para o check-in

## Links Úteis

| Recurso | Link |
|----------|------|
| **Experimente a interface do exame** | [Exam Sandbox](https://aka.ms/examdemo) |
| **Questões de prática gratuitas** | [Practice Assessment](https://learn.microsoft.com/en-us/credentials/certifications/exams/ai-102/practice/assessment?assessment-type=practice&assessmentId=61) |
| **Agendar o exame** | [Pearson VUE](https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-engineer/) |
| **Guia de estudo oficial** | [AI-102 Study Guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-102) |
| **Oferta Exam Replay** | [Exam Deals](https://learn.microsoft.com/en-us/credentials/certifications/deals) |

## Depois de Passar 🎉

- Sua certificação aparece no seu [perfil Microsoft Learn](https://learn.microsoft.com/en-us/users/) em até 24 horas
- Você recebe um **badge digital** via Credly para compartilhar no LinkedIn
- A certificação é **válida por 1 ano** — renove gratuitamente passando em uma avaliação online
- Considere seu próximo passo: [AI-050](https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-engineer/) (Azure AI Foundry), [AZ-305](https://learn.microsoft.com/en-us/credentials/certifications/azure-solutions-architect/) (Architect), ou especializar-se com engenharia de dados

---

**Pronto para começar a estudar?** Vá para o [Desafio 01](/docs/ai-102/plan-manage/challenge-01).
