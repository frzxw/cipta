'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function SourcesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Sources] Error boundary caught:', error);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center"
      role="alert"
    >
      <AlertCircle size={28} className="text-status-error" aria-hidden="true" />
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Failed to load sources</h2>
        <p className="text-xs text-muted-foreground">{error.message}</p>
      </div>
      <button
        id="sources-error-retry-btn"
        onClick={reset}
        className="h-8 px-4 rounded-md bg-bg-elevated border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Try again
      </button>
    </div>
  );
}
