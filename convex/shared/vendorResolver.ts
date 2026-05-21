/**
 * Vendor master resolver — single implementation of the fuzzy
 * name → vendorId match used by every import path
 * (laporanPic CSV, statement bank, weekly upload bridges, payables).
 *
 * Build once per mutation, query N times:
 *   const idx = buildVendorIndex(vendors, aliases);
 *   const vendor = idx.resolve(rawName);
 *
 * Lookup precedence:
 *   1. exact alias hit (vendorBankAliases — learned by AI validator)
 *   2. exact vendor.name match
 *   3. loose substring (vendor.name ⊂ input OR input ⊂ vendor.name)
 *
 * Generic over the vendor shape: only requires `{ _id, name }`. Other
 * projects can pass any record satisfying the shape.
 */

import { normalizeAlias, looseEqual } from "./normalize";

export type VendorLike = { _id: string; name: string };
export type AliasLike = { alias: string; vendorId: string };

export type VendorIndex<V extends VendorLike> = {
  resolve: (raw: string) => V | null;
  byId: (id: string) => V | undefined;
  size: number;
};

export function buildVendorIndex<V extends VendorLike>(
  vendors: V[],
  aliases: AliasLike[] = [],
): VendorIndex<V> {
  const byId = new Map<string, V>(vendors.map((vnd) => [vnd._id, vnd]));
  const byName = new Map<string, V>(vendors.map((vnd) => [normalizeAlias(vnd.name), vnd]));
  const byAlias = new Map<string, V>();
  for (const a of aliases) {
    const vnd = byId.get(a.vendorId);
    if (vnd) byAlias.set(normalizeAlias(a.alias), vnd);
  }

  const resolve = (raw: string): V | null => {
    const norm = normalizeAlias(raw);
    if (!norm) return null;
    if (byAlias.has(norm)) return byAlias.get(norm)!;
    if (byName.has(norm)) return byName.get(norm)!;
    for (const [name, vnd] of byName) {
      if (looseEqual(norm, name)) return vnd;
    }
    return null;
  };

  return {
    resolve,
    byId: (id) => byId.get(id),
    size: vendors.length,
  };
}
