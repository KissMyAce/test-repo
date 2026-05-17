import { AuthUser, UserRole } from "./types";

const AUTH_STORAGE_KEY = "jeeps.auth.user";

const hasWindow = typeof window !== "undefined";

export const getRoleHomePath = (role: UserRole) => {
  if (role === "driver") return "/driver/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/dashboard";
};

export const persistAuthUser = (user: AuthUser) => {
  if (!hasWindow) return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
};

export const getPersistedAuthUser = (): AuthUser | null => {
  if (!hasWindow) return null;

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (
      !parsed ||
      !parsed.id ||
      !parsed.email ||
      !parsed.role ||
      !parsed.status ||
      !parsed.name
    ) {
      return null;
    }

    if (!["passenger", "driver", "admin"].includes(parsed.role)) return null;
    if (!["active", "pending_verification", "suspended"].includes(parsed.status)) return null;

    return parsed as AuthUser;
  } catch {
    return null;
  }
};

export const clearPersistedAuthUser = () => {
  if (!hasWindow) return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const resolveRoleFromEmail = (email: string): UserRole => {
  const value = email.toLowerCase();
  if (value.includes("admin")) return "admin";
  if (value.includes("driver")) return "driver";
  return "passenger";
};
