import type { Metadata } from 'next';
import { Logo } from '../../../components/layout/logo';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Cipta Control Tower.',
};

/**
 * Login page — Server Component scaffold.
 * Interactive parts (form submission) will be extracted to a Client Component when auth is wired.
 */
export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-2">
        <Logo />
        <p className="text-xs text-muted-foreground">Control Tower</p>
      </div>

      {/* Card */}
      <div className="rounded-xl bg-bg-surface border border-border p-6 space-y-4 shadow-xl shadow-black/30">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground text-center">Sign in to Cipta</h1>
          <p className="text-xs text-muted-foreground text-center">
            Enter your credentials to access the Control Tower
          </p>
        </div>

        {/* Form placeholder */}
        <form className="space-y-3" aria-label="Login form">
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              className="w-full h-9 px-3 rounded-md bg-bg-elevated border border-border text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-brand-primary/60 focus:ring-1 focus:ring-brand-primary/30 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              className="w-full h-9 px-3 rounded-md bg-bg-elevated border border-border text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-brand-primary/60 focus:ring-1 focus:ring-brand-primary/30 transition-all"
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="w-full h-9 rounded-md bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign In
          </button>
        </form>
      </div>

      <p className="text-center text-[11px] text-muted-foreground/60">
        © 2026 Cipta. All rights reserved.
      </p>
    </div>
  );
}
