---
sidebar_position: 4
title: "Exam Tips & Strategy"
---

# Dicas e Estratégia para o Exame

O AZ-104 é um exame supervisionado com formatos de questão específicos. Saber como o exame funciona é quase tão importante quanto saber o conteúdo.

## Formato do Exame

| Detalhe | Valor |
|---------|-------|
| **Número de questões** | ~40-60 questões |
| **Duração** | 100-120 minutos |
| **Nota de aprovação** | 700 de 1000 |
| **Tipos de questão** | Múltipla escolha, múltiplas respostas, arrastar e soltar, área quente, estudo de caso, laboratório |
| **Penalidade por respostas erradas** | Nenhuma — sempre responda todas as questões |
| **Pode voltar?** | Sim, dentro de uma seção. Não, entre seções. |

## Tipos de Questão que Você Encontrará

### Múltipla Escolha
Questões padrão de "escolha uma" ou "escolha duas" respostas. Leia com atenção — "quais DUAS" significa exatamente duas.

### Arrastar e Soltar
Combine itens de uma lista com alvos. Comum para ordenar etapas de implantação ou combinar serviços com requisitos.

### Área Quente
Clique na área correta de uma captura de tela ou diagrama. Comum para questões baseadas no Portal ("onde você clicaria para configurar X?").

### Estudo de Caso
Um cenário de várias páginas com 4-7 questões. Você pode navegar entre as questões dentro do estudo de caso, mas não pode retornar após avançar para a próxima seção.

:::warning Atenção
Estratégia para Estudo de Caso — Leia a aba de **requisitos** primeiro, depois o cenário. Muitas questões de estudo de caso precisam apenas de detalhes específicos — não tente memorizar tudo.
:::

### Laboratório Ativo
Um ambiente real do Azure Portal onde você completa tarefas. Você tem tempo limitado e um conjunto restrito de ações.

:::tip Dica
Estratégia para o Laboratório — Os laboratórios são avaliados pelo **estado final**, não pelos passos que você executou. Se o CLI falhar, use o Portal. Se você cometer um erro, simplesmente refaça. O avaliador verifica a configuração final.
:::

## Gestão de Tempo

| Seção | Tempo Sugerido |
|-------|---------------|
| Primeira passagem por todas as questões | 60-70 minutos |
| Revisão das questões marcadas | 15-20 minutos |
| Seção de laboratório (se presente) | 20-30 minutos |
| Reserva | 5-10 minutos |

**Dica**: Não gaste mais de 2 minutos em nenhuma questão na primeira passagem. Marque-a e siga em frente.

## Estratégia de Estudo

### Semana 1-2: Identidade e Governança + Armazenamento (Desafios 01-06)
Esses domínios representam 35-45% do exame. Comece por aqui porque os conceitos de Entra ID e RBAC aparecem em questões de TODOS os domínios.

### Semana 3-4: Computação + Redes (Desafios 07-13)
Esses são os domínios mais práticos. Dedique tempo extra a VMs, App Service, VNets e NSGs — eles são bastante cobrados.

### Semana 5: Monitoramento + Capstone (Desafios 14-16)
Monitoramento representa 10-15%, mas os conceitos (Azure Monitor, KQL, alertas) conectam tudo.

### Semana 6: Revisão + Prática
- Faça a [Avaliação Prática Gratuita](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-104/practice/assessment?assessment-type=practice&assessmentId=21)
- Revise a [Matriz de Cobertura](/docs/az-104/coverage-matrix) — alguma lacuna?
- Refaça os cenários Quebre & Conserte de cada desafio

## Pegadinhas Comuns do Exame

:::warning Atenção
Coisas que pegam as pessoas de surpresa:
1. **Mover VMs entre regiões** requer Azure Site Recovery — NÃO é uma operação simples de mover
2. **Tokens SAS** — saiba a diferença entre SAS de conta, SAS de serviço e SAS de delegação de usuário
3. **Azure Policy** vs **RBAC** — Policy controla O QUE os recursos podem fazer, RBAC controla QUEM pode fazer coisas
4. **Regras NSG** são stateful — se você permitir entrada, a resposta de saída é automática
5. **Redundância de armazenamento** — saiba LRS, ZRS, GRS, RA-GRS, GZRS, RA-GZRS e quando usar cada um
6. **Azure Advisor** mostra recomendações, mas NÃO as aplica automaticamente
7. **Grupos de gerenciamento** podem ser aninhados em até 6 níveis de profundidade (raiz + 5 níveis)
8. **Nomes DNS personalizados** para App Service requerem um registro CNAME ou A + verificação TXT
:::

## Links Úteis

| Recurso | Link |
|---------|------|
| **Experimente a interface do exame** | [Sandbox do Exame](https://aka.ms/examdemo) |
| **Questões práticas gratuitas** | [Avaliação Prática](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-104/practice/assessment?assessment-type=practice&assessmentId=21) |
| **Agendar o exame** | [Pearson VUE](https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/) |
| **Oferta de repetição de exame** | [Ofertas de Exame](https://learn.microsoft.com/en-us/credentials/certifications/deals) |
| **Renovação da certificação** | [Renove gratuitamente](https://learn.microsoft.com/en-us/credentials/certifications/renew-your-microsoft-certification) |

## Depois de Passar 🎉

- Sua certificação aparece no seu [perfil Microsoft Learn](https://learn.microsoft.com/en-us/users/) em até 24 horas
- Você recebe um **badge digital** via Credly que pode compartilhar no LinkedIn
- A certificação é **válida por 1 ano** — renove gratuitamente passando em uma avaliação online
- Considere seu próximo passo: [AZ-305](https://learn.microsoft.com/en-us/credentials/certifications/azure-solutions-architect/) (Arquiteto), [AZ-500](https://learn.microsoft.com/en-us/credentials/certifications/azure-security-engineer/) (Segurança) ou [AZ-400](https://learn.microsoft.com/en-us/credentials/certifications/devops-engineer/) (DevOps)

---

**Pronto para começar a estudar?** Vá para o [Desafio 01: Usuários e Grupos do Entra ID](/docs/az-104/identity/challenge-01).
