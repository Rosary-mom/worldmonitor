# Phase 1: Proto Foundation - Research

**Researched:** 2026-02-18
**Domain:** Buf toolchain, protobuf schema design, sebuf code generation (TypeScript client + server + OpenAPI)
**Confidence:** HIGH

## Summary

Phase 1 establishes the Buf toolchain, shared proto types, and TypeScript code generation pipeline for WorldMonitor. The anghamna reference project provides a battle-tested blueprint: `buf.yaml` with `STANDARD + COMMENTS` lint rules and `FILE + PACKAGE + WIRE_JSON` breaking change detection, deps on `buf.build/sebmelki/sebuf` and `buf.build/bufbuild/protovalidate`, a service-per-domain pattern with per-RPC proto files, and a `core/v1/` package for shared types like typed ID wrappers.

The sebuf toolkit provides three custom protoc plugins relevant to this phase: `protoc-gen-ts-client` (generates self-contained TypeScript client classes with fetch-based HTTP calls, typed options, and error handling), `protoc-gen-ts-server` (generates handler interfaces and route descriptors for framework-agnostic server hosting), and `protoc-gen-openapiv3` (generates OpenAPI 3.1.0 specs in JSON and YAML). All three are Go binaries installed via `go install` from the `github.com/SebastienMelki/sebuf` module. The ts-client plugin generates single-file, zero-dependency clients that include all message interfaces, enum types, and error classes inline -- no separate "types-only" generation is needed.

The key divergence from the original REQUIREMENTS.md (which suggested `proto/models/` and `proto/services/{domain}/v1/`) is resolved by the CONTEXT.md decision: proto root is `proto/worldmonitor/{domain}/v1/` with shared types at `proto/worldmonitor/core/v1/`, exactly matching anghamna's pattern of `{project}/{domain}/v1/`.

**Primary recommendation:** Follow the anghamna pattern exactly for buf.yaml/buf.gen.yaml, replace Go-specific plugins with TypeScript-specific ones (protoc-gen-ts-client, protoc-gen-ts-server), and place generated output in `src/generated/client/` and `src/generated/server/` respectively for Vite/TS ergonomics.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Utility types go in core: GeoCoordinates, TimeRange, PaginationRequest/Response, LocalizableString
- Domain-specific types stay in their domain packages -- no domain types in core
- Cross-domain references use typed ID wrappers in core (e.g., HotspotID) -- same pattern as anghamna's AlbumID, SongID
- Domain-internal IDs stay as plain string fields -- no wrappers needed
- Severity enums are domain-specific -- each domain defines its own scale (no shared severity)
- Core `GeneralError` with oneof subtypes for app-wide conditions (geo-blocked, rate-limited, upstream-down, etc.) -- all endpoints can return this
- Per-RPC specific error types defined in each domain (e.g., `GetEarthquakesError`) for endpoint-specific failure modes
- Follows the anghamna pattern: LoginRequest/LoginError/LoginResponse + GeneralError for app-wide conditions
- One proto file per RPC (e.g., `get_earthquakes.proto`, `get_fires.proto`) plus `service.proto` and domain model files -- matches anghamna pattern exactly
- Proto root directory: `proto/worldmonitor/{domain}/v1/` (subdirectory, not repo root)
- Core/shared types: `proto/worldmonitor/core/v1/`
- One service per domain -- domain count and boundaries will be proposed during domain migration phases and tweaked with user approval
- buf.yaml config matches anghamna: STANDARD + COMMENTS lint rules, FILE + PACKAGE + WIRE_JSON breaking change detection, deps on protovalidate + sebuf
- Generated TypeScript files committed to git (not generated on build) -- PRs show type changes
- Client generation uses sebuf `protoc-gen-ts-client` only -- no separate types-only generation (types come from the client package)
- OpenAPI specs also committed to git
- OpenAPI generated in both JSON and YAML formats (matching anghamna)
- One spec per domain/service
- Output to `docs/` directory, committed to git

