import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button, Card, Input } from "@/components/ui-elements";
import { useAdminSubmissions, useApproveSubmission, useRejectSubmission } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { ShieldAlert, Check, X, Calendar, MapPin, Building2, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Venue } from "@shared/schema";
import { api } from "@shared/routes";

const ADMIN_SECRET =
  (import.meta.env.VITE_ADMIN_SECRET as string | undefined) || "admin123";

function usePendingVenues(secret: string) {
  return useQuery<Venue[]>({
    queryKey: ["/api/admin/venues", secret],
    queryFn: async () => {
      const res = await fetch("/api/admin/venues", { headers: { "x-admin-secret": secret }, credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!secret,
  });
}

function useApproveVenue(secret: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/venues/${id}/approve`, { method: "POST", headers: { "x-admin-secret": secret }, credentials: "include" });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/venues"] }),
  });
}

function useRejectVenue(secret: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/venues/${id}/reject`, { method: "POST", headers: { "x-admin-secret": secret }, credentials: "include" });
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/venues"] }),
  });
}

export default function AdminSubmissions() {
  const { data: user, isLoading: userLoading } = useAuth();
  const [secret, setSecret] = useState("");
  const [activeSecret, setActiveSecret] = useState("");
  const [tab, setTab] = useState<"gigs" | "venues">("gigs");
  const [location, setLocation] = useLocation();
  const editEventId = new URLSearchParams(window.location.search).get("edit");
  
  console.log("editEventId", editEventId)
  const [editEventLoading, setEditEventLoading] = useState(false);

  const [form, setForm] = useState({
  name: "",
  startTime: "",
  venueId: "",
  venueName: "",
  venueLat: "",
  venueLng: "",
  ticketUrl: "",
  imageUrl: "",
  city: "",
  state: "",
});
const [createEventError, setCreateEventError] = useState("");

const [venueQuery, setVenueQuery] = useState("");
const [venueResults, setVenueResults] = useState<Venue[]>([]);
const [venueSearchLoading, setVenueSearchLoading] = useState(false);
const [adminVenueQuery, setAdminVenueQuery] = useState("");
const [adminVenueResults, setAdminVenueResults] = useState<Venue[]>([]);
const [selectedVenueId, setSelectedVenueId] = useState("");
const [venueForm, setVenueForm] = useState({
  name: "",
  address: "",
  suburb: "",
  city: "",
  state: "",
  postcode: "",
  website: "",
  instagram: "",
  contactEmail: "",
  bio: "",
  lat: "",
  lng: "",
});
const [geocodeLoading, setGeocodeLoading] = useState(false);
const [geocodeMsg, setGeocodeMsg] = useState("");

const lookupVenueCoords = async (opts?: { force?: boolean }) => {
  const force = opts?.force === true;
  if (!force && (venueForm.lat.trim() !== "" || venueForm.lng.trim() !== "")) {
    return;
  }
  const parts = [
    venueForm.address,
    venueForm.suburb,
    venueForm.city,
    venueForm.state,
    venueForm.postcode,
    "Australia",
  ]
    .map((s) => (s || "").trim())
    .filter(Boolean);
  const named = [venueForm.name, ...parts]
    .map((s) => (s || "").trim())
    .filter(Boolean);
  if (parts.length < 2 && named.length < 2) {
    if (force) setGeocodeMsg("Add an address or suburb first.");
    return;
  }
  setGeocodeLoading(true);
  setGeocodeMsg("");
  try {
    const tries = [parts.join(", "), named.join(", ")].filter(
      (q, i, a) => q && a.indexOf(q) === i
    );
    let found: { lat: string; lon: string } | null = null;
    for (const q of tries) {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          q
        )}&format=json&limit=1&countrycodes=au`,
        { headers: { "Accept-Language": "en" } }
      );
      if (!res.ok) continue;
      const data: { lat: string; lon: string }[] = await res.json();
      if (data.length > 0) {
        found = data[0];
        break;
      }
    }
    if (found) {
      setVenueForm((prev) => ({
        ...prev,
        lat: Number(found!.lat).toFixed(6),
        lng: Number(found!.lon).toFixed(6),
      }));
      setGeocodeMsg("Coordinates filled from address.");
    } else if (force) {
      setGeocodeMsg("Couldn't find a match. Enter coordinates manually.");
    }
  } catch {
    if (force) setGeocodeMsg("Lookup failed. Enter coordinates manually.");
  } finally {
    setGeocodeLoading(false);
  }
};

useEffect(() => {
  if (venueForm.lat.trim() !== "" || venueForm.lng.trim() !== "") return;
  const hasEnough =
    (venueForm.address.trim().length >= 4 ||
      venueForm.suburb.trim().length >= 3) &&
    (venueForm.city.trim().length >= 2 || venueForm.suburb.trim().length >= 3);
  if (!hasEnough) return;
  const t = setTimeout(() => {
    lookupVenueCoords();
  }, 1200);
  return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  venueForm.address,
  venueForm.suburb,
  venueForm.city,
  venueForm.state,
  venueForm.postcode,
]);

useEffect(() => {
  const runVenueSearch = async () => {
    if (venueQuery.trim().length < 2) {
      setVenueResults([]);
      return;
    }

    try {
      setVenueSearchLoading(true);

      const res = await fetch(
        `/api/venues?q=${encodeURIComponent(venueQuery.trim())}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        setVenueResults([]);
        return;
      }

      const data = await res.json();
      setVenueResults(Array.isArray(data) ? data : []);
    } catch {
      setVenueResults([]);
    } finally {
      setVenueSearchLoading(false);
    }
  };

  runVenueSearch();
}, [venueQuery]);

