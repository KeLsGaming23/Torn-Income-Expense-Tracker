import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React Error Boundary]', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050811] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Application Render Notice</h3>
                <p className="text-xs text-slate-400">A component encountered an issue.</p>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs font-mono text-rose-300 overflow-x-auto max-h-40">
              {this.state.error?.toString()}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
