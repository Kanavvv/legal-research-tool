export default function Privacy() {
  return (
    <main className="prose-page">
      <h1>Privacy Policy</h1>
      <p className="prose-meta">Last updated: [27/09/2026]</p>

      <p>
        This Privacy Policy explains how Nyaya ("we", "us") handles information when you use
        this website (the "Service").
      </p>

      <h2>1. Information We Collect</h2>
      <p><strong>Search queries.</strong> When you ask a question, the text of your question is sent to our
      backend server and to Anthropic's Claude API to generate an answer. We do not currently
      require an account, and we do not attach your query to any personal identity.</p>
      <p><strong>Automatically collected data.</strong> Our hosting providers (Google Cloud, Vercel) may
      automatically log standard technical information such as IP address, browser type, and
      request timestamps, for security and reliability purposes.</p>
      <p><strong>Cookies and advertising.</strong> [If/when this site displays advertising, this section will
      be updated to describe the cookies and tracking technologies used by our ad provider(s),
      and how to opt out, in compliance with applicable law.]</p>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>To process your search queries and generate answers</li>
        <li>To maintain, secure, and improve the Service</li>
        <li>To understand aggregate usage patterns (e.g., which topics are searched most)</li>
      </ul>

      <h2>3. Third-Party Services</h2>
      <p>We rely on the following third parties, each governed by their own privacy policies:</p>
      <ul>
        <li><strong>Anthropic</strong> (Claude API) -- processes query text to generate answers</li>
        <li><strong>Google Cloud Platform</strong> -- hosts our backend server</li>
        <li><strong>Vercel</strong> -- hosts our frontend website</li>
        <li><strong>Qdrant</strong> -- hosts our vector database of judgment text</li>
      </ul>

      <h2>4. Data Retention</h2>
      <p>
        We do not currently maintain a permanent log of individual user searches tied to any
        personal identifier. Standard server logs from our hosting providers are retained
        according to their own default retention policies.
      </p>

      <h2>5. Your Rights</h2>
      <p>
        Depending on your jurisdiction, you may have rights regarding any personal data
        processed about you. Since we do not collect accounts or persistent identifiers,
        most such requests will not apply, but you may contact us with any concerns at
        the address below.
      </p>

      <h2>6. Children's Privacy</h2>
      <p>The Service is not directed at children under 13, and we do not knowingly collect information from them.</p>

      <h2>7. Changes to This Policy</h2>
      <p>We may update this policy from time to time. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>

      <h2>8. Contact</h2>
      <p>Questions about this policy can be directed to: [kanavkedia060@gmail.com]</p>
    </main>
  );
}
