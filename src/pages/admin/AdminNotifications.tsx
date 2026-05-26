import { useState, useEffect } from "react";
import { Bell, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPendingDriversRequest,
} from "@/features/auth/api";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: "driver_verification" | "system";
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

const typeIcons: Record<AdminNotification["type"], typeof Bell> = {
  driver_verification: AlertCircle,
  system: Bell,
};

const typeColors: Record<AdminNotification["type"], string> = {
  driver_verification: "bg-[hsl(217_72%_92%)] text-primary",
  system: "bg-muted text-muted-foreground",
};

const AdminNotifications = () => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      try {
        const newNotifications: AdminNotification[] = [];

        // Fetch pending driver verifications
        try {
          const driversPayload = await getPendingDriversRequest();
          const pendingDrivers = Array.isArray(driversPayload)
            ? driversPayload
            : (driversPayload as any)?.users || [];
          
          if (pendingDrivers.length > 0) {
            newNotifications.push({
              id: `driver_pending_${Date.now()}`,
              title: "Driver Verification Queue",
              message: `${pendingDrivers.length} driver(s) awaiting verification`,
              type: "driver_verification",
              read: false,
              createdAt: new Date().toISOString(),
              actionUrl: "/admin/users",
            });
          }
        } catch (error) {
          // Error fetching drivers
          console.error("Error loading pending drivers:", error);
        }

        if (!mounted) return;
        setNotifications(newNotifications);
        setLoading(false);
      } catch (error) {
        if (!mounted) return;
        console.error("Error loading notifications:", error);
        toast({
          title: "Load failed",
          description: "Unable to load notifications",
          variant: "destructive",
        });
        setLoading(false);
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
          <p className="text-muted-foreground text-sm">No pending notifications at this time.</p>
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

export default AdminNotifications;
