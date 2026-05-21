---
sidebar_position: 11
title: "Desafio 17: RBAC, Conditional Access e Identidades Externas"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 17: RBAC, Conditional Access e Identidades Externas

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Arquitetura e Serviços Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever identidades externas e acesso de convidado (B2B)
- Descrever Conditional Access
- Descrever controle de acesso baseado em função Azure (RBAC)

## Visão Geral

Uma vez que os usuários estão autenticados (provaram quem são), o Azure precisa controlar **o que eles podem fazer**. É aqui que o RBAC (Role-Based Access Control) entra. **Conditional Access** adiciona políticas sensíveis ao contexto (onde, quando, como o usuário está fazendo login). **Identidades externas** permitem colaboração com pessoas fora da sua organização.

## Explorar

### Tarefa 1: Entender Azure RBAC

RBAC responde: "Quem pode fazer o quê, em quais recursos?"

| Componente RBAC | Descrição | Exemplo |
|-----------------|-----------|---------|
| **Security principal** | Quem | Usuário, grupo, service principal |
| **Role** | O que pode fazer | Reader, Contributor, Owner |
| **Scope** | Onde se aplica | Management group, subscription, RG, recurso |

**Funções integradas:**

| Função | Permissões |
|--------|-----------|
| **Owner** | Acesso total + pode atribuir funções a outros |
| **Contributor** | Acesso total EXCETO atribuir funções |
| **Reader** | Apenas visualização — não pode alterar nada |
| **User Access Administrator** | Gerenciar apenas acesso de usuários |

### Tarefa 2: Explorar RBAC no Portal

1. No Azure Portal, navegue até sua **Subscription**
2. Clique em **Access control (IAM)** no menu à esquerda
3. Clique na aba **Roles** — navegue pelas funções disponíveis
4. Clique na aba **Role assignments** — veja quem tem acesso
5. Clique em **Check access** — veja o que um usuário específico pode fazer
6. Esta é uma exploração somente leitura

**Herança de RBAC:**
```
Management Group (Owner) → applies to all below
  └── Subscription (Contributor) → applies to all RGs and resources
        └── Resource Group (Reader) → applies to all resources in this RG
              └── Resource (custom) → applies to this resource only
```

### Tarefa 3: Entender Conditional Access

Políticas de Conditional Access são regras "se-então":

**SE** (condição) → **ENTÃO** (ação)

| Sinal (SE) | Ação (ENTÃO) |
|------------|--------------|
| Usuário em localização arriscada | Exigir MFA |
| Dispositivo não está em conformidade | Bloquear acesso |
| Acessando app sensível | Exigir dispositivo gerenciado |
| Usuário é funcionário interno | Permitir com MFA |
| Usuário é convidado de localização desconhecida | Bloquear |

**Políticas comuns:**
- Exigir MFA para todas as contas de administrador
- Bloquear logins de países onde você não opera
- Exigir dispositivos em conformidade para acessar dados corporativos
- Forçar troca de senha se risco de login for detectado

### Tarefa 4: Explorar Conditional Access no Portal

1. No Azure Portal, pesquise por **Conditional Access**
2. Ou navegue: **Microsoft Entra ID** → **Security** → **Conditional Access**
3. Navegue pela seção **Policies**
4. Clique em **+ New policy** para ver quais opções existem:
   - **Assignments**: Usuários, apps, condições
   - **Access controls**: Grant, Block, Require MFA
5. Clique em **Cancel** — não crie uma política

### Tarefa 5: Entender identidades externas

**B2B (Business-to-Business)** permite convidar usuários externos:
- Funcionários de parceiros colaboram no seu ambiente
- Eles usam sua PRÓPRIA identidade (email da empresa deles)
- Você controla o que podem acessar via RBAC
- Eles aparecem como usuários "Guest" no seu diretório

| Tipo de identidade | Descrição | Exemplo |
|-------------------|-----------|---------|
| **Member** | Usuário interno da organização | employee@contoso.com |
| **Guest (B2B)** | Usuário externo convidado para colaborar | partner@fabrikam.com |
| **B2C** | Identidade de cliente para apps públicos | customer@gmail.com |

