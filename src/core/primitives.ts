// Structural Types
export interface NoteLocation {
  barIndex: number;
  charIndex: number;
}

export interface NoteIdentity {
  char: string;
  ordinal: number;
}

// Key Types for Map/Set
export type JudgementKey = string; // Format: `${char}_${ordinal}`
export type LocationKey = string; // Format: `${barIndex}_${charIndex}`

// Helper Functions
export function toJudgementKey(identity: NoteIdentity): JudgementKey {
  return `${identity.char}_${identity.ordinal}`;
}

export function toLocationKey(location: NoteLocation): LocationKey {
  return `${location.barIndex}_${location.charIndex}`;
}

export function parseJudgementKey(key: JudgementKey): NoteIdentity {
  const [char, ordinalStr] = key.split("_");
  return { char, ordinal: parseInt(ordinalStr, 10) };
}

export function parseLocationKey(key: LocationKey): NoteLocation {
  const [barIndexStr, charIndexStr] = key.split("_");
  return {
    barIndex: parseInt(barIndexStr, 10),
    charIndex: parseInt(charIndexStr, 10),
  };
}

export const createJudgementKey = (char: string, ordinal: number) => toJudgementKey({ char, ordinal });
