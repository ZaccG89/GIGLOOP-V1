import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGuestLock } from "@/hooks/use-guest-lock";
import { LockedFeatureModal } from "@/components/LockedFeatureModal";
import { MapPin } from "lucide-react";

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

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<any>(null);

  const {
    guestLockOpen,
    setGuestLockOpen,
  } = useGuestLock();

  const isAdmin = useMemo(() => {
    return (
      typeof user?.email === "string" &&
      user.email.toLowerCase().includes("admin")
    );
  }, [user]);

  const handleDelete = async () => {
    if (!isAdmin || !event?.id) return;
    if (!confirm("Delete this event?")) return;

    await fetch(`/api/admin/events/${event.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    window.location.href = "/";
  };

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const eventRes = await fetch(`/api/events/${eventId}`, {
          credentials: "include",
        });

        if (cancelled) return;

        if (eventRes.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        if (!eventRes.ok) {
          throw new Error(`Failed to load event (${eventRes.status})`);
        }

        const contentType = eventRes.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await eventRes.text();
          throw new Error(
            `Event API returned non-JSON for /api/events/${eventId}: ${text.slice(0, 120)}`
          );
        }

        const eventData = await eventRes.json();

        if (cancelled) return;

        setEvent(eventData.event ?? eventData);
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

  const fullLocation = [
    event?.address,
    event?.suburb,
    city,
    state,
    event?.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const mapQuery = [
    venueName,
    event?.address,
    event?.suburb,
    city,
    state,
    event?.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="max-w-[900px] mx-auto p-4">
        <Link href="/" className="text-white/60 mb-3 block">
          ← Back
        </Link>

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

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                Date & Time
              </p>
              <p className="mt-1 text-white font-medium">
                {fmtDateTime(startTime) || "Time TBC"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                Venue
              </p>
              <p className="mt-1 text-white font-medium">
                {venueName || "Venue TBC"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                Location
              </p>
              <p className="mt-1 text-sm text-white/55">
                {fullLocation || "Location details coming soon"}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!mapQuery) return;

                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`,
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-white/90"
              >
                <MapPin className="h-4 w-4" />
                <span>View Location</span>
              </button>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={handleDelete}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-xl"
            >
              Delete Event
            </button>
          )}

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
                  if (!mapQuery) return;

                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`,
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