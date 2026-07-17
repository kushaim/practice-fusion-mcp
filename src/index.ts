import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { AuditLogger } from "./audit/logger.js";
import { TokenProvider } from "./auth/backend-auth.js";
import { FhirClient } from "./fhir/client.js";
import { registerAllTools } from "./tools/index.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const audit = new AuditLogger(config.auditLogPath);
  const tokens = new TokenProvider({
    tokenUrl: config.tokenUrl,
    clientId: config.clientId,
    privateKeyPem: config.privateKeyPem,
    scopes: config.scopes,
    alg: config.tokenAlg,
  });
  const client = new FhirClient(config.fhirBaseUrl, tokens);

  const server = new McpServer({ name: "practice-fusion-mcp", version: "0.1.0" });
  registerAllTools(server, { client, audit });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("practice-fusion-mcp running on stdio");
}

main().catch((e) => {
  console.error("fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
