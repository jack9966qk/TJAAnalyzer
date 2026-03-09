/**
 * Lightweight startup event logger for debugging app load performance,
 * especially useful for diagnosing PWA cache behavior.
 *
 * Events are stored with a timestamp from performance.now(). View them via
 * the Debug Log in Settings (developer mode), or copy them as plain text.
 */

interface StartupEvent {
  label: string;
  ts: number; // ms since performance.timeOrigin
  detail?: string;
}

const events: StartupEvent[] = [];

// Capture the earliest-possible JS timestamp recorded by the inline script in index.html
{
  // biome-ignore lint/suspicious/noExplicitAny: global set by inline script
  const htmlTs = (window as any).__htmlScriptTs as number | undefined;
  if (htmlTs !== undefined) {
    events.push({ label: "HTML script executing (earliest JS)", ts: htmlTs });
  }
}

function record(label: string, detail?: string) {
  const ts = performance.now();
  events.push({ label, ts, detail });
}

function getEvents(): ReadonlyArray<Readonly<StartupEvent>> {
  return events;
}

export const startupLog = { record, getEvents };

// Expose for console debugging
// biome-ignore lint/suspicious/noExplicitAny: global exposure for debugging
(window as any).__startupLog = { events };
