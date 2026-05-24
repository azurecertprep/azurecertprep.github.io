---
sidebar_position: 4
title: "Desafio 04: Projetar AutenticaÃ§Ã£o para AplicaÃ§Ãµes Cloud-Native"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 04: projetar autenticaÃ§Ã£o para aplicaÃ§Ãµes Cloud-Native

:::info Tempo Estimado e Custo

**75-90 min** | **Custo estimado**: $0-5 | **Peso no Exame: 25-30%**

:::

## IntroduÃ§Ã£o

A Relecloud Ã© uma empresa SaaS que fornece software de gerenciamento de eventos. Eles estao construindo duas novas aplicaÃ§Ãµes no Azure:

1. **Portal de OperaÃ§Ãµes Internas**: Usado por 500 funcionÃ¡rios da Relecloud para gerenciar eventos, visualizar analytics Ã© configurar a plataforma. Os funcionÃ¡rios usam laptops corporativos com licencas do Microsoft 365 e contas do Entra ID. A equipe de seguranÃ§a exige MFA para todo acesso e quer bloquear sign-ins de localizacoes nÃ£o confiaveis.

2. **Plataforma de Reservas para Clientes**: Uma aplicaÃ§Ã£o web pÃºblica usada por mais de 100.000 consumidores para navegar eventos, comprar ingressos Ã© gerenciar suas contas. Os clientes devem poder se cadastrar com email/senha ou suas contas existentes do Google/Facebook. A equipe de marketing quer uma experiÃªncia de login com marca que combine com a identidade visual da Relecloud.

Ambas as aplicaÃ§Ãµes compartilham uma API backend comum hospedada no Azure App Service que acessa Azure SQL Database, Azure Storage e Azure Key Vault. A API deve se autenticar nesses serviÃ§os sem armazenar credenciais em cÃ³digo ou configuraÃ§Ã£o.

Sua tarefa Ã© projetar a arquitetura completa de autenticaÃ§Ã£o para ambas as aplicaÃ§Ãµes e seus serviÃ§os backend.

## Habilidades do exame cobertas

- Recomendar uma soluÃ§Ã£o de autenticaÃ§Ã£o
- Recomendar uma soluÃ§Ã£o de gerenciamento de identidade
- Recomendar uma soluÃ§Ã£o para autorizar acesso a recursos do Azure

## Tarefas de design

### Parte 1: seleÃ§Ã£o da estratÃ©gia de autenticaÃ§Ã£o

1. Para cada aplicaÃ§Ã£o, determine a plataforma de identidade aprÃ³priada:

| Requirement | Internal Portal | Customer Platform |
|-------------|----------------|-------------------|
| Identity provider | | |
| User population | | |
| Sign-up/sign-in experience | | |
| Social identity support | | |
| MFA requirements | | |
| Branding customization | | |
| Licensing model | | |

2. Justifique por que vocÃª escolheu Microsoft Entra ID vs. Azure AD B2C vs. Azure AD B2B para cada aplicaÃ§Ã£o. Documente cenÃ¡rios onde a alternativa seria mais aprÃ³priada.

### Parte 2: design de autenticaÃ§Ã£o do portal interno

3. Projete o conjunto de polÃ­ticas de Conditional Access para o Portal de OperaÃ§Ãµes Internas:
   - PolÃ­tica 1: Exigir MFA para todos os usuÃ¡rios
   - PolÃ­tica 2: Bloquear acesso de paises fora das regiÃµes de operaÃ§Ã£o da empresa
   - PolÃ­tica 3: Exigir dispositivo em conformidade para acesso a funÃ§Ãµes administrativas sensÃ­veis
   - PolÃ­tica 4: Aplicar frequÃªncia de sign-in (reautenticar a cada 8 horas)

4. Projete o fluxo de autenticaÃ§Ã£o para o portal interno:
   - Qual tipo de grant OAuth 2.0/OIDC usar (Ã© por que)
   - Tempo de vida do token e comportamento de refresh
   - Abordagem de gerenciamento de sessÃ£o

### Parte 3: design de autenticaÃ§Ã£o da plataforma de clientes

