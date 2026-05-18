---
sidebar_position: 8
title: "Challenge 08: Design Secrets & Certificate Management"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 08: Design Secrets & Certificate Management

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $2-5 | **Peso no Exame: 25-30%**

:::

## Introducao

A Meridian Financial Services e uma empresa de tecnologia financeira de medio porte que processa transacoes de pagamento para mais de 200 parceiros comerciais. Sua plataforma consiste em mais de 50 microsservicos rodando no Azure Kubernetes Service, cada um exigindo certificados TLS para autenticacao mutua. A empresa tambem gerencia chaves de API para 30 integracoes externas de gateway de pagamento e usa chaves de criptografia gerenciadas pelo cliente para protecao de dados em repouso em multiplas storage accounts e bancos de dados.

Uma auditoria de conformidade recente sinalizou varios problemas criticos: chaves de API estavam hardcoded em arquivos de configuracao de aplicacao, tres certificados TLS expiraram sem aviso causando uma interrupcao de 4 horas, e chaves de criptografia para diferentes clientes estavam armazenadas no mesmo vault sem separacao. O CISO da empresa determinou um redesign completo da arquitetura de gerenciamento de segredos para atender aos requisitos PCI-DSS, que exigem separacao estrita de chaves entre ambientes de producao e nao-producao, trilhas de auditoria para todo acesso a chaves, e armazenamento de chaves com suporte de hardware para operacoes criptograficas.

Sua tarefa e projetar uma solucao abrangente de gerenciamento de segredos e certificados que enderece essas lacunas de conformidade enquanto suporta as necessidades operacionais de suas equipes de desenvolvimento. A solucao deve lidar com renovacao automatica de certificados, aplicar politicas de rotacao de chaves e fornecer isolamento de rede para vaults que manipulam as chaves de processamento de pagamento mais sensiveis. Restricoes orcamentarias limitam o uso de Managed HSM apenas para as cargas de trabalho mais criticas.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para gerenciar segredos, certificados e chaves

## Tarefas de Design

### Parte 1: Arquitetura e Segmentacao de Key Vault

1. Projete uma topologia de Key Vault para o ambiente da Meridian. Determine quantos vaults sao necessarios e justifique a estrategia de separacao (considere: por ambiente, por aplicacao, por nivel de sensibilidade, ou por fronteira de conformidade).
2. Identifique quais cargas de trabalho requerem Azure Key Vault Managed HSM versus Key Vault padrao. Documente os criterios de decisao (requisitos FIPS 140-2 Level 3, necessidades de desempenho, justificativa de custo).
3. Defina o modelo de controle de acesso para cada vault. Compare vault access policies versus Azure RBAC para Key Vault e recomende qual modelo usar para cada nivel de vault. Justifique sua escolha considerando a mudanca de API de marco de 2026 tornando RBAC o padrao.
4. Projete uma convencao de nomes e estrategia de resource group para a hierarquia de vaults que suporte facil identificacao do proposito do vault, ambiente e equipe proprietaria.

### Parte 2: Gerenciamento de Ciclo de Vida de Certificados

5. Projete uma solucao de gerenciamento de certificados para os mais de 50 certificados TLS de microsservicos. Enderece: selecao de autoridade certificadora (CA integrada ao Key Vault vs. autogerenciada), fluxos de trabalho de renovacao automatica, e alertas de notificacao para certificados se aproximando da expiracao.
6. Defina procedimentos de rotacao de certificados que alcancem implantacao sem downtime. Considere como cargas de trabalho AKS consumirao certificados renovados sem reinicializacao de pods.
7. Especifique como certificados wildcard versus certificados de servico individual devem ser usados, e documente os trade-offs de seguranca de cada abordagem.

### Parte 3: Rotacao de Segredos e Chaves

