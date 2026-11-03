import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { fetchBlockStatus } from "../queries";

export function useBlockStatus(otherProfileId: string | null) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;

  const { data: isBlocked = false } = useQuery({
    queryKey: queryKeys.blockStatus(viewerId ?? "", otherProfileId ?? ""),
    queryFn: () => fetchBlockStatus(viewerId!, otherProfileId!),
    enabled: viewerId != null && otherProfileId != null && viewerId !== otherProfileId,
  });

  return isBlocked;
}
