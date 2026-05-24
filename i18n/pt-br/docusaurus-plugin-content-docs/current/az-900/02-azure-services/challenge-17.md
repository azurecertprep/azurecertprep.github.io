---
sidebar_position: 11
title: "Desafio 17: RBAC, Conditional Access e Identidades Externas"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 17: RBAC, Conditional Access e Identidades Externas

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **DomÃ­nio**: Arquitetura e ServiÃ§os Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever identidades externas e acesso de convidado (B2B)
- Descrever Conditional Access
- Descrever controle de acesso baseado em funÃ§Ã£o Azure (RBAC)

## VisÃ£o Geral

Uma vez que os usuÃ¡rios estÃ£o autenticados (provaram quem sÃ£o), o Azure precisa controlar **o que eles podem fazer**. Ã‰ aqui que o RBAC (Role-Based Access Control) entra. **Conditional Access** adiciona polÃ­ticas sensÃ­veis ao contexto (onde, quando, como o usuÃ¡rio estÃ¡ fazendo login). **Identidades externas** permitem colaboraÃ§Ã£o com pessoas fora da sua organizaÃ§Ã£o.

## Explorar

### Tarefa 1: Entender Azure RBAC

RBAC responde: "Quem pode fazer o quÃª, em quais recursos?"

| Componente RBAC | DescriÃ§Ã£o | Exemplo |
|-----------------|-----------|---------|
| **Security principal** | Quem | UsuÃ¡rio, grupo, service principal |
| **Role** | O que pode fazer | Reader, Contributor, Owner |
| **Scope** | Onde se aplica | Management group, subscription, RG, recurso |

**FunÃ§Ãµes integradas:**

| FunÃ§Ã£o | PermissÃµes |
|--------|-----------|
| **Owner** | Acesso total + pode atribuir funÃ§Ãµes a outros |
| **Contributor** | Acesso total EXCETO atribuir funÃ§Ãµes |
| **Reader** | Apenas visualizaÃ§Ã£o â€” nÃ£o pode alterar nada |
| **User Access Administrator** | Gerenciar apenas acesso de usuÃ¡rios |

### Tarefa 2: Explorar RBAC no Portal

1. No Azure Portal, navegue atÃ© sua **Subscription**
2. Clique em **Access control (IAM)** no menu Ã  esquerda
3. Clique na aba **Roles** â€” navegue pelas funÃ§Ãµes disponÃ­veis
4. Clique na aba **Role assignments** â€” veja quem tem acesso
5. Clique em **Check access** â€” veja o que um usuÃ¡rio especÃ­fico pode fazer
6. Esta Ã© uma exploraÃ§Ã£o somente leitura

**HeranÃ§a de RBAC:**
```text
Management Group (Owner) â†’ applies to all below
  â””â”€â”€ Subscription (Contributor) â†’ applies to all RGs and resources
        â””â”€â”€ Resource Group (Reader) â†’ applies to all resources in this RG
              â””â”€â”€ Resource (custom) â†’ applies to this resource only
```

### Tarefa 3: Entender Conditional Access

PolÃ­ticas de Conditional Access sÃ£o regras "se-entÃ£o":

**SE** (condiÃ§Ã£o) â†’ **ENTÃƒO** (aÃ§Ã£o)

| Sinal (SE) | AÃ§Ã£o (ENTÃƒO) |
|------------|--------------|
| UsuÃ¡rio em localizaÃ§Ã£o arriscada | Exigir MFA |
| Dispositivo nÃ£o estÃ¡ em conformidade | Bloquear acesso |
| Acessando app sensÃ­vel | Exigir dispositivo gerenciado |
| UsuÃ¡rio Ã© funcionÃ¡rio interno | Permitir com MFA |
| UsuÃ¡rio Ã© convidado de localizaÃ§Ã£o desconhecida | Bloquear |

**PolÃ­ticas comuns:**
- Exigir MFA para todas as contas de administrador
- Bloquear logins de paÃ­ses onde vocÃª nÃ£o opera
- Exigir dispositivos em conformidade para acessar dados corporativos
- ForÃ§ar troca de senha se risco de login for detectado

### Tarefa 4: Explorar Conditional Access no Portal

1. No Azure Portal, pesquise por **Conditional Access**
2. Ou navegue: **Microsoft Entra ID** â†’ **Security** â†’ **Conditional Access**
3. Navegue pela seÃ§Ã£o **Policies**
4. Clique em **+ New policy** para ver quais opÃ§Ãµes existem:
   - **Assignments**: UsuÃ¡rios, apps, condiÃ§Ãµes
   - **Access controls**: Grant, Block, Require MFA
5. Clique em **Cancel** â€” nÃ£o crie uma polÃ­tica

### Tarefa 5: Entender identidades externas

**B2B (Business-to-Business)** permite convidar usuÃ¡rios externos:
- FuncionÃ¡rios de parceiros colaboram no seu ambiente
- Eles usam sua PRÃ“PRIA identidade (email da empresa deles)
- VocÃª controla o que podem acessar via RBAC
- Eles aparecem como usuÃ¡rios "Guest" no seu diretÃ³rio

| Tipo de identidade | DescriÃ§Ã£o | Exemplo |
|-------------------|-----------|---------|
| **Member** | UsuÃ¡rio interno da organizaÃ§Ã£o | employee@contoso.com |
| **Guest (B2B)** | UsuÃ¡rio externo convidado para colaborar | partner@fabrikam.com |
| **B2C** | Identidade de cliente para apps pÃºblicos | customer@gmail.com |

