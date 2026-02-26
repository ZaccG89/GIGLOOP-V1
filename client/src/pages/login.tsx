import { useEffect, useState } from "react";
import { ArrowRight, UserRound, ChevronDown, Lock } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useSearch } from "wouter";
import { useAppleMusicLogin } from "@/hooks/use-apple";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function Login() {
  const { data: user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const errorCode = params.get("error");
  const appleLogin = useAppleMusicLogin();
  const { toast } = useToast();
  const [guestPending, setGuestPending] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const { data: authConfig } = useQuery<{ spotify: boolean; appleMusic: boolean }>({
    queryKey: ["/api/auth/config"],
  });

  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (appleLogin.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    }
  }, [appleLogin.isSuccess]);

  useEffect(() => {
    if (appleLogin.isError) {
      toast({ title: "Apple Music unavailable", description: "Credentials not configured yet.", variant: "destructive" });
    }
  }, [appleLogin.isError]);

  const handleGuestLogin = async () => {
    setGuestPending(true);
    try {
      const res = await apiRequest("POST", "/api/auth/guest");
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setLocation("/");
      } else {
        throw new Error("Failed");
      }
    } catch {
      toast({ title: "Could not start guest session", variant: "destructive" });
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

  const spotifyReady = authConfig?.spotify ?? false;
  const appleReady = authConfig?.appleMusic ?? false;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-40 h-40 rounded-3xl bg-card border border-white/10 shadow-2xl mb-6 p-4">
            <LogoMark size={144} className="drop-shadow-[0_0_28px_rgba(155,92,255,0.95)]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
            Discover Live Music.
          </h1>
          <p className="text-base text-muted-foreground">
            Find local gigs based on artists you love.
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">

          {/* Guest login — primary CTA */}
          <button
            onClick={handleGuestLogin}
            disabled={guestPending}
            data-testid="button-guest-login"
            className="w-full py-4 rounded-2xl g-btn-primary font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guestPending ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <UserRound className="w-5 h-5" />
            )}
            {guestPending ? "Loading…" : "Explore the App"}
          </button>

          <p className="text-center text-xs text-muted-foreground -mt-1">
            No account needed — browse gigs and submit your own.
          </p>

          {/* Streaming service options */}
          <button
            onClick={() => setShowMore(v => !v)}
            data-testid="button-toggle-streaming"
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors py-1"
          >
            <span>Connect Spotify or Apple Music</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
          </button>

          {showMore && (
            <div className="flex flex-col gap-3">
              {/* Spotify */}
              {spotifyReady ? (
                <a
                  href="/api/auth/spotify/login"
                  data-testid="link-spotify-login"
                  className="w-full py-3.5 rounded-full bg-[#1DB954] text-black font-bold text-base flex items-center justify-center gap-3 hover:bg-[#1DB954]/90 hover:scale-[1.02] transition-all active:scale-95"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM20.16 9.6C16.44 7.38 9.54 7.2 5.58 8.4c-.6.18-1.2-.181-1.38-.781-.18-.6.18-1.2.78-1.38 4.62-1.38 12.18-1.14 16.44 1.14.54.3 1.14.12 1.32-.42.18-.539-.12-1.14-.42-1.32z" />
                  </svg>
                  Continue with Spotify
                  <ArrowRight className="w-4 h-4 ml-1 opacity-50" />
                </a>
              ) : (
                <div
                  data-testid="link-spotify-login"
                  className="w-full py-3.5 rounded-full bg-white/5 border border-white/10 text-white/40 font-bold text-base flex items-center justify-center gap-3 cursor-not-allowed"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM20.16 9.6C16.44 7.38 9.54 7.2 5.58 8.4c-.6.18-1.2-.181-1.38-.781-.18-.6.18-1.2.78-1.38 4.62-1.38 12.18-1.14 16.44 1.14.54.3 1.14.12 1.32-.42.18-.539-.12-1.14-.42-1.32z" />
                  </svg>
                  Spotify
                  <Lock className="w-4 h-4 ml-auto mr-2 opacity-50" />
                  <span className="text-xs font-normal opacity-60 mr-2">Coming soon</span>
                </div>
              )}

              {/* Apple Music */}
              {appleReady ? (
                <button
                  onClick={() => appleLogin.mutate()}
                  disabled={appleLogin.isPending}
                  data-testid="button-apple-login"
                  className="w-full py-3.5 rounded-full bg-white text-black font-bold text-base flex items-center justify-center gap-3 hover:bg-white/90 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {appleLogin.isPending ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                  )}
                  {appleLogin.isPending ? "Connecting…" : "Continue with Apple Music"}
                  {!appleLogin.isPending && <ArrowRight className="w-4 h-4 ml-1 opacity-50" />}
                </button>
              ) : (
                <div
                  data-testid="button-apple-login"
                  className="w-full py-3.5 rounded-full bg-white/5 border border-white/10 text-white/40 font-bold text-base flex items-center justify-center gap-3 cursor-not-allowed"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Apple Music
                  <Lock className="w-4 h-4 ml-auto mr-2 opacity-50" />
                  <span className="text-xs font-normal opacity-60 mr-2">Coming soon</span>
                </div>
              )}

              <p className="text-center text-xs text-muted-foreground">
                Connecting a music service personalises your gig feed automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
