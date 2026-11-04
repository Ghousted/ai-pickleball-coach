"use client";
import { DAYS, LEVELS } from "@/lib/game";

export type ProfileFields = { name: string; level: string; playDays: string[]; goal: string };

/** Level, play days and goal. Shared by Setup and Edit profile. */
export function ProfileFieldsForm({ f, set, withName }: { f: ProfileFields; set: (f: ProfileFields) => void; withName?: boolean }) {
  return (
    <>
      {withName && (
        <>
          <label className="label" htmlFor="pname">
            First name
          </label>
          <input id="pname" className="input" value={f.name} onChange={(e) => set({ ...f, name: e.target.value })} style={{ marginBottom: 6 }} />
        </>
      )}
      <span className="label">Your level</span>
      <div className="grid3" style={{ marginBottom: 8 }} role="radiogroup" aria-label="Your level">
        {LEVELS.map((o) => {
          const on = f.level === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`seg${on ? " on" : ""}`}
              style={{ height: 62, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}
              onClick={() => set({ ...f, level: o.id })}
            >
              {o.id}
              <span style={{ color: on ? "var(--gold)" : "var(--ink-600)", fontSize: 12 }}>{o.stars}</span>
            </button>
          );
        })}
      </div>
      <span className="label">Days you regularly play</span>
      <div className="grid7" style={{ marginBottom: 8 }}>
        {DAYS.map((d) => {
          const on = f.playDays.includes(d);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              className={`seg${on ? " on" : ""}`}
              style={{ height: 46, borderRadius: 14, fontSize: 12, padding: 0 }}
              onClick={() => set({ ...f, playDays: on ? f.playDays.filter((x) => x !== d) : DAYS.filter((x) => x === d || f.playDays.includes(x)) })}
            >
              {d}
            </button>
          );
        })}
      </div>
      <label className="label" htmlFor="goal">
        Your goal <span style={{ fontWeight: 500 }}>(optional)</span>
      </label>
      <input id="goal" className="input" placeholder="e.g. Steadier dinks" value={f.goal} onChange={(e) => set({ ...f, goal: e.target.value })} />
      <p style={{ fontSize: 13, color: "var(--ink-600)", lineHeight: 1.5 }}>Not sure yet? Your coach will suggest quests after your first review.</p>
    </>
  );
}
