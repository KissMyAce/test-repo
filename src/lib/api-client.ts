const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/api/v1";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown, message?: string) {
    super(message || `API request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type TokenGetter = () => string | null;
type UnauthorizedHandler = () => Promise<boolean>;

class ApiClient {
  private getToken: TokenGetter = () => null;
  private handleUnauthorized: UnauthorizedHandler | null = null;

  setTokenGetter(getter: TokenGetter) {
    this.getToken = getter;
  }

  setUnauthorizedHandler(handler: UnauthorizedHandler) {
    this.handleUnauthorized = handler;
  }

  async request<T = unknown>(
    path: string,
    init: RequestInit = {},
    retryOnUnauthorized = true
  ): Promise<T> {
    const token = this.getToken();
    const headers = new Headers(init.headers || {});

    if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      ...init,
      headers,
    });

    const isRefreshRequest = path === "/auth/refresh";

    if (
      response.status === 401 &&
      retryOnUnauthorized &&
      this.handleUnauthorized &&
      !isRefreshRequest
    ) {
      const refreshed = await this.handleUnauthorized();
      if (refreshed) {
        return this.request<T>(path, init, false);
      }
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      throw new ApiError(response.status, payload);
    }

    return payload as T;
  }

  get<T = unknown>(path: string, init: RequestInit = {}) {
    return this.request<T>(path, { ...init, method: "GET" });
  }

  post<T = unknown>(path: string, body?: unknown, init: RequestInit = {}) {
    return this.request<T>(path, {
      ...init,
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  patch<T = unknown>(path: string, body?: unknown, init: RequestInit = {}) {
    return this.request<T>(path, {
      ...init,
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  delete<T = unknown>(path: string, init: RequestInit = {}) {
    return this.request<T>(path, { ...init, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
