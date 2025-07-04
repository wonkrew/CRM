"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { useSearchParams } from "next/navigation"

export function LoginForm({ className, ...props }) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
    } else if (res?.ok) {
      window.location.href = "/dashboard";
    }
  }

  return (
    <form
      className={cn(
        "flex flex-col gap-6",
        className
      )}
      onSubmit={handleSubmit}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Login to your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your email and password to login
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            required
            autoFocus
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="transition-shadow focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div className="grid gap-3 relative">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pr-10 transition-shadow focus-visible:ring-2 focus-visible:ring-primary"
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm text-center justify-center animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="size-4" />
            {error}
          </div>
        )}
        <Button
          type="submit"
          className="w-full font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-sm"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin size-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
              Logging in...
            </span>
          ) : (
            "Login"
          )}
        </Button>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <a
          href="/register"
          className="font-semibold leading-6 text-primary hover:underline"
        >
          Register
        </a>
      </p>
    </form>
  );
}
