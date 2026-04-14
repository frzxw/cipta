import { randomUUID } from 'crypto';
import type { Request } from 'express';

interface ApiSuccessMeta {
  timestamp: string;
  requestId: string;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta: ApiSuccessMeta;
}

export function createSuccessEnvelope<T>(
  req: Request,
  data: T,
): ApiSuccessEnvelope<T> {
  const requestIdHeader = req.headers['x-request-id'];
  const requestId =
    typeof requestIdHeader === 'string' && requestIdHeader.length > 0
      ? requestIdHeader
      : randomUUID();

  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}
