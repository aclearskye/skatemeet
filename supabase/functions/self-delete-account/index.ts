import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Third live use of the service role, alongside admin-delete-user -- the
// Auth Admin API is the only way to remove the Auth account itself, and
// that always needs the service role regardless of who initiated it. This
// one has no admin check at all: the caller can only ever delete their own
// account (their id comes from their own verified JWT, never from the
// request body), so there's nothing to authorize beyond "is this a real,
// signed-in user."

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

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userData.user.id);
    if (deleteError) {
      return json({ error: deleteError.message }, 500);
    }

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});
