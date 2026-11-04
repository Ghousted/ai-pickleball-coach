"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Avatar, ErrorState, Loading, TopBar } from "@/components/ui";
import { api, ApiError, notify, useApi } from "@/lib/client";

type Chat = { tag: string; chips: string[]; messages: { id: string; role: "coach" | "me"; text: string }[] };

/** 11 Coach chat. A thread is "general" or one video's review. */
function CoachChat() {
  const router = useRouter();
  const thread = useSearchParams().get("thread") || "general";
  const { data, error, reload, setData } = useApi<Chat>(`/api/chat?thread=${encodeURIComponent(thread)}`);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data, typing]);

  const send = async (text: string) => {
    text = text.trim();
    if (!text || typing || !data) return;
    setDraft("");
    setData({ ...data, messages: [...data.messages, { id: "tmp", role: "me", text }] });
    setTyping(true);
    try {
      await api("/api/chat", { body: { thread, text } });
    } catch (e) {
      notify((e as ApiError).message);
    }
    await reload();
    setTyping(false);
  };

  if (error) return <ErrorState message={error.message} retry={reload} />;
  if (!data) return <Loading />;

  return (
    <div className="screen plain" style={{ overflow: "hidden" }}>
      <TopBar title="Your coach" back={() => router.back()} right={<span className="pill pill-gold">{data.tag}</span>} />
      <div ref={scroller} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px var(--gutter)", display: "flex", flexDirection: "column", gap: 14 }} aria-live="polite">
        {data.messages.map((m, i) =>
          m.role === "coach" ? (
            <div key={m.id + i} style={{ display: "flex", gap: 8, alignItems: "flex-start", paddingRight: 36 }}>
              <Avatar size={38} logo={22} />
              <div className="bubble" style={{ fontSize: 14, lineHeight: 1.5, textWrap: "pretty" }}>
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id + i} style={{ alignSelf: "flex-end", maxWidth: "80%", background: "var(--navy)", color: "#fff", borderRadius: "18px 18px 4px 18px", padding: "12px 14px", fontSize: 14, lineHeight: 1.45 }}>
              {m.text}
            </div>
          ),
        )}
        {typing && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Avatar size={38} logo={22} />
            <div style={{ background: "#fff", border: "2px solid var(--line)", borderRadius: 18, padding: "14px 16px", display: "flex", gap: 5 }} aria-label="Coach is typing">
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ink-600)", animation: `aiDot 1.2s ${i * 0.15}s infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px var(--gutter)", flexShrink: 0 }}>
        {data.chips.map((c) => (
          <button key={c} onClick={() => send(c)} disabled={typing} style={{ flexShrink: 0, height: 42, padding: "0 16px", borderRadius: 999, whiteSpace: "nowrap", border: "2px solid var(--navy)", background: "#fff", color: "var(--navy)", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            {c}
          </button>
        ))}
      </div>
      <form
        style={{ display: "flex", gap: 10, padding: "8px var(--gutter) 16px", flexShrink: 0 }}
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <input
          placeholder="Ask your coach…"
          aria-label="Ask your coach"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          style={{ flex: 1, minWidth: 0, height: 48, border: "2px solid var(--navy)", borderRadius: 16, padding: "0 16px", font: "500 15px var(--font-body)", outline: "none", background: "#fff" }}
        />
        <button type="submit" className="btn btn-primary" style={{ width: 52, height: 48, borderRadius: 14 }} aria-label="Send" disabled={typing || !draft.trim()}>
          <Icon n="send" />
        </button>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <CoachChat />
    </Suspense>
  );
}
