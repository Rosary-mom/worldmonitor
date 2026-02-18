# Phase 2D: Wildfire Migration - Research

**Researched:** 2026-02-18
**Domain:** NASA FIRMS fire detection, WildfireService handler, frontend consumer adaptation
**Confidence:** HIGH

## Summary

Phase 2D migrates the wildfire/FIRMS domain to sebuf. This is more complex than seismology (2C) because:
1. **Shape mismatch**: Proto has flat `FireDetection[]`, frontend needs region-grouped data with computed stats
2. **CSV parsing**: FIRMS API returns CSV, not JSON — handler must parse CSV
3. **Env-var gating**: Requires `NASA_FIRMS_API_KEY` — handler must gracefully degrade
4. **Proto gaps**: `FireDetection` missing fields consumers need (`region`, `daynight`, `scan`, `track`, `acq_date`)
5. **Real business logic**: `computeRegionStats()`, `flattenFires()` — justifies a service module (not just a pointless wrapper)

## Current State

### Legacy Endpoint: `api/firms-fires.js`
- Edge function, fetches 9 hardcoded regions from NASA FIRMS CSV API in parallel
- Parses CSV, maps confidence letters (h/n/l) to numeric, returns `{ regions: Record<string, FireDataPoint[]>, totalCount }`
- Returns `{ skipped: true }` if no API key
- 10-minute cache via `Cache-Control: public, max-age=600`

### Legacy Service: `src/services/firms-satellite.ts`
Exports:
- `fetchAllFires(days)` → `FiresFetchResult` (calls `/api/firms-fires`)
- `fetchFiresForRegion(region, days)` → `FireDataPoint[]`
- `computeRegionStats(regions)` → `FireRegionStats[]` (pure utility)
- `flattenFires(regions)` → flat array with region tag (pure utility)

### Consumers
1. **App.ts:loadFirmsData()** — calls `fetchAllFires()`, then `flattenFires()`, `computeRegionStats()`. Feeds:
   - Signal aggregator (needs `lat, lon, brightness, frp, region, acq_date`)
   - Map layer via `setFires()` (needs `lat, lon, brightness, frp, confidence, region, acq_date, daynight`)
   - SatelliteFiresPanel (needs `FireRegionStats[]`)
2. **SatelliteFiresPanel** — displays region stats table
3. **signal-aggregator.ts** — references firms data

### Proto: `WildfireService`
Single RPC `ListFireDetections`:
- Request: `time_range`, `pagination`, `bounding_box`
- Response: `fire_detections: FireDetection[]`, `pagination`
- `FireDetection`: `id, location, brightness, frp, confidence (enum), satellite, detectedAt`

### Generated Code
- Client: `WildfireServiceClient.listFireDetections(req)` → `ListFireDetectionsResponse`
- Server: `WildfireServiceHandler.listFireDetections(ctx, req)` → `ListFireDetectionsResponse`
- Route: `POST /api/wildfire/v1/list-fire-detections`

## Proto Enhancement Needed

`FireDetection` is missing fields that consumers need:

| Field | Proto | Frontend needs | Resolution |
|-------|-------|----------------|------------|
| `region` | missing | Map, signal aggregator, panel | Add `string region = 8` |
| `daynight` | missing | Map layer | Add `string day_night = 9` |
| `scan` | missing | Legacy only | Drop — not used meaningfully |
| `track` | missing | Legacy only | Drop |
| `acq_date` | missing | Signal aggregator, Map | Use `detectedAt` (epoch ms) instead |
| `acq_time` | missing | Legacy only | Use `detectedAt` |
| `bright_t31` | missing | Legacy only | Drop |

**Decision**: Add `region` and `day_night` to `FireDetection`. Drop `scan`, `track`, `bright_t31`, `acq_date`, `acq_time` — consumers can derive date from `detectedAt`.

## Handler Design

### FIRMS API Details
- Base: `https://firms.modaps.eosdis.nasa.gov/api/area/csv`
- Pattern: `{base}/{api_key}/{SOURCE}/{bbox}/{days}`
- Source: `VIIRS_SNPP_NRT`
- Returns CSV with headers: `latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,bright_ti5,frp,daynight`
- Confidence values: `h` (high), `n` (nominal), `l` (low) — maps to proto enum

### Handler Implementation
```
api/server/worldmonitor/wildfire/v1/handler.ts
```
- Read `NASA_FIRMS_API_KEY` from `process.env`
- If missing: return empty `{ fireDetections: [], pagination: undefined }` (no error — matches graceful degradation pattern)
- Fetch all 9 monitored regions in parallel via `Promise.allSettled`
- Parse CSV per region
- Map to `FireDetection[]` with `region` field assigned
- Map confidence letter → enum: `h` → `FIRE_CONFIDENCE_HIGH`, `n` → `FIRE_CONFIDENCE_NOMINAL`, `l` → `FIRE_CONFIDENCE_LOW`

### Monitored Regions (hardcoded, same as legacy)
Ukraine, Russia, Iran, Israel/Gaza, Syria, Taiwan, North Korea, Saudi Arabia, Turkey

## Service Module Design

Given koussa-style directory-per-service preference and real business logic:

```
src/services/wildfires/
  index.ts     # Exports: fetchAllFires(), computeRegionStats(), flattenFires(), FireDetection type
```

This module is justified because:
- `computeRegionStats()` — non-trivial computation (high intensity filtering, FRP sums)
- `flattenFires()` — reshapes region-grouped data for map/signal consumers
- Region grouping logic — proto returns flat list, consumers need by-region
- Graceful degradation for missing API key (skipped state)

**NOT a port/adapter** — it's a real service module with business logic. If the proto types were consumed directly, consumers would need to duplicate this logic.

## Consumer Adaptation

### App.ts:loadFirmsData()
- Change import: `@/services/firms-satellite` → `@/services/wildfires`
- `fetchAllFires()` return type changes from `FiresFetchResult` to adapted type
- `flattenFires()` output shape changes: `lat/lon` → `location.latitude/location.longitude`
- Signal aggregator feed needs field mapping
- Map `setFires()` needs field mapping from proto type

### SatelliteFiresPanel
- Import `FireRegionStats` from `@/services/wildfires` instead of `@/services/firms-satellite`

### Map layer
- `setFires()` signature expects `{ lat, lon, brightness, frp, confidence, region, acq_date, daynight }`
- Need to either:
  a. Change signature to accept proto-shaped data
  b. Map in the caller (App.ts)
- **Recommendation:** Map in the service module — export a `toMapFire()` helper or adjust `flattenFires()` output

## Gateway Integration

`api/[[...path]].ts`:
- Import `createWildfireServiceRoutes` and `wildfireHandler`
- Add to `allRoutes` array

Also rebuild sidecar bundle (`npm run build:sidecar-sebuf`).

## Cleanup

Delete:
- `api/firms-fires.js` — replaced by handler
- `src/services/firms-satellite.ts` — replaced by `src/services/wildfires/`

Check `vite.config.ts` — no FIRMS proxy found (it was a direct fetch to `/api/firms-fires`).

## Metadata

**Confidence:** HIGH
- All files examined, shapes verified, consumer chain traced
- Pattern established by seismology (2C) with known deviations documented
