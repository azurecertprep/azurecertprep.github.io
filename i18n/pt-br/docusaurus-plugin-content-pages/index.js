import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

const stats = [
  { number: '28', label: 'Desafios' },
  { number: '100%', label: 'Cobertura AZ-104' },
  { number: '~$5', label: 'Custo Total' },
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
  identity: 'Identidade & Governança',
  storage: 'Armazenamento',
  compute: 'Computação',
  networking: 'Rede',
  monitor: 'Monitoramento',
};

const referenceTable = [
  { onprem: 'Active Directory', azure: 'Microsoft Entra ID', desc: 'Gerenciamento de identidade e acesso' },
  { onprem: 'Group Policy (GPO)', azure: 'Azure Policy', desc: 'Conformidade e governança' },
  { onprem: 'File server (SMB)', azure: 'Azure Files', desc: 'Compartilhamentos de arquivos gerenciados' },
  { onprem: 'NAS / SAN', azure: 'Azure Blob Storage', desc: 'Armazenamento de objetos e blocos' },
  { onprem: 'Hyper-V / VMware', azure: 'Azure Virtual Machines', desc: 'Cargas de trabalho de computação' },
  { onprem: 'IIS / Apache', azure: 'Azure App Service', desc: 'Hospedagem de aplicações web' },
  { onprem: 'Docker host', azure: 'Azure Container Apps', desc: 'Cargas de trabalho em contêineres' },
  { onprem: 'VLAN / Subnet', azure: 'Azure VNet / Subnet', desc: 'Isolamento de rede' },
  { onprem: 'Firewall rules', azure: 'NSG / Azure Firewall', desc: 'Controle de tráfego' },
  { onprem: 'DNS server', azure: 'Azure DNS', desc: 'Resolução de nomes' },
  { onprem: 'F5 / HAProxy', azure: 'Azure Load Balancer', desc: 'Distribuição de tráfego' },
  { onprem: 'Nagios / Zabbix', azure: 'Azure Monitor', desc: 'Monitoramento e alertas' },
  { onprem: 'Veeam / SCDPM', azure: 'Azure Backup', desc: 'Backup e recuperação' },
  { onprem: 'DR site', azure: 'Azure Site Recovery', desc: 'Recuperação de desastres' },
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
            Comece com AZ-104 →
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
          <Heading as="h2">28 Desafios</Heading>
          <p>Dificuldade progressiva — do seu primeiro usuário Entra ID até um capstone multidisciplinar.</p>
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

function ReferenceTable() {
  return (
    <section style={{padding: '2rem 0', background: 'var(--ifm-color-emphasis-100)'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">Sysadmin ↔ Azure</Heading>
          <p>Você já conhece os conceitos. Veja como eles se traduzem para o Azure.</p>
        </div>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <div className="reference-table">
            <table>
              <thead>
                <tr>
                  <th>On-Prem / Sysadmin</th>
                  <th>Equivalente no Azure</th>
                  <th>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {referenceTable.map((row, idx) => (
                  <tr key={idx}>
                    <td><code>{row.onprem}</code></td>
                    <td><strong>{row.azure}</strong></td>
                    <td>{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function CertificationCoverage() {
  return (
    <section style={{padding: '2rem 0'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">100% de Cobertura da Certificação</Heading>
          <p>Cada domínio do exame AZ-104 mapeado para desafios práticos.</p>
        </div>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <div style={{width: '100%', maxWidth: '650px'}}>
            <table style={{width: '100%'}}>
              <thead>
                <tr>
                  <th style={{textAlign: 'center'}}>Domínio</th>
                  <th style={{textAlign: 'center'}}>Peso no Exame</th>
                  <th style={{textAlign: 'center'}}>Desafios</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--identity">Identidade & Governança</span></td>
                  <td style={{textAlign: 'center'}}>20–25%</td>
                  <td style={{textAlign: 'center'}}>01, 02, 03, 17, 18</td>
                </tr>
                <tr>
                  <td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--storage">Armazenamento</span></td>
                  <td style={{textAlign: 'center'}}>15–20%</td>
                  <td style={{textAlign: 'center'}}>04, 05, 06, 19, 20</td>
                </tr>
                <tr>
                  <td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--compute">Computação</span></td>
                  <td style={{textAlign: 'center'}}>20–25%</td>
                  <td style={{textAlign: 'center'}}>07, 08, 09, 10, 21, 22, 23</td>
                </tr>
                <tr>
                  <td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--networking">Rede</span></td>
                  <td style={{textAlign: 'center'}}>15–20%</td>
                  <td style={{textAlign: 'center'}}>11, 12, 13, 24, 25, 26</td>
                </tr>
                <tr>
                  <td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--monitor">Monitorar & Manter</span></td>
                  <td style={{textAlign: 'center'}}>10–15%</td>
                  <td style={{textAlign: 'center'}}>14, 15, 27, 28</td>
                </tr>
              </tbody>
            </table>
            <p style={{textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', opacity: 0.7}}>
              Alinhado com o <a href="https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104">guia de estudo oficial do AZ-104</a> de Abril de 2026.
              O Desafio 16 é um capstone multidisciplinar. Desafios 17-28 oferecem aprofundamento em tópicos avançados.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout
      title="Preparação Hands-on para Certificação Azure"
      description="Não estude apenas — construa. Desafios práticos para certificações Azure. Comece com AZ-104 Azure Administrator.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <ChallengeGrid />
        <CertificationCoverage />
        <ReferenceTable />
      </main>
    </Layout>
  );
}
