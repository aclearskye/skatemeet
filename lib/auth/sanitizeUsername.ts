const BAD_WORDS = new Set([
  // Common profanity
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'bastard',
  'whore', 'slut', 'piss', 'prick', 'twat', 'wank', 'fag', 'faggot',
  'arse', 'arsehole', 'asshole',
  // Slurs
  'nigger', 'nigga', 'chink', 'spic', 'kike', 'wetback', 'retard', 'tranny', 'dyke',
  // Sexual / explicit
  'porn', 'anal', 'dildo', 'cum', 'jizz',
  // Hate / violence
  'rape', 'nazi', 'hitler',
]);

// Map common leet-speak substitutions to their letter equivalents
const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't',
};

function decodeLeet(str: string): string {
  return str.replace(/[01345 7]/g, (c) => LEET_MAP[c] ?? c);
}

function containsBadWord(str: string): boolean {
  // Strip all non-alpha chars and decode leet before checking
  const normalized = decodeLeet(str.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const word of BAD_WORDS) {
    if (normalized.includes(word)) return true;
  }
  return false;
}

export type SanitizeResult = { value: string; error: string | null };

/**
 * Validates a @username handle.
 * Allowlist: lowercase letters, digits, underscores only.
 * Returns the cleaned value and an error string if it fails any rule.
 */
export function sanitizeUsername(raw: string): SanitizeResult {
  // Strip everything that isn't a-z, 0-9, or underscore; force lowercase
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');

  if (cleaned.length < 3)
    return { value: cleaned, error: 'Username must be at least 3 characters' };
  if (cleaned.length > 20)
    return { value: cleaned.slice(0, 20), error: 'Username must be 20 characters or fewer' };
  if (/^[_0-9]/.test(cleaned))
    return { value: cleaned, error: 'Username must start with a letter' };
  if (cleaned.endsWith('_'))
    return { value: cleaned, error: 'Username cannot end with an underscore' };
  if (/__/.test(cleaned))
    return { value: cleaned, error: 'Username cannot contain consecutive underscores' };
  if (/^[0-9]+$/.test(cleaned))
    return { value: cleaned, error: 'Username cannot be purely numeric' };
  if (containsBadWord(cleaned))
    return { value: cleaned, error: 'Username contains inappropriate content' };

  return { value: cleaned, error: null };
}

/**
 * Validates a public display name / skate alias.
 * Strips HTML-dangerous characters for defence in depth.
 */
export function sanitizeDisplayName(raw: string): SanitizeResult {
  // Remove characters that are dangerous in HTML/templating contexts
  const cleaned = raw.trim().replace(/[<>"'`\\]/g, '');

  if (cleaned.length < 2)
    return { value: cleaned, error: 'Display name must be at least 2 characters' };
  if (cleaned.length > 30)
    return { value: cleaned.slice(0, 30), error: 'Display name must be 30 characters or fewer' };
  if (containsBadWord(cleaned))
    return { value: cleaned, error: 'Display name contains inappropriate content' };

  return { value: cleaned, error: null };
}
