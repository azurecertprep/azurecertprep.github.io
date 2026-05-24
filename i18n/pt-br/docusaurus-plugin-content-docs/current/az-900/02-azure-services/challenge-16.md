---
sidebar_position: 10
title: "Desafio 16: Microsoft Entra ID e AutenticaÃ§Ã£o"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 16: Microsoft Entra ID e AutenticaÃ§Ã£o

:::info Tempo Estimado
**25-35 min** | **Custo**: Gratuito | **DomÃ­nio**: Arquitetura e ServiÃ§os Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever serviÃ§os de diretÃ³rio (Microsoft Entra ID, Entra Domain Services)
- Descrever mÃ©todos de autenticaÃ§Ã£o (SSO, MFA, passwordless)

## VisÃ£o Geral

**Microsoft Entra ID** (anteriormente Azure Active Directory) Ã© o serviÃ§o de gerenciamento de identidade e acesso baseado em nuvem do Azure. Ele lida com autenticaÃ§Ã£o (provar quem vocÃª Ã©) e autorizaÃ§Ã£o (o que vocÃª tem permissÃ£o para fazer).

Diferente do Active Directory tradicional (que roda no Windows Server), o Entra ID Ã© nativo da nuvem e projetado para autenticaÃ§Ã£o em escala de internet, incluindo aplicaÃ§Ãµes web, aplicativos mÃ³veis e serviÃ§os SaaS.

## Explorar

### Tarefa 1: Entender Entra ID vs Active Directory

| Recurso | Active Directory (on-prem) | Microsoft Entra ID (nuvem) |
|---------|---------------------------|---------------------------|
| Protocolo | Kerberos, LDAP | OAuth 2.0, SAML, OpenID Connect |
| Escopo | Apenas rede interna | AbrangÃªncia pela internet |
| Estrutura | OUs, florestas, domÃ­nios | Tenant plano |
| Gerenciamento de dispositivos | Group Policy | Intune + Conditional Access |
| AutenticaÃ§Ã£o | UsuÃ¡rio/senha | MFA, passwordless, SSO |

### Tarefa 2: Explorar Entra ID no Portal

1. No Azure Portal, pesquise por **Microsoft Entra ID**
2. Clique nele para abrir o blade do Entra ID
3. Explore:
   - **Overview**: Nome do tenant, ID, nÃ­vel de licenÃ§a
   - **Users**: Todos os usuÃ¡rios no seu tenant
   - **Groups**: Grupos de seguranÃ§a e grupos Microsoft 365
   - **Enterprise applications**: Apps SaaS integrados
4. Esta Ã© uma exploraÃ§Ã£o somente leitura â€” sem custo

### Tarefa 3: Entender mÃ©todos de autenticaÃ§Ã£o

| MÃ©todo | SeguranÃ§a | ExperiÃªncia do usuÃ¡rio | Exemplo |
|--------|-----------|----------------------|---------|
| **Apenas senha** | Baixa | FÃ¡cil | Login tradicional |
| **MFA (Multi-Factor)** | Alta | Moderada | Senha + aprovaÃ§Ã£o no telefone |
| **Passwordless** | Muito alta | Excelente | Windows Hello, chave FIDO2 |
| **SSO (Single Sign-On)** | Varia | Melhor | Um login para todos os apps |

**Multi-Factor Authentication (MFA)** usa 2+ de:
- Algo que vocÃª **sabe** (senha, PIN)
- Algo que vocÃª **tem** (telefone, chave de seguranÃ§a)
- Algo que vocÃª **Ã©** (impressÃ£o digital, rosto)

### Tarefa 4: Entender SSO

**Single Sign-On (SSO)** significa que um login dÃ¡ acesso a mÃºltiplas aplicaÃ§Ãµes:

```text
User logs in ONCE to Entra ID
    â†’ Access Microsoft 365 âœ“
    â†’ Access Salesforce âœ“
    â†’ Access GitHub âœ“
    â†’ Access custom apps âœ“
```

BenefÃ­cios:
- UsuÃ¡rios lembram uma senha (menos chamadas ao help desk)
- Controle de acesso centralizado
- Mais fÃ¡cil desabilitar acesso quando funcionÃ¡rio sai

### Tarefa 5: Entra Domain Services

**Microsoft Entra Domain Services** fornece serviÃ§os de domÃ­nio gerenciados:
- Ingresso no domÃ­nio, group policy, LDAP, Kerberos/NTLM
- Sem necessidade de gerenciar controladores de domÃ­nio
- Integra com seu tenant Entra ID
- Caso de uso: Apps legados que precisam de protocolos tradicionais do AD

| CenÃ¡rio | Use |
|---------|-----|
| App web moderno precisa de autenticaÃ§Ã£o | Entra ID |
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