5. Projete a configuraÃ§Ã£o do Azure AD B2C para a plataforma de clientes:
   - User flows vs. custom policies: qual abordagem e por que
   - Identity providers a configurar (contas locais + social)
   - Requisitos de branding customizado
   - Fluxo de redefinicao de senha self-service

6. Projete a estratÃ©gia de claims do token:
   - Quais claims incluir em ID tokens vs. access tokens
   - Claims customizados (nÃ­vel de fidelidade, nÃ­vel de assinatura)
   - Consideracoes de tempo de vida do token para cenÃ¡rios de consumidor

### Parte 4: autenticaÃ§Ã£o ServiÃ§o-a-ServiÃ§o

7. Projete a estratÃ©gia de managed identity para a API backend:
   - System-assigned vs. user-assigned managed identity (Ã© por que)
   - Como o App Service se autentica no Azure SQL Database
   - Como o App Service se autentica no Azure Key Vault
   - Como o App Service se autentica no Azure Storage

8. Para cenÃ¡rios onde managed identity nÃ£o esta disponÃ­vel (por exemplo, chamadas a APIs de terceiros), projete uma abordagem segura de gerenciamento de credenciais usando Key Vault.

### Parte 5: implementar prova de conceito

9. Registre uma aplicaÃ§Ã£o no Entra ID para o Portal Interno com redirect URIs e permissÃµes de API aprÃ³priadas.