### Claude's Discretion
- Exact placement of generated TS client output directory (src/generated/ vs gen/ts/ -- choose based on Vite/TS config ergonomics)
- Server-generated code directory organization (choose cleanest structure for client + server separation)
- Domain service boundaries will be proposed by Claude during planning for domain migration phases (Phases 3-7), then refined with user approval

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROTO-01 | Buf toolchain configured (buf.yaml, buf.gen.yaml) with sebuf plugin dependencies | Anghamna buf.yaml/buf.gen.yaml patterns fully documented; exact deps and lint/breaking rules known; sebuf BSR module confirmed at buf.build/sebmelki/sebuf |
| PROTO-02 | Proto directory structure created following pattern | CONTEXT.md overrides REQUIREMENTS.md: use `proto/worldmonitor/{domain}/v1/` (not `proto/models/` + `proto/services/`); anghamna's `{project}/{domain}/v1/` pattern confirmed as reference |
| PROTO-03 | Shared proto messages defined for cross-domain types | Core types (GeoCoordinates, TimeRange, PaginationRequest/Response, LocalizableString, GeneralError, typed ID wrappers) go in `proto/worldmonitor/core/v1/`; anghamna core patterns documented with code examples |
| PROTO-04 | Code generation pipeline runs via `buf generate` producing TypeScript clients and server handlers | Three sebuf plugins documented: protoc-gen-ts-client (client classes), protoc-gen-ts-server (handler interfaces + route descriptors), protoc-gen-openapiv3 (OpenAPI); output file naming patterns and generated code structure fully analyzed |
| PROTO-05 | OpenAPI v3 specs auto-generated from proto definitions | protoc-gen-openapiv3 generates OpenAPI 3.1.0 specs; both JSON and YAML formats; one spec per service; output to `docs/` directory; anghamna example confirmed |
</phase_requirements>

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| buf CLI | 1.64.0 | Proto linting, breaking change detection, code generation orchestration | Already installed on system; industry standard for protobuf tooling |
| buf.build/sebmelki/sebuf | latest (BSR) | HTTP annotations for service config (base_path, per-RPC path), field annotations (query params, encoding, validation) | User's own toolkit; provides the proto annotations that power all three code generators |
| buf.build/bufbuild/protovalidate | latest (BSR) | Field validation annotations (required, min_len, max_len, example) | Standard protobuf validation; used extensively in anghamna for documenting and enforcing field constraints |
| protoc-gen-ts-client | v0.6.0 (sebuf) | Generates self-contained TypeScript HTTP client classes from proto service definitions | Produces fetch-based clients with typed options, error handling (ValidationError, ApiError), AbortSignal support |
| protoc-gen-ts-server | v0.6.0 (sebuf) | Generates TypeScript server handler interfaces and RouteDescriptor arrays | Produces framework-agnostic handler interfaces; route descriptors work with any server (Vite, Vercel, Tauri) |
| protoc-gen-openapiv3 | v0.6.0 (sebuf) | Generates OpenAPI 3.1.0 specs from proto definitions | Produces complete specs with schemas, validation rules, path/query params; JSON + YAML output |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Go toolchain | 1.24.4 | Required to install sebuf protoc plugins via `go install` | One-time setup; plugins are Go binaries |
| Make | system | Build automation (generate, lint, clean targets) | Standardize buf commands like anghamna |

### Alternatives Considered

None -- all tools are locked by user decision. No alternatives to evaluate.

**Installation:**

```bash
# Sebuf protoc plugins (all from same module)
GOPROXY=direct GOPRIVATE=github.com/SebastienMelki go install github.com/SebastienMelki/sebuf/cmd/protoc-gen-ts-client@v0.6.0
GOPROXY=direct GOPRIVATE=github.com/SebastienMelki go install github.com/SebastienMelki/sebuf/cmd/protoc-gen-ts-server@v0.6.0
GOPROXY=direct GOPRIVATE=github.com/SebastienMelki go install github.com/SebastienMelki/sebuf/cmd/protoc-gen-openapiv3@v0.6.0

# Buf CLI (if not installed)
brew install bufbuild/buf/buf

# Buf dependencies
buf dep update
```

