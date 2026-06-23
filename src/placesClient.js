import { supabase } from "./supabaseClient";

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

  if (error) throw new Error(error.message || "Places search failed.");
  if (data?.error) throw new Error(data.error);
  return data;
}
