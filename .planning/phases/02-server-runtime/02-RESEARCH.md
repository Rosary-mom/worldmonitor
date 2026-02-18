# Phase 2B: Server Runtime - Research

**Researched:** 2026-02-18
**Domain:** Vercel Edge Functions, TypeScript server routing, CORS middleware, USGS API proxying
**Confidence:** HIGH

## Summary

Phase 2B builds the shared server infrastructure that all 17 domain handlers will use, then validates the full pipeline end-to-end with the seismology handler. The architecture is straightforward: generated `createXxxServiceRoutes()` functions produce `RouteDescriptor[]` arrays, a thin router matches incoming requests, CORS middleware wraps responses, and an error mapper handles handler exceptions. The whole thing is deployed as a Vercel catch-all function at `api/[[...path]].ts`.

The codebase already has all the necessary patterns established. The existing `api/_cors.js` provides the exact CORS logic to port. The existing `api/earthquakes.js` shows the USGS proxy pattern. The generated `service_server.ts` files provide the handler interfaces, error classes (`ValidationError`, `ApiError`), `ServerOptions` (with `onError` callback), and `RouteDescriptor` shape. No new libraries are needed -- this is pure TypeScript with Web Standard APIs (Request/Response).

The critical insight is that Vercel's file-based routing gives specific files (like `api/earthquakes.js`) priority over catch-all files (`api/[[...path]].ts`), so existing legacy endpoints will keep working unchanged. The new catch-all only handles paths that match `/api/{domain}/v1/*` patterns.

