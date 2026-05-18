---
sidebar_position: 4
title: "Challenge 04: Design Authentication for Cloud-Native Apps"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 04: Design Authentication for Cloud-Native Apps

:::info Tempo Estimado e Custo

**75-90 min** | **Custo estimado**: $0-5 | **Peso no Exame: 25-30%**

:::

## Introducao

A Relecloud e uma empresa SaaS que fornece software de gerenciamento de eventos. Eles estao construindo duas novas aplicacoes no Azure:

1. **Portal de Operacoes Internas**: Usado por 500 funcionarios da Relecloud para gerenciar eventos, visualizar analytics e configurar a plataforma. Os funcionarios usam laptops corporativos com licencas do Microsoft 365 e contas do Entra ID. A equipe de seguranca exige MFA para todo acesso e quer bloquear sign-ins de localizacoes nao confiaveis.

2. **Plataforma de Reservas para Clientes**: Uma aplicacao web publica usada por mais de 100.000 consumidores para navegar eventos, comprar ingressos e gerenciar suas contas. Os clientes devem poder se cadastrar com email/senha ou suas contas existentes do Google/Facebook. A equipe de marketing quer uma experiencia de login com marca que combine com a identidade visual da Relecloud.

Ambas as aplicacoes compartilham uma API backend comum hospedada no Azure App Service que acessa Azure SQL Database, Azure Storage e Azure Key Vault. A API deve se autenticar nesses servicos sem armazenar credenciais em codigo ou configuracao.

Sua tarefa e projetar a arquitetura completa de autenticacao para ambas as aplicacoes e seus servicos backend.

## Habilidades do Exame Cobertas

- Recomendar uma solucao de autenticacao
- Recomendar uma solucao de gerenciamento de identidade
- Recomendar uma solucao para autorizar acesso a recursos do Azure

## Tarefas de Design

### Parte 1: Selecao da Estrategia de Autenticacao

1. Para cada aplicacao, determine a plataforma de identidade apropriada:

| Requirement | Internal Portal | Customer Platform |
|-------------|----------------|-------------------|
| Identity provider | | |
| User population | | |
| Sign-up/sign-in experience | | |
| Social identity support | | |
| MFA requirements | | |
| Branding customization | | |
| Licensing model | | |

2. Justifique por que voce escolheu Microsoft Entra ID vs. Azure AD B2C vs. Azure AD B2B para cada aplicacao. Documente cenarios onde a alternativa seria mais apropriada.

### Parte 2: Design de Autenticacao do Portal Interno

3. Projete o conjunto de politicas de Conditional Access para o Portal de Operacoes Internas:
   - Politica 1: Exigir MFA para todos os usuarios
   - Politica 2: Bloquear acesso de paises fora das regioes de operacao da empresa
   - Politica 3: Exigir dispositivo em conformidade para acesso a funcoes administrativas sensiveis
   - Politica 4: Aplicar frequencia de sign-in (reautenticar a cada 8 horas)

4. Projete o fluxo de autenticacao para o portal interno:
   - Qual tipo de grant OAuth 2.0/OIDC usar (e por que)
   - Tempo de vida do token e comportamento de refresh
   - Abordagem de gerenciamento de sessao

### Parte 3: Design de Autenticacao da Plataforma de Clientes

5. Projete a configuracao do Azure AD B2C para a plataforma de clientes:
   - User flows vs. custom policies: qual abordagem e por que
   - Identity providers a configurar (contas locais + social)
   - Requisitos de branding customizado
   - Fluxo de redefinicao de senha self-service

6. Projete a estrategia de claims do token:
   - Quais claims incluir em ID tokens vs. access tokens
   - Claims customizados (nivel de fidelidade, nivel de assinatura)
   - Consideracoes de tempo de vida do token para cenarios de consumidor

### Parte 4: Autenticacao Servico-a-Servico

7. Projete a estrategia de managed identity para a API backend:
   - System-assigned vs. user-assigned managed identity (e por que)
   - Como o App Service se autentica no Azure SQL Database
   - Como o App Service se autentica no Azure Key Vault
   - Como o App Service se autentica no Azure Storage

8. Para cenarios onde managed identity nao esta disponivel (por exemplo, chamadas a APIs de terceiros), projete uma abordagem segura de gerenciamento de credenciais usando Key Vault.

### Parte 5: Implementar Prova de Conceito

