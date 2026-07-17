# practice-fusion-mcp

An open-source, **FHIR-first, read-only** [Model Context Protocol](https://modelcontextprotocol.io) server for **Practice Fusion**. Connect Claude (Desktop / Code), Cursor, or any MCP client to a Practice Fusion EHR to search patients and review appointments, conditions, medications, and labs — running on Practice Fusion's **free Open FHIR account**.

Read-only by design. Audit-logged. No write access, no scheduling, no patient creation.

## Tools

| Tool | What it does |
|------|--------------|
| `search_patients` | Find patients by name / birthdate / gender / identifier |
| `get_patient` | One patient's demographics by id |
| `get_appointments` | Appointments by patient / status / date |
| `get_conditions` | A patient's problems / diagnoses |
| `get_medications` | A patient's medication requests |
| `get_lab_results` | A patient's laboratory observations |

## Setup

1. Register a free Practice Fusion **Open FHIR** developer account and create a **System / backend-services** app. Note your FHIR base URL, token URL, client id, and register your app's public key.
2. Copy `.env.example` to `.env` and fill in the values (see variables below).
3. Add to your MCP client config, e.g. Claude Desktop:

```json
{
  "mcpServers": {
    "practice-fusion": {
      "command": "npx",
      "args": ["-y", "practice-fusion-mcp"],
      "env": {
        "PF_FHIR_BASE_URL": "https://fhir.practicefusion.com/r4",
        "PF_TOKEN_URL": "https://auth.practicefusion.com/token",
        "PF_CLIENT_ID": "your-client-id",
        "PF_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
      }
    }
  }
}
```

### Environment variables

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `PF_FHIR_BASE_URL` | yes | — | FHIR R4 base URL |
| `PF_TOKEN_URL` | yes | — | OAuth2 token endpoint |
| `PF_CLIENT_ID` | yes | — | Backend-services client id |
| `PF_PRIVATE_KEY` | yes | — | PKCS8 PEM private key (matches the registered public key) |
| `PF_SCOPES` | no | `system/*.read` | Requested scopes |
| `PF_TOKEN_ALG` | no | `RS384` | JWT signing alg |
| `PF_AUDIT_LOG` | no | — | Optional file path for audit records (always also written to stderr) |

## Security & HIPAA

This server handles Protected Health Information. **You**, the deployer, are the covered entity or business associate: you are responsible for your own Business Associate Agreement (BAA) with Veradigm/Practice Fusion and for running this in a HIPAA-appropriate environment. Every tool call is audit-logged (stderr, plus optional file) with long free-text parameters redacted. Tokens and keys are never logged. This project ships code, not a hosted data service. **Not legal advice.**

## How it differs from the alternative

The other Practice Fusion MCP is built on Practice Fusion's *proprietary Unity APIs* (paid Integrator tier) and is write-heavy. This one is **FHIR-based** (runs on the **free** Open account), **read-only** (smaller risk surface), and **audit-logged**.

## Development

```bash
pnpm install
pnpm test        # unit tests (mocked FHIR)
pnpm build       # bundle to dist/
```