## Architecture Patterns

### Proto Directory Structure (CONTEXT.md Decision)

```
proto/
  worldmonitor/
    core/
      v1/
        geo.proto              # GeoCoordinates
        time.proto             # TimeRange
        pagination.proto       # PaginationRequest/Response
        i18n.proto             # LocalizableString
        identifiers.proto      # Typed ID wrappers (HotspotID, etc.)
        general_error.proto    # GeneralError with oneof subtypes
    {domain}/                  # e.g., environmental/
      v1/
        service.proto          # Service definition with RPCs
        {model}.proto          # Domain model messages
        get_{resource}.proto   # Per-RPC request/response/error
```

### Generated Output Directory Structure (Claude's Discretion -- Recommendation)

```
src/
  generated/
    client/
      worldmonitor/
        core/v1/               # (no service.proto in core, so no client generated here)
        environmental/v1/
          service_client.ts    # EnvironmentalServiceClient class + all types
        ...
    server/
      worldmonitor/
        environmental/v1/
          service_server.ts    # EnvironmentalServiceHandler interface + createRoutes
        ...
docs/
  EnvironmentalService.openapi.json
  EnvironmentalService.openapi.yaml
```

**Rationale for `src/generated/`:**
1. The existing `tsconfig.json` has `"include": ["src"]` -- placing generated files under `src/` means they are automatically included in TypeScript compilation with zero config changes.
2. The existing path alias `"@/*": ["src/*"]` means generated code can be imported as `@/generated/client/worldmonitor/environmental/v1/service_client`.
3. Keeping client and server in separate subdirectories provides clean separation -- the client code is what the frontend imports; server code is what runtime adapters (Vite plugin, Vercel function, Tauri sidecar) import.
4. The `generated/` prefix makes it obvious these files are machine-generated and should not be manually edited.

### Pattern 1: Service Definition with HTTP Annotations

**What:** Each domain has one `service.proto` that imports per-RPC files and defines the service with `sebuf.http.service_config` for base path and `sebuf.http.config` for per-RPC paths.

**When to use:** Every domain service definition.

**Example (from anghamna):**
```protobuf
// Source: anghamna/album/v1/service.proto
syntax = "proto3";
package anghamna.album.v1;

import "anghamna/album/v1/get_album_songs.proto";
import "anghamna/album/v1/get_albums.proto";
import "sebuf/http/annotations.proto";

service AlbumService {
  option (sebuf.http.service_config) = {base_path: "/api/album/v1"};

  rpc GetAlbums(GetAlbumsRequest) returns (GetAlbumsResponse) {
    option (sebuf.http.config) = {path: "/get-albums"};
  }

  rpc GetAlbumSongs(GetAlbumSongsRequest) returns (GetAlbumSongsResponse) {
    option (sebuf.http.config) = {path: "/get-album-songs"};
  }
}
```

### Pattern 2: Per-RPC File with Request/Response/Error

**What:** Each RPC gets its own proto file containing the request, response, and (if applicable) error messages.

**When to use:** Every RPC definition.

**Example (adapted for WorldMonitor):**
```protobuf
// proto/worldmonitor/environmental/v1/get_earthquakes.proto
syntax = "proto3";
package worldmonitor.environmental.v1;

import "worldmonitor/core/v1/geo.proto";
import "worldmonitor/core/v1/time.proto";
import "worldmonitor/core/v1/pagination.proto";
import "buf/validate/validate.proto";

message GetEarthquakesRequest {
  worldmonitor.core.v1.TimeRange time_range = 1;
  double min_magnitude = 2;
  worldmonitor.core.v1.PaginationRequest pagination = 3;
}

message GetEarthquakesError {
  string message = 1 [(buf.validate.field).required = true];
}

message GetEarthquakesResponse {
  oneof response {
    GetEarthquakesSuccess success = 1;
    GetEarthquakesError error = 2;
  }
}

message GetEarthquakesSuccess {
  repeated Earthquake earthquakes = 1;
  worldmonitor.core.v1.PaginationResponse pagination = 2;
}
```

