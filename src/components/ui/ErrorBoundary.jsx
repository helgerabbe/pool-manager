import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-6 rounded-lg border border-red-200 bg-red-50 min-h-[200px]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-semibold text-red-800">Hoppla!</h2>
          </div>
          <p className="text-sm text-red-700 text-center max-w-md">
            {this.props.fallback || 'Dieser Bereich konnte nicht geladen werden. Bitte versuche ihn neu zu laden.'}
          </p>
          {typeof window !== 'undefined' && this.state.error && (
            <details className="text-xs text-red-600 mt-2 p-2 bg-red-100 rounded max-w-md">
              <summary className="cursor-pointer font-medium">Fehlerdetails</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.error.toString()}</pre>
            </details>
          )}
          <Button
            onClick={this.handleReset}
            size="sm"
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <RotateCcw className="w-4 h-4" />
            Neu laden
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;