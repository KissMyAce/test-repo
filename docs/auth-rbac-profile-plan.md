# Auth + RBAC + Profile Implementation Plan

## 1) Scope and Goals

Implement production-ready authentication, authorization (RBAC), and profile management for 3 roles:

- `passenger`
- `driver`
- `admin`

Target stack:

- Backend: Node.js (Express + Mongoose)
- Database: MongoDB Atlas
- Object storage: Cloudflare R2 (profile photos, driver documents)
- Frontend: existing React + React Router + TanStack Query codebase

## 2) Current Codebase Findings (What Exists Today)

- Route groups already exist in `src/App.tsx`:
  - Passenger pages under `AuthLayout`
  - Driver pages under `DriverLayout`
  - Admin pages under `AdminLayout`
- There are currently no actual auth guards; any user can navigate directly to protected URLs.
- Login/register pages are UI-only and currently simulate success:
  - `src/pages/Login.tsx`
  - `src/pages/Register.tsx`
  - `src/pages/RegisterDriver.tsx`
- Profile is local-state only (no backend persistence):
  - `src/pages/Profile.tsx`
- App relies on mock data:
  - `src/data/mock-data.ts`

## 3) High-Level Architecture

### Auth approach

- Access token: short-lived JWT (10-15 min), sent in response body.
- Refresh token: long-lived opaque token (or JWT), stored in `httpOnly`, `secure`, `sameSite=lax` cookie.
- Session storage:
  - `refreshTokens` collection (hashed token + metadata) or embedded sessions on user.
- Frontend stores access token in memory (not localStorage) and silently refreshes on 401.

### RBAC approach

- Enforce in two layers:
  - Backend middleware (authoritative)
  - Frontend route guards (UX and redirect behavior)

### File upload approach (R2)

- Use pre-signed upload URLs from backend.
- Browser uploads directly to R2.
- Backend stores object key + URL metadata in MongoDB.

## 4) Data Model Plan (MongoDB Atlas)

## `users`

- `_id`
- `email` (unique, lowercase)
- `passwordHash`
- `role` (`passenger | driver | admin`)
- `status` (`active | pending_verification | suspended`)
- `name`
- `phone`
- `profileImageKey` (R2 key, optional)
- `createdAt`, `updatedAt`
- `lastLoginAt`

## `driverProfiles`

- `userId` (ref users, unique)
- `licenseNumber`
- `licenseFileKey` (required)
- `nbiFileKey` (optional)
- `approvalStatus` (`pending | approved | rejected`)
- `reviewedBy` (admin userId, optional)
- `reviewNotes` (optional)

## `refreshTokens` (recommended)

- `userId`
- `tokenHash`
- `expiresAt`
- `revokedAt` (optional)
- `ip`, `userAgent`
- `createdAt`

## `auditLogs` (optional but recommended)

- `actorUserId`
- `action`
- `targetType`, `targetId`
- `meta`
- `createdAt`

## 5) API Contract (Backend)

Base prefix: `/api/v1`

### Auth endpoints

- `POST /auth/register/passenger`
- `POST /auth/register/driver`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all` (optional)
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`

### Profile endpoints

- `GET /profile/me`
- `PATCH /profile/me`
- `PATCH /profile/me/password`
- `POST /profile/me/avatar/upload-url`
- `POST /profile/me/avatar/commit`

### Driver verification/admin endpoints

- `GET /admin/drivers/pending`
- `PATCH /admin/drivers/:userId/approve`
- `PATCH /admin/drivers/:userId/reject`

### R2 upload helper endpoints

- `POST /uploads/presign`
- `POST /uploads/commit`

## 6) RBAC Matrix

- Passenger routes: `/dashboard`, `/schedules`, `/jeepneys`, `/my-bookings`, `/booking`, `/payment`, `/notifications`, `/profile`
  - Allowed: `passenger`
- Driver routes: `/driver/*`
  - Allowed: `driver` (and typically status `approved/active`)
- Admin routes: `/admin/*`
  - Allowed: `admin`
- Public routes: `/`, `/login`, `/register`, `/forgot-password` (add `/reset-password` route)

## 7) Frontend Implementation Steps

## Phase A: Foundation (Auth state + API client)

1. Create `src/lib/api-client.ts` with fetch wrapper and 401-refresh retry.
2. Create `src/features/auth/types.ts`:
   - `UserRole`, `AuthUser`, `AuthState`.
3. Create `src/features/auth/auth-store.tsx` (React context):
   - `user`, `accessToken`, `isLoading`, `isAuthenticated`.
   - `login`, `logout`, `refresh`, `fetchMe`.
4. Hydrate auth on app start:
   - Add `<AuthProvider>` above router in `src/App.tsx`.

## Phase B: Route guards + role redirects

1. Add `ProtectedRoute` component:
   - If unauthenticated -> redirect to `/login`.
2. Add `RoleRoute` component:
   - If authenticated but role mismatch -> redirect to role home:
     - passenger -> `/dashboard`
     - driver -> `/driver/dashboard`
     - admin -> `/admin/dashboard`
