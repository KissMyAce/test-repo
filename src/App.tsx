import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RegisterChoice from "./pages/RegisterChoice";
import RegisterDriver from "./pages/RegisterDriver";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthLayout from "./components/AuthLayout";
import Dashboard from "./pages/Dashboard";
import Jeepneys from "./pages/Jeepneys";
import JeepneyDetail from "./pages/JeepneyDetail";
import Schedules from "./pages/Schedules";
import ScheduleDetail from "./pages/ScheduleDetail";
import Booking from "./pages/Booking";
import Payment from "./pages/Payment";
import PaymentStatus from "./pages/PaymentStatus";
import MyBookings from "./pages/MyBookings";
import BookingDetail from "./pages/BookingDetail";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import DriverLayout from "./components/DriverLayout";
import DriverDashboard from "./pages/driver/DriverDashboard";
import DriverJeepney from "./pages/driver/DriverJeepney";
import DriverSchedules from "./pages/driver/DriverSchedules";
import DriverPassengers from "./pages/driver/DriverPassengers";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminJeepneys from "./pages/admin/AdminJeepneys";
import AdminRoutes from "./pages/admin/AdminRoutes";
import AdminSchedules from "./pages/admin/AdminSchedules";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder";
import AdminDriverVerification from "./pages/admin/AdminDriverVerification";
import PublicOnlyRoute from "./components/guards/PublicOnlyRoute";
import ProtectedRoute from "./components/guards/ProtectedRoute";
import RoleRoute from "./components/guards/RoleRoute";
import { AuthProvider } from "./features/auth/auth-store";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<RegisterChoice />} />
              <Route path="/register/passenger" element={<Register />} />
              <Route path="/register/driver" element={<RegisterDriver />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            {/* Passenger (Authenticated) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<RoleRoute allowedRoles={["passenger"]} />}>
                <Route element={<AuthLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/schedules" element={<Schedules />} />
                  <Route path="/schedules/:id" element={<ScheduleDetail />} />
                  <Route path="/jeepneys" element={<Jeepneys />} />
                  <Route path="/jeepneys/:id" element={<JeepneyDetail />} />
                  <Route path="/my-bookings" element={<MyBookings />} />
                  <Route path="/my-bookings/:id" element={<BookingDetail />} />
                  <Route path="/booking" element={<Booking />} />
                  <Route path="/payment/:bookingId" element={<Payment />} />
                  <Route path="/payment/status/:bookingId" element={<PaymentStatus />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
              </Route>
              {/* Driver (Authenticated) */}
              <Route element={<RoleRoute allowedRoles={["driver"]} />}>
                <Route element={<DriverLayout />}>
                  <Route path="/driver/dashboard" element={<DriverDashboard />} />
                  <Route path="/driver/jeepney" element={<DriverJeepney />} />
                  <Route path="/driver/schedules" element={<DriverSchedules />} />
                  <Route path="/driver/passengers" element={<DriverPassengers />} />
                  <Route path="/driver/profile" element={<Profile />} />
                </Route>
              </Route>
              {/* Admin (Authenticated) */}
              <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/jeepneys" element={<AdminJeepneys />} />
                  <Route path="/admin/routes" element={<AdminRoutes />} />
                  <Route path="/admin/schedules" element={<AdminSchedules />} />
                  <Route path="/admin/bookings" element={<AdminPlaceholder />} />
                  <Route path="/admin/users" element={<AdminDriverVerification />} />
                  <Route path="/admin/reports" element={<AdminPlaceholder />} />
                  <Route path="/admin/profile" element={<Profile />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
