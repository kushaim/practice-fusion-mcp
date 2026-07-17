import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FhirClient } from "../fhir/client.js";
import type { AuditLogger } from "../audit/logger.js";
import { shapePatient } from "../fhir/shapers.js";
import { textResult, errorResult } from "./result.js";

export interface ToolDeps {
  client: FhirClient;
  audit: AuditLogger;
}

export function registerPatientTools(server: McpServer, { client, audit }: ToolDeps): void {
  server.registerTool(
    "search_patients",
    {
      description: "Search Practice Fusion patients by demographics (name, birthdate, gender, identifier).",
      inputSchema: {
        name: z.string().optional().describe("Full or partial patient name"),
        birthdate: z.string().optional().describe("YYYY-MM-DD"),
        gender: z.enum(["male", "female", "other", "unknown"]).optional(),
        identifier: z.string().optional(),
      },
    },
    async (args) => {
      const raw = args as Record<string, string | undefined>;
      const params = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== undefined) as [string, string][],
      );
      try {
        const results = await client.search("Patient", params);
        audit.record({ tool: "search_patients", params, outcome: "ok" });
        return textResult(results.map(shapePatient));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        audit.record({ tool: "search_patients", params, outcome: "error", error: msg });
        return errorResult(msg);
      }
    },
  );

  server.registerTool(
    "get_patient",
    {
      description: "Get a single Practice Fusion patient's demographics by id.",
      inputSchema: { patientId: z.string().describe("FHIR Patient resource id") },
    },
    async ({ patientId }) => {
      try {
        const patient = await client.read("Patient", patientId);
        audit.record({ tool: "get_patient", params: { patientId }, outcome: "ok" });
        return textResult(shapePatient(patient));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        audit.record({ tool: "get_patient", params: { patientId }, outcome: "error", error: msg });
        return errorResult(msg);
      }
    },
  );
}
