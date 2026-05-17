import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bus,
  Calendar,
  Ticket,
  Plus,
  Route,
  ChevronRight,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getAdminSchedulesRequest,
  getJeepneysRequest,
  getRoutesRequest,
} from "@/features/auth/api";

const bookingsChartData = [
  { day: "Mon", bookings: 12 },
  { day: "Tue", bookings: 18 },
  { day: "Wed", bookings: 9 },
  { day: "Thu", bookings: 22 },
  { day: "Fri", bookings: 15 },
  { day: "Sat", bookings: 28 },
  { day: "Sun", bookings: 20 },
];

const mockUsers = [
  { name: "Esti Mendoza", email: "esti@email.com", role: "passenger", joined: "Feb 15, 2026" },
  { name: "Juan Dela Cruz", email: "juan@email.com", role: "driver", joined: "Feb 10, 2026" },
  { name: "Maria Santos", email: "maria@email.com", role: "driver", joined: "Feb 8, 2026" },
  { name: "Carlos Reyes", email: "carlos@email.com", role: "passenger", joined: "Feb 5, 2026" },
];

const recentBookings: Array<{
  id: string;
  reference: string;
  routeName: string;
  total: number;
  status: "confirmed" | "pending" | "completed" | "cancelled";
}> = [];

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [totalJeepneys, setTotalJeepneys] = useState(0);
  const [activeSchedulesToday, setActiveSchedulesToday] = useState(0);
  const [schedulesThisWeek, setSchedulesThisWeek] = useState(0);
  const [activeRoutes, setActiveRoutes] = useState(0);
  const [routeActivityData, setRouteActivityData] = useState<Array<{ route: string; schedules: number }>>([]);

  useEffect(() => {
    let mounted = true;

    const loadCounts = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const dayText = today.toISOString().slice(0, 10);
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 6);

        const [jeepneyPayload, todaySchedulesPayload, weekSchedulesPayload, activeRoutesPayload] =
          await Promise.all([
            getJeepneysRequest(),
            getAdminSchedulesRequest({ date: dayText, status: "scheduled" }),
            getAdminSchedulesRequest({
              departureFrom: weekStart.toISOString(),
              departureTo: today.toISOString(),
            }),
            getRoutesRequest({ isActive: true }),
          ]);

        if (!mounted) return;
        setLoadError(null);
        setTotalJeepneys((jeepneyPayload.jeepneys || []).length);
        setActiveSchedulesToday((todaySchedulesPayload.schedules || []).length);
        setSchedulesThisWeek((weekSchedulesPayload.schedules || []).length);
        setActiveRoutes((activeRoutesPayload.routes || []).length);
        const activityMap = new Map<string, number>();
        (weekSchedulesPayload.schedules || []).forEach((schedule) => {
          const key = schedule.route?.name || "Unknown";
          activityMap.set(key, (activityMap.get(key) || 0) + 1);
        });
        setRouteActivityData(
          Array.from(activityMap.entries())
            .map(([route, schedules]) => ({ route, schedules }))
            .sort((a, b) => b.schedules - a.schedules)
            .slice(0, 6)
        );
      } catch {
        if (!mounted) return;
        setLoadError("Unable to load dashboard metrics.");
        setTotalJeepneys(0);
        setActiveSchedulesToday(0);
        setSchedulesThisWeek(0);
        setActiveRoutes(0);
        setRouteActivityData([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadCounts();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-success text-success-foreground";
      case "pending": return "bg-warning text-warning-foreground";
      case "completed": return "bg-muted text-muted-foreground";
      case "cancelled": return "bg-destructive text-destructive-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case "driver": return "bg-primary text-primary-foreground";
      case "admin": return "bg-destructive text-destructive-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-5xl">
      {/* Welcome */}
      <Card className="card-shadow border-0 overflow-hidden">
        <div className="gradient-bg p-5 flex items-center gap-4">
          <div className="icon-badge w-12 h-12 bg-primary-foreground/20 shrink-0">
            <Bus className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-primary-foreground/80 text-sm">{getGreeting()},</p>
            <h1 className="text-primary-foreground font-bold text-lg">Admin</h1>
          </div>
        </div>
      </Card>

      {/* Stat Cards */}
      {loadError && (
        <Card className="card-shadow border-0">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button size="sm" variant="outline" onClick={() => setReloadKey((value) => value + 1)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Bus, value: totalJeepneys, label: "Total Jeepneys" },
          { icon: Calendar, value: activeSchedulesToday, label: "Active Schedules Today" },
          { icon: Ticket, value: schedulesThisWeek, label: "Schedules This Week" },
          { icon: Route, value: activeRoutes, label: "Active Routes" },
        ].map((stat, i) => (
          <Card key={i} className="card-shadow border-0">
            <CardContent className="p-4 text-center space-y-1">
              <div className="icon-badge w-9 h-9 mx-auto">
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Bookings Over Time */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              Bookings (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bookingsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 25% 90%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(215 16% 52%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(215 16% 52%)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      boxShadow: "0 4px 16px hsl(217 72% 56% / 0.1)",
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="bookings" stroke="hsl(217 72% 56%)" strokeWidth={2} dot={{ fill: "hsl(217 72% 56%)", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Route */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="w-4 h-4 text-primary" />
              Schedules by Route
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routeActivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 25% 90%)" />
                  <XAxis dataKey="route" tick={{ fontSize: 10 }} stroke="hsl(215 16% 52%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(215 16% 52%)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      boxShadow: "0 4px 16px hsl(217 72% 56% / 0.1)",
                      fontSize: 12,
                    }}
                    formatter={(val: number) => [val.toLocaleString(), "Schedules"]}
                  />
                  <Bar dataKey="schedules" fill="hsl(217 72% 56%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              Recent Bookings
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link to="/admin/bookings">View All <ChevronRight className="w-3 h-3" /></Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {recentBookings.length > 0 ? recentBookings.map((b) => (
              <div key={b.id} className="p-3 rounded-xl bg-accent/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{b.reference}</span>
                  <Badge className={`text-[10px] ${statusColor(b.status)}`}>{b.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{b.routeName} · ₱{b.total}</p>
              </div>
            )) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Booking feed will appear once bookings API is connected.
              </div>
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings.length > 0 ? recentBookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium text-xs">{b.reference}</TableCell>
                    <TableCell className="text-xs">-</TableCell>
                    <TableCell className="text-xs">{b.routeName}</TableCell>
                    <TableCell className="text-xs">₱{b.total}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColor(b.status)}`}>{b.status}</Badge>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell className="text-xs text-muted-foreground" colSpan={5}>
                      Booking feed will appear once bookings API is connected.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Users */}
      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Recent Users
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link to="/admin/users">View All <ChevronRight className="w-3 h-3" /></Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {mockUsers.map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground shrink-0">
                  {u.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                  <p className="text-[11px] text-muted-foreground">{u.email}</p>
                </div>
                <Badge className={`text-[10px] shrink-0 ${roleColor(u.role)}`}>{u.role}</Badge>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{u.name}</TableCell>
                    <TableCell className="text-xs">{u.email}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${roleColor(u.role)}`}>{u.role}</Badge></TableCell>
                    <TableCell className="text-xs">{u.joined}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link to="/admin/jeepneys"><Plus className="w-4 h-4" /> Add Jeepney</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/admin/schedules"><Plus className="w-4 h-4" /> Add Schedule</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/admin/routes"><Plus className="w-4 h-4" /> Add Route</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
