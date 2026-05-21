---
sidebar_position: 8
title: "Desafio 14: Redundância de Armazenamento e Camadas"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 14: Redundância de Armazenamento e Camadas

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Arquitetura e Serviços Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever camadas de armazenamento (hot, cool, cold, archive)
- Descrever opções de redundância (LRS, ZRS, GRS, RA-GRS)

## Visão Geral

Azure Storage mantém múltiplas cópias dos seus dados para proteger contra falhas. A **opção de redundância** que você escolhe determina quantas cópias são feitas e onde são armazenadas. O Azure também oferece **camadas de acesso** que permitem otimizar custos com base na frequência de acesso aos dados.

## Explorar

### Tarefa 1: Entender opções de redundância

| Redundância | Cópias | Escopo | Protege contra |
|------------|--------|--------|----------------|
| **LRS** (Locally Redundant) | 3 | Um único datacenter | Falha de disco/rack |
| **ZRS** (Zone Redundant) | 3 | 3 zonas de disponibilidade | Falha de datacenter |
| **GRS** (Geo-Redundant) | 6 | 3 locais + 3 na região pareada | Falha regional |
| **RA-GRS** (Read-Access GRS) | 6 | Mesmo que GRS + leitura do secundário | Falha regional + disponibilidade de leitura |
| **GZRS** (Geo-Zone Redundant) | 6 | 3 zonas + 3 na região pareada | Falha de zona + regional |
| **RA-GZRS** | 6 | Mesmo que GZRS + leitura do secundário | Proteção máxima |

**Representação visual:**
```
LRS:    [Copy1][Copy2][Copy3]  ← Todos em UM datacenter

ZRS:    [Zone1]  [Zone2]  [Zone3]  ← Cada um em um datacenter DIFERENTE

GRS:    [Primary: 3 copies] ←→ [Secondary region: 3 copies]

RA-GRS: Same as GRS, but secondary is READABLE
```

### Tarefa 2: Escolher redundância para cenários

| Cenário | Redundância recomendada | Por quê |
|---------|------------------------|---------|
| Dev/test, dados não críticos | LRS | Mais barato, um único datacenter é suficiente |
| Dados de aplicação web em produção | ZRS | Sobrevive a falha de datacenter |
| Recuperação de desastres / conformidade | GRS ou RA-GRS | Sobrevive a falha regional |
| Dados de missão crítica | RA-GZRS | Máxima durabilidade + disponibilidade de leitura |

### Tarefa 3: Entender camadas de acesso

| Camada | Frequência de acesso | Custo de armazenamento | Custo de acesso | Duração mínima |
|--------|---------------------|----------------------|-----------------|----------------|
| **Hot** | Acesso frequente | Maior | Menor | Nenhuma |
| **Cool** | Acesso infrequente (≥30 dias) | Menor | Maior | 30 dias |
| **Cold** | Acesso raro (≥90 dias) | Menor ainda | Maior ainda | 90 dias |
| **Archive** | Quase nunca (≥180 dias) | Menor de todos | Maior + tempo de reidratação | 180 dias |

**Trade-off de custo**: Mais barato para armazenar ↔ Mais caro para acessar

### Tarefa 4: Cenários de camadas de acesso

| Tipo de dados | Melhor camada | Raciocínio |
|---------------|--------------|------------|
| Imagens ativas de website | Hot | Acessadas constantemente |
| Relatórios mensais (trimestre atual) | Cool | Acessados ocasionalmente |
| Dados de conformidade (auditoria anual) | Cold | Raramente acessados |
| Arquivos de backup de 7 anos | Archive | Quase nunca acessados |

**Detalhes da camada Archive:**
- Dados são armazenados offline
- Reidratação pode levar horas (até 15 horas para padrão)
- Reidratação prioritária disponível (menos de 1 hora, custa mais)
- Não é possível ler dados diretamente — deve reidratar primeiro

### Tarefa 5: Explorar no Portal

