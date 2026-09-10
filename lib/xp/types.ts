// Extend this union when a new XP-earning feature ships — no migration
// needed, the `source` column is TEXT (see supabase/migrations/20260911_xp_system.sql).
//
// There's no client-side mutation wrapper for awarding XP: award_xp() is not
// granted to `authenticated` (it can credit a profile other than the caller,
// so it must only run inside a server-side SECURITY DEFINER function that has
// already validated the action). A future feature's own RPC — e.g. a
// check-in or vote-cast function — calls `award_xp(...)` directly from its
// own PL/pgSQL body; that's the real integration seam, not a JS function here.
//
// Whenever a future feature's own RPC awards XP, its client-side mutation
// should also call useToast().showToast(...) (lib/context/toast-context.tsx)
// from its onSuccess, using the amount/level its RPC returns — the toast
// system is generic on purpose (see components/ui/ToastHost), so no changes
// are needed here to plug a new source into it.
export type XpSource =
  | "account_created"
  | "checkin"
  | "clip_upload"
  | "upvote_received"
  | "challenge";

export type XpLevel = {
  level: number;
  xpRequired: number;
  title: string;
};

export type UserXpState = {
  xpTotal: number;
  currentLevel: number;
  levelTitle: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  isMaxLevel: boolean;
};

export function computeLevelProgress(xpTotal: number, levels: XpLevel[]): UserXpState {
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  const currentIndex = sorted.reduce(
    (best, level, index) => (level.xpRequired <= xpTotal ? index : best),
    0
  );
  const current = sorted[currentIndex];
  const next = sorted[currentIndex + 1];

  return {
    xpTotal,
    currentLevel: current.level,
    levelTitle: current.title,
    xpIntoLevel: xpTotal - current.xpRequired,
    xpForNextLevel: next ? next.xpRequired - current.xpRequired : xpTotal - current.xpRequired,
    isMaxLevel: !next,
  };
}