**Primary recommendation:** Keep it minimal. The router is a simple Map lookup. The CORS module is a direct TypeScript port of `_cors.js`. The error mapper is ~30 lines. The catch-all gateway imports all 17 `createXxxServiceRoutes()` and flattens them into one route table. No frameworks, no middleware chains, no abstractions beyond what the generated code already provides.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SERVER-01 | TypeScript server handler interfaces generated for all 17 domains via protoc-gen-ts-server | Already complete from Phase 2A. All 17 `service_server.ts` files exist with handler interfaces and `createXxxServiceRoutes()` functions. No work needed. |
| SERVER-02 | Handler implementations for each domain that proxy requests to upstream external APIs | Phase 2B implements only the seismology handler as proof-of-concept. Remaining 16 handlers are Phase 2C-2S. See "Seismology Handler" section for USGS API shape and transformation logic. |
| SERVER-03 | Vite dev server plugin that mounts generated RouteDescriptor[] for local development | Vite plugin in `vite.config.ts` can intercept `/api/*/v1/*` paths. See "Vite Dev Server Plugin" section. Existing proxy config for `/api/earthquake` stays, new plugin handles sebuf paths only. |
| SERVER-04 | Vercel catch-all edge function that mounts generated RouteDescriptor[] for production deployment | `api/[[...path]].ts` with `export const config = { runtime: 'edge' }`. Vercel gives priority to specific files over catch-all, so existing `api/*.js` keep working. See "Vercel Catch-All Gateway" section. |
| SERVER-05 | Tauri sidecar adapter that mounts generated RouteDescriptor[] for desktop deployment | The existing sidecar (`src-tauri/sidecar/local-api-server.mjs`) already discovers `api/` files via `buildRouteTable()` and supports catch-all `[[...path]]` routing. It will automatically pick up the new catch-all file. No sidecar changes needed for 2B. See "Tauri Sidecar Compatibility" section. |
| SERVER-06 | Server handlers preserve existing CORS, rate limiting, and caching patterns from current api/*.js edge functions | CORS is ported from `api/_cors.js`. Rate limiting and caching are per-handler concerns (not shared infrastructure) and will be addressed per-domain in Phase 2C-2S. The seismology handler uses HTTP Cache-Control headers matching the existing `api/earthquakes.js` pattern. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.7.2 | Type safety for server code | Already in project devDependencies |
| Web Standard APIs | N/A | Request/Response for all handler I/O | Vercel edge runtime, Vite, and Tauri sidecar all use web standard Request/Response |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | - | No additional dependencies needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written router | Hono/itty-router | Adds a dependency for ~20 lines of code; generated routes are all POST with static paths, so a simple Map suffices |
| Hand-written CORS | @vercel/functions CORS helpers | Existing `_cors.js` has exact business logic we need; importing a library adds complexity without benefit |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
api/
  server/
    router.ts              # Route matching from RouteDescriptor[]
    cors.ts                # CORS middleware (ported from _cors.js)
    error-mapper.ts        # Error -> HTTP response mapping
    worldmonitor/
      seismology/v1/
        handler.ts         # SeismologyServiceHandler implementation
  [[...path]].ts           # Vercel catch-all gateway
  earthquakes.js           # Existing (keeps working, higher priority)
  _cors.js                 # Existing (legacy, kept for old api/*.js)
src/
  generated/
    server/
      worldmonitor/
        seismology/v1/
          service_server.ts   # Generated: handler interface + createRoutes()
        conflict/v1/
          service_server.ts   # Generated: handler interface + createRoutes()
        ... (17 total)
```

### Pattern 1: Route Table as a Map (Router)
**What:** Build a `Map<string, (req: Request) => Promise<Response>>` from all `RouteDescriptor[]` arrays. Key is `"POST /api/seismology/v1/list-earthquakes"`. All sebuf routes are static POST paths, so no dynamic segments or regex matching needed.
**When to use:** Always -- this is the core routing mechanism.
**Example:**
```typescript
// api/server/router.ts
import type { RouteDescriptor } from '../../src/generated/server/worldmonitor/seismology/v1/service_server';

export function createRouter(allRoutes: RouteDescriptor[]): {
  match(req: Request): ((req: Request) => Promise<Response>) | null;
} {
  const table = new Map<string, (req: Request) => Promise<Response>>();
  for (const route of allRoutes) {
    const key = `${route.method} ${route.path}`;
    table.set(key, route.handler);
  }

  return {
    match(req: Request) {
      const url = new URL(req.url);
      const key = `${req.method} ${url.pathname}`;
      return table.get(key) ?? null;
    },
  };
}
```

### Pattern 2: CORS Wrapping (Middleware)
**What:** Apply CORS headers to every response from the catch-all gateway, including OPTIONS preflight. Port logic verbatim from `api/_cors.js`.
**When to use:** Every request through the catch-all.
**Example:**
```typescript
// api/server/cors.ts
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/(.*\.)?worldmonitor\.app$/,
  /^https:\/\/worldmonitor-[a-z0-9-]+-elie-habib-projects\.vercel\.app$/,
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https?:\/\/tauri\.localhost(:\d+)?$/,
  /^https?:\/\/[a-z0-9-]+\.tauri\.localhost(:\d+)?$/i,
  /^tauri:\/\/localhost$/,
  /^asset:\/\/localhost$/,
];

function isAllowedOrigin(origin: string): boolean {
  return Boolean(origin) && ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin));
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = isAllowedOrigin(origin) ? origin : 'https://worldmonitor.app';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function isDisallowedOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  return !isAllowedOrigin(origin);
}
```

### Pattern 3: Error Mapper (onError callback)
**What:** The generated `createXxxServiceRoutes()` accepts `ServerOptions` with an `onError` callback. When a handler throws, the generated code calls `onError(error, req)` to produce the HTTP response. The error mapper maps known error types to appropriate HTTP status codes.
**When to use:** Passed as `options.onError` to every `createXxxServiceRoutes()` call.
**Example:**
```typescript
// api/server/error-mapper.ts
import type { ApiError, ValidationError } from '../../src/generated/server/worldmonitor/seismology/v1/service_server';

export function mapErrorToResponse(error: unknown, req: Request): Response {
  // ApiError from upstream proxy failures
  if (error instanceof Error && 'statusCode' in error) {
    const apiErr = error as ApiError;
    return new Response(JSON.stringify({ message: apiErr.message }), {
      status: apiErr.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Generic error
  const message = error instanceof Error ? error.message : 'Internal server error';
  return new Response(JSON.stringify({ message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Pattern 4: Vercel Catch-All Gateway
**What:** Single entry point that imports all service route creators, builds the route table, and dispatches requests. Uses `export const config = { runtime: 'edge' }` for Vercel.
**When to use:** This is the production gateway.
**Example:**
```typescript
// api/[[...path]].ts
import { createRouter } from './server/router';
import { getCorsHeaders, isDisallowedOrigin } from './server/cors';
import { mapErrorToResponse } from './server/error-mapper';
import { createSeismologyServiceRoutes } from '../src/generated/server/worldmonitor/seismology/v1/service_server';
import { seismologyHandler } from './server/worldmonitor/seismology/v1/handler';
// ... import all 17 createXxxServiceRoutes + handlers

export const config = { runtime: 'edge' };

const serverOptions = { onError: mapErrorToResponse };

const allRoutes = [
  ...createSeismologyServiceRoutes(seismologyHandler, serverOptions),
  // ... remaining domains added as handlers are implemented
];

const router = createRouter(allRoutes);

export default async function handler(request: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(request);

  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Origin check
  if (isDisallowedOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Route matching
  const matchedHandler = router.match(request);
  if (!matchedHandler) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Execute handler, merge CORS headers into response
  const response = await matchedHandler(request);
  const mergedHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    mergedHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: mergedHeaders,
  });
}
```

### Pattern 5: Handler Implementation (Seismology)
**What:** Implements the `SeismologyServiceHandler` interface by fetching the USGS GeoJSON API and transforming the response to the proto-shaped `ListEarthquakesResponse`.
**When to use:** First handler to validate the full pipeline.
**Example:**
```typescript
// api/server/worldmonitor/seismology/v1/handler.ts
import type { SeismologyServiceHandler, ServerContext, ListEarthquakesRequest, ListEarthquakesResponse } from '../../../../src/generated/server/worldmonitor/seismology/v1/service_server';

export const seismologyHandler: SeismologyServiceHandler = {
  async listEarthquakes(
    ctx: ServerContext,
    req: ListEarthquakesRequest,
  ): Promise<ListEarthquakesResponse> {
    const response = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
      { headers: { Accept: 'application/json' } },
    );

    if (!response.ok) {
      throw new Error(`USGS API error: ${response.status}`);
    }

    const geojson = await response.json();
    const features = geojson.features || [];

    const earthquakes = features.map((f: any) => ({
      id: f.id,
      place: f.properties.place || '',
      magnitude: f.properties.mag ?? 0,
      depthKm: f.geometry.coordinates[2] ?? 0,
      location: {
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
      },
      occurredAt: String(f.properties.time), // int64 -> string in generated TS
      sourceUrl: f.properties.url || '',
    }));

    return { earthquakes, pagination: undefined };
  },
};
```

### Anti-Patterns to Avoid
- **Building a middleware chain framework:** The generated code already handles request parsing, validation, and response serialization. The only "middleware" needed is CORS header injection. Don't build a generic middleware system.
- **Importing Node.js APIs in edge functions:** Vercel Edge Runtime has limited API surface. Stick to Web Standard APIs (fetch, Request, Response, URL, Headers). No `fs`, `path`, `http`, `Buffer`.
- **Re-exporting types from generated code:** The generated `service_server.ts` files each define their own `RouteDescriptor`, `ServerOptions`, `ValidationError`, etc. They are structurally identical but separate types. Import from one canonical location (e.g., the seismology server) or define shared types in `api/server/types.ts`.
- **Dynamic imports in the catch-all:** All handler imports must be static at the top of `api/[[...path]].ts`. Dynamic imports would break the edge runtime's bundling.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request parsing | Body extraction, JSON deserialization | Generated `createXxxServiceRoutes()` | Already handles `req.json()`, type casting, validation dispatch |
| Response serialization | Custom JSON serialization | Generated route handler | Already `JSON.stringify(result)` with correct status and Content-Type |
| Validation | Input validation logic | Generated `validateRequest` callback + `ValidationError` | Generated code handles 400 response with violations array |
| Path matching | Regex-based path matching | Simple Map lookup on `"METHOD /path"` | All sebuf routes are static POST paths, no wildcards or params |

**Key insight:** The generated `service_server.ts` code does most of the heavy lifting. Each `createXxxServiceRoutes()` function already parses the request body, validates it, creates `ServerContext`, calls the handler, serializes the response, and handles errors. The server runtime infrastructure is just the thin glue between Vercel's edge function entry point and the generated route handlers.

## Common Pitfalls

### Pitfall 1: TypeScript compilation scope for api/ files
**What goes wrong:** The project `tsconfig.json` only includes `src/`. New `.ts` files in `api/` are not type-checked by `tsc --noEmit`.
**Why it happens:** Vercel handles TS compilation for `api/` files during deployment, but local `tsc --noEmit` (used for CI) ignores them.
**How to avoid:** Either (a) create a separate `tsconfig.api.json` that includes `api/` with appropriate settings, or (b) add `api/` to the existing tsconfig's `include` array. Option (b) may cause issues with `vite/client` types in the api scope, so (a) is likely safer.
**Warning signs:** TypeScript errors in api/ not caught until Vercel deployment fails.

### Pitfall 2: CORS headers not applied to error responses
**What goes wrong:** Handler throws, error response returned without CORS headers. Browser blocks the error response due to CORS policy.
**Why it happens:** The generated `onError` callback returns a Response without CORS headers. If the gateway doesn't merge CORS headers into error responses, the browser can't read the error.
**How to avoid:** CORS headers must be merged into EVERY response from the catch-all, including error responses and 404s. Apply CORS after handler execution, not before.
**Warning signs:** Browser console shows CORS error on 500s but works fine on 200s.

### Pitfall 3: Edge runtime restrictions
**What goes wrong:** Code that works locally fails on Vercel Edge Runtime because it uses Node.js APIs.
**Why it happens:** Edge Runtime is V8 isolates with limited API surface. No `Buffer`, no `process.env` without Vercel's polyfill, no dynamic `eval`, limited `Date.now()` behavior.
**How to avoid:** Stick to Web Standard APIs. Use `process.env.X` for env vars (Vercel provides this in edge). Don't import Node.js modules. Test with `vercel dev` in addition to Vite dev.
**Warning signs:** Works with `npm run dev` but fails on Vercel deployment.

### Pitfall 4: Catch-all routing priority confusion
**What goes wrong:** New catch-all intercepts requests meant for existing `api/*.js` files.
**Why it happens:** Misunderstanding of Vercel's routing priority. In fact, specific files take priority over catch-all `[[...path]]` -- this is how the existing `api/eia/[[...path]].js` and `api/wingbits/[[...path]].js` coexist with their specific routes.
**How to avoid:** Trust Vercel's file-based routing: `api/earthquakes.js` will ALWAYS be matched before `api/[[...path]].ts` for `/api/earthquakes`. The catch-all only handles paths that don't match any specific file. Since new sebuf paths are `/api/seismology/v1/*` (no existing file), they'll always hit the catch-all.
**Warning signs:** None expected -- this is a non-issue if paths are distinct. But test it anyway.

### Pitfall 5: Response body consumption
**What goes wrong:** After `matchedHandler(request)` returns a Response, the gateway tries to read `response.body` to add CORS headers, but the body is a ReadableStream and can only be consumed once.
**Why it happens:** `new Response(response.body, ...)` passes the stream through without consuming it, so this pattern is safe. But if someone adds logging that calls `response.text()` first, the body stream is consumed.
**How to avoid:** Use the stream-passthrough pattern: `new Response(response.body, { status, headers })`. Never call `.text()` or `.json()` on the handler's response.
**Warning signs:** Empty response bodies in production.

### Pitfall 6: int64 field encoding
**What goes wrong:** The `occurredAt` field in `Earthquake` is `int64` in proto, which generates as `string` in TypeScript (sebuf v0.6.0 default). The USGS API returns time as a number (milliseconds). Returning a number when the generated type says string could cause client deserialization issues.
**Why it happens:** The CONTEXT.md notes that `INT64_ENCODING_NUMBER` is available in sebuf v0.7.0 but not yet wired up.
**How to avoid:** For now, convert `int64` values to strings in handler output: `occurredAt: String(feature.properties.time)`. This matches the generated type. When `INT64_ENCODING_NUMBER` is configured later, handlers can return numbers directly.
**Warning signs:** TypeScript type errors on `occurredAt: number` vs `occurredAt: string`.

## Code Examples

### USGS GeoJSON Feature Shape
```json
{
  "type": "Feature",
  "properties": {
    "mag": 5.2,
    "place": "183 km WSW of Tual, Indonesia",
    "time": 1771380927208,
    "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd",
    "felt": 1,
    "tsunami": 0,
    "status": "reviewed",
    "magType": "mb"
  },
  "geometry": {
    "type": "Point",
    "coordinates": [131.2032, -6.2086, 61.659]
  },
  "id": "us7000abcd"
}
```

### Generated Handler Interface (from service_server.ts)
```typescript
export interface SeismologyServiceHandler {
  listEarthquakes(ctx: ServerContext, req: ListEarthquakesRequest): Promise<ListEarthquakesResponse>;
}
```

### Generated ServerContext
```typescript
export interface ServerContext {
  request: Request;
  pathParams: Record<string, string>;
  headers: Record<string, string>;
}
```

### Generated ServerOptions
```typescript
export interface ServerOptions {
  onError?: (error: unknown, req: Request) => Response | Promise<Response>;
  validateRequest?: (methodName: string, body: unknown) => FieldViolation[] | undefined;
}
```

### Existing CORS Logic (from api/_cors.js)
```javascript
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/(.*\.)?worldmonitor\.app$/,
  /^https:\/\/worldmonitor-[a-z0-9-]+-elie-habib-projects\.vercel\.app$/,
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https?:\/\/tauri\.localhost(:\d+)?$/,
  /^https?:\/\/[a-z0-9-]+\.tauri\.localhost(:\d+)?$/i,
  /^tauri:\/\/localhost$/,
  /^asset:\/\/localhost$/,
];

export function getCorsHeaders(req, methods = 'GET, OPTIONS') {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = isAllowedOrigin(origin) ? origin : 'https://worldmonitor.app';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
```

### Existing Vercel Edge Function Pattern (from api/earthquakes.js)
```javascript
import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
export const config = { runtime: 'edge' };

export default async function handler(request) {
  const cors = getCorsHeaders(request);
  if (isDisallowedOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403, headers: cors });
  }
  // ... fetch upstream, transform, return Response with cors headers
}
```

## Vercel Catch-All Gateway

### File Location
`api/[[...path]].ts` -- The double-bracket `[[...path]]` syntax makes it an optional catch-all, meaning it matches `/api` as well as `/api/anything/else`.

### Routing Priority (Verified)
Vercel's file-based routing follows this priority:
1. Exact file match (e.g., `api/earthquakes.js` for `/api/earthquakes`)
2. Dynamic segment (e.g., `api/wingbits/details/[icao24].js`)
3. Catch-all (e.g., `api/wingbits/[[...path]].js` or `api/[[...path]].ts`)

This means ALL existing `api/*.js` files continue to work unchanged. The new catch-all only catches paths that have no matching specific file. Since sebuf routes use `/api/{domain}/v1/*` paths (e.g., `/api/seismology/v1/list-earthquakes`), and no existing file matches these paths, the catch-all will correctly handle them.

**Confidence:** HIGH -- verified by the existing `api/eia/[[...path]].js` and `api/wingbits/[[...path]].js` which coexist with specific route files.

### Edge Runtime Compatibility
The catch-all uses `export const config = { runtime: 'edge' }` (or possibly `export default { fetch(request) {...} }` pattern). Edge Runtime limitations that matter:
- Max bundle size: 1-4 MB compressed depending on plan
- Max request body: 4 MB
- Max 950 fetch calls per invocation
- No filesystem access
- No Node.js-specific APIs

All of these are fine for our use case: handlers proxy to upstream APIs with small JSON payloads.

### Vercel TypeScript Support
Vercel automatically compiles `.ts` files in `api/` directory. No need for the file to be in the project tsconfig -- Vercel uses its own TS compilation. However, for local dev type-checking, a separate tsconfig or inclusion is needed.

## Vite Dev Server Plugin

### Approach
Add a Vite plugin in `vite.config.ts` that intercepts requests matching `/api/*/v1/*` and routes them to the same handler logic as the Vercel catch-all. This avoids needing the existing proxy config for new sebuf routes.

```typescript
function sebufApiPlugin(): Plugin {
  return {
    name: 'sebuf-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', `http://localhost:${server.config.server.port}`);
        if (!url.pathname.match(/^\/api\/[a-z]+\/v1\//)) {
          return next();
        }
        // Build Request, match route, execute handler, write response
        // ...
      });
    },
  };
}
```

The plugin needs access to the same router and handler instances. The cleanest approach is to have a shared `createAllRoutes()` function imported by both the Vite plugin and the Vercel catch-all.

**Alternative:** Instead of a Vite plugin, configure Vite proxy to forward `/api/*/v1/*` to `http://localhost:46123` (the sidecar port) during dev. But this adds a dependency on running the sidecar during web development, which is unnecessary complexity.

## Tauri Sidecar Compatibility

The existing sidecar (`src-tauri/sidecar/local-api-server.mjs`) builds a route table by walking the `api/` directory and matching files. It already supports `[[...path]]` catch-all patterns via its `matchRoute()` function (verified in the source code, lines 98-162). When the sidecar encounters `/api/seismology/v1/list-earthquakes`, it will:

1. Check all specific files first (no match -- no `api/seismology.js` exists)
2. Fall through to `api/[[...path]].js` (compiled from `.ts` during build)

**Important consideration:** The sidecar imports handlers as ES modules from `.js` files. The new `api/[[...path]].ts` must be compiled to `.js` before the sidecar can use it. This happens automatically in the Vercel build pipeline but needs to be handled for the Tauri build. The existing build process (`tsc && vite build`) targets the frontend; the api directory needs its own compilation step for Tauri.

**For Phase 2B:** This is an integration concern that can be deferred. The sidecar currently loads existing `.js` files directly. The new TypeScript files will need compilation, but this can be addressed when the Tauri build pipeline is updated. The sidecar's `cloudFallback` feature means it will fall through to the cloud Vercel deployment if a local handler isn't available.

## Shared Type Considerations

Each generated `service_server.ts` defines its own copies of `RouteDescriptor`, `ServerOptions`, `ServerContext`, `ValidationError`, and `ApiError`. These are structurally identical but separate TypeScript types. For the shared server infrastructure:

- **router.ts** needs `RouteDescriptor` -- import from any one generated file, or define locally (same shape).
- **error-mapper.ts** needs `ApiError` and `ValidationError` -- use `instanceof` checks which work since all generated files define the same class names.
- **catch-all gateway** imports from all 17 generated files -- each `createXxxServiceRoutes()` returns its own `RouteDescriptor[]` type, but they're structurally compatible.

**Recommendation:** Define a minimal `api/server/types.ts` with the shared shapes:
```typescript
export interface RouteDescriptor {
  method: string;
  path: string;
  handler: (req: Request) => Promise<Response>;
}
```
This avoids importing from a specific generated file for the shared infrastructure. The generated arrays are structurally compatible.

## Error Mapping Strategy

The error mapper needs to handle:

| Error Type | HTTP Status | Response Body | Source |
|------------|-------------|---------------|--------|
| `ValidationError` | 400 | `{ violations: [...] }` | Generated code handles this BEFORE `onError` is called |
| `ApiError` (custom) | `.statusCode` | `{ message: "..." }` | Handler throws when upstream API returns error |
| Rate limit (upstream) | 429 | `{ message: "Rate limited", retryAfter: N }` | Handler throws with specific error |
| Upstream down | 502 | `{ message: "Upstream unavailable" }` | Handler throws when fetch fails |
| Unknown error | 500 | `{ message: "Internal server error" }` | Catch-all for unexpected errors |

Note: `ValidationError` is already handled by the generated code (returns 400 directly, never reaches `onError`). The `onError` callback only receives non-validation errors.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Individual `api/*.js` edge functions | Catch-all with generated route handlers | Phase 2B | Single entry point for all sebuf routes |
| Hand-written fetch + JSON parsing | Generated client/server with typed interfaces | Phase 2A | Type safety, generated request/response handling |
| `export const config = { runtime: 'edge' }` | Same -- still valid | Still current | Vercel Edge Functions are deprecated as standalone product but `runtime: 'edge'` config is still supported in Vercel Functions |

**Deprecated/outdated:**
- Vercel's standalone "Edge Functions" product is deprecated (as of late 2025), but using `runtime: 'edge'` in `config` is still fully supported. Vercel recommends Node.js runtime for improved performance, but edge runtime works fine for lightweight proxy handlers and has the advantage of global deployment.

## Open Questions

1. **tsconfig for api/ directory**
   - What we know: `tsconfig.json` only includes `src/`. Vercel compiles `api/*.ts` separately. But local `tsc --noEmit` won't catch errors in `api/`.
   - What's unclear: Should we create `tsconfig.api.json` or add `api/` to the main tsconfig?
   - Recommendation: Create `tsconfig.api.json` extending the main config but with `include: ["api", "src/generated"]`. Add a `typecheck:api` script to `package.json`. This avoids mixing Vite client types with edge function types.

2. **Vite plugin vs proxy for dev**
   - What we know: Existing Vite config uses proxies for various APIs. A Vite plugin intercepts requests directly.
   - What's unclear: Is a Vite plugin the right approach, or should we use Vite's proxy to forward `/api/*/v1/*` to a local server process?
   - Recommendation: Vite plugin is cleaner -- it runs the same handler code in-process without needing a separate server. The plugin just needs to convert Connect's `IncomingMessage` to a web `Request`, call the handler, and write the response back to Connect's `ServerResponse`.

3. **CORS headers on generated responses**
   - What we know: Generated route handlers return `Response` with `Content-Type: application/json` but no CORS headers. CORS must be added by the gateway.
   - What's unclear: Should CORS be injected by creating a new Response with merged headers (stream passthrough), or by wrapping the generated handler function?
   - Recommendation: Stream passthrough in the gateway: `new Response(response.body, { status, statusText, headers: mergedHeaders })`. This is the simplest approach and avoids buffering the response body.

4. **Rate limiting and caching for sebuf handlers**
   - What we know: Existing `api/*.js` files use `_ip-rate-limit.js` and `_upstash-cache.js`. Generated handlers don't have this built in.
   - What's unclear: Should Phase 2B add rate limiting/caching to the shared infrastructure, or defer to per-handler implementation in Phase 2C-2S?
   - Recommendation: Defer. The seismology handler in 2B should use simple HTTP Cache-Control headers (matching the existing `api/earthquakes.js` pattern). Rate limiting and Upstash caching are per-domain concerns that vary significantly. Add them as needed per handler in Phase 2C-2S.

## Sources

### Primary (HIGH confidence)
- Project source code: `api/_cors.js`, `api/earthquakes.js`, `src/generated/server/worldmonitor/seismology/v1/service_server.ts` -- exact shapes and patterns
- Project source code: `src-tauri/sidecar/local-api-server.mjs` -- verified sidecar catch-all routing support
- Project source code: `api/eia/[[...path]].js`, `api/wingbits/[[...path]].js` -- verified existing catch-all pattern
- Project source code: `vite.config.ts` -- verified existing proxy and plugin patterns
- Vercel docs: [Functions API Reference](https://vercel.com/docs/functions/functions-api-reference) -- verified web handler pattern with Request/Response
- Vercel docs: [Edge Functions](https://vercel.com/docs/functions/runtimes/edge/edge-functions.rsc) -- verified edge runtime limits and capabilities

### Secondary (MEDIUM confidence)
- Vercel docs: [Project Configuration](https://vercel.com/docs/project-configuration) -- routing priority for catch-all vs specific files
- USGS Earthquake API: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson` -- verified GeoJSON structure

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns verified in existing codebase
- Architecture: HIGH -- generated code provides 80% of the solution; infrastructure is thin glue
- Pitfalls: HIGH -- identified from direct analysis of project constraints (tsconfig, edge runtime, CORS)

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable -- no fast-moving dependencies)
