---
phase: 2C-seismology-migration
plan: 01
subsystem: api
tags: [protobuf, int64, typescript, code-generation, sebuf]

# Dependency graph
requires:
  - phase: 02-server-runtime
    provides: sebuf proto definitions, generated TypeScript clients/servers, handler infrastructure
provides:
  - INT64_ENCODING_NUMBER annotations on all 34 int64 time fields across 20 proto files
  - Vendored sebuf/http/annotations.proto with Int64Encoding extension (50010)
  - Generated TypeScript types with `number` for all time fields (not `string`)
  - Seismology handler returning occurredAt as number
affects: [2C-seismology-migration, 2D-through-2S-migrations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "INT64_ENCODING_NUMBER annotation on all _at suffix int64 fields"
    - "Vendored sebuf proto (local instead of BSR) for annotation extensions"

key-files:
  created:
    - proto/sebuf/http/annotations.proto
  modified:
    - proto/buf.yaml
    - proto/buf.gen.yaml
    - proto/buf.lock
    - proto/worldmonitor/seismology/v1/earthquake.proto
    - proto/worldmonitor/wildfire/v1/fire_detection.proto
    - proto/worldmonitor/aviation/v1/airport_delay.proto
    - proto/worldmonitor/military/v1/military_vessel.proto
    - proto/worldmonitor/military/v1/military_flight.proto
    - proto/worldmonitor/intelligence/v1/intelligence.proto
    - proto/worldmonitor/intelligence/v1/get_country_intel_brief.proto
    - proto/worldmonitor/infrastructure/v1/infrastructure.proto
    - proto/worldmonitor/news/v1/news_item.proto
    - proto/worldmonitor/conflict/v1/acled_event.proto
    - proto/worldmonitor/conflict/v1/humanitarian_summary.proto
    - proto/worldmonitor/conflict/v1/ucdp_event.proto
    - proto/worldmonitor/unrest/v1/unrest_event.proto
    - proto/worldmonitor/prediction/v1/prediction_market.proto
    - proto/worldmonitor/maritime/v1/vessel_snapshot.proto
    - proto/worldmonitor/cyber/v1/cyber_threat.proto
    - proto/worldmonitor/economic/v1/economic_data.proto
    - proto/worldmonitor/research/v1/research_item.proto
    - proto/worldmonitor/core/v1/time.proto
    - proto/worldmonitor/core/v1/general_error.proto
    - api/server/worldmonitor/seismology/v1/handler.ts
    - src/generated/client/**/*.ts (14 domain clients regenerated)
    - src/generated/server/**/*.ts (14 domain servers regenerated)

key-decisions:
  - "Vendored sebuf/http/annotations.proto locally instead of updating BSR module -- BSR proto lacks Int64Encoding extension"
  - "Removed buf.build/sebmelki/sebuf BSR dep, excluded vendored sebuf/ from buf lint"
  - "Annotated 34 fields across 20 files (3 more than plan's 17 -- added ucdp_event, core/time, core/general_error)"
  - "Non-time int64 fields (displacement counts, population) deliberately NOT annotated"

patterns-established:
  - "INT64_ENCODING_NUMBER: all int64 timestamp fields (suffix _at or clearly temporal) get this annotation"
  - "Vendored proto override: when BSR module lacks needed extensions, vendor locally with lint ignore"

requirements-completed: [CLIENT-01, SERVER-02]

# Metrics
duration: 14min
completed: 2026-02-18
---

# Phase 2C Plan 01: INT64_ENCODING_NUMBER Summary

**Vendored Int64Encoding proto extension, annotated 34 time fields across 20 protos, regenerated all TypeScript with `number` types for timestamps**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-18T14:44:41Z
- **Completed:** 2026-02-18T14:59:00Z
- **Tasks:** 1
- **Files modified:** 81

## Accomplishments
- Vendored `sebuf/http/annotations.proto` with `Int64Encoding` enum and `int64_encoding` field extension (50010)
- Annotated 34 int64 time fields across 20 proto files with `INT64_ENCODING_NUMBER`
- Regenerated all TypeScript client and server code -- all time fields now generate as `number` instead of `string`
- Fixed seismology handler to return `occurredAt` as number (removed `String()` wrapper)
- All verification passes: `buf lint`, `buf generate`, `tsc --noEmit`, `build:sidecar-sebuf`

## Task Commits

Each task was committed atomically:

1. **Task 1: Annotate all int64 time fields with INT64_ENCODING_NUMBER and regenerate** - `b154282` (feat)

## Files Created/Modified
- `proto/sebuf/http/annotations.proto` - Vendored sebuf annotations with Int64Encoding extension
- `proto/buf.yaml` - Removed BSR sebuf dep, added lint ignore for vendored sebuf/
- `proto/buf.gen.yaml` - Removed BSR module managed mode override
- `proto/buf.lock` - Updated after removing BSR dep
- `proto/worldmonitor/*/v1/*.proto` - 20 proto files annotated with INT64_ENCODING_NUMBER
- `api/server/worldmonitor/seismology/v1/handler.ts` - occurredAt returns number directly
- `src/generated/client/**/*.ts` - 14 domain clients regenerated with number types
- `src/generated/server/**/*.ts` - 14 domain servers regenerated with number types
- `docs/api/*.{json,yaml}` - 28 OpenAPI docs regenerated

## Decisions Made
- **Vendored sebuf proto locally:** The BSR-published `buf.build/sebmelki/sebuf` annotations.proto does not include the `Int64Encoding` extension. Rather than modifying the sebuf repo and pushing to BSR (separate project), vendored the full annotations.proto locally with the extension added. This keeps the change self-contained within worldmonitor.
- **Excluded vendored sebuf/ from lint:** The original BSR proto didn't follow worldmonitor's strict COMMENTS lint rules. Added `ignore: [sebuf]` to `buf.yaml` lint config.
- **Annotated 3 additional proto files beyond plan:** Discovered `ucdp_event.proto` (date_start, date_end), `core/v1/time.proto` (start, end), and `core/v1/general_error.proto` (estimated_end) also have temporal int64 fields. Annotated them for completeness.
- **Left displacement/humanitarian population counts as string:** Fields like `refugees`, `asylum_seekers`, `total_displaced`, `population_affected` etc. are NOT timestamps and could theoretically exceed `Number.MAX_SAFE_INTEGER` in edge cases. Left as string per plan guidance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Annotated 3 additional proto files with time fields**
- **Found during:** Task 1 (comprehensive int64 field grep)
- **Issue:** Plan listed 17 proto files but missed `ucdp_event.proto` (date_start, date_end), `core/v1/time.proto` (start, end), and `core/v1/general_error.proto` (estimated_end) -- all clearly temporal int64 fields
- **Fix:** Added INT64_ENCODING_NUMBER annotations to these 5 additional fields across 3 files
- **Files modified:** proto/worldmonitor/conflict/v1/ucdp_event.proto, proto/worldmonitor/core/v1/time.proto, proto/worldmonitor/core/v1/general_error.proto
- **Verification:** buf lint passes, buf generate succeeds, tsc passes
- **Committed in:** b154282 (part of task commit)

**2. [Rule 3 - Blocking] Vendored sebuf annotations.proto instead of updating BSR**
- **Found during:** Task 1, Step 1 (resolving BSR annotation blocker)
- **Issue:** BSR-published sebuf module lacks Int64Encoding extension; sebuf source repo on local disk is empty (only .idea directory)
- **Fix:** Vendored complete annotations.proto locally with Int64Encoding enum + int64_encoding field extension (50010). Removed BSR dep, added lint ignore for vendored dir.
- **Files modified:** proto/sebuf/http/annotations.proto, proto/buf.yaml, proto/buf.gen.yaml, proto/buf.lock
- **Verification:** buf lint passes with ignore, buf generate resolves annotations correctly
- **Committed in:** b154282 (part of task commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for completeness and correctness. No scope creep.

## Issues Encountered
None - all steps executed smoothly after resolving the BSR blocker via vendoring.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All generated TypeScript types now use `number` for time fields -- prerequisite complete for all domain migrations
- Seismology handler compiles and builds correctly with number-typed occurredAt
- Ready for 2C-02 (seismology client wiring) or subsequent domain migration plans

## Self-Check: PASSED

- proto/sebuf/http/annotations.proto: FOUND
- api/server/worldmonitor/seismology/v1/handler.ts: FOUND
- src/generated/client/worldmonitor/seismology/v1/service_client.ts: FOUND
- .planning/phases/2C-seismology-migration/2C-01-SUMMARY.md: FOUND
- Commit b154282: FOUND

---
*Phase: 2C-seismology-migration*
*Completed: 2026-02-18*
