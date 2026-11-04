/* Icons and logo from the design prototype. */

type P = [string, Record<string, string | number>][];

const PATHS: Record<string, P> = {
  back: [["path", { d: "M15 18l-6-6 6-6" }]],
  chev: [["path", { d: "M9 6l6 6-6 6" }]],
  camera: [["path", { d: "M4 8h3l2-3h6l2 3h3v11H4z" }], ["circle", { cx: 12, cy: 13, r: 3.5 }]],
  user: [["circle", { cx: 12, cy: 8, r: 4 }], ["path", { d: "M5 21a7 7 0 0 1 14 0" }]],
  target: [["circle", { cx: 12, cy: 12, r: 9 }], ["circle", { cx: 12, cy: 12, r: 5 }], ["circle", { cx: 12, cy: 12, r: 1.5 }]],
  clock: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 7v5l3 2" }]],
  bolt: [["path", { d: "M13 2L4 14h7l-1 8 9-12h-7z", fill: "currentColor" }]],
  upload: [["path", { d: "M12 16V4M7 9l5-5 5 5M5 20h14" }]],
  play: [["path", { d: "M8 5v14l11-7z", fill: "currentColor" }]],
  pause: [["path", { d: "M8 5v14M16 5v14" }]],
  flag: [["path", { d: "M5 21V4h11l-2 4 2 4H5" }]],
  chat: [["path", { d: "M4 5h16v11H9l-5 4z" }]],
  info: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 11v5M12 8h.01" }]],
  check: [["path", { d: "M5 12l5 5 9-10" }]],
  x: [["path", { d: "M6 6l12 12M18 6L6 18" }]],
  lock: [["rect", { x: 6, y: 11, width: 12, height: 9, rx: 2 }], ["path", { d: "M9 11V8a3 3 0 0 1 6 0v3" }]],
  trophy: [["path", { d: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" }]],
  paddle: [["ellipse", { cx: 13, cy: 8.5, rx: 5, ry: 6 }], ["path", { d: "M10.5 14L8 21" }]],
  journey: [["circle", { cx: 6, cy: 18, r: 2 }], ["circle", { cx: 18, cy: 6, r: 2 }], ["path", { d: "M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6" }]],
  video: [["rect", { x: 3, y: 5, width: 18, height: 14, rx: 3 }], ["path", { d: "M10 9v6l5-3z" }]],
  swap: [["path", { d: "M4 9h15l-4-4M20 15H5l4 4" }]],
  eye: [["path", { d: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" }], ["circle", { cx: 12, cy: 12, r: 3 }]],
  refresh: [["path", { d: "M20 12a8 8 0 1 1-3-6.2M20 4v5h-5" }]],
  send: [["path", { d: "M21 3L3 10l7 3 3 7z", fill: "currentColor" }]],
  flame: [["path", { d: "M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 3-6 1 2 2 2 3 2 0-3-1-5 0-7z", fill: "currentColor", stroke: "none" }]],
  star: [["path", { d: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", fill: "currentColor", stroke: "none" }]],
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
};

export type IconName = keyof typeof PATHS;

export function Icon({ n, size = 22, color, sw = 2.2 }: { n: IconName | string; size?: number; color?: string; sw?: number }) {
  const parts = PATHS[n] ?? PATHS.info;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || "currentColor"}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden="true"
    >
      {parts.map(([tag, attrs], i) => {
        const Tag = tag as "path";
        return <Tag key={i} {...(attrs as object)} />;
      })}
    </svg>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  const id = `lg${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block" }} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#9fb0b7" />
        </linearGradient>
      </defs>
      <path d="M8 31L20 9l12 22" fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 29l6-7 6 7" fill="none" stroke={`url(#${id})`} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
    </svg>
  );
}
