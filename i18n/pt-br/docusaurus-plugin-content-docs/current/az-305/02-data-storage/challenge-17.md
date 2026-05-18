---
sidebar_position: 4
title: "Challenge 17: Design Database Protection"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 17: Design Database Protection

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 20-25%**

:::

## Introducao

SecureBank Financial Services e um banco regional migrando sua aplicacao bancaria principal para Azure SQL Database. A aplicacao processa transacoes de clientes, armazena informacoes pessoalmente identificaveis (PII) incluindo numeros de Social Security, numeros de conta e registros financeiros. SecureBank esta sujeito a multiplos frameworks regulatorios: PCI-DSS para dados de cartao de pagamento, SOX (Sarbanes-Oxley) para integridade de relatorios financeiros e regulamentacoes de privacidade estaduais que exigem notificacao de violacao de dados.

A equipe de compliance definiu os seguintes requisitos obrigatorios: (1) Todos os dados devem ser criptografados em repouso e em transito com chaves de criptografia gerenciadas pelo banco; (2) SSNs e numeros de conta dos clientes nunca devem ser visiveis para a equipe de suporte ou desenvolvedores de aplicacao, mesmo quando consultam o banco de dados diretamente; (3) Todo acesso e modificacao de dados deve ser registrado em uma trilha de auditoria a prova de adulteracao retida por 7 anos; (4) O banco deve ser capaz de restaurar qualquer banco de dados para qualquer ponto no tempo nos ultimos 35 dias, com backups mensais retidos por 7 anos para compliance regulatorio; (5) Tabelas criticas de ledger financeiro devem ser verificaveis criptograficamente para provar que os dados nao foram adulterados.

O arquiteto de seguranca tambem observou que uma descoberta recente de auditoria requer que as chaves de criptografia sejam armazenadas em um Azure Key Vault gerenciado pelo cliente com separacao de funcoes, significando que a equipe de DBA nao deve ter acesso as chaves de criptografia. O tamanho estimado do banco de dados e 500GB com 2.000 transacoes por segundo no pico.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para protecao de dados

## Tarefas de Design

### Parte 1: Estrategia de Criptografia

1. Projete uma estrategia de criptografia em defesa em profundidade cobrindo dados em repouso e dados em transito. Especifique o papel do TDE (Transparent Data Encryption) e se deve usar chaves gerenciadas pelo servico ou chaves gerenciadas pelo cliente (CMK) armazenadas no Azure Key Vault.
2. Para as colunas de SSN e numero de conta, avalie Always Encrypted versus dynamic data masking. Determine qual abordagem atende ao requisito de que a equipe de suporte nao pode ver os valores reais mesmo com acesso direto de consulta ao banco de dados.
3. Projete a arquitetura do Key Vault para chaves TDE gerenciadas pelo cliente. Aborde a separacao de funcoes especificando quais funcoes (DBA vs equipe de seguranca) tem acesso ao Key Vault versus ao banco de dados.
4. Documente a hierarquia de criptografia: Key Vault (CMK) protege o TDE protector, que criptografa a Database Encryption Key (DEK), que criptografa arquivos de dados/log/backup.

### Parte 2: Auditoria e Compliance

5. Projete uma solucao de auditoria usando Azure SQL Database Auditing. Especifique onde os logs de auditoria devem ser armazenados (Storage Account, Log Analytics ou Event Hub) considerando o requisito de retencao de 7 anos e necessidades a prova de adulteracao.
6. Configure o escopo de auditoria: determine quais acoes auditar (leituras de dados em tabelas sensiveis, alteracoes de esquema, alteracoes de permissao, logins falhados) enquanto evita logging excessivo que poderia impactar o desempenho.
7. Projete uma solucao para o requisito de ledger table. Identifique quais tabelas devem usar o recurso ledger do Azure SQL Database e explique como a verificacao criptografica funciona (database digests armazenados externamente no Azure Confidential Ledger ou Azure Blob Storage).
8. Crie uma abordagem de monitoramento de compliance que gere alertas para padroes de acesso suspeitos (ex.: exportacoes de dados em massa, acesso fora do horario comercial, consultas tocando colunas sensiveis).

### Parte 3: Backup e Recuperacao

