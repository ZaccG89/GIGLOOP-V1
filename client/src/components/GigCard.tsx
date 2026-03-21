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
        className="group cursor-pointer overflow-hidden p-0 hover:-translate-y-0.5"
      >
        <div className="relative h-[180px] w-full bg-[#0b0f1a]">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt={event.name}
              className="h-full w-full object-cover opacity-85 transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music className="h-14 w-14 text-white/20" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

          {isMatch ? (
            <div className="absolute left-3 top-3 rounded-full bg-purple-500 px-2.5 py-1 text-[11px] font-extrabold text-[#05060A] shadow-[0_0_12px_rgba(155,92,255,0.5)]">
              {Math.round(matchScore * 100)}% Match
            </div>
          ) : (
            <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-zinc-200">
              Nearby
            </div>
          )}

          {locationLabel && (
            <div className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[11px] text-zinc-200">
              {locationLabel}
            </div>
          )}
        </div>

        <div className="p-4">
          <p className="truncate text-[18px] font-semibold leading-[1.3] text-white">
            {event.name}
          </p>

          {event.venueName && (
            <p className="mt-0.5 truncate text-sm text-zinc-400">
              {event.venueName}
            </p>
          )}

          {formattedDate && (
            <p className="mt-1 text-sm text-zinc-400">{formattedDate}</p>
          )}

          {matchReason && (
            <p className="mt-2 truncate text-[13px] text-purple-400">
              {matchReason}
            </p>
          )}

          <p className="mt-2 text-[13px] text-zinc-400">
            {goingCount} {goingCount === 1 ? "person" : "people"} going
          </p>
        </div>

        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <IconBtn
              label="Save"
              onClick={handleSave}
              active={saved}
              disabled={saveMutation.isPending}
              data-testid="button-save"
            >
              <Bookmark
                className="h-4 w-4"
                fill={saved ? "currentColor" : "none"}
              />
            </IconBtn>

            <IconBtn
              label="Share"
              onClick={handleShare}
              active={shared}
              disabled={shareMutation.isPending}
              data-testid="button-share"
            >
              <Share2 className="h-4 w-4" />
            </IconBtn>

            <IconBtn
              label="Soundcheck"
              onClick={handleSoundcheck}
              active={soundchecked}
              disabled={soundcheckMutation.isPending}
              data-testid="button-soundcheck"
            >
              <SoundcheckIcon className="h-4 w-4" />
            </IconBtn>

            <IconBtn
              label="Going"
              onClick={handleGoing}
              active={isGoing}
              disabled={attendanceMutation.isPending}
              data-testid="button-going"
            >
              <Users className="h-4 w-4" fill={isGoing ? "currentColor" : "none"} />
            </IconBtn>
          </div>
        </div>

        <div className="px-4 pb-4">
          {event.ticketUrl ? (
            <button
              onClick={handleTickets}
              data-testid={`button-tickets-${event.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-3 text-[15px] font-bold text-white shadow-[0_0_0_1px_rgba(155,92,255,0.25),0_10px_30px_rgba(155,92,255,0.20)] transition-all hover:from-purple-500 hover:to-purple-400"
            >
              <Ticket className="h-4 w-4" />
              Get Tickets
            </button>
          ) : (
            <div className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] font-semibold text-zinc-400">
              <Ticket className="h-4 w-4" />
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