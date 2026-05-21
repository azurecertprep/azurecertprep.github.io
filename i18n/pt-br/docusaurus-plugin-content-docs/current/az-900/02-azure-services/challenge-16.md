---
sidebar_position: 10
title: "Desafio 16: Microsoft Entra ID e Autenticação"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 16: Microsoft Entra ID e Autenticação

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **Domínio**: Arquitetura e Serviços Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever serviços de diretório (Microsoft Entra ID, Entra Domain Services)
- Descrever métodos de autenticação (SSO, MFA, passwordless)

## Visão Geral

**Microsoft Entra ID** (anteriormente Azure Active Directory) é o serviço de gerenciamento de identidade e acesso baseado em nuvem do Azure. Ele lida com autenticação (provar quem você é) e autorização (o que você tem permissão para fazer).

Diferente do Active Directory tradicional (que roda no Windows Server), o Entra ID é nativo da nuvem e projetado para autenticação em escala de internet, incluindo aplicações web, aplicativos móveis e serviços SaaS.

## Explorar

### Tarefa 1: Entender Entra ID vs Active Directory

| Recurso | Active Directory (on-prem) | Microsoft Entra ID (nuvem) |
|---------|---------------------------|---------------------------|
| Protocolo | Kerberos, LDAP | OAuth 2.0, SAML, OpenID Connect |
| Escopo | Apenas rede interna | Abrangência pela internet |
| Estrutura | OUs, florestas, domínios | Tenant plano |
| Gerenciamento de dispositivos | Group Policy | Intune + Conditional Access |
| Autenticação | Usuário/senha | MFA, passwordless, SSO |

### Tarefa 2: Explorar Entra ID no Portal

1. No Azure Portal, pesquise por **Microsoft Entra ID**
2. Clique nele para abrir o blade do Entra ID
3. Explore:
   - **Overview**: Nome do tenant, ID, nível de licença
   - **Users**: Todos os usuários no seu tenant
   - **Groups**: Grupos de segurança e grupos Microsoft 365
   - **Enterprise applications**: Apps SaaS integrados
4. Esta é uma exploração somente leitura — sem custo

### Tarefa 3: Entender métodos de autenticação

| Método | Segurança | Experiência do usuário | Exemplo |
|--------|-----------|----------------------|---------|
| **Apenas senha** | Baixa | Fácil | Login tradicional |
| **MFA (Multi-Factor)** | Alta | Moderada | Senha + aprovação no telefone |
| **Passwordless** | Muito alta | Excelente | Windows Hello, chave FIDO2 |
| **SSO (Single Sign-On)** | Varia | Melhor | Um login para todos os apps |

**Multi-Factor Authentication (MFA)** usa 2+ de:
- Algo que você **sabe** (senha, PIN)
- Algo que você **tem** (telefone, chave de segurança)
- Algo que você **é** (impressão digital, rosto)

### Tarefa 4: Entender SSO

**Single Sign-On (SSO)** significa que um login dá acesso a múltiplas aplicações:

```
User logs in ONCE to Entra ID
    → Access Microsoft 365 ✓
    → Access Salesforce ✓
    → Access GitHub ✓
    → Access custom apps ✓
```

Benefícios:
- Usuários lembram uma senha (menos chamadas ao help desk)
- Controle de acesso centralizado
- Mais fácil desabilitar acesso quando funcionário sai

### Tarefa 5: Entra Domain Services

**Microsoft Entra Domain Services** fornece serviços de domínio gerenciados:
- Ingresso no domínio, group policy, LDAP, Kerberos/NTLM
- Sem necessidade de gerenciar controladores de domínio
- Integra com seu tenant Entra ID
- Caso de uso: Apps legados que precisam de protocolos tradicionais do AD

| Cenário | Use |
|---------|-----|
| App web moderno precisa de autenticação | Entra ID |
| App legado precisa de LDAP/Kerberos | Entra Domain Services |
| Servidores on-prem precisam de Group Policy | AD tradicional (on-prem) |