useEffect(() => {
  if (form.venueName && !venueQuery) {
    setVenueQuery(form.venueName);
  }
}, [form.venueName, venueQuery]);

useEffect(() => {
  const loadEditEvent = async () => {
    if (!editEventId) return;

    console.log("loading edit event", editEventId);

    try {
      setEditEventLoading(true);
      setCreateEventError("");

      const res = await fetch(`/api/events/${editEventId}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load event");
      }

      const data = await res.json();
      console.log("edit event response", data);

      const event = data?.event;

      if (!event) {
        throw new Error("Event not found");
      }

      setForm({
        name: event.name || "",
        startTime: event.startTime
          ? format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm")
          : "",
        venueId: event.venueId || "",
        venueName: event.venueName || "",
        venueLat: event.venueLat != null ? String(event.venueLat) : "",
        venueLng: event.venueLng != null ? String(event.venueLng) : "",
        ticketUrl: event.ticketUrl || "",
        imageUrl: event.imageUrl || "",
        city: event.city || "",
        state: event.state || "",
      });

      setVenueQuery(event.venueName || "");
      setVenueResults([]);
    } catch (error: any) {
      setCreateEventError(error?.message || "Failed to load event");
    } finally {
      setEditEventLoading(false);
    }
  };

  loadEditEvent();
}, [editEventId]);


useEffect(() => {
  const runAdminVenueSearch = async () => {
    if (adminVenueQuery.trim().length < 2) {
      setAdminVenueResults([]);
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/venues/all?q=${encodeURIComponent(adminVenueQuery.trim())}`,
        {
          headers: { "x-admin-secret": ADMIN_SECRET },
          credentials: "include",
        }
      );

      if (!res.ok) {
        setAdminVenueResults([]);
        return;
      }

      const data = await res.json();
      setAdminVenueResults(Array.isArray(data) ? data : []);
    } catch {
      setAdminVenueResults([]);
    }
  };

  runAdminVenueSearch();
}, [adminVenueQuery]);

const { data: submissions, isLoading: subsLoading, isError } = useAdminSubmissions(ADMIN_SECRET);
const approve = useApproveSubmission(ADMIN_SECRET);
const reject = useRejectSubmission(ADMIN_SECRET);

const { data: pendingVenues, isLoading: venuesLoading } = usePendingVenues(ADMIN_SECRET);  
const approveVenue = useApproveVenue(ADMIN_SECRET);
const rejectVenue = useRejectVenue(ADMIN_SECRET);
  const queryClient = useQueryClient();
  
  const saveVenue = useMutation({
  mutationFn: async () => {
    const payload = {
      id: selectedVenueId || undefined,
      name: venueForm.name.trim(),
      address: venueForm.address,
      suburb: venueForm.suburb,
      city: venueForm.city,
      state: venueForm.state,
      postcode: venueForm.postcode,
      website: venueForm.website,
      instagram: venueForm.instagram,
      contactEmail: venueForm.contactEmail,
      bio: venueForm.bio,
      lat:
        venueForm.lat.trim() === "" ? null : Number(venueForm.lat),
      lng:
        venueForm.lng.trim() === "" ? null : Number(venueForm.lng),
    };

    console.log("SAVE VENUE PAYLOAD", payload);

    const res = await fetch("/api/admin/venues/upsert", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": ADMIN_SECRET,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    console.log("SAVE VENUE RESPONSE", data);

    if (!res.ok) {
      throw new Error(data?.message || "Failed to save venue");
    }

    return data;
  },
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/venues/all"] });
    alert("Venue saved");
  },
});

