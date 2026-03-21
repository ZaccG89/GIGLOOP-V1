import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { Heart, Share2, MapPin, Ticket, Users } from "lucide-react";
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
  const { data: user } = useAuth();
  const eventId = params?.id as string;

  const queryClient = useQueryClient();

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
  const ticketUrl = event?.ticketUrl;
  const venueName = event?.venueName;
  const city = event?.city;
  const state = event?.state;
  const startTime = event?.startTime;

  return (
    <>
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <Link href="/">← Back</Link>
{imageUrl && (
  <img
    src={imageUrl}
    alt={title}
    style={{ width: "100%", borderRadius: 12, marginBottom: 16 }}
  />
)}

<h1 style={{ fontSize: 28, fontWeight: 700, color: "white" }}>
  {title}
</h1>

<p style={{ color: "#aaa", marginTop: 6 }}>
  {startTime ? new Date(startTime).toLocaleString() : "Date TBC"}
</p>

<Link href={`/venues/${encodeURIComponent(venueName || "")}`}>
  <p style={{ color: "#ccc", cursor: "pointer", marginTop: 4 }}>
    {venueName || "Unknown venue"}
    {city ? ` • ${city}` : ""}
    {state ? `, ${state}` : ""}
  </p>
</Link>

{event?.genre && (
  <p style={{ color: "#888", marginTop: 4 }}>
    {event.genre}
  </p>
)}

{event?.description && (
  <div style={{ marginTop: 16 }}>
    <h3 style={{ color: "white" }}>About</h3>
    <p style={{ color: "#bbb", lineHeight: 1.6 }}>
      {event.description}
    </p>
  </div>
)}

{event?.venueAddress && (
  <div style={{ marginTop: 12 }}>
    <h3 style={{ color: "white" }}>Venue</h3>
    <p style={{ color: "#bbb" }}>
      {event.venueAddress}
    </p>
  </div>
)}

<div style={{ marginTop: 20, display: "flex", gap: 20 }}>
  <div style={{ color: "white" }}>
 
  </div>
  <div style={{ color: "white" }}>
    </div>
  <div style={{ color: "white" }}>
    </div>
</div>


        <h1 style={{ marginTop: 20 }}>{title}</h1>

        <p style={{ opacity: 0.7, marginTop: 6 }}>
          {attendanceData?.count ?? 0} people going
        </p>

        <div style={{ marginTop: 20, display: "flex", gap: 16 }}>
          <button onClick={handleLike} className="g-icon-btn">
            <Heart />
            {counts.likes ?? 0}
          </button>

          <button onClick={handleSoundcheck} className="g-icon-btn">
            <SoundcheckIcon />
            {counts.soundchecks ?? 0}
          </button>

          <button onClick={handleShare} className="g-icon-btn">
            <Share2 />
            {counts.shares ?? 0}
          </button>

          <button
  onClick={handleGoing}
  className="g-icon-btn"
  disabled={attendanceMutation.isPending}
  type="button"
  style={{
    color: goingData?.going ? "var(--purple)" : undefined,
    border: goingData?.going
      ? "1px solid rgba(155,92,255,0.7)"
      : undefined,
    background: goingData?.going ? "rgba(155,92,255,0.14)" : undefined,
    boxShadow: goingData?.going
      ? "0 0 12px rgba(155,92,255,0.35)"
      : undefined,
  }}
>
  <Users className="w-5 h-5" />
  {attendanceData?.count ?? 0}
</button>

          {(venueName || city || state) && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                [venueName, city, state].filter(Boolean).join(", ")
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              <button className="g-icon-btn">
                <MapPin />
              </button>
            </a>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          {ticketUrl ? (
            <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
              <button className="g-btn-primary w-full">
                <Ticket className="w-4 h-4 inline mr-2" />
                Buy Tickets
              </button>
            </a>
          ) : (
            <div
              style={{
                borderRadius: 16,
                padding: "14px 0",
                textAlign: "center",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              No Tickets Listed
            </div>
          )}
        </div>
      </div>

      <LockedFeatureModal
        open={guestLockOpen}
        onOpenChange={setGuestLockOpen}
      />
    </>
  );
}