import type { Metadata } from 'next';
import { Activity, Download, Film, LayoutDashboard, Scissors, Send, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Cipta Control Tower — pipeline overview, active jobs, and recent activity.',
};

interface StatCard {
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  icon: React.ElementType;
  color: string;
}

const STAT_CARDS: StatCard[] = [
  {
    label: 'Sources today',
    value: '—',
    icon: Download,
    color: 'text-brand-primary',
  },
  {
    label: 'Chunks generated',
    value: '—',
    icon: Scissors,
    color: 'text-brand-secondary',
  },
  {
    label: 'Assets ready',
    value: '—',
    icon: Film,
    color: 'text-brand-accent',
  },
  {
    label: 'Distributions sent',
    value: '—',
    icon: Send,
    color: 'text-status-success',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard size={22} className="text-brand-primary" aria-hidden="true" />
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pipeline overview</p>
        </div>

        {/* Quick action */}
        <a
          href="/sources"
          id="new-source-btn"
          className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download size={13} aria-hidden="true" />
          New Source
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-lg bg-bg-surface border border-border p-4 flex flex-col gap-3 hover:-translate-y-0.5 hover:border-border/80 transition-all duration-150"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                <Icon size={15} className={card.color} aria-hidden="true" />
              </div>
              <span className="text-2xl font-bold text-foreground tabular-nums">{card.value}</span>
            </div>
          );
        })}
      </div>

      {/* Active jobs placeholder */}
      <div className="rounded-lg bg-bg-surface border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={15} className="text-brand-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">Active Jobs</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <Zap size={24} className="text-muted-foreground/40" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No active jobs</p>
          <p className="text-xs text-muted-foreground/60">Add a source to start the pipeline</p>
        </div>
      </div>
    </div>
  );
}
