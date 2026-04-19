import type { Metadata } from 'next';
import { Download } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sources',
  description: 'Manage and ingest video sources for the Cipta pipeline.',
};

export default function SourcesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Download size={22} className="text-brand-primary" aria-hidden="true" />
            Sources
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ingest and manage video sources</p>
        </div>

        <button
          id="add-source-btn"
          className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download size={13} aria-hidden="true" />
          Add Source
        </button>
      </div>

      {/* Table placeholder */}
      <div className="rounded-lg bg-bg-surface border border-border overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
          <Download size={32} className="text-muted-foreground/30" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">No sources yet</p>
          <p className="text-xs text-muted-foreground/60 max-w-xs">
            Add a YouTube, TikTok, or direct URL to start the ingestion pipeline.
          </p>
        </div>
      </div>
    </div>
  );
}
