import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Account deletion is not configured." }, 503);
  }

  const user = await getUser(req);
  if (!user) return json({ error: "Sign in before deleting your account." }, 401);

  const { error: dataError } = await supabaseAdmin.rpc("delete_user_owned_data", {
    target_user_id: user.id,
  });

  if (dataError) {
    console.error("delete_user_owned_data_error", dataError);
    return json({ error: "Could not delete account data." }, 500);
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (authError) {
    console.error("delete_auth_user_error", authError);
    return json({ error: "Account data was removed, but the auth user could not be deleted. Contact support." }, 500);
  }

  return json({ ok: true });
});
