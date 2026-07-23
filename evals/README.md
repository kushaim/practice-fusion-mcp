# Evaluations

These evaluations test whether an LLM can use practice-fusion-mcp to answer
realistic clinical questions by composing tools — following the
[mcp-builder evaluation guidance](https://modelcontextprotocol.io).

- **`practice-fusion-mcp.eval.xml`** — 10 question/answer pairs. Each is
  independent, read-only, requires multiple tool calls (resolve a patient with
  `practicefusion_search_patients`, then read clinical data), and has a single
  string-verifiable answer.
- **`fixtures.json`** — the synthetic FHIR dataset the answers are defined
  against. **No real PHI.**

## Design notes

Questions are written to be:

- **Independent** — no question depends on another.
- **Read-only** — only non-destructive tools are needed.
- **Multi-hop** — e.g. "count Ana Rivera's active medications" requires
  `search_patients` → `get_medications` → filter by status.
- **Stable & verifiable** — answers are fixed values (`2`, `high`, `MD`, …)
  that string-match cleanly.

## Running

Because this server talks to a live FHIR endpoint (not a bundled dataset), run
the evals against a **Practice Fusion Open FHIR sandbox** seeded with the
records in `fixtures.json`:

1. Create a sandbox patient set equivalent to `fixtures.json`.
2. Point the server at the sandbox (`.env` with sandbox `PF_*` values).
3. Drive an MCP client (or the [MCP Inspector](https://github.com/modelcontextprotocol/inspector))
   with each `<question>` and compare the model's answer to `<answer>`.

The fixture keeps answers deterministic regardless of who runs it — the same
seeded data always yields the same expected answers.
