import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Shows what went wrong instead of a blank screen, so the user can report it. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 pt-16 text-center">
        <p className="text-5xl">😵</p>
        <h1 className="text-xl font-semibold">Qualcosa è andato storto</h1>
        <p className="text-sm text-zinc-400">
          I tuoi dati sono al sicuro. Fai uno screenshot di questa pagina per segnalare il problema.
        </p>
        <pre className="max-h-48 overflow-auto rounded-2xl bg-zinc-900 p-3 text-left text-xs whitespace-pre-wrap text-rose-300 ring-1 ring-white/5">
          {`${error.name}: ${error.message}\n${location.hash}\n${navigator.userAgent}`}
        </pre>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => location.reload()}
            className="h-12 rounded-2xl bg-zinc-800 font-medium"
          >
            Ricarica
          </button>
          <button
            onClick={() => {
              location.hash = '#/';
              location.reload();
            }}
            className="h-12 rounded-2xl bg-emerald-400 font-semibold text-zinc-950"
          >
            Torna a Oggi
          </button>
        </div>
      </div>
    );
  }
}