1. No Azure Portal, pesquise por **Storage accounts** → **+ Create**
2. Na aba **Basics**, observe:
   - Dropdown de **Redundancy**: LRS, ZRS, GRS, RA-GRS, GZRS, RA-GZRS
3. Na aba **Advanced**, observe:
   - **Default access tier**: Hot ou Cool
4. Clique em **Cancel**

:::tip Alternativa Azure CLI
```bash
# Check storage account redundancy (if one exists)
az storage account list --query "[].{Name:name, Redundancy:sku.name}" --output table

# Access tier is set per blob or per account default
# Example: change a blob tier (requires a storage account)
# az storage blob set-tier --account-name <name> --container-name <container> --name <blob> --tier Cool
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **LRS** | 3 cópias em um datacenter (mais barato, menos durável) |
| **ZRS** | 3 cópias entre zonas de disponibilidade |
| **GRS** | 3 locais + 3 na região pareada (proteção entre regiões) |
| **RA-GRS** | GRS + acesso de leitura à região secundária |
| **Camada Hot** | Otimizada para acesso frequente |
| **Camada Cool** | Custo de armazenamento menor, custo de acesso maior (mínimo 30 dias) |
| **Camada Cold** | Custo de armazenamento ainda menor (mínimo 90 dias) |
| **Camada Archive** | Menor custo de armazenamento, dados offline (mínimo 180 dias) |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-14-q1',
      question: 'Uma empresa precisa garantir que seus dados sobrevivam a uma interrupção regional completa. Qual opção mínima de redundância devem escolher?',
      options: ['LRS', 'ZRS', 'GRS', 'Nenhuma — o Azure sempre protege contra interrupções regionais'],
      correctAnswer: 2,
      explanation: 'GRS (Geo-Redundant Storage) replica dados para uma região secundária a centenas de quilômetros de distância. Isso protege contra interrupções regionais completas. LRS e ZRS protegem apenas dentro de uma única região.'
    },
    {
      id: 'az900-14-q2',
      question: 'Dados que devem ser retidos por 7 anos para conformidade, mas quase nunca são acessados, devem ser armazenados em qual camada?',
      options: ['Hot', 'Cool', 'Cold', 'Archive'],
      correctAnswer: 3,
      explanation: 'A camada Archive tem o menor custo de armazenamento e é projetada para dados raramente acessados e armazenados por pelo menos 180 dias. Para retenção de 7 anos com acesso mínimo, Archive é a opção mais econômica.'
    },
    {
      id: 'az900-14-q3',
      question: 'Qual é uma limitação importante da camada de acesso Archive?',
      options: ['Não pode armazenar mais de 1 TB', 'Dados devem ser reidratados antes de poderem ser lidos', 'Não suporta criptografia', 'Está disponível apenas em regiões dos EUA'],
      correctAnswer: 1,
      explanation: 'A camada Archive armazena dados offline. Para ler dados arquivados, você deve primeiro reidratá-los (movê-los para a camada hot ou cool), o que pode levar horas.'
    },
    {
      id: 'az900-14-q4',
      question: 'LRS armazena quantas cópias dos seus dados?',
      options: ['1', '2', '3', '6'],
      correctAnswer: 2,
      explanation: 'LRS (Locally Redundant Storage) mantém 3 cópias dos seus dados dentro de um único datacenter. Isso fornece 99,999999999% (11 noves) de durabilidade dentro de um ano.'
    },
    {
      id: 'az900-14-q5',
      question: 'Qual é a diferença entre GRS e RA-GRS?',
      options: ['GRS é mais rápido', 'RA-GRS permite leitura da região secundária', 'GRS tem mais cópias', 'RA-GRS é mais barato'],
      correctAnswer: 1,
      explanation: 'Tanto GRS quanto RA-GRS mantêm 6 cópias (3 primárias + 3 na região secundária). A diferença é que RA-GRS fornece acesso de LEITURA à região secundária o tempo todo, mesmo quando a primária está saudável.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure storage services](https://learn.microsoft.com/en-us/training/modules/describe-azure-storage-services/)
- [Azure Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy)
