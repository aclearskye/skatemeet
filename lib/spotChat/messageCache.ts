import type { InfiniteData } from "@tanstack/react-query";
import type { SpotChatMessage, SpotChatMessagePage } from "./types";

// Pure helpers for the cached, newest-first pages of a spot chat.
export type SpotChatPages = InfiniteData<SpotChatMessagePage, string | null>;

export function prependMessage(old: SpotChatPages | undefined, message: SpotChatMessage): SpotChatPages | undefined {
  if (!old) return old;
  const [first, ...rest] = old.pages;
  return { ...old, pages: [{ ...first, messages: [message, ...first.messages] }, ...rest] };
}

// Swaps (or, with null, drops) one message. Also drops a duplicate of the
// replacement, in case a refetch delivered the real row first. If a refetch
// already replaced the whole page (so messageId is gone), nothing changes.
export function replaceMessage(
  old: SpotChatPages | undefined,
  messageId: string,
  replacement: SpotChatMessage | null
): SpotChatPages | undefined {
  if (!old) return old;
  const isPresent = old.pages.some((page) => page.messages.some((m) => m.messageId === messageId));
  if (!isPresent) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      messages: page.messages.flatMap((m) => {
        if (m.messageId === messageId) return replacement ? [replacement] : [];
        if (replacement && m.messageId === replacement.messageId) return [];
        return [m];
      }),
    })),
  };
}
