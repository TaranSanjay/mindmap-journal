import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const EMOTION_COLORS: Record<string, string> = {
  joy: "#F59E0B",
  calm: "#10B981",
  sadness: "#6366F1",
  anxiety: "#F97316",
  anger: "#EF4444",
};

export const EMOTION_LABELS: Record<string, string> = {
  joy: "Joy",
  calm: "Calm",
  sadness: "Sadness",
  anxiety: "Anxiety",
  anger: "Anger",
};

/** Weighted composite score → 1–10 */
export function compositeScore(emotions: { joy: number; calm: number; sadness: number; anxiety: number; anger: number }): number {
  const { joy = 5, calm = 5, sadness = 5, anxiety = 5, anger = 5 } = emotions;
  const raw =
    joy * 1.2 + calm * 1.0 - sadness * 1.1 - anxiety * 1.0 - anger * 0.9;
  // raw range: -36.5 → +22
  const normalised = ((raw + 36.5) / 58.5) * 9 + 1;
  return Math.min(10, Math.max(1, Math.round(normalised * 10) / 10));
}

export function scoreLabel(score: number): string {
  if (score >= 8) return "Thriving";
  if (score >= 6.5) return "Good";
  if (score >= 5) return "Neutral";
  if (score >= 3.5) return "Low";
  return "Struggling";
}

export function scoreColor(score: number): string {
  if (score >= 8) return "#10B981";
  if (score >= 6.5) return "#F59E0B";
  if (score >= 5) return "#6366F1";
  if (score >= 3.5) return "#F97316";
  return "#EF4444";
}
