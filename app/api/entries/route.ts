import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { compositeScore } from "@/lib/utils";
import type { EmotionScores, ChatMessage } from "@/lib/types";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = rateLimit(`entries:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const body = await req.json();
  const { content, emotion_scores, turn_count, messages = [], entry_date } = body as {
    content: string;
    emotion_scores: EmotionScores;
    turn_count: number;
    messages: ChatMessage[];
    entry_date?: string; // YYYY-MM-DD, optional — defaults to today
  };

  const emotions: (keyof EmotionScores)[] = ["joy", "calm", "sadness", "anxiety", "anger"];
  for (const key of emotions) {
    const val = emotion_scores[key];
    if (typeof val !== "number" || val < 1 || val > 10)
      return NextResponse.json({ error: `Invalid score for ${key}` }, { status: 400 });
  }

  // Validate entry_date format if provided
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const resolvedDate = entry_date && dateRegex.test(entry_date)
    ? entry_date
    : format(new Date(), "yyyy-MM-dd");

  const composite = compositeScore(emotion_scores);

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      content: content.slice(0, 10000),
      emotion_scores,
      composite_score: composite,
      turn_count: Math.min(turn_count, 20),
      entry_date: resolvedDate,
      messages: messages
        .map(m => ({
          role: m.role,
          content: m.content
            .replace(/<analysis>[\s\S]*?<\/analysis>/g, "")
            .replace(/<analysis>[\s\S]*/g, "")
            .trim(),
        }))
        .filter(m => m.content.length > 0),
    })
    .select()
    .single();

  if (error) {
    console.error("DB insert error:", error.message);
    return NextResponse.json({ error: "Failed to save entry" }, { status: 500 });
  }

  return NextResponse.json({ entry: data }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ entry: data });
  }

  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "365"), 365);
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, created_at, entry_date, emotion_scores, composite_score, turn_count")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  return NextResponse.json({ entries: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("journal_entries").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}
