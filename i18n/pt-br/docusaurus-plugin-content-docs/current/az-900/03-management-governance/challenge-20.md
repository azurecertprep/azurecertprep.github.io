---
sidebar_position: 2
title: "Desafio 20: Governança — Azure Policy, Purview e Resource Locks"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 20: Governança — Azure Policy, Purview e Resource Locks

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **Domínio**: Management & Governance (30-35%)
:::

## Habilidades do exame cobertas

- Descrever o propósito do Microsoft Purview
- Descrever o propósito do Azure Policy
- Descrever o propósito de resource locks

## Visão Geral

Governança garante que seu ambiente Azure permaneça em conformidade, organizado e protegido. **Azure Policy** impõe regras sobre o que pode ser criado e como. **Resource locks** previnem exclusão ou modificação acidental. **Microsoft Purview** fornece governança de dados em todo o seu patrimônio digital.

## Explorar

### Tarefa 1: Entender o Azure Policy

Azure Policy impõe padrões organizacionais. Políticas avaliam recursos e marcam os não conformes.

| Tipo de política | O que faz | Exemplo |
|-----------------|-----------|---------|
| **Deny** | Impedir criação de recurso não conforme | "VMs devem estar apenas em regiões permitidas" |
| **Audit** | Sinalizar recursos existentes não conformes | "Storage accounts sem criptografia" |
| **Append** | Adicionar campos obrigatórios automaticamente | "Adicionar automaticamente tags obrigatórias" |
| **Modify** | Alterar propriedades de recursos | "Habilitar log de diagnóstico" |

### Tarefa 2: Explorar o Azure Policy no Portal

1. No Azure Portal, pesquise por **Policy**
2. Explore:
   - **Overview**: Status de conformidade em todo o seu ambiente
   - **Definitions**: Navegue pelas políticas embutidas
   - **Assignments**: Veja o que está atribuído
3. Clique em **Definitions** e navegue pelas categorias:
   - Compute, Storage, Network, Security Center, Tags
4. Tente pesquisar: "Allowed locations" — esta política popular restringe onde recursos podem ser criados

**Policy vs RBAC:**
| | Azure Policy | Azure RBAC |
|--|-------------|-----------|
| Pergunta respondida | "O que pode ser criado?" | "Quem pode fazer o quê?" |
| Foco | Conformidade de recursos | Permissões de usuários |
| Exemplo | "Apenas VMs Standard_D2s permitidas" | "Alice pode criar VMs" |

### Tarefa 3: Entender resource locks

Resource locks previnem alterações ou exclusão acidental:

| Tipo de lock | Pode ler? | Pode modificar? | Pode excluir? |
|-------------|----------|----------------|---------------|
| **Sem lock** | ✅ | ✅ | ✅ |
| **ReadOnly** | ✅ | ❌ | ❌ |
| **CanNotDelete** | ✅ | ✅ | ❌ |

**Fatos importantes:**
- Locks são herdados (lock no RG se aplica a todos os recursos)
- Mesmo Owners não podem excluir um recurso bloqueado sem remover o lock primeiro
- Locks substituem permissões RBAC

### Tarefa 4: Explorar resource locks no Portal

1. Navegue até o seu grupo de recursos `rg-az900-learning` (ou qualquer RG)
2. Clique em **Locks** no menu à esquerda
3. Clique em **+ Add** para ver as opções de lock:
   - Nome do lock, Tipo de lock (Read-only ou Delete)
   - Notas explicando por que o lock existe
4. Opcionalmente adicione um lock **CanNotDelete** ao seu grupo de recursos
5. Tente excluir o RG — você será bloqueado!

### Tarefa 5: Entender o Microsoft Purview

Microsoft Purview fornece governança de dados unificada:

| Recurso | Descrição |
|---------|-----------|
| **Data Map** | Descoberta e classificação automatizada de dados no Azure, on-premises e multi-cloud |
| **Data Catalog** | Pesquisar e descobrir ativos de dados |
| **Data Estate Insights** | Análises sobre distribuição e sensibilidade de dados |
| **Data sharing** | Compartilhar dados com segurança entre organizações |

**Quando usar Purview:**
- Você precisa saber ONDE seus dados sensíveis estão
- Você precisa classificar dados (PII, financeiro, saúde)
- Você precisa de relatórios de conformidade em vários armazenamentos de dados
- Você precisa de uma visão unificada do seu panorama de dados

