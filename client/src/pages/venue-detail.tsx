import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button, Card, Input } from "@/components/ui-elements";
import { useVenue } from "@/hooks/use-venues";
import { useSubmitGig } from "@/hooks/use-gigs";
import { useParams, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  MapPin, Globe, Instagram, CalendarPlus, CheckCircle2,
  Lock, Building2, Calendar, Music, Ticket, CalendarDays, Map,
} from "lucide-react";
import type { Venue, Event } from "@shared/schema";

type Tab = "upcoming" | "submit";

export default function VenueDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: user, isLoading: userLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("upcoming");

  const { data: venue, isLoading: venueLoading } = useVenue(id || "");
  const submitGig = useSubmitGig();
  const { data: myVenue } = useQuery<Venue>({ queryKey: ["/api/venue/my-profile"], retry: false });
  const isOwner = myVenue?.id === venue?.id && myVenue?.verificationStatus === "approved";

  const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/venues", id, "events"],
    queryFn: async () => {
      const res = await fetch(`/api/venues/${id}/events`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const [form, setForm] = useState({
    eventName: "", startTime: "", ticketUrl: "", posterUrl: "", artists: "", notes: ""
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) setLocation("/signup");
  }, [user, userLoading, setLocation]);

  if (userLoading || venueLoading) return null;
  if (!user) return null;
  if (!venue) return <Layout><div className="text-white">Venue not found</div></Layout>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.eventName || !form.startTime || !form.artists) {
      alert("Please fill in required fields: Event Name, Start Time, and Artists");
      return;
    }
    submitGig.mutate({
      venueId: venue.id,
      venueName: venue.name,
      eventName: form.eventName,
      startTime: new Date(form.startTime).toISOString(),
      ticketUrl: form.ticketUrl || undefined,
      posterUrl: form.posterUrl || undefined,
      artists: form.artists,
      notes: form.notes || undefined,
      submitterName: user.displayName || undefined,
      submitterEmail: user.email || undefined,
    }, {
      onSuccess: () => {
        setSubmitted(true);
        setForm({ eventName: "", startTime: "", ticketUrl: "", posterUrl: "", artists: "", notes: "" });
      }
    });
  };

  const tabs: { id: Tab; label: string; icon: typeof Calendar; count?: number }[] = [
    { id: "upcoming", label: "Upcoming Gigs", icon: CalendarDays, count: upcomingEvents.length || undefined },
    { id: "submit", label: "Post a Gig", icon: CalendarPlus },
  ];

  return (
    <Layout>
      {/* ── Venue header ───────────────────────────────────────────── */}
      <div className="mb-8">
        <Link href="/venues" className="text-primary hover:underline text-sm font-medium mb-4 inline-block">
          &larr; Back to Venues
        </Link>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">{venue.name}</h1>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {(venue.address || venue.city) && (
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full">
              <MapPin className="w-4 h-4" />
              {[venue.address, venue.suburb, venue.city, venue.state].filter(Boolean).join(", ")}
            </div>
          )}
          {(venue.lat && venue.lng) && (
            <a
              href={`https://www.google.com/maps?q=${venue.lat},${venue.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-maps"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors px-3 py-1.5 rounded-full text-white"
            >
              <Map className="w-4 h-4" />
              Maps
            </a>
          )}
          {venue.website && (
            <a href={venue.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors px-3 py-1.5 rounded-full text-white">
              <Globe className="w-4 h-4" />
              Website
            </a>
          )}
          {venue.instagram && (
            <a href={venue.instagram} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors px-3 py-1.5 rounded-full text-white">
              <Instagram className="w-4 h-4" />
              Instagram
            </a>
          )}
          {venue.verificationStatus === "approved" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(155,92,255,0.15)", color: "var(--purple)" }}>
              Verified Venue
            </div>
          )}
        </div>

        {venue.bio && (
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl">{venue.bio}</p>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border-raw)" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            data-testid={`tab-venue-${t.id}`}
            onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === t.id ? "var(--purple)" : "transparent",
              color: tab === t.id ? "#05060A" : "var(--muted-color)",
            }}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.count !== undefined && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: tab === t.id ? "rgba(0,0,0,0.2)" : "rgba(155,92,255,0.2)",
                  color: tab === t.id ? "#05060A" : "var(--purple)",
                }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Upcoming Gigs ──────────────────────────────────────────── */}
      {tab === "upcoming" && (
        <div>
          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse rounded-2xl h-28"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-raw)" }} />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-20" style={{ color: "var(--muted-color)" }}>
              <CalendarDays className="w-14 h-14 mx-auto mb-4 opacity-25" />
              <p className="text-xl font-bold text-white mb-2">No upcoming gigs listed</p>
              <p className="text-sm mb-6">Nothing scheduled at {venue.name} in the next 6 weeks.</p>
              {isOwner && (
                <button
                  onClick={() => setTab("submit")}
                  className="g-btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 mx-auto"
                >
                  <CalendarPlus className="w-4 h-4" />
                  Post the First Gig
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {upcomingEvents.map(event => (
                <UpcomingEventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Post a Gig ──────────────────────────────────────────────── */}
      {tab === "submit" && (
        <Card className="p-6 md:p-8 border-t-4 border-t-primary">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Post a Gig</h2>
              <p className="text-sm text-muted-foreground">
                {isOwner ? "Post a gig at your venue." : "Only the verified venue owner can post gigs here."}
              </p>
            </div>
          </div>

          {!isOwner ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Verified Venues Only</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {myVenue?.verificationStatus === "pending"
                    ? "Your venue application is pending review. You'll be able to post gigs once approved."
                    : "Is this your venue? Register and get verified to post gigs directly from this page."}
                </p>
              </div>
              {!myVenue && (
                <Link href="/venue/register">
                  <button className="g-btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Register Your Venue
                  </button>
                </Link>
              )}
            </div>
          ) : submitted ? (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Gig Submitted!</h3>
              <p className="text-muted-foreground mb-6">Pending admin review. It'll appear in the feed shortly.</p>
              <Button onClick={() => setSubmitted(false)} variant="outline">Submit Another</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Event Name *</label>
                  <Input required placeholder="e.g. Local Indie Showcase" value={form.eventName}
                    onChange={e => setForm({...form, eventName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Start Time *</label>
                  <Input required type="datetime-local" value={form.startTime}
                    onChange={e => setForm({...form, startTime: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Artists (comma separated) *</label>
                <Input required placeholder="Band A, Solo Artist B, DJ C" value={form.artists}
                  onChange={e => setForm({...form, artists: e.target.value})} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Ticket URL</label>
                  <Input type="url" placeholder="https://..." value={form.ticketUrl}
                    onChange={e => setForm({...form, ticketUrl: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Poster Image URL</label>
                  <Input type="url" placeholder="https://..." value={form.posterUrl}
                    onChange={e => setForm({...form, posterUrl: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Notes / Description</label>
                <textarea
                  className="flex w-full rounded-xl border border-white/10 bg-input/50 px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[100px]"
                  placeholder="Any extra info..."
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                />
              </div>

              <Button type="submit" disabled={submitGig.isPending} className="w-full md:w-auto mt-4">
                {submitGig.isPending ? "Submitting..." : "Post Gig"}
              </Button>
              {submitGig.isError && (
                <p className="text-destructive text-sm mt-2 font-medium">Error: {submitGig.error.message}</p>
              )}
            </form>
          )}
        </Card>
      )}
    </Layout>
  );
}

// ── Compact event row for upcoming gigs list ──────────────────────────────
function UpcomingEventRow({ event }: { event: Event }) {
  const formattedDate = (() => {
    try {
      const d = new Date(event.startTime);
      return {
        day: format(d, "EEE"),
        date: format(d, "MMM d"),
        time: format(d, "h:mma").replace(":00", ""),
      };
    } catch {
      return null;
    }
  })();

  return (
    <div
      data-testid={`row-upcoming-${event.id}`}
      className="flex items-center gap-4 p-4 rounded-2xl transition-all"
      style={{ background: "var(--surface)", border: "1px solid var(--border-raw)" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(155,92,255,0.35)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-raw)")}
    >
      {/* Date block */}
      {formattedDate && (
        <div className="flex-shrink-0 w-14 text-center">
          <p className="text-xs font-semibold uppercase" style={{ color: "var(--purple)" }}>{formattedDate.day}</p>
          <p className="text-lg font-extrabold text-white leading-tight">{formattedDate.date.split(" ")[1]}</p>
          <p className="text-[10px]" style={{ color: "var(--muted-color)" }}>{formattedDate.date.split(" ")[0]}</p>
        </div>
      )}

      {/* Divider */}
      <div className="w-px h-12 flex-shrink-0" style={{ background: "var(--border-raw)" }} />

      {/* Thumbnail */}
      <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden" style={{ background: "#0B0E16" }}>
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover opacity-85" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-5 h-5" style={{ color: "var(--border-raw)" }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate" style={{ color: "var(--silver)" }}>{event.name}</p>
        {formattedDate && (
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-color)" }}>{formattedDate.time}</p>
        )}
        {event.status === "onsale" && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block"
            style={{ background: "rgba(155,92,255,0.15)", color: "var(--purple)" }}>
            On Sale
          </span>
        )}
      </div>

      {/* Ticket link */}
      {event.ticketUrl && (
        <a
          href={event.ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`link-tickets-upcoming-${event.id}`}
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
          style={{ background: "var(--purple)", color: "#05060A" }}
        >
          <Ticket className="w-3 h-3" />
          Tickets
        </a>
      )}
    </div>
  );
}
