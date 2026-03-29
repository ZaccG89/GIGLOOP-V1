import { useCallback } from "react";
import { Bookmark, Share2, Ticket, Music, Users } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";import { useAuth } from "@/hooks/use-auth";
import { LockedFeatureModal } from "@/components/LockedFeatureModal";
import { Card } from "@/components/ui/card";
import { useGuestLock } from "@/hooks/use-guest-lock";

interface GigCardProps {
  item: any;
  initialSaved?: boolean;
  initialShared?: boolean;
  initialSoundchecked?: boolean;
  onClick?: () => void;
}

type AttendanceResponse = {
  count: number;
  attendees: Array<{
    id: number;
    name?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    createdAt: string;
  }>;
};

type GoingResponse = {
  going: boolean;
};

export default function GigCard({
  item,
  initialSaved = false,
  initialShared = false,
  initialSoundchecked = false,
  onClick,
}: GigCardProps) {
  const event = item;
  const { matchScore, matchedArtists, distanceKm } = item;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useAuth();

  const { guestLockOpen, setGuestLockOpen, requireAuth } = useGuestLock();
  const { data: countsData } = useQuery<{

  saveCount: number;
  shareCount: number;
  soundcheckCount: number;
  saved: boolean;
  shared: boolean;
  soundchecked: boolean;
}>({
  queryKey: ["/api/events", event.id, "counts"],
  queryFn: async () => {
    const res = await fetch(`/api/events/${event.id}/counts`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch counts");
    return res.json();
  },
});
  const saved = countsData?.saved ?? initialSaved;
  const shared = countsData?.shared ?? initialShared;
  const soundchecked = countsData?.soundchecked ?? initialSoundchecked;
  

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
      return format(new Date(event.startTime), "EEE, MMM d • h:mma").replace(
        ":00",
        ""
      );
    } catch {
      return "";
    }
  })();

  

  
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/saves/${event.id}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to save");
      return (await res.json()) as { saved: boolean };
    },
    onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: ["/api/events", event.id, "counts"],
  });
      toast({ title: "Saved updated" });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Try again in a sec." });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/shares/${event.id}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to share");
      return (await res.json()) as { shared: boolean };
    },
    onSuccess: async () => {
  await queryClient.invalidateQueries({
    queryKey: ["/api/events", event.id, "counts"],
  });
},
    onError: () => {
      toast({ title: "Share failed", description: "Try again in a sec." });
    },
  });

  const soundcheckMutation = useMutation({
  mutationFn: async () => {
    const res = await fetch(`/api/soundchecks/${event.id}`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to soundcheck");
    return (await res.json()) as { soundchecked: boolean };
  },

  onError: () => {
    toast({
      title: "Soundcheck failed",
      description: "Try again in a sec.",
    });
  },

  onSuccess: async () => {
    await queryClient.invalidateQueries({
      queryKey: ["/api/events", event.id, "counts"],
    });

    toast({
      title: "Soundcheck updated",
    });
  },
});

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!requireAuth() || saveMutation.isPending) return;
    saveMutation.mutate();
  };

  const handleSoundcheck = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!requireAuth() || soundcheckMutation.isPending) return;
    soundcheckMutation.mutate();
  };

  const handleShare = useCallback(
  async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation?.();

    if (!requireAuth() || shareMutation.isPending) return;

    const shareUrl = `${window.location.origin}/events/${event.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: event.name,
          text: `Check out ${event.name}${
            event.venueName ? ` at ${event.venueName}` : ""
          }`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link copied to clipboard" });
      }

      shareMutation.mutate();
    } catch (error) {
      console.error("Share failed", error);
    }
  },
  [event.id, event.name, event.venueName, requireAuth, shareMutation, toast]
);
  
  const handleTickets = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (event.ticketUrl) {
      window.open(event.ticketUrl, "_blank", "noopener,noreferrer");
    }
  };

 
  return (
    <>
  <Card
    role="article"
    onClick={onClick}
    data-testid={`card-gig-${event.id}`}
    className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_0_40px_rgba(139,92,246,0.15)]"
  >
    {/* IMAGE */}
    <div className="relative h-[220px] w-full overflow-hidden">
      <img
        src={event.imageUrl || "/placeholder.jpg"}
        className="w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="absolute top-3 left-3 px-3 py-1 text-xs bg-black/60 rounded-full">
        Nearby
      </div>

      {locationLabel && (
        <div className="absolute bottom-3 right-3 px-3 py-1 text-xs bg-black/60 rounded-full">
          {locationLabel}
        </div>
      )}
    </div>

    {/* CONTENT */}
    <div className="p-4 space-y-2">

      <h2 className="text-lg font-bold text-white">
        {event.name}
      </h2>

      <p className="text-sm text-white/70">
        {event.venueName}
      </p>

      <p className="text-sm text-white/50">
        {formattedDate}
      </p>

      {/* ACTION ROW */}
<div className="mt-3">
  <div className="flex gap-2">

    <button
      onClick={handleSoundcheck}
      className={[
        "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border transition-all font-medium",
        soundchecked
            ? "bg-purple-600 text-white border-purple-400"
            : "border-white/20 text-white/70 hover:bg-purple-500/20"
      ].join(" ")}
    >
      <span className="text-sm">🎧</span>
      <span>Soundcheck</span>
    </button>

    <button
      onClick={handleSave}
      className={[
        "flex-1 flex items-center justify-center py-2 rounded-xl border transition-all",
        saved
          ? "bg-purple-600 text-white border-purple-400"
            : "border-white/20 text-white/70 hover:bg-purple-500/20"
      ].join(" ")}
    >
      <Bookmark
        className="h-5 w-5"
        fill={saved ? "currentColor" : "none"}
      />
    </button>

    <button
      onClick={handleShare}
      className={[
        "flex-1 flex items-center justify-center py-2 rounded-xl border transition-all",
        shared
          ? "bg-purple-600 text-white border-purple-400"
            : "border-white/20 text-white/70 hover:bg-purple-500/20"
      ].join(" ")}
    >
      <Share2 className="h-5 w-5" />
    </button>

  </div>
</div>
</div>

{/* TICKETS */}
<div className="px-4 pb-4">
  {event.ticketUrl ? (
    <button
      onClick={handleTickets}
      className="w-full py-3 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white font-semibold border border-purple-400/20"
    >
      Get Tickets
    </button>
  ) : (
    <button
  onClick={(e) => {
    e.stopPropagation();
    window.location.href = `/venues/${encodeURIComponent(event.venueName || "")}`;
  }}
  className="w-full py-3 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white font-semibold border border-purple-400/20"
>
  Contact Venue for Tickets
</button>
  )}
</div>
</Card>

<LockedFeatureModal
  open={guestLockOpen}
  onOpenChange={setGuestLockOpen}
/>
</>
);
}