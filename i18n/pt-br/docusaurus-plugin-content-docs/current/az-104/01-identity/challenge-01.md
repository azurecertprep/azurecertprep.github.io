---
sidebar_position: 1
title: "Challenge 01 — Entra ID: Users & Groups"
---

# Desafio 01 — Entra ID: Usuários & Grupos

> ⏱️ **Tempo estimado**: 45-60 min | 💰 **Custo estimado**: Gratuito | 🎯 **Peso no exame**: 20-25%

## Introdução

Você acabou de ingressar na Contoso Ltd. como o novo Administrador Azure. Sua primeira tarefa: configurar o gerenciamento de identidades. A empresa está migrando do Active Directory local e você precisa criar a estrutura inicial de usuários e grupos no Microsoft Entra ID.

Este desafio cobre a base de tudo no Azure — identidade. Sem usuários, grupos e gerenciamento adequado de acesso, nada mais funciona.

## Habilidades do Exame Cobertas

- ✅ Criar usuários e grupos
- ✅ Gerenciar propriedades de usuários e grupos
- ✅ Gerenciar licenças no Microsoft Entra ID
- ✅ Gerenciar usuários externos
- ✅ Configurar redefinição de senha por autoatendimento (SSPR)

## Referência Sysadmin ↔ Azure

| On-Prem / Sysadmin | Equivalente no Azure | Observações |
|---------------------|----------------------|-------------|
| Active Directory Users & Computers | Microsoft Entra ID | Identidade nativa na nuvem |
| Usuários do domínio | Usuários do Entra ID | user@tenant.onmicrosoft.com |
| Grupos de segurança | Grupos de segurança do Entra ID | Usados para atribuições de RBAC |
| Listas de distribuição | Grupos do Microsoft 365 | Grupos habilitados para email |
| Contas de convidado | Usuários externos (B2B) | Convidar usuários de outras organizações |
| Redefinição de senha via ADUC | Self-Service Password Reset | Usuários redefinem suas próprias senhas |
| Group Policy (política de senha) | Métodos de autenticação | Configurar complexidade de senha |

## Descrição

Sua missão é:

### Parte 1: Criar Usuários

1. Criar 3 usuários internos no seu tenant do Entra ID:
   - `alice@SEU_TENANT.onmicrosoft.com` — Nome de exibição: Alice Johnson, Departamento: IT, Cargo: Cloud Engineer
   - `bob@SEU_TENANT.onmicrosoft.com` — Nome de exibição: Bob Smith, Departamento: Finance, Cargo: Financial Analyst
   - `carol@SEU_TENANT.onmicrosoft.com` — Nome de exibição: Carol Williams, Departamento: IT, Cargo: Security Admin

2. Configurar Alice com uma senha temporária que deve ser alterada no primeiro login.

### Parte 2: Criar Grupos

3. Criar os seguintes grupos de segurança:
   - `IT-Team` — Membros: Alice, Carol
   - `Finance-Team` — Membros: Bob
   - `All-Employees` — Membros: Alice, Bob, Carol (use uma regra de associação dinâmica baseada no departamento)

### Parte 3: Gerenciar Propriedades

4. Atualizar a localização de uso do Bob para "US" (necessário para atribuição de licença)
5. Desabilitar a conta da Carol (simular uma funcionária em licença)
6. Atualizar a descrição do grupo `IT-Team` para "IT department security group"

### Parte 4: Usuários Externos

7. Convidar um usuário externo (convidado) — use qualquer email ao qual você tenha acesso
8. Adicionar o usuário convidado ao grupo `All-Employees`

### Parte 5: Redefinição de Senha por Autoatendimento

9. Habilitar SSPR para o grupo `IT-Team`
10. Configurar o SSPR para exigir 1 método de autenticação (email)

## Critérios de Sucesso

- [ ] 3 usuários internos existem com nomes de exibição, departamentos e cargos corretos
- [ ] Alice tem uma senha temporária que exige alteração no primeiro login
- [ ] 3 grupos de segurança existem com a associação correta
- [ ] `All-Employees` usa associação dinâmica (bônus) ou associação estática
- [ ] A localização de uso do Bob está definida como "US"
- [ ] A conta da Carol está desabilitada
- [ ] 1 usuário externo (convidado) foi convidado
- [ ] SSPR está habilitado para o grupo IT-Team

## Dicas

<details>
<summary>Dica 1: Encontrando o domínio do seu tenant</summary>

```bash
# Seu domínio padrão geralmente é algo como: seualias.onmicrosoft.com
az rest --method get --url "https://graph.microsoft.com/v1.0/domains" --query "value[].id" -o tsv
```

</details>

<details>
<summary>Dica 2: Criando um usuário com Azure CLI</summary>

```bash
DOMAIN="yourtenant.onmicrosoft.com"

az ad user create \
  --display-name "Alice Johnson" \
  --user-principal-name "alice@$DOMAIN" \
  --password "TempP@ss123!" \
  --force-change-password-next-sign-in true \
  --department "IT" \
  --job-title "Cloud Engineer"
```

