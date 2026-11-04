"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Reward } from "@/components/reviewing";
import { ErrorState, Loading } from "@/components/ui";
import { api, ApiError, notify, useApi } from "@/lib/client";
import { BADGES, fmt } from "@/lib/game";
import { inspect, uploadClip, type PickedFile } from "@/lib/upload";

type D = {
  drill: { id: string; position: number; title: string; how: string; minutes: number; cue: string; day: string; done: boolean; flagged: boolean };
  quest: { name: string; badge: string; done: number; current: boolean };
  fixes: { title: string; time: string; videoId: string; flagged: boolean } | null;
  nextDrillId: string | null;
};
type RewardRes = { reward: { xp: number; badge: string | null; qn?: number; questName?: string }; nextDrillId: string | null };

/** 14 Drill: timer, "I did this drill", and "Film it for a grade". */
export default function Drill() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, reload, setData } = useApi<D>(`/api/drills/${id}`);
  const total = (data?.drill.minutes ?? 5) * 60;
  const [left, setLeft] = useState<number | null>(null);
  const [on, setOn] = useState(false);
  const [reward, setReward] = useState<RewardRes | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const t = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => () => clearInterval(t.current), []);
  const remain = left ?? total;
  // The time left comes from a clock time, not from counting ticks, so it stays right while the phone is locked.
  const endsAt = useRef(0);
  const toggle = () => {
    if (on) {
      clearInterval(t.current);
      return setOn(false);
    }
    setOn(true);
    endsAt.current = Date.now() + remain * 1000;
    const tick = () => {
      const v = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setLeft(v);
      if (v <= 0) {
        clearInterval(t.current);
        setOn(false);
      }
    };
    t.current = setInterval(tick, 250);
  };
  const reset = () => {
    clearInterval(t.current);
    setOn(false);
    setLeft(null);
  };

  const did = async () => {
    setBusy(true);
    clearInterval(t.current);
    try {
      const r = await api<RewardRes>(`/api/drills/${id}`, { method: "PATCH", body: { done: true } });
      setReward(r);
    } catch (e) {
      setBusy(false);
      notify((e as ApiError).message);
    }
  };

  if (error) return <ErrorState message={error.message} retry={reload} />;
  if (!data) return <Loading />;
  const d = data.drill;

  if (reward) {
    const qn = reward.reward.qn ?? data.quest.done;
    const finished = qn >= 10 || !reward.nextDrillId;
    return (
      <Reward
        tag="Drill complete"
        xp={reward.reward.xp}
        title={`Drill: ${d.title}`}
        quest={{ name: data.quest.name, n: qn }}
        badge={reward.reward.badge}
        badgeIcon={BADGES.find((b) => b.name === reward.reward.badge)?.icon}
        cta={finished ? "Finish quest" : "Next drill"}
        onNext={() => router.replace(finished ? "/quests/path" : `/drills/${reward.nextDrillId}`)}
        secondary={{ label: "Back to quests", onClick: () => router.replace("/quests/path") }}
      />
    );
  }

  const paused = !on && remain < total;
  const accent = paused ? "var(--gold)" : "var(--green)";
  const ring = (603.2 * (1 - remain / total)).toFixed(1);

  return (
    <div className="screen dark" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(4,35,48,.7),rgba(4,35,48,.94) 55%,#042330),var(--court) center 40%/cover" }} />
      <div className="col" style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, padding: "14px 14px 0" }}>
        <button className="icon-btn round" onClick={() => router.push("/quests/path")} aria-label="Back">
          <Icon n="back" />
        </button>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {data.quest.name} · Drill {d.position + 1} of 10 · {d.day}
        </div>
        <span className="xp-tag">+20 XP</span>
      </div>
      <div className="col" style={{ position: "relative", flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "22px 24px 10px", gap: 12 }}>
        <h2 style={{ fontSize: 34, fontWeight: 800, fontStyle: "italic", textTransform: "uppercase", letterSpacing: "-.02em", lineHeight: 1 }}>{d.title}</h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,.82)", lineHeight: 1.45, maxWidth: 300, textWrap: "pretty" }}>{d.how}</p>
        <span className="pill" style={{ background: "rgba(44,224,128,.16)", color: "var(--green)", border: "1.5px solid rgba(44,224,128,.4)" }}>
          Cue: {d.cue}
        </span>
        {data.fixes && (
          <Link href={`/videos/${data.fixes.videoId}`} style={{ fontSize: 13, color: "rgba(255,255,255,.75)", textDecoration: "underline" }}>
            Fixes your tip “{data.fixes.title}” at {data.fixes.time}
          </Link>
        )}
        <div style={{ position: "relative", width: 216, height: 216, marginTop: 14, flexShrink: 0 }}>
          <svg width="216" height="216" viewBox="0 0 216 216" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} aria-hidden="true">
            <circle cx="108" cy="108" r="96" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
            <circle cx="108" cy="108" r="96" fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round" strokeDasharray="603.2" strokeDashoffset={ring} style={{ transition: "stroke-dashoffset 1s linear,stroke .3s" }} />
          </svg>
          <button
            onClick={toggle}
            style={{
              position: "absolute",
              inset: 18,
              borderRadius: "50%",
              border: "none",
              background: paused ? "rgba(255,210,48,.14)" : "rgba(255,255,255,.06)",
              transition: "background .3s",
              color: paused ? "var(--gold)" : "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: 50, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{fmt(remain)}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: accent }}>
              <Icon n={on ? "pause" : "play"} size={12} sw={on ? 3 : 2.2} />
              {on ? "Pause" : remain < total ? "Resume" : "Start"}
            </span>
          </button>
        </div>
        <button onClick={reset} style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "rgba(255,255,255,.7)", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "4px 8px", fontFamily: "inherit" }}>
          <Icon n="refresh" size={15} />
          Reset timer
        </button>
      </div>
      <div className="col" style={{ position: "relative", padding: "12px 16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {d.done ? (
          <button className="btn btn-primary" onClick={() => router.push(data.nextDrillId ? `/drills/${data.nextDrillId}` : "/quests/path")}>
            <Icon n="check" size={24} sw={3} />
            Done · {data.nextDrillId ? "Next drill" : "Back to quest"}
          </button>
        ) : (
          <button className="btn btn-primary" disabled={busy} onClick={did}>
            <Icon n="check" size={24} sw={3} />
            I did this drill
          </button>
        )}
        <button className="btn btn-outline-light" onClick={() => setSheet(true)}>
          <Icon n="camera" />
          <span>Film it for a grade</span>
          <span className="xp-tag sm">+30 XP</span>
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>Warm up first. Stop if anything hurts.</span>
          <button
            onClick={async () => {
              const flagged = !d.flagged;
              setData({ ...data, drill: { ...d, flagged } });
              await api(`/api/drills/${id}`, { method: "PATCH", body: { flagged } }).catch(() => setData(data));
            }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: d.flagged ? "var(--gold)" : "rgba(255,255,255,.7)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
          >
            <Icon n="flag" size={16} />
            {d.flagged ? "Flagged · undo" : "This looks wrong"}
          </button>
        </div>
      </div>
      {sheet && <GradeSheet drillId={d.id} title={d.title} onClose={() => setSheet(false)} />}
    </div>
  );
}

