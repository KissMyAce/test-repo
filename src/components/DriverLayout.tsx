import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Bus,
  Calendar,
  Users,
  User,
  Bell,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";

const sidebarLinks = [
  { to: "/driver/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/driver/jeepney", icon: Bus, label: "My Jeepney" },
  { to: "/driver/schedules", icon: Calendar, label: "Schedules" },
  { to: "/driver/passengers", icon: Users, label: "Passengers" },
  { to: "/driver/profile", icon: User, label: "Profile" },
];

const mobileNavLinks = [
  { to: "/driver/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/driver/jeepney", icon: Bus, label: "My Jeepney" },
  { to: "/driver/schedules", icon: Calendar, label: "Schedules" },
  { to: "/driver/passengers", icon: Users, label: "Passengers" },
];

const DriverLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const driverName = "Juan";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 gradient-bg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-primary-foreground"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-bold text-sm">
              {driverName.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-primary-foreground/70 text-xs leading-tight">Welcome,</p>
              <p className="text-primary-foreground font-semibold text-sm leading-tight">{driverName}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/driver/dashboard" className="relative p-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-destructive ring-2 ring-primary" />
          </Link>
          <button className="p-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-60 bg-card border-r border-border p-4 gap-1">
          <div className="flex items-center gap-2 px-3 mb-6">
            <div className="icon-badge w-8 h-8">
              <Bus className="w-4 h-4" />
            </div>
            <span className="font-bold text-foreground">Jee-PS Driver</span>
          </div>
          {sidebarLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card p-4 pt-20 flex flex-col gap-1 animate-fade-in shadow-xl">
              {sidebarLinks.map((link) => {
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 pb-20 lg:pb-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-card border-t border-border">
        <div className="flex items-center justify-around py-2">
          {mobileNavLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <link.icon className={`w-5 h-5 ${active ? "fill-primary/20" : ""}`} />
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default DriverLayout;
