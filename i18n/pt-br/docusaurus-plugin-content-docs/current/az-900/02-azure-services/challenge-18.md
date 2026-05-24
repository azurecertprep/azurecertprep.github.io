---
sidebar_position: 12
title: "Desafio 18: Segurança â€” Zero Trust, Defesa em Profundidade e Defender"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 18: Segurança â€” Zero Trust, Defesa em Profundidade e Defender

:::info Tempo Estimado
**20-30 min** | **Custo**: Gratuito | **Domínio**: Arquitetura e Serviços Azure (35-40%)
:::

## Habilidades do exame cobertas

- Descrever o conceito de Zero Trust
- Descrever o propósito do modelo defense-in-depth
- Descrever o propósito do Microsoft Defender for Cloud

## Visão Geral

A segurança no Azure é construída sobre conceitos fundamentais: **Zero Trust** (nunca confie, sempre verifique), **defense-in-depth** (múltiplas camadas de segurança) e **Microsoft Defender for Cloud** (gerenciamento unificado de segurança). Esses conceitos trabalham juntos para proteger seus recursos na nuvem.

## Explorar

### Tarefa 1: Entender Zero Trust

Zero Trust opera em três princípios:

| Princípio | Descrição | Exemplo |
|-----------|-----------|---------|
| **Verificar explicitamente** | Sempre autenticar e autorizar com base em todos os dados disponíveis | Verificar identidade do usuário, localização, saúde do dispositivo |
| **Acesso com least privilege** | Dar permissões mínimas necessárias | Usar acesso just-in-time e just-enough-access |
| **Assumir violação** | Minimizar raio de explosão e verificar de ponta a ponta | Segmentar acesso, usar criptografia, verificar tudo |

**Segurança tradicional**: "Confiar em tudo dentro da rede"
**Zero Trust**: "Não confiar em nada, verificar tudo"

### Tarefa 2: Entender defense-in-depth

Defense-in-depth usa múltiplas camadas de segurança. Se uma camada falhar, a próxima camada captura a ameaça:

```text
Layer 1: Physical Security    â†’ Datacenter access controls
Layer 2: Identity & Access    â†’ Entra ID, MFA, Conditional Access
Layer 3: Perimeter           â†’ DDoS protection, firewalls
Layer 4: Network             â†’ NSGs, VNets, segmentation
Layer 5: Compute             â†’ VM security, patching, endpoint protection
Layer 6: Application         â†’ Secure coding, vulnerability scanning
Layer 7: Data                â†’ Encryption at rest and in transit
```

**Insight principal**: Nenhuma camada única fornece proteção completa. A segurança requer TODAS as camadas trabalhando juntas.

### Tarefa 3: Explorar Microsoft Defender for Cloud

1. No Azure Portal, pesquise por **Microsoft Defender for Cloud**
2. Explore as seções principais:
   - **Overview**: Pontuação de postura de segurança
   - **Recommendations**: Melhorias de segurança sugeridas
   - **Security alerts**: Ameaças detectadas
   - **Regulatory compliance**: Conformidade com padrões
3. Observe o **Secure Score** â€” uma classificação percentual da sua postura de segurança

**Defender for Cloud fornece:**
- Avaliação contínua de segurança
- Recomendações de segurança
- Proteção contra ameaças com alertas
- Rastreamento de conformidade (PCI-DSS, SOC, ISO 27001)
- Acesso just-in-time a VMs

### Tarefa 4: Capacidades do Defender for Cloud

| Recurso | Descrição | Custo |
|---------|-----------|-------|
| **Secure Score** | Avaliar sua postura de segurança (0-100%) | Gratuito |
| **Recommendations** | Correções de segurança priorizadas | Gratuito |
| **Enhanced protections** | Planos Defender para serviços específicos | Pago (por recurso) |
| **Regulatory compliance** | Mapear controles para padrões de conformidade | Gratuito (básico) |

**Planos Defender** (segurança aprimorada para serviços específicos):
- Defender for Servers
- Defender for Storage
- Defender for SQL
- Defender for Containers
- Defender for App Service
- Defender for Key Vault

### Tarefa 5: Zero Trust na prática

Como os serviços Azure implementam Zero Trust:

