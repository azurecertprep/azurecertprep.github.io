---
sidebar_position: 7
title: "Desafio 13: Contas de Armazenamento e Tipos Azure"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 13: Contas de Armazenamento e Tipos Azure

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **DomÃ­nio**: Arquitetura e ServiÃ§os Azure (35-40%)
:::

## Habilidades do exame cobertas

- Comparar serviÃ§os de armazenamento Azure (Blob, File, Queue, Table)
- Descrever opÃ§Ãµes de conta de armazenamento e tipos de armazenamento

## VisÃ£o Geral

Azure Storage Ã© uma soluÃ§Ã£o de armazenamento em nuvem para cenÃ¡rios modernos de armazenamento de dados. Uma **conta de armazenamento** Ã© o contÃªiner de nÃ­vel superior que fornece um namespace exclusivo para seus dados. Dentro de uma conta de armazenamento, vocÃª pode usar quatro serviÃ§os diferentes: Blob, File, Queue e Table.

Cada serviÃ§o atende a uma necessidade diferente de armazenamento â€” desde dados binÃ¡rios nÃ£o estruturados (blobs) atÃ© dados NoSQL semiestruturados (tables).

## Explorar

### Tarefa 1: Entender os serviÃ§os de armazenamento

| ServiÃ§o | Tipo de dados | Caso de uso | Equivalente on-prem |
|---------|--------------|-------------|---------------------|
| **Blob Storage** | NÃ£o estruturado (arquivos, imagens, vÃ­deos) | Arquivos de mÃ­dia, backups, data lakes | Servidor de arquivos / NAS |
| **Azure Files** | Compartilhamentos de arquivos (SMB/NFS) | Drives compartilhados, lift-and-shift | Servidor de arquivos com compartilhamentos SMB |
| **Queue Storage** | Mensagens (atÃ© 64 KB cada) | ComunicaÃ§Ã£o assÃ­ncrona entre apps | Fila de mensagens (MSMQ) |
| **Table Storage** | Dados NoSQL chave-valor | Dados de configuraÃ§Ã£o, logs | Banco de dados simples |

### Tarefa 2: Explorar criaÃ§Ã£o de conta de armazenamento

1. No Azure Portal, pesquise por **Storage accounts**
2. Clique em **+ Create**
3. Explore as opÃ§Ãµes:
   - **Performance**: Standard (HDD) ou Premium (SSD)
   - **Redundancy**: LRS, ZRS, GRS, RA-GRS (coberto no Desafio 14)
   - **Account kind**: StorageV2 (recomendado)
4. Clique em **Cancel** â€” nÃ£o crie

### Tarefa 3: Entender tipos de Blob Storage

Blob Storage possui trÃªs tipos de blobs:

| Tipo de blob | DescriÃ§Ã£o | Caso de uso |
|-------------|-----------|-------------|
| **Block blobs** | Objetos grandes (atÃ© 190,7 TB) | Arquivos, imagens, vÃ­deos, backups |
| **Append blobs** | Otimizado para operaÃ§Ãµes de adiÃ§Ã£o | Arquivos de log, dados de streaming |
| **Page blobs** | Leitura/escrita aleatÃ³ria (atÃ© 8 TB) | Discos de VM (VHDs) |

**Blob containers** organizam blobs dentro de uma conta de armazenamento:
```text
Storage Account: mystorageaccount
â”œâ”€â”€ Container: images
â”‚   â”œâ”€â”€ photo1.jpg
â”‚   â””â”€â”€ photo2.png
â”œâ”€â”€ Container: backups
â”‚   â””â”€â”€ db-backup-2024.bak
â””â”€â”€ Container: logs
    â””â”€â”€ app-log-01.txt
```

### Tarefa 4: Entender Azure Files

Azure Files fornece compartilhamentos de arquivos totalmente gerenciados:
- AcessÃ­vel via **SMB** (Windows/Linux/macOS) ou **NFS** (Linux)
- Pode ser montado como uma unidade de rede
- CompatÃ­vel com fluxos de trabalho de compartilhamento de arquivos on-premises
- Suporta Azure File Sync (armazena em cache arquivos acessados frequentemente on-premises)

**CenÃ¡rio principal**: Substituir um servidor de arquivos on-premises com Azure Files â€” mesma experiÃªncia do usuÃ¡rio, menos hardware.

### Tarefa 5: Nomenclatura de conta de armazenamento

Nomes de contas de armazenamento devem ser:
- **3-24 caracteres** de comprimento
- **Apenas letras minÃºsculas e nÃºmeros** (sem traÃ§os, underscores ou maiÃºsculas)
- **Globalmente Ãºnicos** em todo o Azure