9. Projete uma estrategia de backup que atenda tanto ao requisito de restauracao point-in-time de 35 dias quanto ao requisito de retencao de longo prazo (LTR) de 7 anos. Especifique a politica LTR (frequencia de backup semanal, mensal, anual).
10. Avalie as implicacoes da camada de servico para backup e recuperacao. Compare os custos de armazenamento de backup entre as camadas General Purpose e Business Critical e como o armazenamento de backup geo-redundante (GZRS) suporta restauracao entre regioes.
11. Projete um procedimento de teste de recuperacao que valide a integridade do backup sem impactar a producao. Inclua como realizar restauracao point-in-time para um ambiente de teste e validar a consistencia dos dados.
12. Documente o RPO (Recovery Point Objective) e RTO (Recovery Time Objective) alcancaveis com seu design e confirme que atendem aos requisitos do SecureBank.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-17"
  items={[
    "Designed encryption strategy with customer-managed keys in Key Vault and clear separation of duties",
    "Selected Always Encrypted for sensitive columns with justification over dynamic data masking",
    "Configured comprehensive auditing with 7-year retention in tamper-proof storage",
    "Implemented ledger tables for cryptographic verification of financial records",
    "Designed LTR backup policy meeting both 35-day PITR and 7-year retention requirements",
    "Documented RPO/RTO achievable with the designed backup and recovery strategy"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Always Encrypted vs Dynamic Data Masking</summary>

Dynamic data masking (DDM) oculta dados nos resultados de consulta mas NAO os criptografa no banco de dados. Usuarios com permissao UNMASK ou acesso direto ao armazenamento podem ver os dados reais. Always Encrypted criptografa os dados no lado do cliente antes de chegarem ao mecanismo de banco de dados. O mecanismo SQL Server nunca ve o texto em claro. Isso significa que mesmo DBAs com acesso total ao servidor nao podem ler colunas criptografadas. Para compliance PCI-DSS com SSNs/numeros de conta, Always Encrypted e necessario porque DDM nao fornece protecao criptografica verdadeira.

</details>

<details>
<summary>Dica 2: Chaves Gerenciadas pelo Cliente para TDE</summary>

TDE com chaves gerenciadas pelo cliente (CMK) armazena o TDE protector no Azure Key Vault. A configuracao recomendada: (1) Crie um Key Vault com soft delete e purge protection habilitados; (2) Conceda a identidade do SQL Server (managed identity atribuida pelo sistema) permissoes GET, WRAP KEY e UNWRAP KEY; (3) A equipe de seguranca gerencia o acesso ao Key Vault; (4) A equipe de DBA gerencia operacoes de banco de dados mas nao pode acessar o Key Vault diretamente. Isso impoe a separacao de funcoes.

</details>

<details>
<summary>Dica 3: Azure SQL Database Ledger</summary>

Ledger tables criam uma cadeia de hash criptografica sobre todas as modificacoes. Cada transacao adiciona um hash que incorpora o hash anterior, criando um historico imutavel e verificavel. Database digests (o hash mais recente) podem ser armazenados externamente no Azure Confidential Ledger ou Blob Storage imutavel. Para verificar a integridade, voce compara os digests armazenados com a cadeia de hash computada. Ledger tables estao disponiveis nas variantes append-only (somente insercao) ou atualizaveis.

</details>

<details>
<summary>Dica 4: Retencao de Longo Prazo (LTR)</summary>

Azure SQL Database LTR permite reter backups completos por ate 10 anos. A politica e configurada com parametros W (semanal), M (mensal) e Y (anual). Por exemplo: W=4, M=12, Y=7 retem 4 backups semanais, 12 backups mensais e 7 backups anuais. Backups LTR sao armazenados em Azure Blob Storage com redundancia RA-GRS por padrao. PITR (ate 35 dias) e separado do LTR e usa backups diferenciais/log.

</details>

<details>
<summary>Dica 5: Retencao de Log de Auditoria</summary>

Para retencao de auditoria a prova de adulteracao por 7 anos, armazene logs de auditoria em um Azure Storage Account com politicas de imutabilidade (legal hold ou retencao baseada em tempo). Voce tambem pode usar Log Analytics para armazenamento de curto prazo consultavel (ate 2 anos) e arquivar logs mais antigos no storage. Event Hub e util para streaming em tempo real para sistemas SIEM, mas nao e adequado para armazenamento de longo prazo por si so.

</details>

## Recursos de Aprendizagem

- [Transparent Data Encryption (TDE) with customer-managed keys](https://learn.microsoft.com/en-us/azure/azure-sql/database/transparent-data-encryption-byok-overview)
- [Always Encrypted overview](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/always-encrypted-database-engine)
- [Dynamic data masking in Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/dynamic-data-masking-overview)
- [Azure SQL Database auditing](https://learn.microsoft.com/en-us/azure/azure-sql/database/auditing-overview)
- [Azure SQL Database ledger](https://learn.microsoft.com/en-us/azure/azure-sql/database/ledger-overview)
- [Long-term backup retention](https://learn.microsoft.com/en-us/azure/azure-sql/database/long-term-retention-overview)
- [Automated backups in Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/automated-backups-overview)

## Verificacao de Conhecimento

<details>
<summary>1. Um banco requer que administradores de banco de dados nao possam ver valores em texto claro de numeros de Social Security armazenados em um banco de dados, mesmo com privilegios sysadmin completos. Qual recurso voce deve recomendar?</summary>

**Always Encrypted.** Ele realiza criptografia no lado do cliente para que o mecanismo de banco de dados nunca processe ou armazene valores em texto claro para colunas criptografadas. Mesmo usuarios com sysadmin, db_owner ou acesso direto ao armazenamento nao podem descriptografar os dados sem a column encryption key, que reside apenas no key store da aplicacao cliente (ex.: Azure Key Vault ou Windows Certificate Store). Dynamic data masking NAO atenderia este requisito porque e um recurso de nivel de exibicao que DBAs podem contornar.

</details>

<details>
<summary>2. Qual e a diferenca entre restauracao point-in-time (PITR) e retencao de longo prazo (LTR) no Azure SQL Database?</summary>

**PITR** fornece capacidade de restauracao continua para qualquer segundo dentro de um periodo de retencao configuravel (1-35 dias). Usa backups completos, diferenciais e de log de transacoes. **LTR** retem copias de backup completo semanais, mensais ou anuais por ate 10 anos. PITR e para recuperacao operacional (exclusao acidental, corrupcao), enquanto LTR e para requisitos de compliance e regulatorios. PITR e LTR sao recursos independentes que podem ser configurados simultaneamente.

</details>

<details>
<summary>3. Como o ledger do Azure SQL Database prova que registros financeiros nao foram adulterados?</summary>

**Cadeia de hash criptografica com armazenamento externo de digests.** Ledger tables adicionam um hash criptografico a cada transacao que incorpora o hash da transacao anterior, formando uma cadeia tipo blockchain. Database digests (o valor de hash mais recente) sao armazenados periodicamente em um store externo a prova de adulteracao (Azure Confidential Ledger ou Blob Storage imutavel). Para verificar a integridade, voce executa um processo de verificacao que recomputa a cadeia de hash e compara com os digests armazenados. Qualquer modificacao em dados historicos quebraria a cadeia de hash.

</details>

<details>
<summary>4. Uma organizacao usa TDE com chaves gerenciadas pelo cliente e precisa de separacao de funcoes entre a equipe de DBA e a equipe de seguranca. Como o acesso ao Azure Key Vault deve ser configurado?</summary>

**A equipe de seguranca gerencia o Key Vault (criar/rotacionar/deletar chaves), e a managed identity do SQL Server recebe apenas permissoes GET, WRAP KEY e UNWRAP KEY.** A equipe de DBA administra o banco de dados mas nao tem politica de acesso ao Key Vault. Isso garante que DBAs nao podem exportar ou deletar chaves de criptografia, enquanto o servico SQL Server ainda pode criptografar/descriptografar dados usando o TDE protector. Se a equipe de seguranca revogar o acesso ao Key Vault, o banco de dados se torna inacessivel, fornecendo um mecanismo de "kill switch" criptografico.

</details>

## Limpeza

```bash
# Delete the resource group containing SecureBank resources
az group delete --name rg-securebank-data --yes --no-wait

# Delete the Key Vault (requires purge if soft-delete is enabled)
az keyvault delete --name kv-securebank-tde --resource-group rg-securebank-data
# After soft-delete retention period, purge:
# az keyvault purge --name kv-securebank-tde

# Delete audit storage account
az group delete --name rg-securebank-audit --yes --no-wait
```

---

**Proximo**: [Challenge 18: Design a Semi-Structured Data Solution](/docs/az-305/data-storage/challenge-18)
