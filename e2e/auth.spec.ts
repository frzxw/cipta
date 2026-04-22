import { expect, test, type Route } from '@playwright/test';

/**
 * Auth flow E2E tests.
 *
 * Playwright intercepts the Next.js proxy calls (/api/auth/*) so the tests do not
 * require the NestJS API to be running. This isolates the frontend contract.
 */

const loginOk = {
  success: true,
  data: {
    user: { id: 'usr_1', email: 'user@example.com', displayName: 'User' },
    workspace: { id: 'ws_1', name: 'User Workspace', slug: 'user-workspace', role: 'OWNER' },
  },
};

const registerOk = {
  success: true,
  data: {
    user: { id: 'usr_2', email: 'new@example.com', displayName: 'New User' },
    workspace: { id: 'ws_2', name: 'New Workspace', slug: 'new-workspace', role: 'OWNER' },
  },
};

test.describe('Authentication flow', () => {
  test('unauthenticated visit to dashboard redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /sign in to cipta/i })).toBeVisible();
  });

  test('login form shows validation errors for invalid input', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/enter a valid email/i)).toBeVisible();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test('successful login redirects to dashboard', async ({ page, context }) => {
    await context.route('**/api/auth/login', async (route: Route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'cipta_access=fake-access; Path=/; HttpOnly; SameSite=Lax',
        },
        body: JSON.stringify(loginOk),
      });
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('Password1!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('login surfaces API error message', async ({ page, context }) => {
    await context.route('**/api/auth/login', async (route: Route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { message: 'Invalid credentials' } }),
      });
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('Password1!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('alert')).toContainText(/invalid credentials/i);
  });

  test('register form validates password rules', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Display name').fill('Jane');
    await page.getByLabel('Email').fill('jane@example.com');
    await page.getByLabel('Password').fill('weakpass');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/uppercase/i)).toBeVisible();
  });

  test('successful registration redirects to dashboard', async ({ page, context }) => {
    await context.route('**/api/auth/register', async (route: Route) => {
      await route.fulfill({
        status: 201,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'cipta_access=fake-access; Path=/; HttpOnly; SameSite=Lax',
        },
        body: JSON.stringify(registerOk),
      });
    });

    await page.goto('/register');
    await page.getByLabel('Display name').fill('New User');
    await page.getByLabel('Email').fill('new@example.com');
    await page.getByLabel('Password').fill('Password1!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('cross-links between login and register work', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /create an account/i }).click();
    await expect(page).toHaveURL(/\/register$/);
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
