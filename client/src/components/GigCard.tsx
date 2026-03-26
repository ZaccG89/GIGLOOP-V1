import { useState, useCallback } from "react";
import { Bookmark, Share2, Ticket, Music, Users } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SoundcheckIcon } from "./SoundcheckIcon";
import { LockedFeatureModal } from "@/components/LockedFeatureModal";
import { Card } from "@/components/ui/card";
import type { FeedItem } from "@/hooks/use-feed";
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

  const [saved, setSaved] = useState(initialSaved);
  const [shared, setShared] = useState(initialShared);
  const [soundchecked, setSoundchecked] = useState(initialSoundchecked);

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

  const attendanceQueryKey = ["/api/events", event.id, "attendance"] as const;
  const goingQueryKey = ["/api/going", event.id, "me"] as const;

  const { data: attendanceData } = useQuery<AttendanceResponse>({
    queryKey: attendanceQueryKey,
    queryFn: async () => {
      const res = await fetch(`/api/events/${event.id}/attendance`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load attendance");
      }

      return res.json();
    },
  });

  const { data: goingData } = useQuery<GoingResponse>({
    queryKey: goingQueryKey,
    queryFn: async () => {
      const res = await fetch(`/api/going/${event.id}/me`, {
        credentials: "include",
      });

      if (!res.ok) {
        return { going: false };
      }

      return res.json();
    },
    enabled: !!user,
  });

  const attendanceMutation = useMutation({
    mutationFn: async (currentlyGoing: boolean) => {
      const method = currentlyGoing ? "DELETE" : "POST";

      const res = await fetch(`/api/going/${event.id}`, {
        method,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to update attendance");
      }

      return { going: !currentlyGoing };
    },

    onMutate: async (currentlyGoing: boolean) => {
      await queryClient.cancelQueries({ queryKey: attendanceQueryKey });
      await queryClient.cancelQueries({ queryKey: goingQueryKey });

      const previousAttendance =
        queryClient.getQueryData<AttendanceResponse>(attendanceQueryKey);
      const previousGoing =
        queryClient.getQueryData<GoingResponse>(goingQueryKey);

      const nextGoing = !currentlyGoing;

      queryClient.setQueryData<GoingResponse>(goingQueryKey, {
        going: nextGoing,
      });

      queryClient.setQueryData<AttendanceResponse>(attendanceQueryKey, (old) => {
        const currentCount = old?.count ?? 0;
        const nextCount = nextGoing
          ? currentCount + 1
          : Math.max(0, currentCount - 1);

        return {
          count: nextCount,
          attendees: old?.attendees ?? [],
        };
      });

      return { previousAttendance, previousGoing, currentlyGoing };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousAttendance) {
        queryClient.setQueryData(attendanceQueryKey, context.previousAttendance);
      }
      if (context?.previousGoing) {
        queryClient.setQueryData(goingQueryKey, context.previousGoing);
      }

      toast({
        title: "Attendance failed",
        description: "Try again in a sec.",
      });
    },

    onSuccess: (_data, currentlyGoing) => {
      toast({
        title: currentlyGoing ? "Removed from Going" : "You're going",
      });
    },

    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: attendanceQueryKey });
      await queryClient.invalidateQueries({ queryKey: goingQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/saves/${event.id}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to save");
      return (await res.json()) as { saved: boolean };
    },
    onSuccess: (data) => {
      setSaved(data.saved);
      queryClient.invalidateQueries({ queryKey: ["/api/saves"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saves/events"] });
      toast({ title: data.saved ? "Saved!" : "Removed from saved" });
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
    onSuccess: (data) => {
      setShared(data.shared);
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
    onSuccess: (data) => {
      setSoundchecked(data.soundchecked);
      toast({
        title: data.soundchecked ? "Soundchecked" : "Soundcheck removed",
      });
    },
    onError: () => {
      toast({ title: "Soundcheck failed", description: "Try again in a sec." });
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

      if (!requireAuth() || shareMutation.isPending) return;

      const url =
        event.ticketUrl || `${window.location.origin}/events/${event.id}`;

      const shareData = {
        title: event.name,
        text: `Check out ${event.name}${
          event.venueName ? ` at ${event.venueName}` : ""
        }`,
        url,
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(url);
          toast({ title: "Link copied to clipboard" });
        }

        shareMutation.mutate();
      } catch {
        // user cancelled share
      }
    },
    [
      event.id,
      event.name,
      event.ticketUrl,
      event.venueName,
      shareMutation,
      toast,
      requireAuth,
    ]
  );

  const handleGoing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!requireAuth()) {
      setGuestLockOpen(true);
      return;
    }

    if (attendanceMutation.isPending) return;

    const currentlyGoing = !!goingData?.going;
    attendanceMutation.mutate(currentlyGoing);
  };

  const handleTickets = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (event.ticketUrl) {
      window.open(event.ticketUrl, "_blank", "noopener,noreferrer");
    }
  };

  const goingCount = attendanceData?.count ?? 0;
  const isGoing = !!goingData?.going;

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

      {/* SOUND CHECK CARD */}
      <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-purple-900/40 to-pink-900/20 border border-purple-500/20 shadow-[0_0_25px_rgba(168,85,247,0.25)]">
        <p className="text-xs text-purple-300 uppercase">
          Be the first to soundcheck
        </p>

        <p className="text-lg font-semibold text-white">
          {soundchecked ? "You're going" : "0 soundchecks"}
        </p>

        <p className="text-xs text-white/50">
          Tap soundcheck if you're going
        </p>
      </div>

      {/* ACTION ROW */}
      <div className="mt-3 space-y-2">

        <button
          onClick={handleSoundcheck}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold shadow-[0_0_25px_rgba(168,85,247,0.6)]"
        >
          🎧 Soundcheck
        </button>

        <div className="flex gap-2">

          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded-xl border border-white/10 text-white/70"
          >
            🔖
          </button>

          <button
            onClick={handleShare}
            className="flex-1 py-2 rounded-xl border border-white/10 text-white/70"
          >
            🔗
          </button>

          <button
            onClick={handleGoing}
            className="flex-1 py-2 rounded-xl border border-white/10 text-white/70"
          >
            👥
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
          🎟 Get Tickets
        </button>
      ) : (
        <div className="w-full py-3 rounded-xl border border-white/10 text-center text-white/40">
          No Tickets Listed
        </div>
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

function IconBtn({
  children,
  onClick,
  active,
  label,
  disabled,
  ...rest
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
  label: string;
  disabled?: boolean;
  [key: string]: unknown;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={[
        "flex h-9 w-9 items-center justify-center rounded-[10px] border transition-all",
        active
          ? "border-purple-400/80 bg-purple-500/20 text-purple-400 shadow-[0_0_16px_rgba(155,92,255,0.45)]"
          : "border-white/10 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white",
        disabled ? "cursor-default opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      {children}
    </button>
  );
}