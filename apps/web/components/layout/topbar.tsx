'use client';

import { useState } from 'react';
import { Bell, Menu, Search } from 'lucide-react';

interface TopbarProps {
  onMobileMenuOpen?: () => void;
}

export function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header
      id="topbar"
      className="sticky top-0 z-30 flex items-center h-12 px-3 gap-3 bg-bg-surface border-b border-border shrink-0"
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuOpen}
        className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open navigation"
        aria-controls="sidebar"
      >
        <Menu size={18} />
      </button>

      {/* Search bar */}
      <div
        className={[
          'flex items-center gap-2 flex-1 max-w-sm h-7 px-2.5 rounded-md',
          'bg-bg-elevated border transition-all duration-150',
          searchFocused ? 'border-brand-primary/60 ring-1 ring-brand-primary/30' : 'border-border',
        ].join(' ')}
      >
        <Search size={13} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          id="global-search"
          type="search"
          placeholder="Search… (⌘K)"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none min-w-0"
          onFocus={() => {
            setSearchFocused(true);
          }}
          onBlur={() => {
            setSearchFocused(false);
          }}
          aria-label="Global search"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 ml-auto shrink-0">
        {/* Notifications */}
        <button
          id="notifications-btn"
          className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {/* Unread dot */}
          <span
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-primary"
            aria-hidden="true"
          />
        </button>

        {/* Workspace pill */}
        <button
          id="workspace-switcher"
          className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Switch workspace"
        >
          <span className="w-2 h-2 rounded-full bg-brand-accent" aria-hidden="true" />
          <span className="truncate max-w-[100px]">My Workspace</span>
        </button>

        {/* Avatar */}
        <button
          id="user-menu-btn"
          className="w-7 h-7 rounded-full bg-brand-secondary/20 border border-brand-secondary/30 flex items-center justify-center text-[11px] font-semibold text-brand-secondary hover:bg-brand-secondary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="User menu"
        >
          U
        </button>
      </div>
    </header>
  );
}