:::tip Alternativa Azure CLI
```bash
# List role assignments on your subscription
az role assignment list --output table --query "[0:5].{Principal:principalName, Role:roleDefinitionName, Scope:scope}"

# List built-in RBAC roles
az role definition list --query "[?roleType=='BuiltInRole'] | [0:10].{Name:roleName, Description:description}" --output table
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **RBAC** | Controle de acesso baseado em função — atribuir permissões a funções, funções a usuários |
| **Role assignment** | Combinação de security principal + role + scope |
| **Scope** | Onde a função se aplica (management group → subscription → RG → recurso) |
| **Conditional Access** | Políticas se-então que avaliam contexto de login |
| **B2B** | Convidar usuários externos para colaborar usando sua própria identidade |
| **B2C** | Gerenciamento de identidade voltado ao cliente para apps |
| **Least privilege** | Dar aos usuários apenas as permissões que precisam |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-17-q1',
      question: 'Um usuário precisa visualizar recursos Azure, mas não deve poder fazer nenhuma alteração. Qual função RBAC deve ser atribuída?',
      options: ['Owner', 'Contributor', 'Reader', 'User Access Administrator'],
      correctAnswer: 2,
      explanation: 'A função Reader permite visualizar todos os recursos, mas não permite criar, atualizar ou excluir nada. Isso segue o princípio de least privilege.'
    },
    {
      id: 'az900-17-q2',
      question: 'Qual é o propósito das políticas de Conditional Access?',
      options: ['Criar recursos Azure', 'Aplicar regras de acesso baseadas em condições como localização e dispositivo', 'Gerenciar contas de armazenamento', 'Monitorar saúde dos recursos'],
      correctAnswer: 1,
      explanation: 'Políticas de Conditional Access avaliam sinais (usuário, localização, dispositivo, aplicação) e aplicam decisões (permitir, bloquear, exigir MFA) baseadas em regras organizacionais.'
    },
    {
      id: 'az900-17-q3',
      question: 'Uma empresa quer colaborar com uma organização parceira. Funcionários do parceiro devem usar suas credenciais existentes da empresa para acessar recursos compartilhados. Qual recurso permite isso?',
      options: ['Identidades B2C', 'Identidades externas B2B', 'Entra Domain Services', 'VPN Gateway'],
      correctAnswer: 1,
      explanation: 'Identidades externas B2B (Business-to-Business) permitem convidar usuários de outras organizações. Eles se autenticam com seu próprio provedor de identidade e acessam recursos que você compartilha com eles.'
    },
    {
      id: 'az900-17-q4',
      question: 'Se uma função Contributor é atribuída no nível da subscription, a que o usuário tem acesso?',
      options: ['Apenas às configurações daquela subscription', 'Todos os resource groups e recursos dentro daquela subscription', 'Apenas ao primeiro resource group', 'Nada — Contributor requer atribuição no nível do recurso'],
      correctAnswer: 1,
      explanation: 'Permissões RBAC são herdadas para baixo. Uma função Contributor no nível da subscription dá acesso total (exceto atribuições de função) a TODOS os resource groups e recursos dentro daquela subscription.'
    },
    {
      id: 'az900-17-q5',
      question: 'Qual é a diferença entre as funções Owner e Contributor?',
      options: ['Owner pode criar recursos; Contributor não pode', 'Owner pode atribuir funções a outros; Contributor não pode', 'Contributor tem mais permissões que Owner', 'Não há diferença'],
      correctAnswer: 1,
      explanation: 'Tanto Owner quanto Contributor têm acesso total para gerenciar recursos. A diferença principal é que Owner também pode gerenciar atribuições de função (conceder/revogar acesso a outros), enquanto Contributor não pode.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure identity, access, and security](https://learn.microsoft.com/en-us/training/modules/describe-azure-identity-access-security/)
- [Azure RBAC documentation](https://learn.microsoft.com/en-us/azure/role-based-access-control/)
