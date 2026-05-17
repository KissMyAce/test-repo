export type UserRole = "passenger" | "driver" | "admin";
export type UserStatus = "active" | "pending_verification" | "suspended";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
