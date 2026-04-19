import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Sign In',
    template: '%s | Cipta',
  },
};

/**
 * Auth layout — centered, no sidebar, pure dark bg.
 * Server Component.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}