3. Wrap route groups in `src/App.tsx` using these guards.
4. Add login/register redirect rule:
   - Authenticated user visiting `/login` or `/register/*` gets redirected to role home.

## Phase C: Replace simulated auth pages

1. `Login.tsx`:
   - Call `POST /auth/login`.
   - Store auth state.
   - Redirect by role.
2. `Register.tsx` (passenger):
   - Call `POST /auth/register/passenger`.
   - Auto-login or redirect to login based on API response.
3. `RegisterDriver.tsx`:
   - Upload docs to R2 via presigned URLs.
   - Call `POST /auth/register/driver` with document keys.
   - Show `pending verification` success state.
4. `ForgotPassword.tsx`:
   - Hook to `POST /auth/forgot-password`.
5. Add new `ResetPassword.tsx` page and route:
   - `/reset-password?token=...`
   - Calls `POST /auth/reset-password`.

## Phase D: Profile integration

1. Replace local profile state in `src/pages/Profile.tsx` with `GET /profile/me`.
2. Save profile updates with `PATCH /profile/me`.
3. Change password modal -> `PATCH /profile/me/password`.
4. Avatar upload:
   - request upload URL
   - upload to R2
   - commit object key via API
5. Role-aware profile sections:
   - Passenger: basic profile + stats
   - Driver: include license status
   - Admin: optionally show admin metadata

## Phase E: Admin driver verification workflow

1. Add pending-driver list UI (can start in `AdminPlaceholder` or `AdminDashboard`).
2. Approve/reject driver API actions.
3. Enforce that non-approved drivers cannot access `/driver/*` pages.

## 8) Backend Implementation Steps (Node.js)

1. Initialize backend service (`apps/api` or separate repo).
2. Add dependencies:
   - `express`, `mongoose`, `jsonwebtoken`, `bcrypt`, `cookie-parser`, `zod`, `helmet`, `cors`, `rate-limiter-flexible`, AWS SDK v3 (S3 client for R2).
3. Create modules:
   - `auth`, `users`, `profiles`, `uploads`, `admin`.
4. Add middleware:
   - `authMiddleware` (verify access token)
   - `requireRole(...roles)`
   - `errorHandler`, `requestId`, `rateLimit`
5. Implement token issuance + refresh rotation.
6. Implement R2 presign service with scoped keys:
   - `avatars/{userId}/{uuid}`
   - `driver-docs/{userId}/{uuid}`
7. Add DTO validation with Zod.
8. Add indexes:
   - `users.email` unique
   - `driverProfiles.userId` unique
   - TTL index for expired refresh tokens (if desired)

## 9) Environment and Secrets

Backend `.env`:

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET` (or token hashing secret)
- `ACCESS_TOKEN_TTL=15m`
- `REFRESH_TOKEN_TTL_DAYS=30`
- `COOKIE_DOMAIN`
- `CORS_ORIGIN`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL` (if public delivery)

Frontend `.env`:

- `VITE_API_BASE_URL`

## 10) Security and Compliance Checklist

- Hash passwords with bcrypt (`>=12` rounds).
- Hash refresh tokens at rest.
- Use httpOnly refresh cookie.
- Add brute-force rate limit for login/forgot-password.
- Validate upload MIME + size on both client and server.
- Restrict R2 key prefixes by authenticated user role/context.
- Sanitize all profile text fields.
- Add audit logs for admin approve/reject actions.

## 11) Testing Plan

### Backend tests

- Unit tests: auth service, token rotation, role middleware.
- Integration tests:
  - login/refresh/logout flow
  - role-based endpoint denial/allow
  - profile update and password change
  - upload presign + commit constraints

### Frontend tests

- Route guard tests (unauthenticated redirect).
- Role redirect tests (wrong role -> correct dashboard).
- Login/register happy + error paths.
- Profile fetch/update flows.

## 12) Incremental Delivery Plan (Recommended Order)

1. Backend auth + `/auth/me` + profile endpoints.
2. Frontend auth provider + guards + login wiring.
3. Passenger register + forgot/reset password.
4. Driver register with R2 upload + pending status.
5. Admin approve/reject flow + driver route enforcement.
6. Final cleanup: remove mock auth/profile state and hardcoded names.

## 13) Definition of Done

- Direct access to protected routes is blocked without valid auth.
- Users are redirected to role-specific home after login.
- Wrong-role route access redirects safely.
- Profile is persisted in MongoDB (not local React state).
- Driver documents and profile images upload to R2 and are stored by key.
- Driver can only use driver routes after admin approval.
- No auth/profile screens rely on mock data for identity.

## 14) Immediate Code Tasks in This Repo

1. Add guard components and auth provider scaffold.
2. Refactor `src/App.tsx` routes to use guards.
3. Replace simulated submit handlers in:
   - `src/pages/Login.tsx`
   - `src/pages/Register.tsx`
   - `src/pages/RegisterDriver.tsx`
   - `src/pages/ForgotPassword.tsx`
4. Refactor `src/pages/Profile.tsx` to API-backed data.
5. Add `src/pages/ResetPassword.tsx` and route mapping.

