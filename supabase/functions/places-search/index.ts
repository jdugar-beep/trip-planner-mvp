import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") || "";
const DAILY_LIMIT = Number(Deno.env.get("PLACES_DAILY_REQUEST_LIMIT") || "25");
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

async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error) return null;
  return data.user;
}

async function reserveQuota(userId: string) {
  const day = usageDay();
  const { data: row, error: selectError } = await supabaseAdmin
    .from("places_usage")
    .select("request_count")
    .eq("user_id", userId)
    .eq("usage_date", day)
    .maybeSingle();

  if (selectError) throw selectError;

  const currentCount = row?.request_count || 0;
  if (currentCount >= DAILY_LIMIT) {
    return { allowed: false, count: currentCount, limit: DAILY_LIMIT, day };
  }

  const nextCount = currentCount + 1;
  const { error: upsertError } = await supabaseAdmin.from("places_usage").upsert({
    user_id: userId,
    usage_date: day,
    request_count: nextCount,
  });

  if (upsertError) throw upsertError;
  return { allowed: true, count: nextCount, limit: DAILY_LIMIT, day };
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
    return json({
      error: `Daily Places search limit reached (${quota.count}/${quota.limit}).`,
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
        "places.rating",
        "places.userRatingCount",
        "places.types",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: 5,
    }),
  });

  const placesJson = await placesResponse.json();
  if (!placesResponse.ok) {
    console.error("google_places_error", placesJson);
    return json({ error: "Google Places search failed.", quota }, placesResponse.status);
  }

  const places = (placesJson.places || []).map((place: any) => ({
    id: place.id,
    name: place.displayName?.text || "Unnamed place",
    address: place.formattedAddress || "",
    url: place.googleMapsUri || "",
    rating: place.rating || null,
    userRatingCount: place.userRatingCount || null,
    types: place.types || [],
  }));

  return json({ places, quota });
});
