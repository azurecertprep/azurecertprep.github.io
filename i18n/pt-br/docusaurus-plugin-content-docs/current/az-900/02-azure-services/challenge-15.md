---
sidebar_position: 9
title: "Desafio 15: Opções de Migração de Dados"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 15: Opções de Migração de Dados

:::info Tempo Estimado
**15-25 min** | **Custo**: Gratuito | **Domínio**: Arquitetura e Serviços Azure (35-40%)
:::

## Habilidades do exame cobertas

- Identificar opções para mover arquivos (AzCopy, Storage Explorer, Azure File Sync)
- Descrever opções de migração (Azure Migrate, Azure Data Box)

## Visão Geral

Mover dados para o Azure pode ser feito de diversas maneiras, dependendo do volume de dados, largura de banda da rede e restrições de tempo. O Azure fornece ferramentas para transferências pequenas (AzCopy, Storage Explorer), migrações médias (Azure Migrate) e transferências offline massivas (Azure Data Box).

## Explorar

### Tarefa 1: Entender ferramentas de movimentação de dados

| Ferramenta | Melhor para | Como funciona |
|-----------|-------------|---------------|
| **AzCopy** | Arquivos/blobs via linha de comando | Utilitário CLI, transferências paralelas rápidas |
| **Azure Storage Explorer** | Arquivos/blobs via GUI | Aplicativo desktop com arrastar e soltar |
| **Azure File Sync** | Compartilhamentos de arquivos híbridos | Sincroniza servidor de arquivos on-prem com Azure Files |
| **Azure Migrate** | Migração completa de workloads | Avaliar e migrar VMs, bancos de dados, apps |
| **Azure Data Box** | Dados massivos (TBs-PBs) | Dispositivo físico enviado para você |

### Tarefa 2: Entender Azure Migrate

Azure Migrate é um hub para descobrir, avaliar e migrar:
- **Servidores** (VMs do VMware, Hyper-V, físicos)
- **Bancos de dados** (SQL Server → Azure SQL)
- **Aplicações web** (IIS → App Service)
- **Dados** (usando Data Box)

**Processo de migração:**
1. **Descobrir** — Encontrar workloads on-premises
2. **Avaliar** — Verificar prontidão e estimar custos
3. **Migrar** — Mover workloads para o Azure

### Tarefa 3: Entender Azure Data Box

Para transferências de dados muito grandes onde o upload pela rede levaria semanas ou meses:

| Variante do Data Box | Capacidade | Caso de uso |
|---------------------|-----------|-------------|
| **Data Box Disk** | Até 35 TB | Transferência offline pequena-média |
| **Data Box** | Até 80 TB | Transferência offline média |
| **Data Box Heavy** | Até 1 PB | Transferência offline grande |

**Como funciona:**
1. Solicite um Data Box pelo Azure Portal
2. A Microsoft envia o dispositivo para você
3. Copie seus dados para o dispositivo
4. Envie de volta para a Microsoft
5. A Microsoft faz upload dos dados para sua conta de armazenamento

### Tarefa 4: Explorar Azure Migrate no Portal

1. No Azure Portal, pesquise por **Azure Migrate**
2. Explore a página **Get started**
3. Observe os objetivos de migração:
   - Servidores, bancos de dados e aplicações web
   - Azure VMware Solution
4. Navegue por **Assessment tools** e **Migration tools**
5. Esta é uma ferramenta de descoberta/avaliação — somente leitura, sem custo

### Tarefa 5: AzCopy e Storage Explorer

**AzCopy** (linha de comando):
```bash
# Example: Copy a file to blob storage
# azcopy copy 'local-file.txt' 'https://account.blob.core.windows.net/container/file.txt?SAS-token'

# AzCopy is pre-installed in Azure Cloud Shell
azcopy --version
```

**Azure Storage Explorer** (GUI):
- Aplicativo desktop gratuito
- Conecte-se a contas de armazenamento visualmente
- Upload de arquivos com arrastar e soltar
- Gerencie blobs, files, queues, tables
- Download em: [azure.microsoft.com/products/storage/storage-explorer](https://azure.microsoft.com/products/storage/storage-explorer/)

:::tip Alternativa Azure CLI
```bash
# AzCopy version check (pre-installed in Cloud Shell)
azcopy --version

# List storage accounts for migration planning
az storage account list --query "[].{Name:name, Location:location}" --output table
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **AzCopy** | Ferramenta de linha de comando para transferência rápida de dados para/do Azure Storage |
| **Storage Explorer** | Ferramenta GUI para gerenciar Azure Storage visualmente |
| **Azure File Sync** | Mantém servidores de arquivos on-prem sincronizados com Azure Files |
| **Azure Migrate** | Avaliar e migrar servidores, bancos de dados e apps para o Azure |
| **Azure Data Box** | Dispositivo físico para transferência offline de dados massivos |
| **Lift-and-shift** | Mover workloads para o Azure com alterações mínimas |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-15-q1',
      question: 'Uma empresa tem 100 TB de dados para mover para o Azure, mas largura de banda de internet limitada. O que devem usar?',
      options: ['AzCopy', 'Azure Storage Explorer', 'Azure Data Box', 'Azure File Sync'],
      correctAnswer: 2,
      explanation: 'Azure Data Box é projetado para grandes transferências offline de dados. A Microsoft envia um dispositivo físico de armazenamento, você copia os dados nele e envia de volta. Suporta até 80 TB por dispositivo (ou Data Box Heavy para até 1 PB).'
    },
    {
      id: 'az900-15-q2',
      question: 'Qual ferramenta fornece uma GUI para upload de arquivos para Azure Blob Storage a partir de um computador desktop?',
      options: ['AzCopy', 'Azure Storage Explorer', 'Azure Migrate', 'Apenas o Azure Portal'],
      correctAnswer: 1,
      explanation: 'Azure Storage Explorer é um aplicativo desktop gratuito que fornece uma interface gráfica para gerenciar Azure Storage. Suporta upload de arquivos com arrastar e soltar e funciona no Windows, macOS e Linux.'
    },
    {
      id: 'az900-15-q3',
      question: 'Uma organização quer avaliar suas VMs on-premises quanto à prontidão para mover para o Azure. Qual serviço devem usar primeiro?',
      options: ['Azure Data Box', 'AzCopy', 'Azure Migrate', 'Azure File Sync'],
      correctAnswer: 2,
      explanation: 'Azure Migrate fornece ferramentas de descoberta e avaliação que analisam workloads on-premises, verificam prontidão para o Azure e estimam custos antes da migração.'
    },
    {
      id: 'az900-15-q4',
      question: 'Uma empresa quer manter seu servidor de arquivos on-premises, mas também ter arquivos disponíveis no Azure para aplicações baseadas em nuvem. Qual serviço permite isso?',
      options: ['AzCopy', 'Azure Data Box', 'Azure File Sync', 'Azure Migrate'],
      correctAnswer: 2,
      explanation: 'Azure File Sync sincroniza servidores de arquivos Windows on-premises com Azure Files. Os arquivos ficam acessíveis tanto localmente quanto na nuvem, com cloud tiering para liberar espaço em disco local.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure storage services](https://learn.microsoft.com/en-us/training/modules/describe-azure-storage-services/)
- [Azure Migrate documentation](https://learn.microsoft.com/en-us/azure/migrate/)
- [Azure Data Box documentation](https://learn.microsoft.com/en-us/azure/databox/)
