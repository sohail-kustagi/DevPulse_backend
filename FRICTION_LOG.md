# DevPulse Friction Log & Product Feedback // Amazon Developer Hackathon 2026

> **Purpose:** Detailed documentation of friction points, workarounds, and developer ergonomics encountered while building the DevPulse voice-first engineering copilot.  
> **Hackathon Incentive:** Submissions with comprehensive friction logs qualify for up to a 10% judging bonus.

---

## 1. Alexa NLU: AMAZON.SearchQuery Carrier Phrase Requirement
- **Task Attempted:** Allowing freeform natural voice commands (e.g. `borrow the auth module from voice-gateway and scaffold stripe-relay` or `fix the error in verify.py`) by mapping an `AMAZON.SearchQuery` slot directly to `{query}`.
- **Steps Taken:** Added `{query}` as a standalone sample utterance under `DevPulseIntent` in the Alexa Interaction Model.
- **Expected vs. Actual:**
  - *Expected:* Alexa NLU to capture the entire spoken command and pass it as the `{query}` slot value to our backend webhook.
  - *Actual:* Build failed with `Sample utterance '{query}' in intent 'DevPulseIntent' must include a carrier phrase. Sample intent utterances with phrase types cannot consist of only slots.`
- **Severity:** High (blocked skill build).
- **Workaround Used:** Created a curated dictionary of action carrier phrases (`borrow {query}`, `scaffold {query}`, `inspect {query}`, `fix {query}`, `patch {query}`, `check {query}`, `diagnose {query}`) and published an automated `alexa-interaction-model.json` schema.
- **Actionable Suggestion for Alexa Team:** Allow an explicit "Autonomous Agent Catch-All" toggle for Developer & Enterprise skills where an unconstrained slot can capture the entire voice stream without requiring unnatural carrier prefix words.

---

## 2. Alexa Session Closure on Missing Reprompt
- **Task Attempted:** Chaining multiple voice commands in a continuous hands-free developer dialogue (e.g., first check cloud status, then instruct the copilot to fix a bug).
- **Steps Taken:** Handled `IntentRequest` with `handlerInput.responseBuilder.speak(spoken).getResponse()`.
- **Expected vs. Actual:**
  - *Expected:* Alexa to keep the microphone open for follow-up developer commands since the conversation is ongoing.
  - *Actual:* Alexa spoke the status and instantly terminated the session (`shouldEndSession: true`). Subsequent user commands turned grey and failed with `"Skill I/O is available only for speech requests to skills you have created."`
- **Severity:** High (breaks multi-turn hands-free developer workflow).
- **Workaround Used:** Explicitly called `.reprompt('What would you like me to inspect or execute next?')` on every single response, forcing `shouldEndSession: false`.
- **Actionable Suggestion for Alexa Team:** Provide an ambient / continuous listening mode for desktop and TV developer skills so that the session persists without needing synthetic reprompts after every command.

---

## 3. Alexa 8.0-Second Hard Cutoff vs. Multi-Step LLM Tool Chains
- **Task Attempted:** Executing multi-step autonomous MCP agent pipelines (e.g. `scan_past_projects` → `generate_project_spec` → `scaffold_workspace` → run test runner) within a single voice turn.
- **Steps Taken:** Called AWS Bedrock Mantle `openai.gpt-oss-120b` in a tool-calling loop. When complex operations took 7–10 seconds, Alexa dropped the socket with a generic failure.
- **Expected vs. Actual:**
  - *Expected:* Streaming audio or an intermediate status response over the HTTP socket.
  - *Actual:* Alexa cloud closed the connection at 8.0 seconds sharp, causing a crash.
