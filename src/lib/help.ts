import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./db-errors";
import type { HelpCategory } from "./constants";
import type { HelpArticle, HelpArticleInput } from "./types/database";

export async function fetchPublishedHelpArticles(
  supabase: SupabaseClient
): Promise<HelpArticle[]> {
  const { data, error } = await supabase
    .from("help_articles")
    .select("*")
    .eq("published", true)
    .eq("admin_verified", true)
    .order("title");

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []) as HelpArticle[];
}

export async function fetchMostViewedHelpArticles(
  supabase: SupabaseClient,
  limit = 5
): Promise<HelpArticle[]> {
  const { data, error } = await supabase
    .from("help_articles")
    .select("*")
    .eq("published", true)
    .eq("admin_verified", true)
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []) as HelpArticle[];
}

export async function fetchHelpArticleById(
  supabase: SupabaseClient,
  id: string
): Promise<HelpArticle | null> {
  const { data, error } = await supabase
    .from("help_articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as HelpArticle | null) ?? null;
}

export async function incrementHelpArticleViews(
  supabase: SupabaseClient,
  articleId: string
): Promise<void> {
  await supabase.rpc("increment_help_article_views", {
    article_id: articleId,
  });
}

export async function voteOnHelpArticle(
  supabase: SupabaseClient,
  userId: string,
  articleId: string,
  vote: 1 | -1
): Promise<void> {
  const { error } = await supabase.from("help_article_votes").upsert(
    { article_id: articleId, user_id: userId, vote },
    { onConflict: "article_id,user_id" }
  );
  if (error) throw error;
}

export async function fetchAllHelpArticles(
  supabase: SupabaseClient
): Promise<HelpArticle[]> {
  const { data, error } = await supabase
    .from("help_articles")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []) as HelpArticle[];
}

export async function createHelpArticle(
  supabase: SupabaseClient,
  input: HelpArticleInput
): Promise<HelpArticle> {
  const { data, error } = await supabase
    .from("help_articles")
    .insert({
      title: input.title,
      category: input.category,
      short_summary: input.short_summary ?? "",
      body_content: input.body_content ?? "",
      step_by_step_instructions: input.step_by_step_instructions ?? [],
      image_urls: input.image_urls ?? [],
      video_url: input.video_url ?? null,
      tags: input.tags ?? [],
      published: input.published ?? false,
      admin_verified: input.admin_verified ?? false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as HelpArticle;
}

export async function updateHelpArticle(
  supabase: SupabaseClient,
  id: string,
  input: HelpArticleInput
): Promise<void> {
  const { error } = await supabase
    .from("help_articles")
    .update({
      title: input.title,
      category: input.category,
      short_summary: input.short_summary ?? "",
      body_content: input.body_content ?? "",
      step_by_step_instructions: input.step_by_step_instructions ?? [],
      image_urls: input.image_urls ?? [],
      video_url: input.video_url ?? null,
      tags: input.tags ?? [],
      published: input.published ?? false,
      admin_verified: input.admin_verified ?? false,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteHelpArticle(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("help_articles").delete().eq("id", id);
  if (error) throw error;
}

export function filterHelpArticles(
  articles: HelpArticle[],
  query: string,
  category: HelpCategory | null
): HelpArticle[] {
  const q = query.trim().toLowerCase();
  return articles.filter((a) => {
    if (category && a.category !== category) return false;
    if (!q) return true;
    const haystack = [
      a.title,
      a.short_summary,
      a.body_content,
      ...a.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function helpArticlesByCategory(
  articles: HelpArticle[],
  category: HelpCategory
): HelpArticle[] {
  return articles.filter((a) => a.category === category);
}
