# Cipta — Authentication & Authorization Specification

> **Module:** Auth  
> **Package:** `apps/api/src/modules/auth`  
> **PRD Feature:** F-009  
> **Last Updated:** 2026-04-11

---

## 1. Overview

Cipta uses **JWT-based authentication** with access/refresh token rotation. Authorization is role-based (RBAC) at the Workspace level.

---

## 2. Authentication Flow

### 2.1 Registration

```text
Client                        API                          Database
  │                            │                              │
  │ POST /auth/register        │                              │
  │ {email, password, name}    │                              │
  │ ──────────────────────────▶│                              │
  │                            │ Validate input (DTO)         │
  │                            │ Hash password (bcrypt, 12)   │
  │                            │ Create User ─────────────────▶
  │                            │ Create Workspace ────────────▶
  │                            │ Create WorkspaceMember ──────▶
  │                            │ Generate JWT pair             │
  │                            │ Store refresh token hash ────▶
  │ ◀──────────────────────────│                              │
  │ 201: {user, workspace,     │                              │
  │       tokens}              │                              │
```

### 2.2 Login

```text
Client                        API                          Database
  │                            │                              │
  │ POST /auth/login           │                              │
  │ {email, password}          │                              │
  │ ──────────────────────────▶│                              │
  │                            │ Find user by email ──────────▶
  │                            │ ◀── User record              │
  │                            │ bcrypt.compare(password)     │
  │                            │ Generate JWT pair            │
  │                            │ Store refresh token hash ────▶
  │ ◀──────────────────────────│                              │
  │ 200: {user, tokens}       │                              │
```

### 2.3 Token Refresh

```text
Client                        API                          Database
  │                            │                              │
  │ POST /auth/refresh         │                              │
  │ {refreshToken}             │                              │
  │ ──────────────────────────▶│                              │
  │                            │ Verify refresh JWT           │
  │                            │ Check hash in DB ────────────▶
  │                            │ ◀── Valid                     │
  │                            │ Invalidate old refresh ──────▶
  │                            │ Generate new pair            │
  │                            │ Store new refresh hash ──────▶
  │ ◀──────────────────────────│                              │
  │ 200: {accessToken,         │                              │
  │       refreshToken}        │                              │
```

---

## 3. JWT Configuration

### 3.1 Access Token

```typescript
{
  header: {
    alg: "HS256",
    typ: "JWT"
  },
  payload: {
    sub: "usr_abc123",           // User ID
    email: "user@example.com",
    workspaces: [
      {
        id: "ws_def456",
        role: "OWNER"
      }
    ],
    iat: 1712822400,
    exp: 1712823300              // 15 minutes
  }
}
```

| Property  | Value                                              |
| --------- | -------------------------------------------------- |
| Algorithm | HS256                                              |
| Expiry    | 15 minutes                                         |
| Secret    | `JWT_ACCESS_SECRET` (env variable, 256-bit random) |
| Contains  | User ID, email, workspace memberships              |

### 3.2 Refresh Token

```typescript
{
  payload: {
    sub: "usr_abc123",
    jti: "rt_unique_id_123",     // Unique token ID for revocation
    family: "family_id_123",     // Token family for rotation detection
    iat: 1712822400,
    exp: 1713427200              // 7 days
  }
}
```

| Property  | Value                                               |
| --------- | --------------------------------------------------- |
| Algorithm | HS256                                               |
| Expiry    | 7 days                                              |
| Secret    | `JWT_REFRESH_SECRET` (different from access secret) |
| Contains  | User ID, unique token ID, token family ID           |

### 3.3 Token Family (Rotation Detection)

All refresh tokens derived from the same login session share a `family` ID. If a used (rotated-out) refresh token is replayed:

1. Assume token theft
2. Invalidate ALL tokens in the family
3. Force re-authentication

```typescript
async refreshToken(oldRefreshToken: string) {
  const payload = this.jwtService.verify(oldRefreshToken);

  const storedToken = await this.prisma.refreshToken.findUnique({
    where: { jti: payload.jti },
  });

  if (!storedToken) {
    // Token was already used — potential theft!
    await this.prisma.refreshToken.deleteMany({
      where: { family: payload.family },
    });
    throw new UnauthorizedException('Token reuse detected. Please log in again.');
  }

  // Invalidate old token
  await this.prisma.refreshToken.delete({ where: { jti: payload.jti } });

  // Issue new pair with same family
  return this.generateTokenPair(payload.sub, payload.family);
}
```

---

## 4. Password Security

| Property    | Value                                      |
| ----------- | ------------------------------------------ |
| Hashing     | bcrypt                                     |
| Salt rounds | 12                                         |
| Min length  | 8 characters                               |
| Complexity  | 1 uppercase, 1 number, 1 special character |

```typescript
// Registration
const passwordHash = await bcrypt.hash(dto.password, 12);

// Login
const isValid = await bcrypt.compare(dto.password, user.passwordHash);
```

---

## 5. Authorization (RBAC)

### 5.1 Workspace Roles

| Role       | Permissions                                                    |
| ---------- | -------------------------------------------------------------- |
| **OWNER**  | Full access. Manage members, billing, delete workspace         |
| **ADMIN**  | Full access to content pipeline. Manage members (not billing)  |
| **MEMBER** | Read/write content pipeline. Cannot manage members or settings |

