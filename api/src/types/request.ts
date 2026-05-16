import { UserRole, UserStatus } from "./auth";

export interface AuthContextUser {
  id: string;
  role: UserRole;
  status: UserStatus;
  email: string;
  name: string;
}
