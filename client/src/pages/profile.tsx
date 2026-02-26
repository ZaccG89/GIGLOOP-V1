import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { format } from "date-fns";
import { Bookmark, Heart, Music2, Ticket, Music, MapPin, Radio, Pencil, Check, X, Lock, Globe, UserCheck, Clock, Camera, Loader2 } from "lucide-react";
import type { Event, Follow, User } from "@shared/schema";
import type { UserArtist } from "@shared/schema";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Tab = "saved" | "liked" | "artists" | "requests";

export default function Profile() {
  const { data: user, isLoading: userLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("saved");
  const [editing, setEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ displayName: "", username: "", bio: "", avatarUrl: "", isPrivate: false });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setForm(f => ({ ...f, avatarUrl: data.url }));
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Photo updated" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!userLoading && !user) setLocation("/login");
    if (user) setForm({
      displayName: user.displayName ?? "",
      username: (user as any).username ?? "",
      bio: (user as any).bio ?? "",
      avatarUrl: (user as any).avatarUrl ?? "",
      isPrivate: (user as any).isPrivate ?? false,
    });
  }, [user, userLoading, setLocation]);

  const { data: savedEvents = [], isLoading: savedLoading } = useQuery<Event[]>({
    queryKey: ["/api/saves/events"],
    queryFn: async () => { const r = await fetch("/api/saves/events", { credentials: "include" }); if (!r.ok) return []; return r.json(); },
    enabled: !!user,
  });

  const { data: likedEvents = [], isLoading: likedLoading } = useQuery<Event[]>({
    queryKey: ["/api/likes/events"],
    queryFn: async () => { const r = await fetch("/api/likes/events", { credentials: "include" }); if (!r.ok) return []; return r.json(); },
    enabled: !!user,
  });

  const { data: artists = [], isLoading: artistsLoading } = useQuery<UserArtist[]>({
    queryKey: ["/api/user/artists"],
    queryFn: async () => { const r = await fetch("/api/user/artists", { credentials: "include" }); if (!r.ok) return []; return r.json(); },
    enabled: !!user,
  });

  const { data: followRequests = [] } = useQuery<(Follow & { follower: User })[]>({
    queryKey: ["/api/follows/requests"],
    queryFn: async () => { const r = await fetch("/api/follows/requests", { credentials: "include" }); if (!r.ok) return []; return r.json(); },
    enabled: !!user,
  });

  const { data: following = [] } = useQuery<(Follow & { following: User })[]>({
    queryKey: ["/api/follows/following"],
    queryFn: async () => { const r = await fetch("/api/follows/following", { credentials: "include" }); if (!r.ok) return []; return r.json(); },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: (body: typeof form) => apiRequest("PATCH", "/api/user/profile", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setEditing(false);
      toast({ title: "Profile updated" });
    },
    onError: (err: any) => {
      const msg = err?.message?.includes("409") ? "That username is already taken" : "Failed to update profile";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const respondToFollow = useMutation({
    mutationFn: ({ followId, status }: { followId: string; status: "accepted" | "rejected" }) =>
      apiRequest("PATCH", `/api/follows/${followId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/follows/requests"] }),
  });

  if (userLoading || !user) return null;

  const initial = user.displayName?.charAt(0).toUpperCase() || "G";
  const u = user as any;

  const tabs: { id: Tab; label: string; icon: typeof Bookmark; count?: number }[] = [
    { id: "saved", label: "Saved", icon: Bookmark, count: savedEvents.length },
    { id: "liked", label: "Liked", icon: Heart, count: likedEvents.length },
    { id: "artists", label: "Artists", icon: Music2, count: artists.length },
    { id: "requests", label: "Requests", icon: UserCheck, count: followRequests.length || undefined },
  ];

  return (
    <Layout>
      {/* ── Profile header ──────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-start gap-5 mb-5">
          <div className="flex-shrink-0 relative">
            {u.avatarUrl ? (
              <img src={u.avatarUrl} alt={user.displayName ?? "Avatar"} className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white"
                style={{ background: "linear-gradient(135deg, var(--purple), #7B3FD8)" }}>
                {initial}
              </div>
            )}
            {editing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute inset-0 rounded-2xl flex items-center justify-center transition-all"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                {avatarUploading
                  ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                  : <Camera className="w-6 h-6 text-white" />}
              </button>
            )}
          </div>

          {/* Name / meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">{user.displayName || "Guest"}</h1>
              {u.isPrivate
                ? <Lock className="w-4 h-4" style={{ color: "var(--muted-color)" }} />
                : <Globe className="w-4 h-4" style={{ color: "var(--muted-color)" }} />}
            </div>
            {u.username && <p className="text-sm mt-0.5" style={{ color: "var(--purple)" }}>@{u.username}</p>}
            {u.bio && <p className="text-sm mt-1 line-clamp-2" style={{ color: "var(--muted-color)" }}>{u.bio}</p>}
            {user.locationLat && user.locationLng ? (
              <p className="flex items-center gap-1 mt-1 text-sm" style={{ color: "var(--muted-color)" }}>
                <MapPin className="w-3 h-3" /> Within {user.radiusKm ?? 50} km
              </p>
            ) : null}
          </div>

          {/* Edit button */}
          <button
            onClick={() => setEditing(v => !v)}
            data-testid="button-edit-profile"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: editing ? "var(--purple)" : "var(--surface)", color: editing ? "#05060A" : "var(--silver)", border: "1px solid var(--border-raw)" }}
          >
            <Pencil className="w-3.5 h-3.5" />
            {editing ? "Editing" : "Edit"}
          </button>
        </div>

        {/* ── Edit panel ───────────────────────────────────────────── */}
        {editing && (
          <div className="rounded-2xl p-5 mb-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border-raw)" }}>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Display Name">
                <input className="g-input" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Your name" />
              </Field>
              <Field label="Username">
                <div className="flex items-center">
                  <span className="px-3 py-2.5 rounded-l-xl text-sm border border-r-0 border-white/10 bg-white/5" style={{ color: "var(--muted-color)" }}>@</span>
                  <input className="g-input rounded-l-none flex-1" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s/g, "") }))} placeholder="username" />
                </div>
              </Field>
            </div>
            <Field label="Bio">
              <textarea className="g-input min-h-[80px] resize-none" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell people about yourself..." maxLength={160} />
            </Field>
            <Field label="Profile Photo">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0 w-16 h-16">
                  {form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="Avatar preview" className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-extrabold text-white"
                      style={{ background: "linear-gradient(135deg, var(--purple), #7B3FD8)" }}>
                      {initial}
                    </div>
                  )}
                  {avatarUploading && (
                    <div className="absolute inset-0 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    data-testid="button-pick-photo"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: "var(--purple)", color: "#05060A" }}
                  >
                    <Camera className="w-4 h-4" />
                    {avatarUploading ? "Uploading…" : "Choose from Gallery"}
                  </button>
                  {form.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, avatarUrl: "" }))}
                      className="text-xs text-left px-1"
                      style={{ color: "var(--muted-color)" }}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </Field>
            <div className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-raw)" }}>
              <div>
                <p className="text-sm font-semibold text-white">Private Profile</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-color)" }}>Others must request to follow you before seeing your liked events</p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, isPrivate: !f.isPrivate }))}
                data-testid="toggle-private"
                className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all"
                style={{ background: form.isPrivate ? "var(--purple)" : "rgba(255,255,255,0.15)" }}
              >
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: form.isPrivate ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => updateProfile.mutate(form)}
                disabled={updateProfile.isPending}
                data-testid="button-save-profile"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{ background: "var(--purple)", color: "#05060A" }}
              >
                <Check className="w-4 h-4" />
                {updateProfile.isPending ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditing(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted-color)", border: "1px solid var(--border-raw)" }}
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: "Saved", value: savedEvents.length, icon: Bookmark },
            { label: "Liked", value: likedEvents.length, icon: Heart },
            { label: "Following", value: following.length, icon: UserCheck },
            { label: "Artists", value: artists.length, icon: Radio },
          ].map(stat => (
            <div key={stat.label} className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border-raw)" }}>
              <stat.icon className="w-3.5 h-3.5" style={{ color: "var(--purple)" }} />
              <span className="text-lg font-extrabold text-white">{stat.value}</span>
              <span className="text-[10px]" style={{ color: "var(--muted-color)" }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border-raw)" }}>
          {tabs.map(t => (
            <button key={t.id} data-testid={`tab-${t.id}`} onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: tab === t.id ? "var(--purple)" : "transparent", color: tab === t.id ? "#05060A" : "var(--muted-color)" }}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: tab === t.id ? "rgba(0,0,0,0.2)" : "rgba(155,92,255,0.2)", color: tab === t.id ? "#05060A" : "var(--purple)" }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────── */}
      {tab === "saved" && <EventList events={savedEvents} loading={savedLoading} emptyIcon={Bookmark} emptyText="No saved gigs yet" emptyHint="Hit the bookmark icon on any gig card to save it here." />}
      {tab === "liked" && <EventList events={likedEvents} loading={likedLoading} emptyIcon={Heart} emptyText="No liked gigs yet" emptyHint="Hit the heart icon on any gig card." />}
      {tab === "artists" && <ArtistList artists={artists} loading={artistsLoading} />}
      {tab === "requests" && (
        <div className="space-y-3 pb-6">
          {followRequests.length === 0 ? (
            <div className="text-center py-16" style={{ color: "var(--muted-color)" }}>
              <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-semibold text-white mb-1">No pending requests</p>
              <p className="text-sm">When someone requests to follow you, they'll appear here.</p>
            </div>
          ) : followRequests.map(req => (
            <div key={req.id} className="flex items-center gap-4 p-4 rounded-2xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border-raw)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, var(--purple), #7B3FD8)" }}>
                {req.follower.displayName?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: "var(--silver)" }}>{req.follower.displayName || "Unknown"}</p>
                {(req.follower as any).username && <p className="text-xs" style={{ color: "var(--muted-color)" }}>@{(req.follower as any).username}</p>}
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--muted-color)" }}>
                  <Clock className="w-3 h-3" /> wants to follow you
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => respondToFollow.mutate({ followId: req.id, status: "accepted" })}
                  data-testid={`button-accept-follow-${req.id}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: "var(--purple)", color: "#05060A" }}>
                  Accept
                </button>
                <button onClick={() => respondToFollow.mutate({ followId: req.id, status: "rejected" })}
                  data-testid={`button-reject-follow-${req.id}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted-color)", border: "1px solid var(--border-raw)" }}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-color)" }}>{label}</label>
      {children}
    </div>
  );
}

function EventList({ events, loading, emptyIcon: EmptyIcon, emptyText, emptyHint }: {
  events: Event[]; loading: boolean; emptyIcon: React.ElementType; emptyText: string; emptyHint: string;
}) {
  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="animate-pulse rounded-2xl h-24" style={{ background: "var(--surface)", border: "1px solid var(--border-raw)" }} />)}
    </div>
  );
  if (!events.length) return (
    <div className="text-center py-16" style={{ color: "var(--muted-color)" }}>
      <EmptyIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
      <p className="font-semibold text-white mb-1">{emptyText}</p>
      <p className="text-sm">{emptyHint}</p>
    </div>
  );
  return <div className="space-y-3 pb-6">{events.map(e => <EventRow key={e.id} event={e} />)}</div>;
}

function EventRow({ event }: { event: Event }) {
  const formattedDate = (() => {
    try { return format(new Date(event.startTime), "EEE, MMM d • h:mma").replace(":00", ""); }
    catch { return ""; }
  })();
  return (
    <div data-testid={`row-event-${event.id}`} className="flex items-center gap-4 p-4 rounded-2xl"
      style={{ background: "var(--surface)", border: "1px solid var(--border-raw)" }}>
      <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden" style={{ background: "#0B0E16" }}>
        {event.imageUrl ? <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover opacity-85" />
          : <div className="w-full h-full flex items-center justify-center"><Music className="w-6 h-6" style={{ color: "var(--border-raw)" }} /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate" style={{ color: "var(--silver)" }}>{event.name}</p>
        <p className="text-sm truncate" style={{ color: "var(--muted-color)" }}>{event.venueName}</p>
        {formattedDate && <p className="text-xs mt-0.5" style={{ color: "var(--muted-color)" }}>{formattedDate}</p>}
      </div>
      {event.ticketUrl && (
        <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-tickets-${event.id}`}
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
          style={{ background: "var(--purple)", color: "#05060A" }}>
          <Ticket className="w-3 h-3" /> Tickets
        </a>
      )}
    </div>
  );
}

