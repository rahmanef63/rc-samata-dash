"use client";
import { useState, useCallback } from "react";

import { type CrudMode } from "./useCrudState";

export interface ConvexCrudState<T> {
  mode: CrudMode;
  isOpen: boolean;
  selectedItem: T | null;
  openCreate: () => void;
  openEdit: (item: T) => void;
  openDelete: (item: T) => void;
  close: () => void;
  onCreate: (data: any) => Promise<void>;
  onUpdate: (data: any) => Promise<void>;
  onDelete: (data: any) => Promise<void>;
}

export function useConvexCrudState<T = any>(config: {
  createMutation: (data: any) => Promise<any>;
  updateMutation: (data: Record<string, any>) => Promise<any>;
  deleteMutation: (data: { id: string }) => Promise<any>;
}): ConvexCrudState<T> {
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

  const onCreate = useCallback(
    async (data: any) => {
      await config.createMutation(data);
      close();
    },
    [config, close]
  );

  const onUpdate = useCallback(
    async (data: any) => {
      // Typically the dialog returns all fields including id.
      // But convex expects `id` to be passed to uniquely identify the document.
      // E.g., { id: selectedItem._id, ...data }
      const payload = { ...data };
      if (selectedItem) {
        payload.id = (selectedItem as any)._id || (selectedItem as any).id;
      }
      await config.updateMutation(payload);
      close();
    },
    [config, selectedItem, close]
  );

  const onDelete = useCallback(
    async (data: any) => {
      const id = data._id || data.id || (selectedItem && ((selectedItem as any)._id || (selectedItem as any).id));
      if (id) {
        await config.deleteMutation({ id });
      }
      close();
    },
    [config, selectedItem, close]
  );

  return {
    mode,
    isOpen,
    selectedItem,
    openCreate,
    openEdit,
    openDelete,
    close,
    onCreate,
    onUpdate,
    onDelete,
  };
}
