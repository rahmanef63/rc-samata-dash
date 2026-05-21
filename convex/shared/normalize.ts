/**
 * Tiny string normalisation helpers shared across feature mutations.
 *
 * Why a module: the pattern `s.toUpperCase().trim()` appeared 20+ times
 * (vendor matching, alias keys, counterparty equality). Centralising
 * lets us tweak normalisation (e.g. collapse whitespace, strip
 * non-printables) in one place without grepping the codebase.
 */

/** UPPER + trim. Use as the canonical alias / vendor-name key. */
export const normalizeAlias = (s: string | undefined | null): string =>
  (s ?? "").toUpperCase().trim();

/** Bi-directional substring match on normalised strings. */
export const looseEqual = (a: string, b: string): boolean => {
  const na = normalizeAlias(a);
  const nb = normalizeAlias(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};