:::tip Alternativa Azure CLI
```bash
# List users in your Entra ID tenant (first 5)
az ad user list --query "[0:5].{Name:displayName, UPN:userPrincipalName}" --output table

# Show your tenant info
az account show --query "{TenantId:tenantId, Name:name}" --output table
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **Microsoft Entra ID** | Gerenciamento de identidade e acesso baseado em nuvem (anteriormente Azure AD) |
| **Tenant** | Uma instância dedicada do Entra ID para sua organização |
| **Autenticação** | Provar identidade (quem é você?) |
| **Autorização** | Verificar permissões (o que você pode fazer?) |
| **MFA** | Requer 2+ métodos de verificação para login |
| **SSO** | Um login fornece acesso a múltiplas aplicações |
| **Passwordless** | Login sem senha (biometria, chaves de segurança) |
| **Entra Domain Services** | Serviços de domínio gerenciados (LDAP, Kerberos) sem controladores de domínio |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-16-q1',
      question: 'O que é Microsoft Entra ID?',
      options: ['Uma ferramenta de gerenciamento de máquinas virtuais', 'Um serviço de gerenciamento de identidade e acesso baseado em nuvem', 'Um serviço de armazenamento de arquivos', 'Um serviço de rede'],
      correctAnswer: 1,
      explanation: 'Microsoft Entra ID (anteriormente Azure Active Directory) é um serviço de gerenciamento de identidade e acesso baseado em nuvem que ajuda usuários a fazer login e acessar recursos.'
    },
    {
      id: 'az900-16-q2',
      question: 'Multi-Factor Authentication (MFA) requer no mínimo quantos métodos de verificação?',
      options: ['1', '2', '3', '4'],
      correctAnswer: 1,
      explanation: 'MFA requer pelo menos 2 métodos de verificação diferentes de categorias distintas: algo que você sabe, algo que você tem ou algo que você é.'
    },
    {
      id: 'az900-16-q3',
      question: 'Uma empresa quer que os funcionários façam login uma vez e acessem todas as aplicações de negócios sem fazer login novamente. Qual recurso fornece isso?',
      options: ['Multi-Factor Authentication', 'Single Sign-On (SSO)', 'Conditional Access', 'Autenticação passwordless'],
      correctAnswer: 1,
      explanation: 'Single Sign-On (SSO) permite que os usuários se autentiquem uma vez e depois acessem múltiplas aplicações sem serem solicitados a fazer login novamente para cada uma.'
    },
    {
      id: 'az900-16-q4',
      question: 'Uma organização tem uma aplicação legada que requer autenticação LDAP e Kerberos. Eles querem executá-la no Azure sem gerenciar controladores de domínio. O que devem usar?',
      options: ['Microsoft Entra ID', 'Microsoft Entra Domain Services', 'Azure Virtual Machines com AD', 'Azure Functions'],
      correctAnswer: 1,
      explanation: 'Microsoft Entra Domain Services fornece serviços de domínio gerenciados (LDAP, Kerberos, NTLM, Group Policy) sem implantar ou gerenciar controladores de domínio. É projetado para apps legados no Azure.'
    },
    {
      id: 'az900-16-q5',
      question: 'Qual método de autenticação é considerado o mais seguro e fornece a melhor experiência do usuário?',
      options: ['Apenas senha', 'Senha + código SMS', 'Passwordless (Windows Hello, FIDO2)', 'Perguntas de segurança'],
      correctAnswer: 2,
      explanation: 'Autenticação passwordless (Windows Hello, chaves de segurança FIDO2) é a mais segura porque não há senha para roubar ou fazer phishing. Também fornece excelente experiência do usuário com login biométrico ou baseado em chave.'
    }
  ]}
/>

## Saiba Mais

- 📚 [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) — Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure identity, access, and security](https://learn.microsoft.com/en-us/training/modules/describe-azure-identity-access-security/)
- [Microsoft Entra ID documentation](https://learn.microsoft.com/en-us/entra/fundamentals/)
