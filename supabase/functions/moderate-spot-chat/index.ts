import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Second moderation layer for spot chats (supabase/migrations/20261110120000_spot_chats.sql).
//
// The database calls this through pg_net (_request_spot_chat_scan) for
// every new spot chat message, with the same x-moderation-secret header as
// moderate-post. By then the deterministic filter (slurs, phone numbers,
// emails, handles, links) has already run in send_spot_chat_message; this
// scan catches what keyword lists miss -- hate, sexual content, threats,
// self-harm and extremism -- and obfuscated contact details.
//
// A hit calls moderation_hold_spot_chat_message, which hides the message
// from everyone but its sender and opens a 'scan' report for admins. Any
// vendor error leaves the message visible: it has already passed the
// filter, and members can still report it.
//
// Deployed with verify_jwt = false because the database caller has no JWT;
// the shared secret authenticates every request instead.

const SIGHTENGINE = "https://api.sightengine.com/1.0";

// Hold thresholds for the Sightengine "general" ML model.
const ML_THRESHOLDS: Record<string, { score: number; reason: string }> = {
  sexual: { score: 0.8, reason: "sexual" },
  discriminatory: { score: 0.75, reason: "hate_speech" },
  violent: { score: 0.8, reason: "threat" },
  "self-harm": { score: 0.6, reason: "self_harm" },
};

type Match = { type?: string; intensity?: string };
type Hold = { reason: string; scores: unknown } | null;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function sightengine(text: string, fields: Record<string, string>) {
  const user = Deno.env.get("SIGHTENGINE_API_USER");
  const secret = Deno.env.get("SIGHTENGINE_API_SECRET");
  if (!user || !secret) return null;

  const form = new FormData();
  for (const [k, v] of Object.entries({ text, lang: "en", api_user: user, api_secret: secret, ...fields })) {
    form.append(k, v);
  }
  const res = await fetch(`${SIGHTENGINE}/text/check.json`, { method: "POST", body: form });
  const body = await res.json().catch(() => null);
  return res.ok && body?.status === "success" ? body : null;
}

async function scan(text: string): Promise<Hold | "error"> {
  const listId = Deno.env.get("SIGHTENGINE_TEXT_LIST_ID");
  const [rules, ml] = await Promise.all([
    sightengine(text, {
      mode: "rules",
      categories: "profanity,personal,extremism,violence,self-harm",
      ...(listId ? { list: listId } : {}),
    }),
    sightengine(text, { mode: "ml", models: "general" }),
  ]);
  if (!rules || !ml) return "error";

  const scores = { rules, ml };
  const matches = (key: string): Match[] => rules[key]?.matches ?? [];

  if (matches("profanity").some((m) => m.type === "discriminatory") || matches("blacklist").length > 0) {
    return { reason: "slur", scores };
  }
  if (matches("extremism").length > 0) return { reason: "extremism", scores };
  if (matches("self-harm").length > 0) return { reason: "self_harm", scores };
  if (matches("violence").length > 0) return { reason: "threat", scores };
  // Phone numbers, emails, addresses and social handles the filter missed.
  if (matches("personal").length > 0) return { reason: "personal_info", scores };
  if (matches("profanity").some((m) => m.type === "sexual" && m.intensity === "high")) {
    return { reason: "sexual", scores };
  }

  const classes: Record<string, unknown> = ml.moderation_classes ?? {};
  for (const [cls, { score, reason }] of Object.entries(ML_THRESHOLDS)) {
    const value = classes[cls];
    if (typeof value === "number" && value >= score) return { reason, scores };
  }
  return null;
}

serve(async (req) => {
  try {
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const webhookSecret = req.headers.get("x-moderation-secret");
    if (!webhookSecret) return json({ error: "Forbidden" }, 403);
    const { data: expected } = await service.rpc("_moderation_webhook_secret");
    if (!expected || webhookSecret !== expected) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const messageId = typeof body.message_id === "string" ? body.message_id : null;
    if (!messageId) return json({ error: "message_id required" }, 400);

    const { data: message } = await service
      .from("spot_chat_messages")
      .select("message_id, body, status")
      .eq("message_id", messageId)
      .maybeSingle<{ message_id: string; body: string; status: string }>();
    if (!message) return json({ skipped: "not_found" });
    if (message.status !== "visible") return json({ skipped: message.status });

    const result = await scan(message.body);
    if (result === "error") return json({ error: "scan_failed" }, 502);
    if (!result) return json({ decision: "pass" });

    const { error } = await service.rpc("moderation_hold_spot_chat_message", {
      p_message_id: messageId,
      p_reason: result.reason,
      p_scores: result.scores,
    });
    if (error) return json({ error: error.message }, 500);
    return json({ decision: "hold", reason: result.reason });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
