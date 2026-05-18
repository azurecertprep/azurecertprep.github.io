---
sidebar_position: 1
title: "Challenge 16: Capstone: Day in the Life of an Azure Admin"
---

# Challenge 16: Capstone: Day in the Life of an Azure Admin

| | |
|---|---|
| **Estimated Time** | 90–120 minutes |
| **Cost Estimate** | ~$0.50 |
| **Exam Weight** | All 5 domains |

:::info Capstone Challenge

This challenge spans **all five AZ-104 exam domains**. It simulates a real workday where you troubleshoot issues using skills from every domain. Treat this as your final exam rehearsal.
:::

## Scenario

You arrive at work Monday morning at Contoso to find **five urgent tickets** in your queue. Each ticket tests knowledge from a different exam domain. No one else is available | it's all on you.

## Setup

```bash
# Create resource groups for the capstone
for i in identity storage compute network monitor; do
  az group create --name "rg-az104-capstone-$i" --location eastus
done
```

---

## 🎫 Ticket 1: Identity Crisis

**Domain: Manage Microsoft Entra ID Identities and Governance**

> *"New hire Jordan Chen can't access the Azure Portal. Their account exists in Entra ID but they can't sign in. The helpdesk says the password was never set up properly. Also, Jordan should be in the 'Developers' group but isn't showing up as a member."*

### Diagnose

1. Check if Jordan's account is **enabled** in Entra ID
2. Check if **SSPR (Self-Service Password Reset)** is configured
3. Verify group membership | is Jordan in the "Developers" group?

<details>
<summary>💡 Diagnosis Steps</summary>

```bash
# Check if user account is enabled
az ad user show --id jordan@contoso.com --query accountEnabled

# Check group membership
az ad group member check \
  --group "Developers" \
  --member-id $(az ad user show --id jordan@contoso.com --query id -o tsv)
```

</details>

### Fix

1. **Enable the account** (if disabled)
2. **Reset the password** and require change at next login
3. **Add Jordan to the Developers group**

<details>
<summary>💡 Fix Commands</summary>

```bash
# Enable account
az ad user update --id jordan@contoso.com --account-enabled true

# Reset password
az ad user update --id jordan@contoso.com --password "TempP@ss123!" --force-change-password-next-sign-in true

# Add to group
az ad group member add \
  --group "Developers" \
  --member-id $(az ad user show --id jordan@contoso.com --query id -o tsv)
```

</details>

### Root Cause
The user was provisioned by an automated script that failed partway through | the account was created but left in a disabled state, no initial password was set, and the group assignment step was skipped.

---

## 🎫 Ticket 2: Storage SOS

**Domain: Implement and Manage Storage**

> *"The analytics team reports their blob uploads from AzCopy are failing with 'AuthorizationFailure'. This was working fine yesterday."*

### Diagnose

1. Check the **SAS token** | has it expired?
2. Check the **storage account firewall** | was a network rule added that blocks their IP?
3. Check if **access keys were rotated**

<details>
<summary>💡 Diagnosis Steps</summary>

```bash
# Check storage account network rules
az storage account show \
  --name stcontoso \
  --resource-group rg-az104-capstone-storage \
  --query networkRuleSet

# Check if the default action is Deny
az storage account show \
  --name stcontoso \
  --resource-group rg-az104-capstone-storage \
  --query networkRuleSet.defaultAction

# Test access with current SAS token
azcopy list "https://stcontoso.blob.core.windows.net/data?<SAS_TOKEN>"
```

</details>

### Fix

Generate a new SAS token or update firewall rules to allow the analytics team's IP.

<details>
<summary>💡 Fix Commands</summary>

```bash
# Option A: Generate a new SAS token
END_DATE=$(date -u -d "+7 days" '+%Y-%m-%dT%H:%MZ')
az storage account generate-sas \
  --account-name stcontoso \
  --permissions rwdlacup \
  --resource-types sco \
  --services b \
  --expiry $END_DATE \
  -o tsv

# Option B: Add IP to firewall allow list
az storage account network-rule add \
  --account-name stcontoso \
  --resource-group rg-az104-capstone-storage \
  --ip-address 203.0.113.50
```

</details>

### Root Cause
The SAS token generated last week had a 7-day expiry and expired overnight. Additionally, a security team member added firewall rules to the storage account but didn't add the analytics team's IP.

---

## 🎫 Ticket 3: VM Down

**Domain: Deploy and Manage Azure Compute Resources**

