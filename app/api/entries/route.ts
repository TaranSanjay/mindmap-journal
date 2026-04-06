import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { compositeScore } from "@/lib/utils";
import type { EmotionScores, ChatMessage } from "@/lib/types";

// POST /api/entries — save a completed journal session
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = rateLimit(`entries:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const body = await req.json();
  const { content, emotion_scores, turn_count, messages = [] } = body as {
    content: string;
    emotion_scores: EmotionScores;
    turn_count: number;
    messages: ChatMessage[];
  };

  const emotions: (keyof EmotionScores)[] = ["joy", "calm", "sadness", "anxiety", "anger"];
  for (const key of emotions) {
    const val = emotion_scores[key];
    if (typeof val !== "number" || val < 1 || val > 10)
      return NextResponse.json({ error: `Invalid score for ${key}` }, { status: 400 });
  }

  const composite = compositeScore(emotion_scores);

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      content: content.slice(0, 10000),
      emotion_scores,
      composite_score: composite,
      turn_count: Math.min(turn_count, 20),
      messages: messages
        .map(m => ({
          role: m.role,
          content: m.content
            .replace(/<analysis>[\s\S]*?<\/analysis>/g, "")
            .replace(/<analysis>[\s\S]*/g, "")
            .trim(),
        }))
        .filter(m => m.content.length > 0), // drop messages that were purely analysis
    })
    .select()
    .single();

  if (error) {
    console.error("DB insert error:", error.message);
    return NextResponse.json({ error: "Failed to save entry" }, { status: 500 });
  }

  return NextResponse.json({ entry: data }, { status: 201 });
}

// GET /api/entries — fetch entry list or single entry
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  // Single entry with full messages
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

  // Entry list (no messages field for performance)
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "90"), 365);
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, created_at, emotion_scores, composite_score, turn_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  return NextResponse.json({ entries: data });
}

// DELETE /api/entries?id=xxx
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
