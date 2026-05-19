---
sidebar_position: 4
title: "Desafio 17: Projetar Proteção de Banco de Dados"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 17: Projetar Proteção de Banco de Dados

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 20-25%**

:::

## Introdução

SecureBank Financial Services é um banco regional migrando sua aplicação bancaria principal para Azure SQL Database. A aplicação processa transações de clientes, armazena informações pessoalmente identificaveis (PII) incluindo números de Social Security, números de conta e registros financeiros. SecureBank esta sujeito a múltiplos frameworks regulatorios: PCI-DSS para dados de cartao de pagamento, SOX (Sarbanes-Oxley) para integridade de relatórios financeiros e regulamentacoes de privacidade estaduais que exigem notificação de violacao de dados.

A equipe de compliance definiu os seguintes requisitos obrigatorios: (1) Todos os dados devem ser criptografados em repouso e em transito com chaves de criptografia gerenciadas pelo banco; (2) SSNs e números de conta dos clientes nunca devem ser visiveis para a equipe de suporte ou desenvolvedores de aplicação, mesmo quando consultam o banco de dados diretamente; (3) Todo acesso e modificacao de dados deve ser registrado em uma trilha de auditoria a prova de adulteracao retida por 7 anos; (4) O banco deve ser capaz de restaurar qualquer banco de dados para qualquer ponto no tempo nos ultimos 35 dias, com backups mensais retidos por 7 anos para compliance regulatorio; (5) Tabelas críticas de ledger financeiro devem ser verificaveis criptograficamente para provar que os dados não foram adulterados.

O arquiteto de segurança também observou que uma descoberta recente de auditoria requer que as chaves de criptografia sejam armazenadas em um Azure Key Vault gerenciado pelo cliente com separacao de funções, significando que a equipe de DBA não deve ter acesso as chaves de criptografia. O tamanho estimado do banco de dados e 500GB com 2.000 transações por segundo no pico.

## Habilidades do Exame Cobertas

- Recomendar uma solução para proteção de dados

## Tarefas de Design

### Parte 1: Estratégia de Criptografia

1. Projete uma estratégia de criptografia em defesa em profundidade cobrindo dados em repouso e dados em transito. Especifique o papel do TDE (Transparent Data Encryption) e se deve usar chaves gerenciadas pelo serviço ou chaves gerenciadas pelo cliente (CMK) armazenadas no Azure Key Vault.
2. Para as colunas de SSN e número de conta, avalie Always Encrypted versus dynamic data masking. Determine qual abordagem atende ao requisito de que a equipe de suporte não pode ver os valores reais mesmo com acesso direto de consulta ao banco de dados.
3. Projete a arquitetura do Key Vault para chaves TDE gerenciadas pelo cliente. Aborde a separacao de funções especificando quais funções (DBA vs equipe de segurança) tem acesso ao Key Vault versus ao banco de dados.
4. Documente a hierarquia de criptografia: Key Vault (CMK) protege o TDE protector, que criptografa a Database Encryption Key (DEK), que criptografa arquivos de dados/log/backup.

### Parte 2: Auditoria e Compliance

5. Projete uma solução de auditoria usando Azure SQL Database Auditing. Especifique onde os logs de auditoria devem ser armazenados (Storage Account, Log Analytics ou Event Hub) considerando o requisito de retencao de 7 anos e necessidades a prova de adulteracao.
6. Configure o escopo de auditoria: determine quais ações auditar (leituras de dados em tabelas sensiveis, alteracoes de esquema, alteracoes de permissão, logins falhados) enquanto evita logging excessivo que poderia impactar o desempenho.
7. Projete uma solução para o requisito de ledger table. Identifique quais tabelas devem usar o recurso ledger do Azure SQL Database e explique como a verificação criptografica funciona (database digests armazenados externamente no Azure Confidential Ledger ou Azure Blob Storage).
8. Crie uma abordagem de monitoramento de compliance que gere alertas para padrões de acesso suspeitos (ex.: exportacoes de dados em massa, acesso fora do horario comercial, consultas tocando colunas sensiveis).

