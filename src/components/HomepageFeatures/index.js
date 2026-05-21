import Heading from '@theme/Heading';

const FeatureList = [
  {
    title: '100% Exam Coverage',
    description: 'Every skill from the official Microsoft study guides mapped to hands-on challenges. 5 exams, 205 challenges — verified against current exam objectives.',
  },
  {
    title: 'Hands-On Labs',
    description: 'No slides, no theory dumps. Every concept taught through real Azure resources you create, configure, and troubleshoot.',
  },
  {
    title: 'Cost-Conscious',
    description: 'Challenges use minimal resources with cleanup scripts. Designed for Azure Free Account ($200 credit) or Azure for Students.',
  },
  {
    title: 'One-Click Lab',
    description: 'Open in GitHub Codespaces and get Azure CLI, Bicep, and PowerShell ready in minutes. No local setup needed.',
  },
  {
    title: 'Validated Commands',
    description: 'Every Azure CLI command, PowerShell snippet, and Bicep template validated for correctness. 400+ issues caught and fixed through 9 review passes.',
  },
  {
    title: 'Break & Fix',
    description: 'Each challenge includes troubleshooting scenarios with deliberate misconfigurations to diagnose and fix. Build real-world skills.',
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

export default function HomepageFeatures() {
  return (
    <section style={{padding: '3rem 0'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">Built for Azure Professionals</Heading>
          <p>Every Azure concept is taught through hands-on labs. No fluff — just real skills.</p>
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
