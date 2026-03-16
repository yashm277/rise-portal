import './PolicyPage.css';

const SecurityPolicy = () => {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1>Security Policy</h1>
        <p className="policy-meta"><strong>Last Updated:</strong> January 22, 2026</p>

        <section>
          <h2>1. Overview</h2>
          <p>RISE Global Education ("RISE Research," "we," "our," or "us") takes the security of our portal and the protection of user data seriously. This document outlines our security practices, policies, and procedures.</p>
        </section>

        <section>
          <h2>2. Security Architecture</h2>
          
          <h3>2.1 Application Stack</h3>
          <ul>
            <li><strong>Frontend:</strong> React 19 (Vite) hosted on Vercel</li>
            <li><strong>Backend:</strong> Node.js/Express serverless functions on Vercel</li>
            <li><strong>Database:</strong> Airtable with API-based access</li>
            <li><strong>Authentication:</strong> Google OAuth 2.0 + Custom email/password</li>
          </ul>

          <h3>2.2 Infrastructure Security</h3>
          <ul>
            <li><strong>Hosting:</strong> Vercel (SOC 2 Type II certified)</li>
            <li><strong>TLS/SSL:</strong> All communications encrypted with TLS 1.2+</li>
            <li><strong>HTTPS:</strong> Enforced for all connections</li>
            <li><strong>CDN:</strong> Vercel Edge Network with DDoS protection</li>
            <li><strong>Serverless:</strong> Isolated function execution environments</li>
          </ul>
        </section>

        <section>
          <h2>3. Data Security</h2>
          
          <h3>3.1 Data Encryption</h3>
          <ul>
            <li><strong>In Transit:</strong> TLS 1.2+ encryption for all data transmission</li>
            <li><strong>At Rest:</strong> Airtable provides AES-256 encryption at rest</li>
            <li><strong>API Keys:</strong> Stored as environment variables, never in code</li>
            <li><strong>Passwords:</strong> Stored in Airtable with controlled access</li>
          </ul>

          <h3>3.2 Data Storage</h3>
          <ul>
            <li><strong>Primary Database:</strong> Airtable (ISO 27001, SOC 2 Type II certified)</li>
            <li><strong>Session Data:</strong> Encrypted session tokens in browser sessionStorage</li>
            <li><strong>Backups:</strong> Managed by Airtable with redundancy</li>
            <li><strong>Data Location:</strong> United States (AWS infrastructure)</li>
          </ul>
        </section>

        <section>
          <h2>4. Authentication and Authorization</h2>
          
          <h3>4.1 Authentication Methods</h3>
          <ol>
            <li><strong>Google OAuth 2.0:</strong>
              <ul>
                <li>Industry-standard OAuth flow</li>
                <li>No password storage for Google users</li>
                <li>Verified against authorized email list</li>
              </ul>
            </li>
            <li><strong>Email/Password:</strong>
              <ul>
                <li>Passwords stored in Airtable</li>
                <li>Email verification against authorized user tables</li>
                <li>Session-based authentication</li>
              </ul>
            </li>
          </ol>

          <h3>4.2 Authorization (Role-Based Access Control)</h3>
          <ul>
            <li><strong>Students:</strong> Access only their own meetings and schedules</li>
            <li><strong>Mentors:</strong> Access their schedules, assigned students, invoicing</li>
            <li><strong>Writing Coaches:</strong> Similar to mentors with specialized access</li>
            <li><strong>Program Managers:</strong> Administrative oversight</li>
            <li><strong>Parents:</strong> Read-only access to student data</li>
            <li><strong>Team:</strong> Full administrative access</li>
          </ul>

          <h3>4.3 Session Management</h3>
          <ul>
            <li>Sessions stored in browser sessionStorage (cleared on browser close)</li>
            <li>No persistent "remember me" tokens</li>
            <li>Sessions expire on logout or browser close</li>
            <li>API requests validate session on every call</li>
          </ul>
        </section>

        <section>
          <h2>5. Application Security</h2>
          
          <h3>5.1 Input Validation</h3>
          <ul>
            <li>All user inputs validated on frontend and backend</li>
            <li>XSS prevention via React's built-in escaping</li>
            <li>CSRF protection via same-origin policy</li>
          </ul>

          <h3>5.2 API Security</h3>
          <ul>
            <li><strong>Authentication:</strong> Bearer token verification on protected endpoints</li>
            <li><strong>Rate Limiting:</strong> Implemented at Vercel edge level</li>
            <li><strong>CORS:</strong> Configured to allow only authorized origins</li>
            <li><strong>API Keys:</strong> Airtable Personal Access Token never exposed to client</li>
            <li><strong>Environment Variables:</strong> All secrets in Vercel environment config</li>
          </ul>
        </section>

        <section>
          <h2>6. Vulnerability Management</h2>
          
          <h3>6.1 Responsible Disclosure</h3>
          <p>We encourage security researchers to report vulnerabilities responsibly.</p>
          
          <p><strong>How to Report:</strong></p>
          <ul>
            <li>Email: wahiq@riseglobaleducation.com</li>
            <li>Subject: "[Security] Vulnerability Report"</li>
            <li>Include: Description, steps to reproduce, potential impact</li>
          </ul>

          <p><strong>Response Timeline:</strong></p>
          <ul>
            <li>Acknowledgment within 48 hours</li>
            <li>Initial assessment within 7 days</li>
            <li>Regular updates during investigation</li>
            <li>Public disclosure coordinated with reporter</li>
          </ul>

          <h3>6.2 Patch Management</h3>
          <ul>
            <li><strong>Critical vulnerabilities:</strong> Patched within 24-48 hours</li>
            <li><strong>High severity:</strong> Patched within 7 days</li>
            <li><strong>Medium severity:</strong> Patched within 30 days</li>
            <li><strong>Low severity:</strong> Addressed in regular updates</li>
          </ul>
        </section>

        <section>
          <h2>7. Third-Party Security</h2>
          
          <h3>7.1 Service Providers</h3>
          <p>All third-party services used meet or exceed industry security standards:</p>
          <ul>
            <li><strong>Vercel:</strong> SOC 2 Type II, ISO 27001</li>
            <li><strong>Airtable:</strong> SOC 2 Type II, ISO 27001, GDPR compliant</li>
            <li><strong>Google OAuth:</strong> Industry-leading authentication security</li>
            <li><strong>Google Calendar API:</strong> OAuth 2.0 with minimal scope access</li>
          </ul>
        </section>

        <section>
          <h2>8. Incident Response</h2>
          
          <h3>8.1 Incident Response Plan</h3>
          <p>In the event of a security incident:</p>
          
          <ol>
            <li><strong>Detection and Analysis</strong> (0-2 hours):
              <ul>
                <li>Identify scope and severity</li>
                <li>Assemble incident response team</li>
                <li>Begin containment procedures</li>
              </ul>
            </li>
            <li><strong>Containment</strong> (2-6 hours):
              <ul>
                <li>Isolate affected systems</li>
                <li>Prevent further data exposure</li>
                <li>Preserve evidence</li>
              </ul>
            </li>
            <li><strong>Notification</strong> (Within 72 hours):
              <ul>
                <li>Notify affected users if PII compromised</li>
                <li>Report to authorities as required by law</li>
                <li>Coordinate public disclosure</li>
              </ul>
            </li>
          </ol>

          <h3>8.2 User Notification</h3>
          <p>If a data breach affects your personal information, we will:</p>
          <ul>
            <li>Notify you within 72 hours via email</li>
            <li>Explain what data was affected</li>
            <li>Describe steps we're taking</li>
            <li>Advise on protective measures you can take</li>
          </ul>
        </section>

        <section>
          <h2>9. Business Continuity</h2>
          
          <h3>9.1 Backup and Recovery</h3>
          <ul>
            <li><strong>Database Backups:</strong> Managed by Airtable (continuous replication)</li>
            <li><strong>Code Repository:</strong> GitHub with full version history</li>
            <li><strong>Deployment:</strong> Can redeploy from GitHub within minutes</li>
            <li><strong>Recovery Time Objective (RTO):</strong> &lt; 4 hours</li>
            <li><strong>Recovery Point Objective (RPO):</strong> &lt; 1 hour</li>
          </ul>

          <h3>9.2 Disaster Recovery</h3>
          <ul>
            <li>Multi-region infrastructure (Vercel global edge)</li>
            <li>Automatic failover for API endpoints</li>
            <li>Database redundancy across multiple AWS regions (Airtable)</li>
          </ul>
        </section>

        <section>
          <h2>10. Compliance and Certifications</h2>
          
          <h3>10.1 Regulatory Compliance</h3>
          <ul>
            <li><strong>GDPR:</strong> General Data Protection Regulation (EU)</li>
            <li><strong>CCPA:</strong> California Consumer Privacy Act</li>
            <li><strong>COPPA:</strong> Children's Online Privacy Protection Act</li>
            <li><strong>FERPA:</strong> Family Educational Rights and Privacy Act</li>
          </ul>

          <h3>10.2 Security Standards</h3>
          <p>While we do not currently hold independent certifications, we:</p>
          <ul>
            <li>Follow OWASP Top 10 security practices</li>
            <li>Implement NIST Cybersecurity Framework principles</li>
            <li>Use SOC 2 compliant infrastructure providers</li>
          </ul>
        </section>

        <section>
          <h2>11. Contact and Reporting</h2>
          
          <h3>11.1 Security Team</h3>
          <ul>
            <li><strong>Email:</strong> wahiq@riseglobaleducation.com</li>
            <li><strong>PGP Key:</strong> Available upon request</li>
          </ul>

          <h3>11.2 General Support</h3>
          <ul>
            <li><strong>Email:</strong> wahiq@riseglobaleducation.com</li>
          </ul>

          <h3>11.3 Emergency Contact</h3>
          <p>For urgent security issues outside business hours:</p>
          <ul>
            <li>Email wahiq@riseglobaleducation.com with "[URGENT]" in subject</li>
            <li>Response time: Within 4 hours</li>
          </ul>
        </section>

        <footer className="policy-footer">
          <p><strong>Document Ownership:</strong> RISE Global Education Security Team<br />
          <strong>Review Cycle:</strong> Quarterly<br />
          <strong>Next Review:</strong> April 22, 2026</p>
        </footer>
      </div>
    </div>
  );
};

export default SecurityPolicy;
