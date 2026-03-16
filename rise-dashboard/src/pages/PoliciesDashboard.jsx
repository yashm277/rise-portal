import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import TermsOfService from './TermsOfService';
import PrivacyPolicy from './PrivacyPolicy';
import SecurityPolicy from './SecurityPolicy';
import './PoliciesDashboard.css';

const PoliciesDashboard = () => {
  const { user } = useAuth();
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const policies = [
    {
      id: 'terms',
      title: 'Terms of Service',
      icon: '📜',
      description: 'Legal agreement for using the RISE Research Portal',
      component: TermsOfService
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: '🔒',
      description: 'How we collect, use, and protect your personal information',
      component: PrivacyPolicy
    },
    {
      id: 'security',
      title: 'Security Policy',
      icon: '🛡️',
      description: 'Our security practices and infrastructure',
      component: SecurityPolicy
    }
  ];

  const openPolicy = (policy) => {
    setSelectedPolicy(policy);
  };

  const closePolicy = () => {
    setSelectedPolicy(null);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      
      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1 className="page-title">Legal & Policy Documents</h1>
            <p className="page-subtitle">Review our terms, privacy, and security policies</p>
          </div>
        </header>

        <div className="policies-grid">
          {policies.map((policy) => (
            <div 
              key={policy.id} 
              className="policy-card"
              onClick={() => openPolicy(policy)}
            >
              <div className="policy-icon">{policy.icon}</div>
              <h3 className="policy-title">{policy.title}</h3>
              <p className="policy-description">{policy.description}</p>
              <button className="policy-button">Read Policy →</button>
            </div>
          ))}
        </div>

        {/* Policy Popup */}
        {selectedPolicy && (
          <div className="policy-popup-overlay" onClick={closePolicy}>
            <div className="policy-popup" onClick={(e) => e.stopPropagation()}>
              <div className="policy-popup-header">
                <div className="policy-popup-title">
                  <span className="policy-popup-icon">{selectedPolicy.icon}</span>
                  <h2>{selectedPolicy.title}</h2>
                </div>
                <button className="policy-close-btn" onClick={closePolicy}>×</button>
              </div>
              <div className="policy-popup-content">
                {selectedPolicy && <selectedPolicy.component />}
              </div>
              <div className="policy-popup-footer">
                <button className="btn-secondary" onClick={closePolicy}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="card-rise" style={{ marginTop: '40px', padding: '30px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>
            Need Help or Have Questions?
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '20px' 
          }}>
            <div className="contact-info-item">
              <div className="contact-icon">📧</div>
              <div>
                <h4>General Support</h4>
                <a href="mailto:wahiq@riseglobaleducation.com">wahiq@riseglobaleducation.com</a>
              </div>
            </div>
            <div className="contact-info-item">
              <div className="contact-icon">🔒</div>
              <div>
                <h4>Privacy Concerns</h4>
                <a href="mailto:admin@riseglobaleducation.com">admin@riseglobaleducation.com</a>
              </div>
            </div>
            <div className="contact-info-item">
              <div className="contact-icon">🛡️</div>
              <div>
                <h4>Security Issues</h4>
                <a href="mailto:wahiq@riseglobaleducation.com">wahiq@riseglobaleducation.com</a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PoliciesDashboard;
