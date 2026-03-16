import { useState, useMemo, useCallback } from "react";

export type SortDir = "asc" | "desc" | null;

export interface SortState {
  key: string;
  dir: SortDir;
}

export interface TableState<T> {
  search: string;
  setSearch: (v: string) => void;
  sort: SortState;
  toggleSort: (key: string) => void;
  sortedItems: T[];
  orderedItems: T[];
  setOrderedItems: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useTableState<T extends Record<string, any>>(
  items: T[],
  searchKeys: (keyof T)[] = []
): TableState<T> {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "", dir: null });
  const [manualOrder, setManualOrder] = useState<T[] | null>(null);

  const toggleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: "", dir: null };
    });
    setManualOrder(null);
  }, []);

  const filtered = useMemo(() => {
    const source = manualOrder ?? items;
    if (!search.trim()) return source;
    const q = search.toLowerCase();
    return source.filter((item) =>
      searchKeys.some((k) => String(item[k]).toLowerCase().includes(q))
    );
  }, [items, manualOrder, search, searchKeys]);

  const sortedItems = useMemo(() => {
    if (!sort.key || !sort.dir) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const setOrderedItems = useCallback((updater: React.SetStateAction<T[]>) => {
    if (typeof updater === "function") {
      setManualOrder((prev) => (updater as (prev: T[]) => T[])(prev ?? items));
    } else {
      setManualOrder(updater);
    }
  }, [items]);

  return {
    search,
    setSearch,
    sort,
    toggleSort,
    sortedItems,
    orderedItems: sortedItems,
    setOrderedItems,
  };
}