function GradeSheet({ drillId, title, onClose }: { drillId: string; title: string; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const info = await inspect(f);
    setErr(info.error);
    setPicked(info.error ? null : info);
  };
  const go = async () => {
    if (!picked) return;
    setErr(null);
    setPct(0);
    try {
      const vid = await uploadClip(picked, { move: title, kind: "grade", drillId, resumeId: pendingId ?? undefined }, setPct);
      router.push(`/videos/${vid}?watch=1`);
    } catch (e) {
      setErr((e as ApiError).message);
      setPct(null);
      // Reuse the same upload row on "Try again", so no hidden half-uploaded row is left behind.
      try {
        const p = JSON.parse(sessionStorage.getItem("coach:pending-upload") || "null");
        if (p?.id) setPendingId(p.id);
      } catch {}
    }
  };
  const uploading = pct !== null;
  const close = () => !uploading && onClose();

  return (
    <>
      <div className="scrim" onClick={close} />
      <div className="sheet" style={{ gap: 12, padding: "10px 18px 22px" }}>
        <div className="grabber" style={{ marginBottom: 0 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="h-section lg">Get it graded</div>
          <button className="icon-btn light" onClick={close} disabled={uploading} aria-label="Close">
            <Icon n="x" />
          </button>
        </div>
        <div className="muted">Film a few reps of {title}. Your coach will grade it and count the drill as done.</div>
        <input ref={ref} type="file" accept="video/*" onChange={onFile} style={{ display: "none" }} />
        {!picked ? (
          <button type="button" onClick={() => ref.current?.click()} style={{ border: "2px dashed #a1a1aa", borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", background: "transparent", font: "inherit" }}>
            <div className="dot-icon" style={{ width: 44, height: 44 }}>
              <Icon n="upload" />
            </div>
            <div className="row-title" style={{ fontSize: 15 }}>
              Record or choose a clip
            </div>
          </button>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--app)", borderRadius: 14, padding: "8px 10px" }}>
              <div className="thumb" style={{ width: 56, height: 40, borderRadius: 8 }}>
                {picked.durationSec && <span className="dur" style={{ fontSize: 10, left: 3, bottom: 3 }}>{fmt(picked.durationSec)}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-title" style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {picked.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-600)" }}>{picked.size}</div>
              </div>
              {pct === null && (
                <button className="icon-btn" style={{ width: 32, height: 32, color: "var(--ink-700)" }} onClick={() => setPicked(null)} aria-label="Remove clip">
                  <Icon n="x" />
                </button>
              )}
            </div>
            <button className="btn btn-primary" style={{ height: 54, fontSize: 15 }} disabled={pct !== null} onClick={go}>
              {pct === null ? "Upload and get graded" : `Uploading ${Math.round(pct)}%`}
            </button>
          </>
        )}
        {err && <div className="error-box">{err}</div>}
      </div>
    </>
  );
}
