"use client";
import { Icon } from "@/components/icons";
import { CoachSays, ErrorState, Loading, TopBar } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { QuestsData } from "@/lib/quests-types";
import { chooseMessage, useStartQuest } from "@/components/quests";

/** 12 Choose your quest: the Coach's 3 suggested goals, one marked "For you". */
export default function ChooseQuest() {
  const { data, error, reload } = useApi<QuestsData>("/api/quests");
  const { start, busy } = useStartQuest();
  if (error) return <ErrorState message={error.message} retry={reload} />;
  if (!data) return <Loading />;

  return (
    <div className="screen">
      <TopBar title="Choose your quest" back={{ fallback: "/quests" }} />
      <div className="pad">
        <CoachSays>{chooseMessage(data)}</CoachSays>
        {data.quests.map((q) => {
          const isCur = data.current?.questKey === q.key;
          const fy = q.key === data.forYou;
          return (
            <button key={q.key} className="row col" onClick={() => start(q.key, isCur)} disabled={!!busy}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div className="dot-icon" style={{ width: 44, height: 44, background: fy ? "var(--green)" : "var(--navy)", color: fy ? "var(--navy)" : "var(--green)" }}>
                  <Icon n="paddle" />
                </div>
                <div style={{ flex: 1, fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>{q.name}</div>
                <span className="pill pill-green sm" style={{ opacity: fy || isCur || busy === q.key ? 1 : 0 }}>
                  {busy === q.key ? "Building…" : isCur ? "Current" : "For you"}
                </span>
              </div>
              <div className="muted">{q.desc}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="pill pill-gray">{q.progress ? `${q.progress}/10 drills` : "10 drills"}</span>
                <span className="xp-tag">+200 XP</span>
                <span className="pill pill-gold">
                  <Icon n="trophy" size={15} />
                  {q.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
