import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

const stats = [
  { number: '78', label: 'Desafios' },
  { number: '2', label: 'Exames' },
  { number: '100%', label: 'Cobertura' },
  { number: 'v2026.04', label: 'Objetivos do Exame' },
];

const challenges = [
  { num: '01', title: 'Entra ID: Usuários & Grupos', domain: 'identity', href: '/docs/az-104/identity/challenge-01' },
  { num: '02', title: 'RBAC & Gerenciamento de Acesso', domain: 'identity', href: '/docs/az-104/identity/challenge-02' },
  { num: '03', title: 'Azure Policy & Governança', domain: 'identity', href: '/docs/az-104/identity/challenge-03' },
  { num: '04', title: 'Contas de Armazenamento & Acesso', domain: 'storage', href: '/docs/az-104/storage/challenge-04' },
  { num: '05', title: 'Blob Storage & Azure Files', domain: 'storage', href: '/docs/az-104/storage/challenge-05' },
  { num: '06', title: 'Segurança de Armazenamento & Ciclo de Vida', domain: 'storage', href: '/docs/az-104/storage/challenge-06' },
  { num: '07', title: 'Templates ARM & Bicep', domain: 'compute', href: '/docs/az-104/compute/challenge-07' },
  { num: '08', title: 'VMs & Scale Sets', domain: 'compute', href: '/docs/az-104/compute/challenge-08' },
  { num: '09', title: 'Contêineres no Azure', domain: 'compute', href: '/docs/az-104/compute/challenge-09' },
  { num: '10', title: 'Azure App Service', domain: 'compute', href: '/docs/az-104/compute/challenge-10' },
  { num: '11', title: 'Redes Virtuais & Sub-redes', domain: 'networking', href: '/docs/az-104/networking/challenge-11' },
  { num: '12', title: 'Segurança de Rede', domain: 'networking', href: '/docs/az-104/networking/challenge-12' },
  { num: '13', title: 'DNS & Balanceamento de Carga', domain: 'networking', href: '/docs/az-104/networking/challenge-13' },
  { num: '14', title: 'Azure Monitor & Alertas', domain: 'monitor', href: '/docs/az-104/monitor/challenge-14' },
  { num: '15', title: 'Backup & Recuperação', domain: 'monitor', href: '/docs/az-104/monitor/challenge-15' },
  { num: '16', title: 'Capstone: Um Dia na Vida', domain: 'monitor', href: '/docs/az-104/capstone/challenge-16' },
  { num: '17', title: 'Grupos de Gerenciamento & Assinaturas', domain: 'identity', href: '/docs/az-104/identity/challenge-17' },
  { num: '18', title: 'Gerenciamento de Custos & Azure Advisor', domain: 'identity', href: '/docs/az-104/identity/challenge-18' },
  { num: '19', title: 'AzCopy & Migração de Armazenamento', domain: 'storage', href: '/docs/az-104/storage/challenge-19' },
  { num: '20', title: 'Criptografia de Armazenamento & Proteção de Dados', domain: 'storage', href: '/docs/az-104/storage/challenge-20' },
  { num: '21', title: 'Extensões de VM & Automação', domain: 'compute', href: '/docs/az-104/compute/challenge-21' },
  { num: '22', title: 'Discos de VM & Criptografia', domain: 'compute', href: '/docs/az-104/compute/challenge-22' },
  { num: '23', title: 'App Service: Configuração Avançada', domain: 'compute', href: '/docs/az-104/compute/challenge-23' },
  { num: '24', title: 'Rotas Definidas pelo Usuário & Controle de Tráfego', domain: 'networking', href: '/docs/az-104/networking/challenge-24' },
  { num: '25', title: 'Private Endpoints & Service Endpoints', domain: 'networking', href: '/docs/az-104/networking/challenge-25' },
  { num: '26', title: 'Network Watcher & Diagnósticos', domain: 'networking', href: '/docs/az-104/networking/challenge-26' },
  { num: '27', title: 'Log Analytics & KQL em Profundidade', domain: 'monitor', href: '/docs/az-104/monitor/challenge-27' },
  { num: '28', title: 'Azure Advisor & Service Health', domain: 'monitor', href: '/docs/az-104/monitor/challenge-28' },
];

const domainLabels = {
  identity: 'Identidade & Governanca',
  storage: 'Armazenamento',
  compute: 'Computacao',
  networking: 'Rede',
  monitor: 'Monitoramento',
};