### Parte 3: Backup e Recuperação

9. Projete uma estratégia de backup que atenda tanto ao requisito de restauracao point-in-time de 35 dias quanto ao requisito de retencao de longo prazo (LTR) de 7 anos. Especifique a política LTR (frequência de backup semanal, mensal, anual).
10. Avalie as implicacoes da camada de serviço para backup e recuperação. Compare os custos de armazenamento de backup entre as camadas General Purpose e Business Critical e como o armazenamento de backup geo-redundante (GZRS) suporta restauracao entre regiões.
11. Projete um procedimento de teste de recuperação que valide a integridade do backup sem impactar a produção. Inclua como realizar restauracao point-in-time para um ambiente de teste é validar a consistência dos dados.
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

Dynamic data masking (DDM) oculta dados nos resultados de consulta mas NAO os criptografa no banco de dados. Usuários com permissão UNMASK ou acesso direto ao armazenamento podem ver os dados reais. Always Encrypted criptografa os dados no lado do cliente antes de chegarem ao mecanismo de banco de dados. O mecanismo SQL Server nunca ve o texto em claro. Isso significa que mesmo DBAs com acesso total ao servidor não podem ler colunas criptografadas. Para compliance PCI-DSS com SSNs/números de conta, Always Encrypted é necessário porque DDM não fornece proteção criptografica verdadeira.

</details>

<details>
<summary>Dica 2: Chaves Gerenciadas pelo Cliente para TDE</summary>

TDE com chaves gerenciadas pelo cliente (CMK) armazena o TDE protector no Azure Key Vault. A configuração recomendada: (1) Crie um Key Vault com soft delete e purge protection habilitados; (2) Conceda a identidade do SQL Server (managed identity atribuida pelo sistema) permissões GET, WRAP KEY e UNWRAP KEY; (3) A equipe de segurança gerência o acesso ao Key Vault; (4) A equipe de DBA gerência operações de banco de dados mas não pode acessar o Key Vault diretamente. Isso impoe a separacao de funções.

</details>

<details>
<summary>Dica 3: Azure SQL Database Ledger</summary>

Ledger tables criam uma cadeia de hash criptografica sobre todas as modificacoes. Cada transação adiciona um hash que incorpora o hash anterior, criando um historico imutável e verificavel. Database digests (o hash mais recente) podem ser armazenados externamente no Azure Confidential Ledger ou Blob Storage imutável. Para verificar a integridade, você compara os digests armazenados com a cadeia de hash computada. Ledger tables estao disponiveis nas variantes append-only (somente insercao) ou atualizaveis.

</details>

<details>
<summary>Dica 4: Retencao de Longo Prazo (LTR)</summary>

Azure SQL Database LTR permite reter backups completos por até 10 anos. A política é configurada com parametros W (semanal), M (mensal) e Y (anual). Por exemplo: W=4, M=12, Y=7 retem 4 backups semanais, 12 backups mensais e 7 backups anuais. Backups LTR sao armazenados em Azure Blob Storage com redundância RA-GRS por padrão. PITR (até 35 dias) e separado do LTR e usa backups diferenciais/log.

</details>

<details>
<summary>Dica 5: Retencao de Log de Auditoria</summary>

Para retencao de auditoria a prova de adulteracao por 7 anos, armazene logs de auditoria em um Azure Storage Account com políticas de imutabilidade (legal hold ou retencao baseada em tempo). Você também pode usar Log Analytics para armazenamento de curto prazo consultavel (até 2 anos) e arquivar logs mais antigos no storage. Event Hub e útil para streaming em tempo real para sistemas SIEM, mas não é adequado para armazenamento de longo prazo por si só.

</details>

