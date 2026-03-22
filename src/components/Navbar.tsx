interface NavbarProps {
  user: { email?: string } | null;
  onSignUpClick: () => void;
  onSignInClick: () => void;
  onSignOut: () => void;
  onHelpClick: () => void;
}

export default function Navbar({ user, onSignUpClick, onSignInClick, onSignOut, onHelpClick }: NavbarProps) {
  return (
    <header className="retro-panel fixed top-0 left-0 right-0 z-20 w-full neon-border-bottom">
      <nav className="overflow-clip rounded-[inherit] size-full">
        <div className="flex items-center justify-between px-4 py-3 md:px-[40px] md:py-[24px] relative w-full">

          {/* Left: help button */}
          <div className="flex items-center z-10 shrink-0">
            <button
              type="button"
              onClick={onHelpClick}
              title="Help (?)"
              className="synth-btn-chrome flex items-center justify-center px-[10px] py-[10px] rounded-[4px] cursor-pointer font-['Press_Start_2P',cursive] text-[9px] text-[#8aa0d4] leading-none"
            >
              ?
            </button>
          </div>

          {/* Center: app title — absolutely positioned so it stays perfectly centred */}
          <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-[calc(50%+1px)] pointer-events-none px-[16px] py-[4px]">
            <h1 className="font-['Press_Start_2P',cursive] leading-[normal] text-[20px] md:text-[40px] chrome-text tracking-[0.08em] whitespace-nowrap">
              BEATZ-MAKER
            </h1>
          </div>

          {/* Right: auth buttons */}
          <div className="flex gap-[8px] items-center z-10 shrink-0">
            {user ? (
              <>
                <p className="font-['Press_Start_2P',cursive] text-[7px] text-[#7a8ab8] truncate max-w-[100px] md:max-w-[180px]">
                  {user.email}
                </p>
                <button
                  onClick={onSignOut}
                  className="flex gap-[8px] items-center justify-center p-[8px] shrink-0 cursor-pointer hover:text-white transition-colors"
                >
                  <p className="font-['Press_Start_2P',cursive] leading-[normal] text-[#e0e8f8] text-[8px]">LOG OUT</p>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onSignUpClick}
                  className="retro-btn-pink flex gap-[4px] items-center justify-center p-[8px] relative rounded-[8px] shrink-0 cursor-pointer"
                >
                  <div aria-hidden="true" className="absolute border border-[#ff5a9e] border-solid inset-0 pointer-events-none rounded-[8px]" />
                  <p className="font-['Press_Start_2P',cursive] leading-[normal] relative text-[#e0e8f8] text-[8px]">SIGN UP</p>
                </button>
                <button
                  onClick={onSignInClick}
                  className="flex gap-[8px] items-center justify-center p-[8px] shrink-0 cursor-pointer hover:text-white transition-colors"
                >
                  <p className="font-['Press_Start_2P',cursive] leading-[normal] text-[#e0e8f8] text-[8px]">LOG IN</p>
                </button>
              </>
            )}
          </div>

        </div>
      </nav>
      <div aria-hidden="true" className="absolute border-[#2a3a6a] border-b border-solid inset-0 pointer-events-none" />
    </header>
  );
}
