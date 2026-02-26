import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { MapPin, Settings, Shield, LogOut, User } from "lucide-react";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import LogoMark from "@/components/LogoMark";
import LogoWordmark from "@/components/LogoWordmark";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useAuth();
  const logout = useLogout();

  const navItems = [
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/venues", icon: MapPin, label: "Venues" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  if (user?.email?.includes("admin")) {
    navItems.push({ href: "/admin/submissions", icon: Shield, label: "Admin" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row pb-20 md:pb-0">

      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border glass-panel fixed h-screen z-40">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 group">
            <LogoWordmark className="drop-shadow-[0_0_20px_rgba(155,92,255,0.6)] group-hover:drop-shadow-[0_0_28px_rgba(155,92,255,0.9)] transition-all" />
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {/* Feed — logo icon */}
          <Link
            href="/"
            className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all active-press",
              location === "/"
                ? "bg-white/10 text-white"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            <LogoMark
              size={36}
              className={cn(
                "transition-all",
                location === "/"
                  ? "drop-shadow-[0_0_10px_rgba(155,92,255,0.95)]"
                  : "opacity-50"
              )}
            />
            Feed
          </Link>

          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all active-press",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center text-white font-bold">
                {user?.displayName?.charAt(0) || "G"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.displayName || "Guest"}</p>
              </div>
            </div>
            <button
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors text-red-400 hover:text-red-300 active-press"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-64 relative min-h-screen">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 md:py-10">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ───────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 z-50 px-6 py-2 flex justify-between items-center pb-safe">
        {/* Feed */}
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center gap-0.5 transition-colors active-press",
            location === "/" ? "text-white" : "text-muted-foreground"
          )}
          data-testid="nav-home"
        >
          <svg
            width="24" height="24" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className={cn("transition-all", location === "/" ? "text-primary" : "")}
          >
            <path d="M20 12a8 8 0 1 0-3.562 6.634" />
            <polyline points="20 12 20 18 14 18" />
          </svg>
          <span className="text-[10px] font-medium">Feed</span>
        </Link>

        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 transition-colors active-press",
                isActive ? "text-white" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive ? "text-primary" : "")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
