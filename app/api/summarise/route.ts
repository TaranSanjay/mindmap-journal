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

  const prompt = `You are reading a journal conversation. Write a first-person journal entry from the user's perspective.

STRICT RULES:
- Write EXACTLY 2 paragraphs. No more, no less.
- Each paragraph must be 3-5 sentences.
- The final sentence MUST be a complete sentence ending with a period.
- Use "I" throughout. Cover what happened, how they felt, and what lingered.
- Do NOT mention scores, analysis, or the AI assistant.
- Stop writing after the second paragraph ends. Do not add anything after.

CONVERSATION:
${transcript.slice(0, 3000)}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.65 },
      }),
    });
    if (!res.ok) return NextResponse.json({ error: "AI error" }, { status: 502 });
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Ensure summary ends on a complete sentence
    const endsCleanly = /[.!?]['"]?\s*$/.test(raw.trimEnd());
    let summary = raw.trim();
    if (!endsCleanly) {
      const lastEnd = Math.max(
        summary.lastIndexOf(". "),
        summary.lastIndexOf("! "),
        summary.lastIndexOf("? "),
        summary.lastIndexOf(".\n"),
      );
      if (lastEnd > summary.length * 0.5) {
        summary = summary.slice(0, lastEnd + 1).trim();
      }
    }

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 502 });
  }
}