:::tip Alternativa Azure CLI
```bash
# List Azure Policy definitions (first 5)
az policy definition list --query "[0:5].{Name:displayName, Category:metadata.category}" --output table

# List policy assignments
az policy assignment list --output table

# Add a resource lock
az lock create --name DoNotDelete --resource-group rg-az900-learning --lock-type CanNotDelete 2>/dev/null || echo "Create the RG first"

# List locks
az lock list --resource-group rg-az900-learning --output table 2>/dev/null || echo "No RG found"
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **Azure Policy** | Impor regras sobre criação e conformidade de recursos |
| **Policy initiative** | Grupo de políticas relacionadas aplicadas em conjunto |
| **Resource lock** | Prevenir exclusão ou modificação acidental |
| **CanNotDelete lock** | Recursos podem ser modificados mas não excluídos |
| **ReadOnly lock** | Recursos podem apenas ser lidos — nenhuma alteração permitida |
| **Microsoft Purview** | Governança, descoberta e classificação unificada de dados |
| **Compliance** | Porcentagem de recursos que atendem aos requisitos de política |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-20-q1',
      question: 'Uma empresa quer garantir que todos os recursos Azure sejam criados apenas em regiões específicas. Qual serviço deve ser usado?',
      options: ['Azure RBAC', 'Azure Policy', 'Resource locks', 'Microsoft Purview'],
      correctAnswer: 1,
      explanation: 'Azure Policy pode impor uma política "Allowed locations" que impede a criação de recursos em regiões não aprovadas. Isso se aplica a todos os usuários independente do seu papel RBAC.'
    },
    {
      id: 'az900-20-q2',
      question: 'Um banco de dados de produção deve ser protegido contra exclusão acidental. O que deve ser aplicado?',
      options: ['Regra deny do Azure Policy', 'Resource lock CanNotDelete', 'Resource lock ReadOnly', 'Remover permissões de Owner'],
      correctAnswer: 1,
      explanation: 'Um lock CanNotDelete impede que o recurso seja excluído enquanto ainda permite modificações. Isso protege recursos de produção contra exclusão acidental.'
    },
    {
      id: 'az900-20-q3',
      question: 'Qual é o propósito do Microsoft Purview?',
      options: ['Gerenciar implantações de VM', 'Fornecer governança e classificação unificada de dados', 'Monitorar tráfego de rede', 'Criar storage accounts'],
      correctAnswer: 1,
      explanation: 'Microsoft Purview fornece governança unificada de dados em todo o seu patrimônio digital. Ele descobre, classifica e mapeia dados sensíveis no Azure, on-premises e ambientes multi-cloud.'
    },
    {
      id: 'az900-20-q4',
      question: 'Um Owner de um grupo de recursos tenta excluí-lo mas recebe um erro. Qual é a causa mais provável?',
      options: ['Ele não tem permissões suficientes', 'Um resource lock está impedindo a exclusão', 'O grupo de recursos está vazio', 'Azure Policy está bloqueando'],
      correctAnswer: 1,
      explanation: 'Resource locks substituem permissões RBAC. Mesmo um Owner não pode excluir um recurso com um lock CanNotDelete aplicado. O lock deve ser removido primeiro.'
    },
    {
      id: 'az900-20-q5',
      question: 'Qual é a diferença entre Azure Policy e Azure RBAC?',
      options: ['Policy controla QUEM pode acessar; RBAC controla O QUE pode ser criado', 'Policy controla O QUE pode ser criado; RBAC controla QUEM pode fazer', 'São a mesma coisa', 'Policy é para computação; RBAC é para armazenamento'],
      correctAnswer: 1,
      explanation: 'Azure Policy foca em propriedades de recursos e conformidade (o que pode ser criado/configurado). RBAC foca em permissões de usuários (quem pode executar ações). Eles se complementam.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe features and tools for governance](https://learn.microsoft.com/en-us/training/modules/describe-features-tools-azure-for-governance-compliance/)
- [Azure Policy documentation](https://learn.microsoft.com/en-us/azure/governance/policy/)
- [Microsoft Purview documentation](https://learn.microsoft.com/en-us/purview/)
