import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/lib/context/toast-context";
import { openConversation } from "../mutations";

// Get-or-create the conversation with a friend, then jump into it.
export function useOpenConversation() {
  const router = useRouter();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (otherProfileId: string) => openConversation(otherProfileId),
    onSuccess: (conversationId) => {
      router.push(`/chat/${conversationId}` as any);
    },
    onError: (err) => {
      showToast({ message: err.message.toUpperCase(), variant: "danger" });
    },
  });

  return {
    openChat: mutation.mutate,
    isOpening: mutation.isPending,
  };
}
