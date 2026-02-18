---
phase: 2D-wildfire-migration
plan: 01
subsystem: api
tags: [nasa-firms, wildfire, csv-parsing, proto, edge-function]

# Dependency graph
requires:
  - phase: 2B-server-infra
    provides: Catch-all gateway, router, error-mapper, sidecar build pipeline
  - phase: 2A-domain-protos
    provides: WildfireService proto definitions (service.proto, fire_detection.proto)
provides:
  - Working POST /api/wildfire/v1/list-fire-detections endpoint
  - WildfireServiceHandler implementation proxying NASA FIRMS CSV API
  - FireDetection proto with region and day_night fields
  - Gateway with wildfire routes mounted alongside seismology
affects: [2D-wildfire-migration plan 02, frontend wildfire consumers]

# Tech tracking
tech-stack:
  added: []
  patterns: [csv-parsing handler, env-var gating pattern, parallel region fetching via Promise.allSettled]

key-files:
  created:
    - api/server/worldmonitor/wildfire/v1/handler.ts
  modified:
    - proto/worldmonitor/wildfire/v1/fire_detection.proto
    - src/generated/client/worldmonitor/wildfire/v1/service_client.ts
    - src/generated/server/worldmonitor/wildfire/v1/service_server.ts
    - api/[[...path]].ts
    - docs/api/WildfireService.openapi.json
    - docs/api/WildfireService.openapi.yaml

key-decisions:
  - "Confidence enum mapped as string union ('FIRE_CONFIDENCE_HIGH' etc.) matching generated FireConfidence type"
  - "ID generated from lat-lon-date-time composite for uniqueness across regions"
  - "Graceful degradation returns empty list (no error) when API key is missing"

patterns-established:
  - "CSV-parsing handler: parseCSV helper splits headers/rows, maps by header index"
  - "Env-var gating: check env var, return empty response if missing, no error thrown"
  - "Multi-region parallel fetch: Promise.allSettled with per-region error logging"

requirements-completed: [DOMAIN-01, SERVER-02]

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 2D Plan 01: Wildfire Handler Summary

**WildfireService handler proxying NASA FIRMS CSV API for 9 monitored regions with env-var gating and proto-typed FireDetection responses**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T16:16:29Z
- **Completed:** 2026-02-18T16:18:55Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Enhanced FireDetection proto with region (field 8) and day_night (field 9) fields
- Implemented WildfireServiceHandler that fetches all 9 monitored regions from NASA FIRMS CSV API in parallel
- Wired wildfire routes into the catch-all gateway alongside seismology
- Sidecar bundle rebuilt with wildfire endpoint included

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance FireDetection proto, regenerate, and implement wildfire handler** - `d27e33e` (feat)
2. **Task 2: Wire wildfire routes into gateway and rebuild sidecar** - `fd220dd` (feat)

## Files Created/Modified
- `proto/worldmonitor/wildfire/v1/fire_detection.proto` - Added region and day_night fields
- `api/server/worldmonitor/wildfire/v1/handler.ts` - WildfireServiceHandler implementation proxying NASA FIRMS CSV
- `src/generated/client/worldmonitor/wildfire/v1/service_client.ts` - Regenerated with new fields
- `src/generated/server/worldmonitor/wildfire/v1/service_server.ts` - Regenerated with new fields
- `api/[[...path]].ts` - Mounted wildfire routes in catch-all gateway
- `docs/api/WildfireService.openapi.json` - Regenerated OpenAPI spec
- `docs/api/WildfireService.openapi.yaml` - Regenerated OpenAPI spec

## Decisions Made
- Confidence enum mapped as string union values matching generated FireConfidence type (not numeric)
- Fire detection ID uses composite key (lat-lon-date-time) for uniqueness instead of sequential index
- Graceful degradation pattern: return empty fireDetections array when NASA_FIRMS_API_KEY is not set, no error thrown
- Both NASA_FIRMS_API_KEY and FIRMS_API_KEY env vars supported (matching legacy handler pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. NASA_FIRMS_API_KEY is an existing env var.

## Next Phase Readiness
- Backend wildfire endpoint fully operational
- Ready for Plan 02: service module, consumer adaptation, and legacy cleanup
- Legacy `api/firms-fires.js` still exists (to be removed in Plan 02)
- Frontend consumers still use `src/services/firms-satellite.ts` (to be adapted in Plan 02)

## Self-Check: PASSED

All files verified present. Both task commits (d27e33e, fd220dd) confirmed in git log.

---
*Phase: 2D-wildfire-migration*
*Completed: 2026-02-18*
