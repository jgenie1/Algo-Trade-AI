"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-6 text-center bg-[#100d14]/90 border border-white/10 rounded-2xl my-4 text-white">
          <div className="p-3 rounded-full bg-red-500/10 text-red-400 mb-4 border border-red-500/20">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold font-headline mb-2">Un problème est survenu</h2>
          <p className="text-sm text-white/60 font-body max-w-md mb-6 leading-relaxed">
            L'affichage de ce composant a rencontré une erreur inattendue. Veuillez rafraîchir la page ou réinitialiser le composant.
          </p>
          {this.state.error && (
            <div className="bg-black/60 border border-white/10 rounded-xl p-3 mb-6 max-w-lg w-full text-left overflow-x-auto">
              <code className="text-xs text-rose-300 font-mono block">
                {this.state.error.toString()}
              </code>
            </div>
          )}
          <Button
            onClick={this.handleReset}
            className="bg-[#c2ff0c] text-black hover:bg-[#b0e60a] font-bold px-6 py-2 rounded-xl flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Recharger l'Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
