import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { CUES, type Quest } from "../knowledge/pickleball";
import { fmt } from "../game";
import { generateJson, generateText, provider, type VideoInput } from "./provider";

/* All agents follow one pattern: read, then advise. Each is a plain function that returns
   validated JSON (PRD 7.1). With AI_PROVIDER=mock they return answers built from the design. */

const knowledgeCache = new Map<string, string>();
async function knowledge(sport: string) {
  if (!knowledgeCache.has(sport)) {
    const file = path.join(process.cwd(), "knowledge", `${sport}.md`);
    const text = await fs.readFile(file, "utf8").catch(() => "No knowledge file for this sport. Use general coaching knowledge and say so.");
    knowledgeCache.set(sport, text);
  }
  return knowledgeCache.get(sport)!;
}

const mmss = z.string().regex(/^\d{1,2}:\d{2}$/, "time must be m:ss");
export const toSec = (t: string) => {
  const [m, s] = t.split(":").map(Number);
  return m * 60 + s;
};

/* ---------------- Review agent ---------------- */

const ReviewSchema = z.object({
  usable: z.boolean(),
  unusable_reason: z.string().nullable(),
  subject: z.string().nullable(),
  observations: z.array(z.object({ time: mmss, saw: z.string() })),
  tips: z
    .array(
      z.object({
        time: mmss,
        title: z.string().describe("2 to 5 words"),
        saw: z.string().describe("what you saw, starting with 'your' or 'you', lower case"),
        try: z.string().describe("one thing to try, lower case, imperative"),
        cue: z.enum(CUES),
      }),
    )
    .max(5),
});
export type ReviewOut = z.infer<typeof ReviewSchema>;

export async function reviewAgent(input: {
  video: () => Promise<VideoInput>;
  sport: string;
  move: string;
  level: string;
  durationSec: number;
}): Promise<ReviewOut> {
  if (provider() === "mock") return mockReview(input.move, input.durationSec);
  const prompt = `You are a ${input.sport} coach reviewing a phone video of one player doing a "${input.move}".
Player level: ${input.level}. The clip is ${fmt(input.durationSec)} long.

KNOWLEDGE FILE (judge the clip against this):
${await knowledge(input.sport)}

STEPS
1. Decide who you are judging. If several people are on screen, pick the one nearest the camera and describe them in "subject" (for example "player in the blue shirt, nearest the camera").
2. If you cannot see the player's whole body, or the clip does not show ${input.sport}, set usable=false, give a short plain reason in unusable_reason (one sentence, speak to the player as "you"), and return no observations or tips.
3. Otherwise write what you observed, with times, BEFORE any tip. Times are m:ss and must be inside the clip.
4. Then give 3 to 5 tips. Each tip has the time of the moment, what you saw, one thing to try, and one cue from the knowledge file. Only give a tip for something you can actually see. If you are not sure what happened, give fewer tips, or none. A missing tip is better than a wrong one.
5. No medical or injury advice.`;
  const out = await generateJson({ prompt, schema: ReviewSchema, videos: [await input.video()] });
  out.tips = out.tips.filter((t) => toSec(t.time) <= input.durationSec + 1);
  if (out.usable && out.tips.length > 0 && out.tips.length < 3 && out.observations.length === 0) {
    throw new Error("Review had tips without observations");
  }
  return out;
}