9. Registre uma aplicacao no Entra ID para o Portal Interno com redirect URIs e permissoes de API apropriadas.

10. Crie uma managed identity para um App Service e conceda acesso a um Key Vault.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-04"
  items={[
    "Identity platform selection justified for both internal and customer-facing applications",
    "Conditional Access policies designed covering MFA, location, device compliance, and session control",
    "B2C user flow or custom policy approach selected with social identity provider integration designed",
    "Managed identity strategy documented for all service-to-service authentication scenarios",
    "App registration created with correct permissions and redirect URIs",
    "Managed identity assigned and Key Vault access verified"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Escolhendo Entre Entra ID, B2C e B2B</summary>

| Scenario | Solution | Reason |
|----------|----------|--------|
| Employees accessing corporate apps | **Entra ID** | Users already exist in corporate directory, Conditional Access, MFA, device compliance |
| External consumers (self-service sign-up) | **Azure AD B2C** | Separate directory, social identity providers, custom branding, scales to millions |
| Business partners accessing your apps | **Azure AD B2B** | Partners use their own identity, appears as guest in your directory, governed by your policies |
| Both employees AND consumers in same app | **Entra External ID** (successor to B2C) | Unified platform for workforce + customer identities |

Diferenca chave: B2C e um diretorio (tenant) completamente separado com suas proprias politicas, branding e armazenamento de usuarios. Ele NAO compartilha o diretorio corporativo do Entra ID.

</details>

<details>
<summary>Dica 2: Design de Politicas de Conditional Access</summary>

Politicas de Conditional Access sao avaliadas como instrucoes IF-THEN: SE uma condicao e atendida, ENTAO aplique um controle de acesso.

Sinais chave (condicoes):
- Associacao a usuario/grupo
- Aplicacao na nuvem sendo acessada
- Plataforma do dispositivo e estado de conformidade
- Localizacao (locais nomeados, IPs confiaveis)
- Aplicativo cliente (navegador, app movel, app desktop)
- Nivel de risco de sign-in (do Identity Protection)

Controles chave (grants/sessao):
- Exigir MFA
- Exigir que o dispositivo esteja marcado como em conformidade
- Exigir Entra hybrid join
- Bloquear acesso
- Controles de sessao (frequencia de sign-in, navegador persistente)

Principio de design: Comece com uma politica baseline exigindo MFA para todos os usuarios, depois adicione politicas adicionais para cenarios especificos. Sempre crie uma conta de acesso de emergencia ("break glass") excluida de todas as politicas.

</details>

<details>
<summary>Dica 3: Configuracao de App Registration e Managed Identity</summary>

```bash
# Register the Internal Portal app
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

Para autenticacao do App Service no Azure SQL Database sem senhas:

1. Habilite system-assigned managed identity no App Service
2. Crie um contained user no Azure SQL mapeado para a managed identity
3. Use `Authentication=Active Directory Managed Identity` na connection string

```sql
-- Run in Azure SQL Database (connected as AD admin)
CREATE USER [app-relecloud-api] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [app-relecloud-api];
ALTER ROLE db_datawriter ADD MEMBER [app-relecloud-api];
```

Connection string (nenhuma senha necessaria):
```
Server=tcp:sql-relecloud.database.windows.net,1433;Database=releclouddb;Authentication=Active Directory Managed Identity;
```

System-assigned vs. User-assigned:
- **System-assigned**: Vinculada a um recurso, excluida quando o recurso e excluido. Mais simples para cenarios de recurso unico.
- **User-assigned**: Ciclo de vida independente, pode ser compartilhada entre multiplos recursos. Melhor para deployment slots, deployments blue-green e quando multiplos App Services precisam da mesma identidade.

</details>

<details>
<summary>Dica 5: B2C User Flows vs. Custom Policies</summary>

**User flows** (recomendado para a maioria dos cenarios):
- Pre-construidos, configuraveis via portal do Azure
- Suportam sign-up/sign-in, edicao de perfil, redefinicao de senha
- Podem adicionar provedores sociais (Google, Facebook, Apple)
- Branding customizado via templates HTML/CSS
- Extensibilidade limitada (API connectors para logica customizada)

**Custom policies** (Identity Experience Framework baseado em XML):
- Controle total sobre cada etapa da jornada de autenticacao
- Cenarios complexos: verificacao em multiplas etapas, logica condicional, chamadas a APIs externas
- Significativamente mais complexas de implementar e manter
- Necessarias para: provedores MFA customizados, transformacoes complexas de claims, integracoes de REST API no meio do fluxo

Para a plataforma de clientes da Relecloud, **user flows** sao suficientes porque os requisitos (cadastro com email + social, branding, redefinicao de senha) sao padroes. Use custom policies apenas se voce precisar de logica de workflow nao padrao.

</details>

## Recursos de Aprendizagem

- [Microsoft Entra ID documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [Azure AD B2C overview](https://learn.microsoft.com/en-us/azure/active-directory-b2c/overview)
- [Conditional Access overview](https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview)
- [Managed identities overview](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview)
- [Microsoft identity platform and OAuth 2.0 flows](https://learn.microsoft.com/en-us/entra/identity-platform/v2-app-types)
- [B2C user flows and custom policies](https://learn.microsoft.com/en-us/azure/active-directory-b2c/user-flow-overview)

## Verificacao de Conhecimento

<details>
<summary>1. A plataforma de clientes da Relecloud precisa suportar cadastro com email, Google e Facebook para mais de 100.000 consumidores. A equipe de marketing quer uma pagina de login totalmente personalizada. Qual solucao de identidade voce deve recomendar?</summary>

**Azure AD B2C.** Ele e construido especificamente para aplicacoes voltadas ao consumidor com: suporte a provedores de identidade social (Google, Facebook, Apple), cadastro self-service com email, UI totalmente customizavel via templates HTML/CSS, diretorio de usuarios separado que escala para milhoes de usuarios e um modelo de precificacao baseado em consumo. Entra ID (workforce) exigiria a criacao de contas guest para cada consumidor, o que nao e escalavel. Entra External ID e a evolucao do B2C e tambem pode ser apropriado.

</details>

<details>
<summary>2. A API backend no App Service precisa acessar Azure SQL Database, Key Vault e uma API de pagamento de terceiros. Qual metodo de autenticacao voce deve usar para cada um?</summary>

**Azure SQL e Key Vault: Managed Identity.** A managed identity do App Service se autentica diretamente nesses servicos sem nenhuma credencial armazenada. Para Azure SQL, crie um contained database user mapeado para a identidade. Para Key Vault, atribua uma access policy ou role RBAC concedendo permissoes de leitura de secrets.

**API de pagamento de terceiros: Client credentials armazenadas no Key Vault.** Como managed identity so funciona com servicos Azure e Microsoft que suportam autenticacao Entra ID, armazene a chave/secret da API de pagamento no Key Vault e recupere-a em tempo de execucao usando a managed identity. Isso elimina credenciais do codigo e dos arquivos de configuracao.

</details>

<details>
<summary>3. Uma politica de Conditional Access exige MFA para todos os usuarios acessando o Portal Interno. Uma emergencia ocorre e a conta de admin e bloqueada devido a problemas com MFA. Como isso deve ser prevenido no design?</summary>

**Crie contas de acesso de emergencia (break glass) excluidas de todas as politicas de Conditional Access.** Essas contas devem: (1) Ser contas somente na nuvem (nao sincronizadas do on-prem), (2) Usar senhas longas e complexas armazenadas em um cofre fisico, (3) Ser excluidas de TODAS as politicas de Conditional Access, (4) Ter a role de Global Administrator, (5) Ser monitoradas com alertas em qualquer atividade de sign-in, (6) Ter pelo menos duas contas para redundancia. A Microsoft recomenda pelo menos duas contas break-glass por tenant.

</details>

<details>
<summary>4. Quando voce deve escolher uma user-assigned managed identity em vez de uma system-assigned managed identity?</summary>

**Escolha user-assigned managed identity quando:** (1) Multiplos recursos precisam da mesma identidade e permissoes (por exemplo, multiplos App Services acessando o mesmo banco de dados), (2) Voce usa deployment slots e precisa que a identidade persista durante trocas de slot, (3) Voce quer que o ciclo de vida da identidade seja independente do recurso (pre-criar identidade e permissoes antes de implantar a aplicacao), (4) Voce precisa atribuir a identidade durante a criacao do recurso via templates IaC. System-assigned e mais simples para cenarios de recurso unico onde a identidade deve ser automaticamente limpa quando o recurso e excluido.

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

**Proximo**: [Challenge 05: Design Identity Management](/docs/az-305/identity-governance-monitoring/challenge-05)
