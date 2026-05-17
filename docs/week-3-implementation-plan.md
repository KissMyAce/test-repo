# Week 3 Detailed Implementation Plan (Booking, Payment, Notifications, PWA, Final QA)

## Objective

Implement Week 3 transactional deliverables in strict dependency order from `docs/week-3.md`:

1. Booking domain
2. Payment domain
3. Notifications domain
4. Admin/Driver transaction views
5. PWA + final hardening

This plan assumes Week 2 transport modules are already API-backed (`routes`, `jeepneys`, `schedules`).

## Scope Guardrails

- Week 3 must finish passenger transaction flow end-to-end.
- No expansion into non-critical product features outside `week-3.md`.
- Prioritize correctness, RBAC, and recoverability over UI polish.
- Keep API contracts stable and versioned under `/api/v1`.

## Phase 0: Preparation and Baseline (Half day)

1. Create branch:
   - `feature/week3-transactions-pwa`
2. Snapshot current state:
   - Run backend tests and frontend build before changes.
   - Save baseline smoke script output.
3. Confirm out-of-scope pages/features for this sprint.
4. Add a tracking checklist doc:
   - `docs/week-3-progress.md` (daily status + blockers).

## Phase 1: Booking Domain (Must be first)

## Backend Steps

1. Create booking model in `apps/api/src/models/booking.model.ts`:
   - Fields:
     - `bookingRef` (unique readable ref)
     - `passengerId` (ref `User`)
     - `scheduleId` (ref `Schedule`)
     - `routeSnapshot` (name/origin/destination at booking time)
     - `jeepneySnapshot` (code/plate/capacity at booking time)
     - `seats`
     - `unitFare`
     - `totalFare`
     - `status` (`pending`, `confirmed`, `cancelled`, `failed_payment`)
     - `cancelReason` (optional)
     - timestamps
2. Export model in `apps/api/src/models/index.ts`.
3. Add validators in `apps/api/src/validators/booking.validator.ts`:
   - `createBookingSchema`
   - `listMyBookingsSchema`
   - `getMyBookingByIdSchema`
   - `cancelMyBookingSchema`
   - `listAdminBookingsSchema`
   - `updateAdminBookingSchema`
   - `listDriverBookingsSchema`
4. Add booking availability logic:
   - Confirm schedule exists and is `scheduled`.
   - Confirm requested seats > 0.
   - Compute `confirmedSeats + pendingSeats` against capacity.
   - Use atomic strategy:
     - Option A: Mongo transaction/session.
     - Option B: atomic counter update on schedule.
   - Prevent overbooking race on concurrent requests.
5. Create controller `apps/api/src/controllers/booking.controller.ts`:
   - Passenger:
     - `createBooking`
     - `listMyBookings`
     - `getMyBookingById`
     - `cancelMyBooking`
   - Admin:
     - `listAdminBookings`
     - `updateAdminBooking`
   - Driver:
     - `listDriverBookings` (bookings tied to driver-owned jeepney schedules)
6. Add routes in `apps/api/src/routes/booking.routes.ts`:
   - Passenger:
     - `POST /bookings`
     - `GET /bookings/me`
     - `GET /bookings/me/:id`
     - `PATCH /bookings/me/:id/cancel`
   - Admin:
     - `GET /admin/bookings`
     - `PATCH /admin/bookings/:id`
   - Driver:
     - `GET /driver/bookings`
7. Register routers in `apps/api/src/routes/index.ts`.
8. Update schedule response availability logic:
   - `availableSeats = capacity - (pending + confirmed seats)` from bookings.

## Frontend Steps

1. Extend API client in `src/features/auth/api.ts`:
   - `createBookingRequest`
   - `getMyBookingsRequest`
   - `getMyBookingByIdRequest`
   - `cancelMyBookingRequest`
   - `getDriverBookingsRequest`
   - `getAdminBookingsRequest`
   - `updateAdminBookingRequest`
2. Update `src/pages/Booking.tsx`:
   - Keep route/schedule selection from real API.
   - On confirm, call `POST /bookings`.
   - Navigate to `/payment` with booking ID/ref in query/state.
3. Replace mock in `src/pages/MyBookings.tsx`:
   - Load from `GET /bookings/me`.
   - Filter/search client-side first.
4. Replace mock in `src/pages/BookingDetail.tsx`:
   - Load from `GET /bookings/me/:id`.
   - Add cancel flow with `PATCH /bookings/me/:id/cancel`.
5. Update `src/pages/driver/DriverPassengers.tsx`:
   - Replace schedule-only occupancy with real driver booking feed from `/driver/bookings`.
   - Group/filter by schedule.

## Booking Test Steps

1. Model tests:
   - status enum, totals, required fields.
2. Controller tests:
   - passenger can create own booking.
   - reject over-capacity.
   - race test for seat contention.
   - passenger cannot access another passenger booking.
   - driver only sees bookings for own schedules.
3. Smoke RBAC extension:
   - admin manage, driver read-own, passenger self-only.

## Phase 2: Payment Domain

## Backend Steps

1. Create payment model `apps/api/src/models/payment.model.ts`:
   - Fields:
     - `bookingId` (ref `Booking`)
     - `provider` (e.g., mock/manual/gateway)
     - `providerPaymentId` (unique/indexed where relevant)
     - `amount`
     - `currency`
     - `status` (`pending`, `succeeded`, `failed`, `expired`)
     - `rawPayload` (optional audit object)
     - timestamps
