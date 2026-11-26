import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { fetchMyCart } from "@/lib/commerce/queries";
import { useCanUseCart } from "@/lib/commerce/hooks/useCanUseCart";
import { queryKeys } from "@/utils/queryKeys";

// The viewer's cart, grouped by store.
export function useCart() {
  const { profile } = useAuthContext();
  const canUseCart = useCanUseCart();
  const query = useQuery({
    queryKey: queryKeys.cart(profile?.profile_id ?? ""),
    queryFn: fetchMyCart,
    enabled: canUseCart,
  });
  const itemCount = (query.data ?? []).reduce(
    (sum, group) => sum + group.items.reduce((n, item) => n + item.quantity, 0),
    0
  );
  return { ...query, itemCount };
}
