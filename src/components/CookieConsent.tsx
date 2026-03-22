import { useState, useEffect } from 'react';
import { Link } from 'react-router';

const CONSENT_KEY = 'superbeats_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
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
      <div className="max-w-xl mx-auto retro-panel border border-[#2a3a6a] rounded-xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-2xl pointer-events-auto font-['Press_Start_2P',cursive] neon-border-pink">
        <p className="text-[#8a9ac8] text-[7px] leading-[1.8] flex-1">
          Beats-maker uses cookies and local storage for functionality only — no tracking.{' '}
          <Link to="/privacy" className="text-[#ff2d78] hover:underline">Learn more</Link>
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 px-4 py-2 rounded-lg retro-btn-pink text-[#e0e8f8] text-[8px] border border-[#ff5a9e] cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
