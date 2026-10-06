export const MASCOT_IDS = ['pip', 'dew', 'spark', 'peb', 'breeze', 'bloom'] as const;
export type MascotId = typeof MASCOT_IDS[number];
export const MASCOT_STATES = ['idle', 'selected', 'encouraging', 'celebrating', 'listening'] as const;
export type MascotState = typeof MASCOT_STATES[number];

export function isMascotId(value: unknown): value is MascotId {
  return typeof value === 'string' && (MASCOT_IDS as readonly string[]).includes(value);
}
