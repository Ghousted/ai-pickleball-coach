export type QDrill = { id: string; position: number; title: string; how: string; minutes: number; cue: string; day: string; done: boolean; tipId: string | null; grade: string | null };
export type QuestsData = {
  current: { id: string; questKey: string; name: string; goal: string; badge: string; drills: QDrill[] } | null;
  quests: { key: string; name: string; desc: string; badge: string; progress: number }[];
  forYou: string;
  latestVideo: { id: string; move: string } | null;
  hasReview: boolean;
  lastGrade: { grade: string; score: number; drillId: string; title: string } | null;
  goal: string | null;
};
