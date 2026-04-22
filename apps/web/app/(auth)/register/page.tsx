import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '../../../components/layout/logo';
import { RegisterForm } from './register-form';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create your Cipta Control Tower account.',
};

export default function RegisterPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-2">
        <Logo />
        <p className="text-xs text-muted-foreground">Control Tower</p>
      </div>

      <div className="rounded-xl bg-bg-surface border border-border p-6 space-y-4 shadow-xl shadow-black/30">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground text-center">Create your account</h1>
          <p className="text-xs text-muted-foreground text-center">
            Spin up a workspace and start producing
          </p>
        </div>

        <RegisterForm />

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-brand-primary hover:underline focus-visible:outline-none focus-visible:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-center text-[11px] text-muted-foreground/60">
        © 2026 Cipta. All rights reserved.
      </p>
    </div>
  );
}