### Pattern 3: Typed ID Wrappers in Core

**What:** Cross-domain entity references use wrapper messages with a single `value` string field and protovalidate annotations.

**When to use:** When one domain needs to reference an entity from another domain.

**Example (from anghamna):**
```protobuf
// Source: anghamna/core/v1/identifiers.proto
message AlbumID {
  string value = 1 [
    (buf.validate.field).required = true,
    (buf.validate.field).string.example = "album_345678",
    (buf.validate.field).string.min_len = 1,
    (buf.validate.field).string.max_len = 100
  ];
}
```

### Pattern 4: GeneralError with Oneof Subtypes

**What:** App-wide error conditions that any endpoint may return, using a oneof to discriminate between error types.

**When to use:** The core package; consumed by all services.

**Example (from anghamna, adapted for WorldMonitor):**
```protobuf
// proto/worldmonitor/core/v1/general_error.proto
syntax = "proto3";
package worldmonitor.core.v1;

message GeneralError {
  oneof error_type {
    RateLimited rate_limited = 1;
    UpstreamDown upstream_down = 2;
    GeoBlocked geo_blocked = 3;
  }
}

message RateLimited {
  int32 retry_after_seconds = 1;
}

message UpstreamDown {
  string provider = 1;
  string message = 2;
}

message GeoBlocked {}
```

### Pattern 5: buf.gen.yaml for TypeScript-Only Generation

**What:** The buf.gen.yaml configures all three sebuf plugins for TypeScript + OpenAPI output only (no Go, no Swift, no Java).

**Example (worldmonitor-specific):**
```yaml
version: v2
plugins:
  # TypeScript client generation
  - local: protoc-gen-ts-client
    out: ./src/generated/client

  # TypeScript server generation
  - local: protoc-gen-ts-server
    out: ./src/generated/server

  # OpenAPI v3 in YAML format
  - local: protoc-gen-openapiv3
    out: ./docs

  # OpenAPI v3 in JSON format
  - local: protoc-gen-openapiv3
    out: ./docs
    opt:
      - format=json
```

### Anti-Patterns to Avoid
- **Putting domain types in core:** Core is for utility types only (geo, time, pagination, i18n, identifiers, general errors). Domain models (Earthquake, Fire, etc.) stay in their domain package.
- **Using ts_proto (protoc-gen-ts_proto):** Anghamna uses it for web, but the CONTEXT.md decision is to use `protoc-gen-ts-client` which generates full client classes, not just type interfaces.
- **Generating code on build:** Generated files are committed to git so PRs show type changes. The Vite build should NOT run `buf generate`.
- **Multiple services per domain:** One service per domain is the locked decision.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript HTTP clients | Manual fetch wrappers | protoc-gen-ts-client | Generates typed clients with error handling, AbortSignal, custom headers, zero dependencies |
| Server handler interfaces | Manual interface definitions | protoc-gen-ts-server | Generates handler interfaces + RouteDescriptor arrays that work with any server framework |
| OpenAPI documentation | Manual spec authoring | protoc-gen-openapiv3 | Generates from proto annotations; always in sync with actual service definitions |
| Proto linting | Custom lint scripts | `buf lint` with STANDARD + COMMENTS | Industry standard rules; catches issues like missing comments, naming violations |
| Breaking change detection | Manual review | `buf breaking --against .git#branch=main` | Catches wire-incompatible changes (removed fields, changed types) automatically |
| Field validation annotations | Custom validation code | buf.build/bufbuild/protovalidate | Declarative validation in proto; used by OpenAPI generator for schema constraints |

**Key insight:** The entire value of this phase is that proto definitions become the single source of truth for client code, server interfaces, API documentation, and validation rules. Hand-rolling any of these defeats the purpose.

## Common Pitfalls

