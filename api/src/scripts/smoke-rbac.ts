const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000/api/v1";
const PASSWORD = process.env.SEED_TEST_PASSWORD || "qweasd123";

const ACCOUNTS = {
  admin: { email: "admin@gmail.com", password: PASSWORD },
  driver1: { email: "driver1@gmail.com", password: PASSWORD },
  driver2: { email: "driver2@gmail.com", password: PASSWORD },
  driver3: { email: "driver3@gmail.com", password: PASSWORD },
  driver4: { email: "driver4@gmail.com", password: PASSWORD },
  passenger1: { email: "passenger1@gmail.com", password: PASSWORD },
};

type LoginPayload = {
  accessToken?: string;
  user?: {
    id?: string;
    role?: string;
    email?: string;
  };
};

type CaseResult = {
  name: string;
  ok: boolean;
  details: string;
};

const request = async <T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    token?: string;
    body?: unknown;
  }
) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options?.method || "GET",
    headers: {
      "content-type": "application/json",
      ...(options?.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  return { response, payload: payload as T };
};

const expectStatus = async (
  name: string,
  run: () => Promise<{ response: Response; payload: unknown }>,
  expectedStatuses: number[]
): Promise<CaseResult> => {
  try {
    const { response, payload } = await run();
    if (!expectedStatuses.includes(response.status)) {
      return {
        name,
        ok: false,
        details: `Expected ${expectedStatuses.join("/")} but got ${response.status}. Payload: ${JSON.stringify(payload)}`,
      };
    }
    return {
      name,
      ok: true,
      details: `Status ${response.status}`,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      details: `Request failed: ${String(error)}`,
    };
  }
};

const login = async (email: string, password: string) => {
  const { response, payload } = await request<LoginPayload>("/auth/login", {
    method: "POST",
    body: { email, password },
  });

  if (response.status !== 200 || !payload.accessToken) {
    throw new Error(`Login failed for ${email}. Status ${response.status}`);
  }

  return payload;
};

const run = async () => {
  const results: CaseResult[] = [];

  const admin = await login(ACCOUNTS.admin.email, ACCOUNTS.admin.password);
  const driver1 = await login(ACCOUNTS.driver1.email, ACCOUNTS.driver1.password);
  const driver2 = await login(ACCOUNTS.driver2.email, ACCOUNTS.driver2.password);
  const driver4 = await login(ACCOUNTS.driver4.email, ACCOUNTS.driver4.password);
  const passenger = await login(ACCOUNTS.passenger1.email, ACCOUNTS.passenger1.password);

  const smokeId = Date.now();
  const routeName = `Smoke Route ${smokeId}`;

  let createdRouteId = "";
  let createdJeepneyId = "";
  let createdScheduleId = "";
  let driver2ScheduleId = "";

  results.push(
    await expectStatus(
      "admin create route",
      () =>
        request<{ route?: { id?: string } }>("/admin/routes", {
          method: "POST",
          token: admin.accessToken,
          body: {
            name: routeName,
            origin: "Cebu IT Park",
            destination: "Ayala Center Cebu",
            baseFare: 17,
            isActive: true,
          },
        }).then((res) => {
          createdRouteId = res.payload?.route?.id || "";
          return res;
        }),
      [201]
    )
  );

  results.push(
    await expectStatus(
      "admin update route",
      () =>
        request(`/admin/routes/${createdRouteId}`, {
          method: "PATCH",
          token: admin.accessToken,
          body: { baseFare: 18 },
        }),
      [200]
    )
  );

  results.push(
    await expectStatus(
      "admin create jeepney",
      () =>
        request<{ jeepney?: { id?: string } }>("/admin/jeepneys", {
          method: "POST",
          token: admin.accessToken,
          body: {
            code: `SMOKE-JEEP-${smokeId}`,
            plateNumber: `SMK-${String(smokeId).slice(-4)}`,
            routeId: createdRouteId,
            driverId: driver4.user?.id,
            capacity: 20,
            status: "active",
          },
        }).then((res) => {
          createdJeepneyId = res.payload?.jeepney?.id || "";
          return res;
        }),
      [201]
    )
  );

  const departureAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  departureAt.setHours(8, 0, 0, 0);
  const arrivalAt = new Date(departureAt);
  arrivalAt.setMinutes(arrivalAt.getMinutes() + 45);

  results.push(
    await expectStatus(
      "admin create schedule",
      () =>
        request<{ schedule?: { id?: string } }>("/admin/schedules", {
          method: "POST",
          token: admin.accessToken,
          body: {
            jeepneyId: createdJeepneyId,
            routeId: createdRouteId,
            departureAt: departureAt.toISOString(),
            arrivalAt: arrivalAt.toISOString(),
            status: "scheduled",
          },
        }).then((res) => {
          createdScheduleId = res.payload?.schedule?.id || "";
          return res;
        }),
      [201]
    )
  );

  results.push(
    await expectStatus(
      "admin update schedule",
      () =>
        request(`/admin/schedules/${createdScheduleId}`, {
          method: "PATCH",
          token: admin.accessToken,
          body: { status: "completed" },
        }),
      [200]
    )
  );

  const driver2Schedules = await request<{ schedules?: Array<{ id: string }> }>("/driver/schedules/me", {
    token: driver2.accessToken,
  });
  driver2ScheduleId = driver2Schedules.payload?.schedules?.[0]?.id || "";

  results.push(
    await expectStatus(
      "driver can only manage own schedule",
      () =>
        request(`/driver/schedules/me/${driver2ScheduleId}`, {
          method: "PATCH",
          token: driver1.accessToken,
          body: { status: "cancelled" },
        }),
      [404]
    )
  );

  results.push(
    await expectStatus(
      "driver cannot access admin routes",
      () =>
        request("/admin/routes", {
          method: "POST",
          token: driver1.accessToken,
          body: {
            name: `Forbidden Route ${smokeId}`,
            origin: "A",
            destination: "B",
            baseFare: 10,
          },
        }),
      [403]
    )
  );

  results.push(
    await expectStatus(
      "driver own jeepney endpoint",
      () => request("/driver/jeepney/me", { token: driver1.accessToken }),
      [200]
    )
  );

  results.push(
    await expectStatus(
      "passenger can read jeepneys",
      () => request("/jeepneys", { token: passenger.accessToken }),
      [200]
    )
  );

  results.push(
    await expectStatus(
      "passenger can read schedules",
      () => request("/schedules", { token: passenger.accessToken }),
      [200]
    )
  );

  results.push(
    await expectStatus(
      "passenger cannot access driver own endpoint",
      () => request("/driver/jeepney/me", { token: passenger.accessToken }),
      [403]
    )
  );

  results.push(
    await expectStatus(
      "admin delete schedule",
      () =>
        request(`/admin/schedules/${createdScheduleId}`, {
          method: "DELETE",
          token: admin.accessToken,
        }),
      [200]
    )
  );

  results.push(
    await expectStatus(
      "admin delete jeepney",
      () =>
        request(`/admin/jeepneys/${createdJeepneyId}`, {
          method: "DELETE",
          token: admin.accessToken,
        }),
      [200]
    )
  );

  results.push(
    await expectStatus(
      "admin delete route",
      () =>
        request(`/admin/routes/${createdRouteId}`, {
          method: "DELETE",
          token: admin.accessToken,
        }),
      [200]
    )
  );

  const passed = results.filter((result) => result.ok);
  const failed = results.filter((result) => !result.ok);

  // eslint-disable-next-line no-console
  console.table(
    results.map((result) => ({
      check: result.name,
      status: result.ok ? "PASS" : "FAIL",
      details: result.details,
    }))
  );

  // eslint-disable-next-line no-console
  console.log(`Smoke tests complete: ${passed.length} passed, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exit(1);
  }
};

void run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Smoke test run failed:", error);
  process.exit(1);
});

export {};
