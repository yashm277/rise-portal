import './PolicyPage.css';

const PrivacyPolicy = () => {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1>Privacy Policy</h1>
        <p className="policy-meta"><strong>Effective Date:</strong> January 22, 2026<br />
        <strong>Last Updated:</strong> January 22, 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>RISE Global Education ("RISE Research," "we," "our," or "us") is committed to protecting the privacy and security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our research mentorship portal (the "Portal").</p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          
          <h3>2.1 Personal Information</h3>
          <p>We collect the following personal information:</p>
          <ul>
            <li><strong>Name and Email Address:</strong> For account creation and communication</li>
            <li><strong>Google Account Information:</strong> If you sign in using Google OAuth (name, email, profile picture)</li>
            <li><strong>Program Information:</strong> Student ID, Program ID, Mentor assignments</li>
            <li><strong>Scheduling Data:</strong> Meeting dates, times, and availability</li>
            <li><strong>Academic Progress:</strong> Session completion status, research package type</li>
            <li><strong>Authentication Credentials:</strong> Encrypted passwords for email-based login</li>
          </ul>

          <h3>2.2 Automatically Collected Information</h3>
          <ul>
            <li><strong>Usage Data:</strong> Pages visited, features used, time spent on portal</li>
            <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
            <li><strong>Cookies:</strong> Session management and authentication tokens</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use your personal information for the following purposes:</p>
          <ul>
            <li><strong>Account Management:</strong> Creating and managing your user account</li>
            <li><strong>Service Delivery:</strong> Facilitating mentor-student matching and scheduling</li>
            <li><strong>Communication:</strong> Sending appointment reminders and program updates</li>
            <li><strong>Progress Tracking:</strong> Monitoring academic progress and session completion</li>
            <li><strong>Invoicing:</strong> Processing payments for completed sessions (mentors only)</li>
            <li><strong>Security:</strong> Preventing fraud and ensuring platform security</li>
            <li><strong>Compliance:</strong> Meeting legal and regulatory requirements</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Storage and Security</h2>
          
          <h3>4.1 Third-Party Services</h3>
          <p>We use the following trusted third-party services to store and process your data:</p>
          <ul>
            <li><strong>Airtable:</strong> Database storage for user profiles, schedules, and meetings</li>
            <li><strong>Vercel:</strong> Application hosting and serverless functions</li>
            <li><strong>Google OAuth:</strong> Authentication services (optional)</li>
          </ul>

          <h3>4.2 Security Measures</h3>
          <ul>
            <li>All data transmissions use <strong>HTTPS/TLS encryption</strong></li>
            <li>Passwords are stored securely in our database</li>
            <li>API credentials are stored as environment variables, never exposed to clients</li>
            <li>Session tokens expire after inactivity</li>
            <li>Role-based access control limits data access</li>
            <li>Regular security audits and updates</li>
          </ul>
        </section>

        <section>
          <h2>5. Data Sharing and Disclosure</h2>
          
          <h3>5.1 Internal Sharing</h3>
          <p>Your information may be shared internally with:</p>
          <ul>
            <li><strong>Assigned Mentors:</strong> To facilitate educational services</li>
            <li><strong>Program Managers:</strong> For program coordination and support</li>
            <li><strong>Administrative Staff:</strong> For invoicing and record-keeping</li>
          </ul>

          <h3>5.2 Third-Party Sharing</h3>
          <p>We <strong>do not sell</strong> your personal information. We may share data with:</p>
          <ul>
            <li><strong>Service Providers:</strong> Airtable, Vercel, Google (as described above)</li>
            <li><strong>Legal Authorities:</strong> When required by law or to protect our legal rights</li>
            <li><strong>Parents/Guardians:</strong> For students under 18 (with consent)</li>
          </ul>
        </section>

        <section>
          <h2>6. Your Privacy Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update inaccurate or incomplete information</li>
            <li><strong>Deletion:</strong> Request removal of your personal data (subject to legal obligations)</li>
            <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
            <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
            <li><strong>Restrict Processing:</strong> Limit how we use your data</li>
          </ul>

          <h3>6.1 How to Exercise Your Rights</h3>
          <p>To exercise any of these rights, please contact us at:</p>
          <ul>
            <li><strong>Email:</strong> admin@riseglobaleducation.com</li>
            <li><strong>Portal:</strong> Use the "Change Password" or "Contact Support" features</li>
          </ul>
          <p>We will respond to your request within <strong>30 days</strong>.</p>
        </section>

        <section>
          <h2>7. Data Retention</h2>
          <p>We retain your personal information for as long as necessary to:</p>
          <ul>
            <li>Provide services you have requested</li>
            <li>Comply with legal obligations (minimum 7 years for financial records)</li>
            <li>Resolve disputes and enforce agreements</li>
          </ul>

          <h3>7.1 Retention Periods</h3>
          <ul>
            <li><strong>Active Accounts:</strong> Duration of program enrollment + 2 years</li>
            <li><strong>Inactive Accounts:</strong> 1 year after last login, then archived</li>
            <li><strong>Financial Records:</strong> 7 years from transaction date</li>
            <li><strong>Meeting Records:</strong> 3 years for quality assurance</li>
          </ul>
        </section>

        <section>
          <h2>8. Children's Privacy</h2>
          <p>Our service is intended for students of all ages, including minors. For users under 18:</p>
          <ul>
            <li>We require parental consent for account creation</li>
            <li>Parents can access and control their child's account</li>
            <li>We collect only information necessary for educational services</li>
            <li>We comply with applicable children's privacy laws (COPPA, GDPR-K)</li>
          </ul>
        </section>

        <section>
          <h2>9. Cookies and Tracking</h2>
          
          <h3>9.1 Essential Cookies</h3>
          <ul>
            <li><strong>Session Management:</strong> Keep you logged in</li>
            <li><strong>Security:</strong> Prevent cross-site request forgery (CSRF)</li>
          </ul>
          <p>You can control cookies through your browser settings.</p>
        </section>

        <section>
          <h2>10. Regulatory Compliance</h2>
          <p>We comply with:</p>
          <ul>
            <li><strong>GDPR</strong> (General Data Protection Regulation - EU)</li>
            <li><strong>CCPA</strong> (California Consumer Privacy Act - California, USA)</li>
            <li><strong>COPPA</strong> (Children's Online Privacy Protection Act - USA)</li>
            <li><strong>FERPA</strong> (Family Educational Rights and Privacy Act - USA)</li>
          </ul>
        </section>

        <section>
          <h2>11. Changes to This Policy</h2>
          <p>We may update this Privacy Policy periodically. We will:</p>
          <ul>
            <li>Notify you of material changes via email</li>
            <li>Post the updated policy on our portal with a new "Last Updated" date</li>
            <li>Require your consent for material changes if legally required</li>
          </ul>
        </section>

        <section>
          <h2>12. Contact Information</h2>
          <p>For privacy-related questions, concerns, or requests:</p>
          <p><strong>RISE Global Education - RISE Research Division</strong><br />
          Email: admin@riseglobaleducation.com<br />
          Support Email: wahiq@riseglobaleducation.com</p>
        </section>

        <footer className="policy-footer">
          <p><strong>Acknowledgment:</strong> By using the RISE Research Portal, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.</p>
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
