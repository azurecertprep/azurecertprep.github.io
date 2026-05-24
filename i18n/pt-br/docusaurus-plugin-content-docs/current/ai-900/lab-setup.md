---
sidebar_position: 3
title: "Configuração do Laboratório"
---

# Configuração do Laboratório

O AI-900 é um exame de fundamentos. Os desafios neste guia são baseados em exploração e projetados para custar **$0** usando recursos do nível gratuito do Azure. Nenhuma infraestrutura complexa ou serviço pago é necessário.

## O que você precisa

| Requisito | Detalhes |
|---|---|
| **Conta Azure** | O nível gratuito é suficiente — inclui $200 em créditos por 30 dias |
| **Navegador web** | Qualquer navegador moderno (Edge, Chrome, Firefox) |
| **Azure Cloud Shell** | Integrado ao Portal do Azure — nenhuma instalação local necessária |

## Passos de configuração

### 1. Criar uma conta gratuita do Azure

1. Acesse [https://azure.microsoft.com/free](https://azure.microsoft.com/free)
2. Clique em **Start free**
3. Entre com uma conta Microsoft (ou crie uma)
4. Complete o processo de verificação (telefone + cartão de crédito para identificação — você não será cobrado)
5. Você receberá **$200 em créditos** válidos por 30 dias, além de 12 meses de serviços no nível gratuito

### 2. Acessar o Portal do Azure

1. Navegue até [https://portal.azure.com](https://portal.azure.com)
2. Entre com sua conta Azure
3. Familiarize-se com a página inicial do portal e o menu de navegação

### 3. Explorar os Azure AI services no portal

1. Na barra de pesquisa do portal, digite **Azure AI services**
2. Navegue pelos serviços disponíveis: Vision, Language, Speech, OpenAI, Document Intelligence
3. Nota: Você não precisa criar nenhum recurso ainda — os desafios irão guiá-lo nesse processo

## Ferramentas usadas neste guia

| Ferramenta | Finalidade | Custo |
|---|---|---|
| **Azure Portal** | Interface principal para criar e gerenciar recursos | Gratuito |
| **Azure Cloud Shell** | CLI no navegador para executar comandos (Bash ou PowerShell) | Gratuito (armazenamento: insignificante) |
| **Azure AI Studio** | Interface web para explorar e testar modelos de IA | Nível gratuito disponível |
| **Azure Machine Learning Studio** | Interface web para experimentos e pipelines de ML | Nível gratuito de workspace |

## Solução de problemas

| Problema | Solução |
|---|---|
| "You don't have access to create resources" | Certifique-se de que está usando uma assinatura com a role de Owner ou Contributor |
| Azure Cloud Shell não inicia | Crie uma conta de armazenamento quando solicitado; selecione sua assinatura ativa |
| Azure AI services não aparecem no portal | Alguns serviços requerem registro — pesquise "Resource providers" nas configurações do portal e registre `Microsoft.CognitiveServices` |
| Cartão de crédito recusado durante o cadastro | Tente outro cartão; cartões virtuais/pré-pagos às vezes são rejeitados |
| Crédito de $200 expirou | Os serviços do nível gratuito permanecem disponíveis após os créditos expirarem; faça upgrade para Pay-As-You-Go (você ainda não será cobrado pelo uso do nível gratuito) |

## Pronto para começar?

Vá para o [Desafio 01: Visão Geral das Cargas de Trabalho de IA](/docs/ai-900/ai-workloads/challenge-01) para iniciar sua preparação para o AI-900.
