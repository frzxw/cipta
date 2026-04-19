import type { Metadata } from 'next';
import { DashboardShell } from '../../components/layout/dashboard-shell';

export const metadata: Metadata = {
  title: {
    default: 'Control Tower',
    template: '%s | Cipta',
  },
};

/**
 * Dashboard layout — wraps all routes inside (dashboard)/ with the
 * Sidebar + Topbar shell.
 *
 * Server Component: metadata export + no interactivity needed here.
 * Mobile toggle state lives inside the client DashboardShell.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
