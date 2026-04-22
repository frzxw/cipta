// Server-only env accessors. Validate on read; fail fast in dev.

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getApiBaseUrl(): string {
  // Default matches apps/api default port + /v1 prefix from docs/API.md.
  return required('API_BASE_URL', 'http://localhost:3001/v1').replace(/\/$/, '');
}
