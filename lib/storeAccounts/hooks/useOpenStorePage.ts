import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { fetchOsmStoresByIds, fetchUserStoresByIds } from "@/lib/stores/queries";
import type { StoreRef } from "@/lib/storeAccounts/types";

// Opens store-detail from just a store's ids. store-detail takes the whole
// entity as a route param, so this fetches it first.
export function useOpenStorePage() {
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);

  const openStorePage = useCallback(
    async (ref: StoreRef, options: { replace?: boolean } = {}) => {
      setIsOpening(true);
      try {
        const [kind, entity] = ref.storeId
          ? (["user-store", (await fetchUserStoresByIds([ref.storeId]))[0]] as const)
          : (["osm-store", (await fetchOsmStoresByIds([ref.osmPlaceId!]))[0]] as const);
        if (!entity) return false;
        const route = { pathname: "/store-detail" as const, params: { kind, data: JSON.stringify(entity) } };
        if (options.replace) router.replace(route);
        else router.push(route);
        return true;
      } finally {
        setIsOpening(false);
      }
    },
    [router]
  );

  return { openStorePage, isOpening };
}
