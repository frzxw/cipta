import type { Metadata } from 'next';
import { Settings } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Workspace settings, members, API keys, and configuration.',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings size={22} className="text-muted-foreground" aria-hidden="true" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Workspace configuration and account settings
        </p>
      </div>

      <div className="rounded-lg bg-bg-surface border border-border p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['Workspace', 'Members', 'API Keys', 'Notifications'] as const).map((section) => (
            <div
              key={section}
              className="rounded-md bg-bg-elevated border border-border p-4 space-y-1 hover:border-border/80 transition-colors cursor-pointer"
            >
              <p className="text-sm font-medium text-foreground">{section}</p>
              <p className="text-xs text-muted-foreground">Configure {section.toLowerCase()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
