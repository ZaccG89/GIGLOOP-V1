import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { SoundcheckIcon } from "../components/SoundcheckIcon";
import { useAuth } from "@/hooks/use-auth";
import { useGuestLock } from "@/hooks/use-guest-lock";
import { LockedFeatureModal } from "@/components/LockedFeatureModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";


type Counts = {
  likes?: number;
  shares?: number;
  soundchecks?: number;
};

function fmtDateTime(v: any) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

export default function EventDetail() {
  const [, params] = useRoute("/events/:id");
  const { data: user } = useAuth() as { data: any };
  const eventId = params?.id as string;

  const queryClient = useQueryClient();

  const isAdmin =
    typeof user?.email === "string" &&
    user.email.toLowerCase().includes("admin");

  const handleDelete = async () => {
    if (!isAdmin) return;
    if (!confirm("Delete this event?")) return;

    await fetch(`/api/admin/events/${event.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    window.location.href = "/";
  };

  const {
    guestLockOpen,
    setGuestLockOpen,
    requireAuth,
  } = useGuestLock();

  const isGuest = useMemo(() => {
    return !user || (user as any)?.role === "guest" || !(user as any)?.email;
  }, [user]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [event, setEvent] = useState<any>(null);
  const [counts, setCounts] = useState<Counts>({});

  const [likePending, setLikePending] = useState(false);
  const [sharePending, setSharePending] = useState(false);
  const [soundcheckPending, setSoundcheckPending] = useState(false);

  const { data: attendanceData } = useQuery({
  queryKey: ["/api/events", eventId, "attendance"],
  queryFn: async () => {
    const res = await fetch(`/api/events/${eventId}/attendance`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to load attendance");

    return res.json();
  },
  enabled: !!eventId,
});

  const { data: goingData } = useQuery({
    queryKey: ["/api/going", eventId, "me"],
    queryFn: async () => {
      const res = await fetch(`/api/going/${eventId}/me`, {
        credentials: "include",
      });

      if (!res.ok) return { going: false };

      return res.json();
    },
    enabled: !!user,
  });

  const attendanceMutation = useMutation({
  mutationFn: async () => {
    const currentlyGoing = !!goingData?.going;
    const method = currentlyGoing ? "DELETE" : "POST";

    const res = await fetch(`/api/going/${eventId}`, {
      method,
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Attendance update failed");
    }

    return true;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["/api/events", eventId, "attendance"],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/going", eventId, "me"],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/feed"],
    });
  },
});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(`/api/events/${eventId}`, {
          credentials: "include",
        });

        if (cancelled) return;

        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to load event");
        }

        const data = await res.json();
        setEvent(data.event ?? data);
        setCounts(data.counts ?? {});
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to load event");
        setLoading(false);
      }
    }

    if (eventId) run();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function refreshCounts() {
    try {
      const res = await fetch(`/api/events/${eventId}/counts`, {
        credentials: "include",
      });

      if (!res.ok) return;

      const updated = await res.json();
      setCounts(updated ?? {});
    } catch {}
  }

  async function handleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isGuest) {
      setGuestLockOpen(true);
      return;
    }

    if (likePending) return;

    try {
      setLikePending(true);

      const res = await fetch(`/api/likes/${eventId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to like event");

      await refreshCounts();
    } finally {
      setLikePending(false);
    }
  }

  async function handleSoundcheck(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isGuest) {
      setGuestLockOpen(true);
      return;
    }

    if (soundcheckPending) return;

    try {
      setSoundcheckPending(true);

      const res = await fetch(`/api/soundchecks/${eventId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to soundcheck");

      await refreshCounts();
    } finally {
      setSoundcheckPending(false);
    }
  }

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isGuest) {
      setGuestLockOpen(true);
      return;
    }

    if (sharePending) return;

    const shareUrl = event?.ticketUrl || window.location.href;

    try {
      setSharePending(true);

      if (navigator.share) {
        await navigator.share({
          title: event?.name,
          text: `Check out ${event?.name}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }

      await fetch(`/api/shares/${eventId}`, {
        method: "POST",
        credentials: "include",
      });

      await refreshCounts();
    } finally {
      setSharePending(false);
    }
  }

  function handleGoing(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  if (!requireAuth()) {
    setGuestLockOpen(true);
    return;
  }

  if (attendanceMutation.isPending) return;
  attendanceMutation.mutate();
}

  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;

  if (notFound) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Event not found</h2>
        <Link href="/">← Back to feed</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Error</h2>
        <div>{error}</div>
        <Link href="/">Back</Link>
      </div>
    );
  }

  const title = event?.name || "Untitled event";
  const imageUrl = event?.imageUrl;

  const ticketUrl =
    typeof event?.ticketUrl === "string" && event.ticketUrl.trim()
      ? event.ticketUrl.startsWith("http://") || event.ticketUrl.startsWith("https://")
        ? event.ticketUrl
        : `https://${event.ticketUrl}`
      : "";

  const venueName = event?.venueName;
  const city = event?.city;
  const state = event?.state;
  const startTime = event?.startTime;

  return (
    <>
  <div className="max-w-[900px] mx-auto p-4">

    <Link href="/" className="text-white/60 mb-3 block">
      ← Back
    </Link>

    {/* IMAGE */}
    <div className="relative h-[240px] w-full overflow-hidden rounded-2xl">
      <img
        src={imageUrl || "/placeholder.jpg"}
        className="w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {(venueName || city) && (
        <div className="absolute bottom-3 right-3 px-3 py-1 text-xs bg-black/60 rounded-full">
          {[venueName, city].filter(Boolean).join(" • ")}
        </div>
      )}
    </div>

    {/* CONTENT */}
    <div className="mt-4 space-y-2">

      <h1 className="text-xl font-bold text-white">
        {title}
      </h1>

      <p className="text-white/70">
        {venueName}
      </p>

      <p className="text-white/50 text-sm">
        {fmtDateTime(startTime)}
      </p>

      <p className="text-white/50 text-sm">
        {attendanceData?.count ?? 0} people going
      </p>

      {/* SOUND CHECK BOX */}
      <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-purple-900/40 to-pink-900/20 border border-purple-500/20 shadow-[0_0_25px_rgba(168,85,247,0.25)]">
        <p className="text-xs text-purple-300 uppercase">
          Be the first to soundcheck
        </p>

        <p className="text-lg font-semibold text-white">
          {counts.soundchecks ?? 0} soundchecks
        </p>

        <p className="text-lg font-semibold text-white">
          {counts.soundchecks ?? 0} soundchecks
        </p>

        <p className="text-xs text-white/50">
          Tap soundcheck if you're going
        </p>
      </div>

      {/* ACTIONS */}
      <div className="mt-3 space-y-2">

        <button
          onClick={handleSoundcheck}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold shadow-[0_0_25px_rgba(168,85,247,0.6)]"
        >
          🎧 Soundcheck
        </button>

        <div className="flex gap-2">

          <button
            onClick={handleLike}
            className="flex-1 py-2 rounded-xl border border-white/10 text-white/70"
          >
            ❤️ {counts.likes ?? 0}
          </button>

          <button
            onClick={handleShare}
            className="flex-1 py-2 rounded-xl border border-white/10 text-white/70"
          >
            🔗 {counts.shares ?? 0}
          </button>

          <button
            onClick={handleGoing}
            className="flex-1 py-2 rounded-xl border border-white/10 text-white/70"
          >
            👥 {attendanceData?.count ?? 0}
          </button>

        </div>
      </div>

      {/* ADMIN DELETE */}
      {isAdmin && (
        <button
          onClick={handleDelete}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl"
        >
          Delete Event
        </button>
      )}

      {/* TICKETS */}
      <div className="mt-4">
        {ticketUrl ? (
          <button
            onClick={() => {
              if (!ticketUrl) return;
              window.open(ticketUrl, "_blank", "noopener,noreferrer");
            }}
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

    </div>
  </div>

  <LockedFeatureModal
    open={guestLockOpen}
    onOpenChange={setGuestLockOpen}
  />
</>
  );
}