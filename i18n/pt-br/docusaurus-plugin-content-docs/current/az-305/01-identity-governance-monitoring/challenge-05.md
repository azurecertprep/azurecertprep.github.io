---
sidebar_position: 5
title: "Desafio 05: Projetar Gerenciamento de Identidade"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 05: projetar gerenciamento de identidade

:::info Tempo Estimado e Custo

**75-90 min** | **Custo estimado**: $0-5 | **Peso no Exame: 25-30%**

:::

## Introdução

O Woodgrove Bank é uma instituição financeira com 8.000 funcionários em 12 escritórios. Eles possuem um ambiente maduro de Active Directory on-premises (domain controllers Windows Server 2019, forest única, três domínios) que gerencia todas as identidades de funcionários, group policies e acesso a aplicações. Eles estao migrando para um modelo de nuvem híbrida com Microsoft 365 e workloads Azure, mas não podem abandonar o AD on-premises devido a aplicações legadas de linha de negócios que requerem autenticação Kerberos.

O CISO identificou várias lacunas críticas de segurança na postura de identidade atual:
- 15 contas de Global Administrator sem revisoes de acesso ou ativacao com tempo limitado
- Contas de serviço com roles de alto privilegio permanentemente atribuidas
- Nenhum mecanismo de detecção para credenciais comprometidas ou sign-ins de viagem impossível
- Senhas sincronizadas do AD sem proteção de senha nativa na nuvem
- Ex-contratados ainda possuem contas ativas descobertas durante uma auditoria recente

Sua tarefa é projetar uma solução de gerenciamento de identidade híbrida que sincronize identidades para a nuvem enquanto implementa controles modernos de segurança para acesso privilegiado e proteção de identidade.

## Habilidades do exame cobertas

- Recomendar uma solução de gerenciamento de identidade
- Recomendar uma solução de autenticação
- Recomendar uma solução para autorizar acesso a recursos do Azure

## Tarefas de design

### Parte 1: sincronizacao de identidade híbrida

1. Avalie e recomende o método de sincronizacao aprópriado para o Woodgrove Bank:

| Method | Description | When to Use |
|--------|-------------|-------------|
| Microsoft Entra Connect Sync | Traditional sync engine | |
| Microsoft Entra Cloud Sync | Cloud-based lightweight agent | |
| Federation (AD FS) | On-prem federation service | |

2. Projete a topologia de sincronizacao considerando:
   - Forest única, três domínios
   - Quais objetos sincronizar (usuários, grupos, contatos, dispositivos)
   - Estratégia de filtragem (baseada em OU, baseada em atributo ou baseada em domínio)
   - Password hash synchronization vs. pass-through authentication vs. federation

3. Projete a hierarquia de método de autenticação:
   - Método de autenticação primário para recursos na nuvem
   - Método de autenticação de failover se o primário estiver indisponível
   - Abordagem de staged rollout para migração

### Parte 2: proteção de senha e segurança de autenticação

4. Projete a proteção de senha para o Woodgrove Bank:
   - Microsoft Entra Password Protection (lista customizada de senhas banidas)
   - Implantação do agente de proteção de senha on-premises
   - Configuração de smart lockout
   - Redefinicao de senha self-service com writeback on-premises

5. Avalie opcoes de autenticação passwordless e projete um plano de rollout:
   - Windows Hello for Business
   - Chaves de segurança FIDO2
   - Sign-in por telefone com Microsoft Authenticator
   - Autenticação baseada em certificado

### Parte 3: privileged identity Management (pim)

6. Projete uma estratégia de PIM para as 15 contas de Global Administrator:
   - Atribuicoes de role eligible vs. active
   - Duracao máxima de ativacao
   - Requisitos de workflow de aprovacao
   - Requisito de MFA para ativacao
   - Requisitos de justificativa e ticket

7. Projete PIM para roles de recursos Azure:
   - Role Owner em subscriptions de produção: quem pode ativar, aprovacao necessária
   - Role Contributor em subscriptions de desenvolvimento: quem pode ativar, aprovacao automática
   - Janelas de acesso just-in-time e configuração de notificação

8. Crie uma agenda de access reviews:
   - Revisao trimestral de atribuicoes de Global Administrator
   - Revisao mensal de acesso de usuários guest
   - Revisao semestral de atribuicoes de Owner em subscriptions Azure

### Parte 4: identity protection

9. Projete políticas de Identity Protection para o Woodgrove Bank:
   - Política de risco de sign-in: quais ações para risco baixo, médio e alto
   - Política de risco de usuário: quando exigir troca de senha vs. bloquear acesso
   - Integração de Conditional Access baseada em risco

10. Projete detecção e resposta para estes cenários:
    - Sign-in de funcionario de dois paises em 1 hora (viagem impossível)
    - Sign-in de um endereço IP de botnet conhecido
    - Credenciais encontradas em um banco de dados de vazamento na dark web
    - Padrão anomalo de uso de token

