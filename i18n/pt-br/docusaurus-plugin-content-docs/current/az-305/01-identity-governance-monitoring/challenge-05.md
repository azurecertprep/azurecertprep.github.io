---
sidebar_position: 5
title: "Challenge 05: Design Identity Management"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 05: Design Identity Management

:::info Tempo Estimado e Custo

**75-90 min** | **Custo estimado**: $0-5 | **Peso no Exame: 25-30%**

:::

## Introducao

O Woodgrove Bank e uma instituicao financeira com 8.000 funcionarios em 12 escritorios. Eles possuem um ambiente maduro de Active Directory on-premises (domain controllers Windows Server 2019, forest unica, tres dominios) que gerencia todas as identidades de funcionarios, group policies e acesso a aplicacoes. Eles estao migrando para um modelo de nuvem hibrida com Microsoft 365 e workloads Azure, mas nao podem abandonar o AD on-premises devido a aplicacoes legadas de linha de negocios que requerem autenticacao Kerberos.

O CISO identificou varias lacunas criticas de seguranca na postura de identidade atual:
- 15 contas de Global Administrator sem revisoes de acesso ou ativacao com tempo limitado
- Contas de servico com roles de alto privilegio permanentemente atribuidas
- Nenhum mecanismo de deteccao para credenciais comprometidas ou sign-ins de viagem impossivel
- Senhas sincronizadas do AD sem protecao de senha nativa na nuvem
- Ex-contratados ainda possuem contas ativas descobertas durante uma auditoria recente

Sua tarefa e projetar uma solucao de gerenciamento de identidade hibrida que sincronize identidades para a nuvem enquanto implementa controles modernos de seguranca para acesso privilegiado e protecao de identidade.

## Habilidades do Exame Cobertas

- Recomendar uma solucao de gerenciamento de identidade
- Recomendar uma solucao de autenticacao
- Recomendar uma solucao para autorizar acesso a recursos do Azure

## Tarefas de Design

### Parte 1: Sincronizacao de Identidade Hibrida

1. Avalie e recomende o metodo de sincronizacao apropriado para o Woodgrove Bank:

| Method | Description | When to Use |
|--------|-------------|-------------|
| Microsoft Entra Connect Sync | Traditional sync engine | |
| Microsoft Entra Cloud Sync | Cloud-based lightweight agent | |
| Federation (AD FS) | On-prem federation service | |

2. Projete a topologia de sincronizacao considerando:
   - Forest unica, tres dominios
   - Quais objetos sincronizar (usuarios, grupos, contatos, dispositivos)
   - Estrategia de filtragem (baseada em OU, baseada em atributo ou baseada em dominio)
   - Password hash synchronization vs. pass-through authentication vs. federation

3. Projete a hierarquia de metodo de autenticacao:
   - Metodo de autenticacao primario para recursos na nuvem
   - Metodo de autenticacao de failover se o primario estiver indisponivel
   - Abordagem de staged rollout para migracao

### Parte 2: Protecao de Senha e Seguranca de Autenticacao

4. Projete a protecao de senha para o Woodgrove Bank:
   - Microsoft Entra Password Protection (lista customizada de senhas banidas)
   - Implantacao do agente de protecao de senha on-premises
   - Configuracao de smart lockout
   - Redefinicao de senha self-service com writeback on-premises

5. Avalie opcoes de autenticacao passwordless e projete um plano de rollout:
   - Windows Hello for Business
   - Chaves de seguranca FIDO2
   - Sign-in por telefone com Microsoft Authenticator
   - Autenticacao baseada em certificado

### Parte 3: Privileged Identity Management (PIM)

6. Projete uma estrategia de PIM para as 15 contas de Global Administrator:
   - Atribuicoes de role eligible vs. active
   - Duracao maxima de ativacao
   - Requisitos de workflow de aprovacao
   - Requisito de MFA para ativacao
   - Requisitos de justificativa e ticket

7. Projete PIM para roles de recursos Azure:
   - Role Owner em subscriptions de producao: quem pode ativar, aprovacao necessaria
   - Role Contributor em subscriptions de desenvolvimento: quem pode ativar, aprovacao automatica
   - Janelas de acesso just-in-time e configuracao de notificacao

