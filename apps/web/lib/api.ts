import ky from 'ky';
import { getApiBaseUrl } from '@/lib/env';

/**
 * Shared API client instance.
 * Decoupled from React to allow usage in Server Components and middleware.
 */
export const api = ky.create({
  prefix: typeof window === 'undefined' ? getApiBaseUrl() : '/api/proxy',
  timeout: 30000,
  hooks: {
    beforeRequest: [
      () => {
        // Bearer token handled by:
        // 1. Next.js middleware/proxy for Client side
        // 2. Manual injection for Server side if needed
      },
    ],
  },
});