| Conceito | DescriÃ§Ã£o |
|----------|-----------|
| **Microsoft Entra ID** | Gerenciamento de identidade e acesso baseado em nuvem (anteriormente Azure AD) |
| **Tenant** | Uma instÃ¢ncia dedicada do Entra ID para sua organizaÃ§Ã£o |
| **AutenticaÃ§Ã£o** | Provar identidade (quem Ã© vocÃª?) |
| **AutorizaÃ§Ã£o** | Verificar permissÃµes (o que vocÃª pode fazer?) |
| **MFA** | Requer 2+ mÃ©todos de verificaÃ§Ã£o para login |
| **SSO** | Um login fornece acesso a mÃºltiplas aplicaÃ§Ãµes |
| **Passwordless** | Login sem senha (biometria, chaves de seguranÃ§a) |
| **Entra Domain Services** | ServiÃ§os de domÃ­nio gerenciados (LDAP, Kerberos) sem controladores de domÃ­nio |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-16-q1',
      question: 'O que Ã© Microsoft Entra ID?',
      options: ['Uma ferramenta de gerenciamento de mÃ¡quinas virtuais', 'Um serviÃ§o de gerenciamento de identidade e acesso baseado em nuvem', 'Um serviÃ§o de armazenamento de arquivos', 'Um serviÃ§o de rede'],
      correctAnswer: 1,
      explanation: 'Microsoft Entra ID (anteriormente Azure Active Directory) Ã© um serviÃ§o de gerenciamento de identidade e acesso baseado em nuvem que ajuda usuÃ¡rios a fazer login e acessar recursos.'
    },
    {
      id: 'az900-16-q2',
      question: 'Multi-Factor Authentication (MFA) requer no mÃ­nimo quantos mÃ©todos de verificaÃ§Ã£o?',
      options: ['1', '2', '3', '4'],
      correctAnswer: 1,
      explanation: 'MFA requer pelo menos 2 mÃ©todos de verificaÃ§Ã£o diferentes de categorias distintas: algo que vocÃª sabe, algo que vocÃª tem ou algo que vocÃª Ã©.'
    },
    {
      id: 'az900-16-q3',
      question: 'Uma empresa quer que os funcionÃ¡rios faÃ§am login uma vez e acessem todas as aplicaÃ§Ãµes de negÃ³cios sem fazer login novamente. Qual recurso fornece isso?',
      options: ['Multi-Factor Authentication', 'Single Sign-On (SSO)', 'Conditional Access', 'AutenticaÃ§Ã£o passwordless'],
      correctAnswer: 1,
      explanation: 'Single Sign-On (SSO) permite que os usuÃ¡rios se autentiquem uma vez e depois acessem mÃºltiplas aplicaÃ§Ãµes sem serem solicitados a fazer login novamente para cada uma.'
    },
    {
      id: 'az900-16-q4',
      question: 'Uma organizaÃ§Ã£o tem uma aplicaÃ§Ã£o legada que requer autenticaÃ§Ã£o LDAP e Kerberos. Eles querem executÃ¡-la no Azure sem gerenciar controladores de domÃ­nio. O que devem usar?',
      options: ['Microsoft Entra ID', 'Microsoft Entra Domain Services', 'Azure Virtual Machines com AD', 'Azure Functions'],
      correctAnswer: 1,
      explanation: 'Microsoft Entra Domain Services fornece serviÃ§os de domÃ­nio gerenciados (LDAP, Kerberos, NTLM, Group Policy) sem implantar ou gerenciar controladores de domÃ­nio. Ã‰ projetado para apps legados no Azure.'
    },
    {
      id: 'az900-16-q5',
      question: 'Qual mÃ©todo de autenticaÃ§Ã£o Ã© considerado o mais seguro e fornece a melhor experiÃªncia do usuÃ¡rio?',
      options: ['Apenas senha', 'Senha + cÃ³digo SMS', 'Passwordless (Windows Hello, FIDO2)', 'Perguntas de seguranÃ§a'],
      correctAnswer: 2,
      explanation: 'AutenticaÃ§Ã£o passwordless (Windows Hello, chaves de seguranÃ§a FIDO2) Ã© a mais segura porque nÃ£o hÃ¡ senha para roubar ou fazer phishing. TambÃ©m fornece excelente experiÃªncia do usuÃ¡rio com login biomÃ©trico ou baseado em chave.'
    }
  ]}
/>

## Saiba Mais

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) â€” Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure identity, access, and security](https://learn.microsoft.com/en-us/training/modules/describe-azure-identity-access-security/)
- [Microsoft Entra ID documentation](https://learn.microsoft.com/en-us/entra/fundamentals/)