### Pitfall 1: Proto Package vs Directory Mismatch
**What goes wrong:** Buf lint fails with `PACKAGE_DIRECTORY_MATCH` error because the proto `package` declaration doesn't match the file's directory path.
**Why it happens:** Proto package is `worldmonitor.core.v1` but file is at `proto/core/v1/` instead of `proto/worldmonitor/core/v1/`.
**How to avoid:** The directory structure must mirror the package declaration exactly. `package worldmonitor.core.v1` requires the file to be at `{buf_root}/worldmonitor/core/v1/`.
**Warning signs:** `buf lint` fails on first run.

### Pitfall 2: Missing COMMENTS Lint Rule Compliance
**What goes wrong:** `buf lint` fails because proto messages, fields, services, or RPCs lack comments.
**Why it happens:** STANDARD rules don't require comments; adding COMMENTS rule requires every public symbol to have a comment.
**How to avoid:** Write comments on every message, field, enum, enum value, service, and RPC from the start. Use the anghamna patterns as templates.
**Warning signs:** Lots of lint warnings about missing comments.

### Pitfall 3: protoc-gen-ts-client Output is Per-Service-File
**What goes wrong:** Developer expects one generated file per proto file (like ts_proto). Instead, `protoc-gen-ts-client` only generates files for proto files that contain `service` definitions.
**Why it happens:** The client generator checks `if len(file.Services) == 0 { return nil }` -- it skips non-service files entirely. All referenced message types are inlined into the generated client file.
**How to avoid:** Understand that the generated `service_client.ts` file is self-contained: it includes all message interfaces, enum types, and error classes inline. There is no separate "types" file.
**Warning signs:** Looking for generated type files for model-only proto files and not finding them.

### Pitfall 4: protoc-gen-ts-server Also Generates Self-Contained Files
**What goes wrong:** Same as Pitfall 3 but for the server generator. It only generates for service.proto files and inlines all types.
**Why it happens:** Same architecture as the client generator -- single self-contained output file per service.
**How to avoid:** Accept that both client and server generated files will contain duplicate type definitions. This is by design -- each is independently importable without cross-dependencies.
**Warning signs:** Trying to share types between client and server generated code.

### Pitfall 5: Generated File Naming Convention
**What goes wrong:** Developer looks for `service.ts` but the file is named `service_client.ts` or `service_server.ts`.
**Why it happens:** The generators append `_client.ts` and `_server.ts` suffixes to the proto file's base name: `file.GeneratedFilenamePrefix + "_client.ts"`.
**How to avoid:** For `service.proto`, the generated files will be `service_client.ts` and `service_server.ts`.
**Warning signs:** Import paths are wrong because of filename assumptions.

### Pitfall 6: OpenAPI Spec File Naming
**What goes wrong:** Developer expects `environmental.openapi.yaml` but gets `EnvironmentalService.openapi.yaml`.
**Why it happens:** The OpenAPI generator names output files after the service name (GoName), not the package or file name.
**How to avoid:** Accept the `{ServiceName}.openapi.{json,yaml}` naming convention as shown in anghamna's `docs/` directory.
**Warning signs:** Build scripts reference wrong filenames.

### Pitfall 7: buf.yaml Module Root
**What goes wrong:** `buf lint` or `buf generate` cannot find proto files because the module root is misconfigured.
**Why it happens:** In buf v2, the `buf.yaml` goes at the project root, and proto files are resolved relative to the directory containing `buf.yaml`. In anghamna, `buf.yaml` is at the repo root and proto files are under `anghamna/{domain}/v1/`. For worldmonitor, `buf.yaml` should be at `proto/` and proto files under `proto/worldmonitor/{domain}/v1/`, OR `buf.yaml` at project root with `modules` configuration pointing to `proto/`.
**How to avoid:** Place `buf.yaml` at `proto/buf.yaml` (making `proto/` the buf module root) so that `worldmonitor/core/v1/geo.proto` resolves correctly. Alternatively, configure buf v2 `modules` in a root-level `buf.yaml`.
**Warning signs:** Buf cannot find imported proto files.

