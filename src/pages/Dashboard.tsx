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
  { icon: CreditCard, label: "Payments", to: "/payment" },
  { icon: Ticket, label: "Booking", to: "/my-bookings" },
];

const notifications = [
  { id: 1, text: "Route 12 delayed by 10 mins", time: "2m ago" },
  { id: 2, text: "Booking confirmed for tomorrow", time: "1h ago" },
  { id: 3, text: "Payment received — ₱45.00", time: "3h ago" },
];

const Dashboard = () => {
  const hasUpcoming = true;

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
      {hasUpcoming && (
        <div className="bg-card rounded-2xl p-5 card-shadow animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Upcoming Booking</h3>
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full font-medium">
              Active
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>SM City → Ayala Terminal</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 text-primary" />
              <span>Today, 3:30 PM</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4 text-primary" />
              <span>2 seats reserved</span>
            </div>
          </div>
          <Link to="/my-bookings">
            <Button variant="outline" size="sm" className="mt-4 rounded-xl w-full">
              View Booking <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* Notifications Strip */}
      <div className="animate-slide-up" style={{ animationDelay: "0.45s" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          <Link to="/notifications" className="text-xs text-primary font-medium hover:underline">
            View all
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="flex-shrink-0 w-64 bg-card rounded-xl p-4 card-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-foreground font-medium leading-snug">{n.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
