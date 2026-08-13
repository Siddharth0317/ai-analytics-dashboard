import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in Analytics Dashboard:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#070a12',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div className="glass-panel" style={{ padding: '30px', maxWidth: '600px', textAlign: 'center' }}>
            <AlertOctagon size={48} color="#f43f5e" style={{ marginBottom: '16px' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px' }}>
              Dashboard Runtime Error Captured
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
              {this.state.error?.message || 'An unexpected error occurred in rendering engine.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw size={16} /> Reload Analytics Engine
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
