import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui-elements";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Building2, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import type { Venue } from "@shared/schema";

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: "Pending Review",
    desc: "Your application is being reviewed. We'll notify you once it's approved.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/30",
  },
  approved: {
    icon: CheckCircle,
    label: "Verified Venue",
    desc: "Your venue is verified. You can now submit gigs from your venue detail page.",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/30",
  },
  rejected: {
    icon: XCircle,
    label: "Application Rejected",
    desc: "Your application was not approved. You may update your details and reapply.",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
  },
};

export default function VenueRegister() {
  const { data: user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: existing, isLoading } = useQuery<Venue>({
    queryKey: ["/api/venue/my-profile"],
    retry: false,
  });

  const [form, setForm] = useState({
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
  });

  const register = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/venue/register", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venue/my-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Application submitted! We'll review your venue shortly." });
    },
    onError: () => toast({ title: "Registration failed. Please try again.", variant: "destructive" }),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(form);
  };

  if (!user) return null;
  if (isLoading) return null;

  const status = existing?.verificationStatus as keyof typeof STATUS_CONFIG | undefined;
  const statusCfg = status && STATUS_CONFIG[status];

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">Venue Registration</h1>
        </div>
        <p className="text-muted-foreground">
          Register your venue to start posting gigs directly to Giggity.
        </p>
      </div>

      {/* Status banner for existing applicants */}
      {statusCfg && (
        <div className={`flex items-start gap-4 p-5 rounded-2xl border mb-6 ${statusCfg.bg}`}>
          <statusCfg.icon className={`w-6 h-6 mt-0.5 shrink-0 ${statusCfg.color}`} />
          <div>
            <p className={`font-bold ${statusCfg.color}`}>{statusCfg.label}</p>
            <p className="text-sm text-white/70 mt-1">{statusCfg.desc}</p>
          </div>
        </div>
      )}

      {/* Show form if not pending/approved, or if rejected so they can reapply */}
      {(!existing || status === "rejected" || status === "unverified") && (
        <Card className="p-6 md:p-8">
          <h2 className="text-xl font-bold text-white mb-6">Venue Details</h2>
          <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Venue Name *</label>
                <input
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. The Triffid"
                  data-testid="input-venue-name"
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Street Address</label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="123 Ann Street"
                  data-testid="input-venue-address"
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Suburb</label>
                <input name="suburb" value={form.suburb} onChange={handleChange} placeholder="Newstead"
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm outline-none focus:border-primary/50 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">City</label>
                <input name="city" value={form.city} onChange={handleChange} placeholder="Brisbane"
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm outline-none focus:border-primary/50 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">State</label>
                <input name="state" value={form.state} onChange={handleChange} placeholder="QLD"
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm outline-none focus:border-primary/50 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Postcode</label>
                <input name="postcode" value={form.postcode} onChange={handleChange} placeholder="4006"
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm outline-none focus:border-primary/50 transition-colors" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Contact Email *</label>
                <input name="contactEmail" type="email" required value={form.contactEmail} onChange={handleChange}
                  placeholder="gigs@myvenue.com.au" data-testid="input-venue-email"
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm outline-none focus:border-primary/50 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Website</label>
                <input name="website" type="url" value={form.website} onChange={handleChange}
                  placeholder="https://myvenue.com.au"
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm outline-none focus:border-primary/50 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Instagram</label>
                <input name="instagram" value={form.instagram} onChange={handleChange} placeholder="@myvenue"
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm outline-none focus:border-primary/50 transition-colors" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-white/80 mb-1.5">About the Venue</label>
                <textarea name="bio" value={form.bio} onChange={handleChange}
                  placeholder="Tell us about your venue — capacity, vibe, what kind of music you host..."
                  rows={4}
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm outline-none focus:border-primary/50 transition-colors resize-none" />
              </div>
            </div>

            <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-white/70">
                Your application will be reviewed within 1–2 business days. Once approved, you'll be able to post gigs directly from your venue's page.
              </p>
            </div>

            <button
              type="submit"
              disabled={register.isPending}
              data-testid="button-submit-venue-registration"
              className="g-btn-primary px-8 py-3 rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {register.isPending ? "Submitting…" : "Submit for Verification"}
            </button>
          </form>
        </Card>
      )}

      {/* Show venue info card if pending or approved */}
      {existing && status && ["pending", "approved"].includes(status) && (
        <Card className="p-6 md:p-8 mt-6">
          <h2 className="text-lg font-bold text-white mb-4">Your Venue Profile</h2>
          <div className="space-y-2 text-sm text-white/70">
            <p><span className="text-white font-semibold">{existing.name}</span></p>
            {existing.suburb && <p>{existing.suburb}, {existing.city} {existing.state}</p>}
            {existing.contactEmail && <p>{existing.contactEmail}</p>}
            {existing.website && <a href={existing.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{existing.website}</a>}
          </div>
          {status === "rejected" && (
            <button
              onClick={() => queryClient.setQueryData(["/api/venue/my-profile"], null)}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Update details and reapply →
            </button>
          )}
        </Card>
      )}
    </Layout>
  );
}
