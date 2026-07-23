import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AuditLogger } from "./logger.js";

describe("AuditLogger", () => {
  let spy: any;
  beforeEach(() => {
    spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => spy.mockRestore());

  it("writes a multi-line text record to stderr with tool, params, outcome", () => {
    const log = new AuditLogger();
    log.record({ tool: "get_patient", params: { patientId: "p1" }, outcome: "ok" });
    expect(spy).toHaveBeenCalledOnce();
    const out = spy.mock.calls[0][0] as string;
    expect(out).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
    expect(out).toContain("get_patient (ok)");
    expect(out).toContain('"patientId":"p1"');
    expect(out.endsWith("\n")).toBe(true);
  });

  it("redacts long free-text param values in text output", () => {
    const log = new AuditLogger();
    log.record({ tool: "search_patients", params: { name: "a".repeat(200) }, outcome: "ok" });
    const out = spy.mock.calls[0][0] as string;
    expect(out).toContain("[redacted:200]");
  });

  it("includes the error field when outcome is error", () => {
    const log = new AuditLogger();
    log.record({
      tool: "get_patient",
      params: { id: "x" },
      outcome: "error",
      error: "FHIR request failed: 404",
    });
    const out = spy.mock.calls[0][0] as string;
    expect(out).toContain("error:");
    expect(out).toContain("FHIR request failed: 404");
  });

  describe("file format", () => {
    let dir: string;
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), "audit-"));
    });
    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it("writes text format to the file by default", () => {
      const file = join(dir, "audit.log");
      const log = new AuditLogger(file);
      log.record({ tool: "search_patients", params: { name: "rivera" }, outcome: "ok" });
      const out = readFileSync(file, "utf-8");
      expect(out).toContain("search_patients (ok)");
      expect(out).toContain('"name":"rivera"');
      // Text format is multi-line, so it must contain a newline inside the record
      const records = out.trim().split(/\n(?=\[)/);
      expect(records.length).toBe(1);
    });

    it("writes ndjson format to the file when configured", () => {
      const file = join(dir, "audit.log");
      const log = new AuditLogger(file, "ndjson");
      log.record({ tool: "search_patients", params: { name: "rivera" }, outcome: "ok" });
      log.record({ tool: "get_patient", params: { id: "p1" }, outcome: "ok" });
      const out = readFileSync(file, "utf-8");
      const lines = out.trim().split("\n");
      expect(lines.length).toBe(2);
      // Each line must be valid JSON on its own
      const a = JSON.parse(lines[0]);
      const b = JSON.parse(lines[1]);
      expect(a.tool).toBe("search_patients");
      expect(a.params.name).toBe("rivera");
      expect(b.tool).toBe("get_patient");
    });

    it("stderr is always text regardless of file format", () => {
      const file = join(dir, "audit.log");
      const log = new AuditLogger(file, "ndjson");
      log.record({ tool: "search_patients", params: { name: "rivera" }, outcome: "ok" });
      // stderr output should still be human-readable text (not ndjson)
      const stderrOut = spy.mock.calls[0][0] as string;
      expect(stderrOut).toContain("search_patients (ok)");
      expect(stderrOut).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
      // The file should be ndjson
      const fileOut = readFileSync(file, "utf-8");
      expect(fileOut.trim().split("\n").length).toBe(1);
      JSON.parse(fileOut); // valid JSON
    });

    it("text and ndjson output round-trip the same data", () => {
      const textFile = join(dir, "text.log");
      const ndFile = join(dir, "nd.log");
      const entry = {
        tool: "search_patients",
        params: { name: "rivera", limit: 50 },
        outcome: "ok" as const,
      };
      new AuditLogger(textFile, "text").record(entry);
      new AuditLogger(ndFile, "ndjson").record(entry);
      // Both files describe the same call
      expect(readFileSync(textFile, "utf-8")).toContain("search_patients (ok)");
      expect(readFileSync(textFile, "utf-8")).toContain('"name":"rivera"');
      const nd = JSON.parse(readFileSync(ndFile, "utf-8"));
      expect(nd.tool).toBe("search_patients");
      expect(nd.params.name).toBe("rivera");
      expect(nd.outcome).toBe("ok");
    });
  });
});
