import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Policies.css';

const Policies = () => {
  const navigate = useNavigate();
  const [activePolicy, setActivePolicy] = useState('privacy');

  const policies = {
    privacy: {
      title: 'Privacy Policy',
      summary: 'How we collect, use, and protect your personal information',
      highlights: [
        'We collect only necessary information for educational services',
        'Data is encrypted and stored securely with SOC 2 certified providers',
        'We never sell your personal information',
        'You have rights to access, correct, and delete your data',
        'GDPR, CCPA, COPPA, and FERPA compliant'
      ],
      link: '/PRIVACY_POLICY.md'
    },
    terms: {
      title: 'Terms of Service',
      summary: 'Legal agreement for using the RISE Research Portal',
      highlights: [
        'User responsibilities and acceptable use policies',
        'Payment terms and cancellation policies',
        'Intellectual property rights',
        'Limitation of liability and disclaimers',
        'Dispute resolution procedures'
      ],
      link: '/TERMS_OF_SERVICE.md'
    },
    security: {
      title: 'Security Policy',
      summary: 'Our security practices and infrastructure',
      highlights: [
        'TLS encryption for all data transmission',
        'SOC 2 Type II compliant infrastructure (Vercel, Airtable)',
        'Role-based access control and session management',
        'Regular security audits and vulnerability scanning',
        'Incident response procedures and 48-hour notification'
      ],
      link: '/SECURITY_POLICY.md'
    },
    deletion: {
      title: 'Data Deletion Policy',
      summary: 'How to request data deletion and retention periods',
      highlights: [
        'Request deletion anytime via email or portal',
        'Personal identifiers removed within 30 days',
        'Financial records retained for 7 years (legal requirement)',
        'Anonymized data may be retained for statistics',
        'Complete data export available before deletion'
      ],
      link: '/DATA_DELETION_POLICY.md'
    },
    mentor: {
      title: 'Mentor Policy',
      summary: 'Terms and conditions for service providers',
      highlights: [
        'Independent contractor status and requirements',
        'Qualifications and onboarding process',
        'Payment terms and invoicing procedures',
        'Professional code of conduct and ethics',
        'Performance metrics and quality assurance'
      ],
      link: '/MENTOR_POLICY.md'
    },
    about: {
      title: 'About RISE Research',
      summary: 'Organization information and leadership',
      highlights: [
        'Division of RISE Global Education',
        'Leadership team and contact information',
        'Legal entity and business registration details',
        'Technology partners and affiliations',
        'Mission, vision, and core values'
      ],
      link: '/ABOUT.md'
    }
  };

  const handleViewFullPolicy = (policyKey) => {
    // Open the markdown file in a new tab
    window.open(policies[policyKey].link, '_blank');
  };

  return (
    <div className="policies-container">
      <div className="policies-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      <div className="policies-content">
        {/* Header */}
        <header className="policies-header">
          <div className="header-content">
            <button onClick={() => navigate('/login')} className="back-button">
              ← Back to Login
            </button>
            <h1 className="policies-title">Legal & Policy Documents</h1>
            <p className="policies-subtitle">
              Transparency and accountability in everything we do
            </p>
          </div>
        </header>

        {/* Policy Navigation */}
        <div className="policy-nav">
          {Object.keys(policies).map((key) => (
            <button
              key={key}
              className={`policy-nav-btn ${activePolicy === key ? 'active' : ''}`}
              onClick={() => setActivePolicy(key)}
            >
              {policies[key].title}
            </button>
          ))}
        </div>

        {/* Active Policy Content */}
        <div className="policy-content-card glass">
          <div className="policy-header">
            <h2>{policies[activePolicy].title}</h2>
            <p className="policy-summary">{policies[activePolicy].summary}</p>
          </div>

          <div className="policy-highlights">
            <h3>Key Highlights</h3>
            <ul>
              {policies[activePolicy].highlights.map((highlight, index) => (
                <li key={index}>
                  <span className="checkmark">✓</span>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>

          <div className="policy-actions">
            <button
              onClick={() => handleViewFullPolicy(activePolicy)}
              className="btn-primary"
            >
              📄 View Full Policy Document
            </button>
            <button
              onClick={() => window.print()}
              className="btn-secondary"
            >
              🖨️ Print
            </button>
          </div>
        </div>

        {/* Contact Information */}
        <div className="policies-footer-section glass">
          <h3>Contact Information</h3>
          <div className="contact-grid">
            <div className="contact-item">
              <div className="contact-icon">🔒</div>
              <div className="contact-details">
                <h4>Privacy & Data Protection</h4>
                <a href="mailto:admin@riseglobaleducation.com">
                  admin@riseglobaleducation.com
                </a>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon">🛡️</div>
              <div className="contact-details">
                <h4>Security Issues</h4>
                <a href="mailto:wahiq@riseglobaleducation.com">
                  wahiq@riseglobaleducation.com
                </a>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon">💼</div>
              <div className="contact-details">
                <h4>Legal & Compliance</h4>
                <a href="mailto:admin@riseglobaleducation.com">
                  admin@riseglobaleducation.com
                </a>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon">💬</div>
              <div className="contact-details">
                <h4>General Support</h4>
                <a href="mailto:wahiq@riseglobaleducation.com">
                  wahiq@riseglobaleducation.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Badges */}
        <div className="compliance-section glass">
          <h3>Regulatory Compliance</h3>
          <div className="compliance-badges">
            <div className="compliance-badge">
              <div className="badge-icon">🇪🇺</div>
              <div className="badge-text">GDPR Compliant</div>
            </div>
            <div className="compliance-badge">
              <div className="badge-icon">🇺🇸</div>
              <div className="badge-text">CCPA Compliant</div>
            </div>
            <div className="compliance-badge">
              <div className="badge-icon">👶</div>
              <div className="badge-text">COPPA Compliant</div>
            </div>
            <div className="compliance-badge">
              <div className="badge-icon">🎓</div>
              <div className="badge-text">FERPA Compliant</div>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="policies-footer">
          <p>
            <strong>Last Updated:</strong> January 22, 2026 | 
            <strong> Next Review:</strong> April 22, 2026
          </p>
          <p className="footer-note">
            All policies are reviewed quarterly and updated as needed. 
            Material changes are communicated via email 30 days in advance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Policies;
