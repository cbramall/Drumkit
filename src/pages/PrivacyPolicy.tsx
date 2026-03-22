import { Link } from 'react-router';

export function PrivacyPolicyContent() {
  return (
    <section className="space-y-6 font-['Press_Start_2P',cursive] text-[#8a9ac8] text-[8px] leading-[2]">
      <p className="text-[#7a8ab8] text-[7px]">Last updated: March 2026</p>

      <div>
        <h2 className="text-[10px] text-[#e0e8f8] mb-3">1. Information We Collect</h2>
        <p>
          When you create an account, we collect your <strong>email address</strong> and an
          encrypted password hash (managed by Supabase Auth). We also store the <strong>beat
          data</strong> you create (drum patterns and tempo settings) associated with your account.
        </p>
        <p className="mt-2">
          If you use Beats-maker without an account, your beat data is stored locally in your
          browser's localStorage and is never sent to our servers.
        </p>
      </div>

      <div>
        <h2 className="text-[10px] text-[#e0e8f8] mb-3">2. How We Use Your Data</h2>
        <p>Your data is used solely to provide the Beats-maker service:</p>
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
        <h2 className="text-[10px] text-[#e0e8f8] mb-3">3. Data Storage &amp; Security</h2>
        <p>
          Account data is stored in a <strong>Supabase</strong>-hosted PostgreSQL database with
          Row-Level Security (RLS) enabled, ensuring you can only access your own beats. All
          communication is encrypted via HTTPS.
        </p>
      </div>

      <div>
        <h2 className="text-[10px] text-[#e0e8f8] mb-3">4. Third-Party Services</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Supabase</strong> — authentication and database hosting
            (<a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#ff2d78] hover:underline">Supabase Privacy Policy</a>)
          </li>
          <li>
            <strong>Google Fonts</strong> — web font delivery (Press Start 2P)
            (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#ff2d78] hover:underline">Google Privacy Policy</a>)
          </li>
        </ul>
      </div>

      <div>
        <h2 className="text-[10px] text-[#e0e8f8] mb-3">5. Cookies &amp; Local Storage</h2>
        <p>
          Beats-maker uses a single <strong>functional cookie</strong> to remember your sidebar
          preference. We also use <strong>localStorage</strong> to store beat data for
          unauthenticated users and your consent preference. We do not use tracking or
          advertising cookies.
        </p>
      </div>

      <div>
        <h2 className="text-[10px] text-[#e0e8f8] mb-3">6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Access the personal data we hold about you</li>
          <li>Request deletion of your account and all associated data</li>
          <li>Export your beat data</li>
        </ul>
        <p className="mt-2">To exercise these rights or request account deletion, contact us at the address below.</p>
      </div>

      <div>
        <h2 className="text-[10px] text-[#e0e8f8] mb-3">7. Contact</h2>
        <p>
          For questions about this privacy policy or your data, contact us at{' '}
          <a href="mailto:privacy@beatz-maker.netlify.app" className="text-[#ff2d78] hover:underline">
            privacy@beatz-maker.netlify.app
          </a>.
        </p>
      </div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen retro-bg text-[#e0e8f8] font-['Press_Start_2P',cursive] scanlines">
      <header className="retro-panel border-b border-[#2a3a6a] neon-border-bottom">
        <div className="max-w-3xl mx-auto px-8 py-6">
          <Link to="/" className="text-[#ff2d78] hover:text-[#ff5a9e] transition-colors text-[8px]">
            &larr; Back to Beats-maker
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-[14px] text-[#e0e8f8] mb-8">Privacy Policy</h1>
        <PrivacyPolicyContent />
      </main>
    </div>
  );
}
