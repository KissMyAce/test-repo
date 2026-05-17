# End-to-End Test Flow (Week 2 Scope)

This is one complete test flow that covers setup, account creation, RBAC, and core Week 2 features (Routes, Jeepneys, Schedules).

## 1. Prerequisites

- Terminal A: backend
- Terminal B: frontend
- Browser with at least 2 profiles/incognito windows (admin + user)
- MongoDB Atlas configured in backend `.env`

## 2. Start From Clean Data Seed (recommended)

In `apps/api`:

```bash
npm install
npm run seed:week2
npm run dev
```

Expected:
- API running at `http://localhost:4000`
- Seeded users/routes/jeepneys/schedules ready

In project root:

```bash
npm install
npm run dev
```

Expected:
- Frontend running at `http://localhost:8080`

## 3. Baseline Login + Redirect Check

Use seeded password: `qweasd123`

- Admin: `admin@gmail.com`
  - Expected redirect: `/admin/dashboard`
- Driver: `driver1@gmail.com`
  - Expected redirect: `/driver/dashboard`
- Passenger: `passenger1@gmail.com`
  - Expected redirect: `/dashboard`

## 4. Create New Passenger Account (UI)

1. Open `/register`
2. Register a new passenger (new email)
3. Login with new passenger account

Expected:
- Account created successfully
- Can open `/jeepneys` and `/schedules`
- Cannot access `/admin/*` or `/driver/*`

## 5. Create New Driver Account (UI)

1. Open driver registration page (`/register/driver` or register driver flow in app)
2. Submit required fields + files
3. Try to login immediately

Expected:
- Registration accepted
- Driver is pending verification
- Driver should not have full active driver access yet (based on your current pending status handling)

## 6. Admin Driver Verification

1. Login as admin
2. Go to pending drivers page/workflow
3. Approve the newly registered driver
4. Logout admin, login as approved driver

Expected:
- Driver is approved
- Driver can access `/driver/dashboard`, `/driver/jeepney`, `/driver/schedules`

## 7. Admin Core CRUD Flow (Routes -> Jeepneys -> Schedules)

### 7.1 Routes

1. Go to `/admin/routes`
2. Create route (example):
   - Name: `Test Route E2E`
   - Origin: `Ayala Center Cebu`
   - Destination: `IT Park`
   - Base fare: `15`
3. Edit base fare to `18`
4. Delete/deactivate route

Expected:
- Create/edit/delete succeed
- Route list updates correctly

### 7.2 Jeepneys

1. Go to `/admin/jeepneys`
2. Create jeepney linked to an active route + driver
3. Edit capacity/status
4. Delete/deactivate jeepney

Expected:
- CRUD succeeds
- Passenger `/jeepneys` reflects changes

### 7.3 Schedules

1. Go to admin schedules screen (if wired)
2. Create schedule with valid datetime range (`arrivalAt > departureAt`)
3. Edit status/time
4. Delete schedule

Expected:
- CRUD succeeds
- Passenger `/schedules` reflects active schedules

## 8. Driver Ownership Rules

Login as `driver1@gmail.com`.

1. Open `/driver/jeepney`
   - Update own jeepney info
2. Open `/driver/schedules`
   - Create schedule
   - Edit own schedule
   - Delete own schedule

Expected:
- Own resource actions succeed
- Driver cannot manage another driver's resources

## 9. Passenger Read-Only Flow

Login as passenger.

1. Open `/jeepneys`
   - Filter/search routes/jeepneys
2. Open `/schedules`
   - Filter by route/date/status
3. Open schedule detail and jeepney detail pages

Expected:
- Read operations succeed
- No admin/driver management actions visible or allowed

## 10. Hard Refresh + Session Stability

For each role (admin/driver/passenger):

1. Open protected page (dashboard/profile)
2. Hard refresh once, then again

Expected:
- Session remains valid
- No unexpected redirect to login unless token/session is truly invalid

## 11. API Smoke Matrix (Automated)

In `apps/api` while backend is running:

```bash
npm run smoke:rbac
```

Expected:
- `Smoke tests complete: 14 passed, 0 failed.`

## 12. Regression Test Commands

Backend:

```bash
cd apps/api
npm test
npm run build
```

Frontend:

```bash
cd /Users/gelo/Documents/dev/jee-ps-your-reliable-ride
npm test
npm run build
```

Expected:
- All tests/builds pass

---

## Quick Credentials Reference

- Password for seeded users: `qweasd123`
- Admin: `admin@gmail.com`
- Drivers: `driver1@gmail.com`, `driver2@gmail.com`, `driver3@gmail.com`, `driver4@gmail.com`
- Passengers: `passenger1@gmail.com`, `passenger2@gmail.com`
