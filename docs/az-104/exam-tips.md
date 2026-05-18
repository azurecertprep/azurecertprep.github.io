---
sidebar_position: 4
title: "Exam Tips & Strategy"
---

# Exam Tips & Strategy

The AZ-104 is a proctored exam with specific question formats. Knowing how the exam works is almost as important as knowing the content.

## Exam Format

| Detail | Value |
|--------|-------|
| **Number of questions** | ~40-60 questions |
| **Duration** | 100-120 minutes |
| **Passing score** | 700 out of 1000 |
| **Question types** | Multiple choice, multiple answer, drag-and-drop, hot area, case study, lab |
| **Penalty for wrong answers** | None — always answer every question |
| **Can you go back?** | Yes, within a section. No, between sections. |

## Question Types You'll See

### Multiple Choice
Standard "pick one" or "pick two" answers. Read carefully — "which TWO" means exactly two.

### Drag-and-Drop
Match items from a list to targets. Common for ordering deployment steps or matching services to requirements.

### Hot Area
Click on the correct area of a screenshot or diagram. Common for Portal-based questions ("where would you click to configure X?").

### Case Study
A multi-page scenario with 4-7 questions. You can navigate between questions within the case study but cannot return after moving to the next section.

:::warning Case Study Strategy
Read the **requirements** tab first, then the scenario. Many case study questions only need specific details — don't try to memorize everything.
:::

### Active Lab
A real Azure Portal environment where you complete tasks. You have limited time and a restricted set of actions.

:::tip Lab Strategy
Labs are scored on the **end state**, not the steps you take. If the CLI fails, use the Portal. If you make a mistake, just redo it. The evaluator checks the final configuration.
:::

## Time Management

| Section | Suggested Time |
|---------|---------------|
| First pass through all questions | 60-70 minutes |
| Review flagged questions | 15-20 minutes |
| Lab section (if present) | 20-30 minutes |
| Buffer | 5-10 minutes |

**Tip**: Don't spend more than 2 minutes on any single question in your first pass. Flag it and move on.

## Study Strategy

### Week 1-2: Identity & Governance + Storage (Challenges 01-06)
These domains are 35-45% of the exam. Start here because Entra ID and RBAC concepts appear in questions across ALL domains.

### Week 3-4: Compute + Networking (Challenges 07-13)
These are the most hands-on domains. Spend extra time on VMs, App Service, VNets, and NSGs — they're heavily tested.

### Week 5: Monitoring + Capstone (Challenges 14-16)
Monitoring is 10-15% but the concepts (Azure Monitor, KQL, alerts) connect everything together.

### Week 6: Review + Practice
- Take the [Free Practice Assessment](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-104/practice/assessment?assessment-type=practice&assessmentId=21)
- Review the [Coverage Matrix](/docs/az-104/coverage-matrix) — any gaps?
- Redo Break & Fix scenarios from each challenge

## Common Exam Gotchas

:::warning Things that catch people off guard
1. **Moving VMs between regions** requires Azure Site Recovery — it's NOT a simple move operation
2. **SAS tokens** — know the difference between account SAS, service SAS, and user delegation SAS
3. **Azure Policy** vs **RBAC** — Policy controls WHAT resources can do, RBAC controls WHO can do things
4. **NSG rules** are stateful — if you allow inbound, the response outbound is automatic
5. **Storage redundancy** — know LRS, ZRS, GRS, RA-GRS, GZRS, RA-GZRS and when to use each
6. **Azure Advisor** shows recommendations but does NOT auto-apply them
7. **Management groups** can be nested up to 6 levels deep (root + 5 levels)
8. **Custom DNS names** for App Service require a CNAME or A record + TXT verification
:::

## Useful Links

| Resource | Link |
|----------|------|
| **Try the exam interface** | [Exam Sandbox](https://aka.ms/examdemo) |
| **Free practice questions** | [Practice Assessment](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-104/practice/assessment?assessment-type=practice&assessmentId=21) |
| **Schedule the exam** | [Pearson VUE](https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/) |
| **Exam Replay offer** | [Exam Deals](https://learn.microsoft.com/en-us/credentials/certifications/deals) |
| **Certification renewal** | [Renew for free](https://learn.microsoft.com/en-us/credentials/certifications/renew-your-microsoft-certification) |

## After You Pass 🎉

- Your certification appears on your [Microsoft Learn profile](https://learn.microsoft.com/en-us/users/) within 24 hours
- You get a **digital badge** via Credly that you can share on LinkedIn
- The certification is **valid for 1 year** — renew for free by passing an online assessment
- Consider your next step: [AZ-305](https://learn.microsoft.com/en-us/credentials/certifications/azure-solutions-architect/) (Architect), [AZ-500](https://learn.microsoft.com/en-us/credentials/certifications/azure-security-engineer/) (Security), or [AZ-400](https://learn.microsoft.com/en-us/credentials/certifications/devops-engineer/) (DevOps)

---

**Ready to start studying?** Head to [Challenge 01: Entra ID Users & Groups](/docs/az-104/identity/challenge-01).