const deleteVenue = useMutation({
  mutationFn: async () => {
    if (!selectedVenueId) return;

    const res = await fetch(`/api/admin/venues/${selectedVenueId}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "x-admin-secret": ADMIN_SECRET,
      },
    });

    if (!res.ok) {
      throw new Error("Failed to delete venue");
    }
  },
  onSuccess: async () => {
    setSelectedVenueId("");
    setAdminVenueQuery("");
    setAdminVenueResults([]);
    setVenueForm({
      name: "",
      address: "",
      suburb: "",
      city: "",
      state: "",
      postcode: "",
      website: "",
      instagram: "",
      contactEmail: "",
      bio: "",
      lat: "",
      lng: "",
    });

    await queryClient.invalidateQueries({ queryKey: ["/api/admin/venues/all"] });
    alert("Venue deleted");
  },
});


const createEvent = useMutation({
  mutationFn: async () => {
    const isEdit = !!editEventId;

    const url = isEdit
      ? `/api/admin/events/${editEventId}`
      : "/api/admin/events/create";

    const method = isEdit ? "PUT" : "POST";

    const payload = {
      ...form,
      startTime: new Date(form.startTime).toISOString(),
    };

    console.log("EVENT SAVE URL", url);
    console.log("EVENT SAVE METHOD", method);
    console.log("EVENT SAVE PAYLOAD", payload);

    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": ADMIN_SECRET,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    console.log("EVENT SAVE RESPONSE", data);

    if (!res.ok) {
      throw new Error(data?.message || "Failed to save event");
    }

    return data;
  },
  onSuccess: async () => {
    setCreateEventError("");

    await queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/events"] });

    alert(editEventId ? "Event updated" : "Event created");

    if (!editEventId) {
      setForm({
        name: "",
        startTime: "",
        venueId: "",
        venueName: "",
        venueLat: "",
        venueLng: "",
        ticketUrl: "",
        imageUrl: "",
        city: "",
        state: "",
      });
      setVenueQuery("");
      setVenueResults([]);
    }
  },
  onError: (error: any) => {
    console.error("EVENT SAVE ERROR", error);
    setCreateEventError(error?.message || "Failed to save event");
  },
});
  useEffect(() => {
    if (!userLoading && (!user || !user.email?.includes("admin"))) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

  if (userLoading) return null;
  if (!user || !user.email?.includes("admin")) return null;

  const handleSecretSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSecret(secret);
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center gap-3">
          <ShieldAlert className="text-primary" /> Admin Panel
        </h1>
        <p className="text-muted-foreground">Review gig submissions and venue verification requests.</p>
      </div>

      {false ? (
        <Card className="p-8 max-w-md mx-auto mt-12 border-primary/20">
          <form onSubmit={handleSecretSubmit} className="space-y-4">
            <div className="relative">
  <label className="block text-sm font-bold text-white mb-2">Venue Search</label>
  <Input
  value={venueQuery}
  onChange={(e) => {
    const value = e.target.value;

    setVenueQuery(value);
    setVenueForm((prev) => ({
      ...prev,
      name: value,
    }));
  }}
/>

  {venueQuery.trim().length >= 2 && (
  <div className="mt-2 rounded-xl border border-white/10 bg-[#0b1020] shadow-xl overflow-hidden">
    {venueSearchLoading ? (
      <div className="px-4 py-3 text-sm text-white/70">Searching venues...</div>
    ) : venueResults.length === 0 ? (
      <button
        type="button"
        className="w-full px-4 py-3 text-left hover:bg-white/5"
        onClick={() => {
          setForm({
            ...form,
            venueName: venueQuery,
          });
        }}
      >
        <div className="text-white font-medium">Use "{venueQuery}"</div>
        <div className="text-xs text-white/60">Create new venue</div>
      </button>
    ) : (
      venueResults.slice(0, 8).map((venue) => (
        <button
          key={venue.id}
          type="button"
          className="block w-full px-4 py-3 text-left hover:bg-white/5 border-b border-white/5 last:border-b-0"
          onClick={() => {
            setVenueQuery(venue.name);
            setForm({
              ...form,
              venueName: venue.name || "",
              city: venue.city || "",
              state: venue.state || "",
            });
            
          }}
        >
          <div className="font-medium text-white">{venue.name}</div>
          <div className="text-xs text-white/60">
            {[venue.suburb, venue.city, venue.state].filter(Boolean).join(", ")}
          </div>
        </button>
      ))
    )}
  </div>
)}
</div>
            <Button type="submit" className="w-full">Authenticate</Button>
            {isError && <p className="text-destructive text-sm text-center">Invalid secret. Try again.</p>}
          </form>
        </Card>
      ) : (
        <>
        <Card className="p-6 mb-6 border-primary/20">
  <div className="space-y-4">
    <div className="flex items-start justify-between gap-4">
  <div>
    <h2 className="text-xl font-bold text-white">Manage Venues</h2>
    <p className="text-sm text-muted-foreground">
      Search and edit existing venues or create new ones.
    </p>
  </div>

  <Button
    type="button"
    onClick={() => {
      setSelectedVenueId("");
      setAdminVenueQuery("");
      setAdminVenueResults([]);
      setVenueForm({
        name: "",
        address: "",
        suburb: "",
        city: "",
        state: "",
        postcode: "",
        website: "",
        instagram: "",
        contactEmail: "",
        bio: "",
        lat: "",
        lng: "",
      });
    }}
  >
    New Venue
  </Button>
</div>

    <Input
      value={adminVenueQuery}
      onChange={(e) => setAdminVenueQuery(e.target.value)}
      placeholder="Search venues..."
    />

    {adminVenueQuery.trim().length >= 2 && (
  <div className="rounded-xl border border-white/10 bg-[#0b1020] overflow-hidden">
    {adminVenueResults.length === 0 ? (
      <div className="px-4 py-3 text-sm text-white/70">
        No venues found
      </div>
    ) : (
      adminVenueResults.map((venue) => (
        <button
          key={venue.id}
          type="button"
          className="block w-full px-4 py-3 text-left border-b border-white/5 last:border-b-0 hover:bg-white/5"
          onClick={() => {
            setSelectedVenueId(venue.id);
            setVenueForm({
              name: venue.name || "",
              address: venue.address || "",
              suburb: venue.suburb || "",
              city: venue.city || "",
              state: venue.state || "",
              postcode: venue.postcode || "",
              website: venue.website || "",
              instagram: venue.instagram || "",
              contactEmail: venue.contactEmail || "",
              bio: venue.bio || "",
              lat: venue.lat != null ? String(venue.lat) : "",
              lng: venue.lng != null ? String(venue.lng) : "",
            });
          }}
        >
          <div className="font-medium text-white">{venue.name}</div>
          <div className="text-xs text-white/60">
            {[venue.suburb, venue.city, venue.state].filter(Boolean).join(", ")}
          </div>
        </button>
      ))
    )}
  </div>
)}

<div className="relative">
  <label className="block text-sm font-bold text-white mb-2">Venue Name</label>
  <Input
    value={venueForm.name}
    onChange={(e) => {
      const value = e.target.value;
      setVenueForm({
        ...venueForm,
        name: value,
      });
    }}
    placeholder="Venue name"
  />
</div>

  <div>
    <label className="block text-sm font-bold text-white mb-2">Address</label>
    <Input
      value={venueForm.address}
      onChange={(e) => setVenueForm({ ...venueForm, address: e.target.value })}
      placeholder="Street address"
    />
  </div>

  <div>
    <label className="block text-sm font-bold text-white mb-2">Suburb</label>
    <Input
      value={venueForm.suburb}
      onChange={(e) => setVenueForm({ ...venueForm, suburb: e.target.value })}
      placeholder="Suburb"
    />
  </div>

  <div>
    <label className="block text-sm font-bold text-white mb-2">City</label>
    <Input
      value={venueForm.city}
      onChange={(e) => setVenueForm({ ...venueForm, city: e.target.value })}
      placeholder="City"
    />
  </div>

  <div>
    <label className="block text-sm font-bold text-white mb-2">State</label>
    <Input
      value={venueForm.state}
      onChange={(e) => setVenueForm({ ...venueForm, state: e.target.value })}
      placeholder="State"
    />
  </div>

  <div>
    <label className="block text-sm font-bold text-white mb-2">Postcode</label>
    <Input
      value={venueForm.postcode}
      onChange={(e) => setVenueForm({ ...venueForm, postcode: e.target.value })}
      placeholder="Postcode"
    />
  </div>

  <div>
    <label className="block text-sm font-bold text-white mb-2">Website</label>
    <Input
      value={venueForm.website}
      onChange={(e) => setVenueForm({ ...venueForm, website: e.target.value })}
      placeholder="https://..."
    />
  </div>

  <div>
    <label className="block text-sm font-bold text-white mb-2">Instagram</label>
    <Input
      value={venueForm.instagram}
      onChange={(e) => setVenueForm({ ...venueForm, instagram: e.target.value })}
      placeholder="@venue"
    />
  </div>

  <div>
    <label className="block text-sm font-bold text-white mb-2">Contact Email</label>
    <Input
      value={venueForm.contactEmail}
      onChange={(e) => setVenueForm({ ...venueForm, contactEmail: e.target.value })}
      placeholder="email@example.com"
    />
  </div>

  <div>
    <label className="block text-sm font-bold text-white mb-2">Latitude</label>
    <Input
      value={venueForm.lat}
      onChange={(e) => {
        setVenueForm({ ...venueForm, lat: e.target.value });
        if (geocodeMsg) setGeocodeMsg("");
      }}
      placeholder={geocodeLoading ? "Looking up..." : "-26.798"}
      disabled={geocodeLoading}
    />
  </div>

  <div>
    <label className="block text-sm font-bold text-white mb-2">Longitude</label>
    <Input
      value={venueForm.lng}
      onChange={(e) => {
        setVenueForm({ ...venueForm, lng: e.target.value });
        if (geocodeMsg) setGeocodeMsg("");
      }}
      placeholder={geocodeLoading ? "Looking up..." : "153.1364"}
      disabled={geocodeLoading}
    />
  </div>

  <div className="md:col-span-2 -mt-2 flex flex-wrap items-center gap-3">
    <Button
      variant="outline"
      onClick={() => lookupVenueCoords({ force: true })}
      disabled={geocodeLoading}
      data-testid="button-lookup-venue-coords"
    >
      {geocodeLoading ? "Looking up..." : "Look up coordinates from address"}
    </Button>
    {(venueForm.lat || venueForm.lng) && !geocodeLoading && (
      <Button
        variant="outline"
        onClick={() => {
          setVenueForm({ ...venueForm, lat: "", lng: "" });
          setGeocodeMsg("");
        }}
        data-testid="button-clear-venue-coords"
      >
        Clear coordinates
      </Button>
    )}
    {geocodeMsg && (
      <span
        className="text-xs text-muted-foreground"
        data-testid="text-geocode-msg"
      >
        {geocodeMsg}
      </span>
    )}
  </div>

      <div className="md:col-span-2">
    <label className="block text-sm font-bold text-white mb-2">Bio</label>
    <Input
      value={venueForm.bio}
      onChange={(e) => setVenueForm({ ...venueForm, bio: e.target.value })}
      placeholder="Venue bio"
    />
  </div>

 
  <div className="md:col-span-2 pt-2">
    <div className="flex gap-2">
      <Button
        onClick={() => saveVenue.mutate()}
        disabled={saveVenue.isPending || !venueForm.name}
      >
        {saveVenue.isPending ? "Saving..." : "Save Venue"}
      </Button>

      {selectedVenueId && (
        <Button
          variant="danger"
          onClick={() => deleteVenue.mutate()}
          disabled={deleteVenue.isPending}
        >
          {deleteVenue.isPending ? "Deleting..." : "Delete"}
        </Button>
      )}
    </div>
  </div>
</div>

  
</Card>

<Card className="p-6 mb-6 border-primary/20">
  <div className="space-y-4">
    <div>
      <h2 className="text-xl font-bold text-white">Create Event</h2>
      <p className="text-sm text-muted-foreground">
        Add gigs directly into GigLoop for manual seeding.
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="block text-sm font-bold text-white mb-2">Event Name</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Band / Event name"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-2">Start Time</label>
        <Input
          type="datetime-local"
          value={form.startTime}
          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
        />
      </div>

    <div className="relative">
  <label className="block text-sm font-bold text-white mb-2">Venue Name</label>
  <Input
    value={venueQuery}
    onChange={(e) => {
      const value = e.target.value;
      setVenueQuery(value);
      setForm({
        ...form,
        venueId: "",
        venueName: value,
        venueLat: "",
        venueLng: "",
        city: "",
        state: "",
      });
    }}
    placeholder="Search venue name"
  />

  {venueQuery.trim().length >= 2 && (
    <div className="mt-2 rounded-xl border border-white/10 bg-[#0b1020] shadow-xl overflow-hidden">
      {venueSearchLoading ? (
        <div className="px-4 py-3 text-sm text-white/70">Searching venues...</div>
      ) : venueResults.length === 0 ? (
        <button
          type="button"
          className="w-full px-4 py-3 text-left hover:bg-white/5"
          onClick={() => {
            setForm({
              ...form,
              venueId: "",
              venueName: venueQuery.trim(),
              venueLat: "",
              venueLng: "",
            });
          }}
        >
          <div className="text-white font-medium">Use "{venueQuery}"</div>
          <div className="text-xs text-white/60">No linked venue selected</div>
        </button>
      ) : (
        venueResults.slice(0, 8).map((venue) => (
          <button
            key={venue.id}
            type="button"
            className="block w-full px-4 py-3 text-left hover:bg-white/5 border-b border-white/5 last:border-b-0"
            onClick={() => {
              setVenueQuery(venue.name || "");
              setVenueResults([]);
              setForm({
                ...form,
                venueId: venue.id,
                venueName: venue.name || "",
                venueLat: venue.lat != null ? String(venue.lat) : "",
                venueLng: venue.lng != null ? String(venue.lng) : "",
                city: venue.city || "",
                state: venue.state || "",
              });
            }}
          >
            <div className="font-medium text-white">{venue.name}</div>
            <div className="text-xs text-white/60">
              {[venue.suburb, venue.city, venue.state].filter(Boolean).join(", ")}
            </div>
          </button>
        ))
      )}
    </div>
  )}
</div>

      <div>
        <label className="block text-sm font-bold text-white mb-2">Ticket URL</label>
        <Input
          value={form.ticketUrl}
          onChange={(e) => setForm({ ...form, ticketUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-2">Image URL</label>
        <Input
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-2">City</label>
        <Input
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          placeholder="Brisbane"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-2">State</label>
        <Input
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
          placeholder="QLD"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Venue Latitude
        </label>
        <Input
          value={form.venueLat}
          onChange={(e) => setForm({ ...form, venueLat: e.target.value })}
          placeholder="-27.4698"
        />
        <p className="text-xs text-white/50 mt-1">
          Auto-fills from selected venue. Edit if missing or wrong.
        </p>
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Venue Longitude
        </label>
        <Input
          value={form.venueLng}
          onChange={(e) => setForm({ ...form, venueLng: e.target.value })}
          placeholder="153.0251"
        />
        <p className="text-xs text-white/50 mt-1">
          Auto-fills from selected venue. Edit if missing or wrong.
        </p>
      </div>
    </div>

    <div className="pt-2">
      <Button
  onClick={() => createEvent.mutate()}
  disabled={
  createEvent.isPending ||
  !form.name ||
  !form.startTime ||
  !form.venueName ||
  (!editEventId && !form.venueLat) ||
  (!editEventId && !form.venueLng)
}
  className="w-full md:w-auto"
>
        {createEvent.isPending
  ? editEventId
    ? "Updating..."
    : "Creating..."
  : editEventId
  ? "Update Event"
  : "Create Event"}
      </Button>
      {createEventError && (
  <p className="text-sm text-red-400 mt-2">
    {createEventError}
  </p>
)}
    </div>
  </div>
</Card>

<div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("gigs")}
              data-testid="tab-gigs"
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${tab === "gigs" ? "bg-primary text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
            >
              <Calendar className="w-4 h-4" />
              Gig Submissions
              {(submissions?.filter(s => s.status === "pending").length ?? 0) > 0 && (
                <span className="bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {submissions?.filter(s => s.status === "pending").length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("venues")}
              data-testid="tab-venues"
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${tab === "venues" ? "bg-primary text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
            >
              <Building2 className="w-4 h-4" />
              Venue Verification
              {(pendingVenues?.length ?? 0) > 0 && (
                <span className="bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingVenues?.length}
                </span>
              )}
            </button>
            <div className="ml-auto">
              
            </div>
          </div>

          {/* Gig submissions tab */}
          {tab === "gigs" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">
                Pending Submissions ({submissions?.filter(s => s.status === "pending").length || 0})
              </h2>

              {subsLoading ? (
                <div className="text-center py-12 text-white">Loading...</div>
              ) : submissions?.filter(s => s.status === "pending").length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 text-muted-foreground">
                  All caught up! No pending submissions.
                </div>
              ) : (
                <div className="grid gap-4">
                  {submissions?.filter(s => s.status === "pending").map(sub => (
                    <Card key={sub.id} className="p-6 flex flex-col md:flex-row gap-6 justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-yellow-500/20 text-yellow-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Pending</span>
                          <span className="text-xs text-muted-foreground">
                            {sub.submitterName || "Anonymous"} ({sub.submitterEmail || "N/A"})
                          </span>
                        </div>
                        <h3 className="text-2xl font-extrabold text-white">{sub.eventName}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                          <div className="flex items-center gap-1.5 text-white/80">
                            <MapPin className="w-4 h-4 text-primary" />{sub.venueName || "Unknown Venue"}
                          </div>
                          <div className="flex items-center gap-1.5 text-white/80">
                            <Calendar className="w-4 h-4 text-primary" />{format(new Date(sub.startTime), "MMM do, h:mm a")}
                          </div>
                        </div>
                        <div className="pt-2">
                          <strong className="text-xs text-white/60 uppercase tracking-wider block mb-1">Artists:</strong>
                          <p className="text-white font-medium">{sub.artists}</p>
                        </div>
                        {sub.notes && (
                          <div className="bg-black/30 p-3 rounded-lg border border-white/5 mt-2 text-sm text-white/70">
                            "{sub.notes}"
                          </div>
                        )}
                      </div>
                      <div className="flex md:flex-col gap-2 shrink-0 justify-center">
                        <Button variant="primary" onClick={() => approve.mutate(sub.id)} disabled={approve.isPending || reject.isPending}>
                          <Check className="w-4 h-4" /> Approve
                        </Button>
                        <Button variant="danger" onClick={() => reject.mutate(sub.id)} disabled={approve.isPending || reject.isPending}>
                          <X className="w-4 h-4" /> Reject
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Venues tab */}
          {tab === "venues" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">
                Pending Venue Verifications ({pendingVenues?.length || 0})
              </h2>

              {venuesLoading ? (
                <div className="text-center py-12 text-white">Loading...</div>
              ) : !pendingVenues?.length ? (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 text-muted-foreground">
                  No pending venue applications.
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingVenues.map(venue => (
                    <Card key={venue.id} className="p-6 flex flex-col md:flex-row gap-6 justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-yellow-500/20 text-yellow-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        </div>
                        <h3 className="text-2xl font-extrabold text-white flex items-center gap-2">
                          <Building2 className="w-6 h-6 text-primary" />
                          {venue.name}
                        </h3>
                        <div className="flex flex-wrap gap-4 text-sm text-white/70 pt-1">
                          {venue.suburb && <span><MapPin className="w-3 h-3 inline mr-1 text-primary" />{venue.suburb}, {venue.city} {venue.state}</span>}
                          {venue.contactEmail && <span>✉ {venue.contactEmail}</span>}
                          {venue.website && <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">🌐 {venue.website}</a>}
                          {venue.instagram && <span>📸 {venue.instagram}</span>}
                        </div>
                        {venue.bio && (
                          <div className="bg-black/30 p-3 rounded-lg border border-white/5 mt-2 text-sm text-white/70 max-w-xl">
                            {venue.bio}
                          </div>
                        )}
                      </div>
                      <div className="flex md:flex-col gap-2 shrink-0 justify-center">
                        <Button variant="primary" onClick={() => approveVenue.mutate(venue.id)} disabled={approveVenue.isPending || rejectVenue.isPending}>
                          <CheckCircle className="w-4 h-4" /> Approve
                        </Button>
                        <Button variant="danger" onClick={() => rejectVenue.mutate(venue.id)} disabled={approveVenue.isPending || rejectVenue.isPending}>
                          <X className="w-4 h-4" /> Reject
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
