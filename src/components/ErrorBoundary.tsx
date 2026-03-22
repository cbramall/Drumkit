import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0e27] px-8 text-center">
          <h1 className="font-['Press_Start_2P',cursive] text-[24px] text-[#ff1744] mb-6 tracking-wide">
            SYSTEM CRASH
          </h1>
          <p className="font-['Press_Start_2P',cursive] text-[8px] text-[#7a8ab8] mb-4 leading-[2]">
            An unexpected error occurred.
          </p>
          {this.state.message && (
            <p className="font-mono text-[10px] text-[#ff4569] bg-[#1a0a10] border border-[#ff1744]/30 rounded px-4 py-3 mb-8 max-w-xl break-all">
              {this.state.message}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="font-['Press_Start_2P',cursive] text-[8px] px-6 py-3 bg-[#ff1744]/20 border border-[#ff1744]/60 text-[#ff4569] rounded cursor-pointer hover:bg-[#ff1744]/30 transition-colors"
          >
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