### 5.2 Permission Matrix

| Action                 | OWNER | ADMIN | MEMBER |
| ---------------------- | ----- | ----- | ------ |
| View dashboard         | ✅    | ✅    | ✅     |
| Ingest sources         | ✅    | ✅    | ✅     |
| Manage render profiles | ✅    | ✅    | ✅     |
| Trigger renders        | ✅    | ✅    | ✅     |
| Distribute content     | ✅    | ✅    | ✅     |
| Connect accounts       | ✅    | ✅    | ❌     |
| Manage clusters        | ✅    | ✅    | ❌     |
| Invite members         | ✅    | ✅    | ❌     |
| Remove members         | ✅    | ✅    | ❌     |
| Change member roles    | ✅    | ❌    | ❌     |
| Workspace settings     | ✅    | ❌    | ❌     |
| Delete workspace       | ✅    | ❌    | ❌     |

### 5.3 Guard Implementation

```typescript
// apps/api/src/common/guards/roles.guard.ts

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const workspaceId = request.headers['x-workspace-id'] || user.defaultWorkspaceId;

    const membership = user.workspaces.find(
      (ws: any) => ws.id === workspaceId,
    );

    if (!membership) return false;

    return requiredRoles.includes(membership.role);
  }
}

// Usage:
@Roles('OWNER', 'ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
@Post('members')
async inviteMember(@Body() dto: InviteMemberDto) { ... }
```

---

## 6. Workspace Scoping

Every request to a resource endpoint must be scoped to a workspace:

### 6.1 Workspace Resolution

```typescript
// apps/api/src/modules/auth/decorators/workspace-scope.decorator.ts

export const WorkspaceScope = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkspaceScopeContext => {
    const request = ctx.switchToHttp().getRequest();

    // Priority: Header > Default workspace
    const workspaceId =
      request.headers['x-workspace-id'] ||
      request.user.workspaces[0]?.id;

    if (!workspaceId) {
      throw new ForbiddenException('No workspace context');
    }

    // Verify user belongs to this workspace
    const membership = request.user.workspaces.find(
      (ws: any) => ws.id === workspaceId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    return {
      workspaceId,
      role: membership.role,
    };
  },
);

// Usage in controllers:
@Get()
async findAll(@WorkspaceScope() scope: WorkspaceScopeContext) {
  return this.sourceService.findAll(scope.workspaceId);
}
```

---

## 7. Rate Limiting

```typescript
// apps/api/src/app.module.ts

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,     // 1 second
        limit: 3,       // Max 3 req/sec
      },
      {
        name: 'medium',
        ttl: 60000,    // 1 minute
        limit: 100,     // Max 100 req/min
      },
      {
        name: 'long',
        ttl: 3600000,  // 1 hour
        limit: 1000,    // Max 1000 req/hour
      },
    ]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
```

### Auth-Specific Limits

```typescript
// apps/api/src/modules/auth/auth.controller.ts

@Throttle({ short: { limit: 1, ttl: 1000 }, medium: { limit: 10, ttl: 60000 } })
@Post('login')
async login(@Body() dto: LoginDto) { ... }

@Throttle({ short: { limit: 1, ttl: 1000 }, medium: { limit: 5, ttl: 60000 } })
@Post('register')
async register(@Body() dto: RegisterDto) { ... }
```

---

## 8. Security Headers

Applied via NestJS middleware or Helmet:

```typescript
import helmet from 'helmet';

app.use(helmet());
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id', 'X-Request-Id'],
});
```

---

## 9. Refresh Token Storage

Refresh tokens are stored as hashed values in a dedicated table (or within the User model):

```prisma
model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  jti       String   @unique          // JWT token ID
  family    String                     // Token family for rotation detection
  hash      String                     // bcrypt hash of the actual token
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([family])
  @@map("refresh_tokens")
}
```

> **Note:** This model should be added to the ERD schema in `ERD.md` when implementing auth.

---

## 10. Testing

### 10.1 Unit Tests

| Test                            | File                           |
| ------------------------------- | ------------------------------ |
| Password hashing and comparison | `auth.service.spec.ts`         |
| JWT generation and verification | `auth.service.spec.ts`         |
| Token family rotation detection | `auth.service.spec.ts`         |
| Role guard logic                | `roles.guard.spec.ts`          |
| Workspace resolution utility    | `workspace-scope.util.spec.ts` |

### 10.2 Integration Tests

| Test                                                       | File               |
| ---------------------------------------------------------- | ------------------ |
| Register → receive tokens                                  | `auth.e2e-spec.ts` |
| Login with valid credentials → 200                         | `auth.e2e-spec.ts` |
| Login with invalid password → 401                          | `auth.e2e-spec.ts` |
| Access protected route without token → 401                 | `auth.e2e-spec.ts` |
| Access protected route with expired token → 401            | `auth.e2e-spec.ts` |
| Refresh token rotation → new tokens                        | `auth.e2e-spec.ts` |
| Reuse of rotated refresh token → 401 + family invalidation | `auth.e2e-spec.ts` |
| MEMBER cannot access ADMIN endpoint → 403                  | `auth.e2e-spec.ts` |
| Rate limiting on login → 429 after 10 attempts             | `auth.e2e-spec.ts` |