const az305DomainLabels = {
  'identity-gov': 'Identidade & Governanca',
  'data': 'Armazenamento de Dados',
  'bcdr': 'Continuidade de Negocios',
  'infra': 'Infraestrutura',
  'capstone': 'Capstone',
};

const az305Challenges = [
  { num: '01', title: 'Registro Centralizado', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-01' },
  { num: '02', title: 'Roteamento e Filtragem de Logs', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-02' },
  { num: '03', title: 'Monitoramento e Alertas', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-03' },
  { num: '04', title: 'Autenticacao Cloud-Native', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-04' },
  { num: '05', title: 'Gerenciamento de Identidade', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-05' },
  { num: '06', title: 'Autorizacao de Recursos Azure', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-06' },
  { num: '07', title: 'Autorizacao On-Premises', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-07' },
  { num: '08', title: 'Segredos e Certificados', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-08' },
  { num: '09', title: 'Grupos de Gerenciamento e Assinaturas', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-09' },
  { num: '10', title: 'Estrategia de Marcacao de Recursos', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-10' },
  { num: '11', title: 'Solucao de Conformidade', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-11' },
  { num: '12', title: 'Governanca de Identidade', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-12' },
  { num: '13', title: 'Governanca Multi-Equipe (Capstone)', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-13' },
  { num: '14', title: 'Plataforma de Dados Relacionais', domain: 'data', href: '/docs/az-305/data-storage/challenge-14' },
  { num: '15', title: 'Camadas e Computacao de BD', domain: 'data', href: '/docs/az-305/data-storage/challenge-15' },
  { num: '16', title: 'Escalabilidade de BD', domain: 'data', href: '/docs/az-305/data-storage/challenge-16' },
  { num: '17', title: 'Protecao de Banco de Dados', domain: 'data', href: '/docs/az-305/data-storage/challenge-17' },
  { num: '18', title: 'Dados Semi-Estruturados', domain: 'data', href: '/docs/az-305/data-storage/challenge-18' },
  { num: '19', title: 'Dados Nao Estruturados', domain: 'data', href: '/docs/az-305/data-storage/challenge-19' },
  { num: '20', title: 'Custo e Desempenho', domain: 'data', href: '/docs/az-305/data-storage/challenge-20' },
  { num: '21', title: 'Durabilidade e Protecao de Dados', domain: 'data', href: '/docs/az-305/data-storage/challenge-21' },
  { num: '22', title: 'Pipeline de Integracao', domain: 'data', href: '/docs/az-305/data-storage/challenge-22' },
  { num: '23', title: 'Solucao de Analise de Dados', domain: 'data', href: '/docs/az-305/data-storage/challenge-23' },
  { num: '24', title: 'Plataforma de Dados Completa (Capstone)', domain: 'data', href: '/docs/az-305/data-storage/challenge-24' },
  { num: '25', title: 'Objetivos de Recuperacao', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-25' },
  { num: '26', title: 'Backup para Computacao', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-26' },
  { num: '27', title: 'Backup para Bancos de Dados', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-27' },
  { num: '28', title: 'Backup para Dados Nao Estruturados', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-28' },
  { num: '29', title: 'Plano de DR (Capstone)', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-29' },
  { num: '30', title: 'HA para Computacao', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-30' },
  { num: '31', title: 'HA para Dados Relacionais', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-31' },
  { num: '32', title: 'HA para Dados Nao Relacionais', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-32' },
  { num: '33', title: 'Aplicacao Multi-Regiao (Capstone)', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-33' },
  { num: '34', title: 'Computacao para Cargas de Trabalho', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-34' },
  { num: '35', title: 'Solucao Baseada em VM', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-35' },
  { num: '36', title: 'Solucao Baseada em Conteineres', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-36' },
  { num: '37', title: 'Solucao Serverless', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-37' },
  { num: '38', title: 'Arquitetura de Mensageria', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-38' },
  { num: '39', title: 'Arquitetura Orientada a Eventos', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-39' },
  { num: '40', title: 'Integracao de API', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-40' },
  { num: '41', title: 'Estrategia de Cache', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-41' },
  { num: '42', title: 'Gerenciamento de Configuracao', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-42' },
  { num: '43', title: 'Implantacao Automatizada', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-43' },
  { num: '44', title: 'Estrategia de Migracao (CAF)', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-44' },
  { num: '45', title: 'Migracao de Servidores e Apps', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-45' },
  { num: '46', title: 'Migracao de Banco de Dados', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-46' },
  { num: '47', title: 'Migracao de Dados Nao Estruturados', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-47' },
  { num: '48', title: 'Conectividade de Rede', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-48' },
  { num: '49', title: 'Seguranca de Rede e Load Balancing', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-49' },
  { num: '50', title: 'Solucao Azure Completa (Capstone)', domain: 'capstone', href: '/docs/az-305/infrastructure/challenge-50' },
];


const FeatureList = [
  {
    title: '100% de Cobertura do Exame',
    description: 'Cada habilidade do guia de estudo oficial do AZ-104 mapeada para um desafio prático. Verificado com os objetivos do exame de Abril de 2026.',
  },
  {
    title: 'Labs Práticos',
    description: 'Sem slides, sem dumps de teoria. Cada conceito ensinado com recursos reais do Azure que você cria, configura e diagnostica.',
  },
  {
    title: 'Econômico',
    description: 'Todos os 28 desafios custam ~$5 no total com scripts de limpeza. Projetado para Conta Gratuita do Azure ($200 crédito) ou Azure para Estudantes.',
  },
  {
    title: 'Lab com Um Clique',
    description: 'Abra no GitHub Codespaces e tenha Azure CLI, Bicep e PowerShell prontos em minutos. Sem configuração local.',
  },
  {
    title: 'Comandos Validados',
    description: 'Cada comando Azure CLI, trecho PowerShell e template Bicep testado de ponta a ponta. CI valida a cada commit.',
  },
  {
    title: 'Quebre & Conserte',
    description: 'Cada desafio inclui cenários de troubleshooting com configurações incorretas deliberadas para diagnosticar e corrigir. Desenvolva habilidades do mundo real.',
  },
];

function Feature({title, description}) {
  return (
    <div className="col col--4" style={{marginBottom: '1.5rem'}}>
      <div className="feature-card">
        <Heading as="h3" style={{fontSize: '1.1rem'}}>{title}</Heading>
        <p style={{fontSize: '0.95rem', margin: 0}}>{description}</p>
      </div>
    </div>
  );
}

function HomepageFeatures() {
  return (
    <section style={{padding: '3rem 0'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">Feito para Profissionais Azure</Heading>
          <p>Cada conceito Azure é ensinado através de labs práticos. Sem enrolação — apenas habilidades reais.</p>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HomepageHeader() {
  return (
    <header className="hero--azure">
      <div className="container">
        <Heading as="h1" className="hero__title">
          Azure Cert Prep
        </Heading>
        <p className="hero__subtitle">"Não estude apenas — construa."</p>
        <div className="stats-bar">
          {stats.map((stat, idx) => (
            <div key={idx} className="stat-item">
              <span className="stat-number">{stat.number}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/az-104/overview">
            AZ-104 (28 desafios)
          </Link>
          <Link
            className="button button--secondary button--lg"
            style={{marginLeft: '1rem'}}
            to="/docs/az-305/overview">
            AZ-305 (50 desafios)
          </Link>
          <Link
            className="button button--outline button--lg"
            style={{color: 'white', borderColor: 'white', marginLeft: '1rem'}}
            href="https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1">
            Abrir Lab
          </Link>
        </div>
      </div>
    </header>
  );
}

function ChallengeGrid() {
  return (
    <section style={{padding: '2rem 0'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">AZ-104: Azure Administrator</Heading>
          <p>28 desafios praticos — do seu primeiro usuario Entra ID ate um capstone multidisciplinar.</p>
        </div>
        <div className="row">
          {challenges.map((ch) => (
            <div key={ch.num} className="col col--3" style={{marginBottom: '1rem'}}>
              <Link to={ch.href} className="challenge-card">
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem'}}>
                  <span className="challenge-number">{ch.num}</span>
                  <span className={`domain-badge domain-badge--${ch.domain}`}>
                    {domainLabels[ch.domain]}
                  </span>
                </div>
                <strong>{ch.title}</strong>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AZ305ChallengeGrid() {
  return (
    <section style={{padding: '2rem 0', background: 'var(--ifm-color-emphasis-100)'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">AZ-305: Solutions Architect Expert</Heading>
          <p>50 desafios de design — decisoes arquiteturais, trade-offs e validacoes de prova de conceito.</p>
        </div>
        <div className="row">
          {az305Challenges.map((ch) => (
            <div key={ch.num} className="col col--3" style={{marginBottom: '1rem'}}>
              <Link to={ch.href} className="challenge-card">
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem'}}>
                  <span className="challenge-number">{ch.num}</span>
                  <span className={`domain-badge domain-badge--${ch.domain}`}>
                    {az305DomainLabels[ch.domain]}
                  </span>
                </div>
                <strong>{ch.title}</strong>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CertificationCoverage() {
  return (
    <section style={{padding: '2rem 0'}}>
      <div className="container" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Heading as="h2" style={{textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem'}}>100% de Cobertura da Certificacao</Heading>
        <p style={{textAlign: 'center', color: 'var(--ifm-color-emphasis-600)', fontSize: '1.1rem', maxWidth: '600px', marginBottom: '2rem'}}>
          Cada dominio dos guias de estudo oficiais mapeado para desafios praticos.
        </p>
        <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center'}}>
          <div>
            <h3 style={{textAlign: 'center', marginBottom: '1rem'}}>AZ-104 (28 desafios)</h3>
            <table style={{width: 'auto', borderCollapse: 'collapse'}}>
              <thead>
                <tr>
                  <th style={{textAlign: 'center'}}>Dominio</th>
                  <th style={{textAlign: 'center'}}>Peso</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--identity">Identidade & Governanca</span></td><td style={{textAlign: 'center'}}>20-25%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--storage">Armazenamento</span></td><td style={{textAlign: 'center'}}>15-20%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--compute">Computacao</span></td><td style={{textAlign: 'center'}}>20-25%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--networking">Rede</span></td><td style={{textAlign: 'center'}}>15-20%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--monitor">Monitorar & Manter</span></td><td style={{textAlign: 'center'}}>10-15%</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 style={{textAlign: 'center', marginBottom: '1rem'}}>AZ-305 (50 desafios)</h3>
            <table style={{width: 'auto', borderCollapse: 'collapse'}}>
              <thead>
                <tr>
                  <th style={{textAlign: 'center'}}>Dominio</th>
                  <th style={{textAlign: 'center'}}>Peso</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--identity-gov">Identidade & Monitoramento</span></td><td style={{textAlign: 'center'}}>25-30%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--data">Armazenamento de Dados</span></td><td style={{textAlign: 'center'}}>20-25%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--bcdr">Continuidade de Negocios</span></td><td style={{textAlign: 'center'}}>15-20%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--infra">Infraestrutura</span></td><td style={{textAlign: 'center'}}>30-35%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <p style={{textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', opacity: 0.7}}>
          Alinhado com os guias de estudo oficiais da Microsoft de Abril de 2026.
        </p>
      </div>
    </section>
  );
}

function ExamRoadmap() {
  return (
    <section style={{padding: '2rem 0', background: 'var(--ifm-color-emphasis-100)'}}>
      <div className="container" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Heading as="h2" style={{textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem'}}>Roadmap de Exames</Heading>
        <p style={{textAlign: 'center', color: 'var(--ifm-color-emphasis-600)', fontSize: '1.1rem', maxWidth: '600px', marginBottom: '2rem'}}>
          Mais exames em breve. Cada um seguira o mesmo formato pratico baseado em desafios.
        </p>
        <table style={{width: 'auto', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th style={{textAlign: 'center'}}>Exame</th>
              <th style={{textAlign: 'center'}}>Titulo</th>
              <th style={{textAlign: 'center'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AZ-104</strong></td>
              <td style={{textAlign: 'center'}}>Azure Administrator</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Disponivel (28 desafios)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AZ-305</strong></td>
              <td style={{textAlign: 'center'}}>Solutions Architect Expert</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Disponivel (50 desafios)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}>AZ-400</td>
              <td style={{textAlign: 'center'}}>DevOps Engineer Expert</td>
              <td style={{textAlign: 'center'}}><span style={{opacity: 0.6}}>Planejado</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}>AZ-500</td>
              <td style={{textAlign: 'center'}}>Azure Security Engineer</td>
              <td style={{textAlign: 'center'}}><span style={{opacity: 0.6}}>Planejado</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout
      title="Preparacao Hands-on para Certificacao Azure"
      description="Nao estude apenas — construa. Desafios praticos para certificacoes Azure. AZ-104 e AZ-305 disponiveis.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <ChallengeGrid />
        <AZ305ChallengeGrid />
        <CertificationCoverage />
        <ExamRoadmap />
      </main>
    </Layout>
  );
}
