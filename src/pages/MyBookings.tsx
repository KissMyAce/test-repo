import { useState } from "react";
import { Link } from "react-router-dom";
import { Ticket, MapPin, Clock, Users, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { bookings, type Booking } from "@/data/mock-data";

const statusTabs = ["all", "pending", "confirmed", "completed", "cancelled"] as const;

const statusColors: Record<Booking["status"], string> = {
  pending: "bg-[hsl(38_92%_90%)] text-[hsl(38_92%_35%)]",
  confirmed: "bg-[hsl(217_72%_92%)] text-primary",
  completed: "bg-[hsl(152_60%_90%)] text-[hsl(152_60%_32%)]",
  cancelled: "bg-destructive/10 text-destructive",
};

const MyBookings = () => {
  const [activeTab, setActiveTab] = useState<typeof statusTabs[number]>("all");

  const filtered = activeTab === "all" ? bookings : bookings.filter((b) => b.status === activeTab);

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 animate-fade-in">
      <h1 className="text-xl font-bold text-foreground">My Bookings</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Booking Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Ticket className="w-8 h-8 text-primary" />
          </div>
          <p className="font-semibold text-foreground mb-1">No bookings found</p>
          <p className="text-muted-foreground text-sm">Book your first ride to get started</p>
          <Button asChild className="mt-4 rounded-2xl">
            <Link to="/booking">Book a Ride</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => (
            <Card key={booking.id} className="card-shadow border-0 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">{booking.reference}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-semibold text-foreground">{booking.schedule.route.from} → {booking.schedule.route.to}</span>
                    </div>
                  </div>
                  <Badge className={`${statusColors[booking.status]} border-0 text-[10px] font-semibold`}>
                    {booking.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                  <div>
                    <span className="text-muted-foreground">Jeepney</span>
                    <p className="font-medium text-foreground">{booking.schedule.jeepney.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Departs</span>
                    <p className="font-medium text-foreground">{booking.schedule.departure}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />Seats</span>
                    <p className="font-medium text-foreground">{booking.seats}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="font-bold text-primary">₱{booking.total}.00</span>
                  <Button asChild size="sm" variant="ghost" className="text-primary text-xs">
                    <Link to={`/my-bookings/${booking.id}`}>View Details <ArrowRight className="w-3 h-3 ml-1" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
