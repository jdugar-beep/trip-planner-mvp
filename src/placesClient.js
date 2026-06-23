import { supabase } from "./supabaseClient";

async function readFunctionError(error) {
  const response = error?.context;
  if (response && typeof response.json === "function") {
    try {
      const body = await response.json();
      if (body?.error) return body.error;
    } catch {
      // Fall back to the Supabase wrapper message below.
    }
  }

  return error?.message || "Places search failed.";
}

export async function searchPlaces(query, { category, location } = {}) {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return { places: [], quota: null };

  const { data, error } = await supabase.functions.invoke("places-search", {
    body: {
      query: normalizedQuery,
      category,
      location,
    },
  });

  if (error) throw new Error(await readFunctionError(error));
  if (data?.error) throw new Error(data.error);
  return data;
}
