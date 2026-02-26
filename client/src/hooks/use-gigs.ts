import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type GigSubmissionInput = z.infer<typeof api.gigs.submit.input>;

export function useSubmitGig() {
  return useMutation({
    mutationFn: async (data: GigSubmissionInput) => {
      const res = await fetch(api.gigs.submit.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit gig");
      }
      return res.json();
    },
  });
}
