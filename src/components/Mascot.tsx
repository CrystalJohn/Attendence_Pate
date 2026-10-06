import { useId } from "react";
import { mascotById, type MascotCharacter } from "../domain/mascots";
import { isMascotId, type MascotId, type MascotState } from "../domain/mascotIds";
const INK = "#231c33";
const ARM: Record<MascotState, [number, number]> = {
  idle: [24, -24], selected: [24, -140], encouraging: [20, -168], celebrating: [148, -148], listening: [20, 128],
};

function MascotDrawing({ c, size = 200, active = false, pose, still = false }: { c: MascotCharacter; size?: number; active?: boolean; pose?: MascotState; still?: boolean }) {
  const p: MascotState = pose ?? (active ? "selected" : "idle");
  active = p === "selected" || p === "celebrating";
  const tilt = p === "listening" ? 7 : p === "encouraging" ? -4 : 0;
  const u = useId().replace(/:/g, "");
  const g = (k: string) => `${u}${k}`;
  const [lx, rx] = [100 - c.eyeGap, 100 + c.eyeGap];
  const ey = c.face;

  const limb = (sx: number, side: "l" | "r") => {
    const raised = p === "selected" && side === "r" && !still;
    return (
      <g style={raised ? { transformOrigin: `${sx}px ${c.armY}px`, animation: "mascot-wave 1s ease-in-out infinite" } : undefined}
        transform={raised ? undefined : `rotate(${ARM[p][side === "l" ? 0 : 1]} ${sx} ${c.armY})`}>
        <rect x={sx - 9} y={c.armY - 4} width="18" height="34" rx="9" fill={`url(#${g("limb")})`} />
        <circle cx={sx} cy={c.armY + 28} r="10" fill={`url(#${g("hand")})`} />
        <circle cx={sx - 3} cy={c.armY + 24} r="3" fill="#fff" opacity=".45" />
      </g>
    );
  };

  const lk = p === "listening" ? [-2, 2] : p === "encouraging" ? [1, -1] : [0, 0];
  const eye = (cx: number) =>
    active ? (
      <path d={`M${cx - 11} ${ey + 3} Q${cx} ${ey - 10} ${cx + 11} ${ey + 3}`} stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
    ) : (
      <g className="blink">
        <ellipse cx={cx} cy={ey} rx="13.5" ry="16" fill={`url(#${g("white")})`} />
        <circle cx={cx + 1 + lk[0]} cy={ey + 2 + lk[1]} r="10" fill={`url(#${g("iris")})`} />
        <circle cx={cx + 1 + lk[0]} cy={ey + 3 + lk[1]} r="5.5" fill={INK} />
        <ellipse cx={cx + 4.5 + lk[0]} cy={ey - 3 + lk[1]} rx="4" ry="4.6" fill="#fff" />
        <circle cx={cx - 3 + lk[0]} cy={ey + 7 + lk[1]} r="1.8" fill="#fff" opacity=".9" />
        {p === "listening" && <path d={`M${cx - 15} ${ey - 4} Q${cx} ${ey - 11} ${cx + 15} ${ey - 4} L${cx + 15} ${ey - 19} L${cx - 15} ${ey - 19}Z`} fill={c.body} />}
        {p === "listening" && <path d={`M${cx - 13} ${ey - 4} Q${cx} ${ey - 10} ${cx + 13} ${ey - 4}`} stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />}
      </g>
    );

  return (
    <svg viewBox="0 0 200 228" width={size} height={size * 1.14} className={`mascot-svg ${still ? "mascot-still" : ""}`} aria-hidden>
      <defs>
        <radialGradient id={g("body")} cx="34%" cy="26%" r="85%">
          <stop offset="0" stopColor={c.light} /><stop offset=".42" stopColor={c.body} /><stop offset="1" stopColor={c.deep} />
        </radialGradient>
        <linearGradient id={g("rim")} x1="0" x2="1">
          <stop offset=".55" stopColor={c.rim} stopOpacity="0" /><stop offset="1" stopColor={c.rim} stopOpacity=".95" />
        </linearGradient>
        <linearGradient id={g("ao")} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".6" stopColor={c.deep} stopOpacity="0" /><stop offset="1" stopColor={c.deep} stopOpacity=".55" />
        </linearGradient>
        <linearGradient id={g("limb")} x1="0" x2="1"><stop offset="0" stopColor={c.body} /><stop offset="1" stopColor={c.deep} /></linearGradient>
        <radialGradient id={g("hand")} cx="35%" cy="30%"><stop offset="0" stopColor={c.light} /><stop offset=".6" stopColor={c.body} /><stop offset="1" stopColor={c.deep} /></radialGradient>
        <radialGradient id={g("white")} cx="40%" cy="30%"><stop offset=".6" stopColor="#fff" /><stop offset="1" stopColor="#dfe3ee" /></radialGradient>
        <radialGradient id={g("iris")} cx="50%" cy="70%"><stop offset="0" stopColor={c.body} /><stop offset="1" stopColor={c.iris} /></radialGradient>
        <clipPath id={g("clip")}><path d={c.path} /></clipPath>
        <filter id={g("blur")} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
        <filter id={g("soft")} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" /></filter>
        <linearGradient id={g("leafG")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8fe0a6" /><stop offset="1" stopColor="#2a9a62" /></linearGradient>
        <radialGradient id={g("sparkGlow")}><stop offset="0" stopColor="#ffe27a" stopOpacity=".7" /><stop offset="1" stopColor="#ffe27a" stopOpacity="0" /></radialGradient>
      </defs>

      <ellipse cx="100" cy="218" rx={active ? 40 : 50} ry="7" fill={c.deep} opacity=".22" filter={`url(#${g("soft")})`} />
      <g className={active ? "hop" : "bob"}>
        <g transform={`rotate(${tilt} 100 200)`}>
        {c.back?.(c, u)}
        {[c.feet[0], c.feet[1]].map((x) => (
          <g key={x}>
            <rect x={x - 11} y="186" width="22" height="26" rx="11" fill={`url(#${g("limb")})`} />
            <ellipse cx={x - 3} cy="196" rx="4" ry="5" fill="#fff" opacity=".25" />
          </g>
        ))}
        {limb(c.shoulders[0], "l")}
        <path d={c.path} fill={`url(#${g("body")})`} />
        <g clipPath={`url(#${g("clip")})`}>
          <path d={c.path} fill={`url(#${g("ao")})`} />
          <path d={c.path} fill="none" stroke={`url(#${g("rim")})`} strokeWidth="10" filter={`url(#${g("soft")})`} />
          <ellipse cx="72" cy={ey - 42} rx="26" ry="14" fill="#fff" opacity=".55" filter={`url(#${g("blur")})`} transform={`rotate(-24 72 ${ey - 42})`} />
          <ellipse cx="100" cy="188" rx="40" ry="10" fill={c.light} opacity=".25" filter={`url(#${g("blur")})`} />
        </g>
        <ellipse cx="66" cy={ey - 48} rx="9" ry="4.5" fill="#fff" opacity=".85" transform={`rotate(-30 66 ${ey - 48})`} />
        {c.front?.(c, u)}
        <ellipse cx={lx - 13} cy={ey + 22} rx="10" ry="5.5" fill={c.cheek} opacity={active ? 0.55 : 0.35} filter={`url(#${g("soft")})`} />
        <ellipse cx={rx + 13} cy={ey + 22} rx="10" ry="5.5" fill={c.cheek} opacity={active ? 0.55 : 0.35} filter={`url(#${g("soft")})`} />
        {eye(lx)}{eye(rx)}
        {p === "celebrating" ? (
          <g>
            <path d={`M85 ${ey + 20} Q100 ${ey + 48} 115 ${ey + 20} Z`} fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <path d={`M92 ${ey + 33} Q100 ${ey + 28} 108 ${ey + 33} Q100 ${ey + 40} 92 ${ey + 33}Z`} fill="#ff6f86" />
          </g>
        ) : p === "encouraging" ? (
          <path d={`M86 ${ey + 21} Q100 ${ey + 36} 114 ${ey + 21}`} stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
        ) : p === "listening" ? (
          <path d={`M93 ${ey + 24} Q100 ${ey + 30} 107 ${ey + 24}`} stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
        ) : active ? (
          <g>
            <path d={`M88 ${ey + 22} Q100 ${ey + 42} 112 ${ey + 22} Z`} fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <path d={`M94 ${ey + 31} Q100 ${ey + 27} 106 ${ey + 31} Q100 ${ey + 36} 94 ${ey + 31}Z`} fill="#ff6f86" />
          </g>
        ) : (
          <path d={`M90 ${ey + 22} Q100 ${ey + 32} 110 ${ey + 22}`} stroke={INK} strokeWidth="4.5" fill="none" strokeLinecap="round" />
        )}
        {limb(c.shoulders[1], "r")}
        </g>
        {p === "celebrating" && (
          <g>
            <path d="M22 40 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4Z" fill={c.light} stroke={c.body} strokeWidth="1.5" />
            <path d="M176 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z" fill={c.light} stroke={c.body} strokeWidth="1.5" />
            <circle cx="160" cy="86" r="4" fill={c.body} /><circle cx="36" cy="96" r="3" fill={c.deep} opacity=".6" />
          </g>
        )}
        {p === "encouraging" && <path d="M184 66 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3Z" fill={c.light} stroke={c.body} strokeWidth="1.5" />}
        {p === "listening" && (
          <g stroke={c.deep} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".45">
            <path d="M20 112 q-6 10 0 20" /><path d="M10 106 q-10 16 0 32" />
          </g>
        )}
      </g>
    </svg>
  );
}


export function Mascot({ id, state = 'idle', size = 96, animated = false }: { id: MascotId; state?: MascotState; size?: number; animated?: boolean }) {
  return <span className="mascot-frame" style={{width:size,height:size}}><MascotDrawing c={mascotById(id)} pose={state} size={size * .84} still={!animated} /></span>;
}
export function MascotAvatar({ id, fallback, size = 36, state = 'idle' }: { id?: string; fallback: string; size?: number; state?: MascotState }) {
  return isMascotId(id) ? <Mascot id={id} state={state} size={size} /> : <>{fallback}</>;
}
