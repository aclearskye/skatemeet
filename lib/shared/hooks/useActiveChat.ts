import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { setActiveChat } from "@/lib/shared/activeChat";

// Marks a chat as on screen while its screen is focused (see
// lib/shared/activeChat.ts). Pass null until the chat's id is known.
export function useActiveChat(key: string | null) {
  useFocusEffect(
    useCallback(() => {
      if (!key) return;
      setActiveChat(key);
      return () => setActiveChat(null);
    }, [key])
  );
}
