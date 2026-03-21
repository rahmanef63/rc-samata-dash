import { useState, useRef, useCallback } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Upload, Download, GripVertical, Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SortState } from "../hooks/useTableState";
import { exportToCsv, exportToJson, importFromCsv, importFromJson } from "../lib/export";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
  /** Show this column in mobile card view (max 3-4 recommended) */
  mobileVisible?: boolean;
  /** Use as card title on mobile */
  mobileTitle?: boolean;
  /** Use as card subtitle on mobile */
  mobileSubtitle?: boolean;
}

interface DataTableProps<T extends Record<string, any>> {
  data: T[];
  columns: Column<T>[];
  search: string;
  onSearchChange: (v: string) => void;
  sort: SortState;
  onToggleSort: (key: string) => void;
  onReorder?: (items: T[]) => void;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onImport?: (items: Partial<T>[]) => void;
  entityName?: string;
  draggable?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data, columns, search, onSearchChange, sort, onToggleSort,
  onReorder, onAdd, onEdit, onDelete, onImport,
  entityName = "Data", draggable = true,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setOverIdx(idx); };
  const handleDrop = useCallback(
    (idx: number) => {
      if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return; }
      const reordered = [...data];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(idx, 0, moved);
      onReorder?.(reordered);
      setDragIdx(null); setOverIdx(null);
    },
    [data, dragIdx, onReorder]
  );

  const handleExportCsv = () => {
    const cols = columns.map((c) => ({ key: c.key, label: c.label }));
    exportToCsv(data, cols, `${entityName}.csv`);
  };
  const handleExportJson = () => exportToJson(data, `${entityName}.json`);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let items: Partial<T>[];
      if (file.name.endsWith(".json")) { items = await importFromJson<Partial<T>>(file); }
      else { const cols = columns.map((c) => ({ key: c.key, label: c.label })); items = await importFromCsv<T>(file, cols); }
      onImport?.(items);
    } catch { console.error("Import failed"); }
    e.target.value = "";
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sort.key !== colKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sort.dir === "asc" ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const hasActions = onEdit || onDelete;

  // Determine mobile-visible columns
  const titleCol = columns.find(c => c.mobileTitle) || columns[0];
  const subtitleCol = columns.find(c => c.mobileSubtitle) || columns[1];
  const visibleCols = columns.filter(c => c.mobileVisible);
  const extraCols = visibleCols.length > 0 ? visibleCols : columns.slice(2, 5);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={`Cari ${entityName.toLowerCase()}...`} value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-9 h-10 text-sm rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          {onImport && (
            <>
              <input ref={fileRef} type="file" accept=".csv,.json" className="hidden" onChange={handleFileImport} />
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5 mr-1" /> Import
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-lg">
                <Download className="h-3.5 w-3.5 mr-1" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCsv}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJson}>Export JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {onAdd && (
            <Button size="sm" className="rounded-lg" onClick={onAdd}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
            </Button>
          )}
        </div>
      </div>

      {/* Mobile: Card View */}
      {isMobile ? (
        <div className="space-y-2">
          {data.length === 0 ? (
            <div className="bg-card rounded-xl shadow-card p-8 text-center text-muted-foreground text-sm">
              Tidak ada data ditemukan.
            </div>
          ) : (
            data.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-card rounded-xl shadow-card p-4 active:scale-[0.98] transition-transform"
                onClick={() => onEdit?.(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {titleCol.render ? titleCol.render(item[titleCol.key], item) : String(item[titleCol.key] ?? "")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {subtitleCol.render ? subtitleCol.render(item[subtitleCol.key], item) : String(item[subtitleCol.key] ?? "")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasActions && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                {extraCols.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 pt-2.5 border-t border-border">
                    {extraCols.map(col => (
                      <div key={col.key} className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{col.label}</span>
                        <span className={`text-xs font-medium ${col.className || ''}`}>
                          {col.render ? col.render(item[col.key], item) : String(item[col.key] ?? "")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Desktop: Table View */
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {draggable && onReorder && <TableHead className="w-8" />}
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`${col.className || ""} ${col.sortable !== false ? "cursor-pointer select-none hover:bg-accent/50 transition-colors" : ""}`}
                    onClick={() => col.sortable !== false && onToggleSort(col.key)}
                  >
                    <span className="flex items-center label-uppercase">
                      {col.label}
                      {col.sortable !== false && <SortIcon colKey={col.key} />}
                    </span>
                  </TableHead>
                ))}
                {hasActions && <TableHead className="w-20 label-uppercase text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (hasActions ? 1 : 0) + (draggable && onReorder ? 1 : 0)} className="text-center text-muted-foreground py-8">
                    Tidak ada data ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, idx) => (
                  <TableRow
                    key={item.id || idx}
                    className={`transition-colors hover:bg-accent/30 ${overIdx === idx ? "bg-accent" : ""}`}
                    draggable={draggable && !!onReorder}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                  >
                    {draggable && onReorder && (
                      <TableCell className="w-8 cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render ? col.render(item[col.key], item) : String(item[col.key] ?? "")}
                      </TableCell>
                    ))}
                    {hasActions && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-accent" onClick={() => onEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(item)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