Por que globalmente Ãºnicos? Porque o nome da conta de armazenamento se torna parte da URL:
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

| Conceito | DescriÃ§Ã£o |
|----------|-----------|
| **Storage account** | ContÃªiner de nÃ­vel superior; fornece namespace exclusivo |
| **Blob Storage** | Armazenamento de objetos para dados nÃ£o estruturados |
| **Azure Files** | Compartilhamentos de arquivos gerenciados (SMB/NFS) |
| **Queue Storage** | Fila de mensagens para comunicaÃ§Ã£o assÃ­ncrona |
| **Table Storage** | Armazenamento NoSQL chave-valor |
| **Block blob** | Armazena arquivos grandes (imagens, vÃ­deos, backups) |
| **Nome da conta de armazenamento** | Globalmente Ãºnico, alfanumÃ©rico minÃºsculo, 3-24 caracteres |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-13-q1',
      question: 'Uma empresa precisa armazenar milhares de arquivos de imagem que serÃ£o servidos a uma aplicaÃ§Ã£o web. Qual serviÃ§o de armazenamento Azure eles devem usar?',
      options: ['Azure Files', 'Azure Blob Storage', 'Azure Queue Storage', 'Azure Table Storage'],
      correctAnswer: 1,
      explanation: 'Azure Blob Storage Ã© projetado para armazenar dados nÃ£o estruturados como imagens, vÃ­deos e documentos. Ã‰ otimizado para servir grandes quantidades de dados para aplicaÃ§Ãµes web.'
    },
    {
      id: 'az900-13-q2',
      question: 'Uma empresa quer substituir seu servidor de arquivos on-premises com uma soluÃ§Ã£o em nuvem que os usuÃ¡rios possam montar como uma unidade de rede. Qual serviÃ§o devem usar?',
      options: ['Azure Blob Storage', 'Azure Files', 'Azure Queue Storage', 'Azure Cosmos DB'],
      correctAnswer: 1,
      explanation: 'Azure Files fornece compartilhamentos de arquivos SMB e NFS totalmente gerenciados que podem ser montados como unidades de rede no Windows, Linux e macOS â€” assim como um servidor de arquivos tradicional.'
    },
    {
      id: 'az900-13-q3',
      question: 'Qual das opÃ§Ãµes a seguir Ã© um nome vÃ¡lido de conta de armazenamento Azure?',
      options: ['My-Storage-Account', 'mystorageaccount1', 'MyStorageAccount', 'my_storage_account'],
      correctAnswer: 1,
      explanation: 'Nomes de contas de armazenamento devem ter 3-24 caracteres, usar apenas letras minÃºsculas e nÃºmeros (sem traÃ§os, underscores ou maiÃºsculas). "mystorageaccount1" Ã© a Ãºnica opÃ§Ã£o vÃ¡lida.'
    },
    {
      id: 'az900-13-q4',
      question: 'Uma aplicaÃ§Ã£o precisa desacoplar seus componentes para que possam processar tarefas de forma assÃ­ncrona. Qual serviÃ§o de armazenamento Ã© projetado para isso?',
      options: ['Blob Storage', 'Azure Files', 'Queue Storage', 'Table Storage'],
      correctAnswer: 2,
      explanation: 'Azure Queue Storage Ã© projetado para armazenar mensagens que podem ser processadas de forma assÃ­ncrona. Ele desacopla componentes de aplicaÃ§Ã£o para que possam escalar independentemente.'
    },
    {
      id: 'az900-13-q5',
      question: 'Qual Ã© a relaÃ§Ã£o entre uma conta de armazenamento e blob containers?',
      options: ['Um blob container pode abranger mÃºltiplas contas de armazenamento', 'Uma conta de armazenamento pode conter mÃºltiplos blob containers', 'SÃ£o a mesma coisa', 'Um blob container Ã© um tipo de conta de armazenamento'],
      correctAnswer: 1,
      explanation: 'Uma conta de armazenamento Ã© o recurso de nÃ­vel superior. Dentro dela, vocÃª pode criar mÃºltiplos blob containers, cada um contendo mÃºltiplos blobs. A hierarquia Ã©: Storage Account â†’ Containers â†’ Blobs.'
    }
  ]}
/>

## Saiba Mais

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) â€” Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure storage services](https://learn.microsoft.com/en-us/training/modules/describe-azure-storage-services/)
- [Azure Storage documentation](https://learn.microsoft.com/en-us/azure/storage/)
