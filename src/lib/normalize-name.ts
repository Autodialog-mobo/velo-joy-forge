/**
 * Normalises a person/organisation name for loose equality comparison.
 *
 * Applies: lowercase, Unicode NFD + diacritic stripping, removal of all
 * whitespace and punctuation. Trivial variations (casing, dots, extra
 * spaces, accents) collapse to the same key, while genuinely different
 * names stay distinct.
 *
 * Note: initials vs full first name ("J. Zengerink" vs "Jarre Zengerink")
 * normalise to different keys ("jzengerink" vs "jarrezengerink"). Use
 * `namesLooselyEqual` for that case — it also accepts an initials match.
 */
export function normalizeNameForCompare(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Tokens (words) after diacritic stripping and lowercasing. */
function nameTokens(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * True when two names are "the same person" for fulfillment purposes.
 *
 * Matches when:
 *  - normalised strings are equal, OR
 *  - one side is an initials variant of the other (e.g. "J. Zengerink"
 *    vs "Jarre Zengerink"): same last token, and each non-last token on
 *    the shorter side is the first letter of the corresponding token on
 *    the longer side.
 */
export function namesLooselyEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeNameForCompare(a);
  const nb = normalizeNameForCompare(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length < 2 || tb.length < 2) return false;
  if (ta[ta.length - 1] !== tb[tb.length - 1]) return false;

  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  // Align from the start; last token already matches.
  for (let i = 0; i < short.length - 1; i++) {
    const s = short[i];
    const l = long[i];
    if (!l) return false;
    if (s === l) continue;
    if (s.length === 1 && l.startsWith(s)) continue;
    if (l.length === 1 && s.startsWith(l)) continue;
    return false;
  }
  return true;
}

/**
 * Returns the normalised surname (last token) of a name.
 * Single-word names are treated as the surname themselves.
 * Empty/null input returns "".
 */
export function surnameKey(s: string | null | undefined): string {
  const tokens = nameTokens(s);
  if (tokens.length === 0) return "";
  return tokens[tokens.length - 1].replace(/[^a-z0-9]/g, "");
}

/**
 * True when the surnames (last tokens) of both names match after
 * normalisation. Returns false if either side is empty — caller decides
 * whether "can't compare" should show an indicator.
 */
export function surnamesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const sa = surnameKey(a);
  const sb = surnameKey(b);
  if (!sa || !sb) return false;
  return sa === sb;
}
