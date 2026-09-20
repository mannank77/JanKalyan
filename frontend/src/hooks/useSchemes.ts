import { useQuery } from "@tanstack/react-query";
import { fetchSchemes, type SchemeFilters, type SchemesResponse } from "@/lib/api";

/**
 * React-Query wrapper around GET /schemes.
 * Automatically refetches when filter values change.
 */
export function useSchemes(filters: SchemeFilters = {}) {
  return useQuery<SchemesResponse>({
    queryKey: ["schemes", filters],
    queryFn: () => fetchSchemes(filters),
    staleTime: 60_000,        // cache for 1 min (backend sets Cache-Control: max-age=60)
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
