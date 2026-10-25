import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./endpoints";
import type { ApplicationFilters } from "./types";

// Every query key starts with the resource name. That makes invalidation simple:
// invalidateQueries({ queryKey: ["applications"] }) refreshes the list, every detail
// page and every history at once.
export const queryKeys = {
  applications: ["applications"] as const,
  applicationList: (filters: ApplicationFilters) =>
    ["applications", "list", filters] as const,
  application: (id: number) => ["applications", "detail", id] as const,
  history: (id: number) => ["applications", "history", id] as const,
  companies: ["companies"] as const,
  statusTransitions: ["meta", "status-transitions"] as const,
  stats: ["stats"] as const,
};

export function useApplications(filters: ApplicationFilters = {}) {
  return useQuery({
    queryKey: queryKeys.applicationList(filters),
    queryFn: () => api.listApplications(filters),
  });
}

export function useApplication(id: number) {
  return useQuery({
    queryKey: queryKeys.application(id),
    queryFn: () => api.getApplication(id),
  });
}

export function useStatusHistory(id: number) {
  return useQuery({
    queryKey: queryKeys.history(id),
    queryFn: () => api.history(id),
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies,
    queryFn: api.listCompanies,
  });
}

export function useStatusTransitions() {
  return useQuery({
    queryKey: queryKeys.statusTransitions,
    queryFn: api.statusTransitions,
    // The rules only change when the backend is redeployed.
    staleTime: Infinity,
  });
}

export function useStats() {
  return useQuery({ queryKey: queryKeys.stats, queryFn: api.stats });
}

/**
 * After an application changes (status, edit, delete, import), refresh everything that
 * shows applications: the list, the detail page, the history and the stats.
 */
export function useRefreshApplications() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.applications }),
      queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
    ]);
}
