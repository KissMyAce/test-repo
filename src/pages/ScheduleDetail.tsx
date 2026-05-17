import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MapPin, Clock, Calendar, Bus, Users, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getScheduleByIdRequest, ScheduleData, ScheduleStatus } from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const statusColors: Record<ScheduleStatus, string> = {
  scheduled: "bg-success text-success-foreground",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

const ScheduleDetail = () => {
  const { toast } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadSchedule = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const payload = await getScheduleByIdRequest(id);
        if (!mounted) return;
        setLoadError(null);
        setSchedule(payload.schedule || null);
      } catch (error) {
        if (!mounted) return;
        setSchedule(null);

        if (!(error instanceof ApiError && error.status === 404)) {
          setLoadError("Unable to load schedule details.");
          toast({
            title: "Load failed",
            description: "Unable to load schedule details.",
            variant: "destructive",
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadSchedule();

    return () => {
      mounted = false;
    };
  }, [id, toast, reloadKey]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-fade-in">
        <p className="text-muted-foreground">{loadError || "Schedule not found"}</p>
        <div className="mt-4 flex gap-2">
          {loadError && (
            <Button variant="outline" className="rounded-xl" onClick={() => setReloadKey((value) => value + 1)}>
              Retry
            </Button>
          )}
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/schedules")}>
            Back to Schedules
          </Button>
        </div>
      </div>
    );
  }

  const departure = parseISO(schedule.departureAt);
  const arrival = parseISO(schedule.arrivalAt);
  const totalSeats = schedule.jeepney?.capacity || 0;
  const availableSeats = schedule.availableSeats ?? totalSeats;
  const seatPercent = totalSeats > 0 ? (availableSeats / totalSeats) * 100 : 0;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="gradient-bg rounded-2xl p-5 text-primary-foreground animate-fade-in">
        <Badge className={cn("mb-3 text-[10px]", statusColors[schedule.status])}>{schedule.status}</Badge>
        <h1 className="text-lg font-bold">{schedule.route?.name || "Route"}</h1>
        <p className="text-primary-foreground/80 text-sm flex items-center gap-1.5 mt-1">
          <MapPin className="w-3.5 h-3.5" />
          {schedule.route?.origin || "-"} → {schedule.route?.destination || "-"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Calendar, label: "Date", value: format(departure, "yyyy-MM-dd") },
          { icon: Clock, label: "Departure", value: format(departure, "hh:mm a") },
          { icon: Clock, label: "Arrival", value: format(arrival, "hh:mm a") },
          { icon: Users, label: "Available", value: `${availableSeats} seats` },
        ].map((item) => (
          <div key={item.label} className="bg-card rounded-xl p-4 card-shadow">
            <div className="flex items-center gap-2 mb-1">
              <item.icon className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-5 card-shadow">
        <h3 className="text-sm font-semibold text-foreground mb-3">Jeepney</h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <Bus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">{schedule.jeepney?.code || "-"}</p>
            <p className="text-xs text-muted-foreground">{schedule.jeepney?.plateNumber || "-"}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 card-shadow space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Seat Availability</h3>
        <Progress value={seatPercent} className="h-3" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{availableSeats} available</span>
          <span>{totalSeats} total</span>
        </div>
      </div>

      <Link to={`/booking?scheduleId=${schedule.id}`}>
        <Button
          className="w-full rounded-xl h-12 text-base font-semibold"
          disabled={availableSeats === 0 || schedule.status === "cancelled"}
        >
          {availableSeats === 0
            ? "No Seats Available"
            : schedule.status === "cancelled"
              ? "Schedule Cancelled"
              : "Book This Schedule"}
        </Button>
      </Link>
    </div>
  );
};

export default ScheduleDetail;