## Recursos de Aprendizagem

- [Transparent Data Encryption (TDE) with customer-managed keys](https://learn.microsoft.com/en-us/azure/azure-sql/database/transparent-data-encryption-byok-overview)
- [Always Encrypted overview](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/always-encrypted-database-engine)
- [Dynamic data masking in Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/dynamic-data-masking-overview)
- [Azure SQL Database auditing](https://learn.microsoft.com/en-us/azure/azure-sql/database/auditing-overview)
- [Azure SQL Database ledger](https://learn.microsoft.com/en-us/azure/azure-sql/database/ledger-overview)
- [Long-term backup retention](https://learn.microsoft.com/en-us/azure/azure-sql/database/long-term-retention-overview)
- [Automated backups in Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/automated-backups-overview)

## Verificação de Conhecimento

<details>
<summary>1. Um banco requer que administradores de banco de dados não possam ver valores em texto claro de números de Social Security armazenados em um banco de dados, mesmo com privilegios sysadmin completos. Qual recurso você deve recomendar?</summary>

**Always Encrypted.** Ele realiza criptografia no lado do cliente para que o mecanismo de banco de dados nunca processe ou armazene valores em texto claro para colunas criptografadas. Mesmo usuários com sysadmin, db_owner ou acesso direto ao armazenamento não podem descriptografar os dados sem a column encryption key, que reside apenas no key store da aplicação cliente (ex.: Azure Key Vault ou Windows Certificate Store). Dynamic data masking NAO atenderia este requisito porque é um recurso de nível de exibicao que DBAs podem contornar.

</details>

<details>
<summary>2. Qual é a diferenca entre restauracao point-in-time (PITR) e retencao de longo prazo (LTR) no Azure SQL Database?</summary>

**PITR** fornece capacidade de restauracao continua para qualquer segundo dentro de um período de retencao configuravel (1-35 dias). Usa backups completos, diferenciais e de log de transações. **LTR** retem copias de backup completo semanais, mensais ou anuais por até 10 anos. PITR e para recuperação operacional (exclusão acidental, corrupcao), enquanto LTR e para requisitos de compliance e regulatorios. PITR e LTR sao recursos independentes que podem ser configurados simultaneamente.

</details>

<details>
<summary>3. Como o ledger do Azure SQL Database prova que registros financeiros não foram adulterados?</summary>

**Cadeia de hash criptografica com armazenamento externo de digests.** Ledger tables adicionam um hash criptografico a cada transação que incorpora o hash da transação anterior, formando uma cadeia tipo blockchain. Database digests (o valor de hash mais recente) sao armazenados periodicamente em um store externo a prova de adulteracao (Azure Confidential Ledger ou Blob Storage imutável). Para verificar a integridade, você executa um processo de verificação que recomputa a cadeia de hash e compara com os digests armazenados. Qualquer modificacao em dados historicos quebraria a cadeia de hash.

</details>

<details>
<summary>4. Uma organização usa TDE com chaves gerenciadas pelo cliente e precisa de separacao de funções entre a equipe de DBA e a equipe de segurança. Como o acesso ao Azure Key Vault deve ser configurado?</summary>

**A equipe de segurança gerência o Key Vault (criar/rotacionar/deletar chaves), e a managed identity do SQL Server recebe apenas permissões GET, WRAP KEY e UNWRAP KEY.** A equipe de DBA administra o banco de dados mas não tem política de acesso ao Key Vault. Isso garante que DBAs não podem exportar ou deletar chaves de criptografia, enquanto o serviço SQL Server ainda pode criptografar/descriptografar dados usando o TDE protector. Se a equipe de segurança revogar o acesso ao Key Vault, o banco de dados se torna inacessivel, fornecendo um mecanismo de "kill switch" criptografico.

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

**Próximo**: [Challenge 18: Design a Semi-Structured Data Solution](/docs/az-305/data-storage/challenge-18)
