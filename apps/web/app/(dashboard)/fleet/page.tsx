import type { Metadata } from 'next';
import { Send } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Fleet',
  description: 'Manage your social media account fleet and distribution clusters.',
};

export default function FleetPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Send size={22} className="text-status-info" aria-hidden="true" />
          Fleet
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Account fleet and distribution cluster management
        </p>
      </div>

      <div className="rounded-lg bg-bg-surface border border-border overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
          <Send size={32} className="text-muted-foreground/30" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">No accounts connected</p>
          <p className="text-xs text-muted-foreground/60 max-w-xs">
            Connect social media accounts to configure distribution clusters.
          </p>
        </div>
      </div>
    </div>
  );
}