8. Projete uma politica de rotacao automatizada de chaves para as chaves de API de gateway de pagamento. Defina frequencia de rotacao, o mecanismo de gatilho de rotacao, e como aplicacoes detectarao e consumirao novas versoes de chave.
9. Defina uma estrategia de customer-managed key (CMK) para criptografia de dados em repouso. Especifique tipos de chave (RSA vs. EC), tamanhos de chave, e como o versionamento de chaves interage com recursos criptografados.
10. Projete o modelo de seguranca de rede para vaults. Determine quais vaults precisam de private endpoints, quais podem usar service endpoints, e quais (se houver) podem permanecer publicamente acessiveis. Documente a justificativa para cada decisao.

### Parte 4: Monitoramento e Recuperacao de Desastres

11. Projete uma estrategia de monitoramento e alertas para operacoes de key vault. Inclua deteccao de tentativas de acesso nao autorizado, certificados proximos da expiracao e eventos de throttling.
12. Projete uma estrategia de backup e recuperacao de desastres para a infraestrutura de vault. Enderece failover regional, procedimentos de backup de chaves e requisitos de RTO/RPO para a plataforma de pagamento.

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
<summary>Dica 1: Estrategia de Segmentacao de Vault</summary>

Considere separar vaults ao longo destas fronteiras: (1) producao vs. nao-producao (requisito de conformidade), (2) fronteira de aplicacao para reducao de raio de impacto, e (3) separacao por tipo de objeto (certificados, segredos, chaves em vaults diferentes apenas quando padroes de acesso diferem significativamente). PCI-DSS exige que chaves criptograficas de producao nunca compartilhem um vault com chaves de desenvolvimento. Key Vault tem um limite de 500 entradas de access policy por vault e limites de taxa de transacao por vault (4000 transacoes/10 segundos para operacoes RSA).

</details>

<details>
<summary>Dica 2: Criterios de Decisao para Managed HSM</summary>

Managed HSM fornece hardware validado FIPS 140-2 Level 3, armazenamento de chaves single-tenant e controle criptografico completo. Use para: chaves de criptografia da industria de cartoes de pagamento, chaves de CA raiz, e chaves onde requisitos regulatorios exigem protecao em nivel de hardware. Key Vault padrao (FIPS 140-2 Level 2) e suficiente para certificados TLS, segredos de aplicacao e chaves de criptografia nao regulamentadas. Managed HSM custa aproximadamente $3/hora por pool HSM, portanto limite o uso a cargas de trabalho onde o requisito de conformidade justifica o custo.

</details>

<details>
<summary>Dica 3: RBAC vs. Access Policies</summary>

Azure RBAC para Key Vault fornece permissoes granulares, por chave/segredo/certificado usando atribuicoes de funcao Azure padrao. Suporta Conditional Access e PIM (acesso just-in-time). A partir da atualizacao de API de marco de 2026 (versao 2026-02-01), RBAC e o padrao para novos vaults. Vault access policies sao legadas e limitadas a granularidade em nivel de vault (voce nao pode conceder acesso a um unico segredo dentro de um vault). Para novos designs, prefira RBAC. As funcoes integradas incluem: Key Vault Secrets Officer, Key Vault Certificates Officer, Key Vault Crypto Officer e Key Vault Reader.

</details>

<details>
<summary>Dica 4: Renovacao Automatica de Certificados</summary>

Key Vault suporta autoridades certificadoras integradas (DigiCert e GlobalSign) para emissao e renovacao automatica de certificados. Para CAs nao integradas, Key Vault pode gerar CSRs que voce envia externamente. Configure lifetime actions para acionar renovacao em 80% do tempo de vida do certificado ou 30 dias antes da expiracao. Para consumo em AKS, use o Key Vault CSI driver com o `secretProviderClass` configurado para polling de rotacao (padrao: 2 minutos). O CSI driver monta certificados como arquivos que atualizam in-place, permitindo que aplicacoes detectem mudancas sem reinicializacao.

</details>

<details>
<summary>Dica 5: Design de Isolamento de Rede</summary>

Private endpoints fornecem o isolamento de rede mais forte (trafego permanece no backbone da Microsoft). Use private endpoints para vaults contendo chaves de criptografia de producao e segredos de processamento de pagamento. Service endpoints sao uma alternativa mais simples para vaults acessados apenas de redes virtuais Azure. Acesso publico pode permanecer habilitado (com regras de firewall) para vaults acessados por pipelines de CI/CD ou estacoes de trabalho de desenvolvedores, mas restrinja o acesso a faixas de IP conhecidas. Considere que a resolucao DNS de private endpoint requer zonas de Azure Private DNS ou configuracao de DNS personalizada em sua rede.

