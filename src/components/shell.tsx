"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { markInAppNavigation, useApi } from "@/lib/client";
import { Icon, Logo } from "./icons";

export type Me = {
  signedIn: boolean;
  ai?: string;
  storage?: "blob" | "local";
  user?: { name: string; email: string };
  profile?: { id: string; name: string; sport: string; level: string; playDays: string[]; goal: string | null; xp: number; hideWizard: boolean } | null;
  level?: { n: number; name: string; lo: number; hi: number; nextName: string; pct: number };
  streak?: number;
  badges?: Record<string, string>;
  stats?: { videos: number; drills: number; badges: number; flagged: number };
  questProgress?: Record<string, number>;
};

const MeCtx = createContext<{ me: Me | null; meError: string | null; reload: () => void }>({ me: null, meError: null, reload: () => {} });
export const useMe = () => useContext(MeCtx);

const TAB_ROOTS = ["/quests", "/videos", "/journey", "/you"];
const TABS = [
  { href: "/quests", label: "Quests", icon: "paddle" },
  { href: "/videos", label: "Videos", icon: "video" },
  { href: "/journey", label: "Journey", icon: "journey" },
  { href: "/you", label: "You", icon: "user" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { data: me, error: meErr, reload } = useApi<Me>("/api/me");
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);
  const queue = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Toasts: one at a time, each for 2.6 s (as in the design).
  const showing = useRef(false);
  const showNext = useCallback(function next() {
    clearTimeout(timer.current);
    const msg = queue.current.shift();
    if (!msg) {
      showing.current = false;
      setToast(null);
      return;
    }
    showing.current = true;
    setToast({ msg, id: Math.random() });
    timer.current = setTimeout(next, 2600);
  }, []);
  useEffect(() => {
    const onNotes = (e: Event) => {
      queue.current.push(...(e as CustomEvent<string[]>).detail);
      if (!showing.current) showNext();
    };
    window.addEventListener("coach:notes", onNotes);
    return () => window.removeEventListener("coach:notes", onNotes);
  }, [showNext]);
  const dismissToast = () => showNext(); // the next note in the queue still shows

  // Screen transitions: tab switch, forward, or back (browser back button).
  const [dir, setDir] = useState("tab");
  const prev = useRef(path);
  const popped = useRef(false);
  useEffect(() => {
    const onPop = () => (popped.current = true);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (prev.current === path) return;
    markInAppNavigation();
    const tabToTab = TAB_ROOTS.includes(path) && TAB_ROOTS.some((t) => prev.current.startsWith(t)) && !path.startsWith(prev.current + "/");
    setDir(popped.current ? "back" : tabToTab ? "tab" : "fwd");
    popped.current = false;
    prev.current = path;
  }, [path]);

  // Send signed-in players without a profile to setup.
  useEffect(() => {
    if (me?.signedIn && me.profile === null && path !== "/setup") router.replace("/setup");
  }, [me, path, router]);

  const showTabs = TAB_ROOTS.includes(path) || path === "/quests/path";
  const showHdr = TAB_ROOTS.includes(path);
  const dark = path === "/quests/path";
  const L = me?.level;

  return (
    <MeCtx.Provider value={{ me, meError: meErr?.message ?? null, reload }}>
      <div className="stage">
        <div className="app">
          {showHdr && L && (
            <div className="hdr">
              <div className="lvl-coin">{L.n}</div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, fontWeight: 800, color: "var(--navy)" }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{L.name}</span>
                  <span style={{ whiteSpace: "nowrap", color: "var(--ink-600)", fontWeight: 700 }}>
                    {me?.profile?.xp} / {L.hi} XP
                  </span>
                </div>
                <div className="bar" style={{ height: 6 }}>
                  <i style={{ width: `${L.pct}%` }} />
                </div>
              </div>
              <div className="streak" title="Weeks in a row">
                <Icon n="flame" size={14} color="var(--orange)" />
                <span>{me?.streak ?? 0}</span>
              </div>
            </div>
          )}

          <div className="viewport">
            <div key={path} className={`anim anim-${dir}`}>
              {children}
            </div>

            {showTabs && (
              <Link href="/chat?thread=general" className="fab" aria-label="Ask your coach" style={{ bottom: (dark ? 96 : 16) + (toast ? 70 : 0) }}>
                <Logo size={30} />
                <span className="badge">
                  <Icon n="chat" size={14} sw={2.6} />
                </span>
              </Link>
            )}
            {toast && (
              <div className="toast" key={toast.id} role="status">
                <Icon n="star" size={20} />
                <span style={{ flex: 1 }}>{toast.msg}</span>
                <button aria-label="Dismiss" onClick={dismissToast}>
                  <Icon n="x" />
                </button>
              </div>
            )}
          </div>

          {showTabs && (
            <nav className={`tabs${dark ? " dark" : ""}`}>
              {TABS.map((t) => {
                const on = path === t.href || (t.href === "/quests" && path === "/quests/path");
                return (
                  <Link key={t.href} href={t.href} className={`tab${on ? " on" : ""}`}>
                    <Icon n={t.icon} />
                    <span>{t.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </MeCtx.Provider>
  );
}
