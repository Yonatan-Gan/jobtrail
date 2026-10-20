import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The default is 3 retries with backoff, which delays error messages by ~7 seconds.
      retry: 1,
      // Data stays "fresh" for 30 s, so moving between pages doesn't refetch everything.
      staleTime: 30_000,
    },
  },
});
