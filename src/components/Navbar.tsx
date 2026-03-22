interface NavbarProps {
  user: { email?: string } | null;
  onSignUpClick: () => void;
  onSignInClick: () => void;
  onSignOut: () => void;
}

export default function Navbar({ user, onSignUpClick, onSignInClick, onSignOut }: NavbarProps) {
  return (
    <header className="retro-panel fixed top-0 left-0 right-0 z-20 w-full neon-border-bottom">
      <nav className="flex flex-row items-center justify-end overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center justify-end px-[40px] py-[24px] relative w-full">
          <div className="content-stretch flex gap-[8px] items-center justify-end relative z-10 shrink-0">
            {user ? (
              <>
                <p className="font-['Press_Start_2P',cursive] text-[7px] text-[#7a8ab8] truncate max-w-[180px]">
                  {user.email}
                </p>
                <button
                  onClick={onSignOut}
                  className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative shrink-0 cursor-pointer hover:text-white transition-colors"
                >
                  <p className="font-['Press_Start_2P',cursive] leading-[normal] relative shrink-0 text-[#e0e8f8] text-[8px]">
                    LOG OUT
                  </p>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onSignUpClick}
                  className="retro-btn-pink content-stretch flex gap-[4px] items-center justify-center p-[8px] relative rounded-[8px] shrink-0 cursor-pointer"
                >
                  <div aria-hidden="true" className="absolute border border-[#ff5a9e] border-solid inset-0 pointer-events-none rounded-[8px]" />
                  <p className="font-['Press_Start_2P',cursive] leading-[normal] relative shrink-0 text-[#e0e8f8] text-[8px]">SIGN UP</p>
                </button>
                <button
                  onClick={onSignInClick}
                  className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative shrink-0 cursor-pointer hover:text-white transition-colors"
                >
                  <p className="font-['Press_Start_2P',cursive] leading-[normal] relative shrink-0 text-[#e0e8f8] text-[8px]">LOG IN</p>
                </button>
              </>
            )}
          </div>
          <div className="-translate-x-1/2 -translate-y-1/2 absolute content-stretch flex items-center justify-center left-1/2 px-[16px] py-[4px] top-[calc(50%+1px)] pointer-events-none">
            <h1 className="font-['Press_Start_2P',cursive] leading-[normal] relative shrink-0 text-[40px] chrome-text tracking-[0.08em]">
              BEATZ-MAKER
            </h1>
          </div>
        </div>
      </nav>
      <div aria-hidden="true" className="absolute border-[#2a3a6a] border-b border-solid inset-0 pointer-events-none" />
    </header>
  );
}
