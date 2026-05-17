import { Link } from "react-router-dom";
import { Bus, Users, Truck } from "lucide-react";

const RegisterChoice = () => {
  return (
    <div className="min-h-screen gradient-bg-soft flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2 mb-2">
            <div className="icon-badge w-10 h-10">
              <Bus className="w-5 h-5" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-primary-foreground">Join Jee-PS</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">How will you use Jee-PS?</p>
        </div>

        <div className="space-y-4">
          <Link to="/register/passenger" className="block">
            <div className="bg-card rounded-2xl p-6 card-shadow hover:shadow-lg transition-all group cursor-pointer border-2 border-transparent hover:border-primary">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-foreground">Passenger</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Book rides, track jeepneys, and pay online</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/register/driver" className="block">
            <div className="bg-card rounded-2xl p-6 card-shadow hover:shadow-lg transition-all group cursor-pointer border-2 border-transparent hover:border-primary">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Truck className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-foreground">Driver</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Manage your jeepney, schedules, and passengers</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterChoice;
