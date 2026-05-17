# Week 2 Detailed Implementation Plan (Routes, Jeepneys, Schedules)

## Objective

Implement Week 2 core data features in strict dependency order:

1. `routes`
2. `jeepneys`
3. `schedules`

This plan is based on `jee-ps-prd.md` and `docs/week-2.md`, and tuned to your current codebase (auth/rbac/profile already in place, transport modules still mostly mock-data based).

## Scope Guardrails

- Build only what unblocks Week 3 booking/payment.
- Keep Cebu routes minimal for MVP demo (seed a small realistic set, do not model the entire city route network yet).
- Keep frontend UX consistent with existing screens; replace mock sources incrementally.

## Proposed Output Files (Planning + Tracking)

- `docs/week-2-implementation-plan.md` (this file)
- Optional progress tracker:
  - `docs/week-2-progress.md` (daily status by module)

## Phase 0: Preparation (Half day)

1. Freeze feature scope for Week 2:
   - No booking/payment implementation yet.
   - Only routes/jeepneys/schedules + dashboards that depend on them.
2. Create a branch:
   - `feature/week2-routes-jeepneys-schedules`
3. Add common enums/constants in backend for:
   - jeepney status (`active|inactive`)
   - schedule status (`upcoming|ongoing|completed|cancelled`)
4. Add shared frontend API modules:
   - `src/features/routes/api.ts`
   - `src/features/jeepneys/api.ts`
   - `src/features/schedules/api.ts`

## Phase 1: Routes (Must be first)

## Backend Steps

1. Create model `Route` in `apps/api/src/models/route.model.ts`:
   - fields: `name`, `origin`, `destination`, `baseFare`, `isActive`
   - indexes: `name`, `isActive`
2. Export model in `apps/api/src/models/index.ts`.
3. Add validators in `apps/api/src/validators/route.validator.ts`:
   - create/update payload schemas
   - list query schema (search/isActive)
4. Add controller `apps/api/src/controllers/route.controller.ts`:
   - `listRoutes`, `getRouteById`, `createRoute`, `updateRoute`, `deleteRoute`
5. Add routes:
   - `apps/api/src/routes/route.routes.ts`
   - Public read:
     - `GET /routes`
     - `GET /routes/:id`
   - Admin write (require auth + role admin):
     - `POST /admin/routes`
     - `PATCH /admin/routes/:id`
     - `DELETE /admin/routes/:id` (soft delete preferred via `isActive=false`)
6. Register route routers in `apps/api/src/routes/index.ts`.

## Frontend Steps

1. Replace mock usage in `src/pages/admin/AdminRoutes.tsx` with API calls.
2. Load route list from API for:
   - admin table
   - dropdown selectors in jeepney/schedule forms
3. Add create/edit/delete handlers with toast/error handling.
4. Keep filtering/search local in UI initially; server-side query optional.

## Cebu Seed Data (Minimal)

Use 4-6 routes only for MVP demo:

- `Ayala Center Cebu -> IT Park`
- `SM City Cebu -> Colon`
- `Parkmall Mandaue -> Ayala Center Cebu`
- `Talamban -> Fuente Osmena`
- `Colon -> Carbon`

Use this as seed/sample only; expand later if needed.

## Phase 2: Jeepneys (Depends on routes)

## Backend Steps

1. Create model `Jeepney` in `apps/api/src/models/jeepney.model.ts`:
   - fields:
     - `code` (display identifier)
     - `plateNumber` (unique)
     - `routeId` (ref Route)
     - `driverId` (ref User, role driver)
     - `capacity`
     - `status`
     - `photoKey` (optional)
2. Add validators in `apps/api/src/validators/jeepney.validator.ts`.
3. Add controller `apps/api/src/controllers/jeepney.controller.ts`:
   - passenger read:
     - `listJeepneys`, `getJeepneyById`
   - admin CRUD:
     - `createJeepney`, `updateJeepney`, `deleteJeepney`
   - driver own:
     - `getMyJeepney`, `updateMyJeepney`
