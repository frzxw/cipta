export const REQUEST_ID_HEADER = 'x-request-id';
export const WORKSPACE_ID_HEADER = 'x-workspace-id';

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  maxLimit: 100,
  sortBy: 'createdAt',
  sortOrder: 'desc',
} as const;
