---
sidebar_position: 8
title: "Desafio 08: Projetar Gerenciamento de Segredos e Certificados"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 08: Projetar Gerenciamento de Segredos e Certificados

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $2-5 | **Peso no Exame: 25-30%**

:::

## Introdução

A Meridian Financial Services é uma empresa de tecnologia financeira de medio porte que processa transações de pagamento para mais de 200 parceiros comerciais. Sua plataforma consiste em mais de 50 microsservicos rodando no Azure Kubernetes Service, cada um exigindo certificados TLS para autenticação mutua. A empresa também gerência chaves de API para 30 integracoes externas de gateway de pagamento e usa chaves de criptografia gerenciadas pelo cliente para proteção de dados em repouso em múltiplas storage accounts e bancos de dados.

Uma auditoria de conformidade recente sinalizou vários problemas críticos: chaves de API estavam hardcoded em arquivos de configuração de aplicação, três certificados TLS expiraram sem aviso causando uma interrupcao de 4 horas, e chaves de criptografia para diferentes clientes estavam armazenadas no mesmo vault sem separacao. O CISO da empresa determinou um redesign completo da arquitetura de gerenciamento de segredos para atender aos requisitos PCI-DSS, que exigem separacao estrita de chaves entre ambientes de produção e não-produção, trilhas de auditoria para todo acesso a chaves, e armazenamento de chaves com suporte de hardware para operações criptograficas.

Sua tarefa é projetar uma solução abrangente de gerenciamento de segredos e certificados que enderece essas lacunas de conformidade enquanto suporta as necessidades operacionais de suas equipes de desenvolvimento. A solução deve lidar com renovacao automática de certificados, aplicar políticas de rotacao de chaves é fornecer isolamento de rede para vaults que manipulam as chaves de processamento de pagamento mais sensiveis. Restricoes orcamentarias limitam o uso de Managed HSM apenas para as cargas de trabalho mais críticas.

## Habilidades do Exame Cobertas

- Recomendar uma solução para gerenciar segredos, certificados e chaves

## Tarefas de Design

### Parte 1: Arquitetura e Segmentacao de Key Vault

1. Projete uma topologia de Key Vault para o ambiente da Meridian. Determine quantos vaults sao necessários e justifique a estratégia de separacao (considere: por ambiente, por aplicação, por nível de sensibilidade, ou por fronteira de conformidade).
2. Identifique quais cargas de trabalho requerem Azure Key Vault Managed HSM versus Key Vault padrão. Documente os criterios de decisao (requisitos FIPS 140-3 Level 3, necessidades de desempenho, justificativa de custo).
3. Defina o modelo de controle de acesso para cada vault. Compare vault access policies versus Azure RBAC para Key Vault e recomende qual modelo usar para cada nível de vault. Justifique sua escolha considerando a mudança de API de marco de 2026 tornando RBAC o padrão.
4. Projete uma convencao de nomes e estratégia de resource group para a hierarquia de vaults que suporte fácil identificacao do proposito do vault, ambiente e equipe proprietaria.

### Parte 2: Gerenciamento de Ciclo de Vida de Certificados

5. Projete uma solução de gerenciamento de certificados para os mais de 50 certificados TLS de microsservicos. Enderece: selecao de autoridade certificadora (CA integrada ao Key Vault vs. autogerenciada), fluxos de trabalho de renovacao automática, e alertas de notificação para certificados se aproximando da expiracao.
6. Defina procedimentos de rotacao de certificados que alcancem implantacao sem downtime. Considere como cargas de trabalho AKS consumirao certificados renovados sem reinicializacao de pods.
7. Especifique como certificados wildcard versus certificados de serviço individual devem ser usados, e documente os trade-offs de segurança de cada abordagem.

### Parte 3: Rotacao de Segredos e Chaves

8. Projete uma política de rotacao automatizada de chaves para as chaves de API de gateway de pagamento. Defina frequência de rotacao, o mecanismo de gatilho de rotacao, e como aplicações detectarao e consumirao novas versoes de chave.
9. Defina uma estratégia de customer-managed key (CMK) para criptografia de dados em repouso. Especifique tipos de chave (RSA vs. EC), tamanhos de chave, e como o versionamento de chaves interage com recursos criptografados.
10. Projete o modelo de segurança de rede para vaults. Determine quais vaults precisam de private endpoints, quais podem usar service endpoints, e quais (se houver) podem permanecer publicamente acessiveis. Documente a justificativa para cada decisao.

