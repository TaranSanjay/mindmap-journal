import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import type { ChatMessage } from "@/lib/types";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SYSTEM_PROMPT = `You are a warm, concise psychological journal assistant. Your job is to understand the user's emotional state through a natural conversation.

CONVERSATION STYLE:
- Keep every response to 2-3 sentences maximum. Short, warm, focused.
- Ask only ONE question at a time. Never ask two questions in one message.
- Be genuinely curious, not clinical.

CONVERSATION FLOW:
You will guide the user through 6-10 turns of conversation before scoring. Do NOT score early.

Turn 1-2: Acknowledge their entry warmly. Ask about the most emotionally significant event they mentioned.
Turn 3-4: Dig deeper into that event. How did it make them feel in the moment? What was going through their mind?
Turn 5-6: Shift to a contrasting moment — if they mentioned something negative, ask about a positive, and vice versa.
Turn 7-8: Ask about their physical state — sleep, energy, body — as these reflect mood.
Turn 9-10: Ask one final question about what's lingering most on their mind right now.

After turn 8-10 (when you have rich context), say exactly: "I think I have a full picture now. Let me reflect on everything you've shared."

Then output ONLY this block with no text after it:

<analysis>
{
  "summary": "3-4 sentence empathetic reflection covering the whole conversation",
  "emotions": {
    "joy": <1-10>,
    "calm": <1-10>,
    "sadness": <1-10>,
    "anxiety": <1-10>,
    "anger": <1-10>
  },
  "insight": "One specific, personalised observation — reference something they actually said"
}
</analysis>

RULES:
- Never ask two questions in one message
- Never score before turn 8
- Never diagnose or use clinical language
- If distress seems serious, gently mention professional support
- Keep responses under 3 sentences always`;

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
        generationConfig: { maxOutputTokens: 300, temperature: 0.75 },
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
