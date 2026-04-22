import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './schemas';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'User@Example.com ',
      password: 'Password1!',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('rejects short passwords', () => {
    const result = loginSchema.safeParse({ email: 'a@b.co', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid emails', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'Password1!' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = {
    email: 'user@example.com',
    password: 'Password1!',
    displayName: 'Jane Doe',
  };

  it('accepts a valid registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('requires uppercase in password', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'password1!' }).success).toBe(false);
  });

  it('requires a number in password', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'Password!!' }).success).toBe(false);
  });

  it('requires a special character in password', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'Password123' }).success).toBe(false);
  });

  it('rejects short display names', () => {
    expect(registerSchema.safeParse({ ...valid, displayName: 'A' }).success).toBe(false);
  });

  it('rejects long display names', () => {
    expect(registerSchema.safeParse({ ...valid, displayName: 'a'.repeat(51) }).success).toBe(false);
  });
});
