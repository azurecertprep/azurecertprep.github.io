import Heading from '@theme/Heading';

const FeatureList = [
  {
    emoji: '🎯',
    title: '100% Exam Coverage',
    description: 'Every skill from the official AZ-104 study guide mapped to a hands-on challenge. Verified against the April 2026 exam objectives.',
  },
  {
    emoji: '🔧',
    title: 'Hands-On Labs',
    description: 'No slides, no theory dumps. Every concept taught through real Azure resources you create, configure, and troubleshoot.',
  },
  {
    emoji: '💰',
    title: 'Cost-Conscious',
    description: 'All 16 challenges cost ~$3 total with cleanup scripts. Designed for Azure Free Account ($200 credit) or Azure for Students.',
  },
  {
    emoji: '🖥️',
    title: 'One-Click Lab',
    description: 'Open in GitHub Codespaces and get Azure CLI, Bicep, and PowerShell ready in minutes. No local setup needed.',
  },
  {
    emoji: '✅',
    title: 'Validated Commands',
    description: 'Every Azure CLI command, PowerShell snippet, and Bicep template tested end-to-end. CI validates on every commit.',
  },
  {
    emoji: '📖',
    title: 'Break & Fix',
    description: 'Each challenge includes troubleshooting scenarios with deliberate misconfigurations to diagnose and fix. Build real-world skills.',
  },
];

function Feature({emoji, title, description}) {
  return (
    <div className="col col--4" style={{marginBottom: '1.5rem'}}>
      <div className="feature-card">
        <span className="feature-emoji">{emoji}</span>
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
