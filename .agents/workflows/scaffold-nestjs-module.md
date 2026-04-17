---
name: Scaffold NestJS Feature Module
description: >
  Create a new NestJS feature module with all boilerplate files: module, controller,
  service, DTOs, and unit test. Use when the user says "create a module", "scaffold
  a new feature", "add a new API module", or "new CRUD endpoint for <entity>".
---

# Scaffold NestJS Feature Module

Creates a complete NestJS feature module inside `apps/api/src/modules/`.

## Trigger

User asks to create a new API feature module or CRUD endpoints for an entity.

## Required Input

- **Module name** (e.g., `source`, `cluster`, `render-profile`)  
- **Entity name** (PascalCase, e.g., `Source`, `Cluster`, `RenderProfile`)  
- **CRUD operations needed** (create, findAll, findOne, update, delete)
- **Whether it dispatches BullMQ jobs** (yes/no)

## Steps

### 1. Create directory structure

Create the following directory under `apps/api/src/modules/{moduleName}/`:

```
{moduleName}/
├── {moduleName}.module.ts
├── {moduleName}.controller.ts
├── {moduleName}.service.ts
├── {moduleName}.service.spec.ts
└── dto/
    ├── create-{moduleName}.dto.ts
    └── update-{moduleName}.dto.ts
```

### 2. Generate module file

- Import and register the controller and service as providers.
- If it dispatches BullMQ jobs, register the queue via `BullModule.registerQueue({ name: QUEUE_NAMES.XXX })`.
- Import `PrismaService` or the database module.

### 3. Generate controller

- Use `@Controller('{kebab-case-plural}')` route prefix (e.g., `@Controller('render-profiles')`).
- Apply `@UseGuards(JwtAuthGuard)` at the class level.
- Use `@CurrentWorkspace() workspaceId: string` on every route handler.
- Follow REST conventions:
  - `POST /` → `create()` → 201
  - `GET /` → `findAll()` with `@Query()` pagination (page, limit, sortBy, sortOrder) → 200
  - `GET /:id` → `findOne()` → 200
  - `PATCH /:id` → `update()` → 200
  - `DELETE /:id` → `remove()` → 200
- Wrap all responses in the standard envelope: `{ success: true, data: ..., meta: { timestamp, requestId } }`.

### 4. Generate service

- Inject `PrismaService` (and BullMQ `Queue` if needed) via constructor.
- Every Prisma query **must** include `where: { workspaceId }`.
- For `findAll`: support pagination with `skip`, `take`, `orderBy`, and return `{ data, total }`.
- For `create`: validate uniqueness if needed, dispatch job if applicable.
- For `update`/`delete`: verify the record belongs to the workspace first.
- Throw `NotFoundException` when record not found, `ConflictException` for duplicates.

### 5. Generate DTOs

- Use `class-validator` decorators on every field.
- `CreateDto`: all required fields.
- `UpdateDto`: extend `PartialType(CreateDto)` from `@nestjs/mapped-types`.
- Set `whitelist: true` and `forbidNonWhitelisted: true` (handled by global pipe).

### 6. Generate unit test

- Use `Test.createTestingModule()` with mocked `PrismaService` and (if applicable) mocked queue.
- Test: create, findAll, findOne, update, remove.
- Verify workspace scoping is applied on every query.
- If BullMQ: verify `queue.add()` is called with correct payload.

### 7. Register module

Add the new module to the `imports` array in `apps/api/src/app.module.ts`.

### 8. Verify

// turbo
```
bash scripts/verify.sh build
```

## Expected Output

A fully scaffolded NestJS module with controller, service, DTOs, and passing unit test, registered in AppModule.
