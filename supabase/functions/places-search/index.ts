import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") || "";
const DAILY_LIMIT = Number(Deno.env.get("PLACES_DAILY_REQUEST_LIMIT") || "25");
const MONTHLY_GLOBAL_LIMIT = Number(Deno.env.get("PLACES_MONTHLY_GLOBAL_LIMIT") || "900");
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

function usageDay() {
  return new Date().toISOString().slice(0, 10);
}

function usageMonth() {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error) return null;
  return data.user;
}

async function reserveQuota(userId: string) {
  const day = usageDay();
  const month = usageMonth();
  const { data: userRow, error: userSelectError } = await supabaseAdmin
    .from("places_usage")
    .select("request_count")
    .eq("user_id", userId)
    .eq("usage_date", day)
    .maybeSingle();

  if (userSelectError) throw userSelectError;

  const userCurrentCount = userRow?.request_count || 0;
  if (userCurrentCount >= DAILY_LIMIT) {
    return {
      allowed: false,
      reason: "daily_user",
      count: userCurrentCount,
      limit: DAILY_LIMIT,
      day,
      monthly: null,
    };
  }

  const { data: monthRow, error: monthSelectError } = await supabaseAdmin
    .from("places_global_usage")
    .select("request_count")
    .eq("usage_month", month)
    .maybeSingle();

  if (monthSelectError) throw monthSelectError;

  const monthCurrentCount = monthRow?.request_count || 0;
  if (monthCurrentCount >= MONTHLY_GLOBAL_LIMIT) {
    return {
      allowed: false,
      reason: "monthly_global",
      count: userCurrentCount,
      limit: DAILY_LIMIT,
      day,
      monthly: { count: monthCurrentCount, limit: MONTHLY_GLOBAL_LIMIT, month },
    };
  }

  const userNextCount = userCurrentCount + 1;
  const monthNextCount = monthCurrentCount + 1;
  const { error: userUpsertError } = await supabaseAdmin.from("places_usage").upsert({
    user_id: userId,
    usage_date: day,
    request_count: userNextCount,
  });

  if (userUpsertError) throw userUpsertError;

  const { error: monthUpsertError } = await supabaseAdmin.from("places_global_usage").upsert({
    usage_month: month,
    request_count: monthNextCount,
  });

  if (monthUpsertError) throw monthUpsertError;

  return {
    allowed: true,
    reason: null,
    count: userNextCount,
    limit: DAILY_LIMIT,
    day,
    monthly: { count: monthNextCount, limit: MONTHLY_GLOBAL_LIMIT, month },
  };
}

function googlePlacesErrorMessage(status: number, body: any) {
  const googleMessage = body?.error?.message || body?.error || "";
  if (status === 400) return "Google Places rejected the search request.";
  if (status === 403) {
    const detail = typeof googleMessage === "string" && googleMessage.trim()
      ? ` Google says: ${googleMessage}`
      : "";
    return `Google Places rejected the API key. Check that Places API (New) is enabled, billing is active, and the key is allowed to use it.${detail}`;
  }
  if (status === 429) return "Google Places quota was reached.";
  if (typeof googleMessage === "string" && googleMessage.trim()) return googleMessage;
  return "Google Places search failed.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!GOOGLE_PLACES_API_KEY) return json({ error: "Google Places is not configured yet." }, 503);

  const user = await getUser(req);
  if (!user) return json({ error: "Sign in before searching places." }, 401);

  let body: { query?: string; category?: string; location?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const query = (body.query || "").trim();
  if (query.length < 2) return json({ places: [], quota: null });

  let quota;
  try {
    quota = await reserveQuota(user.id);
  } catch (error) {
    console.error("quota_error", error);
    return json({ error: "Could not check Places usage quota." }, 500);
  }

  if (!quota.allowed) {
    const message = quota.reason === "monthly_global"
      ? `Monthly app-wide Places search limit reached (${quota.monthly?.count}/${quota.monthly?.limit}).`
      : `Daily Places search limit reached (${quota.count}/${quota.limit}).`;
    return json({
      error: message,
      quota,
    }, 429);
  }

  const textQuery = [
    [query, body.category].filter(Boolean).join(" "),
    body.location ? `near ${body.location}` : "",
  ].filter(Boolean).join(" ");
  const placesResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.googleMapsUri",
        "places.types",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: 5,
    }),
  });

  let placesJson: any = {};
  try {
    placesJson = await placesResponse.json();
  } catch {
    placesJson = {};
  }

  if (!placesResponse.ok) {
    console.error("google_places_error", placesJson);
    return json({ error: googlePlacesErrorMessage(placesResponse.status, placesJson), quota }, placesResponse.status);
  }

  const places = (placesJson.places || []).map((place: any) => ({
    id: place.id,
    name: place.displayName?.text || "Unnamed place",
    address: place.formattedAddress || "",
    url: place.googleMapsUri || "",
    types: place.types || [],
  }));

  return json({ places, quota });
});
