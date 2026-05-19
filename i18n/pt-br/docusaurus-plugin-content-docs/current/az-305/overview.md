---
sidebar_position: 1
title: "AZ-305: Arquiteto de Soluções Azure"
---

# AZ-305: Projetando Soluções de Infraestrutura Microsoft Azure

:::info Detalhes do Exame

**Versão do exame**: Habilidades medidas a partir de 17 de abril de 2026 | **Nota de aprovação**: 700/1000 | **Duração**: ~100-120 minutos

:::

## Para quem é este exame?

Como candidato a esta certificação, você possui expertise em projetar soluções em nuvem e híbridas executadas no Azure, incluindo computação, rede, armazenamento, monitoramento e segurança. Você aconselha stakeholders e traduz requisitos de negócio em projetos alinhados ao Azure Well-Architected Framework e ao Cloud Adoption Framework for Azure.

Você deve ter experiência avançada e conhecimento em operações de TI, incluindo redes, virtualização, identidade, segurança, continuidade de negócios, recuperação de desastres, plataformas de dados e governança. Você também deve ter experiência com administração do Azure, desenvolvimento Azure e processos DevOps.

**Certificação pré-requisito**: [AZ-104: Azure Administrator Associate](https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/) (recomendado)

## Habilidades em Resumo

| Domínio | Peso | Desafios |
|---------|------|----------|
| Projetar soluções de identidade, governança e monitoramento | 25-30% | 01-13 |
| Projetar soluções de armazenamento de dados | 20-25% | 14-24 |
| Projetar soluções de continuidade de negócios | 15-20% | 25-33 |
| Projetar soluções de infraestrutura | 30-35% | 34-49 |
| Capstone entre domínios | Todos | 50 |

:::tip Estrutura dos Desafios

Os desafios sao organizados por domínio do exame. Dentro de cada domínio, os desafios progridem de habilidades individuais para capstones de domínio que combinam múltiplos conceitos. O ultimo desafio (50) é um exercício completo de arquitetura entre domínios.

:::

## Como Este Exame Difere do AZ-104

| Aspecto | AZ-104 (Administrador) | AZ-305 (Arquiteto) |
|---------|------------------------|---------------------|
| Foco | Implementacao e gerenciamento | Design e tomada de decisão |
| Estilo de questão | "Como você configura X?" | "Qual solução melhor atende estes requisitos?" |
| Habilidades testadas | Comandos CLI, passos no portal | Selecao de serviços, trade-offs, arquitetura |
| Profundidade do cenário | Tarefas de serviço único | Cenários multi-serviço e multi-requisito |
| Alinhamento com frameworks | N/A | Well-Architected Framework, CAF |

## Como Este Site Funciona

Cada desafio segue um formato focado em design:

1. **Cenário de Negocio** | Perfil da empresa com requisitos, restrições e orçamento
2. **Habilidades do Exame Cobertas** | Topicos exatos do guia de estudo oficial
3. **Tarefas de Design** | "Projete uma solução que..." com requisitos específicos
4. **Matriz de Decisao** | Compare opções de serviço com trade-offs
5. **Validacao** | Implante uma prova de conceito para verificar o design
6. **Diagrama de Arquitetura** | Visualize a solução
7. **Verificação de Conhecimento** | Questoes de cenário no estilo do exame
8. **Limpeza** | Scripts para excluir recursos e evitar custos

## Pre-requisitos

- **Assinatura do Azure** | [Conta Gratuita](https://azure.microsoft.com/free/) (crédito de $200) ou [Azure para Estudantes](https://azure.microsoft.com/free/students/) ($100)
- **Conhecimento de AZ-104** | Familiaridade com administração do Azure (este exame se baseia nele)
- **Azure CLI** instalado ou use o [Azure Cloud Shell](https://shell.azure.com)
- **Compreensao conceitual** de redes, identidade, armazenamento e computação

## Recursos Oficiais de Estudo

- [Guia de Estudo AZ-305](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-305)
- [Avaliação Prática Gratuita](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-305/practice/assessment?assessment-type=practice&assessmentId=15)
- [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/)
- [Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/)
- [Cloud Adoption Framework](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/)
- [Sandbox do Exame](https://aka.ms/examdemo)
