import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Bus, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getRoutesRequest,
  getSchedulesRequest,
  RouteData,
  ScheduleData,
  ScheduleStatus,
} from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<ScheduleStatus, string> = {
  scheduled: "bg-success text-success-foreground",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

const Schedules = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState<"all" | ScheduleStatus>("all");
  const [routeList, setRouteList] = useState<RouteData[]>([]);
  const [scheduleList, setScheduleList] = useState<ScheduleData[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadRoutes = async () => {
      try {
        const payload = await getRoutesRequest({ isActive: true });
        if (!mounted) return;
        setRouteList(payload.routes || []);
      } catch {
        if (!mounted) return;
        setRouteList([]);
      }
    };

    void loadRoutes();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSchedules = async () => {
      setLoading(true);
      try {
        const payload = await getSchedulesRequest({
          routeId: activeRoute || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          date: date ? format(date, "yyyy-MM-dd") : undefined,
        });

        if (!mounted) return;
        setLoadError(null);
        setScheduleList(payload.schedules || []);
      } catch (error) {
        if (!mounted) return;
        let description = "Unable to load schedules.";
        if (error instanceof ApiError && error.status >= 500) {
          description = "Server error. Please try again shortly.";
        }
        toast({ title: "Load failed", description, variant: "destructive" });
        setLoadError(description);
        setScheduleList([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadSchedules();

    return () => {
      mounted = false;
    };
  }, [activeRoute, date, statusFilter, toast, reloadKey]);

const filtered = useMemo(() => {
  const today = new Date();

  // Start of today (00:00:00)
  today.setHours(0, 0, 0, 0);

  return scheduleList.filter((schedule) => {
    const departureDate = parseISO(schedule.departureAt);

    // Also normalize schedule date
    departureDate.setHours(0, 0, 0, 0);

    return (
      departureDate >= today &&
      !["completed", "expired"].includes(schedule.status)
    );
  });
}, [scheduleList]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-foreground">Schedules</h1>

      <div className="flex gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("rounded-xl gap-2", date && "border-primary text-primary")}
            >
              <Calendar className="w-4 h-4" />
              {date ? format(date, "MMM d") : "Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker mode="single" selected={date} onSelect={setDate} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | ScheduleStatus)}>
          <SelectTrigger className="w-[160px] rounded-xl h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {date && (
          <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={() => setDate(undefined)}>
            Clear date
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        <button
          onClick={() => setActiveRoute(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            !activeRoute
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          }`}
        >
          All Routes
        </button>
        {routeList.map((route) => (
          <button
            key={route.id}
            onClick={() => setActiveRoute(route.id === activeRoute ? null : route.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeRoute === route.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {route.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-card rounded-2xl p-4 card-shadow space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="bg-card rounded-2xl p-5 card-shadow text-center space-y-3">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button size="sm" variant="outline" onClick={() => setReloadKey((value) => value + 1)}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-3">
            <Calendar className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No schedules found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((schedule, index) => {
            const departure = parseISO(schedule.departureAt);
            const arrival = parseISO(schedule.arrivalAt);
            const totalSeats = schedule.jeepney?.capacity || 0;
            const availableSeats = schedule.availableSeats ?? totalSeats;
            const progressValue = totalSeats > 0 ? (availableSeats / totalSeats) * 100 : 0;

            return (
              <div
                key={schedule.id}
                className="bg-card rounded-2xl p-4 card-shadow animate-slide-up space-y-3"
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {schedule.route?.origin || "-"} → {schedule.route?.destination || "-"}
                    </div>
                    <p className="text-xs text-muted-foreground">{schedule.route?.name || "-"}</p>
                  </div>
                  <Badge className={cn("text-[10px]", statusColors[schedule.status])}>
                    {schedule.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Bus className="w-3.5 h-3.5 text-primary" />
                    <span>{schedule.jeepney?.code || "-"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>{format(departure, "yyyy-MM-dd")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{format(departure, "hh:mm a")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{format(arrival, "hh:mm a")}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Seats</span>
                    <span className="font-medium text-foreground">
                      {availableSeats}/{totalSeats}
                    </span>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                </div>

                <Link to={`/schedules/${schedule.id}`}>
                  <Button variant="outline" size="sm" className="w-full rounded-xl">
                    View Schedule
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Schedules;
