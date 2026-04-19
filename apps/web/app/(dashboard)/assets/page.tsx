import type { Metadata } from 'next';
import { Film } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Assets',
  description: 'Browse and manage rendered video assets.',
};

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Film size={22} className="text-brand-accent" aria-hidden="true" />
          Assets
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Rendered video assets ready for distribution
        </p>
      </div>

      <div className="rounded-lg bg-bg-surface border border-border overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
          <Film size={32} className="text-muted-foreground/30" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">No assets yet</p>
          <p className="text-xs text-muted-foreground/60 max-w-xs">
            Assets will appear here after chunks are rendered by the Factory.
          </p>
        </div>
      </div>
    </div>
  );
}
