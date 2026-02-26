import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { GigSubmission } from "@shared/schema";

export function useAdminSubmissions(secret: string) {
  return useQuery<GigSubmission[]>({
    queryKey: [api.admin.submissions.path],
    queryFn: async () => {
      const res = await fetch(api.admin.submissions.path, {
        headers: { "x-admin-secret": secret },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch submissions. Check your secret.");
      return res.json();
    },
    enabled: !!secret,
  });
}

export function useApproveSubmission(secret: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.admin.approve.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "x-admin-secret": secret },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to approve submission");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.submissions.path] });
    },
  });
}

export function useRejectSubmission(secret: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.admin.reject.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "x-admin-secret": secret },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reject submission");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.submissions.path] });
    },
  });
}
