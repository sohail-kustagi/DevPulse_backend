# Friction Log — OrbitOps Backend

> **Purpose:** Document specific friction points, workarounds, and gotchas encountered while building the OrbitOps backend.  
> **Hackathon Bonus:** This file earns 10% extra score for the "Shape" track.

---

## How to Use This File

As you implement each phase, record friction in this format:

```markdown
### [Category] Brief Title
- **When:** What you were trying to do
- **Friction:** What went wrong or was confusing
- **Resolution:** How you fixed it
- **Time Lost:** Approximate time spent debugging
- **Severity:** Low / Medium / High
```

---

## Pre-Documented Friction Points

These are known issues from the architecture planning phase. Document your actual experience when you hit them:

### 1. [ASK SDK] CommonJS vs ESM Interop

- **When:** Importing `ask-sdk-express-adapter` in a TypeScript ESM project (`"type": "module"`)
- **Friction:** The package ships as CommonJS, causing `ERR_REQUIRE_ESM` or default export issues
- **Expected Resolution:** Use `import { ExpressAdapter } from 'ask-sdk-express-adapter/dist/index.js'` or add interop shim
- **Severity:** Medium

### 2. [Alexa] 8-Second Timeout vs Multi-Step Tool Chains

- **When:** Running `generate_project_spec → scaffold_workspace → provision_github_repo` takes 10–15s
- **Friction:** Alexa drops the connection at 8.0s with no graceful fallback
- **Expected Resolution:** `Promise.race()` with 6.5s timeout, background promise continues to HUD
- **Severity:** High

### 3. [SSML] Code Symbols in Alexa TTS

- **When:** Returning file paths (`src/auth/jwt_middleware.ts`) or symbols (`&&`, `=>`) in spoken response
- **Friction:** Alexa reads them literally ("src slash auth slash..."), sounds terrible
- **Expected Resolution:** SSML `<sub alias>` tags and symbol replacement map
- **Severity:** Medium

### 4. [MCP SDK] Streamable HTTP Transport

- **When:** Setting up `@modelcontextprotocol/sdk` with Express
- **Friction:** (Document your experience)
- **Expected Resolution:** (Document your solution)
- **Severity:** TBD

### 5. [OpenAI SDK] Bedrock Mantle Tool Calling Format

- **When:** Passing tool definitions to `openai.gpt-oss-120b` via Bedrock Mantle
- **Friction:** (Document any schema differences vs standard OpenAI)
- **Expected Resolution:** (Document your solution)
- **Severity:** TBD

---

## Runtime Friction Log

_(Add entries below as you build)_

### Phase 1: Foundation
<!-- Add entries here -->

### Phase 2: MCP Tools
<!-- Add entries here -->

### Phase 3: Inspection & GitHub
<!-- Add entries here -->

### Phase 4: Bedrock Mantle
<!-- Add entries here -->

### Phase 5: Alexa Integration
<!-- Add entries here -->
