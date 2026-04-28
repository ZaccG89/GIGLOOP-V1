import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { data: user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [guestPending, setGuestPending] = useState(false);

  const isRealUser = !!user?.email;
  const isGuest = !!user && !user.email;

  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return "";
    const raw = new URLSearchParams(window.location.search).get("next") || "";
    return raw && raw.startsWith("/") ? raw : "";
  }, []);

  useEffect(() => {
    if (!isLoading && isRealUser) {
      if (nextPath) {
        window.location.href = nextPath;
      } else {
        setLocation("/");
      }
    }
  }, [isLoading, isRealUser, nextPath, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginPending(true);

    try {
      if (isGuest) {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
        queryClient.setQueryData(["/api/auth/me"], null);
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      queryClient.setQueryData(["/api/auth/me"], data);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      if (nextPath) {
        window.location.href = nextPath;
      } else {
        setLocation("/");
      }
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "Could not log in",
        variant: "destructive",
      });
    } finally {
      setLoginPending(false);
    }
  };

  const handleGuestLogin = async () => {
    setGuestPending(true);

    try {
      const res = await apiRequest("POST", "/api/auth/guest");

      if (!res.ok) {
        throw new Error("Guest login failed");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Guest login failed",
        description: err.message || "Could not continue as guest",
        variant: "destructive",
      });
    } finally {
      setGuestPending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-40 h-40 rounded-3xl bg-card border border-white/10">
            <img
              src="/giggity-logo.png"
              alt="GigLoop"
              className="max-h-32 max-w-32 object-contain"
            />
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
            Welcome back.
          </h1>

          <p className="text-base text-muted-foreground">
            Log in to save gigs, soundcheck shows, and build your music profile.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-card/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4"
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-4 rounded-2xl bg-black/30 border border-white/10 text-white"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-4 rounded-2xl bg-black/30 border border-white/10 text-white"
          />

          <button
            type="submit"
            disabled={loginPending}
            className="w-full py-4 rounded-2xl g-btn-primary font-bold text-lg flex items-center justify-center gap-3"
          >
            {loginPending ? "Logging in..." : "Log In"}
            {!loginPending && <ArrowRight className="w-4 h-4 opacity-50" />}
          </button>

          <button
            type="button"
            onClick={() => setLocation("/signup")}
            className="w-full py-4 rounded-2xl border border-white/20 bg-white/10 text-white font-bold text-lg hover:bg-white/15"
          >
            Create Profile
          </button>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={guestPending}
            className="w-full py-4 rounded-2xl border border-white/10 hover:bg-white/5 text-white"
          >
            {guestPending ? "Loading..." : "Continue as Guest"}
          </button>
        </form>
      </div>
    </div>
  );
}