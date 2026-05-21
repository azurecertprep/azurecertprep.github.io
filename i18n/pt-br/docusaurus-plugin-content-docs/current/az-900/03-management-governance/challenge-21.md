---
sidebar_position: 3
title: "Desafio 21: Azure Cloud Shell, CLI e PowerShell"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 21: Azure Cloud Shell, CLI e PowerShell

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **Domínio**: Management & Governance (30-35%)
:::

## Habilidades do exame cobertas

- Descrever o Azure Portal
- Descrever o Azure Cloud Shell (Azure CLI e Azure PowerShell)

## Visão Geral

O Azure fornece múltiplas formas de gerenciar recursos: o **Azure Portal** (GUI web), **Azure CLI** (linha de comando multiplataforma) e **Azure PowerShell** (módulos PowerShell para Azure). **Azure Cloud Shell** executa tanto CLI quanto PowerShell diretamente no seu navegador — sem necessidade de instalação local.

## Explorar

### Tarefa 1: Explorar o Azure Portal

1. Abra [portal.azure.com](https://portal.azure.com)
2. Familiarize-se com as áreas principais:
   - **Barra de pesquisa** (topo): Encontre qualquer serviço ou recurso
   - **Home**: Acesso rápido a recursos recentes
   - **All services**: Navegue por todos os serviços Azure por categoria
   - **Dashboard**: Visão personalizável do seu ambiente
   - **Favorites** (barra lateral esquerda): Fixe serviços usados frequentemente
3. Tente personalizar seu dashboard:
   - Clique em **+ New dashboard** ou **Edit**
   - Adicione tiles mostrando grupos de recursos, service health, etc.

### Tarefa 2: Abrir o Azure Cloud Shell

1. No Azure Portal, clique no ícone do **Cloud Shell** (parece `>_` na barra de ferramentas superior)
2. Se for a primeira vez: selecione **Bash** ou **PowerShell** (você pode trocar depois)
3. Se solicitado para armazenamento: clique em **Create storage** (usa uma storage account pequena e gratuita)
4. Agora você tem um terminal no seu navegador!

**Recursos do Cloud Shell:**
- Pré-instalado: Azure CLI, Azure PowerShell, Git, Python, Node.js, Terraform
- Persistente: 5 GB de armazenamento no diretório home
- Autenticado: Já conectado na sua conta Azure
- Gratuito: Sem cobranças adicionais

### Tarefa 3: Experimentar comandos Azure CLI

Mude para **Bash** no Cloud Shell, então execute:

```bash
# See which account you're logged into
az account show --output table

# List all resource groups
az group list --output table

# List available Azure regions (first 10)
az account list-locations --query "[0:10].{Name:displayName, Geo:metadata.geographyGroup}" --output table

# Get help for any command
az vm --help
```

**Padrão Azure CLI:** `az <service> <action> --parameters`
- `az vm create` — criar uma VM
- `az group list` — listar grupos de recursos
- `az storage account show` — mostrar detalhes de armazenamento

### Tarefa 4: Experimentar comandos Azure PowerShell

Mude para **PowerShell** no Cloud Shell, então execute:

```powershell
# See which account you're logged into
Get-AzContext

# List all resource groups
Get-AzResourceGroup | Format-Table

# List available VM sizes (first 10)
Get-AzVMSize -Location "eastus" | Select-Object -First 10

# Get help
Get-Help New-AzVM
```

**Padrão Azure PowerShell:** `Verb-AzNoun -Parameters`
- `New-AzVM` — criar uma VM
- `Get-AzResourceGroup` — listar grupos de recursos
- `Remove-AzStorageAccount` — excluir armazenamento

### Tarefa 5: Comparar ferramentas de gerenciamento

| Ferramenta | Melhor para | Disponível em |
|-----------|------------|--------------|
| **Azure Portal** | Gerenciamento visual, exploração, tarefas pontuais | Qualquer navegador |
| **Azure CLI** | Scripts (Bash), automação multiplataforma | Windows, macOS, Linux, Cloud Shell |
| **Azure PowerShell** | Scripts (PowerShell), automação Windows | Windows, macOS, Linux, Cloud Shell |
| **Azure Cloud Shell** | Comandos rápidos sem configuração local | Qualquer navegador |
| **Azure Mobile App** | Monitoramento em movimento | iOS, Android |
| **REST API** | Integrações personalizadas, SDKs | Qualquer linguagem |

**Quando usar o quê:**
- Aprendendo/explorando → **Portal**
- Tarefas repetitivas → **CLI ou PowerShell** (scriptável)
- Pipelines CI/CD → **CLI** (multiplataforma)
- Admin Windows familiarizado com PowerShell → **Azure PowerShell**

:::tip Experimente agora!
Abra o Cloud Shell e execute: `az interactive` para uma experiência CLI aprimorada com auto-complete e documentação inline.
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **Azure Portal** | GUI baseada em web para gerenciar recursos Azure |
| **Azure CLI** | Ferramenta de linha de comando multiplataforma (comandos `az`) |
| **Azure PowerShell** | Módulo PowerShell para Azure (comandos `Verb-AzNoun`) |
| **Azure Cloud Shell** | Terminal no navegador com CLI + PowerShell pré-instalados |
| **Infrastructure as Code** | Gerenciar infraestrutura através de scripts/templates (repetível) |
| **Idempotent** | Executar o mesmo comando duas vezes produz o mesmo resultado |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-21-q1',
      question: 'O que é o Azure Cloud Shell?',
      options: ['Um aplicativo para download para gerenciar o Azure', 'Um terminal no navegador com ferramentas Azure pré-instaladas', 'Uma máquina virtual executando na sua assinatura', 'Um app mobile para gerenciamento Azure'],
      correctAnswer: 1,
      explanation: 'Azure Cloud Shell é um terminal baseado em navegador acessível pelo Azure Portal. Ele vem com Azure CLI, Azure PowerShell e outras ferramentas pré-instaladas, e já está autenticado na sua conta.'
    },
    {
      id: 'az900-21-q2',
      question: 'Qual ferramenta de gerenciamento Azure é melhor para tarefas que precisam ser repetidas automaticamente através de scripts?',
      options: ['Azure Portal', 'Azure CLI ou Azure PowerShell', 'Azure Mobile App', 'Azure Advisor'],
      correctAnswer: 1,
      explanation: 'Azure CLI e Azure PowerShell são ferramentas de linha de comando scriptáveis, ideais para automação e tarefas repetíveis. O Portal é melhor para tarefas pontuais e exploração.'
    },
    {
      id: 'az900-21-q3',
      question: 'Qual é uma vantagem principal do Azure Portal sobre ferramentas CLI?',
      options: ['É mais rápido', 'Fornece uma interface visual para exploração e descoberta', 'Suporta automação', 'Pode ser usado offline'],
      correctAnswer: 1,
      explanation: 'O Azure Portal fornece uma interface gráfica que facilita explorar serviços, descobrir opções e entender relações entre recursos — ideal para aprendizado e tarefas pontuais de gerenciamento.'
    },
    {
      id: 'az900-21-q4',
      question: 'O Azure Cloud Shell requer qual dos seguintes itens para persistir arquivos entre sessões?',
      options: ['Uma máquina virtual', 'Uma Azure Storage account', 'Uma assinatura premium', 'Uma instalação local'],
      correctAnswer: 1,
      explanation: 'O Cloud Shell usa uma pequena Azure Storage account (compartilhamento Azure Files) para persistir seu diretório home entre sessões. Isso é criado automaticamente no primeiro uso.'
    },
    {
      id: 'az900-21-q5',
      question: 'O padrão de comandos Azure CLI segue qual formato?',
      options: ['Verb-AzNoun', 'az <service> <action> --parameters', 'New-AzResource', 'azure.service.action()'],
      correctAnswer: 1,
      explanation: 'Azure CLI usa o padrão: az <service> <action> --parameters. Por exemplo: az vm create --name myVM --resource-group myRG. Azure PowerShell usa o padrão Verb-AzNoun.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe features and tools for managing and deploying Azure resources](https://learn.microsoft.com/en-us/training/modules/describe-features-tools-manage-deploy-azure-resources/)
- [Azure CLI documentation](https://learn.microsoft.com/en-us/cli/azure/)
- [Azure PowerShell documentation](https://learn.microsoft.com/en-us/powershell/azure/)
