import { Link } from 'react-router';

export default function PrivacyPolicy() {
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
        <h1 className="text-3xl font-bold text-[#f8fafc] mb-8">Privacy Policy</h1>
        <p className="text-[#9f9fa9] text-sm mb-8">Last updated: March 2026</p>

        <section className="space-y-6 text-[#c4c4cc] leading-relaxed">
          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">1. Information We Collect</h2>
            <p>
              When you create an account, we collect your <strong>email address</strong> and an
              encrypted password hash (managed by Supabase Auth). We also store the <strong>beat
              data</strong> you create (drum patterns and tempo settings) associated with your account.
            </p>
            <p className="mt-2">
              If you use Super Beats without an account, your beat data is stored locally in your
              browser's localStorage and is never sent to our servers.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">2. How We Use Your Data</h2>
            <p>Your data is used solely to provide the Super Beats service:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Email and password: to authenticate your account</li>
              <li>Beat data: to save and load your drum patterns across sessions</li>
            </ul>
            <p className="mt-2">
              We do not sell, rent, or share your personal information with third parties for
              marketing purposes. We do not use analytics or tracking tools.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">3. Data Storage & Security</h2>
            <p>
              Account data is stored in a <strong>Supabase</strong>-hosted PostgreSQL database with
              Row-Level Security (RLS) enabled, ensuring you can only access your own beats. All
              communication is encrypted via HTTPS.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">4. Third-Party Services</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Supabase</strong> — authentication and database hosting
                (<a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#ad46ff] hover:underline">Supabase Privacy Policy</a>)
              </li>
              <li>
                <strong>Google Fonts</strong> — web font delivery (IBM Plex Mono)
                (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#ad46ff] hover:underline">Google Privacy Policy</a>)
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">5. Cookies & Local Storage</h2>
            <p>
              Super Beats uses a single <strong>functional cookie</strong> to remember your sidebar
              preference. We also use <strong>localStorage</strong> to store beat data for
              unauthenticated users and your consent preference. We do not use tracking or
              advertising cookies.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Export your beat data</li>
            </ul>
            <p className="mt-2">
              To exercise these rights or request account deletion, contact us at the address below.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-medium text-[#f8fafc] mb-3">7. Contact</h2>
            <p>
              For questions about this privacy policy or your data, contact us at{' '}
              <a href="mailto:privacy@superbeats.app" className="text-[#ad46ff] hover:underline">
                privacy@superbeats.app
              </a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