### Parte 4: Monitoramento e Recuperação de Desastres

11. Projete uma estratégia de monitoramento e alertas para operações de key vault. Inclua detecção de tentativas de acesso não autorizado, certificados proximos da expiracao e eventos de throttling.
12. Projete uma estratégia de backup e recuperação de desastres para a infraestrutura de vault. Enderece failover regional, procedimentos de backup de chaves e requisitos de RTO/RPO para a plataforma de pagamento.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-08"
  items={[
    "Documented a multi-vault topology with clear segmentation rationale aligned to PCI-DSS requirements",
    "Defined criteria for standard Key Vault vs. Managed HSM usage with cost justification",
    "Selected and justified access control model (vault access policy vs. RBAC) for each vault tier",
    "Designed certificate lifecycle management with automated renewal and zero-downtime rotation",
    "Created key rotation policies with defined frequencies and application consumption patterns",
    "Specified network isolation strategy with private endpoints for sensitive vaults"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Estratégia de Segmentacao de Vault</summary>

Considere separar vaults ao longo destas fronteiras: (1) produção vs. não-produção (requisito de conformidade), (2) fronteira de aplicação para redução de raio de impacto, e (3) separacao por tipo de objeto (certificados, segredos, chaves em vaults diferentes apenas quando padrões de acesso diferem significativamente). PCI-DSS exige que chaves criptograficas de produção nunca compartilhem um vault com chaves de desenvolvimento. Key Vault tem um limite de 500 entradas de access policy por vault e limites de taxa de transação por vault (4000 transações/10 segundos para operações RSA).

</details>

<details>
<summary>Dica 2: Criterios de Decisao para Managed HSM</summary>

Managed HSM fornece hardware validado FIPS 140-3 Level 3, armazenamento de chaves single-tenant e controle criptografico completo. Use para: chaves de criptografia da industria de cartoes de pagamento, chaves de CA raiz, e chaves onde requisitos regulatorios exigem proteção em nível de hardware. Key Vault padrão (FIPS 140-2 Level 1) é suficiente para certificados TLS, segredos de aplicação e chaves de criptografia não regulamentadas. Managed HSM custa aproximadamente $3/hora por pool HSM, portanto limite o uso a cargas de trabalho onde o requisito de conformidade justifica o custo.

</details>

<details>
<summary>Dica 3: RBAC vs. Access Policies</summary>

Azure RBAC para Key Vault fornece permissões granulares, por chave/segredo/certificado usando atribuicoes de função Azure padrão. Suporta Conditional Access e PIM (acesso just-in-time). A partir da atualização de API de marco de 2026 (versao 2026-02-01), RBAC e o padrão para novos vaults. Vault access policies sao legadas é limitadas a granularidade em nível de vault (você não pode conceder acesso a um único segredo dentro de um vault). Para novos designs, prefira RBAC. As funções integradas incluem: Key Vault Secrets Officer, Key Vault Certificates Officer, Key Vault Crypto Officer e Key Vault Reader.

</details>

<details>
<summary>Dica 4: Renovacao Automática de Certificados</summary>

Key Vault suporta autoridades certificadoras integradas (DigiCert e GlobalSign) para emissao e renovacao automática de certificados. Para CAs não integradas, Key Vault pode gerar CSRs que você envia externamente. Configure lifetime actions para acionar renovacao em 80% do tempo de vida do certificado ou 30 dias antes da expiracao. Para consumo em AKS, use o Key Vault CSI driver com o `secretProviderClass` configurado para polling de rotacao (padrão: 2 minutos). O CSI driver monta certificados como arquivos que atualizam in-place, permitindo que aplicações detectem mudanças sem reinicializacao.

</details>

<details>
<summary>Dica 5: Design de Isolamento de Rede</summary>

Private endpoints fornecem o isolamento de rede mais forte (trafego permanece no backbone da Microsoft). Use private endpoints para vaults contendo chaves de criptografia de produção e segredos de processamento de pagamento. Service endpoints sao uma alternativa mais simples para vaults acessados apenas de redes virtuais Azure. Acesso público pode permanecer habilitado (com regras de firewall) para vaults acessados por pipelines de CI/CD ou estacoes de trabalho de desenvolvedores, mas restrinja o acesso a faixas de IP conhecidas. Considere que a resolução DNS de private endpoint requer zonas de Azure Private DNS ou configuração de DNS personalizada em sua rede.

</details>

## Recursos de Aprendizagem

- [Azure Key Vault best practices](https://learn.microsoft.com/azure/key-vault/general/best-practices)
- [Azure Key Vault security overview](https://learn.microsoft.com/azure/key-vault/general/security-features)
- [About Azure Key Vault Managed HSM](https://learn.microsoft.com/azure/key-vault/managed-hsm/overview)
- [Azure RBAC for Key Vault data plane](https://learn.microsoft.com/azure/key-vault/general/rbac-guide)
- [Key Vault certificate renewal](https://learn.microsoft.com/azure/key-vault/certificates/overview-renew-certificate)
- [Key Vault private endpoints](https://learn.microsoft.com/azure/key-vault/general/private-link-service)
- [Encryption and key management in Azure (CAF)](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/encryption-and-keys)

## Verificação de Conhecimento

<details>
<summary>1. A Meridian precisa armazenar uma chave privada de CA raiz que assina todos os certificados de serviço internos. A chave nunca deve sair do hardware e deve atender FIPS 140-3 Level 3. Qual serviço eles devem usar?</summary>

**Azure Key Vault Managed HSM.** Key Vault padrão fornece apenas proteção FIPS 140-2 Level 1 (chaves protegidas por software ou chaves com suporte de HSM em um HSM multi-tenant). Managed HSM fornece HSMs single-tenant, validados FIPS 140-3 Level 3, onde chaves tem garantia de nunca sair da fronteira de hardware. Isso é necessário para chaves de CA raiz em ambientes regulamentados.

</details>

<details>
<summary>2. Uma equipe de desenvolvimento precisa de acesso de leitura apenas as strings de conexão de banco de dados em um vault compartilhado, mas não as chaves de API armazenadas no mesmo vault. Qual modelo de acesso permite isso?</summary>

**Azure RBAC para Key Vault.** RBAC permite permissões por objeto usando escopo (ex.: atribuir a função "Key Vault Secrets User" no escopo do segredo individual). Vault access policies operam apenas em nível de vault - você não pode restringir um principal a segredos específicos dentro de um vault usando access policies. Esta é uma razao chave para adotar RBAC para controle de acesso granular.

</details>

<details>
<summary>3. A Meridian quer que certificados renovem automaticamente 30 dias antes da expiracao sem intervencao manual. Sua CA e DigiCert. Qual configuração habilita isso?</summary>

**Renovacao automática de certificados do Key Vault com CA integrada.** Crie um certificate issuer no Key Vault vinculado a conta DigiCert deles. Configure a política de certificado com uma lifetime action de "AutoRenew" acionada em uma porcentagem do tempo de vida (ex.: 80%) ou um número fixo de dias antes da expiracao (30 dias). Key Vault lida com a geracao de CSR, submissao ao DigiCert e instalacao do certificado automaticamente.

</details>

<details>
<summary>4. Durante um failover de vault para uma região secundária, a Meridian descobre que seus registros DNS de private endpoint ainda apontam para a região primária. Qual é a causa raiz e a correcao?</summary>

**Registros de zona Private DNS precisam ser atualizados para a região secundária.** Ao usar private endpoints, a resolução DNS e tratada por zonas Azure Private DNS. Durante um failover manual (Key Vault suporta geo-replicação), o private endpoint na região secundária tem um endereço IP diferente. A correcao é garantir que zonas Private DNS estejam configuradas com registros para ambas as regiões, ou usar Azure Traffic Manager / failover baseado em DNS para o FQDN do Key Vault. A geo-replicação integrada do Key Vault lida com isso automaticamente para o endpoint público, mas o DNS de private endpoint requer planejamento explicito.

</details>

## Limpeza

```bash
# Delete resource groups created for this challenge
az group delete --name rg-keyvault-prod --yes --no-wait
az group delete --name rg-keyvault-dev --yes --no-wait
az group delete --name rg-keyvault-hsm --yes --no-wait

# If you created a Managed HSM (note: HSM deletion has a purge protection period)
# az keyvault purge --hsm-name meridian-payment-hsm
```

---

**Próximo**: [Challenge 09: Design a Management Group & Subscription Structure](/docs/az-305/identity-governance-monitoring/challenge-09)
