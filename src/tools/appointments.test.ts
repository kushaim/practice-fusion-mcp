import { describe, it, expect, vi } from "vitest";
import { registerAppointmentTools } from "./appointments.js";
import type { FhirClient } from "../fhir/client.js";
import { AuditLogger } from "../audit/logger.js";

function harness() {
  const handlers = new Map<string, (args: any) => Promise<any>>();
  const server = { registerTool: (n: string, _c: unknown, h: any) => handlers.set(n, h) };
  const client = { search: vi.fn(), read: vi.fn() } as unknown as FhirClient;
  const audit = new AuditLogger();
  vi.spyOn(audit, "record").mockImplementation(() => {});
  registerAppointmentTools(server as any, { client, audit });
  return { handlers, client };
}

describe("get_appointments", () => {
  it("searches by patient + date range and returns shaped appointments", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([
      {
        resourceType: "Appointment",
        id: "a1",
        status: "booked",
        start: "2026-07-20T14:00:00Z",
        participant: [{ actor: { reference: "Patient/p1", display: "Ana Rivera" } }],
      },
    ]);
    const res = await handlers.get("get_appointments")!({ patientId: "p1", date: "ge2026-07-01" });
    expect(client.search).toHaveBeenCalledWith("Appointment", { patient: "p1", date: "ge2026-07-01" });
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed[0].status).toBe("booked");
    expect(parsed[0].patient).toBe("Ana Rivera");
  });
});
