import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Wiederverwendbare Error Boundary Komponente
 * 
 * Phase 5: UI/UX Fehlertoleranz
 * - Fängt React-Fehler in Child-Komponenten ab
 * - Verhindert vollständigen App-Crash
 * - Zeigt benutzerfreundliche Fallback-UI
 * - Ermöglicht lokales Neuladen ohne gesamte App neu zu starten
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { label = 'Dieser Bereich' } = this.props;
      
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-red-50/50 to-orange-50/50 border border-orange-200 rounded-lg">
          <div className="text-center max-w-sm space-y-4">
            {/* Icon */}
            <div className="flex justify-center">
              <AlertTriangle className="w-12 h-12 text-orange-600" />
            </div>

            {/* Title & Message */}
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                Fehler in {label}
              </h3>
              <p className="text-sm text-muted-foreground">
                Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie, den Bereich neu zu laden.
              </p>
            </div>

            {/* Debug Info (Development only) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="text-xs bg-white rounded-md p-3 border border-orange-200 max-h-32 overflow-auto text-left">
                <p className="font-mono text-red-600 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            {/* Reload Button */}
            <Button
              onClick={this.handleReload}
              size="sm"
              className="gap-2 w-full"
            >
              <RotateCw className="w-4 h-4" />
              Bereich neu laden
            </Button>

            {/* Secondary Info */}
            <p className="text-xs text-muted-foreground">
              Die übrige App funktioniert weiterhin normal. Wenn das Problem weiterhin besteht, aktualisieren Sie die Seite.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;