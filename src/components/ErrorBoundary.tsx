import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <Card className="p-8 text-center max-w-md">
            <h2 className="text-xl font-bold mb-2">Algo deu errado</h2>
            <p className="text-muted-foreground mb-4">
              Ocorreu um erro inesperado. Por favor, recarregue a página.
            </p>
            <Button onClick={() => window.location.reload()}>
              Recarregar Página
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
