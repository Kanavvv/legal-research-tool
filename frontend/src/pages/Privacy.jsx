export default function Privacy() {
  return (
    <main id="main" className="station station--narrow">
      <article className="prose prose--page">
      <h1>Privacy Policy</h1>
      <p className="prose-meta">Last updated: [12/11/2026]</p>

      <p>
        This Privacy Policy explains how Nyaya ("we", "us") handles information when you use
        this website (the "Service").
      </p>

      <h2>1. Information We Collect</h2>
      <p><strong>Questions.</strong> When you ask a question, compare cases or build an argument, the text is sent to our
      backend and to Anthropic's Claude API to write the answer. Answers to common questions are cached for up to 14 days
      so repeat questions are faster; the cache holds the question and answer text, not who asked. We also keep the text of
      questions, without who asked, for 30 days to see what people need and to improve answers.</p>
      <p><strong>Accounts.</strong> If you sign in, Google Firebase stores your email address and name. Your recent questions,
      saved cases, folders and case alerts are stored against your account so they appear on your desk.</p>
      <p><strong>Uploaded documents.</strong> A document you upload for review is read once to write the explanation, sent to
      Anthropic for that purpose, and then discarded. We do not save the file or its text.</p>
      <p><strong>Share links.</strong> When you press "Share link", the question, answer and sources are saved so anyone with the
      link can read them. Shared answers do not include your name or email.</p>
      <p><strong>Payments.</strong> Nyaya Pro is paid through Cashfree Payments. Cashfree handles your card, UPI or bank details; we receive
      only the payment ID, amount and status, which we keep as a record of your purchase.</p>
      <p><strong>Usage counts and logs.</strong> To apply daily limits and stop abuse, we count requests per account, or per
      hashed IP address if you are not signed in. Our hosting providers (Google Cloud, Vercel) also keep standard technical
      logs such as IP address, browser type and request times.</p>
      <p><strong>Analytics and cookies.</strong> Only if you choose "Allow" on the banner, we count page
      visits with Vercel Web Analytics. It sets no cookies, does not follow you across other sites, and
      reports only aggregate numbers such as page views and country. We also keep our own daily totals:
      how many times each page was viewed, whether on a phone or computer, which website sent you there,
      and how often answers were shared. These are plain counts per day, with no name, address, account or
      device identifier attached. If you choose "No thanks", neither kind of counting runs. Your choice is stored in your browser's local storage under "nyaya-consent";
      clear your site data to be asked again. We do not show advertising.</p>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>To answer your questions and run the tools you use</li>
        <li>To keep your desk, folders and Pro plan working across devices</li>
        <li>To email the weekly digest or case alerts you signed up for (unsubscribe from any email)</li>
        <li>To apply daily limits, prevent abuse and keep the Service secure</li>
        <li>To understand aggregate usage patterns (e.g., which topics are searched most)</li>
      </ul>
      <p>We do not sell your information or use it for advertising.</p>

      <h2>3. Third-Party Services</h2>
      <p>We rely on the following third parties, each governed by their own privacy policies:</p>
      <ul>
        <li><strong>Anthropic</strong> (Claude API): processes question and document text to write answers</li>
        <li><strong>Google Cloud and Firebase</strong>: host our backend, sign-in and account data</li>
        <li><strong>Vercel</strong>: hosts the website and, if you allow it, counts anonymous page visits</li>
        <li><strong>Qdrant</strong>: hosts our database of judgment text</li>
        <li><strong>Cashfree Payments</strong>: processes Nyaya Pro payments</li>
        <li><strong>Resend</strong>: sends the weekly digest and case alert emails</li>
      </ul>

      <h2>4. Data Retention</h2>
      <p>
        Cached answers expire after 14 days. Daily usage counts are only needed for the day they cover. Your account data,
        folders and alerts stay until you delete them or ask us to delete your account. Share links stay readable until you ask
        us to remove them. Payment records are kept as long as the law requires. Hosting providers keep their logs according to
        their own policies.
      </p>

      <h2>5. Your Rights</h2>
      <p>
        You can delete folders, saved answers and alerts from your desk at any time. To get a copy of your data, delete your
        account, or remove a share link, email us at the address below and we will act on it within 30 days.
      </p>

      <h2>6. Children's Privacy</h2>
      <p>The Service is not directed at children under 13, and we do not knowingly collect information from them.</p>

      <h2>7. Changes to This Policy</h2>
      <p>We may update this policy from time to time. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>

      <h2>8. Contact</h2>
      <p>Questions about this policy can be directed to: [kanavkedia060@gmail.com]</p>
      </article>
    </main>
  );
}
