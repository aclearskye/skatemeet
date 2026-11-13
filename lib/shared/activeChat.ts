// Which chat is on screen right now, so incoming-message banners skip it.
// Module state rather than React state: it's read from realtime callbacks,
// and nothing needs to re-render when it changes.

let activeChat: string | null = null;

export function dmChatKey(conversationId: string): string {
  return `dm:${conversationId}`;
}

export function spotChatRoomKey(roomId: string): string {
  return `spot:${roomId}`;
}

export function setActiveChat(key: string | null): void {
  activeChat = key;
}

export function isActiveChat(key: string): boolean {
  return activeChat === key;
}
