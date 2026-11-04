/* Game rules shared by the server and the browser. Values come from the design prototype. */

export const XP = { join: 10, upload: 10, review: 50, drill: 20, grade: 30, compareFirst: 75 } as const;

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Day = (typeof DAYS)[number];

export const LEVELS = [
  { id: "Casual", stars: "★" },
  { id: "Regular", stars: "★★" },
  { id: "Competitive", stars: "★★★" },
] as const;

export const MAX_VIDEOS = 10;
export const MAX_SECONDS = 35;
export const MAX_BYTES = 100 * 1024 * 1024;
export const DRILLS_PER_QUEST = 10;

const LV = [0, 100, 250, 400, 600, 850, 1200];
const LN = ["Newcomer", "Rally Starter", "Dink Rookie", "Kitchen Regular", "Rally Pro", "Kitchen King", "Legend"];

export function levelFor(xp: number) {
  let i = 0;
  while (i < LV.length - 1 && xp >= LV[i + 1]) i++;
  const hi = LV[i + 1] ?? LV[i] + 500;
  return {
    n: i + 1,
    name: LN[i],
    lo: LV[i],
    hi,
    nextName: LN[i + 1] ?? LN[i],
    pct: Math.min(100, ((xp - LV[i]) / (hi - LV[i])) * 100),
  };
}

export type BadgeDef = { id: string; name: string; icon: string; hint: string };

export const BADGES: BadgeDef[] = [
  { id: "upload", name: "First Upload", icon: "upload", hint: "Upload a video" },
  { id: "review", name: "First Review", icon: "eye", hint: "Get your first review" },
  { id: "goal", name: "Goal Set", icon: "target", hint: "Set a goal" },
  { id: "ask", name: "Ask Away", icon: "chat", hint: "Message your coach" },
  { id: "compare", name: "Compare Rookie", icon: "swap", hint: "Compare two videos" },
  { id: "streak", name: "3-Week Streak", icon: "flame", hint: "Play 3 weeks in a row" },
  { id: "sergeant", name: "Drill Sergeant", icon: "bolt", hint: "Finish 5 drills" },
  { id: "lvl5", name: "Level 5", icon: "trophy", hint: "Reach Rally Pro" },
  { id: "q_dinks", name: "Dink Master", icon: "trophy", hint: "Finish the Consistent dinks quest" },
  { id: "q_popups", name: "Flat Face", icon: "trophy", hint: "Finish the Fewer pop-ups quest" },
  { id: "q_control", name: "Soft Hands", icon: "trophy", hint: "Finish the Better paddle control quest" },
];

export const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const NOT_MEDICAL = "This is a coaching tip, not medical advice. If something hurts, stop and see a professional.";

export const FILM_STEPS = [
  { icon: "camera", t: "Turn your phone sideways", d: "Landscape fits the whole court.", long: "Hold your phone in landscape. A wide frame lets me see the whole court, your feet and where the ball lands." },
  { icon: "user", t: "Show your whole body", d: "Head to toes, paddle included.", long: "Keep head to toes in frame, paddle included. Most of my tips come from your legs and your paddle, so I need to see both." },
  { icon: "target", t: "Film from the side or behind", d: "Hip height, along the sideline.", long: "Stand along the sideline or behind the baseline, at about hip height. Side-on views show your swing and footwork best." },
  { icon: "clock", t: "About 30 seconds", d: "One or two rallies is plenty.", long: "Around 30 seconds is perfect — one or two good rallies. Clips can be up to 35 seconds." },
  { icon: "bolt", t: "Hold it steady", d: "Prop it up or use a tripod.", long: "Prop your phone on a bag or fence, or use a tripod. A steady shot means sharper coaching." },
] as const;

/** Monday-based day name for a date. */
export const dayName = (d: Date): Day => DAYS[(d.getDay() + 6) % 7];