2. Export model in `apps/api/src/models/index.ts`.
3. Add validators in `apps/api/src/validators/payment.validator.ts`:
   - `createPaymentIntentSchema`
   - `paymentWebhookSchema`
   - `getPaymentByBookingSchema`
4. Add controller `apps/api/src/controllers/payment.controller.ts`:
   - `createPaymentIntent`
   - `handlePaymentWebhook`
   - `getPaymentByBookingId` (optional but recommended for status page)
5. Add booking-status linkage service:
   - success => booking `confirmed`
   - failed/expired => booking remains `pending` or `failed_payment`
6. Implement idempotent webhook handling:
   - idempotency key from provider event ID.
   - ignore duplicate webhook events safely.
7. Add routes in `apps/api/src/routes/payment.routes.ts`:
   - `POST /payments/intent`
   - `POST /payments/webhook`
   - `GET /payments/:bookingId` (if implemented)
8. Register in main router.

## Frontend Steps

1. Add payment client methods in `src/features/auth/api.ts`:
   - `createPaymentIntentRequest`
   - `getPaymentByBookingRequest` (if endpoint exists)
2. Replace simulated `src/pages/Payment.tsx`:
   - Read booking ID/ref from state/query.
   - Create payment intent and render provider redirect/info.
3. Replace simulated `src/pages/PaymentStatus.tsx`:
   - Poll payment status or retrieve final status from API.
   - Show booking status + next action.

## Payment Test Steps

1. Unit tests for payment status transition mapping.
2. Webhook idempotency test (same event twice).
3. Integration test:
   - booking pending -> payment success -> booking confirmed.

## Phase 3: Notifications Domain

## Backend Steps

1. Create notification model `apps/api/src/models/notification.model.ts`:
   - `userId`
   - `type` (`booking_confirmed`, `booking_cancelled`, `payment_failed`, etc.)
   - `title`
   - `message`
   - `meta` (bookingRef, bookingId, scheduleId, etc.)
   - `isRead`
   - timestamps
2. Export in models index.
3. Add validators in `apps/api/src/validators/notification.validator.ts`.
4. Add controller `apps/api/src/controllers/notification.controller.ts`:
   - `listMyNotifications`
   - `markNotificationRead`
   - `markAllNotificationsRead`
5. Add routes in `apps/api/src/routes/notification.routes.ts`:
   - `GET /notifications/me`
   - `PATCH /notifications/:id/read`
   - `PATCH /notifications/read-all`
6. Trigger notifications from booking/payment flows:
   - on booking confirmed
   - on booking cancelled
   - on payment failed (optional, recommended).

## Frontend Steps

1. Add API client methods in `src/features/auth/api.ts`.
2. Replace mock data in `src/pages/Notifications.tsx`.
3. Add unread count derivation in layout/header badge (if existing badge component is available).

## Notification Test Steps

1. Ensure only owner can read/update own notifications.
2. Event trigger tests from booking/payment transitions.

## Phase 4: Admin/Driver Transaction Views

## Admin Steps

1. Replace `src/pages/admin/AdminPlaceholder.tsx` usage for bookings route with real page:
   - add `src/pages/admin/AdminBookings.tsx`
2. Features:
   - list bookings (status/date/ref/user filters)
   - update booking status where allowed
   - view booking details snapshot
3. Wire route in `src/App.tsx`:
   - `/admin/bookings` -> `AdminBookings`.

## Driver Steps

1. Finalize `src/pages/driver/DriverPassengers.tsx` using `/driver/bookings`.
2. Add schedule filter + status chips + reference search.
3. Show passenger contact only if available in API payload and permitted.

## Phase 5: PWA Baseline + Final QA Gate

## PWA Steps

1. Validate manifest:
   - app name/icons/start_url/display/theme/background.
2. Add service worker baseline:
   - static assets: cache-first
   - API requests: network-first + graceful fallback
3. Verify installability in Chrome Android and desktop.

## QA/Hardening Steps

1. RBAC regression:
   - passenger/driver/admin route protection.
2. Auth refresh regression:
   - hard refresh loops, token refresh timing, cookie/session behavior.
3. Mobile checks:
   - 390px width baseline for key transactional pages.
4. Failure-path checks:
   - booking over-capacity
   - payment fail/timeout
   - API downtime states with retry.
5. Remove remaining critical mock dependencies in Week 3 scope:
   - `Booking`, `MyBookings`, `BookingDetail`, `Payment`, `PaymentStatus`, `Notifications`, `AdminBookings`, `DriverPassengers`.

## Suggested 7-Day Execution

1. Day 1: Booking model/routes/controllers + base tests.
2. Day 2: Booking frontend pages (`Booking`, `MyBookings`, `BookingDetail`, `DriverPassengers`).
3. Day 3: Payment backend + webhook/idempotency.
4. Day 4: Payment frontend (`Payment`, `PaymentStatus`) + integration testing.
5. Day 5: Notifications backend + notifications page replacement.
6. Day 6: Admin bookings page + driver manifest completion + RBAC smoke.
7. Day 7: PWA baseline + full regression + demo script.

## Week 3 Definition of Done

- Passenger flow is complete:
  - Select schedule -> create booking -> pay -> confirmed in My Bookings.
- Driver sees real booking/passenger manifest for owned schedules.
- Admin can view/manage real booking records.
- Notifications are API-backed with read/read-all behavior.
- PWA installs and has offline baseline.
- No critical mock-data dependency remains in Week 3 scope.
