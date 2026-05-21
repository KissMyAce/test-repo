import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bus, Eye, EyeOff, Loader2, Upload, X, FileText, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  createDriverUploadSessionRequest,
  preregisterCommitUploadRequest,
  registerDriverRequest,
  uploadPreregisterFileRequest,
} from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";

interface FileUpload {
  file: File;
  preview?: string;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
type UploadPurpose = "avatar" | "driver-license" | "driver-nbi" | "driver-photo";

const RegisterDriver = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    licenseNumber: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [licenseFile, setLicenseFile] = useState<FileUpload | null>(null);
  const [nbiFile, setNbiFile] = useState<FileUpload | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<FileUpload | null>(null);
  const licenseRef = useRef<HTMLInputElement>(null);
  const nbiRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const preregUploadSessionTokenRef = useRef<string | null>(null);

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: FileUpload | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload JPG, PNG, or PDF.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 2MB.", variant: "destructive" });
      return;
    }

    const upload: FileUpload = { file };
    if (file.type.startsWith("image/")) {
      upload.preview = URL.createObjectURL(file);
    }
    setter(upload);
  };

  const removeFile = (setter: (f: FileUpload | null) => void) => {
    setter(null);
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email format";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.licenseNumber.trim()) e.licenseNumber = "License number is required";
    if (!licenseFile) e.license = "Driver's license copy is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goToStep2 = () => {
    if (validateStep1()) {
      setStep(2);
      setErrors({});
    }
  };

  const getPreregisterUploadSessionToken = async (email: string) => {
    if (preregUploadSessionTokenRef.current) {
      return preregUploadSessionTokenRef.current;
    }
    const session = await createDriverUploadSessionRequest({ email });
    preregUploadSessionTokenRef.current = session.uploadSessionToken;
    return session.uploadSessionToken;
  };

  const uploadFileToR2 = async (
    file: File,
    purpose: Exclude<UploadPurpose, "avatar">,
    uploadSessionToken: string
  ) => {
    const uploadResult = await uploadPreregisterFileRequest({
      uploadSessionToken,
      fileName: file.name,
      contentType: file.type,
      purpose,
      file,
    });

    await preregisterCommitUploadRequest({
      uploadSessionToken,
      objectKey: uploadResult.objectKey,
      purpose,
    });

    return uploadResult.objectKey;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);
    try {
      if (!licenseFile) {
        throw new Error("Driver's license copy is required");
      }

      const uploadSessionToken = await getPreregisterUploadSessionToken(form.email);

      const licenseFileKey = await uploadFileToR2(
        licenseFile.file,
        "driver-license",
        uploadSessionToken
      );
      const nbiFileKey = nbiFile
        ? await uploadFileToR2(nbiFile.file, "driver-nbi", uploadSessionToken)
        : undefined;
      const profileImageKey = profilePhoto
        ? await uploadFileToR2(profilePhoto.file, "driver-photo", uploadSessionToken)
        : undefined;

      await registerDriverRequest({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        licenseNumber: form.licenseNumber,
        licenseFileKey,
        nbiFileKey,
        profileImageKey,
      });

      toast({
        title: "Application submitted!",
        description: "Your driver account is pending verification. We'll notify you once approved.",
      });
      navigate("/login");
    } catch (error) {
      let description = "Unable to submit your application.";
      if (error instanceof ApiError) {
        if (error.status === 409) {
          description = "Email is already registered.";
        } else if (error.status >= 500) {
          description = "Server error. Please try again shortly.";
        }
      } else if (error instanceof Error) {
        description = error.message;
      }
      toast({ title: "Submission failed", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const FileUploadCard = ({
    label,
    description,
    file,
    inputRef,
    onSelect,
    onRemove,
    error,
    required,
  }: {
    label: string;
    description: string;
    file: FileUpload | null;
    inputRef: React.RefObject<HTMLInputElement>;
    onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
    error?: string;
    required?: boolean;
  }) => (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={onSelect}
        className="hidden"
      />
      {file ? (
        <div className="flex items-center gap-3 bg-accent/50 rounded-xl p-3 border border-border">
          {file.preview ? (
            <img src={file.preview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{file.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.file.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-6 hover:border-primary/50 hover:bg-accent/30 transition-all"
        >
          <Upload className="w-6 h-6 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Upload {label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </button>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen gradient-bg-soft flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2 mb-2">
            <div className="icon-badge w-10 h-10">
              <Bus className="w-5 h-5" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-primary-foreground">Driver Registration</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">
            Step {step} of 2 — {step === 1 ? "Personal Info" : "Documents"}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="flex-1 h-1.5 rounded-full bg-primary-foreground/30">
            <div
              className="h-full rounded-full bg-primary-foreground transition-all duration-300"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 card-shadow space-y-4">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                <Input id="name" placeholder="Juan Dela Cruz" value={form.name} onChange={(e) => update("name", e.target.value)} className="rounded-xl h-12" />
                {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input id="email" type="email" placeholder="you@email.com" value={form.email} onChange={(e) => update("email", e.target.value)} className="rounded-xl h-12" />
                {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                <Input id="phone" type="tel" placeholder="09XX XXX XXXX" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="rounded-xl h-12" />
                {errors.phone && <p className="text-destructive text-xs">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" value={form.password} onChange={(e) => update("password", e.target.value)} className="rounded-xl h-12 pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password <span className="text-destructive">*</span></Label>
                <Input id="confirm" type="password" placeholder="Re-enter password" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} className="rounded-xl h-12" />
                {errors.confirm && <p className="text-destructive text-xs">{errors.confirm}</p>}
              </div>

              <Button type="button" onClick={goToStep2} className="w-full h-12 rounded-xl text-base font-semibold mt-2">
                Next — Upload Documents
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setStep(1); setErrors({}); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Personal Info
              </button>

              <div className="space-y-2">
                <Label htmlFor="licenseNumber">Driver's License Number <span className="text-destructive">*</span></Label>
                <Input id="licenseNumber" placeholder="e.g. N01-23-456789" value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} className="rounded-xl h-12" />
                {errors.licenseNumber && <p className="text-destructive text-xs">{errors.licenseNumber}</p>}
              </div>

              <FileUploadCard
                label="Driver's License"
                description="JPG, PNG, or PDF — max 2MB"
                file={licenseFile}
                inputRef={licenseRef as React.RefObject<HTMLInputElement>}
                onSelect={(e) => handleFileSelect(e, setLicenseFile)}
                onRemove={() => removeFile(setLicenseFile)}
                error={errors.license}
                required
              />

              <FileUploadCard
                label="NBI Clearance"
                description="JPG, PNG, or PDF — max 2MB (optional)"
                file={nbiFile}
                inputRef={nbiRef as React.RefObject<HTMLInputElement>}
                onSelect={(e) => handleFileSelect(e, setNbiFile)}
                onRemove={() => removeFile(setNbiFile)}
              />

              <FileUploadCard
                label="Profile Photo"
                description="JPG or PNG — max 2MB (optional)"
                file={profilePhoto}
                inputRef={photoRef as React.RefObject<HTMLInputElement>}
                onSelect={(e) => handleFileSelect(e, setProfilePhoto)}
                onRemove={() => removeFile(setProfilePhoto)}
              />

              <div className="bg-accent/50 rounded-xl p-3 border border-border">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  📋 Your application will be reviewed by an admin. You'll receive a notification once your account is verified and approved.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold mt-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Application"}
              </Button>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterDriver;
