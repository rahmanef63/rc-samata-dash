import { useState, useCallback } from "react";

export type CrudMode = "create" | "edit" | "delete" | null;

export interface CrudState<T> {
  items: T[];
  selectedItem: T | null;
  mode: CrudMode;
  isOpen: boolean;
  openCreate: () => void;
  openEdit: (item: T) => void;
  openDelete: (item: T) => void;
  close: () => void;
  onCreate: (item: T) => void;
  onUpdate: (item: T) => void;
  onDelete: (item: T) => void;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useCrudState<T extends { id: string }>(
  initialItems: T[]
): CrudState<T> {
  const [items, setItems] = useState<T[]>(initialItems);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [mode, setMode] = useState<CrudMode>(null);

  const isOpen = mode !== null;

  const openCreate = useCallback(() => {
    setSelectedItem(null);
    setMode("create");
  }, []);

  const openEdit = useCallback((item: T) => {
    setSelectedItem(item);
    setMode("edit");
  }, []);

  const openDelete = useCallback((item: T) => {
    setSelectedItem(item);
    setMode("delete");
  }, []);

  const close = useCallback(() => {
    setSelectedItem(null);
    setMode(null);
  }, []);

  const onCreate = useCallback((item: T) => {
    setItems((prev) => [...prev, item]);
    close();
  }, [close]);

  const onUpdate = useCallback((item: T) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    close();
  }, [close]);

  const onDelete = useCallback((item: T) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    close();
  }, [close]);

  return {
    items,
    selectedItem,
    mode,
    isOpen,
    openCreate,
    openEdit,
    openDelete,
    close,
    onCreate,
    onUpdate,
    onDelete,
    setItems,
  };
}
