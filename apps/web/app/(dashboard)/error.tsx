'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error('[Dashboard] Error boundary caught:', error);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6 text-center"
      role="alert"
    >
      <div className="w-12 h-12 rounded-full bg-status-error/10 flex items-center justify-center">
        <AlertCircle size={24} className="text-status-error" aria-hidden="true" />
      </div>

      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error.message ?? 'An unexpected error occurred loading the dashboard.'}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">Digest: {error.digest}</p>
        )}
      </div>

      <button
        id="dashboard-error-retry-btn"
        onClick={reset}
        className="flex items-center gap-1.5 h-8 px-4 rounded-md bg-bg-elevated border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Try again
      </button>
    </div>
  );
}
