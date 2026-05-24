---
sidebar_position: 8
title: "Desafio 14: RedundÃ¢ncia de Armazenamento e Camadas"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 14: RedundÃ¢ncia de Armazenamento e Camadas

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **DomÃ­nio**: Arquitetura e ServiÃ§os Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever camadas de armazenamento (hot, cool, cold, archive)
- Descrever opÃ§Ãµes de redundÃ¢ncia (LRS, ZRS, GRS, RA-GRS)

## VisÃ£o Geral

Azure Storage mantÃ©m mÃºltiplas cÃ³pias dos seus dados para proteger contra falhas. A **opÃ§Ã£o de redundÃ¢ncia** que vocÃª escolhe determina quantas cÃ³pias sÃ£o feitas e onde sÃ£o armazenadas. O Azure tambÃ©m oferece **camadas de acesso** que permitem otimizar custos com base na frequÃªncia de acesso aos dados.

## Explorar

### Tarefa 1: Entender opÃ§Ãµes de redundÃ¢ncia

| RedundÃ¢ncia | CÃ³pias | Escopo | Protege contra |
|------------|--------|--------|----------------|
| **LRS** (Locally Redundant) | 3 | Um Ãºnico datacenter | Falha de disco/rack |
| **ZRS** (Zone Redundant) | 3 | 3 zonas de disponibilidade | Falha de datacenter |
| **GRS** (Geo-Redundant) | 6 | 3 locais + 3 na regiÃ£o pareada | Falha regional |
| **RA-GRS** (Read-Access GRS) | 6 | Mesmo que GRS + leitura do secundÃ¡rio | Falha regional + disponibilidade de leitura |
| **GZRS** (Geo-Zone Redundant) | 6 | 3 zonas + 3 na regiÃ£o pareada | Falha de zona + regional |
| **RA-GZRS** | 6 | Mesmo que GZRS + leitura do secundÃ¡rio | ProteÃ§Ã£o mÃ¡xima |

**RepresentaÃ§Ã£o visual:**
```yaml
LRS:    [Copy1][Copy2][Copy3]  â† Todos em UM datacenter

ZRS:    [Zone1]  [Zone2]  [Zone3]  â† Cada um em um datacenter DIFERENTE

GRS:    [Primary: 3 copies] â†â†’ [Secondary region: 3 copies]

RA-GRS: Same as GRS, but secondary is READABLE
```

### Tarefa 2: Escolher redundÃ¢ncia para cenÃ¡rios

| CenÃ¡rio | RedundÃ¢ncia recomendada | Por quÃª |
|---------|------------------------|---------|
| Dev/test, dados nÃ£o crÃ­ticos | LRS | Mais barato, um Ãºnico datacenter Ã© suficiente |
| Dados de aplicaÃ§Ã£o web em produÃ§Ã£o | ZRS | Sobrevive a falha de datacenter |
| RecuperaÃ§Ã£o de desastres / conformidade | GRS ou RA-GRS | Sobrevive a falha regional |
| Dados de missÃ£o crÃ­tica | RA-GZRS | MÃ¡xima durabilidade + disponibilidade de leitura |

### Tarefa 3: Entender camadas de acesso

| Camada | FrequÃªncia de acesso | Custo de armazenamento | Custo de acesso | DuraÃ§Ã£o mÃ­nima |
|--------|---------------------|----------------------|-----------------|----------------|
| **Hot** | Acesso frequente | Maior | Menor | Nenhuma |
| **Cool** | Acesso infrequente (â‰¥30 dias) | Menor | Maior | 30 dias |
| **Cold** | Acesso raro (â‰¥90 dias) | Menor ainda | Maior ainda | 90 dias |
| **Archive** | Quase nunca (â‰¥180 dias) | Menor de todos | Maior + tempo de reidrataÃ§Ã£o | 180 dias |

**Trade-off de custo**: Mais barato para armazenar â†” Mais caro para acessar

### Tarefa 4: CenÃ¡rios de camadas de acesso

| Tipo de dados | Melhor camada | RaciocÃ­nio |
|---------------|--------------|------------|
| Imagens ativas de website | Hot | Acessadas constantemente |
| RelatÃ³rios mensais (trimestre atual) | Cool | Acessados ocasionalmente |
| Dados de conformidade (auditoria anual) | Cold | Raramente acessados |
| Arquivos de backup de 7 anos | Archive | Quase nunca acessados |

**Detalhes da camada Archive:**
- Dados sÃ£o armazenados offline
- ReidrataÃ§Ã£o pode levar horas (atÃ© 15 horas para padrÃ£o)
- ReidrataÃ§Ã£o prioritÃ¡ria disponÃ­vel (menos de 1 hora, custa mais)
- NÃ£o Ã© possÃ­vel ler dados diretamente â€” deve reidratar primeiro

