# Weather coverage and live updates

Reviewed GitHub main at `ead517d` (22 October 2026). Recent changes moved the frontend into `frontend/`, integrated weather, report and news workflows, and fixed Alembic configuration and moderation queue ordering. The newest commit updates the README.

## Changes

- Expand both location seed files from five to 30 cities across India. Existing location IDs remain unchanged because seeding upserts by slug.
- Remove backend connection labels, origin/configuration paths, raw measurement-basis codes and public diagnostic metadata. Provider attribution and model-derived labels remain visible.
- Show a local clock with seconds and time zone. Observation timestamps remain the actual provider timestamps, with an explicit outdated label after two hours.
- Refresh dashboard queries and weather, trend, comparison, event, anomaly and news queries every 30 seconds, plus when returning to the tab or reconnecting. Preserve location, metric and pagination selections. Initial date windows follow the clock; manually edited date windows remain fixed. Pause automatic refresh while editing forms or inspecting a dialog.
- Start newly enabled collector schedules immediately. Add `enable-weather` to enable Open-Meteo collection every 15 minutes without replacing existing provider configuration.

## Apply to an existing backend

From `backend/`, using its configured Python environment and database:

```powershell
python -m app.cli seed-sources
python -m app.cli seed-locations --file config/locations.yaml
python -m app.cli enable-weather
```

Set `INGESTION_ENABLED=true` in the backend's runtime environment and restart its worker:

```powershell
python -m app.worker
```

Keep this process running under the deployment's process manager. The API process does not run the collector. Newly added cities show missing data until collection succeeds. The browser refresh reads stored observations; it does not issue provider requests. Hourly model observations retain their observation time even when checked more frequently. Do not change that timestamp to make old data look current.

Deploy the updated `frontend/dist` assets including **live.js**. `dist/config.js` must point to the deployment's backend and its origin must be included in backend CORS settings.

## Validation

Frontend syntax, ESLint, build and refresh regression tests. Targeted Python tests cover 30-city configuration, immediate collection schedules, enabling collection without resetting source configuration, Open-Meteo normalization and adapter behavior. Database-backed integration tests require a dedicated configured PostgreSQL test database.
