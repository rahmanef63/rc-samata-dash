// Next.js instrumentation — server-side error capture. Logs to stderr so the
// Dokploy container log retains otherwise-invisible server render/route errors.
export function register() {
  // No-op: reserved for future OpenTelemetry/error-reporter wiring.
}

export function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  const e = err as { message?: string; stack?: string };
  console.error(
    "[onRequestError]",
    JSON.stringify({
      message: e?.message,
      path: request.path,
      method: request.method,
      routeType: context.routeType,
      routePath: context.routePath,
    }),
    e?.stack,
  );
}
