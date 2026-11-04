/*
 * Quest catalog for pickleball. Each quest is a goal the Coach can suggest, with 10 drill
 * templates. The Coach agent tailors these drills to the player's own tips.
 * The text knowledge the Review agent reads is in /knowledge/pickleball.md.
 */

export type DrillTemplate = { title: string; how: string; minutes: number; cue: string };
export type Quest = { key: string; name: string; badge: string; badgeId: string; desc: string; drills: DrillTemplate[] };

const d = (title: string, how: string, minutes: number, cue: string): DrillTemplate => ({ title, how, minutes, cue });

export const QUESTS: Quest[] = [
  {
    key: "dinks",
    name: "Consistent dinks",
    badge: "Dink Master",
    badgeId: "q_dinks",
    desc: "Soft, low dinks that land in the kitchen win you the net.",
    drills: [
      d("Wall dinks", "Stand 6 feet from a wall and dink 20 in a row.", 5, "quiet wrist"),
      d("Cross-court dinks", "Dink cross-court with a partner. Aim for 15 in a row.", 5, "arc and land soft"),
      d("Dink and hold", "Dink, then freeze your follow-through for a full beat.", 5, "quiet wrist"),
      d("Target dinks", "Put a towel in the kitchen and land 8 of 10 on it.", 6, "arc and land soft"),
      d("Dink footwork", "Shuffle side to side between dinks. Never cross your feet.", 6, "small steps"),
      d("Soft-knee dinks", "Stay low with bent knees for 20 dinks.", 5, "soft knees"),
      d("Paddle face check", "Pause at contact and check your paddle face is flat.", 5, "flat face"),
      d("Pressure dinks", "Your partner speeds up every 5th ball. Reset it soft.", 7, "paddle up"),
      d("Dink to 15", "Play a dink-only game to 15.", 10, "patience"),
      d("Dink rally boss", "Hit a 30-dink rally without a pop-up.", 8, "quiet wrist"),
    ],
  },
  {
    key: "popups",
    name: "Fewer pop-ups",
    badge: "Flat Face",
    badgeId: "q_popups",
    desc: "Pop-ups give your opponent a free put-away. Flat and low keeps you safe.",
    drills: [
      d("Flat face holds", "Hold your paddle flat at contact height for 10 slow reps.", 4, "flat face"),
      d("Paddle up", "Ready position between every shot for a full rally.", 5, "paddle up"),
      d("Wall blocks", "Block 20 balls off a wall, keeping them below net height.", 5, "quiet wrist"),
      d("Low resets", "Partner drives at you; reset 8 of 10 into the kitchen.", 6, "soak it up"),
      d("Drop and freeze", "Hit a drop, freeze, check the face angle.", 5, "flat face"),
      d("Kitchen resets", "Reset 15 balls from the kitchen line.", 5, "soft hands"),
      d("Soft blocks", "Block hard drives so they die in the kitchen.", 6, "soak it up"),
      d("Midcourt resets", "Reset from midcourt, then step in.", 6, "split step"),
      d("Transition zone", "Move up through the transition zone in 3 resets.", 7, "walk it in"),
      d("Pop-up boss", "Play to 11 with zero pop-ups.", 10, "flat face"),
    ],
  },
  {
    key: "control",
    name: "Better paddle control",
    badge: "Soft Hands",
    badgeId: "q_control",
    desc: "Control comes from a quiet grip and a calm, compact swing.",
    drills: [
      d("Grip pressure", "Dink at grip pressure 3 out of 10 for 20 reps.", 4, "loose grip"),
      d("Bounce ups", "Bounce the ball on your paddle 30 times.", 3, "quiet wrist"),
      d("Short swings", "Hit 20 balls with a swing no bigger than a shoebox.", 5, "short swing"),
      d("Out in front", "Meet 20 balls in front of your front foot.", 5, "out in front"),
      d("Backhand dinks", "Dink backhand only, 15 in a row.", 5, "quiet wrist"),
      d("Topspin rolls", "Roll 10 dinks with gentle topspin.", 6, "brush up"),
      d("Slice dinks", "Slice 10 dinks so they skid low.", 6, "open face"),
      d("Speed-up blocks", "Block 10 speed-ups back low.", 6, "soak it up"),
      d("Ladder targets", "Hit 4 targets in order, twice.", 8, "calm swing"),
      d("Control boss", "A 20-ball rally hitting only targets.", 10, "soft hands"),
    ],
  },
];

export const questByKey = (key: string) => QUESTS.find((q) => q.key === key);

/** The cues the Review agent may use. Each tip names one. */
export const CUES = [
  "quiet wrist",
  "flat face",
  "soft knees",
  "out in front",
  "short swing",
  "paddle up",
  "split step",
  "walk it in",
  "arc and land soft",
  "small steps",
  "loose grip",
  "soak it up",
] as const;

/** Plain code, no AI: the quest whose drills train the most of the player's active tip cues. */
export function questForCues(cues: string[]): string {
  if (!cues.length) return "dinks";
  let best = QUESTS[0];
  let bestScore = -1;
  for (const q of QUESTS) {
    const qc = new Set(q.drills.map((x) => x.cue));
    const score = cues.reduce((n, c) => n + (qc.has(c) ? 1 : 0), 0);
    if (score > bestScore) {
      best = q;
      bestScore = score;
    }
  }
  return best.key;
}

export const MOVES = ["Dink", "Third-shot drop", "Serve", "Return", "Volley", "Drive"];
