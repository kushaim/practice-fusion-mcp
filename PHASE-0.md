# Phase 0 — Practice Fusion FHIR access

Everything needed to go from "code done" to "live smoke + publishable." Mostly manual (needs a real Practice Fusion account); the code is already built and tested against mocks. **Critical path = step 1 (registration approval).** Steps 2–4 can be pre-staged now.

---

## 1. Register the free Open FHIR account
- Go to the **PDS (Patient Data Sharing) API Partner Registration** form: `pfpds.practicefusion.com/s/Registration` (linked from https://www.practicefusion.com/fhir/get-started/).
- Provide developer contact + company details (R21 Digital), homepage URL, agree to ToS.
- On approval you get an email with **PDS API portal** login. *(Approval is not instant — this gates everything else.)*

## 2. Generate the app keypair (for JWKS auth)
The server authenticates with a signed JWT — register the **public** key with PF, keep the **private** one. Run in this repo (`jose` is already installed):
```bash
cd projects/practice-fusion-mcp
node -e "import('jose').then(async j => {
  const {publicKey, privateKey} = await j.generateKeyPair('RS384', {extractable:true});
  const fs = await import('node:fs');
  fs.writeFileSync('pf-private.pem', await j.exportPKCS8(privateKey));
  const jwk = await j.exportJWK(publicKey);
  jwk.alg='RS384'; jwk.use='sig'; jwk.kid='pf-mcp-1';
  fs.writeFileSync('pf-jwks.json', JSON.stringify({keys:[jwk]}, null, 2));
  console.log('wrote pf-private.pem (KEEP SECRET) + pf-jwks.json (register with PF)');
})"
```
- `pf-private.pem` → becomes `PF_PRIVATE_KEY`. **Never commit it** (`.env` + `*.pem` — verify both are gitignored).
- `pf-jwks.json` → the public key you give PF (host it at a URL, or paste it, per what the portal accepts).

## 3. Create the app in the PDS portal
Complete the **Partner Application** form:
- **Application type: `System / Bulk export`** (backend service) — *the load-bearing choice.*
- **JWKS URL** → already hosted (see below), or paste the key if the portal allows.
- **Requested scopes:** `system/*.read` (read-only).

**JWKS hosting — DONE + VERIFIED (2026-07-17):** hosted on **Vercel** (team `r21digital`, project `pf-mcp-jwks`), serving public `200 application/json`, kid `pf-mcp-1`, verified to match the local private key.
- **JWKS URL to give PF:** `https://pf-mcp-jwks.vercel.app/pf-jwks.json` (also `/.well-known/jwks.json`).
- Local source: `D:/pf-mcp-jwks` (static files at root). To rotate the key: replace `pf-jwks.json` + `.well-known/jwks.json`, then `vercel deploy --prod --yes` from that dir.
- ~~GitLab Pages attempt (`CDVolvik/pf-mcp-jwks`) abandoned~~ — persistent 403 from Pages access control; moved to Vercel for reliability. Old GitLab repo can be deleted.

## 4. Capture the 4 values → the server's config
From the portal, drop these into a local `.env` (copy `.env.example`):

| Value from PF | → env var |
|---|---|
| FHIR R4 base URL | `PF_FHIR_BASE_URL` |
| OAuth2 token endpoint | `PF_TOKEN_URL` |
| Client ID | `PF_CLIENT_ID` |
| Contents of `pf-private.pem` | `PF_PRIVATE_KEY` |

## 5. Two verifications
- **⚠️ Confirm the free Open tier actually allows a System/backend-services app.** This is the one real unknown in the design. If the free tier only allows Patient/Provider *launch* (interactive login), the auth flow needs adjusting — flag it.
- **BAA question to Veradigm** (`VeradigmConnect@veradigm.com`): "For the free Open FHIR API path, is a Business Associate Agreement available/required, and what covers PHI accessed via a backend-services app?" — informs the README's compliance section before any real patient data.

## 6. Then run Task 12 (live sandbox smoke)
Once `.env` + sandbox access work:
```bash
pnpm build
npx @modelcontextprotocol/inspector node dist/index.js
```
- Confirm all six tools list.
- Run `search_patients` (known sandbox name) → copy an id → `get_patient`, `get_appointments`, `get_conditions`, `get_medications`, `get_lab_results`.
- Confirm each returns shaped JSON, each emits an audit line on stderr, and no token/PHI leaks to stdout.
- Record which search params PF actually honored in `docs/superpowers/specs/2026-07-17-practice-fusion-mcp-design.md` (Phase 0 verification section); adjust tool `inputSchema`s if PF rejected a param.

## 7. Publish
Published to GitHub: **[kushaim/practice-fusion-mcp](https://github.com/kushaim/practice-fusion-mcp)** (MIT). Next: list on the MCP registries (`awesome-mcp-servers`, the MCP registry) and — once live-smoked — publish to npm as `practice-fusion-mcp`.

---

**Reference — Veradigm access facts:** Open FHIR account = FREE (read, US Core FHIR R4). Integrator/Unity (write, scheduling) = PAID (Gold $5,389/yr min + $3,500/cert + per-client API fee; Gold+ required to go live with clients). 30-day free trial.
