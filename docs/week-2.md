# Week 2 Deliverables Plan (Core Data Features)

## Context From Current Codebase

- Auth, RBAC guards, profile API integration, and admin driver verification are already implemented.
- Most product modules are still mock-data based:
  - Passenger: jeepneys, schedules, booking, my bookings, notifications
  - Driver: jeepney, schedules, passengers
  - Admin: dashboard, jeepneys, routes
- Backend currently exposes auth/profile/admin-driver-verification/upload endpoints, but not core transport domain APIs (`routes`, `jeepneys`, `schedules`, `bookings`, `payments`, `notifications`).

## Week 2 Goal

Replace mock-data dependencies for core transport data and deliver real CRUD/read flows for:

1. `routes`
2. `jeepneys`
3. `schedules`

This is the required foundation for Week 3 booking/payment.

## Dependency-Ordered Feature Delivery

## 1) Routes Domain (must be first)

### Deliverables
- Backend:
  - `Route` model, validators, controllers, routes.
  - Endpoints:
    - `GET /routes`
    - `GET /routes/:id`
    - `POST /admin/routes`
    - `PATCH /admin/routes/:id`
    - `DELETE /admin/routes/:id`
- Frontend:
  - Replace mock usage in `src/pages/admin/AdminRoutes.tsx` with API integration.
  - Add shared route API methods/types.

### Dependency Reason
- Jeepneys and schedules both reference route IDs.

## 2) Jeepneys Domain (second)

### Deliverables
- Backend:
  - `Jeepney` model with `driverId`, `routeId`, `capacity`, `status`, `photoKey/photoUrl`.
  - Endpoints:
    - Passenger read:
      - `GET /jeepneys`
      - `GET /jeepneys/:id`
    - Admin CRUD:
      - `POST /admin/jeepneys`
      - `PATCH /admin/jeepneys/:id`
      - `DELETE /admin/jeepneys/:id`
    - Driver own jeepney:
      - `GET /driver/jeepney/me`
      - `PATCH /driver/jeepney/me`
- Frontend:
  - Replace mock usage in:
    - `src/pages/Jeepneys.tsx`
    - `src/pages/JeepneyDetail.tsx`
    - `src/pages/admin/AdminJeepneys.tsx`
    - `src/pages/driver/DriverJeepney.tsx`
  - Keep current R2 upload pattern for jeepney photo (presign + commit) or add dedicated endpoint if needed.

### Dependency Reason
- Schedules reference jeepneys.

## 3) Schedules Domain (third)

### Deliverables
- Backend:
  - `Schedule` model with `jeepneyId`, `routeId`, departure/arrival datetime, status.
  - Seat availability derivation (`capacity - confirmed bookings`), initially booking count may be `0` until Week 3.
  - Endpoints:
    - Passenger read:
      - `GET /schedules`
      - `GET /schedules/:id`
    - Driver own schedules:
      - `GET /driver/schedules`
      - `POST /driver/schedules`
      - `PATCH /driver/schedules/:id`
      - `DELETE /driver/schedules/:id`
    - Admin all schedules:
      - `GET /admin/schedules`
      - `POST /admin/schedules`
      - `PATCH /admin/schedules/:id`
      - `DELETE /admin/schedules/:id`
- Frontend:
  - Replace mock usage in:
    - `src/pages/Schedules.tsx`
    - `src/pages/ScheduleDetail.tsx`
    - `src/pages/driver/DriverSchedules.tsx`
    - `src/pages/admin/AdminDashboard.tsx` (metrics source)
    - `src/pages/driver/DriverDashboard.tsx` (today’s schedules)

### Dependency Reason
- Booking flow in Week 3 depends on real schedules and available seats.

## 4) Week 2 Exit Criteria (Definition of Done)

- No `mock-data` imports remain for routes/jeepneys/schedules related pages above.
- Passenger can browse real jeepneys and schedules from API.
- Driver can manage own jeepney and schedules.
- Admin can CRUD routes, jeepneys, schedules.
- Route guards + RBAC still enforced for all added endpoints.
- Basic API validation and error states are implemented in UI.
- Seed data exists for all 3 roles to demo Week 2 flows.

## Suggested Day Breakdown (2-week remaining timeline aligned)

- Day 1: Routes model/API + Admin Routes UI wiring.
- Day 2-3: Jeepney model/API + Passenger Jeepney pages wiring.
- Day 4: Admin Jeepney + Driver Jeepney wiring.
- Day 5-6: Schedule model/API + Passenger/Driver schedule pages wiring.
- Day 7: Admin schedules + dashboard metrics wiring + regression checks.
