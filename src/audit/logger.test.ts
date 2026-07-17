import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuditLogger } from "./logger.js";

describe("AuditLogger", () => {
  let spy: any;
  beforeEach(() => {
    spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => spy.mockRestore());

  it("writes a JSON line to stderr with tool, params, outcome", () => {
    const log = new AuditLogger();
    log.record({ tool: "get_patient", params: { patientId: "p1" }, outcome: "ok" });
    expect(spy).toHaveBeenCalledOnce();
    const line = spy.mock.calls[0][0] as string;
    const entry = JSON.parse(line);
    expect(entry.tool).toBe("get_patient");
    expect(entry.params.patientId).toBe("p1");
    expect(entry.outcome).toBe("ok");
    expect(typeof entry.ts).toBe("string");
  });

  it("redacts long free-text param values", () => {
    const log = new AuditLogger();
    log.record({ tool: "search_patients", params: { name: "a".repeat(200) }, outcome: "ok" });
    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry.params.name).toBe("[redacted:200]");
  });
});
