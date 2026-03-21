import { Link } from 'react-router';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#f1f5f9] font-['IBM_Plex_Mono',monospace]">
      <header className="bg-[#18181b] border-b border-[#3f3f47]">
        <div className="max-w-3xl mx-auto px-8 py-6 flex items-center justify-between">
          <Link to="/" className="text-[#ad46ff] hover:text-[#c77dff] transition-colors text-sm">
            &larr; Back to Super Beats
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold text-[#f8fafc] mb-8">Terms of Service</h1>
        <p className="text-[#9f9fa9] text-sm mb-8">Last updated: March 2026</p>

        <section className="space-y-6 text-[#c4c4cc] leading-relaxed">
          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Super Beats, you agree to be bound by these Terms of Service. If
              you do not agree, do not use the service.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">2. Description of Service</h2>
            <p>
              Super Beats is a free, web-based drum machine and step sequencer that lets you create,
              save, and manage drum patterns. The service is provided "as is" without warranty of any
              kind.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">3. User Accounts</h2>
            <p>
              You may create an account using an email address and password. You are responsible for
              maintaining the security of your account credentials. You must provide accurate
              information when creating an account.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Use the service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the service or its systems</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Use automated tools to scrape or access the service beyond normal use</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">5. Intellectual Property</h2>
            <p>
              You retain ownership of the beat patterns you create. Super Beats retains all rights to
              the application code, design, and branding.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">6. Limitation of Liability</h2>
            <p>
              Super Beats is provided without warranties of any kind. We are not liable for any
              damages arising from your use of the service, including but not limited to loss of data
              or interruption of service.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">7. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the service at any time for
              violation of these terms. You may delete your account at any time by contacting us.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">8. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the service after changes
              constitutes acceptance of the new terms.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">9. Contact</h2>
            <p>
              For questions about these terms, contact us at{' '}
              <a href="mailto:support@superbeats.app" className="text-[#ad46ff] hover:underline">
                support@superbeats.app
              </a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
