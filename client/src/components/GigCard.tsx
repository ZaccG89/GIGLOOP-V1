import { useState, useCallback } from "react";
import { Bookmark, Share2, Heart, Ticket, Music } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { FeedItem } from "@/hooks/use-feed";

interface GigCardProps {
  item: FeedItem;
  initialSaved?: boolean;
  initialLiked?: boolean;
  initialShared?: boolean;
  onClick?: () => void;
}

export default function GigCard({ item, initialSaved = false, initialLiked = false, initialShared = false, onClick }: GigCardProps) {
  const { event, matchScore, matchedArtists, distanceKm } = item;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [saved, setSaved] = useState(initialSaved);
  const [liked, setLiked] = useState(initialLiked);
  const [shared, setShared] = useState(initialShared);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/saves/${event.id}`, { method: "POST", credentials: "include" });
      return res.json() as Promise<{ saved: boolean }>;
    },
    onSuccess: (data) => {
      setSaved(data.saved);
      queryClient.invalidateQueries({ queryKey: ["/api/saves"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saves/events"] });
      toast({ title: data.saved ? "Saved!" : "Removed from saved" });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/likes/${event.id}`, { method: "POST", credentials: "include" });
      return res.json() as Promise<{ liked: boolean }>;
    },
    onSuccess: (data) => {
      setLiked(data.liked);
      queryClient.invalidateQueries({ queryKey: ["/api/likes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/likes/events"] });
    },
  });

  const isMatch = matchScore > 0;
  const matchReason =
    isMatch && matchedArtists.length > 0
      ? `Because you listen to ${matchedArtists[0]}`
      : null;

  const locationLabel = (() => {
    const parts: string[] = [];
    if (event.city) parts.push(event.city);
    if (distanceKm !== undefined) parts.push(`${distanceKm.toFixed(1)} km`);
    return parts.join(" • ");
  })();

  const formattedDate = (() => {
    try {
      return format(new Date(event.startTime), "EEE, MMM d • h:mma").replace(":00", "");
    } catch {
      return "";
    }
  })();

  const shareMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/shares/${event.id}`, { method: "POST", credentials: "include" });
      return res.json() as Promise<{ shared: boolean }>;
    },
    onSuccess: (data) => setShared(data.shared),
  });

  const handleShare = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const url = event.ticketUrl || window.location.href;
      const shareData = { title: event.name, text: `Check out ${event.name} at ${event.venueName}`, url };
      if (navigator.share) {
        try { await navigator.share(shareData); } catch {}
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
      }
      shareMutation.mutate();
    },
    [event, toast, shareMutation]
  );

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveMutation.mutate();
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    likeMutation.mutate();
  };

  const handleTickets = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.ticketUrl) window.open(event.ticketUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      role="article"
      onClick={onClick}
      data-testid={`card-gig-${event.id}`}
      className="gig-card group cursor-pointer"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-raw)",
        borderRadius: 18,
        overflow: "hidden",
        transition: "box-shadow 0.25s ease, transform 0.25s ease",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 30px rgba(155,92,255,0.25)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* ── 1. Image ─────────────────────────────────────────────────── */}
      <div className="relative" style={{ height: 180, width: "100%", background: "#0B0E16" }}>
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" style={{ opacity: 0.85 }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-14 h-14" style={{ color: "var(--border-raw)" }} />
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }} />

        {isMatch ? (
          <div className="absolute top-3 left-3 text-[11px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: "var(--purple)", color: "#05060A", boxShadow: "0 0 12px rgba(155,92,255,0.5)" }}>
            {Math.round(matchScore * 100)}% Match
          </div>
        ) : (
          <div className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--silver)" }}>
            Nearby
          </div>
        )}

        {locationLabel && (
          <div className="absolute bottom-3 right-3" style={{ fontSize: 11, padding: "4px 8px", borderRadius: 999, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--silver)" }}>
            {locationLabel}
          </div>
        )}
      </div>

      {/* ── 2. Info ──────────────────────────────────────────────────── */}
      <div style={{ padding: 16 }}>
        <p className="truncate" style={{ fontSize: 18, fontWeight: 600, color: "var(--silver)", lineHeight: 1.3 }}>{event.name}</p>
        {event.venueName && <p className="truncate mt-0.5" style={{ fontSize: 14, color: "var(--muted-color)" }}>{event.venueName}</p>}
        {formattedDate && <p className="mt-1" style={{ fontSize: 14, color: "var(--muted-color)" }}>{formattedDate}</p>}
        {matchReason && <p className="mt-2 truncate" style={{ fontSize: 13, color: "var(--purple)" }}>{matchReason}</p>}
      </div>

      {/* ── 3. Social actions ────────────────────────────────────────── */}
      <div className="flex items-center justify-between" style={{ padding: "0 16px 12px" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <IconBtn label="Save" onClick={handleSave} active={saved} data-testid={`button-save-${event.id}`} disabled={saveMutation.isPending}>
            <Bookmark className="w-4 h-4" fill={saved ? "var(--purple)" : "none"} />
          </IconBtn>

          <IconBtn label="Share" onClick={handleShare} active={shared} data-testid={`button-share-${event.id}`}>
            <Share2 className="w-4 h-4" fill={shared ? "var(--purple)" : "none"} />
          </IconBtn>

          <IconBtn label="Like" onClick={handleLike} active={liked} data-testid={`button-like-${event.id}`} disabled={likeMutation.isPending}>
            <Heart className="w-4 h-4" fill={liked ? "var(--purple)" : "none"} />
          </IconBtn>
        </div>
      </div>

      {/* ── 4. Ticket button ─────────────────────────────────────────── */}
      <div style={{ padding: "0 16px 16px" }}>
        {event.ticketUrl ? (
          <button
            onClick={handleTickets}
            data-testid={`button-tickets-${event.id}`}
            className="g-btn-primary w-full flex items-center justify-center gap-2 font-bold"
            style={{ borderRadius: 14, padding: "12px 0", fontSize: 15, boxShadow: "0 0 0 1px rgba(155,92,255,0.25), 0 10px 30px rgba(155,92,255,0.20)" }}
          >
            <Ticket className="w-4 h-4" />
            Get Tickets
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 font-semibold" style={{ borderRadius: 14, padding: "12px 0", fontSize: 15, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-raw)", color: "var(--muted-color)" }}>
            <Ticket className="w-4 h-4" />
            No Tickets Listed
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, active, label, disabled, ...rest }: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
  label: string;
  disabled?: boolean;
  [key: string]: unknown;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      {...rest}
      style={{
        width: 36, height: 36, borderRadius: 10,
        border: "1px solid var(--border-raw)",
        background: "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        color: active ? "var(--purple)" : "var(--muted-color)",
        transition: "background 0.15s, color 0.15s",
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}
