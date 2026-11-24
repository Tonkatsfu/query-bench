import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('QueryBench render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-6 text-[#ececef]">
          <div className="max-w-lg rounded-[6px] border border-[#24242c] bg-[#0e0e11] p-6">
            <h1 className="text-sm font-semibold text-rose-400">Application Error</h1>
            <p className="mt-2 text-xs text-[#a1a1aa]">
              Something went wrong while rendering QueryBench. Try reloading the page.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-[4px] border border-[#24242c] bg-[#09090b] p-3 font-mono text-xs text-rose-300">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-[5px] border border-[#30303b] bg-[#1a1a21] px-3 py-1.5 text-xs font-medium text-[#ececef] hover:bg-[#22222b]"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
