// Cloudflare Stream API helpers shared by stream-video and moderate-post
// (md/media_posts.md §3 "Video: Cloudflare Stream").
//
// Env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_TOKEN (API token with
// Stream:Edit), STREAM_WEBHOOK_SECRET (returned when the webhook is
// registered -- see md/media_posts.md §13).

export type StreamVideo = {
  uid: string;
  readyToStream: boolean;
  status?: { state?: string; errReasonCode?: string; errorReasonCode?: string };
  duration?: number;
  input?: { width?: number; height?: number };
  playback?: { hls?: string; dash?: string };
  thumbnail?: string;
  requireSignedURLs?: boolean;
  meta?: Record<string, unknown>;
};

export function streamConfigured(): boolean {
  return !!Deno.env.get("CLOUDFLARE_ACCOUNT_ID") && !!Deno.env.get("CLOUDFLARE_STREAM_TOKEN");
}

function base(): string {
  return `https://api.cloudflare.com/client/v4/accounts/${Deno.env.get("CLOUDFLARE_ACCOUNT_ID")}/stream`;
}

async function call<T>(path: string, init: RequestInit = {}, okStatuses: number[] = []): Promise<T | null> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${Deno.env.get("CLOUDFLARE_STREAM_TOKEN")}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (okStatuses.includes(res.status)) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.success === false) {
    const message = body?.errors?.[0]?.message ?? `http_${res.status}`;
    throw new Error(`stream ${init.method ?? "GET"} ${path}: ${message}`);
  }
  return (body?.result ?? null) as T | null;
}

// One-time upload URL for the app. Videos are signed-only until moderation
// passes, and Stream itself rejects anything over 60s.
export async function createDirectUpload(opts: { postId: string; creator: string }) {
  const expiry = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  const result = await call<{ uploadURL: string; uid: string }>("/direct_upload", {
    method: "POST",
    body: JSON.stringify({
      maxDurationSeconds: 60,
      requireSignedURLs: true,
      creator: opts.creator,
      meta: { post_id: opts.postId, name: `post ${opts.postId}` },
      expiry,
    }),
  });
  if (!result) throw new Error("stream direct_upload: empty result");
  return result;
}

export async function getVideo(uid: string): Promise<StreamVideo | null> {
  return await call<StreamVideo>(`/${uid}`, {}, [404]);
}

export async function setRequireSignedUrls(uid: string, required: boolean): Promise<StreamVideo | null> {
  return await call<StreamVideo>(`/${uid}`, {
    method: "POST",
    body: JSON.stringify({ uid, requireSignedURLs: required }),
  });
}

export async function deleteVideo(uid: string): Promise<void> {
  // Already gone counts as done, so cleanup retries are safe.
  await call(`/${uid}`, { method: "DELETE" }, [404]);
}

// Early test uploads had an MP4 download made for scanning; promotion and
// CSAM holds remove any that exist.
export async function deleteMp4Download(uid: string): Promise<void> {
  await call(`/${uid}/downloads`, { method: "DELETE" }, [404]);
}

// A short-lived signed token, standing in for the uid in playback URLs.
export async function signedToken(uid: string, opts: { downloadable?: boolean; ttlSeconds: number }): Promise<string> {
  const result = await call<{ token: string }>(`/${uid}/token`, {
    method: "POST",
    body: JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + opts.ttlSeconds,
      downloadable: opts.downloadable === true,
    }),
  });
  if (!result?.token) throw new Error("stream token: empty result");
  return result.token;
}

// customer-<code>.cloudflarestream.com, read from the API's own playback
// URL rather than built by hand.
export function customerHost(video: StreamVideo): string {
  const hls = video.playback?.hls;
  if (!hls) throw new Error("stream video has no playback url yet");
  return new URL(hls).host;
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// "Webhook-Signature: time=<unix>,sig1=<hex>" where sig1 is
// HMAC-SHA256(secret, `${time}.${rawBody}`). Old signatures are refused so a
// captured request can't be replayed later.
export async function verifyStreamWebhook(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]));
  const time = Number(parts.time);
  if (!parts.sig1 || !Number.isFinite(time)) return false;
  if (Math.abs(Date.now() / 1000 - time) > 60 * 60) return false;
  const expected = await hmacHex(secret, `${parts.time}.${rawBody}`);
  return timingSafeEqual(expected, parts.sig1);
}