- **Severity:** Critical.
- **Workaround Used:** Implemented a `Promise.race()` guard set at 6.5s. If Bedrock Mantle or MCP tools exceed 6.5s, DevPulse immediately returns an affirmative voice response ("I'm executing that multi-step workflow in the background now. Watch the live diagrams on your HUD") while the background promise continues executing tools and streaming diffs/telemetry to the Fire TV HUD over WebSocket.
- **Actionable Suggestion for Alexa Team:** Introduce HTTP chunked transfer / server-sent event (SSE) audio streaming or proactive voice progress notifications for long-running Agent skills.

---

## 4. GitHub Push Protection & Secret Management
- **Task Attempted:** Running local testing with AWS Bedrock Mantle bearer token.
- **Steps Taken:** Pushed an interim configuration test commit containing the bearer token format.
- **Expected vs. Actual:**
  - *Expected:* Normal git workflow.
  - *Actual:* GitHub Push Protection rejected the push with `GH013: Amazon AWS API Key ID detected`.
- **Severity:** Medium (protective, but stalled automated CI).
- **Workaround Used:** Ran `git reset HEAD~1`, routed all credentials through `.env` loaded via `dotenv/config`, and added `.env` and `.env.*` to `.gitignore`.
- **Actionable Suggestion for Developers:** Always enforce `.gitignore` for `.env` before generating configuration scaffolds.

---

## 5. Localtunnel 408 Timeouts & Connection Instability
- **Task Attempted:** Exposing local port 8000 to the Alexa Developer Console using `localtunnel`.
- **Steps Taken:** Ran `npx localtunnel --port 8000`.
- **Expected vs. Actual:**
  - *Expected:* Persistent HTTPS tunnel endpoint.
  - *Actual:* Free localtunnel servers dropped keep-alives and returned `408 Request Timeout` after 3 minutes of idle time, cutting off Alexa webhook invocations.
- **Severity:** High.
- **Workaround Used:** Switched to a self-contained `cloudflared` tunnel (`bin/cloudflared tunnel --url http://localhost:8000`). Cloudflare provides rock-solid HTTP/2 and QUIC tunneling without idle dropouts or warning interstitial pages.
- **Actionable Suggestion for Hackathon Guidelines:** Explicitly recommend Cloudflare Quick Tunnels or ngrok over localtunnel in the hackathon testing setup guide.

---

## 6. Model Context Protocol (MCP) Streamable HTTP Transport Integration
- **Task Attempted:** Exposing the DevPulse MCP Server over Streamable HTTP (`/mcp`) according to the 2025-11-25 MCP specification.
- **Steps Taken:** Integrated `@modelcontextprotocol/sdk/server/express.js` with our Express HTTP engine.
- **Expected vs. Actual:**
  - *Expected:* Zero-config drop-in SSE endpoint.
  - *Actual:* Express JSON body parsing middleware interfered with SSE streaming chunks if placed globally before the MCP router.
- **Severity:** Medium.
- **Workaround Used:** Positioned the MCP Streamable HTTP transport middleware before global `express.json()` body parsers in `src/index.ts`, ensuring pristine streaming event buffers.

---

## 7. Model Repetitive Tool Calling in Complex Agent Loops
- **Task Attempted:** Having `openai.gpt-oss-120b` autonomously discover and scaffold code in multi-turn mode.
- **Steps Taken:** Provided 7 tool definitions in OpenAI function calling format to AWS Bedrock Mantle.
- **Expected vs. Actual:**
  - *Expected:* The model to run `scan_past_projects` once, then proceed to `generate_project_spec` and `scaffold_workspace`.
  - *Actual:* The model repeatedly re-scanned past projects in a loop up to `maxIterations`.
- **Severity:** Medium.
- **Workaround Used:** Added explicit Operational Workflow Rules to the system prompt (`"Never call the same tool more than once in a turn. Complete the workflow in 2 to 3 iterations"`) and introduced duplicate tool filtering in `src/agent/orchestrator.ts`.
- **Actionable Suggestion for Mantle Team:** Include standard loop-prevention heuristics or prompt templates in the AWS Bedrock Mantle documentation for autonomous agent scaffolding.
