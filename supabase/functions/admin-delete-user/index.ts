import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Second live use of the service role (see admin-ban-user's own comment for
// why this needs the Auth Admin API rather than an RLS + RPC path). Called
// by the client *after* admin_delete_user_data() has already deleted the
// profiles row (and everything that cascades from it) -- that RPC re-checks
// eligibility (banned 30+ days, no pending appeal) server-side, so by the
// time this function runs the deletion has already been authorized and
// performed on the DB side. This step only removes the now-orphaned Auth
// credential; if it fails, the credential can simply be retried later since
// having no matching profile already makes it inert in the app.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: "Not authenticated" }, 401);
    }

    const { data: isAdmin, error: adminCheckError } = await callerClient.rpc("is_admin", {
      p_profile_id: userData.user.id,
    });
    if (adminCheckError || !isAdmin) {
      return json({ error: "NOT_ADMIN" }, 403);
    }

    const { profileId } = await req.json();
    if (typeof profileId !== "string") {
      return json({ error: "profileId is required" }, 400);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(profileId);
    if (deleteError) {
      return json({ error: deleteError.message }, 500);
    }

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});
