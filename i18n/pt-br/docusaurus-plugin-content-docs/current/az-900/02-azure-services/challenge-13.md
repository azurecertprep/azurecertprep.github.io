---
sidebar_position: 7
title: "Desafio 13: Contas de Armazenamento e Tipos Azure"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 13: Contas de Armazenamento e Tipos Azure

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **Domínio**: Arquitetura e Serviços Azure (35-40%)
:::

## Habilidades do exame cobertas

- Comparar serviços de armazenamento Azure (Blob, File, Queue, Table)
- Descrever opções de conta de armazenamento e tipos de armazenamento

## Visão Geral

Azure Storage é uma solução de armazenamento em nuvem para cenários modernos de armazenamento de dados. Uma **conta de armazenamento** é o contêiner de nível superior que fornece um namespace exclusivo para seus dados. Dentro de uma conta de armazenamento, você pode usar quatro serviços diferentes: Blob, File, Queue e Table.

Cada serviço atende a uma necessidade diferente de armazenamento — desde dados binários não estruturados (blobs) até dados NoSQL semiestruturados (tables).

## Explorar

### Tarefa 1: Entender os serviços de armazenamento

| Serviço | Tipo de dados | Caso de uso | Equivalente on-prem |
|---------|--------------|-------------|---------------------|
| **Blob Storage** | Não estruturado (arquivos, imagens, vídeos) | Arquivos de mídia, backups, data lakes | Servidor de arquivos / NAS |
| **Azure Files** | Compartilhamentos de arquivos (SMB/NFS) | Drives compartilhados, lift-and-shift | Servidor de arquivos com compartilhamentos SMB |
| **Queue Storage** | Mensagens (até 64 KB cada) | Comunicação assíncrona entre apps | Fila de mensagens (MSMQ) |
| **Table Storage** | Dados NoSQL chave-valor | Dados de configuração, logs | Banco de dados simples |

### Tarefa 2: Explorar criação de conta de armazenamento

1. No Azure Portal, pesquise por **Storage accounts**
2. Clique em **+ Create**
3. Explore as opções:
   - **Performance**: Standard (HDD) ou Premium (SSD)
   - **Redundancy**: LRS, ZRS, GRS, RA-GRS (coberto no Desafio 14)
   - **Account kind**: StorageV2 (recomendado)
4. Clique em **Cancel** — não crie

### Tarefa 3: Entender tipos de Blob Storage

Blob Storage possui três tipos de blobs:

| Tipo de blob | Descrição | Caso de uso |
|-------------|-----------|-------------|
| **Block blobs** | Objetos grandes (até 190,7 TB) | Arquivos, imagens, vídeos, backups |
| **Append blobs** | Otimizado para operações de adição | Arquivos de log, dados de streaming |
| **Page blobs** | Leitura/escrita aleatória (até 8 TB) | Discos de VM (VHDs) |

**Blob containers** organizam blobs dentro de uma conta de armazenamento:
```text
Storage Account: mystorageaccount
├── Container: images
│   ├── photo1.jpg
│   └── photo2.png
├── Container: backups
│   └── db-backup-2024.bak
└── Container: logs
    └── app-log-01.txt
```

### Tarefa 4: Entender Azure Files

Azure Files fornece compartilhamentos de arquivos totalmente gerenciados:
- Acessível via **SMB** (Windows/Linux/macOS) ou **NFS** (Linux)
- Pode ser montado como uma unidade de rede
- Compatível com fluxos de trabalho de compartilhamento de arquivos on-premises
- Suporta Azure File Sync (armazena em cache arquivos acessados frequentemente on-premises)

**Cenário principal**: Substituir um servidor de arquivos on-premises com Azure Files — mesma experiência do usuário, menos hardware.

### Tarefa 5: Nomenclatura de conta de armazenamento

Nomes de contas de armazenamento devem ser:
- **3-24 caracteres** de comprimento
- **Apenas letras minúsculas e números** (sem traços, underscores ou maiúsculas)
- **Globalmente únicos** em todo o Azure

