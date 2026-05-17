import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Lock, LogOut, Edit2, Check, X, Ticket, CreditCard, Calendar, Upload, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/auth-store";
import {
  changeProfilePasswordRequest,
  commitProfileAvatarUploadRequest,
  getProfileAvatarUploadUrlRequest,
  getProfileMeRequest,
  ProfileData,
  updateProfileMeRequest,
} from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";

const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png"];

const normalizeProfile = (
  profileLike: Partial<ProfileData> | undefined,
  fallback: { name: string; email: string }
): ProfileData => ({
  name: profileLike?.name || fallback.name,
  email: profileLike?.email || fallback.email,
  phone: profileLike?.phone || "",
  profileImageKey: profileLike?.profileImageKey || null,
  profileImageUrl: profileLike?.profileImageUrl || null,
});

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, setSession } = useAuth();
  const [editing, setEditing] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const baseProfile = useMemo(
    () =>
      normalizeProfile(undefined, {
        name: user?.name || "Passenger",
        email: user?.email || "no-email@example.com",
      }),
    [user?.email, user?.name]
  );

  const [profile, setProfile] = useState<ProfileData>(baseProfile);
  const [draft, setDraft] = useState(profile);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const payload = await getProfileMeRequest();
        if (!mounted) return;
        const normalized = normalizeProfile(payload.user, baseProfile);
        setProfile(normalized);
      } catch {
        if (!mounted) return;
        setProfile(baseProfile);
      } finally {
        if (mounted) {
          setLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [baseProfile]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleSave = async () => {
    setSavingProfile(true);
    try {
      const nextName = draft.name.trim();
      const nextPhone = draft.phone?.trim();
      const payload = await updateProfileMeRequest({
        name: nextName || undefined,
        phone: nextPhone || undefined,
      });
      const normalized = normalizeProfile(payload.user, baseProfile);
      setProfile(normalized);
      setEditing(false);
      if (user) {
        setSession({ ...user, name: normalized.name, email: normalized.email });
      }
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
    } catch (error) {
      let description = "Unable to update profile.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Update failed", description, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancel = () => {
    setDraft(profile);
    setEditing(false);
  };

  const handlePasswordChange = async () => {
    if (passwords.new.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    try {
      await changeProfilePasswordRequest({
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });
      setPasswordOpen(false);
      setPasswords({ current: "", new: "", confirm: "" });
      toast({ title: "Password Changed", description: "Your password has been updated." });
    } catch (error) {
      let description = "Unable to change password.";
      if (error instanceof ApiError && error.status === 400) {
        description = "Current password is invalid or request is malformed.";
      } else if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      }
      toast({ title: "Password change failed", description, variant: "destructive" });
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG or PNG image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum avatar file size is 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const presign = await getProfileAvatarUploadUrlRequest({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });

      const upload = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: presign.headers,
        body: file,
      });
      if (!upload.ok) {
        throw new Error("Avatar upload failed.");
      }

      const commit = await commitProfileAvatarUploadRequest({ objectKey: presign.objectKey });
      const nextPreview = URL.createObjectURL(file);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(nextPreview);

      const committedUser =
        "user" in commit ? normalizeProfile(commit.user as Partial<ProfileData>, baseProfile) : null;

      if (committedUser) {
        setProfile(committedUser);
        if (user) {
          setSession({ ...user, name: committedUser.name, email: committedUser.email });
        }
      } else {
        setProfile((prev) => ({ ...prev, profileImageKey: presign.objectKey }));
      }

      toast({ title: "Avatar Updated", description: "Profile photo uploaded successfully." });
    } catch (error) {
      let description = "Unable to upload avatar.";
      if (error instanceof ApiError && error.status >= 500) {
        description = "Server error. Please try again shortly.";
      } else if (error instanceof Error) {
        description = error.message;
      }
      toast({ title: "Upload failed", description, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      // Always clear input after resetting state; guard in case event target is unavailable.
      if (e.currentTarget) {
        e.currentTarget.value = "";
      }
    }
  };

  const handleLogout = async () => {
    setLogoutOpen(false);
    await logout();
    toast({ title: "Logged Out", description: "See you next ride!" });
    navigate("/");
  };

  const stats = [
    { icon: Ticket, label: "Total Rides", value: "24" },
    { icon: CreditCard, label: "Total Spent", value: "₱1,080" },
    { icon: Calendar, label: "Member Since", value: "Jan 2026" },
  ];

  if (loadingProfile) {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto">
        <Card className="card-shadow border-0">
          <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading profile...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-5 animate-fade-in">
      {/* Profile Header */}
      <Card className="card-shadow border-0 overflow-hidden">
        <div className="gradient-bg h-20" />
        <CardContent className="relative pt-0 pb-5 px-5">
          <input
            ref={avatarInputRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => void handleAvatarSelect(e)}
          />
          {avatarPreview || profile.profileImageUrl ? (
            <img
              src={avatarPreview || profile.profileImageUrl || ""}
              alt="Profile avatar"
              className="w-16 h-16 rounded-full object-cover -mt-8 ring-4 ring-card"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold -mt-8 ring-4 ring-card">
              {profile.name.charAt(0)}
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-2 rounded-xl h-8 text-xs"
            disabled={uploadingAvatar}
            onClick={() => avatarInputRef.current?.click()}
          >
            {uploadingAvatar ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 mr-1" />
            )}
            Upload Photo
          </Button>
          <h2 className="text-lg font-bold text-foreground mt-3">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card className="card-shadow border-0">
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Personal Info</CardTitle>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-primary text-xs">
              <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Full Name</Label>
            {editing ? (
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="rounded-xl" />
            ) : (
              <p className="text-sm font-medium text-foreground">{profile.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
            <p className="text-sm font-medium text-foreground">{profile.email}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
            {editing ? (
              <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className="rounded-xl" />
            ) : (
              <p className="text-sm font-medium text-foreground">{profile.phone}</p>
            )}
          </div>

          {editing && (
            <div className="flex gap-2 pt-2">
              <Button onClick={() => void handleSave()} className="flex-1 rounded-2xl" disabled={savingProfile}>
                {savingProfile ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Save
              </Button>
              <Button onClick={handleCancel} variant="outline" className="flex-1 rounded-2xl"><X className="w-4 h-4 mr-1" /> Cancel</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <Card className="card-shadow border-0">
        <CardHeader className="pb-3"><CardTitle className="text-base">Account Stats</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="icon-badge w-10 h-10 mx-auto mb-2"><s.icon className="w-5 h-5" /></div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button variant="outline" onClick={() => setPasswordOpen(true)} className="w-full rounded-2xl justify-start">
          <Lock className="w-4 h-4 mr-3" /> Change Password
        </Button>
        <Button variant="outline" onClick={() => setLogoutOpen(true)} className="w-full rounded-2xl justify-start border-destructive text-destructive hover:bg-destructive/5">
          <LogOut className="w-4 h-4 mr-3" /> Log Out
        </Button>
      </div>

      {/* Change Password Modal */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Current Password</Label>
              <Input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">New Password</Label>
              <Input type="password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Confirm New Password</Label>
              <Input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={() => void handlePasswordChange()}>Update Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Modal */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Out?</DialogTitle>
            <DialogDescription>You'll need to sign in again to access your bookings.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">Stay</Button></DialogClose>
            <Button variant="destructive" onClick={() => void handleLogout()}>Log Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
