import { appendFileSync } from "node:fs";

export interface AuditEntry {
  tool: string;
  params: Record<string, unknown>;
  outcome: "ok" | "error";
  error?: string;
}

const MAX_PARAM_LEN = 64;

function sanitize(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && v.length > MAX_PARAM_LEN) {
      out[k] = `[redacted:${v.length}]`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export class AuditLogger {
  constructor(private readonly filePath?: string) {}

  record(entry: AuditEntry): void {
    const line =
      JSON.stringify({
        ts: new Date().toISOString(),
        tool: entry.tool,
        params: sanitize(entry.params),
        outcome: entry.outcome,
        ...(entry.error ? { error: entry.error } : {}),
      }) + "\n";
    process.stderr.write(line);
    if (this.filePath) {
      try {
        appendFileSync(this.filePath, line);
      } catch {
        /* file logging is best-effort; never throw from audit */
      }
    }
  }
}
