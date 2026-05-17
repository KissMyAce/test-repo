import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Loader2, Route as RouteIcon, Search, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMySchedulesRequest, ScheduleData } from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const DriverPassengers = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [scheduleList, setScheduleList] = useState<ScheduleData[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadSchedules = async () => {
      setLoading(true);
      try {
        const payload = await getMySchedulesRequest();
        if (!mounted) return;
        setLoadError(null);
        setScheduleList(payload.schedules || []);
      } catch (error) {
        if (!mounted) return;
        let description = "Unable to load schedule manifest.";
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
  }, [toast]);

  const filteredSchedules = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return scheduleList.filter((schedule) => {
      const selected = scheduleFilter === "all" || schedule.id === scheduleFilter;
      if (!selected) return false;

      if (!keyword) return true;

      const routeName = schedule.route?.name?.toLowerCase() || "";
      const jeepney = schedule.jeepney?.code?.toLowerCase() || "";
      const plate = schedule.jeepney?.plateNumber?.toLowerCase() || "";

      return routeName.includes(keyword) || jeepney.includes(keyword) || plate.includes(keyword);
    });
  }, [scheduleList, scheduleFilter, search]);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 flex-1" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold text-foreground">Passengers</h1>

      <Card className="card-shadow border-0">
        <CardContent className="p-4 text-sm text-muted-foreground flex items-center gap-2">
          <Users className="w-4 h-4" />
          Passenger-level manifest endpoint is not available yet. Showing real schedule occupancy from API.
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
          <SelectTrigger className="sm:w-80">
            <SelectValue placeholder="All schedules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schedules</SelectItem>
            {scheduleList.map((schedule) => {
              const departure = parseISO(schedule.departureAt);
              return (
                <SelectItem key={schedule.id} value={schedule.id}>
                  {format(departure, "yyyy-MM-dd HH:mm")} — {schedule.route?.origin || "-"} to {schedule.route?.destination || "-"}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search route or jeepney..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loadError ? (
        <Card className="card-shadow border-0">
          <CardContent className="p-4 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      ) : filteredSchedules.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="icon-badge-lg mx-auto bg-muted text-muted-foreground">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No schedule occupancy yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Occupancy will show once schedules are created and bookings are integrated.
          </p>
        </div>
      ) : (
        <Card className="card-shadow border-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Jeepney</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Booked</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchedules.map((schedule) => {
                const departure = parseISO(schedule.departureAt);
                const capacity = schedule.jeepney?.capacity || 0;
                const availableSeats = schedule.availableSeats ?? 0;
                const bookedSeats = Math.max(0, capacity - availableSeats);

                return (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <RouteIcon className="w-3.5 h-3.5 text-primary" />
                        {schedule.route?.name || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {schedule.route?.origin || "-"} to {schedule.route?.destination || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground">{schedule.jeepney?.code || "-"}</div>
                      <div className="text-xs text-muted-foreground">{schedule.jeepney?.plateNumber || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {format(departure, "yyyy-MM-dd")}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {format(departure, "hh:mm a")}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{bookedSeats}</TableCell>
                    <TableCell className="text-sm">{availableSeats}</TableCell>
                    <TableCell>
                      <Badge variant={schedule.status === "scheduled" ? "default" : "secondary"}>
                        {schedule.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {!loadError && filteredSchedules.length > 0 && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="w-3 h-3" />
          Passenger-level names/contact will populate once bookings API is available.
        </div>
      )}
    </div>
  );
};

export default DriverPassengers;
