import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bus, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordRequest } from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (!token) {
      setError("Invalid or missing reset token.");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return false;
    }
    setError("");
    return true;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await resetPasswordRequest({ token, password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      let message = "Unable to reset password.";
      if (err instanceof ApiError && err.status === 400) {
        message = "Reset token is invalid or expired.";
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
          <h1 className="text-2xl font-bold text-primary-foreground">Set new password</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">Create a new password for your account</p>
        </div>

        <form onSubmit={onSubmit} className="bg-card rounded-2xl p-6 card-shadow space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-xl h-12"
            />
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}
          {success && <p className="text-success text-xs">Password updated. Redirecting to login...</p>}

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
          </Button>

          <div className="text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