> *"A production VM is unreachable. The monitoring dashboard shows it as 'Stopped (deallocated)' but nobody remembers stopping it."*

### Diagnose

1. Check the **activity log** | who or what stopped the VM?
2. Check if there's an **auto-shutdown schedule** configured
3. Check the VM's current **power state**

<details>
<summary>💡 Diagnosis Steps</summary>

```bash
# Check activity log for Stop/Deallocate events
az monitor activity-log list \
  --resource-group rg-az104-capstone-compute \
  --query "[?operationName.value=='Microsoft.Compute/virtualMachines/deallocate/action'].{Time:eventTimestamp, Caller:caller, Status:status.value}" \
  -o table

# Check auto-shutdown schedule
az vm auto-shutdown show \
  --resource-group rg-az104-capstone-compute \
  --name vm-prod-01

# Check current VM status
az vm get-instance-view \
  --resource-group rg-az104-capstone-compute \
  --name vm-prod-01 \
  --query instanceView.statuses
```

</details>

### Fix

1. **Start the VM** immediately
2. **Review the activity log** to identify the cause
3. **Remove auto-shutdown** if it was misconfigured

<details>
<summary>💡 Fix Commands</summary>

```bash
# Start the VM
az vm start \
  --resource-group rg-az104-capstone-compute \
  --name vm-prod-01

# Disable auto-shutdown if misconfigured
az vm auto-shutdown \
  --resource-group rg-az104-capstone-compute \
  --name vm-prod-01 \
  --off
```

</details>

### Root Cause
A developer enabled auto-shutdown at 7:00 PM for their dev VM but accidentally applied it to the production VM. The activity log shows the shutdown was triggered by the `Microsoft.DevTestLab` resource provider.

---

## 🎫 Ticket 4: Network Lockout

**Domain: Configure and Manage Virtual Networking**

> *"After a 'security hardening' change last Friday, the web application on port 443 is no longer reachable from the internet."*

### Diagnose

1. Check **NSG rules** | was a deny-all rule added?
2. Check the **Load Balancer health probe** | is the backend healthy?
3. Check if the **VM NIC still has the correct NSG** associated

<details>
<summary>💡 Diagnosis Steps</summary>

```bash
# List NSG rules
az network nsg rule list \
  --resource-group rg-az104-capstone-network \
  --nsg-name nsg-web \
  -o table

# Check effective security rules on the NIC
az network nic list-effective-nsg \
  --resource-group rg-az104-capstone-network \
  --name vm-web-01-nic

# Check LB health probe status (via Portal: LB > Insights)
az network lb probe show \
  --resource-group rg-az104-capstone-network \
  --lb-name lb-web \
  --name hp-https

# Use Network Watcher IP flow verify
az network watcher test-ip-flow \
  --direction Inbound \
  --local 10.0.0.4:443 \
  --protocol TCP \
  --remote 0.0.0.0:* \
  --vm vm-web-01 \
  --resource-group rg-az104-capstone-network
```

</details>

### Fix

Add a proper NSG allow rule for HTTPS traffic and verify the health probe configuration.

<details>
<summary>💡 Fix Commands</summary>

```bash
# Add NSG rule to allow HTTPS
az network nsg rule create \
  --resource-group rg-az104-capstone-network \
  --nsg-name nsg-web \
  --name Allow-HTTPS \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 443 \
  --source-address-prefixes '*'

# Verify the health probe is checking the right port
az network lb probe show \
  --resource-group rg-az104-capstone-network \
  --lb-name lb-web \
  --name hp-https
```

</details>

### Root Cause
The security team added a `DenyAllInbound` rule at priority 200, which overrides the default rules. They forgot to add an explicit `Allow` rule for port 443 before the deny rule.

---

## 🎫 Ticket 5: Where Are My Alerts?

**Domain: Monitor and Maintain Azure Resources**

> *"The team says they never received an alert when a VM went down last weekend. The backup job also failed Friday night but no one was notified."*

### Diagnose

1. Check the **action group** | is the email address correct?
2. Check if the **alert rules are enabled**
3. Check **backup alert settings** in the Recovery Services vault

<details>
<summary>💡 Diagnosis Steps</summary>

```bash
# List alert rules and their status
az monitor metrics alert list \
  --resource-group rg-az104-capstone-monitor \
  -o table

# Check action group configuration
az monitor action-group show \
  --resource-group rg-az104-capstone-monitor \
  --name ag-ops-team

# Check if alerts are enabled
az monitor metrics alert show \
  --resource-group rg-az104-capstone-monitor \
  --name alert-vm-availability \
  --query isEnabled
```

