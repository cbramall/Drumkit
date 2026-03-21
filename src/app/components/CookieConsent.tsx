import { useState, useEffect } from 'react';
import { Link } from 'react-router';

const CONSENT_KEY = 'superbeats_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(CONSENT_KEY, '1');
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 pointer-events-none">
      <div className="max-w-xl mx-auto bg-[#18181b] border border-[#3f3f47] rounded-xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-2xl pointer-events-auto font-['IBM_Plex_Mono',monospace]">
        <p className="text-[#c4c4cc] text-sm flex-1">
          Super Beats uses cookies and local storage for functionality only — no tracking.{' '}
          <Link to="/privacy" className="text-[#ad46ff] hover:underline">
            Learn more
          </Link>
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 px-4 py-2 rounded-lg bg-[#8200db] text-[#f8fafc] text-sm font-medium hover:bg-[#9b20ef] transition-colors border border-[#ad46ff] cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