function ArtistList({ artists, loading }: { artists: UserArtist[]; loading: boolean }) {
  if (loading) return (
    <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse rounded-2xl h-14" style={{ background: "var(--surface)", border: "1px solid var(--border-raw)" }} />)}</div>
  );
  if (!artists.length) return (
    <div className="text-center py-16" style={{ color: "var(--muted-color)" }}>
      <Music2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
      <p className="font-semibold text-white mb-1">No artists yet</p>
      <p className="text-sm">Connect Spotify, Apple Music, or add artists manually in Settings.</p>
    </div>
  );
  return (
    <div className="space-y-2 pb-6">
      {[...artists].sort((a, b) => b.affinityScore - a.affinityScore).map((artist, i) => (
        <div key={`${artist.userId}-${artist.spotifyArtistId}`} data-testid={`row-artist-${i}`}
          className="flex items-center gap-4 px-4 py-3 rounded-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border-raw)" }}>
          <span className="text-sm font-bold w-6 text-center" style={{ color: "var(--muted-color)" }}>{i + 1}</span>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
            style={{ background: "linear-gradient(135deg, var(--purple), #7B3FD8)" }}>
            {artist.artistName.charAt(0)}
          </div>
          <p className="flex-1 font-semibold truncate" style={{ color: "var(--silver)" }}>{artist.artistName}</p>
          <div className="flex items-center gap-2">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 60, background: "var(--border-raw)" }}>
              <div className="h-full rounded-full" style={{ width: `${Math.round(artist.affinityScore * 100)}%`, background: "var(--purple)" }} />
            </div>
            <span className="text-xs" style={{ color: "var(--muted-color)" }}>{artist.source ?? "manual"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
