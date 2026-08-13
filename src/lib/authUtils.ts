/**
 * Authentication and User Identity Normalization Utilities
 * Ensures consistent UID, email, and user object formatting across Desktop and Mobile devices.
 */

/**
 * Normalizes user email to lowercase trimmed string
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Normalizes user UIDs across anonymous Firebase accounts, Google accounts, and custom registration IDs.
 */
export function normalizeUid(rawUid: string | null | undefined): string {
  if (!rawUid) return '';
  const trimmed = rawUid.trim();
  
  // If UID is formatted as an email address, normalize to lowercase
  if (trimmed.includes('@')) {
    return normalizeEmail(trimmed);
  }

  // Handle anonymous account flags vs permanent account flags
  if (trimmed.startsWith('anon_')) {
    return 'ANON_' + trimmed.slice(5).toUpperCase();
  }

  return trimmed;
}

/**
 * Normalizes a user object/profile data structure for consistent Firestore persistence & lookup
 */
export function normalizeUserIdentity<T extends Record<string, any>>(userObj: T): T {
  if (!userObj) return userObj;

  const normalized: Record<string, any> = { ...userObj };

  if (typeof normalized.email === 'string') {
    normalized.email = normalizeEmail(normalized.email);
  }

  if (typeof normalized.id === 'string') {
    normalized.id = normalizeUid(normalized.id);
  }

  if (typeof normalized.uid === 'string') {
    normalized.uid = normalizeUid(normalized.uid);
  }

  if (typeof normalized.role === 'string') {
    normalized.role = String(normalized.role).toLowerCase().trim();
  }

  return normalized as T;
}

/**
 * Generates an encrypted/encoded session handoff token for QR scanning between devices
 */
export function generateSessionToken(userProfile: any) {
  const tokenId = 'lnk_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  const payload = {
    tokenId,
    userProfile: normalizeUserIdentity(userProfile),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 mins expiry
  };

  return {
    tokenId,
    payload,
    encodedPayload: btoa(JSON.stringify(payload))
  };
}

/**
 * Decodes session handoff token
 */
export function parseSessionToken(encoded: string) {
  try {
    const jsonStr = atob(encoded);
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (e) {
    console.error("[authUtils] Failed to parse session token:", e);
    return null;
  }
}
