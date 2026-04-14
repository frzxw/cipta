# API Common Package

`apps/api/src/common/**` is reserved for API-wide cross-cutting reusable concerns.

## Suggested Structure

```text
src/common/
|
|- constants/
|- decorators/
|- dto/
|- enums/
|- filters/
|- guards/
|- http/
|- interfaces/
|- interceptors/
|- pipes/
|- types/
|- validation/
```

## Use common for

- HTTP response envelope and request metadata (`timestamp`, `requestId`)
- Input normalization helpers reused by multiple DTOs
- Pagination helpers/types for list endpoints
- Error handling primitives (shared error codes/mappers, exception filter helpers)
- Logging/request context helpers (request-id extraction, log-safe context)
- Global guards/interceptors/filters/pipes reused across multiple modules

## Do not use common for

- Module/domain-specific business logic
- Feature-specific policies that belong to one module only

Keep domain logic in `apps/api/src/modules/**` and promote to `common` only when it is truly cross-cutting and reused.

## Current implementation

- `constants/app.constants.ts`
- `decorators/current-user.decorator.ts`
- `decorators/public.decorator.ts`
- `decorators/roles.decorator.ts`
- `dto/pagination.dto.ts`
- `enums/roles.enum.ts`
- `filters/http-exception.filter.ts`
- `guards/roles.guard.ts`
- `http/response-envelope.ts`
- `interfaces/api-response.interface.ts`
- `interfaces/paginated-result.interface.ts`
- `interceptors/logging.interceptor.ts`
- `interceptors/transform.interceptor.ts`
- `pipes/parse-object-id.pipe.ts`
- `pipes/validation.pipe.ts`
- `types/express.d.ts`
- `validation/normalizers.ts`

## Next candidates

- `errors/*` (shared API error mapping helpers and code mappers)
- `logging/*` (request context and structured logger adapters)
- `http/paginated-envelope.ts`