| Controle Zero Trust | Serviço Azure |
|--------------------|---------------|
| Verificar identidade | Entra ID + MFA |
| Verificar saúde do dispositivo | Intune + Conditional Access |
| Least privilege | RBAC + PIM (Privileged Identity Management) |
| Micro-segmentação | NSGs + VNets + Private endpoints |
| Criptografia | Azure Key Vault + TLS + disk encryption |
| Monitorar e responder | Defender for Cloud + Sentinel |

:::tip Alternativa Azure CLI
```bash
# Check Defender for Cloud secure score
az security secure-score list --output table 2>/dev/null || echo "Explore Defender for Cloud in the portal"

# List security recommendations
az security assessment list --query "[0:5].{Name:displayName, Status:status.code}" --output table 2>/dev/null || echo "View recommendations in the portal"
```
:::

## Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **Zero Trust** | Nunca confie, sempre verifique â€” independentemente da localização na rede |
| **Defense-in-depth** | Múltiplas camadas de segurança protegendo recursos |
| **Microsoft Defender for Cloud** | Gerenciamento unificado de segurança e proteção contra ameaças |
| **Secure Score** | Medida percentual da sua postura de segurança |
| **Least privilege** | Conceder permissões mínimas necessárias para a tarefa |
| **Assume breach** | Projetar segurança esperando que atacantes já estão dentro |

## Verificação de Conhecimento

<KnowledgeCheck
  questions={[
    {
      id: 'az900-18-q1',
      question: 'Qual princípio de segurança afirma que você deve "nunca confiar, sempre verificar"?',
      options: ['Defense-in-depth', 'Zero Trust', 'Least privilege', 'Responsabilidade compartilhada'],
      correctAnswer: 1,
      explanation: 'Zero Trust é o modelo de segurança que elimina a confiança implícita e requer verificação contínua de cada usuário, dispositivo e conexão, independentemente de estarem dentro ou fora da rede.'
    },
    {
      id: 'az900-18-q2',
      question: 'No modelo defense-in-depth, o que acontece se uma camada de segurança for violada?',
      options: ['Todos os dados são imediatamente expostos', 'A próxima camada fornece proteção adicional', 'O sistema desliga automaticamente', 'A violação é impossível com defense-in-depth'],
      correctAnswer: 1,
      explanation: 'Defense-in-depth usa múltiplas camadas de segurança. Se um atacante penetrar uma camada, ele ainda precisa superar camadas adicionais para alcançar dados sensíveis. Nenhuma falha de camada única expõe tudo.'
    },
    {
      id: 'az900-18-q3',
      question: 'O que o Secure Score do Microsoft Defender for Cloud mede?',
      options: ['Largura de banda da rede', 'Otimização de custos', 'Postura de segurança do seu ambiente', 'Performance da aplicação'],
      correctAnswer: 2,
      explanation: 'Secure Score é uma porcentagem (0-100%) que mede sua postura de segurança. Pontuações mais altas indicam melhores práticas de segurança. Recomendações ajudam a melhorar sua pontuação.'
    },
    {
      id: 'az900-18-q4',
      question: 'Qual camada de defense-in-depth inclui firewalls e proteção DDoS?',
      options: ['Segurança física', 'Identidade e acesso', 'Perímetro', 'Rede'],
      correctAnswer: 2,
      explanation: 'A camada de perímetro protege contra ataques no nível de rede como DDoS e usa firewalls para filtrar tráfego na borda da sua rede.'
    },
    {
      id: 'az900-18-q5',
      question: 'Um princípio do Zero Trust afirma que usuários devem ter apenas as permissões mínimas necessárias para fazer seu trabalho. Como isso se chama?',
      options: ['Assume breach', 'Verify explicitly', 'Least privilege access', 'Defense-in-depth'],
      correctAnswer: 2,
      explanation: 'Least privilege access significa dar a usuários e aplicações apenas as permissões mínimas necessárias para executar suas tarefas. Isso limita o raio de explosão se uma conta for comprometida.'
    }
  ]}
/>

## Saiba Mais

- ðŸ“š [Study Guide AZ-900](https://github.com/ricmmartins/study-guide-az900) â€” Materiais de estudo selecionados
- [Microsoft Learn: Describe Azure identity, access, and security](https://learn.microsoft.com/en-us/training/modules/describe-azure-identity-access-security/)
- [Zero Trust documentation](https://learn.microsoft.com/en-us/security/zero-trust/)
- [Microsoft Defender for Cloud](https://learn.microsoft.com/en-us/azure/defender-for-cloud/)
