import { Link } from "react-router-dom";
import {
  Calendar,
  Bus,
  CreditCard,
  Ticket,
  Clock,
  MapPin,
  Users,
  Bell,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const featureCards = [
  { icon: Calendar, label: "Schedules", to: "/schedules" },
  { icon: Bus, label: "Jeepneys", to: "/jeepneys" },

  { icon: Ticket, label: "Booking", to: "/my-bookings" },
];

const notifications: Array<{ id: number; text: string; time: string }> = [];

const Dashboard = () => {
  const hasUpcoming = false;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="gradient-bg rounded-2xl p-6 text-primary-foreground animate-fade-in">
        <h2 className="text-xl font-bold mb-1">Good day! 🚐</h2>
        <p className="text-primary-foreground/80 text-sm">
          Never miss a ride, always stay on track
        </p>
      </div>

      {/* 2x2 Feature Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {featureCards.map((card, i) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-card rounded-2xl p-5 card-shadow flex flex-col items-center gap-3 hover:card-shadow-lg transition-all group animate-slide-up"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="icon-badge-lg">
              <card.icon className="w-7 h-7" />
            </div>
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {card.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Upcoming Booking */}
      <div className="bg-card rounded-2xl p-5 card-shadow animate-slide-up" style={{ animationDelay: "0.35s" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Upcoming Booking</h3>
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full font-medium">
            None yet
          </span>
        </div>
        <div className="space-y-4 text-sm text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <p className="font-semibold text-foreground">No upcoming rides</p>
          <p className="text-muted-foreground">You don’t have any bookings yet. Book a ride to get started.</p>
          <Link to="/booking">
            <Button variant="outline" size="sm" className="mt-2 rounded-xl px-6">
              Book a Ride
            </Button>
          </Link>
        </div>
      </div>

      {/* Notifications Strip */}
      <div className="animate-slide-up" style={{ animationDelay: "0.45s" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          <Link to="/notifications" className="text-xs text-primary font-medium hover:underline">
            View all
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-semibold text-foreground">No notifications yet</p>
          <p className="text-muted-foreground text-sm mt-2">You’ll see updates here once you create a booking or receive a payment confirmation.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