### Parte 5: implementar prova de conceito

11. Configure Entra ID Password Protection com uma lista customizada de senhas banidas.

12. Crie uma atribuicao de role eligible no PIM (usando uma role de não-produção) e demonstre o workflow de ativacao.

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-05"
  items={[
    "Synchronization method selected with documented justification considering multi-domain topology",
    "Authentication method hierarchy designed with primary and failover methods",
    "PIM configured for privileged roles with apprópriate activation duration and approval workflows",
    "Identity Protection policies designed for sign-in risk and user risk scenários",
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
- Necessário para: device writeback, Exchange hybrid, group writeback
- Servidor único por diretório (servidor staging para HA)

**Microsoft Entra Cloud Sync** (agente leve):
- Gerenciado na nuvem, múltiplos agentes para HA
- Configuração mais simples, atualizações automáticas
- Suporta cenários de multi-forest desconectados
- Recursos limitados: sem device writeback, sem pass-through authentication

Para o cenário do Woodgrove Bank (forest única, três domínios, precisa de PHS + failover PTA), **Entra Connect Sync** e a melhor escolha porque suporta o conjunto completo de recursos necessário para um ambiente empresarial complexo incluindo password writeback e staged rollout.

</details>

<details>
<summary>Dica 2: Password Hash Sync vs. Pass-Through Authentication</summary>

**Password Hash Synchronization (PHS)**:
- Hashes de hashes de senha sincronizados para a nuvem (double-hashed, não senhas reais)
- Funciona mesmo se o AD on-prem estiver indisponível (resiliência)
- Necessário para detecção de credenciais vazadas do Identity Protection
- Implantação e manutenção mais simples

**Pass-Through Authentication (PTA)**:
- Autenticação validada em tempo real contra o AD on-prem
- Senhas nunca armazenadas na nuvem (requisito de conformidade para algumas organizações)
- Requer conectividade on-prem (sem sign-in se todos os agentes estiverem offline)
- Instale múltiplos agentes (3+) para alta disponibilidade

**Recomendado para Woodgrove**: PHS como primário (habilita Identity Protection, funciona se on-prem falhar) com PTA como adicional se conformidade exigir validação de senha on-prem. Ambos podem ser habilitados simultaneamente como "staged rollout."

</details>

<details>
<summary>Dica 3: Configurando PIM para Global Admin</summary>

```bash
# Note: PIM configuration is primarily done through the portal or Microsoft graph API
# The following shows the graph API approach

# List eligible role assignments for global administrator
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

Melhores práticas de PIM para Global Admin:
- Duracao máxima de ativacao: 2 horas (não 8 ou 24)
- Exigir aprovacao de outro Global Admin
- Exigir MFA no momento da ativacao
- Exigir justificativa e número de ticket de incidente
- Enviar notificação para todos os outros Global Admins na ativacao

</details>

<details>
<summary>Dica 4: Políticas de Risco do Identity Protection</summary>

Projete resposta a risco por severidade:

| Risk Level | Sign-in Risk Response | User Risk Response |
|------------|----------------------|-------------------|
| Low | Allow with MFA | Allow (monitor) |
| Medium | Require MFA | Require password change |
| High | Block access | Block until admin review |

Configuração chave:
- Risco de sign-in detecta: viagem impossível, propriedades de sign-in desconhecidas, IPs vinculados a malware, IPs anonimos
- Risco de usuário detecta: credenciais vazadas (requer PHS), atividade anomala de usuário
- Políticas de Conditional Access baseadas em risco substituem as políticas legadas do Identity Protection

```bash
# Conditional access policy for high sign-in risk (via graph api)
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
2. Sua lista customizada de senhas banidas (até 1.000 entradas)
3. Regras de normalizacao (substituicao de caracteres: @ por a, 3 por é, etc.)

Para o Woodgrove Bank, adicione termos específicos da empresa:
- Nome da empresa e variacoes (woodgrove, w00dgr0ve)
- Nomes de produtos
- Localizacoes de escritórios
- Abreviacoes internas comuns

A implantação on-premises requer:
- Serviço Azure AD Password Protection Proxy (pelo menos um por forest)
- Agente Azure AD Password Protection DC (em cada DC)
- Nenhuma conectividade com a internet necessária dos DCs (o proxy lida com a comúnicação)

```bash
# Configure custom banned passwords (Portal or PowerShell)
# PowerShell example:
# Connect-MgGraph -Scopes "Policy.ReadWrite.AuthenticationMethod"
# Update-MgPolicyAuthenticationMethodPolicy -AuthenticationMethodConfigurations @{
# customBannedPasswords = @("woodgrove", "banking123", "finance2024")
# }
```

</details>

## Recursos de aprendizagem

- [Microsoft Entra Connect Sync documentation](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-azure-ad-connect)
- [Microsoft Entra Cloud Sync](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/what-is-cloud-sync)
- [Privileged Identity Management](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure)
- [Identity Protection overview](https://learn.microsoft.com/en-us/entra/id-protection/overview-identity-protection)
- [Password protection in Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-password-ban-bad)
- [Passwordless authentication methods](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-passwordless)
- [Access reviews](https://learn.microsoft.com/en-us/entra/id-governance/access-reviews-overview)

## Verificação de conhecimento

<details>
<summary>1. O Woodgrove Bank tem um requisito de conformidade de que senhas nunca devem sair do ambiente on-premises, mas também querem detecção de credenciais vazadas do Identity Protection. Quais métodos de autenticação satisfazem ambos os requisitos?</summary>

**Esses requisitos são mutuamente exclusivos.** A detecção de credenciais vazadas no Identity Protection requer password hash synchronization (PHS) porque compara hashes armazenados na nuvem contra bancos de dados de credenciais vazadas conhecidas. Se a conformidade proibe estritamente hashes de senha na nuvem, você deve escolher: usar Pass-Through Authentication (PTA) para conformidade e perder a detecção de credenciais vazadas, OU usar PHS para ganhar Identity Protection ao custo de ter hashes na nuvem. A orientacao da Microsoft e que hashes PHS são double-hashed e extremamente seguros. A maioria das organizações aceita PHS pelos benefícios de segurança obtidos.

</details>

<details>
<summary>2. O Woodgrove tem 15 contas de Global Administrator permanentemente ativas. Apos implementar PIM, como deve ser o estado alvo?</summary>

**Estado alvo:** (1) Reduzir para 2-3 Global Admins permanentemente ativos (contas de emergencia/break-glass apenas), (2) Converter as 12-13 contas restantes para atribuicoes "eligible" que requerem ativacao, (3) Definir duracao máxima de ativacao para 1-2 horas, (4) Exigir aprovacao de múltiplas pessoas para ativacao, (5) Exigir MFA e justificativa no momento da ativacao, (6) Configurar access reviews trimestrais para verificar necessidade continuada, (7) Configurar alertas para qualquer evento de ativacao. O objetivo é zero standing access -- todo acesso privilegiado e just-in-time é limitado no tempo.

</details>

<details>
<summary>3. A empresa tem três domínios AD em uma forest. Eles precisam sincronizar usuários de dois domínios mas excluir o terceiro (domínio legado sendo descomissionado). Qual abordagem de filtragem eles devem usar?</summary>

**Filtragem baseada em domínio no Microsoft Entra Connect Sync.** Durante o assistente de instalacao do Entra Connect Sync, você pode selecionar quais domínios incluir na sincronizacao. Desmarque o domínio legado completamente. Alternativamente, use filtragem baseada em OU se você precisar de controle mais fino dentro dos domínios (sincronizar OUs específicas enquanto exclui outras). Filtragem baseada em domínio e a abordagem mais simples e sustentavel quando o limite de exclusão se alinha com os limites de domínio. Lembre-se de também configurar o escopo de sincronizacao para excluir contas desabilitadas dos domínios restantes.

</details>

<details>
<summary>4. As credenciais de um funcionario são detectadas em um banco de dados de vazamento na dark web. O Identity Protection sinaliza o risco do usuário como "high." Qual resposta automatizada deve ocorrer?</summary>

**A política de risco de usuário deve forcar uma troca segura de senha.** Quando o risco do usuário e "high" devido a credenciais vazadas: (1) A política de Conditional Access baseada em risco e acionada no próximo sign-in, (2) O usuário e obrigado a realizar MFA (provando que é o usuário legitimo), (3) Apos MFA, ele deve trocar sua senha, (4) A nova senha e validada contra a lista de senhas banidas, (5) Se SSPR com writeback on-premises estiver configurado, a nova senha e escrita de volta no AD on-prem, (6) Apos troca de senha bem-sucedida, o risco do usuário e automaticamente remediado (resetado para nenhum). Se o usuário não conseguir completar MFA, o acesso e bloqueado aguardando intervencao do administrador.

</details>

## Limpeza

```bash
# Remove PIM eligible assignments (via graph api)
# az rest --method post --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests" --body '{"action":"adminRemove",...}'

# Remove custom banned password list (Portal: Entra ID > security > authentication methods > password protection)

# If any test users were created:
az ad user delete --id testuser@yourtenant.onmicrosoft.com

# Delete resource groups if any Azure resources were deployed
az group delete --name rg-identity-poc --yes --no-wait
```

---

**Próximo**: [Challenge 06: Design Authorization for Azure Resources](/docs/az-305/identity-governance-monitoring/challenge-06)
