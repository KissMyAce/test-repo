import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bus, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/auth-store";
import { ApiError } from "@/lib/api-client";
import { registerPassengerRequest } from "@/features/auth/api";
import { getRoleHomePath } from "@/features/auth/session";

const Register = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email format";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = await registerPassengerRequest({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      login(payload.user, payload.accessToken ?? null);
      toast({ title: "Account created!", description: "Welcome to Jee-PS" });
      navigate(getRoleHomePath(payload.user.role));
    } catch (error) {
      let description = "Unable to create account.";
      if (error instanceof ApiError) {
        if (error.status === 409) {
          description = "Email is already registered.";
        } else if (error.status >= 500) {
          description = "Server error. Please try again shortly.";
        }
      }
      toast({ title: "Registration failed", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg-soft flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2 mb-2">
            <div className="icon-badge w-10 h-10">
              <Bus className="w-5 h-5" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-primary-foreground">Create account</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">Join Jee-PS today</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 card-shadow space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Juan Dela Cruz" value={form.name} onChange={(e) => update("name", e.target.value)} className="rounded-xl h-12" />
            {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@email.com" value={form.email} onChange={(e) => update("email", e.target.value)} className="rounded-xl h-12" />
            {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" value={form.password} onChange={(e) => update("password", e.target.value)} className="rounded-xl h-12 pr-12" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input id="confirm" type="password" placeholder="Re-enter password" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} className="rounded-xl h-12" />
            {errors.confirm && <p className="text-destructive text-xs">{errors.confirm}</p>}
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold mt-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