const MOCK_TIPS = {
  tsd: [
    { s: 3, saw: "your wrist flicks at contact.", tr: "lock your wrist and let your legs do the work.", cue: "quiet wrist", title: "Quiet wrist" },
    { s: 7, saw: "you stay back after your drop.", tr: "follow your drop in and split-step at the kitchen.", cue: "walk it in", title: "Walk it in" },
    { s: 11, saw: "you hit hard from the baseline, so the ball sails deep.", tr: "send a soft arc that lands in the kitchen.", cue: "arc and land soft", title: "Soft arc" },
    { s: 16, saw: "your paddle drops low between shots.", tr: "bring your paddle up in front of your chest.", cue: "paddle up", title: "Paddle up" },
  ],
  dinkA: [
    { s: 4, saw: "your paddle face opens at contact, so the ball floats up.", tr: "keep the face flat and push through the ball.", cue: "flat face", title: "Steady paddle face" },
    { s: 9, saw: "your knees straighten as you reach for the ball.", tr: "bend your knees and stay low through the shot.", cue: "soft knees", title: "Soft knees" },
    { s: 13, saw: "your contact point is beside your hip.", tr: "meet the ball out in front of your body.", cue: "out in front", title: "Contact in front of the body" },
    { s: 18, saw: "your paddle swings up fast after contact.", tr: "keep the swing short and compact.", cue: "short swing", title: "Soft, compact dink" },
  ],
  dinkB: [
    { s: 4, saw: "your paddle face opens at contact, so the ball floats up.", tr: "keep the face flat and push through the ball.", cue: "flat face", title: "Steady paddle face" },
    { s: 9, saw: "your contact point is beside your hip.", tr: "meet the ball out in front of your body.", cue: "out in front", title: "Contact in front of the body" },
    { s: 14, saw: "your paddle swings up fast after contact.", tr: "keep the swing short and compact.", cue: "short swing", title: "Soft, compact dink" },
    { s: 19, saw: "you stand flat-footed as the ball comes.", tr: "split-step as your opponent hits.", cue: "split step", title: "Split step" },
  ],
} as const;

let mockFlip = 0;
async function mockReview(move: string, dur: number): Promise<ReviewOut> {
  await new Promise((r) => setTimeout(r, 4000));
  const outcome = process.env.MOCK_OUTCOME;
  if (outcome === "fails") throw new Error("Mock failure (MOCK_OUTCOME=fails)");
  if (outcome === "cant")
    return { usable: false, unusable_reason: "We could not see your whole body in the clip.", subject: null, observations: [], tips: [] };
  const set = /drop/i.test(move) ? MOCK_TIPS.tsd : mockFlip++ % 2 ? MOCK_TIPS.dinkB : MOCK_TIPS.dinkA;
  const scale = Math.min(1, Math.max(dur, 4) / 20);
  const tips = set.map((t) => ({ time: fmt(Math.min(dur, t.s * scale)), title: t.title, saw: t.saw, try: t.tr, cue: t.cue as ReviewOut["tips"][number]["cue"] }));
  return {
    usable: true,
    unusable_reason: null,
    subject: "the player in the blue shirt, nearest the camera",
    observations: tips.map((t) => ({ time: t.time, saw: t.saw })),
    tips,
  };
}

/* ---------------- Grade agent (a drill filmed for a grade) ---------------- */

const GradeSchema = z.object({
  grade: z.enum(["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D"]),
  score: z.number().int().min(0).max(100),
  metrics: z
    .array(z.object({ label: z.string(), value: z.number().int().min(0).max(100) }))
    .length(3),
  good: z.string().describe("what's working, 1 or 2 sentences"),
  next: z.string().describe("one thing for the next rep, 1 sentence"),
});
export type GradeOut = z.infer<typeof GradeSchema>;

export async function gradeAgent(input: {
  video: () => Promise<VideoInput>;
  sport: string;
  drill: { title: string; how: string; cue: string };
  level: string;
}): Promise<GradeOut> {
  if (provider() === "mock") {
    await new Promise((r) => setTimeout(r, 3000));
    const G = ([["A", 92], ["A-", 88], ["B+", 83], ["B", 78]] as const)[Math.floor(Math.random() * 4)];
    const m = (off: number) => Math.max(55, Math.min(98, G[1] + off));
    return {
      grade: G[0],
      score: G[1],
      metrics: [
        { label: "Consistency", value: m(4) },
        { label: `Technique · ${input.drill.cue}`, value: m(-6) },
        { label: "Footwork", value: m(3) },
      ],
      good: "Your contact stayed calm and repeatable through most reps. The early reps were your cleanest.",
      next: `Focus on "${input.drill.cue}" for the last few reps, when you start to rush.`,
    };
  }
  const prompt = `You are a ${input.sport} coach grading a short phone clip of a player doing a drill.
Drill: "${input.drill.title}". How: ${input.drill.how} Cue: "${input.drill.cue}". Level: ${input.level}.

KNOWLEDGE FILE:
${await knowledge(input.sport)}

Watch the reps, then grade them. Give a letter grade and a score out of 100, and exactly 3 metrics in this order:
"Consistency", "Technique · ${input.drill.cue}", "Footwork" (0 to 100 each). Say what is working and one thing for the next rep.
Speak to the player as "you". No medical advice. If you cannot see the drill, give grade "D", score 0, and say why in "good".`;
  return generateJson({ prompt, schema: GradeSchema, videos: [await input.video()] });
}

