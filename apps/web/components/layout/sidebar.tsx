'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  LayoutDashboard,
  Scissors,
  Send,
  Settings,
  X,
} from 'lucide-react';
import { Logo } from './logo';

// ── Nav items ────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Sources', href: '/sources', icon: Download },
  { label: 'Factory', href: '/factory', icon: Scissors },
  { label: 'Assets', href: '/assets', icon: Film },
  { label: 'Fleet', href: '/fleet', icon: Send },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

// ── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  /** Controlled by the parent (mobile overlay open state) */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      {/* ── Mobile backdrop ───────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          aria-hidden="true"
          onClick={onMobileClose}
        />
      )}

      {/* ── Sidebar panel ────────────────────────────────────────────── */}
      <aside
        id="sidebar"
        aria-label="Main navigation"
        className={[
          // Base
          'fixed md:sticky top-0 left-0 z-50 md:z-auto',
          'flex flex-col h-screen',
          'bg-bg-surface border-r border-border',
          'transition-all duration-200 ease-in-out',
          // Width
          collapsed ? 'w-[60px]' : 'w-[240px]',
          // Mobile: slide in/out
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Logo row */}
        <div
          className={[
            'flex items-center h-12 border-b border-border px-3 shrink-0',
            collapsed ? 'justify-center' : 'justify-between',
          ].join(' ')}
        >
          <Logo collapsed={collapsed} />

          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>

          {/* Desktop collapse toggle */}
          {!collapsed && (
            <button
              onClick={() => {
                setCollapsed(true);
              }}
              className="hidden md:flex p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="Sidebar navigation">
          <ul className="flex flex-col gap-0.5" role="list">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={[
                      'flex items-center gap-3 px-2 py-2 rounded-md',
                      'text-sm font-medium transition-all duration-150 ease-out',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      collapsed ? 'justify-center' : '',
                      active
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                    ].join(' ')}
                  >
                    <Icon size={16} className="shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Expand button (collapsed state only, desktop) */}
        {collapsed && (
          <div className="hidden md:flex justify-center py-3 border-t border-border shrink-0">
            <button
              onClick={() => {
                setCollapsed(false);
              }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Version chip */}
        {!collapsed && (
          <div className="px-3 py-3 border-t border-border shrink-0">
            <span className="text-[10px] font-medium text-muted-foreground/50 tracking-wider uppercase">
              v0.1.0-alpha
            </span>
          </div>
        )}
      </aside>
    </>
  );
}
