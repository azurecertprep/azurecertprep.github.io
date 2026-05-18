---
sidebar_position: 1
title: "AZ-104: Azure Administrator"
---

# AZ-104: Azure Administrator | Visão Geral do Exame

> **Versão do exame**: Habilidades medidas a partir de 17 de abril de 2026 | **Nota de aprovação**: 700/1000 | **Duração**: ~100-120 minutos

## Para quem é este exame?

Como candidato a esta certificação, você deve ter experiência na implementação, gerenciamento e monitoramento do ambiente Microsoft Azure de uma organização, incluindo redes virtuais, armazenamento, computação, identidade, segurança e governança.

## Habilidades em Resumo

| Domínio | Peso | Desafios |
|---------|------|----------|
| 🔐 Gerenciar identidades e governança do Azure | 20–25% | 01, 02, 03 |
| 💾 Implementar e gerenciar armazenamento | 15–20% | 04, 05, 06 |
| ⚙️ Implantar e gerenciar recursos de computação do Azure | 20–25% | 07, 08, 09, 10 |
| 🌐 Implementar e gerenciar redes virtuais | 15–20% | 11, 12, 13 |
| 📊 Monitorar e manter recursos do Azure | 10–15% | 14, 15 |
| 🏆 Capstone entre domínios | | | 16 |

## Como Este Site Funciona

Cada desafio segue um formato consistente:

1. **Introdução** | Cenário do mundo real que contextualiza o desafio
2. **Habilidades do Exame Cobertas** | Tópicos exatos do guia de estudo oficial
3. **Descrição** | Sua missão com tarefas passo a passo
4. **Critérios de Sucesso** | Definição clara de "concluído"
5. **Abas Multi-Ferramenta** | Instruções para Azure CLI, PowerShell e Portal
6. **Dicas** | Dicas expansíveis caso você fique travado
7. **Quebre & Conserte** | Cenários de solução de problemas com configurações incorretas intencionais
8. **Verificação de Conhecimento** | Questões no estilo do exame para você se testar
9. **Limpeza** | Scripts para excluir recursos e evitar custos

## Pré-requisitos

- **Assinatura do Azure** | [Conta Gratuita do Azure](https://azure.microsoft.com/free/) (crédito de $200 por 30 dias) ou [Azure para Estudantes](https://azure.microsoft.com/free/students/) (crédito de $100, sem cartão de crédito)
- **Familiaridade com** | Sistemas operacionais, noções básicas de redes, servidores, virtualização
- **Experiência com** | Azure Portal, ferramentas de linha de comando (CLI ou PowerShell)

:::tip Dica

Laboratório com um clique | Sem necessidade de configuração! [Abra no GitHub Codespaces](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1) e tenha Azure CLI, Bicep e PowerShell prontos em minutos. Gratuito por 60h/mês.

:::
## Recursos de Estudo

| Recurso | Link |
|---------|------|
| Guia de Estudo Oficial | [Guia de Estudo AZ-104](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104) |
| Avaliação Prática Gratuita | [Questões Práticas](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-104/practice/assessment?assessment-type=practice&assessmentId=21) |
| Sandbox do Exame | [Experimente a interface do exame](https://aka.ms/examdemo) |
| Trilha de Aprendizado Microsoft Learn | [Trilha de Aprendizado AZ-104](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-104) |
| Agendar o Exame | [Pearson VUE](https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/) |

## Trilha de Aprendizado

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 260" font-family="Segoe UI, Arial, sans-serif" style={{maxWidth: '680px', width: '100%'}}>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666"/>
    </marker>
  </defs>

  {/* AZ-900 */}
  <rect x="20" y="100" width="150" height="60" rx="8" fill="#d5e8d4" stroke="#82b366" strokeWidth="2"/>
  <text x="95" y="125" textAnchor="middle" fontWeight="bold" fontSize="13" fill="#1b5e20">AZ-900</text>
  <text x="95" y="145" textAnchor="middle" fontSize="11" fill="#555">Fundamentos</text>

  {/* Arrow AZ-900 → AZ-104 */}
  <line x1="170" y1="130" x2="230" y2="130" stroke="#666" strokeWidth="1.5" markerEnd="url(#arrow)"/>

  {/* AZ-104 */}
  <rect x="235" y="100" width="150" height="60" rx="8" fill="#dae8fc" stroke="#6c8ebf" strokeWidth="2"/>
  <text x="310" y="125" textAnchor="middle" fontWeight="bold" fontSize="13" fill="#1a3a5c">AZ-104</text>
  <text x="310" y="145" textAnchor="middle" fontSize="11" fill="#555">Administrador</text>

  {/* Arrow AZ-104 → AZ-305 */}
  <line x1="385" y1="115" x2="490" y2="55" stroke="#666" strokeWidth="1.5" markerEnd="url(#arrow)"/>

  {/* Arrow AZ-104 → AZ-500 */}
  <line x1="385" y1="130" x2="490" y2="130" stroke="#666" strokeWidth="1.5" markerEnd="url(#arrow)"/>

  {/* Arrow AZ-104 → AZ-400 */}
  <line x1="385" y1="145" x2="490" y2="205" stroke="#666" strokeWidth="1.5" markerEnd="url(#arrow)"/>

  {/* AZ-305 */}
  <rect x="495" y="25" width="165" height="60" rx="8" fill="#e1d5e7" stroke="#9673a6" strokeWidth="2"/>
  <text x="577" y="50" textAnchor="middle" fontWeight="bold" fontSize="13" fill="#4a235a">AZ-305</text>
  <text x="577" y="70" textAnchor="middle" fontSize="11" fill="#555">Arquiteto de Soluções</text>

  {/* AZ-500 */}
  <rect x="495" y="100" width="165" height="60" rx="8" fill="#e1d5e7" stroke="#9673a6" strokeWidth="2"/>
  <text x="577" y="125" textAnchor="middle" fontWeight="bold" fontSize="13" fill="#4a235a">AZ-500</text>
  <text x="577" y="145" textAnchor="middle" fontSize="11" fill="#555">Eng. de Segurança</text>

  {/* AZ-400 */}
  <rect x="495" y="175" width="165" height="60" rx="8" fill="#e1d5e7" stroke="#9673a6" strokeWidth="2"/>
  <text x="577" y="200" textAnchor="middle" fontWeight="bold" fontSize="13" fill="#4a235a">AZ-400</text>
  <text x="577" y="220" textAnchor="middle" fontSize="11" fill="#555">Engenheiro DevOps</text>
</svg>

---

**Pronto?** Comece com a autoavaliação [Estou Pronto?](/docs/az-104/self-assessment) ou vá direto para a [Configuração do Laboratório](/docs/az-104/lab-setup).
