"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { TopBar } from "@/components/ui";
import { FILM_STEPS, fmt } from "@/lib/game";

/** 05 How to film: the pre-game checklist. Reachable from Videos and Upload. */
export default function HowToFilm() {
  const router = useRouter();
  const [pos, setPos] = useState(2);
  const [on, setOn] = useState(false);
  const [step, setStep] = useState(0);
  const t = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => () => clearInterval(t.current), []);
  const toggle = () => {
    if (on) {
      clearInterval(t.current);
      return setOn(false);
    }
    setOn(true);
    let p = pos >= 30 ? 0 : pos;
    setPos(p);
    t.current = setInterval(() => {
      p += 1;
      if (p > 30) {
        clearInterval(t.current);
        setOn(false);
        setPos(30);
        return;
      }
      setPos(p);
      setStep(Math.min(4, Math.floor(p / 6)));
    }, 1000);
  };

  return (
    <div className="screen">
      <TopBar title="Pre-game checklist" back={() => router.back()} />
      <div className="pad g10">
        <div style={{ background: "linear-gradient(160deg,#0b3040,#042330)", borderRadius: 22, padding: "16px 14px", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <span className="pill pill-green sm">Step {step + 1} of 5</span>
          <div style={{ fontWeight: 800, fontSize: 17, textAlign: "center" }}>{FILM_STEPS[step].t}</div>
          <button
            onClick={toggle}
            aria-label={on ? "Pause" : "Play"}
            style={{ width: 54, height: 54, borderRadius: "50%", border: "3px solid #fff", background: "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", margin: "6px 0" }}
          >
            <Icon n={on ? "pause" : "play"} size={24} sw={on ? 3 : 2.2} />
          </button>
          <div style={{ alignSelf: "stretch", fontSize: 12, fontWeight: 700 }}>{fmt(pos)} / 0:30</div>
          <div style={{ alignSelf: "stretch", height: 8, borderRadius: 99, background: "#3f4a50", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 99, background: "var(--green)", width: `${(pos / 30) * 100}%` }} />
            <div style={{ position: "absolute", top: "50%", left: `${(pos / 30) * 100}%`, width: 18, height: 18, borderRadius: "50%", background: "var(--green)", transform: "translate(-50%,-50%)" }} />
          </div>
        </div>
        <h3 className="h-section lg" style={{ margin: "8px 0 2px" }}>
          Get a clip I can coach
        </h3>
        {FILM_STEPS.map((c, i) => (
          <button
            key={c.t}
            className="row"
            onClick={() => {
              setStep(i);
              setPos(i * 6);
            }}
          >
            <div className="dot-icon" style={{ width: 40, height: 40, boxShadow: i === step ? "0 0 0 3px var(--green)" : undefined }}>
              <Icon n={c.icon} size={20} />
            </div>
            <div>
              <div className="row-title" style={{ fontSize: 15 }}>
                {c.t}
              </div>
              <div className="row-sub">{c.d}</div>
            </div>
          </button>
        ))}
        <button className="btn btn-primary" style={{ marginTop: 4 }} onClick={() => (new URLSearchParams(location.search).get("from") === "upload" ? router.back() : router.push("/videos/upload"))}>
          Got it, upload
        </button>
      </div>
    </div>
  );
}
