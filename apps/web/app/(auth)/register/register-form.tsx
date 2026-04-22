'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@cipta/ui/alert';
import { Button } from '@cipta/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@cipta/ui/form';
import { Input } from '@cipta/ui/input';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { registerSchema, type RegisterInput } from '../../../lib/auth/schemas';

interface RegisterErrorResponse {
  success: false;
  error?: { message: string };
}

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', displayName: '' },
    mode: 'onBlur',
  });

  async function onSubmit(values: RegisterInput): Promise<void> {
    setServerError(null);
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as RegisterErrorResponse | null;
      setServerError(payload?.error?.message ?? 'Unable to create account. Try again.');
      return;
    }

    startTransition(() => {
      router.replace('/');
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3"
        aria-label="Create account"
      >
        {serverError && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Jane Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Min 8 chars — must include uppercase, number, special character.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          id="register-submit-btn"
          type="submit"
          className="w-full"
          disabled={isPending || form.formState.isSubmitting}
        >
          {form.formState.isSubmitting || isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </Form>
  );
}
