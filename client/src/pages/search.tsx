import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Search } from "lucide-react";

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");

  return (
    <Layout>
      <div className="px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--silver)" }}>
            Search
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-color)" }}>
            Find artists, venues, and people
          </p>
        </div>

        {/* Premium Search Input */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-full backdrop-blur-md"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(139,92,246,0.12))",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.03) inset, 0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <Search className="w-5 h-5" style={{ color: "var(--muted-color)" }} />

          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists, venues..."
            className="w-full bg-transparent outline-none text-base"
            style={{ color: "var(--silver)" }}
          />
        </div>

        {/* Empty state */}
        {!query && (
          <p className="text-sm" style={{ color: "var(--muted-color)" }}>
            Start typing to search...
          </p>
        )}
      </div>
    </Layout>
  );
}