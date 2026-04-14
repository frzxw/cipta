import { ForbiddenException } from '@nestjs/common';
import { WorkspaceRole } from '@cipta/database';
import { resolveWorkspaceScope } from './workspace-scope.util';

describe('resolveWorkspaceScope', () => {
  const user = {
    id: 'usr_1',
    email: 'user@example.com',
    workspaces: [
      { id: 'ws_owner', role: WorkspaceRole.OWNER },
      { id: 'ws_member', role: WorkspaceRole.MEMBER },
    ],
  };

  it('uses workspace from header when user belongs to workspace', () => {
    const scope = resolveWorkspaceScope({
      workspaceHeader: 'ws_member',
      user,
    });

    expect(scope).toEqual({
      workspaceId: 'ws_member',
      role: WorkspaceRole.MEMBER,
    });
  });

  it('falls back to first workspace when header is missing', () => {
    const scope = resolveWorkspaceScope({
      workspaceHeader: undefined,
      user,
    });

    expect(scope).toEqual({
      workspaceId: 'ws_owner',
      role: WorkspaceRole.OWNER,
    });
  });

  it('throws when header workspace is not member workspace', () => {
    expect(() =>
      resolveWorkspaceScope({
        workspaceHeader: 'ws_unknown',
        user,
      }),
    ).toThrow(ForbiddenException);
  });

  it('throws when no workspace context exists', () => {
    expect(() =>
      resolveWorkspaceScope({
        workspaceHeader: undefined,
        user: {
          id: 'usr_2',
          email: 'empty@example.com',
          workspaces: [],
        },
      }),
    ).toThrow(ForbiddenException);
  });
});