</details>

<details>
<summary>Dica 3: Criando grupos e adicionando membros</summary>

```bash
# Create a security group
az ad group create --display-name "IT-Team" --mail-nickname "it-team" --description "IT department security group"

# Get the user's object ID
ALICE_ID=$(az ad user show --id "alice@$DOMAIN" --query id -o tsv)

# Add member to group
az ad group member add --group "IT-Team" --member-id $ALICE_ID
```

</details>

<details>
<summary>Dica 4: Convidando um usuário externo</summary>

```bash
# Invite an external user via Microsoft Graph API
az rest --method post \
  --url "https://graph.microsoft.com/v1.0/invitations" \
  --body '{
    "invitedUserEmailAddress": "external@example.com",
    "inviteRedirectUrl": "https://portal.azure.com",
    "sendInvitationMessage": true
  }'
```

</details>

<details>
<summary>Dica 5: Habilitando SSPR</summary>

:::note
A configuração do SSPR é feita preferencialmente pelo Portal do Azure:
1. Vá para **Microsoft Entra ID** → **Password reset**
2. Defina **Self-service password reset enabled** como **Selected**
3. Selecione o grupo **IT-Team**
4. Em **Authentication methods**, defina **Number of methods required** para 1
5. Marque **Email** como método permitido
:::

</details>

## Recursos de Aprendizado

- [Criar usuários no Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-create-delete-users)
- [Criar grupos e adicionar membros](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-manage-groups)
- [Convidar usuários externos (B2B)](https://learn.microsoft.com/en-us/entra/external-id/what-is-b2b)
- [Configurar SSPR](https://learn.microsoft.com/en-us/entra/identity/authentication/tutorial-enable-sspr)
- [Regras de associação dinâmica](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership)

## Quebre & Conserte 🔧

Após completar o desafio, tente estes cenários de solução de problemas:

1. **Login quebrado**: Desabilite a conta da Alice, depois tente atribuir uma função a ela. Qual erro você recebe? Como você diagnostica isso?
2. **Mistério na associação de grupo**: Remova Bob do `Finance-Team`, depois verifique se ele ainda pode acessar recursos atribuídos a esse grupo. Quanto tempo leva para a alteração se propagar?
3. **Acesso de convidado deu errado**: Convide um usuário convidado mas não o atribua a nenhum grupo. Ele consegue ver algo no seu tenant? Qual é o nível de acesso padrão para convidados?

## Teste seus Conhecimentos

<details>
<summary>1. Qual é a diferença entre um grupo de segurança e um grupo do Microsoft 365?</summary>

**Grupos de segurança** são usados para gerenciar acesso a recursos do Azure (RBAC, storage, VNets, etc.). Eles não possuem endereços de email.

**Grupos do Microsoft 365** fornecem recursos de colaboração incluindo caixa de correio compartilhada, calendário, site SharePoint e Planner. Eles também podem ser usados para gerenciamento de acesso.

Para o exame AZ-104, você trabalhará principalmente com **grupos de segurança** para atribuições de RBAC.

</details>

<details>
<summary>2. Você pode atribuir licenças do Azure a um grupo?</summary>

**Sim!** Isso é chamado de **licenciamento baseado em grupo**. Quando você atribui uma licença a um grupo, todos os membros recebem automaticamente a licença. Quando um usuário é removido do grupo, a licença é automaticamente recuperada.

Isso requer pelo menos uma licença do **Microsoft Entra ID P1**.

</details>

<details>
<summary>3. O que acontece quando você exclui um usuário no Entra ID?</summary>

O usuário é **excluído de forma reversível** e movido para a seção "Deleted users". Você tem **30 dias** para restaurar o usuário antes que ele seja permanentemente excluído. Durante esse período, todas as propriedades são preservadas.

</details>

<details>
<summary>4. Quais métodos de autenticação estão disponíveis para SSPR?</summary>

- Email
- Telefone celular (SMS)
- Notificação de aplicativo móvel (Microsoft Authenticator)
- Código de aplicativo móvel
- Telefone comercial
- Perguntas de segurança (não recomendado para administradores)

O exame pode pedir que você configure o **número de métodos exigidos** (1 ou 2).

</details>

## Limpeza

Este desafio usa apenas recursos do Entra ID (não há recursos do Azure para excluir). Para limpar:

```bash
DOMAIN="yourtenant.onmicrosoft.com"

# Delete users
az ad user delete --id "alice@$DOMAIN"
az ad user delete --id "bob@$DOMAIN"
az ad user delete --id "carol@$DOMAIN"

# Delete groups
az ad group delete --group "IT-Team"
az ad group delete --group "Finance-Team"
az ad group delete --group "All-Employees"

# Delete guest users (get their IDs first)
az ad user list --filter "userType eq 'Guest'" --query "[].id" -o tsv | while read id; do
  az ad user delete --id "$id"
done
```

---

**Próximo**: [Desafio 02 — RBAC & Gerenciamento de Acesso](/docs/az-104/identity/challenge-02)