</details>

### Fix

1. **Verify action group** has the correct email address
2. **Enable the alert rule** (it was disabled)
3. **Configure backup failure alerts**

<details>
<summary>💡 Fix Commands</summary>

```bash
# Update action group with correct email
az monitor action-group update \
  --resource-group rg-az104-capstone-monitor \
  --name ag-ops-team \
  --add-action email ops-email correctemail@contoso.com

# Enable the alert rule
az monitor metrics alert update \
  --resource-group rg-az104-capstone-monitor \
  --name alert-vm-availability \
  --enabled true
```

For backup alerts: Configure via **Recovery Services vault → Alerts → Configure notifications**.

</details>

### Root Cause
The action group had the wrong email (a typo | `ops@contso.com` instead of `ops@contoso.com`). The VM availability alert was created but left in a disabled state during testing and never re-enabled. Backup alerts were never configured.

---

## 📝 Knowledge Check: Exam-Style Questions

**Question 1** *(Identity)*
A user reports they cannot sign in to the Azure Portal. Their account exists in Microsoft Entra ID. Which should you check FIRST?

- A. Check if the user has an Azure subscription
- B. Check if the user account is enabled
- C. Reset the user's MFA registration
- D. Add the user to the Global Administrator role

<details><summary>Answer</summary>**B.** A disabled account prevents sign-in. Always check the basics first | is the account enabled and does it have a valid password?</details>

**Question 2** *(Storage)*
AzCopy uploads to a storage account fail with "AuthorizationFailure." The SAS token was generated 8 days ago with a 7-day expiry. What is the most likely cause?

- A. The storage account firewall is blocking requests
- B. The SAS token has expired
- C. The storage account has been deleted
- D. AzCopy needs to be updated

<details><summary>Answer</summary>**B.** A SAS token with a 7-day expiry generated 8 days ago has expired. Generate a new SAS token with an appropriate expiry.</details>

**Question 3** *(Compute)*
A VM is showing as "Stopped (deallocated)" and you need to find out what stopped it. Which tool should you use?

- A. Azure Monitor Metrics
- B. Activity Log
- C. Resource Health
- D. Network Watcher

<details><summary>Answer</summary>**B.** The Activity Log records all control-plane operations, including who or what deallocated the VM and when.</details>

**Question 4** *(Networking)*
After adding a DenyAllInbound NSG rule at priority 200, web traffic on port 443 is blocked. What is the correct fix?

- A. Remove all NSG rules
- B. Add an Allow rule for port 443 with a priority lower than 200 (e.g., 100)
- C. Add an Allow rule for port 443 with a priority higher than 200 (e.g., 300)
- D. Disassociate the NSG from the subnet

<details><summary>Answer</summary>**B.** NSG rules are evaluated by priority | lowest number wins. An Allow rule at priority 100 is evaluated before a Deny rule at priority 200.</details>

**Question 5** *(Monitoring)*
An alert rule is configured with the correct condition but the team never receives email notifications. What should you check?

- A. The alert severity level
- B. The action group configuration and email address
- C. The Azure Monitor pricing tier
- D. The Log Analytics workspace retention policy

<details><summary>Answer</summary>**B.** If the alert fires but no notification is received, the action group is the likely culprit | check that it has the correct email addresses and that it is attached to the alert rule.</details>

---

## 🧹 Cleanup

```bash
# Delete all capstone resource groups
for i in identity storage compute network monitor; do
  az group delete --name "rg-az104-capstone-$i" --yes --no-wait
done
```

## ✅ Success Criteria

- [ ] **Ticket 1** | Identity Crisis resolved (account enabled, password reset, group membership fixed)
- [ ] **Ticket 2** | Storage SOS resolved (new SAS token or firewall rules updated)
- [ ] **Ticket 3** | VM Down resolved (VM started, auto-shutdown removed, root cause identified)
- [ ] **Ticket 4** | Network Lockout resolved (NSG rule added, traffic flowing)
- [ ] **Ticket 5** | Alerts fixed (action group corrected, alert enabled, backup alerts configured)
- [ ] Each ticket: diagnosis steps documented, root cause identified, fix applied
- [ ] All resource groups cleaned up

---

:::tip You've Completed the AZ-104 Challenge Series!

If you've worked through all 28 challenges, you've covered every major skill measured on the AZ-104 exam. Review any areas where you struggled, then schedule your exam with confidence. Good luck!
:::
