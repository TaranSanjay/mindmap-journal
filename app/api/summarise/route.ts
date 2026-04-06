import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

async function callGemini(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.72 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function endsOnCompleteSentence(text: string): boolean {
  return /[.!?]['"]?\s*$/.test(text.trimEnd());
}

function trimToLastSentence(text: string): string {
  const trimmed = text.trim();
  const endings = [".\n", ".\n\n", ". ", "! ", "? "];
  let best = -1;
  for (const e of endings) {
    const idx = trimmed.lastIndexOf(e);
    if (idx > best && idx > trimmed.length * 0.4) best = idx + 1;
  }
  // Also check if it ends cleanly already
  if (endsOnCompleteSentence(trimmed)) return trimmed;
  if (best > 0) return trimmed.slice(0, best).trim();
  return trimmed;
}

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

  // ── Option 1: Strong structural prompt ─────────────────────────────────────
  const mainPrompt = `You are rewriting a journal conversation as a first-person journal entry.

Write from the user's perspective using "I". Your goal is a brief but expressive summary that captures the emotional tone and key moments — not a blow-by-blow account.

STRUCTURE: Write 3 paragraphs:
- Paragraph 1: The mood and main events of the day — what happened and how it felt overall
- Paragraph 2: The tensions, worries, or low points — what weighed on them and why
- Paragraph 3: How it resolved or what they were left feeling by the end

STYLE RULES:
- Each paragraph: 2-4 sentences. Be expressive but concise.
- Cover the emotional arc, not every detail
- Use natural first-person language ("I felt", "I found myself", "what stayed with me")
- End the final paragraph with a complete, conclusive sentence
- Do NOT add any text, label, or heading after the third paragraph ends
- Do NOT mention AI, scores, or analysis

CONVERSATION:
${transcript.slice(0, 4000)}`;

  try {
    let summary = await callGemini(apiKey, mainPrompt, 750);
    summary = summary.trim();

    // ── Option 3: If cut off, complete it with a second call ──────────────────
    if (!endsOnCompleteSentence(summary)) {
      try {
        const completionPrompt = `The following journal entry summary is incomplete — it was cut off mid-sentence. 
Write ONE final sentence that naturally completes and concludes it. 
Return ONLY that one sentence, nothing else.

INCOMPLETE SUMMARY:
${summary}`;

        const completion = await callGemini(apiKey, completionPrompt, 80);
        const sentence = completion.trim().split(/[.!?]/)[0];
        if (sentence && sentence.length > 10) {
          summary = trimToLastSentence(summary) + " " + sentence.trim() + ".";
        } else {
          summary = trimToLastSentence(summary);
        }
      } catch {
        summary = trimToLastSentence(summary);
      }
    }

    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("Summarise error:", err?.message);
    return NextResponse.json({ error: "Service unavailable" }, { status: 502 });
  }
}
