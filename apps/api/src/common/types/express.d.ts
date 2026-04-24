import type { WorkspaceRole } from '@cipta/database';

declare global {
  namespace Express {
    interface User {
      id?: string;
      email?: string;
      role?: string;
      roles?: string[];
      workspaces?: {
        id: string;
        role: WorkspaceRole;
      }[];
    }

    interface Request {
      requestId?: string;
    }
  }
}

export {};
