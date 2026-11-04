import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/* ---------- Better Auth (users and sessions) ---------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Better Auth stores sign-in rate limits here, so the limit holds across serverless instances. */
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* ---------- AI Coach ---------- */

/** One profile is one person in one sport. The design shows one profile per account. */
export const profiles = pgTable(
  "profiles",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sport: text("sport").notNull().default("pickleball"),
    level: text("level").notNull(), // Casual | Regular | Competitive
    playDays: text("play_days").array().notNull(), // ["Sat","Sun"]
    goal: text("goal"),
    xp: integer("xp").notNull().default(0),
    hideWizard: boolean("hide_wizard").notNull().default(false),
    createdAt: createdAt(),
  },
  // One profile per account for now. The unique index stops a double tap creating two.
  (t) => [uniqueIndex("profiles_user_idx").on(t.userId)],
);

export type VideoStatus = "uploading" | "uploaded" | "reviewing" | "reviewed" | "failed" | "unusable";

export const videos = pgTable(
  "videos",
  {
    id: id(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /** "clip" is a normal upload. "grade" is a drill clip filmed for a grade. */
    kind: text("kind").notNull().default("clip"),
    drillId: text("drill_id"),
    move: text("move").notNull(),
    blobPath: text("blob_path"),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    durationSec: real("duration_sec").notNull(),
    status: text("status").$type<VideoStatus>().notNull().default("uploading"),
    error: text("error"),
    statusAt: timestamp("status_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("videos_profile_idx").on(t.profileId)],
);

export type Observation = { time: string; saw: string };
export type RewardInfo = { xp: number; badge: string | null; levelUp: string | null };

export const reviews = pgTable("reviews", {
  id: id(),
  videoId: text("video_id")
    .notNull()
    .unique()
    .references(() => videos.id, { onDelete: "cascade" }),
  usable: boolean("usable").notNull(),
  unusableReason: text("unusable_reason"),
  subject: text("subject"),
  observations: jsonb("observations").$type<Observation[]>().notNull().default([]),
  reward: jsonb("reward").$type<RewardInfo | null>(),
  createdAt: createdAt(),
});

export const tips = pgTable(
  "tips",
  {
    id: id(),
    reviewId: text("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    timeSec: real("time_sec").notNull(),
    title: text("title").notNull(),
    saw: text("saw").notNull(),
    try: text("try").notNull(),
    cue: text("cue").notNull(),
    flagged: boolean("flagged").notNull().default(false),
  },
  (t) => [index("tips_video_idx").on(t.videoId)],
);

export type CompareItem = { title: string; text: string };
export type CompareResult = {
  message: string;
  improved: CompareItem[];
  same: CompareItem[];
  next: CompareItem[];
};

export const comparisons = pgTable("comparisons", {
  id: id(),
  profileId: text("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  videoA: text("video_a")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  videoB: text("video_b")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  status: text("status").$type<"running" | "done" | "failed">().notNull().default("running"),
  result: jsonb("result").$type<CompareResult | null>(),
  xpAwarded: integer("xp_awarded").notNull().default(0),
  flagged: boolean("flagged").notNull().default(false),
  statusAt: timestamp("status_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
});

/** A program is a quest: a goal with 10 drills. Old programs stay as "archived". */
export const programs = pgTable(
  "programs",
  {
    id: id(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    questKey: text("quest_key").notNull(),
    name: text("name").notNull(),
    goal: text("goal").notNull(),
    badge: text("badge").notNull(),
    status: text("status").$type<"current" | "archived">().notNull().default("current"),
    createdAt: createdAt(),
  },
  (t) => [index("programs_profile_idx").on(t.profileId)],
);

export const drills = pgTable(
  "drills",
  {
    id: id(),
    programId: text("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    tipId: text("tip_id").references(() => tips.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    how: text("how").notNull(),
    minutes: integer("minutes").notNull(),
    cue: text("cue").notNull(),
    day: text("day").notNull(),
    done: boolean("done").notNull().default(false),
    doneAt: timestamp("done_at", { withTimezone: true }),
    flagged: boolean("flagged").notNull().default(false),
  },
  (t) => [uniqueIndex("drills_program_pos_idx").on(t.programId, t.position)],
);

export type GradeMetric = { label: string; value: number };

export const grades = pgTable("grades", {
  id: id(),
  drillId: text("drill_id")
    .notNull()
    .references(() => drills.id, { onDelete: "cascade" }),
  videoId: text("video_id")
    .notNull()
    .unique()
    .references(() => videos.id, { onDelete: "cascade" }),
  grade: text("grade").notNull(),
  score: integer("score").notNull(),
  metrics: jsonb("metrics").$type<GradeMetric[]>().notNull(),
  good: text("good").notNull(),
  next: text("next").notNull(),
  cue: text("cue").notNull(),
  xp: integer("xp").notNull().default(0),
  createdAt: createdAt(),
});

/** The Journey log. Every XP gain and badge is one row. */
export const events = pgTable(
  "events",
  {
    id: id(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // join | upload | review | drill | compare | badge
    title: text("title").notNull(),
    xp: integer("xp").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("events_profile_idx").on(t.profileId, t.createdAt)],
);

export const badges = pgTable(
  "badges",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull(),
    unlockedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.badgeId] })],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: id(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /** "general" or a video id */
    thread: text("thread").notNull(),
    role: text("role").$type<"coach" | "me">().notNull(),
    text: text("text").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("chat_thread_idx").on(t.profileId, t.thread, t.createdAt)],
);
