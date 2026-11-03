import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { fetchMyBlocks } from "../queries";

export function useMyBlocks() {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;

  return useQuery({
    queryKey: queryKeys.myBlocks(viewerId ?? ""),
    queryFn: fetchMyBlocks,
    enabled: viewerId != null,
  });
}
