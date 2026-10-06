import type { ReactNode } from "react";
import type { MascotId } from "./mascotIds";
export type MascotCharacter = {
  id: MascotId; name: string; element: string; value: string; trait: string; line: string;
  light: string; body: string; deep: string; rim: string; iris: string; cheek: string; bg: string;
  path: string; shoulders: [number, number]; armY: number; feet: [number, number]; face: number; eyeGap: number;
  back?: (c: MascotCharacter, g: string) => ReactNode; front?: (c: MascotCharacter, g: string) => ReactNode;
};



export const MASCOTS: MascotCharacter[] = [
  {
    id: "pip", name: "Pip", element: "Seed · Sprout", value: "Growth & encouragement", trait: "Curious, upbeat, first to cheer",
    line: "Small beginnings are still beginnings. Let's grow together.",
    light: "#ffd2b0", body: "#ff8e5e", deep: "#c94f2c", rim: "#ffe9a8", iris: "#6b3a1f", cheek: "#ff5f5f", bg: "#fff0e4",
    path: "M100 46 C146 46 166 94 164 136 C162 178 138 198 100 198 C62 198 38 178 36 136 C34 94 54 46 100 46Z",
    shoulders: [40, 160], armY: 138, feet: [80, 120], face: 116, eyeGap: 26,
    back: (_c, g) => (
      <g className="sway">
        <path d="M100 50 Q98 34 102 20" stroke="#2a8a5a" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M101 25 C88 10 68 14 64 23 C75 34 92 33 101 25Z" fill={`url(#${g}leafG)`} />
        <path d="M102 22 C108 5 130 1 138 8 C132 23 114 27 102 22Z" fill={`url(#${g}leafG)`} />
        <path d="M110 16 Q120 9 130 8" stroke="#d6ffe6" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".8" />
      </g>
    ),
  },
  {
    id: "dew", name: "Dew", element: "Water", value: "Peace & listening", trait: "Calm, gentle, a soft place to land",
    line: "Take a breath. I'm here, and I'm listening.",
    light: "#c8f1ff", body: "#4cb8ec", deep: "#1f6fb8", rim: "#e6fbff", iris: "#123f78", cheek: "#7ab8ff", bg: "#e6f5fc",
    path: "M100 26 C114 58 166 92 166 138 C166 180 138 200 100 200 C62 200 34 180 34 138 C34 92 86 58 100 26Z",
    shoulders: [38, 162], armY: 144, feet: [80, 120], face: 124, eyeGap: 27,
    front: (c) => (
      <g fill="#fff" opacity=".9">
        <path d="M150 34 C156 44 160 48 160 54 C160 60 154 63 150 63 C146 63 140 60 140 54 C140 48 144 44 150 34Z" fill={c.body} opacity=".75" />
        <ellipse cx="146" cy="50" rx="2.5" ry="4" />
        <circle cx="56" cy="62" r="5" fill={c.light} opacity=".8" />
      </g>
    ),
  },
  {
    id: "spark", name: "Spark", element: "Light", value: "Joy & celebration", trait: "Bright, bubbly, turns any day into a party",
    line: "Every small win deserves a little sparkle!",
    light: "#fff7c4", body: "#ffc93c", deep: "#e88a12", rim: "#ffffff", iris: "#7a3c00", cheek: "#ff8a3c", bg: "#fff6dc",
    path: "M100 54 C148 54 164 96 164 138 C164 180 138 198 100 198 C62 198 36 180 36 138 C36 96 52 54 100 54Z",
    shoulders: [40, 160], armY: 142, feet: [80, 120], face: 122, eyeGap: 26,
    back: (c, g) => (
      <g>
        <circle cx="100" cy="124" r="92" fill={`url(#${g}sparkGlow)`} className="glow" />
        <path d="M100 62 C88 48 92 34 102 18 C104 30 114 34 116 46 C118 56 110 62 100 62Z" fill={c.body} />
        <path d="M101 58 C95 50 97 40 102 32 C104 40 109 44 108 50 C108 55 105 58 101 58Z" fill="#fffbe0" />
      </g>
    ),
    front: (c) => (
      <g fill={c.light}>
        <path d="M30 70 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z" />
        <path d="M172 60 l2.5 5 5 2.5 -5 2.5 -2.5 5 -2.5 -5 -5 -2.5 5 -2.5Z" fill="#fff" />
      </g>
    ),
  },
  {
    id: "peb", name: "Peb", element: "Earth · Stone", value: "Steadiness & strength", trait: "Loyal, grounded, always shows up",
    line: "Rough week? Lean on me. I'm not going anywhere.",
    light: "#d9d2c6", body: "#9c8f80", deep: "#5d5348", rim: "#fff1d6", iris: "#3a2c20", cheek: "#e08a6e", bg: "#efece6",
    path: "M96 74 C150 70 178 104 176 148 C174 186 142 200 100 200 C58 200 24 188 24 150 C24 108 50 78 96 74Z",
    shoulders: [28, 172], armY: 152, feet: [74, 126], face: 136, eyeGap: 30,
    back: () => (
      <g>
        <ellipse cx="92" cy="76" rx="26" ry="9" fill="#5fae5a" />
        <circle cx="76" cy="72" r="8" fill="#6fc06a" /><circle cx="92" cy="67" r="10" fill="#7fcc76" /><circle cx="108" cy="72" r="8" fill="#6fc06a" />
        <circle cx="90" cy="64" r="3" fill="#c9f2bf" />
      </g>
    ),
    front: (c) => (
      <g fill={c.deep} opacity=".22">
        <circle cx="52" cy="176" r="5" /><circle cx="150" cy="110" r="4" /><circle cx="156" cy="172" r="6" /><circle cx="44" cy="124" r="3" />
      </g>
    ),
  },
  {
    id: "breeze", name: "Breeze", element: "Air · Cloud", value: "Hope & lightness", trait: "Dreamy, optimistic, lifts the mood",
    line: "Clouds pass. Look up, there's sky behind them.",
    light: "#ffffff", body: "#d9dcff", deep: "#8a8fe0", rim: "#ffffff", iris: "#3a3a8a", cheek: "#ff9ec8", bg: "#eef0ff",
    path: "M60 96 C52 70 82 56 98 70 C106 48 142 50 146 78 C170 80 176 108 164 124 C176 150 162 192 100 194 C40 192 26 152 38 126 C22 110 34 90 60 96Z",
    shoulders: [36, 164], armY: 144, feet: [82, 118], face: 126, eyeGap: 27,
    front: (c) => (
      <g stroke={c.deep} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".45">
        <path d="M164 186 q14 -2 18 -12 q2 -8 -6 -8" />
        <path d="M18 160 q-8 -4 -8 -12" />
      </g>
    ),
  },
  {
    id: "bloom", name: "Bloom", element: "Flower · Leaf", value: "Care & kindness", trait: "Thoughtful, nurturing, remembers your birthday",
    line: "I saved you a seat. You belong here.",
    light: "#ffe0ee", body: "#ff8fbf", deep: "#d44f8a", rim: "#fff4c8", iris: "#6a1f45", cheek: "#ff5f8f", bg: "#fdebf3",
    path: "M100 62 C146 62 164 100 164 140 C164 180 138 198 100 198 C62 198 36 180 36 140 C36 100 54 62 100 62Z",
    shoulders: [40, 160], armY: 146, feet: [80, 120], face: 128, eyeGap: 26,
    back: (c, g) => (
      <g className="sway">
        {[-62, -31, 0, 31, 62].map((a) => (
          <ellipse key={a} cx="100" cy="40" rx="17" ry="28" fill={a === 0 ? "#ffd166" : c.light} stroke={c.body} strokeWidth="3" transform={`rotate(${a} 100 84)`} />
        ))}
        <path d="M62 76 C46 62 30 70 28 80 C42 88 56 86 62 76Z" fill={`url(#${g}leafG)`} />
      </g>
    ),
  },
];

export const MASCOT_TRAITS: Record<string, [string, string, string]> = {
  pip: ["Curious", "Encouraging", "Upbeat"],
  dew: ["Calm", "Attentive", "Comforting"],
  spark: ["Joyful", "Energetic", "Celebratory"],
  peb: ["Steady", "Loyal", "Dependable"],
  breeze: ["Hopeful", "Light-hearted", "Dreamy"],
  bloom: ["Kind", "Thoughtful", "Nurturing"],
};
export const MASCOT_MEANING: Record<string, string> = {
  pip: "Reminds you that faith and friendship grow slowly, one small step at a time.",
  dew: "Makes room for quiet, prayer and truly hearing one another.",
  spark: "Celebrates every answered prayer, small win and shared moment.",
  peb: "Stands firm beside friends when life gets heavy.",
  breeze: "Carries hope forward, even on cloudy days.",
  bloom: "Shows love through small acts of care and welcome.",
};


export function mascotById(id: MascotId) { return MASCOTS.find(c => c.id === id)!; }