:::tip Alternativa Azure CLI
```bash
# List role assignments on your subscription
az role assignment list --output table --query "[0:5].{Principal:principalName, Role:roleDefinitionName, Scope:scope}"

# List built-in RBAC roles
az role definition list --query "[?roleType=='BuiltInRole'] | [0:10].{Name:roleName, Description:description}" --output table
```
:::

## Conceitos-Chave

| Conceito | DescriÃ§Ã£o |
|----------|-----------|
| **RBAC** | Controle de acesso baseado em funÃ§Ã£o â€” atribuir permissÃµes a funÃ§Ãµes, funÃ§Ãµes a usuÃ¡rios |
| **Role assignment** | CombinaÃ§Ã£o de security principal + role + scope |
| **Scope** | Onde a funÃ§Ã£o se aplica (management group â†’ subscription â†’ RG â†’ recurso) |
| **Conditional Access** | PolÃ­ticas se-entÃ£o que avaliam contexto de login |
| **B2B** | Convidar usuÃ¡rios externos para colaborar usando sua prÃ³pria identidade |
| **B2C** | Gerenciamento de identidade voltado ao cliente para apps |
| **Least privilege** | Dar aos usuÃ¡rios apenas as permissÃµes que precisam |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-17-q1',
      question: 'Um usuÃ¡rio precisa visualizar recursos Azure, mas nÃ£o deve poder fazer nenhuma alteraÃ§Ã£o. Qual funÃ§Ã£o RBAC deve ser atribuÃ­da?',
      options: ['Owner', 'Contributor', 'Reader', 'User Access Administrator'],
      correctAnswer: 2,
      explanation: 'A funÃ§Ã£o Reader permite visualizar todos os recursos, mas nÃ£o permite criar, atualizar ou excluir nada. Isso segue o princÃ­pio de least privilege.'
    },
    {
      id: 'az900-17-q2',
      question: 'Qual Ã© o propÃ³sito das polÃ­ticas de Conditional Access?',
      options: ['Criar recursos Azure', 'Aplicar regras de acesso baseadas em condiÃ§Ãµes como localizaÃ§Ã£o e dispositivo', 'Gerenciar contas de armazenamento', 'Monitorar saÃºde dos recursos'],
      correctAnswer: 1,
      explanation: 'PolÃ­ticas de Conditional Access avaliam sinais (usuÃ¡rio, localizaÃ§Ã£o, dispositivo, aplicaÃ§Ã£o) e aplicam decisÃµes (permitir, bloquear, exigir MFA) baseadas em regras organizacionais.'
    },
    {
      id: 'az900-17-q3',
      question: 'Uma empresa quer colaborar com uma organizaÃ§Ã£o parceira. FuncionÃ¡rios do parceiro devem usar suas credenciais existentes da empresa para acessar recursos compartilhados. Qual recurso permite isso?',
      options: ['Identidades B2C', 'Identidades externas B2B', 'Entra Domain Services', 'VPN Gateway'],
      correctAnswer: 1,
      explanation: 'Identidades externas B2B (Business-to-Business) permitem convidar usuÃ¡rios de outras organizaÃ§Ãµes. Eles se autenticam com seu prÃ³prio provedor de identidade e acessam recursos que vocÃª compartilha com eles.'
    },
    {
      id: 'az900-17-q4',
      question: 'Se uma funÃ§Ã£o Contributor Ã© atribuÃ­da no nÃ­vel da subscription, a que o usuÃ¡rio tem acesso?',
      options: ['Apenas Ã s configuraÃ§Ãµes daquela subscription', 'Todos os resource groups e recursos dentro daquela subscription', 'Apenas ao primeiro resource group', 'Nada â€” Contributor requer atribuiÃ§Ã£o no nÃ­vel do recurso'],
      correctAnswer: 1,
      explanation: 'PermissÃµes RBAC sÃ£o herdadas para baixo. Uma funÃ§Ã£o Contributor no nÃ­vel da subscription dÃ¡ acesso total (exceto atribuiÃ§Ãµes de funÃ§Ã£o) a TODOS os resource groups e recursos dentro daquela subscription.'
    },
    {
      id: 'az900-17-q5',
      question: 'Qual Ã© a diferenÃ§a entre as funÃ§Ãµes Owner e Contributor?',
      options: ['Owner pode criar recursos; Contributor nÃ£o pode', 'Owner pode atribuir funÃ§Ãµes a outros; Contributor nÃ£o pode', 'Contributor tem mais permissÃµes que Owner', 'NÃ£o hÃ¡ diferenÃ§a'],
      correctAnswer: 1,
      explanation: 'Tanto Owner quanto Contributor tÃªm acesso total para gerenciar recursos. A diferenÃ§a principal Ã© que Owner tambÃ©m pode gerenciar atribuiÃ§Ãµes de funÃ§Ã£o (conceder/revogar acesso a outros), enquanto Contributor nÃ£o pode.'
    }
  ]}
/>

## Saiba Mais

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) â€” Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure identity, access, and security](https://learn.microsoft.com/en-us/training/modules/describe-azure-identity-access-security/)
- [Azure RBAC documentation](https://learn.microsoft.com/en-us/azure/role-based-access-control/)
