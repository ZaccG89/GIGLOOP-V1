import {
  Home,
  User,
  MapPin,
  Settings,
  Search,
} from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { label: "Feed", icon: Home, href: "/" },
    { label: "Search", icon: Search, href: "/search" },
    { label: "Profile", icon: User, href: "/profile" },
    { label: "Venues", icon: MapPin, href: "/venues" },
    { label: "Settings", icon: Settings, href: "/settings" },
  ];

  return (
    <div className="w-64 h-screen bg-[#05070d] border-r border-white/5 flex flex-col">

      {/* Header / Brand */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">

          {/* 🔥 REAL LOGO IMAGE */}
          <img
            src="/giggity-logo.png"
            alt="GigLoop"
            className="h-10 w-10 object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]"
          />

          {/* TEXT */}
          <span className="text-lg font-semibold tracking-tight text-white">
            GigLoop
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-2">
        {navItems.map(({ label, icon: Icon, href }) => {
          const active = location === href;

          return (
            <Link key={label} href={href}>
              <div
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer
                  transition-all
                  ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        {/* leave empty or plug user card later */}
      </div>

    </div>
  );
}