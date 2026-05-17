import { useState } from "react";
import { Link } from "react-router-dom";
import { Bus, MapPin, CreditCard, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: MapPin, label: "Track" },
  { icon: Calendar, label: "Book" },
  { icon: CreditCard, label: "Pay" },
];

const Index = () => {
  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="icon-badge w-8 h-8">
            <Bus className="w-4 h-4" />
          </div>
          <span className="text-primary-foreground font-bold text-lg">Jee-PS</span>
        </div>
        <Link
          to="/login"
          className="text-primary-foreground/80 hover:text-primary-foreground text-sm font-medium transition-colors"
        >
          Login
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-fade-in flex flex-col items-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center mb-8 ring-4 ring-primary-foreground/10">
            <Bus className="w-12 h-12 text-primary-foreground" />
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-primary-foreground mb-4 tracking-tight">
            Jee-PS
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 leading-relaxed">
            Never miss a ride, always stay on track
          </p>

          <Link to="/register" className="w-full max-w-xs">
            <Button
              size="lg"
              className="w-full bg-primary-foreground text-primary font-semibold text-base rounded-2xl h-14 card-shadow-lg hover:bg-primary-foreground/95 transition-all"
            >
              Get Started
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </Link>

          <Link
            to="/login"
            className="mt-4 text-primary-foreground/70 hover:text-primary-foreground text-sm font-medium transition-colors"
          >
            Already have an account? Login
          </Link>
        </div>

        {/* Feature strip */}
        <div
          className="mt-16 animate-slide-up flex items-center gap-6 bg-primary-foreground/10 backdrop-blur-sm rounded-2xl px-8 py-4"
          style={{ animationDelay: "0.2s" }}
        >
          {features.map((f, i) => (
            <div key={f.label} className="flex items-center gap-2 text-primary-foreground/90">
              <f.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{f.label}</span>
              {i < features.length - 1 && (
                <span className="ml-4 w-1 h-1 rounded-full bg-primary-foreground/40" />
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-primary-foreground/50 text-xs">
        © 2026 Jee-PS. All rights reserved.
      </footer>
    </div>
  );
};

export default Index;
