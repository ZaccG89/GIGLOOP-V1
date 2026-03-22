import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  MapPin,
  Settings,
  Shield,
  LogOut,
  User,
  LogIn,
} from "lucide-react";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useAuth();
  const logout = useLogout();

  const isGuest = !!user && !user.email;

  const navItems = [
  { href: "/", icon: Home, label: "Feed" },

  ...(isGuest
    ? [
        { href: "/login", icon: User, label: "Log In" },
        { href: "/signup", icon: User, label: "Sign Up" },
      ]
    : [{ href: "/profile", icon: User, label: "Profile" }]),

  { href: "/venues", icon: MapPin, label: "Venues" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

  if (user?.email?.includes("admin")) {
    navItems.push({
      href: "/admin/submissions",
      icon: Shield,
      label: "Admin",
    });
  }

  const handleLoginClick = () => setLocation("/login");
  const handleLogoutClick = () => logout.mutate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row pb-20 md:pb-0">
      <aside className="hidden md:flex flex-col w-64 border-r border-border glass-panel fixed h-screen z-40">
        <nav className="flex-1 px-4 py-6 space-y-3">
          {navItems.map((item) => {
            const isActive = location === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl font-medium transition-all duration-200 active-press",
                  isActive
                    ? "bg-white/10 text-white shadow-[0_0_22px_rgba(168,85,247,0.18)]"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    isActive
                      ? "text-primary drop-shadow-[0_0_10px_rgba(168,85,247,0.95)]"
                      : "text-muted-foreground group-hover:text-white"
                  )}
                />
                <span>{item.label}</span>
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
                <p className="text-sm font-semibold text-white truncate">
                  {isGuest ? "Browsing as Guest" : user?.displayName || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {isGuest
                    ? "Create a profile to unlock features"
                    : user?.email || ""}
                </p>
              </div>
            </div>

            {isGuest && (
              <button
                type="button"
                onClick={handleLoginClick}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-white/20 bg-white/10 text-sm font-medium text-white hover:bg-white/15 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Log In
              </button>
            )}

            <button
              type="button"
              onClick={handleLogoutClick}
              disabled={logout.isPending}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-red-400 hover:text-red-300 transition-colors disabled:opacity-60"
            >
              <LogOut className="w-4 h-4" />
              {isGuest ? "Exit Guest Session" : "Log Out"}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 relative min-h-screen">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 md:py-10">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 z-50 px-6 py-2 flex justify-between items-center pb-safe">
        {navItems.map((item) => {
          const isActive = location === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-200",
                isActive ? "text-white" : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "w-6 h-6 transition-all duration-200",
                  isActive
                    ? "text-primary drop-shadow-[0_0_10px_rgba(168,85,247,0.95)]"
                    : ""
                )}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}