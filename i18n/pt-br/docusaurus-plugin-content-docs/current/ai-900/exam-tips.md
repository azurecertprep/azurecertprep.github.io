---
sidebar_position: 4
title: "Dicas e Estratégias para o Exame"
---

# Dicas e Estratégias para o Exame

## Formato do exame

| Detalhe | Valor |
|---|---|
| **Duração** | 45 minutos |
| **Questões** | ~40–60 questões |
| **Nota de aprovação** | 700 / 1000 |
| **Custo** | $99 USD |
| **Formato** | Múltipla escolha, seleção múltipla, arrastar e soltar, estudos de caso |
| **Pré-requisitos** | Nenhum |
| **Renovação** | Necessária anualmente (avaliação online gratuita) |

## Estratégias principais

### 1. Foque no domínio de maior peso

**Domínio 2: Princípios fundamentais de ML no Azure (20–25%)** tem o maior peso. Certifique-se de que você consegue:
- Distinguir regressão, classificação e clustering
- Explicar o ciclo de vida do ML (dados → treinar → validar → implantar → inferência)
- Identificar quando usar Azure Machine Learning vs. serviços de IA pré-construídos

### 2. Domine o padrão "Qual serviço de IA?"

Muitas questões seguem este formato: *"Uma empresa quer [fazer X]. Qual serviço do Azure deve ser usado?"*

Construa uma árvore de decisão mental:
- **Extrair texto de imagens** → Azure AI Vision (OCR)
- **Analisar sentimento em avaliações** → Azure AI Language
- **Converter fala em texto** → Azure AI Speech
- **Construir um chatbot** → Azure AI Language (CLU) + Azure Bot Service
- **Gerar texto ou código** → Azure OpenAI Service
- **Detectar anomalias em dados** → Azure AI Anomaly Detector (agora parte do AI services)

### 3. Conheça os 6 princípios de IA Responsável

Eles aparecem frequentemente. Memorize todos os seis:
1. **Equidade (Fairness)** — A IA deve tratar todas as pessoas de forma equitativa
2. **Confiabilidade e Segurança (Reliability & Safety)** — A IA deve funcionar de forma confiável e segura
3. **Privacidade e Segurança (Privacy & Security)** — A IA deve ser segura e respeitar a privacidade
4. **Inclusão (Inclusiveness)** — A IA deve capacitar todos e engajar as pessoas
5. **Transparência (Transparency)** — A IA deve ser compreensível
6. **Responsabilização (Accountability)** — Pessoas devem ser responsáveis pelos sistemas de IA

### 4. Domine os tipos de ML

| Tipo | O que faz | Exemplo |
|---|---|---|
| **Supervisionado – Regressão** | Prevê um número contínuo | Prever preço de imóvel |
| **Supervisionado – Classificação** | Prevê uma categoria/rótulo | Spam ou não spam |
| **Não supervisionado – Clustering** | Agrupa itens similares (sem rótulos) | Segmentação de clientes |
| **Aprendizado por reforço** | Aprende por recompensa/penalidade | IA que joga jogos |

## Armadilhas comuns

| Armadilha | Realidade |
|---|---|
| "Azure Cognitive Services" em uma resposta | **Renomeado** para **Azure AI services** — mas ainda pode aparecer em enunciados de questões antigas |
| "Form Recognizer" em uma resposta | **Renomeado** para **Azure AI Document Intelligence** |
| "LUIS" (Language Understanding) | **Substituído** por **CLU (Conversational Language Understanding)** no Azure AI Language |
| Confundir regressão e classificação | Regressão = números, Classificação = categorias |
| Confundir classificação e clustering | Classificação = dados rotulados (supervisionado), Clustering = dados não rotulados (não supervisionado) |
| "IA Responsável" vs. princípios específicos | Saiba qual princípio se aplica a um cenário (ex.: "garantir que um modelo de empréstimo não discrimine" = Equidade) |

## Checklist para o dia do exame

- [ ] Documento de identidade com foto válido emitido pelo governo
- [ ] Conexão de internet estável (para proctoring online) ou chegue 15 min antes (centro de testes)
- [ ] Espaço de trabalho limpo — sem papéis, celulares ou monitores adicionais (proctoring online)
- [ ] Teste de sistema concluído em [https://www.pearsonvue.com/microsoft](https://www.pearsonvue.com/microsoft)
- [ ] Credenciais de login do perfil Microsoft Learn em mãos
- [ ] Garrafa de água e ida ao banheiro antes (não há pausas durante o exame)

## Gerenciamento de tempo

Com ~45 minutos para ~40–60 questões, você tem aproximadamente **45–60 segundos por questão**.

- **Primeira passada (30 min):** Responda tudo que você sabe imediatamente. Marque qualquer questão incerta.
- **Segunda passada (15 min):** Retorne às questões marcadas. Elimine as respostas obviamente erradas primeiro.
- **Nunca deixe em branco:** Não há penalidade por chutar. Elimine 1–2 opções e escolha seu melhor palpite.
- **Estudos de caso:** Leia o cenário uma vez com atenção, depois responda todas as questões relacionadas. Não releia para cada sub-questão.

:::tip
Se uma questão menciona uma tecnologia que você nunca ouviu falar, provavelmente é um distrator. Exames de Azure AI raramente testam ferramentas obscuras de terceiros.
:::
