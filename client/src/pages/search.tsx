import { Search } from "lucide-react";
import { useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-4">
        Search
      </h1>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-3 text-zinc-500" size={18} />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search venues, artists, users..."
          className="
            w-full pl-10 pr-4 py-3
            bg-[#0b0f1a]
            border border-white/5
            rounded-xl
            text-white
            placeholder:text-zinc-500
            focus:outline-none
            focus:ring-2 focus:ring-purple-500/50
          "
        />
      </div>
    </div>
  );
}