4. Add routes in `apps/api/src/routes/jeepney.routes.ts`:
   - `GET /jeepneys`
   - `GET /jeepneys/:id`
   - admin: `POST/PATCH/DELETE /admin/jeepneys...`
   - driver: `GET/PATCH /driver/jeepney/me`
5. Register in main router.
6. Enforce role checks:
   - admin full CRUD
   - driver only own jeepney

## Frontend Steps

1. Replace mock data in:
   - `src/pages/Jeepneys.tsx`
   - `src/pages/JeepneyDetail.tsx`
   - `src/pages/admin/AdminJeepneys.tsx`
   - `src/pages/driver/DriverJeepney.tsx`
2. Wire route dropdowns from real routes API.
3. Keep existing layout/components; only replace data source and actions.
4. For photo:
   - reuse current upload pattern (presign + upload + commit metadata).
   - if no endpoint yet, keep `photoKey` optional for Week 2.

## Phase 3: Schedules (Depends on routes + jeepneys)

## Backend Steps

1. Create model `Schedule` in `apps/api/src/models/schedule.model.ts`:
   - fields:
     - `jeepneyId` (ref Jeepney)
     - `routeId` (ref Route)
     - `departureAt`, `arrivalAt`
     - `status`
2. Add validators in `apps/api/src/validators/schedule.validator.ts`:
   - create/update/list filter by route/date/status
3. Add controller `apps/api/src/controllers/schedule.controller.ts`:
   - passenger:
     - `listSchedules`, `getScheduleById`
   - driver own:
     - `listMySchedules`, `createMySchedule`, `updateMySchedule`, `deleteMySchedule`
   - admin all:
     - `listAdminSchedules`, `createSchedule`, `updateSchedule`, `deleteSchedule`
4. Add routes `apps/api/src/routes/schedule.routes.ts`.
5. Compute `availableSeats` response field:
   - Week 2 temporary: `capacity` (or `capacity - confirmedBookingsCount`, default count 0 until bookings exist).
6. Register routers.

## Frontend Steps

1. Replace mock usage in:
   - `src/pages/Schedules.tsx`
   - `src/pages/ScheduleDetail.tsx`
   - `src/pages/driver/DriverSchedules.tsx`
2. Update dashboards to read live counts:
   - `src/pages/admin/AdminDashboard.tsx`
   - `src/pages/driver/DriverDashboard.tsx`
3. Keep current filters (route/date/status), but bind to API query params.

## Phase 4: Data Seed + Migration + Smoke Tests

1. Add seed script for week-2 data:
   - routes (Cebu sample)
   - 3-5 jeepneys linked to routes
   - 8-12 upcoming schedules across 2-3 days
2. Ensure test users exist:
   - 1 admin, 2 drivers, 2 passengers
3. Smoke-test matrix:
   - admin CRUD routes/jeepneys/schedules
   - driver can only manage own jeepney/schedules
   - passenger can read jeepneys/schedules
4. Remove/disable mock-data imports from Week 2 pages.

## Phase 5: Stabilization (End of Week 2)

1. API validation hardening:
   - bad IDs
   - invalid date ranges (`arrivalAt < departureAt`)
   - invalid capacity
2. UI error handling:
   - loading skeletons
   - empty states
   - retry actions for failed fetch
3. Regression checks:
   - auth refresh + protected route behavior still intact
   - admin/driver/passenger redirects still correct

## Suggested 7-Day Execution Plan

1. Day 1: Routes backend + admin routes frontend.
2. Day 2: Jeepney backend read/admin endpoints.
3. Day 3: Driver own jeepney endpoints + jeepney passenger pages.
4. Day 4: Schedule backend read endpoints + passenger schedule pages.
5. Day 5: Driver/admin schedule management pages.
6. Day 6: Seed data + dashboard metric wiring + bug fixes.
7. Day 7: QA sweep + cleanup + demo script for Week 2 milestone.

## Week 2 Definition of Done

- All Week 2 target pages use real API data (no route/jeepney/schedule mock source).
- Admin can CRUD routes, jeepneys, schedules.
- Driver can manage own jeepney and schedules only.
- Passenger can browse jeepneys and schedules with filters.
- Cebu sample routes and schedules available for demo.
- Code is buildable on frontend and backend with no blocking runtime errors.
