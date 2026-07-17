import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDeps } from "./patients.js";
import { shapeAppointment } from "../fhir/shapers.js";

export function registerAppointmentTools(server: McpServer, { client, audit }: ToolDeps): void {
  server.registerTool(
    "get_appointments",
    {
      description:
        "List Practice Fusion appointments, optionally filtered by patient, status, and date (FHIR date prefix, e.g. ge2026-07-01).",
      inputSchema: {
        patientId: z.string().optional().describe("FHIR Patient resource id"),
        status: z.string().optional().describe("e.g. booked, arrived, fulfilled, noshow, cancelled"),
        date: z.string().optional().describe("FHIR date param, e.g. ge2026-07-01 or le2026-07-31"),
      },
    },
    async (args) => {
      const params: Record<string, string> = {};
      if (args.patientId) params.patient = args.patientId;
      if (args.status) params.status = args.status;
      if (args.date) params.date = args.date;
      try {
        const results = await client.search("Appointment", params);
        audit.record({ tool: "get_appointments", params, outcome: "ok" });
        return { content: [{ type: "text" as const, text: JSON.stringify(results.map(shapeAppointment), null, 2) }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        audit.record({ tool: "get_appointments", params, outcome: "error", error: msg });
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    },
  );
}