## Code Examples

### Example 1: Generated Client Output (from sebuf golden tests)

```typescript
// Code generated by protoc-gen-ts-client. DO NOT EDIT.
// source: service.proto

export interface SimpleRequest {
  input: string;
}

export interface SimpleResponse {
  output: string;
}

export interface FieldViolation {
  field: string;
  description: string;
}

export class ValidationError extends Error {
  violations: FieldViolation[];
  constructor(violations: FieldViolation[]) {
    super("Validation failed");
    this.name = "ValidationError";
    this.violations = violations;
  }
}

export class ApiError extends Error {
  statusCode: number;
  body: string;
  constructor(statusCode: number, message: string, body: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.body = body;
  }
}

export interface MyServiceClientOptions {
  fetch?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export interface MyServiceCallOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class MyServiceClient {
  private baseURL: string;
  private fetchFn: typeof fetch;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string, options?: MyServiceClientOptions) {
    this.baseURL = baseURL.replace(/\/+$/, "");
    this.fetchFn = options?.fetch ?? globalThis.fetch;
    this.defaultHeaders = { ...options?.defaultHeaders };
  }

  async doSomething(req: SimpleRequest, options?: MyServiceCallOptions): Promise<SimpleResponse> {
    let path = "/api/v1/do-something";
    const url = this.baseURL + path;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.defaultHeaders,
      ...options?.headers,
    };

    const resp = await this.fetchFn(url, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
      signal: options?.signal,
    });

    if (!resp.ok) {
      return this.handleError(resp);
    }

    return await resp.json() as SimpleResponse;
  }

  private async handleError(resp: Response): Promise<never> {
    const body = await resp.text();
    if (resp.status === 400) {
      try {
        const parsed = JSON.parse(body);
        if (parsed.violations) {
          throw new ValidationError(parsed.violations);
        }
      } catch (e) {
        if (e instanceof ValidationError) throw e;
      }
    }
    throw new ApiError(resp.status, `Request failed with status ${resp.status}`, body);
  }
}
```

### Example 2: Generated Server Output (from sebuf golden tests)

```typescript
// Code generated by protoc-gen-ts-server. DO NOT EDIT.
// source: service.proto

// ... (same interfaces, error classes as client) ...

export interface ServerContext {
  request: Request;
  pathParams: Record<string, string>;
  headers: Record<string, string>;
}

export interface ServerOptions {
  onError?: (error: unknown, req: Request) => Response | Promise<Response>;
  validateRequest?: (methodName: string, body: unknown) => FieldViolation[] | undefined;
}

export interface RouteDescriptor {
  method: string;
  path: string;
  handler: (req: Request) => Promise<Response>;
}

export interface MyServiceHandler {
  doSomething(ctx: ServerContext, req: SimpleRequest): Promise<SimpleResponse>;
}

export function createMyServiceRoutes(
  handler: MyServiceHandler,
  options?: ServerOptions,
): RouteDescriptor[] {
  return [
    {
      method: "POST",
      path: "/api/v1/do-something",
      handler: async (req: Request): Promise<Response> => {
        try {
          const pathParams: Record<string, string> = {};
          const body = await req.json() as SimpleRequest;
          // ... validation, handler call, response ...
        } catch (err: unknown) {
          // ... error handling ...
        }
      },
    },
  ];
}
```

### Example 3: buf.yaml Configuration

```yaml
# Matches anghamna pattern exactly
version: v2
deps:
  - buf.build/bufbuild/protovalidate
  - buf.build/sebmelki/sebuf
lint:
  use:
    - STANDARD
    - COMMENTS
  enum_zero_value_suffix: _UNSPECIFIED
  service_suffix: Service
breaking:
  use:
    - FILE
    - PACKAGE
    - WIRE_JSON
```

### Example 4: Core Shared Types (WorldMonitor-specific)

