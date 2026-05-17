import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-store";
import { getRoleHomePath } from "@/features/auth/session";

const PublicOnlyRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (user?.role === "driver" && user.status !== "active") {
    return <Outlet />;
  }

  if (user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  return <Outlet />;
};

export default PublicOnlyRoute;
