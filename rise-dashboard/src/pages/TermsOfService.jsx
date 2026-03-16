import './PolicyPage.css';

const TermsOfService = () => {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1>Terms of Service</h1>
        <p className="policy-meta">
          <strong>Version:</strong> 1.1<br />
          <strong>Effective Date:</strong> January 22, 2026<br />
          <strong>Last Updated:</strong> January 22, 2026
        </p>

        <section>
          <h2>1. Agreement to These Terms</h2>
          <p>By accessing or using the RISE Research Portal ("Portal"), you agree to these Terms of Service ("Terms"). If you do not agree, you may not access or use the Portal.</p>
          
          <h3>1.1 Parties</h3>
          <p><strong>Service Provider:</strong> RISE Global Education ("RISE Research", "we", "our", "us")</p>
          <p><strong>Users:</strong> Students, Mentors, Writing Coaches, Parents/Guardians, Program Managers, and Administrative Staff</p>
          <p>If the user is under 18, a parent or legal guardian must consent to these Terms.</p>
        </section>

        <section>
          <h2>2. Description of the Service</h2>
          
          <h3>2.1 Purpose of the Portal</h3>
          <p>The Portal is a student management system designed to support RISE Research programs, including:</p>
          <ul>
            <li>Student–mentor matching and coordination</li>
            <li>Session scheduling and tracking</li>
            <li>Research progress monitoring</li>
            <li>Meeting records and internal notes</li>
            <li>Mentor invoicing and payments</li>
            <li>Program communication and administration</li>
          </ul>
          <p>The Portal supports service delivery but does not itself provide academic instruction.</p>

          <h3>2.2 Availability</h3>
          <ul>
            <li>The Portal is provided "as is" and "as available"</li>
            <li>We do not guarantee uninterrupted or error-free access</li>
            <li>Scheduled maintenance may be announced</li>
            <li>Emergency maintenance may occur without prior notice</li>
          </ul>
        </section>

        <section>
          <h2>3. User Accounts</h2>
          
          <h3>3.1 Account Creation</h3>
          <ul>
            <li>Accounts are created and managed by RISE Research administrators</li>
            <li>Users must provide accurate and current information</li>
            <li>You are responsible for all activity on your account</li>
            <li>Any unauthorized access must be reported immediately</li>
          </ul>

          <h3>3.2 Account Roles</h3>
          <ul>
            <li><strong>Students:</strong> Book sessions, attend meetings, track progress</li>
            <li><strong>Mentors / Writing Coaches:</strong> Manage availability, conduct sessions, submit invoices</li>
            <li><strong>Program Managers / Team:</strong> Administrative oversight and quality control</li>
            <li><strong>Parents/Guardians:</strong> View-only access to student information</li>
          </ul>

          <h3>3.3 Suspension or Termination</h3>
          <p>We may suspend or terminate access if a user:</p>
          <ul>
            <li>Violates these Terms</li>
            <li>Provides false or misleading information</li>
            <li>Engages in harassment, abuse, or misconduct</li>
            <li>Engages in fraud or misuse of the Portal</li>
            <li>Fails to meet payment obligations (where applicable)</li>
          </ul>
          <p><strong>Effect of Termination:</strong></p>
          <ul>
            <li>Portal access ends immediately</li>
            <li>Outstanding payment obligations remain payable</li>
            <li>Data may be retained as required by law or legitimate business needs</li>
          </ul>
        </section>

        <section>
          <h2>4. User Responsibilities</h2>
          
          <h3>4.1 Students</h3>
          <ul>
            <li>Attend scheduled sessions or cancel with required notice</li>
            <li>Submit required materials on time (including testimonials where agreed)</li>
            <li>Behave professionally with mentors and staff</li>
            <li>Follow program guidelines and research integrity standards</li>
          </ul>

          <h3>4.2 Mentors and Writing Coaches</h3>
          <ul>
            <li>Maintain accurate availability</li>
            <li>Attend confirmed sessions or reschedule responsibly</li>
            <li>Deliver services professionally and in good faith</li>
            <li>Submit accurate invoices promptly</li>
            <li>Report issues or discrepancies without delay</li>
          </ul>

          <h3>4.3 All Users</h3>
          <ul>
            <li>Keep login credentials secure</li>
            <li>Use the Portal only for its intended purpose</li>
            <li>Respect intellectual property and confidentiality</li>
            <li>Comply with applicable laws and regulations</li>
            <li>Report bugs, vulnerabilities, or misuse</li>
          </ul>
        </section>

        <section>
          <h2>5. Intellectual Property</h2>
          
          <h3>5.1 Portal Ownership</h3>
          <p>All rights to the Portal, including software, design, workflows, and branding, belong to RISE Global Education. Users may not copy, reverse-engineer, or commercially exploit the Portal.</p>

          <h3>5.2 Student Work</h3>
          <ul>
            <li>Students retain ownership of their original research</li>
            <li>RISE Research may showcase anonymized or credited work only with consent</li>
            <li>Testimonials may be used for marketing with explicit permission</li>
          </ul>

          <h3>5.3 Mentor Materials</h3>
          <ul>
            <li>Mentors retain ownership of pre-existing materials</li>
            <li>Materials created specifically for RISE Research programs may be used internally by RISE Research for program delivery and quality assurance</li>
            <li>Commercial reuse outside RISE Research requires mentor consent</li>
          </ul>
        </section>

        <section>
          <h2>6. Payments</h2>
          
          <h3>6.1 Student Fees</h3>
          <ul>
            <li>Fees depend on the selected research package</li>
            <li>Payment schedules are agreed at enrollment</li>
            <li>No refunds are provided for completed sessions except where required by law or in cases of material service failure</li>
          </ul>

          <h3>6.2 Mentor Payments</h3>
          <ul>
            <li>Mentors are paid per completed session</li>
            <li>Invoices are submitted monthly via the Portal</li>
            <li>Payments are processed within 30 days of invoice approval</li>
            <li>Discrepancies must be reported within 7 days of invoice generation</li>
          </ul>
        </section>

        <section>
          <h2>7. Scheduling and Cancellations</h2>
          
          <h3>7.1 Booking Rules</h3>
          <ul>
            <li>Sessions must be booked at least 12 hours in advance</li>
            <li>Mentors must update availability at least 24 hours in advance</li>
            <li>Session limits depend on the student's package allocation</li>
          </ul>

          <h3>7.2 Cancellations</h3>
          <ul>
            <li><strong>24+ hours notice:</strong> Reschedule or credit allowed</li>
            <li><strong>12–24 hours notice:</strong> Session counted; reschedule may be offered</li>
            <li><strong>&lt;12 hours or no-show:</strong> Session forfeited</li>
            <li><strong>Mentor cancellation:</strong> Student receives a makeup session</li>
          </ul>
        </section>

        <section>
          <h2>8. Privacy and Data Protection</h2>
          <p>Use of the Portal is governed by our Privacy Policy, which forms part of these Terms.</p>
          <p>We use third-party service providers (including hosting and database services). We are not responsible for outages or failures caused by these providers beyond our reasonable control.</p>
        </section>

        <section>
          <h2>9. Prohibited Conduct</h2>
          <p>Users may not:</p>
          <ul>
            <li>Use the Portal unlawfully</li>
            <li>Impersonate others</li>
            <li>Share accounts</li>
            <li>Attempt unauthorized access</li>
            <li>Upload malicious code</li>
            <li>Scrape or misuse data</li>
            <li>Spam, harass, or interfere with operations</li>
          </ul>
        </section>

        <section>
          <h2>10. Disclaimers</h2>
          
          <h3>10.1 Educational Disclaimer</h3>
          <p>RISE Research provides mentorship and guidance only. We do not guarantee:</p>
          <ul>
            <li>Publication acceptance</li>
            <li>University admissions outcomes</li>
            <li>Specific academic results</li>
          </ul>

          <h3>10.2 No Warranties</h3>
          <p>THE PORTAL IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</p>
        </section>

        <section>
          <h2>11. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law:</p>
          <ul>
            <li>We are not liable for indirect or consequential damages</li>
            <li>Total liability shall not exceed fees paid in the last 12 months</li>
            <li>Nothing limits liability for fraud, death, or personal injury</li>
          </ul>
        </section>

        <section>
          <h2>12. Force Majeure</h2>
          <p>We are not liable for delays or failures caused by events beyond reasonable control, including internet failures, third-party outages, government actions, or natural disasters.</p>
        </section>

        <section>
          <h2>13. Changes to These Terms</h2>
          <p>We may update these Terms from time to time. Material changes will be communicated via email or the Portal. Continued use constitutes acceptance.</p>
        </section>

        <section>
          <h2>14. Governing Law and Jurisdiction</h2>
          <p>These Terms are governed by the laws of India. Courts in Mumbai, Maharashtra have exclusive jurisdiction.</p>
        </section>

        <section>
          <h2>15. Contact</h2>
          <p><strong>RISE Global Education – RISE Research Division</strong><br />
          Email: admin@riseglobaleducation.com<br />
          Support: wahiq@riseglobaleducation.com</p>
        </section>

        {/* Privacy Policy Section */}
        <div style={{ marginTop: '60px', borderTop: '2px solid #e5e5e5', paddingTop: '40px' }}>
          <h1>Privacy Policy</h1>
          <p className="policy-meta"><strong>Effective Date:</strong> January 22, 2026</p>

          <section>
            <h2>1. Information We Collect</h2>
            <ul>
              <li>Name, email, role, institution</li>
              <li>Session records and scheduling data</li>
              <li>Communications within the Portal</li>
              <li>Payment and invoicing records (where applicable)</li>
            </ul>
            <p>For minors, data is collected with parental consent.</p>
          </section>

          <section>
            <h2>2. How We Use Data</h2>
            <ul>
              <li>Deliver research programs</li>
              <li>Manage scheduling and payments</li>
              <li>Monitor program quality</li>
              <li>Provide support and communication</li>
              <li>Meet legal and contractual obligations</li>
            </ul>
          </section>

          <section>
            <h2>3. Data Storage & Security</h2>
            <ul>
              <li>Data is stored using secure third-party providers</li>
              <li>Access is role-based and restricted</li>
              <li>Reasonable safeguards are used to protect information</li>
            </ul>
          </section>

          <section>
            <h2>4. Data Sharing</h2>
            <p>We do not sell personal data. Data may be shared with:</p>
            <ul>
              <li>Service providers (hosting, payments)</li>
              <li>Mentors and program staff</li>
              <li>Legal authorities if required by law</li>
            </ul>
          </section>

          <section>
            <h2>5. Your Rights</h2>
            <p>You may request to:</p>
            <ul>
              <li>Access your data</li>
              <li>Correct inaccuracies</li>
              <li>Request deletion (subject to legal requirements)</li>
            </ul>
          </section>

          <section>
            <h2>6. Data Retention</h2>
            <p>Data is retained only as long as necessary for program delivery, legal compliance, or legitimate business purposes.</p>
          </section>

          <section>
            <h2>7. International Users</h2>
            <p>Data may be processed outside your country using appropriate safeguards.</p>
          </section>

          <section>
            <h2>8. Contact</h2>
            <p>Email: wahiq@riseglobaleducation.com</p>
          </section>
        </div>

        {/* Cookie Policy Section */}
        <div style={{ marginTop: '60px', borderTop: '2px solid #e5e5e5', paddingTop: '40px' }}>
          <h1>Cookie Policy</h1>
          <p className="policy-meta"><strong>Effective Date:</strong> January 22, 2026</p>

          <section>
            <h2>1. What Are Cookies?</h2>
            <p>Cookies are small files used to ensure Portal functionality and improve user experience.</p>
          </section>

          <section>
            <h2>2. Cookies We Use</h2>
            <ul>
              <li><strong>Essential cookies:</strong> Login, session management</li>
              <li><strong>Performance cookies:</strong> Basic usage analytics (non-intrusive)</li>
            </ul>
            <p>We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2>3. Managing Cookies</h2>
            <p>You may control cookies via your browser settings. Disabling essential cookies may affect Portal functionality.</p>
          </section>

          <section>
            <h2>4. Updates</h2>
            <p>This Cookie Policy may be updated periodically.</p>
          </section>
        </div>

        <footer className="policy-footer">
          <p><strong>Document Version:</strong> 1.1<br />
          <strong>Effective Date:</strong> January 22, 2026</p>
        </footer>
      </div>
    </div>
  );
};

export default TermsOfService;
