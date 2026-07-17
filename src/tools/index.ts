import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPatientTools, type ToolDeps } from "./patients.js";
import { registerAppointmentTools } from "./appointments.js";
import { registerClinicalTools } from "./clinical.js";

export function registerAllTools(server: McpServer, deps: ToolDeps): void {
  registerPatientTools(server, deps);
  registerAppointmentTools(server, deps);
  registerClinicalTools(server, deps);
}