### Tarefa 5: Explorar no Portal

1. No Azure Portal, pesquise por **Storage accounts** â†’ **+ Create**
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

| Conceito | DescriÃ§Ã£o |
|----------|-----------|
| **LRS** | 3 cÃ³pias em um datacenter (mais barato, menos durÃ¡vel) |
| **ZRS** | 3 cÃ³pias entre zonas de disponibilidade |
| **GRS** | 3 locais + 3 na regiÃ£o pareada (proteÃ§Ã£o entre regiÃµes) |
| **RA-GRS** | GRS + acesso de leitura Ã  regiÃ£o secundÃ¡ria |
| **Camada Hot** | Otimizada para acesso frequente |
| **Camada Cool** | Custo de armazenamento menor, custo de acesso maior (mÃ­nimo 30 dias) |
| **Camada Cold** | Custo de armazenamento ainda menor (mÃ­nimo 90 dias) |
| **Camada Archive** | Menor custo de armazenamento, dados offline (mÃ­nimo 180 dias) |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-14-q1',
      question: 'Uma empresa precisa garantir que seus dados sobrevivam a uma interrupÃ§Ã£o regional completa. Qual opÃ§Ã£o mÃ­nima de redundÃ¢ncia devem escolher?',
      options: ['LRS', 'ZRS', 'GRS', 'Nenhuma â€” o Azure sempre protege contra interrupÃ§Ãµes regionais'],
      correctAnswer: 2,
      explanation: 'GRS (Geo-Redundant Storage) replica dados para uma regiÃ£o secundÃ¡ria a centenas de quilÃ´metros de distÃ¢ncia. Isso protege contra interrupÃ§Ãµes regionais completas. LRS e ZRS protegem apenas dentro de uma Ãºnica regiÃ£o.'
    },
    {
      id: 'az900-14-q2',
      question: 'Dados que devem ser retidos por 7 anos para conformidade, mas quase nunca sÃ£o acessados, devem ser armazenados em qual camada?',
      options: ['Hot', 'Cool', 'Cold', 'Archive'],
      correctAnswer: 3,
      explanation: 'A camada Archive tem o menor custo de armazenamento e Ã© projetada para dados raramente acessados e armazenados por pelo menos 180 dias. Para retenÃ§Ã£o de 7 anos com acesso mÃ­nimo, Archive Ã© a opÃ§Ã£o mais econÃ´mica.'
    },
    {
      id: 'az900-14-q3',
      question: 'Qual Ã© uma limitaÃ§Ã£o importante da camada de acesso Archive?',
      options: ['NÃ£o pode armazenar mais de 1 TB', 'Dados devem ser reidratados antes de poderem ser lidos', 'NÃ£o suporta criptografia', 'EstÃ¡ disponÃ­vel apenas em regiÃµes dos EUA'],
      correctAnswer: 1,
      explanation: 'A camada Archive armazena dados offline. Para ler dados arquivados, vocÃª deve primeiro reidratÃ¡-los (movÃª-los para a camada hot ou cool), o que pode levar horas.'
    },
    {
      id: 'az900-14-q4',
      question: 'LRS armazena quantas cÃ³pias dos seus dados?',
      options: ['1', '2', '3', '6'],
      correctAnswer: 2,
      explanation: 'LRS (Locally Redundant Storage) mantÃ©m 3 cÃ³pias dos seus dados dentro de um Ãºnico datacenter. Isso fornece 99,999999999% (11 noves) de durabilidade dentro de um ano.'
    },
    {
      id: 'az900-14-q5',
      question: 'Qual Ã© a diferenÃ§a entre GRS e RA-GRS?',
      options: ['GRS Ã© mais rÃ¡pido', 'RA-GRS permite leitura da regiÃ£o secundÃ¡ria', 'GRS tem mais cÃ³pias', 'RA-GRS Ã© mais barato'],
      correctAnswer: 1,
      explanation: 'Tanto GRS quanto RA-GRS mantÃªm 6 cÃ³pias (3 primÃ¡rias + 3 na regiÃ£o secundÃ¡ria). A diferenÃ§a Ã© que RA-GRS fornece acesso de LEITURA Ã  regiÃ£o secundÃ¡ria o tempo todo, mesmo quando a primÃ¡ria estÃ¡ saudÃ¡vel.'
    }
  ]}
/>

## Saiba Mais

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) â€” Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure storage services](https://learn.microsoft.com/en-us/training/modules/describe-azure-storage-services/)
- [Azure Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy)