8. Crie uma agenda de access reviews:
   - Revisao trimestral de atribuicoes de Global Administrator
   - Revisao mensal de acesso de usuarios guest
   - Revisao semestral de atribuicoes de Owner em subscriptions Azure

### Parte 4: Identity Protection

9. Projete politicas de Identity Protection para o Woodgrove Bank:
   - Politica de risco de sign-in: quais acoes para risco baixo, medio e alto
   - Politica de risco de usuario: quando exigir troca de senha vs. bloquear acesso
   - Integracao de Conditional Access baseada em risco

10. Projete deteccao e resposta para estes cenarios:
    - Sign-in de funcionario de dois paises em 1 hora (viagem impossivel)
    - Sign-in de um endereco IP de botnet conhecido
    - Credenciais encontradas em um banco de dados de vazamento na dark web
    - Padrao anomalo de uso de token

### Parte 5: Implementar Prova de Conceito

11. Configure Entra ID Password Protection com uma lista customizada de senhas banidas.

12. Crie uma atribuicao de role eligible no PIM (usando uma role de nao-producao) e demonstre o workflow de ativacao.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-05"
  items={[
    "Synchronization method selected with documented justification considering multi-domain topology",
    "Authentication method hierarchy designed with primary and failover methods",
    "PIM configured for privileged roles with appropriate activation duration and approval workflows",
    "Identity Protection policies designed for sign-in risk and user risk scenarios",
    "Password protection strategy covers both cloud and on-premises with banned password list",
    "Access review schedule defined for all privileged role types"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Entra Connect Sync vs. Cloud Sync</summary>

**Microsoft Entra Connect Sync** (anteriormente Azure AD Connect):
- Engine de sincronizacao madura e rica em recursos instalada on-premises
- Suporta topologias complexas (multi-forest, filtragem, device writeback)
- Necessario para: device writeback, Exchange hybrid, group writeback
- Servidor unico por diretorio (servidor staging para HA)

**Microsoft Entra Cloud Sync** (agente leve):
- Gerenciado na nuvem, multiplos agentes para HA
- Configuracao mais simples, atualizacoes automaticas
- Suporta cenarios de multi-forest desconectados
- Recursos limitados: sem device writeback, sem pass-through authentication

Para o cenario do Woodgrove Bank (forest unica, tres dominios, precisa de PHS + failover PTA), **Entra Connect Sync** e a melhor escolha porque suporta o conjunto completo de recursos necessario para um ambiente empresarial complexo incluindo password writeback e staged rollout.

</details>

<details>
<summary>Dica 2: Password Hash Sync vs. Pass-Through Authentication</summary>

**Password Hash Synchronization (PHS)**:
- Hashes de hashes de senha sincronizados para a nuvem (double-hashed, nao senhas reais)
- Funciona mesmo se o AD on-prem estiver indisponivel (resiliencia)
- Necessario para deteccao de credenciais vazadas do Identity Protection
- Implantacao e manutencao mais simples

**Pass-Through Authentication (PTA)**:
- Autenticacao validada em tempo real contra o AD on-prem
- Senhas nunca armazenadas na nuvem (requisito de conformidade para algumas organizacoes)
- Requer conectividade on-prem (sem sign-in se todos os agentes estiverem offline)
- Instale multiplos agentes (3+) para alta disponibilidade

**Recomendado para Woodgrove**: PHS como primario (habilita Identity Protection, funciona se on-prem falhar) com PTA como adicional se conformidade exigir validacao de senha on-prem. Ambos podem ser habilitados simultaneamente como "staged rollout."

</details>

<details>
<summary>Dica 3: Configurando PIM para Global Admin</summary>

```bash
# Note: PIM configuration is primarily done through the portal or Microsoft Graph API
# The following shows the Graph API approach

# List eligible role assignments for Global Administrator
az rest --method get \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleInstances?\$filter=roleDefinitionId eq '62e90394-69f5-4237-9190-012177145e10'"

# Create an eligible assignment (makes user eligible but not active)
az rest --method post \
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests" \
  --body '{
    "action": "adminAssign",
    "justification": "Assign eligible Global Admin for emergency use",
    "roleDefinitionId": "62e90394-69f5-4237-9190-012177145e10",
    "directoryScopeId": "/",
    "principalId": "<user-object-id>",
    "scheduleInfo": {
      "startDateTime": "2024-01-01T00:00:00Z",
      "expiration": {
        "type": "afterDuration",
        "duration": "P365D"
      }
    }
  }'
```

Melhores praticas de PIM para Global Admin:
- Duracao maxima de ativacao: 2 horas (nao 8 ou 24)
- Exigir aprovacao de outro Global Admin
- Exigir MFA no momento da ativacao
- Exigir justificativa e numero de ticket de incidente
- Enviar notificacao para todos os outros Global Admins na ativacao

</details>

<details>
<summary>Dica 4: Politicas de Risco do Identity Protection</summary>

Projete resposta a risco por severidade:

| Risk Level | Sign-in Risk Response | User Risk Response |
|------------|----------------------|-------------------|
| Low | Allow with MFA | Allow (monitor) |
| Medium | Require MFA | Require password change |
| High | Block access | Block until admin review |

Configuracao chave:
- Risco de sign-in detecta: viagem impossivel, propriedades de sign-in desconhecidas, IPs vinculados a malware, IPs anonimos
- Risco de usuario detecta: credenciais vazadas (requer PHS), atividade anomala de usuario
- Politicas de Conditional Access baseadas em risco substituem as politicas legadas do Identity Protection

```bash
# Conditional Access policy for high sign-in risk (via Graph API)
az rest --method post \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --body '{
    "displayName": "Block high risk sign-ins",
    "state": "enabled",
    "conditions": {
      "signInRiskLevels": ["high"],
      "applications": {"includeApplications": ["All"]},
      "users": {"includeUsers": ["All"], "excludeUsers": ["<break-glass-id>"]}
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["block"]
    }
  }'
```

</details>

<details>
<summary>Dica 5: Lista Customizada de Senhas Banidas</summary>

O Microsoft Entra Password Protection avalia senhas contra:
1. A lista global de senhas banidas (mantida pela Microsoft, baseada em telemetria)
2. Sua lista customizada de senhas banidas (ate 1.000 entradas)
3. Regras de normalizacao (substituicao de caracteres: @ por a, 3 por e, etc.)

Para o Woodgrove Bank, adicione termos especificos da empresa:
- Nome da empresa e variacoes (woodgrove, w00dgr0ve)
- Nomes de produtos
- Localizacoes de escritorios
- Abreviacoes internas comuns

A implantacao on-premises requer:
- Servico Azure AD Password Protection Proxy (pelo menos um por forest)
- Agente Azure AD Password Protection DC (em cada DC)
- Nenhuma conectividade com a internet necessaria dos DCs (o proxy lida com a comunicacao)

```bash
# Configure custom banned passwords (Portal or PowerShell)
# PowerShell example:
# Connect-MgGraph -Scopes "Policy.ReadWrite.AuthenticationMethod"
# Update-MgPolicyAuthenticationMethodPolicy -AuthenticationMethodConfigurations @{
#   customBannedPasswords = @("woodgrove", "banking123", "finance2024")
# }
```

</details>

## Recursos de Aprendizagem

- [Microsoft Entra Connect Sync documentation](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-azure-ad-connect)
- [Microsoft Entra Cloud Sync](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/what-is-cloud-sync)
- [Privileged Identity Management](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure)
- [Identity Protection overview](https://learn.microsoft.com/en-us/entra/id-protection/overview-identity-protection)
- [Password protection in Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-password-ban-bad)
- [Passwordless authentication methods](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-passwordless)
- [Access reviews](https://learn.microsoft.com/en-us/entra/id-governance/access-reviews-overview)

## Verificacao de Conhecimento

<details>
<summary>1. O Woodgrove Bank tem um requisito de conformidade de que senhas nunca devem sair do ambiente on-premises, mas tambem querem deteccao de credenciais vazadas do Identity Protection. Quais metodos de autenticacao satisfazem ambos os requisitos?</summary>

**Esses requisitos sao mutuamente exclusivos.** A deteccao de credenciais vazadas no Identity Protection requer password hash synchronization (PHS) porque compara hashes armazenados na nuvem contra bancos de dados de credenciais vazadas conhecidas. Se a conformidade proibe estritamente hashes de senha na nuvem, voce deve escolher: usar Pass-Through Authentication (PTA) para conformidade e perder a deteccao de credenciais vazadas, OU usar PHS para ganhar Identity Protection ao custo de ter hashes na nuvem. A orientacao da Microsoft e que hashes PHS sao double-hashed e extremamente seguros. A maioria das organizacoes aceita PHS pelos beneficios de seguranca obtidos.

</details>

<details>
<summary>2. O Woodgrove tem 15 contas de Global Administrator permanentemente ativas. Apos implementar PIM, como deve ser o estado alvo?</summary>

**Estado alvo:** (1) Reduzir para 2-3 Global Admins permanentemente ativos (contas de emergencia/break-glass apenas), (2) Converter as 12-13 contas restantes para atribuicoes "eligible" que requerem ativacao, (3) Definir duracao maxima de ativacao para 1-2 horas, (4) Exigir aprovacao de multiplas pessoas para ativacao, (5) Exigir MFA e justificativa no momento da ativacao, (6) Configurar access reviews trimestrais para verificar necessidade continuada, (7) Configurar alertas para qualquer evento de ativacao. O objetivo e zero standing access -- todo acesso privilegiado e just-in-time e limitado no tempo.

</details>

<details>
<summary>3. A empresa tem tres dominios AD em uma forest. Eles precisam sincronizar usuarios de dois dominios mas excluir o terceiro (dominio legado sendo descomissionado). Qual abordagem de filtragem eles devem usar?</summary>

**Filtragem baseada em dominio no Microsoft Entra Connect Sync.** Durante o assistente de instalacao do Entra Connect Sync, voce pode selecionar quais dominios incluir na sincronizacao. Desmarque o dominio legado completamente. Alternativamente, use filtragem baseada em OU se voce precisar de controle mais fino dentro dos dominios (sincronizar OUs especificas enquanto exclui outras). Filtragem baseada em dominio e a abordagem mais simples e sustentavel quando o limite de exclusao se alinha com os limites de dominio. Lembre-se de tambem configurar o escopo de sincronizacao para excluir contas desabilitadas dos dominios restantes.

</details>

<details>
<summary>4. As credenciais de um funcionario sao detectadas em um banco de dados de vazamento na dark web. O Identity Protection sinaliza o risco do usuario como "high." Qual resposta automatizada deve ocorrer?</summary>

**A politica de risco de usuario deve forcar uma troca segura de senha.** Quando o risco do usuario e "high" devido a credenciais vazadas: (1) A politica de Conditional Access baseada em risco e acionada no proximo sign-in, (2) O usuario e obrigado a realizar MFA (provando que e o usuario legitimo), (3) Apos MFA, ele deve trocar sua senha, (4) A nova senha e validada contra a lista de senhas banidas, (5) Se SSPR com writeback on-premises estiver configurado, a nova senha e escrita de volta no AD on-prem, (6) Apos troca de senha bem-sucedida, o risco do usuario e automaticamente remediado (resetado para nenhum). Se o usuario nao conseguir completar MFA, o acesso e bloqueado aguardando intervencao do administrador.

</details>

## Limpeza

```bash
# Remove PIM eligible assignments (via Graph API)
# az rest --method post --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests" --body '{"action":"adminRemove",...}'

# Remove custom banned password list (Portal: Entra ID > Security > Authentication Methods > Password Protection)

# If any test users were created:
az ad user delete --id testuser@yourtenant.onmicrosoft.com

# Delete resource groups if any Azure resources were deployed
az group delete --name rg-identity-poc --yes --no-wait
```

---

**Proximo**: [Challenge 06: Design Authorization for Azure Resources](/docs/az-305/identity-governance-monitoring/challenge-06)
