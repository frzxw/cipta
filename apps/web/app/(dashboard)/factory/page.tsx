import type { Metadata } from 'next';
import { Scissors } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Factory',
  description: 'Manage the chunk rendering queue and active render jobs.',
};

export default function FactoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Scissors size={22} className="text-brand-secondary" aria-hidden="true" />
          Factory
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Chunk rendering queue and production jobs
        </p>
      </div>

      <div className="rounded-lg bg-bg-surface border border-border overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
          <Scissors size={32} className="text-muted-foreground/30" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">Render queue empty</p>
          <p className="text-xs text-muted-foreground/60 max-w-xs">
            Chunks ready for rendering will appear here once sources are processed.
          </p>
        </div>
      </div>
    </div>
  );
}
