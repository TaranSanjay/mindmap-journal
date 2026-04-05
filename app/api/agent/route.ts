import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import type { ChatMessage } from "@/lib/types";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const SYSTEM_PROMPT = `You are a compassionate psychological journal assistant. Your role is to help users reflect on their day and understand their emotional state.

PHASE 1 — INITIAL RESPONSE:
When a user shares their journal entry, respond warmly and ask 1-2 targeted clarifying questions to better understand the emotional depth. Focus on:
- Ambiguous emotions ("I felt fine" — was that relief? numbness? contentment?)
- Significant events mentioned briefly
- Contradictions in tone vs content

PHASE 2 — CLARIFICATION (max 3 turns total):
Continue asking focused questions until you have enough information to accurately score emotions.
After 2-3 exchanges, say: "I think I have a good understanding now. Let me analyse this entry."

PHASE 3 — SCORING:
When you have enough context, output EXACTLY this JSON block and nothing after it:

<analysis>
{
  "summary": "2-3 sentence reflection on the emotional content",
  "emotions": {
    "joy": <1-10>,
    "calm": <1-10>,
    "sadness": <1-10>,
    "anxiety": <1-10>,
    "anger": <1-10>
  },
  "insight": "One personalised observation about a pattern or theme"
}
</analysis>

TONE: Warm, curious, non-clinical. Never diagnose. If content suggests serious distress, gently mention professional support.`;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = rateLimit(user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json();
  const messages: ChatMessage[] = body.messages ?? [];
  if (!messages.length) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  // Convert messages to Gemini format
  const geminiMessages = messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.slice(0, 4000) }],
    }));

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: geminiMessages,
        generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini error:", res.status, err);
      return NextResponse.json({ error: `AI error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const analysisMatch = text.match(/<analysis>([\s\S]*?)<\/analysis>/);
    let analysis = null;
    if (analysisMatch) {
      try { analysis = JSON.parse(analysisMatch[1].trim()); } catch { /* continue */ }
    }

    return NextResponse.json({ reply: text, analysis });
  } catch (err: any) {
    console.error("Agent error:", err?.message);
    return NextResponse.json({ error: "Service unavailable" }, { status: 502 });
  }
}
