import { searchProfiles } from "@/lib/admin/queries";
import { useMutation } from "@tanstack/react-query";

// Search-on-submit rather than a live query keyed on input text — this is an
// admin utility screen, not a typeahead, and admin_search_profiles is
// admin-gated so there's no reason to fire it on every keystroke.
export function useProfileSearch() {
  const mutation = useMutation({ mutationFn: searchProfiles });

  return {
    results: mutation.data ?? [],
    search: mutation.mutate,
    isSearching: mutation.isPending,
    error: mutation.error,
  };
}
