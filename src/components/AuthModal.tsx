import { useState } from 'react';
import { Link } from 'react-router';

export type AuthMode = 'signin' | 'signup';

interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
}

const inputClass =
  "w-full bg-[#1a2245] border border-[#2a3a6a] rounded-[8px] px-[12px] py-[10px] text-[#e0e8f8] font-['Press_Start_2P',cursive] text-[8px] outline-none focus:border-[#ff2d78] transition-colors";
const btnClass =
  "px-[16px] py-[8px] rounded-[8px] font-['Press_Start_2P',cursive] text-[8px] transition-colors cursor-pointer";

export default function AuthModal({ mode, onClose, onSubmit, error }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isSignUp = mode === 'signup';
  const handleSubmit = () => onSubmit(email, password);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="retro-panel border-2 border-[#2a3a6a] rounded-[12px] p-[24px] w-[400px] neon-border-pink"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-['Press_Start_2P',cursive] text-[11px] text-[#e0e8f8] mb-[16px]">
          {isSignUp ? 'SIGN UP' : 'LOG IN'}
        </h2>

        {error && (
          <p className="text-[#ff4569] font-['Press_Start_2P',cursive] text-[7px] mb-[12px] leading-[1.8]">
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
          className={inputClass}
        />
        <input
          type="password"
          placeholder={isSignUp ? 'Password (min. 6 characters)' : 'Password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className={`${inputClass} mt-[12px]`}
        />

        {isSignUp && (
          <p className="mt-[12px] text-[#7a8ab8] text-[7px] font-['Press_Start_2P',cursive] leading-[1.8]">
            By signing up you agree to our{' '}
            <Link to="/terms" className="text-[#ff2d78] hover:underline" onClick={onClose}>Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-[#ff2d78] hover:underline" onClick={onClose}>Privacy Policy</Link>.
          </p>
        )}

        <div className="flex gap-[8px] mt-[16px] justify-end">
          <button onClick={onClose} className={`${btnClass} text-[#7a8ab8] hover:bg-[#1a2245]`}>Cancel</button>
          <button onClick={handleSubmit} className={`${btnClass} retro-btn-pink text-[#e0e8f8] border border-[#ff5a9e]`}>
            {isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}
