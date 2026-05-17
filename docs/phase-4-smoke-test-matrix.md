# Phase 4 Smoke Test Matrix

## Preconditions
- Backend running at `http://localhost:4000` (or set `API_BASE_URL`).
- MongoDB connected.
- Seed executed: `npm run seed:week2` in `apps/api`.

## Seeded test accounts
- Admin: `admin@gmail.com` / `qweasd123`
- Drivers: `driver1@gmail.com`, `driver2@gmail.com`, `driver3@gmail.com`, `driver4@gmail.com` / `qweasd123`
- Passengers: `passenger1@gmail.com`, `passenger2@gmail.com` / `qweasd123`

## Matrix

### Admin
- Can create/update/deactivate route.
- Can create/update/deactivate jeepney.
- Can create/update/delete schedule.

### Driver
- Can read/update own jeepney via `/driver/jeepney/me`.
- Can list/create/update/delete own schedules via `/driver/schedules/me`.
- Cannot create admin resources (`/admin/*` returns `403`).
- Cannot update another driver's schedule (`404` via scoped own endpoint).

### Passenger
- Can read `/jeepneys`.
- Can read `/schedules`.
- Cannot access driver own endpoints (`403`).

## Run automated smoke checks
From `apps/api`:

```bash
npm run smoke:rbac
```

Environment overrides:

```bash
API_BASE_URL=http://localhost:4000/api/v1 SEED_TEST_PASSWORD=qweasd123 npm run smoke:rbac
```
