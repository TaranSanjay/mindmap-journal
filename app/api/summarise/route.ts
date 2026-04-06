import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = rateLimit(`summarise:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const { transcript } = await req.json();
  if (!transcript) return NextResponse.json({ error: "No transcript" }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const prompt = `You are reading a journal conversation between a user and an AI assistant.

Rewrite the user's day as a first-person journal entry from their own perspective — as if they wrote it themselves after reflecting. Use "I" throughout.

Cover everything they mentioned: events, emotions, physical state, social interactions, worries, and any resolution or lingering feelings. Write in flowing natural prose, 3-4 paragraphs. Make it feel personal and specific to what they actually said — not generic.

Do not mention scores, analysis, or the AI assistant. Just write it as their own journal entry.

CONVERSATION:
${transcript.slice(0, 8000)}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
      }),
    });
    if (!res.ok) return NextResponse.json({ error: "AI error" }, { status: 502 });
    const data = await res.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 502 });
  }
}
