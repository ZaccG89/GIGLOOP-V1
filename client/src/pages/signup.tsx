import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          displayName,
          username,
          email,
          password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Signup failed");
      }

      window.location.href = "/profile";
    } catch (err: any) {
      toast({
        title: "Signup failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSignup}
        className="bg-card border border-border p-8 rounded-2xl w-full max-w-md flex flex-col gap-4"
      >
        <h2 className="text-2xl font-bold text-white text-center">
          Create Profile
        </h2>

        <input
          placeholder="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="p-3 rounded-lg bg-black/30 border border-border"
        />

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="p-3 rounded-lg bg-black/30 border border-border"
        />

        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="p-3 rounded-lg bg-black/30 border border-border"
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="p-3 rounded-lg bg-black/30 border border-border"
        />

        <button
          type="submit"
          disabled={loading}
          className="g-btn-primary py-3 rounded-xl font-bold"
        >
          {loading ? "Creating..." : "Create Profile"}
        </button>

        <button
          type="button"
          onClick={() => setLocation("/login")}
          className="text-sm text-muted-foreground"
        >
          Already have an account? Log in
        </button>
      </form>
    </div>
  );
}