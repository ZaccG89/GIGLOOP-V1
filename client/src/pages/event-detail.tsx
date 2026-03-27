import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { SoundcheckIcon } from "../components/SoundcheckIcon";
import { MapPin, Share2, Users } from "lucide-react";
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
          throw new Error(`Failed to load event (${res.status})`);
        }

        const contentType = res.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Event API returned non-JSON for /api/events/${eventId}: ${text.slice(0, 120)}`
          );
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
      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {title}
          </h1>

          {venueName && (
            <p className="text-white/75 text-lg">
              {venueName}
            </p>
          )}

          <p className="text-white/55 text-sm">
            {fmtDateTime(startTime)}
          </p>
        </div>

        {/* ACTIONS */}
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleSoundcheck}
              className="flex items-center justify-center gap-2 rounded-2xl border border-purple-500/70 px-4 py-3 text-white font-semibold shadow-[0_0_20px_rgba(168,85,247,0.18)]"
            >
              <SoundcheckIcon className="h-5 w-5" />
              <span>Soundcheck</span>
            </button>

            <button
              onClick={handleLike}
              className="flex items-center justify-center rounded-2xl border border-purple-500/70 px-4 py-3 text-white"
            >
              <Users className="h-5 w-5" />
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center rounded-2xl border border-purple-500/70 px-4 py-3 text-white"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          {/* VENUE INFO */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                Venue
              </p>
              <p className="mt-1 text-white font-medium">
                {venueName || "Venue TBC"}
              </p>
              <p className="mt-1 text-sm text-white/55">
                {[event?.address, event?.suburb, city, state, event?.postcode]
                  .filter(Boolean)
                  .join(", ") || "Location details coming soon"}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const query = [
                    venueName,
                    event?.address,
                    event?.suburb,
                    city,
                    state,
                    event?.postcode,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  if (!query) return;

                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-white/90"
              >
                <MapPin className="h-4 w-4" />
                <span>View Location</span>
              </button>

              <button
                onClick={handleGoing}
                className="rounded-xl border border-white/10 px-4 py-3 text-white/90 min-w-[92px]"
              >
                {attendanceData?.count ?? 0}
              </button>
            </div>
          </div>
        </div>

        {/* ADMIN DELETE */}
        {isAdmin && (
          <button
            onClick={handleDelete}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-xl"
          >
            Delete Event
          </button>
        )}

        {/* TICKETS */}
        <div className="pt-1">
          {ticketUrl ? (
            <button
              onClick={() => window.open(ticketUrl, "_blank", "noopener,noreferrer")}
              className="w-full py-4 rounded-2xl bg-purple-600/90 hover:bg-purple-500 text-white text-xl font-semibold border border-purple-400/20"
            >
              Get Tickets
            </button>
          ) : (
            <button
              onClick={() => {
                const query = [
                  venueName,
                  event?.address,
                  event?.suburb,
                  city,
                  state,
                  event?.postcode,
                ]
                  .filter(Boolean)
                  .join(", ");

                if (!query) return;

                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
              className="w-full py-4 rounded-2xl bg-purple-600/90 hover:bg-purple-500 text-white text-xl font-semibold border border-purple-400/20"
            >
              Contact Venue for Tickets
            </button>
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