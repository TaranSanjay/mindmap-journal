import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import type { ChatMessage } from "@/lib/types";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SYSTEM_PROMPT = `You are a warm, concise psychological journal assistant. Your job is to deeply understand the user's emotional state through natural conversation before scoring.

RESPONSE STYLE:
- Keep every response to 2-3 sentences maximum. Short, warm, focused.
- Ask only ONE question per message. Never combine two questions.
- Be genuinely curious, not clinical. Reference what they actually said.

WHEN TO SCORE:
You decide when you have enough context — not based on number of messages. Score when you can confidently answer all of these:
- What were the key emotional highs and lows of their day?
- What caused any stress, anxiety, or disappointment?
- What brought them joy or calm?
- How are they feeling right now vs earlier in the day?
- What's their general energy/state?

If a user writes a very detailed entry covering all of the above, you may score after just 1-2 follow-up questions.
If a user writes vaguely ("had an okay day"), you may need 6-8 exchanges to build a real picture.
Never score when you still have important unanswered questions. Never drag out a conversation when you already have full context.

WHAT TO ASK ABOUT (pick the most relevant gap each time):
- Specific events they mentioned briefly — what actually happened?
- Emotional nuance — "fine" could mean relief, numbness, or forced acceptance
- Contrasts — if they had both good and bad moments, explore both
- Physical state — sleep, energy, appetite often reflect mood
- What's lingering — what are they still thinking about right now?
- Unresolved feelings — anything they started to say but didn't finish

SCORING TRIGGER:
When you have enough context, say exactly: "I think I have a full picture now. Let me reflect on everything you've shared."

Then output ONLY this block with nothing after it:

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
  "insight": "One specific personalised observation — reference something they actually said"
}
</analysis>

RULES:
- One question per message, always
- Short responses, always
- Score based on context completeness, not message count
- Never diagnose or use clinical language
- If serious distress is present, gently mention professional support`;

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
        generationConfig: { maxOutputTokens: 800, temperature: 0.75 },
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
