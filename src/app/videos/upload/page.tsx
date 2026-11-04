"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Bar, Check, Note, Thumb, TopBar } from "@/components/ui";
import { api, ApiError } from "@/lib/client";
import { fmt } from "@/lib/game";
import { MOVES } from "@/lib/knowledge/pickleball";
import { inspect, uploadClip, type PickedFile } from "@/lib/upload";

/** 06 Upload: pick the move and the clip, agree, then "Upload and get my review". */
function Upload() {
  const router = useRouter();
  const resume = useSearchParams().get("resume");
  const fileRef = useRef<HTMLInputElement>(null);
  const [move, setMove] = useState("Dink");
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(resume);

  useEffect(() => {
    if (!resume) return;
    api<{ video: { move: string } }>(`/api/videos/${resume}`)
      .then((d) => setMove(d.video.move))
      .catch(() => setPendingId(null));
  }, [resume]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr(null);
    const info = await inspect(f);
    if (info.error) {
      setPicked(null);
      setErr(info.error);
      return;
    }
    setPicked(info);
  };

  const ready = !!picked && consent && move.trim().length > 0 && !busy;
  const go = async () => {
    if (!picked || busy) return;
    setBusy(true);
    setErr(null);
    setPct(0);
    try {
      const id = await uploadClip(picked, { move: move.trim(), resumeId: pendingId ?? undefined }, setPct);
      router.replace(`/videos/${id}?watch=1`);
    } catch (e) {
      setErr((e as ApiError).message || "The upload dropped. Try again.");
      try {
        const p = JSON.parse(sessionStorage.getItem("coach:pending-upload") || "null");
        if (p?.id) setPendingId(p.id);
      } catch {}
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <TopBar title="Upload a video" back={() => router.back()} />
      <div className="pad">
        {resume && pendingId && (
          <div className="banner">
            <Icon n="refresh" />
            <span>Picking up where you left off. Pick the same clip again to finish.</span>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label className="label" htmlFor="move">
            The move in this clip
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MOVES.map((m) => (
              <button key={m} type="button" className={`seg${move === m ? " on" : ""}`} style={{ height: 40, padding: "0 14px", borderRadius: 999, fontSize: 13 }} onClick={() => setMove(m)}>
                {m}
              </button>
            ))}
          </div>
          <input id="move" className="input" placeholder="Type the move, e.g. Dink" value={move} onChange={(e) => setMove(e.target.value)} maxLength={40} />
        </div>

        <input ref={fileRef} type="file" accept="video/*" onChange={onFile} style={{ display: "none" }} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          style={{ border: "3px dashed #a1a1aa", borderRadius: 22, padding: "22px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", cursor: "pointer", background: "transparent", font: "inherit" }}
        >
          <div className="dot-icon" style={{ width: 52, height: 52 }}>
            <Icon n="camera" />
          </div>
          <div className="row-title">{picked ? "Choose a different video" : "Record or choose a video"}</div>
          <div className="small" style={{ lineHeight: 1.45 }}>
            From your camera or camera roll. About 30 seconds, up to 35.
          </div>
        </button>

        {picked && (
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Thumb />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row-title" style={{ fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {picked.name}
              </div>
              <div className="row-sub">
                {picked.size}
                {picked.durationSec ? ` · ${fmt(picked.durationSec)}` : ""}
              </div>
            </div>
            {!busy && (
              <button className="icon-btn" onClick={() => setPicked(null)} aria-label="Remove clip" style={{ color: "var(--ink-700)" }}>
                <Icon n="x" />
              </button>
            )}
          </div>
        )}

        <button className="check-row" onClick={() => setConsent(!consent)} aria-pressed={consent}>
          <Check on={consent} />
          <div style={{ fontSize: 14, color: "var(--ink-700)", lineHeight: 1.45 }}>I&apos;m the player in this clip and I&apos;m happy for my coach to review it.</div>
        </button>

        {err && (
          <div className="error-box" role="alert">
            <Icon n="info" />
            <span>{err}</span>
          </div>
        )}

        {busy ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>
              <span>{pct < 100 ? "Uploading…" : "Starting your review…"}</span>
              <span>{Math.round(pct)}%</span>
            </div>
            <Bar pct={pct} h={12} />
          </div>
        ) : (
          <button className="btn btn-primary" disabled={!ready} onClick={go}>
            {err && picked ? "Try again" : "Upload and get my review"}
          </button>
        )}

        <Note>
          Tip: film sideways with your whole body in frame.{" "}
          <Link href="/film?from=upload" style={{ fontWeight: 800, color: "var(--ink-700)" }}>
            How to film
          </Link>
        </Note>
        <div className="small" style={{ lineHeight: 1.45 }}>
          Your clip is private. Only you can play it, and your coach (the AI) watches it to write your tips.
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Upload />
    </Suspense>
  );
}
