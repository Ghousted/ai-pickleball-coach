"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { fmt } from "@/lib/game";
import { Icon, Logo } from "./icons";

export function TopBar({ title, back, right, sticky }: { title: ReactNode; back?: string | (() => void); right?: ReactNode; sticky?: boolean }) {
  const router = useRouter();
  const onBack = () => (typeof back === "function" ? back() : back ? router.push(back) : router.back());
  return (
    <div className={`topbar${sticky ? " sticky" : ""}`}>
      {back !== undefined && (
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <Icon n="back" />
        </button>
      )}
      <div className="title">{title}</div>
      {right}
    </div>
  );
}

export function Avatar({ size = 56, logo = 30, border = 3 }: { size?: number; logo?: number; border?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size, borderWidth: border }}>
      <Logo size={logo} />
    </div>
  );
}

export function CoachSays({ children, size = 56 }: { children: ReactNode; size?: number }) {
  return (
    <div className="coach">
      <Avatar size={size} logo={size >= 52 ? 30 : 22} />
      <div className="bubble">{children}</div>
    </div>
  );
}

export function Bar({ pct, tone, h = 10, style }: { pct: number; tone?: "dark" | "glass"; h?: number; style?: CSSProperties }) {
  return (
    <div className={`bar${tone ? " " + tone : ""}`} style={{ height: h, ...style }}>
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Note({ children, icon = "info" }: { children: ReactNode; icon?: string }) {
  return (
    <div className="note">
      <div>
        <Icon n={icon} />
      </div>
      <div>{children}</div>
    </div>
  );
}

export function Thumb({ src, dur, w = 68, h = 50 }: { src?: string; dur?: number; w?: number; h?: number }) {
  return (
    <div className="thumb" style={{ width: w, height: h }}>
      {src && <video src={`${src}#t=0.5`} preload="metadata" muted playsInline />}
      {dur !== undefined && <span className="dur">{fmt(dur)}</span>}
    </div>
  );
}

export function Check({ on }: { on: boolean }) {
  return <div className={`checkbox${on ? " on" : ""}`}>{on && <Icon n="check" size={16} sw={3} />}</div>;
}

export function Loading() {
  return (
    <div className="pad">
      <div className="skeleton" style={{ height: 120 }} />
      <div className="skeleton" style={{ height: 56 }} />
      <div className="skeleton" style={{ height: 56 }} />
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="pad center" style={{ alignItems: "center", paddingTop: 40 }}>
      <div className="dot-icon" style={{ width: 56, height: 56, background: "#fbe3e7", color: "var(--red)" }}>
        <Icon n="refresh" />
      </div>
      <div className="strong" style={{ fontSize: 18 }}>{message}</div>
      {retry && (
        <button className="btn btn-primary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function CourtLines() {
  return (
    <div className="court-lines">
      <i style={{ left: "50%", top: 0, height: "30%", borderLeftWidth: 3 }} />
      <i style={{ left: "50%", bottom: 0, height: "30%", borderLeftWidth: 3 }} />
      <i style={{ left: 0, right: 0, top: "30%", borderTopWidth: 3 }} />
      <i style={{ left: 0, right: 0, top: "50%", borderTopWidth: 3 }} />
      <i style={{ left: 0, right: 0, top: "70%", borderTopWidth: 3 }} />
    </div>
  );
}

export function RowLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`row ${className}`} style={{ textDecoration: "none" }}>
      {children}
    </Link>
  );
}

export function BadgeCoin({ size = 46, icon, on = true }: { size?: number; icon: string; on?: boolean }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: on ? "var(--gold)" : "#f4f4f5",
        border: on ? "3px solid var(--navy)" : "3px dashed #a1a1aa",
        color: on ? "var(--navy)" : "#8a8a93",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {on && <div style={{ position: "absolute", inset: 3, borderRadius: "50%", border: "2px dotted rgba(4,35,48,.7)" }} />}
      <Icon n={icon} size={Math.round(size * 0.45)} />
    </div>
  );
}
