'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@cipta/ui/alert';
import { Button } from '@cipta/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@cipta/ui/form';
import { Input } from '@cipta/ui/input';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginInput } from '../../../lib/auth/schemas';

interface LoginErrorResponse {
  success: false;
  error?: { message: string };
}

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  async function onSubmit(values: LoginInput): Promise<void> {
    setServerError(null);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as LoginErrorResponse | null;
      setServerError(payload?.error?.message ?? 'Unable to sign in. Try again.');
      return;
    }

    startTransition(() => {
      router.replace('/');
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" aria-label="Sign in">
        {serverError && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          id="login-submit-btn"
          type="submit"
          className="w-full"
          disabled={isPending || form.formState.isSubmitting}
        >
          {form.formState.isSubmitting || isPending ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </Form>
  );
}
