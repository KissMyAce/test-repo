# Product Requirements Document
## Jee-PS: A Web-Based Jeepney Tracking, Scheduling, and Service Management System
### Progressive Web App (PWA) — MVP

---

**Document Version:** 1.0  
**Date:** February 2026  
**Status:** Draft  
**Prepared for:** Thesis Project Team

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Goals & Objectives](#2-goals--objectives)
3. [User Roles & Personas](#3-user-roles--personas)
4. [Design System & UI Guidelines](#4-design-system--ui-guidelines)
5. [Pages & Navigation Structure](#5-pages--navigation-structure)
6. [Feature Specifications](#6-feature-specifications)
7. [Technical Stack & Architecture](#7-technical-stack--architecture)
8. [Development Timeline](#8-development-timeline)
9. [Out of Scope (MVP)](#9-out-of-scope-mvp)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. Project Overview

**Product Name:** Jee-PS (Jeepney Planning System)  
**Type:** Progressive Web App (PWA) — mobile-first, installable  
**Tagline:** *"Never miss a ride, always stay on track"*

Jee-PS is a web-based platform designed to digitize and streamline the operations of jeepney transportation in the Philippines. It serves two primary user groups — **passengers** who want to view schedules, track availability, and book rides, and **drivers/operators** who manage their jeepney details, schedules, and passenger bookings.

The MVP scope covers four core feature areas: Jeepney Listings, Schedules, Payments, and Booking, all delivered through a responsive, installable PWA.

---

## 2. Goals & Objectives

### Primary Goals
- Provide passengers with real-time-friendly access to jeepney schedules and seat availability.
- Allow drivers and operators to manage their jeepney info and schedule directly from the platform.
- Enable passengers to reserve seats and pay digitally via GCash or Maya.

### MVP Success Metrics
- Passengers can view the jeepney list and available routes.
- Passengers can view schedules linked to specific jeepneys.
- Passengers can complete a booking and proceed to a payment gateway.
- Admins/operators can manage jeepney records and schedules.
- App is installable as a PWA on Android devices.

---

## 3. User Roles & Personas

The system uses **Role-Based Access Control (RBAC)** with three roles:

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Admin** | System administrator or school/terminal coordinator | Full CRUD on all data; manage users, jeepneys, schedules, bookings |
| **Driver / Operator** | Jeepney driver or registered operator | Manage own jeepney profile; view and manage own schedules; view own bookings |
| **Passenger** | Student or commuter using the platform | View jeepney list & schedules; create bookings; manage payment; view booking history |

### Authentication Flow
- All roles authenticate through a single login page.
- After login, the system reads the user's role and redirects to the appropriate dashboard.
- Public pages (jeepney list, schedules) may be viewable without login, but booking and payment require authentication.

---

## 4. Design System & UI Guidelines

Based on the provided reference design, the following design language should be applied consistently across all screens.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#5B8DEF` | Buttons, active states, nav highlights |
| `--primary-light` | `#A8C4F5` | Background gradients, card borders |
| `--background` | `#D6E8FF` | Full-page gradient background |
| `--surface` | `#FFFFFF` | Cards, modals, form backgrounds |
| `--surface-gray` | `#F2F2F2` | Inner panel areas, empty states |
| `--text-primary` | `#1A1A2E` | Headings, body text |
| `--text-muted` | `#6B7280` | Subtitles, placeholder text |
| `--accent-purple` | `#6C5CE7` | Jeepney icon circles, badge highlights |
| `--success` | `#27AE60` | Payment confirmed, booking success |
| `--warning` | `#F39C12` | Pending states, warnings |
| `--danger` | `#E74C3C` | Errors, cancellation |

### Typography
- **Primary Font:** Inter or Nunito (Google Fonts) — rounded, friendly, legible on mobile
- **Headings:** Bold weight, dark text on light backgrounds
- **Tagline / Hero Text:** Semi-bold, `--primary` color on `--background`

### Component Style
- **Cards:** White background, `8px` or `12px` border radius, subtle drop shadow (`0 2px 8px rgba(0,0,0,0.08)`)
- **Feature Grid Buttons:** 2-column grid layout with icon (in colored circle) above label — matches reference design
- **Icon Circles:** Filled with `--accent-purple` or `--primary`, white icon inside, `60–72px` diameter
- **Nav Bar (Bottom):** Mobile-style bottom navigation bar with icons and labels for main sections
- **Top Bar:** User avatar (left), app name/welcome message (center-left), notification bell + Help button (right)

### PWA Manifest & Feel
- App background splash color: `#D6E8FF`
- Theme color: `#5B8DEF`
- Display mode: `standalone`
- App icon: Jeepney silhouette with blue circle background

---

## 5. Pages & Navigation Structure

### 5.1 Public / Auth Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing / Splash | `/` | PWA splash with tagline and CTA to log in |
| Login | `/login` | Email + password login with role-based redirect |
| Register | `/register` | Passenger self-registration |
| Forgot Password | `/forgot-password` | Email-based password reset flow |

### 5.2 Passenger Pages

| Page | Route | Description |
|------|-------|-------------|
| Home Dashboard | `/dashboard` | Welcome banner, 2×2 feature grid (Schedules, Jeepneys, Payments, Booking), notification area |
| Jeepney List | `/jeepneys` | Searchable/filterable list of all jeepneys with driver info and route |
| Jeepney Detail | `/jeepneys/:id` | Single jeepney detail: driver name, plate number, route, active schedules |
| Schedules | `/schedules` | List of upcoming schedules filterable by route and date |
| Schedule Detail | `/schedules/:id` | Specific schedule: jeepney info, departure time, available seats |
| Booking | `/booking` | Step-by-step seat reservation flow (select jeepney → select schedule → confirm) |
| Booking Confirmation | `/booking/confirm` | Review booking summary before proceeding to payment |
| Payment | `/payment` | Select payment method (GCash / Maya), redirect to payment gateway |
| Payment Status | `/payment/status` | Success / failure screen with booking reference |
| My Bookings | `/my-bookings` | List of past and upcoming bookings for the logged-in passenger |
| Booking Detail | `/my-bookings/:id` | Single booking detail with status, QR code or reference |
| Notifications | `/notifications` | In-app notification list (booking confirmed, schedule changed, etc.) |
| Profile | `/profile` | View and edit passenger profile info |

### 5.3 Driver / Operator Pages

| Page | Route | Description |
|------|-------|-------------|
| Driver Dashboard | `/driver/dashboard` | Overview of own jeepney, today's schedule, bookings count |
| My Jeepney | `/driver/jeepney` | View and edit own jeepney profile (plate, route, capacity, photo) |
| My Schedules | `/driver/schedules` | View, add, edit, delete own schedules |
| Passengers | `/driver/passengers` | List of passengers booked on own schedules |

### 5.4 Admin Pages

| Page | Route | Description |
|------|-------|-------------|
| Admin Dashboard | `/admin/dashboard` | System stats: total jeepneys, bookings, users, revenue |
| Manage Jeepneys | `/admin/jeepneys` | Full CRUD on all jeepney records |
| Manage Schedules | `/admin/schedules` | Full CRUD on all schedules; link jeepneys to schedules |
| Manage Bookings | `/admin/bookings` | View all bookings; update status; cancel/refund |
| Manage Users | `/admin/users` | View all users, assign/change roles, deactivate accounts |
| Reports | `/admin/reports` | Basic ridership and revenue reports (charts/tables) |

---

## 6. Feature Specifications

---

### Feature 1 — Authentication & RBAC

**Description:** Secure login, registration, and session management with role-based routing.

**Screens Involved:** Login, Register, Forgot Password

**Functional Requirements:**
- Users can register with name, email, password, and role (default: Passenger).
- Login returns a JWT or session token stored securely (HttpOnly cookie preferred).
- On login, the app reads the user's role and redirects accordingly:
  - Admin → `/admin/dashboard`
  - Driver → `/driver/dashboard`
  - Passenger → `/dashboard`
- Protected routes check authentication status; unauthenticated users are redirected to `/login`.
- Password reset via email link.
- Logout clears session/token.

**RBAC Matrix:**

| Resource | Admin | Driver | Passenger |
|----------|-------|--------|-----------|
| All Jeepneys (CRUD) | ✅ | Own only | Read only |
| All Schedules (CRUD) | ✅ | Own only | Read only |
| All Bookings | ✅ | Own jeepney | Own bookings |
| User Management | ✅ | ❌ | ❌ |
| Reports | ✅ | ❌ | ❌ |

---

### Feature 2 — Jeepney List & Detail

**Description:** A browsable, searchable directory of registered jeepneys with driver and route information.

**Screens Involved:** `/jeepneys`, `/jeepneys/:id`

**Functional Requirements:**
- Display a card-based list of jeepneys showing: jeepney name/number, plate number, driver name, route name, capacity, and availability status (Active / Inactive).
- Each card links to a detailed view.
- Search by jeepney number, driver name, or route.
- Filter by route.
- Jeepney detail page shows: all above fields + active schedules linked to this jeepney.
- Admin / Driver can access edit controls from the detail page.

**Data Model — Jeepney:**

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `name` | String | Jeepney display name / number |
| `plate_number` | String | Unique |
| `driver_id` | FK → User | Must be a Driver role |
| `route_id` | FK → Route | Associated route |
| `capacity` | Integer | Total passenger capacity |
| `status` | Enum | `active`, `inactive` |
| `photo_url` | String | Optional image |
| `created_at` | Timestamp | |

---

### Feature 3 — Schedules

**Description:** Time-based schedule entries linking a jeepney to a departure time, route, and seat availability.

**Screens Involved:** `/schedules`, `/schedules/:id`, `/driver/schedules`

**Functional Requirements:**
- Schedules are tied to a specific jeepney and route.
- Each schedule has: departure time, estimated arrival time, date (or recurring day), available seats (derived from capacity minus confirmed bookings), and status.
- Passengers can browse all upcoming schedules and filter by route and date.
- Drivers can create/edit/delete their own schedules from the driver dashboard.
- Admin can manage all schedules.
- A schedule transitions to `completed` status after the departure time has passed.
- Schedule detail shows available seats in real-time (refreshes on load).

**Data Model — Schedule:**

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `jeepney_id` | FK → Jeepney | |
| `route_id` | FK → Route | |
| `departure_time` | DateTime | |
| `arrival_time` | DateTime | Estimated |
| `available_seats` | Integer | Computed from capacity - confirmed bookings |
| `status` | Enum | `upcoming`, `ongoing`, `completed`, `cancelled` |
| `created_at` | Timestamp | |

---

### Feature 4 — Booking System

**Description:** A step-by-step flow for passengers to reserve seats on a specific jeepney schedule.

**Screens Involved:** `/booking`, `/booking/confirm`, `/my-bookings`, `/my-bookings/:id`

**Functional Requirements:**
- Booking flow: Select route → Select jeepney → Select schedule → Select number of seats → Confirm.
- System checks available seats before allowing confirmation; blocks booking if no seats remain.
- A booking is created in `pending` status until payment is confirmed.
- Confirmed bookings reduce available seats on the schedule.
- Passengers can view all their bookings with status badges: Pending, Confirmed, Cancelled, Completed.
- Passengers can cancel a booking in `pending` or `confirmed` status (before departure time).
- Admin can cancel or update any booking.
- A booking reference number / QR code is generated on confirmation.

**Booking Status Flow:**
```
[pending] → (payment success) → [confirmed]
[pending] → (payment failed / timeout) → [cancelled]
[confirmed] → (departure time passed) → [completed]
[confirmed / pending] → (user/admin cancels) → [cancelled]
```

**Data Model — Booking:**

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `passenger_id` | FK → User | |
| `schedule_id` | FK → Schedule | |
| `seats_reserved` | Integer | |
| `total_amount` | Decimal | Computed from fare × seats |
| `status` | Enum | `pending`, `confirmed`, `cancelled`, `completed` |
| `reference_number` | String | Unique, generated on creation |
| `payment_id` | FK → Payment | Nullable until paid |
| `created_at` | Timestamp | |

---

### Feature 5 — Payment Integration

**Description:** Integration with Philippine e-wallet payment gateways (GCash and Maya) to accept digital payments for bookings.

**Screens Involved:** `/payment`, `/payment/status`

**Functional Requirements:**
- After confirming a booking, the passenger is directed to the payment page.
- Payment options displayed: GCash, Maya (styled with official brand logos).
- On selecting a method, the passenger is redirected to the payment gateway (via PayMongo or direct gateway SDK, which supports GCash and Maya).
- Payment gateway returns a webhook/callback to update booking status.
- On success: booking status → `confirmed`, success screen shown with reference number.
- On failure: booking remains `pending`, failure screen shown with retry option.
- Payment records are stored with amount, method, gateway reference, and status.
- Admin can view all payment records in the bookings panel.

**Data Model — Payment:**

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `booking_id` | FK → Booking | |
| `amount` | Decimal | |
| `method` | Enum | `gcash`, `maya` |
| `gateway_ref` | String | PayMongo or gateway transaction ID |
| `status` | Enum | `pending`, `paid`, `failed`, `refunded` |
| `paid_at` | Timestamp | Nullable |
| `created_at` | Timestamp | |

**Payment Gateway Note:** PayMongo is the recommended intermediary — it natively supports GCash and GrabPay/Maya via a single API and is widely used in Philippine web apps. API keys are environment-specific (test vs. production).

---

### Feature 6 — Admin Dashboard & Reports

**Description:** A centralized control panel for admins to manage the full system and view basic analytics.

**Screens Involved:** `/admin/dashboard`, `/admin/jeepneys`, `/admin/schedules`, `/admin/bookings`, `/admin/users`, `/admin/reports`

**Functional Requirements:**
- Dashboard shows key metrics cards: total jeepneys, active schedules today, total bookings (weekly), revenue (weekly).
- Full CRUD interfaces for Jeepneys, Schedules, Bookings, and Users with data tables, search, and filters.
- Reports page shows: ridership per route (bar chart), booking volume over time (line chart), revenue totals.
- Export to CSV for bookings and reports.

---

### Feature 7 — PWA Configuration

**Description:** Configure the app to be installable and functional as a Progressive Web App on mobile devices.

**Requirements:**
- `manifest.json` with app name, icons (192×192, 512×512), start URL, display mode `standalone`, background/theme colors.
- Service Worker for offline fallback page (basic caching of static assets).
- App is installable via "Add to Home Screen" prompt on Android Chrome.
- Responsive layout works on screens from 360px to 428px width (standard Android range) and tablets.
- Bottom navigation bar visible on mobile for key sections.
- Splash screen on launch matching brand color.

---

## 7. Technical Stack & Architecture

### Recommended Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React (Vite) + TypeScript | Fast builds, component model, TS safety |
| UI Library | Tailwind CSS + shadcn/ui | Rapid styling with design token support |
| PWA | Vite PWA plugin (Workbox) | Easy service worker and manifest management |
| Backend | Node.js + Express or Next.js API Routes | Familiar JS ecosystem |
| Database | PostgreSQL (via Supabase or Railway) | Relational, hosted, free tier available for thesis |
| ORM | Prisma | Type-safe DB access, easy migrations |
| Auth | Supabase Auth or NextAuth.js | Built-in RBAC support, social login optional |
| Payment | PayMongo API | GCash + Maya support in PH |
| Hosting | Vercel (frontend) + Supabase/Railway (DB) | Free tiers suitable for thesis MVP |
| Storage | Supabase Storage | Profile photos, jeepney images |

### Architecture Overview

```
[Client (PWA - React)]
        ↕ HTTPS/REST or GraphQL
[API Layer (Next.js API Routes or Express)]
        ↕
[Database Layer (PostgreSQL via Prisma)]
        ↕
[External Services]
  - PayMongo (payments)
  - Supabase Auth (authentication)
  - Supabase Storage (images)
```

### Database Tables Summary

- `users` — passengers, drivers, admins
- `routes` — jeepney routes with origin/destination
- `jeepneys` — jeepney records
- `schedules` — schedule entries
- `bookings` — seat reservations
- `payments` — payment records
- `notifications` — in-app notification records

---

## 8. Development Timeline

### Overview

| Week | Focus | Deliverable |
|------|-------|-------------|
| Week 1 | Foundation: Template, Auth, DB, Hosting | Working app shell with auth + RBAC |
| Week 2 | Core Data Features: Jeepneys, Routes, Schedules | Browse and manage jeepneys and schedules |
| Week 3 | Transactional Features: Booking, Payment, PWA | End-to-end booking and payment flow; installable PWA |
| Week 4 | Buffer: Testing, Bug Fixes, Polish | Tested, deployable MVP |

---

### Week 1 — Foundation Layer
**Goal:** Set up everything needed for all subsequent features to build on top of — no feature work is blocked from Week 2 onward.

#### Day 1–2: Project Scaffolding & Design System
- Initialize project with Vite + React + TypeScript.
- Set up Tailwind CSS with custom design tokens (colors, spacing, border-radius) matching the brand.
- Create base component library: Button, Card, Input, Badge, BottomNav, TopBar, Avatar, Modal.
- Build the app shell layout: Top bar, bottom navigation bar, content area, loading states.
- Set up PWA manifest and basic service worker (static cache only at this stage).

#### Day 3–4: Authentication & RBAC
- Integrate Supabase Auth (or NextAuth) for email/password login and registration.
- Create Login page, Register page, Forgot Password page.
- Implement route guards / protected routes checking auth status.
- Implement role-based redirect logic post-login (admin / driver / passenger).
- Store user role in the auth session/JWT and expose via a `useAuth` hook.
- Build a basic User Profile page (view-only at this stage).

#### Day 5–6: Database Setup & Hosting
- Design and create all database tables in PostgreSQL (via Supabase or Railway).
- Run Prisma migrations to establish the full schema.
- Seed the database with sample data: 2–3 routes, 3–4 jeepneys, 5+ schedules, test users for each role.
- Deploy frontend to Vercel; connect to hosted database.
- Set up environment variable management (`.env.local` for dev, Vercel env for prod).

#### Day 7: Admin User Management Foundation
- Build the Admin user management page (`/admin/users`): list all users, view role, toggle active status.
- This ensures admin tooling exists to manage test data throughout the rest of development.

**Week 1 Milestone:** App is live at a URL, auth works, all roles can log in and reach their correct dashboard shell, database is seeded and connected.

---

### Week 2 — Core Data Features
**Goal:** Build the read and write features for Jeepneys and Schedules — the data backbone that Booking depends on.

> **Dependency note:** Booking (Week 3) requires jeepneys and schedules to exist. Routes must be set up first as they are foreign keys for both. This ordering ensures no feature in Week 3 is blocked.

#### Day 1: Routes Setup
- Create Route entity in DB if not done in Week 1 seeding.
- Admin UI to add and manage routes (`/admin/routes`): route name, origin, destination, fare amount.
- This is a prerequisite for Jeepney and Schedule features.

#### Day 2–3: Jeepney List & Detail (Passenger View)
- Build `/jeepneys` page: card grid of all active jeepneys with search and filter by route.
- Build `/jeepneys/:id` detail page: jeepney info, linked driver details, associated route.
- Show active schedule count per jeepney on the card.
- Handle empty states and loading skeletons.

#### Day 4: Jeepney Management (Admin & Driver)
- Admin: Full CRUD for jeepneys at `/admin/jeepneys` (data table with add/edit/delete modals).
- Driver: `/driver/jeepney` — read/update own jeepney profile (plate, photo, capacity).
- Image upload for jeepney photo via Supabase Storage.

#### Day 5–6: Schedules (Passenger View + Driver Management)
- Build `/schedules` page: list of upcoming schedules with filter by route and date.
- Build `/schedules/:id` detail page: jeepney info, departure/arrival time, available seats.
- Driver: `/driver/schedules` — create, edit, delete own schedules; form with jeepney picker, date/time, route.
- Compute `available_seats` dynamically (capacity − confirmed bookings count).

#### Day 7: Admin Schedule Management + Dashboards
- Admin: `/admin/schedules` — full schedule management with CRUD.
- Build the Admin Dashboard summary cards (using seeded + real data).
- Build the Driver Dashboard: today's schedule, passenger count for today.
- Build the Passenger Home Dashboard (`/dashboard`): welcome banner, 2×2 feature grid, notification area placeholder.

**Week 2 Milestone:** Passengers can browse jeepneys and schedules. Drivers can manage their own data. Admin dashboard is functional.

---

### Week 3 — Transactional Features & PWA
**Goal:** Build the booking and payment flows that make the system end-to-end functional, and finalize the PWA experience.

> **Dependency note:** Booking depends on Schedules (Week 2) ✅. Payment depends on Booking ✅. PWA polish can run in parallel with payment work.

#### Day 1–2: Booking Flow (Passenger)
- Build the multi-step booking flow at `/booking`:
  - Step 1: Select route.
  - Step 2: Select jeepney and schedule (filtered by route and date, showing available seats).
  - Step 3: Select number of seats.
  - Step 4: Review summary → Confirm.
- On confirm, create a Booking record with status `pending`.
- Block booking if available seats = 0.
- Redirect to `/payment` after booking creation.

#### Day 3: My Bookings (Passenger)
- Build `/my-bookings`: list of passenger's own bookings with status badges and dates.
- Build `/my-bookings/:id`: booking detail with reference number, schedule info, QR code placeholder.
- Implement booking cancellation (if status is `pending` or `confirmed` and before departure time).

#### Day 4–5: Payment Integration (GCash / Maya via PayMongo)
- Set up PayMongo account and test API keys.
- Build `/payment` page: display GCash and Maya options with branded icons.
- On selection, call PayMongo API to create a payment intent/link and redirect passenger.
- Set up webhook endpoint to receive payment status callbacks from PayMongo.
- On successful webhook: update Payment record status to `paid`, update Booking status to `confirmed`.
- On failed/expired webhook: update Payment status to `failed`, Booking remains `pending`.
- Build `/payment/status` page: success and failure states with reference number and next steps.

#### Day 6: Admin Booking & Payment Views
- Build `/admin/bookings`: full bookings list with status filter, search by reference number, manual status override.
- Show payment method and gateway reference on booking detail.
- Export bookings to CSV.

#### Day 7: PWA Finalization & Notifications
- Finalize `manifest.json` with all icon sizes and splash screen config.
- Configure Workbox service worker with proper caching strategies:
  - Static assets: cache-first.
  - API calls: network-first with offline fallback.
- Test "Add to Home Screen" install prompt on Android Chrome.
- Build `/notifications` page: list of in-app notifications (booking confirmed, schedule changed).
- Trigger notifications on booking confirmation and status changes.
- End-to-end test of the complete flow: Register → Browse → Book → Pay → Confirm.

**Week 3 Milestone:** Full end-to-end flow works. App is installable as a PWA. All core features are functional.

---

### Week 4 — Buffer: Testing, Bug Fixes & Polish
**Goal:** Ensure the MVP is stable, usable, and ready for presentation/thesis defense.

#### Testing
- Cross-device testing: Android (Chrome), iOS Safari (limited PWA support), desktop.
- Test RBAC: verify no role can access another role's protected routes.
- Test booking edge cases: overbooking, cancellation, expired schedules.
- Test payment edge cases: failed payment, webhook retry, duplicate payment prevention.
- Test form validations and error states throughout the app.

#### Bug Fixes & Polish
- Fix UI inconsistencies: spacing, colors, typography.
- Improve loading states, empty states, and error messages.
- Optimize images and assets for mobile performance.
- Ensure all pages are responsive from 360px to 768px.

#### Final Deliverables
- Live deployment on Vercel with production database.
- README with setup instructions.
- Test account credentials for each role (Admin, Driver, Passenger).
- Short demo walkthrough of the full booking flow.

---

## 9. Out of Scope (MVP)

The following features are **not** included in the MVP and may be addressed in future iterations:

- Real-time GPS tracking of jeepneys (live map view)
- Push notifications (web push API) — in-app only for MVP
- Driver earnings dashboard
- Ratings and reviews for drivers / jeepneys
- Advanced reporting and analytics (beyond basic charts)
- SMS notifications
- Recurring schedule templates
- Multi-language support (Filipino / English toggle)
- Desktop-optimized admin interface (mobile-first only for MVP)
- Native iOS app (PWA install on iOS has limited support)

---

## 10. Acceptance Criteria

The MVP is considered complete when all of the following are verified:

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | A new passenger can register, log in, and reach the home dashboard | Manual test |
| 2 | A passenger can browse the full jeepney list and view a jeepney's detail | Manual test |
| 3 | A passenger can view all upcoming schedules and filter by route | Manual test |
| 4 | A passenger can complete the booking flow (select jeepney → schedule → seats → confirm) | Manual test |
| 5 | A passenger can proceed to payment and complete a GCash or Maya test transaction | PayMongo sandbox test |
| 6 | Booking status updates to `confirmed` after successful payment webhook | Webhook + DB inspection |
| 7 | A driver can log in, view their jeepney, and create/edit a schedule | Manual test |
| 8 | An admin can log in and perform CRUD on jeepneys, schedules, and bookings | Manual test |
| 9 | No passenger can access driver or admin routes; no driver can access admin routes | RBAC route guard test |
| 10 | The app can be installed via "Add to Home Screen" on Android Chrome | Device test |
| 11 | The app loads an offline fallback page when there is no internet connection | Network throttle test |
| 12 | All pages are usable on a 390px-wide mobile screen without horizontal scroll | Chrome DevTools + device |

---

*End of Product Requirements Document*

*This document is a living artifact and may be updated as the project progresses through development.*