Por que globalmente únicos? Porque o nome da conta de armazenamento se torna parte da URL:
- `https://mystorageaccount.blob.core.windows.net`
- `https://mystorageaccount.file.core.windows.net`

:::tip Alternativa Azure CLI
```bash
# Check if a storage account name is available
az storage account check-name --name mystorageaz900test --output table

# List existing storage accounts (if any)
az storage account list --query "[].{Name:name, Location:location, Kind:kind}" --output table
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **Storage account** | Contêiner de nível superior; fornece namespace exclusivo |
| **Blob Storage** | Armazenamento de objetos para dados não estruturados |
| **Azure Files** | Compartilhamentos de arquivos gerenciados (SMB/NFS) |
| **Queue Storage** | Fila de mensagens para comunicação assíncrona |
| **Table Storage** | Armazenamento NoSQL chave-valor |
| **Block blob** | Armazena arquivos grandes (imagens, vídeos, backups) |
| **Nome da conta de armazenamento** | Globalmente único, alfanumérico minúsculo, 3-24 caracteres |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-13-q1',
      question: 'Uma empresa precisa armazenar milhares de arquivos de imagem que serão servidos a uma aplicação web. Qual serviço de armazenamento Azure eles devem usar?',
      options: ['Azure Files', 'Azure Blob Storage', 'Azure Queue Storage', 'Azure Table Storage'],
      correctAnswer: 1,
      explanation: 'Azure Blob Storage é projetado para armazenar dados não estruturados como imagens, vídeos e documentos. É otimizado para servir grandes quantidades de dados para aplicações web.'
    },
    {
      id: 'az900-13-q2',
      question: 'Uma empresa quer substituir seu servidor de arquivos on-premises com uma solução em nuvem que os usuários possam montar como uma unidade de rede. Qual serviço devem usar?',
      options: ['Azure Blob Storage', 'Azure Files', 'Azure Queue Storage', 'Azure Cosmos DB'],
      correctAnswer: 1,
      explanation: 'Azure Files fornece compartilhamentos de arquivos SMB e NFS totalmente gerenciados que podem ser montados como unidades de rede no Windows, Linux e macOS — assim como um servidor de arquivos tradicional.'
    },
    {
      id: 'az900-13-q3',
      question: 'Qual das opções a seguir é um nome válido de conta de armazenamento Azure?',
      options: ['My-Storage-Account', 'mystorageaccount1', 'MyStorageAccount', 'my_storage_account'],
      correctAnswer: 1,
      explanation: 'Nomes de contas de armazenamento devem ter 3-24 caracteres, usar apenas letras minúsculas e números (sem traços, underscores ou maiúsculas). "mystorageaccount1" é a única opção válida.'
    },
    {
      id: 'az900-13-q4',
      question: 'Uma aplicação precisa desacoplar seus componentes para que possam processar tarefas de forma assíncrona. Qual serviço de armazenamento é projetado para isso?',
      options: ['Blob Storage', 'Azure Files', 'Queue Storage', 'Table Storage'],
      correctAnswer: 2,
      explanation: 'Azure Queue Storage é projetado para armazenar mensagens que podem ser processadas de forma assíncrona. Ele desacopla componentes de aplicação para que possam escalar independentemente.'
    },
    {
      id: 'az900-13-q5',
      question: 'Qual é a relação entre uma conta de armazenamento e blob containers?',
      options: ['Um blob container pode abranger múltiplas contas de armazenamento', 'Uma conta de armazenamento pode conter múltiplos blob containers', 'São a mesma coisa', 'Um blob container é um tipo de conta de armazenamento'],
      correctAnswer: 1,
      explanation: 'Uma conta de armazenamento é o recurso de nível superior. Dentro dela, você pode criar múltiplos blob containers, cada um contendo múltiplos blobs. A hierarquia é: Storage Account → Containers → Blobs.'
    }
  ]}
/>

## Saiba Mais

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure storage services](https://learn.microsoft.com/en-us/training/modules/describe-azure-storage-services/)
- [Azure Storage documentation](https://learn.microsoft.com/en-us/azure/storage/)
