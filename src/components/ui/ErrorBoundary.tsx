import { Component, ErrorInfo, ReactNode } from 'react';
import { ArenaLogo } from '@/components/branding';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou uma falha não tratada:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-arena-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
          {/* Luzes de fundo da Arena */}
          <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-arena-red/10 blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-arena-blue/10 blur-[120px]" />
          </div>

          <div className="w-full max-w-lg relative z-10 flex flex-col items-center text-center">
            {/* Logo Oficial Arena Voice */}
            <div className="mb-6">
              <ArenaLogo variant="complete" width={220} alt="Arena Voice" />
            </div>

            {/* Card de Alerta Tecnológico */}
            <div className="w-full bg-arena-card border border-arena-red/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
              <div className="w-14 h-14 rounded-2xl bg-arena-red/20 border border-arena-red/50 flex items-center justify-center mx-auto mb-4 text-arena-red">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide mb-2">
                Ops! Ocorreu uma instabilidade
              </h2>

              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                Ocorreu uma falha inesperada na interface. O sistema protegeu os dados da sua sessão e você pode retomar com segurança.
              </p>

              {/* Detalhes técnicos apenas em modo de desenvolvimento */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mb-6 p-3 bg-black/60 rounded-xl border border-white/10 text-left text-xs font-mono text-red-400 overflow-x-auto max-h-32">
                  <p className="font-bold mb-1">{this.state.error.name}: {this.state.error.message}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-[10px] text-gray-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack.slice(0, 300)}...
                    </pre>
                  )}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="flex-1 py-3 px-4 rounded-xl bg-arena-red hover:bg-arena-red/90 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-red-glow transition-all active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Recarregar Página</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-sm flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-95"
                >
                  <Home className="w-4 h-4" />
                  <span>Início</span>
                </button>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500 font-medium">
              Arena Voice — Voto Popular em Tempo Real
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
