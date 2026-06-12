"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HELP_CATEGORIES,
  HELP_CATEGORY_LABELS,
  type HelpCategory,
} from "@/lib/constants";
import {
  createHelpArticle,
  deleteHelpArticle,
  updateHelpArticle,
} from "@/lib/help";
import { createClient } from "@/lib/supabase/client";
import type { HelpArticle } from "@/lib/types/database";
import { Pencil, Plus, Trash2 } from "lucide-react";

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function arrayToLines(arr: string[]): string {
  return arr.join("\n");
}

function tagsToArray(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const EMPTY_FORM = {
  title: "",
  category: "taximeter" as HelpCategory,
  short_summary: "",
  body_content: "",
  steps: "",
  image_urls: "",
  video_url: "",
  tags: "",
  published: false,
  admin_verified: false,
};

export function AdminHelpManager({ articles }: { articles: HelpArticle[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(article: HelpArticle) {
    setEditingId(article.id);
    setForm({
      title: article.title,
      category: article.category,
      short_summary: article.short_summary,
      body_content: article.body_content,
      steps: arrayToLines(article.step_by_step_instructions),
      image_urls: arrayToLines(article.image_urls),
      video_url: article.video_url ?? "",
      tags: article.tags.join(", "),
      published: article.published,
      admin_verified: article.admin_verified,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const payload = {
      title: form.title.trim(),
      category: form.category,
      short_summary: form.short_summary.trim(),
      body_content: form.body_content.trim(),
      step_by_step_instructions: linesToArray(form.steps),
      image_urls: linesToArray(form.image_urls),
      video_url: form.video_url.trim() || null,
      tags: tagsToArray(form.tags),
      published: form.published,
      admin_verified: form.admin_verified,
    };

    try {
      if (editingId) {
        await updateHelpArticle(supabase, editingId, payload);
      } else {
        await createHelpArticle(supabase, payload);
      }
      cancelForm();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Ta bort denna artikel?")) return;
    const supabase = createClient();
    await deleteHelpArticle(supabase, id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <button type="button" onClick={startCreate} className="btn-primary w-full">
          <Plus className="h-5 w-5" />
          Ny artikel
        </button>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-card-border bg-card p-4"
        >
          <h3 className="font-semibold">
            {editingId ? "Redigera artikel" : "Ny artikel"}
          </h3>

          <input
            className="field"
            placeholder="Rubrik"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <select
            className="field"
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as HelpCategory })
            }
          >
            {HELP_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {HELP_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>

          <textarea
            className="field min-h-[60px]"
            placeholder="Kort sammanfattning"
            value={form.short_summary}
            onChange={(e) => setForm({ ...form, short_summary: e.target.value })}
            rows={2}
          />

          <textarea
            className="field min-h-[100px]"
            placeholder="Innehåll"
            value={form.body_content}
            onChange={(e) => setForm({ ...form, body_content: e.target.value })}
            rows={4}
          />

          <textarea
            className="field min-h-[100px]"
            placeholder="Steg (en per rad)"
            value={form.steps}
            onChange={(e) => setForm({ ...form, steps: e.target.value })}
            rows={4}
          />

          <textarea
            className="field"
            placeholder="Bild-URL:er (en per rad)"
            value={form.image_urls}
            onChange={(e) => setForm({ ...form, image_urls: e.target.value })}
            rows={2}
          />

          <input
            className="field"
            placeholder="Video-URL (YouTube)"
            value={form.video_url}
            onChange={(e) => setForm({ ...form, video_url: e.target.value })}
          />

          <input
            className="field"
            placeholder="Taggar (kommaseparerade)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="h-5 w-5 accent-accent"
            />
            <span className="text-sm">Publicerad</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.admin_verified}
              onChange={(e) =>
                setForm({ ...form, admin_verified: e.target.checked })
              }
              className="h-5 w-5 accent-accent"
            />
            <span className="text-sm">Verifierad (syns för förare)</span>
          </label>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Sparar…" : editingId ? "Uppdatera" : "Skapa"}
            </button>
            <button type="button" onClick={cancelForm} className="btn-secondary flex-1">
              Avbryt
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {articles.map((article) => (
          <li
            key={article.id}
            className="rounded-xl border border-card-border bg-card p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{article.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {HELP_CATEGORY_LABELS[article.category]}
                  {article.published && article.admin_verified
                    ? " · Live"
                    : " · Utkast"}
                  {" · "}
                  {article.view_count} visningar
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(article)}
                  className="rounded-lg p-2 text-muted hover:bg-background hover:text-foreground"
                  aria-label="Redigera"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(article.id)}
                  className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                  aria-label="Ta bort"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
