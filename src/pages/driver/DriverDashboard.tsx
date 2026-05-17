import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bus,
  Calendar,
  Users,
  ArrowRight,
  Clock,
  MapPin,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyJeepneyRequest, getMySchedulesRequest, JeepneyData, ScheduleData } from "@/features/auth/api";
import { format, parseISO } from "date-fns";

const DriverDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [jeepney, setJeepney] = useState<JeepneyData | null>(null);
  const [todaySchedules, setTodaySchedules] = useState<ScheduleData[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const todayText = new Date().toISOString().slice(0, 10);
        const [jeepneyPayload, schedulesPayload] = await Promise.all([
          getMyJeepneyRequest(),
          getMySchedulesRequest({ date: todayText }),
        ]);

        if (!mounted) return;
        setLoadError(null);
        setJeepney(jeepneyPayload.jeepney || null);
        setTodaySchedules(schedulesPayload.schedules || []);
      } catch {
        if (!mounted) return;
        setLoadError("Unable to load dashboard data.");
        setJeepney(null);
        setTodaySchedules([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  const upcomingSchedule = useMemo(() => {
    return todaySchedules
      .filter((schedule) => schedule.status === "scheduled")
      .sort(
        (a, b) =>
          new Date(a.departureAt).getTime() - new Date(b.departureAt).getTime()
      )[0];
  }, [todaySchedules]);

  const totalPassengersToday = useMemo(() => {
    return todaySchedules.reduce((sum, schedule) => {
      const capacity = schedule.jeepney?.capacity || 0;
      const available = schedule.availableSeats ?? capacity;
      return sum + (capacity - available);
    }, 0);
  }, [todaySchedules]);

  const driverName = jeepney?.driver?.name || "Driver";

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-4xl">
      <Card className="card-shadow border-0 overflow-hidden">
        <div className="gradient-bg p-5 flex items-center gap-4">
          <div className="icon-badge w-12 h-12 bg-primary-foreground/20 shrink-0">
            <Bus className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-primary-foreground/80 text-sm">{getGreeting()},</p>
            <h1 className="text-primary-foreground font-bold text-lg">{driverName}</h1>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="card-shadow border-0">
          <CardContent className="p-3 text-center space-y-1">
            <div className="icon-badge w-9 h-9 mx-auto">
              <Calendar className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-foreground">{todaySchedules.length}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Today's Departures</p>
          </CardContent>
        </Card>

        <Card className="card-shadow border-0">
          <CardContent className="p-3 text-center space-y-1">
            <div className="icon-badge w-9 h-9 mx-auto">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-foreground">{totalPassengersToday}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Passengers Today</p>
          </CardContent>
        </Card>

        <Card className="card-shadow border-0">
          <CardContent className="p-3 text-center space-y-1">
            <div className="icon-badge w-9 h-9 mx-auto">
              <Bus className="w-4 h-4" />
            </div>
            <Badge
              className={`text-[10px] mt-1 ${
                jeepney?.status === "active"
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {jeepney?.status === "active" ? "Active" : "Inactive"}
            </Badge>
            <p className="text-[10px] text-muted-foreground leading-tight">Jeepney Status</p>
          </CardContent>
        </Card>
      </div>

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

      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingSchedule ? (
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {upcomingSchedule.route?.origin || "-"} → {upcomingSchedule.route?.destination || "-"}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(parseISO(upcomingSchedule.departureAt), "hh:mm a")}
                  </span>
                  <span>
                    {((upcomingSchedule.jeepney?.capacity || 0) - (upcomingSchedule.availableSeats || 0))}/
                    {upcomingSchedule.jeepney?.capacity || 0} booked
                  </span>
                </div>
                <Badge className="text-[10px] bg-success text-success-foreground">{upcomingSchedule.status}</Badge>
              </div>
              <Button size="sm" variant="outline" className="shrink-0" asChild>
                <Link to="/driver/schedules">
                  View <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 space-y-2">
              <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No schedule for today</p>
              <Button size="sm" asChild>
                <Link to="/driver/schedules">Add Schedule</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bus className="w-4 h-4 text-primary" />
            My Jeepney
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jeepney ? (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                <Bus className="w-7 h-7 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-semibold text-sm text-foreground">{jeepney.code}</p>
                <p className="text-xs text-muted-foreground">{jeepney.plateNumber}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {jeepney.route?.origin || "-"} → {jeepney.route?.destination || "-"}
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/driver/jeepney">
                  Manage <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4" />
              No jeepney assigned yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card-shadow border-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Recent Passengers
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link to="/driver/passengers">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Passenger activity will appear here once bookings are integrated.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverDashboard;
