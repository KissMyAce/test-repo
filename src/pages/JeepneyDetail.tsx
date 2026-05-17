import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bus, ChevronLeft, Clock, MapPin, User, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getJeepneyByIdRequest,
  getSchedulesRequest,
  JeepneyData,
  ScheduleData,
} from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const JeepneyDetail = () => {
  const { toast } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jeepney, setJeepney] = useState<JeepneyData | null>(null);
  const [upcomingSchedules, setUpcomingSchedules] = useState<ScheduleData[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [jeepneyPayload, schedulePayload] = await Promise.all([
          getJeepneyByIdRequest(id),
          getSchedulesRequest({ jeepneyId: id, status: "scheduled" }),
        ]);
        if (!mounted) return;
        setJeepney(jeepneyPayload.jeepney || null);
        setUpcomingSchedules((schedulePayload.schedules || []).slice(0, 5));
      } catch (error) {
        if (!mounted) return;
        setJeepney(null);
        setUpcomingSchedules([]);
        if (!(error instanceof ApiError && error.status === 404)) {
          toast({
            title: "Load failed",
            description: "Unable to load jeepney details.",
            variant: "destructive",
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [id, toast]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!jeepney) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-fade-in">
        <p className="text-muted-foreground">Jeepney not found</p>
        <Button
          variant="outline"
          className="mt-4 rounded-xl"
          onClick={() => navigate("/jeepneys")}
        >
          Back to Jeepneys
        </Button>
      </div>
    );
  }

  const infoItems = [
    {
      icon: MapPin,
      label: "Route",
      value: `${jeepney.route?.origin || "-"} -> ${jeepney.route?.destination || "-"}`,
    },
    { icon: Users, label: "Capacity", value: `${jeepney.capacity} seats` },
    { icon: Bus, label: "Plate", value: jeepney.plateNumber },
    { icon: Bus, label: "Code", value: jeepney.code },
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="rounded-2xl overflow-hidden card-shadow animate-fade-in">
        <div className="h-44 gradient-bg flex items-center justify-center">
          <Bus className="w-16 h-16 text-primary-foreground/40" />
        </div>
        <div className="bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">{jeepney.code}</h1>
              <p className="text-sm text-muted-foreground">{jeepney.plateNumber}</p>
            </div>
            <Badge
              variant={jeepney.status === "active" ? "default" : "secondary"}
              className={jeepney.status === "active" ? "bg-success text-success-foreground" : ""}
            >
              {jeepney.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {infoItems.map((item) => (
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
        <h3 className="text-sm font-semibold text-foreground mb-3">Driver</h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">{jeepney.driver?.name || "Unassigned"}</p>
            <p className="text-xs text-muted-foreground">{jeepney.driver?.email || "No email"}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Upcoming Schedules</h3>
        {upcomingSchedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming schedules for this jeepney.</p>
        ) : (
          <div className="space-y-2">
            {upcomingSchedules.map((schedule) => {
              const departure = parseISO(schedule.departureAt);
              const arrival = parseISO(schedule.arrivalAt);
              return (
                <div key={schedule.id} className="bg-card rounded-xl p-3 card-shadow">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {format(departure, "yyyy-MM-dd")}
                    </p>
                    <Badge variant="secondary" className="text-[10px]">
                      {schedule.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {format(departure, "hh:mm a")} — {format(arrival, "hh:mm a")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {schedule.route?.origin || "-"} to {schedule.route?.destination || "-"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default JeepneyDetail;
