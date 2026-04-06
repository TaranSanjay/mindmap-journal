export type EmotionKey = "joy" | "calm" | "sadness" | "anxiety" | "anger";

export interface EmotionScores {
  joy: number;
  calm: number;
  sadness: number;
  anxiety: number;
  anger: number;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  created_at: string;
  entry_date: string;        // YYYY-MM-DD — the date the entry is for (may differ from created_at)
  content: string;
  emotion_scores: EmotionScores;
  composite_score: number;
  turn_count: number;
  messages: { role: string; content: string }[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface AgentState {
  messages: ChatMessage[];
  phase: "journal" | "clarifying" | "scoring" | "done";
  entry_text: string;
  clarification_count: number;
  emotion_scores?: EmotionScores;
  composite_score?: number;
}

export interface DashboardStats {
  average_score: number;
  streak_days: number;
  total_entries: number;
  best_day: string | null;
  dominant_emotion: EmotionKey | null;
}