</details>

## Recursos de Aprendizagem

- [Azure Key Vault best practices](https://learn.microsoft.com/azure/key-vault/general/best-practices)
- [Azure Key Vault security overview](https://learn.microsoft.com/azure/key-vault/general/security-features)
- [About Azure Key Vault Managed HSM](https://learn.microsoft.com/azure/key-vault/managed-hsm/overview)
- [Azure RBAC for Key Vault data plane](https://learn.microsoft.com/azure/key-vault/general/rbac-guide)
- [Key Vault certificate renewal](https://learn.microsoft.com/azure/key-vault/certificates/overview-renew-certificate)
- [Key Vault private endpoints](https://learn.microsoft.com/azure/key-vault/general/private-link-service)
- [Encryption and key management in Azure (CAF)](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/encryption-and-keys)

## Verificacao de Conhecimento

<details>
<summary>1. A Meridian precisa armazenar uma chave privada de CA raiz que assina todos os certificados de servico internos. A chave nunca deve sair do hardware e deve atender FIPS 140-2 Level 3. Qual servico eles devem usar?</summary>

**Azure Key Vault Managed HSM.** Key Vault padrao fornece apenas protecao FIPS 140-2 Level 2 (chaves protegidas por software ou chaves com suporte de HSM em um HSM multi-tenant). Managed HSM fornece HSMs single-tenant, validados FIPS 140-2 Level 3, onde chaves tem garantia de nunca sair da fronteira de hardware. Isso e necessario para chaves de CA raiz em ambientes regulamentados.

</details>

<details>
<summary>2. Uma equipe de desenvolvimento precisa de acesso de leitura apenas as strings de conexao de banco de dados em um vault compartilhado, mas nao as chaves de API armazenadas no mesmo vault. Qual modelo de acesso permite isso?</summary>

**Azure RBAC para Key Vault.** RBAC permite permissoes por objeto usando escopo (ex.: atribuir a funcao "Key Vault Secrets User" no escopo do segredo individual). Vault access policies operam apenas em nivel de vault - voce nao pode restringir um principal a segredos especificos dentro de um vault usando access policies. Esta e uma razao chave para adotar RBAC para controle de acesso granular.

</details>

<details>
<summary>3. A Meridian quer que certificados renovem automaticamente 30 dias antes da expiracao sem intervencao manual. Sua CA e DigiCert. Qual configuracao habilita isso?</summary>

**Renovacao automatica de certificados do Key Vault com CA integrada.** Crie um certificate issuer no Key Vault vinculado a conta DigiCert deles. Configure a politica de certificado com uma lifetime action de "AutoRenew" acionada em uma porcentagem do tempo de vida (ex.: 80%) ou um numero fixo de dias antes da expiracao (30 dias). Key Vault lida com a geracao de CSR, submissao ao DigiCert e instalacao do certificado automaticamente.

</details>

<details>
<summary>4. Durante um failover de vault para uma regiao secundaria, a Meridian descobre que seus registros DNS de private endpoint ainda apontam para a regiao primaria. Qual e a causa raiz e a correcao?</summary>

**Registros de zona Private DNS precisam ser atualizados para a regiao secundaria.** Ao usar private endpoints, a resolucao DNS e tratada por zonas Azure Private DNS. Durante um failover manual (Key Vault suporta geo-replicacao), o private endpoint na regiao secundaria tem um endereco IP diferente. A correcao e garantir que zonas Private DNS estejam configuradas com registros para ambas as regioes, ou usar Azure Traffic Manager / failover baseado em DNS para o FQDN do Key Vault. A geo-replicacao integrada do Key Vault lida com isso automaticamente para o endpoint publico, mas o DNS de private endpoint requer planejamento explicito.

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

**Proximo**: [Challenge 09: Design a Management Group & Subscription Structure](/docs/az-305/identity-governance-monitoring/challenge-09)
