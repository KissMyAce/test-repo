import { useState } from "react";
import { Link } from "react-router-dom";
import { Bus, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordRequest } from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email");
      return;
    }
    setLoading(true);
    try {
      await forgotPasswordRequest({ email });
      setSent(true);
    } catch (err) {
      let message = "Unable to process request right now.";
      if (err instanceof ApiError && err.status >= 500) {
        message = "Server error. Please try again shortly.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg-soft flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2 mb-2">
            <div className="icon-badge w-10 h-10">
              <Bus className="w-5 h-5" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-primary-foreground">Reset password</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">We'll send you a reset link</p>
        </div>

        <div className="bg-card rounded-2xl p-6 card-shadow">
          {sent ? (
            <div className="flex flex-col items-center text-center py-4 space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Check your email</h2>
              <p className="text-muted-foreground text-sm">
                We've sent a password reset link to <strong className="text-foreground">{email}</strong>
              </p>
              <Link to="/login">
                <Button variant="outline" className="rounded-xl mt-2">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="rounded-xl h-12"
                />
                {error && <p className="text-destructive text-xs">{error}</p>}
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
              </Button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
