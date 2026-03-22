import { Link } from 'react-router';

export default function TermsOfService() {
  return (
    <div className="min-h-screen retro-bg text-[#e0e8f8] font-['Press_Start_2P',cursive] scanlines">
      <header className="retro-panel border-b border-[#2a3a6a] neon-border-bottom">
        <div className="max-w-3xl mx-auto px-8 py-6 flex items-center justify-between">
          <Link to="/" className="text-[#ff2d78] hover:text-[#ff5a9e] transition-colors text-[8px]">
            &larr; Back to Beats-maker
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-[14px] text-[#e0e8f8] mb-8">Terms of Service</h1>
        <p className="text-[#7a8ab8] text-[7px] mb-8">Last updated: March 2026</p>

        <section className="space-y-6 text-[#8a9ac8] text-[8px] leading-[2]">
          <div>
            <h2 className="text-[10px] text-[#e0e8f8] mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Beats-maker, you agree to be bound by these Terms of Service. If
              you do not agree, do not use the service.
            </p>
          </div>

          <div>
            <h2 className="text-[10px] text-[#e0e8f8] mb-3">2. Description of Service</h2>
            <p>
              Beats-maker is a free, web-based drum machine and step sequencer that lets you create,
              save, and manage drum patterns. The service is provided "as is" without warranty of any
              kind.
            </p>
          </div>

          <div>
            <h2 className="text-[10px] text-[#e0e8f8] mb-3">3. User Accounts</h2>
            <p>
              You may create an account using an email address and password. You are responsible for
              maintaining the security of your account credentials. You must provide accurate
              information when creating an account.
            </p>
          </div>

          <div>
            <h2 className="text-[10px] text-[#e0e8f8] mb-3">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Use the service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the service or its systems</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Use automated tools to scrape or access the service beyond normal use</li>
            </ul>
          </div>

          <div>
            <h2 className="text-[10px] text-[#e0e8f8] mb-3">5. Intellectual Property</h2>
            <p>
              You retain ownership of the beat patterns you create. Beats-maker retains all rights to
              the application code, design, and branding.
            </p>
          </div>

          <div>
            <h2 className="text-[10px] text-[#e0e8f8] mb-3">6. Limitation of Liability</h2>
            <p>
              Beats-maker is provided without warranties of any kind. We are not liable for any
              damages arising from your use of the service, including but not limited to loss of data
              or interruption of service.
            </p>
          </div>

          <div>
            <h2 className="text-[10px] text-[#e0e8f8] mb-3">7. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the service at any time for
              violation of these terms. You may delete your account at any time by contacting us.
            </p>
          </div>

          <div>
            <h2 className="text-[10px] text-[#e0e8f8] mb-3">8. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the service after changes
              constitutes acceptance of the new terms.
            </p>
          </div>

          <div>
            <h2 className="text-[10px] text-[#e0e8f8] mb-3">9. Contact</h2>
            <p>
              For questions about these terms, contact us at{' '}
              <a href="mailto:support@superbeats.app" className="text-[#ff2d78] hover:underline">
                support@superbeats.app
              </a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
