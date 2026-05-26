import { useState, useEffect } from "react";
import { Bell, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMySchedulesRequest,
  getMyJeepneyRequest,
} from "@/features/auth/api";
import { parseISO, format } from "date-fns";

interface DriverNotification {
  id: string;
  title: string;
  message: string;
  type: "schedule" | "booking" | "jeepney" | "system";
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

const typeIcons: Record<DriverNotification["type"], typeof Bell> = {
  schedule: AlertCircle,
  booking: AlertCircle,
  jeepney: AlertCircle,
  system: Bell,
};

const typeColors: Record<DriverNotification["type"], string> = {
  schedule: "bg-[hsl(38_92%_90%)] text-[hsl(38_92%_35%)]",
  booking: "bg-[hsl(152_60%_90%)] text-[hsl(152_60%_32%)]",
  jeepney: "bg-[hsl(217_72%_92%)] text-primary",
  system: "bg-muted text-muted-foreground",
};

const DriverNotifications = () => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      try {
        const newNotifications: DriverNotification[] = [];

        // Fetch today's schedules
        try {
          const todayText = new Date().toISOString().slice(0, 10);
          const schedulesPayload = await getMySchedulesRequest({
            date: todayText,
            status: "scheduled",
          });
          const todaySchedules = schedulesPayload.schedules || [];
          
          if (todaySchedules.length > 0) {
            const upcomingSchedules = todaySchedules.filter(
              (s) => new Date(s.departureAt) > new Date()
            );
            if (upcomingSchedules.length > 0) {
              const nextSchedule = upcomingSchedules[0];
              newNotifications.push({
                id: `schedule_today_${Date.now()}`,
                title: "Upcoming Schedule",
                message: `You have ${upcomingSchedules.length} schedule(s) today. Next: ${
                  nextSchedule.route?.name || "Unknown route"
                } at ${format(parseISO(nextSchedule.departureAt), "hh:mm a")}`,
                type: "schedule",
                read: false,
                createdAt: new Date().toISOString(),
                actionUrl: "/driver/schedules",
              });
            }
          }
        } catch (error) {
          // Error fetching schedules
        }

        // Fetch jeepney status
        try {
          const jeepneyPayload = await getMyJeepneyRequest();
          const jeepney = jeepneyPayload.jeepney;
          
          if (jeepney) {
            if (jeepney.status === "pending") {
              newNotifications.push({
                id: `jeepney_status_${Date.now()}`,
                title: "Jeepney Verification Pending",
                message:
                  "Your jeepney is awaiting admin approval. Check back soon for updates.",
                type: "jeepney",
                read: false,
                createdAt: new Date().toISOString(),
                actionUrl: "/driver/jeepney",
              });
            } else if (jeepney.status === "rejected") {
              newNotifications.push({
                id: `jeepney_rejected_${Date.now()}`,
                title: "Jeepney Verification Failed",
                message:
                  "Your jeepney submission was not approved. Please review and resubmit.",
                type: "jeepney",
                read: false,
                createdAt: new Date().toISOString(),
                actionUrl: "/driver/jeepney",
              });
            }
          }
        } catch (error) {
          // Error fetching jeepney
        }

        if (!mounted) return;
        setNotifications(newNotifications);
      } catch (error) {
        if (!mounted) return;
        toast({
          title: "Load failed",
          description: "Unable to load notifications",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadNotifications();

    return () => {
      mounted = false;
    };
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor((diffMs % 3600000) / 60000);

    if (diffH === 0) {
      if (diffM === 0) return "Just now";
      return `${diffM}m ago`;
    }
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    return diffD === 1 ? "Yesterday" : `${diffD}d ago`;
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2 w-32">
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        <span className="text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-full font-medium">
          {notifications.length}
        </span>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <p className="font-semibold text-foreground mb-1">All caught up!</p>
          <p className="text-muted-foreground text-sm">
            No pending notifications at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type];
            return (
              <Card
                key={n.id}
                className="border-0 transition-all hover:card-shadow-lg cursor-pointer"
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      typeColors[n.type]
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate text-foreground">
                        {n.title}
                      </p>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-muted-foreground/60">
                        {formatTime(n.createdAt)}
                      </p>
                      {n.actionUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          asChild
                        >
                          <a href={n.actionUrl}>View</a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DriverNotifications;
