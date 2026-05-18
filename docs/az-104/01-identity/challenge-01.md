---
sidebar_position: 1
title: "Challenge 01: Entra ID: Users & Groups"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 01: Entra ID: Users & Groups

:::info Estimated Time and Cost

**45-60 min** | **Estimated cost**: Free | **Exam Weight: 20-25%**

:::

## Introduction

You just joined Contoso Ltd. as the new Azure Administrator. Your first task: set up identity management. The company is migrating from on-premises Active Directory, and you need to create the initial user and group structure in Microsoft Entra ID.

This challenge covers the foundation of everything in Azure | identity. Without users, groups, and proper access management, nothing else works.

## Exam Skills Covered

- Create users and groups
- Manage user and group properties
- Manage licenses in Microsoft Entra ID
- Manage external users
- Configure self-service password reset (SSPR)

## Sysadmin ↔ Azure Reference

| On-Prem / Sysadmin | Azure Equivalent | Notes |
|---------------------|------------------|-------|
| Active Directory Users & Computers | Microsoft Entra ID | Cloud-native identity |
| Domain users | Entra ID users | user@tenant.onmicrosoft.com |
| Security groups | Entra ID security groups | Used for RBAC assignments |
| Distribution lists | Microsoft 365 groups | Email-enabled groups |
| Guest accounts | External users (B2B) | Invite users from other orgs |
| ADUC password reset | Self-Service Password Reset | Users reset their own passwords |
| Group Policy (password policy) | Authentication methods | Configure password complexity |

## Description

Your mission is to:

### Part 1: Create Users

1. Create 3 internal users in your Entra ID tenant:
   - `alice@YOUR_TENANT.onmicrosoft.com` | Display name: Alice Johnson, Department: IT, Job title: Cloud Engineer
   - `bob@YOUR_TENANT.onmicrosoft.com` | Display name: Bob Smith, Department: Finance, Job title: Financial Analyst
   - `carol@YOUR_TENANT.onmicrosoft.com` | Display name: Carol Williams, Department: IT, Job title: Security Admin

2. Set up Alice with a temporary password that must be changed on first login.

### Part 2: Create Groups

3. Create the following security groups:
   - `IT-Team` | Members: Alice, Carol
   - `Finance-Team` | Members: Bob
   - `All-Employees` | Members: Alice, Bob, Carol (use a dynamic membership rule based on department)

### Part 3: Manage Properties

4. Update Bob's usage location to "US" (required for license assignment)
5. Disable Carol's account (simulate an employee on leave)
6. Update the `IT-Team` group description to "IT department security group"

### Part 4: External Users

7. Invite an external user (guest) | use any email you have access to
8. Add the guest user to the `All-Employees` group

### Part 5: Self-Service Password Reset

9. Enable SSPR for the `IT-Team` group
10. Configure SSPR to require 1 authentication method (email)

## Success Criteria

<SuccessChecklist
  storageKey="az104-challenge-01"
  items={[
    "3 internal users exist with correct display names, departments, and job titles",
    "Alice has a temporary password requiring change on first login",
    "3 security groups exist with correct membership",
    "All-Employees uses dynamic membership (bonus) or static membership",
    "Bob's usage location is set to \"US\"",
    "Carol's account is disabled",
    "1 external (guest) user has been invited",
    "SSPR is enabled for the IT-Team group"
  ]}
/>
## Hints

<details>
<summary>Hint 1: Finding your tenant domain</summary>

```bash
# Your default domain is usually something like: youralias.onmicrosoft.com
az rest --method get --url "https://graph.microsoft.com/v1.0/domains" --query "value[].id" -o tsv
```

</details>

<details>
<summary>Hint 2: Creating a user with Azure CLI</summary>

```bash
DOMAIN="yourtenant.onmicrosoft.com"

az ad user create \
  --display-name "Alice Johnson" \
  --user-principal-name "alice@$DOMAIN" \
  --password "TempP@ss123!" \
  --force-change-password-next-sign-in true

# Set department and job title via Microsoft Graph
ALICE_ID=$(az ad user show --id "alice@$DOMAIN" --query id -o tsv)
az rest --method patch \
  --url "https://graph.microsoft.com/v1.0/users/$ALICE_ID" \
  --body '{"department":"IT","jobTitle":"Cloud Engineer"}'
```

</details>

<details>
<summary>Hint 3: Creating groups and adding members</summary>

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
<summary>Hint 4: Inviting an external user</summary>

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
<summary>Hint 5: Enabling SSPR</summary>

:::note

SSPR configuration is best done through the Azure Portal:
1. Go to **Microsoft Entra ID** → **Password reset**
2. Set **Self-service password reset enabled** to **Selected**
3. Select the **IT-Team** group
4. Under **Authentication methods**, set **Number of methods required** to 1
5. Check **Email** as an allowed method

:::
</details>

## Learning Resources

- [Create users in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-create-delete-users)
- [Create groups and add members](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-manage-groups)
- [Invite external users (B2B)](https://learn.microsoft.com/en-us/entra/external-id/what-is-b2b)
- [Configure SSPR](https://learn.microsoft.com/en-us/entra/identity/authentication/tutorial-enable-sspr)
- [Dynamic membership rules](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership)

## Break & Fix

After completing the challenge, try these troubleshooting scenarios:

1. **Broken login**: Disable Alice's account, then try to assign her a role. What error do you get? How do you diagnose it?
2. **Group membership mystery**: Remove Bob from `Finance-Team`, then check if he can still access resources assigned to that group. How long does it take for the change to propagate?
3. **Guest access gone wrong**: Invite a guest user but don't assign them to any group. Can they see anything in your tenant? What's the default access level for guests?

## Knowledge Check

<details>
<summary>1. What is the difference between a security group and a Microsoft 365 group?</summary>

**Security groups** are used to manage access to Azure resources (RBAC, storage, VNets, etc.). They don't have email addresses.

**Microsoft 365 groups** provide collaboration features including a shared mailbox, calendar, SharePoint site, and Planner. They can also be used for access management.

For the AZ-104 exam, you'll primarily work with **security groups** for RBAC assignments.

</details>

<details>
<summary>2. Can you assign Azure licenses to a group?</summary>

**Yes!** This is called **group-based licensing**. When you assign a license to a group, all members automatically receive the license. When a user is removed from the group, the license is automatically reclaimed.

This requires at least a **Microsoft Entra ID P1** license.

</details>

<details>
<summary>3. What happens when you delete a user in Entra ID?</summary>

The user is **soft-deleted** and moved to the "Deleted users" section. You have **30 days** to restore the user before they are permanently deleted. During this period, all their properties are preserved.

</details>

<details>
<summary>4. What authentication methods are available for SSPR?</summary>

- Email
- Mobile phone (SMS)
- Mobile app notification (Microsoft Authenticator)
- Mobile app code
- Office phone
- Security questions (not recommended for admins)

The exam may ask you to configure the **number of methods required** (1 or 2).

</details>

## Cleanup

This challenge uses only Entra ID resources (no Azure resources to delete). To clean up:

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

**Next**: [Challenge 02 | RBAC & Access Management](/docs/az-104/identity/challenge-02)
