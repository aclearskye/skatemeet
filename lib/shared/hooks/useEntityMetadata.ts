import { UpsertMetadataPayload } from "@/lib/shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type EntityMetadataAdapter<TMetadata> = {
  fetchMetadata: (id: string | null, osmId: string | null) => Promise<TMetadata | null>;
  upsertMetadata: (
    id: string | null,
    osmId: string | null,
    payload: UpsertMetadataPayload
  ) => Promise<TMetadata>;
};

export function useEntityMetadata<TMetadata>(
  id: string | null,
  osmId: string | null,
  adapter: EntityMetadataAdapter<TMetadata>,
  queryKeyBase: readonly unknown[]
) {
  const queryClient = useQueryClient();

  const { data: metadata = null, isLoading } = useQuery({
    queryKey: queryKeyBase,
    queryFn: () => adapter.fetchMetadata(id, osmId),
    enabled: !!id || !!osmId,
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: UpsertMetadataPayload) => adapter.upsertMetadata(id, osmId, payload),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeyBase, result);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyBase });
    },
  });

  return {
    metadata,
    isLoading,
    upsertMetadata: upsertMutation.mutateAsync,
    isSaving: upsertMutation.isPending,
  };
}
