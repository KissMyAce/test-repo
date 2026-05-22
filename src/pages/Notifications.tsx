import { useState } from "react";
import { Bell, Ticket, CreditCard, Calendar, Info, CheckCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { type Notification } from "@/data/mock-data";

const typeIcons: Record<Notification["type"], typeof Bell> = {
  booking: Ticket,
  payment: CreditCard,
  schedule: Calendar,
  system: Info,
};

const typeColors: Record<Notification["type"], string> = {
  booking: "bg-[hsl(217_72%_92%)] text-primary",
  payment: "bg-[hsl(152_60%_90%)] text-[hsl(152_60%_32%)]",
  schedule: "bg-[hsl(38_92%_90%)] text-[hsl(38_92%_35%)]",
  system: "bg-muted text-muted-foreground",
};

const Notifications = () => {
  const [items, setItems] = useState<Notification[]>([]);
  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => {
    setItems(items.map((n) => ({ ...n, read: true })));
    toast({ title: "All caught up!", description: "All notifications marked as read." });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date("2026-02-20T12:00:00");
    const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    return diffD === 1 ? "Yesterday" : `${diffD}d ago`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-primary">
            <CheckCheck className="w-4 h-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-primary" />
          </div>
          <p className="font-semibold text-foreground mb-1">No notifications</p>
          <p className="text-muted-foreground text-sm">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = typeIcons[n.type];
            return (
              <Card key={n.id} className={`border-0 transition-all ${n.read ? "bg-card" : "bg-secondary/50 card-shadow"}`}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${typeColors[n.type]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold truncate ${n.read ? "text-foreground" : "text-foreground"}`}>{n.title}</p>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{formatTime(n.createdAt)}</p>
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

export default Notifications;
