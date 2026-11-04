"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@/components/icons";
import { ErrorState, Loading } from "@/components/ui";
import { notify, useApi } from "@/lib/client";
import type { QuestsData } from "@/lib/quests-types";

const XS = [179, 115, 86, 115, 179, 243, 272, 243, 179, 115, 179];
const GAP = 92;
const T0 = 52;
const W = 358;

/** 13 Quests: the quest path. Each drill falls on a play day and names the tip it fixes. */
export default function QuestPath() {
  const router = useRouter();
  const { data, error, reload } = useApi<QuestsData>("/api/quests");
  useEffect(() => {
    if (data && !data.current) router.replace("/quests/choose");
  }, [data, router]);

  if (error) return <ErrorState message={error.message} retry={reload} />;
  if (!data?.current) return <Loading />;
  const q = data.current;
  const n = q.drills.filter((d) => d.done).length;
  const next = q.drills.find((d) => !d.done);
  const H = T0 + 10 * GAP + 60;
  const pts = XS.map((x, i) => `${x} ${T0 + i * GAP}`);

  return (
    <div
      className="screen dark"
      style={{
        background: "linear-gradient(180deg,rgba(4,35,48,.55) 0,rgba(4,35,48,.92) 260px,#042330 520px),var(--court) center top/100% auto no-repeat,#042330",
        backgroundAttachment: "local",
      }}
    >
      <div className="col" style={{ padding: "18px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="icon-btn round" style={{ marginLeft: -8, background: "rgba(255,255,255,.08)" }} onClick={() => router.push("/quests")} aria-label="Back to quests">
            <Icon n="back" />
          </button>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "rgba(255,255,255,.7)" }}>YOUR QUEST</div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", marginTop: 4 }}>{q.name}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginTop: 2 }}>Goal: {q.goal}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
          <div className="bar dark" style={{ flex: 1 }}>
            <i style={{ width: `${n * 10}%` }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 15 }}>{n} of 10 drills done</span>
        </div>
      </div>

      <div style={{ width: W, maxWidth: "100%", margin: "12px auto 0", position: "relative", height: H }}>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }} fill="none" aria-hidden="true">
          <path d={"M" + pts.join(" L")} stroke="#3b5560" strokeWidth={5} strokeLinecap="round" strokeDasharray="0 11" />
        </svg>
        {[...q.drills, null].map((d, i) => {
          const x = XS[i];
          const top = T0 + i * GAP;
          const boss = d === null;
          const done = !!d?.done;
          const cur = !!d && !done && d.id === next?.id;
          const locked = !!d && !done && !cur;
          const big = cur ? 48 : boss ? 36 : 29;
          const right = x > 179;
          const go = () => {
            if (boss) return notify(n >= 10 ? "Quest complete!" : `Finish all 10 drills to earn ${q.badge}`);
            if (locked) return notify(`Finish drill ${(next?.position ?? 0) + 1} first`);
            router.push(`/drills/${d!.id}`);
          };
          const label = boss ? q.badge : `${d!.title}${d!.grade ? " · " + d!.grade : ""}`;
          return (
            <div key={d?.id ?? "boss"}>
              <div style={{ position: "absolute", left: x, top, transform: "translate(-50%,-50%)" }}>
                {done && (
                  <button onClick={go} aria-label={`${label}, done`} style={{ width: 58, height: 58, borderRadius: "50%", background: "var(--green)", border: "3px solid #fff", boxShadow: "0 4px 0 var(--green-700)", color: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Icon n="check" size={24} sw={3} />
                  </button>
                )}
                {cur && (
                  <button onClick={go} aria-label={`${label}, up next`} style={{ width: 96, height: 96, borderRadius: "50%", background: "rgba(255,210,48,.22)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                    <div style={{ width: 78, height: 78, borderRadius: "50%", background: "var(--gold)", border: "4px solid #fff", boxShadow: "0 5px 0 var(--gold-dark)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ position: "absolute", inset: 5, borderRadius: "50%", border: "3px dotted rgba(4,35,48,.7)" }} />
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--navy)", position: "relative" }}>{i + 1}</span>
                    </div>
                  </button>
                )}
                {locked && (
                  <button onClick={go} aria-label={`${label}, locked`} style={{ width: 58, height: 58, borderRadius: "50%", background: "var(--navy-800)", border: "3px solid #3b5560", color: "#93a4ab", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Icon n="lock" />
                  </button>
                )}
                {boss && (
                  <button onClick={go} aria-label={label} style={{ width: 72, height: 72, borderRadius: "50%", background: n >= 10 ? "var(--gold)" : "#2a3a2c", border: "4px dashed var(--gold)", color: n >= 10 ? "var(--navy)" : "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Icon n="trophy" />
                  </button>
                )}
              </div>
              <div
                style={{
                  position: "absolute",
                  top,
                  left: right ? "auto" : x + big + 10,
                  right: right ? W - x + big + 10 : "auto",
                  transform: "translateY(-50%)",
                  fontWeight: 800,
                  fontSize: 14,
                  color: locked ? "#93a4ab" : "#fff",
                  textAlign: right ? "right" : "left",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
                {d && !d.done && <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.55)" }}>{d.day}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "sticky", bottom: 0, zIndex: 2, marginTop: "auto", padding: "18px 12px 12px", background: "linear-gradient(rgba(4,35,48,0),#042330 38%)" }}>
        {next ? (
          <div className="col" style={{ background: "#fff", border: "3px solid var(--green)", borderRadius: 20, padding: "10px 10px 10px 14px", color: "var(--ink)", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 24px rgba(0,0,0,.3)" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: "var(--green-700)", whiteSpace: "nowrap" }}>
                <span>
                  Up next · drill {next.position + 1} · {next.day}
                </span>
                <span style={{ color: "#a1a1aa" }}>·</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--ink-600)" }}>
                  <Icon n="clock" size={15} />
                  {next.minutes} min
                </span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{next.title}</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => router.push(`/drills/${next.id}`)}>
              Start
            </button>
          </div>
        ) : (
          <div className="col" style={{ background: "#fff", border: "3px solid var(--gold)", borderRadius: 20, padding: "10px 10px 10px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 24px rgba(0,0,0,.3)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gold-dark)" }}>Quest complete</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)" }}>{q.badge} badge earned. Film a new clip to compare.</div>
            </div>
            <button className="btn btn-primary btn-sm" style={{ fontSize: 13 }} onClick={() => router.push("/videos/upload")}>
              New clip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