```protobuf
// proto/worldmonitor/core/v1/geo.proto
syntax = "proto3";
package worldmonitor.core.v1;

import "buf/validate/validate.proto";

// GeoCoordinates represents a geographic location.
message GeoCoordinates {
  // Latitude in decimal degrees (-90 to 90).
  double latitude = 1 [
    (buf.validate.field).double.gte = -90,
    (buf.validate.field).double.lte = 90
  ];
  // Longitude in decimal degrees (-180 to 180).
  double longitude = 2 [
    (buf.validate.field).double.gte = -180,
    (buf.validate.field).double.lte = 180
  ];
}
```

```protobuf
// proto/worldmonitor/core/v1/time.proto
syntax = "proto3";
package worldmonitor.core.v1;

import "google/protobuf/timestamp.proto";

// TimeRange represents a time interval.
message TimeRange {
  // Start of the time range.
  google.protobuf.Timestamp start = 1;
  // End of the time range.
  google.protobuf.Timestamp end = 2;
}
```

```protobuf
// proto/worldmonitor/core/v1/pagination.proto
syntax = "proto3";
package worldmonitor.core.v1;

import "buf/validate/validate.proto";

// PaginationRequest specifies pagination parameters.
message PaginationRequest {
  // Page size (max items per page).
  int32 page_size = 1 [
    (buf.validate.field).int32.gte = 1,
    (buf.validate.field).int32.lte = 100
  ];
  // Opaque cursor for the next page.
  string cursor = 2;
}

// PaginationResponse contains pagination metadata.
message PaginationResponse {
  // Cursor for the next page (empty if no more pages).
  string next_cursor = 1;
  // Total count of items (if known, 0 if unknown).
  int32 total_count = 2;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ts-proto (protoc-gen-ts_proto) for types-only | protoc-gen-ts-client for full client classes | sebuf v0.6.0 | Client includes fetch logic, error handling, typed options -- not just interfaces |
| No server codegen for TypeScript | protoc-gen-ts-server for handler interfaces | sebuf v0.6.0 | Server handlers are generated with route descriptors, validation hooks |
| buf.yaml v1 format | buf.yaml v2 format | buf v2 | Modules config, managed mode improvements |

**Deprecated/outdated:**
- ts_proto (protoc-gen-ts_proto): Anghamna still uses it for web, but WorldMonitor will use protoc-gen-ts-client per CONTEXT.md decision. ts_proto generates types-only interfaces; protoc-gen-ts-client generates complete client classes.
- Manual `go_package_prefix` managed mode: Not needed for WorldMonitor since we are not generating Go code.

## Key Technical Details

### Generated Client Capabilities (from source code analysis)

The `protoc-gen-ts-client` generates:
1. **TypeScript interfaces** for all request/response/model messages (recursively resolved)
2. **String union types** for protobuf enums
3. **FieldViolation, ValidationError, ApiError** error classes
4. **ClientOptions interface** with `fetch?`, `defaultHeaders?`, and any service-level header properties
5. **CallOptions interface** with `headers?`, `signal?`, and any method-level header properties
6. **Client class** with:
   - Constructor accepting `baseURL` and optional `ClientOptions`
   - Async methods for each RPC, accepting the request type and optional `CallOptions`
   - URL construction with path parameter substitution
   - Query parameter handling for GET/DELETE methods
   - Header merging (defaults + call options + typed headers)
   - JSON body serialization for POST/PUT/PATCH
   - Response parsing and error handling
   - Private `handleError` method for 400 (validation) and other errors

### Generated Server Capabilities (from source code analysis)

The `protoc-gen-ts-server` generates:
1. **Same message interfaces and error classes** as client (independently importable)
2. **ServerContext interface** with `request: Request`, `pathParams`, `headers`
3. **ServerOptions interface** with `onError?` and `validateRequest?` hooks
4. **RouteDescriptor interface** with `method`, `path`, `handler`
5. **Handler interface** (e.g., `EnvironmentalServiceHandler`) with one method per RPC
6. **createXxxRoutes function** that takes a handler and returns `RouteDescriptor[]`
   - Handles path parameter extraction
   - Handles query parameter parsing for GET/DELETE
   - Handles JSON body parsing for POST/PUT/PATCH
   - Calls `validateRequest` hook if provided
   - Calls handler method
   - Returns JSON response
   - Error handling with ValidationError -> 400, custom onError, or 500 fallback

### Test Proto File Strategy

Phase 1 needs a test proto to verify the pipeline works end-to-end. This should be a minimal "test" domain (not a real domain) that:
1. Imports shared core types
2. Defines a service with at least one RPC
3. Exercises the full pipeline: buf lint, buf generate, produces client + server + OpenAPI

This test domain can be removed or replaced when Phase 3 introduces the real Environmental domain.

## Open Questions

1. **buf.yaml placement: root vs proto/ subdirectory**
   - What we know: Anghamna puts `buf.yaml` at the repo root with protos under `anghamna/{domain}/v1/`. WorldMonitor could put it at `proto/buf.yaml` with protos under `proto/worldmonitor/{domain}/v1/`, or at project root using buf v2 `modules` config.
   - What's unclear: Whether buf v2 modules config introduces any complexity vs simply placing buf.yaml in `proto/`.
   - Recommendation: Place `buf.yaml` at `proto/buf.yaml` to keep proto tooling self-contained. Run `buf generate` from the `proto/` directory. This is simpler and matches the "proto root = buf module root" convention. The Makefile can `cd proto && buf generate`.

2. **TypeScript compilation of generated files**
   - What we know: tsconfig.json includes `"include": ["src"]` and has `"noEmit": true` with strict checks.
   - What's unclear: Whether the generated `.ts` files will pass the strict TypeScript checks (noUnusedLocals, noUnusedParameters) out of the box.
   - Recommendation: The generated files include `/* eslint-disable */` but no TypeScript compiler directives. If strict checks fail on generated code, add `src/generated/` to a separate tsconfig or add a `// @ts-nocheck` header. However, based on the golden test outputs, the generated code is clean and should pass strict mode. Test this during implementation.

