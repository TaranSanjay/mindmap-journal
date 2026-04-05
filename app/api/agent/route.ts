import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import type { ChatMessage } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

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
When you have enough context, output EXACTLY this JSON block (no other text after it):

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

TONE: Warm, curious, non-clinical. You are a thoughtful friend who happens to understand psychology.
Never be prescriptive. Never diagnose. If content suggests serious distress, gently mention professional support.`;

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const { allowed } = rateLimit(user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json();
  const messages: ChatMessage[] = body.messages ?? [];

  if (!messages.length) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  // Sanitise input — strip any injection attempts
  const sanitised = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content.slice(0, 4000), // hard cap per message
  }));

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: sanitised,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // Check if analysis block is present
  const analysisMatch = text.match(/<analysis>([\s\S]*?)<\/analysis>/);
  let analysis = null;

  if (analysisMatch) {
    try {
      analysis = JSON.parse(analysisMatch[1].trim());
    } catch {
      // malformed JSON — continue conversation
    }
  }

  return NextResponse.json({ reply: text, analysis });
}
