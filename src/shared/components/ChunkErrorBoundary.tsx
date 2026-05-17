"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { hardReload } from "./VersionWatcher";

const RELOAD_FLAG = "rcsamata:chunk-reloaded-at";
const RELOAD_COOLDOWN_MS = 60_000;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  caught: boolean;
}

/** Catches chunk-load failures inside React render path (next/dynamic
 *  rejections, missing _next/static/chunks/<hash>.js after deploy) and
 *  auto-reloads once with cache-busting. Cooldown prevents reload loops
 *  if the network is genuinely broken. */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { caught: false };

  static getDerivedStateFromError(error: unknown): State {
    return { caught: isChunkLoadError(error) };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    if (!isChunkLoadError(error)) return;
    if (canReloadNow()) {
      stampReload();
      void hardReload();
    }
  }

  render() {
    if (!this.state.caught) return this.props.children;
    return (
      this.props.fallback ?? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full rounded-lg border border-border bg-card p-6 text-center">
            <div className="text-3xl mb-2">🔄</div>
            <h2 className="text-base font-semibold mb-1">Versi baru tersedia</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Aplikasi telah di-update. Muat ulang untuk melanjutkan.
            </p>
            <button
              onClick={() => void hardReload()}
              className="rounded-md bg-foreground text-background px-3 py-1.5 text-sm hover:opacity-90"
            >
              Muat ulang
            </button>
          </div>
        </div>
      )
    );
  }
}

export function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; message?: string };
  if (e.name === "ChunkLoadError") return true;
  const msg = String(e.message ?? "");
  if (!msg) return false;
  return (
    msg.includes("Loading chunk") ||
    msg.includes("Failed to load chunk") ||
    msg.includes("Loading CSS chunk") ||
    msg.includes("ChunkLoadError") ||
    /\/_next\/static\/chunks\/[^ ]+\.js/i.test(msg)
  );
}

function canReloadNow(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? "0");
    return Date.now() - last > RELOAD_COOLDOWN_MS;
  } catch {
    return true;
  }
}

function stampReload() {
  try {
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    /* storage disabled */
  }
}