3. **Generated output path for buf.gen.yaml `out` relative to buf.yaml location**
   - What we know: If `buf.yaml` is at `proto/buf.yaml`, the `out` paths in `buf.gen.yaml` are relative to `proto/`.
   - What's unclear: Whether `out: ../src/generated/client` works cleanly from `proto/buf.gen.yaml`.
   - Recommendation: Use relative paths like `out: ../src/generated/client` and `out: ../docs`. Test during implementation. Alternatively, keep buf.gen.yaml at project root and reference the proto module.

## Sources

### Primary (HIGH confidence)
- Anghamna reference project: `/Users/sebastienmelki/Documents/documents_sebastiens_mac_mini/Workspace/kompani/anghamna` -- buf.yaml, buf.gen.yaml, proto directory structure, core types, service definitions, generated output
- Sebuf source code: `/Users/sebastienmelki/Documents/documents_sebastiens_mac_mini/Workspace/kompani/sebuf.nosync` -- protoc-gen-ts-client generator, protoc-gen-ts-server generator, protoc-gen-openapiv3, annotations.proto, golden test outputs
- WorldMonitor codebase: `/Users/sebastienmelki/Documents/documents_sebastiens_mac_mini/Workspace/kompani/worldmonitor.nosync` -- tsconfig.json, vite.config.ts, package.json, existing project structure
- buf CLI installed: v1.64.0

### Secondary (MEDIUM confidence)
- Sebuf BSR module: buf.build/sebmelki/sebuf (confirmed exists, created 2025-08-16)
- Sebuf version: v0.6.0 (latest git tag), plugins installed at `/Users/sebastienmelki/go/bin/`

### Tertiary (LOW confidence)
- None -- all findings verified from source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools verified as installed and working; anghamna reference confirmed
- Architecture: HIGH -- proto structure, generated output format, and buf config all verified from source code and golden tests
- Pitfalls: HIGH -- identified from source code analysis of generators (not speculation)

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable -- sebuf and buf tooling are mature)
