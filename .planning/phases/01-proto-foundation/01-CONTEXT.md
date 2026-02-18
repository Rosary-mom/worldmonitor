# Phase 1: Proto Foundation - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Buf toolchain setup, shared proto types, and TypeScript code generation pipeline. Produces a working `buf generate` that outputs TypeScript clients, server handler interfaces, and OpenAPI v3 specs. All subsequent domain migrations depend on this foundation existing.

</domain>

<decisions>
## Implementation Decisions

### Shared/core types strategy
- Utility types go in core: GeoCoordinates, TimeRange, PaginationRequest/Response, LocalizableString
- Domain-specific types stay in their domain packages — no domain types in core
- Cross-domain references use typed ID wrappers in core (e.g., HotspotID) — same pattern as anghamna's AlbumID, SongID
- Domain-internal IDs stay as plain string fields — no wrappers needed
- Severity enums are domain-specific — each domain defines its own scale (no shared severity)

### Error model (two-layer)
- Core `GeneralError` with oneof subtypes for app-wide conditions (geo-blocked, rate-limited, upstream-down, etc.) — all endpoints can return this
- Per-RPC specific error types defined in each domain (e.g., `GetEarthquakesError`) for endpoint-specific failure modes
- Follows the anghamna pattern: LoginRequest/LoginError/LoginResponse + GeneralError for app-wide conditions

### Proto file organization
- One proto file per RPC (e.g., `get_earthquakes.proto`, `get_fires.proto`) plus `service.proto` and domain model files — matches anghamna pattern exactly
- Proto root directory: `proto/worldmonitor/{domain}/v1/` (subdirectory, not repo root)
- Core/shared types: `proto/worldmonitor/core/v1/`
- One service per domain — domain count and boundaries will be proposed during domain migration phases and tweaked with user approval
- buf.yaml config matches anghamna: STANDARD + COMMENTS lint rules, FILE + PACKAGE + WIRE_JSON breaking change detection, deps on protovalidate + sebuf

### Generated code placement
- Generated TypeScript files committed to git (not generated on build) — PRs show type changes
- Client generation uses sebuf `protoc-gen-ts-client` only — no separate types-only generation (types come from the client package)
- OpenAPI specs also committed to git

### Claude's Discretion
- Exact placement of generated TS client output directory (src/generated/ vs gen/ts/ — choose based on Vite/TS config ergonomics)
- Server-generated code directory organization (choose cleanest structure for client + server separation)
- Domain service boundaries will be proposed by Claude during planning for domain migration phases (Phases 3-7), then refined with user approval

### OpenAPI specification
- Generated in both JSON and YAML formats (matching anghamna)
- One spec per domain/service
- Output to `docs/` directory, committed to git
- Must be flawless — sebuf handles generation quality
- Will be hosted eventually, stored in docs/ for now

</decisions>

<specifics>
## Specific Ideas

- "Check anghamna for inspiration" — follow anghamna's established patterns for buf.yaml, proto structure, core types, and per-RPC file granularity
- anghamna reference project: `/Users/sebastienmelki/Documents/documents_sebastiens_mac_mini/Workspace/kompani/anghamna`
- Key anghamna patterns to replicate: `core/v1/` for shared types, typed ID wrappers for cross-boundary references, `service.proto` + per-RPC files, `sebuf.http.service_config` with `base_path` and per-RPC `config` with `path`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-proto-foundation*
*Context gathered: 2026-02-18*
