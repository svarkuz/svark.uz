import React, { Component, ErrorInfo, ReactNode } from 'react';

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
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      let errorMessage = 'Kutilmagan xatolik yuz berdi.';
      
      try {
        if (error?.message) {
          const parsedError = JSON.parse(error.message);
          if (parsedError.error && parsedError.error.includes('insufficient permissions')) {
            errorMessage = 'Sizda ushbu amalni bajarish uchun ruxsat yo\'q.';
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
          <div className="p-8 bg-white rounded-2xl shadow-xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Xatolik!</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-gold hover:bg-gold-light text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-gold/20 transition-all active:scale-95"
            >
              Sahifani yangilash
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
