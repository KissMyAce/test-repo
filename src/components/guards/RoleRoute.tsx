import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-store";
import { getRoleHomePath } from "@/features/auth/session";
import { UserRole } from "@/features/auth/types";

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

const RoleRoute = ({ allowedRoles }: RoleRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  if (user.role === "driver" && user.status !== "active") {
    return <Navigate to="/login" replace state={{ reason: "driver_not_approved" }} />;
  }

  return <Outlet />;
};

export default RoleRoute;