10. Crie uma managed identity para um App Service e conceda acesso a um Key Vault.

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-04"
  items={[
    "Identity platform selection justified for both internal and customer-facing applications",
    "Conditional Access policies designed covering MFA, location, device compliance, and session control",
    "B2C user flow or custom policy approach selected with social identity provider integration designed",
    "Managed identity strategy documented for all service-to-service authentication scenÃ¡rios",
    "App registration created with correct permissions and redirect URIs",
    "Managed identity assigned and Key Vault access verified"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Escolhendo Entre Entra ID, B2C e B2B</summary>

| ScenÃ¡rio | Solution | Reason |
|----------|----------|--------|
| Employees accessing corporate apps | **Entra ID** | Users already exist in corporate directory, Conditional Access, MFA, device compliance |
| External consumers (self-service sign-up) | **Azure AD B2C** | Separate directory, social identity providers, custom branding, scales to millions |
| Business partners accessing your apps | **Azure AD B2B** | Partners use their own identity, appears as guest in your directory, governed by your policies |
| Both employees AND consumers in same app | **Entra External ID** (successor to B2C) | Unified platform for workforce + customer identities |

Diferenca chave: B2C Ã© um diretÃ³rio (tenant) completamente separado com suas prÃ³prias polÃ­ticas, branding e armazenamento de usuÃ¡rios. Ele NAO compartilha o diretÃ³rio corporativo do Entra ID.

</details>

<details>
<summary>Dica 2: Design de PolÃ­ticas de Conditional Access</summary>

PolÃ­ticas de Conditional Access sÃ£o avaliadas como instrucoes IF-THEN: SE uma condiÃ§Ã£o e atendida, ENTAO aplique um controle de acesso.

Sinais chave (condiÃ§Ãµes):
- Associacao a usuÃ¡rio/grupo
- AplicaÃ§Ã£o na nuvem sendo acessada
- Plataforma do dispositivo e estado de conformidade
- LocalizaÃ§Ã£o (locais nomeados, IPs confiaveis)
- Aplicativo cliente (navegador, app movel, app desktop)
- NÃ­vel de risco de sign-in (do Identity Protection)

Controles chave (grants/sessÃ£o):
- Exigir MFA
- Exigir que o dispositivo esteja marcado como em conformidade
- Exigir Entra hybrid join
- Bloquear acesso
- Controles de sessÃ£o (frequÃªncia de sign-in, navegador persistente)

Principio de design: Comece com uma polÃ­tica baseline exigindo MFA para todos os usuÃ¡rios, depois adicione polÃ­ticas adicionais para cenÃ¡rios especÃ­ficos. Sempre crie uma conta de acesso de emergencia ("break glass") excluida de todas as polÃ­ticas.

</details>

<details>
<summary>Dica 3: ConfiguraÃ§Ã£o de App Registration e Managed Identity</summary>

```bash
# Register the internal portal app
az ad app create \
  --display-name "Relecloud Internal Portal" \
  --sign-in-audience "AzureADMyOrg" \
  --web-redirect-uris "https://portal.relecloud.com/auth/callback" \
  --enable-id-token-issuance true

# Create a service principal for the app
APP_ID=$(az ad app list --display-name "Relecloud Internal Portal" --query "[0].appId" -o tsv)
az ad sp create --id $APP_ID

# Enable system-assigned managed identity on App Service
az webapp identity assign \
  --name app-relecloud-api \
  --resource-group rg-relecloud

# Get the managed identity principal ID
IDENTITY_ID=$(az webapp identity show \
  --name app-relecloud-api \
  --resource-group rg-relecloud \
  --query principalId -o tsv)

# Grant Key Vault access to the managed identity
az keyvault set-policy \
  --name kv-relecloud-prod \
  --object-id $IDENTITY_ID \
  --secret-permissions get list
```

</details>

<details>
<summary>Dica 4: Managed Identity para Azure SQL</summary>

Para autenticaÃ§Ã£o do App Service no Azure SQL Database sem senhas:

1. Habilite system-assigned managed identity no App Service
2. Crie um contained user no Azure SQL mapeado para a managed identity
3. Use `Authentication=Active Directory Managed Identity` na connection string

```sql
-- Run in Azure SQL Database (connected as AD admin)
CREATE USER [app-relecloud-api] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [app-relecloud-api];
ALTER ROLE db_datawriter ADD MEMBER [app-relecloud-api];
```

Connection string (nenhuma senha necessÃ¡ria):
```text
Server=tcp:sql-relecloud.database.windows.net,1433;Database=releclouddb;Authentication=Active Directory Managed Identity;
```

System-assigned vs. User-assigned:
- **System-assigned**: Vinculada a um recurso, excluida quando o recurso e excluido. Mais simples para cenÃ¡rios de recurso Ãºnico.
- **User-assigned**: Ciclo de vida independente, pode ser compartilhada entre mÃºltiplos recursos. Melhor para deployment slots, deployments blue-green e quando mÃºltiplos App Services precisam da mesma identidade.

</details>

<details>
<summary>Dica 5: B2C User Flows vs. Custom Policies</summary>

**User flows** (recomendado para a maioria dos cenÃ¡rios):
- Pre-construidos, configuraveis via portal do Azure
- Suportam sign-up/sign-in, edicao de perfil, redefinicao de senha
- Podem adicionar provedores sociais (Google, Facebook, Apple)
- Branding customizado via templates HTML/CSS
- Extensibilidade limitada (API connectors para lÃ³gica customizada)

**Custom policies** (Identity Experience Framework baseado em XML):
- Controle total sobre cada etapa da jornada de autenticaÃ§Ã£o
- CenÃ¡rios complexos: verificaÃ§Ã£o em mÃºltiplas etapas, lÃ³gica condicional, chamadas a APIs externas
- Significativamente mais complexas de implementar Ã© manter
- Necessarias para: provedores MFA customizados, transformacoes complexas de claims, integracoes de REST API no meio do fluxo

Para a plataforma de clientes da Relecloud, **user flows** sÃ£o suficientes porque os requisitos (cadastro com email + social, branding, redefinicao de senha) sÃ£o padrÃµes. Use custom policies apenas se vocÃª precisar de lÃ³gica de workflow nÃ£o padrÃ£o.

</details>

## Recursos de aprendizagem

- [Microsoft Entra ID documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [Azure AD B2C overview](https://learn.microsoft.com/en-us/azure/active-directory-b2c/overview)
- [Conditional Access overview](https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview)
- [Managed identities overview](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview)
- [Microsoft identity platform and OAuth 2.0 flows](https://learn.microsoft.com/en-us/entra/identity-platform/v2-app-types)
- [B2C user flows and custom policies](https://learn.microsoft.com/en-us/azure/active-directory-b2c/user-flow-overview)

## VerificaÃ§Ã£o de conhecimento

<details>
<summary>1. A plataforma de clientes da Relecloud precisa suportar cadastro com email, Google e Facebook para mais de 100.000 consumidores. A equipe de marketing quer uma pagina de login totalmente personalizada. Qual soluÃ§Ã£o de identidade vocÃª deve recomendar?</summary>

**Azure AD B2C.** Ele e construido especÃ­ficamente para aplicaÃ§Ãµes voltadas ao consumidor com: suporte a provedores de identidade social (Google, Facebook, Apple), cadastro self-service com email, UI totalmente customizavel via templates HTML/CSS, diretÃ³rio de usuÃ¡rios separado que escala para milhÃµes de usuÃ¡rios Ã© um modelo de precificacao baseado em consumo. Entra ID (workforce) exigiria a criaÃ§Ã£o de contas guest para cada consumidor, o que nÃ£o Ã© escalÃ¡vel. Entra External ID e a evolucao do B2C e tambÃ©m pode ser aprÃ³priado.

</details>

<details>
<summary>2. A API backend no App Service precisa acessar Azure SQL Database, Key Vault Ã© uma API de pagamento de terceiros. Qual mÃ©todo de autenticaÃ§Ã£o vocÃª deve usar para cada um?</summary>

**Azure SQL e Key Vault: Managed Identity.** A managed identity do App Service se autentica diretamente nesses serviÃ§os sem nenhuma credencial armazenada. Para Azure SQL, crie um contained database user mapeado para a identidade. Para Key Vault, atribua uma access policy ou role RBAC concedendo permissÃµes de leitura de secrets.

**API de pagamento de terceiros: Client credentials armazenadas no Key Vault.** Como managed identity sÃ³ funciona com serviÃ§os Azure e Microsoft que suportam autenticaÃ§Ã£o Entra ID, armazene a chave/secret da API de pagamento no Key Vault e recupere-a em tempo de execuÃ§Ã£o usando a managed identity. Isso elimina credenciais do cÃ³digo e dos arquivos de configuraÃ§Ã£o.

</details>

<details>
<summary>3. Uma polÃ­tica de Conditional Access exige MFA para todos os usuÃ¡rios acessando o Portal Interno. Uma emergencia ocorre e a conta de admin e bloqueada devido a problemas com MFA. Como isso deve ser prevenido no design?</summary>

**Crie contas de acesso de emergencia (break glass) excluidas de todas as polÃ­ticas de Conditional Access.** Essas contas devem: (1) Ser contas somente na nuvem (nÃ£o sincronizadas do on-prem), (2) Usar senhas longas e complexas armazenadas em um cofre fÃ­sico, (3) Ser excluidas de TODAS as polÃ­ticas de Conditional Access, (4) Ter a role de Global Administrator, (5) Ser monitoradas com alertas em qualquer atividade de sign-in, (6) Ter pelo menos duas contas para redundÃ¢ncia. A Microsoft recomenda pelo menos duas contas break-glass por tenant.

</details>

<details>
<summary>4. Quando vocÃª deve escolher uma user-assigned managed identity em vez de uma system-assigned managed identity?</summary>

**Escolha user-assigned managed identity quando:** (1) MÃºltiplos recursos precisam da mesma identidade e permissÃµes (por exemplo, mÃºltiplos App Services acessando o mesmo banco de dados), (2) VocÃª usa deployment slots e precisa que a identidade persista durante trocas de slot, (3) VocÃª quer que o ciclo de vida da identidade seja independente do recurso (prÃ©-criar identidade e permissÃµes antes de implantar a aplicaÃ§Ã£o), (4) VocÃª precisa atribuir a identidade durante a criaÃ§Ã£o do recurso via templates IaC. System-assigned e mais simples para cenÃ¡rios de recurso Ãºnico onde a identidade deve ser automaticamente limpa quando o recurso e excluido.

</details>

## Limpeza

```bash
# Delete app registration
APP_ID=$(az ad app list --display-name "Relecloud Internal Portal" --query "[0].appId" -o tsv)
az ad app delete --id $APP_ID

# Remove managed identity Key Vault access
az keyvault delete-policy --name kv-relecloud-prod --object-id $IDENTITY_ID

# If App Service was created for this challenge:
az group delete --name rg-relecloud --yes --no-wait
```

---

**PrÃ³ximo**: [Challenge 05: Design Identity Management](/docs/az-305/identity-governance-monitoring/challenge-05)