/* ---------------- Compare agent ---------------- */

const Item = z.object({ title: z.string().describe("2 to 5 words"), text: z.string().describe("one sentence naming the change, with what each clip showed") });
const CompareSchema = z.object({
  message: z.string().describe("one or two encouraging sentences to the player"),
  improved: z.array(Item).max(4),
  same: z.array(Item).max(4),
  next: z.array(Item).max(3),
});
export type CompareOut = z.infer<typeof CompareSchema>;

type TipLite = { title: string; saw: string; cue: string; time: string };

export async function compareAgent(input: {
  sport: string;
  move: string;
  before: { date: string; tips: TipLite[]; video: () => Promise<VideoInput> };
  after: { date: string; tips: TipLite[]; video: () => Promise<VideoInput> };
}): Promise<CompareOut> {
  if (provider() === "mock") {
    await new Promise((r) => setTimeout(r, 2500));
    return mockCompare(input.before.tips, input.after.tips);
  }
  const list = (ts: TipLite[]) => ts.map((t) => `- ${t.time} [${t.cue}] ${t.saw}`).join("\n") || "- (no tips)";
  const prompt = `You are a ${input.sport} coach. The first video is the BEFORE clip (${input.before.date}), the second is the AFTER clip (${input.after.date}). Both show the same move: "${input.move}".

Earlier review of BEFORE:
${list(input.before.tips)}
Review of AFTER:
${list(input.after.tips)}

KNOWLEDGE FILE:
${await knowledge(input.sport)}

Watch both clips. Say what improved, what stayed the same, and what to work on next. Each item names the change and what each clip showed.
Only list what you can see. Speak to the player as "you". No medical advice.`;
  return generateJson({ prompt, schema: CompareSchema, videos: [await input.before.video(), await input.after.video()] });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function mockCompare(a: TipLite[], b: TipLite[]): CompareOut {
  const ca = a.map((t) => t.cue);
  const cb = b.map((t) => t.cue);
  const it = (t: TipLite) => ({ title: t.title, text: cap(t.saw) });
  const improved = a.filter((t) => !cb.includes(t.cue)).map((t) => ({ title: t.title, text: `Your earlier clip showed: ${t.saw} It no longer shows up.` }));
  const same = b.filter((t) => ca.includes(t.cue)).map(it);
  const next = b.filter((t) => !ca.includes(t.cue)).map(it);
  return {
    message: improved.length
      ? `Progress! ${improved.length} thing${improved.length > 1 ? "s" : ""} from your earlier clip no longer show${improved.length > 1 ? "" : "s"} up. Keep it going.`
      : "Same patterns in both clips. Stick with your quest and film again in a few days.",
    improved,
    same,
    next,
  };
}

/* ---------------- Coach agent (builds the program) ---------------- */

const ProgramSchema = z.object({
  drills: z
    .array(
      z.object({
        template: z.number().int().min(1).max(10).describe("which drill template this is based on, 1 to 10"),
        title: z.string(),
        how: z.string().describe("one or two short sentences"),
        minutes: z.number().int().min(2).max(20),
        cue: z.string(),
        tip_id: z.string().nullable().describe("id of the tip this drill fixes, or null"),
      }),
    )
    .length(10),
});

export type ProgramDrill = { title: string; how: string; minutes: number; cue: string; tipId: string | null };
type ActiveTip = { id: string; cue: string; saw: string; try: string };

export async function coachAgent(input: { sport: string; level: string; goal: string; quest: Quest; tips: ActiveTip[] }): Promise<ProgramDrill[]> {
  const byCue = (cue: string) => input.tips.find((t) => t.cue === cue)?.id ?? null;
  const fallback = () => input.quest.drills.map((d) => ({ ...d, tipId: byCue(d.cue) }));
  if (provider() === "mock" || !input.tips.length) return fallback();
  const prompt = `You are a ${input.sport} coach building a 10-drill training program.
Goal: "${input.goal}". Quest: "${input.quest.name}" (${input.quest.desc}). Player level: ${input.level}.

Drill templates (keep this order, one drill per template; drill 10 is the final test):
${input.quest.drills.map((d, i) => `${i + 1}. ${d.title} — ${d.how} (${d.minutes} min, cue: ${d.cue})`).join("\n")}

The player's tips from their reviews (flagged tips are already removed):
${input.tips.map((t) => `- id=${t.id} [${t.cue}] saw: ${t.saw} try: ${t.try}`).join("\n")}

Tailor each template to this player: keep the title or adjust it slightly, rewrite "how" so it targets what was seen, and set tip_id to the tip it fixes (or null if none fits). Keep each drill doable alone or with one partner. No medical advice.`;
  try {
    const out = await generateJson({ prompt, schema: ProgramSchema, text: true });
    const ids = new Set(input.tips.map((t) => t.id));
    return out.drills
      .sort((a, b) => a.template - b.template)
      .map((d) => ({ title: d.title, how: d.how, minutes: d.minutes, cue: d.cue, tipId: d.tip_id && ids.has(d.tip_id) ? d.tip_id : null }));
  } catch (e) {
    console.error("coachAgent failed, using templates", e);
    return fallback();
  }
}

/* ---------------- Chat (the coach answers questions) ---------------- */

export async function chatAgent(input: {
  name: string;
  level: string;
  goal: string | null;
  move: string | null;
  tips: { time: string; saw: string; try: string; cue: string }[];
  questName: string | null;
  nextDrill: string | null;
  history: { role: "coach" | "me"; text: string }[];
  question: string;
}): Promise<string> {
  const top = input.tips[0] ?? { cue: "paddle up", try: "keep your paddle up in front of your chest between shots.", saw: "", time: "" };
  if (provider() === "mock") {
    await new Promise((r) => setTimeout(r, 900));
    const quest = input.questName ?? "Consistent dinks";
    const canned: Record<string, string> = {
      "Why does this matter?": `Good question. "${top.cue}" matters because clean, quiet contact keeps the ball low, and low balls win at the kitchen line, where most points are won. In your clip, ${top.saw}`,
      "Give me a drill": input.nextDrill
        ? `Your next drill is "${input.nextDrill}" in the ${quest} quest. Open Quests and tap Start.`
        : `I'd start with the "${quest}" quest. Open Quests, pick it, and your first drill will be ready. It targets "${top.cue}".`,
      "What should I fix first?": `Start with tip 1 at ${top.time}: ${top.try} Fix that and the others get easier.`,
      "What should I work on?": input.move
        ? `From your latest clip, the biggest win is "${top.cue}": ${top.try} Your "${quest}" quest builds exactly that.`
        : "Send me a 30-second clip first and I'll tell you exactly what to work on. Until then, focus on keeping your paddle up between shots.",
      "How do I film?": "Phone sideways, whole body in frame, from the side or behind at hip height. About 30 seconds, and prop it up so it stays steady.",
    };
    return canned[input.question] ?? `Keep it simple: focus on "${top.cue}" for your next session. ${cap(top.try)}`;
  }
  const prompt = `You are a friendly, concise pickleball coach in an app called AI Coach.
Player: ${input.name}, level ${input.level}, goal: ${input.goal || "none yet"}.
${input.move ? `They uploaded a "${input.move}" clip. Your tips: ${input.tips.map((t) => `at ${t.time} you saw ${t.saw} Try: ${t.try}`).join(" | ")}` : "They have not uploaded a clip yet."}
${input.questName ? `Current quest: ${input.questName}. Next drill: ${input.nextDrill ?? "quest complete"}.` : "No quest picked yet."}

Conversation so far:
${input.history.slice(-8).map((m) => `${m.role === "me" ? "Player" : "Coach"}: ${m.text}`).join("\n")}

Answer the player's question in 2 or 3 short plain sentences. No markdown, no emoji. Never give medical advice: if they mention pain or injury, tell them to stop and see a professional.
Player: ${input.question}`;
  return generateText(prompt);
}
