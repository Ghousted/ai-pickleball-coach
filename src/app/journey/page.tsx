"use client";
import { Icon } from "@/components/icons";
import { ErrorState, Loading } from "@/components/ui";
import { timeAgo, useApi } from "@/lib/client";
import { DAYS, dayName } from "@/lib/game";

type J = { events: { id: string; type: string; title: string; xp: number; createdAt: string }[]; streak: number; playDays: string[] };

const DOTS: Record<string, string> = { upload: "#042330", compare: "#042330", badge: "#ffd230", drill: "#2ce080", review: "#2ce080", join: "#d4d4d8" };

/** 22 Journey: this week, the streak, and every XP gain and badge. */
export default function Journey() {
  const { data, error, reload } = useApi<J>("/api/journey");
  if (error) return <ErrorState message={error.message} retry={reload} />;
  if (!data) return <Loading />;

  const today = new Date();
  const todayName = dayName(today);
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - DAYS.indexOf(todayName));
  const activeDays = new Set(
    data.events
      .map((e) => new Date(e.createdAt))
      .filter((d) => d >= monday)
      .map((d) => dayName(d)),
  );

  return (
    <div className="screen tabbed">
      <div className="pad g12">
        <h2 className="h-display">Journey</h2>
        <div style={{ background: "linear-gradient(110deg,rgba(4,35,48,.95) 35%,rgba(4,35,48,.7)),var(--court) center 40%/cover", borderRadius: 22, padding: 16, color: "#fff", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 8px 20px rgba(4,35,48,.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: 17 }}>This week</span>
            <span className="pill pill-gold sm" style={{ gap: 4, fontSize: 13 }}>
              <Icon n="flame" size={14} />
              {data.streak}-week streak
            </span>
          </div>
          <div className="grid7" style={{ gap: 4 }}>
            {DAYS.map((d) => {
              const done = activeDays.has(d);
              const play = data.playDays.includes(d) && !done;
              const isToday = d === todayName;
              return (
                <div key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", border: `3px ${play ? "dashed" : "solid"} ${done ? "#fff" : play ? "var(--gold)" : "#3b5560"}`, background: done ? "var(--green)" : "transparent", color: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {done && <Icon n="check" size={16} sw={3} />}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? "#fff" : "rgba(255,255,255,.7)" }}>{d}</span>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>Dashed gold rings are your play days.</div>
        </div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10, paddingLeft: 28 }}>
          <div style={{ position: "absolute", left: 8, top: 10, bottom: 10, borderLeft: "3px solid var(--line)" }} />
          {data.events.map((l) => (
            <div key={l.id} style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: -28, top: "50%", width: 18, height: 18, marginTop: -9, borderRadius: "50%", background: DOTS[l.type] ?? "#d4d4d8", border: "2px solid var(--app)" }} />
              <div className="row static" style={{ gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="row-title" style={{ fontSize: 15 }}>
                    {l.title}
                  </div>
                  <div className="row-sub">{timeAgo(l.createdAt)}</div>
                </div>
                {l.xp > 0 && <span className="xp-tag" style={{ padding: "5px 10px" }}>+{l.xp} XP</span>}
              </div>
            </div>
          ))}
          {!data.events.length && <div className="muted">Nothing yet. Upload a clip to start your journey.</div>}
        </div>
      </div>
    </div>
  );
}
