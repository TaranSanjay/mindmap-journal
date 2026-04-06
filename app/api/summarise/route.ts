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

Summarise the user's day and emotional experience in 3-4 warm, empathetic paragraphs.
Write directly to the user using "you" — like a thoughtful friend reflecting back what they shared.
Focus on: what happened, how they felt, any tensions or resolutions, and what lingered most.
Do not mention scores or analysis. Write as natural prose only.

CONVERSATION:
${transcript.slice(0, 6000)}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
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
