"use client";
import { useState, useCallback } from "react";

import { type CrudMode } from "./useCrudState";

type CrudRecord = {
  id?: string;
  _id?: string;
};

type AsyncMutation = (data: never) => Promise<unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getItemId(item: CrudRecord | null | undefined) {
  return item?._id ?? item?.id;
}

export interface ConvexCrudState<T> {
  mode: CrudMode;
  isOpen: boolean;
  selectedItem: T | null;
  openCreate: () => void;
  openEdit: (item: T) => void;
  openDelete: (item: T) => void;
  close: () => void;
  onCreate: (data: unknown) => Promise<void>;
  onUpdate: (data: unknown) => Promise<void>;
  onDelete: (data: unknown) => Promise<void>;
}

export function useConvexCrudState<
  T extends CrudRecord = CrudRecord
>(config: {
  createMutation: AsyncMutation;
  updateMutation: AsyncMutation;
  deleteMutation: AsyncMutation;
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
    async (data: unknown) => {
      await config.createMutation(data as never);
      close();
    },
    [config, close]
  );

  const onUpdate = useCallback(
    async (data: unknown) => {
      // Typically the dialog returns all fields including id.
      // But convex expects `id` to be passed to uniquely identify the document.
      // E.g., { id: selectedItem._id, ...data }
      const payload: Record<string, unknown> = isRecord(data) ? { ...data } : {};
      const selectedId = getItemId(selectedItem);
      if (selectedId) {
        payload.id = selectedId;
      }
      await config.updateMutation(payload as never);
      close();
    },
    [config, selectedItem, close]
  );

  const onDelete = useCallback(
    async (data: unknown) => {
      const dataRecord = isRecord(data) ? (data as CrudRecord) : null;
      const id = getItemId(dataRecord) ?? getItemId(selectedItem);
      if (id) {
        await config.deleteMutation({ id } as never);
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
