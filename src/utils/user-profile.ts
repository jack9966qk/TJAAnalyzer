export interface UserProfile {
  isTesterMode: boolean;
}

const STORAGE_KEY = "tja_analyzer_profile";

const DEFAULT_PROFILE: UserProfile = {
  isTesterMode: false,
};

export function loadUserProfile(): UserProfile {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error("Failed to load user profile", e);
  }
  return { ...DEFAULT_PROFILE };
}

export function saveUserProfile(changes: Partial<UserProfile>): void {
  const current = loadUserProfile();
  const updated = { ...current, ...changes };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save user profile", e);
  }
}
