import type { Playdata } from "./playdata-parser.js";

export interface UserProfile {
  isTesterMode: boolean;
  playdata?: Playdata | null;
}

const STORAGE_KEY = "tja_analyzer_profile";
const PLAYDATA_STORAGE_KEY = "tja_analyzer_playdata";

const DEFAULT_PROFILE: UserProfile = {
  isTesterMode: false,
  playdata: null,
};

export function loadUserProfile(): UserProfile {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const playdataStr = localStorage.getItem(PLAYDATA_STORAGE_KEY);
    let playdata: Playdata | null = null;

    if (playdataStr) {
      try {
        playdata = JSON.parse(playdataStr);
      } catch (e) {
        console.error("Failed to parse playdata", e);
      }
    }

    if (data) {
      const profile = JSON.parse(data);
      return { ...DEFAULT_PROFILE, ...profile, playdata };
    }
    return { ...DEFAULT_PROFILE, playdata };
  } catch (e) {
    console.error("Failed to load user profile", e);
  }
  return { ...DEFAULT_PROFILE };
}

export function saveUserProfile(changes: Partial<UserProfile>): void {
  const current = loadUserProfile();
  const { playdata, ...profileWithoutPlaydata } = { ...current, ...changes };

  try {
    // Save profile (without playdata to keep it small)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profileWithoutPlaydata));

    // Save playdata separately (can be large)
    if (playdata !== undefined) {
      if (playdata === null) {
        localStorage.removeItem(PLAYDATA_STORAGE_KEY);
      } else {
        localStorage.setItem(PLAYDATA_STORAGE_KEY, JSON.stringify(playdata));
      }
    }
  } catch (e) {
    console.error("Failed to save user profile", e);
  }
}

export function clearPlaydata(): void {
  try {
    localStorage.removeItem(PLAYDATA_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear playdata", e);
  }
}
