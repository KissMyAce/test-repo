# Week 3 Deliverables Plan (Transactional Features + PWA + Final QA)

## Context From Current Codebase + Week 2 Dependency

Week 3 assumes Week 2 is complete:

- Real APIs and UI wiring for `routes`, `jeepneys`, `schedules`.
- No blocking `mock-data` dependencies for booking inputs.

## Week 3 Goal

Deliver end-to-end passenger transaction flow and MVP readiness:

1. Booking
2. Payment + status updates
3. Notifications
4. PWA install/offline baseline
5. Final hardening and demo readiness

## Dependency-Ordered Feature Delivery

## 1) Booking Domain (must be first in Week 3)

### Deliverables
- Backend:
  - `Booking` model and endpoints:
    - `POST /bookings`
    - `GET /bookings/me`
    - `GET /bookings/me/:id`
    - `PATCH /bookings/me/:id/cancel`
    - `GET /admin/bookings`
    - `PATCH /admin/bookings/:id`
    - `GET /driver/bookings` (bookings for driver-owned schedules)
  - Seat lock/check at booking create:
    - Reject when requested seats exceed available seats.
    - Prevent overbooking race (atomic update/transaction approach).
- Frontend:
  - Replace mock booking flow in:
    - `src/pages/Booking.tsx`
    - `src/pages/MyBookings.tsx`
    - `src/pages/BookingDetail.tsx`
    - `src/pages/driver/DriverPassengers.tsx`
  - On confirm in `Booking.tsx`, create booking first, then navigate to payment with booking reference.

### Dependency Reason
- Payment must target a real booking record.

## 2) Payment Domain (second)

### Deliverables
- Backend:
  - `Payment` model and endpoints:
    - `POST /payments/intent` (or payment-link create)
    - `POST /payments/webhook`
    - `GET /payments/:bookingId` (optional)
  - Booking status linkage:
    - Payment success -> booking `confirmed`
    - Payment failed/expired -> booking stays `pending` or `failed_payment`
  - Idempotent webhook handling (avoid duplicate updates).
- Frontend:
  - Replace simulated flow in:
    - `src/pages/Payment.tsx`
    - `src/pages/PaymentStatus.tsx`
  - Use real booking reference + payment status polling/result page.

### Dependency Reason
- Uses created booking records.

## 3) Notifications Domain (third)

### Deliverables
- Backend:
  - `Notification` model and endpoints:
    - `GET /notifications/me`
    - `PATCH /notifications/:id/read`
    - `PATCH /notifications/read-all`
  - Trigger notifications on:
    - booking confirmed
    - booking cancelled
    - payment failed (optional)
- Frontend:
  - Replace mock notifications in `src/pages/Notifications.tsx`.
  - Integrate unread state badge if needed.

### Dependency Reason
- Notification events come from booking/payment lifecycle.

## 4) Admin/Driver Transaction Views (fourth)

### Deliverables
- Admin:
  - Replace mock-driven management for bookings in admin area (existing placeholder route can be replaced).
  - Status filtering/search for booking refs.
- Driver:
  - Passenger manifest sourced from real bookings per schedule.

### Dependency Reason
- Depends on booking/payment data being real.

## 5) PWA + Quality Gate (final)

### Deliverables
- PWA:
  - Installable manifest validation.
  - Service worker caching baseline:
    - static assets cache-first
    - API network-first with fallback behavior
- QA:
  - Role-based route access regression checks.
  - Auth refresh stability checks (hard refresh loops).
  - Mobile viewport checks (390px baseline).
  - Error-state checks for network/payment failures.

## Week 3 Exit Criteria (Definition of Done)

- Passenger flow works end-to-end:
  - Browse schedules -> create booking -> pay -> see confirmed status in My Bookings.
- Driver sees real passenger/booking data for owned schedules.
- Admin can view/manage real booking records.
- Notifications page uses API-backed records.
- PWA install prompt and offline baseline verified.
- No remaining critical `mock-data` dependence in booking/payment/notifications flows.

## Suggested Day Breakdown

- Day 1-2: Booking backend + passenger booking pages.
- Day 3-4: Payment backend integration + payment pages.
- Day 5: Notifications backend + notifications page.
- Day 6: Admin/driver booking management wiring.
- Day 7: PWA checks, regression pass, demo script and bugfix sweep.
