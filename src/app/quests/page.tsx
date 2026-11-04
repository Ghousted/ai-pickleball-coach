"use client";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Bar, CoachSays, ErrorState, Loading } from "@/components/ui";
import { useApi } from "@/lib/client";
import { chooseMessage, useStartQuest } from "@/components/quests";
import type { QuestsData } from "@/lib/quests-types";

/** 13a Quest home. */
export default function QuestHome() {
  const { data, error, reload } = useApi<QuestsData>("/api/quests");
  const { start, busy } = useStartQuest();
  if (error) return <ErrorState message={error.message} retry={reload} />;
  if (!data) return <Loading />;
  const cur = data.current;
  const n = cur ? cur.drills.filter((d) => d.done).length : 0;

  return (
    <div className="screen tabbed">
      <div className="pad">
        {cur ? (
          <div className="hero-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--green)" }}>YOUR QUEST</span>
              <span className="pill" style={{ background: "rgba(255,255,255,.12)", color: "#fff", padding: "5px 12px" }}>
                {n}/10 drills
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, fontStyle: "italic", textTransform: "uppercase", letterSpacing: "-.02em", lineHeight: 1 }}>{cur.name}</div>
            <Bar pct={n * 10} tone="glass" />
            {n >= 10 && <div style={{ background: "var(--gold)", color: "var(--navy)", borderRadius: 14, padding: "10px 14px", fontWeight: 800, fontSize: 14 }}>Quest complete · {cur.badge} badge earned</div>}
            <Link href="/quests/path" style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, color: "#fff", fontWeight: 800, fontSize: 14, textDecoration: "none", padding: "2px 0" }}>
              View quest path
              <Icon n="chev" />
            </Link>
          </div>
        ) : (
          <CoachSays size={52}>{chooseMessage(data)}</CoachSays>
        )}
        {data.lastGrade && (
          <Link href={`/drills/${data.lastGrade.drillId}/grade`} className="row" style={{ gap: 12, textDecoration: "none" }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--gold)", border: "3px solid var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 17, color: "var(--navy)", flexShrink: 0 }}>
              {data.lastGrade.grade}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-600)", letterSpacing: ".06em" }}>LAST GRADE</div>
              <div className="row-title">
                {data.lastGrade.title} · {data.lastGrade.score}/100
              </div>
            </div>
            <Icon n="chev" color="var(--navy)" />
          </Link>
        )}
        <div className="h-section" style={{ marginTop: 4 }}>
          {cur ? "All quests" : "Choose a quest"}
        </div>
        {data.quests.map((q) => {
          const isCur = cur?.questKey === q.key;
          const fy = !cur && q.key === data.forYou;
          const done = q.progress >= 10;
          const [chip, cls] = isCur ? ["Current", "pill-green"] : done ? ["Done", "pill-gold"] : fy ? ["For you", "pill-green"] : q.progress ? [`${q.progress}/10`, "pill-gray"] : ["Start", "pill-gray"];
          const hi = isCur || fy;
          return (
            <button key={q.key} className="row col" onClick={() => start(q.key, isCur)} disabled={!!busy}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="dot-icon" style={{ width: 42, height: 42, background: hi ? "var(--green)" : "var(--navy)", color: hi ? "var(--navy)" : "var(--green)" }}>
                  <Icon n="paddle" />
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 800, color: "var(--navy)" }}>{q.name}</div>
                <span className={`pill sm ${cls}`} style={{ color: "var(--navy)" }}>
                  {busy === q.key ? "Building…" : chip}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-600)", lineHeight: 1.4 }}>{q.desc}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Bar pct={q.progress * 10} h={8} style={{ flex: 1 }} />
                <span className="pill pill-gold sm" style={{ gap: 5, padding: "4px 10px" }}>
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
