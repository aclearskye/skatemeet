import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { addToCart, clearStoreCart, createCheckout, setCartItemQuantity } from "@/lib/commerce/mutations";
import type { AddToCartPayload } from "@/lib/commerce/types";
import { hostedPageReturnUrl, openHostedPage } from "@/lib/shared/openHostedPage";
import { queryKeys } from "@/utils/queryKeys";

// Every cart write, each refreshing the cart afterwards.
export function useCartActions() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.cart(profile?.profile_id ?? "") });

  const add = useMutation({ mutationFn: (payload: AddToCartPayload) => addToCart(payload), onSuccess: refresh });
  const setQuantity = useMutation({
    mutationFn: ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) =>
      setCartItemQuantity(cartItemId, quantity),
    onSettled: refresh,
  });
  const clearStore = useMutation({ mutationFn: clearStoreCart, onSettled: refresh });
  // Opens the store's own checkout (Shopify or WooCommerce). Payment never
  // passes through SkateMeet.
  const checkout = useMutation({
    mutationFn: async (storeOwnerId: string) => {
      const url = await createCheckout(storeOwnerId);
      await openHostedPage(url, hostedPageReturnUrl(), { newTab: true });
    },
  });

  return { add, setQuantity, clearStore, checkout };
}
