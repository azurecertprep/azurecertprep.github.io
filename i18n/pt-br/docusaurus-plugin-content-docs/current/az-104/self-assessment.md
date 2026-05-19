---
sidebar_position: 2
title: "Am I Ready?"
---

import SelfAssessment from '@site/src/components/SelfAssessment';

# Estou pronto para o AZ-104?

Antes de mergulhar nos desafios, reserve alguns minutos para avaliar sua prontidão. O AZ-104 pressupõe que você já possui conhecimento fundamental de conceitos de TI e alguma experiência com o Azure.

## Lista de autoavaliação

Clique em cada linha para alternar: ✅ Confortável | ⚠️ Preciso Revisar | ❌ Novo para Mim

### Conhecimento geral de TI

<SelfAssessment
  storageKey="general-it"
  skills={[
    "Entendo conceitos básicos de redes (endereços IP, sub-redes, DNS, DHCP)",
    "Consigo navegar em uma interface de linha de comando (Bash, PowerShell ou CMD)",
    "Entendo conceitos de autenticação e autorização de usuários",
    "Conheço a diferença entre IaaS, PaaS e SaaS",
    "Entendo conceitos de virtualização (VMs, hypervisors)",
    "Consigo ler e escrever JSON básico",
  ]}
/>

### Conhecimento específico do Azure

<SelfAssessment
  storageKey="azure-specific"
  skills={[
    "Já fiz login no Azure Portal e naveguei por ele",
    "Entendo assinaturas do Azure, grupos de recursos e recursos",
    "Já criei pelo menos um recurso do Azure (VM, Storage, etc.)",
    "Já usei Azure CLI ou Azure PowerShell pelo menos uma vez",
    "Sei o que é ARM (Azure Resource Manager)",
    "Entendo regiões do Azure e zonas de disponibilidade",
  ]}
/>

## Como interpretar seus resultados

### Maioria ✅: você está pronto!
Vá direto para a [Configuração do Laboratório](/docs/az-104/lab-setup) e comece o Desafio 01.

### Mistura de ✅ e ⚠️: você está quase pronto
Comece os desafios, mas reserve um tempo extra para os tópicos desconhecidos. Use a seção **Recursos de Aprendizado** em cada desafio para preencher as lacunas.

### Vários ❌: comece pelos fundamentos primeiro
Considere estes recursos antes de começar:
- [AZ-900: Azure Fundamentals](https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/) | Trilha de aprendizado gratuita cobrindo todos os conceitos básicos
- [Tour pelo Azure Portal](https://learn.microsoft.com/en-us/azure/azure-portal/azure-portal-overview) | Familiarize-se com a navegação no Portal
- [Introdução ao Azure CLI](https://learn.microsoft.com/en-us/cli/azure/get-started-with-azure-cli) | Noções básicas de linha de comando

:::tip Dica

Nenhuma experiência com o Azure? Tudo bem! A certificação AZ-900 (Azure Fundamentals) é um excelente ponto de partida. É um exame mais leve que constrói a base necessária para o AZ-104. Muitas pessoas fazem o AZ-900 primeiro e depois o AZ-104.

:::
## Expectativas de experiência

De acordo com a Microsoft, candidatos ao AZ-104 devem ter:

- **6+ meses** de experiência prática em administração do Azure
- Experiência com **PowerShell** e/ou **Azure CLI**
- Familiaridade com o **Azure Portal**
- Conhecimento de **templates ARM** ou **arquivos Bicep**
- Conhecimento de **Microsoft Entra ID** (anteriormente Azure AD)

:::note Nota

Não tem 6 meses de experiência? Estes desafios foram projetados para acelerar seu aprendizado. Se você estiver motivado e dedicar tempo focado, poderá construir experiência prática equivalente completando todos os 28 desafios. Muitos candidatos aprovados passaram com menos de 6 meses de experiência estudando intensivamente.

:::
---

**Pronto para começar?** Vá para a [Configuração do Laboratório](/docs/az-104/lab-setup) para configurar seu ambiente.
