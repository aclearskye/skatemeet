import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { redeemTicket } from "@/lib/tickets/scanMutations";
import { parseTicketQr, type ScanResult } from "@/lib/tickets/scanTypes";
import { queryKeys } from "@/utils/queryKeys";

// Scans a QR code in at the store: anything that isn't a SkateMeet ticket
// is refused without a server call. Refreshes the check-in list after.
export function useRedeemTicket() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();

  return useMutation({
    mutationFn: async (qrData: string): Promise<ScanResult> => {
      const token = parseTicketQr(qrData);
      if (!token) {
        return { outcome: "refused", reason: "NOT_A_TICKET", ticket: null, skater: null, waiver: null, checkedInAt: null };
      }
      return redeemTicket(token);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.storeCheckinsBase(profile?.profile_id ?? "") }),
  });
}
